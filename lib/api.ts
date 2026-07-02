// lib/api.ts — version finale avec token dynamique
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tms_token') || process.env.NEXT_PUBLIC_API_TOKEN || '';
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (res.status === 401) {
    // Token expiré → redirect login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tms_token');
      localStorage.removeItem('tms_user');
      window.location.href = '/login';
    }
    throw new Error('Non authentifié');
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${endpoint}`);
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
  fuel_cost_today_fcfa: number;
  pending_vouchers:     number;
  revenue_today_fcfa:   number;
}

export interface LiveDeparture {
  id:                 number;
  route:              string;
  route_code:         string;
  vehicle:            string;
  driver:             string;
  status:             'boarding' | 'departed';
  boarding_gate:      string | null;
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

export function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}
