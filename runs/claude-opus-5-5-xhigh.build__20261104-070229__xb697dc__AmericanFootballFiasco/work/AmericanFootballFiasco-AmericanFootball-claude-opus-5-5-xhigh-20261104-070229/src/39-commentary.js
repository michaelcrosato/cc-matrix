// Commentary: CHET THUNDERBUNS (play-by-play) and LOU "THE TOE" DIGGS (color) react to the match's events by priority,
// at most one line per gap, a higher priority interrupting a lower one, never repeating a recent line. Captions type at
// 45 letters a second with the speaker's portrait and babble voice. The crowd reacts with them.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, bus = FF.bus, u = FF.u;
const PRI = { td: 10, int: 9, fumble: 9, megaHit: 9, special: 8, bigHit: 8, sack: 8, bigRun: 7, bigCatch: 7, hotOn: 7, mascotOn: 7, fg: 7, safety: 9, lateHit: 6, cardUsed: 6, fiascoBreak: 6,
  drop: 5, pile: 7, pileWon: 6, firstDown: 4, incomplete: 3, kickoff: 4, punt: 4, refDown: 6, lightsOut: 8, final: 10, halftime: 8, overtime: 8, twoMinute: 5, thirdLong: 3, fourthDown: 4,
  redZone: 4, turnoverOnDowns: 6, pancake: 5, brokenTackle: 5, hotOff: 3, touchback: 2, weather: 2, idle: 1, pat: 3, doink: 7 };
