import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { RenewalButtons, ReviewButtons } from "./ReviewButtons";

const STATUS_LABELS = { EN_ATTENTE: "À examiner", VALIDEE: "Vérifié", REFUSEE: "Refusé" } as const;
const STATUS_TONE = { EN_ATTENTE: "amber", VALIDEE: "emerald", REFUSEE: "red" } as const;
// Liens d'accès aux pièces d'identité (bucket privé) : valables 10 minutes seulement.
const SIGNED_URL_SECONDS = 600;

type Row = {
  businessId: string;
  status: keyof typeof STATUS_LABELS;
  idFront: string;
  idBack: string;
  selfie: string;
  rejectionReason: string | null;
  paymentReference: string | null;
  packPaidUntil: string | null;
  renewalReference: string | null;
  submittedAt: string;
  reviewedBy: string | null;
  business: { name: string; phone: string | null; city: string | null };
};

export default async function AdminVerificationsPage() {
  await requireSuperAdmin();

  const { data } = await supabase
    .from("market_verifications")
    .select(
      "businessId:business_id, status, idFront:id_front_path, idBack:id_back_path, selfie:selfie_path, rejectionReason:rejection_reason, paymentReference:payment_reference, packPaidUntil:pack_paid_until, renewalReference:renewal_reference, submittedAt:submitted_at, reviewedBy:reviewed_by, business:businesses(name, phone, city)"
    )
    .order("submitted_at", { ascending: false })
    .limit(100);
  const toDo = (r: Row) => r.status === "EN_ATTENTE" || !!r.renewalReference;
  const rows = ((data ?? []) as unknown as Row[]).sort((a, b) => Number(toDo(b)) - Number(toDo(a)));

  // Liens signés uniquement pour les demandes à examiner (les autres n'ont plus besoin des pièces).
  const pending = rows.filter((r) => r.status === "EN_ATTENTE");
  const paths = pending.flatMap((r) => [r.idFront, r.idBack, r.selfie]);
  const { data: signed } = paths.length
    ? await supabase.storage.from("verifications").createSignedUrls(paths, SIGNED_URL_SECONDS)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Vérifications du Marché</h1>
        <p className="text-sm text-zinc-500">
          Pack Vérifié : 1 000 FCFA / mois. {pending.length} demande(s) et {rows.filter((r) => r.renewalReference).length}{" "}
          renouvellement(s) à traiter. Vérifiez d&apos;abord que la référence de paiement est bien arrivée sur votre
          téléphone, puis comparez le visage du selfie avec la pièce.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune demande de vérification pour le moment" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.businessId}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/admin/commercants/${r.businessId}`}
                      className="inline-flex items-center gap-1 font-medium text-zindo-green-600 hover:underline"
                    >
                      {r.business.name} <ExternalLink className="h-3 w-3" />
                    </Link>
                    <p className="text-xs text-zinc-400">
                      {[r.business.phone, r.business.city].filter(Boolean).join(" · ")} — envoyé le{" "}
                      {formatDateTime(new Date(r.submittedAt))}
                      {r.reviewedBy && ` — traité par ${r.reviewedBy}`}
                    </p>
                    {r.rejectionReason && <p className="mt-1 text-xs text-red-600">Motif du refus : {r.rejectionReason}</p>}
                    {r.paymentReference && (
                      <p className="mt-1 text-xs text-zinc-600">
                        Référence de paiement : <span className="font-mono font-semibold">{r.paymentReference}</span>
                      </p>
                    )}
                    {r.status === "VALIDEE" && (
                      <p className="mt-1 text-xs text-zinc-600">
                        Pack payé jusqu&apos;au {r.packPaidUntil ? formatDateTime(new Date(r.packPaidUntil)) : "—"}
                      </p>
                    )}
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                </div>

                {r.status === "EN_ATTENTE" && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Recto", r.idFront],
                        ["Verso", r.idBack],
                        ["Selfie", r.selfie],
                      ].map(([label, path]) => (
                        <a key={label} href={urlByPath.get(path) ?? "#"} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={urlByPath.get(path) ?? ""}
                            alt={label}
                            className="aspect-[4/3] w-full rounded-lg border border-zinc-200 bg-zinc-100 object-cover"
                          />
                          <span className="mt-1 block text-center text-xs text-zinc-500">{label}</span>
                        </a>
                      ))}
                    </div>
                    <ReviewButtons businessId={r.businessId} />
                  </>
                )}

                {r.renewalReference && (
                  <div className="space-y-2 rounded-lg bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">
                      Renouvellement : référence <span className="font-mono font-semibold">{r.renewalReference}</span>
                    </p>
                    <RenewalButtons businessId={r.businessId} />
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
