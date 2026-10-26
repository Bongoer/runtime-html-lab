/* Runtime Lab browser isolation shim. HTTPS GitHub Pages/localhost only.
   A service worker can add COOP/COEP to navigations on static origins.
   Game and engine payloads are never cached or modified by this worker. */
if (typeof Window === 'undefined' && typeof document === 'undefined') {
  self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', event => {
    if (event.request.mode !== 'navigate') return;
    event.respondWith((async () => {
      const response = await fetch(event.request);
      // For failures, do not fabricate a success response.
      if (response.type === 'opaque' || response.type === 'opaqueredirect') return response;
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    })());
  });
} else {
  window.runtimeIsolationReady = new Promise((resolve, reject) => {
    if (self.crossOriginIsolated && typeof SharedArrayBuffer === 'function') {
      sessionStorage.removeItem('runtime-coi-reloads');
      resolve(); return;
    }
    if (!navigator.serviceWorker || !['https:', 'http:'].includes(location.protocol)) {
      reject(new Error('Runtime Lab needs its published GitHub Pages URL (HTTPS), not content://, file:// or W3Schools Tryit.'));
      return;
    }
    const key = 'runtime-coi-reloads';
    const reloadCount = Number(sessionStorage.getItem(key) || '0');
    // Chrome cannot isolate a document inside a non-isolated parent iframe.
    if (window.top !== window && reloadCount > 0) {
      reject(new Error('The embedded page is still not isolated. Open the GitHub Pages site in its own tab. A non-isolated W3Schools/Framer iframe cannot grant WebAssembly threading.'));
      return;
    }
    if (reloadCount > 1) {
      reject(new Error('GitHub Pages service worker is active but WebAssembly threading is still blocked. Check HTTPS, browser settings and sandbox/iframe restrictions.'));
      return;
    }
    let done = false;
    function reloadOnce() {
      if (done) return;
      done = true;
      sessionStorage.setItem(key, String(reloadCount + 1));
      location.reload();
    }
    const timer = setTimeout(() => {
      if (!done) reject(new Error('Service worker registration timed out. Open the published HTTPS GitHub Pages page directly.'));
    }, 15000);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(timer); reloadOnce();
    }, {once:true});
    navigator.serviceWorker.register('./coi-serviceworker.js', {scope: './'})
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (navigator.serviceWorker.controller) {
          clearTimeout(timer);
          reloadOnce();
        }
      })
      .catch(err => { clearTimeout(timer); reject(new Error('Unable to register isolation service worker: ' + err.message)); });
  });
}
