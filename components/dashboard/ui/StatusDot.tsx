
interface StatusDotProps {
  status: string;
}

const statusCfg: Record<string, { color: string; label: string; pulse: boolean }> = {
  departed:    { color: 'bg-emerald-400', label: 'En route',      pulse: true  },
  boarding:    { color: 'bg-orange-400',  label: 'Embarquement',  pulse: true  },
  scheduled:   { color: 'bg-blue-400',    label: 'Programmé',     pulse: false },
  arrived:     { color: 'bg-slate-500',   label: 'Arrivé',        pulse: false },
  cancelled:   { color: 'bg-red-400',     label: 'Annulé',        pulse: false },
};

export function StatusDot({ status }: StatusDotProps) {
  const cfg = statusCfg[status] || { color: 'bg-slate-500', label: status, pulse: false };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.color} ${cfg.pulse ? 'pulse-dot' : ''}`} />
      <span className={`text-xs font-medium ${cfg.pulse ? 'text-slate-300' : 'text-slate-500'}`}>
        {cfg.label}
      </span>
    </span>
  );
}
