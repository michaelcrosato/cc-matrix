// ===== 03_models.js — procedural low-poly models (all forward = -Z) =====
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
function wingGeo(span, chord, sweep, thick = 0.18) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(span, sweep); s.lineTo(span, sweep + chord * 0.35); s.lineTo(0, chord); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.rotateX(Math.PI / 2); g.translate(0, thick / 2, 0);
  return g;
}
function mirrorX(g) {
  g.scale(-1, 1, 1);
  if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
  else for (const name in g.attributes) {
    const at = g.attributes[name], n = at.itemSize, arr = at.array;
    for (let i = 0; i < arr.length; i += 3 * n) for (let k = 0; k < n; k++) { const t = arr[i + n + k]; arr[i + n + k] = arr[i + 2 * n + k]; arr[i + 2 * n + k] = t; }
  }
  g.computeVertexNormals();
  return g;
}
function finGeo(h, len) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(len * 0.7, h); s.lineTo(len, h); s.lineTo(len * 0.8, 0); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(0.07, 0, 0);
  return g;
}

// Player / wingman starfighter
function makeFighter(accent = 0x2f7bff, trim = 0xffcc33) {
  const g = new THREE.Group();
  const white = toon(0xf2f4f8, { flatShading: true }), acc = toon(accent, { flatShading: true }), dark = toon(0x2a3040, { flatShading: true }), tr = toon(trim, { flatShading: true });
  const body = new THREE.ConeGeometry(1.05, 7, 6); body.rotateX(-Math.PI / 2); body.scale(1, 0.62, 1);
  g.add(mesh(body, white, 0, 0, -0.6));
  const back = new THREE.CylinderGeometry(1.05, 0.9, 1.6, 6); back.rotateX(Math.PI / 2); back.scale(1, 0.62, 1);
  g.add(mesh(back, acc, 0, 0, 3.6));
  const nose = new THREE.ConeGeometry(0.45, 1.6, 6); nose.rotateX(-Math.PI / 2);
  g.add(mesh(nose, acc, 0, 0, -4.3));
  const canopy = new THREE.SphereGeometry(0.75, 10, 8); canopy.scale(0.8, 0.6, 1.9);
  g.add(mesh(canopy, toon(0x7fe9ff, { emissive: 0x114466, flatShading: true }), 0, 0.55, -0.4));
  const wings = {};
  for (const side of [-1, 1]) {
    const wg = new THREE.Group(); wg.position.set(side * 0.6, -0.1, 0.4);
    const geo = wingGeo(4.6, 2.6, 1.8); if (side < 0) mirrorX(geo);
    const w = mesh(geo, white); wg.add(w);
    const stripe = wingGeo(3.4, 0.6, 1.3, 0.22); if (side < 0) mirrorX(stripe);
    wg.add(mesh(stripe, acc, side * 0.6, 0.01, 0.6));
    const tipFin = finGeo(1.5, 2.2); const tf = mesh(tipFin, tr, side * 4.55, 0.05, 1.6); tf.rotation.z = -side * 0.25; wg.add(tf);
    const blaster = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6); blaster.rotateX(Math.PI / 2);
    wg.add(mesh(blaster, dark, side * 4.4, -0.1, 0.9));
    g.add(wg); wings[side < 0 ? 'L' : 'R'] = wg;
  }
  const tail = finGeo(1.6, 2.4); g.add(mesh(tail, acc, 0, 0.3, 2.0));
  const eng = new THREE.CylinderGeometry(0.5, 0.6, 0.6, 8); eng.rotateX(Math.PI / 2);
  g.add(mesh(eng, dark, 0, 0, 4.5));
  const flame = new THREE.ConeGeometry(0.5, 2.6, 8); flame.rotateX(Math.PI / 2); flame.translate(0, 0, 1.3);
  const fm = mesh(flame, glow(0.6, 1.6, 4.0, { transparent: true, opacity: 0.9, depthWrite: false }), 0, 0, 4.8);
  g.add(fm);
  g.userData = { wings, flame: fm };
  return shadowed(g, true, false);
}

