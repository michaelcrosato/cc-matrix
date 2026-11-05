// THE ATTRACT MODE: after 10 seconds without input on the title or a setup screen, a reel of about 90 seconds loops:
// the Wheel turns (the continent pans across the four regions while the seasons wipe every 3 s and an AI-only campaign
// flips banners), a Frost Wyrm is summoned at Rimeholt, a battle at speed (a rotation of three per loop, the showcase AI
// preferring specials and spells), the Gray Knight in the clock chamber, then the logo. It cheats freely. Any input
// (the idle timer's set) goes to the title. snapshot().attract.beat says where it is.

const AT = G.Attract = { on: false, beat: null, loop: 0, t: 0 };
const AU2 = G.UI, AXP = E.px;
const BATTLES = [
  () => ({ spec: G.skirmishSpec({ map: 'lakeside', season: 'winter', sides: [{ realm: 'solmark', ctl: 'normal', level: 12 }, { realm: 'hoarfast', ctl: 'normal', level: 12 }], seed: 5 }), region: 'winter', caption: 'WINTER: THE LAKE FREEZES OVER' }),
  () => ({ spec: G.skirmishSpec({ map: 'river_ford', season: 'spring', sides: [{ realm: 'verdance', ctl: 'normal', level: 14 }, { realm: 'amberlyn', ctl: 'normal', level: 14 }], seed: 9 }), region: 'spring', caption: 'SPRING: THE FORDS FLOOD' }),
  () => { const s = { seed: 13, map: 'clockwork_sanctum', season: 'autumn', mode: 'sanctum', sides: [{ realm: 'hoarfast', role: 'att', ai: 'normal', troops: ['mordrain', 'ragnell', 'nimue'].map(id => G.troopAt(id, 22, { realm: 'hoarfast' })) }, { realm: 'dominion', role: 'def', ai: 'normal', troops: [G.CampaignSim.prototype._grayKnightTroop.call(null)] }] }; return { spec: s, region: 'hour', caption: 'THE CLOCKWORK SANCTUM', dials: true }; }
];
const CAPTIONS = { wheel: 'FOUR SEASONS. FOUR CROWNS. ONE STOPPED CLOCK.', summon: 'BIND MONSTERS TO YOUR BANNER.', gray: 'BEFORE THE THIRTEENTH MONTH...', logo: 'PRESS ANY BUTTON' };
AT.start = () => { AT.on = true; AT.loop = (AT.loop || 0); AT.t = 0; G.game.go('attract', {}, { fade: .5 }); };
AT.stop = () => { if (!AT.on) return; AT.on = false; AT.beat = null; G.game.input.consumeAll(); G.In.idle = 0; G.game.go('title', {}, { fade: .3 }); };
/** any input ends the reel (called from every scene the reel uses) */
AT.watch = () => { if (!AT.on) return false; if (G.In.idle === 0 && AT.armed) { AT.stop(); return true; } AT.armed = true; return false; };
G.SCENES.attract = {
  view: 'threequarter', input: G.PRESET, camera: { zoom: false },
  enter(d = {}) {
    AT.armed = false; AT.t = d.from || 0; G.In.idle = 1;
    AT.sim = G.CampaignSim.create({ seed: 100 + AT.loop, humans: [] , difficulty: 'hard' });
    AT.sim.s.humans = []; G.Camp.wm = G.Camp.wm || new G.WorldMap(); AT.season = -1;
    G.game.lights.enabled = true; G.game.lights.ambient = .85; G.game.cam.bounds = null;
    G.music(d.from ? 'title' : 'title');
    AT.rig = null; AT.summonT = 0;
  },
  update(dt) {
    G.inputTick(dt); if (AT.watch()) return;
    AT.t += dt; const t = AT.t;
    if (t < 12) {
      AT.beat = 'wheel';
      const si = Math.floor(t / 3) % 4; if (si !== AT.season) { AT.season = si; const s = G.SEASONS[si]; if (si > 0) G.CampaignAI.playSeason(AT.sim); G.Camp.wm.update(AT.sim, s); G.game.weather = s === 'spring' ? { kind: 'petals', amount: .4 } : G.weatherFor(s); G.sting('season_' + s); AT.wipe = 1; }
      const a = t / 12 * Math.PI * 2; G.game.focus(512 + Math.cos(a) * 280, 512 + Math.sin(a) * 260, 0);
    } else if (t < 20) {
      AT.beat = 'summon';
      if (!AT.rig) { AT.rig = G.monsterVis('frostwyrm', 2); AT.summonT = 0; G.sfx('summon_rise'); G.sting('summon'); G.Camp.wm.update(AT.sim, 'winter'); G.game.weather = { kind: 'snow', amount: .5 }; }
      AT.summonT += dt; G.game.focus(512, 120, 0);
    } else if (t < 65) {
      AT.beat = 'battle';
      const b = BATTLES[AT.loop % 3]();
      G.game.go('battle', { spec: b.spec, ctx: { kind: 'attract', region: b.region, sides: b.spec.sides.map(() => 'ai'), showcase: true, speed: 2, caption: b.caption, onEnd: () => G.game.go('attract', { from: 65 }) } }, { fade: 'swirl', seconds: .4 });
      if (b.dials) AT.dials = true;
      return;
    } else if (t < 80) {
      AT.beat = 'gray';
      if (!AT.grayStarted) { AT.grayStarted = true; G.game.go('event', { id: 'banner_without_season', realm: 'verdance', attract: true, onDone: () => G.game.go('attract', { from: 80 }) }); return; }
    } else if (t < 90) {
      AT.beat = 'logo'; G.game.focus(512, 500, 30);
    } else { AT.loop++; AT.grayStarted = false; AT.t = 0; AT.season = -1; AT.rig = null; AT.sim = G.CampaignSim.create({ seed: 100 + AT.loop, humans: [] }); AT.sim.s.humans = []; }
    if (AT.wipe > 0) AT.wipe = Math.max(0, AT.wipe - dt / 1.2);
  },
  draw(r) {
    G.Camp.wm.draw(r, AT.t);
    if (AT.beat === 'wheel' && AT.wipe > 0) { const rad = (1 - AT.wipe) * 700, col = G.elemColor(G.SEASONS[Math.max(0, AT.season)]); r.decal(g => { const p1 = r.groundPts(512, 512, rad, 64, 0), p2 = r.groundPts(512, 512, rad + 40, 64, 0); for (let i = 0; i < p1.length; i++) AXP.line(g, p1[i][0], p1[i][1], p2[i][0], p2[i][1], col, 2); }, { emissive: 1 }); }
    if (AT.beat === 'summon' && AT.rig) {
      const k = Math.min(1, AT.summonT / 2.5), x = 512, y = 130;
      r.decal(g => { const pts = r.groundPts(x, y, 30, 32, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; AXP.line(g, a[0], a[1], b[0], b[1], '#a8e8ff', 1); } for (let i = 0; i < 8; i++) { const ag = AT.summonT * 2 + i / 8 * Math.PI * 2, q = r.w(x + Math.cos(ag) * 22, y + Math.sin(ag) * 22, 0); AXP.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#ffffff'); } }, { emissive: 1 });
      AT.rig.update(1 / 60, { x, y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, act: k >= 1 ? { move: 'roar', k: (AT.summonT * .7) % 1 } : null });
      r.actor(x, y, 0, (g, ox, oy) => { g.save(); g.translate(ox, oy); g.scale(k, k); g.translate(-ox, -oy); AT.rig.draw(g, ox, oy, r.view); g.restore(); });
      r.queue(x, y, 0, g => { const b = r.w(x, y, 0), tp = r.w(x, y, 90); AXP.blend(g, .4 * (1 - k * .7), 'add', () => AXP.rect(g, b[0] - 10, tp[1], 20, b[1] - tp[1], '#a8e8ff')); }, { emissive: true });
      G.game.lights.add(x, y, 20, 90, 1, { color: '#a8e8ff' });
    }
    r.overlay(g => {
      const W = r.W, H = r.H, cap = CAPTIONS[AT.beat];
      if (AT.beat === 'logo') { E.font.title(g, 'BRIGANTIME', W / 2, H * .3, { scale: 4, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', depth: 3, depthColor: '#5a2a1a', align: 'center' }); AU2.text(g, 'THE LEGEND OF FORSEASONS', W / 2, H * .3 + 40, '#f0e8d8', { align: 'center' }); }
      else E.font.title(g, 'BRIGANTIME', 8, 8, { scale: 1, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10' });
      if (cap && AT.beat !== 'logo') { AXP.rect(g, 0, H - 52, W, 16, '#0a0814'); AU2.text(g, cap, W / 2, H - 48, '#ffe080', { align: 'center' }); }
      if (Math.sin(AT.t * 4) > 0) AU2.text(g, 'PRESS ANY BUTTON', W / 2, H - 26, '#ffffff', { align: 'center' });
    });
  }
};
