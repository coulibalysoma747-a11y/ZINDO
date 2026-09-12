"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { resetUserPasswordAction } from "@/lib/actions/users";

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        title="Réinitialiser le mot de passe"
      >
        <KeyRound className="h-3.5 w-3.5" /> Mot de passe oublié
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSuccess(false);
          setPassword("");
          setError(null);
        }}
        title={`Réinitialiser le mot de passe de ${userName}`}
      >
        {success ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700">
              Mot de passe mis à jour. Communiquez-le à {userName} pour qu&apos;il/elle se reconnecte.
            </p>
            <div className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900">{password}</div>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Choisissez un nouveau mot de passe temporaire pour cet utilisateur. Il pourra le changer
              ensuite depuis son profil.
            </p>
            <Field label="Nouveau mot de passe" htmlFor="newPassword" hint="6 caractères minimum">
              <Input
                id="newPassword"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={pending || password.length < 6}
                onClick={() =>
                  startTransition(async () => {
                    const result = await resetUserPasswordAction(userId, password);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    setSuccess(true);
                    router.refresh();
                  })
                }
              >
                {pending ? "Enregistrement..." : "Réinitialiser"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
