import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Contrôle du déploiement progressif des nouvelles fonctionnalités : une
 * fonctionnalité inconnue de cette table (jamais enregistrée via
 * registerFeatureFlag) est considérée comme définitive/toujours active — ce
 * mécanisme ne concerne que les fonctionnalités volontairement enregistrées
 * comme "en cours de déploiement".
 *
 * Règle impérative : toute nouvelle fonctionnalité ajoutée à ZINDO doit être
 * enregistrée ici et rester désactivée pour tout le monde tant que le
 * propriétaire de la plateforme n'a pas explicitement demandé de l'activer
 * (globalement ou pour un commerce précis) depuis /admin/fonctionnalites.
 */
export async function isFeatureEnabled(key: string, businessId: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    include: { overrides: { where: { businessId } } },
  });
  if (!flag) return true;
  if (flag.enabledGlobally) return true;
  return flag.overrides[0]?.enabled ?? false;
}

/**
 * À appeler (une fois, par ex. au moment d'introduire la fonctionnalité dans
 * le code) pour créer la fiche du flag s'il n'existe pas déjà — sans jamais
 * écraser un flag existant (et donc sans jamais réactiver par erreur quelque
 * chose que l'administrateur a délibérément laissé désactivé).
 */
export async function registerFeatureFlag(key: string, label: string, description?: string) {
  await prisma.featureFlag.upsert({
    where: { key },
    update: {},
    create: { key, label, description },
  });
}
