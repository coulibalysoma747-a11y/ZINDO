import "server-only";
import { prisma } from "@/lib/prisma";
import type { ActivityConfigData, CustomFieldDef } from "@/lib/activity-terms";

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

export async function getActivityConfig(activityKey: string | null | undefined): Promise<ActivityConfigData> {
  if (!activityKey) return EMPTY_CONFIG;
  const row = await prisma.activityConfig.findUnique({ where: { activityKey } });
  if (!row) return EMPTY_CONFIG;
  return {
    terminology: safeParseObject(row.terminology),
    hiddenNavHrefs: safeParseArray<string>(row.hiddenNavHrefs),
    defaultCategories: safeParseArray<string>(row.defaultCategories),
    customFields: safeParseArray<CustomFieldDef>(row.customFields),
  };
}
