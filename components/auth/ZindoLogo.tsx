import Image from "next/image";

/**
 * Marque ZINDO — logo fourni par l'utilisateur (public/brand/zindo-emblem.png,
 * recadré depuis public/brand/zindo-logo-full.jpeg). Régénérer les icônes
 * dérivées (favicon, PWA...) via `node scripts/generate-brand-assets.mjs`
 * si ce fichier change.
 */
export function ZindoLogo({ size = 60, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/zindo-emblem.png"
      alt="Logo ZINDO"
      width={size}
      height={size}
      priority
      className={`shrink-0 rounded-2xl shadow-lg shadow-zindo-ink-900/25 ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
