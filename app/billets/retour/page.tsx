'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePaymentStatus } from '@/hooks/usePublicTickets';
import { PrintTicketButton } from '@/components/tickets/PrintTicketButton';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Page de retour après redirection PaiementPro (returnURL, voir
// PaiementProService::initPayment()). La redirection navigateur seule n'est
// pas fiable — elle peut arriver avant que le webhook serveur-à-serveur
// n'ait confirmé le paiement — donc cette page interroge /tickets/online/status
// en boucle (usePaymentStatus) jusqu'à un statut final, plutôt que de faire
// confiance aux paramètres de l'URL de retour.
function BilletsRetourContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const { data, error } = usePaymentStatus(ref);
  const [waitedTooLong, setWaitedTooLong] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setWaitedTooLong(true), 90_000);
    return () => clearTimeout(timeout);
  }, []);

  if (!ref) {
    return (
      <Shell>
        <p className="text-red-400 text-sm text-center">Référence de paiement manquante.</p>
      </Shell>
    );
  }

  if (error || data?.status === 'unknown') {
    return (
      <Shell>
        <Icon color="red">✕</Icon>
        <h1 className="text-lg font-bold text-white font-[family-name:var(--font-syne)] mb-1 text-center">
          Paiement introuvable
        </h1>
        <p className="text-sm text-slate-500 text-center">
          Impossible de retrouver cette tentative de paiement. Si le montant a été débité, contactez-nous avec la référence <span className="font-[family-name:var(--font-mono)]">{ref}</span>.
        </p>
      </Shell>
    );
  }

  if (data?.status === 'cancelled' || data?.status === 'refunded') {
    return (
      <Shell>
        <Icon color="red">✕</Icon>
        <h1 className="text-lg font-bold text-white font-[family-name:var(--font-syne)] mb-1 text-center">
          Paiement non confirmé
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Le paiement n&apos;a pas abouti et la réservation a été libérée. Vous pouvez retenter votre achat.
        </p>
        <a href="/billets" className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white text-center block">
          Retour à la billetterie
        </a>
      </Shell>
    );
  }

  if (data?.status === 'paid' || data?.status === 'boarded') {
    const ticket = data.ticket!;
    return (
      <Shell>
        <Icon color="emerald">✓</Icon>
        <h1 className="text-lg font-bold text-white font-[family-name:var(--font-syne)] mb-1 text-center">
          Billet confirmé
        </h1>
        <p className="text-sm text-slate-400 mb-1 text-center">
          Référence <span className="font-[family-name:var(--font-mono)] text-emerald-400">{ticket.reference}</span>
        </p>
        <p className="text-xs text-slate-600 mb-6 text-center">
          {ticket.departure?.route.name} · {ticket.departure && formatTime(ticket.departure.departure_datetime)}
        </p>
        <PrintTicketButton
          ticket={ticket}
          label="🖨 Imprimer / enregistrer mon billet"
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white"
        />
      </Shell>
    );
  }

  // ── En attente de confirmation (webhook pas encore arrivé) ──────────────
  if (waitedTooLong) {
    return (
      <Shell>
        <Icon color="amber">⏳</Icon>
        <h1 className="text-lg font-bold text-white font-[family-name:var(--font-syne)] mb-1 text-center">
          Confirmation plus longue que prévu
        </h1>
        <p className="text-sm text-slate-500 text-center">
          Votre paiement est peut-être passé mais la confirmation tarde. Conservez votre référence <span className="font-[family-name:var(--font-mono)] text-slate-300">{ref}</span> et consultez <a href="/mes-achats" className="text-blue-400 underline">Mes achats</a> dans quelques minutes.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-10 h-10 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
      <h1 className="text-lg font-bold text-white font-[family-name:var(--font-syne)] mb-1 text-center">
        Confirmation du paiement...
      </h1>
      <p className="text-sm text-slate-500 text-center">Merci de patienter, ne fermez pas cette page.</p>
    </Shell>
  );
}

export default function BilletsRetourPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060A14]" />}>
      <BilletsRetourContent />
    </Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060A14] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#080D1A] border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

function Icon({ children, color }: { children: React.ReactNode; color: 'emerald' | 'red' | 'amber' }) {
  const cfg = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red:     'bg-red-500/10 border-red-500/20 text-red-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
  }[color];

  return (
    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl mx-auto mb-4 ${cfg}`}>
      {children}
    </div>
  );
}
