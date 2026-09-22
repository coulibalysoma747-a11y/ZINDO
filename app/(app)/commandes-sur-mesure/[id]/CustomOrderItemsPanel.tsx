"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { ProductPicker } from "@/components/products/ProductPicker";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { formatMoney } from "@/lib/format";
import { addCustomOrderItemAction, removeCustomOrderItemAction, type CustomOrderItemRow } from "@/lib/actions/custom-orders";

type SelectedProduct = { id: string; name: string; photoUrl?: string | null; salePrice: number; quantity: number; unit: string };

export function CustomOrderItemsPanel({
  orderId,
  items,
  locationId,
  currency,
  disabled,
}: {
  orderId: string;
  items: CustomOrderItemRow[];
  locationId: string;
  currency: string;
  disabled: boolean;
}) {
  const [product, setProduct] = useState<SelectedProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!product) return;
    const formData = new FormData();
    formData.set("productId", product.id);
    formData.set("quantity", String(quantity));
    formData.set("unitPrice", String(unitPrice));
    setError(null);
    startTransition(async () => {
      const result = await addCustomOrderItemAction(orderId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setProduct(null);
      setQuantity(1);
      setUnitPrice(0);
    });
  }

  function handleRemove(itemId: string) {
    if (!confirm("Retirer cette matière ? Le stock sera recrédité.")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeCustomOrderItemAction(itemId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!disabled && (
        <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
          {product ? (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-2">
              <div className="flex items-center gap-2">
                <ProductThumbnail photoUrl={product.photoUrl} name={product.name} size={36} />
                <span className="text-sm font-medium text-zinc-900">{product.name}</span>
              </div>
              <button type="button" onClick={() => setProduct(null)} className="text-zinc-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <ProductPicker
              locationId={locationId}
              currency={currency}
              placeholder="Rechercher la matière/fourniture utilisée..."
              onSelect={(p) => {
                setProduct(p);
                setUnitPrice(p.salePrice);
              }}
            />
          )}

          {product && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité" htmlFor="itemQuantity">
                <Input
                  id="itemQuantity"
                  type="number"
                  min={1}
                  max={product.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(product.quantity, Math.max(1, Number(e.target.value) || 1)))}
                />
              </Field>
              <Field label="Prix unitaire" htmlFor="itemUnitPrice">
                <Input id="itemUnitPrice" type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value) || 0)} />
              </Field>
            </div>
          )}

          <Button type="button" size="sm" disabled={!product || pending} onClick={handleAdd} className="w-full">
            <Plus className="h-3.5 w-3.5" /> {pending ? "Ajout..." : "Ajouter la matière"}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-400">Aucune matière ajoutée pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Matière</TableHeaderCell>
                <TableHeaderCell align="right">Qté</TableHeaderCell>
                <TableHeaderCell align="right">P.U.</TableHeaderCell>
                <TableHeaderCell align="right">Total</TableHeaderCell>
                {!disabled && <TableHeaderCell />}
              </tr>
            </TableHead>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium text-zinc-900">{i.productName}</TableCell>
                  <TableCell align="right">{i.quantity}</TableCell>
                  <TableCell align="right">{formatMoney(i.unitPrice, currency)}</TableCell>
                  <TableCell align="right" className="font-semibold text-zinc-900">
                    {formatMoney(i.total, currency)}
                  </TableCell>
                  {!disabled && (
                    <TableCell align="right">
                      <button type="button" onClick={() => handleRemove(i.id)} disabled={pending} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" aria-label="Retirer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
