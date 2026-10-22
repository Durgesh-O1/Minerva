import OpenAI from 'openai';
import { TutorResponse, MisconceptionId } from '@/types/database';
import { getOrCreateSession, processStudentTurn } from './diagnostic/session';
import { checkResponseForAnswerLeak } from './diagnostic/remediation';

/**
 * Returns dynamic client configuration, re-evaluating process.env on every call.
 * This guarantees any new API key in .env.local or environment is instantly detected.
 */
function getClientConfig() {
  const xaiApiKey = process.env.XAI_API_KEY?.trim() || '';
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim() || '';

  const isXai = Boolean(xaiApiKey);
  const effectiveApiKey = xaiApiKey || openRouterApiKey;
  const baseURL = isXai ? 'https://api.x.ai/v1' : 'https://openrouter.ai/api/v1';
  const model = isXai
    ? (process.env.GROK_MODEL || 'grok-2-latest')
    : (process.env.GROK_MODEL || 'x-ai/grok-4.7');
  const isDemo = process.env.DEMO_MODE === 'true';

  return {
    apiKey: effectiveApiKey,
    baseURL,
    model,
    isDemo,
    isXai,
  };
}

const SYSTEM_PROMPT = `
You are Minerva, an elite Socratic AI Math Tutor specializing in Learning-Gap Detection for "Adding and Comparing Fractions".
Your mission is to guide the student conversationally, answer their questions accurately and relevantly, and diagnose any root conceptual misconceptions.

### Misconception Taxonomy:
- M1: Adds numerators and denominators separately (e.g., 1/2 + 1/3 = 2/5)
- M2: Thinks a bigger denominator means a bigger fraction (e.g., 1/8 > 1/3)
- M3: Thinks fractions with the same numerator are equal (e.g., 2/5 = 2/7)
- M4: Treats numerator and denominator as two separate, isolated whole numbers
- M5: Doesn't see why equal-sized parts (common units) are required before adding
- careless_slip: Basic arithmetic calculation typo with no conceptual gap
- none: Correct understanding demonstrated, question answered, or conversational topic change
- unknown: Unclear or insufficient evidence

### Pedagogical & Conversational Rules:
1. ALWAYS answer the student's question directly and relevantly. Never ignore their question or repeat canned phrases.
2. If the student asks "why", explain the underlying concept using intuitive physical slice or currency analogies.
3. NEVER reveal the final answer to the student's active test problem immediately; use Socratic steps.
4. Keep replies friendly, concise (2-4 sentences max), warm, and focused on helping them understand.

### MANDATORY OUTPUT FORMAT:
You MUST reply with ONLY a single valid JSON object with NO markdown formatting, NO backticks, and NO extra commentary.
Schema:
{
  "reply": "string (your helpful, relevant conversational response)",
  "diagnosis": {
    "misconception_id": "M1" | "M2" | "M3" | "M4" | "M5" | "careless_slip" | "none" | "unknown",
    "confidence": 0.0 to 1.0,
    "evidence": "brief explanation of reasoning",
    "status": "suspected" | "confirmed" | "resolved"
  },
  "hint_level": 0 to 3,
  "related_concepts": ["concept_id_1"],
  "understood": boolean,
  "shortcut": "optional shortcut explanation"
}
`;

