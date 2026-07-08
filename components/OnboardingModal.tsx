'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth';
import { PAGE_ACCESS } from '@/lib/pageAccess';

// Même icônes/libellés que la nav de app/layout.tsx — description en plus.
// Dérivé de PAGE_ACCESS : reste synchro automatiquement si les accès par rôle changent.
const FEATURE_DESCRIPTIONS: Record<string, { icon: string; label: string; description: string }> = {
  '/dashboard': { icon: '◈',   label: 'Dashboard',  description: "Vue d'ensemble en direct : flotte, alertes, rentabilité du jour." },
  '/planning':  { icon: '⊞',   label: 'Planning',   description: 'Gérer les lignes et les départs, changer leur statut (y compris en masse).' },
  '/vehicles':  { icon: '🚌',  label: 'Véhicules',  description: 'Suivi du parc : maintenance, incidents et carburant par bus.' },
  '/drivers':   { icon: '◉',   label: 'Chauffeurs', description: 'Profils, repos réglementaire, scores éco-conduite et classement.' },
  '/fuel':      { icon: '⛽',  label: 'Carburant',  description: 'Bons carburant (demande, approbation) et plans de maintenance.' },
  '/incidents': { icon: '⚡',  label: 'Incidents',  description: 'Déclarer et suivre les incidents, scores qualité et ponctualité.' },
  '/tickets':   { icon: '🎫',  label: 'Billets',    description: 'Vente au guichet, embarquement et suivi des achats en ligne.' },
  '/hr':        { icon: '🧑‍💼', label: 'RH',         description: 'Employés, demandes de congé, suivi disciplinaire.' },
  '/driver':    { icon: '🚐',  label: 'Mon espace', description: 'Votre planning du jour, marquer départ/arrivée, signaler un incident, demander un congé.' },
};

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [pages, setPages] = useState<(typeof FEATURE_DESCRIPTIONS)[string][]>([]);

  useEffect(() => {
    const user = getUser();
    if (!user) return;

    const seenKey = `tms_onboarding_seen_${user.email}`;
    if (localStorage.getItem(seenKey)) return;

    const rolePages = Object.entries(PAGE_ACCESS)
      .filter(([, roles]) => roles.includes(user.role))
      .map(([path]) => FEATURE_DESCRIPTIONS[path])
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    setPages(rolePages);
    setVisible(true);
  }, []);

  const dismiss = () => {
    const user = getUser();
    if (user) localStorage.setItem(`tms_onboarding_seen_${user.email}`, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#080D1A] p-6">
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">
            Bienvenue sur TMS
          </p>
          <h2 className="text-lg font-bold text-white font-[family-name:var(--font-syne)] mt-1">
            Voici ce que vous pouvez faire
          </h2>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {pages.map(p => (
            <div key={p.label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <span className="text-xl flex-shrink-0">{p.icon}</span>
              <div>
                <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">{p.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-600 mt-4">
          💡 Une carte "Mes congés" est aussi disponible sur votre tableau de bord pour demander un congé à tout moment.
        </p>

        <button
          onClick={dismiss}
          className="w-full mt-5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Compris, commencer
        </button>
      </div>
    </div>
  );
}
