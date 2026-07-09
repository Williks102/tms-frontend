'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { useRoutes, useDepartures } from '@/hooks/usePlanning';
import { Parcel, useParcelQuote } from '@/hooks/useColis';
import { PrintParcelReceiptButton } from './PrintParcelReceiptButton';

interface ColisFormsProps {
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'standard',   label: 'Standard' },
  { value: 'fragile',    label: 'Fragile' },
  { value: 'perissable', label: 'Périssable' },
  { value: 'liquide',    label: 'Liquide' },
];

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

// ── Enregistrer un colis ────────────────────────────────────────────────────
export function FormRegisterParcel({ onSuccess }: ColisFormsProps) {
  const [routeId, setRouteId] = useState('');
  const [form, setForm] = useState({
    departure_id: '',
    sender_name: '', sender_phone: '',
    recipient_name: '', recipient_phone: '',
    category: 'standard',
    description: '',
    weight_kg: '',
    declared_value_fcfa: '',
    payment_responsibility: 'expediteur',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<Parcel | null>(null);

  const { data: routesData }     = useRoutes({});
  const { data: departuresData } = useDepartures(routeId ? { route_id: routeId, per_page: '50' } : {});

  const routes = routesData?.data ?? [];
  const openDepartures = useMemo(() => (departuresData?.data ?? [])
    .filter(d => d.status === 'scheduled' || d.status === 'boarding')
    .sort((a, b) => new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime()),
    [departuresData]
  );
  const selectedDeparture = openDepartures.find(d => String(d.id) === form.departure_id) ?? null;
  const cargoRemaining = selectedDeparture?.cargo_capacity_kg != null
    ? selectedDeparture.cargo_capacity_kg - (selectedDeparture.cargo_used_kg ?? 0)
    : null;

  const { quote } = useParcelQuote(Number(form.weight_kg) || 0, Number(form.declared_value_fcfa) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ parcel: Parcel }>('/colis', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          departure_id: Number(form.departure_id),
          weight_kg: Number(form.weight_kg),
          declared_value_fcfa: Number(form.declared_value_fcfa),
          description: form.description || null,
        }),
      } as RequestInit);
      setCreated(result.parcel);
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-400">Colis {created.tracking_number} enregistré avec succès</p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-[11px] text-amber-400 mb-1">Code de retrait — à communiquer au destinataire :</p>
          <p className="text-lg font-black text-white font-[family-name:var(--font-mono)] tracking-widest select-all">
            {created.pickup_code}
          </p>
        </div>
        <PrintParcelReceiptButton parcel={created} className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-semibold text-white text-center" />
        <button
          type="button"
          onClick={() => { setCreated(null); setForm({ ...form, departure_id: '', sender_name: '', sender_phone: '', recipient_name: '', recipient_phone: '', description: '', weight_kg: '', declared_value_fcfa: '' }); onSuccess?.(); }}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Terminer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Trajet">
          <select className="input" value={routeId} onChange={(e) => { setRouteId(e.target.value); setForm({ ...form, departure_id: '' }); }}>
            <option value="">Choisir un trajet</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.code} · {r.origin_city} → {r.destination_city}</option>)}
          </select>
        </Field>
        <Field label="Départ" description="Départs ouverts uniquement">
          <select className="input" value={form.departure_id} disabled={!routeId} onChange={(e) => setForm({ ...form, departure_id: e.target.value })}>
            <option value="">{!routeId ? 'Choisissez un trajet d’abord' : 'Choisir un départ'}</option>
            {openDepartures.map(d => (
              <option key={d.id} value={d.id}>
                {new Date(d.departure_datetime).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {selectedDeparture && (
        cargoRemaining === null ? (
          <p className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Ce véhicule n&apos;a pas de capacité fret configurée — impossible d&apos;enregistrer un colis sur ce départ.
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">Capacité fret restante : {cargoRemaining} kg</p>
        )
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom de l'expéditeur">
          <input required className="input" value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} />
        </Field>
        <Field label="Téléphone expéditeur">
          <input required className="input" value={form.sender_phone} onChange={(e) => setForm({ ...form, sender_phone: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom du destinataire">
          <input required className="input" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
        </Field>
        <Field label="Téléphone destinataire">
          <input required className="input" value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Catégorie">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Poids (kg)">
          <input required type="number" min={0.1} step={0.1} className="input" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
        </Field>
        <Field label="Valeur déclarée (FCFA)">
          <input required type="number" min={0} className="input" value={form.declared_value_fcfa} onChange={(e) => setForm({ ...form, declared_value_fcfa: e.target.value })} />
        </Field>
      </div>

      <Field label="Description" description="Optionnel">
        <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>

      <Field label="Qui paie le transport ?">
        <div className="flex gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={form.payment_responsibility === 'expediteur'} onChange={() => setForm({ ...form, payment_responsibility: 'expediteur' })} />
            Expéditeur (port payé)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={form.payment_responsibility === 'destinataire'} onChange={() => setForm({ ...form, payment_responsibility: 'destinataire' })} />
            Destinataire (port dû)
          </label>
        </div>
      </Field>

      {quote && (
        <div className="text-xs rounded-lg px-3 py-2 bg-slate-800/60 text-slate-300">
          Transport: {formatFCFA(quote.transport_fee_fcfa)} — Assurance: {formatFCFA(quote.insurance_fee_fcfa)} — <span className="font-bold text-white">Total: {formatFCFA(quote.total_fee_fcfa)}</span>
        </div>
      )}

      <button type="submit" disabled={loading || !form.departure_id || cargoRemaining === null} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Enregistrement...' : 'Enregistrer le colis'}
      </button>
    </form>
  );
}

// ── Remettre un colis (retrait) ─────────────────────────────────────────────
export function FormReleaseParcel({ parcel, onSuccess }: ColisFormsProps & { parcel: Parcel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/colis/${parcel.id}/release`, {
        method: 'POST',
        body: JSON.stringify({ pickup_code: code }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors du retrait');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      {parcel.payment_responsibility === 'destinataire' && parcel.payment_status === 'pending' && (
        <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Port dû — {formatFCFA(parcel.total_fee_fcfa)} à encaisser avant remise du colis.
        </p>
      )}
      <Field label="Code de retrait" description="Communiqué par l'expéditeur au destinataire — 6 chiffres">
        <input required maxLength={6} minLength={6} className="input font-[family-name:var(--font-mono)] tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} />
      </Field>
      <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Vérification...' : 'Remettre le colis'}
      </button>
    </form>
  );
}

// ── Annuler un colis ────────────────────────────────────────────────────────
export function FormCancelParcel({ parcel, onSuccess }: ColisFormsProps & { parcel: Parcel }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/colis/${parcel.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de l\'annulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Motif de l'annulation" description="Obligatoire — minimum 5 caractères">
        <textarea required minLength={5} className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Annulation...' : 'Annuler le colis'}
      </button>
    </form>
  );
}

// ── Marquer perdu / retourné (manager) ──────────────────────────────────────
export function FormParcelException({ parcel, onSuccess }: ColisFormsProps & { parcel: Parcel }) {
  const [status, setStatus] = useState<'retourne' | 'perdu'>('retourne');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/colis/${parcel.id}/exception`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
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
      <Field label="Statut">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as 'retourne' | 'perdu')}>
          <option value="retourne">Retourné (non réclamé)</option>
          <option value="perdu">Perdu</option>
        </select>
      </Field>
      <Field label="Motif" description="Obligatoire — minimum 5 caractères">
        <textarea required minLength={5} className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Envoi...' : 'Mettre à jour le statut'}
      </button>
    </form>
  );
}
