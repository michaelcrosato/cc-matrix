// Saves: the engine's slots and autosave (game.saves). The world is stored as its difference from the generated base;
// everything else is plain data. A siege keeps an in-memory checkpoint to retry from.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
const rle = a => { const out = []; let v = a[0], n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === v) n++; else { out.push(v, n); v = a[i]; n = 1; } } out.push(v, n); return out; };
const unrle = (r, len) => { const a = new Uint8Array(len); let k = 0; for (let i = 0; i < r.length; i += 2) { a.fill(r[i], k, k + r[i + 1]); k += r[i + 1]; } return a; };
const Save = DQ.Save = {
  VERSION: 1,
  write(ctx) {
    if (!ctx || ctx.mode !== 'story') return null;
    const b = ctx.builder;
    const data = { v: 1, seed: ctx.seed, world: ctx.world.diff(), objects: ctx.objects.serialize(),
      builder: { name: b.name, look: b.look, x: b.x, y: b.y, z: b.z, hp: b.hp, belly: b.belly, heartpatches: b.heartpatches, equip: b.equip, hot: b.hot, facing: b.facing },
      bag: b.bag.serialize(), town: ctx.town.serialize(), residents: ctx.npcs.serialize(), quests: ctx.quests.serialize(), crafting: ctx.crafting.serialize(), rooms: ctx.rooms.serialize(),
      clock: ctx.clock.serialize(), stats: Object.assign({}, ctx.stats), explored: rle(ctx.explored), flags: Object.assign({}, ctx.flags), drops: ctx.drops.serialize(), tangles: ctx.combat.serialize().tangles,
      siege: ctx.siege.active ? { active: true, phase: ctx.siege.phase, wave: ctx.siege.wave } : null, zoom: ctx.zoomI };
    const reg = DQ.regionAt(b.cx, b.cy, ctx);
    return { data, place: reg ? reg.name : 'Thimbleton', level: ctx.town.planted ? 'Town Lv ' + ctx.town.level : 'No town yet' };
  },
  /** restore a save into a freshly made context (its base world already generated from the seed) */
  apply(ctx, d) {
    const w = ctx.world;
    w.applyDiff(d.world || []);
    ctx.objects.load(d.objects || { list: [] });
    Object.assign(ctx.flags, d.flags || {});
    ctx.crafting.load(d.crafting);
    ctx.town.load(d.town);
    ctx.rooms.load(d.rooms);
    ctx.npcs.load(d.residents);
    ctx.quests.load(d.quests);
    ctx.clock.load(d.clock);
    Object.assign(ctx.stats, d.stats || {});
    if (d.explored) ctx.explored = unrle(d.explored, w.W * w.D);
    const b = ctx.builder, s = d.builder || {};
    b.bag.load(d.bag); b.name = DQ.safe(s.name || b.name); b.heartpatches = s.heartpatches || 0; b.equip = Object.assign({ weapon: 'darningStick', body: null, shield: null }, s.equip || {}); b.applyEquipLook();
    b.place3(s.x, s.y, s.z); b.hp = Math.min(b.maxHp, s.hp || b.maxHp); b.belly = s.belly === undefined ? 100 : s.belly; b.hot = s.hot || 0; b.facing = s.facing || 0;
    ctx.drops.load(d.drops);
    for (const [x, y, z, t] of d.tangles || []) ctx.combat.tangles.push({ x, y, z, t });
    if (ctx.flags.boss_buttonGolem) { for (const m of ctx.bosses.list) m.dead = true; }
    if (ctx.flags.dark) ctx.flags.dark = false;
    ctx.rooms.timer = 0; ctx.rooms.detect();
    for (const p of ctx.town.patterns) ctx.town.checkPattern(p);
    if (d.zoom !== undefined) ctx.zoomI = d.zoom;
    return ctx;
  },
  migrate(data, from) { if (from === 1 || !from) return data; return data; },
  canSave(ctx) {
    if (!ctx || ctx.mode !== 'story' || ctx.cutscene || (ctx.siege && ctx.siege.active) || (ctx.builder && ctx.builder.ko)) return false;
    const b = ctx.builder; return !ctx.monsters.list.some(m => !m.dead && Math.hypot(m.x - b.x, m.y - b.y) < 12 * T);
  },
  tick(ctx, dt) {
    const G = DQ.game; if (!G.saves) return; G.saves.canSave = Save.canSave(ctx);
    ctx._autoT = (ctx._autoT || 0) + dt; if (ctx._autoT >= 300 && G.saves.canSave) { ctx._autoT = 0; Save.autosave('timer'); }
  },
  autosave(reason) { const G = DQ.game; if (!G.saves || DQ.HUB || !DQ.ctx || DQ.ctx.mode !== 'story') return false; if (!Save.canSave(DQ.ctx) && reason !== 'slept' && reason !== 'quest') return false; const ok = G.saves.autosave(); if (ok && DQ.ctx.hud && reason !== 'timer') DQ.ctx.hud.toast('Autosaved.', null, 'autosave'); return ok; },
  checkpoint(name) { const ctx = DQ.ctx; if (!ctx) return; const w = Save.write(ctx); if (w) { w.data.siege = null; (ctx.checkpoints || (ctx.checkpoints = {}))[name] = JSON.stringify(w.data); Save.autosave('checkpoint'); } },
  restoreCheckpoint(name) {
    const ctx = DQ.ctx, txt = ctx && ctx.checkpoints && ctx.checkpoints[name]; if (!txt) return false;
    const cps = ctx.checkpoints, data = JSON.parse(txt);
    DQ.game.go('play', { saveData: data, checkpoints: cps, then: () => { DQ.ctx.checkpoints = cps; DQ.ctx.siege.begin({ prep: 20 }); } });
    return true;
  }
};
})();
