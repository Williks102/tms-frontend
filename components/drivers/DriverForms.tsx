'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface DriverFormsProps {
  onSuccess?: () => void;
}

export function FormCreateDriver({ onSuccess }: DriverFormsProps) {
  const [form, setForm] = useState({
    employee_number: '',
    first_name: '',
    last_name: '',
    phone: '',
    license_number: '',
    license_category: 'B',
    license_expires_at: '',
    medical_expires_at: '',
    hired_at: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch('/drivers', {
        method: 'POST',
        body: JSON.stringify(form),
      } as RequestInit);
      setMessage('Chauffeur créé avec succès');
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
        <input required className="input" placeholder="Numéro employé" value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} />
        <input required className="input" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input required className="input" placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input required className="input" placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input required className="input" placeholder="N° permis" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
        <input required className="input" placeholder="Catégorie" value={form.license_category} onChange={(e) => setForm({ ...form, license_category: e.target.value })} />
        <input required type="date" className="input" value={form.license_expires_at} onChange={(e) => setForm({ ...form, license_expires_at: e.target.value })} />
        <input required type="date" className="input" value={form.medical_expires_at} onChange={(e) => setForm({ ...form, medical_expires_at: e.target.value })} />
        <input required type="date" className="input" placeholder="Date embauche" value={form.hired_at} onChange={(e) => setForm({ ...form, hired_at: e.target.value })} />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer le chauffeur'}
      </button>
    </form>
  );
}

export function FormUploadDriverDocument({ driverId, onSuccess }: { driverId: number; onSuccess?: () => void }) {
  const [form, setForm] = useState({ type: 'license', expires_at: '', file_path: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/drivers/${driverId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ ...form, file_path: form.file_path || 'uploads/doc.pdf' }),
      } as RequestInit);
      setMessage('Document envoyé');
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
      <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <option value="license">Permis</option>
        <option value="medical">Visite médicale</option>
        <option value="contract">Contrat</option>
        <option value="other">Autre</option>
      </select>
      <input className="input" placeholder="Chemin fichier" value={form.file_path} onChange={(e) => setForm({ ...form, file_path: e.target.value })} />
      <input type="date" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Envoi...' : 'Enregistrer le document'}
      </button>
    </form>
  );
}

export function FormChangeDriverStatus({ driverId, onSuccess }: { driverId: number; onSuccess?: () => void }) {
  const [status, setStatus] = useState('available');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/drivers/${driverId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
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
        <option value="available">Disponible</option>
        <option value="on_duty">En service</option>
        <option value="resting">Repos</option>
        <option value="on_leave">Congé</option>
        <option value="suspended">Suspendu</option>
      </select>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  );
}
