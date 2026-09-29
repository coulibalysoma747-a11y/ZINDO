// Situation d'abonnement lisible d'un commerce, pour la console d'administration
// (mêmes règles que getSubscriptionState dans lib/subscription.ts).

const DAY = 24 * 60 * 60 * 1000;

export type SubscriptionRow = {
  businessId: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "PAST_DUE" | "CANCELLED";
  billingCycle: "MONTHLY" | "ANNUAL" | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

export type Etat = "essai" | "payant" | "expire" | "suspendu" | "aucun";

export /** Situation d'abonnement lisible d'un commerce (même règles que lib/subscription.ts). */
function situation(b: { suspended: boolean }, sub: SubscriptionRow | undefined, now: number) {
  if (b.suspended) return { etat: "suspendu" as Etat, label: "Suspendu", tone: "bg-zinc-200 text-zinc-700", fin: null as string | null, joursRestants: null as number | null };
  if (!sub) return { etat: "aucun" as Etat, label: "Sans abonnement", tone: "bg-zinc-100 text-zinc-600", fin: null, joursRestants: null };
  if (sub.status === "TRIAL") {
    const end = sub.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : 0;
    if (end && end <= now) return { etat: "expire" as Etat, label: "Essai expiré", tone: "bg-red-50 text-red-700", fin: sub.trialEndsAt, joursRestants: 0 };
    const jours = end ? Math.ceil((end - now) / DAY) : null;
    return { etat: "essai" as Etat, label: jours !== null ? `Essai · ${jours} j` : "Essai", tone: jours !== null && jours <= 3 ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800", fin: sub.trialEndsAt, joursRestants: jours };
  }
  if (sub.status === "ACTIVE") {
    const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : 0;
    if (end && end <= now) return { etat: "expire" as Etat, label: "Paiement en retard", tone: "bg-red-50 text-red-700", fin: sub.currentPeriodEnd, joursRestants: 0 };
    return { etat: "payant" as Etat, label: sub.billingCycle === "ANNUAL" ? "Annuel" : "Mensuel", tone: "bg-zindo-green-50 text-zindo-green-800", fin: sub.currentPeriodEnd, joursRestants: null };
  }
  return { etat: "expire" as Etat, label: sub.status === "CANCELLED" ? "Résilié" : "Expiré", tone: "bg-red-50 text-red-700", fin: sub.currentPeriodEnd ?? sub.trialEndsAt, joursRestants: 0 };
}

/** Heure du calcul, hors du rendu (règle de pureté de React). */
export function maintenant() {
  return Date.now();
}
