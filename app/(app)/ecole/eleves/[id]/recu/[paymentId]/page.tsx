/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStudentAction, getStudentPaymentAction, getSchoolContextAction } from "@/lib/actions/school";
import { SCHOOL_PAYMENT_METHODS, type SchoolPaymentMethod } from "@/lib/school-constants";
import { formatMoney, formatDateTime } from "@/lib/format";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

/** Reçu de paiement de scolarité, imprimable ou enregistrable en PDF. */
export default async function SchoolReceiptPage({ params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await params;
  const [ctx, data, payment] = await Promise.all([getSchoolContextAction(), getStudentAction(id), getStudentPaymentAction(paymentId)]);
  if (!data || !payment || payment.studentId !== id) notFound();
  const { student: s } = data;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/ecole/eleves/${id}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;élève
        </Link>
        <PrintDocumentButton />
      </div>

      <div className="space-y-5 rounded-xl border border-zinc-300 bg-white p-6 text-sm text-black">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-300 pb-4">
          <div className="flex items-center gap-3">
            {ctx.logoUrl && <img src={ctx.logoUrl} alt="" className="h-14 w-14 object-contain" />}
            <div>
              <p className="text-base font-bold">{ctx.businessName}</p>
              {(ctx.address || ctx.city) && <p>{[ctx.address, ctx.city].filter(Boolean).join(", ")}</p>}
              {ctx.phone && <p>Tél. {ctx.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">REÇU DE SCOLARITÉ</p>
            <p>N° {payment.number}</p>
            <p>{formatDateTime(payment.paidAt)}</p>
          </div>
        </div>

        <div className="grid gap-1">
          <p>
            <span className="text-zinc-600">Élève : </span>
            <strong>
              {s.lastName} {s.firstName}
            </strong>
            {s.matricule ? ` (matricule ${s.matricule})` : ""}
          </p>
          <p>
            <span className="text-zinc-600">Classe : </span>
            {s.className ?? "—"}
          </p>
          {s.parentName && (
            <p>
              <span className="text-zinc-600">Parent / tuteur : </span>
              {s.parentName}
            </p>
          )}
        </div>

        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-y border-zinc-300">
              <td className="py-2">Montant reçu{payment.note ? ` (${payment.note})` : ""}</td>
              <td className="py-2 text-right text-base font-bold">{formatMoney(payment.amount, ctx.currency)}</td>
            </tr>
            <tr>
              <td className="py-1 text-zinc-600">Moyen de paiement</td>
              <td className="py-1 text-right">{SCHOOL_PAYMENT_METHODS[payment.method as SchoolPaymentMethod] ?? payment.method}</td>
            </tr>
            <tr>
              <td className="py-1 text-zinc-600">Scolarité annuelle</td>
              <td className="py-1 text-right">{formatMoney(s.fee, ctx.currency)}</td>
            </tr>
            <tr>
              <td className="py-1 text-zinc-600">Total payé à ce jour</td>
              <td className="py-1 text-right">{formatMoney(s.paid, ctx.currency)}</td>
            </tr>
            <tr className="border-t border-zinc-300">
              <td className="py-2 font-semibold">Reste à payer</td>
              <td className="py-2 text-right font-semibold">{formatMoney(s.remaining, ctx.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end pt-8">
          <p className="border-t border-zinc-400 px-8 pt-1 text-zinc-600">Signature et cachet</p>
        </div>
      </div>
    </div>
  );
}
