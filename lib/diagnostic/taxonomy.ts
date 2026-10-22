/**
 * Taxonomy of Fraction Misconceptions for Minerva Diagnostic Engine
 * 
 * Defines canonical stable IDs, diagnostic indicators, cognitive conflict probes,
 * and bidirectional mappings to legacy platform IDs for full backwards compatibility.
 */

export type CanonicalMisconceptionId =
  | 'M1_ADD_NUM_DEN'       // Adds numerators and denominators directly (1/2 + 1/3 = 2/5)
  | 'M2_DENOMINATOR_SIZE'   // Believes bigger denominator means bigger fraction (1/8 > 1/3)
  | 'M3_EQUAL_NUMERATOR'    // Assumes equal numerators mean equal fractions regardless of denominators (2/5 = 2/7)
  | 'M4_WHOLE_NUMBER_BIAS'  // Treats numerator and denominator as isolated whole numbers rather than a single ratio
  | 'M5_COMMON_UNIT'        // Fails to see why equal-sized units (common denominators) are required before adding
  | 'CAREFUL_SLIP'          // Isolated arithmetic, input, or transcription error with no conceptual breakdown
  | 'UNDETERMINED'          // Insufficient or conflicting evidence to support a firm diagnosis
  | 'NONE';                 // Verified correct understanding

export type LegacyMisconceptionId =
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'careless_slip'
  | 'none'
  | 'unknown';

export type DiagnosticStatus =
  | 'investigating'   // Initial hypothesis formulated, gathering evidence
  | 'probable'        // Moderate supporting evidence (1 strong indicator)
  | 'confirmed'       // High confidence, 2+ independent consistent pieces of evidence
  | 'undetermined'    // Question budget exhausted or ambiguous/conflicting data
  | 'resolved';       // Remediated and verified through independent transfer question

export interface MisconceptionDefinition {
  id: CanonicalMisconceptionId;
  legacyId: LegacyMisconceptionId;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  canonicalExample: string;
  absurdProbe: string;
  remedyHint: string;
  primaryConcept: string;
  relatedConcepts: string[];
}

