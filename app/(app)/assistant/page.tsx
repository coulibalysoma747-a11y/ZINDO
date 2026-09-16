import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentLocation } from "@/lib/location";
import { getBusinessInsights } from "@/lib/actions/insights";
import { isAssistantConfigured } from "@/lib/ai/deepseek";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { InsightCard } from "@/components/assistant/InsightCard";
import { AssistantChat } from "./AssistantChat";

export default async function AssistantPage() {
  const user = await requirePermission(PERMISSIONS.ASSISTANT_USE);
  const currentLocation = await getCurrentLocation(user.businessId);
  const configured = isAssistantConfigured();

  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez une boutique pour que l'assistant puisse analyser vos données."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  const insights = await getBusinessInsights(user.businessId, currentLocation.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Assistant IA commercial</h1>
        <p className="text-sm text-zinc-500">
          Conseils automatiques et réponses à vos questions sur {currentLocation.name}.
        </p>
      </div>

      {!configured && (
        <Card className="border-amber-200 bg-amber-50">
          <CardBody>
            <p className="text-sm font-medium text-amber-800">Assistant non configuré</p>
            <p className="mt-1 text-sm text-amber-700">
              Ajoutez une clé <code className="rounded bg-amber-100 px-1">DEEPSEEK_API_KEY</code> dans le
              fichier <code className="rounded bg-amber-100 px-1">.env</code> à la racine du projet, puis
              redémarrez le serveur pour activer les réponses aux questions. Les conseils automatiques
              ci-dessous restent disponibles sans configuration.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Ce que l&apos;assistant a remarqué</h2>
        </CardHeader>
        <CardBody>
          {insights.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune alerte pour le moment — continuez à enregistrer vos ventes pour affiner l&apos;analyse.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-2 font-semibold text-zinc-900">Poser une question</h2>
        <AssistantChat configured={configured} />
      </div>
    </div>
  );
}
