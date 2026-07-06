// lib/pageAccess.ts — Visibilité des pages par rôle
// Utilisé à la fois par proxy.ts (edge) et app/layout.tsx (Server Component) :
// pas de 'use client', pas d'API navigateur — doit rester exécutable des deux côtés.

export type Role = 'dg' | 'manager' | 'dispatcher' | 'rh' | 'caissier';

// Chaque entrée liste les rôles autorisés à voir la page (et ses sous-routes).
// Une page absente de cette liste (ex: /login) n'est pas filtrée ici.
export const PAGE_ACCESS: Record<string, Role[]> = {
  '/dashboard': ['dg', 'manager', 'dispatcher', 'rh', 'caissier'],
  '/planning':  ['manager'],
  '/vehicles':  ['manager', 'dispatcher'],
  '/drivers':   ['manager', 'rh'],
  '/fuel':      ['manager', 'dispatcher'],
  '/incidents': ['manager', 'dispatcher'],
  '/tickets':   ['manager', 'caissier'],
};

// Page de repli sûre pour tous les rôles — sert de cible de redirection.
export const FALLBACK_PAGE = '/dashboard';

export function canAccessPage(role: Role | null | undefined, pathname: string): boolean {
  const entry = Object.entries(PAGE_ACCESS).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!entry) return true;
  if (!role) return false;
  return entry[1].includes(role);
}

export function isKnownRole(value: string | undefined): value is Role {
  return value === 'dg' || value === 'manager' || value === 'dispatcher' || value === 'rh' || value === 'caissier';
}
