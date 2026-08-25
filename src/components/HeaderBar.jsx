import React, { useState } from 'react';
import {
  Sparkles, ShieldCheck, Play, Download, Maximize2,
  Terminal, RefreshCw, CheckCircle2, XCircle, ChevronDown, Video,
  ArrowLeft, Home, Sun, Moon, LogOut, User
} from 'lucide-react';

export default function HeaderBar({
  onNavigateHome,
  theme,
  onToggleTheme,
  isCompiling,
  lastBuildPassed,
  onCompile,
  onVerify,
  onExecute,
  onRunDemo,
  isFocusMode,
  onToggleFocusMode,
  isConsoleOpen,
  onToggleConsole,
  pipelineResult,
  currentUser,
  onLogout,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format) => {
    setShowExportMenu(false);
    if (!pipelineResult) {
      alert('Please compile a policy first to export workflow assets.');
      return;
    }
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pipelineResult.workflow_ir, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "workflow_ir.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      alert(`Exporting workflow as ${format.toUpperCase()} asset...`);
    }
  };

  return (
    <header className="h-12 min-h-[48px] vf-bg-secondary border-b vf-border px-4 flex items-center justify-between z-20 select-none">
      {/* Left: Brand Identity & Back to Home Button */}
      <div className="flex items-center gap-3">
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-2 py-1 rounded vf-bg-card-alt hover:bg-indigo-950/80 border vf-border hover:border-indigo-500/40 vf-text-secondary hover:text-indigo-300 transition-colors text-xs font-medium cursor-pointer shadow-sm"
            title="Back to Landing / Home Page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}

        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-left"
          title="VeriFlow — Go to Home Page"
        >
          <div className="w-6 h-6 rounded bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            VF
          </div>
          <span className="font-bold text-sm vf-text-primary tracking-tight hover:text-indigo-400 transition-colors">VeriFlow</span>
          <span className="text-[10px] vf-text-tertiary font-mono border-l vf-border pl-2 hidden md:inline">
            Natural Language → Verified Workflow Compiler
          </span>
        </button>

        {/* Build Status Badge */}
        {isCompiling ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[11px] font-medium animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
            <span>Compiling...</span>
          </div>
        ) : lastBuildPassed === true ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Gate Passed</span>
          </div>
        ) : lastBuildPassed === false ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[11px] font-semibold">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Gate Blocked</span>
          </div>
        ) : null}
      </div>


      {/* Center & Right: Primary Compiler Controls & Tools */}
      <div className="flex items-center gap-2">
        {/* Core Actions */}
        <button
          onClick={onCompile}
          disabled={isCompiling}
          className="btn btn-primary text-xs py-1 px-3 shadow-md shadow-indigo-900/30"
          title="Compile policy text (Ctrl + Enter)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Compile</span>
        </button>

        <button
          onClick={onVerify}
          disabled={isCompiling || !pipelineResult}
          className="btn btn-secondary text-xs py-1 px-2.5"
          title="Run 8-stage verification pipeline checks"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Verify</span>
        </button>

        <button
          onClick={onExecute}
          disabled={isCompiling || !lastBuildPassed}
          className="btn btn-secondary text-xs py-1 px-2.5"
          title="Execute verified workflow"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>Execute</span>
        </button>

        <div className="h-4 w-px vf-border border-r mx-1"></div>

        {/* Demo Mode Button */}
        <button
          onClick={onRunDemo}
          disabled={isCompiling}
          className="btn bg-purple-900/40 border border-purple-500/40 hover:bg-purple-800/60 text-purple-200 text-xs py-1 px-2.5"
          title="Automated one-click presentation demo"
        >
          <Video className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">Run Complete Demo</span>
        </button>

        {/* Export Center Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5 vf-text-secondary" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 vf-text-tertiary" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 vf-bg-card border vf-border rounded-md shadow-xl p-1 z-50 text-xs">
              <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-600/10 rounded vf-text-primary">
                Export JSON (IR)
              </button>
              <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-600/10 rounded vf-text-primary">
                Export PNG Image
              </button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-600/10 rounded vf-text-primary">
                Export PDF Report
              </button>
              <button onClick={() => handleExport('bpmn')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-600/10 rounded vf-text-primary">
                Export BPMN
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px vf-border border-r mx-1"></div>

        {/* Global Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded text-xs transition-colors cursor-pointer vf-text-secondary hover:vf-text-primary hover:bg-indigo-600/10"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Current User Display + Logout */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-1 border-l vf-border">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded vf-bg-card-alt border vf-border text-xs">
              <User className="w-3 h-3 vf-text-tertiary" />
              <span className="vf-text-primary font-medium hidden sm:inline">{currentUser.display_name || currentUser.username}</span>
              <span className={`text-[9px] font-bold px-1 rounded ${
                currentUser.app_role === 'manager'
                  ? 'bg-amber-900/50 text-amber-300 border border-amber-700/40'
                  : 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/40'
              }`}>
                {currentUser.app_role?.toUpperCase()}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded text-xs transition-colors cursor-pointer vf-text-secondary hover:text-rose-300 hover:bg-rose-900/20"
              title="Sign Out"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Workspace Layout Toggles */}
        <button
          onClick={onToggleFocusMode}
          className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
            isFocusMode ? 'bg-indigo-600 text-white' : 'vf-text-secondary hover:vf-text-primary hover:bg-indigo-600/10'
          }`}
          title="Full-Screen Focus Canvas Mode"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleConsole}
          className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
            isConsoleOpen ? 'bg-indigo-600 text-white' : 'vf-text-secondary hover:vf-text-primary hover:bg-indigo-600/10'
          }`}
          title="Toggle Terminal Console (Ctrl + `)"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}


