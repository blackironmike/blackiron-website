/* Coach view at /challenge/coach. Approvals for your own team (admins see all),
   confirming sign-ups, logging guests and toys, flash missions, moving members. */
(function () {
  'use strict';
  var B = window.BIA, sb = B.sb, esc = B.esc, avatar = B.avatar;
  var $app = document.getElementById('app');
  var S = { session: null, d: null, urls: {} };

  function teamName(id) { var t = S.d.teams.filter(function (x) { return x.id === id; })[0]; return t ? t.name : ''; }
  function label(key) { return S.d.labels[key] || key; }

  function shell(inner) {
    return '<header class="ch-top"><span class="ch-mark">Rally <span class="outline">Point</span></span><span class="ch-chip">Coach view</span></header>' +
      '<main class="ch-main no-nav">' + inner + '</main>';
  }

  function draw() {
    if (!S.session) {
      $app.innerHTML = shell('<section class="card"><h2 class="ch-h2">Sign in first</h2><p class="fine">Sign in on the Rally Point page, then come back here.</p><a class="btn btn-y w100" href="/challenge">Go to sign in</a></section>');
      return;
    }
    if (!S.d) { $app.innerHTML = '<div class="ch-load">Loading…</div>'; return; }
    var d = S.d, admin = d.me.role === 'admin';

    var queue = d.queue.length ? d.queue.map(function (q) {
      var url = q.photo_path ? S.urls[q.photo_path] : null;
      return '<article class="card"><div class="row">' + avatar(q.name, q.avatar) +
        '<div class="grow"><span class="item-t">' + esc(q.name) + (admin ? ' · ' + esc(teamName(q.team_id)) : '') + '</span><br>' +
        '<span class="item-s">' + esc(label(q.category_key)) + ' · +' + q.points + ' · ' + esc(B.fmtDay(q.activity_date, { month: 'short', day: 'numeric' })) +
        (q.auto_approved ? ' · Points already counted. Photo needs a look.' : '') + '</span></div></div>' +
        (q.caption ? '<p class="fine">“' + esc(q.caption) + '”</p>' : '') +
        (q.photo_path ? (url ? '<img class="proof proof-lg" src="' + esc(url) + '" alt="Photo from ' + esc(q.name) + '">' : '<p class="fine">Loading photo…</p>') : '') +
        (q.link_url ? '<a class="linkbtn" href="' + esc(q.link_url) + '" target="_blank" rel="noopener noreferrer">Open their post</a>' : '') +
        '<div class="row"><button class="btn btn-y grow" data-act="review" data-id="' + q.id + '" data-ok="1">Approve</button>' +
        '<button class="btn btn-ghost" data-act="review" data-id="' + q.id + '" data-ok="0">Decline</button></div></article>';
    }).join('') : '<section class="card"><p class="fine">Nothing waiting. Anything left 48 hours counts on its own, but photos stay off the feed and TV until one of you approves them.</p></section>';

    var people = d.pending_people.length ? '<section class="card"><h2 class="ch-h2">People to confirm</h2>' +
      '<p class="fine">These people signed in with an email that isn’t on the member list. Match them to their membership so class check-ins count, then confirm.</p>' +
      d.pending_people.map(function (p) {
        return '<div class="stack" style="border-top:1px solid var(--steel-line);padding-top:14px"><div><span class="item-t">' + esc(p.name) + '</span><br><span class="item-s">' + esc(p.email) + '</span></div>' +
          '<div class="field"><label for="r-' + p.id + '">Their membership</label><select id="r-' + p.id + '"><option value="">Not on the list (confirm anyway)</option>' +
          d.roster_unlinked.map(function (r) { return '<option value="' + esc(r.email) + '">' + esc(r.name) + '</option>'; }).join('') + '</select></div>' +
          '<button class="btn btn-ghost w100" data-act="verify" data-id="' + p.id + '">Confirm ' + esc(p.name) + '</button></div>';
      }).join('') + '</section>' : '';

    var memberOpts = d.members.map(function (m) {
      return '<option value="' + m.id + '">' + esc(m.full || m.name) + ' · ' + esc(teamName(m.team_id)) + '</option>';
    }).join('');

    var log = '<section class="card"><h2 class="ch-h2">Log for a member</h2>' +
      '<form class="stack" data-form="log"><div class="field"><label for="lm">Member</label><select id="lm" required><option value="">Pick a member</option>' + memberOpts + '</select></div>' +
      '<fieldset class="field"><legend>What for</legend><div class="choice">' + d.categories.map(function (c, i) {
        return '<label><input type="radio" name="cat" value="' + esc(c.key) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(c.label) + ' +' + c.points + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<div class="field"><label for="ln">Note (optional)</label><input id="ln" type="text" maxlength="200" placeholder="Guest’s name, class time…"></div>' +
      '<button class="btn btn-y w100" type="submit">Add points</button></form></section>';

    var flash = '<section class="card"><h2 class="ch-h2">Flash mission</h2>' +
      '<p class="fine">A surprise bonus that shows as a banner in everyone’s app until it closes.</p>' +
      '<form class="stack" data-form="flash"><div class="field"><label for="ft">Mission</label><input id="ft" type="text" maxlength="80" required placeholder="Holiday socks to class"></div>' +
      '<div class="field"><label for="fd">Details (optional)</label><input id="fd" type="text" maxlength="200" placeholder="Post the photo, log it here."></div>' +
      '<div class="two"><div class="field"><label for="fh">Open for (hours)</label><input id="fh" type="number" min="1" max="168" value="48"></div>' +
      '<div class="field"><label for="fp">Points</label><input id="fp" type="number" min="1" max="10" value="3"></div></div>' +
      '<button class="btn btn-ghost w100" type="submit">Start flash mission</button></form>' +
      (d.flash.length ? '<div class="list">' + d.flash.slice(0, 5).map(function (f) {
        return '<div class="item"><span class="grow item-t">' + esc(f.title) + '</span><span class="item-s">' + (f.open ? 'Open' : 'Closed') + '</span></div>';
      }).join('') + '</div>' : '') + '</section>';

    var teams = '<section class="card"><h2 class="ch-h2">Teams</h2><p class="fine">' + d.signups + ' of ' + d.roster_count + ' members signed up.</p><div class="list">' +
      B.placed(d.teams).map(function (t) {
        return '<div class="item">' + avatar(t.captain_name, t.captain_photo) + '<span class="grow"><span class="item-t">' + esc(t.name) + '</span><br><span class="item-s">' + t.members + ' members</span></span><span class="val">' + t.points + '</span></div>';
      }).join('') + '</div>' +
      '<form class="stack" data-form="move"><div class="field"><label for="mm">Move a member</label><select id="mm" required><option value="">Pick a member</option>' + memberOpts + '</select></div>' +
      '<div class="field"><label for="mt">To team</label><select id="mt" required>' + d.teams.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join('') + '</select></div>' +
      '<button class="btn btn-ghost w100" type="submit">Move</button><p class="fine">Their points move with them. Use it to keep couples and training partners together.</p></form></section>';

    $app.innerHTML = shell(
      '<div class="row"><h1 class="ch-h1 grow" style="font-size:2.2rem">Approvals</h1><span class="ch-chip">' + d.queue.length + ' waiting</span></div>' +
      '<p class="fine">' + (admin ? 'You see every team.' : 'You see ' + esc(teamName(d.me.team_id) || 'your team') + '.') + ' Approve what’s real. A photo only reaches the feed and the gym TV after you approve it.</p>' +
      '<div class="grid2">' + queue + '</div>' + people + '<div class="grid2">' + log + flash + '</div>' + teams +
      '<a class="linkbtn" href="/challenge">Back to the app</a><a class="linkbtn" href="/challenge/tv" target="_blank" rel="noopener">Open the gym screen</a>');
  }

  function load() {
    return B.rpc('coach_home').then(function (d) {
      S.d = d; draw();
      d.queue.forEach(function (q) {
        if (q.photo_path && !S.urls[q.photo_path]) {
          B.signedUrl(q.photo_path).then(function (u) { if (u) { S.urls[q.photo_path] = u; draw(); } });
        }
      });
    }).catch(function (e) {
      $app.innerHTML = shell('<p class="err" role="alert">' + esc(B.errMsg(e)) + '</p><a class="btn btn-ghost w100" href="/challenge">Back to the app</a>');
    });
  }
  function run(p, okMsg) {
    return p.then(function () { if (okMsg) B.toast(okMsg); return load(); }).catch(function (e) { B.toast(B.errMsg(e)); });
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var act = el.dataset.act;
    if (act === 'review') { el.disabled = true; return run(B.rpc('review_entry', { p_id: +el.dataset.id, p_approve: el.dataset.ok === '1' }), el.dataset.ok === '1' ? 'Approved.' : 'Declined.'); }
    if (act === 'verify') {
      var sel = document.getElementById('r-' + el.dataset.id);
      el.disabled = true;
      return run(B.rpc('verify_person', { p_user: el.dataset.id, p_roster_email: sel && sel.value ? sel.value : null }), 'Confirmed. They’ll get a team next time they open the app.');
    }
  });
  document.addEventListener('submit', function (ev) {
    var kind = ev.target.dataset.form; if (!kind) return;
    ev.preventDefault();
    var btn = ev.target.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
    if (kind === 'log') {
      var c = ev.target.querySelector('input[name=cat]:checked');
      run(B.rpc('coach_log', { p_user: document.getElementById('lm').value, p_category: c.value, p_note: document.getElementById('ln').value || null }), 'Points added.');
    } else if (kind === 'flash') {
      run(B.rpc('create_flash', { p_title: document.getElementById('ft').value, p_detail: document.getElementById('fd').value || null, p_hours: +document.getElementById('fh').value, p_points: +document.getElementById('fp').value }), 'Flash mission is live.');
    } else if (kind === 'move') {
      run(B.rpc('move_member', { p_user: document.getElementById('mm').value, p_team: +document.getElementById('mt').value }), 'Moved.');
    }
  });

  sb.auth.onAuthStateChange(function (event, session) {
    var changed = (S.session && S.session.user.id) !== (session && session.user.id);
    S.session = session;
    if (!session) { S.d = null; return draw(); }
    if (changed || !S.d) { draw(); setTimeout(load, 0); }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.session && S.d) load(); });
})();
