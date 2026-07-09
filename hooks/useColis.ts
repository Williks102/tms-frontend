// hooks/useColis.ts
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { apiFetch, apiFetchPublic } from '@/lib/api';

export interface Parcel {
  id:                      number;
  tracking_number:         string;
  pickup_code:             string;
  departure_id:            number;
  destination_stop_id:     number | null;
  sender_name:             string;
  sender_phone:            string;
  recipient_name:          string;
  recipient_phone:         string;
  category:                'standard' | 'fragile' | 'perissable' | 'liquide';
  description:             string | null;
  weight_kg:               number;
  declared_value_fcfa:     number;
  transport_fee_fcfa:      number;
  insurance_fee_fcfa:      number;
  total_fee_fcfa:          number;
  payment_responsibility:  'expediteur' | 'destinataire';
  payment_status:          'pending' | 'paid';
  status:                  'enregistre' | 'arrive' | 'retire' | 'retourne' | 'perdu' | 'annule';
  registered_by:           number;
  released_by:             number | null;
  registered_at:           string;
  arrived_at:              string | null;
  released_at:             string | null;
  returned_at:             string | null;
  exception_reason:        string | null;
  accounting_entry_id:     number | null;
  departure?: {
    id: number;
    route: { code: string; name: string; origin_city: string; destination_city: string };
  };
  registeredBy?: { id: number; name: string };
  releasedBy?:   { id: number; name: string } | null;
}

export interface ParcelQuote {
  transport_fee_fcfa: number;
  insurance_fee_fcfa: number;
  total_fee_fcfa:     number;
}

interface Paginated<T> {
  data:         T[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useParcels(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/colis${query ? '?' + query : ''}`;
  return useSWR<Paginated<Parcel>>(url, (u: string) => apiFetch<Paginated<Parcel>>(u), {
    refreshInterval: 15000,
  });
}

export function useParcelDetail(id: number | null) {
  return useSWR<{ parcel: Parcel }>(
    id ? `/colis/${id}` : null,
    (u: string) => apiFetch<{ parcel: Parcel }>(u)
  );
}

// Prévisualisation tarif — débouncée pour ne pas spammer /colis/quote à
// chaque frappe. La formule vit uniquement côté backend (ParcelPricingService).
export function useParcelQuote(weightKg: number, declaredValue: number) {
  const [quote, setQuote] = useState<ParcelQuote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weightKg || weightKg <= 0 || declaredValue < 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const result = await apiFetch<ParcelQuote>('/colis/quote', {
          method: 'POST',
          body: JSON.stringify({ weight_kg: weightKg, declared_value_fcfa: declaredValue }),
        } as RequestInit);
        setQuote(result);
      } catch {
        setQuote(null);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [weightKg, declaredValue]);

  return { quote, loading };
}

// ── Suivi public (page /suivi-colis, sans compte) ──────────────────────────
export interface PublicParcelTracking {
  tracking_number: string;
  status:          Parcel['status'];
  category:        Parcel['category'];
  route: { origin_city: string; destination_city: string } | null;
  sender_name:             string;
  recipient_name:          string;
  recipient_phone_masked:  string | null;
  registered_at: string | null;
  arrived_at:    string | null;
  released_at:   string | null;
  returned_at:   string | null;
}

export function useTrackParcel(trackingNumber: string | null) {
  return useSWR<{ parcel: PublicParcelTracking }>(
    trackingNumber ? `/colis/track/${trackingNumber}` : null,
    (u: string) => apiFetchPublic<{ parcel: PublicParcelTracking }>(u),
    { shouldRetryOnError: false }
  );
}
