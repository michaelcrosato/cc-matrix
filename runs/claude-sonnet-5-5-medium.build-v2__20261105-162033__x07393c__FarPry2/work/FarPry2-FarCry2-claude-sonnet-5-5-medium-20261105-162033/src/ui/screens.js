// Every screen as data: items (max 6), custom draw, back behaviour. Opened by id through g.ui.open(id).
import { GAME_TITLE } from '../content/title.js';
import { WEAPONS, SLOTS, UPGRADES, THROWABLES, GUN_SHAPES } from '../content/weapons.js';
import { SETTING_DEFAULTS, saveSettings, applySettings } from '../core/settings.js';
import { hasSave, readSave } from '../core/save.js';
import { drawPrompt, drawGlyph, codeFor } from './glyphs.js';
import { linkSession } from '../net/link.js';
import { wrapText } from './ui.js';
import { ABOUT_PAGES } from '../content/about.js';
import { EPIGRAPHS } from '../content/notes.js';

const pct = (v) => Math.round(v * 100) + '%';
const centered = (hud, text, y, o = {}) => { const w = hud.measure(text, o.scale || 1).width; hud.text(Math.round((hud.width - w) / 2), y, text, o); };
export function setting(g, key, v) { g.settings[key] = v; saveSettings(g.settings); applySettings(g); }
const slider = (g, key, min = 0, max = 1, step = 0.05, fmt) => ({ get: () => g.settings[key], set: (v) => setting(g, key, v), min, max, step, fmt });
const choice = (g, key, options) => ({ get: () => g.settings[key], set: (v) => setting(g, key, v), options });

