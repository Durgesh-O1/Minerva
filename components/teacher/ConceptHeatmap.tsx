'use client';

import { ConceptId } from '@/types/database';
import { Layers, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ConceptStat {
  id: ConceptId;
  name: string;
  category: 'foundations' | 'operations' | 'comparisons';
  prerequisites: ConceptId[];
  avgMastery: number;
  below60Count: number;
  above80Count: number;
  status: 'critical' | 'warning' | 'good';
}

interface ConceptHeatmapProps {
  concepts: ConceptStat[];
  totalStudents: number;
  onSelectConcept?: (conceptId: ConceptId) => void;
}

export default function ConceptHeatmap({ concepts, totalStudents }: ConceptHeatmapProps) {
  const foundations = concepts.filter(c => c.category === 'foundations');
  const operations = concepts.filter(c => c.category === 'operations');
  const comparisons = concepts.filter(c => c.category === 'comparisons');

  const getBadgeStyle = (status: 'critical' | 'warning' | 'good') => {
    switch (status) {
      case 'critical':
        return 'bg-rose-50 border-rose-200 text-rose-800 ring-rose-500/20';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800 ring-amber-500/20';
      case 'good':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800 ring-emerald-500/20';
    }
  };

  const getMeterColor = (mastery: number) => {
    if (mastery >= 70) return 'bg-emerald-500';
    if (mastery >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Prerequisite Flow
            </span>
            <span className="text-xs text-slate-500">Knowledge Map & Heatmap</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Class Concept Mastery Heatmap
          </h2>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Strong (≥70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600">Shaky (50-69%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-600">Learning Gap (&lt;50%)</span>
          </div>
        </div>
      </div>

      {/* Prerequisite Hierarchy Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Foundations Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              1. Foundations
            </h3>
            <span className="text-[11px] text-slate-400">Prerequisites</span>
          </div>
          <div className="space-y-2.5">
            {foundations.map(concept => (
              <div
                key={concept.id}
                className={`p-3.5 rounded-xl border transition-all ${getBadgeStyle(concept.status)}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900">{concept.name}</h4>
                  <span className="text-xs font-extrabold">{concept.avgMastery}%</span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${getMeterColor(concept.avgMastery)}`}
                    style={{ width: `${concept.avgMastery}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{concept.below60Count} need support</span>
                  <span>{concept.above80Count} mastered</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operations Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
              2. Core Operations
            </h3>
            <span className="text-[11px] text-rose-500 font-semibold flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              Critical Bottleneck
            </span>
          </div>
          <div className="space-y-2.5">
            {operations.map(concept => (
              <div
                key={concept.id}
                className={`p-3.5 rounded-xl border transition-all ${getBadgeStyle(concept.status)}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900">{concept.name}</h4>
                  <span className="text-xs font-extrabold">{concept.avgMastery}%</span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${getMeterColor(concept.avgMastery)}`}
                    style={{ width: `${concept.avgMastery}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span className={concept.status === 'critical' ? 'text-rose-700 font-semibold' : ''}>
                    {concept.below60Count} below 60%
                  </span>
                  <span>{concept.above80Count} mastered</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparisons Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
              3. Comparisons & Application
            </h3>
            <span className="text-[11px] text-slate-400">Target Goals</span>
          </div>
          <div className="space-y-2.5">
            {comparisons.map(concept => (
              <div
                key={concept.id}
                className={`p-3.5 rounded-xl border transition-all ${getBadgeStyle(concept.status)}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900">{concept.name}</h4>
                  <span className="text-xs font-extrabold">{concept.avgMastery}%</span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${getMeterColor(concept.avgMastery)}`}
                    style={{ width: `${concept.avgMastery}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{concept.below60Count} need support</span>
                  <span>{concept.above80Count} mastered</span>
                </div>
              </div>
            ))}

            {/* Diagnostic Observation Box */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mt-3">
              <p className="font-semibold text-slate-800">🔍 Curriculum Gap Insight:</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Students fail <strong>Adding Fractions</strong> primarily because <strong>Common Denominators</strong> is at 46% mastery. Reteaching the prerequisite resolves the downstream failure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
