'use client';

import { useState } from 'react';
import {
  useChartOfAccounts, useJournalEntries, useLedger, useTrialBalance,
  useIncomeStatement, useBalanceSheet, useCashVouchers, usePayslips,
  AccountingAccount, CashVoucher, Payslip,
} from '@/hooks/useComptabilite';
import {
  FormCreateCashVoucher, FormRejectCashVoucher, FormManualJournalEntry,
  FormGeneratePayslips, FormEditPayslipLines,
} from '@/components/comptabilite/ComptabiliteForms';
import { PrintVoucherButton } from '@/components/comptabilite/PrintVoucherButton';
import { PrintPayslipButton } from '@/components/comptabilite/PrintPayslipButton';
import { PrintReportButton } from '@/components/exports/PrintReportButton';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { apiFetch } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

type Tab = 'journals' | 'ledger' | 'balance' | 'states' | 'vouchers' | 'payroll';

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function accountLabel(a: AccountingAccount): string {
  return `${a.code} — ${a.label}`;
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">{title}</p>
      {children}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#080D1A] p-5 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-sm text-slate-400">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Écritures ────────────────────────────────────────────────────────────
function JournalsTab({ canWrite }: { canWrite: boolean }) {
  const { data: accountsData } = useChartOfAccounts();
  const { data, isLoading, mutate } = useJournalEntries({ per_page: '30' });
  const [showManual, setShowManual] = useState(false);
  const entries = data?.data ?? [];
  const accounts = accountsData?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      {canWrite && (
        <button onClick={() => setShowManual(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white">
          + Nouvelle écriture (opération diverse)
        </button>
      )}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-16" />)}</div>
      ) : !entries.length ? (
        <p className="text-slate-600 text-sm text-center py-12">Aucune écriture</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="p-3 rounded-lg bg-[#080D1A] border border-slate-800/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono font-bold text-indigo-400">{e.reference}</p>
                <p className="text-[11px] text-slate-500">{formatDate(e.entry_date)}</p>
              </div>
              <p className="text-xs text-slate-300 mt-1">{e.label}</p>
              <div className="mt-2 space-y-1">
                {e.lines?.map((l) => (
                  <div key={l.id} className="flex justify-between text-[11px] text-slate-500">
                    <span>{l.account?.code} {l.account?.label}</span>
                    <span className="font-mono">{l.debit > 0 ? formatFCFA(l.debit) : ''}{l.credit > 0 ? `(${formatFCFA(l.credit)})` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showManual && (
        <Modal title="Nouvelle écriture" subtitle="Opération diverse (journal OD)" onClose={() => setShowManual(false)}>
          <FormManualJournalEntry accounts={accounts} onSuccess={() => { setShowManual(false); mutate(); }} />
        </Modal>
      )}
    </div>
  );
}

// ── Grand livre ──────────────────────────────────────────────────────────
function LedgerTab() {
  const { data: accountsData } = useChartOfAccounts();
  const accounts = accountsData?.data ?? [];
  const [accountId, setAccountId] = useState<number | null>(null);
  const { data, isLoading } = useLedger(accountId);

  return (
    <div className="p-6 space-y-4">
      <select
        value={accountId ?? ''}
        onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
        className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50"
      >
        <option value="">Sélectionner un compte</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
      </select>

      {!accountId ? (
        <p className="text-slate-600 text-sm text-center py-12">Sélectionnez un compte pour voir son grand livre</p>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-10" />)}</div>
      ) : !data?.movements.length ? (
        <p className="text-slate-600 text-sm text-center py-12">Aucun mouvement sur ce compte</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800/60">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Référence</th>
                <th className="text-left py-2">Libellé</th>
                <th className="text-right py-2">Débit</th>
                <th className="text-right py-2">Crédit</th>
                <th className="text-right py-2">Solde</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((m) => (
                <tr key={`${m.entry_id}-${m.date}`} className="border-b border-slate-800/40 text-slate-300">
                  <td className="py-2">{formatDate(m.date)}</td>
                  <td className="py-2 font-mono text-indigo-400">{m.reference}</td>
                  <td className="py-2">{m.label}</td>
                  <td className="py-2 text-right">{m.debit > 0 ? formatFCFA(m.debit) : ''}</td>
                  <td className="py-2 text-right">{m.credit > 0 ? formatFCFA(m.credit) : ''}</td>
                  <td className="py-2 text-right font-bold">{formatFCFA(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right text-sm font-bold text-white mt-3">Solde final: {formatFCFA(data.balance)}</p>
        </div>
      )}
    </div>
  );
}

// ── Balance générale ─────────────────────────────────────────────────────
function BalanceTab() {
  const { data, isLoading } = useTrialBalance();

  if (isLoading) return <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-10" />)}</div>;
  if (!data) return null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${data.is_balanced ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {data.is_balanced ? '✓ Balance équilibrée' : '✕ Balance déséquilibrée'} — débit {formatFCFA(data.total_debit)} / crédit {formatFCFA(data.total_credit)}
        </div>
        <ExportCsvButton endpoint="/comptabilite/balance/export" fallbackFilename="balance.csv" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800/60">
              <th className="text-left py-2">Compte</th>
              <th className="text-right py-2">Débit</th>
              <th className="text-right py-2">Crédit</th>
              <th className="text-right py-2">Solde</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.account.id} className="border-b border-slate-800/40 text-slate-300">
                <td className="py-2">{accountLabel(row.account)}</td>
                <td className="py-2 text-right">{formatFCFA(row.debit)}</td>
                <td className="py-2 text-right">{formatFCFA(row.credit)}</td>
                <td className="py-2 text-right font-bold">{formatFCFA(row.solde)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── États financiers ─────────────────────────────────────────────────────
function FinancialStatesTab() {
  const { data: income, isLoading: incomeLoading } = useIncomeStatement();
  const { data: bilan, isLoading: bilanLoading } = useBalanceSheet();

  return (
    <div className="p-6 space-y-6">
      <Panel title={`Compte de résultat — ${income ? `${formatDate(income.from)} au ${formatDate(income.to)}` : ''}`}>
        {incomeLoading || !income ? <Sk className="h-32" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <PrintReportButton
                title="Compte de résultat"
                subtitle={`${formatDate(income.from)} au ${formatDate(income.to)}`}
                sections={[
                  { heading: 'Charges (classe 6)', rows: income.charges.lines.map((l) => ({ label: accountLabel(l.account), value: l.montant })), total: { label: 'Total charges', value: income.charges.total } },
                  { heading: 'Produits (classe 7)', rows: income.produits.lines.map((l) => ({ label: accountLabel(l.account), value: l.montant })), total: { label: 'Total produits', value: income.produits.total } },
                ]}
                grandTotal={{ label: 'Résultat net', value: income.resultat_net }}
              />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-2">Charges (classe 6)</p>
              <div className="space-y-1">
                {income.charges.lines.map((l) => (
                  <div key={l.account.id} className="flex justify-between text-xs text-slate-300">
                    <span>{accountLabel(l.account)}</span><span>{formatFCFA(l.montant)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-white mt-2 pt-2 border-t border-slate-800/60">Total: {formatFCFA(income.charges.total)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-2">Produits (classe 7)</p>
              <div className="space-y-1">
                {income.produits.lines.map((l) => (
                  <div key={l.account.id} className="flex justify-between text-xs text-slate-300">
                    <span>{accountLabel(l.account)}</span><span>{formatFCFA(l.montant)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-white mt-2 pt-2 border-t border-slate-800/60">Total: {formatFCFA(income.produits.total)}</p>
            </div>
            <div className="md:col-span-2 pt-2 border-t border-slate-800/60">
              <p className={`text-sm font-black ${income.resultat_net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Résultat net: {formatFCFA(income.resultat_net)}
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Bilan simplifié">
        <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
          Bilan simplifié — trésorerie et tiers uniquement, pas d&apos;immobilisations ni d&apos;amortissements modélisés. À faire compléter par un expert-comptable avant tout dépôt officiel.
        </p>
        {bilanLoading || !bilan ? <Sk className="h-32" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <PrintReportButton
                title="Bilan simplifié"
                subtitle="Trésorerie et tiers uniquement — pas d'immobilisations ni d'amortissements"
                sections={[
                  { heading: 'Trésorerie (classe 5)', rows: bilan.tresorerie.map((l) => ({ label: accountLabel(l.account), value: l.solde })) },
                  { heading: 'Tiers (classe 4)', rows: bilan.tiers.map((l) => ({ label: accountLabel(l.account), value: l.solde })) },
                ]}
                grandTotal={{ label: "Résultat de l'exercice", value: bilan.resultat_net }}
              />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-2">Trésorerie (classe 5)</p>
              <div className="space-y-1">
                {bilan.tresorerie.map((l) => (
                  <div key={l.account.id} className="flex justify-between text-xs text-slate-300">
                    <span>{accountLabel(l.account)}</span><span>{formatFCFA(l.solde)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-2">Tiers (classe 4)</p>
              <div className="space-y-1">
                {bilan.tiers.map((l) => (
                  <div key={l.account.id} className="flex justify-between text-xs text-slate-300">
                    <span>{accountLabel(l.account)}</span><span>{formatFCFA(l.solde)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 pt-2 border-t border-slate-800/60">
              <p className="text-sm font-black text-white">Résultat de l&apos;exercice: {formatFCFA(bilan.resultat_net)}</p>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── Bons de caisse ───────────────────────────────────────────────────────
const CV_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'En attente', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  approved: { label: 'Approuvé',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  rejected: { label: 'Refusé',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
};

function CashVoucherRow({ voucher, canWrite, onChanged }: { voucher: CashVoucher; canWrite: boolean; onChanged: () => void }) {
  const [showReject, setShowReject] = useState(false);
  const [approving, setApproving] = useState(false);
  const cfg = CV_STATUS_CFG[voucher.status];

  const handleApprove = async () => {
    setApproving(true);
    try {
      await apiFetch(`/comptabilite/cash-vouchers/${voucher.id}/approve`, { method: 'PATCH' } as RequestInit);
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'approbation');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="p-3 rounded-lg bg-[#080D1A] border border-slate-800/60">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono font-bold text-indigo-400">{voucher.reference}</p>
          <p className="text-xs text-slate-300 mt-0.5 truncate">{voucher.label}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {voucher.type === 'sortie' ? 'Sortie' : 'Entrée'} · {formatFCFA(voucher.amount_fcfa)}
            {voucher.beneficiary_name ? ` · ${voucher.beneficiary_name}` : ''}
          </p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>
      {voucher.rejection_reason && <p className="text-[11px] text-red-400/80 mt-2">Motif refus: {voucher.rejection_reason}</p>}

      {canWrite && voucher.status === 'pending' && (
        <div className="mt-2 flex gap-2">
          <button onClick={handleApprove} disabled={approving} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
            {approving ? 'Approbation...' : 'Approuver'}
          </button>
          <button onClick={() => setShowReject(true)} className="rounded-lg bg-red-600/80 hover:bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white">
            Refuser
          </button>
        </div>
      )}
      {voucher.status === 'approved' && (
        <div className="mt-2">
          <PrintVoucherButton
            title={voucher.type === 'sortie' ? 'Bon de sortie de caisse' : "Bon d'entrée de caisse"}
            reference={voucher.reference}
            date={voucher.approved_at ?? voucher.created_at}
            amount={voucher.amount_fcfa}
            motif={voucher.label}
            tiersLabel="Bénéficiaire"
            tiersValue={voucher.beneficiary_name}
            issuedByName={voucher.approvedBy?.name}
          />
        </div>
      )}

      {showReject && (
        <Modal title="Refuser le bon" onClose={() => setShowReject(false)}>
          <FormRejectCashVoucher voucherId={voucher.id} onSuccess={() => { setShowReject(false); onChanged(); }} />
        </Modal>
      )}
    </div>
  );
}

function CashVouchersTab({ canWrite }: { canWrite: boolean }) {
  const { data: accountsData } = useChartOfAccounts();
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  const { data, isLoading, mutate } = useCashVouchers(params);
  const vouchers = data?.data ?? [];
  const accounts = accountsData?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canWrite && (
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white">
            + Nouveau bon de caisse
          </button>
        )}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Refusé</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-20" />)}</div>
      ) : !vouchers.length ? (
        <p className="text-slate-600 text-sm text-center py-12">Aucun bon de caisse</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {vouchers.map((v) => <CashVoucherRow key={v.id} voucher={v} canWrite={canWrite} onChanged={() => mutate()} />)}
        </div>
      )}

      {showCreate && (
        <Modal title="Nouveau bon de caisse" onClose={() => setShowCreate(false)}>
          <FormCreateCashVoucher accounts={accounts} onSuccess={() => { setShowCreate(false); mutate(); }} />
        </Modal>
      )}
    </div>
  );
}

// ── Paie ─────────────────────────────────────────────────────────────────
const PAYSLIP_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Brouillon', color: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
  validated: { label: 'Validé',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  paid:      { label: 'Payé',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

function employableName(e: Payslip['employable']): string {
  if (!e) return 'Inconnu';
  return e.name ?? `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim();
}

function PayslipRow({ payslip, canWrite, accounts, onChanged }: {
  payslip: Payslip; canWrite: boolean; accounts: AccountingAccount[]; onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const cfg = PAYSLIP_STATUS_CFG[payslip.status];

  const handleValidate = async () => {
    setBusy(true);
    try {
      await apiFetch(`/comptabilite/payslips/${payslip.id}/validate`, { method: 'PATCH' } as RequestInit);
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation');
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async () => {
    setBusy(true);
    try {
      await apiFetch(`/comptabilite/payslips/${payslip.id}/pay`, { method: 'PATCH' } as RequestInit);
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du paiement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3 rounded-lg bg-[#080D1A] border border-slate-800/60">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{employableName(payslip.employable)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {payslip.period} · Net: {formatFCFA(payslip.net_amount_fcfa)}
          </p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>

      {canWrite && payslip.status === 'draft' && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => setEditing(!editing)} className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-[11px] font-semibold text-white">
            {editing ? 'Fermer' : 'Modifier les lignes'}
          </button>
          <button onClick={handleValidate} disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
            {busy ? 'Validation...' : 'Valider'}
          </button>
        </div>
      )}
      {canWrite && payslip.status === 'validated' && (
        <div className="mt-2">
          <button onClick={handlePay} disabled={busy} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
            {busy ? 'Paiement...' : 'Marquer payé'}
          </button>
        </div>
      )}
      {payslip.status === 'paid' && (
        <div className="mt-2">
          <PrintPayslipButton payslip={payslip} />
        </div>
      )}

      {editing && (
        <div className="mt-3 pt-3 border-t border-slate-800/60">
          <FormEditPayslipLines payslip={payslip} accounts={accounts} onSuccess={() => { setEditing(false); onChanged(); }} />
        </div>
      )}
    </div>
  );
}

function PayrollTab({ canWrite }: { canWrite: boolean }) {
  const { data: accountsData } = useChartOfAccounts();
  const [period, setPeriod] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const params: Record<string, string> = {};
  if (period) params.period = period;
  const { data, isLoading, mutate } = usePayslips(params);
  const payslips = data?.data ?? [];
  const accounts = accountsData?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canWrite && (
          <button onClick={() => setShowGenerate(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white">
            + Générer les bulletins du mois
          </button>
        )}
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
          className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-20" />)}</div>
      ) : !payslips.length ? (
        <p className="text-slate-600 text-sm text-center py-12">Aucun bulletin</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payslips.map((p) => (
            <PayslipRow key={p.id} payslip={p} canWrite={canWrite} accounts={accounts} onChanged={() => mutate()} />
          ))}
        </div>
      )}

      {showGenerate && (
        <Modal title="Générer les bulletins" onClose={() => setShowGenerate(false)}>
          <FormGeneratePayslips onSuccess={() => { setShowGenerate(false); mutate(); }} />
        </Modal>
      )}
    </div>
  );
}

export default function ComptabilitePage() {
  const { can } = usePermissions();
  const canWrite = can('comptaWrite');
  const [tab, setTab] = useState<Tab>('journals');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'journals', label: 'Écritures'         },
    { id: 'ledger',   label: 'Grand livre'       },
    { id: 'balance',  label: 'Balance'           },
    { id: 'states',   label: 'États financiers'  },
    { id: 'vouchers', label: 'Bons de caisse'    },
    { id: 'payroll',  label: 'Paie'              },
  ];

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Comptabilité</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Plan comptable OHADA — écritures, bons de caisse, paie</p>
        </div>
      </header>

      <div className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-slate-800/60 bg-[#060A14] overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)] whitespace-nowrap
              ${tab === t.id ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="lg:h-[calc(100vh-3.5rem-3rem)] overflow-y-auto">
        {tab === 'journals' && <JournalsTab canWrite={canWrite} />}
        {tab === 'ledger'   && <LedgerTab />}
        {tab === 'balance'  && <BalanceTab />}
        {tab === 'states'   && <FinancialStatesTab />}
        {tab === 'vouchers' && <CashVouchersTab canWrite={canWrite} />}
        {tab === 'payroll'  && <PayrollTab canWrite={canWrite} />}
      </div>
    </div>
  );
}
