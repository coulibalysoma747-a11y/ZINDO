import { supabase } from "@/lib/supabase";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { GlobalPermissionsPanel } from "./GlobalPermissionsPanel";

export default async function AdminPermissionsPage() {
  const { data } = await supabase.from("global_role_permissions").select("role, permission, allowed");
  const overrides = (data ?? []) as unknown as Array<{ role: "ADMIN" | "VENDEUR" | "GESTIONNAIRE_STOCK"; permission: string; allowed: boolean }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Permissions par défaut de la plateforme</h1>
        <p className="text-sm text-zinc-500">
          Cette matrice définit ce que chaque rôle peut faire par défaut, pour tous les commerçants. Un
          commerçant qui personnalise ses propres permissions (dans ses Paramètres) garde priorité sur ces
          réglages.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Rôles et permissions (défaut plateforme)</h2>
        </CardHeader>
        <CardBody>
          <GlobalPermissionsPanel overrides={overrides} />
        </CardBody>
      </Card>
    </div>
  );
}
