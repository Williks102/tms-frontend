'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Payslip } from '@/hooks/useComptabilite';
import { PrintablePayslip } from './PrintablePayslip';

export function PrintPayslipButton({ payslip, label = '🖨 Imprimer', className }: {
  payslip:    Payslip;
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
          <PrintablePayslip payslip={payslip} />
        </div>,
        document.body
      )}
    </>
  );
}
