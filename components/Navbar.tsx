'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, GraduationCap, Users, RefreshCw, Clock } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  onResetData?: () => void;
  onAdvanceClock?: (days: number) => void;
  clockOffsetDays?: number;
}

export default function Navbar({ onResetData, onAdvanceClock, clockOffsetDays = 0 }: NavbarProps) {
  const pathname = usePathname();
  const [isResetting, setIsResetting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleReset = async () => {
    if (confirm('Reset all demo student data to initial state?')) {
      setIsResetting(true);
      try {
        await fetch('/api/teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        });
        if (onResetData) onResetData();
        else window.location.reload();
      } catch (err) {
        console.error('Failed to reset:', err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleAdvance = async (days: number) => {
    setIsAdvancing(true);
    try {
      await fetch('/api/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_clock', days })
      });
      if (onAdvanceClock) onAdvanceClock(days);
      else window.location.reload();
    } catch (err) {
      console.error('Failed to advance clock:', err);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">Minerva</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Gap Detection
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">AI-Powered Diagnostic Learning</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
          <Link
            href="/teacher"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              pathname.startsWith('/teacher') || pathname === '/'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teacher Dashboard</span>
          </Link>
          <Link
            href="/student"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              pathname.startsWith('/student')
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student View</span>
          </Link>
        </nav>

        {/* Demo Controls */}
        <div className="flex items-center gap-2">
          {clockOffsetDays > 0 && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Clock: +{clockOffsetDays}d
            </span>
          )}

          <button
            onClick={() => handleAdvance(3)}
            disabled={isAdvancing}
            title="Fast forward simulated time by 3 days to trigger spaced retention revisits"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate</span> +3 Days
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            title="Reset database to default seed cohort"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>
        </div>
      </div>
    </header>
  );
}
