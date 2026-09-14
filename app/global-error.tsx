"use client";

/**
 * Dernier filet de sécurité : ne se déclenche que si app/layout.tsx (le
 * layout racine) plante lui-même — auquel cas app/error.tsx n'est pas
 * disponible, puisqu'il est rendu à l'intérieur de ce layout. Remplace donc
 * tout le document HTML, en style inline pour ne dépendre d'aucun CSS externe
 * qui pourrait lui-même échouer à charger dans ce cas de figure.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#18181b",
          padding: "1rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: 8 }}>
            Une erreur est survenue
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#71717a", marginBottom: 16 }}>
            L&apos;application n&apos;a pas pu se charger. Réessayez ; si le problème persiste,
            contactez le support.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#f97316",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
