import { notFound } from "next/navigation";
import { BadgeCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { formatDate } from "@/lib/format";
import { PACK_PRICE } from "@/lib/market-pack";
import { reconcileSaspayPayments } from "@/lib/saspay-payments";
import { PackPayButton, VerificationForm } from "./VerificationForm";

type Row = {
  status: "EN_ATTENTE" | "VALIDEE" | "REFUSEE";
  rejectionReason: string | null;
  packPaidUntil: string | null;
  renewalReference: string | null;
};

function isActive(until: string | null) {
  return !!until && new Date(until).getTime() > Date.now();
}

const PRICE_LABEL = `${PACK_PRICE.toLocaleString("fr-FR")} FCFA`;

export default async function VerificationPage() {
  const user = await requireUser();
  if (!(await isFeatureEnabledGlobally("marche_zindo"))) notFound();

  // Retour de la page de paiement : on relit d'abord les paiements en attente pour afficher le pack déjà prolongé.
  await reconcileSaspayPayments(user.businessId);

  const [{ data }, { count: paidCredits }] = await Promise.all([
    supabase
      .from("market_verifications")
      .select("status, rejectionReason:rejection_reason, packPaidUntil:pack_paid_until, renewalReference:renewal_reference")
      .eq("business_id", user.businessId)
      .maybeSingle(),
    supabase
      .from("saspay_payments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", user.businessId)
      .eq("purpose", "PACK")
      .eq("status", "PAID")
      .is("used_at", null),
  ]);
  const request = data as Row | null;
  const active = isActive(request?.packPaidUntil ?? null);
  const isOwner = user.role === "ADMIN";
  const hasPaid = (paidCredits ?? 0) > 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zindo-ink-900">
        <BadgeCheck className="h-7 w-7 text-sky-600" /> Pack Vérifié
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        <strong>{PRICE_LABEL} / mois</strong> : badge <strong>Vérifié</strong> sur le Marché ZINDO et vos produits{" "}
        <strong>à la une</strong>, affichés en premier. Ce pack est séparé de l&apos;abonnement ZINDO. Le paiement se fait en ligne, de façon sécurisée.
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
                <Clock className="h-5 w-5" /> Ancien paiement de renouvellement en attente de confirmation.
              </p>
            ) : (
              <PackPayButton label={`Renouveler mon pack (1 mois) · ${PRICE_LABEL}`} />
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
            {hasPaid ? (
              <>
                <p className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" /> Paiement de {PRICE_LABEL} reçu.
                </p>
                <p className="mb-2 text-sm font-semibold text-zindo-ink-900">2. Prenez les photos de votre pièce et de vous :</p>
                <VerificationForm />
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zindo-ink-900">1. Payez {PRICE_LABEL} en ligne :</p>
                <PackPayButton label={`Payer ${PRICE_LABEL}`} />
                <p className="text-xs text-zinc-500">Ensuite, vous enverrez les photos de votre pièce et de vous.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
