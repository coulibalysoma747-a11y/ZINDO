/**
 * Marque ZINDO générée en code (pas de fichier logo fourni pour le moment).
 * Carré navy arrondi + accent orange, cohérent avec l'identité visuelle
 * de la marque (orange vif / bleu marine).
 */
export function ZindoLogo({ size = 60, className }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-zindo-navy-900 shadow-lg shadow-zindo-navy-900/25 ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Logo ZINDO"
    >
      <span className="font-black text-white" style={{ fontSize: size * 0.46 }}>
        Z
      </span>
      <span
        className="absolute rounded-full bg-zindo-orange-500 ring-2 ring-white"
        style={{ width: size * 0.22, height: size * 0.22, right: -size * 0.04, top: -size * 0.04 }}
      />
    </div>
  );
}
