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

export const metadata: Metadata = {
  title: "ZINDO — Gestion de stock et de ventes",
  description: "Gérez votre stock, vos ventes et vos bénéfices en temps réel, sans papier ni tableur.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZINDO",
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
        <meta name="theme-color" content="#0b1b33" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <ThemeInitScript theme={theme} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
