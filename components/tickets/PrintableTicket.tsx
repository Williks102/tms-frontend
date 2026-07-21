'use client';

import { Ticket } from '@/hooks/useTickets';
import { APP_FULL_NAME } from '@/lib/branding';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

const CHANNEL_LABEL: Record<string, string> = { physical: 'Guichet', online: 'En ligne' };

// Rendu papier — pas de thème sombre ici, toujours noir sur blanc pour l'impression.
export function PrintableTicket({ ticket, qrDataUrl }: { ticket: Ticket; qrDataUrl: string }) {
  return (
    <div className="bg-white text-black w-[380px] mx-auto p-8 font-sans">
      <div className="text-center border-b-2 border-black pb-3 mb-3">
        <p className="text-lg font-black tracking-wide uppercase">{APP_FULL_NAME}</p>
        <p className="text-xs">Billet de transport</p>
      </div>

      <div className="text-center mb-3">
        <p className="text-2xl font-black">{ticket.departure?.route.code ?? '—'}</p>
        <p className="text-sm">{ticket.departure?.route.name ?? `Départ #${ticket.departure_id}`}</p>
      </div>

      <div className="space-y-1 text-sm border-y border-dashed border-black py-3 mb-3">
        <div className="flex justify-between"><span>Référence</span><span className="font-mono font-bold">{ticket.reference}</span></div>
        <div className="flex justify-between"><span>Passager</span><span className="font-bold">{ticket.passenger_name}</span></div>
        {ticket.departure && (
          <>
            <div className="flex justify-between"><span>Destination</span><span className="font-bold">{ticket.destination_stop?.city_name ?? ticket.departure.route.destination_city}</span></div>
            <div className="flex justify-between"><span>Date</span><span>{formatDate(ticket.departure.departure_datetime)}</span></div>
            <div className="flex justify-between"><span>Heure</span><span className="font-bold">{formatTime(ticket.departure.departure_datetime)}</span></div>
            {ticket.departure.boarding_gate && (
              <div className="flex justify-between"><span>Quai</span><span className="font-bold">{ticket.departure.boarding_gate}</span></div>
            )}
          </>
        )}
        <div className="flex justify-between"><span>Siège</span><span>{ticket.seat_number ?? 'Non assigné'}</span></div>
        <div className="flex justify-between"><span>Canal</span><span>{CHANNEL_LABEL[ticket.channel] ?? ticket.channel}</span></div>
        <div className="flex justify-between text-base pt-1"><span className="font-bold">Prix</span><span className="font-black">{formatFCFA(ticket.price_fcfa)}</span></div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR code du billet" width={160} height={160} />
        <p className="text-[10px] text-center">Présentez ce QR code à l&apos;embarquement</p>
      </div>

      <p className="text-[9px] text-center mt-4">
        Billet émis le {formatDate(ticket.purchased_at)} à {formatTime(ticket.purchased_at)}
      </p>
    </div>
  );
}
