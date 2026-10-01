import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getArrival } from "@/lib/cost-arrivals-data";
import { ArrivalEditor } from "./ArrivalEditor";

export default async function ArrivalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.COST_PRICE_MANAGE);
  const found = await getArrival(user.businessId, id);
  if (!found) notFound();

  const draft = found.arrival.status === "BROUILLON";
  const [{ data: suppliers }, { data: purchases }] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    draft
      ? supabase
          .from("purchases")
          .select("id, number, createdAt:created_at, supplier:suppliers(name)")
          .eq("business_id", user.businessId)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/prix-de-revient" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux arrivages
      </Link>
      <ArrivalEditor
        arrival={found.arrival}
        items={found.items}
        expenses={found.expenses}
        suppliers={(suppliers ?? []).map((s) => ({ id: s.id as string, name: s.name as string }))}
        purchases={((purchases ?? []) as unknown as { id: string; number: string; createdAt: string; supplier: { name: string } | null }[]).map((p) => ({
          id: p.id,
          label: `${p.number} · ${new Date(p.createdAt).toLocaleDateString("fr-FR")}${p.supplier ? ` · ${p.supplier.name}` : ""}`,
        }))}
        currency={user.business.currency}
      />
    </div>
  );
}
