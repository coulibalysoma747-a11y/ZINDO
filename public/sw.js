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

// Notifications push (voir /profil > Notifications push et lib/push.ts) —
// payload JSON { title, body, link }.
self.addEventListener("push", (event) => {
  let payload = { title: "ZINDO", body: "" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    payload = { title: "ZINDO", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "ZINDO", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link: payload.link || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(link);
        return existing.focus();
      }
      return self.clients.openWindow(link);
    })
  );
});
