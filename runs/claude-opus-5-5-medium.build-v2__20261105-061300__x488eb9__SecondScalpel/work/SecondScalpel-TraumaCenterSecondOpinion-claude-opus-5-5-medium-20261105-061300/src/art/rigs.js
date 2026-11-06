// Bodies for the ward and cinematics: the engine's Humanoids, dressed for a hospital, with new poses, a surgical cap, a mask and held instruments.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, H = E.Humanoid;
H.hat('surgcap', h => { const p = h.at(0, 0, h.r * .35), T = E.tones(h.c); px.ell(h.g, p[0], p[1], h.r * 1.08, h.r * .78, h.c); px.ell(h.g, p[0] - h.r * .2, p[1] - h.r * .25, h.r * .55, h.r * .3, T.lt); const q = h.at(0, 0, 0); px.rect(h.g, q[0] - h.r | 0, q[1] - 1 | 0, h.r * 2 | 0, 2, h.dk); });
H.pose('scrub', (J, w) => { for (const k of ['handL', 'handR']) { const s = k === 'handL' ? -1 : 1; J[k][0] += (6 - J[k][0]) * w; J[k][1] += (s * 2.5 - J[k][1]) * w; J[k][2] += (J.shC[2] + 2 - J[k][2]) * w; } for (const k of ['elbowL', 'elbowR']) { const s = k === 'elbowL' ? -1 : 1; J[k][0] += (3 - J[k][0]) * w; J[k][1] += (s * 5 - J[k][1]) * w; J[k][2] += (J.shC[2] - 5 - J[k][2]) * w; } });
H.pose('push', (J, w) => { for (const k of ['handL', 'handR']) { const s = k === 'handL' ? -1 : 1; J[k][0] += (9 - J[k][0]) * w; J[k][1] += (s * 3 - J[k][1]) * w; J[k][2] += (J.shC[2] - 4 - J[k][2]) * w; } });
H.pose('lean', (J, w) => { const lean = 3; J.head[0] += lean * w; J.shC[0] += lean * .8 * w; for (const k of ['handL', 'handR']) { const s = k === 'handL' ? -1 : 1; J[k][0] += (8 - J[k][0]) * w; J[k][1] += (s * 2 - J[k][1]) * w; J[k][2] += (J.hipC[2] + 1 - J[k][2]) * w; } });
H.pose('pass', (J, w) => { J.handR[0] += (10 - J.handR[0]) * w; J.handR[2] += (J.shC[2] - 2 - J.handR[2]) * w; J.handR[1] += (2 - J.handR[1]) * w; });
H.pose('knit', (J, w, rig) => { const t = (rig && rig.t) || 0, k = Math.sin((rig ? rig._knit = (rig._knit || 0) + .1 : 0)) * 1; for (const n of ['handL', 'handR']) { const s = n === 'handL' ? -1 : 1; J[n][0] += (6 + s * k - J[n][0]) * w; J[n][1] += (s * 1.6 - J[n][1]) * w; J[n][2] += (J.hipC[2] + 3 - J[n][2]) * w; } });
const mask = c => ({ over(g, Q, rig) { if (!Q || !Q.head || rig.maskOff) return; const h = Q.head; px.rect(g, h[0] - 4 | 0, h[1] + 3 | 0, 9, 4, c); px.rect(g, h[0] - 4 | 0, h[1] + 6 | 0, 9, 1, E.tones(c).sh); } });
H.pose('paddles', (J, w) => { for (const n of ['handL', 'handR']) { const s = n === 'handL' ? -1 : 1; J[n][0] += (10 - J[n][0]) * w; J[n][1] += (s * 4 - J[n][1]) * w; J[n][2] += (J.hipC[2] + 4 - J[n][2]) * w; } });
H.pose('maskdown', (J, w) => { J.handR[0] += (5 - J.handR[0]) * w; J.handR[1] += (1 - J.handR[1]) * w; J.handR[2] += (J.shC[2] + 1 - J.handR[2]) * w; });
H.weapon('cane', { length: 16, rest: [.25, .35, -.95], blade: false, draw(w) { const a = w.at(0), b = w.at(16); if (a && b) px.line(w.g, a[0], a[1], b[0], b[1], '#6a4020', 2); } });
const R = (o) => new E.Humanoid(Object.assign({ size: 1.3, weapon: null, outfit: 'shirt', sleeves: 'short' }, G.maskRigs && o.hat && o.hat.style === 'surgcap' ? { draw: mask('#bfe6dc') } : {}, o));
const defs = {
  vale: () => R({ hat: { style: 'surgcap', color: '#2bb0a2' }, hair: 'short', colors: { skin: '#f6d0b2', hair: '#c9562a', cloth: '#2f9c8e', pants: '#2f9c8e', boot: '#d8e0e0', belt: '#2f9c8e', trim: '#2bb0a2' } }),
  sokolova: () => R({ build: 'heroic', hair: 'long', hat: { style: 'band', color: '#c8352a' }, colors: { skin: '#e8c6aa', hair: '#dedad2', cloth: '#6b7a48', pants: '#566038', boot: '#3a3020', belt: '#3a3020' } }),
  quill: () => R({ build: 'bulky', hair: 'short', hat: { style: 'surgcap', color: '#35558f' }, colors: { skin: '#dcae8e', hair: '#8d8a88', cloth: '#3d62a6', pants: '#3d62a6', boot: '#28303a', belt: '#3d62a6' } }),
  oyelaran: () => R({ weapon: 'cane', build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#7c4a2e', hair: '#c9c5bb', cloth: '#2e2c36', coat: '#ece7da', pants: '#2e2c36', boot: '#1a1820', trim: '#ece7da' } }),
  percy: () => R({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#efcfae', hair: '#d8b45a', cloth: '#7a90b0', coat: '#f4f4f0', pants: '#3a4050', boot: '#20242c', trim: '#f4f4f0' } }),
  odalys: () => R({ hair: 'spiky', outfit: 'tunic', sleeves: 'long', colors: { skin: '#b98a62', hair: '#3a2420', cloth: '#c06a5a', pants: '#3a3a50', boot: '#4a3020', trim: '#e8d0a0' } }),
  hale: () => R({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e6c4a4', hair: '#c4c6cc', cloth: '#e8e8f0', coat: '#343c54', pants: '#2a3044', boot: '#14161e', trim: '#343c54' } }),
  patient: (c = '#a8c8d8', hair = '#5a4030', skin = '#e8c0a0') => R({ hair: 'short', outfit: 'robe', colors: { skin, hair, cloth: c, pants: c, boot: '#d8e0e0' } }),
};
const cache = {};
G.rig = (id, ...a) => { if (a.length) return defs.patient(...a); return (cache[id] = cache[id] || (defs[id] || defs.patient)()); };
G.newRig = (id, ...a) => (defs[id] || defs.patient)(...a);
})();
