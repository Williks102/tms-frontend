
interface AlertBadgeProps {
  severity: 'critical' | 'warning' | 'info';
  children: React.ReactNode;
}

export function AlertBadge({ severity, children }: AlertBadgeProps) {
  const cfg = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    warning:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
    info:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  }[severity];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${cfg}`}>
      {children}
    </span>
  );
}