function makeDart(col = 0xd6403a) {
  const g = new THREE.Group();
  const red = toon(col, { flatShading: true }), dark = toon(0x302838, { flatShading: true });
  const body = new THREE.OctahedronGeometry(1.4, 0); body.scale(0.9, 0.5, 2.2);
  g.add(mesh(body, dark));
  for (const s of [-1, 1]) {
    const w = wingGeo(3.2, 2.2, -1.4, 0.16); if (s < 0) mirrorX(w);
    const wm = mesh(w, red, s * 0.4, 0, -0.4); wm.rotation.z = s * 0.18; g.add(wm);
  }
  g.add(mesh(new THREE.SphereGeometry(0.45, 8, 6), glow(4, 0.6, 0.3), 0, 0.3, -1.4));
  return shadowed(g, true, false);
}
function makeHunter() {
  const g = new THREE.Group();
  const purple = toon(0x6b3fa8, { flatShading: true }), dark = toon(0x221a30, { flatShading: true }), gold = toon(0xe0b040, { flatShading: true });
  const body = new THREE.ConeGeometry(1.1, 6, 4); body.rotateX(-Math.PI / 2); body.rotateZ(Math.PI / 4); body.scale(1, 0.6, 1);
  g.add(mesh(body, dark));
  for (const s of [-1, 1]) {
    const w = wingGeo(4, 2.8, 2.2, 0.16); if (s < 0) mirrorX(w);
    const wm = mesh(w, purple, s * 0.5, 0, -0.2); wm.rotation.z = -s * 0.35; g.add(wm);
    const t = mesh(new THREE.BoxGeometry(0.2, 1.4, 1.8), gold, s * 4.2, 1.4, 2.2); g.add(t);
  }
  g.add(mesh(new THREE.SphereGeometry(0.4, 8, 6), glow(3.5, 0.5, 4), 0, 0.3, -1));
  return shadowed(g, true, false);
}
function makeTank() {
  const g = new THREE.Group();
  const olive = toon(0x8a6a4a, { flatShading: true }), dark = toon(0x3a3028, { flatShading: true }), red = toon(0xc84030, { flatShading: true });
  g.add(mesh(new THREE.BoxGeometry(5, 1.6, 7), olive, 0, 1.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.3, 1.4, 7.6), dark, -2.8, 0.8, 0));
  g.add(mesh(new THREE.BoxGeometry(1.3, 1.4, 7.6), dark, 2.8, 0.8, 0));
  const tur = new THREE.Group(); tur.position.y = 2.4;
  tur.add(mesh(new THREE.CylinderGeometry(1.7, 2, 1.3, 8), red));
  const barrel = new THREE.CylinderGeometry(0.28, 0.28, 4.5, 6); barrel.rotateX(Math.PI / 2); barrel.translate(0, 0, -2.6);
  tur.add(mesh(barrel, dark, 0, 0.2, 0));
  g.add(tur); g.userData.turret = tur;
  return shadowed(g);
}
function makeTurret() {
  const g = new THREE.Group();
  const grey = toon(0x8890a0, { flatShading: true }), red = toon(0xd04838, { flatShading: true }), dark = toon(0x303040, { flatShading: true });
  g.add(mesh(new THREE.CylinderGeometry(2.6, 3.2, 3, 8), grey, 0, 1.5, 0));
  const head = new THREE.Group(); head.position.y = 3.6;
  head.add(mesh(new THREE.SphereGeometry(2.1, 10, 8, 0, TAU, 0, Math.PI / 2), red));
  for (const s of [-1, 1]) { const b = new THREE.CylinderGeometry(0.25, 0.25, 4, 6); b.rotateX(Math.PI / 2); b.translate(0, 0, -2.4); head.add(mesh(b, dark, s * 0.7, 0.6, 0)); }
  g.add(head); g.userData.turret = head;
  return shadowed(g);
}
function makeHauler() {
  const g = new THREE.Group();
  const yel = toon(0xd8a830, { flatShading: true }), dark = toon(0x3a3440, { flatShading: true });
  g.add(mesh(new THREE.BoxGeometry(5, 3.4, 11), yel));
  g.add(mesh(new THREE.BoxGeometry(3.6, 2.4, 3), dark, 0, 0.6, -6.5));
  for (const s of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(5, 0.5, 4), dark, s * 4.8, 0, 1)); g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 3, 8).rotateX(Math.PI / 2), dark, s * 7, 0, 1.5)); }
  g.add(mesh(new THREE.BoxGeometry(3, 2, 3), toon(0x4fd0ff, { emissive: 0x2288aa }), 0, -2.2, 0));
  return shadowed(g, true, false);
}
function makeSpinner() {
  const g = new THREE.Group();
  const m = toon(0x505868, { flatShading: true });
  g.add(mesh(new THREE.IcosahedronGeometry(2, 0), m));
  for (let i = 0; i < 6; i++) { const sp = mesh(new THREE.ConeGeometry(0.6, 2.2, 5), toon(0xe05030, { flatShading: true })); const d = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]][i]; sp.position.set(d[0] * 2.4, d[1] * 2.4, d[2] * 2.4); sp.lookAt(d[0] * 9, d[1] * 9, d[2] * 9); sp.rotateX(Math.PI / 2); g.add(sp); }
  g.add(mesh(new THREE.SphereGeometry(0.9, 8, 6), glow(4, 0.8, 0.2), 0, 0, 0));
  return shadowed(g, true, false);
}
function makeMissile() {
  const g = new THREE.Group();
  const b = new THREE.CylinderGeometry(0.4, 0.4, 3, 6); b.rotateX(Math.PI / 2);
  g.add(mesh(b, toon(0xe8e8e8, { flatShading: true })));
  const n = new THREE.ConeGeometry(0.4, 1, 6); n.rotateX(-Math.PI / 2); g.add(mesh(n, toon(0xd03030), 0, 0, -2));
  g.add(mesh(new THREE.SphereGeometry(0.55, 6, 5), glow(4, 1.5, 0.3), 0, 0, 1.8));
  return g;
}

