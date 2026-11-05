/* 23-commentary: BARRY BELLOW (play-by-play) and TREV BRICKLEY (the deadpan ex-centre-half) on a radio box, and the
 * stadium's PA announcer at the top. Events map to line pools (registry 'lines'), by priority, with cooldowns, no repeats
 * in a match, the partner's reply straight after, variables, and idle chatter. Every line is spoken in babble. */
EF.SPEAKERS = {
  barry: { name: 'BARRY BELLOW', voice: { f0: 160, wave: 'saw', rate: 1.1, formant: 1.05 }, rig: { hair: 'short', colors: { cloth: '#8a2a3a', hair: '#6a4a2a', skin: '#f0c8a8', hat: '#2a2a30' }, hat: { style: 'band', color: '#2a2a30' } } },
  trev: { name: 'TREV BRICKLEY', voice: { f0: 95, wave: 'pulse', rate: .85, formant: .9 }, rig: { hair: 'bald', build: 'bulky', colors: { cloth: '#3a4a6a', hair: '#8a7a6a', skin: '#e0b090', hat: '#2a2a30' }, hat: { style: 'band', color: '#2a2a30' } } },
  pa: { name: 'STADIUM ANNOUNCER', voice: { f0: 120, wave: 'saw', rate: 1, echo: 1 } },
  mags: { name: 'MAGS MULLIGAN', voice: { f0: 215, wave: 'saw', rate: 1, breath: .25 }, rig: { hair: 'long', hat: 'cap', colors: { cloth: '#2a4a3a', coat: '#2a4a3a', hair: '#a8a8a8', skin: '#f0c8a8', hat: '#5a4a3a', trim: '#f08a24' }, outfit: 'coat' } },
  baron: { name: 'BARON VON BULLION', voice: { f0: 80, wave: 'saw', rate: .9, vib: .03 }, rig: { build: 'bulky', hair: 'bald', hat: { style: 'crown', color: '#e8c040' }, outfit: 'coat', colors: { cloth: '#141414', coat: '#2a1a3a', hair: '#e8c040', skin: '#f0d0b0', trim: '#e8c040' } } },
  ref: { name: 'THE REFEREE', voice: { f0: 135, wave: 'saw', rate: 1.2 } },
  trevcard: { name: 'TREV BRICKLEY', voice: { f0: 95, wave: 'pulse', rate: .85, formant: .9 } }
};
for (const [id, s] of Object.entries(EF.SPEAKERS)) EF.babble.speakers[id] = Object.assign({ formant: 1, breath: 0, vib: 0, echo: 0 }, s.voice);
EF.initSpeakers = () => { for (const t of EF.all('team')) for (const p of t.players) EF.babble.speakers[p.id] = Object.assign({ f0: 150, wave: 'saw', rate: 1, formant: 1 }, p.voice || { f0: 110 + (p.id.length * 17) % 150, wave: p.id.length % 2 ? 'saw' : 'pulse' }); };
const RIGS = {};
/** a speaker's portrait rig (story characters, commentators, players) */
EF.portraitOf = id => {
  if (RIGS[id]) return RIGS[id];
  const sp = EF.SPEAKERS[id];
  if (sp && sp.rig) return (RIGS[id] = new E.Humanoid(Object.assign({ weapon: null, build: 'heroic', size: 1.1, sleeves: 'long' }, sp.rig)));
  for (const t of EF.all('team')) { const p = t.players.find(q => q.id === id); if (p) { const k = p.pos === 'GK' ? t.kits.keeper : t.kits.home; return (RIGS[id] = makeRig({ data: p, gk: p.pos === 'GK' }, k, t.kits.keeper)); } }
  return (RIGS[id] = new E.Humanoid({ weapon: null }));
};
EF.speakerName = id => { const s = EF.SPEAKERS[id]; if (s) return s.name; for (const t of EF.all('team')) { const p = t.players.find(q => q.id === id); if (p) return p.name; } return id.toUpperCase(); };
const PRIORITY = { goal: 100, goalKip: 100, goldengoal: 100, owngoal: 95, super: 95, duelPerfect: 90, duelGood: 90, duelMiss: 90, red: 85, penalty: 80, shootout: 78, busSmash: 76, bus: 75, woodwork: 70, card: 65, var: 60, varDecision: 62, simulation: 58, dive: 55, save: 50, miss: 45, header: 45, bicycle: 48, volley: 44, europhoria: 47, launch: 40, foul: 38, refHit: 42, skill: 30, nutmeg: 34, tackle: 25, kickoff: 20, secondhalf: 20, halftime: 60, fulltime: 70, fulltimeKip: 72, corner: 18, freekick: 18, crowdThrow: 15, advantage: 22, block: 28, event: 40, idle: 5, weather: 6 };
class Commentary {
  constructor(m, o = {}) {
    this.m = m; this.o = o; this.used = new Set(); this.cool = {}; this.lastT = -9; this.queue = []; this.idle = 0; this.heard = 0;
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffc83a' });
    this.pa = new E.Dialog(game, { lines: 1, place: 'top', border: '#5ae0ff' });
    this.paIdle = 18;
  }
  vars(ev) {
    const m = this.m, who = ev && ev.who != null ? m.players[ev.who] : (m.last || m.owner), side = ev && ev.side != null ? ev.side : who ? who.side : 0;
    const t = m.teams[side] || m.teams[0], o = m.teams[1 - side] || m.teams[1];
    return { player: who ? who.data.name : 'HIM', team: t.name, opp: o.name, score: m.score[0] + '-' + m.score[1], minute: Math.floor(m.minute), stadium: m.st.name, keeper: m.keeper[1 - side] ? m.keeper[1 - side].data.name : 'THE KEEPER', ref: m.ref ? m.ref.name : 'THE REFEREE', home: m.teams[0].name, away: m.teams[1].name };
  }
  pick(pool, ev) {
    const P_ = EF.get('lines', pool); if (!P_) return null;
    const ok = P_.list.filter((e, i) => !this.used.has(pool + i) && (!e.when || e.when(this.m, ev)));
    if (!ok.length) return null;
    const e = ok[Math.floor(EF.fxRng() * ok.length)]; this.used.add(pool + P_.list.indexOf(e));
    return e;
  }
  /** an event happened: maybe a line from its pool, now or next */
  hear(pool, ev = {}) {
    if (game.settings.commentary === 'off' || this.o.silent) return false;
    const m = this.m, pr = PRIORITY[pool] || 10;
    if (this.m.t - (this.cool[pool] || -99) < 8 && pr < 90) return false;
    const busy = this.talk.open, curPr = this.curPr || 0;
    if (busy && pr <= curPr) return false;
    if (!busy && this.m.t - this.lastT < (pr >= 60 ? 0 : 3.5)) return false;
    const e = this.pick(pool, ev); if (!e) return false;
    this.cool[pool] = this.m.t; this.queue = [];
    this.say(e.who, e.text, ev, pr);
    if (e.reply) this.queue.push([e.reply.who, e.reply.text, ev, pr]);
    return true;
  }
  say(who, text, ev, pr) {
    const sp = EF.SPEAKERS[who] || EF.SPEAKERS.barry;
    this.talk.voice = EF.babble.voiceFor(who);
    this.talk.say(text, { name: sp.name, portrait: EF.portraitOf(who), portraitOpts: { zoom: 3, turn: .4 }, auto: 2.2, modal: false, alpha: .85, vars: this.vars(ev) });
    this.curPr = pr; this.lastT = this.m.t; this.idle = 0; this.heard++;
    EF.bus.emit('line', { who, text, match: this.m });
  }
  announce(text) {
    if (this.o.silent) return;
    EF.sfx('chime'); this.pa.voice = EF.babble.voiceFor('pa');
    this.pa.say(text, { name: 'PA', auto: 3, modal: false, alpha: .8, vars: this.vars({}) });
  }
  update(dt) {
    const m = this.m;
    this.talk.update(dt); this.pa.update(dt);
    if (!this.talk.open) { this.curPr = 0; if (this.queue.length) { const [w, t, ev, pr] = this.queue.shift(); this.say(w, t, ev, pr); } }
    if (m.mode === 'play') {
      this.idle += dt;
      if (this.idle > 12 && !this.talk.open) { this.idle = 0; const w = m.st.weather && m.st.weather.kind; const pool = EF.fxRng() < .35 && (w || (m.st.fogSecondHalf && m.half >= 2)) ? 'weather-' + (m.st.fogSecondHalf && m.half >= 2 ? 'fog' : w) : 'idle'; this.hear(pool, {}); }
      this.paIdle -= dt;
      if (this.paIdle <= 0 && !this.pa.open) { this.paIdle = 35 + EF.fxRng() * 30; const e = this.pick('pa', {}); if (e) this.announce(e.text); }
    }
  }
  draw(r) { this.talk.draw(r); this.pa.draw(r); }
}
EF.Commentary = Commentary;
/** what each event says (the pool), with any condition */
EF.commentaryFor = (c, type, ev) => {
  const m = c.m, kip = s => m.teams[s] && m.teams[s].id === 'kipperton';
  switch (type) {
    case 'kickoff': return c.hear(ev.half === 2 && ev.fresh ? 'secondhalf' : ev.fresh ? 'kickoff' : 'restart', ev);
    case 'goal': return c.hear(m.flags.goldenGoal ? 'goldengoal' : m.ball.superName ? 'superGoal' : kip(ev.side) && EF.fxRng() < .6 ? 'goalKip' : 'goal', ev);
    case 'ownGoal': return c.hear('owngoal', ev);
    case 'woodwork': return c.hear('woodwork', ev);
    case 'save': return c.hear('save', ev);
    case 'shot': if (!ev.onTarget && ev.kind !== 'penalty') return c.hear('miss', ev); return;
    case 'header': return c.hear('header', ev);
    case 'bicycle': return c.hear('bicycle', ev);
    case 'volley': return c.hear('volley', ev);
    case 'tackleWon': return c.hear('tackle', ev);
    case 'launch': return c.hear('launch', ev);
    case 'foul': return c.hear('foul', ev);
    case 'card': return c.hear(ev.kind === 'red' ? 'red' : 'card', ev);
    case 'diveWon': return c.hear('dive', ev);
    case 'diveBooked': return c.hear('simulation', ev);
    case 'var': return c.hear('var', ev);
    case 'varDecision': return c.hear(ev.overturned ? 'varOverturn' : 'varStands', ev);
    case 'penaltyAwarded': return c.hear('penalty', ev);
    case 'shootoutKick': return c.hear(ev.goal ? 'shootoutGoal' : 'shootoutMiss', ev);
    case 'shootoutStart': return c.hear('shootout', ev);
    case 'superStrike': return c.hear('super', ev);
    case 'saveDuelResult': return c.hear(ev.result === 'perfect' ? 'duelPerfect' : ev.result === 'good' ? 'duelGood' : 'duelMiss', ev);
    case 'nutmeg': return c.hear('nutmeg', ev);
    case 'rainbow': case 'skillWin': return c.hear('skill', ev);
    case 'europhoria': return c.hear('europhoria', ev);
    case 'half': return c.hear('halftime', ev);
    case 'fulltime': { const w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1; return c.hear(w >= 0 && kip(w) ? 'fulltimeKip' : 'fulltime', Object.assign({}, ev, { side: w < 0 ? 0 : w })); }
    case 'bus': return c.hear('bus', ev);
    case 'busSmash': return c.hear('busSmash', ev);
    case 'refHit': return c.hear('refHit', ev);
    case 'crowdThrow': return c.hear('crowdThrow', ev);
    case 'advantage': return c.hear('advantage', ev);
    case 'block': return c.hear('block', ev);
    case 'setpiece': if (ev.kind === 'corner') return c.hear('corner', ev); if (ev.kind === 'freekick') return c.hear('freekick', ev); return;
    case 'event': return c.hear('event-' + ev.id, ev);
    case 'gullAway': return c.hear('event-gullAway', ev);
    case 'invaderTackled': return c.hear('event-tackled', ev);
    case 'extraTime': return c.hear('extratime', ev);
    case 'goldenMoment': return c.hear('goldenMoment', ev);
  }
};
