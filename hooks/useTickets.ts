// hooks/useTickets.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface Ticket {
  id:                   number;
  reference:            string;
  departure_id:         number;
  destination_stop_id:  number | null;
  passenger_name:       string;
  passenger_phone:      string | null;
  seat_number:          string | null;
  channel:              'physical' | 'online';
  payment_method:       'cash' | 'mobile_money' | 'card' | 'online';
  price_fcfa:           number;
  status:               'pending' | 'paid' | 'boarded' | 'cancelled' | 'refunded';
  purchased_at:         string;
  boarded_at:           string | null;
  cancellation_reason:  string | null;
  soldBy?: { id: number; name: string } | null;
  destination_stop?: { id: number; city_name: string; fare_from_origin: number } | null;
  departure?: {
    id: number;
    status: string;
    departure_datetime: string;
    boarding_gate: string | null;
    route: { name: string; code: string; destination_city: string };
  };
}

export interface TicketsResponse {
  data:         Ticket[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export interface TicketStats {
  today_count:   number;
  today_revenue: number;
  by_channel:    Record<string, number>;
  by_status:     Record<string, number>;
}

export interface TicketManifest {
  departure: {
    id: number;
    status: string;
    departure_datetime: string;
    boarding_gate: string | null;
    seats_available: number;
    route:   { name: string; code: string; base_fare: number };
    vehicle: { capacity: number } | null;
  };
  data: Ticket[];
  summary: {
    total:    number;
    boarded:  number;
    physical: number;
    online:   number;
  };
}

export function useTickets(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/tickets${query ? '?' + query : ''}`;
  return useSWR<TicketsResponse>(url, (u: string) => apiFetch(u), {
    refreshInterval: 15000,
  });
}

export function useTicketStats() {
  return useSWR<TicketStats>(
    '/tickets/stats',
    (url: string) => apiFetch(url),
    { refreshInterval: 15000 }
  );
}

export function useTicketManifest(departureId: number | null) {
  return useSWR<TicketManifest>(
    departureId ? `/tickets/departure/${departureId}/manifest` : null,
    (url: string) => apiFetch(url),
    { refreshInterval: 10000 }
  );
}
