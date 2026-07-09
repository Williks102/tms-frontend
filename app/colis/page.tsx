'use client';

import { useState } from 'react';
import { useParcels, useParcelDetail, Parcel } from '@/hooks/useColis';
import {
  FormRegisterParcel, FormReleaseParcel, FormCancelParcel, FormParcelException,
} from '@/components/colis/ColisForms';
import { PrintParcelReceiptButton } from '@/components/colis/PrintParcelReceiptButton';
import { TicketScanner } from '@/components/tickets/TicketScanner';
import { apiFetch } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  enregistre: { label: 'Enregistré', color: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
  arrive:     { label: 'Arrivé',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  retire:     { label: 'Retiré',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  retourne:   { label: 'Retourné',   color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  perdu:      { label: 'Perdu',      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  annule:     { label: 'Annulé',     color: 'text-slate-500',   bg: 'bg-slate-800/40',   border: 'border-slate-700'      },
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

function ParcelDetail({ parcelId, canManage, isManager, onClose, onChanged }: {
  parcelId: number; canManage: boolean; isManager: boolean; onClose: () => void; onChanged: () => void;
}) {
  const { data, isLoading, mutate } = useParcelDetail(parcelId);
  const [action, setAction] = useState<'release' | 'cancel' | 'exception' | 'scan-quick' | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 space-y-3"><Sk className="h-24" /><Sk className="h-48" /></div>;
  if (!data) return null;
  const parcel = data.parcel;
  const cfg = STATUS_CFG[parcel.status];

  const refresh = () => { setAction(null); mutate(); onChanged(); };

  const handleScanArrival = async (trackingNumber: string) => {
    if (scanBusy) return;
    setScanBusy(true);
    setScanMessage(null);
    try {
      await apiFetch('/colis/scan-arrival', { method: 'POST', body: JSON.stringify({ tracking_number: trackingNumber }) } as RequestInit);
      setScanMessage('Colis marqué arrivé');
      refresh();
    } catch (err: any) {
      setScanMessage(err.message || 'Erreur de scan');
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-indigo-400">{parcel.tracking_number}</p>
          <h3 className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">{parcel.sender_name} → {parcel.recipient_name}</h3>
          <p className="text-xs text-slate-500 mt-1">{parcel.departure?.route.origin_city} → {parcel.departure?.route.destination_city}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">Fermer ✕</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
        {[
          { label: 'Catégorie', value: parcel.category },
          { label: 'Poids', value: `${parcel.weight_kg} kg` },
          { label: 'Valeur déclarée', value: formatFCFA(parcel.declared_value_fcfa) },
          { label: 'Total à payer', value: formatFCFA(parcel.total_fee_fcfa) },
          { label: 'Paiement', value: parcel.payment_responsibility === 'expediteur' ? 'Port payé' : 'Port dû' },
          { label: 'Statut paiement', value: parcel.payment_status === 'paid' ? 'Payé' : 'En attente' },
          { label: 'Enregistré le', value: formatDateTime(parcel.registered_at) },
          { label: 'Arrivé le', value: parcel.arrived_at ? formatDateTime(parcel.arrived_at) : '—' },
        ].map(item => (
          <div key={item.label}>
            <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-slate-300">{item.value}</p>
          </div>
        ))}
      </div>

      {parcel.exception_reason && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Motif</p>
          <p className="text-sm text-slate-300">{parcel.exception_reason}</p>
        </div>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {parcel.status === 'enregistre' && (
            <button onClick={() => handleScanArrival(parcel.tracking_number)} disabled={scanBusy}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {scanBusy ? 'Scan...' : 'Marquer arrivé'}
            </button>
          )}
          {parcel.status === 'arrive' && (
            <button onClick={() => setAction(action === 'release' ? null : 'release')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'release' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Remettre le colis
            </button>
          )}
          {parcel.status === 'enregistre' && (
            <button onClick={() => setAction(action === 'cancel' ? null : 'cancel')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'cancel' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Annuler
            </button>
          )}
          {isManager && ['enregistre', 'arrive'].includes(parcel.status) && (
            <button onClick={() => setAction(action === 'exception' ? null : 'exception')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${action === 'exception' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Perdu / retourné
            </button>
          )}
        </div>
      )}
      {scanMessage && <p className="text-xs text-slate-400">{scanMessage}</p>}

      {action === 'release' && (
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <FormReleaseParcel parcel={parcel} onSuccess={refresh} />
        </div>
      )}
      {action === 'cancel' && (
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <FormCancelParcel parcel={parcel} onSuccess={refresh} />
        </div>
      )}
      {action === 'exception' && (
        <div className="bg-[#0A1020] border border-slate-800/60 rounded-xl p-4">
          <FormParcelException parcel={parcel} onSuccess={refresh} />
        </div>
      )}

      {(parcel.status === 'enregistre' || parcel.status === 'arrive') && (
        <PrintParcelReceiptButton parcel={parcel} />
      )}
    </div>
  );
}

export default function ColisPage() {
  const { role, can } = usePermissions();
  const canManage = can('colisWrite');
  const isManager = role === 'manager';

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [mobileShowList, setMobileShowList] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showScan, setShowScan] = useState(false);

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, mutate } = useParcels(params);
  const parcels = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#060A14]">
      <header className="h-14 border-b border-slate-800/60 bg-[#080D1A] flex items-center px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-widest uppercase font-[family-name:var(--font-syne)]">Colis</h1>
          <p className="text-xs text-slate-600 truncate hidden sm:block">Service courrier — enregistrement, arrivée, retrait</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-3.5rem)]">
        <div className={`${mobileShowList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-96 flex-shrink-0 border-r border-slate-800/60`}>
          <div className="p-4 border-b border-slate-800/60 space-y-2">
            {canManage && (
              <div className="flex flex-wrap gap-2 mb-2">
                <button onClick={() => setShowRegister(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                  + Enregistrer un colis
                </button>
                <button onClick={() => setShowScan(true)} className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-400">
                  📷 Scanner un colis
                </button>
              </div>
            )}
            <input type="text" placeholder="Rechercher (n° suivi, nom)..." value={search} onChange={e => setSearch(e.target.value)}
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
              : parcels.map((p: Parcel) => {
                const cfg = STATUS_CFG[p.status];
                return (
                  <button key={p.id} onClick={() => { setSelected(p.id); setMobileShowList(false); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all
                      ${selected === p.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#080D1A] border-slate-800/60 hover:border-slate-700'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-bold text-indigo-400">{p.tracking_number}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 truncate">{p.sender_name} → {p.recipient_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formatFCFA(p.total_fee_fcfa)}</p>
                  </button>
                );
              })
            }
            {!isLoading && !parcels.length && <p className="text-slate-600 text-xs text-center py-8">Aucun colis</p>}
          </div>
        </div>

        <div className={`${mobileShowList ? 'hidden' : 'block'} lg:block flex-1 overflow-y-auto`}>
          <button onClick={() => setMobileShowList(true)}
            className="lg:hidden w-full flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 bg-[#080D1A] text-xs text-slate-400 hover:text-white">
            ← Retour à la liste
          </button>
          {selected ? (
            <ParcelDetail parcelId={selected} canManage={canManage} isManager={isManager}
              onClose={() => { setSelected(null); setMobileShowList(true); }} onChanged={() => mutate()} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 text-sm">Sélectionner un colis</p>
            </div>
          )}
        </div>
      </div>

      {showRegister && (
        <Modal title="Enregistrer un colis" onClose={() => setShowRegister(false)}>
          <FormRegisterParcel onSuccess={() => { mutate(); }} />
        </Modal>
      )}

      {showScan && (
        <Modal title="Scanner un colis" subtitle="Marque le colis comme arrivé" onClose={() => setShowScan(false)}>
          <ScanArrivalModalBody onScanned={() => { setShowScan(false); mutate(); }} />
        </Modal>
      )}
    </div>
  );
}

function ScanArrivalModalBody({ onScanned }: { onScanned: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDetect = async (trackingNumber: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ parcel: Parcel }>('/colis/scan-arrival', {
        method: 'POST',
        body: JSON.stringify({ tracking_number: trackingNumber }),
      } as RequestInit);
      setMessage(`Colis ${result.parcel.tracking_number} marqué arrivé`);
      onScanned();
    } catch (err: any) {
      setMessage(err.message || 'Erreur de scan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      <TicketScanner onDetect={handleDetect} disabled={busy} placeholder="Numéro de suivi du colis (douchette ou saisie manuelle)" />
    </div>
  );
}
