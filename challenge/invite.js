/* Public invite page: /challenge/invite?c=CODE. No sign-in. */
(function () {
  'use strict';
  var B = window.BIA, CFG = B.CFG, esc = B.esc;
  var $app = document.getElementById('app');
  var code = new URLSearchParams(location.search).get('c') || '';
  var now = new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var gw = CFG.guestWeek, guestWeekOn = today <= gw.to;

  function draw(info) {
    var name = info && info.first_name ? info.first_name : null;
    var who = name ? esc(name) : 'A member';
    $app.innerHTML =
      '<main class="ch-main no-nav">' +
      '<header class="ch-hero"><span class="eyebrow eyebrow-y">Black Iron Athletics · Frisco, TX</span>' +
      (info && info.photo ? B.avatar(name, info.photo, 'av-lg av-color') : '') +
      '<h1 class="ch-h1" style="font-size:clamp(2.4rem,12vw,3.6rem);margin-top:18px">' + who + ' <span class="outline">invited you</span></h1>' +
      '<p class="ch-lead">' + (guestWeekOn
        ? 'It’s Friends & Family Week at Black Iron. Come train with ' + (name ? esc(name) : 'us') + '. Your classes are free this week. All we need is a signed waiver.'
        : 'Come train with ' + (name ? esc(name) : 'us') + ' at Black Iron. Sign the waiver, pick a class, and we’ll take it from there.') + '</p></header>' +

      '<a class="btn btn-y w100" id="waiver" href="' + esc(CFG.waiverUrl) + '" target="_blank" rel="noopener">Sign the waiver</a>' +

      '<section class="card"><h2 class="ch-h2">How it works</h2><ol class="howto">' +
      '<li><span>Sign the waiver. It takes two minutes on your phone.</span></li>' +
      '<li><span>Pick a class' + (guestWeekOn ? ' below' : '') + ' and tell ' + (name ? esc(name) : 'your friend') + ' which one.</span></li>' +
      '<li><span>Show up ten minutes early. A coach will meet you, and every workout has three levels, so you’ll train at yours.</span></li></ol></section>' +

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

  if (!code) return draw(null);
  B.rpc('invite_info', { p_code: code }).then(draw, function () { draw(null); });
})();
