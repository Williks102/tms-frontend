'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { useRoutes, useAvailableVehicles, useStations, useDepartures, BoardingGate, RouteStop, Station, Departure } from '@/hooks/usePlanning';
import { useAvailableDrivers } from '@/hooks/useDrivers';

interface FormProps {
  onSuccess?: () => void;
}

export function FormCreateRoute({ onSuccess }: FormProps) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    origin_city: '',
    origin_station_id: '',
    destination_city: '',
    distance_km: '',
    estimated_duration_min: '',
    is_dynamic: '0',
    base_fare: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: stationsData } = useStations();
  const stations = stationsData?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/planning/routes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          origin_station_id: form.origin_station_id ? Number(form.origin_station_id) : null,
          distance_km: Number(form.distance_km),
          estimated_duration_min: Number(form.estimated_duration_min),
          base_fare: Number(form.base_fare),
          is_dynamic: form.is_dynamic === '1',
        }),
      } as RequestInit);
      setMessage('Ligne créée avec succès');
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code ligne" description="Identifiant court, ex: ABJ-BKE">
          <input className="input" placeholder="ABJ-BKE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <Field label="Nom de la ligne">
          <input className="input" placeholder="Abidjan → Bouaké" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Ville d'origine">
          <input className="input" placeholder="Abidjan" value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} />
        </Field>
        <Field label="Gare de départ" description="Optionnel — nécessaire pour l'attribution automatique de quai">
          <select className="input" value={form.origin_station_id} onChange={(e) => setForm({ ...form, origin_station_id: e.target.value })}>
            <option value="">Aucune</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
            ))}
          </select>
        </Field>
        <Field label="Ville de destination">
          <input className="input" placeholder="Bouaké" value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })} />
        </Field>
        <Field label="Distance (km)">
          <input type="number" className="input" placeholder="350" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
        </Field>
        <Field label="Durée estimée (min)">
          <input type="number" className="input" placeholder="240" value={form.estimated_duration_min} onChange={(e) => setForm({ ...form, estimated_duration_min: e.target.value })} />
        </Field>
        <Field label="Tarif de base (FCFA)">
          <input type="number" className="input" placeholder="5000" value={form.base_fare} onChange={(e) => setForm({ ...form, base_fare: e.target.value })} />
        </Field>
        <Field label="Type de ligne" description="Dynamique = arrêts intermédiaires ajoutables">
          <select className="input" value={form.is_dynamic} onChange={(e) => setForm({ ...form, is_dynamic: e.target.value })}>
            <option value="0">Ligne standard</option>
            <option value="1">Ligne dynamique</option>
          </select>
        </Field>
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer la ligne'}
      </button>
    </form>
  );
}

