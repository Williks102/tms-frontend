'use client';

import { useState, useMemo } from 'react';
import {
  useHrDashboard, useEmployees, useEmployeeDetail,
  useLeaveRequests, useDisciplinaryRecords,
  Employee, LeaveRequest, DisciplinaryRecord, EmployableType,
} from '@/hooks/useHr';
import { FormRequestLeave, FormDecideLeave, FormCreateDisciplinaryRecord } from '@/components/hr/HrForms';
import { usePermissions } from '@/lib/permissions';

type Tab = 'dashboard' | 'employees' | 'leaves' | 'disciplinary';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  conge_paye: 'Congé payé', maladie: 'Maladie', sans_solde: 'Sans solde', autre: 'Autre',
};

const LEAVE_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  approved:  { label: 'Approuvé',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  rejected:  { label: 'Refusé',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  cancelled: { label: 'Annulé',     color: 'text-slate-500',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

const DISCIPLINARY_TYPE_LABEL: Record<string, string> = {
  avertissement_verbal: 'Avertissement verbal',
  avertissement_ecrit:  'Avertissement écrit',
  mise_a_pied:          'Mise à pied',
  autre:                'Autre',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function employableName(e: { name?: string; first_name?: string; last_name?: string } | undefined): string {
  if (!e) return 'Inconnu';
  return e.name ?? `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim();
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">{title}</p>
      {children}
    </div>
  );
}

function LeaveRow({ leave, canManage, onDecided }: { leave: LeaveRequest; canManage: boolean; onDecided: () => void }) {
  const [showDecide, setShowDecide] = useState(false);
  const cfg = LEAVE_STATUS_CFG[leave.status];
  return (
    <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{employableName(leave.employable)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {LEAVE_TYPE_LABEL[leave.type]} · {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
          </p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>
      {leave.reason && <p className="text-[11px] text-slate-600 mt-2">{leave.reason}</p>}
      {leave.decision_notes && <p className="text-[11px] text-red-400/80 mt-2">Motif refus: {leave.decision_notes}</p>}
      {canManage && leave.status === 'pending' && (
        <div className="mt-2">
          {!showDecide ? (
            <button onClick={() => setShowDecide(true)} className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300">
              Traiter la demande →
            </button>
          ) : (
            <div className="mt-2 pt-2 border-t border-slate-800/60">
              <FormDecideLeave leaveId={leave.id} onSuccess={() => { setShowDecide(false); onDecided(); }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardTab({ canManage }: { canManage: boolean }) {
  const { data, isLoading, mutate } = useHrDashboard();
  if (isLoading) return <div className="p-6 grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-40" />)}</div>;
  if (!data) return null;

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel title="Personnel">
          <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">{data.headcount.staff + data.headcount.drivers}</p>
          <p className="text-[11px] text-slate-500 mt-1">{data.headcount.staff} staff · {data.headcount.drivers} chauffeurs</p>
        </Panel>
        <Panel title="Congés en attente">
          <p className="text-2xl font-bold text-amber-400 font-[family-name:var(--font-syne)]">{data.leaves_pending.length}</p>
        </Panel>
        <Panel title="En congé aujourd'hui">
          <p className="text-2xl font-bold text-purple-400 font-[family-name:var(--font-syne)]">{data.leaves_active_today.length}</p>
        </Panel>
        <Panel title="Contrats < 30 jours">
          <p className="text-2xl font-bold text-red-400 font-[family-name:var(--font-syne)]">{data.contracts_expiring.length}</p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Congés en attente">
          {!data.leaves_pending.length ? (
            <p className="text-slate-600 text-xs text-center py-6">Aucune demande en attente</p>
          ) : (
            <div className="space-y-2">
              {data.leaves_pending.map(l => <LeaveRow key={l.id} leave={l} canManage={canManage} onDecided={() => mutate()} />)}
            </div>
          )}
        </Panel>

        <Panel title="Contrats arrivant à échéance">
          {!data.contracts_expiring.length ? (
            <p className="text-slate-600 text-xs text-center py-6">Aucun contrat concerné</p>
          ) : (
            <div className="space-y-2">
              {data.contracts_expiring.map(c => (
                <div key={`${c.type}-${c.id}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                  <p className="text-xs text-slate-300">{c.name}</p>
                  <p className="text-[11px] font-semibold text-red-400">{formatDate(c.contract_end_date)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Documents chauffeurs expirant">
          {!data.documents_expiring.length ? (
            <p className="text-slate-600 text-xs text-center py-6">Aucun document concerné</p>
          ) : (
            <div className="space-y-2">
              {data.documents_expiring.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                  <p className="text-xs text-slate-300">{d.driver.first_name} {d.driver.last_name} — {d.type}</p>
                  <p className="text-[11px] font-semibold text-amber-400">{formatDate(d.expires_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Disciplinaire récent">
          {!data.recent_disciplinary.length ? (
            <p className="text-slate-600 text-xs text-center py-6">Aucun enregistrement</p>
          ) : (
            <div className="space-y-2">
              {data.recent_disciplinary.map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                  <p className="text-xs font-semibold text-slate-300">{employableName(r.employable)} — {DISCIPLINARY_TYPE_LABEL[r.type]}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{r.description}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{formatDate(r.issued_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function EmployeeDetailPanel({ type, id, canManage, onClose }: { type: EmployableType; id: number; canManage: boolean; onClose: () => void }) {
  const { data, isLoading, mutate } = useEmployeeDetail(type, id);
  const [action, setAction] = useState<'leave' | 'disciplinary' | null>(null);

  if (isLoading) return <div className="p-6 space-y-3"><Sk className="h-24" /><Sk className="h-48" /></div>;
  if (!data) return null;
  const emp = data.employee;
  const name = type === 'driver' ? `${emp.first_name} ${emp.last_name}` : emp.name;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">{name}</h3>
          <p className="text-xs text-slate-500 mt-1">{type === 'driver' ? 'Chauffeur' : emp.role}</p>
        </div>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">Fermer ✕</button>
      </div>

      {canManage && (
        <div className="flex gap-2">
          <button onClick={() => setAction(action === 'leave' ? null : 'leave')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'leave' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            Demander un congé
          </button>
          <button onClick={() => setAction(action === 'disciplinary' ? null : 'disciplinary')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'disciplinary' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            Enregistrement disciplinaire
          </button>
        </div>
      )}
      {action === 'leave' && (
        <Panel title="Nouvelle demande de congé">
          <FormRequestLeave employableType={type} employableId={id} onSuccess={() => { setAction(null); mutate(); }} />
        </Panel>
      )}
      {action === 'disciplinary' && (
        <Panel title="Nouvel enregistrement disciplinaire">
          <FormCreateDisciplinaryRecord employableType={type} employableId={id} onSuccess={() => { setAction(null); mutate(); }} />
        </Panel>
      )}

      <Panel title="Historique des congés">
        {!emp.leave_requests?.length ? (
          <p className="text-slate-600 text-xs text-center py-4">Aucun congé</p>
        ) : (
          <div className="space-y-2">
            {emp.leave_requests.map((l: LeaveRequest) => {
              const cfg = LEAVE_STATUS_CFG[l.status];
              return (
                <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                  <p className="text-[11px] text-slate-400">{LEAVE_TYPE_LABEL[l.type]} · {formatDate(l.start_date)} → {formatDate(l.end_date)}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Historique disciplinaire">
        {!emp.disciplinary_records?.length ? (
          <p className="text-slate-600 text-xs text-center py-4">Aucun enregistrement</p>
        ) : (
          <div className="space-y-2">
            {emp.disciplinary_records.map((r: DisciplinaryRecord) => (
              <div key={r.id} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                <p className="text-[11px] font-semibold text-slate-300">{DISCIPLINARY_TYPE_LABEL[r.type]}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{r.description}</p>
                <p className="text-[10px] text-slate-600 mt-1">{formatDate(r.issued_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function EmployeesTab({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<{ type: EmployableType; id: number } | null>(null);
  const [mobileShowList, setMobileShowList] = useState(true);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (typeFilter) params.type = typeFilter;

  const { data, isLoading } = useEmployees(params);
  const employees = data?.data ?? [];

  return (
    <div className="flex flex-col lg:flex-row lg:h-full">
      <div className={`${mobileShowList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-96 flex-shrink-0 border-r border-slate-800/60`}>
        <div className="p-4 border-b border-slate-800/60 space-y-2">
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50">
            <option value="">Tous les types</option>
            <option value="user">Staff</option>
            <option value="driver">Chauffeurs</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-16" />)
            : employees.map((e: Employee) => (
              <button key={`${e.type}-${e.id}`} onClick={() => { setSelected({ type: e.type, id: e.id }); setMobileShowList(false); }}
                className={`w-full text-left p-3 rounded-xl border transition-all
                  ${selected?.type === e.type && selected?.id === e.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#080D1A] border-slate-800/60 hover:border-slate-700'}`}>
                <p className="text-xs font-bold text-white truncate">{e.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{e.role_or_position} · {e.contact}</p>
                {e.contract_type && <p className="text-[10px] text-slate-600 mt-1">{e.contract_type.toUpperCase()}{e.contract_end_date ? ` — fin ${formatDate(e.contract_end_date)}` : ''}</p>}
              </button>
            ))
          }
          {!isLoading && !employees.length && <p className="text-slate-600 text-xs text-center py-8">Aucun résultat</p>}
        </div>
      </div>
      <div className={`${mobileShowList ? 'hidden' : 'block'} lg:block flex-1 overflow-y-auto`}>
        <button
          onClick={() => setMobileShowList(true)}
          className="lg:hidden w-full flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 bg-[#080D1A] text-xs text-slate-400 hover:text-white"
        >
          ← Retour à la liste
        </button>
        {selected ? (
          <EmployeeDetailPanel type={selected.type} id={selected.id} canManage={canManage} onClose={() => { setSelected(null); setMobileShowList(true); }} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-sm">Sélectionner un employé</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LeavesTab({ canManage }: { canManage: boolean }) {
  const [statusFilter, setStatusFilter] = useState('');
  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  const { data, isLoading, mutate } = useLeaveRequests(params);
  const leaves = data?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Refusé</option>
        </select>
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-20" />)}</div>
      ) : !leaves.length ? (
        <p className="text-slate-600 text-sm text-center py-12">Aucune demande de congé</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {leaves.map(l => <LeaveRow key={l.id} leave={l} canManage={canManage} onDecided={() => mutate()} />)}
        </div>
      )}
    </div>
  );
}

function DisciplinaryTab() {
  const { data, isLoading } = useDisciplinaryRecords();
  const records = data?.data ?? [];

  return (
    <div className="p-6">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-20" />)}</div>
      ) : !records.length ? (
        <p className="text-slate-600 text-sm text-center py-12">Aucun enregistrement disciplinaire</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map(r => (
            <div key={r.id} className="p-4 rounded-xl bg-[#080D1A] border border-slate-800/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">{employableName(r.employable)}</p>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {DISCIPLINARY_TYPE_LABEL[r.type]}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{r.description}</p>
              <p className="text-[11px] text-slate-600 mt-2">Émis le {formatDate(r.issued_at)} par {r.issued_by?.name ?? '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HrPage() {
  const { can } = usePermissions();
  const canManage = can('hrManage');
  const [tab, setTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard',    label: 'Tableau de bord' },
    { id: 'employees',    label: 'Employés'        },
    { id: 'leaves',       label: 'Congés'           },
    { id: 'disciplinary', label: 'Disciplinaire'    },
  ];

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Ressources Humaines</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Personnel, congés et suivi disciplinaire</p>
        </div>
      </header>

      <div className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-slate-800/60 bg-[#060A14] overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)] whitespace-nowrap
              ${tab === t.id ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="lg:h-[calc(100vh-3.5rem-3rem)] overflow-y-auto">
        {tab === 'dashboard'    && <DashboardTab canManage={canManage} />}
        {tab === 'employees'    && <EmployeesTab canManage={canManage} />}
        {tab === 'leaves'       && <LeavesTab canManage={canManage} />}
        {tab === 'disciplinary' && <DisciplinaryTab />}
      </div>
    </div>
  );
}
