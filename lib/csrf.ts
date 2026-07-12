// ══════════════════════════════════════════════════════════════════════════
// lib/csrf.ts — Sanctum SPA (cookie httpOnly, voir correctif.md point 4)
//
// Une fois le frontend déclaré "stateful" (SANCTUM_STATEFUL_DOMAINS), Laravel
// exige un jeton CSRF valide sur toute requête POST/PUT/PATCH/DELETE venant
// de cette origine — authentifiée OU publique (ex: achat de billet anonyme
// sur /billets, ou /login lui-même avant toute session). Module séparé de
// lib/api.ts et lib/auth.ts pour que les deux puissent l'utiliser sans
// dépendance circulaire entre eux (lib/api.ts importe déjà logout() depuis
// lib/auth.ts).
// ══════════════════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
// Racine Laravel (sans /api/v1) — /sanctum/csrf-cookie vit hors du préfixe API.
const APP_URL = API_URL.replace(/\/api\/v1\/?$/, '');

let csrfPrimed = false;

// Primé une seule fois par session de page (variable module-level) — mais
// seulement en cas de succès : une réponse d'erreur ne doit jamais laisser
// croire que le cookie est posé, sous peine de bloquer silencieusement
// toute requête mutante pour le reste de la vie de l'onglet.
export async function ensureCsrfCookie(): Promise<void> {
  if (csrfPrimed) return;
  if (getCsrfTokenFromCookie()) {
    // Cookie déjà présent (session encore valide après un rechargement de
    // page, par exemple) — pas besoin d'un aller-retour réseau supplémentaire.
    csrfPrimed = true;
    return;
  }

  const res = await fetch(`${APP_URL}/sanctum/csrf-cookie`, { credentials: 'include' });
  if (res.ok) csrfPrimed = true;
}

export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Prime le cookie CSRF si nécessaire puis attache X-XSRF-TOKEN sur les
// méthodes mutantes — no-op sur GET/HEAD (jamais protégées par CSRF).
export async function withCsrfHeader(headers: Headers, method: string): Promise<void> {
  if (!MUTATING_METHODS.has(method.toUpperCase())) return;
  await ensureCsrfCookie();
  const csrf = getCsrfTokenFromCookie();
  if (csrf) headers.set('X-XSRF-TOKEN', csrf);
}
