'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PrintableReport, PrintableReportProps } from './PrintableReport';

// Clone du mécanisme PrintVoucherButton (portal + window.print()), sans QR
// code — un rapport n'est pas un document à scanner. Tout navigateur propose
// "Enregistrer en PDF" comme destination d'impression.
export function PrintReportButton({ label = '🖨 Imprimer / PDF', className, ...reportProps }: PrintableReportProps & {
  label?:     string;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  const handlePrint = () => {
    setShow(true);
    requestAnimationFrame(() => window.print());
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        className={className ?? 'rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs font-semibold text-white'}
      >
        {label}
      </button>
      {show && typeof document !== 'undefined' && createPortal(
        <div className="hidden print:block">
          <PrintableReport {...reportProps} />
        </div>,
        document.body
      )}
    </>
  );
}
