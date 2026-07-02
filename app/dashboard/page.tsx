'use client';

import { useState } from 'react';
import { useDashboardLive, useRentabilite } from '@/hooks/useDashboard';
import { formatFCFA, timeAgo, LiveDeparture, Alert } from '@/lib/api';
import { KpiCard, AlertBadge, StatusDot, SectionTitle, LiveDot } from '@/components/dashboard/ui';

// ── Skeleton ──────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/60 rounded ${className}`} />;
}

// ── Carte départ live ──────────────────────────────────────────────────────
function DepartureCard({ dep }: { dep: LiveDeparture }) {
  const hasDelay = dep.delay_minutes && dep.delay_minutes > 0;

  return (
    <div className={`
      bg-[#080D1A] border rounded-xl p-4 transition-all hover:border-slate-700
      ${dep.status === 'departed' ? 'border-emerald-500/20' : 'border-orange-500/20'}
    `}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">
            {dep.route}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 font-[family-name:var(--font-mono)]">
            {dep.vehicle} · {dep.driver}
          </p>
        </div>
        <StatusDot status={dep.status} />
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-slate-600">Départ </span>
          <span className="text-slate-300 font-[family-name:var(--font-mono)]">
            {new Date(dep.departure_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div>
          <span className="text-slate-600">ETA </span>
          <span className={`font-[family-name:var(--font-mono)] ${hasDelay ? 'text-orange-400' : 'text-slate-300'}`}>
            {new Date(dep.estimated_arrival).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {hasDelay && ` +${dep.delay_minutes}min`}
          </span>
        </div>
        {dep.boarding_gate && (
          <div className="ml-auto">
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)]">
              {dep.boarding_gate}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ligne d'alerte ────────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: Alert }) {
  const icons: Record<string, string> = {
    fuel_anomaly:      '⛽',
    maintenance_due:   '🔧',
    doc_expiry:        '📄',
    overspeed:         '🚨',
    incident_critical: '💥',
    no_gate:           '⊞',
  };

  return (
    <div className={`
      flex items-start gap-3 p-3 rounded-lg border
      ${alert.severity === 'critical'
        ? 'bg-red-500/5 border-red-500/20'
        : alert.severity === 'warning'
          ? 'bg-orange-500/5 border-orange-500/20'
          : 'bg-blue-500/5 border-blue-500/20'
      }
    `}>
      <span className="text-base flex-shrink-0 mt-0.5">
        {icons[alert.type] || '⚠'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertBadge severity={alert.severity}>{alert.severity}</AlertBadge>
          <span className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">
            {timeAgo(alert.created_at)}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
      </div>
    </div>
  );
}

// ── Barre rentabilité ─────────────────────────────────────────────────────
function RentabiliteRow({ line }: { line: any }) {
  const isPositive = line.net_profit_fcfa > 0;
  const marginColor = line.margin_percent > 40
    ? 'text-emerald-400'
    : line.margin_percent > 20
      ? 'text-orange-400'
      : 'text-red-400';

  const barColor = line.margin_percent > 40
    ? 'bg-emerald-500'
    : line.margin_percent > 20
      ? 'bg-orange-500'
      : 'bg-red-500';

  return (
    <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4 hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">
            {line.route_name}
          </p>
          <p className="text-xs text-slate-600 font-[family-name:var(--font-mono)]">
            {line.departures_count} départ{line.departures_count > 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold font-[family-name:var(--font-syne)] ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatFCFA(line.net_profit_fcfa)}
          </p>
          <p className={`text-xs ${marginColor} font-[family-name:var(--font-mono)]`}>
            {line.margin_percent}% marge
          </p>
        </div>
      </div>

      {/* Barre de marge */}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(100, Math.max(0, line.margin_percent))}%` }}
        />
      </div>

      {/* Détail coûts */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <span className="text-slate-600">Revenus</span>
          <p className="text-emerald-400 font-[family-name:var(--font-mono)] font-medium">
            {formatFCFA(line.revenue_fcfa)}
          </p>
        </div>
        <div>
          <span className="text-slate-600">Carburant</span>
          <p className="text-orange-400 font-[family-name:var(--font-mono)] font-medium">
            {formatFCFA(line.fuel_cost_fcfa)}
          </p>
        </div>
        <div>
          <span className="text-slate-600">Chauffeur + Péage</span>
          <p className="text-slate-400 font-[family-name:var(--font-mono)] font-medium">
            {formatFCFA(line.driver_cost_fcfa + line.toll_cost_fcfa)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { data: live, error, isLoading } = useDashboardLive();
  const { data: rentabilite } = useRentabilite();
  const [activeTab, setActiveTab] = useState<'live' | 'alerts' | 'rentabilite'>('live');

  const hasCritical = (live?.alerts.critical ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#060A14]">
      {/* Top bar */}
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-6 gap-4">
        <div>
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">
            Tableau de bord
          </h1>
          <p className="text-xs text-slate-600">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {hasCritical && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 pulse-dot" />
              <span className="text-xs text-red-400 font-bold font-[family-name:var(--font-syne)]">
                {live?.alerts.critical} CRITIQUE{(live?.alerts.critical ?? 0) > 1 ? 'S' : ''}
              </span>
            </div>
          )}
          <LiveDot lastUpdate={live?.generated_at} />
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : error ? (
            <div className="col-span-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-red-400 text-sm">Impossible de contacter l'API Laravel</p>
              <p className="text-red-600 text-xs mt-1">Vérifier que <code className="font-[family-name:var(--font-mono)]">php artisan serve</code> tourne</p>
            </div>
          ) : (
            <>
              <KpiCard label="En route"      value={live?.fleet.on_trip ?? 0}     unit="bus"  icon="🚌" color="green"  className="fade-in-1" />
              <KpiCard label="Embarquement"  value={live?.fleet.boarding ?? 0}    unit="bus"  icon="⬡"  color="orange" className="fade-in-2" />
              <KpiCard label="Au garage"     value={live?.fleet.available ?? 0}   unit="bus"  icon="🏠" color="blue"   className="fade-in-3" />
              <KpiCard label="Maintenance"   value={live?.fleet.maintenance ?? 0} unit="bus"  icon="🔧" color="yellow" className="fade-in-4" />
              <KpiCard label="Chauffeurs"    value={live?.drivers.on_duty ?? 0}   unit="actifs" icon="👤" color="purple" className="fade-in-5" />
              <KpiCard label="Alertes"       value={live?.alerts.total ?? 0}      icon="⚠"  color="red"
                trend={hasCritical ? `${live?.alerts.critical} critique${(live?.alerts.critical ?? 0) > 1 ? 's' : ''}` : undefined}
                className="fade-in-6"
              />
            </>
          )}
        </div>

        {/* ── Finance Row ── */}
        {!isLoading && !error && live && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 fade-in">
            {[
              {
                label: 'Revenus estimés aujourd\'hui',
                value: formatFCFA(live.finance.revenue_today_fcfa),
                sub:   'billets × capacité',
                color: 'text-emerald-400',
                bg:    'border-emerald-500/20',
              },
              {
                label: 'Coût carburant',
                value: formatFCFA(live.finance.fuel_cost_today_fcfa),
                sub:   `${live.finance.pending_vouchers} bon${live.finance.pending_vouchers > 1 ? 's' : ''} en attente`,
                color: 'text-orange-400',
                bg:    'border-orange-500/20',
              },
              {
                label: 'Bénéfice net estimé',
                value: formatFCFA(live.finance.revenue_today_fcfa - live.finance.fuel_cost_today_fcfa),
                sub:   'revenus − carburant',
                color: live.finance.revenue_today_fcfa > live.finance.fuel_cost_today_fcfa
                  ? 'text-emerald-400' : 'text-red-400',
                bg:    'border-slate-800/60',
              },
            ].map((item) => (
              <div key={item.label} className={`bg-[#080D1A] border ${item.bg} rounded-xl p-4`}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">
                  {item.label}
                </p>
                <p className={`text-2xl font-bold ${item.color} font-[family-name:var(--font-syne)]`}>
                  {item.value}
                </p>
                <p className="text-xs text-slate-600 mt-1">{item.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-slate-800/60 mb-4">
          {([
            { id: 'live',        label: '🚌 Départs Live',     count: live?.departures.length },
            { id: 'alerts',      label: '⚠ Alertes',           count: live?.alerts.total, red: hasCritical },
            { id: 'rentabilite', label: '📊 Rentabilité',       count: rentabilite?.lines.length },
          ] as Array<{ id: 'live' | 'alerts' | 'rentabilite'; label: string; count: number | undefined; red?: boolean }>).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider
                border-b-2 transition-all font-[family-name:var(--font-syne)]
                ${activeTab === tab.id
                  ? tab.red
                    ? 'border-red-400 text-red-400'
                    : 'border-blue-400 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)]
                  ${activeTab === tab.id
                    ? tab.red ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-800 text-slate-500'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Départs live ── */}
        {activeTab === 'live' && (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : !live?.departures.length ? (
              <div className="text-center py-16">
                <p className="text-slate-600 text-sm">Aucun départ en cours</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {live.departures.map((dep) => (
                  <DepartureCard key={dep.id} dep={dep} />
                ))}
              </div>
            )}

            {/* Légende statuts */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-800/40">
              {[
                { status: 'departed',  label: 'En route' },
                { status: 'boarding',  label: 'Embarquement' },
                { status: 'scheduled', label: 'Programmé' },
              ].map((s) => (
                <StatusDot key={s.status} status={s.status} />
              ))}
              <span className="text-xs text-slate-600 ml-auto font-[family-name:var(--font-mono)]">
                Actualisation toutes les 8s
              </span>
            </div>
          </div>
        )}

        {/* ── Tab: Alertes ── */}
        {activeTab === 'alerts' && (
          <div className="space-y-2">
            {!live?.alerts.latest.length ? (
              <div className="text-center py-16">
                <p className="text-emerald-400 text-sm">✓ Aucune alerte active</p>
              </div>
            ) : (
              <>
                {/* Résumé par sévérité */}
                <div className="flex gap-3 mb-4">
                  {[
                    { label: 'Critiques', count: live.alerts.critical, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20'    },
                    { label: 'Warnings',  count: live.alerts.warning,  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                    { label: 'Info',      count: live.alerts.info,     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20'   },
                  ].map((s) => (
                    <div key={s.label} className={`flex-1 ${s.bg} border rounded-lg p-3 text-center`}>
                      <p className={`text-2xl font-bold ${s.color} font-[family-name:var(--font-syne)]`}>
                        {s.count}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>

                {live.alerts.latest.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}

                <p className="text-xs text-slate-600 text-center pt-2 font-[family-name:var(--font-mono)]">
                  5 alertes les plus récentes · Voir toutes → /alerts
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Tab: Rentabilité ── */}
        {activeTab === 'rentabilite' && (
          <div>
            {!rentabilite ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {rentabilite.lines.map((line) => (
                    <RentabiliteRow key={line.route_code} line={line} />
                  ))}
                </div>

                {/* Total */}
                <div className="bg-[#080D1A] border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">
                      Total aujourd'hui
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {rentabilite.lines.reduce((a, l) => a + l.departures_count, 0)} départs · {rentabilite.lines.length} lignes
                    </p>
                  </div>
                  <p className={`text-2xl font-bold font-[family-name:var(--font-syne)] ${
                    rentabilite.totals.net_profit_fcfa > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatFCFA(rentabilite.totals.net_profit_fcfa)}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
