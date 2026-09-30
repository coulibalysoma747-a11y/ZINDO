/**
 * Marque ZINDO — symbole « Z » (public/brand/zindo-logo.svg, choisi le 30/09/2026).
 * Les icônes dérivées (favicon, PWA…) se régénèrent via
 * `node scripts/generate-brand-assets.mjs` si ce fichier change.
 */
export function ZindoLogo({ size = 60, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG léger, net à toutes les tailles.
    <img src="/brand/zindo-logo.svg" alt="Logo ZINDO" width={size} height={size} className={`shrink-0 ${className ?? ""}`} style={{ width: size, height: size }} />
  );
}
