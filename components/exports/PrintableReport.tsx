'use client';

import { APP_FULL_NAME } from '@/lib/branding';

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

export interface PrintableReportSection {
  heading: string;
  rows:    { label: string; value: number }[];
  total?:  { label: string; value: number };
}

export interface PrintableReportProps {
  title:      string;
  subtitle?:  string;
  sections:   PrintableReportSection[];
  grandTotal?: { label: string; value: number };
}

// Rendu papier générique — mêmes données que celles déjà affichées à
// l'écran (useIncomeStatement/useBalanceSheet/useDashboardLive), pas de
// nouvel appel API. Réutilisé pour compte de résultat, bilan et rapport
// journalier — pas de QR code ici, ce ne sont pas des documents à scanner.
export function PrintableReport({ title, subtitle, sections, grandTotal }: PrintableReportProps) {
  return (
    <div className="bg-white text-black w-[500px] mx-auto p-8 font-sans">
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-lg font-black tracking-wide uppercase">{APP_FULL_NAME}</p>
        <p className="text-xs">{title}</p>
        {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
      </div>

      {sections.map((section) => (
        <table key={section.heading} className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1">{section.heading}</th>
              <th className="text-right py-1">Montant</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.label} className="border-b border-dashed border-black">
                <td className="py-1">{row.label}</td>
                <td className="text-right py-1">{formatFCFA(row.value)}</td>
              </tr>
            ))}
          </tbody>
          {section.total && (
            <tfoot>
              <tr className="border-t border-black">
                <td className="py-1 font-bold">{section.total.label}</td>
                <td className="text-right py-1 font-bold">{formatFCFA(section.total.value)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      ))}

      {grandTotal && (
        <div className="border-t-2 border-black pt-2 flex justify-between text-base">
          <span className="font-black">{grandTotal.label}</span>
          <span className="font-black">{formatFCFA(grandTotal.value)}</span>
        </div>
      )}

      <p className="text-[9px] text-center mt-6">
        Édité le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
