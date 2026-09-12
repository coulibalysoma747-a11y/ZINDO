"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createSupportTicketAction, type ActionState } from "@/lib/actions/support";

export function SupportForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createSupportTicketAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  // La page d'origine du problème voyage dans ?from= (posée par le lien de
  // navigation Support) : /support lui-même n'a aucun moyen de la connaître
  // via son propre chemin, qui est toujours "/support".
  const searchParams = useSearchParams();
  const originPage = searchParams.get("from") || "/support";

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="pageUrl" value={originPage} />
      <Field label="Objet" htmlFor="subject">
        <Input id="subject" name="subject" placeholder="Ex : Impossible d'imprimer un ticket" required autoFocus />
      </Field>
      <Field
        label="Décrivez le problème"
        htmlFor="message"
        hint="Plus vous donnez de détails (ce que vous vouliez faire, ce qui s'est passé), plus vite le support pourra vous aider."
      >
        <Textarea id="message" name="message" rows={5} required minLength={10} />
      </Field>
      <p className="text-xs text-zinc-400">
        Page concernée : <span className="font-mono">{originPage}</span> — transmise automatiquement au
        support pour qu&apos;il retrouve le même écran que vous.
      </p>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi..." : "Envoyer au support"}
      </Button>
    </form>
  );
}
