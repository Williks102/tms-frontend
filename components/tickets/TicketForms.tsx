'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useRoutes, useDepartures } from '@/hooks/usePlanning';
import { useTicketManifest, Ticket } from '@/hooks/useTickets';
import { PrintTicketButton } from './PrintTicketButton';

interface FormProps {
  onSuccess?: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Sélection en cascade : trajet → départ → siège ─────────────────────────
// Choisir un trajet filtre les départs ouverts à la vente ; choisir un départ
// met à jour automatiquement le prix (tarif de la ligne) et la liste des
// sièges encore disponibles sur ce départ.
function TrajetDepartSiegeFields({
  departureId, seatNumber, onChange,
}: {
  departureId: string;
  seatNumber:  string;
  onChange: (fields: { departure_id?: string; seat_number?: string; price_fcfa?: string }) => void;
}) {
  const [routeId, setRouteId] = useState('');

  const { data: routesData }     = useRoutes();
  const { data: departuresData } = useDepartures(routeId ? { route_id: routeId, per_page: '50' } : {});

  const routes = routesData?.data ?? [];

  const openDepartures = useMemo(() => (departuresData?.data ?? [])
    .filter(d => d.status === 'scheduled' || d.status === 'boarding')
    .sort((a, b) => new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime()),
    [departuresData]
  );

  const selectedDeparture = routeId
    ? openDepartures.find(d => String(d.id) === departureId) ?? null
    : null;

  const { data: manifest } = useTicketManifest(selectedDeparture?.id ?? null);

  const availableSeats = useMemo(() => {
    if (!selectedDeparture?.vehicle) return [];
    const occupied = new Set(
      (manifest?.data ?? [])
        .filter(t => t.seat_number)
        .map(t => t.seat_number as string)
    );
    return Array.from({ length: selectedDeparture.vehicle.capacity }, (_, i) => String(i + 1))
      .filter(seat => !occupied.has(seat));
  }, [manifest, selectedDeparture]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <select
          className="input"
          value={routeId}
          onChange={(e) => {
            setRouteId(e.target.value);
            onChange({ departure_id: '', seat_number: '', price_fcfa: '' });
          }}
        >
          <option value="">Choisir un trajet</option>
          {routes.map(r => (
            <option key={r.id} value={r.id}>{r.code} · {r.origin_city} → {r.destination_city}</option>
          ))}
        </select>

        <select
          className="input"
          value={departureId}
          disabled={!routeId}
          onChange={(e) => {
            const dep = openDepartures.find(d => String(d.id) === e.target.value);
            onChange({
              departure_id: e.target.value,
              seat_number:  '',
              price_fcfa:   dep ? String(dep.route.base_fare) : '',
            });
          }}
        >
          <option value="">
            {!routeId
              ? 'Choisissez un trajet d’abord'
              : !departuresData
                ? 'Chargement des départs...'
                : openDepartures.length === 0
                  ? 'Aucun départ ouvert'
                  : 'Choisir un départ'}
          </option>
          {openDepartures.map(d => (
            <option key={d.id} value={d.id}>
              {formatDateTime(d.departure_datetime)} · {d.seats_available} place{d.seats_available > 1 ? 's' : ''} dispo
            </option>
          ))}
        </select>
      </div>

      {selectedDeparture && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-900/40 rounded-lg px-3 py-2">
          <span>Départ #{selectedDeparture.id} · Quai {selectedDeparture.boarding_gate ?? '—'}</span>
          <span className="text-emerald-400 font-[family-name:var(--font-mono)]">
            {new Intl.NumberFormat('fr-FR').format(selectedDeparture.route.base_fare)} F
          </span>
        </div>
      )}

      <select
        className="input"
        value={seatNumber}
        disabled={!selectedDeparture}
        onChange={(e) => onChange({ seat_number: e.target.value })}
      >
        <option value="">
          {!selectedDeparture
            ? 'Choisissez un départ d’abord'
            : !selectedDeparture.vehicle
              ? 'Aucun véhicule affecté — siège non requis'
              : !manifest
                ? 'Chargement des sièges...'
                : 'Siège (optionnel)'}
        </option>
        {availableSeats.map(s => <option key={s} value={s}>Siège {s}</option>)}
      </select>
    </div>
  );
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
  const [soldTicket, setSoldTicket] = useState<Ticket | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ ticket: Ticket }>('/tickets', {
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
      setSoldTicket(result.ticket);
    } catch (err: any) {
      setMessage(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (soldTicket) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-400">Billet {soldTicket.reference} vendu — {soldTicket.passenger_name}</p>
        <div className="flex gap-2">
          <PrintTicketButton ticket={soldTicket} label="🖨 Imprimer le billet" className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold text-white" />
          <button
            type="button"
            onClick={() => { setSoldTicket(null); onSuccess?.(); }}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Terminer
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}

      <TrajetDepartSiegeFields
        departureId={form.departure_id}
        seatNumber={form.seat_number}
        onChange={(fields) => setForm({ ...form, ...fields })}
      />

      <input className="input" placeholder="Nom du passager" value={form.passenger_name} onChange={(e) => setForm({ ...form, passenger_name: e.target.value })} />
      <input className="input" placeholder="Téléphone (optionnel)" value={form.passenger_phone} onChange={(e) => setForm({ ...form, passenger_phone: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option value="cash">Espèces</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="card">Carte</option>
        </select>
        <input type="number" className="input" placeholder="Prix FCFA" value={form.price_fcfa} onChange={(e) => setForm({ ...form, price_fcfa: e.target.value })} />
      </div>
      <button
        type="submit"
        disabled={loading || !form.departure_id}
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
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
  const [soldTicket, setSoldTicket] = useState<Ticket | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Endpoint public (hors auth:sanctum) — simule un client achetant en ligne
      const result = await apiFetch<{ ticket: Ticket }>('/tickets/online', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          departure_id: Number(form.departure_id),
          seat_number: form.seat_number || null,
          price_fcfa: form.price_fcfa ? Number(form.price_fcfa) : null,
        }),
      } as RequestInit);
      setMessage('Achat en ligne confirmé');
      setSoldTicket(result.ticket);
    } catch (err: any) {
      setMessage(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (soldTicket) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-400">Billet {soldTicket.reference} confirmé — {soldTicket.passenger_name}</p>
        <div className="flex gap-2">
          <PrintTicketButton ticket={soldTicket} label="🖨 Imprimer le billet" className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-semibold text-white" />
          <button
            type="button"
            onClick={() => { setSoldTicket(null); onSuccess?.(); }}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Terminer
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Simule un achat effectué depuis la billetterie web/mobile publique (ClicBillet).
      </p>
      {message && <p className="text-xs text-emerald-400">{message}</p>}

      <TrajetDepartSiegeFields
        departureId={form.departure_id}
        seatNumber={form.seat_number}
        onChange={(fields) => setForm({ ...form, ...fields })}
      />

      <input className="input" placeholder="Nom du passager" value={form.passenger_name} onChange={(e) => setForm({ ...form, passenger_name: e.target.value })} />
      <input className="input" placeholder="Téléphone" value={form.passenger_phone} onChange={(e) => setForm({ ...form, passenger_phone: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option value="mobile_money">Mobile Money</option>
          <option value="card">Carte</option>
          <option value="online">Paiement en ligne</option>
        </select>
        <input type="number" className="input" placeholder="Prix FCFA" value={form.price_fcfa} onChange={(e) => setForm({ ...form, price_fcfa: e.target.value })} />
      </div>
      <button
        type="submit"
        disabled={loading || !form.departure_id}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
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
