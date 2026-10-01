import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { NewArrivalForm } from "./NewArrivalForm";

export default async function NewArrivalPage() {
  const user = await requirePermission(PERMISSIONS.COST_PRICE_MANAGE);
  const [locations, currentLocation, { data: suppliers }] = await Promise.all([
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/prix-de-revient" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux arrivages
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Nouvel arrivage</h1>
        <p className="mt-1 text-sm text-zinc-500">Une commande reçue, avec les frais payés pour qu&apos;elle arrive chez vous.</p>
      </div>
      <NewArrivalForm
        locations={locations.map((l) => ({ id: l.id as string, name: l.name as string }))}
        defaultLocationId={currentLocation?.id ?? locations[0]?.id ?? ""}
        suppliers={(suppliers ?? []).map((s) => ({ id: s.id as string, name: s.name as string }))}
      />
    </div>
  );
}
