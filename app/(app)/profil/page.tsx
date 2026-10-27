import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/permissions";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { ThemeSelector } from "./ThemeSelector";
import { TwoFactorPanel } from "./TwoFactorPanel";
import { PushNotificationsPanel } from "./PushNotificationsPanel";
import { QuickLoginPanel } from "./QuickLoginPanel";
import { getQuickLoginStatus, isQuickLoginEnabled } from "@/lib/quick-login";
import { ensureSaleCancelAlertFlagRegistered } from "@/lib/sale-cancel-alert";
import type { ThemePreference } from "@/lib/actions/preferences";

export default async function ProfilePage() {
  const user = await requireUser();
  // Fait apparaître le flag « Alerte vente annulée » dans /admin/fonctionnalites.
  void ensureSaleCancelAlertFlagRegistered();
  // Connexion rapide (PIN, Face ID) : visible seulement si le flag est actif pour ce commerce.
  const quick = (await isQuickLoginEnabled(user.businessId)) ? await getQuickLoginStatus(user.id) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Mon profil</h1>
        <p className="text-sm text-zinc-500">
          {roleLabels(user.business.activityKey)[user.role]} · {user.business.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Informations personnelles</h2>
        </CardHeader>
        <CardBody>
          <ProfileForm
            user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Apparence</h2>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-zinc-500">Choisissez le thème de l&apos;application.</p>
          <ThemeSelector current={user.theme as ThemePreference} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Notifications</h2>
        </CardHeader>
        <CardBody>
          <PushNotificationsPanel />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Sécurité</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <PasswordForm />
          {user.role === "ADMIN" && (
            <div className="border-t border-zinc-100 pt-6">
              <h3 className="mb-3 font-medium text-zinc-900">Double authentification (2FA)</h3>
              <TwoFactorPanel enabled={user.totpEnabled} />
            </div>
          )}
        </CardBody>
      </Card>
      {quick && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Connexion rapide</h2>
          </CardHeader>
          <CardBody>
            <QuickLoginPanel
              ready={quick.ready}
              pinSet={quick.pinSet}
              deviceTrusted={quick.deviceTrusted}
              totpEnabled={user.totpEnabled}
              passkeys={quick.passkeys}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
