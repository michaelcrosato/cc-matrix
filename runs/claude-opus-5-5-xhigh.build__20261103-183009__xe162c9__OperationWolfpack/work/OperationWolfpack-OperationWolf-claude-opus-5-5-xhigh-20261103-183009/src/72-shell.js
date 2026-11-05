// The E.Shell theme and 10-foot CSS, the game's settings (group "Game"), pause items and help (10.1, 10.4), and the
// save store (high scores through E.Arcade, tips seen, operations cleared).
(() => {
const E = My3D2dge, WP = globalThis.WP;
WP.THEME = { ink: '#f2ead3', paper: 'rgba(18,22,14,.94)', accent: '#e0b040', muted: '#a8a890', danger: '#e05a3a', line: 'rgba(224,176,64,.35)', font: "'Trebuchet MS', 'Segoe UI', sans-serif", titleFont: "Impact, 'Arial Black', sans-serif" };
WP.CSS = `
.esh{font-size:20px}.esh h2{font-size:34px;letter-spacing:.04em;text-transform:uppercase}.esh .esh-k{font-size:15px;letter-spacing:.12em}
.esh button{font-size:18px;padding:14px 18px;min-height:52px}.esh input[type=range]{width:260px}.esh .esh-row{min-height:54px;font-size:19px}
.esh .esh-mod{max-width:min(860px,94vw)}.esh button:focus-visible,.esh button:focus{outline:3px solid #e0b040;outline-offset:2px}
.esh .esh-row:focus-within{background:rgba(224,176,64,.12)}`;
WP.settings = key => { const g = WP.ctx && WP.ctx.game; return g && g.settings ? g.settings[key] : undefined; };
WP.GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'VETERAN', options: [['RECRUIT', 'Recruit'], ['VETERAN', 'Veteran'], ['ARCADE', 'Arcade']], help: 'Enemy accuracy, damage, telegraphs, drops. Arcade: running dry ends you, as in the original.' },
  { key: 'assist', label: 'Aim assist', type: 'select', value: 'Medium', options: [['Off', 'Off'], ['Low', 'Low'], ['Medium', 'Medium'], ['High', 'High']], help: 'Pads and keys only: the crosshair slows over enemies and leans toward them.', apply: (g, v) => { WP.Input.settings.assist = WP.ASSISTS[v]; } },
  { key: 'crossSpeed', label: 'Crosshair speed', type: 'slider', value: 1, min: .5, max: 2, step: .05, apply: (g, v) => { WP.Input.settings.speed = v; } },
  { key: 'crossSize', label: 'Crosshair size', type: 'select', value: 1.25, options: [[.8, 'Small'], [1, 'Medium'], [1.25, 'Large']] },
  { key: 'symbols', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], help: 'The prompts for a controller: PlayStation or Xbox (A B X Y).', apply: (g, v) => { if (g.settings.glyphs !== v) g.settings.set('glyphs', v); } },
  { key: 'showGun', label: 'Show gun', type: 'toggle', value: true },
  { key: 'markers', label: 'Friendly markers', type: 'toggle', value: true, help: 'A green marker over civilians and hostages near your crosshair.', apply: (g, v) => { if (WP.ctx) WP.ctx.markers = v; } },
  { key: 'textSize', label: 'Text size', type: 'select', value: 'Normal', options: [['Normal', 'Normal'], ['Large', 'Large']], help: 'Large radio text.', apply: (g, v) => { if (WP.ctx) WP.ctx.bigText = v === 'Large'; } }
];
WP.HELP = () => {
  const g = WP.ctx.game, I = g.input, L = (a, d) => I.label(a, d);
  return {
    keys: [
      ['Mouse', 'Aim (the crosshair follows it)'], [L('fire', 'mouse') + ' / ' + L('fire', 'keyboard'), 'Fire (hold for full auto)'], [L('grenade', 'mouse') + ' / G', 'Throw a grenade at the crosshair'],
      [L('reload', 'keyboard'), 'Reload'], ['WASD / arrows', 'Aim with keys'], [L('snap', 'keyboard'), 'Snap to the most dangerous target'], ['Esc / P', 'Pause'],
      [L('fire', 'gamepad') + ' (' + 'R2' + ')', 'Fire, on a controller'], [L('grenade', 'gamepad'), 'Grenade'], [L('reload', 'gamepad'), 'Reload'], [L('snap', 'gamepad'), 'Snap to threat'], ['Left stick', 'Aim (right stick: fine aim)']
    ],
    sections: WP.TEXT.howto
  };
};
// ---------- the save store ----------
const S = WP.Store = {
  id: 'wolfpack', cab: null,
  mem: {},   // kept for the visit too, where storage is blocked
  get(k, d) { if (k in S.mem) return S.mem[k]; let v = d; try { v = E.store.get('wolfpack:' + k, d); } catch (e) { /* blocked */ } return v === null || v === undefined ? d : v; },
  set(k, v) { S.mem[k] = v; try { E.store.set('wolfpack:' + k, v); } catch (e) { /* blocked */ } },
  tips() { return Object.assign({}, S.get('tips', {})); },
  tipSeen(k) { const t = S.get('tips', {}); if (!t[k]) { t[k] = 1; S.set('tips', t); } },
  cleared(op) { const c = S.get('cleared', {}); c[op] = 1; S.set('cleared', c); },
  anyCleared() { return Object.keys(S.get('cleared', {})).length > 0; },
  hi() { const t = S.cab ? S.cab.table('campaign') : []; return t.length ? t[0].score : 50000; },
  reset() { S.set('tips', {}); S.set('cleared', {}); try { for (const m of ['campaign', 'op1', 'op2', 'op3', 'op4', 'op5', 'op6']) E.store.set('arcade:' + S.id + ':' + m, []); } catch (e) { /* blocked */ } }
};
})();
