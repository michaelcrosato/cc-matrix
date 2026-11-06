// Targeting and the world's verbs: what's in front of you, what pressing does, and the prompts.
import { THREE, toonMaterial, PALETTE } from '../engine.js';
import { drawText, textWidth, panel } from '../ui/draw.js';
import { drawPromptGlyph } from '../ui/glyphs.js';
import { tileChar, tileInfo, key } from '../world/tiles.js';
import { objectVerb, townInteractables } from './townVerbs.js';
import { runAction } from './actions.js';
import { toolInput, toolPrompt, cycleTool, setToolByDigit, drawToolRing } from './tools.js';
import { pauseMenu } from '../ui/screens/pause.js';
import { pocketsScreen } from '../ui/screens/pockets.js';
import { mapScreen } from '../ui/screens/map.js';
import { almanacScreen } from '../ui/screens/almanac.js';
import { emoteWheel } from '../ui/screens/emote.js';

const { Mesh, BoxGeometry, Group, Vector3 } = THREE;
const v = new Vector3();
const origin = new Vector3();
const dir = new Vector3();

export class Interact {
  constructor(g) {
    this.g = g;
    this.target = null;
    this.hover = null;
    this.tile = null;
    this.chevronT = 0;
    this.lastList = [];
    this.hoverPoint = null;
    this.highlight = new Group();
    const mat = toonMaterial(PALETTE.sand);
    for (const [w, d, x, z] of [[1, 0.06, 0.5, 0.03], [1, 0.06, 0.5, 0.97], [0.06, 1, 0.03, 0.5], [0.06, 1, 0.97, 0.5]]) {
      const m = new Mesh(new BoxGeometry(w, 0.03, d), mat);
      m.position.set(x, 0.03, z);
      this.highlight.add(m);
    }
    this.highlight.visible = false;
  }
  clear() { this.target = null; this.hover = null; this.highlight.visible = false; this.tile = null; }
  list() {
    const g = this.g;
    const place = g.place;
    const out = [];
    if (place.interactables) out.push(...place.interactables(g));
    if (place === g.town) {
      out.push(...townInteractables(g));
      const p = g.player;
      const px = Math.floor(p.x), pz = Math.floor(p.z);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const k = `${px + dx},${pz + dz}`;
        const o = g.world.town.objects[k];
        if (!o) continue;
        const verb = objectVerb(g, k, o, px + dx, pz + dz);
        if (verb) out.push({ id: `obj:${k}`, x: px + dx + 0.5, z: pz + dz + 0.5, r: o.k === 'tree' ? 1.6 : 1.25, key: k, obj: o, ...verb });
      }
    }
    for (const n of g.npcs.all()) {
      const a = n.actor;
      if (!a.visible) continue;
      if (a.root.parent !== place.group) continue;
      out.push({ id: `npc:${n.id}`, x: a.x, z: a.z, r: 1.6, label: `Talk to ${n.data.short ?? n.data.name}`, act: 'npcTalk', npc: n.id, moving: true });
    }
    out.push(...g.life.interactables());
    out.push(...g.festivals.interactables());
    return out;
  }
  update() {
    const g = this.g;
    const p = g.player;
    const list = this.list();
    this.lastList = list;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    let best = null, bestScore = 1e9;
    for (const t of list) {
      const dx = t.x - p.x, dz = t.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > t.r) continue;
      const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
      if (dot < 0.5 && d > 0.75) continue;
      const score = d - dot * 0.6;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    // The mouse's hover drives targeting instead
    const m = g.inp.mouse;
    this.hover = null;
    if (g.inp.device === 'kbm' && m.used && m.over) {
      const hit = this.groundPoint();
      if (hit) {
        this.hoverPoint = hit;
        let h = null, hd = 1.0;
        for (const t of list) { const d = Math.hypot(t.x - hit.x, t.z - hit.z); if (d < hd) { hd = d; h = t; } }
        this.hover = h;
        if (h) best = Math.hypot(h.x - p.x, h.z - p.z) <= h.r ? h : best;
      }
    } else this.hoverPoint = null;
    this.target = best;
    // The tile in front (or under the cursor)
    let tx = Math.floor(p.x + fx * 0.9), tz = Math.floor(p.z + fz * 0.9);
    if (this.hoverPoint && g.place === g.town) { tx = Math.floor(this.hoverPoint.x); tz = Math.floor(this.hoverPoint.z); }
    this.tile = [tx, tz];
    const show = g.place === g.town && !!g.world.player.tool && g.world.player.tool !== 'net' && g.world.player.tool !== 'slingshot';
    if (show && !this.highlight.parent) g.town.group.add(this.highlight);
    this.highlight.visible = show;
    if (show) this.highlight.position.set(tx, g.town.height(tx + 0.5, tz + 0.5) + 0.02, tz);
  }
  /** World point under the mouse, on the ground. */
  groundPoint() {
    const g = this.g;
    const cam = g.ctx.camera;
    const p = g.ctx.input.pointer;
    cam.rayAt(p.x, p.y, origin, dir);
    const place = g.place;
    let y = g.player.y;
    let hx = 0, hz = 0;
    for (let i = 0; i < 3; i++) {
      const t = (y - origin.y) / dir.y;
      hx = origin.x + dir.x * t - place.ox;
      hz = origin.z + dir.z * t - place.oz;
      y = place.height(hx, hz);
    }
    return { x: hx, z: hz };
  }
  activate(t) {
    const g = this.g;
    g.scripts.run(runAction(g, t), { name: t.act ?? 'verb' });
  }
  drawPrompts(hud) {
    const g = this.g;
    if (!this.g.canAct()) return;
    const t = this.target;
    const prompts = [];
    if (t) prompts.push(['confirm', t.label]);
    const tp = toolPrompt(g);
    if (tp) prompts.push(['use', tp]);
    if (prompts.length < 3 && !t && !tp) prompts.push(['pockets', 'Pockets']);
    g.ui.prompts = prompts;
    if (g.ui.hudAlpha > 0.5 || prompts.length) g.ui.drawPrompts(hud, prompts.slice(0, 3), 'corner');
    // Chevron over the target, name tooltip for the mouse
    const c = this.hover ?? t;
    if (c) {
      const s = g.project(c.x, g.place.height(c.x, c.z) + (c.npc ? 2 : 1.3), c.z);
      this.chevronT += 0.016;
      const bob = Math.round(Math.sin(this.chevronT * 7) * 2);
      if (s) hud.sprite(s.x - 3, s.y - 8 + bob, CHEVRON, CHEV_COL, { shadow: false });
      if (this.hover && s) {
        const w = textWidth(this.hover.label) + 10;
        panel(hud, s.x - w / 2, s.y - 26, w, 15, { fill: 'white', trim: 'sand' });
        drawText(hud, s.x, s.y - 22, this.hover.label, { align: 'center', color: 'ink' });
      }
    }
    drawToolRing(g, hud);
  }
}
const CHEVRON = ['#######', '#ooooo#', '.#ooo#.', '..#o#..', '...#...'];
const CHEV_COL = { '#': 'ink', o: 'sand' };