// rings & items
function makeRing(gold) {
  const g = new THREE.Group();
  const t = new THREE.TorusGeometry(gold ? 5.5 : 5, gold ? 0.9 : 0.7, 8, 28);
  g.add(mesh(t, toon(gold ? 0xffc22a : 0xd8e4f0, { emissive: gold ? 0x553300 : 0x223344 })));
  g.add(mesh(new THREE.TorusGeometry(gold ? 5.5 : 5, 0.25, 6, 28), glow(gold ? 3 : 1.6, gold ? 2.2 : 2.0, gold ? 0.6 : 2.4)));
  return g;
}
function makeCheckpointRing() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(16, 1.6, 10, 40), toon(0x40e070, { emissive: 0x104020 })));
  g.add(mesh(new THREE.TorusGeometry(16, 0.5, 6, 40), glow(0.8, 3.5, 1.2)));
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.add(mesh(new THREE.BoxGeometry(1.2, 3.4, 1.2), toon(0xffffff), Math.cos(a) * 16, Math.sin(a) * 16, 0)); }
  return g;
}
function makeGate() {
  const g = new THREE.Group();
  const t = new THREE.TorusGeometry(11, 1.1, 6, 6); t.rotateZ(Math.PI / 6);
  g.add(mesh(t, toon(0xff8a20, { emissive: 0x402000, flatShading: true })));
  const glowRing = mesh(new THREE.TorusGeometry(10.2, 0.35, 6, 6).rotateZ(Math.PI / 6), glow(4, 1.4, 0.3));
  g.add(glowRing); g.userData.glow = glowRing;
  return g;
}
const ITEM_DEF = {
  laser: { col: 0x40ff70, glow: [0.6, 4, 1], label: 'L' },
  bomb: { col: 0xff5050, glow: [4, 0.8, 0.6], label: 'B' },
  wing: { col: 0x40a0ff, glow: [0.6, 1.8, 4], label: 'W' },
  shield: { col: 0xffd040, glow: [4, 3, 0.6], label: 'S' },
  life: { col: 0xff70d0, glow: [4, 0.9, 3], label: '1UP' },
};
function letterTexture(txt, col) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#' + col.toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#fff'; x.font = `bold ${txt.length > 1 ? 54 : 90}px Russo One, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = '#102'; x.strokeText(txt, 64, 68); x.fillText(txt, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeItem(type) {
  const d = ITEM_DEF[type]; const g = new THREE.Group();
  const box = mesh(new THREE.BoxGeometry(3, 3, 3), toon(0xffffff, { map: letterTexture(d.label, d.col), unique: true }));
  g.add(box);
  const halo = mesh(new THREE.TorusGeometry(3.2, 0.25, 6, 24), glow(...d.glow)); g.add(halo);
  g.userData.box = box; g.userData.halo = halo;
  return g;
}

