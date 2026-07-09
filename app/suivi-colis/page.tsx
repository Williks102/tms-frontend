'use client';

import { useState } from 'react';
import { useTrackParcel } from '@/hooks/useColis';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  enregistre: { label: 'Enregistré — en attente de transport', color: 'text-slate-300',  bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
  arrive:     { label: 'Arrivé — prêt pour le retrait',        color: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  retire:     { label: 'Retiré par le destinataire',           color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  retourne:   { label: 'Retourné — non réclamé',               color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  perdu:      { label: 'Signalé perdu',                        color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  annule:     { label: 'Annulé',                                color: 'text-slate-500',  bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

const CATEGORY_LABEL: Record<string, string> = {
  standard: 'Standard', fragile: 'Fragile', perissable: 'Périssable', liquide: 'Liquide',
};

export default function SuiviColisPage() {
  const [input, setInput] = useState('');
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const { data, error, isLoading } = useTrackParcel(trackingNumber);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim().toUpperCase();
    if (value) setTrackingNumber(value);
  };

  const parcel = data?.parcel;
  const cfg = parcel ? STATUS_CFG[parcel.status] : null;

  const steps = parcel ? [
    { label: 'Enregistré', at: parcel.registered_at },
    { label: 'Arrivé',     at: parcel.arrived_at },
    { label: parcel.status === 'retourne' ? 'Retourné' : 'Retiré', at: parcel.released_at ?? parcel.returned_at },
  ] : [];

  return (
    <div className="min-h-screen bg-[#060A14] p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-md mt-10">
        <div className="text-center mb-8">
          <p className="text-xs font-black text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">TMS — Côte d&apos;Ivoire</p>
          <h1 className="text-xl font-bold text-white mt-2 font-[family-name:var(--font-syne)]">Suivi de colis</h1>
          <p className="text-xs text-slate-500 mt-1">Entrez votre numéro de suivi pour connaître le statut de votre envoi</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="COL-2026-000123"
            className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 font-[family-name:var(--font-mono)] focus:outline-none focus:border-indigo-500/50"
          />
          <button type="submit" disabled={!input.trim()} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Suivre
          </button>
        </form>

        {isLoading && <p className="text-xs text-slate-500 text-center">Recherche...</p>}
        {error && trackingNumber && (
          <p className="text-xs text-red-400 text-center">Aucun colis trouvé avec ce numéro de suivi.</p>
        )}

        {parcel && cfg && (
          <div className="bg-[#080D1A] border border-slate-800/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-mono font-bold text-indigo-400">{parcel.tracking_number}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
            </div>

            {parcel.route && (
              <p className="text-sm text-slate-300">{parcel.route.origin_city} → {parcel.route.destination_city}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/60">
              <div>
                <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Expéditeur</p>
                <p className="text-slate-300">{parcel.sender_name}</p>
              </div>
              <div>
                <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Destinataire</p>
                <p className="text-slate-300">{parcel.recipient_name}</p>
                {parcel.recipient_phone_masked && <p className="text-slate-600 font-[family-name:var(--font-mono)]">{parcel.recipient_phone_masked}</p>}
              </div>
              <div>
                <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Catégorie</p>
                <p className="text-slate-300">{CATEGORY_LABEL[parcel.category]}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              {steps.filter(s => s.at).map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-slate-500 font-[family-name:var(--font-mono)]">{formatDateTime(s.at as string)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
