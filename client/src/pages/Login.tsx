import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Lock, Mail, User, ShieldAlert, Eye, EyeOff, Sparkles } from 'lucide-react';

// --- Password Strength Calculator ---
const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score: 2, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score: 3, label: 'Good', color: '#eab308' };
  if (score <= 4) return { score: 4, label: 'Strong', color: '#22c55e' };
  return { score: 5, label: 'Excellent', color: '#10b981' };
};

// --- Floating Particles Background ---
const ParticlesBackground: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 12 + 10,
      delay: Math.random() * 8,
      opacity: Math.random() * 0.4 + 0.1,
      color: ['#6366f1', '#a855f7', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 4)],
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};

const Login: React.FC = () => {
  const { user, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Focus first input on mode switch
  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [isRegister]);

  // If already authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" id="main-content">
      <ParticlesBackground />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative overflow-hidden modal-content">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500 rounded-full blur-[120px] opacity-25 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500 rounded-full blur-[120px] opacity-15 pointer-events-none" aria-hidden="true" />

        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight">
              KanbanCollab
            </h1>
          </div>
          <p className="text-slate-400 text-sm" id="auth-description">
            {isRegister ? 'Create your account to get started' : 'Sign in to access your workspaces'}
          </p>
        </div>

        {error && (
          <div
            className="mb-6 bg-red-950/50 border border-red-500/30 rounded-xl p-3 flex items-start gap-3 text-red-200 text-sm animate-scale-in"
            role="alert"
          >
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative" aria-describedby="auth-description">
          {isRegister && (
            <div className="space-y-2 animate-slide-up">
              <label htmlFor="auth-name" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="auth-name"
                  ref={isRegister ? firstInputRef : undefined}
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="auth-email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
              <input
                id="auth-email"
                ref={!isRegister ? firstInputRef : undefined}
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="auth-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 rounded-xl glass-input text-sm"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator - only on register */}
            {isRegister && password.length > 0 && (
              <div className="space-y-1.5 animate-slide-up">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className="strength-bar flex-1"
                      style={{
                        backgroundColor: level <= passwordStrength.score
                          ? passwordStrength.color
                          : 'rgba(255,255,255,0.06)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group"
          >
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : isRegister ? 'Create Account' : 'Sign In'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/10 to-indigo-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" aria-hidden="true" />
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400 relative">
          <span>{isRegister ? 'Already have an account?' : "Don't have an account?"} </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setPassword('');
            }}
            className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
          >
            {isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
