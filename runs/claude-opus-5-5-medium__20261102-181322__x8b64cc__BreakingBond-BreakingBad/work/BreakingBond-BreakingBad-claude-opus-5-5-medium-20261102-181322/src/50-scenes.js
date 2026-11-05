/* =====================================================================================
 * 50 SCENES — title (with the attract mode after 10 idle seconds), the cold-open card, play, results, the lab
 * (upgrades), game over, the ending, About / Credits, and the Cook-Off (score attack, co-op, and the AI Hub round).
 * ===================================================================================== */
talk = new E.Dialog(game, { speed: 46, lines: 3 }); talk.voice = null;
barkTalk = new E.Dialog(game, { speed: 60, lines: 1 }); barkTalk.voice = null;
let lastShown = { a: 0, b: 0 };
function voiceTick() {   // the gibberish voice: a chirp per letter typed, in the speaker's voice
  for (const [d, k] of [[talk, 'a'], [barkTalk, 'b']]) {
    if (!d.open) { lastShown[k] = 0; continue; }
    const page = d.pages && d.pages[d.i], text = page ? (Array.isArray(page) ? page.join(' ') : String(page)) : '';
    const n = Math.floor(d.shown || 0);
    if (n < lastShown[k]) lastShown[k] = 0;
    for (let i = lastShown[k]; i < n; i++) if (i % 2 === 0) babble(d.who, text.replace(/\{[^}]*\}/g, '')[i]);
    lastShown[k] = n;
  }
}

/* ---- Button glyphs drawn in pixels: PlayStation shapes in their colours, Xbox letters in theirs, keycaps for keys ---- */
const PS = { '✕': '#7aa8ff', '○': '#ff6a7a', '□': '#e88ae8', '△': '#5ae0b0' }, XB = { A: '#5ad05a', B: '#ff5a4a', X: '#4a9aff', Y: '#f0c030' };
function drawKey(g, key, x, y) {
  key = String(key || '?');
  if (PS[key]) {
    px.disc(g, x + 6, y + 4, 7, '#14161c'); px.disc(g, x + 6, y + 4, 6, '#262a34');
    const c = PS[key];
    if (key === '✕') { px.line(g, x + 3, y + 1, x + 9, y + 7, c, 2); px.line(g, x + 9, y + 1, x + 3, y + 7, c, 2); }
    else if (key === '○') { px.disc(g, x + 6, y + 4, 4, c); px.disc(g, x + 6, y + 4, 2, '#262a34'); }
    else if (key === '□') { px.rect(g, x + 3, y + 1, 7, 7, c); px.rect(g, x + 5, y + 3, 3, 3, '#262a34'); }
    else { px.poly(g, [[x + 6, y], [x + 11, y + 8], [x + 1, y + 8]], c); px.poly(g, [[x + 6, y + 3], [x + 8, y + 6], [x + 4, y + 6]], '#262a34'); }
    return 13;
  }
  if (XB[key] && game.settings.glyphs === 'xbox') { px.disc(g, x + 6, y + 4, 7, '#14161c'); px.disc(g, x + 6, y + 4, 6, XB[key]); E.font.text(g, key, x + 6, y + 1, '#101010', { align: 'center', outline: false }); return 13; }
  const w = E.font.width(key) + 8;
  E.ui.box(g, x, y - 2, w, 12, { bg: '#e8e4dc', border: '#ffffff', gradient: false });
  px.rect(g, x + 1, y + 9, w - 2, 1, '#a8a49c');
  E.font.text(g, key, x + 4, y, '#14100c', { outline: false });
  return w;
}
function promptPill(g, key, text, cx, y) {
  const tw = E.font.width(text), kw = PS[key] || (XB[key] && game.settings.glyphs === 'xbox') ? 13 : E.font.width(key) + 8, w = kw + 6 + tw + 10, x = Math.round(cx - w / 2);
  px.blend(g, .75, 'normal', () => px.rect(g, x, y - 4, w, 16, '#0c0a08'));
  px.rect(g, x, y - 4, w, 1, '#59c8f0');
  drawKey(g, key, x + 4, y); E.font.text(g, text, x + kw + 9, y, '#ffffff');
}
// the cook's prompt uses the same glyphs
Cook.prototype.prompt = function (g, x, y, key, what) { promptPill(g, key, what, x, y); };

/* ---- Idle and any-input watch (raw events: the attract mode leaves on any of them, the title counts idle time) ---- */
let lastInput = performance.now(), anyInput = false;
const poke = () => { lastInput = performance.now(); anyInput = true; };
let kbPad = false; const touchGate = () => TOUCH_ONLY && !kbPad;
addEventListener('keydown', e => { kbPad = true; poke(); }, true); addEventListener('pointerdown', poke, true); addEventListener('wheel', poke, true);
let lastMouse = null; addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; if (lastMouse && Math.hypot(e.clientX - lastMouse[0], e.clientY - lastMouse[1]) > 6) poke(); lastMouse = [e.clientX, e.clientY]; }, true);
function padActivity() { try { for (const p of Array.from(navigator.getGamepads() || [])) { if (!p) continue; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) { kbPad = true; return true; } } } catch (e) { } return false; }

/* ---- Bot input: the attract mode's player (it cheats: it never dies, walks through walls when stuck, never runs out) ---- */
const BOT = { _d: {}, _p: {}, mv: [0, 0], lastDevice: 'keyboard', aimSource: 'move', padAim: null, aimWorld: null, stuck: 0,
  move() { return this.mv; }, down(a) { return !!this._d[a]; }, pressed(a) { return !!this._p[a]; }, released() { return false; }, consume(a) { this._p[a] = false; }, consumeAll() { this._p = {}; },
  label: a => game.input.label(a), repeat() { return false; }, buffered(a) { return !!this._p[a]; }, rumble() { } };
