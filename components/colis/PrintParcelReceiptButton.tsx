'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Parcel } from '@/hooks/useColis';
import { generateQrCode } from '@/lib/qrcode';
import { PrintableParcelReceipt } from './PrintableParcelReceipt';

// Imprime les 2 documents (reçu expéditeur + étiquette colis) en un seul job
// d'impression — portal contenant les deux variantes empilées avec un saut
// de page CSS entre elles, plutôt que 2 boutons/2 dialogues séparés (nouveau
// par rapport au pattern PrintTicketButton/PrintVoucherButton à un seul document).
export function PrintParcelReceiptButton({ parcel, label = '🖨 Imprimer les 2 documents', className }: {
  parcel:     Parcel;
  label?:     string;
  className?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const dataUrl = await generateQrCode(parcel.tracking_number);
      setQr(dataUrl);
      requestAnimationFrame(() => window.print());
    } catch {
      // silencieux — pas de QR, pas d'impression déclenchée
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        disabled={loading}
        className={className ?? 'rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50'}
      >
        {loading ? 'Préparation...' : label}
      </button>
      {qr && typeof document !== 'undefined' && createPortal(
        <div className="hidden print:block">
          <PrintableParcelReceipt parcel={parcel} qrDataUrl={qr} variant="expediteur" />
          <div style={{ breakAfter: 'page' }} />
          <PrintableParcelReceipt parcel={parcel} qrDataUrl={qr} variant="etiquette" />
        </div>,
        document.body
      )}
    </>
  );
}
