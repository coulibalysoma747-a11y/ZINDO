/**
 * Carte premium dédiée aux écrans d'authentification : coins très arrondis,
 * ombre douce, espace intérieur confortable. Distincte du composant Card
 * générique pour ne pas modifier son apparence dans le reste de l'application.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-zindo-ink-900/5 bg-white p-6 pt-8 shadow-[0_24px_60px_-18px_rgba(0,56,32,0.28)] sm:p-8 sm:pt-10">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-zindo-blue-800 via-zindo-blue-500 to-zindo-copper-400" />
      {children}
    </div>
  );
}
