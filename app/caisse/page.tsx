'use client';

import { useState } from 'react';
import { useMyTickets, Ticket } from '@/hooks/useTickets';
import { FormSellPhysicalTicket } from '@/components/tickets/TicketForms';
import { PrintTicketButton } from '@/components/tickets/PrintTicketButton';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  paid:      { label: 'Payé',       color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  boarded:   { label: 'Embarqué',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cancelled: { label: 'Annulé',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  refunded:  { label: 'Remboursé',  color: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function SoldTicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#080D1A] border border-slate-800/60 rounded-xl">
      <span className="text-sm w-14 flex-shrink-0 text-slate-500 font-[family-name:var(--font-mono)]">
        {formatTime(ticket.purchased_at)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-200 truncate">{ticket.passenger_name}</p>
        <p className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">
          {ticket.reference} · {ticket.departure?.route.name ?? `Départ #${ticket.departure_id}`}
        </p>
      </div>
      <span className="text-purple-400 font-bold font-[family-name:var(--font-mono)] text-xs flex-shrink-0">
        {formatFCFA(ticket.price_fcfa)}
      </span>
      <StatusBadge status={ticket.status} />
      <PrintTicketButton
        ticket={ticket}
        label="🖨"
        className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 flex-shrink-0"
      />
    </div>
  );
}

export default function CaissePage() {
  const [showSellForm, setShowSellForm] = useState(false);
  const { data, isLoading, mutate } = useMyTickets();
  const tickets = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Ma caisse</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Mes ventes du jour</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-center px-3 border-l border-slate-800">
            <p className="text-lg font-bold text-purple-400 font-[family-name:var(--font-syne)]">{data?.summary.count ?? 0}</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Billets vendus</p>
          </div>
          <div className="text-center px-3 border-l border-slate-800">
            <p className="text-lg font-bold text-emerald-400 font-[family-name:var(--font-syne)]">
              {data ? formatFCFA(data.summary.revenue_fcfa) : '—'}
            </p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Recette</p>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-800/60 bg-[#080D1A] p-4">
        <button
          onClick={() => setShowSellForm(v => !v)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${showSellForm ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
          {showSellForm ? 'Annuler' : '+ Vendre un billet'}
        </button>
        {showSellForm && (
          <div className="mt-3 max-w-2xl">
            <FormSellPhysicalTicket onSuccess={() => { setShowSellForm(false); mutate(); }} />
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-[family-name:var(--font-syne)]">
          Mes ventes aujourd'hui
        </p>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎫</p>
            <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">Aucune vente aujourd'hui</p>
          </div>
        ) : (
          tickets.map(ticket => <SoldTicketRow key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </div>
  );
}
