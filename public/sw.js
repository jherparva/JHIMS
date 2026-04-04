const CACHE_NAME = "jhims-v2"
const STATIC_CACHE = "jhims-static-v2"
const API_CACHE = "jhims-api-v2"

// Archivos estáticos que siempre deben estar cacheados
const STATIC_ASSETS = [
  "/",
  "/punto-de-venta",
  "/inicio-sesion",
  "/dashboard",
  "/inventario",
  "/ventas",
  "/gastos",
  "/cartera",
  "/categorias",
  "/entrada-inventario",
  "/proveedores",
  "/clientes",
  "/usuarios",
  "/reportes",
  "/configuracion",
  "/jhims-logo.png",
  "/manifest.json"
]

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker...")
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

// Estrategia de cache: Stale While Revalidate para API
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Para peticiones a la API: Network First con fallback a cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Si falla la red, intentar con cache
          return caches.match(request)
        })
    )
    return
  }

  // Para assets estáticos: Cache First
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request)
      })
    )
    return
  }

  // Para otras peticiones: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cachear respuestas exitosas
        if (response.ok && request.method === "GET") {
          const responseClone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback a cache para GET requests
        if (request.method === "GET") {
          return caches.match(request)
        }
        // Para POST/PUT/DELETE offline, mostrar error
        return new Response(
          JSON.stringify({ error: "Sin conexión a internet" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        )
      })
  )
})

// Limpieza de caches antiguos
self.addEventListener("activate", (event) => {
  console.log("[SW] Activando Service Worker...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log(`[SW] Eliminando cache antiguo: ${cacheName}`)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Sincronización en background
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData())
  }
})

// Función de sincronización
async function syncData() {
  console.log("[SW] Sincronizando datos...")
  // Aquí se implementaría la lógica de sincronización
  // cuando la conexión se restablece
}
