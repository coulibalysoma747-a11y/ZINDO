/**
 * Carte premium dédiée aux écrans d'authentification : coins très arrondis,
 * ombre douce, espace intérieur confortable. Distincte du composant Card
 * générique pour ne pas modifier son apparence dans le reste de l'application.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-zindo-navy-900/5 bg-white p-6 shadow-[0_20px_50px_-15px_rgba(13,19,48,0.22)] sm:p-8">
      {children}
    </div>
  );
}
