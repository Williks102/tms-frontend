'use client';

import { Payslip } from '@/hooks/useComptabilite';

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function employableName(employable?: Payslip['employable']): string {
  if (!employable) return '—';
  return employable.name ?? `${employable.first_name ?? ''} ${employable.last_name ?? ''}`.trim();
}

// Rendu papier — structure en tableau (gains/retenues), pas le même
// composant que PrintableVoucher car un bulletin liste plusieurs lignes.
export function PrintablePayslip({ payslip }: { payslip: Payslip }) {
  const gains    = payslip.lines?.filter((l) => l.type === 'gain') ?? [];
  const retenues = payslip.lines?.filter((l) => l.type === 'retenue') ?? [];

  return (
    <div className="bg-white text-black w-[500px] mx-auto p-8 font-sans">
      <div className="text-center border-b-2 border-black pb-3 mb-3">
        <p className="text-lg font-black tracking-wide">TMS — CÔTE D&apos;IVOIRE</p>
        <p className="text-xs">Bulletin de paie — {formatPeriod(payslip.period)}</p>
      </div>

      <div className="text-sm mb-3 space-y-1">
        <div className="flex justify-between"><span>Employé</span><span className="font-bold">{employableName(payslip.employable)}</span></div>
        <div className="flex justify-between"><span>Bulletin</span><span className="font-mono">#{payslip.id}</span></div>
      </div>

      <table className="w-full text-sm border-collapse mb-3">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1">Gains</th>
            <th className="text-right py-1">Montant</th>
          </tr>
        </thead>
        <tbody>
          {gains.map((line) => (
            <tr key={line.id} className="border-b border-dashed border-black">
              <td className="py-1">{line.label}</td>
              <td className="text-right py-1">{formatFCFA(line.amount_fcfa)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full text-sm border-collapse mb-3">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1">Retenues</th>
            <th className="text-right py-1">Montant</th>
          </tr>
        </thead>
        <tbody>
          {retenues.length === 0 && (
            <tr><td className="py-1 text-slate-600" colSpan={2}>Aucune</td></tr>
          )}
          {retenues.map((line) => (
            <tr key={line.id} className="border-b border-dashed border-black">
              <td className="py-1">{line.label}</td>
              <td className="text-right py-1">-{formatFCFA(line.amount_fcfa)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-black pt-2 space-y-1 text-sm">
        <div className="flex justify-between"><span>Total brut</span><span className="font-bold">{formatFCFA(payslip.gross_amount_fcfa)}</span></div>
        <div className="flex justify-between"><span>Total retenues</span><span className="font-bold">-{formatFCFA(payslip.deductions_amount_fcfa)}</span></div>
        <div className="flex justify-between text-base pt-1"><span className="font-black">Net à payer</span><span className="font-black">{formatFCFA(payslip.net_amount_fcfa)}</span></div>
      </div>

      <div className="mt-8 flex justify-between text-[10px]">
        <div className="w-1/2 text-center pr-2"><p className="border-t border-black pt-1">Signature employeur</p></div>
        <div className="w-1/2 text-center pl-2"><p className="border-t border-black pt-1">Signature employé</p></div>
      </div>
    </div>
  );
}
