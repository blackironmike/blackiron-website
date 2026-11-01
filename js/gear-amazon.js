/* gear-amazon.js
 * Fills Amazon tiles on /gear and /programs with the product photo and the
 * current price. Amazon's Associates rules require both to come from their
 * API and be no more than 24 hours old, so the tiles ship as plain tagged
 * links and this asks /api/gear-amazon for the rest. That endpoint caches for
 * an hour at the edge, so one visitor's request covers everyone after them.
 * If anything fails, the tiles stay plain links, which still work. */
(function () {
  var tiles = document.querySelectorAll('.ptile[data-asin]');
  if (!tiles.length || !window.fetch) return;
  var asins = [];
  tiles.forEach(function (t) {
    var a = t.getAttribute('data-asin');
    if (asins.indexOf(a) === -1) asins.push(a);
  });
  asins.sort();
  fetch('/api/gear-amazon?asins=' + asins.join(','))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.items) return;
      tiles.forEach(function (t) {
        var it = data.items[t.getAttribute('data-asin')];
        if (!it) return;
        var well = t.querySelector('.amz-img');
        if (it.img && well && !well.firstChild) {
          var img = document.createElement('img');
          img.src = it.img;
          img.alt = '';
          img.loading = 'lazy';
          img.decoding = 'async';
          well.appendChild(img);
          well.classList.add('is-filled');
        }
        if (it.price) {
          var b = t.querySelector('.amz-price');
          if (b) {
            b.textContent = '$' + Number(it.price).toFixed(2).replace(/\.00$/, '');
            t.classList.remove('no-price');
          }
        }
        if (it.url) t.href = it.url;
      });
    })
    .catch(function () {});
})();
