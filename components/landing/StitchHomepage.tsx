import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BadgeCheck, Boxes, Check, CheckCircle2, ChevronDown, CircleX,
  CloudOff, CreditCard, Contact, MonitorSmartphone, Headset, Lock, MessageCircle, PhoneCall,
  PlayCircle, Pill, ReceiptText, ScanBarcode, ShoppingBasket, Store, TrendingUp,
  User, Users, Wallet, Warehouse, Wifi, Wrench, Bike, PackageSearch, ChartNoAxesCombined,
} from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { PosSimulator } from "@/components/landing/PosSimulator";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import type { PlanOffer } from "@/lib/plan-catalog";

type Faq = { question: string; answer: string };

const NBSP = String.fromCharCode(160);

const WHATSAPP = "https://wa.me/22604059929";
const WHATSAPP_LABEL = "+226 04 05 99 29";

const pains = [
  { icon: PackageSearch, title: "Ruptures de stock imprévues", text: "Repérez les produits à réapprovisionner avant de perdre une vente. Un seuil d'alerte réglable pour chaque référence.", foot: "Seuil d'alerte automatique", footIcon: TrendingUp },
  { icon: ReceiptText, title: "Ventes oubliées ou mal notées", text: "Chaque vente est enregistrée instantanément et le stock est mis à jour sur-le-champ, sans erreur de recopie.", foot: "Traçabilité complète", footIcon: CheckCircle2 },
  { icon: Wallet, title: "Crédits clients difficiles à suivre", text: "Fini le carnet de crédit perdu ou raturé. Retrouvez en un clic le solde dû, les versements et l'historique de chaque client.", foot: "Fiches clients et crédits", footIcon: Contact },
  { icon: Users, title: "Difficile de suivre les employés", text: "Attribuez des rôles distincts (caissier, vendeur, gestionnaire), limitez les remises et gardez l'historique de chaque geste.", foot: "Rôles et permissions", footIcon: Lock },
  { icon: ChartNoAxesCombined, title: "Bénéfice net peu clair", text: "Consultez vos ventes du jour, vos dépenses et vos marges réelles, calculées automatiquement sans attendre la fin du mois.", foot: "Rapports instantanés", footIcon: TrendingUp },
  { icon: CloudOff, title: "Internet qui coupe", text: "Continuez à encaisser sans interruption. Les ventes faites hors ligne se synchronisent d'elles-mêmes au retour du réseau.", foot: "Caisse hors ligne", footIcon: Wifi, accent: true },
];

const trades = [
  { icon: Store, tone: "bg-zindo-blue-50 text-zindo-blue-700", title: "Boutiques & quincailleries", text: "Vente au détail, en gros et par conditionnement (sac, mètre, carton ou unité) avec conversion automatique du stock.", tags: ["Conditionnements", "Vente en vrac"] },
  { icon: Warehouse, tone: "bg-zindo-ink-50 text-zindo-ink-700", title: "Grossistes & dépôts", text: "Plusieurs magasins gérés ensemble, transferts de stock entre dépôts et inventaires sans arrêter l'activité.", tags: ["Multi-boutiques", "Transferts"] },
  { icon: Bike, tone: "bg-zindo-copper-50 text-zindo-copper-700", title: "Motos & pièces détachées", text: "Recherche par référence, numéros de châssis et de moteur, suivi des garanties et vente à crédit avec échéancier.", tags: ["Numéros de série", "Garanties"] },
  { icon: Pill, tone: "bg-emerald-50 text-emerald-800", title: "Pharmacies & santé", text: "Suivi par numéro de lot, dates de péremption prioritaires et alerte avant la perte de marchandise.", tags: ["Lots", "Péremptions"] },
  { icon: ShoppingBasket, tone: "bg-zindo-blue-50 text-zindo-blue-800", title: "Alimentation & supérettes", text: "Encaissement rapide au lecteur de codes-barres, gestion par rayons et suivi des articles à forte rotation.", tags: ["Codes-barres", "Caisse express"] },
  { icon: Wrench, tone: "bg-zinc-100 text-zindo-ink-800", title: "Ateliers & services", text: "Articles utilisés, réparations et règlements partiels, avec devis et factures pour vos clients.", tags: ["Devis", "Règlements"] },
];

