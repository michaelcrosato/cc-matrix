/* COMMENTARY (section 6.17): BARRY BELLOW (play-by-play) and TREV BRICKLEY (co-commentary), on the radio box with live
 * portraits and babble voices. Each event maps to a line pool (registry 'lines'); priorities, an 8 s cooldown per
 * event, 3.5 s between lines, a higher priority interrupts, no line twice in a match, {$vars}, replies, idle chatter.
 * The PA (the stadium's announcer) has its own box at the top with a chime. */
const COMM = {
  kickoff: ['kickoff', 10], goal: ['goal', 100], ownGoal: ['ownGoal', 100], superStrike: ['super', 95], penaltyAwarded: ['penalty', 80], woodwork: ['woodwork', 70],
  var: ['var', 60], diveBooked: ['diveBooked', 55], diveWon: ['diveWon', 55], dive: ['dive', 52], save: ['save', 50], nearMiss: ['nearMiss', 45], launched: ['launched', 42], foul: ['foul', 40],
  europhoria: ['europhoria', 85], bus: ['bus', 85], busSmashed: ['busSmashed', 86], goldenMoment: ['goldenMoment', 85], half: ['halftime', 90], fulltime: ['fulltime', 90], extraTime: ['extratime', 80],
  shootoutStart: ['shootout', 80], advantage: ['advantage', 30], corner: ['corner', 15], refHit: ['refHit', 50], celebrate: ['celebrate', 35], stoppage: ['stoppage', 20], replayStart: ['replay', 20],
  nutmeg: ['nutmeg', 32], rainbow: ['skill', 30], tackleWon: ['tackle', 25], header: ['header', 45], volley: ['volley', 45], bicycle: ['bicycle', 47], sendOff: ['red', 85], keeperEarly: ['keeperEarly', 40]
};
class Commentary {
  constructor(m) {
    this.m = m; this.used = new Set(); this.cool = {}; this.lastT = -99; this.cur = 0; this.queue = []; this.idleT = 0; this.heard = 0; this.on = game.settings.commentary !== false && m.kind !== 'training';
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', speed: 36, border: '#ffc83a', bg: '#0d1430', nameColor: '#ffc83a', voice: null });
    this.pa = new E.Dialog(game, { lines: 2, place: 'top', speed: 32, border: '#9aa6c8', bg: '#16182a', nameColor: '#9aa6c8', voice: null });
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.event(ev); });
    this.paQueue = [];
  }
  dispose() { if (this.unsub) this.unsub(); this.talk.close(); this.pa.close(); }
  vars(ev) {
    const m = this.m, who = ev && ev.who && ev.who.data ? ev.who : m.lastKick || m.owner, s = who ? who.side : ev && ev.side !== undefined ? ev.side : 0, k = m.keeper(1 - s);
    return { player: who ? who.short : 'him', team: m.teams[s].short === 'KIP' ? 'Kipperton' : titleCase(m.teams[s].name), opp: titleCase(m.teams[1 - s].name), score: m.score[0] + '-' + m.score[1], minute: Math.floor(m.minute) + 1, stadium: titleCase(m.stadium.name), keeper: k ? k.short : 'the keeper', ref: titleCase(m.ref.data.name).split(' ').slice(-1)[0], city: titleCase(m.stadium.city) };
  }
  event(ev) {
    if (!this.on) return;
    const m = this.m; let map = COMM[ev.type]; if (!map) {
      if (ev.type === 'card') map = ev.color === 'red' ? ['red', 85] : ['card', 65];
      else if (ev.type === 'saveDuelResult') map = ['duel-' + ev.result, 90];
      else if (ev.type === 'event') map = ['event-' + ev.id.replace(/^invader-.*/, 'invader'), 60];
      else if (ev.type === 'shootoutKick') map = [ev.panenka && ev.scored ? 'panenka' : ev.scored ? 'shootoutScore' : 'shootoutMiss', 70];
      else if (ev.type === 'skill' && ev.kind !== 'knockon') map = ['skill', 30];
      else if (ev.type === 'invaderTackled') map = ['invaderTackled', 70];
      else if (ev.type === 'gullLand') map = ['event-seagull', 60];
      else if (ev.type === 'superSaved') map = ['superSaved', 92];
      else return;
    }
    if ((ev.type === 'header' || ev.type === 'volley') && !ev.atGoal) return;
    if (ev.type === 'tackleWon' && ev.kind !== 'slide') return;
    if (ev.type === 'goal' && ev.shootout) return;
    this.say(map[0], map[1], ev, ev.type);
  }
  /** a line from a pool, if it may speak now */
  say(pool, pri, ev, key) {
    const m = this.m, now = m.t, P0 = EF.get('lines', pool); if (!P0) return false;
    if (key && this.cool[key] > now) return false;
    if (this.talk.open && pri <= this.cur) { if (pri >= 60 && this.queue.length < 2) this.queue.push([pool, pri, ev, key]); return false; }
    if (!this.talk.open && now - this.lastT < 3.5 && pri < 60) return false;
    const vars = this.vars(ev), ok = P0.entries.filter((e, i) => !this.used.has(pool + i) && (!e.when || safeWhen(e.when, m, ev)));
    const list = ok.length ? ok : P0.entries.filter(e => !e.when || safeWhen(e.when, m, ev)); if (!list.length) return false;
    const e = EF.fxPick(list); this.used.add(pool + P0.entries.indexOf(e));
    if (key) this.cool[key] = now + 8;
    this.show(e.who, e.text, vars, pri); this.queue = this.queue.filter(q => q[1] > pri);
    if (e.reply) this.queue.unshift(['__reply', pri, { reply: e.reply, vars }, null]);
    return true;
  }
  show(who, text, vars, pri) {
    this.cur = pri; this.lastT = this.m.t; this.idleT = 0; this.heard++;
    this.talk.say(H.fill(text, vars), { name: EF.Cast.name(who), portrait: EF.Cast.rig(who), portraitSize: 30, portraitOpts: { zoom: 3, turn: .35 }, auto: 1.8, modal: false, alpha: .86, voice: EF.babble.voiceFor(who) });
    EF.bus.emit('commentaryLine', { who, match: this.m });
  }
  /** the PA: "ding-dong", a line at the top in the announcer's echoing voice */
  announce(text) { this.paQueue.push(text); }
  update(dt) {
    this.talk.update(dt); this.pa.update(dt);
    // the PA: a slim strip under the score bug, typed out with the announcer's echoing voice
    const S = this.paStrip;
    if (S) { const was = Math.floor(S.shown); S.shown = Math.min(S.text.length, S.shown + dt * 30); for (let i = was; i < Math.floor(S.shown); i++) EF.babble.syllable(EF.Cast.voice('pa'), S.text[i], i, S.text); S.t += dt; if (S.t > S.text.length / 30 + 2.6) this.paStrip = null; }
    else if (this.paQueue.length) { const t = this.paQueue.shift(); EF.sfx('ding'); this.paStrip = { text: t, shown: 0, t: 0 }; }
    if (!this.on) return;
    if (!this.talk.open) {
      this.cur = 0;
      const q = this.queue.shift();
      if (q) { if (q[0] === '__reply') this.show(q[2].reply.who, q[2].reply.text, q[2].vars, q[1]); else this.say(q[0], q[1], q[2], null); }
      else if (this.m.mode === 'play') { this.idleT += dt; if (this.idleT > 12) { this.idleT = 0; this.idle(); } }
    }
  }
  idle() {
    const m = this.m, w = m.weather && m.weather.kind, pools = ['idle', 'idle-' + m.stadium.id];
    if (w) pools.push('weather-' + w); else if (m.timeOfDay === 'day') pools.push('weather-sun');
    if (m.fog > .3) pools.push('weather-fog');
    if (m.score[0] !== m.score[1]) pools.push('idle-lead');
    for (const p of H.shuffle(EF.fxRng, pools)) if (this.say(p, 5, {}, null)) return;
  }
  draw(r) {
    if (this.on || this.talk.open) this.talk.draw(r);
    const S = this.paStrip; if (!S) return;
    r.overlay(g => { const mx = Math.max(6, Math.round(r.W * .035)), y = Math.max(5, Math.round(r.H * .035)) + 34, w = Math.min(r.W - 2 * mx - 110, 300), lines = E.font.wrap('PA  ' + S.text, w - 8); E.ui.box(g, mx, y, w, 6 + lines.length * 9, { bg: '#16182a', border: '#5a6a8a', alpha: .82 }); let n = Math.floor(S.shown) + 4; lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, n)); n -= ln.length + 1; E.font.text(g, part, mx + 4, y + 3 + i * 9, i === 0 ? '#c8d0e8' : '#c8d0e8', { outline: false }); }); E.font.text(g, 'PA', mx + 4, y + 3, '#ffc83a', { outline: false }); });
  }
}
const titleCase = s => String(s).toLowerCase().replace(/(^|[\s'-])([a-zà-ü])/g, (a, b, c) => b + c.toUpperCase());
const safeWhen = (fn, m, ev) => { try { return !!fn(m, ev || {}); } catch (e) { return false; } };
EF.Commentary = Commentary;
EF.titleCase = titleCase;
