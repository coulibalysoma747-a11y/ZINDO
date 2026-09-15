"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { ACTIVITIES } from "@/lib/activities";
import { TERM_DEFAULTS, type TermKey, type CustomFieldDef } from "@/lib/activity-config";

export type ActionState = { error?: string; success?: string } | undefined;

const customFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Clé de champ invalide"),
  label: z.string().min(1).max(60),
  type: z.enum(["text", "number", "date"]),
});

export async function saveActivityConfigAction(
  activityKey: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();

  const activity = ACTIVITIES.find((a) => a.key === activityKey);
  if (!activity) return { error: "Activité introuvable" };

  const terminology: Partial<Record<TermKey, string>> = {};
  for (const term of Object.keys(TERM_DEFAULTS) as TermKey[]) {
    const value = String(formData.get(`term_${term}`) ?? "").trim();
    if (value) terminology[term] = value;
  }

  const hiddenNavHrefs = formData.getAll("hiddenNavHrefs").map((v) => String(v));

  const defaultCategories = String(formData.get("defaultCategories") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  let customFields: CustomFieldDef[] = [];
  const customFieldsRaw = String(formData.get("customFieldsJson") ?? "[]");
  try {
    const parsed = JSON.parse(customFieldsRaw);
    const result = z.array(customFieldSchema).safeParse(parsed);
    if (!result.success) return { error: "Champs personnalisés invalides" };
    customFields = result.data;
  } catch {
    return { error: "Champs personnalisés invalides" };
  }

  const { error } = await supabase.from("activity_configs").upsert(
    {
      activity_key: activityKey,
      terminology: JSON.stringify(terminology),
      hidden_nav_hrefs: JSON.stringify(hiddenNavHrefs),
      default_categories: JSON.stringify(defaultCategories),
      custom_fields: JSON.stringify(customFields),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "activity_key", ignoreDuplicates: false }
  );
  if (error) {
    console.error("[saveActivityConfigAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer la configuration" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "ActivityConfig",
    entityId: activityKey,
    details: activity.label,
  });

  revalidatePath(`/admin/activites/${activityKey}`);
  revalidatePath("/admin/activites");
  return { success: "Configuration enregistrée" };
}
