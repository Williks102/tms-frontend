// hooks/useAudit.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface ActivityLogEntry {
  id:            number;
  user_id:       number | null;
  action:        string;
  subject_type:  string | null;
  subject_id:    number | null;
  description:   string;
  metadata:      Record<string, unknown> | null;
  created_at:    string;
  user?:         { id: number; name: string } | null;
}

interface Paginated<T> {
  data:         T[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useActivityLog(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/audit${query ? '?' + query : ''}`;
  return useSWR<Paginated<ActivityLogEntry>>(url, (u: string) => apiFetch<Paginated<ActivityLogEntry>>(u));
}
