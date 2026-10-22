export type MisconceptionId = 
  | 'M1' 
  | 'M2' 
  | 'M3' 
  | 'M4' 
  | 'M5' 
  | 'careless_slip' 
  | 'none' 
  | 'unknown';

export type MisconceptionStatus = 'suspected' | 'confirmed' | 'resolved';

export interface MisconceptionMeta {
  id: MisconceptionId;
  name: string;
  description: string;
  example: string;
  remedyHint: string;
}

export const MISCONCEPTIONS: Record<string, MisconceptionMeta> = {
  M1: {
    id: 'M1',
    name: 'Adds numerators and denominators separately',
    description: 'Treats fractions like two independent additions (e.g., 1/2 + 1/3 = 2/5).',
    example: '1/2 + 1/3 = 2/5',
    remedyHint: 'Cognitive conflict: 2/5 is smaller than 1/2, yet two positive amounts were combined.'
  },
  M2: {
    id: 'M2',
    name: 'Bigger denominator means bigger fraction',
    description: 'Associates larger whole-number digits with larger fractions (e.g., 1/8 > 1/3).',
    example: '1/8 > 1/3',
    remedyHint: 'Visual pizza cut into 8 slices vs 3 slices; more pieces mean each slice is smaller.'
  },
  M3: {
    id: 'M3',
    name: 'Same numerator means equal fractions',
    description: 'Believes matching numerators make quantities equal, ignoring denominators (e.g., 2/3 = 2/7).',
    example: '2/3 = 2/7',
    remedyHint: 'Compare having 2 giant slices vs 2 tiny crumbs.'
  },
  M4: {
    id: 'M4',
    name: 'Treats numerator and denominator as separate whole numbers',
    description: 'Fails to perceive a fraction as a single unified ratio or quantity.',
    example: 'Looking at 3/4 as just the number 3 and the number 4.',
    remedyHint: 'Place the fraction on a continuous 0 to 1 number line.'
  },
  M5: {
    id: 'M5',
    name: 'Equal parts not needed before adding',
    description: 'Does not see why equal partition sizes are fundamentally required before combining pieces.',
    example: 'Combining half a pizza and a third of a pizza without standardizing slice size.',
    remedyHint: 'Demonstrate combining different sized units (e.g., 1 dollar + 1 dime is not 2 dollars).'
  },
  careless_slip: {
    id: 'careless_slip',
    name: 'Careless slip',
    description: 'Isolated arithmetic or transcription mistake with no underlying conceptual misunderstanding.',
    example: '3 + 2 written as 6 instead of 5.',
    remedyHint: 'Simple self-checking prompt.'
  }
};

export type ConceptId =
  | 'equal_parts'
  | 'part_of_whole'
  | 'equivalent_fractions'
  | 'common_denominators'
  | 'adding_fractions'
  | 'comparing_fractions'
  | 'division_basics'
  | 'fraction_as_division';

export interface ConceptMeta {
  id: ConceptId;
  name: string;
  category: 'foundations' | 'operations' | 'comparisons';
  prerequisites: ConceptId[];
}

export const CONCEPTS: Record<ConceptId, ConceptMeta> = {
  equal_parts: {
    id: 'equal_parts',
    name: 'Equal parts & the whole',
    category: 'foundations',
    prerequisites: []
  },
  division_basics: {
    id: 'division_basics',
    name: 'Division basics',
    category: 'foundations',
    prerequisites: []
  },
  part_of_whole: {
    id: 'part_of_whole',
    name: 'Fraction as part of a whole',
    category: 'foundations',
    prerequisites: ['equal_parts']
  },
  fraction_as_division: {
    id: 'fraction_as_division',
    name: 'Fraction as division',
    category: 'foundations',
    prerequisites: ['division_basics']
  },
  equivalent_fractions: {
    id: 'equivalent_fractions',
    name: 'Equivalent fractions',
    category: 'operations',
    prerequisites: ['part_of_whole']
  },
  common_denominators: {
    id: 'common_denominators',
    name: 'Common denominators',
    category: 'operations',
    prerequisites: ['equivalent_fractions']
  },
  adding_fractions: {
    id: 'adding_fractions',
    name: 'Adding fractions',
    category: 'operations',
    prerequisites: ['common_denominators', 'equal_parts']
  },
  comparing_fractions: {
    id: 'comparing_fractions',
    name: 'Comparing fractions',
    category: 'comparisons',
    prerequisites: ['common_denominators', 'equivalent_fractions']
  }
};

export interface MisconceptionLogEntry {
  id: string;
  misconception_id: MisconceptionId;
  status: MisconceptionStatus;
  confidence: number; // 0 to 1
  evidence: string;
  timestamp: string;
  problem?: string;
  concept_id?: ConceptId;
}

export interface RevisitScheduleItem {
  id: string;
  misconception_id: MisconceptionId;
  intervalDays: 1 | 3 | 7;
  dueDate: string; // ISO date string
  completed: boolean;
  score?: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isDemoStudent?: boolean;
  lastActive: string;
  overallMastery: number; // 0 to 100
  masteryByConcept: Record<ConceptId, number>; // 0 to 100
  misconceptions: MisconceptionLogEntry[];
  revisitQueue: RevisitScheduleItem[];
  notes?: string;
}

export interface DatabaseSchema {
  clockOffsetDays: number;
  lastUpdated: string;
  students: Student[];
}
