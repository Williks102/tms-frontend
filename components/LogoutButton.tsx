'use client';

import { useEffect, useState } from 'react';
import { AuthUser, getUser, logout } from '@/lib/auth';

const ROLE_LABELS: Record<string, string> = {
  dg: 'DG', manager: 'Manager', dispatcher: 'Dispatcher', rh: 'RH', caissier: 'Caissier',
  driver: 'Chauffeur', controleur: 'Contrôleur', comptable: 'Comptable', agent_colis: 'Agent colis',
  agent_fret: 'Agent fret', super_admin: 'Super Admin',
};

export default function LogoutButton() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

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
          onClick={() => logout()}
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
