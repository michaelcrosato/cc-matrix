// In-play HUD: minimal, hides 6 s after it last changed. Everything is drawn with ctx.hud in art pixels.
import { THREE } from '../../pixel-engine.js';
import { condIconColor } from '../combat/gunmath.js';
import { drawPrompt } from './glyphs.js';
import { wrapText } from './ui.js';
import { WEAPONS } from '../content/weapons.js';

const V3 = THREE.Vector3;
const SPEAKER_COLOR = { vance: 'cyan', ansa: 'orange', odile: 'white', tibor: 'sand', bakr: 'lime', ines: 'cyan', dov: 'lime', mags: 'orange', harrow: 'sand', player: 'mist', pell: 'orange', concord: 'sky', harvest: 'red', radio: 'green' };
export class HudSystem {
  name = 'hud';
  last = ''; changedAt = 0; vec = new V3(); stepShown = { text: '', t: 0 };
  setup(g) { this.g = g; g.hudDraw = (hud, dt) => this.draw(g, hud, dt); g.showStep = (text) => { this.stepShown = { text, t: 5 }; }; g.hudPoke = () => { this.changedAt = g.ctx.time; }; }
  draw(g, hud, dt) {
    const W = hud.width, H = hud.height, w = g.weapons, b = g.body, set = g.glyphSet, dev = g.device;
    if (g.hudHidden) return;
    const gun = w.current(), gs = w.gunState();
    const sig = [Math.round(b.hp), w.syrettes, w.tablets, gs ? Math.floor(gs.mag) + ':' + gs.reserve : '', w.slot, w.throwables.molotov, w.throwables.charge].join(',');
    if (sig !== this.last) { this.last = sig; this.changedAt = g.ctx.time; }
    const show = g.ctx.time - this.changedAt < 6 || b.hp < 100 || (gs && gs.jammed) || g.forceHud || b.fever.active;
    // ---- scope or reticle ----
    if (w.scoped) this.scope(hud, W, H);
    else if (!g.mapUp && !g.player.seated) {
      const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
      hud.rect(cx - 1, cy - 1, 2, 2, w.hitMarker > 0 ? 'red' : 'white');
      if (w.hitMarker > 0) for (const [dx, dy] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) hud.rect(cx + dx, cy + dy, 1, 1, 'red');
    }
    if (show && !g.mapUp) {
      // health: five segments, bottom-left
      const x0 = 24, y0 = H - 22;
      for (let i = 0; i < 5; i++) { const f = Math.max(0, Math.min(1, (b.hp - i * 20) / 20)); hud.rect(x0 + i * 15, y0, 13, 5, 'night'); hud.rect(x0 + i * 15, y0, Math.round(13 * f), 5, b.hp < 40 ? 'red' : 'orange'); }
      hud.text(x0, y0 - 11, 'SYR ' + w.syrettes, { color: w.syrettes ? 'sand' : 'slate' }); hud.text(x0 + 40, y0 - 11, 'TAB ' + w.tablets, { color: w.tablets ? 'sand' : 'slate' });
      if (g.player.stamina < 5.5) { hud.rect(x0, y0 + 8, 72, 2, 'night'); hud.rect(x0, y0 + 8, Math.round(72 * g.player.stamina / 6), 2, 'mist'); }
      // ammo, bottom-right
      if (gun && gs && gun.kind !== 'melee') {
        const t = gun.stream ? `${Math.floor(gs.mag)}` : `${gs.mag}/${gs.reserve}`;
        hud.text(24, H - 22, t, { anchor: 'bottom-right', scale: 2, color: gs.mag === 0 ? 'red' : 'white' });
        const ix = W - 24 - hud.measure(t, 2).width - 18;
        hud.sprite(ix, H - 24, ['.ooooo.', 'ooooooo', '..oo...', '..oo...'], { o: condIconColor(gs.cond) });
        if (gs.jammed) hud.text(0, 40, 'JAMMED', { anchor: 'bottom', color: 'red', scale: 1 });
      }
      if (w.throwables.molotov || w.throwables.charge) hud.text(24, H - 34, `BTL ${w.throwables.molotov}  CHG ${w.throwables.charge}`, { anchor: 'bottom-right', color: 'sand' });
    }
    // ---- screen-edge flames ----
    if (b.burning) { const f = Math.sin(this.g.ctx.time * 18); for (let i = 0; i < W; i += 6) { const h = 5 + ((i * 7 + Math.floor(g.ctx.time * 20)) % 9); hud.rect(i, H - h, 6, h, i % 12 ? 'orange' : 'red'); } }
    // ---- markers over heads ----
    for (const s of g.soldierSys.list) {
      if (!s.alive || !s.mark || s.puppet) continue;
      const d = Math.hypot(s.pos.x - g.player.feet.x, s.pos.z - g.player.feet.z); if (d > 70) continue;
      const p = this.project(g, s.pos.x, s.pos.y + 2.2, s.pos.z, hud); if (!p) continue;
      hud.text(p.x - 2, p.y - 4, s.mark, { color: s.mark === '!' ? 'red' : 'orange' });
    }
    g.markers?.forEach((m) => { const p = this.project(g, m.x, m.y, m.z, hud); if (p) hud.text(p.x - 2, p.y - 4, m.text, { color: m.color || 'cyan' }); });
    // ---- mission step ----
    if (this.stepShown.t > 0) { this.stepShown.t -= dt || 0.016; const t = this.stepShown.text.toUpperCase(); hud.rect(0, 10, hud.measure(t, 1).width + 12, 11, 0x0d1020, 'top'); hud.text(0, 12, t, { anchor: 'top', color: 'sand' }); }
    // ---- prompts and subtitles ----
    const prompts = []; let py = H - 40;
    for (const p of g.prompts || []) { prompts.push(p.text); const wdt = p.width || 60; drawPrompt(hud, Math.round((W - wdt) / 2), py, p.action, p.verb, dev, set); if (p.progress > 0) { hud.rect(Math.round(W / 2) - 20, py + 13, 40, 3, 'night'); hud.rect(Math.round(W / 2) - 20, py + 13, Math.round(40 * p.progress), 3, 'orange'); } py -= 14; }
    g.state_prompts = prompts;
    if (g.subtitle) this.subtitle(g, hud, py - 6);
    if (g.hudExtra) g.hudExtra(hud);
  }
  project(g, x, y, z, hud) {
    const cam = g.ctx.camera.camera; this.vec.set(x, y, z).project(cam);
    if (this.vec.z > 1 || this.vec.z < -1) return null;
    return { x: Math.round((this.vec.x + 1) / 2 * hud.width), y: Math.round((1 - this.vec.y) / 2 * hud.height) };
  }
  scope(hud, W, H) {
    const cx = W / 2, cy = H / 2, r = H * 0.46;
    for (let y = 0; y < H; y += 2) { const dy = y + 1 - cy; const hw = Math.abs(dy) < r ? Math.sqrt(r * r - dy * dy) : 0; if (hw <= 0) hud.rect(0, y, W, 2, 'ink'); else { hud.rect(0, y, Math.round(cx - hw), 2, 'ink'); hud.rect(Math.round(cx + hw), y, Math.ceil(W - cx - hw), 2, 'ink'); } }
    hud.rect(Math.round(cx) - 24, Math.round(cy), 20, 1, 'ink'); hud.rect(Math.round(cx) + 4, Math.round(cy), 20, 1, 'ink'); hud.rect(Math.round(cx), Math.round(cy) - 24, 1, 20, 'ink'); hud.rect(Math.round(cx), Math.round(cy) + 4, 1, 20, 'ink'); hud.rect(Math.round(cx), Math.round(cy), 1, 1, 'red');
  }
  subtitle(g, hud, y) {
    const st = g.subtitle, W = hud.width; const sc = g.settings.subSize > 1.2 ? 2 : 1;
    const maxW = Math.min(W - 60, 330 * sc);
    const lines = wrapText(hud, st.text.toUpperCase(), maxW, sc).slice(0, 2);
    const who = st.who && st.who !== 'player' ? st.who.toUpperCase() : '';
    const h = lines.length * (8 * sc + 1) + (who ? 9 : 0) + 4;
    const top = Math.max(20, y - h);
    const wmax = Math.max(...lines.map((l) => hud.measure(l, sc).width), who ? hud.measure(who).width : 0) + 10;
    hud.rect(0, top - 2, wmax, h, 0x0d1020, 'top'); hud.rect(0, top - 2, wmax, h, 0x0d1020, 'top');
    let ty = top; if (who) { hud.text(0, ty, who + ':', { anchor: 'top', color: SPEAKER_COLOR[st.who] || 'cyan' }); ty += 9; }
    for (const l of lines) { hud.text(0, ty, l, { anchor: 'top', scale: sc, color: 'white' }); ty += 8 * sc + 1; }
    g.subtitleLines = lines;
  }
}
