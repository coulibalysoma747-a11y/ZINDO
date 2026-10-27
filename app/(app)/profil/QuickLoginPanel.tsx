"use client";

import { useActionState, useState, useSyncExternalStore, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, KeyRound, Trash2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  passkeyRegisterOptionsAction,
  passkeyRegisterVerifyAction,
  removePasskeyAction,
  removePinAction,
  setPinAction,
  trustDeviceAction,
  untrustDeviceAction,
  type QuickLoginState,
} from "@/lib/actions/quick-login";

type PasskeyItem = { id: string; label: string | null; createdAt: string };

const noopSubscribe = () => () => {};
function useWebAuthnSupport() {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof window !== "undefined" && "PublicKeyCredential" in window,
    () => false
  );
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iPhone / iPad";
  if (/Android/.test(ua)) return "Téléphone Android";
  if (/Windows/.test(ua)) return "PC Windows";
  if (/Macintosh/.test(ua)) return "Mac";
  return "Cet appareil";
}

function Message({ state }: { state: QuickLoginState }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-emerald-700">{state.success}</p>;
  return null;
}

export function QuickLoginPanel({
  ready,
  pinSet,
  deviceTrusted,
  totpEnabled,
  passkeys,
}: {
  ready: boolean;
  pinSet: boolean;
  deviceTrusted: boolean;
  totpEnabled: boolean;
  passkeys: PasskeyItem[];
}) {
  const supported = useWebAuthnSupport();
  const [pinState, pinAction, pinPending] = useActionState<QuickLoginState, FormData>(setPinAction, undefined);
  const [showPinForm, setShowPinForm] = useState(false);
  const [note, setNote] = useState<QuickLoginState>(undefined);
  const [busy, startTransition] = useTransition();
  const [registering, setRegistering] = useState(false);

  if (!ready) {
    return (
      <p className="text-sm text-amber-700">
        La connexion rapide n&apos;est pas encore prête : la mise à jour de la base de données reste à faire.
      </p>
    );
  }

  function run(action: () => Promise<QuickLoginState>) {
    startTransition(async () => setNote(await action()));
  }

  async function addPasskey() {
    setRegistering(true);
    setNote(undefined);
    try {
      const prepared = await passkeyRegisterOptionsAction();
      if ("error" in prepared) {
        setNote({ error: prepared.error });
        return;
      }
      const response = await startRegistration({ optionsJSON: prepared.options });
      setNote(await passkeyRegisterVerifyAction(response, deviceLabel()));
    } catch (e) {
      if (!(e instanceof Error && e.name === "NotAllowedError")) {
        setNote({ error: "Face ID n'a pas pu être enregistré sur cet appareil." });
      }
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Connectez-vous plus vite, sans retaper votre mot de passe. Votre mot de passe reste toujours disponible.
      </p>

      {/* Code PIN */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-medium text-zinc-900">
          <KeyRound className="h-4 w-4 text-zindo-blue-600" /> Code PIN (4 chiffres)
        </h3>
        {totpEnabled ? (
          <p className="text-sm text-zinc-500">
            Le PIN n&apos;est pas disponible avec la double authentification (2FA). Utilisez Face ID ou votre mot de passe.
          </p>
        ) : (
          <>
            {pinSet && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">PIN actif</span>
                <span className="text-zinc-500">
                  {deviceTrusted ? "Fonctionne sur cet appareil." : "Pas encore activé sur cet appareil."}
                </span>
              </div>
            )}
            {pinSet && !showPinForm && (
              <div className="flex flex-wrap gap-2">
                {deviceTrusted ? (
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => run(untrustDeviceAction)}>
                    Désactiver sur cet appareil
                  </Button>
                ) : (
                  <Button type="button" size="sm" disabled={busy} onClick={() => run(trustDeviceAction)}>
                    Activer sur cet appareil
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPinForm(true)}>
                  Changer mon PIN
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => run(removePinAction)}>
                  Supprimer mon PIN
                </Button>
              </div>
            )}
            {(!pinSet || showPinForm) && (
              <form action={pinAction} className="space-y-3">
                <Field label="Votre mot de passe (pour confirmer)" htmlFor="pinPassword">
                  <Input id="pinPassword" name="currentPassword" type="password" autoComplete="current-password" required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nouveau PIN" htmlFor="pin">
                    <Input id="pin" name="pin" type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="off" required />
                  </Field>
                  <Field label="Confirmer le PIN" htmlFor="pinConfirm">
                    <Input id="pinConfirm" name="pinConfirm" type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="off" required />
                  </Field>
                </div>
                <Message state={pinState} />
                <Button type="submit" disabled={pinPending}>
                  {pinPending ? "Enregistrement..." : pinSet ? "Changer mon PIN" : "Créer mon PIN"}
                </Button>
              </form>
            )}
          </>
        )}
      </div>

      {/* Face ID / empreinte */}
      <div className="space-y-3 border-t border-zinc-100 pt-6">
        <h3 className="flex items-center gap-2 font-medium text-zinc-900">
          <Fingerprint className="h-4 w-4 text-zindo-blue-600" /> Face ID, empreinte ou Windows Hello
        </h3>
        {passkeys.length > 0 && (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">{p.label ?? "Appareil"}</span>
                  <span className="ml-2 text-xs text-zinc-500">ajouté le {new Date(p.createdAt).toLocaleDateString("fr-FR")}</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => removePasskeyAction(p.id))}
                  aria-label="Supprimer cette clé"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {supported ? (
          <Button type="button" variant="outline" disabled={registering} onClick={addPasskey}>
            {registering ? "En attente de votre appareil..." : "Ajouter Face ID / empreinte sur cet appareil"}
          </Button>
        ) : (
          <p className="text-sm text-zinc-500">Cet appareil ou ce navigateur ne permet pas Face ID ni l&apos;empreinte.</p>
        )}
        <p className="text-xs text-zinc-500">
          Votre visage ou votre empreinte ne quittent jamais votre appareil : ZINDO ne reçoit qu&apos;une signature.
        </p>
      </div>

      <Message state={note} />
    </div>
  );
}
