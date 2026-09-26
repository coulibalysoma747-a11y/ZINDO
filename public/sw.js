// Service worker de ZINDO.
//
// 1. Installation de ZINDO comme application (Chrome/Edge exigent un
//    service worker).
// 2. Mode hors ligne du navigateur et du téléphone (flag
//    « hors_ligne_navigateur », voir components/layout/OfflineShell.tsx) :
//    inactif tant que la page n'a pas envoyé le message ZINDO_OFFLINE_ENABLE.
//    Une fois activé, il garde une copie des pages essentielles et des
//    fichiers de l'application, pour que ZINDO s'ouvre même sans Internet.
//    En ligne, tout passe toujours d'abord par le réseau (données à jour) ;
//    la copie ne sert qu'en cas d'échec du réseau.
// 3. Notifications push.

const PAGES_CACHE = "zindo-pages";
const STATIC_CACHE = "zindo-static";
// Entrée spéciale du cache des pages : { userId, pages, refreshedAt }.
const META_URL = "/__zindo_offline_meta";
// Au plus une remise à jour complète des copies toutes les 6 heures.
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
// En plus des pages essentielles, chaque page visitée en ligne est gardée
// (fiche produit, rapports, dépenses…), dans la limite de ce nombre : les
// plus anciennes sont retirées en premier.
const MAX_VISITED_PAGES = 150;
// Jamais gardées : console d'administration, connexion, inscription…
const NEVER_CACHED = ["/admin", "/login", "/inscription", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe", "/verifier-2fa", "/compte-suspendu", "/maintenance", "/api"];

function isNeverCached(pathname) {
  return NEVER_CACHED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

async function rememberVisitedPage(cache, pathname, res, meta) {
  await cache.delete(pathname, { ignoreVary: true });
  await cache.put(pathname, res);
  const keys = (await cache.keys()).filter((r) => {
    const path = new URL(r.url).pathname;
    return path !== META_URL && !meta.pages.includes(path);
  });
  for (let i = 0; i < keys.length - MAX_VISITED_PAGES; i++) await cache.delete(keys[i]);
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function readMeta() {
  if (!(await caches.has(PAGES_CACHE))) return null;
  const cache = await caches.open(PAGES_CACHE);
  const res = await cache.match(META_URL, { ignoreVary: true });
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function writeMeta(meta) {
  const cache = await caches.open(PAGES_CACHE);
  await cache.put(META_URL, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
}

async function purgeOfflineCaches() {
  await Promise.all([caches.delete(PAGES_CACHE), caches.delete(STATIC_CACHE)]);
}

/** Une réponse redirigée ne peut pas servir de page de navigation : on ne garde que les pages obtenues directement. */
function isCacheablePage(res) {
  return res && res.ok && !res.redirected && res.type === "basic" && (res.headers.get("Content-Type") || "").includes("text/html");
}

function staticUrlsIn(html) {
  const urls = new Set();
  const re = /\/_next\/static\/[^"'\\\s)<>]+/g;
  let m;
  while ((m = re.exec(html))) urls.add(m[0]);
  return [...urls];
}

/**
 * Télécharge toutes les pages essentielles et les fichiers qu'elles
 * utilisent, puis remplace leurs anciennes copies d'un seul coup (une coupure
 * au milieu ne doit pas laisser un mélange de deux versions). Les pages
 * visitées et leurs fichiers sont conservés.
 */
async function refreshOfflineCopies(userId, pages) {
  const fetchedPages = [];
  const staticUrls = new Set();
  for (const path of pages) {
    try {
      const res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
      if (!isCacheablePage(res)) continue;
      const html = await res.clone().text();
      staticUrlsIn(html).forEach((u) => staticUrls.add(u));
      fetchedPages.push([path, res]);
    } catch {
      // Page injoignable : on garde l'ancienne copie plutôt que rien.
      return;
    }
  }
  if (fetchedPages.length === 0) return;

  const fetchedStatic = [];
  for (const url of staticUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) fetchedStatic.push([url, res]);
    } catch {
      return;
    }
  }

  const pagesCache = await caches.open(PAGES_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all(fetchedPages.map(([path, res]) => pagesCache.put(path, res)));
  await Promise.all(fetchedStatic.map(([url, res]) => staticCache.put(url, res)));
  await writeMeta({ userId, pages, refreshedAt: Date.now() });
  await trimStaticCache(staticCache);
}

// Les fichiers des anciennes versions de l'application s'accumulent à chaque
// mise à jour de ZINDO : au-delà de ce nombre, les plus anciens sont retirés.
const MAX_STATIC_FILES = 800;

async function trimStaticCache(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_STATIC_FILES; i++) await cache.delete(keys[i]);
}

let refreshing = null;

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "ZINDO_NETWORK_PROBE") {
    if (data.ok) markNetworkUp();
    else markNetworkDown();
    return;
  }
  if (data.type === "ZINDO_NETWORK_QUERY") {
    if (event.source) event.source.postMessage({ type: "ZINDO_NETWORK", down: isNetworkDown() });
    return;
  }
  if (data.type === "ZINDO_OFFLINE_DISABLE") {
    event.waitUntil(purgeOfflineCaches());
    return;
  }
  if (data.type !== "ZINDO_OFFLINE_ENABLE" || !data.userId || !Array.isArray(data.pages)) return;
  event.waitUntil(
    (async () => {
      const meta = await readMeta();
      // Autre utilisateur sur le même appareil : ses pages ne doivent jamais
      // s'afficher pour le suivant.
      if (meta && meta.userId !== data.userId) await purgeOfflineCaches();
      const fresh =
        meta &&
        meta.userId === data.userId &&
        Date.now() - meta.refreshedAt < REFRESH_INTERVAL_MS &&
        JSON.stringify(meta.pages) === JSON.stringify(data.pages);
      if (fresh || refreshing) return;
      refreshing = refreshOfflineCopies(data.userId, data.pages).finally(() => {
        refreshing = null;
      });
      await refreshing;
    })()
  );
});

function offlineFallbackPage(availablePages) {
  const labels = {
    "/dashboard": "Tableau de bord",
    "/ventes": "Vente",
    "/caisse": "Caisse",
    "/produits": "Produits",
    "/stock": "Stock",
    "/stock/entree": "Entrée de stock",
    "/stock/sortie": "Sortie de stock",
    "/clients": "Clients",
    "/fournisseurs": "Fournisseurs",
    "/achats/nouveau": "Nouvel achat",
    "/inventaire/nouveau": "Nouvel inventaire",
  };
  const links = availablePages
    .map((p) => `<li><a href="${p}">${labels[p] || p}</a></li>`)
    .join("");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZINDO — Hors connexion</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:24px 16px;background:#f8fafc;color:#18181b}main{max-width:420px;margin:0 auto}h1{font-size:20px}p{color:#52525b;font-size:14px;line-height:1.5}ul{list-style:none;padding:0}li a{display:block;margin:8px 0;padding:12px 14px;border:1px solid #e4e4e7;border-radius:12px;background:#fff;color:#18181b;text-decoration:none;font-weight:600}@media (prefers-color-scheme:dark){body{background:#0f172a;color:#f4f4f5}p{color:#a1a1aa}li a{background:#1e293b;border-color:#334155;color:#f4f4f5}}</style></head>
<body><main><h1>Hors connexion</h1><p>Cette page n'est pas disponible sans Internet. Les pages suivantes restent utilisables ; vos opérations seront synchronisées au retour de la connexion.</p><ul>${links}</ul></main></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function noConnectionPage() {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZINDO — Pas de connexion</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:24px 16px;background:#f8fafc;color:#18181b}main{max-width:420px;margin:0 auto}h1{font-size:20px}p{color:#52525b;font-size:14px;line-height:1.5}button{margin-top:8px;padding:12px 16px;border:0;border-radius:12px;background:#18181b;color:#fff;font-weight:600;font-size:14px}@media (prefers-color-scheme:dark){body{background:#0f172a;color:#f4f4f5}p{color:#a1a1aa}button{background:#f4f4f5;color:#18181b}}</style></head>
<body><main><h1>Pas de connexion Internet</h1><p>ZINDO n'a pas pu joindre le serveur. Vérifiez votre connexion (données mobiles ou Wi-Fi), puis réessayez.</p><button onclick="location.reload()">Réessayer</button></main></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Réseau « connecté mais qui ne passe pas » (Wi-Fi ou données sans
// Internet, très fréquent) : le navigateur ne signale pas d'échec, il attend
// indéfiniment. Au-delà de ce délai, si Internet ne passe vraiment plus
// (voir isInternetReachable), on sert la copie ; puis pendant
// NETWORK_DOWN_MS, on bascule directement sur les copies sans réattendre.
// La page sonde aussi le réseau en continu (components/layout/OfflineShell.tsx,
// message ZINDO_NETWORK_PROBE) : le plus souvent, la coupure est déjà connue
// avant le clic, et la copie s'affiche sans aucune attente.
const NETWORK_TIMEOUT_MS = 3000;
const NETWORK_DOWN_MS = 30000;
let networkDownUntil = 0;

function isNetworkDown() {
  return Date.now() < networkDownUntil;
}

async function broadcastNetwork(down) {
  const clientsArr = await self.clients.matchAll({ type: "window" });
  clientsArr.forEach((c) => c.postMessage({ type: "ZINDO_NETWORK", down }));
}

function markNetworkDown() {
  const wasDown = isNetworkDown();
  networkDownUntil = Date.now() + NETWORK_DOWN_MS;
  if (!wasDown) broadcastNetwork(true);
}

function markNetworkUp() {
  if (networkDownUntil === 0) return;
  networkDownUntil = 0;
  broadcastNetwork(false);
}

/**
 * Internet passe-t-il vraiment ? Petite requête sans cache vers un fichier
 * statique minuscule, servi instantanément quand le réseau fonctionne. Sert
 * à ne pas confondre une page lente à préparer par le serveur (réseau
 * correct) avec une vraie coupure.
 */
async function isInternetReachable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`/manifest.json?ping=${Date.now()}`, { method: "HEAD", cache: "no-store", signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const TIMED_OUT = Symbol("timeout");

/**
 * fetch() qui abandonne seulement si le réseau est réellement coupé : après
 * NETWORK_TIMEOUT_MS sans réponse, on vérifie Internet ; s'il passe, le
 * serveur est juste lent et on continue d'attendre la vraie réponse. En cas
 * d'abandon, la requête continue et `late` reçoit une réponse tardive.
 */
async function fetchUnlessOffline(request, late) {
  const real = fetch(request).then((res) => {
    markNetworkUp();
    return res;
  });
  const first = await Promise.race([
    real.then((res) => ({ res }), (err) => ({ err })),
    new Promise((resolve) => setTimeout(() => resolve(TIMED_OUT), NETWORK_TIMEOUT_MS)),
  ]);
  if (first !== TIMED_OUT) {
    if (first.err) throw first.err;
    return first.res;
  }
  if (await isInternetReachable()) return real;
  if (late) real.then(late, () => {});
  throw new Error("offline");
}

async function saveVisitedPage(pathname, res) {
  const meta = await readMeta();
  if (meta && !isNeverCached(pathname) && isCacheablePage(res)) {
    const cache = await caches.open(PAGES_CACHE);
    await rememberVisitedPage(cache, pathname, res, meta);
  }
}

async function offlineResponse(pathname) {
  const meta = await readMeta();
  // Aucune copie sur cet appareil (mode hors ligne non activé, ou jamais
  // ouvert en ligne depuis) : message clair plutôt que l'erreur brute
  // « ERR_FAILED » du navigateur.
  if (!meta) return noConnectionPage();
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(pathname, { ignoreVary: true });
  if (cached) return cached;
  const available = (await cache.keys()).map((r) => new URL(r.url).pathname);
  return offlineFallbackPage(meta.pages.filter((p) => available.includes(p)));
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  const enabled = !!(await readMeta());
  if (!enabled) {
    try {
      return await fetch(request);
    } catch {
      return noConnectionPage();
    }
  }
  if (isNetworkDown()) {
    // Réseau déjà constaté coupé : copie tout de suite ; on retente le réseau
    // en arrière-plan pour détecter son retour.
    fetch(request).then((res) => {
      markNetworkUp();
      saveVisitedPage(url.pathname, res);
    }, () => {});
    return offlineResponse(url.pathname);
  }
  try {
    const res = await fetchUnlessOffline(request, (lateRes) => saveVisitedPage(url.pathname, lateRes));
    await saveVisitedPage(url.pathname, res.clone());
    return res;
  } catch {
    markNetworkDown();
    return offlineResponse(url.pathname);
  }
}

/**
 * Données d'un changement de page Next.js (en-tête RSC). Si le réseau ne
 * répond pas, on échoue vite : Next.js bascule alors sur une navigation
 * complète, servie par handleNavigation depuis la copie.
 */
async function handleRscRequest(request) {
  if (isNetworkDown()) return Response.error();
  // Préchargement discret des liens par Next.js : jamais utilisé pour
  // décider d'une coupure (il peut être lent sans que personne n'attende).
  if (request.headers.get("Next-Router-Prefetch")) return fetch(request);
  try {
    return await fetchUnlessOffline(request);
  } catch {
    markNetworkDown();
    return Response.error();
  }
}

async function handleStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (request.headers.get("RSC") === "1") {
    event.respondWith(
      caches.has(PAGES_CACHE).then((enabled) => (enabled ? handleRscRequest(request) : fetch(request)))
    );
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.has(STATIC_CACHE).then((enabled) => (enabled ? handleStatic(request) : fetch(request)))
    );
  }
  // Tout le reste (actions serveur, API, images) : le navigateur gère
  // normalement.
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
