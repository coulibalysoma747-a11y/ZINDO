import "server-only";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { LOCATION_COOKIE } from "@/lib/constants";

export { LOCATION_COOKIE };

export async function getLocations(businessId: string) {
  const { data, error } = await supabase
    .from("locations")
    .select(
      "id, businessId:business_id, name, type, address, city, isDefault:is_default, active, createdAt:created_at"
    )
    .eq("business_id", businessId)
    .eq("active", true)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[getLocations] Échec de la requête Supabase :", error.message);
    return [];
  }
  return data ?? [];
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
