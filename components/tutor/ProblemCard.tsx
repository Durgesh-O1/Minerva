'use client';

import { BookOpen, HelpCircle } from 'lucide-react';

interface ProblemCardProps {
  currentProblemIndex: number;
  onSelectProblem: (index: number) => void;
}

export const PROBLEMS = [
  {
    id: 'prob_1',
    title: 'Adding Fractions with Unlike Denominators',
    question: 'What is 1/2 + 1/3?',
    displayMath: '1/2 + 1/3 = ?',
    targetMisconception: 'M1 (Adding numerators and denominators across)',
    difficulty: 'Foundational',
    seedInput: '2/5',
  },
  {
    id: 'prob_2',
    title: 'Comparing Fractions with Unit Numerators',
    question: 'Which fraction is larger: 1/8 or 1/3?',
    displayMath: '1/8  vs  1/3',
    targetMisconception: 'M2 (Thinking bigger denominator means bigger size)',
    difficulty: 'Core',
    seedInput: '1/8 is bigger because 8 is larger than 3',
  },
  {
    id: 'prob_3',
    title: 'Equal Numerator Assessment',
    question: 'Is 2/5 equal to 2/7? Explain your reasoning.',
    displayMath: '2/5  ==  2/7 ?',
    targetMisconception: 'M3 (Thinking same numerator means fractions are equal)',
    difficulty: 'Conceptual',
    seedInput: 'Yes they are equal because both have 2 parts',
  }
];

export default function ProblemCard({ currentProblemIndex, onSelectProblem }: ProblemCardProps) {
  const problem = PROBLEMS[currentProblemIndex] || PROBLEMS[0];

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xs transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(34,34,59,0.08)]">
        <div className="flex items-center gap-3">
          <div className="glass-icon glass-icon-indigo w-10 h-10 rounded-xl">
            <BookOpen className="w-5 h-5 text-[#22223B]" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A4E69]">
              Demo Problem #{currentProblemIndex + 1}
            </span>
            <h2 className="text-base font-black text-[#22223B] tracking-tight">{problem.title}</h2>
          </div>
        </div>

        {/* Quick problem switcher tabs for hackathon demo */}
        <div className="flex items-center gap-1.5 bg-[rgba(201,173,167,0.22)] p-1 rounded-xl border border-white/60 backdrop-blur-md self-start sm:self-auto">
          {PROBLEMS.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => onSelectProblem(idx)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentProblemIndex === idx
                  ? 'bg-white/90 text-[#22223B] shadow-xs border border-white/80'
                  : 'text-[#4A4E69] hover:text-[#22223B] hover:bg-white/40'
              }`}
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main math challenge display */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel-subtle p-4 rounded-xl border border-white/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(154,140,152,0.2)] text-[#22223B] border border-white/70 backdrop-blur-xs">
              Target Question
            </span>
            <span className="text-xs text-[#4A4E69] font-medium">Topic: Adding & Comparing Fractions</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#22223B] tracking-tight font-mono">
            {problem.displayMath}
          </p>
          <p className="text-xs text-[#4A4E69] font-medium flex items-center gap-1.5 pt-1">
            <HelpCircle className="w-3.5 h-3.5 text-[#4A4E69]" />
            <span>{problem.question}</span>
          </p>
        </div>

        <div className="shrink-0 bg-white/75 backdrop-blur-xs p-3 rounded-xl border border-white/80 text-right shadow-2xs">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4A4E69]">
            Probe Target
          </span>
          <span className="text-xs font-black text-[#22223B]">
            {problem.targetMisconception}
          </span>
        </div>
      </div>
    </div>
  );
}
