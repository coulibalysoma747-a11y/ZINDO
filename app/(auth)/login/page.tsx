import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "./login-form";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  "google-non-configure": "La connexion avec Google n'est pas encore configurée pour ZINDO.",
  "google-echec": "La connexion avec Google a échoué. Réessayez.",
  "google-email-non-verifie": "Votre adresse e-mail Google n'est pas vérifiée.",
  "google-aucun-compte": "Aucun compte ZINDO n'est associé à cette adresse Google. Créez d'abord un compte.",
  "google-compte-desactive": "Ce compte a été désactivé. Contactez votre administrateur.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const googleError = error ? GOOGLE_ERROR_MESSAGES[error] : undefined;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-xl font-bold text-zindo-navy-900 sm:text-2xl">
            Bienvenue sur <span className="text-zindo-orange-600">ZINDO</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Connectez-vous à votre compte</p>
        </div>
        <LoginForm googleError={googleError} />
      </AuthCard>

      <p className="text-center text-sm text-zinc-500">
        Vous n&apos;avez pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-zindo-orange-600 hover:text-zindo-orange-700 hover:underline">
          Créer un compte
        </Link>
      </p>

      <div className="flex items-center justify-center gap-2 px-4 py-2 text-center">
        <ShieldCheck className="h-4 w-4 shrink-0 text-zindo-green-600" />
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zindo-navy-700">Vos données sont protégées</span> — sécurisé et
          confidentiel
        </p>
      </div>
    </div>
  );
}
