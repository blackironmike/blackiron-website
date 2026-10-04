/* Black Iron TV offline cache. Only controls /tv (registered from tv/tv.js
   with scope "/tv"); the rest of the site is untouched.

   - The page, script, styles and config are network-first, so a push reaches
     the TVs as soon as they can see it. If the network fails or the server
     answers with an error, the TV gets its last good copy instead.
   - Images are served from the cache and refreshed in the background, so a
     replaced image shows up on the reload after next.
   - Fonts are cached once they load successfully.
   If the internet drops and a TV restarts, it boots from this cache instead
   of showing a browser error page. */
var CACHE = 'bia-tv-v2';
var CORE = [
  '/tv', '/tv/tv.css', '/tv/tv.js', '/tv/config.js',
  '/images/tv/skull.png', '/images/tv/anvil.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('bia-tv-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }
function put(req, res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }

// last good copy of this exact file; the page itself only for navigations
function fallback(req, res) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    if (req.mode === 'navigate') return caches.match('/tv').then(function (page) { return page || res || Response.error(); });
    return res || Response.error();
  });
}

function networkFirst(req) {
  return Promise.race([fetch(req), timeout(6000)]).then(function (res) {
    if (res && res.ok) { put(req, res); return res; }
    if (res && (res.status >= 500 || res.status === 404)) return fallback(req, res);
    return res;
  }).catch(function () { return fallback(req, null); });
}

function staleWhileRevalidate(req) {
  return caches.match(req).then(function (hit) {
    var net = Promise.race([fetch(req), timeout(10000)]).then(function (res) {
      if (res && res.ok) put(req, res);
      return res;
    });
    if (hit) { net.catch(function () {}); return hit; }
    return net;
  });
}

function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    return Promise.race([fetch(req), timeout(8000)]).then(function (res) {
      if (res && res.ok) put(req, res); // never keep an error response
      return res;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // update checks ask for a fresh copy on purpose; let them through untouched
  if (url.search.indexOf('_=') >= 0) return;
  if (url.origin === location.origin) {
    if (url.pathname === '/tv' || url.pathname.indexOf('/tv/') === 0) { e.respondWith(networkFirst(req)); return; }
    if (url.pathname.indexOf('/images/') === 0) { e.respondWith(staleWhileRevalidate(req)); return; }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
});
