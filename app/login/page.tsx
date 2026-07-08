'use client';

// ══════════════════════════════════════════════════════════════════════════
// app/login/page.tsx — Version finale avec cookie middleware
// ══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { landingPageFor, isKnownRole } from '@/lib/pageAccess';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:8000/api';

function saveTokenToCookie(token: string): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  document.cookie = `tms_token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

function saveRoleToCookie(role: string): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  document.cookie = `tms_role=${role}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Identifiants incorrects');
        setLoading(false);
        return;
      }

      // Sauvegarde token/rôle dans localStorage ET cookie (pour le proxy et le layout serveur)
      localStorage.setItem('tms_token', data.token);
      localStorage.setItem('tms_user',  JSON.stringify(data.user));
      saveTokenToCookie(data.token);
      saveRoleToCookie(data.user.role);

      const role = isKnownRole(data.user.role) ? data.user.role : undefined;
      router.push(landingPageFor(role));
      router.refresh();
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez que Laravel tourne.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060A14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="w-full max-w-sm relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <span className="text-2xl font-black text-blue-400 font-[family-name:var(--font-syne)]">T</span>
          </div>
          <h1 className="text-2xl font-black text-white font-[family-name:var(--font-syne)] tracking-tight">
            TMS — Côte d'Ivoire
          </h1>
          <p className="text-slate-500 text-sm mt-1">Transport Management System</p>
        </div>

        {/* Formulaire */}
        <div className="bg-[#080D1A] border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-black/40">
          <h2 className="text-sm font-bold text-slate-300 mb-6 font-[family-name:var(--font-syne)] uppercase tracking-widest">
            Connexion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 font-[family-name:var(--font-syne)]">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="manager@tms-ci.com"
                required
                autoFocus
                className="w-full bg-slate-900/60 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 placeholder-slate-600 font-[family-name:var(--font-mono)] focus:outline-none focus:border-blue-500/60 focus:bg-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 font-[family-name:var(--font-syne)]">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900/60 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 pr-11 placeholder-slate-600 font-[family-name:var(--font-mono)] focus:outline-none focus:border-blue-500/60 focus:bg-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <span className="text-red-400 flex-shrink-0 text-sm">⚠</span>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full py-3 rounded-xl text-sm font-bold font-[family-name:var(--font-syne)] uppercase tracking-wider transition-all mt-2
                ${loading || !email || !password
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          {/* Comptes test */}
          <div className="mt-6 pt-5 border-t border-slate-800/60">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
              Comptes de test (mot de passe: password)
            </p>
            <div className="space-y-2">
              {[
                { role: 'Manager',    email: 'manager@tms-ci.com'    },
                { role: 'Dispatcher', email: 'dispatcher@tms-ci.com' },
                { role: 'DG',         email: 'dg@tms-ci.com'         },
                { role: 'RH',         email: 'rh@tms-ci.com'         },
                { role: 'Caissier',   email: 'caissier@tms-ci.com'   },
                { role: 'Contrôleur', email: 'controleur@tms-ci.com' },
                { role: 'Comptable',  email: 'comptable@tms-ci.com'  },
                { role: 'Chauffeur',  email: 'ch-2022-001@tms-ci.com'},
              ].map(account => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => { setEmail(account.email); setPassword('password'); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800/40 border border-slate-800 hover:border-slate-700 rounded-lg transition-all group"
                >
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300 font-[family-name:var(--font-syne)]">
                      {account.role}
                    </p>
                    <p className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">
                      {account.email}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-600 group-hover:text-blue-400 transition-colors">
                    Remplir →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-5 font-[family-name:var(--font-mono)]">
          TMS v1.0 · Laravel 11 · Next.js 14 · Neon PostgreSQL
        </p>
      </div>
    </div>
  );
}
