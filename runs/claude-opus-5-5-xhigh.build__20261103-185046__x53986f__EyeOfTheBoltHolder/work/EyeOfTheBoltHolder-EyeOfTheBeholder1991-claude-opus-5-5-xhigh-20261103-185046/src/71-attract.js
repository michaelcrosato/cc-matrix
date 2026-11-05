/* =====================================================================================
 * 71-attract: after 10 s idle on the title (or its screens), a looping demo: vignettes of the game played by the bot with
 * cheats (a level 5 party of six that knows every spell). Any input ends it at once. It never touches the player's game,
 * saves, settings or Dev storage.
 * ===================================================================================== */
const VIGNETTES = [
  { name: 'The Drains', floor: 'f1', at: [2, 14, 0], seconds: 18, steps: [['take', 2, 13, 'rustyDagger'], ['use', 2, 11, 'E'], ['go', 2, 9], ['clear', 'channel'], ['use', 1, 6, 'W'], ['wait', 3]] },
  { name: 'Latchkins', floor: 'f1', at: [2, 4, 0], seconds: 16, choices: { tamsin: 1 }, steps: [['go', 2, 2], ['clear', 'den'], ['use', 5, 2, 'E'], ['wait', 6]] },
  { name: 'Stones and plates', floor: 'f1', at: [12, 6, 1], seconds: 14, setup() { S.party.hand = B.mkItem('rock'); for (const m of FL().mons) if (m.type === 'leech') m.hp = 0; }, steps: [['put', 13, 6, 'E', null], ['wait', 1.2], ['go', 16, 6], ['go', 10, 8], ['go', 9, 9], ['go', 9, 10], ['wait', 2]] },
  { name: 'Spellcraft', floor: 'f2', at: [6, 1, 1], seconds: 14, setup() { S.party.members[1].hp = Math.ceil(S.party.members[1].max / 2); for (const m of FL().mons) if (m.cx >= 8 && m.cx <= 12 && m.cy <= 3) { m.aware = true; m.st = 'hunt'; } }, steps: [['cast', 'sparkDart'], ['wait', 1.2], ['cast', 'blazingOrb'], ['wait', 1.5], ['cast', 'mend', 1], ['clear', 'workshop']] },
  { name: 'The Party screen', floor: 'f1', at: [5, 13, 0], seconds: 12, ui: true, setup() { const m = S.party.members[0]; m.pack[0] = B.mkItem('longSword'); } },
  { name: 'Clockwork', floor: 'f2', at: [10, 6, 1], seconds: 14, setup() { const fl = FL(); for (const id of ['M1', 'G7']) { fl.doors[id].want = 1; fl.doors[id].open = 1; fl.doors[id].locked = false; } for (const m of fl.mons) if (m.type === 'sentinel') { m.aware = true; m.st = 'hunt'; } }, steps: [['cast', 'forkedLightning'], ['wait', 1.6], ['cast', 'forkedLightning'], ['clear', 'vault']] },
  { name: 'The Gauntlet', floor: 'f3', at: [6, 8, 1], seconds: 14, setup() { for (const m of FL().mons) if (m.type === 'hound' && m.cx < 6) m.hp = 0; }, steps: [['gauntlet'], ['clear', 'gauntlet']] },
  { name: 'The Bolt-Holder', floor: 'f4', at: [6, 6, 0], seconds: 22, setup() { const fl = FL(); for (const m of fl.mons) if (m.type === 'golem' || m.type === 'gazer') { m.hp = 0; m.dead = 5; } fl.doors.G10.want = 1; fl.doors.G10.open = 1; }, steps: [['boss']] },
  { name: 'Title', title: true, seconds: 5 }
];
const Attract = {
  on: false, saved: null, vi: 0, t: 0, bot: null, from: null, talkT: 0, lastCell: '', still: 0,
  V: VIGNETTES,
  begin() {
    this.saved = S ? JSON.stringify(B.serialize()) : null; this.savedCheats = Object.assign({}, B.CHEATS); this.savedT = Object.assign({}, B.T); this.savedHints = B.opt.hints;
    this.on = true; this.vi = 0; this.keyAt = B._keyAt; B.opt.hints = false; this.start(0);
  },
  start(i) {
    const v = this.V[i]; this.vi = i; this.t = 0; this.still = 0; this.talkT = 0; UI.closeAll();
    if (v.title) { Sound.music('title'); return; }
    Object.assign(B.CHEATS, { god: true, infiniteSpells: true, noHunger: true, noclip: false, reveal: false, oneHit: false, freeze: false });
    B.newGame({ mode: 'demo', party: 'demo', seed: 900 + i });
    if (v.floor !== 'f1') B.goFloor(v.floor, v.at); else { const P = S.party; [P.cx, P.cy, P.dir] = v.at; P.at = [P.cx, P.cy]; B._fovKey = null; B.look(); }
    S.events.length = 0;
    if (v.setup) v.setup();
    B.view.enter(S.floor);
    this.bot = v.steps ? B.Bot.make(v.steps, { choices: v.choices || {}, timeout: 9, noDodge: false, cheat: true }) : null;
    Sound.song = null; Sound.floorSong();
  },
  next() { this.start((this.vi + 1) % this.V.length); },
  step(dt) {
    const v = this.V[this.vi]; this.t += dt;
    if (this.t >= v.seconds) { this.next(); return; }
    if (v.title) return;
    try {
      let cmds = [];
      if (v.ui) cmds = this.uiScript(dt);
      else if (S.talk) { this.talkT += dt; if (this.talkT > (S.talk.choices ? 1.4 : 2.6)) { this.talkT = 0; cmds = B.Bot.tick(this.bot, dt); } }
      else cmds = B.Bot.tick(this.bot, dt);
      B.update(dt, cmds, dt);
      Play.dispatch(S.events);
      B.view.step(dt); B.view.tickFx(dt);
      if (S.talk) PlayTalk.update(0);
      // a stall (nowhere to go, nothing happening) skips ahead
      const cell = S.party.cx + ',' + S.party.cy + ',' + S.party.dir;
      if (cell === this.lastCell && !S.combat && !S.talk && !S.moment && !S.party.busy && !(v.ui)) this.still += dt; else this.still = 0; this.lastCell = cell;
      if (this.still > 4 || (this.bot && this.bot.done && this.t > 2)) { if (this.still > 4 || this.t > v.seconds - 1.5) this.next(); }
    } catch (e) { game.fail('attract ' + v.name, e); this.next(); }
  },
  /** the Party screen vignette: a script of what a player does there */
  uiScript(dt) {
    const t = this.t, at = s => t - dt < s && t >= s, out = [];
    if (at(.8)) UI.open('party', { m: 0 });
    if (at(1.8)) SCREENS.party.focus = 'p0';
    if (at(2.6)) { SCREENS.party.slotAct(0); }
    if (at(3.6)) SCREENS.party.focus = 'smain';
    if (at(4.4)) SCREENS.party.slotAct('main');
    if (at(5.4)) SCREENS.party.focus = 'p0';
    if (at(6.2)) SCREENS.party.slotAct(0);
    if (at(7.2)) { SCREENS.party.focus = 't1'; SCREENS.party.m = 1; }
    if (at(8.2)) UI.closeAll();
    if (at(8.8)) UI.open('map');
    if (at(11.4)) UI.closeAll();
    return out;
  },
  end() {
    this.on = false; UI.closeAll();
    Object.assign(B.CHEATS, this.savedCheats || {}); Object.assign(B.T, this.savedT || {}); B.opt.hints = this.savedHints;
    if (this.saved) B.load(JSON.parse(this.saved)); else B.setState(null);
    if (S) B.view.enter(S.floor);
  },
  /** any input: a button, a key, a stick, the mouse moving or a click (a tap) */
  input(allowMove = true) { const I = game.input, pt = I.pointer && I.pointer(); const moved = pt && this._pt && Math.hypot(pt[0] - this._pt[0], pt[1] - this._pt[1]) > 4; if (pt) this._pt = pt.slice(); const key = B._keyAt !== this.keyAt; this.keyAt = B._keyAt; return key || I.anyPressed() || I.held.size > 0 || !!I.clicked() || (allowMove && moved) || Math.hypot(...(I.padMove || [0, 0])) > .3; }
};
B.Attract = Attract;
