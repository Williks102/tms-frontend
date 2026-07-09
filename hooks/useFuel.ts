// hooks/useFuel.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface FuelVoucher {
  id:                  number;
  departure_id:        number;
  driver_id:           number;
  vehicle_id:          number;
  requested_liters:    number;
  theoretical_liters:  number;
  approved_liters:     number | null;
  fuel_type:           'gasoil' | 'essence' | 'gpl';
  price_per_liter:     number;
  total_cost:          number | null;
  station_name:        string | null;
  status:              'pending' | 'approved' | 'rejected' | 'consumed';
  rejection_reason:    string | null;
  requested_at:        string;
  approved_at:         string | null;
  driver?:  { id: number; first_name: string; last_name: string };
  vehicle?: { id: number; plate_number: string; model: string };
  departure?: {
    id: number;
    route: { name: string; code: string; distance_km: number };
  };
}

export interface ConsumptionLog {
  id:                     number;
  vehicle_id:             number;
  departure_id:           number;
  liters_consumed:        number;
  distance_km:            number;
  consumption_per_100km:  number;
  mileage_before:         number;
  mileage_after:          number;
  recorded_at:            string;
  vehicle?: { plate_number: string; model: string };
}

export interface MaintenancePlan {
  id:               number;
  vehicle_id:       number;
  type:             'oil_change' | 'tire' | 'brake' | 'full_service' | 'other';
  trigger_km:       number | null;
  trigger_date:     string | null;
  interval_km:      number | null;
  alert_km_before:  number;
  status:           'upcoming' | 'due' | 'overdue' | 'completed';
  estimated_cost:   number | null;
  notes:            string | null;
  vehicle?: { id: number; plate_number: string; model: string; current_mileage_km: number };
}

export interface FuelVouchersResponse {
  data:         FuelVoucher[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export interface ConsumptionStatsResponse {
  data: {
    vehicle_id:              number;
    plate_number:            string;
    avg_consumption_per_100: number;
    total_liters:            number;
    total_distance_km:       number;
  }[];
}

export function useFuelVouchers(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/fuel/vouchers${query ? '?' + query : ''}`;
  return useSWR<FuelVouchersResponse>(url, (u: string) => apiFetch(u), {
    refreshInterval: 15000,
  });
}

export function useMaintenancePlans(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/maintenance/plans${query ? '?' + query : ''}`;
  return useSWR<{ data: MaintenancePlan[] }>(url, (u: string) => apiFetch(u), {
    refreshInterval: 30000,
  });
}

export function useMaintenanceDue() {
  return useSWR<{ data: MaintenancePlan[] }>(
    '/maintenance/due',
    (url: string) => apiFetch(url),
    { refreshInterval: 30000 }
  );
}

export function useConsumptionStats() {
  return useSWR<ConsumptionStatsResponse>(
    '/fuel/consumption/stats',
    (url: string) => apiFetch(url),
    { revalidateOnFocus: false }
  );
}

export interface ConsumptionLogsResponse {
  data:         ConsumptionLog[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useConsumptionLogs(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/fuel/consumption${query ? '?' + query : ''}`;
  return useSWR<ConsumptionLogsResponse>(url, (u: string) => apiFetch<ConsumptionLogsResponse>(u));
}
