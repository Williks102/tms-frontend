'use client';

import { useState, useMemo } from 'react';
import {
  useDrivers, useDriverDetail, useMonthlyRanking,
  Driver, TripStat, MonthlyScore,
} from '@/hooks/useDrivers';
import { FormChangeDriverStatus, FormCreateDriver, FormUploadDriverDocument } from '@/components/drivers/DriverForms';
import { usePermissions } from '@/lib/permissions';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function fullName(d: Driver): string { return `${d.first_name} ${d.last_name}`; }
function initials(d: Driver): string { return `${d.first_name[0]}${d.last_name[0]}`.toUpperCase(); }

const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  available: { label: 'Disponible', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  on_duty:   { label: 'En service', dot: 'bg-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  resting:   { label: 'Repos',      dot: 'bg-purple-400',  text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20'  },
  on_leave:  { label: 'Congé',      dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  suspended: { label: 'Suspendu',   dot: 'bg-red-500',     text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
};

function scoreColor(s: number | null) {
  if (s === null) return 'text-slate-500';
  if (s >= 90) return 'text-emerald-400';
  if (s >= 75) return 'text-sky-400';
  if (s >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(s: number | null) {
  if (s === null) return 'bg-slate-800';
  if (s >= 90) return 'bg-emerald-500';
  if (s >= 75) return 'bg-sky-500';
  if (s >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreLabel(s: number | null) {
  if (s === null) return 'N/A';
  if (s >= 90) return 'Excellent';
  if (s >= 75) return 'Bon';
  if (s >= 50) return 'Moyen';
  return 'Faible';
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function EcoGauge({ score }: { score: number | null }) {
  const pct = score ?? 0;
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
            className={`transition-all duration-700 ${pct >= 90 ? 'stroke-emerald-400' : pct >= 75 ? 'stroke-sky-400' : pct >= 50 ? 'stroke-amber-400' : 'stroke-red-400'}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold font-[family-name:var(--font-syne)] ${scoreColor(score)}`}>{score ?? '—'}</span>
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <p className={`text-xs font-semibold mt-1 font-[family-name:var(--font-syne)] ${scoreColor(score)}`}>{scoreLabel(score)}</p>
    </div>
  );
}

function DriverCard({ driver, selected, onClick }: { driver: Driver; selected: boolean; onClick: () => void }) {
  const cfg     = STATUS_CFG[driver.status] || STATUS_CFG.available;
  const licDays = daysUntil(driver.license_expires_at);
  const medDays = daysUntil(driver.medical_expires_at);
  const docAlert = licDays <= 30 || medDays <= 30;
  return (
    <button onClick={onClick} className={`w-full text-left p-4 rounded-xl border transition-all
      ${selected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#080D1A] border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/20'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm font-[family-name:var(--font-syne)]
          ${selected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
          {initials(driver)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)] truncate mb-1">{fullName(driver)}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </span>
            <span className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">{driver.license_category}</span>
            {docAlert && <span className="text-[10px] text-amber-500">⚠ Doc expire</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function DriverPanel({ driverId }: { driverId: number }) {
  const { data, isLoading } = useDriverDetail(driverId);
  const [tab, setTab] = useState<'overview' | 'trips' | 'scores'>('overview');

  if (isLoading) return <div className="p-6 space-y-4"><Sk className="h-32" /><Sk className="h-48" /></div>;
  if (!data) return null;

  const { driver, recent_score } = data;
  const cfg     = STATUS_CFG[driver.status] || STATUS_CFG.available;
  const licDays = daysUntil(driver.license_expires_at);
  const medDays = daysUntil(driver.medical_expires_at);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-slate-800/60">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-indigo-300 font-[family-name:var(--font-syne)]">{initials(driver)}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">{fullName(driver)}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
              </span>
              <span className="text-xs text-slate-500 font-[family-name:var(--font-mono)]">{driver.employee_number}</span>
              <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold">Permis {driver.license_category}</span>
            </div>
          </div>
          <EcoGauge score={recent_score} />
        </div>
      </div>

      <div className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-slate-800/40">
        {[{ id: 'overview', label: 'Profil' }, { id: 'trips', label: 'Voyages' }, { id: 'scores', label: 'Scores' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
              ${tab === t.id ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">Informations</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[
                  { label: 'Téléphone',   value: driver.phone },
                  { label: 'N° permis',   value: driver.license_number },
                  { label: 'Embauché le', value: formatDate(driver.hired_at) },
                  { label: 'Catégorie',   value: `Permis ${driver.license_category}` },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-slate-600 mb-0.5">{item.label}</p>
                    <p className="text-slate-300 font-[family-name:var(--font-mono)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">Documents obligatoires</p>
              <div className="space-y-3">
                {[
                  { label: 'Permis de conduire', expires: driver.license_expires_at, days: licDays },
                  { label: 'Visite médicale',    expires: driver.medical_expires_at,  days: medDays },
                ].map(doc => {
                  const expired = doc.days <= 0;
                  const urgent  = doc.days > 0 && doc.days <= 30;
                  return (
                    <div key={doc.label} className={`flex items-center justify-between p-3 rounded-lg border
                      ${expired ? 'bg-red-500/10 border-red-500/20' : urgent ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-900/40 border-slate-800/60'}`}>
                      <div>
                        <p className="text-xs font-semibold text-slate-300 font-[family-name:var(--font-syne)]">{doc.label}</p>
                        <p className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)] mt-0.5">Expire le {formatDate(doc.expires)}</p>
                      </div>
                      <span className={`text-xs font-bold font-[family-name:var(--font-syne)] ${expired ? 'text-red-400' : urgent ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {expired ? 'EXPIRÉ' : urgent ? `J−${doc.days}` : `✓ ${doc.days}j`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'trips' && (
          <div className="space-y-3">
            {!driver.trip_stats?.length ? (
              <div className="text-center py-12"><p className="text-slate-600 text-sm">Aucun voyage enregistré</p></div>
            ) : (
              driver.trip_stats.map((stat: TripStat) => {
                const ratio   = stat.fuel_theoretical_liters > 0 ? stat.fuel_consumed_liters / stat.fuel_theoretical_liters : 1;
                const overPct = Math.round((ratio - 1) * 100);
                return (
                  <div key={stat.id} className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold text-white font-[family-name:var(--font-syne)]">Départ #{stat.departure_id}</p>
                        <p className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)]">
                          {new Date(stat.recorded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      {stat.eco_score !== null && (
                        <div className="text-center">
                          <p className={`text-xl font-bold font-[family-name:var(--font-syne)] ${scoreColor(stat.eco_score)}`}>{stat.eco_score}</p>
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider">éco-score</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-900/40 rounded-lg p-2 text-center">
                        <p className="text-slate-300 font-bold font-[family-name:var(--font-mono)]">{stat.distance_km} km</p>
                        <p className="text-slate-600 mt-0.5">Distance</p>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${overPct > 15 ? 'bg-red-500/10' : 'bg-slate-900/40'}`}>
                        <p className={`font-bold font-[family-name:var(--font-mono)] ${overPct > 15 ? 'text-red-400' : 'text-slate-300'}`}>
                          {stat.fuel_consumed_liters}L{overPct > 0 && <span className="text-[9px] ml-1">+{overPct}%</span>}
                        </p>
                        <p className="text-slate-600 mt-0.5">Carburant</p>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${stat.overspeed_events > 0 ? 'bg-amber-500/10' : 'bg-slate-900/40'}`}>
                        <p className={`font-bold font-[family-name:var(--font-mono)] ${stat.overspeed_events > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {stat.overspeed_events}
                        </p>
                        <p className="text-slate-600 mt-0.5">Excès vitesse</p>
                      </div>
                    </div>
                    {stat.eco_score !== null && (
                      <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${scoreBg(stat.eco_score)}`} style={{ width: `${stat.eco_score}%` }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'scores' && (
          <div className="space-y-3">
            {!driver.monthly_scores?.length ? (
              <div className="text-center py-12"><p className="text-slate-600 text-sm">Aucun score mensuel disponible</p></div>
            ) : (
              driver.monthly_scores.map((score: MonthlyScore) => (
                <div key={score.id} className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">
                        {new Date(score.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] text-slate-500">{score.trips_count} voyage{score.trips_count > 1 ? 's' : ''} · {Math.round(score.total_distance_km).toLocaleString('fr-FR')} km</p>
                    </div>
                    <div className="text-right">
                      {score.rank && (
                        <p className={`text-xl font-bold font-[family-name:var(--font-syne)] ${score.rank === 1 ? 'text-yellow-400' : score.rank === 2 ? 'text-slate-300' : score.rank === 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {score.rank === 1 ? '🥇' : score.rank === 2 ? '🥈' : score.rank === 3 ? '🥉' : `#${score.rank}`}
                        </p>
                      )}
                      <p className={`text-lg font-bold font-[family-name:var(--font-syne)] ${scoreColor(score.avg_eco_score)}`}>{score.avg_eco_score ?? '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-slate-600">Économies</p>
                      <p className={`font-[family-name:var(--font-mono)] font-bold mt-0.5 ${score.fuel_savings_liters > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {score.fuel_savings_liters > 0 ? '+' : ''}{score.fuel_savings_liters.toFixed(1)}L
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Excès vitesse</p>
                      <p className={`font-[family-name:var(--font-mono)] font-bold mt-0.5 ${score.total_overspeed_events > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{score.total_overspeed_events}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Retard moy.</p>
                      <p className={`font-[family-name:var(--font-mono)] font-bold mt-0.5 ${score.avg_delay_min > 15 ? 'text-amber-400' : 'text-slate-300'}`}>{score.avg_delay_min.toFixed(0)}min</p>
                    </div>
                  </div>
                  {score.bonus_fcfa && (
                    <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                      <span className="text-emerald-400 text-sm">🎁</span>
                      <span className="text-xs text-emerald-400 font-semibold font-[family-name:var(--font-syne)]">
                        Prime: {new Intl.NumberFormat('fr-FR').format(score.bonus_fcfa)} FCFA
      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RankingPanel() {
  const { data, isLoading } = useMonthlyRanking();
  if (isLoading) return <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-16" />)}</div>;
  const scores = data?.data ?? [];
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest font-[family-name:var(--font-syne)]">Classement du mois</h3>
        {data?.month && (
          <span className="text-xs text-slate-500 font-[family-name:var(--font-mono)]">
            {new Date(data.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>
      {!scores.length ? (
        <p className="text-slate-600 text-sm text-center py-8">Aucun classement disponible ce mois</p>
      ) : (
        <div className="space-y-2">
          {scores.map((s, i) => {
            const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            return (
              <div key={s.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all
                ${i < 3 ? 'bg-slate-800/30 border-slate-700/50' : 'bg-[#080D1A] border-slate-800/40'}`}>
                <span className="text-base w-8 text-center flex-shrink-0">{rankIcon}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-400 font-[family-name:var(--font-syne)]">
                    {s.driver ? initials(s.driver) : '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white font-[family-name:var(--font-syne)] truncate">
                    {s.driver ? fullName(s.driver) : 'Inconnu'}
                  </p>
                  <p className="text-[10px] text-slate-500">{s.trips_count} voyages · {Math.round(s.total_distance_km).toLocaleString('fr-FR')} km</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold font-[family-name:var(--font-syne)] ${scoreColor(s.avg_eco_score)}`}>{s.avg_eco_score ?? '—'}</p>
                  <p className="text-[10px] text-slate-600">éco-score</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DriversPage() {
  const { can } = usePermissions();
  const canWrite     = can('driversWrite');
  const canDocuments = can('driversDocuments');
  const [selectedId, setSelectedId]     = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [rightPanel, setRightPanel]     = useState<'detail' | 'ranking'>('ranking');
  const [actionView, setActionView]     = useState<'create' | 'document' | 'status' | null>(null);
  const [mobileShowList, setMobileShowList] = useState(true);

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useDrivers(params);
  const drivers = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    const q = searchQuery.toLowerCase();
    return drivers.filter(d => fullName(d).toLowerCase().includes(q) || d.employee_number.toLowerCase().includes(q));
  }, [drivers, searchQuery]);

  const stats = useMemo(() => ({
    available: drivers.filter(d => d.status === 'available').length,
    on_duty:   drivers.filter(d => d.status === 'on_duty').length,
    resting:   drivers.filter(d => d.status === 'resting').length,
    on_leave:  drivers.filter(d => d.status === 'on_leave').length,
  }), [drivers]);

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Chauffeurs</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Gestion des chauffeurs et scores de conduite</p>
        </div>
        <div className="ml-auto hidden lg:flex items-center gap-1">
          {[
            { label: 'Disponibles', value: stats.available, color: 'text-emerald-400' },
            { label: 'En service',  value: stats.on_duty,   color: 'text-blue-400'    },
            { label: 'Repos',       value: stats.resting,   color: 'text-purple-400'  },
            { label: 'Congé',       value: stats.on_leave,  color: 'text-amber-400'   },
          ].map(s => (
            <div key={s.label} className="text-center px-4 border-l border-slate-800 first:border-0">
              <p className={`text-xl font-bold font-[family-name:var(--font-syne)] ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="border-b border-slate-800/60 bg-[#080D1A] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {(['create','document','status'] as const)
            .filter(action => action === 'document' ? canDocuments : canWrite)
            .map((action) => (
            <button key={action} onClick={() => setActionView(action as any)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${actionView === action ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {action === 'create' ? 'Créer chauffeur' : action === 'document' ? 'Ajouter document' : 'Changer statut'}
            </button>
          ))}
        </div>
        {actionView === 'create' && <FormCreateDriver onSuccess={() => setActionView(null)} />}
        {actionView === 'document' && selectedId && <FormUploadDriverDocument driverId={selectedId} onSuccess={() => setActionView(null)} />}
        {actionView === 'status' && selectedId && <FormChangeDriverStatus driverId={selectedId} onSuccess={() => setActionView(null)} />}
      </div>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-3.5rem)]">
        {/* Liste */}
        <div className={`${mobileShowList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 flex-shrink-0 border-r border-slate-800/60 bg-[#080D1A]`}>
          <div className="p-4 border-b border-slate-800/60 space-y-2">
            <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 placeholder-slate-600 font-[family-name:var(--font-syne)] focus:outline-none focus:border-indigo-500/50" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-[family-name:var(--font-syne)] focus:outline-none focus:border-indigo-500/50">
              <option value="">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="on_duty">En service</option>
              <option value="resting">En repos</option>
              <option value="on_leave">En congé</option>
              <option value="suspended">Suspendu</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-20" />)
              : filtered.map(d => (
                <DriverCard key={d.id} driver={d} selected={selectedId === d.id}
                  onClick={() => { setSelectedId(d.id); setRightPanel('detail'); setMobileShowList(false); }} />
              ))
            }
          </div>
          <div className="p-3 border-t border-slate-800/60">
            <p className="text-[11px] text-slate-600 text-center font-[family-name:var(--font-mono)]">
              {filtered.length} / {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Panneau droit */}
        <div className={`${mobileShowList ? 'hidden' : 'flex'} lg:flex flex-1 flex-col overflow-hidden`}>
          <button
            onClick={() => setMobileShowList(true)}
            className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 bg-[#080D1A] text-xs text-slate-400 hover:text-white flex-shrink-0"
          >
            ← Retour à la liste
          </button>
          <div className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-slate-800/60 bg-[#060A14]">
            <button onClick={() => setRightPanel('ranking')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
                ${rightPanel === 'ranking' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              🏆 Classement
            </button>
            {selectedId && (
              <button onClick={() => setRightPanel('detail')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
                  ${rightPanel === 'detail' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                👤 Profil
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanel === 'ranking' && <RankingPanel />}
            {rightPanel === 'detail' && selectedId && <DriverPanel driverId={selectedId} />}
            {rightPanel === 'detail' && !selectedId && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">Sélectionner un chauffeur</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
