'use client';

import { useState, useMemo } from 'react';
import { useRoutes, useDepartures, Route, Departure } from '@/hooks/usePlanning';
import { formatFCFA } from '@/lib/api';
import { FormCreateRoute, FormAddRouteStop, FormCreateDeparture, FormUpdateDepartureStatus } from '@/components/planning/PlanningForms';
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
  const [activeTab, setActiveTab]         = useState<'departures' | 'routes'>('departures');
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showCreateDeparture, setShowCreateDeparture] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [selectedRouteForStop, setSelectedRouteForStop] = useState<number | null>(null);
  const [showStopForm, setShowStopForm] = useState(false);

  const { data: routesData, isLoading: routesLoading } = useRoutes();

  const departureParams: Record<string, string> = {};
  if (dateFilter)     departureParams.date      = dateFilter;
  if (statusFilter)   departureParams.status    = statusFilter;
  if (selectedRoute)  departureParams.route_id  = String(selectedRoute);

  const { data: departuresData, isLoading: depsLoading } = useDepartures(departureParams);

  const routes    = routesData?.data ?? [];
  const departures = departuresData?.data ?? [];

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
                      {canWrite && (
                        <div className="mt-4 flex gap-2">
                          <button onClick={() => { setSelectedRouteForStop(route.id); setShowStopForm(true); }} className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-purple-400">+ Arrêt</button>
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
            <FormAddRouteStop routeId={selectedRouteForStop} onSuccess={() => { setShowStopForm(false); setSelectedRouteForStop(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
