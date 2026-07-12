// lib/api.ts — Sanctum SPA (cookie httpOnly, voir correctif.md point 4)
import { logout } from './auth';
import { withCsrfHeader } from './csrf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function buildRequest(endpoint: string, options: RequestInit): Promise<{ url: string; init: RequestInit }> {
  const method = (options.method ?? 'GET').toString();
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  // Ne pas forcer application/json sur un FormData (upload de fichier) — le
  // navigateur doit fixer lui-même le Content-Type avec la boundary multipart.
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  await withCsrfHeader(headers, method);

  return {
    url: `${API_URL}${endpoint}`,
    init: { ...options, headers, credentials: 'include', cache: 'no-store' },
  };
}

async function parseErrorMessage(res: Response, endpoint: string): Promise<string> {
  let errorMessage = `API error ${res.status} on ${endpoint}`;
  try {
    const errorData = await res.json();
    // 422 Unprocessable Entity — validation errors
    if (res.status === 422 && errorData.errors) {
      const validationErrors = Object.entries(errorData.errors)
        .map(([field, messages]: [string, any]) => {
          const msgs = Array.isArray(messages) ? messages : [messages];
          return `${field}: ${msgs.join(', ')}`;
        })
        .join(' | ');
      errorMessage = validationErrors || errorMessage;
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
  } catch {
    // Si la réponse n'est pas du JSON, utiliser le message générique
  }
  return errorMessage;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { url, init } = await buildRequest(endpoint, options);
  const res = await fetch(url, init);

  // 401 (session absente/expirée) et 419 (jeton CSRF invalide/expiré — arrive
  // typiquement pour la même raison, la session sous-jacente n'est plus
  // valide) → déconnexion complète (localStorage ET cookie tms_role, voir
  // logout() dans lib/auth.ts). Sans le nettoyage du cookie de rôle,
  // proxy.ts croirait l'utilisateur toujours connecté et le rebondirait
  // aussitôt vers sa page d'atterrissage — boucle de rechargement complet
  // qui remonte AppShell à zéro à chaque poll SWR une fois la session
  // expirée côté serveur (SESSION_LIFETIME, config/session.php).
  if (res.status === 401 || res.status === 419) {
    logout();
    throw new Error('Non authentifié');
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, endpoint));
  }

  return res.json();
}

// Variante sans compte utilisateur — pages publiques (board de gare, achat de
// billet en ligne), pas de session applicative derrière. Ne redirige jamais
// vers /login sur erreur. Envoie quand même les cookies + un jeton CSRF sur
// les méthodes mutantes : une fois le frontend stateful, Laravel l'exige même
// pour un visiteur anonyme (voir lib/csrf.ts) — sans ça, POST /tickets/online
// échouerait en 419 pour tout le monde, pas seulement les comptes gestionnaires.
export async function apiFetchPublic<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { url, init } = await buildRequest(endpoint, options);
  const res = await fetch(url, init);

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, endpoint));
  }

  return res.json();
}

// ── Types partagés ────────────────────────────────────────────────────────
export interface FleetStatus {
  on_trip:     number;
  boarding:    number;
  available:   number;
  maintenance: number;
  total:       number;
}

export interface DriversStatus {
  on_duty:   number;
  available: number;
  resting:   number;
  on_leave:  number;
}

export interface AlertsSummary {
  critical: number;
  warning:  number;
  info:     number;
  total:    number;
  latest:   Alert[];
}

export interface Alert {
  id:          number;
  type:        string;
  severity:    'critical' | 'warning' | 'info';
  message:     string;
  entity_type: string;
  entity_id:   number;
  created_at:  string;
}

export interface FinanceSummary {
  fuel_cost_today_fcfa:    number;
  pending_vouchers:        number;
  revenue_today_fcfa:      number;
  revenue_real_today_fcfa: number;
}

export interface LiveDeparture {
  id:                 number;
  route:              string;
  route_code:         string;
  vehicle:            string;
  driver:             string;
  status:             'scheduled' | 'boarding' | 'departed';
  boarding_gate:      string | null;
  boarding_time:      string | null;
  boarding_due:       boolean;
  departure_datetime: string;
  estimated_arrival:  string;
  actual_departure:   string | null;
  delay_minutes:      number | null;
}

export interface DashboardLive {
  fleet:        FleetStatus;
  drivers:      DriversStatus;
  alerts:       AlertsSummary;
  finance:      FinanceSummary;
  departures:   LiveDeparture[];
  generated_at: string;
}

export interface RentabiliteLine {
  route_code:       string;
  route_name:       string;
  departures_count: number;
  revenue_fcfa:     number;
  fuel_cost_fcfa:   number;
  driver_cost_fcfa: number;
  toll_cost_fcfa:   number;
  net_profit_fcfa:  number;
  margin_percent:   number;
}

export interface RentabiliteData {
  date:   string;
  lines:  RentabiliteLine[];
  totals: { revenue_fcfa: number; fuel_cost_fcfa: number; net_profit_fcfa: number };
}

// ── Écran public "Départs / Arrivées" ──────────────────────────────────────
export interface BoardStation {
  id:   number;
  name: string;
  city: string;
}

export interface BoardDeparture {
  id: number;
  route: {
    code:             string;
    name:             string;
    origin_city:      string;
    destination_city: string;
  };
  vehicle: { plate_number: string } | null;
  departure_datetime: string;
  estimated_arrival:  string;
  actual_departure:   string | null;
  actual_arrival:     string | null;
  boarding_gate:      string | null;
  status:              'scheduled' | 'boarding' | 'departed' | 'arrived';
  delay_minutes:       number | null;
}

export interface BoardData {
  station:      BoardStation | null;
  departures:   BoardDeparture[];
  arrivals:     BoardDeparture[];
  generated_at: string;
}

// ── Achat de billet en ligne (page publique /billets) ──────────────────────
export interface PublicRouteStop {
  id:               number;
  city_name:        string;
  stop_order:       number;
  fare_from_origin: number;
}

export interface PublicRoute {
  id:                     number;
  code:                   string;
  name:                   string;
  origin_city:            string;
  destination_city:       string;
  distance_km:            number;
  estimated_duration_min: number;
  base_fare:              number;
  is_dynamic:             boolean;
  stops:                  PublicRouteStop[];
}

export interface PublicDeparture {
  id:                  number;
  departure_datetime:  string;
  estimated_arrival:   string;
  seats_available:     number;
  boarding_gate:       string | null;
}

export function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}
