"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, ImageIcon, MessageCircle, Send, Users, CheckCircle2, PackageCheck, XCircle } from "lucide-react";
import {
  addCompetitorsAction,
  cancelOrderAction,
  confirmOrderAction,
  markOrderSentAction,
  receiveOrderAction,
  saveOrderPricesAction,
} from "@/lib/actions/purchase-orders";
import { formatCartons, purchaseOrderDisplayNumber, type PurchaseOrderStatus } from "@/lib/purchase-orders";
import { formatMoney } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export type OrderDetail = {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  transportCost: number | null;
  discount: number;
  responseBy: string | null;
  expectedDeliveryDate: string | null;
  deliveryPlace: string | null;
  paymentTerms: string | null;
  deposit: number;
  note: string | null;
  purchaseId: string | null;
  supplier: { id: string; name: string; phone: string | null };
  location: { name: string };
  items: {
    id: string;
    quantity: number;
    unitPrice: number | null;
    receivedQuantity: number | null;
    product: { id: string; name: string; reference: string; unit: string; unitsPerCarton: number | null };
  }[];
};

export type GroupOffer = {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  transportCost: number | null;
  discount: number;
  supplier: { id: string; name: string };
  items: { quantity: number; unitPrice: number | null; productId: string }[];
};

function whatsappLink(phone: string | null, text: string) {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 8) digits = `226${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function offerTotal(o: GroupOffer) {
  const goods = o.items.reduce((s, i) => s + i.quantity * (i.unitPrice ?? 0), 0);
  return goods - (o.discount ?? 0) + (o.transportCost ?? 0);
}

export function OrderWorkflow({
  order,
  group,
  suppliers,
  currency,
  shareUrl,
}: {
  order: OrderDetail;
  group: GroupOffer[];
  suppliers: { id: string; name: string }[];
  currency: string;
  /** Lien public signé vers le document (voir lib/purchase-order-document.ts). */
  shareUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "prices" | "receive">("view");
  const [competitorsOpen, setCompetitorsOpen] = useState(false);

  const status = order.status;
  const isRequest = status === "BROUILLON" || status === "ENVOYEE" || status === "PRIX_RECUS";
  const displayNumber = purchaseOrderDisplayNumber(order.number, status);
  const hasPrices = order.items.every((i) => i.unitPrice != null);
  const goodsTotal = order.items.reduce((s, i) => s + i.quantity * (i.unitPrice ?? 0), 0);
  const priced = group.filter((g) => g.status === "PRIX_RECUS" || g.status === "CONFIRMEE" || g.status === "RECUE");

  function run(fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) return setError(res.error ?? "Erreur");
      after?.();
      router.refresh();
    });
  }

  // Image préparée dès l'ouverture : le partage natif du téléphone
  // (navigator.share) n'est autorisé que juste après l'appui sur le bouton —
  // attendre ~4 s la génération de l'image au moment du clic le faisait
  // refuser par le navigateur.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const imageKey = `${status}|${order.items.map((i) => `${i.quantity}:${i.unitPrice ?? ""}`).join(",")}|${order.transportCost ?? ""}`;

  useEffect(() => {
    if (status === "ANNULEE" || status === "RECUE") return;
    let cancelled = false;
    // Chemin relatif : même serveur (web ou application Windows) que la page.
    fetch(`${new URL(shareUrl).pathname}/image`)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (cancelled) return;
        setImageFile(new File([blob], `${displayNumber}.png`, { type: "image/png" }));
        setImageFailed(false);
      })
      .catch(() => {
        if (!cancelled) setImageFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // imageKey résume tout ce qui change l'image (statut, quantités, prix).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey, shareUrl]);

  function downloadImage(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Envoi du document en image : sur téléphone, partage natif (WhatsApp...)
   * avec le PNG joint ; sinon (ordinateur, ou partage refusé), téléchargement
   * de l'image à joindre soi-même. Aucun await avant navigator.share.
   */
  function sendAsImage() {
    if (!imageFile) return;
    setError(null);
    const markSent = () => {
      if (status === "BROUILLON") run(() => markOrderSentAction(order.id));
    };
    if (navigator.canShare?.({ files: [imageFile] })) {
      navigator
        .share({ files: [imageFile], title: displayNumber })
        .then(markSent)
        .catch((e) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          downloadImage(imageFile);
          markSent();
        });
    } else {
      downloadImage(imageFile);
      markSent();
    }
  }

  const shareText = isRequest
    ? `Bonjour ${order.supplier.name}, voici notre demande de prix ${displayNumber}. Merci de nous communiquer vos prix unitaires, les frais de transport et la disponibilité.

