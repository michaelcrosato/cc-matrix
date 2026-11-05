/* ---- TALK (7.17): the booth (CHUCK WALLOP on play-by-play, MOOSE PLUNKETT on color) in a bottom subtitle box with
 * live portraits, two lines at most, non-modal and auto-advancing; every line babbles in the speaker's voice. Pools by
 * event with priorities and cooldowns; Moose's filler after 8 s of quiet. Coach Marge's tips: a banner under the score
 * bug, each shown once per profile ---- */
const Talk = (() => {
  let booth = null, chuck = null, moose = null, lastAny = -9, lastType = {}, lastLine = {}, quiet = 0, tip = null, tipQ = [];
  const PRI = { goal: 5, goal_ot: 6, kaboomgoal: 6, fight: 5, kaboom: 5, gilded: 5, glass: 4, hattrick: 6, final: 6, tie: 6, period: 5, vault: 5, mascot: 4, thinice: 4, bighit: 3, onetimer: 5, shootout: 4, boost: 5, organ: 5, fightwin: 4, post: 3, save: 1, glove: 2, deke: 2, windup: 1, shot: 0, rush: 0, drop: 2, pp: 3, item: 1, octopus: 2, buried: 2, turtle: 3, twister: 3, blocked: 1, takeaway: 1, crack: 2, goal_top: 5, goal_low: 5 };
  function init() {
    booth = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', bg: '#0a1224', voice: null });
    chuck = Rigs.cast('chuck'); moose = Rigs.cast('moose');
  }
  const on = () => S('commentary') !== false && !(HUB && typeof Net !== 'undefined' && Net.ended);
  /** say a line from a pool: type, vars; returns true when it spoke */
  function say(type, vars = {}, force) {
    if (!on() || !booth) return false;
    const pool = TEXT.talk[type]; if (!pool) return false;
    const now = game.real, pri = PRI[type] || 0, open = booth.open;
    if (!force) { if (now - lastAny < 1.2 && pri < 4) return false; if (now - (lastType[type] || -99) < 6 && pri < 5) return false; if (open && pri < 3) return false; }
    const fresh = pool.filter(l => now - (lastLine[l[1]] || -999) > 120), list = fresh.length ? fresh : pool, line = list[Math.floor(RNG.fx() * list.length)];
    lastAny = now; lastType[type] = now; lastLine[line[1]] = now; quiet = 0;
    speak(line[0], U.fill(line[1], vars));
    return true;
  }
  function speak(who, text) {
    const rig = who === 'm' ? moose : chuck, c = CAST[who === 'm' ? 'moose' : 'chuck'];
    if (S('subtitles') !== false) booth.say(text, { name: c.name, portrait: rig, portraitSize: 32, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1a2a4a' }, auto: 2.4, modal: false, alpha: .82, voice: Synth.voiceFn(c.voice) });
    else Synth.say(text, c.voice);
  }
  function wire() {
    const M = () => Match.m, nm = id => { const s = M() && M().byId(id); return s && s.def ? s.def.name : ''; }, tm = t => M() ? M().teams[t].def.short : '';
    const base = () => { const m = M(); if (!m) return {}; return { arena: m.arena.name, period: m.ot ? 'overtime' : U.ord(Math.min(3, m.period)).toLowerCase() + ' period', home: m.teams[0].def.short, away: m.teams[1].def.short, hs: m.teams[0].score, as: m.teams[1].score }; };
    const V = o => Object.assign(base(), o);
    Bus.on('faceoff_drop', () => { const m = M(); if (m && m.clock >= m.cfg.periodLen - .5 && m.phase !== 'shootout') say('drop', V({})); });
    Bus.on('possession', e => { const m = M(); if (!m) return; const s = m.byId(e.by); if (s && Math.hypot(s.vx, s.vy) > 150 && Math.abs(s.x - Rink.C.x) < 120 && RNG.fx() < .4) say('rush', V({ name: s.def.name })); if (e.how === 'battle' || e.how === 'pickup' && false) say('takeaway', V({ name: s.def.name })); });
    Bus.on('deke_beat', e => say('deke', V({ name: nm(e.by), victim: nm(e.victim) })));
    Bus.on('deke', e => { if (RNG.fx() < .35) say('deke', V({ name: nm(e.by), victim: 'the defender' })); });
    Bus.on('windup', e => { if (RNG.fx() < .4) say('windup', V({ name: nm(e.by) })); });
    Bus.on('shot', e => { if (e.onGoal && RNG.fx() < .35) say('shot', V({ name: nm(e.by) })); });
    Bus.on('save', e => { const m = M(); const g = m && m.byId(e.goalie); say(e.kind === 'glove' && e.freeze ? 'glove' : 'save', V({ goalie: g ? g.def.name : 'the goalie' })); });
    Bus.on('post', e => say('post', V({ name: nm(e.by) })));
    Bus.on('block', e => { if (RNG.fx() < .5) say('blocked', V({ name: nm(e.by) })); });
    Bus.on('goal', e => {
      const m = M(); if (!m || e.so) return; const s = m.byId(e.by), g = m.goalieAt(e.net), v = V({ name: s ? s.def.name : m.teams[e.team].def.short, team: tm(e.team), score: m.teams[0].score + '-' + m.teams[1].score, goalie: g ? g.def.name : '' });
      const type = e.ot ? 'goal_ot' : e.kind === 'kaboom' ? 'kaboomgoal' : e.kind === 'onetimer' ? 'onetimer' : m.puck.z > 12 ? 'goal_top' : m.puck.z < 3 && RNG.fx() < .4 ? 'goal_low' : 'goal';
      say(type, v, true);
    });
    Bus.on('hit', e => { if (e.big) { const m = M(); if (m) m.lastBigHitBy = e.by; say('bighit', V({ name: nm(e.by), victim: nm(e.victim) })); } });
    Bus.on('glass', e => { const m = M(); const v = m && m.byId(e.by); say(e.state === 'shattered' ? 'glass' : 'crack', V({ victim: v && v.def ? v.def.name : 'somebody' })); });
    Bus.on('fight_start', e => say('fight', V({ a: nm(e.a), b: nm(e.b) }), true));
    Bus.on('fight_end', e => { if (!e.draw) say('fightwin', V({ name: nm(e.winner), victim: nm(e.loser) }), true); });
    Bus.on('turtle', e => say('turtle', V({ name: nm(e.by) })));
    Bus.on('kaboom_start', e => say(e.gilded ? 'gilded' : 'kaboom', V({ team: tm(e.team) }), true));
    Bus.on('mascot_down', () => say('mascot', V({}), true));
    Bus.on('hat_trick', e => say('hattrick', V({ name: nm(e.by) }), true));
    Bus.on('period_end', () => { const m = M(); if (m && !m.ot) say('period', V({}), true); });
    Bus.on('final', e => { const m = M(); if (!m) return; if (e.winner < 0) say('tie', V({}), true); else say('final', V({ team: tm(e.winner), score: Math.max(...e.score) + '-' + Math.min(...e.score) }), true); });
    Bus.on('sin_bin', e => say('pp', V({ team: tm(1 - e.team) })));
    Bus.on('item', e => { const m = M(); if (m && RNG.fx() < .6) say('item', V({ name: nm(e.by), item: ITEM_DEFS[e.kind].name })); });
    Bus.on('hazard', e => { if (e.kind === 'octopus' || e.kind === 'rat') say('octopus', V({ victim: nm(e.victim) })); });
    Bus.on('plunge', e => say('thinice', V({ victim: nm(e.victim) }), true));
    Bus.on('buried', e => say('buried', V({ victim: nm(e.victim) })));
    Bus.on('vault_locked', () => { const p = TEXT.talk.vault[0]; speak(p[0], p[1]); });
    Bus.on('vault_cracked', () => { const p = TEXT.talk.vault[1]; speak(p[0], p[1]); });
    Bus.on('twister', () => say('twister', V({})));
    Bus.on('shootout_start', () => say('shootout', V({ name: '' }), true));
    Bus.on('boost_start', () => say('boost', V({}), true));
    Bus.on('organ_boost', () => say('organ', V({}), true));
    // Coach Marge's tips, by trigger
    const T2 = (ev, id, when) => Bus.on(ev, e => { const m = M(); if (m && m.humans.length && (!when || when(e, m))) tipOnce(id); });
    T2('faceoff_won', 'skate'); T2('possession', 'pass', (e, m) => m.byId(e.by).ctrl.kind === 'human'); T2('pass_complete', 'shoot', (e, m) => m.byId(e.to).ctrl.kind === 'human');
    T2('pass', 'onetimer', (e, m) => { const s = m.byId(e.to); return s && s.ctrl.kind === 'human' && Math.abs(s.x - Rink.goalX(m.attackNet(s.team))) < 200; });
    T2('possession', 'defense', (e, m) => !m.teams[m.byId(e.by).team].human); T2('takeaway', 'deke', (e, m) => !m.teams[m.byId(e.by).team].human);
    T2('shot', 'boom', (e, m) => m.boom[0] > 20 || m.boom[1] > 20); T2('gloves', 'fight'); T2('item_land', 'items'); T2('sin_bin', 'pp'); T2('kaboom_start', 'kaboom', (e, m) => m.teams[e.team].human); T2('shootout_start', 'shootout');
    T2('hit', 'gloves', (e, m) => e.big && m.byId(e.victim).ctrl.kind === 'human'); T2('period_start', 'saucer'); T2('stoppage', 'chirp'); T2('intermission', 'camera');
  }
  function tipOnce(id) {
    if (S('tips') === false || !TEXT.tips[id] || (tip && tip.id === id) || tipQ.includes(id)) return;
    const seen = E.store.get('ihk:tips', {}) || {}; if (seen[id]) return; seen[id] = 1; E.store.set('ihk:tips', seen);
    tipQ.push(id);
  }
  function step(dt) {
    if (!booth) return; booth.update(dt);
    const m = Match.m; if (m && m.phase === 'play') { quiet += dt; if (quiet > 8 && !booth.open && on()) { quiet = 0; const f = TEXT.filler, line = f[Math.floor(RNG.fx() * f.length)]; if (game.real - (lastLine[line] || -999) > 120) { lastLine[line] = game.real; speak('m', line); } } }
    if (tip) { tip.t -= dt; if (tip.t <= 0) tip = null; } else if (tipQ.length) tip = { id: tipQ.shift(), t: 5.5 };
  }
  function draw(r) { if (booth) booth.draw(r); }
  function drawTip(g, r, y) {
    if (!tip) return; const text = TEXT.tips[tip.id], a = Math.min(1, tip.t * 2);
    // two short lines, split at the middle word, at the top left under the radar's row
    const words = text.split(' '), half = Math.ceil(words.length / 2), l1 = words.slice(0, half).join(' '), l2 = words.slice(half).join(' ');
    const wd = s => E.font.width(s.replace(/\{[a-z]+\}/g, '')) + (s.match(/\{[a-z]+\}/g) || []).reduce((q, k) => q + Glyphs.chipW(k.slice(1, -1)) + 2, 0);
    const w = Math.max(wd(l1), wd(l2)) + 16, x = 6;
    px.blend(g, .9 * a, 'normal', () => UI.panel(g, x, y, w, 34, { border: '#7ad87a', bg: ['#10281a', '#08140c'] }));
    E.font.text(g, "COACH MARGE'S TIP", x + 8, y + 3, '#7ad87a', { font: 'tiny', outline: false });
    Glyphs.text(g, l1, x + 8, y + 12); Glyphs.text(g, l2, x + 8, y + 23);
  }
  return { init, say, speak, wire, step, draw, drawTip, tipOnce, get open() { return booth && booth.open; }, close() { if (booth) booth.open = false; }, get booth() { return booth; } };
})();
