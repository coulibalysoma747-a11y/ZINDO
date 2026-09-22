"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Clock, Loader2, RefreshCw, User, WifiOff } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import { createSaleAction } from "@/lib/actions/sales";
import { getSaleDocumentAction, type SaleDocument } from "@/lib/actions/receipt";
import {
  getPendingCartsAction,
  claimPendingCartAction,
  type PendingCartSummary,
  type ClaimedCart,
} from "@/lib/actions/cashier-queue";
import { ReceiptPrintPanel } from "@/app/(app)/ventes/ReceiptPrintPanel";
import type { PaymentMethod } from "@/lib/db-types";
import { queueOfflineSale, getPendingSales, type CachedBusinessInfo, type PendingSale } from "@/lib/offline/db";
import { syncPendingSales } from "@/lib/offline/sync";
import { buildOfflineDocument } from "@/lib/offline/build-document";

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

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
}

export function CaissePOS({
  locationId,
  locationName,
  currency,
  paymentMethods,
  mobileMoneyOperators = ["ORANGE", "MOOV", "WAVE"],
  allowMixedPayment = false,
  autoPrintReceipt,
  cashierName,
  businessInfo,
}: {
  locationId: string;
  locationName: string;
  currency: string;
  paymentMethods: { method: PaymentMethod; label: string }[];
  mobileMoneyOperators?: ("ORANGE" | "MOOV" | "WAVE")[];
  allowMixedPayment?: boolean;
  autoPrintReceipt: boolean;
  cashierName: string;
  businessInfo: CachedBusinessInfo;
}) {
  const [carts, setCarts] = useState<PendingCartSummary[] | null>(null);
  const [claimed, setClaimed] = useState<ClaimedCart | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [receiptDoc, setReceiptDoc] = useState<Extract<SaleDocument, { success: true }> | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]?.method ?? "ESPECES");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [mobileMoneyOperator, setMobileMoneyOperator] = useState<"ORANGE" | "MOOV" | "WAVE" | "">(
    mobileMoneyOperators[0] ?? ""
  );
  const [cashPortionInput, setCashPortionInput] = useState("");
  const [mobilePortionInput, setMobilePortionInput] = useState("");

  // Mode hors ligne : voir POS.tsx pour le même mécanisme. La "file
  // d'attente" (paniers envoyés par un vendeur) ne peut en revanche pas être
  // consultée hors ligne — elle vit côté serveur, alimentée par un AUTRE
  // appareil ; seul l'encaissement d'un panier déjà récupéré reste possible.
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
      getPendingCartsAction(locationId)
        .then(setCarts)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function refreshQueue() {
    getPendingCartsAction(locationId)
      .then(setCarts)
      .catch(() => setCarts([]));
  }

  useEffect(() => {
    Promise.resolve().then(refreshQueue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  function claim(id: string) {
    setError(null);
    setClaimingId(id);
    claimPendingCartAction(id)
      .then((result) => {
        if ("error" in result) {
          setError(result.error);
          refreshQueue();
          return;
        }
        setClaimed(result.cart);
        setPaymentMethod(paymentMethods[0]?.method ?? "ESPECES");
        setAmountPaidInput("");
        setCashPortionInput("");
        setMobilePortionInput("");
      })
      .finally(() => setClaimingId(null));
  }

  const offlineBanner = (!isOnline || pendingSales.length > 0) && (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
        !isOnline
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-slate-700 dark:bg-slate-800 dark:text-zinc-300"
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? <WifiOff className="h-4 w-4 shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}
        <span>
          {!isOnline
            ? `Hors ligne — l'encaissement d'un panier déjà récupéré reste possible et se synchronisera au retour de la connexion (la file d'attente des vendeurs ne peut pas être actualisée).${
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
  );

  if (!claimed) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Caisse</h1>
            <p className="text-sm text-zinc-500">
              Boutique : <span className="font-medium text-zinc-700">{locationName}</span>
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refreshQueue}>
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>

        {offlineBanner}

        <Card>
          <CardHeader>
            <h2 className="font-semibold tracking-tight text-zinc-900">File d&apos;attente</h2>
            {!!carts?.length && (
              <span className="rounded-full bg-zindo-green-50 px-2.5 py-0.5 text-xs font-semibold text-zindo-green-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                {carts.length} panier{carts.length > 1 ? "s" : ""}
              </span>
            )}
          </CardHeader>
          <CardBody className="space-y-2">
            {carts === null && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
              </div>
            )}
            {carts?.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">Aucun panier en attente pour l&apos;instant.</p>
            )}
            {carts?.map((cart) => (
              <div
                key={cart.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3.5 transition-colors hover:border-zindo-green-300 hover:bg-zindo-green-50/40 dark:border-slate-700 dark:hover:border-emerald-800 dark:hover:bg-emerald-500/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {cart.customerName ?? "Client anonyme"} — {cart.itemCount} article{cart.itemCount > 1 ? "s" : ""}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {cart.createdByName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {timeAgo(cart.createdAt)}
                    </span>
                    <span className="font-semibold tabular-nums text-zinc-600">{formatMoney(cart.total, currency)}</span>
                  </p>
                </div>
                <Button type="button" size="sm" disabled={claimingId === cart.id} onClick={() => claim(cart.id)}>
                  {claimingId === cart.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Récupérer"}
                </Button>
              </div>
            ))}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}
          </CardBody>
        </Card>

        {receiptDoc && (
          <ReceiptPrintPanel doc={receiptDoc} autoPrint={autoPrintReceipt} onClose={() => setReceiptDoc(null)} />
        )}
      </div>
    );
  }

  const subtotal = claimed.items.reduce((s, i) => s + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - claimed.discount);
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

  function handleCheckout() {
    setError(null);
    if (!claimed) return;
    if (remaining > 0 && !claimed.customerId) {
      setError("Ce panier n'a pas de client — impossible d'accepter un crédit ou un paiement partiel");
      return;
    }

    const items = claimed.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      vehicleUnitId: i.vehicleUnitId ?? undefined,
      packagingUnitId: i.packagingUnitId ?? undefined,
      packagingLabel: i.unitLabel ?? undefined,
      multiplier: i.multiplier,
    }));

    if (!isOnline && claimed.items.some((i) => i.vehicleUnitId || i.packagingUnitId)) {
      setError("La vente d'un engin ou d'un conditionnement nécessite une connexion. Réessayez une fois en ligne.");
      return;
    }

    if (!isOnline) {
      startTransition(async () => {
        const clientRef = crypto.randomUUID();
        await queueOfflineSale({
          clientRef,
          createdAt: new Date().toISOString(),
          input: {
            locationId,
            items,
            customerId: claimed.customerId ?? undefined,
            discount: claimed.discount,
            paymentMethod,
            amountPaid,
            documentType: "TICKET",
            clientRef,
            mobileMoneyOperator: paymentMethod === "MOBILE_MONEY" ? mobileMoneyOperator || undefined : undefined,
            cashPortion: isMixed ? cashPortion : undefined,
            mobilePortion: isMixed ? mobilePortion : undefined,
          },
          cashierName,
          customerName: claimed.customerName,
        });

        const doc = buildOfflineDocument({
          documentType: "TICKET",
          clientRef,
          items: claimed.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            vehicleUnitId: i.vehicleUnitId ?? undefined,
            packagingUnitId: i.packagingUnitId ?? undefined,
            packagingLabel: i.unitLabel ?? undefined,
            multiplier: i.multiplier,
            name: i.productName,
            unit: i.unitLabel ?? "unité",
          })),
          cashierName,
          customer: claimed.customerId ? { id: claimed.customerId, name: claimed.customerName ?? "", phone: null } : null,
          business: businessInfo,
          paymentMethod,
          discount: claimed.discount,
          amountPaid,
          defaultWidth: "80mm",
        });

        setReceiptDoc(doc);
        setClaimed(null);
        refreshPendingSales();
      });
      return;
    }

    startTransition(async () => {
      const result = await createSaleAction({
        locationId,
        items,
        customerId: claimed.customerId ?? undefined,
        discount: claimed.discount,
        paymentMethod,
        amountPaid,
        documentType: "TICKET",
        mobileMoneyOperator: paymentMethod === "MOBILE_MONEY" ? mobileMoneyOperator || undefined : undefined,
        cashPortion: isMixed ? cashPortion : undefined,
        mobilePortion: isMixed ? mobilePortion : undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const doc = await getSaleDocumentAction(result.saleId);
      if (doc.success) setReceiptDoc(doc);
      setClaimed(null);
      refreshQueue();
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Caisse</h1>
        <p className="text-sm text-zinc-500">
          Boutique : <span className="font-medium text-zinc-700">{locationName}</span>
        </p>
      </div>

      {offlineBanner}

      <Card>
        <CardHeader>
          <h2 className="font-semibold tracking-tight text-zinc-900">
            Panier — {claimed.customerName ?? "Client anonyme"}
          </h2>
          <span className="rounded-full bg-zindo-green-50 px-2.5 py-0.5 text-xs font-semibold text-zindo-green-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            {claimed.items.length} article{claimed.items.length > 1 ? "s" : ""}
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <ul className="divide-y divide-zinc-100 dark:divide-slate-800">
            {claimed.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">
                    {item.productName}
                    {item.unitLabel && <span className="ml-1.5 text-xs text-zinc-400">({item.unitLabel})</span>}
                  </p>
                  <p className="text-xs text-zinc-400">Qté {item.quantity}</p>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-zinc-700">
                  {formatMoney(item.unitPrice * item.quantity - item.discount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold tracking-tight text-zinc-900">Paiement</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <Field label="Moyen de paiement" htmlFor="caisse-paymentMethod">
            <Select
              id="caisse-paymentMethod"
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
            <Field label="Opérateur mobile money" htmlFor="caisse-mobileMoneyOperator">
              <Select
                id="caisse-mobileMoneyOperator"
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
              <Field label="Part espèces" htmlFor="caisse-cashPortion">
                <Input
                  id="caisse-cashPortion"
                  type="number"
                  min={0}
                  value={cashPortionInput}
                  onChange={(e) => setCashPortionInput(e.target.value)}
                />
              </Field>
              <Field label="Part mobile money" htmlFor="caisse-mobilePortion">
                <Input
                  id="caisse-mobilePortion"
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
              htmlFor="caisse-amountPaid"
              hint={isCreditOnly ? "Laissez à 0 pour un crédit total" : "Laissez vide pour un paiement exact"}
            >
              <Input
                id="caisse-amountPaid"
                type="number"
                min={0}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                placeholder={String(total)}
              />
            </Field>
          )}

          <div className="space-y-1.5 border-t border-zinc-100 pt-3 text-sm dark:border-slate-800">
            <div className="flex justify-between text-zinc-600">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
            </div>
            {claimed.discount > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Remise</span>
                <span className="tabular-nums">-{formatMoney(claimed.discount, currency)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-dashed border-zinc-200 pt-2 dark:border-slate-700">
              <span className="font-semibold text-zinc-900">Total</span>
              <span className="text-xl font-bold tabular-nums text-zinc-900">{formatMoney(total, currency)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between font-medium text-emerald-600">
                <span>Monnaie à rendre</span>
                <span className="tabular-nums">{formatMoney(change, currency)}</span>
              </div>
            )}
            {remaining > 0 && (
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

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setClaimed(null)} disabled={pending}>
              Annuler
            </Button>
            <Button className="flex-1" size="lg" disabled={pending} onClick={handleCheckout}>
              {pending ? "Enregistrement..." : "Encaisser"}
            </Button>
          </div>
          <p className="text-center text-xs text-zinc-400">
            « Annuler » abandonne ce panier — il faudra que le vendeur le renvoie à la caisse pour le récupérer.
          </p>
        </CardBody>
      </Card>

      {receiptDoc && (
        <ReceiptPrintPanel doc={receiptDoc} autoPrint={autoPrintReceipt} onClose={() => setReceiptDoc(null)} />
      )}
    </div>
  );
}
