// ══════════════════════════════════════════════════════════════════════════
// lib/auth.ts — Helpers d'authentification côté client
// ══════════════════════════════════════════════════════════════════════════

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tms_token') || '';
}

export function getUser(): { name: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('tms_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('tms_token');
  localStorage.removeItem('tms_user');
  // Supprime aussi le cookie
  document.cookie = 'tms_token=; path=/; max-age=0';
  window.location.href = '/login';
}

export function saveTokenToCookie(token: string): void {
  // Cookie 7 jours, accessible par le middleware
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  document.cookie = `tms_token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}
