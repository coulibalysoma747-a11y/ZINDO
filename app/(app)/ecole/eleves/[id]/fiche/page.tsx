/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStudentAction, getSchoolContextAction } from "@/lib/actions/school";
import { currentSchoolYear } from "@/lib/school-constants";
import { formatMoney, formatDate } from "@/lib/format";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

/** Fiche d'inscription de l'élève, imprimable ou enregistrable en PDF. */
export default async function EnrollmentSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ctx, data] = await Promise.all([getSchoolContextAction(), getStudentAction(id)]);
  if (!data) notFound();
  const { student: s } = data;
  const rows: [string, string][] = [
    ["Nom et prénom(s)", `${s.lastName} ${s.firstName}`],
    ["Matricule", s.matricule ?? "—"],
    ["Classe", s.className ?? "—"],
    ["Sexe", s.sex === "M" ? "Masculin" : s.sex === "F" ? "Féminin" : "—"],
    ["Date et lieu de naissance", `${s.birthDate ? formatDate(s.birthDate) : "—"}${s.birthPlace ? ` à ${s.birthPlace}` : ""}`],
    ["Adresse", s.address ?? "—"],
    ["Date d'inscription", s.enrolledAt ? formatDate(s.enrolledAt) : "—"],
    ["Parent / tuteur", `${s.parentName ?? "—"}${s.parentRelation ? ` (${s.parentRelation})` : ""}`],
    ["Téléphone du parent", s.parentPhone ?? "—"],
    ["WhatsApp du parent", s.parentWhatsapp ?? s.parentPhone ?? "—"],
  ];

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
            <p className="text-base font-bold">FICHE D&apos;INSCRIPTION</p>
            <p>Année scolaire {currentSchoolYear()}</p>
          </div>
        </div>

        <table className="w-full border-collapse">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-zinc-200">
                <td className="w-1/2 py-2 text-zinc-600">{k}</td>
                <td className="py-2 font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <p className="mb-1 font-semibold">Frais de l&apos;année</p>
          <table className="w-full border-collapse">
            <tbody>
              {s.lines.map((l, i) => (
                <tr key={i} className="border-b border-zinc-200">
                  <td className="py-1.5">{l.label}</td>
                  <td className="py-1.5 text-right">{formatMoney(l.due, ctx.currency)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 font-semibold">Total</td>
                <td className="py-1.5 text-right font-semibold">{formatMoney(s.fee, ctx.currency)}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-zinc-600">Déjà payé</td>
                <td className="py-1.5 text-right">{formatMoney(s.paid, ctx.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between pt-10">
          <p className="border-t border-zinc-400 px-6 pt-1 text-zinc-600">Signature du parent</p>
          <p className="border-t border-zinc-400 px-6 pt-1 text-zinc-600">La direction</p>
        </div>
      </div>
    </div>
  );
}
