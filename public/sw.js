// Service worker minimal — condition technique requise par certains
// navigateurs (Chrome/Edge) pour proposer l'installation de ZINDO comme
// application. Ne met rien en cache : toutes les requêtes passent
// normalement par le réseau (l'app a besoin de données à jour en permanence).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Laisse le navigateur gérer la requête normalement.
});
