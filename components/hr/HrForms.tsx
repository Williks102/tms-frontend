'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { EmployableType } from '@/hooks/useHr';

interface HrFormsProps {
  onSuccess?: () => void;
}

export function FormRequestLeave({ employableType, employableId, onSuccess }: HrFormsProps & { employableType: EmployableType; employableId: number }) {
  const [form, setForm] = useState({
    type: 'conge_paye',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          employable_type: employableType,
          employable_id: employableId,
          ...form,
        }),
      } as RequestInit);
      setMessage('Demande de congé créée');
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      <Field label="Type de congé">
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="conge_paye">Congé payé</option>
          <option value="maladie">Maladie</option>
          <option value="sans_solde">Sans solde</option>
          <option value="autre">Autre</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de début">
          <input required type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </Field>
        <Field label="Date de fin">
          <input required type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </Field>
      </div>
      <Field label="Motif" description="Optionnel">
        <textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Envoi...' : 'Demander le congé'}
      </button>
    </form>
  );
}

export function FormRequestMyLeave({ onSuccess }: HrFormsProps) {
  const [form, setForm] = useState({
    type: 'conge_paye',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/leaves/mine', {
        method: 'POST',
        body: JSON.stringify(form),
      } as RequestInit);
      setMessage('Demande de congé envoyée');
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      <Field label="Type de congé">
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="conge_paye">Congé payé</option>
          <option value="maladie">Maladie</option>
          <option value="sans_solde">Sans solde</option>
          <option value="autre">Autre</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de début">
          <input required type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </Field>
        <Field label="Date de fin">
          <input required type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </Field>
      </div>
      <Field label="Motif" description="Optionnel">
        <textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Envoi...' : 'Demander mon congé'}
      </button>
    </form>
  );
}

