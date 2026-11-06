// All screens. Each is one job, reachable by pad and by mouse. drawScreen() picks what to draw for the game's mode and overlay.
import { TITLE } from '../data/meta.js';
import { CLASSES, SKILLS } from '../data/classes.js';
import { ZONES, CAMPAIGN } from '../data/zones.js';
import { NPCS, NARRATION, ENDING, QUESTS, LORE_BOOKS, HOWTO } from '../data/quests.js';
import { DIFFS, fmt } from '../sim/stats.js';
import { SPEAKERS } from '../audio/audio.js';
import { TUNING_DEFS } from '../data/tuning.js';
import { icon } from './hud.js';
import { drawHeroScreen, drawStash } from './screens_hero.js';
import { drawVendor, drawSmith, drawReliquary, drawWrits, drawKnellSetup, drawKnellResults } from './screens_town.js';
import { drawDev } from './screens_dev.js';
import { drawAbout } from './screens_about.js';

const NAMES = ['Ash', 'Briar', 'Cobb', 'Dusk', 'Ember', 'Fenn', 'Gall', 'Hollis', 'Ivy', 'Jory', 'Kestrel', 'Lark', 'Moss', 'Nettle', 'Orrin', 'Pell', 'Quill', 'Rue', 'Sorrel', 'Tam', 'Ursa', 'Vesper', 'Wren', 'Yarrow'];
export const stepOf = (v, d) => d;

export function menu(game, ui, x, y, w, items, o = {}) {
  const gap = o.gap ?? 4; const h = o.h ?? 16; let focusedItem = null;
  items.forEach((it, i) => {
    const yy = y + i * (h + gap);
    const z = ui.button((o.prefix || 'm') + i, x, yy, w, h, it.label, { disabled: it.disabled, scale: o.scale || 1, color: it.color });
    if (z.focused && it.hint) focusedItem = it;
    if (z.clicked) { game.audio.sfx(it.disabled ? 'error' : 'ui_ok'); it.fn && it.fn(); }
  });
  return focusedItem;
}
const frameBg = (ui, alpha) => ui.hud.rect(0, 0, ui.hudW, ui.hudH, 'ink');
const header = (ui, text, y = 8) => { ui.center(y, text.toUpperCase(), { scale: 2, color: 'sand' }); };

