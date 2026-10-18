/* ==========================================================================
   BLACK IRON COACH BOARD engine
   Reads window.COACH_PROGRAM (coach/program.js), works out the time in Frisco,
   and decides what the middle screen shows:

     before the first class   branded centerpiece, then "time until next class"
     during a class           the coach board (welcome, then the warm-up)
     between classes          "time until next class"
     after the last class     branded centerpiece

   URL options (all optional):
     ?v=1|2|3            layout version (prototype)
     ?date=2026-10-12    pretend it is this day
     ?time=09:29:50      pretend it is this time
     ?mode=board|countdown|centerpiece|overview   force a screen (preview)
     ?class=9:30         with mode=board, which class
     ?section=2          with mode=board, open on this section (1-based)
     ?still=1            no animation (screenshots)

   Keys (a wireless keyboard or a presentation clicker works):
     Right / PageDown / N   next section      Left / PageUp / P   previous section
     Space / Enter / B / .  start or pause    R   reset the clock
     C   clock dashboard    A   auto clock     M   mute    F   full screen
     W   today's workout (between classes)     Esc   close

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
  var OVERVIEW_MS = 60 * 60 * 1000;     // "today's workout" closes itself after an hour
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
  var VERSION = /^[123]$/.test(q('v') || '') ? q('v') : '1';
  stage.className = 'v' + VERSION + (STILL ? ' still' : '');

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
    var morning = first !== null && min < first && min >= first - (P.morningCountdownMinutes || 75);
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
  function tToggle() {
    audio();
    if (T.state === 'run') { T.acc = tElapsed(); T.state = 'paused'; }
    else if (T.state === 'prep') { T.state = 'idle'; }
    else if (T.state === 'done') { tReset(); return tToggle(); }
    else if (T.state === 'paused') { T.runStart = now(); T.state = 'run'; }
    else if (T.prep > 0) { T.state = 'prep'; T.prepStart = now(); }
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
    if (s.type === 'down' || s.type === 'amrap') { r.big = fmtSecs(Math.ceil(total - e)); r.sub = s.type === 'amrap' ? 'AMRAP' : 'Countdown'; r.left = total - e; }
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
  var LOGO = '/images/logos/logo.png', ANVIL = '/images/tv/anvil.png';
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
  var view = { mode: null, day: null, start: null, sec: 0, auto: false, overviewUntil: 0, welcomeUntil: 0, toast: null };

  function show(id) {
    ['scBoard', 'scCountdown', 'scCenter', 'scOverview'].forEach(function (s) { $(s).classList.toggle('on', s === id); });
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
      '<div class="cdBot">' + (programFor(todayNum()) ? '<button class="btn ghost" data-act="overview">Show today’s workout</button>' : '') + '<div class="mission">We help everyday people become everyday athletes.</div></div>';
    view.cdTarget = epochOf(nx.day, nx.start);
    paintAmbient();
  }
  function tickCountdown() {
    var el = $('cdBig'); if (!el) return;
    var left = (view.cdTarget - now()) / 1000;
    el.textContent = fmtSecs(Math.max(0, Math.ceil(left)));
  }

  // ---- end of day / overnight centerpiece ----
  function drawCenter(nx) {
    var nextTxt = '';
    if (nx) nextTxt = 'Next class ' + (nx.inDays === 0 ? 'today' : nx.inDays === 1 ? 'tomorrow' : WEEKDAY[fromDayNum(nx.day).wd]) + ', <span class="f">' + minLabel(nx.start) + '</span>';
    $('scCenter').innerHTML =
      '<div class="cBg"><img src="' + ANVIL + '" alt=""></div>' +
      '<div class="cMain">' +
        rise('<img class="cLogo" src="' + LOGO + '" alt="Black Iron Athletics">', 0) +
        rise('<div class="cTime" id="cTime"></div>', 160) +
        rise('<div class="cDate" id="cDate"></div>', 260) +
        rise('<div class="cLine">Everyday people. <span class="outline">Everyday athletes.</span></div>', 380) +
      '</div>' +
      '<div class="cBot"><div class="cNext">' + nextTxt + '</div>' +
        (programFor(todayNum()) ? '<button class="btn ghost" data-act="overview">Show today’s workout</button>' : '') +
        '<div class="amb" id="ambC"></div></div>';
    paintAmbient();
  }

  // ---- the ambient strip: time of day + weather ----
  function paintAmbient() {
    var z = nowZ(), f = clockFace(z), n = todayNum();
    var html = '<span class="tod">' + f.t + '<small>' + f.ap + '</small></span><span class="sep"></span><span>' + esc(dateLine(n)) + '</span>' + (WX ? '<span class="sep"></span>' + wxHtml() : '');
    ['ambCd', 'ambC', 'ambOv'].forEach(function (id) { var el = $(id); if (el) el.innerHTML = html; });
    var t = $('cTime'); if (t) t.innerHTML = f.t + '<small>' + f.ap + '</small>';
    var d = $('cDate'); if (d) d.innerHTML = esc(dateLine(n)) + (WX ? '<span class="sep"></span>' + wxHtml() : '');
  }

  // ---- today's workout (open gym) ----
  function drawOverview() {
    var n = todayNum(), p = programFor(n);
    $('scOverview').innerHTML =
      '<div class="ovTop"><div><div class="eyebrow">Today’s workout</div><h1>' + esc(dateLine(n)) + '</h1></div><div class="amb" id="ambOv"></div><button class="btn ghost" data-act="exit">Close</button></div>' +
      '<div class="ovCols n' + (p ? p.sections.length : 0) + '">' + (p ? p.sections.map(function (s, i) {
        return '<div class="ovCol r" style="--d:' + (i * 90) + 'ms"><div class="ovHead"><span class="num">' + (i + 1) + '</span>' + esc(s.name) + '<span class="mins">' + s.min + ' min</span></div>' + sectionBody(s, true) + '</div>';
      }).join('') : '<p class="none">No programming loaded for today.</p>') + '</div>' +
      '<div class="ovFoot" id="ovFoot"></div>';
    paintAmbient();
  }

  // ---- the coach board ----
  function sectionBody(s, compact) {
    var h = '';
    (s.blocks || []).forEach(function (b) {
      h += '<div class="blk">' + (b.head ? '<div class="bh">' + md(b.head) + '</div>' : '') +
        '<ul>' + (b.items || []).map(function (it) { return '<li>' + md(it) + '</li>'; }).join('') + '</ul></div>';
    });
    if (s.levels && s.levels.length) h += '<div class="lvls">' + s.levels.map(function (l) { return '<div class="lv"><span>L' + esc(l[0]) + '</span>' + md(l[1]) + '</div>'; }).join('') + '</div>';
    if (s.notes) h += '<div class="note">' + (compact ? '' : '<b>Notes</b>') + md(s.notes) + '</div>';
    return h;
  }
  function boardData() { return programFor(view.day); }
  function drawBoard(animate) {
    var p = boardData(), secs = p ? p.sections : [], s = secs[view.sec];
    var cls = view.start !== null ? minLabel(view.start) + ' class' : 'Today';
    $('bHead').innerHTML =
      '<img class="logo" src="' + LOGO + '" alt="Black Iron Athletics">' +
      '<div class="bh-mid"><span class="f">' + esc(cls) + '</span><span class="sep"></span>' + esc(dateLine(view.day)) + (p ? '<span class="sep"></span>' + esc(P.cycle || '') + (p.week ? ', ' + esc(p.week) : '') : '') + '</div>' +
      '<div class="bh-r"><span id="bTod"></span></div>';
    if (!s) {
      $('bSec').innerHTML = '<div class="empty"><div class="eyebrow">Coach board</div><h1>No programming loaded for ' + esc(dateLine(view.day)) + '.</h1><p>Send this week’s programming and it shows up here.</p></div>';
      $('bRail').innerHTML = ''; $('bRun').innerHTML = ''; $('bNext').innerHTML = '';
      return;
    }
    var idx = view.sec + 1, of = secs.length;
    $('bSec').innerHTML =
      '<div class="secTop' + (animate ? ' anim' : '') + '">' +
        '<div class="secKick"><span class="num">' + idx + '<small>/' + of + '</small></span>' + esc(s.name) + '<span class="mins">' + s.min + ' min</span></div>' +
      '</div>' +
      '<div class="secBody' + (animate ? ' anim' : '') + ' len' + bodyLen(s) + '">' + sectionBody(s, false) + '</div>';
    // rail of sections
    $('bRail').innerHTML = secs.map(function (x, i) {
      return '<button class="chip' + (i === view.sec ? ' on' : i < view.sec ? ' past' : '') + '" data-act="goto" data-i="' + i + '"><b>' + (i + 1) + '</b>' + esc(x.name) + '<span>' + x.min + '′</span></button>';
    }).join('');
    // version 3: run of show + up next
    var t0 = 0;
    $('bRun').innerHTML = '<div class="runHead">Run of show</div>' + secs.map(function (x, i) {
      var row = '<button class="run' + (i === view.sec ? ' on' : i < view.sec ? ' past' : '') + '" data-act="goto" data-i="' + i + '"><span class="rt">' + Math.floor(t0 / 60) + ':' + pad(t0 % 60) + '</span><span class="rn">' + esc(x.name) + '</span><span class="rm">' + x.min + ' min</span></button>';
      t0 += x.min; return row;
    }).join('') + '<div class="runTot">' + t0 + ' minutes programmed</div><div class="classClock" id="classClock"></div>';
    var nx = secs[view.sec + 1];
    $('bNext').innerHTML = nx ? '<div class="unLabel">Up next</div><div class="unName">' + esc(nx.name) + '</div><div class="unMeta">' + nx.min + ' min · ' + esc(specSummary(normSpec(nx.clock))) + '</div>' : '<div class="unLabel">Up next</div><div class="unName">Cool down</div><div class="unMeta">That’s the last section.</div>';
    $('btnPrev').disabled = view.sec === 0;
    $('btnNext').innerHTML = view.sec < of - 1 ? 'Next: ' + esc(secs[view.sec + 1].name) + ' <span class="arr">→</span>' : 'Finish <span class="arr">→</span>';
    if (animate && !STILL) wipe();
    drawClock();
  }
  function bodyLen(s) {
    var n = 0; (s.blocks || []).forEach(function (b) { n += (b.items || []).length + (b.head ? 1 : 0); });
    n += (s.levels || []).length * 0.8 + (s.notes ? Math.ceil(s.notes.length / 70) : 0);
    return n > 11 ? 3 : n > 7 ? 2 : 1;
  }
  function wipe() { var w = $('wipe'); w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); }

  function drawClock() {
    if (!$('ckBig')) return;
    var r = tRead(), s = T.spec;
    $('ckBig').textContent = r.big;
    $('ckSub').textContent = r.sub;
    $('ckMode').textContent = MODES[s.type];
    if (T.state === 'idle' && s.type !== 'tabata') $('ckSub').textContent = specSummary(s);
    var panel = $('bClock');
    panel.className = 'ck st-' + T.state + (r.phase ? ' ph-' + r.phase : '');
    $('btnPlay').innerHTML = T.state === 'run' || T.state === 'prep' ? '<i class="ic pause"></i>Pause' : T.state === 'paused' ? '<i class="ic play"></i>Resume' : T.state === 'done' ? '<i class="ic reset"></i>Again' : '<i class="ic play"></i>Start';
    $('btnAuto').classList.toggle('on', view.auto);
    $('btnAuto').innerHTML = '<i class="ic auto"></i>Auto clock' + (view.auto ? ' on' : '');
    $('btnMute').classList.toggle('on', muted);
  }

  function gotoSection(i, opts) {
    var p = boardData(); if (!p) return;
    i = Math.max(0, Math.min(p.sections.length - 1, i));
    var changed = i !== view.sec;
    view.sec = i;
    tSet(normSpec(p.sections[i].clock));
    drawBoard(changed || (opts && opts.force));
    if (opts && opts.start) tToggle();
  }
  function nextSection() {
    var p = boardData(); if (!p) return;
    if (view.sec < p.sections.length - 1) gotoSection(view.sec + 1);
    else toast('That’s the workout. Nice work today.', 4000);
  }

  // When a section's clock finishes and Auto clock is on, roll into the next section.
  T.onDone = function () {
    if (!view.auto || view.mode !== 'board') return;
    var p = boardData(); if (!p) return;
    if (view.sec >= p.sections.length - 1) { toast('That’s the workout. Nice work today.', 5000); return; }
    var nx = p.sections[view.sec + 1], left = 5;
    toast('Up next: <span class="f">' + esc(nx.name) + '</span> in <b id="tn">5</b>', 5200);
    var iv = setInterval(function () {
      left--; var el = $('tn'); if (el) el.textContent = left;
      if (left <= 0) { clearInterval(iv); if (view.auto && view.mode === 'board') gotoSection(view.sec + 1, { start: true }); }
    }, 1000);
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
    w.classList.remove('out'); w.classList.add('on');
    view.welcomeUntil = now() + (STILL ? 0 : 4200);
  }
  function endWelcome() { var w = $('welcome'); if (!w.classList.contains('on')) return; w.classList.add('out'); setTimeout(function () { w.classList.remove('on', 'out'); }, 700); }

  /* ---------------- deciding what is on screen ---------------- */
  function setMode(want) {
    if (want.mode === 'board') {
      var newClass = view.mode !== 'board' || view.day !== want.day || view.start !== want.start;
      if (newClass) {
        view.mode = 'board'; view.day = want.day; view.start = want.start; view.sec = 0; view.overviewUntil = 0;
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
      if (view.mode === 'centerpiece') return;
      view.mode = 'centerpiece'; show('scCenter'); drawCenter(want.next); return;
    }
  }
  function forced() {
    var m = q('mode'); if (!m || m === 'overview') return null;
    var n = todayNum(), z = nowZ(), min = z.h * 60 + z.mi;
    if (m === 'board') { var c = q('class'); var list = classesOn(n); return { mode: 'board', day: n, start: c ? hhmmToMin(c) : (list[0] || 330) }; }
    if (m === 'countdown') return { mode: 'countdown', next: nextClassAfter(n, min) || { day: n + 1, start: 315, inDays: 1 } };
    if (m === 'centerpiece') return { mode: 'centerpiece', next: nextClassAfter(n, min) };
    return null;
  }
  function decide() {
    if (view.mode === 'overview') {
      var s = scheduled();
      if (s.mode === 'board' || now() > view.overviewUntil) { closeOverview(); }
      else { var f = $('ovFoot'); if (f) f.textContent = 'Closes on its own in ' + Math.ceil((view.overviewUntil - now()) / 60000) + ' min'; return; }
    }
    var want = forced() || scheduled();
    // Don't yank the board away from a coach whose clock is still running after the hour.
    if (view.mode === 'board' && want.mode !== 'board' && !forced()) {
      var overMin = (now() - epochOf(view.day, view.start + CLASS_MIN)) / 60000;
      if ((T.state === 'run' || T.state === 'prep') && overMin < OVERRUN_GRACE_MIN) return;
    }
    setMode(want);
  }
  function openOverview() {
    if (!programFor(todayNum())) return;
    view.prevMode = view.mode; view.mode = 'overview'; view.overviewUntil = now() + OVERVIEW_MS;
    show('scOverview'); drawOverview();
  }
  function closeOverview() { view.mode = null; view.cdTarget = null; decide(); }

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
    if (act === 'overview') openOverview();
    if (act === 'exit') closeOverview();
  });
  document.addEventListener('keydown', function (e) {
    audio();
    var k = e.key, dashOn = $('dash').classList.contains('on');
    if (k === 'Escape') { if (dashOn) closeDash(); else if (view.mode === 'overview') closeOverview(); return; }
    if (k === 'f' || k === 'F') { var d = document.documentElement; if (d.requestFullscreen) d.requestFullscreen(); return; }
    if (view.mode === 'countdown' || view.mode === 'centerpiece') { if (k === 'w' || k === 'W') openOverview(); return; }
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
      drawClock();
      if (view.welcomeUntil && now() > view.welcomeUntil) { view.welcomeUntil = 0; endWelcome(); }
    }
    var z = nowZ();
    if (z.s !== lastSec) {
      lastSec = z.s;
      decide();
      if (view.mode === 'countdown') tickCountdown();
      var tod = $('bTod'); if (tod) { var f = clockFace(z); tod.innerHTML = f.t + '<small>' + f.ap + '</small>' + (WX ? '<span class="sep"></span>' + wxHtml() : ''); }
      var cc = $('classClock'); if (cc && view.start !== null) cc.innerHTML = '<span>Class clock</span>' + fmtSecs(Math.max(0, (now() - epochOf(view.day, view.start)) / 1000));
      if (z.s === 0) paintAmbient();
    }
  }
  loadWeather(); setInterval(loadWeather, 20 * 60000);
  decide(); paintAmbient();
  if (q('mode') === 'overview') openOverview();
  setInterval(loop, 100);
  // A coach touching the board un-hides the cursor; it hides again after 4 seconds.
  var curT; document.addEventListener('mousemove', function () { document.body.classList.add('cur'); clearTimeout(curT); curT = setTimeout(function () { document.body.classList.remove('cur'); }, 4000); });
  document.body.classList.add('ready');
})();
