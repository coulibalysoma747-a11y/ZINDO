import "server-only";
import type { DeepSeekTool } from "@/lib/ai/deepseek";
import { supabase } from "@/lib/supabase";
import { startOfToday, startOfWeek, startOfMonth } from "@/lib/format";

type PeriodKey = "today" | "week" | "month" | "all";

function periodStart(period: PeriodKey): Date | undefined {
  if (period === "today") return startOfToday();
  if (period === "week") return startOfWeek();
  if (period === "month") return startOfMonth();
  return undefined;
}

const AGE_GROUP_LABELS: Record<string, string> = { ENFANT: "Enfant", ADULTE: "Adulte", SENIOR: "Senior" };

/**
 * Outils dédiés à l'activité "cabinet_medical" (voir lib/nav.ts) — remplacent
 * entièrement ASSISTANT_TOOLS (lib/ai/tools.ts), pensés pour une boutique
 * avec vente/stock/crédit, sans équivalent pour un cabinet. Interrogent les
 * mêmes données que /consultations/statistiques, en langage naturel. Voir
 * docs/cahier-des-charges-cabinet-medical.md §8.
 */
export const MEDICAL_ASSISTANT_TOOLS: DeepSeekTool[] = [
  {
    type: "function",
    function: {
      name: "get_consultation_summary",
      description:
        "Bilan du cabinet sur une période : nombre de consultations, recettes, charges (module Dépenses) et bénéfice estimé.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Période à analyser (défaut: month)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_diagnoses",
      description: "Pathologies/diagnostics les plus fréquents sur une période, avec le nombre de cas et le pourcentage.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Période à analyser (défaut: month)" },
          limit: { type: "number", description: "Nombre de diagnostics à retourner (défaut: 10, max 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_acts",
      description: "Actes médicaux les plus pratiqués sur une période (consultation générale, pansement, injection...).",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Période à analyser (défaut: month)" },
          limit: { type: "number", description: "Nombre d'actes à retourner (défaut: 10, max 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_demographics",
      description: "Profil de la patientèle sur une période : répartition par sexe et par tranche d'âge (enfant/adulte/senior).",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Période à analyser (défaut: month)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_most_prescribed_items",
      description:
        "Produits/médicaments les plus prescrits en ordonnance sur une période (catalogue Produits ou description libre confondus).",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Période à analyser (défaut: month)" },
          limit: { type: "number", description: "Nombre de produits à retourner (défaut: 10, max 20)" },
        },
        required: [],
      },
    },
  },
];

