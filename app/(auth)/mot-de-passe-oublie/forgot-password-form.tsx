"use client";

import { useActionState } from "react";
import { Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zindo-green-50 text-zindo-green-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="text-sm text-zinc-600">
          Si un compte ZINDO est associé à cette adresse, un e-mail avec un lien de réinitialisation vient
          d&apos;être envoyé. Pensez à vérifier vos spams.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 text-left">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zindo-ink-700">
          Adresse e-mail
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="vous@exemple.com"
            required
            aria-invalid={state?.error ? true : undefined}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-[15px] text-zindo-ink-900 placeholder:text-zinc-400 outline-none transition focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-100"
          />
        </div>
        <p className="mt-1.5 text-xs text-zinc-400">
          L&apos;e-mail renseigné sur votre compte ZINDO (pas le numéro de téléphone).
        </p>
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
            <Loader2 className="h-[18px] w-[18px] animate-spin" /> Envoi...
          </>
        ) : (
          <>
            Envoyer le lien
            <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
