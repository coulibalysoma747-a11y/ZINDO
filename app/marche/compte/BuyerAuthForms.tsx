"use client";

import { useActionState, useState } from "react";
import { loginBuyerAction, signupBuyerAction, type BuyerAuthState } from "@/lib/actions/market-buyer";

const inputClass = "mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm";

export function BuyerAuthForms({ initialMode, suite }: { initialMode: "login" | "signup"; suite: string }) {
  const [mode, setMode] = useState(initialMode);
  const [kind, setKind] = useState<"PARTICULIER" | "PRO">("PARTICULIER");
  const [loginState, loginAction, loginPending] = useActionState<BuyerAuthState, FormData>(loginBuyerAction, undefined);
  const [signupState, signupAction, signupPending] = useActionState<BuyerAuthState, FormData>(signupBuyerAction, undefined);

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
      <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-semibold">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={mode === m ? "rounded-lg bg-white py-2 shadow-sm" : "py-2 text-zinc-500"}>
            {m === "login" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form action={loginAction} className="space-y-3">
          <input type="hidden" name="suite" value={suite} />
          <label className="block text-sm font-medium text-zinc-700">
            Numéro de téléphone
            <input name="phone" inputMode="tel" required autoComplete="tel" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Mot de passe
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
          </label>
          {loginState?.error && <p className="text-sm text-red-600">{loginState.error}</p>}
          <button disabled={loginPending} className="h-11 w-full rounded-xl bg-zindo-green-600 font-semibold text-white disabled:opacity-50">
            {loginPending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      ) : (
        <form action={signupAction} className="space-y-3">
          <input type="hidden" name="suite" value={suite} />
          <input type="hidden" name="kind" value={kind} />
          <p className="text-sm text-zinc-600">Gratuit : suivez vos commandes et commandez en quelques secondes.</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button type="button" onClick={() => setKind("PARTICULIER")} className={kind === "PARTICULIER" ? "rounded-xl border-2 border-zindo-green-600 bg-zindo-green-50 py-2 font-semibold" : "rounded-xl border border-zinc-300 py-2"}>
              📱 Particulier
            </button>
            <button type="button" onClick={() => setKind("PRO")} className={kind === "PRO" ? "rounded-xl border-2 border-zindo-green-600 bg-zindo-green-50 py-2 font-semibold" : "rounded-xl border border-zinc-300 py-2"}>
              🏢 Professionnel
            </button>
          </div>
          <label className="block text-sm font-medium text-zinc-700">
            Nom et prénom
            <input name="name" required autoComplete="name" className={inputClass} />
          </label>
          {kind === "PRO" && (
            <label className="block text-sm font-medium text-zinc-700">
              Nom de l&apos;entreprise
              <input name="companyName" required className={inputClass} />
            </label>
          )}
          <label className="block text-sm font-medium text-zinc-700">
            Numéro de téléphone
            <input name="phone" inputMode="tel" required autoComplete="tel" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Ville
            <input name="city" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Mot de passe (6 caractères minimum)
            <input name="password" type="password" required minLength={6} autoComplete="new-password" className={inputClass} />
          </label>
          {signupState?.error && <p className="text-sm text-red-600">{signupState.error}</p>}
          <button disabled={signupPending} className="h-11 w-full rounded-xl bg-zindo-green-600 font-semibold text-white disabled:opacity-50">
            {signupPending ? "Création…" : "Créer mon compte"}
          </button>
        </form>
      )}
    </div>
  );
}
