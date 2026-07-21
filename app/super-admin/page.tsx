'use client';

// app/super-admin/page.tsx — voir CLAUDE.md § Revente SaaS. Réservé au rôle
// super_admin (voir lib/pageAccess.ts) — jamais assignable via la création
// de personnel, jamais seedé pour un client (voir tms:create-super-admin).
import { useState } from 'react';
import { useBillingReport, useSubscriptionStatus, useTiers, updateSubscription } from '@/hooks/useSuperAdmin';

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-[family-name:var(--font-mono)]">{value}</span>
    </div>
  );
}

export default function SuperAdminPage() {
  const [month, setMonth] = useState('');
  const { data: subData, isLoading: subLoading, mutate: mutateSub } = useSubscriptionStatus();
  const { data: reportData, isLoading: reportLoading } = useBillingReport(month || undefined);
  const { data: tiersData } = useTiers();

  const [note, setNote] = useState('');
  const [paidUntil, setPaidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscription = subData?.data;
  const report        = reportData?.data;
  const tiers          = tiersData?.data;

  const handleSetStatus = async (status: 'active' | 'suspended') => {
    setSaving(true);
    setError(null);
    try {
      await updateSubscription({ status, paid_until: paidUntil || null, note: note || null });
      setNote('');
      setPaidUntil('');
      await mutateSub();
    } catch (e) {
      setError((e as Error).message || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="h-14 border-b border-slate-200 bg-slate-50 flex items-center px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-900 tracking-widest uppercase font-[family-name:var(--font-syne)]">Super Admin</h1>
          <p className="text-xs text-slate-500 truncate hidden sm:block">Abonnement et facturation de ce déploiement — usage interne uniquement</p>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-3xl">

        {/* Statut d'abonnement */}
        <Card title="Statut d'abonnement">
          {subLoading ? (
            <p className="text-xs text-slate-500">Chargement...</p>
          ) : subscription ? (
            <>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  subscription.status === 'active'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  {subscription.status === 'active' ? 'Actif' : 'Suspendu'}
                </span>
              </div>
              <Row label="Payé jusqu'au" value={formatDate(subscription.paid_until)} />
              <Row label="Note" value={subscription.note ?? '—'} />

              {subscription.status === 'suspended' && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  Le back-office est actuellement bloqué pour tout le personnel de ce client. Les pages publiques (billets, suivi colis, écran de gare) restent actives.
                </p>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Payé jusqu&apos;au (optionnel)</label>
                    <input type="date" value={paidUntil} onChange={(e) => setPaidUntil(e.target.value)}
                      className="mt-1 w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Note (optionnel)</label>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: Payé Mobile Money le 20/07"
                      className="mt-1 w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50" />
                  </div>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-2">
                  <button onClick={() => handleSetStatus('active')} disabled={saving}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    Activer
                  </button>
                  <button onClick={() => handleSetStatus('suspended')} disabled={saving}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    Suspendre
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-red-400">Impossible de charger le statut.</p>
          )}
        </Card>

        {/* Rapport de facturation */}
        <Card title="Rapport de facturation">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50" />

          {reportLoading ? (
            <p className="text-xs text-slate-500">Chargement...</p>
          ) : report ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{report.month_label}</p>
              <Row label="Taille de flotte" value={`${report.fleet_size} véhicule(s)`} />
              <Row label="Palier" value={report.tier.label} />
              <Row label="Abonnement mensuel" value={formatFCFA(report.tier.monthly_fcfa)} />
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <Row label="Billets en ligne vendus" value={report.online_tickets_count} />
                <Row label="Volume billets en ligne" value={formatFCFA(report.online_volume_fcfa)} />
                <Row label={`Commission (${report.commission_per_ticket_fcfa} FCFA/billet)`} value={formatFCFA(report.commission_fcfa)} />
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Total à facturer</span>
                  <span className="text-lg font-bold text-emerald-400 font-[family-name:var(--font-mono)]">{formatFCFA(report.total_fcfa)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-red-400">Impossible de charger le rapport.</p>
          )}
        </Card>

        {/* Grille tarifaire (référence) */}
        {tiers && (
          <Card title="Grille tarifaire (illustrative, non validée)">
            {tiers.tiers.map((t) => (
              <Row key={t.label} label={t.label} value={formatFCFA(t.monthly_fcfa)} />
            ))}
            <Row label="Commission billets en ligne" value={`${tiers.commission_per_ticket_fcfa} FCFA/billet`} />
            <Row label="Frais de mise en place" value={`~${tiers.setup_fee_range_fcfa} FCFA`} />
          </Card>
        )}
      </div>
    </div>
  );
}
