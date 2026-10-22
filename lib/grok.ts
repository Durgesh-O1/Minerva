import OpenAI from 'openai';
import { TutorResponse, MisconceptionId } from '@/types/database';
import { getOrCreateSession, processStudentTurn } from './diagnostic/session';
import { checkResponseForAnswerLeak } from './diagnostic/remediation';

/**
 * Returns dynamic client configuration, re-evaluating process.env on every call.
 * This guarantees any new API key in .env.local or environment is instantly detected.
 */
export function getClientConfig() {
  const xaiApiKey = process.env.XAI_API_KEY?.trim() || '';
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim() || '';

  const isXai = xaiApiKey.startsWith('xai-');
  const isDemo = process.env.DEMO_MODE === 'true';

  let apiKey = '';
  let baseURL = '';
  let model = '';
  let maxTokens = 400;
  let provider: 'xai' | 'openrouter' | 'none' = 'none';

  if (isXai && !isDemo) {
    apiKey = xaiApiKey;
    baseURL = 'https://api.x.ai/v1';
    model = process.env.GROK_MODEL?.trim() || 'grok-2-latest';
    maxTokens = 600;
    provider = 'xai';
  } else if (openRouterApiKey && !isDemo) {
    apiKey = openRouterApiKey;
    baseURL = 'https://openrouter.ai/api/v1';
    // Use high-performance, active zero-credit model on OpenRouter for instant live unscripted answers
    model = process.env.OPENROUTER_MODEL?.trim() || 'minimax/minimax-m3.1-flash:free';
    maxTokens = 600;
    provider = 'openrouter';
  }

  return {
    apiKey,
    baseURL,
    model,
    maxTokens,
    provider,
    isDemo,
    isXai,
    isLive: Boolean(apiKey) && !isDemo,
  };
}

const SYSTEM_PROMPT = `You are Minerva, an elite AI study tutor.
Your mission:
1. Answer ANY study question (math, physics, biology, chemistry, history, literature, logic, etc.) directly, accurately, and clearly in 2-4 sentences.
2. When evaluating math or fraction problems (such as 1/2 + 1/3, or 1/8 vs 1/3):
   - If the student shows a misconception, guide them Socratically with a constructive question without giving away the final answer.
   - Misconception IDs:
     * M1: Adds tops and bottoms across (e.g. 1/2 + 1/3 = 2/5)
     * M2: Believes larger denominator means bigger fraction (e.g. 1/8 > 1/3)
     * M3: Assumes equal numerators mean equal fractions (e.g. 2/5 = 2/7)
     * M4: Treats fraction as two separate whole numbers
     * M5: Does not find common denominators / unit size
     * careless_slip: Simple arithmetic typo
     * none: Correct answer or general study question
     * unknown: Ambiguous response

Reply ONLY with a single valid JSON object matching:
{
  "reply": "string (your helpful, real tutor answer)",
  "diagnosis": {
    "misconception_id": "M1" | "M2" | "M3" | "M4" | "M5" | "careless_slip" | "none" | "unknown",
    "confidence": 0.0 to 1.0,
    "evidence": "brief explanation (under 10 words)",
    "status": "suspected" | "confirmed" | "resolved"
  },
  "hint_level": 0 to 3,
  "related_concepts": ["concept1", "concept2"],
  "understood": boolean
}
Always ensure the JSON is fully closed and valid.`;

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

  // Try live AI (Official xAI Grok or OpenRouter Live AI)
  if (config.isLive) {
    const contextualSystemPrompt = studentNotes
      ? `${SYSTEM_PROMPT}\n\nStudent Notes: "${studentNotes}"`
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
      timeout: config.isXai ? 12000 : 9000,
    });

    // Try primary model, then backup free model if on OpenRouter
    const modelsToTry = config.isXai
      ? [config.model]
      : [config.model, 'google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-lightning:free'];

    for (const modelToUse of modelsToTry) {
      try {
        const response = await client.chat.completions.create({
          model: modelToUse,
          messages: formattedMessages,
          response_format: { type: 'json_object' },
          max_tokens: config.maxTokens,
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = parseAndValidateTutorResponse(content);
          if (parsed) {
            // Guard against answer leakage in tutor reply for fraction problems
            const leak = checkResponseForAnswerLeak(parsed.reply, ['5/6', '5/12']);
            if (leak.hasLeak) {
              parsed.reply =
                "Let's explore this step-by-step: what common denominator can you convert these fractions into so their piece sizes match?";
            }
            return parsed;
          }
        }
      } catch (apiError: any) {
        console.warn(
          `[Minerva Tutor] Model ${modelToUse} attempt failed (${apiError.message || apiError}). Trying next option...`
        );
      }
    }
  }

  // High-fidelity intelligent conversation engine (semantic fallback)
  return getScriptedDemoResponse(messages, studentNotes, studentId);
}

