/* Generic web runtime isolation, revision 11.
   Adds Document-Isolation-Policy for compatible Chrome/Edge embedded documents.
   Retains COOP+COEP for standalone browser support. */
if (typeof Window === 'undefined' && typeof document === 'undefined') {
  self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', event => {
    if (event.request.mode !== 'navigate') return;
    event.respondWith((async () => {
      const response = await fetch(event.request);
      if (response.type === 'opaque' || response.type === 'opaqueredirect') return response;
      const headers = new Headers(response.headers);
      // Unlike COOP/COEP, DIP can isolate an iframe without an isolated parent.
      // Supported in Chromium 137+ desktop and 146+ Android.
      headers.set('Document-Isolation-Policy', 'isolate-and-credentialless');
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
  window.runtimeIsolationReady = (async () => {
    const supportsThreads = () =>
      window.crossOriginIsolated && typeof SharedArrayBuffer === 'function';
    if (supportsThreads()) return;
    if (!navigator.serviceWorker || !['https:', 'http:'].includes(location.protocol)) {
      throw Error('The web runtime needs a secure hosted page (HTTPS), not a local content:// or file:// URL.');
    }
    const key = 'runtime-isolation-v11-reloads';
    const attempts = Number(sessionStorage.getItem(key) || '0');
    if (attempts >= 2) {
      const permitted = document.permissionsPolicy?.allowsFeature?.('cross-origin-isolated');
      const hint = permitted === false ?
        ' An ancestor iframe has not delegated cross-origin-isolated permission.' :
        ' The browser may not support per-frame Document Isolation Policy (Chrome 146+ on Android), or a parent editor may restrict iframe permissions.';
      throw Error('WebAssembly threads are blocked in this embed.' + hint +
        ' The runtime page can still be opened directly in a new tab.');
    }

    let controllerChanged = false;
    const onControllerChange = () => { controllerChanged = true; };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    try {
      const reg = await navigator.serviceWorker.register('./coi-serviceworker.js', {
        scope: './', updateViaCache: 'none'
      });
      // Force a check even when the old service worker already controls the page.
      await reg.update();
      await navigator.serviceWorker.ready;
      const installing = reg.installing;
      if (installing && installing.state !== 'activated') {
        await Promise.race([
          new Promise(resolve => {
            const check = () => {
              if (['activated', 'redundant'].includes(installing.state)) {
                installing.removeEventListener('statechange', check);
                resolve();
              }
            };
            installing.addEventListener('statechange', check);
            check();
          }),
          new Promise(resolve => setTimeout(resolve, 10000))
        ]);
      }
      if (!navigator.serviceWorker.controller) {
        await Promise.race([
          new Promise(resolve => {
            if (controllerChanged) return resolve();
            navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true});
          }),
          new Promise(resolve => setTimeout(resolve, 12000))
        ]);
      }
      if (!navigator.serviceWorker.controller) {
        throw Error('The isolation service worker did not gain control of the page.');
      }
      if (supportsThreads()) return;
      sessionStorage.setItem(key, String(attempts + 1));
      // Reopen this document under the newly installed service worker headers.
      location.reload();
      await new Promise(() => {});
    } finally {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    }
  })();
}
