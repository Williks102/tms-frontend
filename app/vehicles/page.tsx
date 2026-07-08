'use client';

import { useState, useMemo } from 'react';
import { useVehicles, useVehicleDetail, Vehicle } from '@/hooks/useVehicles';
import { FormCreateVehicle, FormEditVehicle } from '@/components/vehicles/VehicleForms';
import { usePermissions } from '@/lib/permissions';

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatKm(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' km';
}

const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  available:   { label: 'Disponible',    dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  on_trip:     { label: 'En route',      dot: 'bg-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  boarding:    { label: 'Embarquement',  dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  maintenance: { label: 'Maintenance',   dot: 'bg-orange-400',  text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  inactive:    { label: 'Inactif',       dot: 'bg-slate-500',   text: 'text-slate-500',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
};

const SEVERITY_CFG: Record<string, string> = {
  low: 'text-slate-400 bg-slate-800/40 border-slate-700',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
};

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function VehicleCard({ vehicle, selected, onClick }: { vehicle: Vehicle; selected: boolean; onClick: () => void }) {
  const cfg = STATUS_CFG[vehicle.status] || STATUS_CFG.available;
  return (
    <button onClick={onClick} className={`w-full text-left p-4 rounded-xl border transition-all
      ${selected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#080D1A] border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/20'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)] font-[family-name:var(--font-mono)]">{vehicle.plate_number}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{vehicle.model}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-600 font-[family-name:var(--font-mono)]">
        <span>{vehicle.capacity} places</span>
        <span>·</span>
        <span>{formatKm(vehicle.current_mileage_km)}</span>
      </div>
    </button>
  );
}

function VehiclePanel({ vehicleId, canWrite, onEdit }: { vehicleId: number; canWrite: boolean; onEdit: (v: Vehicle) => void }) {
  const { data, isLoading } = useVehicleDetail(vehicleId);
  const [tab, setTab] = useState<'overview' | 'maintenance' | 'incidents' | 'fuel'>('overview');

  if (isLoading) return <div className="p-6 space-y-4"><Sk className="h-32" /><Sk className="h-48" /></div>;
  if (!data) return null;

  const { vehicle, needs_maintenance, km_before_maintenance } = data;
  const cfg = STATUS_CFG[vehicle.status] || STATUS_CFG.available;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-slate-800/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-1 font-[family-name:var(--font-mono)]">{vehicle.plate_number}</h2>
            <p className="text-sm text-slate-400 mb-2">{vehicle.model}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
              </span>
              <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold">{vehicle.capacity} places</span>
              {needs_maintenance && (
                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">⚠ Maintenance proche</span>
              )}
            </div>
          </div>
          {canWrite && (
            <button onClick={() => onEdit(vehicle)} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 flex-shrink-0">
              Modifier
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-slate-800/40">
        {[
          { id: 'overview', label: 'Aperçu' },
          { id: 'maintenance', label: 'Maintenance' },
          { id: 'incidents', label: 'Incidents' },
          { id: 'fuel', label: 'Carburant' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
              ${tab === t.id ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
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
                  { label: 'Consommation théorique', value: `${vehicle.fuel_consumption_per_100km} L/100km` },
                  { label: 'Kilométrage actuel',      value: formatKm(vehicle.current_mileage_km) },
                  { label: 'Dernière maintenance',    value: formatKm(vehicle.last_maintenance_km) },
                  { label: 'Intervalle maintenance',  value: formatKm(vehicle.maintenance_interval_km) },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-slate-600 mb-0.5">{item.label}</p>
                    <p className="text-slate-300 font-[family-name:var(--font-mono)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-xl p-4 border ${needs_maintenance ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-900/40 border-slate-800/60'}`}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Prochaine maintenance</p>
              <p className={`text-lg font-bold font-[family-name:var(--font-syne)] ${needs_maintenance ? 'text-red-400' : 'text-slate-300'}`}>
                {formatKm(km_before_maintenance)} restants
              </p>
            </div>
            {vehicle.notes && (
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Notes</p>
                <p className="text-xs text-slate-300">{vehicle.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'maintenance' && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Plans actifs</p>
              {!vehicle.maintenance_plans?.length ? (
                <p className="text-slate-600 text-xs py-4">Aucun plan de maintenance</p>
              ) : (
                <div className="space-y-2">
                  {vehicle.maintenance_plans.map(plan => (
                    <div key={plan.id} className="bg-[#0A1020] border border-slate-800/60 rounded-lg p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-slate-300 font-semibold">{plan.type}</p>
                        <p className="text-slate-600 text-[10px] mt-0.5">
                          {plan.trigger_km ? `Déclenché à ${formatKm(plan.trigger_km)}` : plan.trigger_date ? `Prévu le ${formatDate(plan.trigger_date)}` : '—'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        plan.status === 'overdue' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                        plan.status === 'due' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                        'text-slate-400 bg-slate-800/40 border-slate-700'
                      }`}>{plan.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Historique des interventions</p>
              {!vehicle.maintenance_records?.length ? (
                <p className="text-slate-600 text-xs py-4">Aucune intervention enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {vehicle.maintenance_records.map(rec => (
                    <div key={rec.id} className="bg-[#0A1020] border border-slate-800/60 rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-300 font-semibold">{rec.type} · {rec.garage_name}</p>
                        <p className="text-emerald-400 font-[family-name:var(--font-mono)]">{formatFCFA(rec.cost_fcfa)}</p>
                      </div>
                      <p className="text-slate-600 text-[10px] mt-0.5">{formatDate(rec.performed_at)} · {formatKm(rec.mileage_at_service)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'incidents' && (
          <div className="space-y-2">
            {!vehicle.incidents?.length ? (
              <p className="text-slate-600 text-xs py-4">Aucun incident enregistré</p>
            ) : vehicle.incidents.map(inc => (
              <div key={inc.id} className="bg-[#0A1020] border border-slate-800/60 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-slate-300 font-semibold">{inc.title}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${SEVERITY_CFG[inc.severity]}`}>{inc.severity}</span>
                </div>
                <p className="text-slate-600 text-[10px] font-[family-name:var(--font-mono)]">{inc.reference} · {formatDate(inc.occurred_at)} · {inc.status}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'fuel' && (
          <div className="space-y-2">
            {!vehicle.fuel_consumption_logs?.length ? (
              <p className="text-slate-600 text-xs py-4">Aucune consommation enregistrée</p>
            ) : vehicle.fuel_consumption_logs.map(log => (
              <div key={log.id} className="bg-[#0A1020] border border-slate-800/60 rounded-lg p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-300 font-semibold">{log.liters_consumed} L · {log.distance_km} km</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">{formatDate(log.recorded_at)}</p>
                </div>
                <p className="text-slate-400 font-[family-name:var(--font-mono)]">{log.consumption_per_100km} L/100km</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const { can } = usePermissions();
  const canWrite = can('vehiclesWrite');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [mobileShowList, setMobileShowList] = useState(true);

  const handleSelectVehicle = (id: number) => {
    setSelectedId(id);
    setMobileShowList(false);
  };

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (searchQuery) params.search = searchQuery;

  const { data, isLoading, mutate } = useVehicles(params);
  const vehicles = data?.data ?? [];

  const stats = useMemo(() => ({
    available:   vehicles.filter(v => v.status === 'available').length,
    on_trip:     vehicles.filter(v => v.status === 'on_trip').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    inactive:    vehicles.filter(v => v.status === 'inactive').length,
  }), [vehicles]);

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Véhicules</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Parc de véhicules — maintenance, incidents, carburant</p>
        </div>
        <div className="ml-auto hidden lg:flex items-center gap-1">
          {[
            { label: 'Disponibles', value: stats.available,   color: 'text-emerald-400' },
            { label: 'En route',    value: stats.on_trip,     color: 'text-blue-400'    },
            { label: 'Maintenance', value: stats.maintenance, color: 'text-orange-400'  },
            { label: 'Inactifs',    value: stats.inactive,    color: 'text-slate-500'   },
          ].map(s => (
            <div key={s.label} className="text-center px-4 border-l border-slate-800 first:border-0">
              <p className={`text-xl font-bold font-[family-name:var(--font-syne)] ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      {canWrite && (
        <div className="border-b border-slate-800/60 bg-[#080D1A] p-4">
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
            + Nouveau véhicule
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-3.5rem)]">
        <div className={`${mobileShowList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 flex-shrink-0 border-r border-slate-800/60 bg-[#080D1A]`}>
          <div className="p-4 border-b border-slate-800/60 space-y-2">
            <input type="text" placeholder="Rechercher plaque ou modèle..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 placeholder-slate-600 font-[family-name:var(--font-syne)] focus:outline-none focus:border-blue-500/50" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-[family-name:var(--font-syne)] focus:outline-none focus:border-blue-500/50">
              <option value="">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="on_trip">En route</option>
              <option value="boarding">Embarquement</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-20" />)
              : vehicles.length === 0
                ? <p className="text-center text-slate-600 text-xs py-10">Aucun véhicule trouvé</p>
                : vehicles.map(v => (
                  <VehicleCard key={v.id} vehicle={v} selected={selectedId === v.id} onClick={() => handleSelectVehicle(v.id)} />
                ))
            }
          </div>
          <div className="p-3 border-t border-slate-800/60">
            <p className="text-[11px] text-slate-600 text-center font-[family-name:var(--font-mono)]">
              {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className={`${mobileShowList ? 'hidden' : 'block'} lg:block flex-1 overflow-hidden`}>
          <button
            onClick={() => setMobileShowList(true)}
            className="lg:hidden w-full flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 bg-[#080D1A] text-xs text-slate-400 hover:text-white"
          >
            ← Retour à la liste
          </button>
          {selectedId ? (
            <VehiclePanel vehicleId={selectedId} canWrite={canWrite} onEdit={setEditingVehicle} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-4xl mb-3">🚌</p>
                <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">Sélectionner un véhicule</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Nouveau véhicule</h3>
                <p className="text-xs text-slate-500">Ajoutez un bus au parc</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormCreateVehicle onSuccess={() => { setShowCreate(false); mutate(); }} />
          </div>
        </div>
      )}

      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#080D1A] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Modifier le véhicule</h3>
                <p className="text-xs text-slate-500">{editingVehicle.plate_number}</p>
              </div>
              <button onClick={() => setEditingVehicle(null)} className="text-sm text-slate-400">✕</button>
            </div>
            <FormEditVehicle vehicle={editingVehicle} onSuccess={() => { setEditingVehicle(null); mutate(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
