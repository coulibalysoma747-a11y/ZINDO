"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bike, FileText, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Empty";
import { formatMoney, formatDateTime } from "@/lib/format";
import type { VehicleSaleListItem } from "@/lib/actions/vehicle-sales";

export function VehicleSalesHistory({ sales, currency }: { sales: VehicleSaleListItem[]; currency: string }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) => s.number.toLowerCase().includes(q) || s.customerLabel.toLowerCase().includes(q) || (s.chassisNumber ?? "").toLowerCase().includes(q)
    );
  }, [sales, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bike className="h-5 w-5 text-zindo-green-600" />
        <h1 className="text-xl font-bold text-zinc-900">Vente Engins</h1>
      </div>

      <Link href="/vente-engin/nouveau">
        <Card className="flex items-center gap-3 border-zindo-green-200 p-4 transition hover:border-zindo-green-400 hover:bg-zindo-green-50/40">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zindo-green-100 text-zindo-green-700">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">Facture A4</p>
            <p className="text-sm text-zinc-500">Vente d&apos;engin</p>
          </div>
        </Card>
      </Link>

      <div>
        <h2 className="mb-2 font-semibold text-zinc-900">Historique des ventes d&apos;engins</h2>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (réf, client, châssis...)"
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Aucune vente d'engin" description="Les ventes réalisées depuis ce module apparaîtront ici." />
        ) : (
          <>
            <Card className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Réf.</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Châssis</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((s) => (
                    <tr key={s.saleId} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <Link href={`/ventes/${s.saleId}`} className="font-mono text-xs text-emerald-600 hover:underline">
                          {s.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(s.createdAt))}</td>
                      <td className="px-4 py-3 text-zinc-600">{s.customerLabel}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">{s.chassisNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatMoney(s.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="space-y-2 sm:hidden">
              {filtered.map((s) => (
                <Link key={s.saleId} href={`/ventes/${s.saleId}`}>
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-emerald-600">{s.number}</span>
                      <span className="font-semibold text-zinc-900">{formatMoney(s.total, currency)}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">{s.customerLabel}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDateTime(new Date(s.createdAt))} {s.chassisNumber ? `· ${s.chassisNumber}` : ""}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
