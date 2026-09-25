"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type FocusEvent } from "react";
import Link from "next/link";
import { Trash2, Plus, Minus, UserPlus, Search, Loader2, Wallet, Lock, WifiOff, RefreshCw, Sparkles } from "lucide-react";
import { ProductGrid, type PosProduct, type PackagingUnitOption } from "@/components/products/ProductGrid";
import { BarcodeScannerButton } from "@/components/products/BarcodeScannerButton";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { formatMoney, formatDateTime } from "@/lib/format";
import { createSaleAction, reserveSaleNumberAction } from "@/lib/actions/sales";
import { getSaleDocumentAction, type SaleDocument } from "@/lib/actions/receipt";
import { getPosProductsAction, findProductByExactCodeAction, searchProductsAction } from "@/lib/actions/product-search";
import { searchItems } from "@/lib/search-text";
import { generateQrDataUrlInBrowser } from "@/lib/qrcode-client";
import { cleanManualSaleNumber, nextManualSaleNumber } from "@/lib/sale-number";
import { sendCartToQueueAction } from "@/lib/actions/cashier-queue";
import { ClientFormModal } from "@/app/(app)/clients/ClientFormModal";
import { Modal } from "@/components/ui/Modal";
import { PosSettingsButton } from "./PosSettingsButton";
import { AiCartModal } from "./AiCartModal";
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
  removePendingWrite,
  markPendingWriteError,
  type CachedBusinessInfo,
  type PendingSale,
} from "@/lib/offline/db";
import { syncPendingSales } from "@/lib/offline/sync";
import { buildOfflineDocument } from "@/lib/offline/build-document";
import { getAvailableVehicleUnitsAction } from "@/lib/actions/vehicle-units";
import { playAddToCartSound } from "@/lib/sound";
import { resolveTieredPrice } from "@/lib/pricing";

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

type HeldSale = {
  id: string;
  savedAt: string;
  label: string;
  total: number;
  customerId: string;
  discount: number;
  lines: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    vehicleUnitId?: string;
    chassisNumber?: string;
    packagingUnitId?: string;
    packagingLabel?: string;
    multiplier?: number;
  }[];
};

function heldSalesStorageKey(locationId: string) {
  return `zindo_held_sales_${locationId}`;
}

function loadHeldSales(locationId: string): HeldSale[] {
  try {
    const raw = window.localStorage.getItem(heldSalesStorageKey(locationId));
    return raw ? (JSON.parse(raw) as HeldSale[]) : [];
  } catch {
    return [];
  }
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
  MIXTE: "Mixte (espèces + mobile money)",
};

