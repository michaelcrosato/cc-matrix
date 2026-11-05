// THE CAMPAIGN SCENE: the continent in three-quarter view and the season's pipeline. A queue of steps runs in order
// (season card, Tidings cards, story events, a hot-seat privacy card, Muster, March, then each battle: Command or
// Delegate, aftermath, story). The Muster panels: the castle card, Organize (bind and formation), Summon, Move, Quest,
// Equip, Promote; the command menu: Realm (knights, monsters, items, chronicle, objectives) and End Muster.

const CU = G.UI, CP = E.px, CH = G.hex;
const C = G.Camp = { sim: null, todo: [], panel: null, focus: 'avalorn', t: 0 };
const FORM = ['vanguard', 'shield', 'column'];
const FORM_NAME = { vanguard: 'Vanguard', shield: 'Shield', column: 'Column' };

/* ---- helpers ---- */
const realmOf = r => G.get('realm', r);
const kname = id => (G.has('knight', id) ? G.get('knight', id).short : id);
const cname = id => (id === 'sanctum' ? 'The Clockwork Sanctum' : G.get('castle', id).name);
const me = () => C.sim.currentHuman() || C.sim.s.humans[0];
function castleScreen(r, id) { const p = G.get('castle', id).pos; return r.w(p[0], p[1], 0); }
function seasonColor() { return G.elemColor(C.sim.season); }
/** start a campaign (from setup) or come back to it (after a battle or a story scene) */
G.startCampaign = (sim, o = {}) => { C.sim = sim; C.todo = []; C.panel = null; C.marchArrows = []; C.wipe = 0; G.game.go('campaign', Object.assign({ fresh: true }, o)); };

G.SCENES.campaign = {
  pausable: true, view: 'threequarter', input: G.PRESET, camera: { zoom: [.6, 1.6], start: 1 },
  enter(data = {}) {
    if (!C.sim) { const sim = G.CampaignSim.create({ seed: 7, humans: ['verdance'] }); C.sim = sim; }
    if (!C.wm) C.wm = new G.WorldMap();
    C.wm.update(C.sim, C.sim.season);
    G.game.lights.enabled = true; G.game.lights.ambient = .9;
    G.game.cam.bounds = v => C.wm.map.bounds(v);
    G.game.setView('threequarter');
    if (!C.focus || !G.has('castle', C.focus)) C.focus = G.get('realm', me()).capital || 'meridian';
    C.cam = C.cam || G.get('castle', C.focus).pos.slice();
    G.game.weather = G.weatherFor(C.sim.season, G.game.settings && G.game.settings.reduceMotion);
    if (G.game.weather) G.game.weather.amount *= .5;
    G.music(C.sim.season);
    if (data.fresh) { C.todo = []; C.panel = null; if (C.sim.s.phase === 'tidings') C.todo.push({ k: 'tidings' }); else if (C.sim.s.phase === 'muster') C.todo.push({ k: 'privacy', realm: me(), then: 'muster' }); else if (C.sim.s.phase === 'march') C.todo.push({ k: 'privacy', realm: me(), then: 'march' }); else if (C.sim.s.phase === 'resolve') C.todo.push({ k: 'resolve' }); }
    if (data.battle) afterBattle(data.battle);
    G.saveable(C.sim.s.phase === 'muster');
  },
  exit() { G.game.weather = null; G.saveable(false); },
  back() { if (C.panel && C.panel.back) { C.panel.back(); return true; } return false; },
  update(dt) {
    G.inputTick(dt); C.t += dt; CU.tickToasts(dt);
    if (G.Talk.update(dt)) return;
    if (CU.modalUpdate()) return;
    if (C.wipe > 0) C.wipe = Math.max(0, C.wipe - dt / 1.5);
    camera(dt);
    if (C.anim) { C.anim.t += dt; if (C.anim.t >= C.anim.dur) { const f = C.anim.done; C.anim = null; if (f) f(); } return; }
    if (C.panel) { C.panel.update(dt); return; }
    if (C.todo.length) { runStep(C.todo.shift()); return; }
    if (C.sim.s.result) { G.goEnding(C.sim); return; }
    // free map play: Muster or March
    mapUpdate(dt);
  },
  draw(r) { drawCampaign(r); }
};
G.saveable = on => { try { if (G.game.saves) G.game.saves.canSave = !!on && !(G.hub && G.hub.active); } catch (e) { /* no saves */ } };

/* ---- the step queue ---- */
function runStep(st) {
  const sim = C.sim;
  switch (st.k) {
    case 'tidings': {
      const res = sim.beginSeason();
      G.autosave('Tidings');
      C.wm.update(sim, sim.season); C.wipe = 1; G.music(sim.season, { fade: 1.2 }); G.sting('season_' + sim.season);
      G.game.weather = G.weatherFor(sim.season, G.game.settings && G.game.settings.reduceMotion); if (G.game.weather) G.game.weather.amount *= .5;
      C.todo.unshift({ k: 'cards', cards: res.cards }, ...res.events.map(e => ({ k: 'event', id: e.id, realm: e.realm })), { k: 'takeStory' }, { k: 'privacy', realm: me(), then: 'muster' });
      if (sim.s.result) C.todo = [{ k: 'cards', cards: res.cards }, ...res.events.map(e => ({ k: 'event', id: e.id, realm: e.realm }))];
      break;
    }
    case 'cards': C.panel = tidingsPanel(st.cards); break;
    case 'event': playStory(st.id, st.realm); break;
    case 'takeStory': { const evs = sim.takeStory(); C.todo.unshift(...evs.map(e => ({ k: 'event', id: e.id, realm: e.realm }))); break; }
    case 'privacy': {
      const r = st.realm; if (!r) { C.todo.unshift({ k: st.then }); break; }
      if (sim.s.humans.length > 1 && G.game.settings.privacy !== 'Off') C.panel = privacyPanel(r, () => { C.panel = null; C.todo.unshift({ k: st.then }); });
      else C.todo.unshift({ k: st.then });
      G.In.seatInput = G.seatOf ? G.seatOf(r) : null;
      break;
    }
    case 'muster': {
      C.focus = sim.capital(me()) || C.focus; G.saveable(true);
      CU.tip('muster', 'Muster', 'Choose a castle of yours: Organize troops, Summon monsters, Move, Quest, Equip and Promote. Hold ' + G.labelOf('command') + ' to end the Muster.');
      if (G.autoplayOn) { autoplayMuster(); }
      break;
    }
    case 'march': {
      G.saveable(false);
      C.todo.unshift({ k: 'takeStory' });
      CU.tip('march', 'March', 'Choose an enemy or brigand castle beside yours and send up to three troops. Hold ' + G.labelOf('command') + ' when your orders are given.');
      if (G.autoplayOn) { G.CampaignAI.march(sim, me()); sim.apply({ t: 'endMarch', realm: me() }); afterMarchEnd(); }
      break;
    }
    case 'resolve': nextResolution(); break;
    case 'anim': C.anim = st.anim; break;
    case 'fn': st.fn(); break;
  }
}
function playStory(id, realm) {
  const sim = C.sim, ev = G.get('event', id);
  // an ending is not played here: an empty step lets the queue run on to its result check, which plays it (G.goEnding)
  if (ev.ending) { C.todo.unshift({ k: 'fn', fn: () => {} }); return; }
  if (G.fastStory) { sim.apply({ t: 'event', id, realm, choice: 0 }); return; }
  G.game.go('event', { id, realm: realm === 'world' ? me() : realm, sim, onDone: choice => {
    const evs = sim.apply({ t: 'event', id, realm: realm === 'world' ? me() : realm, choice });
    if (ev.tip) CU.toast(ev.tip, CU.COL.gold, 4);
    for (const e of evs) if (e.e === 'joined') CU.toast(kname(e.knight) + ' joins your banner!', '#7ae07a');
    if (evs.some(e => e.e === 'sanctumOpens')) C.todo.unshift({ k: 'resolve' });
    if (id === 'tutorial' && choice === 0) { G.game.go('battle', G.tutorialBattle(realm, () => { G.game.go('campaign', {}); CU.toast('The border road is clear.', '#7ae07a'); })); return; }
    G.game.go('campaign', {});
  } }, { fade: .3 });
}

