// Targeting and bare-hand verbs: talk, pick up, shake a tree, pull a weed, pick a flower, sit, read, ride the bus.
import { TW, TD, BUILDINGS, LANDMARKS, SPAWNS } from '../world/townMap.js';
import { item } from '../data/items.js';
import { typeLines, UNIQUE, SEASON_LINES, GOSSIP, whenOk, renderLine } from '../data/dialogue.js';
import { NEIGHBOURS } from '../data/neighbours.js';
const doorOf = (b) => b.door;
export const interact = {
  target: null,
  update(g, dt) {
    const p = g.player, w = g.world; if (g.place !== 'town') { this.target = g.sys.places?.scan(g) ?? null; this.finish(g); return; }
    const f = p.facing ?? { x: 0, z: 1 }; const fx = p.pos.x + f.x * 0.9, fz = p.pos.z + f.z * 0.9; const tx = Math.floor(fx), tz = Math.floor(fz);
    let t = null;
    const n = g.npcs.near(p.pos.x + f.x * 0.7, p.pos.z + f.z * 0.7, 1.7); if (n && !n.busy) t = { kind: 'npc', npc: n, at: [n.pos.x, n.pos.z], label: 'Talk to ' + n.name.split(' ')[0] };
    if (!t) { const it = w.town.items.find(i => Math.hypot(i.x - fx, i.z - fz) < 0.9); if (it) t = { kind: 'item', it, at: [it.x, it.z], label: 'Pick up ' + item(it.id).name }; }
    if (!t) { const wd = w.town.weeds.find(x => x.x === tx && x.z === tz); if (wd) t = { kind: 'weed', ref: wd, at: [wd.x + 0.5, wd.z + 0.5], label: 'Pull weed' }; }
    if (!t) { const fl = w.town.flowers.find(x => x.x === tx && x.z === tz); if (fl) t = { kind: 'flower', ref: fl, at: [fl.x + 0.5, fl.z + 0.5], label: fl.wilt ? 'Clear wilted flower' : 'Pick flower' }; }
    if (!t) { const tr = w.town.trees.find(x => x.x === tx && x.z === tz && !x.felled); if (tr) t = { kind: 'tree', ref: tr, at: [tr.x + 0.5, tr.z + 0.5], label: tr.stage < 2 ? 'Look at sapling' : 'Shake tree' }; }
    if (!t) { const d = Math.hypot(p.pos.x - LANDMARKS.notice[0], p.pos.z - LANDMARKS.notice[1] - 0.5); if (d < 1.8) t = { kind: 'notice', label: 'Read notice board' }; }
    if (!t) { const d = Math.hypot(p.pos.x - LANDMARKS.bell[0], p.pos.z - LANDMARKS.bell[1] - 0.5); if (d < 1.9) t = { kind: 'bell', label: 'Ring the Old Bell' }; }
    if (!t) { for (const [bx, bz] of [...LANDMARKS.bench, LANDMARKS.lookoutBench]) { if (Math.hypot(p.pos.x - bx - 0.5, p.pos.z - bz - 0.5) < 1.4) { t = { kind: 'bench', at: [bx + 0.5, bz + 0.5], label: bz < 10 ? 'Sit and look at the stars' : 'Sit' }; break; } } }
    if (!t && p.pos.x < 7 && p.pos.z > 18 && p.pos.z < 25) t = { kind: 'bus', label: 'Take the bus to the City' };
    if (!t && Math.hypot(p.pos.x - 22.5, p.pos.z - 25.2) < 2 && g.dayType === 0 && g.hour >= 6 && g.hour < 12) t = { kind: 'rind', label: 'Talk to Old Rind' };
    if (!t && g.sys.festivals?.target) t = g.sys.festivals.target(g);
    if (!t && g.sys.vesper) t = g.sys.vesper.target(g);
    if (!t && g.season === 3) { const tl = g.tiles[tz * TW + tx]; if (tl === 0 && !g.grid.solid(fx, fz) && g.weather !== 'rain') t = { kind: 'custom', label: 'Roll a snowball', at: [tx + 0.5, tz + 0.5], run: (gg) => this.snowball(gg, tx, tz) }; }
    this.hover(g, t);
    this.target = t; this.finish(g);
    // doors
    const tile = Math.floor(p.pos.x) + ',' + Math.floor(p.pos.z);
    for (const b of BUILDINGS) { if (b.noDoor) continue; if (Math.floor(p.pos.x) === b.door[0] && Math.floor(p.pos.z) === b.door[1] && (p.facing?.z ?? 0) < 0.2 && p.speed > 0.1) { if (g.sys.places) g.sys.places.enter(g, b); return; } }
  },
  /** Mouse: hover shows a name tooltip; clicking the thing under the cursor acts when the avatar is within reach. */
  hover(g, t) {
    const c = g.ui.c; g.hoverTip = null; if (c.device !== 'kb' || !c.ptr.over || g.ui.busy) return; const gp = g.groundPoint(g.ctx.input.pointer.x, g.ctx.input.pointer.y); if (!gp) return;
    let best = null, bd = 1.1; for (const n of g.npcs.list) { if (n.sleeping || !n.actor.root.visible) continue; const d = Math.hypot(n.pos.x - gp.x, n.pos.z - gp.z); if (d < bd) { bd = d; best = { label: n.name, at: [n.pos.x, n.pos.z], npc: n }; } }
    if (best) { g.hoverTip = best; if (c.ptr.left && !g.ui.closedThisFrame) { const near = Math.hypot(best.at[0] - g.player.pos.x, best.at[1] - g.player.pos.z) < 2.2; if (near && !this.busy && !(g.grace > 0)) { g.player.faceToward(best.at[0], best.at[1]); this.activate(g, { kind: 'npc', npc: best.npc }); } else g.player.moveTarget = { x: best.at[0] - 1, z: best.at[1] }; } }
    else if (t?.at && Math.hypot(t.at[0] - gp.x, t.at[1] - gp.z) < 1.2) { g.hoverTip = { label: t.label, at: t.at }; if (c.ptr.left && !this.busy && !(g.grace > 0)) this.activate(g, t); }
  },
  async snowball(g, tx, tz) {
    const w = g.world, p = g.player; w.snow ??= []; await p.act('PushSnow', 1.4); g.sfx('snow'); let b = w.snow.find(s => Math.hypot(s.x - tx, s.z - tz) < 1.6 && !s.done);
    if (!b) { b = { x: tx, z: tz, rolls: 0, stage: 0 }; w.snow.push(b); } b.rolls++; g.ui.toast(b.rolls < 3 ? 'The snowball grows...' : 'Big enough. Roll another next to it for a head.'); g.sparkle(tx + 0.5, tz + 0.5, 0.5, 'white');
    const near = w.snow.filter(s => !s.done && Math.hypot(s.x - tx, s.z - tz) < 2.2); if (near.length >= 2 && near.every(s => s.rolls >= 1)) { const [body, head] = near.sort((a, c) => c.rolls - a.rolls); const ratio = Math.min(head.rolls, body.rolls) / Math.max(1, body.rolls); const q = 0.4 + 0.6 * ratio; body.done = head.done = true; const { buildSnowman } = await import('../world/scenery.js'); const sm = buildSnowman(ratio); sm.position.set(body.x + 0.5, 0, body.z + 0.5); g.town.group.add(sm); body.mesh = sm; body.proportion = Math.round((1 - Math.abs(ratio - 0.6)) * 100); g.sparkle(body.x + 0.5, body.z + 0.5, 1.2, 'white'); g.sfx('reveal'); await g.say(null, `A snowman! ${body.proportion >= 80 ? 'The proportions are, frankly, a little frightening.' : body.proportion >= 55 ? 'The head is doing its best.' : 'The head is arguing with the body.'} Proportion: ${body.proportion}.`); g.sys.memory.add(g, 'snowman', { q: body.proportion }); if (w.contest?.kind === 'snow') w.contest.best = Math.max(w.contest.best, body.proportion * 30); if (body.proportion >= 70) g.sys.mail.queue(g, { from: 'The Snowman', subject: 'Thank you for the shape', body: 'You made me. I will melt. This is a thank-you gift. Bring it to the notice board.', gift: 'cheesewrap', arriveDay: w.day + 1 }); }
  },
  finish(g) { const t = this.target; g.prompt = t ? { label: t.label } : null; if (t && !g.ui.busy && g.ui.c.pressed('confirm') && !g.cutscene && !(g.grace > 0) && !g.ui.closedThisFrame) this.activate(g, t); },
  async activate(g, t) {
    if (this.busy) return; this.busy = true; const p = g.player, w = g.world;
    try {
      if (t.kind === 'npc') await this.talk(g, t.npc);
      else if (t.kind === 'item') await g.sys.items.pickup(g, t.it);
      else if (t.kind === 'weed') { w.town.weeds.splice(w.town.weeds.indexOf(t.ref), 1); g.town.syncWeeds(w.town.weeds); g.sfx('pick'); g.give('weed'); g.sys.memory.add(g, 'weedpull'); g.errandProgress?.('weed'); g.sparkle(t.ref.x + 0.5, t.ref.z + 0.5); await p.act('PickUp', 0.5); }
      else if (t.kind === 'flower' && g.visit?.role === 'guest') g.ui.toast('Guests do not pick the host\'s flowers.');
      else if (t.kind === 'flower') { const i = w.town.flowers.indexOf(t.ref); w.town.flowers.splice(i, 1); g.town.syncFlowers(w.town.flowers); g.sfx('pick'); if (!t.ref.wilt) g.give('seedpack'); await p.act('PickUp', 0.5); }
      else if (t.kind === 'tree') (g.visit?.role === 'guest' && t.ref.stage >= 2 && false) ? 0 : await g.sys.trees.shake(g, t.ref);
      else if (t.kind === 'notice') await g.sys.notice.read(g);
      else if (t.kind === 'bell') { g.sfx('bell'); g.town.bellSwing = 0.6; g.sys.chime.hourly(g, Math.floor(g.hour)); await g.say(null, 'Dong. The Old Bell sounds like a goose clearing its throat, slowly.'); }
      else if (t.kind === 'bench') await g.sys.stars.sit(g, t);
      else if (t.kind === 'bus') { if (g.visit) await g.say(null, "Bus doesn't run while you have company."); else await g.sys.bus.ride(g); }
      else if (t.kind === 'rind') await g.sys.cheese.talk(g);
      else if (t.kind === 'custom') await t.run(g);
    } finally { this.busy = false; }
  },
  /** Pick a line for an npc using the bank, memory and what is going on. */
  line(g, n) {
    const w = g.world, d = n.def; const ctx = { season: g.season, weather: g.weather, hour: g.hour, friend: w.friend[d.id] ?? 0, memories: w.memory.filter(m => m.who === d.id || !m.who).map(m => m.t).concat(w.absentDays > 0 ? ['absent'] : []) };
    const pool = [];
    for (const cat of ['greet', 'rain', 'snow', 'night', 'friend', 'absent']) for (const l of typeLines(d.type, cat)) if (whenOk(l.when, ctx)) pool.push({ ...l, w: l.w < 1 ? l.w : (cat === 'greet' ? 1 : 2.5) });
    for (const l of UNIQUE[d.id] ?? []) pool.push({ ...l, w: 1.5 }); for (const l of SEASON_LINES) if (whenOk(l.when, ctx)) pool.push({ ...l, w: 0.7 });
    const m = g.sys.memory.line(g, n); if (m) pool.push({ text: m, w: 6 });
    const others = NEIGHBOURS.filter(x => x.id !== d.id); const gs = GOSSIP[Math.floor(g.rng() * GOSSIP.length)]; pool.push({ text: gs.text.replace('{neighbour}', others[Math.floor(g.rng() * others.length)].name), w: 0.6 });
    w.seenLines ??= {}; const fresh = pool.filter(l => !w.seenLines[l.text]); const use = fresh.length ? fresh : pool;
    if (!fresh.length) for (const l of pool) delete w.seenLines[l.text];
    const total = use.reduce((a, l) => a + (l.w ?? 1), 0); let x = g.rng() * total; let pick = use[0]; for (const l of use) { x -= l.w ?? 1; if (x <= 0) { pick = l; break; } }
    w.seenLines[pick.text] = 1; return renderLine(pick.text, { player: w.name, town: w.townName });
  },
  async talk(g, n) {
    const w = g.world, p = g.player; n.busy = true; n.talkingTo = 'player'; n.yaw = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z); p.faceToward(n.pos.x, n.pos.z); n.actor.look = p.yaw; p.hold = null;
    g.sys.favours.touch?.(g, n);
    const first = !w.talked[n.id + '@' + w.day]; if (first) { w.talked[n.id + '@' + w.day] = 1; g.sys.friend.gain(g, n.id, 3); }
    if (n.id === 'rocco' && w.day >= 7 && !w.movedOut.rocco && !w.flags.roccoTalked) { w.flags.roccoTalked = true; const c = await g.ask(n, "I've been thinking, ... I might roll away. Somewhere flatter. Different gym. Let's... roll?", ['Stay! The town needs you', 'Good luck out there', 'Where would you even go?']); w.flags.roccoArgued = c === 0; await g.say(n, c === 0 ? "Ha! You'd argue with a boulder. I... will think about it. (I won't.) Let's roll!" : c === 1 ? "Thanks, friend. That's the nicest thing anyone's said to my back. Let's roll!" : 'Somewhere with a flat horizon and a very good protein shake. Let\'s roll!'); }
    let handled = false; if (n.def.host) handled = await g.sys.errands.onTalkHost(g, n.id); else { handled = await g.sys.errands.onTalkNpc(g, n); if (!handled) handled = await g.sys.favours.onTalkOther(g, n); if (!handled) handled = await g.sys.favours.onTalk(g, n); } if (!handled && n.def.host) { await g.say(n, ['I declare this... ribbon... cut. Has anyone... seen... the ribbon? It was here... in March.', 'Good morning. Or... evening. I... was... en route.'][Math.floor(g.rng() * 2)]); handled = true; }
    if (!handled) { const text = this.line(g, n); const choice = await g.ask(n, text, ['Chat', 'Give a gift', 'Ask about the town', 'Bye']); if (choice === 1) await g.sys.gifts.give(g, n); else if (choice === 2) await g.say(n, g.sys.memory.townTalk(g, n)); else if (choice === 0) { await g.say(n, this.line(g, n)); } }
    n.talkingTo = null; n.busy = false; n.timer = 1;
  },
};
