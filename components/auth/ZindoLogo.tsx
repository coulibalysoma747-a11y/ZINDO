import Image from "next/image";

/** Symbole ZINDO. Les icônes PWA sont dérivées de public/brand/zindo-emblem.svg. */
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
