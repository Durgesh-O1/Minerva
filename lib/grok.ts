import OpenAI from 'openai';
import { TutorResponse, MisconceptionId } from '@/types/database';

// Read environment variables
const xaiApiKey = process.env.XAI_API_KEY || '';
const grokModel = process.env.GROK_MODEL || 'grok-2-latest';
const isDemoMode = process.env.DEMO_MODE === 'true' || !xaiApiKey;

let openaiClient: OpenAI | null = null;
if (xaiApiKey) {
  openaiClient = new OpenAI({
    apiKey: xaiApiKey,
    baseURL: 'https://api.x.ai/v1',
  });
}

const SYSTEM_PROMPT = `
You are Minerva, an elite Socratic AI Math Tutor specializing in Learning-Gap Detection for "Adding and Comparing Fractions".
Your mission is to diagnose the ROOT CONCEPTUAL MISCONCEPTION behind a student's answer, NOT just mark right or wrong.

### Misconception Taxonomy:
- M1: Adds numerators and denominators separately (e.g., 1/2 + 1/3 = 2/5)
- M2: Thinks a bigger denominator means a bigger fraction (e.g., 1/8 > 1/3)
- M3: Thinks fractions with the same numerator are equal (e.g., 2/5 = 2/7)
- M4: Treats numerator and denominator as two separate, isolated whole numbers
- M5: Doesn't see why equal-sized parts (common units) are required before adding
- careless_slip: Basic arithmetic calculation typo with no conceptual gap
- none: Correct understanding demonstrated
- unknown: Unclear or insufficient evidence

### Prerequisite Concept Graph:
- Equal parts / the whole -> Fraction as part of a whole -> Equivalent fractions -> Common denominators -> Adding fractions -> Comparing fractions
- Division basics -> Fraction as division

### Socratic Pedagogical Rules:
1. NEVER reveal the final answer immediately.
2. If the student says "I don't know", "what?", or seems confused, respond warmly and give an intuitive real-world analogy (e.g. pizza slices or coin denominations). NEVER repeat previous questions.
3. When the student makes an error or gives an answer, first ask: "Why did you choose this approach?" or ask them to explain their thinking.
4. Form a hypothesis regarding M1-M5. Then ask ONE targeted probe or a "COGNITIVE CONFLICT" question that produces an absurd result (e.g., "Is 2/5 smaller than 1/2? How can adding two positive pieces give you less than what you started with?").
5. Escalate hints through 3 levels:
   - Level 1: Nudge (question about piece sizes)
   - Level 2: Partial hint (common denominator reminder)
   - Level 3: Worked example
6. Once and ONLY ONCE the student demonstrates genuine understanding (understood: true), offer the "easiest method / shortcut" (e.g. cross-multiplication or LCD trick) and label it clearly as a shortcut.
7. Keep responses concise, warm, encouraging, and focused on one question at a time.

### MANDATORY OUTPUT FORMAT:
You MUST reply with ONLY a single valid JSON object with NO markdown formatting, NO backticks, and NO extra commentary.
Schema:
{
  "reply": "string (the tutor response to display to the student)",
  "diagnosis": {
    "misconception_id": "M1" | "M2" | "M3" | "M4" | "M5" | "careless_slip" | "none" | "unknown",
    "confidence": 0.0 to 1.0,
    "evidence": "brief explanation of evidence observed in student's response",
    "status": "suspected" | "confirmed" | "resolved"
  },
  "hint_level": 0 to 3,
  "related_concepts": ["concept_id_1", "concept_id_2"],
  "understood": boolean,
  "shortcut": "optional shortcut explanation if understood is true"
}
`;

