import QRCode from "qrcode";

/**
 * Même rendu que lib/qrcode.ts (réservé au serveur), pour un QR fabriqué dans
 * le navigateur : ticket de la validation instantanée ou hors ligne, affiché
 * sans attendre le serveur (voir app/(app)/ventes/POS.tsx).
 */
export function generateQrDataUrlInBrowser(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#12172b", light: "#ffffff" },
  });
}
