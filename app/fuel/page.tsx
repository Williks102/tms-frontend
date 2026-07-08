'use client';

import { useState, useMemo } from 'react';
import {
  useFuelVouchers, useMaintenancePlans, useMaintenanceDue,
  FuelVoucher, MaintenancePlan,
} from '@/hooks/useFuel';
import { FormApproveFuelVoucher, FormRecordFuelConsumption, FormRejectFuelVoucher, FormRequestFuelVoucher } from '@/components/fuel/FuelForms';
import { FormCreateMaintenancePlan, FormRecordMaintenance } from '@/components/fuel/MaintenanceForms';
import { PrintVoucherButton } from '@/components/comptabilite/PrintVoucherButton';
import { usePermissions } from '@/lib/permissions';

// ── Configs ────────────────────────────────────────────────────────────────
const VOUCHER_STATUS_CFG = {
  pending:  { label: 'En attente', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400'   },
  approved: { label: 'Approuvé',   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400'    },
  rejected: { label: 'Refusé',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400'     },
  consumed: { label: 'Consommé',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};

const MAINTENANCE_STATUS_CFG = {
  upcoming: { label: 'Prévu',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  due:      { label: 'Imminent', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  overdue:  { label: 'Dépassé',  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  completed:{ label: 'Effectué', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const MAINTENANCE_TYPE_CFG: Record<string, { icon: string; label: string }> = {
  oil_change:   { icon: '🛢️', label: 'Vidange'           },
  tire:         { icon: '⚫', label: 'Pneus'              },
  brake:        { icon: '🔴', label: 'Freins'             },
  full_service: { icon: '🔧', label: 'Révision complète'  },
  other:        { icon: '⚙️', label: 'Autre'              },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
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

// ── Badge statut bon ───────────────────────────────────────────────────────
function VoucherStatusBadge({ status }: { status: string }) {
  const cfg = VOUCHER_STATUS_CFG[status as keyof typeof VOUCHER_STATUS_CFG] || VOUCHER_STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'pending' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

// ── Ratio barre carburant ──────────────────────────────────────────────────
function FuelRatioBar({ requested, theoretical }: { requested: number; theoretical: number }) {
  const ratio    = theoretical > 0 ? requested / theoretical : 1;
  const pct      = Math.min(ratio * 100, 150);
  const isAnomaly = ratio > 1.15;
  const color    = ratio > 1.3 ? 'bg-red-500' : ratio > 1.15 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-slate-600">Théorique</span>
        <span className={`font-bold font-[family-name:var(--font-mono)] ${isAnomaly ? 'text-amber-400' : 'text-slate-400'}`}>
          {requested}L / {theoretical}L
          {isAnomaly && <span className="ml-1 text-amber-500">+{Math.round((ratio - 1) * 100)}%</span>}
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
        {/* Barre théorique référence */}
        <div
          className="absolute h-full bg-slate-700 rounded-full"
          style={{ width: '66.7%' }} // theoretical = 2/3 de 150% max
        />
        {/* Barre réelle */}
        <div
          className={`absolute h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Carte bon de carburant ─────────────────────────────────────────────────
function VoucherCard({ voucher, selected, onClick }: {
  voucher: FuelVoucher;
  selected: boolean;
  onClick: () => void;
}) {
  const ratio     = voucher.theoretical_liters > 0
    ? voucher.requested_liters / voucher.theoretical_liters : 1;
  const isAnomaly = ratio > 1.15;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all
        ${selected
          ? 'bg-orange-500/10 border-orange-500/30 shadow-lg'
          : `bg-[#080D1A] hover:bg-slate-800/30 hover:border-slate-700
             ${voucher.status === 'pending' ? 'border-amber-500/30' :
               isAnomaly && voucher.status !== 'rejected' ? 'border-red-500/20' : 'border-slate-800/60'}`
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">⛽</span>
          <div>
            <p className="text-xs font-bold text-white font-[family-name:var(--font-syne)] truncate max-w-[140px]">
              {voucher.departure?.route.name ?? `Départ #${voucher.departure_id}`}
            </p>
            <p className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)] mt-0.5">
              {formatDateTime(voucher.requested_at)}
            </p>
          </div>
        </div>
        <VoucherStatusBadge status={voucher.status} />
      </div>

      <div className="mb-3">
        <FuelRatioBar
          requested={voucher.requested_liters}
          theoretical={voucher.theoretical_liters}
        />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          {voucher.vehicle?.plate_number} · {voucher.driver?.first_name} {voucher.driver?.last_name}
        </span>
        {voucher.total_cost && (
          <span className="text-orange-400 font-bold font-[family-name:var(--font-mono)]">
            {formatFCFA(voucher.total_cost)}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Détail bon de carburant ────────────────────────────────────────────────
function VoucherDetail({ voucher }: { voucher: FuelVoucher }) {
  const ratio     = voucher.theoretical_liters > 0
    ? voucher.requested_liters / voucher.theoretical_liters : 1;
  const isAnomaly = ratio > 1.15;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-xl border ${isAnomaly && voucher.status !== 'rejected' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#080D1A] border-slate-800/60'}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-base font-bold text-white font-[family-name:var(--font-syne)]">
              {voucher.departure?.route.name ?? `Départ #${voucher.departure_id}`}
            </p>
            <p className="text-xs text-slate-500 font-[family-name:var(--font-mono)] mt-0.5">
              {voucher.departure?.route.code} · {voucher.departure?.route.distance_km} km
            </p>
          </div>
          <VoucherStatusBadge status={voucher.status} />
        </div>

        {(voucher.status === 'approved' || voucher.status === 'consumed') && (
          <div className="mb-3">
            <PrintVoucherButton
              title="Bon carburant"
              reference={`FC-${voucher.id}`}
              date={voucher.approved_at ?? voucher.requested_at}
              amount={voucher.total_cost ?? 0}
              motif={`${voucher.fuel_type.toUpperCase()} — ${voucher.approved_liters ?? voucher.requested_liters} L`}
              tiersLabel="Station"
              tiersValue={voucher.station_name}
              extraRows={[
                { label: 'Véhicule', value: voucher.vehicle?.plate_number ?? '—' },
                { label: 'Chauffeur', value: `${voucher.driver?.first_name ?? ''} ${voucher.driver?.last_name ?? ''}`.trim() },
              ]}
            />
          </div>
        )}

        {isAnomaly && voucher.status !== 'rejected' && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-3">
            <span className="text-amber-400">⚠</span>
            <p className="text-xs text-amber-400">
              Anomalie détectée : +{Math.round((ratio - 1) * 100)}% au-dessus du théorique
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Véhicule',    value: voucher.vehicle?.plate_number ?? '—' },
            { label: 'Chauffeur',   value: `${voucher.driver?.first_name} ${voucher.driver?.last_name}` },
            { label: 'Type carburant', value: voucher.fuel_type.toUpperCase() },
            { label: 'Station',     value: voucher.station_name ?? '—' },
            { label: 'Demandé le',  value: formatDateTime(voucher.requested_at) },
            { label: 'Approuvé le', value: voucher.approved_at ? formatDateTime(voucher.approved_at) : '—' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">{item.label}</p>
              <p className="text-slate-300 font-[family-name:var(--font-mono)]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Carburant détaillé */}
      <div className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          Carburant
        </p>
        <div className="space-y-3">
          {[
            { label: 'Quantité théorique',  value: `${voucher.theoretical_liters} L`, color: 'text-slate-400' },
            { label: 'Quantité demandée',   value: `${voucher.requested_liters} L`,   color: ratio > 1.15 ? 'text-amber-400' : 'text-slate-300' },
            { label: 'Quantité approuvée',  value: voucher.approved_liters ? `${voucher.approved_liters} L` : '—', color: 'text-blue-400' },
            { label: 'Prix / litre',        value: `${voucher.price_per_liter} F`,    color: 'text-slate-400' },
            { label: 'Coût total',          value: voucher.total_cost ? formatFCFA(voucher.total_cost) : '—', color: 'text-orange-400' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{item.label}</span>
              <span className={`text-sm font-bold font-[family-name:var(--font-mono)] ${item.color}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Barre ratio */}
        <div className="mt-4">
          <FuelRatioBar
            requested={voucher.requested_liters}
            theoretical={voucher.theoretical_liters}
          />
        </div>
      </div>

      {/* Motif refus */}
      {voucher.rejection_reason && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">
            Motif du refus
          </p>
          <p className="text-sm text-slate-300">{voucher.rejection_reason}</p>
        </div>
      )}
    </div>
  );
}

// ── Carte maintenance ──────────────────────────────────────────────────────
function MaintenanceCard({ plan }: { plan: MaintenancePlan }) {
  const cfg  = MAINTENANCE_STATUS_CFG[plan.status];
  const type = MAINTENANCE_TYPE_CFG[plan.type] || MAINTENANCE_TYPE_CFG.other;
  const kmRemaining = plan.trigger_km && plan.vehicle
    ? plan.trigger_km - plan.vehicle.current_mileage_km
    : null;

  return (
    <div className={`bg-[#080D1A] border rounded-xl p-4 transition-all hover:border-slate-700
      ${plan.status === 'overdue' ? 'border-red-500/30' :
        plan.status === 'due'     ? 'border-amber-500/30' : 'border-slate-800/60'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{type.icon}</span>
          <div>
            <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">
              {type.label}
            </p>
            <p className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)] mt-0.5">
              {plan.vehicle?.plate_number} · {plan.vehicle?.model}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        {plan.trigger_km && (
          <div>
            <p className="text-slate-600 text-[10px] mb-0.5">Seuil déclencheur</p>
            <p className="text-slate-300 font-[family-name:var(--font-mono)]">
              {new Intl.NumberFormat('fr-FR').format(plan.trigger_km)} km
            </p>
          </div>
        )}
        {plan.vehicle && (
          <div>
            <p className="text-slate-600 text-[10px] mb-0.5">Kilométrage actuel</p>
            <p className="text-slate-300 font-[family-name:var(--font-mono)]">
              {new Intl.NumberFormat('fr-FR').format(plan.vehicle.current_mileage_km)} km
            </p>
          </div>
        )}
        {plan.interval_km && (
          <div>
            <p className="text-slate-600 text-[10px] mb-0.5">Intervalle</p>
            <p className="text-slate-300 font-[family-name:var(--font-mono)]">
              tous les {new Intl.NumberFormat('fr-FR').format(plan.interval_km)} km
            </p>
          </div>
        )}
        {plan.estimated_cost && (
          <div>
            <p className="text-slate-600 text-[10px] mb-0.5">Coût estimé</p>
            <p className="text-orange-400 font-bold font-[family-name:var(--font-mono)]">
              {formatFCFA(plan.estimated_cost)}
            </p>
          </div>
        )}
      </div>

      {/* Barre km restants */}
      {kmRemaining !== null && plan.trigger_km && (
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-slate-600">Km avant intervention</span>
            <span className={`font-bold font-[family-name:var(--font-mono)]
              ${kmRemaining <= 0 ? 'text-red-400' : kmRemaining <= 500 ? 'text-amber-400' : 'text-slate-400'}`}>
              {kmRemaining <= 0 ? `Dépassé de ${Math.abs(Math.round(kmRemaining))} km` : `${Math.round(kmRemaining)} km`}
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500
                ${kmRemaining <= 0 ? 'bg-red-500' : kmRemaining <= 500 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, (kmRemaining / plan.trigger_km) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {plan.notes && (
        <p className="text-[10px] text-slate-600 mt-3 italic">{plan.notes}</p>
      )}
    </div>
  );
}

// ── Panel résumé carburant ─────────────────────────────────────────────────
function FuelSummaryPanel({ vouchers }: { vouchers: FuelVoucher[] }) {
  const pending   = vouchers.filter(v => v.status === 'pending').length;
  const anomalies = vouchers.filter(v => {
    const r = v.theoretical_liters > 0 ? v.requested_liters / v.theoretical_liters : 1;
    return r > 1.15 && v.status !== 'rejected';
  }).length;
  const totalCost = vouchers
    .filter(v => v.total_cost)
    .reduce((a, b) => a + (b.total_cost ?? 0), 0);
  const avgL100   = vouchers.filter(v => v.status === 'consumed' && v.departure?.route.distance_km).length > 0
    ? vouchers
        .filter(v => v.status === 'consumed')
        .reduce((a, b) => a + b.requested_liters, 0) /
      vouchers
        .filter(v => v.status === 'consumed' && v.departure?.route.distance_km)
        .reduce((a, b) => a + (b.departure?.route.distance_km ?? 0), 0) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {[
        { label: 'En attente',    value: pending,                       color: 'text-amber-400',   border: 'border-t-amber-500',   unit: 'bons'     },
        { label: 'Anomalies',     value: anomalies,                     color: 'text-red-400',     border: 'border-t-red-500',     unit: 'alertes'  },
        { label: 'Dépenses',      value: formatFCFA(totalCost),         color: 'text-orange-400',  border: 'border-t-orange-500',  unit: ''         },
        { label: 'Conso moyenne', value: avgL100 > 0 ? `${avgL100.toFixed(1)}` : '—', color: 'text-blue-400', border: 'border-t-blue-500', unit: 'L/100km' },
      ].map(kpi => (
        <div key={kpi.label} className={`bg-[#080D1A] border border-slate-800/60 border-t-2 ${kpi.border} rounded-xl p-4`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">
            {kpi.label}
          </p>
          <p className={`text-xl font-bold font-[family-name:var(--font-syne)] ${kpi.color}`}>
            {kpi.value}
            {kpi.unit && <span className="text-xs text-slate-500 ml-1">{kpi.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE CARBURANT
// ══════════════════════════════════════════════════════════════════════════
export default function FuelPage() {
  const { can } = usePermissions();
  const canVouchers    = can('fuelVouchersWrite');
  const canConsumption = can('fuelConsumption');
  const canMaintenance = can('maintenanceWrite');
  const [activeTab, setActiveTab]             = useState<'vouchers' | 'maintenance'>('vouchers');
  const [statusFilter, setStatusFilter]       = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState<FuelVoucher | null>(null);
  const [maintenanceFilter, setMaintenanceFilter] = useState('');
  const [actionView, setActionView]           = useState<'voucher' | 'approve' | 'reject' | 'consumption' | 'plan' | 'record' | null>(null);
  const [mobileShowList, setMobileShowList]   = useState(true);

  const selectVoucher = (v: FuelVoucher | null) => {
    setSelectedVoucher(v);
    setMobileShowList(v === null);
  };

  const voucherParams: Record<string, string> = {};
  if (statusFilter) voucherParams.status = statusFilter;

  const { data: vouchersData, isLoading: vLoading }  = useFuelVouchers(voucherParams);
  const { data: plansData,    isLoading: pLoading }   = useMaintenancePlans(
    maintenanceFilter ? { status: maintenanceFilter } : {}
  );
  const { data: dueData }                             = useMaintenanceDue();

  const vouchers = vouchersData?.data ?? [];
  const plans    = plansData?.data    ?? [];
  const dueCount = dueData?.data.length ?? 0;

  // Stats header
  const stats = useMemo(() => ({
    pending:   vouchers.filter(v => v.status === 'pending').length,
    approved:  vouchers.filter(v => v.status === 'approved').length,
    consumed:  vouchers.filter(v => v.status === 'consumed').length,
    due:       dueCount,
  }), [vouchers, dueCount]);

  return (
    <div className="min-h-screen bg-[#060A14]">
      {/* Header */}
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">
            Carburant & Maintenance
          </h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Gestion des bons et du parc</p>
        </div>

        <div className="ml-auto hidden lg:flex items-center gap-3">
          {[
            { label: 'En attente',  value: stats.pending,  color: stats.pending > 0  ? 'text-amber-400'   : 'text-slate-400' },
            { label: 'Approuvés',   value: stats.approved, color: 'text-blue-400'    },
            { label: 'Consommés',   value: stats.consumed, color: 'text-emerald-400' },
            { label: 'Maintenance', value: stats.due,      color: stats.due > 0      ? 'text-red-400'     : 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className="text-center px-3 border-l border-slate-800 first:border-0">
              <p className={`text-lg font-bold font-[family-name:var(--font-syne)] ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="border-b border-slate-800/60 bg-[#080D1A] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {activeTab === 'vouchers' ? (
            (['voucher','approve','reject','consumption'] as const)
              .filter(action => action === 'consumption' ? canConsumption : canVouchers)
              .map((action) => (
              <button key={action} onClick={() => setActionView(action as any)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${actionView === action ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {action === 'voucher' ? 'Nouveau bon' : action === 'approve' ? 'Approuver' : action === 'reject' ? 'Refuser' : 'Consommation'}
              </button>
            ))
          ) : (
            canMaintenance && (['plan','record'] as const).map((action) => (
              <button key={action} onClick={() => setActionView(action as any)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${actionView === action ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {action === 'plan' ? 'Nouveau plan' : 'Intervention'}
              </button>
            ))
          )}
        </div>
        {activeTab === 'vouchers' && actionView === 'voucher' && <FormRequestFuelVoucher onSuccess={() => setActionView(null)} />}
        {activeTab === 'vouchers' && actionView === 'approve' && selectedVoucher && <FormApproveFuelVoucher voucherId={selectedVoucher.id} onSuccess={() => setActionView(null)} />}
        {activeTab === 'vouchers' && actionView === 'reject' && selectedVoucher && <FormRejectFuelVoucher voucherId={selectedVoucher.id} onSuccess={() => setActionView(null)} />}
        {activeTab === 'vouchers' && actionView === 'consumption' && <FormRecordFuelConsumption onSuccess={() => setActionView(null)} />}
        {activeTab === 'maintenance' && actionView === 'plan' && <FormCreateMaintenancePlan onSuccess={() => setActionView(null)} />}
        {activeTab === 'maintenance' && actionView === 'record' && <FormRecordMaintenance onSuccess={() => setActionView(null)} />}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/60 px-4 sm:px-6 bg-[#080D1A]">
        {[
          { id: 'vouchers',     label: '⛽ Bons Carburant', count: vouchers.length },
          { id: 'maintenance',  label: '🔧 Maintenance',   count: dueCount, alert: dueCount > 0 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all font-[family-name:var(--font-syne)]
              ${activeTab === tab.id
                ? tab.alert ? 'border-red-400 text-red-400' : 'border-orange-400 text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)]
              ${activeTab === tab.id
                ? tab.alert ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                : 'bg-slate-800 text-slate-500'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab Bons Carburant ── */}
      {activeTab === 'vouchers' && (
        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-7rem)]">

          {/* Liste bons */}
          <div className={`${mobileShowList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 flex-shrink-0 border-r border-slate-800/60 bg-[#080D1A]`}>
            {/* Filtre statut */}
            <div className="p-3 border-b border-slate-800/60">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); selectVoucher(null); }}
                className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-[family-name:var(--font-syne)] focus:outline-none focus:border-orange-500/50"
              >
                <option value="">Tous les bons</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvés</option>
                <option value="rejected">Refusés</option>
                <option value="consumed">Consommés</option>
              </select>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {vLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              ) : vouchers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-600 text-xs">Aucun bon trouvé</p>
                </div>
              ) : (
                vouchers.map(v => (
                  <VoucherCard
                    key={v.id}
                    voucher={v}
                    selected={selectedVoucher?.id === v.id}
                    onClick={() => selectVoucher(selectedVoucher?.id === v.id ? null : v)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Panel droit */}
          <div className={`${mobileShowList ? 'hidden' : 'block'} lg:block flex-1 overflow-hidden bg-[#060A14]`}>
            <button
              onClick={() => setMobileShowList(true)}
              className="lg:hidden w-full flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 bg-[#080D1A] text-xs text-slate-400 hover:text-white"
            >
              ← Retour à la liste
            </button>
            {selectedVoucher ? (
              <VoucherDetail voucher={selectedVoucher} />
            ) : (
              <div className="h-full flex flex-col overflow-y-auto p-6">
                <FuelSummaryPanel vouchers={vouchers} />

                {/* Bons en attente mis en avant */}
                {vouchers.filter(v => v.status === 'pending').length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold text-amber-400 mb-3 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                      ⏳ {vouchers.filter(v => v.status === 'pending').length} bon{vouchers.filter(v => v.status === 'pending').length > 1 ? 's' : ''} en attente de validation
                    </p>
                    <div className="space-y-2">
                      {vouchers.filter(v => v.status === 'pending').map(v => (
                        <button
                          key={v.id}
                          onClick={() => selectVoucher(v)}
                          className="w-full text-left flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg hover:border-amber-500/30 transition-all"
                        >
                          <span className="text-sm">⛽</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-[family-name:var(--font-syne)] truncate">
                              {v.departure?.route.name}
                            </p>
                            <p className="text-[10px] text-slate-600">
                              {v.vehicle?.plate_number} · {v.requested_liters}L demandé
                            </p>
                          </div>
                          <span className="text-[10px] text-amber-400 font-[family-name:var(--font-mono)]">
                            Voir →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomalies */}
                {vouchers.filter(v => {
                  const r = v.theoretical_liters > 0 ? v.requested_liters / v.theoretical_liters : 1;
                  return r > 1.15 && v.status !== 'rejected';
                }).length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-400 mb-3 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                      ⚠ Anomalies détectées
                    </p>
                    <div className="space-y-2">
                      {vouchers.filter(v => {
                        const r = v.theoretical_liters > 0 ? v.requested_liters / v.theoretical_liters : 1;
                        return r > 1.15 && v.status !== 'rejected';
                      }).map(v => {
                        const ratio = v.requested_liters / v.theoretical_liters;
                        return (
                          <button
                            key={v.id}
                            onClick={() => selectVoucher(v)}
                            className="w-full text-left flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg hover:border-red-500/30 transition-all"
                          >
                            <span className="text-sm">⛽</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white font-[family-name:var(--font-syne)] truncate">
                                {v.departure?.route.name}
                              </p>
                              <p className="text-[10px] text-red-400 font-[family-name:var(--font-mono)]">
                                +{Math.round((ratio - 1) * 100)}% vs théorique
                              </p>
                            </div>
                            <VoucherStatusBadge status={v.status} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {vouchers.filter(v => v.status === 'pending').length === 0 &&
                 vouchers.filter(v => { const r = v.theoretical_liters > 0 ? v.requested_liters / v.theoretical_liters : 1; return r > 1.15 && v.status !== 'rejected'; }).length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center text-2xl mb-4">
                      ⛽
                    </div>
                    <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">
                      Sélectionner un bon
                    </p>
                    <p className="text-slate-700 text-xs mt-1">
                      Cliquez sur un bon dans la liste pour voir son détail
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Maintenance ── */}
      {activeTab === 'maintenance' && (
        <div className="p-6 max-w-5xl mx-auto">
          {/* Alertes imminentes */}
          {(dueData?.data ?? []).length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-xs font-bold text-red-400 mb-3 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                🚨 {dueData?.data.length} intervention{(dueData?.data.length ?? 0) > 1 ? 's' : ''} requise{(dueData?.data.length ?? 0) > 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(dueData?.data ?? []).map(plan => (
                  <MaintenanceCard key={plan.id} plan={plan} />
                ))}
              </div>
            </div>
          )}

          {/* Filtre + liste complète */}
          <div className="flex items-center gap-3 mb-4">
            <p className="text-xs text-slate-500 font-[family-name:var(--font-syne)] uppercase tracking-widest">
              Tous les plans
            </p>
            <select
              value={maintenanceFilter}
              onChange={e => setMaintenanceFilter(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-[family-name:var(--font-syne)] focus:outline-none focus:border-orange-500/50"
            >
              <option value="">Tous les statuts</option>
              <option value="upcoming">Prévu</option>
              <option value="due">Imminent</option>
              <option value="overdue">Dépassé</option>
              <option value="completed">Effectué</option>
            </select>
            <span className="text-[10px] text-slate-600 font-[family-name:var(--font-mono)] ml-auto">
              {plans.length} plan{plans.length > 1 ? 's' : ''}
            </span>
          </div>

          {pLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-2xl mb-3">🔧</p>
              <p className="text-slate-500 text-sm font-[family-name:var(--font-syne)]">
                Aucun plan de maintenance
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => (
                <MaintenanceCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
