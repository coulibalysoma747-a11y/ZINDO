import { XCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

type ConsultationRow = {
  id: string;
  createdAt: string;
  patientCode: string | null;
  business: { name: string };
  user: { firstName: string; lastName: string } | null;
  items: Array<{
    quantity: number;
    posology: string | null;
    customName: string | null;
    product: { name: string; unit: string } | null;
  }>;
};

/**
 * Vérification publique d'une ordonnance (QR code imprimé dessus, voir
 * lib/verification.ts) — sans compte ZINDO, un pharmacien confirme que
 * l'ordonnance a bien été émise par ce cabinet et compare la liste affichée
 * ici à celle imprimée sur le papier, pour repérer une falsification (ex.
 * quantité modifiée après impression). Ne montre volontairement ni le nom du
 * patient ni le diagnostic (secret médical) — seulement de quoi vérifier
 * l'authenticité des produits prescrits.
 */
export default async function VerifyOrdonnancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data } = await supabase
    .from("consultations")
    .select(
      "id, createdAt:created_at, patientCode:patient_code, business:businesses(name), user:users(firstName:first_name, lastName:last_name), " +
        "items:consultation_items(quantity, posology, customName:custom_name, product:products(name, unit))"
    )
    .eq("id", id)
    .maybeSingle();
  const consultation = data as unknown as ConsultationRow | null;
  const items = (consultation?.items ?? []).filter((i) => i.product || i.customName);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zindo-cream px-5 py-10 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <ZindoLogo size={48} />
        <p className="mt-3 text-sm font-semibold tracking-wide text-zindo-ink-900">Vérification d&apos;ordonnance ZINDO</p>
      </div>

      <div className="mt-8 w-full max-w-sm">
        {!consultation ? (
          <div className="rounded-[24px] border border-red-100 bg-white p-6 text-center shadow-[0_20px_50px_-15px_rgba(13,19,48,0.15)]">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 font-bold text-zindo-ink-900">Ordonnance introuvable</p>
            <p className="mt-1.5 text-sm text-zinc-500">
              Ce code ne correspond à aucune ordonnance enregistrée dans ZINDO. Elle peut être invalide ou falsifiée.
            </p>
          </div>
        ) : (
          <div className="rounded-[24px] border border-zindo-ink-900/5 bg-white p-6 shadow-[0_20px_50px_-15px_rgba(13,19,48,0.18)]">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-10 w-10 text-zindo-success-600" />
              <p className="mt-3 font-bold text-zindo-ink-900">Ordonnance authentique</p>
              <p className="text-sm text-zinc-500">Émise par {consultation.business.name}, enregistrée dans ZINDO.</p>
            </div>

            <div className="my-5 border-t border-dashed border-zinc-200" />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Cabinet</dt>
                <dd className="font-medium text-zindo-ink-900">{consultation.business.name}</dd>
              </div>
              {consultation.patientCode && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Patient</dt>
                  <dd className="font-mono font-medium text-zindo-ink-900">{consultation.patientCode}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">Date</dt>
                <dd className="font-medium text-zindo-ink-900">{formatDateTime(new Date(consultation.createdAt))}</dd>
              </div>
              {consultation.user && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Médecin</dt>
                  <dd className="font-medium text-zindo-ink-900">
                    {consultation.user.firstName} {consultation.user.lastName}
                  </dd>
                </div>
              )}
            </dl>

            <div className="my-5 border-t border-dashed border-zinc-200" />

            <p className="mb-2 text-sm font-medium text-zinc-500">Produits prescrits</p>
            {items.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucun produit prescrit.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-semibold text-zindo-ink-900">
                      {item.product?.name ?? item.customName} — {item.quantity}
                      {item.product?.unit ? ` ${item.product.unit}` : ""}
                    </p>
                    {item.posology && <p className="text-zinc-500">{item.posology}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-400">Vérification fournie par ZINDO</p>
    </div>
  );
}
