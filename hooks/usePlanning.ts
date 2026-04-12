// hooks/usePlanning.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface Route {
  id:                     number;
  code:                   string;
  name:                   string;
  origin_city:            string;
  destination_city:       string;
  distance_km:            number;
  estimated_duration_min: number;
  is_dynamic:             boolean;
  base_fare:              number;
  is_active:              boolean;
  stops?:                 RouteStop[];
}

export interface RouteStop {
  id:                       number;
  city_name:                string;
  stop_order:               number;
  distance_from_origin_km:  number;
  fare_from_origin:         number;
}

export interface Departure {
  id:                  number;
  is_manual:           boolean;
  route: {
    id:                     number;
    code:                   string;
    name:                   string;
    origin_city:            string;
    destination_city:       string;
    distance_km:            number;
    estimated_duration_min: number;
    base_fare:              number;
  };
  vehicle: {
    id:            number;
    plate_number:  string;
    model:         string;
    capacity:      number;
    status:        string;
  } | null;
  driver: {
    id:        number;
    full_name: string;
    phone:     string;
  } | null;
  departure_datetime:  string;
  estimated_arrival:   string;
  actual_departure:    string | null;
  actual_arrival:      string | null;
  boarding_gate:       string | null;
  seats_available:     number;
  status:              'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
  delay_minutes:       number | null;
  cancellation_reason: string | null;
  notes:               string | null;
}

export interface DeparturesResponse {
  data:          Departure[];
  current_page:  number;
  last_page:     number;
  total:         number;
  per_page:      number;
}

export function useRoutes() {
  return useSWR<{ data: Route[] }>(
    '/planning/routes',
    (url: string) => apiFetch(url),
    { revalidateOnFocus: false }
  );
}

export function useDepartures(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/planning/departures${query ? '?' + query : ''}`;

  return useSWR<DeparturesResponse>(
    url,
    (u: string) => apiFetch(u),
    { refreshInterval: 15000 }
  );
}

export function useLiveDepartures() {
  return useSWR<{ data: Departure[] }>(
    '/planning/departures/live',
    (url: string) => apiFetch(url),
    { refreshInterval: 8000 }
  );
}
