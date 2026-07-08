'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { AccountingAccount, Payslip } from '@/hooks/useComptabilite';

interface ComptaFormsProps {
  onSuccess?: () => void;
}

function accountLabel(a: AccountingAccount): string {
  return `${a.code} — ${a.label}`;
}

// ── Créer un bon de caisse (sortie ou entrée) ──────────────────────────────
export function FormCreateCashVoucher({ accounts, onSuccess }: ComptaFormsProps & { accounts: AccountingAccount[] }) {
  const [form, setForm] = useState({
    type: 'sortie',
    amount_fcfa: '',
    account_id: String(accounts[0]?.id ?? ''),
    label: '',
    beneficiary_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<{ reference: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ voucher: { reference: string } }>('/comptabilite/cash-vouchers', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount_fcfa: Number(form.amount_fcfa),
          account_id: Number(form.account_id),
          beneficiary_name: form.beneficiary_name || null,
        }),
      } as RequestInit);
      setCreated({ reference: result.voucher.reference });
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-400">Bon {created.reference} créé — en attente d&apos;approbation</p>
        <button
          type="button"
          onClick={() => { setCreated(null); onSuccess?.(); }}
          className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Terminer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Type de bon">
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="sortie">Sortie de caisse</option>
          <option value="entree">Entrée de caisse</option>
        </select>
      </Field>
      <Field label="Montant (FCFA)">
        <input required type="number" min={1} className="input" value={form.amount_fcfa} onChange={(e) => setForm({ ...form, amount_fcfa: e.target.value })} />
      </Field>
      <Field label="Compte de contrepartie">
        <select className="input" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
        </select>
      </Field>
      <Field label="Motif">
        <input required className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </Field>
      <Field label="Bénéficiaire" description="Optionnel">
        <input className="input" value={form.beneficiary_name} onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Création...' : 'Créer le bon'}
      </button>
    </form>
  );
}

// ── Refuser un bon de caisse ────────────────────────────────────────────────
export function FormRejectCashVoucher({ voucherId, onSuccess }: ComptaFormsProps & { voucherId: number }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/comptabilite/cash-vouchers/${voucherId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejection_reason: reason }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Motif du refus" description="Obligatoire — minimum 5 caractères">
        <textarea required minLength={5} className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Envoi...' : 'Refuser le bon'}
      </button>
    </form>
  );
}

// ── Saisie manuelle d'une écriture (opération diverse) ─────────────────────
type ManualLine = { account_id: string; debit: string; credit: string; label: string };

