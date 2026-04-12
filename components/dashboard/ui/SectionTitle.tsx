
interface SectionTitleProps {
  children: React.ReactNode;
  sub?: string;
  action?: React.ReactNode;
}

export function SectionTitle({ children, sub, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-[family-name:var(--font-syne)]">
          {children}
        </h2>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}