import "server-only";
import { supabase } from "@/lib/supabase";
import type { ActivityConfigData, CustomFieldDef } from "@/lib/activity-terms";
import { cache } from "react";

export type { TermKey, CustomFieldType, CustomFieldDef, ActivityConfigData } from "@/lib/activity-terms";
export { TERM_DEFAULTS, TERM_NAV_HREF, resolveTerm } from "@/lib/activity-terms";

const EMPTY_CONFIG: ActivityConfigData = {
  terminology: {},
  hiddenNavHrefs: [],
  defaultCategories: [],
  customFields: [],
};

function safeParseArray<T>(json: string | null): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseObject(json: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function getActivityConfigUncached(activityKey: string | null | undefined): Promise<ActivityConfigData> {
  if (!activityKey) return EMPTY_CONFIG;
  const { data: row } = await supabase
    .from("activity_configs")
    .select(
      "terminology, hiddenNavHrefs:hidden_nav_hrefs, defaultCategories:default_categories, customFields:custom_fields"
    )
    .eq("activity_key", activityKey)
    .maybeSingle();
  if (!row) return EMPTY_CONFIG;
  return {
    terminology: safeParseObject(row.terminology as string | null),
    hiddenNavHrefs: safeParseArray<string>(row.hiddenNavHrefs as string | null),
    defaultCategories: safeParseArray<string>(row.defaultCategories as string | null),
    customFields: safeParseArray<CustomFieldDef>(row.customFields as string | null),
  };
}

/** Mémorisé le temps d'une requête : le layout et la page l'appellent tous les deux. */
export const getActivityConfig = cache(getActivityConfigUncached);
