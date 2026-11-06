// Screens: choices, Tibor's rack, locker, bed, notice board, halts, wall, ledger, game over, ending card, credits. Title and pause live in shell.js.
import { THREE, buildModel, setLookLayer, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { WEAPONS, THROWN, UPGRADES, SLOT_ORDER } from '../content/weapons.js';
import { Menu, SAFE_X, SAFE_Y } from './menu.js';
import { rackDefs } from '../art/viewmodels.js';
import { SITES, HALTS } from '../content/sites.js';
import { MISSIONS } from '../content/missions.js';
import { LINES } from '../content/dialogue.js';
import { EPIGRAPHS } from '../content/notes.js';
import { drawGlyph, glyphWidth } from './glyphs.js';
import { wrap } from './pixfont.js';
import { clamp } from '../core/rng.js';
const TIMES = { DAWN: 5.5, NOON: 12, DUSK: 18, MIDNIGHT: 0 };
export class UI {
  constructor(game) { this.game = game; this.menu = new Menu(game); }
  get open() { return this.menu.open; }
  // ---- two big buttons at most ----
  choice(title, options, { noBack = true } = {}) {
    const g = this.game;
    const s = {
      id: 'choice', title, overlayWorld: true, noBack,
      items: options.map((o) => ({ id: o.id ?? o.label, label: o.label, onSelect: () => { this.menu.pop(); o.onSelect?.(); } })),
      draw: (hud, m, sc) => {
        const y0 = hud.height - 96;
        hud.rect(0, y0 - 16, hud.width, 90, 'ink');
        hud.text(((hud.width - title.length * 12) / 2) | 0, y0 - 12, title, { scale: 2, color: 'sand', shadow: false });
        let y = y0 + 8;
        sc.items.forEach((it, i) => {
          const focused = sc.focus === i;
          hud.rect(60, y, hud.width - 120, 20, focused ? 'orange' : 'night');
          hud.text(((hud.width - it.label.length * 12) / 2) | 0, y + 3, it.label, { scale: 2, color: focused ? 'ink' : 'white', shadow: false });
          m.regions.push({ x: 60, y, w: hud.width - 120, h: 20, index: i });
          y += 24;
        });
        m.footer(hud, sc);
      },
      hints: [['confirm', 'CHOOSE']],
    };
    this.menu.push(s);
    return s;
  }
  // ---- Bed ----
  openBed(key) {
    const g = this.game, opts = Object.entries(TIMES);
    this.menu.push({
      id: 'bed', title: 'SLEEP UNTIL', subtitle: 'IT SAVES. THE FEVER DOES NOT SLEEP.', overlayWorld: true,
      items: [...opts.map(([label, h]) => ({ id: label.toLowerCase(), label, onSelect: () => { this.menu.pop(); g.sleepTo(h, key); } })), { id: 'leave', label: 'LEAVE', onSelect: () => this.menu.pop() }],
    });
  }
  // ---- Locker: one row per slot, left/right picks ----
  openLocker() {
    const g = this.game, w = g.weapons;
    const row = (slot) => {
      const options = Object.values(WEAPONS).filter((d) => d.slot === slot && g.story.unlocked.has(d.id)).map((d) => d.id);
      return {
        id: slot, label: slot.toUpperCase(),
        choices: { options: options.length ? options : ['none'], get: () => w.slots[slot]?.id ?? (options[0] ?? 'none'), set: (id) => { if (id !== 'none') { w.give(id, 100, slot === w.current); } }, format: (id) => (id === 'none' ? 'NOTHING' : WEAPONS[id].name) },
      };
    };
    this.menu.push({
      id: 'locker', title: 'LOCKER', subtitle: 'WHAT YOU HAVE BOUGHT COMES CLEAN. HE KEEPS IT THAT WAY.', overlayWorld: true,
      items: () => [row('sidearm'), row('main'), row('special'), ...(g.story.stockInLockers ? [{ id: 'stock', label: "TIBOR'S STOCK", onSelect: () => this.openRack() }] : []), { id: 'done', label: 'CLOSE', onSelect: () => this.menu.pop() }],
      hints: [['menuLeft', 'CHOOSE'], ['back', 'CLOSE']],
    });
  }
  openWall() {
    const g = this.game;
    const dead = g.actors.buddies.filter((b) => b.dead);
    g.dialogue.play(dead.length ? [['', `SCRATCHED INTO THE PLANK: ${dead.map((b) => b.name).join(', ')}.`], ['', 'A GUN LEANS UNDER IT. NOBODY HAS TOUCHED IT.']] : 'wall.empty');
  }
  // ---- Tibor's rack: one gun at a time, large, three bars ----
  rackList() {
    const out = [];
    for (const d of Object.values(WEAPONS)) if (d.price > 0) out.push({ kind: 'gun', id: d.id, name: d.name, price: d.price, def: d });
    out.push({ kind: 'throw', id: 'molotov', name: 'BOTTLE', price: THROWN.molotov.price, about: 'A RAG AND SOMETHING THAT BURNS. CARRY THREE.' });
    out.push({ kind: 'throw', id: 'charge', name: 'REMOTE CHARGE', price: THROWN.charge.price, about: 'HOLD THROW TO PLANT. THROW AGAIN TO REGRET IT.' });
    for (const u of Object.values(UPGRADES)) out.push({ kind: 'up', id: u.id, name: u.name, price: u.price, about: u.about });
    return out;
  }
  owned(item) {
    const g = this.game;
    if (item.kind === 'gun') return g.story.unlocked.has(item.id);
    if (item.kind === 'up') return !!g.story.flags[`up-${item.id}`];
    return false;
  }
  buy(item) {
    const g = this.game, st = g.story, w = g.weapons;
    if (item.kind === 'gun' && st.unlocked.has(item.id)) { w.give(item.id, 100, true); g.events.emit('rack-take', item.id); return true; }
    if (this.owned(item)) return false;
    if (st.stones < item.price) { g.sfx.play('ui-back'); g.notice('HE SHAKES HIS HEAD. NOT ENOUGH STONES.', 2); return false; }
    st.stones -= item.price;
    if (item.kind === 'gun') { st.unlocked.add(item.id); w.give(item.id, 100, true); }
    else if (item.id === 'molotov') { st.unlocked.add('molotov'); w.bottles = Math.min(3, w.bottles + 1); }
    else if (item.id === 'charge') w.charges = Math.min(2, w.charges + 1);
    else if (item.id === 'cleaning') { st.flags['up-cleaning'] = true; w.hasCleaning = true; }
    else if (item.id === 'pouch') { st.flags['up-pouch'] = true; g.body.maxSyrettes = 5; g.body.syrettes = Math.max(g.body.syrettes, 3); }
    else if (item.id === 'belt') { st.flags['up-belt'] = true; w.hasBelt = true; }
    else if (item.id === 'vkit') { st.flags['up-vkit'] = true; g.vehicles.hasKit = true; }
    g.sfx.play('ui-stone');
    g.events.emit('bought', item.id);
    return true;
  }
  openRack() {
    const g = this.game, ctx = g.ctx, list = this.rackList();
    const pivot = new THREE.Group();
    const cam = ctx.camera.camera;
    cam.add(pivot);
    pivot.position.set(0.12, 0.09, -0.98);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.6), toonMaterial(PALETTE.plum));
    table.position.set(0, -0.2, 0);
    table.frustumCulled = false;
    pivot.add(table);
    setLookLayer(table, 'actors');
    let shown = null;
    const showGun = (item) => {
      if (shown) { pivot.remove(shown); shown = null; }
      if (item.kind !== 'gun') return;
      const b = buildModel(rackDefs[item.id]);
      setLookLayer(b.object, 'actors');
      b.object.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
      b.object.rotation.y = Math.PI / 2;
      b.object.position.x = 0.18; b.object.position.y = -0.08;
      pivot.add(b.object);
      shown = b.object;
    };
    const line = g.dialogue.pick('tibor.idle');
    const s = {
      id: 'rack', title: "TIBOR'S RACK", index: 0, overlayWorld: true, list, dim: 0,
      onOpen: () => { g.vm.setVisible(false); showGun(list[0]); if (line) { g.say('tibor', line, 3); g.voice.say('tibor', line); } },
      onClose: () => { cam.remove(pivot); g.vm.setVisible(!g.player.seat); },
      onSide: (d, sc) => { sc.index = (sc.index + d + list.length) % list.length; showGun(list[sc.index]); g.sfx.play('ui-move'); },
      update: (c, dt, sc) => { pivot.rotation.y = Math.sin(this.menu.frame * 0.015) * 0.2; pivot.rotation.x = 0.22; },
      items: (sc) => {
        const it = list[sc.index];
        const verb = it.kind === 'gun' && g.story.unlocked.has(it.id) ? 'TAKE A CLEAN ONE' : this.owned(it) ? 'YOU HAVE IT' : `BUY FOR ${it.price}`;
        return [{ id: 'buy', label: verb, enabled: !(this.owned(it) && it.kind !== 'gun') && (this.owned(it) || g.story.stones >= it.price), focusable: true, onSelect: () => this.buy(it) }, { id: 'leave', label: 'LEAVE', onSelect: () => this.menu.pop() }];
      },
      hints: [['menuLeft', 'NEXT'], ['confirm', 'CHOOSE'], ['back', 'LEAVE']],
      draw: (hud, m, sc) => {
        const it = list[sc.index];
        m.title(hud, { title: it.name });
        hud.text(hud.width - SAFE_X - `${g.story.stones} STONES`.length * 6, SAFE_Y + 4, `${g.story.stones} STONES`, { color: 'sand' });
        let y = hud.height - 112;
        if (it.kind === 'gun') {
          for (const [lab, v] of [['DAMAGE', it.def.damageBar], ['RANGE', it.def.rangeBar], ['RELIABILITY', it.def.reliabilityBar]]) {
            hud.text(SAFE_X, y, lab, { color: 'white' });
            for (let i = 0; i < 5; i++) hud.rect(SAFE_X + 78 + i * 16, y, 14, 7, i < v ? 'sand' : 'night');
            y += 11;
          }
        } else { for (const l of wrap(it.about, hud.width - SAFE_X * 2)) { hud.text(SAFE_X, y, l, { color: 'white' }); y += 10; } y = hud.height - 79; }
        const items = m.itemsOf(sc);
        y = hud.height - 76;
        items.forEach((row, i) => { y += m.itemRow(hud, row, i, y, sc.focus === i); });
        m.regions.push({ x: 0, y: 30, w: hud.width / 3, h: 90, action: () => sc.onSide(-1, sc) });
        m.regions.push({ x: (hud.width * 2) / 3, y: 30, w: hud.width / 3, h: 90, action: () => sc.onSide(1, sc) });
        m.footer(hud, sc);
      },
    };
    this.menu.push(s);
  }
  // ---- The notice board: contracts, one at a time ----
  openBoard() {
    const g = this.game;
    const list = g.missions.available();
    const items = list.slice(0, 5).map((m) => ({ id: m.id, label: m.title, small: true, enabled: !g.missions.active, onSelect: () => { this.menu.pop(); g.missions.offer(m, null); } }));
    items.push({ id: 'leave', label: 'LEAVE', onSelect: () => this.menu.pop() });
    this.menu.push({ id: 'board', title: 'NOTICE BOARD', subtitle: list.length ? 'WORK. THE PAPER IS OLDER THAN THE WAR.' : 'NOTHING TODAY. THE NAILS ARE STILL GOOD.', overlayWorld: true, items });
  }
  // ---- Rail halts ----
  openHalts(from) {
    const g = this.game;
    const items = Object.entries(HALTS).filter(([k]) => k !== from).map(([k, h]) => ({ id: k, label: h.name, enabled: g.story.halts.has(k) && g.story.stones >= 1, focusable: true, onSelect: () => { this.menu.pop(); g.railTravel(k); } }));
    items.push({ id: 'leave', label: 'LEAVE', onSelect: () => this.menu.pop() });
    this.menu.push({ id: 'halts', title: HALTS[from].name, subtitle: 'ONE STONE. ONE HOUR. YOU WILL HEAR ABOUT IT.', overlayWorld: true, items });
  }
  // ---- Bakr on a black screen with clacking wheels ----
  blackTalk(text, who, seconds, onEnd) {
    const g = this.game;
    let t = 0;
    const s = { id: 'black', cover: true, noBack: true, hints: [['confirm', 'SKIP']], items: [], onConfirm: () => { t = seconds; },
      update: (c, dt) => { t += dt; if (t >= seconds) { this.menu.pop(); onEnd(); } },
      tapAnywhere: () => { t = seconds; },
      draw: (hud, m, sc) => { m.footer(hud, sc); const lines = wrap(text, hud.width - 80); let y = (hud.height / 2 - lines.length * 5) | 0; if (who) hud.text(40, y - 12, who, { color: 'sand' }); for (const l of lines) { hud.text(40, y, l, { color: 'white' }); y += 10; } } };
    this.menu.push(s);
  }
  // ---- The Ledger ----
  openLedger(onClose) {
    const g = this.game;
    this.menu.push({
      id: 'ledger', overlayWorld: true, onBack: () => { this.menu.pop(); onClose?.(); },
      hints: [['back', 'CLOSE']], items: [],
      onConfirm: () => { this.menu.pop(); onClose?.(); },
      draw: (hud, m, sc) => {
        hud.rect(30, 10, hud.width - 60, hud.height - 30, 'sand');
        hud.rect(32, 12, hud.width - 64, hud.height - 34, 'mist');
        hud.rect(34, 14, hud.width - 68, hud.height - 38, 'sand');
        hud.text(44, 20, 'THE LEDGER', { scale: 2, color: 'plum', shadow: false });
        let y = 42;
        for (const l of g.ledger.lines()) {
          hud.text(44, y, l.big, { scale: 2, color: 'ink', shadow: false });
          hud.text(44, y + 16, l.small, { color: 'plum', shadow: false });
          y += 34;
        }
        hud.text(hud.width - 44 - 6 * 5, hud.height - 40, 'E.H.', { color: 'plum', shadow: false });
        m.footer(hud, sc);
      },
    });
  }
  // ---- Game over ----
  openGameOver() {
    const g = this.game;
    this.menu.push({
      id: 'gameover', dim: 0.85, sheet: true, noBack: true,
      items: () => [{ id: 'continue', label: 'CONTINUE', enabled: g.save.exists() || !!g.save.lastWritten, onSelect: () => { this.menu.clear(); g.save.requestLoad(); } }, { id: 'title', label: 'TITLE', onSelect: () => { this.menu.clear(); g.toTitle(); } }],
      draw: (hud, m, sc) => {
        const t1 = 'YOU DIED IN THE SORREL.', t2 = 'THE PAPERWORK WILL TAKE LONGER.';
        hud.text(((hud.width - t1.length * 12) / 2) | 0, 70, t1, { scale: 2, color: 'red' });
        hud.text(((hud.width - t2.length * 6) / 2) | 0, 92, t2, { color: 'mist' });
        let y = 136;
        m.itemsOf(sc).forEach((it, i) => { y += m.itemRow(hud, it, i, y, sc.focus === i); });
        m.footer(hud, sc);
      },
    });
  }
  // ---- Ending card, then Ledger, then credits, then title ----
  openEnding(sheet) {
    const g = this.game;
    const text = sheet === 'column'
      ? 'THEY CROSSED AT FIRST LIGHT, WALKING ON ASH. NOBODY HAS ASKED WHO LIT IT. THE FEVER IS NOT FINISHED WITH YOU, AND YOU ARE OUT OF TABLETS. IT IS A GOOD VIEW.'
      : 'YOU REACHED THE BORDER WITH A CASE OF STONES AND A MAP NOBODY ELSE WILL EVER USE. THE GUARD ASKS YOUR TRADE. YOU TELL HIM: SURVEYOR.';
    this.menu.clear();
    this.menu.push({
      id: 'ending', dim: 0.85, sheet: true, noBack: true, items: [], hints: [['confirm', 'GO ON']],
      onConfirm: () => { this.menu.pop(); this.openLedger(() => this.openCredits(() => g.toTitle())); },
      tapAnywhere: function () { this.onConfirm(); },
      draw: (hud, m, sc) => {
        const lines = wrap(text, hud.width - 100);
        let y = (hud.height / 2 - lines.length * 6) | 0;
        for (const l of lines) { hud.text(50, y, l, { color: 'white' }); y += 12; }
        m.footer(hud, sc);
      },
    });
    g.events.emit('ending-card', sheet);
  }
  openCredits(onDone) {
    const g = this.game;
    const pages = g.about.creditPages();
    this.menu.push({ id: 'credits', dim: 0.85, sheet: true, title: 'CREDITS', pages, items: [], onBack: () => { this.menu.pop(); onDone?.(); }, hints: [['menuRight', 'PAGE'], ['back', 'DONE']], onConfirm: (s) => { if (s.page < s.pages.length - 1) this.menu.turnPage(s, 1); else { this.menu.pop(); onDone?.(); } } });
  }
  /** A black screen with one Harrow epigraph. */
  epigraph(seconds, onEnd) {
    const g = this.game;
    const line = EPIGRAPHS[g.rng.look.int(0, EPIGRAPHS.length - 1)];
    let t = 0;
    this.menu.push({ id: 'epigraph', cover: 'ink', noBack: true, items: [], hints: [['confirm', 'SKIP']], text: line, onConfirm: () => { t = seconds; }, tapAnywhere: () => { t = seconds; },
      update: (c, dt) => { t += Math.max(dt, 1 / 60); if (t >= seconds) { this.menu.pop(); onEnd?.(); } },
      draw: (hud, m, sc) => { m.footer(hud, sc); const lines = wrap(line, hud.width - 100); let y = (hud.height / 2 - lines.length * 6) | 0; for (const l of lines) { hud.text(50, y, l, { color: 'mist' }); y += 12; } hud.text(50, y + 8, "FROM HARROW'S FIELD NOTES", { color: 'slate' }); } });
  }
  update(ctx, realDt) { this.menu.update(ctx, realDt); }
  draw(hud) { this.menu.draw(hud); }
}
