'use client';

import { useRef, useState } from 'react';
import { useMyPurchases, MyPurchaseTicket } from '@/hooks/useMyPurchases';
import { PublicParcelTracking } from '@/hooks/useColis';
import { TurnstileWidget, TurnstileWidgetHandle, TURNSTILE_ENABLED } from '@/components/ui/TurnstileWidget';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

const TICKET_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente',  color: 'text-slate-300',  bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
  paid:      { label: 'Payé',        color: 'text-blue-400',   bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  boarded:   { label: 'Embarqué',    color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cancelled: { label: 'Annulé',      color: 'text-slate-500',  bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
  refunded:  { label: 'Remboursé',   color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
};

const PARCEL_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  enregistre: { label: 'Enregistré — en attente de transport', color: 'text-slate-300',  bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
  arrive:     { label: 'Arrivé — prêt pour le retrait',        color: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  retire:     { label: 'Retiré par le destinataire',           color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  retourne:   { label: 'Retourné — non réclamé',               color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  perdu:      { label: 'Signalé perdu',                        color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  annule:     { label: 'Annulé',                                color: 'text-slate-500',  bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

function TicketCard({ ticket }: { ticket: MyPurchaseTicket }) {
  const cfg = TICKET_STATUS_CFG[ticket.status];
  return (
    <div className="bg-[#080D1A] border border-slate-800/60 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono font-bold text-indigo-400">{ticket.reference}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
      </div>
      {ticket.route && (
        <p className="text-sm text-slate-300">{ticket.route.origin_city} → {ticket.route.destination_city}</p>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/60">
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Départ</p>
          <p className="text-slate-300 font-[family-name:var(--font-mono)]">{formatDateTime(ticket.departure_datetime)}</p>
        </div>
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Siège</p>
          <p className="text-slate-300">{ticket.seat_number ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Prix</p>
          <p className="text-slate-300 font-[family-name:var(--font-mono)]">{formatFCFA(ticket.price_fcfa)}</p>
        </div>
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Acheté le</p>
          <p className="text-slate-300 font-[family-name:var(--font-mono)]">{formatDateTime(ticket.purchased_at)}</p>
        </div>
      </div>
    </div>
  );
}

function ParcelCard({ parcel }: { parcel: PublicParcelTracking }) {
  const cfg = PARCEL_STATUS_CFG[parcel.status];
  const steps = [
    { label: 'Enregistré', at: parcel.registered_at },
    { label: 'Arrivé',     at: parcel.arrived_at },
    { label: parcel.status === 'retourne' ? 'Retourné' : 'Retiré', at: parcel.released_at ?? parcel.returned_at },
  ];
  return (
    <div className="bg-[#080D1A] border border-slate-800/60 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono font-bold text-indigo-400">{parcel.tracking_number}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
      </div>
      {parcel.route && (
        <p className="text-sm text-slate-300">{parcel.route.origin_city} → {parcel.route.destination_city}</p>
      )}
      <div className="pt-2 border-t border-slate-800/60 space-y-2">
        {steps.filter(s => s.at).map(s => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{s.label}</span>
            <span className="text-slate-500 font-[family-name:var(--font-mono)]">{formatDateTime(s.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MesAchatsPage() {
  const [input, setInput] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const widgetRef = useRef<TurnstileWidgetHandle>(null);
  const { data, error, isLoading, search } = useMyPurchases();

  // Le CAPTCHA n'est actif que si une clé site est configurée (voir
  // TurnstileWidget) — en dev sans compte Cloudflare, la recherche reste
  // utilisable sans jeton, le backend applique le même repli.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || (TURNSTILE_ENABLED && !token)) return;
    // Le jeton est consommé ici, atomiquement avec la recherche — jamais en
    // réaction à un changement d'état découplé (voir piège corrigé dans
    // TurnstileWidget.tsx). reset() récupère un nouveau jeton sur le même
    // widget, sans le remonter.
    search(value, token);
    setToken(null);
    widgetRef.current?.reset();
  };

  const hasResults = data && (data.tickets.length > 0 || data.parcels.length > 0);

  return (
    <div className="min-h-screen bg-[#060A14] p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-md mt-10">
        <div className="text-center mb-8">
          <p className="text-xs font-black text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">TMS — Côte d&apos;Ivoire</p>
          <h1 className="text-xl font-bold text-white mt-2 font-[family-name:var(--font-syne)]">Mes achats</h1>
          <p className="text-xs text-slate-500 mt-1">Entrez votre numéro de téléphone pour retrouver vos billets et colis</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            autoFocus
            type="tel"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="07 00 00 00 00"
            className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 font-[family-name:var(--font-mono)] focus:outline-none focus:border-indigo-500/50"
          />
          <button type="submit" disabled={!input.trim() || (TURNSTILE_ENABLED && !token)} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Rechercher
          </button>
        </form>

        <div className="flex justify-center mb-4">
          <TurnstileWidget ref={widgetRef} onToken={setToken} />
        </div>

        {TURNSTILE_ENABLED && !token && input.trim() && (
          <p className="text-xs text-slate-500 text-center mb-4">Vérification de sécurité en cours…</p>
        )}

        {isLoading && <p className="text-xs text-slate-500 text-center">Recherche...</p>}
        {error && (
          <p className="text-xs text-red-400 text-center">{error.message || 'Une erreur est survenue, réessayez.'}</p>
        )}
        {data && !hasResults && (
          <p className="text-xs text-slate-500 text-center">Aucun billet ni colis trouvé pour ce numéro.</p>
        )}

        {data && data.tickets.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">Billets ({data.tickets.length})</p>
            <div className="space-y-3">
              {data.tickets.map(t => <TicketCard key={t.reference} ticket={t} />)}
            </div>
          </div>
        )}

        {data && data.parcels.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">Colis ({data.parcels.length})</p>
            <div className="space-y-3">
              {data.parcels.map(p => <ParcelCard key={p.tracking_number} parcel={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
