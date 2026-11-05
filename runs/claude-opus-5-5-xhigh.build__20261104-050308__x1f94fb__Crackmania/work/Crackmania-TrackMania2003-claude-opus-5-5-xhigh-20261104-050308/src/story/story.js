// CRACKMANIA story (PLAN §8.2, §8.3): the characters (E.Humanoid rigs: portraits in dialogs, cards in the world), the
// beats (each fires once, recorded in the profile), first-time tips, results quips. Delivered with E.Dialog; each
// letter voiced by the babble (audio/babble.js) as it types. Terse and cheeky, as TrackMania's text is
import { ctx, E } from '../ctx.js';
import { labelOf } from '../ui/glyphs.js';
import { Babble } from '../audio/babble.js';
export const CAST = {
  coco: { name: 'COCO', voice: 'coco', rig: () => new E.Humanoid({ build: 'heroic', weapon: null, hair: 'ponytail', hat: { style: 'helmet', color: '#ffd030' }, outfit: 'coat', colors: { skin: '#f0c8a0', hair: '#5a2a1a', cloth: '#ff7a1a', coat: '#ff7a1a', trim: '#f4f4c0', pants: '#2a3a5a', boot: '#3a2a1a', hat: '#ffd030' } }) },
  drapeau: { name: 'MONSIEUR DRAPEAU', voice: 'drapeau', rig: () => new E.Humanoid({ build: 'chibi', weapon: null, hat: { style: 'cap', color: '#1a1a22' }, colors: { skin: '#f0c8a0', hair: '#3a2a20', cloth: '#f4f4f4', pants: '#1a1a22', hat: '#1a1a22' } }) },
  tex: { name: 'TEX MIRAGE', voice: 'tex', color: '#ff8a2a', rig: () => new E.Humanoid({ weapon: null, hat: { style: 'cap', color: '#c8a070' }, cape: { len: 5, width: 5, seg: 2.5 }, colors: { skin: '#e0b088', hair: '#6a4a2a', cloth: '#c84a2a', cape: '#e8a040', capeIn: '#a85a2a', pants: '#4a3a2a', hat: '#c8a070' } }) },
  gravillon: { name: 'MLLE GRAVILLON', voice: 'gravillon', color: '#a86ae8', rig: () => new E.Humanoid({ weapon: null, hair: 'long', hat: { style: 'band', color: '#3a3a48' }, outfit: 'coat', colors: { skin: '#f4d4bc', hair: '#2a1a2a', cloth: '#7a4ae8', coat: '#7a4ae8', trim: '#ffffff', pants: '#2a2a3a', hat: '#3a3a48' } }) },
  bobo: { name: 'BOBO YETI', voice: 'bobo', color: '#e8f0ff', rig: () => new E.Humanoid({ build: 'bulky', weapon: null, hood: true, colors: { skin: '#c8d0e0', hair: '#f4f8ff', cloth: '#e8f0ff', pants: '#c8d0e0', boot: '#8a92a0' } }) }
};
const rigs = {};
export const portrait = who => rigs[who] || (rigs[who] = CAST[who].rig());
/** the beats: [who, line] lists */
export const BEATS = {
  welcome: [['coco', 'Bonjour! I am Coco Asphalte. I build tracks.'], ['coco', 'You drive them. Fast. Then faster.'], ['coco', 'Beat my clock and I pay you in coppers. Allez!']],
  firstMedal: [['coco', 'A medal! I knew you were not just a passenger.']],
  puzzles: [['coco', 'I built a track and lost some pieces.'], ['coco', 'Find a way from start to finish. The fastest way wins.']],
  survival: [['tex', 'Three ghosts. One road.'], ['gravillon', 'Finish last, go home.'], ['bobo', 'Hrrm. Bobo is hungry.']],
  hedgerow: [['coco', 'A farmer called. He wants a race track in his cabbage field.'], ['coco', 'I said yes before he finished.']],
  frostpeak: [['coco', 'Next: the mountain. The asphalt is frozen. So am I. Allez!']],
  editor: [['coco', 'My toolbox. Every block costs coppers.'], ['coco', 'A track counts only once you drive it, start to finish.']],
  puzzleTip: [['coco', 'Fixed pieces have a lock. The rest is in your toolbox.'], ['coco', 'Build a road from start to finish, through every checkpoint.'], ['coco', 'Then press {test} to validate it. Voila.']],
  cracked: [['coco', 'You cracked {ENV}. I will need more asphalt.']],
  ending: [['coco', 'Fifteen tracks. Fifteen golds. The clock is crying in a corner.'], ['coco', 'Now build your own. I will be watching. With a stopwatch.']],
  hotseat: [['coco', 'No peeking at the other times.']],
  gauntletCleared: [['tex', '...We will haunt you next season.'], ['gravillon', '...We will haunt you next season.'], ['bobo', '...We will haunt you next season.']]
};
export const TIPS = {
  D1: [['start', 'Hold {gas} to go. Steer with {steer}.'], ['cp', 'Checkpoints remember you. {respawn} puts you back there.'], ['late', '{restart} starts again. Nobody is watching. Except the clock.']],
  D2: [['kicker', 'Jumps need speed. The canyon does not negotiate.']],
  D3: [['loop', 'Loops love speed. Keep your foot down.']]
};
export const QUIPS = { 0: ['The clock wins this round. Again?', 'Bof. The clock is laughing.', 'Again. Faster. Allez.'], 1: ['Bronze. The colour of honest effort.', 'Bronze! Shiny-ish.'], 2: ['Silver! Almost shiny enough.', 'Silver. Gold is just over there.'], 3: ['Gold. Coco approves.', 'Gold! Voila.'], 4: ['You beat my own time. Rude. Magnificent.'] };
export const RIVAL_QUIPS = { rankup: [['gravillon', 'Not bad. For a living person.'], ['bobo', 'Bobo likes you. Bobo still wins.'], ['tex', 'Lucky. Do it twice.']], out: [['tex', 'Go home, rookie. Take the scenic route.']], stay: [['gravillon', 'Hm. Average. Like your lines.'], ['bobo', 'Bobo saw that. Bobo is not scared.']] };
/** fill {gas}-style words from the player's controls */
export function fill(text, vars = {}) {
  const I = ctx.game.input, dev = I.lastDevice;
  return text.replace(/\{(\w+)\}/g, (m, k) => {
    if (vars[k] !== undefined) return vars[k];
    if (k === 'steer') return dev === 'gamepad' ? 'the left stick' : (labelOf('left') + '/' + labelOf('right'));
    if (k === 'test') return labelOf('test', I) || 'T';
    try { const l = labelOf(k, I); if (l) return l; } catch (e) { /* not an action here */ }
    return m;
  });
}
export class Talk {
  constructor(game) { this.game = game; this.dlg = new E.Dialog(game, { voice: null, speed: 17, lines: 2, bg: '#141030', border: '#ffd060', nameColor: '#ffd060' }); this.queue = []; this.who = null; this.babble = new Babble(game); ctx.babble = this.babble; this.modal = true; }
  get open() { return this.dlg.open; }
  /** a scene of lines [[who, text]]; o: { modal (true), auto (seconds a line stays, for tips), onDone, vars } */
  scene(lines, o = {}) { this.queue.push({ lines: lines.slice(), o }); if (!this.dlg.open && !this.cur) this._next(); }
  /** a beat that fires once (recorded in the profile) */
  beat(id, o = {}) { if (ctx.profile.seen(id)) { if (o.onDone) o.onDone(); return false; } ctx.profile.mark(id); this.scene(BEATS[id], o); return true; }
  _next() {
    const sc = this.cur || this.queue.shift(); this.cur = sc; if (!sc) return;
    const ln = sc.lines.shift();
    if (!ln) { this.cur = null; const f = sc.o.onDone; if (f) f(); if (this.queue.length) this._next(); return; }
    const [who, text] = ln, C = CAST[who]; this.who = who;
    this.dlg.say(fill(text, sc.o.vars), { name: C.name, portrait: portrait(who), portraitSize: 44, modal: sc.o.modal !== false, auto: sc.o.auto || 0, place: sc.o.place || (sc.o.modal === false ? 'top' : 'bottom'), onDone: () => this._next() });
    this.modal = sc.o.modal !== false;
  }
  skip() { this.queue.length = 0; if (this.cur) { const f = this.cur.o.onDone; this.cur = null; this.dlg.open = false; if (f) f(); } }
  /** each step: types and voices; true while a modal box holds the game */
  update(dt) {
    if (!this.dlg.open) { if (this.cur || this.queue.length) this._next(); return false; }
    if (this.modal && this.game.input.pressed('cancel')) { this.skip(); this.game.input.consumeAll(); return true; }
    const before = Math.floor(this.dlg.shown); this.dlg.update(dt); const after = Math.floor(this.dlg.shown);
    if (after > before) { const page = this.dlg._page.join(''); for (let i = before; i < after; i++) if (i % 2 === 0) this.babble.letter(page[i], CAST[this.who] ? CAST[this.who].voice : 'coco'); }
    return this.dlg.open && this.modal;
  }
  draw(r) { if (this.dlg.open) this.dlg.draw(r); }
}
