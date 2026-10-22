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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </span>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Demo Problem #{currentProblemIndex + 1}
            </span>
            <h2 className="text-base font-bold text-slate-900">{problem.title}</h2>
          </div>
        </div>

        {/* Quick problem switcher tabs for hackathon demo */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          {PROBLEMS.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => onSelectProblem(idx)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                currentProblemIndex === idx
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main math challenge display */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-indigo-50/60 via-slate-50 to-white p-4 rounded-xl border border-indigo-100/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              Target Question
            </span>
            <span className="text-xs text-slate-500 font-medium">Topic: Adding & Comparing Fractions</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
            {problem.displayMath}
          </p>
          <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>{problem.question}</span>
          </p>
        </div>

        <div className="shrink-0 bg-white p-3 rounded-lg border border-slate-200 text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Probe Target
          </span>
          <span className="text-xs font-bold text-slate-800">
            {problem.targetMisconception}
          </span>
        </div>
      </div>
    </div>
  );
}