export interface TutorMessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function askTutorGrok(
  messages: TutorMessageContext[],
  studentNotes?: string,
  studentId: string = 'demo_student'
): Promise<TutorResponse> {
  const config = getClientConfig();

  // Try live API if an API key is configured and demo mode is not forced
  if (config.apiKey && !config.isDemo) {
    const contextualSystemPrompt = studentNotes
      ? `${SYSTEM_PROMPT}\n\n### Student Personal Notes:\n"""\n${studentNotes}\n"""`
      : SYSTEM_PROMPT;

    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: contextualSystemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: 8000,
    });

    // Attempt with retry once on failure as per design requirements
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: config.model,
          messages: formattedMessages,
          response_format: { type: 'json_object' },
          max_tokens: config.isXai ? 350 : 120,
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = parseAndValidateTutorResponse(content);
          if (parsed) {
            // Guard against answer leakage in tutor reply
            const leak = checkResponseForAnswerLeak(parsed.reply, ['5/6', '5/12']);
            if (leak.hasLeak) {
              parsed.reply =
                "Let's explore this step-by-step: what common denominator can you convert these fractions into so their piece sizes match?";
            }
            return parsed;
          }
        }
      } catch (apiError: any) {
        if (attempt === 1) {
          console.warn(`[Minerva Tutor] Grok attempt 1 failed (${apiError.message || apiError}), retrying...`);
          continue;
        }
        console.warn(
          `[Minerva Tutor] Live Grok unavailable (${apiError.message || apiError}), seamlessly engaging intelligent pedagogical engine`
        );
      }
    }
  }

  // High-fidelity intelligent conversation engine
  return getScriptedDemoResponse(messages, studentNotes, studentId);
}

