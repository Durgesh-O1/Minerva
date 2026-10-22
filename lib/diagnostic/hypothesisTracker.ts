import { CanonicalMisconceptionId, DiagnosticStatus, TAXONOMY } from './taxonomy';
import { DiagnosticQuestion } from './questionBank';
import { GradingResult } from './grader';

export interface EvidenceRecord {
  questionId: string;
  questionCode: string;
  answer: string;
  label: string;
  weight: number;
  timestamp: string;
}

export interface HypothesisBelief {
  id: CanonicalMisconceptionId;
  name: string;
  /** Heuristic belief score between 0.0 and 1.0 */
  score: number;
  /** Number of independent questions providing positive evidence */
  evidenceCount: number;
  supportingEvidence: EvidenceRecord[];
  weakeningEvidence: EvidenceRecord[];
}

export type RecommendedAction =
  | 'ask_discriminating_question'
  | 'remediate'
  | 'verify_transfer'
  | 'abstain_undetermined'
  | 'conclude_mastery';

export interface InteractionHistoryItem {
  questionId: string;
  questionCode: string;
  rawAnswer: string;
  normalizedAnswer: string;
  classification: string;
  ruleLabel?: string;
  isCorrect: boolean;
  timestamp: string;
}

export interface DiagnosticTrackerState {
  candidates: Record<CanonicalMisconceptionId, HypothesisBelief>;
  questionsAsked: string[];
  totalResponses: number;
  status: DiagnosticStatus;
  leadingHypothesis: CanonicalMisconceptionId;
  confidence: number;
  confidenceType: 'heuristic';
  history: InteractionHistoryItem[];
  recommendedAction: RecommendedAction;
  lastUpdated: string;
}

const ALL_MISCONCEPTION_IDS: CanonicalMisconceptionId[] = [
  'M1_ADD_NUM_DEN',
  'M2_DENOMINATOR_SIZE',
  'M3_EQUAL_NUMERATOR',
  'M4_WHOLE_NUMBER_BIAS',
  'M5_COMMON_UNIT',
  'CAREFUL_SLIP',
  'UNDETERMINED',
  'NONE'
];

/**
 * Creates a clean initial diagnostic belief distribution
 */