export interface TutorMessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function askTutorGrok(
  messages: TutorMessageContext[],
  studentNotes?: string
): Promise<TutorResponse> {
  // If no API key is provided or DEMO_MODE is true, use the dynamic multi-turn engine
  if (isDemoMode || !openaiClient) {
    console.log('[Minerva Tutor] Running dynamic multi-turn tutor engine (Set XAI_API_KEY in .env.local to use live Grok)');
    return getScriptedDemoResponse(messages, studentNotes);
  }

  try {
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

    // Attempt 1: Call Grok via OpenAI compatible client
    const response = await openaiClient.chat.completions.create({
      model: grokModel,
      messages: formattedMessages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Grok API');
    }

    const parsed = parseAndValidateTutorResponse(content);
    if (parsed) return parsed;

    // Retry once if JSON was malformed
    console.warn('[Minerva Tutor] JSON validation failed on first attempt, retrying...');
    const retryResponse = await openaiClient.chat.completions.create({
      model: grokModel,
      messages: [
        ...formattedMessages,
        {
          role: 'user',
          content: 'Return ONLY the requested JSON object matching the schema. No extra text.',
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const retryContent = retryResponse.choices[0]?.message?.content;
    if (retryContent) {
      const retryParsed = parseAndValidateTutorResponse(retryContent);
      if (retryParsed) return retryParsed;
    }

    throw new Error('Failed to validate Grok JSON response after retry');
  } catch (error) {
    console.error('[Minerva Tutor] Grok API call failed, falling back to dynamic engine:', error);
    return getScriptedDemoResponse(messages, studentNotes);
  }
}

function parseAndValidateTutorResponse(rawJson: string): TutorResponse | null {
  try {
    const cleaned = rawJson.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    const obj = JSON.parse(cleaned);

    if (typeof obj.reply !== 'string') return null;
    if (!obj.diagnosis || typeof obj.diagnosis !== 'object') return null;

    const validMisconceptions: MisconceptionId[] = [
      'M1', 'M2', 'M3', 'M4', 'M5', 'careless_slip', 'none', 'unknown'
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
      related_concepts: Array.isArray(obj.related_concepts) ? obj.related_concepts : ['common_denominators'],
      understood: Boolean(obj.understood),
      shortcut: obj.shortcut ? String(obj.shortcut) : undefined,
    };
  } catch {
    return null;
  }
}

// ==========================================
// DYNAMIC MULTI-TURN TUTOR ENGINE
// (Context-aware, conversational, never repeats questions)
// ==========================================
export function getScriptedDemoResponse(
  messages: TutorMessageContext[],
  studentNotes?: string
): TutorResponse {
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content.toLowerCase().trim() || '';
  const previousAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';

  // 1. Student expresses confusion ("i don't know", "what?", "huh", "not sure", "confused", "help")
  const isConfused = 
    lastUserMsg.includes("don't know") || 
    lastUserMsg.includes("dont know") || 
    lastUserMsg.includes("idk") || 
    lastUserMsg.includes("what") || 
    lastUserMsg.includes("huh") || 
    lastUserMsg.includes("not sure") || 
    lastUserMsg.includes("confused") || 
    lastUserMsg.includes("help");

  if (isConfused) {
    // If the tutor already asked about piece size, offer a relatable money/pizza analogy
    if (previousAssistantMsg.includes('size of the pieces') || previousAssistantMsg.includes('pizza')) {
      return {
        reply: `No problem at all! Let's use money as an analogy:
If you have 1 dollar bill and 1 dime, you don't say you have "2 dollars", right? 
You have to change them into the same unit (cents) before adding.
Fractions work the exact same way! What number can both 2 and 3 divide into?`,
        diagnosis: {
          misconception_id: 'M1',
          confidence: 0.80,
          evidence: "Student asked for clarification; breaking down into common unit analogy.",
          status: 'suspected',
        },
        hint_level: 2,
        related_concepts: ['common_denominators', 'equivalent_fractions'],
        understood: false,
      };
    }

    // First time expressing confusion
    return {
      reply: `That's completely okay! Let's explore it together.
Picture two identical pizzas: one is sliced into 2 huge halves, and the other is sliced into 3 equal thirds.
If you take 1 slice from each pizza, can you just add 1 + 1 and 2 + 3? What happens to the slice sizes?`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.75,
        evidence: "Student indicated hesitation: 'I don't know'. Guided with visual pizza partitioning.",
        status: 'suspected',
      },
      hint_level: 1,
      related_concepts: ['equal_parts', 'part_of_whole'],
      understood: false,
    };
  }

  // 2. Student answers "2/5" or says they added tops and bottoms to 1/2 + 1/3
  if (lastUserMsg.includes('2/5') || lastUserMsg.includes('two fifths')) {
    return {
      reply: `Interesting! Can you walk me through your thinking: why did you choose 2/5? What rule or approach did you use?`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.85,
        evidence: "Student answered '2/5' for 1/2 + 1/3, indicating adding numerators and denominators.",
        status: 'suspected',
      },
      hint_level: 0,
      related_concepts: ['common_denominators', 'part_of_whole'],
      understood: false,
    };
  }

  // 3. Student explains they added tops and bottoms
  if (
    lastUserMsg.includes('added') ||
    lastUserMsg.includes('tops') ||
    lastUserMsg.includes('bottom') ||
    lastUserMsg.includes('1+1') ||
    lastUserMsg.includes('2+3') ||
    lastUserMsg.includes('both')
  ) {
    return {
      reply: `I see! You added the tops and bottoms. Let me pose a quick cognitive puzzle:
Is 2/5 bigger or smaller than 1/2? 
Think about it: if you start with half a pizza and someone gives you a third more, could you end up with less than half?`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.95,
        evidence: "Student confirmed rule: 'added tops and bottoms' without finding common denominators.",
        status: 'confirmed',
      },
      hint_level: 1,
      related_concepts: ['common_denominators', 'equivalent_fractions'],
      understood: false,
    };
  }

  // 4. Cognitive Conflict realization: Student realizes 2/5 is smaller than 1/2
  if (
    lastUserMsg.includes('smaller') ||
    lastUserMsg.includes('less') ||
    lastUserMsg.includes('wait') ||
    lastUserMsg.includes('cannot') ||
    lastUserMsg.includes('impossible') ||
    lastUserMsg.includes('absurd') ||
    lastUserMsg.includes('different size') ||
    lastUserMsg.includes('different')
  ) {
    return {
      reply: `Spot on! 2/5 (which is 40%) is smaller than 1/2 (50%). Adding two positive slices cannot give you less pizza!
The issue is that halves and thirds are different sized slices.
What common denominator can we convert 1/2 and 1/3 into so the slices match?`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.92,
        evidence: 'Student recognized cognitive conflict: 2/5 is smaller than 1/2.',
        status: 'confirmed',
      },
      hint_level: 2,
      related_concepts: ['common_denominators', 'equivalent_fractions'],
      understood: false,
    };
  }

  // 5. Student mentions the common denominator: 6 or answers 5/6
  if (
    lastUserMsg.includes('5/6') ||
    lastUserMsg.includes('sixths') ||
    lastUserMsg.includes('3/6') ||
    lastUserMsg.includes('2/6') ||
    lastUserMsg === '6' ||
    lastUserMsg.includes('into 6') ||
    lastUserMsg.includes('denominator 6')
  ) {
    return {
      reply: `Brilliant! 1/2 becomes 3/6 and 1/3 becomes 2/6. 
When the slices are the same size, 3 sixths + 2 sixths = 5 sixths (5/6)! 
You completely mastered why equal pieces are required before adding.`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.98,
        evidence: 'Student converted to sixths and added correctly: 3/6 + 2/6 = 5/6.',
        status: 'resolved',
      },
      hint_level: 3,
      related_concepts: ['adding_fractions', 'equivalent_fractions'],
      understood: true,
      shortcut: '🚀 Easiest Method (Butterfly Shortcut): Cross-multiply the diagonals! (1×3 = 3) and (2×1 = 2). Add them: 3 + 2 = 5. Multiply the denominators: 2 × 3 = 6. Instant answer: 5/6!',
    };
  }

  // 6. Handling comparing fractions misconception M2 (e.g. 1/8 > 1/3)
  if (lastUserMsg.includes('1/8') || lastUserMsg.includes('bigger denominator') || lastUserMsg.includes('8 is bigger')) {
    return {
      reply: `Think about a birthday cake: if you divide it among 8 friends versus 3 friends, who gets a bigger piece? Does a bigger denominator mean bigger or smaller slices?`,
      diagnosis: {
        misconception_id: 'M2',
        confidence: 0.88,
        evidence: 'Student associated larger denominator 8 with larger fraction size.',
        status: 'confirmed',
      },
      hint_level: 1,
      related_concepts: ['comparing_fractions', 'part_of_whole'],
      understood: false,
    };
  }

  // 7. General non-repeating fallback
  if (userMessages.length > 2) {
    return {
      reply: `Let's take it step by step: to add fractions like 1/2 and 1/3, we need a common denominator. What number is a multiple of both 2 and 3? (Hint: 2 × 3 = ?)`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.82,
        evidence: 'Prompting for least common multiple step.',
        status: 'suspected',
      },
      hint_level: 2,
      related_concepts: ['common_denominators'],
      understood: false,
    };
  }

  return {
    reply: `Let's break this down together! When we add fractions like 1/2 and 1/3, what must be true about the size of the pieces before we can count them together?`,
    diagnosis: {
      misconception_id: 'M1',
      confidence: 0.75,
      evidence: 'Exploring fraction addition principles.',
      status: 'suspected',
    },
    hint_level: 1,
    related_concepts: ['common_denominators', 'equal_parts'],
    understood: false,
  };
}
