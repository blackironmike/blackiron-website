/* Black Iron TV offline cache. Only controls /tv (registered from tv/tv.js
   with scope "/tv"); the rest of the site is untouched.

   The page and its config are network-first, so a push reaches the TVs as
   soon as they can see it. Images and fonts are cache-first. If the internet
   drops and a TV restarts, it boots from this cache instead of showing a
   browser error page. */
var CACHE = 'bia-tv-v1';
var CORE = [
  '/tv', '/tv/tv.css', '/tv/tv.js', '/tv/config.js',
  '/images/tv/skull.png', '/images/logos/Anvil-WHITE.png'
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

function networkFirst(req) {
  return Promise.race([fetch(req), timeout(6000)]).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('/tv'); });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
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
    if (url.pathname.indexOf('/images/') === 0) { e.respondWith(cacheFirst(req)); return; }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
});
