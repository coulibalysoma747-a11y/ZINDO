"use client";

import { useActionState } from "react";

type State = { error?: string; success?: string } | undefined;

/**
 * useActionState dont l'état porte un compteur « n » qui augmente à chaque
 * succès : il sert de clé au formulaire pour le vider après enregistrement.
 */
export function useResettingAction(action: (prev: State, fd: FormData) => Promise<State>, onSuccess?: () => void) {
  return useActionState<(NonNullable<State> & { n?: number }) | undefined, FormData>(async (prev, fd) => {
    const res = await action(prev, fd);
    if (!res?.success) return { ...res, n: prev?.n };
    onSuccess?.();
    return { ...res, n: (prev?.n ?? 0) + 1 };
  }, undefined);
}
