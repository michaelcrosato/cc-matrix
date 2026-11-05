// Saves: the engine's slots (3 and an autosave). Only the world's differences from its seed are stored.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = 16;
DQ.Save = {
  VERSION: 1,
  migrate(data, from) { if (from > DQ.Save.VERSION) return null; return data; },   // version 1 is the only one yet: identity
  // everything a save holds
  write(ctx) {
    const b = ctx.builder, reg = b ? DQ.regionAt(Math.floor(b.body.x / T), Math.floor(b.body.y / T)) : 'glen';
    return {
      data: { v: DQ.Save.VERSION, seed: DQ.SEED, world: ctx.world.diff(), objects: ctx.objects.serialize(), discovered: [...ctx.objects.discovered],
        builder: b.serialize(), crafting: ctx.crafting.serialize(), town: ctx.town.serialize(), rooms: ctx.rooms.serialize(), residents: ctx.npcs.serialize(),
        quests: ctx.quests.serialize(), clock: ctx.clock.serialize(), stats: Object.assign({}, ctx.stats), flags: JSON.parse(JSON.stringify(ctx.flags)), kills: Object.assign({}, ctx.combat.kills),
        explored: DQ.Save.rle(ctx.explored), fixed: ctx.monsters.serialize(), temps: ctx.temps || [], pending: ctx.pendingArrival || null, waypoint: ctx.waypoint || null, played: ctx.stats.playTime },
      place: (DQ.WORLD.regions[reg] || {}).name || 'Thimbleton', level: ctx.town.planted ? 'Town Lv ' + ctx.town.level : 'Chapter One'
    };
  },
  // a fresh session from the seed, then the save laid over it
  read(ctx, d) {
    ctx.world.applyDiff(d.world || []); ctx.world.recomputeTops();
    ctx.objects.load(d.objects || []); ctx.objects.discovered = new Set(d.discovered || []);
    ctx.crafting.load(d.crafting || {}); Object.assign(ctx.flags, d.flags || {});
    ctx.builder.load(d.builder); ctx.town.load(d.town || {}); ctx.npcs.load(d.residents || []);
    ctx.quests.load(d.quests || {}); ctx.clock.load(d.clock || {}); Object.assign(ctx.stats, d.stats || {}); ctx.combat.kills = Object.assign({}, d.kills || {});
    if (d.explored) ctx.explored = DQ.Save.unrle(d.explored, ctx.world.W * ctx.world.D);
    for (const m of ctx.monsters.list.slice()) if (m.fixed) { m.dead = true; m.deadT = 99; }
    ctx.monsters.list = ctx.monsters.list.filter(m => !m.fixed);
    for (const f of d.fixed || []) { const m = ctx.monsters.spawn(f.id, f.x, f.y, f.z, { fixed: true, tag: f.tag }); if (f.id === 'buttonGolem') m.awake = true; }
    ctx.temps = d.temps || []; ctx.pendingArrival = d.pending || null; ctx.waypoint = d.waypoint || null;
    ctx.rooms.load(d.rooms || {});
    if (ctx.flags.lintwickFreed && !ctx.flags.lintwickHome && ctx.npcs.get('lintwick')) ctx.npcs.get('lintwick').follow = ctx.builder;
    if (ctx.flags.siegeStarted && !ctx.flags.siegeDone) { ctx.flags.siegeStarted = false; ctx.quests.st('m13').step = Math.min(ctx.quests.st('m13').step, 1); }
    ctx.game.cam.snap = true;
  },
  rle(a) { const out = []; let v = a[0], n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === v) n++; else { out.push(v, n); v = a[i]; n = 1; } } out.push(v, n); return out; },
  unrle(r, len) { const a = new Uint8Array(len); let k = 0; for (let i = 0; i < r.length; i += 2) for (let j = 0; j < r[i + 1] && k < len; j++) a[k++] = r[i]; return a; }
};
// the session's save handle: autosaves, the siege checkpoint, can-save rules
DQ.SaveHandle = class {
  constructor(ctx) { this.ctx = ctx; this.checkpoints = {}; }
  canSave() { const ctx = this.ctx, b = ctx.builder; if (!b || ctx.inHub || ctx.mode !== 'story' || ctx.cutscene || ctx.siege.active || b.ko) return false; return !ctx.monsters.list.some(m => !m.dead && Math.hypot(m.body.x - b.body.x, m.body.y - b.body.y) < 12 * T); }
  auto(why) { const g = this.ctx.game; if (this.ctx.inHub || this.ctx.mode !== 'story' || !g.saves) return false; try { if (why !== 'timer' && !this.canSave() && why !== 'checkpoint') return false; return g.saves.save('auto', DQ.Save.write(this.ctx)); } catch (e) { DQ.fail('autosave', e); return false; } }
  checkpoint(name) { this.checkpoints[name] = JSON.parse(JSON.stringify(DQ.Save.write(this.ctx).data)); try { this.ctx.game.saves.save('auto', { data: this.checkpoints[name], place: 'Thimbleton', level: 'Siege checkpoint' }); } catch (e) { /* storage */ } }
  restoreCheckpoint(name) { const d = this.checkpoints[name]; if (!d) return false; this.ctx.game.go('play', { load: { data: JSON.parse(JSON.stringify(d)) }, retry: true }); return true; }
};
})();
