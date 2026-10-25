import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  ChevronDown,
  CloudOff,
  Headset,
  MessageCircle,
  MonitorSmartphone,
  PackageSearch,
  PlayCircle,
  ReceiptText,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import type { PlanOffer } from "@/lib/plan-catalog";

type Faq = { question: string; answer: string };

const WHATSAPP = "https://wa.me/22604059929";

const chips = [
  { icon: ReceiptText, label: "Ventes rapides", text: "Encaissez en quelques secondes" },
  { icon: Boxes, label: "Gestion de stock", text: "Suivi en temps réel" },
  { icon: Wallet, label: "Crédits clients", text: "Dettes et encaissements" },
  { icon: TrendingUp, label: "Rapports clairs", text: "Meilleures décisions" },
  { icon: Users, label: "Employés & accès", text: "Rôles et permissions" },
  { icon: CloudOff, label: "Faible connexion", text: "Fonctionne hors ligne" },
  { icon: BadgeCheck, label: "100 % conçu pour les commerçants", text: "Adapté à votre réalité" },
  { icon: ShieldCheck, label: "Sécurisé", text: "Vos données sont protégées" },
  { icon: MonitorSmartphone, label: "Rapide", text: "Interface fluide" },
  { icon: Store, label: "Multi-boutiques", text: "Plusieurs points de vente" },
  { icon: Headset, label: "Accompagnement", text: "Un expert à vos côtés" },
];

const challenges = [
  { n: "01", title: "Stock mal suivi", text: "Vous ne savez pas exactement ce qui est disponible ou en rupture." },
  { n: "02", title: "Ventes non enregistrées correctement", text: "Ventes oubliées, montants erronés, tickets non émis. Vos chiffres ne sont plus fiables." },
  { n: "03", title: "Crédits clients oubliés", text: "Dettes non suivies, paiements oubliés, pertes d'argent et relations clients fragilisées." },
  { n: "04", title: "Employés difficiles à contrôler", text: "Sans gestion des accès et des rôles, vous ne savez plus qui fait quoi." },
  { n: "05", title: "Rapports inexistants", text: "Pas de vision claire sur vos ventes, bénéfices, dépenses ou performances." },
  { n: "06", title: "Difficulté à gérer plusieurs boutiques", text: "Les informations sont éparpillées, vous perdez du temps et la vue globale." },
  { n: "07", title: "Connexion internet instable", text: "Impossible de continuer à travailler quand internet coupe." },
];

const solutions = [
  { icon: ReceiptText, title: "Gestion des ventes", text: "Encaissez rapidement vos clients, imprimez des tickets et suivez toutes vos ventes en temps réel." },
  { icon: Boxes, title: "Gestion du stock", text: "Suivez vos produits, quantités, entrées et sorties. Soyez alerté en cas de rupture de stock." },
  { icon: Wallet, title: "Gestion des crédits clients", text: "Enregistrez les dettes, paiements partiels et soldes. Suivez facilement vos clients et leurs historiques." },
  { icon: TrendingUp, title: "Gestion des dépenses", text: "Enregistrez et catégorisez toutes vos dépenses pour mieux contrôler vos charges et votre trésorerie." },
  { icon: Users, title: "Gestion des employés", text: "Ajoutez vos employés, définissez des rôles et contrôlez leurs accès selon leurs responsabilités." },
  { icon: PackageSearch, title: "Rapports clairs", text: "Consultez des rapports détaillés sur vos ventes, bénéfices, dépenses, stocks, crédits et performances." },
  { icon: Store, title: "Multi-boutiques", text: "Gérez plusieurs boutiques ou points de vente depuis un seul compte en toute simplicité." },
  { icon: CloudOff, title: "Faible connexion + sync", text: "Fonctionne même avec une faible connexion internet et synchronise vos données dès que le débit s'améliore." },
];

const lowConn = [
  { icon: CloudOff, title: "Continuez à vendre", text: "Même avec une connexion faible." },
  { icon: ShieldCheck, title: "Données sécurisées", text: "Vos données sont protégées et sauvegardées." },
  { icon: Wifi, title: "Synchronisation automatique", text: "Vos données se synchronisent dès que la connexion revient." },
  { icon: Headset, title: "Support réactif", text: "Notre équipe vous accompagne à chaque étape." },
];

