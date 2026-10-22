// ===== 11_stages.js — data-driven stage definitions (rails, events, environments) =====
// Event vocabulary (interpreted by Game.runEvent):
//  radio{who,text,prio}  hint{id,text}  toast{text}  music{track}  speed{value}
//  wave{kind,pattern,count,delay,params,offsets}  darts{count}  turrets{ahead,xs}  tanks{ahead,count,side}
//  mines{ahead,count}  ring{kind,ahead,x,y}  rings{kind,ahead,n,spacing,x,y}  crate{drop,ahead,x,y}
//  trouble{who}  checkpoint{ahead}  roofTurrets{from,to}  boss{type}  fork{}
const circlePts = (cx, cy, cz, r, n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [cx + r * Math.cos(a), cy, cz - r * Math.sin(a)]; });

const STAGES = {
  // ------------------------------------------------------------------ STAGE 1
  corvanis: {
    id: 'corvanis', name: 'CORVANIS', subtitle: 'Capital Defence', mode: 'rails', number: 1,
    music: 'stage1', medalHits: 110, next: 'zeta',
    sunDir: V3(0.4, 0.75, 0.35), fog: [0xbfe0ff, 500, 2600], gravity: -22,
    start: 'approach',
    rails: {
      approach: {
        profile: 'open', next: 'city',
        points: [[0, 40, 200], [0, 36, -400], [40, 32, -1000], [-20, 30, -1600], [-60, 32, -2200], [-20, 34, -2700], [0, 36, -3000]],
        events: [
          { at: 20, type: 'radio', who: 'hq', text: 'Stark Fox team, Emperor Croak\'s armada has Corvanis under siege. Clear a path to the capital!' },
          { at: 90, type: 'radio', who: 'vix', text: 'Copy, General. Team — form up and follow my lead!' },
          { at: 120, type: 'hint', id: 'steer', text: '{steer} Steer the Arwing — hold {fire} or {rapid} to fire' },
          { at: 220, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 5, delay: 0.22, params: { x0: 0, x1: 0, y0: 6, y1: 4, T: 4.2 }, offsets: [[0, 0], [-8, 3], [8, 3], [-16, 6], [16, 6]] },
          { at: 420, type: 'wave', kind: 'fighter', pattern: 'cross', count: 4, delay: 0.35, params: { x0: -110, x1: 110, y0: 8, T: 4.5, dz: 140 } },
          { at: 560, type: 'radio', who: 'kestrel', text: 'More bogeys at twelve o\'clock. Try to keep up, Vix.' },
          { at: 600, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 5, delay: 0.25, params: { x0: 60, x1: -30, y0: 14, y1: -2, arcX: -20, T: 4.4 } },
          { at: 720, type: 'crate', drop: 'laser', ahead: 260, x: 0, y: 2 },
          { at: 760, type: 'ring', kind: 'silver', ahead: 300, x: 12, y: 6 },
          { at: 820, type: 'hint', id: 'charge', text: 'Hold {fire} to charge, aim the reticle at a target to LOCK ON, release to fire a homing blast' },
          { at: 900, type: 'wave', kind: 'fighter', pattern: 'corkscrew', count: 6, delay: 0.3, params: { x0: 0, y0: 6, T: 5.5 } },
          { at: 1080, type: 'turrets', ahead: 300, xs: [-30, 26, -14, 40] },
          { at: 1150, type: 'hint', id: 'boost', text: 'Hold {boost} to BOOST, {brake} to BRAKE — both drain the meter' },
          { at: 1250, type: 'radio', who: 'marlow', text: 'Enemies on your tail, Vix! Somersault to get behind them!' },
          { at: 1260, type: 'hint', id: 'flip', text: 'Press {flip} to SOMERSAULT — loop behind enemies that chase you' },
          { at: 1270, type: 'wave', kind: 'fighter', pattern: 'chase', count: 4, delay: 0.3, params: { x0: 0, x1: 0, y0: 4, y1: 10, hold: 6, dz: 80 }, offsets: [[-12, 0], [12, 0], [-4, 6], [4, -4]] },
          { at: 1480, type: 'ring', kind: 'gold', ahead: 280, x: -14, y: 10 },
          { at: 1560, type: 'wave', kind: 'gunship', pattern: 'hover', count: 1, params: { x0: 0, y0: 10, hold: 7 }, drop: 'bomb' },
          { at: 1580, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 4, delay: 0.4, params: { x0: -50, x1: 40, y0: 0, y1: 10, T: 4 } },
          { at: 1820, type: 'trouble', who: 'kestrel' },
          { at: 2020, type: 'radio', who: 'marlow', text: 'Incoming needle-darts! Barrel roll to bat their fire away!' },
          { at: 2030, type: 'hint', id: 'roll', text: 'Double-tap {rollL} or {rollR} to BARREL ROLL — deflects enemy fire. Hold to bank hard.' },
          { at: 2040, type: 'darts', count: 6 },
          { at: 2080, type: 'turrets', ahead: 320, xs: [-22, 22, 0] },
          { at: 2220, type: 'tanks', ahead: 320, count: 3, side: 1 },
          { at: 2250, type: 'crate', drop: 'bomb', ahead: 280, x: -10, y: -4 },
          { at: 2400, type: 'hint', id: 'bomb', text: 'Press {bomb} to launch a SMART BOMB — clears everything in the blast' },
          { at: 2420, type: 'wave', kind: 'fighter', pattern: 'dive', count: 6, delay: 0.2, params: { x0: -30, x1: 30, y1: -2, T: 4 } },
          { at: 2620, type: 'rings', kind: 'silver', ahead: 280, n: 3, spacing: 50, x: 0, y: 4 },
          { at: 2760, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 5, delay: 0.2, params: { x0: -40, x1: 40, y0: 12, y1: -6, T: 4 } },
        ],
      },
      city: {
        profile: 'city', next: (choose) => choose(),
        points: [[0, 36, -3000], [30, 34, -3400], [10, 32, -3900], [-30, 34, -4400], [-20, 34, -4800]],
        events: [
          { at: 10, type: 'checkpoint', ahead: 120 },
          { at: 40, type: 'radio', who: 'hq', text: 'You\'re over the capital! Watch the rooftops — they\'ve dug in turrets.' },
          { at: 120, type: 'roofTurrets', from: 300, to: 900 },
          { at: 200, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 6, delay: 0.25, params: { x0: 30, x1: -30, y0: 0, y1: 10, arcY: 10, T: 4.4 } },
          { at: 420, type: 'wave', kind: 'fighter', pattern: 'cross', count: 5, delay: 0.25, params: { x0: 120, x1: -120, y0: 14, T: 4, dz: 120 } },
          { at: 560, type: 'ring', kind: 'gold', ahead: 220, x: 0, y: 2 },
          { at: 700, type: 'trouble', who: 'tobi' },
          { at: 900, type: 'wave', kind: 'gunship', pattern: 'hover', count: 2, params: { x0: -16, y0: 8, hold: 6 }, offsets: [[0, 0], [32, 4]] },
          { at: 920, type: 'roofTurrets', from: 1000, to: 1500 },
          { at: 1050, type: 'radio', who: 'tobi', text: 'The road splits ahead! LEFT is Cascade Canyon, RIGHT is the Skyway bay!' },
          { at: 1060, type: 'hint', id: 'fork', text: 'Hold {steer} LEFT or RIGHT at the fork to choose your route' },
          { at: 1100, type: 'crate', drop: 'silver', ahead: 220, x: -14, y: 0 },
          { at: 1150, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 4, delay: 0.3, params: { x0: 0, x1: 0, y0: 18, y1: -8, T: 3.6 }, offsets: [[-10, 0], [10, 0], [-20, 0], [20, 0]] },
          { at: 1360, type: 'fork' },
        ],
      },
      canyon: {
        profile: 'canyon', next: 'plains', route: 'A',
        points: [[-20, 34, -4800], [-150, 32, -5250], [-300, 28, -5800], [-260, 30, -6400], [-80, 34, -7000]],
        events: [
          { at: 20, type: 'toast', text: 'ROUTE A — CASCADE CANYON' },
          { at: 60, type: 'radio', who: 'marlow', text: 'Tight squeeze. Mind the walls, Vix — and stay off the river!' },
          { at: 150, type: 'rings', kind: 'gold', ahead: 260, n: 1, spacing: 0, x: 0, y: -6 },
          { at: 250, type: 'mines', ahead: 300, count: 7 },
          { at: 420, type: 'turrets', ahead: 300, xs: [-30, 30, -30, 30] },
          { at: 600, type: 'wave', kind: 'fighter', pattern: 'chase', count: 4, delay: 0.3, params: { x0: 0, x1: 0, y0: 4, y1: 8, hold: 5 }, offsets: [[-10, 0], [10, 0], [-3, 6], [3, -4]] },
          { at: 760, type: 'trouble', who: 'marlow' },
          { at: 900, type: 'crate', drop: 'laser', ahead: 260, x: 0, y: 4 },
          { at: 980, type: 'rings', kind: 'gold', ahead: 280, n: 1, spacing: 0, x: 10, y: 12 },
          { at: 1100, type: 'darts', count: 7 },
          { at: 1300, type: 'wave', kind: 'fighter', pattern: 'corkscrew', count: 8, delay: 0.25, params: { x0: 0, y0: 4, T: 5 } },
          { at: 1500, type: 'mines', ahead: 300, count: 6 },
          { at: 1650, type: 'rings', kind: 'gold', ahead: 260, n: 1, spacing: 0, x: -8, y: 0 },
          { at: 1800, type: 'wave', kind: 'gunship', pattern: 'hover', count: 1, params: { x0: 0, y0: 6, hold: 6 }, drop: 'wing' },
        ],
      },
      skyway: {
        profile: 'ocean', next: 'plains', route: 'B',
        points: [[-20, 34, -4800], [120, 44, -5250], [240, 50, -5800], [200, 46, -6400], [-80, 34, -7000]],
        events: [
          { at: 20, type: 'toast', text: 'ROUTE B — SKYWAY BAY' },
          { at: 60, type: 'radio', who: 'kestrel', text: 'Open water and big targets. My kind of route.' },
          { at: 160, type: 'wave', kind: 'gunship', pattern: 'hover', count: 2, params: { x0: -18, y0: 6, hold: 6 }, offsets: [[0, 0], [36, 8]] },
          { at: 300, type: 'wave', kind: 'fighter', pattern: 'cross', count: 6, delay: 0.2, params: { x0: -120, x1: 120, y0: 6, T: 4.2, dz: 150 } },
          { at: 480, type: 'ring', kind: 'silver', ahead: 260, x: 0, y: 0 },
          { at: 560, type: 'trouble', who: 'marlow' },
          { at: 760, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 8, delay: 0.18, params: { x0: -40, x1: 40, y0: 20, y1: -10, T: 4 } },
          { at: 900, type: 'crate', drop: 'laser', ahead: 260, x: 10, y: 6 },
          { at: 1050, type: 'wave', kind: 'gunship', pattern: 'hover', count: 3, params: { x0: -24, y0: 4, hold: 6 }, offsets: [[0, 0], [24, 8], [48, 0]] },
          { at: 1250, type: 'darts', count: 6 },
          { at: 1400, type: 'ring', kind: 'gold', ahead: 260, x: 0, y: 10 },
          { at: 1500, type: 'wave', kind: 'fighter', pattern: 'dive', count: 8, delay: 0.18, params: { x0: 30, x1: -30, y1: 0, T: 4 } },
          { at: 1700, type: 'crate', drop: 'wing', ahead: 240, x: -8, y: 2 },
        ],
      },
      plains: {
        profile: 'plains', next: 'boss',
        points: [[-80, 34, -7000], [-60, 32, -7500], [0, 30, -8200]],
        events: [
          { at: 10, type: 'checkpoint', ahead: 100 },
          { at: 60, type: 'radio', who: 'croak', text: 'Ribbit-ha! You furry fools think you can stop MY armada? Meet my Strider!' },
          { at: 160, type: 'tanks', ahead: 300, count: 4, side: -1 },
          { at: 260, type: 'turrets', ahead: 300, xs: [-28, 28, -10, 14] },
          { at: 420, type: 'wave', kind: 'fighter', pattern: 'swoop', count: 6, delay: 0.2, params: { x0: 20, x1: -20, y0: 6, y1: 2, T: 4 } },
          { at: 560, type: 'crate', drop: 'silver', ahead: 220, x: 0, y: 0 },
          { at: 640, type: 'radio', who: 'tobi', text: 'Massive seismic readings ahead... something BIG is walking this way!' },
          { at: 700, type: 'music', track: 'none' },
        ],
      },
      boss: {
        profile: 'boss', closed: true, next: null,
        points: circlePts(-600, 30, -8200, 620, 18),
        events: [
          { at: 5, type: 'boss', boss: 'strider' },
        ],
      },
    },
    forkChooser: () => (G.player && G.player.lx > 0 ? 'skyway' : 'canyon'),
    build(rng) {
      const segs = Object.values(Rail.segs);
      R.scene.fog = new THREE.Fog(...this.fog);
      R.hemi.color.set(0xcfe6ff); R.hemi.groundColor.set(0x6a5a40); R.hemi.intensity = 1.15;
      R.sun.color.set(0xfff1d6); R.sun.intensity = 2.6;
      World.skyDome(0x3d8be0, 0xcfeaff, 0x9ac0e0, { sunDir: this.sunDir });
      World.makeWater(0, 16000);
      World.cloudField(rng, 40, { x0: -1800, x1: 1400, z0: 600, z1: -9800 }, [140, 320]);
      const T = World.terrain(segs, {
        x0: -1700, x1: 1100, z0: 500, z1: -9500, cell: 12,
        seaZ: -1350,
      });
      // the carrier (intro backdrop)
      const car = Models.carrier(); car.position.set(30, 70, 340); car.rotation.y = 0.15; World.root.add(car); World.carrier = car;
      // --- dressing per segment ---
      const along = (seg, step, fn) => { const n = Math.floor(seg.length / step); for (let i = 1; i < n; i++) { const u = i / n; const p = seg.curve.getPointAt(u), t = seg.curve.getTangentAt(u); const r = V3().crossVectors(t, V3(0, 1, 0)).normalize(); fn(p, t, r, u * seg.length); } };
      const ground = (x, z) => T.height(x, z);
      // trees & rocks on land
      const trees = [];
      for (const id of ['approach', 'plains', 'city']) {
        along(Rail.segs[id], 26, (p, t, r) => {
          for (const side of [-1, 1]) {
            const d = side * (40 + rng() * 220);
            const x = p.x + r.x * d, z = p.z + r.z * d;
            const h = ground(x, z);
            if (h < 6) continue;
            if (id === 'city' && Math.abs(d) < 330) continue;
            if (rng() < 0.55) trees.push([x, h, z, rng]);
            else if (rng() < 0.25) World.place(Models.rock(3 + rng() * 5, rng), x, h - 1, z, rng() * TAU);
          }
        });
      }
      for (const [x, h, z] of trees) World.place(Models.tree(rng), x, h - 0.5, z, rng() * TAU, 1 + rng() * 0.8);
      // city blocks + in-path towers
      const roofSlots = [];
      along(Rail.segs.city, 34, (p, t, r, s) => {
        for (const side of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const d = side * (42 + k * 70 + rng() * 30);
            const x = p.x + r.x * d, z = p.z + r.z * d;
            const w = 16 + rng() * 14, h = 18 + rng() * (k === 0 ? 40 : 70), dd = 16 + rng() * 14;
            const b = World.place(Models.building(w, h, dd, rng), x, ground(x, z) - 1, z, Math.atan2(t.x, t.z));
            World.colliderFor(b, 0.92);
            if (k === 0 && h < 46) roofSlots.push({ pos: V3(x, ground(x, z) - 1 + h, z), s: s });
          }
        }
        if (Math.floor(s / 34) % 5 === 2 && s > 200 && s < 1300) {
          const lx = (rng() < 0.5 ? -1 : 1) * (10 + rng() * 8);
          const x = p.x + r.x * lx, z = p.z + r.z * lx;
          const b = World.place(Models.building(12, 46 + rng() * 20, 12, rng), x, ground(x, z) - 1, z, Math.atan2(t.x, t.z));
          World.colliderFor(b, 0.95);
        }
      });
      Rail.segs.city.roofSlots = roofSlots;
      // arches across the flight path
      const archAt = (seg, s, w = 66, h = 46) => {
        const u = s / seg.length; const p = seg.curve.getPointAt(u), t = seg.curve.getTangentAt(u);
        const gy = ground(p.x, p.z);
        const a = World.place(Models.arch(w, h), p.x, gy - 1, p.z, Math.atan2(t.x, t.z));
        const q = _q1.setFromAxisAngle(V3(0, 1, 0), a.rotation.y).clone();
        const r = V3().crossVectors(t, V3(0, 1, 0)).normalize();
        for (const sd of [-1, 1]) Phys.addStaticBox(V3(p.x, gy - 1 + h / 2, p.z).addScaledVector(r, sd * (w / 2 + 2.5)), V3(2.5, h / 2, 2.5), q);
        Phys.addStaticBox(V3(p.x, gy - 1 + h + 2.5, p.z), V3(w / 2 + 7, 2.5, 3), q);
      };
      [500, 800, 1180].forEach((s) => archAt(Rail.segs.city, s));
      archAt(Rail.segs.approach, 2600, 70, 44);
      // fork signage
      { const seg = Rail.segs.city; const u = 1 - 30 / seg.length; const p = seg.curve.getPointAt(u), t = seg.curve.getTangentAt(u); const r = V3().crossVectors(t, V3(0, 1, 0)).normalize();
        for (const sd of [-1, 1]) {
          const sign = new THREE.Group();
          const arrow = new THREE.Shape(); arrow.moveTo(0, 3); arrow.lineTo(6, 0); arrow.lineTo(0, -3); arrow.lineTo(0, -1.2); arrow.lineTo(-6, -1.2); arrow.lineTo(-6, 1.2); arrow.lineTo(0, 1.2); arrow.lineTo(0, 3);
          const m = mkMesh(new THREE.ExtrudeGeometry(arrow, { depth: 1, bevelEnabled: false }), glow(sd < 0 ? 0x59d6ff : 0xffc83a, 2.6), { thickness: 0.15, cast: false });
          m.rotation.y = sd < 0 ? Math.PI : 0; sign.add(m);
          const pos = p.clone().addScaledVector(r, sd * 34); pos.y = p.y + 14;
          World.place(sign, pos.x, pos.y, pos.z, Math.atan2(t.x, t.z) + Math.PI / 2 * 0);
          sign.lookAt(pos.clone().sub(t)); sign.rotateY(Math.PI / 2);
          sign.scale.setScalar(1.6);
        }
      }
      // canyon: rocks, waterfalls, river
      along(Rail.segs.canyon, 60, (p, t, r, s) => {
        for (const side of [-1, 1]) {
          const d = side * (44 + rng() * 10);
          const x = p.x + r.x * d, z = p.z + r.z * d;
          if (rng() < 0.6) World.place(Models.rock(4 + rng() * 6, rng), x, ground(x, z) - 2, z, rng() * TAU);
        }
        if (Math.floor(s / 60) % 6 === 3) {
          // waterfall sheet down the wall
          const side = rng() < 0.5 ? -1 : 1;
          const x = p.x + r.x * side * 50, z = p.z + r.z * side * 50;
          const fallMat = glow(0xcfefff, 1.25, { transparent: true, opacity: 0.85, side: THREE.DoubleSide });
          const fall = new THREE.Mesh(new THREE.PlaneGeometry(18, 120, 1, 12), fallMat);
          fall.position.set(x, p.y + 20, z); fall.lookAt(p.x, p.y + 20, p.z);
          World.root.add(fall);
          World.animated.push((dt, tt) => { fall.material.opacity = 0.75 + Math.sin(tt * 9 + s) * 0.1; });
          for (let k = 0; k < 4; k++) World.animated.push(() => { if (Math.random() < 0.15) FX.smokePuff(V3(x + rand(-8, 8), ground(x, z) + 2, z + rand(-8, 8)), 4, 1, 0xf0f8ff); });
        }
      });
      // skyway: sea towers, bridges, radio masts
      along(Rail.segs.skyway, 90, (p, t, r, s) => {
        for (const side of [-1, 1]) {
          const d = side * (36 + rng() * 60);
          const x = p.x + r.x * d, z = p.z + r.z * d;
          const h = 60 + rng() * 60;
          const b = World.place(Models.building(14, h, 14, rng), x, -2, z, Math.atan2(t.x, t.z));
          World.colliderFor(b, 0.92);
        }
        if (Math.floor(s / 90) % 4 === 1) {
          // bridge spanning the route: fly under or over
          const yb = p.y - 8 + rng() * 6;
          const br = mkMesh(new THREE.BoxGeometry(120, 4, 10), toon(0xd84a3a), { thickness: 0.2 });
          br.position.set(p.x, yb, p.z); br.rotation.y = Math.atan2(t.x, t.z);
          World.root.add(br);
          Phys.addStaticBox(br.position, V3(60, 2, 5), br.quaternion);
          for (const sd of [-1, 1]) { const tw = World.place(Models.tower(rng), p.x + r.x * sd * 62, -2, p.z + r.z * sd * 62); tw.scale.set(1.4, (yb + 30) / 38, 1.4); }
        }
      });
      // boss arena: ruins & enemy base structures
      for (let i = 0; i < 40; i++) {
        const a = rng() * TAU, rr = 750 + rng() * 300;
        const x = -600 + Math.cos(a) * rr, z = -8200 - Math.sin(a) * rr;
        if (rng() < 0.5) World.place(Models.tower(rng), x, ground(x, z) - 1, z); else World.place(Models.rock(6 + rng() * 10, rng), x, ground(x, z) - 2, z, rng() * TAU);
      }
      for (let i = 0; i < 14; i++) {
        const a = rng() * TAU, rr = 200 + rng() * 300;
        const x = -600 + Math.cos(a) * rr, z = -8200 - Math.sin(a) * rr;
        World.place(Models.building(20 + rng() * 20, 10 + rng() * 25, 20 + rng() * 20, rng), x, ground(x, z) - 1, z, rng() * TAU);
      }
    },
  },

  // ------------------------------------------------------------------ STAGE 2
  zeta: {
    id: 'zeta', name: 'SECTOR ZETA', subtitle: 'Armada Flagship', mode: 'allrange', number: 2,
    music: 'stage2', medalHits: 70, next: null, arenaRadius: 1100, gravity: 0,
    sunDir: V3(-0.5, 0.4, 0.6),
    build(rng) {
      R.scene.fog = new THREE.Fog(0x0a0618, 900, 4200);
      R.hemi.color.set(0x8a9aff); R.hemi.groundColor.set(0x2a1a3a); R.hemi.intensity = 0.9;
      R.sun.color.set(0xffe6c8); R.sun.intensity = 3.0;
      World.skyDome(0x05030f, 0x1a0e3a, 0x0a0618, { stars: true, nebula: 0x7a2a9a, sunDir: this.sunDir });
      World.spaceDust(0xbfd8ff, 1600, 420);
      // backdrop planet with ring
      const planet = mkMesh(new THREE.SphereGeometry(900, 48, 32), toon(0xd86a3a, { rim: 0.6 }), { thickness: 6, cast: false, receive: false });
      planet.position.set(-2600, -900, -3800);
      const bands = new THREE.Mesh(new THREE.TorusGeometry(1500, 60, 4, 96), toon(0xe8c08a, { rim: 0 }));
      bands.rotation.x = Math.PI / 2.3; planet.add(bands);
      World.root.add(planet);
      const moon = mkMesh(new THREE.SphereGeometry(160, 24, 16), toon(0x9aa0b8, { rim: 0.5 }), { thickness: 2, cast: false });
      moon.position.set(2400, 900, -3000); World.root.add(moon);
      // asteroid belt (static colliders)
      for (let i = 0; i < 70; i++) {
        const a = rng() * TAU, rr = 300 + rng() * 800, y = (rng() - 0.5) * 360;
        const r = 8 + rng() * 26;
        const ast = Models.asteroid(r, rng);
        ast.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
        ast.rotation.set(rng() * TAU, rng() * TAU, 0);
        ast.userData.spin = V3(rng() - 0.5, rng() - 0.5, 0).multiplyScalar(0.3);
        World.root.add(ast);
        Phys.addStaticBall(ast.position, r * 0.9);
        World.animated.push((dt) => { ast.rotation.x += ast.userData.spin.x * dt; ast.rotation.y += ast.userData.spin.y * dt; });
      }
      // derelict friendly frigate wreck
      const wreck = Models.carrier(); wreck.position.set(500, -140, 300); wreck.rotation.set(0.3, 1.2, 0.6); wreck.scale.setScalar(0.8); World.root.add(wreck);
      World.animated.push(() => { if (Math.random() < 0.3) FX.smokePuff(wreck.position.clone().add(V3(rand(-30, 30), rand(0, 20), rand(-40, 40))), 6, 1.5, 0x444455); });
    },
    // phase director for all-range mode
    phases: [
      {
        id: 'drones', enter: [
          { type: 'radio', who: 'hq', text: 'You\'ve reached Sector Zeta. Croak\'s flagship is hiding in this belt — flush it out!' },
          { type: 'hint', id: 'allrange', text: 'ALL-RANGE MODE — fly freely! {steer} turn · {brake}+{flip} U-TURN · watch the radar' },
          { type: 'spawnDrones', count: 8 },
        ],
        timeline: [
          { t: 8, type: 'radio', who: 'kestrel', text: 'Fighters everywhere. Finally, a real party.' },
          { t: 14, type: 'spawnDrones', count: 5 },
          { t: 18, type: 'hint', id: 'uturn', text: 'Hold {brake} and press {flip} for a U-TURN — great when enemies pass you' },
          { t: 22, type: 'pickups' },
        ],
        until: (ph) => (ph.t > 12 && G.ents.filter((e) => e.alive && e instanceof Drone).length <= 3) || ph.t > 45,
      },
      {
        id: 'aces', enter: [
          { type: 'music', track: 'boss' },
          { type: 'radio', who: 'jackal', text: 'Well, well. Stark Fox. The Emperor pays triple for your tail, pup.' },
          { type: 'radio', who: 'marlow', text: 'The Jackal Pack! Stay sharp — they fly nothing like the drones.' },
          { type: 'spawnAces' },
        ],
        timeline: [
          { t: 10, type: 'troubleAce', who: 'tobi' },
          { t: 20, type: 'pickups' },
          { t: 26, type: 'spawnDrones', count: 4 },
          { t: 40, type: 'troubleAce', who: 'kestrel' },
        ],
        until: (ph) => (ph.t > 5 && G.ents.filter((e) => e.alive && e instanceof Ace).length === 0) || ph.t > 110,
        exit: [{ type: 'acesRetreat' }],
      },
      {
        id: 'boss', enter: [
          { type: 'radio', who: 'tobi', text: 'Huge warp signature! It\'s the flagship!' },
          { type: 'boss', boss: 'mothership' },
          { type: 'radio', who: 'croak', text: 'You have meddled for the LAST time! Gullet, swallow them whole!' },
          { type: 'radio', who: 'tobi', text: 'Scanning... Four shield generators on its flanks protect the reactor. Take them out!' },
          { type: 'music', track: 'boss' },
        ],
        timeline: [{ t: 30, type: 'pickups' }, { t: 70, type: 'pickups' }, { t: 110, type: 'pickups' }],
        until: () => false,
      },
    ],
  },
};
