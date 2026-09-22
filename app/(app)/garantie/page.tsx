import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ELECTRONICS_ACTIVITY_KEY } from "@/lib/nav";
import { ensureWarrantyFlagRegistered, isWarrantyModuleEnabled } from "@/lib/actions/warranty";
import { supabase } from "@/lib/supabase";
import { WarrantyManager } from "./WarrantyManager";

export default async function WarrantyPage() {
  const user = await requirePermission(PERMISSIONS.WARRANTY_MANAGE);
  if (user.business.activityKey !== ELECTRONICS_ACTIVITY_KEY) redirect("/dashboard");

  await ensureWarrantyFlagRegistered();
  if (!(await isWarrantyModuleEnabled(user.businessId))) redirect("/dashboard");

  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase.from("products").select("id, name").eq("business_id", user.businessId).eq("active", true).order("name", { ascending: true }),
    supabase.from("customers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Garantie produits</h1>
          <p className="text-sm text-zinc-500">Enregistrez le numéro de série/IMEI d&apos;un appareil vendu, et retrouvez-le au service après-vente.</p>
        </div>
      </div>

      <WarrantyManager products={products ?? []} customers={customers ?? []} />
    </div>
  );
}
