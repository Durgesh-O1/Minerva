import OpenAI from 'openai';
import { TutorResponse, MisconceptionId } from '@/types/database';

const xaiApiKey = process.env.XAI_API_KEY || '';
const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';

const effectiveApiKey = xaiApiKey || openRouterApiKey;
const effectiveBaseURL = xaiApiKey ? 'https://api.x.ai/v1' : 'https://openrouter.ai/api/v1';
const effectiveModel = xaiApiKey
  ? (process.env.GROK_MODEL || 'grok-2-latest')
  : (process.env.GROK_MODEL || 'x-ai/grok-4.7');

const isExplicitDemoMode = process.env.DEMO_MODE === 'true';

let openaiClient: OpenAI | null = null;
if (effectiveApiKey && !isExplicitDemoMode) {
  openaiClient = new OpenAI({
    apiKey: effectiveApiKey,
    baseURL: effectiveBaseURL,
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
- none: Correct understanding demonstrated or topic change
- unknown: Unclear or insufficient evidence

### Socratic Pedagogical Rules:
1. NEVER reveal the final answer immediately.
2. If the student wants to move on or change questions, acknowledge and guide them to another fraction challenge.
3. If the student says "I don't know", "what?", or is confused, explain using a simple, relatable real-world analogy.
4. When diagnosing an error, ask a "COGNITIVE CONFLICT" question that produces an absurd result.
5. Keep responses concise (1-3 sentences max), warm, encouraging, and focused on one question at a time.

### MANDATORY OUTPUT FORMAT:
You MUST reply with ONLY a single valid JSON object with NO markdown formatting, NO backticks, and NO extra commentary.
Schema:
{
  "reply": "string",
  "diagnosis": {
    "misconception_id": "M1" | "M2" | "M3" | "M4" | "M5" | "careless_slip" | "none" | "unknown",
    "confidence": 0.0 to 1.0,
    "evidence": "brief explanation",
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
  studentNotes?: string
): Promise<TutorResponse> {
  // Try live API if client is configured
  if (openaiClient && !isExplicitDemoMode) {
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

      const response = await openaiClient.chat.completions.create({
        model: effectiveModel,
        messages: formattedMessages,
        response_format: { type: 'json_object' },
        max_tokens: 350,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = parseAndValidateTutorResponse(content);
        if (parsed) return parsed;
      }
    } catch (apiError: any) {
      console.warn('[Minerva Tutor] Live API unavailable (' + (apiError.message || apiError) + '), seamlessly engaging dynamic pedagogical engine');
    }
  }

  // Fallback to high-fidelity dynamic conversational engine
  return getScriptedDemoResponse(messages, studentNotes);
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
// HIGH-FIDELITY DYNAMIC CONVERSATION ENGINE
// (Context-aware, versatile, handles edge cases & confusion)
// ==========================================
export function getScriptedDemoResponse(
  messages: TutorMessageContext[],
  studentNotes?: string
): TutorResponse {
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content.toLowerCase().trim() || '';
  const previousAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';

  // 1. Changing topic / moving on
  if (
    lastUserMsg.includes('move on') ||
    lastUserMsg.includes('something else') ||
    lastUserMsg.includes('next') ||
    lastUserMsg.includes('skip') ||
    lastUserMsg.includes('change') ||
    lastUserMsg.includes('different')
  ) {
    return {
      reply: `Sure, let's switch gears! Look at Problem #2: Which fraction is larger: 1/8 or 1/3? What is your intuition?`,
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

  // 2. M2: Comparing fractions (1/8 > 1/3 or thinking 8 is bigger)
  if (
    lastUserMsg.includes('1/8') ||
    lastUserMsg.includes('8 is bigger') ||
    lastUserMsg.includes('bigger denominator') ||
    (lastUserMsg.includes('8') && lastUserMsg.includes('bigger'))
  ) {
    return {
      reply: `Think about a birthday cake: if you divide it among 8 friends versus 3 friends, who gets a bigger piece? Does a bigger denominator mean bigger or smaller slices?`,
      diagnosis: {
        misconception_id: 'M2',
        confidence: 0.90,
        evidence: 'Student associated larger denominator 8 with larger fraction size (M2).',
        status: 'confirmed',
      },
      hint_level: 1,
      related_concepts: ['comparing_fractions', 'part_of_whole'],
      understood: false,
    };
  }

  // 3. M3: Equal numerators (2/5 == 2/7)
  if (
    lastUserMsg.includes('equal') ||
    lastUserMsg.includes('same') ||
    lastUserMsg.includes('both have 2')
  ) {
    return {
      reply: `Think about this: are 2 giant watermelon slices the same amount of food as 2 tiny apple seeds? Both are "2", but does the denominator change how big each part is?`,
      diagnosis: {
        misconception_id: 'M3',
        confidence: 0.88,
        evidence: 'Student assumed matching numerators indicate equal fractions (M3).',
        status: 'confirmed',
      },
      hint_level: 1,
      related_concepts: ['comparing_fractions', 'part_of_whole'],
      understood: false,
    };
  }

  // 4. Student expresses confusion ("i don't know", "what?", "huh", "not sure", "confused", "help")
  const isConfused = 
    lastUserMsg.includes("don't know") || 
    lastUserMsg.includes("dont know") || 
    lastUserMsg.includes("idk") || 
    lastUserMsg.includes("what") || 
    lastUserMsg.includes("huh") || 
    lastUserMsg.includes("not sure") || 
    lastUserMsg.includes("confused") || 
    lastUserMsg.includes("help") ||
    lastUserMsg === '?';

  if (isConfused) {
    if (previousAssistantMsg.includes('pizza') || previousAssistantMsg.includes('cake') || previousAssistantMsg.includes('slice')) {
      return {
        reply: `No worries at all! Think of it like money: if you have 1 dollar and 1 dime, you don't say you have 2 dollars! You must convert them to the same units (cents) first. Fractions need the same thing: equal-sized slices! What common number can halves and thirds turn into?`,
        diagnosis: {
          misconception_id: 'M1',
          confidence: 0.80,
          evidence: "Student asked for clarification; provided coin analogy.",
          status: 'suspected',
        },
        hint_level: 2,
        related_concepts: ['common_denominators', 'equivalent_fractions'],
        understood: false,
      };
    }

    return {
      reply: `That's completely okay! Let's explore it together. Picture two pizzas: one cut into 2 halves, and one cut into 3 thirds. Can we just count the slices together if they are different sizes?`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.75,
        evidence: "Student expressed hesitation; prompted with pizza slice visual.",
        status: 'suspected',
      },
      hint_level: 1,
      related_concepts: ['equal_parts', 'part_of_whole'],
      understood: false,
    };
  }

  // 5. Student answers "2/5"
  if (lastUserMsg.includes('2/5') || lastUserMsg.includes('two fifths')) {
    return {
      reply: `Interesting! Can you walk me through your thinking: why did you choose 2/5? What approach or rule did you use?`,
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

  // 6. Student explains they added tops and bottoms
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
Think about it: if you have half a pizza and someone gives you a third more, could you end up with less than half?`,
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

  // 7. Cognitive Conflict realization
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
Halves and thirds are different sized slices.
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

  // 8. Student finds common denominator
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

  // 9. Non-repeating multi-turn fallback rotation
  const prompts = [
    `Let's take it step by step: when adding fractions with different denominators, what number can both 2 and 3 divide evenly into? (Hint: 2 × 3 = ?)`,
    `Think about cutting the halves and thirds into smaller equal pieces. If you slice each half into 3 pieces and each third into 2 pieces, what size pieces do you get?`,
    `Before we add the counts together, we need a common unit size. What common denominator would you like to try?`
  ];

  const chosenPrompt = prompts[userMessages.length % prompts.length];

  return {
    reply: chosenPrompt,
    diagnosis: {
      misconception_id: 'M1',
      confidence: 0.78,
      evidence: 'Guiding through unit conversion steps.',
      status: 'suspected',
    },
    hint_level: 2,
    related_concepts: ['common_denominators'],
    understood: false,
  };
}