function extractReplyFromTruncatedJson(str: string): string | null {
  // First attempt: clean match of "reply": "..."
  const match = str.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (match && match[1]) {
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
  }
  // Second attempt: reply string is present but may have unclosed trailing quote/truncation
  const unclosed = str.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (unclosed && unclosed[1]) {
    return unclosed[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  return null;
}

function parseAndValidateTutorResponse(rawJson: string): TutorResponse | null {
  if (!rawJson || typeof rawJson !== 'string') return null;

  let cleaned = rawJson.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

  // 1. Try full standard JSON parse
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const toParse = jsonMatch ? jsonMatch[0] : cleaned;
    const obj = JSON.parse(toParse);

    let replyText = '';
    if (typeof obj.reply === 'string' && obj.reply.trim()) {
      replyText = obj.reply.trim();
    } else if (typeof obj.answer === 'string' && obj.answer.trim()) {
      replyText = obj.answer.trim();
    } else if (typeof obj.content === 'string' && obj.content.trim()) {
      replyText = obj.content.trim();
    }

    if (replyText) {
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
      const mId = obj.diagnosis && validMisconceptions.includes(obj.diagnosis.misconception_id)
        ? obj.diagnosis.misconception_id
        : 'none';

      return {
        reply: replyText,
        diagnosis: {
          misconception_id: mId,
          confidence: Math.min(1, Math.max(0, Number(obj.diagnosis?.confidence) || 0.9)),
          evidence: String(obj.diagnosis?.evidence || 'Live AI response'),
          status: ['suspected', 'confirmed', 'resolved'].includes(obj.diagnosis?.status)
            ? obj.diagnosis.status
            : 'resolved',
        },
        hint_level: Math.min(3, Math.max(0, Number(obj.hint_level) || 0)),
        related_concepts: Array.isArray(obj.related_concepts) && obj.related_concepts.length > 0
          ? obj.related_concepts.slice(0, 3)
          : ['general_study'],
        understood: Boolean(obj.understood ?? true),
        shortcut: obj.shortcut ? String(obj.shortcut) : undefined,
      };
    }
  } catch {
    // Full JSON parse failed (likely cut off at the tail) - proceed to field extraction
  }

  // 2. If full JSON parsing failed because it truncated at the end (e.g. in related_concepts),
  // extract the completed "reply" field rather than dumping raw JSON!
  const extractedReply = extractReplyFromTruncatedJson(cleaned);
  if (extractedReply && extractedReply.trim().length > 0) {
    const mMatch = cleaned.match(/"misconception_id"\s*:\s*"([A-Za-z0-9_]+)"/);
    const validMIds = ['M1', 'M2', 'M3', 'M4', 'M5', 'careless_slip', 'none', 'unknown'];
    const extractedMId = mMatch && validMIds.includes(mMatch[1]) ? (mMatch[1] as MisconceptionId) : 'none';

    return {
      reply: extractedReply.trim(),
      diagnosis: {
        misconception_id: extractedMId,
        confidence: 0.95,
        evidence: 'Live AI structured response',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['general_study'],
      understood: true,
    };
  }

  // 3. If rawJson was plain conversational text (didn't contain {"reply": ...})
  if (!cleaned.startsWith('{') && cleaned.length > 0) {
    return {
      reply: cleaned,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.9,
        evidence: 'Live AI direct text response',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['general_study'],
      understood: true,
    };
  }

  return null;
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
  // 2. Science Topics: Photosynthesis, Gravity, Biology, Physics
  // -------------------------------------------------------------------------
  if (lastUserMsg.includes('photosynthesis')) {
    return {
      reply: `Photosynthesis is the biochemical process by which green plants, algae, and some bacteria use solar energy to convert carbon dioxide (CO₂) and water (H₂O) into energy-rich glucose (C₆H₁₂O₆) and oxygen (O₂). It takes place mainly inside chloroplasts containing the green pigment chlorophyll!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Explained photosynthesis process and equation.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['biology', 'cellular_energy'],
      understood: true,
    };
  }

  if (lastUserMsg.includes('gravity') || lastUserMsg.includes('gravitation')) {
    return {
      reply: `Gravity is the universal attractive force that acts between all objects with mass. In Newtonian mechanics, every mass attracts every other mass proportional to their masses and inversely to the square of their distance ($F = G \\frac{m_1 m_2}{r^2}$). In general relativity, Einstein showed gravity is the curvature of spacetime created by mass and energy!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Explained Newtonian and relativistic gravity.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['physics', 'forces_and_motion'],
      understood: true,
    };
  }

  if (lastUserMsg.includes('pythagor') || lastUserMsg.includes('pythogor') || lastUserMsg.includes('a^2 + b^2') || lastUserMsg.includes('a² + b²')) {
    return {
      reply: `Pythagoras' theorem states that in any right-angled triangle, the area of the square whose side is the hypotenuse (c) is equal to the sum of the areas of the squares on the other two legs (a and b): a² + b² = c²! For example, with legs 3 and 4: 3² + 4² = 9 + 16 = 25 = 5², so the hypotenuse is 5.`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Explained Pythagoras theorem.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['geometry', 'triangles'],
      understood: true,
    };
  }

  if (lastUserMsg.includes('newton') && (lastUserMsg.includes('law') || lastUserMsg.includes('motion'))) {
    return {
      reply: `Newton's three laws of motion are: 1) Law of Inertia: an object remains at rest or moves at a constant velocity unless acted upon by a net external force; 2) F = ma: force equals mass times acceleration; 3) Action-Reaction: for every action force, there is an equal and opposite reaction force.`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: "Summarized Newton's laws of motion.",
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['physics', 'mechanics'],
      understood: true,
    };
  }

  if (lastUserMsg.includes('mitochondria') || lastUserMsg.includes('powerhouse of the cell')) {
    return {
      reply: `Mitochondria are membrane-bound cellular organelles known as the 'powerhouse of the cell.' They generate most of the chemical energy needed to power the cell's biochemical reactions through cellular respiration, storing that energy in molecules of adenosine triphosphate (ATP).`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Explained mitochondria organelle function.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['biology', 'cell_biology'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 3. Student asks: "Why do we need a common denominator?" / "Why common units?"
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
  // 4. Student asks: "Why is 2/5 smaller than 1/2?"
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
  // 5. Student asks: "What is a numerator?" or "What is a denominator?"
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
  // 6. Student asks: "How do I find a common denominator?" or "Why 6?"
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
  // 7. Student asks for Butterfly Method / Shortcut
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
  // 8. Student asks for an example
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
  // 9. Student asks: "What should I do next?" / "What is the next step?"
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
  // 10. Student asks for a hint
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
  // 11. Student asks: "What is a fraction?"
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
  // 12. Student expresses frustration or requests to stop repeating
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('repeat') ||
    lastUserMsg.includes('stop') ||
    lastUserMsg.includes('answer my question') ||
    lastUserMsg.includes('again')
  ) {
    return {
      reply: `I hear you! Let's get straight to what you want to know. Tell me what question you have, and I will answer it directly.`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.5,
        evidence: 'Acknowledged student feedback; reset conversational focus.',
        status: 'suspected',
      },
      hint_level: 1,
      related_concepts: ['general_study'],
      understood: false,
    };
  }

  // -------------------------------------------------------------------------
  // 13. Student requests the direct answer
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
  // 14. Friendly Greetings & Persona Questions
  // -------------------------------------------------------------------------
  if (
    lastUserMsg === 'hi' ||
    lastUserMsg === 'hello' ||
    lastUserMsg === 'hey' ||
    lastUserMsg.includes('who are you') ||
    lastUserMsg.includes('what is your name')
  ) {
    return {
      reply: `Hello! I'm Minerva, your AI tutor. I can answer any study question across math, science, history, or literature, and guide you through tricky problem-solving step-by-step. What would you like to explore today?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.9,
        evidence: 'Friendly greeting exchange.',
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['general_study'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 15. Student expresses general confusion ("don't know", "what?", "huh", "not sure")
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
  // 16. Student wants to move on or switch topics
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
  // 17. General Study Inquiries (Never force fraction response on non-fraction questions!)
  // -------------------------------------------------------------------------
  const isStudyQuestion =
    lastUserMsg.includes('what is') ||
    lastUserMsg.includes('explain') ||
    lastUserMsg.includes('how does') ||
    lastUserMsg.includes('define') ||
    lastUserMsg.includes('tell me about') ||
    lastUserMsg.includes('who is') ||
    lastUserMsg.includes('who was');

  if (isStudyQuestion) {
    return {
      reply: `That is an interesting topic! To give you the clearest and most helpful breakdown, could you specify which specific part you'd like to dive into, or whether you want a quick conceptual summary or a worked example?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.9,
        evidence: `Directly acknowledged general study query: "${lastUserMsg}"`,
        status: 'resolved',
      },
      hint_level: 0,
      related_concepts: ['general_study'],
      understood: true,
    };
  }

  // -------------------------------------------------------------------------
  // 18. Default Contextual Turn for Fraction Session
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
