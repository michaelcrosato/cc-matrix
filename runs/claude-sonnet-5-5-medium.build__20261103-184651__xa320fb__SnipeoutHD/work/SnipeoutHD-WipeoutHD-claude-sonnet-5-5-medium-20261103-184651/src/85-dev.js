(() => {
const E = My3D2dge, SN = globalThis.SN, px = SN.px;
const { clamp } = SN, U = SN.U, UI = SN.UI, T = UI.T;
// ---- dev mode: opened from the pause menu. Live balance sliders with reset, cheats, teleports and spawns ------------------
SN.Dev = {
  open(dir) {
    const race = dir.race, human = race.human || dir.focus; if (!human) return;
    const tabs = ['BALANCE', 'CHEATS', 'TOOLS'];
    const st = { tab: 0, run: false, menus: [] };
    const tog = (label, key) => ({ label, value: () => SN.CHEATS[key] ? 'ON' : 'OFF', adjust: () => { SN.CHEATS[key] = !SN.CHEATS[key]; } });
    const act = (label, fn) => ({ label, pick: fn });
    const balance = SN.TUNE_DEFS.map(d => ({ label: d.label, value: () => SN.Tune.T[d.k].toFixed(2) + d.unit, adjust: s => { SN.Tune.T[d.k] = +clamp(SN.Tune.T[d.k] + s * d.step, d.min, d.max).toFixed(3); } }));
    balance.push(act('RESET TO DEFAULTS', () => { SN.Tune.reset(); HUD_call('DEFAULTS RESTORED'); }));
    const HUD_call = t => SN.HUD.call(t, '#7aff7a', 1.2, 1);
    const cheats = [tog('God mode', 'god'), tog('Infinite ammo', 'infAmmo'), tog('Rivals frozen', 'noAI'), tog('Show debug text', 'hitboxes'), tog('Show HUD', 'showHud'),
      { label: 'Run sim while open', value: () => dir.devRun ? 'ON' : 'OFF', adjust: () => { dir.devRun = !dir.devRun; } },
      { label: 'Time scale', value: () => (dir.cfg.slow || 1).toFixed(2) + '×', adjust: s => { dir.cfg.slow = clamp(+((dir.cfg.slow || 1) + s * .25).toFixed(2), .25, 2); } }];
    const tools = [
      act('Full energy', () => { human.energy = 100; HUD_call('ENERGY 100'); }),
      ...['swarm', 'seeker', 'mine', 'cannon', 'rail', 'tremor', 'bulwark', 'auto', 'nitro', 'siphon'].map(w => act('Give ' + SN.WEAPONS[w].name, () => { human.weapon = w; HUD_call('GAVE ' + SN.WEAPONS[w].name); })),
      act('Boost now', () => { human.boostT = 3; human.v = Math.max(human.v, human.vmax * .8); }),
      act('Teleport +300 m', () => { human.dist += 300 * U; human.s = SN.mod(human.dist, race.track.L); human.u = 0; human.psi = 0; HUD_call('TELEPORT'); }),
      act('Teleport to last lap', () => { human.dist = (race.laps - 1) * race.track.L + 10 * U; human.s = SN.mod(human.dist, race.track.L); human.lap = race.laps; HUD_call('LAST LAP'); }),
      act('Re-centre on track', () => { human.u = 0; human.psi = 0; human.v = Math.max(human.v, 400); human.alive = true; human.energy = Math.max(human.energy, 50); }),
      act('Eliminate nearest rival', () => { const o = race.ships.filter(s => s !== human && s.alive).sort((a, b) => Math.abs(a.dist - human.dist) - Math.abs(b.dist - human.dist))[0]; if (o) SN.Physics.damage(o, 999, human, 'dev', race); }),
      act('Finish race', () => { human.dist = race.laps * race.track.L; race.finish(); }),
      act('Close', () => dir.overlay = null)];
    st.menus = [new UI.Menu(balance, { onCancel: () => { dir.overlay = null; } }), new UI.Menu(cheats, { onCancel: () => { dir.overlay = null; } }), new UI.Menu(tools, { onCancel: () => { dir.overlay = null; } })];
    dir.overlay = {
      update: dt => { const I = dir.game.input; if (I.pressed('camera')) { st.tab = (st.tab + 1) % 3; } if (I.pressed('shiftL')) st.tab = (st.tab + 2) % 3; if (I.pressed('shiftR')) st.tab = (st.tab + 1) % 3; st.menus[st.tab].update(dir.game, dt); },
      draw: r => r.overlay(g => {
        const W = r.W, H = r.H, w = Math.min(W - 20, 260), x = W / 2, y = 18;
        UI.panel(g, x - w / 2 - 6, y - 8, w + 12, H - 30, { edge: '#7aff7a' });
        T(g, 'DEV MODE', x, y, '#7aff7a', { align: 'center', scale: 2 });
        tabs.forEach((t, i) => { const tx = x - w / 2 + 10 + i * (w / 3); T(g, t, tx + 30, y + 24, i === st.tab ? '#ffffff' : '#6a6490', { align: 'center' }); if (i === st.tab) px(g, tx, y + 34, w / 3 - 4, 2, '#7aff7a'); });
        const m = st.menus[st.tab], rows = Math.floor((H - 100) / 14), lh = 14, from = clamp(m.i - Math.floor(rows / 2), 0, Math.max(0, m.items.length - rows));
        const view = new UI.Menu(m.items.slice(from, from + rows), {}); view.i = m.i - from; view.t = m.t; view.draw(r, g, x, y + 42, w - 10, { lh });
        m.rects = []; view.rects.forEach((rc, k) => { m.rects[from + k] = rc; });   // hover and clicks use the visible window
        SN.Glyph.left(g, [['confirm', 'DO'], ['camera', 'TAB'], ['cancel', 'CLOSE']], x - w / 2, H - 24);
      })
    };
  }
};
})();
