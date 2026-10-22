'use client';

import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
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
    <div className="rounded-2xl p-6 text-white shadow-xl border border-white/20 backdrop-blur-xl transition-all duration-300"
         style={{ background: 'rgba(34, 34, 59, 0.94)', boxShadow: '0 12px 40px rgba(34, 34, 59, 0.18)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/15 gap-3">
        <div className="flex items-center gap-3">
          <div className="glass-icon w-9 h-9 rounded-xl bg-white/10 text-white border-white/30">
            <Sparkles className="w-5 h-5 text-[#F2E9E4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#C9ADA7]">
                Teacher Action Plan
              </span>
              <span className="text-[10px] bg-white/15 text-[#F2E9E4] px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-xs font-semibold">
                AI Diagnostic Synthesis
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-white mt-0.5 tracking-tight">
              High-Impact Pedagogical Interventions
            </h2>
          </div>
        </div>
        <p className="text-xs text-[#C9ADA7] max-w-xs font-medium">
          Targeted interventions derived automatically from class misconception clustering.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {recommendations.map((rec) => {
          const isDone = !!completedActions[rec.id];

          return (
            <div 
              key={rec.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between backdrop-blur-md ${
                isDone 
                  ? 'bg-emerald-950/40 border-emerald-500/40 opacity-80' 
                  : 'bg-white/5 border-white/15 hover:border-white/35 hover:bg-white/10'
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

                <h3 className="font-extrabold text-sm text-[#F2E9E4] leading-snug">
                  {rec.title}
                </h3>
                <p className="text-xs text-[#C9ADA7] mt-2 leading-relaxed font-medium">
                  {rec.detail}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/15">
                <button
                  onClick={() => toggleAction(rec.id)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDone
                      ? 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-800/80 border border-emerald-500/40'
                      : 'bg-[#F2E9E4] hover:bg-white text-[#22223B] shadow-sm hover:translate-y-[-1px]'
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