let botClock = 0;
function botThink(dt) {
  const h = W.hero; BOT._p = {}; BOT._d = {}; BOT.mv = [0, 0]; BOT.aimWorld = null; botClock += dt;
  if (talk.open) { if (Math.floor(botClock / .8) !== Math.floor((botClock - dt) / .8)) game.input.tap('confirm'); return; }
  if (M.cookObj) return;
  let target = null;
  const foes = W.enemies.filter(e => !e.dead);
  if (foes.length) {
    foes.sort((a, b) => dist2(a, h) - dist2(b, h)); const e = foes[0], d = dist2(e, h);
    BOT.aimWorld = { x: e.x, y: e.y };
    if (d < 45) target = { x: h.x - (e.x - h.x), y: h.y - (e.y - h.y) }; else if (d > 110) target = e;
    if (Math.floor(botClock / .7) !== Math.floor((botClock - dt) / .7)) BOT._p.throw = true;
    if (h.meter >= 1) BOT._p.catalyst = true;
    if (Math.random() < dt * .5 && W.flaskKinds.length > 1) BOT._p.swap = true;
  } else {
    const acts = W.acts.filter(a => a.active && !a.used && !a.hide);
    if (acts.length) { acts.sort((a, b) => ((a.botN || 0) - (b.botN || 0)) * 1e5 + dist2(a, h) - dist2(b, h)); target = acts[0]; if (dist2(target, h) < (target.r || 20)) { BOT._p.interact = true; target.botN = (target.botN || 0) + 1; target = null; } }
    else if (W.marker) target = W.marker;
    else if (W.crates) { const c = W.carry < 2 ? W.crates.filter(c => !c.taken).sort((a, b) => dist2(a, h) - dist2(b, h))[0] : null; target = c || W.rigAct; if (!c && W.rigAct && dist2(W.rigAct, h) < 22) BOT._p.interact = true; }
  }
  if (target) {
    W.flow.update(target.x, target.y);
    const d = W.flow.dir(h.x, h.y, target.x, target.y), sx = d[0], sy = d[1];
    // world direction back to a screen direction for the view (the inverse of screenDirToGround)
    const v = game.view, a = v.screenDirToGround(1, 0), b = v.screenDirToGround(0, 1), det = a[0] * b[1] - a[1] * b[0] || 1;
    BOT.mv = [(sx * b[1] - sy * b[0]) / det, (a[0] * sy - a[1] * sx) / det];
    const l = Math.hypot(BOT.mv[0], BOT.mv[1]); if (l > 1) BOT.mv = [BOT.mv[0] / l, BOT.mv[1] / l];
    BOT._d.sprint = true;
    if (Math.hypot(h.vx, h.vy) < 10 && Math.hypot(target.x - h.x, target.y - h.y) > 20) { BOT.stuck += dt; if (BOT.stuck > .4) { const tl = Math.hypot(target.x - h.x, target.y - h.y) || 1; h.x += (target.x - h.x) / tl * 20; h.y += (target.y - h.y) / tl * 20; BOT.stuck = .2; } } else BOT.stuck = 0;   // no-clip when stuck
  }
}

/* ---- Saves ---- */
game.saves.write = () => ({ data: { state: JSON.parse(JSON.stringify(STATE)) }, place: (CHAPTERS[STATE.chapter] || CHAPTERS[0]).title, level: STATE.chapter + 1 });
game.saves.read = s => { if (s && s.data && s.data.state) Object.assign(STATE, JSON.parse(JSON.stringify(s.data.state))); };
function resetState() { Object.assign(STATE, { cash: 0, total: 0, best: 0, upgrades: { glass: 0, condenser: 0, stirrer: 0, trays: 0, suit: 0 }, cleared: {}, chapter: 0, batches: 0, product: 0 }); }

/* ================================ TITLE ================================ */
const titleRig = { gray: makeRig('GRAY'), danny: makeRig('DANNY') };
let titleMenu = null, titleT = 0, attractIdx = 0;
function buildTitleMenu() {
  const hasSave = !!game.saves.latest();
  const items = touchGate() ? ['SETTINGS', 'ABOUT & CREDITS'] : [hasSave ? 'CONTINUE' : { label: 'CONTINUE', disabled: true }, 'NEW EPISODE', 'CHAPTERS', 'COOK-OFF (1-2 PLAYERS)', 'SETTINGS', 'ABOUT & CREDITS'];
  titleMenu = new E.Menu(game, items, { y: 120, onPick: (i, it) => pickTitle(typeof it === 'string' ? it : it.label) });
}
function pickTitle(name) {
  A.sfx('confirm');
  if (name === 'CONTINUE') { const s = game.saves.latest(); if (s) { game.saves.load(s.slot); game.go('lab', { next: STATE.chapter + (STATE.cleared[CHAPTERS[STATE.chapter].id] ? 1 : 0) }); } }
  else if (name === 'NEW EPISODE') { resetState(); game.go('card', { ch: 0 }); }
  else if (name === 'CHAPTERS') game.go('chapters');
  else if (name.startsWith('COOK-OFF')) game.go('cookoff', {});
  else if (name === 'SETTINGS') game.menu('settings');
  else if (name.startsWith('ABOUT')) game.go('about');
}
const titleScene = {
  enter() { buildLocation('desert'); W = newWorld('desert', {}); music('title'); titleT = 0; lastInput = performance.now(); buildTitleMenu(); L.enabled = false; game.weather = { kind: 'sand', amount: .2, wind: .5 }; ui.hud({}); game.resetCamera && game.resetCamera(); },
  exit() { game.weather = null; },
  update(dt) {
    titleT += dt;
    if (padActivity()) poke();
    if ((titleMenu.items.length === 2) !== touchGate()) buildTitleMenu();
    if (!titleMenu.update(dt) && game.input.pressed('start')) titleMenu.onPick(titleMenu.i, titleMenu.items[titleMenu.i]);
    if (!game.paused && performance.now() - lastInput > 10000 && !(game.shell && game.shell.screen)) { anyInput = false; startAttract(); }
    const cx = 23.5 * R16, cy = 17 * R16;
    game.focus(cx + Math.sin(titleT * .05) * 30, cy + 10, 0);
    titleRig.gray.update(dt, { x: 24 * R16, y: 18.6 * R16, z: 0, vx: 0, vy: 0, facing: Math.PI * .55, pose: 'hips' });
    titleRig.danny.update(dt, { x: 26.4 * R16, y: 18.2 * R16, z: 0, vx: 0, vy: 0, facing: Math.PI * .7 });
  },
  draw(r) {
    drawLocation(r, W.loc, false);
    r.shadow(24 * R16, 18.6 * R16, 6, .35); r.actor(24 * R16, 18.6 * R16, 0, (g, ox, oy) => titleRig.gray.draw(g, ox, oy, r.view));
    r.shadow(26.4 * R16, 18.2 * R16, 6, .35); r.actor(26.4 * R16, 18.2 * R16, 0, (g, ox, oy) => titleRig.danny.draw(g, ox, oy, r.view));
    r.overlay(g => {
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a2a1a'));
      const y0 = Math.max(18, Math.round(r.H * .12));
      // the periodic-table logo: two element tiles, then the rest of the word
      const tile = (x, y, sym, num, name) => { E.ui.box(g, x, y, 40, 40, { bg: ['#2a6a3a', '#173a20'], border: '#cfe8c0' }); E.font.text(g, String(num), x + 3, y + 2, '#cfe8c0', { font: 'tiny' }); E.font.title(g, sym, x + 20, y + 11, { scale: 2, align: 'center', colors: ['#ffffff', '#d8f0d0'] }); E.font.text(g, name, x + 20, y + 32, '#cfe8c0', { font: 'tiny', align: 'center' }); };
      const cx = Math.round(r.W / 2), wTot = 230, x0 = cx - wTot / 2;
      tile(x0, y0, 'Br', 35, 'BROMINE'); E.font.title(g, 'EAKING', x0 + 44, y0 + 12, { scale: 3, colors: ['#f4f0e0', '#e0d8b8', '#b8a878'], depth: 2, depthColor: '#2a2010' });
      tile(x0 + 30, y0 + 46, 'B', 5, 'BORON'); E.font.title(g, 'OND', x0 + 74, y0 + 58, { scale: 3, colors: ['#f4f0e0', '#e0d8b8', '#b8a878'], depth: 2, depthColor: '#2a2010' });
      E.font.text(g, 'A CHEMISTRY TEACHER. A DIAGNOSIS. A CHANGE.', cx, y0 + 94, '#e8c890', { align: 'center', shadow: '#000' });
      if (touchGate()) {
        E.ui.box(g, cx - 140, r.H - 64, 280, 34, { bg: ['#3a1a14', '#200c08'], border: '#ff8a6a' });
        E.font.text(g, 'Controller or keyboard required', cx, r.H - 58, '#ffffff', { align: 'center', scale: 1 });
        E.font.text(g, 'Connect one to play. The demo runs on its own.', cx, r.H - 46, '#e8c0b0', { align: 'center' });
      }
      E.font.text(g, 'v' + VERSION + '  my-3D2dge ' + (E.version || ''), 6, 6, '#8a7a62', { font: 'tiny' });
      const dev = game.input.lastDevice, hint = dev === 'gamepad' || touchGate() ? '' : dev === 'touch' ? '' : 'Arrows / mouse to choose  •  Enter or click';
      if (hint) E.font.text(g, hint, cx, r.H - 12, '#b8a888', { align: 'center' });
    });
    titleMenu.y = Math.max(124, Math.round(r.H * .12) + 110);
    titleMenu.draw(r);
    if (game.input.lastDevice === 'gamepad') r.overlay(g => { const k = label('confirm'); const tw = 13 + 6 + E.font.width('Select'); promptPill(g, k, 'Select', r.W / 2, r.H - 16); });
  }
};
function startAttract() {
  const plan = [{ ch: 0, beat: 0 }, { ch: 2, beat: 0 }, { ch: 3, beat: 1 }, { ch: 4, beat: 1 }, { ch: 1, beat: 1 }, { ch: 5, beat: 1 }];
  const p = plan[attractIdx % plan.length]; attractIdx++;
  game.go('play', { ch: p.ch, beat: p.beat, attract: true }, { fade: 'dissolve' });
}

