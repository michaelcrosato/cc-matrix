/* ---- VOICES: Animalese-style babble, one syllable a letter in each speaker's own wave and pitch; and the commentary
 * director, who listens to the match and hands Barry and Ros their lines ---- */
const VOICES = TT.VOICES = {
  barry: { wave: 'square', base: 330, speed: 1.2, vol: .07 },
  ros: { wave: 'triangle', base: 220, speed: .9, vol: .16 },
  gristle: { wave: 'saw', base: 140, speed: .9, vol: .07, octave: true },
  nigel: { wave: 'pulse12', base: 260, speed: 1.1, vol: .07 },
  dave: { wave: 'triangle', base: 160, speed: .85, vol: .18 },
  nan: { wave: 'pulse', base: 380, speed: 1, vol: .06, vib: [9, .04] },
  rupert: { wave: 'square', base: 200, speed: .75, vol: .06 },
  unit: { wave: 'saw', base: 70, speed: .6, vol: .1 },
  pa: { wave: 'square', base: 180, speed: .9, vol: .06, echo: true },
  choir: { wave: 'triangle', base: 260, speed: .8, vol: .1, choir: true },
  player: { wave: 'pulse', base: 200, speed: 1, vol: .06 }
};
TT.voiceFor = who => {
  if (VOICES[who]) return VOICES[who];
  const s = TT.SPEAKERS[who];
  if (Array.isArray(s)) { const d = TT.TEAMS[s[0]].roster[s[1]]; if (d.voice && VOICES[d.voice]) return VOICES[d.voice]; return TT.playerVoice(d); }
  return VOICES.player;
};
/** a player's voice: pitch from his size and build */
TT.playerVoice = d => ({ wave: d.build === 'bulky' ? 'saw' : 'pulse', base: clamp(300 - (d.size - 1) * 260 - (d.build === 'bulky' ? 40 : 0), 80, 300), speed: 1, vol: .06 });
const VOWELS = 'aeiouy';
TT.babble = {
  t: 0, last: 0,
  /** one letter of speech: letters map to semitones (vowels lower and longer), capitals louder and higher, a rise before ?, a jump on ! */
  letter(ch, v, i, text) {
    if (!TT.sound || !TT.sound.ready || TT.muted) return;
    if (!/[a-z0-9]/i.test(ch)) return;
    const game = TT.game; if (!game || game.settings.commentary === 'Off' && v !== VOICES.choir && !this.story) return;
    const low = ch.toLowerCase(), vow = VOWELS.includes(low), code = low.charCodeAt(0);
    let semi = vow ? -2 + (code % 3) : (code * 7) % 9 - 2;
    const caps = ch !== low && /[A-Z]/.test(ch);
    if (caps) semi += 3;
    const rest = text ? text.slice(i + 1, i + 5) : '';
    if (rest.includes('?')) semi += 4; if (rest.includes('!')) semi += 2;
    const freq = v.base * Math.pow(2, semi / 12), dur = (vow ? .075 : .055) / (v.speed || 1);
    const o = { wave: v.wave, freq, to: freq * .94, dur, vol: v.vol * (caps ? 1.3 : 1), vib: v.vib };
    game.audio.sfx(o);
    if (v.octave) game.audio.sfx(Object.assign({}, o, { freq: freq / 2, to: freq / 2 * .94, vol: v.vol * .6 }));
    if (v.choir) for (const d of [-5, 4, 7]) game.audio.sfx(Object.assign({}, o, { freq: freq * Math.pow(2, d / 12), to: freq * Math.pow(2, d / 12) * .95, vol: v.vol * .5, wave: d > 0 ? 'square' : 'triangle' }));
    if (v.echo) game.after(.18, () => game.audio.sfx(Object.assign({}, o, { vol: o.vol * .5 })));
  },
  /** a short grunt from a player (tackles, rucks, scrums) */
  grunt(d, n = 3) {
    if (!TT.sound || !TT.sound.ready || TT.muted || !d) return;
    const v = d.voice && VOICES[d.voice] ? VOICES[d.voice] : TT.playerVoice(d), s = 'huargh';
    for (let i = 0; i < n; i++) TT.game.after(i * .06, () => this.letter(s[(i * 3 + (d.size * 10 | 0)) % s.length], v, i, s));
  }
};
/* ---- commentary: categories with priorities and cooldowns, shuffle bags (no line twice in a match), Barry first, Ros a
 * beat later 40% of the time, on a radio box at the foot of the screen with their live faces ---- */
