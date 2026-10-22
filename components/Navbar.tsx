'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <header className="sticky top-0 z-40 w-full glass-navbar transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs shrink-0 border border-white/60 bg-[#22223B]">
            <Image src="/logo.png" alt="Minerva Logo" width={40} height={40} priority className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-[#22223B] tracking-tight">Minerva</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(154,140,152,0.18)] text-[#22223B] border border-[rgba(255,255,255,0.7)] backdrop-blur-xs">
                Gap Detection
              </span>
            </div>
            <p className="text-[11px] text-[#4A4E69] font-medium hidden sm:block">AI-Powered Diagnostic Learning</p>
          </div>
        </div>

        {/* View Switcher Tabs with Elevated Glass Pill */}
        <nav className="flex items-center gap-1.5 p-1 bg-[rgba(201,173,167,0.22)] rounded-xl border border-[rgba(255,255,255,0.65)] backdrop-blur-md">
          <Link
            href="/teacher"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              pathname.startsWith('/teacher') || pathname === '/'
                ? 'bg-white/90 text-[#22223B] shadow-xs border border-white/80'
                : 'text-[#4A4E69] hover:text-[#22223B] hover:bg-white/40'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teacher Dashboard</span>
          </Link>
          <Link
            href="/student"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              pathname.startsWith('/student')
                ? 'bg-white/90 text-[#22223B] shadow-xs border border-white/80'
                : 'text-[#4A4E69] hover:text-[#22223B] hover:bg-white/40'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student View</span>
          </Link>
        </nav>

        {/* Demo Controls */}
        <div className="flex items-center gap-2">
          {clockOffsetDays > 0 && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[rgba(217,119,6,0.12)] text-[#B45309] border border-[rgba(255,255,255,0.7)] backdrop-blur-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              Clock: +{clockOffsetDays}d
            </span>
          )}

          <button
            onClick={() => handleAdvance(3)}
            disabled={isAdvancing}
            title="Fast forward simulated time by 3 days to trigger spaced retention revisits"
            className="glass-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B45309] rounded-xl cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate</span> +3 Days
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            title="Reset database to default seed cohort"
            className="glass-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#4A4E69] hover:text-[#22223B] rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>
        </div>
      </div>
    </header>
  );
}
