import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BadgeCheck, Banknote, Bike, Boxes, ChartNoAxesCombined, Check,
  ChevronDown, CircleHelp, CloudOff, CreditCard, Menu, PackageSearch,
  Pill, ReceiptText, ScanBarcode, ShieldCheck, ShoppingBasket, Smartphone,
  Store, Users, Wallet, Waves, Wrench, X,
} from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import type { PlanOffer } from "@/lib/plan-catalog";

type Faq = { question: string; answer: string };

const pains = [
  { icon: PackageSearch, title: "Ruptures de stock imprévues", text: "Repérez les produits à réapprovisionner avant de perdre une vente." },
  { icon: ReceiptText, title: "Ventes oubliées ou mal notées", text: "Chaque encaissement est enregistré et le stock suit automatiquement." },
  { icon: Wallet, title: "Crédits clients difficiles à suivre", text: "Retrouvez les montants dus et les paiements de chaque client." },
  { icon: Users, title: "Difficile de suivre les employés", text: "Attribuez des accès adaptés et gardez un historique des opérations." },
  { icon: ChartNoAxesCombined, title: "Bénéfice net peu clair", text: "Consultez vos ventes, vos dépenses et vos marges au même endroit." },
  { icon: CloudOff, title: "Internet qui coupe", text: "Continuez à encaisser hors ligne. Les ventes se synchronisent au retour du réseau." },
];

const trades = [
  { icon: Store, title: "Boutiques & quincailleries", text: "Vente au détail, gros et conditionnements." },
  { icon: Boxes, title: "Grossistes & dépôts", text: "Plusieurs magasins, transferts et inventaires." },
  { icon: Bike, title: "Motos & pièces détachées", text: "Références, numéros de série et garanties." },
  { icon: Pill, title: "Pharmacies", text: "Lots, péremption et suivi des produits." },
  { icon: ShoppingBasket, title: "Alimentation", text: "Produits, rayons, caisse et alertes de stock." },
  { icon: Wrench, title: "Ateliers & services", text: "Articles utilisés, réparations et règlements." },
];

const comparison = [
  ["Stock à jour après une vente", false, false, true],
  ["Retrouver les crédits clients", false, false, true],
  ["Voir les ventes et les bénéfices", false, false, true],
  ["Continuer à vendre hors ligne", false, false, true],
  ["Gérer plusieurs employés et boutiques", false, false, true],
] as const;

