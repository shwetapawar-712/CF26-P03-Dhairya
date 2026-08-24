import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowUp, ChevronRight, GitBranch, Scale, Search,
  Swords, FileText, Zap, CheckCircle2, Sun, Moon, Menu, X,
  ShieldCheck, Lock, Home
} from 'lucide-react';

/**
 * VeriFlow Landing Page
 * Premium SaaS landing with glassmorphism, glow effects, and pipeline visualization.
 * All colors reference CSS custom properties (--vf-*) for theme support.
 */
export default function LandingPage({ onNavigateToApp, theme, onToggleTheme }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    document.body.classList.add('landing-page');
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => {
      document.body.classList.remove('landing-page');
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollTo = (id) => {
    setIsMobileMenuOpen(false);
    if (id === 'hero' || id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Home', target: 'hero' },
    { label: 'How It Works', target: 'how-it-works' },
    { label: 'Features', target: 'capabilities' },
  ];

  /* ── Pipeline visualization data ── */
  const pipelineStages = [
    { label: 'Natural Language', icon: FileText },
    { label: 'Parser', icon: Zap },
    { label: 'Workflow IR', icon: GitBranch },
    { label: 'Verification', icon: ShieldCheck },
    { label: 'Verified Workflow', icon: CheckCircle2 },
  ];

  const verificationChecks = ['Semantic', 'RBAC', 'Compliance'];

  /* ── How it works steps ── */
  const steps = [
    {
      num: 1,
      title: 'Natural Language Policy',
      desc: 'Write business policies in plain English. No YAML, no config files — just describe what you need.',
    },
    {
      num: 2,
      title: 'Policy Compilation',
      desc: 'VeriFlow parses your text with NLP and compiles it into a structured Intermediate Representation (IR).',
    },
    {
      num: 3,
      title: 'Verification',
      desc: 'An 8-stage verification pipeline checks for semantic ambiguity, RBAC violations, graph errors, compliance, and conflicts.',
    },
    {
      num: 4,
      title: 'Verified Workflow',
      desc: 'Only workflows that pass every verification gate are cleared for execution — no exceptions.',
    },
    {
      num: 5,
      title: 'Execution & Audit',
      desc: 'Run verified workflows step-by-step with full audit logging, human approval gates, and real-time state tracking.',
    },
  ];

  /* ── Verification capabilities ── */
  const capabilities = [
    {
      icon: Search,
      title: 'Semantic Analysis',
      desc: 'Detects ambiguous language, vague terms, and unclear references in your business policies before they cause problems.',
    },
    {
      icon: Lock,
      title: 'RBAC Authorization',
      desc: 'Validates role-based access control against a Casbin policy engine. Ensures every step has authorized actors.',
    },
    {
      icon: GitBranch,
      title: 'Graph Topology',
      desc: 'Analyzes workflow structure for cycles, orphan nodes, unreachable steps, and missing dependencies.',
    },
    {
      icon: Scale,
      title: 'Compliance Rules',
      desc: 'Enforces configurable business rules — spending thresholds, required approvals, and regulatory constraints.',
    },
    {
      icon: Swords,
      title: 'Conflict Detection',
      desc: 'Identifies contradictory policies, redundant steps, and logical conflicts across your workflow.',
    },
    {
      icon: FileText,
      title: 'Human-Readable Reports',
      desc: 'Every verification result includes plain-English explanations, severity levels, and actionable fix suggestions.',
    },
  ];

  return (
    <div className="vf-landing min-h-screen" style={{ background: 'var(--vf-bg-primary)' }}>

      {/* ════════════════════════════════════════════════════════
          NAVBAR
          ════════════════════════════════════════════════════════ */}
      <nav
        className={`vf-glass-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'shadow-lg' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left — Logo (Click to scroll to top of Home) */}
          <button
            onClick={() => scrollTo('top')}
            className="flex items-center gap-2.5 flex-shrink-0 bg-transparent border-none cursor-pointer text-left p-0"
            title="VeriFlow Home"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-md"
              style={{ background: 'var(--vf-accent-primary)', boxShadow: '0 4px 12px var(--vf-accent-glow)' }}
            >
              VF
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--vf-text-primary)' }}>
              VeriFlow
            </span>
          </button>

          {/* Center — Nav Links (desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.target)}
                className="text-sm font-medium transition-colors cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--vf-text-secondary)' }}
                onMouseEnter={(e) => (e.target.style.color = 'var(--vf-text-primary)')}
                onMouseLeave={(e) => (e.target.style.color = 'var(--vf-text-secondary)')}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right — Theme Toggle + CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer border"
              style={{
                background: 'var(--vf-bg-card)',
                borderColor: 'var(--vf-border)',
                color: 'var(--vf-text-secondary)',
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onNavigateToApp}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer border-none"
              style={{
                background: 'var(--vf-accent-primary)',
                boxShadow: '0 2px 12px var(--vf-accent-glow)',
              }}
              onMouseEnter={(e) => (e.target.style.background = 'var(--vf-primary-hover)')}
              onMouseLeave={(e) => (e.target.style.background = 'var(--vf-accent-primary)')}
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer border"
              style={{
                background: 'var(--vf-bg-card)',
                borderColor: 'var(--vf-border)',
                color: 'var(--vf-text-secondary)',
              }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden border-t px-6 py-4 space-y-3"
            style={{ background: 'var(--vf-glass-bg)', borderColor: 'var(--vf-glass-border)' }}
          >
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.target)}
                className="block w-full text-left text-sm font-medium py-1.5 cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--vf-text-secondary)' }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={onNavigateToApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer border-none mt-2"
              style={{ background: 'var(--vf-accent-primary)' }}
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </nav>

      {/* ════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════ */}
      <section id="hero" className="relative pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        {/* Background glow */}
        <div className="vf-hero-glow" style={{ top: '-200px', right: '-100px' }} />
        <div className="vf-hero-glow" style={{ bottom: '-300px', left: '-150px', opacity: 0.3 }} />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          {/* Eyebrow */}
          <div className="vf-fade-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{
              background: 'var(--vf-accent-glow)',
              borderColor: 'var(--vf-accent-primary)',
              color: 'var(--vf-accent-secondary)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Policy Engineering
          </div>

          {/* Heading */}
          <h1
            className="vf-fade-in vf-fade-in-delay-1 text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6"
            style={{ color: 'var(--vf-text-primary)' }}
          >
            From Natural Language
            <br />
            to{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--vf-accent-primary), var(--vf-accent-secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Verified Workflows.
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="vf-fade-in vf-fade-in-delay-2 text-base md:text-lg max-w-3xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--vf-text-secondary)' }}
          >
            VeriFlow transforms natural-language business policies into executable workflows
            and verifies them for semantic ambiguity, authorization, graph errors, compliance
            violations, and policy conflicts before they run.
          </p>

          {/* CTA buttons */}
          <div className="vf-fade-in vf-fade-in-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <button
              onClick={onNavigateToApp}
              className="flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer border-none transition-all"
              style={{
                background: 'var(--vf-accent-primary)',
                boxShadow: '0 4px 20px var(--vf-accent-glow)',
              }}
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-semibold cursor-pointer border transition-all"
              style={{
                background: 'transparent',
                borderColor: 'var(--vf-border-light)',
                color: 'var(--vf-text-secondary)',
              }}
            >
              See How It Works
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── Animated Pipeline Visualization ── */}
          <div className="vf-fade-in vf-fade-in-delay-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between gap-1 mb-4 overflow-x-auto px-2 py-3">
              {pipelineStages.map((stage, i) => {
                const Icon = stage.icon;
                return (
                  <React.Fragment key={stage.label}>
                    {i > 0 && (
                      <div className="vf-pipeline-line flex-1 min-w-[16px]" />
                    )}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div
                        className={`vf-pipeline-node w-11 h-11 rounded-xl flex items-center justify-center border ${
                          i === pipelineStages.length - 1 ? '' : ''
                        }`}
                        style={{
                          background: i === pipelineStages.length - 1
                            ? 'var(--vf-accent-primary)'
                            : 'var(--vf-bg-card)',
                          borderColor: i === pipelineStages.length - 1
                            ? 'var(--vf-accent-primary)'
                            : 'var(--vf-border)',
                          animationDelay: `${i * 0.6}s`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{
                            color: i === pipelineStages.length - 1 ? '#ffffff' : 'var(--vf-accent-secondary)',
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] md:text-xs font-medium whitespace-nowrap"
                        style={{ color: 'var(--vf-text-tertiary)' }}
                      >
                        {stage.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Verification check badges */}
            <div className="flex items-center justify-center gap-3 mt-2">
              {verificationChecks.map((check) => (
                <span
                  key={check}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-medium border"
                  style={{
                    background: 'var(--vf-glow)',
                    borderColor: 'var(--vf-border)',
                    color: 'var(--vf-accent-secondary)',
                  }}
                >
                  <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--vf-success)' }} />
                  {check}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
              style={{ color: 'var(--vf-text-primary)' }}
            >
              How VeriFlow Works
            </h2>
            <p className="text-base max-w-2xl mx-auto" style={{ color: 'var(--vf-text-secondary)' }}>
              Five stages from plain-English policy to audited execution.
            </p>
          </div>

          <div className="space-y-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="flex items-start gap-5 p-5 rounded-xl border transition-all"
                style={{
                  background: 'var(--vf-bg-card)',
                  borderColor: 'var(--vf-border)',
                }}
              >
                <div className="vf-step-number">{step.num}</div>
                <div>
                  <h3
                    className="font-semibold text-base mb-1"
                    style={{ color: 'var(--vf-text-primary)' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--vf-text-secondary)' }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          VERIFICATION CAPABILITIES
          ════════════════════════════════════════════════════════ */}
      <section id="capabilities" className="py-24 md:py-32 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
              style={{ color: 'var(--vf-text-primary)' }}
            >
              Verification Capabilities
            </h2>
            <p className="text-base max-w-2xl mx-auto" style={{ color: 'var(--vf-text-secondary)' }}>
              Every workflow passes through a rigorous multi-stage verification pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div key={cap.title} className="vf-feature-card">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: 'var(--vf-glow)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--vf-accent-secondary)' }} />
                  </div>
                  <h3
                    className="font-semibold text-sm mb-2"
                    style={{ color: 'var(--vf-text-primary)' }}
                  >
                    {cap.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--vf-text-secondary)' }}>
                    {cap.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FINAL CTA
          ════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className="vf-cta-glow absolute inset-0 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--vf-text-primary)' }}
          >
            Ready to verify your next workflow?
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--vf-text-secondary)' }}>
            Turn business policies into workflows you can trust.
          </p>
          <button
            onClick={onNavigateToApp}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-semibold text-white cursor-pointer border-none transition-all"
            style={{
              background: 'var(--vf-accent-primary)',
              boxShadow: '0 4px 24px var(--vf-accent-glow)',
            }}
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════════ */}
      <footer
        className="py-10 border-t"
        style={{ borderColor: 'var(--vf-border)', background: 'var(--vf-bg-secondary)' }}
      >
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs text-white"
              style={{ background: 'var(--vf-accent-primary)' }}
            >
              VF
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--vf-text-primary)' }}>
              VeriFlow
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--vf-text-tertiary)' }}>
            Natural Language → Verified Workflow
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => scrollTo('top')}
              className="text-xs font-medium cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--vf-text-tertiary)' }}
            >
              Home
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="text-xs font-medium cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--vf-text-tertiary)' }}
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo('capabilities')}
              className="text-xs font-medium cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--vf-text-tertiary)' }}
            >
              Capabilities
            </button>
            <button
              onClick={onNavigateToApp}
              className="text-xs font-medium cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--vf-accent-secondary)' }}
            >
              Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      {isScrolled && (
        <button
          onClick={() => scrollTo('top')}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border shadow-lg transition-all duration-300 hover:scale-105"
          style={{
            background: 'var(--vf-bg-card)',
            borderColor: 'var(--vf-border)',
            color: 'var(--vf-accent-secondary)',
            boxShadow: '0 4px 16px var(--vf-glow)'
          }}
          title="Back to Top"
          aria-label="Back to Top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

