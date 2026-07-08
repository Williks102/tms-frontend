// lib/pageAccess.ts — Visibilité des pages par rôle
// Utilisé à la fois par proxy.ts (edge) et app/layout.tsx (Server Component) :
// pas de 'use client', pas d'API navigateur — doit rester exécutable des deux côtés.

export type Role = 'dg' | 'manager' | 'dispatcher' | 'rh' | 'caissier' | 'driver' | 'controleur';

// Chaque entrée liste les rôles autorisés à voir la page (et ses sous-routes).
// Une page absente de cette liste (ex: /login) n'est pas filtrée ici.
// Le chauffeur n'a pas accès à /dashboard (KPIs flotte/finance sans intérêt
// pour lui) — sa page dédiée est /driver, voir LANDING_PAGE ci-dessous.
// Idem caissier (/caisse) et contrôleur (/controle).
export const PAGE_ACCESS: Record<string, Role[]> = {
  '/dashboard': ['dg', 'manager', 'dispatcher', 'rh'],
  '/planning':  ['manager'],
  '/vehicles':  ['manager', 'dispatcher'],
  '/drivers':   ['manager', 'rh'],
  '/fuel':      ['manager', 'dispatcher'],
  '/incidents': ['manager', 'dispatcher'],
  '/tickets':   ['manager'],
  '/hr':        ['manager', 'rh'],
  '/driver':    ['driver'],
  '/caisse':    ['caissier'],
  '/controle':  ['manager', 'controleur'],
};

// Page de repli sûre pour tous les rôles — sert de cible de redirection par défaut.
export const FALLBACK_PAGE = '/dashboard';

// Page d'atterrissage après connexion / cible de redirection en cas d'accès
// refusé — par rôle, car /dashboard ne convient pas à tous.
export const LANDING_PAGE: Record<Role, string> = {
  dg:         '/dashboard',
  manager:    '/dashboard',
  dispatcher: '/dashboard',
  rh:         '/dashboard',
  caissier:   '/caisse',
  driver:     '/driver',
  controleur: '/controle',
};

export function landingPageFor(role: Role | null | undefined): string {
  if (!role) return FALLBACK_PAGE;
  return LANDING_PAGE[role] ?? FALLBACK_PAGE;
}

export function canAccessPage(role: Role | null | undefined, pathname: string): boolean {
  const entry = Object.entries(PAGE_ACCESS).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!entry) return true;
  if (!role) return false;
  return entry[1].includes(role);
}

export function isKnownRole(value: string | undefined): value is Role {
  return value === 'dg' || value === 'manager' || value === 'dispatcher' || value === 'rh' || value === 'caissier' || value === 'driver' || value === 'controleur';
}
