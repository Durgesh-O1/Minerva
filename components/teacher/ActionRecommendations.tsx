'use client';

import { Sparkles, ArrowRight, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface Recommendation {
  id: string;
  priority: string;
  tag: string;
  title: string;
  detail: string;
  actionLabel: string;
  targetConcept?: string;
  targetMisconception?: string;
}

interface ActionRecommendationsProps {
  recommendations: Recommendation[];
}

export default function ActionRecommendations({ recommendations }: ActionRecommendationsProps) {
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const toggleAction = (id: string) => {
    setCompletedActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="bg-linear-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-2xl p-6 text-white shadow-lg border border-indigo-800/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-indigo-800/60 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
                Teacher Action Plan
              </span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/20">
                AI Diagnostic Synthesis
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              High-Impact Pedagogical Interventions
            </h2>
          </div>
        </div>
        <p className="text-xs text-indigo-200/70 max-w-xs">
          Targeted interventions derived automatically from class misconception clustering.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {recommendations.map((rec) => {
          const isDone = !!completedActions[rec.id];

          return (
            <div 
              key={rec.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isDone 
                  ? 'bg-emerald-950/40 border-emerald-500/40 opacity-75' 
                  : 'bg-indigo-950/40 border-indigo-700/50 hover:border-indigo-500/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    rec.priority === 'high' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {rec.tag}
                  </span>
                  {isDone && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Scheduled
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-white leading-snug">
                  {rec.title}
                </h3>
                <p className="text-xs text-indigo-200/80 mt-2 leading-relaxed">
                  {rec.detail}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-800/40">
                <button
                  onClick={() => toggleAction(rec.id)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isDone
                      ? 'bg-emerald-800/50 text-emerald-200 hover:bg-emerald-800/70'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Intervention Scheduled
                    </>
                  ) : (
                    <>
                      <span>{rec.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
