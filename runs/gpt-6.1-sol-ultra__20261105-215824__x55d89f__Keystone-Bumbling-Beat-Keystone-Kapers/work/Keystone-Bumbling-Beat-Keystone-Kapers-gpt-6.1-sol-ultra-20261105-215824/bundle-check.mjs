import * as THREE from 'three';
import RAPIER from '@rapier';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { normalWorld, vec3, color as nodeColor, float, step } from 'three/tsl';
const {createMall,createCharacter,createHazard,createPickup}=(()=>{



// Paper, lacquer and thick printer's ink: all geometry is authored in code.
const P = { ink: 0x152c38, navy: 0x214858, blue: 0x408ca0, mint: 0x9ed7c2, teal: 0x387d79, coral: 0xe77962, yellow: 0xf1c55b, cream: 0xfff2d5, white: 0xfff9e9, pink: 0xe9a0a0, wood: 0xbb7956, skin: 0xf2ba83, lilac: 0xa3a0cb };
const mats = new Map();
// Three hard light bands retain the paper palette as figures turn in the mall.
// Standard node lighting still supplies real scene shadows and emissive lamps.
const celFacing = normalWorld.dot(vec3(-.35, .82, .62).normalize()).mul(.5).add(.5);
const celBands = float(.66).add(step(.46, celFacing).mul(.20)).add(step(.74, celFacing).mul(.14));
function mat(color, extra = {}) {
  const key = JSON.stringify([color, extra]);
  if (!mats.has(key)) {
    const material = new MeshStandardNodeMaterial({ color, roughness: .92, metalness: 0, flatShading: true, ...extra });
    material.colorNode = nodeColor(color).mul(celBands);
    mats.set(key, material);
  }
  return mats.get(key);
}
const ink = new THREE.MeshBasicMaterial({ color: P.ink, side: THREE.BackSide });
const edgeMat = new THREE.LineBasicMaterial({ color: P.ink, transparent: true, opacity: 0.8 });
function mesh(geometry, color, parent, x = 0, y = 0, z = 0, outline = false, extra = {}) {
  const m = new THREE.Mesh(geometry, typeof color === 'number' || typeof color === 'string' ? mat(color, extra) : color);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (outline) {
    const shell = new THREE.Mesh(geometry, ink); shell.scale.setScalar(1.045); shell.castShadow = false; m.add(shell);
  }
  if (parent) parent.add(m);
  return m;
}
function box(w, h, d, color, parent, x = 0, y = 0, z = 0, outlined = false) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), color, parent, x, y, z);
  if (outlined) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat));
  return m;
}
function sphere(r, color, parent, x = 0, y = 0, z = 0, outline = true) {
  return mesh(new THREE.SphereGeometry(r, 12, 8), color, parent, x, y, z, outline);
}
function cylinder(r, h, color, parent, x = 0, y = 0, z = 0, outline = false, r2 = r) {
  return mesh(new THREE.CylinderGeometry(r2, r, h, 12), color, parent, x, y, z, outline);
}
function group(parent, x = 0, y = 0, z = 0, name = '') {
  const g = new THREE.Group(); g.position.set(x, y, z); g.name = name; parent?.add(g); return g;
}
function textPlane(text, width, height, fg = '#fff2d5', bg = null, fontSize = 64, weight = 800) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.max(128, Math.round(1024 * height / width));
  const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.fillStyle = fg; ctx.font = `${weight} ${Math.min(c.height * .83, fontSize * c.height / 128)}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2, c.width * .93);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: !bg, depthWrite: !!bg, toneMapped: false }));
  m.userData.texture = texture; return m;
}
function label(parent, text, x, y, z, w = 4, h = .6, fg, bg, fs = 100) {
  const m = textPlane(text, w, h, fg, bg, fs); m.position.set(x, y, z); parent.add(m); return m;
}
function torus(r, tube, color, parent, x, y, z) {
  return mesh(new THREE.TorusGeometry(r, tube, 6, 16), color, parent, x, y, z);
}
function plant(parent, x, y, z, size = 1) {
  const g = group(parent, x, y, z); g.scale.setScalar(size);
  cylinder(.30, .48, P.coral, g, 0, .24, 0, true, .40); cylinder(.41, .09, P.cream, g, 0, .47, 0);
  cylinder(.04, .9, P.ink, g, 0, .86, 0);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399; const leaf = sphere(.29, i % 2 ? P.teal : P.mint, g, Math.cos(a) * .27, .95 + (i % 3) * .14, Math.sin(a) * .27);
    leaf.scale.set(.65, 1.7, .36); leaf.rotation.z = -.6 * Math.cos(a); leaf.rotation.y = a;
  }
  return g;
}
function shirt(parent, x, y, z, color) {
  const g = group(parent, x, y, z);
  box(.58, .65, .14, color, g, 0, 0, 0, true);
  const a = box(.25, .25, .14, color, g, -.35, .17, 0, true); a.rotation.z = -.35;
  const b = box(.25, .25, .14, color, g, .35, .17, 0, true); b.rotation.z = .35;
  box(.2, .06, .16, P.cream, g, 0, .30, .01);
}
function pretzel(parent, x, y, z) {
  const g = group(parent, x, y, z); const a = torus(.18, .065, P.yellow, g, -.13, 0, 0); a.scale.y = 1.2;
  const b = torus(.18, .065, P.yellow, g, .13, 0, 0); b.scale.y = 1.2;
  const s = box(.48, .11, .12, P.yellow, g, 0, -.20, 0); s.rotation.z = -.12;
}
function shop(parent, x, floor, width, title, color, type, subtitle) {
  const y = floor * 5;
  const g = group(parent, x, y, -1.8);
  box(width, 3.8, .26, 0xf1dfbd, g, 0, 1.95, -.91, true);
  box(width - .2, 2.75, .06, 0xfaf0d9, g, 0, 1.73, -.74);
  box(width, .68, .50, color, g, 0, 3.73, -.23, true);
  label(g, title, 0, 3.74, .035, width - .35, .47, '#fff4d6', null, 100);
  box(width + .08, .10, .80, P.cream, g, 0, 3.33, -.1, true);
  for (let i = 0; i < Math.ceil(width / .5); i++) {
    box(.245, .10, .83, i % 2 ? P.cream : color, g, -width / 2 + .245 + i * .5, 3.31, -.08);
  }
  for (const side of [-1, 1]) {
    box(.15, 3.2, .7, P.cream, g, side * (width / 2 - .08), 1.65, -.14, true);
    box(.26, .14, .88, color, g, side * (width / 2 - .08), .1, -.06);
  }
  box(width - .35, .12, .85, P.wood, g, 0, .5, -.15, true);
  box(width - .6, .7, .5, color, g, 0, .55, -.62);
  if (type === 'clothes') {
    cylinder(.025, width - 1, P.ink, g, 0, 2.6, -.37).rotation.z = Math.PI / 2;
    for (let j = -1; j <= 1; j++) {
      shirt(g, j * (width / 4), 1.95, -.35, [P.coral, P.blue, P.yellow][j + 1]);
      cylinder(.015, .25, P.ink, g, j * (width / 4), 2.43, -.35);
    }
    label(g, subtitle || 'A PERFECT FIT!', 0, 1.05, -.32, width - .7, .32, '#214858', null, 70);
  } else if (type === 'toys') {
    for (let i = -1; i <= 1; i++) {
      const t = group(g, i * width / 3.7, 1.4, -.25);
      sphere(.25, [P.coral, P.mint, P.yellow][i + 1], t, 0, .16, 0);
      sphere(.20, P.cream, t, 0, .59, 0); sphere(.10, P.cream, t, -.17, .76, 0); sphere(.10, P.cream, t, .17, .76, 0);
      sphere(.045, P.ink, t, -.07, .63, .17, false); sphere(.045, P.ink, t, .07, .63, .17, false);
      box(.32, .12, .28, P.ink, t, 0, 0, 0);
    }
    label(g, 'WIND UP SOME TROUBLE', 0, 2.60, -.62, width - .7, .33, '#387d79', null, 70);
  } else if (type === 'radio') {
    for (let j = -1; j <= 1; j++) {
      const r = group(g, j * width / 3.9, 1.3, -.23);
      box(.92, .65, .44, j === 0 ? P.coral : P.blue, r, 0, 0, 0, true);
      const speaker = cylinder(.22, .04, P.ink, r, -.18, 0, .25); speaker.rotation.x = Math.PI / 2;
      sphere(.05, P.cream, r, .25, -.12, .25); box(.26, .1, .03, P.yellow, r, .23, .14, .25);
      const aerial = cylinder(.014, .7, P.ink, r, -.15, .55, 0); aerial.rotation.z = -.25;
    }
    label(g, 'ALL THE HITS. ALL THE TIME.', 0, 2.65, -.62, width - .5, .33, '#214858', null, 65);
  } else if (type === 'food') {
    for (let i = -2; i <= 2; i++) pretzel(g, i * .64, 1.45, -.1);
    box(width - 1, .50, .1, P.coral, g, 0, 2.55, -.57, true);
    label(g, 'HOT!  FRESH!  25¢', 0, 2.55, -.50, width - 1.1, .4, '#fff2d5', null, 75);
    for (let i = 0; i < 5; i++) box(.13, .17, .13, P.cream, g, -1 + i * .5, .80, .0);
  } else if (type === 'jewels') {
    for (let i = -1; i <= 1; i++) {
      box(.84, .1, .6, P.navy, g, i * width / 3.8, 1.1, -.22, true);
      const gem = mesh(new THREE.OctahedronGeometry(.26), [P.mint, P.coral, P.yellow][i + 1], g, i * width / 3.8, 1.42, -.22, true);
      gem.rotation.z = .3;
      torus(.25, .04, P.yellow, g, i * width / 3.8, 2.3, -.50);
    }
    label(g, 'LOOKING IS FREE!', 0, 2.86, -.56, width - .6, .3, '#214858', null, 70);
  } else if (type === 'books') {
    for (let row = 0; row < 2; row++) {
      box(width - .8, .10, .45, P.wood, g, 0, 1.15 + row, -.3, true);
      for (let i = 0; i < 9; i++) {
        const m = box(.25 + (i % 2) * .07, .52 + (i % 3) * .10, .25, [P.coral, P.blue, P.mint, P.yellow][i % 4], g, -width / 2 + .8 + i * (width - 1.6) / 8, 1.46 + row, -.33, true);
        if (i % 4 === 0) m.rotation.z = -.13;
      }
    }
  } else {
    for (let i = -1; i <= 1; i++) {
      const luggage = box(.80, .82, .48, [P.coral, P.mint, P.yellow][i + 1], g, i * width / 3.9, 1.38, -.2, true);
      box(.38, .05, .07, P.ink, luggage, 0, .50, 0);
      for (const a of [-1, 1]) box(.04, .80, .50, P.cream, luggage, a * .24, 0, 0);
    }
    label(g, 'TAKE A LITTLE TRIP', 0, 2.6, -.60, width - .5, .33, '#214858', null, 70);
  }
  // Windows read as pale turquoise reflections without obscuring the merchandise.
  for (const sx of [-1, 1]) {
    const reflection = box(.045, 1.40, .02, 0xc1e1d5, g, sx * width * .37, 1.95, .27);
    reflection.rotation.z = -.2;
  }
  box(width - .30, .12, .40, color, g, 0, .16, .12, true);
  return g;
}

function createMall(scene) {
  const root = group(scene); root.name = 'KeystoneGalleria';
  const animated = [];
  // The entire mall is presented as a paper theatre, framed by solid ink.
  box(51, 17.0, .65, P.navy, root, 0, 7.6, -3.27, true);
  box(49.8, 16.2, .18, 0xe9d7af, root, 0, 7.7, -2.9);
  for (const sx of [-1, 1]) {
    box(.56, 16.8, 6.7, P.cream, root, sx * 24.6, 7.6, -.10, true);
    box(.18, 17.0, .26, P.coral, root, sx * 24.22, 7.6, 3.25);
    box(.48, .25, 6.8, P.yellow, root, sx * 24.6, 16.02, -.1, true);
  }
  const shops = [
    [['BUMP & CO.', P.teal, 'toys'], ['THE DAILY BAG', P.coral, 'luggage'], ['SOCK HOP', P.blue, 'clothes'], ['HOT PRETZEL', P.coral, 'food']],
    [['HI-FI CORNER', P.blue, 'radio'], ['SUIT YOURSELF', P.teal, 'clothes'], ['PENNY & PAGE', P.coral, 'books'], ['PACK YOUR BAGS', P.teal, 'luggage']],
    [['SPARKLE BROS.', P.coral, 'jewels'], ['GOOD SPORTS', P.blue, 'clothes'], ['THE BOOK NOOK', P.teal, 'books'], ['TIN PAN TOYS', P.coral, 'toys']],
  ];
  for (let f = 0; f < 3; f++) {
    const y = f * 5;
    box(49, .44, 6.5, P.cream, root, 0, y - .24, -.05, true);
    box(49.1, .12, .24, P.navy, root, 0, y - .04, 3.20);
    box(49.1, .16, .24, P.coral, root, 0, y - .27, 3.22);
    box(49, .09, 1.5, 0xe6d8b9, root, 0, y + .015, 2.0);
    // Restrained floor inlays keep the action lane easy to read.
    for (let x = -24; x < 24; x += 1.2) {
      box(.60, .012, .54, P.navy, root, x, y + .065, 2.78);
      box(.60, .012, .54, P.cream, root, x + .60, y + .065, 2.78);
    }
    box(48.4, .035, .08, P.yellow, root, 0, y + .075, .78);
    const xs = [-20, -9, 8.9, 19.9];
    shops[f].forEach((s, i) => shop(root, xs[i], f, i === 1 || i === 2 ? 9.1 : 8.1, s[0], s[1], s[2]));
    // Ornate columns between the little shop stages.
    for (const x of [-14.8, -3.8, 3.8, 14.8]) {
      box(.29, 4.5, .38, P.cream, root, x, y + 2.25, -.50, true);
      box(.65, .20, .65, P.yellow, root, x, y + 4.42, -.50, true);
      box(.65, .22, .65, P.teal, root, x, y + .18, -.50, true);
    }
    for (const x of [-23.6, 23.6]) plant(root, x, y, .10, .90);
    for (const x of [-11, 11]) {
      cylinder(.025, .58, P.ink, root, x, y + 4.35, -.25);
      const shade = cylinder(.48, .25, P.yellow, root, x, y + 4.04, -.25, true, .15);
      const bulb = sphere(.16, P.white, root, x, y + 3.91, -.25, false);
      bulb.material = mat(P.white, { emissive: 0xffdfa3, emissiveIntensity: .4 });
    }
    // Floor medallions and route arrows.
    const med = cylinder(.39, .09, P.yellow, root, -24.22, y + 2.2, 3.10, true); med.rotation.x = Math.PI / 2;
    label(root, `${f + 1}`, -24.22, y + 2.21, 3.17, .45, .48, '#152c38', null, 125);
    label(root, ['GROUND • GRAND ARCADE', 'LEVEL 2 • THE PROMENADE', 'LEVEL 3 • ROOFTOP ROW'][f], 0, y - .25, 3.37, 13, .28, '#fff2d5', null, 75);
  }
  // Elevator: posts and machine room remain still; cabin is positioned by gameplay.
  box(3.4, 14.6, .5, P.ink, root, 0, 7.2, -1.75, true);
  for (const x of [-1.55, 1.55]) {
    box(.17, 15.1, .7, P.yellow, root, x, 7.3, -.74, true);
    box(.05, 15.2, .04, P.cream, root, x, 7.3, -.34);
  }
  for (let f = 0; f < 3; f++) {
    label(root, 'LIFT', 0, f * 5 + 3.58, -.29, 2.7, .45, '#fff2d5', '#214858', 145);
    const call = cylinder(.13, .06, P.yellow, root, 2.05, f * 5 + 1.12, -.42, true); call.rotation.x = Math.PI / 2;
    label(root, '↑ ↓', 2.05, f * 5 + 1.54, -.38, .75, .36, '#214858', null, 140);
  }
  const elevator = group(root, 0, 0, .12, 'liftCabin');
  box(2.72, .15, 2.6, P.yellow, elevator, 0, .075, -.10, true);
  box(2.72, .15, 2.6, P.yellow, elevator, 0, 3.05, -.10, true);
  box(2.65, 2.9, .15, P.teal, elevator, 0, 1.54, -1.35, true);
  for (const x of [-1.31, 1.31]) box(.12, 2.95, 2.6, P.cream, elevator, x, 1.53, -.1, true);
  box(2.5, .07, .08, P.yellow, elevator, 0, 1.30, -1.23);
  label(elevator, 'EXPRESS', 0, 2.55, -1.23, 2.3, .35, '#fff2d5', null, 115);
  for (let i = 0; i < 7; i++) box(.08, 2.2, .04, 0x55958b, elevator, -.9 + i * .3, 1.5, -1.24);
  // An oversized geometric clock gives the mall its silent-film character.
  const clock = group(root, 0, 15.1, -.70);
  const disc = cylinder(.8, .15, P.cream, clock, 0, 0, 0, true); disc.rotation.x = Math.PI / 2;
  torus(.81, .065, P.yellow, clock, 0, 0, .11);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6; const tick = box(.05, .13, .04, P.ink, clock, Math.sin(a) * .65, Math.cos(a) * .65, .12); tick.rotation.z = -a;
  }
  const hour = group(clock, 0, 0, .15); box(.05, .40, .03, P.ink, hour, 0, .16, 0); hour.rotation.z = -.8;
  const minute = group(clock, 0, 0, .18); box(.035, .64, .03, P.coral, minute, 0, .28, 0); minute.rotation.z = 2.5;
  sphere(.07, P.yellow, clock, 0, 0, .22, false);
  animated.push(t => { minute.rotation.z = 2.5 - t * .03; });
  // Escalators sit behind the action rail. Their exact endpoints are gameplay landmarks.
  for (const [center, low] of [[-17, 0], [17, 1]]) {
    const g = group(root, center, low * 5, .18);
    const slope = Math.atan2(5, 6);
    const belt = box(Math.hypot(6, 5), .32, 1.45, P.navy, g, 0, 2.5, 0, true); belt.rotation.z = slope;
    for (let i = 0; i < 18; i++) {
      const p = i / 17; box(.43, .16, 1.38, i % 2 ? P.cream : 0xc0bfa9, g, -3 + p * 6, p * 5 + .06, 0, true);
    }
    for (const z of [-.72, .72]) {
      const rail = box(Math.hypot(6, 5) + .3, .12, .14, P.ink, g, 0, 3.1, z, false); rail.rotation.z = slope;
      for (let i = 0; i < 5; i++) {
        const p = i / 4; box(.07, .7, .08, P.yellow, g, -3 + p * 6, p * 5 + .35, z);
      }
    }
    label(g, '↑  ESCALATOR  ↑', 0, 2.65, .82, 4.7, .4, '#fff2d5', '#214858', 85).rotation.z = slope;
    label(root, '↑', center - 3.1, low * 5 + .58, 1.02, .7, .65, '#214858', null, 140);
    label(root, '↓', center + 3.1, (low + 1) * 5 + .58, 1.02, .7, .65, '#214858', null, 140);
  }
  // Roofline, pennants, brass stars, and the mall's proudly grandiose name.
  box(50.5, .25, 6.8, P.navy, root, 0, 15.85, -.10, true);
  box(50.0, .16, .26, P.yellow, root, 0, 15.63, 3.30, true);
  const crown = group(root, 0, 17.05, -.30);
  box(23.5, 1.54, .65, P.cream, crown, 0, 0, 0, true);
  box(22.8, 1.22, .08, P.teal, crown, 0, 0, .37, true);
  label(crown, 'THE GRAND GALLERIA', 0, .05, .43, 21.9, .87, '#fff2d5', null, 100);
  label(root, 'EST. 1983', 0, 16.13, 3.35, 4, .35, '#fff2d5', null, 130);
  for (const sx of [-1, 1]) {
    const ball = sphere(.44, P.yellow, root, sx * 12.4, 17.0, .1, true);
    const star = mesh(new THREE.OctahedronGeometry(.68), P.yellow, root, sx * 12.4, 17.0, .12, true); star.scale.set(1, 1, .25); star.rotation.z = .15;
    ball.scale.set(.5, .5, .5);
  }
  const bunting = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i <= 40; i++) { const x = -24 + i * 1.2; points.push(new THREE.Vector3(x, 15.4 - .52 * Math.sin((i / 40) * Math.PI), 2.65)); }
  bunting.setFromPoints(points); root.add(new THREE.Line(bunting, edgeMat));
  for (let i = 0; i < 32; i++) {
    const x = -23.4 + i * 1.5; const y = 15.4 - .52 * Math.sin((x + 24) / 48 * Math.PI);
    const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute([-.34, 0, 0, .34, 0, 0, 0, -.55, 0], 3)); geom.computeVertexNormals();
    mesh(geom, mat([P.coral, P.yellow, P.mint][i % 3], { side: THREE.DoubleSide }), root, x, y, 2.65);
  }
  return { root, elevator, update(t) { animated.forEach(fn => fn(t)); } };
}

function animTrack(name, axis, times, values) { return new THREE.NumberKeyframeTrack(`${name}.rotation[${axis}]`, times, values); }
function createCharacter(scene, { color = P.blue, kind = 'cop', accent = P.yellow } = {}) {
  const root = group(scene); root.name = kind;
  const rig = group(root, 0, 0, 0, 'rig');
  // Feet are always the origin. The eye/nose profile faces +X.
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 64;
  const sc = shadowCanvas.getContext('2d'); const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(21,44,56,.36)'); grad.addColorStop(1, 'rgba(21,44,56,0)'); sc.fillStyle = grad; sc.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .85), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .075; root.add(shadow);
  const body = group(rig, 0, 0, 0, 'body');
  const pants = kind === 'cop' ? P.navy : P.ink;
  const torso = sphere(.40, kind === 'cop' ? color : P.cream, body, 0, 1.03, 0); torso.scale.set(.83, 1.05, .75);
  box(.55, .12, .59, P.ink, body, 0, .75, 0, true);
  box(.10, .13, .62, accent, body, .27, .76, 0);
  if (kind === 'crook') {
    for (let i = 0; i < 4; i++) {
      const stripe = cylinder(.345, .09, P.ink, body, 0, .85 + i * .145, 0); stripe.scale.z = .82;
    }
  } else {
    box(.035, .62, .61, P.cream, body, .13, 1.05, 0);
    for (const z of [-.295, .295]) {
      box(.16, .18, .03, P.navy, body, .02, 1.15, z, true);
      const badge = mesh(new THREE.OctahedronGeometry(.105), accent, body, .16, 1.25, z + Math.sign(z) * .025); badge.scale.set(1, 1.15, .25);
    }
    cylinder(.06, .24, P.ink, body, -.20, .79, .34);
  }
  cylinder(.11, .18, P.skin, body, 0, 1.42, 0, true);
  const head = group(body, .015, 1.58, 0, 'head');
  const face = sphere(.335, P.skin, head); face.scale.set(1.05, 1.0, .95);
  sphere(.105, P.skin, head, -.05, -.015, .315); sphere(.105, P.skin, head, -.05, -.015, -.315);
  sphere(.13, P.skin, head, .34, -.025, 0);
  if (kind === 'crook') {
    box(.14, .17, .59, P.ink, head, .26, .075, 0, true);
    for (const z of [-.20, .20]) {
      sphere(.095, P.white, head, .285, .07, z, false).scale.set(.45, 1, 1);
      sphere(.045, P.ink, head, .335, .065, z, false);
    }
    const cap = sphere(.34, P.ink, head, -.025, .22, 0); cap.scale.set(1.1, .42, 1.03);
    const knot = sphere(.13, P.ink, head, -.32, .11, 0); knot.scale.set(1.3, .8, 1);
    box(.14, .025, .32, P.ink, head, .25, -.16, 0);
    const sack = group(body, -.31, .96, -.42, 'sack');
    sphere(.35, P.yellow, sack, -.12, 0, 0).scale.set(1, 1.2, .8);
    cylinder(.095, .18, P.wood, sack, .04, .34, 0);
    box(.23, .075, .23, P.cream, sack, .04, .30, 0, true);
    const money = label(sack, '$', -.14, .0, .295, .44, .5, '#214858', null, 145); money.rotation.y = -.15;
  } else {
    for (const z of [-.215, .215]) {
      sphere(.075, P.white, head, .23, .08, z, false);
      sphere(.038, P.ink, head, .28, .075, z + Math.sign(z) * .02, false);
      const brow = box(.16, .035, .04, P.ink, head, .22, .185, z); brow.rotation.z = -.14;
    }
    cylinder(.35, .16, P.navy, head, -.02, .27, 0, true);
    const cap = sphere(.34, color, head, -.02, .37, 0); cap.scale.set(1.05, .52, 1);
    box(.34, .055, .61, P.ink, head, .26, .245, 0, true);
    const badge = mesh(new THREE.OctahedronGeometry(.115), accent, head, .30, .36, 0, true); badge.scale.set(.28, 1, 1);
    // A cheerful silent-film moustache: two little coffee beans.
    for (const z of [-.075, .075]) sphere(.080, P.wood, head, .285, -.10, z).scale.set(.65, .40, 1.2);
  }
  const limbs = {};
  for (let i = 0; i < 2; i++) {
    const side = i ? -1 : 1;
    const leg = group(body, 0, .66, side * .17, i ? 'rightLeg' : 'leftLeg'); limbs[leg.name] = leg;
    box(.225, .48, .23, pants, leg, 0, -.23, 0, true);
    const shoe = box(.39, .16, .29, P.ink, leg, .08, -.56, 0, true); box(.38, .035, .30, P.cream, shoe, 0, -.07, 0);
    const arm = group(body, 0, 1.26, side * .33, i ? 'rightArm' : 'leftArm'); limbs[arm.name] = arm;
    const sleeve = cylinder(.115, .32, kind === 'cop' ? color : P.cream, arm, 0, -.14, 0, true);
    if (kind === 'crook') cylinder(.117, .08, P.ink, arm, 0, -.18, 0);
    cylinder(.085, .20, P.skin, arm, .01, -.37, 0, true);
    sphere(.115, P.skin, arm, .015, -.49, 0);
    if (kind === 'cop' && i === 0) {
      const baton = cylinder(.045, .62, P.ink, arm, .13, -.45, 0); baton.rotation.z = -.65;
      cylinder(.065, .08, accent, arm, .0, -.29, 0);
    }
  }
  const mixer = new THREE.AnimationMixer(rig);
  const times = [0, .15, .30, .45, .60];
  const run = new THREE.AnimationClip('run', .60, [
    animTrack('leftLeg', 'z', times, [-.75, 0, .75, 0, -.75]),
    animTrack('rightLeg', 'z', times, [.75, 0, -.75, 0, .75]),
    animTrack('leftArm', 'z', times, [.65, 0, -.65, 0, .65]),
    animTrack('rightArm', 'z', times, [-.65, 0, .65, 0, -.65]),
    new THREE.NumberKeyframeTrack('body.position[y]', times, [0, .055, 0, .055, 0]),
    animTrack('head', 'z', times, [.04, -.025, .04, -.025, .04]),
  ]);
  const idle = new THREE.AnimationClip('idle', 2, [
    new THREE.NumberKeyframeTrack('body.position[y]', [0, 1, 2], [0, .025, 0]),
    animTrack('leftArm', 'z', [0, 1, 2], [.05, -.04, .05]),
    animTrack('rightArm', 'z', [0, 1, 2], [-.05, .04, -.05]),
    animTrack('head', 'z', [0, 1, 2], [0, .045, 0]),
  ]);
  const jump = new THREE.AnimationClip('jump', 1, [
    animTrack('leftLeg', 'z', [0, .5, 1], [-.60, -.25, -.60]),
    animTrack('rightLeg', 'z', [0, .5, 1], [.65, .35, .65]),
    animTrack('leftArm', 'z', [0, .5, 1], [2.0, 1.8, 2.0]),
    animTrack('rightArm', 'z', [0, .5, 1], [-1.7, -1.9, -1.7]),
  ]);
  const duck = new THREE.AnimationClip('duck', 1, [
    new THREE.NumberKeyframeTrack('body.scale[y]', [0, .5, 1], [.56, .58, .56]),
    animTrack('leftLeg', 'z', [0, .5, 1], [-.45, -.65, -.45]),
    animTrack('rightLeg', 'z', [0, .5, 1], [.65, .45, .65]),
    animTrack('leftArm', 'z', [0, .5, 1], [.70, .5, .70]),
    animTrack('rightArm', 'z', [0, .5, 1], [-.70, -.5, -.70]),
  ]);
  const celebrate = new THREE.AnimationClip('celebrate', .8, [
    animTrack('leftArm', 'z', [0, .4, .8], [2.5, 2.9, 2.5]),
    animTrack('rightArm', 'z', [0, .4, .8], [-2.5, -2.9, -2.5]),
    new THREE.NumberKeyframeTrack('body.position[y]', [0, .2, .4, .6, .8], [0, .14, 0, .14, 0]),
    animTrack('head', 'z', [0, .4, .8], [-.15, .15, -.15]),
  ]);
  const clips = [idle, run, jump, duck, celebrate]; const actions = {};
  clips.forEach(clip => { actions[clip.name] = mixer.clipAction(clip); });
  let state = 'idle'; actions.idle.play();
  return {
    group: root, rig, mixer, actions, shadow,
    setState(next) {
      if (!actions[next] || state === next) return;
      actions[state].fadeOut(.1); actions[next].reset().fadeIn(.1).play(); state = next;
    },
    update(dt, speed = 1) { actions.run.timeScale = Math.max(.6, Math.abs(speed) * .22); mixer.update(dt); },
    get state() { return state; },
  };
}

function createHazard(kind = 'ball') {
  const g = group(); g.name = kind;
  if (kind === 'ball') {
    sphere(.40, P.coral, g, 0, .4, 0);
    const ring = torus(.405, .025, P.cream, g, 0, .40, 0); ring.rotation.y = Math.PI / 2;
    torus(.405, .025, P.cream, g, 0, .4, 0);
    const ring2 = torus(.405, .025, P.yellow, g, 0, .4, 0); ring2.rotation.x = Math.PI / 2;
  } else if (kind === 'cart') {
    box(.88, .56, .64, P.coral, g, 0, .56, 0, true);
    box(.91, .06, .69, P.cream, g, 0, .86, 0, true);
    box(.70, .15, .52, P.yellow, g, 0, .94, 0, true);
    for (const x of [-.33, .33]) for (const z of [-.27, .27]) {
      const wheel = cylinder(.16, .07, P.ink, g, x, .18, z, true); wheel.rotation.x = Math.PI / 2;
    }
    const handle = box(.07, .72, .06, P.ink, g, -.55, .75, 0); handle.rotation.z = -.25;
    box(.10, .07, .70, P.ink, g, -.65, 1.10, 0, true);
    label(g, 'SALE', 0, .58, .33, .77, .34, '#fff2d5', null, 140);
  } else if (kind === 'plane') {
    const body = sphere(.27, P.yellow, g, 0, 0, 0); body.scale.set(2.4, .63, .72);
    box(.36, .05, 1.48, P.coral, g, 0, .04, 0, true);
    box(.55, .05, .77, P.coral, g, -.49, .08, 0, true);
    box(.29, .36, .05, P.coral, g, -.47, .19, 0, true);
    const prop = group(g, .66, 0, 0, 'propeller'); box(.04, .60, .075, P.ink, prop, 0, 0, 0, true);
    sphere(.11, P.blue, g, .05, .19, 0);
    g.userData.update = t => { prop.rotation.x = t * 25; };
  } else {
    box(.80, .70, .53, P.yellow, g, 0, .38, 0, true);
    for (const x of [-.23, .23]) box(.05, .72, .55, P.cream, g, x, .38, 0);
    box(.40, .07, .12, P.ink, g, 0, .81, 0, true);
    box(.08, .16, .12, P.ink, g, -.18, .75, 0); box(.08, .16, .12, P.ink, g, .18, .75, 0);
  }
  return g;
}

function createPickup(kind = 'bag') {
  const g = group(); g.name = `pickup-${kind}`;
  if (kind === 'clock') {
    const disc = cylinder(.32, .1, P.cream, g, 0, .46, 0, true); disc.rotation.x = Math.PI / 2;
    torus(.33, .04, P.yellow, g, 0, .46, .065);
    box(.025, .21, .025, P.ink, g, 0, .54, .08); box(.16, .025, .025, P.ink, g, .07, .45, .08);
    cylinder(.08, .10, P.yellow, g, 0, .85, 0);
  } else {
    const sack = sphere(.30, P.yellow, g, 0, .37, 0); sack.scale.set(.95, 1.1, .8);
    cylinder(.11, .12, P.wood, g, 0, .72, 0);
    const top = cylinder(.13, .14, P.yellow, g, 0, .81, 0, true, .22); top.rotation.z = .1;
    label(g, '$', 0, .37, .251, .40, .45, '#214858', null, 150);
  }
  return g;
}

const palette = P;

return {createMall,createCharacter,createHazard,createPickup};
})();
const {AudioDirector,audioSelfTest}=(()=>{
// Original procedural ragtime, arcade foley and nonsense speech. No audio assets.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

function tone(ctx, bus, { at = ctx.currentTime, hz = 440, endHz, duration = .12, gain = .1, type = 'triangle', attack = .006, detune = 0, cutoff = 6000 } = {}) {
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(25, hz), at);
  if (endHz !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endHz), at + duration);
  oscillator.detune.value = detune;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(gain, at + Math.min(attack, duration * .2));
  envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(filter).connect(envelope).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + duration + .025);
  oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); };
}

function noise(ctx, bus, at, duration, volume, cutoff = 900, seed = 1) {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let state = seed | 0;
  for (let i = 0; i < length; i++) {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    samples[i] = (((state ^ (state >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = cutoff;
  filter.Q.value = .65;
  envelope.gain.setValueAtTime(volume, at);
  envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  source.connect(filter).connect(envelope).connect(bus);
  source.start(at);
  source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
}

function chirp(ctx, bus, at, root, length, vowel, volume) {
  const oscillator = ctx.createOscillator();
  const formant = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(root, at);
  oscillator.frequency.exponentialRampToValueAtTime(root * 1.15, at + length * .22);
  oscillator.frequency.exponentialRampToValueAtTime(root * .88, at + length);
  formant.type = 'bandpass';
  formant.frequency.setValueAtTime([700, 1150, 1800, 900, 1400][vowel % 5], at);
  formant.Q.value = 3;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, at + length);
  oscillator.connect(formant).connect(gain).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + length + .02);
  oscillator.onended = () => { oscillator.disconnect(); formant.disconnect(); gain.disconnect(); };
}

const MELODY = [
  77, 81, 84, 81, 79, 77, 76, 79, 81, 77, 74, 77, 76, 72, 74, null,
  74, 77, 81, 84, 82, 81, 77, 76, 79, 77, 74, 72, 76, 79, 84, null,
  79, 82, 86, 82, 81, 79, 77, 74, 76, 79, 82, 81, 79, 76, 72, null,
  77, 76, 74, 72, 69, 72, 74, 76, 77, 81, 79, 76, 77, null, 72, null,
];
const CHORDS = [[53,57,60], [50,53,57], [55,58,62], [48,52,58]];
const BPM = 132;
const EIGHTH = 60 / BPM / 2;

function musicStep(ctx, bus, step, at, intensity = 1) {
  const chord = CHORDS[Math.floor((step % 64) / 16)];
  const note = MELODY[step % MELODY.length];
  if (note !== null) {
    tone(ctx, bus, {at, hz: frequency(note), duration: .16, gain: .16 * intensity, type:'triangle', cutoff: 4800});
    tone(ctx, bus, {at: at + .003, hz: frequency(note + 12), duration: .075, gain: .025 * intensity, type:'sine'});
  }
  if (step % 4 === 0) {
    const bass = chord[0] - 12 + (step % 8 === 4 ? 7 : 0);
    tone(ctx, bus, {at, hz: frequency(bass), duration: .22, gain: .26 * intensity, type:'triangle', cutoff: 750});
  }
  if (step % 4 === 2) {
    for (const n of chord) tone(ctx, bus, {at, hz: frequency(n + 12), duration:.09, gain:.075 * intensity, type:'triangle', cutoff:2500});
  }
  if (step % 2 === 1) noise(ctx, bus, at, .038, .045 * intensity, 5800, step + 7);
  if (step % 8 === 0) tone(ctx, bus, {at, hz: 130, endHz:45, duration:.12, gain:.13 * intensity, type:'sine'});
}

function effect(ctx, bus, name, at) {
  const play = options => tone(ctx, bus, {at, ...options});
  switch (name) {
    case 'jump':
      play({hz:240,endHz:750,duration:.16,gain:.18,type:'triangle'});
      play({hz:125,endHz:180,duration:.10,gain:.1,type:'sine'}); break;
    case 'land':
      play({hz:90,endHz:45,duration:.09,gain:.17,type:'sine'});
      noise(ctx,bus,at,.065,.11,450,17); break;
    case 'pickup':
      [76,81,88].forEach((n,i)=>tone(ctx,bus,{at:at+i*.055,hz:frequency(n),duration:.17,gain:.13,type:'sine'})); break;
    case 'hit':
      play({hz:170,endHz:48,duration:.30,gain:.22,type:'triangle'});
      noise(ctx,bus,at,.20,.19,1100,41); break;
    case 'catch':
      [72,76,79,84,88].forEach((n,i)=>tone(ctx,bus,{at:at+i*.075,hz:frequency(n),duration:.24,gain:.14,type:'triangle'}));
      noise(ctx,bus,at+.08,.14,.08,4500,23); break;
    case 'elevator':
      [81,77].forEach((n,i)=>tone(ctx,bus,{at:at+i*.16,hz:frequency(n),duration:.45,gain:.14,type:'sine'})); break;
    case 'menu':
      play({hz:660,endHz:880,duration:.055,gain:.085,type:'triangle'}); break;
    case 'whistle':
      play({hz:1450,endHz:1800,duration:.14,gain:.09,type:'sine'});
      tone(ctx,bus,{at:at+.19,hz:1800,endHz:1450,duration:.26,gain:.09,type:'sine'}); break;
    case 'countdown':
      play({hz:960,duration:.10,gain:.12,type:'triangle'}); break;
    case 'win':
      [65,69,72,77,81,84].forEach((n,i)=>tone(ctx,bus,{at:at+i*.11,hz:frequency(n),duration:.4,gain:.16,type:'triangle'}));
      [65,69,72].forEach(n=>tone(ctx,bus,{at:at+.75,hz:frequency(n),duration:.7,gain:.1,type:'triangle'})); break;
    case 'lose':
      [72,71,70,65].forEach((n,i)=>tone(ctx,bus,{at:at+i*.20,hz:frequency(n),endHz:frequency(n-1),duration:.34,gain:.16,type:'triangle'})); break;
    case 'dash':
      noise(ctx,bus,at,.19,.18,2200,67);
      play({hz:360,endHz:900,duration:.13,gain:.07,type:'sine'}); break;
    case 'plane':
      play({hz:210,endHz:310,duration:.23,gain:.055,type:'sawtooth',cutoff:550}); break;
    default: return false;
  }
  return true;
}

class AudioDirector {
  constructor() {
    this.context = null;
    this.musicVolume = .1;
    this.effectsVolume = .7;
    this.muted = false;
    this.scene = 'title';
    this.step = 0;
    this.nextNote = 0;
    this.events = {};
    this.scheduledNotes = 0;
    this.speechSerial = 0;
    this._analyserData = new Float32Array(256);
  }
  async unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context();
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.effectsBus = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -7;
      limiter.knee.value = 10;
      limiter.ratio.value = 8;
      limiter.attack.value = .003;
      limiter.release.value = .1;
      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
      this.master.connect(limiter).connect(this.analyser).connect(this.context.destination);
      this.master.gain.value = this.muted ? 0 : .72;
      this.musicBus.gain.value = this.musicVolume;
      this.effectsBus.gain.value = this.effectsVolume;
      this.nextNote = this.context.currentTime + .04;
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }
  setMusicVolume(v = .1) {
    this.musicVolume = clamp(v, 0, 1);
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, .05);
  }
  setEffectsVolume(v = .7) {
    this.effectsVolume = clamp(v, 0, 1);
    if (this.effectsBus) this.effectsBus.gain.setTargetAtTime(this.effectsVolume, this.context.currentTime, .05);
  }
  setMuted(v) {
    this.muted = Boolean(v);
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : .72, this.context.currentTime, .025);
  }
  setScene(scene) {
    this.scene = scene;
    if (scene === 'play') this.sfx('whistle');
  }
  update() {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (this.nextNote < now - .25) this.nextNote = now + .025;
    let scheduled = 0;
    while (this.nextNote < now + .32 && scheduled++ < 8) {
      const intensity = this.scene === 'pause' ? .22 : this.scene === 'title' ? .7 : this.scene === 'lose' ? .35 : 1;
      musicStep(this.context, this.musicBus, this.step, this.nextNote, intensity);
      this.scheduledNotes++;
      // Light swing keeps the tune buoyant without tying it to the render rate.
      this.nextNote += EIGHTH * (this.step % 2 === 0 ? 1.14 : .86);
      this.step++;
    }
  }
  sfx(name) {
    if (!this.context || this.context.state !== 'running') return false;
    const played = effect(this.context, this.effectsBus, name, this.context.currentTime + .006);
    if (played) this.events[name] = (this.events[name] || 0) + 1;
    return played;
  }
  voice(mood = 'hello') {
    if (!this.context || this.context.state !== 'running') return false;
    const patterns = {hello:[0,3,7,5,9],catch:[7,10,12,7,12],hurt:[5,2,-2],win:[0,4,7,12,9,12],lose:[5,2,0,-3],crook:[3,0,5,3,7,0]};
    const pattern = patterns[mood] || patterns.hello;
    const serial = this.speechSerial++;
    const root = mood === 'crook' ? 240 : 330;
    const at = this.context.currentTime + .015;
    pattern.forEach((note,i)=>chirp(this.context,this.effectsBus,at+i*.095,root*2**(note/12),.065+(i%2)*.025,(i+serial)%5,.20));
    this.events.voice = (this.events.voice || 0) + 1;
    return true;
  }
  inspect() {
    let peak = 0, energy = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this._analyserData);
      for (const sample of this._analyserData) { peak = Math.max(peak,Math.abs(sample)); energy += sample*sample; }
    }
    return {state:this.context?.state || 'locked',musicVolume:this.musicVolume,effectsVolume:this.effectsVolume,muted:this.muted,scene:this.scene,scheduledNotes:this.scheduledNotes,events:{...this.events},peak,rms:Math.sqrt(energy/this._analyserData.length)};
  }
}

async function audioSelfTest() {
  const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Context) return {supported:false,reason:'OfflineAudioContext unavailable'};
  const ctx = new Context(1, 44100 * 2, 44100);
  const bus = ctx.createGain();
  bus.gain.value = .4;
  bus.connect(ctx.destination);
  musicStep(ctx,bus,0,.02);
  musicStep(ctx,bus,1,.24);
  effect(ctx,bus,'jump',.48);
  effect(ctx,bus,'pickup',.75);
  effect(ctx,bus,'hit',1.1);
  chirp(ctx,bus,1.5,390,.12,2,.2);
  const rendered = await ctx.startRendering();
  const samples = rendered.getChannelData(0);
  let peak=0, energy=0, nonfinite=0;
  for (const sample of samples) { if (!Number.isFinite(sample)) nonfinite++; peak=Math.max(peak,Math.abs(sample)); energy+=sample*sample; }
  return {supported:true,duration:rendered.duration,sampleRate:rendered.sampleRate,peak,rms:Math.sqrt(energy/samples.length),nonfinite,clipped:peak>=1};
}

return {AudioDirector,audioSelfTest};
})();
const {HubBridge}=(()=>{
/* Keystone Bumbling Beat network adapter. AI Hub Session Protocol v1. */
const PROTOCOL = 'keystone-bumbling-beat/1';
const PULSE_KEYS = ['jump', 'interact', 'dash'];
const noop = () => {};
const player = (id, name) => ({ id, name, color: id === 0 ? '#356ad4' : '#e79f35' });
const cleanInput = (v = {}) => ({
  move: Math.max(-1, Math.min(1, Number(v.move) || 0)),
  jump: !!v.jump, duck: !!v.duck, interact: !!v.interact, downUse: !!v.downUse, dash: !!v.dash,
});
const encode = (data) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))));
const decode = (text) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(String(text).trim()), c => c.charCodeAt(0))));

/**
 * Call connect() after constructing, then ready() after assets/physics load.
 * During a hub session the hub starts and ends the round. Standalone peer
 * connections call onJoin(info) when ready; the host starts its game normally.
 */
class HubBridge {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.hub = globalThis.AIHub || null;
    this.active = !!this.hub?.active;
    this.isHost = true;
    this.server = false;
    this.me = 0;
    this.host = 0;
    this.players = [player(0, 'Officer Blue')];
    this.connected = false;
    this.ended = false;
    this.started = false;
    this.finished = false;
    this.transport = this.active ? 'ai-hub' : 'solo';
    this.seq = 0;
    this.inputSeq = new Map();
    this.stateSeq = -1;
    this.lastInputAt = -Infinity;
    this.lastStateAt = -Infinity;
    this.pendingInput = cleanInput();
    this.peer = null;
    this.channel = null;
    this.bc = null;
    this.room = null;
    this.unsubscribers = [];
    this.received = 0;
    this.sent = 0;
    this.error = '';
    this.remoteLastSeen = 0;
  }
  emit(name, ...args) { return (this.callbacks[name] || noop)(...args); }
  info() {
    return { active: this.active, connected: this.connected, isHost: this.isHost,
      server: this.server, me: this.me, host: this.host, players: this.players.map(p => ({ ...p })),
      transport: this.transport, room: this.room };
  }
  async connect() {
    if (!this.active || !this.hub) return null;
    this.unsubscribers.push(this.hub.on('start', event => {
      this.started = true;
      this.emit('onStart', event);
    }));
    this.unsubscribers.push(this.hub.on('message', (data, from) => this.receive(data, from)));
    this.unsubscribers.push(this.hub.on('leave', event => {
      this.players = this.players.filter(p => p.id !== event.id);
      this.emit('onLeave', event);
    }));
    this.unsubscribers.push(this.hub.on('time-up', event => {
      if (this.isHost) {
        this.emit('onTimeUp', event);
        // A round must always have an outcome, even if the game did not supply one.
        if (!this.finished) this.finish({ score: Number(this.lastState?.score) || 0, won: false });
      }
    }));
    this.unsubscribers.push(this.hub.on('end', event => {
      this.ended = true;
      this.emit('onEnd', event);
    }));
    const info = await this.hub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) {
      this.active = false;
      this.transport = 'solo';
      return null;
    }
    this.me = info.me;
    this.host = info.host;
    this.isHost = info.isHost;
    this.server = !!info.server;
    this.players = info.players;
    this.connected = true;
    this.emit('onStatus', this.info());
    return info;
  }
  ready() { if (this.active && !this.ended) this.hub.ready(); }
  time() { return this.active ? this.hub.time() : this.startedAt == null ? -Infinity : performance.now() - this.startedAt; }
  begin() { if (!this.active) { this.started = true; this.finished = false; this.ended = false; this.startedAt = performance.now(); } }
  canPlay() { return !this.ended && (this.active ? this.started && this.hub.time() >= 0 : true); }
  send(data, { to, reliable = true } = {}) {
    if (this.ended) return false;
    const packet = { p: PROTOCOL, ...data };
    let ok = false;
    if (this.active) ok = this.hub.send(packet, { to, reliable });
    else if (this.channel?.readyState === 'open') {
      if (this.channel.bufferedAmount < 131072) { this.channel.send(JSON.stringify(packet)); ok = true; }
    } else if (this.bc && this.connected) {
      this.bc.postMessage({ ...packet, from: this.me, session: this.session }); ok = true;
    }
    if (ok) this.sent++;
    return ok;
  }
  /** Call each frame; jump/interact/dash are latched across the 10 Hz send interval. */
  sendInput(input, force = false) {
    if (this.isHost || this.ended) return false;
    const v = cleanInput(input);
    for (const key of PULSE_KEYS) v[key] ||= this.pendingInput[key];
    this.pendingInput = v;
    const now = performance.now();
    if (!force && now - this.lastInputAt < 100) return false;
    const ok = this.send({ k: 'input', n: ++this.seq, input: this.pendingInput }, { to: this.host });
    if (ok) {
      this.lastInputAt = now;
      this.pendingInput = { ...v, jump: false, interact: false, dash: false };
    }
    return ok;
  }
  /** Host calls each frame. Snapshots are sent at most 10 Hz and are JSON. */
  sendState(state, force = false) {
    if (!this.isHost || this.ended) return false;
    this.lastState = state;
    const now = performance.now();
    if (!force && now - this.lastStateAt < 100) return false;
    const ok = this.send({ k: 'state', n: ++this.seq, state });
    if (ok) this.lastStateAt = now;
    return ok;
  }
  receive(data, from) {
    if (this.ended || data?.p !== PROTOCOL || !Number.isFinite(data.n)) return;
    if (!this.players.some(p => p.id === from) && from !== this.host) return;
    this.received++;
    this.remoteLastSeen = performance.now();
    if (data.k === 'input' && this.isHost && from !== this.me && data.n > (this.inputSeq.get(from) ?? -1)) {
      this.inputSeq.set(from, data.n);
      this.emit('onInput', cleanInput(data.input), from);
    } else if (data.k === 'state' && !this.isHost && from === this.host && data.n > this.stateSeq) {
      this.stateSeq = data.n;
      this.emit('onState', data.state, from);
    } else if (data.k === 'finished' && !this.isHost && from === this.host) {
      this.finished = true;
      this.emit('onFinished', data.outcome);
    }
  }
  finish({ score = 0, won = false, stats = {}, scores, awards = [] } = {}) {
    if (!this.isHost || this.finished || this.ended) return;
    this.finished = true;
    const ids = this.players.map(p => p.id);
    const outcome = { standings: [ids], scores: scores || Object.fromEntries(ids.map(id => [id, score])), won: !!won,
      stats: Object.fromEntries(ids.map(id => [id, stats])), awards };
    if (this.active) this.hub.finish(outcome);
    else this.send({ k: 'finished', n: ++this.seq, outcome });
  }
  fail(message) {
    this.error = String(message);
    if (this.active) this.hub.fail(this.error);
    this.emit('onError', this.error);
  }
  markPeerLeft(reason = 'disconnected', id = this.isHost ? 1 : 0) {
    if (!this.connected) return false;
    this.connected = false;
    this.players = this.players.filter(p => p.id !== id);
    this.inputSeq.delete(id);
    clearInterval(this.joinTimer);
    this.emit('onLeave', { id, reason });
    this.emit('onStatus', this.info());
    return true;
  }
  /** Same-origin two-tab rooms: no server or internet service needed. */
  openLocalRoom(code = null, asHost = true) {
    if (this.active) throw new Error('AI Hub owns the network during a session.');
    this.closePeer();
    if (!globalThis.BroadcastChannel) throw new Error('This browser does not support local rooms.');
    this.room = String(code || crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 6)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (!this.room) throw new Error('Enter a room code.');
    this.transport = 'local-room';
    this.isHost = !!asHost;
    this.me = asHost ? 0 : 1;
    this.host = 0;
    this.players = asHost ? [player(0, 'Officer Blue')] : [player(0, 'Officer Blue'), player(1, 'Officer Gold')];
    this.ended = this.finished = false;
    this.session = asHost ? crypto.randomUUID() : null;
    this.bc = new BroadcastChannel(`keystone-bumbling-beat:${this.room}`);
    this.bc.onmessage = event => {
      const m = event.data;
      if (!m || m.p !== PROTOCOL || m.from === this.me) return;
      if (m.k === 'join' && this.isHost) {
        const fresh = !this.connected;
        if (fresh) this.inputSeq.delete(1);
        this.connected = true;
        this.players = [player(0, 'Officer Blue'), player(1, 'Officer Gold')];
        this.bc.postMessage({ p: PROTOCOL, k: 'welcome', session: this.session, from: 0 });
        if (fresh) this.emit('onJoin', this.info());
      } else if (m.k === 'welcome' && !this.isHost && typeof m.session === 'string') {
        const fresh = !this.connected;
        this.session = m.session;
        this.connected = true;
        if (fresh) this.emit('onJoin', this.info());
      } else if (m.session === this.session && m.k === 'bye') {
        this.markPeerLeft('left', m.from);
      } else if (this.connected && m.session === this.session) this.receive(m, m.from);
    };
    if (!asHost) {
      const join = () => this.bc?.postMessage({ p: PROTOCOL, k: 'join', from: 1 });
      join();
      this.joinTimer = setInterval(() => { if (!this.connected) join(); }, 700);
    }
    this.emit('onStatus', this.info());
    return this.room;
  }
  /** Direct WebRTC with manual signaling; never called inside AI Hub. */
  createPeer(asHost) {
    if (this.active) throw new Error('AI Hub owns the network during a session.');
    this.closePeer();
    if (!globalThis.RTCPeerConnection) throw new Error('Direct online co-op is unavailable in this browser.');
    this.transport = 'webrtc';
    this.isHost = asHost;
    this.me = asHost ? 0 : 1;
    this.host = 0;
    this.players = [player(0, 'Officer Blue'), player(1, 'Officer Gold')];
    this.ended = this.finished = false;
    const peer = this.peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peer.onconnectionstatechange = () => {
      if (this.peer !== peer) return;
      const state = peer.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.markPeerLeft(state);
      }
    };
    const wire = channel => {
      this.channel = channel;
      channel.onopen = () => { this.connected = true; this.emit('onJoin', this.info()); this.emit('onStatus', this.info()); };
      channel.onclose = () => { if (this.channel === channel) this.markPeerLeft('channel-closed'); };
      channel.onmessage = event => {
        try { this.receive(JSON.parse(event.data), this.isHost ? 1 : 0); }
        catch { this.error = 'A malformed network packet was ignored.'; }
      };
      channel.onerror = () => { this.error = 'The peer connection could not send data.'; this.emit('onError', this.error); };
    };
    if (asHost) wire(this.peer.createDataChannel('mall-patrol', { ordered: true }));
    else this.peer.ondatachannel = event => wire(event.channel);
    return this.peer;
  }
  async gatherIce(peer) {
    if (peer.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      let timer;
      const finish = () => { clearTimeout(timer); peer.removeEventListener('icegatheringstatechange', change); resolve(); };
      const change = () => { if (peer.iceGatheringState === 'complete') finish(); };
      peer.addEventListener('icegatheringstatechange', change);
      timer = setTimeout(finish, 7000);
    });
  }
  async createOffer() {
    const peer = this.createPeer(true);
    await peer.setLocalDescription(await peer.createOffer());
    await this.gatherIce(peer);
    return encode({ game: PROTOCOL, type: 'offer', sdp: peer.localDescription.sdp });
  }
  async acceptOffer(code) {
    const offer = decode(code);
    if (offer.game !== PROTOCOL || offer.type !== 'offer' || typeof offer.sdp !== 'string') throw new Error('That is not a Keystone invite.');
    const peer = this.createPeer(false);
    await peer.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    await peer.setLocalDescription(await peer.createAnswer());
    await this.gatherIce(peer);
    return encode({ game: PROTOCOL, type: 'answer', sdp: peer.localDescription.sdp });
  }
  async acceptAnswer(code) {
    const answer = decode(code);
    if (answer.game !== PROTOCOL || answer.type !== 'answer' || typeof answer.sdp !== 'string') throw new Error('That is not a Keystone reply.');
    if (!this.peer || !this.isHost) throw new Error('Create an invite before entering a reply.');
    await this.peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
  }
  closePeer() {
    this.connected = false;
    clearInterval(this.joinTimer);
    if (this.bc) {
      try { this.bc.postMessage({ p: PROTOCOL, k: 'bye', from: this.me, session: this.session }); } catch {}
      this.bc.close(); this.bc = null;
    }
    if (this.channel) { this.channel.close(); this.channel = null; }
    if (this.peer) { this.peer.close(); this.peer = null; }
    this.connected = false;
    this.room = null;
    this.inputSeq.clear();
    this.stateSeq = -1;
    this.pendingInput = cleanInput();
  }
  disconnect() {
    // Session lifecycle belongs to the hub. Its page owns leaving a round.
    if (this.active) return false;
    this.closePeer();
    this.isHost = true; this.me = this.host = 0; this.server = false;
    this.transport = 'solo'; this.players = [player(0, 'Officer Blue')];
    this.emit('onStatus', this.info());
    return true;
  }
  inspect() { return { ...this.info(), sent: this.sent, received: this.received, ended: this.ended, finished: this.finished, started: this.started, error: this.error }; }
  destroy() { this.closePeer(); for (const off of this.unsubscribers) off(); this.unsubscribers = []; }
}

return {HubBridge};
})();
const {DEFAULTS,CASES,ChaseGame}=(()=>{
const DEFAULTS = Object.freeze({speed:6.1,crookSpeed:2.25,gravity:24,jump:9.3,time:105,penalty:5,hazardSpeed:1,burst:1.65});
const CASES = [
 {name:'THE FIVE-FINGER DISCOUNT',subtitle:'A light-fingered fellow. A very heavy bag.',floor:1,x:10,speed:1,time:105,hazards:5,goal:2},
 {name:'TROUBLE ON THE DOUBLE',subtitle:'More loot. More luggage. Same slippery shoes.',floor:2,x:8,speed:1.15,time:110,hazards:8,goal:4},
 {name:'THE LAST LAUGH',subtitle:'Closing time! Give this rascal his receipt.',floor:2,x:-17,speed:1.3,time:115,hazards:11,goal:6}
];
class ChaseGame {
 constructor(RAPIER,{onEvent=()=>{}}={}){this.R=RAPIER;this.onEvent=onEvent;this.config={...DEFAULTS};this.metrics={jumps:0,ducks:0,bursts:0,rides:0,hits:0,pickups:0,catches:0,steps:0};this.mode='title';this.caseIndex=0;this.score=0;this.players=[];this.hazards=[];this.pickups=[];this.elapsed=0;this.invincible=false;this.freezeCrook=false;this.phaseTime=0;this.totalLoot=0;this.world=null;}
 event(type,data={}){this.onEvent(type,data);}
 start({coop=false,attract=false}={}){this.inactivePlayers=new Set();this.metrics={jumps:0,ducks:0,bursts:0,rides:0,hits:0,pickups:0,catches:0,steps:0};this.coop=coop;this.attract=attract;this.score=0;this.totalLoot=0;this.caseIndex=0;this.elapsed=0;this.mode='playing';this.loadCase(0);this.event('start');}
 loadCase(index){if(this.world)this.world.free();this.world=new this.R.World({x:0,y:-this.config.gravity,z:0});this.caseIndex=index;const c=CASES[index];this.time=c.time*(this.config.time/DEFAULTS.time);this.phaseTime=0;this.loot=0;this.caught=false;this.caseHits=0;this.players=[];this.hazards=[];this.pickups=[];
  for(let floor=0;floor<3;floor++){let body=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(0,floor*5-.25,1.7));this.world.createCollider(this.R.ColliderDesc.cuboid(25,.25,2.5).setFriction(0),body);}
  for(let i=0;i<(this.coop?2:1);i++)this.addPlayer(i);for(const id of this.inactivePlayers||[])this.deactivatePlayer(id);
  this.crook={x:c.x,y:c.floor*5,floor:c.floor,dir:c.x>0?1:-1,transition:null,escape:0,routeTimer:0};
  const defs=[['ball',0,-7,1],['cart',0,11,-1],['plane',1,-12,1],['case',1,7,0],['ball',2,15,-1],['cart',1,20,-1],['plane',2,-15,1],['case',0,-18,0],['ball',1,-4,-1],['plane',0,19,-1],['cart',2,4,1]];
  for(let i=0;i<c.hazards;i++){const[kind,floor,x,dir]=defs[i];this.addHazard(kind,floor,x,dir);}
  for(let f=0;f<3;f++)for(let j=0;j<3;j++){const x=[-11,7,21][j]+(f%2?-2:0);this.addPickup(f,x);}
  this.event('case',{index,c});
 }
 addPlayer(id){const b=this.world.createRigidBody(this.R.RigidBodyDesc.dynamic().setTranslation(-21+id*1.5,.05,1.7).lockRotations().enabledTranslations(true,true,false).setLinearDamping(.2).setCanSleep(false));const collider=this.world.createCollider(this.R.ColliderDesc.capsule(.43,.3).setTranslation(0,.76,0).setFriction(0).setRestitution(0).setCollisionGroups(0x00010002),b);
 const p={id,active:true,body:b,collider,x:-21+id*1.5,y:.05,floor:0,dir:1,ground:true,duck:false,invul:0,stun:0,burst:0,cooldown:0,transition:null,lastInput:{},anim:'idle'};this.players.push(p);return p;}
 addHazard(kind,floor,x,dir){let h={id:this.hazards.length,kind,floor,x,dir,speed:kind==='plane'?4.2:kind==='cart'?2.2:kind==='ball'?3.0:0,y:floor*5+(kind==='plane'?1.42:kind==='ball'?.42:kind==='cart'?.53:.35)};h.body=this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(x,h.y,1.7));let cd=kind==='ball'?this.R.ColliderDesc.ball(.43):this.R.ColliderDesc.cuboid(kind==='plane'?.75:kind==='cart'?.65:.48,kind==='plane'?.16:kind==='cart'?.49:.32,.45);h.collider=this.world.createCollider(cd.setSensor(true),h.body);this.hazards.push(h);}
 addPickup(floor,x){const b=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(x,floor*5+.55,1.7));const collider=this.world.createCollider(this.R.ColliderDesc.ball(.6).setSensor(true),b);this.pickups.push({id:this.pickups.length,floor,x,y:floor*5+.55,collected:false,body:b,collider});}
 resetConfig(){Object.assign(this.config,DEFAULTS);if(this.world)this.world.gravity.y=-this.config.gravity;}
 pause(){if(this.mode==='playing'){this.mode='paused';this.event('pause');}}
 resume(){if(this.mode==='paused'){this.mode='playing';this.event('resume');}}
 nextCase(){if(this.caseIndex<2){this.mode='playing';this.loadCase(this.caseIndex+1);}else{this.mode='won';this.event('win');}}
 jump(p){if(p.ground&&!p.transition&&!p.stun){const v=p.body.linvel();p.body.setLinvel({x:v.x,y:this.config.jump,z:0},true);p.ground=false;this.metrics.jumps++;this.event('jump',{id:p.id});}}
 travel(p,kind,delta){if(p.transition||!p.ground)return false;let dest=p.floor+delta;if(dest<0||dest>2)return false;
 const start=p.body.translation();let endX=p.x;if(kind==='escalator'){let center=p.floor===0||dest===0?-17:17;endX=center+(delta>0?3:-3);}
 p.transition={kind,t:0,duration:kind==='elevator'?1.55:1.25,from:{x:start.x,y:start.y},to:{x:endX,y:dest*5+.04},dest};p.body.setBodyType(this.R.RigidBodyType.KinematicPositionBased,true);p.body.setLinvel({x:0,y:0,z:0},true);this.metrics.rides++;this.event('ride',{kind,id:p.id});return true;}
 context(p){if(p.transition)return null;if(Math.abs(p.x)<2)return {kind:'elevator',up:p.floor<2,down:p.floor>0,label:p.floor===2?'LIFT ↓':'LIFT ↑'};if(p.floor===0&&Math.abs(p.x+20)<2.7)return {kind:'escalator',up:true,down:false,label:'ESCALATOR ↑'};if(p.floor===1&&Math.abs(p.x+14)<2.7)return {kind:'escalator',up:false,down:true,label:'ESCALATOR ↓'};if(p.floor===1&&Math.abs(p.x-14)<2.7)return {kind:'escalator',up:true,down:false,label:'ESCALATOR ↑'};if(p.floor===2&&Math.abs(p.x-20)<2.7)return {kind:'escalator',up:false,down:true,label:'ESCALATOR ↓'};return null;}
 interact(p,input){const c=this.context(p);if(!c)return false;let down=input.downUse||(!c.up&&c.down);return this.travel(p,c.kind,down?-1:1);}
 hit(p,h){if(p.invul>0||p.transition||this.invincible||this.attract)return;this.time=Math.max(0,this.time-this.config.penalty);p.invul=1.7;p.stun=.38;this.caseHits++;this.metrics.hits++;p.body.setLinvel({x:-p.dir*3,y:3,z:0},true);this.event('hit',{id:p.id,kind:h.kind});}
 catchCrook(){if(this.caught)return;this.caught=true;this.mode='caseclear';this.phaseTime=0;let bonus=Math.ceil(this.time)*10+500+this.loot*100;this.score+=bonus;this.metrics.catches++;this.event('catch',{bonus,loot:this.loot,clean:this.caseHits===0});}
 deactivatePlayer(id){this.inactivePlayers??=new Set();this.inactivePlayers.add(id);const p=this.players[id];if(p){p.active=false;p.body.setEnabled(false);p.transition=null;}}
 teleport(id,floor,x){const p=this.players[id];if(!p)return;p.transition=null;p.body.setBodyType(this.R.RigidBodyType.Dynamic,true);p.body.setTranslation({x,y:floor*5+.05,z:1.7},true);p.body.setLinvel({x:0,y:0,z:0},true);p.x=x;p.y=floor*5+.05;p.floor=floor;p.ground=true;}
 update(dt,inputs=[]){if(!this.world||this.mode!=='playing')return;dt=Math.min(dt,1/30);this.metrics.steps++;this.elapsed+=dt;this.phaseTime+=dt;this.time-=dt;if(this.world.gravity.y!==-this.config.gravity)this.world.gravity.y=-this.config.gravity;
  if(this.time<=0&&!this.attract){this.time=0;this.mode='lost';this.event('lose',{reason:'time'});return;}
  for(const p of this.players){if(p.active===false)continue;let input=inputs[p.id]||{};p.invul=Math.max(0,p.invul-dt);p.stun=Math.max(0,p.stun-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.burst=Math.max(0,p.burst-dt);
   if(p.transition){let t=p.transition;t.t+=dt;let a=Math.min(1,t.t/t.duration);a=a*a*(3-2*a);p.body.setNextKinematicTranslation({x:t.from.x+(t.to.x-t.from.x)*a,y:t.from.y+(t.to.y-t.from.y)*a,z:1.7});p.anim='idle';if(t.t>=t.duration){p.floor=t.dest;p.body.setBodyType(this.R.RigidBodyType.Dynamic,true);p.body.setLinvel({x:0,y:0,z:0},true);p.transition=null;p.invul=.3;}p.lastInput={...input};continue;}
   const pos=p.body.translation(),vel=p.body.linvel();p.floor=Math.max(0,Math.min(2,Math.round(pos.y/5)));p.ground=pos.y-p.floor*5<.11&&vel.y<.8;const wasDuck=p.duck;p.duck=!!input.duck&&p.ground;
   if(wasDuck!==p.duck){this.world.removeCollider(p.collider,true);p.collider=this.world.createCollider(this.R.ColliderDesc.capsule(p.duck?.12:.43,.3).setTranslation(0,p.duck?.43:.76,0).setFriction(0).setCollisionGroups(0x00010002),p.body);if(p.duck)this.metrics.ducks++;}
   if(input.jump&&!p.lastInput.jump)this.jump(p);
   if(input.dash&&!p.lastInput.dash&&p.cooldown<=0&&!p.stun){p.burst=.75;p.cooldown=4.2;this.metrics.bursts++;this.event('dash',{id:p.id});}
   if(input.interact&&!p.lastInput.interact)this.interact(p,input);
   let move=Math.max(-1,Math.min(1,input.move||0));if(Math.abs(move)<.15)move=0;if(move)p.dir=Math.sign(move);if(!p.stun&&!p.transition){p.body.setLinvel({x:move*this.config.speed*(p.duck?.56:1)*(p.burst>0?this.config.burst:1),y:p.body.linvel().y,z:0},true);}
   p.anim=p.duck?'duck':!p.ground?'jump':Math.abs(move)>.1?'run':'idle';p.lastInput={...input};
  }
  for(const h of this.hazards){h.x+=h.dir*h.speed*this.config.hazardSpeed*dt;if(h.x>24)h.x=-24;if(h.x< -24)h.x=24;h.body.setNextKinematicTranslation({x:h.x,y:h.y,z:1.7});}
  this.updateCrook(dt);
  this.world.timestep=dt;this.world.step();
  for(const p of this.players){if(p.active===false)continue;const pos=p.body.translation();if(Math.abs(pos.x)>24){p.body.setTranslation({x:Math.max(-24,Math.min(24,pos.x)),y:pos.y,z:1.7},true);}p.x=p.body.translation().x;p.y=p.body.translation().y;
   if(p.y< -2)this.teleport(p.id,0,-21);
   for(const h of this.hazards)if(this.world.intersectionPair(p.collider,h.collider))this.hit(p,h);
   for(const b of this.pickups)if(!b.collected&&this.world.intersectionPair(p.collider,b.collider)){b.collected=true;this.loot++;this.totalLoot++;this.score+=100;this.metrics.pickups++;this.time+=2;this.event('pickup',{id:p.id});}
   if(!p.transition&&!this.crook.transition&&Math.abs(p.x-this.crook.x)<1.2&&Math.abs(p.y-this.crook.y)<1.05)this.catchCrook();
  }
 }
 updateCrook(dt){let c=this.crook;if(this.freezeCrook)return;if(c.transition){let t=c.transition;t.t+=dt;let a=Math.min(1,t.t/1.55);c.x=t.x+(t.endX-t.x)*a;c.y=t.y+(t.dest*5-t.y)*a;if(a>=1){c.floor=t.dest;c.transition=null;c.dir=c.x>0?-1:1;}return;}
  c.routeTimer+=dt;const speed=this.config.crookSpeed*CASES[this.caseIndex].speed;
  c.x+=c.dir*speed*dt;c.y=c.floor*5;
  if(c.floor<2){let center=c.floor===0?-17:17;let start=center-3;if(c.dir===1&&c.x>=start&&c.x<start+1.5){c.transition={t:0,x:c.x,y:c.y,endX:center+3,dest:c.floor+1};return;}}
  if(c.x>23){c.x=23;c.dir=-1;}if(c.x< -23){c.x=-23;c.dir=1;}
  if(c.floor===2&&c.routeTimer>32){c.escape+=dt;if(c.escape>18&&!this.attract){this.mode='lost';this.event('lose',{reason:'escape'});}}
 }
 aiInput(p){if(!p||!this.crook)return {};const c=this.crook;let target=c.x,input={move:0};if(p.floor!==c.floor){const floor=p.floor;target=0;if(Math.abs(p.x)<1.2){input.interact=!p.lastInput.interact;input.downUse=floor>c.floor;}}
  input.move=Math.abs(target-p.x)<.4?0:Math.sign(target-p.x);for(const h of this.hazards)if(h.floor===p.floor&&Math.abs(h.x-p.x)<2.6&&Math.sign(h.x-p.x)===p.dir){if(h.kind==='plane')input.duck=true;else input.jump=true;}
  if(p.floor===c.floor&&Math.abs(c.x-p.x)>5)input.dash=p.cooldown<=0;return input;}
 snapshot(){return {mode:this.mode,caseIndex:this.caseIndex,time:this.time,score:this.score,loot:this.loot,totalLoot:this.totalLoot,elapsed:this.elapsed,coop:this.coop,attract:this.attract,phaseTime:this.phaseTime,players:this.players.map(p=>({id:p.id,active:p.active,x:p.x,y:p.y,floor:p.floor,dir:p.dir,anim:p.anim,duck:p.duck,invul:p.invul,cooldown:p.cooldown,burst:p.burst,transition:p.transition?{kind:p.transition.kind}:null})),crook:this.crook?{...this.crook}:null,hazards:this.hazards.map(h=>({id:h.id,kind:h.kind,x:h.x,y:h.y,floor:h.floor,dir:h.dir})),pickups:this.pickups.map(p=>({id:p.id,active:p.active,x:p.x,y:p.y,floor:p.floor,collected:p.collected})),metrics:{...this.metrics}};}
}

return {DEFAULTS,CASES,ChaseGame};
})();






const CREDITS={"sourceInformation": {"date": "2026-11-05 21:58:24", "source": "Keystone Kapers (1983)", "plan": "none", "genre": "Arcade action / platform chase", "perspective": "Side-on 2.5D orthographic cutaway", "tech": "Three.js r180 (0.180.0), WebGPU with WebGL fallback, Rapier 0.19.3, Gamepad API, Web Audio API; AI Hub session client 1.4.0; WebRTC and BroadcastChannel", "artDirection": "Procedural cel-shaded / ink look; warm paper, navy outlines, mint storefronts and coral accents", "animation": "Three.js AnimationMixer and AnimationClip keyframe tracks; original idle, run, jump, duck and celebration animations", "audio": "Original synthesized ragtime music (10% default), procedural effects and Animalese-style gibberish voices; no audio files", "online": "AI Hub shared-world cooperative sessions; standalone direct WebRTC co-op, same-browser BroadcastChannel rooms; 1–2 players including couch co-op", "testing": "Real Rapier scripted three-case playthrough; headless Chromium WebGPU; emulated standard gamepad and multitouch; offline audio waveform checks; two-browser WebRTC and BroadcastChannel; official AI Hub standard, adverse-network, host-leave and dedicated-server harness. Visual art checked through WebGL because headless WebGPU screenshots can be blank. Physical controller and real mobile hardware: unknown.", "research": "No source research; native model knowledge. Supplied AI Hub integration instructions and client files read.", "environment": "Codex CLI (headless); Linux", "model": "OpenAI, gpt-6.1-sol, reasoning effort ultra", "usage": "added on import"}, "testingFeedback": ["18 game/integration issues were found and fixed, along with 3 test-script issues and 1 headless-browser configuration issue.", "3 were game breaking: dedicated-server input sequencing, the guest remaining blocked on a case report, and hidden server rendering delaying a session startup.", "The real two-browser full-shift/restart regression verified authority, lift controls, guest case transitions and replay.", "The first headless WebGPU screenshot was blank and could not establish whether the scene rendered. Device health and draw submissions were more useful."], "engineFeedback": ["Three.js combines procedural geometry, TSL cel materials and native AnimationMixer clips well in a single-file game.", "Yes. The supplied Chromium WebGPU flags lost even a one-cube device. Adding --use-angle=swiftshader and --disable-vulkan-surface fixed the test environment.", "The three-floor chase simulation, transport interactions, controller interface and authoritative cooperative state synchronization.", "Keeping physical floor travel, animated character poses and networked case transitions consistent, while validating headless WebGPU rendering.", "none", "A built-in toon node material with matching WebGPU and WebGL behavior."], "promptFeedback": ["The specific arcade source, controller-first design and procedural audio requirements gave the game a clear identity.", "The no-internet research rule overlaps with a linked integration contract that must be retrieved; I used native knowledge for the source and fetched only the required integration and runtime dependencies.", "Combining a complete three-case game, generated art and audio, live developer tools and authoritative multiplayer in one HTML file.", "Include versioned local AI Hub client/harness files and known-good headless browser flags."], "aiHub": {"name": "Keystone Bumbling Beat", "tagline": "Catch the crook. Mind the merchandise.", "description": "Clock in for three slapstick mall chases. Hop trolleys, duck toy planes, and take a lift to cut off a light-fingered rascal, solo or with a partner.", "type": "Game", "genre": "Action", "source": "Keystone Kapers (1983)", "series": "", "players": "1–2", "controls": "Left stick / A,D move; Cross / Space jump; Circle / Down duck; Triangle / E use shortcut; Square / Shift burst; Options / Esc pause.", "tags": ["3d", "arcade", "co-op", "side-scrolling", "retro", "comedy"]}};
const $=id=>document.getElementById(id);
const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const prefs={music:10,effects:70,xbox:false,assist:true,shake:true,...safeRead('keystone-prefs',{})};
const best=safeRead('keystone-best',{score:0,cases:0});
const audio=new AudioDirector();audio.setMusicVolume(prefs.music/100);audio.setEffectsVolume(prefs.effects/100);
let renderer,scene,camera,mall,game,bridge,frame=0,now=0,accum=0,lastFrame=0,ready=false;
let screen='title',history=[],lastActivity=performance.now(),lastInputType='keyboard',toastUntil=0,announceUntil=0,shakeTime=0,networkState=null,remoteInputs=new Map(),seatSlots=new Map(),caseShown=-1,resultsShown='',touchMode=false,activeTouches=new Map(),touchMove=0,touchHop=false,touchUse=false,focusIndex=0,padPrevious=[],navRepeat=0,attractReturn=0,hostWaiting=false,hubFinished=false,remotePause=false;
const keys=new Set(),pressedKeys=new Set(),view={players:[],crook:null,hazards:[],pickups:[]},particles=[];
let renderState=null;
function markInput(type){if(bridge?.ended)return true;lastActivity=performance.now();if(type==='touch'&&!touchMode){touchMode=true;document.body.classList.add('touch');}else if(type!=='touch'&&touchMode){touchMode=false;document.body.classList.remove('touch');touchMove=0;activeTouches.clear();}if(lastInputType!==type){lastInputType=type;refreshPrompts();}if(game?.attract&&bridge?.transport==='solo'&&!bridge.connected){game.attract=false;showTitle();return true;}return false;}
function setScreen(name,{remember=false}={}){if(remember&&screen)history.push(screen);document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===name));screen=name;focusIndex=0;const active=name?$(name):null;if(active){active.querySelectorAll('.focused').forEach(e=>e.classList.remove('focused'));if(lastInputType==='gamepad')focusMenu(0);} $('hud').classList.toggle('show',!name&&!!renderState);$('attract-label').style.display=game?.attract?'block':'none';}
function menuItems(){return screen?Array.from($(screen).querySelectorAll('button,input:not([type=text]),textarea')).filter(e=>e.offsetParent&&!e.disabled):[];}
function focusMenu(index){const items=menuItems();if(!items.length)return;focusIndex=(index+items.length)%items.length;items.forEach((e,i)=>e.classList.toggle('focused',i===focusIndex));items[focusIndex].focus({preventScroll:true});items[focusIndex].scrollIntoView({block:'nearest'});}
function menuMove(dir){focusMenu(focusIndex+dir);audio.sfx('menu');}
function goBack(){const dest=history.pop()||((game?.mode==='paused')?'pause':'title');setScreen(dest);}
function toast(text,duration=2.3){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+duration*1000;}
function announce(){const c=CASES[renderState.caseIndex];$('announcement-case').textContent=`CASE ${String(renderState.caseIndex+1).padStart(2,'0')} / 03`;$('announcement-title').textContent=c.name;$('announcement-copy').textContent=c.subtitle;$('announcement').style.display='block';announceUntil=performance.now()+3000;}
function showTitle(){if(bridge?.active)return;game.mode='title';game.attract=false;history=[];networkState=null;resultsShown='';caseShown=-1;audio.setScene('title');setScreen('title');$('announcement').style.display='none';$('attract-label').style.display='none';lastActivity=performance.now();if(!game.world){game.start();game.mode='title';}syncView(game.snapshot());}
function startGame(coop=false,attract=false){if(!bridge?.isHost)return;if(bridge.transport!=='solo')coop=bridge.players.length>1;mapSeats();game.start({coop,attract});networkState=null;caseShown=-1;resultsShown='';history=[];if(!attract)audio.unlock();audio.setScene('play');bridge.begin();bridge.finished=false;hubFinished=false;setScreen('');renderState=game.snapshot();syncView(renderState);if(!attract)announce();$('attract-label').style.display=attract?'block':'none';}
function pauseGame(){pressedKeys.clear();touchHop=false;touchUse=false;if(game.attract){showTitle();return;}if(!ready)return;if(screen){if(screen==='pause')resumeGame();return;}if(bridge.active||bridge.connected){remotePause=true;setScreen('pause');toast('Live co-op continues while menus are open.');}else{game.pause();audio.setScene('pause');setScreen('pause');}}
function resumeGame(){if(!bridge.active&&!bridge.connected)game.resume();remotePause=false;history=[];setScreen('');audio.setScene('play');}
function finishRound(won){if(hubFinished||!bridge.isHost)return;hubFinished=true;const s=game.snapshot();if(bridge.active||bridge.connected)bridge.finish({score:s.score,won,stats:{Catches:s.metrics.catches,Bags:s.totalLoot,Bumps:s.metrics.hits}});best.score=Math.max(best.score,s.score);best.cases=Math.max(best.cases,s.metrics.catches);safeWrite('keystone-best',best);}
function showResult(state){const key=`${state.mode}-${state.caseIndex}`;if(resultsShown===key)return;resultsShown=key;const clear=state.mode==='caseclear',won=state.mode==='won';$('result-eyebrow').textContent=clear?'OFFICIAL CASE REPORT':won?'EMPLOYEE OF THE MINUTE':'ONE SLIPPERY CUSTOMER';$('result-title').textContent=clear?'CASE CLOSED!':won?'A CLEAN GETAWAY?\nNOT TODAY.':'HE GOT A-WAY!';$('result-copy').textContent=clear?`${CASES[state.caseIndex].name}. ${state.loot} bags recovered. The chief is almost impressed.`:won?'Three cases closed. Nine shops still standing. Mostly. Same time tomorrow, officer?':state.crook?.escape>18?'The rascal slipped out over the rooftop. Try a lift shortcut and cut him off.':'Closing time caught you first. Grab bags for bonus seconds and use your whistle burst to close the gap.';
 $('result-stats').innerHTML=`<div class="stat"><b>${String(state.score).padStart(6,'0')}</b><small>GOOD DEEDS</small></div><div class="stat"><b>${state.totalLoot}</b><small>BAGS SAVED</small></div><div class="stat"><b>${state.metrics.hits}</b><small>BUMPS TAKEN</small></div>`;
 const next=$('continue-button');next.textContent=clear?(state.caseIndex===2?'FINISH SHIFT →':'NEXT CASE →'):'ANOTHER SHIFT →';next.disabled=!!(bridge.active||bridge.connected)&&!bridge.isHost;if(bridge.active&&(won||!clear)){next.classList.add('hidden');}else next.classList.remove('hidden');setScreen('result');audio.setScene(clear||won?'win':'lose');if(!clear)finishRound(won);}
function onEvent(type,data){if(type==='case'){caseShown=-1;resultsShown='';}if(type==='jump'||type==='dash'||type==='pickup'||type==='hit'){audio.sfx(type);if(type==='pickup')toast('BAG RECOVERED · +100 · +2 SECONDS',1.3);if(type==='hit'){toast(`OOPS! −${game.config.penalty.toFixed(0)} SECONDS`,1.3);if(prefs.shake)shakeTime=.35;}if(type==='pickup'||type==='hit')burstAt(game.players[data.id]?.x||0,game.players[data.id]?.y+1.0||0,type==='hit'?0xdb593f:0xefb550,12);}
 if(type==='ride'){audio.sfx('elevator');toast(data.kind==='elevator'?'GOING PLACES. SLOWLY.':'MIND THE STEP.',1.3);}if(type==='catch'){audio.sfx('catch');audio.voice('happy');burstAt(game.crook.x,game.crook.y+1,0xefb550,45);}if(type==='lose')audio.voice('sad');if(type==='win')audio.sfx('win');}
function burstAt(x,y,color,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.2,.035),new THREE.MeshBasicMaterial({color:i%3===0?0xfff4d9:color}));m.position.set(x,y,2.2);scene.add(m);particles.push({mesh:m,vx:(Math.random()-.5)*8,vy:Math.random()*8+2,t:1.2+Math.random()*.5});}}
function glyph(action){const ps={jump:'✕',duck:'◯',dash:'□',interact:'△',pause:'OPTIONS',move:'L'},xb={jump:'A',duck:'B',dash:'X',interact:'Y',pause:'MENU',move:'L'};const kb={jump:'SPACE',duck:'S / ↓',dash:'SHIFT',interact:'E / ↑',pause:'ESC',move:'A / D'};return lastInputType==='gamepad'?`<i class="key glyph">${(prefs.xbox?xb:ps)[action]}</i>`:`<i class="key">${kb[action]}</i>`;}
function refreshPrompts(){if(!$('legend'))return;$('legend').innerHTML=`<span>${glyph('move')} MOVE</span><span>${glyph('jump')} HOP</span><span>${glyph('duck')} DUCK</span><span>${glyph('interact')} RIDE</span><span>${glyph('dash')} BURST</span>`;$('guide-controls').innerHTML=[['move','Pound the pavement','Left stick or A/D. Arrow keys also work when playing solo.'],['jump','Hop the merchandise','Jump over beach balls, trolleys, and luggage.'],['duck','Watch your hat','Hold down or the duck button to slip under toy planes.'],['interact','Take a shortcut','Use a lift or escalator when the yellow prompt appears.'],['dash','Whistle burst','A short dash, then four seconds to catch your breath.']].map(([key,title,text])=>`<div class="guide-item"><div class="keys">${glyph(key)}</div><div><strong>${title}</strong><p>${text}</p></div></div>`).join('');if(touchMode)$('guide-controls').innerHTML='<div class="guide-item"><b>THUMBS UP</b><p>Slide your left thumb anywhere on the left half to move. Tap the right half to hop. The yellow action button rides a nearby shortcut. Touch assist hops low hazards and ducks planes for you.</p></div>';
}
function setPrefs(){safeWrite('keystone-prefs',prefs);audio.setMusicVolume(prefs.music/100);audio.setEffectsVolume(prefs.effects/100);refreshPrompts();}
function fillSettings(){for(const id of ['music','effects']){$(id).value=prefs[id];$(id).nextElementSibling.textContent=prefs[id]+'%';}for(const id of ['xbox','assist','shake'])$(id).checked=prefs[id];$('best-score').textContent=`PERSONAL BEST: ${String(best.score).padStart(6,'0')} · ${best.cases} CASES CLOSED`;}
function buildDev(){const rows=[['speed','Officer speed',3,12,.1],['crookSpeed','Rascal speed',0,5,.05],['jump','Jump power',5,14,.1],['gravity','Gravity',10,40,.5],['time','Case time budget',40,240,5],['penalty','Collision seconds',0,15,1],['hazardSpeed','Hazard pace',0,2,.05],['burst','Burst multiplier',1,3,.05]];$('dev-sliders').innerHTML=rows.map(([key,label,min,max,step])=>`<label class="slider">${label}<input type="range" data-config="${key}" min="${min}" max="${max}" step="${step}" value="${game.config[key]}"><output>${game.config[key]}</output></label>`).join('');$('invincible').checked=game.invincible;$('freeze-crook').checked=game.freezeCrook;}
function showAbout(){let fields=CREDITS.sourceInformation;const labels={date:'Date',source:'Source',plan:'Plan',genre:'Genre',perspective:'Perspective',tech:'Tech',artDirection:'Art Direction',animation:'Animation',audio:'Audio',online:'Online',testing:'Testing',research:'Research',environment:'Environment',model:'Model',usage:'Usage'};$('about-content').innerHTML='<p class="spaced">An original, affectionate mall chase inspired by Keystone Kapers (1983). All geometry, animation, music, effects, and nonsense speech were created in code. Three.js, Rapier and AI Hub retain their respective licenses.</p><h3>Source Information</h3><dl>'+Object.entries(fields).map(([k,v])=>`<dt>${labels[k]||k}</dt><dd>${v}</dd>`).join('')+'</dl>'+[['Testing Feedback',CREDITS.testingFeedback],['Engine Feedback',CREDITS.engineFeedback],['Prompt Feedback',CREDITS.promptFeedback]].map(([name,answers])=>`<h3>${name}</h3>${answers.map((s,i)=>`<p><b>${i+1}.</b> ${s}</p>`).join('')}`).join('');}
async function act(action){if(!ready||bridge?.ended)return;markInput(lastInputType);audio.unlock();audio.sfx('menu');try{switch(action){
 case 'solo':startGame();break;case 'local':startGame(true);break;case 'partners':case 'online':case 'tabs':setScreen(action,{remember:true});break;
 case 'guide':setScreen('guide',{remember:true});break;case 'settings':fillSettings();setScreen('settings',{remember:true});break;case 'about':showAbout();setScreen('about',{remember:true});break;case 'back':goBack();break;case 'pause':pauseGame();break;case 'resume':resumeGame();break;
 case 'title':if(bridge.active){toast('The Hub manages this shift.');break;}if(bridge.transport!=='solo')bridge.disconnect();showTitle();break;
 case 'continue':if(!bridge.isHost)break;if(game.mode==='caseclear'){game.nextCase();resultsShown='';setScreen('');renderState=game.snapshot();if(game.mode==='won'){showResult(renderState);}else{caseShown=-1;audio.setScene('play');announce();}}else startGame(game.coop);break;
 case 'dev':buildDev();setScreen('dev',{remember:true});break;case 'resetdev':game.resetConfig();game.invincible=false;game.freezeCrook=false;buildDev();toast('STANDARD ISSUE RESTORED');break;case 'addtime':game.time+=30;toast('THIRTY SECONDS ON THE HOUSE');break;case 'floor0':case 'floor1':case 'floor2':if(bridge.isHost)game.teleport(0,Number(action.slice(-1)),0);toast('EXPRESS DELIVERY');break;case 'catch':if(bridge.isHost){game.catchCrook();resultsShown='';showResult(game.snapshot());}break;
 case 'offer':$('online-status').textContent='Connecting the switchboard…';$('signal-output').value=await bridge.createOffer();$('online-status').textContent='Send this invitation to your partner. Keep this page open.';break;
 case 'answer':$('online-status').textContent='Dialing your partner…';$('signal-output').value=await bridge.acceptOffer($('signal-input').value);$('online-status').textContent='Send your reply back to the host, then wait here.';break;
 case 'connect':await bridge.acceptAnswer($('signal-input').value);$('online-status').textContent='Reply accepted. Waiting for direct connection…';break;
 case 'copy':$('signal-output').select();try{await navigator.clipboard.writeText($('signal-output').value);toast('COPIED. PASS IT ALONG.');}catch{document.execCommand('copy');toast('TEXT SELECTED FOR COPYING');}break;
 case 'hostroom':$('room-status').textContent=bridge.openLocalRoom();$('room-code').value=bridge.room;break;case 'joinroom':bridge.openLocalRoom($('room-code').value,false);$('room-status').textContent='CALLING…';break;
 }}catch(error){toast(error.message,5);$('online-status').textContent=error.message;}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){markInput(e.pointerType==='touch'?'touch':e.detail===0?lastInputType:'keyboard');act(b.dataset.action);}});
document.addEventListener('pointerover',e=>{const b=e.target.closest('button');if(b&&screen){const items=menuItems();let i=items.indexOf(b);if(i>=0){focusIndex=i;items.forEach((v,j)=>v.classList.toggle('focused',i===j));}}});
document.addEventListener('input',e=>{const el=e.target;if(el.id==='music'||el.id==='effects'){prefs[el.id]=+el.value;el.nextElementSibling.textContent=el.value+'%';setPrefs();}if(['xbox','assist','shake'].includes(el.id)){prefs[el.id]=el.checked;setPrefs();}if(el.dataset.config){game.config[el.dataset.config]=+el.value;el.nextElementSibling.textContent=(+el.value).toFixed(el.step<1?2:0);}if(el.id==='invincible')game.invincible=el.checked;if(el.id==='freeze-crook')game.freezeCrook=el.checked;markInput(lastInputType);});
window.addEventListener('keydown',e=>{if(e.target.matches('textarea,input[type=text]'))return;const consumed=markInput('keyboard');if(consumed){e.preventDefault();return;}keys.add(e.code);if(!screen&&!e.repeat)pressedKeys.add(e.code);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){if(screen==='title')return;if(screen&&screen!=='pause'&&screen!=='result')goBack();else pauseGame();}else if(screen){if(e.code==='Enter')e.preventDefault();if(e.code==='ArrowDown'||e.code==='KeyS'){if(screen==='about')$('about').querySelector('.panel').scrollTop+=150;else menuMove(1);}if(e.code==='ArrowUp'||e.code==='KeyW'){if(screen==='about')$('about').querySelector('.panel').scrollTop-=150;else menuMove(-1);}if(e.code==='Enter'||e.code==='Space'){const item=menuItems()[focusIndex];if(item?.type==='checkbox'){item.click();item.dispatchEvent(new Event('input',{bubbles:true}));}else item?.click();}if(e.code==='ArrowLeft'||e.code==='ArrowRight'){const el=menuItems()[focusIndex];if(el?.type==='range'){el.value=+el.value+(e.code==='ArrowLeft'?-1:1)*(+el.step||1);el.dispatchEvent(new Event('input',{bubbles:true}));}}}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pressedKeys.clear();touchMove=0;activeTouches.clear();if(!screen&&!bridge?.active&&!bridge?.connected&&!game?.attract)pauseGame();});
window.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')markInput('keyboard');});
$('canvas').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){if(markInput('touch'))return;if(screen)return;activeTouches.set(e.pointerId,{x:e.clientX,y:e.clientY,left:e.clientX<innerWidth*.5});if(e.clientX>=innerWidth*.5)touchHop=true;$('canvas').setPointerCapture(e.pointerId);}else{if(markInput('keyboard'))return;if(!screen)touchHop=true;}});
$('canvas').addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&activeTouches.has(e.pointerId)){let t=activeTouches.get(e.pointerId);if(t.left)touchMove=Math.max(-1,Math.min(1,(e.clientX-t.x)/48));}});
for(const name of ['pointerup','pointercancel'])$('canvas').addEventListener(name,e=>{const t=activeTouches.get(e.pointerId);if(t?.left)touchMove=0;activeTouches.delete(e.pointerId);});
for(const id of ['context','touch-action'])$(id).addEventListener('pointerdown',e=>{e.stopPropagation();markInput(e.pointerType==='touch'?'touch':'keyboard');touchUse=true;audio.unlock();});
function pollPads(inputDelta=1/60){const pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);let values=[];for(let i=0;i<pads.length;i++){const p=pads[i],prev=padPrevious[i]||[],button=n=>!!p.buttons[n]?.pressed,edge=n=>button(n)&&!prev[n];let move=p.axes[0]||0;if(Math.abs(move)<.2)move=0;if(button(14))move=-1;if(button(15))move=1;const input={move,jump:button(0),duck:button(1)||button(13)||(p.axes[1]||0)>.55,interact:button(3)||button(12)||(p.axes[1]||0)<-.6,downUse:button(13)||(p.axes[1]||0)>.55,dash:button(2)};if(move||p.buttons.some((b,n)=>b.pressed&&!prev[n])){if(markInput('gamepad')){padPrevious[i]=p.buttons.map(b=>b.pressed);values.push({});continue;}}
 if(i===0){if(edge(9)&&!button(8)){if(screen&&screen!=='pause'&&screen!=='title'&&screen!=='result')goBack();else pauseGame();}if(screen){if(Math.abs(p.axes[3]||0)>.2)$(screen).querySelector('.panel')?.scrollBy({top:p.axes[3]*700*inputDelta});let dir=button(13)||(p.axes[1]||0)>.6?1:button(12)||(p.axes[1]||0)<-.6?-1:0;if(dir&&(edge(13)||edge(12)||performance.now()>navRepeat)){if(screen==='about')$('about').querySelector('.panel').scrollTop+=dir*150;else menuMove(dir);navRepeat=performance.now()+220;}if(edge(0))menuItems()[focusIndex]?.click();if(edge(1)){if(screen==='pause')resumeGame();else if(screen!=='title'&&screen!=='result')goBack();}const current=menuItems()[focusIndex];if(current?.type==='range'&&Math.abs(move)>.3&&performance.now()>navRepeat){current.value=+current.value+Math.sign(move)*(+current.step||1);current.dispatchEvent(new Event('input',{bubbles:true}));navRepeat=performance.now()+90;}}}
 padPrevious[i]=p.buttons.map(b=>b.pressed);values.push(input);}return values;}
function getInputs(pads){const activeKey=code=>keys.has(code)||pressedKeys.has(code);const coop=renderState?.coop&&renderState.players.filter(p=>p.active!==false).length>1;let first={move:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),jump:activeKey('Space')||touchHop,duck:keys.has('KeyS')||keys.has('ControlLeft'),interact:activeKey('KeyE')||activeKey('KeyW')||touchUse,downUse:keys.has('KeyS'),dash:activeKey('ShiftLeft')||activeKey('ShiftRight')};if(!coop||bridge.connected){first.move+=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);first.duck||=keys.has('ArrowDown');first.interact||=activeKey('ArrowUp');first.downUse||=keys.has('ArrowDown');}if(touchMode){first.move=touchMove;if(prefs.assist&&!screen){const p=localOfficer(renderState);if(p&&!p.transition)for(const h of renderState.hazards){if(h.floor===p.floor&&Math.abs(h.x-p.x)<2.1){if(h.kind==='plane')first.duck=true;else if(Math.sign(h.x-p.x)===p.dir)first.jump=true;}}}}
 const merge=(a,b)=>b?{move:Math.abs(b.move)>.1?b.move:a.move,jump:a.jump||b.jump,duck:a.duck||b.duck,interact:a.interact||b.interact,downUse:a.downUse||b.downUse,dash:a.dash||b.dash}:a;
 first=merge(first,pads[0]);let second=merge({move:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),jump:activeKey('Enter')||activeKey('Numpad0'),duck:keys.has('ArrowDown'),interact:activeKey('ArrowUp')||activeKey('Numpad1'),downUse:keys.has('ArrowDown'),dash:activeKey('Slash')||activeKey('Numpad2')},pads[1]);return [first,second];}
function mapSeats(){seatSlots.clear();bridge.players.forEach((p,i)=>seatSlots.set(p.id,i));}
function seatIndex(seat){return seatSlots.has(seat)?seatSlots.get(seat):Math.max(0,bridge.players.findIndex(p=>p.id===seat));}
function localOfficer(state=renderState){const id=bridge?.connected&&!bridge.server?seatIndex(bridge.me):0;return state?.players?.find(p=>p.id===id&&p.active!==false)||state?.players?.find(p=>p.active!==false);}
function netInputs(local){if(!bridge.connected)return local;const result=game.players.map(()=>({}));if(!bridge.server){result[seatIndex(bridge.me)]=local[0];}for(const[seat,item]of remoteInputs){const index=seatIndex(seat);result[index]=performance.now()-item.at<5000?{...item.input}:{...item.input,move:0,duck:false};}return result;}
function characterMarker(character,text,bg){const cv=document.createElement('canvas');cv.width=256;cv.height=64;const ctx=cv.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(2,2,252,60);ctx.strokeStyle='#172d3c';ctx.lineWidth=6;ctx.strokeRect(3,3,250,58);ctx.fillStyle='#fff4d9';ctx.font='900 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,33);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),depthTest:false,depthWrite:false}));sprite.scale.set(text==='RASCAL'?2.5:1.25,.52,1);sprite.position.set(0,2.62,0);sprite.renderOrder=20;character.group.add(sprite);}
function syncView(state,animationDelta=1/60){if(!state||!mall)return;renderState=state;if(view.players.length!==state.players.length){for(const c of view.players)scene.remove(c.group);view.players=state.players.map((p,i)=>{const c=createCharacter(scene,{color:i===0?0x3d78a1:0xd99138,accent:i===0?0xefb550:0x86c6b8,kind:'cop'});characterMarker(c,'P'+(i+1),i===0?'#3d78a1':'#bb7b2e');return c;});}if(!view.crook){view.crook=createCharacter(scene,{kind:'crook',color:0xe26a47});characterMarker(view.crook,'RASCAL','#bc4936');}
 if(view.hazards.length!==state.hazards.length||view.caseIndex!==state.caseIndex){for(const h of view.hazards)scene.remove(h);view.hazards=state.hazards.map(h=>{const g=createHazard(h.kind);scene.add(g);return g;});for(const p of view.pickups)scene.remove(p);view.pickups=state.pickups.map(()=>{let g=createPickup('bag');scene.add(g);return g;});view.caseIndex=state.caseIndex;}
 const dt=animationDelta;state.players.forEach((p,i)=>{let c=view.players[i];c.group.position.set(p.x,p.y+.04,1.7);c.group.rotation.y=p.dir<0?Math.PI:0;c.group.visible=p.active!==false&&!(p.invul>0&&Math.floor(now*14)%2===0);c.setState(state.mode==='caseclear'||state.mode==='won'?'celebrate':p.anim||'idle');c.update(dt,p.anim==='run'?game.config.speed:0);});const c=state.crook;if(c){view.crook.group.position.set(c.x,c.y+.06,1.7);view.crook.group.rotation.y=c.dir<0?Math.PI:0;view.crook.setState(state.mode==='caseclear'||state.mode==='won'?'idle':'run');view.crook.update(dt,4.2);}
 state.hazards.forEach((h,i)=>{let g=view.hazards[i];g.position.set(h.x,h.kind==='plane'?h.y:h.floor*5+.06,1.7);g.rotation.y=h.dir<0?Math.PI:0;if(h.kind==='ball')g.rotation.z=-h.x*1.5;g.userData.update?.(now);});state.pickups.forEach((p,i)=>{const g=view.pickups[i];g.visible=!p.collected;g.position.set(p.x,p.y+.12+Math.sin(now*3+p.id)*.12,1.7);g.rotation.y=Math.sin(now+p.id)*.3;});
 let riding=state.players.find(p=>p.transition?.kind==='elevator');let liftY=riding?riding.y:Math.round((state.players[0]?.floor||0))*5;mall.elevator.position.y+=(liftY-mall.elevator.position.y)*.15;
}
function updateHUD(s){$('score').textContent=String(s.score).padStart(6,'0');const clockSeconds=Math.max(0,Math.ceil(s.time));$('timer').textContent=`${Math.floor(clockSeconds/60)}:${String(clockSeconds%60).padStart(2,'0')}`;$('timer').classList.toggle('danger',s.time<20);$('case-label').textContent=`CASE ${String(s.caseIndex+1).padStart(2,'0')} / 03 · ${s.crook?.escape>0?'GETAWAY IN '+Math.max(0,Math.ceil(18-s.crook.escape))+'s':s.crook?.floor===2?'ROOFTOP RASCAL':'CATCH THE CROOK'}`;$('loot').textContent=`${s.loot} / 9`;const p=localOfficer(s);if(p){$('burst-fill').style.width=`${Math.max(0,1-p.cooldown/4.2)*100}%`;$('burst-label').textContent=p.cooldown>0?'WHISTLE BURST · RECHARGING':'WHISTLE BURST · READY';let c=bridge.isHost?game.context(game.players[p.id]):contextFromState(p);if(c&&!screen){$('context').style.display='block';$('context').innerHTML=`${glyph('interact')} ${c.label}${c.kind==='elevator'&&p.floor===1?' · DOWN + USE TO DESCEND':''}`;$('touch-action').classList.add('available');$('touch-action').textContent=c.label;}else{$('context').style.display='none';$('touch-action').classList.remove('available');}}
 if(s.caseIndex!==caseShown){caseShown=s.caseIndex;if(!game.attract)announce();}if(['caseclear','won','lost'].includes(s.mode)&&!game.attract)showResult(s);}
function contextFromState(p){if(p.transition)return null;if(Math.abs(p.x)<2)return{kind:'elevator',label:p.floor===2?'LIFT ↓':'LIFT ↑'};if((p.floor===0&&Math.abs(p.x+20)<2.7)||(p.floor===1&&(Math.abs(p.x+14)<2.7||Math.abs(p.x-14)<2.7))||(p.floor===2&&Math.abs(p.x-20)<2.7))return{kind:'escalator',label:'ESCALATOR'};return null;}
function cameraResize(){if(!camera||!renderer)return;const aspect=innerWidth/innerHeight;let width=56,height=width/aspect;if(aspect<1){height=29;width=height*aspect;}camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function animate(ms){requestAnimationFrame(animate);if(!ready)return;now=ms*.001;let dt=Math.min(.06,(ms-lastFrame)/1000||1/60);lastFrame=ms;frame++;const pads=pollPads(dt),inputs=getInputs(pads);audio.update(dt);
 if(!bridge.active&&bridge.transport==='solo'&&!bridge.connected&&screen==='title'&&ms-lastActivity>10000){startGame(false,true);attractReturn=ms+60000;}
 if(game.attract&&ms>attractReturn){game.start({attract:true});attractReturn=ms+60000;}
 if(game.attract&&game.mode==='caseclear'){game.phaseTime+=dt;if(game.phaseTime>2.8){if(game.caseIndex===2){game.start({attract:true});}else game.nextCase();}}
 if(bridge.isHost){if(!bridge.active||bridge.canPlay()){accum+=dt;let simInputs=game.attract?game.players.map(p=>game.aiInput(p)):netInputs(inputs);if(screen&&!game.attract&&(bridge.active||bridge.connected))simInputs=simInputs.map((v,i)=>!bridge.server&&i===seatIndex(bridge.me)?{}:v);while(accum>=1/60){if(game.mode==='playing')game.update(1/60,simInputs);pressedKeys.clear();touchHop=false;touchUse=false;accum-=1/60;}renderState=game.snapshot();if(bridge.connected)bridge.sendState(renderState);}}else{if(!screen)bridge.sendInput(inputs[0]);else bridge.sendInput({});pressedKeys.clear();touchHop=false;touchUse=false;if(networkState)renderState=networkState;}
 if(renderState){syncView(renderState,dt);if(game.mode!=='title'||bridge.active||bridge.connected)updateHUD(renderState);}
 mall.update(now);for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.t-=dt;p.vy-=14*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.rotation.z+=dt*4;if(p.t<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
 let targetX=0,targetY=7.6;if(innerWidth/innerHeight<1){const lead=localOfficer();targetX=lead?.x||0;targetY=(lead?.y||0)+6;}if(screen==='title'){targetX=6.6;targetY=7.8;}shakeTime=Math.max(0,shakeTime-dt);camera.position.x+=(targetX-camera.position.x)*.06;camera.position.y=targetY+7;camera.position.z=43;camera.lookAt(camera.position.x,targetY,0);if(shakeTime){camera.position.x+=(Math.random()-.5)*shakeTime*.7;camera.position.y+=(Math.random()-.5)*shakeTime*.7;}if(!bridge.server)renderer.render(scene,camera);
 if(ms>toastUntil)$('toast').classList.remove('show');if(ms>announceUntil)$('announcement').style.display='none';$('attract-label').style.display=game.attract?'block':'none';
}
async function init(){try{$('loading-text').textContent='Fitting the physics into the freight lift…';await RAPIER.init();game=new ChaseGame(RAPIER,{onEvent});scene=new THREE.Scene();scene.background=new THREE.Color(0xf0dfb9);scene.fog=new THREE.Fog(0xf0dfb9,70,125);camera=new THREE.OrthographicCamera(-28,28,16,-16,.1,160);camera.position.set(6.6,14.8,43);camera.lookAt(6.6,7.8,0);
 renderer=new THREE.WebGPURenderer({canvas:$('canvas'),antialias:true,alpha:false,powerPreference:'high-performance',forceWebGL:new URLSearchParams(location.search).has('webgl')});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;await renderer.init();$('loading-text').textContent='Opening the shutters. Please mind the crook.';
 scene.add(new THREE.HemisphereLight(0xfff6df,0x7b9189,2.5));const sun=new THREE.DirectionalLight(0xffe7b2,3);sun.position.set(-16,30,28);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:25,bottom:-20,near:1,far:95});sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;scene.add(sun);const fill=new THREE.DirectionalLight(0xa3d5db,1.2);fill.position.set(23,14,-5);scene.add(fill);
 mall=createMall(scene);cameraResize();refreshPrompts();fillSettings();
 bridge=new HubBridge({onStart:()=>{game.attract=false;if(!bridge.isHost)game.mode='remote';mapSeats();history=[];hostWaiting=true;if(bridge.isHost)startGame(bridge.players.length>1);else setScreen('');},onInput:(input,seat)=>remoteInputs.set(seat,{input,at:performance.now()}),onState:s=>{game.attract=false;const previous=networkState?.mode;networkState=s;if(s.mode==='playing'&&['caseclear','won','lost'].includes(previous)&&screen==='result'){resultsShown='';setScreen('');}if(screen==='title'||screen==='partners'||screen==='online'||screen==='tabs')setScreen('');},onJoin:info=>{game.attract=false;if(!info.isHost)game.mode='remote';mapSeats();history=[];toast('PARTNER ON THE BEAT!');if(info.isHost)startGame(true);else{setScreen('');$('hud').classList.add('show');}updateNetworkBadge();},onStatus:()=>updateNetworkBadge(),onLeave:({id})=>{remoteInputs.delete(id);if(bridge.isHost)game.deactivatePlayer(seatIndex(id));toast('PARTNER LEFT THE BEAT',4);},onTimeUp:()=>{if(bridge.isHost){game.mode='lost';finishRound(false);}},onEnd:()=>{game.mode='ended';keys.clear();remoteInputs.clear();audio.setMuted(true);audio.setScene('pause');toast('SHIFT FINISHED · RESULTS IN THE HUB',20);},onFinished:()=>{},onError:message=>toast(message,6)});
 await bridge.connect();mapSeats();ready=true;game.start();game.mode='title';syncView(game.snapshot());if(bridge.active){setScreen('');$('loading-text').textContent='Waiting for the Hub roll call…';game.mode='waiting';bridge.ready();toast('READY FOR ROLL CALL',5);}else showTitle();$('loading').style.display='none';requestAnimationFrame(animate);
 window.__game={get state(){return renderState||game.snapshot();},get mode(){return game.mode;},get screen(){return screen;},get renderer(){return {deviceLost:renderer._isDeviceLost,drawCalls:renderer.info.render.drawCalls,triangles:renderer.info.render.triangles,type:renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL fallback',three:THREE.REVISION,rapier:RAPIER.version(),frames:frame};},get network(){return bridge.inspect();},game,start:(coop=false)=>startGame(coop),pause:pauseGame,resume:resumeGame,action:act,attract:()=>{startGame(false,true);attractReturn=performance.now()+60000;},audio,async audioTest(){return audioSelfTest();},step:(count,input)=>{for(let i=0;i<count;i++)game.update(1/60,[input||{}]);renderState=game.snapshot();syncView(renderState);return renderState;},teleport:(floor,x,id=0)=>game.teleport(id,floor,x),capture:()=>game.catchCrook(),get credits(){return CREDITS;},bridge};
 }catch(error){console.error(error);$('loading-text').textContent=`The mall could not open: ${error.message}. Check your internet connection for the pinned Three.js and Rapier dependencies, then reload.`;document.querySelector('.loader-track').style.display='none';const retry=document.createElement('button');retry.className='button primary spaced';retry.textContent='TRY THE SHUTTERS AGAIN';retry.onclick=()=>location.reload();document.querySelector('#loading .panel').appendChild(retry);bridge?.fail(error.message);}}
function updateNetworkBadge(){if(!bridge)return;const el=$('network-badge');if(bridge.active||bridge.transport!=='solo'){el.style.display='block';el.textContent=`${bridge.active?'AI HUB':bridge.transport.toUpperCase()} · ${bridge.connected?'PARTNER LINK':'WAITING'}`;}else el.style.display='none';}
window.addEventListener('resize',cameraResize);window.addEventListener('beforeunload',()=>bridge?.disconnect());init();
