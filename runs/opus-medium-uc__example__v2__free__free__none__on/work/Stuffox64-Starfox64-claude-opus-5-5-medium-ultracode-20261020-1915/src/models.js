// Procedural cel-shaded models: plush pilots & their fighters, the wind-up tin armada, pickups and props.
import * as THREE from 'three/webgpu';
import { vec3 } from 'three/tsl';

let gradientMap = null;
export function getGradient() {
  if (gradientMap) return gradientMap;
  const steps = [70, 140, 205, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => { data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255; });
  gradientMap = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  gradientMap.minFilter = THREE.NearestFilter; gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false; gradientMap.needsUpdate = true;
  return gradientMap;
}

const toonCache = new Map();
export function toon(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (!opts.unique && toonCache.has(key)) return toonCache.get(key);
  const m = new THREE.MeshToonNodeMaterial({ color: hex, gradientMap: getGradient() });
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei ?? 1; }
  if (opts.side) m.side = opts.side;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 0.6; m.depthWrite = false; }
  if (opts.vertexColors) m.vertexColors = true;
  if (!opts.unique) toonCache.set(key, m);
  return m;
}
const glowCache = new Map();
// HDR unlit material that feeds bloom
export function glow(hex, intensity = 3, opts = {}) {
  const key = hex + '_' + intensity + JSON.stringify(opts);
  if (!opts.unique && glowCache.has(key)) return glowCache.get(key);
  const m = new THREE.MeshBasicNodeMaterial();
  const c = new THREE.Color(hex);
  m.colorNode = vec3(c.r, c.g, c.b).mul(intensity);
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 0.8; m.depthWrite = false; }
  if (opts.additive) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
  if (opts.side) m.side = opts.side;
  if (!opts.unique) glowCache.set(key, m);
  return m;
}
export function flatColor(hex) { return new THREE.MeshBasicNodeMaterial({ color: hex }); }

function mesh(geo, mat, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m;
}

// ---------------- Pilots / Fighters ----------------
export const PILOTS = {
  tod:     { name: 'Tod Patchwell', species: 'fox', body: 0xf2f0ea, accent: 0xe86a1c, stripe: 0x2d6ee0, fur: 0xe8741e, inner: 0xfff2dc, ear: 'fox' },
  bramble: { name: 'Bramble', species: 'badger', body: 0xe9e4da, accent: 0x5a5d66, stripe: 0x3fa34d, fur: 0x777a85, inner: 0xf5f5f5, ear: 'round' },
  pippa:   { name: 'Pippa', species: 'bunny', body: 0xf6eef0, accent: 0xf08bb4, stripe: 0x8a5cd6, fur: 0xf7d9e6, inner: 0xff9fc4, ear: 'bunny' },
  gizmo:   { name: 'Gizmo', species: 'owl', body: 0xeee9df, accent: 0xc79a3a, stripe: 0x20a3b5, fur: 0xb98a4b, inner: 0xf6e1b0, ear: 'tuft' },
};

function earMeshes(kind, furMat, innerMat) {
  const g = new THREE.Group();
  const mk = (geo, x, y, z, rz, rx = 0) => { const e = mesh(geo, furMat); e.position.set(x, y, z); e.rotation.set(rx, 0, rz); g.add(e); return e; };
  if (kind === 'fox') {
    const geo = new THREE.ConeGeometry(0.22, 0.5, 4);
    mk(geo, -0.25, 0.42, 0, 0.35); mk(geo, 0.25, 0.42, 0, -0.35);
  } else if (kind === 'round') {
    const geo = new THREE.SphereGeometry(0.15, 10, 8);
    mk(geo, -0.3, 0.3, 0, 0); mk(geo, 0.3, 0.3, 0, 0);
  } else if (kind === 'bunny') {
    const geo = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
    mk(geo, -0.15, 0.7, 0.08, 0.15, 0.25); mk(geo, 0.15, 0.7, 0.08, -0.15, 0.25);
  } else if (kind === 'tuft') {
    const geo = new THREE.ConeGeometry(0.12, 0.35, 5);
    mk(geo, -0.25, 0.38, 0, 0.6); mk(geo, 0.25, 0.38, 0, -0.6);
  } else if (kind === 'jackal') {
    const geo = new THREE.ConeGeometry(0.18, 0.7, 4);
    mk(geo, -0.22, 0.5, 0, 0.2); mk(geo, 0.22, 0.5, 0, -0.2);
  }
  return g;
}