// static scenery prefabs
function makeTreeGeo(rng) {
  const h = 6 + rng() * 8, r = 2 + rng() * 2.5;
  const trunk = new THREE.CylinderGeometry(0.4, 0.6, h * 0.4, 5); trunk.translate(0, h * 0.2, 0);
  const crown = rng() < 0.5 ? new THREE.ConeGeometry(r, h * 0.8, 6) : new THREE.IcosahedronGeometry(r, 0);
  crown.translate(0, h * 0.4 + (crown.type === 'ConeGeometry' ? h * 0.4 : r * 0.8), 0);
  return [trunk, crown];
}
function makeBuilding(w, h, d, colIdx, rng) {
  const palette = [0xe8d8c0, 0xb8d0e8, 0xf0c0a0, 0xd0e0d0, 0xe0e0f0, 0xc8b8e0];
  const base = palette[colIdx % palette.length];
  const tex = windowTexture('#' + base.toString(16).padStart(6, '0'), rng() < 0.5 ? '#ffe9a0' : '#a8f0ff');
  tex.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 16)));
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(w, h, d), toon(0xffffff, { map: tex, unique: true }), 0, h / 2, 0);
  g.add(body);
  g.add(mesh(new THREE.BoxGeometry(w * 1.06, 1.2, d * 1.06), toon(0x606878), 0, h + 0.6, 0));
  if (rng() < 0.5) g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 8, 5), toon(0x707080), w * 0.25, h + 4, 0));
  if (rng() < 0.4) g.add(mesh(new THREE.SphereGeometry(0.6, 6, 5), glow(4, 0.4, 0.3), w * 0.25, h + 8.2, 0));
  return shadowed(g);
}

