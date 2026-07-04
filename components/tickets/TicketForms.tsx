'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface FormProps {
  onSuccess?: () => void;
}

// ── Vente au guichet (caissier/manager) ────────────────────────────────────
export function FormSellPhysicalTicket({ onSuccess }: FormProps) {
  const [form, setForm] = useState({
    departure_id: '',
    passenger_name: '',
    passenger_phone: '',
    seat_number: '',
    payment_method: 'cash',
    price_fcfa: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          departure_id: Number(form.departure_id),
          passenger_phone: form.passenger_phone || null,
          seat_number: form.seat_number || null,
          price_fcfa: form.price_fcfa ? Number(form.price_fcfa) : null,
        }),
      } as RequestInit);
      setMessage('Billet vendu');
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
      <div className="grid grid-cols-2 gap-3">
        <input type="number" className="input" placeholder="ID départ" value={form.departure_id} onChange={(e) => setForm({ ...form, departure_id: e.target.value })} />
        <input className="input" placeholder="Siège (optionnel)" value={form.seat_number} onChange={(e) => setForm({ ...form, seat_number: e.target.value })} />
      </div>
      <input className="input" placeholder="Nom du passager" value={form.passenger_name} onChange={(e) => setForm({ ...form, passenger_name: e.target.value })} />
      <input className="input" placeholder="Téléphone (optionnel)" value={form.passenger_phone} onChange={(e) => setForm({ ...form, passenger_phone: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option value="cash">Espèces</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="card">Carte</option>
        </select>
        <input type="number" className="input" placeholder="Prix FCFA (auto si vide)" value={form.price_fcfa} onChange={(e) => setForm({ ...form, price_fcfa: e.target.value })} />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Vente...' : 'Vendre le billet'}
      </button>
    </form>
  );
}

// ── Achat en ligne (démo — simule la billetterie web/mobile publique) ─────
export function FormOnlineTicketDemo({ onSuccess }: FormProps) {
  const [form, setForm] = useState({
    departure_id: '',
    passenger_name: '',
    passenger_phone: '',
    seat_number: '',
    payment_method: 'mobile_money',
    price_fcfa: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Endpoint public (hors auth:sanctum) — simule un client achetant en ligne
      await apiFetch('/tickets/online', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          departure_id: Number(form.departure_id),
          seat_number: form.seat_number || null,
          price_fcfa: form.price_fcfa ? Number(form.price_fcfa) : null,
        }),
      } as RequestInit);
      setMessage('Achat en ligne confirmé');
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Simule un achat effectué depuis la billetterie web/mobile publique (ClicBillet).
      </p>
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      <div className="grid grid-cols-2 gap-3">
        <input type="number" className="input" placeholder="ID départ" value={form.departure_id} onChange={(e) => setForm({ ...form, departure_id: e.target.value })} />
        <input className="input" placeholder="Siège (optionnel)" value={form.seat_number} onChange={(e) => setForm({ ...form, seat_number: e.target.value })} />
      </div>
      <input className="input" placeholder="Nom du passager" value={form.passenger_name} onChange={(e) => setForm({ ...form, passenger_name: e.target.value })} />
      <input className="input" placeholder="Téléphone" value={form.passenger_phone} onChange={(e) => setForm({ ...form, passenger_phone: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option value="mobile_money">Mobile Money</option>
          <option value="card">Carte</option>
          <option value="online">Paiement en ligne</option>
        </select>
        <input type="number" className="input" placeholder="Prix FCFA (auto si vide)" value={form.price_fcfa} onChange={(e) => setForm({ ...form, price_fcfa: e.target.value })} />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Achat...' : 'Confirmer l’achat en ligne'}
      </button>
    </form>
  );
}

// ── Changer le statut d'un billet (embarquer / annuler / rembourser) ──────
export function FormUpdateTicketStatus({ ticketId, currentStatus, onSuccess }: {
  ticketId: number;
  currentStatus: string;
  onSuccess?: () => void;
}) {
  const options = currentStatus === 'paid'
    ? [
        { value: 'boarded',   label: 'Embarquer' },
        { value: 'cancelled', label: 'Annuler' },
        { value: 'refunded',  label: 'Rembourser' },
      ]
    : [];

  const [status, setStatus] = useState(options[0]?.value ?? '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!options.length) {
    return <p className="text-xs text-slate-500">Ce billet ({currentStatus}) ne peut plus changer de statut.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          cancellation_reason: status !== 'boarded' ? reason : undefined,
        }),
      } as RequestInit);
      setMessage('Statut mis à jour');
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
      <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {status !== 'boarded' && (
        <textarea className="input min-h-[80px]" placeholder="Motif (obligatoire)" value={reason} onChange={(e) => setReason(e.target.value)} />
      )}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Mise à jour...' : 'Confirmer'}
      </button>
    </form>
  );
}