function wingShape(span, root, tip, sweep) {
  const s = new THREE.Shape();
  s.moveTo(0, -root / 2); s.lineTo(span, -root / 2 + sweep); s.lineTo(span, -root / 2 + sweep + tip); s.lineTo(0, root / 2); s.closePath();
  return s;
}

// The plush fighter ("Plushwing"). Forward is -Z.
export function makeFighter(pilotKey = 'tod', scale = 1) {
  const P = PILOTS[pilotKey] || PILOTS.tod;
  const root = new THREE.Group();
  const ship = new THREE.Group(); root.add(ship);
  const bodyM = toon(P.body), accM = toon(P.accent), strM = toon(P.stripe), furM = toon(P.fur), inM = toon(P.inner);
  const darkM = toon(0x2a2d3a);
  const body = mesh(new THREE.CapsuleGeometry(0.65, 2.6, 6, 14), bodyM);
  body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 0.8); ship.add(body);
  const nose = mesh(new THREE.ConeGeometry(0.55, 1.6, 14), accM);
  nose.rotation.x = -Math.PI / 2; nose.position.z = -2.4; ship.add(nose);
  const noseTip = mesh(new THREE.SphereGeometry(0.16, 8, 6), darkM); noseTip.position.z = -3.2; ship.add(noseTip);
  // cockpit with plush pilot head
  const canopy = mesh(new THREE.SphereGeometry(0.62, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x9fe3ff, { transparent: true, opacity: 0.45 }), false);
  canopy.scale.set(0.9, 1.0, 1.6); canopy.position.set(0, 0.35, -0.5); ship.add(canopy);
  const head = new THREE.Group(); head.position.set(0, 0.62, -0.35); ship.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.34, 14, 10), furM));
  const snout = mesh(new THREE.SphereGeometry(0.16, 10, 8), inM); snout.position.set(0, -0.05, -0.28); snout.scale.set(1, 0.8, 1.2); head.add(snout);
  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 6);
  for (const x of [-0.13, 0.13]) { const e = mesh(eyeGeo, darkM, false); e.position.set(x, 0.08, -0.29); head.add(e); }
  head.add(earMeshes(P.ear, furM, inM));
  head.scale.setScalar(0.9);
  // wings (separate so they can break off)
  const wingGeo = new THREE.ExtrudeGeometry(wingShape(3.4, 1.9, 0.8, 1.3), { depth: 0.14, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 2 });
  wingGeo.rotateX(Math.PI / 2);
  const wings = {};
  for (const side of [-1, 1]) {
    const w = new THREE.Group();
    const wm = mesh(wingGeo, bodyM); wm.scale.x = side; w.add(wm);
    const tipGeo = new THREE.BoxGeometry(0.18, 0.9, 1.1);
    const tipM = mesh(tipGeo, accM); tipM.position.set(3.4 * side, 0.3, 0.75); tipM.rotation.x = -0.25; w.add(tipM);
    const stripe = mesh(new THREE.BoxGeometry(1.4, 0.05, 0.35), strM); stripe.position.set(1.9 * side, 0.12, 0.4); stripe.rotation.y = side * -0.3; w.add(stripe);
    const btn = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), accM); btn.position.set(1.2 * side, 0.12, 0.1); w.add(btn);
    w.position.set(0.45 * side, -0.15, 0.4);
    w.rotation.z = side * 0.08;
    ship.add(w);
    wings[side < 0 ? 'L' : 'R'] = w;
  }
  // tail fin
  const fin = mesh(new THREE.ExtrudeGeometry(wingShape(1.2, 1.2, 0.5, 0.9), { depth: 0.1, bevelEnabled: false }), accM);
  fin.rotation.set(0, Math.PI / 2, Math.PI / 2); fin.position.set(0.05, 0.35, 1.5); ship.add(fin);
  // engines
  const eng = mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.7, 14), darkM); eng.rotation.x = Math.PI / 2; eng.position.z = 1.8; ship.add(eng);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.0, 12, 1, true), glow(0x66ccff, 4, { additive: true }));
  flame.rotation.x = Math.PI / 2; flame.position.z = 2.9; ship.add(flame);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.4, 14), glow(0xbff2ff, 5));
  core.position.z = 2.16; ship.add(core);
  // stitched seams: little dark dashes along the body (plush look)
  const stitchGeo = new THREE.BoxGeometry(0.04, 0.04, 0.18);
  for (let i = 0; i < 9; i++) { const s = mesh(stitchGeo, darkM, false); s.position.set(0, 0.52, -1.6 + i * 0.36); ship.add(s); }
  root.scale.setScalar(scale);
  return { root, ship, wings, flame, head };
}

