import "server-only";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

/**
 * Session des acheteurs du Marché (compte léger, table market_buyers).
 * Cookie et audience distincts de la session commerçant (lib/session.ts) :
 * un jeton acheteur ne peut jamais ouvrir la gestion commerciale.
 */

const BUYER_COOKIE = "zindo_acheteur";
const BUYER_AUDIENCE = "marche-acheteur";
const DURATION_SECONDS = 60 * 60 * 24 * 90; // 90 jours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant dans l'environnement");
  return new TextEncoder().encode(secret);
}

export async function createBuyerSession(buyerId: string) {
  const token = await new SignJWT({ buyerId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(BUYER_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${DURATION_SECONDS}s`)
    .sign(getSecret());
  const cookieStore = await cookies();
  cookieStore.set(BUYER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATION_SECONDS,
  });
}

export async function destroyBuyerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(BUYER_COOKIE);
}

export type MarketBuyer = {
  id: string;
  name: string;
  phone: string;
  kind: "PARTICULIER" | "PRO";
  companyName: string | null;
  city: string | null;
  countryCode: string;
  address: string | null;
};

async function getCurrentBuyerUncached(): Promise<MarketBuyer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(BUYER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: BUYER_AUDIENCE });
    if (typeof payload.buyerId !== "string") return null;
    const { data } = await supabase
      .from("market_buyers")
      .select("id, name, phone, kind, companyName:company_name, city, countryCode:country_code, address, blocked")
      .eq("id", payload.buyerId)
      .maybeSingle();
    if (!data || data.blocked) return null;
    const { blocked: _blocked, ...buyer } = data as MarketBuyer & { blocked: boolean };
    void _blocked;
    return buyer;
  } catch {
    return null;
  }
}

/** Acheteur connecté, mémorisé le temps d'une requête. */
export const getCurrentBuyer = cache(getCurrentBuyerUncached);

/** Favoris de l'acheteur connecté (produits et boutiques suivies) ; vides sans compte. */
export async function getBuyerFavorites(): Promise<{ listingIds: Set<string>; shopIds: Set<string> }> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { listingIds: new Set(), shopIds: new Set() };
  const { data } = await supabase.from("market_favorites").select("listingId:listing_id, shopId:shop_id").eq("buyer_id", buyer.id);
  const rows = (data ?? []) as { listingId: string | null; shopId: string | null }[];
  return {
    listingIds: new Set(rows.flatMap((r) => (r.listingId ? [r.listingId] : []))),
    shopIds: new Set(rows.flatMap((r) => (r.shopId ? [r.shopId] : []))),
  };
}
