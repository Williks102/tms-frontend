'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Field } from '@/components/ui/Field';

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
        <Field label="Numéro employé">
          <input required className="input" placeholder="Ex: EMP-042" value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} />
        </Field>
        <Field label="Téléphone">
          <input required className="input" placeholder="+225 07 00 00 00 00" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Prénom">
          <input required className="input" placeholder="Koffi" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </Field>
        <Field label="Nom">
          <input required className="input" placeholder="N'Guessan" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </Field>
        <Field label="N° permis">
          <input required className="input" placeholder="CI-000000" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
        </Field>
        <Field label="Catégorie de permis" description="Ex: B, C, D">
          <input required className="input" placeholder="B" value={form.license_category} onChange={(e) => setForm({ ...form, license_category: e.target.value })} />
        </Field>
        <Field label="Expiration du permis">
          <input required type="date" className="input" value={form.license_expires_at} onChange={(e) => setForm({ ...form, license_expires_at: e.target.value })} />
        </Field>
        <Field label="Expiration visite médicale">
          <input required type="date" className="input" value={form.medical_expires_at} onChange={(e) => setForm({ ...form, medical_expires_at: e.target.value })} />
        </Field>
        <Field label="Date d'embauche">
          <input required type="date" className="input" value={form.hired_at} onChange={(e) => setForm({ ...form, hired_at: e.target.value })} />
        </Field>
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Création...' : 'Créer le chauffeur'}
      </button>
    </form>
  );
}

export function FormUploadDriverDocument({ driverId, onSuccess }: { driverId: number; onSuccess?: () => void }) {
  const [type, setType] = useState('license');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Sélectionnez un fichier');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set('type', type);
      body.set('file', file);
      if (expiresAt) body.set('expires_at', expiresAt);

      await apiFetch(`/drivers/${driverId}/documents`, {
        method: 'POST',
        body,
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
      <Field label="Type de document">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="license">Permis</option>
          <option value="medical">Visite médicale</option>
          <option value="contract">Contrat</option>
          <option value="other">Autre</option>
        </select>
      </Field>
      <Field label="Fichier" description="PDF, JPG ou PNG — 5 Mo maximum">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <Field label="Date d'expiration" description="Optionnel">
        <input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </Field>
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
      <Field label="Nouveau statut">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="available">Disponible</option>
          <option value="on_duty">En service</option>
          <option value="resting">Repos</option>
          <option value="on_leave">Congé</option>
          <option value="suspended">Suspendu</option>
        </select>
      </Field>
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  );
}
