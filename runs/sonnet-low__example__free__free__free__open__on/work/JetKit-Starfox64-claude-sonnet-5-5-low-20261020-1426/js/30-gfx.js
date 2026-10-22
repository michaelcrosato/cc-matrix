// ---------- rendering: scene, procedural models, particles, themed scenery ----------
const GFX = {};
(() => {
  const T = THREE;
  const renderer = new T.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(65, 1, .3, 1800);
  scene.add(camera);
  const hemi = new T.HemisphereLight(0xbfdcff, 0x203040, .8); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff0d0, 2.2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 400; sun.shadow.bias = -.0005;
  scene.add(sun); scene.add(sun.target);
  const flashLights = []; for (let i = 0; i < 3; i++) { const l = new T.PointLight(0xffa040, 0, 60, 2); l.userData.life = 0; scene.add(l); flashLights.push(l); }
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  Object.assign(GFX, { renderer, scene, camera, hemi, sun, T });

  // ---- materials & helpers
  const mat = (c, e = 0, m = .5, r = .45) => new T.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: e ? 1 : 0, metalness: m, roughness: r });
  const glowMat = (c, o = 1) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false });
  GFX.glowMat = glowMat;
  const prism = (pts, depth) => { const s = new T.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; };
  const add = (parent, geo, m, x = 0, y = 0, z = 0, shadow = true) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o; };
  const flameTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  const sprite = (color, size, op = 1) => { const s = new T.Sprite(new T.SpriteMaterial({ map: flameTex, color, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: op })); s.scale.set(size, size, 1); return s; };
  GFX.sprite = sprite;

  // ---- models (forward is -Z)
  const wingGeo = prism([[.3, 1.2], [3.6, -1.1], [3.6, -1.7], [.3, -1.3]], .12), flapGeo = prism([[3.0, -0.8], [3.6, -1.1], [3.6, -1.7], [2.7, -1.5]], .14), finGeo = (() => { const sh = new T.Shape(); [[0, 0], [1.8, 0], [.7, 1.5], [0, 1.5]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); const gg = new T.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: false }); gg.translate(0, 0, -.06); gg.rotateY(Math.PI / 2); return gg; })();
  GFX.ship = (body = 0xdfe8f5, accent = 0x2a6ad8, glow = 0x55c8ff) => {
    const g = new T.Group(), bm = mat(body, 0, .7, .3), am = mat(accent, 0, .5, .4);
    const nose = add(g, new T.ConeGeometry(.55, 3.2, 12), bm, 0, 0, -1.4); nose.rotation.x = -Math.PI / 2;
    const hull = add(g, new T.CylinderGeometry(.55, .7, 2.4, 12), bm, 0, 0, 1.0); hull.rotation.x = Math.PI / 2;
    const canopy = add(g, new T.SphereGeometry(.5, 14, 10), new T.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x1166aa, emissiveIntensity: .6, metalness: 1, roughness: .05 }), 0, .45, -.2); canopy.scale.set(.9, .8, 1.8);
    const wings = [];
    for (const s of [1, -1]) {
      const w = new T.Group(); w.position.set(0, -.1, .4); w.scale.x = s;
      add(w, wingGeo, am, 0, -.05, 0); const fl = add(w, flapGeo, bm, 0, -.07, 0); wings.push(w); g.add(w);
      const tip = sprite(s > 0 ? 0xff4040 : 0x40ff70, .7); tip.position.set(3.55, 0, 0); w.add(tip);
      const cannon = add(w, new T.CylinderGeometry(.09, .09, 2.2, 8), mat(0x333a48, 0, .9, .3), 3.3, .05, -.9); cannon.rotation.x = Math.PI / 2;
    }
    add(g, finGeo, am, 0, .3, 2.6);
    const glows = []; for (const x of [-.5, .5]) { const e = sprite(glow, 1.7); e.position.set(x, 0, 2.4); g.add(e); glows.push(e); const n = add(g, new T.CylinderGeometry(.28, .35, .6, 10), mat(0x222a38, 0, 1, .2), x, 0, 2.2); n.rotation.x = Math.PI / 2; }
    g.userData = { wings, glows }; return g;
  };
  GFX.drone = () => { const g = new T.Group(); const core = add(g, new T.OctahedronGeometry(1.1, 0), mat(0x38203c, 0xff2a2a, .6, .3)); core.scale.z = 1.5;
    for (const s of [1, -1]) { const b = add(g, new T.BoxGeometry(2.2, .12, 1.4), mat(0x6a2030, 0, .8, .3), s * 1.9, 0, 0); b.rotation.z = s * .25; }
    const eye = sprite(0xff3030, 1.6); eye.position.z = -1.2; g.add(eye); return g; };
  GFX.swoop = () => { const g = new T.Group(); const b = add(g, new T.ConeGeometry(.7, 3.5, 8), mat(0x1d2a48, 0x3a8aff, .7, .3), 0, 0, 0); b.rotation.x = -Math.PI / 2;
    for (const s of [1, -1]) { const w = add(g, prism([[0, .8], [2.2, -1.2], [0, -1]], .08), mat(0x2a3d66, 0, .8, .3), 0, 0, 0); w.scale.x = s; }
    const e = sprite(0x44aaff, 1.8); e.position.z = 1.9; g.add(e); return g; };
  GFX.turret = () => { const g = new T.Group(); add(g, new T.CylinderGeometry(2, 2.6, 1.6, 10), mat(0x394150, 0, .8, .4), 0, .8, 0);
    const head = new T.Group(); head.position.y = 2; g.add(head); add(head, new T.SphereGeometry(1.5, 12, 8), mat(0x5a2a2a, 0xaa1010, .6, .4)); const bar = add(head, new T.CylinderGeometry(.25, .3, 3, 8), mat(0x202020, 0, 1, .3), 0, 0, -1.6); bar.rotation.x = Math.PI / 2; g.userData.head = head; return g; };
  GFX.cruiser = () => { const g = new T.Group(); add(g, new T.BoxGeometry(9, 3, 24), mat(0x4a5a72, 0, .8, .4), 0, 0, 0);
    add(g, new T.BoxGeometry(5, 3, 8), mat(0x3a4860, 0, .8, .4), 0, 2.6, 4); add(g, new T.BoxGeometry(2.4, 2.4, 4), mat(0x222c40, 0x55aaff, .7, .3), 0, 5, 5);
    for (const s of [-1, 1]) for (const z of [-7, 0, 7]) { const t = add(g, new T.SphereGeometry(1.1, 10, 8), mat(0x802020, 0xff2020, .5, .4), s * 4.6, 1, z); }
    for (const s of [-1, 1]) { const e = sprite(0xff8040, 5); e.position.set(s * 2.5, 0, 12.6); g.add(e); } return g; };
  GFX.walker = () => { const g = new T.Group(); const body = add(g, new T.SphereGeometry(5, 20, 14), mat(0x3a3f55, 0, .85, .3)); body.scale.set(1.4, .9, 1.2);
    const core = add(g, new T.IcosahedronGeometry(2.6, 1), mat(0x401010, 0xff3a1a, .4, .3), 0, 0, -3.8); g.userData.core = core;
    const plates = []; for (const s of [-1, 1]) { const p = add(g, new T.BoxGeometry(5, 7, .6), mat(0x6d758c, 0, .9, .25), s * 3, 0, -3.4); p.rotation.y = s * .5; plates.push(p); }
    g.userData.plates = plates; g.userData.legs = [];
    for (let i = 0; i < 4; i++) { const l = new T.Group(); const a = i < 2 ? -1 : 1, s = i % 2 ? 1 : -1; l.position.set(s * 5.5, -1, a * 3); const up = add(l, new T.CylinderGeometry(.5, .7, 8, 8), mat(0x555d75, 0, .8, .4), s * 2, -3, 0); up.rotation.z = s * .5; const lo = add(l, new T.CylinderGeometry(.35, .5, 9, 8), mat(0x444c62, 0, .8, .4), s * 5, -9, 0); lo.rotation.z = -s * .25; g.add(l); g.userData.legs.push(l); }
    const ring = add(g, new T.TorusGeometry(7, .35, 8, 40), glowMat(0xff5a2a, .8)); ring.rotation.x = Math.PI / 2; g.userData.ring = ring; return g; };
  GFX.relay = () => { const g = new T.Group(); const c = add(g, new T.IcosahedronGeometry(3, 1), mat(0x303a55, 0x2266ff, .6, .3)); const r = add(g, new T.TorusGeometry(5.5, .35, 8, 32), mat(0x889ac8, 0x4466aa, .8, .3)); const r2 = add(g, new T.TorusGeometry(5.5, .35, 8, 32), mat(0x889ac8, 0x4466aa, .8, .3)); r2.rotation.x = Math.PI / 2; g.userData.rings = [r, r2]; return g; };
  GFX.pickup = (kind) => { const g = new T.Group(); const col = { ring: 0x66ffb0, bomb: 0xffb040, up: 0xc070ff, life: 0xff6aa0 }[kind];
    if (kind === 'ring') { const r = add(g, new T.TorusGeometry(2.6, .45, 10, 28), mat(0x40ffa0, 0x20c070, .4, .3)); r.rotation.x = 0; const r2 = add(g, new T.TorusGeometry(2.6, .2, 8, 28), glowMat(0xaaffd0, .6)); }
    else { const m = add(g, kind === 'bomb' ? new T.SphereGeometry(1.4, 14, 10) : new T.OctahedronGeometry(1.7), mat(col, col, .4, .3)); add(g, new T.TorusGeometry(2.4, .12, 6, 24), glowMat(col, .8)); }
    const s = sprite(col, 7, .6); g.add(s); return g; };
  GFX.asteroid = (r) => { const m = new T.Mesh(new T.DodecahedronGeometry(r, 1), mat(0x6c6258, 0, .2, .9)); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * .18; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } m.geometry.computeVertexNormals(); m.castShadow = m.receiveShadow = true; return m; };

  // ---- sky, stars, ground
  const skyMat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new T.Color(0x102050) }, mid: { value: new T.Color(0xff8a50) }, bot: { value: new T.Color(0x203060) } },
    vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 v;uniform vec3 top,mid,bot;void main(){float h=v.y;vec3 c=h>0.?mix(mid,top,pow(clamp(h,0.,1.),.55)):mix(mid,bot,clamp(-h*2.,0.,1.));gl_FragColor=vec4(c,1.);}' });
  const sky = new T.Mesh(new T.SphereGeometry(1200, 24, 16), skyMat); sky.renderOrder = -2; scene.add(sky);
  const starGeo = new T.BufferGeometry(), sp = new Float32Array(1800 * 3); for (let i = 0; i < 1800; i++) { const a = rnd(6.28), b = Math.acos(rnd(-1, 1)), r = 1100; sp[i * 3] = r * Math.sin(b) * Math.cos(a); sp[i * 3 + 1] = r * Math.cos(b); sp[i * 3 + 2] = r * Math.sin(b) * Math.sin(a); }
  starGeo.setAttribute('position', new T.BufferAttribute(sp, 3)); const stars = new T.Points(starGeo, new T.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, fog: false, transparent: true })); scene.add(stars);
  const sunDisc = sprite(0xffd090, 300, .9); sunDisc.material.fog = false; scene.add(sunDisc);
  const planet = new T.Mesh(new T.SphereGeometry(160, 32, 24), new T.MeshBasicMaterial({ color: 0x6a4a9a, fog: false })); scene.add(planet);
  const canvasTex = (w, h, fn, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; };
  const seaTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#0d3a66'; x.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { x.strokeStyle = `rgba(${120 + rnd(100) | 0},${200 + rnd(55) | 0},255,${rnd(.05, .25)})`; x.lineWidth = rnd(1, 3); const a = rnd(w), b = rnd(h); x.beginPath(); x.moveTo(a, b); x.lineTo(a + rnd(10, 40), b + rnd(-3, 3)); x.stroke(); } x.strokeStyle = 'rgba(255,255,255,.18)'; x.strokeRect(0, 0, w, h); }, [40, 40]);
  const lavaTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#1a0f10'; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(255,${80 + rnd(100) | 0},20,${rnd(.4, .9)})`; x.lineWidth = rnd(2, 6); x.beginPath(); let a = rnd(w), b = rnd(h); x.moveTo(a, b); for (let k = 0; k < 4; k++) { a += rnd(-40, 40); b += rnd(-40, 40); x.lineTo(a, b); } x.stroke(); } }, [30, 30]);
  const ground = new T.Mesh(new T.PlaneGeometry(1400, 1400), new T.MeshStandardMaterial({ map: seaTex, roughness: .35, metalness: .3, color: 0xffffff })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const winTex = canvasTex(64, 128, (x, w, h) => { x.fillStyle = '#243247'; x.fillRect(0, 0, w, h); for (let j = 0; j < 16; j++) for (let i = 0; i < 6; i++) { x.fillStyle = Math.random() < .55 ? '#ffd890' : '#18202e'; x.fillRect(4 + i * 10, 3 + j * 8, 6, 4); } }, [1, 1]);

  // ---- themes
  const THEMES = {
    coast: { mode: 'rail', sky: [0x1a3a7a, 0xff9060, 0x1a3060], fog: [0xf0a070, 40, 520], hemi: [0xbfdcff, 0x305070, .9], sun: [0xffe0b0, 2.4], sunPos: [0, 90, -1], ground: seaTex, groundY: -14, planet: [0x8a6aa8, -520, 190, -900], stars: .0 },
    canyon: { mode: 'rail', sky: [0x120820, 0x701810, 0x301008], fog: [0x4a1810, 30, 380], hemi: [0xff9a60, 0x401810, .7], sun: [0xffa070, 2.0], ground: lavaTex, groundY: -18, planet: [0xc04820, 380, 250, -900], stars: .5 },
    nebula: { mode: 'free', sky: [0x04040e, 0x2a1050, 0x080418], fog: [0x120a28, 200, 1500], hemi: [0x8a80ff, 0x201030, .8], sun: [0xc8d0ff, 2.0], ground: null, planet: [0x3a6ac8, -600, 260, -900], stars: 1 }
  };
  GFX.themes = THEMES;
  let scen = [], extra = [], theme = null, tName = '', scenSpan = 0;
  GFX.theme = () => theme;
  GFX.clearScene = () => { for (const o of scen.concat(extra)) scene.remove(o); scen = []; extra = []; };
  GFX.addExtra = o => { scene.add(o); extra.push(o); return o; };
  GFX.removeExtra = o => { scene.remove(o); const i = extra.indexOf(o); if (i >= 0) extra.splice(i, 1); };
  GFX.setTheme = name => {
    tName = name; theme = THEMES[name]; GFX.clearScene();
    skyMat.uniforms.top.value.set(theme.sky[0]); skyMat.uniforms.mid.value.set(theme.sky[1]); skyMat.uniforms.bot.value.set(theme.sky[2]);
    scene.fog = new T.Fog(theme.fog[0], theme.fog[1], theme.fog[2]); hemi.color.set(theme.hemi[0]); hemi.groundColor.set(theme.hemi[1]); hemi.intensity = theme.hemi[2];
    sun.color.set(theme.sun[0]); sun.intensity = theme.sun[1]; stars.material.opacity = theme.stars; stars.visible = theme.stars > 0;
    planet.material.color.set(theme.planet[0]); planet.userData.off = theme.planet.slice(1);
    ground.visible = !!theme.ground; if (theme.ground) { ground.material.map = theme.ground; ground.material.needsUpdate = true; ground.position.y = theme.groundY; }
    sunDisc.material.color.set(theme.sun[0]);
    // scenery pools
    if (name === 'coast') {
      scenSpan = 1200; for (let i = 0; i < 70; i++) { const tower = i % 3 !== 2, h = tower ? rnd(30, 90) : rnd(25, 60), m = tower ? new T.Mesh(new T.BoxGeometry(rnd(8, 16), h, rnd(8, 16)), new T.MeshStandardMaterial({ map: winTex, emissiveMap: winTex, emissive: 0xffffff, emissiveIntensity: .35, roughness: .5, metalness: .4 })) : new T.Mesh(new T.ConeGeometry(rnd(8, 16), h, 6), mat(0x5a5060, 0, .1, .9));
        m.castShadow = m.receiveShadow = true; m.userData = { h, slot: -i * (scenSpan / 70), side: i % 2 ? 1 : -1, tower }; m.position.set(m.userData.side * rnd(32, 120), theme.groundY + h / 2 - 2, m.userData.slot); scene.add(m); scen.push(m); }
    } else if (name === 'canyon') {
      scenSpan = 30 * 24; for (let i = 0; i < 24; i++) for (const s of [-1, 1]) { const h = rnd(50, 110), w = rnd(14, 24), m = new T.Mesh(new T.BoxGeometry(w, h, 34), new T.MeshStandardMaterial({ color: new T.Color().setHSL(.03 + rnd(.02), .5, rnd(.12, .2)), roughness: .95, metalness: 0, emissive: 0x401008, emissiveIntensity: .2 }));
        m.castShadow = m.receiveShadow = true; m.userData = { slot: -i * 30, side: s, w, h, wall: true }; m.position.set(s * (26 + w / 2 + rnd(0, 2)), theme.groundY + h / 2 - 2, m.userData.slot); m.rotation.y = rnd(-.04, .04); scene.add(m); scen.push(m); }
      for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.ConeGeometry(rnd(3, 6), rnd(18, 40), 5), mat(0x2a1a18, 0x300800, 0, .9)); m.rotation.x = Math.PI; m.userData = { slot: -i * 50, side: i % 2 ? 1 : -1, stal: true }; m.position.set(m.userData.side * rnd(16, 24), 28, m.userData.slot); scene.add(m); scen.push(m); }
    } else if (name === 'nebula') {
      for (let i = 0; i < 26; i++) { const n = sprite(rpick([0xff40a0, 0x4060ff, 0x8040ff, 0x40c0ff]), rnd(500, 900), .22); n.position.set(rnd(-700, 700), rnd(-250, 250), rnd(-700, 700)); n.userData.far = true; scene.add(n); scen.push(n); }
    }
  };
  const SPAN = () => scenSpan;
  GFX.updateScenery = (camX, camY, camZ, t) => {
    sky.position.set(camX, camY, camZ); stars.position.copy(sky.position); stars.rotation.y = t * .002;
    const po = planet.userData.off || [0, 0, 0]; planet.position.set(camX + po[0], camY + po[1], camZ + po[2]);
    sunDisc.position.set(camX - 200, camY + 200, camZ - 900);
    if (theme.mode === 'rail') {
      ground.position.set(0, theme.groundY, camZ); ground.material.map.offset.set(0, -camZ / (1400 / ground.material.map.repeat.x));
      for (const m of scen) { const d = m.userData; if (m.position.z > camZ + 45) { d.slot -= scenSpan; m.position.z = d.slot;
        if (tName === 'coast') m.position.x = d.side * rnd(32, 120); else if (d.wall) m.position.x = d.side * (26 + d.w / 2 + rnd(0, 2)); } }
      sun.position.set(camX + 60, 110, camZ + 50); sun.target.position.set(camX, 0, camZ - 20);
    } else {
      sun.position.set(camX + 90, camY + 120, camZ + 60); sun.target.position.set(camX, camY, camZ);
    }
    sun.target.updateMatrixWorld();
  };

  // ---- particles (single additive Points object)
  const NP = 5000, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pSize = new Float32Array(NP), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP), pMax = new Float32Array(NP), pDrag = new Float32Array(NP), pBase = new Float32Array(NP), pc0 = new Float32Array(NP * 3);
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pPos, 3)); pg.setAttribute('color', new T.BufferAttribute(pCol, 3)); pg.setAttribute('size', new T.BufferAttribute(pSize, 1));
  const pm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true,
    vertexShader: 'attribute float size;varying vec3 c;void main(){c=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*420./-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying vec3 c;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d);gl_FragColor=vec4(c*a,a);}' });
  const pts = new T.Points(pg, pm); pts.frustumCulled = false; scene.add(pts); let pi = 0;
  const _c = new T.Color();
  GFX.spark = (x, y, z, vx, vy, vz, color, size, life, drag = 1) => {
    const i = pi = (pi + 1) % NP; pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
    _c.set(color); pc0[i * 3] = _c.r; pc0[i * 3 + 1] = _c.g; pc0[i * 3 + 2] = _c.b; pBase[i] = size; pLife[i] = pMax[i] = life; pDrag[i] = drag;
  };
  GFX.burst = (p, color, n, speed, size, life, base) => { for (let i = 0; i < n; i++) { const a = rnd(6.28), b = Math.acos(rnd(-1, 1)), s = rnd(.2, 1) * speed; GFX.spark(p.x, p.y, p.z, Math.sin(b) * Math.cos(a) * s + (base ? base.x : 0), Math.cos(b) * s + (base ? base.y : 0), Math.sin(b) * Math.sin(a) * s + (base ? base.z : 0), color, size * rnd(.5, 1.2), life * rnd(.5, 1), 1.5); } };
  const flashes = [], flashGeo = new T.SphereGeometry(1, 16, 12), ringGeo = new T.RingGeometry(.8, 1, 32);
  GFX.explode = (p, size = 1, base = null) => {
    GFX.burst(p, 0xffa030, 40 * size | 0, 28 * size, 2.4 * size, .9, base); GFX.burst(p, 0xff4010, 25 * size | 0, 18 * size, 3 * size, 1.2, base); GFX.burst(p, 0xfff0c0, 14 * size | 0, 40 * size, 1.2 * size, .5, base);
    const f = new T.Mesh(flashGeo, glowMat(0xffd080, 1)); f.position.copy(p); f.userData = { t: 0, max: .45, s: 3 * size, ring: false }; scene.add(f); flashes.push(f);
    const r = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xffc080, transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); r.position.copy(p); r.lookAt(camera.position); r.userData = { t: 0, max: .6, s: 9 * size, ring: true }; scene.add(r); flashes.push(r);
    const l = flashLights.find(l => l.userData.life <= 0) || flashLights[0]; l.position.copy(p); l.intensity = 60 * size; l.userData.life = .3;
  };
  GFX.updateFX = dt => {
    for (let i = 0; i < NP; i++) {
      if (pLife[i] <= 0) { pSize[i] = 0; continue; }
      pLife[i] -= dt; const k = Math.max(pLife[i], 0) / pMax[i], d = Math.exp(-pDrag[i] * dt);
      pVel[i * 3] *= d; pVel[i * 3 + 1] *= d; pVel[i * 3 + 2] *= d;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      pSize[i] = pBase[i] * (.3 + k); const f = k * k; pCol[i * 3] = pc0[i * 3] * f; pCol[i * 3 + 1] = pc0[i * 3 + 1] * f * (.4 + k * .6); pCol[i * 3 + 2] = pc0[i * 3 + 2] * f * k;
    }
    pg.attributes.position.needsUpdate = pg.attributes.color.needsUpdate = pg.attributes.size.needsUpdate = true;
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i], d = f.userData; d.t += dt; const k = d.t / d.max; f.scale.setScalar(d.s * (d.ring ? .3 + k : .4 + k * .8)); f.material.opacity = Math.max(0, 1 - k); if (k >= 1) { scene.remove(f); f.material.dispose(); flashes.splice(i, 1); } }
    for (const l of flashLights) { if (l.userData.life > 0) { l.userData.life -= dt; l.intensity *= Math.exp(-9 * dt); } else l.intensity = 0; }
  };
  // laser bolts
  const boltGeo = new T.BoxGeometry(.18, .18, 4); boltGeo.translate(0, 0, 0);
  const boltMats = {}; GFX.bolt = (color, len = 1, w = 1) => { const m = boltMats[color] || (boltMats[color] = glowMat(color, .95)); const b = new T.Mesh(boltGeo, m); b.scale.set(w, w, len); scene.add(b); return b; };
  GFX.orb = (color, s = 1) => { const g = new T.Group(); const m = new T.Mesh(flashGeo, glowMat(color, 1)); m.scale.setScalar(.55 * s); g.add(m); const sp2 = sprite(color, 3.2 * s, .8); g.add(sp2); scene.add(g); return g; };
  GFX.dispose = o => { scene.remove(o); };
  GFX.render = () => renderer.render(scene, camera);
})();
