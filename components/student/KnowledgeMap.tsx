'use client';

import { ConceptId, CONCEPTS } from '@/types/database';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, BookOpen } from 'lucide-react';

interface KnowledgeMapProps {
  masteryByConcept: Record<ConceptId, number>;
  onSelectConcept?: (conceptId: string) => void;
}

export default function KnowledgeMap({
  masteryByConcept,
  onSelectConcept,
}: KnowledgeMapProps) {
  const getMasteryBadge = (score: number = 0) => {
    if (score >= 70) {
      return {
        label: 'Mastered',
        scoreText: `${score}%`,
        bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
        textColor: 'text-emerald-700',
      };
    }
    if (score >= 50) {
      return {
        label: 'Needs Practice',
        scoreText: `${score}%`,
        bg: 'bg-amber-50 border-amber-300 text-amber-800',
        dot: 'bg-amber-500',
        icon: AlertTriangle,
        textColor: 'text-amber-700',
      };
    }
    return {
      label: 'Learning Gap',
      scoreText: `${score}%`,
      bg: 'bg-rose-50 border-rose-300 text-rose-800',
      dot: 'bg-rose-500',
      icon: XCircle,
      textColor: 'text-rose-700',
    };
  };

  const trackA: ConceptId[] = [
    'equal_parts',
    'part_of_whole',
    'equivalent_fractions',
    'common_denominators',
    'adding_fractions',
    'comparing_fractions',
  ];

  const trackB: ConceptId[] = [
    'division_basics',
    'fraction_as_division',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>Concept Knowledge Map</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Live Diagnostic
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Prerequisite graph tracking your fraction foundation in real time
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Mastered (&ge;70%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Shaky (50-69%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Gap (&lt;50%)</span>
          </span>
        </div>
      </div>

      {/* Main Track: Fractional Foundations to Operations */}
      <div className="space-y-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Track A: Fractions As Parts of a Whole
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {trackA.map((id, index) => {
              const node = CONCEPTS[id];
              if (!node) return null;
              const score = masteryByConcept[id] || 0;
              const badge = getMasteryBadge(score);
              const Icon = badge.icon;

              return (
                <div
                  key={id}
                  onClick={() => onSelectConcept && onSelectConcept(id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md relative flex flex-col justify-between ${badge.bg}`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Step {index + 1}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${badge.textColor}`} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight mb-1">
                      {node.name}
                    </h3>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold ${badge.textColor}`}>
                      {badge.scoreText} • {badge.label}
                    </span>
                    {index < trackA.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-300 hidden lg:block -mr-4 z-10" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track B: Division Foundations */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Track B: Division Foundations
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md">
            {trackB.map((id, index) => {
              const node = CONCEPTS[id];
              if (!node) return null;
              const score = masteryByConcept[id] || 0;
              const badge = getMasteryBadge(score);
              const Icon = badge.icon;

              return (
                <div
                  key={id}
                  onClick={() => onSelectConcept && onSelectConcept(id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${badge.bg}`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Div {index + 1}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${badge.textColor}`} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight mb-1">
                    {node.name}
                  </h3>
                  <span className={`text-[10px] font-extrabold ${badge.textColor}`}>
                    {badge.scoreText} • {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
