import { CanonicalMisconceptionId } from './taxonomy';
import { ConceptId } from '@/types/database';

export type QuestionType = 'multiple_choice' | 'numeric' | 'free_text';

export interface AnswerOption {
  id: string;
  text: string;
  displayMath?: string;
}

export interface EvidenceRule {
  /** Predicate or identifier matching the student's answer */
  match: (normalizedAnswer: string) => boolean;
  label: string;
  isCorrect?: boolean;
  isCarefulSlip?: boolean;
  /** Hypotheses supported by this answer with positive weight increment (0.0 to 1.0) */
  supports: Array<{ id: CanonicalMisconceptionId; weight: number }>;
  /** Hypotheses weakened or disproven by this answer with weight reduction */
  weakens: Array<{ id: CanonicalMisconceptionId; weight: number }>;
}

export interface DiagnosticQuestion {
  id: string;
  code: string;
  concept: ConceptId;
  prompt: string;
  displayMath?: string;
  type: QuestionType;
  options?: AnswerOption[];
  expectedAnswer: string;
  acceptableAnswers: string[];
  explanation: string;
  /** Candidate hypotheses this question is designed to discriminate between */
  distinguishes: CanonicalMisconceptionId[];
  isTransfer?: boolean;
  evidenceRules: EvidenceRule[];
}

