// The Balance Disc: the game's signature HUD. Inline SVG, moved with transforms each frame.
const NS = 'http://www.w3.org/2000/svg';
const S = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
export class Disc {
  constructor(parent, sizeVh, name, colour) {
    this.el = document.createElement('div'); this.el.className = 'disc';
    const px = Math.round(innerHeight * sizeVh / 100); const R = 100;
    const svg = S('svg', { viewBox: '-112 -112 224 224', width: px, height: px }); this.el.appendChild(svg);
    S('circle', { r: R + 6, fill: '#FFF8EE', stroke: '#1A1420', 'stroke-width': 7 }, svg);
    for (const r of [75, 50, 25]) S('circle', { r, fill: 'none', stroke: '#CDBFA8', 'stroke-width': 2.5 }, svg);
    S('path', { d: 'M-100 0H100M0-100V100', stroke: '#CDBFA8', 'stroke-width': 2.5 }, svg);
    this.zone = S('circle', { r: 30, fill: '#CDEBB8', stroke: '#2E8B57', 'stroke-width': 4, 'stroke-dasharray': '8 5', visibility: 'hidden' }, svg);
    this.brace = S('circle', { r: 22, fill: '#9BE38A', stroke: '#1A1420', 'stroke-width': 3, visibility: 'hidden' }, svg);
    this.trailG = S('polyline', { fill: 'none', stroke: '#1A1420', 'stroke-width': 3, 'stroke-opacity': .55, 'stroke-linejoin': 'round' }, svg);
    this.ring = S('circle', { r: 15, fill: 'none', stroke: '#E8443A', 'stroke-width': 4.5 }, svg);
    this.dot = S('circle', { r: 13, fill: colour || '#E8443A', stroke: '#1A1420', 'stroke-width': 4.5 }, svg);
    if (name) { const n = document.createElement('div'); n.className = 'pname'; n.textContent = name; this.el.appendChild(n); }
    // Trudy peeks over the rim.
    const t = S('g', { transform: 'translate(0,-112)' }, svg); this.trudy = t;
    S('rect', { x: -36, y: -18, width: 72, height: 28, rx: 8, fill: '#F5B700', stroke: '#1A1420', 'stroke-width': 4 }, t);
    S('rect', { x: -21, y: -11, width: 42, height: 14, rx: 7, fill: '#B9F26B', stroke: '#1A1420', 'stroke-width': 3 }, t);
    this.bubble = S('circle', { r: 5.5, cy: -4, fill: '#fff', stroke: '#1A1420', 'stroke-width': 2.5 }, t);
    parent.appendChild(this.el); this.trail = []; this.tT = 0;
  }
  update(dt, cobX, cobZ, wishX, wishZ, zone, brace) {
    const R = 100, cx = Math.max(-1.1, Math.min(1.1, cobX)) * R, cz = Math.max(-1.1, Math.min(1.1, cobZ)) * R;
    this.dot.setAttribute('transform', `translate(${cx.toFixed(1)},${cz.toFixed(1)})`);
    this.ring.setAttribute('transform', `translate(${(wishX * R).toFixed(1)},${(wishZ * R).toFixed(1)})`);
    this.tT += dt; if (this.tT > .03) { this.tT = 0; this.trail.push(`${cx.toFixed(0)},${cz.toFixed(0)}`); if (this.trail.length > 16) this.trail.shift(); this.trailG.setAttribute('points', this.trail.join(' ')); }
    if (zone) {
      this.zone.setAttribute('visibility', 'visible'); this.zone.setAttribute('r', (zone.r * R).toFixed(1)); this.zone.setAttribute('cx', (zone.x * R).toFixed(1)); this.zone.setAttribute('cy', (zone.z * R).toFixed(1));
      const inz = Math.hypot(cobX - zone.x, cobZ - zone.z) <= zone.r; this.zone.setAttribute('fill', inz ? '#8FE07A' : '#F1E3CC');
    } else this.zone.setAttribute('visibility', 'hidden');
    if (brace) { this.brace.setAttribute('visibility', 'visible'); this.brace.setAttribute('cx', (brace.x * R).toFixed(1)); this.brace.setAttribute('cy', (brace.z * R).toFixed(1)); } else this.brace.setAttribute('visibility', 'hidden');
    this.bubble.setAttribute('cx', (Math.max(-1, Math.min(1, -cobX)) * 14).toFixed(1));
  }
  remove() { this.el.remove(); }
}
