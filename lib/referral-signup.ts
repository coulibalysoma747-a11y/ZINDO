import "server-only";
import { cookies } from "next/headers";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { attachReferral, ensureReferralFlagRegistered, normalizeReferralCode, REFERRAL_COOKIE } from "@/lib/referral";

async function readReferralCookie(): Promise<{ code: string; source: string } | null> {
  const raw = (await cookies()).get(REFERRAL_COOKIE)?.value;
  if (!raw) return null;
  const [code, source] = raw.split(":");
  const normalized = normalizeReferralCode(code);
  return normalized ? { code: normalized, source: source || "lien" } : null;
}

/**
 * Page d'inscription : code prérempli (lien /r/CODE ou cookie), et champ
 * affiché seulement si le visiteur arrive par un lien ou si le parrainage a
 * été activé globalement (sinon rien ne change pour les autres inscriptions).
 */
export async function getReferralContext(refParam: string | undefined) {
  const cookie = await readReferralCookie();
  const code = normalizeReferralCode(refParam) ?? cookie?.code ?? null;
  if (code) return { code, showField: true };
  await ensureReferralFlagRegistered();
  return { code: null, showField: await isFeatureEnabledGlobally("parrainage") };
}

/** Après création du compte : rattache le filleul (code saisi, sinon cookie), puis oublie le cookie. */
export async function attachReferralFromSignup(params: { businessId: string; phone: string; typedCode?: FormDataEntryValue | null }) {
  const cookie = await readReferralCookie();
  const typed = normalizeReferralCode(typeof params.typedCode === "string" ? params.typedCode : null);
  const code = typed ?? cookie?.code ?? null;
  if (!code) return;
  const source = cookie && cookie.code === code ? cookie.source : "manuel";
  await attachReferral({ referredBusinessId: params.businessId, referredPhone: params.phone, code, source });
  try {
    (await cookies()).delete(REFERRAL_COOKIE);
  } catch {
    // Lecture seule dans certains contextes : le cookie expirera de lui-même.
  }
}
