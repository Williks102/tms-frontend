// hooks/useFret.ts
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface FreightClient {
  id:            number;
  company_name:  string;
  contact_name:  string | null;
  phone:         string;
  email:         string | null;
  address:       string | null;
  notes:         string | null;
  shipments?:    FreightShipment[];
}

export interface FreightShipment {
  id:                   number;
  reference:            string;
  freight_client_id:    number;
  vehicle_id:           number | null;
  driver_id:            number | null;
  origin_city:          string;
  destination_city:     string;
  distance_km:          number;
  weight_tons:          number;
  cargo_description:    string | null;
  price_fcfa:           number;
  status:               'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  payment_status:       'pending' | 'invoiced' | 'paid';
  scheduled_at:         string | null;
  departed_at:          string | null;
  delivered_at:         string | null;
  cancellation_reason:  string | null;
  created_by:           number;
  client?:  { id: number; company_name: string; contact_name: string | null; phone: string };
  vehicle?: { id: number; plate_number: string; model: string; type: 'bus' | 'truck' } | null;
  driver?:  { id: number; first_name: string; last_name: string } | null;
}

export interface FreightQuote {
  price_fcfa: number;
}

export interface FreightPricingSettings {
  id:                    number;
  rate_per_ton_km_fcfa:  number;
  minimum_fee_fcfa:      number;
}

interface Paginated<T> {
  data:         T[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useFreightClients(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/fret/clients${query ? '?' + query : ''}`;
  return useSWR<Paginated<FreightClient>>(url, (u: string) => apiFetch<Paginated<FreightClient>>(u));
}

export function useFreightClientDetail(id: number | null) {
  return useSWR<{ client: FreightClient }>(
    id ? `/fret/clients/${id}` : null,
    (u: string) => apiFetch<{ client: FreightClient }>(u)
  );
}

export function useFreightShipments(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/fret/shipments${query ? '?' + query : ''}`;
  return useSWR<Paginated<FreightShipment>>(url, (u: string) => apiFetch<Paginated<FreightShipment>>(u), {
    refreshInterval: 15000,
  });
}

export function useFreightShipmentDetail(id: number | null) {
  return useSWR<{ shipment: FreightShipment }>(
    id ? `/fret/shipments/${id}` : null,
    (u: string) => apiFetch<{ shipment: FreightShipment }>(u)
  );
}

export function useFreightPricingSettings() {
  return useSWR<{ settings: FreightPricingSettings }>(
    '/fret/pricing-settings',
    (u: string) => apiFetch<{ settings: FreightPricingSettings }>(u)
  );
}

// Prévisualisation tarif — débouncée, la formule tonnage×km ne vit que
// côté backend (FreightPricingService), même pattern que useParcelQuote.
export function useFreightQuote(weightTons: number, distanceKm: number) {
  const [quote, setQuote] = useState<FreightQuote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weightTons || weightTons <= 0 || !distanceKm || distanceKm <= 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const result = await apiFetch<FreightQuote>('/fret/quote', {
          method: 'POST',
          body: JSON.stringify({ weight_tons: weightTons, distance_km: distanceKm }),
        } as RequestInit);
        setQuote(result);
      } catch {
        setQuote(null);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [weightTons, distanceKm]);

  return { quote, loading };
}
