// hooks/useMyPurchases.ts
'use client';

import useSWR from 'swr';
import { apiFetchPublic } from '@/lib/api';
import { PublicParcelTracking } from './useColis';

export interface MyPurchaseTicket {
  reference:          string;
  status:              'pending' | 'paid' | 'boarded' | 'cancelled' | 'refunded';
  channel:             'physical' | 'online';
  price_fcfa:          number;
  seat_number:         number | null;
  purchased_at:        string | null;
  route: { code: string; origin_city: string; destination_city: string } | null;
  departure_datetime:  string | null;
}

export interface MyPurchases {
  tickets: MyPurchaseTicket[];
  parcels: PublicParcelTracking[];
}

export function useMyPurchases(phone: string | null) {
  return useSWR<MyPurchases>(
    phone ? `/mes-achats?phone=${encodeURIComponent(phone)}` : null,
    (u: string) => apiFetchPublic<MyPurchases>(u),
    { shouldRetryOnError: false }
  );
}
