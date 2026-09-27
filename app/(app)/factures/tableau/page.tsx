import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isFactureTableEnabled } from "@/lib/facture-table";
import { POSPageContent } from "@/app/(app)/ventes/POSPageContent";

/** Facture A4 (tableau) — flag facture_tableau, voir lib/facture-table.ts. */
export default async function FactureTablePage() {
  const user = await requireUser();
  if (!(await isFactureTableEnabled(user.businessId))) redirect("/factures");
  return <POSPageContent mode="facture" table />;
}
