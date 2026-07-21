'use client';

import { useState, useMemo } from 'react';
import { usePublicRoutes, usePublicDepartures, PAYMENT_CHANNELS } from '@/hooks/usePublicTickets';
import { apiFetchPublic, formatFCFA, PublicRoute } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { Ticket } from '@/hooks/useTickets';
import { APP_FULL_NAME } from '@/lib/branding';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export default function BilletsPage() {
  const { data: routesData, isLoading: routesLoading } = usePublicRoutes();
  const routes = routesData?.data ?? [];

  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [selectedDepartureId, setSelectedDepartureId] = useState<number | null>(null);
  const [destinationStopId, setDestinationStopId] = useState<string>('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [paymentChannel, setPaymentChannel] = useState<string>(PAYMENT_CHANNELS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: departuresData, isLoading: departuresLoading } = usePublicDepartures(selectedRouteId, date);
  const departures = departuresData?.data ?? [];

  const selectedRoute: PublicRoute | null = useMemo(
    () => routes.find(r => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const selectedStop = selectedRoute?.stops.find(s => String(s.id) === destinationStopId) ?? null;
  const price = selectedStop?.fare_from_origin ?? selectedRoute?.base_fare ?? 0;

  const handleSelectRoute = (routeId: number) => {
    setSelectedRouteId(routeId);
    setSelectedDepartureId(null);
    setDestinationStopId('');
  };

  const handleSubmit = async () => {
    if (!selectedDepartureId || !passengerName.trim() || !passengerPhone.trim() || !passengerEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // Le prix n'est jamais envoyé par le client — toujours recalculé côté
      // serveur depuis route.base_fare / route_stops.fare_from_origin, pour
      // qu'un visiteur ne puisse pas falsifier le tarif à l'achat.
      const result = await apiFetchPublic<{ ticket: Ticket; payment_url: string }>('/tickets/online', {
        method: 'POST',
        body: JSON.stringify({
          departure_id: selectedDepartureId,
          destination_stop_id: destinationStopId ? Number(destinationStopId) : null,
          passenger_name: passengerName,
          passenger_phone: passengerPhone,
          passenger_email: passengerEmail,
          payment_channel: paymentChannel,
        }),
      });
      // Quitte l'app pour la page de paiement hébergée PaiementPro — la
      // confirmation se fait ensuite sur /billets/retour (voir returnURL
      // côté backend, PaiementProService::initPayment()).
      window.location.href = result.payment_url;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'achat');
      setSubmitting(false);
    }
  };

  // ── Flux d'achat ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060A14] p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 pt-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-[family-name:var(--font-syne)]">{APP_FULL_NAME}</p>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mt-1">
            Achetez votre billet en ligne
          </h1>
        </div>

        {/* Étape 1 — Ligne */}
        <section className="mb-6">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
            1. Choisissez votre ligne
          </p>
          {routesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {routes.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRoute(r.id)}
                  className={`text-left p-4 rounded-xl border transition-all
                    ${selectedRouteId === r.id
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-[#080D1A] border-slate-800/60 hover:border-slate-700'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">{r.origin_city}</span>
                    <span className="text-slate-600 text-xs">→</span>
                    <span className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">{r.destination_city}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{durationLabel(r.estimated_duration_min)}</span>
                    <span>·</span>
                    <span className="text-emerald-400 font-[family-name:var(--font-mono)]">{formatFCFA(r.base_fare)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Étape 2 — Date + départ */}
        {selectedRoute && (
          <section className="mb-6">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
              2. Choisissez votre départ
            </p>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => { setDate(e.target.value); setSelectedDepartureId(null); }}
              className="input mb-3"
            />
            {departuresLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
            ) : departures.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">Aucun départ disponible à cette date pour cette ligne</p>
            ) : (
              <div className="space-y-2">
                {departures.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDepartureId(d.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all
                      ${selectedDepartureId === d.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-[#080D1A] border-slate-800/60 hover:border-slate-700'}`}
                  >
                    <span className="text-base font-bold text-white font-[family-name:var(--font-mono)]">{formatTime(d.departure_datetime)}</span>
                    <span className="text-xs text-slate-500">{d.seats_available} place{d.seats_available > 1 ? 's' : ''} restante{d.seats_available > 1 ? 's' : ''}</span>
                    {d.boarding_gate && <span className="text-[11px] text-blue-400 font-[family-name:var(--font-mono)]">{d.boarding_gate}</span>}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Étape 3 — Destination (lignes dynamiques uniquement) */}
        {selectedDepartureId && selectedRoute?.is_dynamic && selectedRoute.stops.length > 0 && (
          <section className="mb-6">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
              3. Votre destination
            </p>
            <select className="input" value={destinationStopId} onChange={(e) => setDestinationStopId(e.target.value)}>
              <option value="">{selectedRoute.destination_city} (terminus) — {formatFCFA(selectedRoute.base_fare)}</option>
              {selectedRoute.stops.map(s => (
                <option key={s.id} value={s.id}>{s.city_name} — {formatFCFA(s.fare_from_origin)}</option>
              ))}
            </select>
          </section>
        )}

        {/* Étape 4 — Informations passager */}
        {selectedDepartureId && (
          <section className="bg-[#080D1A] border border-slate-800/60 rounded-xl p-4 space-y-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1 font-[family-name:var(--font-syne)]">
              4. Vos informations
            </p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Field label="Nom complet">
              <input className="input" placeholder="Koffi N'Guessan" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} />
            </Field>
            <Field label="Téléphone" description="Pour la confirmation de votre billet">
              <input className="input" placeholder="+225 07 00 00 00 00" value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} />
            </Field>
            <Field label="Email" description="Pour le paiement en ligne">
              <input type="email" className="input" placeholder="vous@exemple.com" value={passengerEmail} onChange={(e) => setPassengerEmail(e.target.value)} />
            </Field>
            <Field label="Moyen de paiement">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PAYMENT_CHANNELS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPaymentChannel(c.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all
                      ${paymentChannel === c.value
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-500">Total à payer</span>
              <span className="text-xl font-bold text-emerald-400 font-[family-name:var(--font-syne)]">{formatFCFA(price)}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !passengerName.trim() || !passengerPhone.trim() || !passengerEmail.trim()}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Redirection vers le paiement...' : `Payer ${formatFCFA(price)}`}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
