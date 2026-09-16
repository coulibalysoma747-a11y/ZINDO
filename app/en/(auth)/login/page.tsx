import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: "/en/login" },
};

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  "google-non-configure": "Signing in with Google isn't configured for ZINDO yet.",
  "google-echec": "Signing in with Google failed. Please try again.",
  "google-email-non-verifie": "Your Google email address isn't verified.",
  "google-aucun-compte": "No ZINDO account is linked to this Google address. Create an account first.",
  "google-compte-desactive": "This account has been deactivated. Contact your administrator.",
};

export default async function EnglishLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reinitialisation?: string }>;
}) {
  const { error, reinitialisation } = await searchParams;
  const googleError = error ? GOOGLE_ERROR_MESSAGES[error] : undefined;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-xl font-bold text-zindo-ink-900 sm:text-2xl">
            Welcome to <span className="text-zindo-green-600">ZINDO</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your account</p>
        </div>
        {reinitialisation === "ok" && (
          <p className="animate-zindo-fade-in mb-4 flex items-center gap-2 rounded-xl bg-zindo-green-50 px-3.5 py-2.5 text-sm text-zindo-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Password reset — please sign in.
          </p>
        )}
        <LoginForm googleError={googleError} locale="en" />
      </AuthCard>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account yet?{" "}
        <Link href="/en/inscription" className="font-semibold text-zindo-green-600 hover:text-zindo-green-700 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="flex items-center justify-center gap-2 px-4 py-2 text-center">
        <ShieldCheck className="h-4 w-4 shrink-0 text-zindo-success-600" />
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zindo-ink-700">Your data is protected</span> — secure and confidential
        </p>
      </div>
    </div>
  );
}
