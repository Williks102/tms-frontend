'use client';

import { PrintVoucherButton } from '@/components/comptabilite/PrintVoucherButton';
import { FreightShipment } from '@/hooks/useFret';

// Réutilise le PrintableVoucher générique (déjà utilisé pour bons de caisse
// et bons carburant) plutôt qu'un nouveau composant imprimable dédié — une
// facture fret est structurellement la même chose : référence, date, montant,
// tiers, quelques lignes de détail, QR code.
export function PrintFreightInvoiceButton({ shipment }: { shipment: FreightShipment }) {
  return (
    <PrintVoucherButton
      label="🖨 Imprimer la facture"
      title="Facture — transport de marchandises"
      reference={shipment.reference}
      date={shipment.delivered_at ?? new Date().toISOString()}
      amount={shipment.price_fcfa}
      motif={`${shipment.origin_city} → ${shipment.destination_city}`}
      tiersLabel="Client"
      tiersValue={shipment.client?.company_name ?? null}
      extraRows={[
        { label: 'Tonnage', value: `${shipment.weight_tons} t` },
        { label: 'Distance', value: `${shipment.distance_km} km` },
        { label: 'Statut paiement', value: shipment.payment_status === 'paid' ? 'Encaissé' : 'Facturé — en attente' },
      ]}
      className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-semibold text-white text-center"
    />
  );
}
