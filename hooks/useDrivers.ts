// hooks/useDrivers.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface Driver {
  id:                  number;
  employee_number:     string;
  first_name:          string;
  last_name:           string;
  phone:               string;
  license_number:      string;
  license_category:    string;
  license_expires_at:  string;
  medical_expires_at:  string;
  hired_at:            string;
  status:              'available' | 'on_duty' | 'resting' | 'on_leave' | 'suspended';
}

export interface DriverDetail extends Driver {
  rest_logs:      RestLog[];
  trip_stats:     TripStat[];
  documents:      DriverDoc[];
  monthly_scores: MonthlyScore[];
}

export interface RestLog {
  id:                number;
  departure_id:      number;
  duty_start:        string;
  duty_end:          string | null;
  rest_start:        string | null;
  rest_end:          string | null;
  rest_duration_min: number | null;
  is_compliant:      boolean;
}

export interface TripStat {
  id:                      number;
  departure_id:            number;
  distance_km:             number;
  fuel_consumed_liters:    number;
  fuel_theoretical_liters: number;
  eco_score:               number | null;
  overspeed_events:        number;
  delay_min:               number;
  recorded_at:             string;
}

export interface MonthlyScore {
  id:                     number;
  month:                  string;
  trips_count:            number;
  total_distance_km:      number;
  avg_eco_score:          number | null;
  fuel_savings_liters:    number;
  total_overspeed_events: number;
  avg_delay_min:          number;
  rank:                   number | null;
  bonus_fcfa:             number | null;
}

export interface DriverDoc {
  id:          number;
  type:        string;
  expires_at:  string | null;
  is_verified: boolean;
  uploaded_at: string;
}

export interface DriversResponse {
  data:         Driver[];
  total:        number;
  current_page: number;
  last_page:    number;
}

export function useDrivers(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/drivers${query ? '?' + query : ''}`;
  return useSWR<DriversResponse>(url, apiFetch, { refreshInterval: 30000 });
}

export function useDriverDetail(id: number | null) {
  return useSWR<{
    driver:       DriverDetail;
    recent_score: number | null;
    score_level:  string | null;
  }>(
    id ? `/drivers/${id}` : null,
    apiFetch,
    { revalidateOnFocus: false }
  );
}

export function useMonthlyRanking(month?: string) {
  const url = `/drivers/scores/monthly${month ? `?month=${month}` : ''}`;
  return useSWR<{ data: (MonthlyScore & { driver: Driver })[]; month: string }>(
    url, apiFetch, { revalidateOnFocus: false }
  );
}
