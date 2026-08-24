import React, { useState, useEffect } from 'react';
import { Terminal, CheckCircle2 } from 'lucide-react';

export default function TerminalLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 0–0.5s: Card scales into view
    const mountTimer = setTimeout(() => setMounted(true), 50);

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const totalDuration = prefersReducedMotion ? 600 : 2300; // ~2.3 seconds total
    const intervalTime = 30; // updates every 30ms
    const totalSteps = totalDuration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const currentPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setProgress(currentPercent);

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setIsReady(true);
        // At 100%: briefly show "Ready" or "Completed", then fade out
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 450); // duration of fade transition
        }, 350);
      }
    }, intervalTime);

    return () => {
      clearTimeout(mountTimer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#060913] transition-opacity duration-500 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Application Startup Loading"
      role="dialog"
      aria-modal="true"
    >
      {/* Ambient background glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none animate-pulse" />

      {/* Terminal Card Window */}
      <div
        className={`relative w-full max-w-[420px] mx-4 rounded-2xl border border-slate-800/80 bg-[#0B101B]/95 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.12)] overflow-hidden font-mono transition-all duration-500 ease-out transform ${
          mounted ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#080C16] border-b border-slate-800/80 flex items-center justify-between">
          {/* Three Circular Terminal Window Controls */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block shadow-sm ring-1 ring-red-500/20" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block shadow-sm ring-1 ring-amber-500/20" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block shadow-sm ring-1 ring-emerald-500/20" />
          </div>

          {/* Status Label in Header */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Status</span>
          </div>

          {/* Right Status Badge */}
          <div className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 font-mono tracking-wider">
            {isReady ? 'READY' : 'ACTIVE'}
          </div>
        </div>

        {/* Dark Terminal Content Area */}
        <div className="p-6 space-y-4">
          {/* Terminal Command / Context Prompt */}
          <div className="space-y-1 text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">$</span>
              <span className="text-slate-300">veriflow initialize</span>
            </div>
          </div>

          {/* Green "Loading" Text with Animated Terminal Cursor */}
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="flex items-center gap-2 font-bold font-mono tracking-wide">
              {isReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Completed</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className="text-emerald-400">Loading</span>
                  <span className="text-emerald-400 animate-pulse font-bold">_</span>
                </>
              )}
            </span>
          </div>

          {/* Animated Green Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-[#131B2E] border border-slate-800/80 overflow-hidden relative shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 transition-all duration-75 ease-out shadow-[0_0_12px_rgba(52,211,153,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Percentage Displayed Below the Progress Bar */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[11px]">
              {progress < 30
                ? 'Bootstrapping compiler...'
                : progress < 70
                ? 'Loading RBAC & rules...'
                : progress < 100
                ? 'Verifying system environment...'
                : 'System ready.'}
            </span>
            <span className="font-bold text-emerald-400 tracking-wider">
              {progress}%
            </span>
          </div>

          {/* Subtle Terminal Footer Metadata */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-800/60 font-mono">
            <span>VeriFlow Verification Runtime</span>
            <span className="text-slate-400">v2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

