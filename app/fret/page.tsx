'use client';

import { useState } from 'react';
import { useFreightClients, useFreightShipments, useFreightShipmentDetail, useFreightPricingSettings, FreightShipment } from '@/hooks/useFret';
import {
  FormCreateFreightClient, FormCreateShipment, FormAssignShipment,
  FormUpdateShipmentStatus, FormCancelShipment, FormMarkPaid, FormUpdatePricingSettings,
} from '@/components/fret/FretForms';
import { PrintFreightInvoiceButton } from '@/components/fret/PrintFreightInvoiceButton';
import { usePermissions } from '@/lib/permissions';

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'En attente',  color: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
  assigned:    { label: 'Affecté',     color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  in_transit:  { label: 'En route',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  delivered:   { label: 'Livré',       color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cancelled:   { label: 'Annulé',      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
};

const PAYMENT_CFG: Record<string, string> = {
  pending:  'Non facturé',
  invoiced: 'Facturé — en attente de règlement',
  paid:     'Encaissé',
};

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#080D1A] p-5 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-sm text-slate-400">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ShipmentDetail({ shipmentId, canManage, onClose, onChanged }: {
  shipmentId: number; canManage: boolean; onClose: () => void; onChanged: () => void;
}) {
  const { data, isLoading, mutate } = useFreightShipmentDetail(shipmentId);
  const [action, setAction] = useState<'assign' | 'cancel' | 'pay' | null>(null);

  if (isLoading) return <div className="p-6 space-y-3"><Sk className="h-24" /><Sk className="h-48" /></div>;
  if (!data) return null;
  const shipment = data.shipment;
  const cfg = STATUS_CFG[shipment.status];

  const refresh = () => { setAction(null); mutate(); onChanged(); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-indigo-400">{shipment.reference}</p>
          <h3 className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">{shipment.origin_city} → {shipment.destination_city}</h3>
          <p className="text-xs text-slate-500 mt-1">{shipment.client?.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">Fermer ✕</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
        {[
          { label: 'Distance', value: `${shipment.distance_km} km` },
          { label: 'Tonnage', value: `${shipment.weight_tons} t` },
          { label: 'Prix', value: formatFCFA(shipment.price_fcfa) },
          { label: 'Paiement', value: PAYMENT_CFG[shipment.payment_status] },
          { label: 'Camion', value: shipment.vehicle ? `${shipment.vehicle.plate_number} · ${shipment.vehicle.model}` : '—' },
          { label: 'Chauffeur', value: shipment.driver ? `${shipment.driver.first_name} ${shipment.driver.last_name}` : '—' },
          { label: 'Créée le', value: shipment.scheduled_at ? formatDateTime(shipment.scheduled_at) : '—' },
          { label: 'Livrée le', value: shipment.delivered_at ? formatDateTime(shipment.delivered_at) : '—' },
        ].map(item => (
          <div key={item.label}>
            <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-slate-300">{item.value}</p>
          </div>
        ))}
      </div>

      {shipment.cargo_description && (
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Marchandise</p>
          <p className="text-sm text-slate-300">{shipment.cargo_description}</p>
        </div>
      )}

      {shipment.cancellation_reason && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Motif d&apos;annulation</p>
          <p className="text-sm text-slate-300">{shipment.cancellation_reason}</p>
        </div>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {(shipment.status === 'pending' || shipment.status === 'assigned') && (
            <button onClick={() => setAction(action === 'assign' ? null : 'assign')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'assign' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {shipment.vehicle ? 'Réaffecter' : 'Affecter un camion'}
            </button>
          )}
          {(shipment.status === 'pending' || shipment.status === 'assigned' || shipment.status === 'in_transit') && (
            <button onClick={() => setAction(action === 'cancel' ? null : 'cancel')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'cancel' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Annuler
            </button>
          )}
          {shipment.payment_status === 'invoiced' && (
            <button onClick={() => setAction(action === 'pay' ? null : 'pay')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'pay' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Encaisser
            </button>
          )}
        </div>
      )}

      {canManage && (shipment.status === 'assigned' || shipment.status === 'in_transit') && (
        <FormUpdateShipmentStatus shipment={shipment} onSuccess={refresh} />
      )}

      {action === 'assign' && (
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <FormAssignShipment shipment={shipment} onSuccess={refresh} />
        </div>
      )}
      {action === 'cancel' && (
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <FormCancelShipment shipment={shipment} onSuccess={refresh} />
        </div>
      )}
      {action === 'pay' && (
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <FormMarkPaid shipment={shipment} onSuccess={refresh} />
        </div>
      )}

      {shipment.status === 'delivered' && <PrintFreightInvoiceButton shipment={shipment} />}
    </div>
  );
}

function ClientsTab({ onViewShipments }: { onViewShipments: (clientId: number) => void }) {
  const { can } = usePermissions();
  const canManage = can('fretWrite');
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, mutate } = useFreightClients({ per_page: '50' });
  const clients = data?.data ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {canManage && (
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white">
          + Nouveau client
        </button>
      )}

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-16" />)
          : clients.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-[#080D1A] border border-slate-800/60 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{c.company_name}</p>
                <p className="text-[11px] text-slate-500">{c.contact_name ? `${c.contact_name} · ` : ''}{c.phone}</p>
              </div>
              <button onClick={() => onViewShipments(c.id)} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 flex-shrink-0">
                Expéditions →
              </button>
            </div>
          ))
        }
        {!isLoading && !clients.length && <p className="text-slate-600 text-xs text-center py-8">Aucun client fret</p>}
      </div>

      {showCreate && (
        <Modal title="Nouveau client fret" onClose={() => setShowCreate(false)}>
          <FormCreateFreightClient onSuccess={() => { setShowCreate(false); mutate(); }} />
        </Modal>
      )}
    </div>
  );
}

