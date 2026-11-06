// createGame(): the one Game object. Modes: title, attract, play. One scene, no loadGame.
import { THREE, ContactShadow, loadPack, MODEL_LIBRARY, PALETTE, toonMaterial, spatialize } from './engine.js';
import { G, bus } from './state.js';
import { UI, panel, promptRow, hit, hitAt, menu, drawCursor, drawGlyph, glyphFor, promptSig } from './ui/kit.js';
import { Controls } from './ui/input.js';
import { drawText, textWidth, wrap, LINE_H } from './ui/font.js';
import { Script, say, ask, Toasts, until } from './ui/dialogue.js';
import { WorldView } from './world/view.js';
import { Trans, setPlace, ensureRoom, rebuildRoom } from './world/places.js';
import { newWorld, info, fingerprintOf, rebuildGrid, addEnt, unreadMail } from './core/world.js';
import { storage, KEYS } from './core/storage.js';
import { saveNow, loadSave, hasSave, markPlaying, wasUnclean, lifetime, setLifetime, deserialize, serialize } from './core/save.js';
import { hourOf, DAY_START, SEASON_NAMES, nextFestivalDay } from './core/calendar.js';
import { fmt, fmtTime, clamp, rngOf, lerp } from './core/util.js';
import { Player } from './actors/player.js';
import { NPC } from './actors/npcs.js';
import { Nature } from './systems/nature.js';
import { chooseTarget, hoverTarget, toolDown, toolUp, toolVerb, cycleTool, equip, fishingFixed, addTargets } from './systems/interact.js';
import './systems/talk.js';
import { HOSTS_TALK } from './systems/talk.js';
import { storeTargets, syncWing, animateWings, upgradeHome, homeDoors, patternFlow } from './systems/services.js';
import { bureauMail, sit, updateDust, tvSync, wireHome } from './systems/home.js';
import { Crowd, rideFocus, rideTick, rideScene } from './systems/city.js';
import { onHour, onMorning, festFixed, festUpdate, festTool, roccoStory, pimmVisit, applyMovedState, contestCaught } from './systems/year.js';
import { openingScript, storyTalk, wireDayOne, drawErrands } from './systems/dayone.js';
import { rollDay, applyAbsence, weatherOf } from './systems/days.js';
import { mailScreen, pocketsScreen, mapScreen, almanacScreen, emoteWheel, patternStudio, chimeScreen } from './ui/screens.js';
import { pauseScreen, settingsScreen, aboutScreen, loadSettings, S } from './ui/shell.js';
import { initAudio, updateMusic, ambienceLoops, updateChime, M } from './audio/music.js';
import { T } from './dev/tuning.js';
import { ITEMS, TOOL_ORDER, EMOTE_CLIP } from './data/items.js';
import { LANDMARK } from './world/layout.js';
import { ROOM_DEFS } from './world/rooms.js';
import { CAST, nameOf } from './data/cast.js';
import { Attract } from './dev/attract.js';
import { ALL_MODELS } from './art/models.js';
import './art/textures.js';
import { openVisitMenu, HostSession, GuestSession, wrap as wrapVisit } from './net/visit.js';
const touchOnly = () => typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && typeof matchMedia !== 'undefined' && !matchMedia('(any-pointer: fine)').matches;
const IDLE_ATTRACT = 10;
export class SillyFolk {
  name = 'Silly Folk';
  target = new THREE.Vector3(24, 1, 40);
  async setup(ctx) {
    bus.clear(); UI.clear(); UI.time = 0; Script.clear(); Toasts.list = []; Trans.phase = null; Trans.cb = null; M.override = null; M.venue = null; M.current = null; G.chimeQueue = null; G.toolRing = 0; G.biteFlash = 0; G.target = null; G.visit = null; G.starNow = false;
    G.ctx = ctx; G.game = this; G.places = {}; G.rooms = {}; G.place = null; G.time = 0; G.mode = 'boot'; G.demo = null; G.fest = null; G.focusZoom = null; G.opening = null; G.noclip = false; G.noHours = false; G.touchOnly = touchOnly(); G.nowMs = () => (typeof Date !== 'undefined' ? Date.now() : 0);
    G.bootSave = storage.get(KEYS.save);
    await loadPack('packs/kenney-furniture.json', { into: MODEL_LIBRARY });
    loadSettings(); initAudio(ctx.audio); UI.sfx = (n) => ctx.audio.play(n);
    G.ctrl = new Controls(ctx); UI.ctrl = G.ctrl; UI.hud = ctx.hud;
    G.view = new WorldView(ctx); G.view.build(); G.view.setCam();
    Nature.init(ctx); NPC.init(ctx); Crowd.init();
    wireDayOne(); wireHome();
    bus.on('roomMade', (r) => { if (r.def.wing) syncWing(r.id); NPC.setStaffPlaces(); if (r.id.startsWith('magda')) for (const p of r.props) p.magda = true; });
    bus.on('caught', (it) => contestCaught(it));
    G.storeTargets = storeTargets; G.bureauMail = bureauMail;
    G.player = new Player(); this.playerGroup = new THREE.Group(); ctx.scene.add(this.playerGroup);
    this.useWorld(newWorld({ seed: 'title', name: 'Nobody', town: 'Nowhere' })); G.player.spawn(this.playerGroup, G.world); G.player.actor.visible = false;
    this.amb = ambienceLoops(ctx.audio);
    G.saveAndQuit = () => { if (G.visit) { const v = G.visit; if (v.guest) { UI.clear(); v.leave(); return; } v.leave(); } saveNow(G.world, G.nowMs()); markPlaying(false); UI.clear(); this.toTitle(); }; G.toTitle = () => this.toTitle(); G.loadFromSave = () => this.continueGame();
    G.sleepTo = (o) => this.sleepTo(o); G.jumpDay = (d) => this.jumpDay(d); G.jumpToYd = (yd0) => { const yd = ((yd0 - 1) % 16) + 1; const w = G.world; let d = w.clock.day; while (((d - 1) % 16) + 1 !== yd) d++; this.jumpDay(d); }; G.hourForce = () => this.hourForce(); G.afterBed = () => { markPlaying(false); this.cleanAt = G.time; };
    G.openMail = () => { UI.push(mailScreen()); bus.emit('mailOpened'); }; G.useProp = (p, r) => this.useProp(p, r);
    G.doEmote = (e) => { const clip = EMOTE_CLIP[e]; G.player.actor.play(clip, { then: 'Idle', restart: true }); G.player.busy = 1; G.world.stats.emoted = (G.world.stats.emoted ?? 0) + 1; bus.emit('emote', e); G.visit?.emote?.(e); };
    G.wardrobe = () => pocketsScreen({ title: 'Wardrobe (what you carry)', pickLabel: 'Choose' });
    G.storyTalk = (id) => storyTalk(id) ?? roccoStory(id);
    G.setClockMode = (m) => { const w = G.world; w.clock.mode = m; if (m === 'real') this.readClock(true); };
    G.rumble = (a, s) => this.rumble(a, s); G.visitMenu = () => { if (typeof BroadcastChannel === 'undefined') return Toasts.add('Visiting needs a real browser.'); openVisitMenu(); };
    G.forceRocco = () => { G.jumpToYd(9); };
    G.settingsS = settingsScreen; G.chimeS = chimeScreen; G.patS = patternStudio; G.aboutS = aboutScreen;
    G.drawAvatarCard = (h, x, y) => this.avatarCard(h, x, y);
    G.placeLost = () => { const w = G.world; for (const [tx, tz] of [[30, 34], [31, 35], [15, 42], [32, 44], [18, 45]]) if (!w.grid.get(tx + ',' + tz)) { addEnt(w, { t: 'item', it: 'lostthing', x: tx + 0.5, z: tz + 0.5 }); return; } };
    G.onEntered = (id) => { if (id === 'store' && G.world.flags.chimeSet) G.playChime(G.world.chime.slice(0, 8)); };
    G.replayRecording = async (r) => { const e = ctx.engine; if (!r) return; const keep = storage.get(KEYS.save), sess = storage.get(KEYS.session); const start = G.bootSave; if (start) storage.set(KEYS.save, start); else storage.del(KEYS.save); UI.clear(); try { await e.replay(r, () => e.loadGame(createGame())); } finally { e.manual = false; if (keep) storage.set(KEYS.save, keep); else storage.del(KEYS.save); if (sess) storage.set(KEYS.session, sess); G.bootSave = keep; } };
    this.idle = 0; this.hudAlpha = 1; this.hudT = 0; this.cleanAt = -1000; this.lastHour = -1; this.realT = 0; this.rflick = 0; this.toolHeld = false; this.mouseHold = 0;
    this.toTitle(true);
    if (typeof window !== 'undefined') { this.keyListener = (e) => { if (e.repeat && e.key !== 'Backspace') return; ctx.input.send({ t: 'key', key: e.key }); if (e.key === 'Tab') e.preventDefault(); }; window.addEventListener('keydown', this.keyListener); this.ctxMenu = (e) => e.preventDefault(); window.addEventListener('contextmenu', this.ctxMenu); this.tapL = () => ctx.input.send({ t: 'tap' }); window.addEventListener('pointerdown', this.tapL, { capture: true }); }
  }
  ready(ctx) { const self = this; bus.emit('engineReady'); if (typeof window !== 'undefined') window.__GAME__ = { visit: { HostSession, GuestSession, wrap: wrapVisit }, get world() { return G.world; }, ui: { model: () => UI.model(), get stack() { return UI.stack; } }, tuning: T, G, game: self, status: () => self.status(ctx), UI, Script, actions: self.actions() }; }
  actions() { return { teleport: (x, z) => { G.world.p.x = x; G.world.p.z = z; G.player.placeNow(); }, setPlace, ensureRoom, talk: (id) => G.talk(id), newGame: (o) => this.newGame(o), step: () => {} }; }
  dispose() { if (typeof window !== 'undefined') { window.removeEventListener('keydown', this.keyListener); window.removeEventListener('contextmenu', this.ctxMenu); window.removeEventListener('pointerdown', this.tapL, { capture: true }); } }
  useWorld(w) { const v = G.view; for (const e of v.ents.values()) v.town.remove(e.obj); v.ents.clear(); G.world = w; rebuildGrid(w); if (!w.weather) w.weather = weatherOf(w); if (!w.shop?.stock?.length) { rollDayLight(w); } w.dirty = true; v.seasonNow = -1; v.lastSkyKey = null; v.windowsGlow = null; v.setHomeModel(Math.max(1, w.p.tier)); const stoTier = w.p.spent >= 120000 ? 3 : w.p.spent >= 25000 ? 2 : 1; v.setStoreModel(stoTier); for (const id of ['home', 'home_annex', 'home_up']) { if (G.rooms[id]) { G.ctx.scene.remove(G.rooms[id].group); delete G.rooms[id]; delete G.places[id]; } } if (w.p.tier >= 2) { ROOM_DEFS.home.w = 8; ROOM_DEFS.home.d = 8; } else { ROOM_DEFS.home.w = 6; ROOM_DEFS.home.d = 6; } G.place = G.places.town; v.setSeason(info(w).season, true); NPC.settle(); applyMovedState(); Nature.lastHourKey = null; this.lastHour = -1; if (w.flags.goldBell) v.setBellGold?.(); onHourSoft(w); }
  // ---- Title
  toTitle(first) {
    M.override = null; M.venue = null; G.mode = 'title'; G.demo = null; Script.clear(); UI.clear(); G.fest = null; G.opening = null; rideScene(false); Trans.phase = null; G.ctx.engine.screen.set(null, 0);
    this.useWorld(newWorld({ seed: 'title', name: 'Nobody', town: 'Nowhere' })); setPlace('town', 24, 47, 0); G.world.clock.minute = 17 * 60; G.world.clock.frozen = true; G.player.actor.visible = false; G.player.state = 'free'; this.titleCam = 0; G.view.zoomTarget = 1.25; G.view.yaw = G.view.yawTarget = 45; this.idle = 0; UI.push(this.titleMenu());
  }
  titleMenu() {
    const items = () => [hasSave() ? { label: 'Continue', action: () => this.continueGame() } : null, { label: 'New Arrival', action: () => this.newArrival() }, { label: 'Visit', action: () => G.visitMenu?.() }, { label: 'Settings', action: () => { UI.push(settingsScreen()); } }, { label: 'About', action: () => UI.push(aboutScreen()) }].filter(Boolean);
    const m = menu({ id: 'title', w: 170, x: 155, y: 124, items, onBack: null, dim: false, freezes: false, perPage: 6 }); const base = m.draw.bind(m);
    m.draw = (h, top) => { this.drawLogo(h); base(h, top); if (G.touchOnly && !G.touchCleared) { panel(h, 110, 236, 260, 18); drawText(h, 240, 241, 'Controller or keyboard required', { color: 'red', align: 'center' }); } }; return m;
  }
  drawLogo(h) { const b = Math.round(Math.sin(UI.time * 1.4) * 1.5); h.rect(92, 28 + b, 296, 74, 'ink'); h.rect(94, 30 + b, 292, 70, 'white'); h.rect(94, 30 + b, 292, 3, 'red'); drawText(h, 240, 40 + b, 'Silly Folk', { color: 'navy', align: 'center', scale: 4 }); drawText(h, 240, 80 + b, 'One bus ride from the Big City. 8,000 beans from a goose.', { color: 'slate', align: 'center' }); }
  newArrival() { const m = menu({ id: 'clockChoice', title: 'How should time pass?', w: 340, items: [{ label: 'Village Time: a day takes about 19 minutes', action: () => { UI.pop(m); this.newGame({ clockMode: 'village' }); } }, { label: "Real Clock: your device's time and date", action: () => { UI.pop(m); this.newGame({ clockMode: 'real' }); } }] }); UI.push(m); }
  newGame(o = {}) { if (G.mode === 'attract') { Attract.stop(); G.demo = null; G.mode = 'title'; } UI.clear(); let ok = false; const go = () => { rideScene(false); const w = newWorld({ seed: o.seed ?? 'v' + G.ctx.random.int(0, 999999), now: G.nowMs(), clockMode: o.clockMode ?? 'village' }); this.useWorld(w); G.view.zoomTarget = T.zoom; G.mode = 'play'; rollDay0(w); G.player.rebuild(); setPlace('town', w.p.x, w.p.z, 0); markPlaying(true); if (o.skipIntro) { G.player.actor.visible = true; w.name = o.name ?? 'Tester'; w.town = o.town ?? 'Testville'; upgradeHome(1); w.p.debt = Math.round(8000 * T.debt); w.day1.started = true; return; } G.player.actor.visible = false; Script.run(openingScript(w, o)); }; if (o.instant) go(); else Trans.go(go, 'fade', 2.4); }
  continueGame() { const w = loadSave(); if (!w) return; UI.clear(); const unclean = wasUnclean(); const now = G.nowMs(); Trans.go(() => { this.useWorld(w); G.view.zoomTarget = T.zoom; G.mode = 'play'; G.player.actor.visible = true; G.player.rebuild(); if (w.p.place === 'home') { const r = ensureRoom('home'); } setPlace(w.p.place, w.p.x, w.p.z, w.p.facing); const d = applyAbsence(w, now); if (unclean) { const lt = lifetime(); setLifetime({ pimm: lt.pimm + 1 }); pimmVisit(lt.pimm); } markPlaying(true); if (d) Toasts.add(`You were away ${d} day${d > 1 ? 's' : ''}. The village noticed.`, 5); }, 'fade', 2.4); }
  // ---- Time
  hourForce() { const w = G.world; const h = hourOf(w.clock); this.lastHour = h; onHour(h); Nature.respawn(); }
  readClock(force) { const w = G.world; if (w.clock.mode !== 'real') return; const now = new Date(G.nowMs()); w.clock.realNow = now.getTime(); const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`; w.clock.minute = now.getHours() * 60 + now.getMinutes(); if (w.clock.dateKey && w.clock.dateKey !== key && now.getHours() >= 5) { w.clock.day++; rollDay(w); onMorning(); } if (!w.clock.dateKey || now.getHours() >= 5) w.clock.dateKey = key; }
  tick(dt) {
    const w = G.world, c = w.clock; if (c.frozen || G.clockFrozen || w.guest) return;
    if (c.mode === 'real') { this.realT -= dt; if (this.realT <= 0) { this.realT = 5; G.ctx.input.send({ t: 'clock' }); } return; }
    const prev = c.minute; const half = c.speedHalf && w.day1 && !w.day1.done ? 0.5 : 1; c.minute += dt * T.minPerSec * half; if (c.minute >= 1440) c.minute -= 1440;
    if (prev < DAY_START && c.minute >= DAY_START) this.newDay();
  }
  newDay() { const w = G.world; const s0 = info(w).season; w.lastWeather = w.weather?.kind; w.clock.day++; rollDay(w); onMorning(); NPC.settle(); const s1 = info(w).season; if (s0 !== s1 && !G.demo) this.seasonCard(s1); if (!G.demo && !w.guest) saveNow(w, G.nowMs()); bus.emit('day', w.clock.day); }
  seasonCard(s) { M.override = 'sting' + s; const scr = { id: 'season', title: SEASON_NAMES[s], t3: 0, opaque: true, freezes: true, get prompts() { return []; }, input(c, dt) { this.t3 += dt; if (this.t3 > 2.4 || (this.t3 > 0.6 && (c.confirm() || c.clickL()))) { UI.pop(this); M.override = null; } }, draw(h) { const p = Math.min(1, this.t3 * 2); h.rect(0, 0, 480, 270, 'plum'); panel(h, 90, 40, 300, 180); const hh = Math.round(180 * p); h.rect(90, 40, 300, 180 - hh, 'sand'); drawText(h, 240, 100, SEASON_NAMES[s], { color: 'navy', align: 'center', scale: 4 }); drawText(h, 240, 150, ['It is all starting again.', 'Too hot. Everyone is delighted.', 'Everything is letting go, tastefully.', 'Quiet. Finally. Thank you.'][s], { color: 'slate', align: 'center' }); } }; UI.push(scr); G.ctx.audio.play('page'); }
  sleepTo(opt) { const w = G.world, c = w.clock; const m = c.minute; const target = [6 * 60, 12 * 60, 17 * 60][opt] ?? 8 * 60; let days = 0; if (opt === 0) days = m < DAY_START ? 0 : 1; else if (opt === 1) days = m < 720 && m >= DAY_START ? 0 : m < DAY_START ? 0 : 1; else if (opt === 2) days = m < 1020 && m >= DAY_START ? 0 : m < DAY_START ? 0 : 1; else days = nextFestivalDay(c.day) - c.day; const s0 = info(w).season; for (let i = 0; i < days; i++) { w.lastWeather = w.weather?.kind; c.day++; rollDay(w); onMorning(); } c.minute = target; NPC.settle(); this.lastHour = -1; const s1 = info(w).season; if (s0 !== s1) this.seasonCard(s1); if (!G.demo) { saveNow(w, G.nowMs()); markPlaying(false); this.cleanAt = G.time; } bus.emit('slept', opt); }
  jumpDay(d) { const w = G.world, c = w.clock; const target = Math.max(1, d); while (c.day < target) { w.lastWeather = w.weather?.kind; c.day++; rollDay(w); onMorning(); } if (target < c.day) { c.day = target; rollDay(w); onMorning(); } c.minute = Math.max(c.minute, 8 * 60); NPC.settle(); this.lastHour = -1; w.dirty = true; }
  rumble(a, s) { if (!G.rumbleOn || typeof navigator === 'undefined') return; try { const p = navigator.getGamepads?.()[0]; p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: s * 1000, strongMagnitude: a, weakMagnitude: a * 0.7 }); } catch { /* no rumble here */ } }
  useProp(p, r) { const w = G.world; if (p.id === 'lostbin') return Script.run((function* () { const f = w.lost; const opts = [...f.slice(0, 3).map((e) => `Take ${ITEMS[e.id]?.name}`), 'Leave something', 'Never mind']; const pick = yield ask('clementine', 'Lost & Found. Leave things, find things. Nobody checks.', opts, { cancel: opts.length - 1 }); if (pick < Math.min(3, f.length)) { const e = f[pick]; if (w.p.pockets.indexOf(null) >= 0) { f.splice(pick, 1); w.p.pockets[w.p.pockets.indexOf(null)] = e; bus.emit('lost'); } } else if (pick === Math.min(3, f.length)) { let done = false; UI.push(pocketsScreen({ title: 'Leave in the bin', pickLabel: 'Leave', onPick: (e, i, s) => { f.push(e); w.p.pockets[i] = null; UI.pop(s); done = true; bus.emit('lostLeft'); }, onClose: () => { done = true; } })); yield until(() => done); } })());
    if (p.id === 'patternstudio') return Script.run(patternFlow(NPC.actors.mothwick)); if (p.id === 'clothesrail') return G.talk('mothwick'); if (p.id === 'cutchair') return G.talk('fleece'); if (p.id === 'couturerail') return G.talk('flavia'); if (/^magda\d/.test(p.id)) return G.magdaProp(Number(p.id[5])); }
  avatarCard(h, x, y) { const l = G.world.p.look; const hc = l.hairColor ?? 'orange'; h.rect(x + 16, y + 6, 76, 56, 'sand'); h.rect(x + 12, y + 12, 84, 44, 'sand'); h.rect(x + 16, y + 2, 76, 16 + (l.hair % 4) * 3, hc); for (const ex of [34, 66]) { const eh = [8, 12, 6, 4, 8, 3][l.eyes ?? 0]; h.rect(x + ex, y + 28, 6, eh, 'ink'); } h.rect(x + 46, y + 48, 16, 3, 'plum'); }
  // ---- Hooks
  fixedUpdate(ctx, dt) {
    if (!G.world || G.mode === 'boot') return; const c = G.ctrl; const frozen = this.isFrozen();
    if (G.mode === 'play' || G.mode === 'attract') { if (!frozen) { this.tick(dt); NPC.fixed(dt); Nature.fixed(dt); Crowd.fixed(dt); fishingFixed(dt); } festFixed(frozen && G.fest?.id !== 'seedToss' ? 0 : dt); G.player.fixed(dt, c, frozen || G.freeCam || G.demo != null || Script.active && !G.fest?.running || UI.stack.length > 0 || Trans.busy); }
    else if (G.mode === 'title') { NPC.fixed(dt); Crowd.fixed(dt); Nature.fixed(dt); }
    G.visit?.fixed?.(dt);
  }
  isFrozen() { const w = G.world; if (w?.clock.mode === 'real' && UI.frozen()) return false; return UI.frozen() || (Script.active && !G.fest?.running); }
  update(ctx, dt) {
    if (!G.world) return; G.time += dt; const c = G.ctrl; c.begin(dt); Script.update(dt); Trans.update(dt); Toasts.update(dt);
    for (const cmd of c.commands) { if (cmd?.t === 'clock') this.readClock(); if (cmd?.t === 'import') { try { const nw = deserialize(cmd.text); this.useWorld(nw); setPlace(nw.p.place, nw.p.x, nw.p.z); Toasts.add('Imported.'); } catch { Toasts.add('That is not a save. It might be a poem.'); } } }
    const w = G.world; const frozen = this.isFrozen();
    if (G.mode === 'title') this.titleUpdate(dt, c);
    if (G.mode === 'attract') { if (c.anyInput || !Attract.update(dt)) { this.exitAttract(); } }
    if (!(G.mode === 'attract')) UI.update(dt); else UI.update(dt);
    if (G.mode === 'play') this.playUpdate(dt, c, frozen);
    // time-of-hour hooks
    const h = hourOf(w.clock); if (h !== this.lastHour) { const first = this.lastHour === -1; this.lastHour = h; if (G.mode === 'play' || G.mode === 'attract') { if (first) onHourSoft(w); else { onHour(h); if (!G.demo && !w.guest) { saveNow(w, G.nowMs()); if (G.time - this.cleanAt > 30) markPlaying(true); } } } Nature.lastHourKey = null; }
    Nature.hourCheck();
    // presentation
    const p = G.player; const rf = rideFocus(); rideTick(dt);
    if (p.actor) p.update(dt, frozen);
    p.syncUmbrella?.();
    NPC.update(dt); Nature.update(dt); Crowd.update(dt); festUpdate(dt); animateWings(G.time); updateDust(dt);
    const focus = this.focusPoint(); G.view.update(dt, G.time, focus); G.view.cameraUpdate(dt, G.focusZoom ?? (G.overview ? 0.45 : G.view.zoomTarget));
    this.ambience(dt); updateMusic(ctx.audio); updateChime(ctx.audio); this.smellT = (this.smellT ?? 0) - dt; if (this.smellT <= 0) { this.smellT = 0.8; if (w.p.pockets.some((e) => e?.id === 'cheesebad')) { ctx.particles.burst('steam', [w.p.x, 1.2, w.p.z], { count: 2, colors: ['lime', 'green'] }); } }
    if (w.p.place !== this.tvPlace) { this.tvPlace = w.p.place; tvSync(w.p.place); }
    this.drawHud(ctx.hud, dt, c);
    G.visit?.update?.(dt);
    if (c.anyInput) this.idle = 0; else this.idle += dt;
    c.end();
  }
  titleUpdate(dt, c) {
    const v = G.view; this.titleCam += dt; if (Math.floor(this.titleCam / 14) !== Math.floor((this.titleCam - dt) / 14)) { v.yawTarget += 90; }
    if (c.keyInput && G.touchOnly) G.touchCleared = true;
    const atRoot = UI.top?.id === 'title'; if (!atRoot) this.idle = 0; if (G.visit) this.idle = 0; if (atRoot && this.idle >= IDLE_ATTRACT) this.enterAttract();
  }
  enterAttract() { G.mode = 'attract'; UI.clear(); Attract.start(); bus.emit('attract'); }
  exitAttract() { Attract.stop(); this.toTitle(); this.idle = 0; bus.emit('attractEnd'); }
  focusPoint() { const w = G.world, rf = rideFocus(), t = this.target; if (rf) return t.copy(rf); if (G.mode === 'title') return t.set(24, 0.5, 44); if (G.view.setFocus) return t.set(G.view.setFocus[0], G.view.setFocus[2] ?? 0.5, G.view.setFocus[1]); if (G.freeCam && G.freeFocus) return t.set(G.freeFocus[0], 0.5, G.freeFocus[1]); const p = w.p; const Pl = G.place; if (Pl?.indoor) { const r = G.rooms[p.place]; const cx = r.ox + r.def.w / 2, cz = r.def.d / 2; return t.set(lerp(p.x, cx, 0.65), 0.9, lerp(p.z, cz, 0.65)); } return t.set(p.x, (Pl?.heightAt(p.x, p.z) ?? 0) + 0.9, p.z); }
  cameraTarget() { return this.target; }
  playUpdate(dt, c, frozen) {
    if (G.freeCam && !UI.stack.length) { const a = c.input.moveAxis(); const b = G.ctx.engine.camera.groundBasis(); const f = (G.freeFocus ??= [G.world.p.x, G.world.p.z]); f[0] += (b.right.x * a.x + b.forward.x * a.y) * dt * 14; f[1] += (b.right.z * a.x + b.forward.z * a.y) * dt * 14; if (c.pressed('pause')) UI.push(pauseScreen()); return; }
    if (!G.freeCam) G.freeFocus = null;
    const w = G.world, p = G.player, inUI = UI.stack.length > 0, busy = inUI || Script.active && !G.fest?.running || Trans.busy; G.toolRing = Math.max(0, (G.toolRing ?? 0) - dt); G.biteFlash = Math.max(0, (G.biteFlash ?? 0) - dt);
    if (busy) { G.target = null; this.hover = null; if (this.tileHi) this.tileHi.visible = false; return; }
    if (c.pressed('pause') && !c.input.isDown('PadCreate')) { UI.push(pauseScreen()); return; }
    G.target = chooseTarget(); this.tileMark(c);
    if (c.mouseVisible) { const hv = hoverTarget(c); this.hover = hv; if (hv.target) G.target = G.target ?? null; } else this.hover = null;
    if (p.state === 'sit') { const a = c.input.moveAxis(); if (Math.hypot(a.x, a.y) > 0.3 || c.confirm() || c.back()) { p.state = 'free'; p.actor.play('Idle'); w.p.z += 0.6; } return; }
    if (c.pressed('pockets')) { UI.push(pocketsScreen()); return; } if (c.pressed('map')) { UI.push(mapScreen()); return; } if (c.pressed('almanac')) { UI.push(almanacScreen()); return; } if (c.pressed('emotes')) { if (G.visit) { const m = menu({ id: 'phrases', title: 'Say something', w: 280, items: [{ label: 'Emotes…', action: () => { UI.pop(m); UI.push(emoteWheel()); } }, ...G.visit.CANNED.map((t, i) => ({ label: t, action: () => { UI.pop(m); G.visit.phrase(i); } }))] }); UI.push(m); } else UI.push(emoteWheel()); return; }
    if (c.pressed('camL')) G.view.turn(-1); if (c.pressed('camR')) G.view.turn(1); if (c.pressed('zoomIn')) this.zoomStep(1); if (c.pressed('zoomOut')) this.zoomStep(-1);
    if (c.device === 'pad' && !(c.input.mouseButtons)) { this.rflick = Math.abs(c.rx) > 3 && !this.rlatched ? Math.sign(c.rx) : 0; if (this.rflick) { G.view.turn(this.rflick); this.rlatched = true; } if (Math.abs(c.rx) < 0.5 && Math.abs(c.ry) < 0.5) this.rlatched = false; if (Math.abs(c.ry) > 3 && !this.rlatchY) { this.zoomStep(c.ry < 0 ? 1 : -1); this.rlatchY = true; } if (Math.abs(c.ry) < 0.5) this.rlatchY = false; }
    if (c.input.wasPressed('PadL1')) cycleTool(-1); if (c.input.wasPressed('PadR1')) cycleTool(1); if (c.input.wheel) cycleTool(c.input.wheel > 0 ? 1 : -1); for (let i = 0; i < 6; i++) if (c.input.wasPressed('Digit' + (i + 1)) && w.p.tools[i]) equip(w.p.tools[i]);
    if (c.confirm()) { if (G.target) { G.target.act(); return; } }
    if (c.clickL()) { const ic = (this.iconRects ?? []).find((r) => c.mx >= r.x && c.mx < r.x + r.w && c.my >= r.y && c.my < r.y + r.h); if (ic) { UI.sfx('uiOk'); if (ic.id === 'pockets') UI.push(pocketsScreen()); if (ic.id === 'map') UI.push(mapScreen()); if (ic.id === 'almanac') UI.push(almanacScreen()); if (ic.id === 'emotes') UI.push(emoteWheel()); return; } }
    // Mouse: left-click a thing walks into reach and uses it; left-click ground walks; hold follows the cursor
    if (c.clickL() && this.hover) { const t = this.hover.target; if (t) { const d = Math.hypot(t.x - p.x, t.z - p.z); if (d <= t.reach) { w.p.facing = Math.atan2(t.x - p.x, t.z - p.z); t.act(); } else { p.walkTo = [t.x, t.z]; p.walkReach = t.reach * 0.8; p.onArrive = () => t.act(); } } else { p.walkTo = [this.hover.gx, this.hover.gz]; p.walkReach = 0.25; p.onArrive = null; } }
    if (c.input.isDown('MouseLeft') && this.hover && !this.hover.target) { this.mouseHold += dt; if (this.mouseHold > 0.2) { p.walkTo = [this.hover.gx, this.hover.gz]; p.walkReach = 0.25; } } else this.mouseHold = 0;
    if (c.pressed('tool')) { if (!festTool()) toolDown(); }
    if (c.clickR() && this.hover) { if (!festTool(this.hover.gx, this.hover.gz)) toolDown(this.hover.gx, this.hover.gz); }
    if (p.state === 'netReady' && !c.held('tool') && !c.input.isDown('MouseRight')) toolUp();
  }
  /** A chunky highlight on the tile a tool would act on: in front of you, or under the mouse. */
  tileMark(c) { const w = G.world; if (!this.tileHi) { const mat = toonMaterial(PALETTE.white); const bar = (sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.05, sz), mat); m.position.set(x, 0, z); return m; }; this.tileHi = new THREE.Group(); this.tileHi.add(bar(1, 0.1, 0, -0.45), bar(1, 0.1, 0, 0.45), bar(0.1, 1, -0.45, 0), bar(0.1, 1, 0.45, 0)); G.ctx.scene.add(this.tileHi); } const show = w.p.place === 'town' && w.p.tool && !G.player.fishing && !G.target; this.tileHi.visible = !!show; if (!show) return; let tx, tz; if (c.mouseVisible && this.hover) { tx = Math.floor(this.hover.gx); tz = Math.floor(this.hover.gz); } else [tx, tz] = G.player.frontTile(); this.tileHi.position.set(tx + 0.5, G.place.heightAt(tx + 0.5, tz + 0.5) + 0.04, tz + 0.5); G.tileMarked = [tx, tz]; }
  zoomStep(d) { const v = G.view; v.zoomTarget = clamp(v.zoomTarget + d * 0.2, 1.2, 2.4); }
  ambience(dt) { this.ambT = (this.ambT ?? 0) - dt; if (this.ambT > 0) return; this.ambT = 0.4; const w = G.world, a = this.amb, P = G.place; const place = w.p.place, wx = G.view.weatherKind, night = G.view.night ?? 0; const out = place === 'town'; let river = null, sea = null; if (out && P) { for (let r = 2; r <= 12 && !(river && sea); r += 2) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) { const k = P.waterKind(w.p.x + dx, w.p.z + dz); if ((k === 'river' || k === 'pond' || k === 'mouth') && !river) river = [w.p.x + dx, w.p.z + dz]; if (k === 'sea' && !sea) sea = [w.p.x + dx, w.p.z + dz]; } } const ears = { position: { x: w.p.x, y: 1, z: w.p.z }, right: G.ctx.engine.camera.groundBasis().right }; const near = (at, k, gain) => { if (!at) return a[k]?.set({ volume: 0 }); const s0 = spatialize(ears, { x: at[0], y: 0, z: at[1] }, { max: 16 }); a[k]?.set({ volume: s0.gain * gain, pan: s0.pan }); }; near(river, 'river', 0.8); near(sea, 'surf', 0.9); G.ambNow = { river: !!river, sea: !!sea }; const set = (k, v) => a[k]?.set({ volume: v }); set('rain', out && (wx === 'rain' || wx === 'storm') ? 0.8 : 0); set('wind', out && (wx === 'wind' || wx === 'storm') ? 0.7 : 0); set('crickets', out && night > 0.4 && info(w).season < 3 ? 0.6 : 0); set('birds', out && night < 0.2 ? 0.45 : 0); set('cityHum', place === 'city' ? 0.7 : 0); set('neon', place === 'city' && night > 0.35 ? 0.6 : 0); set('murmur', place === 'city' ? 0.5 : 0); }
  drawHud(h, dt, c) { G.promptSig = promptSig; G.glyphFor = glyphFor;
    h.clear(); const w = G.world; if (G.mode === 'play' && !G.opening) this.playHud(h, dt, c);
    if (G.mode === 'attract') Attract.draw(h);
    if (G.visit) G.visit.bubbles(h); UI.draw(h); const quiet = G.mode === 'attract' || UI.stack.some((x) => x.opaque || /^(pause|settings|dev|about|licences)/.test(x.id ?? '')); if (!quiet) Toasts.draw(h); drawCursor(h, c);
  }
  playHud(h, dt, c) {
    const w = G.world, inf = info(w); const changed = c.anyInput || UI.stack.length; this.hudT = changed ? 4 : Math.max(0, this.hudT - dt); const show = this.hudT > 0 || w.p.place !== 'town';
    this.worldMarks(h);
    if (!show && !G.target) return; const opaque = UI.stack.some((s) => s.opaque); if (opaque) return;
    const m = 12; const label = `${SEASON_NAMES[inf.season]} · ${inf.type} · ${fmtTime(w.clock.minute)}`; const lw = textWidth(label) + 12; panel(h, m, m, lw, 15); drawText(h, m + 6, m + 4, label, { color: 'ink' });
    const beans = `${fmt(w.p.beans)} beans`; const bw = textWidth(beans) + 12; panel(h, 480 - m - bw, m, bw, 15); drawText(h, 480 - m - bw + 6, m + 4, beans, { color: 'orange' });
    if (w.p.debt > 0 && (w.p.place === 'store' || (w.day1 && !w.day1.done))) { const d = `Owed: ${fmt(w.p.debt)}`; const dw = textWidth(d) + 12; panel(h, 480 - m - dw, m + 17, dw, 15); drawText(h, 480 - m - dw + 6, m + 21, d, { color: 'red' }); }
    if (!UI.stack.length) {
      drawErrands(h, 46);
      const tool = w.p.tool; const tx = m; const ty = 270 - m - 30; panel(h, tx, ty, 30, 30); if (tool) { const it = ITEMS[tool]; h.sprite(tx + 3, ty + 3, iconRowsFor(it), iconColorsFor(it), { shadow: false, scale: 2 }); } else drawText(h, tx + 15, ty + 11, '--', { color: 'mist', align: 'center' });
      if (G.toolRing > 0) this.toolRingDraw(h);
      if (c.mouseVisible) { this.iconRects = []; [['Pockets', 'pockets'], ['Map', 'map'], ['Almanac', 'almanac'], ['Emotes', 'emotes']].forEach(([label, id], i) => { const w0 = textWidth(label) + 10, x0 = 48 + [0, 52, 84, 136][i], y0 = 270 - m - 15; const over = c.mx >= x0 && c.mx < x0 + w0 && c.my >= y0 && c.my < y0 + 15; panel(h, x0, y0, w0, 15, { fill: over ? 'navy' : 'white' }); drawText(h, x0 + 5, y0 + 4, label, { color: over ? 'white' : 'ink' }); this.iconRects.push({ id, x: x0, y: y0, w: w0, h: 15 }); }); } else this.iconRects = [];
      const list = []; const t = G.target; if (t) list.push(['confirm', `${t.verb}: ${t.label}`]); const tv = toolVerb(); if (G.fest?.id === 'seedToss' && G.fest.running) list.push(['tool', 'Fling seed']); else if (tv) list.push(['tool', tv]); if (!t && !tv) list.push(['pockets', 'Pockets']); promptRow(h, 480 - m, 270 - m - 13, list.slice(0, 3), { align: 'right', back: 'ink' });
      if (this.hover?.target && c.mouseVisible) { const hv = this.hover.target; const [a, b] = G.view.project(hv.x, 1.6, hv.z); const nw = textWidth(hv.label) + 10; h.rect(a - nw / 2, b - 12, nw, 12, 'ink'); drawText(h, a, b - 10, hv.label, { color: 'white', align: 'center' }); }
    }
    if (G.fest?.id === 'seedToss' && G.fest.running) { panel(h, 190, 12, 100, 28); drawText(h, 240, 16, `${Math.ceil(G.fest.t)}s`, { color: 'navy', align: 'center' }); drawText(h, 240, 28, `Rings: ${G.fest.score}`, { color: 'ink', align: 'center' }); }
    const cc = w.contest; if (cc && !cc.done && cc.day === w.clock.day) { const s = `${{ derby: 'Fishing Derby', bugoff: 'Bug-Off', snowman: 'Snowman Contest' }[cc.id]}: ${fmt(cc.score)}`; const sw = textWidth(s) + 12; panel(h, 240 - sw / 2, 12, sw, 15); drawText(h, 240, 16, s, { color: 'navy', align: 'center' }); }
    if (G.debugState) drawText(h, 12, 60, JSON.stringify(G.ctx.engine.state()).slice(0, 72), { color: 'white', shadow: 'ink' });
  }
  toolRingDraw(h) { const w = G.world, cx = 240, cy = 118, R = 44; const list = [null, ...w.p.tools]; list.forEach((t, i) => { const a = (i / list.length) * Math.PI * 2 - Math.PI / 2, x = Math.round(cx + Math.cos(a) * R) - 13, y = Math.round(cy + Math.sin(a) * R * 0.8) - 13; const f = (w.p.tool ?? null) === t; panel(h, x, y, 26, 26, { fill: f ? 'sky' : 'white', trim: f ? 'navy' : 'sand' }); if (t) { const it = ITEMS[t]; h.sprite(x + 1, y + 1, iconRowsFor(it), iconColorsFor(it), { shadow: false, scale: 2 }); } else drawText(h, x + 13, y + 9, '--', { color: 'slate', align: 'center' }); }); }
  worldMarks(h) {
    const w = G.world, v = G.view; const hv = this.hover?.target; const t = (G.ctrl.mouseVisible && hv) || G.target; if (t && !UI.stack.length) { const [a, b] = v.project(t.x, (G.place?.heightAt(t.x, t.z) ?? 0) + (t.kind === 'npc' ? 1.75 : t.kind === 'tree' ? 3.6 : 0.9), t.z); const bob = Math.floor(UI.time * 4) % 2; h.sprite(a - 4, b - 7 + bob, ['#######', '.#####.', '..###..', '...#...'], { '#': 'red' }, { shadow: 'ink' }); }
    for (const f of w.favours ?? []) { if (f.state === 'done') continue; const a = NPC.actors[f.npc]; if (!a?.visible) continue; const pos = a.root.position; const [x, y] = v.project(pos.x, pos.y + 1.75, pos.z); h.rect(x - 3, y - 11, 7, 11, 'red'); h.sprite(x - 0, y - 10, ['#', '#', '#', '#', '#', '.', '#'], { '#': 'white' }, { shadow: false }); }
    for (const id of Object.keys(NPC.rt)) { const rt = NPC.rt[id]; if (!rt.bubble) continue; const a = NPC.actors[id]; if (!a.visible) continue; const pos = a.root.position; if ((pos.x - w.p.x) ** 2 + (pos.z - w.p.z) ** 2 > 4) continue; const [x, y] = v.project(pos.x, pos.y + 1.85, pos.z); const lines = wrap(rt.bubble, 150).slice(0, 3); const bw = Math.max(...lines.map(textWidth)) + 10, bh = lines.length * 12 + 6; const bx = clamp(x - bw / 2, 4, 476 - bw), by = clamp(y - bh - 2, 4, 250); panel(h, bx, by, bw, bh, { shadow: false }); lines.forEach((l, i) => drawText(h, bx + 5, by + 4 + i * 12, l, { color: 'ink' })); }
    if (G.biteFlash > 0 && G.player.fishing) { const f = G.player.fishing; const [x, y] = v.project(f.x, 0.8, f.z); h.rect(x - 4, y - 14, 9, 14, 'red'); drawText(h, x, y - 12, '!', { color: 'white', align: 'center' }); }
    if (G.debugTiles && G.place) { const P = G.place; const px = Math.floor(w.p.x), pz = Math.floor(w.p.z); for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) { if (!P.walkable(px + dx + 0.5, pz + dz + 0.5, 0.2)) { const [a, b] = v.project(px + dx + 0.5, 0.1, pz + dz + 0.5); h.rect(a - 1, b - 1, 3, 3, 'red'); } } }
    if (G.showRoutines) for (const id of Object.keys(NPC.rt)) { const rt = NPC.rt[id]; if (!rt.path) continue; for (const q of rt.path) { const [a, b] = v.project(q[0], 0.1, q[2]); h.rect(a - 1, b - 1, 3, 3, 'lime'); } }
    if (G.debugNpc) for (const id of Object.keys(NPC.rt)) { const a = NPC.actors[id]; if (!a.visible) continue; const pos = a.root.position; const [x, y] = v.project(pos.x, 2, pos.z); drawText(h, x, y, `${id}:${a.curName}`, { color: 'white', align: 'center', shadow: 'ink' }); }
    if (G.debugTarget && t) drawText(h, 12, 72, `target: ${t.kind} ${t.label}`, { color: 'white', shadow: 'ink' });
  }
  status() { const w = G.world; if (!w) return 'boot'; const inf = info(w); return `${G.mode} day ${w.clock.day} ${fmtTime(w.clock.minute)} ${w.p.place} beans ${w.p.beans} debt ${w.p.debt} ${inf.type}`; }
  fingerprint() { const w = G.world; return w ? fingerprintOf(w) : 'none'; }
}
import { iconRows, iconColors, iconFor, iconColor } from './ui/icons.js';
const iconRowsFor = (it) => iconRows(iconFor(it)); const iconColorsFor = (it) => iconColors(iconColor(it));
function rollDayLight(w) { rollDay(w); w.stats.days = 1; }
function rollDay0(w) { rollDay(w); w.stats.days = 1; w.clock.speedHalf = true; w.balloonsLeft = 1; w.favours = []; }
function onHourSoft(w) { const h = hourOf(w.clock), inf = info(w); import0(h, inf); }
function import0(h, inf) { const Y = G.yearInfo; Y.rindHere = inf.slot === 0 && h >= 6 && h < 12; Y.vesperHere = inf.slot === 2 && h >= 20 && h < 24; if (G.view.rindStall) G.view.rindStall.visible = Y.rindHere; }
export const createGame = () => new SillyFolk();
