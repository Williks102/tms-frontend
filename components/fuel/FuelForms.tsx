'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { useRoutes, useDepartures } from '@/hooks/usePlanning';
import { useFuelVouchers } from '@/hooks/useFuel';

interface FuelFormProps {
  onSuccess?: () => void;
}

// ── Sélection en cascade : trajet → départ, avec véhicule/chauffeur auto-remplis ──
// Un bon carburant est demandé pour un départ précis ; le véhicule et le chauffeur
// sont donc ceux déjà affectés à ce départ, pas des choix indépendants.
function TrajetDepartFields({ departureId, onChange }: {
  departureId: string;
  onChange: (fields: { departure_id: string; vehicle_id: string; driver_id: string }) => void;
}) {
  const [routeId, setRouteId] = useState('');

  const { data: routesData }     = useRoutes();
  const { data: departuresData } = useDepartures(routeId ? { route_id: routeId, per_page: '50' } : {});

  const routes = routesData?.data ?? [];

  const departures = useMemo(() => (departuresData?.data ?? [])
    .filter(d => d.vehicle && d.driver)
    .sort((a, b) => new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime()),
    [departuresData]
  );

  const selectedDeparture = departures.find(d => String(d.id) === departureId) ?? null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Trajet">
          <select
            className="input"
            value={routeId}
            onChange={(e) => { setRouteId(e.target.value); onChange({ departure_id: '', vehicle_id: '', driver_id: '' }); }}
          >
            <option value="">Choisir un trajet</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.code} · {r.origin_city} → {r.destination_city}</option>
            ))}
          </select>
        </Field>
        <Field label="Départ" description="Seuls les départs avec véhicule et chauffeur affectés s'affichent">
          <select
            className="input"
            value={departureId}
            disabled={!routeId}
            onChange={(e) => {
              const dep = departures.find(d => String(d.id) === e.target.value);
              onChange({
                departure_id: e.target.value,
                vehicle_id:   dep?.vehicle ? String(dep.vehicle.id) : '',
                driver_id:    dep?.driver ? String(dep.driver.id) : '',
              });
            }}
          >
            <option value="">
              {!routeId
                ? 'Choisissez un trajet d’abord'
                : !departuresData
                  ? 'Chargement des départs...'
                  : departures.length === 0
                    ? 'Aucun départ affecté sur ce trajet'
                    : 'Choisir un départ'}
            </option>
            {departures.map(d => (
              <option key={d.id} value={d.id}>
                {new Date(d.departure_datetime).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {d.vehicle?.plate_number}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {selectedDeparture && (
        <div className="text-[11px] text-slate-500 bg-slate-900/40 rounded-lg px-3 py-2">
          Véhicule <span className="text-slate-300 font-[family-name:var(--font-mono)]">{selectedDeparture.vehicle?.plate_number}</span>
          {' · '}Chauffeur <span className="text-slate-300">{selectedDeparture.driver?.full_name}</span>
        </div>
      )}
    </div>
  );
}

export function FormRequestFuelVoucher({ onSuccess }: FuelFormProps) {
  const [form, setForm] = useState({ departure_id: '', driver_id: '', vehicle_id: '', requested_liters: '', fuel_type: 'gasoil', price_per_liter: '', station_name: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/fuel/vouchers', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          departure_id: Number(form.departure_id),
          driver_id: Number(form.driver_id),
          vehicle_id: Number(form.vehicle_id),
          requested_liters: Number(form.requested_liters),
          price_per_liter: Number(form.price_per_liter),
        }),
      } as RequestInit);
      setMessage('Bon soumis');
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
      <TrajetDepartFields
        departureId={form.departure_id}
        onChange={(fields) => setForm({ ...form, ...fields })}
      />
      <Field label="Litres demandés" description="Une demande > 15% du théorique déclenche une alerte">
        <input className="input" placeholder="80" value={form.requested_liters} onChange={(e) => setForm({ ...form, requested_liters: e.target.value })} />
      </Field>
      <Field label="Type de carburant">
        <select className="input" value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
          <option value="gasoil">Gasoil</option><option value="essence">Essence</option><option value="gpl">GPL</option>
        </select>
      </Field>
      <Field label="Prix par litre (FCFA)">
        <input className="input" placeholder="750" value={form.price_per_liter} onChange={(e) => setForm({ ...form, price_per_liter: e.target.value })} />
      </Field>
      <Field label="Station">
        <input className="input" placeholder="Total Adjamé" value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} />
      </Field>
      <button
        type="submit"
        disabled={loading || !form.departure_id}
        className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Soumission...' : 'Demander le bon'}
      </button>
    </form>
  );
}

export function FormApproveFuelVoucher({ voucherId, onSuccess }: { voucherId: number; onSuccess?: () => void }) {
  const [approved_liters, setApprovedLiters] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Validation client
    if (!approved_liters || isNaN(Number(approved_liters))) {
      setError('Litres approuvés requis (nombre)');
      return;
    }
    if (Number(approved_liters) < 1 || Number(approved_liters) > 300) {
      setError('Litres approuvés doit être entre 1 et 300');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/fuel/vouchers/${voucherId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ approved_liters: Number(approved_liters) }),
      } as RequestInit);
      setMessage('Bon approuvé');
      setApprovedLiters('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Field label="Litres approuvés" description="Entre 1 et 300 litres">
        <input
          className="input"
          placeholder="80"
          type="number"
          step="0.01"
          min="1"
          max="300"
          value={approved_liters}
          onChange={(e) => setApprovedLiters(e.target.value)}
        />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Approbation...' : 'Approuver'}
      </button>
    </form>
  );
}