const PRIO = { try: 10, pushover: 10, penTry: 10, monsterHit: 9, dropGoal: 9, red: 9, yellow: 8, onFire: 8, super: 8, refDown: 8, fulltime: 10, draw: 10, halftime: 9, hooter: 8, suddenDeath: 9, interception: 7, lineBreak: 7, bigHit: 7, convMade: 6, convMissed: 6, doink: 7, pengoal: 6, cheapUnseen: 6, cheapSeen: 6, penalty: 5, jackal: 6, turnover: 5, chicken: 7, flames: 7, lightning: 7, mud: 4, pie: 6, iron: 6, boot: 6, grease: 6, horn: 6, step: 4, fend: 4, dummy: 4, offload: 4, knockOn: 4, forwardPass: 4, scrum: 3, lineout: 3, notStraight: 4, advantage: 3, advOver: 3, kickoff: 3, kickTouch: 4, bomb: 3, grubber: 3, tackle: 1, brokenTackle: 3, missedTackle: 3, diveTackle: 4, gangHold: 6, touch: 2, dropout: 3, notTen: 4, freeKick: 4, sinOut: 3, refUp: 3, replay: 5, wind: 2, ruck: 1 };
class Commentary {
  constructor(game, o = {}) {
    this.game = game; this.o = o; this.bags = {}; this.cool = {}; this.t = 0; this.busy = 0; this.next = null; this.queue = [];
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c040', bg: '#101420', voice: null, speed: 46 });
    this.talk.onLetter = (ch, i, d) => { if (this.game.settings.commentary === 'On') TT.babble.letter(ch, d.name === 'ROS RUCKER' ? VOICES.ros : VOICES.barry, i, d._page.join('')); };
    this.rigs = { barry: TT.makeRig(TT.CAST.barry, TT.CAST.barry.colors, { hat: { style: 'band', color: '#202028' } }), ros: TT.makeRig(TT.CAST.ros, TT.CAST.ros.colors) };
    this.rng = TT.makeRng(o.seed || 5);
  }
  vars(m, d) {
    const p = d && d.id !== undefined && m.players[d.id], team = d && d.team !== undefined ? m.teams[d.team] : p ? m.teams[p.team] : m.teams[m.poss];
    const w = m.result ? m.result.winner : -1;
    return { player: p ? p.nick : 'He', team: (w >= 0 ? m.teams[w] : team).name, score: m.teams[0].short + ' ' + m.score[0] + ', ' + m.teams[1].short + ' ' + m.score[1], venue: m.venue.short };
  }
  pick(cat) {
    const L = TT.LINES[cat]; if (!L) return null;
    let bag = this.bags[cat];
    if (!bag || !bag.length) { bag = this.bags[cat] = L.map((_, i) => i); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    return L[bag.pop()];
  }
  /** a category happened: say a line if it beats what is being said and its cooldown is over */
  say(cat, m, d, force) {
    if (this.game.settings.commentary === 'Off' && !force) return;
    const pr = PRIO[cat] || 1;
    if (!force && this.cool[cat] > this.t) return;
    if (!force && this.talk.open && this.busyPrio >= pr) return;
    if (!force && pr <= 1 && this.rng() > .3) return;
    const line = this.pick(cat); if (!line) return;
    this.cool[cat] = this.t + 6; this.busyPrio = pr;
    const vars = this.vars(m, d);
    const lines = Array.isArray(line) ? line : [line];
    const first = lines[0], ros = first.startsWith('R:');
    this.show(ros ? 'ros' : 'barry', ros ? first.slice(2) : first, vars);
    // Ros chips in a beat later (or the line's own reply)
    const reply = lines[1] ? lines[1] : (!ros && this.rng() < .4 && pr >= 4 ? null : null);
    if (reply) this.next = { who: reply.startsWith('R:') ? 'ros' : 'barry', text: reply.replace(/^R:/, ''), vars, at: this.t + 2.2 };
    else if (!ros && pr >= 6 && this.rng() < .4) { const r = (TT.LINES[cat] || []).filter(l => typeof l === 'string' && l.startsWith('R:')); if (r.length) this.next = { who: 'ros', text: r[Math.floor(this.rng() * r.length)].slice(2), vars, at: this.t + 2.4 }; }
  }
  show(who, text, vars) {
    this.talk.say(text.toUpperCase().replace(/\{\$(\w+)\}/g, (_, k) => String(vars[k] === undefined ? '' : vars[k]).toUpperCase()), { name: who === 'ros' ? 'ROS RUCKER' : 'BARRY BELLOWS', portrait: this.rigs[who], portraitSize: 32, portraitOpts: { zoom: 2.6, turn: .4 }, auto: 2.2, modal: false, alpha: .86 });
  }
  update(dt) {
    this.t += dt;
    for (const k in this.rigs) this.rigs[k].update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, expr: this.talk.open && this.talk.typing ? 'shout' : null });
    if (this.next && this.t >= this.next.at && !(this.talk.open && this.talk.typing)) { const n = this.next; this.next = null; if (this.game.settings.commentary !== 'Off') this.show(n.who, n.text, n.vars); }
    this.talk.update(dt);
  }
  /** the lower third sits between the bottom corners' player cards (left and right: how many pixels each side keeps) */
  draw(r, o = {}) {
    if (this.game.settings.commentary === 'Off') return;
    const L = o.left === undefined ? 112 : o.left, R = o.right === undefined ? 112 : o.right;
    this.talk.w = clamp(r.W - L - R - 4, 170, 340); this.talk.x = L + Math.max(0, Math.round((r.W - L - R - this.talk.w) / 2));
    this.talk.draw(r);
  }
  /** the match's events, turned into categories */
  hook(bus, ctx) {
    const m = () => ctx.match, on = (n, f) => ctx.subs.push(bus.on(n, d => { if (!ctx.match || ctx.quiet) return; f(d); }));
    const map = { tackle: 'tackle', bigHit: 'bigHit', monsterHit: 'monsterHit', sidestep: 'step', spin: 'step', fend: 'fend', dummy: 'dummy', lineBreak: 'lineBreak', knockOn: 'knockOn', forwardPass: 'forwardPass', turnover: 'turnover', jackal: 'jackal', pushover: 'pushover', notStraight: 'notStraight', convMade: 'convMade', convMissed: 'convMissed', doinkMiss: 'doink', penGoal: 'pengoal', dropGoal: 'dropGoal', advantage: 'advantage', advOver: 'advOver', cheapUnseen: 'cheapUnseen', refDown: 'refDown', refUp: 'refUp', onFire: 'onFire', hooter: 'hooter', suddenDeath: 'suddenDeath', interception: 'interception', offload: 'offload', brokenTackle: 'brokenTackle', missedTackle: 'missedTackle', diveTackle: 'diveTackle', gangHold: 'gangHold', kickTouch: 'kickTouch', dropout: 'dropout', notTen: 'notTen', freeKick: 'freeKick', penTry: 'penTry', sinBinOut: 'sinOut', windShift: 'wind', ruckWon: 'ruck', mud: 'mud' };
    for (const ev in map) on(ev, d => this.say(map[ev], m(), d));
    on('kickoff', d => this.say('kickoff', m(), d));
    on('try', d => { if (d.how !== 'pushover' && d.how !== 'penalty') this.say('try', m(), d, true); });
    on('scrumWon', d => this.say('scrum', m(), d));
    on('lineoutWon', d => this.say('lineout', m(), d));
    on('foul', d => { if (d.kind === 'offBall') this.say('cheapSeen', m(), d); else this.say('penalty', m(), d); });
    on('card', d => this.say(d.red ? 'red' : 'yellow', m(), d, true));
    on('superStart', d => this.say('super', m(), d));
    on('powerupTake', d => this.say(d.kind, m(), d));
    on('hazard', d => this.say(d.kind, m(), d));
    on('kick', d => { if (d.kind === 'bomb') this.say('bomb', m(), d); else if (d.kind === 'grubber') this.say('grubber', m(), d); });
    on('halftime', d => this.say('halftime', m(), d, true));
    on('fulltime', d => this.say(d.winner < 0 ? 'draw' : 'fulltime', m(), d, true));
    on('replayStart', d => this.say('replay', m(), d, true));
  }
}
TT.Commentary = Commentary;
