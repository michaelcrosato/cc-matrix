/* Sound: everything is synthesised in code. Music comes from the song generator (01-data.js) on the engine's chip synth;
 * the engine note, tyre squeal, horn and wind are short voices fired by the race; voices are Animalese-style babble:
 * one blip per letter, pitched by the letter and the speaker. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, A = OB.game.audio, { clamp } = E;
const def = (n, v) => A.define(n, v);
def('horn', [{ wave: 'square', freq: 392, dur: .32, vol: .1 }, { wave: 'square', freq: 494, dur: .32, vol: .1 }]);
def('squeal', { wave: 'noise', freq: 2400, to: 1800, dur: .16, vol: .05 });
def('whoosh2', { wave: 'noise', freq: 900, to: 300, dur: .35, vol: .07 });
def('petal', { wave: 'triangle', freq: 'E6', dur: .09, vol: .12, arp: [0, 4, 7, 12], step: .05 });
def('request', { wave: 'pulse12', freq: 'C6', dur: .14, vol: .1, arp: [0, 7, 4, 12], step: .06 });
def('extended', { wave: 'square', freq: 'C5', dur: .12, vol: .12, arp: [0, 4, 7, 12, 16, 19], step: .07 });
def('countdown', { wave: 'square', freq: 'A4', dur: .16, vol: .14 });
def('go', { wave: 'square', freq: 'A5', dur: .5, vol: .15, arp: [0, 7], step: .1 });
def('boost', { wave: 'saw', freq: 200, to: 900, dur: .45, vol: .08 });
def('crash2', [{ wave: 'noise', freq: 600, to: 80, dur: .5, vol: .22 }, { wave: 'saw', freq: 140, to: 40, dur: .4, vol: .12 }]);
def('near', { wave: 'saw', freq: 700, to: 240, dur: .22, vol: .07 });
def('chime', { wave: 'sine', freq: 'G5', dur: .3, vol: .12, arp: [0, 5], step: .12 });
OB.sfx = (n, o) => { try { A.sfx(n, o); } catch (e) { /* audio not ready */ } };
/* ---- the engine note: short voices fired by speed ---- */
let engT = 0;
OB.engine = (dt, speed, gas, off) => {
  engT -= dt; if (engT > 0 || speed < 5) return; engT = 0.07 - Math.min(.03, speed / 12000);
  const f = 52 + speed * .62 + (gas ? 14 : 0);
  A.sfx({ wave: 'saw', freq: f, dur: .09, vol: .045 + Math.min(.03, speed / 6000) }, { vary: 0 });
  if (off) A.sfx({ wave: 'noise', freq: 400, dur: .08, vol: .04 }, { vary: 0 });
};
/* ---- music ---- */
OB.music = { cur: null };
OB.playSong = (i, fade) => { const s = OB.SONGS[i % OB.SONGS.length]; OB.music.cur = i; A.music(s, { fade: fade === undefined ? .6 : fade }); return s; };
OB.playTitle = () => { OB.music.cur = 'title'; A.music(OB.TITLE_SONG, { fade: .5 }); };
OB.stopMusic = () => { OB.music.cur = null; A.music(null); };
/* ---- voices: Animalese-style babble. A queue of blips processed every frame (game time irrelevant: real time) ---- */
const queue = []; let vt = 0;
OB.voice = {
  say(text, who, o = {}) {
    const c = OB.CAST[who] || OB.CAST.marisol, base = 300 * c.pitch * (o.pitch || 1), len = Math.min(40, text.length);
    let t = 0;
    for (let i = 0; i < len; i++) {
      const ch = text.charAt(i).toLowerCase();
      if (/[a-z]/.test(ch)) {
        const k = ch.charCodeAt(0) - 97, vowel = 'aeiou'.includes(ch);
        queue.push({ at: t, f: base * Math.pow(2, ((k * 7) % 12) / 12 + (vowel ? .05 : 0)), d: vowel ? .075 : .045, w: vowel ? 'triangle' : 'pulse12', v: o.vol || .08 });
        t += vowel ? .07 : .055;
      } else if (ch === ' ') t += .05; else if ('.,!?'.includes(ch)) t += .12;
    }
    vt = 0; queue.sort((a, b) => a.at - b.at);
  },
  update(dt) {
    if (!queue.length) return; vt += dt;
    while (queue.length && queue[0].at <= vt) { const b = queue.shift(); A.sfx({ wave: b.w, freq: b.f, to: b.f * 1.08, dur: b.d, vol: b.v }, { vary: .02 }); }
    if (!queue.length) vt = 0;
  },
  clear() { queue.length = 0; vt = 0; }
};
// the sim speaks through the bus: bangs, chimes and the passenger's babble
OB.wireRaceAudio = () => {
  OB.bus.clear();
  const B = OB.bus, say = (r, text, tone) => OB.passengerSay && OB.passengerSay(r, text, tone);
  B.on('crash', ({ race: r }) => { OB.sfx('crash2'); OB.game.shake(.5); OB.game.input.rumble(.9, .35); const p = OB.CAST[r.passId]; say(r, OB.pickOf(OB.LINES.crash, Math.random), 'scare'); });
  B.on('bump', () => { OB.sfx('bump'); OB.game.shake(.2); OB.game.input.rumble(.4, .12); });
  B.on('drift', ({ race: r, pts }) => { OB.sfx('chime'); if (pts > 900) say(r, OB.pickOf(OB.CAST[r.passId].cheer, Math.random), 'cheer'); });
  B.on('driftstart', () => OB.sfx('squeal'));
  B.on('near', ({ race: r }) => { OB.sfx('near'); if (r.stats.near % 3 === 1) say(r, OB.pickOf(OB.CAST[r.passId].scare, Math.random), 'scare'); });
  B.on('pass', () => OB.sfx('pickup', { vol: .35, pitch: 1.4 }));
  B.on('sling', () => { OB.sfx('boost'); OB.game.input.rumble(.5, .3); });
  B.on('draft', () => OB.sfx('whoosh2'));
  B.on('horn', () => OB.sfx('horn'));
  B.on('radio', ({ race: r, station }) => { OB.playSong(station, .2); OB.game.note(OB.SONGDEFS[station].station + ': ' + OB.SONGDEFS[station].name); });
  B.on('reqstart', ({ race: r, req }) => { OB.sfx('request'); say(r, req.def.text, 'ask'); });
  B.on('reqdone', ({ race: r }) => { OB.sfx('petal'); OB.sfx('powerup', { vol: .4 }); say(r, OB.pickOf(OB.LINES.win, Math.random), 'cheer'); });
  B.on('reqfail', ({ race: r }) => { OB.sfx('cancel'); say(r, OB.pickOf(OB.LINES.fail, Math.random), 'sulk'); });
  B.on('checkpoint', ({ race: r }) => { OB.sfx('extended'); OB.game.flash && OB.game.flash('#ffffff', .25); say(r, OB.pickOf(OB.CAST[r.passId].smitten, Math.random), 'cheer'); });
  B.on('go', () => OB.sfx('go'));
  B.on('timeout', () => { OB.sfx('die'); OB.stopMusic(); });
  B.on('goal', () => { OB.sfx('secret'); });
};
})();
