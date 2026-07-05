'use client';

import { useState, useMemo } from 'react';
import { useRoutes, useDepartures, useGates, useStations, Route, Departure, BoardingGate, RouteStop, Station } from '@/hooks/usePlanning';
import { apiFetch, formatFCFA } from '@/lib/api';
import {
  FormCreateRoute, FormAddRouteStop, FormEditRouteStop,
  FormCreateGate, FormEditGate, FormCreateStation, FormEditStation,
  FormCreateDeparture, FormUpdateDepartureStatus,
} from '@/components/planning/PlanningForms';
import { usePermissions } from '@/lib/permissions';

// ── Helpers ───────────────────────────────────────────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  scheduled: { label: 'Programmé',    dot: 'bg-sky-400',     text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20'    },
  boarding:  { label: 'Embarquement', dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'  },
  departed:  { label: 'En route',     dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'},
  arrived:   { label: 'Arrivé',       dot: 'bg-slate-500',   text: 'text-slate-500',   bg: 'bg-slate-500/10',   border: 'border-slate-700'     },
  cancelled: { label: 'Annulé',       dot: 'bg-red-500',     text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'    },
};

// ── Skeleton ──────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

// ── Badge statut ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'departed' || status === 'boarding' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

// ── Carte route ───────────────────────────────────────────────────────────
function RouteCard({ route, selected, onClick }: {
  route: Route;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:border-slate-600
        ${selected
          ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
          : 'bg-[#080D1A] border-slate-800/60 hover:bg-slate-800/30'
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-[10px] font-bold font-[family-name:var(--font-mono)] px-2 py-0.5 rounded
          ${selected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
          {route.code}
        </span>
        {route.is_dynamic && (
          <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Multi-arrêts
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-xs font-bold text-white font-[family-name:var(--font-syne)]">
          {route.origin_city}
        </span>
        <span className="text-slate-600 text-xs">→</span>
        <span className="text-xs font-bold text-white font-[family-name:var(--font-syne)]">
          {route.destination_city}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div>
          <p className="text-slate-600">Distance</p>
          <p className="text-slate-300 font-[family-name:var(--font-mono)] font-medium mt-0.5">
            {route.distance_km} km
          </p>
        </div>
        <div>
          <p className="text-slate-600">Durée</p>
          <p className="text-slate-300 font-[family-name:var(--font-mono)] font-medium mt-0.5">
            {durationLabel(route.estimated_duration_min)}
          </p>
        </div>
        <div>
          <p className="text-slate-600">Tarif</p>
          <p className="text-emerald-400 font-[family-name:var(--font-mono)] font-medium mt-0.5">
            {new Intl.NumberFormat('fr-FR').format(route.base_fare)} F
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Ligne de départ ───────────────────────────────────────────────────────
function DepartureRow({ dep }: { dep: Departure }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[dep.status] || STATUS_CFG.scheduled;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${cfg.border} bg-[#080D1A]`}>
      {/* Ligne principale */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-slate-800/20 transition-all"
      >
        {/* Heure */}
        <div className="text-center w-14 flex-shrink-0">
          <p className="text-base font-bold text-white font-[family-name:var(--font-mono)]">
            {formatTime(dep.departure_datetime)}
          </p>
          <p className="text-[10px] text-slate-600">
            {formatDate(dep.departure_datetime)}
          </p>
        </div>

        {/* Séparateur vertical */}
        <div className="w-px h-10 bg-slate-800 flex-shrink-0" />

        {/* Route */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)] truncate">
            {dep.route.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {dep.vehicle && (
              <span className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)]">
                {dep.vehicle.plate_number}
              </span>
            )}
            {dep.driver && (
              <span className="text-[11px] text-slate-500">
                {dep.driver.full_name}
              </span>
            )}
            {!dep.vehicle && (
              <span className="text-[11px] text-amber-500">⚠ Véhicule non affecté</span>
            )}
          </div>
        </div>

        {/* ETA */}
        <div className="text-center hidden sm:block w-16 flex-shrink-0">
          <p className={`text-sm font-bold font-[family-name:var(--font-mono)] ${dep.delay_minutes && dep.delay_minutes > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {formatTime(dep.estimated_arrival)}
          </p>
          {dep.delay_minutes && dep.delay_minutes > 0 ? (
            <p className="text-[10px] text-amber-500">+{dep.delay_minutes}min</p>
          ) : (
            <p className="text-[10px] text-slate-600">ETA</p>
          )}
        </div>

        {/* Quai */}
        {dep.boarding_gate ? (
          <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
            <span className="text-xs font-bold text-blue-400 font-[family-name:var(--font-mono)]">
              {dep.boarding_gate}
            </span>
          </div>
        ) : (
          <div className="hidden md:block w-10 flex-shrink-0" />
        )}

        {/* Statut */}
        <div className="flex-shrink-0">
          <StatusBadge status={dep.status} />
        </div>

        {/* Expand arrow */}
        <span className={`text-slate-600 text-xs transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Détail expandé */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-900/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mt-3">
            <div>
              <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Départ prévu</p>
              <p className="text-slate-300 font-[family-name:var(--font-mono)]">
                {formatTime(dep.departure_datetime)}
              </p>
            </div>
            <div>
              <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Départ réel</p>
              <p className={`font-[family-name:var(--font-mono)] ${dep.actual_departure ? 'text-slate-300' : 'text-slate-600'}`}>
                {formatTime(dep.actual_departure)}
              </p>
            </div>
            <div>
              <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Arrivée prévue</p>
              <p className="text-slate-300 font-[family-name:var(--font-mono)]">
                {formatTime(dep.estimated_arrival)}
              </p>
            </div>
            <div>
              <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Arrivée réelle</p>
              <p className={`font-[family-name:var(--font-mono)] ${dep.actual_arrival ? 'text-slate-300' : 'text-slate-600'}`}>
                {formatTime(dep.actual_arrival)}
              </p>
            </div>
            {dep.vehicle && (
              <div>
                <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Véhicule</p>
                <p className="text-slate-300">{dep.vehicle.plate_number} · {dep.vehicle.model}</p>
                <p className="text-slate-500 text-[10px]">{dep.vehicle.capacity} places</p>
              </div>
            )}
            {dep.driver && (
              <div>
                <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Chauffeur</p>
                <p className="text-slate-300">{dep.driver.full_name}</p>
                <p className="text-slate-500 text-[10px] font-[family-name:var(--font-mono)]">{dep.driver.phone}</p>
              </div>
            )}
            <div>
              <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Quai</p>
              <p className={dep.boarding_gate ? 'text-blue-400 font-bold font-[family-name:var(--font-mono)]' : 'text-slate-600'}>
                {dep.boarding_gate || 'Non assigné'}
              </p>
            </div>
            <div>
              <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Places dispo</p>
              <p className="text-slate-300 font-[family-name:var(--font-mono)]">{dep.seats_available}</p>
            </div>
            {dep.is_manual && (
              <div className="col-span-2">
                <span className="text-[10px] bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">
                  Départ créé manuellement
                </span>
              </div>
            )}
            {dep.cancellation_reason && (
              <div className="col-span-4">
                <p className="text-slate-600 mb-1 uppercase tracking-wider text-[10px]">Motif annulation</p>
                <p className="text-red-400 text-xs">{dep.cancellation_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE PLANNING
// ══════════════════════════════════════════════════════════════════════════
export default function PlanningPage() {
  const { can } = usePermissions();
  const canWrite = can('planningWrite');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [dateFilter, setDateFilter]       = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter]   = useState('');
  const [searchQuery, setSearchQuery]     = useState('');
  const [activeTab, setActiveTab]         = useState<'departures' | 'routes' | 'gates'>('departures');
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showCreateDeparture, setShowCreateDeparture] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [selectedRouteForStop, setSelectedRouteForStop] = useState<number | null>(null);
  const [showStopForm, setShowStopForm] = useState(false);
  const [editingStop, setEditingStop] = useState<{ routeId: number; stop: RouteStop } | null>(null);
  const [showCreateGate, setShowCreateGate] = useState(false);
  const [editingGate, setEditingGate] = useState<BoardingGate | null>(null);
  const [showCreateStation, setShowCreateStation] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);

  const { data: routesData, isLoading: routesLoading, mutate: mutateRoutes } = useRoutes({ with_stops: '1' });
  const { data: gatesData, isLoading: gatesLoading, mutate: mutateGates } = useGates();
  const { data: stationsData, isLoading: stationsLoading, mutate: mutateStations } = useStations();

  const departureParams: Record<string, string> = {};
  if (dateFilter)     departureParams.date      = dateFilter;
  if (statusFilter)   departureParams.status    = statusFilter;
  if (selectedRoute)  departureParams.route_id  = String(selectedRoute);

  const { data: departuresData, isLoading: depsLoading } = useDepartures(departureParams);

  const routes    = routesData?.data ?? [];
  const gates     = gatesData?.data ?? [];
  const stations  = stationsData?.data ?? [];
  const departures = departuresData?.data ?? [];

  const gatesByStationId = useMemo(() => {
    const groups: Record<number, BoardingGate[]> = {};
    for (const g of gates) {
      (groups[g.station_id] ??= []).push(g);
    }
    return groups;
  }, [gates]);

  const handleDeleteStop = async (routeId: number, stop: RouteStop) => {
    if (!window.confirm(`Supprimer l'arrêt "${stop.city_name}" ?`)) return;
    try {
      await apiFetch(`/planning/routes/${routeId}/stops/${stop.id}`, { method: 'DELETE' } as RequestInit);
      mutateRoutes();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteGate = async (gate: BoardingGate) => {
    if (!window.confirm(`Supprimer le quai ${gate.gate_code} (${gate.station?.name ?? ''}) ?`)) return;
    try {
      await apiFetch(`/planning/gates/${gate.id}`, { method: 'DELETE' } as RequestInit);
      mutateGates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteStation = async (station: Station) => {
    if (!window.confirm(`Supprimer la gare "${station.name}" ?`)) return;
    try {
      await apiFetch(`/planning/stations/${station.id}`, { method: 'DELETE' } as RequestInit);
      mutateStations();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  // Filtrage par recherche côté client
  const filteredDepartures = useMemo(() => {
    if (!searchQuery.trim()) return departures;
    const q = searchQuery.toLowerCase();
    return departures.filter(d =>
      d.route.name.toLowerCase().includes(q) ||
      d.vehicle?.plate_number?.toLowerCase().includes(q) ||
      d.driver?.full_name?.toLowerCase().includes(q)
    );
  }, [departures, searchQuery]);

  // Stats du jour
  const stats = useMemo(() => ({
    total:     departures.length,
    scheduled: departures.filter(d => d.status === 'scheduled').length,
    departed:  departures.filter(d => d.status === 'departed').length,
    arrived:   departures.filter(d => d.status === 'arrived').length,
    cancelled: departures.filter(d => d.status === 'cancelled').length,
  }), [departures]);

  return (
    <div className="min-h-screen bg-[#060A14]">
      {/* Header */}
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-6 gap-4">
        <div>
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">
            Planning
          </h1>
          <p className="text-xs text-slate-600">Gestion des lignes et des départs</p>
        </div>

        {/* Stats rapides */}
        <div className="ml-auto hidden md:flex items-center gap-3">
          {[
            { label: 'Total',     value: stats.total,     color: 'text-slate-400' },
            { label: 'En route',  value: stats.departed,  color: 'text-emerald-400' },
            { label: 'Arrivés',   value: stats.arrived,   color: 'text-slate-500' },
            { label: 'Annulés',   value: stats.cancelled, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="text-center px-3 border-l border-slate-800 first:border-0">
              <p className={`text-lg font-bold font-[family-name:var(--font-syne)] ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">

        {/* ── Sidebar lignes ── */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-800/60 bg-[#080D1A] flex flex-col">
          <div className="p-4 border-b border-slate-800/60">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
              Lignes actives
            </p>
            <button
              onClick={() => setSelectedRoute(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all mb-2 font-[family-name:var(--font-syne)]
                ${!selectedRoute
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
            >
              Toutes les lignes ({routes.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {routesLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : (
              routes.map(route => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRoute === route.id}
                  onClick={() => setSelectedRoute(selectedRoute === route.id ? null : route.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4 border-b border-slate-800/60 bg-[#060A14]">
            {[
              { id: 'departures', label: '🚌 Départs' },
              { id: 'routes',     label: '🗺 Lignes' },
              { id: 'gates',      label: '🚪 Quais' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
                  ${activeTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Départs ── */}
          {activeTab === 'departures' && (
            <div className="flex-1 overflow-y-auto">
              {/* Filtres */}
              <div className="sticky top-0 z-10 bg-[#060A14]/95 backdrop-blur-sm border-b border-slate-800/40 px-6 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  {canWrite && (
                    <>
                      <button onClick={() => setShowCreateDeparture(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">+ Nouveau départ</button>
                      <button onClick={() => setShowUpdateStatus(true)} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Éditer statut</button>
                    </>
                  )}
                  {/* Date */}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-[family-name:var(--font-syne)]">
                      Date
                    </label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={e => setDateFilter(e.target.value)}
                      className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-[family-name:var(--font-mono)] focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  {/* Statut */}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-[family-name:var(--font-syne)]">
                      Statut
                    </label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-[family-name:var(--font-syne)] focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="">Tous</option>
                      <option value="scheduled">Programmé</option>
                      <option value="boarding">Embarquement</option>
                      <option value="departed">En route</option>
                      <option value="arrived">Arrivé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>

                  {/* Recherche */}
                  <div className="flex-1 min-w-40">
                    <input
                      type="text"
                      placeholder="Rechercher ligne, véhicule, chauffeur..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 placeholder-slate-600 font-[family-name:var(--font-syne)] focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <span className="text-xs text-slate-600 font-[family-name:var(--font-mono)] ml-auto">
                    {filteredDepartures.length} résultat{filteredDepartures.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Liste départs */}
              <div className="p-6 space-y-2">
                {depsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                ) : filteredDepartures.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-4xl mb-3">🚌</p>
                    <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">
                      Aucun départ trouvé
                    </p>
                    <p className="text-slate-600 text-xs mt-1">
                      Modifiez les filtres ou changez la date
                    </p>
                  </div>
                ) : (
                  filteredDepartures.map(dep => (
                    <DepartureRow key={dep.id} dep={dep} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Tab Lignes ── */}
          {activeTab === 'routes' && (
            <div className="flex-1 overflow-y-auto p-6">
              {canWrite && (
                <div className="mb-4 flex justify-end">
                  <button onClick={() => setShowCreateRoute(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">+ Nouvelle ligne</button>
                </div>
              )}
              {routesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {routes.map(route => (
                    <div key={route.id} className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-5 hover:border-slate-700 transition-all">
                      {/* En-tête */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                              {route.code}
                            </span>
                            {route.is_dynamic && (
                              <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                Multi-arrêts
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-white font-[family-name:var(--font-syne)]">
                            {route.name}
                          </h3>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full border font-bold uppercase tracking-wider
                          ${route.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}>
                          {route.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Itinéraire visuel */}
                      <div className="flex items-center gap-2 mb-4 p-3 bg-slate-900/40 rounded-lg">
                        <div className="text-center">
                          <div className="w-2 h-2 rounded-full bg-blue-400 mx-auto mb-1" />
                          <p className="text-[10px] text-slate-400 font-bold font-[family-name:var(--font-syne)]">
                            {route.origin_city}
                          </p>
                          {route.origin_station ? (
                            <p className="text-[9px] text-blue-400/70 mt-0.5">{route.origin_station.name}</p>
                          ) : (
                            <p className="text-[9px] text-amber-500/70 mt-0.5">Aucune gare</p>
                          )}
                        </div>
                        <div className="flex-1 flex items-center">
                          <div className="flex-1 h-px bg-slate-700 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-[#060A14] px-2 text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">
                                {route.distance_km} km
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-1" />
                          <p className="text-[10px] text-slate-400 font-bold font-[family-name:var(--font-syne)]">
                            {route.destination_city}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-900/40 rounded-lg p-2">
                          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">
                            {durationLabel(route.estimated_duration_min)}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">Durée</p>
                        </div>
                        <div className="bg-slate-900/40 rounded-lg p-2">
                          <p className="text-sm font-bold text-emerald-400 font-[family-name:var(--font-syne)]">
                            {new Intl.NumberFormat('fr-FR').format(route.base_fare)}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">Tarif FCFA</p>
                        </div>
                        <div className="bg-slate-900/40 rounded-lg p-2">
                          <p className="text-sm font-bold text-blue-400 font-[family-name:var(--font-syne)]">
                            {departures.filter(d => d.route.id === route.id).length}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">Départs/jour</p>
                        </div>
                      </div>
                      {/* Arrêts intermédiaires (lignes dynamiques uniquement) */}
                      {route.is_dynamic && (
                        <div className="mt-4 pt-4 border-t border-slate-800/60">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-syne)]">
                            Arrêts intermédiaires
                          </p>
                          {(route.stops ?? []).length === 0 ? (
                            <p className="text-[11px] text-slate-600">Aucun arrêt défini</p>
                          ) : (
                            <div className="space-y-1.5">
                              {[...(route.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order).map(stop => (
                                <div key={stop.id} className="flex items-center justify-between gap-2 bg-slate-900/40 rounded-lg px-2.5 py-1.5">
                                  <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-slate-300">{stop.stop_order}. {stop.city_name}</span>
                                    <span className="text-[10px] text-slate-600 ml-2 font-[family-name:var(--font-mono)]">
                                      {stop.distance_from_origin_km} km · {new Intl.NumberFormat('fr-FR').format(stop.fare_from_origin)} F
                                    </span>
                                  </div>
                                  {canWrite && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      <button onClick={() => setEditingStop({ routeId: route.id, stop })} className="text-[10px] text-slate-500 hover:text-blue-400 px-1.5">✎</button>
                                      <button onClick={() => handleDeleteStop(route.id, stop)} className="text-[10px] text-slate-500 hover:text-red-400 px-1.5">✕</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {canWrite && route.is_dynamic && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => { setSelectedRouteForStop(route.id); setShowStopForm(true); }} className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-purple-400">+ Arrêt</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab Quais ── */}
          {activeTab === 'gates' && (
            <div className="flex-1 overflow-y-auto p-6">
              {canWrite && (
                <div className="mb-4 flex justify-end gap-2">
                  <button onClick={() => setShowCreateStation(true)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">+ Gare</button>
                  <button onClick={() => setShowCreateGate(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">+ Quai</button>
                </div>
              )}
              {stationsLoading || gatesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : stations.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-3">🚉</p>
                  <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">Aucune gare définie</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {stations.map(station => (
                    <div key={station.id} className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-bold text-white font-[family-name:var(--font-syne)]">
                            {station.name}
                            {!station.is_active && <span className="ml-2 text-[9px] text-slate-500 uppercase tracking-wider">Inactive</span>}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{station.city}</p>
                        </div>
                        {canWrite && (
                          <div className="flex gap-2">
                            <button onClick={() => setEditingStation(station)} className="text-[10px] text-slate-500 hover:text-blue-400 px-1">✎</button>
                            <button onClick={() => handleDeleteStation(station)} className="text-[10px] text-slate-500 hover:text-red-400 px-1">✕</button>
                          </div>
                        )}
                      </div>
                      {(gatesByStationId[station.id] ?? []).length === 0 ? (
                        <p className="text-[11px] text-slate-600">Aucun quai défini</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(gatesByStationId[station.id] ?? []).map(gate => (
                            <div
                              key={gate.id}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${gate.is_active ? 'border-blue-500/30 bg-blue-500/10' : 'border-slate-700 bg-slate-800/40'}`}
                            >
                              <span className={`text-xs font-bold font-[family-name:var(--font-mono)] ${gate.is_active ? 'text-blue-400' : 'text-slate-500'}`}>
                                {gate.gate_code}
                              </span>
                              {!gate.is_active && (
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider">Inactif</span>
                              )}
                              {canWrite && (
                                <div className="flex gap-1 ml-1">
                                  <button onClick={() => setEditingGate(gate)} className="text-[10px] text-slate-500 hover:text-blue-400 px-1">✎</button>
                                  <button onClick={() => handleDeleteGate(gate)} className="text-[10px] text-slate-500 hover:text-red-400 px-1">✕</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Créer une ligne</h3>
                <p className="text-xs text-slate-500">Ajoutez une nouvelle ligne au réseau</p>
              </div>
              <button onClick={() => setShowCreateRoute(false)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormCreateRoute onSuccess={() => { setShowCreateRoute(false); setActiveTab('routes'); }} />
          </div>
        </div>
      )}

      {showCreateDeparture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Créer un départ</h3>
                <p className="text-xs text-slate-500">Programmez un nouveau départ manuel</p>
              </div>
              <button onClick={() => setShowCreateDeparture(false)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormCreateDeparture onSuccess={() => { setShowCreateDeparture(false); }} />
          </div>
        </div>
      )}

      {showUpdateStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Mettre à jour un statut</h3>
                <p className="text-xs text-slate-500">Changez l’état d’un départ</p>
              </div>
              <button onClick={() => setShowUpdateStatus(false)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormUpdateDepartureStatus onSuccess={() => { setShowUpdateStatus(false); }} />
          </div>
        </div>
      )}

      {showStopForm && selectedRouteForStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Ajouter un arrêt</h3>
                <p className="text-xs text-slate-500">Ajoutez un point intermédiaire à une ligne dynamique</p>
              </div>
              <button onClick={() => { setShowStopForm(false); setSelectedRouteForStop(null); }} className="text-sm text-slate-400">✕</button>
            </div>
            <FormAddRouteStop routeId={selectedRouteForStop} onSuccess={() => { setShowStopForm(false); setSelectedRouteForStop(null); mutateRoutes(); }} />
          </div>
        </div>
      )}

      {editingStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Modifier un arrêt</h3>
                <p className="text-xs text-slate-500">{editingStop.stop.city_name}</p>
              </div>
              <button onClick={() => setEditingStop(null)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormEditRouteStop
              routeId={editingStop.routeId}
              stop={editingStop.stop}
              onSuccess={() => { setEditingStop(null); mutateRoutes(); }}
            />
          </div>
        </div>
      )}

      {showCreateGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Créer un quai</h3>
                <p className="text-xs text-slate-500">Ajoutez un quai d'embarquement à une gare</p>
              </div>
              <button onClick={() => setShowCreateGate(false)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormCreateGate onSuccess={() => { setShowCreateGate(false); mutateGates(); }} />
          </div>
        </div>
      )}

      {editingGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Modifier un quai</h3>
                <p className="text-xs text-slate-500">{editingGate.station?.name} · {editingGate.gate_code}</p>
              </div>
              <button onClick={() => setEditingGate(null)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormEditGate gate={editingGate} onSuccess={() => { setEditingGate(null); mutateGates(); }} />
          </div>
        </div>
      )}

      {showCreateStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Créer une gare</h3>
                <p className="text-xs text-slate-500">Ajoutez une nouvelle gare routière</p>
              </div>
              <button onClick={() => setShowCreateStation(false)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormCreateStation onSuccess={() => { setShowCreateStation(false); mutateStations(); }} />
          </div>
        </div>
      )}

      {editingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Modifier une gare</h3>
                <p className="text-xs text-slate-500">{editingStation.name}</p>
              </div>
              <button onClick={() => setEditingStation(null)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormEditStation station={editingStation} onSuccess={() => { setEditingStation(null); mutateStations(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
