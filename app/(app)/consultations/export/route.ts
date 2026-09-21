import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { AGE_GROUP_LABELS } from "@/lib/consultation-constants";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toRow(values: (string | number | null)[]): string {
  return values.map((v) => csvEscape(v == null ? "" : String(v))).join(",") + "\r\n";
}

/** Export CSV du registre des consultations (ouvre directement dans Excel). */
export async function GET() {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");

  const { data } = await supabase
    .from("consultations")
    .select("patientCode:patient_code, sex, ageGroup:age_group, diagnosis, treatment, fee, createdAt:created_at")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Array<{
    patientCode: string | null;
    sex: "M" | "F";
    ageGroup: "ENFANT" | "ADULTE" | "SENIOR";
    diagnosis: string;
    treatment: string | null;
    fee: number;
    createdAt: string;
  }>;

  let csv = "﻿" + toRow(["date", "code_patient", "sexe", "tranche_age", "diagnostic", "traitement", "frais_fcfa"]);
  for (const r of rows) {
    csv += toRow([
      new Date(r.createdAt).toLocaleString("fr-FR"),
      r.patientCode,
      r.sex,
      AGE_GROUP_LABELS[r.ageGroup],
      r.diagnosis,
      r.treatment,
      r.fee,
    ]);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="consultations.csv"`,
    },
  });
}
