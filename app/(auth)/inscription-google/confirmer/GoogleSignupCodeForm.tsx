"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { confirmGoogleSignupCodeAction } from "@/lib/actions/google-signup";

export function GoogleSignupCodeForm() {
  const [state, action, pending] = useActionState(confirmGoogleSignupCodeAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-zindo-ink-700">
          Code de confirmation
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            required
            aria-invalid={state?.error ? true : undefined}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-center text-lg tracking-widest text-zindo-ink-900 placeholder:text-zinc-400 outline-none transition focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-100"
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
            <Loader2 className="h-[18px] w-[18px] animate-spin" /> Vérification...
          </>
        ) : (
          "Confirmer"
        )}
      </button>
    </form>
  );
}
