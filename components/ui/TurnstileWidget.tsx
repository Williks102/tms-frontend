// components/ui/TurnstileWidget.tsx
'use client';

import { forwardRef, useCallback, useId, useImperativeHandle, useRef } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

// Source unique de vérité pour "le CAPTCHA est-il actif ?" — importé à la
// fois par ce composant et par les pages qui l'utilisent, pour ne jamais
// diverger (piège rencontré en review : deux lectures indépendantes de la
// même variable d'env pouvaient désynchroniser bouton et widget).
export const TURNSTILE_ENABLED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export interface TurnstileWidgetHandle {
  // Obtenir un nouveau jeton après consommation du précédent (usage unique
  // côté Cloudflare) — réutilise le même widget/iframe, contrairement à un
  // remount complet (voir piège corrigé ci-dessous).
  reset: () => void;
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

// CAPTCHA invisible Cloudflare Turnstile — voir correctif.md point 7 et
// Services/Security/TurnstileService (backend). Bloque l'énumération
// automatisée sur les endpoints publics sans dépendre d'un fournisseur
// SMS/email. Ne rend rien si NEXT_PUBLIC_TURNSTILE_SITE_KEY n'est pas
// configuré (dev local sans compte Cloudflare) — le backend applique le même
// repli gracieux.
//
// ⚠️ Piège corrigé (review du 12/07/2026) : une première version exposait un
// jeton à usage unique et demandait au parent de remonter ce composant (prop
// `key`) pour en obtenir un nouveau. Combiné à un état "jeton" faisant partie
// de la clé de requête côté appelant, ça provoquait une boucle infinie
// (chaque reset de jeton changeait la clé → refetch → nouveau jeton → refetch
// → ...), invisible en dev (aucune clé configurée, jeton toujours null). Ce
// composant expose maintenant un handle impératif (`ref.current.reset()`) :
// le même widget/iframe est réutilisé, le parent contrôle explicitement
// QUAND consommer un jeton (au submit), jamais en réaction à un changement
// d'état découplé.
export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken }, ref) {
    const containerId = `turnstile-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const widgetId = useRef<string | null>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    const renderWidget = useCallback(() => {
      if (!siteKey || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(`#${containerId}`, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    }, [siteKey, containerId, onToken]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (widgetId.current && window.turnstile) {
            window.turnstile.reset(widgetId.current);
          }
        },
      }),
      []
    );

    if (!siteKey) return null;

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onReady={renderWidget}
        />
        <div id={containerId} />
      </>
    );
  }
);