const talk = FF.talk = { cur: null, queue: [], gapT: 0, idleT: 14, banks: {}, rigs: {}, on: true, quiet: false };
const bank = (who, key, list) => { const k = who + ':' + key; return (talk.banks[k] || (talk.banks[k] = u.bank(list)))(FF.rf); };
const L = () => FF.data.lines;
talk.reset = () => { talk.cur = null; talk.queue.length = 0; talk.gapT = 0; talk.idleT = 14; };
talk.rig = who => talk.rigs[who] || (talk.rigs[who] = FF.Rigs.cast(who));
/** say a line now (priority p): CHET in caps, LOU in sentence case */
talk.say = (who, text, p = 5, o = {}) => {
  const mode = game.settings.commentary; if (mode === 'off' || !talk.on) return;
  if (talk.cur && talk.cur.p > p && talk.cur.t < talk.cur.len) return;
  if (talk.cur && talk.cur.t < 1.2 && talk.cur.p >= p && !o.force) { if (o.reply) talk.queue.push({ who, text, p, at: 1.2 }); return; }
  const cast = FF.data.cast[who] || { name: who.toUpperCase(), voice: who };
  talk.cur = { who, name: o.name || cast.name, text, p, t: 0, len: text.length / 15 + 1.5, shown: 0, voice: o.voice || cast.voice || who, portrait: o.portrait };
  if (mode === 'on' && !FF.fast) FF.voice.say(text, talk.cur.voice);
  talk.gapT = FF.T.commentaryGap;
  if (FF.replay && !o.noRecord) FF.replay.event('talk', { who, text });
};
/** an event's lines: CHET leads; LOU answers at priority 7 and up, 40% of the time */
talk.event = (key, vars = {}, p) => {
  const pr = p || PRI[key] || 3, lines = L(), c = lines.chet[key];
  if (talk.gapT > 0 && (!talk.cur || pr <= talk.cur.p)) return;
  if (c && c.length) talk.say('chet', u.fill(bank('chet', key, c), vars), pr);
  const l = lines.lou[key];
  if (l && l.length && pr >= 7 && FF.rf() < .4) talk.queue.push({ who: 'lou', text: u.fill(bank('lou', key, l), vars), p: pr - 1, at: 1.4 });
  else if (!c && l && l.length) talk.say('lou', u.fill(bank('lou', key, l), vars), pr);
};
talk.update = dt => {
  talk.gapT -= dt;
  if (talk.cur) { talk.cur.t += dt; talk.cur.shown = Math.min(talk.cur.text.length, talk.cur.shown + dt * 45); if (talk.cur.t > talk.cur.len) talk.cur = null; }
  for (const q of talk.queue) q.at -= dt;
  const nx = talk.queue.findIndex(q => q.at <= 0); if (nx >= 0 && (!talk.cur || talk.cur.t > 1)) { const q = talk.queue.splice(nx, 1)[0]; talk.say(q.who, q.text, q.p, { force: true }); }
  const m = FF.match;
  if (m && !talk.cur && m.phase === 'PLAYCALL') { talk.idleT -= dt; if (talk.idleT <= 0) { talk.idleT = 18 + FF.rf() * 14; talk.say('lou', bank('lou', 'idle', L().lou.idle), 1); } }
};
/* ---- the match's events ---- */
const nm = a => a ? (a.short || a.name) : 'HE';
const on = (ev, fn) => bus.on(ev, d => { if (FF.match && d.m === FF.match && !FF.replayPlaying) fn(d, d.m); });
const C = () => FF.crowdAudio, crowd = () => FF.match && FF.matchScene && FF.matchScene.crowd;
const ex = v => { const c = crowd(); if (c) c.excite(v); };
on('kickoff', () => talk.event('kickoff'));
on('punt', () => talk.event('punt'));
on('td', (d, m) => { talk.event('td', { player: nm(d.player), team: d.team.short, yards: d.yards }); ex(1); C().react('roar', 1.3); const c = crowd(); if (c) { c.jump = { side: d.side === 0 ? 0 : 1, t: 4 }; } FF.audioFx.sting('td'); FF.audioFx.sfx('airHorn'); void m; });
on('bigRun', d => { talk.event('bigRun', { player: nm(d.player), yards: d.yards }); ex(.7); });
on('bigCatch', d => { talk.event('bigRun', { player: nm(d.player), yards: d.yards }, 7); ex(.7); });
on('bigHit', d => { talk.event('bigHit', { player: nm(d.player) }); ex(.75); C().react('oooh'); FF.audioFx.sfx('bigHit'); });
on('megaHit', d => { talk.event('megaHit', { player: nm(d.player) }); ex(1); C().react('oooh', 1.4); FF.audioFx.sfx('bigHit'); FF.audioFx.sfx('helmetClang'); });
on('tackle', () => { FF.audioFx.sfx('tackleThud'); FF.audioFx.sfx('padsCrunch'); });
on('sack', d => { talk.event('sack', { player: nm(d.player) }); ex(.75); C().react('roar'); });
on('int', d => { talk.event('int', { player: nm(d.defender) }); ex(.9); C().react('gasp'); });
on('fumble', () => { talk.event('fumble'); ex(.8); C().react('gasp'); });
on('pile', () => { talk.event('pile'); FF.audioFx.sfx('pileThumps'); C().react('oooh'); });
on('pileWon', d => talk.event('pileWon', { team: d.team.short }));
on('drop', () => { talk.event('drop'); C().react('groan'); FF.audioFx.sfx('drop'); });
on('incomplete', d => { if (!d.dropped) talk.event('incomplete'); });
on('lateHit', d => { talk.event('lateHit', { player: nm(d.player) }); C().react(FF.rf() < .5 ? 'boo' : 'roar'); FF.matchScene && FF.matchScene.side && FF.matchScene.side.call('shrug'); FF.audioFx.sfx('refCapPop'); });
on('hotOn', d => { talk.event('hotOn', { player: nm(d.player) }); FF.audioFx.sfx('hotOn'); ex(.7); });
on('hotOff', d => talk.event('hotOff', { player: nm(d.player) }));
on('cardUsed', d => { const c = L().chet.card[d.card]; if (c) talk.say('chet', u.fill(c[0], { mascot: d.team.mascot.name }), 6); FF.audioFx.sfx('cardFlip'); });
on('fiascoBreak', d => { if (d.card) { talk.event('fiascoBreak'); FF.audioFx.sting('fiasco'); FF.audioFx.sfx('fiascoBreak'); } });
on('fg', d => { talk.event(d.good ? (d.doink ? 'fgDoink' : 'fgGood') : 'fgMiss', {}, 7); ex(d.good ? .8 : .4); C().react(d.good ? 'cheer' : 'groan'); if (d.good) FF.audioFx.sting('fg'); });
on('doink', () => FF.audioFx.sfx('doink'));
on('safety', () => { talk.event('safety'); ex(.8); });
on('firstDown', d => { talk.event('firstDown', { team: d.team.short }); ex(.45); FF.audioFx.sting('first'); C().react('cheer', .6); });
on('thirdLong', () => { talk.event('thirdLong'); FF.audioFx.sting('defense'); });
on('fourthDown', () => talk.event('fourthDown'));
on('turnoverOnDowns', () => { talk.event('turnoverDowns'); ex(.6); });
on('touchback', () => talk.event('touchback'));
on('pancake', () => talk.event('pancake'));
on('brokenTackle', () => { talk.event('brokenTackle'); ex(.5); });
on('special', d => { const c = L().chet.special[d.kind]; if (c) talk.say('chet', c[0], 8); if (FF.rf() < .5) talk.queue.push({ who: 'lou', text: u.pick(L().lou.special, FF.rf), p: 7, at: 1.6 }); ex(.8); FF.matchScene && FF.matchScene.banner && FF.matchScene.banner(d.who, d.kind); });
on('mascotOn', d => { talk.say('chet', u.fill(u.pick(L().chet.mascot, FF.rf), { mascot: d.team.mascot.name }), 7); FF.audioFx.sfx('mascotSqueak'); });
on('refDown', () => talk.event('refDown'));
on('lightsOut', () => { talk.event('lightsOut', {}, 8); FF.audioFx.sfx('lightsOut'); talk.queue.push({ who: 'lou', text: L().lou.lightsOut[0], p: 7, at: 2.4 }); });
on('lightsOn', () => FF.audioFx.sfx('lightsOn'));
on('halftime', (d, m) => { const lead = m.score[0] === m.score[1] ? -1 : m.score[0] > m.score[1] ? 0 : 1; if (lead < 0) talk.event('halftimeTie'); else talk.event('halftime', { team: m.teams[lead].short, score: Math.max(...m.score) + '-' + Math.min(...m.score) }); });
on('final', (d, m) => { if (d.winner < 0) talk.say('chet', 'IT ENDS IN A TIE! A FIASCO FOR EVERYBODY!', 10); else talk.event('final', { team: d.team.short, score: Math.max(...m.score) + '-' + Math.min(...m.score) }); if (Math.abs(m.score[0] - m.score[1]) >= 21) talk.queue.push({ who: 'lou', text: 'That wasn\'t a game. That was a crime scene.', p: 9, at: 2 }); });
on('overtime', () => talk.event('overtime'));
on('quarterStart', (d, m) => { if (d.quarter === 4 && m.qLen >= 120) m.twoMinSaid = false; });
on('whistle', (d, m) => { FF.audioFx.sfx('whistle'); if (m.weatherWet && FF.rf() < .05) talk.say('lou', L().lou.weather[m.snow ? 2 : 0], 2); });
on('snap', d => { FF.audioFx.sfx('hike'); const m = d.m, qb = d.qb; if (qb && !FF.fast) FF.voice.say('HUT!', 'qb'); void m; });
on('pass', d => FF.audioFx.sfx(d.type === 'bullet' ? 'rocketPass' : 'throwWhoosh'));
on('catch', () => FF.audioFx.sfx('catchSlap'));
on('fgKick', () => FF.audioFx.sfx('kickThump'));
on('action', d => { if (d.id === 'spin') FF.audioFx.sfx('spinWhoosh'); if (d.id === 'stiffArm') FF.audioFx.sfx('stiffArm'); if (d.id === 'hurdle') FF.audioFx.sfx('hurdle'); if (d.id === 'dive' || d.id === 'tackleDive') FF.audioFx.sfx('dive'); });
on('bounce', () => FF.audioFx.sfx('bounce'));
on('coin', () => { FF.audioFx.sfx('coinFlip'); });
on('meter', d => FF.audioFx.sfx(d.stage === 3 ? 'meterSet' : 'meterTick'));

