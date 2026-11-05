/* ---- Talk: the booth (Chuck Wallop and Moose Plunkett), Coach Marge's tips, chirp bubbles; every line babbles (PLAN 7.17) ---- */
const Talk = (() => {
  const box = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', nameColor: '#ffd36a' });
  const PRIO = { goal: 3, onetimer: 3, kaboomgoal: 3, fight: 3, kaboom: 3, glass: 3, hattrick: 3, fightend: 2, bighit: 2, vault: 3, organ: 3, boost: 3, mascot: 2, thinice: 2, period: 3, shootout: 3, overtime: 3, powerplay: 2, save: 1, post: 2, octopus: 1, item: 1, deke: 1, slap: 1, rush: 0, faceoff: 1, turtle: 2, twister: 2, filler: 0 };
  let lastT = -9, lastType = {}, lastLine = {}, quiet = 0, tip = null, tipT = 0, cur = 0;
  const vars = e => {
    const nm = id => id && M && M.byId[id] ? M.byId[id].name : '';
    const team = e.team !== undefined && M && e.team >= 0 ? M.teams[e.team].short : '';
    return Object.assign({ name: e.name || nm(e.by), victim: nm(e.victim) || e.vname || '', team, goalie: e.goalie && M ? (M.byId[e.goalie] || {}).name : '', a: e.an || nm(e.a), b: e.bn || nm(e.b),
      winner: e.winnerName || '', loser: e.loserName || '', item: e.item || '', arena: M ? M.arena.name : '', home: M ? M.teams[0].short : '', away: M ? M.teams[1].short : '',
      hs: M ? M.score[0] : 0, as: M ? M.score[1] : 0, period: M ? Match.periodName(e.n || M.period).toLowerCase() : '' }, {});
  };
  function say(type, e = {}) {
    if (!M || M.cfg.noTalk || S().commentary === false) return;
    const pool = TEXT.talk[type]; if (!pool) return;
    const pr = PRIO[type] || 0, now = M.t;
    if (pr < 3 && now - lastT < 1.2) return;
    if (now - (lastType[type] || -99) < (pr >= 3 ? 1 : 6)) return;
    if (box.open && pr < 2 && cur >= pr) return;
    const choices = pool.filter(l => now - (lastLine[l[1]] || -999) > 120), line = U.pick(RNG.fx, choices.length ? choices : pool);
    lastLine[line[1]] = now; lastType[type] = now; lastT = now; quiet = 0; cur = pr;
    const who = line[0] === 'm' ? 'moose' : 'chuck', c = Rigs.cast(who), text = U.fill(line[1], vars(e));
    sayAs(who, text);
    if (Net.isHost()) Net.talk(type, pool.indexOf(line), who, text);
  }
  function sayAs(who, text) {
    const c = Rigs.cast(who);
    box.voice = Synth.dialogVoice(c.voice);
    box.say(text, { name: c.name, portrait: c.rig, portraitSize: 26, portraitOpts: { zoom: 2.2, turn: .5 }, auto: 2.6, modal: false, alpha: .78 });
  }
  /* Coach Marge's tips: once each per save, in a banner under the score bug */
  function showTip(id) {
    if (!M || M.attract || HUB || S().tips === false || Save.data.tips[id] || !TEXT.tips[id]) return;
    if (!M.humans.some(h => !h.remote)) return;
    Save.data.tips[id] = 1; Save.write(); tip = TEXT.tips[id]; tipT = 6;
    Synth.babble(tip.replace(/\{\w+\}/g, ''), 'marge', { maxSyl: 12, vol: .7 });
  }
  const human = id => M && M.byId[id] && M.byId[id].human && !M.byId[id].human.remote;
  const on = (t, fn) => Bus.on(t, e => { if (M && !Replay.playing) fn(e); });
  on('match_start', () => { lastT = -9; lastType = {}; tip = null; setTimeout0(() => showTip('skate')); });
  on('faceoff_won', e => { if (M.phaseT < .1 && (M.fo[0] + M.fo[1]) % 4 === 1) say('faceoff', e); });
  on('possession', e => { if (human(e.by)) { showTip('pass'); if (Save.data.tips.pass) showTip('shoot'); } const s = M.byId[e.by]; if (s && Math.hypot(s.vx, s.vy) > 130 && RNG.fx() < .25) say('rush', e); });
  on('slap', e => say('slap', e));
  on('goal', e => say(e.kind === 'kaboom' ? 'kaboomgoal' : e.kind === 'onetimer' ? 'onetimer' : 'goal', e));
  on('save', e => { if (e.kind !== 'cover' && RNG.fx() < .6) say('save', e); });
  on('post', e => say('post', e));
  on('hit', e => { if (e.big) say('bighit', e); });
  on('glass', e => { if (e.state === 'shattered') say('glass', Object.assign({}, e, { victim: '' })); });
  on('fight_start', e => { say('fight', e); if (human(e.a) || human(e.b)) showTip('fight'); });
  on('fight_end', e => { if (!e.draw) say('fightend', e); });
  on('turtle', e => say('turtle', e));
  on('kaboom_start', e => say('kaboom', e));
  on('hat_trick', e => say('hattrick', e));
  on('period_end', e => say('period', e));
  on('powerplay', e => { say('powerplay', e); if (M.humans.some(h => h.team === e.team)) showTip('powerplay'); });
  on('item', e => { say('item', e); });
  on('item_throw', () => showTip('items'));
  on('hazard', e => { if (e.kind === 'octopus') say('octopus', e); });
  on('mascot_down', e => say('mascot', e));
  on('thin_ice_break', e => say('thinice', Object.assign({}, e, { victim: e.name })));
  on('deke_beat', e => say('deke', e));
  on('shootout_start', e => { say('shootout', e); showTip('shootout'); });
  on('ot_start', e => say('overtime', e));
  on('boost_start', e => say('boost', e));
  on('organ_boost', e => say('organ', e));
  on('vault_cracked', e => say('vault', e));
  on('twister', e => say('twister', e));
  on('pass', e => { if (M.byId[e.to] && human(e.to)) showTip('onetimer'); });
  on('intercept', e => { if (M.humans.some(h => h.team !== e.team)) showTip('defense'); });
  on('gloves_prompt', () => showTip('gloves'));
  on('boom', () => {});
  on('chirp', e => { const s = M.byId[e.by]; if (s) Synth.babble(e.line, (s.def.look && s.def.look.voice) || M.teams[s.team].voice, { maxSyl: 14, vol: .8 }); });
  on('intro', e => { const s = M.byId[e.by]; if (s) Synth.babble('number ' + e.num + ' ' + e.name, 'chuck', { maxSyl: 10 }); });
  let pending0 = [];
  function setTimeout0(fn) { pending0.push(fn); }
  function update(dt) {
    while (pending0.length) pending0.shift()();
    box.update(dt);
    if (!box.open) cur = 0;
    if (!M) return;
    quiet += dt; tipT = Math.max(0, tipT - dt);
    if (M.phase === 'play' && quiet > 8 && RNG.fx() < dt * .5) say('filler', {});
    if (M.phase === 'play') {
      if (M.t > 25) showTip('saucer'); if (M.t > 40) showTip('chirp');
      for (const h of M.humans) if (h.s && !h.remote) { if (M.puck.owner === h.s && M.skaters.some(o => o.team !== h.team && Math.hypot(o.x - h.s.x, o.y - h.s.y) < 30)) showTip('deke'); if (M.boom[h.team] > 50) showTip('boom'); }
    }
  }
  function draw(r) { if (S().subtitles !== false) box.draw(r); }
  return { say, sayAs, update, draw, showTip, box, get tip() { return tipT > 0 ? tip : null; }, get tipT() { return tipT; }, close() { box.close(); tip = null; tipT = 0; } };
})();
