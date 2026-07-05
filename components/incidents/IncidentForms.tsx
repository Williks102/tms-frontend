'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';

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
        <Field label="ID départ" description="Optionnel — si l'incident est lié à un départ">
          <input type="number" className="input" placeholder="Ex: 27" value={form.departure_id} onChange={(e) => setForm({ ...form, departure_id: e.target.value })} />
        </Field>
        <Field label="ID véhicule">
          <input type="number" className="input" placeholder="Ex: 3" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} />
        </Field>
        <Field label="ID chauffeur">
          <input type="number" className="input" placeholder="Ex: 5" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} />
        </Field>
        <Field label="Impact financier (FCFA)" description="Optionnel — estimation des coûts">
          <input type="number" className="input" placeholder="85000" value={form.financial_impact_fcfa} onChange={(e) => setForm({ ...form, financial_impact_fcfa: e.target.value })} />
        </Field>
        <Field label="Catégorie">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="mechanical">Panne mécanique</option>
            <option value="accident">Accident</option>
            <option value="passenger">Passager</option>
            <option value="road">Route / météo</option>
            <option value="driver">Chauffeur</option>
            <option value="other">Autre</option>
          </select>
        </Field>
        <Field label="Sévérité" description="Critique déclenche une alerte immédiate">
          <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Grave</option>
            <option value="critical">Critique</option>
          </select>
        </Field>
      </div>
      <Field label="Titre">
        <input className="input" placeholder="Ex: Panne climatisation en route" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="Description">
        <textarea className="input min-h-[100px]" placeholder="Décrivez les circonstances de l'incident..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <Field label="Lieu" description="Optionnel">
        <input className="input" placeholder="Ex: PK 185, Axe Abidjan-Bouaké" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </Field>
      <Field label="Date et heure de l'incident">
        <input type="datetime-local" className="input" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
      </Field>
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
      <Field label="Type d'action">
        <select className="input" value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}>
          <option value="repair">Réparation</option>
          <option value="medical">Médical</option>
          <option value="police">Police</option>
          <option value="tow">Remorquage</option>
          <option value="replacement_vehicle">Véhicule de remplacement</option>
          <option value="passenger_support">Support passager</option>
          <option value="other">Autre</option>
        </select>
      </Field>
      <Field label="Description de l'action">
        <textarea className="input min-h-[90px]" placeholder="Détaillez l'action corrective entreprise..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <Field label="Coût (FCFA)" description="Optionnel">
        <input type="number" className="input" placeholder="85000" value={form.cost_fcfa} onChange={(e) => setForm({ ...form, cost_fcfa: e.target.value })} />
      </Field>
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
      <Field label="Nouveau statut">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="investigating">Investigation</option>
          <option value="resolved">Résolu</option>
          <option value="closed">Clôturé</option>
        </select>
      </Field>
      {(status === 'resolved' || status === 'closed') && (
        <Field label="Notes de résolution" description="Obligatoire pour résoudre ou clôturer">
          <textarea className="input min-h-[90px]" placeholder="Comment l'incident a-t-il été résolu ?" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
        </Field>
      )}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  );
}
