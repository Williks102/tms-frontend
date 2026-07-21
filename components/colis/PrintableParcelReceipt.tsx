'use client';

import { Parcel } from '@/hooks/useColis';
import { APP_FULL_NAME } from '@/lib/branding';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

const CATEGORY_LABEL: Record<string, string> = {
  standard: 'Standard', fragile: 'Fragile', perissable: 'Périssable', liquide: 'Liquide',
};

interface PrintableParcelReceiptProps {
  parcel:    Parcel;
  qrDataUrl: string;
  variant:   'expediteur' | 'etiquette';
}

// Rendu papier — pas de thème sombre ici, toujours noir sur blanc pour
// l'impression (même convention que PrintableTicket/PrintableVoucher).
export function PrintableParcelReceipt({ parcel, qrDataUrl, variant }: PrintableParcelReceiptProps) {
  const route = parcel.departure?.route;

  if (variant === 'etiquette') {
    // Collée sur le colis — voyage physiquement, visible de tous en transit :
    // jamais le code de retrait, jamais les téléphones complets. Le nom de
    // l'expéditeur ET du destinataire reste affiché pour permettre au
    // personnel d'identifier les deux parties en cas de colis égaré.
    return (
      <div className="bg-white text-black w-[380px] mx-auto p-8 font-sans">
        <div className="text-center border-b-2 border-black pb-3 mb-3">
          <p className="text-lg font-black tracking-wide uppercase">{APP_FULL_NAME}</p>
          <p className="text-xs">Étiquette colis</p>
        </div>

        <div className="text-center mb-3">
          <p className="text-2xl font-black">{parcel.tracking_number}</p>
        </div>

        <div className="space-y-1 text-sm border-y border-dashed border-black py-3 mb-3">
          <div className="flex justify-between"><span>Expéditeur</span><span className="font-bold">{parcel.sender_name}</span></div>
          <div className="flex justify-between"><span>Destinataire</span><span className="font-bold">{parcel.recipient_name}</span></div>
          <div className="flex justify-between"><span>Destination</span><span className="font-bold">{route?.destination_city ?? '—'}</span></div>
          <div className="flex justify-between"><span>Catégorie</span><span>{CATEGORY_LABEL[parcel.category]}</span></div>
          <div className="flex justify-between"><span>Poids</span><span>{parcel.weight_kg} kg</span></div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code ${parcel.tracking_number}`} width={180} height={180} />
        </div>
      </div>
    );
  }

  // Reçu client — conservé par l'expéditeur, contient le code de retrait à
  // communiquer au destinataire (secret partagé qui remplace la vérification d'identité).
  return (
    <div className="bg-white text-black w-[380px] mx-auto p-8 font-sans">
      <div className="text-center border-b-2 border-black pb-3 mb-3">
        <p className="text-lg font-black tracking-wide uppercase">{APP_FULL_NAME}</p>
        <p className="text-xs">Reçu d&apos;expédition — service courrier</p>
      </div>

      <div className="text-center mb-3">
        <p className="text-2xl font-black">{parcel.tracking_number}</p>
        {route && <p className="text-sm">{route.origin_city} → {route.destination_city}</p>}
      </div>

      <div className="space-y-1 text-sm border-y border-dashed border-black py-3 mb-3">
        <div className="flex justify-between"><span>Expéditeur</span><span className="font-bold">{parcel.sender_name}</span></div>
        <div className="flex justify-between"><span>Téléphone</span><span>{parcel.sender_phone}</span></div>
        <div className="flex justify-between"><span>Destinataire</span><span className="font-bold">{parcel.recipient_name}</span></div>
        <div className="flex justify-between"><span>Téléphone</span><span>{parcel.recipient_phone}</span></div>
        <div className="flex justify-between"><span>Catégorie</span><span>{CATEGORY_LABEL[parcel.category]}</span></div>
        <div className="flex justify-between"><span>Poids</span><span>{parcel.weight_kg} kg</span></div>
        <div className="flex justify-between"><span>Valeur déclarée</span><span>{formatFCFA(parcel.declared_value_fcfa)}</span></div>
      </div>

      <div className="space-y-1 text-sm border-b border-dashed border-black pb-3 mb-3">
        <div className="flex justify-between"><span>Transport</span><span>{formatFCFA(parcel.transport_fee_fcfa)}</span></div>
        <div className="flex justify-between"><span>Assurance</span><span>{formatFCFA(parcel.insurance_fee_fcfa)}</span></div>
        <div className="flex justify-between text-base pt-1"><span className="font-bold">Total</span><span className="font-black">{formatFCFA(parcel.total_fee_fcfa)}</span></div>
        <div className="flex justify-between"><span>Paiement</span><span className="font-bold">{parcel.payment_responsibility === 'expediteur' ? 'Payé (port payé)' : 'À la charge du destinataire (port dû)'}</span></div>
      </div>

      <div className="bg-black text-white text-center py-3 mb-3 rounded">
        <p className="text-[10px] uppercase tracking-widest">Code de retrait</p>
        <p className="text-2xl font-black tracking-[0.3em]">{parcel.pickup_code}</p>
      </div>
      <p className="text-[10px] text-center mb-3">
        Communiquez ce code à {parcel.recipient_name} — il sera demandé lors du retrait du colis, à la place d&apos;une pièce d&apos;identité.
      </p>

      <div className="flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code ${parcel.tracking_number}`} width={140} height={140} />
      </div>

      <p className="text-[9px] text-center mt-4">
        Colis enregistré le {formatDate(parcel.registered_at)}
      </p>
    </div>
  );
}