// ---------------- Tin Armada ----------------
const TIN = { body: 0x9aa4b2, dark: 0x3b4252, red: 0xd63c3c, yellow: 0xf2c230, brass: 0xc9a043, blue: 0x3a6fd8, black: 0x22252d };

function windKey(scale = 1, matHex = TIN.brass) {
  const g = new THREE.Group(); const m = toon(matHex);
  const shaft = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), m); shaft.position.y = 0.3; g.add(shaft);
  const bow = new THREE.Group(); bow.position.y = 0.75; g.add(bow);
  for (const s of [-1, 1]) { const loop = mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 16), m); loop.position.x = s * 0.33; bow.add(loop); }
  g.scale.setScalar(scale); g.userData.spin = bow;
  return g;
}

export function makeEnemy(type) {
  const g = new THREE.Group(); const parts = {};
  const body = toon(TIN.body), dark = toon(TIN.dark), red = toon(TIN.red), yel = toon(TIN.yellow);
  if (type === 'drone') {
    const b = mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.6, 12), red); b.rotation.x = Math.PI / 2; g.add(b);
    const n = mesh(new THREE.SphereGeometry(0.9, 12, 10), body); n.position.z = -1.3; n.scale.z = 0.8; g.add(n);
    const eye = mesh(new THREE.SphereGeometry(0.3, 10, 8), glow(0xffe066, 3)); eye.position.set(0, 0.2, -1.95); g.add(eye);
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.BoxGeometry(2.2, 0.12, 1.0), yel); w.position.set(s * 1.5, 0, 0.3); w.rotation.z = s * 0.2; g.add(w);
      const tip = mesh(new THREE.SphereGeometry(0.22, 8, 6), dark); tip.position.set(s * 2.6, 0.2, 0.3); g.add(tip);
    }
    const k = windKey(1.2); k.position.set(0, 0.8, 0.4); g.add(k); parts.key = k.userData.spin;
    const fl = mesh(new THREE.ConeGeometry(0.5, 1.2, 8, 1, true), glow(0xff8833, 4, { additive: true }), false); fl.rotation.x = Math.PI / 2; fl.position.z = 1.9; g.add(fl); parts.flame = fl;
  } else if (type === 'dart') { // fast interceptor
    const b = mesh(new THREE.ConeGeometry(0.8, 3.6, 4), body); b.rotation.x = -Math.PI / 2; g.add(b);
    for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(2.6, 0.1, 0.8), red); w.position.set(s * 1.1, 0, 0.8); w.rotation.y = s * 0.5; g.add(w); }
    const eye = mesh(new THREE.SphereGeometry(0.25, 8, 6), glow(0xff3355, 4)); eye.position.set(0, 0.35, -0.6); g.add(eye);
    const fl = mesh(new THREE.ConeGeometry(0.5, 1.6, 8, 1, true), glow(0xff5522, 4, { additive: true }), false); fl.rotation.x = Math.PI / 2; fl.position.z = 2.5; g.add(fl); parts.flame = fl;
  } else if (type === 'turret') {
    const base = mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.6, 14), dark); base.position.y = 0.8; g.add(base);
    const stripe = mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.35, 14), yel); stripe.position.y = 1.2; g.add(stripe);
    const head = new THREE.Group(); head.position.y = 2.2; g.add(head); parts.head = head;
    head.add(mesh(new THREE.SphereGeometry(1.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), red));
    const barrel = mesh(new THREE.CylinderGeometry(0.3, 0.38, 3.2, 10), body); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.6, -1.8); head.add(barrel);
    const eye = mesh(new THREE.SphereGeometry(0.35, 8, 6), glow(0xffe066, 3)); eye.position.set(0, 1.0, -1.25); head.add(eye);
  } else if (type === 'tank') {
    const hull = mesh(new THREE.BoxGeometry(4, 1.6, 5.5), toon(0x6d8f4e)); hull.position.y = 1.3; g.add(hull);
    for (const s of [-1, 1]) { const t = mesh(new THREE.BoxGeometry(1.1, 1.3, 6), dark); t.position.set(s * 2.3, 0.7, 0); g.add(t); }
    const head = new THREE.Group(); head.position.y = 2.4; g.add(head); parts.head = head;
    head.add(mesh(new THREE.CylinderGeometry(1.4, 1.6, 1, 12), toon(0x7fa35c)));
    const barrel = mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.6, 8), dark); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.2, -2.2); head.add(barrel);
    const k = windKey(1.4); k.position.set(0, 1.2, 2.0); k.rotation.x = 0.3; g.add(k); parts.key = k.userData.spin;
  } else if (type === 'bomber') {
    const b = mesh(new THREE.CapsuleGeometry(1.6, 5, 6, 12), toon(0x7b6bd0)); b.rotation.x = Math.PI / 2; g.add(b);
    const w = mesh(new THREE.BoxGeometry(14, 0.3, 2.6), body); w.position.z = 0.3; g.add(w);
    parts.props = [];
    for (const s of [-1, 1]) {
      const pod = mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.4, 10), dark); pod.rotation.x = Math.PI / 2; pod.position.set(s * 4.5, 0, -0.6); g.add(pod);
      const prop = new THREE.Group(); prop.position.set(s * 4.5, 0, -1.9); g.add(prop); parts.props.push(prop);
      for (let i = 0; i < 3; i++) { const bl = mesh(new THREE.BoxGeometry(0.35, 2.6, 0.08), yel); bl.rotation.z = i * Math.PI / 1.5; prop.add(bl); }
    }
    const tail = mesh(new THREE.BoxGeometry(0.2, 2.4, 1.6), red); tail.position.set(0, 1.4, 3.2); g.add(tail);
    const eye = mesh(new THREE.SphereGeometry(0.5, 10, 8), glow(0xffe066, 3)); eye.position.set(0, 0.6, -3.6); g.add(eye);
  } else if (type === 'carrier') {
    const box = mesh(new THREE.BoxGeometry(3.4, 2.6, 3.4), toon(0xe0c040)); g.add(box);
    for (const s of [-1, 1]) { const band = mesh(new THREE.BoxGeometry(3.5, 0.4, 0.5), red); band.position.set(0, 0, s * 0.9); g.add(band); }
    const q = mesh(new THREE.TorusGeometry(0.6, 0.18, 8, 12, Math.PI * 1.4), red); q.position.set(0, 0.4, -1.75); q.rotation.z = -0.6; g.add(q);
    const prop = new THREE.Group(); prop.position.y = 1.8; g.add(prop); parts.props = [prop];
    for (let i = 0; i < 2; i++) { const bl = mesh(new THREE.BoxGeometry(5, 0.1, 0.4), dark); bl.rotation.y = i * Math.PI / 2; prop.add(bl); }
  } else if (type === 'ace') {
    const b = mesh(new THREE.ConeGeometry(0.9, 4.2, 5), toon(0x3c3f52)); b.rotation.x = -Math.PI / 2; g.add(b);
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.BoxGeometry(3.4, 0.15, 1.2), toon(0x6b2cbd)); w.position.set(s * 1.7, 0, 0.7); w.rotation.set(0, s * 0.45, s * -0.25); g.add(w);
      const wt = mesh(new THREE.BoxGeometry(0.15, 1.2, 1.2), red); wt.position.set(s * 3.2, 0.45, 1.3); g.add(wt);
    }
    const head = new THREE.Group(); head.position.set(0, 0.6, -0.3); g.add(head);
    head.add(mesh(new THREE.SphereGeometry(0.33, 10, 8), toon(0x8a7b66)));
    head.add(earMeshes('jackal', toon(0x8a7b66), dark));
    const canopy = mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff5577, { transparent: true, opacity: 0.4 }), false);
    canopy.scale.set(0.9, 1, 1.5); canopy.position.set(0, 0.3, -0.3); g.add(canopy);
    const fl = mesh(new THREE.ConeGeometry(0.55, 1.8, 8, 1, true), glow(0xd05cff, 4, { additive: true }), false); fl.rotation.x = Math.PI / 2; fl.position.z = 3.0; g.add(fl); parts.flame = fl;
  } else if (type === 'mine') {
    const c = mesh(new THREE.IcosahedronGeometry(1.4, 0), dark); g.add(c);
    const sg = new THREE.ConeGeometry(0.3, 1.2, 6);
    for (const v of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const s = mesh(sg, red); s.position.set(v[0] * 1.5, v[1] * 1.5, v[2] * 1.5); s.lookAt(v[0] * 5, v[1] * 5, v[2] * 5); s.rotateX(Math.PI / 2); g.add(s);
    }
    const l = mesh(new THREE.SphereGeometry(0.4, 8, 6), glow(0xff2222, 4)); l.position.y = 1.2; g.add(l); parts.light = l;
  } else if (type === 'pillar') {
    const h = 34;
    const p = mesh(new THREE.CylinderGeometry(2.4, 2.8, h, 12), toon(0xd9cdb8)); p.position.y = h / 2; g.add(p);
    for (let i = 0; i < 4; i++) { const r = mesh(new THREE.TorusGeometry(2.6, 0.35, 6, 16), red); r.rotation.x = Math.PI / 2; r.position.y = 5 + i * 8; g.add(r); }
    const top = mesh(new THREE.ConeGeometry(3.2, 4, 12), toon(0x5aa0e0)); top.position.y = h + 2; g.add(top);
    const weak = mesh(new THREE.SphereGeometry(1.3, 10, 8), glow(0xffaa22, 3)); weak.position.set(0, 3, -2.4); g.add(weak);
  } else if (type === 'satellite') { // space laser buoy
    const c = mesh(new THREE.OctahedronGeometry(1.8, 0), toon(0x5d6b8a)); g.add(c);
    for (const s of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(3.4, 0.1, 1.6), toon(0x2a5fd6)); p.position.x = s * 3.2; g.add(p); }
    const eye = mesh(new THREE.SphereGeometry(0.6, 10, 8), glow(0xff3355, 3)); eye.position.z = -1.5; g.add(eye);
  }
  return { root: g, parts };
}

