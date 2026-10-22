/* ==========================================================================
   BLACK IRON WHITEBOARD: clock sounds.
   Five sets, all made in the browser (no audio files to load). Each set has:
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

  // a strike on a bell: a few inharmonic partials that ring out
  function bell(ac, dest, t, f, len) {
    var parts = [[1, 0.34, 1], [2.76, 0.17, 0.6], [5.4, 0.09, 0.35], [8.93, 0.05, 0.2]];
    for (var i = 0; i < parts.length; i++) tone(ac, dest, 'sine', f * parts[i][0], t, 0.002, parts[i][1], len * parts[i][2]);
    noise(ac, dest, t, 0.02, 0.12, 4000);
  }
  // the wall-timer buzzer: two detuned saws and a low square through a lowpass
  function buzz(ac, dest, t, len) {
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.connect(dest);
    tone(ac, lp, 'sawtooth', 196, t, 0.01, 0.22, len);
    tone(ac, lp, 'sawtooth', 294, t, 0.01, 0.16, len);
    tone(ac, lp, 'square', 98, t, 0.01, 0.12, len);
  }
  // an air horn: detuned saws through a bandpass, dropping a touch at the end
  function horn(ac, dest, t, len) {
    var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 0.7; bp.connect(dest);
    [233, 236.5, 466, 470].forEach(function (f, i) {
      var o = tone(ac, bp, 'sawtooth', f, t, 0.03, i < 2 ? 0.3 : 0.16, len);
      o.frequency.setValueAtTime(f, t + len * 0.75);
      o.frequency.linearRampToValueAtTime(f * 0.94, t + len);
    });
  }
  var RISE = { 3: 523.25, 2: 659.25, 1: 783.99 };

  var SETS = [
    { id: 'gym', name: 'Gym timer', desc: 'Clean electronic beeps, like most wall timers. What the board uses today.',
      count: function (ac, o, t) { tone(ac, o, 'square', 880, t, 0.005, 0.22, 0.16); },
      start: function (ac, o, t) { tone(ac, o, 'square', 1250, t, 0.005, 0.24, 0.7); },
      end:   function (ac, o, t) { tone(ac, o, 'square', 1250, t, 0.005, 0.24, 1.3); } },

    { id: 'buzzer', name: 'Buzzer', desc: 'Sharp beeps for the count, a heavy wall-timer buzzer to start and finish.',
      count: function (ac, o, t) { tone(ac, o, 'square', 1050, t, 0.004, 0.2, 0.12); },
      start: function (ac, o, t) { buzz(ac, o, t, 0.9); },
      end:   function (ac, o, t) { buzz(ac, o, t, 1.8); } },

    { id: 'bell', name: 'Fight bell', desc: 'Wood-block ticks for the count, one bell to start, three bells to finish.',
      count: function (ac, o, t) { tone(ac, o, 'sine', 1750, t, 0.001, 0.4, 0.07); noise(ac, o, t, 0.025, 0.16, 3000); },
      start: function (ac, o, t) { bell(ac, o, t, 620, 2.4); },
      end:   function (ac, o, t) { bell(ac, o, t, 620, 1.2); bell(ac, o, t + 0.32, 620, 1.2); bell(ac, o, t + 0.64, 620, 2.6); } },

    { id: 'rise', name: 'Step up', desc: 'The count climbs three notes, lands on a bright chord, and steps back down at the end.',
      count: function (ac, o, t, n) { tone(ac, o, 'triangle', RISE[n] || 523.25, t, 0.006, 0.36, 0.28); },
      start: function (ac, o, t) { [1046.5, 1318.5, 1568].forEach(function (f) { tone(ac, o, 'triangle', f, t, 0.006, 0.22, 0.85); }); },
      end:   function (ac, o, t) {
        [1568, 1318.5, 1046.5].forEach(function (f, i) { tone(ac, o, 'triangle', f, t + i * 0.14, 0.006, 0.26, 0.2); });
        [523.25, 783.99, 1046.5].forEach(function (f) { tone(ac, o, 'triangle', f, t + 0.45, 0.01, 0.2, 1.4); });
      } },

    { id: 'horn', name: 'Air horn', desc: 'Low blips for the count, an air horn to start, a double blast to finish.',
      count: function (ac, o, t) { tone(ac, o, 'triangle', 440, t, 0.004, 0.32, 0.12); },
      start: function (ac, o, t) { horn(ac, o, t, 0.8); },
      end:   function (ac, o, t) { horn(ac, o, t, 0.45); horn(ac, o, t + 0.62, 1.3); } }
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
