"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerMarketSellerAction } from "@/lib/actions/market-seller";

const input = "w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zindo-green-500";

export function SellerSignupForm() {
  const [state, action, pending] = useActionState(registerMarketSellerAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" placeholder="Prénom" required className={input} />
        <input name="lastName" placeholder="Nom" required className={input} />
      </div>
      <input name="phone" placeholder="Téléphone (WhatsApp)" inputMode="tel" required className={input} />
      <input name="city" placeholder="Ville (ex. Ouagadougou)" required className={input} />
      <input name="sellerName" placeholder="Nom affiché (facultatif, ex. « Chez Awa »)" className={input} />
      <input name="password" type="password" placeholder="Mot de passe (6 caractères minimum)" required className={input} />
      <label className="flex items-start gap-2 text-xs text-zinc-600">
        <input type="checkbox" name="acceptTerms" className="mt-0.5" />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgu" className="underline">
            conditions d&apos;utilisation
          </Link>
        </span>
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-zindo-green-500 py-3.5 text-sm font-bold text-white hover:bg-zindo-green-600 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer mon compte vendeur gratuit"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-zindo-green-600">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