/* ================================ CHAPTER SELECT ================================ */
let chapMenu = null;
const chaptersScene = {
  enter() { chapMenu = new E.Menu(game, CHAPTERS.map((c, i) => (i + 1) + '.  ' + c.title.toUpperCase()).concat(['BACK']), { y: 70, onPick: i => { if (i >= CHAPTERS.length) return game.go('title'); resetState(); STATE.chapter = i; STATE.product = i >= 3 ? 6 : 0; STATE.best = i >= 3 ? 96.2 : 0; STATE.cash = i >= 4 ? 40000 : 0; game.go('card', { ch: i }); }, onCancel: () => game.go('title') }); },
  update(dt) { chapMenu.update(dt); },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#1a120c', '#3a2414', '#5a3a1e']);
    r.overlay(g => { E.font.title(g, 'CHAPTERS', r.W / 2, 22, { scale: 2, align: 'center', colors: ['#fff4e0', '#e8c890', '#a87840'] }); const c = CHAPTERS[chapMenu.i]; if (c) E.font.text(g, c.about, r.W / 2, r.H - 26, '#e8d8b8', { align: 'center' }); });
    chapMenu.draw(r);
  }
};

/* ================================ COLD OPEN CARD ================================ */
let card = null;
const cardScene = {
  enter(d) { const ch = CHAPTERS[d.ch]; card = { ch: d.ch, t: 0, lines: ch.cold, title: ch.title }; music('sad'); STATE.chapter = d.ch; if (!HUB) game.saves.autosave(); },
  update(dt) {
    card.t += dt;
    const I = game.input, total = 2.2 + card.lines.length * 2.4;
    if ((card.t > .5 && (I.pressed('confirm') || I.pressed('start') || I.pressed('throw'))) || card.t > total + 2) game.go('play', { ch: card.ch, beat: 0 }, { fade: 'iris' });
  },
  draw(r) {
    r.sky(['#000000', '#050404']);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.text(g, 'EPISODE ONE  •  PILOT LIGHT', cx, 24, '#8a7a62', { align: 'center' });
      E.font.title(g, 'CHAPTER ' + (card.ch + 1), cx, 40, { scale: 1, align: 'center', colors: ['#b8a888', '#8a7a62'] });
      E.font.title(g, card.title.toUpperCase(), cx, 56, { scale: 2, align: 'center', colors: ['#fff8e8', '#e8d0a0', '#b08850'] });
      let y = 100;
      card.lines.forEach((l, i) => {
        const t0 = 1.2 + i * 2.4; if (card.t < t0) return;
        const n = Math.min(l.length, Math.floor((card.t - t0) * 40));
        for (const w of wrapText(l.slice(0, n), 52)) { E.font.text(g, w, cx, y, i === 0 ? '#e8c890' : '#e8e4dc', { align: 'center' }); y += 11; }
        y += 8;
      });
      promptPill(g, label('confirm'), 'Skip', r.W - 50, r.H - 18);
    });
  }
};