const MOBILE_MONEY_OPERATOR_LABELS: Record<"ORANGE" | "MOOV" | "WAVE", string> = {
  ORANGE: "Orange Money",
  MOOV: "Moov Money",
  WAVE: "Wave",
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
  canSeeMargin = false,
  autoPrintReceipt: initialAutoPrint,
  printerTicketWidth: initialPrinterWidth,
  session,
  businessInfo,
  hideCustomerInPos = false,
  quantityInputMode = "both",
  mobileMoneyOperators = ["ORANGE", "MOOV", "WAVE"],
  allowMixedPayment = false,
  aiCartEnabled = false,
  cashierQueueEnabled = false,
  manualSaleNumberEnabled = false,
  suggestedManualNumber = null,
}: {
  mode?: "pos" | "facture";
  customers: { id: string; name: string; phone: string | null }[];
  paymentMethods: { method: PaymentMethod; label: string }[];
  currency: string;
  locationId: string;
  locationName: string;
  canEditProducts?: boolean;
  /** Affiche la marge du panier (révèle les prix d'achat — réservé à qui peut consulter les rapports). */
  canSeeMargin?: boolean;
  autoPrintReceipt: boolean;
  printerTicketWidth: string | null;
  session: SessionInfo;
  businessInfo: CachedBusinessInfo;
  hideCustomerInPos?: boolean;
  quantityInputMode?: "both" | "input" | "buttons";
  mobileMoneyOperators?: ("ORANGE" | "MOOV" | "WAVE")[];
  allowMixedPayment?: boolean;
  aiCartEnabled?: boolean;
  cashierQueueEnabled?: boolean;
  /** Champ facultatif "N° de ticket" (continuité d'un ancien logiciel) — voir lib/manual-sale-number.ts. */
  manualSaleNumberEnabled?: boolean;
  suggestedManualNumber?: string | null;
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

  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [heldSalesOpen, setHeldSalesOpen] = useState(false);

  useEffect(() => {
    setHeldSales(loadHeldSales(locationId));
  }, [locationId]);

  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    paymentMethods[0]?.method ?? "ESPECES"
  );
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [mobileMoneyOperator, setMobileMoneyOperator] = useState<"ORANGE" | "MOOV" | "WAVE" | "">(
    mobileMoneyOperators[0] ?? ""
  );
  const [cashPortionInput, setCashPortionInput] = useState<string>("");
  const [manualNumberInput, setManualNumberInput] = useState("");
  const [nextManualNumber, setNextManualNumber] = useState<string | null>(suggestedManualNumber);
  const [mobilePortionInput, setMobilePortionInput] = useState<string>("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [aiCartOpen, setAiCartOpen] = useState(false);
  const [sendingToQueue, setSendingToQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [receiptDoc, setReceiptDoc] = useState<Extract<SaleDocument, { success: true }> | null>(null);
  /** clientRef de la vente dont le ticket définitif est attendu du serveur (voir handleSubmit). */
  const [finalizingRef, setFinalizingRef] = useState<string | null>(null);

  // Numéro de la prochaine vente, réservé d'avance auprès du serveur : le
  // ticket imprimé à la validation instantanée porte ainsi tout de suite son
  // vrai numéro (voir lib/sale-number-reservation.ts). Une réservation non
  // utilisée (page fermée) laisse simplement un numéro sauté.
  const reservedNumberRef = useRef<{ number: string; token: string } | null>(null);
  const reservingRef = useRef(false);
  const refillReservedNumber = useCallback(() => {
    if (reservedNumberRef.current || reservingRef.current || !navigator.onLine) return;
    reservingRef.current = true;
    reserveSaleNumberAction()
      .then((r) => {
        reservedNumberRef.current = r;
      })
      .catch(() => {})
      .finally(() => {
        reservingRef.current = false;
      });
  }, []);
  useEffect(() => {
    if (!loadingProducts) refillReservedNumber();
  }, [loadingProducts, refillReservedNumber]);

  // Le catalogue n'est plus rechargé après chaque vente (des milliers de
  // produits, et les actions serveur passent une par une : la vente
  // suivante attendait ce rechargement). Le stock affiché est décrémenté
  // localement ; les changements faits ailleurs (autre caisse, achats)
  // arrivent par ce rafraîchissement périodique.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!navigator.onLine) return;
      getPosProductsAction(locationId)
        .then(setProducts)
        .catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [locationId]);

  const localMatches = useMemo(
    () => searchItems(products, search, (p) => [p.name, p.reference, p.barcode]),
    [products, search]
  );

  // Rien trouvé localement : on demande au serveur, qui connaît aussi les
  // "autres noms" d'un produit (ex. "Omo" pour "savon en poudre"). Seuls les
  // produits réellement en stock dans cette boutique sont proposés.
  const [serverMatches, setServerMatches] = useState<{ query: string; products: PosProduct[] } | null>(null);
  useEffect(() => {
    const q = search.trim();
    if (localMatches.length > 0 || q.length < 2 || !isOnline) return;
    const timer = setTimeout(() => {
      searchProductsAction(q, locationId)
        .then((found) => setServerMatches({ query: q, products: found.filter((p) => p.quantity > 0) }))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [search, localMatches.length, locationId, isOnline]);

  const filteredProducts =
    localMatches.length === 0 && serverMatches?.query === search.trim() ? serverMatches.products : localMatches;

  // "Caisse à deux" : sur le module Vente, on ne finalise plus jamais le
  // paiement directement — on envoie à la caisse (module Caisse dédié).
  // La facture A4 reste toujours en encaissement direct, quel que soit ce réglage.
  const queueOnlyMode = cashierQueueEnabled && !isFacture;

  const subtotal = useMemo(
    () => cart.reduce((s, line) => s + line.unitPrice * line.quantity - line.discount, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);
  // Coût d'achat du panier : une ligne en conditionnement compte `multiplier` unités de base par colis.
  const cartCost = cart.reduce((s, line) => s + line.product.purchasePrice * (line.multiplier ?? 1) * line.quantity, 0);
  const cartMargin = total - cartCost;

  function persistHeldSales(next: HeldSale[]) {
    setHeldSales(next);
    try {
      window.localStorage.setItem(heldSalesStorageKey(locationId), JSON.stringify(next));
    } catch {
      // stockage plein/indisponible — la mise en attente reste utilisable pour cette session
    }
  }

  function holdSale() {
    if (cart.length === 0) return;
    const entry: HeldSale = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      label: cart[0].product.name + (cart.length > 1 ? ` +${cart.length - 1}` : ""),
      total,
      customerId,
      discount,
      lines: cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        vehicleUnitId: l.vehicleUnitId,
        chassisNumber: l.chassisNumber,
        packagingUnitId: l.packagingUnitId,
        packagingLabel: l.packagingLabel,
        multiplier: l.multiplier,
      })),
    };
    persistHeldSales([entry, ...heldSales]);
    setCart([]);
    setCustomerId("");
    setDiscount(0);
    setError(null);
  }

  function resumeHeldSale(id: string) {
    const entry = heldSales.find((h) => h.id === id);
    if (!entry) return;
    if (cart.length > 0) {
      setError("Terminez ou mettez en attente le panier en cours avant d'en reprendre un autre.");
      return;
    }
    const lines: CartLine[] = [];
    for (const l of entry.lines) {
      const product = products.find((p) => p.id === l.productId);
      if (!product) continue;
      lines.push({
        product,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        vehicleUnitId: l.vehicleUnitId,
        chassisNumber: l.chassisNumber,
        packagingUnitId: l.packagingUnitId,
        packagingLabel: l.packagingLabel,
        multiplier: l.multiplier,
      });
    }
    if (lines.length === 0) {
      setError("Ces produits ne sont plus disponibles.");
      persistHeldSales(heldSales.filter((h) => h.id !== id));
      return;
    }
    setCart(lines);
    setCustomerId(entry.customerId);
    setDiscount(entry.discount);
    persistHeldSales(heldSales.filter((h) => h.id !== id));
    setHeldSalesOpen(false);
  }

  function deleteHeldSale(id: string) {
    persistHeldSales(heldSales.filter((h) => h.id !== id));
  }
  const isCreditOnly = paymentMethod === "CREDIT";
  const isMixed = paymentMethod === "MIXTE";
  const cashPortion = cashPortionInput === "" ? 0 : Number(cashPortionInput);
  const mobilePortion = mobilePortionInput === "" ? 0 : Number(mobilePortionInput);
  const amountPaid = isMixed
    ? cashPortion + mobilePortion
    : isCreditOnly
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
    playAddToCartSound();
    const multiplier = packaging?.multiplier ?? 1;
    const maxQty = Math.max(1, Math.floor(product.quantity / multiplier));
    setCart((prev) => {
      const existing = prev.find((l) => !l.vehicleUnitId && l.product.id === product.id && l.packagingUnitId === packaging?.id);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + 1, maxQty);
        return prev.map((l) =>
          l === existing
            ? {
                ...l,
                quantity: nextQuantity,
                unitPrice: packaging ? l.unitPrice : resolveTieredPrice(product.salePrice, nextQuantity, product.priceTiers),
              }
            : l
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: packaging ? packaging.salePrice : resolveTieredPrice(product.salePrice, 1, product.priceTiers),
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

  /**
   * Met à jour la quantité d'une ligne et, si le produit a des paliers de
   * prix ("prix de gros" — voir lib/pricing.ts), recalcule automatiquement le
   * prix unitaire — sauf pour un conditionnement ou un exemplaire à suivi
   * unitaire, qui ont déjà leur propre prix fixe.
   */
  function setLineQuantity(key: string, quantity: number) {
    setCart((prev) =>
      prev.map((l) =>
        lineKey(l) === key
          ? {
              ...l,
              quantity,
              unitPrice:
                l.packagingUnitId || l.vehicleUnitId ? l.unitPrice : resolveTieredPrice(l.product.salePrice, quantity, l.product.priceTiers),
            }
          : l
      )
    );
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
    playAddToCartSound();
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

  /** "Caisse à deux" : envoie le panier à un caissier sans encaisser, le stock n'est pas touché. */
  function handleSendToQueue() {
    setError(null);
    if (cart.length === 0) {
      setError("Ajoutez au moins un produit au panier");
      return;
    }
    if (cart.some((l) => l.vehicleUnitId) && !isOnline) {
      setError("La vente d'un engin à suivi unitaire nécessite une connexion. Réessayez une fois en ligne.");
      return;
    }
    setSendingToQueue(true);
    sendCartToQueueAction({
      locationId,
      items: cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        vehicleUnitId: l.vehicleUnitId,
        packagingUnitId: l.packagingUnitId,
        packagingLabel: l.packagingLabel,
        multiplier: l.multiplier,
      })),
      customerId: customerId || undefined,
      discount,
    })
      .then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        setCart([]);
        setCustomerId("");
        setDiscount(0);
      })
      .finally(() => setSendingToQueue(false));
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

    // Validation instantanée (ticket, ou toute vente hors ligne) : la vente est
    // d'abord enregistrée sur cet appareil et le ticket s'affiche aussitôt ;
    // l'envoi au serveur se fait ensuite en arrière-plan, avec la même
    // clientRef que la file hors ligne — le serveur dédoublonne dessus
    // (lib/actions/sales.ts), donc une vente ne peut jamais compter deux fois.
    // Restent sur l'ancien chemin (attente du serveur) : la facture A4 en
    // ligne (numéro définitif sur le document) et les ventes d'engin ou par
    // conditionnement, que le mode hors ligne ne sait pas construire.
    const manualNumber = manualSaleNumberEnabled ? cleanManualSaleNumber(manualNumberInput) : undefined;
    // Numéro saisi et connexion disponible : on attend le serveur, pour
    // signaler tout de suite un numéro déjà utilisé (panier conservé).
    const instant =
      !cart.some((l) => l.vehicleUnitId || l.packagingUnitId) && (!isFacture || !isOnline) && !(manualNumber && isOnline);
    const rememberManualNumber = () => {
      if (!manualNumber) return;
      setManualNumberInput("");
      setNextManualNumber(nextManualSaleNumber(manualNumber));
    };
    if (instant) {
      const clientRef = crypto.randomUUID();
      const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
      const saleInput = {
        locationId,
        items,
        customerId: customerId || undefined,
        discount,
        paymentMethod,
        amountPaid,
        documentType,
        clientRef,
        mobileMoneyOperator: paymentMethod === "MOBILE_MONEY" ? mobileMoneyOperator || undefined : undefined,
        cashPortion: isMixed ? cashPortion : undefined,
        mobilePortion: isMixed ? mobilePortion : undefined,
        manualNumber,
        reservedNumber: undefined as { number: string; token: string } | undefined,
      };
      const sendToServer = navigator.onLine;
      // Numéro saisi à la main en priorité (hors ligne) ; sinon le numéro réservé d'avance, consommé ici.
      const reserved = manualNumber ? null : reservedNumberRef.current;
      if (reserved) reservedNumberRef.current = null;
      saleInput.reservedNumber = reserved ?? undefined;
      const finalNumber = manualNumber ?? reserved?.number;
      const localNumber = finalNumber ?? `HL-${clientRef.slice(0, 8).toUpperCase()}`;

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
        number: finalNumber,
      });
      rememberManualNumber();

      // Écran mis à jour tout de suite, sans rien attendre : stock affiché
      // (pour ne pas survendre), panier vidé, ticket provisoire affiché.
      setProducts((prev) =>
        prev.map((p) => {
          const line = cart.find((l) => l.product.id === p.id);
          return line ? { ...p, quantity: Math.max(0, p.quantity - line.quantity) } : p;
        })
      );
      setCart([]);
      setCustomerId("");
      setDiscount(0);
      setAmountPaidInput(""); setCashPortionInput(""); setMobilePortionInput("");
      setFinalizingRef(sendToServer ? clientRef : null);

      // Ticket affiché (et imprimé, si l'impression auto est activée) avec
      // son QR de vérification, fabriqué ici même en quelques millisecondes
      // avec la clientRef — app/verifier/[id] la reconnaît une fois la vente
      // enregistrée côté serveur.
      if (businessInfo.verificationBaseUrl && doc.documentType === "TICKET") {
        generateQrDataUrlInBrowser(businessInfo.verificationBaseUrl + clientRef)
          .then((qr) => setReceiptDoc({ ...doc, data: { ...doc.data, qrCodeDataUrl: qr } }))
          .catch(() => setReceiptDoc(doc));
      } else {
        setReceiptDoc(doc);
      }

      void (async () => {
        // D'abord sur l'appareil : si la page se ferme ou si Internet coupe
        // pendant l'envoi, la vente n'est pas perdue et partira à la
        // prochaine synchronisation.
        let queued = false;
        try {
          await queueOfflineSale({
            clientRef,
            createdAt: new Date().toISOString(),
            input: saleInput,
            cashierName: session.cashierName,
            customerName: selectedCustomer?.name ?? null,
          });
          queued = true;
        } catch {
          // Stockage local indisponible (navigation privée...) : on tente quand même le serveur.
        }
        void decrementCachedStock(items);

        if (!sendToServer) {
          if (!queued) setError(`Vente ${localNumber} non enregistrée : stockage de l'appareil indisponible et pas de connexion.`);
          refreshPendingSales();
          return;
        }

        try {
          const result = await createSaleAction(saleInput);
          if (result.success) {
            await removePendingWrite(clientRef).catch(() => {});
            // Ticket provisoire "HL-…" (aucun numéro réservé disponible) :
            // remplacé par le définitif, s'il est encore affiché.
            if (!finalNumber) {
              const serverDoc = await getSaleDocumentAction(result.saleId);
              if (serverDoc.success) setReceiptDoc((cur) => (cur && cur.saleId === clientRef ? serverDoc : cur));
            }
          } else {
            await markPendingWriteError(clientRef, result.error).catch(() => {});
            setError(
              `Vente ${localNumber} refusée par le serveur : ${result.error}` +
                (queued ? " Elle reste en attente sur cet appareil." : "")
            );
          }
        } catch {
          // Réseau coupé pendant l'envoi : la vente reste en file et partira
          // à la prochaine synchronisation.
          if (!queued) setError(`Vente ${localNumber} non enregistrée : connexion perdue. Recommencez la vente.`);
        } finally {
          setFinalizingRef((cur) => (cur === clientRef ? null : cur));
          refreshPendingSales();
          refillReservedNumber();
        }
      })();
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
        mobileMoneyOperator: paymentMethod === "MOBILE_MONEY" ? mobileMoneyOperator || undefined : undefined,
        cashPortion: isMixed ? cashPortion : undefined,
        mobilePortion: isMixed ? mobilePortion : undefined,
        manualNumber,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      rememberManualNumber();
      const soldLines = cart;
      setProducts((prev) =>
        prev.map((p) => {
          const sold = soldLines
            .filter((l) => l.product.id === p.id)
            .reduce((sum, l) => sum + l.quantity * (l.multiplier ?? 1), 0);
          return sold > 0 ? { ...p, quantity: Math.max(0, p.quantity - sold) } : p;
        })
      );

      // On ne quitte jamais la page Vente après un encaissement : la caissière
      // doit pouvoir enchaîner immédiatement sur le client suivant. Le
      // ticket/la facture s'affiche dans un panneau (impression auto si activée
      // dans les réglages) plutôt que sur une page séparée.
      setCart([]);
      setCustomerId("");
      setDiscount(0);
      setAmountPaidInput(""); setCashPortionInput(""); setMobilePortionInput("");

      const doc = await getSaleDocumentAction(result.saleId);
      if (doc.success) setReceiptDoc(doc);
      else setError("Vente enregistrée, mais impossible de charger le ticket pour l'impression.");
    });
  }

  // Le champ touché (P.U., remise, quantité) doit rester visible. Sur écran
  // tactile, le clavier qui s'ouvre le recouvre : on le recentre donc une fois
  // le clavier affiché. Sur ordinateur, on ne fait défiler la page que si le
  // champ est hors de vue (long panier dans la colonne de droite), pour éviter
  // que la page ne saute.
  function revealAboveKeyboard(e: FocusEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setTimeout(
      () => el.scrollIntoView({ block: touch ? "center" : "nearest", behavior: "smooth" }),
      touch ? 300 : 0
    );
  }

  // Panier : sous les produits sur téléphone/tablette ; dans la colonne de
  // droite (toujours visible, à côté du bouton Valider) sur ordinateur.
  const renderCart = (compact: boolean) => (
    <Card>
      <CardHeader>
        <h2 className="font-semibold tracking-tight text-zinc-900">Panier</h2>
        {cart.length > 0 && (
          <span className="rounded-full bg-zindo-green-50 px-2.5 py-0.5 text-xs font-semibold text-zindo-green-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            {cart.length} article{cart.length > 1 ? "s" : ""}
          </span>
        )}
      </CardHeader>
      <CardBody className="p-0">
        {cart.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">Le panier est vide.</p>
        ) : (
          <>
            {/* Version tableau : confortable à partir de sm (tablette/bureau). En
                dessous, une table à 6 colonnes avec des champs numériques serait
                illisible et impossible à remplir sur téléphone — voir la version
                carte juste en dessous, réservée à sm:hidden. */}
            <div className={compact ? "hidden" : "hidden overflow-x-auto sm:block"}>
              <Table>
                <TableHead>
                  <TableRow interactive={false}>
                    <TableHeaderCell>Produit</TableHeaderCell>
                    <TableHeaderCell>Qté</TableHeaderCell>
                    <TableHeaderCell align="right">P.U.</TableHeaderCell>
                    <TableHeaderCell align="right">Remise</TableHeaderCell>
                    <TableHeaderCell align="right">Total</TableHeaderCell>
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.map((line) => (
                    <TableRow key={lineKey(line)} interactive={false}>
                      <TableCell>
                        <p className="font-medium text-zinc-900">
                          {line.product.name}
                          {line.packagingLabel && (
                            <span className="ml-1.5 rounded-md bg-zindo-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-zindo-green-700 dark:bg-emerald-500/10 dark:text-emerald-400">
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
                      </TableCell>
                      <TableCell>
                        {line.vehicleUnitId ? (
                          <span className="text-zinc-500">1 {line.product.unit}</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {quantityInputMode !== "input" && (
                              <button
                                type="button"
                                onClick={() => setLineQuantity(lineKey(line), Math.max(1, line.quantity - 1))}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {quantityInputMode !== "buttons" && (
                              <input
                                type="number"
                                min={1}
                                max={lineMaxQty(line)}
                                value={line.quantity}
                                onChange={(e) =>
                                  setLineQuantity(
                                    lineKey(line),
                                    Math.min(lineMaxQty(line), Math.max(1, Number(e.target.value) || 1))
                                  )
                                }
                                onFocus={revealAboveKeyboard}
                                className="h-8 w-14 rounded-lg border border-zinc-200 text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zindo-green-500/40 dark:border-slate-700 dark:bg-slate-900"
                              />
                            )}
                            {quantityInputMode === "buttons" && (
                              <span className="w-6 text-center text-sm tabular-nums text-zinc-700">{line.quantity}</span>
                            )}
                            {quantityInputMode !== "input" && (
                              <button
                                type="button"
                                onClick={() => setLineQuantity(lineKey(line), Math.min(lineMaxQty(line), line.quantity + 1))}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <input
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={(e) => updateLine(lineKey(line), { unitPrice: Number(e.target.value) || 0 })}
                          onFocus={revealAboveKeyboard}
                          className="h-8 w-24 rounded-lg border border-zinc-200 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zindo-green-500/40 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <input
                          type="number"
                          min={0}
                          value={line.discount}
                          onChange={(e) => updateLine(lineKey(line), { discount: Number(e.target.value) || 0 })}
                          onFocus={revealAboveKeyboard}
                          className="h-8 w-20 rounded-lg border border-zinc-200 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zindo-green-500/40 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </TableCell>
                      <TableCell align="right" className="font-semibold text-zinc-900 tabular-nums">
                        {formatMoney(line.unitPrice * line.quantity - line.discount, currency)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => removeLine(lineKey(line))}
                          aria-label={`Retirer ${line.product.name} du panier`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Version carte : téléphone, et colonne de droite sur ordinateur (compact). */}
            <ul
              className={
                compact
                  ? "max-h-[40vh] divide-y divide-zinc-100 overflow-y-auto dark:divide-slate-800"
                  : "divide-y divide-zinc-100 sm:hidden dark:divide-slate-800"
              }
            >
              {cart.map((line) => (
                <li key={lineKey(line)} className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-zinc-900">
                        {line.product.name}
                        {line.packagingLabel && (
                          <span className="ml-1.5 rounded-md bg-zindo-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-zindo-green-700 dark:bg-emerald-500/10 dark:text-emerald-400">
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
                      aria-label={`Retirer ${line.product.name} du panier`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {line.vehicleUnitId ? (
                      <span className="text-sm text-zinc-500">1 {line.product.unit}</span>
                    ) : (
                      <>
                        {quantityInputMode !== "input" && (
                          <button
                            type="button"
                            onClick={() => setLineQuantity(lineKey(line), Math.max(1, line.quantity - 1))}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                        {quantityInputMode !== "buttons" && (
                          <input
                            type="number"
                            min={1}
                            max={lineMaxQty(line)}
                            value={line.quantity}
                            onChange={(e) =>
                              setLineQuantity(
                                lineKey(line),
                                Math.min(lineMaxQty(line), Math.max(1, Number(e.target.value) || 1))
                              )
                            }
                            onFocus={revealAboveKeyboard}
                            className="h-10 w-16 rounded-lg border border-zinc-200 text-center text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
                          />
                        )}
                        {quantityInputMode === "buttons" && (
                          <span className="w-8 text-center text-sm tabular-nums text-zinc-700">{line.quantity}</span>
                        )}
                        {quantityInputMode !== "input" && (
                          <button
                            type="button"
                            onClick={() => setLineQuantity(lineKey(line), Math.min(lineMaxQty(line), line.quantity + 1))}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                    <span className="ml-auto text-right font-semibold tabular-nums text-zinc-900">
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
                        onFocus={revealAboveKeyboard}
                        className="h-10 w-full rounded-lg border border-zinc-200 px-2 text-right text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
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
                        onFocus={revealAboveKeyboard}
                        className="h-10 w-full rounded-lg border border-zinc-200 px-2 text-right text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
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
  );

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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] print:hidden">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">{isFacture ? "Facture A4" : "Vente / Caisse"}</h1>
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
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Wallet className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Session {session.number} ouverte</p>
              <p className="text-emerald-700 dark:text-emerald-400/80">
                {session.cashierName} — depuis {formatDateTime(session.openedAt)}
              </p>
            </div>
            <Link
              href={`/ventes/session/${session.id}/fermer`}
              className="ml-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Lock className="h-3.5 w-3.5" /> Fermer la caisse
            </Link>
          </div>
        </div>

        {(!isOnline || pendingSales.length > 0) && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
              !isOnline
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-400"
                : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-400"
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

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
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
          {aiCartEnabled && (
            <Button type="button" variant="outline" onClick={() => setAiCartOpen(true)}>
              <Sparkles className="h-4 w-4" /> Panier IA
            </Button>
          )}
          {cart.length > 0 && (
            <Button type="button" variant="outline" onClick={holdSale}>
              Mettre en attente
            </Button>
          )}
          {heldSales.length > 0 && (
            <Button type="button" variant="outline" onClick={() => setHeldSalesOpen(true)}>
              En attente ({heldSales.length})
            </Button>
          )}
        </div>

        <Modal open={heldSalesOpen} onClose={() => setHeldSalesOpen(false)} title="Ventes en attente">
          {heldSales.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune vente en attente.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {heldSales.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-zinc-900">{h.label}</p>
                    <p className="text-xs text-zinc-500">
                      <span className="tabular-nums">{formatMoney(h.total, currency)}</span> — {formatDateTime(h.savedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => resumeHeldSale(h.id)}>
                      Reprendre
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => deleteHeldSale(h.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>

        {aiCartEnabled && (
          <AiCartModal
            open={aiCartOpen}
            onClose={() => setAiCartOpen(false)}
            locationId={locationId}
            currency={currency}
            onAddLines={(lines) => {
              for (const line of lines) {
                const product = products.find((p) => p.id === line.productId);
                if (!product) continue;
                for (let i = 0; i < line.quantity; i++) addProduct(product);
              }
            }}
          />
        )}

        <div className="max-h-[420px] overflow-y-auto rounded-2xl md:max-h-[calc(100vh-15rem)]">
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

        <div className="md:hidden">{renderCart(false)}</div>
      </div>

      <div className="space-y-4 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
        <div className="hidden md:block">{renderCart(true)}</div>
        {(!hideCustomerInPos || isCreditOnly) && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold tracking-tight text-zinc-900">Client</h2>
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
              <Button type="button" variant="outline" onClick={() => setNewClientOpen(true)} aria-label="Ajouter un client">
                <UserPlus className="h-4 w-4" />
              </Button>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className="font-semibold tracking-tight text-zinc-900">{queueOnlyMode ? "Panier" : "Paiement"}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {manualSaleNumberEnabled && !queueOnlyMode && (
              <Field label="N° de ticket (facultatif)" htmlFor="manualNumber" hint="Vide : numéro ZINDO automatique">
                <div className="flex gap-2">
                  <Input
                    id="manualNumber"
                    value={manualNumberInput}
                    onChange={(e) => setManualNumberInput(e.target.value)}
                    placeholder={nextManualNumber ?? "ex. S-1251"}
                    maxLength={40}
                    className="flex-1"
                  />
                  {nextManualNumber && manualNumberInput.trim() !== nextManualNumber && (
                    <Button type="button" variant="outline" onClick={() => setManualNumberInput(nextManualNumber)}>
                      {nextManualNumber}
                    </Button>
                  )}
                </div>
              </Field>
            )}

            <Field label="Remise globale" htmlFor="discount">
              <Input
                id="discount"
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </Field>

            {!queueOnlyMode && (
              <>
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
                    {allowMixedPayment && <option value="MIXTE">{PAYMENT_LABELS.MIXTE}</option>}
                  </Select>
                </Field>

                {paymentMethod === "MOBILE_MONEY" && mobileMoneyOperators.length > 1 && (
                  <Field label="Opérateur mobile money" htmlFor="mobileMoneyOperator">
                    <Select
                      id="mobileMoneyOperator"
                      value={mobileMoneyOperator}
                      onChange={(e) => setMobileMoneyOperator(e.target.value as "ORANGE" | "MOOV" | "WAVE")}
                    >
                      {mobileMoneyOperators.map((op) => (
                        <option key={op} value={op}>
                          {MOBILE_MONEY_OPERATOR_LABELS[op]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                {isMixed ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Part espèces" htmlFor="cashPortion">
                      <Input
                        id="cashPortion"
                        type="number"
                        min={0}
                        value={cashPortionInput}
                        onChange={(e) => setCashPortionInput(e.target.value)}
                      />
                    </Field>
                    <Field label="Part mobile money" htmlFor="mobilePortion">
                      <Input
                        id="mobilePortion"
                        type="number"
                        min={0}
                        value={mobilePortionInput}
                        onChange={(e) => setMobilePortionInput(e.target.value)}
                      />
                    </Field>
                  </div>
                ) : (
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
                )}
              </>
            )}

            <div className="space-y-1.5 border-t border-zinc-100 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between text-zinc-600">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-zinc-200 pt-2 dark:border-slate-700">
                <span className="font-semibold text-zinc-900">Total</span>
                <span className="text-xl font-bold tabular-nums text-zinc-900">{formatMoney(total, currency)}</span>
              </div>
              {canSeeMargin && cart.length > 0 && (
                <div className={`flex justify-between text-xs font-medium ${cartMargin < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  <span>Marge estimée</span>
                  <span className="tabular-nums">{formatMoney(cartMargin, currency)}</span>
                </div>
              )}
              {!queueOnlyMode && change > 0 && (
                <div className="flex justify-between font-medium text-emerald-600">
                  <span>Monnaie à rendre</span>
                  <span className="tabular-nums">{formatMoney(change, currency)}</span>
                </div>
              )}
              {!queueOnlyMode && remaining > 0 && (
                <div className="flex justify-between font-medium text-red-600">
                  <span>Reste à payer (crédit)</span>
                  <span className="tabular-nums">{formatMoney(remaining, currency)}</span>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            {queueOnlyMode ? (
              <Button className="w-full" size="lg" disabled={sendingToQueue} onClick={handleSendToQueue}>
                {sendingToQueue ? "Envoi..." : "Envoyer à la caisse"}
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled={pending} onClick={handleSubmit}>
                {pending ? "Enregistrement..." : isFacture ? "Générer la facture" : "Valider la vente"}
              </Button>
            )}
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
        <ReceiptPrintPanel
          doc={receiptDoc}
          autoPrint={autoPrintReceipt}
          finalizing={finalizingRef !== null && receiptDoc.saleId === finalizingRef}
          onClose={() => setReceiptDoc(null)}
        />
      )}
    </>
  );
}
