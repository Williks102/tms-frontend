'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { MyDeparture } from '@/hooks/useDriverSelf';

interface DriverFormsProps {
  onSuccess?: () => void;
}

export function FormReportMyIncident({ todayDepartures, onSuccess }: DriverFormsProps & { todayDepartures: MyDeparture[] }) {
  const withVehicle = todayDepartures.filter(d => d.vehicle);
  const [form, setForm] = useState({
    departure_id: withVehicle[0]?.id ? String(withVehicle[0].id) : '',
    category: 'mechanical',
    severity: 'medium',
    title: '',
    description: '',
    location: '',
    occurred_at: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const departure = todayDepartures.find(d => String(d.id) === form.departure_id);
    if (!departure?.vehicle) {
      setMessage('Sélectionnez un départ avec véhicule assigné');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/incidents/mine', {
        method: 'POST',
        body: JSON.stringify({
          departure_id: departure.id,
          vehicle_id: departure.vehicle.id,
          category: form.category,
          severity: form.severity,
          title: form.title,
          description: form.description,
          location: form.location || null,
          occurred_at: form.occurred_at,
        }),
      } as RequestInit);
      setMessage('Incident signalé');
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors du signalement');
    } finally {
      setLoading(false);
    }
  };

  if (!withVehicle.length) {
    return <p className="text-xs text-slate-500">Aucun départ avec véhicule assigné aujourd'hui — impossible de signaler un incident pour l'instant.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      <Field label="Départ concerné">
        <select className="input" value={form.departure_id} onChange={(e) => setForm({ ...form, departure_id: e.target.value })}>
          {withVehicle.map(d => (
            <option key={d.id} value={d.id}>{d.route?.code ?? `Départ #${d.id}`} — {d.vehicle?.plate_number}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="mechanical">Panne mécanique</option>
            <option value="accident">Accident</option>
            <option value="passenger">Incident passager</option>
            <option value="road">Route / météo</option>
            <option value="other">Autre</option>
          </select>
        </Field>
        <Field label="Sévérité">
          <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Grave</option>
            <option value="critical">Critique</option>
          </select>
        </Field>
      </div>
      <Field label="Titre">
        <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="Description">
        <textarea required className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <Field label="Lieu" description="Optionnel">
        <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Envoi...' : 'Signaler l’incident'}
      </button>
    </form>
  );
}
