'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import OverviewCards from '@/components/teacher/OverviewCards';
import MisconceptionsChart from '@/components/teacher/MisconceptionsChart';
import ConceptHeatmap from '@/components/teacher/ConceptHeatmap';
import StudentTable from '@/components/teacher/StudentTable';
import AtRiskSection from '@/components/teacher/AtRiskSection';
import ActionRecommendations from '@/components/teacher/ActionRecommendations';
import { RefreshCw, Radio, Sparkles } from 'lucide-react';

export default function TeacherDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch('/api/teacher');
      if (!res.ok) throw new Error('Failed to load teacher analytics');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Gentle background poll every 8 seconds so student activity shows up live
    const interval = setInterval(() => {
      fetchData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar 
        onResetData={() => fetchData()} 
        onAdvanceClock={() => fetchData()} 
        clockOffsetDays={data?.summary?.clockOffsetDays || 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title & Live Sync Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shadow-xs" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A4E69]">
                Live Cohort Analytics
              </span>
              <span className="text-xs text-[#9A8C98] font-medium">• Grade 6 Math</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#22223B] tracking-tight mt-1">
              Teacher Command Center
            </h1>
            <p className="text-xs sm:text-sm text-[#4A4E69] font-medium mt-1">
              Real-time learning-gap diagnosis & prerequisite bottleneck detection
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass-panel-subtle flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-[#4A4E69] font-semibold">
              <Radio className="w-3.5 h-3.5 text-[#22223B] animate-pulse" />
              <span>Auto-sync with student sessions</span>
            </div>

            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="glass-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#22223B] rounded-xl cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#22223B]' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-[#4A4E69] space-y-3">
            <div className="w-10 h-10 border-3 border-[#22223B] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Aggregating student misconceptions & concept graph...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 rounded-2xl glass-panel border-[rgba(225,29,72,0.3)] text-[#BE123C] flex items-center justify-between">
            <div>
              <p className="font-extrabold text-sm">Failed to load analytics</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => fetchData()}
              className="px-3 py-1.5 rounded-lg bg-[#E11D48] text-white text-xs font-bold hover:bg-[#BE123C] shadow-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Dashboard Content */}
        {!loading && data && (
          <>
            {/* 1. Overview Cards */}
            <OverviewCards summary={data.summary} />

            {/* 2. Headline Misconception Bar Chart */}
            <MisconceptionsChart 
              data={data.misconceptionStats} 
              totalStudents={data.summary.totalStudents} 
            />

            {/* 3. Action Recommendations */}
            <ActionRecommendations recommendations={data.recommendations} />

            {/* 4. Concept Heatmap */}
            <ConceptHeatmap 
              concepts={data.conceptHeatmap} 
              totalStudents={data.summary.totalStudents} 
            />

            {/* 5. At-Risk Students */}
            <AtRiskSection students={data.atRiskStudents} />

            {/* 6. Complete Student Table & Diagnostic Log */}
            <StudentTable 
              students={data.students} 
              onRefreshData={() => fetchData(true)} 
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/60 bg-[rgba(242,233,228,0.7)] backdrop-blur-md py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[#4A4E69] flex flex-col sm:flex-row items-center justify-between gap-2 font-medium">
          <span>Minerva AI Tutor • Hackathon Demo Prototype</span>
          <span className="flex items-center gap-1.5 text-[#22223B] font-bold">
            <span className="glass-icon glass-icon-indigo w-5 h-5 rounded-md">
              <Sparkles className="w-3 h-3 text-[#22223B]" />
            </span>
            Personalised Learning Through Learning-Gap Detection
          </span>
        </div>
      </footer>
    </div>
  );
}
