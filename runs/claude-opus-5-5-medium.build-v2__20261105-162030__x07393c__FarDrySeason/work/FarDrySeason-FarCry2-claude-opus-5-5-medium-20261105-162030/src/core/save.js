// A single slot of versioned JSON. Written on sleep and on mission complete; read through input.send so replays stay exact.
const KEY = 'far-dry-season-save-v1';
const store = () => (typeof localStorage !== 'undefined' ? localStorage : null);
export class Save {
  disabled = false; ram = null;
  constructor(game) { this.game = game; }
  exists() { if (this.ram) return true; try { return !!store()?.getItem(KEY); } catch { return false; } }
  serialize() {
    const g = this.game, p = g.player, w = g.world;
    return {
      v: 1, story: { ...g.story, m6PartnerActor: undefined, bridgeCharge: undefined }, buddies: g.buddies.state,
      player: { x: p.x, z: p.z, hp: p.hp, stones: p.stones, tablets: p.tablets, syrettes: p.syrettes, molotovs: p.molotovs, charges: p.charges, guns: p.guns, slot: p.slot, upgrades: p.upgrades, unlocked: p.unlocked },
      world: { hour: w.hour, total: w.totalHours, day: w.day, fire: w.fire.encode(), cases: w.cases.filter((c) => c.taken).map((c) => c.id), sites: Object.fromEntries(Object.values(w.sites).map((s) => [s.id, [s.cleared, s.clearedAt]])) },
    };
  }
  write() {
    if (this.disabled || this.game.mode !== 'play') return false;
    const json = JSON.stringify(this.serialize()); this.ram = json;
    try { store()?.setItem(KEY, json); } catch { /* full or blocked: the slot stays in memory */ }
    this.game.notice('SAVED'); return true;
  }
  read() { if (this.ram) return this.ram; try { return store()?.getItem(KEY) ?? null; } catch { return null; } }
  /** Ask the engine to hand the save back next frame, as a command. */
  requestLoad() { const s = this.read(); if (s) this.game.ctx.input.send({ load: s }); }
  apply(json) {
    const data = JSON.parse(json), g = this.game, p = g.player, w = g.world;
    if (data.v !== 1) return false;
    g.beginCampaignState();
    Object.assign(g.story, data.story); g.buddies.state = data.buddies;
    Object.assign(p, { hp: data.player.hp, stones: data.player.stones, tablets: data.player.tablets, syrettes: data.player.syrettes, molotovs: data.player.molotovs, charges: data.player.charges, guns: data.player.guns, upgrades: data.player.upgrades, unlocked: data.player.unlocked });
    w.hour = data.world.hour; w.totalHours = data.world.total; w.day = data.world.day; w.sky.apply(w.hour, true);
    w.fire.decode(data.world.fire, data.world.total);
    for (const c of w.cases) if (data.world.cases.includes(c.id)) { c.taken = true; c.object.visible = false; }
    for (const [id, [cl, at]] of Object.entries(data.world.sites)) { const s = w.sites[id]; if (s) { s.cleared = cl; s.clearedAt = at; } }
    p.teleport(data.player.x, data.player.z);
    g.combat.select(data.player.slot, true);
    g.afterLoad();
    return true;
  }
  clear() { this.ram = null; try { store()?.removeItem(KEY); } catch { /* nothing to clear */ } }
}
