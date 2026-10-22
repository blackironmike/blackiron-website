/* ==========================================================================
   BLACK IRON WHITEBOARD: clock sounds.
   Every set uses the scoreboard-tone 3, 2, 1. The sets differ in the go sound
   after it and the end sound. Made in the browser (no audio files to load).
   Each set has:
     count   the 3, 2, 1 before a clock starts or ends (called with 3, 2 or 1)
     start   the clock starts (and each new EMOM round)
     end     the clock is done
   Preview them at /whiteboard/sounds.html.
   Plain ES5 so it runs on older TV browsers.
   ========================================================================== */
(function () {
  'use strict';

  var master = null, noiseBuf = null;
  function out(ac) {
    if (master && master.context === ac) return master;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 6;
    master = ac.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ac.destination);
    return master;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(ac, dest, type, f, t, a, peak, d) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    env(g, t, a, peak, d); o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function noise(ac, dest, t, d, peak, hp) {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      var ch = noiseBuf.getChannelData(0);
      for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 2000;
    env(g, t, 0.001, peak, d); s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + d + 0.05);
  }

  // flat envelope: quick attack, hold, quick cut (piezo beeps, horns, whistles)
  function sus(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.04);
  }
  function flat(ac, dest, type, f, t, peak, d) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    sus(g, t, 0.004, peak, d); o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + d + 0.1);
    return o;
  }

  // the scoreboard tone used for the count
  function board(ac, o, t, d) { flat(ac, o, 'triangle', 1050, t, 0.34, d); }

  // a scoreboard tone at any pitch (the count uses 1050)
  function tn(ac, o, t, f, d, peak) { flat(ac, o, 'triangle', f, t, peak || 0.34, d); }
  // a clean bell strike
  function ding(ac, o, t, f, len) {
    tone(ac, o, 'sine', f, t, 0.002, 0.55, len);
    tone(ac, o, 'sine', f * 2.76, t, 0.002, 0.16, len * 0.45);
    tone(ac, o, 'sine', f * 5.4, t, 0.002, 0.05, len * 0.25);
  }
  // Every set keeps the scoreboard-tone 3, 2, 1. What changes is the go sound
  // after it, and a matching end sound.
  function set(id, name, desc, start, end) {
    return { id: id, name: name, desc: desc, start: start, end: end,
      count: function (ac, o, t) { board(ac, o, t, 0.13); } };
  }
  var SETS = [
    set('go-long', 'Long beep', 'Beep, beep, beep, BEEEP: the same tone, held on go. Ends on a longer hold. The classic gym clock.',
      function (ac, o, t) { tn(ac, o, t, 1050, 0.8); },
      function (ac, o, t) { tn(ac, o, t, 1050, 1.5); }),
    set('go-high', 'High beep', 'The count, then one long beep a step higher on go. Ends on a longer high beep.',
      function (ac, o, t) { tn(ac, o, t, 1570, 0.7); },
      function (ac, o, t) { tn(ac, o, t, 1570, 1.3); }),
    set('go-double', 'Double beep', 'Two quick high beeps on go. Ends on three quick beeps and a long one.',
      function (ac, o, t) { tn(ac, o, t, 1570, 0.12); tn(ac, o, t + 0.18, 1570, 0.3); },
      function (ac, o, t) { [0, 0.18, 0.36].forEach(function (d) { tn(ac, o, t + d, 1570, 0.12); }); tn(ac, o, t + 0.54, 1570, 0.9); }),
    set('go-chord', 'Bright chord', 'A full, bright chord on go instead of a single tone. Ends on two chords.',
      function (ac, o, t) { [1050, 1320, 1570].forEach(function (f) { tn(ac, o, t, f, 0.6, 0.18); }); },
      function (ac, o, t) { [0, 0.5].forEach(function (d) { [1050, 1320, 1570].forEach(function (f) { tn(ac, o, t + d, f, d ? 0.9 : 0.3, 0.18); }); }); }),
    set('go-bell', 'Bell', 'A clean bell on go that rings out. Ends on three bells.',
      function (ac, o, t) { ding(ac, o, t, 1320, 1.6); },
      function (ac, o, t) { ding(ac, o, t, 1320, 0.9); ding(ac, o, t + 0.32, 1320, 0.9); ding(ac, o, t + 0.64, 1320, 2.0); })
  ];
  var BY_ID = {};
  SETS.forEach(function (s) { BY_ID[s.id] = s; });

  window.BIA_SOUNDS = {
    sets: SETS,
    has: function (id) { return !!BY_ID[id]; },
    // kind: 'count' | 'start' | 'end'; n: 3, 2 or 1 for the count; at: seconds from now
    play: function (ac, id, kind, n, at) {
      var set = BY_ID[id] || SETS[0];
      if (!ac || !set[kind]) return;
      set[kind](ac, out(ac), ac.currentTime + 0.01 + (at || 0), n);
    }
  };
})();
