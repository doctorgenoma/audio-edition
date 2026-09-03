// ============================================================
// service-worker.js - Audio Studio Web
// Estrategia: network-first para el shell de la app (HTML/CSS/JS/iconos)
// y network-first (con fallback a cache) para las librerias externas
// de ffmpeg.wasm, para que la app funcione offline tras el primer uso.
//
// IMPORTANTE: cada vez que actualices index.html (o cualquier archivo
// del APP_SHELL), incrementa CACHE_NAME (v1 -> v2 -> v3...) para forzar
// que el navegador descarte la cache antigua y descargue la version
// nueva. Si no cambias este numero, los usuarios seguiran viendo la
// version vieja aunque hayas subido el archivo corregido a GitHub.
// ============================================================

const CACHE_NAME = "audio-studio-cache-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activa la nueva version inmediatamente, sin esperar a que se cierren
  // todas las pestañas abiertas con la version anterior.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Toma control inmediato de las pestañas ya abiertas, en vez de
  // esperar a la siguiente navegacion/recarga.
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Shell de la app: network-first con fallback a cache. Esto evita
  // servir el HTML viejo cuando hay conexion disponible, y solo usa
  // la copia cacheada si el usuario esta offline.
  if (isSameOrigin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Librerias externas (ffmpeg.wasm/core desde CDN): network-first,
  // con fallback a cache si no hay conexion (para reutilizar el motor
  // ya descargado la primera vez).
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
