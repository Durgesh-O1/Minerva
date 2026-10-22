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
import { AlertCircle, HelpCircle, Lightbulb, CheckCircle2 } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Headline Insight
            </span>
            <span className="text-xs text-slate-500">Root-cause misconception ranking</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Common Misconceptions Ranking
          </h2>
        </div>

        {/* Headline Stat Highlight */}
        {data[0] && (
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50/80 border border-amber-200/70 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
              {data[0].id}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
                #1 Dominant Flaw
              </p>
              <p className="text-sm font-bold text-slate-900">
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
              <XAxis type="number" domain={[0, totalStudents]} tickCount={6} />
              <YAxis 
                type="category" 
                dataKey="label" 
                tick={{ fill: '#334155', fontWeight: 600, fontSize: 13 }}
                width={45}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                        <p className="font-bold text-sm">{d.id}: {d.fullName}</p>
                        <p className="text-rose-300">Active Unresolved: {d.active} students</p>
                        <p className="text-emerald-300">Resolved by AI Tutor: {d.resolved} students</p>
                        <p className="text-slate-300 font-semibold pt-1 border-t border-slate-700">
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
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} 
              />
              <Bar 
                dataKey="active" 
                name="Active Misconception" 
                stackId="a" 
                fill="#f43f5e" 
                radius={[0, 0, 0, 0]}
                onClick={handleBarClick}
                className="cursor-pointer"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={`cell-act-${entry.id}`} 
                    fill={entry.id === selectedId ? '#e11d48' : '#fb7185'} 
                  />
                ))}
              </Bar>
              <Bar 
                dataKey="resolved" 
                name="Resolved by Tutor" 
                stackId="a" 
                fill="#10b981" 
                radius={[0, 6, 6, 0]}
                onClick={handleBarClick}
                className="cursor-pointer"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={`cell-res-${entry.id}`} 
                    fill={entry.id === selectedId ? '#059669' : '#34d399'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            💡 Click any bar or button below to inspect diagnostic remedy & student evidence
          </p>
        </div>

        {/* Selected Misconception Inspector Card */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {selected?.id}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">
                    {selected?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Impact: {selected?.totalImpacted} of {totalStudents} students ({selected?.percentage}%)
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                (selected?.activeCount || 0) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {selected?.activeCount} active
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Flawed Mental Model
                </span>
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60">
                  {selected?.description}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Classic Student Error
                </span>
                <p className="text-xs font-mono font-semibold text-rose-700 mt-0.5 bg-rose-50/80 p-2.5 rounded-lg border border-rose-200/60">
                  {selected?.example}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Recommended Socratic Cognitive Conflict
                </span>
                <p className="text-xs text-indigo-900 mt-0.5 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-200/70 leading-relaxed">
                  {selected?.remedyHint}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
            <span>Resolved in AI Tutor: <strong>{selected?.resolvedCount} students</strong></span>
            <span className="text-emerald-600 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Spaced revisits active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
