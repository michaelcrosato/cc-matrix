/* ---- THE COMMENTARY DIRECTOR: subscribes to the bus, scores candidate lines by the event's priority, plays at most
 * one exchange per ball (a line and, often, the other commentator's reply), stays quiet during the run-up and release
 * and talks from contact to the next ball. Lines are picked by tag with a cooldown (no repeat within 20 balls) from the
 * cosmetic stream. Shown on a non-modal E.Dialog with the speaker's live portrait, typed in the gibberish voice.
 * Settings: Commentary captions on/off, Commentary voices on/off (and the Voices volume). ---- */
const PRIORITY = { start: 5, six: 9, four: 7, bowled: 10, caught: 10, screamer: 11, lbw: 10, notout: 6, runout: 10, stumped: 10, hitwicket: 10, dropped: 8, review: 9, reviewOver: 9, reviewStand: 8, third: 8, fire: 8, fireBowl: 8, special: 8, wide: 3, noball: 5, beamer: 6, freehit: 4, beaten: 3, dot: 1, single: 1, two: 2, three: 3, edge: 4,
  rain: 9, method: 9, cow: 6, cowhit: 7, bees: 6, bells: 4, peacocks: 5, tray: 5, gulls: 6, tide: 5, dustdevil: 5, rabbits: 4, fog: 5, ghosts: 6, fireworks: 5, advert: 6, mascot: 5, item: 5, maiden: 5, overEnd: 2, needs: 3, filler: 1, win: 12, loss: 12, tie: 12, superover: 11, inningsEnd: 9, hype: 4, crowdcatch: 8, net: 1, overthrow: 6, mixup: 7, dive: 4, directhit: 6, machine: 4 };
