import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { getStudentAction, getSchoolContextAction, deleteStudentAction } from "@/lib/actions/school";
import { SCHOOL_PAYMENT_METHODS, type SchoolPaymentMethod } from "@/lib/school-constants";
import { formatMoney, formatDateTime, formatDate } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DeleteRedirectButton } from "@/components/ui/DeleteRedirectButton";
import { PaymentForm } from "./PaymentForm";
import { CancelPaymentButton } from "./CancelPaymentButton";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ currency }, data] = await Promise.all([getSchoolContextAction(), getStudentAction(id)]);
  if (!data) notFound();
  const { student: s, payments } = data;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/ecole/eleves" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" /> Élèves
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {s.lastName} {s.firstName}
          </h1>
          <p className="text-sm text-zinc-500">
            {s.className ?? "Sans classe"}
            {s.matricule ? ` · Matricule ${s.matricule}` : ""}
            {!s.active && " · Parti"}
          </p>
        </div>
        <div className="flex gap-2">
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
            <p className="text-xs text-zinc-500">Scolarité annuelle</p>
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

      <Card>
        <CardBody className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-zinc-500">Parent : </span>
            {s.parentName ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">Téléphone : </span>
            {s.parentPhone ? <a href={`tel:${s.parentPhone}`} className="hover:underline">{s.parentPhone}</a> : "—"}
          </p>
          <p>
            <span className="text-zinc-500">Sexe : </span>
            {s.sex === "M" ? "Garçon" : s.sex === "F" ? "Fille" : "—"}
          </p>
          <p>
            <span className="text-zinc-500">Né(e) le : </span>
            {s.birthDate ? formatDate(s.birthDate) : "—"}
          </p>
        </CardBody>
      </Card>

      {s.remaining > 0 && <PaymentForm studentId={s.id} remaining={s.remaining} currency={currency} />}

      <div className="space-y-2">
        <h2 className="font-semibold text-zinc-900">Paiements</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun paiement pour le moment.</p>
        ) : (
          <Card className="divide-y divide-zinc-100">
            {payments.map((p) => (
              <CardBody key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{formatMoney(p.amount, currency)}</p>
                  <p className="text-xs text-zinc-500">
                    {p.number} · {formatDateTime(p.paidAt)} · {SCHOOL_PAYMENT_METHODS[p.method as SchoolPaymentMethod] ?? p.method}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="emerald">Payé</Badge>
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
