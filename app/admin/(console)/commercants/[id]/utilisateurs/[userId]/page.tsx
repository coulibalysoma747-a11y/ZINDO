import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_LABELS } from "@/lib/permissions";
import { NAV_ITEMS } from "@/lib/nav";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UserModulesPanel } from "./UserModulesPanel";

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: "ADMIN" | "VENDEUR" | "GESTIONNAIRE_STOCK";
  business: { name: string };
};

export default async function AdminUserModulesPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id: businessId, userId } = await params;

  const { data: userData } = await supabase
    .from("users")
    .select("id, firstName:first_name, lastName:last_name, phone, email, role, business:businesses(name)")
    .eq("id", userId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!userData) notFound();
  const user = userData as unknown as UserRow;

  const [{ data: userOverridesData }, { data: roleOverridesData }, { data: globalOverridesData }] = await Promise.all([
    supabase.from("user_permissions").select("permission, allowed").eq("user_id", userId),
    supabase.from("role_permissions").select("permission, allowed").eq("business_id", businessId).eq("role", user.role),
    supabase.from("global_role_permissions").select("permission, allowed").eq("role", user.role),
  ]);
  const userOverrides = (userOverridesData ?? []) as Array<{ permission: string; allowed: boolean }>;
  const roleOverrides = (roleOverridesData ?? []) as Array<{ permission: string; allowed: boolean }>;
  const globalOverrides = (globalOverridesData ?? []) as Array<{ permission: string; allowed: boolean }>;

  // Certains modules du menu partagent la même permission sous-jacente (ex. Clients
  // et Crédits utilisent tous deux CUSTOMERS_VIEW) : on regroupe par permission pour
  // n'afficher qu'une seule case à cocher par droit réellement distinct.
  const moduleLabels = new Map<string, string[]>();
  for (const item of NAV_ITEMS) {
    if (!item.permission) continue;
    const labels = moduleLabels.get(item.permission) ?? [];
    labels.push(item.label);
    moduleLabels.set(item.permission, labels);
  }
  const modules = Array.from(moduleLabels.entries()).map(([permission, labels]) => ({
    permission,
    label: labels.join(" / "),
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/commercants/${businessId}`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à {user.business.name}
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-zinc-900">
            {user.firstName} {user.lastName}
          </h1>
          <Badge tone="zinc">{ROLE_LABELS[user.role]}</Badge>
        </div>
        <p className="text-sm text-zinc-500">
          {user.phone}
          {user.email ? ` — ${user.email}` : ""} — {user.business.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Modules de l&apos;application</h2>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-zinc-500">
            Par défaut, ce compte voit les modules autorisés pour son rôle («&nbsp;{ROLE_LABELS[user.role]}
            &nbsp;»). Vous pouvez ici forcer l&apos;accès ou le retirer pour ce compte précisément — par
            exemple, masquer le module Transferts pour ce seul utilisateur.
          </p>
          <UserModulesPanel
            userId={user.id}
            role={user.role}
            modules={modules}
            userOverrides={userOverrides}
            roleOverrides={roleOverrides}
            globalOverrides={globalOverrides}
            defaultPermissions={DEFAULT_ROLE_PERMISSIONS[user.role]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
