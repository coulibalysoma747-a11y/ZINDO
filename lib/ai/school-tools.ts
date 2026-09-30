import "server-only";
import type { DeepSeekTool } from "@/lib/ai/deepseek";
import { supabase } from "@/lib/supabase";
import { getStudentsAction } from "@/lib/actions/school";
import { getAttendanceStatsAction } from "@/lib/actions/school-attendance";

/**
 * Outils de l'assistant pour l'activité « ecole » : remplacent ceux d'une
 * boutique (stock, marges), sans objet pour une école. Mêmes données que
 * /ecole/tableau-de-bord et /ecole/impayes.
 */
export const SCHOOL_ASSISTANT_TOOLS: DeepSeekTool[] = [
  {
    type: "function",
    function: {
      name: "get_school_overview",
      description:
        "Vue d'ensemble de l'école : élèves inscrits (garçons/filles, par classe), scolarité due, encaissée et restant à encaisser, encaissements des 30 derniers jours.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_unpaid_students",
      description: "Élèves qui doivent encore de la scolarité : nom, classe, montant restant, téléphone du parent. Triés du plus gros reste au plus petit.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre d'élèves à retourner (défaut 15, max 50)" },
          className: { type: "string", description: "Limiter à une classe (nom exact ou partiel), facultatif" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_attendance",
      description: "Absences et retards des élèves aujourd'hui, cette semaine et ce mois, et les élèves les plus absents.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

export function createSchoolToolExecutor(businessId: string) {
  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    if (name === "get_school_overview") {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [students, { data: payments }] = await Promise.all([
        getStudentsAction(),
        supabase.from("student_payments").select("amount").eq("business_id", businessId).gte("paid_at", since),
      ]);
      const active = students.filter((s) => s.active);
      const byClass: Record<string, number> = {};
      for (const s of active) byClass[s.className ?? "Sans classe"] = (byClass[s.className ?? "Sans classe"] ?? 0) + 1;
      return JSON.stringify({
        eleves_inscrits: active.length,
        garcons: active.filter((s) => s.sex === "M").length,
        filles: active.filter((s) => s.sex === "F").length,
        eleves_par_classe: byClass,
        scolarite_due: active.reduce((t, s) => t + s.fee, 0),
        scolarite_encaissee: active.reduce((t, s) => t + s.paid, 0),
        reste_a_encaisser: active.reduce((t, s) => t + s.remaining, 0),
        eleves_en_retard_de_paiement: active.filter((s) => s.remaining > 0).length,
        encaisse_30_derniers_jours: ((payments ?? []) as { amount: number }[]).reduce((t, p) => t + Number(p.amount), 0),
      });
    }
    if (name === "get_unpaid_students") {
      const limit = Math.min(50, Math.max(1, Number(input.limit) || 15));
      const filter = typeof input.className === "string" ? input.className.toLowerCase() : "";
      const list = (await getStudentsAction())
        .filter((s) => s.active && s.remaining > 0 && (!filter || (s.className ?? "").toLowerCase().includes(filter)))
        .sort((a, b) => b.remaining - a.remaining);
      return JSON.stringify({
        total_eleves: list.length,
        total_restant: list.reduce((t, s) => t + s.remaining, 0),
        eleves: list.slice(0, limit).map((s) => ({
          nom: `${s.lastName} ${s.firstName}`.trim(),
          classe: s.className,
          reste: s.remaining,
          paye: s.paid,
          parent: s.parentName,
          telephone_parent: s.parentWhatsapp || s.parentPhone,
        })),
      });
    }
    if (name === "get_attendance") {
      return JSON.stringify(await getAttendanceStatsAction());
    }
    return JSON.stringify({ error: `Outil inconnu : ${name}` });
  };
}
