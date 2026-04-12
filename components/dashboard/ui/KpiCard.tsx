
interface KpiCardProps {
  label:     string;
  value:     number | string;
  unit?:     string;
  icon:      string;
  color:     string;      // Tailwind color name: blue, green, orange, red...
  trend?:    string;
  className?: string;
}

const colorMap: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  blue:   { border: 'border-t-blue-500',   glow: 'shadow-blue-500/10',   text: 'text-blue-400',   bg: 'bg-blue-500/5'   },
  green:  { border: 'border-t-emerald-500', glow: 'shadow-emerald-500/10',text: 'text-emerald-400', bg: 'bg-emerald-500/5' },
  orange: { border: 'border-t-orange-500',  glow: 'shadow-orange-500/10', text: 'text-orange-400',  bg: 'bg-orange-500/5'  },
  red:    { border: 'border-t-red-500',     glow: 'shadow-red-500/10',    text: 'text-red-400',     bg: 'bg-red-500/5'     },
  purple: { border: 'border-t-purple-500',  glow: 'shadow-purple-500/10', text: 'text-purple-400',  bg: 'bg-purple-500/5'  },
  yellow: { border: 'border-t-yellow-500',  glow: 'shadow-yellow-500/10', text: 'text-yellow-400',  bg: 'bg-yellow-500/5'  },
};

export function KpiCard({ label, value, unit, icon, color, trend, className = '' }: KpiCardProps) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`
      bg-[#080D1A] border border-slate-800/60 border-t-2 ${c.border}
      rounded-xl p-4 shadow-lg ${c.glow} ${className}
    `}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className={`text-3xl font-bold ${c.text} font-[family-name:var(--font-syne)]`}>
          {value}
        </span>
        {unit && <span className="text-slate-500 text-xs mb-1">{unit}</span>}
      </div>
      {trend && (
        <p className="text-xs text-slate-600 mt-1.5">{trend}</p>
      )}
    </div>
  );
}


// components/dashboard/AlertBadge.tsx
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