import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { getPendingGoogleSignupSession } from "@/lib/session";
import { GoogleSignupProfileForm } from "./GoogleSignupProfileForm";

export default async function InscriptionGooglePage() {
  const pending = await getPendingGoogleSignupSession();
  if (!pending) redirect("/login");
  if (pending.code) redirect("/inscription-google/confirmer");

  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-xl font-bold text-zindo-ink-900 sm:text-2xl">Presque terminé</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Connecté avec <span className="font-medium text-zindo-ink-700">{pending.email}</span> — quelques infos
            pour créer votre commerce sur ZINDO.
          </p>
        </div>
        <GoogleSignupProfileForm />
      </AuthCard>
    </div>
  );
}
