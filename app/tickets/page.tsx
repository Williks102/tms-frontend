'use client';

import { useState, useMemo } from 'react';
import { useTickets, useTicketStats, Ticket } from '@/hooks/useTickets';
import { FormSellPhysicalTicket, FormUpdateTicketStatus } from '@/components/tickets/TicketForms';
import { PrintTicketButton } from '@/components/tickets/PrintTicketButton';
import { usePermissions } from '@/lib/permissions';

// ── Configs ────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  paid:      { label: 'Payé',       color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  boarded:   { label: 'Embarqué',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cancelled: { label: 'Annulé',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  refunded:  { label: 'Remboursé',  color: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

const CHANNEL_CFG: Record<string, { icon: string; label: string }> = {
  physical: { icon: '🏧', label: 'Guichet' },
  online:   { icon: '🌐', label: 'En ligne' },
};

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function TicketRow({ ticket, selected, onClick }: { ticket: Ticket; selected: boolean; onClick: () => void }) {
  const chan = CHANNEL_CFG[ticket.channel];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all
        ${selected ? 'bg-purple-500/10 border-purple-500/30 shadow-lg' : 'bg-[#080D1A] hover:bg-slate-800/30 hover:border-slate-700 border-slate-800/60'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{chan.icon}</span>
          <div>
            <p className="text-xs font-bold text-white font-[family-name:var(--font-syne)]">{ticket.passenger_name}</p>
            <p className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)] mt-0.5">
              {ticket.reference} · {formatDateTime(ticket.purchased_at)}
            </p>
          </div>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          {ticket.departure?.route.name ?? `Départ #${ticket.departure_id}`}
          {ticket.destination_stop && <span className="text-amber-500"> → {ticket.destination_stop.city_name}</span>}
          {ticket.seat_number && <span className="text-slate-600"> · Siège {ticket.seat_number}</span>}
        </span>
        <span className="text-purple-400 font-bold font-[family-name:var(--font-mono)]">
          {formatFCFA(ticket.price_fcfa)}
        </span>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE BILLETTERIE (manager) — vente guichet + suivi des billets.
