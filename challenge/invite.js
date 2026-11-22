/* Public invite page: /challenge/invite?c=CODE. No sign-in. */
(function () {
  'use strict';
  var B = window.BIA, CFG = B.CFG, esc = B.esc;
  var $app = document.getElementById('app');
  var code = new URLSearchParams(location.search).get('c') || '';
  var now = new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var gw = CFG.guestWeek, guestWeekOn = today <= gw.to;

  // The week ahead, one day at a time. Preview level: the main pieces only.
  var WOD = [], wi = 0;
  function wodInner() {
    var w = WOD[Math.min(wi, WOD.length - 1)];
    return '<span class="kicker">What we’re training</span>' +
      '<h2 class="ch-h2">' + esc(B.fmtDay(w.date, { weekday: 'long', month: 'short', day: 'numeric' })) + '</h2>' +
      (WOD.length > 1 ? '<div class="days" role="group" aria-label="Day">' + WOD.map(function (x, k) {
        return '<button data-wd="' + k + '" aria-pressed="' + (k === wi) + '" aria-label="' + esc(B.fmtDay(x.date, { weekday: 'long', month: 'long', day: 'numeric' })) + '">' +
          '<b>' + esc(B.fmtDay(x.date, { weekday: 'short' })) + '</b><span>' + B.parseDay(x.date).getDate() + '</span></button>';
      }).join('') + '</div>' : '') +
      '<div class="wod">' + w.parts.map(function (p) {
        return '<div class="wod-part"><span class="wod-name">' + esc(p.name) + '</span>' +
          (p.lines || []).map(function (l) { return '<span class="wod-line">' + esc(l) + '</span>'; }).join('') + '</div>';
      }).join('') + '</div>' +
      '<p class="fine">Never done any of this? Good. Every workout has three levels, and a coach scales it to you.</p>';
  }
  function workouts(list) {
    WOD = (Array.isArray(list) ? list : []).filter(function (w) { return w.parts && w.parts.length; });
    return WOD.length ? '<section class="card" id="wodcard">' + wodInner() + '</section>' : '';
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-wd]'), card = document.getElementById('wodcard');
    if (!b || !card) return;
    wi = +b.dataset.wd; card.innerHTML = wodInner();
  });

  function draw(info, wod) {
    var name = info && info.first_name ? info.first_name : null;
    var who = name ? esc(name) : 'A member';
    $app.innerHTML =
      '<main class="ch-main no-nav">' +
      '<header class="ch-hero"><span class="eyebrow eyebrow-y">Black Iron Athletics · Frisco, TX</span>' +
      (info && info.photo ? B.avatar(name, info.photo, 'av-lg av-color') : '') +
      '<h1 class="ch-h1" style="font-size:clamp(2.4rem,12vw,3.6rem);margin-top:18px">' + who + ' <span class="outline">invited you</span></h1>' +
      '<p class="ch-lead">' + (guestWeekOn
        ? 'It’s Friends & Family Week at Black Iron. Come train with ' + (name ? esc(name) : 'us') + '. Your classes are free this week. Book your first one and you’re good all week.'
        : 'Come train with ' + (name ? esc(name) : 'us') + ' at Black Iron. Sign the waiver, pick a class, and we’ll take it from there.') + '</p></header>' +

      '<a class="btn btn-y w100" id="waiver" href="' + esc(guestWeekOn ? gw.bookUrl : CFG.waiverUrl) + '" target="_blank" rel="noopener">' + (guestWeekOn ? 'Book your first free class' : 'Sign the waiver') + '</a>' +

      '<section class="card"><h2 class="ch-h2">How it works</h2><ol class="howto">' +
      (guestWeekOn
        ? '<li><span>Book your first free class. You’ll pick a time, set up a quick profile and sign the waiver. It takes a few minutes on your phone.</span></li>' +
          '<li><span>Tell ' + (name ? esc(name) : 'your friend') + ' which class you picked. Want more? Book any other class this week the same way.</span></li>'
        : '<li><span>Sign the waiver. It takes two minutes on your phone.</span></li>' +
          '<li><span>Pick a class and tell ' + (name ? esc(name) : 'your friend') + ' which one.</span></li>') +
      '<li><span>Show up ten minutes early. A coach will meet you, and every workout has three levels, so you’ll train at yours.</span></li></ol></section>' +

      workouts(wod) +

      (guestWeekOn
        ? '<section class="card"><span class="kicker">Friends & Family Week</span><h2 class="ch-h2">Class times</h2><div class="sched">' +
          gw.days.map(function (d) { return '<div><b>' + esc(d[0]) + '</b><span>' + esc(d[1]) + '</span></div>'; }).join('') + '</div>' +
          '<p class="fine">Strength & Conditioning classes, coached start to finish.</p></section>'
        : '<a class="btn btn-ghost w100" href="/schedule">See the class schedule</a>') +

      '<section class="card"><h2 class="ch-h2">Where</h2><p class="fine">279 Main Street, Suite 122<br>Frisco, TX 75036</p>' +
      '<a class="linkbtn" href="https://maps.google.com/?q=Black+Iron+Athletics+279+Main+Street+Frisco+TX" target="_blank" rel="noopener">Open in Maps</a>' +
      '<p class="fine">Bring water and shoes you can move in.</p></section>' +

      '<p class="fine">Veteran-owned. In Frisco since 2013. We help everyday people become everyday athletes.</p>' +
      '<a class="linkbtn" href="/">blackironathletics.com</a></main>';

    document.getElementById('waiver').addEventListener('click', function () {
      if (code) B.rpc('invite_click', { p_code: code }).catch(function () {});
    });
  }

  // Each piece is optional: the page still works with no code and no workout posted.
  var noop = function () { return null; };
  Promise.all([
    code ? B.rpc('invite_info', { p_code: code }).catch(noop) : null,
    B.rpc('workout_preview').catch(noop)
  ]).then(function (r) { draw(r[0], r[1]); });
})();
