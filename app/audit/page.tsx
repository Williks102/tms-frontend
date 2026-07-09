'use client';

import { useState } from 'react';
import { useActivityLog } from '@/hooks/useAudit';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

const ACTION_ICON: Record<string, string> = {
  employee: '🧑‍💼', departure: '⊞', ticket: '🎫', cash_voucher: '💰',
  payslip: '💵', incident: '⚡', leave: '🗓️', disciplinary: '⚠️',
  driver_document: '📄', vehicle_document: '📄', parcel: '📦',
};

function iconFor(action: string): string {
  const prefix = action.split('.')[0];
  return ACTION_ICON[prefix] ?? '•';
}

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params: Record<string, string> = {};
  if (action) params.action = action;
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, isLoading } = useActivityLog(params);
  const logs = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Piste d&apos;audit</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Historique des actions sensibles de l&apos;application</p>
        </div>
      </header>

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <input
            type="text" placeholder="Filtrer par action (ex: ticket.cancelled)"
            value={action} onChange={(e) => setAction(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 min-w-[220px]"
          />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50" />
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-14" />)}</div>
        ) : !logs.length ? (
          <p className="text-slate-600 text-sm text-center py-12">Aucune action enregistrée</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#080D1A] border border-slate-800/60">
                <span className="text-lg flex-shrink-0">{iconFor(log.action)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-mono text-indigo-400">{log.action}</p>
                    <p className="text-[10px] text-slate-600 flex-shrink-0">{formatDateTime(log.created_at)}</p>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{log.description}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{log.user?.name ?? 'Système'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