/* ---- Tidings ---- */
function tidingsPanel(cards) {
  const sim = C.sim, list = cards.filter(c => ['season', 'candle', 'income', 'questReturn', 'stilled', 'rivalFailed', 'rivalWheel', 'victory', 'defeat'].includes(c.e) && (!c.realm || sim.isHuman(c.realm) || c.e === 'stilled'));
  let i = 0, t = 0;
  const p = {
    update(dt) {
      t += dt; const inp = G.inp();
      if (G.holdDone('confirm', .7)) { finish(); return; }
      if ((inp.pressed('confirm') || inp.clicked && inp.clicked()) && t > .35) { i++; t = 0; G.sfx('ui_move'); if (i >= list.length) finish(); else cue(); }
      const c = list[i]; if (c && c.e === 'season' && t > 1.6) { i++; t = 0; if (i >= list.length) finish(); else cue(); }
    },
    draw(r) {
      const c = list[i]; if (!c) return;
      r.overlay(g => {
        const k = CU.k(), W = r.W, H = r.H;
        if (c.e === 'season') {
          const col = G.elemColor(c.season); CP.rect(g, 0, H / 2 - 40 * k, W, 80 * k, '#0a0814'); CP.rect(g, 0, H / 2 - 40 * k, W, 2, col); CP.rect(g, 0, H / 2 + 40 * k - 2, W, 2, col);
          drawWheel(g, W / 2, H / 2 - 4, 26 * k, c.season, t);
          CU.title(g, G.SEASON_NAME[c.season].toUpperCase(), W / 2 - 80 * k, H / 2 - 16 * k, { scale: 3, colors: ['#ffffff', col, E.tones(col).sh] });
          CU.text(g, 'YEAR ' + c.year + ' OF THE BRIGANTIME', W / 2 + 80 * k, H / 2 - 10 * k, '#e8e4f0', { align: 'center' });
          CU.text(g, seasonTagline(c.season), W / 2 + 80 * k, H / 2 + 2 * k, col, { align: 'center' });
          return;
        }
        const w = 230 * k, h = 66 * k, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2);
        CU.box(g, x, y, w, h, { alpha: .95 });
        CU.text(g, 'TIDINGS', x + 8, y + 5, CU.COL.gold); CU.text(g, (i + 1) + '/' + list.length, x + w - 8, y + 5, CU.COL.dim, { align: 'right' });
        const line = (s, yy, col = '#ffffff') => CU.text(g, s, x + 10, y + yy * k, col);
        switch (c.e) {
          case 'candle': CP.sprite(g, G.ICON.candle, x + 10, y + 18 * k); line('The Hour-Candle burns. ' + c.left + ' seasons remain.', 20, c.left <= 2 ? '#ff6a5a' : '#ffffff'); break;
          case 'income': { CP.sprite(g, G.ICON.mana, x + 10, y + 19 * k); line('Mana  +' + c.income + '  upkeep -' + c.upkeep + '  = ' + c.mana, 20); if (c.deserted.length) line('Deserted for want of mana: ' + c.deserted.slice(0, 3).join(', '), 32, '#ff9a8a'); line(G.get('realm', c.realm).short + ' treasury', 44, CU.COL.dim); break; }
          case 'questReturn': {
            const v = G.knightVis(c.knight); v.portrait(g, x + 8, y + 16 * k, 30 * k);
            const site = G.get('site', c.site), pool = c.kind === 'mishap' && c.lost ? G.VIGNETTES.mishapLoss : G.VIGNETTES[c.kind === 'story' ? 'treasure' : c.kind];
            const txt = (Array.isArray(pool) ? pool[c.variant % pool.length] : 'A quest ends.').replace(/\{\$knight\}/g, kname(c.knight)).replace(/\{\$site\}/g, site.name).replace(/\{\$thing\}/g, c.thing || 'nothing');
            const lines = E.font.wrap(c.story ? kname(c.knight) + ' returns from ' + site.name + '. Someone came back with them.' : txt, w - 50 * k, { scale: k });
            lines.forEach((l, j) => CU.text(g, l, x + 44 * k, y + (18 + j * 10) * k, '#ffffff'));
            if (c.keeper) CU.text(g, 'The Keeper sleeps between two seconds.', x + 44 * k, y + 50 * k, '#b8b0c8');
            break;
          }
          case 'stilled': CP.sprite(g, G.ICON.clock, x + 10, y + 19 * k); line(cname(c.castle) + ' is Stilled this season.', 20, '#c8c8d8'); line('No mana; its troops cannot move, march or quest.', 32, CU.COL.dim); break;
          case 'rivalFailed': line(G.get('realm', c.realm).short + ' fell in the Sanctum. Meridian is the Hour\'s again.', 20); break;
          case 'rivalWheel': line(G.get('realm', c.realm).short + ' has set the Wheel.', 20, '#ff6a5a'); break;
          case 'victory': line('The Gray Knight has fallen!', 20, '#ffe080'); break;
          case 'defeat': line('The legend ends here.', 20, '#ff6a5a'); break;
        }
      });
      CU.prompts(r, [['confirm', 'Next'], ['confirm', 'Hold: Skip all']]);
    }
  };
  function finish() { C.panel = null; }
  function cue() { const c = list[i]; if (c && c.e === 'candle') { G.sfx('candle_hiss'); G.sting('candle'); } if (c && c.e === 'stilled') G.sfx('stop'); }
  if (!list.length) return null;
  return p;
}
function seasonTagline(s) { return { spring: "Verdance's knights grow bold.", summer: "Solmark's banners burn bright.", autumn: "Amberlyn's harvest is gathered.", winter: "Hoarfast's knights grow bold." }[s]; }
function drawWheel(g, x, y, R, season, t) {
  const segs = ['winter', 'spring', 'summer', 'autumn'];
  for (let i = 0; i < 4; i++) { const a0 = -Math.PI / 2 + i * Math.PI / 2 - Math.PI / 4 + t * .3; const pts = [[x, y]]; for (let j = 0; j <= 8; j++) { const a = a0 + j / 8 * Math.PI / 2; pts.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); } CP.poly(g, pts, segs[i] === season ? G.elemColor(segs[i]) : E.tones(G.elemColor(segs[i])).sh); }
  CP.disc(g, x, y, R * .3, '#d8c070'); CP.disc(g, x, y, R * .18, '#3a3a46');
}

