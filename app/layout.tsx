// app/layout.tsx — version finale avec logout
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Syne, JetBrains_Mono } from 'next/font/google';
import { PAGE_ACCESS, isKnownRole } from '@/lib/pageAccess';
import './globals.css';

const syne = Syne({
  subsets:  ['latin'],
  variable: '--font-syne',
  weight:   ['400', '600', '700', '800'],
});

const jetbrains = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-mono',
  weight:   ['400', '500'],
});

export const metadata: Metadata = {
  title:       'TMS — Transport Management System',
  description: 'Tableau de bord opérationnel — Côte d\'Ivoire',
};

// ── Composant sidebar (Server Component) ──────────────────────────────────
async function Sidebar() {
  const cookieStore = await cookies();
  const roleRaw     = cookieStore.get('tms_role')?.value;
  const role        = isKnownRole(roleRaw) ? roleRaw : undefined;

  const allNavLinks = [
    { href: '/dashboard', icon: '◈', label: 'Dashboard'  },
    { href: '/planning',  icon: '⊞', label: 'Planning'   },
    { href: '/drivers',   icon: '◉', label: 'Chauffeurs' },
    { href: '/fuel',      icon: '⛽', label: 'Carburant'  },
    { href: '/incidents', icon: '⚡', label: 'Incidents'  },
    { href: '/tickets',   icon: '🎫', label: 'Billets'    },
  ];

  const navLinks = allNavLinks.filter(
    link => !role || (PAGE_ACCESS[link.href]?.includes(role) ?? true)
  );

  return (
    <aside className="w-16 lg:w-56 flex-shrink-0 border-r border-slate-800/60 bg-[#080D1A] flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black font-[family-name:var(--font-syne)]">T</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-black text-white tracking-wider font-[family-name:var(--font-syne)]">
              TMS-CI
            </p>
            <p className="text-[9px] text-slate-600 font-[family-name:var(--font-mono)]">
              Transport Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navLinks.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            <span className="hidden lg:block font-[family-name:var(--font-syne)] font-semibold">
              {item.label}
            </span>
          </a>
        ))}
      </nav>

      {/* Footer sidebar avec logout */}
      <div className="p-3 border-t border-slate-800/60">
        <LogoutButton />
      </div>
    </aside>
  );
}

// ── Bouton logout (Client Component) ──────────────────────────────────────
// Séparé pour pouvoir utiliser 'use client' sans contaminer le layout entier
import LogoutButton from '@/components/LogoutButton';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${syne.variable} ${jetbrains.variable}`}>
      <body className="bg-[#060A14] text-slate-300 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
