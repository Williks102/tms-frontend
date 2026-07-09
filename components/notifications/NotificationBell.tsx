'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useNotifications, useUnreadNotificationCount } from '@/hooks/useNotifications';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: countData, mutate: mutateCount } = useUnreadNotificationCount();
  const { data, mutate } = useNotifications({ per_page: '10' });
  const notifications = data?.data ?? [];
  const unread = countData?.count ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' } as RequestInit);
      mutate();
      mutateCount();
    } catch {
      // silencieux
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' } as RequestInit);
      mutate();
      mutateCount();
    } catch {
      // silencieux
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-1.5 text-slate-400 hover:text-white"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-[#0A1020] shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/60">
            <p className="text-xs font-bold text-white font-[family-name:var(--font-syne)]">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                Tout marquer lu
              </button>
            )}
          </div>
          {!notifications.length ? (
            <p className="text-slate-600 text-xs text-center py-8">Aucune notification</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read_at && markRead(n.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-800/40 ${!n.read_at ? 'bg-indigo-500/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                    {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