function SectionTitle({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return <div className="mx-auto max-w-2xl text-center">
    <p className="text-[11px] font-bold uppercase tracking-[.16em] text-blue-700">{kicker}</p>
    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0b1c30] sm:text-3xl">{title}</h2>
    {text && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">{text}</p>}
  </div>;
}

function CheckMark({ yes }: { yes: boolean }) {
  return yes ? <Check aria-label="Oui" className="mx-auto h-4 w-4 text-blue-700" /> : <X aria-label="Non" className="mx-auto h-4 w-4 text-slate-300" />;
}

export function StitchHomepage({ trialDays, plans, faqs }: { trialDays: number; plans: PlanOffer[]; faqs: Faq[] }) {
  const plan = plans.find((item) => item.key === "pro");
  const monthly = plan?.monthlyPrice ?? 7500;
  const annual = plan?.annualPrice ?? 75000;
  const saving = Math.max(0, monthly * 12 - annual);

  return <div className="min-h-screen overflow-x-hidden bg-[#f8f9ff] pb-20 text-[#0b1c30] sm:pb-0">
    <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="ZINDO, accueil" className="flex items-center gap-2.5">
          <ZindoLogo size={32} />
          <span className="leading-none"><span className="block text-base font-extrabold tracking-[.12em]">ZINDO</span><span className="mt-1 block text-[8px] font-semibold uppercase tracking-[.16em] text-blue-700">Gestion commerciale</span></span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
          <Link href="#fonctionnement" className="hover:text-blue-700">Fonctionnement</Link>
          <Link href="#metiers" className="hover:text-blue-700">Métiers</Link>
          <Link href="#tarifs" className="hover:text-blue-700">Tarifs</Link>
          <Link href="#faq" className="hover:text-blue-700">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:inline-flex">Connexion</Link>
          <Link href="/inscription" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1d4ed8] px-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 sm:px-4">Démarrer <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </header>

    <main>
      <section className="bg-gradient-to-b from-[#eaf0ff] via-[#f8f9ff] to-[#f8f9ff] px-4 pb-8 pt-8 sm:px-6 sm:pb-14 sm:pt-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-800 shadow-sm sm:text-xs">
              <span aria-hidden className="text-sm">🇧🇫</span> Pensé au Burkina Faso · Fonctionne hors ligne
            </div>
            <h1 className="mx-auto mt-5 max-w-3xl text-[2rem] font-extrabold leading-[1.12] tracking-tight sm:text-5xl">Prenez le contrôle total de votre commerce.<span className="mt-1 block text-[#1d4ed8]">Chaque franc tracé.</span></h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-lg sm:leading-7">ZINDO remplace le cahier et Excel : encaissement rapide, stock à jour, suivi des crédits et des bénéfices — même quand Internet coupe.</p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Link href="/inscription" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] px-6 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-800 active:scale-[.99]">Essayer gratuitement · {trialDays} jours <ArrowRight className="h-4 w-4" /></Link>
              <Link href="#apercu" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 text-sm font-bold text-slate-800 hover:bg-slate-50"><CircleHelp className="h-4 w-4 text-blue-700" /> Voir l&apos;aperçu</Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-600 sm:text-xs">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-blue-700" /> {trialDays} jours offerts</span>
              <span className="inline-flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-blue-700" /> Sans carte bancaire</span>
              <span className="inline-flex items-center gap-1.5"><Smartphone className="h-4 w-4 text-blue-700" /> Téléphone, tablette et PC</span>
            </div>
            <div className="mx-auto mt-5 flex max-w-md items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paiement mobile</span>
              <span className="flex items-center gap-3 text-[11px] font-bold sm:gap-4"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-orange-500" />Orange</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-sky-700" />Moov</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-cyan-500" />Wave</span></span>
            </div>
          </div>

          <div id="apercu" className="mx-auto mt-8 max-w-2xl scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_50px_-24px_rgba(15,23,42,.28)] sm:mt-10 sm:p-5">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <div><p className="text-xs font-bold sm:text-sm">Aperçu de la caisse</p><p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">Exemple · Boutique ZINDO, Ouagadougou</p></div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-800 sm:text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" />Prête à vendre</span>
            </div>
            <div className="space-y-1.5 py-2">
              {[["Plaquettes de frein FR-001", "Pièce moto · Stock : 24", "7 500"], ["Batterie moto 12V 7Ah", "Garantie 6 mois · Stock : 6", "14 000"]].map(([name, detail, amount]) => <div key={name} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-xs font-bold sm:text-sm">{name}</p><p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{detail}</p></div><div className="flex shrink-0 items-center gap-2.5"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">×1</span><span className="text-xs font-bold tabular-nums sm:text-sm">{amount} F</span></div></div>)}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-3"><div><p className="text-[10px] text-slate-600">Total à encaisser</p><p className="mt-0.5 text-lg font-extrabold tabular-nums sm:text-xl">21 500 <span className="text-xs font-bold text-slate-500">FCFA</span></p></div><span className="rounded-lg bg-[#0f172a] px-3 py-2 text-[10px] font-bold text-white sm:px-4 sm:text-xs"><ScanBarcode className="mr-1.5 inline h-3.5 w-3.5" />Valider la vente</span></div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-bold sm:text-xs">{[["Orange Money", "bg-orange-50 text-orange-800"], ["Wave", "bg-cyan-50 text-cyan-800"], ["Espèces", "bg-slate-100 text-slate-700"]].map(([label, tone]) => <div key={label} className={`flex h-9 items-center justify-center gap-1 rounded-md ${tone}`}><Banknote className="h-3.5 w-3.5" />{label}</div>)}</div>
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-5xl">
        <SectionTitle kicker="Une gestion plus sereine" title="Les pertes évitables du quotidien" text="Un outil clair pour savoir ce qui entre, ce qui sort et ce qu’il vous reste." />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{pains.map(({ icon: Icon, title, text }, i) => <article key={title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon className="h-[18px] w-[18px]" /></span><div><span className="text-[9px] font-extrabold tracking-wider text-blue-700">0{i + 1}</span><h3 className="mt-0.5 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{text}</p></div></article>)}</div>
      </div></section>

      <section id="metiers" className="bg-white px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-5xl">
        <SectionTitle kicker="Votre activité" title="Une solution pensée pour votre métier" text="Choisissez votre activité à l’inscription. ZINDO adapte les outils à votre façon de travailler." />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{trades.map(({ icon: Icon, title, text }) => <article key={title} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#f8f9ff] p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-xs text-slate-600">{text}</p></div></article>)}</div>
      </div></section>

      <section id="tarifs" className="px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-4xl">
        <SectionTitle kicker="Sans surprise" title="Choisissez la formule adaptée" text={`${trialDays} jours pour découvrir ZINDO. Vous choisissez ensuite si vous souhaitez continuer.`} />
        <div className="mx-auto mt-7 grid max-w-3xl gap-4 sm:grid-cols-2">{[{ title: "Mensuel", amount: monthly, suffix: "FCFA / mois", note: "Sans engagement." }, { title: "Annuel", amount: annual, suffix: "FCFA / an", note: saving ? `Économisez ${saving.toLocaleString("fr-FR")} FCFA sur l'année.` : "Un paiement pour l'année.", featured: true }].map((item) => <article key={item.title} className={`relative rounded-2xl border bg-white p-5 shadow-sm ${item.featured ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200"}`}>{item.featured && <span className="absolute -top-3 right-4 rounded-full bg-blue-700 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white">Meilleur prix</span>}<p className="text-xs font-bold text-slate-600">{item.title}</p><p className="mt-2 text-3xl font-extrabold tabular-nums">{item.amount.toLocaleString("fr-FR")} <span className="text-xs font-semibold text-slate-500">{item.suffix}</span></p><p className="mt-2 text-xs text-slate-600">{item.note}</p><ul className="mt-4 space-y-2 text-xs text-slate-700">{(plan?.features ?? ["Caisse et gestion de stock", "Suivi des clients et des crédits", "Accès aux rapports"]).slice(0, 3).map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" />{feature}</li>)}</ul><Link href="/inscription" className={`mt-5 flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold ${item.featured ? "bg-[#1d4ed8] text-white hover:bg-blue-800" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}>Choisir cette formule <ArrowRight className="h-3.5 w-3.5" /></Link></article>)}</div>
      </div></section>

      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-3xl"><SectionTitle kicker="En un regard" title="Cahier vs Excel vs ZINDO" text="Passez d’un suivi dispersé à une vue claire de votre commerce." />
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[1.6fr_repeat(3,.65fr)] bg-slate-50 px-3 py-3 text-center text-[9px] font-extrabold uppercase tracking-wide text-slate-600 sm:px-4 sm:text-[11px]"><span className="text-left">Fonction</span><span>Cahier</span><span>Excel</span><span className="text-blue-800">ZINDO</span></div>{comparison.map(([label, book, excel, zindo]) => <div key={label} className="grid grid-cols-[1.6fr_repeat(3,.65fr)] items-center border-t border-slate-100 px-3 py-3 text-center sm:px-4"><span className="text-left text-[10px] font-semibold sm:text-xs">{label}</span><CheckMark yes={book} /><CheckMark yes={excel} /><span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-50"><CheckMark yes={zindo} /></span></div>)}</div>
      </div></section>

      <section id="faq" className="px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-2xl"><SectionTitle kicker="Besoin d'aide ?" title="Questions fréquentes" />
        <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">{faqs.slice(0, 6).map((faq) => <details key={faq.question} className="group px-4 py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold sm:text-sm">{faq.question}<ChevronDown className="h-4 w-4 shrink-0 text-blue-700 transition group-open:rotate-180" /></summary><p className="mt-2 pr-6 text-xs leading-5 text-slate-600">{faq.answer.replaceAll("{trialDays}", String(trialDays))}</p></details>)}</div>
      </div></section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16"><div className="mx-auto grid max-w-5xl items-center gap-5 rounded-2xl bg-[#0f172a] p-5 text-white sm:grid-cols-[1fr_auto] sm:p-8"><div className="flex items-center gap-4"><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white/20"><Image src="/brand/founder-coulibaly-soma.jpg" alt="Coulibaly Soma, fondateur de ZINDO" fill sizes="64px" className="object-cover" /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Accompagnement local</p><h2 className="mt-1 text-base font-extrabold sm:text-lg">Un appui pour démarrer sereinement</h2><p className="mt-1 text-xs leading-5 text-white/70">Notre équipe vous aide à configurer vos produits et à prendre en main l’application.</p></div></div><a href="https://wa.me/22604059929" target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] px-4 text-xs font-bold text-white hover:bg-blue-700">Nous contacter <ArrowRight className="h-4 w-4" /></a></div></section>

      <section className="px-4 pb-14 sm:px-6"><div className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-white px-5 py-8 text-center shadow-sm sm:py-10"><ShieldCheck className="mx-auto h-7 w-7 text-blue-700" /><h2 className="mt-3 text-xl font-extrabold sm:text-2xl">Prêt à mieux suivre votre commerce ?</h2><p className="mt-2 text-sm text-slate-600">Commencez votre essai gratuit en quelques minutes.</p><Link href="/inscription" className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 text-sm font-bold text-white hover:bg-blue-800">Créer mon compte <ArrowRight className="h-4 w-4" /></Link></div></section>
    </main>

    <footer className="border-t border-slate-200 bg-white px-4 py-7 text-center text-[10px] text-slate-500 sm:px-6"><p className="font-bold text-slate-700">ZINDO · Gestion commerciale conçue au Burkina Faso</p><p className="mt-2"><Link href="/fonctionnalites" className="hover:text-blue-700">Fonctionnalités</Link> · <Link href="/tarifs" className="hover:text-blue-700">Tarifs</Link> · <Link href="/cgu" className="hover:text-blue-700">Conditions</Link> · <Link href="/confidentialite" className="hover:text-blue-700">Confidentialité</Link></p><p className="mt-2">Support WhatsApp : +226 04 05 99 29</p><p className="mt-2">© {new Date().getFullYear()} ZINDO. Tous droits réservés.</p></footer>

    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden"><a href="#apercu" className="flex flex-col items-center gap-1 text-[9px] font-semibold text-slate-500"><ScanBarcode className="h-4 w-4" />Aperçu</a><a href="#fonctionnement" className="flex flex-col items-center gap-1 text-[9px] font-semibold text-slate-500"><Boxes className="h-4 w-4" />Fonctions</a><a href="#tarifs" className="flex flex-col items-center gap-1 text-[9px] font-semibold text-slate-500"><Banknote className="h-4 w-4" />Tarifs</a><Link href="/inscription" className="flex flex-col items-center gap-1 text-[9px] font-extrabold text-blue-700"><ArrowRight className="h-4 w-4" />Essai gratuit</Link></nav>
  </div>;
}
