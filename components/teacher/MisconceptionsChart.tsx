'use client';

import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { Lightbulb, CheckCircle2 } from 'lucide-react';

interface MisconceptionStat {
  id: string;
  name: string;
  description: string;
  example: string;
  remedyHint: string;
  activeCount: number;
  resolvedCount: number;
  totalImpacted: number;
  percentage: number;
}

interface MisconceptionsChartProps {
  data: MisconceptionStat[];
  totalStudents: number;
  onSelectMisconception?: (id: string) => void;
}

export default function MisconceptionsChart({ 
  data, 
  totalStudents, 
  onSelectMisconception 
}: MisconceptionsChartProps) {
  const [selectedId, setSelectedId] = useState<string>(data[0]?.id || 'M1');
  const selected = data.find(d => d.id === selectedId) || data[0];

  const chartData = data.map(item => ({
    id: item.id,
    label: `${item.id}`,
    active: item.activeCount,
    resolved: item.resolvedCount,
    total: item.totalImpacted,
    percentage: item.percentage,
    fullName: item.name
  }));

  const handleBarClick = (entry: any) => {
    if (entry && entry.id) {
      setSelectedId(entry.id);
      if (onSelectMisconception) onSelectMisconception(entry.id);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[rgba(34,34,59,0.08)] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[rgba(225,29,72,0.12)] text-[#BE123C] border border-[rgba(255,255,255,0.7)] backdrop-blur-xs">
              Headline Insight
            </span>
            <span className="text-xs text-[#4A4E69] font-medium">Root-cause misconception ranking</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#22223B] tracking-tight mt-1">
            Common Misconceptions Ranking
          </h2>
        </div>

        {/* Headline Stat Highlight - Glassmorphic Callout */}
        {data[0] && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[rgba(242,233,228,0.85)] border border-[rgba(255,255,255,0.85)] shadow-xs backdrop-blur-md">
            <div className="glass-icon glass-icon-amber w-9 h-9 rounded-xl font-black text-sm">
              {data[0].id}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                #1 Dominant Flaw
              </p>
              <p className="text-xs sm:text-sm font-extrabold text-[#22223B]">
                {data[0].id}: {data[0].totalImpacted} of {totalStudents} students ({data[0].percentage}%)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart and Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Recharts Bar Panel */}
        <div className="lg:col-span-7 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                domain={[0, totalStudents]} 
                tickCount={6} 
                tick={{ fill: '#4A4E69', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                type="category" 
                dataKey="label" 
                tick={{ fill: '#22223B', fontWeight: 700, fontSize: 13 }}
                width={45}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="glass-panel p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 border border-white/90">
                        <p className="font-extrabold text-[#22223B] text-sm">{d.id}: {d.fullName}</p>
                        <p className="text-[#BE123C] font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
                          Active Unresolved: {d.active} students
                        </p>
                        <p className="text-[#047857] font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                          Resolved by AI Tutor: {d.resolved} students
                        </p>
                        <p className="text-[#4A4E69] font-bold pt-1.5 border-t border-[rgba(34,34,59,0.1)]">
                          Total Ever Affected: {d.total} / {totalStudents} ({d.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }} 
              />
              <Bar 
                dataKey="active" 
                name="Active Misconception" 
                stackId="a" 
                fill="#E11D48" 
                radius={[0, 0, 0, 0]}
                onClick={handleBarClick}
                className="cursor-pointer"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={`cell-act-${entry.id}`} 
                    fill={entry.id === selectedId ? '#BE123C' : '#E11D48'} 
                  />
                ))}
              </Bar>
              <Bar 
                dataKey="resolved" 
                name="Resolved by Tutor" 
                stackId="a" 
                fill="#10B981" 
                radius={[0, 6, 6, 0]}
                onClick={handleBarClick}
                className="cursor-pointer"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={`cell-res-${entry.id}`} 
                    fill={entry.id === selectedId ? '#047857' : '#10B981'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-[#4A4E69] font-medium text-center mt-2">
            💡 Click any bar to inspect diagnostic remedy & student evidence
          </p>
        </div>

        {/* Selected Misconception Inspector Glass Card */}
        <div className="lg:col-span-5 glass-panel-subtle rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="glass-icon glass-icon-indigo w-9 h-9 rounded-xl font-black text-sm">
                  {selected?.id}
                </span>
                <div>
                  <h3 className="font-extrabold text-[#22223B] text-sm leading-tight">
                    {selected?.name}
                  </h3>
                  <p className="text-xs text-[#4A4E69] font-medium">
                    Impact: {selected?.totalImpacted} of {totalStudents} students ({selected?.percentage}%)
                  </p>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border border-white/70 backdrop-blur-xs ${
                (selected?.activeCount || 0) > 0 
                  ? 'bg-[rgba(225,29,72,0.12)] text-[#BE123C]' 
                  : 'bg-[rgba(16,185,129,0.12)] text-[#047857]'
              }`}>
                {selected?.activeCount} active
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4E69]">
                  Flawed Mental Model
                </span>
                <p className="text-xs text-[#22223B] font-medium mt-0.5 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-white/80">
                  {selected?.description}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#BE123C]">
                  Classic Student Error
                </span>
                <p className="text-xs font-mono font-bold text-[#BE123C] mt-0.5 bg-[rgba(225,29,72,0.08)] p-2.5 rounded-lg border border-[rgba(225,29,72,0.2)]">
                  {selected?.example}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4E69] flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-[#D97706]" />
                  Recommended Socratic Cognitive Conflict
                </span>
                <p className="text-xs text-[#22223B] font-medium mt-0.5 bg-[rgba(201,173,167,0.22)] p-2.5 rounded-lg border border-[rgba(255,255,255,0.7)] leading-relaxed">
                  {selected?.remedyHint}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(34,34,59,0.08)] flex items-center justify-between text-xs text-[#4A4E69] font-medium">
            <span>Resolved in AI Tutor: <strong className="text-[#22223B]">{selected?.resolvedCount} students</strong></span>
            <span className="text-[#047857] flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Spaced revisits active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
