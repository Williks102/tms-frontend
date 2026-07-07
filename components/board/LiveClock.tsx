'use client';
import { useState, useEffect } from 'react';

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right font-[family-name:var(--font-mono)]">
      <div className="text-4xl text-slate-100 tabular-nums">
        {now ? now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
      </div>
      <div className="text-sm text-slate-500 capitalize">
        {now ? now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
      </div>
    </div>
  );
}
