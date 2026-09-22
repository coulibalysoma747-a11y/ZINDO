// Config initiale de l'activité "pharmacie" (catégories par défaut + champs
// produit spécifiques) — voir docs/cahier-des-charges-pharmacie.md, Partie A
// du plan "Concevoir l'activité Pharmacie". Exécution ponctuelle :
//   npx tsx scripts/seed-pharmacie-activity-config.ts
//
// Non destructif : si une config existe déjà pour "pharmacie", ce script ne
// touche jamais terminology/hidden_nav_hrefs (déjà personnalisés) et ne
// complète default_categories/custom_fields que s'ils sont encore vides —
// même logique que registerFeatureFlag dans lib/feature-flags.ts : ne
// jamais écraser un réglage que l'admin aurait déjà personnalisé.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const ACTIVITY_KEY = "pharmacie";

const DEFAULT_CATEGORIES = ["Médicaments", "Parapharmacie", "Hygiène"];

const CUSTOM_FIELDS = [
  { key: "substance_active", label: "Substance active", type: "text" },
  { key: "regime_de_prix", label: "Régime de prix", type: "text" },
  { key: "dosage", label: "Dosage", type: "text" },
];

async function main() {
  const { data: existing, error: fetchError } = await supabase
    .from("activity_configs")
    .select("id, defaultCategories:default_categories, customFields:custom_fields")
    .eq("activity_key", ACTIVITY_KEY)
    .maybeSingle();
  if (fetchError) throw new Error(`Lecture échouée : ${fetchError.message}`);

  if (!existing) {
    const { error } = await supabase.from("activity_configs").insert({
      activity_key: ACTIVITY_KEY,
      terminology: JSON.stringify({}),
      hidden_nav_hrefs: JSON.stringify([]),
      default_categories: JSON.stringify(DEFAULT_CATEGORIES),
      custom_fields: JSON.stringify(CUSTOM_FIELDS),
    });
    if (error) throw new Error(`Écriture échouée : ${error.message}`);
    console.log(`Config créée pour "${ACTIVITY_KEY}".`);
  } else {
    const existingCategories: string[] = JSON.parse(existing.defaultCategories || "[]");
    const existingFields: unknown[] = JSON.parse(existing.customFields || "[]");
    const patch: Record<string, string> = {};
    if (existingCategories.length === 0) patch.default_categories = JSON.stringify(DEFAULT_CATEGORIES);
    if (existingFields.length === 0) patch.custom_fields = JSON.stringify(CUSTOM_FIELDS);

    if (Object.keys(patch).length === 0) {
      console.log(`Config "${ACTIVITY_KEY}" déjà complète (catégories et champs déjà personnalisés) — rien à faire.`);
      return;
    }

    const { error } = await supabase.from("activity_configs").update(patch).eq("id", existing.id);
    if (error) throw new Error(`Écriture échouée : ${error.message}`);
    console.log(`Config "${ACTIVITY_KEY}" complétée (terminology/hidden_nav_hrefs laissés tels quels) :`);
  }
  console.log(`  Catégories : ${DEFAULT_CATEGORIES.join(", ")}`);
  console.log(`  Champs produit : ${CUSTOM_FIELDS.map((f) => f.label).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
