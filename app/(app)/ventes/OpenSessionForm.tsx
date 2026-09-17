"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { openSessionAction, type ActionState } from "@/lib/actions/cash-sessions";

export function OpenSessionForm({ locationName }: { locationName: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(openSessionAction, undefined);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-900">
              <Wallet className="h-5 w-5 text-orange-500" />
              <h1 className="font-semibold">Ouvrir la session de caisse</h1>
            </div>
            <p className="text-sm text-zinc-500">
              Boutique : <span className="font-medium text-zinc-700">{locationName}</span>
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <form action={formAction} className="space-y-4">
            <Field
              label="Montant d'ouverture (fond de caisse)"
              htmlFor="openingAmount"
              hint="Le montant en espèces déjà présent dans la caisse avant les premières ventes."
            >
              <Input
                id="openingAmount"
                name="openingAmount"
                type="number"
                min={0}
                step="1"
                placeholder="0"
                required
                autoFocus
              />
            </Field>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? "Ouverture..." : "Ouvrir la session"}
            </Button>
            <p className="text-center text-xs text-zinc-400">
              Aucune vente ne peut être encaissée tant que la session n&apos;est pas ouverte.
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
