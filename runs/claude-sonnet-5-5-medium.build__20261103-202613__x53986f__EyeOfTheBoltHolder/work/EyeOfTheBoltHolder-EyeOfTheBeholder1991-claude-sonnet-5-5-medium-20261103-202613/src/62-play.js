/* PLAY: controls -> commands, mouse in the view, the event pump (view, audio, HUD), screens registry, dialogue. */
UI.screens = {}; UI.screen = null; UI.dlg = null;
UI.open = (id, arg) => { const s = UI.screens[id]; if (!s) return; UI.screen = Object.assign({ id }, s); if (s.enter) s.enter.call(UI.screen, arg); UI.applyTimeScale(); UI.sfx('ui_ok'); };
UI.close = () => { if (UI.screen && UI.screen.exit) UI.screen.exit.call(UI.screen); UI.screen = null; UI.applyTimeScale(); UI.game.input.consumeAll(); };
UI.applyTimeScale = () => { const g = UI.game; if (UI.dlg && UI.dlg.open && UI.dlg.modal !== false) g.timeScale = 0; else if (UI.screen && UI.screen.id !== 'dev') g.timeScale = UI.screen.pause ? 0 : B.T.menus; else g.timeScale = 1; if (UI.screen && UI.screen.id === 'camp') g.timeScale = 1; };
UI.say = (pages, o) => { o = o || {}; const t = UI.dlg; t.voiceProf = o.voice || B.VOICES.narrator; t.say(pages, Object.assign({}, o, { onDone: () => { UI.applyTimeScale(); if (o.done) o.done(); } })); UI.applyTimeScale(); };
UI.dialogUpdate = (dt) => { const t = UI.dlg; if (!t.open) return false; t.update(dt); B.babble.track(t, t.voiceProf || B.VOICES.narrator); return t.open && t.modal !== false; };
/* ---- sounds for events ---- */
B.sfxFor = (e, V) => {
  const A = UI.game.audio, S = B.S, f = S.floor, sfx = (n, o) => A.sfx(n, o); const pan = (x, y) => { const p = S.party, rel = B.relDir(x, y); return rel === 1 ? .7 : rel === 3 ? -.7 : 0; };
  switch (e.t) {
    case 'step': sfx({ f1: 'step_wet', f2: 'step_metal', f3: 'step_dust', f4: 'step', rr: 'step_wet' }[f] || 'step'); break;
    case 'turn': sfx('turn'); break; case 'bump': sfx('bump'); break;
    case 'door': sfx(e.unlock ? 'unlock' : e.open ? 'door' : 'doorclose'); break; case 'gate': sfx(e.open ? 'gate' : 'gatedown'); break;
    case 'lever': sfx('lever'); break; case 'button': sfx('button'); break; case 'catch': sfx('catch'); break; case 'plate': sfx(e.down ? 'plate' : 'plateup'); break;
    case 'secretOpen': sfx('secret'); break; case 'illusion': sfx('illusion'); break; case 'tele': sfx('tele'); break; case 'spin': sfx('spin'); break; case 'fall': sfx('fall'); setTimeout(() => sfx('land'), 800); break;
    case 'darts': sfx('darts'); break; case 'lockfail': sfx(e.snap ? 'snap' : 'lockfail'); break; case 'pickup': case 'stow': case 'equip': sfx('pickup'); break; case 'putdown': sfx('putdown'); break; case 'throw': sfx('throw'); setTimeout(() => sfx('clatter'), 250); break;
    case 'alcovePlace': case 'alcoveTake': sfx('alcove'); break; case 'eat': sfx('eat'); break; case 'drink': sfx('drink'); break; case 'read': sfx('scroll'); break;
    case 'swingfx': sfx(['blunt', 'staff'].includes(e.cat) ? 'swing_blunt' : 'swing'); break; case 'shoot': sfx(e.kind === 'bolt' || e.kind === 'arrow' ? 'twang' : 'throw'); break;
    case 'mhit': { const t = B.MONS[(B.F().mons.find(m => m.id === e.id) || { type: 'rat' }).type]; sfx(e.crit ? 'crit' : t.undead ? 'hit_bone' : t.snd === 'clank' ? 'hit_metal' : t.snd === 'slurp' ? 'hit_ooze' : 'hit'); break; }
    case 'miss': sfx('miss'); break; case 'hurt': sfx('hurt', { pan: S.lastHitRel === 1 ? .7 : S.lastHitRel === 3 ? -.7 : 0 }); if (e.m != null && Math.random() < .5) { const m = S.party.members[e.m]; if (m && m.state === 'ok') B.babble.bark('hurt', B.voiceFor(m)); } UI.game.input.rumble(.4, .12); break;
    case 'down': sfx('death'); break; case 'death': sfx('death'); break; case 'levelup': sfx('levelup'); B.Music.sting('levelUp'); break; case 'raise': sfx('raise'); break; case 'deed': sfx('deed'); B.Music.sting('deed'); break; case 'secretFound': sfx('secretfound'); break;
    case 'cast': sfx(({ spark: 'spark', orb: 'orb', lightning: 'lightning', mend: 'heal', bless: 'bless', raise: 'raise' })[e.id] || 'cast'); break;
    case 'windup': case 'wake': case 'aware': { const t = B.MONS[e.type]; if (t) sfx(e.t === 'windup' ? 'windup' : t.snd, { vol: .6 }); break; }
    case 'mattack': sfx('hit', { pan: pan(e.x, e.y), vol: .5 }); break;
    case 'mdie': sfx('hit_bone', { pitch: .7 }); break; case 'mshoot': sfx('spark', { vol: .6 }); break;
    case 'bossWake': sfx('roar'); break; case 'bossWind': sfx(e.kind === 'chain' ? 'windup' : e.kind === 'gaze' ? 'gaze' : 'windup'); break; case 'bossChain': sfx('chain'); break; case 'bossRain': sfx('slam'); break; case 'bossSlam': sfx('slam'); break; case 'bossGaze': sfx('gaze'); break;
    case 'lockStart': sfx('lockturn'); break; case 'lockDone': sfx('shriek'); break; case 'relock': sfx('shriek'); break; case 'bossDie': sfx('roar'); B.Music.stop(); B.Music.sting('victory'); break; case 'summon': sfx('shriek', { vol: .6 }); break;
    case 'gear': sfx('gear'); break; case 'clockWhole': sfx('clockstrike'); break; case 'candle': sfx('catch'); break; case 'ward': sfx('unlock'); break; case 'ugOpen': sfx('gate'); break; case 'brace': sfx('brace'); break;
    case 'npcJoin': B.Music.sting('join'); break; case 'camp': break; case 'hint': sfx('ui_tab'); break; case 'projEnd': break;
    case 'checkpoint': sfx('ui_ok'); break; case 'crown': sfx('deed'); break;
  }
};
/* ---- the pump: sim events -> view, HUD, audio ---- */
UI.pump = () => {
  const S = B.S; if (!S || !S.events.length) return; const evs = S.events.splice(0, S.events.length);
  for (const e of evs) { try { B.View.event(e); UI.onEvent(e); B.sfxFor(e); if (UI.hook) UI.hook(e); } catch (er) { UI.game.fail('event ' + e.t, er); } }
};
UI.engaged = () => { const F = B.F(), S = B.S; return F.mons.some(m => m.hp > 0 && m.aware && m.state !== 'asleep' && m.state !== 'idle') || (S.boss && S.floor === 'f4' && S.boss.awake && !S.boss.dead); };
/* ---- controls ---- */
UI.useHold = 0; UI.flick = { armed: true, t: 0 };
UI.controls = (dt) => {
  const g = UI.game, inp = g.input, S = B.S, p = S.party; if (S.over || S.ended || !S.party) return;
  const ax = inp.padAxes || [], lx = ax[0] || 0, ly = ax[1] || 0, rx = ax[2] || 0, dz = Math.max(.35, inp.deadzone || .18);
  const down = a => inp.down(a), pr = a => inp.pressed(a);
  const want = { f: down('fwd') || ly < -.5, b: down('back') || ly > .5, l: down('strafeL') || lx < -.5, r: down('strafeR') || lx > .5 };
  // turning: keys/d-pad repeat; the right stick flicks
  let turn = 0; if (down('turnL')) turn = -1; else if (down('turnR')) turn = 1;
  const fl = UI.flick; if (Math.abs(rx) > .6) { fl.t -= dt; if (fl.armed || fl.t <= 0) { turn = rx < 0 ? -1 : 1; fl.armed = false; fl.t = .35; } } else { fl.armed = true; fl.t = 0; }
  if (!p.tween && !S.lockBusy) {
    if (turn) B.cmdTurn(turn); else if (want.f) B.cmdMove('f'); else if (want.b) B.cmdMove('b'); else if (want.l) B.cmdMove('l'); else if (want.r) B.cmdMove('r');
  } else {
    if (pr('fwd')) B.cmdMove('f'); else if (pr('back')) B.cmdMove('b'); else if (pr('strafeL')) B.cmdMove('l'); else if (pr('strafeR')) B.cmdMove('r'); else if (pr('turnL')) B.cmdTurn(-1); else if (pr('turnR')) B.cmdTurn(1);
  }
  if (p.tween && p.tween.kind === 'step' && !p.queued) { /* one move buffered */ }
  // use: key F immediately; pad X on release (hold = put down)
  const pad = UI.last() === 'gamepad';
  if (pad) { if (down('use')) { UI.useHold += dt; if (UI.useHold >= .4 && !UI.putDone) { UI.putDone = true; B.cmdPutDown(); } } else { if (UI.useHold > 0 && UI.useHold < .4) B.cmdUse(); UI.useHold = 0; UI.putDone = false; } }
  else if (pr('use')) B.cmdUse();
  if (pr('putDown')) B.cmdPutDown(); if (pr('throw')) B.cmdThrow();
  if (pr('strike')) { if (!(inp.held && inp.held.has && inp.held.has('Mouse2') && UI.overCards(inp.pointer()))) { if (!B.cmdStrike()) { /* a swing at the air */ } } }
  if (pr('selNext')) B.cmd({ c: 'select', m: (p.selected + 1) % p.members.length }); if (pr('selPrev')) B.cmd({ c: 'select', m: (p.selected + p.members.length - 1) % p.members.length });
  if (pr('handMain')) B.cmdHand(p.selected, 'main'); if (pr('handOff')) B.cmdHand(p.selected, 'off');
  const shift = inp.held && (inp.held.has('ShiftLeft') || inp.held.has('ShiftRight'));
  for (let i = 0; i < 6; i++) if (pr('m' + (i + 1)) && i < p.members.length) { B.cmd({ c: 'select', m: i }); B.cmdHand(i, shift ? 'off' : 'main'); }
  if (pr('party')) UI.open('party'); if (pr('camp')) { if (B.cmdCamp('open')) UI.open('camp'); } if (pr('map')) UI.open('map'); if (pr('journal')) UI.open('journal'); if (pr('examine')) UI.examine();
  UI.mouse();
};
UI.overCards = (pt) => { if (!pt) return false; const r = UI.game.r || { W: UI.game.W, H: UI.game.H }; return pt[1] >= r.H - 50; };
UI.mouse = () => {
  const g = UI.game, inp = g.input, S = B.S, p = S.party, V = B.View, r = g.r || { W: g.W, H: g.H }, ptr = inp.pointer ? inp.pointer() : null, n = p.members.length;
  UI.hoverHand = null; UI.tip = null;
  if (ptr && UI.last() === 'mouse') {
    for (let pos = 0; pos < n; pos++) { const [x, y, w, h] = UI.cardRect(r, pos, n); if (ptr[0] >= x && ptr[0] < x + w && ptr[1] >= y && ptr[1] < y + h) { const hh = ptr[0] > x + w - 17 ? 'off' : ptr[0] > x + w - 33 ? 'main' : null; if (hh && ptr[1] > y + h - 17) UI.hoverHand = { pos, h: hh }; } }
    if (!UI.hoverHand) { const h = V.pickAt(ptr[0], ptr[1]); if (h && ptr[1] < r.H - 50) UI.tip = { x: ptr[0], y: ptr[1], text: h.label }; }
  }
  const ck = inp.clicked(); if (!ck) { if (inp.held && inp.held.has('Mouse2') && inp.pressed('strike') && ptr && UI.overCards(ptr)) { for (let pos = 0; pos < n; pos++) { const [x, y, w, h] = UI.cardRect(r, pos, n); if (ptr[0] >= x && ptr[0] < x + w && ptr[1] >= y) { B.cmd({ c: 'select', m: p.formation[pos] }); UI.open('party'); } } } return; }
  if (ck[1] >= r.H - 50) { for (let pos = 0; pos < n; pos++) { const [x, y, w, h] = UI.cardRect(r, pos, n); if (ck[0] >= x && ck[0] < x + w) { const mi = p.formation[pos]; if (ck[1] > y + h - 17 && ck[0] > x + w - 33) B.cmdHand(mi, ck[0] > x + w - 17 ? 'off' : 'main'); else B.cmd({ c: 'select', m: mi }); } } return; }
  if (ck[0] > r.W - 60 && ck[1] < 24) return;
  const h = V.pickAt(ck[0], ck[1]); if (h) { if (h.act === 'use') B.cmdUse(); else B.cmdStrike(); return; }
  if (p.hand) { if (ck[1] > r.H * .55) B.cmdPutDown(); else B.cmdThrow(); }
};
UI.examine = () => {
  const S = B.S, p = S.party, F = B.F(), [fx, fy] = B.front(), c = B.cell(fx, fy); let t;
  const ms = B.monsAt(fx, fy); const ft = B.featureAt(p.cx, p.cy, p.dir);
  if (ms.length) { const m = ms[0], d = B.MONS[m.type], pct = m.hp / m.max; t = 'The ' + d.n.replace(/^The /, '') + (pct < .3 ? ' looks badly hurt.' : pct < .7 ? ' looks wounded.' : ' looks unhurt.') + ' ' + d.d; }
  else if (B.bossAt(fx, fy)) t = B.MONS.boltholder.d;
  else if (ft && ft.k !== 'torch') t = { lever: 'An iron lever, worn bright where hands go.', button: 'A square stone with a brass boss.', catch: 'A wall of slick stone. One stone sits proud of the rest.', plaque: 'A carved plaque.', alcove: 'A niche cut into the wall.', candle: 'A brass holder and a wax candle.', clock: 'A great clock face with four empty gear sockets.', undergate: 'A vast door with three keyholes and seven bolts.', greatLock: 'A wheel of iron, runes glowing.', shrine: 'A ring of tiny rat statues.' }[ft.k];
  else if (c === '+' || c === 'L' || c === 'M' || c === '=') t = c === '=' ? 'An iron gate, ' + (B.gateOpen(fx, fy) ? 'raised.' : 'down.') : c === 'M' ? 'A door of runes, shut.' : 'A door, ' + (F.doors[B.key(fx, fy)].open ? 'open.' : 'shut.');
  else { const it = (F.items[B.key(fx, fy)] || []).concat(F.items[B.key(p.cx, p.cy)] || []); if (it.length) t = it.map(r => B.ITEMS[r.id].n).join(' and ') + ' lie' + (it.length === 1 ? 's' : '') + ' here.'; else t = c === '#' ? 'A wall of slick stone.' : 'Nothing remarkable.'; }
  B.log(t);
};
