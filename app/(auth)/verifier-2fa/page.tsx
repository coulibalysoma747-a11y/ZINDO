import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { getPending2FASession } from "@/lib/session";
import { getAdminPending2FASession } from "@/lib/adminSession";
import { Verify2FAForm } from "./Verify2FAForm";

export default async function Verify2FAPage() {
  const [userPending, adminPending] = await Promise.all([getPending2FASession(), getAdminPending2FASession()]);
  if (!userPending && !adminPending) redirect("/login");

  return (
    <div className="space-y-5 sm:space-y-6">
      <AuthCard>
        <div className="mb-6 text-center sm:text-left">
          <div className="mb-2 inline-flex items-center gap-2 text-zindo-green-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-zindo-ink-900 sm:text-2xl">Vérification en deux étapes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Entrez le code à 6 chiffres de votre application d&apos;authentification, ou un de vos codes de secours.
          </p>
        </div>
        <Verify2FAForm />
      </AuthCard>
    </div>
  );
}
