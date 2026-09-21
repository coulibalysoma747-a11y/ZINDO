import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { getPendingGoogleSignupSession } from "@/lib/session";
import { cancelGoogleSignupAction } from "@/lib/actions/google-signup";
import { GoogleSignupCodeForm } from "./GoogleSignupCodeForm";

export default async function ConfirmerInscriptionGooglePage() {
  const pending = await getPendingGoogleSignupSession();
  if (!pending || !pending.code) redirect("/inscription-google");

  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        <div className="mb-6 text-center sm:text-left">
          <div className="mb-2 inline-flex items-center gap-2 text-zindo-green-600">
            <MailCheck className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-zindo-ink-900 sm:text-2xl">Confirmez votre e-mail</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Un code à 6 chiffres a été envoyé à <span className="font-medium text-zindo-ink-700">{pending.email}</span>.
          </p>
        </div>
        <GoogleSignupCodeForm />
      </AuthCard>
      <form action={cancelGoogleSignupAction} className="text-center">
        <button type="submit" className="text-sm text-zinc-500 hover:text-zindo-ink-700 hover:underline">
          Annuler l&apos;inscription
        </button>
      </form>
    </div>
  );
}
