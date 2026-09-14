"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, ArrowRight, Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4 text-left">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zindo-ink-700">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="6 caractères minimum"
            required
            minLength={6}
            aria-invalid={state?.error ? true : undefined}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-11 text-[15px] text-zindo-ink-900 placeholder:text-zinc-400 outline-none transition focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-400 transition hover:text-zindo-ink-700 focus-visible:outline-2 focus-visible:outline-zindo-green-500"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-zindo-ink-700">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Retapez le mot de passe"
            required
            minLength={6}
            aria-invalid={state?.error ? true : undefined}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-[15px] text-zindo-ink-900 placeholder:text-zinc-400 outline-none transition focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-100"
          />
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="animate-zindo-fade-in rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zindo-green-500 text-[15px] font-bold tracking-wide text-white uppercase shadow-lg shadow-zindo-green-500/30 transition hover:bg-zindo-green-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zindo-green-600"
      >
        {pending ? (
          <>
            <Loader2 className="h-[18px] w-[18px] animate-spin" /> Enregistrement...
          </>
        ) : (
          <>
            Réinitialiser le mot de passe
            <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
