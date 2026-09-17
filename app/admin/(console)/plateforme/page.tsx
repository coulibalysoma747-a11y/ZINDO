import { Download, Settings2 } from "lucide-react";
import { requireFounder } from "@/lib/superadmin-auth";
import { getPlatformConfig } from "@/lib/platform-config";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { PlatformConfigForm } from "./PlatformConfigForm";

export default async function PlatformSettingsPage() {
  await requireFounder();
  const config = await getPlatformConfig();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Réglages plateforme</h1>
          <p className="text-sm text-zinc-500">Mode maintenance, annonce globale et export des données.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Maintenance &amp; annonce</h2>
        </CardHeader>
        <CardBody>
          <PlatformConfigForm config={config} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Export des données</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-zinc-500">
            Télécharge un fichier JSON avec les données principales de tous les commerces (commerces,
            utilisateurs sans mot de passe, produits, ventes, achats, clients, fournisseurs, abonnements). Ceci
            n&apos;est pas une sauvegarde complète de la base — Supabase gère déjà les sauvegardes automatiques
            de l&apos;infrastructure.
          </p>
          <ButtonLink href="/admin/plateforme/export" variant="outline">
            <Download className="h-4 w-4" /> Exporter toutes les données
          </ButtonLink>
        </CardBody>
      </Card>
    </div>
  );
}
