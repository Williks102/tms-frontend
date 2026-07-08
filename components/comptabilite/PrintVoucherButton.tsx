'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { generateQrCode } from '@/lib/qrcode';
import { PrintableVoucher, PrintableVoucherProps } from './PrintableVoucher';

type PrintVoucherButtonProps = Omit<PrintableVoucherProps, 'qrDataUrl'> & {
  label?:     string;
  className?: string;
};

// Bouton autonome et générique : génère le QR code puis imprime via
// window.print(). Même mécanique que PrintTicketButton — portal sous
// <body> pour échapper à `print:hidden` (voir app/layout.tsx / AppShell).
// Réutilisé pour les bons de caisse ET les bons carburant.
export function PrintVoucherButton({ label = '🖨 Imprimer', className, ...voucherProps }: PrintVoucherButtonProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const dataUrl = await generateQrCode(voucherProps.reference);
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
          <PrintableVoucher {...voucherProps} qrDataUrl={qr} />
        </div>,
        document.body
      )}
    </>
  );
}