/* ---- the map: focus, cursor, panels ---- */
function camera(dt) {
  const inp = G.inp(), pa = inp.padAim, pan = inp.pan && inp.pan();
  if (pa) { C.cam[0] += pa[0] * dt * 260; C.cam[1] += pa[1] * dt * 260; C.free = true; }
  else if (pan) { const g = G.game.view.screenDirToGround(-pan[0], -pan[1]), l = Math.hypot(pan[0], pan[1]) / (G.game.view.scale || 1); C.cam[0] += g[0] * l; C.cam[1] += g[1] * l; C.free = true; }
  else if (G.game.settings.edgePan === 'On') { const p = inp.pointer && inp.pointer(); if (p && inp.lastDevice === 'mouse') { const W = G.game.W, H = G.game.H, ex = p[0] < 8 ? -1 : p[0] > W - 8 ? 1 : 0, ey = p[1] < 8 ? -1 : p[1] > H - 8 ? 1 : 0; if (ex || ey) { C.cam[0] += ex * dt * 220; C.cam[1] += ey * dt * 220; C.free = true; } } }
  if (!C.free) { const p = C.camGoal || G.get('castle', C.focus).pos; C.cam[0] += (p[0] - C.cam[0]) * Math.min(1, dt * 6); C.cam[1] += (p[1] + 20 - C.cam[1]) * Math.min(1, dt * 6); }
  C.cam[0] = G.clamp(C.cam[0], 60, 964); C.cam[1] = G.clamp(C.cam[1], 60, 980);
  G.game.focus(C.cam[0], C.cam[1], 0);
}
/** move the focus to the castle in a screen direction */
function stepFocus(dx, dy, allowed) {
  const g = G.game.view.screenDirToGround(dx, dy), p0 = G.get('castle', C.focus).pos;
  let best = null, bs = Infinity;
  for (const c of G.all('castle')) {
    if (c.id === C.focus || (allowed && !allowed.includes(c.id))) continue;
    const vx = c.pos[0] - p0[0], vy = c.pos[1] - p0[1], d = Math.hypot(vx, vy), along = (vx * g[0] + vy * g[1]) / (d || 1);
    if (along < .35) continue;
    const s = d * (2 - along); if (s < bs) { bs = s; best = c.id; }
  }
  if (best) { C.focus = best; C.free = false; G.sfx('ui_move'); }
}
/** the castle under the mouse pointer (screen distance) */
function hoverCastle(allowed) {
  const inp = G.inp(), p = inp.pointer && inp.pointer(); if (!p || inp.lastDevice !== 'mouse') return null;
  if (C.hp && p[0] === C.hp[0] && p[1] === C.hp[1]) return null; C.hp = p.slice();
  const gp = G.game.mouseGround(); if (!gp) return null;
  let best = null, bd = 34; for (const c of G.all('castle')) { if (allowed && !allowed.includes(c.id)) continue; const d = Math.hypot(c.pos[0] - gp[0], c.pos[1] - gp[1]); if (d < bd) { bd = d; best = c.id; } }
  return best;
}
function mapNav(allowed) {
  for (const [a, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) if (G.repeat(a)) { const m = G.inp().move(); stepFocus(Math.abs(m[0]) > .3 ? m[0] : dx, Math.abs(m[1]) > .3 ? m[1] : dy, allowed); }
  const h = hoverCastle(allowed); if (h && h !== C.focus) { C.focus = h; G.sfx('ui_move'); C.free = false; }
  if (G.pressed('next') || G.pressed('prev')) {
    const mine = (allowed || C.sim.castlesOf(me())).slice().sort(), i = mine.indexOf(C.focus);
    C.focus = mine[(i + (G.pressed('prev') ? mine.length - 1 : 1) + mine.length) % mine.length] || C.focus; C.free = false; G.sfx('ui_move');
  }
  const z = G.inp().pressed('zoomIn') ? 1.12 : G.inp().pressed('zoomOut') ? 1 / 1.12 : 1; if (z !== 1 && G.game.zoomBy) G.game.zoomBy(z);
}
function mapUpdate(dt) {
  const sim = C.sim, inp = G.inp(), ph = sim.s.phase;
  mapNav();
  if (G.holdDone('command')) { if (ph === 'muster') askEndMuster(); else if (ph === 'march') askEndMarch(); return; }
  if (G.tapped('command')) { C.panel = commandsPanel(); G.sfx('ui_open'); return; }
  if (inp.pressed('info')) { C.panel = castleInfoPanel(C.focus); return; }
  if (inp.pressed('confirm')) {
    const own = sim.s.castles[C.focus].owner === me();
    if (ph === 'muster') { if (own) { C.panel = castlePanel(C.focus); G.sfx('ui_confirm'); } else { C.panel = castleInfoPanel(C.focus); } }
    else if (ph === 'march') {
      const tg = sim.marchTargets(me());
      if (tg.includes(C.focus)) { C.panel = marchPanel(C.focus); G.sfx('ui_confirm'); }
      else if (C.focus === 'meridian' && tg.includes('sanctum')) { C.panel = marchPanel('sanctum'); }
      else { G.sfx('ui_error'); CU.toast(own ? 'Choose a castle to attack' : 'Not beside one of your castles', CU.COL.bad); }
    }
  }
  if (inp.pressed('cancel')) { G.game.pause(); }
}
function askEndMuster() { const go = () => { G.saveable(false); const ev = C.sim.apply({ t: 'endMuster', realm: me() }); afterPhaseChange(ev); }; if (G.game.settings.confirmEnd === 'Off') go(); else CU.confirm('End the Muster and give your marching orders?', go, { def: 'yes' }); }
function askEndMarch() { const go = () => { C.sim.apply({ t: 'endMarch', realm: me() }); afterMarchEnd(); }; if (G.game.settings.confirmEnd === 'Off') go(); else CU.confirm(C.sim.s.marches.filter(m => m.realm === me()).length ? 'Send the marches?' : 'Send no marches this season?', go, { def: 'yes' }); }
function afterPhaseChange(ev) {
  const s = C.sim.s;
  if (s.phase === 'muster') C.todo.push({ k: 'privacy', realm: me(), then: 'muster' });
  else if (s.phase === 'march') C.todo.push({ k: 'privacy', realm: me(), then: 'march' });
}
function afterMarchEnd() {
  const s = C.sim.s;
  if (s.phase === 'march') { C.todo.push({ k: 'privacy', realm: me(), then: 'march' }); return; }
  // every human has declared: show the marches, then resolve
  C.marchArrows = s.queue.map(m => ({ realm: m.realm, target: m.target, from: Object.values(m.from)[0], n: m.knights.length }));
  G.sfx('march_drums');
  C.todo.push({ k: 'anim', anim: { t: 0, dur: 1.4 } }, { k: 'resolve' });
}

/* ---- resolution ---- */
function nextResolution() {
  const sim = C.sim, p = sim.nextBattle();
  if (!p) {
    C.marchArrows = []; sim.endSeason();
    if (sim.s.result) return;
    C.todo.push({ k: 'tidings' }); return;
  }
  C.marchArrows = (C.marchArrows || []).filter(a => !(a.realm === p.march.realm && a.target === p.march.target));
  if (p.kind === 'open') {
    const ev = sim.takeOpen(); C.focus = p.castle; C.free = false;
    C.wm.update(sim, sim.season); G.sfx('castle_taken');
    const human = sim.isHuman(p.march.realm) || sim.isHuman(p.def);
    if (human) CU.toast(cname(p.castle) + ': the gates stand open. ' + realmOf(p.march.realm).short + ' takes it.', sim.isHuman(p.march.realm) ? '#7ae07a' : '#ff9a8a', 3.2);
    for (const e of ev) if (e.e === 'treasury' && sim.isHuman(e.realm)) CU.toast('Treasury: ' + G.get('item', e.item).name, CU.COL.gold, 3);
    C.todo.unshift({ k: 'takeStory' }, { k: 'resolve' });
    return;
  }
  const att = p.march.realm, def = p.kind === 'sanctum' ? 'dominion' : p.def, human = sim.isHuman(att) || sim.isHuman(def);
  C.focus = p.kind === 'sanctum' ? 'meridian' : p.castle; C.free = false;
  if (!human) {
    // AI against AI: auto-resolve; show the result banner (or skip, by Settings)
    const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); const r = b.result(); sim.applyBattle(r); C.wm.update(sim, sim.season);
    if (G.game.settings.aiBattles !== 'Skip') CU.toast(realmOf(att).short + ' vs ' + realmOf(def).short + ' at ' + cname(p.castle) + ': ' + realmOf(r.winner === 0 ? att : def).short + ' wins', '#d8d0e8', 2.4);
    C.todo.unshift({ k: 'takeStory' }, { k: 'resolve' }); return;
  }
  const before = G.beforeBattle(sim, p);
  C.panel = resolvePanel(p, before);
}
function resolvePanel(p, before) {
  const sim = C.sim, att = p.march.realm, def = p.kind === 'sanctum' ? 'dominion' : p.def, st = { f: 0 };
  const sanctum = p.kind === 'sanctum';
  const opts = sanctum ? [['Command', 'Fight it yourself']] : [['Command', 'Fight it yourself'], ['Delegate', 'Your captains fight it']];
  const panel = {
    update() {
      const res = CU.nav(st, panel.items || CU.synth(opts.length, opts.length));
      if (res === 'pick') { G.sfx('ui_confirm'); C.panel = null; if (st.f === 0) commandBattle(p, before); else delegateBattle(p, before); }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), w = 250 * k, h = 96 * k, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2 - h / 2);
        CU.box(g, x, y, w, h, { alpha: .96 });
        const ac = realmOf(att).color, dc = realmOf(def).color;
        CU.text(g, sanctum ? 'THE CLOCKWORK SANCTUM' : realmOf(att).short.toUpperCase() + ' MARCHES ON ' + G.get('castle', p.castle).name.toUpperCase(), x + w / 2, y + 5, CU.COL.gold, { align: 'center' });
        const an = p.march.knights.length, dn = sanctum ? 1 : p.defenders.length;
        CU.text(g, an + ' troop' + (an > 1 ? 's' : '') + ' against ' + dn, x + w / 2, y + 16 * k, '#ffffff', { align: 'center' });
        // the commanders' portraits
        p.march.knights.forEach((kid, i) => G.knightVis(kid).portrait(g, x + 8 + i * 26 * k, y + 28 * k, 24 * k, { bg: E.tones(ac).deep }));
        const dk = sanctum ? ['graynight'] : p.defenders; dk.forEach((kid, i) => G.knightVis(kid).portrait(g, x + w - 8 - (i + 1) * 26 * k, y + 28 * k, 24 * k, { bg: E.tones(dc).deep }));
        CU.text(g, 'VS', x + w / 2, y + 36 * k, '#ffffff', { align: 'center' });
        CU.text(g, (sanctum ? 'Clockwork Sanctum' : G.get('map', G.get('castle', p.castle).map).name) + ' • ' + G.SEASON_NAME[sim.season], x + w / 2, y + 46 * k, CU.COL.dim, { align: 'center' });
        panel.items = opts.map((o, i) => ({ x: x + 10 + i * (w / opts.length), y: y + h - 22 * k, w: w / opts.length - 20, h: 14 * k }));
        opts.forEach((o, i) => { const it = panel.items[i]; CP.rect(g, it.x, it.y, it.w, it.h, i === st.f ? '#2e3a78' : '#1a1e40'); CU.text(g, o[0], it.x + it.w / 2, it.y + 3, i === st.f ? CU.COL.focus : '#ffffff', { align: 'center' }); if (i === st.f) CU.focusFrame(g, it.x, it.y, it.w, it.h, C.t); });
        CU.text(g, opts[st.f][1], x + w / 2, y + h - 34 * k, CU.COL.dim, { align: 'center' });
      });
      CU.prompts(r, [['left', 'Choose'], ['confirm', 'Select']]);
    }
  };
  return panel;
}
function battleFx(before) { const fx = {}; for (const b of before || []) Object.assign(fx, b.fx); return fx; }
function commandBattle(p, before) {
  const sim = C.sim, spec = sim.battleSpec(p), att = p.march.realm, def = p.kind === 'sanctum' ? 'dominion' : p.def;
  G.autosave('Before battle');
  const sides = spec.sides.map(sd => sim.isHuman(sd.realm) ? 'human' : 'ai'), seats = spec.sides.map(sd => G.seatOf ? G.seatOf(sd.realm) : null);
  const castle = p.kind === 'sanctum' ? 'meridian' : p.castle, region = G.get('castle', castle).region;
  const kids = [p.march.knights, p.kind === 'sanctum' ? ['graynight'] : p.defenders];
  const intro = [];
  for (const b of before || []) { const ev = G.get('event', b.id); intro.push(...ev.lines); }
  const rv = G.rivalLine(kids[0], kids[1]); if (rv) intro.push(...rv);
  if (p.kind === 'sanctum') intro.push(['graynight', 'Twelve bells, little crown. Then nothing, ever again.']);
  const playerSide = sim.isHuman(att) ? 0 : 1;
  const go = () => G.game.go('battle', { spec, fx: battleFx(before), ctx: { kind: 'campaign', region: region === 'hour' || p.kind === 'sanctum' ? 'hour' : G.regionKey(region), owner: def, sides, seats, playerSide, intro: intro.length ? intro : null, realm: sim.isHuman(att) ? att : def,
    onEnd: (res, bsim) => { G.game.go('results', { res, sim: bsim, playerSide, ctx: 'campaign', next: () => G.game.go('campaign', { battle: { res } }) }); } } }, { fade: 'swirl', seconds: .5 });
  // the marching figures walk the road first
  C.anim = { t: 0, dur: 1.2, march: p, done: go }; G.sfx('march_drums');
}
function delegateBattle(p, before) {
  const sim = C.sim, spec = sim.battleSpec(p), b = G.BattleSim.create(spec);
  for (const [ref, fx] of Object.entries(battleFx(before))) { const u = b.units.find(x => x.ref === ref); if (u) Object.assign(u.fx, fx); }
  G.BattleAI.resolve(b);
  afterBattle({ res: b.result(), delegated: true, p });
}
/** a battle's result: apply it, show the aftermath, play the stories it caused, resolve the next */
function afterBattle(d) {
  const sim = C.sim, p = sim.s.pending; if (!p) { C.todo.push({ k: 'resolve' }); return; }
  const att = p.march.realm, ev = sim.applyBattle(d.res);
  C.wm.update(sim, sim.season);
  const human = sim.isHuman(att) ? att : p.def, won = (d.res.winner === 0) === sim.isHuman(att);
  if (d.delegated) C.panel = summaryPanel(d.res, ev, won, p);
  else { for (const e of ev) if (e.e === 'treasury' && sim.isHuman(e.realm)) CU.toast('Treasury: ' + G.get('item', e.item).name, CU.COL.gold, 3); }
  if (ev.some(e => e.e === 'taken')) G.sfx('castle_taken');
  C.todo.push({ k: 'takeStory' }, { k: 'resolve' });
}
function summaryPanel(res, ev, won, p) {
  const sim = C.sim, lv = res.units.filter(u => u.levels > 0 && sim.isHuman(u.side === 0 ? p.march.realm : p.def)).slice(0, 4);
  const dead = ev.filter(e => e.e === 'dead' && sim.isHuman(e.realm)).map(e => e.name), caps = ev.filter(e => e.e === 'captured').map(e => e.name + (sim.isHuman(e.realm) ? ' (joins you)' : ' (taken)'));
  G.sting(won ? 'victory' : 'defeat');
  return { update() { if (G.inp().pressed('confirm') || G.inp().pressed('cancel') || (G.inp().clicked && G.inp().clicked())) { G.sfx('ui_confirm'); C.panel = null; } },
    draw(r) { r.overlay(g => {
      const k = CU.k(), w = 240 * k, h = 96 * k, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2 - h / 2);
      CU.box(g, x, y, w, h, { alpha: .96 });
      CU.title(g, won ? 'VICTORY' : 'DEFEAT', x + w / 2, y + 4, { scale: 2, colors: won ? ['#ffffff', '#ffe080', '#c89020'] : ['#ffffff', '#ff8a7a', '#a02a2a'] });
      CU.text(g, 'Delegated: ' + (p.kind === 'sanctum' ? 'the Sanctum' : cname(p.castle)) + ' • bell ' + res.bell, x + w / 2, y + 22 * k, CU.COL.dim, { align: 'center' });
      let yy = y + 34 * k;
      if (lv.length) { CU.text(g, 'Level up: ' + lv.map(u => (u.kind === 'knight' ? kname(u.ref) : G.monsterName(sim.monster(u.ref) ? sim.monster(u.ref).sp : 'slime', 1)) + ' ' + u.level).join(', ').slice(0, 52), x + 8, yy, '#ffe080'); yy += 11 * k; }
      if (caps.length) { CU.text(g, 'Captured: ' + caps.join(', ').slice(0, 50), x + 8, yy, '#ffd060'); yy += 11 * k; }
      if (dead.length) { CU.text(g, 'Lost: ' + dead.join(', ').slice(0, 54), x + 8, yy, '#ff9a8a'); yy += 11 * k; }
      if (!lv.length && !caps.length && !dead.length) CU.text(g, 'No losses.', x + 8, yy, '#ffffff');
    }); CU.prompts(r, [['confirm', 'Continue']]); } };
}

