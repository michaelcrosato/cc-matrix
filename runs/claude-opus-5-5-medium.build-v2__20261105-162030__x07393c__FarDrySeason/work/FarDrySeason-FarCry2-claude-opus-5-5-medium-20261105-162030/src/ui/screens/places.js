// places screens.
import { SHOP_ORDER, THROWABLES, UPGRADES, WEAPONS } from '../../content/weapons.js';
import { clamp } from '../../world/geom.js';
export function bedScreen(g) {
  const sleep = (hour) => { g.sleepTo(hour); g.ui.pop(); };
  return { id: 'bed', title: 'SLEEP UNTIL', dim: true, items: [{ label: 'DAWN', action: () => sleep(5.5) }, { label: 'NOON', action: () => sleep(12) }, { label: 'DUSK', action: () => sleep(18.5) }, { label: 'MIDNIGHT', action: () => sleep(0) }, { label: 'LEAVE', action: () => g.ui.pop() }] };
}
export function lockerScreen(g) {
  const p = g.player;
  const row = (slot, label) => {
    const opts = () => g.lockerOptions(slot);
    return { label, value: () => { const cur = p.guns[slot]; return cur ? WEAPONS[cur.id].name.replaceAll('"', '').split(' ').pop() : 'NOTHING'; }, adjust: (d) => { const list = opts(); if (!list.length) return; const cur = p.guns[slot]?.id ?? null, i = list.indexOf(cur), next = list[(i + Math.sign(d) + list.length) % list.length]; if (next && next !== cur) g.combat.give(next, 100, false); g.audio.play('magazine'); } };
  };
  return { id: 'locker', title: 'LOCKER', dim: true, items: [row('sidearm', 'SIDEARM'), row('main', 'MAIN'), row('special', 'SPECIAL'), { label: 'LEAVE', action: () => g.ui.pop() }], footer: [['left', 'CHANGE'], ['back', 'BACK']], draw() { const n = Object.keys(g.story.trigs ?? {}).length; if (n >= 6) g.ctx.hud.text(0, 200, 'A CLEAN OLD EMPIRE LEANS IN THE LOCKER. A NOTE SAYS WHY.', { anchor: 'top', color: 'sand' }); } };
}
export function rackScreen(g) {
  const stock = [...SHOP_ORDER.map((id) => ({ kind: 'gun', id })), { kind: 'throw', id: 'molotov' }, { kind: 'throw', id: 'charge' }, ...UPGRADES.map((u) => ({ kind: 'up', id: u.id }))];
  const s = { id: 'rack', dim: false, i: 0, back: undefined, footer: false, focus: 0, items: [], onShow() { g.showRackGun(stock[s.i]); }, onClose() { g.showRackGun(null); },
    update() {
      const input = g.ctx.input, { pressed } = g;
      if (pressed('left')) { s.i = (s.i + stock.length - 1) % stock.length; g.audio.play('ui-move'); g.showRackGun(stock[s.i]); }
      if (pressed('right')) { s.i = (s.i + 1) % stock.length; g.audio.play('ui-move'); g.showRackGun(stock[s.i]); }
      if (input.wheel) { s.i = (s.i + Math.sign(input.wheel) + stock.length) % stock.length; g.showRackGun(stock[s.i]); }
      const clicked = g.ui.clickedAnywhere();
      if (pressed('confirm') || clicked) g.buy(stock[s.i]);
    },
    draw() {
      const h = g.ctx.hud, it = stock[s.i]; const W = h.width;
      h.rect(0, 180, W, 90, 'ink');
      if (it.kind === 'gun') {
        const w = WEAPONS[it.id], own = g.player.unlocked[it.id];
        h.text(0, 190, w.name, { anchor: 'top', scale: 2, color: 'sand' });
        const dmg = (w.damage * (w.pellets ?? 1)) / 100, rng = Math.min(1, w.range / 320), rel = w.reliability / 10;
        [['DAMAGE', dmg], ['RANGE', rng], ['RELIABILITY', rel]].forEach(([k, v], i) => { const y = 208 + i * 10; h.text(120, y, k, { color: 'mist' }); h.rect(200, y, 120, 6, 'night'); h.rect(200, y, Math.round(120 * clamp(v, 0, 1)), 6, 'orange'); });
        h.text(344, 208, own ? 'TAKEN' : `${w.price} STONES`, { color: own ? 'lime' : 'white' });
      } else if (it.kind === 'throw') {
        const t = THROWABLES[it.id]; h.text(0, 190, t.name, { anchor: 'top', scale: 2, color: 'sand' }); h.text(0, 212, `${t.price} STONE EACH, CARRY ${t.carry}`, { anchor: 'top' });
      } else { const u = UPGRADES.find((x) => x.id === it.id); h.text(0, 190, u.name, { anchor: 'top', scale: 2, color: 'sand' }); h.text(0, 212, u.about, { anchor: 'top' }); h.text(0, 224, g.player.upgrades[it.id] ? 'TAKEN' : `${u.price} STONES`, { anchor: 'top', color: g.player.upgrades[it.id] ? 'lime' : 'white' }); }
      h.text(24, 14, `STONES ${g.player.stones}`, { color: 'sand' });
      g.hud.footer([['left', 'LOOK'], ['confirm', 'BUY OR TAKE'], ['back', 'LEAVE']]);
    } };
  return s;
}
export function boardScreen(g) {
  const items = () => { const a = g.missions.available().map((m) => ({ label: m.title, small: true, action: () => { g.ui.pop(); g.offerMission(m); } })); if (!a.length) a.push({ label: 'NOTHING TODAY', small: true, action: () => g.ui.pop() }); return a; };
  return { id: 'board', title: 'THE NOTICE BOARD', dim: true, items };
}
