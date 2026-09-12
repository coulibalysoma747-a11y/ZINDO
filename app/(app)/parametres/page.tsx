import Link from "next/link";
import { Pencil } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { findActivity } from "@/lib/activities";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { PaymentMethodsPanel } from "./PaymentMethodsPanel";
import { PermissionsPanel } from "./PermissionsPanel";
import type { PaymentMethod } from "@prisma/client";

const ALL_METHODS: { method: PaymentMethod; defaultLabel: string }[] = [
  { method: "ESPECES", defaultLabel: "Espèces" },
  { method: "MOBILE_MONEY", defaultLabel: "Mobile Money" },
  { method: "CARTE", defaultLabel: "Carte bancaire" },
  { method: "CREDIT", defaultLabel: "Crédit" },
  { method: "AUTRE", defaultLabel: "Autre" },
];

export default async function SettingsPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const [configs, overrides] = await Promise.all([
    prisma.paymentMethodConfig.findMany({ where: { businessId: user.businessId } }),
    prisma.rolePermission.findMany({ where: { businessId: user.businessId } }),
  ]);

  const configMap = new Map(configs.map((c) => [c.method, c]));
  const paymentMethods = ALL_METHODS.map(({ method, defaultLabel }) => ({
    method,
    label: configMap.get(method)?.label ?? defaultLabel,
    enabled: configMap.get(method)?.enabled ?? (method !== "AUTRE"),
  }));

  const activity = findActivity(user.business.activityKey);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Paramètres</h1>
        <p className="text-sm text-zinc-500">Configurez votre commerce, vos moyens de paiement et vos permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Mon activité</h2>
        </CardHeader>
        <CardBody className="flex items-center justify-between gap-3">
          {activity ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activity.emoji}</span>
              <div>
                <p className="font-medium text-zinc-900">{activity.label}</p>
                <p className="text-xs text-zinc-500">{activity.description}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucune activité définie.</p>
          )}
          <Link
            href="/choisir-activite?change=1"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Commerce</h2>
        </CardHeader>
        <CardBody>
          <BusinessSettingsForm business={user.business} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Moyens de paiement</h2>
        </CardHeader>
        <CardBody>
          <PaymentMethodsPanel methods={paymentMethods} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Rôles et permissions</h2>
        </CardHeader>
        <CardBody>
          <PermissionsPanel overrides={overrides} />
        </CardBody>
      </Card>
    </div>
  );
}