/** The per-frame world input: menus, tools, camera, verbs, mouse. */
export function worldInput(g, dt) {
  const inp = g.inp;
  const m = inp.mouse;
  g.interact.update();
  if (inp.pause) { g.sound('uiConfirm'); g.ui.push(pauseMenu(g)); return; }
  if (inp.pockets) { g.sound('uiConfirm'); g.ui.push(pocketsScreen(g)); return; }
  if (inp.map) { g.sound('uiConfirm'); g.ui.push(mapScreen(g)); return; }
  if (inp.almanac) { g.sound('uiConfirm'); g.ui.push(almanacScreen(g)); return; }
  if (inp.emote) { g.sound('uiConfirm'); g.ui.push(emoteWheel(g)); return; }
  if (inp.camL) g.turnCamera(-1);
  if (inp.camR) g.turnCamera(1);
  if (inp.zoomIn) g.zoomStep(1);
  if (inp.zoomOut) g.zoomStep(-1);
  if (inp.prevTool) cycleTool(g, -1);
  if (inp.nextTool) cycleTool(g, 1);
  if (inp.digit) setToolByDigit(g, inp.digit);
  if (g.player.poseTimer > 0) return;
  if (g.festivals.active?.kind !== 'seedToss') toolInput(g, dt);
  if (inp.confirm) {
    const t = g.interact.target;
    if (t) { g.interact.activate(t); return; }
  }
  // Mouse: click a thing to walk into reach and use it; click the ground to walk; hold to follow.
  if (m.click && m.over) {
    const hit = g.interact.groundPoint();
    const h = g.interact.hover;
    if (h) {
      const d = Math.hypot(h.x - g.player.x, h.z - g.player.z);
      if (d <= h.r) { g.interact.activate(h); return; }
      g.player.walkTo(h.x, h.z, { stop: Math.max(0.8, h.r - 0.3), then: () => { g.player.faceToward(h.x, h.z); g.interact.activate(h); } });
    } else if (hit) {
      g.player.walkTo(hit.x, hit.z, { path: !g.place.blocked(hit.x, hit.z) });
    }
  } else if (m.down && m.over && !g.interact.hover && g.idleMouseHold !== false) {
    const hit = g.interact.groundPoint();
    if (hit && !g.place.blocked(hit.x, hit.z)) { const pl = g.player; if (Math.hypot(hit.x - pl.x, hit.z - pl.z) > 0.8) { pl.walkTarget = { x: hit.x, z: hit.z, stop: 0.2 }; pl.walkPath = null; pl.walkThen = null; } }
  }
  // Wandering off the mat leaves the room
  const place = g.place;
  if (place.kind === 'room') {
    const e = place.def.exit;
    if (e && g.player.z > place.d - 0.3) g.scripts.run(runAction(g, { act: 'leaveRoom', exit: e }), { name: 'leaveRoom' });
  }
  if (place === g.city || place === g.town) g.interact.tileUnderfoot = tileChar(Math.floor(g.player.x), Math.floor(g.player.z));
}
export { tileInfo, key, v, panel, drawPromptGlyph };
