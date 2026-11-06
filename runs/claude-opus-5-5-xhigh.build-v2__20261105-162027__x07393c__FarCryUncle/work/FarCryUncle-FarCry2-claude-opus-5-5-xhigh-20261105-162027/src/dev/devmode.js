// Dev mode, from the pause menu: tabs over the world, playing or frozen. Cheats, teleports, spawns, world, missions, live balance sliders, debug.
import { SLIDERS, TUNING_DEFAULTS } from '../content/tuning-defaults.js';
import { TUNING, resetTuning } from '../core/tuning.js';
import { SITES, POSTS, CASES, HALTS, TRIGS } from '../content/sites.js';
import { MISSIONS, MISSION_ORDER } from '../content/missions.js';
import { WEAPONS } from '../content/weapons.js';
import { BUDDIES } from '../actors/buddy.js';
import { FN } from '../world/fire.js';
import { SAFE_X, SAFE_Y } from '../ui/menu.js';
const TABS = ['CHEATS', 'TELEPORT', 'SPAWN', 'WORLD', 'MISSION', 'BALANCE', 'DEBUG'];
export class DevMode {
  tabPage = {};
  god = false; infiniteAmmo = false; noJams = false; noFever = false; noWear = false; invisible = false; noclip = false; oneHit = false; frozen = true; fireOverlay = false; navOverlay = false; aiText = false; skipScript = false; freeCam = false; balancePage = 0; lastStatus = ''; statusShown = false;
  constructor(game) { this.game = game; }
  crosshair() {
    const g = this.game, e = g.player.eye, f = g.player.forward();
    _o.set(e.x, e.y, e.z); _d.set(f.x, f.y, f.z);
    const hit = g.ctx.physics.castRay(_o, _d, 800, [], g.player.cc?.body);
    if (!hit) return { x: e.x + f.x * 30, y: e.y, z: e.z + f.z * 30 };
    return { x: e.x + f.x * hit.distance, y: e.y + f.y * hit.distance, z: e.z + f.z * hit.distance };
  }
  teleport(x, z) { const g = this.game; if (g.player.seat) g.driving.eject(); g.player.flying = false; g.player.teleport(x, z); }
  teleportSite(key) { const s = SITES[key] ?? POSTS[key]; this.teleport(s.at[0], s.at[1] + (s.r ? Math.min(s.r, 20) : 12)); }
  startMission(id) {
    const g = this.game;
    g.dialogue.stopAll();
    g.ui.menu.clear();
    g.engineResume();
    g.resetCampaign({ keepScene: true });
    g.mode = 'campaign';
    const m = g.missions.prepareJump(id);
    g.setupForJump(m);
    g.missions.start(id);
    return m;
  }
  completeStep() { this.game.missions.forceStep(); }
  // ---- tab contents ----
  /** Six rows at most on any screen, dev's too: a long tab pages. */
  items(tab) {
    const all = this.allItems(tab);
    if (all.length <= 6) return all;
    const per = 5, pages = Math.ceil(all.length / per), page = (this.tabPage[tab] ?? 0) % pages;
    return [...all.slice(page * per, (page + 1) * per), { id: 'more', label: `MORE (${page + 1}/${pages})`, small: true, onSelect: () => { this.tabPage[tab] = (page + 1) % pages; } }];
  }
  allItems(tab) {
    const g = this.game, w = g.weapons;
    const toggle = (k, label) => ({ id: k, label, small: true, choices: { options: [true, false], get: () => this[k], set: (v) => { this[k] = v; this.applyCheats(); }, format: (v) => (v ? 'ON' : 'OFF') } });
    const act = (id, label, fn) => ({ id, label, small: true, onSelect: fn });
    switch (TABS[tab]) {
      case 'CHEATS': return [toggle('god', 'GOD MODE'), toggle('infiniteAmmo', 'INFINITE AMMO'), toggle('noJams', 'NO JAMS'), toggle('noFever', 'NO FEVER'), toggle('invisible', 'INVISIBLE TO AI'), toggle('noclip', 'NOCLIP FLY')];
      case 'TELEPORT': return [
        { id: 'tp-site', label: 'SITE', small: true, ...this.cycler('tpSite', Object.keys(SITES), (k) => SITES[k].name, (k) => this.teleportSite(k)) },
        { id: 'tp-post', label: 'POST', small: true, ...this.cycler('tpPost', Object.keys(POSTS), (k) => POSTS[k].name, (k) => this.teleportSite(k)) },
        { id: 'tp-case', label: 'CASE', small: true, ...this.cycler('tpCase', CASES.map((c) => c.id), (k) => k.toUpperCase(), (k) => { const c = CASES.find((x) => x.id === k); this.teleport(c.at[0] + 2, c.at[1] + 2); }) },
        act('tp-cross', 'THE CROSSHAIR POINT', () => { const c = this.crosshair(); this.teleport(c.x, c.z); }),
      ];
      case 'SPAWN': return [
        act('sp-concord', 'SQUAD OF CONCORD', () => this.spawnSquad('concord')), act('sp-harvest', 'SQUAD OF HARVEST', () => this.spawnSquad('harvest')),
        act('sp-pickup', 'PICKUP', () => this.spawnVehicle('pickup')), act('sp-technical', 'TECHNICAL', () => this.spawnVehicle('technical')), act('sp-truck', 'TRUCK', () => this.spawnVehicle('truck')),
        act('sp-case', 'A STONE CASE', () => { const c = this.crosshair(); g.places.spawnStoryCase(`dev${g.tick}`, c.x, c.z, 3); }),
        { id: 'sp-buddy', label: 'A BUDDY', small: true, ...this.cycler('spBuddy', ['ines', 'dov', 'mags'], (k) => BUDDIES[k].name, (k) => { const f = g.player.feet, b = g.actors.buddy(k); b.met = true; b.dead = false; b.spawn(g.ctx, f.x + 3, f.z + 3, { hp: 200 }); }) },
      ];
      case 'WORLD': return [
        { id: 'hour', label: 'HOUR', small: true, slider: { min: 0, max: 23.9, step: 0.25, get: () => g.clock.hour, set: (v) => { g.clock.hour = v; g.sky.apply(g.ctx, v); }, format: (v) => v.toFixed(1) } },
        { id: 'windDir', label: 'WIND DIRECTION', small: true, slider: { min: 0, max: 6.25, step: 0.1, get: () => ((g.wind.dir % 6.283) + 6.283) % 6.283, set: (v) => { g.wind.dir = v; if (g.wind.pinned) g.wind.pinned.dir = v; }, format: (v) => `${Math.round((v * 180) / Math.PI)}` } },
        { id: 'windSpeed', label: 'WIND SPEED', small: true, slider: { min: 0, max: 8, step: 0.25, get: () => g.wind.speed, set: (v) => { g.wind.speed = v; if (g.wind.pinned) g.wind.pinned.speed = v; }, format: (v) => v.toFixed(1) } },
        { id: 'weather', label: 'WEATHER', small: true, choices: { options: ['clear', 'dust', 'storm'], get: () => g.sky.kind ?? 'clear', set: (v) => { g.sky.setWeather(v); g.sky.apply(g.ctx, g.clock.hour); }, format: (v) => v.toUpperCase() } },
        act('ignite', 'IGNITE AT THE CROSSHAIR', () => { const c = this.crosshair(); g.fire.ignite(c.x, c.z, 4, 'player'); }),
        act('extinguish', 'EXTINGUISH ALL', () => g.fire.extinguishAll()),
        act('regrow', 'REGROW ALL', () => g.world.regrowAll()),
        act('sleep6', 'SLEEP + 6 H', () => g.clock.advance(6)),
      ];
      case 'MISSION': return [
        { id: 'ms-start', label: 'START', small: true, ...this.cycler('msStart', [...MISSION_ORDER, 'mr1', 'mr2', 'mr3'], (k) => MISSIONS[k].title, (k) => this.startMission(k)) },
        act('ms-step', 'COMPLETE CURRENT STEP', () => this.completeStep()),
        act('give-stones', 'GIVE 20 STONES', () => { g.story.stones += 20; }),
        act('give-tablets', 'GIVE 5 TABLETS, 5 SYRETTES', () => { g.body.tablets += 5; g.body.syrettes = g.body.maxSyrettes = 5; }),
        act('give-guns', 'ALL GUNS', () => this.giveAll()),
        act('break', 'BREAK THIS GUN', () => { if (w.gun) { w.gun.cond = 1; g.vm.updateWear(); } }),
        act('jam', 'FORCE A JAM', () => { if (w.gun && w.def.mag) w.gun.jam = 3; }),
        act('fever', 'FORCE THE FEVER', () => { g.story.feverRunning = true; g.body.startFever(); }),
        act('downbuddy', 'DOWN A BUDDY', () => { const b = g.actors.buddies.find((x) => x.active && !x.isDown); if (b) b.goDown(false); }),
        { id: 'flag', label: 'STORY FLAG', small: true, ...this.cycler('flag', ['truce', 'war', 'wellsEmpty', 'columnWalking'], (k) => k.toUpperCase(), (k) => { if (k === 'truce') g.story.truce = !g.story.truce; else if (k === 'war') g.story.war = !g.story.war; else g.story.flags[k] = !g.story.flags[k]; }) },
      ];
      case 'BALANCE': return this.balanceItems();
      case 'DEBUG': return [
        toggle('fireOverlay', 'FIRE GRID OVERLAY'), toggle('navOverlay', 'NAV OVERLAY'), toggle('aiText', 'AI STATE OVER HEADS'),
        act('debugPanel', 'ENGINE DEBUG PANEL', () => g.ctx.engine.showDebug(!g.ctx.engine.debugShown)),
        { id: 'free', label: 'FREE CAMERA', small: true, choices: { options: [false, true], get: () => this.freeCam, set: (v) => this.setFreeCam(v), format: (v) => (v ? 'ON' : 'OFF') } },
        act('quicksave', 'QUICK SAVE', () => { g.save.write('quick'); g.notice('SAVED', 1.5); }),
        act('quickload', 'QUICK LOAD', () => { g.ui.menu.clear(); g.engineResume(); g.save.requestLoad(); }),
        { id: 'frozen', label: 'WORLD', small: true, choices: { options: [true, false], get: () => this.frozen, set: (v) => { this.frozen = v; g.applyTimeScale(); }, format: (v) => (v ? 'FROZEN' : 'PLAYING') } },
      ];
      default: return [];
    }
  }
  cycler(key, list, fmt, go) {
    this.sel = this.sel ?? {};
    if (this.sel[key] == null) this.sel[key] = 0;
    return {
      value: () => fmt(list[this.sel[key]]),
      onLeft: () => { this.sel[key] = (this.sel[key] - 1 + list.length) % list.length; this.game.sfx.play('ui-move'); },
      onRight: () => { this.sel[key] = (this.sel[key] + 1) % list.length; this.game.sfx.play('ui-move'); },
      onSelect: () => go(list[this.sel[key]]),
    };
  }
  balanceItems() {
    const per = 4, start = this.balancePage * per;
    const list = SLIDERS.slice(start, start + per).map((s) => ({
      id: s.key, label: s.label, small: true, key: s.key,
      slider: { min: s.min, max: s.max, step: s.step, get: () => TUNING[s.key], set: (v) => { TUNING[s.key] = Math.round(v / s.step) * s.step; if (s.key === 'vehicleTopSpeed') this.game.events.emit('tuning', s.key); }, format: (v) => (s.step < 1 ? v.toFixed(2) : String(Math.round(v))) },
    }));
    if (SLIDERS.length > per) list.push({ id: 'more', label: `MORE (${this.balancePage + 1}/${Math.ceil(SLIDERS.length / per)})`, small: true, onSelect: () => { this.balancePage = (this.balancePage + 1) % Math.ceil(SLIDERS.length / per); } });
    list.push({ id: 'resetAll', label: 'RESET TO DEFAULTS', small: true, onSelect: () => { resetTuning(); this.game.notice('EVERYTHING AS IT SHIPPED.', 2); } });
    return list;
  }
  spawnSquad(faction) {
    const g = this.game, c = this.crosshair();
    const key = `dev${g.tick}`;
    const sq = g.actors.addSquadDef(key, { faction, n: 4, at: [c.x, c.z], noReman: true });
    sq.forceLive = true; g.actors.liveSquad(g.ctx, sq);
  }
  spawnVehicle(kind) { const g = this.game, f = g.player.feet, fw = g.player.forward(); g.vehicles.spawn(kind, f.x + fw.x * 6, f.z + fw.z * 6, g.player.yaw); }
  giveAll() {
    const g = this.game, w = g.weapons;
    for (const id of ['flare', 'tractor', 'mule', 'empire', 'weed', 'tube', 'm38']) { g.story.unlocked.add(id); }
    w.give('m38', 100); w.give('empire', 100); w.give('tube', 100);
    w.bottles = 3; w.charges = 2; g.story.unlocked.add('molotov');
    g.story.trackerOwned = true;
  }
  applyCheats() {
    const g = this.game, p = g.player;
    if (p.flying !== this.noclip) { p.flying = this.noclip; if (p.cc) p.cc.collider.setEnabled(!this.noclip); }
  }
  setFreeCam(v) {
    const g = this.game;
    this.freeCam = v;
    if (v) g.ctx.engine.setCamera({ preset: 'free' }, { syncUrl: false });
    else g.ctx.engine.setCamera({ preset: 'first', fov: g.settings.fov }, { syncUrl: false });
  }
  open() {
    const g = this.game;
    g.ui.menu.push({
      id: 'dev', title: 'DEV MODE', tabs: TABS, dim: 0, overlayWorld: true,
      items: (s) => this.items(s.tab),
      allItems: (s) => this.allItems(s.tab),
      resetOne: (it) => { if (it?.key) { resetTuning(it.key); g.sfx.play('ui-confirm'); } },
      hints: [['confirm', 'DO'], ['resetOne', 'RESET ONE'], ['back', 'BACK']],
      onBack: () => { g.ui.menu.pop(); },
      draw: (hud, m, s) => {
        hud.rect(0, 0, hud.width, 42, 'ink');
        m.title(hud, { title: 'DEV MODE' });
        hud.text(hud.width - SAFE_X - 40 * 6, SAFE_Y + 3, g.status().slice(0, 40), { color: 'mist' });
        m.drawTabs(hud, s, 30);
        hud.rect(0, 42, hud.width * 0.72, hud.height - 42, 'ink');
        let y = 48;
        const items = m.itemsOf(s);
        items.forEach((it, i) => { y += m.itemRow(hud, it, i, y, s.focus === i, SAFE_X, hud.width * 0.72 - SAFE_X - 8); });
        const c = this.crosshair();
        const counts = `ACTORS ${g.actors.anyStateCounts()}  BURNING ${g.fire.counts.burning}  BURNT ${g.fire.counts.burnt}  X ${Math.round(c.x)} Z ${Math.round(c.z)}`;
        hud.text(SAFE_X, hud.height - SAFE_Y - 22, counts, { color: 'mist' });
        m.footer(hud, s);
      },
    });
  }
  draw(hud) {
    const g = this.game;
    if (this.fireOverlay) this.drawGrid(hud, (x, z) => { const id = g.fire.idOf(x, z); if (id < 0) return null; const st = g.fire.state[id]; return st === 1 ? 'orange' : st === 2 ? 'ink' : st === 3 ? 'lime' : g.fire.fuel[id] ? 'sand' : null; });
    if (this.navOverlay) this.drawGrid(hud, (x, z) => (g.world.nav.walkable(x, z) ? null : 'red'));
  }
  drawGrid(hud, fn) {
    const g = this.game, f = g.player.feet, s = 3, n = 26;
    const ox = hud.width - SAFE_X - n * 2 * s - 2, oy = SAFE_Y + 40;
    hud.rect(ox - 1, oy - 1, n * 2 * s + 2, n * 2 * s + 2, 'night');
    for (let j = -n; j < n; j++) for (let i = -n; i < n; i++) {
      const c = fn(f.x + i * 5, f.z + j * 5);
      if (c) hud.rect(ox + (i + n) * s, oy + (j + n) * s, s, s, c);
    }
    hud.rect(ox + n * s, oy + n * s, s, s, 'white');
  }
}
import { THREE } from '../../pixel-engine.js';
const _o = new THREE.Vector3(), _d = new THREE.Vector3();