export function drawScreen(game, nav, rdt) {
  const ui = game.ui; const o = game.overlay;
  ui.setVirtual(true);
  try { drawScreen2(game, nav, rdt, ui, o); } finally { ui.setVirtual(false); }
}
function drawScreen2(game, nav, rdt, ui, o) {
  if (o && o.type !== 'dialog') ui.drawnText.length = 0; // full screens cover the world HUD
  if (game.touchOnly && (game.mode === 'title' || game.mode === 'menu' || game.mode === 'attract')) { drawTouch(game, ui, nav); }
  if (o) { drawOverlay(game, ui, nav, o, rdt); return; }
  switch (game.mode) {
    case 'title': drawTitle(game, ui, nav); break;
    case 'menu': drawMenu(game, ui, nav); break;
    case 'create': drawCreate(game, ui, nav); break;
    case 'about': drawAbout(game, ui, nav); break;
    case 'settingsMenu': drawSettings(game, ui, nav, () => { game.mode = 'menu'; }); break;
    default: break;
  }
}
function drawOverlay(game, ui, nav, o, rdt) {
  o.t += rdt;
  switch (o.type) {
    case 'pause': drawPause(game, ui, nav); break;
    case 'hero': drawHeroScreen(game, ui, nav, o); break;
    case 'stash': drawStash(game, ui, nav, o); break;
    case 'map': drawMap(game, ui, nav, o); break;
    case 'dialog': drawDialog(game, ui, nav, o); break;
    case 'vendor': drawVendor(game, ui, nav, o); break;
    case 'smith': drawSmith(game, ui, nav, o); break;
    case 'reliquary': drawReliquary(game, ui, nav, o); break;
    case 'writs': drawWrits(game, ui, nav, o); break;
    case 'knellsetup': drawKnellSetup(game, ui, nav, o); break;
    case 'knellresults': drawKnellResults(game, ui, nav, o); break;
    case 'death': drawDeath(game, ui, nav, o); break;
    case 'narration': drawNarration(game, ui, nav, o, NARRATION, () => { game.closeOverlay(); game._narrDone && game._narrDone(); game._narrDone = null; }); break;
    case 'ending': drawNarration(game, ui, nav, o, ENDING, () => { game.closeAll(); game.finishCampaign && game.finishCampaign(); }, true); break;
    case 'settings': drawSettings(game, ui, nav, () => game.closeOverlay()); break;
    case 'dev': drawDev(game, ui, nav, o); break;
    case 'about': drawAbout(game, ui, nav, o, true); break;
    case 'howto': drawHowTo(game, ui, nav, o); break;
    case 'party': drawParty(game, ui, nav, o); break;
    case 'lore': drawLore(game, ui, nav, o); break;
    case 'confirm': drawConfirm(game, ui, nav, o); break;
    case 'card': if (game.net) game.net.drawCard(ui, nav); break;
    default: game.closeOverlay();
  }
}
function drawTitle(game, ui, nav) {
  const hud = ui.hud;
  hud.rect(0, 0, ui.hudW, 54, 'ink'); hud.rect(0, 54, ui.hudW, 2, 'plum');
  ui.center(10, TITLE.toUpperCase(), { scale: 3, color: 'sand' });
  ui.center(40, 'THE BELL IS CRACKED. THE DEAD ARE UP. SO ARE YOU.', { color: 'mist' });
  if (game.touchOnly) return;
  const blink = Math.floor(game.frame / 30) % 2 === 0;
  if (blink) ui.center(ui.hudH - 42, 'PRESS ANY BUTTON', { scale: 2, color: 'white' });
  if (!game.ctx.audio.unlocked) ui.center(ui.hudH - 22, 'PRESS A KEY OR CLICK FOR SOUND', { color: 'sky' });
  if (nav.any && game.frame > 10 && (nav.ok || nav.click || nav.start || nav.back || nav.up || nav.down || game.ctx.input.wasPressed('Space') || game.router.padStates.some((p) => p && Object.values(p.p).some(Boolean)) || game.ctx.input.wasPressed('KeyZ'))) { game.mode = 'menu'; game.ui.setFocus(null); game.audio.sfx('ui_ok'); }
}
function drawMenu(game, ui, nav) {
  const hud = ui.hud; const W = ui.hudW;
  ui.center(12, TITLE.toUpperCase(), { scale: 2, color: 'sand' });
  const has = game.save.data.slots.some(Boolean); const credits = game.save.data.slots.some((s) => s && s.camp && s.camp.done) || true;
  const unlocked = game.save.data.slots.some((s) => s && s.camp && (s.camp.done || s.lastBell));
  const x = Math.round((W - 150) / 2); let y = 50;
  const hint = menu(game, ui, x, y, 150, [
    { label: 'CONTINUE', disabled: !has, fn: () => { if (has) { game.mode = 'create'; game.createState = { step: 'slots', mode: 'continue' }; ui.setFocus(null); } else game.toast('NO HEROES YET'); } },
    { label: 'NEW HERO', fn: () => { game.mode = 'create'; game.createState = { step: 'slots', mode: 'new' }; ui.setFocus(null); } },
    { label: 'KNELL RUNS', disabled: !unlocked, fn: () => { if (unlocked) { game.mode = 'create'; game.createState = { step: 'slots', mode: 'knell' }; ui.setFocus(null); } else game.toast('UNLOCKED AFTER THE CREDITS, OR WITH THE LAST BELL'); } },
    { label: 'SETTINGS', fn: () => { game.mode = 'settingsMenu'; ui.setFocus(null); } },
    { label: 'ABOUT', fn: () => { game.mode = 'about'; ui.setFocus(null); game.aboutPage = 0; } },
  ], { h: 18, gap: 5 });
  if (nav.back) { game.mode = 'title'; }
  ui.prompts([['ok', 'SELECT'], ['back', 'TITLE']]);
  let ty = ui.hudH - 40; for (const t of game.toasts) { ui.center(ty, t.text, { color: 'sand' }); ty += 10; }
}
function drawCreate(game, ui, nav) {
  const cs = game.createState || (game.createState = { step: 'slots', mode: 'new' }); const hud = ui.hud; const W = ui.hudW, H = ui.hudH;
  if (cs.step === 'slots') {
    header(ui, cs.mode === 'new' ? 'NEW HERO' : cs.mode === 'knell' ? 'KNELL RUNS: PICK A HERO' : 'CONTINUE');
    for (let i = 0; i < 3; i++) {
      const s = game.save.slot(i); const x = Math.round(W / 2 - 160 + i * 110), y = 40, w = 100, h = 120;
      const z = ui.zone('slot' + i, x, y, w, h);
      hud.rect(x - 1, y - 1, w + 2, h + 2, z.focused ? 'sand' : 'slate'); hud.rect(x, y, w, h, 'night');
      if (s) {
        const c = CLASSES[s.hero.cls]; ui.text(x + 6, y + 8, s.hero.name.toUpperCase(), { color: 'white', scale: 1 }); ui.text(x + 6, y + 20, c.name.toUpperCase(), { color: c.color === 'ink' ? 'lime' : 'sky' }); ui.text(x + 6, y + 32, 'LEVEL ' + s.hero.level, { color: 'mist' });
        ui.text(x + 6, y + 44, (DIFFS.find((d) => d.id === s.diff) || DIFFS[0]).name.toUpperCase(), { color: 'sand' }); ui.text(x + 6, y + 56, s.camp && s.camp.done ? 'STORY DONE' : 'QUEST ' + ((s.camp ? s.camp.q : 0) + 1), { color: 'mist' });
        ui.text(x + 6, y + 68, (ZONES[s.zone] ? ZONES[s.zone].name : 'TOLLHAVEN').toUpperCase().slice(0, 15), { color: 'slate' });
        if (cs.confirmDelete === i) ui.text(x + 6, y + 90, 'HOLD X TO DELETE', { color: 'red' });
        if (z.focused && (nav.alt1 || game.ctx.input.isDown('KeyX') || game.router.padStates.some((p) => p && p.b.square))) { cs.hold = (cs.hold || 0) + 1 / 60; cs.confirmDelete = i; if (cs.hold > 1.2) { game.save.deleteSlot(i); cs.hold = 0; cs.confirmDelete = -1; } } else if (cs.confirmDelete === i) { cs.hold = 0; if (!z.focused) cs.confirmDelete = -1; }
      } else ui.text(x + 6, y + 50, 'EMPTY', { color: 'slate' });
      if (z.clicked) {
        game.audio.sfx('ui_ok');
        if (cs.mode === 'new') { if (s) game.toast('SLOT IN USE: HOLD X TO DELETE'); else { cs.slot = i; cs.step = 'class'; cs.cls = 0; cs.name = NAMES[game.frame % NAMES.length]; ui.setFocus(null); } }
        else if (s) { if (cs.mode === 'knell' && !(s.camp && (s.camp.done || s.lastBell))) game.toast('THIS HERO HAS NOT SEEN THE CREDITS'); else { game.continueGame(i).then(() => { if (cs.mode === 'knell') game.pushOverlay('knellsetup', {}); }); } }
      }
    }
    if (nav.back) { game.mode = 'menu'; ui.setFocus(null); }
    ui.prompts([['ok', 'SELECT'], ['alt1', 'HOLD TO DELETE'], ['back', 'BACK']]);
    return;
  }
  if (cs.step === 'class') {
    header(ui, 'CHOOSE YOUR TRADE');
    const ids = Object.keys(CLASSES);
    if (nav.left) cs.cls = (cs.cls + 2) % 3; if (nav.right) cs.cls = (cs.cls + 1) % 3;
    ids.forEach((id, i) => {
      const c = CLASSES[id]; const x = Math.round(W / 2 - 165 + i * 112), y = 40, w = 104, h = 150; const z = ui.zone('cls' + i, x, y, w, h);
      if (z.focused) cs.cls = i;
      hud.rect(x - 1, y - 1, w + 2, h + 2, cs.cls === i ? 'sand' : 'slate'); hud.rect(x, y, w, h, 'night');
      ui.center2 = null; ui.text(x + 6, y + 6, c.name.toUpperCase(), { color: 'white', scale: 1 });
      ui.para(x + 6, y + 18, c.fantasy.toUpperCase(), w - 12, { color: 'mist' });
      ui.text(x + 6, y + 70, c.resource.toUpperCase(), { color: 'sky' });
      c.sig.forEach((s, k) => ui.text(x + 6, y + 84 + k * 10, s.toUpperCase(), { color: 'sand' }));
      ui.text(x + 6, y + 124, 'LIFE ' + Math.round(c.life * 100) + '  SPD ' + c.speed.toFixed(1), { color: 'slate' });
      if (z.clicked) { cs.cls = i; cs.step = 'name'; ui.setFocus(null); game.audio.sfx('ui_ok'); }
    });
    ui.prompts([['ok', 'CHOOSE'], ['back', 'BACK']]); if (nav.back) { cs.step = 'slots'; ui.setFocus(null); }
    return;
  }
  if (cs.step === 'name') {
    header(ui, 'NAME AND DIFFICULTY');
    ui.center(44, (cs.name || '').toUpperCase(), { scale: 3, color: 'white' });
    cs.diff = cs.diff || 'pilgrim'; cs.start = cs.start || 'beginning';
    const x = Math.round((W - 190) / 2);
    menu(game, ui, x, 80, 190, [
      { label: 'SHUFFLE NAME', fn: () => { cs.name = NAMES[(NAMES.indexOf(cs.name) + 1 + Math.floor(game.frame % 5)) % NAMES.length]; } },
      { label: 'DIFFICULTY: ' + DIFFS.find((d) => d.id === cs.diff).name.toUpperCase(), fn: () => { const ds = ['pilgrim', 'zealot', 'martyr']; cs.diff = ds[(ds.indexOf(cs.diff) + 1) % 3]; } },
      { label: 'START: ' + (cs.start === 'beginning' ? 'THE BEGINNING' : 'THE LAST BELL'), fn: () => { cs.start = cs.start === 'beginning' ? 'lastbell' : 'beginning'; } },
      { label: 'BEGIN', fn: () => { const slot = cs.slot; const cls = Object.keys(CLASSES)[cs.cls]; game.startNewGame({ cls, name: cs.name, diff: cs.diff, lastBell: cs.start === 'lastbell', slot }); } },
    ], { h: 18, gap: 5 });
    ui.para(x, 180, cs.start === 'beginning' ? 'FROM THE COFFIN, WITH THE FULL STORY AND ALL FIVE QUESTS.' : 'LEVEL 30 WITH EVERY SKILL, THREE LEGENDARIES, SET PIECES, GEMS AND A GRAND KEY. THE TOWN IS OPEN AND KNELL RUNS ARE READY.', 190, { color: 'mist' });
    ui.prompts([['ok', 'SELECT'], ['back', 'BACK']]); if (nav.back) { cs.step = 'class'; ui.setFocus(null); }
  }
}
function drawPause(game, ui, nav) {
  const hud = ui.hud; const W = ui.hudW; const w = game.world;
  hud.rect(0, 0, W, ui.hudH, 'ink');
  header(ui, 'PAUSED');
  ui.center(28, (w.zoneDef ? w.zoneDef.name : '').toUpperCase(), { color: 'mist' });
  const items = w.session ? [{ label: 'RESUME', fn: () => game.closeOverlay() }, { label: 'SETTINGS', fn: () => game.pushOverlay('settings', {}) }, { label: 'HOW TO PLAY', fn: () => game.pushOverlay('howto', {}) }] : [
    { label: 'RESUME', fn: () => game.closeOverlay() },
    { label: 'HERO', fn: () => game.pushOverlay('hero', { tab: 0 }) },
    { label: 'MAP', fn: () => game.pushOverlay('map', {}) },
    { label: 'PARTY', fn: () => game.pushOverlay('party', {}) },
    { label: 'HOW TO PLAY', fn: () => game.pushOverlay('howto', {}) },
    { label: 'SETTINGS', fn: () => game.pushOverlay('settings', {}) },
    { label: 'DEV MODE', fn: () => game.pushOverlay('dev', {}) },
    { label: 'ABOUT', fn: () => { game.aboutPage = 0; game.pushOverlay('about', {}); } },
    { label: 'SAVE AND QUIT', fn: () => game.pushOverlay('confirm', { text: 'SAVE AND RETURN TO THE TITLE?', yes: () => { game.autosave(); game.closeAll(); game.teardownWorld(); } }) },
  ];
  menu(game, ui, Math.round((W - 140) / 2), 42, 140, items, { h: 15, gap: 3 });
  ui.prompts([['ok', 'SELECT'], ['back', 'RESUME']]);
  if ((nav.back || nav.start) && game.frame > game.overlay.born) game.closeOverlay();
}
function drawConfirm(game, ui, nav, o) {
  const hud = ui.hud; hud.rect(0, 0, ui.hudW, ui.hudH, 'ink'); ui.center(80, o.data.text, { color: 'white' });
  menu(game, ui, Math.round((ui.hudW - 100) / 2), 110, 100, [{ label: 'YES', fn: () => { game.closeOverlay(); o.data.yes(); } }, { label: 'NO', fn: () => game.closeOverlay() }], { h: 16, gap: 4 });
  if (nav.back) game.closeOverlay();
}
export function drawSettings(game, ui, nav, back) {
  const hud = ui.hud; const W = ui.hudW; const s = game.save.settings; const a = game.ctx.audio;
  hud.rect(0, 0, W, ui.hudH, 'ink'); header(ui, 'SETTINGS');
  const vol = (ch) => Math.round((a.volume[ch] ?? 0) * 100) + '%';
  const cyc = (v, list) => list[(list.indexOf(v) + 1) % list.length];
  const set = (k, v) => { game.save.setSettings({ [k]: v }); game.applySettings(); };
  const slide = (ch, label) => ({ label: `${label}: ${vol(ch)}`, fn: () => { const v = a.volume[ch] ?? 0; a.setVolume(ch, v >= 0.99 ? 0 : Math.min(1, Math.round((v + 0.1) * 10) / 10)); } });
  const items = [
    slide('master', 'MASTER'), slide('music', 'MUSIC'), slide('sfx', 'SOUND'),
    { label: `VOICES: ${Math.round((game.audio.voiceVol ?? 1) * 100)}%`, fn: () => { const v = game.audio.voiceVol ?? 1; set('voices', v >= 0.99 ? 0 : Math.round((v + 0.25) * 4) / 4); } },
    { label: 'BUTTON GLYPHS: ' + (s.glyphs === 'ps' ? 'PLAYSTATION' : 'XBOX'), fn: () => set('glyphs', s.glyphs === 'ps' ? 'xbox' : 'ps') },
    { label: 'SCREEN SHAKE: ' + (s.shake === 0 ? 'OFF' : s.shake < 1 ? 'LOW' : 'FULL'), fn: () => set('shake', s.shake === 1 ? 0.5 : s.shake === 0.5 ? 0 : 1) },
    { label: 'DAMAGE NUMBERS: ' + (s.numbers ? 'ON' : 'OFF'), fn: () => set('numbers', !s.numbers) },
    { label: 'ZOOM: ' + s.zoom.toFixed(1), fn: () => set('zoom', s.zoom >= 1.4 ? 0.6 : Math.round((s.zoom + 0.2) * 10) / 10) },
    { label: 'LOOK: ' + (s.look || 'none').toUpperCase(), fn: () => { const L = ['none', 'pixel_heroes', 'cel_heroes', 'noir', 'spooky']; const n = cyc(s.look || 'none', L); set('look', n); game.ctx.engine.setLook(game.ctx.engine.lookPresets[n] || game.ctx.engine.lookPresets.none); } },
    { label: 'FULLSCREEN: ' + (s.fullscreen ? 'ON' : 'OFF'), fn: () => { set('fullscreen', !s.fullscreen); try { const r = typeof document !== 'undefined' && (s.fullscreen ? document.exitFullscreen && document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen()); if (r && r.catch) r.catch(() => {}); } catch {} } },
    { label: 'RESET TO DEFAULTS', fn: () => { game.save.setSettings({ glyphs: 'ps', shake: 1, numbers: true, zoom: 1, look: 'none', voices: 1 }); a.resetVolumes(); game.applySettings(); game.ctx.engine.setLook(game.ctx.engine.lookPresets.none); game.toast('DEFAULTS RESTORED'); } },
    { label: 'BACK', fn: () => back() },
  ];
  menu(game, ui, Math.round((W - 190) / 2), 28, 190, items, { h: 13, gap: 2 });
  ui.prompts([['ok', 'CHANGE'], ['back', 'BACK']]);
  if (nav.back) back();
}
function drawParty(game, ui, nav, o) {
  const hud = ui.hud; hud.rect(0, 0, ui.hudW, ui.hudH, 'ink'); header(ui, 'PARTY');
  const w = game.world; const items = [];
  game.seats.forEach((s, i) => { const h = w.heroes.find((q) => q.seat === s.seat); items.push({ label: `SEAT ${i + 1}: ${h ? h.name.toUpperCase() + ' ' + CLASSES[h.cls].name.toUpperCase() : '-'} ${s.kind === 'pad' ? '(PAD)' : s.kind === 'bot' ? '(BOT)' : ''}`, fn: () => { if (s.seat > 0) { game.leaveSeat(s.seat); } else game.toast('SEAT 1 IS YOU'); } }); });
  if (game.seats.length < 4) {
    items.push({ label: 'ADD A BOT SEAT', fn: () => { const seat = game.seats.length; const cls = ['bellwarden', 'lamplighter', 'sexton'][seat % 3]; const lvl = Math.max(...w.heroes.map((q) => q.level)); const h = game.createGuest(cls, seat, lvl, true); game.seats.push({ seat, kind: 'bot' }); game.couch = true; game.toast('A BOT JOINS'); } });
    const pads = game.router.padStates.filter(Boolean).filter((p) => !game.seats.find((s) => s.pad === p.index));
    items.push({ label: pads.length ? 'JOIN WITH A SPARE PAD' : 'PRESS OPTIONS ON ANOTHER PAD', fn: () => { if (pads[0]) game.joinSeat(pads[0].index); else game.toast('NO SPARE PAD FOUND'); } });
  }
  items.push({ label: 'BACK', fn: () => game.closeOverlay() });
  menu(game, ui, Math.round((ui.hudW - 220) / 2), 38, 220, items, { h: 15, gap: 3 });
  ui.para(30, 200, 'A SECOND PLAYER ON THE SAME SCREEN JOINS AT YOUR LEVEL, WITH THEIR OWN CLASS AND LOOT. SELECT A SEAT TO MAKE THEM LEAVE.', ui.hudW - 60, { color: 'mist' });
  if (nav.back) game.closeOverlay();
}
function drawHowTo(game, ui, nav, o) {
  const hud = ui.hud; hud.rect(0, 0, ui.hudW, ui.hudH, 'ink'); const d = o.data; d.page = d.page || 0;
  if (nav.tabNext || nav.right) d.page = (d.page + 1) % HOWTO.length; if (nav.tabPrev || nav.left) d.page = (d.page + HOWTO.length - 1) % HOWTO.length;
  const p = HOWTO[d.page]; header(ui, 'HOW TO PLAY'); ui.center(30, `${d.page + 1} OF ${HOWTO.length}: ${p.title.toUpperCase()}`, { color: 'sand' });
  ui.para(40, 50, p.text, ui.hudW - 80, { color: 'white', lh: 10 });
  ui.zone('howto', 0, 0, 1, 1);
  ui.prompts([['tabPrev', 'PREV'], ['tabNext', 'NEXT'], ['back', 'BACK']]);
  if (nav.back) game.closeOverlay();
}
function drawLore(game, ui, nav, o) {
  const hud = ui.hud; hud.rect(0, 0, ui.hudW, ui.hudH, 'ink'); const b = LORE_BOOKS[o.data.lore % LORE_BOOKS.length]; const d = o.data; d.page = d.page || 0;
  if (!d.read) { d.read = true; if (game.world.acct) game.world.acct.codex.lore[o.data.lore] = true; game.say('crier', b.pages[0]); }
  header(ui, b.title); ui.para(40, 50, b.pages[d.page], ui.hudW - 80, { color: 'white' });
  ui.zone('lore', 0, 0, 1, 1); if (nav.ok || nav.right) { if (d.page + 1 < b.pages.length) d.page++; else game.closeOverlay(); } if (nav.back) game.closeOverlay();
  ui.prompts([['ok', d.page + 1 < b.pages.length ? 'NEXT' : 'CLOSE'], ['back', 'CLOSE']]);
}
function drawDeath(game, ui, nav, o) {
  const hud = ui.hud, w = game.world; const W = ui.hudW; hud.rect(0, 0, W, ui.hudH, 'ink');
  ui.center(40, 'YOU HAVE DIED. AGAIN. IT IS BECOMING A HABIT.', { color: 'red', scale: 1 });
  const items = [
    { label: 'RISE HERE', fn: () => { game.ctx.engine.timeScale = 1; game.closeOverlay(); for (const h of w.heroes) if (!h.alive) { h.respawnT = null; h.waitRevive = false; h.alive = false; } game.reviveAll('here'); } },
    { label: 'LAST LYCHGATE', fn: () => { game.ctx.engine.timeScale = 1; game.closeOverlay(); game.reviveAll('gate'); } },
    { label: 'RETURN TO TOWN', fn: () => { game.ctx.engine.timeScale = 1; game.closeOverlay(); game.reviveAll('town'); } },
  ];
  menu(game, ui, Math.round((W - 150) / 2), 70, 150, items, { h: 18, gap: 5 });
  const h = game.localHero(); const wait = h && h.respawnT != null ? Math.ceil(h.respawnT) : 0;
  ui.center(150, 'RISING HERE TAKES A BREATH. NO OTHER PENALTY.', { color: 'mist' });
}
function drawNarration(game, ui, nav, o, lines, done, ending) {
  // a cutscene: letterbox bars, the camera drifting over the place, the narrator's line and babble
  const hud = ui.hud; const d = o.data; const w = game.world; const H = ui.hudH, W = ui.hudW;
  const L = lines[d.i];
  d.age = (d.age || 0) + 1 / 60;
  const hero = game.localHero(); const hx = hero ? hero.x : w.zone.w / 2, hz = hero ? hero.z : w.zone.h / 2;
  game.cut = { x: hx + Math.sin(d.age * 0.25) * 5, z: hz - 4 + d.age * 0.5 }; game.cutZoom = 1.5 - Math.min(0.35, d.age * 0.03);
  game.ctx.engine.timeScale = ending ? 0.35 : 1;
  const bar = 40; ui.real.rect(0, 0, ui.real.width, ui.oy + bar, 'ink'); ui.real.rect(0, ui.real.height - ui.oy - bar - 4, ui.real.width, ui.oy + bar + 4, 'ink');
  if (L && d.said !== d.i) { d.said = d.i; const dur = game.audio.speak(L.text, L.who); d.dur = Math.max(3.4, dur + 1.4); d.t = 0; }
  d.t += 1 / 60;
  if (L) { ui.center(H - bar + 2, 'NARRATOR', { color: 'sand' }); const lns = ui.wrap(L.text.toUpperCase(), W - 60); lns.forEach((l, i) => ui.center(H - bar + 12 + i * 10, l, { color: 'white' })); }
  ui.zone('narr', 0, 0, 1, 1);
  const skip = nav.ok || nav.click || nav.back;
  if (d.t > d.dur || skip) { d.i++; d.t = 0; game.audio.stopVoice(); if (d.i >= lines.length) { game.cut = null; game.cutZoom = 1; game.ctx.engine.timeScale = 1; done(); } }
  ui.prompts([['ok', 'SKIP']], 6);
}
function drawDialog(game, ui, nav, o) {
  const hud = ui.hud, w = game.world; const d = o.data; const npc = NPCS[d.npc]; const W = ui.hudW, H = ui.hudH;
  const bar = 26; hud.rect(0, 0, W, bar, 'ink'); hud.rect(0, H - bar - 70, W, bar + 70, 'ink');
  if (!d.started) { d.started = true; d.lines = npc.lines.slice(); d.line = Math.floor(game.frame % npc.lines.length); const sp = SPEAKERS[npc.voice]; game.audio.speak(d.lines[d.line], npc.voice); game.cutX = d.spot.x; game.cut = { x: d.spot.x, z: d.spot.z }; game.cutZoom = 1.5; }
  const line = d.lines[d.line]; const sp = SPEAKERS[npc.voice];
  const y = H - 90; ui.text(24, y, sp.name, { color: sp.color });
  ui.para(24, y + 12, line.toUpperCase(), W - 48, { color: 'white' });
  const choices = [];
  const serv = { penny: ['BUY AND SELL', 'vendor'], brasse: ['SALVAGE, CRAFT, REFORGE', 'smith'], ogive: ['RELICS AND GEMS', 'reliquary'] }[d.npc];
  if (serv) choices.push({ label: serv[0], fn: () => { game.cut = null; game.cutZoom = 1; game.closeOverlay(); game.openVendor(d.npc); } });
  if (d.npc === 'crier') choices.push({ label: 'WHAT NOW?', fn: () => { const q = w.camp && w.camp.q < QUESTS.length ? QUESTS[w.camp.q] : null; d.line = (d.line + 1) % d.lines.length; game.audio.stopVoice(); game.audio.speak(q ? 'Hear ye. ' + q.name + '. ' + q.steps[w.camp.s].text + '.' : 'Hear ye. The Knell tolls for the bold. See the font.', 'crier'); d.lines[d.line] = q ? `${q.name}: ${q.steps[Math.min(w.camp.s, q.steps.length - 1)].text}.` : 'THE KNELL TOLLS FOR THE BOLD. SEE THE FONT.'; } });
  choices.push({ label: 'GOODBYE', fn: () => { game.cut = null; game.cutZoom = 1; game.audio.stopVoice(); game.closeOverlay(); } });
  menu(game, ui, W - 24 - 140, H - 70, 140, choices, { h: 14, gap: 3 });
  if (nav.back) { game.cut = null; game.cutZoom = 1; game.audio.stopVoice(); game.closeOverlay(); }
}
function drawMap(game, ui, nav, o) {
  const hud = ui.hud, w = game.world, z = w.zone, W = ui.hudW, H = ui.hudH; hud.rect(0, 0, W, H, 'ink');
  header(ui, w.zoneDef.name);
  const ex = game.explored; const sc = Math.max(1, Math.min(Math.floor((W - 160) / z.w), Math.floor((H - 50) / z.h)) || 1);
  const sx = 12, sy = 34; const cell = Math.max(1, Math.min(4, sc));
  const step = z.w * cell > W - 150 ? 2 : 1;
  for (let r = 0; r < z.h; r += step) for (let c = 0; c < z.w; c += step) { if (!ex || !ex[r * z.w + c]) continue; const v = z.cells[r * z.w + c]; hud.rect(sx + Math.floor(c / step) * cell, sy + Math.floor(r / step) * cell, cell, cell, v === 1 ? 'slate' : v === 0 ? 'night' : 'ink'); }
  for (const h of w.heroes) if (!h.gone) hud.rect(sx + Math.floor(h.x / step) * cell - 1, sy + Math.floor(h.z / step) * cell - 1, 3, 3, 'lime');
  for (const s of w.spots) if (!s.hidden && ex && ex[Math.floor(s.z) * z.w + Math.floor(s.x)]) hud.rect(sx + Math.floor(s.x / step) * cell - 1, sy + Math.floor(s.z / step) * cell - 1, 3, 3, s.kind === 'lychgate' ? 'sky' : s.kind === 'exit' ? 'lime' : s.kind === 'npc' ? 'sand' : 'orange');
  // lychgate / zone travel list
  const x2 = W - 150; ui.text(x2, 34, 'TRAVEL', { color: 'sand' });
  const near = w.zoneDef.safe || w.spots.some((s) => s.kind === 'lychgate' && Math.hypot(s.x - game.localHero().x, s.z - game.localHero().z) < 3);
  const list = CAMPAIGN.filter((id) => w.camp && w.camp.visited[id] && ZONES[id] && !ZONES[id].boss && id !== 'town');
  const items = list.map((id) => ({ label: ZONES[id].name.toUpperCase().replace('OSSUARY OF SAINT GLOAM', 'OSSUARY').replace('THE CRACKED BELFRY', 'BELFRY').slice(0, 22), disabled: !near || w.session, fn: () => { if (near && !w.session) { game.closeAll(); game.enterZone(id); } else game.toast('STAND AT A LYCHGATE OR IN TOWN'); } }));
  if (w.zoneId !== 'town' && !w.session && w.camp) items.unshift({ label: 'TOLLHAVEN', disabled: !near, fn: () => { if (near) { game.closeAll(); game.enterZone('town'); } else game.toast('STAND AT A LYCHGATE'); } });
  items.push({ label: 'CLOSE', fn: () => game.closeOverlay() });
  menu(game, ui, x2, 46, 140, items, { h: 12, gap: 2 });
  ui.text(12, H - 34, near ? 'TRAVEL IS OPEN FROM HERE.' : 'STAND AT A LYCHGATE OR IN TOWN TO TRAVEL.', { color: 'mist' });
  ui.prompts([['ok', 'SELECT'], ['back', 'CLOSE']]); if (nav.back || nav.map && false) game.closeOverlay();
}
function drawTouch(game, ui, nav) {
  const W = ui.hudW; const lines = ui.wrap('CONTROLLER OR KEYBOARD REQUIRED', W - 20, 1);
  const y = Math.round(ui.hudH * 0.4); ui.hud.rect(0, y - 6, W, lines.length * 10 + 12, 'ink');
  lines.forEach((l, i) => ui.center(y + i * 10, l, { color: 'sand' }));
}
