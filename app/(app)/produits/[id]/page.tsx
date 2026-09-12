import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, ArrowLeft } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getActivityConfig } from "@/lib/activity-config";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { ToggleActiveButton } from "./ToggleActiveButton";

const REASON_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  RETOUR_CLIENT: "Retour client",
  CORRECTION: "Correction",
  INVENTAIRE: "Inventaire",
  VENTE: "Vente",
  PRODUIT_ENDOMMAGE: "Produit endommagé",
  PERTE: "Perte",
  RETOUR_FOURNISSEUR: "Retour fournisseur",
  TRANSFERT: "Transfert",
  AUTRE: "Autre",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      category: true,
      supplier: true,
      stocks: { include: { location: true }, orderBy: { location: { name: "asc" } } },
    },
  });
  if (!product) notFound();

  const movements = await prisma.stockMovement.findMany({
    where: { productId: id },
    include: { user: true, location: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const currency = user.business.currency;
  const totalQuantity = product.stocks.reduce((s, st) => s + st.quantity, 0);

  const [canManageStock, canTransfer, canSell, activityConfig] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.TRANSFERS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    getActivityConfig(user.business.activityKey),
  ]);

  let customFieldValues: Record<string, string> = {};
  if (product.customFields) {
    try {
      customFieldValues = JSON.parse(product.customFields);
    } catch {
      customFieldValues = {};
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <ProductThumbnail photoUrl={product.photoUrl} name={product.name} size={72} rounded="rounded-2xl" />
          <div>
            <Link href="/produits" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
              <ArrowLeft className="h-4 w-4" /> Retour aux produits
            </Link>
            <h1 className="mt-1 text-xl font-bold text-zinc-900">{product.name}</h1>
            <p className="font-mono text-sm text-zinc-500">{product.reference}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ToggleActiveButton id={product.id} active={product.active} />
          <ButtonLink href={`/produits/${product.id}/modifier`} variant="outline">
            <Pencil className="h-4 w-4" /> Modifier
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Informations</h2>
            {totalQuantity <= 0 ? (
              <Badge tone="red">Rupture (toutes boutiques)</Badge>
            ) : totalQuantity <= product.minStock ? (
              <Badge tone="amber">Stock faible</Badge>
            ) : (
              <Badge tone="emerald">En stock</Badge>
            )}
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Info label="Catégorie" value={product.category?.name ?? "—"} />
            <Info label="Marque" value={product.brand ?? "—"} />
            <Info label="Unité" value={product.unit} />
            <Info label="Prix d'achat" value={formatMoney(product.purchasePrice, currency)} />
            <Info label="Prix de vente" value={formatMoney(product.salePrice, currency)} />
            <Info
              label="Marge unitaire"
              value={formatMoney(product.salePrice - product.purchasePrice, currency)}
            />
            <Info label="Stock total (toutes boutiques)" value={`${totalQuantity} ${product.unit}`} />
            <Info label="Stock minimum" value={`${product.minStock} ${product.unit}`} />
            <Info
              label="Valeur du stock"
              value={formatMoney(totalQuantity * product.purchasePrice, currency)}
            />
            <Info label="Emplacement en rayon" value={product.shelfLocation ?? "—"} />
            <Info label="Fournisseur" value={product.supplier?.name ?? "—"} />
            <Info label="Code-barres" value={product.barcode ?? "—"} />
            {activityConfig.customFields.map((def) =>
              customFieldValues[def.key] ? (
                <Info key={def.key} label={def.label} value={customFieldValues[def.key]} />
              ) : null
            )}
            {product.description && (
              <div className="col-span-full">
                <p className="text-zinc-400">Description</p>
                <p className="text-zinc-700">{product.description}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Actions rapides</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {canManageStock && (
              <>
                <ButtonLink href={`/stock/entree?produit=${product.id}`} variant="outline" className="w-full">
                  Entrée de stock
                </ButtonLink>
                <ButtonLink href={`/stock/sortie?produit=${product.id}`} variant="outline" className="w-full">
                  Sortie de stock
                </ButtonLink>
              </>
            )}
            {canTransfer && (
              <ButtonLink href={`/transferts?produit=${product.id}`} variant="outline" className="w-full">
                Transférer
              </ButtonLink>
            )}
            <ButtonLink href={`/produits/${product.id}/etiquette`} variant="outline" className="w-full">
              Imprimer étiquette
            </ButtonLink>
            {canSell && (
              <ButtonLink href={`/ventes?produit=${product.id}`} className="w-full">
                Vendre ce produit
              </ButtonLink>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Stock par boutique</h2>
        </CardHeader>
        <CardBody className="p-0">
          {product.stocks.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">Aucun stock enregistré dans une boutique.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Boutique</th>
                  <th className="px-4 py-2 text-right font-medium">Quantité</th>
                  <th className="px-4 py-2 text-right font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {product.stocks.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900">{s.location.name}</td>
                    <td className="px-4 py-2 text-right text-zinc-700">
                      {s.quantity} {product.unit}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {s.quantity <= 0 ? (
                        <Badge tone="red">Rupture</Badge>
                      ) : s.quantity <= product.minStock ? (
                        <Badge tone="amber">Faible</Badge>
                      ) : (
                        <Badge tone="emerald">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Derniers mouvements de stock</h2>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {movements.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">Aucun mouvement enregistré.</p>
          ) : (
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Boutique</th>
                  <th className="px-4 py-2 font-medium">Motif</th>
                  <th className="px-4 py-2 text-right font-medium">Quantité</th>
                  <th className="px-4 py-2 text-right font-medium">Stock avant → après</th>
                  <th className="px-4 py-2 font-medium">Utilisateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2 text-zinc-600">{formatDateTime(m.createdAt)}</td>
                    <td className="px-4 py-2 text-zinc-600">{m.location.name}</td>
                    <td className="px-4 py-2">
                      <Badge tone={m.direction === "IN" ? "emerald" : "red"}>
                        {REASON_LABELS[m.reason] ?? m.reason}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-700">
                      {m.direction === "IN" ? "+" : "-"}
                      {m.quantity}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">
                      {m.oldStock} → {m.newStock}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {m.user.firstName} {m.user.lastName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-400">{label}</p>
      <p className="font-medium text-zinc-900">{value}</p>
    </div>
  );
}
