// hooks/useSuperAdmin.ts — voir CLAUDE.md § Revente SaaS
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface SubscriptionStatus {
  id:         number;
  status:     'active' | 'suspended';
  paid_until: string | null;
  note:       string | null;
}

export interface BillingTier {
  label:        string;
  max_vehicles: number | null;
  monthly_fcfa: number;
}

export interface BillingReport {
  month:                      string;
  month_label:                string;
  fleet_size:                 number;
  tier:                       { label: string; monthly_fcfa: number };
  online_tickets_count:       number;
  online_volume_fcfa:         number;
  commission_per_ticket_fcfa: number;
  commission_fcfa:            number;
  total_fcfa:                 number;
}

export function useSubscriptionStatus() {
  return useSWR<{ data: SubscriptionStatus }>('/super-admin/subscription', apiFetch);
}

export function useBillingReport(month?: string) {
  const query = month ? `?month=${month}` : '';
  return useSWR<{ data: BillingReport }>(`/super-admin/billing-report${query}`, apiFetch);
}

export function useTiers() {
  return useSWR<{ data: { tiers: BillingTier[]; commission_per_ticket_fcfa: number; setup_fee_range_fcfa: string } }>(
    '/super-admin/tiers',
    apiFetch
  );
}

export async function updateSubscription(payload: {
  status:     'active' | 'suspended';
  paid_until?: string | null;
  note?:      string | null;
}) {
  return apiFetch<{ message: string; data: SubscriptionStatus }>('/super-admin/subscription', {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  } as RequestInit);
}