/* ================================ PLAY ================================ */
let toastCool = 0, attractT = 0, chStart = 0;
window.__bbRestart = () => { if (game.sceneName === 'play' && M.mission && !W.attract) { game.resume(); game.go('play', { ch: CHAPTERS.indexOf(M.mission), beat: M.beat }); } };
function startChapter(i, beat, attract) {
  const ch = CHAPTERS[i];
  newWorld(ch.loc, { night: ch.night, combat: ch.combat, stealth: ch.stealth, heat: ch.heat, flasks: ch.flasks, attract });
  M.mission = ch; M.beat = beat; M.cut = false; M.cookObj = null; M.flags = {}; M.waves = 0; STATE.chapter = i;
  const sp = (beat > 0 && ch.beats[beat].at) || ch.spawn;
  W.hero = makePlayer('GRAY', sp[0] * R16, sp[1] * R16, { hp: 6 });
  if (ch.partner) { W.partner = makePlayer('DANNY', sp[0] * R16 + 14, sp[1] * R16 + 6, { ai: true, hp: 6 }); W.partner.player = game.players[1] || null; }
  if (ch.id === 'ch1' && beat >= 2) {}
  ch.setup();
  if (ch.id === 'ch2' && beat >= 2) { W.map.set(17, 7, 0); }
  if (ch.id === 'ch1') { M.flags.danny = { x: 14 * R16, y: 19.6 * R16 }; if (beat >= 2) M.npc('DANNY', 14, 19.6, { facing: Math.PI, pose: 'hips' }); }
  if (attract) { W.hero.hp = 999; W.hero.maxHp = 999; W.hero.meter = 1; }
  L.enabled = !!ch.night; L.ambient = ch.dusk ? .55 : .4; L.tint = undefined;
  game.weather = W.loc.weather || null;
  game.cam.bounds = v => W.map.bounds(v);
  music(ch.music);
  M.script = game.script(function* () {
    for (let b = beat; b < ch.beats.length; b++) { M.beat = b; yield* ch.beats[b].run(); }
    completeChapter();
  });
  chStart = W.time = 0; attractT = 0; toastCool = 1;
  if (!attract && ch.partner) game.allowJoin({ max: 2, onJoin: (input) => { if (W && W.partner) { W.partner.player = input; input.glyphs = game.settings.glyphs; W.toasts.push(['Player 2 joined', 'Danny is yours. ' + label('melee', input) + ' punches hard.']); } } });
}
function completeChapter() {
  if (W.attract && !W.test) { startAttractNext(); return; }
  const ch = M.mission; STATE.cleared[ch.id] = true;
  const stats = { time: W.time, kills: W.kills, cash: STATE.cash, best: STATE.best };
  game.go('results', { ch: CHAPTERS.indexOf(ch), stats }, { fade: 'white' });
}
function startAttractNext() { game.go('title'); }
function failMission(reason) {
  if (W.attract || W.fail) return;
  W.fail = reason; W.banner = { text: reason === 'busted' ? 'BUSTED' : reason === 'caught' ? 'CAUGHT' : 'DOWN', sub: '' }; W.bannerT = 3;
  A.sfx(reason === 'down' ? 'die' : 'alarm');
  game.after(1.4, () => game.go('over', { reason, ch: CHAPTERS.indexOf(M.mission), beat: M.beat }));
}
function caughtBy(g) {
  if (W.attract || W.fail) return;
  if (W.heatOn) { W.heat = 1; failMission('busted'); }
  else failMission('caught');
}
function useAct(a, who) {
  if (!a.active) return;
  if (a.hide) { if (who.hidden) unhide(who); else hide(who, a); return; }
  a.used = true; A.sfx('select');
  if (a.npc) { a.npc.facing = Math.atan2(who.y - a.npc.y, who.x - a.npc.x); who.facing = Math.atan2(a.npc.y - who.y, a.npc.x - who.x); }
  if (a.on) a.on(a, who);
}
function computeFocus() {
  const h = W.hero; if (!h || M.cut) { W.focus = null; return; }
  const I = game.input, ptr = I.lastDevice === 'mouse' ? I.pointer() : null;
  let best = null, bd = 1e9;
  for (const a of W.acts) {
    a.hovered = false;
    if (!a.active || a.used) continue;
    if (ptr && a.sx !== undefined && Math.hypot(ptr[0] - a.sx, ptr[1] - a.sy) < 20 && dist2(a, h) < 220) { a.hovered = true; best = a; bd = -1; continue; }
    const d = dist2(a, h); if (bd >= 0 && d < (a.r || 20) + 8 && d < bd) { best = a; bd = d; }
  }
  W.focus = best;
}
function updateWorld(dt, playable) {
  W.time += dt;
  for (const n of W.noise) n.t -= dt; E.prune(W.noise, n => n.t <= 0);
  const I = W.attract ? BOT : game.input;
  if (W.attract) botThink(dt);
  if (playable && W.hero) controlPlayer(W.hero, I, dt); else if (W.hero) { W.hero.vx = W.hero.vy = 0; W.hero.update(dt, W.map); }
  if (W.partner) { if (playable || !W.partner.player) controlPartner(W.partner, dt); }
  for (const n of W.npcs) {
    if (n.goal) { const dx = n.goal.x - n.x, dy = n.goal.y - n.y, l = Math.hypot(dx, dy); if (l < 3) { n.goal = null; n.vx = n.vy = 0; } else { n.vx = dx / l * n.speed; n.vy = dy / l * n.speed; n.facing = Math.atan2(dy, dx); } }
    else { n.vx = n.vy = 0; }
    n.update(dt, W.map);
    n.rig.update(dt, { x: n.x, y: n.y, z: n.z, vx: n.vx, vy: n.vy, facing: n.facing, pose: n.goal ? null : n.pose, expr: n.expr });
  }
  let alert = false, search = false;
  for (const g of W.guards) { const st = updateGuard(g, dt); if (st === 'alert') alert = true; if (st === 'search') search = true; if (g.rig) g.rig.update(dt, { x: g.x, y: g.y, z: g.z, vx: g.vx, vy: g.vy, facing: g.facing, point: st === 'alert' && g.kind === 'agent' }); }
  if (W.heatOn && !W.fail) { W.heat = clamp(W.heat + (alert ? dt * .22 * DIFF().sight : search ? dt * .04 : -dt * .07), 0, 1); if (W.heat >= 1) failMission('busted'); }
  if (W.guards.length) { const on = alert ? 1 : 0; if (W.alarmOn !== on) { W.alarmOn = on; const song = SONGS[musicNow], has = n => song && song.tracks.some(t => t.name === n); if (has('chase')) A.layer('chase', on, on ? .4 : 2); if (has('alarm')) A.layer('alarm', on, on ? .6 : 2); } }
  for (const e of W.enemies) { updateEnemy(e, dt); e.rig.update(dt, e.dead ? { x: e.x, y: e.y, z: e.z, facing: e.facing, down: clamp(e.downT * 3, 0, 1) } : rigState(e, { stance: 'guard', point: e.kind === 'gunman', hurt: e.hurtT > 0 || e.stun > 0, pose: e.fear > 0 ? 'guard' : null })); }
  W.shots.update(dt, W.map);
  W.shots.hit(players(), (b, t) => { hurtPlayer(t, b.dmg || 1, Math.atan2(b.vy, b.vx)); b.life = 0; }, 'enemy');
  updateFlasks(dt); updateClouds(dt); updatePickups(dt);
  for (const a of [W.hero, W.partner]) if (a) a.rig.update(dt, a.dead ? { x: a.x, y: a.y, z: a.z, facing: a.facing, pose: 'die' } : rigState(a, { pose: a.kneel ? 'kneel' : null, stance: W.combat ? 'guard' : null }));
}
const playScene = {
  pausable: true, camera: { zoom: [.75, 2], start: 1.1, tall: 1.4 },
  enter(d) { startChapter(d.ch, d.beat || 0, !!(d.attract || d.test)); W.test = !!d.test; },
  exit() { ui.hud({}); L.enabled = false; game.weather = null; game.allowJoin(false); talk.close(); barkTalk.close(); game.timeScale = 1; },
  back() { return false; },
  update(dt) {
    if (W.attract && !W.test) { attractT += dt; if (anyInput || padActivity()) { anyInput = false; lastInput = performance.now(); game.go('title', null, { fade: 0 }); return; } if (attractT > 30) { startAttract(); return; } }
    if (game.input.pressed('view') && !talk.open && !M.cookObj) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    voiceTick(); barkTalk.update(dt);
    { const h = W.hero, p2 = W.partner && W.partner.player && !W.partner.dead ? W.partner : null; if (h) game.focus(p2 ? (h.x + p2.x) / 2 : h.x, p2 ? (h.y + p2.y) / 2 : h.y, 14); }
    if (W.slow > 0) { W.slow -= dt; game.timeScale = W.slow > 0 ? .55 : 1; }
    if (W.bannerT > 0) W.bannerT -= dt;
    if (M.cookObj) { M.cookObj.update(dt); updateWorld(dt, false); hud(); return; }
    if (talk.update(dt)) { updateWorld(dt, false); hud(); return; }
    updateWorld(dt, !M.cut && !W.fail);
    computeFocus();
    if (toastCool > 0) toastCool -= dt; else if (W.toasts.length && game.settings.hints) { const [t, x] = W.toasts.shift(); ui.toast(t, x, 5); toastCool = 4; } else if (W.toasts.length) W.toasts.length = 0;
    hud();
  },
  draw(r) { drawPlay(r); }
};
function hud() {
  const h = W.hero; if (!h) return;
  if (M.cut || M.cookObj || talk.open || W.attract || W.fail) { ui.hud({}); return; }
  const I = game.input, pad = isPad(I), hints = game.settings.hints;
  const bars = [{ label: 'Health', value: Math.ceil(h.hp), max: h.maxHp, kind: 'pips', color: '#e8505a' }];
  if (W.combat) bars.push({ label: h.meter >= 1 ? 'Catalyst ready' : 'Catalyst', value: h.catalyst > 0 ? h.catalyst / 9 : h.meter, max: 1, color: '#59c8f0' });
  if (W.heatOn) bars.push({ label: 'Heat', value: W.heat, max: 1, color: W.heat > .7 ? '#ff3a2a' : '#ff8a3a' });
  if (W.partner && W.combat) bars.push({ label: W.partner.player ? 'Danny (P2)' : 'Danny', value: Math.ceil(W.partner.hp), max: W.partner.maxHp, kind: 'pips', color: '#e8c040' });
  const keys = !hints ? null : [[pad ? 'L stick' : ['up', 'left', 'down', 'right'].map(a => label(a)).join(''), 'Move'], [label('sprint'), 'Sprint']];
  if (hints) { if (W.stealth) keys.push([label('sneak'), 'Sneak']); keys.push([label('dodge'), 'Roll']); if (W.flaskKinds.length) keys.push([label('throw'), 'Throw']); if (W.combat) keys.push([label('melee'), 'Shove']); keys.push([label('view'), 'View']); }
  ui.hud({
    objective: W.objective ? { step: W.objective.step || undefined, title: W.objective.title, text: W.objective.text, at: W.objective.at ? { x: W.objective.at.x, y: W.objective.at.y, z: 0 } : undefined, from: h } : undefined,
    bars, counts: [['Cash', fmtMoney(STATE.cash)]].concat(STATE.product > 0 ? [['Product', STATE.product.toFixed(1) + ' lb']] : []),
    status: h.hidden ? { text: 'Hidden', color: '#9ae89a' } : W.alarmOn ? { text: 'Spotted', color: '#ff4a3a' } : h.sneak ? 'Sneaking' : h.catalyst > 0 ? { text: 'The Catalyst', color: '#59c8f0' } : null,
    keys
  });
}
const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
function drawPlay(r) {
  drawLocation(r, W.loc, W.night);
  if (W.night && W.hero && !W.hero.hidden) L.add(W.hero.x, W.hero.y, 20, 46, .35, { color: '#ffe8c8' });
  if (game.settings.cones) for (const g of W.guards) r.sightCone(g, { map: W.map, range: g.range, fov: g.fov, color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .2 : .36 });
  for (const g of W.guards) {
    if (g.kind === 'cruiser') { r.shape('cruiser', g.x, g.y, 0, { facing: g.facing }); if (W.night) { L.add(g.x + Math.cos(g.facing) * 40, g.y + Math.sin(g.facing) * 40, 4, 60, .8, { color: '#fff8d8' }); L.add(g.x, g.y, 16, 30, .7, { color: Math.floor(game.time * 4) % 2 ? '#ff3a3a' : '#3a6aff' }); } }
    else { drawActor(r, g); if (W.night && g.kind !== 'agent') L.add(g.x + Math.cos(g.facing) * 30, g.y + Math.sin(g.facing) * 30, 4, 34, .6, { color: '#fff4c0' }); }
  }
  for (const c of W.clouds) {
    if (c.kind === 'gas') r.queue(c.x, c.y, 6, g => { const p = r.w(c.x, c.y, 6), k = r.view.zoom || 1; px.blend(g, .4, 'normal', () => px.ddisc(g, Math.round(p[0]), Math.round(p[1]), Math.round(c.r * k), '#7ad04a', .7, r.ix, r.iy)); }, { emissive: false });
    else r.decal(() => r.groundArc(c.x, c.y, Math.max(0, c.r - 5), c.r, 0, TAU, '#ffe0a0', .55));
  }
  for (const p of W.pickups) { r.shadow(p.x, p.y, 4, .3); r.sprite(p.x, p.y, 4 + Math.sin(game.time * 4 + p.x) * 2, PICK[p.kind].spr, { glow: .5 }); }
  for (const f of W.flasks) { r.shadow(f.x, f.y, 3, .3); r.sprite(f.x, f.y, f.z, FLASK_SPR[f.kind], { rot: f.t * 14, glow: .6 }); }
  for (const n of W.npcs) drawActor(r, n);
  for (const e of W.enemies) {
    if (!e.dead && e.atk && e.atk.phase === 'wind') r.decal(() => r.groundArc(e.x, e.y, 4, e.kind === 'boss' ? 32 : 22, e.facing - 1.2, e.facing + 1.2, '#ff3a2a', .45));
    if (!e.dead && e.chargeWind > 0) r.decal(() => r.groundArc(e.x, e.y, 6, 90, e.facing - .15, e.facing + .15, '#ff3a2a', .5));
    if (!e.dead && e.slamWind > 0) r.decal(() => r.groundRing ? r.groundArc(e.x, e.y, 10, 60, 0, TAU, '#ff8a2a', .35) : null);
    drawActor(r, e, { alpha: e.dead && e.downT > 3 ? Math.max(0, 1 - (e.downT - 3)) : 1 });
    if (!e.dead && e.kind === 'gunman' && e.aimT > .3) { const t = nearestPlayer(e); if (t) r.queue(e.x, e.y, 18, g => { const a = r.w(e.x, e.y, 18), b = r.w(t.x, t.y, 18); px.blend(g, e.aimT > .7 ? .9 : .45, 'add', () => px.line(g, a[0], a[1], b[0], b[1], '#ff3a2a')); }, { emissive: true }); }
  }
  for (const a of [W.hero, W.partner]) if (a) drawActor(r, a);
  for (const id in W.ghosts) drawGhost(r, W.ghosts[id]);
  W.shots.draw(r);
  if (W.marker && !M.cut && !W.attract) r.marker(W.marker.x, W.marker.y, 0, { label: W.marker.label, color: '#59c8f0' });
  for (const a of W.acts) if (a.active && !a.used) { const p = r.w(a.x, a.y, 30); a.sx = p[0]; a.sy = p[1]; }
  r.overlay(g => drawPlayOverlay(r, g));
  talk.draw(r); barkTalk.draw(r);
  if (M.cookObj) M.cookObj.draw(r);
}
function drawPlayOverlay(r, g) {
  const W2 = r.W, H2 = r.H;
  if (W.dim) px.rect(g, 0, 0, W2, H2, '#000000');
  if (M.cut) { px.rect(g, 0, 0, W2, 16, '#000'); px.rect(g, 0, H2 - 16, W2, 16, '#000'); }
  // guards' ? and ! over their heads
  for (const gd of W.guards) if (gd.mind.state !== 'calm') { const [sx, sy] = r.w(gd.x, gd.y, gd.z + 46), al = gd.mind.state === 'alert'; E.font.text(g, al ? '!' : '?', Math.round(sx), Math.round(sy) - 10, MOOD[gd.mind.state], { align: 'center', shadow: '#000', scale: 2 }); }
  // the thing you can use: a pill with the button, over it
  const f = W.focus;
  if (f && !M.cut && !talk.open && !W.attract && W.hero && !M.cookObj) {
    const I = game.input, key = I.lastDevice === 'mouse' ? 'Left click' : label('interact');
    promptPill(g, key, f.verb + ' ' + (f.name ? f.name : ''), Math.round(f.sx), Math.round(f.sy) - 14);
  }
  // the boss's bar
  const boss = W.enemies.find(e => e.kind === 'boss' && !e.dead);
  if (boss) { const bw = Math.min(220, W2 - 40), x = Math.round(W2 / 2 - bw / 2), y = 24; E.font.text(g, boss.name || 'BOSS', W2 / 2, y - 10, '#ffd0a0', { align: 'center', shadow: '#000' }); px.rect(g, x - 1, y - 1, bw + 2, 7, '#000'); E.ui.bar(g, x, y, bw, 5, boss.hp / boss.maxHp, boss.phase === 2 ? '#ff3a2a' : '#e8a040'); }
  // the flask in hand
  if (W.flaskKinds.length && W.hero && !M.cut) {
    const k = W.flaskKinds[W.flaskSel], F = FLASKS[k], x = 8, y = H2 - 40;
    E.ui.box(g, x, y, 78, 32, { bg: ['#1a1410', '#0c0a08'], border: F.color, alpha: .85 });
    px.sprite(g, FLASK_SPR[k], x + 6, y + 8, { scale: 3 });
    E.font.text(g, F.name, x + 22, y + 5, F.color, { shadow: '#000' });
    E.font.text(g, k === 'chalk' ? '∞' === '∞' ? 'plenty' : '' : (W.hero.catalyst > 0 ? 'free' : '×' + W.hero.ammo[k]), x + 22, y + 15, '#ffffff');
    if (W.flaskKinds.length > 1) E.font.text(g, label('swap') + ' switch', x + 22, y + 24, '#a89878', { font: 'tiny' });
  }
  if (W.bannerT > 0 && W.banner) {
    const a = Math.min(1, W.bannerT * 2), y = Math.round(H2 * .3);
    px.blend(g, .7 * a, 'normal', () => px.rect(g, 0, y - 8, W2, 44, '#000'));
    E.font.title(g, W.banner.text, W2 / 2, y, { scale: 2, align: 'center', colors: W.fail ? ['#ffe0e0', '#ff6a5a', '#c82a2a'] : ['#e8fbff', '#9ae4ff', '#3aa8d8'] });
    if (W.banner.sub) E.font.text(g, W.banner.sub, W2 / 2, y + 22, '#e8e4dc', { align: 'center' });
  }
  if (W.attract) {
    px.blend(g, .6, 'normal', () => px.rect(g, 0, H2 - 22, W2, 22, '#000'));
    const blink = Math.floor(game.time * 2) % 2 === 0;
    E.font.text(g, 'DEMO  •  ' + (M.mission ? M.mission.title.toUpperCase() : ''), 8, H2 - 15, '#59c8f0');
    if (blink) E.font.text(g, touchGate() ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', W2 - 8, H2 - 15, '#ffffff', { align: 'right' });
    E.font.title(g, 'BREAKING BOND', W2 - 8, 8, { scale: 1, align: 'right', colors: ['#ffffff', '#cfe8c0'] });
  }
}
function drawGhost(r, gh) {
  if (!gh.rig) return;
  r.shadow(gh.x, gh.y, 6, .2);
  r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .55, outline: gh.color });
  r.overlay(g => { const p = r.w(gh.x, gh.y, 44); E.font.text(g, gh.name, Math.round(p[0]), Math.round(p[1]), gh.color, { align: 'center', shadow: '#000' }); });
}

