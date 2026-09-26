import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { getPlatformConfig } from "@/lib/platform-config";
import { ensureGoogleSignupFlagRegistered } from "@/lib/actions/google-signup";
import { LoginForm } from "./login-form";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  "google-non-configure": "La connexion avec Google n'est pas encore configurée pour ZINDO.",
  "google-echec": "La connexion avec Google a échoué. Réessayez.",
  "google-email-non-verifie": "Votre adresse e-mail Google n'est pas vérifiée.",
  "google-aucun-compte":
    "Aucun compte ZINDO n'utilise cette adresse Google. Connectez-vous avec votre téléphone et votre mot de passe, ajoutez cette adresse e-mail dans Mon profil, puis Google fonctionnera.",
  "google-compte-desactive": "Ce compte a été désactivé. Contactez votre administrateur.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reinitialisation?: string }>;
}) {
  const { error, reinitialisation } = await searchParams;
  const googleError = error ? GOOGLE_ERROR_MESSAGES[error] : undefined;

  if ((await getPlatformConfig()).maintenanceMode) redirect("/maintenance");
  await ensureGoogleSignupFlagRegistered();

  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-xl font-bold text-zindo-ink-900 sm:text-2xl">
            Bienvenue sur <span className="text-zindo-green-600">ZINDO</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Connectez-vous à votre compte</p>
        </div>
        {reinitialisation === "ok" && (
          <p className="animate-zindo-fade-in mb-4 flex items-center gap-2 rounded-xl bg-zindo-green-50 px-3.5 py-2.5 text-sm text-zindo-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Mot de passe réinitialisé, connectez-vous.
          </p>
        )}
        <LoginForm googleError={googleError} />
      </AuthCard>

      <p className="text-center text-sm text-zinc-500">
        Vous n&apos;avez pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-zindo-green-600 hover:text-zindo-green-700 hover:underline">
          Créer un compte
        </Link>
      </p>

      <div className="flex items-center justify-center gap-2 px-4 py-2 text-center">
        <ShieldCheck className="h-4 w-4 shrink-0 text-zindo-success-600" />
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zindo-ink-700">Vos données sont protégées</span> — sécurisé et
          confidentiel
        </p>
      </div>
    </div>
  );
}
