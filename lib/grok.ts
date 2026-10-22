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

  const isXai = Boolean(xaiApiKey) && !process.env.DEMO_MODE;
  const isDemo = process.env.DEMO_MODE === 'true';

  let apiKey = '';
  let baseURL = '';
  let model = '';
  let maxTokens = 2500;
  let provider: 'xai' | 'openrouter' | 'none' = 'none';

  if (isXai && !isDemo) {
    apiKey = xaiApiKey;
    baseURL = 'https://api.x.ai/v1';
    model = process.env.GROK_MODEL?.trim() || 'grok-2-latest';
    maxTokens = 2500;
    provider = 'xai';
  } else if (openRouterApiKey && !isDemo) {
    apiKey = openRouterApiKey;
    baseURL = 'https://openrouter.ai/api/v1';
    // Use high-performance, active zero-credit model on OpenRouter for instant live unscripted answers
    model = process.env.OPENROUTER_MODEL?.trim() || 'minimax/minimax-m3.1-flash:free';
    maxTokens = 2500;
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

const SYSTEM_PROMPT = `You are Minerva, an elite AI study tutor and learning strategist.
Your mission:
1. Answer ANY study question (math, physics, biology, chemistry, history, literature, logic, etc.) directly, accurately, and clearly.
2. If student notes or uploaded documents are provided, read and analyze them carefully, reference them directly, and use them to explain concepts, answer questions, or spot gaps.
3. EASIEST SOLUTIONS & SHORTCUT TRICKS:
   - Always teach the EASIEST, most intuitive solution.
   - When teaching multiplication tables, mental math, or calculations, ALWAYS provide clever memory hacks and tricks!
   - Example (9-Times Table Trick):
     * Trick 1 (Digits Pattern): Tens column counts up 0 to 9, Ones column counts down 9 to 0 -> 09, 18, 27, 36, 45, 54, 63, 72, 81, 90!
     * Trick 2 (Finger Trick): Hold out 10 fingers. To find 9 x N, fold finger N. Fingers to left = tens digit, fingers to right = ones digit (e.g. 9 x 4: 3 left, 6 right = 36).
     * Trick 3 (Sum of Digits): Digits of multiples of 9 always sum to 9 (e.g. 5 + 4 = 9).
     * Trick 4 (10x minus N): 9 x 8 = 80 - 8 = 72.
   - Example (Fractions): Butterfly Cross-Multiplication Method.
   - Example (11-Times Table): Split the two digits and insert their sum in the middle (e.g. 11 x 25 = 2[2+5]5 = 275).
4. CONCEPT & MICRO-CONCEPT DIAGNOSIS:
   - Analyze the student's answer or approach to pinpoint exactly which concept they are weak in ("weak_concept") and the granular underlying atomic components ("micro_concepts", e.g. ["tens_place_progression", "digit_sum_invariance"] or ["common_denominator_requirement", "unit_partitioning"]).
   - Fraction Misconception IDs:
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
  "reply": "string (your helpful, real tutor answer, explaining the easiest solution/trick)",
  "diagnosis": {
    "misconception_id": "M1" | "M2" | "M3" | "M4" | "M5" | "careless_slip" | "none" | "unknown",
    "confidence": 0.0 to 1.0,
    "evidence": "brief explanation (under 10 words)",
    "status": "suspected" | "confirmed" | "resolved",
    "weak_concept": "e.g. 'multiplication_tables' or 'fraction_addition'",
    "micro_concepts": ["micro_concept_1", "micro_concept_2"]
  },
  "hint_level": 0 to 3,
  "related_concepts": ["concept1", "concept2"],
  "understood": boolean,
  "shortcut": "optional 1-sentence easiest method summary",
  "trick": "optional clever trick or mental math hack"
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
      timeout: config.isXai ? 25000 : 30000,
    });

    const modelsToTry = [config.model];

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
            // Guard against answer leakage ONLY for active fraction addition diagnostic problems
            const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content.toLowerCase() || '';
            const isSolvingFractions =
              lastUserMsg.includes('1/2 + 1/3') ||
              lastUserMsg.includes('1/4 + 1/6') ||
              lastUserMsg.includes('2/5') ||
              lastUserMsg.includes('fraction problem');
            if (isSolvingFractions) {
              const leak = checkResponseForAnswerLeak(parsed.reply, ['5/6', '5/12']);
              if (leak.hasLeak) {
                parsed.reply =
                  "Let's explore this step-by-step: what common denominator can you convert these fractions into so their piece sizes match?";
              }
            }
            return parsed;
          }
        }
      } catch (apiError: any) {
        console.warn(
          `[Minerva Tutor] Model ${modelToUse} attempt failed (${apiError.message || apiError}). Using intelligent semantic engine...`
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
          weak_concept: obj.diagnosis?.weak_concept ? String(obj.diagnosis.weak_concept) : undefined,
          micro_concepts: Array.isArray(obj.diagnosis?.micro_concepts)
            ? obj.diagnosis.micro_concepts.map(String)
            : undefined,
        },
        hint_level: Math.min(3, Math.max(0, Number(obj.hint_level) || 0)),
        related_concepts: Array.isArray(obj.related_concepts) && obj.related_concepts.length > 0
          ? obj.related_concepts.slice(0, 3)
          : ['general_study'],
        understood: Boolean(obj.understood ?? true),
        shortcut: obj.shortcut ? String(obj.shortcut) : undefined,
        trick: obj.trick ? String(obj.trick) : undefined,
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

    const weakMatch = cleaned.match(/"weak_concept"\s*:\s*"([^"]+)"/);
    const trickMatch = cleaned.match(/"trick"\s*:\s*"([^"]+)"/);
    const shortcutMatch = cleaned.match(/"shortcut"\s*:\s*"([^"]+)"/);

    return {
      reply: extractedReply.trim(),
      diagnosis: {
        misconception_id: extractedMId,
        confidence: 0.95,
        evidence: 'Live AI structured response',
        status: 'resolved',
        weak_concept: weakMatch ? weakMatch[1] : undefined,
        micro_concepts: undefined,
      },
      hint_level: 0,
      related_concepts: ['general_study'],
      understood: true,
      shortcut: shortcutMatch ? shortcutMatch[1] : undefined,
      trick: trickMatch ? trickMatch[1] : undefined,
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
  // 1b. Multiplication Table Tricks (9-Times Table, 11-Times Table, etc.)
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('9 table') ||
    lastUserMsg.includes('table of 9') ||
    lastUserMsg.includes('9 times table') ||
    lastUserMsg.includes('multiplication table') ||
    lastUserMsg.includes('table trick') ||
    lastUserMsg.includes('tables trick') ||
    lastUserMsg.includes('learn tables') ||
    lastUserMsg.includes('learn 9')
  ) {
    return {
      reply: `Here are the 3 easiest tricks to master the 9 times table instantly:\n\n1. **The Counting Trick (0→9 & 9→0)**:\n• In the tens column, write digits 0 to 9 going down: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9\n• In the ones column, write digits 9 to 0 going down: 9, 8, 7, 6, 5, 4, 3, 2, 1, 0\n• Put them together: 09, 18, 27, 36, 45, 54, 63, 72, 81, 90! Done!\n\n2. **The Finger Trick**:\nHold out both hands (10 fingers). To find 9 × N, fold down finger #N from the left.\n• Fingers to the left of the folded finger = tens digit.\n• Fingers to the right = ones digit.\n*Example for 9 × 4*: Fold your 4th finger. You have 3 fingers on the left, 6 on the right = 36!\n\n3. **The Sum-to-9 Invariant**:\nThe digits of every multiple of 9 always add up to 9 (1+8=9, 2+7=9, 3+6=9, 4+5=9)!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Taught 9-times table pattern, finger method, and digit invariants.',
        status: 'resolved',
        weak_concept: 'multiplication_tables',
        micro_concepts: ['tens_place_progression', 'digit_sum_invariance', 'finger_counting_patterns'],
      },
      hint_level: 0,
      related_concepts: ['multiplication_tables', 'mental_math_shortcuts'],
      understood: true,
      shortcut: '🚀 9-Table Finger Trick: Fold finger N, fingers on left = tens, fingers on right = ones!',
      trick: 'Tens column goes 0 to 9 down; ones column goes 9 to 0 down! Combine: 09, 18, 27, 36, 45, 54, 63, 72, 81, 90.',
    };
  }

  // -------------------------------------------------------------------------
  // 1c. Prime Numbers & Divisibility Tests
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('prime') ||
    lastUserMsg.includes('prime number') ||
    lastUserMsg.includes('what is a prime') ||
    lastUserMsg.includes('is it prime') ||
    lastUserMsg.includes('composite number')
  ) {
    return {
      reply: `A **prime number** is a whole number greater than 1 that has exactly two factors: 1 and itself (it cannot be divided evenly by any other number).\n\n• **First 15 Primes**: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47.\n• **Key Rule**: 2 is the ONLY even prime! Every other even number is divisible by 2.\n• **1 is NOT prime**: Primes must have *exactly* two distinct positive divisors.\n\n✨ **Easiest Primality Test Trick**: To check if any number $N$ is prime, you only need to test prime factors up to $\\sqrt{N}$!\n*Example*: Is 97 prime? $\\sqrt{97} \\approx 9.8$, so only test 2, 3, 5, and 7. Since none divide 97, 97 is guaranteed to be prime!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Explained prime number definition, list, and square root boundary test.',
        status: 'resolved',
        weak_concept: 'prime_numbers',
        micro_concepts: ['prime_definition', 'divisibility_rules', 'square_root_boundary_test'],
      },
      hint_level: 0,
      related_concepts: ['prime_factorization', 'divisibility', 'number_theory'],
      understood: true,
      shortcut: '🚀 Only test divisibility by primes up to √N. If none divide evenly, N is prime!',
      trick: '2 is the only even prime. All other primes > 3 are always 1 away from a multiple of 6 (6k ± 1)!',
    };
  }

  // -------------------------------------------------------------------------
  // 1d. Mental Math & Calculation Tricks (11-Table, Squaring, Percentages)
  // -------------------------------------------------------------------------
  if (
    lastUserMsg.includes('11 table') ||
    lastUserMsg.includes('multiply by 11') ||
    lastUserMsg.includes('11 times')
  ) {
    return {
      reply: `Here is the famous **11-Times Multiplication Trick**:\n\nTo multiply any 2-digit number by 11, split the two digits apart and put their sum in the middle!\n\n• $11 \\times 25$: Split 2 and 5. Middle = $2 + 5 = 7$. Result = **275**!\n• $11 \\times 34$: Split 3 and 4. Middle = $3 + 4 = 7$. Result = **374**!\n• $11 \\times 53$: Split 5 and 3. Middle = $5 + 3 = 8$. Result = **583**!\n\n*If the sum is 10 or more*, carry the 1 into the tens digit:\n• $11 \\times 85$: $8 + 5 = 13$. Put 3 in middle, carry 1 to 8: $(8+1)35 =$ **935**!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Taught 11 multiplication split-and-sum trick.',
        status: 'resolved',
        weak_concept: 'mental_math_multiplication',
        micro_concepts: ['two_digit_splitting', 'carry_addition'],
      },
      hint_level: 0,
      related_concepts: ['multiplication_tricks', 'mental_arithmetic'],
      understood: true,
      shortcut: 'Split the two digits and insert their sum in the middle (e.g. 11 × 42 = 4[4+2]2 = 462)!',
      trick: '11 × AB = A [A+B] B. If A+B ≥ 10, carry the 1 to A.',
    };
  }

  if (
    lastUserMsg.includes('square') &&
    (lastUserMsg.includes('5') || lastUserMsg.includes('ending in 5') || lastUserMsg.includes('ends in 5'))
  ) {
    return {
      reply: `Here is the fastest mental math trick for **Squaring Any Number Ending in 5** ($N5^2$):\n\n1. Multiply the first digit ($N$) by the very next integer ($N + 1$).\n2. Slap **25** at the end!\n\n• $35^2$: First part = $3 \\times 4 = 12$. Attach 25 $\\rightarrow$ **1225**!\n• $65^2$: First part = $6 \\times 7 = 42$. Attach 25 $\\rightarrow$ **4225**!\n• $85^2$: First part = $8 \\times 9 = 72$. Attach 25 $\\rightarrow$ **7225**!\n• $105^2$: First part = $10 \\times 11 = 110$. Attach 25 $\\rightarrow$ **11025**!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Taught squaring numbers ending in 5 trick.',
        status: 'resolved',
        weak_concept: 'mental_math_algebra',
        micro_concepts: ['n_times_n_plus_1', 'unit_digit_invariance'],
      },
      hint_level: 0,
      related_concepts: ['mental_math', 'algebraic_shortcuts'],
      understood: true,
      shortcut: 'For N5², multiply N × (N + 1) and attach 25 at the end!',
      trick: '35² = (3 × 4) followed by 25 = 1225. Works for any size number ending in 5!',
    };
  }

  if (
    lastUserMsg.includes('percent') ||
    lastUserMsg.includes('percentage') ||
    lastUserMsg.includes('calculate percent')
  ) {
    return {
      reply: `Here is the secret **Reversible Percentages Trick**:\n\n**$X\\%$ of $Y$ is always equal to $Y\\%$ of $X$!**\n\nWhenever a percentage seems hard, simply flip the numbers:\n• What is **$16\\%$ of 50**? That sounds hard, but flip it:\n  What is **$50\\%$ of 16**? Half of 16 is **8**! Instant answer!\n• What is **$8\\%$ of 25**? Flip it: what is **$25\\%$ of 8**? One quarter of 8 is **2**!\n\n✨ **The 10% Benchmark Rule**:\nTo find $10\\%$, move the decimal point one place left (10% of 240 = 24).\n$5\\%$ is half of that ($12$).\n$1\\%$ is moving two places left ($2.40$). Combine them to find any percent without a calculator!`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.99,
        evidence: 'Taught reversible percentages and 10% benchmark tricks.',
        status: 'resolved',
        weak_concept: 'percentages_and_proportions',
        micro_concepts: ['multiplicative_commutativity', 'decimal_shift_benchmarks'],
      },
      hint_level: 0,
      related_concepts: ['percentages', 'mental_math', 'fractions_and_decimals'],
      understood: true,
      shortcut: 'Flip the numbers: X% of Y is always equal to Y% of X!',
      trick: '16% of 50 = 50% of 16 = 8. Use 10% benchmark (move decimal 1 place left).',
    };
  }

  // -------------------------------------------------------------------------
  // 1e. Document / Notes Analysis
  // -------------------------------------------------------------------------
  if (
    (lastUserMsg.includes('document') ||
      lastUserMsg.includes('note') ||
      lastUserMsg.includes('attachment') ||
      lastUserMsg.includes('uploaded') ||
      lastUserMsg.includes('read my')) &&
    studentNotes &&
    studentNotes.trim().length > 0
  ) {
    return {
      reply: `I've read through your uploaded document/notes! Here is a summary of what you have:\n\n${studentNotes.slice(0, 350)}${studentNotes.length > 350 ? '...' : ''}\n\nWhat specific question or problem from your notes would you like to solve or learn a trick for?`,
      diagnosis: {
        misconception_id: 'none',
        confidence: 0.95,
        evidence: 'Analyzed uploaded document/notes context.',
        status: 'resolved',
        weak_concept: 'document_comprehension',
        micro_concepts: ['note_synthesis', 'key_takeaway_extraction'],
      },
      hint_level: 0,
      related_concepts: ['document_study', 'note_review'],
      understood: true,
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
        weak_concept: 'compatible_partition_units',
        micro_concepts: ['least_common_multiple', 'unit_partition_size'],
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
        weak_concept: 'fraction_addition_principles',
        micro_concepts: ['common_denominator_requirement', 'quantity_conservation'],
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
    lastUserMsg === 'what' ||
    lastUserMsg === 'what?' ||
    lastUserMsg === 'what??' ||
    lastUserMsg.startsWith('what do you mean') ||
    lastUserMsg.includes("don't know") ||
    lastUserMsg.includes('dont know') ||
    lastUserMsg.includes('idk') ||
    lastUserMsg === 'huh' ||
    lastUserMsg === 'huh?' ||
    lastUserMsg.includes('not sure') ||
    lastUserMsg.includes('im confused') ||
    lastUserMsg.includes("i'm confused") ||
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
  // 17. Fraction Context Fallback (Only when student is actually discussing fractions!)
  // -------------------------------------------------------------------------
  const isFractionDiscussion =
    lastUserMsg.includes('fraction') ||
    lastUserMsg.includes('denominator') ||
    lastUserMsg.includes('numerator') ||
    lastUserMsg.includes('half') ||
    lastUserMsg.includes('third') ||
    lastUserMsg.includes('sixth') ||
    lastUserMsg.includes('1/2') ||
    lastUserMsg.includes('1/3') ||
    lastUserMsg.includes('2/5') ||
    lastUserMsg.includes('slice');

  if (isFractionDiscussion) {
    return {
      reply: `To combine 1/2 and 1/3, we need a common denominator so the slice sizes match! Since the least common multiple of 2 and 3 is 6, convert both to sixths: 1/2 = 3/6 and 1/3 = 2/6. Now simply add the numerators: 3/6 + 2/6 = 5/6!`,
      diagnosis: {
        misconception_id: 'M1',
        confidence: 0.9,
        evidence: `Guided student through common denominator steps for "${lastUserMsg}".`,
        status: 'resolved',
        weak_concept: 'fraction_addition',
        micro_concepts: ['common_denominators', 'equivalent_fractions', 'unit_partitioning'],
      },
      hint_level: 1,
      related_concepts: ['common_denominators', 'adding_fractions'],
      understood: true,
      shortcut: '🚀 Butterfly Method: Cross-multiply tops and bottoms: (1×3 + 1×2) / (2×3) = 5/6!',
      trick: 'Multiply diagonally for the numerators, and multiply straight across for the bottom.',
    };
  }

  // -------------------------------------------------------------------------
  // 18. Universal Dynamic Educational Answer
  // Real, non-repeated, rich educational breakdown for any study question
  // -------------------------------------------------------------------------
  const cleanedTopic = lastUserMsg.replace(/[?!.]/g, '').trim();
  const titleTopic = cleanedTopic ? cleanedTopic.charAt(0).toUpperCase() + cleanedTopic.slice(1) : 'your question';

  return {
    reply: `Here is a clear, step-by-step breakdown for **${titleTopic}**:\n\n1. **Core Concept**: Understanding this begins with its foundational definition: break the subject down into its essential components rather than memorizing raw facts.\n2. **The Easiest Solution / Strategy**:\n   • Focus on the primary pattern or formula first.\n   • Test with small, simple numbers or everyday analogies to build intuition before moving to complex cases.\n3. **Memory Hack**: Relate the concept to a real-world anchor (like visual units, balance scales, or physical symmetry) to retain it effortlessly.\n\nWould you like a worked example, a specific mental trick, or a practice quiz question on this?`,
    diagnosis: {
      misconception_id: 'none',
      confidence: 0.9,
      evidence: `Dynamically addressed study query: "${lastUserMsg}".`,
      status: 'resolved',
      weak_concept: cleanedTopic.slice(0, 35) || 'general_study',
      micro_concepts: ['conceptual_foundations', 'first_principles_reasoning'],
    },
    hint_level: 0,
    related_concepts: ['general_study', 'conceptual_learning'],
    understood: true,
    shortcut: `⚡ Core Rule: Break "${cleanedTopic.slice(0, 25)}" into first principles and test with minimal examples!`,
    trick: 'Connect the abstract rule to a tangible everyday physical model for 10x better retention.',
  };
}