/* ================================ RESULTS ================================ */
let res = null, resMenu = null;
const resultsScene = {
  enter(d) { res = d; music('win'); if (!HUB) game.saves.autosave(); const last = d.ch >= CHAPTERS.length - 1; resMenu = new E.Menu(game, [last ? 'THE END' : 'CONTINUE', 'TITLE'], { y: 170, onPick: i => { if (i === 1) return game.go('title'); if (last) game.go('ending'); else game.go('lab', { next: d.ch + 1 }); } }); },
  update(dt) { resMenu.update(dt); },
  draw(r) {
    r.sky(['#0c1a20', '#123040', '#1a4a5a']);
    resMenu.y = Math.round(r.H * .72);
    r.overlay(g => {
      const cx = r.W / 2, s = res.stats, ch = CHAPTERS[res.ch];
      E.font.text(g, 'CHAPTER ' + (res.ch + 1) + ' COMPLETE', cx, 26, '#9ae4ff', { align: 'center' });
      E.font.title(g, ch.title.toUpperCase(), cx, 40, { scale: 2, align: 'center', colors: ['#ffffff', '#cfefff', '#59c8f0'] });
      const rows = [['Time', Math.floor(s.time / 60) + ':' + String(Math.floor(s.time % 60)).padStart(2, '0')], ['Cash on hand', fmtMoney(STATE.cash)], ['Best purity', STATE.best ? STATE.best.toFixed(1) + '%' : '—']];
      if (s.kills) rows.push(['Cousins dealt with', String(s.kills)]);
      rows.forEach(([a, b], i) => { const y = 78 + i * 18; E.font.text(g, a, cx - 90, y, '#c8d8e0', { scale: 1 }); E.font.text(g, b, cx + 90, y, '#ffffff', { align: 'right', scale: 1 }); px.rect(g, cx - 90, y + 11, 180, 1, '#2a4a5a'); });
    });
    resMenu.draw(r);
  }
};

