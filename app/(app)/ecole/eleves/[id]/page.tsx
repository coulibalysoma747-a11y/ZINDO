import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer, ScrollText, CheckCircle2 } from "lucide-react";
import { getStudentAction, getSchoolContextAction, deleteStudentAction } from "@/lib/actions/school";
import { getStudentAttendanceSummaryAction } from "@/lib/actions/school-attendance";
import { SCHOOL_PAYMENT_METHODS, SCHOOL_FEE_TYPES, ATTENDANCE_STATUSES, type SchoolPaymentMethod, type SchoolFeeType } from "@/lib/school-constants";
import { formatMoney, formatDateTime, formatDate } from "@/lib/format";
import { toWhatsAppDigits } from "@/lib/countries";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DeleteRedirectButton } from "@/components/ui/DeleteRedirectButton";
import { PaymentForm } from "./PaymentForm";
import { CancelPaymentButton } from "./CancelPaymentButton";

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ inscrit?: string }> }) {
  const { id } = await params;
  const { inscrit } = await searchParams;
  const [ctx, data, attendance] = await Promise.all([getSchoolContextAction(), getStudentAction(id), getStudentAttendanceSummaryAction(id)]);
  if (!data) notFound();
  const { currency } = ctx;
  const { student: s, payments } = data;

  // Reste à payer par type de frais, pour le formulaire de paiement.
  const dueByType = new Map<SchoolFeeType, number>();
  for (const l of s.lines) dueByType.set(l.feeType, (dueByType.get(l.feeType) ?? 0) + Math.max(0, l.due - l.paid));
  const openTypes = [...dueByType.entries()].filter(([, left]) => left > 0).map(([feeType, left]) => ({ feeType, left }));

  const phone = s.parentWhatsapp || s.parentPhone;
  const waText = `Bonjour${s.parentName ? ` ${s.parentName}` : ""}, situation de ${s.firstName} ${s.lastName} (${s.className ?? "sans classe"}) à ${ctx.businessName} : payé ${formatMoney(s.paid, currency)} sur ${formatMoney(s.fee, currency)}, reste ${formatMoney(s.remaining, currency)}.`;
  const waLink = phone ? `https://wa.me/${toWhatsAppDigits(phone, ctx.country)}?text=${encodeURIComponent(waText)}` : null;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/ecole/eleves" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" /> Élèves
      </Link>

      {inscrit && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Élève inscrit{s.matricule ? ` — matricule ${s.matricule}` : ""}. Vous pouvez enregistrer un premier paiement ci-dessous.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {s.lastName} {s.firstName}
          </h1>
          <p className="text-sm text-zinc-500">
            {s.className ?? "Sans classe"}
            {s.matricule ? ` · Matricule ${s.matricule}` : ""}
            {s.enrolledAt ? ` · Inscrit le ${formatDate(s.enrolledAt)}` : ""}
            {!s.active && " · Parti"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/ecole/eleves/${s.id}/fiche`} variant="secondary">
            <Printer className="h-4 w-4" /> Fiche d&apos;inscription
          </ButtonLink>
          <ButtonLink href={`/ecole/bulletins/${s.id}`} variant="secondary">
            <ScrollText className="h-4 w-4" /> Bulletin
          </ButtonLink>
          <ButtonLink href={`/ecole/eleves/${s.id}/modifier`} variant="secondary">
            Modifier
          </ButtonLink>
          {payments.length === 0 && (
            <DeleteRedirectButton
              action={deleteStudentAction.bind(null, s.id)}
              redirectTo="/ecole/eleves"
              confirmTitle="Supprimer l'élève"
              confirmMessage={`Supprimer définitivement ${s.lastName} ${s.firstName} ?`}
            />
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Total des frais</p>
            <p className="text-lg font-semibold text-zinc-900">{formatMoney(s.fee, currency)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Déjà payé</p>
            <p className="text-lg font-semibold text-emerald-600">{formatMoney(s.paid, currency)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Reste à payer</p>
            <p className={`text-lg font-semibold ${s.remaining > 0 ? "text-red-600" : "text-zinc-900"}`}>{formatMoney(s.remaining, currency)}</p>
          </CardBody>
        </Card>
      </div>

      {s.lines.length > 1 && (
        <Card className="divide-y divide-zinc-100">
          {s.lines.map((l, i) => (
            <CardBody key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-zinc-700">{l.label}</span>
              <span className={l.paid >= l.due ? "text-emerald-600" : "text-zinc-900"}>
                {formatMoney(l.paid, currency)} / {formatMoney(l.due, currency)}
              </span>
            </CardBody>
          ))}
        </Card>
      )}

      <Card>
        <CardBody className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-zinc-500">Parent : </span>
            {s.parentName ?? "—"}
            {s.parentRelation ? ` (${s.parentRelation})` : ""}
          </p>
          <p>
            <span className="text-zinc-500">Téléphone : </span>
            {s.parentPhone ? (
              <a href={`tel:${s.parentPhone}`} className="hover:underline">
                {s.parentPhone}
              </a>
            ) : (
              "—"
            )}
          </p>
          <p>
            <span className="text-zinc-500">Sexe : </span>
            {s.sex === "M" ? "Garçon" : s.sex === "F" ? "Fille" : "—"}
          </p>
          <p>
            <span className="text-zinc-500">Né(e) le : </span>
            {s.birthDate ? formatDate(s.birthDate) : "—"}
            {s.birthPlace ? ` à ${s.birthPlace}` : ""}
          </p>
          {s.address && (
            <p>
              <span className="text-zinc-500">Adresse : </span>
              {s.address}
            </p>
          )}
          {waLink && (
            <p>
              <a href={waLink} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline">
                Envoyer la situation au parent sur WhatsApp
              </a>
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-2 text-sm">
          <h2 className="font-semibold text-zinc-900">Présences depuis la rentrée</h2>
          <div className="flex flex-wrap gap-2">
            <Badge tone={attendance.absences ? "red" : "zinc"}>{attendance.absences} absence(s)</Badge>
            <Badge tone="amber">{attendance.justified} justifiée(s)</Badge>
            <Badge tone={attendance.retards ? "amber" : "zinc"}>{attendance.retards} retard(s)</Badge>
          </div>
          {attendance.recent.length > 0 && (
            <p className="text-xs text-zinc-500">
              Dernières : {attendance.recent.map((r) => `${formatDate(r.day)} (${ATTENDANCE_STATUSES[r.status]})`).join(", ")}
            </p>
          )}
        </CardBody>
      </Card>

      {openTypes.length > 0 && <PaymentForm studentId={s.id} currency={currency} dueByType={openTypes} />}

      <div className="space-y-2">
        <h2 className="font-semibold text-zinc-900">Paiements</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun paiement pour le moment.</p>
        ) : (
          <Card className="divide-y divide-zinc-100">
            {payments.map((p) => (
              <CardBody key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    {formatMoney(p.amount, currency)} · {SCHOOL_FEE_TYPES[p.feeType as SchoolFeeType] ?? p.feeType}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {p.number} · {formatDateTime(p.paidAt)} · {SCHOOL_PAYMENT_METHODS[p.method as SchoolPaymentMethod] ?? p.method}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/ecole/eleves/${s.id}/recu/${p.id}`} className="text-zinc-400 hover:text-zinc-700" aria-label="Reçu">
                    <Printer className="h-4 w-4" />
                  </Link>
                  <CancelPaymentButton paymentId={p.id} studentId={s.id} label={p.number} />
                </div>
              </CardBody>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
