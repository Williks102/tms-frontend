// hooks/useHr.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export type EmployableType = 'user' | 'driver';

export interface Employee {
  type:               EmployableType;
  id:                 number;
  name:               string;
  contact:            string;
  role_or_position:   string;
  status:             string | null;
  hired_at:           string | null;
  contract_type:      string | null;
  contract_end_date:  string | null;
}

export interface EmployeesResponse {
  data:         Employee[];
  total:        number;
  current_page: number;
  last_page:    number;
}

export interface LeaveRequest {
  id:               number;
  employable_type:  string;
  employable_id:    number;
  type:             'conge_paye' | 'maladie' | 'sans_solde' | 'autre';
  start_date:       string;
  end_date:         string;
  reason:           string | null;
  status:           'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at:     string;
  decided_at:       string | null;
  decision_notes:   string | null;
  employable?:      { id: number; name?: string; first_name?: string; last_name?: string };
  decided_by?:      { id: number; name: string };
}

export interface DisciplinaryRecord {
  id:               number;
  employable_type:  string;
  employable_id:    number;
  type:             'avertissement_verbal' | 'avertissement_ecrit' | 'mise_a_pied' | 'autre';
  description:      string;
  issued_at:        string;
  employable?:      { id: number; name?: string; first_name?: string; last_name?: string };
  issued_by?:       { id: number; name: string };
}

export interface HrDashboard {
  headcount: {
    staff:     number;
    drivers:   number;
    by_status: Record<string, number>;
  };
  contracts_expiring: Array<{ type: EmployableType; id: number; name: string; contract_end_date: string }>;
  documents_expiring: Array<{ id: number; type: string; expires_at: string; driver: { id: number; first_name: string; last_name: string } }>;
  leaves_pending:      LeaveRequest[];
  leaves_active_today: LeaveRequest[];
  recent_disciplinary: DisciplinaryRecord[];
}

export function useHrDashboard() {
  return useSWR<HrDashboard>('/hr/dashboard', apiFetch, { refreshInterval: 30000 });
}

export function useEmployees(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/hr/employees${query ? '?' + query : ''}`;
  return useSWR<EmployeesResponse>(url, apiFetch, { revalidateOnFocus: false });
}

export function useEmployeeDetail(type: EmployableType | null, id: number | null) {
  return useSWR<{ type: EmployableType; employee: any }>(
    type && id ? `/hr/employees/${type}/${id}` : null,
    apiFetch,
    { revalidateOnFocus: false }
  );
}

export function useLeaveRequests(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/hr/leaves${query ? '?' + query : ''}`;
  return useSWR<{ data: LeaveRequest[]; total: number; current_page: number; last_page: number }>(
    url, apiFetch, { refreshInterval: 30000 }
  );
}

export function useDisciplinaryRecords(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/hr/disciplinary${query ? '?' + query : ''}`;
  return useSWR<{ data: DisciplinaryRecord[]; total: number; current_page: number; last_page: number }>(
    url, apiFetch, { refreshInterval: 30000 }
  );
}