export function FormDecideLeave({ leaveId, onSuccess }: HrFormsProps & { leaveId: number }) {
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/hr/leaves/${leaveId}/${decision}`, {
        method: 'PATCH',
        body: decision === 'reject' ? JSON.stringify({ decision_notes: notes }) : undefined,
      } as RequestInit);
      setMessage(decision === 'approve' ? 'Congé approuvé' : 'Congé refusé');
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      <Field label="Décision">
        <select className="input" value={decision} onChange={(e) => setDecision(e.target.value as 'approve' | 'reject')}>
          <option value="approve">Approuver</option>
          <option value="reject">Refuser</option>
        </select>
      </Field>
      {decision === 'reject' && (
        <Field label="Motif du refus" description="Obligatoire — minimum 5 caractères">
          <textarea required minLength={5} className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      )}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Envoi...' : decision === 'approve' ? 'Approuver le congé' : 'Refuser le congé'}
      </button>
    </form>
  );
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'dg',         label: 'Directeur Général' },
  { value: 'manager',    label: 'Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'rh',         label: 'RH' },
  { value: 'caissier',   label: 'Caissier' },
  { value: 'driver',     label: 'Chauffeur' },
  { value: 'controleur',  label: 'Contrôleur' },
  { value: 'comptable',   label: 'Comptable' },
  { value: 'agent_colis', label: 'Agent colis' },
];

// ── Créer un membre du personnel (manager, rh) ─────────────────────────────
// Mot de passe généré côté serveur, affiché une seule fois ici après succès.
export function FormCreateEmployee({ onSuccess }: HrFormsProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'dispatcher',
    phone: '',
    hired_at: '',
    contract_type: '',
    contract_end_date: '',
    base_salary_fcfa: '',
    parts_fiscales: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; generated_password: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ user: { name: string; email: string }; generated_password: string }>('/hr/employees', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          hired_at: form.hired_at || null,
          contract_type: form.contract_type || null,
          contract_end_date: form.contract_end_date || null,
          base_salary_fcfa: form.base_salary_fcfa ? Number(form.base_salary_fcfa) : null,
          parts_fiscales: form.parts_fiscales ? Number(form.parts_fiscales) : null,
        }),
      } as RequestInit);
      setCreated({ name: result.user.name, email: result.user.email, generated_password: result.generated_password });
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-400">{created.name} créé avec succès</p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-[11px] text-amber-400 mb-1">
            Mot de passe temporaire — communiquez-le à {created.name}, il ne sera plus jamais affiché :
          </p>
          <p className="text-sm font-bold text-white font-[family-name:var(--font-mono)] select-all">
            {created.generated_password}
          </p>
        </div>
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
      <Field label="Nom complet">
        <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Email">
        <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Rôle">
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
      {form.role === 'driver' && (
        <p className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Ce compte ne sera lié à aucune fiche chauffeur (permis, visite médicale...) — créez-la séparément dans le module Chauffeurs si nécessaire.
        </p>
      )}
      <Field label="Téléphone" description="Optionnel">
        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date d'embauche" description="Optionnel">
          <input type="date" className="input" value={form.hired_at} onChange={(e) => setForm({ ...form, hired_at: e.target.value })} />
        </Field>
        <Field label="Type de contrat" description="Optionnel">
          <select className="input" value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
            <option value="">—</option>
            <option value="cdi">CDI</option>
            <option value="cdd">CDD</option>
            <option value="stage">Stage</option>
            <option value="autre">Autre</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fin de contrat" description="Optionnel">
          <input type="date" className="input" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
        </Field>
        <Field label="Salaire de base (FCFA)" description="Optionnel">
          <input type="number" className="input" value={form.base_salary_fcfa} onChange={(e) => setForm({ ...form, base_salary_fcfa: e.target.value })} />
        </Field>
      </div>
      <Field label="Parts fiscales (ITS)" description="Quotient familial — 1 = célibataire sans enfant (défaut). Sert au calcul automatique de l'ITS.">
        <input type="number" step="0.5" min="1" className="input" value={form.parts_fiscales} onChange={(e) => setForm({ ...form, parts_fiscales: e.target.value })} placeholder="1" />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Création...' : 'Créer le compte'}
      </button>
    </form>
  );
}

// ── Import en masse depuis un CSV (manager, rh) ────────────────────────────
export function FormImportEmployeesCsv({ onSuccess }: HrFormsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: { name: string; email: string; generated_password: string }[];
    failed: { row: number; email: string | null; reason: string }[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Sélectionnez un fichier CSV');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await apiFetch<typeof result>('/hr/employees/import', { method: 'POST', body } as RequestInit);
      setResult(res);
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-400">
          {result.created.length} créé(s), {result.failed.length} échec(s)
        </p>
        {result.created.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {result.created.map(c => (
              <div key={c.email} className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-[11px]">
                <p className="text-slate-300">{c.name} — {c.email}</p>
                <p className="text-white font-bold font-[family-name:var(--font-mono)]">{c.generated_password}</p>
              </div>
            ))}
          </div>
        )}
        {result.failed.length > 0 && (
          <div className="space-y-1">
            {result.failed.map((f, i) => (
              <p key={i} className="text-[11px] text-red-400">
                Ligne {f.row}{f.email ? ` (${f.email})` : ''} : {f.reason}
              </p>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => { setResult(null); setFile(null); onSuccess?.(); }}
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
      <p className="text-[11px] text-slate-500">
        Colonnes attendues (première ligne) : <span className="font-[family-name:var(--font-mono)]">name, email, role</span> (obligatoires),
        puis <span className="font-[family-name:var(--font-mono)]">phone, hired_at, contract_type, contract_end_date, base_salary_fcfa</span> (optionnelles).
        Rôles valides : {ROLE_OPTIONS.map(r => r.value).join(', ')}.
      </p>
      <Field label="Fichier CSV">
        <input
          type="file"
          accept=".csv,text/csv"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Import...' : 'Importer'}
      </button>
    </form>
  );
}

export function FormCreateDisciplinaryRecord({ employableType, employableId, onSuccess }: HrFormsProps & { employableType: EmployableType; employableId: number }) {
  const [form, setForm] = useState({
    type: 'avertissement_verbal',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/hr/disciplinary', {
        method: 'POST',
        body: JSON.stringify({
          employable_type: employableType,
          employable_id: employableId,
          ...form,
        }),
      } as RequestInit);
      setMessage('Enregistrement disciplinaire créé');
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      <Field label="Type">
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="avertissement_verbal">Avertissement verbal</option>
          <option value="avertissement_ecrit">Avertissement écrit</option>
          <option value="mise_a_pied">Mise à pied</option>
          <option value="autre">Autre</option>
        </select>
      </Field>
      <Field label="Description" description="Faits reprochés, contexte">
        <textarea required className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer l’enregistrement'}
      </button>
    </form>
  );
}
