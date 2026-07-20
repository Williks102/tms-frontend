// hooks/useMyPurchases.ts
'use client';

import { useCallback, useState } from 'react';
import { apiFetchPublic } from '@/lib/api';
import { PublicParcelTracking } from './useColis';

export interface MyPurchaseTicket {
  reference:          string;
  status:              'pending' | 'paid' | 'boarded' | 'cancelled' | 'refunded';
  channel:             'physical' | 'online';
  price_fcfa:          number;
  seat_number:         number | null;
  purchased_at:        string | null;
  route: { code: string; origin_city: string; destination_city: string } | null;
  departure_datetime:  string | null;
}

export interface MyPurchases {
  tickets: MyPurchaseTicket[];
  parcels: PublicParcelTracking[];
}

// Recherche one-shot, pas de SWR : le jeton Turnstile est à usage unique côté
// Cloudflare, donc une recherche n'a aucune valeur de cache (elle ne peut par
// construction jamais être rejouée avec la même clé). search(phone, token)
// consomme les deux atomiquement au moment de l'appel — jamais en réaction à
// un changement d'état découplé (voir piège corrigé dans TurnstileWidget.tsx :
// une version précédente dérivait la clé SWR du jeton, provoquant une boucle
// infinie de re-recherches à chaque renouvellement de jeton).
export function useMyPurchases() {
  const [data, setData] = useState<MyPurchases | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(async (phone: string, turnstileToken: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/mes-achats?phone=${encodeURIComponent(phone)}${turnstileToken ? `&turnstile_token=${encodeURIComponent(turnstileToken)}` : ''}`;
      const result = await apiFetchPublic<MyPurchases>(url);
      setData(result);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, error, isLoading, search };
}
