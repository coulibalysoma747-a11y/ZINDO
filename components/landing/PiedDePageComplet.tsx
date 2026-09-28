import Link from "next/link";
import { Mail } from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { SOLUTION_PAGES } from "@/lib/seo-pages";
import { NewsletterForm } from "@/components/landing/NewsletterForm";

// Pied de page complet de l'accueil (flag pied_page_complet) : newsletter,
// colonnes de liens, « Nos solutions » (pages pour Google) et réseaux.
// Uniquement des liens vers des pages qui existent réellement.

export const WHATSAPP_HREF = "https://wa.me/22604059929";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/fonctionnalites" },
      { label: "Tarifs", href: "/tarifs" },
      { label: "Démonstration", href: "/#demo" },
      { label: "Caisse hors ligne", href: "/fonctionnalites/caisse-hors-ligne" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Questions fréquentes", href: "/#faq" },
      { label: "Gestion de stock", href: "/fonctionnalites/gestion-de-stock" },
      { label: "Crédits clients", href: "/fonctionnalites/credits-clients" },
      { label: "Factures et devis", href: "/fonctionnalites/facturation" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/a-propos" },
      { label: "Contact", href: "/contact" },
      { label: "Pour les PME", href: "/fonctionnalites/logiciel-gestion-pme" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Conditions d'utilisation", href: "/cgu" },
      { label: "Politique de confidentialité", href: "/confidentialite" },
    ],
  },
];

const SOCIAL_LINKS = [
  { icon: FacebookIcon, label: "Facebook", href: "https://www.facebook.com/profile.php?id=61594056733577&mibextid=ZbWKwL" },
  { icon: TikTokIcon, label: "TikTok", href: "https://www.tiktok.com/@zindo390?_r=1&_t=ZN-99o7lktR2Ws" },
];

export function PiedDePageComplet() {
  return (
    <footer className="relative z-10 bg-zindo-ink-900 px-5 pb-10 pt-12 text-sm text-zindo-ink-200 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Newsletter */}
        <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zindo-green-500/20 text-zindo-green-400">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-extrabold text-white">
                Restez <span className="text-zindo-green-400">informé</span>
              </p>
              <p className="mt-0.5">Nouveautés de ZINDO et conseils de gestion pour votre commerce.</p>
            </div>
          </div>
          <NewsletterForm />
        </div>

        {/* Colonnes */}
        <div className="mt-10 grid grid-cols-2 gap-8 lg:grid-cols-6">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <ZindoLogo size={36} />
              <span className="text-lg font-extrabold text-white">ZINDO</span>
            </div>
            <p className="mt-3 leading-relaxed">
              Le logiciel de gestion de stock, de caisse et de facturation conçu au Burkina Faso, pour les boutiques
              comme pour les PME.
            </p>
            <p className="mt-3">
              Support WhatsApp :{" "}
              <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-zindo-green-400">
                +226 04 05 99 29
              </a>
            </p>
            <div className="mt-4 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-zindo-green-500"
                >
                  <social.icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-bold text-zindo-gold-400">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Nos solutions */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="font-bold text-zindo-gold-400">Nos solutions</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {SOLUTION_PAGES.map((p) => (
              <Link key={p.slug} href={`/fonctionnalites/${p.slug}`} className="text-white/90 hover:text-zindo-green-400">
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} ZINDO. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>Paiement de l&apos;abonnement :</span>
            <span className="rounded-md bg-[#FF7900] px-2 py-0.5 font-bold text-white">Orange Money</span>
            <span className="rounded-md bg-[#004990] px-2 py-0.5 font-bold text-white">Moov Money</span>
            <span className="rounded-md bg-[#1DC1EE] px-2 py-0.5 font-bold text-zindo-ink-900">Wave</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
