"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Store, Warehouse } from "lucide-react";
import { LOCATION_COOKIE } from "@/lib/constants";

type LocationOption = { id: string; name: string; type: "BOUTIQUE" | "DEPOT" };

export function LocationSwitcher({
  locations,
  currentLocationId,
}: {
  locations: LocationOption[];
  currentLocationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (locations.length <= 1) {
    const only = locations[0];
    if (!only) return null;
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-slate-700">
        {only.type === "DEPOT" ? <Warehouse className="h-4 w-4" /> : <Store className="h-4 w-4" />}
        {only.name}
      </div>
    );
  }

  function handleChange(id: string) {
    document.cookie = `${LOCATION_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
      <Store className="h-4 w-4 shrink-0 text-zinc-400" />
      <select
        value={currentLocationId}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-zinc-800 outline-none"
      >
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.type === "DEPOT" ? "Dépôt · " : ""}
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
