// lib/qrcode.ts — Génération de QR code côté client (aucun appel réseau)
import QRCode from 'qrcode';

export async function generateTicketQrCode(reference: string): Promise<string> {
  return QRCode.toDataURL(reference, {
    width: 240,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
