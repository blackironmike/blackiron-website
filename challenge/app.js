/* Member app at /challenge. One page, rendered from the bootstrap() call. */
(function () {
  'use strict';
  var B = window.BIA, CFG = B.CFG, sb = B.sb, esc = B.esc, avatar = B.avatar;
  var $app = document.getElementById('app'), $sheet = document.getElementById('sheet');
  var S = { session: null, d: null, board: null, tab: 'missions', boardMode: 'teams', otpEmail: null, log: null, signErr: null };

  var IC = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    missions: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 10l2 2 4-4M8 15h8"/></svg>',
    team: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5"/></svg>',
    board: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
    me: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    cam: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/></svg>'
  };

  // ---------- helpers ----------
  function me() { return S.d.me; }
  function myTeam() { var m = S.d.membership; return m ? S.d.teams.filter(function (t) { return t.id === m.team_id; })[0] : null; }
  function cat(key) { return S.d.categories.filter(function (c) { return c.key === key; })[0]; }
  function weekChip() {
    var n = S.d.weeks.length;
    return '<span class="ch-chip">Week ' + Math.max(1, S.d.week_no) + ' of ' + n + '</span>';
  }
  function top() {
    return '<header class="ch-top"><span class="ch-mark">Rally <span class="outline">Point</span></span>' + (S.d ? weekChip() : '') + '</header>';
  }
  function weeksStrip() {
    return '<div class="weeks" aria-label="Week ' + S.d.week_no + ' of ' + S.d.weeks.length + '">' + S.d.weeks.map(function (w) {
      return '<i class="' + (w.week_no === S.d.week_no ? 'now' : w.week_no < S.d.week_no ? 'past' : '') + '">' + w.week_no + '</i>';
    }).join('') + '</div>';
  }
  function setupDone() { var m = me(); return m.adult_confirmed && m.show_on_tv !== null; }
  function profileComplete() { var m = me(); return !!(m.photo_path && (m.why_i_train || '').trim()); }

  // ---------- sign in ----------
  function viewSignIn() {
    $app.innerHTML =
      '<main class="ch-main no-nav">' +
      '<header class="ch-hero"><span class="eyebrow eyebrow-y">Black Iron Athletics</span>' +
      '<h1 class="ch-h1">Rally <span class="outline">Point</span></h1>' +
      '<p class="ch-lead">Eight weeks. Five teams. Show up, bring your people, and carry your team through the holidays.</p></header>' +
      '<section class="card"><h2 class="ch-h2">Sign in</h2>' +
      (S.signErr ? '<p class="err" role="alert">' + esc(S.signErr) + '</p>' : '') +
      '<div id="gbtn" class="gbtn"></div><p id="gnote" class="note" hidden></p>' +
      '<div class="or"><span>or</span></div>' +
      '<form class="stack" data-form="email"><div class="field"><label for="em">Email</label>' +
      '<input id="em" type="email" autocomplete="email" inputmode="email" required placeholder="you@email.com"></div>' +
      '<button class="btn btn-ghost w100" type="submit">Email me a code</button></form>' +
      '<p class="fine">Use the email your membership is under if you can. It’s how we find you. Rally Point is for members 18 and older. ' +
      'By signing in you agree to our <a href="/terms">Terms</a> and <a href="/privacy-policy">Privacy Policy</a>.</p></section>' +
      '<p class="fine">Prizes along the way.</p></main>';
    initGoogle();
  }

  function viewOtp() {
    $app.innerHTML =
      '<main class="ch-main no-nav"><header class="ch-hero"><span class="eyebrow">Check your email</span>' +
      '<h1 class="ch-h1" style="font-size:2.6rem">Enter your <span class="outline">code</span></h1>' +
      '<p class="ch-lead">We sent a code to ' + esc(S.otpEmail) + '. It can take a minute. Check spam if it’s not there.</p></header>' +
      '<section class="card">' + (S.signErr ? '<p class="err" role="alert">' + esc(S.signErr) + '</p>' : '') +
      '<form class="stack" data-form="otp"><div class="field"><label for="code">Code</label>' +
      '<input id="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" maxlength="8" required placeholder="123456"></div>' +
      '<button class="btn btn-y w100" type="submit">Sign in</button></form>' +
      '<button class="linkbtn" data-act="otp-back">Use a different email</button></section></main>';
    var c = document.getElementById('code'); if (c) c.focus();
  }

  function sha256hex(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function initGoogle() {
    var note = document.getElementById('gnote'), slot = document.getElementById('gbtn');
    function say(t) { slot.hidden = true; note.hidden = false; note.textContent = t; }
    if (B.inAppBrowser()) return say('Google sign-in doesn’t work inside Instagram or Facebook. Use the email code below, or open this page in Safari or Chrome.');
    if (CFG.googleHosts.indexOf(location.hostname) < 0) return say('Google sign-in only runs on blackironathletics.com. On this preview link, use the email code.');
    var raw = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())) + Date.now();
    Promise.all([loadScript('https://accounts.google.com/gsi/client'), sha256hex(raw)]).then(function (r) {
      google.accounts.id.initialize({
        client_id: CFG.googleClientId, nonce: r[1], use_fedcm_for_prompt: true,
        callback: function (resp) {
          sb.auth.signInWithIdToken({ provider: 'google', token: resp.credential, nonce: raw }).then(function (out) {
            if (out.error) { S.signErr = B.errMsg(out.error); viewSignIn(); }
          });
        }
      });
      if (!document.getElementById('gbtn')) return;
      google.accounts.id.renderButton(slot, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with', width: Math.min(360, slot.offsetWidth || 320) });
    }).catch(function () { say('Google sign-in didn’t load. Use the email code below.'); });
  }

  // ---------- profile setup ----------
  function profileForm(first) {
    var m = me();
    return '<form class="stack" data-form="profile" novalidate>' +
      '<div class="photo-pick">' + avatar(m.display_name, m.photo_path, 'av-lg av-color') +
      '<label class="btn btn-ghost btn-sm" for="pf">' + (m.photo_path ? 'Change photo' : 'Add your photo') +
      '<input id="pf" type="file" accept="image/*"></label></div>' +
      '<p class="fine" id="pfn">A clear photo of your face. Your team sees it.</p>' +
      '<div class="field"><label for="dn">Name on the board</label><input id="dn" type="text" maxlength="40" required value="' + esc(m.display_name) + '"></div>' +
      '<div class="field"><label for="why">Why I train</label><textarea id="why" maxlength="140" placeholder="One line. Your own words.">' + esc(m.why_i_train || '') + '</textarea></div>' +
      '<div class="field"><label for="uc">Usual class time</label><select id="uc"><option value="">Pick one</option>' +
      CFG.classTimes.map(function (t) { return '<option' + (m.usual_class === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      '<fieldset class="field"><legend>Show my name and photo on the gym TV</legend><div class="choice">' +
      '<label><input type="radio" name="tv" value="yes"' + (m.show_on_tv === true ? ' checked' : '') + '><span>Yes</span></label>' +
      '<label><input type="radio" name="tv" value="no"' + (m.show_on_tv === false ? ' checked' : '') + '><span>No</span></label></div>' +
      '<p class="fine">The leaderboard runs on the screens at the gym. Say no and you still earn points for your team. You can change this anytime.</p></fieldset>' +
      (first ? '<label class="check"><input id="adult" type="checkbox"' + (m.adult_confirmed ? ' checked' : '') + '><span>I’m 18 or older.</span></label>' : '') +
      '<p class="err" id="perr" role="alert" hidden></p>' +
      '<button class="btn btn-y w100" type="submit">' + (first ? 'Find my team' : 'Save') + '</button></form>';
  }
  function viewSetup() {
    $app.innerHTML = top() + '<main class="ch-main no-nav"><header class="ch-hero"><span class="eyebrow">Step 1 of 1</span>' +
      '<h1 class="ch-h1" style="font-size:2.6rem">Set up your <span class="outline">profile</span></h1></header>' +
      '<section class="card">' + profileForm(true) + '</section>' +
      '<button class="linkbtn" data-act="signout">Sign out</button></main>';
  }
  function viewPending() {
    $app.innerHTML = top() + '<main class="ch-main no-nav"><header class="ch-hero"><span class="eyebrow">Almost there</span>' +
      '<h1 class="ch-h1" style="font-size:2.6rem">A coach will <span class="outline">confirm you</span></h1>' +
      '<p class="ch-lead">We couldn’t match ' + esc(me().email) + ' to a membership. That usually means your membership is under a different email. A coach will confirm you, or you can sign out and use that email.</p></header>' +
      '<button class="btn btn-ghost w100" data-act="reload">Check again</button>' +
      '<button class="linkbtn" data-act="signout">Sign out</button></main>';
  }
  function viewReveal() {
    var t = myTeam(), cap = S.d.membership.is_captain;
    $app.innerHTML = '<main class="reveal"><span class="eyebrow eyebrow-y">' + (cap ? 'Your team, Coach' : 'You’re on') + '</span>' +
      avatar(t.captain_name, t.captain_photo, 'av-xl') +
      '<h1>' + esc(t.name.split(' ')[0]) + ' <span class="outline">' + esc(t.name.split(' ').slice(1).join(' ')) + '</span></h1>' +
      '<p class="ch-lead">' + (cap
        ? 'You don’t earn points yourself. Your team’s total is your score. Approvals for your team come to you.'
        : 'Captained by ' + esc(t.captain_name) + '. When you travel, your team carries you. When they travel, you carry them.') + '</p>' +
      '<button class="btn btn-y w100" data-act="revealed">Let’s go</button></main>';
  }

  // ---------- home ----------
  function viewHome() {
    var body = S.tab === 'team' ? tabTeam() : S.tab === 'board' ? tabBoard() : S.tab === 'me' ? tabMe() : tabMissions();
    var canLog = S.tab === 'missions' && !S.d.membership.is_captain && S.d.phase !== 'done';
    $app.innerHTML = top() + '<main class="ch-main">' + body + '</main>' +
      (canLog ? '<div class="cta-bar"><button class="btn btn-y w100" data-act="log">Log points</button></div>' : '') +
      '<div class="tabs" role="navigation" aria-label="Rally Point">' +
      [['missions', 'Missions'], ['team', 'Team'], ['board', 'Board'], ['me', 'Me']].map(function (t) {
        return '<button data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + IC[t[0]] + t[1] + '</button>';
      }).join('') + '</div>';
  }

  function pointsStrip() {
    var r = B.rankFor(S.d.ranks, S.d.points);
    return '<section class="card"><div class="row"><div class="grow"><span class="kicker">Your rank</span><div class="mid">' + esc(r.cur.name) + '</div></div>' +
      '<div class="right"><span class="kicker">Points</span><div class="mid">' + S.d.points + '</div></div></div>' +
      '<p class="fine">' + (r.next ? (r.next.min - S.d.points) + ' to ' + esc(r.next.name) + '.' : 'Top rank. Hold it.') +
      (S.d.pending_points ? ' ' + S.d.pending_points + ' more waiting on a coach.' : '') + '</p></section>';
  }

  function tabMissions() {
    var d = S.d, t = myTeam(), cap = d.membership.is_captain, h = '';
    if (cap) {
      h += '<section class="card"><span class="kicker kicker-y">Captain</span><h2 class="ch-h2">' + esc(t.name) + '</h2>' +
        '<p class="fine">Coaches don’t earn points. Your team’s total is your score.</p>' +
        '<a class="btn btn-y w100" href="/challenge/coach">Open coach view</a></section>';
    }
    if (d.phase === 'pre') {
      var days = B.daysBetween(d.today, d.challenge.scoring_starts_on);
      h += '<section class="card"><span class="kicker">Scoring starts ' + esc(B.fmtDay(d.challenge.scoring_starts_on, { weekday: 'long', month: 'long', day: 'numeric' })) + '</span>' +
        '<div class="row"><div class="big">' + days + '</div><div class="item-s">' + (days === 1 ? 'day' : 'days') + ' to kickoff.<br>' + d.signups + ' signed up so far.</div></div>' +
        weeksStrip() + '</section>';
      if (!cap) {
        h += '<section class="card"><h2 class="ch-h2">Get ahead before kickoff</h2><div class="list">' +
          preItem(true, 'Rally Point Original', 'You signed up before kickoff. That’s 3 points and a badge you keep.', '+3') +
          preItem(profileComplete(), 'Finish your profile', 'Your photo and one line on why you train.', '+2', profileComplete() ? null : 'edit') +
          preItem(false, 'Bring a guest this week', 'Friends & Family Week. Guests train free with a waiver.', '+5', 'invite') +
          preItem(false, 'Make your post', 'Drop your photo in the Rally Point frame and share it.', '', 'frame') +
          '</div></section>';
      }
      h += '<section class="card"><h2 class="ch-h2">Sign-ups by team</h2>' + teamBars('members') +
        '<p class="fine">Every teammate who signs up before kickoff adds a point to your team.</p></section>';
    } else {
      if (!cap) h += pointsStrip();
      h += d.flash.map(function (f) {
        return '<section class="card card-y"><span class="kicker kicker-y">Flash mission · closes ' + esc(new Date(f.closes_at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })) + '</span>' +
          '<h2 class="ch-h2">' + esc(f.title) + '</h2>' + (f.detail ? '<p class="fine">' + esc(f.detail) + '</p>' : '') +
          (cap ? '' : f.done ? '<p class="fine">Logged.</p>' : '<button class="btn btn-ghost w100" data-act="log" data-cat="flash" data-mission="' + f.id + '">Log it for +' + f.points + '</button>') + '</section>';
      }).join('');
      if (d.phase === 'done') {
        h += '<section class="card"><h2 class="ch-h2">That’s a wrap</h2><p class="fine">Rally Point is finished. Check the board for the final standings.</p></section>';
      } else if (d.missions.length) {
        var done = d.missions.filter(function (m) { return m.done >= m.target; }).length;
        h += '<section class="card"><div class="row"><h2 class="ch-h2 grow">Week ' + d.week_no + ' missions</h2><span class="val">' + done + ' of ' + d.missions.length + '</span></div>' +
          '<div class="segs">' + d.missions.map(function (m) { return '<i class="' + (m.done >= m.target ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
          '<div class="list">' + d.missions.map(missionRow).join('') + '</div></section>';
        var cs = cat('clean_sweep');
        if (cs) h += '<section class="card"><span class="kicker">Clean sweep</span><p class="fine">Finish every mission this week for a ' + cs.points + ' point bonus.</p></section>';
      } else {
        h += '<section class="card"><h2 class="ch-h2">Week ' + d.week_no + '</h2><p class="fine">This week’s missions are on the way. You can still log points below.</p></section>';
      }
      h += '<section class="card">' + weeksStrip() + '<p class="fine">' + esc((d.weeks.filter(function (w) { return w.week_no === d.week_no; })[0] || {}).focus || '') + '</p></section>';
    }
    return h + '<p class="fine">Prizes along the way.</p>';
  }
  function preItem(done, title, sub, pts, act) {
    var inner = '<span class="box' + (done ? ' on' : '') + '">' + (done ? IC.check : '') + '</span><span class="grow"><span class="item-t">' + esc(title) + '</span><br><span class="item-s">' + esc(sub) + '</span></span><span class="val">' + pts + '</span>';
    return act ? '<button class="item" data-act="' + act + '">' + inner + '</button>' : '<div class="item">' + inner + '</div>';
  }
  function missionRow(m) {
    var done = m.done >= m.target, wait = !done && m.pending > 0, c = cat(m.category_key);
    var sub = done ? 'Done' : wait ? 'Coach reviewing' : (m.detail || (c && c.logged_by === 'auto' ? 'Counts on its own' : c && c.logged_by === 'coach' ? 'A coach logs this one' : 'Tap to log'));
    if (m.target > 1 && !done) sub = Math.min(m.done, m.target) + ' of ' + m.target + '. ' + sub;
    var inner = '<span class="box' + (done ? ' on' : wait ? ' wait' : '') + '">' + (done ? IC.check : wait ? IC.clock : '') + '</span>' +
      '<span class="grow"><span class="item-t">' + esc(m.title) + '</span><br><span class="item-s">' + esc(sub) + '</span></span><span class="val">+' + m.points + '</span>';
    var tappable = !done && !wait && c && c.logged_by === 'member' && !S.d.membership.is_captain;
    return tappable ? '<button class="item" data-act="log" data-cat="' + esc(m.category_key) + '">' + inner + '</button>' : '<div class="item">' + inner + '</div>';
  }
  function teamBars(field) {
    var teams = B.placed(S.d.teams), mine = S.d.membership.team_id;
    if (field === 'members') teams = S.d.teams.slice().sort(function (a, b) { return b.members - a.members; });
    var max = Math.max.apply(null, teams.map(function (t) { return t[field]; }).concat([1]));
    return '<div>' + teams.map(function (t, i) {
      return '<div class="teamrow"><div class="row">' + (field === 'points' ? '<span class="pos">' + (i + 1) + '</span>' : '') +
        avatar(t.captain_name, t.captain_photo) + '<span class="grow item-t">' + esc(t.name) + (t.id === mine ? ' <span class="kicker kicker-y" style="display:inline">You</span>' : '') + '</span>' +
        '<span class="val">' + t[field] + '</span></div><div class="bar' + (t.id === mine ? ' mine' : '') + '"><i style="width:' + Math.round(t[field] / max * 100) + '%"></i></div></div>';
    }).join('') + '</div>';
  }

  function needBoard() {
    if (S.board) return true;
    B.rpc('leaderboard').then(function (b) { S.board = b; S.d.teams = b.teams; render(); }).catch(function (e) { B.toast(B.errMsg(e)); });
    return false;
  }
  function personRow(p, i) {
    var mine = p.id === S.session.user.id;
    return '<div class="item' + (mine ? ' me' : '') + '"><span class="pos">' + (i + 1) + '</span>' + avatar(p.name, p.photo) +
      '<span class="grow"><span class="item-t">' + esc(p.name) + (mine ? ' (you)' : '') + '</span><br><span class="item-s">' + esc(B.rankFor(S.d.ranks, p.points).cur.name) + '</span></span>' +
      '<span class="val">' + p.points + '</span></div>';
  }
  function tabTeam() {
    var t = myTeam(), order = B.placed(S.d.teams), place = order.map(function (x) { return x.id; }).indexOf(t.id) + 1;
    var lead = order[0], gap = lead.id === t.id ? (order[1] ? t.points - order[1].points : 0) : lead.points - t.points;
    var h = '<section class="card"><div class="row">' + avatar(t.captain_name, t.captain_photo, 'av-lg') +
      '<div class="grow"><span class="kicker">Captain: ' + esc(t.captain_name) + '</span><h2 class="mid" style="font-size:1.9rem">' + esc(t.name) + '</h2>' +
      '<p class="item-s">' + B.ordinal(place) + ' place · ' + t.points + ' pts' + (S.d.phase === 'pre' ? '' : lead.id === t.id ? ' · ' + gap + ' ahead' : ' · ' + gap + ' back') + '</p></div></div></section>';
    if (!needBoard()) return h + '<p class="fine">Loading your team…</p>';
    var mates = S.board.people.filter(function (p) { return p.team_id === t.id; });
    h += '<section class="card"><div class="row"><h2 class="ch-h2 grow">Roster</h2><span class="val">' + mates.length + '</span></div>' +
      (mates.length ? '<div class="list">' + mates.map(personRow).join('') + '</div>' : '<p class="fine">Nobody yet. Send your teammates the link.</p>') + '</section>';
    return h;
  }
  function tabBoard() {
    var h = '<div class="seg" role="group" aria-label="Leaderboard">' +
      '<button data-board="teams" aria-pressed="' + (S.boardMode === 'teams') + '">Teams</button>' +
      '<button data-board="people" aria-pressed="' + (S.boardMode === 'people') + '">Individuals</button></div>';
    if (S.boardMode === 'teams') {
      return h + '<section class="card">' + teamBars(S.d.phase === 'pre' ? 'members' : 'points') +
        (S.d.phase === 'pre' ? '<p class="fine">Showing sign-ups until scoring starts.</p>' : '') + '</section>';
    }
    if (!needBoard()) return h + '<p class="fine">Loading the board…</p>';
    var ppl = S.board.people;
    return h + '<section class="card">' + (ppl.length ? '<div class="list">' + ppl.map(personRow).join('') + '</div>' : '<p class="fine">Nobody on the board yet.</p>') + '</section>';
  }
  function tabMe() {
    var m = me(), d = S.d, r = B.rankFor(d.ranks, d.points), cap = d.membership.is_captain;
    var original = d.entries.some(function (e) { return e.category_key === 'original'; });
    var h = '<section class="card"><div class="row">' + avatar(m.display_name, m.photo_path, 'av-lg av-color') +
      '<div class="grow"><h2 class="mid">' + esc(m.display_name) + '</h2><p class="item-s">' + esc(myTeam().name) + (cap ? ' · Captain' : ' · ' + esc(r.cur.name)) + '</p>' +
      (original ? '<span class="ch-chip" style="display:inline-block;margin-top:8px">Rally Point Original</span>' : '') + '</div></div>' +
      (m.why_i_train ? '<p class="fine">“' + esc(m.why_i_train) + '”</p>' : '') +
      '<button class="btn btn-ghost w100" data-act="edit">Edit profile</button></section>';
    h += '<section class="card"><div class="list">' +
      (cap || m.role !== 'member' ? '<a class="item" href="/challenge/coach"><span class="grow item-t">Coach view</span></a>' : '') +
      '<button class="item" data-act="invite"><span class="grow"><span class="item-t">Invite a friend</span><br><span class="item-s">Your own link with the waiver.</span></span></button>' +
      '<button class="item" data-act="frame"><span class="grow"><span class="item-t">Make my post</span><br><span class="item-s">Your photo in the Rally Point frame.</span></span></button>' +
      '<button class="item" data-act="how"><span class="grow item-t">How it works</span></button></div></section>';
    if (!cap) {
      h += '<section class="card"><h2 class="ch-h2">Your log</h2>' + (d.entries.length ? '<div class="list">' + d.entries.map(function (e) {
        var c = cat(e.category_key) || { label: e.category_key };
        var st = e.status === 'approved' ? '' : e.status === 'pending' ? 'Coach reviewing' : 'Not counted';
        return '<div class="item"><span class="grow"><span class="item-t">' + esc(c.label) + '</span><br><span class="item-s">' + esc(B.fmtDay(e.activity_date, { month: 'short', day: 'numeric' })) +
          (st ? ' · ' + st : '') + (e.team_only ? ' · Team points' : '') + '</span></span><span class="val">' + (e.status === 'declined' ? '0' : '+' + e.points) + '</span></div>';
      }).join('') + '</div>' : '<p class="fine">Nothing logged yet.</p>') + '</section>';
    }
    return h + '<button class="linkbtn" data-act="signout">Sign out</button><button class="linkbtn" data-act="delete">Delete my account</button>';
  }

  // ---------- sheets ----------
  function openSheet(title, html) {
    $sheet.innerHTML = '<div class="sheet-in" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet-head"><h2 class="ch-h2">' + esc(title) + '</h2>' +
      '<button class="x" data-act="close" aria-label="Close">×</button></div>' + html + '</div>';
    $sheet.hidden = false;
    var f = $sheet.querySelector('button, input, select, textarea'); if (f) f.focus();
  }
  function closeSheet() { $sheet.hidden = true; $sheet.innerHTML = ''; S.log = null; }

  function sheetLog(preCat, mission) {
    var d = S.d;
    var cats = d.categories.filter(function (c) {
      return c.logged_by === 'member' && c.per !== 'mission' && (d.phase === 'live' || c.allowed_pre);
    });
    if (preCat === 'flash') cats = d.categories.filter(function (c) { return c.key === 'flash'; });
    if (!cats.length) return openSheet('Log points', '<p class="fine">Scoring starts ' + esc(B.fmtDay(d.challenge.scoring_starts_on)) + '. Until then, bring a guest.</p>');
    S.log = { cat: (cats.filter(function (c) { return c.key === preCat; })[0] || cats[0]).key, mission: mission || null, cats: cats, date: d.today, photo: null };
    drawLog();
  }
  function drawLog() {
    var L = S.log, c = cat(L.cat), d = S.d;
    var dbl = (d.weeks.filter(function (w) { return w.week_no === d.week_no; })[0] || {}).double_category === c.key;
    var fl = L.mission ? d.flash.filter(function (f) { return f.id === L.mission; })[0] : null;
    var pts = (fl ? fl.points : c.points) * (dbl ? 2 : 1);
    openSheet('Log points',
      '<p class="fine">Class check-ins count on their own from Wodify, usually by the next morning. Log everything else here.</p>' +
      (L.cats.length > 1 ? '<div class="pick">' + L.cats.map(function (x) {
        return '<button type="button" data-pick="' + esc(x.key) + '" aria-pressed="' + (x.key === L.cat) + '"><b>' + esc(x.label) + '</b><small>' + esc(x.hint || '') + '</small><span class="val">+' + x.points + '</span></button>';
      }).join('') + '</div>' : '<p class="item-t">' + esc(fl ? fl.title : c.label) + '</p>') +
      '<form class="stack" data-form="log">' +
      (c.per === 'day' ? '<fieldset class="field"><legend>When</legend><div class="choice">' +
        '<label><input type="radio" name="day" value="' + d.today + '" checked><span>Today</span></label>' +
        '<label><input type="radio" name="day" value="' + B.addDays(d.today, -1) + '"><span>Yesterday</span></label></div></fieldset>' : '') +
      (c.proof !== 'none' ? '<div class="field"><label>Photo' + (c.proof === 'link_or_photo' ? ' (or paste a link below)' : '') + '</label>' +
        '<div class="drop" id="drop">' + IC.cam + '<span>Tap to add a photo</span><input id="lf" type="file" accept="image/*" aria-label="Add a photo"></div></div>' : '') +
      (c.proof === 'link_or_photo' ? '<div class="field"><label for="ll">Link to your post</label><input id="ll" type="url" inputmode="url" placeholder="https://instagram.com/p/…"></div>' : '') +
      '<div class="field"><label for="lc">' + (c.key === 'guest' ? 'Who did you bring?' : 'Caption (optional)') + '</label><input id="lc" type="text" maxlength="200"' + (c.key === 'guest' ? ' required' : '') + '></div>' +
      '<p class="err" id="lerr" role="alert" hidden></p>' +
      '<button class="btn btn-y w100" type="submit">Submit for +' + pts + '</button>' +
      '<p class="fine">A coach on your team confirms it. Anything not reviewed in 48 hours counts automatically.' + (c.proof !== 'none' ? ' Photos only show on the feed or the gym TV after a coach approves them.' : '') + '</p></form>');
  }

  function inviteText(link) {
    var gw = CFG.guestWeek, on = S.d.today <= gw.to;
    return on
      ? 'Come train with me at Black Iron Athletics this week. It’s Friends & Family Week, so your classes are free. The schedule and the waiver are here: ' + link
      : 'Come train with me at Black Iron Athletics. The waiver and details are here: ' + link;
  }
  function sheetInvite() {
    openSheet('Invite a friend', '<p class="fine">Getting your link…</p>');
    B.rpc('my_invite').then(function (code) {
      S.d.invite_code = code;
      var link = location.origin + '/challenge/invite?c=' + code, text = inviteText(link);
      openSheet('Invite a friend',
        '<p class="fine">This link opens a page with your name on it, this week’s class times and the waiver. Send it to anyone you’d train with.</p>' +
        '<div class="field"><label for="it">Your message</label><textarea id="it" rows="4">' + esc(text) + '</textarea></div>' +
        (navigator.share ? '<button class="btn btn-y w100" data-act="share-invite">Share</button>' : '') +
        '<div class="choice"><a class="btn btn-ghost" id="sms" href="sms:?&body=' + encodeURIComponent(text) + '">Text</a>' +
        '<a class="btn btn-ghost" id="mail" href="mailto:?subject=' + encodeURIComponent('Come train with me at Black Iron') + '&body=' + encodeURIComponent(text) + '">Email</a></div>' +
        '<button class="btn btn-ghost w100" data-act="copy-invite">Copy message</button>' +
        '<a class="linkbtn" href="' + esc(link) + '" target="_blank" rel="noopener">Preview your page</a>' +
        '<p class="fine">When your guest shows up, log it under Log points or tell a coach. Each guest is ' + ((cat('guest') || {}).points || 5) + ' points.</p>');
    }).catch(function (e) { openSheet('Invite a friend', '<p class="err">' + esc(B.errMsg(e)) + '</p>'); });
  }

  function sheetHow() {
    var rows = S.d.categories.filter(function (c) { return !c.team_only; }).map(function (c) {
      return '<div class="item"><span class="grow"><span class="item-t">' + esc(c.label) + '</span>' + (c.hint ? '<br><span class="item-s">' + esc(c.hint) + '</span>' : '') + '</span><span class="val">+' + c.points + '</span></div>';
    }).join('');
    openSheet('How it works',
      '<p class="fine">' + (['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][S.d.teams.length] || S.d.teams.length) + ' teams, one per coach. Every point you earn counts for you and for your team. Scoring runs ' + esc(B.fmtDay(S.d.challenge.scoring_starts_on)) + ' through ' + esc(B.fmtDay(S.d.challenge.ends_on)) + '.</p>' +
      '<div class="list">' + rows + '</div>' +
      '<p class="fine">Class check-ins come from Wodify and post by the next morning. Sign in to class like you always do.</p>' +
      '<p class="fine">Traveling or stuck at home? Anything active counts once a day: a run, a walk, a hotel gym. Add a photo.</p>' +
      '<p class="fine">A coach on your team confirms what you log. Anything not reviewed in 48 hours counts automatically.</p>' +
      '<p class="fine">Your rank climbs with your points: ' + S.d.ranks.map(function (r) { return esc(r.name) + ' ' + r.min; }).join(', ') + '.</p>' +
      '<p class="fine">Prizes along the way.</p>');
  }

  // ---------- frame tool ----------
  // The frame is Black Iron first: WE ARE BLACK IRON stacked over a dark fade. It is about belonging to the gym. No challenge or team name on it.
  var FR = { img: null, fmt: 'story' };
  var FRAME_HANDLE = '@BLACKIRON_ATHLETICS';
  function sheetFrame() {
    FR.img = null;
    openSheet('Make my post',
      '<div class="seg" role="group" aria-label="Size"><button data-fmt="story" aria-pressed="true">Story</button><button data-fmt="post" aria-pressed="false">Post</button></div>' +
      '<canvas id="fc" class="frame-prev" aria-label="Preview of your framed photo"></canvas>' +
      '<label class="btn btn-ghost w100" for="ff">Choose a photo<input id="ff" type="file" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0"></label>' +
      '<button class="btn btn-y w100" data-act="frame-save">Save image</button>' +
      '<button class="linkbtn" data-act="frame-blank">Download the blank frame</button>' +
      '<p class="fine">Post it and tag @blackiron_athletics. Stories keep the frame clear of Instagram’s own buttons.</p>');
    document.fonts.load('900 100px Montserrat').then(function () { return document.fonts.load('700 30px Montserrat'); }).then(drawFrame, drawFrame);
  }
  // Text drawn one letter at a time with a fixed gap. Works in every browser.
  function tracked(c, s, x, y, gap) {
    c.textAlign = 'left';
    for (var i = 0, cx = x; i < s.length; i++) { c.fillText(s[i], cx, y); cx += c.measureText(s[i]).width + gap; }
    return cx - gap - x;
  }
  function trackedWidth(c, s, gap) {
    for (var i = 0, w = 0; i < s.length; i++) w += c.measureText(s[i]).width + (i < s.length - 1 ? gap : 0);
    return w;
  }
  // Outline type the brand way: white rim, opaque black interior. Never a transparent fill.
  function outlineText(c, s, x, y, fs) {
    c.textAlign = 'left'; c.lineJoin = 'round'; c.lineWidth = Math.max(5, fs * 0.068); c.strokeStyle = '#fff'; c.strokeText(s, x, y);
    c.fillStyle = '#000'; c.fillText(s, x, y);
  }
  function drawFrame(blank) {
    var cv = document.getElementById('fc'); if (!cv) return null;
    blank = blank === true;
    var story = FR.fmt === 'story', W = 1080, H = story ? 1920 : 1350, c = cv.getContext('2d');
    // Stories keep clear of Instagram's own header and reply bar.
    var safeT = story ? 250 : 0, safeB = story ? 270 : 0, x = 72;
    cv.width = W; cv.height = H;
    c.clearRect(0, 0, W, H); c.textBaseline = 'alphabetic';
    if (!blank) {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      if (FR.img) {
        var s = Math.max(W / FR.img.width, H / FR.img.height), w = FR.img.width * s, h = FR.img.height * s;
        c.drawImage(FR.img, (W - w) / 2, (H - h) / 2, w, h);
      } else {
        c.fillStyle = '#101010'; c.fillRect(0, 0, W, H);
        c.fillStyle = '#C7C7C7'; c.font = '700 34px Montserrat, Arial'; c.textAlign = 'center';
        c.fillText('YOUR PHOTO HERE', W / 2, H * 0.3);
      }
    }
    // Dark fade so the name reads on any photo.
    var fadeH = story ? 1000 : 880, g = c.createLinearGradient(0, H - safeB - fadeH, 0, H - safeB);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,.92)');
    c.fillStyle = g; c.fillRect(0, H - safeB - fadeH, W, fadeH);
    if (safeB) { c.fillStyle = 'rgba(0,0,0,.92)'; c.fillRect(0, H - safeB, W, safeB); }

    // The statement, bottom left: WE ARE (outline), BLACK, IRON, then ATHLETICS in Forge and the handle.
    var fs = story ? 168 : 144, k = fs / 176, pitch = Math.round(148 * k), big = '900 ' + fs + 'px Montserrat, Arial';
    var yb = H - safeB - 78, ya = yb - 62, y3 = ya - Math.round(78 * k), y2 = y3 - pitch, y1 = y2 - pitch;
    c.fillStyle = '#C7C7C7'; c.font = '700 24px Montserrat, Arial'; tracked(c, FRAME_HANDLE, x + 4, yb, 4);
    c.font = big; var wB = c.measureText('BLACK').width;
    c.fillStyle = '#FFD202'; c.font = '700 44px Montserrat, Arial';
    var letters = 'ATHLETICS', lw = trackedWidth(c, letters, 0);
    tracked(c, letters, x + 6, ya, (wB - 12 - lw) / (letters.length - 1));
    c.font = big; c.fillStyle = '#fff'; c.textAlign = 'left';
    c.fillText('IRON', x, y3); c.fillText('BLACK', x, y2);
    outlineText(c, 'WE ARE', x, y1, fs);
    return cv;
  }
  function saveCanvas(cv, name, type) {
    cv.toBlob(function (blob) {
      var file = new File([blob], name, { type: type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(function () {});
      } else {
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }
    }, type, 0.92);
  }

  // ---------- routing ----------
  function render() {
    if (!S.session) return S.otpEmail ? viewOtp() : viewSignIn();
    if (!S.d) { $app.innerHTML = '<div class="ch-load">Loading…</div>'; return; }
    if (!setupDone()) return viewSetup();
    if (!me().verified) return viewPending();
    if (!S.d.membership) { $app.innerHTML = '<div class="ch-load">Finding your team…</div>'; return; }
    if (!S.d.membership.revealed) return viewReveal();
    viewHome();
  }
  var loading = false;
  function load() {
    if (loading) return Promise.resolve();
    loading = true;
    return B.rpc('bootstrap').then(function (d) {
      S.d = d; S.board = null;
      if (setupDone() && d.me.verified && !d.membership) {
        return B.rpc('join_challenge').then(function () { return B.rpc('bootstrap'); }).then(function (d2) { S.d = d2; });
      }
    }).then(function () { loading = false; render(); }, function (e) {
      loading = false;
      $app.innerHTML = '<main class="ch-main no-nav"><p class="err" role="alert">' + esc(B.errMsg(e)) + '</p><button class="btn btn-ghost w100" data-act="reload">Try again</button><button class="linkbtn" data-act="signout">Sign out</button></main>';
    });
  }

  // ---------- events ----------
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act],[data-tab],[data-board],[data-pick],[data-fmt]');
    if (!el) { if (ev.target === $sheet) closeSheet(); return; }
    if (el.dataset.tab) { S.tab = el.dataset.tab; render(); window.scrollTo(0, 0); return; }
    if (el.dataset.board) { S.boardMode = el.dataset.board; render(); return; }
    if (el.dataset.pick) { S.log.cat = el.dataset.pick; S.log.photo = null; drawLog(); return; }
    if (el.dataset.fmt) {
      FR.fmt = el.dataset.fmt;
      $sheet.querySelectorAll('[data-fmt]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === el)); });
      drawFrame(); return;
    }
    var act = el.dataset.act;
    if (act === 'close') return closeSheet();
    if (act === 'signout') return sb.auth.signOut();
    if (act === 'reload') return load();
    if (act === 'otp-back') { S.otpEmail = null; S.signErr = null; return render(); }
    if (act === 'revealed') { S.d.membership.revealed = true; render(); return B.rpc('mark_revealed').catch(function () {}); }
    if (act === 'log') return sheetLog(el.dataset.cat, el.dataset.mission ? +el.dataset.mission : null);
    if (act === 'invite') return sheetInvite();
    if (act === 'how') return sheetHow();
    if (act === 'frame') return sheetFrame();
    if (act === 'edit') return openSheet('Edit profile', profileForm(false));
    if (act === 'share-invite') return navigator.share({ text: document.getElementById('it').value }).catch(function () {});
    if (act === 'copy-invite') return navigator.clipboard.writeText(document.getElementById('it').value).then(function () { B.toast('Copied.'); }, function () { B.toast('Couldn’t copy. Press and hold the message instead.'); });
    if (act === 'frame-save') { if (!FR.img) return B.toast('Choose a photo first.'); return saveCanvas(drawFrame(), 'black-iron-' + FR.fmt + '.jpg', 'image/jpeg'); }
    if (act === 'frame-blank') { var cv = drawFrame(true); saveCanvas(cv, 'black-iron-frame-' + FR.fmt + '.png', 'image/png'); return drawFrame(); }
    if (act === 'delete') return openSheet('Delete my account', '<p class="fine">This removes your profile, your photo and your points from Rally Point. It can’t be undone. Your gym membership isn’t affected.</p><button class="btn btn-ghost w100" data-act="delete-yes">Delete everything</button><button class="btn btn-y w100" data-act="close">Keep my account</button>');
    if (act === 'delete-yes') return deleteAccount();
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'it') {
      var s = document.getElementById('sms'), m = document.getElementById('mail');
      if (s) s.href = 'sms:?&body=' + encodeURIComponent(t.value);
      if (m) m.href = 'mailto:?subject=' + encodeURIComponent('Come train with me at Black Iron') + '&body=' + encodeURIComponent(t.value);
    }
  });

  document.addEventListener('change', function (ev) {
    var t = ev.target, f = t.files && t.files[0];
    if (!f) return;
    if (t.id === 'pf') {
      S.pendingAvatar = f;
      var n = document.getElementById('pfn'); if (n) n.textContent = 'Photo ready: ' + f.name + '. It uploads when you save.';
    } else if (t.id === 'lf') {
      S.log.photo = f;
      var d = document.getElementById('drop'), url = URL.createObjectURL(f);
      d.querySelector('span').textContent = 'Photo added. Tap to change.';
      var old = d.querySelector('img'); if (old) old.remove();
      var img = new Image(); img.src = url; img.alt = ''; d.insertBefore(img, d.firstChild);
    } else if (t.id === 'ff') {
      B.loadBitmap(f).then(function (img) { FR.img = img; drawFrame(); }).catch(function (e) { B.toast(B.errMsg(e)); });
    }
  });

  document.addEventListener('submit', function (ev) {
    var form = ev.target, kind = form.dataset.form;
    if (!kind) return;
    ev.preventDefault();
    var btn = form.querySelector('button[type=submit]');
    function busy(on, label) { if (btn) { btn.disabled = on; if (label) btn.textContent = label; } }

    if (kind === 'email') {
      var email = document.getElementById('em').value.trim().toLowerCase();
      busy(true, 'Sending…');
      sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + '/challenge' } }).then(function (r) {
        if (r.error) { S.signErr = B.errMsg(r.error); return render(); }
        S.otpEmail = email; S.signErr = null; render();
      });
    } else if (kind === 'otp') {
      busy(true, 'Checking…');
      sb.auth.verifyOtp({ email: S.otpEmail, token: document.getElementById('code').value.trim(), type: 'email' }).then(function (r) {
        if (r.error) { S.signErr = 'That code didn’t work. Check it, or go back and send a new one.'; render(); }
        else { S.otpEmail = null; S.signErr = null; }
      });
    } else if (kind === 'profile') {
      var err = document.getElementById('perr'), tv = form.querySelector('input[name=tv]:checked'), adult = document.getElementById('adult');
      var name = document.getElementById('dn').value.trim();
      function fail(m) { err.textContent = m; err.hidden = false; busy(false, adult ? 'Find my team' : 'Save'); }
      if (!name) return fail('Add the name you want on the board.');
      if (!tv) return fail('Choose yes or no for the gym TV.');
      if (adult && !adult.checked) return fail('Rally Point is for members 18 and older.');
      busy(true, 'Saving…');
      var up = S.pendingAvatar
        ? B.resizeImage(S.pendingAvatar, { max: 640, square: true }).then(function (b) { return B.upload('avatars', S.session.user.id, b); })
        : Promise.resolve(null);
      up.then(function (path) {
        var patch = { display_name: name, why_i_train: document.getElementById('why').value.trim() || null, usual_class: document.getElementById('uc').value || null, show_on_tv: tv.value === 'yes' };
        if (adult) patch.adult_confirmed = true;
        if (path) patch.photo_path = path;
        return sb.from('profiles').update(patch).eq('id', S.session.user.id).then(function (r) { if (r.error) throw r.error; });
      }).then(function () { S.pendingAvatar = null; closeSheet(); return load(); }).catch(function (e) { fail(B.errMsg(e)); });
    } else if (kind === 'log') {
      var L = S.log, c = cat(L.cat), lerr = document.getElementById('lerr');
      var link = (document.getElementById('ll') || {}).value || null, day = form.querySelector('input[name=day]:checked');
      function lfail(m) { lerr.textContent = m; lerr.hidden = false; busy(false, 'Submit'); }
      if (c.proof === 'photo' && !L.photo) return lfail('Add a photo.');
      if (c.proof === 'link_or_photo' && !L.photo && !link) return lfail('Add a photo or paste the link to your post.');
      busy(true, 'Sending…');
      var upl = L.photo ? B.resizeImage(L.photo, { max: 1600 }).then(function (b) { return B.upload('proof', S.session.user.id, b); }) : Promise.resolve(null);
      upl.then(function (path) {
        return B.rpc('submit_entry', { p_category: L.cat, p_date: day ? day.value : S.d.today, p_photo: path, p_link: link ? link.trim() : null, p_caption: document.getElementById('lc').value, p_mission: L.mission });
      }).then(function (r) { closeSheet(); B.toast('Logged. +' + r.points + ' once a coach confirms.'); return load(); }).catch(function (e) { lfail(B.errMsg(e)); });
    }
  });

  function deleteAccount() {
    var uid = S.session.user.id;
    function wipe(bucket) {
      return sb.storage.from(bucket).list(uid, { limit: 1000 }).then(function (r) {
        var names = (r.data || []).map(function (o) { return uid + '/' + o.name; });
        return names.length ? sb.storage.from(bucket).remove(names) : null;
      }).catch(function () {});
    }
    Promise.all([wipe('avatars'), wipe('proof')]).then(function () { return B.rpc('delete_my_account'); })
      .then(function () { closeSheet(); return sb.auth.signOut(); })
      .catch(function (e) { B.toast(B.errMsg(e)); });
  }

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$sheet.hidden) closeSheet(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.session && S.d && $sheet.hidden) load(); });

  sb.auth.onAuthStateChange(function (event, session) {
    var had = S.session && S.session.user.id, has = session && session.user.id;
    S.session = session;
    if (!session) { S.d = null; S.board = null; S.tab = 'missions'; closeSheet(); return render(); }
    if (had !== has || !S.d) { render(); setTimeout(load, 0); }
  });
})();
