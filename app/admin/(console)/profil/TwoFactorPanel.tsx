"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  startAdminTotpEnrollmentAction,
  confirmAdminTotpEnrollmentAction,
  disableAdminTotpAction,
} from "@/lib/actions/admin-two-factor";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [enrollment, setEnrollment] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [disableState, disableAction, disablePending] = useActionState(disableAdminTotpAction, undefined);

  if (backupCodes) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Notez ces codes de secours dans un endroit sûr — chacun ne fonctionne qu&apos;une fois, et ils ne seront
          plus jamais affichés. Ils permettent de vous reconnecter si vous perdez votre téléphone.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 p-3 font-mono text-sm">
          {backupCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => {
            setBackupCodes(null);
            setEnrollment(null);
          }}
        >
          J&apos;ai noté mes codes
        </Button>
      </div>
    );
  }

  if (enrollment) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">
          Scannez ce QR code avec Google Authenticator, Authy ou une autre app d&apos;authentification, puis entrez
          le code affiché pour confirmer.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qrDataUrl} alt="QR code 2FA" className="mx-auto h-48 w-48" />
        <p className="text-center text-xs text-zinc-400">
          Vous ne pouvez pas scanner ? Entrez ce code manuellement :{" "}
          <span className="font-mono font-medium text-zinc-700">{enrollment.secret}</span>
        </p>
        <Field label="Code de vérification" htmlFor="admin-totp-confirm-code">
          <Input
            id="admin-totp-confirm-code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setEnrollment(null)} disabled={pending}>
            Annuler
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={pending || !code.trim()}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await confirmAdminTotpEnrollmentAction(enrollment.secret, code);
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                setIsEnabled(true);
                setBackupCodes(result.backupCodes);
                setCode("");
              });
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
          </Button>
        </div>
      </div>
    );
  }

  if (isEnabled && !disableState?.success) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-zindo-green-700">
          <ShieldCheck className="h-4 w-4" /> La double authentification est activée sur ce compte.
        </p>
        <form action={disableAction} className="space-y-3">
          <Field label="Confirmez avec votre code d'accès pour désactiver" htmlFor="admin-disable-totp-password">
            <Input id="admin-disable-totp-password" name="password" type="password" required />
          </Field>
          {disableState?.error && <p className="text-sm text-red-600">{disableState.error}</p>}
          <Button type="submit" variant="danger" disabled={disablePending}>
            <ShieldOff className="h-4 w-4" /> {disablePending ? "Désactivation..." : "Désactiver la 2FA"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Ajoutez une couche de sécurité : un code à 6 chiffres généré par une app d&apos;authentification, en plus de
        votre code d&apos;accès.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startAdminTotpEnrollmentAction();
            if ("error" in result) setError(result.error);
            else setEnrollment(result);
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activer la 2FA"}
      </Button>
    </div>
  );
}
