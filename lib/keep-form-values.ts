"use client";

import { startTransition, useEffect, useRef, type FormEvent } from "react";

/**
 * Avec React 19, un `<form action={action}>` vide tous ses champs après
 * l'envoi, même quand le serveur répond par une erreur (« numéro déjà
 * utilisé », « mot de passe incorrect »…) : le commerçant devait alors tout
 * retaper. En passant par `onSubmit={keepFormValues(action)}`, l'action de
 * `useActionState` est appelée de la même façon (état « pending » et
 * redirections compris), mais les champs gardent ce qui a été saisi.
 * La validation du navigateur (`required`, `minLength`…) reste active : le
 * navigateur ne déclenche `submit` que si elle est passée.
 *
 * Garder aussi `action={action}` sur le formulaire : si le commerçant appuie
 * avant la fin du chargement de la page (réseau lent), c'est lui qui envoie en
 * POST ; sans lui, le navigateur enverrait un GET avec le mot de passe dans
 * l'adresse. Une fois la page chargée, React voit que `onSubmit` a annulé
 * l'envoi et lancé la transition : il n'appelle pas l'action une 2e fois.
 */
export function keepFormValues(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}

/**
 * Variante pour les formulaires de l'application (`<form action={action}>`
 * de `useActionState`) : le comportement de React ne change pas en cas de
 * succès (le formulaire se vide comme avant, pour ne pas enregistrer deux
 * fois la même chose), mais quand le serveur répond par une erreur, les
 * champs sont remis tels que le commerçant les avait saisis.
 *
 * Usage : `const keep = useKeepValuesOnError(state);` puis
 * `<form onSubmit={keep} action={action}>`.
 */
export function useKeepValuesOnError(state: object | null | undefined) {
  const submitted = useRef<{ form: HTMLFormElement; entries: [string, FormDataEntryValue][] } | null>(null);

  // Effet passif : il passe après la remise à zéro du formulaire que React
  // fait à la fin de l'action.
  useEffect(() => {
    const saved = submitted.current;
    submitted.current = null;
    const failed = !!state && "error" in state && !!state.error;
    if (saved && failed && saved.form.isConnected) restoreFormValues(saved.form, saved.entries);
  }, [state]);

  return (event: FormEvent<HTMLFormElement>) => {
    submitted.current = { form: event.currentTarget, entries: [...new FormData(event.currentTarget)] };
  };
}

function restoreFormValues(form: HTMLFormElement, entries: [string, FormDataEntryValue][]) {
  const byName = new Map<string, string[]>();
  for (const [name, value] of entries) {
    if (typeof value !== "string") continue;
    byName.set(name, [...(byName.get(name) ?? []), value]);
  }
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
    if (!el.name) continue;
    const values = byName.get(el.name) ?? [];
    if (el instanceof HTMLInputElement) {
      // Les champs cachés sont pilotés par le code, les fichiers ne peuvent
      // pas être remis par programme.
      if (el.type === "hidden" || el.type === "file" || el.type === "submit" || el.type === "button") continue;
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = values.includes(el.value);
        continue;
      }
    }
    if (el instanceof HTMLSelectElement && el.multiple) {
      for (const option of Array.from(el.options)) option.selected = values.includes(option.value);
      continue;
    }
    el.value = values[0] ?? "";
  }
}
