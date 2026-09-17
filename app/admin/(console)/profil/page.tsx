import { Crown } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProfileForm } from "./ProfileForm";
import { TwoFactorPanel } from "./TwoFactorPanel";

export default async function AdminProfilePage() {
  const admin = await requireSuperAdmin();
  const isFounder = admin.role === "FOUNDER";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Mon profil</h1>
        <p className="text-sm text-zinc-500">Compte administrateur de la plateforme — accès réservé.</p>
      </div>

      {isFounder && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-white">
          <CardBody className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-900">{admin.name.toUpperCase()}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                Créateur • Fondateur • Propriétaire
              </p>
              <p className="text-xs text-zinc-500">Compte principal ZINDO</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Identifiants</h2>
        </CardHeader>
        <CardBody>
          <ProfileForm name={admin.name} email={admin.email} />
        </CardBody>
      </Card>

      {isFounder && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Double authentification (2FA)</h2>
          </CardHeader>
          <CardBody>
            <TwoFactorPanel enabled={admin.totpEnabled} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
