'use client';

import { Users, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

interface SummaryData {
  totalStudents: number;
  avgMastery: number;
  activeStudents24h: number;
  totalActiveMisconceptions: number;
  lastUpdated: string;
}

export default function OverviewCards({ summary }: { summary: SummaryData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Students */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohort Enrolled</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.totalStudents}</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              15 seeded + 1 live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Grade 6 Math: Fractions Module</p>
        </div>
      </div>

      {/* Class Average Mastery */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class Mastery</span>
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.avgMastery}%</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              summary.avgMastery >= 70 ? 'bg-emerald-50 text-emerald-700' :
              summary.avgMastery >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {summary.avgMastery >= 70 ? 'On Target' : summary.avgMastery >= 50 ? 'Needs Attention' : 'Critical Gaps'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${summary.avgMastery}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active in Last 24 Hours */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Today</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.activeStudents24h}</span>
            <span className="text-xs font-medium text-slate-500">
              of {summary.totalStudents} ({Math.round((summary.activeStudents24h / summary.totalStudents) * 100)}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Practicing or chatting with Socratic AI</p>
        </div>
      </div>

      {/* Active Misconceptions */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Misconceptions</span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">{summary.totalActiveMisconceptions}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
              Needs Repair
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Persistent conceptual misunderstandings</p>
        </div>
      </div>
    </div>
  );
}