// ---------- comms portraits (procedural, drawn once per frame while talking) ----------
const CAST = {
  vale: { name: 'VALE', species: 'fox', fur: '#e8823a', light: '#fff1e0', eye: '#2a6', bg: '#1d3a6e', accent: '#ffd23f' },
  tusk: { name: 'TUSK', species: 'boar', fur: '#7d6a5c', light: '#c9b8a6', eye: '#a52', bg: '#3a2a1e', accent: '#ffb060' },
  wren: { name: 'WREN', species: 'bird', fur: '#3fb0c8', light: '#e8fbff', eye: '#124', bg: '#123c48', accent: '#7ff0ff' },
  moss: { name: 'MOSS', species: 'toad', fur: '#78b84a', light: '#e8f6c0', eye: '#d90', bg: '#1f3a1a', accent: '#c8ff70' },
  hollis: { name: 'ADM. HOLLIS', species: 'hound', fur: '#a07848', light: '#e8d4b0', eye: '#321', bg: '#2a2a3a', accent: '#ffe0a0' },
  kraag: { name: 'OVERSEER KRAAG', species: 'lizard', fur: '#6a4aa0', light: '#c8a8ff', eye: '#f30', bg: '#2a0a2a', accent: '#ff5080' },
};
function drawPortrait(ctx, who, talk, t, static_ = 0) {
  const c = CAST[who]; const W = 160;
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, W);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; for (let y = 0; y < W; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.save(); ctx.translate(80, 92 + Math.sin(t * 3) * 1.5);
  const mouth = talk ? Math.abs(Math.sin(t * 22)) * 10 : 1;
  ctx.lineWidth = 5; ctx.strokeStyle = '#0a0a18'; ctx.lineJoin = 'round';
  const shape = (f, fill) => { ctx.beginPath(); f(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  // flight suit collar
  shape(() => { ctx.moveTo(-70, 80); ctx.lineTo(-45, 40); ctx.lineTo(45, 40); ctx.lineTo(70, 80); }, '#e8ecf4');
  ctx.fillStyle = c.accent; ctx.fillRect(-10, 44, 20, 30);
  switch (c.species) {
    case 'fox':
      shape(() => { ctx.moveTo(-42, -30); ctx.lineTo(-30, -78); ctx.lineTo(-8, -40); }, c.fur);
      shape(() => { ctx.moveTo(42, -30); ctx.lineTo(30, -78); ctx.lineTo(8, -40); }, c.fur);
      shape(() => { ctx.moveTo(-46, -30); ctx.quadraticCurveTo(0, -60, 46, -30); ctx.lineTo(40, 20); ctx.lineTo(0, 46); ctx.lineTo(-40, 20); ctx.closePath(); }, c.fur);
      shape(() => { ctx.moveTo(-30, 10); ctx.lineTo(0, 46 + mouth * 0.4); ctx.lineTo(30, 10); ctx.quadraticCurveTo(0, 0, -30, 10); }, c.light);
      break;
    case 'boar':
      shape(() => { ctx.moveTo(-40, -36); ctx.lineTo(-48, -66); ctx.lineTo(-18, -46); }, c.fur);
      shape(() => { ctx.moveTo(40, -36); ctx.lineTo(48, -66); ctx.lineTo(18, -46); }, c.fur);
      shape(() => { ctx.ellipse(0, -6, 50, 50, 0, 0, TAU); }, c.fur);
      shape(() => { ctx.ellipse(0, 22, 26, 18 + mouth * 0.3, 0, 0, TAU); }, '#d8a090');
      ctx.fillStyle = '#0a0a18'; ctx.beginPath(); ctx.arc(-9, 20, 4, 0, TAU); ctx.arc(9, 20, 4, 0, TAU); ctx.fill();
      shape(() => { ctx.moveTo(-26, 30); ctx.lineTo(-34, 6); ctx.lineTo(-20, 26); }, '#fff');
      shape(() => { ctx.moveTo(26, 30); ctx.lineTo(34, 6); ctx.lineTo(20, 26); }, '#fff');
      break;
    case 'bird':
      shape(() => { ctx.moveTo(-6, -50); ctx.lineTo(10, -84); ctx.lineTo(18, -48); }, c.accent);
      shape(() => { ctx.ellipse(0, -10, 44, 48, 0, 0, TAU); }, c.fur);
      shape(() => { ctx.moveTo(-14, 8); ctx.lineTo(0, 40); ctx.lineTo(14, 8); }, '#ffb830');
      shape(() => { ctx.moveTo(-10, 22 + mouth * 0.2); ctx.lineTo(0, 30 + mouth); ctx.lineTo(10, 22 + mouth * 0.2); }, '#e09020');
      break;
    case 'toad':
      shape(() => { ctx.ellipse(0, 0, 56, 42, 0, 0, TAU); }, c.fur);
      shape(() => { ctx.ellipse(-26, -36, 16, 16, 0, 0, TAU); }, c.fur);
      shape(() => { ctx.ellipse(26, -36, 16, 16, 0, 0, TAU); }, c.fur);
      shape(() => { ctx.ellipse(0, 18, 34, 4 + mouth * 0.8, 0, 0, TAU); }, '#c05050');
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a0a18'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-16, -8, 9, 0, TAU); ctx.arc(16, -8, 9, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 5;
      break;
    case 'hound':
      shape(() => { ctx.ellipse(-46, 0, 16, 40, 0.2, 0, TAU); }, '#6a4a2a');
      shape(() => { ctx.ellipse(46, 0, 16, 40, -0.2, 0, TAU); }, '#6a4a2a');
      shape(() => { ctx.ellipse(0, -8, 42, 48, 0, 0, TAU); }, c.fur);
      shape(() => { ctx.ellipse(0, 22, 24, 18 + mouth * 0.3, 0, 0, TAU); }, c.light);
      ctx.fillStyle = '#0a0a18'; ctx.beginPath(); ctx.ellipse(0, 10, 9, 6, 0, 0, TAU); ctx.fill();
      shape(() => { ctx.rect(-44, -64, 88, 18); }, '#304060');
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-8, -62, 16, 14);
      break;
    case 'lizard':
      shape(() => { ctx.moveTo(-40, -40); ctx.lineTo(-20, -80); ctx.lineTo(0, -50); ctx.lineTo(20, -80); ctx.lineTo(40, -40); }, c.accent);
      shape(() => { ctx.moveTo(-44, -36); ctx.quadraticCurveTo(0, -64, 44, -36); ctx.lineTo(50, 10); ctx.quadraticCurveTo(0, 50 + mouth, -50, 10); ctx.closePath(); }, c.fur);
      ctx.strokeStyle = '#0a0a18'; ctx.beginPath(); ctx.moveTo(-34, 18); ctx.lineTo(34, 18 + mouth * 0.5); ctx.stroke();
      break;
  }
  // eyes
  if (c.species !== 'toad') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-18, -14, 10, 8, 0, 0, TAU); ctx.ellipse(18, -14, 10, 8, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  }
  const blink = (Math.sin(t * 1.3) > 0.985);
  ctx.fillStyle = c.eye;
  if (!blink) { ctx.beginPath(); ctx.arc(-16, c.species === 'toad' ? -8 : -14, 5, 0, TAU); ctx.arc(20, c.species === 'toad' ? -8 : -14, 5, 0, TAU); ctx.fill(); }
  if (c.species === 'lizard') { ctx.fillStyle = '#000'; ctx.fillRect(-17, -20, 2, 12); ctx.fillRect(19, -20, 2, 12); }
  if (who === 'vale' || who === 'tusk' || who === 'wren' || who === 'moss') {
    ctx.strokeStyle = '#202838'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -10, 60, Math.PI * 1.1, Math.PI * 1.35); ctx.stroke();
    ctx.fillStyle = '#304050'; ctx.fillRect(-64, -6, 10, 22);
  }
  ctx.restore();
  if (static_ > 0) { for (let i = 0; i < 300 * static_; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#000'; ctx.fillRect(Math.random() * W, Math.random() * W, 3, 2); } }
}
