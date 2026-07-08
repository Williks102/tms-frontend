'use client';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

export interface PrintableVoucherProps {
  title:         string; // "Bon de sortie de caisse" / "Bon carburant"...
  reference:     string;
  date:          string; // ISO
  amount:        number;
  motif:         string;
  tiersLabel?:   string; // "Bénéficiaire", "Station"...
  tiersValue?:   string | null;
  extraRows?:    { label: string; value: string }[];
  issuedByName?: string | null;
  qrDataUrl:     string;
}

// Rendu papier générique — pas de thème sombre ici, toujours noir sur blanc
// pour l'impression. Réutilisé pour les bons de caisse ET les bons carburant.
export function PrintableVoucher({
  title, reference, date, amount, motif, tiersLabel, tiersValue, extraRows, issuedByName, qrDataUrl,
}: PrintableVoucherProps) {
  return (
    <div className="bg-white text-black w-[380px] mx-auto p-8 font-sans">
      <div className="text-center border-b-2 border-black pb-3 mb-3">
        <p className="text-lg font-black tracking-wide">TMS — CÔTE D&apos;IVOIRE</p>
        <p className="text-xs">{title}</p>
      </div>

      <div className="text-center mb-3">
        <p className="text-2xl font-black">{reference}</p>
      </div>

      <div className="space-y-1 text-sm border-y border-dashed border-black py-3 mb-3">
        <div className="flex justify-between"><span>Date</span><span className="font-bold">{formatDate(date)}</span></div>
        <div className="flex justify-between gap-4"><span>Motif</span><span className="font-bold text-right">{motif}</span></div>
        {tiersValue && (
          <div className="flex justify-between"><span>{tiersLabel ?? 'Tiers'}</span><span className="font-bold">{tiersValue}</span></div>
        )}
        {extraRows?.map((row) => (
          <div key={row.label} className="flex justify-between"><span>{row.label}</span><span>{row.value}</span></div>
        ))}
        <div className="flex justify-between text-base pt-1"><span className="font-bold">Montant</span><span className="font-black">{formatFCFA(amount)}</span></div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code ${reference}`} width={160} height={160} />
      </div>

      {issuedByName && (
        <p className="text-[9px] text-center mt-4">Émis par {issuedByName}</p>
      )}

      <div className="mt-8 flex justify-between text-[10px]">
        <div className="w-1/2 text-center pr-2"><p className="border-t border-black pt-1">Signature émetteur</p></div>
        <div className="w-1/2 text-center pl-2"><p className="border-t border-black pt-1">Signature bénéficiaire</p></div>
      </div>
    </div>
  );
}
