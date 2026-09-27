import "server-only";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const FIRST_STEPS_FLAG = "premiers_pas";

export type FirstStep = {
  key: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  done: boolean;
  optional?: boolean;
};

export async function isFirstStepsEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    FIRST_STEPS_FLAG,
    "Premiers pas (tableau de bord)",
    "Carte « Premiers pas » en haut du tableau de bord de l'administrateur : commerce renseigné, premier produit, première vente, premier client, premier employé (facultatif), cochés automatiquement. Disparaît quand les étapes obligatoires sont faites."
  );
  return isFeatureEnabled(FIRST_STEPS_FLAG, businessId);
}

const countOf = async (table: "products" | "customers" | "users", businessId: string) => {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("business_id", businessId);
  return count ?? 0;
};

/**
 * Étapes de démarrage d'un nouveau commerce, déduites des données (rien à
 * cocher à la main). Renvoie null quand les étapes obligatoires sont faites :
 * la carte n'a alors plus de raison d'être (sauf `force`, pour l'aperçu
 * /dashboard?apercu=premiers-pas).
 */
export async function getFirstSteps(businessId: string, force = false): Promise<FirstStep[] | null> {
  const [{ data: business }, products, sales, customers, users] = await Promise.all([
    supabase.from("businesses").select("phone, address, city").eq("id", businessId).maybeSingle(),
    countOf("products", businessId),
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .neq("status", "ANNULEE")
      .then(({ count }) => count ?? 0),
    countOf("customers", businessId),
    countOf("users", businessId),
  ]);

  const businessFilled = !!business?.phone && !!(business?.address || business?.city);
  const steps: FirstStep[] = [
    {
      key: "commerce",
      title: "Renseignez votre commerce",
      text: "Téléphone et adresse : ils s'impriment sur vos tickets et vos factures.",
      href: "/parametres",
      cta: "Ouvrir les paramètres",
      done: businessFilled,
    },
    {
      key: "produit",
      title: "Ajoutez votre premier produit",
      text: "Nom, prix d'achat, prix de vente et quantité en stock. Vous pouvez aussi importer une liste Excel.",
      href: "/produits/nouveau",
      cta: "Ajouter un produit",
      done: products > 0,
    },
    {
      key: "vente",
      title: "Faites votre première vente",
      text: "Choisissez le produit, encaissez : le stock baisse tout seul et le ticket est prêt.",
      href: "/ventes",
      cta: "Ouvrir la caisse",
      done: sales > 0,
    },
    {
      key: "client",
      title: "Enregistrez un client",
      text: "Indispensable pour vendre à crédit et savoir qui vous doit combien.",
      href: "/clients",
      cta: "Ajouter un client",
      done: customers > 0,
    },
    {
      key: "employe",
      title: "Ajoutez un employé",
      text: "Chaque vendeur a son propre accès, et vous choisissez ce qu'il peut voir.",
      href: "/utilisateurs",
      cta: "Ajouter un employé",
      done: users > 1,
      optional: true,
    },
  ];

  if (!force && steps.every((s) => s.done || s.optional)) return null;
  return steps;
}
