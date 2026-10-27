"use client";

import { useActionState, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { ArrowLeft, Fingerprint, Loader2 } from "lucide-react";
import {
  pinLoginAction,
  passkeyLoginOptionsAction,
  passkeyLoginVerifyAction,
  type QuickLoginState,
} from "@/lib/actions/quick-login";

type QuickUser = { id: string; name: string };

const TEXT = {
  fr: {
    title: "Connexion rapide",
    passkey: "Se connecter avec Face ID / empreinte",
    waiting: "Vérification...",
    pinFor: "Code PIN de",
    pinHint: "Tapez vos 4 chiffres",
    back: "Changer de personne",
    confirm: "Valider",
    or: "ou avec votre mot de passe",
    failed: "Face ID n'a pas fonctionné. Utilisez votre mot de passe.",
  },
  en: {
    title: "Quick sign-in",
    passkey: "Sign in with Face ID / fingerprint",
    waiting: "Checking...",
    pinFor: "PIN code for",
    pinHint: "Enter your 4 digits",
    back: "Switch person",
    confirm: "Confirm",
    or: "or with your password",
    failed: "Face ID did not work. Use your password.",
  },
} as const;

const noopSubscribe = () => () => {};
function useWebAuthnSupport() {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof window !== "undefined" && "PublicKeyCredential" in window,
    () => false
  );
}

function PinPad({ user, locale, onBack }: { user: QuickUser; locale: "fr" | "en"; onBack: () => void }) {
  const t = TEXT[locale];
  const [state, action, pending] = useActionState<QuickLoginState, FormData>(pinLoginAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="userId" value={user.id} />
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-3.5 w-3.5" /> {t.back}
      </button>
      <label htmlFor="quick-pin" className="block text-sm font-medium text-zindo-ink-700">
        {t.pinFor} <span className="font-bold text-zindo-blue-800">{user.name}</span>
      </label>
      <input
        id="quick-pin"
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        pattern="[0-9]{4}"
        placeholder="••••"
        autoFocus
        disabled={pending}
        onChange={(e) => {
          e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 4);
          if (e.currentTarget.value.length === 4) formRef.current?.requestSubmit();
        }}
        className="h-14 w-full rounded-xl border border-zinc-300 bg-white text-center text-2xl tracking-[0.6em] text-zindo-ink-900 outline-none focus:border-zindo-blue-500 focus:ring-2 focus:ring-zindo-blue-500/30"
      />
      <p className="text-center text-xs text-zinc-500">{pending ? t.waiting : t.pinHint}</p>
      <button type="submit" disabled={pending} className="h-11 w-full rounded-xl bg-zindo-blue-800 text-sm font-semibold text-white hover:bg-zindo-blue-700 disabled:opacity-60">
        {pending ? t.waiting : t.confirm}
      </button>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

/** Connexion par PIN (appareil de confiance) et par Face ID / empreinte. N'affiche rien si rien n'est activé. */
export function QuickLogin({ users, passkey, locale = "fr" }: { users: QuickUser[]; passkey: boolean; locale?: "fr" | "en" }) {
  const t = TEXT[locale];
  const router = useRouter();
  const supported = useWebAuthnSupport();
  const [selected, setSelected] = useState<QuickUser | null>(users.length === 1 ? users[0] : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPasskey = passkey && supported;
  if (users.length === 0 && !showPasskey) return null;

  async function loginWithPasskey() {
    setBusy(true);
    setError(null);
    try {
      const prepared = await passkeyLoginOptionsAction();
      if ("error" in prepared) {
        setError(prepared.error);
        return;
      }
      const response = await startAuthentication({ optionsJSON: prepared.options });
      const result = await passkeyLoginVerifyAction(response);
      if (result.ok) {
        router.push("/dashboard");
        return;
      }
      setError(result.error);
    } catch (e) {
      // L'utilisateur a simplement annulé la fenêtre de Face ID : pas de message d'erreur.
      if (!(e instanceof Error && e.name === "NotAllowedError")) setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={t.title} className="mb-5 space-y-3 rounded-2xl bg-zindo-blue-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-zindo-blue-800">{t.title}</p>

      {showPasskey && (
        <button
          type="button"
          onClick={loginWithPasskey}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zindo-blue-800 text-[15px] font-semibold text-white transition-colors hover:bg-zindo-blue-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
          {busy ? t.waiting : t.passkey}
        </button>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {users.length > 0 &&
        (selected ? (
          <PinPad user={selected} locale={locale} onBack={() => setSelected(null)} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u)}
                className="flex items-center gap-2.5 rounded-xl border border-zindo-blue-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-zindo-blue-800 transition-colors hover:border-zindo-blue-400"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zindo-blue-800 text-xs font-bold text-white">
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{u.name}</span>
              </button>
            ))}
          </div>
        ))}

      <p className="pt-1 text-center text-xs text-zinc-500">{t.or}</p>
    </section>
  );
}
