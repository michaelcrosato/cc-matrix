/* ============ 21-commentary: Barry and Trev, the PA, and the line director ============ */
EF.Commentary = class Commentary {
  constructor(M, opts = {}) {
    this.M = M; this.cur = null; this.queue = []; this.last = {}; this.heard = E.store.get('ef:heard', 0); this.quiet = !!opts.quiet; this.paT = 40; this.offs = []; this.recent = [];
    const on = (t, fn) => this.offs.push(EF.bus.on(t, e => { if (e.match === this.M) fn(e); }));
    const F = id => this.M.F[id] ? this.M.F[id].name3 : 'THE PLAYER', TM = s => this.M.teams[s].data.short, kipSide = s => this.M.teams[s].id === 'kip';
    on('kickoff', e => { if (this.M.stats[0].passes + this.M.stats[1].passes < 3 && this.M.clock < 2) this.say('kickoff', 5, { team: this.M.teams[e.side].data.short }); });
    on('goal', e => this.say(e.own ? 'goal' : kipSide(e.side) ? 'goalKip' : 'goal', 10, { player: F(e.who), team: TM(e.side), score: this.M.score[0] + '-' + this.M.score[1] }, true));
    on('save', e => { if (!e.shootout) this.say('save', 5); });
    on('nearMiss', e => this.say(e.over ? 'near' : 'near', 4, { player: F(e.who) }));
    on('post', e => this.say('wood', 6)); on('bar', e => this.say('wood', 6));
    on('tackleWon', e => this.say('tackle', 2)); on('knockdown', e => this.say('slide', 5));
    on('foul', e => this.say('foul', 5)); on('advantage', e => this.say('advantage', 5)); on('card', e => this.say('card', 7));
    on('dive', e => this.say('dive', 4)); on('diveBooked', e => this.say('diveBooked', 8)); on('diveWon', e => this.say('diveWon', 6));
    on('var', e => this.say('var', 8)); on('varDecision', e => this.say(e.overturned ? 'varOver' : 'varStand', 8));
    on('superStrike', e => this.say('super', 9, { player: F(e.who) })); on('saveDuelResult', e => this.say(e.save ? 'duelSave' : 'duelGoal', 9));
    on('skill', e => this.say('skill', 2)); on('rainbow', e => this.say('skill', 3)); on('nutmeg', e => this.say('nutmeg', 6));
    on('header', e => { if (e.shot) this.say('header', 3); }); on('volley', e => this.say('volley', 3)); on('bicycle', e => this.say('bicycle', 7));
    on('penaltyAwarded', e => this.say('penalty', 8)); on('shootoutStart', e => this.say('shootout', 8));
    on('half', e => this.say('halftime', 6, { score: this.M.score[0] + '-' + this.M.score[1] })); on('fulltime', e => { const w = this.M.winner(); this.say(w === 0 && this.M.teams[0].id === 'kip' ? 'fulltimeWin' : w === 1 && this.M.teams[0].id === 'kip' ? 'fulltimeLose' : 'fulltime', 9, { score: this.M.score[0] + '-' + this.M.score[1] }, true); });
    on('goldenGoal', e => this.say('goldenGoal', 8)); on('europhoria', e => this.say('europhoria', 8)); on('euphoriaFull', e => this.say('euphoriaFull', 4));
    on('corner', e => this.say('corner', 2, { team: TM(e.side) })); on('cornerSet', e => this.say('corner', 2, { team: TM(e.side) })); on('freekick', e => this.say('freekick', 4)); on('throwInSet', e => this.say('throwin', 1)); on('goalKickSet', e => this.say('goalkick', 1));
    on('bus', e => this.say('bus', 8)); on('event', e => { const k = { seagull: 'seagull', beachball: 'beachball', invader: 'invader', keith: 'keith', flicker: 'flicker', flare: 'flare', drone: 'drone', fireworks: 'fireworks' }[e.name]; if (k) this.say(k, 6); });
    on('invaderTackled', e => this.say('invader', 6));
  }
  destroy() { for (const o of this.offs) o(); this.offs = []; }
  fill(t, vars) { const M = this.M; return t.replace(/\{(\w+)\}/g, (m, k) => k === 'stadium' ? M.stadium.name : vars[k] !== undefined ? vars[k] : k === 'score' ? M.score[0] + '-' + M.score[1] : k === 'team' ? M.teams[0].data.short : k === 'player' ? 'the lad' : ''); }
  say(kind, pri, vars = {}, force) {
    if (this.quiet || !EF.LINES[kind] || (EF.game.settings && EF.game.settings.commentary === false && EF.game.settings.subtitles === false)) return;
    const now = this.M.t, cd = { tackle: 14, skill: 12, near: 8, save: 7, foul: 6, throwin: 25, goalkick: 25, corner: 14, header: 10, volley: 8, euphoriaFull: 20 }[kind] || 4;
    if (!force && now - (this.last[kind] || -99) < cd) return; this.last[kind] = now;
    const pool = EF.LINES[kind]; let tries = 0, i; do { i = Math.floor(EF.fxRng() * pool.length); } while (this.recent.includes(kind + i) && tries++ < 6); this.recent.push(kind + i); if (this.recent.length > 40) this.recent.shift();
    const parts = pool[i].split(' // ').map(s => this.fill(s, vars)); const lines = parts.map((txt, k) => ({ who: kind === 'pa' ? 'PA' : (k % 2 === 0 ? 'BARRY' : 'TREV'), text: txt }));
    if (this.cur && this.cur.pri >= pri && !force) { if (this.queue.length < 2 && pri >= 4) this.queue.push({ pri, lines }); return; }
    this.start({ pri, lines });
  }
  start(item) { this.cur = { pri: item.pri, lines: item.lines, i: 0, t: 0, shown: 0 }; this.beginLine(); }
  beginLine() { const c = this.cur, ln = c.lines[c.i]; c.t = 0; c.shown = 0; c.dur = 1.2 + ln.text.length * .055; if (EF.game.settings && EF.game.settings.commentary !== false) EF.babble.say(ln.who, ln.text); this.heard++; if (this.heard === 50 && EF.Save) EF.Save.sticker('x:voices'); if (this.heard % 5 === 0) E.store.set('ef:heard', this.heard); }
  update(dt) {
    const c = this.cur; if (!c) { this.paT -= dt; if (this.paT <= 0 && this.M.mode === 'play') { this.paT = 55 + EF.fxRng() * 40; const sv = this.M.rng; this.say('pa', 1, {}, true); } if (this.queue.length) this.start(this.queue.shift()); return; }
    c.t += dt; c.shown = Math.min(c.lines[c.i].text.length, c.t * 38);
    if (c.t > c.dur) { if (c.i < c.lines.length - 1) { c.i++; this.beginLine(); } else { this.cur = null; if (this.queue.length) this.start(this.queue.shift()); } }
  }
};
