'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { FreightClient, FreightShipment, FreightPricingSettings, useFreightQuote } from '@/hooks/useFret';

interface FretFormsProps {
  onSuccess?: () => void;
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

// ── Créer un client fret ────────────────────────────────────────────────────
export function FormCreateFreightClient({ onSuccess }: FretFormsProps) {
  const [form, setForm] = useState({ company_name: '', contact_name: '', phone: '', email: '', address: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch<{ client: FreightClient }>('/fret/clients', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          contact_name: form.contact_name || null,
          email: form.email || null,
          address: form.address || null,
          notes: form.notes || null,
        }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Nom de l'entreprise">
        <input required className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact" description="Optionnel">
          <input className="input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </Field>
        <Field label="Téléphone">
          <input required className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </div>
      <Field label="Email" description="Optionnel">
        <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Adresse" description="Optionnel">
        <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Création...' : 'Créer le client'}
      </button>
    </form>
  );
}

// ── Créer une expédition ─────────────────────────────────────────────────────
export function FormCreateShipment({ clients, onSuccess }: FretFormsProps & { clients: FreightClient[] }) {
  const [form, setForm] = useState({
    freight_client_id: '', origin_city: '', destination_city: '',
    distance_km: '', weight_tons: '', cargo_description: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { quote } = useFreightQuote(Number(form.weight_tons) || 0, Number(form.distance_km) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ shipment: FreightShipment }>('/fret/shipments', {
        method: 'POST',
        body: JSON.stringify({
          freight_client_id: Number(form.freight_client_id),
          origin_city: form.origin_city,
          destination_city: form.destination_city,
          distance_km: Number(form.distance_km),
          weight_tons: Number(form.weight_tons),
          cargo_description: form.cargo_description || null,
        }),
      } as RequestInit);
      setMessage(null);
      setForm({ freight_client_id: '', origin_city: '', destination_city: '', distance_km: '', weight_tons: '', cargo_description: '' });
      onSuccess?.();
      void result;
    } catch (err: any) {
      setMessage(err.message || "Erreur lors de la création de l'expédition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Client">
        <select required className="input" value={form.freight_client_id} onChange={(e) => setForm({ ...form, freight_client_id: e.target.value })}>
          <option value="">Choisir un client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ville de départ">
          <input required className="input" value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} />
        </Field>
        <Field label="Ville de destination">
          <input required className="input" value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Distance (km)">
          <input required type="number" min={1} className="input" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
        </Field>
        <Field label="Tonnage (t)">
          <input required type="number" min={0.1} step={0.1} className="input" value={form.weight_tons} onChange={(e) => setForm({ ...form, weight_tons: e.target.value })} />
        </Field>
      </div>
      <Field label="Nature de la marchandise" description="Optionnel">
        <textarea className="input" rows={2} value={form.cargo_description} onChange={(e) => setForm({ ...form, cargo_description: e.target.value })} />
      </Field>

      {quote && (
        <div className="text-xs rounded-lg px-3 py-2 bg-slate-800/60 text-slate-300">
          Tarif estimé : <span className="font-bold text-white">{formatFCFA(quote.price_fcfa)}</span>
        </div>
      )}

      <button type="submit" disabled={loading || !form.freight_client_id} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Création...' : "Créer l'expédition"}
      </button>
    </form>
  );
}

// ── Affecter un camion + chauffeur ──────────────────────────────────────────
export function FormAssignShipment({ shipment, onSuccess }: FretFormsProps & { shipment: FreightShipment }) {
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: vehiclesData } = useVehicles({ status: 'available', type: 'truck', per_page: '100' });
  const { data: driversData }  = useDrivers({ status: 'available', per_page: '100' });

  const trucks  = vehiclesData?.data ?? [];
  const drivers = driversData?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/fret/shipments/${shipment.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ vehicle_id: Number(vehicleId), driver_id: driverId ? Number(driverId) : null }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || "Erreur lors de l'affectation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Camion" description="Camions disponibles uniquement">
        <select required className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Choisir un camion</option>
          {trucks.map(v => <option key={v.id} value={v.id}>{v.plate_number} · {v.model}</option>)}
        </select>
      </Field>
      <Field label="Chauffeur" description="Optionnel">
        <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Aucun chauffeur assigné</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
        </select>
      </Field>
      <button type="submit" disabled={loading || !vehicleId} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Affectation...' : 'Affecter'}
      </button>
    </form>
  );
}

// ── Faire progresser le statut ──────────────────────────────────────────────
export function FormUpdateShipmentStatus({ shipment, onSuccess }: FretFormsProps & { shipment: FreightShipment }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const nextStatus = shipment.status === 'assigned' ? 'in_transit' : shipment.status === 'in_transit' ? 'delivered' : null;
  const label = nextStatus === 'in_transit' ? 'Marquer en route' : nextStatus === 'delivered' ? 'Marquer livré' : null;

  if (!nextStatus || !label) return null;

  const handleClick = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/fret/shipments/${shipment.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors du changement de statut');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <button onClick={handleClick} disabled={loading} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? '...' : label}
      </button>
    </div>
  );
}

// ── Annuler une expédition ───────────────────────────────────────────────────
export function FormCancelShipment({ shipment, onSuccess }: FretFormsProps & { shipment: FreightShipment }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/fret/shipments/${shipment.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || "Erreur lors de l'annulation");
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
        {loading ? 'Annulation...' : "Annuler l'expédition"}
      </button>
    </form>
  );
}

// ── Encaisser une expédition facturée ───────────────────────────────────────
export function FormMarkPaid({ shipment, onSuccess }: FretFormsProps & { shipment: FreightShipment }) {
  const [depositAccount, setDepositAccount] = useState<'571' | '521'>('571');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/fret/shipments/${shipment.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ deposit_account: depositAccount }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || "Erreur lors de l'encaissement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <p className="text-xs text-slate-400">Montant à encaisser : <span className="font-bold text-white">{formatFCFA(shipment.price_fcfa)}</span></p>
      <Field label="Compte de dépôt">
        <div className="flex gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={depositAccount === '571'} onChange={() => setDepositAccount('571')} />
            Caisse (571)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={depositAccount === '521'} onChange={() => setDepositAccount('521')} />
            Banque (521)
          </label>
        </div>
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Encaissement...' : 'Encaisser'}
      </button>
    </form>
  );
}

// ── Régler le tarif fret (manager uniquement — voir routes/api.php) ────────
export function FormUpdatePricingSettings({ settings, onSuccess }: FretFormsProps & { settings: FreightPricingSettings }) {
  const [rate, setRate] = useState(String(settings.rate_per_ton_km_fcfa));
  const [minimum, setMinimum] = useState(String(settings.minimum_fee_fcfa));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/fret/pricing-settings', {
        method: 'PUT',
        body: JSON.stringify({
          rate_per_ton_km_fcfa: Number(rate),
          minimum_fee_fcfa: Number(minimum),
        }),
      } as RequestInit);
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la mise à jour du tarif');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      <Field label="Tarif par tonne × km (FCFA)">
        <input required type="number" min={0} step={1} className="input" value={rate} onChange={(e) => setRate(e.target.value)} />
      </Field>
      <Field label="Plancher minimum (FCFA)" description="Montant minimum facturé, quel que soit le tonnage/distance">
        <input required type="number" min={0} step={1} className="input" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? 'Enregistrement...' : 'Mettre à jour le tarif'}
      </button>
    </form>
  );
}