// ---------------- Bosses ----------------
export function makeColossus() {
  // "Windup Colossus": a tin crab walker with arm cannons and a giant wind-up key core
  const root = new THREE.Group(); const parts = {};
  const shell = toon(0xc0472f), tin = toon(TIN.body), dark = toon(TIN.dark), yel = toon(TIN.yellow);
  const body = new THREE.Group(); body.position.y = 18; root.add(body); parts.body = body;
  const hull = mesh(new THREE.SphereGeometry(11, 24, 16), shell); hull.scale.set(1.4, 0.55, 1.0); body.add(hull);
  const belly = mesh(new THREE.CylinderGeometry(13, 11, 4, 20), tin); belly.position.y = -3.5; body.add(belly);
  for (let i = 0; i < 10; i++) { const r = mesh(new THREE.SphereGeometry(0.8, 8, 6), yel); const a = i / 10 * Math.PI * 2; r.position.set(Math.cos(a) * 13.5, -2.4, Math.sin(a) * 11); body.add(r); }
  // eyes on stalks
  parts.eyes = [];
  for (const s of [-1, 1]) {
    const stalk = mesh(new THREE.CylinderGeometry(0.6, 0.8, 6, 8), tin); stalk.position.set(s * 4, 6, -7); body.add(stalk);
    const eye = mesh(new THREE.SphereGeometry(2, 14, 10), toon(0xffffff)); eye.position.set(s * 4, 9.5, -7); body.add(eye);
    const pupil = mesh(new THREE.SphereGeometry(1, 10, 8), glow(0xff3030, 3)); pupil.position.set(s * 4, 9.6, -8.6); body.add(pupil);
    parts.eyes.push(pupil);
  }
  // arms with cannons (destructible weak points)
  parts.arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * 13, 0, -6); body.add(shoulder);
    const upper = mesh(new THREE.CylinderGeometry(1.4, 1.6, 9, 10), tin); upper.rotation.z = Math.PI / 2; upper.position.x = s * 4.5; shoulder.add(upper);
    const fore = new THREE.Group(); fore.position.x = s * 9; shoulder.add(fore);
    const claw = mesh(new THREE.BoxGeometry(5, 4.5, 8), shell); claw.position.z = -3; fore.add(claw);
    const barrel = mesh(new THREE.CylinderGeometry(1.1, 1.4, 6, 10), dark); barrel.rotation.x = Math.PI / 2; barrel.position.z = -9; fore.add(barrel);
    const muzzle = mesh(new THREE.SphereGeometry(1.2, 10, 8), glow(0xffaa33, 3)); muzzle.position.z = -12; fore.add(muzzle);
    parts.arms.push({ shoulder, fore, muzzle, side: s });
  }
  // legs (procedurally animated)
  parts.legs = [];
  for (let i = 0; i < 6; i++) {
    const s = i < 3 ? -1 : 1, k = i % 3;
    const hip = new THREE.Group(); hip.position.set(s * 11, -2, -6 + k * 7); body.add(hip);
    const thigh = mesh(new THREE.CylinderGeometry(1, 1.2, 12, 8), tin); thigh.rotation.z = s * -1.0; thigh.position.set(s * 5, 3, 0); hip.add(thigh);
    const knee = new THREE.Group(); knee.position.set(s * 10, 6.5, 0); hip.add(knee);
    const shin = mesh(new THREE.CylinderGeometry(1.0, 0.4, 24, 8), shell); shin.position.y = -12; knee.add(shin);
    parts.legs.push({ hip, knee, side: s, phase: k * 2.1 + (s > 0 ? Math.PI : 0) });
  }
  // the weak point: giant wind-up key (core)
  const key = windKey(9, 0xf2c230); key.position.set(0, 6.5, 2); body.add(key);
  parts.key = key; parts.keySpin = key.userData.spin;
  const core = mesh(new THREE.SphereGeometry(3.2, 16, 12), glow(0x44ffcc, 2.5)); core.position.set(0, 6.5, 2); body.add(core); parts.core = core;
  return { root, parts };
}

