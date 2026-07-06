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
