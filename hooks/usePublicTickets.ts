import useSWR from 'swr';
import { apiFetchPublic, PublicRoute, PublicDeparture } from '@/lib/api';

export function usePublicRoutes() {
  return useSWR<{ data: PublicRoute[] }>(
    '/tickets/online/routes',
    (url: string) => apiFetchPublic(url),
    { revalidateOnFocus: false }
  );
}

export function usePublicDepartures(routeId: number | null, date: string) {
  const query = routeId ? `?route_id=${routeId}&date=${date}` : null;

  return useSWR<{ data: PublicDeparture[] }>(
    query ? `/tickets/online/departures${query}` : null,
    (url: string) => apiFetchPublic(url),
    { revalidateOnFocus: false }
  );
}
