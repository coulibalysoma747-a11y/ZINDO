import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Barcode,
  Bike,
  Check,
  CloudOff,
  Cog,
  Coins,
  Hammer,
  MessageCircle,
  Pill,
  Plus,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Store,
  UtensilsCrossed,
  Warehouse,
  Wrench,
} from "lucide-react";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PublicNavLinks, PublicNavMenu } from "@/components/landing/PublicNav";
import { PublicHelpChat } from "@/components/PublicHelpChat";
import { LiveDashboard, Reveal, StoriesCarousel, type Story } from "@/components/landing/AccueilProAnime";

type Faq = { question: string; answer: string };

const WHATSAPP = "https://wa.me/22604059929";

/**
 * Page d'accueil publique, version refondue : un message clair, le logiciel
 * visible dès le premier écran, trois fonctions expliquées en détail au lieu
 * d'une suite de cartes. Les écrans montrés sont des maquettes (données d'exemple).
 */
export function AccueilPro({ trialDays, faqs, footer }: { trialDays: number; faqs: Faq[]; footer: React.ReactNode }) {
  return (
    <div className="theme-locked min-h-screen overflow-x-hidden bg-white text-zindo-ink-900">
      <div aria-hidden className="zindo-flag-stripe h-1 w-full" />

      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <ZindoLogo size={34} />
            <span className="text-lg font-extrabold tracking-tight">ZINDO</span>
          </Link>
          <PublicNavLinks />
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-zindo-ink-700 hover:text-zindo-green-700 sm:block">
              Se connecter
            </Link>
            <Link href="/inscription" className="whitespace-nowrap rounded-lg bg-zindo-green-500 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-zindo-green-600">
              Essai gratuit
            </Link>
            <PublicNavMenu />
          </div>
        </div>
      </header>

      <main>
        {/* Premier écran : le message à gauche, le logiciel à droite. */}
        <section className="relative isolate overflow-hidden bg-zindo-green-950 text-white">
          {/* Décor : halos de couleur et quadrillage estompé. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-zindo-green-500/30 blur-[120px]" />
            <div className="absolute -right-32 top-24 h-[420px] w-[420px] rounded-full bg-zindo-gold-500/15 blur-[120px]" />
            <div
              className="absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
              style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "44px 44px" }}
            />
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-24">
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-zindo-green-200 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-zindo-green-400" /> Conçu au Burkina Faso, pour l&apos;Afrique
                </p>
              </Reveal>
              <Reveal delay={100}>
                <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4rem]">
                  Votre stock et vos ventes,{" "}
                  <span className="bg-gradient-to-r from-zindo-green-300 via-zindo-green-400 to-zindo-gold-400 bg-clip-text text-transparent">justes chaque jour.</span>
                </h1>
              </Reveal>
              <Reveal delay={200}>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-zindo-green-100/80">
                  ZINDO remplace le cahier et Excel : caisse, stock, crédits clients et bénéfices dans une seule application, qui continue de
                  fonctionner quand Internet coupe.
                </p>
              </Reveal>
              <Reveal delay={300}>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/inscription"
                    className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3.5 text-base font-bold text-zindo-green-800 shadow-lg shadow-black/20 transition hover:bg-zindo-green-50"
                  >
                    Essayer gratuitement {trialDays} jours <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="/api/auth/google"
                    className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
                  >
                    <GoogleIcon className="h-[18px] w-[18px]" /> Continuer avec Google
                  </a>
                </div>
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zindo-green-100/80">
                  {["Sans carte bancaire", "Sans engagement", "Ensuite 7 500 FCFA par mois"].map((t) => (
                    <li key={t} className="inline-flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-zindo-green-400" /> {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <Reveal delay={250}>
              <LiveDashboard />
            </Reveal>
          </div>
        </section>

        {/* Métiers qui défilent en continu. */}
        <section aria-label="Métiers pris en charge" className="overflow-hidden border-b border-zinc-100 bg-white py-5">
          <div className="zindo-marquee flex w-max gap-3">
            {[...METIERS, ...METIERS].map(({ icon: Icon, label }, i) => (
              <span
                key={i}
                aria-hidden={i >= METIERS.length}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zindo-ink-700"
              >
                <Icon className="h-4 w-4 text-zindo-green-600" /> {label}
              </span>
            ))}
          </div>
        </section>

        {/* Bande de confiance : là où ZINDO fonctionne et comment on paie. */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
            <TrustItem icon={Smartphone} title="Téléphone, tablette, ordinateur" text="Android, iPhone et Windows, même compte partout." />
            <TrustItem icon={CloudOff} title="Fonctionne sans Internet" text="Les ventes se synchronisent au retour du réseau." />
            <TrustItem icon={Coins} title="Paiement local" text="Abonnement par Orange Money, Moov Money ou Wave." />
          </div>
        </section>

        {/* Trois fonctions, expliquées une par une. */}
        <section id="fonctions" className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:px-6 lg:py-28">
          <SectionTitle eyebrow="Ce que fait ZINDO" title="Tout votre commerce, au même endroit" />
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
            visual={<CaisseMock />}
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
            visual={<StockMock />}
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
            visual={<CreditsMock />}
          />
        </section>

        {/* Métiers couverts. */}
        <section className="border-y border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionTitle
              eyebrow="Adapté à votre métier"
              title="Des écrans faits pour votre activité"
              text="À l'inscription, vous choisissez votre activité : ZINDO affiche les champs et les modules qui vous servent."
            />
            <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {METIERS.map(({ icon: Icon, label, detail }) => (
                <li key={label} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zindo-green-50 text-zindo-green-700">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-zinc-500">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Exemples d'utilisation (pas des avis clients). */}
        <section className="relative isolate overflow-hidden bg-zindo-green-950 text-white">
          <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[480px] w-[480px] rounded-full bg-zindo-green-500/25 blur-[120px]" />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-wider text-zindo-green-300">Exemples d&apos;utilisation</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Ce que ZINDO change, métier par métier</h2>
              <p className="mt-4 text-zindo-green-100/75">
                Quelques situations types, pour voir comment ZINDO s&apos;adapte à votre commerce.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <StoriesCarousel stories={STORIES} />
            </Reveal>
          </div>
        </section>

        {/* Tarifs. */}
        <section id="tarifs" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <SectionTitle eyebrow="Tarifs" title="Un prix simple, tout compris" text={`Essayez tout pendant ${trialDays} jours. Vous ne payez que si vous continuez.`} />
          <Reveal className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
            <PriceCard name="Mensuel" price="7 500" period="FCFA / mois" note="Sans engagement, arrêtez quand vous voulez." />
            <PriceCard highlighted name="Annuel" price="75 000" period="FCFA / an" note="Soit 2 mois offerts (15 000 FCFA d'économie)." />
          </Reveal>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Toutes les fonctionnalités, plusieurs boutiques et utilisateurs, mises à jour incluses.{" "}
            <Link href="/tarifs" className="font-semibold text-zindo-green-700 hover:underline">
              Détail des tarifs
            </Link>
          </p>
        </section>

        {/* Accompagnement et fondateur. */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid overflow-hidden rounded-3xl bg-zindo-green-950 text-white lg:grid-cols-[380px_1fr]">
            <div className="relative h-72 lg:h-auto">
              <Image src="/brand/founder-coulibaly-soma.jpg" alt="Coulibaly Soma, fondateur de ZINDO" fill sizes="(min-width: 1024px) 380px, 100vw" className="object-cover object-top" />
            </div>
            <div className="p-8 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-zindo-green-300">Accompagnement</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Vous n&apos;êtes pas seul pour démarrer</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-zindo-green-100/80">
                ZINDO est développé au Burkina Faso par Coulibaly Soma. L&apos;équipe vous aide à régler votre commerce, à saisir vos produits
                et à former vos employés, puis répond à vos questions sur WhatsApp.
              </p>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-zindo-green-800 transition hover:bg-zindo-green-50"
              >
                <MessageCircle className="h-4 w-4" /> Écrire sur WhatsApp : +226 04 05 99 29
              </a>
            </div>
          </div>
        </section>

        {/* Questions fréquentes et assistant. */}
        <section id="faq" className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zindo-green-700">Questions fréquentes</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Vos questions, nos réponses</h2>
            <p className="mt-3 text-zinc-600">Une autre question ? Posez-la à l&apos;assistant, il répond tout de suite.</p>
            <div className="mt-6">
              <PublicHelpChat />
            </div>
          </div>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
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
          <div className="rounded-3xl bg-zindo-green-500 px-6 py-14 text-center text-white sm:px-12">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Commencez aujourd&apos;hui, c&apos;est gratuit</h2>
            <p className="mx-auto mt-3 max-w-lg text-zindo-green-50/90">
              {trialDays} jours pour tout essayer avec vos vrais produits. Sans carte bancaire.
            </p>
            <Link
              href="/inscription"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-zindo-green-700 transition hover:bg-zindo-green-50"
            >
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {footer}
    </div>
  );
}

const STORIES: Story[] = [
  {
    business: "Exemple : une quincaillerie",
    city: "Bobo-Dioulasso",
    text: "Les ventes à crédit sont suivies client par client : en fin de mois, le gérant sait exactement qui relancer, et pour combien.",
  },
  {
    business: "Exemple : une boutique de pièces détachées",
    city: "Ouagadougou",
    text: "Le vendeur trouve une référence en deux secondes avec la douchette, et le patron est prévenu avant qu'une pièce ne manque.",
  },
  {
    business: "Exemple : une alimentation",
    city: "Koudougou",
    text: "Quand le réseau coupe, la caisse continue : les ventes partent sur le serveur dès que la connexion revient.",
  },
  {
    business: "Exemple : un grossiste avec deux dépôts",
    city: "Abidjan",
    text: "Le stock de chaque dépôt se consulte depuis le téléphone, et chaque transfert est enregistré avec le nom de l'employé.",
  },
];

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
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-zinc-600">{text}</p>}
    </Reveal>
  );
}

function TrustItem({ icon: Icon, title, text }: { icon: typeof Store; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-zinc-500">{text}</p>
      </div>
    </div>
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
        <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
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
        <div className="transition duration-500 hover:-translate-y-1">{visual}</div>
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
        <span className="text-4xl font-extrabold tracking-tight">{price}</span>
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

/* ---------- Maquettes du logiciel (données d'exemple) ---------- */

function Frame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_60px_-20px_rgb(5_58_32/0.25)]">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="ml-2 truncate text-xs font-medium text-zinc-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

function CaisseMock() {
  return (
    <div aria-hidden>
      <Frame title="Caisse">
        <div className="p-5">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400">
            <Barcode className="h-4 w-4" /> Scanner ou rechercher un produit…
          </div>
          <ul className="mt-4 divide-y divide-zinc-100 text-sm">
            {[
              ["Huile moteur 1 L", "3", "7 500"],
              ["Chambre à air", "2", "8 000"],
              ["Ampoule LED", "4", "6 000"],
            ].map(([p, q, t]) => (
              <li key={p} className="flex items-center justify-between py-2.5">
                <span>
                  {p} <span className="text-zinc-400">× {q}</span>
                </span>
                <span className="font-semibold">{t} FCFA</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-3">
            <span className="text-sm text-zinc-600">Total</span>
            <span className="text-xl font-extrabold">21 500 FCFA</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span className="rounded-lg border-2 border-zindo-green-500 bg-zindo-green-50 py-2 text-zindo-green-700">Espèces</span>
            <span className="rounded-lg border border-zinc-200 py-2 text-zinc-600">Mobile Money</span>
            <span className="rounded-lg border border-zinc-200 py-2 text-zinc-600">Crédit</span>
          </div>
          <div className="mt-3 rounded-lg bg-zindo-green-500 py-3 text-center text-sm font-bold text-white">Valider et imprimer le ticket</div>
        </div>
      </Frame>
    </div>
  );
}

function StockMock() {
  const rows: [string, string, number, "ok" | "low" | "out"][] = [
    ["Plaquette de frein", "FR-001", 25, "ok"],
    ["Batterie 12 V", "BA-012", 3, "low"],
    ["Pneu 2.75-17", "PN-275", 0, "out"],
    ["Filtre à huile", "FH-110", 18, "ok"],
  ];
  const badge = {
    ok: "bg-zindo-green-50 text-zindo-green-700",
    low: "bg-amber-50 text-amber-700",
    out: "bg-red-50 text-red-700",
  };
  const label = { ok: "En stock", low: "Stock faible", out: "Rupture" };
  return (
    <div aria-hidden>
      <Frame title="Stock · Boutique principale">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50/60 text-xs text-zinc-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Produit</th>
              <th className="px-3 py-2.5 text-right font-medium">Qté</th>
              <th className="px-5 py-2.5 text-right font-medium">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(([name, ref, qty, s]) => (
              <tr key={ref}>
                <td className="px-5 py-3">
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-zinc-400">{ref}</p>
                </td>
                <td className="px-3 py-3 text-right font-semibold">{qty}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge[s]}`}>{label[s]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Frame>
    </div>
  );
}

function CreditsMock() {
  return (
    <div aria-hidden>
      <Frame title="Crédits clients">
        <div className="p-5">
          <div className="rounded-xl bg-zindo-green-950 p-4 text-white">
            <p className="text-xs text-zindo-green-200">Total dû par vos clients</p>
            <p className="mt-1 text-2xl font-extrabold">850 000 FCFA</p>
          </div>
          <ul className="mt-4 divide-y divide-zinc-100 text-sm">
            {[
              ["Moussa Traoré", "depuis 12 jours", "25 000"],
              ["Awa Ouédraogo", "depuis 3 jours", "12 500"],
              ["Garage Kaboré", "échéance demain", "140 000"],
            ].map(([n, since, v]) => (
              <li key={n} className="flex items-center justify-between py-3">
                <span>
                  <span className="block font-medium">{n}</span>
                  <span className="text-xs text-zinc-400">{since}</span>
                </span>
                <span className="font-semibold">{v} FCFA</span>
              </li>
            ))}
          </ul>
        </div>
      </Frame>
    </div>
  );
}
