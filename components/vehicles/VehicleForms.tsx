'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { Vehicle } from '@/hooks/useVehicles';

interface FormProps {
  onSuccess?: () => void;
}

export function FormCreateVehicle({ onSuccess }: FormProps) {
  const [form, setForm] = useState({
    plate_number: '',
    model: '',
    capacity: '',
    fuel_consumption_per_100km: '',
    current_mileage_km: '',
    maintenance_interval_km: '10000',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          capacity: Number(form.capacity),
          fuel_consumption_per_100km: Number(form.fuel_consumption_per_100km),
          current_mileage_km: form.current_mileage_km ? Number(form.current_mileage_km) : 0,
          maintenance_interval_km: form.maintenance_interval_km ? Number(form.maintenance_interval_km) : 10000,
        }),
      } as RequestInit);
      setMessage('Véhicule créé');
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
        <Field label="Plaque d'immatriculation" description="Ex: CI-1234-AB">
          <input className="input" placeholder="CI-1234-AB" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} />
        </Field>
        <Field label="Modèle">
          <input className="input" placeholder="Mercedes-Benz Tourismo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </Field>
        <Field label="Capacité (places)">
          <input type="number" className="input" placeholder="49" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </Field>
        <Field label="Consommation théorique (L/100km)">
          <input type="number" className="input" placeholder="28.5" value={form.fuel_consumption_per_100km} onChange={(e) => setForm({ ...form, fuel_consumption_per_100km: e.target.value })} />
        </Field>
        <Field label="Kilométrage actuel" description="Optionnel — 0 par défaut">
          <input type="number" className="input" placeholder="0" value={form.current_mileage_km} onChange={(e) => setForm({ ...form, current_mileage_km: e.target.value })} />
        </Field>
        <Field label="Intervalle maintenance (km)" description="Par défaut 10 000 km">
          <input type="number" className="input" placeholder="10000" value={form.maintenance_interval_km} onChange={(e) => setForm({ ...form, maintenance_interval_km: e.target.value })} />
        </Field>
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer le véhicule'}
      </button>
    </form>
  );
}

export function FormEditVehicle({ vehicle, onSuccess }: { vehicle: Vehicle; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    plate_number: vehicle.plate_number,
    model: vehicle.model,
    capacity: String(vehicle.capacity),
    fuel_consumption_per_100km: String(vehicle.fuel_consumption_per_100km),
    current_mileage_km: String(vehicle.current_mileage_km),
    maintenance_interval_km: String(vehicle.maintenance_interval_km),
    status: vehicle.status,
    notes: vehicle.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/vehicles/${vehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          capacity: Number(form.capacity),
          fuel_consumption_per_100km: Number(form.fuel_consumption_per_100km),
          current_mileage_km: Number(form.current_mileage_km),
          maintenance_interval_km: Number(form.maintenance_interval_km),
        }),
      } as RequestInit);
      setMessage('Véhicule mis à jour');
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
        <Field label="Plaque d'immatriculation">
          <input className="input" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} />
        </Field>
        <Field label="Modèle">
          <input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </Field>
        <Field label="Capacité (places)">
          <input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </Field>
        <Field label="Consommation théorique (L/100km)">
          <input type="number" className="input" value={form.fuel_consumption_per_100km} onChange={(e) => setForm({ ...form, fuel_consumption_per_100km: e.target.value })} />
        </Field>
        <Field label="Kilométrage actuel">
          <input type="number" className="input" value={form.current_mileage_km} onChange={(e) => setForm({ ...form, current_mileage_km: e.target.value })} />
        </Field>
        <Field label="Intervalle maintenance (km)">
          <input type="number" className="input" value={form.maintenance_interval_km} onChange={(e) => setForm({ ...form, maintenance_interval_km: e.target.value })} />
        </Field>
        <Field label="Statut">
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle['status'] })}>
            <option value="available">Disponible</option>
            <option value="on_trip">En route</option>
            <option value="boarding">Embarquement</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactif</option>
          </select>
        </Field>
      </div>
      <Field label="Notes" description="Optionnel">
        <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  );
}
