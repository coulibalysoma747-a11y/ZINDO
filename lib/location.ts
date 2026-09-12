import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LOCATION_COOKIE } from "@/lib/constants";

export { LOCATION_COOKIE };

export async function getLocations(businessId: string) {
  return prisma.location.findMany({
    where: { businessId, active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

/**
 * Résout la boutique/dépôt actuellement sélectionné pour l'utilisateur (cookie),
 * en retombant sur la boutique par défaut du commerce si absent ou invalide.
 */
export async function getCurrentLocation(businessId: string) {
  const locations = await getLocations(businessId);
  if (locations.length === 0) return null;

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(LOCATION_COOKIE)?.value;
  const selected = selectedId ? locations.find((l) => l.id === selectedId) : undefined;

  return selected ?? locations.find((l) => l.isDefault) ?? locations[0];
}
