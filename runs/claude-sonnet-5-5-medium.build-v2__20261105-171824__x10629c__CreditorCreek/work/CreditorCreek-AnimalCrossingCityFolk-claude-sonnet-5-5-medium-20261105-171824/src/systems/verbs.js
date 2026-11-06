// Tools: net, rod, shovel, axe, watering can, slingshot. Each has anticipation, impact, a sound, a sparkle and usually a joke.
import { THREE, toonMaterial, PALETTE } from '../engine.js';
import { item, TOOLS } from '../data/items.js';
import { FISH, BUGS, FOSSILS, byId, timeOk } from '../data/collect.js';
import { tuning } from '../data/tuning.js';
import { TW, TD, T, waterKind } from '../world/townMap.js';
import { isWet } from '../core/calendar.js';
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const verbs = {
  fishing: null, netReady: false,
  update(g, dt) {
    const w = g.world, p = g.player, c = g.ui.c; if (!w || g.place === 'round') return; this.updateRings(g, dt);
    if (c.pressed('prevTool')) this.cycle(g, -1); if (c.pressed('nextTool')) this.cycle(g, 1);
    if (g.ctx.input.wheel) this.cycle(g, g.ctx.input.wheel > 0 ? 1 : -1);
    for (let i = 1; i <= 6; i++) if (g.ctx.input.wasPressed('Digit' + i) && w.tools[i - 1]) this.select(g, i - 1);
    const tool = w.tools[w.toolSel]; const down = g.ctx.input.isDown('PadSquare', 'Space', 'KeyF'); const pressed = g.ctx.input.wasPressed('PadSquare', 'Space', 'KeyF') || (c.ptr.right && c.device === 'kb');
    if (g.grace > 0 || g.ui.closedThisFrame) return;
    if (this.fishing) { this.fishTick(g, dt, pressed); return; }
    if (!tool) { if (pressed && !g.flags.escrow) { g.flags.escrow = true; g.say(null, "You can't jump. You're in escrow."); } return; }
    if (c.ptr.right && c.device === 'kb') { const gp = g.groundPoint(g.ctx.input.pointer.x, g.ctx.input.pointer.y); if (gp) p.faceToward(gp.x, gp.z); }
    if (tool === 'net') {
      if (down && !this.busy) { if (!this.netReady) { this.netReady = true; p.hold = 'NetReady'; g.sfx('net_ready'); } p.slow = 0.55; }
      else if (this.netReady && !down) { this.netReady = false; p.hold = null; p.slow = 1; this.swingNet(g); }
    } else { if (this.netReady) { this.netReady = false; p.hold = null; p.slow = 1; } if (pressed && !this.busy && !p.lock) this.useTool(g, tool); }
    if (tool !== 'net' && p.slow !== 1 && !this.netReady) p.slow = 1;
  },
  select(g, i) { g.world.toolSel = i; g.sfx('tick'); g.toolRingT = 1.2; },
  cycle(g, d) { const w = g.world; if (!w.tools.length) return; w.toolSel = (w.toolSel + d + w.tools.length) % w.tools.length; g.sfx('tick'); g.toolRingT = 1.2; },
  front(g, r = 0.9) { const p = g.player; const f = p.facing ?? { x: 0, z: 1 }; return { x: p.pos.x + f.x * r, z: p.pos.z + f.z * r, f }; },
  async swingNet(g) {
    this.busy = true; const p = g.player, w = g.world; await p.act('NetSweep', 0.45); const f = p.facing; g.sfx('net_swing');
    let caught = null; const near = (px, pz) => { const dx = px - p.pos.x, dz = pz - p.pos.z; const d = Math.hypot(dx, dz); if (d > 1.9 || d < 0.05) return d < 0.05; const dot = (dx * f.x + dz * f.z) / d; return dot > Math.cos(Math.PI / 4) && d < 1.9; };
    for (const b of g.sys.nature.bugs) { if (!b.alive || b.state === 'flee' && b.def.fly && b.y > 1.5) continue; if (near(b.x, b.z)) { caught = b; break; } }
    if (caught) { caught.alive = false; g.sys.nature.group.remove(caught.mesh); await g.sys.reveal.catchThing(g, caught.def); g.sys.nature.spawnBugs && 0; }
    else { for (const n of g.npcs.list) if (!n.sleeping && near(n.pos.x, n.pos.z)) { g.sys.friend.gain(g, n.id, -2); g.sys.memory.add(g, 'bonk', { who: n.id }); w.stats.bonks++; g.sfx('net_hit'); g.engine.hitstop?.(0.06); n.busy = true; n.actor.play('Shock', { once: true, restart: true }); await g.say(n, ['Ow! I was standing right here!', 'A net? Really? I thought we were friends.', 'That was a net. I know what a net is. I know what *you* are, now.'][Math.floor(g.rng() * 3)]); n.busy = false; break; } }
    this.busy = false;
  },
  async useTool(g, tool) {
    const p = g.player, w = g.world; this.busy = true;
    try {
      if (tool === 'rod') await this.cast(g);
      else if (tool === 'shovel') await g.sys.dig.use(g);
      else if (tool === 'axe') await g.sys.trees.chop(g);
      else if (tool === 'can') await g.sys.flowers.water(g);
      else if (tool === 'sling') await this.sling(g);
    } finally { this.busy = false; }
  },
  async sling(g) {
    const p = g.player; await p.act('Slingshot', 0.5); g.sfx('whoosh'); const f = p.facing; let best = null, bd = 99;
    for (const b of g.sys.nature.balloons) { const dx = b.x - p.pos.x, dz = b.z - p.pos.z; const d = Math.hypot(dx, dz); if (d < 14 && (dx * f.x + dz * f.z) / d > 0.3 && d < bd) { bd = d; best = b; } }
    if (best) { g.sfx('pickup'); g.sparkle(best.x, best.z, 1.5); best.dead = true; const x = Math.max(4, Math.min(TW - 5, best.x)), z = Math.max(4, Math.min(30, best.z)); const spot = g.grid.free(x, z); g.world.town.items.push({ uid: g.uid(), id: best.present, x: spot[0], z: spot[1] }); g.town.syncItems(g.world.town.items); g.ui.toast('A present falls somewhere awkward'); g.errandProgress?.('balloon'); } else g.ui.toast('Nothing to shoot. The sky is unimpressed.');
  },
  // ---- fishing ----
  async cast(g) {
    const p = g.player, w = g.world; const f = p.facing; let tgt = null;
    for (let d = 2.0; d <= 5; d += 0.5) { const x = p.pos.x + f.x * d, z = p.pos.z + f.z * d; const t = g.tiles[Math.floor(z) * TW + Math.floor(x)]; if (t === T.WATER || t === T.SEA) { tgt = { x, z }; break; } }
    await p.act('Cast', 0.5); g.sfx('cast');
    if (!tgt) { g.ui.toast('Cast it at the water, dear.'); return; }
    g.sfx('bobber'); this.bobber ??= this.makeBobber(); g.sys.nature.group.add(this.bobber); this.bobber.visible = true; this.bobber.position.set(tgt.x, -0.2, tgt.z);
    const kind = waterKind(Math.floor(tgt.x), Math.floor(tgt.z)); const near = g.sys.nature.fish.filter(fs => fs.kind === kind && dist(fs, tgt) < 7).sort((a, b) => dist(a, tgt) - dist(b, tgt))[0];
    this.ring(g, tgt.x, tgt.z); this.fishing = { tgt, kind, fish: near ?? null, t: 0, phase: 'wait', nibbles: Math.floor(g.rng() * (tuning.maxNibbles + 1)), nib: 0, wait: 1.5 + g.rng() * 2.5, bite: 0 };
    if (near) near.interest = tgt; p.hold = 'Idle'; p.slow = 0;
  },
  /** Expanding rings on the water where the bobber lands or a fish bites. */
  ring(g, x, z) { this.rings ??= []; const m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 4, 18), new THREE.MeshBasicNodeMaterial({ color: PALETTE.white })); m.rotation.x = Math.PI / 2; m.position.set(x, -0.2, z); g.sys.nature.group.add(m); this.rings.push({ m, t: 0 }); },
  updateRings(g, dt) { if (!this.rings?.length) return; for (const r of this.rings) { r.t += dt; const s = 1 + r.t * 3; r.m.scale.set(s, s, s); r.m.material.opacity = Math.max(0, 1 - r.t / 0.9); r.m.material.transparent = true; } this.rings = this.rings.filter(r => { if (r.t > 0.9) { r.m.parent?.remove(r.m); return false; } return true; }); },
  makeBobber() { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), toonMaterial(PALETTE.red)); return m; },
  fishTick(g, dt, pressed) {
    const F = this.fishing, p = g.player; F.t += dt; const bob = this.bobber; if (bob) bob.position.y = -0.2 + (F.phase === 'bite' ? -0.15 : Math.sin(g.t * 3) * 0.02);
    const end = (msg) => { if (F.fish) F.fish.interest = null; this.fishing = null; if (bob) bob.visible = false; p.hold = null; p.slow = 1; if (msg) g.ui.toast(msg); };
    if (pressed && (F.phase === 'wait' || F.phase === 'nibble')) { if (F.t > 0.3) { end('You reeled in nothing. Technically a catch.'); g.sfx('reel'); return; } }
    if (F.phase === 'wait') {
      const arrived = !F.fish || dist(F.fish, F.tgt) < 0.8; if (F.t > F.wait && arrived) { F.phase = F.nib < F.nibbles ? 'nibble' : 'bite'; F.t = 0; F.wait = 0.8 + g.rng() * 1.2; if (F.phase === 'nibble') { F.nib++; g.sfx('nibble'); g.rumble?.(0.15, 0.1); } else { g.sfx('bite'); g.rumble?.(0.8, 0.3); F.bite = tuning.biteWindow; g.ui.toast('!', { life: 0.6, color: 'red' }); g.splash(F.tgt.x, F.tgt.z); } }
      else if (F.t > 12) end('Nothing bites. The fish are on break.');
    } else if (F.phase === 'nibble') { if (F.t > 0.5) { F.phase = 'wait'; F.t = 0; F.wait = 0.8 + g.rng() * 1.5; } }
    else if (F.phase === 'bite') {
      F.bite -= dt; if (pressed) { this.reel(g, F); end(); return; }
      if (F.bite <= 0) { if (F.fish) { F.fish.interest = null; F.fish.x += 8; } end('It got away. The fish has a lawyer.'); }
    }
  },
  async reel(g, F) {
    const p = g.player; g.sfx('reel'); g.splash(F.tgt.x, F.tgt.z); let def = F.fish?.def; if (F.fish) { g.sys.nature.group; F.fish.mesh.visible = false; g.sys.nature.fishGroup.remove(F.fish.mesh); g.sys.nature.fish.splice(g.sys.nature.fish.indexOf(F.fish), 1); }
    if (!def || g.rng() < 0.06) def = FISH.find(f => f.id === 'boot'); this.busy = true; await p.act('Reel', 0.4); await g.sys.reveal.catchThing(g, def); this.busy = false;
  },
};
