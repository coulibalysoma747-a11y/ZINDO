import { notFound } from "next/navigation";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { VerificationForm } from "./VerificationForm";

export default async function VerificationPage() {
  const user = await requireUser();
  if (!(await isFeatureEnabledGlobally("marche_zindo"))) notFound();

  const { data } = await supabase
    .from("market_verifications")
    .select("status, rejectionReason:rejection_reason")
    .eq("business_id", user.businessId)
    .maybeSingle();
  const request = data as { status: string; rejectionReason: string | null } | null;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zindo-ink-900">
        <BadgeCheck className="h-7 w-7 text-sky-600" /> Vérification du compte
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Un compte vérifié reçoit le badge <strong>Vérifié</strong> sur le Marché ZINDO. Avec un abonnement, vos produits
        passent aussi <strong>à la une</strong>.
      </p>

      <div className="mt-6">
        {request?.status === "VALIDEE" ? (
          <p className="flex items-center gap-2 rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700">
            <BadgeCheck className="h-5 w-5" /> Votre compte est vérifié.
          </p>
        ) : request?.status === "EN_ATTENTE" ? (
          <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            <Clock className="h-5 w-5" /> Demande en cours d&apos;examen. Réponse sous 48 h.
          </p>
        ) : user.role !== "ADMIN" ? (
          <p className="text-sm text-zinc-600">Seul le propriétaire du compte peut demander la vérification.</p>
        ) : (
          <>
            {request?.status === "REFUSEE" && (
              <p className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  Demande refusée{request.rejectionReason ? ` : ${request.rejectionReason}` : ""}. Vous pouvez la renvoyer.
                </span>
              </p>
            )}
            <VerificationForm />
          </>
        )}
      </div>
    </div>
  );
}