/* ================================ THE LAB (upgrades between chapters) ================================ */
const UPGRADES = [
  { key: 'glass', name: 'Borosilicate', what: 'Wider measuring line', cost: [4000, 9000, 16000] },
  { key: 'condenser', name: 'Reflux Condenser', what: 'Wider heat band, bigger batches', cost: [5000, 11000, 20000] },
  { key: 'stirrer', name: 'Magnetic Stirrer', what: 'Looser stirring timing', cost: [3000, 7000, 14000] },
  { key: 'trays', name: 'Steel Trays', what: 'Bigger crystal zone, more yield', cost: [4000, 9000, 18000] },
  { key: 'suit', name: 'Hazmat Suits', what: 'A little purity on every batch', cost: [6000, 12000, 22000] }
];
let lab = null;
const labScene = {
  enter(d) { lab = { next: d.next, i: 0, t: 0 }; music('cook'); if (!HUB) game.saves.autosave(); },
  update(dt) {
    lab.t += dt; const I = game.input, n = UPGRADES.length + 1;
    if (I.repeat('right') || I.repeat('down')) { lab.i = (lab.i + 1) % n; A.sfx('select'); }
    if (I.repeat('left') || I.repeat('up')) { lab.i = (lab.i + n - 1) % n; A.sfx('select'); }
    const ptr = I.pointer(); if (ptr && lab.rects && I.lastDevice === 'mouse') lab.rects.forEach((rc, i) => { if (ptr[0] >= rc[0] && ptr[0] < rc[0] + rc[2] && ptr[1] >= rc[1] && ptr[1] < rc[1] + rc[3] && lab.i !== i) { lab.i = i; A.sfx('select', { vol: .4 }); } });
    const clicked = I.clicked(), hit = clicked && lab.rects && lab.rects.findIndex(rc => clicked[0] >= rc[0] && clicked[0] < rc[0] + rc[2] && clicked[1] >= rc[1] && clicked[1] < rc[1] + rc[3]);
    if (I.pressed('confirm') || (hit !== null && hit !== undefined && hit >= 0)) {
      if (hit >= 0) lab.i = hit;
      if (lab.i === UPGRADES.length) { A.sfx('confirm'); game.go('card', { ch: lab.next }); return; }
      const u = UPGRADES[lab.i], lv = STATE.upgrades[u.key], cost = u.cost[lv];
      if (cost !== undefined && STATE.cash >= cost) { STATE.cash -= cost; STATE.upgrades[u.key]++; A.sfx('cash'); game.flash('#59c8f0', .1, .3); lab.msg = u.name + ' installed.'; }
      else { A.sfx('cancel'); lab.msg = cost === undefined ? 'Already the best money can buy.' : 'Not enough cash. Not yet.'; }
      lab.msgT = 2;
    }
    if (lab.msgT > 0) lab.msgT -= dt;
  },
  draw(r) {
    r.sky(['#14100c', '#241a12', '#3a2a1a']);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, 'THE LAB', cx, 14, { scale: 2, align: 'center', colors: ['#fff8e8', '#e8d0a0', '#b08850'] });
      E.font.text(g, 'A storage unit off Route 66. Spend it on the work.', cx, 34, '#c8b898', { align: 'center' });
      E.font.text(g, fmtMoney(STATE.cash), cx, 48, '#7aff9a', { align: 'center', scale: 2, shadow: '#000' });
      const cols = r.W >= 400 ? 5 : 3, cw = Math.min(84, Math.floor((r.W - 20) / cols) - 6), ch = 88, gap = 6;
      lab.rects = [];
      UPGRADES.forEach((u, i) => {
        const row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, UPGRADES.length - row * cols), x0 = Math.round(cx - (inRow * (cw + gap) - gap) / 2);
        const x = x0 + col * (cw + gap), y = 72 + row * (ch + gap), lv = STATE.upgrades[u.key], cost = u.cost[lv], sel = lab.i === i;
        lab.rects.push([x, y, cw, ch]);
        E.ui.box(g, x, y, cw, ch, { bg: sel ? ['#2a4a5a', '#16262e'] : ['#2a2018', '#16100c'], border: sel ? '#59c8f0' : '#5a4a38' });
        for (const [j, w] of wrapText(u.name.toUpperCase(), 14).entries()) E.font.text(g, w, x + cw / 2, y + 6 + j * 9, '#ffffff', { align: 'center' });
        for (const [j, w] of wrapText(u.what, 16).entries()) E.font.text(g, w, x + cw / 2, y + 30 + j * 8, '#c8b898', { align: 'center', font: 'tiny' });
        for (let k = 0; k < 3; k++) px.rect(g, x + cw / 2 - 16 + k * 12, y + 60, 9, 5, k < lv ? '#59c8f0' : '#3a3028');
        E.font.text(g, cost === undefined ? 'MAXED' : fmtMoney(cost), x + cw / 2, y + 72, cost === undefined ? '#59c8f0' : STATE.cash >= cost ? '#7aff9a' : '#a87868', { align: 'center' });
      });
      const rows = Math.ceil(UPGRADES.length / cols), by = 72 + rows * (ch + gap) + 4, bw = 150, bx = Math.round(cx - bw / 2), sel = lab.i === UPGRADES.length;
      lab.rects.push([bx, by, bw, 20]);
      E.ui.box(g, bx, by, bw, 20, { bg: sel ? ['#3a6a3a', '#1a3a1a'] : ['#2a2018', '#16100c'], border: sel ? '#7aff9a' : '#5a4a38' });
      E.font.text(g, 'NEXT: ' + (CHAPTERS[lab.next] ? 'CHAPTER ' + (lab.next + 1) : 'THE END'), cx, by + 6, '#ffffff', { align: 'center' });
      if (lab.msgT > 0) E.font.text(g, lab.msg, cx, by + 28, '#ffe0a0', { align: 'center' });
      promptPill(g, game.input.lastDevice === 'mouse' ? 'Left click' : label('confirm'), lab.i === UPGRADES.length ? 'Go' : 'Buy', cx, r.H - 16);
    });
  }
};

