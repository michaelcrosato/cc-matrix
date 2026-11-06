// game.state(): one plain JSON snapshot for every test (section 4).
export class StatePart {
  state() {
    const p = this.player, m = this.missions, g = this.combat.current(), w = this.world, top = this.ui.top;
    return {
      mode: this.mode, screen: top?.id ?? null, focus: top?.focus ?? 0, device: this.device, glyphSet: this.settings.glyphs, notice: this.gateActive() || top?.id === 'touch-gate' ? 'Controller or keyboard required' : null, attract: this.attract.active,
      mission: m.active?.id ?? null, step: m.stepI, stepText: m.step?.text ?? null, hp: p.hp, stones: p.stones, tablets: p.tablets, syrettes: p.syrettes,
      weapon: g ? { id: g.id, cond: g.cond, jammed: !!g.jammed, mag: g.mag, reserve: g.reserve } : null, fever: this.body.fever, feverActive: this.body.feverActive,
      pos: [p.x, p.y, p.z], yaw: this.ctx.camera.yaw, vehicle: p.vehicle ? { type: p.vehicle.type, hp: p.vehicle.hp, speed: p.vehicle.v.speed, stalled: p.vehicle.stalled } : null, hour: w.hour, day: w.day, wind: { x: w.wind.x, z: w.wind.z, speed: w.wind.speed }, weather: w.weather,
      fire: { burning: w.fire.burning.length, burnt: w.fire.burntCount }, prompts: [...this.hud.prompts], subtitle: this.talk.subtitle()?.text ?? null, buddies: Object.fromEntries(Object.entries(this.buddies.state).map(([k, v]) => [k, { met: v.met, alive: v.alive, trust: v.trust }])), ledger: this.ledgerNow(), done: { ...this.story.done }, truceOver: !!this.story.truceOver, ending: this.story.ending, music: this.ctx.audio.volume.music,
      actors: this.actors.list.length, mapUp: p.mapUp, waypoint: this.waypoint, round: this.net?.summary?.() ?? null,
    };
  }
}
