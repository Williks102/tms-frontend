// hooks/useDashboard.ts
'use client';

import useSWR from 'swr';
import { DashboardLive, RentabiliteData, apiFetch } from '@/lib/api';

const POLL_INTERVAL = 8000; // 8 secondes

export function useDashboardLive() {
  return useSWR<DashboardLive>(
    '/dashboard/live',
    (url: string) => apiFetch<DashboardLive>(url),
    {
      refreshInterval: POLL_INTERVAL,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );
}

export function useRentabilite(date?: string) {
  const url = date ? `/dashboard/rentabilite?date=${date}` : '/dashboard/rentabilite';
  return useSWR<RentabiliteData>(
    url,
    (u: string) => apiFetch<RentabiliteData>(u),
    { refreshInterval: 60000 } // 1 min
  );
}
