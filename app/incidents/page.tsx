'use client';

import { useState, useMemo } from 'react';
import {
  useIncidents, useIncidentDetail, useIncidentStats,
  useQualityDrivers, Incident, IncidentAction,
} from '@/hooks/useIncidents';

// ── Configs ────────────────────────────────────────────────────────────────
const SEVERITY_CFG = {
  low:      { label: 'Faible',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', bar: 'bg-emerald-500' },
  medium:   { label: 'Moyen',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   bar: 'bg-amber-500'   },
  high:     { label: 'Grave',    color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  dot: 'bg-orange-400',  bar: 'bg-orange-500'  },
  critical: { label: 'Critique', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400',     bar: 'bg-red-500'     },
};

const STATUS_CFG = {
  open:          { label: 'Ouvert',        color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  investigating: { label: 'Investigation', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  resolved:      { label: 'Résolu',        color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  closed:        { label: 'Clôturé',       color: 'text-slate-500',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

const CATEGORY_CFG: Record<string, { icon: string; label: string }> = {
  mechanical: { icon: '🔧', label: 'Panne mécanique'  },
  accident:   { icon: '💥', label: 'Accident'          },
  passenger:  { icon: '👤', label: 'Incident passager' },
  road:       { icon: '🌧️', label: 'Route / météo'    },
  driver:     { icon: '🚨', label: 'Incident chauffeur'},
  other:      { icon: '📋', label: 'Autre'             },
};

const ACTION_ICONS: Record<string, string> = {
  repair:              '🔧',
  medical:             '🏥',
  police:              '👮',
  tow:                 '🚛',
  replacement_vehicle: '🚌',
  passenger_support:   '🤝',
  other:               '📋',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

// ── Badge sévérité ─────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CFG[severity as keyof typeof SEVERITY_CFG] || SEVERITY_CFG.low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${severity === 'critical' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

// ── Badge statut ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] || STATUS_CFG.open;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ── Carte incident (liste) ─────────────────────────────────────────────────
function IncidentCard({ incident, selected, onClick }: {
  incident: Incident;
  selected: boolean;
  onClick: () => void;
}) {
  const sev = SEVERITY_CFG[incident.severity as keyof typeof SEVERITY_CFG] || SEVERITY_CFG.low;
  const cat = CATEGORY_CFG[incident.category] || CATEGORY_CFG.other;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all
        ${selected
          ? `${sev.bg} ${sev.border} shadow-lg`
          : `bg-[#080D1A] hover:bg-slate-800/30 hover:border-slate-700
             ${incident.severity === 'critical' ? 'border-red-500/30' :
               incident.status === 'open' ? 'border-slate-700' : 'border-slate-800/60'}`
        }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-bold text-white font-[family-name:var(--font-syne)] leading-snug truncate">
              {incident.title}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-[family-name:var(--font-mono)] mb-2">
            {incident.reference} · {formatDate(incident.occurred_at)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          {incident.vehicle && (
            <p className="text-[10px] text-slate-600 mt-2">
              {incident.vehicle.plate_number} · {incident.driver?.first_name} {incident.driver?.last_name}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Panel détail incident ──────────────────────────────────────────────────
function IncidentDetail({ incidentId }: { incidentId: number }) {
  const { data: incident, isLoading } = useIncidentDetail(incidentId);

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  );

  if (!incident) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-600 text-sm">Erreur de chargement</p>
    </div>
  );

  const sev = SEVERITY_CFG[incident.severity as keyof typeof SEVERITY_CFG] || SEVERITY_CFG.low;
  const cat = CATEGORY_CFG[incident.category] || CATEGORY_CFG.other;
  const totalCost = (incident.actions ?? []).reduce((a, b) => a + (b.cost_fcfa ?? 0), 0);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className={`p-5 border-b border-slate-800/60 ${sev.bg}`}>
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{cat.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-500 font-[family-name:var(--font-mono)]">
                {incident.reference}
              </span>
              <StatusBadge status={incident.status} />
            </div>
            <h2 className="text-base font-bold text-white font-[family-name:var(--font-syne)] leading-snug">
              {incident.title}
            </h2>
          </div>
          <SeverityBadge severity={incident.severity} />
        </div>

        {/* Méta */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Survenu le</p>
            <p className="text-slate-300 font-[family-name:var(--font-mono)]">
              {formatDateTime(incident.occurred_at)}
            </p>
          </div>
          {incident.location && (
            <div>
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Lieu</p>
              <p className="text-slate-300">{incident.location}</p>
            </div>
          )}
          {incident.vehicle && (
            <div>
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Véhicule</p>
              <p className="text-slate-300 font-[family-name:var(--font-mono)]">
                {incident.vehicle.plate_number}
                <span className="text-slate-500"> · {incident.vehicle.model}</span>
              </p>
            </div>
          )}
          {incident.driver && (
            <div>
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Chauffeur</p>
              <p className="text-slate-300">
                {incident.driver.first_name} {incident.driver.last_name}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Description */}
        <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">
            Description
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{incident.description}</p>
        </div>

        {/* Impact financier */}
        {(incident.financial_impact_fcfa !== null || totalCost > 0) && (
          <div className="bg-[#080D1A] border border-orange-500/20 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">
              Impact financier
            </p>
            <p className="text-2xl font-bold text-orange-400 font-[family-name:var(--font-syne)]">
              {new Intl.NumberFormat('fr-FR').format(incident.financial_impact_fcfa ?? totalCost)} FCFA
            </p>
          </div>
        )}

        {/* Actions correctives */}
        {incident.actions && incident.actions.length > 0 && (
          <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
              Actions correctives ({incident.actions.length})
            </p>
            <div className="space-y-3">
              {incident.actions.map((action, i) => (
                <div key={action.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-base">{ACTION_ICONS[action.action_type] || '📋'}</span>
                    {i < (incident.actions?.length ?? 0) - 1 && (
                      <div className="w-px flex-1 bg-slate-800 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-slate-300 font-[family-name:var(--font-syne)]">
                        {action.description}
                      </p>
                      {action.cost_fcfa && action.cost_fcfa > 0 && (
                        <span className="text-[11px] text-orange-400 font-bold font-[family-name:var(--font-mono)] flex-shrink-0 ml-2">
                          {new Intl.NumberFormat('fr-FR').format(action.cost_fcfa)} F
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">
                      {formatDateTime(action.taken_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résolution */}
        {incident.resolution_notes && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">
              ✓ Résolution — {incident.resolved_at ? formatDate(incident.resolved_at) : ''}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{incident.resolution_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel statistiques + qualité ───────────────────────────────────────────
function StatsPanel() {
  const { data: stats, isLoading: statsLoading } = useIncidentStats();
  const { data: quality, isLoading: qualLoading } = useQualityDrivers();

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">

      {/* KPIs incidents */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Incidents ouverts', value: stats.open_count,     color: 'text-red-400',    border: 'border-t-red-500'     },
              { label: 'Critiques actifs',  value: stats.critical_count, color: 'text-orange-400', border: 'border-t-orange-500'  },
              { label: 'Ce mois',           value: stats.this_month,     color: 'text-blue-400',   border: 'border-t-blue-500'    },
              { label: 'Résolution moy.',   value: stats.avg_resolution_hours ? `${Math.round(stats.avg_resolution_hours)}h` : '—', color: 'text-slate-300', border: 'border-t-slate-600' },
            ].map(kpi => (
              <div key={kpi.label} className={`bg-[#080D1A] border border-slate-800/60 border-t-2 ${kpi.border} rounded-xl p-4`}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">
                  {kpi.label}
                </p>
                <p className={`text-2xl font-bold font-[family-name:var(--font-syne)] ${kpi.color}`}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Par catégorie */}
          <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
              Par catégorie
            </p>
            <div className="space-y-2">
              {Object.entries(stats.by_category).map(([cat, count]) => {
                const cfg    = CATEGORY_CFG[cat] || CATEGORY_CFG.other;
                const total  = Object.values(stats.by_category).reduce((a, b) => a + b, 0);
                const pct    = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={cat} className="flex items-center gap-3 text-xs">
                    <span className="text-sm w-5 flex-shrink-0">{cfg.icon}</span>
                    <span className="text-slate-400 flex-1 font-[family-name:var(--font-syne)]">{cfg.label}</span>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-slate-500 font-[family-name:var(--font-mono)] w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Par sévérité */}
          <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
              Par sévérité
            </p>
            <div className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
                const count = stats.by_severity[sev] ?? 0;
                const total = Object.values(stats.by_severity).reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                const cfg   = SEVERITY_CFG[sev];
                return (
                  <div key={sev} className="flex items-center gap-3 text-xs">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                    <span className={`flex-1 font-[family-name:var(--font-syne)] ${cfg.color}`}>{cfg.label}</span>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-slate-500 font-[family-name:var(--font-mono)] w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {/* Scores qualité chauffeurs */}
      <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          🏆 Score qualité chauffeurs — ce mois
        </p>
        {qualLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !quality?.data.length ? (
          <p className="text-slate-600 text-xs text-center py-4">
            Scores calculés le 1er de chaque mois
          </p>
        ) : (
          <div className="space-y-2">
            {quality.data.slice(0, 6).map((entry, i) => {
              const score  = entry.quality_score;
              const color  = score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-blue-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
              const bar    = score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-blue-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
              const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

              return (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="text-sm w-5 flex-shrink-0 text-center">
                    {medal || <span className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">#{i + 1}</span>}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0">
                    {entry.driver?.first_name?.[0]}{entry.driver?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate font-[family-name:var(--font-syne)]">
                      {entry.driver?.first_name} {entry.driver?.last_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-[family-name:var(--font-mono)] flex-shrink-0 ${color}`}>
                    {Math.round(score)}
                  </span>
                  {entry.incidents_count > 0 && (
                    <span className="text-[10px] text-slate-600 flex-shrink-0">
                      {entry.incidents_count} inc.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE INCIDENTS
// ══════════════════════════════════════════════════════════════════════════
export default function IncidentsPage() {
  const [selectedIncident, setSelectedIncident] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter]     = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [categoryFilter, setCategoryFilter]     = useState('');
  const [searchQuery, setSearchQuery]           = useState('');
  const [rightPanel, setRightPanel]             = useState<'stats' | 'detail'>('stats');

  const params: Record<string, string> = {};
  if (severityFilter)  params.severity = severityFilter;
  if (statusFilter)    params.status   = statusFilter;
  if (categoryFilter)  params.category = categoryFilter;

  const { data: incidentsData, isLoading } = useIncidents(params);
  const incidents = incidentsData?.data ?? [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.reference.toLowerCase().includes(q) ||
      (i.location ?? '').toLowerCase().includes(q) ||
      (i.vehicle?.plate_number ?? '').toLowerCase().includes(q)
    );
  }, [incidents, searchQuery]);

  const stats = useMemo(() => ({
    total:    incidents.length,
    open:     incidents.filter(i => i.status === 'open').length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    resolved: incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length,
  }), [incidents]);

  const handleSelect = (id: number) => {
    setSelectedIncident(selectedIncident === id ? null : id);
    setRightPanel('detail');
  };

  return (
    <div className="min-h-screen bg-[#060A14]">
      {/* Header */}
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-6 gap-4">
        <div>
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">
            Incidents & Qualité
          </h1>
          <p className="text-xs text-slate-600">Contrôle qualité opérationnel</p>
        </div>

        <div className="ml-auto hidden md:flex items-center gap-3">
          {[
            { label: 'Total',    value: stats.total,    color: 'text-slate-400'   },
            { label: 'Ouverts',  value: stats.open,     color: 'text-red-400'     },
            { label: 'Critiques',value: stats.critical, color: 'text-orange-400'  },
            { label: 'Résolus',  value: stats.resolved, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="text-center px-3 border-l border-slate-800 first:border-0">
              <p className={`text-lg font-bold font-[family-name:var(--font-syne)] ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">

        {/* ── Sidebar incidents ── */}
        <aside className="w-80 flex-shrink-0 border-r border-slate-800/60 bg-[#080D1A] flex flex-col">
          {/* Filtres */}
          <div className="p-3 border-b border-slate-800/60 space-y-2">
            <input
              type="text"
              placeholder="Référence, titre, lieu, véhicule..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 placeholder-slate-600 font-[family-name:var(--font-syne)] focus:outline-none focus:border-red-500/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 font-[family-name:var(--font-syne)] focus:outline-none focus:border-red-500/50"
              >
                <option value="">Sévérité</option>
                <option value="critical">Critique</option>
                <option value="high">Grave</option>
                <option value="medium">Moyen</option>
                <option value="low">Faible</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 font-[family-name:var(--font-syne)] focus:outline-none focus:border-red-500/50"
              >
                <option value="">Statut</option>
                <option value="open">Ouvert</option>
                <option value="investigating">Investigation</option>
                <option value="resolved">Résolu</option>
                <option value="closed">Clôturé</option>
              </select>
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 font-[family-name:var(--font-syne)] focus:outline-none focus:border-red-500/50"
            >
              <option value="">Toutes catégories</option>
              <option value="mechanical">🔧 Panne mécanique</option>
              <option value="accident">💥 Accident</option>
              <option value="passenger">👤 Incident passager</option>
              <option value="road">🌧️ Route / météo</option>
              <option value="driver">🚨 Incident chauffeur</option>
              <option value="other">📋 Autre</option>
            </select>
            <p className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)] text-right">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : filtered.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-slate-600 text-xs">Aucun incident trouvé</p>
              </div>
            ) : (
              filtered.map(incident => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  selected={selectedIncident === incident.id}
                  onClick={() => handleSelect(incident.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Panel droit ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#060A14]">
          {/* Tabs */}
          <div className="flex border-b border-slate-800/60 px-4 bg-[#080D1A]">
            <button
              onClick={() => setRightPanel('stats')}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
                ${rightPanel === 'stats'
                  ? 'border-red-400 text-red-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
            >
              📊 Statistiques & Qualité
            </button>
            {selectedIncident && (
              <button
                onClick={() => setRightPanel('detail')}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
                  ${rightPanel === 'detail'
                    ? 'border-red-400 text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
              >
                💥 Détail incident
              </button>
            )}
          </div>

          {/* Contenu */}
          <div className="flex-1 overflow-hidden">
            {rightPanel === 'stats' && <StatsPanel />}
            {rightPanel === 'detail' && selectedIncident && (
              <IncidentDetail incidentId={selectedIncident} />
            )}
            {rightPanel === 'detail' && !selectedIncident && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center text-2xl mb-4">
                  💥
                </div>
                <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">
                  Sélectionner un incident
                </p>
                <p className="text-slate-700 text-xs mt-1">
                  Cliquez sur un incident dans la liste pour voir son détail
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
