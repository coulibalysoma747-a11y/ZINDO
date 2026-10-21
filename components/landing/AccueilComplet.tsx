import Link from "next/link";
import type { PlanOffer } from "@/lib/plan-catalog";
import {
  NotebookPen,
  Receipt,
  HandCoins,
  UserX,
  BarChart3,
  Warehouse,
  WifiOff,
  Settings2,
  PackagePlus,
  GraduationCap,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

// Sections supplémentaires de la page d'accueil (flag accueil_complet) :
// même déroulé qu'une page de logiciel de gestion classique — les pertes
// du commerçant, les métiers couverts, l'accompagnement, les tarifs —
// avec uniquement des affirmations vérifiables sur ZINDO.

const TONES = [
  { bg: "bg-zindo-blue-50", text: "text-zindo-blue-600" },
  { bg: "bg-zindo-copper-100", text: "text-zindo-copper-600" },
  { bg: "bg-zindo-copper-50", text: "text-zindo-copper-600" },
];

const SectionTitle = ({ kicker, title, accent, text }: { kicker: string; title: string; accent: string; text?: string }) => (
  <div className="mx-auto max-w-2xl text-center">
    <p className="text-xs font-bold uppercase tracking-wider text-zindo-blue-600">{kicker}</p>
    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
      {title} <span className="text-zindo-blue-600">{accent}</span>
    </h2>
    {text && <p className="mt-2 text-zinc-500">{text}</p>}
  </div>
);

const LOSSES = [
  { icon: NotebookPen, title: "Un cahier qui ne dit pas tout", text: "Vous ne savez pas au juste ce qui reste en rayon, ni ce qui va manquer demain." },
  { icon: Receipt, title: "Des ventes qui passent à la trappe", text: "Une vente oubliée, une erreur de monnaie : en fin de mois, la caisse ne tombe pas juste." },
  { icon: HandCoins, title: "Des crédits qu'on oublie", text: "Qui vous doit combien, depuis quand ? Sans suivi, l'argent prêté ne revient pas toujours." },
  { icon: UserX, title: "Des employés sans contrôle", text: "Tout le monde a accès à tout, et personne ne sait qui a fait quoi." },
  { icon: BarChart3, title: "Aucun chiffre fiable", text: "Vous travaillez beaucoup, mais vous ignorez votre vrai bénéfice." },
  { icon: Warehouse, title: "Plusieurs boutiques, zéro vue d'ensemble", text: "Chaque boutique ou dépôt a son propre cahier, impossible de tout suivre." },
  { icon: WifiOff, title: "Internet qui coupe", text: "La connexion tombe et la vente s'arrête : c'est un client perdu." },
];

export function PertesSection() {
  return (
    <section className="mt-24">
      <SectionTitle
        kicker="Le quotidien d'un commerçant"
        title="Vous perdez peut-être de l'argent"
        accent="sans vous en rendre compte"
        text="Ces situations coûtent cher chaque mois. ZINDO a été conçu pour les régler une par une."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LOSSES.map((item, i) => {
          const tone = TONES[i % TONES.length];
          return (
            <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}>
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold text-zinc-300">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-3 font-bold text-zindo-ink-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const TRADES = [
  { emoji: "🏪", label: "Boutique générale", text: "Caisse rapide, stock et crédits clients." },
  { emoji: "🔩", label: "Quincaillerie", text: "Vente au détail et en gros, unités et conditionnements." },
  { emoji: "⚙️", label: "Pièces détachées", text: "Références, marques et compatibilités." },
  { emoji: "🏍️", label: "Boutique de motos", text: "Suivi par châssis, moteur, couleur, CMC et vente à crédit." },
  { emoji: "🍽️", label: "Restaurant / maquis", text: "Tables, commandes en salle et addition." },
  { emoji: "💊", label: "Pharmacie", text: "Lots, dates de péremption et ordonnances." },
  { emoji: "🔧", label: "Atelier de réparation", text: "Fiches de réparation, pièces utilisées et garanties." },
  { emoji: "📦", label: "Grossiste / dépôt", text: "Plusieurs dépôts, transferts et bons de commande." },
];

export function MetiersSection() {
  return (
    <section className="mt-24">
      <SectionTitle
        kicker="Adapté à votre métier"
        title="Un seul logiciel,"
        accent="des écrans faits pour votre activité"
        text="À l'inscription, vous choisissez votre activité : ZINDO affiche les bons champs et les bons modules."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRADES.map((t) => (
          <div key={t.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <span className="text-2xl" aria-hidden>{t.emoji}</span>
            <h3 className="mt-2 font-bold text-zindo-ink-900">{t.label}</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{t.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Et aussi : alimentation, bar, cosmétique, vêtements, électronique, cabinet médical, couture, menuiserie…
      </p>
    </section>
  );
}

const SUPPORT_STEPS = [
  { icon: Settings2, title: "Configuration", text: "On vous aide à régler votre commerce, votre ticket et vos moyens de paiement." },
  { icon: PackagePlus, title: "Vos produits", text: "On vous aide à enregistrer vos produits et votre stock de départ." },
  { icon: GraduationCap, title: "Prise en main", text: "On vous montre, à vous et à vos employés, comment vendre et suivre le stock." },
  { icon: MessageCircle, title: "Suivi sur WhatsApp", text: "Une question plus tard ? On vous répond directement sur WhatsApp." },
];

export function AccompagnementSection({ whatsappHref }: { whatsappHref: string }) {
  return (
    <section className="mt-24 rounded-3xl bg-zindo-blue-50 px-6 py-12 sm:px-12">
      <SectionTitle
        kicker="Accompagnement"
        title="Vous n'êtes pas seul"
        accent="pour démarrer"
        text="L'équipe ZINDO, basée au Burkina Faso, vous accompagne jusqu'à votre première vente."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORT_STEPS.map((s) => (
          <div key={s.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zindo-blue-100 text-zindo-blue-700">
              <s.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-bold text-zindo-ink-900">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl bg-zindo-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-zindo-blue-700"
        >
          <MessageCircle className="h-4 w-4" /> Nous écrire sur WhatsApp
        </a>
      </div>
    </section>
  );
}

export function TarifsSection({ trialDays, plans }: { trialDays: number; plans: PlanOffer[] }) {
  const plan = plans.find((offer) => offer.key === "pro");
  if (!plan) return null;
  const annualSaving = Math.max(0, plan.monthlyPrice * 12 - plan.annualPrice);
  return (
    <section id="tarifs" className="mt-24">
      <SectionTitle
        kicker="Tarifs"
        title="Un prix simple,"
        accent="tout compris"
        text={`Essayez tout pendant ${trialDays} jours. Vous ne payez que si vous continuez.`}
      />
      <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {[
          { key: "monthly", name: "Mensuel", price: plan.monthlyPrice, period: "FCFA / mois", note: "Sans engagement, arrêtez quand vous voulez." },
          { key: "annual", name: "Annuel", price: plan.annualPrice, period: "FCFA / an", note: `Soit 2 mois offerts (${annualSaving.toLocaleString("fr-FR")} FCFA d'économie).` },
        ].map((offer) => (
          <div key={offer.key} className={`relative rounded-3xl border bg-white p-6 shadow-sm ${offer.key === "annual" ? "border-zindo-copper-500 shadow-lg" : "border-zinc-200"}`}>
            {offer.key === "annual" && <span className="rounded-full bg-zindo-copper-100 px-2.5 py-1 text-[11px] font-bold text-zindo-ink-900">Le plus avantageux</span>}
            <p className="mt-3 font-bold text-zindo-ink-900">{offer.name}</p>
            <p className="mt-2 text-3xl font-extrabold text-zindo-ink-900">{offer.price.toLocaleString("fr-FR")}</p>
            <p className="text-sm text-zinc-500">{offer.period}</p>
            <p className="mt-4 text-sm text-zinc-600">{offer.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/inscription"
          className="inline-flex items-center gap-2 rounded-2xl bg-zindo-blue-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-blue-500/30 hover:bg-zindo-blue-600"
        >
          Essayer ZINDO gratuitement <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

// Questions ajoutées à la FAQ existante quand le flag est actif.
export const EXTRA_FAQS = [
  {
    question: "Puis-je essayer ZINDO avant de payer ?",
    answer:
      "Oui. Vous avez {trialDays} jours d'essai gratuit avec toutes les fonctionnalités, sans carte bancaire. L'abonnement complet coûte 7 500 FCFA par mois ou 75 000 FCFA par an ; vous choisissez ensuite si vous continuez.",
  },
  {
    question: "Comment payer mon abonnement ?",
    answer: "Par Orange Money, Moov Money ou Wave, directement depuis l'application, rubrique Abonnement.",
  },
  {
    question: "Mes employés peuvent-ils avoir leur propre accès ?",
    answer:
      "Oui. Chaque employé a son compte, et vous choisissez module par module ce qu'il peut voir et faire. L'historique garde la trace de qui a fait quoi.",
  },
  {
    question: "Puis-je imprimer des tickets et des factures ?",
    answer:
      "Oui : tickets de caisse (58 mm ou 80 mm), factures A4 et devis. Vous pouvez aussi les enregistrer en PDF ou les partager par WhatsApp.",
  },
  {
    question: "Que se passe-t-il si je change de téléphone ou d'ordinateur ?",
    answer:
      "Vos données sont enregistrées en ligne. Il suffit de vous reconnecter sur le nouvel appareil pour tout retrouver.",
  },
];
