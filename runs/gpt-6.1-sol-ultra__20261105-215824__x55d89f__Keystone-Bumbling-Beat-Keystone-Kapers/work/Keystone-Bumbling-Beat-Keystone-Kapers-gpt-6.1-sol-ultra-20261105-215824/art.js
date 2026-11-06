import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { normalWorld, vec3, color as nodeColor, float, step } from 'three/tsl';

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

export function createMall(scene) {
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
export function createCharacter(scene, { color = P.blue, kind = 'cop', accent = P.yellow } = {}) {
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

export function createHazard(kind = 'ball') {
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

export function createPickup(kind = 'bag') {
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

export const palette = P;
