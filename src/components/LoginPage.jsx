import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, LogIn, AlertCircle, User, Lock } from 'lucide-react';
import { login } from '../api/client';

export default function LoginPage({ onLoginSuccess, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const user = await login(username.trim(), password);
      onLoginSuccess(user);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    const creds = role === 'employee'
      ? { username: 'employee', password: 'employee123' }
      : { username: 'manager', password: 'manager123' };
    setUsername(creds.username);
    setPassword(creds.password);
    setIsLoading(true);
    setError('');
    try {
      const user = await login(creds.username, creds.password);
      onLoginSuccess(user);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen vf-bg-primary flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="vf-card rounded-2xl p-8 shadow-2xl border vf-border" style={{ backgroundColor: 'var(--vf-bg-secondary)' }}>
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg shadow-indigo-900/50 mb-4">
              VF
            </div>
            <h1 className="text-xl font-bold vf-text-primary tracking-tight">VeriFlow</h1>
            <p className="text-xs vf-text-secondary mt-1">Natural Language → Verified Workflow Compiler</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="vf-login-form">
            {/* Username */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider vf-text-secondary" htmlFor="vf-username">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 vf-text-tertiary" />
                <input
                  id="vf-username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="Enter username"
                  autoComplete="username"
                  disabled={isLoading}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border vf-border vf-bg-card vf-text-primary placeholder:vf-text-tertiary focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider vf-text-secondary" htmlFor="vf-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 vf-text-tertiary" />
                <input
                  id="vf-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border vf-border vf-bg-card vf-text-primary placeholder:vf-text-tertiary focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 vf-text-tertiary hover:vf-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="vf-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-md shadow-indigo-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px vf-border border-t" />
            <span className="text-[10px] vf-text-tertiary font-mono uppercase">Demo Accounts</span>
            <div className="flex-1 h-px vf-border border-t" />
          </div>

          {/* Quick login buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="vf-quick-employee"
              type="button"
              onClick={() => handleQuickLogin('employee')}
              disabled={isLoading}
              className="flex flex-col items-center gap-1 py-2.5 px-3 rounded-lg border vf-border vf-bg-card hover:border-indigo-500/50 hover:bg-indigo-950/30 transition-all text-xs disabled:opacity-60"
            >
              <span className="font-semibold vf-text-primary">Employee</span>
              <span className="vf-text-tertiary font-mono text-[10px]">employee / employee123</span>
            </button>
            <button
              id="vf-quick-manager"
              type="button"
              onClick={() => handleQuickLogin('manager')}
              disabled={isLoading}
              className="flex flex-col items-center gap-1 py-2.5 px-3 rounded-lg border vf-border vf-bg-card hover:border-amber-500/50 hover:bg-amber-950/20 transition-all text-xs disabled:opacity-60"
            >
              <span className="font-semibold vf-text-primary">Manager</span>
              <span className="vf-text-tertiary font-mono text-[10px]">manager / manager123</span>
            </button>
          </div>

          {/* Footer note */}
          <div className="mt-6 flex items-center gap-1.5 justify-center text-[10px] vf-text-tertiary">
            <ShieldCheck className="w-3 h-3 text-indigo-400" />
            <span>Passwords are hashed server-side (bcrypt)</span>
          </div>
        </div>
      </div>

      {/* Back to landing page — only shown if onBack is provided */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-5 left-5 flex items-center gap-1.5 text-[11px] vf-text-tertiary hover:vf-text-secondary transition-colors bg-transparent border-none cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Home
        </button>
      )}
    </div>
  );
}
