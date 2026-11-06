// Mr. Fathom: BUY, SELL, TUNE. At most 6 rows, one big item panel, his helmet and a line of gibberish.
import { app } from '../core/app.js';
import { ITEMS, TREASURE } from '../data/items.js';
import { BARKS, PRICES, SPECIAL_STOCK, STOCK, TANNOY_PRIZES } from '../data/shop.js';
import { TUNE_MAX, TUNE_PRICES, TUNE_STATS, TUNE_STAT_IDS, WEAPONS, statsOf } from '../data/weapons.js';
import { iconOf } from '../models/icons.js';
import { wrap } from '../core/ui.js';
import { PORTRAITS } from '../data/portraits.js';
import { openCase } from './case.js';
import { SONGS } from '../audio/songs.js';
import { makeItem } from '../game/caseModel.js';

const TABS = ['BUY', 'SELL', 'TUNE'];
const ROWS = 6;

/** What Mr. Fathom has on the shelf this chapter. */
export const shopStock = (run) => STOCK[Math.min(3, run.chapter)] ?? STOCK[1];

export function buyItem(area, id) {
  const { run } = area;
  const price = PRICES[id];
  if (run.money < price) return { ok: false, why: 'poor' };
  if (id === 'caseMedium' || id === 'caseLarge') {
    const want = id === 'caseMedium' ? 1 : 2;
    if (run.caseLevel >= want) return { ok: false, why: 'have' };
    while (run.caseLevel < want) run.upgradeCase();
    run.money -= price;
    return { ok: true };
  }
  if (id === 'chart') {
    if (run.hasKey('chart')) return { ok: false, why: 'have' };
    run.giveKey('chart'); run.money -= price;
    return { ok: true };
  }
  const d = ITEMS[id];
  if (d.kind === 'weapon' && run.ownsWeapon(id)) return { ok: false, why: 'have' };
  const qty = d.max ? d.pickup * 2 : 1;
  if (d.kind === 'weapon') {
    const it = makeItem(id);
    if (!run.case.add(it)) return { ok: false, why: 'room', pending: { id, qty: 1, price } };
    run.addWeapon(id); run.money -= price;
    return { ok: true };
  }
  if (!run.giveItem(id, qty)) return { ok: false, why: 'room', pending: { id, qty, price } };
  run.money -= price;
  return { ok: true };
}

export function sellValue(entry) {
  if (entry.treasure) return TREASURE[entry.id].value;
  return ITEMS[entry.id].sell ?? 10;
}

export function tuneWeapon(area, weaponId, stat) {
  const { run } = area;
  const lv = run.tuneLevel(weaponId, stat);
  if (lv >= TUNE_MAX) return { ok: false, why: 'max' };
  const price = TUNE_PRICES[lv];
  if (run.money < price) return { ok: false, why: 'poor' };
  run.money -= price;
  const w = run.weapons[weaponId];
  w.tune[stat] = lv + 1;
  if (stat === 'cap') w.mag = Math.min(statsOf(weaponId, w).mag, w.mag);
  return { ok: true };
}

/** Tannoy pay-outs: free perks at 5, 10 and 15. */
export function tannoyPayouts(run) {
  const out = [];
  for (const p of TANNOY_PRIZES) {
    if (run.tannoys.length >= p.at && !run.tannoyPrizes.includes(p.at)) {
      run.tannoyPrizes.push(p.at);
      if (p.money) run.money += p.money;
      if (p.caseUp) run.upgradeCase();
      if (p.treasure) run.giveTreasure(p.treasure);
      out.push(p.text);
    }
  }
  return out;
}

