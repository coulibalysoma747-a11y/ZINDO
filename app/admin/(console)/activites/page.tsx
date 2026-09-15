import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES, ACTIVITY_CATEGORIES } from "@/lib/activities";
import { Card, CardBody } from "@/components/ui/Card";

type ConfigRow = {
  activityKey: string;
  terminology: string | null;
  hiddenNavHrefs: string | null;
  defaultCategories: string | null;
  customFields: string | null;
};

export default async function AdminActivitiesPage() {
  await requireSuperAdmin();

  const { data } = await supabase
    .from("activity_configs")
    .select("activityKey:activity_key, terminology, hiddenNavHrefs:hidden_nav_hrefs, defaultCategories:default_categories, customFields:custom_fields");
  const configs = (data ?? []) as unknown as ConfigRow[];
  const configMap = new Map(configs.map((c) => [c.activityKey, c]));

  function isConfigured(key: string) {
    const c = configMap.get(key);
    if (!c) return false;
    return (
      (c.terminology && c.terminology !== "{}") ||
      (c.hiddenNavHrefs && c.hiddenNavHrefs !== "[]") ||
      (c.defaultCategories && c.defaultCategories !== "[]") ||
      (c.customFields && c.customFields !== "[]")
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Activités</h1>
        <p className="max-w-2xl text-sm text-zinc-500">
          Adaptez l&apos;espace de travail selon le métier du commerçant : vocabulaire de l&apos;interface,
          catégories créées automatiquement, modules masqués et champs produit spécifiques. Tant qu&apos;une
          activité n&apos;est pas configurée ici, elle se comporte exactement comme avant.
        </p>
      </div>

      {ACTIVITY_CATEGORIES.map((cat) => {
        const items = ACTIVITIES.filter((a) => a.category === cat.key);
        if (items.length === 0) return null;
        return (
          <div key={cat.key} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{cat.label}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((activity) => {
                const configured = isConfigured(activity.key);
                return (
                  <Link key={activity.key} href={`/admin/activites/${activity.key}`}>
                    <Card className="transition hover:border-zindo-green-300 hover:shadow-sm">
                      <CardBody className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{activity.emoji}</span>
                          <div>
                            <p className="font-medium text-zinc-900">{activity.label}</p>
                            <p className="text-xs text-zinc-400">{activity.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {configured && (
                            <span className="flex items-center gap-1 rounded-full bg-zindo-green-50 px-2 py-0.5 text-[11px] font-medium text-zindo-green-700">
                              <Settings2 className="h-3 w-3" /> Configuré
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-zinc-300" />
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