export function FormRejectFuelVoucher({ voucherId, onSuccess }: { voucherId: number; onSuccess?: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Validation client
    if (!reason || reason.trim().length < 10) {
      setError('Motif requis (minimum 10 caractères)');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/fuel/vouchers/${voucherId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejection_reason: reason }),
      } as RequestInit);
      setMessage('Bon refusé');
      setReason('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du refus');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Field label="Motif du refus" description="Minimum 10 caractères">
        <textarea
          className="input min-h-[90px]"
          placeholder="Expliquez la raison du refus..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={10}
        />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Refus...' : 'Refuser'}
      </button>
    </form>
  );
}

// ── Sélection en cascade : trajet → départ, avec véhicule auto-rempli ──
// N'exige qu'un véhicule affecté (pas de chauffeur requis, contrairement à la
// demande de bon) puisqu'on enregistre ici une consommation déjà effectuée.
function TrajetDepartVehicleFields({ departureId, onChange }: {
  departureId: string;
  onChange: (fields: { departure_id: string; vehicle_id: string }) => void;
}) {
  const [routeId, setRouteId] = useState('');

  const { data: routesData }     = useRoutes();
  const { data: departuresData } = useDepartures(routeId ? { route_id: routeId, per_page: '50' } : {});

  const routes = routesData?.data ?? [];

  const departures = useMemo(() => (departuresData?.data ?? [])
    .filter(d => d.vehicle)
    .sort((a, b) => new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime()),
    [departuresData]
  );

  const selectedDeparture = departures.find(d => String(d.id) === departureId) ?? null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Trajet">
          <select
            className="input"
            value={routeId}
            onChange={(e) => { setRouteId(e.target.value); onChange({ departure_id: '', vehicle_id: '' }); }}
          >
            <option value="">Choisir un trajet</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.code} · {r.origin_city} → {r.destination_city}</option>
            ))}
          </select>
        </Field>
        <Field label="Départ" description="Seuls les départs avec véhicule affecté s'affichent">
          <select
            className="input"
            value={departureId}
            disabled={!routeId}
            onChange={(e) => {
              const dep = departures.find(d => String(d.id) === e.target.value);
              onChange({
                departure_id: e.target.value,
                vehicle_id:   dep?.vehicle ? String(dep.vehicle.id) : '',
              });
            }}
          >
            <option value="">
              {!routeId
                ? 'Choisissez un trajet d’abord'
                : !departuresData
                  ? 'Chargement des départs...'
                  : departures.length === 0
                    ? 'Aucun départ affecté sur ce trajet'
                    : 'Choisir un départ'}
            </option>
            {departures.map(d => (
              <option key={d.id} value={d.id}>
                {new Date(d.departure_datetime).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {d.vehicle?.plate_number}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {selectedDeparture && (
        <div className="text-[11px] text-slate-500 bg-slate-900/40 rounded-lg px-3 py-2">
          Véhicule <span className="text-slate-300 font-[family-name:var(--font-mono)]">{selectedDeparture.vehicle?.plate_number}</span> · {selectedDeparture.vehicle?.model}
        </div>
      )}
    </div>
  );
}

export function FormRecordFuelConsumption({ onSuccess }: FuelFormProps) {
  const [form, setForm] = useState({ vehicle_id: '', departure_id: '', fuel_voucher_id: '', liters_consumed: '', distance_km: '', mileage_before: '', mileage_after: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: vouchersData } = useFuelVouchers(
    form.vehicle_id ? { vehicle_id: form.vehicle_id, status: 'approved' } : {}
  );
  const vouchers = (vouchersData?.data ?? []).filter(v => String(v.departure_id) === form.departure_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/fuel/consumption', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          vehicle_id: Number(form.vehicle_id),
          departure_id: Number(form.departure_id),
          fuel_voucher_id: form.fuel_voucher_id ? Number(form.fuel_voucher_id) : null,
          liters_consumed: Number(form.liters_consumed),
          distance_km: Number(form.distance_km),
          mileage_before: Number(form.mileage_before),
          mileage_after: Number(form.mileage_after),
        }),
      } as RequestInit);
      setMessage('Consommation enregistrée');
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
      <TrajetDepartVehicleFields
        departureId={form.departure_id}
        onChange={(fields) => setForm({ ...form, ...fields, fuel_voucher_id: '' })}
      />
      {form.departure_id && (
        <Field label="Bon carburant lié" description="Optionnel — bons approuvés pour ce véhicule et ce départ">
          <select className="input" value={form.fuel_voucher_id} onChange={(e) => setForm({ ...form, fuel_voucher_id: e.target.value })}>
            <option value="">Aucun</option>
            {vouchers.map(v => (
              <option key={v.id} value={v.id}>Bon #{v.id} · {v.approved_liters ?? v.requested_liters} L</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Litres consommés">
        <input className="input" placeholder="75" value={form.liters_consumed} onChange={(e) => setForm({ ...form, liters_consumed: e.target.value })} />
      </Field>
      <Field label="Distance parcourue (km)">
        <input className="input" placeholder="340" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
      </Field>
      <Field label="Compteur avant (km)">
        <input className="input" placeholder="45200" value={form.mileage_before} onChange={(e) => setForm({ ...form, mileage_before: e.target.value })} />
      </Field>
      <Field label="Compteur après (km)">
        <input className="input" placeholder="45540" value={form.mileage_after} onChange={(e) => setForm({ ...form, mileage_after: e.target.value })} />
      </Field>
      <button
        type="submit"
        disabled={loading || !form.departure_id}
        className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer la consommation'}
      </button>
    </form>
  );
}
