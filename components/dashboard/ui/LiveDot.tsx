'use client';
import { useState, useEffect } from 'react';

interface LiveDotProps {
  lastUpdate?: string;
}

export function LiveDot({ lastUpdate }: LiveDotProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      if (lastUpdate) {
        const d = new Date(lastUpdate);
        setTime(d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
      <span className="text-xs text-slate-500 font-[family-name:var(--font-mono)]">
        LIVE {time && `· ${time}`}
      </span>
    </div>
  );
}
