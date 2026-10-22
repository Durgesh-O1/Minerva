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
      {/* 1. Cohort Enrolled */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#4A4E69] uppercase tracking-wider">Cohort Enrolled</span>
          <div className="glass-icon glass-icon-indigo w-10 h-10 rounded-xl">
            <Users className="w-5 h-5 text-[#22223B]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#22223B] tracking-tight">{summary.totalStudents}</span>
            <span className="text-xs font-semibold text-[#047857] flex items-center gap-0.5 bg-[rgba(16,185,129,0.12)] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.7)] backdrop-blur-xs">
              15 seeded + 1 live
            </span>
          </div>
          <p className="text-xs text-[#4A4E69] mt-1 font-medium">Grade 6 Math: Fractions Module</p>
        </div>
      </div>

      {/* 2. Class Average Mastery */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#4A4E69] uppercase tracking-wider">Class Mastery</span>
          <div className="glass-icon glass-icon-amber w-10 h-10 rounded-xl">
            <TrendingUp className="w-5 h-5 text-[#B45309]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#22223B] tracking-tight">{summary.avgMastery}%</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border border-white/60 backdrop-blur-xs ${
              summary.avgMastery >= 70 ? 'bg-[rgba(16,185,129,0.15)] text-[#047857]' :
              summary.avgMastery >= 50 ? 'bg-[rgba(217,119,6,0.15)] text-[#B45309]' : 'bg-[rgba(225,29,72,0.15)] text-[#BE123C]'
            }`}>
              {summary.avgMastery >= 70 ? 'On Target' : summary.avgMastery >= 50 ? 'Needs Attention' : 'Critical Gaps'}
            </span>
          </div>
          <div className="w-full bg-[rgba(34,34,59,0.08)] rounded-full h-2 mt-2 overflow-hidden p-0.5">
            <div 
              className="bg-linear-to-r from-[#D97706] to-[#F59E0B] h-full rounded-full transition-all duration-500 shadow-xs" 
              style={{ width: `${summary.avgMastery}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Active in Last 24 Hours */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#4A4E69] uppercase tracking-wider">Active Today</span>
          <div className="glass-icon glass-icon-mint w-10 h-10 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-[#047857]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#22223B] tracking-tight">{summary.activeStudents24h}</span>
            <span className="text-xs font-semibold text-[#4A4E69]">
              of {summary.totalStudents} ({Math.round((summary.activeStudents24h / summary.totalStudents) * 100)}%)
            </span>
          </div>
          <p className="text-xs text-[#4A4E69] mt-1 font-medium">Practicing or chatting with Socratic AI</p>
        </div>
      </div>

      {/* 4. Active Misconceptions */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#4A4E69] uppercase tracking-wider">Active Misconceptions</span>
          <div className="glass-icon glass-icon-coral w-10 h-10 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-[#BE123C]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#BE123C] tracking-tight">{summary.totalActiveMisconceptions}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[rgba(225,29,72,0.12)] text-[#BE123C] border border-[rgba(255,255,255,0.7)] backdrop-blur-xs">
              Needs Repair
            </span>
          </div>
          <p className="text-xs text-[#4A4E69] mt-1 font-medium">Persistent conceptual misunderstandings</p>
        </div>
      </div>
    </div>
  );
}
