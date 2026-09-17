"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ProductPicker } from "@/components/products/ProductPicker";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { quickSupplyAction } from "@/lib/actions/quick-supply";

type SelectedProduct = { id: string; name: string; photoUrl?: string | null };

export function QuickSupplyForm({
  locations,
  defaultLocationId,
  currency,
}: {
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  currency: string;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [product, setProduct] = useState<SelectedProduct | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const canSubmit = locationId && (product || newProductName.trim()) && Number(quantity) > 0 && unitPrice !== "";

  function submit() {
    const formData = new FormData();
    formData.set("locationId", locationId);
    if (product) formData.set("productId", product.id);
    else formData.set("newProductName", newProductName.trim());
    formData.set("quantity", quantity);
    formData.set("unitPrice", unitPrice);
    if (note) formData.set("note", note);

    setMessage(null);
    startTransition(async () => {
      const result = await quickSupplyAction(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: result.success ?? "" });
      setProduct(null);
      setNewProductName("");
      setQuantity("1");
      setUnitPrice("");
      setNote("");
      router.refresh();
    });
  }

  return (
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
            <div className="space-y-2">
              <ProductPicker
                locationId={locationId}
                currency={currency}
                placeholder="Rechercher un produit existant..."
                onSelect={(p) => setProduct({ id: p.id, name: p.name, photoUrl: p.photoUrl })}
              />
              <p className="text-center text-xs text-zinc-400">— ou —</p>
              <Input
                placeholder="Nom d'un nouveau produit à créer"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantité reçue" htmlFor="quantity">
            <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label={`Prix payé / pièce (${currency === "XOF" ? "FCFA" : currency})`} htmlFor="unitPrice">
            <Input id="unitPrice" type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </Field>
        </div>

        <Field label="Note (facultatif)" htmlFor="note">
          <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {message && (
          <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>{message.text}</p>
        )}

        <Button type="button" disabled={!canSubmit || pending} onClick={submit} className="w-full">
          {pending ? "Enregistrement..." : "Ajouter au stock"}
        </Button>
      </CardBody>
    </Card>
  );
}