/* ---- the castle card and the Muster actions ---- */
function castleInfoPanel(cid) { const st = { tab: 0 }; return { update() { if (G.inp().pressed('cancel') || G.inp().pressed('confirm') || G.inp().pressed('info')) { C.panel = null; G.sfx('ui_cancel'); } }, draw(r) { r.overlay(g => castleCard(g, r, cid, null)); CU.prompts(r, [['cancel', 'Back']]); } }; }
function castleCard(g, r, cid, actions, st) {
  const sim = C.sim, k = CU.k(), c = G.get('castle', cid), cs = sim.s.castles[cid], owner = cs.owner, R = G.get('realm', owner);
  const w = 168 * k, x = r.W - w - 6, y = 30, rows = cs.knights.length, h = (60 + rows * 13 + (actions ? 42 : 0)) * k;
  CU.box(g, x, y, w, h, { alpha: .93 });
  CP.rect(g, x + 4, y + 4, 12, 12, R.color); CP.sprite(g, G.sigil(R.sigil, R.trim), x + 6, y + 6);
  CU.text(g, c.name, x + 20, y + 4, '#ffffff'); CU.text(g, R.short + (cs.stilled ? ' • STILLED' : ''), x + 20, y + 4 + 9 * k, cs.stilled ? '#c8c8d8' : E.tones(R.color).lt);
  const regS = G.regionSeasons(c.region); regS.forEach((s2, i) => CP.sprite(g, G.elemIcon(s2), x + w - 12 - i * 9, y + 5)); if (c.region === 'hour') CP.sprite(g, G.elemIcon('hour'), x + w - 12, y + 5);
  CP.sprite(g, G.ICON.mana, x + 6, y + 24 * k); CU.text(g, '+' + Math.round(c.mana * G.tune.manaIncome * (G.regionSeasons(c.region).includes(sim.season) ? 1 + G.tune.seasonYield : 1)) + ' mana', x + 14, y + 23 * k, '#a8e8ff');
  CU.text(g, 'Quest: ' + G.get('site', c.site).name, x + 6, y + 33 * k, CU.COL.dim);
  // circle
  const circ = sim.circle(cid); CU.text(g, 'Circle:', x + 6, y + 43 * k, CU.COL.dim); circ.slice(0, 5).forEach((sp, i) => CP.sprite(g, G.elemIcon(G.get('monster', sp).elem), x + 40 * k + i * 10, y + 44 * k));
  // knights
  cs.knights.forEach((kid, i) => {
    const kk = sim.knight(kid), yy = y + (54 + i * 13) * k; G.knightVis(kid).portrait(g, x + 4, yy, 12 * k, { bg: '#1a1e40', frame: false });
    CU.text(g, kname(kid), x + 6 + 12 * k, yy + 1, kk.ruler ? CU.COL.gold : '#ffffff'); CU.text(g, 'Lv' + kk.level + '  ' + kk.troop.length + '/6', x + w - 6, yy + 1, CU.COL.dim, { align: 'right' });
    if (kk.wounded) CU.text(g, 'W', x + w - 58 * k, yy + 1, '#ff6a5a'); if (kk.moved) CU.text(g, 'M', x + w - 50 * k, yy + 1, '#8ab0ff');
  });
  if (cs.reserve.length) CU.text(g, 'Reserve: ' + cs.reserve.length, x + 6, y + (54 + rows * 13) * k, CU.COL.dim);
  if (actions) {
    const ay = y + h - 36 * k, aw = (w - 12) / 3;
    actions.items = actions.rows.map((a, i) => ({ x: x + 6 + (i % 3) * aw, y: ay + Math.floor(i / 3) * 16 * k, w: aw - 4, h: 13 * k, disabled: a.disabled }));
    actions.rows.forEach((a, i) => { const it = actions.items[i], on = i === st.f; CP.rect(g, it.x, it.y, it.w, it.h, on ? '#2e3a78' : '#1a1e40'); CU.text(g, a.label, it.x + it.w / 2, it.y + 3, a.disabled ? '#6a6680' : on ? CU.COL.focus : '#ffffff', { align: 'center' }); if (on) CU.focusFrame(g, it.x, it.y, it.w, it.h, C.t); });
    const sel = actions.rows[st.f]; if (sel && sel.disabled) CU.text(g, sel.disabled, x + 6, y + h + 2, '#ff9a8a');
  }
}
function castlePanel(cid) {
  const sim = C.sim, r0 = me(), cs = sim.s.castles[cid], st = { f: 0 };
  const has = cs.knights.length > 0;
  const actions = { rows: [
    { label: 'Organize', act: () => organizePanel(cid), disabled: has || cs.reserve.length ? false : 'No knights here' },
    { label: 'Summon', act: () => summonPanel(cid), disabled: cs.stilled ? 'The castle is Stilled' : cs.summons >= 3 ? 'Three summons a season' : false },
    { label: 'Move', act: () => movePanel(cid), disabled: cs.knights.some(k => sim.canAct(k) && !sim.knight(k).moved) ? false : 'No knight can move' },
    { label: 'Quest', act: () => questPanel(cid), disabled: cs.knights.some(k => !sim.knight(k).ruler && sim.canAct(k) && !sim.knight(k).moved) ? (sim.questingCount(r0) >= 2 ? 'Two away at most' : false) : 'No knight can quest' },
    { label: 'Equip', act: () => equipPanel(cid), disabled: has ? false : 'No knights here' },
    { label: 'Promote', act: () => promotePanel(cid), disabled: promotable(cid).length ? false : 'No one is ready' }] };
  const p = { update() {
    const res = CU.nav(st, actions.items || CU.synth(actions.rows.length, 3));
    if (res === 'pick') { G.sfx('ui_confirm'); const a = actions.rows[st.f]; C.panel = a.act() || null; if (C.panel) C.panel.parentCastle = cid; firstTip(a.label); }
    else if (res === 'back') { C.panel = null; G.sfx('ui_cancel'); }
  }, draw(r) { r.overlay(g => castleCard(g, r, cid, actions, st)); CU.prompts(r, [['move', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]); }, back() { C.panel = null; } };
  return p;
}
function firstTip(label) {
  const t = { Organize: 'Bind monsters to a knight. Their ranks may not add up to more than the knight\'s Bond. Square/Space sets the formation.', Summon: 'Pay mana to summon a monster from this castle\'s circle. It joins the reserve; upkeep is paid each Tidings.', Move: 'A knight may move once a Muster to a castle of yours next door.', Quest: 'A knight leaves for a season or two and comes back with treasure, a beast, a wanderer, mana, training, or a wound.', Equip: 'Each knight has a weapon, armor and accessory slot.', Promote: 'Monsters change form at level 12 and 22 (or sooner with a Season Seed). Knights change class at level 10, and at 20 with a Writ.' }[label];
  if (t) CU.tip('p_' + label, label, t);
}
function backToCastle(cid) { C.panel = castlePanel(cid); }

/** a generic list-and-detail panel */
function listPanel(o) {
  const list = new CU.List(); let rows = o.rows();
  const p = {
    list,
    update() {
      rows = o.rows(); if (o.keys && o.keys(list.sel, list)) return;
      const res = list.update(rows);
      if (res === 'pick') { const row = list.sel; if (row && !row.disabled) { G.sfx('ui_confirm'); o.pick(row, list); } }
      else if (res === 'back') { G.sfx('ui_cancel'); o.back(); }
      if (CU.why) { CU.toast(CU.why, CU.COL.bad, 1.6); CU.why = null; }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), lw = o.w || 150 * k, x = 8, y = 30;
        list.layout(rows, x + 6, y + 16 * k, lw - 12);
        CU.box(g, x, y, lw, list.h + 22 * k, { alpha: .94 });
        CU.text(g, o.title, x + 6, y + 4, CU.COL.gold);
        list.draw(g, C.t);
        if (o.detail && list.sel) o.detail(g, r, list.sel, x + lw + 6, y);
        if (!rows.length && o.empty) CU.text(g, o.empty, x + 8, y + 18 * k, CU.COL.dim);
      });
      CU.prompts(r, o.prompts || [['up', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]);
    },
    back() { o.back(); }
  };
  return p;
}
/* ---- Organize ---- */
function organizePanel(cid) {
  const sim = C.sim, r0 = me(), st = { col: 0, k: 0, t: 0, r: 0 };
  const knights = () => sim.s.castles[cid].knights.filter(k => !sim.knight(k).quest);
  const reserve = () => sim.s.castles[cid].reserve;
  const p = {
    update() {
      const ks = knights(), inp = G.inp(); if (st.k >= ks.length) st.k = Math.max(0, ks.length - 1);
      const kid = ks[st.k], kk = kid && sim.knight(kid), troop = kk ? kk.troop : [], res = reserve();
      if (G.pressed('next') || G.pressed('prev')) { st.k = (st.k + (G.pressed('prev') ? ks.length - 1 : 1)) % Math.max(1, ks.length); G.sfx('ui_move'); }
      if (G.repeat('left')) { st.col = Math.max(0, st.col - 1); G.sfx('ui_move'); }
      if (G.repeat('right')) { st.col = Math.min(2, st.col + 1); G.sfx('ui_move'); }
      const lenOf = [ks.length, 6, res.length][st.col];
      if (G.repeat('up')) { if (st.col === 0) st.k = Math.max(0, st.k - 1); else if (st.col === 1) st.t = st.t >= 2 ? st.t - 2 : st.t; else st.r = Math.max(0, st.r - 1); G.sfx('ui_move'); }
      if (G.repeat('down')) { if (st.col === 0) st.k = Math.min(Math.max(0, ks.length - 1), st.k + 1); else if (st.col === 1) st.t = st.t + 2 < 6 ? st.t + 2 : st.t; else st.r = Math.min(Math.max(0, res.length - 1), st.r + 1); G.sfx('ui_move'); }
      // mouse
      const c = inp.clicked && inp.clicked(), hp = inp.pointer && inp.pointer();
      const hit = q => { if (!q || !p.hits) return null; return p.hits.find(h => q[0] >= h.x && q[0] < h.x + h.w && q[1] >= h.y && q[1] < h.y + h.h); };
      if (hp && inp.lastDevice === 'mouse' && (!st.hp || hp[0] !== st.hp[0] || hp[1] !== st.hp[1])) { const h = hit(hp); if (h) Object.assign(st, h.set); } st.hp = hp ? hp.slice() : null;
      const clickHit = hit(c);
      if (clickHit) Object.assign(st, clickHit.set);
      if (G.tapped('command') && kk) { const i = FORM.indexOf(kk.formation); sim.apply({ t: 'formation', realm: r0, knight: kid, form: FORM[(i + 1) % 3] }); G.sfx('ui_move'); }
      if (inp.pressed('confirm') || clickHit) {
        if (st.col === 1 && troop[st.t]) { const ev = sim.apply({ t: 'unbind', realm: r0, uid: troop[st.t] }); ev[0].e === 'illegal' ? CU.toast(ev[0].why, CU.COL.bad) : G.sfx('ui_confirm'); }
        else if (st.col === 2 && res[st.r] && kid) { const ev = sim.apply({ t: 'bind', realm: r0, uid: res[st.r], knight: kid }); if (ev[0].e === 'illegal') { CU.toast(ev[0].why, CU.COL.bad); G.sfx('ui_error'); } else { G.sfx('ui_confirm'); st.r = Math.min(st.r, Math.max(0, reserve().length - 1)); } }
        else if (st.col === 0) { st.col = 1; }
      }
      if (inp.pressed('info') && st.col === 2 && res[st.r]) { const uid = res[st.r]; CU.confirm('Dismiss this ' + G.monsterName(sim.monster(uid).sp, sim.monster(uid).form) + '? It will be gone.', () => { sim.apply({ t: 'dismiss', realm: r0, uid }); st.r = 0; }); }
      if (inp.pressed('cancel')) { G.sfx('ui_cancel'); backToCastle(cid); }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), W = r.W, x0 = 8, y0 = 26, ks = knights(), kid = ks[st.k], kk = kid && sim.knight(kid), res = reserve();
        p.hits = [];
        const cw = Math.floor((W - 24) * .29), tcw = Math.floor((W - 24) * .42);
        // knights
        CU.box(g, x0, y0, cw, 150 * k, { alpha: .94 }); CU.text(g, 'KNIGHTS', x0 + 6, y0 + 4, CU.COL.gold);
        ks.slice(0, 6).forEach((id, i) => { const yy = y0 + 16 * k + i * 20 * k, on = i === st.k; if (on) CP.rect(g, x0 + 3, yy - 1, cw - 6, 19 * k, '#2e3a78'); G.knightVis(id).portrait(g, x0 + 5, yy, 18 * k, { bg: '#1a1e40', frame: false }); CU.text(g, kname(id), x0 + 8 + 18 * k, yy + 1, on ? CU.COL.focus : '#ffffff'); CU.text(g, 'Lv' + sim.knight(id).level + '  Bond ' + sim.bondUsed(id) + '/' + sim.bondOf(id), x0 + 8 + 18 * k, yy + 10 * k, CU.COL.dim); p.hits.push({ x: x0 + 3, y: yy - 1, w: cw - 6, h: 19 * k, set: { col: 0, k: i } }); if (on && st.col === 0) CU.focusFrame(g, x0 + 3, yy - 1, cw - 6, 19 * k, C.t); });
        // troop
        const x1 = x0 + cw + 4; CU.box(g, x1, y0, tcw, 150 * k, { alpha: .94 });
        if (kk) {
          CU.text(g, kname(kid).toUpperCase() + "'S TROOP", x1 + 6, y0 + 4, CU.COL.gold);
          const bu = sim.bondUsed(kid), bo = sim.bondOf(kid); for (let i = 0; i < bo; i++) CP.rect(g, x1 + 6 + i * 5, y0 + 15 * k, 4, 4, i < bu ? '#ffd060' : '#3a3a5a'); CU.text(g, 'Bond ' + bu + '/' + bo, x1 + tcw - 6, y0 + 13 * k, CU.COL.dim, { align: 'right' });
          const tw = Math.floor((tcw - 16) / 2), th = 34 * k;
          for (let i = 0; i < 6; i++) {
            const tx = x1 + 6 + (i % 2) * (tw + 4), ty = y0 + 24 * k + Math.floor(i / 2) * (th + 3), uid = kk.troop[i], on = st.col === 1 && st.t === i;
            CP.rect(g, tx, ty, tw, th, on ? '#2e3a78' : '#1a1e40');
            if (uid) { const m = sim.monster(uid), vis = G.monsterVis(m.sp, m.form); vis.portrait(g, tx + 2, ty + 2, th - 4, { bg: E.tones(G.elemColor(G.get('monster', m.sp).elem)).deep, frame: false }); CU.text(g, G.monsterName(m.sp, m.form).slice(0, 11), tx + th, ty + 2, '#ffffff'); CU.text(g, 'Lv' + m.level + ' R' + G.get('monster', m.sp).rank, tx + th, ty + 12 * k, CU.COL.dim); CU.bar(g, tx + th, ty + 22 * k, tw - th - 4, 4 * k, m.hp / sim.monsterStats(uid).hp, '#5ad86a'); }
            else CU.text(g, 'empty', tx + tw / 2, ty + th / 2 - 3, '#4a4a6a', { align: 'center' });
            p.hits.push({ x: tx, y: ty, w: tw, h: th, set: { col: 1, t: i } }); if (on) CU.focusFrame(g, tx, ty, tw, th, C.t);
          }
          CU.text(g, 'Formation: ' + FORM_NAME[kk.formation], x1 + 6, y0 + 140 * k, '#c8d8ff');
        }
        // reserve
        const x2 = x1 + tcw + 4; CU.box(g, x2, y0, cw, 150 * k, { alpha: .94 }); CU.text(g, 'RESERVE (' + res.length + ')', x2 + 6, y0 + 4, CU.COL.gold);
        const top = Math.max(0, st.r - 5);
        res.slice(top, top + 6).forEach((uid, j) => { const i = top + j, m = sim.monster(uid), yy = y0 + 16 * k + j * 20 * k, on = st.col === 2 && st.r === i; if (on) CP.rect(g, x2 + 3, yy - 1, cw - 6, 19 * k, '#2e3a78'); G.monsterVis(m.sp, m.form).portrait(g, x2 + 5, yy, 18 * k, { bg: '#1a1e40', frame: false }); CU.text(g, G.monsterName(m.sp, m.form), x2 + 8 + 18 * k, yy + 1, on ? CU.COL.focus : '#ffffff'); CU.text(g, 'Lv' + m.level + '  Rank ' + G.get('monster', m.sp).rank, x2 + 8 + 18 * k, yy + 10 * k, CU.COL.dim); p.hits.push({ x: x2 + 3, y: yy - 1, w: cw - 6, h: 19 * k, set: { col: 2, r: i } }); if (on) CU.focusFrame(g, x2 + 3, yy - 1, cw - 6, 19 * k, C.t); });
        if (!res.length) CU.text(g, 'Summon or capture monsters to fill the reserve.', x2 + 6, y0 + 18 * k, CU.COL.dim, { wrap: cw - 12 });
      });
      CU.prompts(r, [['confirm', st.col === 2 ? 'Bind' : st.col === 1 ? 'Unbind' : 'Select'], ['command', 'Formation'], ['info', st.col === 2 ? 'Dismiss' : 'Details'], ['next', 'Knight'], ['cancel', 'Back']]);
    },
    back() { backToCastle(cid); }
  };
  return p;
}
/* ---- Summon ---- */
function summonPanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'SUMMON • ' + G.get('castle', cid).name, w: 150 * CU.k(),
    rows: () => sim.circle(cid).map(sp => { const why = sim.illegal({ t: 'summon', realm: r0, castle: cid, sp }); return { label: G.monsterName(sp, 1), right: sim.summonCost(sp) + ' mana', sp, disabled: why || false, icon: (g, x, y) => CP.sprite(g, G.elemIcon(G.get('monster', sp).elem), x, y) }; }),
    pick: row => { const ev = sim.apply({ t: 'summon', realm: r0, castle: cid, sp: row.sp }); if (ev[0].e === 'summon') { G.sting('summon'); G.sfx('summon_rise'); CU.toast(G.monsterName(row.sp, 1) + ' joins the reserve', '#a8e8ff'); C.summonFx = { sp: row.sp, t: 0 }; } },
    detail: (g, r, row, x, y) => monsterCard(g, x, y, row.sp, 1, sim.summonLevel(r0), true),
    back: () => backToCastle(cid), prompts: [['up', 'Choose'], ['confirm', 'Summon'], ['cancel', 'Back']] });
}
function monsterCard(g, x, y, sp, form, level, circle) {
  const k = CU.k(), m = G.get('monster', sp), st = G.monsterStats(sp, form, level), w = 150 * k, h = 128 * k;
  CU.box(g, x, y, w, h, { alpha: .94 });
  const vis = G.monsterVis(sp, form);
  if (circle) { const cx = x + 34 * k, cy = y + 40 * k; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + C.t; CP.dot(g, cx + Math.cos(a) * 26 * k, cy + Math.sin(a) * 10 * k + 10 * k, G.elemColor(m.elem)); } }
  vis.portrait(g, x + 6, y + 6, 56 * k, { bg: E.tones(G.elemColor(m.elem)).deep });
  CU.text(g, G.monsterName(sp, form), x + 66 * k, y + 6, '#ffffff'); CP.sprite(g, G.elemIcon(m.elem), x + 66 * k, y + 16 * k); CU.text(g, G.SEASON_NAME[m.elem] + ' • ' + G.monsterSize(sp, form) + ' • Rank ' + m.rank, x + 76 * k, y + 15 * k, CU.COL.dim);
  const fl = G.monsterFlags(sp, form); CU.text(g, [fl.flier && 'Flier', fl.swimmer && 'Swimmer', fl.floater && 'Floater'].filter(Boolean).join(' ') || 'Walker', x + 66 * k, y + 25 * k, '#c8d8ff');
  CU.text(g, 'Upkeep ' + G.monsterUpkeep(sp, form) + ' • Lv ' + level, x + 66 * k, y + 35 * k, CU.COL.dim);
  const bars = [['HP', st.hp, 240, '#5ad86a'], ['ATK', st.atk, 60, '#ff7a5a'], ['DEF', st.def, 60, '#5a9aff'], ['INT', st.int, 60, '#c87aff'], ['AGI', st.agi, 40, '#ffe05a']];
  bars.forEach(([l, v, mx, c], i) => { const yy = y + (66 + i * 10) * k; CU.text(g, l, x + 6, yy, CU.COL.dim); CU.bar(g, x + 30 * k, yy + 1, w - 66 * k, 5 * k, v / mx, c); CU.text(g, v, x + w - 6, yy, '#ffffff', { align: 'right' }); });
  CU.text(g, 'Skills: ' + G.monsterSkills(sp, form).map(s => G.get('skill', s).name).join(', ').slice(0, 34), x + 6, y + 118 * k, '#e8e0c8');
}
/* ---- Move ---- */
function movePanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'MOVE FROM ' + G.get('castle', cid).name.toUpperCase(),
    rows: () => sim.s.castles[cid].knights.map(kid => { const kk = sim.knight(kid); return { label: kname(kid), right: 'Lv' + kk.level, kid, disabled: !sim.canAct(kid) ? (kk.wounded ? 'Wounded' : 'Cannot act') : kk.moved ? 'Moved already' : false }; }),
    pick: row => { C.panel = pickCastlePanel('Move ' + kname(row.kid) + ' to', G.get('castle', cid).roads.filter(c => sim.s.castles[c].owner === r0), to => { const ev = sim.apply({ t: 'move', realm: r0, knight: row.kid, to }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { G.sfx('ui_confirm'); C.focus = to; CU.toast(kname(row.kid) + ' rides to ' + cname(to), '#c8d8ff'); } backToCastle(to); }, () => { C.panel = movePanel(cid); }); },
    back: () => backToCastle(cid) });
}
/** pick a castle on the map from a set */
function pickCastlePanel(title, allowed, done, back) {
  if (!allowed.length) { CU.toast('No castle of yours is next door', CU.COL.bad); back(); return C.panel; }
  C.focus = allowed[0]; C.free = false;
  return { allowed, update() { mapNav(allowed); const inp = G.inp(); if (inp.pressed('confirm') && allowed.includes(C.focus)) done(C.focus); else if (inp.pressed('cancel')) { G.sfx('ui_cancel'); back(); } },
    draw(r) { r.overlay(g => { const w = CU.width(title) + 16; CU.box(g, Math.round((r.W - w) / 2), 30, w, 14 * CU.k()); CU.text(g, title, r.W / 2, 33, CU.COL.gold, { align: 'center' }); }); CU.prompts(r, [['move', 'Castle'], ['confirm', 'Choose'], ['cancel', 'Back']]); } };
}
/* ---- Quest ---- */
function questPanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'QUEST FROM ' + G.get('castle', cid).name.toUpperCase(),
    rows: () => sim.s.castles[cid].knights.map(kid => { const kk = sim.knight(kid), sites = questSites(cid); return { label: kname(kid), right: 'Lv' + kk.level, kid, disabled: sim.illegal({ t: 'quest', realm: r0, knight: kid, site: sites[0] }) || false }; }),
    pick: row => { C.panel = siteListPanel(cid, row.kid); },
    detail: (g, r, row, x, y) => { const site = G.get('site', questSites(cid)[0]); siteCard(g, x, y, site); },
    back: () => backToCastle(cid) });
}
function questSites(cid) { const sim = C.sim, out = [G.get('castle', cid).site]; for (const s of G.all('site')) if (s.story && sim.s.flags['site_' + s.id] && (G.adjacent(cid, s.castle) || cid === s.castle) && !out.includes(s.id)) out.push(s.id); return out; }
function siteListPanel(cid, kid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: kname(kid).toUpperCase() + ' RIDES FOR',
    rows: () => questSites(cid).map(id => { const s = G.get('site', id); return { label: s.name, right: s.away + (s.away > 1 ? ' seasons' : ' season'), site: id, disabled: sim.illegal({ t: 'quest', realm: r0, knight: kid, site: id }) || false }; }),
    pick: row => { const ev = sim.apply({ t: 'quest', realm: r0, knight: kid, site: row.site }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { CU.toast(kname(kid) + ' rides for ' + G.get('site', row.site).name, '#c8d8ff'); backToCastle(cid); } },
    detail: (g, r, row, x, y) => siteCard(g, x, y, G.get('site', row.site)),
    back: () => { C.panel = questPanel(cid); }, prompts: [['up', 'Choose'], ['confirm', 'Send'], ['cancel', 'Back']] });
}
function siteCard(g, x, y, site) {
  const k = CU.k(), w = 160 * k, h = 96 * k; CU.box(g, x, y, w, h, { alpha: .94 });
  // a small vignette: the site's region colour and a landmark
  const reg = G.get('castle', site.castle).region, col = G.REGION[G.regionKey(reg)] || G.REGION.neutral;
  CP.rect(g, x + 6, y + 6, w - 12, 24 * k, col.base); CP.rect(g, x + 6, y + 6 + 16 * k, w - 12, 8 * k, col.dark); CP.disc(g, x + w - 30, y + 14, 5, '#fff0c0');
  CU.text(g, site.name, x + 8, y + 34 * k, '#ffffff');
  E.font.wrap(site.desc, w - 16, { scale: k }).slice(0, 2).forEach((l, i) => CU.text(g, l, x + 8, y + (44 + i * 10) * k, CU.COL.dim));
  CU.text(g, 'Away ' + site.away + (site.away > 1 ? ' seasons' : ' season') + (site.story ? ' • a story' : ' • focus: ' + site.focus), x + 8, y + 68 * k, '#c8d8ff');
  const icons = ['treasure', 'beast', 'wanderer', 'mana', 'training', 'mishap'], ic = { treasure: G.itemIcon('ring'), beast: G.elemIcon('spring'), wanderer: G.ICON.away, mana: G.ICON.mana, training: G.fxIcon('valor'), mishap: G.fxIcon('exposed') };
  icons.forEach((o, i) => CP.sprite(g, ic[o], x + 8 + i * 16, y + 80 * k));
  CU.text(g, 'Risk: ' + (site.mishap ? 'high' : 'low'), x + w - 8, y + 80 * k, site.mishap ? '#ff9a8a' : '#9ae09a', { align: 'right' });
}
/* ---- Equip ---- */
function equipPanel(cid) {
  const sim = C.sim, r0 = me(), st = { k: 0, slot: 0 };
  const ks = () => sim.s.castles[cid].knights.filter(k => !sim.knight(k).quest);
  const SL = ['weapon', 'armor', 'accessory'];
  return listPanel({ title: 'EQUIP', w: 150 * CU.k(),
    rows: () => {
      const kid = ks()[st.k]; if (!kid) return [];
      const kk = sim.knight(kid), slot = SL[st.slot], items = sim.s.realms[r0].items, out = [];
      if (kk.items[slot]) out.push({ label: 'Remove ' + G.get('item', kk.items[slot]).name, remove: true });
      for (const [id, n] of Object.entries(items)) { if (n <= 0) continue; const it = G.get('item', id); if (it.slot !== slot) continue; out.push({ label: it.name, right: 'x' + n, item: id, disabled: G.canEquip(id, kk.cls) ? false : 'Not for a ' + G.get('class', kk.cls).name, icon: (g, x, y) => CP.sprite(g, G.itemIcon(id), x, y - 1) }); }
      return out;
    },
    keys: () => { if (G.pressed('next') || G.pressed('prev')) { const n = ks().length; st.k = (st.k + (G.pressed('prev') ? n - 1 : 1)) % Math.max(1, n); G.sfx('ui_move'); return true; } if (G.repeat('left')) { st.slot = (st.slot + 2) % 3; G.sfx('ui_move'); return true; } if (G.repeat('right')) { st.slot = (st.slot + 1) % 3; G.sfx('ui_move'); return true; } return false; },
    pick: row => { const kid = ks()[st.k]; const ev = row.remove ? sim.apply({ t: 'unequip', realm: r0, knight: kid, slot: SL[st.slot] }) : sim.apply({ t: 'equip', realm: r0, knight: kid, item: row.item }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); },
    detail: (g, r, row, x, y) => {
      const kid = ks()[st.k]; if (!kid) return; const kk = sim.knight(kid), k = CU.k(), w = 170 * k, h = 128 * k; CU.box(g, x, y, w, h, { alpha: .94 });
      G.knightVis(kid).portrait(g, x + 6, y + 6, 40 * k); CU.text(g, kname(kid), x + 50 * k, y + 6, '#ffffff'); CU.text(g, G.get('class', kk.cls).name + ' Lv' + kk.level, x + 50 * k, y + 16 * k, CU.COL.dim);
      SL.forEach((sl, i) => { const it = kk.items[sl], yy = y + (52 + i * 12) * k, on = i === st.slot; CU.text(g, (on ? '▸ ' : '  ') + G.cap(sl) + ': ' + (it ? G.get('item', it).name : '-'), x + 6, yy, on ? CU.COL.focus : '#ffffff'); });
      // the stat change
      const cur = G.unitFromKnight(kk), test = row && row.item ? G.unitFromKnight(Object.assign({}, kk, { items: Object.assign({}, kk.items, { [SL[st.slot]]: row.item }) })) : row && row.remove ? G.unitFromKnight(Object.assign({}, kk, { items: Object.assign({}, kk.items, { [SL[st.slot]]: null }) })) : cur;
      ['atk', 'def', 'int', 'agi', 'mov', 'ward'].forEach((s2, i) => { const a = cur[s2], b = test[s2], yy = y + (92 + Math.floor(i / 3) * 11) * k, xx = x + 6 + (i % 3) * 54 * k; CU.text(g, s2.toUpperCase() + ' ' + b, xx, yy, b > a ? '#7ae07a' : b < a ? '#ff6a5a' : '#ffffff'); if (b !== a) CU.text(g, b > a ? '↑' : '↓', xx + 40 * k, yy, b > a ? '#7ae07a' : '#ff6a5a'); });
      if (row && row.item) CU.text(g, G.get('item', row.item).desc, x + 6, y + 116 * k, CU.COL.dim);
    },
    back: () => backToCastle(cid), prompts: [['up', 'Item'], ['left', 'Slot'], ['next', 'Knight'], ['confirm', 'Equip'], ['cancel', 'Back']] });
}
/* ---- Promote ---- */
function promotable(cid) {
  const sim = C.sim, r0 = me(), out = [], cs = sim.s.castles[cid];
  for (const kid of cs.knights) { if (sim.legal({ t: 'classchange', realm: r0, knight: kid })) out.push({ kind: 'knight', id: kid }); for (const uid of sim.knight(kid).troop) if (sim.legal({ t: 'promote', realm: r0, uid }) || sim.legal({ t: 'promote', realm: r0, uid, seed: true })) out.push({ kind: 'monster', id: uid }); }
  for (const uid of cs.reserve) if (sim.legal({ t: 'promote', realm: r0, uid }) || sim.legal({ t: 'promote', realm: r0, uid, seed: true })) out.push({ kind: 'monster', id: uid });
  return out;
}
function promotePanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'PROMOTE', empty: 'No one is ready.',
    rows: () => promotable(cid).map(p => p.kind === 'knight' ? { label: kname(p.id), right: '→ ' + G.get('class', G.get('class', sim.knight(p.id).cls).next).name, p } : { label: G.monsterName(sim.monster(p.id).sp, sim.monster(p.id).form), right: '→ ' + G.monsterName(sim.monster(p.id).sp, sim.monster(p.id).form + 1), p }),
    pick: row => {
      const p = row.p; let ev;
      if (p.kind === 'knight') ev = sim.apply({ t: 'classchange', realm: r0, knight: p.id });
      else { ev = sim.apply({ t: 'promote', realm: r0, uid: p.id }); if (ev[0].e === 'illegal') ev = sim.apply({ t: 'promote', realm: r0, uid: p.id, seed: true }); }
      if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { G.sting('promote'); G.game.flash('#ffffff', .2, .5); C.promoFx = { t: 0, p }; CU.toast(p.kind === 'knight' ? kname(p.id) + ' becomes a ' + G.get('class', sim.knight(p.id).cls).name + '!' : 'It becomes a ' + G.monsterName(sim.monster(p.id).sp, sim.monster(p.id).form) + '!', '#ffe080', 3); }
    },
    detail: (g, r, row, x, y) => {
      const k = CU.k(), w = 190 * k, h = 110 * k, p = row.p; CU.box(g, x, y, w, h, { alpha: .94 });
      if (p.kind === 'monster') {
        const m = sim.monster(p.id), a = G.monsterStats(m.sp, m.form, m.level), b = G.monsterStats(m.sp, m.form + 1, m.level);
        G.monsterVis(m.sp, m.form).portrait(g, x + 6, y + 6, 44 * k); G.monsterVis(m.sp, m.form + 1).portrait(g, x + w - 50 * k, y + 6, 44 * k);
        CU.text(g, '→', x + w / 2, y + 24 * k, CU.COL.gold, { align: 'center', scale: 2 });
        ['hp', 'atk', 'def', 'int', 'agi'].forEach((s2, i) => { const yy = y + (56 + i * 10) * k; CU.text(g, s2.toUpperCase(), x + 6, yy, CU.COL.dim); CU.bar(g, x + 34 * k, yy + 1, w - 80 * k, 5 * k, b[s2] / (s2 === 'hp' ? 300 : 80), '#7ae07a'); CU.bar(g, x + 34 * k, yy + 1, (w - 80 * k) * a[s2] / b[s2], 5 * k, a[s2] / (s2 === 'hp' ? 300 : 80) * b[s2] / a[s2] * a[s2] / b[s2], '#5a9aff'); CU.text(g, a[s2] + '→' + b[s2], x + w - 6, yy, '#ffffff', { align: 'right' }); });
      } else {
        const kk = sim.knight(p.id), nx = G.get('class', G.get('class', kk.cls).next);
        G.knightVis(p.id).portrait(g, x + 6, y + 6, 44 * k); CU.text(g, G.get('class', kk.cls).name + ' → ' + nx.name, x + 56 * k, y + 10 * k, '#ffffff');
        CU.text(g, 'Every stat x1.1; growth improves.', x + 56 * k, y + 22 * k, CU.COL.dim); CU.text(g, 'New skills: ' + nx.skills.filter(s => !G.get('class', kk.cls).skills.some(t => t[0] === s[0])).map(s => G.get('skill', s[0]).name + ' (' + s[1] + ')').join(', ').slice(0, 40), x + 6, y + 60 * k, '#e8e0c8');
        if (nx.tier === 3) CU.text(g, 'Uses a Writ of Knighthood', x + 6, y + 74 * k, '#ffd060');
      }
    },
    back: () => backToCastle(cid), prompts: [['up', 'Choose'], ['confirm', 'Promote'], ['cancel', 'Back']] });
}

