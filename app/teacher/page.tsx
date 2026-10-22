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
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans">
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Cohort Analytics
              </span>
              <span className="text-xs text-slate-400">• Grade 6 Math</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Teacher Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time learning-gap diagnosis & prerequisite bottleneck detection
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 shadow-xs">
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Auto-sync with student sessions</span>
            </div>

            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Aggregating student misconceptions & concept graph...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Failed to load analytics</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => fetchData()}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
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
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Minerva AI Tutor • Hackathon Demo Prototype</span>
          <span className="flex items-center gap-1 text-slate-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Personalised Learning Through Learning-Gap Detection
          </span>
        </div>
      </footer>
    </div>
  );
}
