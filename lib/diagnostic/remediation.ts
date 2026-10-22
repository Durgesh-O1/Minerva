import { CanonicalMisconceptionId, TAXONOMY } from './taxonomy';

export type RemediationStepType =
  | 'cognitive_conflict'
  | 'socratic_nudge'
  | 'conceptual_hint'
  | 'worked_example'
  | 'transfer_challenge';

export interface RemediationStep {
  stepNumber: number;
  type: RemediationStepType;
  title: string;
  prompt: string;
  guidanceForTutor: string;
}

export interface MisconceptionRemediationPlan {
  misconceptionId: CanonicalMisconceptionId;
  title: string;
  corePrinciple: string;
  steps: RemediationStep[];
}

export const REMEDIATION_PLANS: Record<CanonicalMisconceptionId, MisconceptionRemediationPlan> = {
  M1_ADD_NUM_DEN: {
    misconceptionId: 'M1_ADD_NUM_DEN',
    title: 'Adding Numerators and Denominators Directly',
    corePrinciple: 'Denominators represent partition sizes, not items to be added together.',
    steps: [
      {
        stepNumber: 1,
        type: 'cognitive_conflict',
        title: 'Cognitive Conflict Probe',
        prompt: 'Look closely at your answer 2/5 compared to 1/2. Is 2/5 bigger or smaller than 1/2? If you add a positive fraction 1/3 to 1/2, how could you end up with less than what you started with?',
        guidanceForTutor: 'Highlight the physical impossibility of adding something positive and ending up with less than the starting piece.'
      },
      {
        stepNumber: 2,
        type: 'socratic_nudge',
        title: 'Unit Partition Nudge',
        prompt: 'Imagine combining 1 apple and 1 orange. You do not get 2 "apploranges"; you need a common category: 2 pieces of fruit. What shared size can we slice halves and thirds into so all slices match?',
        guidanceForTutor: 'Encourage student to see the denominator as the unit name.'
      },
      {
        stepNumber: 3,
        type: 'conceptual_hint',
        title: 'Common Denominator Principle',
        prompt: 'To combine fractions with different denominators, we find a common denominator so every piece is the exact same size. For 2 and 3, their common multiple is 6. 1/2 becomes 3/6, and 1/3 becomes 2/6.',
        guidanceForTutor: 'Explain finding common multiples without solving the student’s new test problem.'
      },
      {
        stepNumber: 4,
        type: 'worked_example',
        title: 'Parallel Worked Example (Different Problem)',
        prompt: 'Here is an example with different numbers: What is 1/3 + 1/4?\n• Step 1: Common denominator for 3 and 4 is 12.\n• Step 2: Convert fractions: 1/3 = 4/12, and 1/4 = 3/12.\n• Step 3: Add only the top pieces: 4/12 + 3/12 = 7/12 (the denominator stays 12!).',
        guidanceForTutor: 'Strictly use parallel numbers (1/3 + 1/4 = 7/12) to avoid leaking test answers.'
      },
      {
        stepNumber: 5,
        type: 'transfer_challenge',
        title: 'Independent Transfer Challenge',
        prompt: 'Now try this new problem on your own: What is 1/4 + 1/6? Show your common denominator and step-by-step reasoning.',
        guidanceForTutor: 'Student must demonstrate independent application on fresh numbers.'
      }
    ]
  },

  M2_DENOMINATOR_SIZE: {
    misconceptionId: 'M2_DENOMINATOR_SIZE',
    title: 'Denominator Size Inversion',
    corePrinciple: 'Higher denominators mean more cuts, resulting in smaller individual pieces.',
    steps: [
      {
        stepNumber: 1,
        type: 'cognitive_conflict',
        title: 'Sharing Cake Conflict',
        prompt: 'If you share a single cake with 8 friends (1/8 each) versus sharing the same cake with only 2 friends (1/3 each), which slice is actually larger in your hand?',
        guidanceForTutor: 'Connect slice size directly to number of cuts.'
      },
      {
        stepNumber: 2,
        type: 'socratic_nudge',
        title: 'Number of Slices Nudge',
        prompt: 'The bottom number (denominator) tells you how many slices the whole pizza was cut into. Does cutting into more slices make each slice bigger or smaller?',
        guidanceForTutor: 'Guide student to discover the inverse relationship.'
      },
      {
        stepNumber: 3,
        type: 'conceptual_hint',
        title: 'Inverse Relationship',
        prompt: 'As the denominator grows, the size of each piece shrinks: 1/2 > 1/3 > 1/4 > 1/8. A bigger denominator means smaller pieces.',
        guidanceForTutor: 'Clarify the difference between whole number ordering and fractional cut sizing.'
      },
      {
        stepNumber: 4,
        type: 'worked_example',
        title: 'Parallel Worked Example',
        prompt: 'Example: Compare 1/5 and 1/10. 5 cuts produce bigger pieces than 10 cuts. In fact, 1/5 is twice as big as 1/10 (2/10 = 1/5). Therefore 1/5 > 1/10.',
        guidanceForTutor: 'Use 1/5 vs 1/10 to illustrate.'
      },
      {
        stepNumber: 5,
        type: 'transfer_challenge',
        title: 'Independent Transfer Challenge',
        prompt: 'Which is larger: 2/5 or 3/10? Convert 2/5 to tenths to verify your answer.',
        guidanceForTutor: 'Test transfer with unequal numerators and denominators.'
      }
    ]
  },

  M3_EQUAL_NUMERATOR: {
    misconceptionId: 'M3_EQUAL_NUMERATOR',
    title: 'Equal Numerator Fallacy',
    corePrinciple: 'Same number of pieces does not mean same quantity if piece sizes differ.',
    steps: [
      {
        stepNumber: 1,
        type: 'cognitive_conflict',
        title: 'Piece Size Absurdity',
        prompt: 'Imagine you have 2 giant watermelon slices, and your friend has 2 tiny apple seeds. You both have "2 pieces." Are you holding the same amount of food?',
        guidanceForTutor: 'Illustrate that count (2) is meaningless without the unit size.'
      },
      {
        stepNumber: 2,
        type: 'socratic_nudge',
        title: 'Denominator Scale Nudge',
        prompt: 'In 2/5 and 2/7, both have 2 slices. But which slices are bigger: fifths or sevenths?',
        guidanceForTutor: 'Direct attention to the denominator difference.'
      },
      {
        stepNumber: 3,
        type: 'conceptual_hint',
        title: 'Numerator vs Denominator Roles',
        prompt: 'The numerator counts HOW MANY pieces you have. The denominator defines HOW BIG each piece is. 2 fifths is bigger than 2 sevenths because fifths are larger than sevenths.',
        guidanceForTutor: 'Clarify dual roles of top and bottom.'
      },
      {
        stepNumber: 4,
        type: 'worked_example',
        title: 'Parallel Worked Example',
        prompt: 'Example: Compare 3/4 and 3/8. Both have 3 pieces. But fourths are twice as large as eighths (1/4 = 2/8, so 3/4 = 6/8). 6/8 is clearly larger than 3/8, so 3/4 > 3/8.',
        guidanceForTutor: 'Demonstrate with 3/4 vs 3/8.'
      },
      {
        stepNumber: 5,
        type: 'transfer_challenge',
        title: 'Independent Transfer Challenge',
        prompt: 'Compare 3/5 and 3/10. Which is larger and why?',
        guidanceForTutor: 'Assess transfer application.'
      }
    ]
  },

  M4_WHOLE_NUMBER_BIAS: {
    misconceptionId: 'M4_WHOLE_NUMBER_BIAS',
    title: 'Whole Number Bias in Fractions',
    corePrinciple: 'A fraction is a single unified point on the number line, not two separate integers.',
    steps: [
      {
        stepNumber: 1,
        type: 'cognitive_conflict',
        title: 'Number Line Placement Conflict',
        prompt: 'If someone asks you where 4/4 is on the number line, would you place two dots at 4 and 4, or a single dot at 1?',
        guidanceForTutor: 'Emphasize that a fraction represents one single magnitude.'
      },
      {
        stepNumber: 2,
        type: 'socratic_nudge',
        title: 'Fraction as Division Nudge',
        prompt: 'Remember that the fraction bar literally means division. What is 6 divided by 2? It is the single number 3, not two detached numbers 6 and 2.',
        guidanceForTutor: 'Link fraction bar to division operation.'
      },
      {
        stepNumber: 3,
        type: 'conceptual_hint',
        title: 'Unified Ratio Concept',
        prompt: 'A fraction a/b is a single quantity representing the value of a divided by b. 3/4 is 0.75, located between 0 and 1.',
        guidanceForTutor: 'Reinforce number line placement.'
      },
      {
        stepNumber: 4,
        type: 'worked_example',
        title: 'Parallel Worked Example',
        prompt: 'Example: What is 8/4? 8 divided by 4 is 2. It is a single whole number. Similarly, 2/4 is 2 divided by 4, which is 0.5 (one half).',
        guidanceForTutor: 'Use simple division examples.'
      },
      {
        stepNumber: 5,
        type: 'transfer_challenge',
        title: 'Independent Transfer Challenge',
        prompt: 'Explain what 6/6 represents as a single number, and where 3/6 lies between 0 and 1.',
        guidanceForTutor: 'Verify unified quantity understanding.'
      }
    ]
  },

  M5_COMMON_UNIT: {
    misconceptionId: 'M5_COMMON_UNIT',
    title: 'Need for Common Units in Addition',
    corePrinciple: 'Quantities with different unit partitions cannot be combined until converted to identical units.',
    steps: [
      {
        stepNumber: 1,
        type: 'cognitive_conflict',
        title: 'Dollar and Dime Conflict',
        prompt: 'If you have 1 dollar bill and 1 dime, do you have 2 dollars? Or 2 dimes? What unit do you have to convert both to before adding them?',
        guidanceForTutor: 'Use currency to ground unit standardization.'
      },
      {
        stepNumber: 2,
        type: 'socratic_nudge',
        title: 'Matching Unit Sizes Nudge',
        prompt: 'Fractions are just like currencies. You cannot add halves and thirds directly because their piece sizes differ. How can we make the pieces match?',
        guidanceForTutor: 'Guide to equivalent fraction conversion.'
      },
      {
        stepNumber: 3,
        type: 'conceptual_hint',
        title: 'Standardizing Slices Principle',
        prompt: 'We multiply numerator and denominator by the same factor to create equivalent fractions with a shared denominator. For halves and thirds, we cut both into sixths.',
        guidanceForTutor: 'Explain preservation of value during unit conversion.'
      },
      {
        stepNumber: 4,
        type: 'worked_example',
        title: 'Parallel Worked Example',
        prompt: 'Example: 1/2 + 1/4.\n• Can we add them yet? No, halves and fourths are different sizes.\n• Convert 1/2 to fourths: 1/2 = 2/4.\n• Now both are fourths: 2/4 + 1/4 = 3/4.',
        guidanceForTutor: 'Clear demonstration of equal unit conversion.'
      },
      {
        stepNumber: 5,
        type: 'transfer_challenge',
        title: 'Independent Transfer Challenge',
        prompt: 'Calculate 1/4 + 1/6 by finding a common unit (common denominator). What is your common unit and final sum?',
        guidanceForTutor: 'Require common denominator explanation.'
      }
    ]
  },

  CAREFUL_SLIP: {
    misconceptionId: 'CAREFUL_SLIP',
    title: 'Arithmetic Slip Check',
    corePrinciple: 'Concept was sound; arithmetic step requires verification.',
    steps: [
      {
        stepNumber: 1,
        type: 'cognitive_conflict',
        title: 'Arithmetic Recheck',
        prompt: 'Your conceptual method of finding a common denominator was spot on! Take one quick look at your final addition step. What is the sum of the numerators?',
        guidanceForTutor: 'Acknowledge correct method, prompt quick arithmetic check.'
      },
      {
        stepNumber: 2,
        type: 'transfer_challenge',
        title: 'Confirm Accuracy',
        prompt: 'Re-compute the numerator sum to confirm.',
        guidanceForTutor: 'Confirm clean arithmetic.'
      }
    ]
  },

  UNDETERMINED: {
    misconceptionId: 'UNDETERMINED',
    title: 'Gathering Clarification',
    corePrinciple: 'Evidence is currently inconclusive; explore student reasoning.',
    steps: [
      {
        stepNumber: 1,
        type: 'socratic_nudge',
        title: 'Step-by-Step Walkthrough',
        prompt: 'Could you walk me through your thinking step-by-step? What did you do first, and why?',
        guidanceForTutor: 'Elicit qualitative reasoning to form a clear hypothesis.'
      }
    ]
  },

  NONE: {
    misconceptionId: 'NONE',
    title: 'Concept Mastered',
    corePrinciple: 'Student has demonstrated solid conceptual mastery.',
    steps: [
      {
        stepNumber: 1,
        type: 'transfer_challenge',
        title: 'Advanced Extension',
        prompt: 'Excellent work! You have shown a strong grasp of fractions and common units.',
        guidanceForTutor: 'Reinforce positive mastery.'
      }
    ]
  }
};

/**
 * Gets the remediation plan for a diagnosed misconception
 */
export function getRemediationPlan(id: CanonicalMisconceptionId): MisconceptionRemediationPlan {
  return REMEDIATION_PLANS[id] || REMEDIATION_PLANS.UNDETERMINED;
}

/**
 * Retrieves a specific step in the Socratic remediation progression
 */
export function getRemediationStep(
  id: CanonicalMisconceptionId,
  stepNumber: number
): RemediationStep {
  const plan = getRemediationPlan(id);
  const step = plan.steps.find((s) => s.stepNumber === stepNumber);
  return step || plan.steps[plan.steps.length - 1];
}

/**
 * Validates that an AI tutor response does not leak target answers
 */
export function checkResponseForAnswerLeak(
  response: string,
  forbiddenAnswers: string[]
): { hasLeak: boolean; leakedAnswer?: string } {
  const lower = response.toLowerCase();
  for (const answer of forbiddenAnswers) {
    const cleanAnswer = answer.toLowerCase().trim();
    if (cleanAnswer && lower.includes(cleanAnswer)) {
      return { hasLeak: true, leakedAnswer: answer };
    }
  }
  return { hasLeak: false };
}
