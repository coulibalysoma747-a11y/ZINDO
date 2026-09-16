import { formatMoney } from "@/lib/format";

const WIDTH = 600;
const HEIGHT = 160;
const PAD_LEFT = 8;
const PAD_RIGHT = 60;
const PAD_TOP = 20;
const PAD_BOTTOM = 24;
// Vert de la palette catégorielle validée (accessible en clair/sombre) —
// voir la skill dataviz — plutôt que le vert de marque de ZINDO, non
// re-validé pour cet usage précis.
const LINE_COLOR = "#008300";

/**
 * Évolution du CA sur les 7 derniers jours — une seule série, donc pas de
 * légende (le titre de la carte suffit à l'identifier). Valeurs déjà
 * calculées côté serveur par getDashboardData (lib/actions/dashboard.ts),
 * réutilisées ici sans requête supplémentaire.
 */
export function RevenueTrendChart({ values, currency }: { values: number[]; currency: string }) {
  const max = Math.max(1, ...values);
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = values.length > 1 ? plotWidth / (values.length - 1) : 0;

  const points = values.map((v, i) => ({
    x: PAD_LEFT + i * stepX,
    y: PAD_TOP + plotHeight - (v / max) * plotHeight,
    value: v,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${PAD_TOP + plotHeight} L${points[0].x.toFixed(1)},${PAD_TOP + plotHeight} Z`;

  const today = new Date();
  const dayLabels = values.map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (values.length - 1 - i));
    return d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
  });

  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Évolution du chiffre d'affaires sur les 7 derniers jours">
      {/* Ligne de base (hairline, recessive) */}
      <line x1={PAD_LEFT} y1={PAD_TOP + plotHeight} x2={WIDTH - PAD_RIGHT} y2={PAD_TOP + plotHeight} stroke="#e1e0d9" strokeWidth={1} />

      <path d={areaPath} fill={LINE_COLOR} opacity={0.1} stroke="none" />
      <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 3} fill={LINE_COLOR} stroke="#fcfcfb" strokeWidth={2}>
          <title>
            {dayLabels[i]} — {formatMoney(p.value, currency)}
          </title>
        </circle>
      ))}

      {/* Étiquette directe : valeur au dernier point, comme prescrit pour une ligne.
          Ancrée au bord droit (plutôt qu'à la suite du point) pour qu'un gros
          montant ne sorte jamais du viewBox — jamais tronquée, quelle que
          soit sa longueur. */}
      <text x={WIDTH - 4} y={Math.max(last.y + 4, PAD_TOP)} fontSize={12} fontWeight={600} textAnchor="end" fill="#0b0b0b">
        {formatMoney(last.value, currency)}
      </text>

      {dayLabels.map((label, i) => (
        <text key={i} x={points[i].x} y={HEIGHT - 6} fontSize={10} textAnchor="middle" fill="#898781">
          {label}
        </text>
      ))}
    </svg>
  );
}
