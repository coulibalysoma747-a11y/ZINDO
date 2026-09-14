import { createHash } from "crypto";
import Link from "next/link";
import { ArrowLeft, KeyRound, XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { supabase } from "@/lib/supabase";
import { ResetPasswordForm } from "./reset-password-form";

async function isTokenValid(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data } = await supabase
    .from("password_reset_tokens")
    .select("expiresAt:expires_at, usedAt:used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!data || data.usedAt) return false;
  return new Date(data.expiresAt as string) > new Date();
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await isTokenValid(token) : false;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        {valid && token ? (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zindo-green-50">
                <KeyRound className="h-6 w-6 text-zindo-green-600" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-zindo-ink-900 sm:text-2xl">
                Choisissez un nouveau mot de passe
              </h2>
            </div>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-zindo-ink-900">Lien invalide ou expiré</h2>
            <p className="text-sm text-zinc-500">
              Ce lien de réinitialisation n&apos;est plus valable. Les liens expirent après 30 minutes et ne
              fonctionnent qu&apos;une seule fois.
            </p>
            <Link
              href="/mot-de-passe-oublie"
              className="mt-2 text-sm font-semibold text-zindo-green-600 hover:text-zindo-green-700 hover:underline"
            >
              Refaire une demande
            </Link>
          </div>
        )}
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
