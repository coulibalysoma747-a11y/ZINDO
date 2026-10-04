import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Barcode,
  Bike,
  Check,
  CloudOff,
  Cog,
  Hammer,
  History,
  Lock,
  MessageCircle,
  Pill,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Store,
  UserCog,
  UtensilsCrossed,
  Warehouse,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { SOLUTION_PAGES } from "@/lib/seo-pages";
import { AccueilProHeader } from "@/components/landing/AccueilProHeader";
import { CaisseAnimee, CreditsAnimes, StockAnime } from "@/components/landing/AccueilProEcrans";
import { ApercuCookie, Reveal } from "@/components/landing/AccueilProAnime";

type Faq = { question: string; answer: string };

const WHATSAPP = "https://wa.me/22604059929";

/**
 * Page d'accueil publique, style sobre (flag accueil_pro) : fond blanc, grands
 * titres fins, vraies photos de commerces (licences libres, crédits en pied de
 * page) et une seule couleur, le vert ZINDO. Les écrans du logiciel montrés sont
 * des maquettes avec des données d'exemple.
 */
export function AccueilPro({ trialDays, faqs }: { trialDays: number; faqs: Faq[] }) {
  return (
    <div className="theme-locked min-h-screen overflow-x-hidden bg-white text-zinc-950">
      <AccueilProHeader variant="light" />
      <ApercuCookie />

      <main>
        {/* Premier écran : le message à gauche, un vrai commerçant à droite. */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-36">
          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zindo-green-700">Logiciel de caisse et de stock</p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-5 text-[2.6rem] font-medium leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-[4.1rem]">
                Votre stock et vos ventes, justes chaque jour.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
                ZINDO remplace le cahier et Excel : caisse, stock, crédits clients et bénéfices dans une seule application, qui continue de
                fonctionner quand Internet coupe.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/inscription"
                  className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-zindo-green-600 px-7 py-4 text-base font-semibold text-white transition hover:bg-zindo-green-700"
                >
                  Essayer gratuitement <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#tarifs"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 px-7 py-4 text-base font-semibold text-zinc-900 transition hover:border-zinc-900"
                >
                  Voir les tarifs
                </Link>
              </div>
              <p className="mt-5 text-sm text-zinc-500">
                {trialDays} jours gratuits · Sans carte bancaire · Ensuite 2500 FCFA par mois
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-zinc-100 lg:aspect-[4/4.4]">
              <Image
                src="/photos/commercant-comptoir.webp"
                alt="Un commerçant souriant derrière son comptoir, dans sa boutique de vêtements"
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover object-[60%_center]"
              />
            </div>
            {/* Une seule touche « logiciel » : la vente qui vient d'être enregistrée. */}
            <div className="absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.25)] ring-1 ring-black/5 sm:left-auto sm:right-6 sm:w-80">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zindo-green-50 text-zindo-green-700">
                <Check className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Vente enregistrée</p>
                <p className="truncate text-xs text-zinc-500">3 articles · Orange Money</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">21 500 F</p>
            </div>
          </Reveal>
        </section>

        {/* Bande de confiance, sobre. */}
        <section className="border-y border-zinc-200">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
            {[
              [CloudOff, "Fonctionne sans Internet"],
              [Smartphone, "Téléphone, tablette, ordinateur"],
              [Wallet, "Orange Money, Moov Money, Wave"],
              [MessageCircle, "Accompagnement sur WhatsApp"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Store;
              return (
                <p key={label as string} className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                  <I className="h-5 w-5 shrink-0 text-zindo-green-600" /> {label as string}
                </p>
              );
            })}
          </div>
        </section>

        {/* Pour chaque commerce : vraies photos. */}
        <section id="metiers" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-medium tracking-[-0.03em] sm:text-5xl">Fait pour les commerces d&apos;ici</h2>
            <p className="mt-4 text-lg text-zinc-600">
              À l&apos;inscription, vous choisissez votre activité : ZINDO affiche les écrans et les champs qui vous servent.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {COMMERCES.map((c, i) => (
              <Reveal key={c.title} delay={i * 100}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
                  <Image src={c.photo} alt={c.alt} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover transition duration-700 hover:scale-[1.03]" />
                </div>
                <div className="mt-5 border-t border-zinc-200 pt-5">
                  <h3 className="text-xl font-medium tracking-tight">{c.title}</h3>
                  <p className="mt-2 text-zinc-600">{c.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 flex flex-wrap gap-2">
            {METIERS.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700">
                <Icon className="h-4 w-4 text-zindo-green-600" /> {label}
              </span>
            ))}
          </Reveal>
        </section>

        {/* Trois fonctions, expliquées une par une. */}
        <section id="fonctions" className="bg-zinc-50">
          <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:px-6 lg:space-y-32 lg:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="text-3xl font-medium tracking-[-0.03em] sm:text-5xl">Tout votre commerce, au même endroit</h2>
            </Reveal>
            <Feature
              eyebrow="Caisse"
              title="Encaissez en quelques secondes"
              text="Cherchez le produit ou scannez son code-barres, choisissez le moyen de paiement, et le ticket sort. Le stock baisse tout seul."
              points={[
                "Ticket 58 ou 80 mm, facture A4 avec QR code de vérification",
                "Espèces, Mobile Money, carte ou vente à crédit",
                "Remises, retours et échanges enregistrés",
                "Vente possible même sans connexion",
              ]}
              visual={<CaisseAnimee />}
            />
            <Feature
              reverse
              eyebrow="Stock"
              title="Sachez exactement ce qu'il reste en rayon"
              text="Chaque entrée et chaque sortie est enregistrée avec la date, la personne et le motif. Vous êtes prévenu avant la rupture."
              points={[
                "Alerte dès qu'un produit atteint son stock minimum",
                "Inventaire : stock réel comparé au stock théorique",
                "Plusieurs boutiques et dépôts, transferts entre eux",
                "Achats fournisseurs qui remplissent le stock",
              ]}
              visual={<StockAnime />}
            />
            <Feature
              eyebrow="Argent"
              title="Connaissez votre vrai bénéfice"
              text="Le bénéfice est calculé à chaque vente à partir du prix d'achat. Les crédits clients sont suivis jusqu'au dernier franc."
              points={[
                "Chiffre d'affaires et bénéfice du jour, du mois",
                "Qui vous doit combien, et depuis quand",
                "Rapports de ventes, d'achats et de stock",
                "Chaque employé ne voit que ce qui le concerne",
              ]}
              visual={<CreditsAnimes />}
            />
          </div>
        </section>

        {/* Comparatif. */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <SectionTitle eyebrow="Comparatif" title="Cahier, Excel ou ZINDO ?" text="Ce qui change concrètement dans votre journée." />
          <Reveal className="mt-12 overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-[13px] sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-3 py-4 font-semibold text-zinc-500 sm:px-5" />
                  <th className="px-2 py-4 text-center font-semibold text-zinc-500 sm:px-4">Cahier</th>
                  <th className="px-2 py-4 text-center font-semibold text-zinc-500 sm:px-4">Excel</th>
                  <th className="bg-zindo-green-50 px-2 py-4 text-center font-bold text-zindo-green-700 sm:px-4">ZINDO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {COMPARISON.map(([label, cahier, excel]) => (
                  <tr key={label}>
                    <td className="px-3 py-3.5 font-medium sm:px-5">{label}</td>
                    <td className="px-2 py-3.5 text-center sm:px-4"><Mark ok={cahier} /></td>
                    <td className="px-2 py-3.5 text-center sm:px-4"><Mark ok={excel} /></td>
                    <td className="bg-zindo-green-50/60 px-2 py-3.5 text-center sm:px-4"><Mark ok /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </section>

        {/* Conçu au Burkina Faso : vraie photo de Ouagadougou. */}
        <section className="relative isolate overflow-hidden">
          <Image
            src="/photos/rue-commercante-ouagadougou.webp"
            alt="Boutiques d'une rue commerçante de Ouagadougou"
            fill
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
          <div className="mx-auto max-w-6xl px-4 py-24 text-white sm:px-6 lg:py-32">
            <Reveal className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zindo-green-300">Conçu au Burkina Faso</p>
              <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-5xl">Pensé pour la réalité des commerces d&apos;Afrique de l&apos;Ouest</h2>
              <ul className="mt-8 space-y-3 text-white/85">
                {[
                  "Le FCFA et les monnaies de 250 pays, avec ou sans centimes",
                  "La caisse continue quand le réseau coupe",
                  "Abonnement payé par Orange Money, Moov Money ou Wave",
                  "Une équipe joignable sur WhatsApp, en français",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-zindo-green-300" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Démarrage en trois étapes. */}
        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pt-28">
          <SectionTitle eyebrow="Démarrage" title="Prêt à vendre en trois étapes" />
          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            <span aria-hidden className="absolute left-[16.6%] right-[16.6%] top-6 hidden h-px bg-zinc-200 md:block" />
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 120} className="relative text-center">
                <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-300 bg-white text-lg font-medium">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Tarifs. */}
        <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <SectionTitle eyebrow="Tarifs" title="Un prix simple, tout compris" text={`Essayez tout pendant ${trialDays} jours. Vous ne payez que si vous continuez.`} />
          <Reveal className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
            <PriceCard name="Mensuel" price="2 500" period="FCFA / mois" note="Sans engagement, arrêtez quand vous voulez." />
            <PriceCard highlighted name="Annuel" price="25 000" period="FCFA / an" note="Soit 2 mois offerts (15 000 FCFA d'économie)." />
          </Reveal>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Toutes les fonctionnalités, plusieurs boutiques et utilisateurs, mises à jour incluses.{" "}
            <Link href="/tarifs" className="font-semibold text-zindo-green-700 hover:underline">
              Détail des tarifs
            </Link>
          </p>
        </section>

        {/* Sécurité des données : uniquement des faits vérifiables. */}
        <section className="bg-zinc-50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionTitle eyebrow="Sécurité" title="Vos données sont protégées" text="Votre stock et vos chiffres n'appartiennent qu'à vous." />
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITY.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={(i % 3) * 100} className="bg-white p-6">
                  <Icon className="h-5 w-5 text-zindo-green-600" />
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Accompagnement et fondateur. */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-[380px_1fr] lg:gap-16">
            <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-zinc-100">
              <Image src="/brand/founder-coulibaly-soma.jpg" alt="Coulibaly Soma, fondateur de ZINDO" fill sizes="(min-width: 1024px) 380px, 100vw" className="object-cover object-top" />
            </Reveal>
            <Reveal delay={120}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zindo-green-700">Accompagnement</p>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] sm:text-5xl">Vous n&apos;êtes pas seul pour démarrer</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600">
                ZINDO est développé au Burkina Faso par Coulibaly Soma. L&apos;équipe vous aide à régler votre commerce, à saisir vos produits et
                à former vos employés, puis répond à vos questions sur WhatsApp.
              </p>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-zinc-300 px-6 py-3.5 text-sm font-semibold transition hover:border-zinc-900"
              >
                <MessageCircle className="h-4 w-4 text-zindo-green-600" /> Écrire sur WhatsApp : +226 04 05 99 29
              </a>
            </Reveal>
          </div>
        </section>

        {/* Questions fréquentes et assistant. */}
        <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-20 gap-12 border-t border-zinc-200 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:py-28">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">Questions fréquentes</h2>
            <p className="mt-3 text-zinc-600">Une autre question ? L&apos;assistant ZINDO répond tout de suite : bouton en bas à droite, à côté de WhatsApp.</p>
          </div>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {faq.question}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 pr-10 text-sm leading-relaxed text-zinc-600">{faq.answer.replaceAll("{trialDays}", String(trialDays))}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Dernier appel. */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-[2rem] bg-zinc-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <h2 className="text-3xl font-medium tracking-[-0.03em] sm:text-5xl">Commencez aujourd&apos;hui, c&apos;est gratuit</h2>
            <p className="mx-auto mt-4 max-w-lg text-zinc-400">
              {trialDays} jours pour tout essayer avec vos vrais produits. Sans carte bancaire.
            </p>
            <Link
              href="/inscription"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-zindo-green-500 px-7 py-4 text-base font-semibold text-white transition hover:bg-zindo-green-600"
            >
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <FooterPro />
    </div>
  );
}

const COMMERCES = [
  {
    title: "Boutiques et magasins",
    text: "Caisse rapide, stock par rayon, crédits clients et plusieurs vendeurs.",
    photo: "/photos/commercante-boutique.webp",
    alt: "Une commerçante debout parmi les produits de sa boutique",
  },
  {
    title: "Alimentation et grossistes",
    text: "Vente au détail et en gros, sacs et cartons, plusieurs dépôts.",
    photo: "/photos/vente-riz-ouagadougou.webp",
    alt: "Étal de vente de riz et de vêtements à Ouagadougou",
  },
  {
    title: "Pharmacies et dépôts",
    text: "Lots, dates de péremption et alertes avant la rupture.",
    photo: "/photos/pharmacie-rayons.webp",
    alt: "Rayons de médicaments dans une pharmacie",
  },
];

// [critère, cahier, Excel] — ZINDO coche toujours.
const COMPARISON: [string, boolean, boolean][] = [
  ["Stock à jour après chaque vente", false, false],
  ["Bénéfice calculé automatiquement", false, true],
  ["Ticket et facture imprimés", false, false],
  ["Alerte avant la rupture", false, false],
  ["Crédits clients suivis avec échéances", false, false],
  ["Droits différents pour chaque employé", false, false],
  ["Fonctionne sans Internet", true, true],
  ["Données sauvegardées en ligne", false, false],
];

const STEPS = [
  { title: "Créez votre compte", text: "Le nom de votre commerce, votre ville, votre numéro : c'est tout. Aucune carte bancaire." },
  { title: "Ajoutez vos produits", text: "Un par un, avec le code-barres ou par import. Notre équipe peut vous aider sur WhatsApp." },
  { title: "Vendez", text: "La caisse est prête : chaque vente met à jour votre stock et vos bénéfices." },
];

const SECURITY = [
  { icon: Lock, title: "Connexion chiffrée", text: "Tous les échanges passent par une connexion sécurisée (HTTPS)." },
  { icon: Server, title: "Serveurs professionnels", text: "Vos données sont hébergées sur des serveurs en Europe (Francfort)." },
  { icon: RefreshCw, title: "Copie en ligne", text: "Changez de téléphone ou d'ordinateur : vous retrouvez tout en vous connectant." },
  { icon: UserCog, title: "Droits par employé", text: "Le vendeur vend, le magasinier gère le stock : chacun ne voit que son travail." },
  { icon: History, title: "Historique des actions", text: "Qui a vendu, modifié ou supprimé quoi, et quand : tout est enregistré." },
  { icon: ShieldCheck, title: "Pas de suppression par erreur", text: "Une confirmation est demandée avant toute suppression importante." },
];

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="mx-auto h-5 w-5 text-zindo-green-600" aria-label="Oui" />
  ) : (
    <X className="mx-auto h-5 w-5 text-zinc-300" aria-label="Non" />
  );
}

const METIERS = [
  { icon: Store, label: "Boutique générale", detail: "Caisse rapide, stock et crédits" },
  { icon: Hammer, label: "Quincaillerie", detail: "Détail, gros et conditionnements" },
  { icon: Cog, label: "Pièces détachées", detail: "Références et compatibilités" },
  { icon: Bike, label: "Boutique de motos", detail: "Châssis, moteur et vente à crédit" },
  { icon: ShoppingBasket, label: "Alimentation", detail: "Dates de péremption et rayons" },
  { icon: Pill, label: "Pharmacie", detail: "Lots, péremption, ordonnances" },
  { icon: UtensilsCrossed, label: "Restaurant, maquis", detail: "Tables et commandes en salle" },
  { icon: Wrench, label: "Atelier de réparation", detail: "Fiches, pièces et garanties" },
  { icon: Warehouse, label: "Grossiste, dépôt", detail: "Plusieurs dépôts et transferts" },
  { icon: Shirt, label: "Vêtements, cosmétique", detail: "Tailles, couleurs, variantes" },
  { icon: Barcode, label: "Électronique", detail: "Numéros de série et garanties" },
  { icon: Plus, label: "Et bien d'autres", detail: "Couture, menuiserie, services…" },
];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-zindo-green-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] sm:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-zinc-600">{text}</p>}
    </Reveal>
  );
}

function Feature({
  eyebrow,
  title,
  text,
  points,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={reverse ? "lg:order-2" : ""}>
        <p className="text-sm font-bold text-zindo-green-600">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-4xl">{title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">{text}</p>
        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-zindo-ink-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zindo-green-100 text-zindo-green-700">
                <Check className="h-3.5 w-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={150} className={reverse ? "lg:order-1" : ""}>
        <div className="rounded-[2rem] bg-gradient-to-br from-zindo-green-50 via-white to-zinc-100 p-5 ring-1 ring-zinc-200/70 sm:p-10">{visual}</div>
      </Reveal>
    </div>
  );
}

function PriceCard({ name, price, period, note, highlighted = false }: { name: string; price: string; period: string; note: string; highlighted?: boolean }) {
  return (
    <div className={`relative rounded-2xl border p-7 ${highlighted ? "border-zindo-green-500 ring-4 ring-zindo-green-500/10" : "border-zinc-200"}`}>
      {highlighted && (
        <span className="absolute -top-3 left-7 rounded-full bg-zindo-green-500 px-3 py-0.5 text-xs font-bold text-white">Le plus avantageux</span>
      )}
      <p className="font-semibold text-zinc-600">{name}</p>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight">{price}</span>
        <span className="text-sm text-zinc-500">{period}</span>
      </p>
      <p className="mt-3 text-sm text-zinc-600">{note}</p>
      <Link
        href="/inscription"
        className={`mt-6 flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
          highlighted ? "bg-zindo-green-500 text-white hover:bg-zindo-green-600" : "border border-zinc-300 text-zindo-ink-700 hover:border-zinc-400"
        }`}
      >
        Commencer l&apos;essai gratuit
      </Link>
    </div>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Caisse", href: "/fonctionnalites/caisse-hors-ligne" },
      { label: "Gestion de stock", href: "/fonctionnalites/gestion-de-stock" },
      { label: "Crédits clients", href: "/fonctionnalites/credits-clients" },
      { label: "Factures et devis", href: "/fonctionnalites/facturation" },
      { label: "Tarifs", href: "/tarifs" },
    ],
  },
  {
    title: "Solutions",
    links: [
      ...SOLUTION_PAGES.map((p) => ({ label: p.label, href: `/fonctionnalites/${p.slug}` })),
      { label: "Marché ZINDO", href: "/marche" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/a-propos" },
      { label: "Contact", href: "/contact" },
      { label: "Questions fréquentes", href: "/#faq" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Conditions d'utilisation", href: "/cgu" },
      { label: "Confidentialité", href: "/confidentialite" },
    ],
  },
];

function FooterPro() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <ZindoLogo size={30} />
              <span className="text-lg font-bold tracking-tight">ZINDO</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              Logiciel de caisse, de stock et de facturation conçu au Burkina Faso, pour les boutiques comme pour les PME.
            </p>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-medium text-zindo-ink-700 hover:text-zindo-green-700">
              WhatsApp : +226 04 05 99 29
            </a>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-zindo-ink-900">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-zinc-500 transition-colors hover:text-zindo-ink-900">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-14 text-[11px] leading-relaxed text-zinc-400">
          Photos : Tobin Jones et AMISOM (domaine public, CC0) ; « Ouagadougou shop », Wegmann, et « Vente riz de Bagré Ouaga », Sputniktilt
          (CC BY-SA 3.0, Wikimedia Commons) ; « A Drug Store in Nigeria », Beendy234 (CC0). Écrans du logiciel : données d&apos;exemple.
        </p>
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ZINDO. Tous droits réservés.</p>
          <p>Abonnement payable par Orange Money, Moov Money ou Wave.</p>
          <div className="flex items-center gap-2">
            <a href="https://www.facebook.com/profile.php?id=61594056733577&mibextid=ZbWKwL" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zindo-ink-900">
              <FacebookIcon className="h-4 w-4" />
            </a>
            <a href="https://www.tiktok.com/@zindo390?_r=1&_t=ZN-99o7lktR2Ws" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zindo-ink-900">
              <TikTokIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
