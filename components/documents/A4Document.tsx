/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */
import type { ReactNode } from "react";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { FitToWidth } from "@/components/purchase-orders/FitToWidth";

export type DocBusiness = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  currency: string;
  ifu: string | null;
  rccm: string | null;
  mobileMoneyInfo: string | null;
  signerName: string | null;
};

/**
 * Habillage commun des documents A4 de gestion (lib/documents.ts) : même
 * présentation que le bon de commande et le relevé client, en noir et blanc
 * pour rester lisible sur une imprimante bas de gamme ou une photocopie.
 */
export function A4Document({
  business,
  title,
  meta,
  party,
  stats,
  children,
  signatures,
  printedAt,
  printedBy,
  zindoMention,
}: {
  business: DocBusiness;
  title: string;
  /** Lignes sous le titre (N°, date, période…). */
  meta?: ReactNode[];
  /** Encadré « Client », « Fournisseur », « Boutique »… */
  party?: { label: string; name: string; lines?: (string | null | undefined)[] };
  stats?: { label: string; value: string; strong?: boolean }[];
  children: ReactNode;
  signatures?: { label: string; name?: string | null }[];
  printedAt: Date;
  printedBy: string;
  zindoMention: boolean;
}) {
  return (
    <FitToWidth>
      <div className="w-[210mm] bg-white p-8 text-zinc-900 shadow-sm print:w-full print:p-0 print:shadow-none">
        <style>{`@page { size: A4; margin: 12mm; } @media print { thead { display: table-header-group; } }`}</style>

        <div className="flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-4">
          <div className="flex gap-3">
            {business.logoUrl && <img src={business.logoUrl} alt="" className="h-16 w-16 object-contain" />}
            <div className="text-xs leading-relaxed">
              <p className="text-lg font-bold uppercase">{business.name}</p>
              {business.address && <p>{business.address}</p>}
              {business.city && <p>{business.city}</p>}
              {business.phone && <p>Tél : {business.phone}</p>}
              {business.ifu && <p>IFU : {business.ifu}</p>}
              {business.rccm && <p>RCCM : {business.rccm}</p>}
            </div>
          </div>
          <div className="text-right text-xs leading-relaxed">
            <p className="text-xl font-extrabold tracking-wide">{title}</p>
            <p>Édité le {formatLongDate(printedAt)}</p>
            {meta?.map((line, i) => (
              <p key={i} className="font-semibold">
                {line}
              </p>
            ))}
          </div>
        </div>

        {party && (
          <div className="mt-4 rounded-lg border border-zinc-300 p-3 text-xs">
            <p className="mb-1 font-semibold uppercase text-zinc-500">{party.label}</p>
            <p className="text-sm font-bold">{party.name}</p>
            {party.lines?.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
          </div>
        )}

        {stats && stats.length > 0 && (
          <div className={`mt-4 grid gap-3 text-xs ${stats.length >= 4 ? "grid-cols-4" : stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {stats.map((s) => (
              <div key={s.label} className={`rounded-lg p-3 ${s.strong ? "border-2 border-zinc-900" : "border border-zinc-300"}`}>
                <p className={s.strong ? "font-semibold uppercase" : "text-zinc-500"}>{s.label}</p>
                <p className={`mt-1 font-bold ${s.strong ? "text-lg font-extrabold" : "text-base"}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {children}

        {signatures && signatures.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
            {signatures.length === 1 && <div />}
            {signatures.map((s) => (
              <div key={s.label}>
                <p className="font-semibold">{s.label}</p>
                {s.name && <p className="text-zinc-500">{s.name}</p>}
                <div className="mt-10 border-t border-zinc-400" />
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-[10px] text-zinc-500">
          Document édité le {formatDateTime(printedAt)} par {printedBy}
          {zindoMention && " · Géré avec ZINDO · zindo.site"}
        </p>
      </div>
    </FitToWidth>
  );
}

/** Titre de section d'un document A4. */
export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <p className="text-sm font-bold uppercase">{title}</p>
      {children}
    </div>
  );
}

export type DocColumn = { label: string; align?: "left" | "right" | "center"; className?: string };
export type DocRow =
  | { cells: ReactNode[]; bold?: boolean; key?: string }
  /** Ligne de regroupement (ex. une catégorie) sur toute la largeur. */
  | { group: string; key?: string };

/** Tableau de document : en-tête gris répété sur chaque page, montants à droite. */
export function DocTable({ columns, rows, empty = "Aucune ligne." }: { columns: DocColumn[]; rows: DocRow[]; empty?: string }) {
  if (rows.length === 0) return <p className="mt-2 text-xs text-zinc-500">{empty}</p>;
  const align = (a?: DocColumn["align"]) => (a === "right" ? "text-right tabular-nums" : a === "center" ? "text-center" : "text-left");
  return (
    <table className="mt-2 w-full border-collapse text-xs">
      <thead>
        <tr className="bg-zinc-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
          {columns.map((c) => (
            <th key={c.label} className={`border border-zinc-900 px-2 py-1.5 ${align(c.align)} ${c.className ?? ""}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) =>
          "group" in row ? (
            <tr key={row.key ?? i} className="break-inside-avoid">
              <td
                colSpan={columns.length}
                className="border border-zinc-300 bg-zinc-50 px-2 py-1.5 font-bold uppercase"
                style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
              >
                {row.group}
              </td>
            </tr>
          ) : (
            <tr key={row.key ?? i} className={`break-inside-avoid ${row.bold ? "font-bold" : ""}`}>
              {row.cells.map((cell, j) => (
                <td key={j} className={`border border-zinc-300 px-2 py-1.5 ${align(columns[j]?.align)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}
