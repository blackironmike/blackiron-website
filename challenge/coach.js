/* Coach view at /challenge/coach. Who on your team has gone quiet (with a Text
   button that opens your own Messages app), this week's birthday and
   anniversary shoutouts with a story to save for Instagram, what your team
   logged lately (admins see all) with a way to take one back, plus confirming
   sign-ups, logging points for a member, flash missions and moving members.
   Nothing here needs approving. */
(function () {
  'use strict';
  var B = window.BIA, sb = B.sb, esc = B.esc, avatar = B.avatar;
  var $app = document.getElementById('app');
  var S = { session: null, d: null, urls: {}, story: false, off: {} };
  var HANDLE = '@BLACKIRON_ATHLETICS';

  // Small per-device notes (who you already texted). Never required to work.
  function mem(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { /* private mode or storage full */ }
    return null;
  }
  function shortDay(s) { return B.fmtDay(s, { month: 'short', day: 'numeric' }); }
  function prettyPhone(p) { var m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p || ''); return m ? '(' + m[1] + ') ' + m[2] + '-' + m[3] : p; }

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
    var myTeam = d.teams.filter(function (t) { return t.id === d.me.team_id; })[0];
    var ck = d.check_in || { days: 10, team: [], loose: null }, texted = mem('bia-texted') || {};

    function ckRow(m) {
      var days = m.last ? B.daysBetween(m.last, d.today) : null;
      var note = 'Hey ' + (m.first || 'there') + ', it’s ' + (myTeam ? myTeam.captain_name : 'your coach') +
        ' at Black Iron. Haven’t seen you in a bit and wanted to check in. Everything good?';
      return '<div class="item"><span class="grow"><span class="item-t">' + esc(m.name) + '</span><br><span class="item-s">' +
        (m.last ? 'Last check-in ' + esc(shortDay(m.last)) + ' · ' + days + ' days' : 'No check-in in the last five months') +
        (m.phone ? ' · <a href="tel:' + esc(m.phone) + '">' + esc(prettyPhone(m.phone)) + '</a>' : '') +
        (texted[m.id] ? '<br>You texted ' + esc(shortDay(texted[m.id])) : '') + '</span></span>' +
        (m.phone
          ? '<a class="btn btn-ghost btn-sm" data-act="texted" data-id="' + esc(m.id) + '" href="sms:' + esc(m.phone) + '?&body=' + encodeURIComponent(note) + '">Text<span class="sr"> ' + esc(m.first || m.name) + '</span></a>'
          : '<span class="item-s right">Opted out<br>of texts</span>') + '</div>';
    }
    var check = '';
    if (myTeam || admin) {
      var loose = ck.loose || [];
      check = '<section class="card"><h2 class="ch-h2">Check on these people</h2>' +
        '<p class="fine">No check-in for ' + ck.days + ' days or more' + (ck.as_of ? ', through ' + esc(shortDay(ck.as_of)) : '') +
        '. Text opens your own Messages app with a note started. Change the words before you send it. Only you see your team’s numbers.</p>' +
        (myTeam ? (ck.team.length ? '<div class="list">' + ck.team.map(ckRow).join('') + '</div>'
          : '<p class="fine">Everyone on ' + esc(myTeam.name) + ' who has signed up has checked in lately.</p>') : '') +
        (admin && loose.length ? '<details class="more"><summary>Not on a team yet (' + loose.length + ')</summary>' +
          '<p class="fine">Members who haven’t signed up for Rally Point. Only you see this list.</p>' +
          '<div class="list">' + loose.map(ckRow).join('') + '</div></details>' : '') + '</section>';
    }

    var so = d.shoutouts || { birthdays: [], anniversaries: [] }, anyShout = so.birthdays.length + so.anniversaries.length > 0;
    function chips(list, kind) {
      return '<div class="chips">' + list.map(function (x, i) {
        var k = kind + i, wd = x.day ? B.fmtDay(x.day, { weekday: 'short' }) : '';
        return '<button class="chip" data-act="tog" data-k="' + k + '" aria-pressed="' + (S.off[k] ? 'false' : 'true') + '">' + esc(x.name) +
          (x.years ? ' · ' + x.years + (x.years === 1 ? ' year' : ' years') : '') + (wd ? ' · ' + esc(wd) : '') + '</button>';
      }).join('') + '</div>';
    }
    var shout = '<section class="card"><h2 class="ch-h2">This week’s shoutouts</h2>' +
      (anyShout
        ? '<p class="fine">' + esc(shortDay(so.from)) + ' to ' + esc(shortDay(so.to)) + '. First names only, no ages. These also rotate on the gym screen.</p>' +
          (so.birthdays.length ? '<span class="kicker">Birthdays</span>' + chips(so.birthdays, 'b') : '') +
          (so.anniversaries.length ? '<span class="kicker">Black Iron anniversaries</span>' + chips(so.anniversaries, 'a') : '') +
          (S.story
            ? '<canvas id="sc" class="frame-prev story-prev" aria-label="Preview of the shoutout story"></canvas>' +
              '<button class="btn btn-y w100" data-act="story-save">Save image</button>' +
              '<p class="fine">Tap a name above to leave it off. The story keeps clear of Instagram’s own buttons.</p>'
            : '<button class="btn btn-ghost w100" data-act="story">Make the Instagram story</button>')
        : '<p class="fine">No birthdays or gym anniversaries this week. When there are, they show here and on the gym screen, and you can save a story for Instagram.</p>') +
      '</section>';

    var queue = d.queue.length ? d.queue.map(function (q) {
      var url = q.photo_path ? S.urls[q.photo_path] : null;
      return '<article class="card"><div class="row">' + avatar(q.name, q.avatar) +
        '<div class="grow"><span class="item-t">' + esc(q.name) + (admin ? ' · ' + esc(teamName(q.team_id)) : '') + '</span><br>' +
        '<span class="item-s">' + esc(label(q.category_key)) + ' · +' + q.points + ' · ' + esc(B.fmtDay(q.activity_date, { month: 'short', day: 'numeric' })) +
        '</span></div></div>' +
        (q.caption ? '<p class="fine">“' + esc(q.caption) + '”</p>' : '') +
        (q.photo_path ? (url ? '<img class="proof proof-lg" src="' + esc(url) + '" alt="Photo from ' + esc(q.name) + '">' : '<p class="fine">Loading photo…</p>') : '') +
        (q.link_url ? '<a class="linkbtn" href="' + esc(q.link_url) + '" target="_blank" rel="noopener noreferrer">Open their post</a>' : '') +
        '<button class="btn btn-ghost w100" data-act="review" data-id="' + q.id + '" data-ok="0">Take it back</button></article>';
    }).join('') : '<section class="card"><p class="fine">Nothing logged in the last two weeks.</p></section>';

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
      '<h1 class="ch-h1" style="font-size:2.2rem">' + esc(myTeam ? myTeam.name : 'Coach view') + '</h1>' +
      '<div class="grid2">' + check + shout + '</div>' +
      '<div class="row" style="margin-top:8px"><h2 class="ch-h1 grow" style="font-size:1.7rem">Recent logs</h2><span class="ch-chip">' + d.queue.length + ' logged</span></div>' +
      '<p class="fine">' + (admin ? 'You see every team.' : 'You see ' + esc(teamName(d.me.team_id) || 'your team') + '.') + ' Everything members log counts right away, so there is nothing to approve. If one doesn’t check out, take it back here. Photos are only seen by coaches.</p>' +
      '<div class="grid2">' + queue + '</div>' + people + '<div class="grid2">' + log + flash + '</div>' + teams +
      '<a class="linkbtn" href="/challenge">Back to the app</a><a class="linkbtn" href="/challenge/tv" target="_blank" rel="noopener">Open the gym screen</a>');
    if (S.story) drawStory();
  }

  // ---------- shoutout story (1080 x 1920) ----------
  // Text drawn one letter at a time with a fixed gap. Works in every browser.
  function tracked(c, s, x, y, gap) {
    c.textAlign = 'left';
    for (var i = 0, cx = x; i < s.length; i++) { c.fillText(s[i], cx, y); cx += c.measureText(s[i]).width + gap; }
  }
  // Outline type the brand way: white rim, opaque black interior. Never a transparent fill.
  function outlineText(c, s, x, y, fs) {
    c.textAlign = 'left'; c.lineJoin = 'round'; c.lineWidth = Math.max(5, fs * 0.068); c.strokeStyle = '#fff'; c.strokeText(s, x, y);
    c.fillStyle = '#000'; c.fillText(s, x, y);
  }
  function storyRows() {
    var so = S.d.shoutouts || { birthdays: [], anniversaries: [] };
    function keep(list, kind) { return list.filter(function (x, i) { return !S.off[kind + i]; }); }
    return { b: keep(so.birthdays, 'b'), a: keep(so.anniversaries, 'a') };
  }
  var anvil = null;
  function drawStory() {
    var cv = document.getElementById('sc'); if (!cv) return null;
    var W = 1080, H = 1920, x = 72, safeT = 250, safeB = 270, c = cv.getContext('2d'), r = storyRows();
    cv.width = W; cv.height = H; c.textBaseline = 'alphabetic';
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);

    // Eyebrow, then the headline pair: solid line over outline line.
    c.fillStyle = '#FFD202'; c.font = '700 28px Montserrat, Arial'; tracked(c, 'BLACK IRON ATHLETICS', x + 2, safeT + 70, 8);
    var top = 'THIS WEEK’S', fs = 132;
    c.font = '900 ' + fs + 'px Montserrat, Arial';
    while (c.measureText(top).width > W - 2 * x && fs > 60) { fs -= 2; c.font = '900 ' + fs + 'px Montserrat, Arial'; }
    var y1 = safeT + 70 + Math.round(fs * 1.12), y2 = y1 + Math.round(fs * 0.98);
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(top, x, y1);
    outlineText(c, 'SHOUTOUTS', x, y2, fs);
    c.fillStyle = '#FFD202'; c.fillRect(x + 2, y2 + 44, 96, 8);

    // Names. The size steps down so a full week still fits above Instagram's reply bar.
    var groups = [];
    if (r.b.length) groups.push({ k: 'HAPPY BIRTHDAY', rows: r.b });
    if (r.a.length) groups.push({ k: 'BLACK IRON ANNIVERSARY', rows: r.a });
    var n = r.b.length + r.a.length, y = y2 + 44 + 8 + 96, room = H - safeB - 40 - y - groups.length * 128 + 104;
    var nf = Math.max(40, Math.min(92, Math.floor(room / (Math.max(n, 1) * 1.16))));
    groups.forEach(function (g) {
      c.fillStyle = '#C7C7C7'; c.font = '700 26px Montserrat, Arial'; tracked(c, g.k, x + 2, y, 6);
      y += 24;
      g.rows.forEach(function (p) {
        var name = String(p.name).toUpperCase(), tag = p.years ? p.years + (p.years === 1 ? ' YEAR' : ' YEARS') : '', f = nf;
        var tf = Math.round(nf * 0.36);
        function width() {
          c.font = '900 ' + f + 'px Montserrat, Arial'; var w = c.measureText(name).width;
          if (tag) { c.font = '700 ' + tf + 'px Montserrat, Arial'; w += 22 + c.measureText(tag).width; }
          return w;
        }
        while (width() > W - 2 * x && f > 30) f -= 2;
        y += Math.round(nf * 1.16);
        c.font = '900 ' + f + 'px Montserrat, Arial'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(name, x, y);
        if (tag) {
          var nw = c.measureText(name).width;
          c.font = '700 ' + tf + 'px Montserrat, Arial'; c.fillStyle = '#C7C7C7'; c.fillText(tag, x + nw + 22, y);
        }
      });
      y += 104;
    });

    // Brand stamp, bottom left: the anvil at 120px with 72px of padding, then the handle.
    if (anvil) { var ah = Math.round(120 * anvil.height / anvil.width); c.drawImage(anvil, 72, H - 72 - ah, 120, ah); }
    c.fillStyle = '#C7C7C7'; c.font = '700 24px Montserrat, Arial'; tracked(c, HANDLE, anvil ? 72 + 120 + 28 : x + 2, H - 72 - 28, 4);
    return cv;
  }
  function openStory() {
    S.story = true; draw();
    var go = function () { drawStory(); };
    if (!anvil) {
      var img = new Image();
      img.onload = function () { anvil = img; drawStory(); };
      img.src = '/images/logos/Anvil-WHITE.png';
    }
    if (document.fonts && document.fonts.load) {
      document.fonts.load('900 100px Montserrat').then(function () { return document.fonts.load('700 30px Montserrat'); }).then(go, go);
    }
  }
  function saveCanvas(cv, name) {
    cv.toBlob(function (blob) {
      var file = new File([blob], name, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(function () {});
      } else {
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }
    }, 'image/jpeg', 0.92);
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
    if (act === 'texted') {
      // Let the link open Messages, and remember it on this phone so nobody gets texted twice.
      var t = mem('bia-texted') || {}; t[el.dataset.id] = S.d.today; mem('bia-texted', t);
      return void setTimeout(draw, 1200);
    }
    if (act === 'story') return openStory();
    if (act === 'tog') { S.off[el.dataset.k] = !S.off[el.dataset.k]; return draw(); }
    if (act === 'story-save') {
      var rows = storyRows();
      if (!rows.b.length && !rows.a.length) return B.toast('Leave at least one name on.');
      return saveCanvas(drawStory(), 'black-iron-shoutouts-' + S.d.shoutouts.from + '.jpg');
    }
    if (act === 'review') { el.disabled = true; return run(B.rpc('review_entry', { p_id: +el.dataset.id, p_approve: el.dataset.ok === '1' }), el.dataset.ok === '1' ? 'Counted.' : 'Taken back.'); }
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
