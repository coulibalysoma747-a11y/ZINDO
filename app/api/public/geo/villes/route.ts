import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { isCountryCode, normalizeSearch } from "@/lib/countries";

/**
 * Villes d'un pays (table geo_cities, source GeoNames) pour le choix de la ville :
 * sans recherche, les plus peuplées ; avec recherche, celles dont le nom commence
 * par le texte tapé (sans accents ni majuscules), les plus peuplées d'abord.
 */
export async function GET(request: NextRequest) {
  const country = (request.nextUrl.searchParams.get("pays") ?? "").toUpperCase();
  const q = normalizeSearch(request.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  if (!isCountryCode(country)) return NextResponse.json({ cities: [] });

  let query = supabase.from("geo_cities").select("name").eq("country_code", country);
  // Caractères spéciaux du motif « like » échappés : la recherche porte sur le texte tel quel.
  if (q) query = query.like("search", `${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  const { data, error } = await query.order("population", { ascending: false }).limit(q ? 15 : 30);
  if (error) {
    console.error("[geo/villes]", error.message);
    return NextResponse.json({ cities: [] }, { status: 500 });
  }
  // Même nom plusieurs fois (quartiers homonymes) : une seule fois dans la liste.
  const cities = [...new Set((data ?? []).map((c) => c.name as string))];
  return NextResponse.json({ cities }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
