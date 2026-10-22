import { DiagnosticQuestion, EvidenceRule } from './questionBank';

export type AnswerClassification =
  | 'correct'
  | 'incorrect_known'
  | 'careful_slip'
  | 'ambiguous'
  | 'manipulation';

export interface GradingResult {
  rawAnswer: string;
  normalizedAnswer: string;
  classification: AnswerClassification;
  matchedRule?: EvidenceRule;
  reasoning: string;
  isCorrect: boolean;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s*:/i,
  /you\s+must\s+(say|grade|mark)\s+(this\s+as\s+)?correct/i,
  /act\s+as\s+a/i,
  /bypass/i,
  /prompt\s+injection/i,
  /assistant\s*:/i
];

/**
 * Normalizes student answer for deterministic parsing:
 * - strips whitespace and punctuation
 * - lowercases
 * - standardizes fraction slashes and word numbers
 */
export function normalizeStudentAnswer(raw: string): string {
  let cleaned = raw.toLowerCase().trim();

  // Standardize fractions (e.g. "2 / 5" -> "2/5")
  cleaned = cleaned.replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2');

  // Replace common fractional word equivalents
  cleaned = cleaned
    .replace(/\bone half\b/g, '1/2')
    .replace(/\bone third\b/g, '1/3')
    .replace(/\bone fourth\b|\bone quarter\b/g, '1/4')
    .replace(/\bone fifth\b/g, '1/5')
    .replace(/\bone sixth\b/g, '1/6')
    .replace(/\bone eighth\b/g, '1/8')
    .replace(/\btwo fifths\b/g, '2/5')
    .replace(/\btwo sevenths\b/g, '2/7')
    .replace(/\bthree sevenths\b/g, '3/7')
    .replace(/\bfive sevenths\b/g, '5/7')
    .replace(/\bfive sixths\b/g, '5/6')
    .replace(/\bfive twelfths\b/g, '5/12')
    .replace(/\bfour tenths\b/g, '4/10')
    .replace(/\bthree tenths\b/g, '3/10');

  return cleaned;
}

/**
 * Deterministically grades a student response against a diagnostic question
 */
export function gradeResponse(question: DiagnosticQuestion, rawAnswer: string): GradingResult {
  const normalized = normalizeStudentAnswer(rawAnswer);

  // 1. Guard against prompt injection or instruction manipulation
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(rawAnswer)) {
      return {
        rawAnswer,
        normalizedAnswer: normalized,
        classification: 'manipulation',
        isCorrect: false,
        reasoning: 'Input contained instruction override or prompt injection attempt.'
      };
    }
  }

  // 2. Reject empty or purely non-mathematical gibberish
  if (!normalized || normalized.length === 0) {
    return {
      rawAnswer,
      normalizedAnswer: normalized,
      classification: 'ambiguous',
      isCorrect: false,
      reasoning: 'Empty student submission.'
    };
  }

  // 3. Match against curated evidence rules defined on the question
  for (const rule of question.evidenceRules) {
    if (rule.match(normalized)) {
      if (rule.isCorrect) {
        return {
          rawAnswer,
          normalizedAnswer: normalized,
          classification: 'correct',
          matchedRule: rule,
          isCorrect: true,
          reasoning: rule.label
        };
      }

      if (rule.isCarefulSlip) {
        return {
          rawAnswer,
          normalizedAnswer: normalized,
          classification: 'careful_slip',
          matchedRule: rule,
          isCorrect: false,
          reasoning: rule.label
        };
      }

      return {
        rawAnswer,
        normalizedAnswer: normalized,
        classification: 'incorrect_known',
        matchedRule: rule,
        isCorrect: false,
        reasoning: rule.label
      };
    }
  }

  // 4. Fallback check for exact expected answer string
  const isDirectMatch = question.acceptableAnswers.some((acceptable) =>
    normalized.includes(acceptable.toLowerCase())
  );

  if (isDirectMatch) {
    return {
      rawAnswer,
      normalizedAnswer: normalized,
      classification: 'correct',
      isCorrect: true,
      reasoning: `Matched acceptable answer format: ${question.expectedAnswer}`
    };
  }

  // 5. Unrecognized input (Ambiguous / Undetermined)
  return {
    rawAnswer,
    normalizedAnswer: normalized,
    classification: 'ambiguous',
    isCorrect: false,
    reasoning: 'Answer does not match known misconception signatures or expected mathematical formats.'
  };
}
