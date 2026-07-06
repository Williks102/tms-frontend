'use client';

import { useState, useEffect } from 'react';
import { useMyTodaySchedule, markMyDepartureStatus, MyDeparture } from '@/hooks/useDriverSelf';
import { useMyLeaves, LeaveRequest } from '@/hooks/useHr';
import { FormRequestMyLeave } from '@/components/hr/HrForms';
import { FormReportMyIncident } from '@/components/driver/DriverForms';
import { getUser } from '@/lib/auth';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  conge_paye: 'Congé payé', maladie: 'Maladie', sans_solde: 'Sans solde', autre: 'Autre',
};

const LEAVE_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  approved:  { label: 'Approuvé',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  rejected:  { label: 'Refusé',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  cancelled: { label: 'Annulé',     color: 'text-slate-500',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programmé', boarding: 'Embarquement', departed: 'En route', arrived: 'Arrivé', cancelled: 'Annulé',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function DepartureRow({ dep, onChanged }: { dep: MyDeparture; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);

  const action = dep.status === 'boarding' ? 'departed' : dep.status === 'departed' ? 'arrived' : null;

  const handleMark = async () => {
    if (!action) return;
    setLoading(true);
    try {
      await markMyDepartureStatus(dep.id, action);
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">
            {dep.route ? `${dep.route.origin_city} → ${dep.route.destination_city}` : `Départ #${dep.id}`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 font-[family-name:var(--font-mono)]">
            {formatTime(dep.departure_datetime)} · {dep.vehicle?.plate_number ?? 'véhicule non assigné'}
            {dep.boarding_gate && ` · ${dep.boarding_gate}`}
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
          {STATUS_LABEL[dep.status] ?? dep.status}
        </span>
      </div>
      {action && (
        <button onClick={handleMark} disabled={loading}
          className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {loading ? 'Envoi...' : action === 'departed' ? 'Marquer le départ' : 'Marquer l\'arrivée'}
        </button>
      )}
    </div>
  );
}

export default function DriverPage() {
  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => { setUserName(getUser()?.name ?? null); }, []);
  const { data, isLoading, mutate } = useMyTodaySchedule();
  const { data: leavesData, mutate: mutateLeaves } = useMyLeaves();
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  const departures = data?.data ?? [];
  const leaves = leavesData?.data ?? [];

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-6">
        <div>
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Mon espace</h1>
          <p className="text-xs text-slate-600">{userName ?? 'Chauffeur'} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Planning du jour */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">Mon planning du jour</p>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Sk key={i} className="h-24" />)}</div>
          ) : !departures.length ? (
            <p className="text-slate-600 text-sm">Aucun départ prévu aujourd'hui</p>
          ) : (
            <div className="space-y-2">
              {departures.map(d => <DepartureRow key={d.id} dep={d} onChanged={() => mutate()} />)}
            </div>
          )}
        </div>

        {/* Signaler un incident */}
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">Signaler un incident</p>
            <button onClick={() => setShowIncidentForm(!showIncidentForm)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${showIncidentForm ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {showIncidentForm ? 'Annuler' : '+ Signaler'}
            </button>
          </div>
          {showIncidentForm && (
            <FormReportMyIncident todayDepartures={departures} onSuccess={() => setShowIncidentForm(false)} />
          )}
        </div>

        {/* Mes congés */}
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">Mes congés</p>
            <button onClick={() => setShowLeaveForm(!showLeaveForm)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${showLeaveForm ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {showLeaveForm ? 'Annuler' : 'Demander un congé'}
            </button>
          </div>
          {showLeaveForm && (
            <div className="mb-3 pb-3 border-b border-slate-800/60">
              <FormRequestMyLeave onSuccess={() => { setShowLeaveForm(false); mutateLeaves(); }} />
            </div>
          )}
          {!leaves.length ? (
            <p className="text-slate-600 text-xs">Aucune demande de congé</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {leaves.slice(0, 5).map((l: LeaveRequest) => {
                const cfg = LEAVE_STATUS_CFG[l.status];
                return (
                  <span key={l.id} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    {LEAVE_TYPE_LABEL[l.type]} · {formatShortDate(l.start_date)}–{formatShortDate(l.end_date)} · {cfg.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
