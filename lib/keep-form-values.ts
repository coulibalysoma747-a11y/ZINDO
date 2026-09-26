"use client";

import { startTransition, type FormEvent } from "react";

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