export function FormManualJournalEntry({ accounts, onSuccess }: ComptaFormsProps & { accounts: AccountingAccount[] }) {
  const [label, setLabel] = useState('');
  const [lines, setLines] = useState<ManualLine[]>([
    { account_id: accounts[0]?.id?.toString() ?? '', debit: '', credit: '', label: '' },
    { account_id: accounts[0]?.id?.toString() ?? '', debit: '', credit: '', label: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const totalDebit  = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced  = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const updateLine = (index: number, patch: Partial<ManualLine>) => {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/comptabilite/journals/manual', {
        method: 'POST',
        body: JSON.stringify({
          label,
          lines: lines.map((l) => ({
            account_id: Number(l.account_id),
            debit:      Number(l.debit) || 0,
            credit:     Number(l.credit) || 0,
            label:      l.label || null,
          })),
        }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la saisie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Libellé de l'écriture">
        <input required className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <select
              className="input col-span-5 text-xs"
              value={line.account_id}
              onChange={(e) => updateLine(i, { account_id: e.target.value })}
            >
              {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
            </select>
            <input
              type="number" placeholder="Débit" className="input col-span-3 text-xs"
              value={line.debit} onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? '' : line.credit })}
            />
            <input
              type="number" placeholder="Crédit" className="input col-span-3 text-xs"
              value={line.credit} onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? '' : line.debit })}
            />
            <button
              type="button"
              onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
              disabled={lines.length <= 2}
              className="col-span-1 text-slate-500 hover:text-red-400 disabled:opacity-30 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLines([...lines, { account_id: accounts[0]?.id?.toString() ?? '', debit: '', credit: '', label: '' }])}
        className="text-xs text-indigo-400 hover:text-indigo-300"
      >
        + Ajouter une ligne
      </button>

      <div className={`text-xs rounded-lg px-3 py-2 ${isBalanced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
        Débit: {totalDebit.toLocaleString('fr-FR')} — Crédit: {totalCredit.toLocaleString('fr-FR')}
        {!isBalanced && ' — l\'écriture doit être équilibrée'}
      </div>

      <button type="submit" disabled={loading || !isBalanced} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Enregistrement...' : 'Enregistrer l\'écriture'}
      </button>
    </form>
  );
}

// ── Générer les bulletins de paie du mois ──────────────────────────────────
export function FormGeneratePayslips({ onSuccess }: ComptaFormsProps) {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch<{ created: number; skipped: number }>('/comptabilite/payslips/generate', {
        method: 'POST',
        body: JSON.stringify({ period }),
      } as RequestInit);
      setResult(res);
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-400">{result.created} bulletin(s) créé(s), {result.skipped} déjà existant(s) pour {period}</p>
        <button
          type="button"
          onClick={() => { setResult(null); onSuccess?.(); }}
          className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Terminer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Période" description="Un bulletin brouillon est créé pour chaque employé actif ayant un salaire de base renseigné, sauf s'il en existe déjà un pour cette période">
        <input required type="month" className="input" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Génération...' : 'Générer les bulletins'}
      </button>
    </form>
  );
}

// ── Modifier les lignes d'un bulletin (brouillon uniquement) ──────────────
type PayslipLineForm = { type: 'gain' | 'retenue'; label: string; amount_fcfa: string; account_id: string };

export function FormEditPayslipLines({ payslip, accounts, onSuccess }: ComptaFormsProps & { payslip: Payslip; accounts: AccountingAccount[] }) {
  const [lines, setLines] = useState<PayslipLineForm[]>(
    (payslip.lines ?? []).map((l) => ({
      type: l.type,
      label: l.label,
      amount_fcfa: String(l.amount_fcfa),
      account_id: l.account_id ? String(l.account_id) : '',
    }))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateLine = (index: number, patch: Partial<PayslipLineForm>) => {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const gross      = lines.filter((l) => l.type === 'gain').reduce((s, l) => s + (Number(l.amount_fcfa) || 0), 0);
  const deductions = lines.filter((l) => l.type === 'retenue').reduce((s, l) => s + (Number(l.amount_fcfa) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/comptabilite/payslips/${payslip.id}/lines`, {
        method: 'PUT',
        body: JSON.stringify({
          lines: lines.map((l) => ({
            type: l.type,
            label: l.label,
            amount_fcfa: Number(l.amount_fcfa) || 0,
            account_id: l.type === 'retenue' && l.account_id ? Number(l.account_id) : null,
          })),
        }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <select
              className="input col-span-2 text-xs"
              value={line.type}
              onChange={(e) => updateLine(i, { type: e.target.value as 'gain' | 'retenue' })}
            >
              <option value="gain">Gain</option>
              <option value="retenue">Retenue</option>
            </select>
            <input
              placeholder="Libellé" className="input col-span-4 text-xs"
              value={line.label} onChange={(e) => updateLine(i, { label: e.target.value })}
            />
            <input
              type="number" placeholder="Montant" className="input col-span-2 text-xs"
              value={line.amount_fcfa} onChange={(e) => updateLine(i, { amount_fcfa: e.target.value })}
            />
            {line.type === 'retenue' ? (
              <select
                className="input col-span-3 text-xs"
                value={line.account_id}
                onChange={(e) => updateLine(i, { account_id: e.target.value })}
              >
                <option value="">421 par défaut</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
            ) : <div className="col-span-3" />}
            <button
              type="button"
              onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
              className="col-span-1 text-slate-500 hover:text-red-400 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLines([...lines, { type: 'gain', label: '', amount_fcfa: '', account_id: '' }])}
        className="text-xs text-indigo-400 hover:text-indigo-300"
      >
        + Ajouter une ligne
      </button>

      <div className="text-xs rounded-lg px-3 py-2 bg-slate-800/60 text-slate-300">
        Brut: {gross.toLocaleString('fr-FR')} FCFA — Retenues: {deductions.toLocaleString('fr-FR')} FCFA — Net: {(gross - deductions).toLocaleString('fr-FR')} FCFA
      </div>

      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Enregistrement...' : 'Enregistrer les lignes'}
      </button>
    </form>
  );
}
