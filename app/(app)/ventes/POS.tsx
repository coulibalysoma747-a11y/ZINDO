"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, Plus, Minus, UserPlus, Search, Loader2, Wallet, Lock, WifiOff, RefreshCw } from "lucide-react";
import { ProductGrid, type PosProduct, type PackagingUnitOption } from "@/components/products/ProductGrid";
import { BarcodeScannerButton } from "@/components/products/BarcodeScannerButton";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatMoney, formatDateTime } from "@/lib/format";
import { createSaleAction } from "@/lib/actions/sales";
import { getSaleDocumentAction, type SaleDocument } from "@/lib/actions/receipt";
import { getPosProductsAction, findProductByExactCodeAction } from "@/lib/actions/product-search";
import { ClientFormModal } from "@/app/(app)/clients/ClientFormModal";
import { Modal } from "@/components/ui/Modal";
import { PosSettingsButton } from "./PosSettingsButton";
import { PrinterSettingsButton } from "./PrinterSettingsButton";
import { ReceiptPrintPanel } from "./ReceiptPrintPanel";
import type { PaymentMethod } from "@/lib/db-types";
import type { ReceiptWidth } from "@/components/sales/Receipt";
import {
  cacheOfflineSnapshot,
  getCachedSnapshot,
  decrementCachedStock,
  queueOfflineSale,
  getPendingSales,
  type CachedBusinessInfo,
  type PendingSale,
} from "@/lib/offline/db";
import { syncPendingSales } from "@/lib/offline/sync";
import { buildOfflineDocument } from "@/lib/offline/build-document";
import { getAvailableVehicleUnitsAction } from "@/lib/actions/vehicle-units";

