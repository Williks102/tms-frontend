'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { OnboardingModal } from './OnboardingModal';

// Enveloppe cliente : décide si la sidebar doit s'afficher selon la route.
// La sidebar (Server Component, lit le cookie de rôle) est passée en prop
// depuis app/layout.tsx plutôt que recréée ici — ce composant ne fait que
// choisir de l'afficher ou non, et gère son ouverture en tiroir sur mobile
// (< lg) puisque la Sidebar elle-même ne peut pas porter d'état client.
export default function AppShell({ sidebar, children }: {
  sidebar:  React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ferme le tiroir automatiquement à chaque navigation (clic sur un lien)
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/board') || pathname.startsWith('/billets') || pathname.startsWith('/suivi-colis') || pathname.startsWith('/mes-achats')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen print:hidden">
      <OnboardingModal />

      {/* Fond assombri derrière le tiroir mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar : en place sur desktop (lg+), tiroir hors-écran sinon */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebar}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barre mobile avec bouton hamburger — masquée à partir de lg */}
        <div className="lg:hidden h-14 flex-shrink-0 flex items-center px-4 border-b border-slate-800/60 bg-[#080D1A]">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-white"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="ml-3 text-xs font-black text-white tracking-wider font-[family-name:var(--font-syne)]">
            TMS-CI
          </span>
        </div>

        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