/** the caption: bottom left, clear of the score bug and the prompt strip */
talk.draw = (g, r) => {
  const c = talk.cur; if (!c || game.settings.commentary === 'off') return;
  const rig = talk.rig(c.who === 'lou' ? 'lou' : c.who === 'chet' ? 'chet' : 'chet'), size = 30, w = Math.min(250, Math.floor(r.W * .52)), lines = E.font.wrap(c.text, w - size - 16), h = Math.max(size + 8, lines.length * 9 + 16), x = 8, y = r.H - h - 36;
  E.ui.box(g, x, y, w, h, { bg: '#0c0c1c', border: c.who === 'lou' ? '#6aa8ff' : '#ffb02e', alpha: .86 });
  if (c.portrait) c.portrait(g, x + 4, y + 4, size); else rig.drawPortrait(g, x + 4, y + 4, size, { zoom: 3, turn: .4, bg: '#1c2040' });
  E.font.text(g, c.name, x + size + 10, y + 3, c.who === 'lou' ? '#9ac8ff' : '#ffd36a', { font: 'tiny', outline: false });
  let n = Math.floor(c.shown);
  lines.forEach((ln, i) => { const s = ln.slice(0, Math.max(0, n)); n -= ln.length + 1; E.font.text(g, s, x + size + 10, y + 11 + i * 9, '#f4f0e6', { shadow: '#000', outline: false }); });
  rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: c.who === 'chet' ? 'shout' : null }); rig._talk = c.shown < c.text.length;
};
})();
