// lib/branding.ts
//
// Identité visuelle configurable par déploiement — chaque compagnie cliente
// a son propre déploiement Railway+Vercel isolé (voir "revente SaaS, option
// B" discutée avec l'utilisateur), donc son propre nom sans toucher au code.
// Variables NEXT_PUBLIC_* : lues au build ET disponibles côté client, comme
// NEXT_PUBLIC_API_URL déjà utilisé dans lib/api.ts.
export const APP_NAME       = process.env.NEXT_PUBLIC_APP_NAME       || 'TMS';
export const APP_REGION     = process.env.NEXT_PUBLIC_APP_REGION     || "Côte d'Ivoire";
export const APP_SHORT_CODE = process.env.NEXT_PUBLIC_APP_SHORT_CODE || 'TMS-CI';
export const APP_FULL_NAME  = `${APP_NAME} — ${APP_REGION}`;
