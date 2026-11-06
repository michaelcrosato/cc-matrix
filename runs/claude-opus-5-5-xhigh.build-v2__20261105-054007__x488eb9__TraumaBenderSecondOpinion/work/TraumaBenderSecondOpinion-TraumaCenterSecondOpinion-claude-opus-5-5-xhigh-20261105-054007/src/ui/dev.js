// Dev mode (section 14): from the pause menu, docked on the left third, with the game running behind it so changes show live.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph, T = G.TUNING;
const STORE = 'tb:devtuning';
const CHEATS = [['lock', 'Lock vitals'], ['freeze', 'Freeze clock'], ['steady', 'Infinite Steady'], ['oneHit', 'One-hit strains'], ['reveal', 'Reveal hidden'], ['radii', 'Show hit radii'], ['auto', 'Autosurgeon'], ['slow', 'Slow motion']];
const SPEEDS = [1, .5, .25, 2];
const Dev = G.Dev = {
  panelOpen: false, tab: 0, row: 0, page: 0, flags: {}, used: false, caseI: 0, phaseI: 0, spawnI: 0, nodeI: 0, speed: 0, hp: null, drag: false, log: [], copied: 0,
  auto: false,
  install(game) {
    const saved = E.store.get(STORE, null); if (saved) for (const k in saved) if (k in T) T[k] = saved[k];
    game.hook('input', dt => { if (Dev.panelOpen && !game.paused) Dev.input(game, dt); });
  },
  open() { const game = G.game; Dev.panelOpen = true; Dev.tab = 0; Dev.row = 0; game.resume(); game.input.consumeAll(); G.Screen.cursor(game, true); },
  close() { Dev.panelOpen = false; const game = G.game; const sc = game.scene; if (sc === G.scenes.op) G.Screen.cursor(game, false); },
  /** what the sim reads, or null */
  simFlags() { const f = Dev.flags, any = f.lock || f.freeze || f.steady || f.oneHit || f.reveal || f.radii; if (!any) { Dev._s = null; return null; } const key = JSON.stringify(f); if (Dev._k !== key) { Dev._k = key; Dev._s = { lock: !!f.lock, freeze: !!f.freeze, steady: !!f.steady, oneHit: !!f.oneHit, reveal: !!f.reveal, radii: !!f.radii }; } return Dev._s; },
  changed() { return Dev.used || G.tuningChanged(); },
  saveTuning() { const out = {}, D = G.TUNING_DEFAULTS; for (const k in D) if (T[k] !== D[k]) out[k] = T[k]; E.store.set(STORE, out); },
  setT(k, v) { T[k] = v; Dev.used = true; Dev.saveTuning(); },
  resetPage(p) { for (const r of p.rows) T[r[0]] = G.TUNING_DEFAULTS[r[0]]; Dev.saveTuning(); },
  resetAll() { for (const k in G.TUNING_DEFAULTS) T[k] = G.TUNING_DEFAULTS[k]; Dev.saveTuning(); },
  tabs: ['Tuning', 'Cheats', 'Jump', 'Info'],
  rows() {
    const out = [];
    if (Dev.tab === 0) { const p = G.TUNING_PAGES[Dev.page]; for (const r of p.rows) out.push({ kind: 'slider', key: r[0], label: r[1], min: r[2], max: r[3], step: r[4] }); out.push({ kind: 'act', label: 'Reset ' + p.name, fn: () => { Dev.resetPage(p); G.Sfx.menuOk(); } }); out.push({ kind: 'act', label: 'Reset everything', fn: () => { Dev.resetAll(); G.Sfx.menuOk(); } }); }
    else if (Dev.tab === 1) { for (const c of CHEATS) out.push({ kind: 'toggle', key: c[0], label: c[0] === 'slow' ? 'Time x' + SPEEDS[Dev.speed] : c[1] }); }
    else if (Dev.tab === 2) {
      const cases = G.CASE_ORDER, id = cases[Dev.caseI % cases.length], def = G.CASES[id];
      out.push({ kind: 'pick', label: 'Case: ' + def.title, step: d => { Dev.caseI = (Dev.caseI + d + cases.length) % cases.length; Dev.phaseI = 0; } });
      out.push({ kind: 'pick', label: 'Phase ' + (Dev.phaseI + 1) + ': ' + def.phases[Math.min(Dev.phaseI, def.phases.length - 1)].id, step: d => { Dev.phaseI = (Dev.phaseI + d + def.phases.length) % def.phases.length; } });
      out.push({ kind: 'act', label: 'Go there', fn: () => { Dev.used = true; Dev.close(); G.Flow.origin = 'files'; G.game.go('op', { caseId: id, phase: Dev.phaseI, difficulty: G.game.settings.difficulty }); } });
      const sc = G.game.scene, S = sc && sc.S;
      if (S && sc === G.scenes.op) {
        out.push({ kind: 'act', label: 'Force win', fn: () => { Dev.used = true; S.status = 'closing'; G.Op.beginClose(S); } }); out.push({ kind: 'act', label: 'Force lost', fn: () => { Dev.used = true; G.Op.lose(S, 'vitals'); } }); out.push({ kind: 'act', label: 'Code Blue', fn: () => { Dev.used = true; S.flags.forceCode = true; S.code.used = false; S.vitals = 0; } });
        const SP = G.DEV_SPAWN, spec = SP[Dev.spawnI % SP.length]; out.push({ kind: 'pick', label: 'Spawn ' + spec.type, step: d => { Dev.spawnI = (Dev.spawnI + d + SP.length) % SP.length; }, fn: () => { Dev.used = true; const h = S.hands[0]; G.Op.spawn(S, Object.assign({}, JSON.parse(JSON.stringify(spec)), { x: h.x, y: h.y, req: false })); } });
      } 
      if (Dev.jumpPage) { out.length = 0; const nodes = Object.keys(G.STORY_NODES); out.push({ kind: 'pick', label: 'Story: ' + nodes[Dev.nodeI % nodes.length], step: d => { Dev.nodeI = (Dev.nodeI + d + nodes.length) % nodes.length; }, fn: () => { Dev.used = true; Dev.close(); G.game.go('story', { node: nodes[Dev.nodeI % nodes.length], onDone: () => G.game.go('title') }); } }); out.push({ kind: 'act', label: 'Unlock all', fn: () => { E.store.set('tb:unlockAll', true); } }); out.push({ kind: 'act', label: 'Clear save', fn: () => { E.store.set('tb:ranks', {}); E.store.set('tb:seen', {}); E.store.set('tb:unlockAll', false); E.store.set('tb:ending', false); for (const s of [0, 1, 2, 'auto']) G.game.saves.erase(s); } }); out.push({ kind: 'act', label: 'Back', fn: () => { Dev.jumpPage = 0; Dev.row = 0; } }); }
      else { out.push({ kind: 'act', label: 'Story, unlocks, save', fn: () => { Dev.jumpPage = 1; Dev.row = 0; } }); if (out.length > 8) out.length = 8; }
    } else {
      const sc = G.game.scene, S = sc && sc.S; out.push({ kind: 'info', label: 'Scene: ' + G.game.sceneName });
      if (S) { out.push({ kind: 'info', label: 'Phase ' + (S.ph + 1) + ' of ' + G.Op.def(S).phases.length + ', ' + S.status }); out.push({ kind: 'info', label: 'Objects ' + S.objs.length + ', marks ' + S.marks.length }); out.push({ kind: 'info', label: 'Seed ' + S.seed }); out.push({ kind: 'info', label: 'Hash ' + G.U.hash(Object.assign({}, S, { ev: [] })) }); out.push({ kind: 'info', label: 'Last: ' + (Dev.log.slice(-2).join(' ') || '-') }); }
      out.push({ kind: 'act', label: Dev.copied > 0 ? 'Copied' : 'Copy tuning', fn: () => { const D = G.TUNING_DEFAULTS, ch = {}; for (const k in D) if (T[k] !== D[k]) ch[k] = T[k]; const s = JSON.stringify(ch); console.log('TUNING', s); try { navigator.clipboard && navigator.clipboard.writeText(s); } catch (e) { /* the console has it */ } Dev.copied = 2; } });
    }
    return out;
  },
  rect: game => { const w = Math.max(150, game.W / 3 | 0); return { x: 0, y: 0, w, h: game.H }; },
  input(game, dt) {
    const I = game.input; Dev.copied = Math.max(0, Dev.copied - dt);
    if (I.pressed('toolPrev')) { Dev.tab = (Dev.tab + 3) % 4; Dev.row = 0; G.Sfx.menuMove(); } if (I.pressed('toolNext')) { Dev.tab = (Dev.tab + 1) % 4; Dev.row = 0; G.Sfx.menuMove(); }
    if (I.pressed('dropIt')) { Dev.close(); I.consumeAll(); return; }
    const rows = Dev.rows(); Dev.row = Math.min(Dev.row, rows.length - 1);
    if (I.repeat('up')) { Dev.row = (Dev.row + rows.length - 1) % rows.length; G.Sfx.menuMove(); } if (I.repeat('down')) { Dev.row = (Dev.row + 1) % rows.length; G.Sfx.menuMove(); }
    const r = rows[Dev.row], L = I.down('left'), Rt = I.down('right');
    if (Dev.tab === 0 && (I.pressed('left') && r.kind !== 'slider' || I.pressed('right') && r.kind !== 'slider')) { Dev.page = (Dev.page + (I.pressed('right') ? 1 : G.TUNING_PAGES.length - 1)) % G.TUNING_PAGES.length; Dev.row = 0; G.Sfx.menuMove(); return; }
    if (r.kind === 'slider') { if (L || Rt) { Dev.hold = (Dev.hold || 0) + dt; if (I.pressed('left') || I.pressed('right') || Dev.hold > .35) { const k = Dev.hold > 1 ? 4 : 1, v = E.clamp(T[r.key] + (Rt ? 1 : -1) * r.step * k, r.min, r.max); Dev.setT(r.key, +v.toFixed(3)); } } else Dev.hold = 0; }
    if (r.kind === 'pick') { if (I.pressed('left')) r.step(-1); if (I.pressed('right')) r.step(1); }
    if (I.pressed('confirm')) Dev.activate(game, r);
    // the mouse: hover moves the focus, drag moves a slider; the field keeps the mouse outside the panel
    const p = I.pointer(), R = Dev.rect(game);
    if (p && p[0] < R.w) {
      I.suppressCode && I.suppressCode('Mouse0');
      const moved = !Dev.hp || p[0] !== Dev.hp[0] || p[1] !== Dev.hp[1]; Dev.hp = p;
      const rowI = Math.floor((p[1] - 30) / 22); if (moved && rowI >= 0 && rowI < rows.length) Dev.row = rowI;
      const c = I.clicked();
      if (c && c[0] < R.w) { if (c[1] < 16) { Dev.tab = Math.floor(c[0] / (R.w / 4)); Dev.row = 0; } else if (rows[rowI] && rows[rowI].kind !== 'slider') Dev.activate(game, rows[rowI]); }
      if (I.held.has('Mouse0') && rows[Dev.row] && rows[Dev.row].kind === 'slider') { const q = rows[Dev.row], f = E.clamp((p[0] - 6) / (R.w - 12), 0, 1); Dev.setT(q.key, +(q.min + (q.max - q.min) * f).toFixed(3)); }
    }
  },
  activate(game, r) {
    if (r.kind === 'toggle') { if (r.key === 'slow') { Dev.speed = (Dev.speed + 1) % SPEEDS.length; game.timeScale = SPEEDS[Dev.speed]; Dev.flags.slow = SPEEDS[Dev.speed] !== 1; } else if (r.key === 'auto') { Dev.flags.auto = !Dev.flags.auto; Dev.setAuto(game, Dev.flags.auto); } else Dev.flags[r.key] = !Dev.flags[r.key]; Dev.used = true; G.Sfx.menuOk(); }
    else if (r.fn) { r.fn(); G.Sfx.menuOk(); }
  },
  setAuto(game, on) { Dev.auto = on; const sc = game.scene; if (sc === G.scenes.op && sc.locals) { const L = sc.locals[0]; L.bot = on ? G.Bot.create(sc.S, 0, {}) : null; if (on) { L.bot.c.x = L.c.x; L.bot.c.y = L.c.y; L.bot.c.tool = L.c.tool; } } },
  draw(g, r) {
    if (!Dev.panelOpen) return; const game = G.game, R = Dev.rect(game), I = game.input;
    px.blend(g, .9, 'normal', () => px.rect(g, 0, 0, R.w, r.H, '#04141a')); px.rect(g, R.w - 1, 0, 1, r.H, '#5ff0e0');
    const tw = R.w / 4; Dev.tabs.forEach((t, i) => { if (i === Dev.tab) px.rect(g, i * tw, 0, tw, 13, '#0f3a3c'); Pix.text(g, t, i * tw + tw / 2, 3, i === Dev.tab ? '#ffd36a' : '#8fb8b0', { align: 'center' }); });
    if (Dev.tab === 0) { Pix.text(g, '◄ ' + G.TUNING_PAGES[Dev.page].name + ' ►', R.w / 2, 17, '#ffffff', { align: 'center' }); }
    const rows = Dev.rows();
    rows.forEach((q, i) => {
      const y = 30 + i * 22, on = i === Dev.row; if (on) px.rect(g, 2, y - 2, R.w - 5, 21, '#0f3a3c');
      if (q.kind === 'slider') { const v = T[q.key], d = G.TUNING_DEFAULTS[q.key], f = (v - q.min) / (q.max - q.min), fd = (d - q.min) / (q.max - q.min); Pix.text(g, q.label, 6, y, on ? '#ffffff' : '#c8e0dc'); Pix.text(g, String(+v.toFixed(2)), R.w - 7, y, v === d ? '#8fb8b0' : '#ffd36a', { align: 'right' }); px.rect(g, 6, y + 11, R.w - 12, 5, '#123034'); px.rect(g, 6, y + 11, Math.round((R.w - 12) * f), 5, on ? '#5ff0e0' : '#2c8a86'); px.rect(g, 6 + Math.round((R.w - 12) * fd), y + 9, 1, 9, '#ffffff'); }
      else if (q.kind === 'toggle') { const set = Dev.flags[q.key]; px.rect(g, 6, y + 2, 10, 10, set ? '#5ff0e0' : '#123034'); if (set) Pix.text(g, '✓', 7, y + 3, '#04141a'); Pix.text(g, q.label, 22, y + 3, on ? '#ffffff' : '#c8e0dc'); }
      else if (q.kind === 'act') Pix.text(g, '▸ ' + q.label, 6, y + 3, on ? '#ffd36a' : '#c8e0dc');
      else if (q.kind === 'pick') Pix.text(g, (on ? '◄ ' : '') + q.label.slice(0, 22) + (on ? ' ►' : ''), 6, y + 3, on ? '#ffd36a' : '#c8e0dc');
      else Pix.text(g, q.label.slice(0, 26), 6, y + 3, '#c8e0dc');
    });
    let x = 5, y = r.H - 13; x += Glyph.action(g, I, 'toolPrev', x, y) + 1; x += Glyph.action(g, I, 'toolNext', x, y) + 2; Pix.text(g, 'Tab', x, y + 1, '#8fb8b0'); x += 20; x += Glyph.action(g, I, 'dropIt', x, y) + 2; Pix.text(g, 'Close', x, y + 1, '#8fb8b0');
  },
};
G.DEV_SPAWN = [{ type: 'shard', variant: 'glass', ang: -1.2, depth: 16 }, { type: 'bleeder' }, { type: 'arteryTear', ang: .3 }, { type: 'pool', vol: 80 }, { type: 'polyp' }, { type: 'wound', ang: 0, n: 3, len: 24 }, { type: 'laceration', r: 9, ang: 0 }, { type: 'patch', r: 16 }, { type: 'clot', ang: -1 }, { type: 'staccato', beads: 3 }, { type: 'bead' }, { type: 'nest', hidden: false }, { type: 'legato', route: G.U.ring(213, 116, 110, 56, 28), segs: 8, hidden: false }, { type: 'tremolo', vessel: [[150, 60], [230, 170]] }, { type: 'dacapo', speed: 1 }, { type: 'eye', need: 3 }, { type: 'dome', r: 34, t: 5 }, { type: 'voicebox', hidden: false }, { type: 'repeatSign', t: 3 }];
})();