type CartLine = {
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  discount: number;
  /** Exemplaire précis (moto/engin à suivi unitaire) — jamais fusionné avec une autre ligne. */
  vehicleUnitId?: string;
  chassisNumber?: string;
  /** Vente par conditionnement (ex. "Carton de 12") plutôt qu'à l'unité — quantity compte alors des colis, pas des unités de base. */
  packagingUnitId?: string;
  packagingLabel?: string;
  multiplier?: number;
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

type SessionInfo = {
  id: string;
  number: string;
  openedAt: string;
  cashierName: string;
};

export function POS({
  mode = "pos",
  customers,
  paymentMethods,
  currency,
  locationId,
  locationName,
  canEditProducts = false,
  autoPrintReceipt: initialAutoPrint,
  printerTicketWidth: initialPrinterWidth,
  session,
  businessInfo,
}: {
  mode?: "pos" | "facture";
  customers: { id: string; name: string; phone: string | null }[];
  paymentMethods: { method: PaymentMethod; label: string }[];
  currency: string;
  locationId: string;
  locationName: string;
  canEditProducts?: boolean;
  autoPrintReceipt: boolean;
  printerTicketWidth: string | null;
  session: SessionInfo;
  businessInfo: CachedBusinessInfo;
}) {
  const isFacture = mode === "facture";
  const [cart, setCart] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(initialAutoPrint);
  const [printerTicketWidth, setPrinterTicketWidth] = useState(initialPrinterWidth);

  // Mode hors ligne : reste utilisable si la connexion tombe pendant que
  // cette page est déjà ouverte (le cas réel le plus fréquent avec une
  // connexion intermittente) — pas un démarrage à froid sans jamais avoir
  // été en ligne. Voir lib/offline/.
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingSales = useCallback(() => {
    getPendingSales().then(setPendingSales);
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncPendingSales();
    } finally {
      setSyncing(false);
      refreshPendingSales();
      getPosProductsAction(locationId)
        .then(setProducts)
        .catch(() => {});
    }
  }, [locationId, refreshPendingSales]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingSales();
    function handleOnline() {
      setIsOnline(true);
      runSync();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCart([]);
    setLoadingProducts(true);
    getPosProductsAction(locationId)
      .then((result) => {
        setProducts(result);
        setLoadingProducts(false);
        cacheOfflineSnapshot({
          locationId,
          products: result,
          customers,
          businessInfo,
          paymentMethods: paymentMethods.map((m) => ({ method: m.method, label: m.label || PAYMENT_LABELS[m.method] })),
        });
      })
      .catch(async () => {
        // Hors ligne dès le chargement (rechargement de la page pendant une
        // coupure) : on retombe sur le cache local plutôt que de bloquer.
        const cached = await getCachedSnapshot(locationId);
        if (cached) setProducts(cached.products);
        setLoadingProducts(false);
        setIsOnline(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    paymentMethods[0]?.method ?? "ESPECES"
  );
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [receiptDoc, setReceiptDoc] = useState<Extract<SaleDocument, { success: true }> | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const subtotal = useMemo(
    () => cart.reduce((s, line) => s + line.unitPrice * line.quantity - line.discount, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);
  const isCreditOnly = paymentMethod === "CREDIT";
  const amountPaid = isCreditOnly
    ? amountPaidInput === ""
      ? 0
      : Number(amountPaidInput)
    : amountPaidInput === ""
      ? total
      : Number(amountPaidInput);
  const change = Math.max(0, amountPaid - total);
  const remaining = Math.max(0, total - amountPaid);

  // Un produit "normal" n'a qu'une ligne de panier (identifiée par son id) ;
  // un produit à suivi unitaire (moto/engin) peut avoir plusieurs lignes
  // simultanées — une par exemplaire choisi — jamais fusionnées entre elles,
  // donc identifiées par l'exemplaire précis plutôt que par le produit.
  function lineKey(line: CartLine) {
    return line.vehicleUnitId ?? (line.packagingUnitId ? `${line.product.id}:${line.packagingUnitId}` : line.product.id);
  }

  /** Quantité maximale vendable pour cette ligne — en colis si conditionnement, sinon en unités de base. */
  function lineMaxQty(line: CartLine) {
    return Math.max(1, Math.floor(line.product.quantity / (line.multiplier ?? 1)));
  }

  function addProduct(product: PosProduct, packaging?: PackagingUnitOption) {
    if (product.trackUnits) {
      openUnitPicker(product);
      return;
    }
    const multiplier = packaging?.multiplier ?? 1;
    const maxQty = Math.max(1, Math.floor(product.quantity / multiplier));
    setCart((prev) => {
      const existing = prev.find((l) => !l.vehicleUnitId && l.product.id === product.id && l.packagingUnitId === packaging?.id);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + 1, maxQty) } : l));
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: packaging ? packaging.salePrice : product.salePrice,
          discount: 0,
          packagingUnitId: packaging?.id,
          packagingLabel: packaging?.name,
          multiplier,
        },
      ];
    });
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (lineKey(l) === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => lineKey(l) !== key));
  }

  const [unitPickerProduct, setUnitPickerProduct] = useState<PosProduct | null>(null);
  const [availableUnits, setAvailableUnits] = useState<{ id: string; chassisNumber: string; color: string | null }[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  function openUnitPicker(product: PosProduct) {
    setUnitPickerProduct(product);
    setLoadingUnits(true);
    getAvailableVehicleUnitsAction(product.id, locationId)
      .then((units) => {
        const chosenIds = new Set(cart.map((l) => l.vehicleUnitId).filter(Boolean));
        setAvailableUnits(units.filter((u) => !chosenIds.has(u.id)));
      })
      .finally(() => setLoadingUnits(false));
  }

  function addTrackedUnit(product: PosProduct, unit: { id: string; chassisNumber: string }) {
    setCart((prev) => [
      ...prev,
      {
        product,
        quantity: 1,
        unitPrice: product.salePrice,
        discount: 0,
        vehicleUnitId: unit.id,
        chassisNumber: unit.chassisNumber,
      },
    ]);
    setUnitPickerProduct(null);
  }

  async function handleScan(code: string) {
    // Cherche d'abord localement (rapide, fonctionne hors ligne) avant
    // d'interroger le serveur — utile aussi en ligne pour un scan instantané.
    const local = products.find((p) => p.barcode === code || p.reference === code);
    if (local) {
      addProduct(local);
      return;
    }
    for (const p of products) {
      const packaging = p.packagingUnits?.find((pu) => pu.barcode === code);
      if (packaging) {
        addProduct(p, packaging);
        return;
      }
    }
    if (!isOnline) {
      setError(`Aucun produit trouvé pour le code "${code}"`);
      return;
    }
    try {
      const product = await findProductByExactCodeAction(code, locationId);
      if (product) {
        addProduct(product, product.matchedPackaging ?? undefined);
      } else setError(`Aucun produit trouvé pour le code "${code}"`);
    } catch {
      setError(`Aucun produit trouvé pour le code "${code}"`);
    }
  }

  function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError("Ajoutez au moins un produit au panier");
      return;
    }
    if (remaining > 0 && !customerId) {
      setError("Sélectionnez un client pour une vente à crédit ou un paiement partiel");
      return;
    }

    const items = cart.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      vehicleUnitId: l.vehicleUnitId,
      packagingUnitId: l.packagingUnitId,
      packagingLabel: l.packagingLabel,
      multiplier: l.multiplier,
    }));
    const documentType: "TICKET" | "FACTURE" = isFacture ? "FACTURE" : "TICKET";

    if (cart.some((l) => l.vehicleUnitId) && !isOnline) {
      setError("La vente d'un engin à suivi unitaire nécessite une connexion. Réessayez une fois en ligne.");
      return;
    }
    if (cart.some((l) => l.packagingUnitId) && !isOnline) {
      setError("La vente par conditionnement nécessite une connexion. Réessayez une fois en ligne.");
      return;
    }

    if (!isOnline) {
      startTransition(async () => {
        const clientRef = crypto.randomUUID();
        const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

        await queueOfflineSale({
          clientRef,
          createdAt: new Date().toISOString(),
          input: { locationId, items, customerId: customerId || undefined, discount, paymentMethod, amountPaid, documentType, clientRef },
          cashierName: session.cashierName,
          customerName: selectedCustomer?.name ?? null,
        });
        await decrementCachedStock(items);

        const doc = buildOfflineDocument({
          documentType,
          clientRef,
          items: cart.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
            name: l.product.name,
            unit: l.product.unit,
          })),
          cashierName: session.cashierName,
          customer: selectedCustomer,
          business: businessInfo,
          paymentMethod,
          discount,
          amountPaid,
          defaultWidth: (printerTicketWidth as ReceiptWidth) || "80mm",
        });

        // Répercute la vente hors ligne sur le stock affiché localement, pour
        // ne pas proposer de survendre avant la prochaine synchronisation.
        setProducts((prev) =>
          prev.map((p) => {
            const line = cart.find((l) => l.product.id === p.id);
            return line ? { ...p, quantity: Math.max(0, p.quantity - line.quantity) } : p;
          })
        );
        setCart([]);
        setCustomerId("");
        setDiscount(0);
        setAmountPaidInput("");
        setReceiptDoc(doc);
        refreshPendingSales();
      });
      return;
    }

    startTransition(async () => {
      const result = await createSaleAction({
        locationId,
        items,
        customerId: customerId || undefined,
        discount,
        paymentMethod,
        amountPaid,
        documentType,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

      // On ne quitte jamais la page Vente après un encaissement : la caissière
      // doit pouvoir enchaîner immédiatement sur le client suivant. Le
      // ticket/la facture s'affiche dans un panneau (impression auto si activée
      // dans les réglages) plutôt que sur une page séparée.
      setCart([]);
      setCustomerId("");
      setDiscount(0);
      setAmountPaidInput("");

      const doc = await getSaleDocumentAction(result.saleId);
      if (doc.success) setReceiptDoc(doc);
      else setError("Vente enregistrée, mais impossible de charger le ticket pour l'impression.");

      getPosProductsAction(locationId).then(setProducts);
    });
  }

  return (
    // print:hidden est essentiel, pas juste cosmétique : sans lui, toute cette
    // grille de produits/panier/formulaires reste invisible mais garde sa
    // hauteur dans le document imprimé (visibility: hidden ne libère pas
    // l'espace, contrairement à display: none) — assez pour pousser le
    // document sur 2 pages et faire imprimer le ticket une fois par page.
    // Important : ReceiptPrintPanel doit rester EN DEHORS de ce conteneur
    // print:hidden (voir plus bas) — imbriqué dedans, le ticket lui-même
    // héritait de display:none à l'impression et ne sortait donc jamais
    // (page blanche).
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print:hidden">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{isFacture ? "Facture A4" : "Vente / Caisse"}</h1>
              <p className="text-sm text-zinc-500">
                Boutique : <span className="font-medium text-zinc-700">{locationName}</span> —{" "}
                {isFacture
                  ? "constituez la facture détaillée du client, produit par produit."
                  : "touchez un produit pour l'ajouter au panier."}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5 pt-0.5">
              <PosSettingsButton
                autoPrintReceipt={autoPrintReceipt}
                printerTicketWidth={printerTicketWidth}
                onAutoPrintChange={setAutoPrintReceipt}
              />
              <PrinterSettingsButton
                autoPrintReceipt={autoPrintReceipt}
                printerTicketWidth={printerTicketWidth}
                onPrinterWidthChange={setPrinterTicketWidth}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Wallet className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Session {session.number} ouverte</p>
              <p className="text-emerald-700">
                {session.cashierName} — depuis {formatDateTime(session.openedAt)}
              </p>
            </div>
            <Link
              href={`/ventes/session/${session.id}/fermer`}
              className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 font-medium text-white hover:bg-emerald-700"
            >
              <Lock className="h-3.5 w-3.5" /> Fermer la caisse
            </Link>
          </div>
        </div>

        {(!isOnline || pendingSales.length > 0) && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
              !isOnline ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {!isOnline ? <WifiOff className="h-4 w-4 shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}
              <span>
                {!isOnline
                  ? `Hors ligne — les ventes sont enregistrées sur cet appareil et se synchroniseront au retour de la connexion.${
                      pendingSales.length > 0 ? ` (${pendingSales.length} en attente)` : ""
                    }`
                  : `${pendingSales.length} vente(s) en attente de synchronisation.`}
              </span>
            </div>
            {isOnline && pendingSales.length > 0 && (
              <Button size="sm" variant="outline" onClick={runSync} disabled={syncing}>
                {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit par nom, référence ou code-barres..."
              className="pl-9"
              autoFocus
            />
          </div>
          <BarcodeScannerButton onDetected={handleScan} />
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-xl">
          {loadingProducts ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des produits...
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              onSelect={addProduct}
              currency={currency}
              canEditProducts={canEditProducts}
            />
          )}
        </div>

        <Card>
          <CardBody className="p-0">
            {cart.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">Le panier est vide.</p>
            ) : (
              <>
                {/* Version tableau : confortable à partir de sm (tablette/bureau). En
                    dessous, une table à 6 colonnes avec des champs numériques serait
                    illisible et impossible à remplir sur téléphone — voir la version
                    carte juste en dessous, réservée à sm:hidden. */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-zinc-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Produit</th>
                        <th className="px-4 py-2 font-medium">Qté</th>
                        <th className="px-4 py-2 text-right font-medium">P.U.</th>
                        <th className="px-4 py-2 text-right font-medium">Remise</th>
                        <th className="px-4 py-2 text-right font-medium">Total</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {cart.map((line) => (
                        <tr key={lineKey(line)}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-zinc-900">
                              {line.product.name}
                              {line.packagingLabel && (
                                <span className="ml-1.5 rounded-md bg-zindo-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-zindo-green-700">
                                  {line.packagingLabel}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {line.chassisNumber ? (
                                <span className="font-mono font-semibold text-zinc-600">{line.chassisNumber}</span>
                              ) : (
                                line.product.reference
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-2">
                            {line.vehicleUnitId ? (
                              <span className="text-zinc-500">1 {line.product.unit}</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateLine(lineKey(line), { quantity: Math.max(1, line.quantity - 1) })}
                                  className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={lineMaxQty(line)}
                                  value={line.quantity}
                                  onChange={(e) =>
                                    updateLine(lineKey(line), {
                                      quantity: Math.min(
                                        lineMaxQty(line),
                                        Math.max(1, Number(e.target.value) || 1)
                                      ),
                                    })
                                  }
                                  className="h-7 w-14 rounded border border-zinc-200 text-center text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLine(lineKey(line), {
                                      quantity: Math.min(lineMaxQty(line), line.quantity + 1),
                                    })
                                  }
                                  className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={line.unitPrice}
                              onChange={(e) => updateLine(lineKey(line), { unitPrice: Number(e.target.value) || 0 })}
                              className="h-7 w-24 rounded border border-zinc-200 text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={line.discount}
                              onChange={(e) => updateLine(lineKey(line), { discount: Number(e.target.value) || 0 })}
                              className="h-7 w-20 rounded border border-zinc-200 text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-zinc-900">
                            {formatMoney(line.unitPrice * line.quantity - line.discount, currency)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeLine(lineKey(line))}
                              className="rounded p-1 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Version carte : téléphone. */}
                <ul className="divide-y divide-zinc-100 sm:hidden">
                  {cart.map((line) => (
                    <li key={lineKey(line)} className="space-y-2.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900">
                            {line.product.name}
                            {line.packagingLabel && (
                              <span className="ml-1.5 rounded-md bg-zindo-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-zindo-green-700">
                                {line.packagingLabel}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {line.chassisNumber ? (
                              <span className="font-mono font-semibold text-zinc-600">{line.chassisNumber}</span>
                            ) : (
                              line.product.reference
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(lineKey(line))}
                          className="shrink-0 rounded p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {line.vehicleUnitId ? (
                          <span className="text-sm text-zinc-500">1 {line.product.unit}</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => updateLine(lineKey(line), { quantity: Math.max(1, line.quantity - 1) })}
                              className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={lineMaxQty(line)}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(lineKey(line), {
                                  quantity: Math.min(lineMaxQty(line), Math.max(1, Number(e.target.value) || 1)),
                                })
                              }
                              className="h-9 w-16 rounded-lg border border-zinc-200 text-center text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateLine(lineKey(line), {
                                  quantity: Math.min(lineMaxQty(line), line.quantity + 1),
                                })
                              }
                              className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <span className="ml-auto text-right font-semibold text-zinc-900">
                          {formatMoney(line.unitPrice * line.quantity - line.discount, currency)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs text-zinc-500">P.U.</span>
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(lineKey(line), { unitPrice: Number(e.target.value) || 0 })}
                            className="h-9 w-full rounded-lg border border-zinc-200 px-2 text-right text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-zinc-500">Remise</span>
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={line.discount}
                            onChange={(e) => updateLine(lineKey(line), { discount: Number(e.target.value) || 0 })}
                            className="h-9 w-full rounded-lg border border-zinc-200 px-2 text-right text-sm"
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Client</h2>
          </CardHeader>
          <CardBody className="flex gap-2">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="flex-1">
              <option value="">Client de passage</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={() => setNewClientOpen(true)}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Paiement</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Field label="Remise globale" htmlFor="discount">
              <Input
                id="discount"
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Moyen de paiement" htmlFor="paymentMethod">
              <Select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {paymentMethods.map((m) => (
                  <option key={m.method} value={m.method}>
                    {m.label || PAYMENT_LABELS[m.method]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Montant reçu"
              htmlFor="amountPaid"
              hint={isCreditOnly ? "Laissez à 0 pour un crédit total" : "Laissez vide pour un paiement exact"}
            >
              <Input
                id="amountPaid"
                type="number"
                min={0}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                placeholder={String(total)}
              />
            </Field>

            <div className="space-y-1 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Sous-total</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-900">
                <span>Total</span>
                <span>{formatMoney(total, currency)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Monnaie à rendre</span>
                  <span>{formatMoney(change, currency)}</span>
                </div>
              )}
              {remaining > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Reste à payer (crédit)</span>
                  <span>{formatMoney(remaining, currency)}</span>
                </div>
              )}
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button className="w-full" size="lg" disabled={pending} onClick={handleSubmit}>
              {pending ? "Enregistrement..." : isFacture ? "Générer la facture" : "Valider la vente"}
            </Button>
          </CardBody>
        </Card>
      </div>

      <ClientFormModal open={newClientOpen} onClose={() => setNewClientOpen(false)} />

      <Modal
        open={!!unitPickerProduct}
        onClose={() => setUnitPickerProduct(null)}
        title={unitPickerProduct ? `Choisir un exemplaire — ${unitPickerProduct.name}` : ""}
      >
        {loadingUnits ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des exemplaires...
          </div>
        ) : availableUnits.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            Aucun exemplaire disponible en stock pour ce modèle dans cette boutique.
          </p>
        ) : (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {availableUnits.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => unitPickerProduct && addTrackedUnit(unitPickerProduct, u)}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 text-left hover:border-zindo-green-300 hover:bg-zindo-green-50"
                >
                  <span className="font-mono text-sm font-bold tracking-wide text-zinc-900">{u.chassisNumber}</span>
                  {u.color && <span className="text-xs text-zinc-500">{u.color}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>

      {receiptDoc && (
        <ReceiptPrintPanel doc={receiptDoc} autoPrint={autoPrintReceipt} onClose={() => setReceiptDoc(null)} />
      )}
    </>
  );
}
