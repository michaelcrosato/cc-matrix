// The Case: time frozen. The grid on the left; a big icon, name and 2 lines of text on the right.
// Tabs: CASE, VALUABLES, KEY ITEMS, MAP, FILES, RADIO.
import { app } from '../core/app.js';
import { ITEMS, KEY_ITEMS, RELIQUARY_SOCKETS, TREASURE } from '../data/items.js';
import { NOTES } from '../data/notes.js';
import { footprint, makeItem } from '../game/caseModel.js';
import { iconOf } from '../models/icons.js';
import { WEAPONS } from '../data/weapons.js';
import { wrap } from '../core/ui.js';
import { PYM_HINTS } from '../data/dialogue.js';
import { SONGS } from '../audio/songs.js';

const TABS = ['CASE', 'VALUABLES', 'KEY ITEMS', 'MAP', 'FILES', 'RADIO'];
const CELL = 14;

export function openCase(area, o = {}) {
  const run = area.run;
  const grid = run.case;
  const state = { tab: o.tab ?? 0, cx: 0, cy: 0, held: null, menu: null, r1T: 0, msg: '', msgT: 0, row: 0, combineFrom: null, notePage: 0, hold: o.holding ?? null };
  area.ctx.audio.play('uiConfirm');
  if (state.hold) {
    const it = makeItem(state.hold.id, state.hold.qty ?? 1);
    state.held = { item: it, from: null, ground: state.hold };
  }
  const say = (m) => { state.msg = m; state.msgT = 2.2; };

  const usableBy = (it) => {
    const d = ITEMS[it.id];
    if (d.kind === 'weapon') return run.equipped === it.id ? null : 'EQUIP';
    if (d.kind === 'herb' && d.heal) return 'USE';
    if (d.kind === 'grenade') return run.grenade === it.id ? null : 'READY';
    return null;
  };

  const placeHeld = () => {
    const h = state.held;
    if (!grid.fits(h.item, state.cx, state.cy)) { area.ctx.audio.play('uiDeny'); return; }
    grid.place(h.item, state.cx, state.cy);
    area.ctx.audio.play('place');
    if (h.ground?.drop) area.consumeDrop(h.ground.drop);
    if (h.ground?.onPlaced) h.ground.onPlaced();
    if (ITEMS[h.item.id].kind === 'weapon') run.addWeapon(h.item.id);
    state.held = null;
    state.hold = null;
  };

  const cancelHeld = () => {
    const h = state.held;
    if (!h) return false;
    if (h.from) { h.item.rot = h.from.rot; grid.place(h.item, h.from.x, h.from.y); }
    else if (h.ground?.onCancel) h.ground.onCancel();
    state.held = null;
    area.ctx.audio.play('uiBack');
    return true;
  };

  const pickUp = (it) => {
    state.held = { item: it, from: { x: it.x, y: it.y, rot: it.rot } };
    grid.remove(it);
    area.ctx.audio.play('rotate');
  };

  /** Drop to the ground (a real item, left where Max stands). */
  const dropHeld = () => {
    const h = state.held;
    const d = ITEMS[h.item.id];
    if (d.kind === 'weapon') { say('A CLAIMS ADJUSTER DOES NOT LITTER WEAPONS.'); area.ctx.audio.play('uiDeny'); return; }
    if (h.ground) { cancelHeld(); return; }
    const P = area.player;
    area.addDrop('item', h.item.id, h.item.qty, P.x + Math.sin(P.facing) * 0.9, P.z + Math.cos(P.facing) * 0.9, { floor: P.floor, y: P.y });
    state.held = null;
    area.ctx.audio.play('place');
  };

  const drawGrid = (ctx, ui, gx, gy) => {
    const { hud } = ui;
    const w = grid.w; const h = grid.h;
    hud.rect(gx - 3, gy - 3, w * CELL + 6, h * CELL + 6, 'plum');
    hud.rect(gx - 2, gy - 2, w * CELL + 4, h * CELL + 4, 'ink');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        hud.rect(gx + x * CELL, gy + y * CELL, CELL - 1, CELL - 1, 'night');
      }
    }
    for (const it of grid.items) {
      const [fw, fh] = footprint(it);
      const px = gx + it.x * CELL; const py = gy + it.y * CELL;
      hud.rect(px, py, fw * CELL - 1, fh * CELL - 1, it.id === run.equipped ? 'navy' : 'slate');
      drawItem(hud, it, px, py, fw, fh);
      const d = ITEMS[it.id];
      if (d.max) ui.text(px + fw * CELL - 2 - ui.width(String(it.qty)), py + fh * CELL - 9, String(it.qty), { color: 'white' });
    }
    // Cursor and held item.
    const held = state.held;
    if (held) {
      const [fw, fh] = footprint(held.item);
      const ok = grid.fits(held.item, state.cx, state.cy);
      const px = gx + state.cx * CELL; const py = gy + state.cy * CELL;
      hud.rect(px, py, fw * CELL - 1, fh * CELL - 1, ok ? 'green' : 'red');
      drawItem(hud, held.item, px, py, fw, fh);
      outline(hud, px - 1, py - 1, fw * CELL + 1, fh * CELL + 1, ui.blink(4) ? 'white' : 'orange');
    } else if (!state.menu) {
      const it = grid.at(state.cx, state.cy);
      if (it) {
        const [fw, fh] = footprint(it);
        outline(hud, gx + it.x * CELL - 1, gy + it.y * CELL - 1, fw * CELL + 1, fh * CELL + 1, ui.blink(4) ? 'white' : 'orange');
      } else outline(hud, gx + state.cx * CELL - 1, gy + state.cy * CELL - 1, CELL + 1, CELL + 1, ui.blink(4) ? 'white' : 'orange');
    }
    return { gx, gy };
  };

  const updateCaseTab = (ctx, ui) => {
    const { W, H } = ui;
    const gx = 16; const gy = 48;
    const { input } = ctx;
    // Mouse moves the cursor; wheel and right mouse rotate.
    if (ui.pointerMoved || ui.clicked) {
      const mx = Math.floor((ui.mx - gx) / CELL); const my = Math.floor((ui.my - gy) / CELL);
      if (mx >= 0 && my >= 0 && mx < grid.w && my < grid.h && !state.menu) { state.cx = mx; state.cy = my; }
    }
    if (!state.menu) {
      if (ui.nav.left) { state.cx = Math.max(0, state.cx - 1); ctx.audio.play('uiMove'); }
      if (ui.nav.right) { state.cx = Math.min(grid.w - 1, state.cx + 1); ctx.audio.play('uiMove'); }
      if (ui.nav.up) { state.cy = Math.max(0, state.cy - 1); ctx.audio.play('uiMove'); }
      if (ui.nav.down) { state.cy = Math.min(grid.h - 1, state.cy + 1); ctx.audio.play('uiMove'); }
    }
    const rotate = ui.nav.secondary || ui.rightClicked || ui.nav.wheel || input.wasPressed('KeyR');
    const held = state.held;
    if (held && rotate) { held.item.rot = !held.item.rot; ctx.audio.play('rotate'); }
    const inside = ui.clicked && ui.inside(ui.clicked[0], ui.clicked[1], gx, gy, grid.w * CELL, grid.h * CELL);
    const confirm = ui.nav.confirm || inside;
    if (inside) ui.clicked = null;
    if (state.menu) {
      drawGrid(ctx, ui, gx, gy);
      updateMenu(ctx, ui, gx, gy);
    } else {
      if (confirm) {
        if (held) placeHeld();
        else {
          const it = grid.at(state.cx, state.cy);
          if (state.combineFrom) {
            const a = state.combineFrom;
            state.combineFrom = null;
            if (it && it !== a) {
              const res = grid.combine(a, it);
              if (res) { ctx.audio.play('heal'); say(`${ITEMS[res.id].name}`); } else { ctx.audio.play('uiDeny'); say('THOSE DO NOT COMBINE.'); }
            } else ctx.audio.play('uiDeny');
          } else if (it) { state.menu = { item: it, focus: null }; ui.focus = null; ctx.audio.play('uiConfirm'); }
        }
      }
      if (ui.nav.tertiary && held) dropHeld();
      drawGrid(ctx, ui, gx, gy);
    }
    // Hold R1 (or F) to arrange.
    if (input.isDown('PadR1')) {
      state.r1T += ui.dt;
      if (state.r1T > 0.35 && !state.r1Used) { state.r1Used = true; doArrange(ctx); }
    } else {
      if (state.r1T > 0 && state.r1T <= 0.35 && !state.r1Used) state.tab = (state.tab + 1) % TABS.length;
      state.r1T = 0; state.r1Used = false;
    }
    if (input.wasPressed('KeyF')) doArrange(ctx);
    // The info panel.
    const panelX = gx + grid.w * CELL + 12;
    const panelW = W - panelX - 8;
    const focusIt = held?.item ?? grid.at(state.cx, state.cy);
    ui.panel(panelX, gy - 3, panelW, 134);
    if (focusIt) {
      const d = ITEMS[focusIt.id];
      const ic = iconOf(d.icon);
      if (ic) {
        const iw = ic.rows[0].length; const scale = iw * 2 <= panelW - 12 ? 2 : 1;
        ui.hud.sprite(panelX + ((panelW - iw * scale) >> 1), gy + 4, ic.rows, ic.colors, { scale, shadow: false });
      }
      ui.text(panelX + 6, gy + 66, d.name, { color: 'sand' });
      wrap(d.text, Math.floor((panelW - 10) / 6)).slice(0, 5).forEach((l, i) => ui.text(panelX + 6, gy + 77 + i * 9, l));
      if (d.kind === 'weapon') {
        const st = run.weaponStats(focusIt.id);
        if (run.weapons[focusIt.id]) ui.text(panelX + 6, gy + 120, `MAG ${run.weapons[focusIt.id].mag}/${st.mag}`, { color: 'mist' });
      }
    } else ui.text(panelX + 6, gy + 4, 'EMPTY SPACE.', { color: 'slate' });
    ui.text(16, gy + grid.h * CELL + 8, `DOUBLOONS ${run.money}`, { color: 'sand' });
    if (state.combineFrom) ui.text(16, gy + grid.h * CELL + 18, 'CHOOSE WHAT TO COMBINE IT WITH.', { color: 'lime' });
    else if (state.hold) ui.text(16, gy + grid.h * CELL + 18, 'NO ROOM. PLACE IT, OR LEAVE IT WHERE IT IS.', { color: 'orange' });
    if (state.msgT > 0) { state.msgT -= ui.dt; ui.text(16, gy + grid.h * CELL + 28, state.msg, { color: 'white' }); }
    const prompts = held
      ? [['confirm', 'PLACE'], ['secondary', 'ROTATE'], ['tertiary', 'DROP'], ['back', 'CANCEL']]
      : [['confirm', 'CHOOSE'], ['arrange', 'HOLD: ARRANGE'], ['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'CLOSE']];
    ui.promptBar(prompts);
  };

  const doArrange = (ctx) => {
    if (grid.arrange()) { ctx.audio.play('place'); say('ARRANGED.'); }
    else { ctx.audio.play('uiDeny'); say('IT WILL NOT ALL FIT.'); }
  };

  const updateMenu = (ctx, ui, gx, gy) => {
    const m = state.menu;
    const it = m.item;
    const d = ITEMS[it.id];
    const [fw] = footprint(it);
    const use = usableBy(it);
    const entries = [['MOVE', () => { pickUp(it); state.menu = null; state.cx = it.x; state.cy = it.y; }]];
    if (use) entries.push([use, () => {
      if (d.kind === 'weapon') { area.player.equip(it.id); ctx.audio.play('reloadIn'); say(`${d.name} READY.`); }
      else if (d.kind === 'herb') { if (area.player.hp >= area.player.maxHp - 0.5 && !d.maxUp) { ctx.audio.play('uiDeny'); say('FULLY COVERED ALREADY.'); } else { area.player.useHerb(it); say('COVERAGE RESTORED.'); } }
      else if (d.kind === 'grenade') { run.grenade = it.id; ctx.audio.play('uiMove'); say(`${d.name} READY.`); }
      state.menu = null;
    }]);
    if (d.kind === 'herb') entries.push(['COMBINE', () => { state.combineFrom = it; state.menu = null; }]);
    const mw = 76; const mh = entries.length * 13 + 4;
    const mx = Math.min(gx + (it.x + fw) * CELL + 2, ui.W - mw - 4);
    const my = gy + it.y * CELL;
    ui.panel(mx - 2, my - 2, mw + 4, mh + 2, 'ink', 'orange');
    entries.forEach(([label, fn], i) => {
      if (ui.item(`m${i}`, mx, my + i * 13, mw, label, { h: 13, scale: 1 })) fn();
    });
    if (ui.nav.back) { state.menu = null; ctx.audio.play('uiBack'); ui.nav.back = false; ui.focus = null; }
  };

  const updateValuables = (ctx, ui) => {
    const entries = Object.entries(run.valuables).filter(([, n]) => n > 0);
    listTab(ctx, ui, entries.map(([id, n]) => ({ id, name: TREASURE[id].name, right: n > 1 ? `x${n}` : `${TREASURE[id].value}`, icon: TREASURE[id].icon, text: `${TREASURE[id].text}\nMR. FATHOM PAYS ${TREASURE[id].value}.` })), (row) => {
      if (!RELIQUARY_SOCKETS.includes(row.id) || !run.valuables.reliquary) { ctx.audio.play('uiDeny'); return; }
      if (run.socket(row.id)) { ctx.audio.play('treasure'); say('SOCKETED IN THE RELIQUARY.'); } else ctx.audio.play('uiDeny');
    }, 'NOTHING OF VALUE. YET.');
    ui.promptBar([['confirm', run.valuables.reliquary ? 'SOCKET' : 'LOOK'], ['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'CLOSE']]);
  };

  const updateKeys = (ctx, ui) => {
    listTab(ctx, ui, run.keys.map((id) => ({ id, name: KEY_ITEMS[id].name, icon: KEY_ITEMS[id].icon, text: KEY_ITEMS[id].text })), null, 'NOTHING YET.');
    ui.promptBar([['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'CLOSE']]);
  };

  /** One list on the left, one big item on the right. At most 7 rows. */
  const listTab = (ctx, ui, rows, onPick, empty) => {
    const x = 16; const y0 = 50; const w = (ui.W >> 1) - 24; const rowH = 16;
    if (!rows.length) { ui.text(x, y0, empty, { color: 'slate' }); return; }
    const maxRows = Math.min(7, Math.floor((ui.H - y0 - 24) / rowH));
    const page = Math.max(0, Math.min(rows.length - maxRows, state.row - maxRows + 1));
    rows.slice(page, page + maxRows).forEach((r, i) => {
      if (ui.item(`row${r.id}`, x, y0 + i * rowH, w, r.name, { h: rowH - 1, scale: 1, right: r.right })) onPick?.(r);
    });
    const fi = rows.findIndex((r) => ui.focus === `row${r.id}`);
    if (fi >= 0) state.row = fi;
    const cur = rows[Math.max(0, fi)];
    const px = (ui.W >> 1) + 4; const pw = ui.W - px - 8;
    ui.panel(px, y0 - 3, pw, 124);
    const ic = iconOf(cur.icon);
    if (ic) ui.hud.sprite(px + ((pw - ic.rows[0].length * 2) >> 1), y0 + 4, ic.rows, ic.colors, { scale: 2, shadow: false });
    ui.text(px + 6, y0 + 42, cur.name, { color: 'sand' });
    wrap(cur.text, Math.floor((pw - 10) / 6)).slice(0, 7).forEach((l, i) => ui.text(px + 6, y0 + 53 + i * 9, l));
  };

  const updateMap = (ctx, ui) => {
    const { info } = area.level;
    const { hud } = ui;
    const px = Math.max(1, Math.min(2, Math.floor(Math.min((ui.W - 180) / info.w, (ui.H - 72) / info.h))));
    const mapW = info.w * px; const mapH = info.h * px;
    const x0 = 16; const y0 = 50;
    const col = { '#': 'night', T: 'slate', '~': 'navy', H: 'slate', '.': 'mist', ',': 'green', '=': 'orange', ':': 'sand', _: 'mist', '%': 'teal', c: 'slate', r: 'slate' };
    for (let r = 0; r < info.h; r++) {
      for (let c = 0; c < info.w; c++) {
        const ch = info.rows[r][c];
        hud.rect(x0 + c * px, y0 + r * px, px, px, col[ch] ?? (ch === '#' ? 'night' : 'mist'));
      }
    }
    const mark = (c, r, color) => hud.rect(x0 + c * px - 1, y0 + r * px - 1, px + 2, px + 2, color);
    for (const d of area.level.doors) mark(d.c0, d.r0, d.open ? 'sand' : 'red');
    for (const g of area.level.gates) mark(g.c0, g.r0, g.open ? 'sand' : 'plum');
    for (const c of area.level.chests) if (!c.opened) mark(c.c, c.r, 'lime');
    for (const [c, r] of info.find('m')) mark(c, r, 'lime');
    for (const [c, r] of info.find('t')) mark(c, r, 'cyan');
    if (run.hasKey('chart')) for (const t of area.tannoys) if (!t.dead) mark(t.c, t.r, 'orange');
    const P = area.player;
    if (ui.blink(3)) mark(info.col(P.x), info.row(P.z), 'white');
    const lx = x0 + mapW + 12;
    ui.text(lx, y0, area.def.title ?? area.id, { color: 'sand' });
    const legend = [['YOU', 'white'], ['MR. FATHOM', 'lime'], ['TELEGRAPH', 'cyan'], ['DOOR', 'red']];
    if (run.hasKey('chart')) legend.push(['TANNOY', 'orange']);
    legend.forEach(([l, c], i) => { hud.rect(lx, y0 + 14 + i * 11, 6, 6, c); ui.text(lx + 10, y0 + 13 + i * 11, l, { color: 'mist' }); });
    ui.text(lx, y0 + 14 + legend.length * 11 + 4, `TANNOYS ${run.tannoys.length}/15`, { color: 'mist' });
    ui.text(lx, y0 + 14 + legend.length * 11 + 15, area.objective ?? '', { color: 'sand' });
    ui.promptBar([['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'CLOSE']]);
  };

  const updateFiles = (ctx, ui) => {
    const notes = run.notes;
    if (!notes.length) { ui.text(16, 50, 'NO CLAIM NOTES FILED.', { color: 'slate' }); ui.promptBar([['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'CLOSE']]); return; }
    if (ui.nav.left) { state.notePage = (state.notePage + notes.length - 1) % notes.length; ctx.audio.play('uiMove'); }
    if (ui.nav.right) { state.notePage = (state.notePage + 1) % notes.length; ctx.audio.play('uiMove'); }
    if (ui.nav.wheel) state.notePage = (state.notePage + (ui.nav.wheel > 0 ? 1 : notes.length - 1)) % notes.length;
    state.notePage = Math.min(state.notePage, notes.length - 1);
    const n = NOTES[notes[state.notePage]];
    const x = 40; const w = ui.W - 80;
    ui.hud.rect(x - 2, 46, w + 4, 150, 'night');
    ui.hud.rect(x, 48, w, 146, 'mist');
    ui.text(x + 8, 54, n.title, { color: 'plum', shadow: false, scale: 1 });
    ui.hud.rect(x + 8, 64, w - 16, 1, 'ink');
    wrap(n.text, Math.floor((w - 16) / 6)).slice(0, 12).forEach((l, i) => ui.text(x + 8, 70 + i * 10, l, { color: 'ink', shadow: false }));
    ui.centerText(180, `NOTE ${state.notePage + 1} OF ${notes.length}`, { color: 'night', shadow: false });
    ui.promptBar([['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'CLOSE']]);
  };

  const updateRadio = (ctx, ui) => {
    const x = ((ui.W - 280) >> 1);
    const inDry = area.safe;
    ui.text(x, 50, 'THE CLAIMS DESK', { color: 'sand', scale: 2 });
    wrap(inDry ? 'THE LINE IS CLEAR. MR. PYM IS AT HIS DESK.' : 'YOU ARE NOT IN A DRY ROOM. THE LINE WILL BE BRIEF, AND MOSTLY MUSIC.', 46).forEach((l, i) => ui.text(x, 72 + i * 9, l));
    if (ui.item('call', x, 100, 280, 'CALL MR. PYM')) {
      app.close(screen);
      ctx.audio.play('telegraph');
      if (inDry) area.radioCall([['pym', PYM_HINTS[area.id] ?? PYM_HINTS.quay]]);
      else area.radioCall([['pym', 'ALL OUR ADJUSTERS ARE BUSY. PLEASE HOLD. YOU ARE NUMBER NINE IN THE QUEUE.']], true);
      return;
    }
    ui.promptBar([['confirm', 'CALL'], ['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'CLOSE']]);
  };

  const screen = {
    frozen: true,
    name: 'case',
    state,
    grid,
    placeHeld,
    update(ctx, ui) {
      ctx.hud.clear();
      ctx.hud.rect(0, 0, ui.W, ui.H, 'ink');
      ui.text(16, 8, 'THE CASE', { scale: 2, color: 'sand' });
      ui.text(ui.W - 16 - ui.width(`DOUBLOONS ${run.money}`), 12, `DOUBLOONS ${run.money}`, { color: 'sand' });
      // Tabs: R1 tap on the Case tab is handled on release, so holding it can arrange.
      const inCase = state.tab === 0;
      const savedNext = ui.nav.tabNext;
      if (inCase) ui.nav.tabNext = ctx.input.wasPressed('KeyE');
      const next = ui.tabs('ctabs', 28, TABS, state.tab);
      ui.nav.tabNext = savedNext;
      if (next !== state.tab && !state.held) {
        state.tab = next; state.menu = null; state.combineFrom = null; state.row = 0; ui.focus = null;
        ctx.audio.play('uiMove');
      }
      switch (state.tab) {
        case 0: updateCaseTab(ctx, ui); break;
        case 1: updateValuables(ctx, ui); break;
        case 2: updateKeys(ctx, ui); break;
        case 3: updateMap(ctx, ui); break;
        case 4: updateFiles(ctx, ui); break;
        case 5: updateRadio(ctx, ui); break;
        default: break;
      }
      const closeKey = ctx.input.wasPressed('Tab', 'KeyI', 'PadTriangle') && state.tab === 0 && !state.held;
      const closeM = ctx.input.wasPressed('Tab', 'KeyI', 'KeyM') && state.tab !== 0;
      if (ui.nav.back || closeKey || closeM) {
        if (state.menu) return;
        if (state.combineFrom) { state.combineFrom = null; return; }
        if (cancelHeld()) { if (state.hold) { app.close(screen); } return; }
        ctx.audio.play('uiBack');
        app.close(screen);
      }
    },
  };
  app.open(screen);
  return screen;
}

function drawItem(hud, it, px, py, fw, fh) {
  const d = ITEMS[it.id];
  const ic = iconOf(d.icon);
  if (!ic) return;
  if (it.rot) {
    // Draw the rotated icon: rows become columns.
    const h = ic.rows.length; const w = ic.rows[0].length;
    const rows = [];
    for (let x = 0; x < w; x++) {
      let s = '';
      for (let y = h - 1; y >= 0; y--) s += ic.rows[y][x];
      rows.push(s);
    }
    hud.sprite(px, py, rows, ic.colors, { shadow: false });
  } else hud.sprite(px, py, ic.rows, ic.colors, { shadow: false });
}

function outline(hud, x, y, w, h, c) {
  hud.rect(x, y, w, 1, c);
  hud.rect(x, y + h - 1, w, 1, c);
  hud.rect(x, y, 1, h, c);
  hud.rect(x + w - 1, y, 1, h, c);
}
export { WEAPONS, PYM_HINTS, SONGS };