export function createInitialTrackerState(): DiagnosticTrackerState {
  const candidates: Partial<Record<CanonicalMisconceptionId, HypothesisBelief>> = {};

  for (const id of ALL_MISCONCEPTION_IDS) {
    candidates[id] = {
      id,
      name: TAXONOMY[id].name,
      score: id === 'NONE' ? 0.15 : 0.05,
      evidenceCount: 0,
      supportingEvidence: [],
      weakeningEvidence: []
    };
  }

  return {
    candidates: candidates as Record<CanonicalMisconceptionId, HypothesisBelief>,
    questionsAsked: [],
    totalResponses: 0,
    status: 'investigating',
    leadingHypothesis: 'UNDETERMINED',
    confidence: 0.1,
    confidenceType: 'heuristic',
    history: [],
    recommendedAction: 'ask_discriminating_question',
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Updates the belief distribution with deterministic evidence from student grading.
 * 
 * Update Rules & Constraints:
 * 1. Anti-Double-Counting: Asking identical or previously answered questions will not
 *    re-increment evidence counts or artificially inflate belief.
 * 2. Multi-Evidence Requirement: A single response can NEVER confirm a diagnosis.
 *    Confirmation strictly requires >= 2 independent consistent pieces of evidence from distinct questions.
 * 3. Competing Hypotheses: If top 2 hypotheses have close scores (delta < 0.20),
 *    the engine marks the state as 'investigating' and recommends a discriminating probe.
 * 4. Abstention: If question budget is exhausted without clear confirmation,
 *    it explicitly abstains with 'undetermined' instead of guessing.
 */
export function updateTrackerWithGrading(
  state: DiagnosticTrackerState,
  question: DiagnosticQuestion,
  result: GradingResult,
  maxQuestionsBudget: number = 4
): DiagnosticTrackerState {
  const timestamp = new Date().toISOString();
  const nextCandidates: Record<CanonicalMisconceptionId, HypothesisBelief> = JSON.parse(
    JSON.stringify(state.candidates)
  );

  const alreadyAsked = state.questionsAsked.includes(question.id);
  const nextQuestionsAsked = alreadyAsked
    ? state.questionsAsked
    : [...state.questionsAsked, question.id];

  const historyItem: InteractionHistoryItem = {
    questionId: question.id,
    questionCode: question.code,
    rawAnswer: result.rawAnswer,
    normalizedAnswer: result.normalizedAnswer,
    classification: result.classification,
    ruleLabel: result.matchedRule?.label,
    isCorrect: result.isCorrect,
    timestamp
  };

  const nextHistory = [...state.history, historyItem];

  // 1. Guard against prompt injection / manipulation attempts
  if (result.classification === 'manipulation') {
    return {
      ...state,
      history: nextHistory,
      lastUpdated: timestamp
    };
  }

  // 2. Process matched evidence rule if present
  if (result.matchedRule && !alreadyAsked) {
    const rule = result.matchedRule;

    // Apply positive evidence
    for (const sup of rule.supports) {
      const candidate = nextCandidates[sup.id];
      if (candidate) {
        // Increment distinct evidence count
        candidate.evidenceCount += 1;
        // Bounded heuristic update rule: score approaches 1.0 asymptotically
        candidate.score = Number(
          Math.min(0.99, candidate.score + (1.0 - candidate.score) * sup.weight * 0.70).toFixed(3)
        );
        candidate.supportingEvidence.push({
          questionId: question.id,
          questionCode: question.code,
          answer: result.rawAnswer,
          label: rule.label,
          weight: sup.weight,
          timestamp
        });
      }
    }

    // Apply negative evidence
    for (const weak of rule.weakens) {
      const candidate = nextCandidates[weak.id];
      if (candidate) {
        // Multiplicative decay
        candidate.score = Number(
          Math.max(0.01, candidate.score * (1.0 - weak.weight * 0.85)).toFixed(3)
        );
        candidate.weakeningEvidence.push({
          questionId: question.id,
          questionCode: question.code,
          answer: result.rawAnswer,
          label: rule.label,
          weight: weak.weight,
          timestamp
        });
      }
    }
  }

  // 3. Find leading candidate among actionable misconception hypotheses
  const trackedMisconceptions: CanonicalMisconceptionId[] = [
    'M1_ADD_NUM_DEN',
    'M2_DENOMINATOR_SIZE',
    'M3_EQUAL_NUMERATOR',
    'M4_WHOLE_NUMBER_BIAS',
    'M5_COMMON_UNIT',
    'CAREFUL_SLIP'
  ];

  const sortedCandidates = trackedMisconceptions
    .map((id) => nextCandidates[id])
    .sort((a, b) => b.score - a.score);

  const topCandidate = sortedCandidates[0];
  const runnerUp = sortedCandidates[1];

  let nextStatus: DiagnosticStatus = 'investigating';
  let nextLeading: CanonicalMisconceptionId = 'UNDETERMINED';
  let nextConfidence: number = 0.1;
  let nextAction: RecommendedAction = 'ask_discriminating_question';

  const totalDistinctQuestions = nextQuestionsAsked.length;

  // Check if student demonstrated sound understanding
  if (nextCandidates['NONE'].score >= 0.60 && topCandidate.score < 0.35) {
    nextLeading = 'NONE';
    nextConfidence = nextCandidates['NONE'].score;
    nextStatus = question.isTransfer ? 'resolved' : 'probable';
    nextAction = question.isTransfer ? 'conclude_mastery' : 'verify_transfer';
  } else if (topCandidate && topCandidate.score >= 0.40) {
    nextLeading = topCandidate.id;
    nextConfidence = topCandidate.score;

    // Special handling for careful slips
    if (topCandidate.id === 'CAREFUL_SLIP') {
      nextStatus = topCandidate.evidenceCount >= 1 ? 'probable' : 'investigating';
      nextAction = 'ask_discriminating_question';
    } else if (topCandidate.evidenceCount >= 2 && topCandidate.score >= 0.75) {
      // Check if runner up is competing
      const scoreMargin = topCandidate.score - (runnerUp ? runnerUp.score : 0);
      if (runnerUp && runnerUp.score >= 0.50 && scoreMargin < 0.20) {
        // Hypotheses remain indistinguishable
        if (totalDistinctQuestions >= maxQuestionsBudget) {
          nextStatus = 'undetermined';
          nextLeading = 'UNDETERMINED';
          nextAction = 'abstain_undetermined';
        } else {
          nextStatus = 'investigating';
          nextAction = 'ask_discriminating_question';
        }
      } else {
        // Confirmed!
        nextStatus = 'confirmed';
        nextAction = 'remediate';
      }
    } else {
      // 1 piece of evidence or moderate score
      nextStatus = topCandidate.score >= 0.60 ? 'probable' : 'investigating';
      if (totalDistinctQuestions >= maxQuestionsBudget) {
        nextStatus = 'undetermined';
        nextLeading = 'UNDETERMINED';
        nextAction = 'abstain_undetermined';
      } else {
        nextAction = 'ask_discriminating_question';
      }
    }
  } else {
    // Insufficient evidence
    if (totalDistinctQuestions >= maxQuestionsBudget) {
      nextStatus = 'undetermined';
      nextLeading = 'UNDETERMINED';
      nextAction = 'abstain_undetermined';
    } else {
      nextStatus = 'investigating';
      nextAction = 'ask_discriminating_question';
    }
    nextConfidence = 0.15;
  }

  // If question was an independent transfer question and student passed
  if (question.isTransfer && result.isCorrect) {
    nextStatus = 'resolved';
    nextLeading = 'NONE';
    nextAction = 'conclude_mastery';
  }

  return {
    candidates: nextCandidates,
    questionsAsked: nextQuestionsAsked,
    totalResponses: state.totalResponses + 1,
    status: nextStatus,
    leadingHypothesis: nextLeading,
    confidence: nextConfidence,
    confidenceType: 'heuristic',
    history: nextHistory,
    recommendedAction: nextAction,
    lastUpdated: timestamp
  };
}

/**
 * Gets top N hypotheses sorted by heuristic belief score
 */
export function getTopHypotheses(
  state: DiagnosticTrackerState,
  limit: number = 3
): HypothesisBelief[] {
  return Object.values(state.candidates)
    .filter((c) => c.id !== 'UNDETERMINED')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
