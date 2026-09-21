"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatMoney, formatDateTime } from "@/lib/format";
import {
  createPromoCodeAction,
  togglePromoCodeAction,
  deletePromoCodeAction,
  type PromoCodeSummary,
  type ActionState,
} from "@/lib/actions/promo-codes";

export function PromoCodesList({ promoCodes }: { promoCodes: PromoCodeSummary[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createPromoCodeAction, undefined);
  const router = useRouter();
  const [transitionPending, startTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await togglePromoCodeAction(id, active);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer définitivement ce code promo ?")) return;
    startTransition(async () => {
      await deletePromoCodeAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Nouveau code promo</h2>
        </CardHeader>
        <CardBody>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Code" htmlFor="code" hint="Le client le saisit tel quel (ex. BIENVENUE10)">
                <Input id="code" name="code" placeholder="BIENVENUE10" required maxLength={30} />
              </Field>
              <Field label="Type de remise" htmlFor="discountType">
                <Select id="discountType" name="discountType" defaultValue="PERCENTAGE">
                  <option value="PERCENTAGE">Pourcentage (%)</option>
                  <option value="FIXED">Montant fixe</option>
                </Select>
              </Field>
              <Field label="Valeur" htmlFor="discountValue">
                <Input id="discountValue" name="discountValue" type="number" min={1} step="any" required />
              </Field>
              <Field label="Montant minimum de commande (facultatif)" htmlFor="minOrderAmount">
                <Input id="minOrderAmount" name="minOrderAmount" type="number" min={0} defaultValue={0} />
              </Field>
              <Field label="Limite d'utilisation (facultatif)" htmlFor="usageLimit" hint="Nombre de commandes max">
                <Input id="usageLimit" name="usageLimit" type="number" min={1} />
              </Field>
              <Field label="Actif à partir du (facultatif)" htmlFor="startsAt">
                <Input id="startsAt" name="startsAt" type="date" />
              </Field>
              <Field label="Actif jusqu'au (facultatif)" htmlFor="endsAt">
                <Input id="endsAt" name="endsAt" type="date" />
              </Field>
            </div>

            {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
            {state?.success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
            )}

            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Création..." : "Créer le code"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {promoCodes.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun code promo pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {promoCodes.map((promo) => (
            <Card key={promo.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold text-zinc-900">{promo.code}</span>
                    <Badge tone={promo.active ? "emerald" : "zinc"}>{promo.active ? "Actif" : "Désactivé"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {promo.discountType === "PERCENTAGE" ? `-${promo.discountValue}%` : `-${formatMoney(promo.discountValue)}`}
                    {promo.minOrderAmount > 0 && ` · minimum ${formatMoney(promo.minOrderAmount)}`}
                    {" · "}
                    {promo.usedCount} utilisation{promo.usedCount > 1 ? "s" : ""}
                    {promo.usageLimit != null ? ` / ${promo.usageLimit}` : ""}
                  </p>
                  {(promo.startsAt || promo.endsAt) && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {promo.startsAt ? `Du ${formatDateTime(promo.startsAt)}` : ""}
                      {promo.startsAt && promo.endsAt ? " " : ""}
                      {promo.endsAt ? `Au ${formatDateTime(promo.endsAt)}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={transitionPending}
                    onClick={() => handleToggle(promo.id, !promo.active)}
                  >
                    {promo.active ? "Désactiver" : "Activer"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={transitionPending}
                    onClick={() => handleDelete(promo.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
