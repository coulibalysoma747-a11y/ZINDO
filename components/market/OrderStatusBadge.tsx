const TONES: Record<string, string> = {
  RECUE: "bg-orange-100 text-orange-800",
  CONFIRMEE: "bg-sky-100 text-sky-800",
  PREPARATION: "bg-blue-100 text-blue-800",
  PRETE: "bg-violet-100 text-violet-800",
  EN_LIVRAISON: "bg-indigo-100 text-indigo-800",
  LIVREE: "bg-emerald-100 text-emerald-800",
  ANNULEE: "bg-red-100 text-red-700",
};

export function OrderStatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[status] ?? "bg-zinc-100 text-zinc-700"}`}>{label}</span>;
}
