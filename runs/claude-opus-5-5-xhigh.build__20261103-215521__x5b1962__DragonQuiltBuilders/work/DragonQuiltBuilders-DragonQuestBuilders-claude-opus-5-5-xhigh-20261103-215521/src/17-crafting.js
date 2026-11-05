// Crafting: known recipes (Notions), what a station offers, have/need with alternates, crafting, and the Notion triggers.
(() => {
const DQ = globalThis.DQ;
class Crafting {
  constructor(ctx) { this.ctx = ctx; this.known = new Set(); this.seen = new Set(); this.queue = []; this.allKnown = false; }
  knows(id) { return this.allKnown || this.ctx.dev.creative || this.known.has(id); }
  /** learn a recipe: the Notion popup, the thinking pose, the jingle */
  learn(id, o = {}) {
    if (this.known.has(id)) return false;
    const r = DQ.recipe(id); if (!r) return false;
    this.known.add(id);
    if (!o.silent && !this.ctx.quiet) {
      const it = DQ.ITEMS[r.out], st = DQ.STATIONS[r.station];
      const where = r.station === 'pocket' ? 'Craft it from your Bag (Pocket Notions).' : 'Craft it at a ' + st + '.';
      this.ctx.events.emit('notion', { id, out: r.out });
      if (this.ctx.hud) this.ctx.hud.notion(r.out, 'You\'ve got a notion!', it.name + '. ' + where);
      const b = this.ctx.builder; if (b && !b.anim) { b.anim = { kind: 'notion', t: 0, dur: 1 }; b.thought = { item: r.out, t: 2 }; }
    }
    return true;
  }
  /** fire a Notion trigger: on 'pickup' | 'quest' | 'level' | 'flag' | 'placed' | 'start', key */
  trigger(on, key) {
    if (on === 'pickup') this.seen.add(key);
    const lv = this.ctx.town ? this.ctx.town.level : 1;
    for (const r of DQ.RECIPES) {
      const n = r.notion; if (!n || this.known.has(r.id)) continue;
      let ok = false;
      if (n.on === on && (n.key === key || (on === 'level' && typeof n.key === 'number' && n.key <= key))) ok = true;
      if (n.on === 'pickup' && n.level && this.seen.has(n.key) && lv >= n.level) ok = true;
      if (ok && n.level && lv < n.level) ok = false;
      if (ok) this.learn(r.id);
    }
  }
  /** recipes known for a station (pocket: from the Bag) */
  forStation(st) { return DQ.RECIPES.filter(r => r.station === st && this.knows(r.id)); }
  /** what a recipe needs: [{ id, need, have, alt }] for n crafts */
  needs(r, bag, n = 1) {
    return Object.keys(r.in).map(id => {
      const need = r.in[id] * n, alt = r.alt && r.alt[id], have = bag.count(id) + (alt ? bag.count(alt) : 0);
      return { id, need, have, alt };
    });
  }
  maxCraft(r, bag) { let m = 99; for (const id in r.in) { const alt = r.alt && r.alt[id]; m = Math.min(m, Math.floor((bag.count(id) + (alt ? bag.count(alt) : 0)) / r.in[id])); } return Math.max(0, m); }
  can(r, bag, n = 1) { return this.maxCraft(r, bag) >= n; }
  /** craft n: inputs consumed (the alternate first used up where it stands in), outputs added */
  craft(id, n, builder, o = {}) {
    const r = typeof id === 'string' ? DQ.recipe(id) : id, bag = builder.bag;
    if (!r || !this.knows(r.id) || !this.can(r, bag, n)) return 0;
    for (const k in r.in) {
      let need = r.in[k] * n; const alt = r.alt && r.alt[k];
      const own = Math.min(need, bag.count(k)); if (own) bag.remove(k, own); need -= own;
      if (need && alt) bag.remove(alt, need);
    }
    const left = bag.add(r.out, r.n * n);
    if (left && this.ctx.drops) this.ctx.drops.spawn(r.out, left, builder.x, builder.y, builder.z + 10);
    this.ctx.stats.crafted += n;
    this.ctx.events.emit('crafted', { id: r.out, recipe: r.id, n: r.n * n, by: builder, station: o.station || null });
    this.ctx.events.emit('itemGained', { id: r.out, n: r.n * n, by: builder, crafted: true });
    if (!o.quiet) {
      DQ.sfx('craft'); builder.anim = { kind: 'craft', t: 0, dur: .5 };
      const s = o.station; if (s && DQ.game) DQ.game.particles.glints(s.x * 16 + 8, s.y * 16 + 8, s.z * 16 + 16, 8, '#fff6c0', 12);
      if (this.ctx.hud) { this.ctx.hud.toast('You made ' + (r.n * n > 1 ? r.n * n + ' ' : 'a ') + DQ.ITEMS[r.out].name + '!', r.out); this.ctx.hud.itemPop(r.out, o.station); }
    }
    return r.n * n;
  }
  serialize() { return { known: [...this.known], seen: [...this.seen] }; }
  load(d) { this.known = new Set((d && d.known) || []); this.seen = new Set((d && d.seen) || []); }
}
DQ.Crafting = Crafting;
})();
