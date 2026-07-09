// hooks/usePlanning.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface Route {
  id:                     number;
  code:                   string;
  name:                   string;
  origin_city:            string;
  origin_station:         { id: number; name: string; city: string } | null;
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
  boarding_time:       string | null;
  boarding_due:        boolean;
  boarding_gate:       string | null;
  seats_available:     number;
  cargo_capacity_kg:   number | null;
  cargo_used_kg:       number | null;
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

export interface Vehicle {
  id:            number;
  plate_number:  string;
  model:         string;
  capacity:      number;
  status:        'available' | 'on_trip' | 'boarding' | 'maintenance' | 'inactive';
}

export interface Station {
  id:           number;
  name:         string;
  city:         string;
  is_active:    boolean;
  gates_count?: number;
}

export interface BoardingGate {
  id:         number;
  station_id: number;
  station:    { id: number; name: string; city: string } | null;
  gate_code:  string;
  is_active:  boolean;
}

export function useRoutes(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/planning/routes${query ? '?' + query : ''}`;

  return useSWR<{ data: Route[] }>(
    url,
    (u: string) => apiFetch(u),
    { revalidateOnFocus: false }
  );
}

export function useGates() {
  return useSWR<{ data: BoardingGate[] }>(
    '/planning/gates',
    (url: string) => apiFetch(url),
    { revalidateOnFocus: false }
  );
}

export function useStations() {
  return useSWR<{ data: Station[] }>(
    '/planning/stations',
    (url: string) => apiFetch(url),
    { revalidateOnFocus: false }
  );
}

export function useAvailableVehicles(departureDatetime: string, estimatedArrival: string, excludeDepartureId?: number) {
  const ready = Boolean(departureDatetime && estimatedArrival);
  const params: Record<string, string> = {
    departure_datetime: departureDatetime,
    estimated_arrival:  estimatedArrival,
  };
  if (excludeDepartureId) params.exclude_departure_id = String(excludeDepartureId);
  const query = new URLSearchParams(params).toString();

  return useSWR<{ data: Vehicle[] }>(
    ready ? `/planning/vehicles/available?${query}` : null,
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
