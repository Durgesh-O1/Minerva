import { CanonicalMisconceptionId } from './taxonomy';
import { DiagnosticQuestion, QUESTION_BANK, getTransferQuestions } from './questionBank';
import { DiagnosticTrackerState, getTopHypotheses } from './hypothesisTracker';

/**
 * Evaluates how effectively a question discriminates between the leading candidate hypotheses
 */
function scoreQuestionDiscrimination(
  question: DiagnosticQuestion,
  leadingId: CanonicalMisconceptionId,
  runnerUpId?: CanonicalMisconceptionId
): number {
  let score = 0;

  // Primary goal: does this question address the leading candidate?
  if (question.distinguishes.includes(leadingId)) {
    score += 50;
  }

  // Critical goal: does this question actively discriminate between leading and runner-up?
  if (runnerUpId && question.distinguishes.includes(runnerUpId)) {
    score += 60;
  }

  // Bonus: Questions with detailed multiple choice options offer high diagnostic precision
  if (question.type === 'multiple_choice') {
    score += 15;
  }

  return score;
}

/**
 * Adaptively selects the optimal next diagnostic question:
 * - Prioritizes questions that actively separate competing hypotheses
 * - Avoids previously asked questions (anti-double-counting)
 * - Selects transfer questions during verification stage
 */
export function selectNextQuestion(
  state: DiagnosticTrackerState,
  forceTransfer: boolean = false
): DiagnosticQuestion | null {
  // If we are in verification mode, select an unused transfer question
  if (forceTransfer || state.recommendedAction === 'verify_transfer') {
    const transferQuestions = getTransferQuestions();
    const unusedTransfer = transferQuestions.find((q) => !state.questionsAsked.includes(q.id));
    return unusedTransfer || transferQuestions[0] || null;
  }

  // If already confirmed or undetermined, do not ask further exploratory questions
  if (state.status === 'confirmed' || state.status === 'undetermined') {
    return null;
  }

  const topHypotheses = getTopHypotheses(state, 2);
  const leading = topHypotheses[0];
  const runnerUp = topHypotheses[1];

  const leadingId = leading ? leading.id : 'M1_ADD_NUM_DEN';
  const runnerUpId = runnerUp ? runnerUp.id : undefined;

  // Filter out used questions and transfer questions
  const availableQuestions = QUESTION_BANK.filter(
    (q) => !q.isTransfer && !state.questionsAsked.includes(q.id)
  );

  if (availableQuestions.length === 0) {
    return null;
  }

  // Score each available question by discriminative power
  let bestQuestion: DiagnosticQuestion = availableQuestions[0];
  let highestScore = -1;

  for (const question of availableQuestions) {
    const score = scoreQuestionDiscrimination(question, leadingId, runnerUpId);
    if (score > highestScore) {
      highestScore = score;
      bestQuestion = question;
    }
  }

  return bestQuestion;
}
