import { redirect } from "next/navigation";
import { Plus, BarChart3, Download, Stethoscope, Microscope, AlarmClock, Receipt as ReceiptIcon, Pill } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatLongDate } from "@/lib/format";
import { ensureConsultationsFlagRegistered, isConsultationsModuleEnabled } from "@/lib/actions/consultations";
import { AGE_GROUP_LABELS } from "@/lib/consultation-constants";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

type ConsultationRow = {
  id: string;
  patientCode: string | null;
  patientName: string | null;
  patientAge: number | null;
  sex: "M" | "F";
  ageGroup: "ENFANT" | "ADULTE" | "SENIOR";
  diagnosis: string;
  fee: number;
  createdAt: string;
  act: { name: string } | null;
  items: { id: string }[];
};

export default async function ConsultationsPage() {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");

  await ensureConsultationsFlagRegistered();
  if (!(await isConsultationsModuleEnabled(user.businessId))) redirect("/dashboard");

  const { data } = await supabase
    .from("consultations")
    .select(
      "id, patientCode:patient_code, patientName:patient_name, patientAge:patient_age, sex, ageGroup:age_group, diagnosis, fee, createdAt:created_at, act:medical_acts(name), items:consultation_items(id)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  const consultations = (data ?? []) as unknown as ConsultationRow[];
  const currency = user.business.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Consultations</h1>
          <p className="text-sm text-zinc-500">{consultations.length} consultation(s) récente(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/consultations/actes" variant="outline">
            <Stethoscope className="h-4 w-4" /> Actes médicaux
          </ButtonLink>
          <ButtonLink href="/consultations/diagnostics" variant="outline">
            <Microscope className="h-4 w-4" /> Diagnostics
          </ButtonLink>
          <ButtonLink href="/consultations/posologies" variant="outline">
            <AlarmClock className="h-4 w-4" /> Posologies
          </ButtonLink>
          <ButtonLink href="/consultations/statistiques" variant="outline">
            <BarChart3 className="h-4 w-4" /> Statistiques
          </ButtonLink>
          <a
            href="/consultations/export"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            <Download className="h-4 w-4" /> Exporter
          </a>
          <ButtonLink href="/consultations/nouvelle">
            <Plus className="h-4 w-4" /> Nouvelle consultation
          </ButtonLink>
        </div>
      </div>

      {consultations.length === 0 ? (
        <EmptyState title="Aucune consultation" description="Enregistrez votre première consultation." />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Patient</TableHeaderCell>
                <TableHeaderCell>Sexe</TableHeaderCell>
                <TableHeaderCell>Âge</TableHeaderCell>
                <TableHeaderCell>Acte</TableHeaderCell>
                <TableHeaderCell>Diagnostic</TableHeaderCell>
                <TableHeaderCell>Frais</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {consultations.map((c) => (
                <TableRow key={c.id} interactive={false}>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatLongDate(c.createdAt)}</TableCell>
                  <TableCell className="font-medium text-zinc-900 dark:text-slate-100">
                    {c.patientCode ?? "—"}
                    {c.patientName && <span className="block font-normal text-zinc-500">{c.patientName}</span>}
                  </TableCell>
                  <TableCell>{c.sex}</TableCell>
                  <TableCell>{c.patientAge != null ? `${c.patientAge} ans` : AGE_GROUP_LABELS[c.ageGroup]}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{c.act?.name ?? "—"}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{c.diagnosis}</TableCell>
                  <TableCell className="font-semibold text-zindo-green-600">{formatMoney(c.fee, currency)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <a
                        href={`/consultations/${c.id}/recu`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-zindo-green-700 hover:underline"
                      >
                        <ReceiptIcon className="h-3.5 w-3.5" /> Reçu
                      </a>
                      {c.items.length > 0 && (
                        <a
                          href={`/consultations/${c.id}/ordonnance`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-zindo-green-700 hover:underline"
                        >
                          <Pill className="h-3.5 w-3.5" /> Ordonnance
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