export function FormAddRouteStop({ routeId, onSuccess }: { routeId: number; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    city_name: '',
    stop_order: '',
    distance_from_origin_km: '',
    fare_from_origin: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/planning/routes/${routeId}/stops`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          stop_order: Number(form.stop_order),
          distance_from_origin_km: Number(form.distance_from_origin_km),
          fare_from_origin: Number(form.fare_from_origin),
        }),
      } as RequestInit);
      setMessage('Arrêt ajouté');
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
        <Field label="Ville d'arrêt">
          <input className="input" placeholder="Yamoussoukro" value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })} />
        </Field>
        <Field label="Ordre" description="Position de l'arrêt sur le trajet (1, 2, 3...)">
          <input type="number" className="input" placeholder="1" value={form.stop_order} onChange={(e) => setForm({ ...form, stop_order: e.target.value })} />
        </Field>
        <Field label="Distance depuis l'origine (km)">
          <input type="number" className="input" placeholder="120" value={form.distance_from_origin_km} onChange={(e) => setForm({ ...form, distance_from_origin_km: e.target.value })} />
        </Field>
        <Field label="Tarif depuis l'origine (FCFA)">
          <input type="number" className="input" placeholder="2000" value={form.fare_from_origin} onChange={(e) => setForm({ ...form, fare_from_origin: e.target.value })} />
        </Field>
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Ajout...' : 'Ajouter l’arrêt'}
      </button>
    </form>
  );
}

export function FormEditRouteStop({ routeId, stop, onSuccess }: { routeId: number; stop: RouteStop; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    city_name: stop.city_name,
    stop_order: String(stop.stop_order),
    distance_from_origin_km: String(stop.distance_from_origin_km),
    fare_from_origin: String(stop.fare_from_origin),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/planning/routes/${routeId}/stops/${stop.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          stop_order: Number(form.stop_order),
          distance_from_origin_km: Number(form.distance_from_origin_km),
          fare_from_origin: Number(form.fare_from_origin),
        }),
      } as RequestInit);
      setMessage('Arrêt mis à jour');
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
        <Field label="Ville d'arrêt">
          <input className="input" value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })} />
        </Field>
        <Field label="Ordre" description="Position de l'arrêt sur le trajet (1, 2, 3...)">
          <input type="number" className="input" value={form.stop_order} onChange={(e) => setForm({ ...form, stop_order: e.target.value })} />
        </Field>
        <Field label="Distance depuis l'origine (km)">
          <input type="number" className="input" value={form.distance_from_origin_km} onChange={(e) => setForm({ ...form, distance_from_origin_km: e.target.value })} />
        </Field>
        <Field label="Tarif depuis l'origine (FCFA)">
          <input type="number" className="input" value={form.fare_from_origin} onChange={(e) => setForm({ ...form, fare_from_origin: e.target.value })} />
        </Field>
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  );
}

export function FormCreateStation({ onSuccess }: FormProps) {
  const [form, setForm] = useState({ name: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/planning/stations', {
        method: 'POST',
        body: JSON.stringify(form),
      } as RequestInit);
      setMessage('Gare créée');
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
        <Field label="Nom de la gare" description="Ex: Gare d'Adjamé">
          <input className="input" placeholder="Gare d'Adjamé" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Ville">
          <input className="input" placeholder="Abidjan" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer la gare'}
      </button>
    </form>
  );
}

export function FormEditStation({ station, onSuccess }: { station: Station; onSuccess?: () => void }) {
  const [form, setForm] = useState({ name: station.name, city: station.city, is_active: station.is_active });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/planning/stations/${station.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      } as RequestInit);
      setMessage('Gare mise à jour');
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
        <Field label="Nom de la gare">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Ville">
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        Gare active
      </label>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  );
}

export function FormCreateGate({ onSuccess }: FormProps) {
  const [form, setForm] = useState({ station_id: '', gate_code: '', is_active: true });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: stationsData } = useStations();
  const stations = stationsData?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/planning/gates', {
        method: 'POST',
        body: JSON.stringify({ ...form, station_id: Number(form.station_id) }),
      } as RequestInit);
      setMessage('Quai créé');
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
        <Field label="Gare">
          <select className="input" value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })}>
            <option value="">Sélectionner une gare</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
            ))}
          </select>
        </Field>
        <Field label="Code du quai" description="Ex: Q1, Q2...">
          <input className="input" placeholder="Q1" value={form.gate_code} onChange={(e) => setForm({ ...form, gate_code: e.target.value })} />
        </Field>
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer le quai'}
      </button>
    </form>
  );
}

export function FormEditGate({ gate, onSuccess }: { gate: BoardingGate; onSuccess?: () => void }) {
  const [form, setForm] = useState({ station_id: String(gate.station_id), gate_code: gate.gate_code, is_active: gate.is_active });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: stationsData } = useStations();
  const stations = stationsData?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/planning/gates/${gate.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, station_id: Number(form.station_id) }),
      } as RequestInit);
      setMessage('Quai mis à jour');
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
        <Field label="Gare">
          <select className="input" value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })}>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
            ))}
          </select>
        </Field>
        <Field label="Code du quai">
          <input className="input" value={form.gate_code} onChange={(e) => setForm({ ...form, gate_code: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        Quai actif (utilisable pour l'attribution automatique)
      </label>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  );
}

export function FormCreateDeparture({ onSuccess }: FormProps) {
  const [form, setForm] = useState({
    route_id: '',
    vehicle_id: '',
    driver_id: '',
    departure_datetime: '',
    estimated_arrival: '',
    seats_available: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: routesData } = useRoutes();
  const { data: vehiclesData } = useAvailableVehicles(form.departure_datetime, form.estimated_arrival);
  const { data: driversData } = useAvailableDrivers(form.departure_datetime);

  const routes   = routesData?.data ?? [];
  const vehicles = vehiclesData?.data ?? [];
  const drivers  = driversData?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/planning/departures', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          route_id: Number(form.route_id),
          vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
          driver_id: form.driver_id ? Number(form.driver_id) : null,
          seats_available: form.seats_available ? Number(form.seats_available) : null,
        }),
      } as RequestInit);
      setMessage('Départ créé');
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
        <Field label="Ligne">
          <select className="input" value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
            <option value="">Sélectionner une ligne</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Places disponibles" description="Laissez vide pour utiliser la capacité du véhicule">
          <input type="number" className="input" placeholder="Ex: 50" value={form.seats_available} onChange={(e) => setForm({ ...form, seats_available: e.target.value })} />
        </Field>
        <Field label="Date et heure de départ">
          <input type="datetime-local" className="input" value={form.departure_datetime} onChange={(e) => setForm({ ...form, departure_datetime: e.target.value, vehicle_id: '', driver_id: '' })} />
        </Field>
        <Field label="Date et heure d'arrivée estimée">
          <input type="datetime-local" className="input" value={form.estimated_arrival} onChange={(e) => setForm({ ...form, estimated_arrival: e.target.value, vehicle_id: '' })} />
        </Field>
        <Field
          label="Véhicule"
          description={form.departure_datetime && form.estimated_arrival ? 'Optionnel — affectable plus tard' : 'Renseignez les dates de départ et d\'arrivée pour voir les véhicules disponibles'}
        >
          <select
            className="input"
            disabled={!form.departure_datetime || !form.estimated_arrival}
            value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          >
            <option value="">Non affecté</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate_number} — {v.model} ({v.capacity} places)</option>
            ))}
          </select>
        </Field>
        <Field
          label="Chauffeur"
          description={form.departure_datetime ? 'Optionnel — affectable plus tard' : 'Renseignez la date de départ pour voir les chauffeurs disponibles'}
        >
          <select
            className="input"
            disabled={!form.departure_datetime}
            value={form.driver_id}
            onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
          >
            <option value="">Non affecté</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.first_name} {d.last_name} ({d.employee_number})</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes" description="Optionnel">
        <textarea className="input min-h-[90px]" placeholder="Remarques diverses..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer le départ'}
      </button>
    </form>
  );
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Modification d'un départ existant — uniquement possible tant qu'il est
// "Programmé" (voir DepartureService::update côté backend). La ligne n'est
// volontairement pas modifiable : un trajet erroné doit être annulé et recréé.
export function FormEditDeparture({ departure, onSuccess }: { departure: Departure; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    departure_datetime: toDatetimeLocal(departure.departure_datetime),
    estimated_arrival:  toDatetimeLocal(departure.estimated_arrival),
    vehicle_id:         departure.vehicle ? String(departure.vehicle.id) : '',
    driver_id:          departure.driver ? String(departure.driver.id) : '',
    seats_available:    String(departure.seats_available),
    notes:              departure.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: vehiclesData } = useAvailableVehicles(form.departure_datetime, form.estimated_arrival, departure.id);
  const { data: driversData } = useAvailableDrivers(form.departure_datetime);

  const vehicles = vehiclesData?.data ?? [];
  const drivers  = driversData?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/planning/departures/${departure.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
          driver_id: form.driver_id ? Number(form.driver_id) : null,
          seats_available: form.seats_available ? Number(form.seats_available) : null,
        }),
      } as RequestInit);
      setMessage('Départ mis à jour');
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
        <Field label="Date et heure de départ">
          <input type="datetime-local" className="input" value={form.departure_datetime} onChange={(e) => setForm({ ...form, departure_datetime: e.target.value, vehicle_id: '' })} />
        </Field>
        <Field label="Date et heure d'arrivée estimée">
          <input type="datetime-local" className="input" value={form.estimated_arrival} onChange={(e) => setForm({ ...form, estimated_arrival: e.target.value, vehicle_id: '' })} />
        </Field>
        <Field label="Places disponibles">
          <input type="number" className="input" value={form.seats_available} onChange={(e) => setForm({ ...form, seats_available: e.target.value })} />
        </Field>
        <Field label="Véhicule" description="Se réinitialise si vous changez les horaires">
          <select className="input" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            <option value="">Non affecté</option>
            {departure.vehicle && !vehicles.some(v => v.id === departure.vehicle!.id) && (
              <option value={departure.vehicle.id}>{departure.vehicle.plate_number} — {departure.vehicle.model} (actuel)</option>
            )}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate_number} — {v.model} ({v.capacity} places)</option>
            ))}
          </select>
        </Field>
        <Field label="Chauffeur">
          <select className="input" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
            <option value="">Non affecté</option>
            {departure.driver && !drivers.some(d => d.id === departure.driver!.id) && (
              <option value={departure.driver.id}>{departure.driver.full_name} (actuel)</option>
            )}
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.first_name} {d.last_name} ({d.employee_number})</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes" description="Optionnel">
        <textarea className="input min-h-[90px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  );
}

// Miroir de DepartureService::VALID_TRANSITIONS (backend) — évite de proposer
// une transition que l'API refuserait de toute façon.
const DEPARTURE_STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['boarding', 'cancelled'],
  boarding:  ['departed', 'cancelled'],
  departed:  ['arrived'],
  arrived:   [],
  cancelled: [],
};

const DEPARTURE_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programmé',
  boarding:  'Embarquement',
  departed:  'En route',
  arrived:   'Arrivé',
  cancelled: 'Annulé',
};

export function FormUpdateDepartureStatus({ onSuccess }: FormProps) {
  const [routeId, setRouteId] = useState('');
  const [departureId, setDepartureId] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [actualDeparture, setActualDeparture] = useState('');
  const [actualArrival, setActualArrival] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: routesData }     = useRoutes();
  const { data: departuresData } = useDepartures(routeId ? { route_id: routeId, per_page: '50' } : {});

  const routes = routesData?.data ?? [];

  const departures = useMemo(() => (departuresData?.data ?? [])
    .slice()
    .sort((a, b) => new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime()),
    [departuresData]
  );

  const selectedDeparture = departures.find(d => String(d.id) === departureId) ?? null;
  const allowedStatuses = selectedDeparture ? DEPARTURE_STATUS_TRANSITIONS[selectedDeparture.status] ?? [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/planning/departures/${departureId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          cancellation_reason: status === 'cancelled' ? reason : undefined,
          actual_departure: status === 'departed' ? actualDeparture : undefined,
          actual_arrival: status === 'arrived' ? actualArrival : undefined,
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Trajet">
          <select
            className="input"
            value={routeId}
            onChange={(e) => { setRouteId(e.target.value); setDepartureId(''); setStatus(''); }}
          >
            <option value="">Choisir un trajet</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.code} · {r.origin_city} → {r.destination_city}</option>
            ))}
          </select>
        </Field>
        <Field label="Départ">
          <select
            className="input"
            value={departureId}
            disabled={!routeId}
            onChange={(e) => {
              const dep = departures.find(d => String(d.id) === e.target.value);
              setDepartureId(e.target.value);
              const allowed = dep ? DEPARTURE_STATUS_TRANSITIONS[dep.status] ?? [] : [];
              setStatus(allowed[0] ?? '');
            }}
          >
            <option value="">
              {!routeId
                ? 'Choisissez un trajet d’abord'
                : !departuresData
                  ? 'Chargement des départs...'
                  : departures.length === 0
                    ? 'Aucun départ sur ce trajet'
                    : 'Choisir un départ'}
            </option>
            {departures.map(d => (
              <option key={d.id} value={d.id}>
                {new Date(d.departure_datetime).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {DEPARTURE_STATUS_LABELS[d.status]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {selectedDeparture && allowedStatuses.length === 0 && (
        <p className="text-xs text-slate-500 bg-slate-900/40 rounded-lg px-3 py-2">
          Ce départ est {DEPARTURE_STATUS_LABELS[selectedDeparture.status].toLowerCase()} — aucun changement de statut possible.
        </p>
      )}

      {selectedDeparture && allowedStatuses.length > 0 && (
        <>
          <Field label="Nouveau statut">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {allowedStatuses.map(s => (
                <option key={s} value={s}>{DEPARTURE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          {status === 'cancelled' && (
            <Field label="Motif d'annulation" description="Obligatoire, minimum 10 caractères">
              <textarea className="input min-h-[80px]" placeholder="Raison de l'annulation..." value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
          {status === 'departed' && (
            <Field label="Heure de départ réelle">
              <input type="datetime-local" className="input" value={actualDeparture} onChange={(e) => setActualDeparture(e.target.value)} />
            </Field>
          )}
          {status === 'arrived' && (
            <Field label="Heure d'arrivée réelle">
              <input type="datetime-local" className="input" value={actualArrival} onChange={(e) => setActualArrival(e.target.value)} />
            </Field>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={loading || !selectedDeparture || allowedStatuses.length === 0}
        className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  );
}
