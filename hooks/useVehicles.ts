// hooks/useVehicles.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface Vehicle {
  id:                          number;
  plate_number:                string;
  model:                       string;
  capacity:                    number;
  fuel_consumption_per_100km:  number;
  current_mileage_km:          number;
  last_maintenance_km:         number;
  maintenance_interval_km:     number;
  status:                      'available' | 'on_trip' | 'boarding' | 'maintenance' | 'inactive';
  notes:                       string | null;
}

export interface MaintenancePlanSummary {
  id:               number;
  type:             string;
  trigger_km:       number | null;
  trigger_date:     string | null;
  alert_km_before:  number;
  status:           'upcoming' | 'due' | 'overdue' | 'completed';
  estimated_cost:   number | null;
}

export interface MaintenanceRecordSummary {
  id:                   number;
  type:                 string;
  performed_at:         string;
  mileage_at_service:   number;
  garage_name:          string;
  cost_fcfa:            number;
}

export interface VehicleIncidentSummary {
  id:         number;
  reference:  string;
  category:   string;
  severity:   'low' | 'medium' | 'high' | 'critical';
  title:      string;
  status:     string;
  occurred_at: string;
}

export interface FuelConsumptionSummary {
  id:                     number;
  liters_consumed:        number;
  distance_km:            number;
  consumption_per_100km:  number;
  recorded_at:            string;
}

export interface VehicleDetail extends Vehicle {
  maintenance_plans:    MaintenancePlanSummary[];
  maintenance_records:  MaintenanceRecordSummary[];
  incidents:            VehicleIncidentSummary[];
  fuel_consumption_logs: FuelConsumptionSummary[];
}

export interface VehiclesResponse {
  data:         Vehicle[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useVehicles(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/vehicles${query ? '?' + query : ''}`;
  return useSWR<VehiclesResponse>(url, (u: string) => apiFetch(u), {
    refreshInterval: 15000,
  });
}

export function useVehicleDetail(id: number | null) {
  return useSWR<{
    vehicle:                VehicleDetail;
    needs_maintenance:      boolean;
    km_before_maintenance:  number;
  }>(
    id ? `/vehicles/${id}` : null,
    (u: string) => apiFetch(u),
    { revalidateOnFocus: false }
  );
}
