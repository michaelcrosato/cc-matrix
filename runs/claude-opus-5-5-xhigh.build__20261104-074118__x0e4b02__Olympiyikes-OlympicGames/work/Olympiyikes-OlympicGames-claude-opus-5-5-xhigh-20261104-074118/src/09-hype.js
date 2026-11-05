// Hype and failure as a show: O.Crowd (how excited the stands are, the wave), O.Yikes (the giant comic stamp, the
// descending trombone, the gasp, sympathy hype), O.Stamps (big words over the screen) and the record burst.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp } = E;

O.Crowd = {
  level: .3, base: .3, wave: -1, waveT: 0,
  set(v) { this.base = clamp(v, 0, 1); },
  bump(v) { this.level = Math.max(this.level, clamp(v, 0, 1)); },
  startWave() { this.waveT = 0; this.wave = 0; },
  update(rdt) { this.level += (this.base - this.level) * Math.min(1, rdt * .6); if (this.wave >= 0) { this.waveT += rdt; this.wave = this.waveT / 2.5; if (this.wave > 1.2) this.wave = -1; } }
};
O.updaters.push(rdt => O.Crowd.update(rdt));

// big words over the screen: { word, t, dur, colors, scale, y }
O.Stamps = {
  list: [],
  add(word, o = {}) { if (O.sandbox) return; this.list.push(Object.assign({ word, t: 0, dur: o.dur || 1.6 }, o)); if (this.list.length > 2) this.list.shift(); },
  update(rdt) { for (const s of this.list) s.t += rdt; this.list = this.list.filter(s => s.t < s.dur); },
  draw(g, W, H) { for (const s of this.list) { if (s.burst) O.Stamps.burst(g, W, H, s); O.UI.stamp(g, W, H, s.word, s.t, s); if (s.sub) { const a = Math.min(1, s.t / .25); if (a > .5) O.UI.text(g, s.sub, W / 2 - O.UI.tw(s.sub, 2) / 2, (s.y || H * .32) + 34, '#ffffff', { scale: 2 }); } } },
  burst(g, W, H, s) {   // rays and stars behind a world record
    const cx = W / 2, cy = (s.y || H * .32) + 14, t = s.t, n = 16;
    px.blend(g, .35 * Math.max(0, 1 - t / s.dur), 'add', () => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * .8, a2 = a + .12, r = 260; px.poly(g, [[cx, cy], [cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a2) * r, cy + Math.sin(a2) * r]], i % 2 ? '#ffd23a' : '#ff7a1a'); } });
    for (let i = 0; i < 10; i++) { const a = i * 2.4 + t * 2, r = 40 + (t * 120 + i * 17) % 120; O.Art.star(g, cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * .7, 3 + (i % 3), '#fff6c8'); }
  }
};
O.updaters.push(rdt => O.Stamps.update(rdt));
O.overlays.push((r, g) => O.Stamps.draw(g, r.W, r.H));

const WORDS = { falsestart: 'FALSE START!', faceplant: 'FACEPLANT!', foul: 'FOUL!', flat: 'FLAT!', bellyflop: 'BELLY FLOP!', flopstart: 'BELLY FLOP START!', gasp: 'GASP!', bonk: 'BONK!', wrongway: 'BACK SLAP!', stringslap: 'STRING SLAP!', drop: 'DROPPED IT!', table: 'FELL OFF THE TABLE!', crash: 'CRASH!', netting: 'INTO THE NETTING!', lateload: 'LATE LOAD!', flip: 'FLIPPED!', fall: 'FALL!', slip: 'OVER-THROW SLIP!', owngoal: 'OWN GOAL!', glass: 'INTO THE GLASS!', dq: 'DISQUALIFIED!' };
O.Yikes = {
  WORDS,
  /** a wipeout: stamp, trombone, gasp, a commentary cue, the nation's yikes count, sympathy hype */
  trigger(a, kind, o = {}) {
    if (!a) return;
    if (a.state) a.state.yikes = (a.state.yikes || 0) + 1;
    a.yikesN = (a.yikesN || 0) + 1;
    a.hype = clamp((a.hype || 0) + O.G.yikesHype, 0, 1);
    O.bus.emit('yikes', { a, kind });
    if (O.sandbox) return;
    if (O.meet && O.meet.mode !== 'attract' && a.nation) { const y = O.meet.yikes || (O.meet.yikes = {}); y[a.nation] = (y[a.nation] || 0) + 1; }
    if (o.quiet) return;
    O.Stamps.add(WORDS[kind] || kind.toUpperCase(), { dur: 1.7, colors: ['#ffffff', '#ffe066', '#ff7a1a', '#e02a2a'], sub: o.sub || 'OLYMPIYIKES!' });
    O.Music.sting('yikes'); O.CrowdAudio.gasp();
    if (!game.settings.motion) game.shake(3);
    O.Comms.cue(o.cue || kind, { name: a.name, nation: a.nationName }, { prio: 4 }) || O.Comms.cue('yikes', { name: a.name, nation: a.nationName }, { prio: 4, event: null });
  }
};
O.recordBurst = (word, sub) => { if (O.sandbox) return; O.Stamps.add(word, { dur: 2.6, burst: true, colors: ['#ffffff', '#fff1a8', '#f2c94c', '#c8901a'], sub }); O.Music.sting('wr'); O.CrowdAudio.cheer(); O.Crowd.startWave(); };
})();
