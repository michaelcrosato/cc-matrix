// Plays the score through the engine's music clock, with named layers and crossfades. Long Breath thins it to the bass at half tempo.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
class Music {
  constructor(game) { this.game = game; this.cur = null; this.base = 0; const A = game.audio; if (A.instrument) A.instrument('pluck', (ctx, bus, time, freq, dur, vol) => { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = freq; o2.frequency.value = freq * 2.001; lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, time); lp.frequency.exponentialRampToValueAtTime(700, time + .5); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(vol, time + .005); g.gain.exponentialRampToValueAtTime(.0008, time + Math.max(.5, dur * 1.4)); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(bus); o.start(time); o2.start(time); o.stop(time + Math.max(.55, dur * 1.5)); o2.stop(time + Math.max(.55, dur * 1.5)); }); }
  play(id, fade = .8) { if (this.cur === id) return; this.cur = id; const A = this.game.audio; if (!id) { A.music(null); return; } const s = G.SONGS[id]; this.base = s.bpm; A.music(s, { fade }); this.thin = false; }
  sting(id) { const A = this.game.audio; if (A.sting) A.sting(G.SONGS[id], { duck: .3 }); }
  layer(n, v, f = .6) { const A = this.game.audio; if (A.layer && this.cur) { try { A.layer(n, v, f); } catch (e) { /* the song has no such layer */ } } }
  setThin(on) { if (this.thin === on || !this.cur) return; this.thin = on; const A = this.game.audio, s = G.SONGS[this.cur]; if (!s) return; for (const t of s.tracks) if (t.name && t.name !== 'bass') this.layer(t.name, on ? 0 : (t.on === false ? this.layerOn && this.layerOn[t.name] ? 1 : 0 : 1), .3); if (A.tempo) A.tempo(on ? this.base / 2 : this.base); }
  // tempo rises as vitals fall; layers come in by phase
  opUpdate(v, phaseI) { const A = this.game.audio; if (this.thin || !this.cur) return; if (this.cur === 'op') { this.layerOn = { lead: phaseI >= 1, drums: phaseI >= 2 }; if (this._ph !== phaseI) { this._ph = phaseI; this.layer('lead', phaseI >= 1 ? 1 : 0); this.layer('drums', phaseI >= 2 ? 1 : 0); } } const tgt = Math.round(this.base * (v < 50 ? 1 + (50 - v) * .004 : 1)); if (A.tempo && tgt !== this._t) { this._t = tgt; A.tempo(tgt); } }
  stop() { this.cur = null; this.game.audio.music(null); }
}
G.Music = Music;
})();
