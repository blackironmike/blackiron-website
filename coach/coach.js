/* ==========================================================================
   BLACK IRON COACH BOARD engine
   Reads window.COACH_PROGRAM (coach/program.js), works out the time in Frisco,
   and decides what the middle screen shows:

     before the first class   branded centerpiece, then "time until next class"
     during a class           the coach board (welcome, then the warm-up)
     between classes          "time until next class"
     after the last class     branded centerpiece

   URL options (all optional):
     ?date=2026-10-12    pretend it is this day
     ?time=09:29:50      pretend it is this time
     ?mode=board|countdown|centerpiece|opengym   force a screen (preview)
     ?class=9:30         with mode=board, which class
     ?section=2          with mode=board, open on this section (1-based)
     ?still=1            no animation (screenshots)

   Keys (a wireless keyboard or a presentation clicker works):
     Right / PageDown / N   next section      Left / PageUp / P   previous section
     Space / Enter / B / .  start or pause    R   reset the clock
     C   clock dashboard    A   auto clock     M   mute    F   full screen
     W   open gym: today's workout (between classes)     Esc   close

   Written in plain ES5 so it runs on older TV browsers too.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.COACH_PROGRAM || { days: {}, schedule: {} };
  var TZ = P.timezone || 'America/Chicago';
  var DAY = 86400000;
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WEEKDAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var CLASS_MIN = P.classMinutes || 60;
  var OPEN_GYM_MS = 60 * 60 * 1000;     // an open gym session closes itself after an hour
  var OPEN_GYM_HARD_MS = 30 * 60 * 1000; // ...or this much later if its clock is still running
  var OVERRUN_GRACE_MIN = 15;           // a running clock keeps the board up this long past class end
  var stage = document.getElementById('stage');

  /* ---------------- query string ---------------- */
  var QS = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
    if (!kv) return;
    var i = kv.indexOf('=');
    try { QS[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1)); } catch (e) {}
  });
  function q(k) { return Object.prototype.hasOwnProperty.call(QS, k) ? QS[k] : null; }
  var STILL = q('still') === '1';
  stage.className = 'v1' + (STILL ? ' still' : '');

  /* ---------------- text ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/\*([^*]+)\*/g, '<span class="f">$1</span>'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function $(id) { return document.getElementById(id); }

  /* ---------------- Frisco time (same approach as /tv) ---------------- */
  var fmt = null, fmtMode = 'central';
  try {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    fmtMode = typeof fmt.formatToParts === 'function' ? 'parts' : 'format';
  } catch (e) { fmt = null; }
  function nthSunday(y, mo, n) { var first = new Date(Date.UTC(y, mo, 1)).getUTCDay(); return 1 + ((7 - first) % 7) + (n - 1) * 7; }
  function centralParts(ms) {
    var y = new Date(ms).getUTCFullYear();
    var start = Date.UTC(y, 2, nthSunday(y, 2, 2), 8), end = Date.UTC(y, 10, nthSunday(y, 10, 1), 7);
    var t = new Date(ms + ((ms >= start && ms < end) ? -5 : -6) * 3600000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
  }
  function zoned(ms) {
    if (fmtMode === 'parts') {
      var o = {};
      fmt.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
      var h = +o.hour; if (h === 24) h = 0;
      return { y: +o.year, m: +o.month, d: +o.day, h: h, mi: +o.minute, s: +o.second };
    }
    if (fmtMode === 'format') {
      var m = /(\d+)\/(\d+)\/(\d+),?\s+(\d+):(\d+):(\d+)/.exec(fmt.format(new Date(ms)));
      if (m) { var hh = +m[4]; if (hh === 24) hh = 0; return { y: +m[3], m: +m[1], d: +m[2], h: hh, mi: +m[5], s: +m[6] }; }
    }
    return centralParts(ms);
  }
  function dayNum(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DAY); }
  function fromDayNum(n) { var t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() }; }
  function isoDay(n) { var t = fromDayNum(n); return t.y + '-' + pad(t.m) + '-' + pad(t.d); }
  function zonedToEpoch(y, m, d, h, mi) {
    var want = Date.UTC(y, m - 1, d, h || 0, mi || 0), guess = want;
    for (var i = 0; i < 3; i++) { var z = zoned(guess); guess += want - Date.UTC(z.y, z.m - 1, z.d, z.h, z.mi, z.s); }
    return guess;
  }
  var clockOffset = 0;
  (function () {
    try {
      var real = Date.now(), z = zoned(real), y = z.y, m = z.m, d = z.d, h = z.h, mi = z.mi, s = z.s, changed = false;
      if (/^\d{4}-\d{2}-\d{2}$/.test(q('date') || '')) { var a = q('date').split('-'); y = +a[0]; m = +a[1]; d = +a[2]; changed = true; }
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(q('time') || '')) { var b = q('time').split(':'); h = +b[0]; mi = +b[1]; s = +(b[2] || 0); changed = true; }
      if (changed) clockOffset = zonedToEpoch(y, m, d, h, mi) + s * 1000 - real;
      if (!isFinite(clockOffset)) clockOffset = 0;
    } catch (e) { clockOffset = 0; }
  })();
  function now() { return Date.now() + clockOffset; }
  function nowZ() { return zoned(now()); }
  function todayNum() { var z = nowZ(); return dayNum(z.y, z.m, z.d); }

  function hhmmToMin(s) { var a = String(s).split(':'); return +a[0] * 60 + +(a[1] || 0); }
  function minLabel(min) { var h = Math.floor(min / 60), mi = min % 60, ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + pad(mi) + ' ' + ap; }
  function minShort(min) { var h = Math.floor(min / 60), mi = min % 60; h = h % 12 || 12; return h + ':' + pad(mi); }
  function clockFace(z) { var h = z.h % 12 || 12; return { t: h + ':' + pad(z.mi), ap: z.h >= 12 ? 'PM' : 'AM' }; }
  function dateLine(n) { var t = fromDayNum(n); return WEEKDAY[t.wd] + ', ' + MON[t.m - 1] + ' ' + t.d; }

  /* ---------------- schedule ---------------- */
  function classesOn(n) {
    var list = (P.schedule && P.schedule[fromDayNum(n).wd]) || [];
    return list.map(hhmmToMin).sort(function (a, b) { return a - b; });
  }
  function programFor(n) { return (P.days || {})[isoDay(n)] || null; }

  /* ---------------- the class hour: programming plus transitions ----------------
     Every class is one hour. Whatever the programming doesn't use is split
     evenly into transition blocks between the pieces, plus a cool-down at the
     end, so Auto clock runs the whole class and lands on the hour. */
  function kindOf(s) {
    var n = (s.name || '').toLowerCase();
    if (/warm/.test(n)) return 'warm';
    if (/body ?build|accessor/.test(n)) return 'acc';
    if (/strength|weightlift|lift|olympic|squat|deadlift|press|bench/.test(n)) return 'lift';
    if (/condition|interval|engine|metcon|amrap|zone|cardio|finisher/.test(n)) return 'cond';
    return 'other';
  }
  function transitionTips(prev, next) {
    if (next.transition) return [].concat(next.transition);       // programming can write its own
    var from = kindOf(prev), to = kindOf(next);
    if (to === 'lift') return from === 'warm'
      ? ['Grab your bar and plates', 'Start loading for your first set', 'Coach briefs the lift']
      : ['Put the last setup away', 'Grab your bar and start loading', 'Coach briefs the lift'];
    if (to === 'cond') return from === 'lift' || from === 'acc'
      ? ['Strip your bar and put the plates away', 'Water and a bathroom break', 'Set up your station for conditioning']
      : ['Water and a bathroom break', 'Set up your station', 'Coach walks through the workout'];
    if (to === 'acc') return ['Put the heavy stuff away', 'Grab your dumbbells and find your space', 'Coach walks through the movements'];
    return ['Water break', 'Set up for what’s next', 'Coach briefs the next piece'];
  }
  var tlCache = {};
  function timelineFor(n) {
    var key = isoDay(n);
    if (tlCache[key]) return tlCache[key];
    var p = programFor(n); if (!p) return null;
    var main = p.sections, used = 0, out = [];
    main.forEach(function (s) { used += Math.round(s.min * 60); });
    var slack = CLASS_MIN * 60 - used, gaps = main.length - 1;
    var useT = P.transitions !== false && p.transitions !== false && slack >= 60;
    var each = useT ? Math.floor(slack / (gaps + 1) / 15) * 15 : 0;   // gaps plus the cool-down, in 15 s steps
    if (each < 30) each = 0;
    main.forEach(function (s, i) {
      var m = {}; for (var k in s) m[k] = s[k];
      m.kind = 'main'; m.n = i + 1; m.of = main.length;
      out.push(m);
      if (i < gaps && each) {
        var nx = main[i + 1];
        out.push({ kind: 'trans', name: 'Transition', min: each / 60, to: nx.name,
          clock: { type: 'down', min: each / 60, label: 'Transition' },
          blocks: [{ head: 'Up next: ' + nx.name, items: transitionTips(s, nx) }] });
      }
    });
    var cool = useT ? slack - each * gaps : 0;
    if (cool >= 60) out.push({ kind: 'cool', name: 'Cool down', min: cool / 60,
      clock: { type: 'down', min: cool / 60, label: 'Cool down' },
      blocks: [{ head: 'Nice work today', items: ['Walk it out and stretch', 'Put your equipment away', 'Log your scores'] }] });
    var t = 0; out.forEach(function (x) { x.at = t; t += Math.round(x.min * 60); });
    return (tlCache[key] = { week: p.week, sections: out, programmed: used });
  }
  function nextClassAfter(n, min) {
    for (var k = 0; k < 8; k++) {
      var list = classesOn(n + k);
      for (var i = 0; i < list.length; i++) if (k > 0 || list[i] > min) return { day: n + k, start: list[i], inDays: k };
    }
    return null;
  }
  // What the schedule says should be on screen right now.
  function scheduled() {
    var z = nowZ(), n = dayNum(z.y, z.m, z.d), min = z.h * 60 + z.mi, list = classesOn(n);
    for (var i = list.length - 1; i >= 0; i--) {
      if (min >= list[i] && min < list[i] + CLASS_MIN) return { mode: 'board', day: n, start: list[i] };
    }
    var next = nextClassAfter(n, min);
    var first = list.length ? list[0] : null, last = list.length ? list[list.length - 1] + CLASS_MIN : null;
    var morning = first !== null && min < first && min >= first - (P.morningCountdownMinutes || 60);
    var between = first !== null && min >= first && min < last;
    if ((morning || between) && next && next.inDays === 0) return { mode: 'countdown', next: next };
    return { mode: 'centerpiece', next: next };
  }
  function epochOf(day, min) { var t = fromDayNum(day); return zonedToEpoch(t.y, t.m, t.d, Math.floor(min / 60), min % 60); }

  /* ---------------- sound ---------------- */
  var AC = null, muted = false;
  function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function beep(long) {
    if (muted || STILL) return;
    var ac = audio(); if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime, d = long ? 0.7 : 0.16;
    o.type = 'square'; o.frequency.value = long ? 1250 : 880;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  }

  /* ---------------- the clock (a Rogue-style timer) ---------------- */
  var MODES = { down: 'Countdown', up: 'For time', emom: 'EMOM', amrap: 'AMRAP', tabata: 'Intervals' };
  function normSpec(c) {
    c = c || { type: 'up' };
    var s = { type: MODES[c.type] ? c.type : 'up' };
    if (c.label) s.label = c.label;
    if (s.type === 'down' || s.type === 'amrap') s.total = Math.round((c.min || 10) * 60);
    if (s.type === 'up') s.cap = c.cap ? Math.round(c.cap * 60) : 0;
    if (s.type === 'emom') { s.every = c.every || 60; s.rounds = c.rounds || 10; }
    if (s.type === 'tabata') { s.work = c.work || 20; s.rest = c.rest || 10; s.rounds = c.rounds || 8; }
    return s;
  }
  function specTotal(s) {
    if (s.type === 'down' || s.type === 'amrap') return s.total;
    if (s.type === 'up') return s.cap || 0;
    if (s.type === 'emom') return s.every * s.rounds;
    if (s.type === 'tabata') return s.rounds * (s.work + s.rest) - s.rest;
    return 0;
  }
  function fmtSecs(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }
  function specSummary(s) {
    if (s.type === 'down') return fmtSecs(s.total) + ' countdown';
    if (s.type === 'amrap') return 'AMRAP ' + fmtSecs(s.total);
    if (s.type === 'up') return s.cap ? 'For time, cap ' + fmtSecs(s.cap) : 'Count up';
    if (s.type === 'emom') return 'Every ' + fmtSecs(s.every) + ' × ' + s.rounds;
    if (s.type === 'tabata') return s.work + 's on / ' + s.rest + 's off × ' + s.rounds;
    return '';
  }

  var RATE = +(q('rate') || 1) || 1;   // QA only: run the clock faster
  var T = { spec: normSpec(), prep: 10, state: 'idle', runStart: 0, acc: 0, prepStart: 0, lastBeep: null, onDone: null };
  function tElapsed() { return T.state === 'run' ? T.acc + (now() - T.runStart) / 1000 * RATE : T.acc; }
  function tSet(spec) { T.spec = spec; tReset(); }
  function tReset() { T.state = 'idle'; T.acc = 0; T.lastBeep = null; drawClock(); }
  function tToggle(noPrep) {
    audio();
    if (T.state === 'run') { T.acc = tElapsed(); T.state = 'paused'; }
    else if (T.state === 'prep') { T.state = 'idle'; }
    else if (T.state === 'done') { tReset(); return tToggle(); }
    else if (T.state === 'paused') { T.runStart = now(); T.state = 'run'; }
    else if (T.prep > 0 && !noPrep) { T.state = 'prep'; T.prepStart = now(); }
    else { T.runStart = now(); T.state = 'run'; beep(true); }
    drawClock();
  }
  function tAdjust(deltaSec) {
    var s = T.spec;
    if (s.type === 'down' || s.type === 'amrap') s.total = Math.max(60, s.total + deltaSec);
    else if (s.type === 'up') s.cap = Math.max(0, (s.cap || 0) + deltaSec);
    else if (s.type === 'emom' || s.type === 'tabata') s.rounds = Math.max(1, s.rounds + (deltaSec > 0 ? 1 : -1));
    drawClock();
  }
  // What the clock face should read right now.
  function tRead() {
    var s = T.spec, e = tElapsed(), total = specTotal(s), r = { big: '', sub: '', phase: '', done: false };
    if (T.state === 'prep') {
      var left = T.prep - (now() - T.prepStart) / 1000 * RATE;
      if (left <= 0) { T.state = 'run'; T.runStart = now(); T.acc = 0; beep(true); return tRead(); }
      return { big: String(Math.ceil(left)), sub: 'Get ready', phase: 'prep', beepAt: Math.ceil(left) };
    }
    if (total && e >= total) { e = total; r.done = true; }
    if (s.type === 'up') { r.big = fmtSecs(e); r.sub = s.cap ? 'Cap ' + fmtSecs(s.cap) : 'Count up'; }
    if (s.type === 'down' || s.type === 'amrap') { r.big = fmtSecs(Math.ceil(total - e)); r.sub = s.label || (s.type === 'amrap' ? 'AMRAP' : 'Countdown'); r.left = total - e; }
    if (s.type === 'emom') {
      var round = Math.min(s.rounds, Math.floor(e / s.every) + 1), inR = s.every - (e % s.every);
      if (r.done) inR = 0;
      r.big = fmtSecs(Math.ceil(inR)); r.sub = 'Round ' + round + ' of ' + s.rounds; r.left = inR;
    }
    if (s.type === 'tabata') {
      var cyc = s.work + s.rest, rd = Math.min(s.rounds, Math.floor(e / cyc) + 1), inC = e % cyc, work = inC < s.work;
      if (r.done) { work = false; inC = cyc; }
      var lft = work ? s.work - inC : cyc - inC;
      r.big = fmtSecs(Math.ceil(lft)); r.sub = (work ? 'Work' : 'Rest') + ' · Round ' + rd + ' of ' + s.rounds; r.phase = work ? 'work' : 'rest'; r.left = lft;
    }
    if (r.done) { r.sub = s.type === 'up' && s.cap ? 'Time cap' : 'Time'; r.phase = 'done'; }
    return r;
  }
  function tTick() {
    if (T.state !== 'run' && T.state !== 'prep') return;
    var r = tRead();
    // 3-2-1 beeps: in the prep countdown, and at the end of every countdown or interval
    var key = null;
    if (r.phase === 'prep') key = 'p' + r.beepAt;
    else if (r.left !== undefined && r.left <= 3.05 && r.left > 0.05) key = 'l' + Math.ceil(r.left) + r.sub;
    if (key && key !== T.lastBeep && (r.phase !== 'prep' || r.beepAt <= 3)) { T.lastBeep = key; beep(false); }
    if (r.done) { T.acc = specTotal(T.spec); T.state = 'done'; beep(true); if (T.onDone) T.onDone(); }
  }

  /* ---------------- shared bits of markup ---------------- */
  var LOGO = '/images/logos/logo.png';
  function rise(html, d) { return '<div class="r" style="--d:' + d + 'ms">' + html + '</div>'; }

  /* ---------------- weather (Open-Meteo, no key) ---------------- */
  var WX = null;
  var WCODE = [[0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [45, 'Fog'], [48, 'Fog'], [51, 'Drizzle'], [53, 'Drizzle'], [55, 'Drizzle'], [61, 'Rain'], [63, 'Rain'], [65, 'Heavy rain'], [71, 'Snow'], [73, 'Snow'], [75, 'Snow'], [80, 'Showers'], [81, 'Showers'], [82, 'Heavy showers'], [95, 'Storms'], [96, 'Storms'], [99, 'Storms']];
  function wxText(c) { for (var i = 0; i < WCODE.length; i++) if (WCODE[i][0] === c) return WCODE[i][1]; return ''; }
  function loadWeather() {
    if (q('wx')) { WX = { t: +q('wx'), d: 'Partly cloudy' }; return; }   // preview only
    try {
      var x = new XMLHttpRequest();
      x.open('GET', 'https://api.open-meteo.com/v1/forecast?latitude=33.15&longitude=-96.89&current=temperature_2m,weather_code&temperature_unit=fahrenheit', true);
      x.onreadystatechange = function () {
        if (x.readyState !== 4 || x.status !== 200) return;
        try { var j = JSON.parse(x.responseText); WX = { t: Math.round(j.current.temperature_2m), d: wxText(j.current.weather_code) }; paintAmbient(); } catch (e) {}
      };
      x.send();
    } catch (e) {}
  }
  function wxHtml() { return WX ? '<span class="wx"><b>' + WX.t + '°</b> ' + esc(WX.d) + '</span>' : ''; }

  /* ---------------- screens ---------------- */
  var view = { mode: null, day: null, start: null, sec: 0, auto: false, openGym: false, ogUntil: 0, ogHard: 0, welcomeUntil: 0, toast: null, centerKey: null };

  function show(id) {
    ['scBoard', 'scCountdown', 'scCenter'].forEach(function (s) { $(s).classList.toggle('on', s === id); });
  }

  // ---- time until next class ----
  function drawCountdown(nx) {
    var p = programFor(nx.day);
    $('scCountdown').innerHTML =
      '<div class="cdTop"><img class="logo" src="' + LOGO + '" alt="Black Iron Athletics"><div class="amb" id="ambCd"></div></div>' +
      '<div class="cdMid">' +
        rise('<div class="eyebrow">Time until next class</div>', 0) +
        rise('<div class="cdBig" id="cdBig">--:--</div>', 120) +
        rise('<div class="cdNext"><span class="f">' + minLabel(nx.start) + '</span> class' + (p ? ' · ' + esc(P.cycle || '') + (p.week ? ', ' + esc(p.week) : '') : '') + '</div>', 240) +
        (p ? rise('<div class="cdSecs">' + p.sections.map(function (s) { return '<span>' + esc(s.name) + '</span>'; }).join('<i></i>') + '</div>', 360) : '') +
      '</div>' +
      '<div class="cdBot">' + ogButton() + '<div class="mission">We help everyday people become everyday athletes.</div></div>';
    view.cdTarget = epochOf(nx.day, nx.start);
    paintAmbient();
  }
  function tickCountdown() {
    var el = $('cdBig'); if (!el) return;
    var left = (view.cdTarget - now()) / 1000;
    el.textContent = fmtSecs(Math.max(0, Math.ceil(left)));
  }

  // ---- end of day / overnight centerpiece ----
  function ogButton() { return programFor(todayNum()) ? '<button class="btn ghost" data-act="opengym">Open gym: today’s workout</button>' : '<span></span>'; }
  // What the centerpiece says, based on when the next class is.
  function centerMsg(nx) {
    var z = nowZ(), n = todayNum(), wd = fromDayNum(n).wd, min = z.h * 60 + z.mi;
    if (!nx) return { head: 'See you soon.', sub: '', when: '' };
    var day = WEEKDAY[fromDayNum(nx.day).wd], at = '<span class="f">' + minLabel(nx.start) + '</span>';
    if ((wd === 6 || wd === 0) && nx.inDays > 0)
      return { head: 'Have a great weekend.', sub: 'We’ll see you ' + day + '. Our next class is ' + day + ' at ' + at + '.', when: day + ', ' + minLabel(nx.start) };
    if (nx.inDays === 0)
      return { head: min < 240 ? 'Rest up.' : 'Good morning.', sub: 'First class today is at ' + at + '.', when: 'Today, ' + minLabel(nx.start) };
    if (nx.inDays === 1)
      return { head: 'That’s a wrap for today.', sub: 'See you tomorrow. Next class is ' + day + ' at ' + at + '.', when: 'Tomorrow, ' + minLabel(nx.start) };
    return { head: 'See you ' + day + '.', sub: 'Our next class is ' + day + ' at ' + at + '.', when: day + ', ' + minLabel(nx.start) };
  }
  function drawCenter(nx) {
    var m = centerMsg(nx);
    view.cdTarget = null;
    // the time of day is the hero, the message and next class under it
    $('scCenter').innerHTML =
      '<div class="cdTop"><img class="logo" src="' + LOGO + '" alt="Black Iron Athletics"><div class="amb" id="ambW"></div></div>' +
        '<div class="cdMid">' +
          rise('<div class="eyebrow">' + esc(m.head) + '</div>', 0) +
          rise('<div class="cdBig eTime" id="cTime"></div>', 120) +
          rise('<div class="eDate" id="cDate"></div>', 220) +
          rise('<div class="eSub">' + m.sub + '</div>', 340) +
        '</div>' +
      '<div class="cdBot">' + ogButton() + '<div class="mission">We help everyday people become everyday athletes.</div></div>';
    $('scCenter').className = 'screen on e1';
    paintAmbient(); tickCountdown();
  }

  // ---- the ambient strip: time of day + weather ----
  function paintAmbient() {
    var z = nowZ(), f = clockFace(z), n = todayNum();
    var html = '<span class="tod">' + f.t + '<small>' + f.ap + '</small></span><span class="sep"></span><span>' + esc(dateLine(n)) + '</span>' + (WX ? '<span class="sep"></span>' + wxHtml() : '');
    ['ambCd', 'ambC'].forEach(function (id) { var el = $(id); if (el) el.innerHTML = html; });
    var w = $('ambW'); if (w) w.innerHTML = WX ? wxHtml() : '';
    var t = $('cTime'); if (t) t.innerHTML = f.t + '<small>' + f.ap + '</small>';
    var d = $('cDate'); if (d) d.innerHTML = esc(dateLine(n));
  }

  // ---- the coach board ----
  function sectionBody(s) {
    var h = '';
    (s.blocks || []).forEach(function (b) {
      h += '<div class="blk">' + (b.head ? '<div class="bh">' + md(b.head) + '</div>' : '') +
        '<ul>' + (b.items || []).map(function (it) { return '<li>' + md(it) + '</li>'; }).join('') + '</ul></div>';
    });
    if (s.levels && s.levels.length) h += '<div class="lvls">' + s.levels.map(function (l) { return '<div class="lv"><span>L' + esc(l[0]) + '</span>' + md(l[1]) + '</div>'; }).join('') + '</div>';
    if (s.notes) h += '<div class="note"><b>Notes</b>' + md(s.notes) + '</div>';
    return h;
  }
  function boardData() { return timelineFor(view.day); }
  function mss(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
  function minsText(m) { return m === Math.round(m) ? m + ' min' : mss(m * 60); }
  function chipTime(x) {
    if (view.start !== null) return minShort(view.start + Math.round(x.at / 60));
    return x.kind === 'main' ? x.min + '′' : mss(x.min * 60);
  }
  function drawBoard(animate) {
    var p = boardData(), secs = p ? p.sections : [], s = secs[view.sec];
    var cls = view.openGym ? 'Open gym' : view.start !== null ? minLabel(view.start) + ' class' : 'Today';
    $('bHead').innerHTML =
      '<img class="logo" src="' + LOGO + '" alt="Black Iron Athletics">' +
      '<div class="bh-mid"><span class="f">' + esc(cls) + '</span><span class="sep"></span>' + esc(dateLine(view.day)) + (p ? '<span class="sep"></span>' + esc(P.cycle || '') + (p.week ? ', ' + esc(p.week) : '') : '') + '</div>' +
      '<div class="bh-r"><span id="bTod"></span>' + (view.openGym ? '<button class="xBtn" data-act="ogexit" title="Exit open gym" aria-label="Exit open gym"><i></i></button>' : '') + '</div>';
    if (!s) {
      $('bSec').innerHTML = '<div class="empty"><div class="eyebrow">Coach board</div><h1>No programming loaded for ' + esc(dateLine(view.day)) + '.</h1><p>Send this week’s programming and it shows up here.</p></div>';
      $('bRail').innerHTML = '';
      return;
    }
    var of = secs.length;
    $('bSec').innerHTML =
      '<div class="secTop' + (animate ? ' anim' : '') + '">' +
        '<div class="secKick k-' + s.kind + (s.name.length > 13 ? ' long' : '') + '">' + (s.kind === 'main' ? '<span class="num">' + s.n + '<small>/' + s.of + '</small></span>' : '') + esc(s.name) + '<span class="mins">' + minsText(s.min) + '</span></div>' +
      '</div>' +
      '<div class="secBody' + (animate ? ' anim' : '') + '">' + sectionBody(s) + '</div>';
    fitBody();
    // rail of sections
    $('bRail').className = secs.length > 7 ? 'many' : '';
    $('bRail').innerHTML = secs.map(function (x, i) {
      var st = (i === view.sec ? ' on' : i < view.sec ? ' past' : '');
      if (x.kind === 'trans') return '<button class="chip tr' + st + '" data-act="goto" data-i="' + i + '" title="Transition"><i class="trI"></i><span>' + mss(x.min * 60) + '</span></button>';
      return '<button class="chip k-' + x.kind + st + '" data-act="goto" data-i="' + i + '">' + (x.kind === 'main' ? '<b>' + x.n + '</b>' : '') + '<em>' + esc(x.name) + '</em><span>' + chipTime(x) + '</span></button>';
    }).join('');
    $('btnPrev').disabled = view.sec === 0;
    $('btnNext').innerHTML = view.sec < of - 1 ? 'Next: ' + esc(secs[view.sec + 1].name) + ' <span class="arr">→</span>' : 'Finish <span class="arr">→</span>';
    if (animate && !STILL) wipe();
    drawClock();
  }
  // Size the workout text to fill the whiteboard: the largest size where every
  // line still fits. Short sections (one movement) end up very large.
  var FIT_MAX = 132, FIT_MIN = 24;
  function fitBody() {
    var box = $('bSec'), body = box && box.querySelector('.secBody'); if (!body) return;
    function fits() { return body.offsetTop + body.offsetHeight <= box.clientHeight && body.scrollWidth <= body.clientWidth + 1; }
    body.style.fontSize = FIT_MAX + 'px';
    if (fits()) return;
    var lo = FIT_MIN, hi = FIT_MAX;
    for (var i = 0; i < 9; i++) { var mid = (lo + hi) / 2; body.style.fontSize = mid + 'px'; if (fits()) lo = mid; else hi = mid; }
    body.style.fontSize = Math.floor(lo) + 'px';
  }
  function wipe() { var w = $('wipe'); w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); }

  function drawClock() {
    if (!$('ckBig')) return;
    var r = tRead(), s = T.spec;
    $('ckBig').textContent = r.big;
    $('ckSub').textContent = r.sub;
    $('ckMode').textContent = s.label || MODES[s.type];
    if (T.state === 'idle' && s.type !== 'tabata') $('ckSub').textContent = s.label ? fmtSecs(s.total) + ' ' + s.label.toLowerCase() : specSummary(s);
    var panel = $('bClock');
    panel.className = 'ck st-' + T.state + (r.phase ? ' ph-' + r.phase : '');
    $('btnPlay').innerHTML = T.state === 'run' || T.state === 'prep' ? '<i class="ic pause"></i>Pause' : T.state === 'paused' ? '<i class="ic play"></i>Resume' : T.state === 'done' ? '<i class="ic reset"></i>Again' : '<i class="ic play"></i>Start';
    $('btnAuto').classList.toggle('on', view.auto);
    $('btnAuto').innerHTML = '<i class="ic auto"></i>Auto clock' + (view.auto ? ' on' : '');
    $('btnMute').classList.toggle('on', muted);
    $('scBoard').classList.toggle('og', !!view.openGym);
  }

  function gotoSection(i, opts) {
    var p = boardData(); if (!p) return;
    i = Math.max(0, Math.min(p.sections.length - 1, i));
    var changed = i !== view.sec;
    view.sec = i;
    tSet(normSpec(p.sections[i].clock));
    drawBoard(changed || (opts && opts.force));
    view.headsUp = -1;
    if (opts && opts.start) tToggle(opts.noPrep);
  }
  function nextSection() {
    var p = boardData(); if (!p) return;
    var running = T.state === 'run' || T.state === 'prep';
    if (view.sec < p.sections.length - 1) gotoSection(view.sec + 1, { start: view.auto && running, noPrep: true });
    else celebrate();
  }

  // Auto clock: a 5-second heads-up during the end of each clock, then the
  // next block starts the moment this one ends, so the class stays on the hour.
  function headsUp() {
    if (!view.auto || view.mode !== 'board' || T.state !== 'run') return;
    var p = boardData(); if (!p) return;
    var total = specTotal(T.spec); if (!total) return;
    var left = Math.ceil(total - tElapsed()), nx = p.sections[view.sec + 1];
    if (!nx || left > 5 || left < 1) return;
    if (view.headsUp !== view.sec) { view.headsUp = view.sec; toast('Up next: <span class="f">' + esc(nx.name) + '</span> in <b id="tn">' + left + '</b>', 6000); }
    var el = $('tn'); if (el) el.textContent = left;
  }
  T.onDone = function () {
    if (view.mode !== 'board') return;
    var p = boardData(); if (!p) return;
    // The last clock of the class ending is the finish line, auto clock or not.
    if (view.sec >= p.sections.length - 1) { celebrate(); return; }
    if (!view.auto) return;
    $('toast').classList.remove('on');
    gotoSection(view.sec + 1, { start: true, noPrep: true });
  };

  function toast(html, ms) {
    var t = $('toast'); t.innerHTML = html; t.classList.add('on');
    clearTimeout(view.toast); view.toast = setTimeout(function () { t.classList.remove('on'); }, ms || 3000);
  }

  // ---- welcome, then the warm-up ----
  function welcome(start) {
    var w = $('welcome');
    var first = (boardData() || { sections: [{ name: 'the warm-up' }] }).sections[0];
    w.innerHTML = '<div class="wIn">' +
      rise('<div class="eyebrow">' + (start < 720 ? 'Good morning' : start < 1020 ? 'Good afternoon' : 'Good evening') + '</div>', 0) +
      rise('<div class="wBig">Welcome,<br><span class="outline">' + minShort(start) + ' crew.</span></div>', 150) +
      rise('<div class="wSub">Glad you made it. Let’s get started.</div>', 600) +
      rise('<div class="wNext">First up: <span class="f">' + esc(first ? first.name : 'Warm up') + '</span></div>', 1100) +
      '</div><div class="wBar"></div>';
    clearTimeout(welcomeT); w.classList.remove('out', 'og'); w.classList.add('on');
    view.welcomeUntil = now() + (STILL ? 0 : 4200);
  }
  var welcomeT = null;
  function endWelcome() { var w = $('welcome'); if (!w.classList.contains('on')) return; w.classList.add('out'); clearTimeout(welcomeT); welcomeT = setTimeout(function () { w.classList.remove('on', 'out', 'og'); }, 700); }

  /* ---------------- end of class: great work, with confetti ---------------- */
  var CF = { raf: 0, parts: [], t0: 0 };
  function celebrate() {
    if (view.celebrating) return;
    view.celebrating = true;
    $('toast').classList.remove('on');
    var z = nowZ(), nx = nextClassAfter(todayNum(), z.h * 60 + z.mi), nextTxt = '';
    if (nx && !view.openGym) nextTxt = 'Next class ' + (nx.inDays === 0 ? 'today' : nx.inDays === 1 ? 'tomorrow' : WEEKDAY[fromDayNum(nx.day).wd]) + ' at <span class="f">' + minLabel(nx.start) + '</span>';
    var c = $('celebrate');
    c.innerHTML = '<canvas id="cfx" width="1920" height="1080"></canvas><div class="cIn">' +
      rise('<div class="eyebrow">' + (view.openGym ? 'Open gym' : 'That’s class') + '</div>', 0) +
      rise('<div class="wBig">' + (view.openGym || view.start === null ? 'Great<br><span class="outline">work.</span>' : 'Great work,<br><span class="outline">' + minShort(view.start) + ' crew.</span>') + '</div>', 200) +
      rise('<div class="wSub">That’s the hour. Thanks for showing up.</div>', 650) +
      (nextTxt ? rise('<div class="wNext">' + nextTxt + '</div>', 1000) : '') +
      '</div><div class="cTap">Tap anywhere to close</div>';
    c.classList.add('on');
    view.celebrateUntil = now() + (STILL ? 60000 : 15000);
    confetti();
  }
  function endCelebrate() {
    if (!view.celebrating) return;
    view.celebrating = false; view.celebrateUntil = 0;
    cancelAnimationFrame(CF.raf); CF.parts = [];
    $('celebrate').classList.remove('on');
    if (view.openGym) endOpenGym();
  }
  function confetti() {
    var cv = $('cfx'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), COL = ['#FFD202', '#FFD202', '#FFFFFF', '#C7C7C7'];
    var calm = STILL || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function piece(x, y, vx, vy) {
      return { x: x, y: y, vx: vx, vy: vy, w: 12 + Math.random() * 14, h: 7 + Math.random() * 9, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.32, f: Math.random() * 6.28, c: COL[Math.floor(Math.random() * COL.length)] };
    }
    function draw(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.f));
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    CF.parts = [];
    if (calm) {   // one still frame of scattered confetti
      for (var k = 0; k < 140; k++) draw(piece(Math.random() * 1920, Math.random() * 1080, 0, 0));
      return;
    }
    // two cannons from the bottom corners, then a few seconds of falling confetti
    for (var i = 0; i < 120; i++) {
      CF.parts.push(piece(-20, 1100, 9 + Math.random() * 16, -(22 + Math.random() * 20)));
      CF.parts.push(piece(1940, 1100, -(9 + Math.random() * 16), -(22 + Math.random() * 20)));
    }
    CF.t0 = Date.now();
    var last = CF.t0;
    function frame() {
      var t = Date.now(), dt = Math.min(2.5, (t - last) / 16.7); last = t;
      if (t - CF.t0 < 4500 && Math.random() < 0.6 * dt) CF.parts.push(piece(Math.random() * 1920, -30, (Math.random() - 0.5) * 3, 2 + Math.random() * 3));
      ctx.clearRect(0, 0, 1920, 1080);
      var alive = [];
      for (var j = 0; j < CF.parts.length; j++) {
        var p = CF.parts[j];
        p.vy = Math.min(p.vy + 0.42 * dt, 7); p.vx *= Math.pow(0.985, dt);
        p.x += (p.vx + Math.sin(p.f) * 1.2) * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.f += 0.12 * dt;
        if (p.y < 1140 && p.x > -60 && p.x < 1980) { draw(p); alive.push(p); }
      }
      CF.parts = alive;
      if (alive.length || t - CF.t0 < 4500) CF.raf = requestAnimationFrame(frame);
    }
    CF.raf = requestAnimationFrame(frame);
  }

  /* ---------------- open gym: today's workout as a self-running class ---------------- */
  function openGym() {
    var n = todayNum(), p = programFor(n);
    if (!p) { toast('No workout loaded for today.', 3000); return; }
    view.openGym = true; view.mode = 'board'; view.day = n; view.start = null; view.sec = 0;
    view.auto = true; view.ogUntil = now() + OPEN_GYM_MS; view.ogHard = view.ogUntil + OPEN_GYM_HARD_MS;
    show('scBoard');
    tSet(normSpec(p.sections[0].clock));
    drawBoard(false);
    view.ogStartAt = 0;
    var w = $('welcome');
    w.innerHTML = '<div class="wIn">' +
      rise('<div class="eyebrow">Open gym</div>', 0) +
      rise('<div class="wBig">Today’s<br><span class="outline">workout.</span></div>', 150) +
      rise('<div class="ogSecs">' + p.sections.map(function (x) { return '<span>' + esc(x.name) + ' <b>' + x.min + ' min</b></span>'; }).join('<i></i>') + '</div>', 400) +
      rise('<div class="wSub">One hour, transitions included. Press start and the board runs the whole class: every section, every clock.</div>', 550) +
      rise('<div class="ogBtns"><button class="btn forge big" data-act="ogstart"><i class="ic play"></i>Start workout</button><button class="btn ghost" data-act="ogboard">Just show the board</button><button class="btn ghost" data-act="ogexit">Close</button></div>', 700) +
      '</div>';
    clearTimeout(welcomeT); w.classList.remove('out'); w.classList.add('on', 'og');
    view.welcomeUntil = 0;
  }
  function ogStart() {
    endWelcome(); view.auto = true; view.ogStartAt = now() + T.prep * 1000;
    gotoSection(0, { force: true, start: true });
    toast('Here we go. <span class="f">' + esc(boardData().sections[0].name) + '</span> starts in 10', 3000);
  }
  function leaveOpenGym() { view.openGym = false; view.auto = false; view.mode = null; view.start = null; view.cdTarget = null; endWelcome(); }
  function endOpenGym() { leaveOpenGym(); tReset(); decide(); }

  /* ---------------- deciding what is on screen ---------------- */
  function setMode(want) {
    if (want.mode === 'board') {
      var newClass = view.mode !== 'board' || view.day !== want.day || view.start !== want.start;
      if (newClass) {
        endCelebrate();
        view.mode = 'board'; view.day = want.day; view.start = want.start; view.sec = 0;
        show('scBoard');
        var p = boardData();
        tSet(normSpec(p ? p.sections[0].clock : null));
        var sec = parseInt(q('section'), 10);
        if (!isNaN(sec) && q('mode') === 'board') { gotoSection(sec - 1, { force: true }); return; }
        drawBoard(false);
        // Welcome only at the start of a class (first 3 minutes), not when the screen reloads mid-class.
        var minsIn = (now() - epochOf(want.day, want.start)) / 60000;
        if ((q('mode') !== 'board' && minsIn >= 0 && minsIn < 3) || q('welcome') === '1') welcome(want.start);
      }
      return;
    }
    if (want.mode === 'countdown') {
      if (view.mode === 'countdown' && view.cdTarget === epochOf(want.next.day, want.next.start)) return;
      view.mode = 'countdown'; show('scCountdown'); drawCountdown(want.next); return;
    }
    if (want.mode === 'centerpiece') {
      var key = (want.next ? want.next.day + ':' + want.next.start : '-') + ':' + centerMsg(want.next).head;
      if (view.mode === 'centerpiece' && view.centerKey === key) return;
      view.mode = 'centerpiece'; view.centerKey = key; show('scCenter'); drawCenter(want.next); return;
    }
  }
  function forced() {
    var m = q('mode'); if (!m || m === 'opengym') return null;
    var n = todayNum(), z = nowZ(), min = z.h * 60 + z.mi;
    if (m === 'board') { var c = q('class'); var list = classesOn(n); return { mode: 'board', day: n, start: c ? hhmmToMin(c) : (list[0] || 330) }; }
    if (m === 'countdown') return { mode: 'countdown', next: nextClassAfter(n, min) || { day: n + 1, start: 315, inDays: 1 } };
    if (m === 'centerpiece') return { mode: 'centerpiece', next: nextClassAfter(n, min) };
    return null;
  }
  function decide() {
    if (view.openGym) {
      var s = scheduled();
      // A scheduled class always takes the board back.
      if (s.mode === 'board' && !forced()) { leaveOpenGym(); setMode(s); return; }
      var running = T.state === 'run' || T.state === 'prep';
      if ((now() > view.ogUntil && !running) || now() > view.ogHard) endOpenGym();
      return;
    }
    var want = forced() || scheduled();
    // Don't yank the board away from a coach whose clock is still running after the hour.
    if (view.mode === 'board' && want.mode !== 'board' && !forced()) {
      var overMin = (now() - epochOf(view.day, view.start + CLASS_MIN)) / 60000;
      if ((T.state === 'run' || T.state === 'prep') && overMin < OVERRUN_GRACE_MIN) return;
    }
    setMode(want);
  }
  /* ---------------- clock dashboard ---------------- */
  var draft = null;
  function openDash() {
    draft = JSON.parse(JSON.stringify(T.spec)); draft.prep = T.prep;
    renderDash(); $('dash').classList.add('on');
  }
  function closeDash() { $('dash').classList.remove('on'); }
  function stepper(key, label, val, step, kind) {
    var shown = kind === 'time' ? fmtSecs(val) : String(val);
    return '<div class="st"><div class="stl">' + label + '</div><div class="stc"><button data-act="dstep" data-k="' + key + '" data-s="' + (-step) + '">−</button><span>' + shown + '</span><button data-act="dstep" data-k="' + key + '" data-s="' + step + '">+</button></div></div>';
  }
  function renderDash() {
    var d = draft, h = '<div class="dIn"><div class="dHead"><div><div class="eyebrow">Clock</div><h2>Set the timer</h2></div><button class="btn ghost" data-act="dclose">Close</button></div>';
    h += '<div class="dModes">' + ['down', 'up', 'emom', 'amrap', 'tabata'].map(function (m) {
      return '<button class="mode' + (d.type === m ? ' on' : '') + '" data-act="dmode" data-m="' + m + '">' + MODES[m] + '</button>';
    }).join('') + '</div><div class="dFields">';
    if (d.type === 'down' || d.type === 'amrap') h += stepper('total', 'Time', d.total, 60, 'time');
    if (d.type === 'up') h += stepper('cap', 'Time cap (0 = none)', d.cap || 0, 60, 'time');
    if (d.type === 'emom') h += stepper('every', 'Every', d.every, 15, 'time') + stepper('rounds', 'Rounds', d.rounds, 1);
    if (d.type === 'tabata') h += stepper('work', 'Work', d.work, 5, 'time') + stepper('rest', 'Rest', d.rest, 5, 'time') + stepper('rounds', 'Rounds', d.rounds, 1);
    h += stepper('prep', 'Get-ready countdown', d.prep, 5, 'time') + '</div>';
    h += '<div class="dFoot"><button class="btn ghost" data-act="ddefault">Section default</button><button class="btn" data-act="dapply">Set clock</button><button class="btn forge" data-act="dstart"><i class="ic play"></i>Set and start</button></div></div>';
    $('dash').innerHTML = h;
  }
  function dashAct(act, el) {
    if (act === 'dclose') return closeDash();
    if (act === 'dmode') {
      var m = el.getAttribute('data-m'), keep = draft.prep;
      draft = normSpec({ type: m, min: draft.total ? draft.total / 60 : 10, cap: draft.cap ? draft.cap / 60 : 0 }); draft.prep = keep;
    }
    if (act === 'dstep') {
      var k = el.getAttribute('data-k'), s = +el.getAttribute('data-s');
      var min = { total: 60, cap: 0, every: 15, rounds: 1, work: 5, rest: 0, prep: 0 }[k];
      draft[k] = Math.max(min, (draft[k] || 0) + s);
    }
    if (act === 'ddefault') { var p = boardData(); var keep2 = draft.prep; draft = normSpec(p ? p.sections[view.sec].clock : null); draft.prep = keep2; }
    if (act === 'dapply' || act === 'dstart') {
      T.prep = draft.prep; var spec = JSON.parse(JSON.stringify(draft)); delete spec.prep; tSet(spec); closeDash();
      if (act === 'dstart') tToggle();
      return;
    }
    renderDash();
  }

  /* ---------------- input ---------------- */
  document.addEventListener('click', function (e) {
    audio();
    if (view.celebrating) { endCelebrate(); return; }
    var el = e.target; while (el && el !== document && !el.getAttribute('data-act')) el = el.parentNode;
    if (!el || el === document) return;
    var act = el.getAttribute('data-act');
    if (act.charAt(0) === 'd') return dashAct(act, el);
    if (act === 'next') nextSection();
    if (act === 'prev') gotoSection(view.sec - 1);
    if (act === 'goto') gotoSection(+el.getAttribute('data-i'));
    if (act === 'play') tToggle();
    if (act === 'reset') tReset();
    if (act === 'plus') tAdjust(60);
    if (act === 'minus') tAdjust(-60);
    if (act === 'clock') openDash();
    if (act === 'auto') { view.auto = !view.auto; toast(view.auto ? 'Auto clock on: each section rolls into the next when its clock ends' : 'Auto clock off: you’re in control', 3200); drawClock(); }
    if (act === 'mute') { muted = !muted; drawClock(); }
    if (act === 'opengym') openGym();
    if (act === 'ogstart') ogStart();
    if (act === 'ogboard') endWelcome();
    if (act === 'ogexit') endOpenGym();
  });
  document.addEventListener('keydown', function (e) {
    audio();
    if (view.celebrating) { endCelebrate(); return; }
    var k = e.key, dashOn = $('dash').classList.contains('on');
    if (k === 'Escape') { if (dashOn) closeDash(); else if (view.openGym) endOpenGym(); return; }
    if (k === 'f' || k === 'F') { var d = document.documentElement; if (d.requestFullscreen) d.requestFullscreen(); return; }
    if (view.mode === 'countdown' || view.mode === 'centerpiece') { if (k === 'w' || k === 'W') openGym(); return; }
    if (view.openGym && $('welcome').classList.contains('og')) { if (k === ' ' || k === 'Enter') { e.preventDefault(); ogStart(); } return; }
    if (view.mode !== 'board' || dashOn) return;
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'n' || k === 'N') { e.preventDefault(); nextSection(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'p' || k === 'P') { e.preventDefault(); gotoSection(view.sec - 1); }
    else if (k === ' ' || k === 'Enter' || k === 'b' || k === 'B' || k === '.') { e.preventDefault(); tToggle(); }
    else if (k === 'r' || k === 'R') tReset();
    else if (k === 'c' || k === 'C') openDash();
    else if (k === 'a' || k === 'A') { view.auto = !view.auto; drawClock(); }
    else if (k === 'm' || k === 'M') { muted = !muted; drawClock(); }
    else if (k === '+' || k === '=') tAdjust(60);
    else if (k === '-') tAdjust(-60);
  });

  /* ---------------- fit the 1920x1080 stage to the screen ---------------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'translate(' + ((window.innerWidth - 1920 * s) / 2) + 'px,' + ((window.innerHeight - 1080 * s) / 2) + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  /* ---------------- run ---------------- */
  var lastSec = -1;
  function loop() {
    tTick();
    if (view.mode === 'board') {
      drawClock(); headsUp();
      if (view.celebrating && now() > view.celebrateUntil) endCelebrate();
      if (view.welcomeUntil && now() > view.welcomeUntil) { view.welcomeUntil = 0; endWelcome(); }
    }
    var z = nowZ();
    if (z.s !== lastSec) {
      lastSec = z.s;
      decide();
      if (view.mode === 'countdown' || view.mode === 'centerpiece') tickCountdown();
      var hb = $('bHour');
      if (hb) {
        var t0 = view.start !== null ? epochOf(view.day, view.start) : view.ogStartAt;
        hb.style.transform = 'scaleX(' + (t0 ? Math.max(0, Math.min(1, (now() - t0) / (CLASS_MIN * 60000))) : 0) + ')';
      }
      var tod = $('bTod'); if (tod) { var f = clockFace(z); tod.innerHTML = f.t + '<small>' + f.ap + '</small>' + (WX ? '<span class="sep"></span>' + wxHtml() : ''); }
      if (z.s === 0) paintAmbient();
    }
  }
  loadWeather(); setInterval(loadWeather, 20 * 60000);
  decide(); paintAmbient();
  if (q('mode') === 'opengym') openGym();
  if (q('celebrate') === '1' && view.mode === 'board') celebrate();   // preview only
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (view.mode === 'board') fitBody(); });
  setInterval(loop, 100);
  // A coach touching the board un-hides the cursor; it hides again after 4 seconds.
  var curT; document.addEventListener('mousemove', function () { document.body.classList.add('cur'); clearTimeout(curT); curT = setTimeout(function () { document.body.classList.remove('cur'); }, 4000); });
  document.body.classList.add('ready');
})();
