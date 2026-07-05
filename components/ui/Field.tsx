'use client';

// Enveloppe un champ de formulaire avec un label (et une description optionnelle).
// Le <label> englobe l'input/select/textarea : association accessible sans avoir
// à gérer des `id` uniques sur chaque champ.
export function Field({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-400 mb-1 font-[family-name:var(--font-syne)]">
        {label}
      </span>
      {children}
      {description && (
        <span className="block text-[10px] text-slate-600 mt-1 font-normal normal-case">
          {description}
        </span>
      )}
    </label>
  );
}
