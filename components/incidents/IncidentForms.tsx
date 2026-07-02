'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface FormProps {
  onSuccess?: () => void;
}

export function FormCreateIncident({ onSuccess }: FormProps) {
  const [form, setForm] = useState({
    departure_id: '',
    vehicle_id: '',
    driver_id: '',
    category: 'mechanical',
    severity: 'medium',
    title: '',
    description: '',
    location: '',
    occurred_at: '',
    financial_impact_fcfa: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          departure_id: form.departure_id ? Number(form.departure_id) : null,
          vehicle_id: Number(form.vehicle_id),
          driver_id: Number(form.driver_id),
          financial_impact_fcfa: form.financial_impact_fcfa ? Number(form.financial_impact_fcfa) : null,
        }),
      } as RequestInit);
      setMessage('Incident déclaré');
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
        <input type="number" className="input" placeholder="ID départ (optionnel)" value={form.departure_id} onChange={(e) => setForm({ ...form, departure_id: e.target.value })} />
        <input type="number" className="input" placeholder="ID véhicule" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} />
        <input type="number" className="input" placeholder="ID chauffeur" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} />
        <input type="number" className="input" placeholder="Impact financier" value={form.financial_impact_fcfa} onChange={(e) => setForm({ ...form, financial_impact_fcfa: e.target.value })} />
        <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="mechanical">Panne mécanique</option>
          <option value="accident">Accident</option>
          <option value="passenger">Passager</option>
          <option value="road">Route / météo</option>
          <option value="driver">Chauffeur</option>
          <option value="other">Autre</option>
        </select>
        <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="low">Faible</option>
          <option value="medium">Moyen</option>
          <option value="high">Grave</option>
          <option value="critical">Critique</option>
        </select>
      </div>
      <input className="input" placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="input min-h-[100px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input className="input" placeholder="Lieu" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      <input type="datetime-local" className="input" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Envoi...' : 'Déclarer l’incident'}
      </button>
    </form>
  );
}

export function FormAddIncidentAction({ incidentId, onSuccess }: { incidentId: number; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    action_type: 'repair',
    description: '',
    cost_fcfa: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/incidents/${incidentId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          cost_fcfa: form.cost_fcfa ? Number(form.cost_fcfa) : null,
        }),
      } as RequestInit);
      setMessage('Action enregistrée');
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
      <select className="input" value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}>
        <option value="repair">Réparation</option>
        <option value="medical">Médical</option>
        <option value="police">Police</option>
        <option value="tow">Remorquage</option>
        <option value="replacement_vehicle">Véhicule de remplacement</option>
        <option value="passenger_support">Support passager</option>
        <option value="other">Autre</option>
      </select>
      <textarea className="input min-h-[90px]" placeholder="Description de l’action" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input type="number" className="input" placeholder="Coût FCFA" value={form.cost_fcfa} onChange={(e) => setForm({ ...form, cost_fcfa: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Enregistrement...' : 'Enregistrer l’action'}
      </button>
    </form>
  );
}

export function FormUpdateIncidentStatus({ incidentId, onSuccess }: { incidentId: number; onSuccess?: () => void }) {
  const [status, setStatus] = useState('investigating');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/incidents/${incidentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          resolution_notes: status === 'resolved' || status === 'closed' ? resolutionNotes : undefined,
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
        <option value="investigating">Investigation</option>
        <option value="resolved">Résolu</option>
        <option value="closed">Clôturé</option>
      </select>
      {(status === 'resolved' || status === 'closed') && (
        <textarea className="input min-h-[90px]" placeholder="Notes de résolution" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
      )}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  );
}
