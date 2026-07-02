'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface MaintenanceFormProps {
  onSuccess?: () => void;
}

export function FormCreateMaintenancePlan({ onSuccess }: MaintenanceFormProps) {
  const [form, setForm] = useState({ vehicle_id: '', type: 'oil_change', trigger_km: '', trigger_date: '', interval_km: '', alert_km_before: '500', estimated_cost: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/maintenance/plans', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          vehicle_id: Number(form.vehicle_id),
          trigger_km: form.trigger_km ? Number(form.trigger_km) : null,
          interval_km: form.interval_km ? Number(form.interval_km) : null,
          alert_km_before: Number(form.alert_km_before),
          estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
        }),
      } as RequestInit);
      setMessage('Plan créé');
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
      <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <option value="oil_change">Vidange</option><option value="tire">Pneus</option><option value="brake">Freins</option><option value="full_service">Révision complète</option><option value="other">Autre</option>
      </select>
      <input className="input" placeholder="Seuil km" value={form.trigger_km} onChange={(e) => setForm({ ...form, trigger_km: e.target.value })} />
      <input type="date" className="input" value={form.trigger_date} onChange={(e) => setForm({ ...form, trigger_date: e.target.value })} />
      <input className="input" placeholder="Intervalle km" value={form.interval_km} onChange={(e) => setForm({ ...form, interval_km: e.target.value })} />
      <input className="input" placeholder="Alerte km avant" value={form.alert_km_before} onChange={(e) => setForm({ ...form, alert_km_before: e.target.value })} />
      <input className="input" placeholder="Coût estimé" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} />
      <textarea className="input min-h-[90px]" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer le plan'}
      </button>
    </form>
  );
}

export function FormRecordMaintenance({ onSuccess }: MaintenanceFormProps) {
  const [form, setForm] = useState({ vehicle_id: '', maintenance_plan_id: '', type: 'oil_change', performed_at: '', mileage_at_service: '', garage_name: '', cost_fcfa: '', parts_replaced: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/maintenance/records', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          vehicle_id: Number(form.vehicle_id),
          maintenance_plan_id: form.maintenance_plan_id ? Number(form.maintenance_plan_id) : null,
          mileage_at_service: Number(form.mileage_at_service),
          cost_fcfa: Number(form.cost_fcfa),
          parts_replaced: form.parts_replaced ? form.parts_replaced.split(',').map((x) => x.trim()) : [],
        }),
      } as RequestInit);
      setMessage('Intervention enregistrée');
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
      <input className="input" placeholder="ID plan (optionnel)" value={form.maintenance_plan_id} onChange={(e) => setForm({ ...form, maintenance_plan_id: e.target.value })} />
      <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <option value="oil_change">Vidange</option><option value="tire">Pneus</option><option value="brake">Freins</option><option value="full_service">Révision complète</option><option value="other">Autre</option>
      </select>
      <input type="datetime-local" className="input" value={form.performed_at} onChange={(e) => setForm({ ...form, performed_at: e.target.value })} />
      <input className="input" placeholder="Kilométrage au service" value={form.mileage_at_service} onChange={(e) => setForm({ ...form, mileage_at_service: e.target.value })} />
      <input className="input" placeholder="Garage" value={form.garage_name} onChange={(e) => setForm({ ...form, garage_name: e.target.value })} />
      <input className="input" placeholder="Coût FCFA" value={form.cost_fcfa} onChange={(e) => setForm({ ...form, cost_fcfa: e.target.value })} />
      <input className="input" placeholder="Pièces remplacées (séparées par des virgules)" value={form.parts_replaced} onChange={(e) => setForm({ ...form, parts_replaced: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer l’intervention'}
      </button>
    </form>
  );
}
