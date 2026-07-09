// hooks/useNotifications.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface AppNotification {
  id:         number;
  type:       string;
  title:      string;
  body:       string;
  data:       Record<string, unknown> | null;
  read_at:    string | null;
  created_at: string;
}

interface Paginated<T> {
  data:         T[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useNotifications(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/notifications${query ? '?' + query : ''}`;
  return useSWR<Paginated<AppNotification>>(url, (u: string) => apiFetch<Paginated<AppNotification>>(u), {
    refreshInterval: 20000,
  });
}

export function useUnreadNotificationCount() {
  return useSWR<{ count: number }>('/notifications/unread-count', (u: string) => apiFetch<{ count: number }>(u), {
    refreshInterval: 20000,
  });
}