export function makeMusicBox() {
  // "The Music Box": Baron Ratchet's flagship. Shield generators on corners, a core inside the lid.
  const root = new THREE.Group(); const parts = {};
  const wood = toon(0x7a3f8f), trim = toon(0xe8c050), tin = toon(TIN.body), dark = toon(TIN.dark);
  const box = mesh(new THREE.BoxGeometry(90, 34, 60), wood); root.add(box);
  for (const y of [-17, 17]) for (const z of [-30, 30]) { const t = mesh(new THREE.BoxGeometry(92, 2.4, 2.4), trim); t.position.set(0, y, z); root.add(t); }
  for (const x of [-45, 45]) for (const z of [-30, 30]) { const t = mesh(new THREE.BoxGeometry(2.4, 36, 2.4), trim); t.position.set(x, 0, z); root.add(t); }
  const lid = new THREE.Group(); lid.position.set(0, 17, 30); root.add(lid); parts.lid = lid;
  const lidM = mesh(new THREE.BoxGeometry(92, 4, 62), wood); lidM.position.set(0, 2, -31); lid.add(lidM);
  const lidT = mesh(new THREE.BoxGeometry(94, 1.2, 64), trim); lidT.position.set(0, 4.4, -31); lid.add(lidT);
  // core: spinning dancer-cylinder inside
  const core = new THREE.Group(); core.position.set(0, 14, 0); root.add(core); parts.core = core;
  const coreM = mesh(new THREE.CylinderGeometry(6, 8, 14, 16), glow(0xff4fa8, 2.2)); core.add(coreM);
  const coreTop = mesh(new THREE.SphereGeometry(5, 14, 10), toon(0xffd0ea)); coreTop.position.y = 9; core.add(coreTop);
  parts.coreMesh = coreM;
  // giant crank on the side
  const crank = new THREE.Group(); crank.position.set(48, 0, 0); root.add(crank); parts.crank = crank;
  const arm = mesh(new THREE.BoxGeometry(3, 26, 3), trim); arm.position.y = 10; crank.add(arm);
  const handle = mesh(new THREE.CylinderGeometry(2, 2, 10, 10), tin); handle.rotation.z = Math.PI / 2; handle.position.set(5, 22, 0); crank.add(handle);
  // shield generators
  parts.gens = [];
  for (const [x, z] of [[-40, -25], [40, -25], [-40, 25], [40, 25]]) {
    const g = new THREE.Group(); g.position.set(x, 20, z); root.add(g);
    g.add(mesh(new THREE.CylinderGeometry(4, 5, 4, 12), dark));
    const orb = mesh(new THREE.SphereGeometry(3.5, 14, 10), glow(0x55ddff, 2.5)); orb.position.y = 4; g.add(orb);
    parts.gens.push({ g, orb });
  }
  // turrets along the sides
  parts.turrets = [];
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Group(); const x = -35 + i * 14; t.position.set(x, -17, i % 2 ? -30 : 30); t.rotation.x = i % 2 ? -Math.PI / 2 : Math.PI / 2; root.add(t);
    t.add(mesh(new THREE.CylinderGeometry(2.4, 2.8, 2, 10), dark));
    const b = mesh(new THREE.CylinderGeometry(0.6, 0.6, 5, 8), tin); b.position.y = 3; t.add(b);
    parts.turrets.push(t);
  }
  // shield bubble
  const shield = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 20), glow(0x55ccff, 0.6, { additive: true, unique: true }));
  shield.material.opacity = 0.18; shield.scale.set(1, 0.6, 0.8); root.add(shield); parts.shield = shield;
  return { root, parts };
}