export const TAXONOMY: Record<CanonicalMisconceptionId, MisconceptionDefinition> = {
  M1_ADD_NUM_DEN: {
    id: 'M1_ADD_NUM_DEN',
    legacyId: 'M1',
    name: 'Adds numerators and denominators directly',
    shortDescription: 'Treats addition across both top and bottom (a/b + c/d = (a+c)/(b+d)).',
    detailedDescription: 'The student applies whole-number addition independently to numerators and denominators, failing to recognize that the denominator defines the unit partition size.',
    canonicalExample: '1/2 + 1/3 = 2/5',
    absurdProbe: 'Is 2/5 bigger or smaller than 1/2? If you add a positive fraction to 1/2, can you end up with less than what you started with?',
    remedyHint: 'Fractions represent counts of equal-sized pieces. Denominators name the size; you cannot add piece counts until the piece sizes match.',
    primaryConcept: 'adding_fractions',
    relatedConcepts: ['common_denominators', 'equivalent_fractions', 'part_of_whole']
  },
  M2_DENOMINATOR_SIZE: {
    id: 'M2_DENOMINATOR_SIZE',
    legacyId: 'M2',
    name: 'Bigger denominator means bigger fraction',
    shortDescription: 'Believes larger numerical denominator implies a larger fraction value.',
    detailedDescription: 'The student transfers whole-number ordering directly to denominators (8 > 3 => 1/8 > 1/3), ignoring the inverse relationship between cut count and portion size.',
    canonicalExample: '1/8 > 1/3',
    absurdProbe: 'If a cake is cut into 8 slices versus 3 slices, which single slice gives you more cake to eat?',
    remedyHint: 'The denominator shows how many pieces the whole was cut into. More pieces mean each piece is smaller.',
    primaryConcept: 'comparing_fractions',
    relatedConcepts: ['part_of_whole', 'equal_parts', 'fraction_as_division']
  },
  M3_EQUAL_NUMERATOR: {
    id: 'M3_EQUAL_NUMERATOR',
    legacyId: 'M3',
    name: 'Equal numerators mean equal fractions',
    shortDescription: 'Assumes fractions with identical numerators are equal regardless of denominator.',
    detailedDescription: 'The student focuses solely on the numerator count (e.g., both have 2 parts) while remaining blind to the differing unit scale defined by denominators (e.g., 2/5 = 2/7).',
    canonicalExample: '2/5 = 2/7',
    absurdProbe: 'Are 2 giant watermelon slices the same amount of food as 2 tiny apple seeds? Both are "2 pieces"!',
    remedyHint: 'The numerator counts the parts, but the denominator defines how large those parts are.',
    primaryConcept: 'comparing_fractions',
    relatedConcepts: ['part_of_whole', 'common_denominators']
  },
  M4_WHOLE_NUMBER_BIAS: {
    id: 'M4_WHOLE_NUMBER_BIAS',
    legacyId: 'M4',
    name: 'Treats numerator and denominator as separate whole numbers',
    shortDescription: 'Fails to see the fraction as a unified single quantity on the number line.',
    detailedDescription: 'The student views 3/4 not as a single measurement or ratio (0.75), but as two detached integers (3 and 4) placed vertically.',
    canonicalExample: 'Viewing 3/4 as just isolated numbers 3 and 4',
    absurdProbe: 'What is 4/4? Is it two separate whole numbers, or exactly 1 whole item?',
    remedyHint: 'A fraction is a single unified number representing a location on the number line.',
    primaryConcept: 'fraction_as_division',
    relatedConcepts: ['part_of_whole', 'division_basics']
  },
  M5_COMMON_UNIT: {
    id: 'M5_COMMON_UNIT',
    legacyId: 'M5',
    name: 'Ignores requirement for equal-sized units before adding',
    shortDescription: 'Does not grasp why common unit partitions are mandatory before adding fractions.',
    detailedDescription: 'Unlike pure M1, the student may know they cannot just add bottoms, but does not understand why finding a common denominator works or why identical slice size is required.',
    canonicalExample: 'Adding 1 half-inch and 1 quarter-inch to get 2 pieces without standardizing units',
    absurdProbe: 'If you have 1 dollar bill and 1 dime, do you have 2 dollars? What common unit do you need?',
    remedyHint: 'You must convert all pieces into the exact same unit size before you can combine their counts.',
    primaryConcept: 'common_denominators',
    relatedConcepts: ['equivalent_fractions', 'equal_parts', 'adding_fractions']
  },
  CAREFUL_SLIP: {
    id: 'CAREFUL_SLIP',
    legacyId: 'careless_slip',
    name: 'Careless Arithmetic Slip',
    shortDescription: 'Isolated calculation or transcription error without systematic conceptual misunderstanding.',
    detailedDescription: 'The student understands the conceptual steps (e.g. correctly converted to sixths: 3/6 + 2/6) but made a minor basic addition error (e.g. 3+2=6 instead of 5).',
    canonicalExample: '3/6 + 2/6 = 6/6 (basic 3+2 typo)',
    absurdProbe: 'Let us check simple arithmetic: what is 3 + 2?',
    remedyHint: 'Double check simple addition calculations.',
    primaryConcept: 'adding_fractions',
    relatedConcepts: []
  },
  UNDETERMINED: {
    id: 'UNDETERMINED',
    legacyId: 'unknown',
    name: 'Undetermined / Inconclusive Evidence',
    shortDescription: 'Insufficient or conflicting data; abstains from premature classification.',
    detailedDescription: 'The student responses do not clearly distinguish between competing hypotheses or responses are ambiguous. The engine abstains rather than guessing.',
    canonicalExample: 'Ambiguous or unclassifiable response',
    absurdProbe: 'Could you walk me through your thinking step-by-step?',
    remedyHint: 'Gather further discriminating evidence.',
    primaryConcept: 'adding_fractions',
    relatedConcepts: []
  },
  NONE: {
    id: 'NONE',
    legacyId: 'none',
    name: 'No Conceptual Misconception',
    shortDescription: 'Demonstrated sound conceptual understanding and correct reasoning.',
    detailedDescription: 'The student correctly applies fractional equivalence and unit matching.',
    canonicalExample: '1/2 + 1/3 = 3/6 + 2/6 = 5/6',
    absurdProbe: '',
    remedyHint: '',
    primaryConcept: 'adding_fractions',
    relatedConcepts: []
  }
};

/**
 * Mapping helper functions between canonical and legacy platform IDs
 */
export function toCanonicalId(id: string): CanonicalMisconceptionId {
  switch (id) {
    case 'M1':
    case 'M1_ADD_NUM_DEN':
      return 'M1_ADD_NUM_DEN';
    case 'M2':
    case 'M2_DENOMINATOR_SIZE':
      return 'M2_DENOMINATOR_SIZE';
    case 'M3':
    case 'M3_EQUAL_NUMERATOR':
      return 'M3_EQUAL_NUMERATOR';
    case 'M4':
    case 'M4_WHOLE_NUMBER_BIAS':
      return 'M4_WHOLE_NUMBER_BIAS';
    case 'M5':
    case 'M5_COMMON_UNIT':
      return 'M5_COMMON_UNIT';
    case 'careless_slip':
    case 'CAREFUL_SLIP':
      return 'CAREFUL_SLIP';
    case 'none':
    case 'NONE':
      return 'NONE';
    case 'unknown':
    case 'UNDETERMINED':
    default:
      return 'UNDETERMINED';
  }
}

export function toLegacyId(id: CanonicalMisconceptionId | string): LegacyMisconceptionId {
  switch (id) {
    case 'M1_ADD_NUM_DEN':
    case 'M1':
      return 'M1';
    case 'M2_DENOMINATOR_SIZE':
    case 'M2':
      return 'M2';
    case 'M3_EQUAL_NUMERATOR':
    case 'M3':
      return 'M3';
    case 'M4_WHOLE_NUMBER_BIAS':
    case 'M4':
      return 'M4';
    case 'M5_COMMON_UNIT':
    case 'M5':
      return 'M5';
    case 'CAREFUL_SLIP':
    case 'careless_slip':
      return 'careless_slip';
    case 'NONE':
    case 'none':
      return 'none';
    default:
      return 'unknown';
  }
}
