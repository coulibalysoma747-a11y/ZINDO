"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { wipeBusinessDataAction, type WipeScope } from "@/lib/actions/danger-zone";

const SCOPE_BUTTONS: { scope: WipeScope; label: string }[] = [
  { scope: "products", label: "Vider produits" },
  { scope: "sales", label: "Vider ventes" },
  { scope: "purchases", label: "Vider achats" },
  { scope: "transfers", label: "Vider transferts" },
  { scope: "stock", label: "Vider stock" },
  { scope: "movements", label: "Vider mouvements" },
];

export function DangerZonePanel({ businessName, locations }: { businessName: string; locations: { id: string; name: string }[] }) {
  const [confirmName, setConfirmName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const isUnlocked = confirmName.trim() === businessName.trim();

  function run(scope: WipeScope, label: string) {
    if (!confirm(`${label} — action irréversible. Confirmer ?`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await wipeBusinessDataAction(scope, confirmName, locationId || undefined);
      setMessage(result.error ? { type: "error", text: result.error } : { type: "success", text: result.success ?? "" });
    });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div>
          <p className="font-bold text-red-700">Vider historiques entreprise</p>
          <p className="mt-1 text-sm text-red-600">
            Zone de danger : action irréversible. Vous pouvez supprimer les historiques pour toute l&apos;entreprise
            ou seulement une boutique.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label className="text-sm font-medium text-zinc-700">Périmètre de suppression</label>
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="mt-1">
            <option value="">Toute l&apos;entreprise</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700">
            Tapez « {businessName} » pour déverrouiller les boutons ci-dessous
          </label>
          <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className="mt-1" placeholder={businessName} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SCOPE_BUTTONS.map((b) => (
            <Button
              key={b.scope}
              type="button"
              variant="danger"
              size="sm"
              disabled={!isUnlocked || pending}
              onClick={() => run(b.scope, b.label)}
            >
              <Trash2 className="h-3.5 w-3.5" /> {b.label}
            </Button>
          ))}
        </div>

        {message && (
          <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