Voir et télécharger la demande (PDF) : ${shareUrl}`
    : `Bonjour ${order.supplier.name}, voici notre bon de commande ${displayNumber}. Merci de confirmer la livraison.

Voir et télécharger le bon de commande (PDF) : ${shareUrl}`;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Actions principales selon l'étape */}
      <Card>
        <CardBody className="flex flex-wrap gap-2">
          {status !== "ANNULEE" && (
            <ButtonLink href={`/achats/commandes/${order.id}/document`} variant="outline">
              <FileDown className="h-4 w-4" /> {isRequest ? "Demande de prix (PDF)" : "Bon de commande (PDF)"}
            </ButtonLink>
          )}
          {status !== "ANNULEE" && status !== "RECUE" && (
            <a
              href={whatsappLink(order.supplier.phone, shareText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => status === "BROUILLON" && run(() => markOrderSentAction(order.id))}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp (lien)
            </a>
          )}
          {status !== "ANNULEE" && status !== "RECUE" && (
            <Button variant="outline" disabled={!imageFile} onClick={sendAsImage}>
              <ImageIcon className="h-4 w-4 text-emerald-600" /> {imageFile ? "Envoyer en image" : imageFailed ? "Image indisponible" : "Préparation de l’image..."}
            </Button>
          )}
          {status === "BROUILLON" && (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => markOrderSentAction(order.id))}>
              <Send className="h-4 w-4" /> Marquer comme envoyée
            </Button>
          )}
          {isRequest && (
            <Button variant="secondary" disabled={pending} onClick={() => setCompetitorsOpen(true)}>
              <Users className="h-4 w-4" /> Mettre en concurrence
            </Button>
          )}
          {(isRequest || status === "CONFIRMEE") && (
            <Button variant={status === "PRIX_RECUS" || status === "CONFIRMEE" ? "secondary" : "primary"} onClick={() => setMode("prices")}>
              {status === "PRIX_RECUS" || status === "CONFIRMEE" ? "Modifier les prix" : "Saisir les prix reçus"}
            </Button>
          )}
          {status === "PRIX_RECUS" && (
            <Button disabled={pending} onClick={() => run(() => confirmOrderAction(order.id))}>
              <CheckCircle2 className="h-4 w-4" /> Confirmer la commande chez {order.supplier.name}
            </Button>
          )}
          {status === "CONFIRMEE" && (
            <Button onClick={() => setMode("receive")}>
              <PackageCheck className="h-4 w-4" /> Réceptionner la marchandise
            </Button>
          )}
          {status === "RECUE" && order.purchaseId && (
            <ButtonLink href={`/achats/${order.purchaseId}`} variant="outline">
              Voir l&apos;achat enregistré
            </ButtonLink>
          )}
          {status !== "RECUE" && status !== "ANNULEE" && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (confirm("Annuler cette commande ?")) run(() => cancelOrderAction(order.id));
              }}
            >
              <XCircle className="h-4 w-4" /> Annuler
            </Button>
          )}
        </CardBody>
        {status === "BROUILLON" && (
          <CardBody className="border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-slate-800">
            Téléchargez le PDF, envoyez-le au fournisseur (WhatsApp, e-mail...), puis saisissez ses prix quand il vous répond.
          </CardBody>
        )}
      </Card>

      {mode === "prices" ? (
        <PricesForm order={order} currency={currency} pending={pending} onCancel={() => setMode("view")} run={run} />
      ) : mode === "receive" ? (
        <ReceiveForm order={order} currency={currency} pending={pending} onCancel={() => setMode("view")} run={run} />
      ) : (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900 dark:text-slate-100">Produits</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2">Désignation</th>
                  <th className="px-4 py-2">Quantité</th>
                  <th className="px-4 py-2 text-right">Prix unitaire</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  {status === "RECUE" && <th className="px-4 py-2 text-right">Reçu</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-slate-800">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-zinc-900 dark:text-slate-100">{i.product.name}</p>
                      <p className="text-xs text-zinc-500">Réf. {i.product.reference}</p>
                    </td>
                    <td className="px-4 py-2">
                      {i.quantity} {i.product.unit}
                      {formatCartons(i.quantity, i.product.unitsPerCarton) && (
                        <p className="text-xs text-zinc-500">{formatCartons(i.quantity, i.product.unitsPerCarton)}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {i.unitPrice != null ? formatMoney(i.unitPrice, currency) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {i.unitPrice != null ? formatMoney(i.unitPrice * i.quantity, currency) : <span className="text-zinc-400">—</span>}
                    </td>
                    {status === "RECUE" && <td className="px-4 py-2 text-right">{i.receivedQuantity ?? 0}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasPrices && (
            <CardBody className="space-y-1 border-t border-zinc-100 text-right text-sm dark:border-slate-800">
              <p>Sous-total : {formatMoney(goodsTotal, currency)}</p>
              {order.discount > 0 && <p>Remise : −{formatMoney(order.discount, currency)}</p>}
              {order.transportCost != null && <p>Transport : {formatMoney(order.transportCost, currency)}</p>}
              <p className="text-base font-bold">
                Total : {formatMoney(goodsTotal - order.discount + (order.transportCost ?? 0), currency)}
              </p>
            </CardBody>
          )}
        </Card>
      )}

      {group.length > 1 && (
        <Comparison
          group={group}
          priced={priced}
          currentId={order.id}
          items={order.items}
          currency={currency}
          pending={pending}
          onConfirm={(id) => run(() => confirmOrderAction(id), () => router.push(`/achats/commandes/${id}`))}
        />
      )}

      <CompetitorsModal
        open={competitorsOpen}
        onClose={() => setCompetitorsOpen(false)}
        suppliers={suppliers.filter((s) => !group.some((g) => g.supplier.id === s.id))}
        pending={pending}
        onSubmit={(ids) => run(() => addCompetitorsAction(order.id, ids), () => setCompetitorsOpen(false))}
      />
    </div>
  );
}

type RunFn = (fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) => void;

function PricesForm({
  order,
  currency,
  pending,
  onCancel,
  run,
}: {
  order: OrderDetail;
  currency: string;
  pending: boolean;
  onCancel: () => void;
  run: RunFn;
}) {
  const [items, setItems] = useState(
    order.items.map((i) => ({ id: i.id, unitPrice: i.unitPrice != null ? String(i.unitPrice) : "", quantity: i.quantity }))
  );
  const [transport, setTransport] = useState(order.transportCost != null ? String(order.transportCost) : "");
  const [discount, setDiscount] = useState(order.discount ? String(order.discount) : "");
  const [deposit, setDeposit] = useState(order.deposit ? String(order.deposit) : "");
  const [delivery, setDelivery] = useState(order.expectedDeliveryDate ?? "");
  const [place, setPlace] = useState(order.deliveryPlace ?? "");
  const [terms, setTerms] = useState(order.paymentTerms ?? "");
  const [note, setNote] = useState(order.note ?? "");

  const subtotal = items.reduce((s, i) => s + i.quantity * (Number(i.unitPrice) || 0), 0);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-zinc-900 dark:text-slate-100">Prix communiqués par {order.supplier.name}</h2>
        <p className="text-xs text-zinc-500">Ajustez les quantités que vous voulez vraiment commander (0 = retirer le produit).</p>
      </CardHeader>
      <CardBody className="space-y-3">
        {order.items.map((orig, idx) => {
          const item = items[idx];
          return (
            <div key={orig.id} className="flex flex-wrap items-end gap-3 border-b border-zinc-100 pb-3 dark:border-slate-800">
              <div className="min-w-[160px] flex-1">
                <p className="font-medium text-zinc-900 dark:text-slate-100">{orig.product.name}</p>
                <p className="text-xs text-zinc-500">
                  Demandé : {orig.quantity} {orig.product.unit}
                  {formatCartons(orig.quantity, orig.product.unitsPerCarton) && ` · ${formatCartons(orig.quantity, orig.product.unitsPerCarton)}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Quantité ({orig.product.unit})</p>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={item.quantity}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x, j) => (j === idx ? { ...x, quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) } : x)))
                  }
                />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Prix unitaire</p>
                <Input
                  type="number"
                  min={0}
                  className="w-32"
                  value={item.unitPrice}
                  onChange={(e) => setItems((prev) => prev.map((x, j) => (j === idx ? { ...x, unitPrice: e.target.value } : x)))}
                />
              </div>
              <p className="w-32 text-right text-sm tabular-nums">{formatMoney(item.quantity * (Number(item.unitPrice) || 0), currency)}</p>
            </div>
          );
        })}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Frais de transport" htmlFor="pf-transport">
            <Input id="pf-transport" type="number" min={0} value={transport} onChange={(e) => setTransport(e.target.value)} />
          </Field>
          <Field label="Remise" htmlFor="pf-discount">
            <Input id="pf-discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Acompte versé" htmlFor="pf-deposit">
            <Input id="pf-deposit" type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
          <Field label="Livraison prévue le" htmlFor="pf-delivery">
            <Input id="pf-delivery" type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </Field>
          <Field label="Lieu de livraison" htmlFor="pf-place">
            <Input id="pf-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={order.location.name} />
          </Field>
          <Field label="Paiement" htmlFor="pf-terms">
            <Input id="pf-terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Comptant, acompte, crédit 30 jours..." />
          </Field>
        </div>
        <Field label="Remarque" htmlFor="pf-note">
          <Textarea id="pf-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="text-right font-semibold">
          Total : {formatMoney(subtotal - (Number(discount) || 0) + (Number(transport) || 0), currency)}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  saveOrderPricesAction(order.id, {
                    items: items.map((i) => ({ id: i.id, quantity: i.quantity, unitPrice: i.unitPrice === "" ? null : Number(i.unitPrice) })),
                    transportCost: transport === "" ? null : Number(transport),
                    discount: Number(discount) || 0,
                    deposit: Number(deposit) || 0,
                    expectedDeliveryDate: delivery || null,
                    deliveryPlace: place || null,
                    paymentTerms: terms || null,
                    note: note || null,
                  }),
                onCancel
              )
            }
          >
            Enregistrer les prix
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ReceiveForm({
  order,
  currency,
  pending,
  onCancel,
  run,
}: {
  order: OrderDetail;
  currency: string;
  pending: boolean;
  onCancel: () => void;
  run: RunFn;
}) {
  const [received, setReceived] = useState(order.items.map((i) => i.quantity));
  const [transport, setTransport] = useState(String(order.transportCost ?? 0));
  const [paid, setPaid] = useState(String(order.deposit ?? 0));
  const total = order.items.reduce((s, i, idx) => s + received[idx] * (i.unitPrice ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-zinc-900 dark:text-slate-100">Réception de la marchandise</h2>
        <p className="text-xs text-zinc-500">Indiquez ce qui est réellement arrivé : le stock de {order.location.name} sera augmenté.</p>
      </CardHeader>
      <CardBody className="space-y-3">
        {order.items.map((i, idx) => (
          <div key={i.id} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <p className="font-medium text-zinc-900 dark:text-slate-100">{i.product.name}</p>
              <p className="text-xs text-zinc-500">
                Commandé : {i.quantity} {i.product.unit} à {formatMoney(i.unitPrice ?? 0, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Reçu</p>
              <Input
                type="number"
                min={0}
                className="w-24"
                value={received[idx]}
                onChange={(e) => {
                  const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                  setReceived((prev) => prev.map((q, j) => (j === idx ? n : q)));
                }}
              />
            </div>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Frais de transport réels" htmlFor="rf-transport">
            <Input id="rf-transport" type="number" min={0} value={transport} onChange={(e) => setTransport(e.target.value)} />
          </Field>
          <Field label="Montant payé au fournisseur" htmlFor="rf-paid" hint="Le reste sera noté comme dette fournisseur.">
            <Input id="rf-paid" type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} />
          </Field>
        </div>
        <p className="text-right font-semibold">Marchandise reçue : {formatMoney(total, currency)}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  receiveOrderAction(order.id, {
                    items: order.items.map((i, idx) => ({ id: i.id, receivedQuantity: received[idx] })),
                    transportCost: Number(transport) || 0,
                    amountPaid: Number(paid) || 0,
                  }),
                onCancel
              )
            }
          >
            Valider la réception
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Comparison({
  group,
  priced,
  currentId,
  items,
  currency,
  pending,
  onConfirm,
}: {
  group: GroupOffer[];
  priced: GroupOffer[];
  currentId: string;
  items: OrderDetail["items"];
  currency: string;
  pending: boolean;
  onConfirm: (id: string) => void;
}) {
  const best = priced.length > 0 ? priced.reduce((a, b) => (offerTotal(b) < offerTotal(a) ? b : a)) : null;
  const confirmed = group.some((g) => g.status === "CONFIRMEE" || g.status === "RECUE");
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-zinc-900 dark:text-slate-100">Comparaison des fournisseurs</h2>
        <p className="text-xs text-zinc-500">Visible par vous seul, jamais imprimée. Total = marchandise − remise + transport.</p>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-2">Produit</th>
              {group.map((g) => (
                <th key={g.id} className="px-4 py-2 text-right">
                  <Link href={`/achats/commandes/${g.id}`} className={g.id === currentId ? "font-bold text-zinc-900 dark:text-slate-100" : "hover:underline"}>
                    {g.supplier.name}
                  </Link>
                  <p className="font-normal">{purchaseOrderDisplayNumber(g.number, g.status)}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-slate-800">
            {items.map((item) => {
              const prices = group.map((g) => g.items.find((i) => i.productId === item.product.id)?.unitPrice ?? null);
              const known = prices.filter((p): p is number => p != null);
              const min = known.length ? Math.min(...known) : null;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.product.name}</td>
                  {prices.map((p, i) => (
                    <td key={group[i].id} className="px-4 py-2 text-right tabular-nums">
                      {p == null ? <span className="text-zinc-400">—</span> : (
                        <span className={p === min && known.length > 1 ? "font-semibold text-emerald-700" : ""}>
                          {formatMoney(p, currency)} {p === min && known.length > 1 && "✅"}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <td className="px-4 py-2 text-zinc-500">Transport</td>
              {group.map((g) => (
                <td key={g.id} className="px-4 py-2 text-right tabular-nums">
                  {g.transportCost != null ? formatMoney(g.transportCost, currency) : <span className="text-zinc-400">—</span>}
                </td>
              ))}
            </tr>
            <tr className="bg-zinc-50 font-semibold dark:bg-slate-800/50">
              <td className="px-4 py-2">Total rendu boutique</td>
              {group.map((g) => {
                const isPriced = priced.some((p) => p.id === g.id);
                return (
                  <td key={g.id} className="px-4 py-2 text-right tabular-nums">
                    {isPriced ? (
                      <>
                        {formatMoney(offerTotal(g), currency)} {best?.id === g.id && priced.length > 1 && "✅"}
                        {!confirmed && g.status === "PRIX_RECUS" && (
                          <div className="mt-1">
                            <Button size="sm" variant={best?.id === g.id ? "primary" : "outline"} disabled={pending} onClick={() => onConfirm(g.id)}>
                              Confirmer ici
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-normal text-zinc-400">En attente des prix</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CompetitorsModal({
  open,
  onClose,
  suppliers,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  suppliers: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <Modal open={open} onClose={onClose} title="Envoyer la même demande à d'autres fournisseurs">
      <p className="mb-3 text-sm text-zinc-500">Chaque fournisseur recevra son propre document et ne verra jamais les autres.</p>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {suppliers.length === 0 && <p className="text-sm text-zinc-500">Aucun autre fournisseur enregistré.</p>}
        {suppliers.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={selected.includes(s.id)}
              onChange={() => setSelected((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
            />
            {s.name}
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button disabled={pending || selected.length === 0} onClick={() => onSubmit(selected)}>
          Créer {selected.length || ""} demande{selected.length > 1 ? "s" : ""}
        </Button>
      </div>
    </Modal>
  );
}