export function FasoStockLanding({ trialDays, plans, faqs }: { trialDays: number; plans: PlanOffer[]; faqs: Faq[] }) {
  const minPrice = Math.min(...plans.filter((p) => p.monthlyPrice > 0).map((p) => p.monthlyPrice));
  return (
    <div className="theme-locked min-h-screen overflow-x-hidden bg-white text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <ZindoLogo size={36} />
            <span className="text-lg font-extrabold tracking-tight text-zindo-ink-900">ZINDO</span>
          </Link>
          <nav className="hidden items-center gap-5 lg:flex">
            <Link href="#tarifs" className="text-[13px] font-semibold text-neutral-800 hover:text-zindo-blue-600">Tarifs</Link>
            <Link href="/offre-complete" className="text-[13px] font-semibold text-neutral-800 hover:text-zindo-blue-600">Offre complète</Link>
            <Link href="/fonctionnalites" className="text-[13px] font-semibold text-neutral-800 hover:text-zindo-blue-600">Gestion commerciale</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-zindo-ink-700 hover:text-zindo-blue-600 sm:block">Se connecter</Link>
            <Link href="/inscription" className="rounded-xl bg-zindo-blue-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-zindo-blue-500/25 transition hover:bg-zindo-blue-600">
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-zindo-blue-50/60 to-white px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="text-4xl font-black tracking-tight text-zindo-ink-900 sm:text-6xl">
              Prenez le contrôle total de votre commerce.
            </h1>
            <p className="mt-3 text-lg font-semibold text-zindo-blue-700 sm:text-xl">
              Le logiciel de gestion commerciale N°1 au Burkina Faso
            </p>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-zinc-600 sm:text-lg">
              ZINDO est un logiciel de gestion commerciale simple et complet pour les commerçants et PME du Burkina Faso : gérez votre stock, vos ventes, votre caisse, vos factures, vos crédits clients, vos employés et vos rapports au même endroit.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-zindo-ink-900 shadow-sm transition hover:border-zindo-blue-300">
                Se connecter
              </Link>
              <a href="#demo" className="inline-flex items-center gap-2 rounded-2xl bg-zindo-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-zindo-blue-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-blue-600">
                <PlayCircle className="h-5 w-5" /> Voir en vidéo
              </a>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chips.map((c) => (
              <div key={c.label} className="flex items-start gap-3 rounded-2xl border border-zinc-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zindo-blue-50 text-zindo-blue-700">
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zindo-ink-900">{c.label}</p>
                  <p className="text-xs text-zinc-500">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-zindo-ink-900 sm:text-4xl">Accompagnement</h2>
              <p className="mt-2 text-lg font-semibold text-zindo-blue-700">Un expert vous accompagne dans la prise en main de ZINDO</p>
              <p className="mt-4 text-base leading-relaxed text-zinc-600">
                Notre équipe vous aide à configurer votre boutique, importer vos produits, former vos utilisateurs et démarrer rapidement avec ZINDO.
              </p>
              <ul className="mt-6 space-y-3">
                {["Configuration", "Installation et paramétrage", "Support client", "Formation", "Suivi"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-zindo-ink-900">
                    <CheckCircle2 className="h-5 w-5 text-zindo-blue-600" /> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zindo-ink-900 shadow-sm transition hover:border-zindo-blue-300">
                  Demander une démo
                </a>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600">
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-zinc-100 bg-zindo-blue-50 shadow-xl">
                <Image src="/photos/commercante-boutique.webp" alt="Conseiller ZINDO" width={640} height={480} className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -right-4 w-[85%] rounded-2xl border border-zinc-100 bg-white p-4 shadow-2xl sm:-right-6">
                <p className="text-xl font-black text-zindo-ink-900">Conseiller <span className="text-zindo-blue-600">ZINDO</span></p>
                <p className="mt-1 text-sm text-zinc-500">Accompagnement, configuration et support client</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zindo-blue-50 px-3 py-1 text-xs font-bold text-zindo-blue-700">
                  <ShieldCheck className="h-4 w-4" /> À vos côtés à chaque étape
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-zinc-50 px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight text-zindo-ink-900 sm:text-4xl">Les défis quotidiens</h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600">
                Vous perdez peut-être de l&apos;argent sans le savoir. Gérer un commerce sans outil adapté peut entraîner des erreurs, des pertes et un manque de visibilité sur votre activité.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {challenges.map((c) => (
                <div key={c.n} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                  <span className="text-2xl font-black text-zindo-blue-200">{c.n}</span>
                  <h3 className="mt-2 text-base font-bold text-zindo-ink-900">{c.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">{c.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-base font-semibold text-zindo-blue-700">
              La bonne nouvelle ? ZINDO a été conçu pour résoudre tous ces problèmes et vous aider à reprendre le contrôle total de votre commerce.
            </p>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight text-zindo-ink-900 sm:text-4xl">Notre solution</h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600">
                ZINDO centralise toute la gestion de votre commerce. Une plateforme simple, complète et intelligente pour gérer tous les aspects de votre activité depuis un seul endroit.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {solutions.map((s) => (
                <div key={s.title} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zindo-blue-50 text-zindo-blue-700">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-zindo-ink-900">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-base font-bold text-zindo-ink-900">Tout ce dont vous avez besoin, dans une seule application.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-zinc-600">
              {["Sécurisé", "Simple & rapide", "Adapté à votre réalité", "Multi-boutiques", "Accompagnement"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-zindo-blue-600" /> {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-zinc-50 px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-zindo-ink-900 sm:text-4xl">Questions fréquentes</h2>
            <div className="mt-8 space-y-3">
              {faqs.map((f) => (
                <details key={f.question} className="group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zindo-ink-900">
                    {f.question.replaceAll("{trialDays}", String(trialDays))}
                    <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">{f.answer.replaceAll("{trialDays}", String(trialDays))}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-zindo-ink-900">Vous avez d&apos;autres questions ?</h3>
            <p className="mt-2 text-sm text-zinc-500">Notre équipe est disponible pour vous répondre rapidement sur WhatsApp.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600">
                <MessageCircle className="h-5 w-5" /> Discuter sur WhatsApp
              </a>
              <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zindo-ink-900 shadow-sm transition hover:border-zindo-blue-300">
                Demander une démo
              </a>
            </div>
          </div>
        </section>

        <section className="bg-zindo-blue-50 px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-zindo-ink-900 sm:text-4xl">Faible connexion</h2>
            <p className="mt-2 text-center text-base text-zinc-600">Continuez à vendre même avec une connexion faible.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {lowConn.map((l) => (
                <div key={l.title} className="rounded-2xl border border-zinc-100 bg-white p-5 text-center shadow-sm">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zindo-blue-50 text-zindo-blue-700">
                    <l.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-zindo-ink-900">{l.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{l.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-2xl font-black tracking-tight text-zindo-ink-900">Nos partenaires</h2>
            <p className="mt-2 text-sm text-zinc-500">Aucun partenaire public pour le moment.</p>
          </div>
        </section>

        <section className="bg-zinc-50 px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-black tracking-tight text-zindo-ink-900">Restez informé</h2>
            <p className="mt-2 text-sm text-zinc-500">Recevez nos nouveautés, conseils et offres exclusives.</p>
            <form className="mt-5 flex flex-col gap-2 sm:flex-row">
              <input type="email" placeholder="Votre email" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zindo-blue-400" />
              <button type="submit" className="rounded-xl bg-zindo-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-zindo-blue-600">S&apos;abonner</button>
            </form>
            <p className="mt-2 text-xs text-zinc-400">Pas de spam. Désabonnement à tout moment.</p>
          </div>
        </section>

        <section id="tarifs" className="px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-zindo-ink-900 sm:text-4xl">Tarifs</h2>
            <p className="mt-3 text-base text-zinc-600">À partir de {minPrice} FCFA / mois. Essai gratuit de {trialDays} jours.</p>
            <Link href="/tarifs" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zindo-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-zindo-blue-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-blue-600">
              Voir les tarifs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-zinc-200 bg-zinc-50 px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <ZindoLogo size={30} />
                <span className="text-lg font-bold tracking-tight text-zindo-ink-900">ZINDO</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-400">
                <a href="https://www.facebook.com/profile.php?id=61594056733577" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-zindo-blue-600"><FacebookIcon className="h-5 w-5" /></a>
                <a href="https://www.tiktok.com/@zindo390" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-zindo-blue-600"><TikTokIcon className="h-5 w-5" /></a>
              </div>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm font-semibold text-zindo-ink-900">Produit</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                  <li><Link href="/fonctionnalites" className="hover:text-zindo-ink-900">Fonctionnalités</Link></li>
                  <li><Link href="/tarifs" className="hover:text-zindo-ink-900">Tarifs</Link></li>
                  <li><Link href="/inscription" className="hover:text-zindo-ink-900">Essai gratuit</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-zindo-ink-900">Ressources</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                  <li><Link href="/#faq" className="hover:text-zindo-ink-900">FAQ</Link></li>
                  <li><Link href="/contact" className="hover:text-zindo-ink-900">Contact</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-zindo-ink-900">Entreprise</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                  <li><Link href="/a-propos" className="hover:text-zindo-ink-900">À propos</Link></li>
                  <li><Link href="/contact" className="hover:text-zindo-ink-900">Contact</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-zindo-ink-900">Légal</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                  <li><Link href="/cgu" className="hover:text-zindo-ink-900">Conditions d&apos;utilisation</Link></li>
                  <li><Link href="/confidentialite" className="hover:text-zindo-ink-900">Confidentialité</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-zinc-200 pt-6 text-xs text-zinc-400 sm:flex-row">
              <p>© {new Date().getFullYear()} ZINDO. Tous droits réservés.</p>
              <p>🇧🇫 Fait avec ❤️ au Burkina Faso</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
