// hooks/useIncidents.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface Incident {
  id:                    number;
  reference:             string;
  departure_id:          number | null;
  vehicle_id:            number;
  driver_id:             number;
  category:              'mechanical' | 'accident' | 'passenger' | 'road' | 'driver' | 'other';
  severity:              'low' | 'medium' | 'high' | 'critical';
  title:                 string;
  description:           string;
  location:              string | null;
  occurred_at:           string;
  status:                'open' | 'investigating' | 'resolved' | 'closed';
  resolution_notes:      string | null;
  resolved_at:           string | null;
  financial_impact_fcfa: number | null;
  vehicle?: { id: number; plate_number: string; model: string };
  driver?:  { id: number; first_name: string; last_name: string };
  actions?: IncidentAction[];
}

export interface IncidentAction {
  id:          number;
  action_type: string;
  description: string;
  taken_at:    string;
  cost_fcfa:   number | null;
  takenBy?:    { name: string };
}

export interface IncidentStats {
  open_count:           number;
  critical_count:       number;
  this_month:           number;
  by_category:          Record<string, number>;
  by_severity:          Record<string, number>;
  avg_resolution_hours: number | null;
}

export interface QualityScore {
  id:                     number;
  entity_type:            string;
  entity_id:              number;
  month:                  string;
  incidents_count:        number;
  critical_count:         number;
  high_count:             number;
  total_financial_impact: number;
  quality_score:          number;
  avg_resolution_hours:   number | null;
  driver?: { id: number; first_name: string; last_name: string };
}

export interface IncidentsResponse {
  data:         Incident[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useIncidents(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/incidents${query ? '?' + query : ''}`;
  return useSWR<IncidentsResponse>(url, (u: string) => apiFetch(u), {
    refreshInterval: 30000,
  });
}

export function useIncidentDetail(id: number | null) {
  return useSWR<Incident>(
    id ? `/incidents/${id}` : null,
    (url: string) => apiFetch(url),
    { revalidateOnFocus: false }
  );
}

export function useIncidentStats() {
  return useSWR<IncidentStats>(
    '/incidents/stats',
    (url: string) => apiFetch(url),
    { refreshInterval: 30000 }
  );
}

export function useQualityDrivers(month?: string) {
  const url = month
    ? `/incidents/quality/drivers?month=${month}`
    : '/incidents/quality/drivers';
  return useSWR<{ data: QualityScore[]; month: string }>(
    url,
    (u: string) => apiFetch(u),
    { revalidateOnFocus: false }
  );
}