function ShipmentsTab({ clientFilter }: { clientFilter: number | null }) {
  const { can } = usePermissions();
  const canManage = can('fretWrite');

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [mobileShowList, setMobileShowList] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;
  if (clientFilter) params.freight_client_id = String(clientFilter);

  const { data, isLoading, mutate } = useFreightShipments(params);
  const { data: clientsData } = useFreightClients({ per_page: '100' });
  const shipments = data?.data ?? [];
  const clients = clientsData?.data ?? [];

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-7rem)]">
      <div className={`${mobileShowList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-96 flex-shrink-0 border-r border-slate-800/60`}>
        <div className="p-4 border-b border-slate-800/60 space-y-2">
          {canManage && (
            <button onClick={() => setShowCreate(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white mb-2">
              + Nouvelle expédition
            </button>
          )}
          <input type="text" placeholder="Rechercher (référence, ville)..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CFG).map(([value, cfg]) => <option key={value} value={value}>{cfg.label}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-16" />)
            : shipments.map((s: FreightShipment) => {
              const cfg = STATUS_CFG[s.status];
              return (
                <button key={s.id} onClick={() => { setSelected(s.id); setMobileShowList(false); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all
                    ${selected === s.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#080D1A] border-slate-800/60 hover:border-slate-700'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-mono font-bold text-indigo-400">{s.reference}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 truncate">{s.origin_city} → {s.destination_city}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{formatFCFA(s.price_fcfa)}</p>
                </button>
              );
            })
          }
          {!isLoading && !shipments.length && <p className="text-slate-600 text-xs text-center py-8">Aucune expédition</p>}
        </div>
      </div>

      <div className={`${mobileShowList ? 'hidden' : 'block'} lg:block flex-1 overflow-y-auto`}>
        <button onClick={() => setMobileShowList(true)}
          className="lg:hidden w-full flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 bg-[#080D1A] text-xs text-slate-400 hover:text-white">
          ← Retour à la liste
        </button>
        {selected ? (
          <ShipmentDetail shipmentId={selected} canManage={canManage}
            onClose={() => { setSelected(null); setMobileShowList(true); }} onChanged={() => mutate()} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-sm">Sélectionner une expédition</p>
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Nouvelle expédition" onClose={() => setShowCreate(false)}>
          <FormCreateShipment clients={clients} onSuccess={() => { setShowCreate(false); mutate(); }} />
        </Modal>
      )}
    </div>
  );
}

export default function FretPage() {
  const { role } = usePermissions();
  const [tab, setTab] = useState<'shipments' | 'clients'>('shipments');
  const [clientFilter, setClientFilter] = useState<number | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const { data: pricingData, mutate: mutatePricing } = useFreightPricingSettings();

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Fret</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Camions dédiés — clients entreprise, facturation à crédit</p>
        </div>
        {role === 'manager' && (
          <button onClick={() => setShowPricing(true)} className="ml-auto rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-slate-600 flex-shrink-0">
            ⚙ Tarifs
          </button>
        )}
      </header>

      <div className="flex gap-1 px-4 sm:px-6 pt-3 border-b border-slate-800/60 bg-[#080D1A]">
        {[
          { key: 'shipments' as const, label: 'Expéditions' },
          { key: 'clients' as const, label: 'Clients' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'shipments') setClientFilter(null); }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${tab === t.key ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shipments'
        ? <ShipmentsTab clientFilter={clientFilter} />
        : <ClientsTab onViewShipments={(id) => { setClientFilter(id); setTab('shipments'); }} />
      }

      {showPricing && pricingData && (
        <Modal title="Tarif fret" subtitle="Formule : tonnage × distance × tarif" onClose={() => setShowPricing(false)}>
          <FormUpdatePricingSettings settings={pricingData.settings} onSuccess={() => { setShowPricing(false); mutatePricing(); }} />
        </Modal>
      )}
    </div>
  );
}