/* ---- the March ---- */
function marchPanel(target) {
  const sim = C.sim, r0 = me(), chosen = [], st = { f: 0 };
  const already = sim.s.marches.find(m => m.realm === r0 && m.target === target);
  if (already) { CU.confirm('Call off the march on ' + cname(target) + '?', () => sim.apply({ t: 'undeclare', realm: r0, target })); return null; }
  const avail = sim.marchers(r0, target);
  if (!avail.length) { CU.toast('No knight beside it can march', CU.COL.bad); return null; }
  const list = new CU.List();
  const p = {
    update() {
      const rows = rowsOf();
      if (G.holdDone('command') || G.tapped('command')) return declare();
      const res = list.update(rows);
      if (res === 'pick') { const row = list.sel; if (row.declare) return declare(); const i = chosen.indexOf(row.kid); if (i >= 0) chosen.splice(i, 1); else if (chosen.length < 3) chosen.push(row.kid); else { CU.toast('Three troops at most', CU.COL.bad); G.sfx('ui_error'); return; } G.sfx('ui_confirm'); }
      else if (res === 'back') { G.sfx('ui_cancel'); C.panel = null; }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), x = 8, y = 30, w = 170 * k, rows = rowsOf();
        list.layout(rows, x + 6, y + 16 * k, w - 12);
        CU.box(g, x, y, w, list.h + 22 * k, { alpha: .94 }); CU.text(g, 'MARCH ON ' + cname(target).toUpperCase(), x + 6, y + 4, CU.COL.gold);
        list.draw(g, C.t);
        // the target card: defenders' power against ours
        const x2 = r.W - 170 * k - 6, def = target === 'sanctum' ? 6000 : G.CampaignAI.defense(sim, target), ours = G.sum(chosen, k2 => sim.troopPower(k2));
        CU.box(g, x2, y, 170 * k, 70 * k, { alpha: .94 });
        CU.text(g, target === 'sanctum' ? 'The Gray Knight' : cname(target), x2 + 6, y + 4, '#ffffff');
        CU.text(g, target === 'sanctum' ? 'Clockwork Sanctum' : G.get('map', G.get('castle', target).map).name + ' • ' + G.SEASON_NAME[sim.season], x2 + 6, y + 14 * k, CU.COL.dim);
        CU.text(g, 'Ours', x2 + 6, y + 28 * k, '#c8d8ff'); CU.bar(g, x2 + 40 * k, y + 29 * k, 120 * k, 6 * k, ours / Math.max(ours, def, 1), '#5a9aff');
        CU.text(g, 'Theirs', x2 + 6, y + 40 * k, '#ffb0a0'); CU.bar(g, x2 + 40 * k, y + 41 * k, 120 * k, 6 * k, def / Math.max(ours, def, 1), '#ff6a5a');
        CU.text(g, target === 'sanctum' ? 'Light the four Season Dials!' : sim.s.castles[target].knights.length ? sim.defenders(target).length + ' knight(s) defend' : 'Undefended: the gates stand open', x2 + 6, y + 54 * k, CU.COL.dim);
      });
      CU.prompts(r, [['confirm', 'Choose troops'], ['command', 'Declare'], ['cancel', 'Back']]);
    },
    back() { C.panel = null; }
  };
  function rowsOf() { const rows = avail.map(kid => { const kk = sim.knight(kid), on = chosen.includes(kid); return { label: (on ? '* ' : '- ') + kname(kid), right: 'Lv' + kk.level + ' ' + kk.troop.length + '/6', kid, color: on ? '#ffe080' : null }; }); rows.push({ label: 'Declare the march', declare: true, disabled: chosen.length ? false : 'Choose at least one troop' }); return rows; }
  function declare() { if (!chosen.length) { CU.toast('Choose at least one troop', CU.COL.bad); return; } const ev = sim.apply({ t: 'declare', realm: r0, target, knights: chosen.slice() }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { G.sfx('march_drums'); CU.toast('March declared on ' + cname(target), realmOf(r0).color); C.panel = null; } }
  return p;
}

