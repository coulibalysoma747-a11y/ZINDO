"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Phone, ArrowRight, Loader2 } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

export function LoginForm({ googleError }: { googleError?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-zindo-navy-700">
            Téléphone ou e-mail
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
            <input
              id="identifier"
              name="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="Numéro de téléphone ou e-mail"
              required
              aria-invalid={state?.error ? true : undefined}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-[15px] text-zindo-navy-900 placeholder:text-zinc-400 outline-none transition focus:border-zindo-orange-500 focus:ring-4 focus:ring-zindo-orange-100"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="password" className="text-sm font-medium text-zindo-navy-700">
              Mot de passe
            </label>
            <Link
              href="/mot-de-passe-oublie"
              className="text-sm font-medium text-zindo-orange-600 hover:text-zindo-orange-700 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Mot de passe"
              required
              aria-invalid={state?.error ? true : undefined}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-11 text-[15px] text-zindo-navy-900 placeholder:text-zinc-400 outline-none transition focus:border-zindo-orange-500 focus:ring-4 focus:ring-zindo-orange-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-400 transition hover:text-zindo-navy-700 focus-visible:outline-2 focus-visible:outline-zindo-orange-500"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
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
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zindo-orange-500 text-[15px] font-bold tracking-wide text-white uppercase shadow-lg shadow-zindo-orange-500/30 transition hover:bg-zindo-orange-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zindo-orange-600"
        >
          {pending ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" /> Connexion...
            </>
          ) : (
            <>
              Se connecter
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-medium text-zinc-400">OU</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <div>
        <a
          href="/api/auth/google"
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-200 bg-white text-[15px] font-medium text-zindo-navy-700 transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zindo-navy-500"
        >
          <GoogleIcon className="h-5 w-5" />
          Se connecter avec Google
        </a>
        {googleError && (
          <p role="alert" className="animate-zindo-fade-in mt-2 text-center text-xs text-red-600">
            {googleError}
          </p>
        )}
      </div>
    </div>
  );
}
