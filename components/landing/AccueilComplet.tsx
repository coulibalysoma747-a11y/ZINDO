import Link from "next/link";
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
  Gift,
  Calendar,
  CreditCard,
  Check,
  ArrowRight,
} from "lucide-react";

// Sections supplémentaires de la page d'accueil (flag accueil_complet) :
// même déroulé qu'une page de logiciel de gestion classique — les pertes
// du commerçant, les métiers couverts, l'accompagnement, les tarifs —
// avec uniquement des affirmations vérifiables sur ZINDO.

const TONES = [
  { bg: "bg-zindo-green-50", text: "text-zindo-green-600" },
  { bg: "bg-zindo-gold-100", text: "text-zindo-gold-600" },
  { bg: "bg-zindo-red-50", text: "text-zindo-red-600" },
];

const SectionTitle = ({ kicker, title, accent, text }: { kicker: string; title: string; accent: string; text?: string }) => (
  <div className="mx-auto max-w-2xl text-center">
    <p className="text-xs font-bold uppercase tracking-wider text-zindo-green-600">{kicker}</p>
    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
      {title} <span className="text-zindo-green-600">{accent}</span>
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
    <section className="mt-24 rounded-3xl bg-zindo-green-50 px-6 py-12 sm:px-12">
      <SectionTitle
        kicker="Accompagnement"
        title="Vous n'êtes pas seul"
        accent="pour démarrer"
        text="L'équipe ZINDO, basée au Burkina Faso, vous accompagne jusqu'à votre première vente."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORT_STEPS.map((s) => (
          <div key={s.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zindo-green-100 text-zindo-green-700">
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
          className="inline-flex items-center gap-2 rounded-2xl bg-zindo-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-zindo-green-700"
        >
          <MessageCircle className="h-4 w-4" /> Nous écrire sur WhatsApp
        </a>
      </div>
    </section>
  );
}

export function TarifsSection({ trialDays }: { trialDays: number }) {
  const plans = [
    {
      icon: Gift,
      badge: "GRATUIT",
      title: "Essai gratuit",
      price: `${trialDays} jours`,
      suffix: "sans engagement",
      features: ["Accès à tout", "Aucune carte demandée", "Accompagnement inclus"],
      highlighted: false,
    },
    {
      icon: Calendar,
      badge: "RECOMMANDÉ",
      title: "Annuel",
      price: "75 000",
      suffix: "FCFA / an",
      features: ["Tout le plan mensuel", "15 000 FCFA d'économie", "Un seul paiement"],
      highlighted: true,
    },
    {
      icon: CreditCard,
      badge: "SOUPLE",
      title: "Mensuel",
      price: "7 500",
      suffix: "FCFA / mois",
      features: ["Toutes les fonctionnalités", "Plusieurs boutiques et utilisateurs", "Mises à jour incluses"],
      highlighted: false,
    },
  ];

  return (
    <section id="tarifs" className="mt-24">
      <SectionTitle
        kicker="Tarifs"
        title="Des prix simples,"
        accent="pensés pour les commerces d'ici"
        text="Commencez gratuitement. Payez ensuite par Orange Money, Moov Money ou Wave."
      />
      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.title}
            className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm ${
              p.highlighted ? "border-zindo-gold-500 shadow-lg" : "border-zinc-200"
            }`}
          >
            <span
              className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                p.highlighted ? "bg-zindo-gold-100 text-zindo-ink-900" : "bg-zindo-green-50 text-zindo-green-700"
              }`}
            >
              {p.badge}
            </span>
            <p className="mt-3 flex items-center gap-2 font-bold text-zindo-ink-900">
              <p.icon className="h-4 w-4 text-zindo-green-600" /> {p.title}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-zindo-ink-900">{p.price}</p>
            <p className="text-sm text-zinc-500">{p.suffix}</p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-600" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/inscription"
          className="inline-flex items-center gap-2 rounded-2xl bg-zindo-green-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-green-500/30 hover:bg-zindo-green-600"
        >
          Commencer mes {trialDays} jours gratuits <ArrowRight className="h-4 w-4" />
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
      "Oui. Vous avez {trialDays} jours d'essai gratuit avec accès à tout, sans carte bancaire. Vous ne payez que si vous décidez de continuer.",
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
