'use client';

import { useState, useMemo } from 'react';
import { useRoutes, useDepartures } from '@/hooks/usePlanning';
import { useTicketManifest, useScanStats, Ticket } from '@/hooks/useTickets';
import { usePermissions } from '@/lib/permissions';
import { apiFetch } from '@/lib/api';
import { TicketScanner } from '@/components/tickets/TicketScanner';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const CHANNEL_CFG: Record<string, string> = { physical: 'Guichet', online: 'En ligne' };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  paid:      { label: 'Payé',       color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  boarded:   { label: 'Embarqué',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cancelled: { label: 'Annulé',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  refunded:  { label: 'Remboursé',  color: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

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

// ── Résultat du dernier scan ────────────────────────────────────────────────
type ScanResult =
  | { kind: 'success'; ticket: Ticket }
  | { kind: 'error'; message: string };

function ScanResultCard({ result }: { result: ScanResult }) {
  if (result.kind === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">✕</span>
        <p className="text-sm text-red-400 font-semibold">{result.message}</p>
      </div>
    );
  }

  const t = result.ticket;
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">✓</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">{t.passenger_name}</p>
        <p className="text-xs text-slate-400">
          {t.reference} · Siège {t.seat_number ?? '—'} · {t.departure?.route.name ?? `Départ #${t.departure_id}`}
        </p>
      </div>
      <StatusBadge status={t.status} />
    </div>
  );
}

// ── Sélection en cascade : trajet → départ, pour afficher un manifeste ─────
function ManifestDeparturePicker({ departureId, onSelect }: { departureId: number | null; onSelect: (id: number | null) => void }) {
  const [routeId, setRouteId] = useState('');

  const { data: routesData }     = useRoutes();
  const { data: departuresData } = useDepartures(routeId ? { route_id: routeId, per_page: '50' } : {});

  const routes = routesData?.data ?? [];

  const departures = useMemo(() => (departuresData?.data ?? [])
    .slice()
    .sort((a, b) => new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime()),
    [departuresData]
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-syne)]">
          Trajet
        </label>
        <select
          value={routeId}
          onChange={(e) => { setRouteId(e.target.value); onSelect(null); }}
          className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-[family-name:var(--font-syne)] focus:outline-none focus:border-blue-500/50"
        >
          <option value="">Choisir un trajet</option>
          {routes.map(r => (
            <option key={r.id} value={r.id}>{r.code} · {r.origin_city} → {r.destination_city}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-syne)]">
          Départ
        </label>
        <select
          value={departureId ?? ''}
          disabled={!routeId}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-[family-name:var(--font-syne)] focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
        >
          <option value="">
            {!routeId
              ? 'Choisissez un trajet d’abord'
              : !departuresData
                ? 'Chargement des départs...'
                : departures.length === 0
                  ? 'Aucun départ sur ce trajet'
                  : 'Choisir un départ'}
          </option>
          {departures.map(d => (
            <option key={d.id} value={d.id}>
              {formatDateTime(d.departure_datetime)} · {d.status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ManifestPanel({ departureId, canWrite }: { departureId: number | null; canWrite: boolean }) {
  const { data, isLoading, mutate } = useTicketManifest(departureId);
  const [boardingId, setBoardingId] = useState<number | null>(null);

  if (!departureId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-4xl mb-3">🧾</p>
        <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">Choisir un trajet et un départ</p>
        <p className="text-slate-700 text-xs mt-1">pour afficher la liste d'embarquement</p>
      </div>
    );
  }

  if (isLoading) return <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data) return <p className="p-6 text-sm text-slate-500">Départ introuvable</p>;

  const canBoard = data.departure.status === 'boarding' || data.departure.status === 'departed';

  return (
    <div className="p-6 space-y-4">
      <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
        <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">
          {data.departure.route.name} · {data.departure.route.code}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {formatDateTime(data.departure.departure_datetime)}
          {data.departure.boarding_gate && ` · Quai ${data.departure.boarding_gate}`}
          {' · '}Statut: {data.departure.status}
        </p>
        {canWrite && !canBoard && (
          <p className="text-[11px] text-amber-500 mt-2">
            L'embarquement sera possible une fois ce départ passé en statut "Embarquement" ou "En route".
          </p>
        )}
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          {[
            { label: 'Total',    value: data.summary.total },
            { label: 'Embarqués', value: data.summary.boarded },
            { label: 'Guichet',  value: data.summary.physical },
            { label: 'En ligne', value: data.summary.online },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/40 rounded-lg p-2">
              <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">{s.value}</p>
              <p className="text-[10px] text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {data.data.length === 0 ? (
          <p className="text-center text-slate-600 text-xs py-8">Aucun billet actif sur ce départ</p>
        ) : data.data.map(ticket => (
          <div key={ticket.id} className="flex items-center gap-3 p-3 bg-[#080D1A] border border-slate-800/60 rounded-xl">
            <span className="text-sm w-8 text-center text-slate-500 font-[family-name:var(--font-mono)]">
              {ticket.seat_number ?? '—'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{ticket.passenger_name}</p>
              <p className="text-[10px] text-slate-600">{CHANNEL_CFG[ticket.channel]} · {ticket.reference}</p>
            </div>
            <StatusBadge status={ticket.status} />
            {canWrite && ticket.status === 'paid' && canBoard && (
              <button
                onClick={async () => {
                  setBoardingId(ticket.id);
                  try {
                    await apiFetch(`/tickets/${ticket.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'boarded' }),
                    } as RequestInit);
                    mutate();
                  } catch (err: any) {
                    alert(err.message || 'Erreur lors de l\'embarquement');
                  } finally {
                    setBoardingId(null);
                  }
                }}
                disabled={boardingId === ticket.id}
                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                {boardingId === ticket.id ? '...' : 'Embarquer'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE CONTRÔLE — scan d'embarquement (contrôleur, manager)
// ══════════════════════════════════════════════════════════════════════════
export default function ControlePage() {
  const { can } = usePermissions();
  const canWrite = can('ticketsWrite'); // manager uniquement — pilote le bouton "Embarquer" manuel du manifeste

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  // Un seul départ sélectionné, partagé entre le scan et le manifeste — le
  // scan doit être fait dans le contexte d'un départ précis (runbook sécurité
  // v3, point 4) : sans ça, un billet d'un autre trajet en embarquement
  // simultané passait le scan sans erreur.
  const [departureId, setDepartureId] = useState<number | null>(null);
  const { data: stats, mutate: mutateStats } = useScanStats();

  const handleDetect = async (reference: string) => {
    if (scanning || !departureId) return;
    setScanning(true);
    try {
      const result = await apiFetch<{ ticket: Ticket }>('/tickets/scan', {
        method: 'POST',
        body: JSON.stringify({ reference, departure_id: departureId }),
      } as RequestInit);
      setScanResult({ kind: 'success', ticket: result.ticket });
      mutateStats();
    } catch (err: any) {
      setScanResult({ kind: 'error', message: err.message || 'Billet introuvable ou embarquement refusé' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Contrôle</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Scan d'embarquement</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-center px-3 border-l border-slate-800">
            <p className="text-lg font-bold text-emerald-400 font-[family-name:var(--font-syne)]">{stats?.today_total ?? 0}</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Embarqués aujourd'hui</p>
          </div>
          <div className="text-center px-3 border-l border-slate-800">
            <p className="text-lg font-bold text-blue-400 font-[family-name:var(--font-syne)]">{stats?.today_by_me ?? 0}</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Par moi</p>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-4">
        <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-syne)]">
            Départ en embarquement (obligatoire avant de scanner)
          </p>
          <ManifestDeparturePicker departureId={departureId} onSelect={setDepartureId} />
        </div>

        {!departureId && (
          <p className="text-center text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            Sélectionnez le départ devant lequel vous vous trouvez avant de scanner un billet.
          </p>
        )}

        <TicketScanner onDetect={handleDetect} disabled={scanning || !departureId} />
        {scanResult && <ScanResultCard result={scanResult} />}
      </div>

      <div className="border-t border-slate-800/60 mt-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest px-4 sm:px-6 pt-4 font-[family-name:var(--font-syne)]">
          Manifeste d'embarquement
        </p>
        <div className="flex-1 bg-[#060A14]">
          <ManifestPanel departureId={departureId} canWrite={canWrite} />
        </div>
      </div>
    </div>
  );
}