// ---------------- Pickups ----------------
export function makePickup(kind) {
  const g = new THREE.Group(); const parts = {};
  if (kind === 'silver' || kind === 'gold') {
    const r = mesh(new THREE.TorusGeometry(4, 0.7, 10, 28), glow(kind === 'gold' ? 0xffd34d : 0xd8e6f0, kind === 'gold' ? 2.2 : 1.6), false);
    g.add(r); parts.spin = r;
  } else if (kind === 'checkpoint') {
    const r = mesh(new THREE.TorusGeometry(10, 1, 10, 36), glow(0x66ffaa, 2), false); g.add(r); parts.spin = r;
    const inner = new THREE.Mesh(new THREE.CircleGeometry(9.5, 32), glow(0x66ffaa, 0.6, { additive: true, unique: true })); inner.material.opacity = 0.25; g.add(inner);
  } else if (kind === 'laser') {
    const c = mesh(new THREE.OctahedronGeometry(1.8, 0), glow(0x4dff7a, 2.2), false); g.add(c); parts.spin = c;
    const r = mesh(new THREE.TorusGeometry(2.6, 0.2, 6, 20), toon(0xffffff), false); g.add(r);
  } else if (kind === 'bomb') {
    const c = mesh(new THREE.SphereGeometry(1.6, 12, 10), toon(0xd63c3c), false); g.add(c); parts.spin = c;
    const f = mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 6), glow(0xffcc33, 3), false); f.position.y = 1.8; c.add(f);
    const r = mesh(new THREE.TorusGeometry(2.6, 0.2, 6, 20), toon(0xffffff), false); g.add(r);
  } else if (kind === 'wing') {
    const c = mesh(new THREE.BoxGeometry(3.2, 0.4, 1.4), glow(0x66aaff, 2), false); g.add(c); parts.spin = c;
    const r = mesh(new THREE.TorusGeometry(2.6, 0.2, 6, 20), toon(0xffffff), false); g.add(r);
  } else if (kind === 'gate') { // branch flare gate
    const r = mesh(new THREE.TorusGeometry(9, 0.9, 8, 6), toon(0xff7a2a), false); g.add(r); parts.spin = r;
    const fl = new THREE.Mesh(new THREE.TorusGeometry(9, 1.2, 6, 6), glow(0xffcc55, 3, { additive: true, unique: true })); fl.visible = false; g.add(fl); parts.lit = fl;
  }
  return { root: g, parts };
}

export { TIN };
