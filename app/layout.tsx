import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "ZINDO — Application de gestion de stock et de caisse au Burkina Faso";
const DESCRIPTION =
  "ZINDO est l'application de gestion de stock, de caisse et de ventes pensée pour les commerces du Burkina Faso : boutiques, quincailleries, pièces détachées, motos, alimentation. Suivez votre stock en temps réel, encaissez et connaissez vos bénéfices, en FCFA.";

export const metadata: Metadata = {
  // Requis par Next.js pour résoudre les URLs d'images relatives (openGraph,
  // twitter) en URLs absolues dans le HTML généré — sans ça, les aperçus de
  // lien (WhatsApp, Facebook...) reçoivent une URL invalide.
  metadataBase: new URL("https://zindo.vercel.app"),
  title: {
    default: TITLE,
    template: "%s | ZINDO",
  },
  description: DESCRIPTION,
  keywords: [
    "ZINDO",
    "gestion de stock Burkina Faso",
    "logiciel de caisse Burkina Faso",
    "application de vente boutique",
    "gestion de boutique Burkina Faso",
    "application de facturation FCFA",
    "logiciel pièces détachées moto",
  ],
  alternates: { canonical: "/" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZINDO",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "ZINDO",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "ZINDO" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/brand/og-image.png"],
  },
};

// Applique la classe .dark le plus tôt possible pour éviter tout flash :
// le rendu serveur pose déjà la classe pour un thème "Noir" explicite, et ce
// script bloquant (avant peinture) gère "Système" (préférence du système
// d'exploitation, y compris ses changements en cours de session) ainsi que
// "Blanc". Les pages hors espace commerçant (connexion, console admin) ont
// leur propre identité fixe via la classe .theme-locked (voir globals.css).
function ThemeInitScript({ theme }: { theme: string }) {
  const script = `(function(){try{var t=${JSON.stringify(theme)};var d=document.documentElement;function apply(v){d.classList.toggle('dark',v);}if(t==='SYSTEM'){var m=window.matchMedia('(prefers-color-scheme: dark)');apply(m.matches);m.addEventListener('change',function(e){apply(e.matches);});}else{apply(t==='DARK');}}catch(e){}})();`;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const theme = user?.theme ?? "SYSTEM";

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${theme === "DARK" ? " dark" : ""}`}
    >
      <head><meta name="google-site-verification" content="hLIb2IvzFGtm2VC6hR9cK5choC2_bbHh2Ew2qfNdvTQ" />
        <meta name="theme-color" content="#176d30" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <ThemeInitScript theme={theme} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
