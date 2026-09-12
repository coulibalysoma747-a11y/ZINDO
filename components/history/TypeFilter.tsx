"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Input";

const TYPES = [
  { value: "", label: "Tous les types" },
  { value: "ventes", label: "Ventes" },
  { value: "achats", label: "Achats" },
  { value: "entrees", label: "Entrées de stock" },
  { value: "sorties", label: "Sorties de stock" },
  { value: "credits", label: "Crédits" },
  { value: "paiements", label: "Paiements" },
];

export function TypeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("type", value);
    else params.delete("type");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      defaultValue={searchParams.get("type") ?? ""}
      onChange={(e) => select(e.target.value)}
      className="sm:w-56"
    >
      {TYPES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </Select>
  );
}