/* ================================ GAME OVER ================================ */
let over = null, overMenu = null;
const overScene = {
  enter(d) { over = d; music(null); A.sfx('die'); overMenu = new E.Menu(game, ['RETRY FROM CHECKPOINT', 'RESTART CHAPTER', 'TITLE'], { y: 140, onPick: i => { if (i === 0) game.go('play', { ch: d.ch, beat: d.beat }); else if (i === 1) game.go('play', { ch: d.ch, beat: 0 }); else game.go('title'); } }); },
  update(dt) { overMenu.update(dt); },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#120404', '#2a0a0a', '#4a1414']);
    overMenu.y = Math.round(r.H * .6);
    const lines = { busted: ['BUSTED', 'Marty is going to be insufferable about this.'], caught: ['CAUGHT', '"Mr. Gray? What are you doing in the storeroom at midnight?"'], down: ['DOWN', 'The chemistry was perfect. The plan was not.'] }[over.reason] || ['GAME OVER', ''];
    r.overlay(g => { E.font.title(g, lines[0], r.W / 2, Math.round(r.H * .25), { scale: 4, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' }); E.font.text(g, lines[1], r.W / 2, Math.round(r.H * .25) + 40, '#e8c8c0', { align: 'center' }); });
    overMenu.draw(r);
  }
};

/* ================================ ENDING ================================ */
let endT = 0;
const endingScene = {
  enter() { endT = 0; music('title'); STATE.cleared.ep1 = true; if (!HUB) game.saves.autosave(); },
  update(dt) { endT += dt; if (endT > 2 && (game.input.pressed('confirm') || game.input.pressed('start'))) game.go('about'); },
  draw(r) {
    r.sky(['#05080c', '#0c1820', '#16303a']);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, 'END OF EPISODE ONE', cx, 40, { scale: 2, align: 'center', colors: ['#ffffff', '#cfefff', '#59c8f0'] });
      const lines = ['Leland Gray went into the desert a chemistry teacher.', 'He came back with ' + fmtMoney(STATE.total) + ', a partner, a lawyer,', 'a hat, and a name he did not choose.', '', 'NEXT TIME, IN EPISODE TWO: "MISE EN PLACE"', 'A chicken restaurant. A man who never raises his voice.', 'And a lab with real ventilation.'];
      lines.forEach((l, i) => E.font.text(g, l, cx, 80 + i * 13, i === 4 ? '#e8c040' : '#e8e4dc', { align: 'center' }));
      if (endT > 2) promptPill(g, label('confirm'), 'Credits', cx, r.H - 22);
    });
  }
};

