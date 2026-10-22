import fs from 'fs';
import path from 'path';
import { DatabaseSchema, Student, MisconceptionLogEntry } from '../types/database';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const SEEDED_STUDENTS: Student[] = [
  {
    id: 'demo_student',
    name: 'Alex Chen (Demo Student)',
    email: 'alex.chen@school.edu',
    avatar: 'AC',
    isDemoStudent: true,
    lastActive: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    overallMastery: 54,
    masteryByConcept: {
      equal_parts: 75,
      division_basics: 80,
      part_of_whole: 70,
      fraction_as_division: 65,
      equivalent_fractions: 55,
      common_denominators: 40,
      adding_fractions: 38,
      comparing_fractions: 45
    },
    misconceptions: [
      {
        id: 'log_demo_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.92,
        evidence: 'Answered 1/2 + 1/3 = 2/5. Explained: "I added 1+1 on top and 2+3 on the bottom."',
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        problem: 'What is 1/2 + 1/3?',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_demo_2',
        misconception_id: 'M5',
        status: 'suspected',
        confidence: 0.74,
        evidence: 'Struggled to see why slices need to be the same size before counting pieces.',
        timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
        problem: 'Why do we need a common denominator before adding?',
        concept_id: 'common_denominators'
      }
    ],
    revisitQueue: [
      {
        id: 'rev_demo_1',
        misconception_id: 'M2',
        intervalDays: 1,
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // overdue for revisit
        completed: false
      }
    ]
  },
  {
    id: 'student_1',
    name: 'Sophia Martinez',
    email: 'sophia.m@school.edu',
    avatar: 'SM',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    overallMastery: 42,
    masteryByConcept: {
      equal_parts: 60,
      division_basics: 70,
      part_of_whole: 55,
      fraction_as_division: 50,
      equivalent_fractions: 40,
      common_denominators: 30,
      adding_fractions: 25,
      comparing_fractions: 35
    },
    misconceptions: [
      {
        id: 'log_sm_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.95,
        evidence: 'Solved 2/5 + 1/4 = 3/9. Explicitly stated "straight across top and bottom".',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        problem: '2/5 + 1/4',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_sm_2',
        misconception_id: 'M2',
        status: 'confirmed',
        confidence: 0.88,
        evidence: 'Ranked 1/9 as greater than 1/4 because "9 is much higher than 4".',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        problem: 'Which is bigger: 1/4 or 1/9?',
        concept_id: 'comparing_fractions'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_2',
    name: 'Liam Johnson',
    email: 'liam.j@school.edu',
    avatar: 'LJ',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    overallMastery: 78,
    masteryByConcept: {
      equal_parts: 90,
      division_basics: 95,
      part_of_whole: 88,
      fraction_as_division: 85,
      equivalent_fractions: 80,
      common_denominators: 75,
      adding_fractions: 72,
      comparing_fractions: 78
    },
    misconceptions: [
      {
        id: 'log_lj_1',
        misconception_id: 'M1',
        status: 'resolved',
        confidence: 0.91,
        evidence: 'Originally added numerators and denominators, but corrected after fraction bar visual probe.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        problem: '1/3 + 1/6',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_lj_2',
        misconception_id: 'careless_slip',
        status: 'resolved',
        confidence: 0.85,
        evidence: 'Multiplied denominator incorrectly (3*4=11), caught immediately upon self-review.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        problem: 'Common denominator for 1/3 and 1/4',
        concept_id: 'common_denominators'
      }
    ],
    revisitQueue: [
      {
        id: 'rev_lj_1',
        misconception_id: 'M1',
        intervalDays: 3,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        completed: false
      }
    ]
  },
  {
    id: 'student_3',
    name: 'Emma Patel',
    email: 'emma.p@school.edu',
    avatar: 'EP',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    overallMastery: 38,
    masteryByConcept: {
      equal_parts: 55,
      division_basics: 60,
      part_of_whole: 48,
      fraction_as_division: 45,
      equivalent_fractions: 35,
      common_denominators: 25,
      adding_fractions: 20,
      comparing_fractions: 30
    },
    misconceptions: [
      {
        id: 'log_ep_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.96,
        evidence: 'Wrote 3/8 + 2/5 = 5/13 without finding common denominator.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        problem: '3/8 + 2/5',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_ep_2',
        misconception_id: 'M5',
        status: 'confirmed',
        confidence: 0.9,
        evidence: 'Claimed "pieces are just pieces, why does size matter as long as we count how many we have?".',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        problem: 'Combine 1 fourth-slice and 1 eighth-slice',
        concept_id: 'common_denominators'
      },
      {
        id: 'log_ep_3',
        misconception_id: 'M4',
        status: 'suspected',
        confidence: 0.76,
        evidence: 'Treated numerator 3 and denominator 8 as two separate puzzle numbers.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        problem: 'Represent 3/8 on a scale',
        concept_id: 'part_of_whole'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_4',
    name: 'Noah Williams',
    email: 'noah.w@school.edu',
    avatar: 'NW',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    overallMastery: 65,
    masteryByConcept: {
      equal_parts: 85,
      division_basics: 85,
      part_of_whole: 80,
      fraction_as_division: 75,
      equivalent_fractions: 68,
      common_denominators: 60,
      adding_fractions: 58,
      comparing_fractions: 52
    },
    misconceptions: [
      {
        id: 'log_nw_1',
        misconception_id: 'M2',
        status: 'confirmed',
        confidence: 0.89,
        evidence: 'Decided 1/12 > 1/6 because "12 beats 6 every time".',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 19).toISOString(),
        problem: 'Compare 1/12 and 1/6',
        concept_id: 'comparing_fractions'
      },
      {
        id: 'log_nw_2',
        misconception_id: 'M1',
        status: 'resolved',
        confidence: 0.82,
        evidence: 'Recognized 1/4 + 1/4 cannot equal 2/8 (which is still 1/4). Corrected to 2/4.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
        problem: '1/4 + 1/4',
        concept_id: 'adding_fractions'
      }
    ],
    revisitQueue: [
      {
        id: 'rev_nw_1',
        misconception_id: 'M1',
        intervalDays: 7,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        completed: false
      }
    ]
  },
  {
    id: 'student_5',
    name: 'Olivia Brown',
    email: 'olivia.b@school.edu',
    avatar: 'OB',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    overallMastery: 48,
    masteryByConcept: {
      equal_parts: 70,
      division_basics: 72,
      part_of_whole: 65,
      fraction_as_division: 60,
      equivalent_fractions: 45,
      common_denominators: 35,
      adding_fractions: 32,
      comparing_fractions: 40
    },
    misconceptions: [
      {
        id: 'log_ob_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.94,
        evidence: 'Computed 2/3 + 1/2 = 3/5.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
        problem: '2/3 + 1/2',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_ob_2',
        misconception_id: 'M3',
        status: 'confirmed',
        confidence: 0.84,
        evidence: 'Argued that 3/5 and 3/8 are the exact same value since "both have 3 on top".',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
        problem: 'Compare 3/5 and 3/8',
        concept_id: 'comparing_fractions'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_6',
    name: 'Lucas Davis',
    email: 'lucas.d@school.edu',
    avatar: 'LD',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    overallMastery: 58,
    masteryByConcept: {
      equal_parts: 80,
      division_basics: 82,
      part_of_whole: 75,
      fraction_as_division: 70,
      equivalent_fractions: 62,
      common_denominators: 50,
      adding_fractions: 48,
      comparing_fractions: 52
    },
    misconceptions: [
      {
        id: 'log_ld_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.88,
        evidence: 'Answered 1/5 + 2/3 = 3/8.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        problem: '1/5 + 2/3',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_ld_2',
        misconception_id: 'M5',
        status: 'suspected',
        confidence: 0.72,
        evidence: 'Did not understand why 1/5 and 2/3 need to be partitioned into fifteenths.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        problem: 'Explain partitioning',
        concept_id: 'common_denominators'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_7',
    name: 'Mia Garcia',
    email: 'mia.g@school.edu',
    avatar: 'MG',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    overallMastery: 84,
    masteryByConcept: {
      equal_parts: 95,
      division_basics: 95,
      part_of_whole: 92,
      fraction_as_division: 90,
      equivalent_fractions: 88,
      common_denominators: 82,
      adding_fractions: 80,
      comparing_fractions: 85
    },
    misconceptions: [
      {
        id: 'log_mg_1',
        misconception_id: 'careless_slip',
        status: 'resolved',
        confidence: 0.89,
        evidence: 'Missed reducing 6/12 to 1/2.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 38).toISOString(),
        problem: 'Simplify 6/12',
        concept_id: 'equivalent_fractions'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_8',
    name: 'Ethan Miller',
    email: 'ethan.m@school.edu',
    avatar: 'EM',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    overallMastery: 50,
    masteryByConcept: {
      equal_parts: 75,
      division_basics: 75,
      part_of_whole: 68,
      fraction_as_division: 62,
      equivalent_fractions: 50,
      common_denominators: 38,
      adding_fractions: 35,
      comparing_fractions: 45
    },
    misconceptions: [
      {
        id: 'log_em_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.93,
        evidence: 'Added 1/7 + 2/3 = 3/10.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        problem: '1/7 + 2/3',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_em_2',
        misconception_id: 'M2',
        status: 'confirmed',
        confidence: 0.85,
        evidence: 'Selected 1/10 as bigger than 1/2.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        problem: 'Which slice would you rather have: 1/2 of cake or 1/10?',
        concept_id: 'comparing_fractions'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_9',
    name: 'Ava Wilson',
    email: 'ava.w@school.edu',
    avatar: 'AW',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    overallMastery: 35,
    masteryByConcept: {
      equal_parts: 50,
      division_basics: 55,
      part_of_whole: 45,
      fraction_as_division: 40,
      equivalent_fractions: 30,
      common_denominators: 20,
      adding_fractions: 18,
      comparing_fractions: 25
    },
    misconceptions: [
      {
        id: 'log_aw_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.97,
        evidence: 'Repeatedly adds across: 1/4 + 1/2 = 2/6 = 1/3.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
        problem: '1/4 + 1/2',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_aw_2',
        misconception_id: 'M4',
        status: 'confirmed',
        confidence: 0.91,
        evidence: 'Insists "top is one math problem, bottom is another math problem".',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
        problem: 'What does 3/4 mean?',
        concept_id: 'part_of_whole'
      },
      {
        id: 'log_aw_3',
        misconception_id: 'M5',
        status: 'confirmed',
        confidence: 0.88,
        evidence: 'Unable to explain why 1/2 cup and 1/3 cup cannot simply be called 2 halves or 2 fifths.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        problem: 'Measuring cups scenario',
        concept_id: 'common_denominators'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_10',
    name: 'James Anderson',
    email: 'james.a@school.edu',
    avatar: 'JA',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    overallMastery: 72,
    masteryByConcept: {
      equal_parts: 90,
      division_basics: 88,
      part_of_whole: 85,
      fraction_as_division: 80,
      equivalent_fractions: 75,
      common_denominators: 68,
      adding_fractions: 65,
      comparing_fractions: 70
    },
    misconceptions: [
      {
        id: 'log_ja_1',
        misconception_id: 'M1',
        status: 'resolved',
        confidence: 0.86,
        evidence: 'Fixed initial numerator/denominator addition after Socratic probe with 1/2 + 1/2.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 45).toISOString(),
        problem: '1/2 + 1/2',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_ja_2',
        misconception_id: 'M2',
        status: 'resolved',
        confidence: 0.89,
        evidence: 'Demonstrated mastery by accurately drawing 1/3 vs 1/8 on fraction bar.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        problem: 'Compare 1/3 and 1/8',
        concept_id: 'comparing_fractions'
      }
    ],
    revisitQueue: [
      {
        id: 'rev_ja_1',
        misconception_id: 'M1',
        intervalDays: 3,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
        completed: false
      }
    ]
  },
  {
    id: 'student_11',
    name: 'Isabella Taylor',
    email: 'isabella.t@school.edu',
    avatar: 'IT',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    overallMastery: 61,
    masteryByConcept: {
      equal_parts: 82,
      division_basics: 85,
      part_of_whole: 78,
      fraction_as_division: 75,
      equivalent_fractions: 65,
      common_denominators: 55,
      adding_fractions: 50,
      comparing_fractions: 58
    },
    misconceptions: [
      {
        id: 'log_it_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.91,
        evidence: 'Added 3/7 + 1/2 = 4/9.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        problem: '3/7 + 1/2',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_it_2',
        misconception_id: 'M5',
        status: 'confirmed',
        confidence: 0.82,
        evidence: 'Ignored denominator conversion requirement.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        problem: 'Why find common denominators?',
        concept_id: 'common_denominators'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_12',
    name: 'Benjamin Thomas',
    email: 'benjamin.t@school.edu',
    avatar: 'BT',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    overallMastery: 53,
    masteryByConcept: {
      equal_parts: 75,
      division_basics: 78,
      part_of_whole: 70,
      fraction_as_division: 65,
      equivalent_fractions: 52,
      common_denominators: 42,
      adding_fractions: 40,
      comparing_fractions: 46
    },
    misconceptions: [
      {
        id: 'log_bt_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.89,
        evidence: 'Answered 2/3 + 3/4 = 5/7.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 17).toISOString(),
        problem: '2/3 + 3/4',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_bt_2',
        misconception_id: 'M3',
        status: 'confirmed',
        confidence: 0.87,
        evidence: 'Claimed 4/5 equals 4/9 since both share numerator 4.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
        problem: 'Compare 4/5 and 4/9',
        concept_id: 'comparing_fractions'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_13',
    name: 'Charlotte Jackson',
    email: 'charlotte.j@school.edu',
    avatar: 'CJ',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString(),
    overallMastery: 79,
    masteryByConcept: {
      equal_parts: 92,
      division_basics: 90,
      part_of_whole: 88,
      fraction_as_division: 85,
      equivalent_fractions: 82,
      common_denominators: 76,
      adding_fractions: 74,
      comparing_fractions: 78
    },
    misconceptions: [
      {
        id: 'log_cj_1',
        misconception_id: 'M2',
        status: 'resolved',
        confidence: 0.88,
        evidence: 'Overcame denominator confusion using circle slice models.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
        problem: 'Compare 1/5 and 1/15',
        concept_id: 'comparing_fractions'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_14',
    name: 'Henry White',
    email: 'henry.w@school.edu',
    avatar: 'HW',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    overallMastery: 45,
    masteryByConcept: {
      equal_parts: 65,
      division_basics: 70,
      part_of_whole: 60,
      fraction_as_division: 55,
      equivalent_fractions: 42,
      common_denominators: 32,
      adding_fractions: 30,
      comparing_fractions: 38
    },
    misconceptions: [
      {
        id: 'log_hw_1',
        misconception_id: 'M1',
        status: 'confirmed',
        confidence: 0.94,
        evidence: 'Added 5/6 + 1/3 = 6/9.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
        problem: '5/6 + 1/3',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_hw_2',
        misconception_id: 'M2',
        status: 'confirmed',
        confidence: 0.86,
        evidence: 'Assumed 1/16 is larger than 1/4.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
        problem: 'Compare 1/16 and 1/4',
        concept_id: 'comparing_fractions'
      },
      {
        id: 'log_hw_3',
        misconception_id: 'M5',
        status: 'suspected',
        confidence: 0.78,
        evidence: 'Skipped finding LCD before performing addition.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
        problem: 'Find LCD for 6 and 3',
        concept_id: 'common_denominators'
      }
    ],
    revisitQueue: []
  },
  {
    id: 'student_15',
    name: 'Harper Harris',
    email: 'harper.h@school.edu',
    avatar: 'HH',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    overallMastery: 67,
    masteryByConcept: {
      equal_parts: 88,
      division_basics: 90,
      part_of_whole: 82,
      fraction_as_division: 80,
      equivalent_fractions: 72,
      common_denominators: 62,
      adding_fractions: 60,
      comparing_fractions: 64
    },
    misconceptions: [
      {
        id: 'log_hh_1',
        misconception_id: 'M1',
        status: 'resolved',
        confidence: 0.85,
        evidence: 'Understands common denominators now after completing Socratic prompt.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(),
        problem: '2/5 + 1/10',
        concept_id: 'adding_fractions'
      },
      {
        id: 'log_hh_2',
        misconception_id: 'M3',
        status: 'confirmed',
        confidence: 0.81,
        evidence: 'Hesitated when comparing 5/6 and 5/9, initially thought they might be identical portions.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        problem: 'Compare 5/6 and 5/9',
        concept_id: 'comparing_fractions'
      }
    ],
    revisitQueue: [
      {
        id: 'rev_hh_1',
        misconception_id: 'M1',
        intervalDays: 1,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
        completed: false
      }
    ]
  }
];

export function runSeed(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db: DatabaseSchema = {
    clockOffsetDays: 0,
    lastUpdated: new Date().toISOString(),
    students: SEEDED_STUDENTS
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`✅ Seed complete! Successfully wrote ${SEEDED_STUDENTS.length} students to data/db.json`);
}

// Only auto-run if executed directly
if (process.argv[1]?.includes('seed')) {
  runSeed();
}