/* ---- the command menu: Realm, Chronicle, Objectives, End phase ---- */
function commandsPanel() {
  const sim = C.sim, ph = sim.s.phase, rows = [
    { label: 'Realm', act: () => { C.panel = realmPanel(0); } },
    { label: 'Chronicle', act: () => { C.panel = realmPanel(3); } },
    { label: 'Objectives', act: () => { C.panel = realmPanel(4); } },
    ph === 'muster' ? { label: 'End Muster', act: () => { C.panel = null; askEndMuster(); } } : ph === 'march' ? { label: 'End March', act: () => { C.panel = null; askEndMarch(); } } : null].filter(Boolean);
  return listPanel({ title: 'COMMANDS', rows: () => rows, pick: row => row.act(), back: () => { C.panel = null; } });
}
function realmPanel(tab0) {
  const sim = C.sim, r0 = me(), TABS = ['Knights', 'Monsters', 'Items', 'Chronicle', 'Objectives'], st = { tab: tab0, f: 0, top: 0 };
  const list = new CU.List();
  const rowsFor = () => {
    switch (st.tab) {
      case 0: return sim.knightsOf(r0).map(k => ({ label: kname(k.id), right: G.get('class', k.cls).name + ' Lv' + k.level, k }));
      case 1: return Object.values(sim.s.monsters).filter(m => m.realm === r0).map(m => ({ label: G.monsterName(m.sp, m.form), right: 'Lv' + m.level + (m.knight ? ' • ' + kname(m.knight) : ' • reserve'), m }));
      case 2: return Object.entries(sim.s.realms[r0].items).filter(([, n]) => n > 0).map(([id, n]) => ({ label: G.get('item', id).name, right: 'x' + n, item: id, icon: (g, x, y) => CP.sprite(g, G.itemIcon(id), x, y - 1), disabled: false, use: G.get('item', id).use && G.get('item', id).use.mana }));
      case 3: return sim.s.chronicle.slice().reverse().map(c => ({ label: c.text.slice(0, 60), right: G.SEASON_NAME[G.SEASONS[c.turn % 4]].slice(0, 3) + ' Y' + (Math.floor(c.turn / 4) + 1) }));
      case 4: return objectives().map(o => ({ label: o }));
    }
    return [];
  };
  return {
    update() {
      if (G.pressed('next') || G.repeat('right') && st.tab !== 2) { st.tab = (st.tab + 1) % 5; list.index = 0; G.sfx('ui_move'); return; }
      if (G.pressed('prev') || G.repeat('left') && st.tab !== 2) { st.tab = (st.tab + 4) % 5; list.index = 0; G.sfx('ui_move'); return; }
      const res = list.update(rowsFor());
      if (res === 'pick' && list.sel && list.sel.use && sim.s.phase === 'muster') { sim.apply({ t: 'use', realm: r0, item: list.sel.item }); CU.toast('+60 mana', '#a8e8ff'); }
      if (res === 'back') { G.sfx('ui_cancel'); C.panel = null; }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), x = 8, y = 26, w = Math.min(r.W - 16, 320 * k);
        list.layout(rowsFor(), x + 6, y + 30 * k, w - 12);
        CU.box(g, x, y, w, Math.max(80 * k, list.h + 36 * k), { alpha: .95 });
        TABS.forEach((t2, i) => { const tw = w / 5, tx = x + i * tw; CP.rect(g, tx + 2, y + 4, tw - 4, 12 * k, i === st.tab ? '#2e3a78' : '#1a1e40'); CU.text(g, t2, tx + tw / 2, y + 6, i === st.tab ? CU.COL.focus : '#c8c8d8', { align: 'center' }); });
        CU.text(g, realmOf(r0).name + ' • ' + G.cap(sim.s.difficulty) + (sim.s.dev ? ' • DEV' : ''), x + 6, y + 19 * k, CU.COL.dim);
        list.draw(g, C.t);
        const sel = list.sel;
        if (sel && st.tab === 0) { const kk = sel.k, u = G.unitFromKnight(kk); CU.text(g, 'HP ' + kk.hp + '/' + kk.stats.hp + ' ATK ' + u.atk + ' DEF ' + u.def + ' INT ' + u.int + ' AGI ' + u.agi + ' MOV ' + u.mov + ' Ward ' + u.ward, x + 6, y + Math.max(80 * k, list.h + 36 * k) + 4, '#ffffff'); }
        if (sel && st.tab === 2) CU.text(g, G.get('item', sel.item).desc + (sel.use ? '  (' + G.labelOf('confirm') + ': use)' : ''), x + 6, y + Math.max(80 * k, list.h + 36 * k) + 4, '#ffffff');
      });
      CU.prompts(r, [['next', 'Tab'], ['up', 'Scroll'], ['cancel', 'Back']]);
    },
    back() { C.panel = null; }
  };
}
function objectives() {
  const sim = C.sim, s = sim.s, r0 = me(), out = [];
  out.push('Take Meridian, then defeat the Gray Knight in the Clockwork Sanctum.');
  if (s.candle !== null) out.push('The Hour-Candle: ' + s.candle + ' seasons left.'); else out.push('The Hour-Candle is not yet lit (Spring, Year 2).');
  const brig = sim.castlesOf('brigands'); if (brig.length) out.push('Brigand castles remain: ' + brig.map(c => G.get('castle', c).name).join(', ') + '.');
  if (s.flags.site_oldmill && !(s.knights.lunete && s.knights.lunete.realm === r0)) out.push('Seek the Old Mill at Beltane Ford for the Keeper\'s daughter.');
  if (s.sanctumOpen === r0) out.push('March on the Sanctum from Meridian. Light all four Season Dials.');
  out.push('Castles: ' + sim.castlesOf(r0).length + '. Knights: ' + sim.knightsOf(r0).length + '. Mana: ' + s.realms[r0].mana + '.');
  return out;
}
function privacyPanel(realm, done) {
  return { update() { if (G.inp().pressed('confirm') || (G.inp().clicked && G.inp().clicked())) { G.sfx('ui_confirm'); done(); } },
    draw(r) { r.overlay(g => { const k = CU.k(); CP.rect(g, 0, 0, r.W, r.H, '#07060d'); const ru = G.RULER[realm]; G.knightVis(ru).portrait(g, r.W / 2 - 40 * k, r.H / 2 - 70 * k, 80 * k, { bg: E.tones(realmOf(realm).color).deep }); CU.title(g, kname(ru).toUpperCase() + "'S " + (C.sim.s.phase === 'march' ? 'MARCH' : 'MUSTER'), r.W / 2, r.H / 2 + 18 * k, { scale: 2 }); CU.text(g, 'Pass the controller.', r.W / 2, r.H / 2 + 40 * k, '#e8e4f0', { align: 'center' }); }); CU.prompts(r, [['confirm', 'Begin']]); } };
}
/** autoplay (tests and the attract mode): the realm AI plays the player's Muster */
function autoplayMuster() { G.CampaignAI.muster(C.sim, me()); const ev = C.sim.apply({ t: 'endMuster', realm: me() }); afterPhaseChange(ev); }
G.Camp.autoplayMuster = autoplayMuster;

