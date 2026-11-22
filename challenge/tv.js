/* Gym screen at /challenge/tv. Public and read-only. Rotates through:
   team leaderboard, individual leaderboard, member highlight, photo wall.
   Before scoring starts it shows the countdown and sign-ups by team. */
(function () {
  'use strict';
  var B = window.BIA, esc = B.esc;
  var $stage = document.getElementById('stage');
  var D = null, idx = 0, urls = {}, tick = 0;
  var ROTATE_MS = 14000, REFRESH_MS = 60000;

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $stage.style.transform = 'scale(' + s + ')';
    $stage.style.left = (window.innerWidth - 1920 * s) / 2 + 'px';
    $stage.style.top = (window.innerHeight - 1080 * s) / 2 + 'px';
  }
  window.addEventListener('resize', fit); fit();

  function av(name, path, cls) {
    var src = path ? (path.charAt(0) === '/' ? path : B.avatarUrl(path)) : null;
    return src ? '<img class="tv-av ' + (cls || '') + '" src="' + esc(src) + '" alt="">' : '<span class="tv-av ' + (cls || '') + '">' + esc(B.initials(name)) + '</span>';
  }
  function team(id) { return D.teams.filter(function (t) { return t.id === id; })[0] || { name: '' }; }

  function left() {
    var wk = D.weeks.filter(function (w) { return w.week_no === D.week_no; })[0] || {};
    var pre = D.phase === 'pre';
    return '<div class="tv-left"><div><div class="tv-k y">Black Iron Athletics</div>' +
      '<div class="tv-title" style="margin-top:18px">Rally<br><span class="outline">Point</span></div></div>' +
      '<div class="tv-weeks">' + D.weeks.map(function (w) {
        return '<i class="' + (w.week_no === D.week_no ? 'now' : w.week_no < D.week_no ? 'past' : '') + '">' + w.week_no + '</i>';
      }).join('') + '</div>' +
      (pre
        ? '<div><div class="tv-k">Scoring starts</div><div class="tv-big" style="margin-top:12px">' + esc(B.fmtDay(D.challenge.scoring_starts_on, { weekday: 'long', month: 'long', day: 'numeric' })) + '</div></div>' +
          '<div class="tv-sub">' + D.signups + ' signed up. Sign up before kickoff and bank points for your team.</div>'
        : '<div><div class="tv-k">Week ' + D.week_no + ' of ' + D.weeks.length + '</div><div class="tv-sub" style="margin-top:12px">' + esc(wk.focus || '') + '</div></div>') +
      '</div>';
  }

  function scrTeams() {
    var pre = D.phase === 'pre', f = pre ? 'members' : 'points';
    var list = D.teams.slice().sort(function (a, b) { return b[f] - a[f] || a.id - b.id; });
    var max = Math.max.apply(null, list.map(function (t) { return t[f]; }).concat([1]));
    return '<div class="tv-right' + (list.length > 5 ? ' dense' : '') + '"><div class="tv-k">' + (pre ? 'Sign-ups by team' : 'Team leaderboard') + '</div>' + list.map(function (t, i) {
      return '<div><div class="tv-row' + (i === 0 && t[f] > 0 ? ' first' : '') + '"><span class="tv-pos">' + (i + 1) + '</span>' + av(t.captain_name, t.captain_photo) +
        '<span class="tv-name">' + esc(t.name) + '</span><span class="tv-pts">' + t[f] + '</span></div>' +
        '<div class="tv-bar"><i style="width:' + Math.round(t[f] / max * 100) + '%"></i></div></div>';
    }).join('') + '</div>';
  }
  function scrPeople() {
    return '<div class="tv-right"><div class="tv-k">Individual leaderboard</div><div class="tv-people">' + D.people.slice(0, 10).map(function (p, i) {
      return '<div class="tv-row' + (i === 0 ? ' first' : '') + '"><span class="tv-pos">' + (i + 1) + '</span>' + av(p.name, p.photo, 'sm') +
        '<span class="tv-name">' + esc(p.name) + '<small>' + esc(team(p.team_id).name) + '</small></span><span class="tv-pts">' + p.points + '</span></div>';
    }).join('') + '</div></div>';
  }
  function scrHighlight() {
    var h = D.highlights[tick % D.highlights.length];
    return '<div class="tv-right"><div class="tv-k">Meet the member</div><div class="tv-hi">' + av(h.name, h.photo) +
      '<div><div class="tv-k y">' + esc(team(h.team_id).name) + '</div><div class="tv-title" style="font-size:84px;margin:14px 0 26px">' + esc(h.name) + '</div>' +
      '<div class="tv-k">Why I train</div><div class="tv-quote" style="margin-top:12px">' + esc(h.why) + '</div></div></div></div>';
  }
  function scrMvp() {
    var top = D.people.slice().sort(function (a, b) { return b.week_points - a.week_points; })[0];
    return '<div class="tv-right"><div class="tv-k">Leading this week</div><div class="tv-hi">' + av(top.name, top.photo) +
      '<div><div class="tv-k y">' + esc(team(top.team_id).name) + '</div><div class="tv-title" style="font-size:96px;margin:14px 0 26px">' + esc(top.name) + '</div>' +
      '<div class="tv-quote">' + top.week_points + ' points this week</div></div></div></div>';
  }
  function scrPhotos() {
    var ph = D.photos.filter(function (p) { return urls[p.path]; }).slice(0, 8);
    return '<div class="tv-right"><div class="tv-k">Out there getting it done</div><div class="tv-photos">' + ph.map(function (p) {
      return '<figure><img src="' + esc(urls[p.path]) + '" alt=""><figcaption>' + esc(p.name) + '</figcaption></figure>';
    }).join('') + '</div></div>';
  }

  function screens() {
    var s = [scrTeams];
    if (D.phase !== 'pre' && D.people.length >= 3 && D.people[0].points > 0) s.push(scrPeople);
    if (D.highlights.length) s.push(scrHighlight);
    if (D.phase !== 'pre' && D.people.some(function (p) { return p.week_points > 0; })) s.push(scrMvp);
    if (D.photos.filter(function (p) { return urls[p.path]; }).length >= 4) s.push(scrPhotos);
    return s;
  }
  function draw() {
    if (!D || !D.challenge) { $stage.innerHTML = '<div class="ch-load">Rally Point</div>'; return; }
    var s = screens(), fn = s[idx % s.length];
    var t = D.ticker.length ? D.ticker[tick % D.ticker.length] : null;
    $stage.innerHTML = '<div class="tv-grid tv-screen">' + left() + fn() + '</div>' +
      '<div class="tv-foot"><span>Sign up at blackironathletics.com/rallypoint</span>' +
      '<span class="tv-tick">' + (t ? esc(t.name) + ' · ' + esc(t.label) + ' · +' + t.points + ' for ' + esc(team(t.team_id).name) : 'Prizes along the way') + '</span></div>';
  }
  function refresh() {
    return B.rpc('tv_snapshot').then(function (d) {
      D = d;
      (d.photos || []).forEach(function (p) {
        if (!urls[p.path]) B.signedUrl(p.path).then(function (u) { if (u) urls[p.path] = u; });
      });
      draw();
    }).catch(function () { if (!D) $stage.innerHTML = '<div class="ch-load">Rally Point</div>'; });
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
  setInterval(function () { idx++; tick++; draw(); }, ROTATE_MS);
  // Photo links expire after an hour, so fetch fresh ones before they do.
  setInterval(function () { urls = {}; refresh(); }, 45 * 60000);
})();
