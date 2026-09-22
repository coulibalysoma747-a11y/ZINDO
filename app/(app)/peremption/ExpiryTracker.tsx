"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ProductPicker } from "@/components/products/ProductPicker";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { formatDate } from "@/lib/format";
import { addExpiryBatchAction, deleteExpiryBatchAction, type ExpiryBatchRow } from "@/lib/actions/expiry";

type SelectedProduct = { id: string; name: string; photoUrl?: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;

function urgency(expiryDate: string): { label: string; tone: "red" | "amber" | "emerald"; days: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(expiryDate).getTime() - today.getTime()) / DAY_MS);
  if (days < 0) return { label: `Expiré depuis ${Math.abs(days)} j`, tone: "red", days };
  if (days === 0) return { label: "Expire aujourd'hui", tone: "red", days };
  if (days <= 7) return { label: `Expire dans ${days} j`, tone: "amber", days };
  return { label: `Expire dans ${days} j`, tone: "emerald", days };
}

export function ExpiryTracker({
  locations,
  defaultLocationId,
  batches,
}: {
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  batches: ExpiryBatchRow[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [product, setProduct] = useState<SelectedProduct | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = locationId && product && Number(quantity) > 0 && expiryDate;

  function submit() {
    if (!product) return;
    const formData = new FormData();
    formData.set("locationId", locationId);
    formData.set("productId", product.id);
    formData.set("quantity", quantity);
    formData.set("expiryDate", expiryDate);
    if (note) formData.set("note", note);

    setError(null);
    startTransition(async () => {
      const result = await addExpiryBatchAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setProduct(null);
      setQuantity("1");
      setExpiryDate("");
      setNote("");
      setFormOpen(false);
      router.refresh();
    });
  }

  function handleDelete(batchId: string) {
    if (!confirm("Retirer ce lot du suivi ?")) return;
    startTransition(async () => {
      await deleteExpiryBatchAction(batchId);
      router.refresh();
    });
  }

  const sorted = [...batches].sort((a, b) => urgency(a.expiryDate).days - urgency(b.expiryDate).days);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formOpen ? "Annuler" : "Ajouter un lot"}
        </Button>
      </div>

      {formOpen && (
        <Card>
          <CardBody className="space-y-4">
            <Field label="Boutique" htmlFor="locationSelect">
              <Select id="locationSelect" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Produit" htmlFor="productSearch">
              {product ? (
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-2">
                  <div className="flex items-center gap-2">
                    <ProductThumbnail photoUrl={product.photoUrl} name={product.name} size={36} />
                    <span className="text-sm font-medium text-zinc-900">{product.name}</span>
                  </div>
                  <button type="button" onClick={() => setProduct(null)} className="text-xs text-zinc-400 hover:text-red-600">
                    Changer
                  </button>
                </div>
              ) : (
                <ProductPicker
                  locationId={locationId}
                  placeholder="Rechercher un produit par nom, référence ou code-barres..."
                  onSelect={(p) => setProduct({ id: p.id, name: p.name, photoUrl: p.photoUrl })}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité du lot" htmlFor="quantity">
                <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
              <Field label="Date de péremption" htmlFor="expiryDate">
                <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Field>
            </div>

            <Field label="Note (facultatif)" htmlFor="note">
              <Input id="note" placeholder="Ex : lot reçu du 20/09" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button type="button" disabled={!canSubmit || pending} onClick={submit} className="w-full">
              {pending ? "Enregistrement..." : "Enregistrer le lot"}
            </Button>
          </CardBody>
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState title="Aucun lot suivi" description="Ajoutez un lot pour commencer à suivre ses dates de péremption." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {sorted.map((b) => {
            const u = urgency(b.expiryDate);
            return (
              <CardBody key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{b.productName}</p>
                  <p className="text-xs text-zinc-500">
                    Réf. {b.productReference} · {b.quantity} {b.unit} · {b.locationName}
                    {b.note && ` · ${b.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">{formatDate(b.expiryDate)}</p>
                    <Badge tone={u.tone}>{u.label}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                    aria-label="Retirer du suivi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardBody>
            );
          })}
        </Card>
      )}
    </div>
  );
}