export const QUESTION_BANK: DiagnosticQuestion[] = [
  // =========================================================================
  // INITIAL CHALLENGES
  // =========================================================================
  {
    id: 'Q_INITIAL_ADD_1_2_1_3',
    code: 'INIT_ADD',
    concept: 'adding_fractions',
    prompt: 'What is 1/2 + 1/3? Give your answer and explain how you found it.',
    displayMath: '1/2 + 1/3 = ?',
    type: 'numeric',
    expectedAnswer: '5/6',
    acceptableAnswers: ['5/6', 'five sixths', '0.833'],
    explanation: 'To combine halves and thirds, partition both into equal sixths: 3/6 + 2/6 = 5/6.',
    distinguishes: ['M1_ADD_NUM_DEN', 'M5_COMMON_UNIT', 'CAREFUL_SLIP', 'NONE'],
    evidenceRules: [
      {
        match: (ans) => ans.includes('2/5') || ans.includes('two fifths'),
        label: 'Answered 2/5 (1+1)/(2+3)',
        supports: [
          { id: 'M1_ADD_NUM_DEN', weight: 0.80 },
          { id: 'M5_COMMON_UNIT', weight: 0.50 }
        ],
        weakens: [
          { id: 'NONE', weight: 0.90 }
        ]
      },
      {
        match: (ans) => ans.includes('5/6') || ans.includes('five sixths'),
        label: 'Answered correct sum 5/6',
        isCorrect: true,
        supports: [
          { id: 'NONE', weight: 0.85 }
        ],
        weakens: [
          { id: 'M1_ADD_NUM_DEN', weight: 0.90 },
          { id: 'M5_COMMON_UNIT', weight: 0.80 },
          { id: 'M4_WHOLE_NUMBER_BIAS', weight: 0.70 }
        ]
      },
      {
        match: (ans) => ans.includes('4/6') || ans.includes('6/6'),
        label: 'Converted to sixths but made arithmetic slip',
        isCarefulSlip: true,
        supports: [
          { id: 'CAREFUL_SLIP', weight: 0.75 }
        ],
        weakens: [
          { id: 'M1_ADD_NUM_DEN', weight: 0.70 }
        ]
      }
    ]
  },

  // =========================================================================
  // DISCRIMINATING PROBES: M1 (Add bottoms) vs M5 (Common unit confusion)
  // =========================================================================
  {
    id: 'Q_LIKE_DENOMINATOR_ADD',
    code: 'DISCRIM_M1_M5_LIKE',
    concept: 'adding_fractions',
    prompt: 'What is 2/7 + 3/7? Choose the correct sum.',
    displayMath: '2/7 + 3/7 = ?',
    type: 'multiple_choice',
    options: [
      { id: 'opt_a', text: '5/7 (Only add the numerators, denominators stay 7)', displayMath: '5/7' },
      { id: 'opt_b', text: '5/14 (Add 2+3 on top and 7+7 on bottom)', displayMath: '5/14' },
      { id: 'opt_c', text: '6/7 (Multiply the numerators)', displayMath: '6/7' },
      { id: 'opt_d', text: '1/7 (Subtract the numerators)', displayMath: '1/7' }
    ],
    expectedAnswer: '5/7',
    acceptableAnswers: ['5/7', 'opt_a', 'five sevenths'],
    explanation: 'Because both fractions already share the same unit size (sevenths), we only add the counts: 2 + 3 = 5 sevenths (5/7). We never add the denominators.',
    distinguishes: ['M1_ADD_NUM_DEN', 'M5_COMMON_UNIT'],
    evidenceRules: [
      {
        match: (ans) => ans.includes('5/14') || ans.includes('opt_b') || ans.includes('fourteen'),
        label: 'Added denominators with like fractions (5/14) -> Confirms systemic M1',
        supports: [
          { id: 'M1_ADD_NUM_DEN', weight: 0.95 },
          { id: 'M4_WHOLE_NUMBER_BIAS', weight: 0.40 }
        ],
        weakens: [
          { id: 'M5_COMMON_UNIT', weight: 0.85 },
          { id: 'NONE', weight: 0.95 }
        ]
      },
      {
        match: (ans) => ans.includes('5/7') || ans.includes('opt_a') || ans.includes('five sevenths'),
        label: 'Kept denominator 7 on like fractions (5/7) -> Rules out pure M1; isolates M5',
        isCorrect: true,
        supports: [
          { id: 'M5_COMMON_UNIT', weight: 0.85 },
          { id: 'NONE', weight: 0.60 }
        ],
        weakens: [
          { id: 'M1_ADD_NUM_DEN', weight: 0.95 }
        ]
      }
    ]
  },

  // =========================================================================
  // DISCRIMINATING PROBES: M1/M5 vs CAREFUL_SLIP (Cognitive Conflict)
  // =========================================================================
  {
    id: 'Q_COGNITIVE_CONFLICT_2_5',
    code: 'CONFLICT_SIZE',
    concept: 'comparing_fractions',
    prompt: 'Look at 2/5 compared to 1/2. Which statement is true?',
    displayMath: '2/5  vs  1/2',
    type: 'multiple_choice',
    options: [
      { id: 'opt_a', text: '2/5 is smaller than 1/2 (since 2/5 = 40% while 1/2 = 50%)' },
      { id: 'opt_b', text: '2/5 is bigger than 1/2 (since 2 is bigger than 1)' },
      { id: 'opt_c', text: 'They are exactly the same amount' }
    ],
    expectedAnswer: 'opt_a',
    acceptableAnswers: ['opt_a', 'smaller', 'less', '2/5 is smaller'],
    explanation: '2/5 is less than half (half of 5 is 2.5). Therefore, adding two positive amounts cannot equal 2/5 because 1/2 + 1/3 must be larger than 1/2 alone.',
    distinguishes: ['M1_ADD_NUM_DEN', 'M4_WHOLE_NUMBER_BIAS', 'CAREFUL_SLIP'],
    evidenceRules: [
      {
        match: (ans) => ans.includes('opt_a') || ans.includes('smaller') || ans.includes('less'),
        label: 'Recognized cognitive conflict (2/5 < 1/2)',
        isCorrect: true,
        supports: [
          { id: 'M5_COMMON_UNIT', weight: 0.60 }
        ],
        weakens: [
          { id: 'M4_WHOLE_NUMBER_BIAS', weight: 0.70 },
          { id: 'M1_ADD_NUM_DEN', weight: 0.40 }
        ]
      },
      {
        match: (ans) => ans.includes('opt_b') || ans.includes('bigger') || ans.includes('2 is bigger'),
        label: 'Believes 2/5 is bigger because 2 > 1 (Whole number bias)',
        supports: [
          { id: 'M4_WHOLE_NUMBER_BIAS', weight: 0.85 },
          { id: 'M1_ADD_NUM_DEN', weight: 0.50 }
        ],
        weakens: [
          { id: 'NONE', weight: 0.85 }
        ]
      }
    ]
  },

  // =========================================================================
  // DISCRIMINATING PROBES: M2 (Bigger denominator = bigger fraction)
  // =========================================================================
  {
    id: 'Q_COMPARE_UNIT_FRACTIONS',
    code: 'DISCRIM_M2_SIZE',
    concept: 'comparing_fractions',
    prompt: 'Which slice gives you more pizza: 1/8 of a pizza, or 1/3 of the same pizza?',
    displayMath: '1/8  vs  1/3',
    type: 'multiple_choice',
    options: [
      { id: 'opt_a', text: '1/3 is bigger (cutting into 3 pieces makes larger slices than cutting into 8)' },
      { id: 'opt_b', text: '1/8 is bigger (because 8 is a larger number than 3)' },
      { id: 'opt_c', text: 'They are equal (both have 1 slice)' }
    ],
    expectedAnswer: 'opt_a',
    acceptableAnswers: ['opt_a', '1/3', 'one third', '1/3 is bigger', 'third'],
    explanation: 'The denominator indicates how many equal pieces the whole is divided into. Slicing into 3 yields much larger slices than slicing into 8.',
    distinguishes: ['M2_DENOMINATOR_SIZE', 'M3_EQUAL_NUMERATOR'],
    evidenceRules: [
      {
        match: (ans) => ans.includes('opt_b') || ans.includes('1/8') || ans.includes('8 is larger') || ans.includes('8 is bigger'),
        label: 'Chose 1/8 because 8 is larger -> Confirms M2',
        supports: [
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.95 }
        ],
        weakens: [
          { id: 'M3_EQUAL_NUMERATOR', weight: 0.60 },
          { id: 'NONE', weight: 0.95 }
        ]
      },
      {
        match: (ans) => ans.includes('opt_c') || ans.includes('equal') || ans.includes('both have 1'),
        label: 'Chose equal because both have 1 on top -> Confirms M3',
        supports: [
          { id: 'M3_EQUAL_NUMERATOR', weight: 0.90 }
        ],
        weakens: [
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.70 },
          { id: 'NONE', weight: 0.90 }
        ]
      },
      {
        match: (ans) => ans.includes('opt_a') || ans.includes('1/3') || ans.includes('third'),
        label: 'Correctly identified 1/3 as larger',
        isCorrect: true,
        supports: [
          { id: 'NONE', weight: 0.70 }
        ],
        weakens: [
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.95 },
          { id: 'M3_EQUAL_NUMERATOR', weight: 0.80 }
        ]
      }
    ]
  },

  // =========================================================================
  // DISCRIMINATING PROBES: M3 (Equal Numerators)
  // =========================================================================
  {
    id: 'Q_EQUAL_NUMERATOR_PROBE',
    code: 'DISCRIM_M3_NUM',
    concept: 'comparing_fractions',
    prompt: 'Is 2/5 equal to 2/7? Select the most accurate statement.',
    displayMath: '2/5  ==  2/7 ?',
    type: 'multiple_choice',
    options: [
      { id: 'opt_a', text: 'No, 2/5 is larger because 5ths are bigger pieces than 7ths' },
      { id: 'opt_b', text: 'Yes, they are equal because both have 2 parts' },
      { id: 'opt_c', text: 'No, 2/7 is larger because 7 is bigger than 5' }
    ],
    expectedAnswer: 'opt_a',
    acceptableAnswers: ['opt_a', '2/5 is larger', 'no', 'not equal'],
    explanation: 'Both fractions have 2 pieces, but 5ths are substantially larger slices than 7ths. Thus 2/5 > 2/7.',
    distinguishes: ['M3_EQUAL_NUMERATOR', 'M2_DENOMINATOR_SIZE'],
    evidenceRules: [
      {
        match: (ans) => ans.includes('opt_b') || ans.includes('yes') || ans.includes('both have 2') || ans.includes('equal'),
        label: 'Claimed fractions are equal due to same numerator -> Confirms M3',
        supports: [
          { id: 'M3_EQUAL_NUMERATOR', weight: 0.95 }
        ],
        weakens: [
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.70 },
          { id: 'NONE', weight: 0.95 }
        ]
      },
      {
        match: (ans) => ans.includes('opt_c') || ans.includes('2/7 is larger') || ans.includes('7 is bigger'),
        label: 'Claimed 2/7 is larger because 7 is bigger -> Confirms M2',
        supports: [
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.90 }
        ],
        weakens: [
          { id: 'M3_EQUAL_NUMERATOR', weight: 0.80 }
        ]
      },
      {
        match: (ans) => ans.includes('opt_a') || ans.includes('2/5 is larger'),
        label: 'Correctly identified 2/5 is larger',
        isCorrect: true,
        supports: [
          { id: 'NONE', weight: 0.80 }
        ],
        weakens: [
          { id: 'M3_EQUAL_NUMERATOR', weight: 0.95 },
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.90 }
        ]
      }
    ]
  },

  // =========================================================================
  // DISCRIMINATING PROBES: M4 (Whole Number Bias)
  // =========================================================================
  {
    id: 'Q_FRACTION_AS_SINGLE_QUANTITY',
    code: 'DISCRIM_M4_WHOLE',
    concept: 'fraction_as_division',
    prompt: 'What does the fraction 4/4 represent on the number line?',
    displayMath: '4/4 = ?',
    type: 'multiple_choice',
    options: [
      { id: 'opt_a', text: 'Exactly the single whole number 1' },
      { id: 'opt_b', text: 'Two separate numbers: 4 and 4' },
      { id: 'opt_c', text: 'The number 4' }
    ],
    expectedAnswer: 'opt_a',
    acceptableAnswers: ['opt_a', '1', 'one', 'whole number 1'],
    explanation: 'A fraction is a single unified quantity. 4/4 means 4 fourths, which equals exactly 1.',
    distinguishes: ['M4_WHOLE_NUMBER_BIAS'],
    evidenceRules: [
      {
        match: (ans) => ans.includes('opt_b') || ans.includes('two separate') || ans.includes('4 and 4'),
        label: 'Viewed 4/4 as two separate numbers -> Confirms M4',
        supports: [
          { id: 'M4_WHOLE_NUMBER_BIAS', weight: 0.90 }
        ],
        weakens: [
          { id: 'NONE', weight: 0.90 }
        ]
      },
      {
        match: (ans) => ans.includes('opt_a') || ans.includes('1') || ans.includes('one'),
        label: 'Recognized fraction as single quantity 1',
        isCorrect: true,
        supports: [
          { id: 'NONE', weight: 0.70 }
        ],
        weakens: [
          { id: 'M4_WHOLE_NUMBER_BIAS', weight: 0.90 }
        ]
      }
    ]
  },

  // =========================================================================
  // INDEPENDENT TRANSFER QUESTIONS (For Mastery Verification)
  // =========================================================================
  {
    id: 'Q_TRANSFER_1_4_1_6',
    code: 'TRANSFER_ADD',
    concept: 'adding_fractions',
    prompt: 'Now try a new problem on your own: What is 1/4 + 1/6? Give your answer and state the common denominator you used.',
    displayMath: '1/4 + 1/6 = ?',
    type: 'numeric',
    expectedAnswer: '5/12',
    acceptableAnswers: ['5/12', '10/24', 'five twelfths', '0.416'],
    explanation: 'Find a common denominator (12): 1/4 = 3/12 and 1/6 = 2/12. 3/12 + 2/12 = 5/12.',
    distinguishes: ['M1_ADD_NUM_DEN', 'M5_COMMON_UNIT'],
    isTransfer: true,
    evidenceRules: [
      {
        match: (ans) => ans.includes('2/10') || ans.includes('1/5'),
        label: 'Transfer test failed: added tops and bottoms (1+1)/(4+6) = 2/10',
        supports: [
          { id: 'M1_ADD_NUM_DEN', weight: 0.95 }
        ],
        weakens: [
          { id: 'NONE', weight: 0.95 }
        ]
      },
      {
        match: (ans) => ans.includes('5/12') || ans.includes('10/24') || ans.includes('five twelfths'),
        label: 'Transfer test passed: correctly converted to 12ths and added: 5/12',
        isCorrect: true,
        supports: [
          { id: 'NONE', weight: 0.95 }
        ],
        weakens: [
          { id: 'M1_ADD_NUM_DEN', weight: 0.95 },
          { id: 'M5_COMMON_UNIT', weight: 0.90 }
        ]
      }
    ]
  },
  {
    id: 'Q_TRANSFER_COMPARE_2_5_3_10',
    code: 'TRANSFER_COMPARE',
    concept: 'comparing_fractions',
    prompt: 'Transfer challenge: Which is larger: 2/5 or 3/10? Explain using common denominators.',
    displayMath: '2/5  vs  3/10',
    type: 'multiple_choice',
    options: [
      { id: 'opt_a', text: '2/5 is larger (because 2/5 = 4/10, which is larger than 3/10)' },
      { id: 'opt_b', text: '3/10 is larger (because 3 > 2 and 10 > 5)' },
      { id: 'opt_c', text: 'They are equal' }
    ],
    expectedAnswer: 'opt_a',
    acceptableAnswers: ['opt_a', '2/5', '2/5 is larger'],
    explanation: 'Converting 2/5 into tenths gives 4/10. Comparing 4/10 with 3/10 shows 2/5 is larger.',
    distinguishes: ['M2_DENOMINATOR_SIZE', 'M1_ADD_NUM_DEN'],
    isTransfer: true,
    evidenceRules: [
      {
        match: (ans) => ans.includes('opt_a') || ans.includes('2/5 is larger') || ans.includes('4/10'),
        label: 'Transfer test passed: converted to tenths and correctly compared',
        isCorrect: true,
        supports: [
          { id: 'NONE', weight: 0.95 }
        ],
        weakens: [
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.95 }
        ]
      },
      {
        match: (ans) => ans.includes('opt_b') || ans.includes('3/10 is larger') || ans.includes('10 > 5'),
        label: 'Transfer test failed: claimed 3/10 is larger due to whole-number bias',
        supports: [
          { id: 'M2_DENOMINATOR_SIZE', weight: 0.90 },
          { id: 'M4_WHOLE_NUMBER_BIAS', weight: 0.70 }
        ],
        weakens: [
          { id: 'NONE', weight: 0.90 }
        ]
      }
    ]
  }
];

export function getQuestionById(id: string): DiagnosticQuestion | undefined {
  return QUESTION_BANK.find((q) => q.id === id);
}

export function getInitialQuestion(): DiagnosticQuestion {
  return QUESTION_BANK[0];
}

export function getTransferQuestions(): DiagnosticQuestion[] {
  return QUESTION_BANK.filter((q) => q.isTransfer);
}
