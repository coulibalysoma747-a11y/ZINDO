import "server-only";
import QRCode from "qrcode";

/**
 * Génère le QR code une seule fois, à une résolution généreuse et fixe : la
 * taille *affichée* sur le ticket (réglable par le commerce, ou déduite du
 * format 58mm/80mm/A4) est appliquée ensuite en CSS par Receipt.tsx — pas
 * besoin de régénérer l'image quand l'utilisateur change de format à l'écran.
 */
export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#12172b", light: "#ffffff" },
  });
}
