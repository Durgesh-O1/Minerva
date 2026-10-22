import { DiagnosticQuestion } from './questionBank';
import { gradeResponse } from './grader';

export interface MasteryVerificationResult {
  passed: boolean;
  hasCorrectAnswer: boolean;
  hasValidExplanation: boolean;
  score: number;
  feedback: string;
  nextStatus: 'resolved' | 'investigating';
}

/**
 * Keywords indicating genuine conceptual reasoning rather than lucky guesses
 */
const REASONING_KEYWORDS: Record<string, string[]> = {
  Q_TRANSFER_1_4_1_6: [
    'common denominator',
    'common multiple',
    '12',
    'twelfth',
    'twelfths',
    '3/12',
    '2/12',
    'same denominator'
  ],
  Q_TRANSFER_COMPARE_2_5_3_10: [
    'tenth',
    'tenths',
    '4/10',
    'common denominator',
    'equivalent',
    'multiply',
    'times 2'
  ]
};

/**
 * Independently verifies mastery by checking both the numerical answer
 * and qualitative reasoning on a transfer problem.
 */
export function verifyMastery(
  question: DiagnosticQuestion,
  rawStudentSubmission: string
): MasteryVerificationResult {
  const grading = gradeResponse(question, rawStudentSubmission);
  const normalized = grading.normalizedAnswer;

  const hasCorrectAnswer = grading.isCorrect;

  // Check for presence of conceptual reasoning keywords
  const requiredKeywords = REASONING_KEYWORDS[question.id] || ['denominator', 'common', 'equal'];
  let explanationMatches = 0;

  for (const kw of requiredKeywords) {
    if (normalized.includes(kw.toLowerCase())) {
      explanationMatches++;
    }
  }

  const hasValidExplanation = explanationMatches > 0;

  if (hasCorrectAnswer && hasValidExplanation) {
    return {
      passed: true,
      hasCorrectAnswer: true,
      hasValidExplanation: true,
      score: 1.0,
      feedback: 'Excellent! You applied the common denominator method independently and verified your solution.',
      nextStatus: 'resolved'
    };
  }

  if (hasCorrectAnswer && !hasValidExplanation) {
    return {
      passed: true,
      hasCorrectAnswer: true,
      hasValidExplanation: false,
      score: 0.85,
      feedback: 'Your answer is correct! Be sure to always explain how you converted your fractions.',
      nextStatus: 'resolved'
    };
  }

  return {
    passed: false,
    hasCorrectAnswer: false,
    hasValidExplanation: false,
    score: 0.2,
    feedback: 'The transfer problem was not solved correctly yet. Let us review the common denominator steps once more.',
    nextStatus: 'investigating'
  };
}
