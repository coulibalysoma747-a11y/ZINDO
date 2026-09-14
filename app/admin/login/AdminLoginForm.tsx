"use client";

import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";
import { superAdminLoginAction, type ActionState } from "@/lib/actions/admin-auth";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(superAdminLoginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-400">
          E-mail
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            placeholder="vous@example.com"
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-zindo-green-500 focus:ring-2 focus:ring-zindo-green-500/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-400">
          Code d&apos;accès
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-zindo-green-500 focus:ring-2 focus:ring-zindo-green-500/20"
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-lg bg-zindo-green-500 text-sm font-semibold text-white transition-colors hover:bg-zindo-green-600 disabled:bg-zindo-green-800 disabled:text-zindo-green-300"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
