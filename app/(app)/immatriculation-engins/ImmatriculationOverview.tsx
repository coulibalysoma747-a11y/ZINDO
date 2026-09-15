"use client";

import { useMemo, useState } from "react";
import {
  IdCard,
  Layers,
  Clock,
  ClipboardList,
  CreditCard,
  Landmark,
  FileText,
  FileCheck,
  BadgeCheck,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Empty";
import { formatMoney } from "@/lib/format";
import { REGISTRATION_STATUS_LABELS, type RegistrationStatus } from "@/lib/vehicle-registration-status";
import type { VehicleRegistrationListItem, VehicleRegistrationCounts } from "@/lib/actions/vehicle-registrations";
import { DossierPanel } from "./DossierPanel";

const STATUS_TONE: Record<RegistrationStatus, "zinc" | "amber" | "blue" | "emerald" | "red"> = {
  EN_ATTENTE_PAIEMENT: "red",
  WW_A_EMETTRE: "amber",
  WW_EMIS: "blue",
  DEPOSE_MINISTERE: "blue",
  RECEPISSE_RECU: "blue",
  RECEPISSE_REMIS: "blue",
  CARTE_GRISE_RECUE: "blue",
  REMISE_AU_CLIENT: "emerald",
};

type FilterKey =
  | "total"
  | "enAttentePaiement"
  | "wwAEmettre"
  | "wwEmis"
  | "deposeMinistere"
  | "recepisseARemettre"
  | "recepisseRemis"
  | "carteGriseARemettre"
  | "termines"
  | "sansCmc";

export function ImmatriculationOverview({
  dossiers,
  counts,
  currency,
}: {
  dossiers: VehicleRegistrationListItem[];
  counts: VehicleRegistrationCounts;
  currency: string;
}) {
  const [filter, setFilter] = useState<FilterKey>("total");
  const [search, setSearch] = useState("");
  const [openDossierId, setOpenDossierId] = useState<string | null>(null);

  const cards: { key: FilterKey; label: string; value: number; sub?: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
    { key: "total", label: "Total", value: counts.total, icon: Layers, tone: "text-zinc-500" },
    {
      key: "enAttentePaiement",
      label: "En attente paiement",
      value: counts.enAttentePaiement,
      sub: counts.enAttentePaiementDue > 0 ? `${formatMoney(counts.enAttentePaiementDue, currency)} dû` : undefined,
      icon: Clock,
      tone: "text-red-500",
    },
    { key: "wwAEmettre", label: "WW à émettre", value: counts.wwAEmettre, icon: ClipboardList, tone: "text-amber-500" },
    { key: "wwEmis", label: "WW émis", value: counts.wwEmis, icon: CreditCard, tone: "text-blue-500" },
    { key: "deposeMinistere", label: "Déposé au ministère", value: counts.deposeMinistere, icon: Landmark, tone: "text-indigo-500" },
    { key: "recepisseARemettre", label: "Récépissé à remettre", value: counts.recepisseARemettre, sub: "reçu, pas encore remis", icon: FileText, tone: "text-teal-500" },
    { key: "recepisseRemis", label: "Récépissé remis", value: counts.recepisseRemis, icon: FileCheck, tone: "text-blue-500" },
    { key: "carteGriseARemettre", label: "Carte grise à remettre", value: counts.carteGriseARemettre, icon: IdCard, tone: "text-indigo-500" },
    { key: "termines", label: "Terminés", value: counts.termines, icon: BadgeCheck, tone: "text-emerald-500" },
    { key: "sansCmc", label: "Sans CMC", value: counts.sansCmc, icon: AlertTriangle, tone: "text-red-500" },
  ];

  const filterLabel = cards.find((c) => c.key === filter)?.label ?? "Total";

  function matchesFilter(d: VehicleRegistrationListItem, key: FilterKey) {
    switch (key) {
      case "total":
        return true;
      case "enAttentePaiement":
        return d.status === "EN_ATTENTE_PAIEMENT";
      case "wwAEmettre":
        return d.status === "WW_A_EMETTRE";
      case "wwEmis":
        return d.wwIssued;
      case "deposeMinistere":
        return d.ministryDeposited;
      case "recepisseARemettre":
        return d.receiptReceived && !d.receiptHanded;
      case "recepisseRemis":
        return d.receiptHanded;
      case "carteGriseARemettre":
        return d.grayCardReceived && !d.grayCardHanded;
      case "termines":
        return d.status === "REMISE_AU_CLIENT";
      case "sansCmc":
        return !d.cmcAvailable;
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dossiers.filter((d) => matchesFilter(d, filter)).filter(
      (d) =>
        !q ||
        d.saleNumber.toLowerCase().includes(q) ||
        d.customerLabel.toLowerCase().includes(q) ||
        (d.chassisNumber ?? "").toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossiers, filter, search]);

  const openDossier = dossiers.find((d) => d.id === openDossierId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <IdCard className="h-5 w-5 text-zindo-green-600" />
        <h1 className="text-xl font-bold text-zinc-900">Immatriculation Engins</h1>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-500">
          Vue d&apos;ensemble — <span className="italic">cliquez une carte pour filtrer</span>
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                filter === c.key ? "border-zindo-green-400 bg-zindo-green-50" : "border-zinc-200 bg-white hover:border-zindo-green-300"
              }`}
            >
              <c.icon className={`h-4 w-4 ${c.tone}`} />
              <p className={`mt-1.5 text-xl font-bold ${c.tone}`}>{c.value}</p>
              <p className="text-xs text-zinc-500">{c.label}</p>
              {c.sub && <p className="text-[10px] text-zinc-400">{c.sub}</p>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-zinc-900">
          Dossiers d&apos;immatriculation <span className="font-normal text-zinc-400">· {filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
        </h2>

        {filter !== "total" && (
          <button
            type="button"
            onClick={() => setFilter("total")}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-zindo-green-100 px-3 py-1 text-xs font-medium text-zindo-green-800 hover:bg-zindo-green-200"
          >
            {filterLabel} <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (réf, client, châssis...)" className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Aucun dossier dans cette catégorie" />
        ) : (
          <div className="space-y-2">
            {filtered.map((d) => (
              <button key={d.id} type="button" onClick={() => setOpenDossierId(d.id)} className="block w-full text-left">
                <Card className="p-3 hover:border-zindo-green-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-emerald-600">{d.saleNumber}</p>
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {d.customerLabel} · {d.designation} {d.chassisNumber ? `· Châssis ${d.chassisNumber}` : ""}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[d.status]} className="shrink-0">
                      {REGISTRATION_STATUS_LABELS[d.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{formatMoney(d.total, currency)}</span>
                    {d.remaining > 0 && <span className="font-medium text-red-600">Reste {formatMoney(d.remaining, currency)}</span>}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {openDossier && <DossierPanel dossier={openDossier} currency={currency} onClose={() => setOpenDossierId(null)} />}
    </div>
  );
}
