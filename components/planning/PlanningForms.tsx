'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface FormProps {
  onSuccess?: () => void;
}

export function FormCreateRoute({ onSuccess }: FormProps) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    origin_city: '',
    destination_city: '',
    distance_km: '',
    estimated_duration_min: '',
    is_dynamic: '0',
    base_fare: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/planning/routes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
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
        <input className="input" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className="input" placeholder="Nom de la ligne" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Origine" value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} />
        <input className="input" placeholder="Destination" value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })} />
        <input type="number" className="input" placeholder="Distance (km)" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
        <input type="number" className="input" placeholder="Durée (min)" value={form.estimated_duration_min} onChange={(e) => setForm({ ...form, estimated_duration_min: e.target.value })} />
        <input type="number" className="input" placeholder="Tarif de base" value={form.base_fare} onChange={(e) => setForm({ ...form, base_fare: e.target.value })} />
        <select className="input" value={form.is_dynamic} onChange={(e) => setForm({ ...form, is_dynamic: e.target.value })}>
          <option value="0">Ligne standard</option>
          <option value="1">Ligne dynamique</option>
        </select>
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
        <input className="input" placeholder="Ville d’arrêt" value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })} />
        <input type="number" className="input" placeholder="Ordre" value={form.stop_order} onChange={(e) => setForm({ ...form, stop_order: e.target.value })} />
        <input type="number" className="input" placeholder="Distance depuis l’origine" value={form.distance_from_origin_km} onChange={(e) => setForm({ ...form, distance_from_origin_km: e.target.value })} />
        <input type="number" className="input" placeholder="Tarif depuis l’origine" value={form.fare_from_origin} onChange={(e) => setForm({ ...form, fare_from_origin: e.target.value })} />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Ajout...' : 'Ajouter l’arrêt'}
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
        <input type="number" className="input" placeholder="ID ligne" value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })} />
        <input type="number" className="input" placeholder="ID véhicule (optionnel)" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} />
        <input type="number" className="input" placeholder="ID chauffeur (optionnel)" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} />
        <input type="number" className="input" placeholder="Places disponibles" value={form.seats_available} onChange={(e) => setForm({ ...form, seats_available: e.target.value })} />
        <input type="datetime-local" className="input" placeholder="Départ" value={form.departure_datetime} onChange={(e) => setForm({ ...form, departure_datetime: e.target.value })} />
        <input type="datetime-local" className="input" placeholder="Arrivée estimée" value={form.estimated_arrival} onChange={(e) => setForm({ ...form, estimated_arrival: e.target.value })} />
      </div>
      <textarea className="input min-h-[90px]" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer le départ'}
      </button>
    </form>
  );
}

export function FormUpdateDepartureStatus({ onSuccess }: FormProps) {
  const [departureId, setDepartureId] = useState('');
  const [status, setStatus] = useState('boarding');
  const [reason, setReason] = useState('');
  const [actualDeparture, setActualDeparture] = useState('');
  const [actualArrival, setActualArrival] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      <input type="number" className="input" placeholder="ID du départ" value={departureId} onChange={(e) => setDepartureId(e.target.value)} />
      <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="boarding">Embarquement</option>
        <option value="departed">En route</option>
        <option value="arrived">Arrivé</option>
        <option value="cancelled">Annulé</option>
      </select>
      {status === 'cancelled' && <textarea className="input min-h-[80px]" placeholder="Motif d’annulation" value={reason} onChange={(e) => setReason(e.target.value)} />}
      {status === 'departed' && <input type="datetime-local" className="input" value={actualDeparture} onChange={(e) => setActualDeparture(e.target.value)} />}
      {status === 'arrived' && <input type="datetime-local" className="input" value={actualArrival} onChange={(e) => setActualArrival(e.target.value)} />}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  );
}