export function openShop(area) {
  const { run } = area;
  const { rng } = area.fx;
  let tab = 0;
  let scroll = 0;
  let tuneTarget = null;
  let line = '';
  let shown = 0;
  let voiced = 0;
  const say = (text) => { line = text; shown = 0; voiced = 0; };
  const bark = (k) => say(rng.pick(BARKS[k]));
  const prevMusic = app.mix.current;
  app.mix.play(SONGS.shop, 'shop', 0.4);
  area.ctx.audio.play('uiConfirm');
  bark('greet');
  const payouts = tannoyPayouts(run);
  if (payouts.length) say(`BLUB! ${payouts.join(' ')}`);
  area.fathom?.actor?.play('FathomPresent', { once: true });
  const chapterStock = () => shopStock(run);

  const infoOf = (id) => {
    if (SPECIAL_STOCK[id]) return { name: SPECIAL_STOCK[id].name, text: SPECIAL_STOCK[id].text, icon: SPECIAL_STOCK[id].icon };
    const d = ITEMS[id];
    return { name: d.name, text: d.text, icon: d.icon };
  };

  const rowsFor = () => {
    if (tab === 0) {
      return chapterStock().map((id) => {
        const inf = infoOf(id);
        let note = `${PRICES[id]}`;
        if ((id === 'caseMedium' && run.caseLevel >= 1) || (id === 'caseLarge' && run.caseLevel >= 2) || (id === 'chart' && run.hasKey('chart')) || (ITEMS[id]?.kind === 'weapon' && run.ownsWeapon(id))) note = 'OWNED';
        return { key: `buy${id}`, id, ...inf, right: note };
      });
    }
    if (tab === 1) {
      const items = run.case.items.filter((it) => !(ITEMS[it.id].kind === 'weapon' && run.ownedWeapons().length <= 1)).map((it) => ({ key: `sell${it.uid}`, item: it, id: it.id, ...infoOf(it.id), right: `${ITEMS[it.id].sell ?? 10}`, qty: it.qty }));
      const val = Object.entries(run.valuables).filter(([, n]) => n > 0).map(([id, n]) => ({ key: `sellv${id}`, id, treasure: true, name: TREASURE[id].name, text: TREASURE[id].text, icon: TREASURE[id].icon, right: `${TREASURE[id].value}`, count: n }));
      return [...val, ...items];
    }
    if (tuneTarget) {
      return TUNE_STAT_IDS.map((k) => {
        const lv = run.tuneLevel(tuneTarget, k);
        return { key: `tune${k}`, id: k, stat: k, name: `${TUNE_STATS[k].label} ${'*'.repeat(lv)}${'.'.repeat(TUNE_MAX - lv)}`, text: TUNE_STATS[k].text, icon: WEAPONS[tuneTarget].icon, right: lv >= TUNE_MAX ? 'FULL' : `${TUNE_PRICES[lv]}` };
      });
    }
    return run.ownedWeapons().map((id) => {
      const st = statsOf(id, run.weapons[id]);
      return { key: `tw${id}`, id, weapon: true, name: WEAPONS[id].name, text: `${WEAPONS[id].text}\n${st.perk ? st.perkText : `FILL ALL FOUR: ${WEAPONS[id].perkText}`}`, icon: WEAPONS[id].icon, right: '' };
    });
  };

  const screen = {
    frozen: true,
    name: 'shop',
    setTab: (n) => { tab = n; },
    update(ctx, ui) {
      const { hud, W, H } = ui;
      ctx.hud.clear();
      hud.rect(0, 0, W, H, 'ink');
      // Fathom's portrait and his line.
      const P = PORTRAITS.fathom;
      hud.rect(9, 7, 34, 34, 'lime');
      hud.rect(10, 8, 32, 32, 'night');
      hud.sprite(10, 8, P.rows, P.colors, { scale: 2, shadow: false });
      ui.text(48, 8, 'MR. FATHOM', { color: 'cyan' });
      shown = Math.min(line.length, shown + ui.dt * 30);
      if (Math.floor(shown) > voiced) { app.voice.speak('fathom', line, voiced, Math.floor(shown)); voiced = Math.floor(shown); }
      wrap(line.slice(0, Math.floor(shown)), Math.floor((W - 56) / 6)).slice(0, 2).forEach((l, i) => ui.text(48, 19 + i * 9, l));
      const next = ui.tabs('stabs', 44, TABS, tab);
      if (next !== tab) { tab = next; scroll = 0; tuneTarget = null; ui.focus = null; }
      // Rows.
      const rows = rowsFor();
      const x = 12; const y0 = 64; const rowH = 22; const w = (W >> 1) - 18;
      if (ui.nav.wheel) scroll += ui.nav.wheel > 0 ? 1 : -1;
      const fi = rows.findIndex((r) => r.key === ui.focus);
      if (fi >= 0) {
        if (fi < scroll) scroll = fi;
        if (fi >= scroll + ROWS) scroll = fi - ROWS + 1;
      }
      scroll = Math.max(0, Math.min(Math.max(0, rows.length - ROWS), scroll));
      if (!rows.length) ui.text(x + 6, y0 + 4, tab === 1 ? 'NOTHING TO SELL.' : 'NOTHING.', { color: 'slate' });
      let picked = null;
      rows.slice(scroll, scroll + ROWS).forEach((r, i) => {
        const hit = ui.item(r.key, x, y0 + i * rowH, w, r.name + (r.count > 1 ? ` x${r.count}` : '') + (r.qty > 1 ? ` x${r.qty}` : ''), { h: rowH - 2, scale: 1, right: r.right });
        if (hit) picked = r;
      });
      if (rows.length > ROWS) {
        if (scroll > 0) hud.sprite(x + w - 8, y0 - 6, ['..o..', '.ooo.', 'ooooo'], { o: 'sand' }, { shadow: false });
        if (scroll + ROWS < rows.length) hud.sprite(x + w - 8, y0 + ROWS * rowH, ['ooooo', '.ooo.', '..o..'], { o: 'sand' }, { shadow: false });
      }
      // The big item.
      const cur = rows[Math.max(0, fi)] ?? null;
      const px = (W >> 1) + 2; const pw = W - px - 10; const py = y0 - 2;
      ui.panel(px, py, pw, 134);
      if (cur) {
        const ic = iconOf(cur.icon);
        if (ic) {
          const iw = ic.rows[0].length; const sc = iw * 2 <= pw - 12 ? 2 : 1;
          hud.sprite(px + ((pw - iw * sc) >> 1), py + 6, ic.rows, ic.colors, { scale: sc, shadow: false });
        }
        ui.text(px + 6, py + 66, cur.name, { color: 'sand' });
        wrap(cur.text, Math.floor((pw - 10) / 6)).slice(0, 5).forEach((l, i) => ui.text(px + 6, py + 77 + i * 9, l));
      }
      ui.text(12, H - 30, `DOUBLOONS ${run.money}`, { color: 'sand', scale: 1 });
      ui.promptBar([['confirm', tab === 0 ? 'BUY' : tab === 1 ? 'SELL' : tuneTarget ? 'TUNE' : 'CHOOSE'], ['tabPrev', ''], ['tabNext', 'TAB'], ['back', tuneTarget ? 'WEAPONS' : 'LEAVE']]);
      if (picked) this.activate(ctx, picked);
      if (ui.nav.back) {
        if (tuneTarget) { tuneTarget = null; ui.focus = null; ctx.audio.play('uiBack'); return; }
        ctx.audio.play('uiBack');
        area.talk.bark('fathom', rng.pick(BARKS.leave), { prio: 2 });
        if (prevMusic) area.applyMusic(area.musicName); else area.applyMusic(null);
        area.fathom?.actor?.play('FathomIdle');
        app.close(screen);
      }
    },
    activate(ctx, r) {
      if (tab === 0) {
        const res = buyItem(area, r.id);
        if (res.ok) { ctx.audio.play('buy'); bark('buy'); return; }
        if (res.why === 'poor') { ctx.audio.play('uiDeny'); bark(rng.chance(0.25) ? 'plastic' : 'poor'); return; }
        if (res.why === 'have') { ctx.audio.play('uiDeny'); say('YOU HAVE ONE OF THOSE. BLUB.'); return; }
        if (res.why === 'room') {
          ctx.audio.play('uiDeny');
          say("NO ROOM, FRIEND. MAKE SOME.");
          const { id, qty, price } = res.pending;
          openCase(area, { holding: { id, qty, onPlaced: () => { run.money -= price; bark('buy'); ctx.audio.play('buy'); }, onCancel: () => { say('A WISE BUT POOR CHOICE.'); } } });
        }
        return;
      }
      if (tab === 1) {
        const v = sellValue(r);
        if (r.treasure) {
          run.valuables[r.id]--;
          if (!run.valuables[r.id]) delete run.valuables[r.id];
        } else {
          if (ITEMS[r.id].kind === 'weapon') {
            run.removeWeapon(r.id);
            area.player.showGun();
          }
          run.case.remove(r.item);
        }
        run.money += v;
        ctx.audio.play('buy');
        bark('sell');
        return;
      }
      if (!tuneTarget) { tuneTarget = r.id; app.ui.focus = null; ctx.audio.play('uiConfirm'); return; }
      const res = tuneWeapon(area, tuneTarget, r.stat);
      if (res.ok) {
        ctx.audio.play('tune');
        bark('tune');
        if (statsOf(tuneTarget, run.weapons[tuneTarget]).perk && TUNE_STAT_IDS.every((k) => run.tuneLevel(tuneTarget, k) >= TUNE_MAX)) say(`BLUB! ${WEAPONS[tuneTarget].perkText}`);
      } else if (res.why === 'poor') { ctx.audio.play('uiDeny'); bark('poor'); } else ctx.audio.play('uiDeny');
    },
  };
  app.open(screen);
  return screen;
}
