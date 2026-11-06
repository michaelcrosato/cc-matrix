// Music: tracks by id, with crossfades, layers added by phase, and tempo rising as vitals fall. Never carries information.
(() => {
const G = (window.GAME ||= {});
const Music = G.Music = {
  game: null, cur: null, baseBpm: 0, thin: false,
  init(game) {
    Music.game = game; const a = game.audio;
    a.instrument('pluck', (ctx, bus, time, freq, dur, vol) => {   // a piano-like pluck for the ward
      for (const [m, v, d] of [[1, 1, 1], [2, .35, .6], [3, .12, .4]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = freq * m; g.gain.setValueAtTime(vol * v, time); g.gain.exponentialRampToValueAtTime(.0005, time + Math.max(.12, dur * 1.8) * d); o.connect(g); g.connect(bus); o.start(time); o.stop(time + Math.max(.2, dur * 2) * d); }
    });
  },
  play(id, o = {}) { const a = Music.game && Music.game.audio; if (!a) return; if (Music.cur === id && !o.restart) return; const s = id ? G.SONGS[id] : null; Music.cur = id; Music.baseBpm = s ? s.bpm : 0; Music.thin = false; if (!s) { a.music(null); return; } a.music(s, { fade: o.fade ?? .8 }); },
  stop() { Music.play(null); },
  sting(id) { const a = Music.game.audio, s = G.SONGS[id]; if (a.sting && s) a.sting(s); },
  layer(name, on, fade = 1) { const a = Music.game.audio, s = G.SONGS[Music.cur]; if (a.layer && s && s.tracks.some(t => t.name === name)) a.layer(name, on ? 1 : 0, fade); },
  /** op tempo: rises as vitals fall */
  tempoFor(vitals) { const a = Music.game.audio; if (!a.tempo || !Music.baseBpm || Music.thin) return; const k = 1 + Math.max(0, (50 - vitals)) / 50 * .22, want = Math.round(Music.baseBpm * k); if (want !== Music._t) { Music._t = want; a.tempo(want); } },
  /** Long Breath: thin to bass only, half tempo */
  breath(on) { const a = Music.game.audio; if (!Music.cur || !G.SONGS[Music.cur]) return; const s = G.SONGS[Music.cur]; Music.thin = on; for (const t of s.tracks) { if (t.name && t.name !== 'bass') a.layer && a.layer(t.name, on ? 0 : (t.on === false && !Music.layersOn[t.name] ? 0 : 1), .3); } if (a.tempo) a.tempo(on ? Music.baseBpm / 2 : Music.baseBpm); Music._t = 0; },
  layersOn: {},
  setLayer(name, on) { Music.layersOn[name] = on; Music.layer(name, on); },
};
})();
