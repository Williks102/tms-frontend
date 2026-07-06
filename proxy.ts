// ══════════════════════════════════════════════════════════════════════════
// proxy.ts  (à la racine du projet tms-frontend/)
// Protège toutes les routes sauf /login, et restreint chaque page au rôle
// autorisé à la voir (voir lib/pageAccess.ts).
// Renommé depuis middleware.ts : convention `middleware` dépréciée en Next.js 16.
// ══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { canAccessPage, isKnownRole, landingPageFor } from '@/lib/pageAccess';

export function proxy(request: NextRequest) {
  const token    = request.cookies.get('tms_token')?.value;
  const roleRaw  = request.cookies.get('tms_role')?.value;
  const role     = isKnownRole(roleRaw) ? roleRaw : undefined;
  const pathname = request.nextUrl.pathname;
  const landing  = landingPageFor(role);

  // Pages publiques — pas de redirection
  if (pathname === '/login') {
    // Si déjà connecté → redirect vers SA page d'atterrissage (pas forcément /dashboard)
    if (token) return NextResponse.redirect(new URL(landing, request.url));
    return NextResponse.next();
  }

  // Pages protégées — token obligatoire
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Vue non autorisée pour ce rôle → redirection vers SA page d'atterrissage
  // (comparé à `landing`, pas à un FALLBACK_PAGE fixe, pour ne pas boucler si
  // le rôle courant n'a lui-même pas accès à /dashboard — cas du chauffeur)
  if (!canAccessPage(role, pathname) && pathname !== landing) {
    return NextResponse.redirect(new URL(landing, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
