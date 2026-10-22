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
        return 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.25)] text-[#BE123C]';
      case 'warning':
        return 'bg-[rgba(217,119,6,0.08)] border-[rgba(217,119,6,0.25)] text-[#B45309]';
      case 'good':
        return 'bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.25)] text-[#047857]';
    }
  };

  const getMeterColor = (mastery: number) => {
    if (mastery >= 70) return 'bg-[#10B981]';
    if (mastery >= 50) return 'bg-[#D97706]';
    return 'bg-[#E11D48]';
  };

  return (
    <div className="glass-panel rounded-2xl p-6 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[rgba(34,34,59,0.08)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[rgba(154,140,152,0.18)] text-[#22223B] border border-white/70 backdrop-blur-xs">
              Prerequisite Flow
            </span>
            <span className="text-xs text-[#4A4E69] font-medium">Knowledge Map & Heatmap</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#22223B] tracking-tight mt-1">
            Class Concept Mastery Heatmap
          </h2>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-xs" />
            <span className="text-[#4A4E69]">Strong (≥70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shadow-xs" />
            <span className="text-[#4A4E69]">Shaky (50-69%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shadow-xs" />
            <span className="text-[#4A4E69]">Learning Gap (&lt;50%)</span>
          </div>
        </div>
      </div>

      {/* Prerequisite Hierarchy Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Foundations Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#22223B] flex items-center gap-2">
              <span className="glass-icon glass-icon-indigo w-6 h-6 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-[#22223B]" />
              </span>
              1. Foundations
            </h3>
            <span className="text-[11px] text-[#4A4E69] font-medium">Prerequisites</span>
          </div>
          <div className="space-y-2.5">
            {foundations.map(concept => (
              <div
                key={concept.id}
                className={`p-3.5 rounded-xl border backdrop-blur-sm transition-all hover:translate-y-[-1px] ${getBadgeStyle(concept.status)}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-[#22223B]">{concept.name}</h4>
                  <span className="text-xs font-black">{concept.avgMastery}%</span>
                </div>
                <div className="w-full bg-[rgba(34,34,59,0.08)] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${getMeterColor(concept.avgMastery)} transition-all duration-500`}
                    style={{ width: `${concept.avgMastery}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#4A4E69] font-medium mt-2">
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
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#22223B] flex items-center gap-2">
              <span className="glass-icon glass-icon-amber w-6 h-6 rounded-lg">
                <ArrowRight className="w-3.5 h-3.5 text-[#B45309]" />
              </span>
              2. Core Operations
            </h3>
            <span className="text-[10px] text-[#BE123C] font-bold flex items-center gap-0.5 bg-[rgba(225,29,72,0.1)] px-2 py-0.5 rounded-full border border-white/60">
              <AlertTriangle className="w-3 h-3" />
              Critical Bottleneck
            </span>
          </div>
          <div className="space-y-2.5">
            {operations.map(concept => (
              <div
                key={concept.id}
                className={`p-3.5 rounded-xl border backdrop-blur-sm transition-all hover:translate-y-[-1px] ${getBadgeStyle(concept.status)}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-[#22223B]">{concept.name}</h4>
                  <span className="text-xs font-black">{concept.avgMastery}%</span>
                </div>
                <div className="w-full bg-[rgba(34,34,59,0.08)] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${getMeterColor(concept.avgMastery)} transition-all duration-500`}
                    style={{ width: `${concept.avgMastery}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#4A4E69] font-medium mt-2">
                  <span className={concept.status === 'critical' ? 'text-[#BE123C] font-bold' : ''}>
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
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#22223B] flex items-center gap-2">
              <span className="glass-icon glass-icon-mint w-6 h-6 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-[#047857]" />
              </span>
              3. Comparisons & Application
            </h3>
            <span className="text-[11px] text-[#4A4E69] font-medium">Target Goals</span>
          </div>
          <div className="space-y-2.5">
            {comparisons.map(concept => (
              <div
                key={concept.id}
                className={`p-3.5 rounded-xl border backdrop-blur-sm transition-all hover:translate-y-[-1px] ${getBadgeStyle(concept.status)}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-[#22223B]">{concept.name}</h4>
                  <span className="text-xs font-black">{concept.avgMastery}%</span>
                </div>
                <div className="w-full bg-[rgba(34,34,59,0.08)] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${getMeterColor(concept.avgMastery)} transition-all duration-500`}
                    style={{ width: `${concept.avgMastery}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#4A4E69] font-medium mt-2">
                  <span>{concept.below60Count} need support</span>
                  <span>{concept.above80Count} mastered</span>
                </div>
              </div>
            ))}

            {/* Diagnostic Observation Box */}
            <div className="p-3.5 rounded-xl bg-[rgba(201,173,167,0.22)] border border-white/70 backdrop-blur-sm text-xs text-[#22223B] mt-3">
              <p className="font-extrabold text-[#22223B]">🔍 Curriculum Gap Insight:</p>
              <p className="mt-1 text-[11px] text-[#4A4E69] font-medium leading-relaxed">
                Students fail <strong>Adding Fractions</strong> primarily because <strong>Common Denominators</strong> is at 46% mastery. Reteaching the prerequisite resolves the downstream failure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
