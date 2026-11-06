// Ambience loops with distance falloff, plus seasonal particles (petals, leaves, fireflies).
import { attenuation, Boids } from '../engine.js';
import { THREE } from '../engine.js';
import { isWet } from '../core/calendar.js';
export const ambience = {
  loops: {}, t: 0, pt: 0,
  init(g) { if (this.ready) return; this.ready = true; const a = g.ctx.audio; for (const k of ['river', 'surf', 'rain', 'wind', 'crickets', 'birds', 'city', 'neon']) this.loops[k] = a.loop('amb_' + k, { volume: 0 }); g.ctx.particles.register('petal', { count: [1, 1], life: [3, 5], speed: [0.2, 0.6], gravity: 0.4, size: [1, 1], colors: ['white', 'red', 'white'] }); g.ctx.particles.register('leaf', { count: [1, 1], life: [3, 5], speed: [0.4, 1], gravity: 0.5, size: [1, 1], colors: ['orange', 'red', 'sand'] }); g.ctx.particles.register('flyspark', { count: [1, 1], life: [1.5, 2.5], speed: [0.2, 0.5], gravity: -0.1, size: [1, 1], colors: ['lime', 'sand'] }); },
  birds(g, dt) {
    if (!this.flock) { this.flock = new Boids(10, { bounds: { min: [4, 6, 4], max: [76, 10, 36] } }); this.birdGroup = new THREE.Group(); g.ctx.scene.add(this.birdGroup); this.flock.pos && Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.12), new THREE.MeshBasicNodeMaterial({ color: 0x1a1c2c })); this.birdGroup.add(m); }); }
    const day = g.place === 'town' && g.hour > 6 && g.hour < 19 && !isWet(g.weather) && g.season !== 3 && g.mode !== 'title'; this.birdGroup.visible = day; if (!day) return; this.flock.step(dt);
    this.birdGroup.children.forEach((m, i) => { const p = this.flock.pos; m.position.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); m.rotation.z = Math.sin(g.t * 9 + i) * 0.5; });
  },
  weatherProps(g, dt) {
    if (!this.puddles) { this.puddles = new THREE.Group(); this.clouds = new THREE.Group(); g.ctx.scene.add(this.puddles, this.clouds); for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7 + (i % 3) * 0.2, 0.7 + (i % 3) * 0.2, 0.02, 10), new THREE.MeshBasicNodeMaterial({ color: 0x29366f })); m.scale.z = 0.6; m.visible = false; this.puddles.add(m); } for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(4 + i, 4 + i, 0.02, 12), new THREE.MeshBasicNodeMaterial({ color: 0x1a1c2c })); m.scale.z = 0.7; m.position.y = 0.05; m.material.transparent = true; m.material.opacity = 0.16; this.clouds.add(m); } }
    const wet = isWet(g.weather), town = g.place === 'town' && g.mode !== 'title'; const p = g.player.pos;
    this.puddles.visible = wet && town; if (this.puddles.visible) this.puddles.children.forEach((m, i) => { m.visible = true; m.position.set(Math.round(p.x / 6) * 6 + ((i * 53) % 17) - 8, 0.03, Math.round(p.z / 6) * 6 + ((i * 29) % 13) - 6); });
    this.clouds.visible = town && g.weather === 'sun' && g.hour > 7 && g.hour < 18; if (this.clouds.visible) this.clouds.children.forEach((m, i) => { m.position.x = (g.t * 0.6 + i * 22) % 100 - 10; m.position.z = 8 + i * 8; });
  },
  update(g, dt) {
    if (g.world && g.mode !== 'title' && g.mode !== 'round') { this.weatherProps(g, dt); try { this.birds(g, dt); } catch { /* flock layout varies; birds are decoration */ } }
    if (!g.world || g.mode === 'title' || g.mode === 'round') { for (const l of Object.values(this.loops)) l.set({ volume: 0 }); return; } this.init(g); this.t += dt; const p = g.player.pos, town = g.place === 'town', city = g.place === 'city';
    const hour = g.hour, wx = g.weather, night = hour >= 19 || hour < 5, season = g.season; const set = (k, v) => this.loops[k].set({ volume: Math.max(0, Math.min(1, v)) * (g.ui.busy && g.ui.top?.freeze ? 0.4 : 1) });
    if (town) { const dr = Math.max(0, Math.abs(p.x - 30) - 1.5); const ds = Math.max(0, 41 - p.z); set('river', attenuation(dr, { ref: 2, max: 22 }) * 0.9); set('surf', attenuation(ds, { ref: 3, max: 24 }) * 0.8); set('rain', isWet(wx) ? 0.9 : 0); set('wind', wx === 'wind' || wx === 'storm' ? 0.9 : wx === 'snow' ? 0.3 : 0.12); set('crickets', night && (season === 1 || season === 2) ? 0.6 : 0); set('birds', !night && (season === 0 || season === 1) && !isWet(wx) ? 0.5 : 0); set('city', 0); set('neon', 0); }
    else if (city) { for (const k of ['river', 'surf', 'rain', 'crickets', 'birds']) set(k, 0); set('wind', 0); set('city', 0.7); set('neon', night ? 0.5 : 0.1); } else for (const k of Object.keys(this.loops)) set(k, k === 'rain' && isWet(wx) ? 0.2 : 0);
    this.pt -= dt; if (this.pt <= 0 && town) { this.pt = 0.35; const pr = g.ctx.particles; const rx = p.x + (g.cosmetic() - 0.5) * 14, rz = p.z + (g.cosmetic() - 0.5) * 10; if (season === 0 && !isWet(wx)) pr.burst('petal', new THREE.Vector3(rx, 3 + g.cosmetic() * 2, rz)); else if (season === 2) pr.burst('leaf', new THREE.Vector3(rx, 3 + g.cosmetic() * 2, rz)); else if (season === 1 && night) pr.burst('flyspark', new THREE.Vector3(rx, 0.6 + g.cosmetic(), rz)); }
  },
};
