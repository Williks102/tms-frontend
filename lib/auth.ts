// ══════════════════════════════════════════════════════════════════════════
// lib/auth.ts — Helpers d'authentification côté client
//
// Sanctum SPA (cookie httpOnly) — voir correctif.md point 4. Le jeton
// d'authentification n'existe plus côté client : ni localStorage, ni cookie
// lisible en JS. Le cookie de session est géré entièrement par Laravel et
// n'est jamais accessible à du JavaScript, même via une XSS sur cette page.
// ══════════════════════════════════════════════════════════════════════════
import { withCsrfHeader } from './csrf';

export type Role = 'dg' | 'manager' | 'dispatcher' | 'rh' | 'caissier' | 'driver' | 'controleur' | 'comptable' | 'agent_colis' | 'super_admin';

export interface AuthUser {
  name:  string;
  email: string;
  role:  Role;
}

// Non sensible — juste des infos d'affichage (nom/rôle pour la sidebar). La
// preuve d'identité réelle est le cookie de session httpOnly, jamais stocké ici.
export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('tms_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tms_user', JSON.stringify(user));
}

// Cookie non-HttpOnly, lu par proxy.ts (middleware Next.js) et le layout
// serveur pour les décisions de routage par rôle — signal UX seulement,
// jamais l'autorité de sécurité (chaque route API vérifie le rôle elle-même
// côté serveur, indépendamment de ce que ce cookie affirme). Durée alignée
// sur SESSION_LIFETIME côté backend (120 min par défaut, config/session.php)
// — un cookie qui survit bien plus longtemps que la session réelle ferait
// croire à proxy.ts que l'utilisateur est connecté alors que sa session a
// déjà expiré côté serveur, jusqu'au premier appel API qui échouerait en 401.
const ROLE_COOKIE_MAX_AGE_SECONDS = 120 * 60;

export function saveRoleToCookie(role: string): void {
  document.cookie = `tms_role=${role}; path=/; max-age=${ROLE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return;

  const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:8000/api';
  try {
    // Invalide la session côté serveur — best effort : le nettoyage local
    // doit avoir lieu même si cet appel échoue (session déjà expirée,
    // backend injoignable...). Jeton CSRF obligatoire ici aussi : sans lui,
    // Laravel rejette ce POST en 419 avant d'exécuter Auth::logout() côté
    // serveur, et la session reste valide malgré la déconnexion apparente
    // côté client (piège réel identifié en revue de code).
    const headers = new Headers({ Accept: 'application/json' });
    await withCsrfHeader(headers, 'POST');
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  } catch {
    // Silencieux — voir commentaire ci-dessus.
  }

  localStorage.removeItem('tms_user');
  document.cookie = 'tms_role=; path=/; max-age=0';
  window.location.href = '/login';
}
