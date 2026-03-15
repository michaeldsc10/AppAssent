// ASSENT PWA — Service Worker v4.6
const CACHE = 'assent-v4.6'
const FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
]

// Instala e faz cache dos arquivos essenciais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // Usa addAll com fallback — não falha se algum recurso externo falhar
      Promise.allSettled(FILES.map(f => cache.add(f)))
    )
  )
  self.skipWaiting()
})

// Limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Cache-first para arquivos locais, network-first para externos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  const isLocal = url.hostname === self.location.hostname || url.protocol === 'file:'
  const isNavigate = e.request.mode === 'navigate'

  if (isNavigate || isLocal) {
    // Cache-first: responde do cache, atualiza em background
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone()
            caches.open(CACHE).then(c => c.put(e.request, clone))
          }
          return resp
        }).catch(() => cached)
        return cached || network
      })
    )
  } else {
    // Network-first para recursos externos (fonts, CDN)
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return resp
      }).catch(() => caches.match(e.request))
    )
  }
})
