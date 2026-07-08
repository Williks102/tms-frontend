'use client';

import { useEffect, useState } from 'react';
import { AuthUser } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:8000/api';

const ROLE_LABELS: Record<string, string> = {
  dg: 'DG', manager: 'Manager', dispatcher: 'Dispatcher', rh: 'RH', caissier: 'Caissier',
};

export default function LogoutButton() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('tms_user');
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('tms_token');

    // Appel API logout (optionnel — révoque le token côté Laravel)
    if (token) {
      try {
        await fetch(`${API_URL}/logout`, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
      } catch {}
    }

    // Nettoyage local
    localStorage.removeItem('tms_token');
    localStorage.removeItem('tms_user');

    // Supprime les cookies lus par le proxy et le layout serveur
    document.cookie = 'tms_token=; path=/; max-age=0';
    document.cookie = 'tms_role=; path=/; max-age=0';

    window.location.href = '/login';
  };

  return (
    <div className="flex items-center gap-2 px-2">
      {/* Avatar */}
      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] text-slate-400 font-bold font-[family-name:var(--font-syne)]">
          {user?.name?.[0] ?? 'M'}
        </span>
      </div>

      {/* Nom + logout — la sidebar affiche désormais toujours ses labels
          (en place sur desktop, en tiroir plein sur mobile), donc plus de
          bascule lg: ici non plus */}
      <div className="flex flex-1 items-center justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 font-semibold font-[family-name:var(--font-syne)] truncate">
            {user?.name ?? 'Manager'}
          </p>
          <p className="text-[9px] text-slate-600 font-[family-name:var(--font-mono)] truncate">
            {user?.role ? ROLE_LABELS[user.role] : ''}
          </p>
        </div>
        <button
          onClick={handleLogout}
          title="Se déconnecter"
          className="ml-2 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
