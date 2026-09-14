import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zindo-green-50">
            <LifeBuoy className="h-6 w-6 text-zindo-green-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-zindo-ink-900 sm:text-2xl">Mot de passe oublié</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            La réinitialisation en libre-service arrive bientôt. En attendant, demandez à
            l&apos;administrateur de votre commerce de vous créer un nouveau mot de passe depuis{" "}
            <span className="font-medium text-zindo-ink-700">Utilisateurs</span>.
          </p>
        </div>
      </AuthCard>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm font-semibold text-zindo-green-600 hover:text-zindo-green-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la connexion
      </Link>
    </div>
  );
}