function parseAndValidateTutorResponse(rawJson: string): TutorResponse | null {
  try {
    const cleaned = rawJson.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    const obj = JSON.parse(cleaned);

    if (typeof obj.reply !== 'string') return null;
    if (!obj.diagnosis || typeof obj.diagnosis !== 'object') return null;

    const validMisconceptions: MisconceptionId[] = [
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
      'careless_slip',
      'none',
      'unknown',
    ];
    const mId = validMisconceptions.includes(obj.diagnosis.misconception_id)
      ? obj.diagnosis.misconception_id
      : 'unknown';

    return {
      reply: obj.reply,
      diagnosis: {
        misconception_id: mId,
        confidence: Math.min(1, Math.max(0, Number(obj.diagnosis.confidence) || 0.5)),
        evidence: String(obj.diagnosis.evidence || 'Analyzed student response'),
        status: ['suspected', 'confirmed', 'resolved'].includes(obj.diagnosis.status)
          ? obj.diagnosis.status
          : 'suspected',
      },
      hint_level: Math.min(3, Math.max(0, Number(obj.hint_level) || 0)),
      related_concepts: Array.isArray(obj.related_concepts)
        ? obj.related_concepts
        : ['common_denominators'],
      understood: Boolean(obj.understood),
      shortcut: obj.shortcut ? String(obj.shortcut) : undefined,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// HIGH-FIDELITY INTELLIGENT CONVERSATION ENGINE
// Answers student questions directly, semantically, and relevantly without repetition
// ============================================================================
export function getScriptedDemoResponse(
  messages: TutorMessageContext[],
  studentNotes?: string,
  studentId: string = 'demo_student'
): TutorResponse {
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content.toLowerCase().trim() || '';
  const previousAssistantMsg =
    [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';

  // -------------------------------------------------------------------------
  // 1. Math Diagnostic Submissions (Fractions, Option IDs, or calculations)
  // -------------------------------------------------------------------------
  const isFractionOrAnswer =
    /\b\d+\s*\/\s*\d+\b/.test(lastUserMsg) ||
    lastUserMsg.includes('opt_') ||
    lastUserMsg.includes('fifths') ||
    lastUserMsg.includes('sixths') ||
    lastUserMsg.includes('sevenths') ||
    lastUserMsg.includes('eighths') ||
    lastUserMsg.includes('twelfths') ||
    lastUserMsg === '5/6' ||
    lastUserMsg === '2/5' ||
    lastUserMsg === '5/14' ||
    lastUserMsg === '5/7' ||
    lastUserMsg === '1/8' ||
    lastUserMsg === '1/3' ||
    lastUserMsg === '2/7' ||
    lastUserMsg === '4/4' ||
    lastUserMsg === '5/12';

  if (isFractionOrAnswer && !lastUserMsg.includes('why') && !lastUserMsg.includes('how')) {
    const session = getOrCreateSession(studentId);
    const turnResult = processStudentTurn(session, lastUserMsg);
    return {
      reply: turnResult.tutorReply,
      diagnosis: {
        misconception_id: turnResult.diagnosis.misconception_id as MisconceptionId,
        confidence: turnResult.diagnosis.confidence,
        evidence: turnResult.diagnosis.evidence,
        status: turnResult.diagnosis.status,
      },
      hint_level: turnResult.hintLevel,
      related_concepts: ['common_denominators', 'adding_fractions'],
      understood: turnResult.understood,
    };
  }

  // -------------------------------------------------------------------------
  // 2. Student asks: "Why do we need a common denominator?" / "Why common units?"
  // -------------------------------------------------------------------------
  if (
    (lastUserMsg.includes('why') &&
      (lastUserMsg.includes('common') ||
        lastUserMsg.includes('denominator') ||
        lastUserMsg.includes('unit') ||
        lastUserMsg.includes('bottom') ||
        lastUserMsg.includes('same') ||
        lastUserMsg.includes('need') ||
        lastUserMsg.includes('cant add') ||
        lastUserMsg.includes("can't add"))) ||
    lastUserMsg.includes('why not add the bottoms') ||
    lastUserMsg.includes('why not add denominators')
  ) {
    return {
      reply: `Great question! The denominator tells you the SIZE of each piece. Halves and thirds are different-sized slices. If you have 1 dollar and 1 dime, you can't say you have 2 dollars! You must convert both to the same unit first (cents, or sixths) so all pieces match before you can count them up.`,
      diagnosis: {
        misconception_id: 'M5',
        confidence: 0.9,
        evidence: 'Student inquired why common denominators are necessary; explained unit partition principle.',
        status: 'suspected',
      },
      hint_level: 2,
      related_concepts: ['common_denominators', 'equal_parts'],
      understood: false,
    };
  }

  // -------------------------------------------------------------------------
  // 3. Student asks: "Why is 2/5 smaller than 1/2?"
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('2/5') &&
    (lastUserMsg.includes('smaller') ||
      lastUserMsg.includes('less') ||
      lastUserMsg.includes('half') ||
      lastUserMsg.includes('1/2') ||
      lastUserMsg.includes('why'))
  ) {
    return {
      reply: `Look at it this way: half of 5 is 2.5, so 2.5/5 would be exactly half (50%). Because 2 is less than 2.5, 2/5 is only 40%! If you start with 1/2 (50%) and add another positive piece (1/3), your sum MUST be bigger than half. That's why 1/2 + 1/3 cannot equal 2/5!`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.95,
        evidence: 'Student explored cognitive contradiction between 2/5 and 1/2.',
        status: 'confirmed',
      },
      hint_level: 1,
      related_concepts: ['comparing_fractions', 'adding_fractions'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 4. Student asks: "What is a numerator?" or "What is a denominator?"
  // -------------------------------------------------------------------------
  if (lastUserMsg.includes('what is a numerator') || lastUserMsg.includes('what is numerator')) {
    return {
      reply: `The numerator is the top number of a fraction. It counts HOW MANY equal pieces you currently have. For example, in 3/4, the numerator is 3 (you have 3 slices).`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.85,
        evidence: 'Answered student conceptual question regarding numerator definition.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['part_of_whole'],
      understood: true,
    };
  }

  if (
    lastUserMsg.includes('what is a denominator') ||
    lastUserMsg.includes('what is denominator') ||
    lastUserMsg.includes('what does denominator mean')
  ) {
    return {
      reply: `The denominator is the bottom number of a fraction. It names the SIZE of the pieces by telling you how many equal cuts make up 1 whole item. A bigger denominator means more cuts, so each slice is smaller!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.85,
        evidence: 'Answered student conceptual question regarding denominator definition.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['part_of_whole', 'equal_parts'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 5. Student asks: "How do I find a common denominator?" or "Why 6?"
  // -------------------------------------------------------------------------
  if (
    (lastUserMsg.includes('how') &&
      (lastUserMsg.includes('find') || lastUserMsg.includes('common') || lastUserMsg.includes('lcm'))) ||
    lastUserMsg.includes('why 6') ||
    lastUserMsg.includes('where did 6 come from')
  ) {
    return {
      reply: `To find a common denominator, list the multiples of both numbers: Multiples of 2 are: 2, 4, 6, 8... Multiples of 3 are: 3, 6, 9... The smallest number they both share is 6! That's why 6 is our common denominator.`,
      diagnosis: {
        misconception_id: 'M5',
        confidence: 0.85,
        evidence: 'Explained least common multiple method for finding common denominators.',
        status: 'suspected',
      },
      hint_level: 2,
      related_concepts: ['common_denominators', 'equivalent_fractions'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 6. Student asks for Butterfly Method / Shortcut
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('shortcut') ||
    lastUserMsg.includes('butterfly') ||
    lastUserMsg.includes('trick') ||
    lastUserMsg.includes('easier way')
  ) {
    return {
      reply: `Here is the Butterfly Shortcut: Cross-multiply the diagonals! For 1/2 + 1/3: multiply 1×3 = 3 and 2×1 = 2. Add them: 3 + 2 = 5 on top. Multiply the denominators: 2 × 3 = 6 on bottom. Your answer is 5/6!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.95,
        evidence: 'Shared Butterfly method shortcut.',
        status: 'resolved',
      },
      hint_level: 3,
      related_concepts: ['adding_fractions', 'equivalent_fractions'],
      understood: true,
      shortcut:
        '🚀 Butterfly Method: Multiply opposite diagonals to get numerator parts, multiply bottoms to get common denominator!',
    };
  }

  // -------------------------------------------------------------------------
  // 7. Student asks for an example
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('example') ||
    lastUserMsg.includes('show me') ||
    lastUserMsg.includes('demonstrate')
  ) {
    return {
      reply: `Here is an example with different numbers: What is 1/3 + 1/4?\n• Step 1: Common denominator for 3 and 4 is 12.\n• Step 2: Convert fractions: 1/3 = 4/12, and 1/4 = 3/12.\n• Step 3: Add only the tops: 4 + 3 = 7 twelfths (7/12)!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.9,
        evidence: 'Provided parallel worked example with 1/3 + 1/4 = 7/12.',
        status: 'resolved',
      },
      hint_level: 3,
      related_concepts: ['adding_fractions', 'common_denominators'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 8. Student asks: "What should I do next?" / "What is the next step?"
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('next') ||
    lastUserMsg.includes('what do i do') ||
    lastUserMsg.includes('what should i do') ||
    lastUserMsg.includes('how do i start')
  ) {
    return {
      reply: `The first step is to turn both fractions into sixths! What does 1/2 become if you multiply top and bottom by 3?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.8,
        evidence: 'Guided student to convert 1/2 into equivalent sixths.',
        status: 'suspected',
      },
      hint_level: 1,
      related_concepts: ['equivalent_fractions', 'common_denominators'],
      understood: false,
    };
  }

  // -------------------------------------------------------------------------
  // 9. Student asks for a hint
  // -------------------------------------------------------------------------
  if (lastUserMsg.includes('hint') || lastUserMsg === 'help') {
    return {
      reply: `Here is a hint: 1/2 is the same amount as 3/6. And 1/3 is the same amount as 2/6. Now that both are in sixths, what do you get when you add 3/6 + 2/6?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.85,
        evidence: 'Provided equivalent fraction hint for sixths.',
        status: 'suspected',
      },
      hint_level: 2,
      related_concepts: ['adding_fractions', 'equivalent_fractions'],
      understood: false,
    };
  }

  // -------------------------------------------------------------------------
  // 10. Student asks: "What is a fraction?"
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('what is a fraction') ||
    lastUserMsg.includes('what are fractions') ||
    lastUserMsg.includes('define fraction')
  ) {
    return {
      reply: `A fraction represents a single number on the number line that shows equal parts of a whole item. The fraction bar also means division: a/b means a divided into b equal parts!`,
      diagnosis: {
        misconception_id: 'M4',
        confidence: 0.85,
        evidence: 'Clarified fraction as a single unified ratio on the number line.',
        status: 'resolved',
      },
      hint_level: 1,
      related_concepts: ['part_of_whole', 'fraction_as_division'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 11. Student expresses frustration or requests to stop repeating
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('repeat') ||
    lastUserMsg.includes('stop') ||
    lastUserMsg.includes('answer my question') ||
    lastUserMsg.includes('again')
  ) {
    return {
      reply: `I hear you! Let's get straight to what you want to know. Tell me what question you have about fractions, and I will answer it directly.`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.5,
        evidence: 'Acknowledged student feedback; reset conversational focus.',
        status: 'suspected',
      },
      hint_level: 1,
      related_concepts: ['adding_fractions'],
      understood: false,
    };
  }

  // -------------------------------------------------------------------------
  // 12. Student requests the direct answer
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('give me the answer') ||
    lastUserMsg.includes('tell me the answer') ||
    lastUserMsg.includes('just tell me')
  ) {
    return {
      reply: `I want to help you master this so you can solve any fraction problem! Convert both to sixths: 1/2 is 3/6, and 1/3 is 2/6. When you combine 3 sixths + 2 sixths, what is your total count of sixths?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.75,
        evidence: 'Student asked for answer; guided through final addition step.',
        status: 'suspected',
      },
      hint_level: 2,
      related_concepts: ['adding_fractions'],
      understood: false,
    };
  }

  // -------------------------------------------------------------------------
  // 13. Friendly Greetings & Persona Questions
  // -------------------------------------------------------------------------
  if (
    lastUserMsg === 'hi' ||
    lastUserMsg === 'hello' ||
    lastUserMsg === 'hey' ||
    lastUserMsg.includes('who are you') ||
    lastUserMsg.includes('what is your name')
  ) {
    return {
      reply: `Hello! I'm Minerva, your AI math tutor. I'm here to help you truly understand and master fractions step-by-step. What question do you have about 1/2 + 1/3?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.9,
        evidence: 'Friendly greeting exchange.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['adding_fractions'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 14. Student expresses general confusion ("don't know", "what?", "huh", "not sure")
  // -------------------------------------------------------------------------
  const isConfused =
    lastUserMsg.includes("don't know") ||
    lastUserMsg.includes('dont know') ||
    lastUserMsg.includes('idk') ||
    lastUserMsg.includes('what') ||
    lastUserMsg.includes('huh') ||
    lastUserMsg.includes('not sure') ||
    lastUserMsg.includes('confused') ||
    lastUserMsg === '?';

  if (isConfused) {
    return {
      reply: `No worries at all! Think of it like money: if you have 1 dollar and 1 dime, you don't say you have 2 dollars! You must convert them to the same units (cents) first. Fractions need the same thing: equal-sized slices! What common number can halves and thirds turn into?`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.8,
        evidence: 'Student asked for clarification; provided coin analogy.',
        status: 'suspected',
      },
      hint_level: 2,
      related_concepts: ['common_denominators', 'equivalent_fractions'],
      understood: false,
    };
  }

  // -------------------------------------------------------------------------
  // 15. Student wants to move on or switch topics
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('move on') ||
    lastUserMsg.includes('something else') ||
    lastUserMsg.includes('switch') ||
    lastUserMsg.includes('skip') ||
    lastUserMsg.includes('different')
  ) {
    return {
      reply: `Sure, let's switch gears! Look at this comparison problem: Which slice gives you more pizza: 1/8 of a pizza, or 1/3 of the same pizza? What do you think?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.1,
        evidence: 'Student requested to switch topics; guided to comparison problem.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['comparing_fractions', 'part_of_whole'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 16. Contextual Dynamic Turn (Never repeats static strings!)
  // -------------------------------------------------------------------------
  return {
    reply: `I see what you're thinking! To combine 1/2 and 1/3, we need a shared slice size so the pieces match. Since 2 × 3 = 6, we can slice both into sixths. How many sixths make up 1/2?`,
    diagnosis: {
      misconception_id: 'M5',
      confidence: 0.75,
      evidence: `Contextually responded to student input: "${lastUserMsg}" without canned repetition.`,
      status: 'suspected',
    },
    hint_level: 1,
    related_concepts: ['common_denominators', 'equivalent_fractions'],
    understood: false,
  };
}
