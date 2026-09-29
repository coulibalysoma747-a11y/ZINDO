"use client";

import { useActionState } from "react";
import { updateBuyerProfileAction, type BuyerProfileState } from "@/lib/actions/market-buyer";
import { CountryCityPicker } from "@/components/ui/CountryCityPicker";

const inputClass = "mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm";

/** « Mes informations » de l'acheteur : nom, entreprise (compte pro), pays et ville. */
export function BuyerProfileForm({ buyer }: { buyer: { name: string; kind: "PARTICULIER" | "PRO"; companyName: string | null; countryCode: string; city: string | null } }) {
  const [state, action, pending] = useActionState<BuyerProfileState, FormData>(updateBuyerProfileAction, undefined);
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
      <p className="font-semibold text-zinc-900">Mes informations</p>
      <label className="block text-sm font-medium text-zinc-700">
        Nom et prénom
        <input name="name" required defaultValue={buyer.name} className={inputClass} />
      </label>
      {buyer.kind === "PRO" && (
        <label className="block text-sm font-medium text-zinc-700">
          Nom de l&apos;entreprise
          <input name="companyName" required defaultValue={buyer.companyName ?? ""} className={inputClass} />
        </label>
      )}
      <CountryCityPicker countryName="countryCode" defaultCountry={buyer.countryCode} defaultCity={buyer.city ?? ""} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button disabled={pending} className="h-11 w-full rounded-xl bg-zindo-green-600 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
