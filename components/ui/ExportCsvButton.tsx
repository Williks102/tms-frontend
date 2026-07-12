'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Pas de lien <a href> direct (empêcherait d'envoyer le cookie de session
// httpOnly de toute façon, et poserait un éventuel token en query string) —
// fetch authentifié par cookie (credentials: 'include', Sanctum SPA — voir
// correctif.md point 4) puis déclenchement du téléchargement via un objet
// Blob et un <a> temporaire.
export function ExportCsvButton({ endpoint, label = '⬇ Exporter CSV', fallbackFilename = 'export.csv', className }: {
  endpoint:          string;
  label?:            string;
  fallbackFilename?: string;
  className?:        string;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export échoué');

      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? fallbackFilename;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de l'export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className={className ?? 'rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50'}
    >
      {loading ? 'Export...' : label}
    </button>
  );
}