/* ================================ ABOUT / CREDITS ================================ */
let aboutY = 0;
const aboutScene = {
  enter() { aboutY = 0; music('title'); },
  update(dt) {
    const I = game.input, m = I.move();
    aboutY = Math.max(0, aboutY + (m[1] * 160 + 10) * dt);
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('start')) game.go('title');
  },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#0c0a08', '#14100c']);
    r.overlay(g => {
      const lines = ABOUT_TEXT, lh = 10, total = lines.length * lh + 60;
      let y = Math.round(24 - (aboutY % total));
      for (const l of lines) {
        if (y > -12 && y < r.H + 4) {
          const head = l.startsWith('# '), t = head ? l.slice(2) : l;
          if (head) E.font.text(g, t, r.W / 2, y, '#59c8f0', { align: 'center', shadow: '#000' });
          else for (const w of [t]) E.font.text(g, w, 16, y, '#e8e4dc', { font: undefined });
        }
        y += lh;
      }
      px.blend(g, .8, 'normal', () => px.rect(g, 0, r.H - 16, r.W, 16, '#000'));
      E.font.text(g, (isPad() ? 'L stick' : label('up') + label('down')) + ' scroll   •   ' + label('cancel') + ' back', r.W / 2, r.H - 12, '#b8a888', { align: 'center' });
    });
  }
};
