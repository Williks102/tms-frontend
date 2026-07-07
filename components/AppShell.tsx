'use client';

import { usePathname } from 'next/navigation';

// Enveloppe cliente : décide si la sidebar doit s'afficher selon la route.
// La sidebar (Server Component, lit le cookie de rôle) est passée en prop
// depuis app/layout.tsx plutôt que recréée ici — ce composant ne fait que
// choisir de l'afficher ou non.
export default function AppShell({ sidebar, children }: {
  sidebar:  React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === '/login' || pathname.startsWith('/board')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen print:hidden">
      {sidebar}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
