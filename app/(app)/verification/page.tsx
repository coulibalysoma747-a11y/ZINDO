import { notFound } from "next/navigation";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { formatDate } from "@/lib/format";
import { PaymentMethodModules } from "../abonnement/PaymentMethodModules";
import { RenewalForm, VerificationForm } from "./VerificationForm";

type Row = {
  status: "EN_ATTENTE" | "VALIDEE" | "REFUSEE";
  rejectionReason: string | null;
  packPaidUntil: string | null;
  renewalReference: string | null;
};

function isActive(until: string | null) {
  return !!until && new Date(until).getTime() > Date.now();
}

function PayBlock() {
  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zindo-ink-900">
        1. Payez <strong>1 000 FCFA</strong> sur ce numéro, puis notez la référence de la transaction :
      </p>
      <PaymentMethodModules />
    </div>
  );
}

export default async function VerificationPage() {
  const user = await requireUser();
  if (!(await isFeatureEnabledGlobally("marche_zindo"))) notFound();

  const { data } = await supabase
    .from("market_verifications")
    .select("status, rejectionReason:rejection_reason, packPaidUntil:pack_paid_until, renewalReference:renewal_reference")
    .eq("business_id", user.businessId)
    .maybeSingle();
  const request = data as Row | null;
  const active = isActive(request?.packPaidUntil ?? null);
  const isOwner = user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zindo-ink-900">
        <BadgeCheck className="h-7 w-7 text-sky-600" /> Pack Vérifié
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        <strong>1 000 FCFA / mois</strong> : badge <strong>Vérifié</strong> sur le Marché ZINDO et vos produits{" "}
        <strong>à la une</strong>, affichés en premier. Ce pack est séparé de l&apos;abonnement ZINDO.
      </p>

      <div className="mt-6">
        {!isOwner ? (
          <p className="text-sm text-zinc-600">Seul le propriétaire du compte peut gérer le Pack Vérifié.</p>
        ) : request?.status === "EN_ATTENTE" ? (
          <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            <Clock className="h-5 w-5" /> Demande en cours d&apos;examen (photos + paiement). Réponse sous 48 h.
          </p>
        ) : request?.status === "VALIDEE" ? (
          <div className="space-y-4">
            {active ? (
              <p className="flex items-center gap-2 rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700">
                <BadgeCheck className="h-5 w-5" /> Pack actif jusqu&apos;au {formatDate(new Date(request.packPaidUntil!))}.
              </p>
            ) : (
              <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                Pack expiré : votre badge et la mise à la une sont suspendus. Renouvelez pour les retrouver.
              </p>
            )}
            {request.renewalReference ? (
              <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                <Clock className="h-5 w-5" /> Paiement de renouvellement en attente de confirmation.
              </p>
            ) : (
              <>
                <PayBlock />
                <p className="text-sm font-semibold text-zindo-ink-900">2. Envoyez la référence :</p>
                <RenewalForm />
              </>
            )}
          </div>
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
            <PayBlock />
            <p className="mb-2 text-sm font-semibold text-zindo-ink-900">
              2. Prenez les photos de votre pièce et de vous, puis envoyez la référence :
            </p>
            <VerificationForm />
          </>
        )}
      </div>
    </div>
  );
}