type Cell = "no" | "yes" | string;
const comparison: { label: string; book: Cell; excel: Cell }[] = [
  { label: "Stock à jour automatiquement après chaque vente", book: "no", excel: "Calculs manuels" },
  { label: "Retrouver et recouvrer les crédits clients", book: "no", excel: "Complexe et lent" },
  { label: "Calcul automatique du bénéfice et des marges", book: "no", excel: "Formules fragiles" },
  { label: "Continuer d'encaisser hors ligne (sans Internet)", book: "yes", excel: "Sur un seul PC" },
  { label: "Plusieurs vendeurs avec des permissions sécurisées", book: "no", excel: "no" },
  { label: "Tickets de caisse et factures (IFU / RCCM)", book: "no", excel: "Mise en page manuelle" },
  { label: "Sauvegarde automatique en cas de vol ou de panne", book: "no", excel: "À faire soi-même" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zindo-blue-700">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-zindo-copper-500" />
      {children}
    </span>
  );
}

function Heading({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={`mb-10 max-w-2xl sm:mb-12 ${center ? "mx-auto text-center" : ""}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-[1.65rem] font-medium leading-tight tracking-[-0.03em] text-zindo-ink-900 sm:text-[2rem]">{title}</h2>
      {text && <p className="mt-3 text-[15px] leading-7 text-zinc-600">{text}</p>}
    </div>
  );
}

function CompareCell({ value }: { value: Cell }) {
  if (value === "no") return <CircleX aria-label="Non" className="mx-auto h-5 w-5 text-zindo-red-500" />;
  if (value === "yes") return <CheckCircle2 aria-label="Oui" className="mx-auto h-5 w-5 text-zindo-success-600" />;
  return <span className="text-[10px] font-medium leading-tight text-zinc-500 sm:text-xs">{value}</span>;
}

const card = "rounded-2xl border border-zinc-200/80 bg-white shadow-zindo-card";

export function StitchHomepage({ trialDays, plans, faqs }: { trialDays: number; plans: PlanOffer[]; faqs: Faq[] }) {
  const plan = plans.find((item) => item.key === "pro");
  const monthly = plan?.monthlyPrice ?? 7500;
  const annual = plan?.annualPrice ?? 75000;
  const saving = Math.max(0, monthly * 12 - annual);
  const monthsOffered = monthly > 0 ? Math.floor(saving / monthly) : 0;
  const perMonth = Math.round(annual / 12);
  const money = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

  const monthlyPerks = [
    "Caisse rapide sur PC, tablette et mobile",
    "Suivi du stock et alertes de rupture",
    "Crédits clients et fournisseurs",
    "Caisse hors ligne incluse",
    "Assistance par WhatsApp",
  ];
  const annualPerks = [
    "Toutes les fonctions de la formule mensuelle",
    "Un seul paiement pour toute l'année",
    `Soit ${money(perMonth)} FCFA par mois seulement`,
    "Sauvegardes et rapports avancés",
  ];

  return (
    <div className="theme-locked min-h-screen overflow-x-hidden bg-zindo-cream pb-20 text-zindo-ink-900 antialiased sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <div aria-hidden className="zindo-brand-stripe h-0.5 w-full" />
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6">
          <Link href="/" aria-label="ZINDO, accueil" className="flex min-w-0 items-center gap-2.5">
            <ZindoLogo size={34} className="!rounded-xl !shadow-none" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="text-[17px] font-extrabold tracking-[0.12em]">ZINDO</span>
              <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-zindo-blue-600">Gestion commerciale</span>
            </span>
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 lg:flex">
            {[["#fonctionnement", "Fonctionnalités"], ["#metiers", "Métiers"], ["#tarifs", "Tarifs"], ["#comparatif", "Comparatif"], ["#faq", "FAQ"]].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-zindo-ink-700 transition-colors hover:bg-zindo-blue-50 hover:text-zindo-ink-900">{label}</Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 text-[12px] font-semibold text-zinc-500 transition-colors hover:text-zindo-ink-900 xl:flex">
              {WHATSAPP_LABEL}
            </a>
            <Link href="/login" className="hidden px-2 py-1 text-[13px] font-semibold text-zindo-ink-700 hover:text-zindo-blue-700 sm:inline-flex">Connexion</Link>
            <Link href="/inscription" className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-zindo-blue-700 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-zindo-blue-800 sm:px-4">
              <span className="sm:hidden">Démarrer</span>
              <span className="hidden sm:inline">Essai gratuit · {trialDays} j</span>
            </Link>
            <Link href="/login" aria-label="Se connecter" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zindo-ink-900 text-white sm:hidden">
              <User className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-zindo-blue-100/50 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
              <div className="flex flex-col items-start lg:col-span-6">
                <p className="inline-flex items-center gap-2 rounded-full border border-zindo-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-zindo-blue-800 shadow-sm">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-zindo-copper-500" />
                  Conçu au Burkina Faso · Caisse hors ligne
                </p>
                <h1 className="mt-5 text-[2.15rem] font-medium leading-[1.08] tracking-[-0.035em] sm:text-[3.15rem] sm:leading-[1.05]">
                  Prenez le contrôle de votre commerce.
                  <span className="relative mt-1 block text-zindo-blue-800">
                    Chaque franc tracé.
                    <span aria-hidden className="absolute -bottom-1.5 left-0 h-1 w-16 rounded-full bg-zindo-copper-500" />
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-[15px] leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                  ZINDO remplace le cahier et Excel : encaissement rapide, stock en temps réel, crédits clients et marges — même en cas de coupure d&apos;Internet ou de délestage.
                </p>
                <div className="mt-8 flex w-full flex-wrap items-center gap-3 sm:w-auto">
                  <Link href="/inscription" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zindo-blue-700 px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-zindo-blue-800 sm:w-auto">
                    <span>Essayer gratuitement · {trialDays} jours</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link href="#pos-simulator" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-[13px] font-semibold text-zindo-ink-800 transition-colors hover:border-zindo-blue-200 hover:bg-zindo-blue-50 sm:w-auto">
                    <PlayCircle className="h-5 w-5 text-zindo-blue-700" />
                    <span>Voir la démo interactive</span>
                  </Link>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-2 text-[13px] font-medium text-zinc-600 sm:grid-cols-3">
                  <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-zindo-success-600" />{trialDays} jours offerts</span>
                  <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-zindo-success-600" />Sans carte bancaire</span>
                  <span className="flex items-center gap-1.5"><MonitorSmartphone className="h-4 w-4 text-zindo-success-600" />PC, tablette, mobile</span>
                </div>
                <div className="mt-7 w-full">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zindo-ink-500">Encaissement</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {[["bg-[#f97316]", "Orange Money"], ["bg-[#00c3f8]", "Wave"], ["bg-[#004b9b]", "Moov Money"], ["bg-zindo-ink-500", "Espèces (FCFA)"]].map(([dot, label]) => (
                      <span key={label} className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zindo-ink-800">
                        <i className={`h-2 w-2 rounded-full ${dot}`} />{label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div id="pos-simulator" className="scroll-mt-24 lg:col-span-6 lg:pb-10"><PosSimulator /></div>
            </div>
          </div>
        </section>

        <section id="fonctionnement" className="scroll-mt-20 border-y border-zinc-200/80 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Heading eyebrow="Une gestion plus sereine" title="Les pertes évitables du quotidien" text="Un outil clair pour savoir en permanence ce qui entre, ce qui sort et ce qu'il vous reste réellement en caisse." />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {pains.map(({ icon: Icon, title, text, foot, footIcon: FootIcon, accent }, i) => (
                <article key={title} className={`group flex flex-col justify-between p-6 ${card}`}>
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-semibold tabular-nums text-zindo-blue-300">0{i + 1}</span>
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent ? "bg-emerald-50 text-zindo-success-600" : "bg-zindo-blue-50 text-zindo-blue-700"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
                    <p className="text-sm leading-6 text-zinc-600">{text}</p>
                  </div>
                  <p className={`mt-5 flex items-center gap-1.5 border-t border-zinc-100 pt-4 text-[13px] font-semibold ${accent ? "text-zindo-success-600" : "text-zindo-blue-700"}`}>
                    <span>{foot}</span><FootIcon className="h-4 w-4" />
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="metiers" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Heading center eyebrow="Votre activité" title="Une solution pensée pour votre métier" text="Choisissez votre activité à l'inscription. ZINDO adapte ses modules à la réalité de votre quotidien." />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {trades.map(({ icon: Icon, tone, title, text, tags }) => (
                <article key={title} className={`p-6 ${card}`}>
                  <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-6 w-6" /></span>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mb-4 text-sm leading-6 text-zinc-600">{text}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => <span key={tag} className="rounded-md bg-zindo-blue-50 px-2.5 py-1 text-[11px] font-semibold text-zindo-blue-800">{tag}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="comparatif" className="scroll-mt-20 border-y border-zinc-200/80 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Heading eyebrow="En un regard" title="Cahier vs Excel vs ZINDO Pro" text="Passez d'un suivi artisanal et dispersé à une vision claire de la rentabilité de votre commerce." />
            <div className={`overflow-hidden ${card}`}>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zindo-cream/80">
                      <th scope="col" className="w-[34%] px-2 py-3 text-xs font-semibold text-zindo-ink-800 sm:w-2/5 sm:px-4 sm:py-4 sm:text-sm">Fonctionnalité clé</th>
                      <th scope="col" className="px-1 py-3 text-center text-[11px] font-semibold text-zinc-500 sm:w-1/5 sm:px-4 sm:py-4 sm:text-sm">Cahier <span className="hidden sm:inline">papier</span></th>
                      <th scope="col" className="px-1 py-3 text-center text-[11px] font-semibold text-zinc-500 sm:w-1/5 sm:px-4 sm:py-4 sm:text-sm">Excel</th>
                      <th scope="col" className="bg-zindo-blue-50/80 px-1 py-3 text-center text-[11px] font-semibold text-zindo-blue-800 sm:w-1/5 sm:px-4 sm:py-4 sm:text-sm">
                        <span className="inline-flex items-center gap-1 font-bold">ZINDO Pro <BadgeCheck className="h-4 w-4" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm">
                    {comparison.map(({ label, book, excel }, i) => (
                      <tr key={label} className={`border-b border-zinc-100 last:border-0 ${i % 2 ? "bg-zindo-cream/40" : "bg-white"}`}>
                        <th scope="row" className="px-2 py-3 text-left font-medium text-zindo-ink-800 sm:px-4 sm:py-3.5">{label}</th>
                        <td className="px-1 py-3 text-center sm:px-4 sm:py-3.5"><CompareCell value={book} /></td>
                        <td className="px-1 py-3 text-center sm:px-4 sm:py-3.5"><CompareCell value={excel} /></td>
                        <td className="bg-zindo-blue-50/40 px-1 py-3 text-center sm:px-4 sm:py-3.5"><CheckCircle2 aria-label="Oui" className="mx-auto h-5 w-5 text-zindo-success-600" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="tarifs" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Heading center eyebrow="Sans surprise" title="Choisissez la formule adaptée" text={`${trialDays} jours offerts pour découvrir tous les modules. Sans carte bancaire et sans engagement de reconduction.`} />
            <div className="mx-auto grid max-w-4xl grid-cols-1 items-stretch gap-8 md:grid-cols-2">
              <article className={`flex flex-col justify-between p-6 sm:p-8 ${card}`}>
                <div>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold">Abonnement mensuel</h3>
                    <span className="rounded-full bg-zindo-blue-50 px-2.5 py-1 text-[11px] font-semibold text-zindo-blue-800">Flexibilité</span>
                  </div>
                  <p className="flex items-baseline gap-1"><span className="text-[32px] font-semibold tracking-[-0.03em] tabular-nums">{money(monthly)}</span><span className="text-base font-semibold">FCFA</span><span className="text-xs text-zinc-500">/ mois</span></p>
                  <p className="mt-1 text-xs text-zinc-500">Idéal pour démarrer sans avance de trésorerie.</p>
                  <ul className="mt-6 space-y-3 text-[13px] text-zindo-ink-800">
                    {monthlyPerks.map((perk) => <li key={perk} className="flex items-center gap-2"><Check className="h-[18px] w-[18px] shrink-0 text-zindo-success-600" />{perk}</li>)}
                  </ul>
                </div>
                <Link href="/inscription" className="mt-8 flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-[15px] font-semibold transition-colors hover:bg-zindo-blue-50">Démarrer en mensuel</Link>
              </article>

              <article className="relative flex flex-col justify-between rounded-2xl border border-zindo-blue-200 bg-white p-6 shadow-zindo-raised sm:p-8">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zindo-ink-900 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
                  Meilleur prix{saving > 0 && ` · ${money(saving)} FCFA`}
                </span>
                <div>
                  <div className="mb-4 mt-1 flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold">Abonnement annuel</h3>
                    {monthsOffered > 0 && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">{monthsOffered} mois offerts</span>}
                  </div>
                  <p className="flex items-baseline gap-1 text-zindo-blue-800"><span className="text-[32px] font-semibold tracking-[-0.03em] tabular-nums">{money(annual)}</span><span className="text-base font-semibold">FCFA</span><span className="text-xs text-zinc-500">/ an</span></p>
                  <p className="mt-1 text-xs text-zinc-500">Soit l&apos;équivalent de {money(perMonth)} FCFA par mois.</p>
                  <ul className="mt-6 space-y-3 text-[13px] text-zindo-ink-800">
                    {annualPerks.map((perk, i) => <li key={perk} className="flex items-center gap-2"><Check className="h-[18px] w-[18px] shrink-0 text-zindo-success-600" /><span className={i === 0 ? "font-semibold" : ""}>{perk}</span></li>)}
                  </ul>
                </div>
                <Link href="/inscription" className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-zindo-blue-700 px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-zindo-blue-800">
                  <span>Choisir l&apos;offre annuelle</span><ArrowRight className="h-[18px] w-[18px]" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-y border-zinc-200/80 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Heading center eyebrow="Besoin d'aide ?" title="Questions fréquentes" text="Tout ce qu'il faut savoir pour utiliser ZINDO dans votre point de vente en toute confiance." />
            <div className="space-y-2">
              {faqs.slice(0, 6).map((faq) => (
                <details key={faq.question} className="group rounded-xl border border-zinc-200/80 bg-zindo-cream/40 px-4 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-left text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 text-sm leading-6 text-zinc-600">{faq.answer.replaceAll("{trialDays}", String(trialDays))}</p>
                </details>
              ))}
            </div>

            <div className={`mt-12 flex flex-col items-center justify-between gap-4 p-6 md:flex-row ${card}`}>
              <div className="flex items-center gap-4">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-zindo-copper-200">
                  <Image src="/brand/founder-coulibaly-soma.jpg" alt="Coulibaly Soma, fondateur de ZINDO" fill sizes="56px" className="object-cover" />
                </span>
                <div>
                  <h4 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Headset className="hidden h-5 w-5 text-zindo-blue-700 sm:block" />Accompagnement local</h4>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">L&apos;équipe ZINDO, basée au Burkina Faso, vous accompagne jusqu&apos;à votre première vente.</p>
                </div>
              </div>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1ebe5b]">
                <MessageCircle className="h-5 w-5" />WhatsApp : {WHATSAPP_LABEL}
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-zindo-ink-900 p-6 text-white sm:p-10 md:p-16">
            <div aria-hidden className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-zindo-blue-500/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-20 left-20 h-64 w-64 rounded-full bg-zindo-copper-500/15 blur-3xl" />
            <div className="relative z-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zindo-copper-300">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-zindo-copper-400" />
                Passez au numérique
              </span>
              <h2 className="mb-4 text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[2.75rem]">Prêt à transformer la gestion de votre commerce ?</h2>
              <p className="mb-8 max-w-2xl text-[15px] leading-7 text-white/70">Rejoignez les quincailleries, grossistes et boutiques qui sécurisent leur chiffre d&apos;affaires et réduisent leurs pertes avec ZINDO.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/inscription" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-zindo-ink-900 transition-colors hover:bg-zindo-cream sm:w-auto">
                  <span>Démarrer l&apos;essai de {trialDays} jours</span><ArrowRight className="h-5 w-5" />
                </Link>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-[13px] font-semibold ring-1 ring-white/15 transition-colors hover:bg-white/15 sm:w-auto">
                  <PhoneCall className="h-5 w-5" /><span>Parler à un conseiller</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-zindo-ink-950 text-white/70">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6">
          <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2 lg:pr-8">
              <p className="mb-3 text-lg font-extrabold tracking-[0.12em] text-white">ZINDO</p>
              <p className="mb-5 max-w-sm text-sm leading-6">Logiciel de caisse et de gestion commerciale conçu pour les commerces du Burkina Faso. La caisse continue de fonctionner hors ligne et se synchronise au retour d&apos;Internet.</p>
              <div className="flex items-center gap-4">
                <a href="https://www.facebook.com/profile.php?id=61594056733577&mibextid=ZbWKwL" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-white/50 hover:text-white"><FacebookIcon className="h-5 w-5" /></a>
                <a href="https://www.tiktok.com/@zindo390?_r=1&_t=ZN-99o7lktR2Ws" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-white/50 hover:text-white"><TikTokIcon className="h-5 w-5" /></a>
              </div>
            </div>
            <div>
              <p className="mb-3 text-[13px] font-semibold tracking-wide text-white">Solution</p>
              <ul className="flex flex-col gap-2 text-sm">
                <li><Link href="/fonctionnalites" className="hover:text-white">Caisse (POS)</Link></li>
                <li><Link href="/fonctionnalites" className="hover:text-white">Gestion de stock</Link></li>
                <li><Link href="/fonctionnalites/credits-clients" className="hover:text-white">Crédits clients</Link></li>
                <li><Link href="/fonctionnalites/facturation" className="hover:text-white">Factures et devis</Link></li>
                <li><Link href="/tarifs" className="hover:text-white">Plans et abonnements</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[13px] font-semibold tracking-wide text-white">Secteurs</p>
              <ul className="flex flex-col gap-2 text-sm">
                <li><Link href="#metiers" className="hover:text-white">Boutiques et quincailleries</Link></li>
                <li><Link href="#metiers" className="hover:text-white">Alimentation et supérettes</Link></li>
                <li><Link href="#metiers" className="hover:text-white">Grossistes et dépôts</Link></li>
                <li><Link href="#metiers" className="hover:text-white">Pharmacies et santé</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[13px] font-semibold tracking-wide text-white">Assistance</p>
              <ul className="flex flex-col gap-2 text-sm">
                <li><a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-white">{WHATSAPP_LABEL}</a></li>
                <li><Link href="#faq" className="hover:text-white">Centre d&apos;aide et FAQ</Link></li>
                <li><Link href="#comparatif" className="hover:text-white">Comparatif Excel et papier</Link></li>
                <li><Link href="/cgu" className="hover:text-white">Conditions d&apos;utilisation</Link></li>
                <li><Link href="/confidentialite" className="hover:text-white">Confidentialité</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
            <p>© {new Date().getFullYear()} ZINDO · zindo.site. Tous droits réservés.</p>
            <p>Conçu au Burkina Faso</p>
          </div>
        </div>
      </footer>

      <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="flex h-16 items-center justify-around px-2 text-[11px] font-semibold text-zinc-500">
          <a href="#pos-simulator" className="flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 text-zindo-blue-700"><Store className="h-5 w-5" />Aperçu</a>
          <a href="#fonctionnement" className="flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1"><Boxes className="h-5 w-5" />Fonctions</a>
          <a href="#tarifs" className="flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1"><ScanBarcode className="h-5 w-5" />Tarifs</a>
          <Link href="/inscription" className="flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 font-bold text-zindo-blue-800"><ArrowRight className="h-5 w-5" />Essai</Link>
        </div>
      </nav>
    </div>
  );
}
