// lib/qrcode.ts — Génération de QR code côté client (aucun appel réseau)
import QRCode from 'qrcode';

export async function generateTicketQrCode(reference: string): Promise<string> {
  return generateQrCode(reference);
}

// Générique — réutilisé par les pièces comptables imprimables (bons de
// caisse, bons carburant) en plus des billets.
export async function generateQrCode(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    width: 240,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
