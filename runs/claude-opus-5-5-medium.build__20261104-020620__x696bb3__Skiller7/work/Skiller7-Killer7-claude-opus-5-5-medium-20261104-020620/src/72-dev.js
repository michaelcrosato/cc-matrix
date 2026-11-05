/* SKILLER7 — dev mode (§7.22), from the pause menu: live tuning sliders with a reset, cheats, warps, info. Pages switch
 * with L1/R1 (Q/E); △/Backspace resets the focused value; □/Delete resets the page; ○/Esc closes. Saved in localStorage. */
const DEVKEY = 's7:dev';
S7.saveDev = () => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(DEVKEY, JSON.stringify({ T, CHEATS })); } catch (e) { /* storage refused: the values last for the visit */ } };
S7.loadDev = () => { try { if (typeof localStorage === 'undefined') return; const d = JSON.parse(localStorage.getItem(DEVKEY) || 'null'); if (!d) return; for (const k in d.T || {}) if (TUNING[k]) T[k] = clamp(+d.T[k], TUNING[k].min, TUNING[k].max); for (const k in d.CHEATS || {}) if (k in CHEATS) CHEATS[k] = !!d.CHEATS[k]; } catch (e) { /* a damaged record: the defaults stand */ } };
const CHEAT_NAMES = { god: 'God mode', infRed: 'Infinite Red', oneHit: 'One-hit kills', revealAll: 'Reveal all', ghost: 'Ghost through gates', allPersonas: 'All personas', showRails: 'Show rails and nodes', showVolumes: 'Show hit volumes and warm spots', showShots: 'Show camera shots', freeCam: 'Free camera', hideHud: 'Hide HUD', slowCrit: 'Slow motion on crits', showFps: 'Show FPS and sim hash' };
SCREENS.dev = () => {
  const pages = ['TUNING', 'CHEATS', 'WARP', 'INFO'], st = { p: 0, confirm: false };
  const resetAll = () => { S7.tuneReset(); for (const k in CHEATS) CHEATS[k] = false; S7.saveDev(); S7.splash('ALL DEFAULTS', 1); };
  const resetBtn = { label: 'RESET ALL TO DEFAULTS', onPick: resetAll };
  const tun = () => [resetBtn].concat(Object.keys(TUNING).map(k => ({ key: k, label: TUNING[k].label, slider: { get: () => T[k], set: v => S7.tune(k, v), min: TUNING[k].min, max: TUNING[k].max, step: TUNING[k].step, fmt: v => String(+v.toFixed(2)) + (v === TUNING[k].def ? '' : '*') } })));
  const che = () => [resetBtn].concat(Object.keys(CHEATS).map(k => ({ key: k, label: CHEAT_NAMES[k], value: () => CHEATS[k] ? 'ON' : 'OFF', onPick: () => { CHEATS[k] = !CHEATS[k]; S7.saveDev(); }, onLeft: () => { CHEATS[k] = !CHEATS[k]; S7.saveDev(); }, onRight: () => { CHEATS[k] = !CHEATS[k]; S7.saveDev(); } })));
  const warp = () => {
    const A = Object.keys(S7.AREAS), w = st.warp || (st.warp = { a: Math.max(0, A.indexOf(G.area)), n: 0 }), area = S7.AREAS[A[w.a]], nodes = Object.keys(area.nodes);
    w.n = clamp(w.n, 0, nodes.length - 1);
    return [resetBtn,
      { label: 'AREA', value: () => A[w.a] + ' ' + area.title, onLeft: () => { w.a = (w.a + A.length - 1) % A.length; w.n = 0; st.list = null; }, onRight: () => { w.a = (w.a + 1) % A.length; w.n = 0; st.list = null; } },
      { label: 'NODE', value: () => nodes[w.n] + (area.nodes[nodes[w.n]].label ? ' ' + area.nodes[nodes[w.n]].label : ''), onLeft: () => { w.n = (w.n + nodes.length - 1) % nodes.length; }, onRight: () => { w.n = (w.n + 1) % nodes.length; } },
      { label: 'WARP THERE', onPick: () => { UI.closeAll(); S7.enterArea(A[w.a], nodes[w.n], { noAutosave: true }); } },
      { label: 'START A BOSS', value: () => ['grau 00C', 'band 01B', 'hansi 01F (1)', 'hansi slalom (2)', 'hansi interview (3)'][st.boss || 0], onLeft: () => { st.boss = ((st.boss || 0) + 4) % 5; }, onRight: () => { st.boss = ((st.boss || 0) + 1) % 5; },
        onPick: () => { UI.closeAll(); const b = st.boss || 0; if (b === 0) { S7.enterArea('00C', 'n1', { noAutosave: true, silent: true }); S7.startBoss('grau'); } else if (b === 1) { S7.enterArea('01B', 'br', { noAutosave: true, silent: true }); S7.startBoss('band'); } else if (b === 2) { S7.enterArea('01F', 'a3', { noAutosave: true, silent: true }); S7.startBoss('hansi', 1); } else if (b === 3) { S7.enterArea('01F', 'sl0', { noAutosave: true, silent: true }); setFlag('avalaughDown'); S7.startBoss('hansi', 2); } else { S7.enterArea('01F', 'sl1', { noAutosave: true, silent: true }); setFlag('avalaughDown'); S7.startBoss('hansi', 3); } } },
      { label: 'PLAY A BEAT', value: () => Object.keys(S7.BEATS)[st.beat || 0], onLeft: () => { st.beat = ((st.beat || 0) + Object.keys(S7.BEATS).length - 1) % Object.keys(S7.BEATS).length; }, onRight: () => { st.beat = ((st.beat || 0) + 1) % Object.keys(S7.BEATS).length; }, onPick: () => { UI.closeAll(); S7.runBeat(Object.keys(S7.BEATS)[st.beat || 0]); } },
      { label: 'GIVE: 3 EDELWEISS, KEY, EMBER, PINS', onPick: () => { G.items.edelweiss = 3; G.items.servicekey = 1; G.items.ember = 1; for (let i = 1; i <= 7; i++) giveItem('pin' + i); S7.splash('GIVEN', 1); } },
      { label: '+100 RED', onPick: () => addRed(100) }, { label: '+20 RIME', onPick: () => { G.rime += 20; } },
      { label: 'REVIVE ALL', onPick: () => { for (const id of ORDER) { const r = G.roster[id]; r.frozen = false; r.statue = null; r.hp = r.max; } } },
      { label: 'KILL ALL', onPick: () => S7.killAll() },
      { label: 'TRIGGER A WAVE', value: () => Object.keys(W.area.waves || {})[st.wave || 0] || '(none here)', onLeft: () => { st.wave = Math.max(0, (st.wave || 0) - 1); }, onRight: () => { st.wave = Math.min(Object.keys(W.area.waves || {}).length - 1, (st.wave || 0) + 1); }, onPick: () => { const k = Object.keys(W.area.waves || {})[st.wave || 0]; if (k) { delete G.waves[G.area + ':' + k]; UI.closeAll(); S7.startWave(k); } } },
      { label: 'FREEZE THE ACTIVE PERSONA', onPick: () => { UI.closeAll(); S7.freezeActive(); } }];
  };
  let L = new List(tun());
  const setPage = p => { st.p = (p + pages.length) % pages.length; L = new List(st.p === 0 ? tun() : st.p === 1 ? che() : st.p === 2 ? warp() : []); S7.sfx('tick'); };
  return {
    update() {
      const pc = UI.pc;
      if (st.confirm) { if (In.ok()) { if (st.p === 0) S7.tuneReset(); else if (st.p === 1) for (const k in CHEATS) CHEATS[k] = false; S7.saveDev(); st.confirm = false; } else if (pc('Escape') || pc('Pad1')) st.confirm = false; return; }
      if (pc('Pad4') || pc('KeyQ')) setPage(st.p - 1);
      if (pc('Pad5') || pc('KeyE')) setPage(st.p + 1);
      const c = In.click(); if (c && UI.devTabs) UI.devTabs.forEach((rc, k) => { if (inRect(c, rc)) setPage(k); });
      if (st.p === 2) { const keep = L.i; L.items = warp(); L.i = keep; }
      L.update();
      const it = L.items[L.i];
      if ((pc('Pad3') || pc('Backspace')) && it) { if (it.key && TUNING[it.key]) S7.tuneReset(it.key); else if (it.key && it.key in CHEATS) CHEATS[it.key] = false; S7.saveDev(); S7.sfx('tick'); }
      if ((pc('Pad2') || pc('Delete')) && st.p < 2) st.confirm = true;
      if (pc('Escape') || pc('Pad1') || pc('Pad9')) UI.close();
    },
    draw(g, r) {
      const F = frame(g, r, 'DEV MODE', { tscale: 2 });
      UI.devTabs = []; let x = F.x + 10; pages.forEach((t, k) => { const w = tw(t) + 12; UI.devTabs.push([x, F.y + 32, w, 12]); if (k === st.p) px.rect(g, x, F.y + 32, w, 12, RED); txt(g, t, x + 6, F.y + 34, k === st.p ? INK : MUTED); x += w + 4; });
      if (st.p === 3) {
        const H = heroPos(), sh = S7.director.shotKey || '-', rows = ['AREA ' + G.area + '   EDGE ' + G.walker.edge + '   S ' + Math.round(G.walker.s) + '   NODE ' + G.walker.node, 'SHOT ' + sh + '   CUTS ' + S7.director.cuts, 'MODE ' + G.mode + '   AIM ' + G.aim.on + '   PERSONA ' + G.persona, 'ENEMIES ' + aliveEnemies().length + ' alive, ' + G.enemies.filter(e => e.alive && e.vis > .5).length + ' revealed', 'HERO ' + [H.x, H.y, H.z].map(v => (v / M).toFixed(1)).join(', ') + ' m', 'SIM HASH ' + S7.hash() + '   SEED ' + S7.seed, 'VERSION ' + S7.VERSION + '   BUILD ' + S7.BUILD, 'ENGINE ' + (E.versionLabel ? E.versionLabel() : E.version) + '   BACKEND ' + (S7.presenter && S7.presenter.backend ? S7.presenter.backend() : 'headless')];
        rows.forEach((l, i) => txt(g, l, F.x + 12, F.y + 52 + i * 13, INK));
      } else L.draw(g, F.x + 8, F.y + 50, F.w - 16, { scale: 1, rh: 12, rows: Math.floor((F.h - 76) / 12) });
      if (st.confirm) { box(g, r.W / 2 - 110, r.H / 2 - 24, 220, 48, { bg: ['#3a1418', '#1a0a0e'], border: RED }); txt(g, 'RESET THIS PAGE TO DEFAULTS?', r.W / 2 - tw('RESET THIS PAGE TO DEFAULTS?') / 2, r.H / 2 - 14, INK); UI.prompts(g, r, [['confirm', 'YES'], ['cancel', 'NO']], r.H / 2 + 4); }
      UI.prompts(g, r, [['ring', 'PAGE'], ['interact', 'RESET VALUE'], ['heal', 'RESET PAGE'], ['cancel', 'CLOSE']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};
