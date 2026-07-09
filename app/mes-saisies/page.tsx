'use client';

import { useState } from 'react';
import { useIncidents } from '@/hooks/useIncidents';
import { useConsumptionLogs } from '@/hooks/useFuel';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

const SEVERITY_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:      { label: 'Faible',   color: 'text-slate-400',  bg: 'bg-slate-800/40',  border: 'border-slate-700'     },
  medium:   { label: 'Moyenne',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  high:     { label: 'Haute',    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  critical: { label: 'Critique', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
};

type Tab = 'incidents' | 'consumption';

function IncidentsTab() {
  const { data, isLoading } = useIncidents({ mine: '1', per_page: '30' });
  const incidents = data?.data ?? [];

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-20" />)}</div>;
  if (!incidents.length) return <p className="text-slate-600 text-sm text-center py-12">Vous n&apos;avez signalé aucun incident</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {incidents.map((inc) => {
        const cfg = SEVERITY_CFG[inc.severity];
        return (
          <div key={inc.id} className="p-4 rounded-xl bg-[#080D1A] border border-slate-800/60">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{inc.title}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{inc.vehicle?.plate_number} · {inc.driver ? `${inc.driver.first_name} ${inc.driver.last_name}` : '—'}</p>
            <p className="text-[11px] text-slate-600 mt-2">{formatDateTime(inc.occurred_at)} — statut: {inc.status}</p>
          </div>
        );
      })}
    </div>
  );
}

function ConsumptionTab() {
  const { data, isLoading } = useConsumptionLogs({ mine: '1', per_page: '30' });
  const logs = data?.data ?? [];

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-16" />)}</div>;
  if (!logs.length) return <p className="text-slate-600 text-sm text-center py-12">Vous n&apos;avez enregistré aucune consommation</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {logs.map((log) => (
        <div key={log.id} className="p-4 rounded-xl bg-[#080D1A] border border-slate-800/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">{log.vehicle?.plate_number ?? `Véhicule #${log.vehicle_id}`}</p>
            <p className="text-xs font-mono text-orange-400">{log.consumption_per_100km} L/100km</p>
          </div>
          <p className="text-xs text-slate-500 mt-2">{log.liters_consumed} L sur {log.distance_km} km</p>
          <p className="text-[11px] text-slate-600 mt-2">{formatDateTime(log.recorded_at)}</p>
        </div>
      ))}
    </div>
  );
}

export default function MesSaisiesPage() {
  const [tab, setTab] = useState<Tab>('incidents');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'incidents',   label: 'Incidents signalés' },
    { id: 'consumption', label: 'Consommations enregistrées' },
  ];

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Mes saisies</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Ce que vous avez personnellement enregistré</p>
        </div>
      </header>

      <div className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-slate-800/60 bg-[#060A14] overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)] whitespace-nowrap
              ${tab === t.id ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'incidents'   && <IncidentsTab />}
        {tab === 'consumption' && <ConsumptionTab />}
      </div>
    </div>
  );
}
