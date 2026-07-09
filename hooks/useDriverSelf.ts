// hooks/useDriverSelf.ts — libre-service chauffeur
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';
import { MonthlyScore } from './useDrivers';
import { Payslip } from './useComptabilite';

export interface MyDeparture {
  id:                  number;
  route?:              { id: number; code: string; name: string; origin_city: string; destination_city: string };
  vehicle?:            { id: number; plate_number: string; model: string } | null;
  departure_datetime:  string;
  estimated_arrival:   string;
  actual_departure:    string | null;
  actual_arrival:      string | null;
  boarding_gate:       string | null;
  status:              'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
}

export function useMyTodaySchedule() {
  return useSWR<{ data: MyDeparture[] }>('/planning/departures/mine/today', apiFetch, {
    refreshInterval: 15000,
  });
}

export async function markMyDepartureStatus(departureId: number, status: 'departed' | 'arrived') {
  const key = status === 'departed' ? 'actual_departure' : 'actual_arrival';
  return apiFetch(`/planning/departures/${departureId}/my-status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, [key]: new Date().toISOString() }),
  } as RequestInit);
}

export function useMyScores() {
  return useSWR<{ data: MonthlyScore[] }>('/drivers/mine/scores', apiFetch, {
    revalidateOnFocus: false,
  });
}

export function useMyPayslips() {
  return useSWR<{ data: Payslip[] }>('/comptabilite/payslips/mine', apiFetch, {
    revalidateOnFocus: false,
  });
}
