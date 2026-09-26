import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // La plupart des erreurs serveur sont rattrapées (try/catch) pour afficher
  // un message clair à la caissière, puis seulement écrites avec
  // console.error : sans cette intégration, Sentry ne les verrait jamais.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
});
