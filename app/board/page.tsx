'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBoardLive, useBoardStations } from '@/hooks/useBoard';
import { BoardDeparture } from '@/lib/api';
import { LiveClock } from '@/components/board/LiveClock';
import { APP_FULL_NAME } from '@/lib/branding';

// ── Helpers ───────────────────────────────────────────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Status config (repris de app/planning/page.tsx, palette figée) ─────────
const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  scheduled: { label: 'Programmé',    dot: 'bg-sky-400',     text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20'    },
  boarding:  { label: 'Embarquement', dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'  },
  departed:  { label: 'En route',     dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'},
  arrived:   { label: 'Arrivé',       dot: 'bg-slate-500',   text: 'text-slate-500',   bg: 'bg-slate-500/10',   border: 'border-slate-700'     },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.scheduled;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === 'departed' || status === 'boarding' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

// ── Panneau (départs ou arrivées) ────────────────────────────────────────
function BoardPanel({ title, rows, mode }: { title: string; rows: BoardDeparture[]; mode: 'departures' | 'arrivals' }) {
  return (
    <div className="bg-[#080D1A] border border-slate-800/60 rounded-2xl overflow-hidden flex-1 min-w-0">
      <div className="px-6 py-4 border-b border-slate-800/60">
        <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] uppercase tracking-wide">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-slate-800/60">
        <div className="grid grid-cols-[100px_1fr_100px_180px] gap-4 px-6 py-3 text-xs uppercase tracking-wider text-slate-600 font-[family-name:var(--font-syne)]">
          <span>Heure</span>
          <span>Ligne</span>
          <span>Quai</span>
          <span>Statut</span>
        </div>

        {rows.length === 0 && (
          <div className="px-6 py-10 text-center text-slate-600 text-lg">
            Aucun {mode === 'departures' ? 'départ' : 'arrivée'} prévu(e)
          </div>
        )}

        {rows.map((d) => (
          <div key={d.id} className="grid grid-cols-[100px_1fr_100px_180px] gap-4 px-6 py-4 items-center">
            <span className="text-3xl font-[family-name:var(--font-mono)] text-slate-100 tabular-nums">
              {formatTime(mode === 'departures' ? d.departure_datetime : d.estimated_arrival)}
            </span>
            <div>
              <div className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
                {mode === 'departures' ? d.route.destination_city : d.route.origin_city}
              </div>
              <div className="text-sm text-slate-500 font-[family-name:var(--font-mono)]">
                {d.route.code}
                {d.delay_minutes !== null && d.delay_minutes > 0 && (
                  <span className="ml-2 text-amber-400">+{d.delay_minutes}min</span>
                )}
              </div>
            </div>
            <span className="text-xl font-[family-name:var(--font-mono)] text-slate-300">
              {d.boarding_gate ?? '—'}
            </span>
            <StatusBadge status={d.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardContent() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get('station_id');
  const stationId = stationIdParam ? Number(stationIdParam) : undefined;

  const { data, isLoading } = useBoardLive(stationId);
  const { data: stationsData } = useBoardStations();
  const stations = stationsData?.data ?? [];

  return (
    <div className="min-h-screen bg-[#060A14] p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">{APP_FULL_NAME}</div>
          <h1 className="text-4xl font-bold text-white font-[family-name:var(--font-syne)] mt-1">
            {data?.station?.name ?? 'Toutes les gares'}
          </h1>

          <div className="flex gap-2 mt-3">
            <Link
              href="/board"
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all
                ${!stationId ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
            >
              Toutes
            </Link>
            {stations.map((s) => (
              <Link
                key={s.id}
                href={`/board?station_id=${s.id}`}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all
                  ${stationId === s.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        <LiveClock />
      </div>

      {/* Panneaux */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-xl">Chargement…</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          <BoardPanel title="Départs" rows={data?.departures ?? []} mode="departures" />
          <BoardPanel title="Arrivées" rows={data?.arrivals ?? []} mode="arrivals" />
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060A14]" />}>
      <BoardContent />
    </Suspense>
  );
}
