// Masque, pour chaque activité, les modules du menu qui n'ont clairement
// aucun sens pour elle — via activity_configs.hidden_nav_hrefs, déjà lu par
// lib/nav-server.ts et éditable ensuite par un super-admin depuis
// /admin/activites/[key] ("Modules masqués dans le menu").
//
// 7 activités ont déjà une configuration à la main (cabinet_medical,
// supermarche_alimentation, boutique_generale, quincaillerie, grossiste,
// pharmacie, pieces_detachees) — leur convention, observée dans les données
// réelles avant d'écrire ce script : masquer systématiquement les modules
// réservés à UNE AUTRE activité (moto/médical/péremption/réparation/tables/
// commandes sur mesure/garantie/rendez-vous — déjà filtrés par
// `requireActivity` de toute façon, donc redondant mais harmonisé), plus
// "Location de matériel" sauf quand la location fait vraiment partie du
// métier. Ce script complète la même logique pour les 10 activités qui
// n'ont encore aucune configuration, sans jamais toucher aux 7 déjà faites.
//
// Exécution ponctuelle :
//   npx tsx scripts/seed-activity-hidden-modules.ts
//
// Non destructif, même logique que seed-pharmacie-activity-config.ts : ne
// touche jamais terminology/default_categories/custom_fields, et ne pose
// hidden_nav_hrefs que si le champ est encore vide (jamais personnalisé par
// un super-admin) — ne va donc jamais écraser un réglage déjà fait à la main
// depuis /admin/activites/[key].
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Modules toujours visibles (voir app/admin/(console)/activites/[key]/page.tsx
// ALWAYS_VISIBLE_HREFS) : /dashboard, /parametres, /support — pas la peine de
// les lister ici, ils ne sont de toute façon jamais proposés au masquage.
const LOCATION = "/location"; // Location de matériel/tenues — pertinent pour certains métiers précis seulement.
const MOTO = ["/vente-engin", "/immatriculation-engins"];
const MEDICAL = ["/consultations", "/consultations/statistiques", "/consultations/actes", "/consultations/diagnostics", "/consultations/posologies"];
const EXPIRY = ["/peremption"];
const REPAIR = ["/reparations"];
const TABLES = ["/tables"];
const CUSTOM_ORDERS = ["/commandes-sur-mesure"];
const WARRANTY = ["/garantie"];
const APPOINTMENTS = ["/rendez-vous", "/rendez-vous/services"];

const ALL_ACTIVITY_GATED = [...MOTO, ...MEDICAL, ...EXPIRY, ...REPAIR, ...TABLES, ...CUSTOM_ORDERS, ...WARRANTY, ...APPOINTMENTS];

/** Modules réservés à une AUTRE activité que `keep` — à masquer par cohérence avec les 7 configs déjà faites à la main (sans effet réel puisque déjà filtrés par requireActivity, mais harmonisé). */
function otherActivityModules(keep: string[]): string[] {
  return ALL_ACTIVITY_GATED.filter((href) => !keep.includes(href));
}

// Location de matériel/tenues gardée visible seulement pour atelier_reparation
// (outillage) et vetements_chaussures (tenues de cérémonie) — voir leurs
// entrées ci-dessous, qui n'incluent volontairement pas LOCATION.
const HIDDEN_BY_ACTIVITY: Record<string, string[]> = {
  depot_entrepot: [...otherActivityModules([]), LOCATION],
  boutique_moto: [...otherActivityModules(MOTO), LOCATION],
  atelier_reparation: otherActivityModules(REPAIR),
  restaurant_maquis: [...otherActivityModules(TABLES), LOCATION],
  bar_buvette: [...otherActivityModules(TABLES), LOCATION],
  cosmetique_beaute: [...otherActivityModules(APPOINTMENTS), LOCATION],
  vetements_chaussures: otherActivityModules([]),
  electronique_telephonie: [...otherActivityModules(WARRANTY), LOCATION],
  atelier_artisanat: [...otherActivityModules(CUSTOM_ORDERS), LOCATION],
  autre: [...MOTO, LOCATION], // même traitement minimal que boutique_generale à l'origine.
};

async function main() {
  for (const [activityKey, hiddenNavHrefs] of Object.entries(HIDDEN_BY_ACTIVITY)) {
    const { data: existing, error: fetchError } = await supabase
      .from("activity_configs")
      .select("id, hiddenNavHrefs:hidden_nav_hrefs")
      .eq("activity_key", activityKey)
      .maybeSingle();
    if (fetchError) {
      console.error(`[${activityKey}] Lecture échouée : ${fetchError.message}`);
      continue;
    }

    if (!existing) {
      if (hiddenNavHrefs.length === 0) {
        console.log(`[${activityKey}] Rien à masquer — pas de ligne créée.`);
        continue;
      }
      const { error } = await supabase.from("activity_configs").insert({
        activity_key: activityKey,
        terminology: JSON.stringify({}),
        hidden_nav_hrefs: JSON.stringify(hiddenNavHrefs),
        default_categories: JSON.stringify([]),
        custom_fields: JSON.stringify([]),
      });
      if (error) {
        console.error(`[${activityKey}] Écriture échouée : ${error.message}`);
        continue;
      }
      console.log(`[${activityKey}] Config créée — masqué : ${hiddenNavHrefs.join(", ") || "(aucun)"}`);
      continue;
    }

    const existingHidden: string[] = existing.hiddenNavHrefs ? JSON.parse(existing.hiddenNavHrefs as string) : [];
    if (existingHidden.length > 0) {
      console.log(`[${activityKey}] hidden_nav_hrefs déjà personnalisé (${existingHidden.join(", ")}) — laissé tel quel.`);
      continue;
    }
    if (hiddenNavHrefs.length === 0) {
      console.log(`[${activityKey}] Rien à masquer.`);
      continue;
    }

    const { error } = await supabase
      .from("activity_configs")
      .update({ hidden_nav_hrefs: JSON.stringify(hiddenNavHrefs), updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) {
      console.error(`[${activityKey}] Écriture échouée : ${error.message}`);
      continue;
    }
    console.log(`[${activityKey}] Masqué : ${hiddenNavHrefs.join(", ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
