import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { isDocumentEnabled, loadDocBusiness, printedByName } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable } from "@/components/documents/A4Document";
import { DocChips, DocToolbar } from "@/components/documents/DocToolbar";

type InventoryRow = {
  id: string;
  reference: string;
  createdAt: string;
  validatedAt: string | null;
  status: string;
  note: string | null;
  location: { name: string };
  user: { firstName: string; lastName: string };
  items: Array<{
    id: string;
    theoreticalQty: number;
    realQty: number;
    difference: number;
    product: { name: string; reference: string; purchasePrice: number };
  }>;
};

/** Rapport d'inventaire (flag « pdf_inventaire ») : écarts en quantité et en valeur d'achat. */
export default async function InventoryDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tout?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);
  if (!(await isDocumentEnabled("pdf_inventaire", user.businessId))) notFound();
  const { id } = await params;
  const all = (await searchParams).tout === "1";

  const [business, zindoMention, { data }] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    supabase
      .from("inventories")
      .select(
        "id, reference, createdAt:created_at, validatedAt:validated_at, status, note, location:locations(name), user:users(firstName:first_name, lastName:last_name), " +
          "items:inventory_items(id, theoreticalQty:theoretical_qty, realQty:real_qty, difference, product:products(name, reference, purchasePrice:purchase_price))"
      )
      .eq("id", id)
      .eq("business_id", user.businessId)
      .maybeSingle(),
  ]);
  if (!business || !data) notFound();
  const inventory = data as unknown as InventoryRow;
  const money = (v: number) => formatMoney(v, business.currency);

  const items = [...inventory.items].sort((a, b) => a.product.name.localeCompare(b.product.name, "fr"));
  const withGap = items.filter((i) => i.difference !== 0);
  const missingValue = withGap.filter((i) => i.difference < 0).reduce((s, i) => s + -i.difference * i.product.purchasePrice, 0);
  const surplusValue = withGap.filter((i) => i.difference > 0).reduce((s, i) => s + i.difference * i.product.purchasePrice, 0);
  const shown = all ? items : withGap;
  const validated = inventory.status === "VALIDE";

  return (
    <div>
      <DocToolbar backHref={`/inventaire/${id}`} backLabel="Retour à l'inventaire">
        <DocChips
          items={[
            { label: "Écarts seulement", href: `/inventaire/${id}/document`, active: !all },
            { label: "Tous les produits comptés", href: `/inventaire/${id}/document?tout=1`, active: all },
          ]}
        />
      </DocToolbar>
      <A4Document
        business={business}
        title="RAPPORT D'INVENTAIRE"
        meta={[
          `N° ${inventory.reference}`,
          `${inventory.location.name} · ${formatDateTime(new Date(inventory.createdAt))}`,
          validated
            ? `Validé${inventory.validatedAt ? ` le ${formatDateTime(new Date(inventory.validatedAt))}` : ""}`
            : "En cours (non validé)",
        ]}
        stats={[
          { label: "Produits comptés", value: String(items.length) },
          { label: "Produits avec écart", value: String(withGap.length) },
          { label: "Manquants (valeur d'achat)", value: money(missingValue) },
          { label: "Écart net", value: money(surplusValue - missingValue), strong: true },
        ]}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
        signatures={[
          { label: "Inventaire réalisé par", name: `${inventory.user.firstName} ${inventory.user.lastName}`.trim() },
          { label: "Vérifié et approuvé par", name: business.signerName },
        ]}
      >
        {inventory.note && <p className="mt-4 text-xs">Remarque : {inventory.note}</p>}
        <DocSection title={all ? "Produits comptés" : "Écarts constatés"}>
          <DocTable
            empty="Aucun écart : le stock compté correspond au stock enregistré."
            columns={[
              { label: "Réf." },
              { label: "Désignation" },
              { label: "Théorique", align: "right" },
              { label: "Compté", align: "right" },
              { label: "Écart", align: "right" },
              { label: "P.A.", align: "right" },
              { label: "Valeur de l'écart", align: "right" },
            ]}
            rows={[
              ...shown.map((i) => ({
                key: i.id,
                cells: [
                  <span key="r" className="font-mono">{i.product.reference}</span>,
                  i.product.name,
                  i.theoreticalQty,
                  i.realQty,
                  <span key="e" className={i.difference !== 0 ? "font-bold" : ""}>
                    {i.difference > 0 ? `+${i.difference}` : i.difference}
                  </span>,
                  money(i.product.purchasePrice),
                  i.difference === 0 ? "—" : money(i.difference * i.product.purchasePrice),
                ],
              })),
              ...(shown.length
                ? [{ cells: ["", "Total", "", "", "", "", money(surplusValue - missingValue)], bold: true }]
                : []),
            ]}
          />
        </DocSection>
        <p className="mt-3 text-[10px] text-zinc-500">
          Valeurs calculées au prix d&apos;achat actuel de chaque produit. Écart négatif : produit manquant ; positif : produit en trop.
        </p>
      </A4Document>
    </div>
  );
}
