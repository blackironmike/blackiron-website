/* ==========================================================================
   BLACK IRON WHITEBOARD: clock sounds.
   The Shot clock: scoreboard tones for the count and the basketball horn to
   start, with five endings to choose from. Made in the browser (no audio
   files to load). Each set has:
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
  // the basketball horn: a nasal, slightly dissonant buzz
  function shotHorn(ac, dest, t, d) {
    var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.6; bp.connect(dest);
    flat(ac, bp, 'sawtooth', 311, t, 0.3, d);
    flat(ac, bp, 'sawtooth', 370, t, 0.26, d);
    flat(ac, bp, 'square', 155.5, t, 0.16, d);
  }

  // a deep arena horn (hockey style): a low chord that swells in and fades out
  function arenaHorn(ac, dest, t, d) {
    var lp = ac.createBiquadFilter(), g = ac.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 1000; lp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.06);
    g.gain.setValueAtTime(1, t + d * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + d);
    [138.6, 174.6, 207.7, 277.2].forEach(function (f, i) {
      var o = ac.createOscillator(), og = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; og.gain.value = i === 3 ? 0.12 : 0.22;
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + d + 0.05);
    });
  }
  // the scoreboard tone used for the count
  function board(ac, o, t, d) { flat(ac, o, 'triangle', 1050, t, 0.34, d); }

  // Shot clock: scoreboard tones for the count, the horn to start. Five endings.
  function shot(id, name, desc, end) {
    return { id: id, name: name, desc: desc,
      count: function (ac, o, t) { board(ac, o, t, 0.13); },
      start: function (ac, o, t) { shotHorn(ac, o, t, 0.6); },
      end: end };
  }
  var SETS = [
    shot('shot-two', 'Two honks', 'Ends on two short horns, like the end of a quarter.',
      function (ac, o, t) { shotHorn(ac, o, t, 0.42); shotHorn(ac, o, t + 0.56, 0.42); }),
    shot('shot-three', 'Three honks', 'Ends on three quick horns, like the end of the game.',
      function (ac, o, t) { [0, 0.42, 0.84].forEach(function (d) { shotHorn(ac, o, t + d, 0.28); }); }),
    shot('shot-tones', 'Tones, then honk', 'Three fast scoreboard tones, then one short horn.',
      function (ac, o, t) { [0, 0.17, 0.34].forEach(function (d) { board(ac, o, t + d, 0.1); }); shotHorn(ac, o, t + 0.56, 0.7); }),
    shot('shot-arena', 'Arena horn', 'A deeper, rounder hockey-style horn that swells and fades out.',
      function (ac, o, t) { arenaHorn(ac, o, t, 1.6); }),
    shot('shot-tone', 'Final tone', 'No horn at the end: one long scoreboard tone.',
      function (ac, o, t) { board(ac, o, t, 1.1); })
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
