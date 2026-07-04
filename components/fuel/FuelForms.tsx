'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface FuelFormProps {
  onSuccess?: () => void;
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
      <input className="input" placeholder="ID départ" value={form.departure_id} onChange={(e) => setForm({ ...form, departure_id: e.target.value })} />
      <input className="input" placeholder="ID chauffeur" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} />
      <input className="input" placeholder="ID véhicule" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} />
      <input className="input" placeholder="Litres demandés" value={form.requested_liters} onChange={(e) => setForm({ ...form, requested_liters: e.target.value })} />
      <select className="input" value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
        <option value="gasoil">Gasoil</option><option value="essence">Essence</option><option value="gpl">GPL</option>
      </select>
      <input className="input" placeholder="Prix/litre" value={form.price_per_liter} onChange={(e) => setForm({ ...form, price_per_liter: e.target.value })} />
      <input className="input" placeholder="Station" value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
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
      <input
        className="input"
        placeholder="Litres approuvés"
        type="number"
        step="0.01"
        min="1"
        max="300"
        value={approved_liters}
        onChange={(e) => setApprovedLiters(e.target.value)}
      />
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
      <textarea
        className="input min-h-[90px]"
        placeholder="Motif du refus (minimum 10 caractères)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        minLength={10}
      />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Refus...' : 'Refuser'}
      </button>
    </form>
  );
}

export function FormRecordFuelConsumption({ onSuccess }: FuelFormProps) {
  const [form, setForm] = useState({ vehicle_id: '', departure_id: '', fuel_voucher_id: '', liters_consumed: '', distance_km: '', mileage_before: '', mileage_after: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      <input className="input" placeholder="ID véhicule" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} />
      <input className="input" placeholder="ID départ" value={form.departure_id} onChange={(e) => setForm({ ...form, departure_id: e.target.value })} />
      <input className="input" placeholder="ID bon carburant (optionnel)" value={form.fuel_voucher_id} onChange={(e) => setForm({ ...form, fuel_voucher_id: e.target.value })} />
      <input className="input" placeholder="Litres consommés" value={form.liters_consumed} onChange={(e) => setForm({ ...form, liters_consumed: e.target.value })} />
      <input className="input" placeholder="Distance (km)" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
      <input className="input" placeholder="Compteur avant" value={form.mileage_before} onChange={(e) => setForm({ ...form, mileage_before: e.target.value })} />
      <input className="input" placeholder="Compteur après" value={form.mileage_after} onChange={(e) => setForm({ ...form, mileage_after: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer la consommation'}
      </button>
    </form>
  );
}
