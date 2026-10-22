import { ConceptId, MisconceptionStatus } from '@/types/database';
import { CanonicalMisconceptionId, toLegacyId } from './taxonomy';
import {
  DiagnosticQuestion,
  getInitialQuestion,
  getQuestionById,
  QUESTION_BANK
} from './questionBank';
import { gradeResponse, GradingResult } from './grader';
import {
  createInitialTrackerState,
  DiagnosticTrackerState,
  updateTrackerWithGrading,
  getTopHypotheses
} from './hypothesisTracker';
import { selectNextQuestion } from './questionSelector';
import { getRemediationStep } from './remediation';
import { verifyMastery } from './mastery';

export interface DiagnosticSession {
  sessionId: string;
  studentId: string;
  conceptId: ConceptId;
  currentQuestion: DiagnosticQuestion;
  tracker: DiagnosticTrackerState;
  remediationStep: number; // 0 = diagnostic phase, 1..4 = remediation steps, 5 = transfer check
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStepResult {
  session: DiagnosticSession;
  grading: GradingResult;
  tutorReply: string;
  diagnosis: {
    misconception_id: string;
    canonical_id: CanonicalMisconceptionId;
    confidence: number;
    evidence: string;
    status: MisconceptionStatus;
  };
  understood: boolean;
  hintLevel: number;
  nextQuestion?: DiagnosticQuestion;
}

// In-memory session registry (keyed by studentId or sessionId)
const activeSessions: Map<string, DiagnosticSession> = new Map();

/**
 * Creates or retrieves an active diagnostic session for a student
 */
export function getOrCreateSession(
  studentId: string,
  conceptId: ConceptId = 'adding_fractions',
  initialQuestionId?: string
): DiagnosticSession {
  let session = activeSessions.get(studentId);

  if (!session || session.isCompleted) {
    const question = initialQuestionId
      ? getQuestionById(initialQuestionId) || getInitialQuestion()
      : getInitialQuestion();

    session = {
      sessionId: `diag_${studentId}_${Date.now()}`,
      studentId,
      conceptId,
      currentQuestion: question,
      tracker: createInitialTrackerState(),
      remediationStep: 0,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    activeSessions.set(studentId, session);
  }

  return session;
}

/**
 * Manually reset a student session (e.g. for testing or fresh evaluation)
 */
export function resetSession(studentId: string): void {
  activeSessions.delete(studentId);
}

/**
 * Orchestrates a single interaction turn within the diagnostic engine:
 * 1. Grades student input against current question
 * 2. Updates multi-hypothesis belief distribution
 * 3. Adaptively chooses whether to probe, remediate, transfer-verify, or abstain
 */
export function processStudentTurn(
  session: DiagnosticSession,
  rawStudentSubmission: string
): SessionStepResult {
  const currentQ = session.currentQuestion;

  // If session is already in transfer verification mode
  if (session.remediationStep === 5 || currentQ.isTransfer) {
    const verification = verifyMastery(currentQ, rawStudentSubmission);
    const grading = gradeResponse(currentQ, rawStudentSubmission);

    session.tracker = updateTrackerWithGrading(session.tracker, currentQ, grading);
    session.updatedAt = new Date().toISOString();

    if (verification.passed) {
      session.isCompleted = true;
      session.tracker.status = 'resolved';
      return {
        session,
        grading,
        tutorReply: `Outstanding work! ${verification.feedback}`,
        diagnosis: {
          misconception_id: 'none',
          canonical_id: 'NONE',
          confidence: 0.95,
          evidence: 'Successfully passed independent transfer challenge with correct reasoning.',
          status: 'resolved'
        },
        understood: true,
        hintLevel: 0
      };
    } else {
      // Failed transfer: return to remediation guidance
      session.remediationStep = 3; // back to conceptual hint
      const hintStep = getRemediationStep(session.tracker.leadingHypothesis, 3);
      return {
        session,
        grading,
        tutorReply: `${verification.feedback}\n\n${hintStep.prompt}`,
        diagnosis: {
          misconception_id: toLegacyId(session.tracker.leadingHypothesis),
          canonical_id: session.tracker.leadingHypothesis,
          confidence: session.tracker.confidence,
          evidence: `Failed transfer verification: ${grading.reasoning}`,
          status: 'confirmed'
        },
        understood: false,
        hintLevel: 2
      };
    }
  }

  // If currently advancing through Socratic remediation steps (1..4)
  if (session.remediationStep > 0 && session.remediationStep < 5) {
    session.remediationStep += 1;
    session.updatedAt = new Date().toISOString();

    if (session.remediationStep === 5) {
      // Transition to independent transfer verification
      const transferQ = selectNextQuestion(session.tracker, true);
      if (transferQ) {
        session.currentQuestion = transferQ;
        return {
          session,
          grading: {
            rawAnswer: rawStudentSubmission,
            normalizedAnswer: rawStudentSubmission,
            classification: 'correct',
            reasoning: 'Progressed to transfer challenge',
            isCorrect: true
          },
          tutorReply: `Now that we have explored this together, let's verify your understanding on a brand-new problem:\n\n${transferQ.prompt}`,
          diagnosis: {
            misconception_id: toLegacyId(session.tracker.leadingHypothesis),
            canonical_id: session.tracker.leadingHypothesis,
            confidence: session.tracker.confidence,
            evidence: 'Completed Socratic remediation, engaged transfer verification.',
            status: 'confirmed'
          },
          understood: true,
          hintLevel: 1,
          nextQuestion: transferQ
        };
      }
    }

    const currentRemediationStep = getRemediationStep(
      session.tracker.leadingHypothesis,
      session.remediationStep
    );

    return {
      session,
      grading: {
        rawAnswer: rawStudentSubmission,
        normalizedAnswer: rawStudentSubmission,
        classification: 'correct',
        reasoning: `Socratic remediation step ${session.remediationStep}`,
        isCorrect: true
      },
      tutorReply: currentRemediationStep.prompt,
      diagnosis: {
        misconception_id: toLegacyId(session.tracker.leadingHypothesis),
        canonical_id: session.tracker.leadingHypothesis,
        confidence: session.tracker.confidence,
        evidence: `In Socratic remediation: step ${session.remediationStep} (${currentRemediationStep.title})`,
        status: 'confirmed'
      },
      understood: false,
      hintLevel: session.remediationStep
    };
  }

  // =========================================================================
  // DIAGNOSTIC INVESTIGATION PHASE
  // =========================================================================

  // 1. Deterministic grading
  const grading = gradeResponse(currentQ, rawStudentSubmission);

  // 2. Multi-hypothesis belief update
  session.tracker = updateTrackerWithGrading(session.tracker, currentQ, grading);
  session.updatedAt = new Date().toISOString();

  const leadingHypothesis = session.tracker.leadingHypothesis;
  const legacyId = toLegacyId(leadingHypothesis);
  const status = session.tracker.status;

  // Map diagnostic status to database status
  const dbStatus: MisconceptionStatus =
    status === 'confirmed'
      ? 'confirmed'
      : status === 'resolved'
      ? 'resolved'
      : 'suspected';

  // 3. Handle Confirmed Diagnosis -> Initiate Remediation
  if (status === 'confirmed') {
    session.remediationStep = 1;
    const step1 = getRemediationStep(leadingHypothesis, 1);
    return {
      session,
      grading,
      tutorReply: step1.prompt,
      diagnosis: {
        misconception_id: legacyId,
        canonical_id: leadingHypothesis,
        confidence: session.tracker.confidence,
        evidence: grading.matchedRule?.label || 'Multiple consistent indicators confirmed misconception.',
        status: 'confirmed'
      },
      understood: false,
      hintLevel: 1
    };
  }

  // 4. Handle Correct / Sound Concept
  if (grading.isCorrect && leadingHypothesis === 'NONE') {
    // Student answered initial challenge correctly! Offer transfer or verify
    const transferQ = selectNextQuestion(session.tracker, true);
    if (transferQ && !session.tracker.questionsAsked.includes(transferQ.id)) {
      session.currentQuestion = transferQ;
      session.remediationStep = 5;
      return {
        session,
        grading,
        tutorReply: `Great job on that problem! Let's make sure you have this down with one quick transfer question:\n\n${transferQ.prompt}`,
        diagnosis: {
          misconception_id: 'none',
          canonical_id: 'NONE',
          confidence: session.tracker.confidence,
          evidence: grading.matchedRule?.label || 'Answered initial problem correctly.',
          status: 'resolved'
        },
        understood: true,
        hintLevel: 0,
        nextQuestion: transferQ
      };
    } else {
      session.isCompleted = true;
      return {
        session,
        grading,
        tutorReply: 'Excellent work! You demonstrated complete conceptual accuracy on fraction operations.',
        diagnosis: {
          misconception_id: 'none',
          canonical_id: 'NONE',
          confidence: 0.95,
          evidence: 'Verified correct understanding.',
          status: 'resolved'
        },
        understood: true,
        hintLevel: 0
      };
    }
  }

  // 5. Select discriminating follow-up probe if investigating or probable
  const nextProbe = selectNextQuestion(session.tracker);

  if (nextProbe) {
    session.currentQuestion = nextProbe;
    const transitionIntro = grading.isCorrect
      ? "Interesting observation! Let's check another case:"
      : "Let's take a closer look to see what's happening:";

    return {
      session,
      grading,
      tutorReply: `${transitionIntro}\n\n${nextProbe.prompt}`,
      diagnosis: {
        misconception_id: legacyId,
        canonical_id: leadingHypothesis,
        confidence: session.tracker.confidence,
        evidence: grading.matchedRule?.label || 'Gathering discriminating evidence.',
        status: dbStatus
      },
      understood: false,
      hintLevel: 1,
      nextQuestion: nextProbe
    };
  }

  // 6. Question budget exhausted or ambiguous -> Abstain honestly with undetermined
  session.tracker.status = 'undetermined';
  session.isCompleted = true;

  return {
    session,
    grading,
    tutorReply: "I see what you mean! Could you walk me through your thinking step-by-step so we can explore it together?",
    diagnosis: {
      misconception_id: 'unknown',
      canonical_id: 'UNDETERMINED',
      confidence: 0.20,
      evidence: 'Evidence was ambiguous or inconclusive across probe questions. Abstaining from premature diagnosis.',
      status: 'suspected'
    },
    understood: false,
    hintLevel: 1
  };
}
