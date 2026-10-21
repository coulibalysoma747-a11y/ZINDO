import Image from "next/image";

/**
 * Emblème ZINDO : initiale Z en ivoire sur bleu nuit, avec une progression
 * cuivre. La source vectorielle sert aussi aux icônes et au favicon.
 */
export function ZindoLogo({ size = 60, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/zindo-emblem.svg"
      alt="Logo ZINDO"
      width={size}
      height={size}
      priority
      className={`shrink-0 rounded-2xl shadow-lg shadow-zindo-ink-900/25 ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
