import useSWR from 'swr';
import { apiFetchPublic, PublicRoute, PublicDeparture } from '@/lib/api';
import { Ticket } from './useTickets';

// Les 5 canaux acceptés par PaiementPro pour la Côte d'Ivoire — voir
// App\Services\Payments\PaiementProService::CHANNELS (backend, source de vérité).
export const PAYMENT_CHANNELS: { value: string; label: string; icon: string }[] = [
  { value: 'CARD',   label: 'Carte bancaire', icon: '💳' },
  { value: 'OMCIV2', label: 'Orange Money',   icon: '🟠' },
  { value: 'MOMOCI', label: 'MTN Money',      icon: '🟡' },
  { value: 'MOOVCI', label: 'Moov Money',     icon: '🔵' },
  { value: 'WAVECI', label: 'Wave',           icon: '💠' },
];

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

export interface OnlinePaymentStatus {
  status: 'pending' | 'paid' | 'boarded' | 'cancelled' | 'refunded' | 'unknown';
  ticket: Ticket | null;
}

// Interrogé par /billets/retour après redirection PaiementPro — la
// redirection navigateur seule n'est pas fiable, la confirmation réelle
// vient du webhook serveur-à-serveur qui peut arriver avant ou après.
// refreshInterval actif tant que le paiement n'est pas dans un état final.
export function usePaymentStatus(ref: string | null) {
  return useSWR<OnlinePaymentStatus>(
    ref ? `/tickets/online/status?ref=${ref}` : null,
    (url: string) => apiFetchPublic(url),
    {
      refreshInterval: (data) => (!data || data.status === 'pending') ? 3000 : 0,
      shouldRetryOnError: false,
    }
  );
}
