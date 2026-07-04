'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Ticket } from '@/hooks/useTickets';
import { generateTicketQrCode } from '@/lib/qrcode';
import { PrintableTicket } from './PrintableTicket';

// Bouton autonome : génère le QR code puis imprime via window.print().
// Le rendu imprimable est porté (portal) directement sous <body>, pour échapper
// à n'importe quel ancêtre `print:hidden` (voir app/layout.tsx) et rester visible
// à l'impression même si ce bouton se trouve dans une zone masquée à l'écran normal.
export function PrintTicketButton({ ticket, label = '🖨 Imprimer', className }: {
  ticket: Ticket;
  label?: string;
  className?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const dataUrl = await generateTicketQrCode(ticket.reference);
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
          <PrintableTicket ticket={ticket} qrDataUrl={qr} />
        </div>,
        document.body
      )}
    </>
  );
}