export function buildScreens(g) {
  const S = {};
  S.title = () => ({
    id: 'title', noItems: !g.touchOnly, dim: false, noBack: true, hints: [], top: 190, rowH: 22, panelW: 200,
    items: () => (g.touchOnly ? [{ label: 'Settings', run: (g, ui) => ui.open('settings') }] : []),
    draw: (g, hud, ui, { W, H }) => {
      const t = GAME_TITLE.toUpperCase(); const sc = hud.measure(t, 4).width < W - 40 ? 4 : 3;
      const tw = hud.measure(t, sc).width;
      hud.text(Math.round((W - tw) / 2) + 2, 62 + 2, t, { scale: sc, color: 'ink', shadow: false }); hud.text(Math.round((W - tw) / 2), 62, t, { scale: sc, color: 'orange', shadow: 'red' });
      centered(hud, 'AN ORIGINAL WAR-ZONE SURVIVAL SHOOTER', 62 + sc * 8 + 8, { color: 'sand' });
      if (g.notice) { centered(hud, g.notice.toUpperCase(), 150, { scale: 2, color: 'red' }); }
      else if (Math.floor(ui.frameN / 30) % 2 === 0) { const w2 = hud.measure('PRESS', 1).width + 15 + 4; const y = 170; hud.text(Math.round((W - w2) / 2), y + 2, 'PRESS', { color: 'white' }); drawGlyph(hud, Math.round((W - w2) / 2) + hud.measure('PRESS').width + 4, y, codeFor('confirm', g.device) || 'Enter', g.glyphSet); }
    },
    customInput: (g, ui) => {
      const input = g.ctx.input;
      if (g.touchOnly) { if (input.anyDown(['Enter', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'PadCross']) || g.ctx.input.gamepadConnected) { g.touchOnly = false; g.notice = ''; ui.stack.pop(); ui.open('title'); return true; } return false; }
      if (input.wasPressed('Enter', 'Space', 'PadCross', 'PadOptions') || input.buttonEvents.some((e) => e.down)) { ui.stack.pop(); ui.open('main'); return true; }
      return true;
    },
  });
  S.main = () => ({
    id: 'main', dim: false, noBack: true, top: 98, panelW: 250, rowH: 20,
    draw: (g, hud, ui, { W }) => { const t = GAME_TITLE.toUpperCase(); const tw = hud.measure(t, 3).width; hud.text(Math.round((W - tw) / 2), 34, t, { scale: 3, color: 'orange', shadow: 'red' }); },
    items: () => [
      ...(hasSave() ? [{ label: 'Continue', run: (g) => g.flow.continueGame() }] : []),
      { label: 'New Game', run: (g) => g.flow.newGame() },
      { label: 'Cash Run', run: (g, ui) => ui.open('cashrun') },
      { label: 'Settings', run: (g, ui) => ui.open('settings') },
      { label: 'About and Credits', run: (g, ui) => ui.open('about') },
    ],
  });
  S.cashrun = () => ({
    id: 'cashrun', title: 'CASH RUN', dim: true, top: 90, rowH: 20,
    draw: (g, hud, ui, { W }) => { centered(hud, 'CASH RUN', 40, { scale: 3, color: 'orange' }); centered(hud, 'SIX MINUTES. SIX CASES. ONE TRUCK.', 66, { color: 'sand' }); centered(hud, 'FRIENDS ONLINE PLAY THROUGH AI HUB.', hud.height - 44, { color: 'mist' }); },
    items: () => [
      { label: 'Solo with Hired Guns', run: (g) => g.flow.startRound('solo') },
      { label: 'Host on This Computer', run: (g) => g.flow.startRound('host') },
      { label: 'Join on This Computer', run: (g) => g.flow.startRound('join') },
    ],
  });
  S.pause = () => ({
    id: 'pause', pause: true, hud: false, top: 78, rowH: 20, dim: true, noBack: false, hints: [['confirm', 'SELECT'], ['pause', 'RESUME']],
    onBack: () => true,
    customInput: (g, ui) => { if (g.ctx.input.wasPressed('Escape') || g.ctx.input.wasPressed('PadOptions')) { ui.back(); return true; } return false; },
    draw: (g, hud) => { centered(hud, 'PAUSED', 38, { scale: 3, color: 'orange' }); },
    items: () => (g.session ? [{ label: 'Resume', run: (g, ui) => ui.back() }, { label: 'Settings', run: (g, ui) => ui.open('settings') }]
      : [{ label: 'Resume', run: (g, ui) => ui.back() }, { label: 'Ledger', run: (g, ui) => ui.open('ledger') }, { label: 'Settings', run: (g, ui) => ui.open('settings') },
        { label: 'Dev Mode', run: (g, ui) => ui.open('dev') }, { label: 'About and Credits', run: (g, ui) => ui.open('about') }, { label: 'Quit to Title', run: (g) => g.flow.toTitle() }]),
  });
  S.settings = () => ({
    id: 'settings', top: 80, rowH: 20, draw: (g, hud) => centered(hud, 'SETTINGS', 36, { scale: 3, color: 'orange' }), pause: g.mode === 'play',
    items: () => [
      { label: 'Sound', run: (g, ui) => ui.open('set-sound') }, { label: 'Controls', run: (g, ui) => ui.open('set-controls') }, { label: 'Picture', run: (g, ui) => ui.open('set-picture') },
      { label: 'Comfort', run: (g, ui) => ui.open('set-comfort') }, { label: 'Reset to Defaults', run: (g) => { Object.assign(g.settings, SETTING_DEFAULTS); saveSettings(g.settings); applySettings(g); g.say('SETTINGS RESET.', 'player', 1.5); } },
    ],
  });
  const sub = (id, title, items) => () => ({ id, top: 80, rowH: 20, pause: g.mode === 'play', draw: (g, hud) => centered(hud, title, 36, { scale: 3, color: 'orange' }), items: () => items(g) });
  S['set-sound'] = sub('set-sound', 'SOUND', (g) => [
    { label: 'Music', slider: slider(g, 'music', 0, 1, 0.05) }, { label: 'Effects', slider: slider(g, 'sfx', 0, 1, 0.05) }, { label: 'Voices', slider: slider(g, 'voice', 0, 1, 0.05) }, { label: 'Master', slider: slider(g, 'master', 0, 1, 0.05) },
  ]);
  S['set-controls'] = sub('set-controls', 'CONTROLS', (g) => [
    { label: 'Look Pad', slider: slider(g, 'sensPad', 0.3, 2.5, 0.1, (v) => v.toFixed(1)) }, { label: 'Look Mouse', slider: slider(g, 'sensMouse', 0.3, 2.5, 0.1, (v) => v.toFixed(1)) },
    { label: 'Invert Y', choice: choice(g, 'invertY', [false, true]), value: () => (g.settings.invertY ? 'ON' : 'OFF') }, { label: 'Aim Assist', choice: choice(g, 'aimAssist', [true, false]), value: () => (g.settings.aimAssist ? 'ON' : 'OFF') },
    { label: 'Rumble', choice: choice(g, 'rumble', [true, false]), value: () => (g.settings.rumble ? 'ON' : 'OFF') }, { label: 'Glyphs', choice: choice(g, 'glyphs', ['ps', 'xbox']), value: () => (g.settings.glyphs === 'ps' ? 'PLAYSTATION' : 'XBOX') },
  ]);
  S['set-picture'] = sub('set-picture', 'PICTURE', (g) => [
    { label: 'Fullscreen', choice: choice(g, 'fullscreen', [false, true]), value: () => (g.settings.fullscreen ? 'ON' : 'OFF') }, { label: 'Pixel Size', choice: choice(g, 'pixel', ['fine', 'chunky']), value: () => g.settings.pixel.toUpperCase() },
    { label: 'Quality', choice: choice(g, 'quality', ['auto', 'low', 'medium', 'high']), value: () => g.settings.quality.toUpperCase() }, { label: 'Field of View', slider: slider(g, 'fov', 50, 90, 2, (v) => String(Math.round(v))) },
  ]);
  S['set-comfort'] = sub('set-comfort', 'COMFORT', (g) => [
    { label: 'Subtitle Size', choice: choice(g, 'subSize', [1, 2]), value: () => (g.settings.subSize > 1.2 ? 'LARGE' : 'NORMAL') },
    { label: 'Reduce Flashes', choice: choice(g, 'reduceFlash', [false, true]), value: () => (g.settings.reduceFlash ? 'ON' : 'OFF') }, { label: 'Fever Effects Reduced', choice: choice(g, 'reduceFever', [false, true]), value: () => (g.settings.reduceFever ? 'ON' : 'OFF') },
  ]);
  S.about = () => ({
    id: 'about', noItems: true, dim: true, page: 0, pause: g.mode === 'play', hints: [['tabPrev', 'PAGE'], ['tabNext', 'PAGE'], ['back', 'BACK']],
    tabs: (g, d, ui) => { const sc = ui.screen; sc.page = (sc.page + d + ABOUT_PAGES.length) % ABOUT_PAGES.length; g.sfx('ui_move'); },
    customInput: (g, ui) => { const sc = ui.screen, input = g.ctx.input; if (input.wasPressed('ArrowRight') || input.wasPressed('PadRight') || input.wasPressed('KeyD')) sc.tabs(g, 1, ui); if (input.wasPressed('ArrowLeft') || input.wasPressed('PadLeft') || input.wasPressed('KeyA')) sc.tabs(g, -1, ui); return false; },
    wheel: (g, d, ui) => ui.screen.tabs(g, d, ui),
    draw: (g, hud, ui, { W, H }) => {
      const sc = ui.screen, pg = ABOUT_PAGES[sc.page]; centered(hud, pg.title.toUpperCase(), 22, { scale: 2, color: 'orange' });
      let y = 48; const maxW = W - 80;
      for (const [k, v] of pg.rows) { const line = k ? `${k}: ${v}` : v; for (const l of wrapText(hud, line.toUpperCase(), maxW)) { if (y > H - 40) break; hud.text(40, y, l, { color: k && l.startsWith(k.toUpperCase()) ? 'sand' : 'white' }); y += 9; } y += 2; }
      centered(hud, `PAGE ${sc.page + 1} OF ${ABOUT_PAGES.length}`, H - 36, { color: 'mist' });
    },
  });
  S.ledger = () => ({
    id: 'ledger', noItems: true, dim: true, pause: g.mode === 'play', hints: [['back', 'BACK']],
    draw: (g, hud, ui, { W, H }) => {
      const L = g.ledgerLines(); centered(hud, 'THE LEDGER', 34, { scale: 3, color: 'orange' });
      L.forEach((l, i) => { const y = 78 + i * 28; hud.text(60, y, String(l[0]), { scale: 3, color: 'sand' }); hud.text(130, y + 4, l[1].toUpperCase(), { scale: 2, color: 'white' }); });
      centered(hud, 'WRITTEN AS HARROW WOULD WRITE IT.', H - 40, { color: 'mist' });
    },
  });
  S.bed = (g, site) => ({
    id: 'bed', top: 80, rowH: 20, pause: false, dim: true, draw: (g, hud) => { centered(hud, 'SLEEP', 36, { scale: 3, color: 'orange' }); centered(hud, 'CHOOSE THE HOUR. IT SAVES.', 62, { color: 'sand' }); },
    items: () => [['Dawn', 6], ['Noon', 12], ['Dusk', 18], ['Midnight', 0]].map(([n, h]) => ({ label: n, value: String(h).padStart(2, '0') + ':00', run: (g, ui) => { ui.closeAll(); g.flow.sleepUntil(h, site); } })).concat([{ label: 'Leave', run: (g, ui) => ui.back() }]),
  });
  S.locker = () => ({
    id: 'locker', top: 70, rowH: 20, dim: true, draw: (g, hud) => { centered(hud, 'LOCKER', 34, { scale: 3, color: 'orange' }); centered(hud, 'CLEAN GUNS FROM TIBOR, FREE FOR EVER.', 58, { color: 'sand' }); },
    items: () => SLOTS.filter((s) => s !== 'melee').map((slot) => ({
      label: slot, value: () => { const id = g.weapons.slotGun[slot]; return id ? WEAPONS[id].name : 'EMPTY'; },
      run: (g) => g.flow.cycleLocker(slot, 1), left: (g) => g.flow.cycleLocker(slot, -1), right: (g) => g.flow.cycleLocker(slot, 1), choice: { get: () => 0, set: () => {}, options: [0] },
    })),
  });
  S.rack = () => {
    const list = () => Object.values(WEAPONS).filter((w) => w.price > 0 && w.slot !== 'mounted' && w.slot !== 'melee');
    const sc = { id: 'rack', dim: true, idx: 0, noItems: false, top: 196, rowH: 18, panelW: 220,
      items: () => { const w = list()[sc.idx], st = g.story, own = st.unlocked.includes(w.id); return [{ label: own ? 'Take (free, clean)' : `Buy for ${w.price} stones`, disabled: !own && st.stones < w.price, run: (g) => g.flow.rackBuy(w) }]; },
      tabs: (g, d) => { sc.idx = (sc.idx + d + list().length) % list().length; g.sfx('ui_move'); },
      customInput: (g, ui) => { const i = g.ctx.input; if (i.wasPressed('ArrowLeft') || i.wasPressed('PadLeft') || i.wasPressed('KeyA')) sc.tabs(g, -1); if (i.wasPressed('ArrowRight') || i.wasPressed('PadRight') || i.wasPressed('KeyD')) sc.tabs(g, 1); return false; },
      wheel: (g, d) => sc.tabs(g, d),
      draw: (g, hud, ui, { W, H }) => {
        const w = list()[sc.idx], st = g.story; centered(hud, 'TIBOR', 22, { scale: 2, color: 'orange' }); centered(hud, 'EVERYTHING HERE HAS BEEN RETURNED AT LEAST ONCE.', 40, { color: 'sand' });
        centered(hud, w.name.toUpperCase(), 62, { scale: 2, color: 'white' });
        // the gun, large: its first-person model turned to the side on the table
        hud.rect(W / 2 - 90, 86, 180, 50, 0x1c2238); hud.rect(W / 2 - 90, 136, 180, 3, 'plum'); for (const [x, y, sw, sh, c] of GUN_SHAPES[w.id] || []) hud.rect(Math.round(W / 2 - 80 + x * 2), 94 + y * 2, sw * 2, sh * 2, c);
        const bars = [['DAMAGE', w.stats?.[0] ?? 5], ['RANGE', w.stats?.[1] ?? 5], ['RELIABILITY', w.stats?.[2] ?? 5]];
        bars.forEach(([n, v], i) => { const y = 146 + i * 12; hud.text(W / 2 - 90, y, n, { color: 'sand' }); for (let k = 0; k < 10; k++) hud.rect(W / 2 - 20 + k * 11, y, 9, 6, k < v ? 'orange' : 'night'); });
        hud.text(W - 100, 24, `STONES ${st.stones}`, { color: 'sand', scale: 1 });
        hud.text(W / 2 - 100, 100, '<', { scale: 2, color: 'sand' }); hud.text(W / 2 + 92, 100, '>', { scale: 2, color: 'sand' });
        const own = st.unlocked.includes(w.id); if (own) hud.text(W / 2 - 90, 140 - 12 * 0, '', {});
      },
      hints: [['confirm', 'BUY OR TAKE'], ['left', 'PREVIOUS'], ['right', 'NEXT'], ['back', 'BACK']],
      onClick: (g, x, y) => { if (x < g.ctx.hud.width / 2 - 60) sc.tabs(g, -1); else if (x > g.ctx.hud.width / 2 + 60) sc.tabs(g, 1); },
    };
    return sc;
  };
  S.upgrades = () => ({
    id: 'upgrades', top: 70, rowH: 20, dim: true, panelW: 300, draw: (g, hud) => { centered(hud, 'TIBOR: SMALL THINGS', 34, { scale: 2, color: 'orange' }); hud.text(24, 24, `STONES ${g.story.stones}`, { color: 'sand' }); },
    items: () => Object.values(UPGRADES).map((u) => ({ label: u.name, value: () => (g.story.upgrades[u.id] ? 'OWNED' : u.price + ' STONES'), disabled: g.story.upgrades[u.id] || g.story.stones < u.price, run: (g) => g.flow.buyUpgrade(u) }))
      .concat([{ label: 'Bottles x3', value: '3 STONES', disabled: g.story.stones < 3, run: (g) => g.flow.buyThrowable('molotov', 3) }, { label: 'Remote charge', value: '3 STONES', disabled: g.story.stones < 3, run: (g) => g.flow.buyThrowable('charge', 3) }]).slice(0, 6),
  });
  S.board = () => ({
    id: 'board', top: 80, rowH: 20, dim: true, panelW: 320, draw: (g, hud) => { centered(hud, 'NOTICE BOARD', 34, { scale: 3, color: 'orange' }); },
    items: () => { const l = g.missions.available().slice(0, 6).map((m) => ({ label: m.title, value: `${m.pay} STONES`, run: (g, ui) => { ui.closeAll(); g.missions.accept(m.id, true); } })); return l.length ? l : [{ label: 'Nothing posted', disabled: true }]; },
  });
  S.halts = (g, from) => ({
    id: 'halts', top: 80, rowH: 20, dim: true, panelW: 300, draw: (g, hud) => { centered(hud, 'THE RAILWAY', 34, { scale: 3, color: 'orange' }); centered(hud, 'ONE STONE. ONE GAME HOUR. OLD BAKR TALKS.', 60, { color: 'sand' }); },
    items: () => { const l = g.story.halts.filter((h) => h !== from.id).map((id) => ({ label: g.haltName(id), value: '1 STONE', disabled: g.story.stones < 1, run: (g, ui) => { ui.closeAll(); g.flow.rideTo(id); } })); return l.length ? l : [{ label: 'No other halts seen', disabled: true }]; },
  });
  S.gameover = () => ({
    id: 'gameover', dim: true, top: 140, rowH: 20, noBack: true,
    draw: (g, hud, ui, { W, H }) => { hud.rect(0, 0, W, H, 'ink'); centered(hud, 'YOU DIED IN THE SORREL.', 56, { scale: 3, color: 'red' }); centered(hud, 'THE PAPERWORK WILL TAKE LONGER.', 90, { scale: 2, color: 'sand' }); },
    items: () => [...(hasSave() ? [{ label: 'Continue', run: (g) => g.flow.continueGame() }] : [{ label: 'Try Again', run: (g) => g.flow.newGame() }]), { label: 'Title', run: (g) => g.flow.toTitle() }],
  });
  S.ending = (g, which) => ({
    id: 'ending', noItems: false, dim: true, top: 214, rowH: 18, noBack: true, hints: [['confirm', 'CONTINUE']],
    draw: (g, hud, ui, { W, H }) => { hud.rect(0, 0, W, H, 'ink'); centered(hud, which === 'walk' ? 'WALKED OUT' : 'WALKED ON ASH', 30, { scale: 3, color: 'orange' }); const text = g.endingText(which); let y = 66; for (const l of wrapText(hud, text.toUpperCase(), W - 100, 2)) { centered(hud, l, y, { scale: 2, color: 'white' }); y += 17; } },
    items: () => [{ label: 'The Ledger', run: (g, ui) => { ui.replace('ledger'); ui.screen.noBack = false; ui.screen.onBack = () => { g.ui.open('credits'); return false; }; } }],
  });
  S.credits = () => ({
    id: 'credits', noItems: false, dim: true, top: 230, rowH: 18, noBack: true,
    draw: (g, hud, ui, { W, H }) => { hud.rect(0, 0, W, H, 'ink'); const rows = ABOUT_PAGES[ABOUT_PAGES.length - 1].rows; centered(hud, 'CREDITS', 24, { scale: 3, color: 'orange' }); let y = 60; for (const [k, v] of rows) for (const l of wrapText(hud, (k ? k + ': ' : '') + v.toUpperCase(), W - 100)) { centered(hud, l, y, { color: 'white' }); y += 10; } },
    items: () => [{ label: 'Free Roam', run: (g) => g.flow.afterEnding() }, { label: 'Title', run: (g) => g.flow.toTitle() }],
  });
  S.epigraph = (g, text) => ({ id: 'epigraph', noItems: true, cover: true, noBack: true, hints: [], draw: (g, hud, ui, { W, H }) => { hud.rect(0, 0, W, H, 'ink'); let y = H / 2 - 30; for (const l of wrapText(hud, text.toUpperCase(), W - 120, 1)) { centered(hud, l, y, { color: 'sand' }); y += 11; } centered(hud, 'FROM HARROW\'S FIELD NOTES', y + 8, { color: 'mist' }); } });
  S.choice = (g, spec) => ({ id: 'choice', top: spec.top ?? 150, rowH: 20, dim: false, noBack: true, hud: true, pause: false, panelW: 260, items: () => spec.options.map((o) => ({ label: o.label, run: (g, ui) => { ui.back(); o.run(g); } })), draw: (g, hud, ui, { W }) => { if (spec.title) centered(hud, spec.title.toUpperCase(), 120, { scale: 2, color: 'orange' }); } });
  S.roundend = (g, res) => ({
    id: 'roundend', dim: true, top: 212, rowH: 18, noBack: true, hints: [['confirm', 'SELECT']],
    draw: (g, hud, ui, { W, H }) => {
      hud.rect(0, 0, W, H, 'ink'); centered(hud, 'CASH RUN: THE COUNT', 20, { scale: 2, color: 'orange' });
      const flat = res.standings.flatMap((a, place) => a.map((id) => [place + 1, id])); flat.forEach(([place, id], i) => { const p = g.round.players.find((q) => q.id === id); const y = 54 + i * 24; hud.rect(60, y, 10, 14, parseInt(p.color.slice(1), 16)); hud.text(80, y + 2, `${place}. ${p.name}`, { scale: 2, color: place === 1 ? 'sand' : 'white' }); hud.text(210, y + 2, `${p.stones} STONES`, { scale: 2, color: 'orange' }); hud.text(330, y + 5, `DOWNS ${p.downs} REVIVES ${p.revives} KILLS ${p.kills}`, { color: 'mist' }); });
      res.awards.forEach((a, i) => hud.text(60, 156 + i * 11, `${a.title.toUpperCase()}: ${g.round.players.find((q) => q.id === a.id).name} (${a.detail})`, { color: 'lime' }));
    },
    items: () => [{ label: 'Again', run: (g) => { g.flow.endRound(); g.ui.closeAll(); g.flow.startRound(); } }, { label: 'Title', run: (g) => g.flow.endRound() }],
  });
  S.lobby = (g, kind) => ({
    id: 'lobby', dim: true, top: 170, rowH: 20, hints: [['confirm', 'SELECT'], ['back', 'BACK']], onBack: () => { g.flow.lobby?.close(); g.flow.lobby = null; return true; },
    draw: (g, hud) => { centered(hud, kind === 'host' ? 'HOSTING CASH RUN' : 'JOINING CASH RUN', 40, { scale: 3, color: 'orange' }); const L = g.flow.lobby; centered(hud, kind === 'host' ? (L?.joined ? 'A FRIEND HAS JOINED.' : 'OPEN THE GAME IN ANOTHER WINDOW AND CHOOSE JOIN.') : (L?.joined ? 'FOUND A HOST. WAITING FOR THE START.' : 'LOOKING FOR A HOST IN ANOTHER WINDOW...'), 90, { color: 'sand' }); },
    items: () => (kind === 'host' ? [{ label: 'Start the round', disabled: !g.flow.lobby?.joined, run: (g) => { const L = g.flow.lobby; const m = L.go(); if (m) { g.flow.lobby = null; g.ui.closeAll(); g.flow.beginRound(linkSession(g, L)); } } }] : []),
  });
  S.touch = () => ({ id: 'touch', noItems: true });
  return S;
}
