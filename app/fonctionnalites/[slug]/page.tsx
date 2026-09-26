import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SEO_PAGES, getSeoPage } from "@/lib/seo-pages";
import { PublicPageShell } from "@/components/landing/PublicPageShell";

const BASE_URL = "https://www.zindo.site";

// Seules les pages déclarées dans lib/seo-pages.ts existent — toute autre URL
// renvoie une 404 plutôt qu'une page vide indexable.
export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};
  const url = `${BASE_URL}/fonctionnalites/${page.slug}`;
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: page.metaTitle, description: page.metaDescription, url, type: "website" },
  };
}

export default async function SeoFeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  const others = SEO_PAGES.filter((p) => p.slug !== page.slug);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ZINDO", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Fonctionnalités", item: `${BASE_URL}/fonctionnalites` },
        { "@type": "ListItem", position: 3, name: page.label, item: `${BASE_URL}/fonctionnalites/${page.slug}` },
      ],
    },
  ];

  return (
    <PublicPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <nav aria-label="Fil d'Ariane" className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zindo-green-600">Accueil</Link>
        {" / "}
        <Link href="/fonctionnalites" className="hover:text-zindo-green-600">Fonctionnalités</Link>
        {" / "}
        <span className="text-zindo-ink-700">{page.label}</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-zindo-ink-900 sm:text-4xl">{page.h1}</h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">{page.intro}</p>
        <Link
          href="/inscription"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zindo-green-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-zindo-green-500/30 transition hover:bg-zindo-green-600"
        >
          Essai gratuit de 14 jours <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
        {page.sections.map((s) => (
          <section key={s.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zindo-ink-900">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.text}</p>
            {s.points && (
              <ul className="mt-3 space-y-1.5">
                {s.points.map((pt) => (
                  <li key={pt} className="flex gap-2 text-sm text-zinc-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-600" />
                    {pt}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900">Questions fréquentes</h2>
        <div className="mt-6 divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {page.faqs.map((faq) => (
            <div key={faq.question} className="px-5 py-4">
              <h3 className="font-semibold text-zindo-ink-900">{faq.question}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-bold text-zindo-ink-900">Découvrir aussi</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map((p) => (
            <Link
              key={p.slug}
              href={`/fonctionnalites/${p.slug}`}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zindo-ink-700 hover:border-zindo-green-500 hover:text-zindo-green-700"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
