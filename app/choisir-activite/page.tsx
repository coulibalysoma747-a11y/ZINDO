import { redirect } from "next/navigation";
import { requireUserAllowingActivitySetup, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { MARKET_ONLY_ACTIVITY_KEY, MARKET_ONLY_FLAG } from "@/lib/market";
import { ActivityPicker } from "./ActivityPicker";

export default async function ChooseActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string }>;
}) {
  const { change } = await searchParams;

  let mode: "onboarding" | "change" = "onboarding";
  let currentActivityKey: string | null = null;
  let businessId: string;

  if (change === "1") {
    const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
    if (!user.business.activityKey) redirect("/choisir-activite");
    mode = "change";
    currentActivityKey = user.business.activityKey;
    businessId = user.businessId;
  } else {
    const user = await requireUserAllowingActivitySetup();
    if (user.business.activityKey) redirect("/dashboard");
    businessId = user.businessId;
  }

  // « Vendeur du Marché » : caché tant que le flag n'est pas actif pour ce commerce.
  await registerFeatureFlag(
    MARKET_ONLY_FLAG,
    "Vendeur du Marché (gratuit)",
    "Activité « Vendeur du Marché » : vend seulement sur le Marché, sans caisse ni stock, sans abonnement."
  );
  const hiddenKeys =
    currentActivityKey === MARKET_ONLY_ACTIVITY_KEY || (await isFeatureEnabled(MARKET_ONLY_FLAG, businessId))
      ? []
      : [MARKET_ONLY_ACTIVITY_KEY];

  return (
    <div className="theme-locked relative min-h-screen overflow-x-hidden bg-zindo-cream">
      <div aria-hidden className="zindo-flag-stripe absolute inset-x-0 top-0 h-1" />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zindo-green-100/70 blur-3xl" />
        <div className="absolute top-1/3 -left-10 h-56 w-56 rounded-full bg-zindo-gold-100/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-zindo-red-100/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-5 py-10 sm:px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <ZindoLogo size={56} />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
            Quelle est votre activité ?
          </h1>
          <p className="mt-1.5 max-w-md text-[15px] text-zinc-500">
            Choisissez votre métier pour que ZINDO adapte votre espace de travail.
          </p>
        </div>

        <ActivityPicker mode={mode} currentActivityKey={currentActivityKey} hiddenKeys={hiddenKeys} />
      </div>
    </div>
  );
}
