import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/lib/activities";
import { NAV_ITEMS } from "@/lib/nav";
import { ActivityConfigForm } from "./ActivityConfigForm";

const ALWAYS_VISIBLE_HREFS = ["/dashboard", "/parametres", "/support"];

export default async function AdminActivityConfigPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireSuperAdmin();
  const { key } = await params;

  const activity = ACTIVITIES.find((a) => a.key === key);
  if (!activity) notFound();

  const { data: config } = await supabase
    .from("activity_configs")
    .select("terminology, hiddenNavHrefs:hidden_nav_hrefs, defaultCategories:default_categories, customFields:custom_fields")
    .eq("activity_key", key)
    .maybeSingle();

  const hideableNavItems = NAV_ITEMS.filter((item) => !ALWAYS_VISIBLE_HREFS.includes(item.href)).map((item) => ({
    href: item.href,
    label: item.label,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/activites" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux activités
      </Link>

      <div className="flex items-center gap-3">
        <span className="text-3xl">{activity.emoji}</span>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{activity.label}</h1>
          <p className="text-sm text-zinc-500">{activity.description}</p>
        </div>
      </div>

      <ActivityConfigForm
        activityKey={activity.key}
        hideableNavItems={hideableNavItems}
        initial={{
          terminology: config?.terminology ? JSON.parse(config.terminology as string) : {},
          hiddenNavHrefs: config?.hiddenNavHrefs ? JSON.parse(config.hiddenNavHrefs as string) : [],
          defaultCategories: config?.defaultCategories ? JSON.parse(config.defaultCategories as string) : [],
          customFields: config?.customFields ? JSON.parse(config.customFields as string) : [],
        }}
      />
    </div>
  );
}
