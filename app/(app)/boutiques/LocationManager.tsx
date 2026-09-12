"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Star, Store, Warehouse } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatMoney } from "@/lib/format";
import { toggleLocationActiveAction, setDefaultLocationAction } from "@/lib/actions/locations";
import { LocationFormModal } from "./LocationFormModal";

type LocationRow = {
  id: string;
  name: string;
  type: "BOUTIQUE" | "DEPOT";
  address: string | null;
  city: string | null;
  isDefault: boolean;
  active: boolean;
  stockValue: number;
  productCount: number;
};

export function LocationManager({ locations, currency }: { locations: LocationRow[]; currency: string }) {
  const [editing, setEditing] = useState<LocationRow | null | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const totalStockValue = locations.reduce((s, l) => s + l.stockValue, 0);

  return (
    <>
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Valeur totale du stock (toutes boutiques)</p>
            <p className="text-2xl font-bold text-zinc-900">{formatMoney(totalStockValue, currency)}</p>
          </div>
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" /> Nouvelle boutique
          </Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((l) => (
          <Card key={l.id}>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {l.type === "DEPOT" ? (
                    <Warehouse className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Store className="h-5 w-5 text-emerald-600" />
                  )}
                  <div>
                    <p className="font-medium text-zinc-900">{l.name}</p>
                    <p className="text-xs text-zinc-400">{l.city ?? l.address ?? "—"}</p>
                  </div>
                </div>
                <button onClick={() => setEditing(l)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {l.isDefault && <Badge tone="emerald">Par défaut</Badge>}
                <Badge tone={l.active ? "blue" : "zinc"}>{l.active ? "Active" : "Désactivée"}</Badge>
                <Badge tone="zinc">{l.type === "DEPOT" ? "Dépôt" : "Boutique"}</Badge>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Valeur du stock</p>
                <p className="font-semibold text-zinc-900">{formatMoney(l.stockValue, currency)}</p>
                <p className="text-xs text-zinc-400">{l.productCount} référence(s) en stock</p>
              </div>

              <div className="flex gap-2 pt-1">
                {!l.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await setDefaultLocationAction(l.id);
                        router.refresh();
                      })
                    }
                  >
                    <Star className="h-3.5 w-3.5" /> Définir par défaut
                  </Button>
                )}
                <ConfirmButton
                  variant={l.active ? "danger" : "secondary"}
                  label={
                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        l.active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                    >
                      {l.active ? "Désactiver" : "Réactiver"}
                    </span>
                  }
                  confirmTitle={l.active ? "Désactiver la boutique" : "Réactiver la boutique"}
                  confirmMessage={
                    l.active
                      ? "Cette boutique ne sera plus disponible pour les ventes, achats et mouvements de stock."
                      : "Cette boutique redeviendra disponible."
                  }
                  action={() => toggleLocationActiveAction(l.id, !l.active)}
                  onDone={() => router.refresh()}
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <LocationFormModal open={editing !== undefined} location={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