const Commentary = {
  talk: null, recent: [], ballNo: 0, queue: [], lastFiller: -9, log: [], spokeThisBall: false, muted: false, m: null,
  init() { this.talk = new E.Dialog(K.game, { lines: 2, place: 'bottom', voice: null, bg: '#0e1a12', border: '#e8c060', nameColor: '#ffd36a' }); },
  attach(m) { this.m = m; this.recent = []; this.queue = []; this.ballNo = 0; this.log = []; this.lastFiller = -9; if (this.talk) this.talk.close(); },
  /** a line for a tag: { who, text } (skipping lines said within 20 balls) */
  pick(tag, vars) {
    const pool = LINES[tag]; if (!pool || !pool.length) return null;
    const fresh = pool.filter((l, i) => !this.recent.some(r => r.tag === tag && r.i === i && this.ballNo - r.ball < 20));
    const list = fresh.length ? fresh : pool, l = list[Math.floor(RNG.cosmetic() * list.length) % list.length], i = pool.indexOf(l);
    this.recent.push({ tag, i, ball: this.ballNo }); if (this.recent.length > 200) this.recent.shift();
    return { who: l[0], text: fill(l[1], vars || {}), tag };
  },
  vars(m) {
    const inn = m && m.inn, need = m && m.need(), s = m && m.striker, bw = m && m.bowlerP;
    return { batter: s ? s.p.short : '', bowler: bw ? bw.short : '', team: m ? m.teams[m.bat].name : '', opp: m ? m.teams[m.bowlSide].name : '', ground: m ? m.ground.name : '', need: need ? need.runs : '', balls: need ? need.balls : '', target: inn && inn.target ? inn.target : (m && m.innings[0] ? m.innings[0].runs + 1 : ''), kmh: m && m.cur ? m.cur.kmh : '', winner: m && m.result && m.result.winner ? TEAMS[m.result.winner].name : '' };
  },
  /** an event happened: queue its best line (the director plays them when it may talk) */
  hear(tag, extra = {}, force) {
    const m = this.m; if (!m || m.cfg.commentary === false) return;
    const pr = PRIORITY[tag] || 1, rate = T('commentaryRate');
    if (!force && pr < 4 && RNG.cosmetic() > rate * (pr <= 1 ? .35 : .6)) return;
    if (!force && rate <= 0) return;
    const l = this.pick(tag, Object.assign(this.vars(m), extra)); if (!l) return;
    this.queue.push({ pr, l, t: K.game.time });
    this.queue.sort((a, b) => b.pr - a.pr); if (this.queue.length > 4) this.queue.length = 4;
  },
  step(dt) {
    const m = this.m; if (!m || !this.talk) return;
    this.talk.update(dt);
    const quiet = m.phase === 'runup' || m.phase === 'flight' || (m.phase === 'setup' && m.pt < .3);
    if (quiet || this.talk.open) return;
    const q = this.queue.shift(); if (!q) return;
    if (K.game.time - q.t > 6) return;
    this.show(q.l);
    // the other commentator's reply, sometimes
    if (q.pr >= 6 && RNG.cosmetic() < .45) { const other = q.l.who === 'A' ? 'D' : 'A', pool = (LINES[q.l.tag] || []).filter(x => x[0] === other); if (pool.length) { const l2 = pool[Math.floor(RNG.cosmetic() * pool.length)]; this.queue.unshift({ pr: 99, l: { who: other, text: fill(l2[1], this.vars(m)), tag: q.l.tag }, t: K.game.time }); } }
  },
  show(l) {
    this.log.push(l); if (this.log.length > 10) this.log.shift();
    const C = COMMENTATORS[l.who] || COMMENTATORS.A;
    if (K.settings('captions') && !this.muted) this.talk.say(l.text, { name: C.name, nameColor: C.color, portrait: Cast.extra(C.rig), portraitOpts: { zoom: 3, turn: .4 }, auto: 2.6, modal: false, alpha: .85, y: Math.max(40, (K.game.H || 240) - 92) });
    if (!this.muted && !(K.dev && K.dev.toggles.muteCommentary)) Voice.say(l.text, C.voice);
    bus.emit('commentary', { who: l.who, text: l.text });
  },
  draw(r) { if (this.talk && this.talk.open) this.talk.draw(r); }
};
/* the bus -> commentary tags (and the crowd, the stings and the shouts) */
function wireMatchEvents() {
  const on = (t, f) => bus.on(t, d => { if (Commentary.m && d.match && d.match !== Commentary.m) return; f(d); });
  on('match:start', () => { Commentary.hear('start', {}, true); Audio.cheer(.5); Audio.sfx('whistle'); });
  on('ball:setup', () => { Commentary.ballNo++; Commentary.spokeThisBall = false; Audio.layer('base', 1); });
  on('ball:released', d => { if (d.fam === 'machine') Audio.sfx('steam'); if (d.special) { Commentary.hear('special'); Audio.sting('special'); } if (d.fam === 'machine' && RNG.cosmetic() < .3) Commentary.hear('machine'); });
  on('bat:contact', d => { Audio.sfx(d.grade === 'perfect' && d.kind === 'clean' ? 'batSweet' : d.kind === 'edge' ? 'edge' : 'bat'); if (d.kind === 'edge') { Commentary.hear('edge'); Audio.oooh(); } });
  on('ball:pitched', () => Audio.sfx('pitchThud'));
  on('ball:beaten', () => { Commentary.hear('beaten'); Audio.oooh(); });
  on('keeper:take', () => Audio.sfx('gloves'));
  on('boundary', d => { Commentary.hear(d.n === 6 ? 'six' : 'four'); Audio.cheer(d.n === 6 ? 1.3 : .8); Audio.sting(d.n === 6 ? 'six' : 'four'); if (d.n === 4) Audio.sfx('board'); });
  on('runs', d => { const mm = d.match, last = mm && mm.samples && mm.samples[mm.samples.length - 1]; if (last && !mm.holder && mm.outside(last.x, last.y)) return; if (d.n === 1) Commentary.hear('single'); else if (d.n === 2) Commentary.hear('two'); else if (d.n === 3) Commentary.hear('three'); Audio.applause = Math.min(1, Audio.applause + .2); });
  on('wicket', d => { if (d.freeHit) { Commentary.hear('freehit', {}, true); return; } const tag = { bowled: 'bowled', caught: 'caught', lbw: 'lbw', 'run out': 'runout', stumped: 'stumped', 'hit wicket': 'hitwicket' }[d.how] || 'bowled'; Commentary.hear(tag, { fielder: d.fielder || '' }, true); Audio.cheer(1.2); Audio.sting('wicket'); });
  on('stumps:broken', () => { Audio.sfx('stumps'); Audio.sfx('bails'); });
  on('catch:screamer', () => Commentary.hear('screamer', {}, true));
  on('catch:dropped', () => { Commentary.hear('dropped'); Audio.groan(); Audio.sfx('drop'); });
  on('field:gather', () => Audio.sfx('catchPop', { vol: .5 }));
  on('field:throw', () => Audio.sfx('throwWhoosh'));
  on('field:directHit', () => Commentary.hear('directhit'));
  on('field:overthrow', () => Commentary.hear('overthrow'));
  on('field:dive', () => Audio.sfx('dive'));
  on('run:dive', () => { Commentary.hear('dive'); Audio.sfx('dive'); });
  on('run:mixup', () => Commentary.hear('mixup', {}, true));
  on('run:call', d => { const a = d.match && d.match.batterActors[d.who]; Voice.shout(d.call.replace(/!/g, ''), a && a.p && VOICES[a.p.id] ? a.p.id : 'crowd'); });
  on('appeal', () => { Voice.shout('Howzat', 'crowd'); Audio.oooh(); });
  on('decision', d => { if (d.kind === 'third') return; if (!d.out) Commentary.hear('notout'); });
  on('review:start', d => { Commentary.hear(d.kind === 'third' ? 'third' : 'review', {}, true); });
  on('review:result', d => { if (d.kind === 'third') return; Commentary.hear(d.overturned ? 'reviewOver' : 'reviewStand', {}, true); });
  on('extra', d => { Commentary.hear(d.kind === 'wd' ? 'wide' : d.why === 'beamer' ? 'beamer' : 'noball'); });
  on('fire:on', d => { Commentary.hear(d.who === 'bat' ? 'fire' : 'fireBowl', {}, true); Audio.sfx('fireOn'); Audio.sting('fire'); Audio.layer('fire', 1); Audio.cheer(1); });
  on('fire:off', () => Audio.layer('fire', 0));
  on('hype:full', () => { Audio.sfx('hypeFull'); Audio.sting('hype'); Audio.chant = 1; Commentary.hear('hype'); });
  on('hype', d => { const m = d.match; if (m && Math.max(...m.hype) > 50) Audio.layer('drums', 1); });
  on('special', d => { Audio.sfx('special'); });
  on('target:hit', d => { Commentary.hear('target_' + d.id, {}, true); Audio.sfx(d.fx === 'glass' ? 'glass' : d.fx === 'splash' ? 'splash' : d.fx === 'bell' ? 'bell' : 'target'); Audio.cheer(1.5); });
  on('chaos', d => { Commentary.hear(d.id, {}, true); if (d.id === 'cow') Audio.sfx('moo'); if (d.id === 'bees') Audio.sfx('bees'); if (d.id === 'gulls') Audio.sfx('gull'); if (d.id === 'bells') Audio.sfx('bell'); if (d.id === 'fireworks') Audio.sfx('firework'); });
  on('chaos:cowhit', () => { Commentary.hear('cowhit', {}, true); Audio.sfx('moo'); });
  on('chaos:peacock', () => Commentary.hear('peacocks', {}, true));
  on('crowd:catch', () => { Commentary.hear('crowdcatch', {}, true); Audio.cheer(1.3); });
  on('net:hit', () => { Commentary.hear('net'); Audio.sfx('board', { vol: .5 }); });
  on('chaos:gull', () => { Commentary.hear('gulls', {}, true); Audio.sfx('gull'); });
  on('chaos:dustdevil', () => Commentary.hear('dustdevil', {}, true));
  on('chaos:phase', () => Commentary.hear('ghosts', {}, true));
  on('rain:start', () => { Audio.rainMute = .3; Audio.sfx('thunder'); });
  on('rain:end', () => { Audio.rainMute = 1; });
  on('rain:method', () => Commentary.hear('method', {}, true));
  on('item', d => { Commentary.hear('item', { item: ITEMS[d.id] ? ITEMS[d.id].name : d.id }); Audio.sfx('item'); });
  on('ball:done', d => { const r = d.rec; if (!r.contact && !r.ran && !r.boundary && !r.wicket && !r.extras.wd && !r.extras.nb && !r.beaten) Commentary.hear('dot'); if (r.maiden) Commentary.hear('maiden'); if (r.overEnd) { Audio.sting('over'); } });
  on('over:end', d => { const m = d.match, need = m && m.need(); if (need && need.balls <= 12 && need.runs > 0) Commentary.hear('needs', {}, true); else if (Commentary.ballNo - Commentary.lastFiller > 6) { Commentary.lastFiller = Commentary.ballNo; Commentary.hear('filler', {}, true); } else Commentary.hear('overEnd'); });
  on('innings:end', d => { if (d.n === 0) Commentary.hear('inningsEnd', { target: d.runs + 1 }, true); Audio.cheer(.6); });
  on('superover', () => Commentary.hear('superover', {}, true));
  on('meter:lock', () => Audio.sfx('meterTick'));
  on('catch:ring', () => Audio.sfx('ringTick'));
  on('match:end', d => { Audio.sfx('whistle'); const m = d.match, hw = m && Object.keys(m.cfg.humans || {}).some(k => (m.cfg.humans[k] || []).length && m.teams[k].id === (d.result && d.result.winner)); Commentary.hear(d.result.tie ? 'tie' : 'win', {}, true); Audio.sting(hw || !Object.keys(m.cfg.humans || {}).some(k => (m.cfg.humans[k] || []).length) ? 'win' : 'lose'); Audio.cheer(1.5); });
}
K.Commentary = Commentary;