// L'embarquement (scan) et le manifeste vivent désormais sur /controle.
// ══════════════════════════════════════════════════════════════════════════
export default function TicketsPage() {
  const { can } = usePermissions();
  const canWrite = can('ticketsWrite');

  const [statusFilter, setStatusFilter]   = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [searchQuery, setSearchQuery]     = useState('');
  const [selected, setSelected]           = useState<Ticket | null>(null);
  const [showSellForm, setShowSellForm]   = useState(false);
  // Mobile (< lg) : liste et détail billet ne s'affichent jamais côte à côte
  const [mobileShowList, setMobileShowList] = useState(true);

  const handleSelectTicket = (ticket: Ticket) => {
    const next = selected?.id === ticket.id ? null : ticket;
    setSelected(next);
    setMobileShowList(next === null);
  };

  const params: Record<string, string> = {};
  if (statusFilter)  params.status  = statusFilter;
  if (channelFilter) params.channel = channelFilter;
  if (searchQuery)   params.search  = searchQuery;

  const { data: ticketsData, isLoading, mutate } = useTickets(params);
  const { data: stats } = useTicketStats();

  const tickets = ticketsData?.data ?? [];

  const kpis = useMemo(() => ([
    { label: 'Billets aujourd\'hui', value: stats?.today_count ?? 0,                         color: 'text-purple-400' },
    { label: 'Recette aujourd\'hui', value: stats ? formatFCFA(stats.today_revenue) : '—',   color: 'text-emerald-400' },
    { label: 'Guichet',              value: stats?.by_channel?.physical ?? 0,                color: 'text-blue-400' },
    { label: 'En ligne',             value: stats?.by_channel?.online ?? 0,                  color: 'text-sky-400' },
  ]), [stats]);

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Billetterie</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Vente au guichet et suivi des billets</p>
        </div>
        <div className="ml-auto hidden lg:flex items-center gap-3">
          {kpis.map(k => (
            <div key={k.label} className="text-center px-3 border-l border-slate-800 first:border-0">
              <p className={`text-lg font-bold font-[family-name:var(--font-syne)] ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{k.label}</p>
            </div>
          ))}
        </div>
      </header>

      {canWrite && (
        <div className="border-b border-slate-800/60 bg-[#080D1A] p-4">
          <button
            onClick={() => setShowSellForm(v => !v)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${showSellForm ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Vente guichet
          </button>
          {showSellForm && (
            <div className="mt-3">
              <FormSellPhysicalTicket onSuccess={() => { setShowSellForm(false); mutate(); }} />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-7rem)]">
        <div className={`${mobileShowList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-96 flex-shrink-0 border-r border-slate-800/60 bg-[#080D1A]`}>
          <div className="p-3 border-b border-slate-800/60 space-y-2">
            <input
              type="text"
              placeholder="Référence ou nom du passager..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 placeholder-slate-600 font-[family-name:var(--font-syne)] focus:outline-none focus:border-purple-500/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 font-[family-name:var(--font-syne)] focus:outline-none focus:border-purple-500/50">
                <option value="">Tous statuts</option>
                <option value="paid">Payé</option>
                <option value="boarded">Embarqué</option>
                <option value="cancelled">Annulé</option>
                <option value="refunded">Remboursé</option>
              </select>
              <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 font-[family-name:var(--font-syne)] focus:outline-none focus:border-purple-500/50">
                <option value="">Tous canaux</option>
                <option value="physical">Guichet</option>
                <option value="online">En ligne</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : tickets.length === 0 ? (
              <p className="text-center text-slate-600 text-xs py-10">Aucun billet trouvé</p>
            ) : (
              tickets.map(ticket => (
                <TicketRow key={ticket.id} ticket={ticket} selected={selected?.id === ticket.id}
                  onClick={() => handleSelectTicket(ticket)} />
              ))
            )}
          </div>
        </div>

        <div className={`${mobileShowList ? 'hidden' : 'block'} lg:block flex-1 overflow-y-auto bg-[#060A14]`}>
          <button
            onClick={() => setMobileShowList(true)}
            className="lg:hidden w-full flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 bg-[#080D1A] text-xs text-slate-400 hover:text-white"
          >
            ← Retour à la liste
          </button>
          <div className="p-6">
          {selected ? (
            <div className="max-w-xl space-y-4">
              <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <p className="text-base font-bold text-white font-[family-name:var(--font-syne)]">{selected.passenger_name}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={selected.status} />
                    <PrintTicketButton ticket={selected} label="🖨" className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Référence', value: selected.reference },
                    { label: 'Ligne', value: selected.departure?.route.name ?? `#${selected.departure_id}` },
                    { label: 'Destination', value: selected.destination_stop?.city_name ?? selected.departure?.route.destination_city ?? '—' },
                    { label: 'Canal', value: CHANNEL_CFG[selected.channel].label },
                    { label: 'Prix', value: formatFCFA(selected.price_fcfa) },
                    { label: 'Siège', value: selected.seat_number ?? '—' },
                    { label: 'Téléphone', value: selected.passenger_phone ?? '—' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">{item.label}</p>
                      <p className="text-slate-300 font-[family-name:var(--font-mono)]">{item.value}</p>
                    </div>
                  ))}
                </div>
                {selected.cancellation_reason && (
                  <p className="mt-3 text-xs text-red-400">Motif : {selected.cancellation_reason}</p>
                )}
              </div>

              {canWrite && (
                <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
                    Changer le statut
                  </p>
                  <FormUpdateTicketStatus
                    ticketId={selected.id}
                    currentStatus={selected.status}
                    onSuccess={() => { mutate(); setSelected(null); }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-4xl mb-3">🎫</p>
              <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">Sélectionner un billet</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
