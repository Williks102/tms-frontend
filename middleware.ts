// ══════════════════════════════════════════════════════════════════════════
// middleware.ts  (à la racine du projet tms-frontend/)
// Protège toutes les routes sauf /login
// ══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token    = request.cookies.get('tms_token')?.value;
  const pathname = request.nextUrl.pathname;

  // Pages publiques — pas de redirection
  if (pathname === '/login') {
    // Si déjà connecté → redirect dashboard
    if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
  }

  // Pages protégées — token obligatoire
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};


