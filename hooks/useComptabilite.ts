// hooks/useComptabilite.ts
'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

export interface AccountingAccount {
  id:          number;
  code:        string;
  label:       string;
  class:       number;
  normal_side: 'debit' | 'credit';
  is_active:   boolean;
}

export interface AccountingEntryLine {
  id:         number;
  entry_id:   number;
  account_id: number;
  debit:      number;
  credit:     number;
  label:      string | null;
  account?:   AccountingAccount;
}

export interface AccountingEntry {
  id:           number;
  journal_id:   number;
  reference:    string;
  entry_date:   string;
  label:        string;
  source_type:  string | null;
  source_id:    number | null;
  created_by:   number | null;
  lines?:       AccountingEntryLine[];
  journal?:     { id: number; code: string; label: string };
  created_at:   string;
}

export interface CashVoucher {
  id:                   number;
  reference:            string;
  type:                 'sortie' | 'entree';
  amount_fcfa:          number;
  account_id:           number;
  label:                string;
  beneficiary_name:     string | null;
  status:               'pending' | 'approved' | 'rejected';
  requested_by:         number;
  approved_by:          number | null;
  approved_at:          string | null;
  rejection_reason:     string | null;
  accounting_entry_id:  number | null;
  account?:             AccountingAccount;
  requestedBy?:         { id: number; name: string };
  approvedBy?:          { id: number; name: string };
  created_at:           string;
}

export interface PayslipLine {
  id:          number;
  payslip_id:  number;
  type:        'gain' | 'retenue';
  label:       string;
  amount_fcfa: number;
  account_id:  number | null;
  account?:    AccountingAccount;
}

export interface Payslip {
  id:                       number;
  employable_type:          string;
  employable_id:            number;
  period:                   string;
  gross_amount_fcfa:        number;
  deductions_amount_fcfa:   number;
  net_amount_fcfa:          number;
  status:                   'draft' | 'validated' | 'paid';
  validated_at:             string | null;
  paid_at:                  string | null;
  validation_entry_id:      number | null;
  payment_entry_id:         number | null;
  lines?:                   PayslipLine[];
  employable?:              { id: number; name?: string; first_name?: string; last_name?: string };
}

export interface LedgerMovement {
  entry_id:   number;
  reference:  string;
  date:       string;
  label:      string;
  debit:      number;
  credit:     number;
  balance:    number;
}

export interface LedgerResponse {
  account:    AccountingAccount;
  movements:  LedgerMovement[];
  balance:    number;
}

export interface TrialBalanceRow {
  account: AccountingAccount;
  debit:   number;
  credit:  number;
  solde:   number;
}

export interface TrialBalanceResponse {
  rows:          TrialBalanceRow[];
  total_debit:   number;
  total_credit:  number;
  is_balanced:   boolean;
}

export interface IncomeStatementResponse {
  from:          string;
  to:            string;
  charges:       { lines: { account: AccountingAccount; montant: number }[]; total: number };
  produits:      { lines: { account: AccountingAccount; montant: number }[]; total: number };
  resultat_net:  number;
}

export interface BalanceSheetResponse {
  tresorerie:    { account: AccountingAccount; solde: number }[];
  tiers:         { account: AccountingAccount; solde: number }[];
  resultat_net:  number;
  periode:       { from: string; to: string };
}

interface Paginated<T> {
  data:         T[];
  current_page: number;
  last_page:    number;
  total:        number;
}

export function useChartOfAccounts() {
  return useSWR<{ data: AccountingAccount[] }>('/comptabilite/accounts', (u: string) => apiFetch<{ data: AccountingAccount[] }>(u));
}

export function useJournalEntries(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/comptabilite/journals${query ? '?' + query : ''}`;
  return useSWR<Paginated<AccountingEntry>>(url, (u: string) => apiFetch<Paginated<AccountingEntry>>(u));
}

export function useLedger(accountId: number | null, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = accountId ? `/comptabilite/grand-livre/${accountId}${query ? '?' + query : ''}` : null;
  return useSWR<LedgerResponse>(url, (u: string) => apiFetch<LedgerResponse>(u));
}

export function useTrialBalance() {
  return useSWR<TrialBalanceResponse>('/comptabilite/balance', (u: string) => apiFetch<TrialBalanceResponse>(u), {
    refreshInterval: 30000,
  });
}

export function useIncomeStatement(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/comptabilite/compte-resultat${query ? '?' + query : ''}`;
  return useSWR<IncomeStatementResponse>(url, (u: string) => apiFetch<IncomeStatementResponse>(u));
}

export function useBalanceSheet() {
  return useSWR<BalanceSheetResponse>('/comptabilite/bilan', (u: string) => apiFetch<BalanceSheetResponse>(u));
}

export function useCashVouchers(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/comptabilite/cash-vouchers${query ? '?' + query : ''}`;
  return useSWR<Paginated<CashVoucher>>(url, (u: string) => apiFetch<Paginated<CashVoucher>>(u), {
    refreshInterval: 15000,
  });
}

export function usePayslips(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `/comptabilite/payslips${query ? '?' + query : ''}`;
  return useSWR<Paginated<Payslip>>(url, (u: string) => apiFetch<Paginated<Payslip>>(u));
}