export function createMedicalToolExecutor(businessId: string) {
  return async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case "get_consultation_summary": {
        const period = (input.period as PeriodKey) ?? "month";
        const start = periodStart(period);

        let consultationsQuery = supabase.from("consultations").select("fee").eq("business_id", businessId);
        if (start) consultationsQuery = consultationsQuery.gte("created_at", start.toISOString());
        let expensesQuery = supabase.from("expenses").select("amount").eq("business_id", businessId);
        if (start) expensesQuery = expensesQuery.gte("date", start.toISOString());

        const [{ data: consultationsData }, { data: expensesData }] = await Promise.all([consultationsQuery, expensesQuery]);
        const consultations = (consultationsData ?? []) as unknown as Array<{ fee: number }>;
        const expenses = (expensesData ?? []) as unknown as Array<{ amount: number }>;

        const recettes = consultations.reduce((s, c) => s + (c.fee || 0), 0);
        const charges = expenses.reduce((s, e) => s + (e.amount || 0), 0);

        return JSON.stringify({
          periode: period,
          nombreConsultations: consultations.length,
          recettes,
          charges,
          beneficeEstime: recettes - charges,
        });
      }

      case "get_top_diagnoses": {
        const period = (input.period as PeriodKey) ?? "month";
        const limit = Math.min(Number(input.limit) || 10, 20);
        const start = periodStart(period);

        let query = supabase.from("consultations").select("diagnosis").eq("business_id", businessId);
        if (start) query = query.gte("created_at", start.toISOString());
        const { data } = await query;
        const rows = (data ?? []) as unknown as Array<{ diagnosis: string }>;

        const counts = new Map<string, number>();
        for (const r of rows) counts.set(r.diagnosis, (counts.get(r.diagnosis) ?? 0) + 1);
        const total = rows.length;
        const top = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([diagnostic, count]) => ({ diagnostic, cas: count, pourcent: total ? Math.round((count / total) * 1000) / 10 : 0 }));

        return JSON.stringify({ periode: period, totalConsultations: total, diagnostics: top });
      }

      case "get_top_acts": {
        const period = (input.period as PeriodKey) ?? "month";
        const limit = Math.min(Number(input.limit) || 10, 20);
        const start = periodStart(period);

        let query = supabase.from("consultations").select("act:medical_acts(name)").eq("business_id", businessId);
        if (start) query = query.gte("created_at", start.toISOString());
        const { data } = await query;
        const rows = (data ?? []) as unknown as Array<{ act: { name: string } | null }>;

        const counts = new Map<string, number>();
        let withAct = 0;
        for (const r of rows) {
          if (!r.act) continue;
          withAct++;
          counts.set(r.act.name, (counts.get(r.act.name) ?? 0) + 1);
        }
        const top = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([acte, count]) => ({ acte, nombre: count, pourcent: withAct ? Math.round((count / withAct) * 1000) / 10 : 0 }));

        return JSON.stringify({ periode: period, totalConsultationsAvecActe: withAct, actes: top });
      }

      case "get_patient_demographics": {
        const period = (input.period as PeriodKey) ?? "month";
        const start = periodStart(period);

        let query = supabase.from("consultations").select("sex, ageGroup:age_group").eq("business_id", businessId);
        if (start) query = query.gte("created_at", start.toISOString());
        const { data } = await query;
        const rows = (data ?? []) as unknown as Array<{ sex: "M" | "F"; ageGroup: "ENFANT" | "ADULTE" | "SENIOR" }>;

        const sexCounts = { M: 0, F: 0 };
        const ageCounts = { ENFANT: 0, ADULTE: 0, SENIOR: 0 };
        for (const r of rows) {
          sexCounts[r.sex]++;
          ageCounts[r.ageGroup]++;
        }
        const total = rows.length;
        const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

        return JSON.stringify({
          periode: period,
          totalConsultations: total,
          parSexe: { masculin: sexCounts.M, masculinPourcent: pct(sexCounts.M), feminin: sexCounts.F, femininPourcent: pct(sexCounts.F) },
          parAge: Object.entries(ageCounts).map(([key, count]) => ({
            trancheAge: AGE_GROUP_LABELS[key],
            nombre: count,
            pourcent: pct(count),
          })),
        });
      }

      case "get_most_prescribed_items": {
        const period = (input.period as PeriodKey) ?? "month";
        const limit = Math.min(Number(input.limit) || 10, 20);
        const start = periodStart(period);

        let query = supabase
          .from("consultation_items")
          .select("quantity, customName:custom_name, product:products(name), consultation:consultations!inner(businessId:business_id, createdAt:created_at)")
          .eq("consultations.business_id", businessId);
        if (start) query = query.gte("consultations.created_at", start.toISOString());
        const { data } = await query;
        const rows = (data ?? []) as unknown as Array<{ quantity: number; customName: string | null; product: { name: string } | null }>;

        const counts = new Map<string, { fois: number; quantiteTotale: number }>();
        for (const r of rows) {
          const name = r.product?.name ?? r.customName;
          if (!name) continue;
          const existing = counts.get(name);
          if (existing) {
            existing.fois++;
            existing.quantiteTotale += r.quantity;
          } else {
            counts.set(name, { fois: 1, quantiteTotale: r.quantity });
          }
        }
        const top = [...counts.entries()]
          .sort((a, b) => b[1].fois - a[1].fois)
          .slice(0, limit)
          .map(([produit, v]) => ({ produit, prescritDansXOrdonnances: v.fois, quantiteTotale: v.quantiteTotale }));

        return JSON.stringify({ periode: period, produits: top });
      }

      default:
        return JSON.stringify({ error: `Outil inconnu : ${name}` });
    }
  };
}
