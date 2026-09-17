"use client";

import { useActionState } from "react";
import { Field, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updatePlatformConfigAction, type ActionState } from "@/lib/actions/platform-admin";
import type { PlatformConfig } from "@/lib/platform-config";

export function PlatformConfigForm({ config }: { config: PlatformConfig }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updatePlatformConfigAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <input
            type="checkbox"
            name="maintenanceMode"
            defaultChecked={config.maintenanceMode}
            className="h-4 w-4 rounded accent-red-500"
          />
          Mode maintenance (bloque tout le monde sauf la console admin)
        </label>
        <Field label="Message affiché aux commerçants (facultatif)" htmlFor="maintenanceMessage">
          <Textarea
            id="maintenanceMessage"
            name="maintenanceMessage"
            rows={2}
            defaultValue={config.maintenanceMessage ?? ""}
            placeholder="Ex : Maintenance en cours, retour prévu à 22h."
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <input
            type="checkbox"
            name="announcementActive"
            defaultChecked={config.announcementActive}
            className="h-4 w-4 rounded accent-zindo-green-500"
          />
          Bannière d&apos;annonce (visible par tous les commerçants connectés)
        </label>
        <Field label="Message de l'annonce" htmlFor="announcementMessage">
          <Textarea
            id="announcementMessage"
            name="announcementMessage"
            rows={2}
            defaultValue={config.announcementMessage ?? ""}
            placeholder="Ex : Nouvelle fonctionnalité disponible : la boutique en ligne !"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            name="announcementTone"
            value="warning"
            defaultChecked={config.announcementTone === "warning"}
            className="h-4 w-4 rounded accent-amber-500"
          />
          Ton &laquo;&nbsp;avertissement&nbsp;&raquo; (orange) au lieu de &laquo;&nbsp;information&nbsp;&raquo; (bleu)
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
