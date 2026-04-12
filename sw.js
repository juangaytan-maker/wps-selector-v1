/**
 * ⚙️ SERVICE WORKER (sw.js)
 * 
 * Este archivo permite que la app funcione offline y se instale en dispositivos.
 * Gestiona el caché de archivos locales (HTML, CSS, JS) para carga instantánea.
 */

const CACHE_NAME = 'wps-selector-v1';

// Archivos locales que guardaremos en el caché
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/wps-calculator.js',
  './js/pro-system.js',
  './js/firebase-config.js',
  './manifest.json'
  // Si tienes iconos, agrégalos aquí: './icons/icon-192.png'
];

// 1. INSTALACIÓN: Guardar archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Cacheando archivos de la app...');
      return cache.addAll(ASSETS_TO_CACHE).catch(error => {
        console.error('Error al cachear:', error);
      });
    })
  );
});

// 2. ACTIVACIÓN: Limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

// 3. FETCH: Servir desde caché o red
self.addEventListener('fetch', event => {
  // Estrategia: Cache First (Intenta cargar del caché primero, si no, va a internet)
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // Encontrado en caché
      }
      return fetch(event.request).catch(() => {
        // Si no hay internet y no está en caché, podrías mostrar una página offline personalizada
        // return caches.match('./offline.html'); 
      });
    })
  );
});