/* ---- drawing the continent ---- */
function drawCampaign(r) {
  const sim = C.sim, s = sim.s, t = C.t, wm = C.wm, L = G.game.lights;
  wm.draw(r, t);
  const attackable = s.phase === 'muster' || s.phase === 'march' ? threatened() : {};
  for (const c of G.all('castle')) {
    const cs = s.castles[c.id], [x, y] = c.pos, R = G.get('realm', cs.owner);
    r.shape(G.castleShape(c.region === 'hour' ? 'hour' : G.CROSS[c.region] ? 'brigand' : c.region), x, y, 0, { facing: Math.PI / 2, flash: cs.stilled ? '#a8a8b8' : false });
    // the banner
    r.queue(x + 22, y + 16, 0, g => { const b = r.w(x + 22, y + 16, 0), tp = r.w(x + 22, y + 16, 58); CP.line(g, b[0], b[1], tp[0], tp[1], '#3a2a1a', 1); const wv = Math.sin(t * 3 + x) * 1.5; CP.poly(g, [[tp[0] + 1, tp[1]], [tp[0] + 15, tp[1] + 1 + wv], [tp[0] + 15, tp[1] + 10 + wv], [tp[0] + 1, tp[1] + 10]], cs.stilled ? '#6a6a76' : R.color); CP.sprite(g, G.sigil(R.sigil, R.trim), tp[0] + 4, tp[1] + 2 + Math.round(wv / 2)); }, { bias: 30 });
    // troop figures in front (up to 4, then +N)
    cs.knights.slice(0, 4).forEach((kid, i) => {
      const kk = sim.knight(kid), vis = G.knightVis(kid), fx = x - 18 + i * 12, fy = y + 22;
      vis.rig.update(1 / 60, { x: fx, y: fy, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: kk.wounded ? 'kneel' : null });
      r.actor(fx, fy, 0, (g, ox, oy) => { g.save(); g.translate(ox, oy); g.scale(.6, .6); g.translate(-ox, -oy); vis.rig.draw(g, ox, oy, r.view); g.restore(); }, { outline: true });
    });
    if (cs.knights.length > 4) r.textAt(x + 30, y + 22, 6, '+' + (cs.knights.length - 4), '#ffffff');
    if (cs.stilled) r.queue(x, y, 60, g => { const q = r.w(x, y, 62); CP.sprite(g, G.ICON.clock, q[0] - 3, q[1] - 3); }, { bias: 50 });
    if (attackable[c.id]) r.queue(x, y, 60, g => { const q = r.w(x - 16, y, 56 + Math.sin(t * 5) * 2); CP.rect(g, q[0] - 3, q[1] - 6, 7, 11, '#c83a2a'); CP.rect(g, q[0] - 1, q[1] - 5, 3, 6, '#ffffff'); CP.rect(g, q[0] - 1, q[1] + 2, 3, 2, '#ffffff'); }, { bias: 50 });
    if (c.region === 'hour' || cs.owner === 'dominion') L.add(x, y, 30, 50, .4, { color: '#ffe0a0' });
  }
  // questing knights: an away icon at their castle of origin
  for (const k of Object.values(s.knights)) if (k.quest && sim.isHuman(k.realm)) { const p = G.get('castle', k.quest.from).pos; r.queue(p[0] + 24, p[1], 40, g => { const q = r.w(p[0] + 24, p[1], 40); CP.sprite(g, G.ICON.away, q[0], q[1]); }, { bias: 60 }); }
  // march arrows: chevrons along the road
  const arrows = (C.marchArrows || []).concat(s.phase === 'march' ? s.marches.filter(m => sim.isHuman(m.realm)).map(m => ({ realm: m.realm, target: m.target, from: Object.values(m.from)[0], n: m.knights.length })) : []);
  for (const a of arrows) {
    if (a.target === 'sanctum' || !a.from) continue;
    const A = G.get('castle', a.from).pos, Bp = G.get('castle', a.target).pos, col = realmOf(a.realm).color;
    r.decal(g => { const n = 9; for (let i = 0; i < n; i++) { const k = ((i + t * 2) % n) / n, x = A[0] + (Bp[0] - A[0]) * (.2 + k * .6), y = A[1] + (Bp[1] - A[1]) * (.2 + k * .6), q = r.w(x, y, 0), d = Math.atan2(Bp[1] - A[1], Bp[0] - A[0]), f = [Math.cos(d), Math.sin(d) * .8], sd = [-f[1], f[0]]; CP.poly(g, [[q[0] + f[0] * 5, q[1] + f[1] * 5], [q[0] - f[0] * 3 + sd[0] * 4, q[1] - f[1] * 3 + sd[1] * 4], [q[0] - f[0], q[1] - f[1]], [q[0] - f[0] * 3 - sd[0] * 4, q[1] - f[1] * 3 - sd[1] * 4]], col); } });
    r.textAt((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, 14, 'x' + a.n, '#ffffff');
  }
  // the marching figures walk the road into battle
  if (C.anim && C.anim.march) { const p = C.anim.march, A = G.get('castle', Object.values(p.march.from)[0] || 'meridian').pos, Bp = G.get('castle', p.kind === 'sanctum' ? 'meridian' : p.castle).pos, k = Math.min(1, C.anim.t / C.anim.dur); p.march.knights.forEach((kid, i) => { const vis = G.knightVis(kid), x = A[0] + (Bp[0] - A[0]) * k + i * 6, y = A[1] + (Bp[1] - A[1]) * k + i * 4; vis.rig.update(1 / 60, { x, y, z: 0, vx: (Bp[0] - A[0]), vy: (Bp[1] - A[1]), facing: Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) }); r.actor(x, y, 0, (g, ox, oy) => vis.rig.draw(g, ox, oy, r.view)); }); }
  // the focus ring
  if (C.focus) { const [x, y] = G.get('castle', C.focus).pos; r.decal(g => { const pts = r.groundPts(x, y, 30 + Math.sin(t * 4) * 2, 28, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; CP.line(g, a[0], a[1], b[0], b[1], i % 2 ? '#ffe070' : '#ffffff', 1); } }); }
  if (C.panel && C.panel.allowed) for (const id of C.panel.allowed) { const [x, y] = G.get('castle', id).pos; r.decal(g => { const pts = r.groundPts(x, y, 26, 24, 0); for (let i = 0; i < pts.length; i += 2) CP.dot(g, pts[i][0], pts[i][1], '#7ae0ff'); }); }
  // the season wipe from Meridian
  if (C.wipe > 0) { const rad = (1 - C.wipe) * 700, col = G.elemColor(sim.season); r.decal(g => { const pts = r.groundPts(512, 512, rad, 64, 0), pts2 = r.groundPts(512, 512, rad + 30, 64, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts2[i]; CP.line(g, a[0], a[1], b[0], b[1], col, 2); } }, { emissive: 1 }); }
  hudCampaign(r);
  if (C.panel) C.panel.draw(r);
  CU.modalDraw(r, t); CU.tipDraw(r, 1 / 60); CU.drawToasts(r);
  G.Talk.draw(r);
}
/** castles a neighbour could attack this season (a red "!") */
function threatened() {
  const sim = C.sim, out = {}, r0 = me();
  for (const c of sim.castlesOf(r0)) for (const n of G.get('castle', c).roads) { const o = sim.s.castles[n].owner; if (o !== r0 && o !== 'brigands' && (o !== 'dominion' || G.CampaignAI.aggression(sim, 'dominion') > 0) && sim.defenders(n).length) { out[c] = true; break; } }
  return out;
}
function hudCampaign(r) {
  const sim = C.sim, s = sim.s, r0 = me();
  r.overlay(g => {
    const k = CU.k();
    // top left: the season wheel and the phase
    CU.box(g, 6, 6, 150 * k, 22 * k, { alpha: .9 });
    drawWheel(g, 6 + 11 * k, 6 + 11 * k, 8 * k, sim.season, 0);
    CU.text(g, G.SEASON_NAME[sim.season].toUpperCase() + ' • YEAR ' + sim.year + ' • ' + ({ tidings: 'TIDINGS', muster: 'MUSTER', march: 'MARCH', resolve: 'BATTLES' }[s.phase] || ''), 6 + 22 * k, 9, '#ffffff');
    CU.text(g, realmOf(r0).short + (s.humans.length > 1 ? ' (P' + (s.humans.indexOf(r0) + 1) + ')' : '') + (s.dev ? ' • DEV' : ''), 6 + 22 * k, 9 + 9 * k, E.tones(realmOf(r0).color).lt);
    // top right (clear of the corner): mana and the candle
    const corner = G.game.cornerArea && G.game.cornerArea(), rx = (corner ? Math.min(r.W, corner.x0) : r.W) - 6;
    const rr = s.realms[r0], inc = sim.income(r0) - sim.upkeep(r0);
    CU.box(g, rx - 92 * k, 6, 92 * k, 22 * k, { alpha: .9 });
    CP.sprite(g, G.ICON.mana, rx - 88 * k, 10); CU.text(g, rr.mana + ' (' + (inc >= 0 ? '+' : '') + inc + ')', rx - 80 * k, 9, '#a8e8ff');
    if (s.candle !== null) { CP.sprite(g, G.ICON.candle, rx - 88 * k, 8 + 10 * k); CU.text(g, 'Candle ' + s.candle, rx - 80 * k, 9 + 9 * k, s.candle <= 2 ? '#ff6a5a' : '#ffe0a0'); }
    else CU.text(g, 'Candle unlit', rx - 80 * k, 9 + 9 * k, '#8a86a0');
  });
  if (!C.panel && !G.Talk.open && !CU.modal && !C.anim && !C.todo.length) {
    if (s.phase === 'muster') { r.overlay(g => castleCard(g, r, C.focus, null)); CU.prompts(r, [['move', 'Castle'], ['confirm', 'Muster'], ['info', 'Info'], ['command', 'Commands / Hold: End']]); }
    else if (s.phase === 'march') { r.overlay(g => castleCard(g, r, C.focus, null)); CU.prompts(r, [['move', 'Target'], ['confirm', 'March'], ['command', 'Commands / Hold: End'], ['cancel', 'Pause']]); }
  }
}
