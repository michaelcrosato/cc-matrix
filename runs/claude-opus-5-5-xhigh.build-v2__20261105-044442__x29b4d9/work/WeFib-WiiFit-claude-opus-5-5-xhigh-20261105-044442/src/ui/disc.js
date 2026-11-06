import { h } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs, parent) => {
  const e = document.createElementNS(NS, name);
  for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};

/** The game's signature HUD: a dial with rings, a target zone, the dot, the asking ring and an inked trail. */
export class BalanceDisc {
  constructor(parent, { small = false, colour = '#1A1420', name = null } = {}) {
    this.root = h(`div.disc${small ? '.small' : ''}`);
    parent.append(this.root);
    const svg = this.svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-120 -130 240 250');
    this.root.append(svg);
    this.breathRing = el('circle', { r: 112, fill: 'none', stroke: '#6FD6B8', 'stroke-width': 7, opacity: 0 }, svg);
    el('circle', { r: 100, fill: '#FFF4DC', stroke: '#1A1420', 'stroke-width': 7 }, svg);
    el('circle', { r: 66, fill: '#F8E4BA', stroke: '#C9B48A', 'stroke-width': 2.5 }, svg);
    el('circle', { r: 33, fill: '#FFF4DC', stroke: '#C9B48A', 'stroke-width': 2.5 }, svg);
    el('path', { d: 'M-100 0H100M0 -100V100', stroke: '#C9B48A', 'stroke-width': 2.5 }, svg);
    this.brace = el('path', { d: '', fill: '#61C964', opacity: 0, stroke: '#1A1420', 'stroke-width': 3 }, svg);
    this.zone = el('circle', { r: 30, fill: '#9BE08F', 'fill-opacity': 0.55, stroke: '#2F8F46', 'stroke-width': 5, opacity: 0 }, svg);
    this.trail = el('polyline', { fill: 'none', stroke: '#1A1420', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', points: '', opacity: 0.55 }, svg);
    this.ask = el('circle', { r: 12, fill: 'none', stroke: '#1A1420', 'stroke-width': 3.5, 'stroke-dasharray': '6 4', opacity: 0.8 }, svg);
    this.dot = el('circle', { r: 11, fill: colour, stroke: '#1A1420', 'stroke-width': 4 }, svg);
    // Trudy peeks over the rim.
    this.peek = el('g', { transform: 'translate(0,-104)' }, svg);
    el('rect', { x: -32, y: -17, width: 64, height: 26, rx: 8, fill: '#F5B700', stroke: '#1A1420', 'stroke-width': 4 }, this.peek);
    el('rect', { x: -18, y: -12, width: 36, height: 13, rx: 6.5, fill: '#B9F26B', stroke: '#1A1420', 'stroke-width': 2.5 }, this.peek);
    this.peekBubble = el('circle', { r: 5.5, cy: -5.5, fill: '#fff', stroke: '#1A1420', 'stroke-width': 2 }, this.peek);
    this.peekPupil = el('circle', { r: 2.2, cy: -5.5, fill: '#1A1420' }, this.peek);
    this.word = null;
    if (name) this.root.append(h('div.who', name));
    this.hist = [];
    this.small = small;
  }
  addBreathWord() { this.word = h('div.breath-word.tag', 'Breathe'); this.word.style.display = 'none'; this.root.append(this.word); return this.word; }
  /** dx, dz: the dot. ax, az: where the input asks. zone: {x, z, r, on} or null. */
  update(d) {
    const x = d.dx * 100, y = d.dz * 100;
    this.dot.setAttribute('cx', x.toFixed(1)); this.dot.setAttribute('cy', y.toFixed(1));
    this.ask.setAttribute('cx', (d.ax * 100).toFixed(1)); this.ask.setAttribute('cy', (d.az * 100).toFixed(1));
    this.ask.setAttribute('opacity', d.showAsk === false ? 0 : 0.85);
    const h2 = this.hist;
    h2.push(x.toFixed(1), y.toFixed(1));
    if (h2.length > 60) h2.splice(0, 2);
    if (d.frame % 2 === 0) {
      let s = '';
      for (let i = 0; i < h2.length; i += 2) s += `${h2[i]},${h2[i + 1]} `;
      this.trail.setAttribute('points', s);
    }
    if (d.zone) {
      this.zone.setAttribute('opacity', 1);
      this.zone.setAttribute('cx', (d.zone.x * 100).toFixed(1)); this.zone.setAttribute('cy', (d.zone.z * 100).toFixed(1));
      this.zone.setAttribute('r', (d.zone.r * 100).toFixed(1));
      this.zone.setAttribute('fill', d.zone.on ? '#61C964' : '#FFD27A');
      this.zone.setAttribute('stroke', d.zone.on ? '#2F8F46' : '#B5762C');
    } else this.zone.setAttribute('opacity', 0);
    if (d.brace) {
      // A green wedge shows where to lean before a gust lands.
      const a = Math.atan2(d.brace.z, d.brace.x), w = 0.55, r = 96, r0 = 30;
      const p = (ang, rr) => `${(Math.cos(ang) * rr).toFixed(1)} ${(Math.sin(ang) * rr).toFixed(1)}`;
      this.brace.setAttribute('d', `M${p(a - w, r0)}L${p(a - w, r)}A${r} ${r} 0 0 1 ${p(a + w, r)}L${p(a + w, r0)}A${r0} ${r0} 0 0 0 ${p(a - w, r0)}Z`);
      this.brace.setAttribute('opacity', 0.75);
    } else this.brace.setAttribute('opacity', 0);
    if (d.breath) {
      const rr = 104 + d.breath.size * 14;
      this.breathRing.setAttribute('r', rr.toFixed(1));
      this.breathRing.setAttribute('opacity', 0.95);
      this.breathRing.setAttribute('stroke', d.breath.inSync ? '#37B24D' : '#7FB4E8');
      if (this.word) {
        this.word.style.display = '';
        const w = d.breath.growing ? 'Breathe in' : 'Breathe out';
        if (this.word.textContent !== w) this.word.textContent = w;
      }
    } else {
      this.breathRing.setAttribute('opacity', 0);
      if (this.word) this.word.style.display = 'none';
    }
    const bx = Math.max(-12, Math.min(12, (d.dx * 16))).toFixed(1);
    this.peekBubble.setAttribute('cx', bx); this.peekPupil.setAttribute('cx', bx);
    this.peek.setAttribute('transform', `translate(0,${d.alarm ? -112 : -104}) rotate(${(d.dx * 8).toFixed(1)})`);
  }
  remove() { this.root.remove(); }
}
