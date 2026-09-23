"use client";

import { useActionState, useState } from "react";
import { Camera, IdCard, UserRound } from "lucide-react";
import { submitVerificationAction } from "@/lib/actions/market-verification";

const MAX_SIDE = 1600;

/**
 * Réduit une photo de téléphone (souvent 3-6 Mo) à ~1600 px en JPEG avant
 * l'envoi : les 3 photos doivent tenir dans la limite des server actions
 * (next.config.ts, 4 Mo) tout en gardant la pièce d'identité lisible.
 */
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function PhotoField({ name, label, hint, capture, icon: Icon }: {
  name: string;
  label: string;
  hint: string;
  capture: "user" | "environment";
  icon: typeof Camera;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-3 hover:border-zindo-green-500">
      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-8 w-8 text-zinc-400" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-zindo-ink-900">{label}</p>
        <p className="text-xs text-zinc-500">{preview ? "Photo prise ✓ (touchez pour la refaire)" : hint}</p>
      </div>
      <input
        type="file"
        name={name}
        accept="image/*"
        capture={capture}
        required
        className="sr-only"
        onChange={async (e) => {
          const input = e.currentTarget;
          const f = input.files?.[0];
          if (!f) return setPreview(null);
          const small = await compressImage(f);
          const dt = new DataTransfer();
          dt.items.add(small);
          input.files = dt.files;
          setPreview(URL.createObjectURL(small));
        }}
      />
    </label>
  );
}

export function VerificationForm() {
  const [state, action, pending] = useActionState(submitVerificationAction, undefined);
  if (state?.success) {
    return <p className="rounded-2xl bg-zindo-green-100 p-4 text-sm font-semibold text-zindo-green-700">{state.success}</p>;
  }
  return (
    <form action={action} className="space-y-3">
      <PhotoField name="idFront" label="Pièce d'identité : recto" hint="Face avec votre photo, bien lisible" capture="environment" icon={IdCard} />
      <PhotoField name="idBack" label="Pièce d'identité : verso" hint="L'arrière de la même pièce" capture="environment" icon={IdCard} />
      <PhotoField name="selfie" label="Votre photo (selfie)" hint="Votre visage, bien éclairé, sans lunettes" capture="user" icon={UserRound} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-zindo-green-500 py-3.5 text-sm font-bold text-white hover:bg-zindo-green-600 disabled:opacity-60"
      >
        {pending ? "Envoi des photos…" : "Envoyer ma demande de vérification"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        Vos documents restent privés : seule l&apos;équipe ZINDO peut les voir, uniquement pour vous vérifier.
      </p>
    </form>
  );
}
