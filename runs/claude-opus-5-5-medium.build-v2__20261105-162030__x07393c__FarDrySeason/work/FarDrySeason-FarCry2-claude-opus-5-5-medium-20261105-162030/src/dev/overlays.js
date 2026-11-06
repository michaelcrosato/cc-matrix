// Dev mode overlays drawn over the world.
export class OverlaysPart {
  drawOverlays() {
    const g = this.game, h = g.ctx.hud;
    if (this.fireOverlay) { const f = g.world.fire, S = 128; h.rect(h.width - S - 8, 28, S, S, 'ink'); for (const i of f.burning) { const x = i % 256, z = (i / 256) | 0; h.rect(h.width - S - 8 + (x >> 1), 28 + (z >> 1), 1, 1, 'orange'); } for (const i of f.burntList) { const x = i % 256, z = (i / 256) | 0; h.rect(h.width - S - 8 + (x >> 1), 28 + (z >> 1), 1, 1, 'slate'); } h.text(h.width - S - 8, 158, `${f.burning.length} BURNING ${f.burntCount} BURNT`, { color: 'orange' }); }
    if (this.navOverlay && g.nav) { const n = g.nav, S = 120; h.rect(8, 28, S, S, 'ink'); for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) if (!n.isOpen(Math.floor((x / S) * 640), Math.floor((z / S) * 640))) h.rect(8 + x, 28 + z, 1, 1, 'plum'); }
    if (this.aiText) for (const a of g.actors.list) { const s = g.hud.world(a.x, a.y + 2.2, a.z); if (s) h.text(Math.round(s[0]) - 18, Math.round(s[1]) - 14, `${a.state} ${Math.round(a.hp)}`, { color: 'lime' }); }
    if (this.counts) { const st = g.ctx.engine.state(); h.text(10, h.height - 46, `ACTORS ${g.actors.list.length} VEH ${g.vehicles.list.length} FIRE ${g.world.fire.burning.length} DRAWS ${st.renderer?.calls ?? st.draws ?? '?'}`, { color: 'lime' }); }
    if (this.coords) { const c = this.crosshair(); h.text(10, h.height - 58, `CROSSHAIR ${c[0].toFixed(1)} ${c[1].toFixed(1)} ${c[2].toFixed(1)}`, { color: 'lime' }); }
    if (this.statusLine) h.text(10, h.height - 70, g.status(), { color: 'lime' });
  }
}
