var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from2, except, desc) => {
  if (from2 && typeof from2 === "object" || typeof from2 === "function") {
    for (let key2 of __getOwnPropNames(from2))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from2[key2], enumerable: !(desc = __getOwnPropDesc(from2, key2)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// src/engine.js
var engine_exports = {};
import * as pixel_engine_star from "./pixel-engine.js";
var init_engine = __esm({
  "src/engine.js"() {
    __reExport(engine_exports, pixel_engine_star);
  }
});

// src/core/storage.js
var mem, ls, store;
var init_storage = __esm({
  "src/core/storage.js"() {
    mem = /* @__PURE__ */ new Map();
    ls = null;
    try {
      if (typeof localStorage !== "undefined") ls = localStorage;
    } catch {
      ls = null;
    }
    store = {
      get(key2) {
        try {
          const raw = ls ? ls.getItem(key2) : mem.get(key2);
          return raw == null ? null : JSON.parse(raw);
        } catch {
          return null;
        }
      },
      set(key2, value) {
        const raw = JSON.stringify(value);
        try {
          if (ls) ls.setItem(key2, raw);
          else mem.set(key2, raw);
        } catch {
          mem.set(key2, raw);
        }
      },
      remove(key2) {
        try {
          if (ls) ls.removeItem(key2);
        } catch {
        }
        mem.delete(key2);
      },
      has(key2) {
        try {
          return ls ? ls.getItem(key2) != null : mem.has(key2);
        } catch {
          return false;
        }
      }
    };
  }
});

// src/core/rng.js
function hash32(s) {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
var Stream, dayStream;
var init_rng = __esm({
  "src/core/rng.js"() {
    Stream = class {
      constructor(seed) {
        this.s = typeof seed === "number" ? seed >>> 0 : hash32(seed);
      }
      next() {
        this.s = this.s + 1831565813 >>> 0;
        let t = this.s;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
      range(a, b) {
        return a + this.next() * (b - a);
      }
      int(a, b) {
        return a + Math.floor(this.next() * (b - a + 1));
      }
      chance(p) {
        return this.next() < p;
      }
      pick(list) {
        return list[Math.floor(this.next() * list.length)];
      }
      shuffle(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(this.next() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
      weighted(entries, weight = (e) => e.weight ?? 1) {
        let total = 0;
        for (const e of entries) total += weight(e);
        let r = this.next() * total;
        for (const e of entries) {
          r -= weight(e);
          if (r <= 0) return e;
        }
        return entries[entries.length - 1];
      }
    };
    dayStream = (world, label, day = world.clock.day) => new Stream(`${world.seed}:${day}:${label}`);
  }
});

// src/data/town.js
var BUILDINGS, LANDMARKS, LAMPS, BENCHES, COTTAGE_DECO, ACRE_NAMES;
var init_town = __esm({
  "src/data/town.js"() {
    BUILDINGS = [
      { id: "museum", name: "Museum", x: 17, z: 3, w: 11, d: 7, door: [22.5, 10.5], room: "museum", model: "b-museum" },
      { id: "hall", name: "Town Hall & Post", x: 4, z: 34, w: 9, d: 6, door: [8.5, 40.5], room: "hall", model: "b-hall" },
      { id: "store", name: "Mrs. Gander's", x: 52, z: 33, w: 8, d: 6, door: [56, 39.5], room: "store", model: "b-store" },
      { id: "mothwick", name: "Mothwick's", x: 52, z: 42, w: 7, d: 5, door: [55.5, 47.5], room: "mothwick", model: "b-mothwick" },
      { id: "home", name: "Your plot", x: 67, z: 35, w: 6, d: 5, door: [70, 40.5], room: "home", model: "home" },
      { id: "dorrit", name: "Dorrit's", x: 15, z: 20, w: 5, d: 4, door: [17.5, 24.5], room: "house_dorrit", model: "cottage", roof: "orange", wall: "sand" },
      { id: "tavi", name: "Tavi's", x: 18, z: 27, w: 5, d: 4, door: [20.5, 31.5], room: "house_tavi", model: "cottage", roof: "sand", wall: "white" },
      { id: "nib", name: "Nib's", x: 29, z: 21, w: 5, d: 4, door: [31.5, 25.5], room: "house_nib", model: "cottage", roof: "navy", wall: "mist" },
      { id: "bartleby", name: "Bartleby's", x: 49, z: 19, w: 5, d: 4, door: [51.5, 23.5], room: "house_bartleby", model: "cottage", roof: "slate", wall: "night" },
      { id: "ottoline", name: "Lady Ottoline's", x: 59, z: 23, w: 5, d: 4, door: [61.5, 27.5], room: "house_ottoline", model: "cottage", roof: "plum", wall: "red" },
      { id: "rocco", name: "Rocco's", x: 69, z: 22, w: 5, d: 4, door: [71.5, 26.5], room: "house_rocco", model: "cottage", roof: "red", wall: "sand" },
      { id: "ozzie", name: "Ozzie's", x: 63, z: 42, w: 5, d: 4, door: [65.5, 46.5], room: "house_ozzie", model: "cottage", roof: "night", wall: "teal" },
      { id: "yolanda", name: "Yolanda's", x: 72, z: 42, w: 5, d: 4, door: [74.5, 46.5], room: "house_yolanda", model: "cottage", roof: "red", wall: "orange" }
    ];
    LANDMARKS = {
      busStop: [8.5, 28.5],
      oldPear: [24, 37],
      oldBell: [19.5, 41.5],
      noticeBoard: [28.5, 39.5],
      benchWest: [20.5, 45.5],
      benchEast: [27.5, 45.5],
      stallSpot: [29.5, 35.5],
      lookoutBench: [72.5, 7.5],
      lighthouse: [56.5, 53.5],
      mailbox: [73.5, 41.5],
      ribbon: [31, 43.5],
      vesperLamp: [24.5, 43],
      bridgeN: [39.5, 24.5],
      bridgeS: [44, 38.5],
      soupPot: [25, 41]
    };
    LAMPS = [[14.5, 42.5], [33.5, 38.5], [50.5, 40.5], [62.5, 38.5], [11.5, 30.5], [33.5, 28.5], [20.5, 11.5], [47.5, 26.5], [24.5, 43], [30.5, 47.5]];
    BENCHES = [[20.5, 45.5], [27.5, 45.5], [72.5, 7.5]];
    COTTAGE_DECO = {
      dorrit: [["soup-pot", 0.4, 0.8, { scale: 0.34 }], ["soup-pot", 4.6, 0.6, { scale: 0.26 }]],
      tavi: [["flower", 0.5, 0.5, { params: { species: 1 }, palette: { petal: "sand" } }], ["flower", 4.5, 0.5, { params: { species: 0 }, palette: { petal: "sand" } }], ["flower", 0.5, 1.4, { params: { species: 2 }, palette: { petal: "sand" } }]],
      nib: [["telescope", 4.4, 0.6, {}]],
      bartleby: [["kenney-furniture/lounge-chair", 4.4, 0.7, { palette: { wood: "plum", carpet: "red", carpetDarker: "plum" } }]],
      ottoline: [["cheese-wheel", 0.5, 0.5, { palette: { a: "plum", b: "night", c: "night" } }], ["driftwood", 4.3, 0.8, {}]],
      rocco: [["tank", 0.6, 0.6, { params: { w: 0.8 }, palette: { water: "sand", frame: "orange", sand: "orange", top: "orange" }, scale: 0.8 }], ["kenney-furniture/bench-cushion-low", 4.4, 0.7, { palette: { wood: "night", carpet: "red", metalLight: "mist" }, scale: 1.3 }]],
      ozzie: [["kenney-furniture/cardboard-box-closed", 0.5, 0.6, { palette: { wood: "sand", woodDark: "orange" }, scale: 1.4 }], ["kenney-furniture/cardboard-box-closed", 4.4, 0.6, { palette: { wood: "sand", woodDark: "orange" }, scale: 1.4 }]],
      yolanda: [["kenney-furniture/rug-doormat", 2.5, 0.4, { palette: { wood: "red" }, scale: 2 }], ["kenney-furniture/pillow", 4.4, 0.6, { palette: { carpet: "orange" }, scale: 2 }]]
    };
    ACRE_NAMES = [
      ["Pine Wood", "Museum Terrace", "The Falls", "Pear Orchard", "The Lookout"],
      ["Bus Stop", "Upper Row", "North Bridge", "River Row", "Mossy Wood"],
      ["Town Hall", "The Plaza", "The Bend", "Shop Street", "Your Plot"],
      ["Tide Pools", "The Dock", "River Mouth", "Lighthouse", "Palm Grove"]
    ];
  }
});

// src/data/townMap.js
var TOWN_ROWS;
var init_townMap = __esm({
  "src/data/townMap.js"() {
    TOWN_ROWS = [
      "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
      "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
      "HH::::::::::::::::::::::::::::::::::::ffff::::::::::::::::::::::::::::::::::::HH",
      "HH::::::::::::::::::::::::::::::::::WWWWWWWWW:::::::::::::::::::::::::::::::::HH",
      "HH::::::::::::::::::::::::::::::::::WWWWWWWWW:::::::::::::::::::::::::::::::::HH",
      "HH::::::::::::::::::::::::::::::::::WWWWWWWWW:::::::::::::::::::::::::::::::::HH",
      "HH::::::::::::::::::::::::::::::::::WWWWWWWWW:::::::::::::::::::::::::::::::::HH",
      'HH::::::::::::::::::::::::::::::::::WWWWWWWWW:::::::::::::""""""""""""":::::::HH',
      'HH::::::::::::::::::::::::::::::::::WWWWWWWWW:::::::::::::""""""""""""":::::::HH',
      'HH::::::::::::::::::::::::::::::::::WWWWWWWWW:::::::::::::""::::::::::::::::::HH',
      'HH::::::::::::::::::::""":::::::::::WWWWWWWWW:::::::::::::""::::::::::::::::::HH',
      'HH::::::::::::::::::::""""""""""""""""WWWW""""""""""""""""""::::::::::::::::::HH',
      'HH:::::::::::::::::::C^^^^C:::::::::""BBBB"":::::::::C^^^^C:::::::::::::::::::HH',
      'HH:::::::::::::::::::C^^^^C:::::::::""BBBB"":::::::::C^^^^C:::::::::::::::::::HH',
      "HH:::::::::::::::::::C^^^^C:::::::::::WWWW:::::::::::C^^^^C:::::::::::::::::::HH",
      "HHCCCCCCCCCCCCCCCCCCCC^^^^CCCCCCCCCCCCffffCCCCCCCCCCCC^^^^CCCCCCCCCCCCCCCCCCCCHH",
      "##.....................==.............wwww.............==.....................##",
      "##.....................==.............wwww.............==.....................##",
      "##.....................==.............wwww.............==.....................##",
      "##.....................==.............wwww.............==.....................##",
      "##.....................==.............wwww.............==.....................##",
      "##.....................==.............wwww.............==.....................##",
      "##.....................==.............wwww.............==.....................##",
      "##.....................==.............wwww.........===.==.....................##",
      "##...............========.............bbbb===============.....................##",
      "##...............=====================bbbb===============================.....##",
      "##.....................===============wwww..............=================.....##",
      "#==============........==.............wwww..............=================.....##",
      "#==============........==.............wwww....................................##",
      "#==============........==.............wwww....................................##",
      "##...........==........==.............wwww....................................##",
      "##...........==.....=====.............wwww....................................##",
      "##...........==.....=====.............wwwwwwww................................##",
      "##...........==._________________.....wwwwwwww................................##",
      "##...........==._________________.....wwwwwwww................................##",
      "##...........==._________________.........wwww................................##",
      "##...........==._________________.........wwww................................##",
      "##...........==._________________=========wwww................................##",
      "##...........==._________________=========bbbb======..........................##",
      "##...........==._________________.........bbbb=====================...........##",
      "##......========_________________.........wwww=========================.......##",
      "##......========_________________.oooo....wwww....==..............=====.......##",
      "##......========_________________oooooo...wwww....==..........................##",
      "##.............._________________oooooo...wwww....==..........................##",
      "##.............._________________oooooo...wwww....==..........................##",
      "##.............._________________oooooo...wwww....==..........................##",
      "##.............._________________oooooo...wwww....==..........................##",
      "##.............._________________.ooooss..wwww....==..........................##",
      "##.....................===.....sssssssssssmmmm....=======ss...................##",
      "##sssssssssssssssssssss===ssssssssssssssssmmmmssssssssssssssssssssssssssssssss##",
      "##ssssssssstttssssssssss=ssssssssssssssssmmmmmmsssssssssssssssssssssssssssssss##",
      "##ssssssssstttssssssssssssssssssssssssssmmmmmmmmssssssssssssssssssssssssssssss##",
      "##sssttttsssssssssssssssssssssssssssssssmmmmmmmmssssssssssssssssssssssssssssss##",
      "##sssttttssssssssssssssssssssssssssssssmmmmmmmmmmsssssssssssssssssssssssssssss##",
      "##sssttttsssssssssssssssssssssssssssssmmmmmmmmmmmmssssssssssssssssssssssssssss##",
      "##sttssssssssssssssssssdddssssssssssssmmmmmmmmmmmmssssssssssssssssssssssssssss##",
      "##sttsssssssss~~~~~~~~~dddsssssssssssmmmmmmmmmmmmmm~~~~ssssssssssssssssssssss~##",
      "##ssssss~~~~~~~~~~~~~~~ddd~~~~ssssssmmmmmmmmmmmmmmmm~~~~~~~~~ssssssssss~~~~~~~##",
      "~~~~~~~~~~~~~~~~~~~~~~~ddd~~~~~~~~~mmmmmmmmmmmmmmmmmm~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~ddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~ddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~ddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~ddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
    ];
  }
});

// src/world/tiles.js
function groundHeight(x, z) {
  const c2 = tileAt(x, z);
  if (c2 === "^") {
    const z0 = Math.floor(z);
    let top = z0;
    while (tileChar(Math.floor(x), top - 1) === "^") top--;
    let bottom = z0;
    while (tileChar(Math.floor(x), bottom + 1) === "^") bottom++;
    const t = (z - top) / (bottom + 1 - top);
    return 2 * (1 - t);
  }
  const info = tileInfo(c2);
  return info.h;
}
var COLS, ROWS, T, tileInfo, tileChar, tileAt, waterKind, walkableTile, key;
var init_tiles = __esm({
  "src/world/tiles.js"() {
    init_townMap();
    COLS = 80;
    ROWS = 64;
    T = {
      ".": { surface: "lawn", h: 0, walk: true },
      ":": { surface: "lawn", h: 2, walk: true },
      "=": { surface: "path", h: 0, walk: true },
      '"': { surface: "path", h: 2, walk: true },
      _: { surface: "plaza", h: 0, walk: true },
      s: { surface: "sand", h: 0, walk: true },
      "~": { water: "sea", h: -1, walk: false },
      w: { water: "river", h: -1, walk: false },
      o: { water: "pond", h: -1, walk: false },
      m: { water: "mouth", h: -1, walk: false },
      t: { water: "sea", h: -1, walk: false },
      W: { water: "river", h: 1.2, walk: false, high: true },
      f: { surface: "cliff", h: 2, walk: false, fall: true },
      B: { surface: "dock", h: 2.04, walk: true, bridge: true },
      "^": { surface: "path", h: 0, walk: true, ramp: true },
      b: { surface: "dock", h: 0.04, walk: true, bridge: true },
      d: { surface: "dock", h: 0.04, walk: true, bridge: true },
      C: { surface: "lawn", h: 2, walk: false, cliff: true },
      "#": { surface: "lawn", h: 0, walk: false, ring: true },
      H: { surface: "lawn", h: 2, walk: false, ring: true }
    };
    tileInfo = (c2) => T[c2] ?? T["#"];
    tileChar = (x, z) => x < 0 || z < 0 || x >= COLS || z >= ROWS ? "#" : TOWN_ROWS[z][x];
    tileAt = (x, z) => tileChar(Math.floor(x), Math.floor(z));
    waterKind = (x, z) => tileInfo(tileAt(x, z)).water ?? null;
    walkableTile = (x, z) => tileInfo(tileAt(x, z)).walk === true;
    key = (x, z) => `${Math.floor(x)},${Math.floor(z)}`;
  }
});

// src/world/startObjects.js
function occupied() {
  const s = /* @__PURE__ */ new Set();
  for (const b of BUILDINGS) for (let z = b.z - FOOTPRINT_MARGIN; z < b.z + b.d + FOOTPRINT_MARGIN + 1; z++) for (let x = b.x - FOOTPRINT_MARGIN; x < b.x + b.w + FOOTPRINT_MARGIN; x++) s.add(`${x},${z}`);
  for (const [x, z] of [...LAMPS, ...BENCHES]) s.add(key(x, z));
  for (const [x, z] of Object.values(LANDMARKS)) s.add(key(x, z));
  return s;
}
function startObjects(seed) {
  const objs = {};
  const occ = occupied();
  const rng = new Stream(`${seed}:start`);
  const tree = (x, z, kind) => {
    if (canPlant(x, z, occ, objs, kind === "palm" ? "sand" : "lawn")) {
      objs[`${x},${z}`] = { k: "tree", kind, fruit: kind === "pear" ? 3 : kind === "palm" ? 2 : 0, regrow: 0, stage: 3, hits: 0 };
      return true;
    }
    return false;
  };
  const scatter = (x0, z0, x1, z1, n, kind) => {
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 40) {
      const x = rng.int(x0, x1), z = rng.int(z0, z1);
      if (Math.abs(x % 3) === 0 || rng.chance(0.4)) {
        if (tree(x, z, kind)) placed++;
      }
    }
  };
  scatter(3, 3, 15, 13, 12, "pine");
  scatter(46, 2, 60, 9, 9, "pear");
  scatter(64, 17, 77, 21, 7, "pine");
  scatter(64, 28, 77, 33, 4, "pine");
  scatter(44, 17, 53, 18, 2, "pear");
  scatter(3, 17, 13, 24, 3, "pear");
  scatter(30, 3, 34, 13, 2, "pine");
  scatter(14, 42, 15, 47, 1, "pear");
  scatter(47, 42, 50, 47, 2, "pear");
  scatter(60, 42, 62, 47, 1, "pear");
  scatter(3, 42, 13, 47, 3, "pear");
  scatter(34, 27, 37, 33, 2, "pear");
  scatter(64, 50, 77, 55, 8, "palm");
  scatter(30, 50, 34, 54, 1, "palm");
  const rockAt = [[10, 22], [36, 20], [47, 30], [63, 18], [12, 46], [60, 30], [36, 30], [75, 32]];
  for (const [x, z] of rockAt) if (canPlant(x, z, occ, objs)) objs[`${x},${z}`] = { k: "rock", hits: 0 };
  const beds = [[16, 25, 0, 0], [18, 25, 1, 1], [22, 32, 1, 1], [19, 32, 0, 1], [29, 26, 2, 2], [33, 26, 2, 4], [49, 24, 3, 3], [53, 24, 2, 0], [59, 28, 2, 0], [63, 28, 2, 4], [69, 27, 0, 0], [73, 27, 3, 3], [63, 47, 3, 4], [68, 47, 1, 1], [72, 47, 0, 1], [77, 47, 2, 2], [66, 41, 1, 2], [74, 39, 0, 0], [14, 39, 3, 3], [47, 37, 1, 0]];
  for (const [x, z, species, color] of beds) if (canPlant(x, z, occ, objs) || canPlant(x, z, occ, objs, "path")) objs[`${x},${z}`] = { k: "flower", species, color, wet: 0, wilt: 0 };
  for (const [x, z] of [[17, 53], [52, 52], [66, 56]]) if (canPlant(x, z, occ, objs, "sand")) objs[`${x},${z}`] = { k: "driftwood", item: "driftLog" };
  return objs;
}
var FOOTPRINT_MARGIN, canPlant;
var init_startObjects = __esm({
  "src/world/startObjects.js"() {
    init_rng();
    init_town();
    init_tiles();
    FOOTPRINT_MARGIN = 1;
    canPlant = (x, z, occ, objs, surface = "lawn") => {
      if (occ.has(`${x},${z}`) || objs[`${x},${z}`]) return false;
      const c2 = tileChar(x, z);
      const info = tileInfo(c2);
      return info.walk && info.surface === surface;
    };
  }
});

// src/core/save.js
function newWorld(seed = 1, { mode = "village", demo = false } = {}) {
  const npcs = {};
  for (const id of NEIGHBOUR_IDS) npcs[id] = { friend: id === "fitch" ? 0 : 5, talkedDay: 0, lastTalkAt: null, moved: id === "fitch" ? "notYet" : "here", favour: null, seenLines: {}, greeted: false, giftsToday: 0, stung: 0, memoryIdx: 0, absentNote: false };
  return {
    v: SAVE_VERSION,
    seed,
    demo,
    clock: { mode, day: 1, year: 1, minute: 22 * 60, realMs: null, lastRealMs: null, daysPlayed: 1, newDayStamp: 0 },
    player: {
      name: "You",
      town: "Nowhere",
      look: { hair: 0, hairColor: "plum", eyes: 0, skin: "sand", shirt: "slate", trim: "mist", outfit: "tatteredShirt", hat: null, hatItem: null, glasses: null, glassesItem: null, umbrella: null, pattern: null },
      x: 8.5,
      z: 29.5,
      place: "town",
      facing: 0,
      beans: 200,
      debt: 8e3,
      debtPaid: 0,
      debtTier: 1,
      homeTier: 1,
      lifeSpend: 0,
      jar: 0,
      pockets: Array(15).fill(null),
      tools: [],
      tool: null,
      puffy: false,
      buffUntil: 0,
      luck: null,
      emotes: ["shrug"],
      catalog: {},
      plumes: 0,
      fashionDay: 0,
      fortuneDay: 0,
      gagJump: false,
      deliveredWishes: 0,
      pattern: 0
    },
    town: { objects: startObjects(seed), worn: {}, wear: {}, patterns: {}, snowfall: 0, bellGold: false, lostFound: ["boxes"], cracksDay: 0, footprints: [] },
    home: {
      rooms: { main: { wall: "wall-plaster", floor: "floor-oak", items: [{ id: "cottageBed", x: 0, z: 0, rot: 0, on: true }, { id: "boxes", x: 5, z: 0, rot: 0, on: true }] }, annex: { wall: "wall-cream", floor: "floor-pine", items: [] }, upstairs: { wall: "wall-sea", floor: "floor-ash", items: [] } },
      wallColor: "orange",
      roofColor: "slate",
      dust: [],
      stereo: null,
      tankFish: {},
      cageBugs: {},
      lastGrade: null,
      bestGrade: null,
      plaque: false,
      deedGold: false
    },
    store: { tier: 1 },
    npcs,
    museum: { fish: {}, bug: {}, fossil: {}, art: {}, plaques: {}, open: false },
    almanac: { fish: {}, bug: {}, fossil: {}, art: {}, stars: {}, starNames: {}, flowers: {} },
    mail: { inbox: [], pending: [], sentToday: 0, read: 0 },
    memory: [],
    stats: { caught: 0, bugs: 0, fish: 0, biggest: null, biggestBeans: 0, sold: {}, talks: {}, beansEarned: 0, days: 1, sleeps: 0, weeds: 0, netBonks: 0, walked: 0, wishes: 0, soupRating: null, contestsWon: 0, favoursDone: 0 },
    flags: {},
    story: { day1Active: false, errands: {}, stage: "new", roccoArgue: null, gaveMayorSapling: false },
    patterns: Array(8).fill(null),
    chime: [0, 2, 4, 7, 4, 2, 0, -1, 0, 2, 4, 5, 7, 5, 4, -1],
    records: [],
    constellations: {},
    cheese: { day: 0, pattern: null, priceBuy: 100, owned: 0, boughtFor: 0, buyDay: 0 },
    festivals: {},
    contests: {},
    pimm: { visits: 0, cleanExit: true },
    meta: { lastSeenMs: null, firstSeenMs: null, exitedClean: true, absenceHandledMs: null }
  };
}
function migrate(w) {
  let guard = 0;
  while (w.v < SAVE_VERSION && guard++ < 50) {
    const m = MIGRATIONS[w.v];
    if (!m) throw new Error(`no migration from v${w.v}`);
    w = m(w);
  }
  return w;
}
function saveWorld(w, key2 = SAVE_KEY) {
  store.set(key2, w);
}
function loadWorld(key2 = SAVE_KEY) {
  const w = store.get(key2);
  if (!w) return null;
  try {
    return migrate(w);
  } catch {
    return null;
  }
}
var SAVE_KEY, SESSION_KEY, SAVE_VERSION, NEIGHBOUR_IDS, MIGRATIONS, hasSave, clearSave;
var init_save = __esm({
  "src/core/save.js"() {
    init_storage();
    init_town();
    init_startObjects();
    SAVE_KEY = "honk:save";
    SESSION_KEY = "honk:session";
    SAVE_VERSION = 3;
    NEIGHBOUR_IDS = ["dorrit", "tavi", "bartleby", "ottoline", "rocco", "nib", "ozzie", "yolanda", "fitch"];
    MIGRATIONS = {
      1: (w) => {
        w.pimm ??= { visits: 0, cleanExit: true };
        w.v = 2;
        return w;
      },
      2: (w) => {
        w.almanac.starNames ??= {};
        w.v = 3;
        return w;
      }
    };
    hasSave = (key2 = SAVE_KEY) => store.has(key2);
    clearSave = (key2 = SAVE_KEY) => store.remove(key2);
  }
});

// src/core/calendar.js
function villageDay(day) {
  const d = ((day - 1) % YEAR_DAYS + YEAR_DAYS) % YEAR_DAYS;
  const season = Math.floor(d / 4);
  const type = d % 4;
  return { calendarDay: d + 1, season, seasonId: SEASONS[season], type, festival: type === 3 ? FESTIVALS[season] : null, contest: type === 1 ? CONTESTS[season] : null, show: type === 2, market: type === 0 };
}
function realDay(ms) {
  const dt = new Date(ms - 5 * 3600 * 1e3);
  const m = dt.getMonth();
  const season = m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3;
  const middle = [3, 6, 9, 0][season];
  const wd = dt.getDay();
  const isMiddle = m === middle;
  const contestDay = nthWeekday(dt.getFullYear(), m, 3, 2);
  const festDay = lastWeekday(dt.getFullYear(), m, 6);
  const contest = isMiddle && dt.getDate() === contestDay ? CONTESTS[season] : null;
  const festival = isMiddle && dt.getDate() === festDay ? FESTIVALS[season] : null;
  const type = festival ? 3 : wd === 0 ? 0 : wd === 6 ? 2 : 1;
  return { calendarDay: dt.getDate(), season, seasonId: SEASONS[season], type, festival, contest, show: wd === 6 && !festival, market: wd === 0 };
}
function calendar(world, realMs = null) {
  if (world.clock.mode === "real" && (realMs ?? world.clock.realMs)) return realDay(realMs ?? world.clock.realMs);
  return villageDay(world.clock.day);
}
function formatTime(minute) {
  const h24 = Math.floor(minute / 60) % 24;
  const m = Math.floor(minute % 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}
function dateLine(world, realMs = null) {
  const c2 = calendar(world, realMs);
  return `${SEASON_NAMES[c2.season]} · ${DAY_TYPES[c2.type]} · ${formatTime(world.clock.minute)}`;
}
var SEASONS, SEASON_NAMES, DAY_TYPES, YEAR_DAYS, FESTIVALS, CONTESTS, nthWeekday, lastWeekday;
var init_calendar = __esm({
  "src/core/calendar.js"() {
    SEASONS = ["spring", "summer", "autumn", "winter"];
    SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
    DAY_TYPES = ["Market Day", "Errand Day", "Show Day", "Festival Day"];
    YEAR_DAYS = 16;
    FESTIVALS = ["seedToss", "lanternFloat", "greatSoup", "longNight"];
    CONTESTS = [null, "derby", "bugOff", "snowman"];
    nthWeekday = (year, month, weekday, n) => {
      const first = new Date(year, month, 1).getDay();
      return 1 + (weekday - first + 7) % 7 + (n - 1) * 7;
    };
    lastWeekday = (year, month, weekday) => {
      const last = new Date(year, month + 1, 0);
      return last.getDate() - (last.getDay() - weekday + 7) % 7;
    };
  }
});

// src/art/textures.js
function installTextures() {
  if (added) return;
  added = true;
  for (const t of ALL_TEXTURES) engine_exports.TEXTURE_LIBRARY.add(t);
}
var full, quiet, SURFACES, planks, tiles, plain, stripes, dots, brick, FLOORS, WALLS, ALL_TEXTURES, added, TEXTURES;
var init_textures = __esm({
  "src/art/textures.js"() {
    init_engine();
    full = (c2) => ({ path: "M0 0H32V32H0Z", fill: c2 });
    quiet = (id, about, a, b, c2, count = 9, seed = 4) => (0, engine_exports.textureDef)({
      id,
      about,
      tags: ["surface"],
      size: [32, 32],
      tile: true,
      palette: c2 ? { a, b, c: c2 } : { a, b },
      layers: [full("a"), { pattern: "scatter", colors: c2 ? ["b", "c"] : ["b"], count, size: 1, seed }]
    });
    SURFACES = [
      quiet("lawn-spring", "Spring lawn: lime with green and white specks", "lime", "green", "white", 10, 4),
      quiet("lawn-summer", "Summer lawn: green with lime specks", "green", "lime", null, 9, 4),
      quiet("lawn-autumn", "Autumn lawn: sand with orange specks", "sand", "orange", null, 9, 7),
      quiet("lawn-winter", "Winter lawn: snow with mist specks", "white", "mist", null, 7, 2),
      quiet("path-spring", "Spring path: sand with orange specks", "sand", "orange", null, 7, 11),
      quiet("path-summer", "Summer path: sand with orange specks", "sand", "orange", null, 7, 11),
      quiet("path-autumn", "Autumn path: orange with red specks", "orange", "red", null, 7, 12),
      quiet("path-winter", "Winter path: mist with slate specks", "mist", "slate", null, 6, 13),
      quiet("sand-spring", "Beach sand", "sand", "white", null, 8, 5),
      quiet("sand-summer", "Beach sand", "sand", "white", null, 8, 5),
      quiet("sand-autumn", "Pale autumn beach", "white", "sand", null, 8, 5),
      quiet("sand-winter", "Frosted beach", "white", "mist", "sky", 6, 5),
      (0, engine_exports.textureDef)({
        id: "plaza-warm",
        about: "Plaza paving, big quiet slabs",
        tags: ["surface"],
        size: [32, 32],
        tile: true,
        palette: { a: "mist", b: "slate" },
        layers: [full("a"), { pattern: "tiles", colors: ["b", "a", "a"], w: 16, h: 16, mortar: 1, seed: 3 }]
      }),
      (0, engine_exports.textureDef)({
        id: "plaza-winter",
        about: "Plaza paving under snow",
        tags: ["surface"],
        size: [32, 32],
        tile: true,
        palette: { a: "white", b: "mist" },
        layers: [full("a"), { pattern: "tiles", colors: ["b", "a", "a"], w: 16, h: 16, mortar: 1, seed: 3 }]
      }),
      (0, engine_exports.textureDef)({
        id: "cliff-warm",
        about: "Cliff face, layered rock",
        tags: ["surface"],
        size: [32, 32],
        tile: true,
        palette: { a: "slate", b: "night", c: "mist" },
        layers: [full("a"), { pattern: "bricks", colors: ["b", "a", "a"], w: 16, h: 8, mortar: 1, offset: 0.5, seed: 8 }, { pattern: "scatter", colors: ["c"], count: 6, size: 1, seed: 2 }]
      }),
      (0, engine_exports.textureDef)({
        id: "bank-warm",
        about: "River bank earth",
        tags: ["surface"],
        size: [32, 32],
        tile: true,
        palette: { a: "plum", b: "night" },
        layers: [full("a"), { pattern: "scatter", colors: ["b"], count: 10, size: 1, seed: 9 }]
      }),
      (0, engine_exports.textureDef)({
        id: "dock-boards",
        about: "Dock and bridge boards",
        tags: ["surface"],
        size: [32, 32],
        tile: true,
        palette: { a: "orange", b: "orange", c: "plum" },
        layers: [{ pattern: "planks", colors: ["c", "b", "a"], w: 8, gap: 1, length: 32, grain: 1, seed: 6 }]
      }),
      (0, engine_exports.textureDef)({
        id: "city-pavement",
        about: "City pavement",
        tags: ["surface"],
        size: [32, 32],
        tile: true,
        palette: { a: "slate", b: "night" },
        layers: [full("a"), { pattern: "tiles", colors: ["b", "a", "a"], w: 8, h: 8, mortar: 1, seed: 4 }]
      }),
      (0, engine_exports.textureDef)({
        id: "city-road",
        about: "City road, dark",
        tags: ["surface"],
        size: [32, 32],
        tile: true,
        palette: { a: "night", b: "ink" },
        layers: [full("a"), { pattern: "scatter", colors: ["b"], count: 8, size: 1, seed: 8 }]
      })
    ];
    planks = (id, a, b, c2) => (0, engine_exports.textureDef)({
      id,
      about: `Floor boards ${id}`,
      tags: ["surface", "floor"],
      size: [32, 32],
      tile: true,
      palette: { a, b, c: c2 },
      layers: [{ pattern: "planks", colors: ["c", "b", "a"], w: 8, gap: 1, length: 32, grain: 1, seed: 3 }]
    });
    tiles = (id, a, b) => (0, engine_exports.textureDef)({
      id,
      about: `Floor tiles ${id}`,
      tags: ["surface", "floor"],
      size: [32, 32],
      tile: true,
      palette: { a, b },
      layers: [{ pattern: "checker", colors: ["a", "b"], cell: 8 }]
    });
    plain = (id, a, b) => quiet(id, `Plain ${id}`, a, b, null, 8, 6);
    stripes = (id, a, b) => (0, engine_exports.textureDef)({
      id,
      about: `Wallpaper stripes ${id}`,
      tags: ["surface", "wall"],
      size: [32, 32],
      tile: true,
      palette: { a, b },
      layers: [{ pattern: "stripes", colors: ["a", "b"], width: 4, dir: "x" }]
    });
    dots = (id, a, b, seed = 7) => (0, engine_exports.textureDef)({
      id,
      about: `Wallpaper dots ${id}`,
      tags: ["surface", "wall"],
      size: [32, 32],
      tile: true,
      palette: { a, b },
      layers: [full("a"), { pattern: "scatter", colors: ["b"], count: 14, size: 2, seed }]
    });
    brick = (id, a, b, c2) => (0, engine_exports.textureDef)({
      id,
      about: `Wall bricks ${id}`,
      tags: ["surface", "wall"],
      size: [32, 32],
      tile: true,
      palette: { a, b, c: c2 },
      layers: [{ pattern: "bricks", colors: ["a", "b", "c"], w: 8, h: 4, seed: 2 }]
    });
    FLOORS = [
      planks("floor-oak", "orange", "orange", "red"),
      planks("floor-pine", "sand", "sand", "orange"),
      planks("floor-ash", "mist", "mist", "slate"),
      tiles("floor-chess", "white", "night"),
      tiles("floor-kitchen", "white", "sky"),
      tiles("floor-garish", "orange", "plum"),
      plain("floor-moss", "green", "teal"),
      plain("floor-sandy", "sand", "white"),
      plain("floor-carpet-red", "red", "plum"),
      plain("floor-carpet-blue", "navy", "blue"),
      plain("floor-cheese", "sand", "orange"),
      plain("floor-shag", "plum", "red"),
      planks("floor-gym", "sand", "sand", "orange"),
      tiles("floor-marble", "white", "mist"),
      plain("floor-night", "night", "ink")
    ];
    WALLS = [
      stripes("wall-cream", "white", "sand"),
      stripes("wall-mint", "lime", "white"),
      stripes("wall-sea", "sky", "white"),
      stripes("wall-plum", "plum", "red"),
      dots("wall-rose", "red", "orange"),
      dots("wall-night", "navy", "sand"),
      dots("wall-spores", "green", "lime"),
      dots("wall-cheese", "sand", "orange", 3),
      brick("wall-brick", "plum", "red", "orange"),
      brick("wall-stone", "night", "slate", "mist"),
      plain("wall-plaster", "white", "mist"),
      plain("wall-mud", "orange", "red"),
      plain("wall-teal", "teal", "green"),
      plain("wall-bureau", "mist", "slate"),
      stripes("wall-regal", "navy", "plum"),
      plain("wall-knit", "orange", "sand")
    ];
    ALL_TEXTURES = [...SURFACES, ...FLOORS, ...WALLS];
    added = false;
    TEXTURES = new engine_exports.TextureCatalog(ALL_TEXTURES);
  }
});

// src/ui/font.js
function textWidth(s, scale = 1) {
  let w = 0;
  for (const ch of s) {
    const g = GLYPHS[ch];
    w += (g ? g.w : SPACE_W) + 1;
  }
  return Math.max(0, (w - 1) * scale);
}
function drawText(hud, x, y, s, o = {}) {
  const { color = "ink", scale = 1, shadow = false, align = "left" } = o;
  let cx = x;
  if (align !== "left") {
    const w = textWidth(s, scale);
    cx = align === "center" ? x - Math.floor(w / 2) : x - w;
  }
  const start2 = cx;
  const sc = scale === 1 ? NOSHADOW1 : { shadow: false, scale };
  for (const ch of s) {
    const g = GLYPHS[ch];
    if (!g) {
      cx += (SPACE_W + 1) * scale;
      continue;
    }
    if (shadow) hud.sprite(cx + scale, y + scale, g.rows, col(shadow), sc);
    hud.sprite(cx, y, g.rows, col(color), sc);
    cx += (g.w + 1) * scale;
  }
  return cx - start2;
}
function wrap(s, width, scale = 1) {
  const lines = [];
  for (const para of s.split("\n")) {
    let line2 = "";
    for (const word of para.split(" ")) {
      const trial = line2 ? `${line2} ${word}` : word;
      if (textWidth(trial.replace(/[*|]/g, ""), scale) > width && line2) {
        lines.push(line2);
        line2 = word;
      } else line2 = trial;
    }
    lines.push(line2);
  }
  return lines;
}
var G, GLYPHS, SPACE_W, COLOR, colorCache, col, LINE_H, NOSHADOW1;
var init_font = __esm({
  "src/ui/font.js"() {
    G = {
      A: ".###./#...#/#...#/#####/#...#/#...#/#...#",
      B: "####./#...#/#...#/####./#...#/#...#/####.",
      C: ".###./#...#/#..../#..../#..../#...#/.###.",
      D: "####./#...#/#...#/#...#/#...#/#...#/####.",
      E: "#####/#..../#..../####./#..../#..../#####",
      F: "#####/#..../#..../####./#..../#..../#....",
      G: ".###./#...#/#..../#.###/#...#/#...#/.###.",
      H: "#...#/#...#/#...#/#####/#...#/#...#/#...#",
      I: "###/.#./.#./.#./.#./.#./###",
      J: "..###/...#./...#./...#./...#./#..#./.##..",
      K: "#...#/#..#./#.#../##.../#.#../#..#./#...#",
      L: "#..../#..../#..../#..../#..../#..../#####",
      M: "#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#",
      N: "#...#/##..#/#.#.#/#..##/#...#/#...#/#...#",
      O: ".###./#...#/#...#/#...#/#...#/#...#/.###.",
      P: "####./#...#/#...#/####./#..../#..../#....",
      Q: ".###./#...#/#...#/#...#/#.#.#/#..#./.##.#",
      R: "####./#...#/#...#/####./#.#../#..#./#...#",
      S: ".####/#..../#..../.###./....#/....#/####.",
      T: "#####/..#../..#../..#../..#../..#../..#..",
      U: "#...#/#...#/#...#/#...#/#...#/#...#/.###.",
      V: "#...#/#...#/#...#/#...#/#...#/.#.#./..#..",
      W: "#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#",
      X: "#...#/#...#/.#.#./..#../.#.#./#...#/#...#",
      Y: "#...#/#...#/.#.#./..#../..#../..#../..#..",
      Z: "#####/....#/...#./..#../.#.../#..../#####",
      a: "...../...../.###./....#/.####/#...#/.####",
      b: "#..../#..../####./#...#/#...#/#...#/####.",
      c: "...../...../.###./#...#/#..../#...#/.###.",
      d: "....#/....#/.####/#...#/#...#/#...#/.####",
      e: "...../...../.###./#...#/#####/#..../.###.",
      f: "..##./.#../.#../####/.#../.#../.#..",
      g: "...../...../.####/#...#/#...#/#...#/.####/....#/.###.",
      h: "#..../#..../####./#...#/#...#/#...#/#...#",
      i: "#/./#/#/#/#/#",
      j: "..#/.../..#/..#/..#/..#/..#/#.#/.#.",
      k: "#.../#.../#..#/#.#./##../#.#./#..#",
      l: "##./.#./.#./.#./.#./.#./###",
      m: "...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#",
      n: "...../...../####./#...#/#...#/#...#/#...#",
      o: "...../...../.###./#...#/#...#/#...#/.###.",
      p: "...../...../####./#...#/#...#/#...#/####./#..../#....",
      q: "...../...../.####/#...#/#...#/#...#/.####/....#/....#",
      r: "..../..../#.##/##../#.../#.../#...",
      s: "...../...../.####/#..../.###./....#/####.",
      t: ".#../.#../####/.#../.#../.#../..##",
      u: "...../...../#...#/#...#/#...#/#...#/.####",
      v: "...../...../#...#/#...#/#...#/.#.#./..#..",
      w: "...../...../#...#/#...#/#.#.#/#.#.#/.#.#.",
      x: "...../...../#...#/.#.#./..#../.#.#./#...#",
      y: "...../...../#...#/#...#/#...#/#...#/.####/....#/.###.",
      z: "...../...../#####/...#./..#../.#.../#####",
      0: ".###./#...#/#..##/#.#.#/##..#/#...#/.###.",
      1: ".#./##./.#./.#./.#./.#./###",
      2: ".###./#...#/....#/...#./..#../.#.../#####",
      3: "####./....#/....#/.###./....#/....#/####.",
      4: "...#./..##./.#.#./#..#./#####/...#./...#.",
      5: "#####/#..../####./....#/....#/#...#/.###.",
      6: ".###./#..../#..../####./#...#/#...#/.###.",
      7: "#####/....#/...#./..#../..#../..#../..#..",
      8: ".###./#...#/#...#/.###./#...#/#...#/.###.",
      9: ".###./#...#/#...#/.####/....#/....#/.###.",
      ".": "././././././#",
      ",": "../../../../../.#/.#/#.",
      "!": "#/#/#/#/#/./#",
      "?": ".###./#...#/....#/...#./..#../...../..#..",
      "'": "#/#/./././././.",
      '"': "#.#/#.#/.../.../.../.../...",
      ":": "./#/#/./#/#/.",
      ";": "../.#/.#/../.#/.#/#.",
      "-": "..../..../..../####/..../..../....",
      "+": "...../..#../..#../#####/..#../..#../.....",
      "=": "..../..../####/..../####/..../....",
      "/": "....#/....#/...#./..#../.#.../#..../#....",
      "(": ".#/#./#./#./#./#./.#",
      ")": "#./.#/.#/.#/.#/.#/#.",
      "[": "##/#./#./#./#./#./##",
      "]": "##/.#/.#/.#/.#/.#/##",
      "%": "#...#/...#./...#./..#../.#.../.#.../#...#",
      "&": ".##../#..#./#.#../.#.../#.#.#/#..#./.##.#",
      "*": "...../#.#.#/.###./#####/.###./#.#.#/.....",
      "_": "...../...../...../...../...../...../#####",
      "<": "...#/..#./.#../#.../.#../..#./...#",
      ">": "#.../.#../..#./...#/..#./.#../#...",
      "#": ".#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.",
      "@": ".###./#...#/#.###/#.#.#/#.###/#..../.###.",
      "~": "...../...../.#..#/#.##./...../...../.....",
      "|": "#/#/#/#/#/#/#",
      "$": "..#../.####/#.#../.###./..#.#/####./..#..",
      "^": "..#../.#.#./#...#/...../...../...../.....",
      "♪": "..###/..#.#/..#.#/..#../###../###../.#...",
      "★": "..#../..#../#####/.###./.#.#./#...#/.....",
      "♥": ".#.#./#####/#####/.###./..#../...../.....",
      "…": "...../...../...../...../...../...../#.#.#",
      "—": "...../...../...../#####/...../...../.....",
      "·": "../../../##/##/../..",
      "’": "#/#/./././././.",
      "✕": "#...#/.#.#./..#../.#.#./#...#/...../.....",
      "○": ".###./#...#/#...#/#...#/.###./...../.....",
      "□": "#####/#...#/#...#/#...#/#####/...../.....",
      "△": "..#../.#.#./.#.#./#...#/#####/...../.....",
      "é": "...#./..#../.###./#...#/#####/#..../.###.",
      "à": ".#.../..#../.###./....#/.####/#...#/.####"
    };
    GLYPHS = {};
    for (const [ch, s] of Object.entries(G)) {
      const rows = s.split("/");
      const w = Math.max(...rows.map((r) => r.length));
      GLYPHS[ch] = { rows: rows.map((r) => r.padEnd(w, ".")), w, skip: false };
    }
    SPACE_W = 3;
    COLOR = (c2) => ({ "#": c2 });
    colorCache = /* @__PURE__ */ new Map();
    col = (c2) => {
      let v2 = colorCache.get(c2);
      if (!v2) colorCache.set(c2, v2 = COLOR(c2));
      return v2;
    };
    LINE_H = 12;
    NOSHADOW1 = { shadow: false };
  }
});

// src/art/critter.js
function critterDef(spec) {
  const s = {
    legH: 0.26,
    legW: 0.2,
    bodyW: 0.56,
    bodyH: 0.42,
    bodyD: 0.46,
    headW: 0.86,
    headH: 0.78,
    headD: 0.78,
    head: "round",
    ears: "round",
    tail: "none",
    features: [],
    body: [],
    eyeGap: 0.2,
    eyeY: 0.56,
    eyeW: 0.11,
    eyeH: 0.17,
    ...spec
  };
  const dims = { headW: s.headW, headH: s.headH, headD: s.headD, bodyH: s.bodyH, bodyW: s.bodyW, bodyD: s.bodyD };
  const palette = { ...SLOTS, ...s.colors };
  const head = [
    ...shapes[s.head](dims),
    ...ears[s.ears](s.headW, s.headH),
    ...s.features.flatMap((f) => Array.isArray(f) ? FEATURES[f[0]](dims, f[1]) : FEATURES[f](dims)),
    joint("EyeR", [-s.headW * s.eyeGap / 0.86, s.headH * s.eyeY, s.headD * 0.47], [B(s.eyeW, s.eyeH, 0.05, 0, 0, 0, "eye")]),
    joint("EyeL", [s.headW * s.eyeGap / 0.86, s.headH * s.eyeY, s.headD * 0.47], [B(s.eyeW, s.eyeH, 0.05, 0, 0, 0, "eye")]),
    joint("Mouth", [0, s.headH * (s.mouthY ?? 0.26), s.headD * (s.mouthZ ?? 0.5)], [B(0.18, 0.05, 0.04, 0, 0, 0, "dark")]),
    ...s.headParts ?? []
  ];
  const arm = s.armW ?? 0.15;
  const armL = s.armH ?? 0.34;
  const armPart = (x) => [B(arm, armL, arm, x * 0.1, -armL * 0.5, 0, s.sleeve ? "shirt" : "fur"), BALL(arm * 1.3, arm * 1.2, arm * 1.3, x * 0.1, -armL, 0, s.paw ?? "fur")];
  const legCol = s.legColor ?? "fur";
  const leg = (x) => [B(s.legW, s.legH, s.legW, 0, -s.legH / 2 + 0.02, 0, legCol), B(s.legW * 1.1, 0.08, s.legW * 1.5, 0, -s.legH + 0.04, 0.05, s.footColor ?? (legCol === "fur" ? "dark" : legCol))];
  const torso = [
    (s.bodyShape === "box" ? B : BALL)(s.bodyW, s.bodyH + 0.1, s.bodyD, 0, s.bodyH * 0.46, 0, s.shirtless ? "fur" : "shirt", { seg: 10 }),
    ...s.body.flatMap((f) => Array.isArray(f) ? BODY[f[0]](dims, f[1]) : BODY[f](dims)),
    ...s.torsoParts ?? [],
    joint("Head", [0, s.bodyH * (s.headJoint ?? 0.86) + (s.neckH ?? 0), s.headOff ?? 0], [...s.neckH ? [CYL(0.24, s.neckH + 0.22, 0.24, 0, -s.neckH * 0.5 - 0.02, -(s.headOff ?? 0), "fur")] : [], ...head]),
    joint("ArmR", [-s.bodyW / 2 - 0.04, s.bodyH * 0.74, 0], armPart(-1)),
    joint("ArmL", [s.bodyW / 2 + 0.04, s.bodyH * 0.74, 0], armPart(1))
  ];
  return (0, engine_exports.model)({
    id: `critter-${s.id}`,
    about: s.about ?? `${s.id}, a character`,
    tags: ["character", "critter"],
    palette,
    parts: [joint("Pelvis", [0, s.legH, 0], [
      joint("Torso", [0, 0, 0], torso),
      joint("LegR", [-(s.hipGap ?? 0.15), 0, 0], leg(-1)),
      joint("LegL", [s.hipGap ?? 0.15, 0, 0], leg(1)),
      ...TAIL[s.tail](dims),
      ...s.tailRings ? Array.from({ length: s.tailRings }, (_, i) => joint(`TailSeg${i}`, [0, 0.1 + i * 0.12, -0.3 - i * 0.12], [B(0.17, 0.17, 0.17, 0, 0, 0, i % 2 ? "white" : "dark")])) : [],
      ...s.pelvisParts ?? []
    ])]
  });
}
function avatarDef(look, id = "avatar") {
  const w = 0.82, h = 0.8, d = 0.78;
  const [ew, eh] = eyeParts(look.eyes ?? 0);
  const palette = {
    skin: look.skin ?? "sand",
    cheek: look.cheek ?? "orange",
    hair: look.hairColor ?? "plum",
    eye: "ink",
    dark: "ink",
    shirt: look.shirt ?? "blue",
    trim: look.trim ?? "white",
    legs: look.legs ?? "navy",
    shoes: look.shoes ?? "plum",
    hat: look.hatColor ?? "red",
    hatTrim: look.hatTrim ?? "white",
    glasses: look.glassesColor ?? "night"
  };
  const head = [
    BALL(w, h, d, 0, h / 2, 0, "skin", { name: "skull", seg: 10 }),
    BALL(0.14, 0.1, 0.1, 0, h * 0.4, d * 0.5, "cheek"),
    mirrorX([BALL(0.14, 0.09, 0.05, 0.29, h * 0.36, d * 0.42, "cheek")]),
    joint("Hair", [0, 0, 0], hairParts(look.hair ?? 0, w, h, d)),
    joint("EyeR", [-0.18, h * 0.54, d * 0.47], [B(ew, eh, 0.05, 0, 0, 0, "eye")]),
    joint("EyeL", [0.18, h * 0.54, d * 0.47], [B(ew, eh, 0.05, 0, 0, 0, "eye")]),
    joint("Mouth", [0, h * 0.26, d * 0.49], [B(0.16, 0.05, 0.04, 0, 0, 0, "dark")])
  ];
  if (look.hat && HATS[look.hat]) head.push(joint("Hat", [0, 0, 0], HATS[look.hat](h)));
  if (look.glasses && GLASSES[look.glasses]) head.push(joint("Glasses", [0, 0, 0], GLASSES[look.glasses](h, d)));
  const arm = (x) => [B(0.14, 0.3, 0.14, x * 0.08, -0.15, 0, "shirt"), BALL(0.17, 0.17, 0.17, x * 0.08, -0.32, 0, "skin")];
  const leg = () => [B(0.18, 0.24, 0.18, 0, -0.1, 0, "legs"), B(0.2, 0.08, 0.28, 0, -0.2, 0.05, "shoes")];
  return (0, engine_exports.model)({
    id,
    about: "The player: a small round person of no particular species",
    tags: ["character", "player"],
    palette,
    parts: [joint("Pelvis", [0, 0.24, 0], [
      joint("Torso", [0, 0, 0], [
        BALL(0.54, 0.5, 0.44, 0, 0.2, 0, "shirt", { name: "shirtBody", seg: 10 }),
        B(0.54, 0.06, 0.42, 0, 0, 0, "trim"),
        joint("Head", [0, 0.36, 0], head),
        joint("ArmR", [-0.3, 0.32, 0], arm(-1)),
        joint("ArmL", [0.3, 0.32, 0], arm(1))
      ]),
      joint("LegR", [-0.13, 0, 0], leg()),
      joint("LegL", [0.13, 0, 0], leg())
    ])]
  });
}
var B, BALL, CONE, CYL, joint, mirrorX, SLOTS, ears, shapes, FEATURES, BODY, TAIL, c, CRITTERS, CROWD_SPECIES, CRITTER_DEFS, CROWD_DEFS, HAIR_STYLES, HAIR_COLORS, EYE_STYLES, hairParts, HATS, GLASSES, eyeParts;
var init_critter = __esm({
  "src/art/critter.js"() {
    init_engine();
    B = (w, h, d, x, y, z, c2, o = {}) => ({ box: [w, h, d], at: [x, y, z], c: c2, ...o });
    BALL = (w, h, d, x, y, z, c2, o = {}) => ({ ball: [w, h, d], at: [x, y, z], c: c2, ...o });
    CONE = (w, h, d, x, y, z, c2, o = {}) => ({ cone: [w, h, d], at: [x, y, z], c: c2, ...o });
    CYL = (w, h, d, x, y, z, c2, o = {}) => ({ cyl: [w, h, d], at: [x, y, z], c: c2, ...o });
    joint = (name, at, parts) => ({ group: parts, at, pivot: true, name });
    mirrorX = (parts) => ({ mirror: parts, axis: "x" });
    SLOTS = { fur: "mist", belly: "white", dark: "ink", shirt: "blue", trim: "white", eye: "ink", accent: "red", extra: "sand", white: "white", orange: "orange", sand: "sand", red: "red", plum: "plum" };
    ears = {
      none: () => [],
      round: (hw, hh) => [mirrorX([BALL(0.3, 0.3, 0.14, hw * 0.42, hh * 0.92, 0, "fur")]), mirrorX([BALL(0.16, 0.16, 0.06, hw * 0.42, hh * 0.92, 0.07, "belly")])],
      small: (hw, hh) => [mirrorX([BALL(0.2, 0.2, 0.12, hw * 0.42, hh * 0.9, 0, "fur")])],
      long: (hw, hh) => [mirrorX([BALL(0.2, 0.56, 0.14, hw * 0.24, hh * 1.16, -0.02, "fur", { rot: [0, 0, -8] })]), mirrorX([BALL(0.1, 0.36, 0.05, hw * 0.24, hh * 1.14, 0.05, "belly", { rot: [0, 0, -8] })])],
      pointy: (hw, hh) => [mirrorX([CONE(0.26, 0.32, 0.14, hw * 0.34, hh * 1.04, 0, "fur", { rot: [0, 0, -14] })])],
      side: (hw, hh) => [mirrorX([BALL(0.34, 0.16, 0.1, hw * 0.6, hh * 0.68, 0, "fur", { rot: [0, 0, 18] })])],
      big: (hw, hh) => [mirrorX([BALL(0.44, 0.44, 0.1, hw * 0.52, hh * 0.92, -0.02, "fur")]), mirrorX([BALL(0.26, 0.26, 0.05, hw * 0.52, hh * 0.92, 0.04, "belly")])]
    };
    shapes = {
      /** Round furred head. */
      round: ({ headW: w, headH: h, headD: d }) => [BALL(w, h, d, 0, h / 2, 0, "fur", { name: "skull", seg: 10 })],
      wide: ({ headW: w, headH: h, headD: d }) => [BALL(w * 1.08, h * 0.92, d, 0, h * 0.46, 0, "fur", { name: "skull", seg: 10 })],
      long: ({ headW: w, headH: h, headD: d }) => [BALL(w * 0.84, h * 1.06, d * 0.92, 0, h * 0.53, 0, "fur", { name: "skull", seg: 10 })],
      box: ({ headW: w, headH: h, headD: d }) => [B(w * 0.92, h * 0.92, d * 0.9, 0, h * 0.46, 0, "fur", { name: "skull" })]
    };
    FEATURES = {
      snout: ({ headH: h, headD: d }, o = {}) => [BALL(o.w ?? 0.38, o.h ?? 0.26, 0.24, 0, h * (o.y ?? 0.36), d * 0.46, o.c ?? "belly"), B(o.nw ?? 0.14, 0.1, 0.06, 0, h * ((o.y ?? 0.36) + 0.06), d * 0.46 + 0.12, "dark")],
      bigNose: ({ headH: h, headD: d }) => [BALL(0.46, 0.3, 0.2, 0, h * 0.34, d * 0.48, "dark")],
      bill: ({ headH: h, headD: d }) => [B(0.56, 0.1, 0.42, 0, h * 0.36, d * 0.54, "accent"), B(0.48, 0.08, 0.36, 0, h * 0.28, d * 0.52, "dark")],
      beak: ({ headH: h, headD: d }, o = {}) => [CONE(o.w ?? 0.24, o.l ?? 0.42, o.w ?? 0.2, 0, h * 0.4, d * 0.56, "accent", { rot: [90, 0, 0] })],
      antlers: ({ headH: h }) => [mirrorX([
        CYL(0.1, 0.34, 0.1, 0.26, h + 0.1, 0, "dark"),
        B(0.56, 0.1, 0.2, 0.48, h + 0.28, 0, "extra"),
        B(0.1, 0.26, 0.12, 0.34, h + 0.42, 0, "extra"),
        B(0.1, 0.3, 0.12, 0.54, h + 0.44, 0, "extra"),
        B(0.1, 0.34, 0.12, 0.72, h + 0.42, 0, "extra")
      ])],
      laundry: ({ headH: h }) => [B(0.42, 0.36, 0.05, -0.56, h + 0.02, 0.04, "accent", { rot: [0, 0, -6] }), B(0.28, 0.24, 0.05, 0.56, h + 0.08, 0.04, "white", { rot: [0, 0, 8] })],
      tiara: ({ headH: h }) => [B(0.42, 0.08, 0.3, 0, h * 0.98, 0, "extra"), CONE(0.12, 0.18, 0.08, 0, h * 1.08, 0.04, "extra"), mirrorX([CONE(0.1, 0.13, 0.08, 0.15, h * 1.05, 0.04, "extra")])],
      bandsHead: ({ headH: h, headW: w }) => [B(w * 0.7, 0.08, 0.72, 0, h * 0.86, 0, "dark"), B(w * 0.82, 0.08, 0.76, 0, h * 0.74, -0.02, "dark")],
      eyeRings: ({ headW: w, headH: h, headD: d }) => [mirrorX([BALL(0.26, 0.28, 0.06, w * 0.24, h * 0.58, d * 0.46, "dark")])],
      mask: ({ headW: w, headH: h, headD: d }) => [B(w * 0.72, 0.14, 0.04, 0, h * 0.6, d * 0.47, "dark")],
      stripe: ({ headH: h, headD: d }) => [B(0.12, 0.42, d * 0.92, 0, h * 0.86, -0.02, "dark")],
      fluffyTop: ({ headH: h }) => [BALL(0.6, 0.32, 0.5, 0, h * 0.98, -0.02, "extra")],
      hairCurtain: ({ headW: w, headH: h, headD: d }) => [
        BALL(w * 1.1, h * 0.7, d * 1.02, 0, h * 0.78, -0.02, "extra"),
        mirrorX([B(0.3, h * 0.92, d * 0.84, w * 0.42, h * 0.34, -0.03, "extra")]),
        B(w * 0.5, h * 0.3, 0.06, 0, h * 0.88, d * 0.47, "extra")
      ],
      horns: ({ headH: h, headW: w }) => [mirrorX([CONE(0.14, 0.42, 0.14, w * 0.48, h * 0.96, 0, "dark", { rot: [0, 0, -38] })])],
      spectacles: ({ headW: w, headH: h, headD: d }) => [mirrorX([{ torus: [0.24, 0.05, 0.24], at: [w * 0.2, h * 0.58, d * 0.5], rot: [90, 0, 0], c: "trim" }]), B(0.1, 0.04, 0.04, 0, h * 0.58, d * 0.5, "trim")],
      bigGlasses: ({ headW: w, headH: h, headD: d }) => [mirrorX([{ torus: [0.32, 0.06, 0.32], at: [w * 0.22, h * 0.58, d * 0.5], rot: [90, 0, 0], c: "trim" }]), B(0.1, 0.05, 0.05, 0, h * 0.58, d * 0.5, "trim")],
      sleepyLids: ({ headW: w, headH: h, headD: d }) => [mirrorX([B(0.2, 0.08, 0.05, w * 0.2, h * 0.68, d * 0.48, "fur")])],
      antennae: ({ headH: h }) => [mirrorX([{ tube: [[0, 0, 0], [0.08, 0.22, 0.02], [0.24, 0.36, 0.02]], r: 0.03, at: [0.12, h * 0.92, 0.1], c: "dark" }, BALL(0.14, 0.14, 0.14, 0.36, h * 0.92 + 0.36, 0.12, "extra")])],
      beeHat: ({ headH: h }) => [{ group: [BALL(0.2, 0.16, 0.16, 0, 0, 0, "extra"), B(0.06, 0.16, 0.17, 0.03, 0, 0, "dark"), mirrorX([BALL(0.1, 0.06, 0.12, 0.04, 0.09, -0.04, "white", { rot: [0, 0, 18] })])], at: [0.04, h + 0.08, 0.02], pivot: true, name: "Bee" }],
      lashes: ({ headW: w, headH: h, headD: d }) => [mirrorX([B(0.2, 0.05, 0.05, w * 0.22, h * 0.72, d * 0.48, "dark", { rot: [0, 0, 12] })])],
      whiskers: ({ headH: h, headD: d }) => [mirrorX([B(0.32, 0.03, 0.03, 0.34, h * 0.34, d * 0.4, "dark")])],
      topHat: ({ headH: h }) => [CYL(0.7, 0.06, 0.7, 0, h * 0.98, 0, "dark"), CYL(0.46, 0.42, 0.46, 0, h * 1.2, 0, "dark"), B(0.48, 0.08, 0.48, 0, h * 1.06, 0, "accent")],
      fez: ({ headH: h }) => [CYL(0.34, 0.26, 0.34, 0, h * 1.08, 0, "accent", { top: 0.8 })],
      captainHat: ({ headH: h }) => [CYL(0.72, 0.16, 0.72, 0, h * 0.98, 0, "shirt", { top: 1.15 }), B(0.5, 0.05, 0.2, 0, h * 0.94, 0.3, "dark")],
      hood: ({ headH: h }) => [BALL(0.96, 0.7, 0.86, 0, h * 0.72, -0.04, "accent")],
      neck: () => []
    };
    BODY = {
      bands: ({ bodyH: h, bodyW: w }) => [0.28, 0.5, 0.72].map((t) => B(w * 1.03, 0.06, 0.48, 0, h * t, 0, "dark")),
      bellyPatch: ({ bodyH: h, bodyW: w, bodyD: d }) => [BALL(w * 0.72, h * 0.72, 0.16, 0, h * 0.46, d * 0.42, "belly")],
      waistcoat: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 0.8, h * 0.7, 0.05, 0, h * 0.5, d * 0.5, "trim"), B(0.08, h * 0.6, 0.06, 0, h * 0.5, d * 0.51, "dark")],
      sash: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(0.14, h * 1.1, 0.05, 0, h * 0.5, d * 0.5, "accent", { rot: [0, 0, 32] })],
      wings: ({ bodyH: h, bodyW: w }) => [mirrorX([BALL(0.2, h * 0.86, 0.4, w * 0.56, h * 0.5, 0, "fur")])],
      mothWings: ({ bodyH: h, bodyW: w }) => [mirrorX([BALL(0.86, 0.86, 0.06, w * 0.76, h * 0.82, -0.26, "accent", { rot: [0, 22, 14] }), BALL(0.4, 0.4, 0.05, w * 0.82, h * 0.86, -0.22, "extra", { rot: [0, 22, 14] })])],
      batWings: ({ bodyH: h, bodyW: w }) => [mirrorX([{ slab: [[0, 0.5], [0.72, 0.42], [0.82, -0.16], [0.46, 0], [0.22, -0.18], [0, 0]], depth: 0.05, at: [w * 0.42, h * 0.34, -0.14], c: "dark" }])],
      scales: ({ bodyH: h, bodyW: w, bodyD: d }) => [0.2, 0.46, 0.72].flatMap((t) => [-0.16, 0.16].map((x) => B(0.22, 0.12, 0.12, x, h * t, -d * 0.44, "dark", { rot: [20, 0, 0] }))),
      cardigan: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 1.06, h * 0.86, d * 1.06, 0, h * 0.46, 0, "shirt"), B(0.08, h * 0.8, 0.04, 0, h * 0.46, d * 0.55, "trim")],
      shell: ({ bodyH: h, bodyD: d }) => [
        BALL(0.86, 0.86, 0.5, 0, h * 0.5, -d * 0.62, "accent", { rot: [0, 0, 0] }),
        { torus: [0.52, 0.1, 0.52], at: [0, h * 0.5, -d * 0.62 + 0.24], rot: [90, 0, 0], c: "extra" },
        BALL(0.2, 0.2, 0.14, 0, h * 0.5, -d * 0.62 + 0.26, "dark")
      ],
      cabinet: ({ bodyH: h, bodyD: d }) => [
        B(0.96, 0.96, 0.54, 0, h * 0.72, -d * 0.62, "extra"),
        B(0.84, 0.44, 0.05, 0, h * 1.08, -d * 0.62 + 0.28, "shirt"),
        B(0.84, 0.44, 0.05, 0, h * 0.58, -d * 0.62 + 0.28, "shirt"),
        B(0.2, 0.06, 0.06, 0, h * 1.08, -d * 0.62 + 0.32, "dark"),
        B(0.2, 0.06, 0.06, 0, h * 0.58, -d * 0.62 + 0.32, "dark")
      ],
      apron: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 0.74, h * 0.8, 0.05, 0, h * 0.42, d * 0.5, "trim")],
      bowtie: ({ bodyH: h, bodyD: d }) => [mirrorX([CONE(0.16, 0.16, 0.08, 0.09, h * 0.92, d * 0.46, "accent", { rot: [0, 0, 90] })])],
      scarf: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 0.88, 0.14, d * 0.9, 0, h * 0.96, 0, "accent"), B(0.14, 0.34, 0.05, 0.16, h * 0.72, d * 0.48, "accent")],
      pearls: ({ bodyH: h, bodyW: w, bodyD: d }) => [-0.2, -0.1, 0, 0.1, 0.2].map((x) => BALL(0.08, 0.08, 0.08, x, h * 0.86 - Math.abs(x) * -0.2 - 0.04, d * 0.5, "white")),
      neck: ({ bodyH: h }, o) => []
    };
    TAIL = {
      none: () => [],
      nub: () => [BALL(0.18, 0.18, 0.18, 0, 0.08, -0.26, "fur")],
      flat: () => [B(0.34, 0.08, 0.5, 0, 0, -0.38, "dark")],
      fluffy: () => [BALL(0.4, 0.44, 0.5, 0, 0.14, -0.36, "fur")],
      long: () => [B(0.1, 0.1, 0.5, 0, 0.1, -0.42, "dark", { rot: [12, 0, 0] })],
      fan: () => [mirrorX([CONE(0.18, 0.34, 0.08, 0.12, 0.18, -0.26, "fur", { rot: [-40, 0, -18] })]), CONE(0.2, 0.42, 0.1, 0, 0.22, -0.28, "fur", { rot: [-40, 0, 0] })],
      bands: () => [BALL(0.2, 0.2, 0.46, 0, 0.04, -0.4, "dark")],
      shelltail: () => []
    };
    c = (fur, belly, dark, shirt, trim, accent, extra, eye = "ink") => ({ fur, belly, dark, shirt, trim, accent, extra, eye });
    CRITTERS = {
      dorrit: { about: "Dorrit, a stout wombat in an apron", head: "wide", ears: "small", features: [["snout", { w: 0.46, h: 0.3, nw: 0.26, c: "fur" }]], body: ["apron"], bodyW: 0.68, bodyD: 0.56, legH: 0.22, tail: "nub", colors: c("orange", "sand", "plum", "red", "white", "red", "sand") },
      tavi: { about: "Tavi, a beaming quokka in yellow", ears: "round", features: [["snout", { w: 0.3, h: 0.2, nw: 0.1, y: 0.34, c: "sand" }]], mouthZ: 0.52, body: ["bellyPatch"], eyeW: 0.13, eyeH: 0.2, colors: c("orange", "sand", "plum", "sand", "white", "red", "lime") },
      bartleby: { about: "Bartleby, a moose with laundry stuck on his antlers", head: "long", ears: "side", features: ["antlers", "laundry", "bigNose"], bodyW: 0.62, legH: 0.34, sleeve: true, eyeY: 0.66, mouthY: 0.16, colors: c("plum", "sand", "ink", "night", "mist", "sky", "sand") },
      ottoline: { about: "Lady Ottoline, a platypus with a tiara and pearls", ears: "none", features: ["bill", "tiara", "lashes"], body: ["pearls"], tail: "flat", mouthY: 0.22, mouthZ: 0.76, colors: c("plum", "sand", "ink", "plum", "white", "orange", "sand") },
      rocco: { about: "Rocco, an armadillo in bands and a sweatband", ears: "pointy", features: ["bandsHead", ["snout", { w: 0.28, h: 0.2, nw: 0.1 }]], body: ["bands"], tail: "bands", headW: 0.78, bodyW: 0.62, shirtless: true, colors: c("mist", "white", "slate", "red", "white", "red", "sand") },
      nib: { about: "Nib, a lemur with huge eyes and a ringed tail", ears: "pointy", features: ["eyeRings", ["snout", { w: 0.2, h: 0.16, nw: 0.1, y: 0.38, c: "white" }]], body: ["bellyPatch"], eyeW: 0.13, eyeH: 0.16, shirtless: true, legH: 0.3, tailRings: 6, colors: c("mist", "white", "ink", "navy", "white", "red", "sand", "sand") },
      ozzie: { about: "Ozzie, a suspicious possum in a trench coat", ears: "big", features: [["snout", { w: 0.32, h: 0.22, nw: 0.1, c: "white" }], "whiskers"], tail: "long", sleeve: true, colors: c("slate", "white", "ink", "orange", "sand", "red", "sand") },
      yolanda: { about: "Yolanda, a yak under a curtain of hair and knitting", ears: "none", head: "wide", features: ["hairCurtain", "horns"], body: ["cardigan"], bodyW: 0.72, bodyD: 0.6, eyeY: 0.48, mouthY: 0.2, colors: c("plum", "sand", "ink", "orange", "sand", "red", "plum") },
      fitch: { about: "Fitch, a long thin ferret in a loud jacket", ears: "small", head: "long", features: ["mask", ["snout", { w: 0.24, h: 0.16, nw: 0.1, c: "white" }]], bodyW: 0.42, bodyH: 0.56, bodyD: 0.34, legH: 0.2, tail: "long", sleeve: true, colors: c("sand", "white", "ink", "green", "sand", "red", "sand") },
      gander: { about: "Mrs. Gander, a goose in spectacles and a waistcoat", ears: "none", headW: 0.56, headH: 0.56, headD: 0.56, neckH: 0.56, headOff: 0.1, bodyW: 0.74, bodyD: 0.72, legH: 0.26, legW: 0.1, legColor: "orange", features: ["beak", "spectacles"], body: ["waistcoat", "wings"], tail: "fan", shirtless: true, eyeW: 0.08, eyeH: 0.11, mouthZ: 0.72, armH: 0.01, armW: 0.02, colors: c("white", "white", "ink", "navy", "red", "orange", "sand") },
      clementine: { about: "Clementine, an unflappable capybara with a bee on her head", head: "box", ears: "small", features: [["snout", { w: 0.54, h: 0.34, nw: 0.3, c: "fur" }], "beeHat", "sleepyLids"], bodyW: 0.68, bodyD: 0.6, eyeY: 0.62, mouthY: 0.16, mouthZ: 0.62, colors: c("orange", "sand", "plum", "teal", "white", "red", "sand") },
      trundle: { about: "Mayor Trundle, a very small snail in a sash", ears: "none", features: ["antennae"], body: ["shell", "sash"], shirtless: true, legH: 0.22, legW: 0.3, bodyW: 0.56, bodyH: 0.44, headW: 0.62, headH: 0.56, headD: 0.6, armH: 0.01, armW: 0.02, colors: c("lime", "white", "ink", "plum", "white", "orange", "red") },
      quill: { about: "Dr. Quill, a near-sighted pangolin in huge glasses", ears: "small", head: "long", features: ["bigGlasses", ["snout", { w: 0.22, h: 0.18, nw: 0.1, c: "fur" }]], body: ["scales"], tail: "nub", eyeW: 0.14, eyeH: 0.2, colors: c("orange", "sand", "plum", "plum", "sand", "red", "sand") },
      mothwick: { about: "Madame Mothwick, a dramatic moth in a shawl", ears: "none", features: ["antennae"], body: ["mothWings", "scarf"], eyeW: 0.2, eyeH: 0.24, eye: "ink", shirtless: true, headW: 0.7, headH: 0.64, headD: 0.64, colors: c("mist", "white", "ink", "white", "white", "plum", "sand") },
      rind: { about: "Old Rind, a whispering stoat in a long coat", ears: "small", head: "long", features: [["snout", { w: 0.22, h: 0.16, nw: 0.1, c: "white" }]], bodyW: 0.42, bodyH: 0.52, bodyD: 0.36, sleeve: true, tail: "long", colors: c("sand", "white", "ink", "night", "mist", "red", "sand") },
      vesper: { about: "Vesper, a fruit bat with tiny accordion", ears: "big", features: [["snout", { w: 0.24, h: 0.18, nw: 0.1, c: "orange" }]], body: ["batWings"], shirtless: true, headW: 0.68, headH: 0.62, headD: 0.62, colors: c("plum", "orange", "ink", "plum", "white", "red", "sand") },
      hester: { about: "Hester, a llama in a bus driver cap", head: "long", ears: "long", neckH: 0.2, headW: 0.62, features: ["captainHat", ["snout", { w: 0.32, h: 0.24, nw: 0.14, c: "white" }]], sleeve: true, eyeY: 0.62, colors: c("white", "sand", "plum", "navy", "sand", "red", "sand") },
      fleece: { about: "Monsieur Fleece, an alpaca with magnificent hair", head: "long", ears: "pointy", neckH: 0.26, headW: 0.62, features: ["fluffyTop", ["snout", { w: 0.28, h: 0.2, nw: 0.12, c: "white" }]], body: ["bowtie"], colors: c("sand", "white", "plum", "teal", "white", "red", "orange") },
      flavia: { about: "Flavia Rosé, a flamingo on stilt legs in couture", ears: "none", legH: 0.72, legW: 0.07, legColor: "red", footColor: "plum", hipGap: 0.08, headW: 0.5, headH: 0.5, headD: 0.5, neckH: 0.4, headOff: 0.08, bodyW: 0.62, bodyD: 0.6, bodyH: 0.36, features: ["beak", "lashes"], body: ["wings"], shirtless: true, armH: 0.01, armW: 0.02, eyeW: 0.08, eyeH: 0.1, mouthZ: 0.72, colors: c("orange", "white", "ink", "plum", "white", "ink", "sand") },
      magda: { about: "Magda, a magpie in a dark shawl", ears: "none", headW: 0.62, headH: 0.6, headD: 0.6, features: [["beak", { w: 0.18, l: 0.34 }]], body: ["bellyPatch", "wings"], shirtless: true, tail: "long", armH: 0.01, armW: 0.02, legW: 0.1, mouthZ: 0.66, colors: c("ink", "white", "night", "ink", "white", "night", "sky", "sand") },
      bellows: { about: "Sir Reginald Bellows, a hippo thespian in a ruff", head: "wide", ears: "small", headW: 1, headH: 0.74, features: ["bigNose"], body: ["bowtie"], bodyW: 0.84, bodyD: 0.7, bodyH: 0.46, legH: 0.26, legW: 0.26, sleeve: true, mouthY: 0.14, eyeY: 0.74, colors: c("slate", "mist", "ink", "plum", "white", "sand", "sand") },
      pemberton: { about: "Pemberton, a tiny dormouse in an auctioneer collar", ears: "big", headW: 0.72, headH: 0.64, headD: 0.64, bodyW: 0.42, bodyH: 0.3, bodyD: 0.36, legH: 0.14, legW: 0.14, armH: 0.22, armW: 0.1, tail: "fluffy", features: ["whiskers", ["snout", { w: 0.18, h: 0.12, nw: 0.08 }]], body: ["bowtie"], colors: c("sand", "white", "plum", "night", "white", "red", "sand") },
      brisket: { about: "Agent Brisket, a badger in a Bureau suit", head: "long", ears: "small", features: ["stripe", ["snout", { w: 0.26, h: 0.18, nw: 0.1, c: "white" }]], body: ["bowtie"], sleeve: true, colors: c("white", "white", "ink", "night", "white", "sky", "sand") },
      lou: { about: "Languid Lou, a sloth in a cardigan", head: "round", ears: "none", features: ["sleepyLids", "eyeRings"], body: ["cardigan"], armH: 0.44, armW: 0.13, bodyW: 0.54, colors: c("sand", "white", "plum", "teal", "sand", "red", "sand") },
      nibbles: { about: "Madame Nibbles, a goat with a fortune teller scarf", head: "long", ears: "side", features: ["horns", "hood", ["snout", { w: 0.3, h: 0.2, nw: 0.12, c: "white" }]], eyeY: 0.6, colors: c("white", "mist", "ink", "plum", "sand", "plum", "sand") },
      pimm: { about: "Inspector Pimm, a hermit crab living in a filing cabinet", ears: "none", headW: 0.66, headH: 0.5, headD: 0.56, features: ["antennae"], body: ["cabinet"], shirtless: true, legH: 0.32, bodyH: 0.34, armH: 0.4, armW: 0.16, paw: "accent", colors: c("red", "orange", "ink", "slate", "white", "red", "mist") }
    };
    CROWD_SPECIES = [
      { id: "otter", about: "An otter out shopping", ears: "small", tail: "long", features: [["snout", { w: 0.3, h: 0.2, nw: 0.12, c: "sand" }], "whiskers"], colors: c("plum", "sand", "ink", "sky", "white", "red", "sand") },
      { id: "newt", about: "A newt on a lunch break", ears: "none", head: "wide", eyeW: 0.14, tail: "long", colors: c("green", "lime", "ink", "sand", "white", "red", "sand") },
      { id: "tapir", about: "A tapir late for something", ears: "small", features: [["snout", { w: 0.34, h: 0.34, nw: 0.2, c: "fur" }]], colors: c("night", "white", "ink", "red", "white", "red", "sand") },
      { id: "heron", about: "A heron in a long coat", ears: "none", legH: 0.5, legW: 0.07, legColor: "sand", headW: 0.46, headH: 0.46, headD: 0.46, neckH: 0.34, bodyW: 0.48, features: [["beak", { w: 0.14, l: 0.5 }]], armH: 0.01, armW: 0.02, mouthZ: 0.7, colors: c("mist", "white", "ink", "mist", "white", "orange", "sand") },
      { id: "puffin", about: "A puffin, briefly", ears: "none", headW: 0.7, headH: 0.66, headD: 0.66, features: [["beak", { w: 0.24, l: 0.3 }]], body: ["bellyPatch"], shirtless: true, armH: 0.01, armW: 0.02, legColor: "orange", legW: 0.12, mouthZ: 0.66, colors: c("ink", "white", "night", "ink", "white", "orange", "sand", "white") },
      { id: "walrus", about: "A walrus with a briefcase", ears: "none", head: "wide", features: [["snout", { w: 0.5, h: 0.3, nw: 0.16, c: "sand" }], "whiskers"], bodyW: 0.78, sleeve: true, colors: c("orange", "sand", "plum", "navy", "white", "red", "sand") },
      { id: "beaver", about: "A beaver on a schedule", ears: "small", tail: "flat", features: [["snout", { w: 0.32, h: 0.22, nw: 0.12, c: "sand" }]], colors: c("red", "sand", "ink", "lime", "white", "red", "sand") },
      { id: "meerkat", about: "A meerkat looking at everything", ears: "small", head: "long", bodyH: 0.56, bodyW: 0.4, features: ["eyeRings"], colors: c("sand", "white", "ink", "orange", "white", "red", "sand", "white") },
      { id: "ibis", about: "An ibis who is a bit much", ears: "none", legH: 0.56, legW: 0.07, legColor: "red", headW: 0.46, headH: 0.46, headD: 0.46, neckH: 0.3, bodyW: 0.48, features: [["beak", { w: 0.12, l: 0.5 }]], armH: 0.01, armW: 0.02, mouthZ: 0.7, colors: c("white", "white", "ink", "white", "white", "red", "sand") },
      { id: "weasel", about: "A weasel selling watches", ears: "small", head: "long", bodyW: 0.4, bodyH: 0.5, tail: "long", sleeve: true, colors: c("orange", "white", "ink", "plum", "white", "red", "sand") },
      { id: "toad", about: "A toad in a good hat", ears: "none", head: "wide", features: ["topHat"], eyeW: 0.14, bodyW: 0.72, colors: c("teal", "lime", "ink", "navy", "white", "red", "sand") },
      { id: "okapi", about: "An okapi who insists it is not a zebra", head: "long", ears: "side", neckH: 0.24, headW: 0.6, features: [["snout", { w: 0.3, h: 0.22, nw: 0.14, c: "white" }]], colors: c("plum", "white", "ink", "white", "white", "red", "sand") }
    ];
    CRITTER_DEFS = Object.fromEntries(Object.entries(CRITTERS).map(([id, spec]) => [id, critterDef({ id, ...spec })]));
    CROWD_DEFS = CROWD_SPECIES.map((spec) => critterDef(spec));
    HAIR_STYLES = ["Tufted", "Bowl", "Bun", "Swoop", "Long", "Spikes", "Curls", "None To Speak Of"];
    HAIR_COLORS = ["plum", "ink", "sand", "orange", "red", "white", "navy", "teal"];
    EYE_STYLES = ["Dots", "Wide", "Sleepy", "Keen", "Square", "Worried"];
    hairParts = (style, w, h, d) => {
      switch (style) {
        case 0:
          return [BALL(w * 0.96, h * 0.5, d * 0.96, 0, h * 0.8, -0.03, "hair"), CONE(0.2, 0.24, 0.14, 0, h * 1.1, 0, "hair"), CONE(0.16, 0.2, 0.12, 0.14, h * 1.06, 0.02, "hair", { rot: [0, 0, -20] })];
        case 1:
          return [BALL(w * 1.06, h * 0.66, d * 1.06, 0, h * 0.72, -0.01, "hair")];
        case 2:
          return [BALL(w * 0.98, h * 0.5, d * 0.98, 0, h * 0.78, -0.04, "hair"), BALL(0.32, 0.32, 0.32, 0, h * 1.12, -0.08, "hair")];
        case 3:
          return [BALL(w * 0.98, h * 0.48, d * 0.98, 0, h * 0.8, -0.03, "hair"), BALL(0.5, 0.2, 0.24, 0.16, h * 0.94, 0.3, "hair", { rot: [0, 0, -14] })];
        case 4:
          return [BALL(w * 1.02, h * 0.56, d * 1.02, 0, h * 0.78, -0.03, "hair"), mirrorX([B(0.18, h * 0.7, 0.36, w * 0.44, h * 0.42, -0.14, "hair")]), B(w * 0.72, h * 0.72, 0.16, 0, h * 0.4, -d * 0.44, "hair")];
        case 5:
          return [BALL(w * 0.94, h * 0.44, d * 0.94, 0, h * 0.82, -0.03, "hair"), ...[-0.24, -0.08, 0.08, 0.24].map((x, i) => CONE(0.16, 0.3, 0.16, x, h * 1.08 - Math.abs(x) * 0.2, i % 2 ? 0.08 : -0.08, "hair"))];
        case 6:
          return [-0.28, -0.1, 0.1, 0.28].flatMap((x) => [BALL(0.3, 0.3, 0.3, x, h * 0.92, 0.06, "hair"), BALL(0.3, 0.3, 0.3, x, h * 0.9, -0.14, "hair")]);
        default:
          return [BALL(0.14, 0.1, 0.14, 0, h * 1, 0, "hair")];
      }
    };
    HATS = {
      cap: (h) => [CYL(0.8, 0.16, 0.8, 0, h * 0.96, 0, "hat", { top: 0.9 }), B(0.5, 0.05, 0.26, 0, h * 0.92, 0.42, "hatTrim")],
      straw: (h) => [CYL(1.16, 0.05, 1.16, 0, h * 0.94, 0, "hat"), CYL(0.58, 0.22, 0.58, 0, h * 1.05, 0, "hat", { top: 0.86 }), CYL(0.6, 0.06, 0.6, 0, h * 0.99, 0, "hatTrim")],
      bobble: (h) => [BALL(0.9, 0.52, 0.86, 0, h * 0.88, -0.02, "hat"), B(0.84, 0.12, 0.84, 0, h * 0.74, 0, "hatTrim"), BALL(0.24, 0.24, 0.24, 0, h * 1.18, 0, "hatTrim")],
      top: (h) => [CYL(0.84, 0.05, 0.84, 0, h * 0.96, 0, "hat"), CYL(0.54, 0.46, 0.54, 0, h * 1.2, 0, "hat"), B(0.56, 0.08, 0.56, 0, h * 1.04, 0, "hatTrim")],
      beret: (h) => [BALL(0.92, 0.26, 0.92, 0.06, h * 0.98, 0, "hat", { rot: [0, 0, -8] }), B(0.06, 0.1, 0.06, 0.06, h * 1.12, 0, "hatTrim")],
      crown: (h) => [CYL(0.56, 0.2, 0.56, 0, h * 1.04, 0, "hat", { top: 1.1 }), ...[0, 72, 144, 216, 288].map((a) => CONE(0.1, 0.16, 0.1, Math.sin(a * Math.PI / 180) * 0.26, h * 1.2, Math.cos(a * Math.PI / 180) * 0.26, "hat"))],
      pot: (h) => [CYL(0.8, 0.36, 0.8, 0, h * 1.06, 0, "hat", { top: 1.06 }), B(0.34, 0.06, 0.08, 0.5, h * 1.1, 0, "hatTrim")],
      cheese: (h) => [{ wedge: [0.74, 0.38, 0.74], at: [0, h * 1.12, 0], c: "hat" }, BALL(0.1, 0.1, 0.05, 0.1, h * 1.08, 0.3, "hatTrim")],
      bow: (h) => [mirrorX([CONE(0.26, 0.3, 0.14, 0.17, h * 0.98, 0.02, "hat", { rot: [0, 0, 90] })]), BALL(0.12, 0.12, 0.12, 0, h * 0.98, 0.02, "hatTrim")],
      sou: (h) => [CYL(1, 0.1, 1.1, 0, h * 0.9, -0.06, "hat"), BALL(0.8, 0.46, 0.8, 0, h * 0.96, -0.02, "hat")],
      plume: (h) => [BALL(0.84, 0.34, 0.84, 0, h * 0.94, 0, "hat"), { group: [BALL(0.2, 0.62, 0.1, 0.3, 0.32, -0.1, "hatTrim", { rot: [0, 0, -18] })], at: [0, h * 0.96, 0] }],
      bucket: (h) => [CYL(0.84, 0.4, 0.84, 0, h * 1.04, 0, "hat", { top: 1.12 })]
    };
    GLASSES = {
      round: (h, d) => [mirrorX([{ torus: [0.24, 0.05, 0.24], at: [0.18, h * 0.54, d * 0.5], rot: [90, 0, 0], c: "glasses" }]), B(0.1, 0.04, 0.04, 0, h * 0.54, d * 0.5, "glasses")],
      square: (h, d) => [mirrorX([B(0.26, 0.2, 0.04, 0.18, h * 0.54, d * 0.5, "glasses")]), B(0.1, 0.04, 0.04, 0, h * 0.54, d * 0.5, "glasses")],
      shades: (h, d) => [B(0.64, 0.16, 0.04, 0, h * 0.54, d * 0.5, "glasses")],
      monocle: (h, d) => [{ torus: [0.26, 0.05, 0.26], at: [-0.18, h * 0.54, d * 0.5], rot: [90, 0, 0], c: "glasses" }],
      star: (h, d) => [mirrorX([CONE(0.26, 0.24, 0.05, 0.18, h * 0.54, d * 0.5, "glasses")])],
      moustache: (h, d) => [mirrorX([B(0.24, 0.08, 0.05, 0.13, h * 0.34, d * 0.5, "glasses", { rot: [0, 0, 10] })])]
    };
    eyeParts = (style) => [
      [0.1, 0.1],
      [0.14, 0.2],
      [0.14, 0.06],
      [0.12, 0.16],
      [0.16, 0.16],
      [0.1, 0.18]
    ][style] ?? [0.1, 0.1];
  }
});

// src/art/itemModels.js
var B2, BALL2, CONE2, CYL2, toolNet, toolRod, toolShovel, toolAxe, toolCan, toolSling, fishProp, bugProp, winged, umbrellaProp, cheeseWheel, boneSkull, boneTorso, boneTail, boneNeck, boneSmall, ITEM_MODELS;
var init_itemModels = __esm({
  "src/art/itemModels.js"() {
    init_engine();
    B2 = (w, h, d, x, y, z, c2, o = {}) => ({ box: [w, h, d], at: [x, y, z], c: c2, ...o });
    BALL2 = (w, h, d, x, y, z, c2, o = {}) => ({ ball: [w, h, d], at: [x, y, z], c: c2, ...o });
    CONE2 = (w, h, d, x, y, z, c2, o = {}) => ({ cone: [w, h, d], at: [x, y, z], c: c2, ...o });
    CYL2 = (w, h, d, x, y, z, c2, o = {}) => ({ cyl: [w, h, d], at: [x, y, z], c: c2, ...o });
    toolNet = (0, engine_exports.model)({ id: "tool-net", about: "A bug net", tags: ["tool"], floats: true, palette: { stick: "orange", ring: "mist", mesh: "white" }, parts: [B2(0.06, 1.2, 0.06, 0, 0.3, 0, "stick"), { torus: [0.5, 0.05, 0.5], at: [0, 1, 0], rot: [90, 0, 0], c: "ring" }, BALL2(0.44, 0.44, 0.36, 0, 1, -0.14, "mesh")] });
    toolRod = (0, engine_exports.model)({ id: "tool-rod", about: "A fishing rod", tags: ["tool"], floats: true, palette: { stick: "red", grip: "night", reel: "mist" }, parts: [B2(0.05, 1.8, 0.05, 0, 0.6, 0, "stick"), B2(0.08, 0.34, 0.08, 0, -0.12, 0, "grip"), BALL2(0.14, 0.14, 0.14, 0.06, 0.1, 0, "reel")] });
    toolShovel = (0, engine_exports.model)({ id: "tool-shovel", about: "A shovel", tags: ["tool"], floats: true, palette: { stick: "orange", blade: "mist", grip: "plum" }, parts: [B2(0.06, 1.1, 0.06, 0, 0.3, 0, "stick"), B2(0.26, 0.06, 0.06, 0, 0.86, 0, "grip"), B2(0.3, 0.4, 0.05, 0, -0.34, 0, "blade")] });
    toolAxe = (0, engine_exports.model)({ id: "tool-axe", about: "An axe", tags: ["tool"], floats: true, palette: { stick: "orange", blade: "mist", edge: "white" }, parts: [B2(0.07, 1, 0.07, 0, 0.3, 0, "stick"), B2(0.28, 0.28, 0.06, 0.16, 0.7, 0, "blade"), B2(0.05, 0.3, 0.07, 0.3, 0.7, 0, "edge")] });
    toolCan = (0, engine_exports.model)({ id: "tool-can", about: "A watering can", tags: ["tool"], floats: true, palette: { can: "sky", dark: "navy" }, parts: [CYL2(0.34, 0.34, 0.34, 0, 0.06, 0.1, "can"), B2(0.06, 0.06, 0.34, 0, 0.14, 0.4, "can", { rot: [-30, 0, 0] }), B2(0.16, 0.05, 0.05, 0, 0.26, 0.56, "dark"), { torus: [0.24, 0.04, 0.24], at: [0, 0.3, -0.08], rot: [0, 90, 90], c: "dark" }] });
    toolSling = (0, engine_exports.model)({ id: "tool-slingshot", about: "A slingshot", tags: ["tool"], floats: true, palette: { wood: "orange", band: "red" }, parts: [B2(0.07, 0.34, 0.07, 0, 0.04, 0, "wood"), B2(0.06, 0.28, 0.06, -0.09, 0.32, 0, "wood", { rot: [0, 0, 20] }), B2(0.06, 0.28, 0.06, 0.09, 0.32, 0, "wood", { rot: [0, 0, -20] }), B2(0.3, 0.03, 0.03, 0, 0.44, 0, "band")] });
    fishProp = (0, engine_exports.model)({ id: "fish", about: "A swimming fish, size param", tags: ["fish"], floats: true, palette: { body: "sky", fin: "navy", eye: "ink", belly: "white" }, params: { len: [0.6, 0.2, 2] }, parts: (p) => {
      const l = p.len;
      return [BALL2(l * 0.35, l * 0.42, l, 0, 0, 0, "body"), CONE2(l * 0.04, l * 0.3, l * 0.4, 0, 0, -l * 0.58, "fin", { rot: [-90, 0, 0] }), B2(l * 0.04, l * 0.22, l * 0.3, 0, l * 0.24, 0, "fin"), BALL2(l * 0.26, l * 0.2, l * 0.6, 0, -l * 0.1, 0, "belly"), B2(l * 0.37, l * 0.08, l * 0.08, 0, l * 0.06, l * 0.28, "eye")];
    } });
    bugProp = (0, engine_exports.model)({ id: "bug", about: "A beetle-ish bug", tags: ["bug"], floats: true, palette: { body: "night", head: "ink", leg: "ink" }, params: { size: [0.3, 0.15, 0.8] }, parts: (p) => {
      const s = p.size;
      return [BALL2(s, s * 0.6, s * 1.4, 0, s * 0.3, 0, "body"), BALL2(s * 0.6, s * 0.5, s * 0.5, 0, s * 0.3, s * 0.8, "head"), { mirror: [B2(s * 0.7, s * 0.08, s * 0.08, s * 0.5, s * 0.14, 0, "leg"), B2(s * 0.7, s * 0.08, s * 0.08, s * 0.5, s * 0.14, s * 0.4, "leg"), B2(s * 0.7, s * 0.08, s * 0.08, s * 0.5, s * 0.14, -s * 0.4, "leg")], axis: "x" }];
    } });
    winged = (0, engine_exports.model)({ id: "winged", about: "A flying insect with two flapping wings (pivots)", tags: ["bug"], floats: true, palette: { body: "ink", wing: "white", spot: "orange" }, params: { size: [0.4, 0.2, 1] }, parts: (p) => {
      const s = p.size;
      return [
        B2(s * 0.16, s * 0.16, s * 0.7, 0, 0, 0, "body"),
        { group: [B2(s * 0.8, s * 0.04, s * 0.8, s * 0.4, 0, 0, "wing"), B2(s * 0.3, s * 0.05, s * 0.3, s * 0.45, 0, 0, "spot")], at: [0.02, 0, 0], pivot: true, name: "WingL" },
        { group: [B2(s * 0.8, s * 0.04, s * 0.8, -s * 0.4, 0, 0, "wing"), B2(s * 0.3, s * 0.05, s * 0.3, -s * 0.45, 0, 0, "spot")], at: [-0.02, 0, 0], pivot: true, name: "WingR" }
      ];
    } });
    umbrellaProp = (0, engine_exports.model)({ id: "umbrella-prop", about: "An open umbrella", tags: ["item"], floats: true, palette: { a: "blue", b: "navy", stick: "plum" }, parts: [B2(0.05, 1, 0.05, 0, 0.4, 0, "stick"), { cone: [1.1, 0.34, 1.1], at: [0, 1.02, 0], c: "a", seg: 8 }, B2(0.08, 0.1, 0.08, 0, 1.22, 0, "b")] });
    cheeseWheel = (0, engine_exports.model)({ id: "cheese-wheel", about: "A wheel of cheese, smelling faintly of commerce", tags: ["item"], palette: { a: "sand", b: "orange", c: "orange" }, parts: [CYL2(0.7, 0.3, 0.7, 0, 0.15, 0, "a"), CYL2(0.72, 0.06, 0.72, 0, 0.15, 0, "b"), B2(0.08, 0.02, 0.08, 0.1, 0.31, 0.12, "c")] });
    boneSkull = (0, engine_exports.model)({ id: "fossil-skull", about: "A big fossil skull", tags: ["fossil"], palette: { a: "sand", b: "plum" }, parts: [BALL2(0.9, 0.56, 1.3, 0, 0.5, 0, "a"), B2(0.9, 0.2, 0.9, 0, 0.2, 0.26, "a"), B2(0.16, 0.16, 0.05, -0.24, 0.58, 0.6, "b"), B2(0.16, 0.16, 0.05, 0.24, 0.58, 0.6, "b"), ...[-0.3, -0.1, 0.1, 0.3].map((x) => CONE2(0.1, 0.18, 0.1, x, 0.1, 0.66, "a", { rot: [180, 0, 0] }))] });
    boneTorso = (0, engine_exports.model)({ id: "fossil-torso", about: "A fossil ribcage", tags: ["fossil"], palette: { a: "sand" }, parts: [B2(0.14, 0.14, 1.5, 0, 0.9, 0, "a"), ...[-0.56, -0.28, 0, 0.28, 0.56].flatMap((z) => [{ torus: [0.74, 0.1, 0.74], at: [0, 0.62, z], rot: [90, 0, 0], c: "a" }])] });
    boneTail = (0, engine_exports.model)({ id: "fossil-tail", about: "A fossil tail", tags: ["fossil"], palette: { a: "sand" }, parts: [0, 1, 2, 3, 4, 5].map((i) => B2(0.26 - i * 0.03, 0.2 - i * 0.02, 0.28, 0, 0.84 - i * 0.12, -i * 0.3, "a")) });
    boneNeck = (0, engine_exports.model)({ id: "fossil-neck", about: "A long fossil neck", tags: ["fossil"], palette: { a: "sand" }, parts: [0, 1, 2, 3, 4].map((i) => B2(0.22, 0.26, 0.26, 0, 0.5 + i * 0.32, 0.5 + i * 0.1 - 0.5, "a")) });
    boneSmall = (0, engine_exports.model)({ id: "fossil-small", about: "A small fossil on a stone", tags: ["fossil"], palette: { a: "sand", b: "plum", c: "slate" }, parts: [B2(0.6, 0.12, 0.5, 0, 0.06, 0, "c"), { torus: [0.36, 0.1, 0.36], at: [0, 0.18, 0], c: "a" }, BALL2(0.14, 0.1, 0.14, 0, 0.18, 0, "b")] });
    ITEM_MODELS = [umbrellaProp, toolNet, toolRod, toolShovel, toolAxe, toolCan, toolSling, fishProp, bugProp, winged, cheeseWheel, boneSkull, boneTorso, boneTail, boneNeck, boneSmall];
  }
});

// src/art/models.js
function letters(text, { at = [0, 0, 0], px = 0.08, c: c2 = "neon", glow = true, depth = 0.04 } = {}) {
  const parts = [];
  const width = textWidth(text) * px;
  let cx = -width / 2;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) {
      cx += 4 * px;
      continue;
    }
    g.rows.forEach((row, ry) => {
      let run = -1;
      for (let i = 0; i <= row.length; i++) {
        if (i < row.length && row[i] === "#") {
          if (run < 0) run = i;
          continue;
        }
        if (run >= 0) {
          const len = i - run;
          parts.push({ box: [len * px, px, depth], at: [cx + (run + len / 2) * px, (6 - ry) * px + px / 2, 0], c: c2, glow, collide: false });
          run = -1;
        }
      }
    });
    cx += (g.w + 1) * px;
  }
  return { group: parts, at };
}
function mirrorLeaf() {
  return { mirror: [B3(0.16, 0.04, 0.1, 0.1, 0.1, 0, "stem", { rot: [0, 0, 25] })], axis: "x" };
}
var B3, BALL3, CONE3, CYL3, WEDGE, piv, gable, win, litWin, COTTAGE_SLOTS, cottage, homeTier1, homeCottageParts, homeCottageLit, homeTier2, homeTier3, homeTier4, STORE_SLOTS, awning, storeTier1, storeTier2, storeTier3, museum, hall, mothwickShop, lighthouse, busStop, bus, pearFruit, pearTree, pineTree, palmTree, sapling, oldPear, oldBell, flower, weed, beanstalk, crackMark, hole, shell, driftwood, dropBag, dropLeaf, pearDrop, mailboxModel, bridgeModel, rockProp, waterfall, stageFloor, rowboat, snowball, snowman, lantern, balloon, wasps, stall, stoolPot, ring, rocket, postCounter, shelf, tank, plinth, ribbon, front, CITY_FRONTS, skyline, cityLamp, telescope, OWN_MODELS, MODELS;
var init_models = __esm({
  "src/art/models.js"() {
    init_engine();
    init_font();
    init_critter();
    init_textures();
    init_itemModels();
    B3 = (w, h, d, x, y, z, c2, o = {}) => ({ box: [w, h, d], at: [x, y, z], c: c2, ...o });
    BALL3 = (w, h, d, x, y, z, c2, o = {}) => ({ ball: [w, h, d], at: [x, y, z], c: c2, ...o });
    CONE3 = (w, h, d, x, y, z, c2, o = {}) => ({ cone: [w, h, d], at: [x, y, z], c: c2, ...o });
    CYL3 = (w, h, d, x, y, z, c2, o = {}) => ({ cyl: [w, h, d], at: [x, y, z], c: c2, ...o });
    WEDGE = (w, h, d, x, y, z, c2, o = {}) => ({ wedge: [w, h, d], at: [x, y, z], c: c2, ...o });
    piv = (name, at, parts) => ({ group: parts, at, pivot: true, name });
    gable = (w, h, d, y, c2) => [WEDGE(w, h, d / 2, 0, y + h / 2, d / 4, c2), WEDGE(w, h, d / 2, 0, y + h / 2, -d / 4, c2, { rot: [0, 180, 0] })];
    win = (w, h, x, y, z, side = "front") => {
      const depth = 0.08;
      const size = side === "front" ? [w, h, depth] : [depth, h, w];
      const frame = side === "front" ? [w + 0.14, h + 0.14, depth / 2] : [depth / 2, h + 0.14, w + 0.14];
      return [
        { box: frame, at: [x, y, z], c: "trim" },
        { box: size, at: side === "front" ? [x, y, z + 0.03] : [x + 0.03, y, z], c: "glass" }
      ];
    };
    litWin = (w, h, x, y, z, side = "front") => ({ box: side === "front" ? [w, h, 0.09] : [0.09, h, w], at: side === "front" ? [x, y, z + 0.04] : [x + 0.04, y, z], c: "lit", glow: true });
    COTTAGE_SLOTS = { wall: "sand", roof: "red", roof2: "plum", trim: "white", door: "teal", glass: "navy", lit: "sand", stone: "slate", knob: "sand", smoke: "mist" };
    cottage = (0, engine_exports.model)({
      id: "cottage",
      about: "A small cottage: walls, a two-wedge roof, a chimney, door and lit windows",
      tags: ["building", "town"],
      palette: COTTAGE_SLOTS,
      parts: [
        B3(4.4, 2.2, 3.6, 0, 1.1, 0, "wall"),
        B3(4.5, 0.26, 3.7, 0, 0.13, 0, "stone"),
        ...gable(4.9, 1.34, 4.2, 2.2, "roof"),
        B3(4.9, 0.1, 0.3, 0, 3.52, 0, "roof2"),
        B3(0.56, 1.3, 0.56, 1.3, 3, -0.7, "stone"),
        B3(0.68, 0.12, 0.68, 1.3, 3.68, -0.7, "trim"),
        B3(1, 1.56, 0.12, 0, 0.78, 1.8, "trim"),
        piv("door", [-0.4, 0, 1.87], [B3(0.8, 1.44, 0.08, 0.4, 0.72, 0, "door"), BALL3(0.1, 0.1, 0.1, 0.68, 0.72, 0.05, "knob")]),
        ...win(0.72, 0.72, -1.4, 1.34, 1.82),
        ...win(0.72, 0.72, 1.4, 1.34, 1.82),
        ...win(0.8, 0.72, 2.22, 1.34, 0, "side"),
        piv("lit", [0, 0, 0], [litWin(0.72, 0.72, -1.4, 1.34, 1.82), litWin(0.72, 0.72, 1.4, 1.34, 1.82), litWin(0.8, 0.72, 2.22, 1.34, 0, "side")]),
        B3(1.2, 0.1, 0.5, 0, 0.05, 2.1, "stone")
      ]
    });
    homeTier1 = (0, engine_exports.model)({
      id: "home-1",
      about: "Starter shack: tin roof, crooked door",
      tags: ["building", "home"],
      palette: { ...COTTAGE_SLOTS, wall: "orange", roof: "slate", roof2: "night" },
      parts: [
        B3(3.6, 1.9, 3, 0, 0.95, 0, "wall"),
        B3(3.7, 0.2, 3.1, 0, 0.1, 0, "stone"),
        piv("roofed", [0, 0, 0], [WEDGE(3.9, 0.7, 3.5, 0, 2.25, 0, "roof", { rot: [0, 180, 0] }), B3(3.9, 0.1, 3.5, 0, 1.92, 0, "roof2")]),
        B3(0.9, 1.5, 0.1, -0.4, 0.78, 1.5, "trim", { rot: [0, 0, 2] }),
        piv("door", [-0.8, 0, 1.56], [B3(0.76, 1.38, 0.07, 0.38, 0.7, 0, "door", { rot: [0, 0, 2] })]),
        ...win(0.6, 0.6, 1, 1.2, 1.52),
        piv("lit", [0, 0, 0], [litWin(0.6, 0.6, 1, 1.2, 1.52)]),
        B3(1, 0.1, 0.4, -0.4, 0.05, 1.8, "stone")
      ]
    });
    homeCottageParts = [
      B3(5.2, 2.3, 4, 0, 1.15, 0, "wall"),
      B3(5.3, 0.26, 4.1, 0, 0.13, 0, "stone"),
      ...gable(5.7, 1.5, 4.6, 2.3, "roof"),
      B3(5.7, 0.1, 0.3, 0, 3.78, 0, "roof2"),
      B3(0.6, 1.5, 0.6, 1.7, 3.2, -0.8, "stone"),
      B3(0.74, 0.12, 0.74, 1.7, 3.98, -0.8, "trim"),
      B3(1, 1.6, 0.12, 0, 0.8, 2, "trim"),
      piv("door", [-0.42, 0, 2.07], [B3(0.84, 1.5, 0.08, 0.42, 0.75, 0, "door"), BALL3(0.1, 0.1, 0.1, 0.72, 0.75, 0.05, "knob")]),
      ...win(0.8, 0.8, -1.7, 1.4, 2.02),
      ...win(0.8, 0.8, 1.7, 1.4, 2.02),
      ...win(0.9, 0.8, 2.62, 1.4, 0, "side"),
      B3(1, 0.16, 0.2, -1.7, 0.84, 2.1, "roof2"),
      B3(1, 0.16, 0.2, 1.7, 0.84, 2.1, "roof2"),
      B3(1.2, 0.1, 0.5, 0, 0.05, 2.3, "stone")
    ];
    homeCottageLit = [litWin(0.8, 0.8, -1.7, 1.4, 2.02), litWin(0.8, 0.8, 1.7, 1.4, 2.02), litWin(0.9, 0.8, 2.62, 1.4, 0, "side")];
    homeTier2 = (0, engine_exports.model)({ id: "home-2", about: "Proper cottage", tags: ["building", "home"], palette: COTTAGE_SLOTS, parts: [...homeCottageParts, piv("lit", [0, 0, 0], homeCottageLit)] });
    homeTier3 = (0, engine_exports.model)({ id: "home-3", about: "Cottage with an annex", tags: ["building", "home"], palette: COTTAGE_SLOTS, parts: [
      ...homeCottageParts,
      piv("lit", [0, 0, 0], [...homeCottageLit, litWin(0.7, 0.7, -3.8, 1.2, 1.32)]),
      B3(2.2, 1.9, 2.6, -3.5, 0.95, 0, "wall"),
      B3(2.3, 0.2, 2.7, -3.5, 0.1, 0, "stone"),
      ...gable(2.5, 0.8, 3, 1.9, "roof").map((p) => ({ ...p, at: [-3.5, p.at[1], p.at[2]] })),
      ...win(0.7, 0.7, -3.8, 1.2, 1.32)
    ] });
    homeTier4 = (0, engine_exports.model)({ id: "home-4", about: "Two-storey house with a plaque", tags: ["building", "home"], palette: COTTAGE_SLOTS, parts: [
      B3(5.2, 4.4, 4, 0, 2.2, 0, "wall"),
      B3(5.3, 0.26, 4.1, 0, 0.13, 0, "stone"),
      B3(5.3, 0.14, 4.1, 0, 2.3, 0, "roof2"),
      ...gable(5.7, 1.5, 4.6, 4.4, "roof"),
      B3(5.7, 0.1, 0.3, 0, 5.88, 0, "roof2"),
      B3(0.6, 1.5, 0.6, 1.7, 5.3, -0.8, "stone"),
      B3(0.74, 0.12, 0.74, 1.7, 6.08, -0.8, "trim"),
      B3(1, 1.6, 0.12, 0, 0.8, 2, "trim"),
      piv("door", [-0.42, 0, 2.07], [B3(0.84, 1.5, 0.08, 0.42, 0.75, 0, "door"), BALL3(0.1, 0.1, 0.1, 0.72, 0.75, 0.05, "knob")]),
      ...win(0.8, 0.8, -1.7, 1.4, 2.02),
      ...win(0.8, 0.8, 1.7, 1.4, 2.02),
      ...win(0.8, 0.8, -1.2, 3.4, 2.02),
      ...win(0.8, 0.8, 1.2, 3.4, 2.02),
      ...win(0.9, 0.8, 2.62, 1.4, 0, "side"),
      ...win(0.9, 0.8, 2.62, 3.4, 0, "side"),
      B3(0.8, 0.5, 0.08, 0, 2, 2.04, "knob"),
      piv("lit", [0, 0, 0], [litWin(0.8, 0.8, -1.7, 1.4, 2.02), litWin(0.8, 0.8, 1.7, 1.4, 2.02), litWin(0.8, 0.8, -1.2, 3.4, 2.02), litWin(0.8, 0.8, 1.2, 3.4, 2.02), litWin(0.9, 0.8, 2.62, 1.4, 0, "side"), litWin(0.9, 0.8, 2.62, 3.4, 0, "side")]),
      B3(2.2, 1.9, 2.6, -3.5, 0.95, 0, "wall"),
      B3(2.3, 0.2, 2.7, -3.5, 0.1, 0, "stone"),
      B3(1.2, 0.1, 0.5, 0, 0.05, 2.3, "stone")
    ] });
    STORE_SLOTS = { wall: "white", roof: "teal", roof2: "navy", trim: "plum", door: "red", glass: "sky", lit: "sand", stone: "slate", sign: "sand", ink: "ink", awn: "red", awn2: "white" };
    awning = (w, x, y, z) => ({ group: Array.from({ length: Math.round(w / 0.5) }, (_, i) => B3(0.5, 0.12, 1, x - w / 2 + 0.25 + i * 0.5, y, z, i % 2 ? "awn" : "awn2", { rot: [22, 0, 0] })) });
    storeTier1 = (0, engine_exports.model)({ id: "store-1", about: "Mrs. Gander's: a modest shop with a ledger for a sign", tags: ["building", "shop"], palette: STORE_SLOTS, parts: [
      B3(6.8, 2.8, 4.6, 0, 1.4, 0, "wall"),
      B3(6.9, 0.26, 4.7, 0, 0.13, 0, "stone"),
      ...gable(7.3, 1.5, 5.2, 2.8, "roof"),
      B3(7.3, 0.1, 0.3, 0, 4.28, 0, "roof2"),
      B3(1.4, 2, 0.12, 0, 1, 2.3, "trim"),
      piv("door", [-0.6, 0, 2.36], [B3(1.2, 1.9, 0.08, 0.6, 0.95, 0, "door")]),
      ...win(1.5, 1.1, -2.2, 1.4, 2.32),
      ...win(1.5, 1.1, 2.2, 1.4, 2.32),
      piv("lit", [0, 0, 0], [litWin(1.5, 1.1, -2.2, 1.4, 2.32), litWin(1.5, 1.1, 2.2, 1.4, 2.32)]),
      B3(3.6, 0.7, 0.1, 0, 3.2, 2.42, "sign"),
      letters("GANDER", { at: [0, 2.95, 2.5], px: 0.09, c: "ink", glow: false }),
      awning(6, 0, 2.4, 2.7)
    ] });
    storeTier2 = (0, engine_exports.model)({ id: "store-2", about: "Mrs. Gander's Grocery: wider, with barrels", tags: ["building", "shop"], palette: { ...STORE_SLOTS, roof: "green", awn: "green" }, parts: [
      B3(7.4, 3.2, 5, 0, 1.6, 0, "wall"),
      B3(7.5, 0.26, 5.1, 0, 0.13, 0, "stone"),
      ...gable(7.9, 1.6, 5.6, 3.2, "roof"),
      B3(7.9, 0.1, 0.3, 0, 4.78, 0, "roof2"),
      B3(1.6, 2.2, 0.12, 0, 1.1, 2.5, "trim"),
      piv("door", [-0.7, 0, 2.56], [B3(1.4, 2.1, 0.08, 0.7, 1.05, 0, "door")]),
      ...win(1.8, 1.3, -2.5, 1.5, 2.52),
      ...win(1.8, 1.3, 2.5, 1.5, 2.52),
      piv("lit", [0, 0, 0], [litWin(1.8, 1.3, -2.5, 1.5, 2.52), litWin(1.8, 1.3, 2.5, 1.5, 2.52)]),
      B3(4.6, 0.8, 0.1, 0, 3, 2.62, "sign"),
      letters("GANDER & CO", { at: [0, 2.74, 2.7], px: 0.08, c: "ink", glow: false }),
      awning(6.5, 0, 2.5, 2.9),
      { use: "barrel", at: [-3.2, 0, 3], palette: {} }
    ] });
    storeTier3 = (0, engine_exports.model)({ id: "store-3", about: "The Gander Emporium: columns and gold letters", tags: ["building", "shop"], palette: { ...STORE_SLOTS, roof: "plum", awn: "plum", sign: "navy", ink: "sand" }, parts: [
      B3(7.8, 4, 5.2, 0, 2, 0, "wall"),
      B3(7.9, 0.3, 5.3, 0, 0.15, 0, "stone"),
      B3(8.1, 0.5, 5.6, 0, 4.25, 0, "trim"),
      B3(5.6, 1.1, 3.2, 0, 5, 0, "roof"),
      B3(2, 2.6, 0.12, 0, 1.3, 2.6, "trim"),
      piv("door", [-0.9, 0, 2.66], [B3(1.8, 2.4, 0.08, 0.9, 1.2, 0, "door")]),
      ...win(1.8, 1.6, -2.8, 1.8, 2.62),
      ...win(1.8, 1.6, 2.8, 1.8, 2.62),
      piv("lit", [0, 0, 0], [litWin(1.8, 1.6, -2.8, 1.8, 2.62), litWin(1.8, 1.6, 2.8, 1.8, 2.62)]),
      B3(5.6, 0.9, 0.12, 0, 3.5, 2.7, "sign"),
      letters("EMPORIUM", { at: [0, 3.24, 2.78], px: 0.1, c: "ink", glow: false }),
      ...[-3.6, -1.3, 1.3, 3.6].map((x) => CYL3(0.4, 3, 0.4, x, 1.5, 2.9, "wall"))
    ] });
    museum = (0, engine_exports.model)({ id: "b-museum", about: "The museum: a little temple with columns and a pediment", tags: ["building", "civic"], palette: { wall: "mist", trim: "white", roof: "slate", door: "plum", stone: "slate", glass: "navy", lit: "sand", accent: "sand", ink: "ink" }, parts: [
      B3(10, 3.8, 5.6, 0, 1.9, -0.4, "wall"),
      B3(10.6, 0.3, 6.6, 0, 0.15, 0, "stone"),
      B3(10.2, 0.2, 6.2, 0, 0.38, 0, "stone"),
      B3(10.6, 0.5, 6.4, 0, 4.1, 0, "trim"),
      ...gable(10.8, 1.5, 6.6, 4.34, "roof"),
      ...[-4.2, -2.5, -0.9, 0.9, 2.5, 4.2].map((x) => CYL3(0.5, 3.4, 0.5, x, 2.1, 2.7, "trim")),
      B3(1.5, 2.4, 0.1, 0, 1.6, 2.42, "door"),
      B3(5.6, 0.6, 0.1, 0, 4.1, 3.24, "accent"),
      letters("MUSEUM", { at: [0, 3.84, 3.32], px: 0.1, c: "ink", glow: false }),
      piv("lit", [0, 0, 0], [litWin(1.3, 2.2, 0, 1.6, 2.44)])
    ] });
    hall = (0, engine_exports.model)({ id: "b-hall", about: "Town Hall and Post: a clock, a flag and a post box", tags: ["building", "civic"], palette: { wall: "sand", trim: "white", roof: "blue", roof2: "navy", door: "teal", stone: "slate", glass: "navy", lit: "sand", flag: "red", clock: "white", ink: "ink", post: "red" }, parts: [
      B3(8, 3.2, 4.8, 0, 1.6, 0, "wall"),
      B3(8.1, 0.26, 4.9, 0, 0.13, 0, "stone"),
      ...gable(8.5, 1.6, 5.4, 3.2, "roof"),
      B3(8.5, 0.1, 0.3, 0, 4.78, 0, "roof2"),
      B3(2, 1.4, 2, 0, 5.2, 0.6, "wall"),
      ...gable(2.3, 0.8, 2.3, 5.9, "roof").map((p) => ({ ...p, at: [0, p.at[1], p.at[2] + 0.6] })),
      CYL3(0.9, 0.9, 0.1, 0, 5.2, 1.65, "clock", { rot: [90, 0, 0] }),
      B3(0.06, 0.34, 0.05, 0, 5.34, 1.72, "ink"),
      B3(0.24, 0.06, 0.05, 0.1, 5.2, 1.72, "ink"),
      B3(1.5, 2.2, 0.12, 0, 1.1, 2.42, "trim"),
      piv("door", [-0.65, 0, 2.48], [B3(1.3, 2.1, 0.08, 0.65, 1.05, 0, "door")]),
      ...win(1.1, 1.1, -2.6, 1.6, 2.42),
      ...win(1.1, 1.1, 2.6, 1.6, 2.42),
      piv("lit", [0, 0, 0], [litWin(1.1, 1.1, -2.6, 1.6, 2.42), litWin(1.1, 1.1, 2.6, 1.6, 2.42)]),
      B3(0.08, 2.4, 0.08, -3.6, 4.6, 2, "ink"),
      piv("flag", [-3.56, 5.3, 2], [B3(0.9, 0.54, 0.05, 0.45, 0, 0, "flag")]),
      B3(0.5, 1, 0.4, 4.4, 0.5, 2.2, "post"),
      BALL3(0.5, 0.3, 0.4, 4.4, 1, 2.2, "post"),
      B3(0.34, 0.05, 0.05, 4.4, 0.72, 2.42, "ink")
    ] });
    mothwickShop = (0, engine_exports.model)({ id: "b-mothwick", about: "Mothwick's: a tailor's with a giant spool on the roof", tags: ["building", "shop"], palette: { wall: "plum", trim: "sand", roof: "night", door: "red", stone: "slate", glass: "sky", lit: "sand", spool: "red", wood: "sand", ink: "ink" }, parts: [
      B3(6.2, 2.8, 4.2, 0, 1.4, 0, "wall"),
      B3(6.3, 0.26, 4.3, 0, 0.13, 0, "stone"),
      B3(6.6, 0.3, 4.6, 0, 2.95, 0, "trim"),
      B3(5.4, 0.5, 3.4, 0, 3.3, 0, "roof"),
      CYL3(1.8, 0.2, 1.8, 0, 3.66, 0, "wood"),
      CYL3(1.3, 1.2, 1.3, 0, 4.36, 0, "spool"),
      CYL3(1.8, 0.2, 1.8, 0, 5.06, 0, "wood"),
      B3(1.3, 2, 0.12, 0, 1, 2.1, "trim"),
      piv("door", [-0.55, 0, 2.16], [B3(1.1, 1.9, 0.08, 0.55, 0.95, 0, "door")]),
      ...win(1.4, 1.2, -2, 1.4, 2.12),
      ...win(1.4, 1.2, 2, 1.4, 2.12),
      piv("lit", [0, 0, 0], [litWin(1.4, 1.2, -2, 1.4, 2.12), litWin(1.4, 1.2, 2, 1.4, 2.12)]),
      letters("MOTHWICK'S", { at: [0, 2.72, 2.34], px: 0.06, c: "trim", glow: false })
    ] });
    lighthouse = (0, engine_exports.model)({ id: "b-lighthouse", about: "A striped lighthouse", tags: ["building", "scenery"], palette: { a: "white", b: "red", roof: "night", lamp: "sand", stone: "slate" }, parts: [
      CYL3(3.2, 0.5, 3.2, 0, 0.25, 0, "stone"),
      CYL3(2.4, 2, 2.4, 0, 1.5, 0, "a", { top: 0.9 }),
      CYL3(2.16, 2, 2.16, 0, 3.5, 0, "b", { top: 0.88 }),
      CYL3(1.9, 2, 1.9, 0, 5.5, 0, "a", { top: 0.86 }),
      CYL3(2, 0.2, 2, 0, 6.6, 0, "roof"),
      piv("beam", [0, 7.2, 0], [CYL3(0.9, 1, 0.9, 0, 0, 0, "lamp", { glow: true })]),
      CONE3(1.6, 0.9, 1.6, 0, 8.1, 0, "roof")
    ] });
    busStop = (0, engine_exports.model)({ id: "bus-shelter", about: "A rural bus shelter and sign, leaning", tags: ["town", "prop"], palette: { wood: "orange", roof: "teal", post: "night", sign: "sky", ink: "white" }, parts: [
      B3(3.2, 0.14, 1.5, 0, 2.3, 0, "roof", { rot: [4, 0, 0] }),
      B3(0.14, 2.3, 0.14, -1.5, 1.15, 0.6, "post"),
      B3(0.14, 2.3, 0.14, 1.5, 1.15, 0.6, "post"),
      B3(3.2, 2.1, 0.1, 0, 1.15, -0.65, "wood"),
      B3(2.4, 0.1, 0.5, 0, 0.5, -0.3, "post"),
      B3(0.14, 2.6, 0.14, 2.3, 1.3, 1, "post"),
      CYL3(0.8, 0.1, 0.8, 2.3, 2.7, 1, "sign", { rot: [90, 0, 0] }),
      letters("BUS", { at: [2.3, 2.52, 1.07], px: 0.05, c: "ink", glow: false })
    ] });
    bus = (0, engine_exports.model)({ id: "bus", about: "The bus: round, sky blue, nobody knows how it runs", tags: ["vehicle"], palette: { body: "sky", roof: "white", trim: "navy", glass: "cyan", tyre: "ink", hub: "sand", lit: "sand" }, parts: [
      B3(5.6, 1.7, 2.3, 0, 1.25, 0, "body"),
      B3(5.7, 0.2, 2.34, 0, 0.5, 0, "trim"),
      BALL3(5.8, 0.7, 2.3, 0, 2.08, 0, "roof"),
      ...[-2, -0.8, 0.4, 1.6].map((x) => B3(0.9, 0.7, 0.06, x, 1.6, 1.16, "glass")),
      ...[-2, -0.8, 0.4, 1.6].map((x) => B3(0.9, 0.7, 0.06, x, 1.6, -1.16, "glass")),
      B3(0.06, 0.9, 1.9, 2.82, 1.6, 0, "glass"),
      BALL3(0.2, 0.2, 0.1, 2.82, 0.9, 0.8, "lit", { glow: true }),
      BALL3(0.2, 0.2, 0.1, 2.82, 0.9, -0.8, "lit", { glow: true }),
      ...[-1.7, 1.7].flatMap((x) => [1.1, -1.1].map((z) => CYL3(0.86, 0.3, 0.86, x, 0.43, z, "tyre", { rot: [90, 0, 0] }))),
      B3(0.9, 1.5, 0.08, 2.1, 1, 1.17, "trim")
    ] });
    pearFruit = (r = 1) => piv("fruit", [0, 0, 0], [[-0.5, 2.5, 0.8], [0.7, 2.1, 0.7], [0.1, 2.7, 1]].map(([x, y, z]) => BALL3(0.26 * r, 0.3 * r, 0.26 * r, x * r, y * r, z * r, "fruit")));
    pearTree = (0, engine_exports.model)({ id: "tree-pear", about: "A pear tree with round chunky canopy and fruit", tags: ["nature", "tree"], palette: { trunk: "plum", leaf: "green", leaf2: "lime", fruit: "sand" }, parts: [
      CYL3(0.42, 1.5, 0.42, 0, 0.75, 0, "trunk", { top: 0.7 }),
      BALL3(2.4, 1.9, 2.4, 0, 2.4, 0, "leaf", { seg: 9 }),
      BALL3(1.5, 1.2, 1.5, 0.3, 3.1, 0.3, "leaf2", { seg: 8 }),
      pearFruit(1)
    ] });
    pineTree = (0, engine_exports.model)({ id: "tree-pine", about: "A chunky pine", tags: ["nature", "tree"], palette: { trunk: "plum", leaf: "teal", leaf2: "green", snow: "teal" }, parts: [
      CYL3(0.36, 0.9, 0.36, 0, 0.45, 0, "trunk"),
      CONE3(2.3, 1.6, 2.3, 0, 1.5, 0, "leaf", { seg: 8 }),
      CONE3(1.8, 1.4, 1.8, 0, 2.4, 0, "leaf2", { seg: 8 }),
      CONE3(1.3, 1.3, 1.3, 0, 3.3, 0, "leaf", { seg: 8 })
    ] });
    palmTree = (0, engine_exports.model)({ id: "tree-palm", about: "A palm with a hopeful lean", tags: ["nature", "tree"], palette: { trunk: "sand", band: "orange", leaf: "green", leaf2: "lime", fruit: "plum" }, parts: [
      ...[0, 1, 2, 3, 4].map((i) => CYL3(0.34 - i * 0.02, 0.62, 0.34 - i * 0.02, i * 0.07, 0.31 + i * 0.6, 0, i % 2 ? "band" : "trunk")),
      ...[0, 60, 120, 180, 240, 300].map((a, i) => ({ group: [B3(0.5, 0.08, 1.5, 0, 0, 0.72, i % 2 ? "leaf" : "leaf2", { rot: [22, 0, 0] })], at: [0.32, 3.2, 0], rot: [0, a, 0] })),
      piv("fruit", [0, 0, 0], [BALL3(0.26, 0.26, 0.26, 0.5, 3, 0.1, "fruit"), BALL3(0.26, 0.26, 0.26, 0.2, 3, 0.2, "fruit")])
    ] });
    sapling = (0, engine_exports.model)({ id: "sapling", about: "A young tree, stage param", tags: ["nature", "tree"], palette: { trunk: "plum", leaf: "lime" }, params: { stage: [0, 0, 2] }, parts: (p) => [
      CYL3(0.1 + p.stage * 0.04, 0.5 + p.stage * 0.4, 0.1 + p.stage * 0.04, 0, 0.25 + p.stage * 0.2, 0, "trunk"),
      BALL3(0.5 + p.stage * 0.4, 0.5 + p.stage * 0.4, 0.5 + p.stage * 0.4, 0, 0.6 + p.stage * 0.5, 0, "leaf")
    ] });
    oldPear = (0, engine_exports.model)({ id: "old-pear", about: "The Old Pear: the huge tree at the heart of the plaza, hung with lights at the end", tags: ["nature", "tree", "landmark"], palette: { trunk: "plum", trunk2: "red", leaf: "green", leaf2: "lime", light: "sand", fruit: "sand" }, parts: [
      CYL3(1.4, 2.4, 1.4, 0, 1.2, 0, "trunk", { top: 0.7 }),
      CYL3(0.4, 1.6, 0.4, -0.8, 2.2, 0.2, "trunk2", { rot: [0, 0, 40] }),
      CYL3(0.4, 1.6, 0.4, 0.9, 2.3, -0.1, "trunk2", { rot: [0, 0, -40] }),
      BALL3(5, 3.4, 5, 0, 4.2, 0, "leaf", { seg: 10 }),
      BALL3(3.3, 2.2, 3.3, 1, 5.2, 0.6, "leaf2", { seg: 9 }),
      BALL3(2.8, 2, 2.8, -1.2, 5, 0.8, "leaf2", { seg: 9 }),
      piv("fruit", [0, 0, 0], [[-1.6, 3.1, 1.6], [1.3, 3, 1.8], [0.1, 3.2, 2.2], [2, 3.6, 0.8]].map(([x, y, z]) => BALL3(0.3, 0.36, 0.3, x, y, z, "fruit"))),
      piv("lights", [0, 0, 0], [...[0, 40, 80, 120, 160, 200, 240, 280, 320].flatMap((a, i) => [BALL3(0.26, 0.26, 0.26, Math.sin(a * Math.PI / 180) * 2.5, 3 + i % 3 * 0.7, Math.cos(a * Math.PI / 180) * 2.5, "light", { glow: true }), BALL3(0.24, 0.24, 0.24, Math.sin((a + 20) * Math.PI / 180) * 1.5, 5.6 + i % 2 * 0.4, Math.cos((a + 20) * Math.PI / 180) * 1.5, "light", { glow: true })])])
    ] });
    oldBell = (0, engine_exports.model)({ id: "old-bell", about: "The Old Bell in its little frame", tags: ["town", "landmark"], palette: { wood: "plum", roof: "teal", bell: "orange", dark: "night", stone: "slate" }, parts: [
      B3(1.6, 0.2, 1.1, 0, 0.1, 0, "stone"),
      B3(0.16, 2.3, 0.16, -0.62, 1.2, 0, "wood"),
      B3(0.16, 2.3, 0.16, 0.62, 1.2, 0, "wood"),
      B3(1.5, 0.16, 0.16, 0, 2.3, 0, "wood"),
      ...gable(1.8, 0.5, 1.2, 2.34, "roof"),
      piv("bell", [0, 2.22, 0], [{ lathe: [[0.34, 0], [0.36, 0.04], [0.26, 0.26], [0.2, 0.56], [0.1, 0.72], [0, 0.74]], at: [0, -0.78, 0], c: "bell", seg: 10 }, BALL3(0.14, 0.14, 0.14, 0, -0.84, 0, "dark")])
    ] });
    flower = (0, engine_exports.model)({ id: "flower", about: "A flower, species by param", tags: ["nature", "flower"], palette: { stem: "green", petal: "red", heart: "sand" }, params: { species: [0, 0, 3], wilt: [0, 0, 1], big: [0, 0, 1] }, parts: (p) => {
      const lean = p.wilt ? 40 : 0;
      const s = 1 + p.big * 0.3;
      const head = (() => {
        switch (Math.round(p.species)) {
          case 0:
            return [CONE3(0.34 * s, 0.34 * s, 0.34 * s, 0, 0, 0, "petal", { seg: 6 }), B3(0.1, 0.1, 0.1, 0, 0.2 * s, 0, "heart")];
          // tulip-ish "cup"
          case 1:
            return [...[0, 72, 144, 216, 288].map((a) => BALL3(0.16 * s, 0.1 * s, 0.16 * s, Math.sin(a * Math.PI / 180) * 0.14 * s, 0, Math.cos(a * Math.PI / 180) * 0.14 * s, "petal")), BALL3(0.14, 0.12, 0.14, 0, 0.04, 0, "heart")];
          // daisy-ish "wheel"
          case 2:
            return [BALL3(0.34 * s, 0.26 * s, 0.34 * s, 0, 0, 0, "petal"), BALL3(0.2 * s, 0.18 * s, 0.2 * s, 0, 0.12 * s, 0, "heart")];
          // rose-ish "bud"
          default:
            return [B3(0.14 * s, 0.34 * s, 0.14 * s, 0, 0.06, 0, "petal"), B3(0.26 * s, 0.1 * s, 0.26 * s, 0, -0.06, 0, "petal"), B3(0.1, 0.1, 0.1, 0, 0.26 * s, 0, "heart")];
        }
      })();
      return [B3(0.06, 0.34, 0.06, 0, 0.17, 0, "stem"), mirrorLeaf(), { group: head, at: [0, 0.42, 0], rot: [lean, 0, 0] }];
    } });
    weed = (0, engine_exports.model)({ id: "weed", about: "A cheerful weed", tags: ["nature"], palette: { a: "teal", b: "green" }, parts: [
      CONE3(0.1, 0.4, 0.1, 0, 0.2, 0, "a", { rot: [0, 0, 12] }),
      CONE3(0.1, 0.32, 0.1, 0.1, 0.16, 0.04, "b", { rot: [0, 0, -18] }),
      CONE3(0.1, 0.36, 0.1, -0.1, 0.18, -0.03, "b", { rot: [10, 0, 22] }),
      BALL3(0.1, 0.1, 0.1, 0, 0.4, 0, "b")
    ] });
    beanstalk = (0, engine_exports.model)({ id: "beanstalk", about: "A beanstalk grown from buried beans", tags: ["nature"], palette: { stalk: "green", leaf: "lime", bag: "sand", tie: "orange" }, params: { stage: [0, 0, 2] }, parts: (p) => {
      const h = 0.4 + p.stage * 0.9;
      const parts = [{ tube: [[0, 0, 0], [0.1, h * 0.5, 0.06], [-0.06, h, 0]], r: 0.08, at: [0, 0.05, 0], c: "stalk" }, B3(0.3, 0.08, 0.18, 0.14, h * 0.5, 0, "leaf", { rot: [0, 0, 18] }), B3(0.3, 0.08, 0.18, -0.16, h * 0.8, 0.04, "leaf", { rot: [0, 0, -18] })];
      if (p.stage >= 2) parts.push(BALL3(0.4, 0.42, 0.4, -0.06, h + 0.16, 0, "bag"), B3(0.24, 0.08, 0.24, -0.06, h + 0.38, 0, "tie"));
      return parts;
    } });
    crackMark = (0, engine_exports.model)({ id: "crack-mark", about: "A star-shaped crack in the ground", tags: ["ground"], palette: { c: "night" }, floats: true, parts: [0, 72, 144, 216, 288].map((a) => B3(0.08, 0.02, 0.42, Math.sin(a * Math.PI / 180) * 0.2, 0.012, Math.cos(a * Math.PI / 180) * 0.2, "c", { rot: [0, a, 0] })) });
    hole = (0, engine_exports.model)({ id: "hole", about: "A hole you dug", tags: ["ground"], palette: { dark: "ink", rim: "plum" }, floats: true, parts: [CYL3(0.86, 0.03, 0.86, 0, 0.015, 0, "rim", { seg: 8 }), CYL3(0.62, 0.04, 0.62, 0, 0.02, 0, "dark", { seg: 8 })] });
    shell = (0, engine_exports.model)({ id: "shell-prop", about: "A shell on the sand", tags: ["nature"], palette: { a: "white", b: "orange" }, parts: [BALL3(0.34, 0.14, 0.3, 0, 0.07, 0, "a"), B3(0.04, 0.05, 0.28, 0.06, 0.12, 0, "b"), B3(0.04, 0.05, 0.28, -0.06, 0.12, 0, "b")] });
    driftwood = (0, engine_exports.model)({ id: "driftwood", about: "A bleached driftwood log", tags: ["nature"], palette: { a: "mist", b: "slate" }, parts: [CYL3(0.3, 1.4, 0.3, 0, 0.15, 0, "a", { rot: [0, 0, 90] }), CYL3(0.16, 0.6, 0.16, 0.2, 0.3, 0.12, "b", { rot: [30, 0, 40] })] });
    dropBag = (0, engine_exports.model)({ id: "drop-bag", about: "A bag of beans", tags: ["item"], palette: { bag: "sand", tie: "orange", mark: "plum" }, parts: [BALL3(0.46, 0.46, 0.46, 0, 0.23, 0, "bag"), B3(0.2, 0.08, 0.2, 0, 0.46, 0, "tie"), B3(0.14, 0.14, 0.02, 0, 0.26, 0.23, "mark")] });
    dropLeaf = (0, engine_exports.model)({ id: "drop-leaf", about: "A dropped thing on the ground", tags: ["item"], palette: { a: "lime", b: "green" }, parts: [BALL3(0.42, 0.14, 0.42, 0, 0.07, 0, "a"), B3(0.28, 0.02, 0.05, 0, 0.14, 0, "b")] });
    pearDrop = (0, engine_exports.model)({ id: "pear-drop", about: "A pear on the ground", tags: ["item"], palette: { a: "sand", b: "plum" }, parts: [BALL3(0.3, 0.3, 0.3, 0, 0.15, 0, "a"), BALL3(0.2, 0.2, 0.2, 0, 0.32, 0, "a"), B3(0.04, 0.1, 0.04, 0, 0.46, 0, "b")] });
    mailboxModel = (0, engine_exports.model)({ id: "mailbox", about: "A mailbox with a flag", tags: ["town"], palette: { post: "plum", box: "sky", flag: "red", trim: "white" }, parts: [
      B3(0.16, 1, 0.16, 0, 0.5, 0, "post"),
      B3(0.62, 0.4, 0.42, 0, 1.15, 0, "box"),
      BALL3(0.62, 0.3, 0.42, 0, 1.34, 0, "box"),
      B3(0.06, 0.3, 0.36, 0.32, 1.15, 0, "trim"),
      piv("flag", [0.34, 1.02, -0.12], [B3(0.04, 0.42, 0.04, 0, 0.2, 0, "flag"), B3(0.04, 0.16, 0.2, 0, 0.38, 0.1, "flag")])
    ] });
    bridgeModel = (0, engine_exports.model)({ id: "bridge-rails", about: "Bridge rails along X on both sides", tags: ["town"], palette: { post: "plum", rail: "orange" }, params: { length: [4, 2, 8], width: [2, 1, 4] }, parts: (p) => {
      const parts = [];
      for (const z of [-p.width / 2, p.width / 2]) {
        parts.push(B3(p.length, 0.1, 0.1, 0, 0.72, z, "rail"));
        for (let i = 0; i <= Math.round(p.length / 2); i++) parts.push(B3(0.14, 0.78, 0.14, -p.length / 2 + i * 2, 0.39, z, "post"));
      }
      return parts;
    } });
    rockProp = (0, engine_exports.model)({ id: "rock-prop", about: "A chunky rock worth hitting", tags: ["nature"], palette: { a: "slate", b: "mist" }, parts: [{ lump: [1, 0.72, 0.9], at: [0, 0.36, 0], c: "a", seed: 3 }, { lump: [0.44, 0.24, 0.4], at: [0.1, 0.72, 0.06], c: "b", seed: 4 }] });
    waterfall = (0, engine_exports.model)({ id: "waterfall", about: "A sheet of falling water", tags: ["nature"], palette: { a: "cyan", b: "white", c: "sky" }, floats: true, params: { width: [4, 1, 8], height: [4, 1, 14] }, parts: (p) => Array.from({ length: Math.round(p.width / 0.5) }, (_, i) => B3(0.5, p.height, 0.2, -p.width / 2 + 0.25 + i * 0.5, p.height / 2, 0, i % 3 === 0 ? "b" : i % 3 === 1 ? "a" : "c", { glow: true })) });
    stageFloor = (0, engine_exports.model)({ id: "stage-floor", about: "A low stage with curtains", tags: ["venue"], palette: { boards: "orange", edge: "plum", curtain: "red", gold: "sand" }, parts: [B3(10, 0.3, 3, 0, 0.15, 0, "boards"), B3(10, 0.08, 0.1, 0, 0.3, 1.5, "gold"), B3(2, 3.4, 0.2, -4, 1.7, -1.3, "curtain"), B3(2, 3.4, 0.2, 4, 1.7, -1.3, "curtain"), B3(10, 0.6, 0.2, 0, 3.4, -1.3, "curtain"), B3(10, 0.08, 0.22, 0, 3.08, -1.3, "gold")] });
    rowboat = (0, engine_exports.model)({ id: "rowboat-prop", about: "A rowing boat, tied up and sulking", tags: ["scenery"], floats: true, palette: { hull: "red", inner: "sand", trim: "white" }, parts: [B3(1.1, 0.34, 2.6, 0, 0.3, 0, "hull"), WEDGE(1.1, 0.34, 0.7, 0, 0.3, 1.6, "hull", { rot: [0, 180, 0] }), B3(0.86, 0.1, 2.2, 0, 0.44, 0, "inner"), B3(1.14, 0.06, 2.64, 0, 0.48, 0, "trim"), B3(0.9, 0.06, 0.26, 0, 0.5, 0.2, "hull")] });
    snowball = (0, engine_exports.model)({ id: "snowball", about: "A snowball you roll", tags: ["winter"], palette: { a: "white", b: "mist" }, parts: [BALL3(1, 1, 1, 0, 0.5, 0, "a", { seg: 10 }), B3(0.2, 0.06, 0.06, 0.1, 0.8, 0.42, "b")] });
    snowman = (0, engine_exports.model)({ id: "snowman", about: "A snowman with opinions about proportions", tags: ["winter"], palette: { a: "white", hat: "night", nose: "orange", eye: "ink", scarf: "red" }, parts: [
      BALL3(1.1, 1, 1.1, 0, 0.5, 0, "a", { seg: 10 }),
      BALL3(0.8, 0.76, 0.8, 0, 1.3, 0, "a", { seg: 10 }),
      CONE3(0.1, 0.3, 0.1, 0, 1.36, 0.44, "nose", { rot: [90, 0, 0] }),
      B3(0.09, 0.09, 0.04, -0.15, 1.46, 0.38, "eye"),
      B3(0.09, 0.09, 0.04, 0.15, 1.46, 0.38, "eye"),
      B3(0.86, 0.14, 0.86, 0, 0.98, 0, "scarf"),
      CYL3(0.5, 0.06, 0.5, 0, 1.68, 0, "hat"),
      CYL3(0.34, 0.36, 0.34, 0, 1.86, 0, "hat")
    ] });
    lantern = (0, engine_exports.model)({ id: "lantern", about: "A floating paper lantern", tags: ["festival"], palette: { paper: "red", lit: "sand", base: "plum" }, floats: true, parts: [B3(0.5, 0.06, 0.5, 0, 0.03, 0, "base"), B3(0.34, 0.34, 0.34, 0, 0.24, 0, "paper", { glow: true }), B3(0.14, 0.14, 0.14, 0, 0.2, 0.12, "lit", { glow: true })] });
    balloon = (0, engine_exports.model)({ id: "balloon", about: "A balloon with a present on a string", tags: ["festival"], palette: { a: "red", gift: "sand", ribbon: "plum", str: "white" }, floats: true, parts: [BALL3(0.7, 0.86, 0.7, 0, 1.3, 0, "a"), B3(0.03, 0.6, 0.03, 0, 0.6, 0, "str"), B3(0.34, 0.3, 0.34, 0, 0.15, 0, "gift"), B3(0.36, 0.06, 0.1, 0, 0.16, 0, "ribbon"), B3(0.1, 0.06, 0.36, 0, 0.16, 0, "ribbon")] });
    wasps = (0, engine_exports.model)({ id: "wasp-nest", about: "A wasp nest, papery and regretful", tags: ["nature"], palette: { a: "sand", b: "orange", c: "ink" }, floats: true, parts: [BALL3(0.46, 0.56, 0.46, 0, 0.28, 0, "a"), B3(0.46, 0.05, 0.46, 0, 0.3, 0, "b"), B3(0.46, 0.05, 0.46, 0, 0.16, 0, "b"), BALL3(0.12, 0.12, 0.05, 0, 0.14, 0.22, "c")] });
    stall = (0, engine_exports.model)({ id: "rind-stall", about: "Old Rind's cheese barrow", tags: ["town", "market"], palette: { wood: "plum", cheese: "sand", rind: "orange", cloth: "night", wheel: "ink" }, parts: [
      B3(1.8, 0.14, 1, 0, 0.7, 0, "wood"),
      B3(1.8, 0.4, 0.08, 0, 0.9, 0.5, "wood"),
      B3(1.8, 0.4, 0.08, 0, 0.9, -0.5, "wood"),
      B3(0.08, 0.4, 1, 0.9, 0.9, 0, "wood"),
      B3(0.08, 0.4, 1, -0.9, 0.9, 0, "wood"),
      CYL3(0.86, 0.14, 0.86, -0.7, 0.43, 0.6, "wheel", { rot: [90, 0, 0] }),
      CYL3(0.86, 0.14, 0.86, 0.7, 0.43, 0.6, "wheel", { rot: [90, 0, 0] }),
      CYL3(0.7, 0.3, 0.7, -0.4, 1.05, 0, "cheese"),
      CYL3(0.6, 0.3, 0.6, 0.42, 1.05, 0, "cheese"),
      CYL3(0.6, 0.06, 0.6, 0, 1.26, 0, "rind")
    ] });
    stoolPot = (0, engine_exports.model)({ id: "soup-pot", about: "Dorrit's giant soup pot on a fire", tags: ["festival"], palette: { pot: "night", rim: "slate", soup: "orange", fire: "red", fire2: "sand", stone: "slate", wood: "plum" }, parts: [
      CYL3(2, 0.2, 2, 0, 0.1, 0, "stone"),
      B3(0.2, 0.2, 1.6, 0, 0.26, 0, "wood", { rot: [0, 45, 0] }),
      B3(0.2, 0.2, 1.6, 0, 0.26, 0, "wood", { rot: [0, -45, 0] }),
      CONE3(0.5, 0.7, 0.5, 0, 0.52, 0, "fire", { glow: true }),
      CYL3(1.8, 1.2, 1.8, 0, 1.2, 0, "pot", { top: 1.05 }),
      CYL3(1.96, 0.14, 1.96, 0, 1.82, 0, "rim"),
      piv("soup", [0, 1.9, 0], [CYL3(1.64, 0.06, 1.64, 0, 0, 0, "soup")])
    ] });
    ring = (0, engine_exports.model)({ id: "chalk-ring", about: "A chalked ring for the Seed Toss", tags: ["festival"], palette: { a: "white" }, floats: true, parts: [{ torus: [1.6, 0.06, 1.6], at: [0, 0.04, 0], c: "a", seg: 16 }] });
    rocket = (0, engine_exports.model)({ id: "jar-of-beans", about: "The Bean Jar", tags: ["civic"], palette: { glass: "cyan", bean: "red", lid: "sand" }, parts: [CYL3(0.6, 0.8, 0.6, 0, 0.4, 0, "glass", { top: 0.86 }), BALL3(0.46, 0.4, 0.46, 0, 0.26, 0, "bean"), CYL3(0.5, 0.1, 0.5, 0, 0.84, 0, "lid")] });
    postCounter = (0, engine_exports.model)({ id: "counter", about: "A shop or post counter", tags: ["furniture"], palette: { top: "sand", side: "plum", trim: "orange" }, params: { w: [3, 1, 8] }, parts: (p) => [B3(p.w, 0.9, 0.7, 0, 0.45, 0, "side"), B3(p.w + 0.1, 0.08, 0.8, 0, 0.94, 0, "top"), B3(p.w, 0.1, 0.05, 0, 0.5, 0.36, "trim")] });
    shelf = (0, engine_exports.model)({ id: "shelf", about: "A shop shelf", tags: ["furniture"], palette: { wood: "plum", top: "orange" }, params: { w: [1.6, 0.8, 4] }, parts: (p) => [B3(p.w, 1.1, 0.5, 0, 0.55, 0, "wood"), B3(p.w + 0.06, 0.06, 0.56, 0, 1.12, 0, "top")] });
    tank = (0, engine_exports.model)({ id: "tank", about: "A big aquarium or bug case", tags: ["furniture", "museum"], palette: { frame: "night", water: "sky", sand: "sand", top: "slate" }, params: { w: [1.6, 0.8, 4] }, parts: (p) => [B3(p.w, 0.5, 0.8, 0, 0.25, 0, "frame"), B3(p.w - 0.1, 0.9, 0.7, 0, 0.95, 0, "water"), B3(p.w - 0.1, 0.1, 0.7, 0, 0.55, 0, "sand"), B3(p.w, 0.08, 0.8, 0, 1.44, 0, "top")] });
    plinth = (0, engine_exports.model)({ id: "plinth", about: "A museum plinth", tags: ["furniture", "museum"], palette: { a: "mist", b: "white", c: "slate" }, parts: [B3(0.9, 0.5, 0.9, 0, 0.25, 0, "a"), B3(1, 0.08, 1, 0, 0.54, 0, "b"), B3(1, 0.08, 1, 0, 0.04, 0, "c")] });
    ribbon = (0, engine_exports.model)({ id: "ribbon-posts", about: "Two posts and a ribbon, waiting", tags: ["festival"], palette: { post: "night", ribbon: "red" }, parts: [B3(0.12, 1, 0.12, 0, 0.5, -0.8, "post"), B3(0.12, 1, 0.12, 0, 0.5, 0.8, "post"), piv("ribbon", [0, 0.84, 0], [B3(0.04, 0.16, 1.6, 0, 0, 0, "ribbon")])] });
    front = (id, name, { wall = "night", trim = "plum", door = "red", glass = "cyan", neon = "sky", neon2 = "red", w = 6, d = 5, h = 5, sign = name, signPx = 0.09, extras = [] } = {}) => (0, engine_exports.model)({
      id: `city-${id}`,
      about: `${name}: a City front with big glass and a neon sign`,
      tags: ["building", "city"],
      palette: { wall, trim, door, glass, neon, neon2, lit: "sand", roof: "ink" },
      parts: [
        B3(w, h, d, 0, h / 2, 0, "wall"),
        B3(w + 0.1, 0.3, d + 0.1, 0, h + 0.15, 0, "trim"),
        B3(1.3, 2.1, 0.1, 0, 1.05, d / 2 + 0.02, "trim"),
        piv("door", [-0.55, 0, d / 2 + 0.08], [B3(1.1, 2, 0.07, 0.55, 1, 0, "door")]),
        B3(w * 0.3, 1.6, 0.08, -w * 0.32, 1.3, d / 2 + 0.02, "trim"),
        B3(w * 0.3, 1.6, 0.08, w * 0.32, 1.3, d / 2 + 0.02, "trim"),
        B3(w * 0.3 - 0.14, 1.46, 0.09, -w * 0.32, 1.3, d / 2 + 0.04, "glass", { glow: true }),
        B3(w * 0.3 - 0.14, 1.46, 0.09, w * 0.32, 1.3, d / 2 + 0.04, "glass", { glow: true }),
        B3(textWidth(sign) * signPx + 0.5, 0.86, 0.08, 0, 3.2, d / 2 + 0.03, "roof"),
        piv("neon", [0, 0, 0], [letters(sign, { at: [0, 2.96, d / 2 + 0.1], px: signPx, c: "neon", glow: true }), B3(textWidth(sign) * signPx + 0.6, 0.06, 0.06, 0, 3.66, d / 2 + 0.1, "neon2", { glow: true }), B3(textWidth(sign) * signPx + 0.6, 0.06, 0.06, 0, 2.76, d / 2 + 0.1, "neon2", { glow: true })]),
        ...extras
      ]
    });
    CITY_FRONTS = [
      front("salon", "SNIP & GOSSIP", { wall: "teal", trim: "white", door: "plum", glass: "cyan", neon: "cyan", neon2: "lime" }),
      front("couture", "MAISON PLUME", { wall: "plum", trim: "sand", door: "ink", glass: "sand", neon: "orange", neon2: "sand", extras: [B3(2.2, 0.06, 0.06, 0, 0.8, 3, "door"), B3(0.1, 0.9, 0.1, -1.1, 0.45, 3, "trim"), B3(0.1, 0.9, 0.1, 1.1, 0.45, 3, "trim")] }),
      front("cafe", "THE DAILY GRIND", { wall: "night", trim: "orange", door: "orange", glass: "sand", neon: "lime", neon2: "orange", signPx: 0.08 }),
      front("bureau", "BETTER BURROWS", { wall: "slate", trim: "mist", door: "navy", glass: "sky", neon: "white", neon2: "sky", signPx: 0.08 }),
      front("theatre", "THE PALACE", { wall: "plum", trim: "red", door: "red", glass: "orange", neon: "sand", neon2: "red", d: 7, w: 5 }),
      front("auction", "PEMBERTON", { wall: "navy", trim: "sand", door: "teal", glass: "sky", neon: "cyan", neon2: "sand", d: 7, w: 5 }),
      front("magda", "GENUINE", { wall: "ink", trim: "night", door: "plum", glass: "plum", neon: "lime", neon2: "red", w: 5, h: 4, d: 4, signPx: 0.07 }),
      front("tent", "FORTUNES", { wall: "plum", trim: "orange", door: "red", glass: "orange", neon: "sand", neon2: "orange", w: 4, h: 3.4, d: 4, signPx: 0.07 })
    ];
    skyline = (0, engine_exports.model)({ id: "city-skyline", about: "A block of city towers with windows", tags: ["city", "scenery"], palette: { a: "night", b: "ink", c: "slate", w: "sand", w2: "cyan" }, parts: (() => {
      const parts = [];
      let x = -24;
      const towers = [[5, 12], [4, 17], [6, 10], [4, 20], [5, 14], [6, 9], [4, 18], [5, 13], [5, 22], [6, 11]];
      towers.forEach(([w, h], i) => {
        parts.push(B3(w, h, 4, x + w / 2, h / 2, 0, i % 3 === 0 ? "a" : i % 3 === 1 ? "b" : "c"));
        for (let ry = 2; ry < h - 1; ry += 2) for (let rx = 0.8; rx < w - 0.4; rx += 1.2) if ((i * 7 + ry * 3 + Math.round(rx * 5)) % 4 !== 0) parts.push(B3(0.5, 0.8, 0.05, x + rx, ry, 2.02, (ry + i) % 5 === 0 ? "w2" : "w", { glow: true, collide: false }));
        x += w;
      });
      return parts;
    })() });
    cityLamp = (0, engine_exports.model)({ id: "city-lamp", about: "A city street lamp", tags: ["city", "lighting"], palette: { pole: "ink", lit: "sand" }, parts: [B3(0.14, 3, 0.14, 0, 1.5, 0, "pole"), B3(0.7, 0.1, 0.1, 0.3, 3, 0, "pole"), BALL3(0.34, 0.26, 0.34, 0.6, 2.86, 0, "lit", { glow: true })] });
    telescope = (0, engine_exports.model)({ id: "telescope", about: "A brass telescope on a tripod", tags: ["furniture"], palette: { brass: "sand", leg: "plum" }, parts: [CYL3(0.24, 1.2, 0.24, 0, 1.3, 0, "brass", { rot: [50, 0, 0] }), B3(0.06, 1, 0.06, 0.2, 0.5, 0.1, "leg", { rot: [0, 0, -14] }), B3(0.06, 1, 0.06, -0.2, 0.5, 0.1, "leg", { rot: [0, 0, 14] }), B3(0.06, 1, 0.06, 0, 0.5, -0.2, "leg", { rot: [14, 0, 0] })] });
    OWN_MODELS = [
      cottage,
      homeTier1,
      homeTier2,
      homeTier3,
      homeTier4,
      storeTier1,
      storeTier2,
      storeTier3,
      museum,
      hall,
      mothwickShop,
      lighthouse,
      busStop,
      bus,
      pearTree,
      pineTree,
      palmTree,
      sapling,
      oldPear,
      oldBell,
      flower,
      weed,
      beanstalk,
      crackMark,
      hole,
      shell,
      driftwood,
      dropBag,
      dropLeaf,
      pearDrop,
      mailboxModel,
      bridgeModel,
      rockProp,
      waterfall,
      stageFloor,
      rowboat,
      snowball,
      snowman,
      lantern,
      balloon,
      wasps,
      stall,
      stoolPot,
      ring,
      rocket,
      postCounter,
      shelf,
      tank,
      plinth,
      ribbon,
      skyline,
      cityLamp,
      telescope,
      ...CITY_FRONTS,
      ...ITEM_MODELS,
      ...Object.values(CRITTER_DEFS),
      ...CROWD_DEFS,
      avatarDef({})
    ];
    MODELS = new engine_exports.ModelCatalog([...engine_exports.MODEL_LIBRARY.all(), ...OWN_MODELS]);
  }
});

// src/ui/draw.js
function panel(hud, x, y, w, h, { fill = "white", trim = "sand", edge = "ink" } = {}) {
  hud.rect(x + 1, y, w - 2, h, edge);
  hud.rect(x, y + 1, w, h - 2, edge);
  hud.rect(x + 1, y + 1, w - 2, h - 2, trim);
  hud.rect(x + 3, y + 3, w - 6, h - 6, fill);
}
function bar(hud, x, y, w, h, t, color = "green", back = "night") {
  hud.rect(x, y, w, h, back);
  hud.rect(x, y, Math.round(w * Math.max(0, Math.min(1, t))), h, color);
}
function textBlock(hud, x, y, width, s, o = {}) {
  const lines = wrap(s, width, o.scale ?? 1);
  lines.forEach((l, i) => drawText(hud, x, y + i * (o.lineH ?? LINE_H), l, o));
  return lines.length;
}
var dim, DITHER_ROWS, inRect;
var init_draw = __esm({
  "src/ui/draw.js"() {
    init_font();
    dim = (hud, color = "ink") => {
      hud.sprite(0, 0, DITHER_ROWS, { "#": color }, { shadow: false });
    };
    DITHER_ROWS = [];
    for (let y = 0; y < 270; y++) {
      let row = "";
      for (let x = 0; x < 480; x++) row += (x + y) % 2 === 0 ? "#" : ".";
      DITHER_ROWS.push(row);
    }
    inRect = (m, x, y, w, h) => m.x >= x && m.y >= y && m.x < x + w && m.y < y + h;
  }
});

// src/ui/glyphs.js
function faceGlyph(hud, x, y, which, xbox) {
  const color = xbox ? XBOX_COLOR[which] : FACE_COLOR[which];
  hud.sprite(x, y - 1, ROUND, { "#": "ink" }, { shadow: false });
  hud.sprite(x + 1, y, ROUND.slice(1, 8).map((r) => r.slice(1, 8)), { "#": "white" }, { shadow: false });
  drawText(hud, x + 2, y + 1, xbox ? XBOX[which] : FACE[which], { color });
  return 10;
}
function capGlyph(hud, x, y, label) {
  const w = textWidth(label) + 6;
  hud.rect(x, y - 1, w, 10, "ink");
  hud.rect(x + 1, y, w - 2, 7, "white");
  hud.rect(x + 1, y + 7, w - 2, 1, "mist");
  drawText(hud, x + 3, y, label, { color: "ink" });
  return w;
}
function promptGlyphWidth(action, device, xboxGlyphs, mouseUsed) {
  if (device === "pad") {
    const code = PAD_FOR[action];
    return FACE[code] ? 10 : textWidth(padCapLabel(code, xboxGlyphs)) + 6;
  }
  if (mouseUsed && MOUSE_FOR[action]) return 8;
  return textWidth(KEY_FOR[action] ?? action) + 6;
}
function drawPromptGlyph(hud, x, y, action, device, xboxGlyphs, mouseUsed) {
  if (device === "pad") {
    const code = PAD_FOR[action];
    if (FACE[code]) return faceGlyph(hud, x, y, code, xboxGlyphs);
    return capGlyph(hud, x, y, padCapLabel(code, xboxGlyphs));
  }
  if (mouseUsed && MOUSE_FOR[action]) {
    hud.sprite(x, y, MOUSE_FOR[action], COL, { shadow: false });
    return 8;
  }
  return capGlyph(hud, x, y, KEY_FOR[action] ?? action);
}
var ROUND, FACE, FACE_COLOR, XBOX, XBOX_COLOR, SHOULDER, MOUSE_L, MOUSE_R, COL, KEY_FOR, PAD_FOR, MOUSE_FOR, padCapLabel;
var init_glyphs = __esm({
  "src/ui/glyphs.js"() {
    init_font();
    ROUND = ["..#####..", ".#######.", "#########", "#########", "#########", "#########", "#########", ".#######.", "..#####.."];
    FACE = { cross: "✕", circle: "○", square: "□", triangle: "△" };
    FACE_COLOR = { cross: "sky", circle: "red", square: "plum", triangle: "green" };
    XBOX = { cross: "A", circle: "B", square: "X", triangle: "Y" };
    XBOX_COLOR = { cross: "green", circle: "red", square: "blue", triangle: "sand" };
    SHOULDER = { l1: ["L1", "LB"], r1: ["R1", "RB"], l2: ["L2", "LT"], r2: ["R2", "RT"], options: ["OPT", "MENU"], dup: ["D↑", "D↑"], ddown: ["D↓", "D↓"], dleft: ["D←", "D←"], touch: ["PAD", "VIEW"], stick: ["LS", "LS"] };
    MOUSE_L = [".##.##.", "#..#..#", "####..#", "####..#", "#.....#", "#.....#", ".#####."];
    MOUSE_R = [".##.##.", "#..#..#", "#..####", "#..####", "#.....#", "#.....#", ".#####."];
    COL = { "#": "ink" };
    KEY_FOR = {
      confirm: "E",
      back: "Esc",
      use: "Space",
      pockets: "Tab",
      tools: "1-6",
      map: "M",
      almanac: "J",
      emote: "G",
      pause: "Esc",
      camera: "Q R",
      run: "Shift",
      sneak: "Ctrl",
      more: "R",
      random: "Tab",
      rubout: "Bksp",
      done: "Enter",
      zoom: "+ -",
      tabs: "Q R",
      fill: "F",
      mirror: "M",
      undo: "Z",
      pick: "E"
    };
    PAD_FOR = {
      confirm: "cross",
      back: "circle",
      use: "square",
      pockets: "triangle",
      map: "touch",
      almanac: "ddown",
      emote: "dleft",
      pause: "options",
      camera: "l2",
      run: "circle",
      more: "triangle",
      random: "triangle",
      rubout: "square",
      done: "cross",
      zoom: "stick",
      tools: "l1",
      tabs: "l1",
      fill: "square",
      mirror: "triangle",
      undo: "l2",
      pick: "cross"
    };
    MOUSE_FOR = { confirm: MOUSE_L, pick: MOUSE_L, use: MOUSE_R, back: MOUSE_R };
    padCapLabel = (code, xbox) => {
      const s = SHOULDER[code];
      return (s ? s[xbox ? 1 : 0] : code ?? "?").replace("↑", "^").replace("↓", "v").replace("←", "<");
    };
  }
});

// src/art/icons.js
function canvas() {
  return Array.from({ length: S }, () => Array(S).fill("."));
}
function ell(g, cx, cy, rx, ry, c2) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) g[y][x] = c2;
}
function box(g, x0, y0, x1, y1, c2) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y]?.[x] !== void 0) g[y][x] = c2;
}
function line(g, x0, y0, x1, y1, c2) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / (n || 1));
    const y = Math.round(y0 + (y1 - y0) * i / (n || 1));
    if (g[y]?.[x] !== void 0) g[y][x] = c2;
  }
}
function tri(g, x0, y0, x1, y1, x2, y2, c2) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const a = (x1 - x0) * (y + 0.5 - y0) - (y1 - y0) * (x + 0.5 - x0);
    const b = (x2 - x1) * (y + 0.5 - y1) - (y2 - y1) * (x + 0.5 - x1);
    const d = (x0 - x2) * (y + 0.5 - y2) - (y0 - y2) * (x + 0.5 - x2);
    if (a >= 0 && b >= 0 && d >= 0 || a <= 0 && b <= 0 && d <= 0) g[y][x] = c2;
  }
}
function outline(g) {
  const out = g.map((r) => r.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x] !== ".") continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? ".") !== ".")) out[y][x] = "#";
  }
  return out.map((r) => r.join(""));
}
function drawIcon(hud, x, y, id, colors, scale = 1) {
  const rows = ICONS[id] ?? ICONS.question;
  hud.sprite(x, y, rows, cols(colors), { shadow: false, scale });
}
var S, D, ICONS, DEFAULT, cache, cols;
var init_icons = __esm({
  "src/art/icons.js"() {
    S = 16;
    D = {
      bean: (g) => {
        ell(g, 8, 8, 4.5, 6, "o");
        box(g, 6, 5, 8, 5, "w");
        line(g, 9, 5, 7, 11, "x");
      },
      fish1: (g) => {
        ell(g, 7, 8, 5.5, 3.5, "o");
        tri(g, 12, 8, 15, 4, 15, 12, "x");
        box(g, 4, 7, 4, 7, "#");
        box(g, 6, 10, 9, 10, "w");
      },
      fish2: (g) => {
        ell(g, 8, 8, 6.5, 2.5, "o");
        tri(g, 13, 8, 15, 5, 15, 11, "x");
        box(g, 3, 7, 3, 7, "#");
        line(g, 6, 6, 11, 6, "x");
      },
      fish3: (g) => {
        ell(g, 7, 8, 5, 5, "o");
        tri(g, 11, 8, 15, 5, 15, 11, "x");
        tri(g, 7, 3, 10, 1, 10, 4, "x");
        box(g, 4, 6, 4, 6, "#");
      },
      crab: (g) => {
        ell(g, 8, 9, 5, 3.5, "o");
        box(g, 2, 4, 3, 7, "x");
        box(g, 12, 4, 13, 7, "x");
        box(g, 6, 7, 6, 7, "#");
        box(g, 9, 7, 9, 7, "#");
        line(g, 4, 12, 3, 14, "x");
        line(g, 11, 12, 12, 14, "x");
      },
      boot: (g) => {
        box(g, 4, 2, 9, 11, "o");
        box(g, 4, 10, 13, 13, "o");
        box(g, 4, 12, 13, 13, "x");
        box(g, 4, 3, 9, 3, "w");
      },
      butterfly: (g) => {
        ell(g, 4.5, 6, 3.5, 4, "o");
        ell(g, 11.5, 6, 3.5, 4, "o");
        ell(g, 5, 11, 2.5, 2.5, "x");
        ell(g, 11, 11, 2.5, 2.5, "x");
        box(g, 8, 4, 8, 13, "#");
      },
      beetle: (g) => {
        ell(g, 8, 9, 4.5, 5.5, "o");
        ell(g, 8, 3.5, 2.5, 2, "x");
        line(g, 8, 4, 8, 14, "#");
        box(g, 2, 8, 3, 8, "#");
        box(g, 12, 8, 13, 8, "#");
        box(g, 2, 11, 3, 11, "#");
        box(g, 12, 11, 13, 11, "#");
      },
      flier: (g) => {
        box(g, 7, 2, 8, 13, "x");
        ell(g, 4, 6, 3.5, 1.5, "o");
        ell(g, 11, 6, 3.5, 1.5, "o");
        ell(g, 4, 9, 3, 1.5, "o");
        ell(g, 11, 9, 3, 1.5, "o");
      },
      hopper: (g) => {
        ell(g, 7, 9, 5, 2.5, "o");
        ell(g, 12, 8, 2, 2, "x");
        line(g, 4, 8, 2, 4, "x");
        line(g, 2, 4, 1, 11, "x");
        line(g, 8, 11, 7, 14, "x");
      },
      bee: (g) => {
        ell(g, 8, 9, 5.5, 4, "o");
        box(g, 5, 6, 6, 12, "#");
        box(g, 9, 6, 10, 12, "#");
        ell(g, 6, 3.5, 2.5, 2, "w");
        ell(g, 10, 3.5, 2.5, 2, "w");
      },
      snail: (g) => {
        ell(g, 8, 7, 4.5, 4.5, "o");
        ell(g, 8, 7, 2, 2, "x");
        box(g, 2, 11, 14, 12, "w");
        box(g, 13, 8, 14, 11, "w");
        box(g, 13, 6, 13, 7, "#");
      },
      bone: (g) => {
        box(g, 4, 7, 11, 9, "o");
        ell(g, 3.5, 6, 2, 2, "o");
        ell(g, 3.5, 10, 2, 2, "o");
        ell(g, 12.5, 6, 2, 2, "o");
        ell(g, 12.5, 10, 2, 2, "o");
      },
      ammonite: (g) => {
        ell(g, 8, 8, 6, 6, "o");
        ell(g, 8, 8, 3.5, 3.5, "x");
        ell(g, 8, 8, 1.5, 1.5, "o");
      },
      rockIcon: (g) => {
        ell(g, 8, 9, 6, 5, "o");
        box(g, 5, 6, 8, 6, "w");
        line(g, 9, 9, 12, 11, "x");
      },
      picture: (g) => {
        box(g, 1, 3, 14, 12, "x");
        box(g, 3, 5, 12, 10, "o");
        ell(g, 7, 7, 2, 2, "w");
      },
      pear: (g) => {
        ell(g, 8, 10, 4.5, 4.5, "o");
        ell(g, 8, 6, 2.5, 3, "o");
        box(g, 8, 1, 8, 3, "x");
        box(g, 9, 2, 10, 2, "x");
        box(g, 6, 8, 6, 9, "w");
      },
      fruitRound: (g) => {
        ell(g, 8, 9, 5.5, 5.5, "o");
        box(g, 8, 2, 8, 4, "x");
        box(g, 9, 3, 11, 3, "x");
        box(g, 5, 7, 6, 8, "w");
      },
      flowerIcon: (g) => {
        for (const [x, y] of [[8, 4], [4.5, 7], [11.5, 7], [6, 11], [10, 11]]) ell(g, x, y, 2.5, 2.5, "o");
        ell(g, 8, 8, 2, 2, "x");
      },
      seed: (g) => {
        box(g, 3, 3, 12, 13, "o");
        box(g, 3, 3, 12, 5, "x");
        ell(g, 8, 9, 2.5, 2.5, "w");
      },
      sapling: (g) => {
        ell(g, 8, 5, 4, 3.5, "o");
        box(g, 7, 8, 8, 13, "x");
        box(g, 5, 13, 10, 14, "x");
      },
      weedIcon: (g) => {
        line(g, 8, 13, 8, 4, "o");
        line(g, 8, 11, 4, 6, "o");
        line(g, 8, 11, 12, 6, "o");
        box(g, 6, 13, 9, 14, "x");
      },
      shell: (g) => {
        tri(g, 8, 13, 1, 5, 15, 5, "o");
        ell(g, 8, 6, 6.5, 3, "o");
        line(g, 8, 13, 4, 4, "x");
        line(g, 8, 13, 8, 3, "x");
        line(g, 8, 13, 12, 4, "x");
      },
      driftIcon: (g) => {
        line(g, 2, 11, 13, 5, "o");
        line(g, 2, 10, 13, 4, "o");
        line(g, 3, 12, 14, 6, "o");
        line(g, 7, 8, 9, 3, "x");
      },
      bag: (g) => {
        ell(g, 8, 10, 5, 5, "o");
        box(g, 6, 3, 9, 5, "o");
        box(g, 5, 5, 10, 5, "x");
        box(g, 7, 8, 8, 12, "w");
      },
      cheese: (g) => {
        tri(g, 2, 12, 14, 5, 14, 12, "o");
        box(g, 2, 12, 14, 13, "x");
        ell(g, 10, 10, 1.5, 1.5, "x");
        ell(g, 6, 11, 1, 1, "x");
      },
      chair: (g) => {
        box(g, 4, 2, 5, 13, "o");
        box(g, 4, 8, 11, 9, "x");
        box(g, 10, 9, 11, 13, "o");
      },
      table: (g) => {
        box(g, 1, 6, 14, 8, "o");
        box(g, 3, 9, 4, 13, "x");
        box(g, 11, 9, 12, 13, "x");
      },
      bed: (g) => {
        box(g, 1, 5, 2, 13, "x");
        box(g, 13, 8, 14, 13, "x");
        box(g, 2, 8, 13, 11, "o");
        box(g, 3, 6, 6, 8, "w");
      },
      lamp: (g) => {
        tri(g, 8, 2, 3, 8, 13, 8, "o");
        box(g, 7, 8, 8, 12, "x");
        box(g, 5, 13, 10, 14, "x");
      },
      shelfIcon: (g) => {
        box(g, 2, 2, 13, 14, "x");
        box(g, 4, 4, 11, 7, "o");
        box(g, 4, 9, 11, 12, "w");
      },
      sofa: (g) => {
        box(g, 2, 5, 13, 9, "o");
        box(g, 1, 8, 14, 12, "x");
        box(g, 2, 13, 3, 14, "#");
        box(g, 12, 13, 13, 14, "#");
      },
      plantIcon: (g) => {
        ell(g, 8, 5, 5, 4, "o");
        box(g, 5, 9, 10, 14, "x");
      },
      tv: (g) => {
        box(g, 1, 3, 14, 11, "x");
        box(g, 3, 5, 12, 9, "o");
        box(g, 6, 12, 9, 13, "x");
      },
      stereo: (g) => {
        box(g, 2, 4, 13, 12, "x");
        ell(g, 5, 8, 2.5, 2.5, "o");
        ell(g, 11, 8, 2.5, 2.5, "o");
        box(g, 7, 2, 8, 3, "x");
      },
      clock: (g) => {
        ell(g, 8, 8, 6, 6, "o");
        line(g, 8, 8, 8, 4, "x");
        line(g, 8, 8, 11, 9, "x");
      },
      rug: (g) => {
        box(g, 1, 4, 14, 12, "o");
        box(g, 3, 6, 12, 10, "x");
        box(g, 5, 8, 10, 8, "w");
      },
      trophy: (g) => {
        box(g, 4, 2, 11, 7, "o");
        ell(g, 8, 7, 4, 3, "o");
        box(g, 7, 9, 8, 11, "x");
        box(g, 4, 12, 11, 13, "x");
        box(g, 2, 3, 3, 6, "o");
        box(g, 12, 3, 13, 6, "o");
      },
      shirt: (g) => {
        box(g, 4, 3, 11, 13, "o");
        box(g, 1, 3, 3, 7, "o");
        box(g, 12, 3, 14, 7, "o");
        box(g, 6, 3, 9, 4, "x");
      },
      hat: (g) => {
        box(g, 5, 4, 10, 10, "o");
        box(g, 2, 10, 13, 12, "o");
        box(g, 5, 8, 10, 9, "x");
      },
      glasses: (g) => {
        ell(g, 4.5, 8, 3, 3, "w");
        ell(g, 11.5, 8, 3, 3, "w");
        ell(g, 4.5, 8, 1.5, 1.5, "o");
        ell(g, 11.5, 8, 1.5, 1.5, "o");
        box(g, 7, 7, 8, 7, "x");
      },
      umbrella: (g) => {
        ell(g, 8, 7, 6.5, 5, "o");
        box(g, 1, 7, 14, 12, ".");
        box(g, 8, 7, 8, 13, "x");
        box(g, 6, 13, 8, 13, "x");
      },
      wallpaper: (g) => {
        box(g, 3, 2, 11, 13, "o");
        for (let x = 4; x < 11; x += 3) box(g, x, 2, x, 13, "x");
        box(g, 11, 2, 13, 4, "w");
      },
      floorIcon: (g) => {
        box(g, 2, 3, 13, 12, "o");
        for (let y = 5; y < 12; y += 3) box(g, 2, y, 13, y, "x");
      },
      letter: (g) => {
        box(g, 1, 4, 14, 12, "w");
        line(g, 1, 4, 8, 9, "x");
        line(g, 14, 4, 8, 9, "x");
        box(g, 11, 5, 13, 7, "o");
      },
      record: (g) => {
        ell(g, 8, 8, 6.5, 6.5, "o");
        ell(g, 8, 8, 2.5, 2.5, "x");
        ell(g, 8, 8, 1, 1, "w");
      },
      gift: (g) => {
        box(g, 2, 6, 13, 13, "o");
        box(g, 7, 6, 8, 13, "x");
        box(g, 2, 8, 13, 9, "x");
        ell(g, 6, 4, 2, 1.5, "x");
        ell(g, 10, 4, 2, 1.5, "x");
      },
      net: (g) => {
        line(g, 2, 14, 9, 7, "x");
        ell(g, 10, 5, 4, 4, "w");
        ell(g, 10, 5, 2.5, 2.5, "o");
      },
      rod: (g) => {
        line(g, 2, 14, 13, 1, "x");
        line(g, 13, 1, 14, 9, "w");
        ell(g, 14, 10, 1, 1, "o");
        ell(g, 5, 11, 1.5, 1.5, "o");
      },
      shovel: (g) => {
        line(g, 12, 2, 6, 8, "x");
        box(g, 2, 9, 7, 14, "o");
        line(g, 11, 1, 14, 4, "x");
      },
      axe: (g) => {
        line(g, 4, 14, 11, 3, "x");
        box(g, 6, 2, 13, 7, "o");
        box(g, 12, 2, 13, 7, "w");
      },
      can: (g) => {
        box(g, 5, 6, 12, 13, "o");
        line(g, 5, 8, 1, 4, "o");
        box(g, 0, 3, 2, 4, "x");
        ell(g, 9, 5, 3, 2.5, ".");
        line(g, 7, 6, 8, 3, "x");
        line(g, 11, 6, 9, 3, "x");
      },
      sling: (g) => {
        line(g, 8, 14, 8, 8, "x");
        line(g, 8, 8, 4, 3, "x");
        line(g, 8, 8, 12, 3, "x");
        line(g, 4, 3, 12, 3, "o");
        ell(g, 8, 4, 1.5, 1.5, "o");
      },
      coffee: (g) => {
        box(g, 3, 5, 10, 12, "w");
        box(g, 4, 6, 9, 7, "x");
        box(g, 11, 7, 13, 10, "w");
        line(g, 5, 1, 6, 4, "o");
        line(g, 8, 1, 9, 4, "o");
      },
      medicine: (g) => {
        box(g, 5, 3, 10, 13, "o");
        box(g, 6, 1, 9, 2, "x");
        box(g, 7, 6, 8, 10, "w");
        box(g, 6, 7, 9, 8, "w");
      },
      star: (g) => {
        tri(g, 8, 1, 3, 14, 13, 14, "o");
        tri(g, 1, 5, 15, 5, 8, 11, "o");
      },
      mush: (g) => {
        ell(g, 8, 6, 6, 4.5, "o");
        box(g, 2, 7, 13, 10, ".");
        box(g, 6, 7, 9, 13, "w");
        ell(g, 6, 4, 1, 1, "w");
        ell(g, 10, 5, 1, 1, "w");
      },
      gem: (g) => {
        tri(g, 8, 14, 2, 6, 14, 6, "o");
        box(g, 4, 3, 11, 6, "o");
        line(g, 8, 3, 8, 13, "x");
      },
      ticket: (g) => {
        box(g, 1, 5, 14, 11, "o");
        box(g, 5, 5, 5, 11, "x");
        ell(g, 10, 8, 1.5, 1.5, "w");
      },
      question: (g) => {
        box(g, 2, 2, 13, 13, "o");
        box(g, 6, 4, 9, 4, "w");
        box(g, 9, 4, 9, 7, "w");
        box(g, 7, 7, 9, 7, "w");
        box(g, 7, 7, 7, 9, "w");
        box(g, 7, 11, 7, 11, "w");
      }
    };
    ICONS = {};
    for (const [id, fn] of Object.entries(D)) {
      const g = canvas();
      fn(g);
      ICONS[id] = outline(g);
    }
    DEFAULT = { o: "sand", x: "orange", w: "white", "#": "ink" };
    cache = /* @__PURE__ */ new Map();
    cols = (c2) => {
      if (!c2) return DEFAULT;
      let v2 = cache.get(c2);
      if (!v2) {
        v2 = { ...DEFAULT, ...c2 };
        cache.set(c2, v2);
      }
      return v2;
    };
  }
});

// src/data/fish.js
var FISH, OLD_BOOT, FISH_LEN, fishNow;
var init_fish = __esm({
  "src/data/fish.js"() {
    FISH = [
      { id: "minnow", name: "Minnow", beans: 60, where: "river", seasons: [0, 1, 2], size: "S", icon: "fish2", color: "mist", line: "That's… that's all of it." },
      { id: "perch", name: "Perch", beans: 150, where: "river", seasons: [0, 1, 2, 3], hours: [5, 19], size: "S", icon: "fish1", color: "lime", line: "It was just sitting there. On purpose." },
      { id: "crawfish", name: "Crawfish", beans: 200, where: "pond", seasons: [0, 1], size: "S", icon: "crab", color: "red", line: "It has opinions about your thumbs." },
      { id: "carp", name: "Carp", beans: 300, where: "pond", seasons: [0, 1, 2, 3], size: "M", icon: "fish1", color: "orange", line: "Carp diem! …Sorry. It made me say that." },
      { id: "trout", name: "Trout", beans: 400, where: "river", seasons: [0, 2], size: "M", icon: "fish1", color: "sky", line: "It isn't pouting. That's just its face." },
      { id: "catfish", name: "Catfish", beans: 800, where: "pond", seasons: [1, 2], hours: [19, 29], size: "M", icon: "fish3", color: "slate", line: "It claims to be a different catfish online." },
      { id: "pike", name: "Pike", beans: 900, where: "river", seasons: [2, 3], size: "L", icon: "fish2", color: "green", line: "Someone should tell it about the other end of the hook." },
      { id: "eel", name: "Eel", beans: 1200, where: "river", seasons: [1, 2], hours: [17, 29], size: "M", icon: "fish2", color: "night", line: "Slippery. Also, it knows what you did." },
      { id: "salmon", name: "Salmon", beans: 1500, where: "mouth", seasons: [2], size: "L", icon: "fish1", color: "orange", line: "It came all this way and now look." },
      { id: "goldenCarp", name: "Golden Carp", beans: 5e3, where: "pond", seasons: [0], hours: [5, 9], rare: true, size: "L", icon: "fish3", color: "sand", line: "It looks expensive and it knows." },
      { id: "sturgeon", name: "Sturgeon", beans: 6e3, where: "mouth", seasons: [3], rare: true, size: "XL", icon: "fish2", color: "mist", line: "Older than the Mayor. Slightly faster." },
      { id: "sardine", name: "Sardine", beans: 100, where: "sea", seasons: [0, 1, 2, 3], size: "S", icon: "fish2", color: "sky", line: "Comes with its own sense of confinement." },
      { id: "mackerel", name: "Mackerel", beans: 250, where: "sea", seasons: [1, 2], size: "M", icon: "fish1", color: "teal", line: "Holy it." },
      { id: "seaBream", name: "Sea Bream", beans: 500, where: "sea", seasons: [0, 1], size: "M", icon: "fish3", color: "red", line: "Very calm. Suspiciously calm." },
      { id: "flounder", name: "Flounder", beans: 700, where: "sea", seasons: [0, 1, 2, 3], size: "L", icon: "fish3", color: "plum", line: "Both eyes on you. Literally." },
      { id: "pufferfish", name: "Pufferfish", beans: 1800, where: "sea", seasons: [1], hours: [17, 29], size: "M", icon: "fish3", color: "sand", line: "It's taking this very personally." },
      { id: "moonfish", name: "Moonfish", beans: 4e3, where: "sea", seasons: [1, 2], hours: [21, 28], rare: true, size: "XL", icon: "fish3", color: "white", line: "It's bigger than your whole debt. Almost." }
    ];
    OLD_BOOT = { id: "oldBoot", name: "Old Boot", beans: 10, where: "any", seasons: [0, 1, 2, 3], icon: "boot", color: "plum", size: "S", line: "Somewhere, a fish is walking funny.", noMuseum: true };
    FISH_LEN = { S: 0.34, M: 0.6, L: 0.9, XL: 1.3 };
    fishNow = (where, season, hour) => {
      const h = hour < 5 ? hour + 24 : hour;
      return FISH.filter((f) => f.where === where && f.seasons.includes(season) && (!f.hours || h >= f.hours[0] && h < f.hours[1]));
    };
  }
});

// src/data/bugs.js
var BUGS, bugsNow;
var init_bugs = __esm({
  "src/data/bugs.js"() {
    BUGS = [
      { id: "cabbageButterfly", name: "Cabbage Butterfly", beans: 90, spot: "flower", seasons: [0, 1], hours: [6, 18], kind: "flier", icon: "butterfly", color: "white", line: "It's very sorry about the cabbage." },
      { id: "pillBug", name: "Pill Bug", beans: 100, spot: "rock", seasons: [0, 1, 2, 3], kind: "crawler", icon: "beetle", color: "slate", line: "It has rolled up and refused to comment." },
      { id: "ladybird", name: "Ladybird", beans: 120, spot: "flower", seasons: [0], kind: "crawler", icon: "beetle", color: "red", line: "It came for the aphids and stayed for the drama." },
      { id: "pondSkater", name: "Pond Skater", beans: 130, spot: "water", seasons: [1], kind: "crawler", icon: "hopper", color: "night", line: "Technically walking on water. Not technically impressed." },
      { id: "cricket", name: "Cricket", beans: 130, spot: "grass", seasons: [2], hours: [18, 30], kind: "crawler", icon: "hopper", color: "plum", line: "It was just getting to the good part." },
      { id: "moth", name: "Moth", beans: 150, spot: "lamp", seasons: [0, 1, 2, 3], hours: [18, 29], kind: "flier", icon: "flier", color: "mist", line: "It has found the lamp. It has found its purpose." },
      { id: "grasshopper", name: "Grasshopper", beans: 160, spot: "grass", seasons: [1, 2], kind: "crawler", icon: "hopper", color: "lime", line: "It didn't save anything for winter either." },
      { id: "dragonfly", name: "Dragonfly", beans: 180, spot: "near", seasons: [1, 2], kind: "flier", icon: "flier", color: "sky", line: "Four wings and still somehow caught." },
      { id: "bumblebee", name: "Bumblebee", beans: 200, spot: "flower", seasons: [0, 1], kind: "flier", icon: "bee", color: "sand", line: "It's too busy for this, and it says so." },
      { id: "snail", name: "Snail", beans: 200, spot: "rock", seasons: [0, 1], rainOnly: true, kind: "crawler", icon: "snail", color: "orange", line: "Not the Mayor. Probably." },
      { id: "cicada", name: "Cicada", beans: 250, spot: "trunk", seasons: [1], hours: [6, 18], kind: "sitter", icon: "beetle", color: "green", line: "Seventeen years underground for this." },
      { id: "swallowtail", name: "Swallowtail", beans: 300, spot: "flower", seasons: [1], hours: [6, 18], kind: "flier", icon: "butterfly", color: "orange", line: "Fancy. It wants you to know that." },
      { id: "firefly", name: "Firefly", beans: 300, spot: "near", seasons: [1], hours: [19, 28], kind: "flier", icon: "flier", color: "lime", line: "Dimmer up close. Aren’t we all." },
      { id: "woollyBear", name: "Woolly Bear", beans: 350, spot: "trunk", seasons: [2], kind: "sitter", icon: "hopper", color: "orange", line: "Yolanda wants to know where it got that sweater." },
      { id: "prayingMantis", name: "Praying Mantis", beans: 400, spot: "flower", seasons: [1, 2], kind: "crawler", icon: "hopper", color: "green", line: "It isn't praying. It's negotiating." },
      { id: "snowFlea", name: "Snow Flea", beans: 600, spot: "snow", seasons: [3], hours: [10, 15], kind: "crawler", icon: "beetle", color: "navy", line: "Technically a bug. Emotionally, a snowflake." },
      { id: "stagBeetle", name: "Stag Beetle", beans: 2e3, spot: "trunk", seasons: [1], hours: [19, 29], rare: true, kind: "sitter", icon: "beetle", color: "night", line: "It has been waiting for someone to try that." },
      { id: "rhinoBeetle", name: "Rhino Beetle", beans: 2500, spot: "trunk", seasons: [1], hours: [22, 29], rare: true, kind: "sitter", icon: "beetle", color: "plum", line: "You're not sure who caught whom." }
    ];
    bugsNow = (season, hour, raining) => {
      const h = hour < 5 ? hour + 24 : hour;
      return BUGS.filter((b) => b.seasons.includes(season) && (!b.hours || h >= b.hours[0] && h < b.hours[1]) && (!b.rainOnly || raining));
    };
  }
});

// src/data/fossils.js
var FOSSILS;
var init_fossils = __esm({
  "src/data/fossils.js"() {
    FOSSILS = [
      { id: "moatSkull", name: "Moatosaur Skull", beans: 3e3, set: "moatosaur", model: "fossil-skull", line: "It has a very large mouth and no plans." },
      { id: "moatTorso", name: "Moatosaur Torso", beans: 2500, set: "moatosaur", model: "fossil-torso", line: "Someone ate well, a long time ago." },
      { id: "moatTail", name: "Moatosaur Tail", beans: 2e3, set: "moatosaur", model: "fossil-tail", line: "It knocked over a lot of things. It was sorry about none of them." },
      { id: "regretSkull", name: "Regretodon Skull", beans: 3e3, set: "regretodon", model: "fossil-skull", line: "It looks like it's just remembered something." },
      { id: "regretNeck", name: "Regretodon Neck", beans: 2500, set: "regretodon", model: "fossil-neck", line: "All that neck, and it still never saw it coming." },
      { id: "regretTorso", name: "Regretodon Torso", beans: 2500, set: "regretodon", model: "fossil-torso", line: "It did not hold its food well. It did not hold anything well." },
      { id: "trilobite", name: "Trilobite", beans: 1200, model: "fossil-small", line: "Three lobes. All of them worried." },
      { id: "ammonite", name: "Ammonite", beans: 1400, model: "fossil-small", line: "A shell that went round and round about it." },
      { id: "amberFly", name: "Amber Fly", beans: 1800, model: "fossil-small", line: "It only stopped for a moment." },
      { id: "mysteryTooth", name: "Mystery Tooth", beans: 1600, model: "fossil-small", line: "Nobody knows what it's from. It's not saying." }
    ];
  }
});

// src/data/art.js
var ART;
var init_art = __esm({
  "src/data/art.js"() {
    ART = [
      { id: "monaLlama", name: "Mona Llama", beans: 4e3, forgeNote: "She has a second earring", line: "She's smiling because she spat on the painter." },
      { id: "gooseEarring", name: "Goose with a Pearl Earring", beans: 4400, forgeNote: "The earring is missing", line: "She'd like her ledger back, thank you." },
      { id: "greatWave", name: "The Great Wave Off Beans", beans: 4200, forgeNote: "No boat on the wave", line: "Terrifying, but high in fibre." },
      { id: "starryBus", name: "The Starry Bus Stop", beans: 4800, forgeNote: "One star is missing", line: "The bus is late. It has always been late." },
      { id: "venusFlytrap", name: "The Birth of Venus Flytrap", beans: 4600, forgeNote: "The shell is the wrong way up", line: "She came out of the sea hungry." },
      { id: "theHonk", name: "The Honk", beans: 3800, forgeNote: "No figures on the bridge", line: "Everyone has felt this way about a debt." },
      { id: "whistlersMoose", name: "Whistler's Moose", beans: 4100, forgeNote: "No laundry on the antlers", line: "He'd prefer not to sit for it." },
      { id: "cheeseDelights", name: "The Cheese of Earthly Delights", beans: 5200, forgeNote: "The big wheel has no holes", line: "Left panel: cheese. Right panel: regret." }
    ];
  }
});

// src/data/furniture.js
var K, COTTAGE, MOSSY, SEASIDE, LOFT, BUREAU, CHEESE, F, FURNITURE;
var init_furniture = __esm({
  "src/data/furniture.js"() {
    K = (m) => `kenney-furniture/${m}`;
    COTTAGE = { wood: "orange", woodDark: "red", metal: "mist", metalLight: "white", metalDark: "slate", carpet: "red", carpetDarker: "plum", lamp: "sand", plant: "green", carpetBlue: "sky" };
    MOSSY = { wood: "teal", woodDark: "night", metal: "slate", metalLight: "lime", metalDark: "night", carpet: "green", carpetDarker: "teal", lamp: "lime", plant: "lime", carpetBlue: "green" };
    SEASIDE = { wood: "white", woodDark: "mist", metal: "sky", metalLight: "white", metalDark: "navy", carpet: "sky", carpetDarker: "blue", lamp: "cyan", plant: "green", carpetBlue: "sky" };
    LOFT = { wood: "night", woodDark: "ink", metal: "mist", metalLight: "white", metalDark: "ink", carpet: "plum", carpetDarker: "red", lamp: "cyan", plant: "teal", carpetBlue: "plum" };
    BUREAU = { wood: "slate", woodDark: "night", metal: "mist", metalLight: "mist", metalDark: "night", carpet: "navy", carpetDarker: "night", lamp: "white", plant: "green", carpetBlue: "navy" };
    CHEESE = { wood: "sand", woodDark: "orange", metal: "orange", metalLight: "sand", metalDark: "orange", carpet: "sand", carpetDarker: "orange", lamp: "white", plant: "lime", carpetBlue: "sand" };
    F = (id, name, set, model4, palette, w, d, price, tags, extra = {}) => ({ id, name, cat: "furniture", set, model: model4, palette, w, d, price, tags, ...extra });
    FURNITURE = [
      // Cottage
      F("cottageChair", "Cottage Chair", "Cottage", K("chair-cushion"), COTTAGE, 1, 1, 1200, ["seat"], { func: "seat", icon: "chair" }),
      F("cottageTable", "Cottage Table", "Cottage", K("table-cloth"), COTTAGE, 2, 1, 2e3, ["table"], { icon: "table" }),
      F("cottageBed", "Cottage Bed", "Cottage", K("bed-single"), COTTAGE, 1, 2, 3e3, ["bed"], { func: "bed", icon: "bed" }),
      F("cottageSofa", "Cottage Sofa", "Cottage", K("lounge-sofa"), COTTAGE, 2, 1, 3200, ["seat"], { func: "seat", icon: "sofa" }),
      F("cottageLamp", "Cottage Lamp", "Cottage", K("lamp-round-floor"), COTTAGE, 1, 1, 1400, ["lamp"], { func: "lamp", icon: "lamp" }),
      F("cottageShelf", "Cottage Bookcase", "Cottage", K("bookcase-open"), COTTAGE, 1, 1, 1800, ["storage"], { icon: "shelfIcon" }),
      F("cottageRug", "Cottage Rug", "Cottage", K("rug-round"), COTTAGE, 2, 2, 1600, ["rug"], { func: "rug", icon: "rug", flat: true }),
      F("cottageSide", "Cottage Side Table", "Cottage", K("cabinet-bed-drawer"), COTTAGE, 1, 1, 900, ["table"], { icon: "table" }),
      // Mossy
      F("mossyStool", "Mossy Stool", "Mossy", K("stool-bar"), MOSSY, 1, 1, 1100, ["seat"], { func: "seat", icon: "chair" }),
      F("mossyTable", "Mossy Table", "Mossy", K("table-round"), MOSSY, 2, 2, 2200, ["table"], { icon: "table" }),
      F("mossyBed", "Mossy Bed", "Mossy", K("bed-double"), MOSSY, 2, 2, 3600, ["bed"], { func: "bed", icon: "bed" }),
      F("mossyLamp", "Glowcap Lamp", "Mossy", K("lamp-square-floor"), MOSSY, 1, 1, 1500, ["lamp"], { func: "lamp", icon: "lamp" }),
      F("mossySofa", "Mossy Sofa", "Mossy", K("lounge-sofa-long"), MOSSY, 2, 2, 3800, ["seat"], { func: "seat", icon: "sofa" }),
      F("mossyPlant", "Sulking Fern", "Mossy", K("potted-plant"), MOSSY, 1, 1, 900, ["plant"], { func: "plant", icon: "plantIcon" }),
      F("mossyRug", "Moss Rug", "Mossy", K("rug-square"), MOSSY, 2, 2, 1400, ["rug"], { func: "rug", icon: "rug", flat: true }),
      F("mossyShelf", "Damp Bookcase", "Mossy", K("bookcase-closed"), MOSSY, 1, 1, 1700, ["storage"], { icon: "shelfIcon" }),
      // Seaside
      F("seasideChair", "Deck Chair", "Seaside", K("lounge-chair-relax"), SEASIDE, 1, 2, 1600, ["seat"], { func: "seat", icon: "chair" }),
      F("seasideTable", "Seaside Table", "Seaside", K("table-coffee-square"), SEASIDE, 1, 1, 1200, ["table"], { icon: "table" }),
      F("seasideBed", "Seaside Bunk", "Seaside", K("bed-bunk"), SEASIDE, 1, 2, 3400, ["bed"], { func: "bed", icon: "bed" }),
      F("seasideLamp", "Lighthouse Lamp", "Seaside", K("lamp-round-table"), SEASIDE, 1, 1, 1200, ["lamp"], { func: "lamp", icon: "lamp" }),
      F("seasideRug", "Tide Rug", "Seaside", K("rug-rounded"), SEASIDE, 2, 2, 1800, ["rug"], { func: "rug", icon: "rug", flat: true }),
      F("seasideBath", "Seaside Tub", "Seaside", K("bathtub"), SEASIDE, 2, 1, 2800, ["bath"], { icon: "rockIcon" }),
      F("seasideShelf", "Driftwood Shelf", "Seaside", K("bookcase-open-low"), SEASIDE, 1, 1, 1100, ["storage"], { icon: "shelfIcon" }),
      // City Loft
      F("loftChair", "Loft Chair", "City Loft", K("chair-modern-cushion"), LOFT, 1, 1, 2200, ["seat"], { func: "seat", icon: "chair" }),
      F("loftSofa", "Loft Sofa", "City Loft", K("lounge-design-sofa"), LOFT, 2, 1, 5200, ["seat"], { func: "seat", icon: "sofa" }),
      F("loftTable", "Glass Table", "City Loft", K("table-glass"), LOFT, 2, 1, 3600, ["table"], { icon: "table" }),
      F("loftLamp", "Very Thin Lamp", "City Loft", K("lamp-square-table"), LOFT, 1, 1, 2e3, ["lamp"], { func: "lamp", icon: "lamp" }),
      F("loftTV", "Loft Television", "City Loft", K("television-modern"), LOFT, 2, 1, 5800, ["electronics"], { func: "tv", icon: "tv" }),
      F("loftSpeakers", "Loft Speakers", "City Loft", K("speaker"), LOFT, 1, 1, 3e3, ["electronics"], { func: "stereo", icon: "stereo" }),
      F("loftRug", "Abstract Rug", "City Loft", K("rug-rectangle"), LOFT, 2, 2, 2600, ["rug"], { func: "rug", icon: "rug", flat: true }),
      // Bureau
      F("bureauDesk", "Bureau Desk", "Bureau", K("desk"), BUREAU, 2, 1, 3200, ["table"], { icon: "table" }),
      F("bureauChair", "Bureau Chair", "Bureau", K("chair-desk"), BUREAU, 1, 1, 1800, ["seat"], { func: "seat", icon: "chair" }),
      F("bureauShelf", "Filing Shelf", "Bureau", K("bookcase-closed-doors"), BUREAU, 1, 1, 2e3, ["storage"], { icon: "shelfIcon" }),
      F("bureauLamp", "Interrogation Lamp", "Bureau", K("lamp-square-floor"), BUREAU, 1, 1, 1600, ["lamp"], { func: "lamp", icon: "lamp" }),
      F("bureauCan", "Bureau Bin", "Bureau", K("trashcan"), BUREAU, 1, 1, 500, ["bin"], { icon: "question" }),
      F("bureauPC", "Beige Computer", "Bureau", K("computer-screen"), BUREAU, 1, 1, 2600, ["electronics"], { icon: "tv" }),
      // Cheese
      F("cheeseChair", "Cheddar Chair", "Cheese", K("chair-rounded"), CHEESE, 1, 1, 1500, ["seat"], { func: "seat", icon: "cheese" }),
      F("cheeseTable", "Brie Table", "Cheese", K("table-coffee"), CHEESE, 2, 1, 1900, ["table"], { icon: "cheese" }),
      F("cheeseBed", "Gouda Bed", "Cheese", K("bed-single"), CHEESE, 1, 2, 3300, ["bed"], { func: "bed", icon: "cheese" }),
      F("cheeseLamp", "Lamp of Roquefort", "Cheese", K("lamp-round-floor"), CHEESE, 1, 1, 1700, ["lamp"], { func: "lamp", icon: "cheese" }),
      F("cheeseSofa", "Edam Sofa", "Cheese", K("lounge-sofa"), CHEESE, 2, 1, 3500, ["seat"], { func: "seat", icon: "cheese" }),
      F("cheeseWheelSeat", "Wheel, Decorative", "Cheese", "cheese-wheel", null, 1, 1, 1300, ["cheese"], { icon: "cheese" }),
      // Singles and functional pieces
      F("stereo", "Modest Stereo", null, K("radio"), COTTAGE, 1, 1, 2400, ["electronics"], { func: "stereo", icon: "stereo" }),
      F("tv", "Vintage Television", null, K("television-vintage"), COTTAGE, 1, 1, 4200, ["electronics"], { func: "tv", icon: "tv" }),
      F("mirror", "Standing Mirror", null, K("bathroom-mirror"), COTTAGE, 1, 1, 2800, ["mirror"], { func: "mirror", icon: "glasses" }),
      F("fishTank", "Fish Tank", null, "tank", null, 2, 1, 3e3, ["pet"], { func: "tank", icon: "fish1", params: { w: 1.6 } }),
      F("bugCage", "Bug Cage", null, "tank", { water: "lime", frame: "plum", sand: "green", top: "plum" }, 1, 1, 2e3, ["pet"], { func: "cage", icon: "beetle", params: { w: 0.9 } }),
      F("wallClock", "Grandfather Clock", null, K("coat-rack-standing"), COTTAGE, 1, 1, 2600, ["clock"], { func: "clock", icon: "clock" }),
      F("toilet", "Toilet", null, K("toilet"), COTTAGE, 1, 1, 1e3, ["toilet"], { func: "toilet", icon: "question" }),
      F("fridge", "Fridge, Humming", null, K("kitchen-fridge"), COTTAGE, 1, 1, 3e3, ["kitchen"], { icon: "shelfIcon" }),
      F("stove", "Stove", null, K("kitchen-stove"), COTTAGE, 1, 1, 2800, ["kitchen"], { icon: "table" }),
      F("bearToy", "Worried Bear", null, K("bear"), COTTAGE, 1, 1, 800, ["toy"], { icon: "question" }),
      F("pottedPlant", "Potted Plant", null, K("potted-plant"), COTTAGE, 1, 1, 700, ["plant"], { func: "plant", icon: "plantIcon" }),
      F("laptop", "Laptop, Closed", null, K("laptop"), LOFT, 1, 1, 2200, ["electronics"], { icon: "tv" }),
      F("washer", "Washing Machine", null, K("washer"), COTTAGE, 1, 1, 2400, ["kitchen"], { icon: "rockIcon" }),
      F("boxes", "Unpacked Boxes", null, K("cardboard-box-closed"), COTTAGE, 1, 1, 200, ["clutter"], { icon: "gift" }),
      // Trophies and awards
      F("trophyGold", "Derby Trophy", null, "tank", { water: "sand", frame: "orange", sand: "orange", top: "orange" }, 1, 1, 8e3, ["trophy"], { icon: "trophy", params: { w: 0.8 }, notForSale: true }),
      F("trophyBug", "Bug-Off Trophy", null, "tank", { water: "lime", frame: "orange", sand: "orange", top: "orange" }, 1, 1, 8e3, ["trophy"], { icon: "trophy", params: { w: 0.8 }, notForSale: true }),
      F("trophySnow", "Snowman Trophy", null, "snowman", null, 1, 1, 8e3, ["trophy"], { icon: "trophy", notForSale: true }),
      F("roccoTrophy", "Rocco's Trophy", null, "tank", { water: "red", frame: "orange", sand: "sand", top: "orange" }, 1, 1, 12e3, ["trophy"], { icon: "trophy", params: { w: 0.8 }, notForSale: true }),
      F("bureauC", "Bureau Plaque, Grade C", "Bureau", K("books"), BUREAU, 1, 1, 1e3, ["award"], { icon: "trophy", notForSale: true }),
      F("bureauB", "Bureau Plaque, Grade B", "Bureau", K("books"), BUREAU, 1, 1, 3e3, ["award"], { icon: "trophy", notForSale: true }),
      F("bureauA", "Bureau Plaque, Grade A", "Bureau", K("books"), BUREAU, 1, 1, 6e3, ["award"], { icon: "trophy", notForSale: true }),
      F("bureauS", "Bureau Plaque, Grade S", "Bureau", K("books"), BUREAU, 1, 1, 12e3, ["award"], { icon: "trophy", notForSale: true }),
      F("couturePiece", "Couture Chaise", "City Loft", K("lounge-design-chair"), LOFT, 2, 1, 16e3, ["seat"], { func: "seat", icon: "sofa", rare: true }),
      F("magdaClock", "Slightly Warm Clock", null, K("coat-rack-standing"), BUREAU, 1, 1, 9e3, ["clock"], { func: "clock", icon: "clock", rare: true, notForSale: true })
    ];
  }
});

// src/data/clothes.js
var C, H, G2, U, CLOTHES, HAT_ITEMS, GLASSES_ITEMS, UMBRELLAS;
var init_clothes = __esm({
  "src/data/clothes.js"() {
    C = (id, name, shirt, trim, price, tags, o = {}) => ({ id, name, cat: "clothes", shirt, trim, price, tags, icon: "shirt", iconColors: { o: shirt, x: trim }, ...o });
    H = (id, name, hat, hatColor, hatTrim, price, tags, o = {}) => ({ id, name, cat: "hat", hat, hatColor, hatTrim, price, tags, icon: "hat", iconColors: { o: hatColor, x: hatTrim }, ...o });
    G2 = (id, name, glasses, glassesColor, price, tags, o = {}) => ({ id, name, cat: "glasses", glasses, glassesColor, price, tags, icon: "glasses", iconColors: { o: glassesColor === "white" ? "mist" : glassesColor, x: glassesColor }, ...o });
    U = (id, name, a, b, price, tags, o = {}) => ({ id, name, cat: "umbrella", a, b, price, tags, icon: "umbrella", iconColors: { o: a, x: b }, ...o });
    CLOTHES = [
      C("tatteredShirt", "Slightly Regrettable Shirt", "slate", "mist", 300, ["drab"]),
      C("plainBlue", "Plain Blue Shirt", "blue", "white", 500, ["plain"]),
      C("plainRed", "Plain Red Shirt", "red", "white", 500, ["plain", "loud"]),
      C("plainGreen", "Plain Green Shirt", "green", "white", 500, ["plain", "leafy"]),
      C("sailor", "Sailor Top", "white", "navy", 800, ["nautical", "damp"]),
      C("fishNet", "Fisher’s Jersey", "teal", "sand", 900, ["nautical", "damp"]),
      C("oilskin", "Oilskin Coat", "sand", "orange", 1400, ["damp", "practical"]),
      C("duster", "Duster Coat", "orange", "plum", 1200, ["practical", "dusty"]),
      C("knitted", "Knitted Thing", "orange", "sand", 700, ["cosy", "wool"]),
      C("cableKnit", "Cable Knit", "white", "mist", 1100, ["cosy", "wool"]),
      C("mossGreen", "Moss Cardigan", "teal", "green", 1e3, ["cosy", "leafy"]),
      C("leafPrint", "Leaf Print", "lime", "green", 900, ["leafy", "loud"]),
      C("nightShirt", "Night Shirt", "navy", "sky", 800, ["sleepy"]),
      C("moonRobe", "Moon Robe", "night", "sand", 1600, ["sleepy", "dramatic"]),
      C("suitGrey", "Grey Suit", "slate", "white", 2800, ["formal", "drab"]),
      C("suitNavy", "Navy Suit", "navy", "white", 3e3, ["formal"]),
      C("waistcoat", "Ledger Waistcoat", "plum", "sand", 2200, ["formal", "money"]),
      C("sequin", "Sequin Jacket", "plum", "cyan", 3600, ["loud", "dramatic"]),
      C("flame", "Flame Shirt", "red", "sand", 1800, ["loud"]),
      C("cheeseTop", "Cheese Rind Top", "sand", "orange", 1500, ["cheese", "loud"]),
      C("striped", "Stripy Jumper", "mist", "navy", 900, ["plain", "nautical"]),
      C("gym", "Gym Singlet", "red", "white", 700, ["sporty"]),
      C("track", "Track Top", "sky", "white", 900, ["sporty"]),
      C("plumeCape", "Plume Cape", "orange", "white", 8e3, ["couture", "dramatic"], { couture: true }),
      C("velvetCoat", "Velvet Rope Coat", "plum", "red", 12e3, ["couture", "formal"], { couture: true }),
      C("neonSuit", "Neon Suit", "cyan", "plum", 14e3, ["couture", "loud"], { couture: true }),
      C("mothEaten", "Moth-Eaten Finery", "mist", "plum", 600, ["dramatic", "drab"]),
      C("apron", "Store Apron", "navy", "sand", 400, ["practical", "money"]),
      C("wetWeather", "Wet Weather Gear", "sand", "night", 1600, ["damp", "practical"]),
      C("beanSuit", "Bean Suit", "red", "orange", 2e3, ["money", "loud", "cheese"])
    ];
    HAT_ITEMS = [
      H("capBlue", "Blue Cap", "cap", "blue", "white", 500, ["sporty", "plain"]),
      H("strawHat", "Straw Hat", "straw", "sand", "red", 700, ["leafy", "plain"]),
      H("bobbleHat", "Bobble Hat", "bobble", "red", "white", 600, ["cosy", "wool"]),
      H("topHat", "Top Hat", "top", "ink", "red", 2400, ["formal", "dramatic"]),
      H("beret", "Beret", "beret", "plum", "night", 1200, ["dramatic", "couture"]),
      H("paperCrown", "Paper Crown", "crown", "sand", "orange", 900, ["loud", "dramatic"]),
      H("potHat", "Pot", "pot", "night", "slate", 300, ["practical", "damp"]),
      H("cheeseHat", "Cheese Hat", "cheese", "sand", "orange", 1500, ["cheese", "loud"]),
      H("bigBow", "Big Bow", "bow", "red", "plum", 800, ["loud"]),
      H("sou", "Sou'wester", "sou", "sand", "orange", 1e3, ["damp", "nautical"]),
      H("plumeHat", "Plume Hat", "plume", "plum", "orange", 9e3, ["couture", "dramatic"], { couture: true }),
      H("bucketHat", "Bucket Hat", "bucket", "slate", "mist", 400, ["damp", "drab"])
    ];
    GLASSES_ITEMS = [
      G2("roundSpecs", "Round Specs", "round", "night", 900, ["formal"]),
      G2("squareSpecs", "Square Specs", "square", "slate", 900, ["formal", "drab"]),
      G2("shades", "Shades", "shades", "ink", 1300, ["loud", "sporty"]),
      G2("monocle", "Monocle", "monocle", "sand", 2e3, ["formal", "money", "dramatic"]),
      G2("starShades", "Star Glasses", "star", "orange", 1600, ["loud", "dramatic"]),
      G2("fakeMoustache", "Moustache, Unconvincing", "moustache", "plum", 500, ["dramatic"])
    ];
    UMBRELLAS = [
      U("umbrellaBlue", "Blue Umbrella", "blue", "navy", 800, ["damp", "plain"]),
      U("umbrellaRed", "Red Umbrella", "red", "plum", 800, ["damp", "loud"]),
      U("umbrellaFrog", "Frog Umbrella", "green", "lime", 1e3, ["damp", "leafy"]),
      U("umbrellaBean", "Bean Umbrella", "orange", "red", 1200, ["damp", "money"]),
      U("umbrellaLace", "Lace Parasol", "white", "mist", 2200, ["dramatic", "formal"]),
      U("umbrellaNeon", "Neon Umbrella", "cyan", "plum", 3e3, ["loud", "couture"], { couture: true })
    ];
  }
});

// src/data/items.js
var ITEMS, add, SOFT, FLOWER_SPECIES, FLOWER_COLORS, SELLABLE;
var init_items = __esm({
  "src/data/items.js"() {
    init_fish();
    init_bugs();
    init_fossils();
    init_art();
    init_furniture();
    init_clothes();
    init_textures();
    ITEMS = {};
    add = (it) => {
      ITEMS[it.id] = it;
    };
    for (const f of [...FISH, OLD_BOOT]) add({ ...f, cat: "fish", sell: f.beans, iconColors: { o: f.color, x: "navy" }, tags: ["fish", "damp"] });
    for (const b of BUGS) add({ ...b, cat: "bug", sell: b.beans, iconColors: { o: b.color, x: "ink" }, tags: ["bug"] });
    for (const f of FOSSILS) {
      add({ ...f, cat: "fossil", sell: f.beans, icon: f.set ? "bone" : "ammonite", iconColors: { o: "sand", x: "orange" }, tags: ["fossil", "old"] });
    }
    add({ id: "unknownFossil", name: "Unidentified Fossil", cat: "rawFossil", sell: 400, icon: "rockIcon", iconColors: { o: "sand", x: "orange" }, line: "A fossil! Or a very confident potato!" });
    for (const a of ART) {
      add({ ...a, cat: "art", sell: Math.round(a.beans / 2), price: a.beans, icon: "picture", iconColors: { o: "sky", x: "orange" }, tags: ["art"] });
      add({ ...a, id: `${a.id}F`, of: a.id, forged: true, cat: "art", sell: 50, price: a.beans, icon: "picture", iconColors: { o: "sky", x: "orange" }, tags: ["art"] });
    }
    for (const f of FURNITURE) add({ ...f, sell: Math.round(f.price / 4), iconColors: f.iconColors ?? { o: f.palette?.wood ?? "sand", x: f.palette?.carpet ?? "orange" } });
    for (const c2 of [...CLOTHES, ...HAT_ITEMS, ...GLASSES_ITEMS, ...UMBRELLAS]) add({ ...c2, sell: Math.round(c2.price / 4) });
    SOFT = (id, name, cat, icon, o, x, sell, extra = {}) => add({ id, name, cat, icon, iconColors: { o, x }, sell, ...extra });
    SOFT("net", "Net", "tool", "net", "white", "orange", 200, { price: 800, line: "For sweeping things out of the air and into your life." });
    SOFT("rod", "Rod", "tool", "rod", "red", "orange", 200, { price: 800, line: "A stick with hopes attached." });
    SOFT("shovel", "Shovel", "tool", "shovel", "mist", "orange", 200, { price: 800, line: "Good for digging. Also for regret, in a pinch." });
    SOFT("axe", "Axe", "tool", "axe", "mist", "orange", 200, { price: 1200, line: "Three hits to a tree. The tree has been told." });
    SOFT("can", "Watering Can", "tool", "can", "sky", "navy", 200, { price: 800, line: "Waters what you point it at. Your shoes, mostly." });
    SOFT("slingshot", "Slingshot", "tool", "sling", "red", "orange", 200, { price: 1e3, line: "For balloons. Only for balloons. Bartleby asked." });
    SOFT("weed", "Weed", "misc", "weedIcon", "green", "plum", 10, { line: "A cheerful little weed. Mrs. Gander pays ten beans. She knows." });
    SOFT("pear", "Pear", "fruit", "pear", "sand", "plum", 100, { tags: ["fruit", "sweet"], line: "A pear. It's the village's main fruit and it knows." });
    SOFT("fig", "Fig", "fruit", "fruitRound", "plum", "green", 500, { tags: ["fruit", "sweet"], foreign: true, line: "Gran's. It smells like an argument from 1974." });
    SOFT("persimmon", "Persimmon", "fruit", "fruitRound", "orange", "green", 500, { tags: ["fruit", "sweet"], foreign: true, line: "Gran says it builds character. It tastes of disappointment, briefly." });
    SOFT("lime", "Lime", "fruit", "fruitRound", "lime", "green", 500, { tags: ["fruit", "sour"], foreign: true, line: "Gran sent a lime with no note. That's the note." });
    SOFT("quince", "Quince", "fruit", "pear", "sand", "green", 500, { tags: ["fruit", "sour"], foreign: true, line: "It's a pear that has been through something." });
    SOFT("coconut", "Coconut", "fruit", "fruitRound", "plum", "sand", 250, { tags: ["fruit"], line: "A coconut. It fell. Nobody was hurt, this time." });
    SOFT("mushroom", "Mushroom", "fruit", "mush", "red", "white", 200, { tags: ["mushroom"], line: "Found in the woods. It looks back." });
    SOFT("sapling", "Sapling", "plant", "sapling", "lime", "plum", 200, { price: 640, line: "Three days and it will be somebody else’s problem. A tree." });
    for (const [i, sp] of ["Tulip", "Daisy", "Rose", "Bellflower"].entries()) {
      SOFT(`seed${sp}`, `${sp} Seeds`, "seed", "seed", ["red", "sand", "plum", "sky"][i], "green", 60, { species: i, price: 240, line: `Plant them. Water them. Talk to them if you've nobody else.` });
    }
    FLOWER_SPECIES = ["Tulip", "Daisy", "Rose", "Bellflower"];
    FLOWER_COLORS = ["red", "sand", "white", "sky", "plum"];
    for (let s = 0; s < 4; s++) for (let c2 = 0; c2 < 5; c2++) add({ id: `flower${s}${c2}`, name: `${["Red", "Yellow", "White", "Blue", "Purple"][c2]} ${FLOWER_SPECIES[s]}`, cat: "flower", species: s, color: c2, icon: "flowerIcon", iconColors: { o: FLOWER_COLORS[c2], x: "sand" }, sell: 80 + (c2 > 2 ? 100 : 0), tags: ["flower"], line: "It's a flower. It's doing its best." });
    SOFT("shellScallop", "Scallop Shell", "shell", "shell", "white", "orange", 60, { line: "Empty. The owner has moved out." });
    SOFT("shellConch", "Conch", "shell", "shell", "orange", "plum", 300, { line: "You can hear the sea. And a faint complaint." });
    SOFT("shellSand", "Sand Dollar", "shell", "shell", "sand", "white", 150, { line: "Not legal tender. Mrs. Gander checked." });
    SOFT("shellCowrie", "Cowrie", "shell", "shell", "plum", "white", 200, { line: "Used as money once. It remembers." });
    SOFT("shellCommon", "Common Shell", "shell", "shell", "mist", "white", 15, { line: "Very common. It has stopped trying." });
    SOFT("driftBottle", "Message in a Bottle", "oddity", "driftIcon", "cyan", "sand", 500, { line: "It says 'hello', and then a long list of grievances." });
    SOFT("driftLog", "Interesting Driftwood", "oddity", "driftIcon", "mist", "slate", 120, { line: "Interesting to whom, you could not say." });
    SOFT("driftSpoon", "The Big Spoon", "oddity", "driftIcon", "mist", "sky", 240, { line: "Too big for anyone you know. So far." });
    SOFT("bagOfBeans", "Bag of Beans", "bag", "bag", "sand", "orange", 0, { beans: 1e3, line: "Beans are currency, dear. You can’t plant them." });
    SOFT("bigBag", "Big Bag of Beans", "bag", "bag", "orange", "plum", 0, { beans: 5e3, line: "A big bag. It looks at you like you owe it something." });
    SOFT("cheese", "Wheel of Cheese", "cheese", "cheese", "sand", "orange", 0, { tags: ["cheese"], line: "It only goes up. Mostly. Until it goes off." });
    SOFT("cheeseOff", "Gone-Off Cheese", "cheese", "cheese", "green", "teal", 1, { tags: ["cheese", "gross"], line: "It has developed a smell, and then a personality." });
    SOFT("medicine", "Medicine", "misc", "medicine", "red", "sand", 100, { price: 400, line: "Cures stings. Tastes of being told off." });
    SOFT("stationery", "Fine Stationery", "misc", "letter", "plum", "mist", 40, { price: 160, line: "For writing letters people may even read." });
    SOFT("patternKit", "Pattern Kit", "misc", "floorIcon", "plum", "sand", 20, { line: "Your own pattern, ready to lay on the ground or nail to a post." });
    SOFT("parcel", "Parcel", "quest", "gift", "sand", "plum", 0, { noSell: true, line: "Someone else’s business, wrapped." });
    SOFT("lostThing", "Lost Thing", "quest", "question", "slate", "sand", 0, { noSell: true, line: "It belongs to someone. It's not telling." });
    SOFT("boxedGift", "Wrapped Present", "gift", "gift", "red", "sand", 60, { line: "It might be anything. It rattles." });
    SOFT("coffeeBean", "Coffee to Go", "misc", "coffee", "plum", "orange", 40, { line: "Lou's. It's still thinking about being hot." });
    SOFT("queasyGift", "Soup Survivor Medal", "oddity", "trophy", "green", "plum", 30, { line: "For enduring the soup. Worn with shame." });
    SOFT("scarfGift", "Scarf, Yolanda’s", "misc", "shirt", "orange", "red", 200, { handmade: "yolanda", line: "She knitted it. It might be a scarf. Give it time." });
    SOFT("poemGift", "Nib's Poem", "misc", "letter", "navy", "white", 20, { handmade: "nib", line: "It is about your hat. It ends badly." });
    SOFT("soupGift", "Tuesday's Soup", "misc", "coffee", "orange", "sand", 90, { handmade: "dorrit", tags: ["soupy"], line: "It's Tuesday's. Tuesday was a good day for soup." });
    SOFT("stringGift", "Red String", "misc", "rug", "red", "plum", 50, { handmade: "ozzie", line: "Ozzie says it connects everything. It's about a metre long." });
    SOFT("smileGift", "Tavi's Pebble", "misc", "rockIcon", "sand", "white", 30, { handmade: "tavi", line: "She smiled at this rock and it's going really well, isn't it?!" });
    SOFT("stampGift", "Bureau Stamp", "misc", "letter", "slate", "white", 80, { line: "It stamps DENIED and nothing else." });
    for (const [i, title] of ["Quiet Please", "Bus Stop Waltz", "Old Pear Blues", "Upside Down", "Soup For One", "Debt Nocturne"].entries()) add({ id: `record${i}`, name: `Record: ${title}`, cat: "record", icon: "record", iconColors: { o: "night", x: ["red", "sky", "lime", "sand", "orange", "plum"][i] }, song: `vesper${i}`, sell: 200, line: "Vesper made this hanging upside down. That’s how the notes fall out." });
    for (const f of FLOORS) add({ id: f.id, name: f.id.replace("floor-", "").replace(/-/g, " ").replace(/^\w/, (c2) => c2.toUpperCase()) + " Floor", cat: "floor", icon: "floorIcon", iconColors: { o: "orange", x: "plum" }, price: 1400, sell: 350, line: "For walking on. Or lying on, if the day has gone that way." });
    for (const f of WALLS) add({ id: f.id, name: f.id.replace("wall-", "").replace(/-/g, " ").replace(/^\w/, (c2) => c2.toUpperCase()) + " Wallpaper", cat: "wall", icon: "wallpaper", iconColors: { o: "sand", x: "orange" }, price: 1400, sell: 350, line: "Wallpaper. A whole personality, sold by the roll." });
    SELLABLE = (id) => {
      const it = ITEMS[id];
      return !!it && !it.noSell && it.cat !== "bag";
    };
  }
});

// src/ui/ui.js
function drawWorldHud(g, hud, dt) {
  const ui = g.ui;
  const w = g.world;
  const alpha = ui.hudAlpha;
  if (alpha <= 0.02 || !w) return;
  if (alpha > 0.5 || true) {
    const line2 = dateLine(w, g.realNow);
    const lw = textWidth(line2);
    panel(hud, 12, 12, lw + 14, 17, { fill: "white", trim: "sand" });
    drawText(hud, 19, 17, line2, { color: "ink" });
    const beans = `${w.player.beans.toLocaleString("en-US")} beans`;
    const bw = textWidth(beans);
    panel(hud, 480 - 12 - bw - 26, 12, bw + 26, 17, { fill: "white", trim: "sand" });
    drawIcon(hud, 480 - 12 - bw - 23, 13, "bean", null, 1);
    drawText(hud, 480 - 19 - bw, 17, beans, { color: "ink" });
    if (w.story?.day1Active) {
      const items = g.day1Lines?.() ?? [];
      if (items.length) {
        const pw = Math.max(...items.map((t) => textWidth(t))) + 16;
        panel(hud, 480 - 12 - pw, 32, pw, items.length * 11 + 8, { fill: "white", trim: "mist" });
        items.forEach((t, i) => drawText(hud, 480 - 12 - pw + 8, 37 + i * 11, t, { color: t.startsWith("+") ? "slate" : "ink" }));
      }
    }
    const tool = w.player.tool;
    if (tool) {
      panel(hud, 12, 270 - 12 - 28, 28, 28, { fill: "white", trim: "sand" });
      drawIcon(hud, 18, 270 - 12 - 22, ITEMS[tool]?.icon ?? tool, ITEMS[tool]?.iconColors);
      const name = ITEMS[tool]?.name ?? tool;
      const nw = textWidth(name);
      panel(hud, 42, 270 - 12 - 17, nw + 12, 17, { fill: "white", trim: "mist" });
      drawText(hud, 48, 270 - 12 - 12, name, { color: "ink" });
    }
  }
}
var UI, Menu;
var init_ui = __esm({
  "src/ui/ui.js"() {
    init_draw();
    init_glyphs();
    init_icons();
    init_calendar();
    init_items();
    UI = class {
      constructor(g) {
        this.g = g;
        this.stack = [];
        this.toast = null;
        this.toasts = [];
        this.hudAlpha = 1;
        this.idle = 0;
        this.prompts = [];
        this.tooltip = null;
        this.reveal = null;
        this.hoverTip = null;
      }
      get top() {
        return this.stack[this.stack.length - 1] ?? null;
      }
      get blocking() {
        return this.stack.some((s) => s.modal !== false);
      }
      push(screen) {
        screen.g = this.g;
        this.stack.push(screen);
        screen.open?.(this.g);
        return screen;
      }
      pop(screen = this.top) {
        const i = this.stack.indexOf(screen);
        if (i >= 0) {
          this.stack.splice(i, 1);
          screen.close?.(this.g);
        }
      }
      popAll() {
        while (this.stack.length) this.pop();
      }
      has(id) {
        return this.stack.some((s) => s.id === id);
      }
      toastMsg(text, color = "ink") {
        this.toasts.push({ text, color, t: 3.2 });
        if (this.toasts.length > 3) this.toasts.shift();
      }
      update(dt) {
        const g = this.g;
        const top = this.top;
        if (top) top.update?.(g, g.inp, dt);
        for (const t of this.toasts) t.t -= dt;
        this.toasts = this.toasts.filter((t) => t.t > 0);
      }
      /** Everything a test needs: the current screen, focus and prompts. */
      model() {
        const t = this.top;
        return { screen: t?.id ?? null, depth: this.stack.length, focus: t?.focusIndex?.() ?? t?.focus ?? null, items: t?.labels?.() ?? [], prompts: (t?.prompts?.(this.g) ?? this.prompts).map((p) => p[1]), text: t?.currentText?.() ?? null };
      }
      draw(hud) {
        const g = this.g;
        for (const s of this.stack) s.draw?.(g, hud);
        const t = this.top;
        if (t) {
          const prompts = t.prompts?.(g);
          if (prompts) this.drawPrompts(hud, prompts, "bottom");
        }
        this.drawToasts(hud);
      }
      drawToasts(hud) {
        this.toasts.forEach((t, i) => {
          const w = textWidth(t.text) + 16;
          const x = 240 - Math.floor(w / 2);
          const y = 20 + i * 18;
          panel(hud, x, y, w, 16, { fill: "white", trim: "sand" });
          drawText(hud, 240, y + 5, t.text, { color: t.color, align: "center" });
        });
      }
      drawPrompts(hud, prompts, where = "corner") {
        const g = this.g;
        const dev = g.inp.device;
        const xbox = g.settings.xbox;
        const mouseUsed = g.inp.mouse.used;
        let total = 0;
        const widths = prompts.map(([a, label]) => textWidth(label) + Math.max(28, promptGlyphWidth(a, dev, xbox, mouseUsed) + 15));
        for (const w of widths) total += w;
        const y = 270 - 21;
        let x = where === "corner" ? 480 - 12 - total : 240 - Math.floor(total / 2);
        panel(hud, x - 4, y - 5, total + 8, 19, { fill: "night", trim: "night", edge: "ink" });
        prompts.forEach(([action, label], i) => {
          const w = drawPromptGlyph(hud, x + 2, y, action, dev, xbox, mouseUsed);
          drawText(hud, x + w + 5, y, label, { color: "white" });
          x += widths[i];
        });
      }
    };
    Menu = class {
      constructor({ id, title, items, back, x = 120, y = 60, w = 240, itemH = 22, gap = 4, prompts, subtitle, onDraw, modal = true, onFocus, cols: cols2 = 1, dim: dimBack = true, footer }) {
        this.id = id;
        this.title = title;
        this.items = items;
        this.onBack = back;
        this.x = x;
        this.y = y;
        this.w = w;
        this.itemH = itemH;
        this.gap = gap;
        this.promptList = prompts;
        this.focus = 0;
        this.page = 0;
        this.perPage = 8;
        this.modal = modal;
        this.subtitle = subtitle;
        this.onDraw = onDraw;
        this.onFocus = onFocus;
        this.cols = cols2;
        this.dimBack = dimBack;
        this.footer = footer;
        this.focus = this.firstEnabled();
      }
      firstEnabled() {
        const i = this.items.findIndex((it) => !it.disabled);
        return i < 0 ? 0 : i;
      }
      labels() {
        return this.items.map((it) => it.label);
      }
      focusIndex() {
        return this.focus;
      }
      visible() {
        const start2 = Math.floor(this.focus / this.perPage) * this.perPage;
        return { start: start2, list: this.items.slice(start2, start2 + this.perPage) };
      }
      rect(i) {
        const { start: start2 } = this.visible();
        const k = i - start2;
        return [this.x, this.y + k * (this.itemH + this.gap), this.w, this.itemH];
      }
      move(d) {
        const n = this.items.length;
        if (!n) return;
        let i = this.focus;
        for (let k = 0; k < n; k++) {
          i = (i + d + n) % n;
          if (!this.items[i].disabled) break;
        }
        if (i !== this.focus) {
          this.focus = i;
          this.g?.sound("uiTick");
          this.onFocus?.(this.items[i]);
        }
      }
      activate(g) {
        const it = this.items[this.focus];
        if (!it) return;
        if (it.disabled) {
          g.sound("uiCancel");
          return;
        }
        g.sound(it.sound ?? "uiConfirm");
        it.action?.(g, this);
      }
      update(g, inp) {
        if (inp.nav.up) this.move(-1);
        if (inp.nav.down) this.move(1);
        if (inp.nav.left) this.items[this.focus]?.left?.(g, this);
        if (inp.nav.right) this.items[this.focus]?.right?.(g, this);
        const m = inp.mouse;
        if (m.moved) {
          const { start: start2, list } = this.visible();
          list.forEach((it, k) => {
            if (!it.disabled && inRect(m, ...this.rect(start2 + k)) && this.focus !== start2 + k) {
              this.focus = start2 + k;
              this.onFocus?.(it);
            }
          });
        }
        if (m.click) {
          const { start: start2, list } = this.visible();
          list.forEach((it, k) => {
            if (inRect(m, ...this.rect(start2 + k))) {
              this.focus = start2 + k;
              this.activate(g);
            }
          });
          return;
        }
        if (inp.confirm) {
          this.activate(g);
          return;
        }
        if (inp.back || m.rclick) {
          g.sound("uiCancel");
          (this.onBack ?? (() => g.ui.pop(this)))(g, this);
        }
      }
      prompts() {
        return this.promptList ?? [["confirm", "Select"], ["back", "Back"]];
      }
      draw(g, hud) {
        if (this.dimBack) dim(hud);
        const { start: start2, list } = this.visible();
        const hasTitle = !!this.title;
        const pageCount = Math.ceil(this.items.length / this.perPage);
        const totalH = list.length * (this.itemH + this.gap) - this.gap;
        if (hasTitle) {
          panel(hud, this.x - 8, this.y - 34, this.w + 16, totalH + 44 + (this.footer ? 14 : 0), { fill: "white", trim: "sand" });
          drawText(hud, this.x + this.w / 2, this.y - 26, this.title, { color: "ink", scale: 2, align: "center" });
        }
        if (this.subtitle) drawText(hud, this.x + this.w / 2, this.y - 8, this.subtitle, { color: "slate", align: "center" });
        list.forEach((it, k) => {
          const i = start2 + k;
          const [x, y, w, h] = this.rect(i);
          const focused = i === this.focus;
          panel(hud, x, y, w, h, { fill: focused ? "sand" : "white", trim: focused ? "orange" : "mist" });
          const label = typeof it.label === "function" ? it.label(g) : it.label;
          const ty = y + Math.floor((h - 7) / 2);
          if (it.icon) drawIcon(hud, x + 6, y + Math.floor((h - 16) / 2), it.icon, it.iconColors);
          drawText(hud, x + (it.icon ? 26 : 10), ty, label, { color: it.disabled ? "mist" : "ink" });
          if (it.value !== void 0) {
            const val = typeof it.value === "function" ? it.value(g) : it.value;
            drawText(hud, x + w - 10, ty, String(val), { color: "plum", align: "right" });
          }
          if (focused && (it.left || it.right)) {
            drawText(hud, x + w - 92, ty, "<", { color: "plum" });
            drawText(hud, x + w - 6, ty, ">", { color: "plum", align: "right" });
          }
        });
        if (pageCount > 1) drawText(hud, this.x + this.w / 2, this.y + totalH + 3, `Page ${Math.floor(this.focus / this.perPage) + 1} of ${pageCount}`, { color: "slate", align: "center" });
        if (this.footer) drawText(hud, this.x + this.w / 2, this.y + totalH + 4, typeof this.footer === "function" ? this.footer(g) : this.footer, { color: "slate", align: "center" });
        this.onDraw?.(g, hud, this);
      }
    };
  }
});

// src/ui/input.js
var PAD_BUTTONS, PAD_CODES, KB_WATCH, NAV, REPEAT_FIRST, REPEAT_NEXT, GameInput;
var init_input = __esm({
  "src/ui/input.js"() {
    PAD_BUTTONS = { 0: "PadCross", 1: "PadCircle", 2: "PadSquare", 3: "PadTriangle", 4: "PadL1", 5: "PadR1", 6: "PadL2", 7: "PadR2", 8: "PadCreate", 9: "PadOptions", 10: "PadL3", 11: "PadR3", 12: "PadUp", 13: "PadDown", 14: "PadLeft", 15: "PadRight", 16: "PadPS", 17: "PadTouch" };
    PAD_CODES = Object.values(PAD_BUTTONS);
    KB_WATCH = ["KeyA", "KeyB", "KeyC", "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT", "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ", "Space", "Enter", "Escape", "Backspace", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "NumpadAdd", "NumpadSubtract"];
    NAV = {
      up: ["PadUp", "ArrowUp", "KeyW"],
      down: ["PadDown", "ArrowDown", "KeyS"],
      left: ["PadLeft", "ArrowLeft", "KeyA"],
      right: ["PadRight", "ArrowRight", "KeyD"]
    };
    REPEAT_FIRST = 0.34;
    REPEAT_NEXT = 0.11;
    GameInput = class {
      constructor() {
        this.device = "kbm";
        this.nav = { up: false, down: false, left: false, right: false };
        this.held = { up: 0, down: 0, left: 0, right: 0 };
        this.any = false;
        this.mouse = { x: 240, y: 135, moved: false, over: false, down: false, click: false, rclick: false, used: false, seen: false };
        this.lastPointer = { x: null, y: null };
        this.keysTyped = [];
        this.stickFlick = 0;
        this.axisX = 0;
        this.axisY = 0;
        this.padTilt = 0;
        this.hudW = 480;
        this.hudH = 270;
      }
      /** Called once per rendered frame before anything reads it. */
      begin(ctx, dt) {
        const i = ctx.input;
        this.i = i;
        const axis = i.moveAxis();
        this.axisX = axis.x;
        this.axisY = axis.y;
        this.padTilt = Math.hypot(i.padAxis.x, i.padAxis.y);
        let padPress = false;
        for (const c2 of PAD_CODES) if (i.wasPressed(c2)) {
          padPress = true;
          break;
        }
        if (padPress || this.padTilt > 0.25) this.device = "pad";
        let kbPress = false;
        for (const c2 of KB_WATCH) if (i.wasPressed(c2)) {
          kbPress = true;
          break;
        }
        const p = i.pointer;
        const moved = this.lastPointer.x !== null && (Math.abs(p.x - this.lastPointer.x) > 1e-3 || Math.abs(p.y - this.lastPointer.y) > 1e-3);
        this.lastPointer.x = p.x;
        this.lastPointer.y = p.y;
        const m = this.mouse;
        m.moved = moved;
        m.over = p.over;
        m.x = Math.floor((p.x + 1) / 2 * this.hudW);
        m.y = Math.floor((1 - p.y) / 2 * this.hudH);
        m.click = i.wasPressed("MouseLeft");
        m.rclick = i.wasPressed("MouseRight");
        m.down = i.isDown("MouseLeft");
        const mousePress = m.click || m.rclick || i.wasPressed("MouseMiddle");
        if (kbPress || moved || mousePress || i.wheel !== 0) this.device = "kbm";
        this.any = padPress || this.padTilt > 0.25 || kbPress || moved || mousePress || i.wheel !== 0 || i.isDown("Touch") || i.wasPressed("Touch");
        if (moved || mousePress) {
          m.used = true;
          m.seen = true;
        }
        if (kbPress || padPress) m.used = false;
        const stick = { up: i.padAxis.y > 0.5, down: i.padAxis.y < -0.5, left: i.padAxis.x < -0.5, right: i.padAxis.x > 0.5 };
        for (const dir3 of ["up", "down", "left", "right"]) {
          const down = stick[dir3] || i.anyDown(NAV[dir3]) || i.wasPressed(...NAV[dir3]);
          this.nav[dir3] = false;
          if (down) {
            if (this.held[dir3] === 0) this.nav[dir3] = true;
            this.held[dir3] += dt;
            if (this.held[dir3] > REPEAT_FIRST) {
              this.nav[dir3] = true;
              this.held[dir3] = REPEAT_FIRST - REPEAT_NEXT;
            }
          } else this.held[dir3] = 0;
        }
        this.stickFlick = 0;
        this.stickVert = 0;
        if (!m.down) {
          const dx = i.mouseDelta.x, dy = i.mouseDelta.y;
          if (Math.abs(dx) < 0.8 && Math.abs(dy) < 0.8) this.flickArmed = true;
          if (this.device === "pad" && this.flickArmed !== false) {
            const big = Math.abs(dx) > Math.abs(dy);
            if (big && Math.abs(dx) > 2) {
              this.stickFlick = Math.sign(dx);
              this.flickArmed = false;
            } else if (!big && Math.abs(dy) > 2) {
              this.stickVert = Math.sign(dy);
              this.flickArmed = false;
            }
          }
        }
        this.keysTyped.length = 0;
        for (const c2 of i.commands) {
          if (c2?.t === "key") this.keysTyped.push(c2.key);
          if (c2?.t === "tap") this.any = true;
        }
        const createHeld = i.isDown("PadCreate");
        this.confirm = i.wasPressed("PadCross", "KeyE", "Enter");
        this.back = i.wasPressed("PadCircle", "Escape", "Backspace");
        this.useTool = i.wasPressed("PadSquare", "Space", "KeyF");
        this.toolHeld = i.isDown("PadSquare", "Space", "KeyF", "MouseRight");
        this.pockets = i.wasPressed("PadTriangle", "Tab", "KeyI");
        this.prevTool = i.wasPressed("PadL1") || i.wheel < 0;
        this.nextTool = i.wasPressed("PadR1") || i.wheel > 0;
        this.camL = i.wasPressed("PadL2", "KeyQ") || this.stickFlick < 0;
        this.camR = i.wasPressed("PadR2", "KeyR") || this.stickFlick > 0;
        this.map = i.wasPressed("PadTouch", "PadUp", "KeyM");
        this.almanac = i.wasPressed("PadDown", "KeyJ");
        this.emote = i.wasPressed("PadLeft", "KeyG");
        this.pause = !createHeld && i.wasPressed("PadOptions", "Escape");
        this.running = i.isDown("PadCircle", "ShiftLeft", "ShiftRight");
        this.sneaking = i.isDown("ControlLeft", "ControlRight");
        this.triangle = i.wasPressed("PadTriangle");
        this.square = i.wasPressed("PadSquare");
        this.tabPrev = i.wasPressed("PadL1", "KeyQ");
        this.tabNext = i.wasPressed("PadR1", "KeyR");
        this.digit = 0;
        for (let d = 1; d <= 6; d++) if (i.wasPressed(`Digit${d}`)) this.digit = d;
        this.zoomIn = i.wasPressed("Equal", "NumpadAdd") || this.stickVert < 0;
        this.zoomOut = i.wasPressed("Minus", "NumpadSubtract") || this.stickVert > 0;
      }
      anyAction() {
        return this.confirm || this.back;
      }
    };
  }
});

// src/dev/tuning.js
function resetTuning(id) {
  for (const t of TUNING) if (!id || t.id === id) tuning[t.id] = t.default;
  saveTuning();
}
function setTuning(id, v2) {
  const t = TUNING.find((x) => x.id === id);
  if (!t) return;
  tuning[id] = Math.min(t.max, Math.max(t.min, Math.round(v2 / t.step) * t.step));
  saveTuning();
}
function saveTuning() {
  store.set(KEY, tuning);
}
function loadTuning() {
  for (const t of TUNING) tuning[t.id] = t.default;
  const s = store.get(KEY);
  if (s) {
    for (const t of TUNING) if (typeof s[t.id] === "number") tuning[t.id] = s[t.id];
  }
}
var TUNING, KEY, tuning;
var init_tuning = __esm({
  "src/dev/tuning.js"() {
    init_storage();
    TUNING = [
      { id: "gameMinutesPerSecond", label: "Game minutes per second", default: 1.25, min: 0.25, max: 20, step: 0.25 },
      { id: "walkSpeed", label: "Walk speed", default: 2.6, min: 1, max: 6, step: 0.1 },
      { id: "jogSpeed", label: "Jog speed", default: 4.2, min: 2, max: 8, step: 0.1 },
      { id: "runSpeed", label: "Run speed", default: 6, min: 3, max: 12, step: 0.2 },
      { id: "cameraZoom", label: "Camera zoom", default: 1.6, min: 1.2, max: 2.4, step: 0.1 },
      { id: "fishPerAcre", label: "Fish per water acre", default: 3, min: 0, max: 10, step: 1 },
      { id: "biteWindow", label: "Bite window (s)", default: 0.6, min: 0.2, max: 2, step: 0.05 },
      { id: "maxNibbles", label: "Max false nibbles", default: 3, min: 0, max: 6, step: 1 },
      { id: "bugsPerAcre", label: "Bugs per acre", default: 1.5, min: 0, max: 6, step: 0.25 },
      { id: "spookRun", label: "Bug spook radius, running", default: 3, min: 0.5, max: 8, step: 0.25 },
      { id: "fruitRegrow", label: "Fruit regrow (days)", default: 2, min: 0, max: 6, step: 1 },
      { id: "weedsPerDay", label: "Weeds per day", default: 3, min: 0, max: 20, step: 1 },
      { id: "hybridChance", label: "Hybrid chance", default: 0.15, min: 0, max: 1, step: 0.05 },
      { id: "balloonsPerDay", label: "Balloons per day", default: 3, min: 0, max: 20, step: 1 },
      { id: "sellMult", label: "Sell price ×", default: 1, min: 0.2, max: 5, step: 0.1 },
      { id: "buyMult", label: "Buy price ×", default: 1, min: 0.2, max: 5, step: 0.1 },
      { id: "debtMult", label: "Debt ×", default: 1, min: 0.2, max: 5, step: 0.1 },
      { id: "favourMult", label: "Favour reward ×", default: 1, min: 0, max: 5, step: 0.1 },
      { id: "friendMult", label: "Friendship gain ×", default: 1, min: 0, max: 5, step: 0.1 },
      { id: "npcSpeed", label: "Neighbour walk speed", default: 1.8, min: 0.5, max: 5, step: 0.1 },
      { id: "chatRate", label: "Neighbour chat rate ×", default: 1, min: 0, max: 5, step: 0.1 },
      { id: "rainMult", label: "Rain chance ×", default: 1, min: 0, max: 3, step: 0.1 },
      { id: "cheeseVol", label: "Cheese volatility ×", default: 1, min: 0, max: 3, step: 0.1 },
      { id: "textSpeed", label: "Text speed (chars/s)", default: 35, min: 10, max: 200, step: 5 }
    ];
    KEY = "honk:tuning";
    tuning = {};
    for (const t of TUNING) tuning[t.id] = t.default;
  }
});

// src/ui/dialogue.js
function parseLine(text) {
  const out = [];
  let color = "ink";
  for (const ch of text) {
    if (ch === "*") {
      color = color === "red" ? "ink" : "red";
      continue;
    }
    if (ch === "~") {
      color = color === "blue" ? "ink" : "blue";
      continue;
    }
    if (ch === "|") {
      out.push({ c: "", color, beat: true });
      continue;
    }
    out.push({ c: ch, color, beat: false });
  }
  return out;
}
function wrapChars(chars) {
  const lines = [[]];
  let lineW = 0;
  let word = [];
  let wordW = 0;
  const glyphW = (c2) => textWidth(c2) + 1;
  const flush = () => {
    if (lineW + wordW > LINE_W && lines[lines.length - 1].length) {
      lines.push([]);
      lineW = 0;
    }
    lines[lines.length - 1].push(...word);
    lineW += wordW;
    word = [];
    wordW = 0;
  };
  for (const ch of chars) {
    if (ch.c === "\n") {
      flush();
      lines.push([]);
      lineW = 0;
      continue;
    }
    word.push(ch);
    wordW += ch.beat ? 0 : ch.c === " " ? 4 : glyphW(ch.c);
    if (ch.c === " ") flush();
  }
  flush();
  return lines;
}
var PANEL, LINE_W, Dialogue;
var init_dialogue = __esm({
  "src/ui/dialogue.js"() {
    init_draw();
    init_tuning();
    PANEL = { x: 28, y: 186, w: 424, h: 64 };
    LINE_W = PANEL.w - 32;
    Dialogue = class {
      /** beats: array of strings (pages), or items { text, emote, sound, who, name }. */
      constructor({ who = null, name = "", beats, choices = null, onDone = null, voice = null, id = "dialogue", dimmed = false }) {
        this.id = id;
        this.who = who;
        this.name = name;
        this.beats = beats.map((b) => typeof b === "string" ? { text: b } : b);
        this.choices = choices;
        this.onDone = onDone;
        this.voice = voice;
        this.index = 0;
        this.choiceFocus = 0;
        this.chosen = -1;
        this.dimmed = dimmed;
        this.setBeat(0);
      }
      currentText() {
        return this.beats[this.index]?.text ?? "";
      }
      setBeat(i) {
        this.index = i;
        const b = this.beats[i];
        const chars = parseLine(b.text);
        this.lines = wrapChars(chars);
        this.total = chars.filter((c2) => !c2.beat).length;
        this.seq = chars;
        this.shown = 0;
        this.pos = 0;
        this.timer = 0;
        this.beat = 0;
        this.done = false;
        if (b.who) this.who = b.who;
        if (b.name) this.name = b.name;
        if (b.voice) this.voice = b.voice;
        if (b.emote && this.g) this.g.actorEmote?.(this.who, b.emote);
        if (b.sound && this.g) this.g.sound(b.sound);
      }
      open(g) {
        this.g = g;
        const b = this.beats[0];
        if (b.emote) g.actorEmote?.(this.who, b.emote);
        if (b.sound) g.sound(b.sound);
      }
      update(g, inp, dt) {
        const speed = g.settings.textSpeed ?? tuning.textSpeed;
        if (!this.done) {
          if (this.beat > 0) this.beat -= dt;
          else {
            this.timer += dt * speed;
            while (this.timer >= 1 && !this.done && this.beat <= 0) {
              this.timer -= 1;
              const ch = this.seq[this.pos++];
              if (!ch) {
                this.done = true;
                break;
              }
              if (ch.beat) {
                this.beat = 0.3;
                continue;
              }
              this.shown++;
              if (ch.c !== " ") {
                g.voice?.syllable(ch.c, this.voice, this.currentText());
                if (this.who) {
                  const a = g.actorOf?.(this.who);
                  if (a && /[aeiouy]/i.test(ch.c)) a.talkAmp = 1;
                }
              }
            }
            if (this.pos >= this.seq.length) this.done = true;
          }
        }
        const m = inp.mouse;
        const last = this.index === this.beats.length - 1;
        if (this.done && last && this.choices) {
          const n = this.choices.length;
          if (inp.nav.up) {
            this.choiceFocus = (this.choiceFocus + n - 1) % n;
            g.sound("uiTick");
          }
          if (inp.nav.down) {
            this.choiceFocus = (this.choiceFocus + 1) % n;
            g.sound("uiTick");
          }
          const rects = this.choiceRects();
          if (m.moved) rects.forEach((r, i) => {
            if (inRect(m, ...r)) this.choiceFocus = i;
          });
          let pick = inp.confirm;
          if (m.click) rects.forEach((r, i) => {
            if (inRect(m, ...r)) {
              this.choiceFocus = i;
              pick = true;
            }
          });
          if (pick) {
            g.sound("uiConfirm");
            this.chosen = this.choiceFocus;
            g.ui.pop(this);
            this.onDone?.(this.chosen);
          } else if (inp.back || m.rclick) {
            this.chosen = n - 1;
            g.sound("uiCancel");
            g.ui.pop(this);
            this.onDone?.(this.chosen);
          }
          return;
        }
        if (inp.confirm || m.click || inp.back || m.rclick) {
          if (!this.done) {
            this.shown = this.total;
            this.pos = this.seq.length;
            this.done = true;
          } else if (!last) {
            g.sound("uiTick");
            this.setBeat(this.index + 1);
          } else {
            g.sound("uiTick");
            g.ui.pop(this);
            this.onDone?.(-1);
          }
        }
      }
      choiceRects() {
        const n = this.choices.length;
        let w = 0;
        for (const c2 of this.choices) w = Math.max(w, textWidth(c2) + 26);
        w = Math.max(90, Math.min(300, w));
        const h = 19;
        const x = 480 - 28 - w;
        const y0 = PANEL.y - 8 - n * (h + 2);
        return this.choices.map((_, i) => [x, y0 + i * (h + 2), w, h]);
      }
      prompts() {
        const last = this.index === this.beats.length - 1;
        if (this.done && last && this.choices) return null;
        return null;
      }
      draw(g, hud) {
        const { x, y, w, h } = PANEL;
        panel(hud, x, y, w, h, { fill: "white", trim: "sand" });
        if (this.name) {
          const nw = textWidth(this.name) + 16;
          panel(hud, x + 10, y - 11, nw, 16, { fill: "navy", trim: "sky" });
          drawText(hud, x + 18, y - 6, this.name, { color: "white" });
        }
        let left = this.shown;
        this.lines.slice(0, 4).forEach((line2, li) => {
          let cx = x + 14;
          const ly = y + 11 + li * LINE_H;
          for (const ch of line2) {
            if (ch.beat) continue;
            if (left <= 0) break;
            left--;
            if (ch.c === " ") {
              cx += 4;
              continue;
            }
            cx += drawText(hud, cx, ly, ch.c, { color: ch.color });
          }
        });
        const last = this.index === this.beats.length - 1;
        if (this.done && !(last && this.choices)) {
          const bob = Math.floor(g.ctx.time * 4 % 2);
          drawText(hud, x + w - 18, y + h - 15 + bob, "v", { color: "orange", scale: 1 });
        }
        if (this.done && last && this.choices) {
          this.choiceRects().forEach((r, i) => {
            const focused = i === this.choiceFocus;
            panel(hud, r[0], r[1], r[2], r[3], { fill: focused ? "sand" : "white", trim: focused ? "orange" : "mist" });
            if (focused) drawText(hud, r[0] + 7, r[1] + 6, ">", { color: "plum" });
            drawText(hud, r[0] + 16, r[1] + 6, this.choices[i], { color: "ink" });
          });
        }
      }
    };
  }
});

// src/data/dialogue/types.js
var TYPE_LINES;
var init_types = __esm({
  "src/data/dialogue/types.js"() {
    TYPE_LINES = {
      hearth: {
        greet: ["Oh, it's you, mmhm. Come in out of the everything.", "You look peaky, mmhm. I made soup. It's Tuesday's. Tuesday was a good day for soup, mmhm.", "Have you eaten? That's not a question. I can see you haven't.", "There you are. I was just saying to the pot, I wonder where {player} has got to, mmhm.", "Mind the floor, it's full of pots. No, the outside floor. It spread.", "I keep a spoon for you now, mmhm. I don't know when that started.", "You walk like someone who needs a bun, mmhm.", "Sit down. | Well, there's nowhere to sit. Stand down, then, mmhm.", "Oh good, a mouth. I've got too much of everything."],
        morning: ["Morning, mmhm. Porridge is a state of mind, and also porridge.", "Up with the kettle, I see. Good. The kettle respects that.", "First thing I do is put a pot on. Second thing, I forget. Mmhm."],
        noon: ["Is it noon? It feels like a stew sort of noon, mmhm.", "Midday. Halfway between one soup and the next."],
        evening: ["Evening, mmhm. Everything smells of onions and that's how you know it's gone well.", "The light goes all soft about now. Like a good potato, mmhm."],
        night: ["You should be in bed, mmhm. I'd say that with a blanket if I had one on me.", "Night. The soup's asleep. Don't wake it."],
        rain: ["Rain! Good for the soup, mmhm. I leave a pot out. For flavour.", "Listen to that. Free stock, falling from the sky, mmhm.", "Rain's just the sky having a nice broth, mmhm."],
        snow: ["Snow in the pot makes a thin soup, mmhm. I've checked. Twice.", "Cold enough for a second helping. Or a third. I'm not counting, mmhm."],
        sun: ["Lovely day. Terrible for soup. I'll make it anyway, mmhm."],
        wind: ["Hold onto your lid, mmhm. I lost one to this wind in the spring. I think of it often."],
        spring: ["Spring onions! And spring everything else, I suppose, mmhm.", "Everything's coming up. I'll have it all in a pot by Thursday, mmhm."],
        summer: ["Too hot for soup, they say. They're wrong, mmhm.", "Cold soup, that's a summer soup. You heard me. Don't tell anyone."],
        autumn: ["This is the season, mmhm. Everything goes in, nothing comes out.", "I've a pumpkin I've been watching. It knows, mmhm."],
        winter: ["Winter's when you find out who your friends are, mmhm. They're the ones holding bowls.", "Keep your feet warm and your soup warmer."],
        absent: ["Oh. You're alive, mmhm. I kept your bowl out. It's got a skin on it now.", "You were gone a while, mmhm. I made soup for you anyway. And then I ate it. It's been hard on both of us."],
        hungry: ["I don't suppose you've got a bit of fish on you? Mmhm. It's for a pot. It's always for a pot.", "What I'd give for a nice mushroom. Not a lot. A fair amount, mmhm."],
        giftLove: ["Oh! Oh, that'll go in a pot beautifully, mmhm. Don't look at me like that, everything does.", "For me? You'll have a bowl of something for this, mmhm. A big one."],
        giftLike: ["That's kind, mmhm. I'll find a spot for it, between the pots.", "Well now. That's very nice. It's not soup, but it's very nice."],
        giftMeh: ["Mmhm. Yes. I've got one. It's in a pot.", "I'll put it with the others. I've run out of others, so it'll start a new pile, mmhm."],
        giftHate: ["Oh. It's… loud, isn't it. Is it meant to be that loud, mmhm?"],
        thanks: ["You're a good sort, mmhm. Take this. It was going to be soup but it can be gratitude.", "That's a weight off my ladle, mmhm.", "Well done. You've earned a good sit. I'm afraid all I've got is standing, mmhm."],
        favour: ["I've a little job, if your hands aren't full. They look empty, mmhm. Which is a shame in itself.", "You couldn't help me out? I'd do it, only I'm mid-stir, mmhm."],
        letter: ["Dear {player},\nI made too much. I always make too much. Come by with a bowl.\nDorrit, mmhm", "Dear {player},\nHere is something. It isn't soup. I tried to post the soup and Clementine had words.\nDorrit", "Dear {player},\nYou looked thin on Tuesday. I don't know which Tuesday. All of them.\nDorrit, mmhm"],
        bonk: ["Ow. You could have just asked me to stand still, mmhm. I'd have said no, but you could have asked."],
        chatter: ["There's a right way to chop a carrot and I've never once seen it done, mmhm.", "I told Tavi that smile would stick. It stuck. Now she's happy all the time and I blame myself.", "Bartleby takes his soup with nothing. I don't know what I'm doing wrong, mmhm.", "You can tell a lot about a person from what they leave in the bowl. You leave nothing. Good, mmhm.", "Rocco asked me for a soup with more protein in it. I gave him a bigger spoon.", "If you hear something bubbling in the night, that's me. Or a sinkhole. Either way, bring a bowl.", "Lady Ottoline says she only eats pearls. I've seen her eat a whole pie, mmhm.", "Someone left a boot by my door. I've got it simmering. You never know, mmhm."]
      },
      sunshine: {
        greet: ["Hi! Hi hi hi! You're here and it's happening, isn't it?!", "I smiled at a rock today and I think it's going really well, isn't it?!", "It's {player}! I knew it was you! I say that to everyone and I'm nearly always right, isn't it?!", "Oh wow, you're walking! You're so good at that, isn't it?!", "I saved you a wave! Here it comes! | That was it! Wasn't that great, isn't it?!", "Today I'm going to like something new. So far it's you. Good start, isn't it?!", "I've got so much to tell you, and I've forgotten it, and that's okay, isn't it?!", "You've got a face on, and it's a really nice one, isn't it?!", "I waved at Bartleby again! He looked at me for almost a whole second, isn't it?!"],
        morning: ["It's morning! Again! They keep doing that and it keeps being great, isn't it?!", "I got up before the sun so I could say hello to it, isn't it?!", "Good morning! I said it to a snail and it took it so well, isn't it?!"],
        noon: ["The sun is right on top of us! It's like it wants to be friends, isn't it?!", "Noon! My shadow got so small! I told it well done, isn't it?!"],
        evening: ["The whole sky went orange, just for us. I said thanks. It's the least I can do, isn't it?!", "Evening is just the day getting comfy, isn't it?!"],
        night: ["Why are you up? Why am I up? Let's both be up, isn't it?!", "Sleepy… but still happy… isn't it…?!"],
        rain: ["It's raining! That's the clouds giving everything a hug, isn't it?!", "I'm soaked! I'm so soaked! I've never felt so included, isn't it?!", "Puddles! Somebody put puddles everywhere! How kind, isn't it?!"],
        snow: ["Everything's white and it's all for free, isn't it?!", "I caught a snowflake on my tongue and it was so polite about it, isn't it?!"],
        sun: ["It's so sunny! I've told everyone! They already knew! Still, isn't it?!"],
        wind: ["The wind took my hat! And I hope it's very happy with it, isn't it?!"],
        spring: ["Things are growing! I've been cheering them on! You can't see it working but it is, isn't it?!", "I named all the blossoms. They're all called Blossom. It's easier, isn't it?!"],
        summer: ["Summer! I got a bit sunburnt and now I'm a nicer colour, isn't it?!", "The cicadas are singing just for me. I asked. They didn't say no, isn't it?!"],
        autumn: ["The leaves are falling and they look so brave, isn't it?!", "Everything's orange! I'm orange! We all match, isn't it?!"],
        winter: ["It's so cold my teeth are clapping for me! Thanks, teeth, isn't it?!", "I built a snow friend! He's a really good listener, isn't it?!"],
        absent: ["You came back! I knew you would! I also knew you wouldn't, but I was happy about both, isn't it?!", "You were gone so long I started waving in advance, isn't it?!"],
        hungry: ["I'd love a pear! Or anything! Or nothing! Nothing's nice too, isn't it?!", "My tummy made a noise and I think it likes you, isn't it?!"],
        giftLove: ["You got me a thing?! It's the best thing! Every thing is the best thing but this one's *this one*, isn't it?!", "I'm going to keep it forever! Or until I give it to someone else because I love them too, isn't it?!"],
        giftLike: ["A present! Oh my gosh! I love it, and you, and everything nearby, isn't it?!", "Thank you! I'll introduce it to my other things, isn't it?!"],
        giftMeh: ["Wow! It's so… it! It's really it, isn't it?!", "I love it! I don't know what it is, and I love that too, isn't it?!"],
        giftHate: ["I love it! | That's it. That's the whole reaction. There isn't a bad one. It's a bit worrying, isn't it?!"],
        thanks: ["You did it! I knew you could! I also think you could do anything else at all, isn't it?!", "Yay! Here, this is for you, and so is this hug, it's invisible, isn't it?!", "You're the best one! I tell everyone that about everyone, but this time I mean you, isn't it?!"],
        favour: ["Can you help? You don't have to! But you'd be so great at it, isn't it?!", "I've got a favour and it's tiny and you're huge, isn't it?!"],
        letter: ["Dear {player}!!!\nHi!!!\nThat's all!!! Isn't it?!\nTavi", "Dear {player}!\nI drew you! It didn't come out, so I'm just telling you I did! Love, Tavi", "Dear {player}!\nToday I was thinking about you and also a duck! You were both doing great!\nTavi"],
        bonk: ["You got me with your net! It's like a hug but with a stick, isn't it?!"],
        chatter: ["Bartleby's my best friend. He doesn't know yet. It's going really well, isn't it?!", "I asked Ozzie what he's so worried about and he gave me a list. It was so long! He's so thorough, isn't it?!", "Do you think fish know they're wet? I hope they enjoy it, isn't it?!", "I tried being sad yesterday, to see. I couldn't find the part where you start, isn't it?!", "Mrs. Gander told me I owe her for the smile. I said you can have it! She looked so confused, isn't it?!", "Everyone keeps asking if I'm okay. I'm so okay. Is that okay, isn't it?!", `Lady Ottoline calls me "that child". I'm older than her. I think it's a nickname, isn't it?!`, "I've got a list of everyone who likes me. There's room on it, isn't it?!"]
      },
      grouch: {
        greet: ["No. | Oh, it's you. Still no. I'd prefer not.", "You're standing in my good spot. No, there isn't another one. They're all my good spot. I'd prefer not.", "What. I'd prefer not.", "Hm.", "You again. I was just enjoying nobody.", "If this is about the laundry, I know it's there. I'd prefer not to discuss it.", "I had a whole silence going, and you've walked straight through it.", "Mm. Say what you came to say. Or don't. Don't would be better.", "That quokka waved at me. Twice. I'd prefer not."],
        morning: ["Morning. I'm told. I'd prefer not.", "It's too early to be seen.", "Who put the sun there. I didn't ask for that."],
        noon: ["Middle of the day. Everyone's out. It's dreadful.", "Lunch is what happens when you can't avoid noon."],
        evening: ["Getting dark. Good. That's the first good thing that's happened.", "Evening. You can't see my face as well. Keep it that way."],
        night: ["It's night. Go away. It's the one time that's traditional.", "I'm asleep. This is what it looks like. I'd prefer not."],
        rain: ["Rain. Keeps people in. I like what it's doing.", "At least the rain doesn't ask how I am.", "Wet. Very wet. The laundry's getting a wash, at least."],
        snow: ["Snow. Quiet. Finally, weather with some manners.", "They're all out making snowmen. Nobody asked the snow."],
        sun: ["Bright. Far too much of it. Somebody should say something. Not me."],
        wind: ["The wind took a sock off my antlers and brought me a different sock. I'd prefer not."],
        spring: ["Things are blooming. Loudly.", "Blossom on my good chair. I'd prefer it wasn't."],
        summer: ["Too hot for this fur and too hot for you. I'd prefer not.", "Cicadas. All day. They've got no idea how they sound."],
        autumn: ["This one's all right. Don't tell anyone.", "Everything dies a bit. It's very restful."],
        winter: ["Finally. Everyone indoors. I'd prefer it stayed this way.", "Cold. I don't mind it. I don't mind much, as a policy."],
        absent: ["You left. It was nice. You've come back.", "Oh. You. Dorrit owes me a pie because you turned up. I'd prefer she didn't have to."],
        hungry: ["I could eat. I'd prefer not to talk about it.", "Pine needles. That's what I want. Nobody listens. Nobody would, even if I said it."],
        giftLove: ["Hm. | That's not the worst thing anyone has handed me. I'd prefer you didn't tell anyone.", "This smells like pine. | I'm not crying. It's the pine. Go away."],
        giftLike: ["Hm. All right. Leave it there.", "I'll keep it. Don't make it a thing."],
        giftMeh: ["What is it? No, don't tell me. I'd prefer not.", "I've nowhere to put that. I have a chair. It's on the chair now. I hate this."],
        giftHate: ["You've asked me a question with this. The answer is no."],
        thanks: ["Done, is it. Fine. Here. Don't say anything.", "Mm. That saves me doing it, which I wouldn't have. Take this and go.", "Right. We're even, and if we're not, I'd prefer not to know."],
        favour: ["I'd prefer not to ask. But I can't reach it, and there's no one else, and I'd prefer not to be having this conversation.", "You. I need a thing. I'd prefer I didn't."],
        letter: ["{player}.\nNo.\nBartleby", "{player}.\nThis letter is the last one. I said that about the other one too.\nBartleby", "{player}.\nThe quokka asked me to write something nice. Here it is: the river was quiet at six.\nBartleby"],
        bonk: ["I saw that coming, from some way off, and it still happened. I'd prefer not."],
        chatter: ["That chair cost me everything. It's the only good chair. I sit in it and I'm angry in comfort.", "Rocco ran past my house fourteen times this morning. I counted. I had nothing else on.", "I've got a shirt on one antler and I don't know whose it is. I've stopped asking.", "Tavi says we're best friends. There's been no paperwork.", "People keep telling me to come out of my shell. That's a different animal, and also no.", "I went to the museum once. It was all dead things being looked at. I understood them completely.", "I once said something nice by accident. I'm still dealing with it.", "Ottoline wants me to carry her parasol. I'd prefer to be a different species."]
      },
      diva: {
        greet: ["Ah. You may approach, darling dear. That's close enough.", "I am technically the Duchess of this river, darling dear. Yes, that one. No, don't touch it.", "Oh, it's the small round one. Do curtsey, darling dear. Or whatever it is you do.", "You find me in between tragedies, darling dear. Do be brief.", "One has been told one looks radiant today. One told oneself, but still, darling dear.", "Darling dear, I knew it was you. The air became so much more ordinary.", "Is that what they're wearing out there? How brave. I do so admire bravery in others, darling dear.", "Do I look tired? Don't answer. Nobody has ever been so tired, or looked so well on it.", "Mind the rug, darling dear. It was the Duke's. The moths have had most of him."],
        morning: ["Morning? One does not do morning, darling dear. Morning does me.", "I rise at eleven. It happens to be nine. You are looking at a miracle.", "Dew, darling dear. So common. Everywhere you look."],
        noon: ["Noon is such unforgiving light. Stand between me and it, there's a dear.", "Lunch was a tragedy in three courses. I shall be having it again."],
        evening: ["Now *this* is my light, darling dear. Do look at me in it. There. That'll do.", "Evening, when all the best people come out. And then there's you."],
        night: ["In my day, darling dear, one did not simply wander about at night. One was carried.", "Do lower your voice. The moon is listening. It adores me."],
        rain: ["Rain ruins one's pearls, darling dear. I'm told they come from the wet. I don't see the connection.", "I don't mind the wet. I *mind* the mud. It's nothing like the mud at home.", "Such weather. It's as if the heavens were trying to out-sob me. They shan't."],
        snow: ["Snow, darling dear! It's everywhere, and not one flake of it has asked permission.", "Do you know how much a good fur costs? I'm wearing mine. Don't stare."],
        sun: ["The sun is rather overdoing it, darling dear. One has seen better."],
        wind: ["My tiara! Oh, the wind has no breeding at all, darling dear."],
        spring: ["Blossom, darling dear. It's so *obvious*. But I allow it.", "They've named a flower after me. Or they will. I've written to them."],
        summer: ["Heat is so vulgar, darling dear. It shows on everyone but me.", "I summered at the river. I always summer at the river. I live at the river."],
        autumn: ["Everything is dying beautifully, darling dear. It's been a great inspiration.", "Autumn and I have an understanding. We both look best on the way out."],
        winter: ["Winter brings out one's cheekbones. I have them flown in.", "Cold? Darling dear, I have been cold-shouldered by better than this."],
        absent: ["You abandoned us, darling dear. I barely noticed. I wrote nine poems about it.", "And where were *you*? No, don't tell me. I'd so hate to find it interesting."],
        hungry: ["One does not *eat*, darling dear. One simply happens to be near food, repeatedly.", "A little fish, perhaps. Plated, if you can. If you can't, simply hand it to me and look away."],
        giftLove: ["Oh! Oh, darling dear! At last, someone in this village with *eyes*!", "It's almost good enough for me. I shall keep it where people can see me with it."],
        giftLike: ["How thoughtful, darling dear. You may have one of my better nods.", "I shan't say I'm touched. I shall merely allow it to be known."],
        giftMeh: ["Oh. For me? How… yes. Put it with the staff's things, darling dear.", "I had one of these, darling dear, before I had taste."],
        giftHate: ["Mud. You have brought mud, or something very like it. I *live* in it, darling dear, I don't receive it."],
        thanks: ["You're quite useful, darling dear. I shall tell people I discovered you.", "Well done. Here. It's from the estate. Don't ask which estate.", "How efficient. You may tell people you know me, darling dear. Within reason."],
        favour: ["You there, darling dear. I require a small service, and you have that look of someone who's free.", "A little errand. Beneath me, entirely above you. I mean that as a compliment, darling dear."],
        letter: ["My dear {player},\nI was thinking of myself today, and there you were, just off to one side.\nLady Ottoline", "Darling dear {player},\nEnclosed is a token of my esteem. I had several. Yolanda is not to know.\nO.", "Dear {player},\nYou may burn this letter after reading. Or frame it. Frame it.\nLady O."],
        bonk: ["You struck me. A *lady*. With a *butterfly net*. I'll tell the Duke. He's a rug now, but I'll tell him."],
        chatter: ["Yolanda knitted that scarf out of pure spite, darling dear. I can tell. I'm wearing it to annoy her.", "I was on the stage, you know. Well. Near it. I was asked to leave very dramatically.", "Moths have eaten my entire youth, darling dear. I keep what's left in a drawer.", "Mud is good for the complexion. It's not good for anything else, and neither am I.", "They say a platypus cannot be a duchess. They've said it for years, darling dear. I've outlived several of them.", "I lay eggs, darling dear, and that's all anybody needs to know about that.", "Bartleby carried my parasol once. He'd prefer not to talk about it. Isn't that sweet?", "I have forgiven Yolanda. I haven't told her. It's more of a punishment that way."]
      },
      goGetter: {
        greet: ["I rolled here! From over there! That's thirty metres of pure cardio, let's roll!", "Look at you! Standing around! That's rest, that is, and it's bad for you! Let's roll!", "You lifting? You look like you could lift! A bit! Small things! Let's roll!", "I just beat my personal best at this conversation! Let's roll!", "Twenty laps round the plaza! Then I saw you! So that's twenty-one! Let's roll!", "Feel this armour! No, don't! It's all muscle in there, you'd hurt yourself! Let's roll!", "I gave myself a trophy for getting up today! Next one's for you if you try harder! Let's roll!", "Stairs are a scam, by the way. Don't let them tell you otherwise! Let's roll!", "Nib did a push-up! Half a push-up! He lay down and I was proud of him! Let's roll!"],
        morning: ["Five a.m. and I've already rolled to the sea and back! Let's roll!", "Breakfast of champions! That's eggs, more eggs, and a look at myself! Let's roll!", "Morning! The best time to be better than everyone still asleep! Let's roll!"],
        noon: ["Noon! Protein o'clock! Let's roll!", "Halfway through the day and I'm already twice as tired as you! That's winning! Let's roll!"],
        evening: ["Evening roll! Keeps the bands supple! Let's roll!", "End of the day and I've left nothing in the tank! I'm still going! There's a second tank! Let's roll!"],
        night: ["Night training! You can't see the pain! Let's… let's roll… in a bit.", "Sleep is just lifting with your eyes closed! Let's roll!"],
        rain: ["Rain's just extra resistance! Let's roll!", "Wet roads are fast roads! I went straight through a hedge! Let's roll!", "It's only water! You're mostly water! So that's nothing! Let's roll!"],
        snow: ["Snowball rolls! I've got bigger! I'm huge and also I can't stop! Let's roll!", "You rolling in this? I'm rolling in this! Let's roll!"],
        sun: ["Perfect day for rolling! They're all perfect days! Let's roll!"],
        wind: ["Headwind! That's free weights for your whole body! Let's roll!"],
        spring: ["Spring training! I sprang! Let's roll!", "New season, new personal bests! Same trophies, I'm re-awarding them! Let's roll!"],
        summer: ["Beach body season! Everyone's body is on the beach! Mine's there twice! Let's roll!", "Sweat is your fat crying! That's mine! I'm not crying! Let's roll!"],
        autumn: ["Leaf piles! Best crash mats in the game! Let's roll!", "Getting cold, keeps the armour tight! Let's roll!"],
        winter: ["Winter bulk! I've had four dinners and a pep talk! Let's roll!", "Ice is just a slide that doesn't believe in you! Let's roll!"],
        absent: ["Where've you been? You've lost your form! I could tell from over there! Let's roll!", "You missed so many laps! I did yours for you! You owe me! Let's roll!"],
        hungry: ["Got any fish? I need the protein! I always need the protein! Let's roll!", "I could eat a whole sea bream! I could eat two and bench the third! Let's roll!"],
        giftLove: ["YES! That's what I'm talking about! Fuel! Let's roll!", "You get it! You really get it! I'm giving you a trophy! Later! When I've made it! Let's roll!"],
        giftLike: ["Nice one! Can I lift it? I lifted it! Let's roll!", "Cheers! I'll put it in the gym! Everything's the gym! Let's roll!"],
        giftMeh: ["Is it heavy? It's not heavy. Okay. It's fine! Let's roll!", "Ah! A thing! I'll roll it to the others! Let's roll!"],
        giftHate: ["A stair?! You got me a little stair?! That's how it starts! Get it away! Let's roll!"],
        thanks: ["Great work! Good form! Bit slow! Let's roll!", "Yes! That's a personal best for you, I assume! Here! Reward! Let's roll!", "Solid! You're getting stronger! I can't see it, but I believe in it! Let's roll!"],
        favour: ["Quick job! It'll get your heart rate up! Let's roll!", "Got a challenge for you! I could do it myself in half the time, so that's your target! Let's roll!"],
        letter: ["{player}!\nDid you do your laps? I can tell if you didn't! I'm holding this letter very firmly!\nRocco", "{player}!\nAttached: motivation. Let's roll!\nRocco", "{player}!\nYou're doing great! I'm doing greater! Let's roll!\nRocco"],
        bonk: ["Ha! I barely felt that! You should work on your swing! Let's roll!"],
        chatter: ["Nib's got potential! He's got no muscles, or interest, but he's got potential! Let's roll!", "I wrote a book about fitness! It's one page! The page says roll! Let's roll!", "I've got eleven trophies and I earned them all, against me! Let's roll!", "They wanted me to take the stairs at the museum! I had to go up the ramp four times to feel okay! Let's roll!", "I keep thinking there's a bigger town out there, with bigger hills. Anyway! Let's roll!", "Bartleby never does any exercise, and his neck is enormous! It's not fair! Let's roll!", "Mrs. Gander charged me for wear on the road! Fair! I wore it! Let's roll!", "Ever wonder what's past the end of the line? Me neither. Maybe a bit. Let's roll!"]
      },
      dreamer: {
        greet: ["Oh… you. You're in my poem. It's about your hat. It ends badly, or so the moon says.", "I wrote you a poem. It's about your hat. It ends badly, or so the moon says.", "Hello. Or goodbye. It's so early in the universe to say, or so the moon says.", "I was just looking at nothing. It's looking better than it did, or so the moon says.", "You seem so *there* today… or so the moon says.", "Did you see that? No. Neither did I. It was beautiful, or so the moon says.", "I lost a page. It was the page with you on it. Don't worry. It wasn't a good page.", "I don't remember if we've met. It's all right. We're all very far apart, or so the moon says.", "Rocco made me jog. I think I saw the other side, or so the moon says."],
        morning: ["Morning… you can still see the moon if you're quick. She's leaving. She always leaves.", "I stayed up. I do that. The stars don't clock off till five, or so the moon says.", "The sun's up. It's just a star that lacks discretion."],
        noon: ["It's so bright. There are stars behind it, though. They're still there, or so the moon says.", "Noon is when all the shadows go home. I wonder what they do there."],
        evening: ["Soon. | It's nearly time. | Oh, nothing. Just the sky, or so the moon says.", "First star. I wish… no. I already wished. It's still processing."],
        night: ["Shh. They're all out. Look up. | No, further than that, or so the moon says.", "This is my morning, really. Pleasure to meet you, or so the moon says."],
        rain: ["Rain. Every drop is on its way somewhere, or so the moon says.", "You can't see the stars. They can't see us either. It's very private, or so the moon says.", "I left my poems out in it. They're better now. You can't read them."],
        snow: ["No two the same, they say. Has anyone checked? I've started, or so the moon says.", "It's so quiet you can hear the paper settling."],
        sun: ["A clear night's coming. I can feel it behind all this day."],
        wind: ["There go my pages. They'll be happier in the woods, or so the moon says."],
        spring: ["Everything starts again. Doesn't it get tired, or so the moon says.", "A butterfly sat on my telescope. I looked at it for a while. It wasn't Saturn, but it tried."],
        summer: ["Fireflies. Tiny stars that have given up on distance, or so the moon says.", "Short nights. Hardly any room for anything."],
        autumn: ["The leaves fall, and I catch them, and I write on them. It's a filing problem now.", "Longer nights! I've been looking forward to it since last time, or so the moon says."],
        winter: ["The stars are sharpest now. It hurts to look. That's how you know, or so the moon says.", "My breath goes up and joins everything. A bit of me is near Saturn by now."],
        absent: ["You were gone? I'm sorry, I thought that was me.", "You came back. Light does that, from some way off. By the time it arrives it's already old, or so the moon says."],
        hungry: ["I forgot to eat. I remember that I forgot, which is the first step, or so the moon says.", "Do you have a bug? I don't want to eat it. I just want to ask it some things."],
        giftLove: ["For me? It's like a small comet landed in my hand. It hardly hurt at all, or so the moon says.", "Oh… I'll write about this. It ends badly, but in a nice way."],
        giftLike: ["Thank you. I'll keep it near the telescope, so it can see, or so the moon says.", "That's kind. Kindness is rare, you know, per cubic light year."],
        giftMeh: ["It's a thing. And it's here, and so are we. For now, or so the moon says.", "I'll put it on a pile of paper. Then it'll be paper, in a way."],
        giftHate: ["It's very loud, isn't it? Alarms are loud too. I'd like it to be somewhere else, or so the moon says."],
        thanks: ["You did it. Somewhere, a star has noticed. It'll take a while, or so the moon says.", "Thank you. Here. It was in my pocket and now it's in the story.", "That's the nicest thing that's happened since the Thursday comet. There wasn't one, but it was nice."],
        favour: ["Could you do something for me? I would, but I keep looking up, or so the moon says.", "I need a small favour… though on a large enough scale, all favours are small."],
        letter: ["{player},\nHere is a line I wrote for you:\nThe bean falls, the debt remains.\nIt's not finished. Neither are you, or so the moon says.\nNib", "{player},\nI found this. It might be yours. Most things are, for a bit.\nNib", "{player},\nIf you look up tonight, I'll be looking up too. We won't see each other. That's the idea.\nNib"],
        bonk: ["Oh. You hit me with a net. I thought it was fate. It's so often nets."],
        chatter: ["I named a star after Bartleby. It's the one that's furthest from all the others.", "Rocco says I've got potential. I've looked it up. It means I haven't done anything yet, or so the moon says.", "Have you ever noticed the Old Bell is always a little sad, even when it's noon?", "I found a constellation shaped like an overdue library book. Nobody believes me, or so the moon says.", "Do you ever feel like you've left something on, somewhere, a long time ago?", "If you go far enough, the bus comes back round. I've done the sums. They're on a leaf.", "Clementine's bee told me something. I won't say what. It's not the kind of thing you can say.", "I don't own a calendar. I just ask the moon, and she gets it wrong in a very consistent way."]
      },
      schemer: {
        greet: ["Psst. Over here. No, don't look. You didn't hear it from me.", "Have you ever *seen* Mrs. Gander eat? No. Neither has anyone. You didn't hear it from me.", "Were you followed? Good. It means they're not following me. You didn't hear it from me.", "You walk the same way every day. I've got it on a chart. You didn't hear it from me.", "Keep your voice down. The bee is listening. You didn't hear it from me.", "I know what you did. Do you know what you did? I've got it written down, in case.", "Ask me nothing. I'll tell you everything. You didn't hear it from me.", "Red string! That's all I'm saying. Go and look at some red string. You didn't hear it from me.", "I was never here. If anyone asks, I was dead. I do that."],
        morning: ["Morning. They think you're asleep at this hour. That's how they get you.", "I've been up since the delivery. There's always a delivery. Nobody ever says of what.", "Look at the sunrise. Now ask yourself who benefits."],
        noon: ["Noon. Everyone's accounted for. It's too neat. You didn't hear it from me.", "Nothing happens at noon. Which is exactly what they'd want you to think."],
        evening: ["Evening. The goose counts her takings now. I've timed it. It takes too long. You didn't hear it from me.", "Shadows are longer. Easier to hide things in. I checked."],
        night: ["What are you doing out? Don't tell me. I'll find out. You didn't hear it from me.", "Night shift. I'm watching the store. The store is watching back."],
        rain: ["Rain. Good cover. Washes away the footprints. Whose? Exactly.", "Who decides where it rains? Follow the water. You didn't hear it from me.", "Every puddle reflects something. Have a think about that."],
        snow: ["Fresh snow. Now I can see everyone's tracks. There's a set that goes nowhere. You didn't hear it from me.", "It's so white. What are they hiding?"],
        sun: ["Lovely day. Too lovely. You didn't hear it from me."],
        wind: ["This wind blew a note to my door. It was blank. They're getting better. You didn't hear it from me."],
        spring: ["The Mayor's moving again. A bit too fast, if you ask me. You didn't hear it from me.", "Flowers. Every year, the same places. Coincidence? Yes, but keep an eye on it."],
        summer: ["The lanterns are coming. Nobody counts them back in. Think about it.", "Everyone's at the beach. Who's watching the bank? The Bean Jar's just a jar!"],
        autumn: ["Soup season. Who keeps the recipe? Follow the ladle. You didn't hear it from me.", "Leaves all over. Convenient for burying a ledger. I'm just saying."],
        winter: ["It gets dark so early. Almost like someone arranged it. You didn't hear it from me.", "Boxes. Everyone's getting boxes. I love boxes. I don't trust them."],
        absent: ["You vanished. So did a pie. I've drawn a line between them. You didn't hear it from me.", "You were gone for some time. Where? No, I know where. I just wanted to see if you'd lie."],
        hungry: ["Got any cheese? It's for research. I'm researching it with my mouth. You didn't hear it from me.", "I can't eat anything from the store. It's all on the ledger. I've seen the ledger. It's got my name in it."],
        giftLove: ["Cheese! You know what this means. Do you? I'll need more string. You didn't hear it from me.", "A box! Don't open it. I'll open it, in a safe place, when it's dark, in the box."],
        giftLike: ["Thanks. I'll have it checked. Nothing personal. You didn't hear it from me.", "I'll add this to the board. It connects to something. Everything does."],
        giftMeh: ["Who sent you with this? …All right, it can stay. In the back. Facing the wall.", "I've seen one of these before. Not like this, but I've seen one. You didn't hear it from me."],
        giftHate: ["This came from *her* shop. I can smell the ledger on it. I'll have to go and lie down. Dead. For a bit."],
        thanks: ["Good. You were never here. Here's your cut. You didn't hear it from me.", "Nicely done. Nobody suspects you. That's what worries me. You didn't hear it from me.", "Take this and go. Not that way. | Yes, that way, but look like you're not."],
        favour: ["I need someone they won't notice. No offence. Well, a bit of offence. You didn't hear it from me.", "A job. No questions. All right, one question: have you got pockets? Good."],
        letter: ["Anonymous tip:\nThe goose does not blink. You didn't hear it from me.\nBurn this.\nNot Ozzie", "Anonymous tip:\nStar-shaped cracks are not a coincidence. Dig.\nThis is not Ozzie", "Anonymous tip:\nThere's money in rocks on certain days. Hit them.\nThis was never Ozzie"],
        bonk: ["*falls over* | …Is it safe? I've been dead for a good minute. You didn't hear it from me."],
        chatter: ["I had a theory the Mayor isn't moving at all, and it's the plaza that's moving. I've had to let that one go.", "The bee and the capybara. Which one do you think is really in charge? You didn't hear it from me.", "Eight thousand beans. Why that number? Add up the digits. It's eight. *It's eight.*", "You know the bus? There's no road. I've walked it. It's trees. You didn't hear it from me.", "I played dead at a party once and nobody noticed for three hours. It was a very good party.", "Fitch isn't his real name. No one's is. I checked mine.", `Dorrit keeps too many pots. What's in them? "Soup". Oh, is it. Is it.`, "If anyone says I said this, I've got an alibi. It's a box. I was in it."]
      },
      auntie: {
        greet: ["Hon, I knitted you a thing. Not sure what it is yet. Give it time, hon.", "There you are, hon. You're looking thin. And tall. Well. Not tall. Sit down.", "Now you'll never guess, hon. No, go on. Guess. | You won't. It's about Dorrit's pots.", "Come here, hon. Is that a loose thread? I can see it from here. I can see them all.", "I heard you were up early, hon. And I heard why. And I know you think I didn't.", "Hon. Hon. I've been meaning to say. | I've forgotten. It'll come back, and it'll be about you.", "I don't like to gossip, hon. So I'll just say it quickly.", "You poor thing. I don't know what about yet, hon. But you poor thing.", "Hair like mine takes four hours, hon. That's why I know everything. It's all I can do while it dries."],
        morning: ["Morning, hon. I've been up knitting since the Mayor moved. So, not long.", "First one out, hon? People will talk. I'll see to it.", "You'll want a jumper on, hon. You'll want it. Don't tell me you won't."],
        noon: ["Lunchtime, hon. Who's eating with who? That's the real news.", "Middle of the day, hon, and I've already heard three things. One of them's true."],
        evening: ["Everyone's going in, hon. You can tell a lot from who's going in where.", "I do my best work around now, hon. Knitting, I mean. Partly."],
        night: ["What are you doing up, hon? I won't tell anyone. Well. I'll tell one person.", "Still up, hon? So am I. I'm not listening at Ozzie's window, it's just near where I am."],
        rain: ["You'll catch your death, hon. Here, have a hat. It's possibly a hat.", "Wool's good in the rain, hon. It holds on to it. Keeps it for later.", "Everyone's indoors, hon, so there's nothing to see, so I've got to go round and check."],
        snow: ["Snow, hon! Finally everyone will admit they need what I've made them.", "I've knitted a little something for the Old Pear, hon. It didn't ask."],
        sun: ["Nice day for sitting out, hon. And for seeing who walks past."],
        wind: ["Blowing a gale, hon, and I've still got every hair. Took a bit of glue, hon."],
        spring: ["Spring cleaning, hon. I do mine by going through everyone else's.", "New season, hon. Time to unravel everything and start again. Don't look at me like that."],
        summer: ["Too hot for wool, they say. I've seen the people who say that, hon. No sense.", "Lantern Float soon, hon. Everyone wishes for something. I'm the one who finds out what."],
        autumn: ["This is knitting weather, hon. As opposed to the other kind of knitting weather.", "Soup's coming, hon. Mark my words. I've seen Dorrit measuring the plaza."],
        winter: ["Told you, hon. Didn't I tell you? I did. It's cold. I told you.", "Long Night soon, hon. Everyone comes out in what I made them, or they'd better."],
        absent: ["Well, look who it is, hon! I told them you'd be back. And I told them why you left. I made something up, hon. It's very good.", "Hon, where have you *been*? No, tell me slowly. I want to get it right for later."],
        hungry: ["I could eat, hon. I could eat and listen. It's my best thing.", "I don't suppose you've got a pear on you, hon? They do say Bartleby doesn't eat them. Well. They do now."],
        giftLove: ["Wool! Oh, hon, you shouldn't have. Well, you should. And you did, and everyone's going to hear about it.", "Now that's what I call manners, hon. You can have the good thing I'm knitting. It's nearly a thing."],
        giftLike: ["Aren't you sweet, hon. I'll tell everyone. I'll tell them bigger.", "That's lovely, hon. I can do something with that, hon. Everything can be got round with a little wool."],
        giftMeh: ["Oh. Well. It's the thought, hon. I'm going to have a good long think about it, out loud, to people.", "That's nice, hon. I'll knit it a cosy. It looks cold. It looks like it could use a cosy."],
        giftHate: ["A secret? Somebody knew this was coming, and I didn't? Hon. Hon. I'm going to need a minute."],
        thanks: ["There we are, hon. I knew you'd do it. I told everyone you wouldn't, so it's a nice surprise for them.", "You're a good one, hon. Here. Don't unwrap it, it's holding itself together.", "Thanks, hon. I'll see that word gets round. Word always gets round. I'm the round."],
        favour: ["Do something for me, hon. It's nothing. It's only nothing if you do it, hon.", "Hon, you wouldn't mind. I know you wouldn't, because I told everyone you wouldn't."],
        letter: ["Hon,\nI heard you sold something you shouldn't have. Not cross. Just letting you know that I know.\nYolanda", "Hon,\nEnclosed is a thing. It's meant to go on you somewhere. You'll know where when it starts itching.\nYolanda", "Hon,\nDon't tell anyone I said this, but: everything. Tell them I said everything.\nYolanda"],
        bonk: ["Hon. A net. In front of everyone. I'm not cross. I'm knitting about it."],
        chatter: ["She says that scarf was hers, hon. It was *mine*. I know every stitch. I dropped several on purpose.", "Ottoline and me have been feuding for nine years, hon. Best friend I ever had. Don't tell her.", "Ozzie's string is mine, hon. He thinks he found it. I leave it out for him. It keeps him busy.", "I knitted a cover for the TV, hon. Then a cover for the cover. I can't see a thing, but I hear it's all gone downhill.", "Rocco's going to do something, hon. I can feel it. He's been looking at the road.", "I knew a yak once, hon, had hair so long she lost a nephew. Found him in the spring. Lovely boy.", "Mrs. Gander doesn't scare me, hon. I knit her a tea cosy every year. She bills me for the delivery.", "You didn't hear it from me, hon. That's Ozzie's line, and I gave it to him."]
      },
      hustler: {
        greet: ["Hey. Hey, friend. You look like you need a thing. No refunds.", "I got a deal for you. It's still in the box. So's everything. No refunds.", "Don't ask what I do. I do it, it's done, no refunds.", "Nice face. You want to sell it? I'd give you forty beans. No refunds.", "You're the one with the debt! Love that for you. Who's your guy? It's me, I'm your guy. No refunds.", "I moved in on a Tuesday, I'll move out on a Tuesday. Everything between is business. No refunds.", "Questions? No. Next. No refunds.", "See this box? Exactly. Now you want to know. Twelve beans. No refunds.", "Rocco left me the house. Well, I left me the house. It's complicated. No refunds."],
        morning: ["Early bird gets the worm. I sell the worm back. No refunds.", "Morning. Markets are open. What market? All of them. Mine. No refunds.", "I don't sleep. I unpack. I've been unpacking since I got here. No refunds."],
        noon: ["Lunch is a racket. I'm in on it. No refunds.", "Busy, busy. Doing what? No refunds."],
        evening: ["End of trading. Unofficially. I never close. No refunds.", "Evening. Good light for selling things. Hides the scratches. No refunds."],
        night: ["Night rates. Same as day rates, but you can't see them. No refunds.", "You come round here at night, you're buying or you're lost. Either way. No refunds."],
        rain: ["Umbrellas. I got umbrellas. They're mostly stick. No refunds.", "Rain's good for business. Everything's good for business. It's a sickness. No refunds.", "Wet boxes, half price. Wet money, full price. No refunds."],
        snow: ["I got snow. Pure, top quality. Yes, it's from outside. No refunds.", "Scarves. Don't tell the yak. No refunds."],
        sun: ["Sunny! I'm selling shade. It's over there. Pay me. No refunds."],
        wind: ["Wind's free. I'm looking into that. No refunds."],
        spring: ["Spring! I'm buying up seeds and telling people they're rare. They are now. No refunds.", "Fresh start. Fresh boxes. No refunds."],
        summer: ["Lantern futures. Don't ask. No refunds.", "Sun cream. It's mostly cream. No refunds."],
        autumn: ["Fall's my season. Everybody's got leaves, nobody's got a guy. I'm the leaf guy. No refunds.", "Soup's coming. I've got a bowl thing going. No refunds."],
        winter: ["Gifts! You need gifts! It's that time! What time? Buying time! No refunds.", "Coats. These are coats. Well, they're a coat. I cut it up. No refunds."],
        absent: ["You're back! Your absence cost me a sale. I'm billing you. No refunds.", "Friend! Long time! Things have gone up. All things. No refunds."],
        hungry: ["I'd eat, but that's money going out. Got anything I can resell? No refunds.", "A pear. For me? Or for me to flip? Doesn't matter. No refunds."],
        giftLove: ["Friend! I can get ten times this! From you! Later! Thanks! No refunds.", "Now this is business. This is what I'm talking about. Got more? No refunds."],
        giftLike: ["I'll take it. You're not getting it back. You know that, right? No refunds.", "Nice. Into the box it goes. Next. No refunds."],
        giftMeh: ["What's this worth? …I'll say it's worth more. No refunds.", "Sure. Fine. It'll sell to someone with less eyes. No refunds."],
        giftHate: ["A question? You've wrapped up a question? Get this out of here. No refunds."],
        thanks: ["Good doing business. Here's your cut. It's smaller than you thought. No refunds.", "Done and done. You want a receipt? Too bad. No refunds.", "Friend, you're all right. I'd put that in writing, but then it'd be binding. No refunds."],
        favour: ["Got a job. Simple job. It pays. Not a lot. No questions. No refunds.", "You got legs? You got pockets? You're hired. No refunds."],
        letter: ["Friend,\nYou won a prize! Send 40 beans to claim. Here is the prize, in advance, because the post is slow.\nFitch. No refunds.", "Friend,\nEnclosed: a sample. Keep it. It's already cost you something, you just don't know what.\nFitch", "Friend,\nThis letter is worth 100 beans. Pass it on. No refunds.\nFitch"],
        bonk: ["That's assault, friend. That'll be twenty beans. Or don't pay. I'll remember. No refunds."],
        chatter: ["Rocco's trophies? Left them all. I sold nine. He told me to. He didn't. No refunds.", "Mrs. Gander tried to buy me out. I tried to buy her out. We had a lovely afternoon. No refunds.", "I asked Clementine about a permit. She asked the bee. The bee said no. I'm appealing. No refunds.", "Ozzie thinks I'm not real. I sold him a box to check in. No refunds.", "Half these boxes are empty. I don't remember which half. That's the excitement. No refunds.", "What's in the big one? People ask that. What's in the big one. No refunds.", "Nobody asks where I came from. It's what I like about this place. Don't start. No refunds.", "I had a brother. I sold him a car. Lovely guy. No refunds."]
      }
    };
  }
});

// src/data/dialogue/unique.js
var UNIQUE, MEMORY_LINES, CHATS, GOSSIP;
var init_unique = __esm({
  "src/data/dialogue/unique.js"() {
    UNIQUE = {
      dorrit: [
        "I fed the Mayor once, mmhm. He was at the soup by the end of the week.",
        "Rocco's training Nib. I've seen it. I've started leaving a bun out, for after, mmhm.",
        "My mother was a wombat and her mother was a wombat and they both over-seasoned, mmhm.",
        "Everyone in this village has eaten from these pots. Nobody has ever been back to complain, mmhm.",
        "I don't measure. I just keep going until someone stops me, mmhm.",
        "The big pot's for the festival. The bigger pot's for me. Mmhm.",
        "Yolanda knitted me a ladle cosy. I don't know why a ladle would be cold, but it's stopped complaining, mmhm.",
        "I've got eleven pots on and one stove. Don't ask, mmhm.",
        "You know the Bell plays at the hour? I time the soup by it. Everything is a bit overdone in this village, mmhm.",
        "A wombat's pouch faces backwards, you know. You wouldn't believe what falls in, mmhm.",
        "Ozzie thinks there's something in the soup. There is. It's soup, mmhm.",
        "If you're ever sad, come round. I won't ask. I'll just hand you a spoon, mmhm."
      ],
      tavi: [
        "Everything in my house is yellow! I didn't plan it! I just kept saying yes, isn't it?!",
        "I've worked out how to wave with both hands! That's two waves! Bartleby's going to be so happy, isn't it?!",
        "Sometimes I smile so much my ears hurt, and I think, thanks, ears, isn't it?!",
        "A quokka's got thirty-two teeth and I've shown them all to everyone, isn't it?!",
        "Is it true some people aren't happy? Somebody should tell them about this, isn't it?!",
        "I told Mrs. Gander I'd pay her in compliments. She made a note of it, isn't it?!",
        "My favourite colour is yes, isn't it?!",
        "I took Bartleby a present! He said 'no' but he kept it! It was a very big no, isn't it?!",
        "I don't think I've got a bad side. I've looked. There's just more side, isn't it?!",
        "Dr. Quill says I've got a 'concerning level of joy'! That's so nice of him to notice, isn't it?!",
        "Ozzie's got a whole wall about me. He says that's not a compliment! It's so much string, though, isn't it?!",
        "Sometimes at night it gets very quiet, and I wave at that too. It's fine. It's fine, isn't it?"
      ],
      bartleby: [
        "That's my chair. There's one in the world, and it's that one, and you're looking at it.",
        "There's a sock on the left antler. It's been there since spring. I've named it nothing.",
        "I came here for the quiet. Then the village arrived. Took about a hundred years, but I saw it coming.",
        "A moose can hold its breath under water for a whole minute. I do it for the peace.",
        "If you've come to cheer me up, you can try. People have. There's a list.",
        "The Bell goes off every hour. Every hour. It's somebody's idea of a good time.",
        "She waves. I don't wave. That's the arrangement. It's the only arrangement I've ever kept.",
        "I'd rather you didn't know this, but I do like the bridge in the morning.",
        "Rocco's leaving, I hear. Good. | … | Good.",
        "Clementine doesn't ask how I am. It's why I post letters. I don't send them to anyone. It's why I go.",
        "I read a book once. Somebody died in it and everyone else carried on. I thought it was very well observed.",
        "The fishing's better when nobody's around. It's better still when you don't catch anything."
      ],
      ottoline: [
        "This is the Duke. He's a rug now. We were never closer, darling dear.",
        "A platypus has no stomach, darling dear. All that fuss about my figure, and it was nature.",
        "I could have married into the Otters. It would have ended in a river. Everything does, darling dear.",
        "The moths have been at the east wing. It's a cupboard. It's still the east wing, darling dear.",
        "I live in mud because I *choose* to, darling dear. Under protest. For the skin.",
        "I have a venomous spur on my heel, darling dear. It's mostly for parties.",
        "When I was a girl, this whole river was mine. It was a smaller river. I've let it go, darling dear.",
        "Madame Mothwick says she can't fix it, and that she's sorry, and that it was delicious. I've kept her on, darling dear.",
        "Do you know, I don't believe I've ever been asked what I actually want, darling dear. | Don't start now. Dreadful thought.",
        "Yolanda and I were at school together. She took the top bunk and everything after it, darling dear.",
        "Mrs. Gander bills me for the title. It's the only thing in this village that takes it seriously, darling dear.",
        "Nobody writes to me any more. Do be careful what you do with that, darling dear."
      ],
      rocco: [
        "I've rolled every road in this village! Twice! It's just… it's a small village! Let's roll!",
        "I built a gym in my house! It's the house! I took out the sofa! I took out the idea of a sofa! Let's roll!",
        "Armadillos can jump straight up when they're surprised! I've never been surprised! I'm ready! Let's roll!",
        "Trophy for Most Improved! Awarded by me! To me! From Tuesday! Let's roll!",
        "You know, there's a race in the Big City. People come from all over. Probably. Let's roll!",
        "Nib! Is doing great! Don't tell him! He's asleep! Let's roll!",
        "I told Bartleby he had a good neck! He said he'd prefer not! That's what winners say! Let's roll!",
        "When I roll fast enough, the whole village goes past and it's just a stripe! It's a very short stripe! Let's roll!",
        "You ever feel like you've got to the end of something? No! Me neither! Let's… yeah. Let's roll!",
        "I can't do stairs. It's not a fear! It's a policy! I'm very brave about it! Let's roll!",
        "Mrs. Gander asked for a 'small roll past the shop, for the advertising'! I've got a sponsor! Let's roll!",
        "Dorrit's soup's got nine grams of protein a bowl! I've had forty bowls! Do the maths! I can't! Let's roll!"
      ],
      nib: [
        "My room has more paper than floor. I'm told that's a hazard. So are stars, if you get close enough.",
        "I sleep in the day and I lie awake at night, and the only difference is what's looking at me, or so the moon says.",
        "Rocco came by at dawn. I think it was dawn. He made me hold a very small weight. I named it.",
        "I used to count stars. Then I lost count, so I named them instead. Then I forgot the names. It's going well.",
        "Lemurs have a special claw for scratching. I use it for underlining.",
        "They told me an alarm is a thing you can set on purpose. I had to go and lie down.",
        "I've written to the moon. She hasn't replied. It's a slow post, or so the moon says.",
        "My poems all end badly, but there's a nice part in the middle, if you hurry.",
        "If you sit very still on the Lookout bench, you can hear the sea from all the way up there, and then you can't, and that's the good part.",
        "I think Vesper knows something. She's seen the sky the right way up and the wrong way, or so the moon says.",
        "You're the only one who doesn't ask what I'm for. Thank you. Or you haven't got round to it.",
        "Do you think they'd miss me, in the Big City? They haven't met me. I'd like to keep it that way."
      ],
      ozzie: [
        "Corkboard's getting full. I've started a second corkboard. It's about the first one. You didn't hear it from me.",
        "A possum's got fifty teeth. Why does one animal need fifty teeth? Think about what that says about *them*.",
        "I don't play dead. I go off duty suddenly. You didn't hear it from me.",
        "Ask yourself why the store has no back door. I've checked. Twice. I've been round the back. It's just more store.",
        "Whose beans do you think are in that jar? The jar's? Hmm. *Hmm.*",
        "Inspector Pimm is a real person. Or a crab. I've seen the file. It's about me. You didn't hear it from me.",
        "Have you noticed the Mayor is never more than one day away from something? You didn't hear it from me.",
        "I got an anonymous tip. I sent it, but it's still valid.",
        "Trust no one. Except me. Actually, watch me as well. You didn't hear it from me.",
        "Lady Ottoline's 'Duke'? I've looked at that rug. It's two rugs.",
        "Eat something if you're worried. It's what Dorrit wants. You didn't hear it from me.",
        "I like you, you know. That's a problem. I'll have to add it to the board."
      ],
      yolanda: [
        "Everything in my house is knitted, hon. The TV, the door, the cat. There wasn't a cat. There is now.",
        "I'm not nosy, hon. I'm just very well informed about things that aren't my business.",
        "Ottoline's scarf. *My* scarf, hon. It's been nine years. I'd do it all again.",
        "My hair? It goes all the way down, hon. I've got a nephew under here somewhere.",
        "Fitch moves in, and nobody tells me? Hon. Hon, I found out when you did. *When you did.*",
        "If you'd like to keep a secret, hon, it's very simple. Tell me first.",
        "Nib's got no one looking after him, hon. So I've started leaving him hats.",
        "Bartleby's got a good heart, hon. I've heard it. I was standing very close to him at the time.",
        "Clementine's bee told me to mind my own business, hon. Well. I've told everyone what it said.",
        "Rocco leaving. *Rocco.* I knitted that boy a sweatband. It's got his name in it, hon. It's got everyone's name in it.",
        "You've got one of mine on, hon? Then you've got a friend. And you're itching. That's how you know.",
        "I saw what you did for that lemur, hon. I'll say nothing. I'll say nothing to everybody."
      ],
      fitch: [
        "Half-unpacked? Friend, it's a lifestyle. You never finish, you never owe. No refunds.",
        "This was a gym. Then I found the gym in a box. Now it's a box with a gym in it. No refunds.",
        "I knew a guy who knew a goose. It's why I'm here. It's why I'll leave. No refunds.",
        "A ferret sleeps eighteen hours a day. I sell the other six. No refunds.",
        "Nobody ever asks me a question and likes the answer. No refunds.",
        "Rocco? Never met him. Great guy. He's still got my deposit. No refunds.",
        "Mrs. Gander says this is a one-store town. I said, friend, it's a one-goose town. We're talking. No refunds.",
        "Sign here. It says you didn't sign. No refunds.",
        "You want to know what's in the big box? It's another box. Everyone stops there. No refunds.",
        "I've been run out of nine towns. Real nice towns. Good roads. No refunds.",
        "Yolanda knows my mother. I don't know how. I don't have one. No refunds.",
        "You're all right, friend. Don't tell anyone. It's bad for trade. No refunds."
      ]
    };
    MEMORY_LINES = {
      soldGift: ["Heard you sold the {item} {neighbour} gave you. To the goose. They're not mad. They're thinking about it.", "So. The {item}. {neighbour} gave you that. And now the goose has it. I'm not one to talk. I'll be talking.", "You sold the {item}? From {neighbour}? Well. I'm sure you needed the beans."],
      soldScarf: ["Heard you sold the scarf Yolanda knitted you. To the goose. She's not mad. She's knitting about it."],
      catch: ["I heard you caught a {catch}. Everyone heard. You were holding it over your head.", "A {catch}, was it? I've seen bigger. I haven't, but I've seen something.", "Word is you got a {catch}. It was a very quiet village until then."],
      bigCatch: ["A {catch}! You know that's worth more than this whole row of houses, don't you? Don't sell it to me. I mean it.", "You really caught a {catch}? It looks at you funny, I hear. I'd keep an eye on it."],
      bonk: ["You hit me with a net. I'm just saying I remember. I remember very well.", "I saw you with that net. You've got a certain look about you, with a net."],
      boot: ["Did you really keep that old boot? I've been thinking about it all day."],
      outfit: ["That's a new {item}, isn't it? It's… well, it's on you, isn't it.", "You're wearing the {item}. I had to look twice. Then a third time, for the others."],
      sting: ["Your eye! You look like a boiled potato with a grudge. It's an improvement, in some lights.", "Wasps, was it? Everybody could see it was wasps. Everybody is still looking."],
      sold: ["You've been at the store a lot. Mrs. Gander's started humming. Nobody knows what it means.", "I hear you've sold a good many {item}s. You should be careful. People notice who brings what."],
      plantedBeans: ["You *planted* beans? You can't do that. | Can you? Don't tell me. Tell me later."],
      wish: ["I saw you wish on a star up at the Lookout. I won't ask. I'll guess. Then I'll tell people."],
      gift: ["I heard you gave {neighbour} a {item}. Nobody gave me a {item}. I'm just saying it out loud, near you.", "You and {neighbour}, with the {item}. Lovely. People do notice these things."],
      letter: ["I got your letter. I keep it where I can see it. It's a lot of letter."],
      city: ["You've been to the City again. You smell of it. Is that hair product? Don't answer.", "Back from the Big City. Is it still big? I've never been. I've heard it's mostly up."],
      fashion: ["That flamingo gave you {item} plumes, I hear. I don't know what that means, and it seems very grand."],
      forgery: ["Dr. Quill looked very disappointed yesterday. Have you been buying paintings from someone in an alley?"],
      auction: ["You bought a {item} at an auction? From a mouse? In the *city*? I hope you got a receipt."],
      debtTier: ["New house, then! It's a very nice debt. Very roomy."],
      sawDance: ["I saw you do that little dance by the Pear. Nobody else did. Well, I told them."],
      weeds: ["You've been pulling weeds. I saw. The place looks better. Don't let it go to your head."],
      noWeeds: ["There's a lot of weeds about. I'm not saying whose fault it is. I'm just saying who's standing there."]
    };
    CHATS = [
      ["dorrit", "tavi", "Have you eaten, mmhm?", "I ate a whole sunbeam, isn't it?!"],
      ["tavi", "bartleby", "Hi Bartleby! Hi!", "I'd prefer not."],
      ["bartleby", "dorrit", "Is that for me?", "It's for everyone, mmhm."],
      ["ottoline", "yolanda", "Nice scarf, darling dear.", "It's yours, hon. I mean mine, hon."],
      ["yolanda", "ottoline", "I heard about your rug, hon.", "The Duke is *resting*."],
      ["rocco", "nib", "Come on! One more lap!", "I never did the first, or so the moon says."],
      ["nib", "rocco", "Do you ever look up?", "Only on the bench press! Let's roll!"],
      ["ozzie", "dorrit", "What's really in the pot?", "Tuesday, mmhm."],
      ["ozzie", "yolanda", "Who told you that?", "You did, hon. You will."],
      ["tavi", "ozzie", "You look so worried!", "Keep your voice down!"],
      ["fitch", "bartleby", "Friend! I got a chair for you.", "I have a chair."],
      ["fitch", "ozzie", "I got a box, it's very real.", "That's what a box would say."],
      ["dorrit", "rocco", "Have a bun, mmhm.", "How much protein?!"],
      ["nib", "tavi", "The stars are very far away.", "Hi stars! Hi!"],
      ["ottoline", "bartleby", "Carry this, darling dear.", "I'd prefer to be a different species."],
      ["yolanda", "tavi", "You'll want a jumper, hon.", "I love it! What is it?"],
      ["rocco", "bartleby", "Great neck! Let's roll!", "I'd prefer not."],
      ["tavi", "nib", "What are you looking at?", "The part where you stop."],
      ["ozzie", "nib", "What does the moon know?", "Less than she says."],
      ["fitch", "yolanda", "Scarves? Cheap?", "I know your mother, hon."]
    ];
    GOSSIP = [
      "Don't tell {neighbour} I said this, but they've been practising that walk.",
      "{neighbour} owes Dorrit a bowl. Everyone owes Dorrit a bowl. It's how the economy works.",
      "I heard {neighbour} looked at the Old Pear for a whole hour. The Pear's said nothing.",
      "They say Mrs. Gander has never once been surprised. They say she bills it in advance.",
      "{neighbour} has been asking about you. Not by name. By general shape.",
      "I saw {neighbour} at the bus stop with a suitcase. There was nothing in it. Then there was a shoe.",
      "I think {neighbour} might be Clementine's bee's favourite. It's not a thing to be taken lightly.",
      "Word is {neighbour} is in love. Or has a rash. I'd need to see it again.",
      "The Mayor moved a whole metre yesterday. {neighbour} watched. It's all anybody can talk about.",
      "{neighbour} went to the Big City once and came back with an opinion.",
      "You didn't see this, but {neighbour} sold a chair to someone who didn't need one.",
      "{neighbour} says the fish have been looking at them. I said that's what fish do.",
      "Dr. Quill has identified a stone as a nephew. {neighbour} is taking it hard.",
      "{neighbour} tried to pay off Mrs. Gander in poems. She's got a whole drawer. They're on the ledger.",
      "They do say the Lighthouse has nobody in it. {neighbour} waves at it anyway.",
      "I heard Hester drove past here twelve times this week, and only stopped when she felt like it. {neighbour} is writing to someone.",
      "{neighbour} has been humming the Bell tune. All of it. All the time.",
      "Somebody's been talking to {neighbour}'s plants. They've started talking back. Rudely.",
      "Flavia Rosé gave {neighbour} half a plume once. It's framed. Nobody's allowed to mention the other half.",
      "{neighbour} has a secret, and I've got it, and it's not very good.",
      "There's something behind the waterfall. {neighbour} says it's more waterfall.",
      "{neighbour} tripped over the same root three times and now they're friends.",
      "I hear Fleece the alpaca once cut {neighbour}'s hair and then wept. No one knows which part was the good part.",
      "Old Rind says a wheel of cheese once outran {neighbour}. It went off the same day.",
      "{neighbour} isn't speaking to the Bell. It was rude at about four o'clock.",
      "{neighbour} is growing a beard. Or a beard's growing {neighbour}. It's early days.",
      "They say if you look in the pond at dawn you can see a golden fish looking back at you, unimpressed. {neighbour} has stopped going.",
      "{neighbour} made a list of everything in the village that's overdue. You're on page one. Don't worry, it's alphabetical. It's not.",
      "I saw {neighbour} kick a pebble all the way home yesterday. They both looked pleased.",
      "Don't look now, but {neighbour}'s been wearing that hat to prove a point. Nobody knows what point.",
      "{neighbour} thinks the moon is following them. It is. It's following everyone. That's the thing with moons.",
      "The bean jar has been humming, and {neighbour} says it's the interest."
    ];
  }
});

// src/data/dialogue/hosts.js
var HOSTS, BALLAD, STREET;
var init_hosts = __esm({
  "src/data/dialogue/hosts.js"() {
    HOSTS = {
      gander: {
        greet: ["Good morning, dear. I've noted your arrival. It's on the ledger.", "You're late. No, you're exactly on time. I've already billed you for being late.", "HONK. Pardon me. That was my indoor voice.", "Ah. The debtor. How lovely. I do so enjoy these little check-ins.", "No rush on the payment, dear. I've simply noted the time you didn't pay, and I'll be noting it again tomorrow.", "Welcome back to the store. The floor's complimentary. The walking on it, we'll discuss.", "Look at you, still breathing in my village, dear. That's on the ledger as well.", "Do come in, dear. I've kept your page warm.", "I've had your name embossed. It'll be added to the bill."],
        pay: ["Thank you, dear. Every bean is a small step towards owing me something else.", "Paid and noted. Don't get ideas, dear. I've seen ideas. They're expensive.", "That's a lovely clink. I keep it in a special part of my heart. It's a ledger.", "How prompt. I'd thank you, but gratitude is billed separately."],
        cleared: ["Paid in full. I confess I had a small tear, dear. It was over the loss of revenue.", "Well. That's that. Do have a little look at the next tier. It's got a lovely big number on it, dear."],
        compliment: ["You've paid it all. Every last bean. It's… you're rather… | No. I've regretted that already. Here's your deed, dear. It's gold-edged. Get out."],
        sell: ["Let's see what you've dragged in, dear.", "Open your pockets. I'll quote as you browse. I've seen worse. Not recently.", "Ah. Your little treasures. How much do you imagine they're worth, dear? Don't. I'll do that part."],
        sold: ["Pleasure, dear. I'll be selling that on at a figure you wouldn't believe.", "There we are. Don't spend it all in one place. Spend it all here.", "Sold, and noted. Oh, how I do enjoy a transaction."],
        soldGift: ["Isn't this one a gift, dear? Well. I shan't tell a soul. I'll just write it down.", "Oh, a *handmade* one. I'll give you a little less, for the guilt."],
        buy: ["An excellent choice, dear. Or a choice, at any rate.", "That one's been waiting for you. It told me so. I billed it for storage.", "Into your pockets, dear. The pockets are also on loan."],
        noBeans: ["Dear. We both know what's in your pockets. I can hear it not jingling.", "Not quite enough, dear. Do come back when you've caught something."],
        full: ["Your pockets are full, dear. I can't sell you more pocket. Not yet."],
        closed: ["We're closed, dear. It's after hours. I'll be charging you for the knock."],
        idle: ["I've been running this store since before the river. It came in and asked for a line of credit.", "It's not that I don't sleep, dear. Sleep has been sent a very firm letter.", "Everyone in this village owes me something. Some of them don't know it yet. Some of them are the Mayor.", "Ozzie thinks I'm up to something, dear. I'm up to everything.", "I've never met a problem that couldn't be put on a payment plan.", "I knew your grandmother, dear. She still owes me for a teaspoon. It's been accruing. It's quite a teaspoon by now.", "Nobody's ever seen me eat, dear. Why would you think it's for free?", "You could always try my competitors. There's a lovely stretch of nothing, just past the bus stop."],
        hibernate: ["You mean to sleep clean through to the festival, dear? On *my* time? I'll just write down what it's costing me to watch.", "Hibernating, are we? Very well. I'll have the interest sit up with you, dear."],
        cheese: ["Is that one of that stoat's cheeses? I'll take it, dear. I'll take it at a price that'll make you think about what you've done.", "Cheese, is it? I knew I could smell someone's bad decision."],
        upgrade: ["A new extension! How we've grown, dear. Do mind the dust. It's on the bill.", "We're having some work done to the store. All your spending has really paid for itself, dear. For me."]
      },
      clementine: {
        greet: ["Hello. | I'm aware of you.", "Your letter's stamped. A bee has been living in the stamp drawer. We've agreed to share.", "Town Hall. Post. Bean Jar. Lost things. Bee. In that order.", "One moment. | I'm consulting. | She says hello.", "Good afternoon. It's a good afternoon whether it's afternoon or not. I've let it go.", "Nothing is urgent. I've looked into it.", "Take your time. I've got enough for both of us.", "The form says you were here yesterday. I'd have remembered, but I didn't want to."],
        bee: ["The bee says you're doing fine. She also says something about a cloud. I don't always follow.", "I asked the bee about you. She looked at me for quite a long time.", "We've been together nine years, the bee and I. Well. It's been several bees. We don't talk about that.", "Don't swat. She's got a union."],
        jar: ["The Bean Jar pays half a percent per season. We are very interested.", "Deposit, withdraw. It's a jar. It's very calm about all of this.", "Your beans are fine in there. They've made friends."],
        post: ["Writing to someone? Lovely. Mind the bee.", "It goes out at nine. It always goes out at nine. Whoever gets it, gets it at nine.", "A stamp's free, if you don't mind who's been sitting on it."],
        catalogue: ["Everything you've ever owned is in this book. It's a very honest book. Pick something, it comes by post.", "We keep a copy of everything. Not the things. The idea of them. And then the things."],
        rating: ["Your village is… fine. Too few flowers. The bee is unhappy with the weeds. I have no opinion. I do have a bee.", "I give this village a sentence: it's got some nice bits. Hint: more trees, around fifty."],
        chime: ["The Bell's yours to set, if you want. Everyone in the village will hear it, every hour, forever. No pressure.", "Compose something. Sixteen notes. The last person's went on for years. It was 'Hot Cross Buns' but sad. I shouldn't say."],
        idle: ["People shout at me sometimes. I find if you wait long enough, they get tired, and then it's lunch.", "I sit in warm water at the end of the day. Everything's the same temperature in there. It's very fair.", "The Mayor filed a form to cross the plaza, in the spring. Of a previous year.", "A capybara gets on with everyone. It's not kindness. It's a lack of energy for the alternative.", "Mrs. Gander sends me a little bill every year for the use of the word 'post'. I've filed them. They're very warm in the winter.", "I don't feel a need to be elsewhere. It's the secret to everything. Don't tell the bee, she thinks it's her."]
      },
      trundle: {
        greet: ["I declare this… ribbon… cut. Has anyone… seen… the ribbon? It was here… in March.", "Good… day. | Or… it was… when I started… saying that.", "Ah… a voter. | I'll be with you… shortly. | That's a joke. | It took… some time… to prepare.", "Don't get up. | I'm on… my way… to something.", "I've been… crossing… this plaza… since you were… hmm. | I don't know… how old you are. | I started… before.", "Do you know… how long… a term… of office… is? | Neither do I. I'm still… in the first one.", "I'm told… there's a new… person. | Hello… new person. | Are you… still… new?", "The sash… is ceremonial. | So is… most of the walking."],
        moving: ["The ribbon… is that way. | I can… feel it. | I'll be there… on the day.", "They say… a snail's pace… as if… it's a bad thing. | I've seen… everything… twice. | From up close.", "I've got… a speech. | I've been… writing it… as I go. | It's mostly… about the plaza."],
        arrived: ["And I declare this… | Where is it? | There was… a ribbon. | They took it… down. | Two years ago? | Well. | Well, well. | Well… I'll just… start back."],
        lend: ["You'll want… a shovel. | Here. | No, take it. | I've been… meaning to… dig something. | I can't… recall… what. | It'll keep."],
        sapling: ["Would you… water my sapling? | It's over… there. | I planted it… on my way… to here. | It's taller now… than when I… set off."]
      },
      quill: {
        greet: ["Welcome to the Museum! Is that you? It's a person! Or a very confident coat stand!", "Oh! Hello! Is it hello? It's so hard to see, and I've got the glasses on, I think these are the glasses!", "A visitor! I'll roll up in a moment. It's a thing that happens when I'm overjoyed. Don't take it personally!", "Is it a fossil? It's a fossil! Or a very confident potato! Either way, it goes in the hall!", "Careful, I've just waxed something. I don't know what. It's over there. Or it's you.", "Science! I've got it all down in here. I've got it all down on something. It might be the cat."],
        fossil: ["Is it a fossil? It's a fossil! Or a very confident potato! I've identified it as: ", "Hold it up. Closer. Closer. That's my face. Ah, now I see it! It's: "],
        donate: ["Oh! Oh, it's real! It's going in the hall! It's going in the hall right now!", "For the collection?! Excuse me. I'm going to roll about for a moment.", "It'll go up with your name on! I'll spell it right this time! I have never once done that!", "Wonderful! It's a fish! Is it a fish? It's a fish, or a very wet hat, and the hat's in the hat wing!", "I've wanted one of these for simply years. I think! What is it?"],
        already: ["We've got one of those. I think. I've got something that looks like that. It might be you.", "Ah! Another! But we have one already! Probably. Keep it. Sell it. Don't tell me."],
        forged: ["I… | Oh. | Oh, I see. | It's a very nice picture of a painting. | I'm not cross. I'm just going to look at this wall for a while.", "Forgery. It's a forgery. I know it is because the earring is wrong and my heart is broken. | Take it away, won't you?"],
        wing: ["It's full! The whole wing's full! There's a plaque! It has your name on it, spelled nearly! I'm going to roll!"],
        idle: ["All these fish, and every one of them looks a bit let down.", "If you press your face to the tank you can see them looking back. They can't see me either. We've come to an understanding.", "The Moatosaur! It ate a village, you know. Or was a village. I've got my notes mixed up.", "Mother always said I should have been a real doctor. I said, of what? She didn't know either.", "I keep the moths away from the art, and the art away from Madame Mothwick. It's the same job, really."]
      },
      mothwick: {
        greet: ["Ah! A customer! Darling! Close the door. The light. The light! I can't be expected to resist it.", "You come to me at a very difficult time. It's been a difficult time since Tuesday, when I was born.", "Everything I make, I make with my heart. And then I eat some of it. I'm sorry. I'm so nervous.", "Do come in. Mind the hems. I've had a bad day with the hems.", "Look at you! No. Don't look. I'll look. I'm better at it.", "This shop is my whole life. It's going to be quite short. Do you want the blue?"],
        buy: ["Oh, you'll be devastating in it. Not to anyone else. To me. I'll be devastated.", "It's yours. There was more of it this morning. I'm so sorry.", "Wear it in good health. It may not last. Neither will we. Neither will we!"],
        pattern: ["You want to make your own? Oh! *Oh.* I've gone quite faint. Yes. Sit. Sixteen by sixteen. Make me cry.", "Draw on this. Every little square is a little death. Or a pattern. I can't always tell."],
        idle: ["I was a caterpillar once. So much promise. So many feet. Well.", "I chew when I'm nervous. It's all right. It's only the good wool. I've got so few joys.", "The lamp in the corner. I know what it is. I know what it does to me. I've kept it on anyway.", "They say moths live for a week. I've got a very full calendar.", "Lady Ottoline's whole wardrobe has been through me. Literally. She knows. She sends it round."]
      },
      rind: {
        greet: ["Psst. Wheel of cheese? It only goes up. Mostly. Until it goes off.", "Over here. Quiet. The goose can smell it from the store, but she can't prove anything.", "You look like someone who understands an investment. You don't. But you look it.", "It's a very simple market. You buy it, you wait, you pray, and you sell it to a goose.", "Every wheel's different. Same cheese. Different feelings about it."],
        buy: ["Good. Good, good. Don't keep it near anything you love.", "That's a wheel of pure potential. It's mostly smell now, but that's how it starts.", "No receipts. There's never been a receipt. Where would you even put one?"],
        closed: ["Noon's come. Cheese is a morning game. Go on.", "Not today. Come back on Market Day. Morning. Bring beans. Don't bring friends."],
        warn: ["It'll go off by next Market Day. All of them do. It's the one promise I've kept.", "Prices on the board. Twice a day. Don't ask me why it's going up. Don't ask me why it's not."],
        idle: ["I've made and lost nine fortunes in cheese. I'm on the tenth. It's in my coat.", "A stoat can get through a very small hole. Bear that in mind, regarding the cheese.", "Some say it's a scam. It's not a scam. A scam would make sense.", "There's a wheel out there I've been holding for eleven years. It's not for sale. It wouldn't let me."]
      },
      vesper: {
        greet: ["Sit anywhere, friend. I'd offer you a chair, but I'm using the ceiling.", "Evening. Everything sounds better from up here. That's how the notes fall out.", "You want a song? Tell me how you're doing, and I'll play you something worse.", "It's a tiny accordion. It's the only size they fit, when you're hanging. Don't ask how I found out.", "Hello down there. Or up there. It really depends on you."],
        ask: ["What'll it be tonight, friend?", "Pick a mood. I've got six. They're all the same one, really."],
        give: ["Here. Take the record. I press them myself, with my feet. Stereo's yours to deal with.", "You can have that. I've got it in my head. It's all gone to my head, up here."],
        idle: ["Most things look better upside down. You'd be surprised. Debt, for one.", "I played the big rooms in the City, once. Hung from all the nicest chandeliers.", "Every bat you've ever met is a good listener. It's sort of the whole thing.", "I'm back Show Day. Hang around. Well. Stand around."]
      },
      hester: {
        greet: ["End of the line? Nobody gets off there on purpose.", "Hop on. It's free, if you like my singing. It's not free otherwise. It's still free.", "Where to? I only drive the one way, and then the other way.", "Mind the step. There isn't a step. Mind it anyway.", "You look like someone who owes money.", "Off to the Big City? Bring a sandwich. Don't bring your troubles. They've got plenty.", "I've been driving this bus forty years and I've been asked for the same stop every time, and I've never once got it right."],
        idle: ["Bus doesn't run on a timetable. It runs on feelings. That's why it's late.", "I sing so you won't talk. It's nothing personal. Talk is what makes the wheels fall off.", "Llamas spit. I don't. I'm just saying I've had the training."]
      },
      fleece: {
        greet: ["Ah! Mon dieu. Sit, sit! What has happened to you up there? Who did this? Was it you?", "Monsieur! Madame! Whichever! Your hair, it speaks to me, and it is begging.", "Sit in the chair, and tell me nothing. I shall tell you everything. It is how we do it.", "Welcome to Snip and Gossip. You are here for the snip. Everyone stays for the other.", "A good haircut is like a good secret. It will not grow back the same."],
        gossip: ["I cut the hair of the Maison Plume, you know. She has no hair. We simply sit and hate people.", "Hester the driver? She has been growing that fringe for nine years. There is a reason. It is not a good reason.", "They say Madame Mothwick ate the theatre curtains. They say she ate them during the second act.", "That dormouse at the auction? Talks like that all the time. I have heard him at home. I have heard him *asleep*.", "Your goose, I've heard. She came to the City once. They've changed the locks.", "Agent Brisket lives in a very nice home. Scores zero. He has told nobody. I'm telling you.", "That magpie in the alley? Used to have a real shop. Then the shop had a real magpie. There were questions.", "Languid Lou once said a whole sentence. They put up a statue. Lou is still looking at it."],
        done: ["Voilà! It is you, but with a future.", "There. Now you may go out. Go on. They'll talk. That's the point of it.", "Magnifique. I have outdone myself. And you, a little."],
        idle: ["Hair is all we have, in the end. Hair, and what people say about the hair.", "I have never cut my own. Who would I trust?", "Some people say an alpaca shouldn't run a salon. They say it to me while I am holding scissors."]
      },
      flavia: {
        greet: ["Darling. Stand in better lighting. No. Further. Keep going.", "Velvet rope. Yes. It's for you. Specifically.", "We're closed. We're always closed. It's why we're open. Oh, don't make me explain fashion to you.", "You may look. You may not touch. You may not, in fact, look as much as you are.", "Hmm. | Hmm. | No. | Hmm.", "I stood on one leg for six hours once for a photograph. And that was just to be polite."],
        judge: ["Today's theme. Do try to keep up.", "Turn. No. The other turn. Your outfit is about to have a very bad time."],
        result0: ["Zero. Not even an insult. You're wearing a question nobody asked."],
        result1: ["One plume. For bravery. Mostly for the people around you."],
        result2: ["Two plumes. The sort of two that thinks it's three."],
        result3: ["Three plumes. Don't let it go to your head. Nothing has yet."],
        result4: ["Four plumes. My feathers moved. Slightly. It could have been a draft."],
        result5: ["Five plumes. Darling. *Darling.* You may touch the rope."],
        idle: ["People ask how I stay this colour. I eat what I want and I judge what I don't.", "Couture isn't for wearing. It's for being *seen not to be wearing*.", "I started in a pond, darling. So did everyone. I just don't bring it up."],
        rope: ["The couture rail. You've earned it, briefly. Don't breathe on anything."]
      },
      magda: {
        greet: ["One hundred percent genuine, and only forty percent stolen.", "Shh. Don't look at the door. It's a very shy door.", "Come in. Pick one. Don't ask me where it's from. I keep it from the police and I'll keep it from you.", "You've got a good eye. Or you've got two eyes. Either way, come in.", "Every painting here has a story. Two of them have an alibi.", "Shiny thing. On your coat. | No, nothing. Just saying."],
        sell: ["That one? Lovely piece. Compare it to your catalogue print, if you must. Everyone must. Nobody's ever liked what they found.", "Premium price. For the premium risk. Yours."],
        sold: ["Pleasure. If the museum asks, you found it. If I ask, you never knew me.", "It's yours. Whatever it is. Don't hang it in a good light."],
        rare: ["This one's not art. It's furniture. It fell off a wagon. Slowly. In several trips."],
        idle: ["A magpie doesn't steal. A magpie *reassigns*.", "I had a mirror once. Real silver. I sold it to myself. I got a very good price.", "Dr. Quill's bought from me four times. He cries. He comes back. He's a real collector."]
      },
      bellows: {
        greet: ["Welcome, welcome, to the Palace! Mind the fourth wall. It's in poor repair.", "Ah! An audience! I've been projecting at an empty house since eleven!", "Sit! Sit, and be moved! I shall do the moving. You just hold on.", "A hippo can be very light on his feet, in the right lighting, with a good director. I'm told.", "I gave my Hamlet at the Lyric. They've asked for it back."],
        sketch: ["Tonight's little entertainment. Do try to laugh at the end. It's traditional.", "I play all the parts. I've tried it the other way. People were very unkind about it."],
        win: ["You laughed! At the right moment! I've had critics who couldn't manage that! Here, take this bit of business. It's a gesture. Use it wisely.", "Oh, you've got timing, you have. Have this. It's all I've got that's mine."],
        miss: ["Not quite. You laughed at the bit where I died. It's all right. So did Leeds.", "Hm. Early. Everyone's a critic. Come back tomorrow. I'll be just as good. I'll be exactly as good."],
        idle: ["There are no small parts. There's only small hippos, and I've never met one.", "I've been resting since the spring. It's what we call it. It's mostly lying down."]
      },
      pemberton: {
        greet: ["Welcome-welcome-welcome to Pemberton's I'm Pemberton it's my name on the door sit down take a paddle raise it if you want it don't if you don't!", "Lots-today-three-lots-very-nice-lots-going-going-gone-you-missed-it-just-kidding-hello!", "Sorry-did-I-say-that-too-fast-I-can-do-it-slower-I-can't!", "Ten-to-six-ten-to-six-every-day-it's-a-very-nice-room-it's-mostly-me!", "Have-you-got-something-to-consign-put-it-in-the-box-sign-nothing-the-post-will-tell-you!"],
        going: ["Going once!", "Going twice!", "Going… going…", "Do I hear more?!", "A new bid at the back!", "Oh you're serious!"],
        sold: ["Sold! To the small round person! Pay the goose! Pay me! I forget who you pay! Pay me!", "SOLD! I love this job! I've got a heart condition! SOLD!"],
        lost: ["Sold-to-the-newt-in-the-good-hat-bad-luck-next-lot-next-lot!", "Gone! To the weasel! He doesn't even want it! Next!"],
        idle: ["Sleep-is-a-rumour-started-by-dormice-who-lacked-commitment!"]
      },
      brisket: {
        greet: ["Agent Brisket. Better Burrows Bureau. We've had our eye on your home. It's nothing personal. It's everything personal.", "Too many chairs. Who are you expecting?", "I've seen your home. I've seen what you did to that corner. We have a file on the corner.", "The Bureau scores on Show Day nights. Don't try to stop us. We have a key. We don't, but we get in.", "Points for value. Points for sets of four. Harmony. Cosy rules: a lamp by a seat, a rug under a table, something growing. Music playing. Clutter costs you."],
        critique: ["Too many chairs. Who are you expecting?", "I can't fault your lamp. I've tried. I'll try again.", "You've got a nice rug. It's the only thing here I'd rescue.", "It's not a home, it's a storage problem with a door.", "It has a certain… who told you to put that there?", "Very nearly a room. Keep at it.", "That's the most sets I've seen in one place. I'm not sure that's a compliment.", "Is that what you wanted? Think about that. I'll wait.", "Something's growing in here. Good. Check it's the plant."],
        reward: ["Your grade's gone up. Here's a plaque. The Bureau doesn't do warmth, but it does do plaques.", "New grade, new plaque. Hang it. We'll know if you don't."],
        idle: ["I've got a burrow in the country. Nobody's ever seen it. It's perfect. That's why.", "A badger keeps a clean sett. It's where I get it. It's where I get the anger."]
      },
      lou: {
        greet: ["…", "…hey.", "…coffee?", "…you… again… good.", "…mm."],
        hint: ["…river… night… slippery.", "…pond… dawn… gold.", "…trunks… dark… horns.", "…sea… late… moon.", "…rocks… rain… slow.", "…flowers… summer… fancy.", "…mouth… cold… old.", "…lamps… night… purpose."],
        serve: ["…enjoy.", "…careful… hot… eventually.", "…mm… good… choice."],
        idle: ["…"]
      },
      nibbles: {
        greet: ["Sit, sit. I can see your future. It's on this card. Hold on. | (chew) | Well, I can see *some* of your future.", "Cross my palm with beans. No, I don't know why. It's traditional. Then I'll eat the card.", "The cards know all. They taste of it, too.", "I had a very good reading planned for you, but I had a light breakfast."],
        fortunes: [
          { text: "I see a tall stranger. He's holding… (chew) …that part's gone now. Good luck, though.", luck: "friend" },
          { text: "A great catch awaits you, near the… (chew) …well, near something wet. Probably.", luck: "fish" },
          { text: "You'll find something buried. It's under the… (chew) …it's definitely under something.", luck: "find" },
          { text: "Beware of the… (chew) …no, it's gone. Beware in general. You'll be fine.", luck: "none" },
          { text: "Someone close to you is about to… (chew) …oh, that's very nice. That's lovely. Good for them.", luck: "friend" },
          { text: "The stars say your fish will… (chew) …more fish. Definitely more fish.", luck: "fish" },
          { text: "A dark and handsome… (chew) …is that a boot? It says boot. It tastes like boot.", luck: "fish" },
          { text: "Money will come to you from… (chew) …the ground, I think. It's a very earthy card.", luck: "find" }
        ],
        idle: ["Tarot's got a lot of fibre. It's the only reason I got into the business.", "I saw this conversation coming. I also ate it."]
      },
      pimm: {
        first: ["Pimm. Department of Continuity. You left. No bed. No goodbye. Do you know what that does to a Tuesday?", "We keep the days in order. It's a filing matter. When you walk out without going to bed, I have to go and find the end of your day and bring it in by hand.", "It was on the beach. It was soggy. I've put it in the cabinet. | I live in the cabinet. | It's very crowded now.", "Sleep in a bed. Or Save and Quit. Those are the forms. It's not much to ask. | Nothing was lost. You're welcome. I'm going to go and stare at something."],
        second: ["Pimm. Again. You left. Again. The whole of last night's still out there on the road. I've had to drive it in.", "Do you think a morning just turns up? Someone's got to sign for it. Me. It's me. I sign for them.", "I've got a file on you now. I had to buy a drawer. I had to *grow* a drawer. Do you know how a hermit crab gets a drawer?", "It's fine. Nothing's lost. Nothing is ever lost. That's the awful part. It all has to go somewhere."],
        third: ["Pimm. I'm not angry. I want that in the record. I'm writing it down now. It says 'not angry'. The pen has gone through the paper.", "Fourteen years, I've been doing this. I had a family. They were whelks. They were very understanding.", "One day you'll walk out and not come back, and I'll be stood in that doorway with a whole Wednesday in my arms, and nobody to give it to.", "Use the bed. Please. It's right there."],
        last: ["Pimm. | … | I've closed your file. It's not that you've stopped. It's that I've stopped. | Leave however you like. | I'll keep your days dry. | Goodnight, {player}."]
      },
      rocco_special: {},
      gran: {
        letters: [
          "Dear {player},\nI hear you've moved to the end of a bus line. I'm sure there's a reason. Your cousin has a nice job. Here's a fruit. It's from a tree you wouldn't know.\nGran",
          "Dear {player},\nIt's summer. I assume it's summer there too. You didn't write. Well, you wrote once. Here's something for your house, if it has a house's dimensions.\nGran",
          "Dear {player},\nThe leaves have turned. I'm told that's nice. I've told the doctor it's not. Do you still owe that goose? Eat something.\nGran",
          "Dear {player},\nIt's cold, and I've only got your letters to burn, so don't worry, I'm using them sparingly. Are you warm? I've enclosed what I had.\nGran"
        ],
        replies: { short: "Dear {player},\nThat was short. I've had longer notes from the milkman, and he's dead.\nGran", long: "Dear {player},\nThat's a lot of words. I read most of them. You always did go on. I've stuck it on the fridge, to annoy your cousin.\nGran", mid: "Dear {player},\nGot your letter. Your handwriting is what I'd expect. I've kept it in case of tax.\nGran", gibberish: "Dear {player},\nYou wrote '{text}'. I've framed it. I don't know what you're trying to say and I'm very proud.\nGran" }
      }
    };
    BALLAD = {
      // Hester's verses: filled in from memory events. Each is four lines, sung with subtitles.
      catch: ["♪ Oh, you fished up a {catch} and you sold it for {beans},", "♪ and it wasn't the worst of the things that you've seen,", "♪ and you'd do it, you'd do it, you'd do it again,", "♪ for a bean is a bean, and a boot is a friend. ♪"],
      boot: ["♪ Oh, you fished up an old boot and you sold it for ten,", "♪ and you'd do it, you'd do it, you'd do it again,", "♪ for the goose takes the boot and she gives you the coin,", "♪ and the sea keeps the rest of the shoes you could join. ♪"],
      debt: ["♪ You owe {debt} beans to a goose in a vest,", "♪ and she writes it all down and she won't let it rest,", "♪ and you wave as you go and you wave as you're back,", "♪ she has noted the wave, and it's on your account, jack. ♪"],
      gift: ["♪ You gave {neighbour} a {item}, it was good of you, friend,", "♪ they will tell all the others, and this is the end,", "♪ of a nice quiet life where you didn't get seen,", "♪ now you're someone who's giving, and that's rather keen. ♪"],
      bonk: ["♪ You hit {neighbour} once with a butterfly net,", "♪ and they haven't forgiven, and they won't forget,", "♪ and they swing past your house with a curious stare,", "♪ with a butterfly net, they've gone out and got a pair. ♪"],
      rain: ["♪ It was raining the day that you first walked to town,", "♪ and it's raining again, and your hair's coming down,", "♪ and the wipers go swish and the bus goes along,", "♪ and I'm singing this verse, and I've got the words wrong. ♪"],
      mayor: ["♪ Oh the Mayor's on his way, he has been for an age,", "♪ he is crossing the plaza, he's on his last page,", "♪ and the ribbon's long gone, but he doesn't know that,", "♪ so don't tell him, my darling, just tip him your hat. ♪"],
      home: ["♪ You have built you a house and it's bigger than last,", "♪ and the goose says the next one is going up fast,", "♪ and you'll never get clear of the number she wrote,", "♪ but you've got a nice sofa, you've got a nice coat. ♪"],
      friend: ["♪ There's a friend down the lane by the name of {neighbour},", "♪ it's been nice, it's been odd, you are glad that you came, ah,", "♪ and they don't say a lot, but they save you a chair,", "♪ and it's more than you'd get if you hadn't been there. ♪"],
      rocco: ["♪ Oh a boy rolled away with his trophies in tow,", "♪ and you stood at the stop, and you watched the boy go,", "♪ and the road's rather quiet, the gym's full of box,", "♪ and there's nobody now to go rolling the rocks. ♪"],
      city: ["♪ Oh the lights of the City are calling your name,", "♪ and they'll charge you for that, and they'll charge you the same,", "♪ but you'll sit on my bus and you'll look at the rain,", "♪ then you'll do the whole trip, and you'll do it again. ♪"],
      lonely: ["♪ There's a seat on this bus and it's been empty all year,", "♪ and I've sung to that seat, and it's all you can hear,", "♪ so I'm glad that you're here, and I'm glad that you owe,", "♪ if you didn't, you'd have nowhere you'd have to go. ♪"],
      fish: ["♪ There's a fish in the pond with a look on its face,", "♪ and it knows that you've seen it, it knows it's your place,", "♪ and you'll cast and you'll wait and you'll curse it by name,", "♪ and the fish will go home and it won't be the same. ♪"],
      home2: ["♪ Oh I drove you here once on a night of no moon,", "♪ you were lost, you were wet, and you sang out of tune,", "♪ you'd your hands in your pockets, your debt in your hand,", "♪ you got off at the end, and you started to stand. ♪"],
      weather: ["♪ It was {season} when I picked you up down by the bay,", "♪ and it's {season} again, and I'm heading your way,", "♪ and I'll stop if you wave, and I'll stop if you don't,", "♪ and I'll sing if you ask me, and if not, then I won't. ♪"],
      store: ["♪ Oh she sells you a chair and she buys back a fish,", "♪ and she gives you a little, as much as she'd wish,", "♪ and the shelves are all full, and your pockets are bare,", "♪ and she knows what you've got, 'cause she put it all there. ♪"],
      letter: ["♪ You wrote to your gran and you told her the lot,", "♪ you said 'all is well', and she knows it is not,", "♪ and she'll write you right back, and she'll send you a pear,", "♪ she's the only one left who still seems to care. ♪"],
      wish: ["♪ You sat on the bench and you looked at the sky,", "♪ and a star fell on someone and nobody knows why,", "♪ and you wished for a thing, and you won't say a word,", "♪ and it came in the post, which was rather absurd. ♪"],
      fashion: ["♪ There's a bird in the City who looks at your clothes,", "♪ and she looks down her beak, it goes on, how it goes,", "♪ and she gave you a plume, or she gave you a sigh,", "♪ and you rode home in silence, the plume and I. ♪"],
      chorus: ["♪ Oh the bus goes along, and the bus goes along,", "♪ and the road's getting short, and I'm not getting long,", "♪ you can get off at last, you can stay if you please,", "♪ I've got nothing to do, but I'm good with the keys. ♪"]
    };
    STREET = ["Is it Thursday?", "Have you seen my brother?", "Not at these prices.", "I told her. I said.", "Two for one, it said!", "What a lovely hat!", "He's not even a real newt.", "We should go to the theatre.", "I'm late. I'm always late.", "Nobody walks any more.", "Excuse me. Excuse me!", "Is that the bus?", "I used to live out there.", "It's so *big*.", "It's all gone downhill.", "This is my good coat.", "Look at the neon!", "Have you been to Pemberton's?", "Madame Nibbles ate my future.", "The fish was off."];
  }
});

// src/data/neighbours.js
var NEIGHBOURS, NEIGHBOUR_ORDER, POIS, FAVOURS;
var init_neighbours = __esm({
  "src/data/neighbours.js"() {
    NEIGHBOURS = {
      dorrit: { name: "Dorrit", species: "wombat", type: "hearth", tic: "mmhm", building: "dorrit", wake: 6, sleep: 21, loves: ["soupy", "mushroom", "fish", "fruit", "kitchen"], hates: ["loud"], room: { wall: "wall-cream", floor: "floor-kitchen", style: "kitchen" } },
      tavi: { name: "Tavi", species: "quokka", type: "sunshine", tic: "isn't it?!", building: "tavi", wake: 6, sleep: 22, loves: ["loud", "fruit", "flower", "toy", "plain", "leafy"], hates: [], room: { wall: "wall-cheese", floor: "floor-sandy", style: "yellow" } },
      bartleby: { name: "Bartleby", species: "moose", type: "grouch", tic: "I'd prefer not.", building: "bartleby", wake: 7, sleep: 22, loves: ["sapling", "drab", "plain", "oddity", "plant"], hates: ["loud", "dramatic", "toy"], room: { wall: "wall-stone", floor: "floor-ash", style: "bare" } },
      ottoline: { name: "Lady Ottoline", short: "Ottoline", species: "platypus", type: "diva", tic: "darling dear", building: "ottoline", wake: 10, sleep: 23, loves: ["dramatic", "formal", "couture", "art", "shell", "money"], hates: ["damp", "drab", "practical"], room: { wall: "wall-regal", floor: "floor-carpet-red", style: "faded" } },
      rocco: { name: "Rocco", species: "armadillo", type: "goGetter", tic: "let's roll!", building: "rocco", wake: 5, sleep: 21, loves: ["fish", "sporty", "trophy", "bug"], hates: ["sleepy", "cosy"], room: { wall: "wall-brick", floor: "floor-gym", style: "gym" } },
      nib: { name: "Nib", species: "lemur", type: "dreamer", tic: "…or so the moon says", building: "nib", wake: 11, sleep: 28, loves: ["bug", "sleepy", "oddity", "star"], hates: ["electronics", "clock", "sporty"], room: { wall: "wall-night", floor: "floor-ash", style: "books" } },
      ozzie: { name: "Ozzie", species: "possum", type: "schemer", tic: "You didn't hear it from me.", building: "ozzie", wake: 7, sleep: 24, loves: ["cheese", "clutter", "gift", "gross", "oddity"], hates: ["money", "formal"], room: { wall: "wall-mud", floor: "floor-oak", style: "corkboard" } },
      yolanda: { name: "Yolanda", species: "yak", type: "auntie", tic: "hon", building: "yolanda", wake: 6, sleep: 22, loves: ["wool", "cosy", "flower", "fruit"], hates: ["dramatic"], room: { wall: "wall-knit", floor: "floor-carpet-red", style: "knitted" } },
      fitch: { name: "Fitch", species: "ferret", type: "hustler", tic: "no refunds", building: "rocco", wake: 7, sleep: 25, loves: ["art", "money", "oddity", "cheese"], hates: ["plain", "drab"], room: { wall: "wall-plaster", floor: "floor-oak", style: "boxes" }, movesIn: 9 }
    };
    NEIGHBOUR_ORDER = ["dorrit", "tavi", "bartleby", "ottoline", "rocco", "nib", "ozzie", "yolanda", "fitch"];
    POIS = [
      { id: "benchW", x: 20.5, z: 46.4, kind: "sit", face: Math.PI },
      { id: "benchE", x: 27.5, z: 46.4, kind: "sit", face: Math.PI },
      { id: "plazaN", x: 21, z: 35, kind: "stand" },
      { id: "plazaS", x: 25, z: 44.5, kind: "stand" },
      { id: "plazaE", x: 30, z: 39, kind: "stand" },
      { id: "bellSide", x: 18, z: 42, kind: "stand" },
      { id: "pearSide", x: 26, z: 38.5, kind: "stare" },
      { id: "riverN", x: 37, z: 22, kind: "fish" },
      { id: "riverE", x: 46.5, z: 30, kind: "fish" },
      { id: "pondSide", x: 39.5, z: 43, kind: "fish" },
      { id: "dockEnd", x: 24, z: 60, kind: "fish" },
      { id: "store", x: 54, z: 40.5, kind: "stand" },
      { id: "museum", x: 22, z: 11.5, kind: "stare" },
      { id: "hall", x: 10, z: 41.5, kind: "stand" },
      { id: "lookoutPath", x: 66, z: 9.5, kind: "stare" },
      { id: "beachW", x: 15, z: 54, kind: "stare" },
      { id: "beachE", x: 60, z: 55, kind: "stare" },
      { id: "orchard", x: 53, z: 10.5, kind: "stare" },
      { id: "mossy", x: 68, z: 29, kind: "stare" },
      { id: "doorDorrit", x: 17.5, z: 25.5, kind: "stand" },
      { id: "doorBart", x: 51.5, z: 24.5, kind: "stand" },
      { id: "doorOzzie", x: 65.5, z: 47.5, kind: "stand" },
      { id: "doorYolanda", x: 74.5, z: 47.5, kind: "stand" }
    ];
    FAVOURS = [
      { kind: "fetch", item: "pear", ask: "I could really do with a pear. A proper one. Shake something.", done: "A pear! That's the good stuff." },
      { kind: "fetch", item: "weed", ask: "I need a weed. Don't ask. It's for a thing. Any weed.", done: "That's a good weed. It really is. Thank you." },
      { kind: "fetch", item: "shellCommon", ask: "Bring me a shell from the beach? Any old one. I just want to hold something from the sea.", done: "Oh, that's the sea all right.", anyCat: "shell" },
      { kind: "fetch", item: "flower", ask: "I want a flower for the table. Don't tell me which. Surprise me.", done: "A flower! It'll be dead by Thursday. It's the thought.", anyCat: "flower" },
      { kind: "fetch", item: "fish", ask: "Fetch me a fish, would you? Any fish. I've a very specific plan that doesn't depend on which.", done: "That's a fish, all right. No need to tell me where it's been.", anyCat: "fish" },
      { kind: "fetch", item: "bug", ask: "Bring me a bug. It's for company.", done: "Hello, little one. Oh, you're going to be such a disappointment.", anyCat: "bug" },
      { kind: "fetch", item: "mushroom", ask: "I'm out of mushrooms. Have a look in the woods. Careful of the ones that look back.", done: "Lovely. It's still looking at me. Lovely.", seasons: [2] },
      { kind: "catch", item: "perch", cat: "fish", mins: 60, ask: "Catch me a fish within the hour. Doesn't matter what. I've got a pan on.", done: "Still flapping! That's how I like it.", anyCat: "fish" },
      { kind: "catch", item: "bug", cat: "bug", mins: 60, ask: "I bet you can't catch me a bug in an hour. It's a small bet. It's just me, and I've already lost.", done: "Ha! Well, I owe me a pie.", anyCat: "bug" },
      { kind: "deliver", ask: "Run this parcel over to {target}, would you? Don't shake it. Don't sniff it either.", done: "Oh, is that from them? Thank you. I won't open it in front of you." },
      { kind: "deliver", ask: "This is for {target}. If they ask who it's from, I'm out.", done: "For me? Hm. I know who that's from. I'll be having words." },
      { kind: "deliver", ask: "Take this round to {target}. It's only an apology. It's quite heavy.", done: "An apology! I'll put it with the others." },
      { kind: "deliver", ask: "Do me a kindness and carry this to {target}. Tell them it's not what it looks like.", done: "Oh, it's exactly what it looks like. Bless them." },
      { kind: "return", ask: "I've lost something. It was mine. It might be on the beach. Or {target} might know. Could you ask around?", done: "That's it! That's the very thing! I don't remember what it's for." },
      { kind: "return", ask: "{target} borrowed a thing of mine, about a year back. Would you get it for me? I'd ask, but then I'd have to talk to them.", done: "Thank you. Now I can lend it to them again." },
      { kind: "trade", item: "pear", ask: "I'll swap you something for a pear. What? It's a surprise. It's a very small surprise.", done: "A deal is a deal. You got a good one. I got a pear." },
      { kind: "trade", item: "weed", ask: "Swap you for a weed. Yes, a weed. Don't look at me like that, you've got plenty.", done: "A fair trade. I'd like that noted, if anyone asks." },
      { kind: "trade", item: "shellCommon", anyCat: "shell", ask: "Got a shell? I've got something much better. Or different. Swap?", done: "Pleasure. You'll thank me. You will not, but you could." },
      { kind: "fetch", item: "furniture", anyCat: "furniture", ask: "I've got a gap in my house. A chair-sized gap, or similar. Bring me anything you're not using.", done: "That fills the gap. Now there's a new gap, where I was standing." },
      { kind: "fetch", item: "fruit", anyCat: "fruit", ask: "Bring me a bit of fruit. I've been told it's good for me. I want to see for myself.", done: "Mm. Yes. No. Yes. I'll need more time with it." }
    ];
  }
});

// src/systems/lines.js
function resolveTags(text, g, extra = {}) {
  return text.replace(TAGS, (m, tag) => {
    if (extra[tag] !== void 0) return String(extra[tag]);
    const w = g?.world;
    switch (tag) {
      case "player":
        return w?.player.name ?? "you";
      case "town":
        return w?.player.town ?? "here";
      case "neighbour":
        return "someone";
      case "item":
        return "thing";
      case "catch":
        return "fish";
      case "debt":
        return (w?.player.debt ?? 0).toLocaleString("en-US");
      case "season":
        return SEASON_NAMES[calendar(w).season].toLowerCase();
      default:
        return m;
    }
  });
}
function order(w, ownerBank, n) {
  const s = new Stream(`${w.seed}:lines:${ownerBank}`);
  return s.shuffle(Array.from({ length: n }, (_, i) => i));
}
function nextFrom(w, owner, bank, list) {
  if (!list?.length) return null;
  w.flags.seen ??= {};
  const k = `${owner}.${bank}`;
  const i = w.flags.seen[k] ?? 0;
  w.flags.seen[k] = i + 1;
  const ord = order(w, k, list.length);
  return list[ord[i % list.length]];
}
var TAGS, hostLine, typeLine, uniqueLine, otherNeighbour, gossipLine;
var init_lines = __esm({
  "src/systems/lines.js"() {
    init_types();
    init_unique();
    init_hosts();
    init_neighbours();
    init_calendar();
    init_rng();
    init_items();
    TAGS = /\{(\w+)\}/g;
    hostLine = (g, host, bank) => {
      const list = HOSTS[host]?.[bank];
      return nextFrom(g.world, host, bank, list);
    };
    typeLine = (g, npcId, bank) => {
      const t = NEIGHBOURS[npcId].type;
      return nextFrom(g.world, npcId, bank, TYPE_LINES[t][bank]);
    };
    uniqueLine = (g, npcId) => nextFrom(g.world, npcId, "unique", UNIQUE[npcId]);
    otherNeighbour = (g, not) => {
      const here = NEIGHBOUR_ORDER.filter((n) => n !== not && g.world.npcs[n].moved === "here");
      const s = new Stream(`${g.world.seed}:other:${g.world.clock.day}:${not}:${g.world.stats.talks[not] ?? 0}`);
      return NEIGHBOURS[s.pick(here)].short ?? NEIGHBOURS[s.pick(here)].name;
    };
    gossipLine = (g, npcId) => {
      const t = nextFrom(g.world, npcId, "gossip", GOSSIP);
      return t.replace(/\{neighbour\}/g, otherNeighbour(g, npcId));
    };
  }
});

// src/data/names.js
var CHAR_NAMES;
var init_names = __esm({
  "src/data/names.js"() {
    CHAR_NAMES = {
      gander: "Mrs. Gander",
      clementine: "Clementine",
      trundle: "Mayor Trundle",
      quill: "Dr. Quill",
      mothwick: "Madame Mothwick",
      rind: "Old Rind",
      vesper: "Vesper",
      hester: "Hester",
      fleece: "Monsieur Fleece",
      flavia: "Flavia Rosé",
      magda: "Magda",
      bellows: "Sir Reginald",
      pemberton: "Pemberton",
      brisket: "Agent Brisket",
      lou: "Languid Lou",
      nibbles: "Madame Nibbles",
      pimm: "Inspector Pimm",
      player: "You",
      gran: "Gran"
    };
  }
});

// src/systems/say.js
function pages(g, text, extra) {
  const t = resolveTags(text, g, extra);
  return t.split("//").map((s) => s.trim()).filter(Boolean);
}
function* say(g, who, lines, { extra = {}, name = null, voice = null, emote = null } = {}) {
  const list = (Array.isArray(lines) ? lines : [lines]).flatMap((l) => pages(g, l, extra));
  let done = false;
  const d = new Dialogue({ who, name: name ?? nameOf(who), voice: voice ?? who, beats: list.map((text, i) => i === 0 && emote ? { text, emote } : { text }), onDone: () => {
    done = true;
  } });
  g.ui.push(d);
  faceTalk(g, who, true);
  while (!done) yield;
  faceTalk(g, who, false);
}
function* ask(g, who, text, choices, { extra = {}, name = null, voice = null } = {}) {
  const list = pages(g, text, extra);
  let done = false;
  let result = -1;
  const d = new Dialogue({ who, name: name ?? nameOf(who), voice: voice ?? who, beats: list, choices, onDone: (c2) => {
    done = true;
    result = c2;
  } });
  g.ui.push(d);
  faceTalk(g, who, true);
  while (!done) yield;
  faceTalk(g, who, false);
  return result;
}
function* narrate(g, text, extra = {}) {
  let done = false;
  g.ui.push(new Dialogue({ who: null, name: "", voice: null, beats: pages(g, text, extra), onDone: () => {
    done = true;
  } }));
  while (!done) yield;
}
function faceTalk(g, who, on) {
  const npc = g.npcs?.get?.(who);
  const a = g.actorOf?.(who);
  if (npc) npc.talking = on;
  if (a && on) {
    a.faceToward(g.player.x, g.player.z);
    g.player.faceToward(a.x, a.z);
    a.headLook = null;
  }
}
var nameOf;
var init_say = __esm({
  "src/systems/say.js"() {
    init_dialogue();
    init_lines();
    init_neighbours();
    init_names();
    nameOf = (id) => CHAR_NAMES[id] ?? NEIGHBOURS[id]?.name ?? id;
  }
});

// src/systems/memory.js
function remember(g, k, data = {}) {
  const w = g.world;
  w.memory.push({ k, day: w.clock.day, heard: [], ...data });
  if (w.memory.length > CAP) w.memory.shift();
  g.events.emit("memory", { k, ...data });
}
function memoryLine(g, npcId) {
  const w = g.world;
  for (let i = w.memory.length - 1; i >= 0; i--) {
    const m = w.memory[i];
    if (m.heard.includes(npcId)) continue;
    if (m.about === npcId && m.k !== "bonk") continue;
    if (m.k === "bonk" && m.about !== npcId) continue;
    if (w.clock.day - m.day > 5) break;
    const list = MEMORY_LINES[m.k];
    if (!list) continue;
    m.heard.push(npcId);
    const t = nextFrom(w, npcId, `mem.${m.k}`, list);
    const neighbour = m.about ? NEIGHBOURS[m.about]?.short ?? NEIGHBOURS[m.about]?.name ?? m.about : "someone";
    return { text: t.replace(/\{item\}/g, m.item ?? "thing").replace(/\{catch\}/g, m.catch ?? "fish").replace(/\{neighbour\}/g, neighbour), memory: m };
  }
  return null;
}
var CAP;
var init_memory = __esm({
  "src/systems/memory.js"() {
    init_unique();
    init_neighbours();
    init_lines();
    CAP = 80;
  }
});

// src/systems/economy.js
function addItem(g, id, meta = null) {
  const p = g.world.player.pockets;
  const i = p.indexOf(null);
  if (i < 0) return -1;
  p[i] = meta ? { id, ...meta } : { id };
  if (["furniture", "clothes", "hat", "glasses", "umbrella", "wall", "floor"].includes(ITEMS[id]?.cat)) g.world.player.catalog[id] = true;
  g.events.emit("gotItem", { id, slot: i });
  g.pocketsDirty = true;
  return i;
}
function removeSlot(g, i) {
  const s = g.world.player.pockets[i];
  g.world.player.pockets[i] = null;
  g.pocketsDirty = true;
  return s;
}
function addBeans(g, n, reason = "") {
  const w = g.world;
  w.player.beans = Math.max(0, w.player.beans + n);
  if (n > 0) {
    w.stats.beansEarned += n;
  }
  g.events.emit("beans", { n, reason });
}
function sellSlot(g, i) {
  const w = g.world;
  const slot = w.player.pockets[i];
  if (!slot || !SELLABLE(slot.id)) return 0;
  const it = ITEMS[slot.id];
  const price = sellPrice(g, slot);
  removeSlot(g, i);
  addBeans(g, price, "sell");
  w.stats.sold[slot.id] = (w.stats.sold[slot.id] ?? 0) + 1;
  w.stats.soldTotal = (w.stats.soldTotal ?? 0) + 1;
  if (slot.from || it.handmade) {
    const from2 = slot.from ?? it.handmade;
    remember(g, slot.id === "scarfGift" ? "soldScarf" : "soldGift", { item: it.name, about: from2 });
    w.npcs[from2] && (w.npcs[from2].friend = Math.max(0, w.npcs[from2].friend - 2));
  } else if (w.stats.soldTotal % 6 === 0) remember(g, "sold", { item: it.name });
  g.events.emit("sold", { id: slot.id, price });
  return price;
}
function payDebt(g, amount) {
  const w = g.world;
  const p = w.player;
  const pay = Math.min(amount, p.beans, p.debt);
  if (pay <= 0) return 0;
  p.beans -= pay;
  p.debt -= pay;
  p.debtPaid += pay;
  g.events.emit("debtPaid", { pay, left: p.debt });
  return pay;
}
function upgradeHome(g) {
  const w = g.world;
  const cost = nextTierCost(w);
  if (cost == null || w.player.debt > 0) return false;
  w.player.homeTier += 1;
  w.player.debt += cost;
  w.player.debtTier = w.player.homeTier;
  g.town?.refreshHome();
  remember(g, "debtTier", {});
  g.events.emit("homeTier", { tier: w.player.homeTier });
  return true;
}
function spend(g, n) {
  const w = g.world;
  if (w.player.beans < n) return false;
  w.player.beans -= n;
  w.player.lifeSpend += n;
  const tier = w.player.lifeSpend >= 12e4 ? 3 : w.player.lifeSpend >= 25e3 ? 2 : 1;
  if (tier > w.store.tier) {
    w.store.tier = tier;
    w.flags.storeUpgraded = true;
    g.town?.refreshStore();
  }
  return true;
}
var HOME_TIERS, hasRoom, sellPrice, buyPrice, nextTierCost, giftScore;
var init_economy = __esm({
  "src/systems/economy.js"() {
    init_items();
    init_tuning();
    init_memory();
    init_neighbours();
    HOME_TIERS = [
      { tier: 1, debt: 8e3, name: "Starter Shack" },
      { tier: 2, debt: 3e4, name: "Proper Cottage" },
      { tier: 3, debt: 8e4, name: "Cottage with Annex" },
      { tier: 4, debt: 15e4, name: "Two Storeys" }
    ];
    hasRoom = (w) => w.player.pockets.some((s) => s === null);
    sellPrice = (g, slot) => {
      const it = ITEMS[slot.id];
      if (!it) return 0;
      if (it.cat === "cheese" && slot.id === "cheese") return Math.round((g.life?.cheesePrice?.() ?? 100) * tuning.sellMult);
      return Math.max(1, Math.round((it.sell ?? 10) * tuning.sellMult));
    };
    buyPrice = (id) => Math.max(1, Math.round((ITEMS[id]?.price ?? 100) * tuning.buyMult));
    nextTierCost = (w) => {
      const t = HOME_TIERS.find((x) => x.tier === w.player.homeTier + 1);
      return t ? Math.round(t.debt * tuning.debtMult) : null;
    };
    giftScore = (npcId, itemId) => {
      const n = NEIGHBOURS[npcId];
      const it = ITEMS[itemId];
      if (!n || !it) return 0;
      if (n.id === "tavi" || npcId === "tavi") return 1;
      const tags = /* @__PURE__ */ new Set([...it.tags ?? [], it.cat]);
      if (n.hates.some((t) => tags.has(t))) return -1;
      if (n.loves.some((t) => tags.has(t))) return 2;
      return (it.sell ?? 0) > 300 ? 1 : 0;
    };
  }
});

// src/systems/reveal.js
function* revealCatch(g, id, line2, kind) {
  const w = g.world;
  const it = ITEMS[id];
  const cat = it?.cat;
  const book = cat === "fish" ? w.almanac.fish : cat === "bug" ? w.almanac.bug : cat === "fossil" || cat === "rawFossil" ? w.almanac.fossil : null;
  const first = book ? !book[id] : !w.flags[`seen:${id}`];
  if (book) book[id] = (book[id] ?? 0) + 1;
  else w.flags[`seen:${id}`] = true;
  if (cat === "fish") {
    w.stats.fish += 1;
    w.stats.caught += 1;
    if ((it.beans ?? 0) > w.stats.biggestBeans) {
      w.stats.biggestBeans = it.beans;
      w.stats.biggest = it.name;
    }
  }
  if (cat === "bug") {
    w.stats.bugs += 1;
    w.stats.caught += 1;
  }
  g.events.emit("caught", { id, kind, first });
  if (!first) {
    g.sound("revealQuick");
    g.ui.toastMsg(`Another ${it.name}.`);
    return;
  }
  const p = g.player;
  p.pose("HoldUp", 1.2);
  g.sound("reveal");
  g.revealIcon = { id, t: 0 };
  g.rumble(0.3, 120);
  yield 0.5;
  yield* narrate(g, `You caught a ${it.name}! ${line2 ?? it.line ?? ""}`.replace("You caught a", kind === "find" ? "You found a" : "You caught a"));
  g.revealIcon = null;
  p.poseTimer = 0;
  p.poseClip = null;
}
function drawReveal(g, hud) {
  const r = g.revealIcon;
  if (!r) return;
  const it = ITEMS[r.id];
  const s = g.project(g.player.x, g.player.y + 1.8, g.player.z);
  if (s) drawIcon(hud, s.x - 16, s.y - 34, it.icon, it.iconColors, 2);
}
var init_reveal = __esm({
  "src/systems/reveal.js"() {
    init_items();
    init_say();
    init_icons();
    init_economy();
  }
});

// src/world/place.js
function circleBlocked(place, x, z, r = 0.3) {
  return place.blocked(x - r, z - r) || place.blocked(x + r, z - r) || place.blocked(x - r, z + r) || place.blocked(x + r, z + r) || place.blocked(x, z);
}
function moveWithCollision(place, pos, dx, dz, r0 = 0.3) {
  const r = circleBlocked(place, pos.x, pos.z, r0) ? 0.02 : r0;
  const nx = pos.x + dx, nz = pos.z + dz;
  const stepOK = (a, b) => Math.abs(place.height(a, b) - place.height(pos.x, pos.z)) < 0.55;
  if (!circleBlocked(place, nx, nz, r) && stepOK(nx, nz)) {
    pos.x = nx;
    pos.z = nz;
    return true;
  }
  let moved = false;
  if (!circleBlocked(place, nx, pos.z, r) && stepOK(nx, pos.z)) {
    pos.x = nx;
    moved = true;
  }
  if (!circleBlocked(place, pos.x, nz, r) && stepOK(pos.x, nz)) {
    pos.z = nz;
    moved = true;
  }
  return moved;
}
var Group, Place;
var init_place = __esm({
  "src/world/place.js"() {
    init_engine();
    ({ Group } = engine_exports.THREE);
    Place = class {
      constructor(id, kind, { ox = 0, oz = 0, name = "" } = {}) {
        this.id = id;
        this.kind = kind;
        this.name = name;
        this.group = new Group();
        this.group.position.set(ox, 0, oz);
        this.ox = ox;
        this.oz = oz;
        this.nav = null;
      }
      blocked() {
        return false;
      }
      height() {
        return 0;
      }
      /** Things to interact with, as data: { id, x, z, r, label, run(g) }. */
      interactables() {
        return [];
      }
      cameraYawLocked() {
        return false;
      }
      update() {
      }
    };
  }
});

// src/world/terrainMesh.js
function surfaceMaterial(surface, season) {
  const s = SEASON_IDS[season];
  const id = SEASONAL[surface] ? `${surface}-${s}` : surface === "plaza" ? season === 3 ? "plaza-winter" : "plaza-warm" : surface === "cliff" ? "cliff-warm" : surface === "bank" ? "bank-warm" : surface === "dock" ? "dock-boards" : surface === "worn" ? `path-${s}` : surface;
  let m = matCache.get(id);
  if (!m) matCache.set(id, m = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: (0, engine_exports.textureMap)(id) }));
  return m;
}
function addTile(b, x, z, surfaceOf) {
  const c2 = tileChar(x, z);
  const info = tileInfo(c2);
  const heightAt = (px, pz) => groundHeight(px, pz);
  const hT = info.h;
  if (!info.water) {
    const surface = surfaceOf(x, z, info);
    if (info.ramp) {
      const hN = heightAt(x + 0.5, z + 1e-3);
      const hS = heightAt(x + 0.5, z + 0.999);
      const n = [0, 4, 2 * (hN - hS)];
      b.quad(surface, [x, hN, z], [x, hS, z + 1], [x + 1, hS, z + 1], [x + 1, hN, z], n, topUV(x, z), topUV(x, z + 1), topUV(x + 1, z + 1), topUV(x + 1, z));
    } else {
      b.quad(surface, [x, hT, z], [x, hT, z + 1], [x + 1, hT, z + 1], [x + 1, hT, z], [0, 1, 0], topUV(x, z), topUV(x, z + 1), topUV(x + 1, z + 1), topUV(x + 1, z));
    }
  }
  const myTop = info.water ? null : hT;
  if (myTop === null) return;
  const side = (nx, nz, ax, az, bx, bz, n) => {
    const nc = tileChar(nx, nz);
    const ni = tileInfo(nc);
    const nh = ni.water ? -1.2 : ni.ramp ? Math.min(groundHeight(nx + 0.5, nz + 0.05), groundHeight(nx + 0.5, nz + 0.95)) : ni.h;
    if (info.ramp) return;
    if (nh >= myTop - 0.01) return;
    const surface = ni.water && myTop < 1 ? "bank" : myTop >= 1 ? "cliff" : "bank";
    const h = myTop - nh;
    const len = Math.hypot(ax - bx, az - bz);
    const u0 = (ax + az) / TILE_M, u1 = u0 + len / TILE_M;
    b.quad(surface, [ax, myTop, az], [ax, nh, az], [bx, nh, bz], [bx, myTop, bz], n, [u0, myTop / TILE_M], [u0, (myTop - h) / TILE_M], [u1, (myTop - h) / TILE_M], [u1, myTop / TILE_M]);
  };
  side(x, z + 1, x, z + 1, x + 1, z + 1, [0, 0, 1]);
  side(x + 1, z, x + 1, z + 1, x + 1, z, [1, 0, 0]);
  side(x, z - 1, x + 1, z, x, z, [0, 0, -1]);
  side(x - 1, z, x, z, x, z + 1, [-1, 0, 0]);
}
function geometryOf(q) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(q.pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(q.nor, 3));
  g.setAttribute("uv", new Float32BufferAttribute(q.uv, 2));
  g.setIndex(q.idx);
  g.computeBoundingSphere();
  return g;
}
var BufferGeometry, Float32BufferAttribute, Group2, Mesh, CHUNK, SEASON_IDS, SEASONAL, matCache, TILE_M, Builder, topUV, TownTerrain;
var init_terrainMesh = __esm({
  "src/world/terrainMesh.js"() {
    init_engine();
    init_tiles();
    ({ BufferGeometry, Float32BufferAttribute, Group: Group2, Mesh } = engine_exports.THREE);
    CHUNK = 16;
    SEASON_IDS = ["spring", "summer", "autumn", "winter"];
    SEASONAL = { lawn: true, path: true, sand: true };
    matCache = /* @__PURE__ */ new Map();
    TILE_M = 4;
    Builder = class {
      constructor() {
        this.s = /* @__PURE__ */ new Map();
      }
      get(surface) {
        let b = this.s.get(surface);
        if (!b) this.s.set(surface, b = { pos: [], nor: [], uv: [], idx: [] });
        return b;
      }
      quad(surface, a, b, c2, d, n, uvA, uvB, uvC, uvD) {
        const q = this.get(surface);
        const i = q.pos.length / 3;
        q.pos.push(...a, ...b, ...c2, ...d);
        for (let k = 0; k < 4; k++) q.nor.push(...n);
        q.uv.push(...uvA, ...uvB, ...uvC, ...uvD);
        q.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
      }
    };
    topUV = (x, z) => [x / TILE_M, z / TILE_M];
    TownTerrain = class {
      /** @param surfaceOf (x, z, info) → surface name: gives worn paths their say. */
      constructor(surfaceOf) {
        this.group = new Group2();
        this.surfaceOf = surfaceOf;
        this.season = 1;
        this.chunks = /* @__PURE__ */ new Map();
        this.groundHeight = groundHeight;
        for (let cz = 0; cz < Math.ceil(ROWS / CHUNK); cz++) for (let cx = 0; cx < Math.ceil(COLS / CHUNK); cx++) this.buildChunk(cx, cz);
      }
      buildChunk(cx, cz) {
        const k = `${cx},${cz}`;
        const old = this.chunks.get(k);
        if (old) for (const m of old) {
          this.group.remove(m);
          m.geometry.dispose();
        }
        const b = new Builder();
        for (let z = cz * CHUNK; z < Math.min(ROWS, (cz + 1) * CHUNK); z++) for (let x = cx * CHUNK; x < Math.min(COLS, (cx + 1) * CHUNK); x++) addTile(b, x, z, this.surfaceOf);
        const meshes = [];
        for (const [surface, q] of b.s) {
          const mesh = new Mesh(geometryOf(q), surfaceMaterial(surface, this.season));
          mesh.userData.surface = surface;
          mesh.receiveShadow = true;
          this.group.add(mesh);
          meshes.push(mesh);
        }
        this.chunks.set(k, meshes);
      }
      rebuildTile(x, z) {
        this.buildChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
      }
      setSeason(season) {
        this.season = season;
        for (const list of this.chunks.values()) for (const m of list) m.material = surfaceMaterial(m.userData.surface, season);
      }
    };
  }
});

// src/world/town.js
function swayify(obj, wind, height, base, amount, phase) {
  const bucket = Math.floor((phase % 6.283 + 6.283) % 6.283 / 1.6);
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const hex = m.material.color?.getHex?.() ?? 0;
    const glow = !m.material.isMeshToonNodeMaterial && !m.material.isMeshToonMaterial;
    const k = `${hex}:${bucket}:${height}:${glow}`;
    let sm = swayCache.get(k);
    if (!sm) {
      sm = (0, engine_exports.swayMaterial)(m.material, wind, { height, base, amount, phase: bucket * 1.6 });
      swayCache.set(k, sm);
    }
    m.material = sm;
  });
}
var BoxGeometry, Group3, Mesh2, Vector3, PlaneGeometry, BLOSSOM, SEASON_LEAF, LEAF_LIME, leafFor, swayCache, replaceColor, TownPlace, SOLID_KINDS;
var init_town2 = __esm({
  "src/world/town.js"() {
    init_engine();
    init_place();
    init_terrainMesh();
    init_tiles();
    init_town();
    init_models();
    init_rng();
    ({ BoxGeometry, Group: Group3, Mesh: Mesh2, Vector3, PlaneGeometry } = engine_exports.THREE);
    BLOSSOM = 16099008;
    SEASON_LEAF = [
      { leaf: "white", leaf2: "white", blossom: true },
      { leaf: "green", leaf2: "lime" },
      { leaf: "orange", leaf2: "red" },
      { leaf: "white", leaf2: "mist" }
    ];
    LEAF_LIME = { leaf: "lime", leaf2: "green" };
    leafFor = (season, calendarDay, kind) => {
      if (kind === "pine") return season === 3 ? { leaf: "white", leaf2: "teal" } : season === 2 ? { leaf: "teal", leaf2: "green" } : { leaf: "teal", leaf2: "green" };
      if (kind === "palm") return season === 3 ? { leaf: "teal", leaf2: "white" } : season === 2 ? { leaf: "green", leaf2: "sand" } : { leaf: "green", leaf2: "lime" };
      if (season === 0 && calendarDay > 2) return LEAF_LIME;
      return SEASON_LEAF[season];
    };
    swayCache = /* @__PURE__ */ new Map();
    replaceColor = (obj, hex, to) => obj.traverse((m) => {
      if (m.isMesh && m.material?.color?.getHex?.() === hex) m.material = to;
    });
    TownPlace = class extends Place {
      constructor(g) {
        super("town", "town", { name: "The Village" });
        this.g = g;
        this.solid = new Uint8Array(COLS * ROWS);
        this.wind = new engine_exports.WindUniforms();
        this.windTime = 0;
        this.lamps = [];
        this.lit = [];
        this.buildings = /* @__PURE__ */ new Map();
        this.seasonBuilt = -1;
        this.occluders = [];
        this.smokeAt = [];
        this.smokeT = 0;
        this.terrain = new TownTerrain((x, z, info) => info.surface === "lawn" && this.g.world?.town.worn[`${x},${z}`] ? "worn" : info.surface);
        this.group.add(this.terrain.group);
        this.statics = new Group3();
        this.group.add(this.statics);
        this.ringGroup = new Group3();
        this.group.add(this.ringGroup);
        this.objectsGroup = new Group3();
        this.group.add(this.objectsGroup);
        this.movers = new Group3();
        this.group.add(this.movers);
        this.objectViews = /* @__PURE__ */ new Map();
        this.dirty = /* @__PURE__ */ new Set();
        this.buildWater();
        this.buildStatics();
        this.buildBaseGrid();
        this.nav = new engine_exports.NavGrid(COLS, ROWS, { cell: 1, origin: [0, 0, 0] });
        this.decals = new engine_exports.Decals(this.group, { capacity: 200 });
        this.syncNav();
      }
      buildBaseGrid() {
        for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) this.solid[z * COLS + x] = tileInfo(tileChar(x, z)).walk ? 0 : 1;
        for (const b of BUILDINGS) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) this.solid[z * COLS + x] = 1;
        for (const [x, z] of [...LAMPS, ...BENCHES.filter((b) => b[2] !== false)]) this.solid[Math.floor(z) * COLS + Math.floor(x)] = 1;
        for (const name of ["oldBell", "noticeBoard", "mailbox", "lighthouse"]) {
          const [x, z] = LANDMARKS[name];
          this.solid[Math.floor(z) * COLS + Math.floor(x)] = 1;
        }
        const [px, pz] = LANDMARKS.oldPear;
        for (let z = pz - 1; z <= pz; z++) for (let x = px - 1; x <= px; x++) this.solid[z * COLS + x] = 1;
        const [lx, lz] = LANDMARKS.lighthouse;
        for (let z = Math.floor(lz) - 1; z <= Math.floor(lz) + 1; z++) for (let x = Math.floor(lx) - 1; x <= Math.floor(lx) + 1; x++) this.solid[z * COLS + x] = 1;
        for (let x = 6; x <= 11; x++) this.solid[25 * COLS + x] = 1;
        this.baseSolid = this.solid.slice();
      }
      syncNav() {
        for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) this.nav.setOpen(x, z, !this.solid[z * COLS + x] && !this.objectBlocks(x, z));
      }
      objectBlocks(x, z) {
        const o = this.g.world?.town.objects[`${x},${z}`];
        return !!o && SOLID_KINDS.has(o.k);
      }
      /** Is the point inside something solid? */
      blocked(x, z) {
        const tx = Math.floor(x), tz = Math.floor(z);
        if (tx < 0 || tz < 0 || tx >= COLS || tz >= ROWS) return true;
        if (this.g.noclip) return false;
        return this.solid[tz * COLS + tx] === 1 || this.objectBlocks(tx, tz);
      }
      height(x, z) {
        return groundHeight(x, z);
      }
      surfaceAt(x, z) {
        const info = tileInfo(tileChar(Math.floor(x), Math.floor(z)));
        const s = info.surface;
        if (s === "dock") return "stepWood";
        if (s === "sand") return "stepSand";
        if (s === "plaza" || s === "cliff") return "stepStone";
        if (s === "path") return this.g.season === 3 ? "stepSnow" : "stepPath";
        return this.g.season === 3 ? "stepSnow" : "stepGrass";
      }
      // ---- static art ---------------------------------------------------------------------------------
      buildWater() {
        this.water = new engine_exports.WaterSurface({ size: [180, 140], at: [40, -0.34, 44], segments: [180, 140], waves: engine_exports.WAVES_CALM, deep: engine_exports.PALETTE.blue, shallow: engine_exports.PALETTE.sky, foam: engine_exports.PALETTE.white, foamAt: 0.3 });
        this.water.receiveShadow = false;
        this.group.add(this.water);
        this.pool = new engine_exports.WaterSurface({ size: [13, 14], at: [40, 1.5, 8.5], segments: [26, 28], waves: engine_exports.WAVES_CALM, deep: engine_exports.PALETTE.blue, shallow: engine_exports.PALETTE.sky, foam: engine_exports.PALETTE.white, foamAt: 0.3 });
        this.group.add(this.pool);
      }
      place(id, at, opts = {}) {
        const { turn = 0, group = this.statics, solidAs, ...rest } = opts;
        const b = (0, engine_exports.buildModel)(id, { catalog: MODELS, ...rest });
        const o = b.object;
        o.position.set(at[0], at[1] ?? 0, at[2]);
        o.rotation.y = turn * Math.PI / 180;
        o.traverse((m) => {
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        group.add(o);
        return o;
      }
      buildStatics() {
        const tex = (0, engine_exports.textureMap)("cliff-warm");
        const wall = new Mesh2(new BoxGeometry(150, 12, 24), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: tex }));
        wall.geometry.attributes.uv.array.forEach((v2, i, uv) => {
          uv[i] = v2 * (i % 2 ? 3 : 36);
        });
        wall.position.set(40, 7, -12);
        this.statics.add(wall);
        const top = new Mesh2(new BoxGeometry(150, 0.6, 30), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.teal));
        top.position.set(40, 13, -12);
        this.statics.add(top);
        this.fallTop = this.place("waterfall", [40, 1.4, 2.8], { params: { width: 4, height: 11 } });
        this.fallLow = this.place("waterfall", [40, -0.3, 16.08], { params: { width: 4, height: 2.3 } });
        const apron = (x, z, w, d, c2, y = -0.02) => {
          const m = new Mesh2(new BoxGeometry(w, 0.2, d), (0, engine_exports.toonMaterial)(c2));
          m.position.set(x, y - 0.1, z);
          m.receiveShadow = true;
          return m;
        };
        this.aprons = [apron(-20, 29, 40, 58, engine_exports.PALETTE.green), apron(100, 29, 40, 58, engine_exports.PALETTE.green), apron(-20, 8, 40, 16, engine_exports.PALETTE.green, 2), apron(100, 8, 40, 16, engine_exports.PALETTE.green, 2)];
        for (const a of this.aprons) this.statics.add(a);
        this.headlands = [apron(-20, 54, 40, 12, engine_exports.PALETTE.sand), apron(100, 54, 40, 12, engine_exports.PALETTE.sand)];
        for (const a of this.headlands) this.statics.add(a);
        for (const [x, z] of LAMPS) {
          const y = groundHeight(x, z);
          const o = this.place("lamp-post", [x, y, z], { light: { intensity: 0 } });
          this.lamps.push({ x, z, y: y + 2.05, handle: null, o });
        }
        for (const [x, z] of BENCHES) this.place("park-bench", [x, groundHeight(x, z), z], {});
        const [nx, nz] = LANDMARKS.noticeBoard;
        this.place("notice-board", [nx, 0, nz], { params: { notes: 6 } });
        const [bx, bz] = LANDMARKS.oldBell;
        this.bell = this.place("old-bell", [bx, 0, bz], {});
        this.bellPivot = this.bell.getObjectByName("bell");
        this.oldPear = null;
        this.mailbox = this.place("mailbox", [LANDMARKS.mailbox[0], 0, LANDMARKS.mailbox[1]], { turn: -20 });
        this.mailFlag = this.mailbox.getObjectByName("flag");
        this.lighthouse = this.place("b-lighthouse", [LANDMARKS.lighthouse[0], 0, LANDMARKS.lighthouse[1]], {});
        this.lighthouseBeam = this.lighthouse.getObjectByName("beam");
        this.place("bus-shelter", [8.5, 0, 25.6], {});
        this.place("bridge-rails", [39.5, 0.04, 25], { params: { length: 4.4, width: 2.2 } });
        this.place("bridge-rails", [43.5, 0.04, 39], { params: { length: 4.4, width: 2.2 } });
        this.place("bridge-rails", [39.5, 2.04, 13], { params: { length: 4.4, width: 2.2 } });
        for (const [x, z] of [[22.9, 57], [25.1, 57], [22.9, 60], [25.1, 60], [22.9, 62.8], [25.1, 62.8]]) {
          const post = new Mesh2(new BoxGeometry(0.22, 1.6, 0.22), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.plum));
          post.position.set(x, -0.3, z);
          this.statics.add(post);
        }
        this.place("rowboat-prop", [20.5, -0.3, 58.5], { turn: 20 });
        for (const x of [69, 75]) {
          const p = new Mesh2(new BoxGeometry(0.1, 1.9, 0.1), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.plum));
          p.position.set(x, 0.95, 48.5);
          this.statics.add(p);
        }
        const line2 = new Mesh2(new BoxGeometry(6, 0.03, 0.03), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white));
        line2.position.set(72, 1.8, 48.5);
        this.statics.add(line2);
        this.laundry = [];
        [[70, "red"], [71, "white"], [72.2, "sky"], [73.4, "sand"]].forEach(([x, c2]) => {
          const l = new Mesh2(new BoxGeometry(0.6, 0.6, 0.04), (0, engine_exports.toonMaterial)(engine_exports.PALETTE[c2]));
          l.position.set(x, 1.5, 48.5);
          this.statics.add(l);
          this.laundry.push(l);
        });
        for (const b of BUILDINGS) this.buildBuilding(b);
      }
      buildBuilding(b) {
        const old = this.buildings.get(b.id);
        if (old) {
          old.object.removeFromParent();
          this.occluders = this.occluders.filter((o) => o.object !== old.object);
        }
        const w = this.g.world;
        let id = b.model;
        let palette;
        if (b.model === "home") {
          id = `home-${w?.player.homeTier ?? 1}`;
          palette = { wall: w?.home.wallColor ?? "orange", roof: w?.home.roofColor ?? "slate" };
        } else if (b.model === "b-store") {
          id = `store-${w?.store.tier ?? 1}`;
        } else if (b.model === "cottage") {
          palette = { wall: b.wall, roof: b.roof };
        }
        const obj = this.place(id, [b.x + b.w / 2, groundHeight(b.x + 0.5, b.z + 0.5), b.z + b.d / 2], { palette });
        const entry = { b, object: obj, lit: obj.getObjectByName("lit"), door: obj.getObjectByName("door"), flag: obj.getObjectByName("flag") };
        if (entry.lit) entry.lit.visible = false;
        this.buildings.set(b.id, entry);
        this.occluders.push({ object: obj, min: new Vector3(b.x, 0, b.z), max: new Vector3(b.x + b.w, 5, b.z + b.d) });
        if (b.model === "cottage" || b.model === "home") this.smokeAt.push({ id: b.id, x: b.x + b.w / 2 + 1.3, y: 3.8, z: b.z + b.d / 2 - 0.7 });
        for (const [m, dx, dz, opts] of COTTAGE_DECO[b.id] ?? []) {
          const { scale, ...rest } = opts;
          const def = MODELS.get(m);
          const palette2 = rest.palette && def?.palette ? Object.fromEntries(Object.entries(rest.palette).filter(([k]) => k in def.palette)) : rest.palette;
          const o = this.place(m, [b.x + dx, 0, b.z + b.d + dz], { ...rest, palette: palette2, group: obj });
          o.position.set(dx - b.w / 2, 0, b.d / 2 + dz);
          if (scale) o.scale.setScalar(scale);
        }
        if (id === "home-1") {
          const r = obj.getObjectByName("roofed");
          if (r) r.visible = !!w?.flags?.shackRoof;
        }
      }
      refreshHome() {
        const b = BUILDINGS.find((x) => x.id === "home");
        this.buildBuilding(b);
        this.applyLit(this.lastNight ?? 0);
      }
      refreshStore() {
        this.buildBuilding(BUILDINGS.find((x) => x.id === "store"));
        this.applyLit(this.lastNight ?? 0);
      }
      /** Season and forest ring. Done under cover: rebuilds meshes. */
      setSeason(season, calendarDay) {
        const key2 = `${season}:${season === 0 && calendarDay > 2 ? 1 : 0}`;
        this.terrain.setSeason(season);
        this.frostWindows(season);
        if (this.seasonBuilt === key2) {
          this.viewsDirtyAll();
          return;
        }
        this.seasonBuilt = key2;
        const lawn = [engine_exports.PALETTE.lime, engine_exports.PALETTE.green, engine_exports.PALETTE.sand, engine_exports.PALETTE.white][season];
        for (const a of this.aprons) a.material = (0, engine_exports.toonMaterial)(lawn);
        for (const a of this.headlands) a.material = (0, engine_exports.toonMaterial)(season === 3 ? engine_exports.PALETTE.white : season === 2 ? engine_exports.PALETTE.white : engine_exports.PALETTE.sand);
        if (this.oldPear) this.oldPear.removeFromParent();
        const op = leafFor(season, calendarDay, "pear");
        this.oldPear = this.place("old-pear", [LANDMARKS.oldPear[0], 0, LANDMARKS.oldPear[1]], { palette: { leaf: op.leaf, leaf2: op.leaf2 } });
        if (op.blossom) replaceColor(this.oldPear, engine_exports.PALETTE.white, (0, engine_exports.toonMaterial)(BLOSSOM));
        this.oldPearLights = this.oldPear.getObjectByName("lights");
        if (this.oldPearLights) this.oldPearLights.visible = !!this.g.world?.flags?.pearLit;
        this.oldPearFruit = this.oldPear.getObjectByName("fruit");
        if (this.oldPearFruit) this.oldPearFruit.visible = season !== 3;
        swayify(this.oldPear, this.wind, 7, 2.4, 0.03, 1);
        this.ringGroup.clear();
        const parts = [];
        const rng = new Stream("ring");
        const addTree = (x, z, y) => {
          const kind = rng.chance(0.75) ? "pine" : "pear";
          const leaf = leafFor(season, calendarDay, kind);
          const b = (0, engine_exports.buildModel)(kind === "pine" ? "tree-pine" : "tree-pear", { catalog: MODELS, palette: { leaf: leaf.leaf, leaf2: leaf.leaf2 } });
          const fruit = b.object.getObjectByName("fruit");
          if (fruit) fruit.visible = false;
          b.object.position.set(x + rng.range(-0.4, 0.4), y, z + rng.range(-0.4, 0.4));
          const s = rng.range(1, 1.6);
          b.object.scale.set(s, s, s);
          b.object.rotation.y = rng.range(0, 6);
          b.object.updateMatrixWorld(true);
          parts.push(b.object);
        };
        for (let z = -2; z < 50; z += 2) for (let ring2 = 0; ring2 < 7; ring2++) {
          addTree(-0.5 - ring2 * 2.4, z, z < 15 ? 2 : 0);
          addTree(80.5 + ring2 * 2.4, z, z < 15 ? 2 : 0);
        }
        for (let x = 2; x < 78; x += 2) addTree(x, 0.5, 2);
        const merged = (0, engine_exports.mergeStaticMeshes)(parts, { castShadow: false, receiveShadow: false });
        for (const m of merged) {
          if (leafFor(season, calendarDay, "pear").blossom && m.material.color?.getHex?.() === engine_exports.PALETTE.white) m.material = (0, engine_exports.toonMaterial)(BLOSSOM);
          this.ringGroup.add(m);
        }
        this.viewsDirtyAll();
      }
      /** Frost on the glass in winter. */
      frostWindows(season) {
        const glass = [engine_exports.PALETTE.navy, engine_exports.PALETTE.sky];
        const frost = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white);
        for (const e of this.buildings.values()) {
          e.object.traverse((m) => {
            if (!m.isMesh || m.parent?.name === "lit") return;
            const hex = m.userData.glassBase ?? m.material?.color?.getHex?.();
            if (!glass.includes(hex)) return;
            if (!m.userData.glassMat) {
              m.userData.glassMat = m.material;
              m.userData.glassBase = hex;
            }
            m.material = season === 3 ? frost : m.userData.glassMat;
          });
        }
      }
      viewsDirtyAll() {
        for (const k of Object.keys(this.g.world?.town.objects ?? {})) this.dirty.add(k);
      }
      /** Lamps, windows and the lighthouse follow the sky. */
      applyLit(night) {
        this.lastNight = night;
        const on = night > 0.35;
        for (const e of this.buildings.values()) if (e.lit) e.lit.visible = on;
        if (on !== this.lampsOn) {
          this.lampsOn = on;
          const ctx = this.g.ctx;
          for (const l of this.lamps) {
            if (on && !l.handle && this.g.place === this) l.handle = ctx.lights.request({ position: [l.x + 0.2, l.y, l.z], color: 16764277, intensity: 6, radius: 6.5, name: "lamp" });
            else if (!on && l.handle) {
              l.handle.release();
              l.handle = null;
            }
          }
        }
      }
      releaseLights() {
        for (const l of this.lamps) if (l.handle) {
          l.handle.release();
          l.handle = null;
        }
        this.lampsOn = void 0;
      }
      update(dt, t) {
        this.water.update(t);
        this.pool.update(t);
        this.windTime = t;
        const w = this.g.windNow ?? 1.2;
        this.wind.update(t, [w, w * 0.4]);
        if (this.lighthouseBeam) this.lighthouseBeam.rotation.y = t * 0.7;
        for (const [i, l] of this.laundry.entries()) l.rotation.x = Math.sin(t * 1.6 + i) * 0.14 * Math.min(2, w);
        this.decals.update(dt);
      }
    };
    SOLID_KINDS = /* @__PURE__ */ new Set(["tree", "stump", "sapling", "rock", "hole", "snowman", "beanstalk", "patternSign"]);
  }
});

// src/systems/tools.js
function equip(g, tool, ring2 = true) {
  const w = g.world;
  w.player.tool = tool;
  g.player.hold(tool ? TOOL_MODEL[tool] : null);
  g.heldNet = false;
  g.life.endFishing?.();
  if (ring2) g.toolRingT = 1.2;
}
function cycleTool(g, d) {
  const w = g.world;
  const owned = TOOL_ORDER.filter((t) => w.player.tools.includes(t));
  if (!owned.length) return;
  const list = [null, ...owned];
  const i = list.indexOf(w.player.tool);
  const next = list[(i + d + list.length) % list.length];
  equip(g, next);
  g.sound("uiTab");
}
function setToolByDigit(g, d) {
  const t = TOOL_ORDER[d - 1];
  const w = g.world;
  if (!w.player.tools.includes(t)) {
    g.sound("uiError");
    return;
  }
  equip(g, w.player.tool === t ? null : t);
  g.sound("uiTab");
}
function grantTool(g, tool) {
  const w = g.world;
  if (!w.player.tools.includes(tool)) w.player.tools.push(tool);
  equip(g, tool);
  g.events.emit("toolGained", { tool });
}
function drawToolRing(g, hud) {
  if (!(g.toolRingT > 0)) return;
  g.toolRingT -= 0.016;
  const w = g.world;
  const c2 = g.project(g.player.x, g.player.y + 1, g.player.z);
  if (!c2) return;
  const owned = TOOL_ORDER.filter((t) => w.player.tools.includes(t));
  const n = owned.length;
  owned.forEach((t, i) => {
    const a = -Math.PI / 2 + i / Math.max(1, n) * Math.PI * 2;
    const x = Math.round(c2.x + Math.cos(a) * 42) - 11;
    const y = Math.round(c2.y + Math.sin(a) * 36) - 11;
    const eq = w.player.tool === t;
    panel(hud, x, y, 22, 22, { fill: eq ? "sand" : "white", trim: eq ? "orange" : "mist" });
    drawIcon(hud, x + 3, y + 3, ITEMS[t].icon, ITEMS[t].iconColors);
  });
}
function toolPrompt(g) {
  const w = g.world;
  const t = w.player.tool;
  if (!t || g.place !== g.town) return null;
  const f = g.life.fishing;
  if (t === "rod" && f) return f.state === "bite" ? "REEL!" : "Reel in";
  if (t === "rod") return "Cast";
  if (t === "net") return g.heldNet ? "Release to swing" : "Ready the net";
  if (t === "can") return "Water";
  if (t === "axe") return "Chop";
  if (t === "shovel") {
    const o = g.interact.tile ? w.town.objects[`${g.interact.tile[0]},${g.interact.tile[1]}`] : null;
    return o?.k === "hole" ? "Fill" : "Dig";
  }
  if (t === "slingshot") return "Fire";
  return null;
}
function toolInput(g, dt) {
  const inp = g.inp;
  const w = g.world;
  const tool = w.player.tool;
  const m = inp.mouse;
  const pressed = inp.useTool || m.rclick && m.over;
  if (!tool) {
    if (pressed && !w.player.gagJump) {
      w.player.gagJump = true;
      g.ui.toastMsg("You can't jump. You're in escrow.");
      g.events.emit("gag", {});
    }
    return;
  }
  if (g.place !== g.town) {
    if (pressed) g.sound("uiError");
    return;
  }
  if (pressed && m.rclick && g.interact.hoverPoint) {
    const h = g.interact.hoverPoint;
    g.player.faceToward(h.x, h.z);
    g.player.facing = Math.atan2(h.x - g.player.x, h.z - g.player.z);
  }
  if (tool === "net") {
    if (pressed) {
      g.heldNet = true;
      g.player.play("NetReady", 0.06);
    } else if (g.heldNet && !inp.toolHeld) {
      g.heldNet = false;
      netSweep(g);
    }
    return;
  }
  if (!pressed) return;
  if (tool === "rod") {
    if (g.life.fishing) g.life.reel();
    else g.life.cast();
    return;
  }
  if (tool === "shovel" && g.net?.role !== "guest") return g.scripts.run(useShovel(g), { name: "shovel" });
  if (g.net?.role === "guest" && (tool === "axe" || tool === "shovel")) {
    g.ui.toastMsg("Not in someone else's village.");
    return void 0;
  }
  if (tool === "axe") return g.scripts.run(useAxe(g), { name: "axe" });
  if (tool === "can") return g.scripts.run(useCan(g), { name: "can" });
  if (tool === "slingshot") return g.scripts.run(useSling(g), { name: "sling" });
  return void 0;
}
function netSweep(g) {
  const p = g.player;
  p.pose("NetSweep");
  g.sound("netSwing");
  const reachSq = 1.8 * 1.8;
  const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
  const caught = g.life.bugs.find((b) => {
    const dx = b.x - p.x, dz = b.z - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > reachSq) return false;
    const d = Math.sqrt(d2) || 1;
    return (dx * fx + dz * fz) / d > 0.7 && !b.gone;
  });
  const bonked = !caught ? g.npcs.all().find((n) => n.actor.visible && Math.hypot(n.actor.x - p.x - fx * 1, n.actor.z - p.z - fz * 1) < 0.9 && n.actor.root.parent === g.place.group) : null;
  const wasps2 = g.life.waspsNear?.(p.x + fx, p.z + fz);
  g.scripts.run((function* () {
    yield 0.15;
    if (caught) {
      g.sound("netCatch");
      g.rumble(0.3, 80);
      g.life.catchBug(caught);
      yield* revealCatch(g, caught.def.id, caught.def.line, "bug");
    } else if (bonked) {
      g.sound("bonk");
      const npc = bonked;
      g.world.npcs[npc.id].friend = Math.max(0, g.world.npcs[npc.id].friend - 2);
      g.world.stats.netBonks += 1;
      remember(g, "bonk", { about: npc.id });
      npc.actor.play(npc.id === "ozzie" ? "PlayDead" : "Shock", 0.05, { once: true });
      npc.emoting = true;
      g.events.emit("bonk", { id: npc.id });
    } else if (wasps2) {
      g.life.netWasps();
      g.sound("netCatch");
    } else g.sound("netMiss");
  })(), { name: "netResult", hold: !!caught });
}
function* useShovel(g) {
  const w = g.world;
  const [tx, tz] = g.interact.tile;
  const k = `${tx},${tz}`;
  const o = w.town.objects[k];
  const p = g.player;
  const info = tileInfo(tileChar(tx, tz));
  p.pose("Dig");
  yield 0.34;
  if (o?.k === "stump") {
    g.sound("hitRock");
    delete w.town.objects[k];
    g.town.dirty.add(k);
    g.ui.toastMsg("You dug up the stump. It had nothing to say.");
    g.sound("dirtFall");
    g.events.emit("stumpOut", { k });
    return;
  }
  if (o?.k === "rock") {
    g.sound("hitRock");
    g.rumble(0.3, 80);
    g.engine.hitstop(0.05);
    g.life.hitRock(tx, tz, o);
    return;
  }
  if (o?.k === "hole") {
    g.sound("dirtFall");
    const fillItem = g.pendingBury;
    delete w.town.objects[k];
    g.town.dirty.add(k);
    g.ctx.particles.burst("dirt", [tx + 0.5, 0.2, tz + 0.5], { count: 6 });
    return;
  }
  if (!info.walk || info.surface === "dock" || info.surface === "plaza" && !o?.k || tileChar(tx, tz) === "^") {
    if (info.surface !== "plaza" || o?.k !== "crack") {
      g.sound("hitRock");
      g.ui.toastMsg("That's not the sort of ground you can dig.");
      return;
    }
  }
  if (o && o.k !== "crack" && o.k !== "sparkle" && o.k !== "weed") {
    g.sound("uiError");
    return;
  }
  g.sound("dig");
  g.rumble(0.4, 100);
  g.ctx.particles.burst("dirt", [tx + 0.5, 0.25, tz + 0.5], { count: 10 });
  yield 0.1;
  const was = o;
  w.town.objects[k] = { k: "hole", item: was?.item ?? null };
  g.town.dirty.add(k);
  g.events.emit("dug", { k, was: was?.k ?? null });
  if (was?.k === "crack" || was?.k === "sparkle") {
    w.town.objects[k].item = null;
    const item = was.item;
    if (!hasRoom(w)) {
      w.town.objects[k] = { k: "drop", item };
      g.town.dirty.add(k);
      g.ui.toastMsg("Your pockets are full. It stays on the ground.");
      return;
    }
    addItem(g, item);
    g.events.emit("dugUp", { item });
    yield* revealCatch(g, item, ITEMS[item].line, "find");
  }
}
function* useAxe(g) {
  const w = g.world;
  const [tx, tz] = g.interact.tile;
  const k = `${tx},${tz}`;
  const o = w.town.objects[k];
  const p = g.player;
  p.pose("Chop");
  yield 0.34;
  if (o?.k === "tree" || o?.k === "sapling") {
    g.sound("chop");
    g.rumble(0.4, 90);
    o.hits = (o.hits ?? 0) + 1;
    const v2 = g.town.objectViews.get(k);
    if (v2) {
      g.ctx.tweens.value(0, 1, { duration: 0.3 }, (t) => {
        v2.rotation.z = Math.sin(t * 20) * 0.04 * (1 - t);
      });
    }
    g.ctx.particles.burst("sparkle", [tx + 0.5, 1, tz + 0.5], { count: 4, colors: ["sand", "orange"] });
    if (o.hits >= 3 || o.k === "sapling") {
      g.sound("treeFall");
      g.engine.shake.add(g.settings.shake ? 0.25 : 0);
      w.town.objects[k] = { k: "stump" };
      g.town.dirty.add(k);
      g.ctx.particles.burst("leaf", [tx + 0.5, 2, tz + 0.5], { count: 20 });
      g.events.emit("treeFelled", { k });
      w.stats.trees = (w.stats.trees ?? 0) + 1;
    }
  } else if (o?.k === "rock") {
    g.sound("hitRock");
    g.life.hitRock(tx, tz, o);
  } else if (o?.k === "stump") {
    g.sound("chop");
    g.ui.toastMsg("The stump is unmoved. Try a shovel.");
  } else g.sound("netMiss");
}
function* useCan(g) {
  const w = g.world;
  const [tx, tz] = g.interact.tile;
  const p = g.player;
  p.pose("Water");
  g.sound("waterPour");
  g.ctx.particles.burst("splash", [tx + 0.5, 0.5, tz + 0.5], { count: 10 });
  yield 0.5;
  let watered = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const k = `${tx + dx},${tz + dz}`;
    const o = w.town.objects[k];
    if (!o) continue;
    if (o.k === "flower") {
      o.wet = w.clock.day;
      if (o.wilt) {
        o.wilt = 0;
        g.town.dirty.add(k);
      }
      watered++;
    }
    if (o.k === "sapling") {
      o.wet = w.clock.day;
      watered++;
      if (o.mayor) g.events.emit("wateredMayorSapling", {});
    }
  }
  if (watered) g.events.emit("watered", { n: watered });
}
function* useSling(g) {
  const p = g.player;
  const b = g.life.balloonAhead();
  p.pose("Slingshot");
  yield 0.4;
  g.sound("slingFire");
  g.life.fireShot(b);
}
var TOOL_ORDER, TOOL_MODEL;
var init_tools = __esm({
  "src/systems/tools.js"() {
    init_items();
    init_icons();
    init_draw();
    init_tiles();
    init_economy();
    init_reveal();
    init_town2();
    init_bugs();
    init_memory();
    init_tuning();
    TOOL_ORDER = ["net", "rod", "shovel", "axe", "can", "slingshot"];
    TOOL_MODEL = { net: "tool-net", rod: "tool-rod", shovel: "tool-shovel", axe: "tool-axe", can: "tool-can", slingshot: "tool-slingshot" };
  }
});

// src/systems/mail.js
function sendMail(g, { from: from2, body, gift = null, arriveDay = null, subject = "", stamp = "" }) {
  const w = g.world;
  w.mail.pending.push({ from: from2, body, gift, arriveDay: arriveDay ?? w.clock.day + 1, subject, stamp });
  g.events.emit("mailSent", { from: from2 });
}
function deliverMail(g, force = false) {
  const w = g.world;
  const due = w.mail.pending.filter((m) => m.arriveDay <= w.clock.day || force);
  w.mail.pending = w.mail.pending.filter((m) => !due.includes(m));
  for (const m of due) w.mail.inbox.push({ ...m, read: false, day: w.clock.day });
  while (w.mail.inbox.length > 30) w.mail.inbox.shift();
  if (due.length) g.events.emit("mail", { n: due.length });
  return due.length;
}
function seasonalGranLetter(g, c2) {
  const w = g.world;
  const k = `gran:${w.clock.year}:${c2.season}`;
  if (w.flags[k]) return;
  w.flags[k] = true;
  sendMail(g, { from: "gran", body: HOSTS.gran.letters[c2.season], gift: c2.season === 1 ? GRAN_ODD[1] : fruits[c2.season], arriveDay: w.clock.day });
}
function neighbourLetters(g, c2) {
  const w = g.world;
  const rng = dayStream(w, "letters");
  for (const id of NEIGHBOUR_ORDER) {
    const s = w.npcs[id];
    if (s.moved !== "here") continue;
    const chance = s.friend >= 40 ? 0.22 : s.friend >= 15 ? 0.1 : 0.03;
    if (!rng.chance(chance)) continue;
    const t = NEIGHBOURS[id].type;
    const body = nextFrom(w, id, "letter", TYPE_LINES[t].letter);
    const handmade = { yolanda: "scarfGift", nib: "poemGift", dorrit: "soupGift", ozzie: "stringGift", tavi: "smileGift" }[id];
    const gift = s.friend >= 15 ? handmade && rng.chance(0.5) ? handmade : rng.pick(["pear", "shellScallop", "seedRose", "seedTulip", "mushroom", "pottedPlant"]) : null;
    sendMail(g, { from: id, body, gift: gift ? { id: gift, from: id } : null, arriveDay: w.clock.day });
  }
}
function replyTo(g, toId, text, giftId) {
  const w = g.world;
  const name = NEIGHBOURS[toId]?.short ?? NEIGHBOURS[toId]?.name ?? "";
  const lower = text.toLowerCase();
  const gibberish = /^[a-z]{3,8}$/i.test(text.trim()) && !/[aeiou]{1}[a-z]*[aeiou]/i.test(text);
  let body;
  if (toId === "gran") {
    const R = HOSTS.gran.replies;
    body = gibberish ? R.gibberish : text.length < 12 ? R.short : text.length > 90 ? R.long : R.mid;
    body = body.replace("{text}", text.trim());
    sendMail(g, { from: "gran", body, gift: giftId ? null : fruits[(w.clock.day + w.seed) % 4], arriveDay: w.clock.day + 1 });
    w.flags.lettersToGran = (w.flags.lettersToGran ?? 0) + 1;
    return;
  }
  const n = NEIGHBOURS[toId];
  if (gibberish) body = `You wrote "${text.trim()}". I framed it.
${name}`;
  else if (lower.includes(name.toLowerCase())) body = `You put my name in your letter. Nobody's done that but the goose, and hers came with a figure.
${name}, ${n.tic}`;
  else if (text.length < 12) body = `That's a short letter. I read it twice. It took no time. I'm still thinking about it.
${name}, ${n.tic}`;
  else if (text.length > 90) body = `That's a lot of writing. I've got to the end, and I've got some questions, and I won't be asking them.
${name}, ${n.tic}`;
  else body = `Got your letter. Thanks for that. It's on the shelf where I can see it.
${name}, ${n.tic}`;
  if (giftId) body += `
P.S. The ${ITEMS[giftId]?.name ?? "present"}. Yes. I noticed.`;
  w.npcs[toId].friend = Math.min(100, w.npcs[toId].friend + 3);
  sendMail(g, { from: toId, body, arriveDay: w.clock.day + 1 });
}
var fruits, GRAN_ODD, senderName;
var init_mail = __esm({
  "src/systems/mail.js"() {
    init_types();
    init_hosts();
    init_neighbours();
    init_rng();
    init_lines();
    init_items();
    init_furniture();
    fruits = ["fig", "persimmon", "lime", "quince"];
    GRAN_ODD = [null, "stationery", "bearToy", "driftSpoon"];
    senderName = (from2) => from2 === "gran" ? "Gran" : from2 === "bureau" ? "Better Burrows Bureau" : from2 === "museum" ? "Dr. Quill" : from2 === "clementine" ? "Clementine" : from2 === "gander" ? "Mrs. Gander" : from2 === "auction" ? "Pemberton's" : from2 === "wish" ? "A Passing Star" : from2 === "snowman" ? "A Snowman" : NEIGHBOURS[from2]?.name ?? "Anonymous";
  }
});

// src/systems/dayone.js
function completeErrand(g, id) {
  const w = g.world;
  if (!w.story.day1Active || w.story.errands[id] === "done") return;
  w.story.errands[id] = "done";
  const e = ERRANDS.find((x) => x.id === id);
  const pay = Math.round(e.pay * tuning.debtMult);
  w.player.debt = Math.max(0, w.player.debt - pay);
  w.player.debtPaid += pay;
  g.sound("debtPaid");
  g.ui.toastMsg(`Errand done. ${pay} beans off the debt.`);
  g.events.emit("errand", { id });
  if (errandsDone(w)) w.flags.day1ReadyForEvening = true;
}
function day1Lines(g) {
  const w = g.world;
  if (!w.story.day1Active) return [];
  const out = ERRANDS.filter((e) => w.story.errands[e.id] !== "done").slice(0, 4).map((e) => `· ${e.text}`);
  const left = ERRANDS.filter((e) => w.story.errands[e.id] !== "done").length;
  if (left > 4) out.push(`  and ${left - 4} more`);
  if (!left) out.push("· See Mrs. Gander at the store");
  return out;
}
function prepareDayOne(g) {
  const w = g.world;
  const o = w.town.objects;
  o[`${PLAZA_CRACK[0]},${PLAZA_CRACK[1]}`] = { k: "crack", item: "unknownFossil" };
  o[`${SAPLING_SPOT[0]},${SAPLING_SPOT[1]}`] = { k: "sapling", stage: 1, kind: "pear", mayor: true };
  for (const [x, z] of [[66, 39], [73, 39], [65, 41], [69, 42], [62, 37], [71, 42]]) o[`${x},${z}`] = { k: "weed" };
  w.story.day1Active = true;
  w.story.stage = "dayone";
  w.story.errands = {};
  for (const e of ERRANDS) w.story.errands[e.id] = "open";
  w.museum.open = false;
}
function listenForErrands(g) {
  g.events.on("caught", (e) => {
    const world = g.world;
    if (!world.story.day1Active) return;
    if (ITEMS[e.id]?.cat === "bug" && world.story.errands.net === "got") world.story.errands.net = "caught";
    if (ITEMS[e.id]?.cat === "fish" && world.story.errands.rod === "got") world.story.errands.rod = "caught";
  });
  g.events.on("sold", (e) => {
    if (g.world.story.day1Active && e.id === "weed") completeErrand(g, "weeds");
  });
  g.events.on("dugUp", (e) => {
    if (g.world.story.day1Active && e.item === "unknownFossil") completeErrand(g, "shovel");
  });
  g.events.on("wateredMayorSapling", () => {
    if (g.world.story.day1Active && g.world.story.errands.can === "got") completeErrand(g, "can");
  });
}
function* day1Talk(g, id) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (id === "dorrit" && E.parcel === "open") {
    yield* say(g, id, ["Oh, it's you. You're the new one, mmhm. You look peaky. Everybody looks peaky here, it's the goose.", "This is for Mrs. Gander, mmhm. It's her Tuesday soup. She doesn't eat it. Nobody knows what she does with it.", "Take the parcel to the store. Press the Map if you get lost. You won't get lost. There's four streets and a river, mmhm."]);
    if (!hasRoom(w)) return true;
    addItem(g, "parcel", { questFor: "gander" });
    g.sound("pickUp");
    E.parcel = "got";
    return true;
  }
  if (id === "tavi" && E.net === "open") {
    yield* say(g, id, ["Hi! Hi hi! You're new! I love that for you, isn't it?!", "Here! This is a net! I've got lots! I've got two! Go on, catch a butterfly! Sneak up, swing it, you'll love it, isn't it?!", "Hold the Use button to get ready, and let go to swing! And go slow, or they notice! They're so clever, isn't it?!"]);
    grantTool(g, "net");
    g.sound("reveal");
    E.net = "got";
    return true;
  }
  if (id === "tavi" && E.net === "caught") {
    yield* say(g, id, ["You got one! You got one and it's so sad and I'm so happy, isn't it?!", "Keep the net! Keep it forever! I've got the other one, isn't it?!"]);
    completeErrand(g, "net");
    return true;
  }
  if (id === "bartleby" && E.rod === "open") {
    yield* say(g, id, ["No. | … | You're the one who owes the goose. I'd prefer not to know that, and I do.", "That rod. Take it. It's been leaning there since before you came. It's been bothering the wall.", "Catch me a fish, then. Cast at water. Wait for the plunge. Not the little ones. The plunge. | I'd prefer you didn't."]);
    grantTool(g, "rod");
    g.sound("reveal");
    E.rod = "got";
    return true;
  }
  if (id === "bartleby" && E.rod === "caught") {
    yield* say(g, id, ["You caught one. | … | I don't want it. Keep it. Sell it to the goose.", "I'd prefer not to say thank you. | Keep the rod."]);
    completeErrand(g, "rod");
    return true;
  }
  return false;
}
function* day1Mayor(g) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (E.shovel === "open") {
    yield* say(g, "trundle", HOSTS.trundle.lend);
    grantTool(g, "shovel");
    g.sound("reveal");
    E.shovel = "got";
    yield* say(g, "trundle", ["There's a crack… on the plaza. | Star-shaped. | It's been… annoying me. | Dig it… if you would. | I'd do it… but… | I'm on my way… to something."]);
    return true;
  }
  return false;
}
function* day1Clementine(g) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (E.can === "open") {
    yield* say(g, "clementine", ["Hello. You're the new arrival. I've filled in a form about it. The bee has seen you.", "The Mayor planted a sapling on his way past, a while ago. He can't go back. Somebody should water it.", "Take this can. It's the one that isn't leaking. The sapling is just west of the plaza."]);
    grantTool(g, "can");
    g.sound("reveal");
    E.can = "got";
    return true;
  }
  if (E.letter === "open") {
    yield* say(g, "clementine", ["You should write to your Gran. There's a desk by the wall. Everyone's got a Gran. Mine was a very large capybara."]);
    E.letter = "told";
    return true;
  }
  return false;
}
function* day1Gander(g) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (E.parcel === "got") {
    const i = w.player.pockets.findIndex((s) => s?.id === "parcel");
    if (i >= 0) {
      removeSlot(g, i);
      yield* say(g, "gander", ["Ah. Dorrit's parcel. Thank you, dear. I've taken a little off your bill. And added a little for the delivery."]);
      completeErrand(g, "parcel");
      return true;
    }
  }
  if (errandsDone(w)) {
    yield* say(g, "gander", ["You've paid off 2,000 beans. You're free to go. Not that you were ever not free. Legally.", "The roof's on, dear. I had it put on while you weren't looking. It's on the bill.", "Get some sleep. The bed saves your place in the world. And mine, in your life."]);
    finishDayOne(g);
    return true;
  }
  return false;
}
function finishDayOne(g) {
  const w = g.world;
  w.story.day1Active = false;
  w.story.stage = "free";
  w.flags.shackRoof = true;
  g.town.refreshHome();
  w.player.beans += 300;
  if (w.clock.minute < 18.5 * 60) w.clock.minute = 18.5 * 60;
  sendMail(g, { from: "gran", body: "Dear {player},\nGot your letter. You always did leave things to the last minute. Here's a fruit. Don't plant it near anything you like.\nGran", gift: "fig" });
  sendMail(g, { from: "tavi", body: "Dear {player}!\nYou live here now and it's the best thing that has happened since this morning! Isn't it?!\nTavi", gift: { id: "smileGift", from: "tavi" } });
  g.events.emit("day1Done", {});
}
var ERRANDS, SAPLING_SPOT, PLAZA_CRACK, errandsDone;
var init_dayone = __esm({
  "src/systems/dayone.js"() {
    init_say();
    init_economy();
    init_tools();
    init_mail();
    init_hosts();
    init_town();
    init_tuning();
    init_items();
    ERRANDS = [
      { id: "parcel", text: "Fetch a parcel from Dorrit", pay: 300 },
      { id: "weeds", text: "Pull a weed, sell it at the store", pay: 200 },
      { id: "net", text: "See Tavi, catch a butterfly", pay: 300 },
      { id: "rod", text: "See Bartleby, catch him a fish", pay: 300 },
      { id: "shovel", text: "See the Mayor, dig the plaza crack", pay: 300 },
      { id: "can", text: "Water the Mayor's sapling", pay: 300 },
      { id: "letter", text: "Write to Gran, at the Post", pay: 300 }
    ];
    SAPLING_SPOT = [15, 37];
    PLAZA_CRACK = [22, 44];
    errandsDone = (w) => ERRANDS.every((e) => w.story.errands[e.id] === "done");
  }
});

// src/core/weather.js
function weatherPlan(seed, day, season, rainMult = 1) {
  const rng = new Stream(`${seed}:weather:${day}`);
  const table = WEATHER_TABLE[season].map(([kind2, w]) => [kind2, WET.has(kind2) ? w * rainMult : w]);
  const pick = rng.weighted(table, (e) => e[1]);
  const kind = pick[0];
  const calm = season === 3 ? "clear" : "sun";
  if (kind === calm) return { kind, start: 0, stop: 24, calm };
  const start2 = rng.int(5, 16);
  const stop = Math.min(24, start2 + rng.int(3, 8));
  return { kind, start: start2, stop, calm };
}
function weatherAt(plan, hour) {
  return hour >= plan.start && hour < plan.stop ? plan.kind : plan.calm;
}
var WEATHER_TABLE, WET;
var init_weather = __esm({
  "src/core/weather.js"() {
    init_rng();
    init_calendar();
    WEATHER_TABLE = [
      [["sun", 60], ["rain", 30], ["fog", 10]],
      [["sun", 70], ["rain", 20], ["storm", 10]],
      [["sun", 50], ["wind", 30], ["rain", 20]],
      [["snow", 60], ["clear", 40]]
    ];
    WET = /* @__PURE__ */ new Set(["rain", "storm"]);
  }
});

// src/systems/time.js
function dayWeather(g) {
  const w = g.world;
  const c2 = calendarNow(g);
  const key2 = `${w.clock.day}:${c2.season}:${tuning.rainMult}:${w.flags.forceWeather ?? ""}`;
  if (g.weatherKey !== key2) {
    g.weatherKey = key2;
    g.weatherPlan = w.flags.forceWeather ? { kind: w.flags.forceWeather, start: 0, stop: 30, calm: w.flags.forceWeather } : weatherPlan(w.seed, w.clock.day, c2.season, tuning.rainMult);
    if (c2.festival === "longNight") g.weatherPlan = { kind: "snow", start: 16, stop: 30, calm: "clear" };
    if (c2.festival === "lanternFloat" || c2.festival === "seedToss" || c2.festival === "greatSoup") g.weatherPlan = { kind: "sun", start: 0, stop: 30, calm: c2.season === 3 ? "clear" : "sun" };
  }
  return g.weatherPlan;
}
function weatherNow(g) {
  return weatherAt(dayWeather(g), g.world.clock.minute / 60);
}
function advanceClock(g, dt) {
  const w = g.world;
  const c2 = w.clock;
  if (c2.mode === "real") {
    if (g.realNow) {
      const d = new Date(g.realNow);
      const m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      if (c2.minute < 300 && m >= 300 && c2.lastRealMs != null) {
        c2.minute = m;
        g.newDay();
      } else if (c2.lastRealMs != null && g.realNow - c2.lastRealMs > 864e5) {
        c2.minute = m;
        g.newDay();
      }
      c2.minute = m;
      c2.realMs = g.realNow;
      c2.lastRealMs = g.realNow;
    }
    return;
  }
  const rate = tuning.gameMinutesPerSecond * (w.story.day1Active ? 0.5 : 1);
  const before = c2.minute;
  c2.minute += dt * rate;
  if (before < 300 && c2.minute >= 300) g.newDay();
  if (c2.minute >= 1440) c2.minute -= 1440;
}
var calendarNow, hourNow, absMinute, isRaining;
var init_time = __esm({
  "src/systems/time.js"() {
    init_calendar();
    init_weather();
    init_tuning();
    calendarNow = (g) => calendar(g.world, g.realNow);
    hourNow = (w) => Math.floor(w.clock.minute / 60) % 24;
    absMinute = (w) => w.clock.day * 1440 + w.clock.minute;
    isRaining = (g) => {
      const k = weatherNow(g);
      return k === "rain" || k === "storm";
    };
  }
});

// src/world/objectsView.js
function buildObject(town, k, o) {
  const [x, z] = k.split(",").map(Number);
  const g = town.g;
  const season = g.season ?? 1;
  const cal = g.calendarDay ?? 1;
  const group = new Group4();
  group.position.set(x + 0.5, groundHeight(x + 0.5, z + 0.5), z + 0.5);
  group.userData.key = k;
  const phase = hash32(k) % 628 / 100;
  switch (o.k) {
    case "tree": {
      const leaf = leafFor(season, cal, o.kind);
      const id = o.kind === "pine" ? "tree-pine" : o.kind === "palm" ? "tree-palm" : "tree-pear";
      const fruitColor = o.fruitItem && ITEMS[o.fruitItem]?.iconColors?.o;
      const t = build(id, { palette: { leaf: leaf.leaf, leaf2: leaf.leaf2, ...fruitColor ? { fruit: fruitColor } : {} } });
      const fruit = t.getObjectByName("fruit");
      if (fruit) fruit.visible = (o.fruit ?? 0) > 0 && season !== 3;
      if (leaf.blossom) replaceColor2(t, engine_exports.PALETTE.white, (0, engine_exports.toonMaterial)(BLOSSOM));
      t.rotation.y = phase;
      const s = 0.9 + hash32(`${k}s`) % 30 / 100;
      t.scale.set(s, s, s);
      swayify(t, town.wind, 4, 1.2, 0.05, phase);
      group.add(t);
      if (o.wasp) {
        const n = build("wasp-nest");
        n.position.set(0.7, 1.7, 0.7);
        group.add(n);
      }
      group.userData.canopy = t;
      break;
    }
    case "sapling": {
      const t = build("sapling", { params: { stage: Math.min(2, o.stage ?? 0) } });
      group.add(t);
      break;
    }
    case "stump":
      group.add(build("stump", { params: { d: 0.6 } }));
      break;
    case "rock":
      group.add(build("rock-prop"));
      break;
    case "flower": {
      const f = build("flower", { params: { species: o.species, wilt: o.wilt >= 2 ? 1 : 0, big: o.hybrid ? 1 : 0 }, palette: { petal: FLOWER_COLORS[o.color] ?? "red" } });
      f.rotation.y = phase;
      group.add(f);
      break;
    }
    case "weed":
      group.add(build("weed"));
      group.rotation.y = phase;
      break;
    case "hole":
      group.add(build("hole"));
      break;
    case "crack":
      group.add(build("crack-mark"));
      group.rotation.y = phase;
      break;
    case "sparkle":
      group.userData.sparkle = true;
      group.add(build("crack-mark"));
      group.scale.set(0.5, 1, 0.5);
      break;
    case "shell":
      group.add(build("shell-prop"));
      group.rotation.y = phase;
      break;
    case "driftwood":
      group.add(build("driftwood"));
      group.rotation.y = phase;
      break;
    case "beanstalk":
      group.add(build("beanstalk", { params: { stage: Math.min(2, o.stage ?? 0) } }));
      break;
    case "snowball": {
      const b = build("snowball");
      const s = o.size ?? 0.5;
      b.scale.set(s, s, s);
      group.add(b);
      group.position.x = o.x ?? x + 0.5;
      group.position.z = o.z ?? z + 0.5;
      break;
    }
    case "snowman":
      group.add(build("snowman"));
      break;
    case "drop": {
      const it = ITEMS[o.item];
      let m;
      if (it?.cat === "bag") m = build("drop-bag", { palette: { bag: it.iconColors.o, tie: it.iconColors.x } });
      else if (it?.cat === "fruit") m = build("pear-drop", { palette: { a: it.iconColors.o } });
      else if (it?.cat === "cheese") m = build("cheese-wheel");
      else if (it?.cat === "gift") m = build("balloon");
      else m = build("drop-leaf", { palette: { a: it?.iconColors?.o === "white" ? "mist" : it?.iconColors?.o ?? "lime", b: it?.iconColors?.x ?? "green" } });
      group.add(m);
      if (it?.cat === "gift") {
        m.position.y = -1.1;
        m.scale.set(1, 1, 1);
        group.userData.giftDrop = true;
      }
      group.rotation.y = phase;
      break;
    }
    case "ring":
      group.add(build("chalk-ring"));
      break;
    case "pattern": {
      const tex = town.g.patternTexture?.(o.slot);
      if (tex) {
        const p = new Mesh3(new BoxGeometry2(1, 0.02, 1), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: tex }));
        p.position.y = 0.012;
        group.add(p);
      }
      break;
    }
    case "patternSign": {
      const tex = town.g.patternTexture?.(o.slot);
      const post = new Mesh3(new BoxGeometry2(0.1, 1.1, 0.1), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.plum));
      post.position.y = 0.55;
      group.add(post);
      if (tex) {
        const board = new Mesh3(new BoxGeometry2(0.9, 0.9, 0.06), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: tex }));
        board.position.set(0, 1.3, 0.06);
        group.add(board);
      }
      break;
    }
    default:
      break;
  }
  return group;
}
function syncObjects(town) {
  const objects = town.g.world.town.objects;
  for (const k of town.dirty) {
    const old = town.objectViews.get(k);
    if (old) {
      old.removeFromParent();
      town.objectViews.delete(k);
    }
    const o = objects[k];
    if (o) {
      const v2 = buildObject(town, k, o);
      town.objectsGroup.add(v2);
      town.objectViews.set(k, v2);
    }
    const [x, z] = k.split(",").map(Number);
    town.nav.setOpen(x, z, !town.solid[z * 80 + x] && !town.objectBlocks(x, z));
  }
  town.dirty.clear();
}
function rebuildAllObjects(town) {
  for (const v2 of town.objectViews.values()) v2.removeFromParent();
  town.objectViews.clear();
  town.dirty.clear();
  for (const k of Object.keys(town.g.world.town.objects)) town.dirty.add(k);
  syncObjects(town);
  town.syncNav();
}
var Group4, Mesh3, BoxGeometry2, build, replaceColor2;
var init_objectsView = __esm({
  "src/world/objectsView.js"() {
    init_engine();
    init_models();
    init_town2();
    init_tiles();
    init_items();
    init_rng();
    ({ Group: Group4, Mesh: Mesh3, BoxGeometry: BoxGeometry2 } = engine_exports.THREE);
    build = (id, opts = {}) => {
      const o = (0, engine_exports.buildModel)(id, { catalog: MODELS, ...opts }).object;
      o.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      return o;
    };
    replaceColor2 = (obj, hex, to) => obj.traverse((m) => {
      if (m.isMesh && m.material?.color?.getHex?.() === hex) m.material = to;
    });
  }
});

// src/actors/clips.js
function gait(name, frames, { leg, arm, bob, lean = 0, headBob = 0, speed }) {
  const a = (t) => ({
    Pelvis: P(t ? bob * 0.5 : -bob * 0.5, 0, 0, [lean, t ? 3 : -3, 0]),
    Torso: [0, t ? -5 : 5, 0],
    Head: [headBob, t ? 3 : -3, 0],
    LegR: [t ? leg : -leg, 0, 0],
    LegL: [t ? -leg : leg, 0, 0],
    ArmR: [t ? -arm : arm, 0, -4],
    ArmL: [t ? arm : -arm, 0, 4]
  });
  const mid = (t) => ({
    Pelvis: P(bob, 0, 0, [lean, 0, 0]),
    Torso: [0, 0, 0],
    Head: [headBob, 0, 0],
    LegR: [t ? -leg * 0.15 : leg * 0.15, 0, 0],
    LegL: [t ? leg * 0.15 : -leg * 0.15, 0, 0],
    ArmR: [0, 0, -4],
    ArmL: [0, 0, 4]
  });
  const h = frames / 2, q = frames / 4;
  return loop(name, frames, [[0, a(true)], [q, mid(true)], [h, a(false)], [h + q, mid(false)], [frames, a(true)]], { speed });
}
var REST, P, clip, loop, breathe, ARM_FWD, ARMS_UP, CLIPS, CLIP_NAMES;
var init_clips = __esm({
  "src/actors/clips.js"() {
    REST = {};
    P = (y = 0, x = 0, z = 0, r = [0, 0, 0], s) => ({ p: [x, y, z], r, ...s ? { s } : {} });
    clip = (name, frames, keys, o = {}) => ({ name, frames, keys, ...o });
    loop = (name, frames, keys, o = {}) => ({ name, frames, loop: true, keys, ...o });
    breathe = (period = 40, a = 0.012) => [{ joint: "Pelvis", channel: "py", amplitude: a, period }, { joint: "Head", channel: "rx", amplitude: 1.5, period, phase: 0.3 }];
    ARM_FWD = { ArmR: [-70, 0, 0], ArmL: [-70, 0, 0] };
    ARMS_UP = { ArmR: [-170, 0, -8], ArmL: [-170, 0, 8] };
    CLIPS = [
      loop("Idle", 80, [[0, REST], [80, REST]], { layers: breathe() }),
      loop("IdleBored", 120, [[0, REST], [40, { Head: [0, 28, 0], Torso: [0, 6, 0] }], [70, { Head: [0, -26, 0], Torso: [0, -6, 0] }], [120, REST]], { layers: breathe() }),
      gait("Tiptoe", 36, { leg: 16, arm: 8, bob: 0.035, lean: 8, headBob: 6, speed: 1.2 }),
      gait("Walk", 28, { leg: 26, arm: 18, bob: 0.04, speed: 2.6 }),
      gait("Jog", 20, { leg: 40, arm: 34, bob: 0.06, lean: 5, speed: 4.2 }),
      gait("Run", 15, { leg: 58, arm: 56, bob: 0.08, lean: 12, headBob: -6, speed: 6 }),
      loop("Talk", 24, [[0, { Head: [4, 0, 0] }], [8, { Head: [-3, 3, 1], Torso: [-2, 0, 0], ArmR: [-12, 0, -6] }], [16, { Head: [5, -3, -1], ArmL: [-12, 0, 6] }], [24, { Head: [4, 0, 0] }]], { layers: breathe(24, 8e-3) }),
      loop("Listen", 48, [[0, { Head: [3, 0, 3] }], [24, { Head: [6, 0, -3] }], [48, { Head: [3, 0, 3] }]], { layers: breathe(48) }),
      clip("Nod", 18, [[0, REST], [5, { Head: [16, 0, 0] }, "out"], [10, { Head: [-4, 0, 0] }], [14, { Head: [10, 0, 0] }], [18, REST]]),
      clip("ShakeHead", 24, [[0, REST], [6, { Head: [0, 22, 0] }], [12, { Head: [0, -22, 0] }], [18, { Head: [0, 16, 0] }], [24, REST]]),
      clip("Laugh", 30, [[0, REST], [6, { Pelvis: P(0.04), Torso: [-10, 0, 0], Head: [-16, 0, 0], ArmR: [-30, 0, -20], ArmL: [-30, 0, 20] }], [12, { Pelvis: P(-0.02), Torso: [4, 0, 0], Head: [2, 0, 0], ArmR: [-20, 0, -14], ArmL: [-20, 0, 14] }], [18, { Pelvis: P(0.04), Torso: [-10, 0, 0], Head: [-16, 0, 0], ArmR: [-30, 0, -20], ArmL: [-30, 0, 20] }], [24, { Pelvis: P(-0.02), Torso: [4, 0, 0], Head: [2, 0, 0] }], [30, REST]]),
      clip("Cry", 40, [[0, REST], [10, { Head: [22, 0, 0], ArmR: [-120, 0, 14], ArmL: [-120, 0, -14], Torso: [10, 0, 0] }], [20, { Head: [28, 0, 3], ArmR: [-125, 0, 14], ArmL: [-125, 0, -14], Torso: [14, 0, 0] }], [30, { Head: [22, 0, -3], ArmR: [-120, 0, 14], ArmL: [-120, 0, -14], Torso: [10, 0, 0] }], [40, REST]]),
      clip("Shock", 30, [[0, REST], [3, { Pelvis: P(0.12, 0, 0, [0, 0, 0], [0.92, 1.12, 0.92]), Head: [-12, 0, 0], ...ARMS_UP }, "out"], [18, { Pelvis: P(0.02), Head: [-6, 0, 0], ArmR: [-140, 0, -24], ArmL: [-140, 0, 24] }], [30, REST]]),
      clip("Anger", 30, [[0, REST], [5, { Torso: [10, 0, 0], Head: [8, 0, 0], ArmR: [-50, 0, -30], ArmL: [-50, 0, 30] }], [10, { Pelvis: P(0.04), Torso: [12, 8, 0], ArmR: [-70, 0, -30], ArmL: [-40, 0, 30] }], [15, { Torso: [12, -8, 0], ArmR: [-40, 0, -30], ArmL: [-70, 0, 30] }], [20, { Pelvis: P(0.04), Torso: [12, 8, 0], ArmR: [-70, 0, -30], ArmL: [-40, 0, 30] }], [30, REST]]),
      clip("Love", 36, [[0, REST], [8, { Torso: [-6, 0, 0], Head: [-10, 0, 8], ArmR: [-100, 40, 20], ArmL: [-100, -40, -20] }], [24, { Torso: [-6, 0, 0], Head: [-10, 0, -8], ArmR: [-110, 40, 20], ArmL: [-110, -40, -20] }], [36, REST]]),
      clip("Shrug", 26, [[0, REST], [6, { ArmR: [-20, 0, -50], ArmL: [-20, 0, 50], Head: [4, 0, 8], Torso: [0, 0, 0], Pelvis: P(0.02) }], [18, { ArmR: [-20, 0, -50], ArmL: [-20, 0, 50], Head: [4, 0, -8], Pelvis: P(0.02) }], [26, REST]]),
      clip("Bow", 30, [[0, REST], [10, { Torso: [50, 0, 0], Head: [12, 0, 0], ArmR: [10, 0, 0], ArmL: [-90, 0, -30] }], [20, { Torso: [50, 0, 0], Head: [12, 0, 0], ArmR: [10, 0, 0], ArmL: [-90, 0, -30] }], [30, REST]]),
      loop("Dance", 40, [[0, { Pelvis: P(0, 0.06), Torso: [0, 0, 8], ArmR: [-120, 0, -30], ArmL: [-30, 0, 30], LegR: [-20, 0, 0], Head: [0, 0, -6] }], [10, { Pelvis: P(0.08), ArmR: [-90, 0, -30], ArmL: [-90, 0, 30] }], [20, { Pelvis: P(0, -0.06), Torso: [0, 0, -8], ArmR: [-30, 0, -30], ArmL: [-120, 0, 30], LegL: [-20, 0, 0], Head: [0, 0, 6] }], [30, { Pelvis: P(0.08), ArmR: [-90, 0, -30], ArmL: [-90, 0, 30] }], [40, { Pelvis: P(0, 0.06), Torso: [0, 0, 8], ArmR: [-120, 0, -30], ArmL: [-30, 0, 30], LegR: [-20, 0, 0], Head: [0, 0, -6] }]]),
      clip("Wave", 30, [[0, REST], [5, { ArmR: [-160, 0, -30] }], [10, { ArmR: [-160, 0, -55], Head: [0, 0, 4] }], [15, { ArmR: [-160, 0, -20], Head: [0, 0, -4] }], [20, { ArmR: [-160, 0, -55], Head: [0, 0, 4] }], [25, { ArmR: [-160, 0, -30] }], [30, REST]]),
      loop("Sit", 60, [[0, { Pelvis: P(-0.14), LegR: [-85, 0, 0], LegL: [-85, 0, 0], ArmR: [-20, 0, 0], ArmL: [-20, 0, 0] }], [60, { Pelvis: P(-0.14), LegR: [-85, 0, 0], LegL: [-85, 0, 0], ArmR: [-20, 0, 0], ArmL: [-20, 0, 0] }]], { layers: breathe(60, 6e-3) }),
      loop("Sleep", 80, [[0, { Pelvis: P(-0.1, 0, 0, [-85, 0, 0]), ArmR: [0, 0, -8], ArmL: [0, 0, 8], Head: [-5, 0, 10] }], [80, { Pelvis: P(-0.1, 0, 0, [-85, 0, 0]), ArmR: [0, 0, -8], ArmL: [0, 0, 8], Head: [-5, 0, 10] }]], { layers: [{ joint: "Torso", channel: "rx", amplitude: 2, period: 80 }] }),
      clip("PlayDead", 24, [[0, REST], [6, { Pelvis: P(0.06), ...ARMS_UP }, "out"], [18, { Pelvis: P(-0.2, 0, 0, [90, 0, 0]), ArmR: [-90, 0, -50], ArmL: [-90, 0, 50], LegR: [-60, 0, 0], LegL: [-50, 0, 0], Head: [-6, 0, 24] }, "in"], [24, { Pelvis: P(-0.22, 0, 0, [92, 0, 0]), ArmR: [-90, 0, -50], ArmL: [-90, 0, 50], LegR: [-60, 0, 0], LegL: [-50, 0, 0], Head: [-6, 0, 24] }]]),
      clip("HoldUp", 40, [[0, REST], [4, { Pelvis: P(-0.06, 0, 0, [0, 0, 0], [1.1, 0.88, 1.1]) }], [8, { Pelvis: P(0.1, 0, 0, [0, 0, 0], [0.94, 1.08, 0.94]), Head: [-14, 0, 0], ...ARMS_UP }, "outBack"], [34, { Pelvis: P(0.02), Head: [-14, 0, 0], ...ARMS_UP }], [40, { Head: [-10, 0, 0], ...ARMS_UP }]]),
      clip("PickUp", 20, [[0, REST], [7, { Pelvis: P(-0.1), Torso: [45, 0, 0], ArmR: [-60, 0, 0], ArmL: [-60, 0, 0], LegR: [-18, 0, 0], LegL: [-18, 0, 0] }], [12, { Pelvis: P(-0.1), Torso: [45, 0, 0], ArmR: [-70, 0, 0], ArmL: [-70, 0, 0], LegR: [-18, 0, 0], LegL: [-18, 0, 0] }], [20, REST]]),
      clip("Give", 24, [[0, REST], [8, { Torso: [8, 0, 0], ...ARM_FWD }], [18, { Torso: [8, 0, 0], ...ARM_FWD }], [24, REST]]),
      loop("NetReady", 30, [[0, { ArmR: [-150, -30, -10], Torso: [-6, -25, 0], Head: [0, 20, 0], LegR: [10, 0, 0], LegL: [-10, 0, 0] }], [30, { ArmR: [-150, -30, -10], Torso: [-6, -25, 0], Head: [0, 20, 0], LegR: [10, 0, 0], LegL: [-10, 0, 0] }]], { layers: breathe(30, 0.01) }),
      clip("NetSweep", 15, [[0, { ArmR: [-150, -30, -10], Torso: [-6, -25, 0] }], [3, { ArmR: [-165, -45, -10], Torso: [-8, -35, 0] }, "in"], [8, { ArmR: [-70, 60, -30], Torso: [14, 45, 0], Head: [8, -10, 0] }, "out"], [15, REST]], { fast: true }),
      clip("Cast", 20, [[0, REST], [6, { ArmR: [-170, 0, 0], Torso: [-12, 0, 0] }, "in"], [12, { ArmR: [-70, 0, 0], Torso: [14, 0, 0], Head: [10, 0, 0] }, "out"], [20, { ArmR: [-60, 0, 0], Torso: [4, 0, 0] }]], { fast: true }),
      loop("Reel", 16, [[0, { ArmR: [-70, 0, 0], ArmL: [-50, 0, 10], Torso: [-6, 0, 0] }], [8, { ArmR: [-80, 0, 0], ArmL: [-40, 0, 10], Torso: [-10, 0, 0] }], [16, { ArmR: [-70, 0, 0], ArmL: [-50, 0, 10], Torso: [-6, 0, 0] }]]),
      clip("Dig", 22, [[0, REST], [6, { ArmR: [-120, 0, 0], ArmL: [-110, 0, 0], Torso: [-10, 0, 0] }], [11, { Pelvis: P(-0.08), ArmR: [-30, 0, 0], ArmL: [-30, 0, 0], Torso: [40, 0, 0], LegR: [-14, 0, 0] }, "out"], [16, { ArmR: [-70, 30, 0], ArmL: [-70, 30, 0], Torso: [10, 30, 0] }], [22, REST]], { fast: true }),
      clip("Chop", 18, [[0, REST], [6, { ArmR: [-170, 0, 0], Torso: [-10, -15, 0], Head: [-6, 0, 0] }, "in"], [10, { ArmR: [-70, 0, 0], Torso: [18, 15, 0], Head: [6, 0, 0] }, "out"], [18, REST]], { fast: true }),
      clip("Water", 28, [[0, REST], [6, { ArmR: [-80, 0, 0], Torso: [10, 0, 0], Head: [12, 0, 0] }], [22, { ArmR: [-70, 0, 12], Torso: [12, 0, 0], Head: [14, 0, 0] }], [28, REST]]),
      clip("ShakeTree", 24, [[0, REST], [4, { ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], Torso: [8, 0, 0] }], [8, { Pelvis: P(0, 0, 0.06), ArmR: [-80, 0, 0], ArmL: [-100, 0, 0], Torso: [14, 6, 0] }], [12, { Pelvis: P(0, 0, -0.06), ArmR: [-100, 0, 0], ArmL: [-80, 0, 0], Torso: [2, -6, 0] }], [16, { Pelvis: P(0, 0, 0.06), ArmR: [-80, 0, 0], ArmL: [-100, 0, 0], Torso: [14, 6, 0] }], [24, REST]]),
      clip("Slingshot", 20, [[0, REST], [6, { ArmR: [-85, 10, 0], ArmL: [-85, -30, 0], Torso: [-4, 15, 0], Head: [-14, -10, 0] }], [12, { ArmR: [-85, 10, 0], ArmL: [-100, -60, 0], Torso: [-4, 20, 0], Head: [-14, -10, 0] }], [14, { ArmR: [-90, 10, 0], ArmL: [-50, 0, 0], Torso: [-4, 5, 0] }, "out"], [20, REST]], { fast: true }),
      loop("PushSnow", 24, [[0, { Pelvis: P(0, 0, 0, [18, 0, 0]), ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], LegR: [30, 0, 0], LegL: [-30, 0, 0] }], [12, { Pelvis: P(0.03, 0, 0, [18, 0, 0]), ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], LegR: [-30, 0, 0], LegL: [30, 0, 0] }], [24, { Pelvis: P(0, 0, 0, [18, 0, 0]), ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], LegR: [30, 0, 0], LegL: [-30, 0, 0] }]]),
      clip("Eat", 26, [[0, REST], [6, { ArmR: [-140, 30, 20], Head: [6, 0, 0] }], [12, { ArmR: [-150, 30, 20], Head: [-6, 0, 0] }], [18, { ArmR: [-140, 30, 20], Head: [6, 0, 0] }], [26, REST]]),
      loop("Hum", 40, [[0, { Head: [-6, 0, 6], Torso: [0, 0, 2] }], [20, { Head: [-6, 0, -6], Torso: [0, 0, -2] }], [40, { Head: [-6, 0, 6], Torso: [0, 0, 2] }]]),
      loop("Sway", 48, [[0, { Pelvis: P(0, 0.05), Torso: [0, 0, 6], Head: [0, 0, 4], ArmR: [-6, 0, -8], ArmL: [-6, 0, 8] }], [24, { Pelvis: P(0, -0.05), Torso: [0, 0, -6], Head: [0, 0, -4], ArmR: [-6, 0, -8], ArmL: [-6, 0, 8] }], [48, { Pelvis: P(0, 0.05), Torso: [0, 0, 6], Head: [0, 0, 4], ArmR: [-6, 0, -8], ArmL: [-6, 0, 8] }]]),
      clip("Sting", 28, [[0, REST], [3, { Pelvis: P(0.16), Head: [-20, 0, 0], ...ARMS_UP }, "out"], [10, { Pelvis: P(0.02), Head: [10, 16, 0], ArmR: [-140, 0, -8], ArmL: [-140, 0, 8] }], [18, { Head: [10, -16, 0], ArmR: [-140, 0, -8], ArmL: [-140, 0, 8] }], [28, REST]]),
      clip("Slip", 30, [[0, REST], [5, { Pelvis: P(0.02, 0, 0, [-20, 0, 0]), LegR: [-60, 0, 0], ArmR: [-120, 0, -40], ArmL: [-120, 0, 40] }], [12, { Pelvis: P(-0.14, 0, 0, [-50, 0, 0]), LegR: [-90, 0, 0], LegL: [-70, 0, 0], ArmR: [-100, 0, -40], ArmL: [-100, 0, 40] }], [22, { Pelvis: P(-0.14, 0, 0, [-50, 0, 0]), LegR: [-90, 0, 0], LegL: [-70, 0, 0], Head: [14, 0, 0] }], [30, REST]]),
      // species specials
      loop("MayorSlide", 60, [[0, { Pelvis: P(0, 0, 0, [0, 0, 0], [1.06, 0.94, 1.06]), Head: [4, 0, 0] }], [30, { Pelvis: P(0.01, 0, 0, [0, 0, 0], [0.96, 1.04, 0.96]), Head: [-4, 0, 0] }], [60, { Pelvis: P(0, 0, 0, [0, 0, 0], [1.06, 0.94, 1.06]), Head: [4, 0, 0] }]]),
      loop("VesperHang", 40, [[0, { Pelvis: P(0, 0, 0, [180, 0, 0]), ArmR: [-80, 30, 0], ArmL: [-80, -30, 0], LegR: [0, 0, 0], LegL: [0, 0, 0], Head: [10, 0, 6] }], [20, { Pelvis: P(0, 0, 0, [180, 0, 6]), ArmR: [-90, 16, 0], ArmL: [-90, -16, 0], Head: [10, 0, -6] }], [40, { Pelvis: P(0, 0, 0, [180, 0, 0]), ArmR: [-80, 30, 0], ArmL: [-80, -30, 0], LegR: [0, 0, 0], LegL: [0, 0, 0], Head: [10, 0, 6] }]]),
      loop("PimmScuttle", 16, [[0, { Pelvis: P(0.02, 0.04), LegR: [30, 0, 0], LegL: [-30, 0, 0], ArmR: [-50, 0, -20], ArmL: [-50, 0, 20] }], [8, { Pelvis: P(0.04, -0.04), LegR: [-30, 0, 0], LegL: [30, 0, 0], ArmR: [-70, 0, -20], ArmL: [-70, 0, 20] }], [16, { Pelvis: P(0.02, 0.04), LegR: [30, 0, 0], LegL: [-30, 0, 0], ArmR: [-50, 0, -20], ArmL: [-50, 0, 20] }]]),
      loop("RoccoRoll", 20, [[0, { Pelvis: P(-0.1, 0, 0, [0, 0, 0]), Torso: [40, 0, 0], Head: [40, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, "linear"], [10, { Pelvis: P(-0.1, 0, 0, [180, 0, 0]), Torso: [40, 0, 0], Head: [40, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, "linear"], [20, { Pelvis: P(-0.1, 0, 0, [360, 0, 0]), Torso: [40, 0, 0], Head: [40, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, "linear"]], { fast: true }),
      loop("QuillBall", 16, [[0, { Pelvis: P(-0.12, 0, 0, [0, 0, 0], [1, 0.8, 1]), Torso: [50, 0, 0], Head: [50, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, "linear"], [8, { Pelvis: P(-0.04, 0, 0, [180, 0, 0], [1, 0.8, 1]), Torso: [50, 0, 0], Head: [50, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, "linear"], [16, { Pelvis: P(-0.12, 0, 0, [360, 0, 0], [1, 0.8, 1]), Torso: [50, 0, 0], Head: [50, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, "linear"]], { fast: true }),
      loop("Accordion", 30, [[0, { ArmR: [-70, 40, -20], ArmL: [-70, -40, 20], Head: [4, 0, 6] }], [15, { ArmR: [-70, 10, -40], ArmL: [-70, -10, 40], Head: [4, 0, -6] }], [30, { ArmR: [-70, 40, -20], ArmL: [-70, -40, 20], Head: [4, 0, 6] }]]),
      clip("Paddle", 14, [[0, REST], [5, { ArmR: [-170, 0, -6], Torso: [-6, 0, 0], Pelvis: P(0.06) }, "out"], [10, { ArmR: [-165, 0, -6] }], [14, REST]], { fast: true }),
      clip("Honk", 26, [[0, REST], [6, { Pelvis: P(-0.04), Torso: [10, 0, 0], Head: [18, 0, 0] }], [10, { Pelvis: P(0.08, 0, 0, [0, 0, 0], [0.92, 1.12, 0.92]), Torso: [-16, 0, 0], Head: [-30, 0, 0] }, "out"], [18, { Torso: [-12, 0, 0], Head: [-24, 0, 0] }], [26, REST]])
    ];
    CLIP_NAMES = CLIPS.map((c2) => c2.name);
  }
});

// src/actors/rig.js
function clipsFor(obj) {
  const parts = RIG.joints.map((j) => {
    const o = obj.getObjectByName(j);
    return o ? `${o.position.x.toFixed(2)},${o.position.y.toFixed(2)},${o.position.z.toFixed(2)}` : "-";
  });
  const k = parts.join("|");
  let c2 = clipCache.get(k);
  if (!c2) {
    c2 = (0, engine_exports.compileClips)(CLIPS, RIG, obj);
    clipCache.set(k, c2);
  }
  return c2;
}
var AnimationMixer, Group5, LoopOnce, LoopRepeat, Vector32, RIG, clipCache, LOOPS, tmp, Actor;
var init_rig = __esm({
  "src/actors/rig.js"() {
    init_engine();
    init_clips();
    init_models();
    ({ AnimationMixer, Group: Group5, LoopOnce, LoopRepeat, Vector3: Vector32 } = engine_exports.THREE);
    RIG = {
      joints: ["Pelvis", "Torso", "Head", "ArmR", "ArmL", "LegR", "LegL"],
      root: "Pelvis",
      mirror: { ArmR: "ArmL", ArmL: "ArmR", LegR: "LegL", LegL: "LegR" },
      soles: [],
      trace: [],
      limits: {},
      fps: 30
    };
    clipCache = /* @__PURE__ */ new Map();
    LOOPS = new Set(CLIPS.filter((c2) => c2.loop).map((c2) => c2.name));
    tmp = new Vector32();
    Actor = class {
      constructor(def, { name = "", shadow = true, seed = 1 } = {}) {
        this.name = name;
        this.root = new Group5();
        this.x = 0;
        this.z = 0;
        this.y = 0;
        this.facing = 0;
        this.turnTo = null;
        this.current = null;
        this.locked = 0;
        this.blink = 1 + seed % 5 * 0.7;
        this.talk = 0;
        this.talkAmp = 0;
        this.headLook = null;
        this.shadowRadius = 0.4;
        this.hasShadow = shadow;
        this.shadow = shadow ? new engine_exports.ContactShadow(0.4) : null;
        this.scale = 1;
        this.squash = 0;
        this.squashV = 0;
        this.time = seed * 0.37;
        this.setModel(def);
      }
      setModel(def) {
        const old = this.model;
        if (old) this.root.remove(old);
        const obj = (0, engine_exports.buildModel)(def, { catalog: MODELS }).object;
        (0, engine_exports.setLookLayer)(obj, "actors");
        obj.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.frustumCulled = false;
          }
        });
        this.model = obj;
        this.root.add(obj);
        this.clips = clipsFor(obj);
        this.byName = new Map(this.clips.map((c2) => [c2.name, c2]));
        this.mixer = new AnimationMixer(obj);
        this.current = null;
        this.tailSegs = [];
        for (let i = 0; obj.getObjectByName(`TailSeg${i}`); i++) this.tailSegs.push(obj.getObjectByName(`TailSeg${i}`));
        this.tailChain = this.tailSegs.length ? new engine_exports.SpringChain({ segments: this.tailSegs.length, length: 0.2, rest: [0, 0.75, -0.66], stiffness: 12, keep: 0.9, gravity: 3 }) : null;
        this.head = obj.getObjectByName("Head");
        this.eyeR = obj.getObjectByName("EyeR");
        this.eyeL = obj.getObjectByName("EyeL");
        this.mouth = obj.getObjectByName("Mouth");
        this.bee = obj.getObjectByName("Bee");
        this.handR = obj.getObjectByName("ArmR");
        if (this.heldDef) this.hold(this.heldDef, this.heldBuild);
        this.play("Idle", 0);
      }
      /** Cross-fade to a clip. `once` clips hold their last frame until something else plays. */
      play(name, fade = 0.15, { speed = 1, once = false } = {}) {
        const clip2 = this.byName.get(name);
        if (!clip2) return;
        if (this.current?.name === name && !once) {
          this.current.action.timeScale = speed;
          return;
        }
        const action = this.mixer.clipAction(clip2);
        action.reset();
        action.timeScale = speed;
        action.enabled = true;
        if (LOOPS.has(name) && !once) action.setLoop(LoopRepeat, Infinity);
        else {
          action.setLoop(LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        action.play();
        if (this.current && fade > 0) this.current.action.crossFadeTo(action, fade, false);
        else if (this.current) this.current.action.stop();
        this.current = { name, action, once: !LOOPS.has(name) || once, duration: clip2.duration / Math.max(0.01, speed) };
      }
      get playing() {
        return this.current?.name ?? "";
      }
      get finished() {
        const c2 = this.current;
        return !c2 || c2.once && c2.action.time >= c2.action.getClip().duration - 1e-3;
      }
      /** An open umbrella in the other hand. Pass null to fold it. */
      setUmbrella(palette, material = null) {
        const k = palette ? `${palette.a}:${palette.b}` : null;
        if (k === this.umbrellaKey) return;
        this.umbrellaKey = k;
        if (this.umbrella) {
          this.umbrella.removeFromParent();
          this.umbrella = null;
        }
        if (!palette) return;
        const obj = (0, engine_exports.buildModel)("umbrella-prop", { catalog: MODELS, palette }).object;
        (0, engine_exports.setLookLayer)(obj, "actors");
        if (material) obj.traverse((m) => {
          if (m.isMesh && m.material?.color?.getHex?.() === engine_exports.PALETTE[palette.a]) m.material = material;
        });
        obj.position.set(0.32, 0.5, 0);
        this.root.add(obj);
        this.umbrella = obj;
      }
      /** Put something in the right hand. */
      hold(defOrId, opts = {}) {
        if (this.held) {
          this.held.removeFromParent();
          this.held = null;
        }
        this.heldDef = defOrId;
        this.heldBuild = opts;
        if (!defOrId) return;
        const obj = (0, engine_exports.buildModel)(defOrId, { catalog: MODELS, ...opts }).object;
        (0, engine_exports.setLookLayer)(obj, "actors");
        const hand = new Group5();
        hand.position.set(-0.08, -0.34, 0.04);
        hand.rotation.x = Math.PI * 0.5;
        hand.add(obj);
        this.handR?.add(hand);
        this.held = hand;
      }
      faceToward(x, z) {
        this.turnTo = Math.atan2(x - this.x, z - this.z);
      }
      update(dt) {
        this.time += dt;
        this.mixer.update(dt);
        if (this.turnTo !== null) {
          let d = this.turnTo - this.facing;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          const step = Math.min(Math.abs(d), dt * 10);
          this.facing += Math.sign(d) * step;
          if (Math.abs(d) < 0.01) this.turnTo = null;
        }
        this.root.position.set(this.x, this.y, this.z);
        this.root.rotation.y = this.facing;
        if (this.squash || this.squashV) {
          this.squashV += (-140 * this.squash - 14 * this.squashV) * dt;
          this.squash += this.squashV * dt;
          if (Math.abs(this.squash) < 2e-3 && Math.abs(this.squashV) < 0.02) {
            this.squash = 0;
            this.squashV = 0;
          }
        }
        const s = 1 + this.squash;
        const h = 1 / Math.sqrt(Math.max(0.2, s));
        this.root.scale.set(this.scale * h, this.scale * s, this.scale * h);
        this.blink -= dt;
        const closed = this.blink < 0.12;
        if (this.blink < 0) this.blink = 2 + this.time * 977 % 3.5;
        const eyeY = this.eyesClosed ? 0.18 : closed ? 0.18 : 1;
        if (this.eyeR) this.eyeR.scale.y = eyeY;
        if (this.eyeL) this.eyeL.scale.y = eyeY;
        this.talkAmp = Math.max(0, this.talkAmp - dt * 7);
        if (this.mouth) this.mouth.scale.y = 1 + this.talkAmp * 4 + (this.smile ?? 0);
        if (this.bee) {
          this.bee.position.x += Math.sin(this.time * 9) * 15e-4;
          this.bee.position.y += Math.cos(this.time * 7) * 12e-4;
          this.bee.rotation.y = this.time * 2;
        }
        if (this.tailChain) {
          const sf = Math.sin(this.facing), cf = Math.cos(this.facing);
          const root = [this.x - sf * 0.28, this.y + 0.42, this.z - cf * 0.28];
          this.tailChain.update(dt, root, [[-cf, 0, sf], [0, 1, 0], [sf, 0, cf]]);
          const pts = this.tailChain.points;
          this.tailSegs.forEach((seg, i) => {
            const wx = pts[i + 1][0] - this.x, wy = pts[i + 1][1] - this.y - seg.parent.position.y, wz = pts[i + 1][2] - this.z;
            seg.position.set(wx * cf - wz * sf, wy, wx * sf + wz * cf);
          });
        }
        if (this.head && this.headLook) {
          tmp.set(this.headLook[0] - this.x, 0, this.headLook[1] - this.z);
          let d = Math.atan2(tmp.x, tmp.z) - this.facing;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          this.head.rotation.y += engine_exports.THREE.MathUtils.clamp(d, -0.9, 0.9);
        }
        if (this.shadow) this.shadow.place(this.root.position.x + (this.parentOffset?.x ?? 0), this.y, this.root.position.z + (this.parentOffset?.z ?? 0), 0);
      }
      /** Parent into a place's group. The contact shadow lives in the same group. */
      addTo(group) {
        group.add(this.root);
        if (this.shadow) group.add(this.shadow);
      }
      remove() {
        this.root.removeFromParent();
        this.shadow?.removeFromParent();
      }
      set visible(v2) {
        this.root.visible = v2;
        if (this.shadow) this.shadow.visible = v2;
      }
      get visible() {
        return this.root.visible;
      }
      /** Swap a palette colour's material for another material (a pattern shirt). */
      swapMaterial(fromHex, material) {
        this.model.traverse((o) => {
          if (o.isMesh && o.material?.color?.getHex?.() === fromHex) o.material = material;
        });
      }
    };
  }
});

// src/audio/sfx.js
var N, SQ, TR, SI, SFX_DEFS, LOOP_DEFS, SFX_COUNT;
var init_sfx = __esm({
  "src/audio/sfx.js"() {
    N = (freq, decay, volume, o = {}) => ({ wave: "noise", freq, decay, volume, ...o });
    SQ = (freq, decay, volume, o = {}) => ({ wave: "square", freq, decay, volume, ...o });
    TR = (freq, decay, volume, o = {}) => ({ wave: "triangle", freq, decay, volume, ...o });
    SI = (freq, decay, volume, o = {}) => ({ wave: "sine", freq, decay, volume, ...o });
    SFX_DEFS = {
      uiTick: SQ(880, 0.03, 0.12, { duty: 0.25 }),
      uiConfirm: TR(660, 0.1, 0.32, { arp: [0, 7], arpRate: 0.05 }),
      uiCancel: TR(330, 0.1, 0.28, { freqEnd: 220 }),
      uiTab: SQ(520, 0.04, 0.14, { duty: 0.125 }),
      uiError: SQ(180, 0.14, 0.2, { duty: 0.25 }),
      stepGrass: N(1800, 0.05, 0.08),
      stepPath: N(3200, 0.04, 0.09),
      stepSand: N(1200, 0.07, 0.08),
      stepWood: TR(190, 0.05, 0.18),
      stepSnow: N(900, 0.09, 0.1),
      stepStone: N(4200, 0.03, 0.09),
      netSwing: N(5e3, 0.14, 0.16, { freqEnd: 1500 }),
      netCatch: TR(520, 0.08, 0.3, { arp: [0, 5, 9], arpRate: 0.04 }),
      netMiss: N(900, 0.1, 0.1),
      cast: N(3e3, 0.2, 0.14, { freqEnd: 700 }),
      plop: SI(420, 0.12, 0.34, { freqEnd: 180 }),
      nibble: SI(600, 0.05, 0.18, { freqEnd: 400 }),
      bite: SI(200, 0.16, 0.5, { freqEnd: 90, layers: [N(4e3, 0.2, 0.3)] }),
      splash: N(2400, 0.3, 0.28, { freqEnd: 600 }),
      reelIn: SQ(300, 0.12, 0.16, { duty: 0.125, freqEnd: 900 }),
      dig: N(800, 0.1, 0.26, { layers: [TR(110, 0.1, 0.3)] }),
      dirtFall: N(600, 0.14, 0.14),
      hitRock: SQ(180, 0.08, 0.3, { duty: 0.25, layers: [N(5e3, 0.05, 0.3)] }),
      chop: TR(170, 0.09, 0.4, { layers: [N(2600, 0.05, 0.26)] }),
      treeFall: N(900, 0.7, 0.34, { freqEnd: 200, layers: [TR(70, 0.6, 0.5)] }),
      waterPour: N(2600, 0.3, 0.12),
      slingFire: SQ(900, 0.08, 0.14, { duty: 0.125, freqEnd: 300 }),
      pop: N(6e3, 0.05, 0.4, { layers: [SQ(800, 0.04, 0.2)] }),
      shakeTree: N(2200, 0.3, 0.2),
      fruitDrop: SI(360, 0.1, 0.3, { freqEnd: 130 }),
      pickUp: TR(620, 0.07, 0.28, { arp: [0, 4], arpRate: 0.04 }),
      pullWeed: N(3e3, 0.06, 0.2, { layers: [SI(500, 0.06, 0.2, { freqEnd: 800 })] }),
      drop: TR(240, 0.08, 0.26),
      reveal: TR(523, 0.5, 0.42, { arp: [0, 4, 7, 12, 16], arpRate: 0.08 }),
      revealQuick: TR(660, 0.2, 0.3, { arp: [0, 7, 12], arpRate: 0.05 }),
      bean: SQ(1046, 0.09, 0.2, { duty: 0.25, arp: [0, 7], arpRate: 0.05 }),
      beanLots: SQ(880, 0.3, 0.22, { duty: 0.25, arp: [0, 4, 7, 12], arpRate: 0.045 }),
      doorOpen: TR(220, 0.1, 0.24, { freqEnd: 300, layers: [N(1200, 0.06, 0.1)] }),
      doorClose: TR(150, 0.08, 0.3, { layers: [N(800, 0.05, 0.12)] }),
      knock: TR(180, 0.05, 0.4),
      mailFlag: TR(880, 0.12, 0.26, { arp: [0, 12], arpRate: 0.06 }),
      paper: N(5e3, 0.09, 0.1),
      stamp: TR(110, 0.1, 0.5, { layers: [N(1200, 0.05, 0.2)] }),
      busEngine: SQ(60, 0.8, 0.24, { duty: 0.25, vibrato: { depth: 0.6, rate: 11 }, sustain: 0.4 }),
      busHorn: SQ(370, 0.4, 0.3, { duty: 0.5, layers: [SQ(466, 0.4, 0.24, { duty: 0.5 })], sustain: 0.1 }),
      busBrake: N(7e3, 0.5, 0.14, { freqEnd: 2e3 }),
      honk: SQ(420, 0.3, 0.42, { duty: 0.25, freqEnd: 300, vibrato: { depth: 0.8, rate: 30 }, layers: [SQ(210, 0.3, 0.2, { duty: 0.125, freqEnd: 150 })] }),
      paddle: TR(330, 0.06, 0.34, { layers: [N(4e3, 0.03, 0.2)] }),
      gavel: TR(130, 0.12, 0.6, { layers: [N(1500, 0.05, 0.3)] }),
      cheeseSmell: SI(180, 0.6, 0.2, { freqEnd: 110, vibrato: { depth: 1, rate: 5 } }),
      fireworkLaunch: N(1600, 0.8, 0.14, { freqEnd: 7e3 }),
      fireworkBurst: N(1400, 0.6, 0.42, { freqEnd: 300, layers: [TR(90, 0.4, 0.4)] }),
      thunder: N(240, 1.6, 0.5, { freqEnd: 80, layers: [SI(50, 1.4, 0.5)] }),
      flush: N(1800, 1.1, 0.22, { freqEnd: 500 }),
      waspBuzz: SQ(190, 0.5, 0.14, { duty: 0.125, vibrato: { depth: 2, rate: 40 }, sustain: 0.3 }),
      sting: SQ(1e3, 0.2, 0.3, { freqEnd: 300, duty: 0.125 }),
      snowPush: N(700, 0.16, 0.14),
      snowPlop: N(500, 0.2, 0.26, { layers: [SI(200, 0.12, 0.3)] }),
      bonk: TR(260, 0.08, 0.4, { freqEnd: 120 }),
      star: TR(1320, 0.5, 0.26, { arp: [0, 5, 12, 17], arpRate: 0.07 }),
      wish: SI(1046, 0.9, 0.3, { arp: [0, 4, 7, 11, 14], arpRate: 0.11 }),
      bellNote: TR(523, 0.9, 0.42, { layers: [SI(1046, 0.5, 0.2), SI(1568, 0.3, 0.1)] }),
      debtPaid: TR(392, 0.6, 0.42, { arp: [0, 4, 7, 12, 16, 19, 24], arpRate: 0.07 }),
      almanacTurn: N(2400, 0.28, 0.2, { freqEnd: 5e3 }),
      sting_spring: TR(523, 0.8, 0.4, { arp: [0, 4, 7, 11, 12, 16], arpRate: 0.11 }),
      sting_summer: SQ(587, 0.8, 0.3, { duty: 0.25, arp: [0, 7, 12, 14, 19], arpRate: 0.11 }),
      sting_autumn: TR(440, 0.9, 0.4, { arp: [0, 3, 7, 10, 12], arpRate: 0.13 }),
      sting_winter: SI(659, 1.1, 0.4, { arp: [0, 5, 7, 12, 17], arpRate: 0.16 }),
      laugh: SQ(520, 0.3, 0.14, { duty: 0.25, arp: [0, 3, 0, 3], arpRate: 0.06 }),
      applause: N(5200, 0.8, 0.2),
      zzz: SI(180, 0.5, 0.14, { freqEnd: 120 }),
      camera: SQ(240, 0.03, 0.08, { duty: 0.125 }),
      scissors: N(7e3, 0.04, 0.2, { layers: [SQ(1500, 0.03, 0.1, { duty: 0.125 })] }),
      chew: N(900, 0.07, 0.22),
      plume: TR(880, 0.12, 0.3, { arp: [0, 7, 12], arpRate: 0.06 }),
      seedThrow: N(3600, 0.12, 0.14),
      seedHit: TR(740, 0.14, 0.3, { arp: [0, 5, 9], arpRate: 0.04 }),
      bubble: SI(500, 0.07, 0.24, { freqEnd: 1100 }),
      stir: N(1200, 0.22, 0.12),
      gag: SQ(150, 0.3, 0.24, { freqEnd: 70, duty: 0.25 })
    };
    LOOP_DEFS = {
      ambRiver: N(2600, 0.1, 0.5, { sustain: 1.5, attack: 0.1 }),
      ambSurf: N(900, 0.5, 0.5, { sustain: 2, attack: 1, vibrato: { depth: 3, rate: 0.5 } }),
      ambRain: N(7e3, 0.1, 0.4, { sustain: 1.5, attack: 0.1 }),
      ambWind: N(500, 0.6, 0.5, { sustain: 2, attack: 0.7, vibrato: { depth: 4, rate: 0.7 } }),
      ambCrickets: SQ(4200, 0.08, 0.1, { duty: 0.125, sustain: 0.06, arp: [0, 0, 1, 0], arpRate: 0.05, layers: [SQ(4400, 0.08, 0.08, { duty: 0.125, delay: 0.4, sustain: 0.06 })] }),
      ambBirds: SI(2800, 0.14, 0.2, { arp: [0, 3, 7, 3], arpRate: 0.05, freqEnd: 3200, layers: [SI(2300, 0.1, 0.12, { delay: 0.9, arp: [0, 5], arpRate: 0.05 })] }),
      ambCity: N(320, 0.4, 0.5, { sustain: 2, attack: 0.5 }),
      ambNeon: SQ(120, 0.3, 0.1, { duty: 0.125, sustain: 1.2, attack: 0.1, vibrato: { depth: 0.2, rate: 30 } }),
      ambCrowd: SI(240, 0.1, 0.2, { arp: [0, 3, -2, 5, 1, 7, -3], arpRate: 0.14, sustain: 1.4, vibrato: { depth: 0.6, rate: 9 } })
    };
    SFX_COUNT = Object.keys(SFX_DEFS).length;
  }
});

// src/audio/composer.js
function chordDegree(ch) {
  return ROMAN[ch.replace(/[^ivIV]/g, "").toUpperCase()] ?? 1;
}
function degreeMidi(root, scale, deg) {
  const s = SCALES[scale];
  const d = deg - 1;
  const oct = Math.floor(d / 7);
  return root + s[(d % 7 + 7) % 7] + 12 * oct;
}
function bassStep(mode, root, third, fifth, next, bar2) {
  const n = midiName;
  const out = Array(STEPS).fill(".");
  if (mode === "walk") {
    out[0] = n(root);
    out[3] = n(third);
    out[6] = n(fifth);
    out[9] = n(next - 1 + (bar2 % 2 === 0 ? 0 : 2));
  } else if (mode === "two") {
    out[0] = n(root);
    out[6] = n(fifth);
  } else if (mode === "one") {
    out[0] = n(root);
    out[1] = "-";
    out[2] = "-";
  } else if (mode === "oom") {
    out[0] = n(root);
    out[6] = n(fifth);
    out[3] = n(root + 12);
    out[9] = n(fifth + 12);
  }
  return out;
}
function buildSong({ scale, chords, mel, key: key2 = "C", bpm = 100, style = "swing", variant = null, loop: loop2 = true, sparse = false }) {
  const st = STYLE[style] ?? STYLE.swing;
  const root = KEYS[key2] ?? 60;
  const chordList = chords.split(/\s+/);
  const tracks = { lead: { ...st.lead }, bass: { ...st.bass }, chord: { ...st.chord }, chord2: { ...st.chord, volume: (st.chord.volume ?? 0.1) * 0.8 } };
  if (st.tick) tracks.tick = st.tick;
  if (st.snare) tracks.snare = st.snare;
  const patterns = {};
  const order2 = [];
  mel.forEach((barText, bar2) => {
    const tokens = barText.trim().split(/\s+/);
    const lead = tokens.map((t) => {
      if (t === "." || t === "-") return t;
      return midiName(degreeMidi(root, scale, Number(t)) + st.leadOct);
    });
    const d = chordDegree(chordList[bar2 % chordList.length]);
    const nextD = chordDegree(chordList[(bar2 + 1) % chordList.length]);
    const r = degreeMidi(root - 24, scale === "pent" ? "major" : scale, d);
    const t3 = degreeMidi(root - 24, scale === "pent" ? "major" : scale, d + 2);
    const t5 = degreeMidi(root - 24, scale === "pent" ? "major" : scale, d + 4);
    const nr = degreeMidi(root - 24, scale === "pent" ? "major" : scale, nextD);
    const bassMode = variant === "snow" ? "one" : variant === "rain" ? "two" : st.bassMode;
    const bass = bassStep(bassMode, r, t3, t5, nr, bar2);
    const chord = Array(STEPS).fill(".");
    const chord2 = Array(STEPS).fill(".");
    const stabs = variant === "snow" ? [0] : style === "march" ? [3, 9] : [2, 5, 11];
    for (const s of stabs) {
      chord[s] = midiName(t3 + 12);
      chord2[s] = midiName(t5 + 12);
    }
    const row = { lead: lead.join(" "), bass: bass.join(" "), chord: chord.join(" "), chord2: chord2.join(" ") };
    if (st.tick) row.tick = Array.from({ length: STEPS }, (_, i) => variant === "snow" ? "." : i % 3 === 0 || i % 3 === 2 && variant !== "rain" ? "C8" : ".").join(" ");
    if (st.snare) row.snare = Array.from({ length: STEPS }, (_, i) => variant === "snow" ? "." : i === 3 || i === 9 ? "C6" : ".").join(" ");
    patterns[`b${bar2}`] = row;
    order2.push(`b${bar2}`);
  });
  return { bpm: variant === "rain" ? bpm - 8 : variant === "snow" ? bpm - 14 : bpm, stepsPerBeat: 3, tracks, patterns, order: order2, loop: loop2 };
}
function hourSong(hour, variant = null) {
  const k = `h${hour}:${variant ?? ""}`;
  if (cache2.has(k)) return cache2.get(k);
  const [mi, key2, bpm] = HOUR_PLAN[hour % 24];
  const m = MOTIFS[mi];
  const night = hour >= 21 || hour < 5;
  const style = variant === "snow" ? "bell" : variant === "rain" ? "soft" : night ? "soft" : hour % 3 === 0 ? "reed" : "swing";
  const song = buildSong({ ...m, key: key2, bpm, style, variant });
  cache2.set(k, song);
  return song;
}
function tune(id) {
  if (cache2.has(id)) return cache2.get(id);
  const t = TUNES[id];
  if (!t) return null;
  const s = buildSong(t);
  cache2.set(id, s);
  return s;
}
function melodyNotes(id) {
  const s = tune(id);
  const out = [];
  for (const name of s.order) for (const t of s.patterns[name].lead.split(" ")) out.push(t);
  return out;
}
var SCALES, NOTE_NAMES, KEYS, midiName, ROMAN, STEPS, MOTIFS, HOUR_PLAN, STYLE, cache2, TUNES;
var init_composer = __esm({
  "src/audio/composer.js"() {
    SCALES = { major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9, 12, 14] };
    NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    KEYS = { C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, Gb: 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 };
    midiName = (m) => `${NOTE_NAMES[(m % 12 + 12) % 12]}${Math.floor(m / 12) - 1}`;
    ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };
    STEPS = 12;
    MOTIFS = [
      { name: "Morning Errand", scale: "major", chords: "I vi ii V I IV V I", mel: ["5 . . 3 . 5 6 . 5 3 . .", "1 . 2 3 . 5 2 - . . . .", "6 . . 4 . 6 5 . 3 2 . .", "3 . 2 1 . . 2 . 3 5 . .", "5 . . 3 . 5 6 . 8 6 . 5", "4 . 5 6 . 4 3 - . . . .", "2 . 3 4 . 5 7 . 6 5 . 4", "3 . . 1 - - - . . . . ."] },
      { name: "Beans on Toast", scale: "mixo", chords: "I I IV I V IV I V", mel: ["1 . 3 5 . 7 6 . 5 3 . .", "5 . 3 1 . 3 2 . 1 . . .", "4 . 6 8 . 6 5 . 4 3 . .", "3 . 5 6 . 5 3 - . . . .", "2 . 4 5 . 7 6 . 5 4 . .", "4 . 6 8 . 7 6 . 4 . . .", "3 . 5 8 . 5 6 . 5 3 . 1", "2 . . 5 . . 7 - . . . ."] },
      { name: "Porch Steps", scale: "major", chords: "I iii IV I ii V I I", mel: ["3 . . . 5 . 3 . . 2 . 1", "3 . . 5 . 7 5 - . . . .", "6 . . . 8 . 6 . . 5 . 4", "5 . 3 . 1 . 3 - . . . .", "2 . . 4 . 6 5 . . 4 . 2", "7 . . 5 . 2 4 . 2 . . .", "1 . 3 5 . 8 7 . 5 3 . .", "1 - - - . . . . . . . ."] },
      { name: "Noon Bench", scale: "pent", chords: "I IV I V I IV V I", mel: ["1 . 2 3 . 4 3 . 2 1 . .", "4 . 4 5 . 4 3 . 2 . . .", "3 . 4 5 . 6 5 . 4 3 . .", "5 . 4 3 . 2 2 - . . . .", "1 . 2 3 . 4 5 . 6 5 . .", "6 . 6 5 . 4 3 . 2 3 . .", "2 . 3 5 . 3 2 . 1 2 . .", "1 - . . . . . . . . . ."] },
      { name: "Slow Afternoon", scale: "dorian", chords: "i IV i V i IV VII i", mel: ["1 . . 3 . 4 5 . . 7 . 5", "4 . 6 5 . 4 3 . . . . .", "3 . . 5 . 4 3 . 2 1 . .", "2 . 5 . 7 . 5 . 4 2 . .", "1 . . 3 . 5 7 . . 8 . 7", "6 . 4 5 . 6 4 - . . . .", "7 . 5 4 . 2 3 . 5 7 . .", "8 - . 5 . . 1 - . . . ."] },
      { name: "Teatime Walk", scale: "major", chords: "I V vi IV I ii V I", mel: ["8 . 7 6 . 5 4 . 3 2 . .", "7 . 6 5 . 4 2 - . . . .", "3 . 4 5 . 6 8 . 6 5 . .", "6 . 5 4 . 3 4 - . . . .", "5 . . 8 . 7 6 . 5 3 . .", "4 . 6 2 . 4 6 . 5 4 . .", "5 . 7 2 . 4 7 . 5 . . .", "8 . . 5 . 3 1 - . . . ."] },
      { name: "Lamplighter", scale: "minor", chords: "i VI III VII i iv V i", mel: ["5 . . 3 . 1 5 . 6 5 . .", "6 . 8 6 . 3 1 - . . . .", "5 . 3 5 . 7 8 . 7 5 . .", "7 . 5 2 . 4 5 - . . . .", "8 . . 7 . 5 3 . 5 8 . .", "4 . 6 8 . 6 4 . 3 1 . .", "2 . 4 7 . 4 5 . 2 7 . .", "1 - - . . . 5 . 3 1 . ."] },
      { name: "Evening Laundry", scale: "major", chords: "IV I V vi IV I ii V", mel: ["4 . 6 8 . 6 5 . 3 . . .", "3 . 5 8 . 5 3 . 1 . . .", "2 . 5 7 . 5 4 . 2 . . .", "1 . 3 6 . 3 1 - . . . .", "6 . 4 . 6 . 8 . 6 5 . 4", "3 . 5 . 8 . 5 . 3 2 . 1", "2 . 4 . 6 . 4 . 2 . 4 .", "5 - . . 7 - . . 2 - . ."] },
      { name: "Moth Waltz", scale: "dorian", chords: "i i IV IV i V i i", mel: ["1 - - 5 - - 3 - 2 1 - -", "3 - - 7 - - 5 - 4 3 - -", "4 - - 8 - - 6 - 5 4 - -", "6 - 5 4 - 3 2 - - - - -", "1 - - 5 - - 8 - 7 5 - -", "7 - - 4 - - 5 - 7 2 - -", "3 - - 1 - - 3 - 5 3 - -", "1 - - - - - . . . . . ."] },
      { name: "Nightshift", scale: "minor", chords: "i iv i V VI iv V i", mel: ["1 . 3 . 5 . 8 . . 7 . 5", "4 . 6 . 8 . 6 . . 4 . 3", "3 . 5 . 7 . 5 . . 3 . 1", "7 . 2 . 5 . 2 . . 7 . .", "6 . 8 . 3 . 8 . . 6 . 5", "4 . 6 . 1 . 6 . . 4 . 2", "2 . 7 . 5 . 2 . 4 . 7 .", "8 - . . 5 - . . 1 - . ."] },
      { name: "Three in the Morning", scale: "pent", chords: "I I IV IV I V I I", mel: [". . 5 . . 3 . . 2 . . 1", ". . 3 . . 5 - - . . . .", ". . 6 . . 5 . . 4 . . 3", ". . 4 . . 2 - - . . . .", ". . 5 . . 6 . . 7 . . 6", ". . 5 . . 3 . . 2 . . .", ". . 2 . . 3 . . 2 . . 1", "1 - - - . . . . . . . ."] },
      { name: "First Light", scale: "major", chords: "I IV ii V iii vi ii V", mel: ["5 . 8 . 7 . 8 . 5 . 3 .", "4 . 6 . 8 . 6 . 4 . 2 .", "2 . 4 . 6 . 5 . 4 . 2 .", "7 . 5 . 2 . 4 - - . . .", "3 . 5 . 7 . 5 . 3 . 5 .", "6 . 8 . 3 . 2 . 1 . 3 .", "4 . 2 . 6 . 4 . 2 . 4 .", "5 - - - 2 - - - 5 - - -"] }
    ];
    HOUR_PLAN = [
      [9, "F", 74],
      [10, "Bb", 66],
      [10, "D", 62],
      [10, "G", 60],
      [11, "C", 64],
      [11, "F", 72],
      [0, "C", 88],
      [0, "D", 96],
      [1, "F", 104],
      [1, "G", 112],
      [2, "Eb", 100],
      [2, "C", 108],
      [3, "G", 112],
      [3, "A", 104],
      [4, "D", 92],
      [4, "E", 88],
      [5, "F", 96],
      [5, "Bb", 92],
      [7, "Eb", 88],
      [7, "C", 84],
      [6, "D", 80],
      [6, "F", 76],
      [8, "C", 72],
      [8, "G", 70]
    ];
    STYLE = {
      swing: { lead: { wave: "triangle", attack: 5e-3, decay: 0.32, volume: 0.42 }, leadOct: 12, bass: { wave: "triangle", attack: 4e-3, decay: 0.2, volume: 0.32 }, chord: { wave: "square", duty: 0.25, attack: 2e-3, decay: 0.09, volume: 0.13 }, tick: { wave: "noise", decay: 0.03, volume: 0.09 }, bassMode: "walk" },
      soft: { lead: { wave: "sine", attack: 0.01, decay: 0.5, volume: 0.48 }, leadOct: 12, bass: { wave: "triangle", attack: 0.01, decay: 0.3, volume: 0.32 }, chord: { wave: "triangle", attack: 0.01, decay: 0.3, volume: 0.12 }, bassMode: "two" },
      reed: { lead: { wave: "square", duty: 0.25, attack: 8e-3, decay: 0.26, volume: 0.28 }, leadOct: 0, bass: { wave: "triangle", attack: 4e-3, decay: 0.2, volume: 0.36 }, chord: { wave: "triangle", attack: 4e-3, decay: 0.12, volume: 0.18 }, tick: { wave: "noise", decay: 0.02, volume: 0.08 }, bassMode: "walk" },
      bell: { lead: { wave: "sine", attack: 2e-3, decay: 0.7, volume: 0.42, layers: [{ wave: "sine", freq: 2, decay: 0.3, volume: 0.12 }] }, leadOct: 24, bass: { wave: "sine", attack: 0.02, decay: 0.5, volume: 0.36 }, chord: { wave: "triangle", attack: 0.02, decay: 0.5, volume: 0.14 }, bassMode: "one" },
      city: { lead: { wave: "square", duty: 0.5, attack: 2e-3, decay: 0.2, volume: 0.24 }, leadOct: 12, bass: { wave: "square", duty: 0.25, attack: 2e-3, decay: 0.16, volume: 0.28 }, chord: { wave: "square", duty: 0.125, attack: 2e-3, decay: 0.08, volume: 0.14 }, tick: { wave: "noise", decay: 0.025, volume: 0.14 }, snare: { wave: "noise", decay: 0.08, volume: 0.16 }, bassMode: "walk" },
      march: { lead: { wave: "square", duty: 0.5, attack: 2e-3, decay: 0.16, volume: 0.28 }, leadOct: 12, bass: { wave: "triangle", attack: 2e-3, decay: 0.12, volume: 0.32 }, chord: { wave: "square", duty: 0.25, attack: 2e-3, decay: 0.08, volume: 0.14 }, snare: { wave: "noise", decay: 0.06, volume: 0.18 }, tick: { wave: "noise", decay: 0.02, volume: 0.08 }, bassMode: "oom" },
      lullaby: { lead: { wave: "sine", attack: 0.04, decay: 0.8, volume: 0.48 }, leadOct: 12, bass: { wave: "sine", attack: 0.04, decay: 0.8, volume: 0.36 }, chord: { wave: "triangle", attack: 0.04, decay: 0.5, volume: 0.16 }, bassMode: "one" }
    };
    cache2 = /* @__PURE__ */ new Map();
    TUNES = {
      title: { scale: "major", key: "F", bpm: 104, style: "swing", chords: "I vi IV V I iii IV V", mel: ["8 . 5 6 . 5 3 . 5 8 . .", "6 . 8 5 . 3 1 - . . . .", "4 . 6 8 . 6 5 . 6 8 . 7", "5 . 2 4 . 5 7 - . . . .", "8 . 5 6 . 5 3 . 5 8 . 9", "7 . 5 3 . 5 7 - . . . .", "6 . 4 2 . 4 6 . 8 6 . 4", "5 . 7 2 . 4 5 - 7 . 8 ."] },
      credits: { scale: "major", key: "Bb", bpm: 84, style: "soft", chords: "I V vi iii IV I ii V", mel: ["3 - . 5 . 8 7 - . 5 . .", "2 - . 5 . 7 6 - . 5 . .", "1 - . 3 . 6 8 - . 6 . .", "3 - . 5 . 7 5 - . . . .", "4 - . 6 . 8 7 - . 6 . .", "3 - . 5 . 8 7 - . 5 . .", "6 - . 4 . 2 4 . 6 8 . .", "7 - - 5 - - 2 - - 4 - -"] },
      bus: { scale: "mixo", key: "G", bpm: 118, style: "swing", chords: "I IV I V I IV V I", mel: ["1 . 3 5 . 3 6 . 5 3 . .", "4 . 6 8 . 6 5 . 3 1 . .", "5 . 6 5 . 3 2 . 3 5 . .", "2 . 4 5 . 7 5 . 4 2 . .", "1 . 3 5 . 8 7 . 5 6 . .", "6 . 4 3 . 4 6 . 8 6 . .", "5 . 2 4 . 7 6 . 4 2 . .", "1 . 3 5 . 3 1 - . . . ."] },
      lullaby: { scale: "major", key: "Eb", bpm: 54, style: "lullaby", chords: "I IV I V", mel: ["3 - - 5 - - 8 - - 5 - -", "4 - - 6 - - 8 - - 6 - -", "3 - - 5 - - 8 - - 7 - -", "2 - - 4 - - 5 - - - - -"] },
      store: { scale: "major", key: "C", bpm: 112, style: "reed", chords: "I vi ii V", mel: ["5 . 3 1 . 3 5 . 8 7 . 6", "6 . 8 6 . 3 1 . 3 . . .", "2 . 4 6 . 4 2 . 7 . 6 .", "5 . 7 2 . 7 5 - . . . ."] },
      museum: { scale: "dorian", key: "D", bpm: 76, style: "bell", chords: "i IV i VII", mel: ["1 . . 5 . . 3 . . 7 . .", "4 . . 8 . . 6 . . 5 . .", "3 . . 7 . . 5 . . 1 . .", "7 . . 4 . . 2 . . 5 . ."] },
      mothwick: { scale: "minor", key: "A", bpm: 88, style: "reed", chords: "i iv V i", mel: ["1 - 3 5 - 8 7 - 5 3 - 2", "4 - 6 8 - 6 4 - 3 1 - .", "2 - 4 7 - 5 2 - 7 5 - 4", "3 - 5 1 - 3 1 - - . . ."] },
      hall: { scale: "major", key: "G", bpm: 92, style: "soft", chords: "I IV V I", mel: ["1 . . 3 . . 5 . . 3 . .", "4 . . 6 . . 8 . . 6 . .", "5 . . 7 . . 2 . . 7 . .", "1 . 3 5 . 3 1 - . . . ."] },
      cityDay: { scale: "major", key: "Eb", bpm: 124, style: "city", chords: "I vi ii V I IV ii V", mel: ["8 . 7 5 . 3 5 . 7 8 . .", "6 . 8 6 . 5 3 . . . . .", "4 . 6 8 . 9 8 . 6 4 . .", "5 . 7 2 . 5 7 - . . . .", "8 . 7 5 . 3 5 . 7 8 . 9", "6 . 4 . 6 . 8 . 6 4 . .", "4 . 6 2 . 4 6 . 8 . 6 .", "5 . 2 4 . 7 5 - . . . ."] },
      cityNight: { scale: "minor", key: "E", bpm: 98, style: "city", chords: "i VI III VII i iv V i", mel: ["1 . 3 5 . 7 8 - . 7 . 5", "3 . 5 8 . 5 3 - . . . .", "5 . 7 2 . 5 3 . 5 7 . .", "2 . 4 7 . 5 4 - . . . .", "8 . 7 5 . 7 8 . 3 . 2 .", "4 . 6 8 . 6 4 - . 3 . .", "2 . 4 7 . 4 2 . 5 . 7 .", "8 - . 5 - . 1 - . . . ."] },
      salon: { scale: "mixo", key: "A", bpm: 116, style: "swing", chords: "I IV I V", mel: ["3 5 . 3 5 . 8 . 7 5 . .", "4 6 . 4 6 . 8 . 6 4 . .", "3 5 . 8 7 . 5 . 3 1 . .", "2 4 . 7 5 . 2 - . . . ."] },
      couture: { scale: "minor", key: "F", bpm: 92, style: "city", chords: "i i VI V", mel: ["8 - . 8 . 7 5 - . . . .", "8 - . 8 . 9 7 - . . . .", "6 - . 3 . 6 8 . 6 3 . .", "5 - - 7 - - 2 - - 7 - -"] },
      magda: { scale: "minor", key: "C", bpm: 72, style: "reed", chords: "i V i iv", mel: ["1 . . 2 . 3 7 . . 5 . .", "2 . . 7 . 5 4 . 2 . . .", "3 . . 4 . 5 8 . . 7 . .", "6 . 4 3 . 1 2 - - . . ."] },
      theatre: { scale: "major", key: "D", bpm: 130, style: "march", chords: "I V I IV I V I I", mel: ["1 . 3 5 . 8 5 . 3 1 . .", "2 . 4 7 . 5 2 . . . . .", "1 . 3 5 . 8 5 . 3 1 . .", "4 . 6 8 . 6 4 . . . . .", "5 . 8 7 . 6 5 . 3 1 . .", "2 . 5 7 . 5 4 . 2 . . .", "1 . 3 5 . 8 5 . 3 2 . .", "1 . . 8 . . 1 - . . . ."] },
      auction: { scale: "major", key: "B", bpm: 150, style: "city", chords: "I V I V", mel: ["1 3 5 3 1 3 5 3 8 7 5 3", "2 4 7 4 2 4 7 4 2 7 5 4", "3 5 8 5 3 5 8 5 8 9 8 5", "2 4 7 4 5 7 2 - . . . ."] },
      cafe: { scale: "dorian", key: "G", bpm: 60, style: "soft", chords: "i IV VII IV", mel: ["1 . . . . 5 . . 3 . . .", "4 . . . . 6 . . 5 . . .", "7 . . . . 2 . . 4 . . .", "6 . . . . 5 . . 3 - - -"] },
      bureau: { scale: "major", key: "C", bpm: 96, style: "reed", chords: "I I V V", mel: ["1 . . 1 . . 1 . 3 5 . .", "1 . . 1 . . 1 . 3 2 . .", "7 . . 7 . . 7 . 2 5 . .", "2 . . 2 . . 2 . 7 1 . ."] },
      festivalSpring: { scale: "major", key: "G", bpm: 132, style: "march", chords: "I IV V I", mel: ["5 6 8 . 5 3 . 5 6 8 . .", "6 8 9 . 8 6 . 4 6 8 . .", "7 5 2 . 4 5 7 . 5 2 . .", "8 5 3 . 5 8 1 - . . . ."] },
      festivalSummer: { scale: "pent", key: "A", bpm: 88, style: "bell", chords: "I IV I V", mel: ["1 . 2 3 . 5 6 . 5 3 . .", "6 . 5 4 . 5 6 - . . . .", "5 . 3 2 . 3 5 . 3 2 . .", "2 . 3 5 . 2 1 - . . . ."] },
      festivalAutumn: { scale: "dorian", key: "E", bpm: 116, style: "reed", chords: "i VII i IV", mel: ["1 3 5 . 7 5 3 . 5 1 . .", "7 2 4 . 2 7 5 . 7 2 . .", "1 3 5 . 8 7 5 . 3 1 . .", "4 6 8 . 6 4 3 . 2 1 . ."] },
      festivalWinter: { scale: "major", key: "Bb", bpm: 70, style: "bell", chords: "I vi IV V I iii ii V", mel: ["5 - . 8 . . 7 - . 5 . .", "6 - . 8 . . 6 - . 3 . .", "4 - . 6 . . 8 - . 6 . .", "7 - . 5 . . 2 - . . . .", "5 - . 8 . . 9 - . 8 . .", "7 - . 5 . . 3 - . 5 . .", "6 - . 4 . . 2 - . 4 . .", "5 - - - - - 7 - - 2 - -"] },
      contest: { scale: "major", key: "D", bpm: 144, style: "city", chords: "I IV V I", mel: ["1 3 5 8 . 5 3 . 5 8 . .", "4 6 8 9 . 8 6 . 4 6 . .", "5 7 2 5 . 4 2 . 7 5 . .", "8 5 3 1 . 3 5 . 8 . . ."] },
      vesper0: { scale: "minor", key: "D", bpm: 74, style: "reed", chords: "i iv V i", mel: ["5 . . 3 . . 1 . . 3 . 5", "6 . . 4 . . 1 . . 4 . 6", "7 . . 5 . . 2 . . 5 . 7", "8 - - 5 - - 1 - - . . ."] },
      vesper1: { scale: "major", key: "G", bpm: 96, style: "reed", chords: "I V V I", mel: ["1 - - 3 - 5 3 - - 5 - 8", "2 - - 4 - 7 5 - - 4 - 2", "7 - - 2 - 4 2 - - 5 - 7", "1 - - 5 - 3 1 - - . . ."] },
      vesper2: { scale: "mixo", key: "E", bpm: 80, style: "reed", chords: "I I IV I V IV I V", mel: ["1 . 3 5 . 7 5 . 3 1 . .", "1 . 3 5 . 7 5 . 3 . . .", "4 . 6 8 . 7 6 . 4 . . .", "1 . 3 5 . 7 5 . 3 1 . .", "5 . 7 2 . 4 2 . 7 . . .", "4 . 6 8 . 7 6 . 4 . . .", "1 . 3 5 . 7 5 . 3 1 . .", "5 . . 7 . . 2 . . 5 . ."] },
      vesper3: { scale: "dorian", key: "C", bpm: 104, style: "reed", chords: "i IV i V", mel: ["8 . 7 5 . 3 1 . 3 5 . 7", "6 . 4 . 6 . 8 . 6 4 . .", "3 . 5 7 . 8 7 . 5 3 . .", "2 . 5 7 . 5 2 - . . . ."] },
      vesper4: { scale: "major", key: "F", bpm: 66, style: "soft", chords: "I IV I V", mel: ["3 - - - 5 - 8 - - 7 - 5", "4 - - - 6 - 8 - - 6 - 4", "3 - - - 5 - 8 - - 9 - 8", "7 - - - 5 - 2 - - - - -"] },
      vesper5: { scale: "minor", key: "G", bpm: 58, style: "lullaby", chords: "i VI iv V", mel: ["1 - - 5 - - 8 - - 7 - -", "6 - - 3 - - 6 - - 8 - -", "4 - - 6 - - 8 - - 6 - -", "5 - - 7 - - 2 - - 5 - -"] },
      round: { scale: "major", key: "A", bpm: 138, style: "march", chords: "I IV I V", mel: ["1 3 5 . 8 5 3 . 5 8 . .", "4 6 8 . 9 8 6 . 4 6 . .", "1 3 5 . 8 7 5 . 3 1 . .", "5 7 2 . 4 7 5 . 2 . . ."] }
    };
  }
});

// src/systems/patterns.js
function blankPattern() {
  return Array(256).fill(12);
}
function makePatternTexture(data) {
  if (!data) return null;
  const k = data.join(",");
  let t = cache3.get(k);
  if (t) return t;
  const px = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    const hex = engine_exports.PALETTE[PATTERN_COLORS[data[i]]] ?? 16777215;
    const y = 15 - Math.floor(i / 16), x = i % 16;
    const o = (y * 16 + x) * 4;
    px[o] = hex >> 16 & 255;
    px[o + 1] = hex >> 8 & 255;
    px[o + 2] = hex & 255;
    px[o + 3] = 255;
  }
  t = new engine_exports.THREE.DataTexture(px, 16, 16);
  t.colorSpace = engine_exports.THREE.SRGBColorSpace;
  t.needsUpdate = true;
  (0, engine_exports.pixelTexture)(t);
  cache3.set(k, t);
  return t;
}
function patternMaterial(data) {
  const t = makePatternTexture(data);
  return t ? (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: t }) : null;
}
var PATTERN_COLORS, cache3;
var init_patterns = __esm({
  "src/systems/patterns.js"() {
    init_engine();
    PATTERN_COLORS = ["ink", "plum", "red", "orange", "sand", "lime", "green", "teal", "navy", "blue", "sky", "cyan", "white", "mist", "slate", "night"];
    cache3 = /* @__PURE__ */ new Map();
  }
});

// src/systems/pocketActions.js
function frontTile(g) {
  const p = g.player;
  return [Math.floor(p.x + Math.sin(p.facing) * 0.9), Math.floor(p.z + Math.cos(p.facing) * 0.9)];
}
function wear(g, i, slot) {
  const w = g.world;
  const it = ITEMS[slot.id];
  const look = w.player.look;
  removeSlot(g, i);
  const giveBack = (id) => {
    if (id) {
      if (!addItem(g, id) && false) return;
    }
  };
  if (it.cat === "clothes") {
    giveBack(look.outfit);
    look.outfit = slot.id;
    look.pattern = null;
  } else if (it.cat === "hat") {
    giveBack(look.hatItem);
    look.hatItem = slot.id;
  } else if (it.cat === "glasses") {
    giveBack(look.glassesItem);
    look.glassesItem = slot.id;
  } else if (it.cat === "umbrella") {
    giveBack(look.umbrella);
    look.umbrella = slot.id;
  }
  g.player.applyLook();
  remember(g, "outfit", { item: it.name });
  g.sound("uiConfirm");
  g.events.emit("wore", { id: slot.id });
}
function plantable(g, tx, tz) {
  const inf = tileInfo(tileChar(tx, tz));
  return inf.walk && inf.surface !== "dock" && inf.surface !== "plaza" && !g.world.town.objects[`${tx},${tz}`] && !g.town.solid[tz * 80 + tx];
}
function pocketActions(g, i, slot) {
  const w = g.world;
  const it = ITEMS[slot.id];
  const out = [];
  const inTown = g.place === g.town;
  const atHome = g.place?.key !== void 0;
  const add2 = (label, action) => out.push({ label, action });
  switch (it?.cat) {
    case "clothes":
    case "hat":
    case "glasses":
    case "umbrella":
      add2("Wear", (gg, m) => {
        wear(gg, i, slot);
        closeAll(gg, m);
      });
      break;
    case "furniture":
      if (atHome) add2("Place here", (gg, m) => {
        closeAll(gg, m);
        gg.openPlacement(i);
      });
      break;
    case "wall":
      if (atHome) add2("Hang here", (gg, m) => {
        const r = gg.place.roomData;
        const old = r.wall;
        r.wall = slot.id;
        removeSlot(gg, i);
        addItem(gg, old);
        gg.place.rebuild();
        gg.events.emit("wallpaper", { id: slot.id });
        closeAll(gg, m);
      });
      break;
    case "floor":
      if (atHome) add2("Lay it here", (gg, m) => {
        const r = gg.place.roomData;
        const old = r.floor;
        r.floor = slot.id;
        removeSlot(gg, i);
        addItem(gg, old);
        gg.place.rebuild();
        gg.events.emit("floorLaid", { id: slot.id });
        closeAll(gg, m);
      });
      break;
    case "fruit":
      add2("Eat", (gg, m) => {
        removeSlot(gg, i);
        gg.player.pose("Eat");
        gg.sound("chew");
        gg.events.emit("ate", { id: slot.id });
        closeAll(gg, m);
        gg.ui.toastMsg(`You eat the ${it.name.toLowerCase()}. It's ${it.foreign ? "not from here" : "fine"}.`);
      });
      if (inTown && (it.foreign || slot.id === "pear")) add2("Plant", (gg, m) => {
        const [tx, tz] = frontTile(gg);
        if (!plantable(gg, tx, tz)) {
          gg.sound("uiError");
          closeAll(gg, m);
          gg.ui.toastMsg("Not here. Find a clear patch of ground.");
          return;
        }
        removeSlot(gg, i);
        w.town.objects[`${tx},${tz}`] = { k: "sapling", stage: 0, kind: "pear", fruitItem: slot.id, wet: 0 };
        gg.town.dirty.add(`${tx},${tz}`);
        gg.sound("dig");
        gg.events.emit("planted", { what: slot.id });
        closeAll(gg, m);
      });
      break;
    case "plant":
      if (inTown) add2("Plant", (gg, m) => {
        const [tx, tz] = frontTile(gg);
        if (!plantable(gg, tx, tz)) {
          gg.sound("uiError");
          closeAll(gg, m);
          gg.ui.toastMsg("Not here. Find a clear patch of ground.");
          return;
        }
        removeSlot(gg, i);
        w.town.objects[`${tx},${tz}`] = { k: "sapling", stage: 0, kind: "pear", wet: 0 };
        gg.town.dirty.add(`${tx},${tz}`);
        gg.sound("dig");
        gg.events.emit("planted", { what: "sapling" });
        closeAll(gg, m);
      });
      break;
    case "seed":
    case "flower":
      if (inTown) add2("Plant", (gg, m) => {
        const [tx, tz] = frontTile(gg);
        if (!plantable(gg, tx, tz)) {
          gg.sound("uiError");
          closeAll(gg, m);
          gg.ui.toastMsg("Not here. Find a clear patch of ground.");
          return;
        }
        removeSlot(gg, i);
        const species = it.species;
        const color = it.color ?? (tx + tz) % 3;
        w.town.objects[`${tx},${tz}`] = { k: "flower", species, color, wet: 0, wilt: 0 };
        gg.town.dirty.add(`${tx},${tz}`);
        gg.sound("dirtFall");
        gg.events.emit("planted", { what: "flower", species });
        closeAll(gg, m);
      });
      break;
    case "bag":
      add2("Open it", (gg, m) => {
        removeSlot(gg, i);
        addBeans(gg, it.beans, "bag");
        gg.sound("beanLots");
        gg.ui.toastMsg(`+${it.beans.toLocaleString("en-US")} beans`);
        gg.events.emit("openedBag", {});
        closeAll(gg, m);
      });
      break;
    case "record":
      if (atHome && g.place.hasFunc("stereo")) add2("Play it", (gg, m) => {
        w.home.stereo = it.song;
        gg.music.refresh();
        closeAll(gg, m);
        gg.events.emit("stereo", { song: it.song });
      });
      break;
    default:
      break;
  }
  if (slot.id === "patternKit" && inTown) {
    const put = (k) => (gg, m) => {
      const [tx, tz] = frontTile(gg);
      if (!plantable(gg, tx, tz)) {
        gg.sound("uiError");
        closeAll(gg, m);
        gg.ui.toastMsg("Not here. Find a clear patch of ground.");
        return;
      }
      removeSlot(gg, i);
      w.town.objects[`${tx},${tz}`] = { k, slot: slot.slot ?? 0 };
      gg.town.dirty.add(`${tx},${tz}`);
      gg.sound("drop");
      gg.events.emit("patternPlaced", { k });
      closeAll(gg, m);
    };
    add2("Lay it here", put("pattern"));
    add2("Put up a sign", put("patternSign"));
  }
  if (slot.id === "medicine") add2("Take it", (gg, m) => {
    removeSlot(gg, i);
    w.player.puffy = false;
    if (gg.player.eyeL) gg.player.eyeL.scale.x = 1;
    gg.sound("chew");
    gg.ui.toastMsg("You feel told off. Your face goes back.");
    gg.events.emit("cured", {});
    closeAll(gg, m);
  });
  if (slot.id === "coffeeBean") add2("Drink it", (gg, m) => {
    removeSlot(gg, i);
    w.player.buffUntil = gg.absMinute() + 120;
    gg.sound("chew");
    closeAll(gg, m);
  });
  if (it?.cat !== "tool" && it?.cat !== "quest") add2("Drop it", (gg, m) => {
    if (!inTown) {
      gg.sound("uiError");
      closeAll(gg, m);
      gg.ui.toastMsg("Not indoors. Somebody will have words.");
      return;
    }
    const [tx, tz] = frontTile(gg);
    if (!plantable(gg, tx, tz)) {
      gg.sound("uiError");
      closeAll(gg, m);
      gg.ui.toastMsg("There's no room to drop it there.");
      return;
    }
    removeSlot(gg, i);
    if (gg.net?.role === "guest") gg.net.t.send({ t: "do", a: "gift", at: [tx, tz], item: slot.id });
    else {
      w.town.objects[`${tx},${tz}`] = { k: "drop", item: slot.id };
      gg.town.dirty.add(`${tx},${tz}`);
      gg.net?.t.send({ t: "ev", k: "obj", key: `${tx},${tz}`, o: w.town.objects[`${tx},${tz}`] });
    }
    gg.sound("drop");
    closeAll(gg, m);
  });
  return out;
}
var closeAll;
var init_pocketActions = __esm({
  "src/systems/pocketActions.js"() {
    init_items();
    init_economy();
    init_tiles();
    init_memory();
    init_patterns();
    init_say();
    closeAll = (g, m) => {
      g.ui.pop(m);
      while (g.ui.top && (g.ui.top.id === "pockets" || g.ui.top.id === "pocketAction")) g.ui.pop();
    };
  }
});

// src/ui/screens/pockets.js
var CELL, COLS2, ROWS2, X0, Y0, Grid, GREY, pocketsScreen, pocketsPicker;
var init_pockets = __esm({
  "src/ui/screens/pockets.js"() {
    init_draw();
    init_icons();
    init_items();
    init_ui();
    init_pocketActions();
    CELL = 40;
    COLS2 = 5;
    ROWS2 = 3;
    X0 = 240 - COLS2 * CELL / 2;
    Y0 = 44;
    Grid = class {
      constructor({ id, title, onPick, onBack, filter, actions = true }) {
        this.id = id;
        this.title = title;
        this.focus = 0;
        this.onPick = onPick;
        this.onBack = onBack;
        this.filter = filter;
        this.actions = actions;
      }
      labels() {
        return this.g.world.player.pockets.map((s) => s ? ITEMS[s.id]?.name : "");
      }
      focusIndex() {
        return this.focus;
      }
      rect(i) {
        return [X0 + i % COLS2 * CELL, Y0 + Math.floor(i / COLS2) * CELL, CELL - 2, CELL - 2];
      }
      update(g, inp) {
        if (inp.nav.left) {
          this.focus = (this.focus + 14) % 15;
          g.sound("uiTick");
        }
        if (inp.nav.right) {
          this.focus = (this.focus + 1) % 15;
          g.sound("uiTick");
        }
        if (inp.nav.up) {
          this.focus = (this.focus + 10) % 15;
          g.sound("uiTick");
        }
        if (inp.nav.down) {
          this.focus = (this.focus + 5) % 15;
          g.sound("uiTick");
        }
        const m = inp.mouse;
        let clicked = false;
        for (let i = 0; i < 15; i++) if (inRect(m, ...this.rect(i))) {
          if (m.moved) this.focus = i;
          if (m.click) {
            this.focus = i;
            clicked = true;
          }
        }
        if (inp.confirm || clicked) this.press(g);
        else if (inp.back || inp.pockets || m.rclick) {
          g.sound("uiCancel");
          g.ui.pop(this);
          this.onBack?.();
        }
      }
      press(g) {
        const slot = g.world.player.pockets[this.focus];
        if (!slot) {
          g.sound("uiError");
          return;
        }
        if (this.filter && !this.filter(slot, this.focus)) {
          g.sound("uiError");
          return;
        }
        g.sound("uiConfirm");
        if (this.onPick) {
          g.ui.pop(this);
          this.onPick(this.focus, slot);
          return;
        }
        const list = pocketActions(g, this.focus, slot);
        const it = ITEMS[slot.id];
        const menu = new Menu({ id: "pocketAction", title: null, items: list.concat([{ label: "Never mind", action: (gg, m) => gg.ui.pop(m) }]), x: 330, y: 150 - list.length * 10, w: 130, itemH: 18, gap: 2, dim: false, dimBack: false });
        g.ui.push(menu);
      }
      prompts() {
        return this.onPick ? [["confirm", "Choose"], ["back", "Back"]] : [["confirm", "Use"], ["back", "Close"]];
      }
      draw(g, hud) {
        dim(hud);
        const w = g.world.player;
        panel(hud, X0 - 12, Y0 - 28, COLS2 * CELL + 22, ROWS2 * CELL + 88, { fill: "white", trim: "sand" });
        drawText(hud, 240, Y0 - 21, this.title, { align: "center", scale: 2, color: "ink" });
        for (let i = 0; i < 15; i++) {
          const [x, y, cw, ch] = this.rect(i);
          const slot = w.pockets[i];
          const focused = i === this.focus;
          const allowed = !this.filter || !slot || this.filter(slot, i);
          panel(hud, x, y, cw, ch, { fill: focused ? "sand" : "white", trim: focused ? "orange" : "mist" });
          if (slot) {
            const it = ITEMS[slot.id];
            drawIcon(hud, x + 3, y + 3, it?.icon ?? "question", allowed ? it?.iconColors : GREY, 2);
          }
        }
        const s = w.pockets[this.focus];
        if (s) {
          const it = ITEMS[s.id];
          drawText(hud, 240, Y0 + ROWS2 * CELL + 3, it?.name ?? s.id, { align: "center", color: "ink" });
          textBlock(hud, X0 - 4, Y0 + ROWS2 * CELL + 15, COLS2 * CELL + 8, it?.line ?? "", { color: "slate" });
        } else drawText(hud, 240, Y0 + ROWS2 * CELL + 3, "An empty pocket.", { align: "center", color: "slate" });
        this.extraDraw?.(g, hud);
      }
    };
    GREY = { o: "mist", x: "mist", w: "white", "#": "slate" };
    pocketsScreen = () => new Grid({ id: "pockets", title: "Pockets" });
    pocketsPicker = (g, { title, filter, onPick, onCancel, extraDraw }) => {
      const gr = new Grid({ id: "pocketPick", title, filter, onPick, onBack: onCancel });
      gr.extraDraw = extraDraw;
      return gr;
    };
  }
});

// src/systems/favours.js
function dailyFavours(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:favours:${w.clock.day}`);
  for (const id of NEIGHBOUR_ORDER) {
    const f = w.npcs[id].favour;
    if (f && f.state === "offer") w.npcs[id].favour = null;
  }
  const here = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === "here" && !w.npcs[n].favour);
  for (const id of s.shuffle(here).slice(0, 2)) offerFavour(g, id, s);
}
function offerFavour(g, id, s = null) {
  const w = g.world;
  s ??= new Stream(`${w.seed}:favour:${id}:${w.clock.day}:${w.clock.minute}`);
  const pool = FAVOURS.filter((f2) => !f2.seasons || f2.seasons.includes(g.season));
  const idx = FAVOURS.indexOf(s.pick(pool));
  const f = FAVOURS[idx];
  const others = NEIGHBOUR_ORDER.filter((n) => n !== id && w.npcs[n].moved === "here");
  const target = s.pick(others);
  w.npcs[id].favour = { idx, state: "offer", target, deadline: null, reward: s.pick(REWARDS), day: w.clock.day };
  g.events.emit("favourOffered", { id, idx });
}
function* payOff(g, id, f, st) {
  const w = g.world;
  yield* say(g, id, f.done);
  const a = g.actorOf(id);
  a.play("Nod", 0.1, { once: true });
  gainFriend(g, id, 8);
  const bean = beanReward(g, w.npcs[id].friend);
  addBeans(g, bean, "favour");
  g.sound("bean");
  if (hasRoom(w)) {
    addItem(g, st.reward, { from: id });
  }
  yield* say(g, id, typeLine(g, id, "thanks"));
  g.ui.toastMsg(`+${bean} beans and a ${ITEMS[st.reward]?.name ?? "thing"}`);
  w.npcs[id].favour = null;
  w.stats.favoursDone += 1;
  g.events.emit("favourDone", { id });
}
function* favourTalk(g, id) {
  const w = g.world;
  const st = w.npcs[id].favour;
  if (!st) return;
  const f = FAVOURS[st.idx];
  const name = NEIGHBOURS[st.target]?.short ?? NEIGHBOURS[st.target]?.name ?? "someone";
  const extra = { target: name };
  if (st.state === "offer") {
    const lead = typeLine(g, id, "favour");
    yield* say(g, id, lead);
    const c2 = yield* ask(g, id, f.ask, ["All right", "Not today"], { extra });
    if (c2 !== 0) return;
    st.state = "active";
    if (f.kind === "catch") st.deadline = absMinute(w) + f.mins;
    if (f.kind === "deliver") {
      if (!hasRoom(w)) {
        yield* say(g, id, "Your pockets are full. Come back when there's room for it.");
        st.state = "offer";
        return;
      }
      addItem(g, "parcel", { questFor: st.target, from: id });
      g.sound("pickUp");
    }
    if (f.kind === "return") g.world.flags.lostFor = { owner: id, holder: st.target };
    g.events.emit("favourAccepted", { id, kind: f.kind });
    return;
  }
  if (f.kind === "catch" && st.deadline && absMinute(w) > st.deadline) {
    yield* say(g, id, "Too late. The moment's gone. I've made other arrangements with the moment.");
    w.npcs[id].favour = null;
    return;
  }
  if (f.kind === "fetch" || f.kind === "catch" || f.kind === "trade") {
    const i = w.player.pockets.findIndex((sl) => matches(f, sl));
    if (i < 0) {
      yield* say(g, id, f.kind === "catch" ? "Well? The clock's going. Where is it?" : "You haven't got it. I can tell. You're walking too lightly.");
      return;
    }
    const c2 = yield* ask(g, id, `That ${ITEMS[w.player.pockets[i].id].name}. Is that for me?`, ["Here you go", "Not this one"]);
    if (c2 !== 0) return;
    removeSlot(g, i);
    g.player.pose("Give", 0.5);
    yield 0.35;
    yield* payOff(g, id, f, st);
    return;
  }
  if (f.kind === "return") {
    const i = w.player.pockets.findIndex((sl) => sl?.id === "lostThing");
    if (i < 0) {
      yield* say(g, id, `Have you asked ${name}? Go on. I'll wait. I'm very good at it.`);
      return;
    }
    removeSlot(g, i);
    yield* payOff(g, id, f, st);
    return;
  }
  if (f.kind === "deliver") yield* say(g, id, `It's for ${name}. Off you go.`);
}
function* favourFarEnd(g, id) {
  const w = g.world;
  const i = w.player.pockets.findIndex((sl) => sl?.id === "parcel" && sl.questFor === id);
  if (i >= 0) {
    const slot = removeSlot(g, i);
    const owner = slot.from;
    const st = w.npcs[owner]?.favour;
    const f = st ? FAVOURS[st.idx] : null;
    g.player.pose("Give", 0.5);
    yield 0.3;
    yield* say(g, id, f?.done ?? "Oh. Thank you.");
    if (st) {
      gainFriend(g, owner, 6);
      gainFriend(g, id, 3);
      const bean = beanReward(g, w.npcs[owner].friend);
      addBeans(g, bean, "favour");
      g.sound("bean");
      g.ui.toastMsg(`+${bean} beans, from ${NEIGHBOURS[owner]?.short ?? owner}'s errand`);
      w.npcs[owner].favour = null;
      w.stats.favoursDone += 1;
      remember(g, "gift", { item: "parcel", about: id });
      g.events.emit("favourDone", { id: owner });
    }
    return true;
  }
  if (w.flags.lostFor?.holder === id) {
    if (!hasRoom(w)) {
      yield* say(g, id, "I've got it here, but your pockets are full. Come back.");
      return true;
    }
    yield* say(g, id, "Oh, that. It's been holding up a table. Take it. The table can face the truth.");
    addItem(g, "lostThing", {});
    g.sound("pickUp");
    w.flags.lostFor = null;
    return true;
  }
  return false;
}
var REWARDS, matches, beanReward;
var init_favours = __esm({
  "src/systems/favours.js"() {
    init_neighbours();
    init_items();
    init_rng();
    init_say();
    init_lines();
    init_economy();
    init_tuning();
    init_talk();
    init_time();
    init_memory();
    REWARDS = ["shellConch", "driftBottle", "mushroom", "stationery", "seedTulip", "seedDaisy", "seedRose", "seedBellflower", "medicine", "plainGreen", "capBlue", "pottedPlant", "bearToy", "cottageSide", "mossyPlant", "bureauCan"];
    matches = (f, slot) => {
      if (!slot) return false;
      const it = ITEMS[slot.id];
      if (f.anyCat) return it?.cat === f.anyCat;
      return slot.id === f.item;
    };
    beanReward = (g, friend) => Math.round((300 + friend * 12) * tuning.favourMult);
  }
});

// src/systems/story.js
function storyMorning(g, c2) {
  const w = g.world;
  const f = w.flags;
  const day = w.clock.daysPlayed;
  const once = (k, fn) => {
    if (!f[k]) {
      f[k] = true;
      fn();
    }
  };
  if (day >= 2) once("museumOpen", () => {
    w.museum.open = true;
    sendMail(g, { from: "museum", body: "Dear {player},\nThe museum is open! It was open before, but now it's open on purpose. Bring me your fossil! Bring me everything!\nDr. Quill\nP.S. Is this the right address? Is this a letter?", arriveDay: w.clock.day });
    sendMail(g, { from: "gander", body: "Dear {player},\nAn Axe and a Slingshot have come in at the store. I've put your name on them. Not on the price.\nMrs. Gander", arriveDay: w.clock.day });
    sendMail(g, { from: "clementine", body: "Dear {player},\nThe bus runs from the stop by the road. The fare is listening. It goes to the Big City. It comes back. Mostly.\nClementine", arriveDay: w.clock.day });
  });
  if (day >= 3) once("chimeAsk", () => sendMail(g, { from: "clementine", body: "Dear {player},\nThe Old Bell needs a tune. Whatever you set at the Hall, everyone hears, every hour, forever. No pressure. I've said that twice now, and the bee is laughing.\nClementine", arriveDay: w.clock.day }));
  if (day === 7 || day > 7 && !f.roccoTalked && w.npcs.rocco.moved === "here") f.roccoNews = true;
  if (day >= 8 && w.npcs.rocco.moved === "here") f.roccoBoxes = true;
  if (day >= 9 && w.npcs.rocco.moved === "here") roccoLeaves(g);
  if (day >= 15) once("roccoLetter", () => sendMail(g, { from: "rocco", body: "{player}!\nThe City's got HILLS! Well, ramps! I've got a room up four flights and I roll round the block! Tell Nib to keep at it! I'm coming back for the Long Night, let's roll!\nRocco", arriveDay: w.clock.day }));
  if (villageDay(w.clock.day).calendarDay === 16) f.roccoVisit = true;
  if (villageDay(w.clock.day).calendarDay === 11) once("soupNote", () => sendMail(g, { from: "dorrit", body: "Dear {player},\nThe Great Soup is tomorrow, mmhm. Everyone adds three things. Bring something good. Don't bring a boot. Someone always brings a boot.\nDorrit", arriveDay: w.clock.day }));
  if (c2.season === 3 && Object.values(w.town.objects).filter((o) => o.k === "snowball").length < 8) g.life?.spawnSnowballs?.();
  if (day === 17 || f.yearDone && !f.yearTwoLetter) once("yearTwoLetter", () => sendMail(g, { from: "clementine", body: "Dear {player},\nIt's a new year. It's the same year, but with the number changed. The village thanks you. The bee is thinking about it.\nClementine", arriveDay: w.clock.day }));
}
function roccoLeaves(g) {
  const w = g.world;
  const r = w.npcs.rocco;
  if (r.moved !== "here") return;
  r.moved = "gone";
  w.npcs.fitch.moved = "here";
  const best = r.friend >= 70;
  const argued = w.story.roccoArgue === true;
  const body = argued ? "{player}!\nYou told me to stay! Nobody ever told me to stay! I'm still going! But I rolled slower past your house! Let's roll!\nRocco" : "{player}!\nI'm off! There's a whole City with stairs in it and I'm going to beat them all! Look after Nib! Let's roll!\nRocco";
  sendMail(g, { from: "rocco", body, gift: best ? "roccoTrophy" : null, arriveDay: w.clock.day });
  remember(g, "gift", { item: "goodbye", about: "rocco" });
  g.npcs.get("rocco").inside = true;
  g.npcs.syncVisibility(g.npcs.get("rocco"));
  g.npcs.get("fitch").inside = false;
  g.npcs.syncVisibility(g.npcs.get("fitch"));
  g.events.emit("moveOut", { id: "rocco" });
  g.events.emit("moveIn", { id: "fitch" });
}
function* storyTalk(g, id) {
  const w = g.world;
  const f = w.flags;
  if (yield* favourFarEnd(g, id)) return true;
  if (id === "rocco" && f.roccoNews && !f.roccoTalked) {
    f.roccoTalked = true;
    yield* say(g, id, ["Hey! I've got news! Big news! Heavy news! I've been looking at the road! Let's… let's roll!", "I'm leaving! Day after tomorrow! There's a whole Big City out there with hills I've never beaten! I've rolled everything here! Twice!"]);
    const c2 = yield* ask(g, id, "What do you reckon? You think I should go? Be honest! I'm going anyway!", ["Stay. Please.", "You should go.", "Who's going to train Nib?"]);
    if (c2 === 0) {
      w.story.roccoArgue = true;
      yield* say(g, id, ["…Nobody's ever said that to me. I don't have a trophy for that. I'd have to make a new one.", "I'm still going! But… I'll roll a bit slower past your place! Let's roll."]);
      w.npcs[id].friend = Math.min(100, w.npcs[id].friend + 12);
    } else if (c2 === 1) {
      w.story.roccoArgue = false;
      yield* say(g, id, ["That's what I said! To the mirror! It agreed! Let's roll!"]);
    } else {
      w.story.roccoArgue = null;
      yield* say(g, id, ["Ha! Nib's got potential! He'll be fine! He doesn't know I'm going! Don't tell him! He'll be so relieved. | …Let's roll."]);
    }
    g.events.emit("roccoTalk", { argue: w.story.roccoArgue });
    return true;
  }
  if (id === "rocco" && f.roccoBoxes) {
    yield* say(g, id, ["Boxes! So many boxes! They're great for the arms! I've packed the gym! It's in a box! The box is the gym now! Let's roll!"]);
    return true;
  }
  if (id === "fitch" && !f.fitchMet) {
    f.fitchMet = true;
    yield* say(g, id, ["Hey. Hey, friend. New guy. Fitch. I got the armadillo's place. He left me the gym. I sold the gym.", "Lived here a whole morning and I can already tell you what you need. Nothing. For twelve beans. No refunds."]);
    return true;
  }
  return false;
}
var init_story = __esm({
  "src/systems/story.js"() {
    init_say();
    init_mail();
    init_favours();
    init_economy();
    init_calendar();
    init_memory();
  }
});

// src/systems/talk.js
function contextLine(g, id) {
  const w = g.world;
  const h = hourNow(w);
  const hh = h < 5 ? h + 24 : h;
  const k = weatherNow(g);
  const season = ["spring", "summer", "autumn", "winter"][g.season];
  const s = new Stream(`${w.seed}:ctx:${id}:${w.clock.day}:${w.stats.talks[id] ?? 0}`);
  const r = s.next();
  if (r < 0.2) return typeLine(g, id, hh < 11 ? "morning" : hh < 16 ? "noon" : hh < 21 ? "evening" : "night");
  if (r < 0.38) return typeLine(g, id, k === "storm" ? "rain" : k === "fog" || k === "clear" ? "sun" : k);
  if (r < 0.5) return typeLine(g, id, season);
  if (r < 0.75) return uniqueLine(g, id);
  return typeLine(g, id, "chatter");
}
function* talkTo(g, id) {
  const w = g.world;
  const s = w.npcs[id];
  const data = NEIGHBOURS[id];
  const npc = g.npcs.get(id);
  const first = s.talkedDay !== w.clock.day;
  w.stats.talks[id] = (w.stats.talks[id] ?? 0) + 1;
  g.events.emit("talked", { id, first });
  npc.talking = true;
  const hr = hourNow(w) < 5 ? hourNow(w) + 24 : hourNow(w);
  if (npc.inside && (hr < data.wake || hr >= data.sleep)) {
    g.player.play("Idle");
    yield* say(g, id, typeLine(g, id, "night"));
    npc.talking = false;
    return;
  }
  const a = g.actorOf(id);
  a.play("Talk", 0.15);
  if (first) {
    s.talkedDay = w.clock.day;
    gainFriend(g, id, 3);
  }
  const handled = yield* day1Talk(g, id);
  if (handled) {
    npc.talking = false;
    return;
  }
  const storyDone = yield* storyTalk(g, id);
  if (storyDone) {
    npc.talking = false;
    return;
  }
  let opening = null;
  if (first && s.absentNote) {
    opening = typeLine(g, id, "absent");
    s.absentNote = false;
  } else if (g.world.player.puffy && !s.sawPuffy) {
    s.sawPuffy = true;
    opening = "Your *face*! What happened to your face?! No. Don't tell me. It's wasps. It's always wasps.";
  } else if (first && s.friend < 12) {
    opening = typeLine(g, id, "greet");
  } else {
    const m = first ? memoryLine(g, id) : null;
    if (m) opening = m.text;
    else if (first) opening = typeLine(g, id, "greet");
    else opening = contextLine(g, id);
  }
  const fav = s.favour;
  const options = [];
  if (fav && fav.state === "active") options.push("About that favour…");
  if (fav && fav.state === "offer") options.push("Need anything?");
  options.push("Chat");
  options.push("Give a gift");
  options.push("Bye");
  const c2 = yield* ask(g, id, opening, options, { extra: { neighbour: "someone" } });
  const pick = options[c2];
  if (pick === "Chat") {
    a.play("Talk", 0.15);
    const r = new Stream(`${w.seed}:chat:${id}:${w.stats.talks[id]}`).next();
    const line2 = r < 0.35 ? gossipLine(g, id) : r < 0.6 ? uniqueLine(g, id) : r < 0.82 ? typeLine(g, id, "chatter") : typeLine(g, id, "hungry");
    yield* say(g, id, line2);
  } else if (pick === "Give a gift") {
    yield* giveGift(g, id);
  } else if (pick === "About that favour…" || pick === "Need anything?") {
    yield* favourTalk(g, id);
  }
  a.play("Idle", 0.2);
  npc.talking = false;
}
function* giveGift(g, id) {
  const w = g.world;
  const s = w.npcs[id];
  let picked = -2;
  g.ui.push(pocketsPicker(g, { title: `Give to ${NEIGHBOURS[id].short ?? NEIGHBOURS[id].name}`, filter: (slot2) => ITEMS[slot2.id] && ITEMS[slot2.id].cat !== "tool" && !ITEMS[slot2.id].noSell, onPick: (i) => {
    picked = i;
  }, onCancel: () => {
    picked = -1;
  } }));
  while (picked === -2) yield;
  if (picked < 0) return false;
  const slot = removeSlot(g, picked);
  const it = ITEMS[slot.id];
  const score = giftScore(id, slot.id);
  const bank = score >= 2 ? "giftLove" : score === 1 ? "giftLike" : score === 0 ? "giftMeh" : "giftHate";
  gainFriend(g, id, score >= 2 ? 10 : score === 1 ? 5 : score === 0 ? 2 : 0);
  remember(g, "gift", { item: it.name, about: id });
  g.events.emit("gift", { id, item: slot.id, score });
  w.stats.gifts = (w.stats.gifts ?? 0) + 1;
  g.player.pose("Give", 0.5);
  yield 0.35;
  const a = g.actorOf(id);
  a.play(score >= 1 ? "Love" : score === 0 ? "Shrug" : "ShakeHead", 0.1, { once: true });
  yield* say(g, id, typeLine(g, id, bank));
  if (slot.id === "cheeseOff" && id === "ozzie") yield* say(g, id, "This has gone off. Do you know what that means? It means it was *on*. You didn't hear it from me.");
  return true;
}
var gainFriend;
var init_talk = __esm({
  "src/systems/talk.js"() {
    init_neighbours();
    init_types();
    init_lines();
    init_memory();
    init_say();
    init_tuning();
    init_time();
    init_economy();
    init_items();
    init_pockets();
    init_favours();
    init_dayone();
    init_story();
    init_rng();
    gainFriend = (g, id, n) => {
      const s = g.world.npcs[id];
      s.friend = Math.min(100, Math.max(0, s.friend + Math.round(n * (n > 0 ? tuning.friendMult : 1) * (g.world.player.luck === "friend" && n > 0 ? 1.5 : 1))));
      g.events.emit("friend", { id, friend: s.friend });
    };
  }
});

// src/systems/bell.js
function chimeScene(g, { harmonise = false, step = 0.2 } = {}) {
  return (function* () {
    const notes = g.world.chime;
    const a = g.ctx.audio;
    const bell = g.town?.bellPivot;
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n >= 0) {
        a.play("bellNote", { pitch: noteOf(n) - 5, volume: 0.8 });
        if (harmonise) {
          a.play("bellNote", { pitch: noteOf(n) - 5 + 4, volume: 0.5 });
          a.play("bellNote", { pitch: noteOf(n) - 5 - 5, volume: 0.5 });
        }
        if (bell) bell.rotation.z = i % 2 ? 0.28 : -0.28;
      }
      yield step;
    }
    if (bell) bell.rotation.z = 0;
  })();
}
function playChime(g, opts) {
  g.events.emit("chime", {});
  g.world.flags.chimesHeard = (g.world.flags.chimesHeard ?? 0) + 1;
  g.music.suspend = 3.4;
  g.ctx.audio.playMusic(null);
  g.music.current = null;
  g.scripts.run(chimeScene(g, opts), { hold: false, name: "chime" });
}
var SCALE, noteOf;
var init_bell = __esm({
  "src/systems/bell.js"() {
    SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
    noteOf = (i) => SCALE[(i % 10 + 10) % 10];
  }
});

// src/ui/screens/keyboard.js
function* keyboardFlow(g, opts) {
  let result = null;
  g.ui.push(new Keyboard({ ...opts, onDone: (v2) => {
    result = v2;
  }, onCancel: opts.canCancel ? () => {
    result = "";
  } : null }));
  while (result === null) yield;
  return result;
}
var ROWS3, CELL2, GRID_Y, BUTTON_Y, Keyboard, openKeyboard;
var init_keyboard = __esm({
  "src/ui/screens/keyboard.js"() {
    init_draw();
    ROWS3 = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "abcdefghijklm", "nopqrstuvwxyz", "0123456789.,!", "?'-&() _"];
    CELL2 = 24;
    GRID_Y = 70;
    BUTTON_Y = GRID_Y + ROWS3.length * CELL2 + 2;
    Keyboard = class {
      constructor({ title, max = 12, value = "", hint = "", random = null, onDone, onCancel, multi = false }) {
        this.id = "keyboard";
        this.title = title;
        this.max = max;
        this.value = value;
        this.hint = hint;
        this.random = random;
        this.onDone = onDone;
        this.onCancel = onCancel;
        this.cx = 0;
        this.cy = 0;
        this.multi = multi;
        this.randomI = 0;
      }
      labels() {
        return ROWS3;
      }
      currentText() {
        return this.value;
      }
      focusIndex() {
        return this.cy * 20 + this.cx;
      }
      rect(cx, cy) {
        return [240 - 13 * CELL2 / 2 + cx * CELL2, GRID_Y + cy * CELL2, CELL2 - 2, CELL2 - 2];
      }
      type(g, ch) {
        if (this.value.length < this.max) {
          this.value += ch;
          g.sound("uiTick");
        } else g.sound("uiError");
      }
      rowsAt(y) {
        return y < ROWS3.length ? ROWS3[y].length : 2;
      }
      commit(g) {
        const v2 = this.value.trim();
        if (!v2) {
          g.sound("uiError");
          return;
        }
        g.sound("uiConfirm");
        g.ui.pop(this);
        this.onDone(v2);
      }
      update(g, inp) {
        for (const k of inp.keysTyped) {
          if (k === "Enter") {
            this.commit(g);
            return;
          }
          if (k === "Backspace") {
            this.value = this.value.slice(0, -1);
            g.sound("uiTick");
            continue;
          }
          if (k.length === 1 && /[A-Za-z0-9 .,!?'&()_-]/.test(k)) this.type(g, k);
        }
        const typing = inp.keysTyped.length > 0;
        if (inp.nav.right && !typing) {
          this.cx++;
          g.sound("uiTick");
        }
        if (inp.nav.left && !typing) {
          this.cx--;
          g.sound("uiTick");
        }
        if (inp.nav.up && !typing) {
          this.cy = (this.cy + ROWS3.length) % (ROWS3.length + 1);
          g.sound("uiTick");
        }
        if (inp.nav.down && !typing) {
          this.cy = (this.cy + 1) % (ROWS3.length + 1);
          g.sound("uiTick");
        }
        const len = this.rowsAt(this.cy);
        this.cx = (this.cx % len + len) % len;
        const m = inp.mouse;
        if (m.moved || m.click) {
          for (let y = 0; y < ROWS3.length; y++) for (let x = 0; x < ROWS3[y].length; x++) if (inRect(m, ...this.rect(x, y))) {
            this.cx = x;
            this.cy = y;
            if (m.click) this.type(g, ROWS3[y][x]);
          }
        }
        const r0 = [150, BUTTON_Y, 80, 20], r1 = [250, BUTTON_Y, 80, 20];
        if (m.click && inRect(m, ...r0)) {
          this.value = this.value.slice(0, -1);
          g.sound("uiTick");
        }
        if (m.click && inRect(m, ...r1)) {
          this.commit(g);
          return;
        }
        if (inp.confirm && !typing) {
          if (this.cy >= ROWS3.length) {
            if (this.cx === 0) {
              this.value = this.value.slice(0, -1);
              g.sound("uiTick");
            } else {
              this.commit(g);
              return;
            }
          } else this.type(g, ROWS3[this.cy][this.cx]);
        }
        if (inp.square) {
          this.value = this.value.slice(0, -1);
          g.sound("uiTick");
        }
        if (inp.triangle && this.random) {
          this.value = this.random[this.randomI++ % this.random.length];
          g.sound("uiConfirm");
        }
        if (g.ctx.input.wasPressed("Tab") && this.random) {
          this.value = this.random[this.randomI++ % this.random.length];
          g.sound("uiConfirm");
        }
        if (g.ctx.input.wasPressed("PadCircle") || m.rclick || g.ctx.input.wasPressed("Escape")) {
          if (this.onCancel) {
            g.sound("uiCancel");
            g.ui.pop(this);
            this.onCancel();
          } else if (this.value) {
            this.value = this.value.slice(0, -1);
            g.sound("uiTick");
          }
        }
      }
      prompts(g) {
        const p = g.inp.device === "pad" ? [["confirm", "Type"], ["rubout", "Rub out"]] : [["done", "Done"], ["rubout", "Rub out"]];
        if (this.random) p.push(["random", "Suggest"]);
        if (this.onCancel) p.push(["back", "Never mind"]);
        return p;
      }
      draw(g, hud) {
        dim(hud);
        panel(hud, 60, 14, 360, 240, { fill: "white", trim: "sand" });
        drawText(hud, 240, 20, this.title, { align: "center", color: "ink", scale: 1 });
        panel(hud, 80, 30, 320, 22, { fill: "sand", trim: "orange" });
        const shown = this.value.length > 44 ? `…${this.value.slice(-44)}` : this.value;
        const w = textWidth(shown);
        drawText(hud, 88, 37, shown, { color: "ink" });
        if (Math.floor(g.ctx.time * 2) % 2 === 0) hud.rect(89 + w, 36, 2, 9, "plum");
        if (this.hint) drawText(hud, 240, 57, this.hint, { align: "center", color: "slate" });
        ROWS3.forEach((row, y) => [...row].forEach((ch, x) => {
          const [rx, ry, rw, rh] = this.rect(x, y);
          const f = this.cy === y && this.cx === x;
          panel(hud, rx, ry, rw, rh, { fill: f ? "sand" : "white", trim: f ? "orange" : "mist" });
          drawText(hud, rx + rw / 2, ry + 7, ch === " " ? "_" : ch, { align: "center", color: "ink" });
        }));
        const by = BUTTON_Y;
        const f0 = this.cy === ROWS3.length && this.cx === 0, f1 = this.cy === ROWS3.length && this.cx === 1;
        panel(hud, 150, by, 80, 20, { fill: f0 ? "sand" : "white", trim: f0 ? "orange" : "mist" });
        drawText(hud, 190, by + 6, "Rub out", { align: "center", color: "ink" });
        panel(hud, 250, by, 80, 20, { fill: f1 ? "sand" : "white", trim: f1 ? "orange" : "mist" });
        drawText(hud, 290, by + 6, "Done", { align: "center", color: "ink" });
      }
    };
    openKeyboard = (g, opts) => g.ui.push(new Keyboard(opts));
  }
});

// src/ui/screens/numbers.js
function* numberPicker(g, { title, max, step = 100 }) {
  if (max <= 0) return 0;
  let done = null;
  g.ui.push(new NumberScreen({ title, max, step: Math.min(step, Math.max(1, max)), onDone: (v2) => {
    done = v2;
  } }));
  while (done === null) yield;
  return done;
}
function* menuChoiceFree(g, title, labels, o = {}) {
  let result = -2;
  const items = labels.map((l, i) => ({ label: l, action: (gg, m) => {
    result = i;
    gg.ui.pop(m);
  } }));
  g.ui.push(new Menu({ id: o.id ?? "choice", title, items, x: o.x ?? 130, y: o.y ?? 70, w: o.w ?? 220, back: (gg, m) => {
    result = -1;
    gg.ui.pop(m);
  } }));
  while (result === -2) yield;
  return result;
}
var NumberScreen;
var init_numbers = __esm({
  "src/ui/screens/numbers.js"() {
    init_draw();
    init_ui();
    NumberScreen = class {
      constructor({ title, max, step, onDone }) {
        this.id = "number";
        this.title = title;
        this.max = max;
        this.step = step;
        this.value = Math.min(max, step * 10);
        this.onDone = onDone;
      }
      focusIndex() {
        return this.value;
      }
      labels() {
        return [String(this.value)];
      }
      update(g, inp) {
        const m = inp.mouse;
        const big = this.step * 10;
        let v2 = this.value;
        if (inp.nav.up) v2 += this.step;
        if (inp.nav.down) v2 -= this.step;
        if (inp.nav.right) v2 += big;
        if (inp.nav.left) v2 -= big;
        if (m.click) {
          if (inRect(m, 160, 100, 30, 30)) v2 -= big;
          if (inRect(m, 290, 100, 30, 30)) v2 += big;
          if (inRect(m, 200, 154, 80, 22)) {
            g.sound("uiConfirm");
            g.ui.pop(this);
            this.onDone(this.value);
            return;
          }
        }
        if (g.ctx.input.wasPressed("KeyM") || inp.square) v2 = this.max;
        v2 = Math.max(0, Math.min(this.max, v2));
        if (v2 !== this.value) {
          this.value = v2;
          g.sound("uiTick");
        }
        if (inp.confirm) {
          g.sound("uiConfirm");
          g.ui.pop(this);
          this.onDone(this.value);
          return;
        }
        if (inp.back || m.rclick) {
          g.sound("uiCancel");
          g.ui.pop(this);
          this.onDone(0);
        }
      }
      prompts() {
        return [["confirm", "OK"], ["fill", "All of it"], ["back", "Cancel"]];
      }
      draw(g, hud) {
        dim(hud);
        panel(hud, 120, 60, 240, 130, { fill: "white", trim: "sand" });
        drawText(hud, 240, 70, this.title, { align: "center", color: "ink" });
        drawText(hud, 240, 104, this.value.toLocaleString("en-US"), { align: "center", color: "ink", scale: 3 });
        drawText(hud, 240, 132, `of ${this.max.toLocaleString("en-US")}`, { align: "center", color: "slate" });
        panel(hud, 160, 100, 30, 30, { fill: "sand", trim: "orange" });
        drawText(hud, 175, 110, "<", { align: "center", color: "ink" });
        panel(hud, 290, 100, 30, 30, { fill: "sand", trim: "orange" });
        drawText(hud, 305, 110, ">", { align: "center", color: "ink" });
        panel(hud, 200, 154, 80, 22, { fill: "sand", trim: "orange" });
        drawText(hud, 240, 161, "OK", { align: "center", color: "ink" });
      }
    };
  }
});

// src/systems/session.js
function saveNow(g) {
  if (g.demo || !g.world || g.world.story.stage === "new") return;
  g.world.meta.lastSeenMs = g.realNow ?? g.world.meta.lastSeenMs;
  saveWorld(g.world);
}
function markSessionOpen(g) {
  if (!g.demo) store.set(SESSION_KEY, { open: true });
}
function markSessionClean(g) {
  if (!g.demo) store.set(SESSION_KEY, { open: false });
}
function lastSessionUnclean() {
  return store.get(SESSION_KEY)?.open === true;
}
var init_session = __esm({
  "src/systems/session.js"() {
    init_save();
    init_storage();
  }
});

// src/systems/cheese.js
function cheeseCurve(pattern, base, tick, rng, vol = 1) {
  const noise = () => 1 + (rng.next() - 0.5) * 0.12 * vol;
  switch (pattern) {
    case "Rising":
      return Math.round(base * (1 + (tick + 1) * 0.28 * vol) * noise());
    case "Falling":
      return Math.max(10, Math.round(base * (1 - (tick + 1) * 0.12 * vol) * noise()));
    case "Wobble":
      return Math.max(10, Math.round(base * (1 + Math.sin(tick * 2.1 + 1) * 0.35 * vol) * noise()));
    case "Spike": {
      const peak = 3 + Math.floor(rng.next() * 3);
      const spikeTick = 3;
      if (tick < spikeTick - 1) return Math.max(10, Math.round(base * (0.8 + tick * 0.1) * noise()));
      if (tick === spikeTick) return Math.round(base * (1 + (peak - 1) * vol));
      if (tick === spikeTick - 1 || tick === spikeTick + 1) return Math.round(base * (1 + (peak - 1) * 0.45 * vol) * noise());
      return Math.max(10, Math.round(base * 0.7 * noise()));
    }
    default:
      return base;
  }
}
function cheeseState(w, seasonOfWeek, marketDay) {
  const s = new Stream(`${w.seed}:cheese:${marketDay}`);
  const pattern = s.pick(CHEESE_PATTERNS);
  const base = s.int(90, 110);
  const prices = [];
  for (let t = 0; t < 6; t++) prices.push(cheeseCurve(pattern, base, t, new Stream(`${w.seed}:cheese:${marketDay}:${t}`), tuning.cheeseVol));
  return { pattern, base, prices };
}
function cheeseDayReset(g, c2) {
  const w = g.world;
  if (c2.market) {
    w.cheese.day = w.clock.day;
    for (const slot of w.player.pockets) if (slot?.id === "cheese" && slot.buyDay < w.clock.day) {
      slot.id = "cheeseOff";
      g.events.emit("cheeseOff", {});
      g.sound("cheeseSmell");
    }
    for (const k of Object.keys(w.town.objects)) {
      const o = w.town.objects[k];
      if (o.k === "drop" && o.item === "cheese") {
        o.item = "cheeseOff";
        g.town.dirty.add(k);
      }
    }
  }
}
function cheesePriceNow(g) {
  const w = g.world;
  const market = w.cheese.day || 1;
  const st = cheeseState(w, g.season, market);
  const since = w.clock.day - market;
  if (since <= 0 || since > 3) return st.base;
  const tick = (since - 1) * 2 + (w.clock.minute >= 14 * 60 ? 1 : 0);
  if (w.clock.minute < 8 * 60 && since === 1) return st.base;
  return st.prices[Math.min(5, tick)];
}
function buyCheese(g, n = 1) {
  const w = g.world;
  const st = cheeseState(w, g.season, w.cheese.day || w.clock.day);
  const cost = st.base * n;
  if (w.player.beans < cost || !hasRoom(w)) return false;
  addBeans(g, -cost, "cheese");
  for (let i = 0; i < n; i++) addItem(g, "cheese", { buyDay: w.clock.day, boughtFor: st.base });
  w.stats.cheeseBought = (w.stats.cheeseBought ?? 0) + n;
  g.events.emit("cheeseBought", { n, price: st.base });
  return true;
}
var CHEESE_PATTERNS;
var init_cheese = __esm({
  "src/systems/cheese.js"() {
    init_rng();
    init_tuning();
    init_economy();
    CHEESE_PATTERNS = ["Rising", "Falling", "Wobble", "Spike"];
  }
});

// src/systems/rating.js
function scoreHome(w) {
  const items = Object.values(w.home.rooms).flatMap((r) => r.items);
  let score = 0;
  const notes = [];
  const sets = {};
  let value = 0;
  for (const i of items) {
    const it = ITEMS[i.id];
    if (!it) continue;
    value += it.price ?? 0;
    if (it.set) sets[it.set] = (sets[it.set] ?? 0) + 1;
  }
  score += Math.min(60, Math.round(value / 800));
  for (const n of Object.values(sets)) if (n >= 4) score += 15 + (n - 4) * 3;
  const pal2 = new Set(items.map((i) => ITEMS[i.id]?.palette?.wood).filter(Boolean));
  const harmony = items.length >= 3 && pal2.size <= 2;
  if (harmony) score += 10;
  const near = (a, b, r = 2) => Math.abs(a.x - b.x) <= r && Math.abs(a.z - b.z) <= r;
  for (const room of Object.values(w.home.rooms)) {
    const lamps = room.items.filter((i) => ITEMS[i.id]?.func === "lamp");
    const seats = room.items.filter((i) => ITEMS[i.id]?.func === "seat");
    const rugs = room.items.filter((i) => ITEMS[i.id]?.func === "rug");
    const tables = room.items.filter((i) => ITEMS[i.id]?.tags?.includes("table"));
    const plants = room.items.filter((i) => ITEMS[i.id]?.func === "plant");
    if (lamps.some((l) => seats.some((s) => near(l, s)))) {
      score += 8;
      notes.push("lamp");
    }
    if (rugs.some((r) => tables.some((t) => near(r, t, 1)))) {
      score += 8;
      notes.push("rug");
    }
    if (plants.length) {
      score += 6;
      notes.push("plant");
    }
    if (seats.length > 4) {
      score -= 6;
      notes.push("chairs");
    }
    const area = 36;
    if (room.items.length > area / 3) score -= 10;
  }
  if (w.home.stereo) {
    score += 6;
    notes.push("music");
  }
  return { score: Math.max(0, score), notes, value };
}
function rollHomeRating(g) {
  const w = g.world;
  const { score, notes } = scoreHome(w);
  const grade = gradeOf(score);
  const s = new Stream(`${w.seed}:bureau:${w.clock.day}`);
  const crit = notes.includes("chairs") ? "Too many chairs. Who are you expecting?" : notes.includes("rug") ? "You've got a nice rug. It's the only thing here I'd rescue." : s.pick(HOSTS.brisket.critique);
  const improved = !w.home.bestGrade || GRADES.findIndex((x) => x.g === grade.g) > GRADES.findIndex((x) => x.g === w.home.bestGrade);
  w.home.lastGrade = grade.g;
  w.home.lastScore = score;
  w.home.lastCritique = crit;
  if (improved) w.home.bestGrade = grade.g;
  sendMail(g, { from: "bureau", body: `BETTER BURROWS BUREAU
Grade: ${grade.g}. ${score} points.
${crit}${improved ? " A new grade. Collect your plaque at the Bureau." : ""}
Agent Brisket`, arriveDay: w.clock.day });
  g.events.emit("homeGraded", { grade: grade.g, score });
}
var GRADES, gradeOf;
var init_rating = __esm({
  "src/systems/rating.js"() {
    init_items();
    init_furniture();
    init_mail();
    init_hosts();
    init_rng();
    GRADES = [{ g: "C", min: 0, reward: "bureauC" }, { g: "B", min: 40, reward: "bureauB" }, { g: "A", min: 90, reward: "bureauA" }, { g: "S", min: 150, reward: "bureauS" }];
    gradeOf = (score) => {
      let g = GRADES[0];
      for (const x of GRADES) if (score >= x.min) g = x;
      return g;
    };
  }
});

// src/systems/flow.js
function occupied2(g, x, z) {
  const t = g.town;
  return t.solid[z * COLS + x] === 1;
}
function randomSpot(g, rng, surfaces, tries = 60, region = null) {
  const w = g.world;
  for (let i = 0; i < tries; i++) {
    const x = region ? rng.int(region[0], region[2]) : rng.int(2, COLS - 3);
    const z = region ? rng.int(region[1], region[3]) : rng.int(2, ROWS - 3);
    const c2 = tileChar(x, z);
    const info = tileInfo(c2);
    if (!info.walk || !surfaces.includes(info.surface)) continue;
    if (!empty(w, x, z) || occupied2(g, x, z)) continue;
    return [x, z];
  }
  return null;
}
function newDay(g) {
  const w = g.world;
  w.clock.day += 1;
  w.clock.daysPlayed += 1;
  w.stats.days += 1;
  if (villageDay(w.clock.day).calendarDay === 1) w.clock.year += w.clock.day > 1 ? 1 : 0;
  const c2 = calendar(w, g.realNow);
  w.mail.sentToday = 0;
  g.weatherKey = null;
  dailyRespawn(g, c2);
  growNight(g, c2);
  dailyFavours(g);
  cheeseDayReset(g, c2);
  storyMorning(g, c2);
  seasonalGranLetter(g, c2);
  neighbourLetters(g, c2);
  if (w.player.luck) w.player.luck = null;
  if (w.player.puffy && (w.flags.stungDay ?? 0) < w.clock.day) w.player.puffy = false;
  if (c2.show === true) rollHomeRating(g);
  if (c2.season !== g.season) {
    g.seasonChanging = true;
    const interest = Math.floor(w.player.jar * 5e-3);
    if (interest > 0) {
      w.player.jar += interest;
      sendMail(g, { from: "clementine", body: `Dear {player},
Your Bean Jar earned ${interest} beans of interest. We are very interested.
Clementine`, arriveDay: w.clock.day });
    }
    g.events.emit("jarInterest", { interest });
  }
  if (Object.values(w.town.objects).filter((o) => o.k === "weed").length > 15 && !w.story.day1Active) remember(g, "noWeeds", {});
  g.life.resetDay();
  g.festivals.resetDay();
  g.npcs.scatter();
  g.events.emit("day", { day: w.clock.day });
}
function dailyRespawn(g, c2 = calendar(g.world, g.realNow)) {
  const w = g.world;
  const o = w.town.objects;
  const rng = dayStream(w, "respawn");
  const weeds = Object.values(o).filter((x) => x.k === "weed").length;
  for (let i = 0; i < tuning.weedsPerDay && weeds + i < 40; i++) {
    const s = randomSpot(g, rng, ["lawn"]);
    if (s) {
      o[`${s[0]},${s[1]}`] = { k: "weed" };
      g.town.dirty.add(`${s[0]},${s[1]}`);
    }
  }
  for (const [k, v2] of Object.entries(o)) {
    if (v2.k === "crack" || v2.k === "sparkle" || v2.k === "shell") {
      delete o[k];
      g.town.dirty.add(k);
    }
    if (v2.k === "hole" && !v2.buried && rng.chance(0.6)) {
      delete o[k];
      g.town.dirty.add(k);
    }
    if (v2.k === "tree") {
      v2.wasp = false;
      v2.hasBag = false;
      v2.hasFurniture = false;
    }
  }
  for (let i = 0; i < 3; i++) {
    const s = randomSpot(g, rng, ["lawn", "sand"]);
    if (s) {
      o[`${s[0]},${s[1]}`] = { k: "crack", item: "unknownFossil" };
      g.town.dirty.add(`${s[0]},${s[1]}`);
    }
  }
  const sp = randomSpot(g, rng, ["lawn", "sand"]);
  if (sp) {
    o[`${sp[0]},${sp[1]}`] = { k: "sparkle", item: "bagOfBeans" };
    g.town.dirty.add(`${sp[0]},${sp[1]}`);
  }
  const shells = ["shellCommon", "shellCommon", "shellScallop", "shellSand", "shellCowrie", "shellConch"];
  for (let i = 0; i < 6; i++) {
    const s = randomSpot(g, rng, ["sand"], 60, [2, 49, 77, 57]);
    if (s) {
      o[`${s[0]},${s[1]}`] = { k: "shell", item: shells[i] };
      g.town.dirty.add(`${s[0]},${s[1]}`);
    }
  }
  const dw = randomSpot(g, rng, ["sand"], 60, [2, 49, 77, 57]);
  if (dw) {
    o[`${dw[0]},${dw[1]}`] = { k: "driftwood", item: rng.pick(["driftLog", "driftBottle", "driftSpoon"]) };
    g.town.dirty.add(`${dw[0]},${dw[1]}`);
  }
  const trees = Object.entries(o).filter(([, v2]) => v2.k === "tree" && v2.stage >= 3);
  if (trees.length) {
    const t1 = rng.pick(trees)[1];
    if (rng.chance(0.5)) t1.hasBag = true;
    else t1.hasFurniture = true;
    const t2 = rng.pick(trees)[1];
    if (t2 !== t1 && c2.season !== 3) t2.wasp = true;
  }
  if (c2.season === 2) for (let i = 0; i < 4; i++) {
    const s = randomSpot(g, rng, ["lawn"], 60, i < 2 ? [3, 3, 15, 13] : [64, 17, 77, 33]);
    if (s) {
      o[`${s[0]},${s[1]}`] = { k: "drop", item: "mushroom" };
      g.town.dirty.add(`${s[0]},${s[1]}`);
    }
  }
  const rocks = Object.entries(o).filter(([, v2]) => v2.k === "rock");
  for (const [, r] of rocks) {
    r.pays = false;
    r.hits = 0;
  }
  if (rocks.length) rng.pick(rocks)[1].pays = true;
}
function growNight(g, c2) {
  const w = g.world;
  const o = w.town.objects;
  const rng = dayStream(w, "grow");
  const today = w.clock.day;
  const entries = Object.entries(o);
  for (const [k, v2] of entries) {
    if (v2.k === "tree") {
      if (v2.kind !== "pine" && (v2.fruit ?? 0) === 0 && (v2.regrow ?? 0) <= today) {
        v2.fruit = 3;
        g.town.dirty.add(k);
      }
    } else if (v2.k === "sapling") {
      v2.stage = (v2.stage ?? 0) + 1;
      g.town.dirty.add(k);
      if (v2.stage >= 3) {
        o[k] = { k: "tree", kind: v2.kind ?? "pear", fruit: v2.fruitItem ? 3 : 0, fruitItem: v2.fruitItem, regrow: 0, stage: 3, hits: 0 };
        g.events.emit("saplingGrown", { k });
      }
    } else if (v2.k === "beanstalk") {
      v2.stage = (v2.stage ?? 0) + 1;
      g.town.dirty.add(k);
    } else if (v2.k === "flower") {
      if (v2.wet !== today - 1 && !rainedYesterday(g)) {
        v2.wilt = (v2.wilt ?? 0) + 1;
        if (v2.wilt >= 2) g.town.dirty.add(k);
      } else {
        v2.wilt = 0;
        g.town.dirty.add(k);
      }
    }
  }
  for (const [k, v2] of entries) {
    if (v2.k !== "flower" || v2.wet !== today - 1) continue;
    const [x, z] = k.split(",").map(Number);
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const nk = `${x + dx},${z + dz}`;
      const n = o[nk];
      if (!n || n.k !== "flower" || n.species !== v2.species || n.wet !== today - 1) continue;
      if (!rng.chance(tuning.hybridChance)) continue;
      const spots = [[x + dx * 2, z + dz * 2], [x - dx, z - dz], [x + dz, z + dx], [x - dz, z - dx]];
      for (const [sx, sz] of spots) {
        if (!o[`${sx},${sz}`] && walkableTile(sx, sz) && !occupied2(g, sx, sz)) {
          const color = v2.color === n.color ? (v2.color + 2) % FLOWER_COLORS.length : (v2.color + n.color) % FLOWER_COLORS.length;
          o[`${sx},${sz}`] = { k: "flower", species: v2.species, color, wet: 0, wilt: 0, hybrid: true };
          g.town.dirty.add(`${sx},${sz}`);
          w.almanac.flowers[`${v2.species}:${color}`] = true;
          w.stats.hybrids = (w.stats.hybrids ?? 0) + 1;
          g.events.emit("hybrid", { species: v2.species, color });
          break;
        }
      }
    }
  }
  for (const k of Object.keys(w.town.wear)) {
    w.town.wear[k] -= 8;
    if (w.town.wear[k] <= 0) {
      delete w.town.wear[k];
      if (w.town.worn[k]) {
        delete w.town.worn[k];
        const [x, z] = k.split(",").map(Number);
        g.town.terrain.rebuildTile(x, z);
      }
    }
  }
}
function onHourChange(g, hour) {
  const w = g.world;
  g.life.placeSpecials();
  if (hour % 3 === 0 && g.place === g.town) g.life.spawnBugs();
  if (g.mode === "play") {
    if (hour === 9) {
      const n = deliverMail(g);
      if (n) {
        g.sound("mailFlag");
      }
    }
    if (!g.demo) g.autosave();
    if (g.place === g.town || g.place === g.city) playChime(g);
    g.events.emit("hour", { hour });
    g.festivals.onHour?.(hour);
    if (g.world.flags.rainedDay !== w.clock.day) {
      const k = g.sky?.kind;
      if (k === "rain" || k === "storm") w.flags.rainedDay = w.clock.day;
    }
  }
}
function handleAbsence(g, nowMs) {
  const w = g.world;
  const last = w.meta.lastSeenMs;
  w.meta.lastSeenMs = nowMs;
  if (!last || !nowMs) return 0;
  const days = Math.floor((nowMs - last) / 864e5);
  if (days < 1) return 0;
  const rng = new Stream(`${w.seed}:absence:${last}`);
  const o = w.town.objects;
  const weedsNow = Object.values(o).filter((x) => x.k === "weed").length;
  const add2 = Math.min(40 - weedsNow, days * 3);
  for (let i = 0; i < add2; i++) {
    const s = randomSpot(g, rng, ["lawn"]);
    if (s) {
      o[`${s[0]},${s[1]}`] = { k: "weed" };
      g.town.dirty.add(`${s[0]},${s[1]}`);
    }
  }
  for (const [k, v2] of Object.entries(o)) if (v2.k === "flower") {
    v2.wilt = Math.max(v2.wilt ?? 0, 2);
    g.town.dirty.add(k);
  }
  const dustCount = Math.min(8, w.home.dust.length + Math.min(8, days * rng.int(1, 3)));
  while (w.home.dust.length < dustCount) w.home.dust.push({ x: rng.range(1, 5), z: rng.range(1, 5) });
  for (let i = 0; i < Math.min(3, days); i++) sendMail(g, { from: "clementine", body: `Dear {player},
While you were out, your post piled up. The bee has been sitting on it. It's warm.
Clementine`, arriveDay: w.clock.day });
  deliverMail(g, true);
  for (const id of Object.keys(w.npcs)) w.npcs[id].absentNote = true;
  w.flags.absentDays = days;
  g.events.emit("absence", { days });
  return days;
}
var empty, rainedYesterday;
var init_flow = __esm({
  "src/systems/flow.js"() {
    init_tiles();
    init_rng();
    init_tuning();
    init_items();
    init_save();
    init_storage();
    init_mail();
    init_favours();
    init_calendar();
    init_calendar();
    init_objectsView();
    init_story();
    init_town();
    init_cheese();
    init_rating();
    init_bell();
    init_session();
    init_memory();
    empty = (w, x, z) => !w.town.objects[`${x},${z}`];
    rainedYesterday = (g) => g.world.flags.rainedDay === g.world.clock.day - 1;
  }
});

// src/ui/screens/bed.js
function advanceTo(g, targetDay, minute) {
  const w = g.world;
  while (w.clock.day < targetDay) {
    w.clock.minute = 5 * 60;
    newDay(g);
  }
  w.clock.minute = minute;
  if (minute >= 9 * 60) deliverMail(g);
}
function turnThePage(g) {
  const c2 = villageDay(g.world.clock.day);
  const season = g.cal.season;
  if (season === g.season) {
    g.refreshSeason();
    return;
  }
  g.ui.push(new AlmanacPage(SEASON_NAMES[season], TURN_LINES[season], () => g.refreshSeason(true), `sting_${["spring", "summer", "autumn", "winter"][season]}`));
  return c2;
}
function* sleepTo(g, kind) {
  const w = g.world;
  const c0 = villageDay(w.clock.day);
  saveNow(g);
  markSessionClean(g);
  g.player.play("Sleep", 0.2);
  g.music.setOverride("lullaby");
  g.engine.screen.cover("fade", { duration: 0.8 });
  g.events.emit("sleep", { kind });
  yield 0.9;
  w.stats.sleeps += 1;
  g.seenDayHold = true;
  if (kind === "morning") {
    const nextDay = w.clock.minute >= 5 * 60 ? w.clock.day + 1 : w.clock.day;
    advanceTo(g, nextDay, 8 * 60);
  } else if (kind === "noon") {
    if (w.clock.minute >= 12 * 60) advanceTo(g, w.clock.day + 1, 12 * 60);
    else {
      w.clock.minute = 12 * 60;
      deliverMail(g);
    }
  } else if (kind === "dusk") {
    if (w.clock.minute >= 18 * 60) advanceTo(g, w.clock.day + 1, 18 * 60);
    else {
      w.clock.minute = 18 * 60;
      deliverMail(g);
    }
  } else if (kind === "hibernate") {
    const now = villageDay(w.clock.day);
    advanceTo(g, w.clock.day + (now.type === 3 ? 4 : 3 - now.type), 8 * 60);
    g.events.emit("hibernated", {});
  }
  g.lastHour = -1;
  g.seenDay = w.clock.day;
  g.seenDayHold = false;
  g.sky.placeChanged();
  const c1 = villageDay(w.clock.day);
  const seasonChanged = c1.season !== c0.season;
  g.music.setOverride(null);
  g.engine.screen.reveal("fade", { duration: 0.4 });
  if (seasonChanged) {
    let closed = false;
    const page = new AlmanacPage(SEASON_NAMES[c1.season], TURN_LINES[c1.season], () => g.refreshSeason(true), `sting_${["spring", "summer", "autumn", "winter"][c1.season]}`);
    const origClose = page.close;
    page.close = () => {
      closed = true;
      origClose?.();
    };
    g.ui.push(page);
    while (!closed) yield;
  } else g.refreshSeason(true);
  g.player.play("Idle", 0.2);
  saveNow(g);
  g.events.emit("woke", { day: w.clock.day });
}
function* bedMenu(g) {
  const w = g.world;
  const c2 = yield* menuChoiceFree(g, "The bed", ["Sleep till morning", "Nap till noon", "Nap till dusk", "Hibernate until the next festival", "Not yet"], { id: "bed", w: 240, x: 120 });
  if (c2 < 0 || c2 === 4) return;
  if (c2 === 3) yield* say(g, "gander", hostLine(g, "gander", "hibernate"));
  yield* sleepTo(g, ["morning", "noon", "dusk", "hibernate"][c2]);
}
var AlmanacPage, TURN_LINES;
var init_bed = __esm({
  "src/ui/screens/bed.js"() {
    init_say();
    init_numbers();
    init_hosts();
    init_calendar();
    init_session();
    init_lines();
    init_draw();
    init_tuning();
    init_flow();
    init_mail();
    AlmanacPage = class {
      constructor(title, sub, onDone, seasonSting) {
        this.id = "seasonPage";
        this.title = title;
        this.sub = sub;
        this.onDone = onDone;
        this.t = 0;
        this.seasonSting = seasonSting;
      }
      currentText() {
        return this.title;
      }
      open(g) {
        g.sound("almanacTurn");
        if (this.seasonSting) g.sound(this.seasonSting);
      }
      update(g, inp, dt) {
        this.t += dt;
        if (this.t > 0.6 && !this.done) {
          this.done = true;
          this.onDone?.();
        }
        if (this.t > 1.2 && (inp.confirm || inp.back || inp.mouse.click) || this.t > 3.4) g.ui.pop(this);
      }
      prompts() {
        return null;
      }
      draw(g, hud) {
        const w = Math.min(480, Math.round(this.t * 1400));
        hud.rect(0, 0, w, 270, "white");
        hud.rect(w, 0, 3, 270, "mist");
        if (this.t > 0.32) {
          drawText(hud, 240, 104, this.title, { align: "center", color: "ink", scale: 3 });
          drawText(hud, 240, 138, this.sub, { align: "center", color: "slate" });
        }
      }
    };
    TURN_LINES = { 0: "Everything is starting again. It would like you to know.", 1: "The cicadas have been told.", 2: "It all goes a nice colour, and then it all goes.", 3: "Everything is under something." };
  }
});

// src/ui/screens/lookEditor.js
function* lookEditor(g, o) {
  let result = null;
  const prev = g.camState.zoomOverride;
  g.camState.zoomOverride = 2.3;
  g.ui.push(new LookEditor(g, { ...o, onDone: (r) => {
    result = r;
  } }));
  while (result === null) yield;
  g.camState.zoomOverride = prev;
  return result;
}
var SKIN, LookEditor;
var init_lookEditor = __esm({
  "src/ui/screens/lookEditor.js"() {
    init_draw();
    init_critter();
    init_pocketActions();
    init_items();
    init_ui();
    SKIN = ["sand", "orange", "white", "mist", "plum", "lime"];
    LookEditor = class {
      constructor(g, { title, turntable, hairOnly, free, onDone }) {
        this.id = "lookEditor";
        this.title = title;
        this.turn = !!turntable;
        this.hairOnly = hairOnly;
        this.free = free;
        this.onDone = onDone;
        this.focus = 0;
        this.saved = JSON.stringify(g.world.player.look);
        this.rows = [
          { label: "Hair", get: (l) => HAIR_STYLES[l.hair], step: (l, d) => {
            l.hair = (l.hair + d + HAIR_STYLES.length) % HAIR_STYLES.length;
          } },
          { label: "Colour", get: (l) => HAIR_COLORS.indexOf(l.hairColor) + 1, step: (l, d) => {
            l.hairColor = HAIR_COLORS[(HAIR_COLORS.indexOf(l.hairColor) + d + HAIR_COLORS.length) % HAIR_COLORS.length];
          } }
        ];
        if (!hairOnly) {
          this.rows.push({ label: "Eyes", get: (l) => EYE_STYLES[l.eyes], step: (l, d) => {
            l.eyes = (l.eyes + d + EYE_STYLES.length) % EYE_STYLES.length;
          } });
          this.rows.push({ label: "Skin", get: (l) => SKIN.indexOf(l.skin) + 1, step: (l, d) => {
            l.skin = SKIN[(SKIN.indexOf(l.skin) + d + SKIN.length) % SKIN.length];
          } });
        }
        if (free) this.rows.push({ label: "Wardrobe", get: (l) => ITEMS[l.outfit]?.name ?? "", step: null, action: (gg) => this.wardrobe(gg) });
        this.face = g.player.facing;
      }
      labels() {
        return this.rows.map((r) => r.label);
      }
      focusIndex() {
        return this.focus;
      }
      wardrobe(g) {
        const w = g.world;
        const items = [];
        w.player.pockets.forEach((s, i) => {
          if (s && ["clothes", "hat", "glasses", "umbrella"].includes(ITEMS[s.id]?.cat)) items.push({ label: ITEMS[s.id].name, icon: ITEMS[s.id].icon, iconColors: ITEMS[s.id].iconColors, action: (gg, m) => {
            wear(gg, i, s);
            gg.ui.pop(m);
          } });
        });
        const look = w.player.look;
        if (look.hatItem) items.push({ label: "Take off your hat", action: (gg, m) => {
          gg.world.player.pockets[gg.world.player.pockets.indexOf(null)] = { id: look.hatItem };
          look.hatItem = null;
          gg.player.applyLook();
          gg.ui.pop(m);
        } });
        if (look.glassesItem) items.push({ label: "Take off your glasses", action: (gg, m) => {
          gg.world.player.pockets[gg.world.player.pockets.indexOf(null)] = { id: look.glassesItem };
          look.glassesItem = null;
          gg.player.applyLook();
          gg.ui.pop(m);
        } });
        items.push({ label: "Back", action: (gg, m) => gg.ui.pop(m) });
        g.ui.push(new Menu({ id: "wardrobe", title: "Wardrobe", items, x: 130, y: 66, w: 220, itemH: 19, gap: 2, back: (gg, m) => gg.ui.pop(m) }));
      }
      rowRect(i) {
        return [300, 60 + i * 26, 160, 22];
      }
      update(g, inp, dt) {
        const m = inp.mouse;
        if (inp.nav.up) {
          this.focus = (this.focus + this.rows.length - 1) % this.rows.length;
          g.sound("uiTick");
        }
        if (inp.nav.down) {
          this.focus = (this.focus + 1) % this.rows.length;
          g.sound("uiTick");
        }
        const l = g.world.player.look;
        const r = this.rows[this.focus];
        const change = (d) => {
          if (r.step) {
            r.step(l, d);
            g.player.applyLook();
            g.player.play("Idle", 0);
            g.sound("uiTick");
          }
        };
        if (inp.nav.left) change(-1);
        if (inp.nav.right) change(1);
        this.rows.forEach((row, i) => {
          const [x, y, w, h] = this.rowRect(i);
          if (inRect(m, x, y, w, h)) {
            if (m.moved) this.focus = i;
            if (m.click) {
              this.focus = i;
              if (row.action) row.action(g);
              else {
                row.step(l, m.x < x + w / 2 ? -1 : 1);
                g.player.applyLook();
                g.sound("uiTick");
              }
            }
          }
        });
        if (this.turn || g.ui.top === this) g.player.facing += dt * (this.turn ? 1.2 : 0.5);
        if (inp.confirm) {
          if (r.action) {
            r.action(g);
            return;
          }
          g.sound("uiConfirm");
          g.player.facing = this.face;
          g.ui.pop(this);
          this.onDone(true);
          return;
        }
        if (inp.back || m.rclick) {
          g.sound("uiCancel");
          g.world.player.look = JSON.parse(this.saved);
          g.player.applyLook();
          g.player.facing = this.face;
          g.ui.pop(this);
          this.onDone(false);
        }
      }
      prompts() {
        return [["confirm", this.rows[this.focus]?.action ? "Open" : "Keep this"], ["back", "As I was"]];
      }
      draw(g, hud) {
        panel(hud, 292, 22, 176, 44 + this.rows.length * 26, { fill: "white", trim: "sand" });
        drawText(hud, 380, 32, this.title, { align: "center", color: "ink" });
        drawText(hud, 380, 44, "A very honest reflection.", { align: "center", color: "slate" });
        this.rows.forEach((r, i) => {
          const [x, y, w, h] = this.rowRect(i);
          const f = i === this.focus;
          panel(hud, x, y, w, h, { fill: f ? "sand" : "white", trim: f ? "orange" : "mist" });
          drawText(hud, x + 8, y + 7, r.label, { color: "ink" });
          drawText(hud, x + w - 8, y + 7, String(r.get(g.world.player.look)), { color: "plum", align: "right" });
        });
      }
    };
  }
});

// src/ui/screens/emote.js
var ALL_EMOTES, CLIP, WHEEL, Wheel, emoteWheel;
var init_emote = __esm({
  "src/ui/screens/emote.js"() {
    init_draw();
    ALL_EMOTES = ["laugh", "cry", "shock", "anger", "love", "shrug", "bow", "dance"];
    CLIP = { laugh: "Laugh", cry: "Cry", shock: "Shock", anger: "Anger", love: "Love", shrug: "Shrug", bow: "Bow", dance: "Dance" };
    WHEEL = ["laugh", "cry", "shock", "anger", "love", "shrug", "bow", "dance"];
    Wheel = class {
      constructor() {
        this.id = "emote";
        this.focus = 0;
      }
      labels() {
        return WHEEL;
      }
      focusIndex() {
        return this.focus;
      }
      pos(i) {
        const a = -Math.PI / 2 + i / 8 * Math.PI * 2;
        return [240 + Math.cos(a) * 92 - 34, 135 + Math.sin(a) * 76 - 11, 68, 22];
      }
      update(g, inp) {
        const m = inp.mouse;
        if (inp.nav.right || inp.nav.down) {
          this.focus = (this.focus + 1) % 8;
          g.sound("uiTick");
        }
        if (inp.nav.left || inp.nav.up) {
          this.focus = (this.focus + 7) % 8;
          g.sound("uiTick");
        }
        const ax = inp.axisX, ay = inp.axisY;
        if (Math.hypot(ax, ay) > 0.6 && inp.device === "pad") {
          const a = Math.atan2(-ay, ax) + Math.PI / 2;
          this.focus = (Math.round(a / (Math.PI * 2) * 8) + 8) % 8;
        }
        for (let i = 0; i < 8; i++) if (inRect(m, ...this.pos(i))) {
          if (m.moved) this.focus = i;
          if (m.click) {
            this.focus = i;
            this.pick(g);
            return;
          }
        }
        if (inp.confirm || g.ctx.input.wasPressed("PadLeft", "KeyG") && false) {
          this.pick(g);
          return;
        }
        if (inp.back || inp.emote || m.rclick) {
          g.sound("uiCancel");
          g.ui.pop(this);
        }
      }
      pick(g) {
        const em = WHEEL[this.focus];
        if (!g.world.player.emotes.includes(em)) {
          g.sound("uiError");
          g.ui.toastMsg("You haven't learned that yet. Sir Reginald could teach you.");
          return;
        }
        g.ui.pop(this);
        g.player.pose(CLIP[em]);
        g.sound("uiConfirm");
        g.events.emit("emoted", { em });
        if (em === "love") g.ctx.particles.burst("hearts", [g.player.x + g.place.ox, 2.2, g.player.z + g.place.oz]);
        g.net?.emote(em);
      }
      prompts() {
        return [["confirm", "Do it"], ["back", "Close"]];
      }
      draw(g, hud) {
        for (let i = 0; i < 8; i++) {
          const [x, y, w, h] = this.pos(i);
          const f = i === this.focus;
          const known = g.world.player.emotes.includes(WHEEL[i]);
          panel(hud, x, y, w, h, { fill: f ? "sand" : known ? "white" : "mist", trim: f ? "orange" : "slate" });
          drawText(hud, x + w / 2, y + 7, known ? WHEEL[i] : "?", { align: "center", color: known ? "ink" : "slate" });
        }
      }
    };
    emoteWheel = () => new Wheel();
  }
});

// src/data/cityMap.js
var CITY_ROWS, CITY_FRONTS_DATA, CITY_DOORS;
var init_cityMap = __esm({
  "src/data/cityMap.js"() {
    CITY_ROWS = [
      "########################################",
      "########################################",
      "########################################",
      "#################################.....##",
      "#################################.....##",
      "#################################.....##",
      "#################################.....##",
      ".......................................#",
      ".......................................#",
      "=================================.....##",
      "=================================.....##",
      ".................................#######",
      "..................................######",
      "..._______________.........=====.......#",
      "..._______________.#######.=====.......#",
      "..._______________.#######.=====.......#",
      "..._________####__.#######.=====.......#",
      "...______##_####__.#######.=====.......#",
      "...______##_####__.#######.=====.......#",
      "..._________####__.#######.=====.......#",
      "..._______________.#######.=====.......#",
      "..._______________.#######.=====.......#",
      ".....................######=====.......#",
      "########################################"
    ];
    CITY_FRONTS_DATA = [
      { id: "salon", model: "city-salon", x: 6, z: 4, w: 6, d: 5, door: [6, 6.6] },
      { id: "couture", model: "city-couture", x: 14, z: 4, w: 6, d: 5, door: [14, 6.6] },
      { id: "cafe", model: "city-cafe", x: 22, z: 4, w: 6, d: 5, door: [22, 6.6] },
      { id: "bureau", model: "city-bureau", x: 29.5, z: 4, w: 6, d: 5, door: [29.5, 6.6] },
      { id: "theatre", model: "city-theatre", x: 23, z: 15.5, w: 7, d: 5, rot: 90, door: [25.6, 15.5] },
      { id: "auction", model: "city-auction", x: 23, z: 20.5, w: 7, d: 5, rot: 90, door: [25.6, 20.5] },
      { id: "magda", model: "city-magda", x: 36, z: 1.2, w: 5, d: 4, door: [36, 3.3] },
      { id: "tent", model: "city-tent", x: 14, z: 18, w: 4, d: 4, door: [14, 20.1], neonDay: true }
    ];
    CITY_DOORS = [
      { id: "salon", name: "Snip & Gossip", x: 6, z: 7.2, tx: 6, tz: 7.6 },
      { id: "couture", name: "Maison Plume", x: 14, z: 7.2, tx: 14, tz: 7.6 },
      { id: "cafe", name: "The Daily Grind", x: 22, z: 7.2, tx: 22, tz: 7.6 },
      { id: "bureau", name: "the Bureau", x: 29.5, z: 7.2, tx: 29.5, tz: 7.6 },
      { id: "theatre", name: "The Palace", x: 26.6, z: 15.5, tx: 27, tz: 15.5 },
      { id: "auction", name: "Pemberton's", x: 26.6, z: 20.5, tx: 27, tz: 20.5 },
      { id: "magda", name: "Magda's", x: 36, z: 4, tx: 36, tz: 4.6 },
      { id: "tent", name: "Madame Nibbles' tent", x: 14, z: 20.8, tx: 14, tz: 21.2 }
    ];
  }
});

// src/world/city.js
function floorPlane(x0, z0, w, d, tex) {
  const g = new PlaneGeometry2(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) {
    uv[i] = uv[i] * w / TILE_M2;
    uv[i + 1] = uv[i + 1] * d / TILE_M2;
  }
  const m = new Mesh6(g, (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: (0, engine_exports.textureMap)(tex) }));
  m.position.set(x0 + w / 2, 0, z0 + d / 2);
  m.receiveShadow = true;
  return m;
}
var BoxGeometry4, Group8, Mesh6, PlaneGeometry2, Vector33, W2, D2, tileAt2, CITY_BUS_STOP, TILE_M2, CityPlace, ROUTES;
var init_city = __esm({
  "src/world/city.js"() {
    init_engine();
    init_place();
    init_models();
    init_cityMap();
    init_rig();
    init_critter();
    init_rng();
    init_hosts();
    init_time();
    ({ BoxGeometry: BoxGeometry4, Group: Group8, Mesh: Mesh6, PlaneGeometry: PlaneGeometry2, Vector3: Vector33 } = engine_exports.THREE);
    W2 = 40;
    D2 = 24;
    tileAt2 = (x, z) => x < 0 || z < 0 || x >= W2 || z >= D2 ? "#" : CITY_ROWS[Math.floor(z)][Math.floor(x)];
    CITY_BUS_STOP = [2.5, 10];
    TILE_M2 = 4;
    CityPlace = class extends Place {
      constructor(g) {
        super("city", "city", { ox: 500, oz: 0, name: "The Big City" });
        this.g = g;
        this.occluders = [];
        this.lampLights = [];
        this.frontsLights = [];
        this.crowd = [];
        this.music = () => this.isNight() ? "cityNight" : "cityDay";
        this.nav = engine_exports.NavGrid.fromRows(CITY_ROWS.map((r) => r.replace(/[^.=_]/g, "#")), { blocked: "#", cell: 1, origin: [0, 0, 0] });
        this.built = false;
        this.build();
      }
      isNight() {
        const h = this.g.world ? hourNow(this.g.world) : 12;
        return h >= 18 || h < 6;
      }
      blocked(x, z) {
        const c2 = tileAt2(x, z);
        if (this.g.noclip) return x < 0 || z < 0 || x >= W2 || z >= D2;
        return !(c2 === "." || c2 === "=" || c2 === "_");
      }
      height() {
        return 0;
      }
      surfaceAt() {
        return "stepStone";
      }
      build() {
        const parts = new Group8();
        this.group.add(parts);
        parts.add(floorPlane(0, 0, W2, D2, "city-pavement"));
        const road = floorPlane(0, 9, 34, 2, "city-road");
        road.position.y = 0.01;
        parts.add(road);
        const road2 = floorPlane(30, 11, 2, 13, "city-road");
        road2.position.y = 0.01;
        parts.add(road2);
        const pl = floorPlane(4, 13, 15, 10, "plaza-warm");
        pl.position.y = 0.01;
        parts.add(pl);
        const under = new Mesh6(new BoxGeometry4(70, 0.3, 60), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.ink));
        under.position.set(20, -0.2, 12);
        parts.add(under);
        this.doors = {};
        for (const f of CITY_FRONTS_DATA) {
          const o = (0, engine_exports.buildModel)(f.model, { catalog: MODELS }).object;
          o.traverse((m) => {
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });
          o.position.set(f.x, 0, f.z);
          o.rotation.y = (f.rot ?? 0) * Math.PI / 180;
          parts.add(o);
          const entry = { f, o, neon: o.getObjectByName("neon") };
          this.frontsLights.push(entry);
          this.occluders.push({ object: o, min: new Vector33(f.x - f.w / 2, 0, f.z - f.d / 2), max: new Vector33(f.x + f.w / 2, 5, f.z + f.d / 2) });
        }
        const sky = (0, engine_exports.buildModel)("city-skyline", { catalog: MODELS }).object;
        sky.position.set(16, 0, -8);
        parts.add(sky);
        const sky2 = (0, engine_exports.buildModel)("city-skyline", { catalog: MODELS }).object;
        sky2.position.set(-16, 0, 6);
        sky2.rotation.y = Math.PI / 2;
        parts.add(sky2);
        const sky3 = (0, engine_exports.buildModel)("city-skyline", { catalog: MODELS }).object;
        sky3.position.set(46, 0, 8);
        sky3.rotation.y = -Math.PI / 2;
        parts.add(sky3);
        this.lamps = [[6, 12.4], [14, 12.4], [22, 12.4], [29, 12.4], [33.4, 16], [33.4, 21], [12, 22.8], [4.4, 18]].map(([x, z]) => {
          const l = (0, engine_exports.buildModel)("city-lamp", { catalog: MODELS }).object;
          l.position.set(x, 0, z);
          parts.add(l);
          return { x: x + 0.6, y: 2.86, z };
        });
        const fountain = (0, engine_exports.buildModel)("fountain", { catalog: MODELS }).object;
        fountain.position.set(9, 0, 18);
        parts.add(fountain);
        const shelter = (0, engine_exports.buildModel)("bus-shelter", { catalog: MODELS }).object;
        shelter.position.set(2.5, 0, 7.5);
        parts.add(shelter);
        for (const [x, z] of [[14, 15], [14, 21], [5, 15]]) {
          const b = (0, engine_exports.buildModel)("park-bench", { catalog: MODELS }).object;
          b.position.set(x, 0, z);
          parts.add(b);
        }
        this.musician = new Actor(CROWD_DEFS[10], { name: "busker", seed: 5 });
        this.musician.x = 17.5;
        this.musician.z = 13.6;
        this.musician.facing = 0.4;
        this.musician.addTo(this.group);
        this.musician.play("Accordion", 0);
        this.pigeons = new engine_exports.Boids(14, { bounds: { min: [4, 0.4, 13], max: [19, 3, 23] }, seed: 3 });
        this.pigeonMeshes = [];
        const pm = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.mist);
        for (let i = 0; i < 14; i++) {
          const m = new Mesh6(new BoxGeometry4(0.22, 0.14, 0.3), pm);
          this.group.add(m);
          this.pigeonMeshes.push(m);
        }
        this.buildCrowd();
        this.group.visible = false;
      }
      buildCrowd() {
        const s = new Stream("city-crowd");
        const n = 16;
        for (let i = 0; i < n; i++) {
          const def = CROWD_DEFS[i % CROWD_DEFS.length];
          const a = new Actor(def, { name: `ped${i}`, seed: i + 1 });
          a.addTo(this.group);
          const route = s.pick(ROUTES);
          const t = s.next();
          const p = { a, route, i: Math.floor(t * route.length), speed: s.range(1.2, 2.2), bubble: null, bubbleT: 0, nextLine: s.range(4, 18), line: s.int(0, 100) };
          const pos = route[p.i];
          a.x = pos[0] + s.range(-1, 1);
          a.z = pos[1] + s.range(-1, 1);
          p.offX = s.range(-0.9, 0.9);
          p.offZ = s.range(-0.9, 0.9);
          a.play("Walk", 0, { speed: p.speed / 2.6 });
          this.crowd.push(p);
        }
      }
      enter(g) {
        this.setLook(this.isNight());
        this.applyNight(true);
      }
      leave(g) {
        g.engine.setLook(g.baseLook());
        this.lookNight = false;
        this.clearLights();
      }
      setLook(night) {
        if (this.lookNight === night) return;
        this.lookNight = night;
        const look = night ? { ...this.g.baseLook(), scene: [{ id: "bloom", params: { amount: 0.3 } }] } : this.g.baseLook();
        this.g.engine.setLook(look);
      }
      clearLights() {
        for (const l of this.lampLights) l.release();
        this.lampLights = [];
      }
      applyNight(force = false) {
        const g = this.g;
        const night = this.isNight();
        if (!force && night === this.nightApplied) return;
        this.nightApplied = night;
        this.clearLights();
        const NEON = [7598071, 15695191, 11006064, 4302582, 16764277, 11615827, 11006064, 15695191];
        if (night) {
          for (const [i, e] of this.frontsLights.entries()) {
            this.lampLights.push(g.ctx.lights.request({ position: [e.f.door[0] + 500, 2.6, e.f.door[1] + 1.2], color: NEON[i % NEON.length], intensity: 9, radius: 7.5, flicker: i % 3 === 0 ? "pulse" : "none", priority: 2 }));
          }
          for (const l of this.lamps) this.lampLights.push(g.ctx.lights.request({ position: [l.x + 500, l.y, l.z], color: 16764277, intensity: 6, radius: 6 }));
        }
        for (const e of this.frontsLights) if (e.neon) e.neon.visible = night || e.f.neonDay;
        const magda = this.frontsLights.find((e) => e.f.id === "magda");
        if (magda) magda.o.visible = night;
      }
      update(dt, t) {
        this.applyNight();
        const g = this.g;
        if (g.player) {
          const p = g.player;
          const run = g.place === this && p.speed > 4;
          this.pigeons.flee = run ? { at: [p.x, 0.5, p.z], radius: 6 } : null;
        }
        this.pigeons.step(dt);
        for (let i = 0; i < 14; i++) {
          const m = this.pigeonMeshes[i];
          m.position.set(this.pigeons.pos[i * 3], Math.max(0.2, this.pigeons.pos[i * 3 + 1]), this.pigeons.pos[i * 3 + 2]);
          m.rotation.y = Math.atan2(this.pigeons.vel[i * 3], this.pigeons.vel[i * 3 + 2]);
        }
        this.musician.update(dt);
        for (const c2 of this.crowd) {
          const target = c2.route[c2.i];
          const tx = target[0] + c2.offX, tz = target[1] + c2.offZ;
          const dx = tx - c2.a.x, dz = tz - c2.a.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.3) c2.i = (c2.i + 1) % c2.route.length;
          else {
            c2.a.x += dx / d * c2.speed * dt;
            c2.a.z += dz / d * c2.speed * dt;
            c2.a.turnTo = Math.atan2(dx, dz);
          }
          c2.a.update(dt);
          c2.nextLine -= dt;
          if (c2.nextLine <= 0) {
            c2.line += 7;
            c2.nextLine = 10 + c2.line % 14;
            const p = g.player;
            if (Math.hypot(c2.a.x - p.x, c2.a.z - p.z) < 5) {
              c2.bubble = STREET[c2.line % STREET.length];
              c2.bubbleT = 3.5;
            }
          }
          if (c2.bubbleT > 0) c2.bubbleT -= dt;
        }
      }
      interactables(g) {
        const out = [];
        for (const d of CITY_DOORS) {
          if (d.id === "magda" && !this.isNight()) continue;
          out.push({ id: `venue:${d.id}`, x: d.x, z: d.z, r: 1.7, label: `Enter ${d.name}`, act: "venueDoor", venue: d });
        }
        out.push({ id: "busHome", x: CITY_BUS_STOP[0], z: CITY_BUS_STOP[1], r: 1.8, label: "Take the bus home", act: "busHome" });
        return out;
      }
      hostActor() {
        return null;
      }
    };
    ROUTES = [
      [[3, 11.5], [12, 11.5], [24, 11.5], [32, 11.5], [32, 22], [32, 11.5], [12, 11.5]],
      [[32, 8], [20, 8], [6, 8], [6, 12], [20, 12], [32, 12]],
      [[6, 15], [17, 15], [17, 21], [6, 21]],
      [[28, 22], [28, 13], [20, 12], [28, 13]],
      [[12, 8], [28, 8], [33, 8], [33, 20], [28, 20], [28, 8]]
    ];
  }
});

// src/systems/bus.js
function ballad(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:ballad:${w.clock.day}:${w.stats.busRides ?? 0}`);
  const mems = w.memory.slice(-16).reverse();
  const verses = [];
  const seen = /* @__PURE__ */ new Set();
  const take = (key2, extra = {}) => {
    if (!seen.has(key2) && BALLAD[key2] && verses.length < 2) {
      seen.add(key2);
      verses.push({ key: key2, lines: BALLAD[key2].map((l) => resolveTags(l, g, { neighbour: "someone", item: "thing", catch: "fish", beans: "300", ...extra })) });
    }
  };
  for (const m of mems) {
    const n = m.about ? NEIGHBOURS[m.about]?.short ?? NEIGHBOURS[m.about]?.name : "someone";
    if (m.k === "boot") take("boot");
    else if (m.k === "catch" || m.k === "bigCatch") take("catch", { catch: m.catch, beans: "300" });
    else if (m.k === "gift") take("gift", { neighbour: n, item: m.item });
    else if (m.k === "bonk") take("bonk", { neighbour: n });
    else if (m.k === "debtTier") take("home");
    else if (m.k === "wish") take("wish");
    else if (m.k === "fashion") take("fashion");
    else if (m.k === "letter") take("letter");
  }
  if (w.npcs.rocco.moved !== "here") take("rocco");
  const fill = s.shuffle(["debt", "mayor", "store", "city", "fish", "weather", "lonely", "friend", "home2", "rain"]);
  for (const k of fill) take(k, { neighbour: NEIGHBOURS[s.pick(["dorrit", "tavi", "nib", "yolanda"])].name });
  verses.push({ key: "chorus", lines: BALLAD.chorus });
  return verses;
}
function* busRide(g, to) {
  const w = g.world;
  g.sound("busHorn");
  g.ui.toastMsg("You wait. The bus arrives in seconds. It always does. It is always late.");
  yield 1.6;
  w.stats.busRides = (w.stats.busRides ?? 0) + 1;
  g.events.emit("busBoard", { to });
  const bus2 = g.busPlace ??= new BusPlace(g);
  g.ctx.scene.add(bus2.group);
  bus2.setScene(g.season, g.calendarDay);
  yield* g.travel(bus2, 0, 0, 0, { kind: "iris", sound: "busBrake" });
  const p = g.player;
  p.remove();
  bus2.bodyGroup.add(p.root);
  p.x = -1.2;
  p.z = -0.8;
  p.y = 0.86;
  p.facing = Math.PI * 0.5;
  p.turnTo = null;
  p.sitting = true;
  p.play("Sit", 0);
  g.camFocus = { x: 0, y: 1.2, z: 0 };
  g.camTeleport();
  g.hideHud = true;
  const verses = ballad(g);
  const overlay = new BalladOverlay(verses);
  g.ui.push(overlay);
  bus2.hester.play("Talk", 0.2);
  const notes = melodyNotes("bus").filter((n) => n !== "." && n !== "-");
  let ni = 0;
  let skip = false;
  const allLines = verses.flatMap((v2) => v2.lines);
  g.events.emit("ballad", { verses: verses.map((v2) => v2.key) });
  for (const line2 of allLines) {
    overlay.line = line2;
    let shown = 0;
    const clean3 = line2.replace(/♪/g, "").trim();
    const stepT = 0.13;
    for (const ch of clean3) {
      if (/[a-z]/i.test(ch) && shown % 2 === 0) {
        const m = midiOf(notes[ni++ % notes.length]) ?? 60;
        g.voice.sing(ch, "hester", m);
        bus2.hester.talkAmp = 1;
      }
      shown++;
      let t = 0;
      const dt = 0.04;
      while (t < stepT * 0.42) {
        t += g.engine.manual ? 1 / 60 : 1 / 60;
        yield;
        if (g.inp.confirm || g.inp.back || g.inp.mouse.click) skip = true;
        if (skip) break;
      }
      if (skip) break;
    }
    if (skip) break;
    yield 0.25;
  }
  g.ui.pop(overlay);
  bus2.hester.play("Sit", 0.2);
  g.hideHud = false;
  p.sitting = false;
  p.remove();
  bus2.group.add(p.root);
  if (to === "city") {
    yield* g.travel(g.city, CITY_BUS_STOP[0], CITY_BUS_STOP[1], Math.PI / 2, { kind: "iris", sound: "busBrake" });
    remember(g, "city", {});
    g.events.emit("arrivedCity", {});
    if (!w.flags.cityFirst) {
      w.flags.cityFirst = true;
      yield* say(g, "hester", "Big City. Mind your pockets. Mind your hair. Mind everything. I'll be here. I'm always here.");
    }
  } else {
    yield* g.travel(g.town, LANDMARKS.busStop[0], LANDMARKS.busStop[1], 0, { kind: "iris", sound: "busBrake" });
    g.events.emit("arrivedTown", {});
  }
  g.autosave();
}
var BoxGeometry5, Group9, Mesh7, box2, BusPlace, midiOf, BalladOverlay;
var init_bus = __esm({
  "src/systems/bus.js"() {
    init_engine();
    init_place();
    init_models();
    init_rig();
    init_critter();
    init_hosts();
    init_town();
    init_city();
    init_say();
    init_lines();
    init_lines();
    init_composer();
    init_engine();
    init_draw();
    init_memory();
    init_neighbours();
    init_rng();
    init_town2();
    ({ BoxGeometry: BoxGeometry5, Group: Group9, Mesh: Mesh7 } = engine_exports.THREE);
    box2 = (w, h, d, c2, x = 0, y = 0, z = 0) => {
      const m = new Mesh7(new BoxGeometry5(w, h, d), (0, engine_exports.toonMaterial)(engine_exports.PALETTE[c2]));
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };
    BusPlace = class extends Place {
      constructor(g) {
        super("bus", "room", { ox: 1500, oz: 0, name: "The Bus" });
        this.g = g;
        this.def = { name: "The Bus", exit: null, dim: false, w: 14, d: 8 };
        this.w = 14;
        this.d = 8;
        this.camZoom = 2.1;
        this.outdoors = true;
        this.music = "bus";
        this.scenery = new Group9();
        this.group.add(this.scenery);
        this.bodyGroup = new Group9();
        this.group.add(this.bodyGroup);
        const b = this.bodyGroup;
        b.add(box2(9, 0.2, 3, "navy", 0, 0.6, 0));
        b.add(box2(9, 1.9, 0.14, "sky", 0, 1.6, -1.45));
        b.add(box2(0.14, 1.9, 3, "sky", -4.5, 1.6, 0));
        b.add(box2(0.14, 0.7, 3, "sky", 4.5, 1, 0));
        for (const x of [-3.1, -1.4, 0.4, 2.1]) {
          const win2 = box2(1.3, 0.8, 0.08, "cyan", x, 1.95, -1.4);
          b.add(win2);
        }
        this.glass = b.children.filter((c2) => c2.material?.color?.getHex?.() === engine_exports.PALETTE.cyan);
        for (const x of [-3, -1.2, 0.6]) {
          b.add(box2(1, 0.5, 0.6, "plum", x, 0.95, -0.95));
          b.add(box2(1, 0.8, 0.14, "red", x, 1.3, -1.25));
        }
        b.add(box2(0.8, 0.5, 0.6, "night", 3.2, 0.95, -0.3));
        b.add(box2(0.1, 0.6, 0.6, "ink", 3.95, 1.3, -0.3));
        for (const x of [-3, 3]) for (const z of [-1.5, 1.5]) {
          const w = box2(1, 1, 0.3, "ink", x, 0.5, z);
          w.userData.wheel = true;
          b.add(w);
        }
        this.hester = new Actor(CRITTER_DEFS.hester, { name: "hester", seed: 8 });
        this.hester.x = 3.2;
        this.hester.z = -0.3;
        this.hester.y = 0.72;
        this.hester.facing = Math.PI / 2;
        this.hester.root.removeFromParent();
        this.hester.hasShadow = false;
        b.add(this.hester.root);
        this.hester.play("Sit", 0);
        this.trees = [];
        this.ground = box2(80, 0.3, 30, "green", 0, -0.15, -8);
        this.group.add(this.ground);
        this.road = box2(80, 0.04, 5, "slate", 0, 0.02, 0);
        this.group.add(this.road);
        this.rockT = 0;
        this.speed = 7;
        this.group.visible = false;
        this.rain = false;
      }
      height() {
        return 0.72;
      }
      blocked() {
        return true;
      }
      surfaceAt() {
        return null;
      }
      setScene(season, cal, { night = false } = {}) {
        this.scenery.clear();
        this.trees.length = 0;
        this.ground.material = (0, engine_exports.toonMaterial)([engine_exports.PALETTE.lime, engine_exports.PALETTE.green, engine_exports.PALETTE.sand, engine_exports.PALETTE.white][season]);
        const rng = new Stream(`bus-scene:${season}`);
        for (let i = 0; i < 26; i++) {
          const kind = rng.chance(0.6) ? "pine" : "pear";
          const leaf = leafFor(season, cal, kind);
          const t = (0, engine_exports.buildModel)(kind === "pine" ? "tree-pine" : "tree-pear", { catalog: MODELS, palette: { leaf: leaf.leaf, leaf2: leaf.leaf2 } }).object;
          const fruit = t.getObjectByName("fruit");
          if (fruit) fruit.visible = false;
          const x = rng.range(-30, 30), z = rng.range(-16, -3.4);
          t.position.set(x, 0, z);
          this.scenery.add(t);
          this.trees.push(t);
        }
        this.night = night;
      }
      enter(g) {
        this.light = g.ctx.lights.request({ position: [1501, 3, 0], color: 16767392, intensity: 14, radius: 11, name: "bus" });
      }
      leave() {
        this.light?.release();
        this.light = null;
      }
      update(dt, t) {
        this.rockT += dt;
        this.bodyGroup.rotation.z = Math.sin(this.rockT * 3.1) * 0.012 + Math.sin(this.rockT * 7.3) * 4e-3;
        this.bodyGroup.position.y = Math.abs(Math.sin(this.rockT * 5.3)) * 0.03;
        for (const tr of this.trees) {
          tr.position.x -= dt * this.speed * (1 + tr.position.z * -0.03);
          if (tr.position.x < -32) tr.position.x += 62;
        }
        this.hester.update(dt);
        if (Math.floor(this.rockT * 4) % 2 === 0 && this.rockT % 0.25 < dt) this.g.sound("busEngine", { volume: 0.05 });
      }
      interactables() {
        return [];
      }
    };
    midiOf = (noteName) => {
      const f = (0, engine_exports.noteFrequency)(noteName);
      return f ? 69 + 12 * Math.log2(f / 440) : null;
    };
    BalladOverlay = class {
      constructor(lines) {
        this.id = "ballad";
        this.modal = true;
        this.line = "";
        this.lines = lines;
      }
      update() {
      }
      draw(g, hud) {
        if (!this.line) return;
        const parts = wrap(this.line, 400);
        const h = parts.length * 12 + 12;
        panel(hud, 32, 212 - h + 30, 416, h, { fill: "white", trim: "sky" });
        parts.forEach((p, i) => drawText(hud, 240, 212 - h + 37 + i * 12, p, { align: "center", color: "ink" }));
        drawText(hud, 46, 212 - h + 22, "Hester", { color: "navy", shadow: "white" });
      }
      currentText() {
        return this.line;
      }
      prompts() {
        return [["confirm", "Skip"]];
      }
    };
  }
});

// src/systems/stargaze.js
function* stargaze(g) {
  let watching = true;
  g.ui.push(new StarScreen(g, () => {
    watching = false;
  }));
  g.events.emit("stargaze", {});
  while (watching) yield;
}
var CONSTELLATIONS, starName, STAR_FIELD, GLIDE_UP, GLIDE_DOWN, LIFT_SCREENS, TILT, PRESS_GUARD, SCREEN_H, HORIZON_Y, HAZE, StarScreen;
var init_stargaze = __esm({
  "src/systems/stargaze.js"() {
    init_engine();
    init_draw();
    init_mail();
    init_memory();
    CONSTELLATIONS = [
      { id: "book", name: "The Overdue Library Book", suggest: ["The Fine Keeps Growing", "Chapter Nine, Probably", "Due Back Tuesday"], stars: [[60, 50], [100, 44], [104, 74], [64, 80], [60, 50]] },
      { id: "spoon", name: "The Big Spoon", suggest: ["The Little Ladle", "Second Helpings", "The Spoon I Lost"], stars: [[160, 40], [176, 52], [190, 64], [204, 78], [226, 76], [230, 96], [208, 100], [204, 78]] },
      { id: "gander", name: "The Ledger", suggest: ["Seven Percent", "The Balance Owing", "Mrs. Gander Is Watching"], stars: [[280, 40], [320, 40], [320, 80], [280, 80], [280, 40], [320, 60], [280, 60]] },
      { id: "trundle", name: "The Mayor, Eventually", suggest: ["A Hat, From Far Away", "Rocco's Good Side", "Ask Me Next Year"], stars: [[380, 60], [396, 44], [412, 52], [408, 68], [392, 72], [380, 60], [352, 74]] },
      { id: "bus", name: "The Late Bus", suggest: ["Ten Minutes Late", "Not In Service", "The One I Just Missed"], stars: [[80, 130], [148, 130], [148, 158], [80, 158], [80, 130]] },
      { id: "soup", name: "Tuesday's Bowl", suggest: ["Cold By Now", "More Salt", "Wednesday's Bowl"], stars: [[250, 130], [264, 164], [306, 164], [320, 130]] }
    ];
    starName = (w, c2) => w.almanac.starNames[c2.id] ?? c2.name;
    STAR_FIELD = (() => {
      const out = [];
      let s = 7;
      for (let i = 0; i < 120; i++) {
        s = s * 1664525 + 1013904223 >>> 0;
        const x = s % 480;
        s = s * 1664525 + 1013904223 >>> 0;
        const y = s % 200;
        s = s * 1664525 + 1013904223 >>> 0;
        out.push([x, y, s % 3]);
      }
      return out;
    })();
    GLIDE_UP = 2.4;
    GLIDE_DOWN = 1.6;
    LIFT_SCREENS = 1.4;
    TILT = 3.5;
    PRESS_GUARD = 0.25;
    SCREEN_H = 270;
    HORIZON_Y = 206;
    HAZE = [[170, 6], [179, 4], [188, 3], [197, 2]];
    StarScreen = class {
      constructor(g, onExit) {
        this.id = "stargaze";
        this.onExit = onExit;
        this.t = 0;
        this.next = 2 + g.world.clock.minute * 7 % 5;
        this.shooter = null;
        this.focus = 0;
        this.wishes = 0;
        this.rise = 0;
        this.glide = null;
      }
      open(g) {
        g.hideHud = true;
        g.fixedCam = true;
        g.engine.setCamera({ preset: "fixed", minZoom: 1, maxZoom: 1 }, { syncUrl: false });
        const cam = g.ctx.camera.camera;
        cam.updateMatrixWorld();
        const dir3 = cam.getWorldDirection(new engine_exports.THREE.Vector3());
        const p = cam.position;
        const target = [p.x + dir3.x * 10, p.y + dir3.y * 10, p.z + dir3.z * 10];
        this.lift = (cam.top - cam.bottom) * LIFT_SCREENS;
        this.ground = { position: [p.x, p.y, p.z], target };
        this.sky = { position: [p.x, p.y + this.lift, p.z], target: [target[0], target[1] + this.lift + TILT, target[2]] };
        this.startGlide(this.ground, this.sky, GLIDE_UP);
      }
      close(g) {
        g.hideHud = false;
        g.releaseFixedCam();
        this.onExit?.();
      }
      startGlide(from2, to, seconds, done = null) {
        this.glide = new engine_exports.Timeline({ shots: [{ at: 0, ...from2 }, { at: seconds, ...to }], bars: 0 });
        this.glide.play();
        this.glideAge = 0;
        this.glideDone = done;
      }
      stepGlide(g, inp, dt) {
        const tl = this.glide;
        this.glideAge += dt;
        const pressed = inp.confirm || inp.back || inp.mouse.click || inp.mouse.rclick;
        if (pressed && this.glideAge > PRESS_GUARD) tl.skip();
        else tl.update(dt);
        const shot = tl.camera();
        const cam = g.ctx.camera.camera;
        cam.position.set(...shot.position);
        cam.lookAt(...shot.target);
        this.rise = Math.max(0, Math.min(1, (shot.position[1] - this.ground.position[1]) / this.lift));
        if (tl.ended) {
          this.rise = Math.round(this.rise);
          this.glide = null;
          this.glideDone?.();
        }
      }
      labels() {
        return CONSTELLATIONS.map((c2) => starName(this.g.world, c2));
      }
      focusIndex() {
        return this.focus;
      }
      update(g, inp, dt) {
        if (this.glide) {
          this.stepGlide(g, inp, dt);
          return;
        }
        this.t += dt;
        if (inp.nav.left) {
          this.focus = (this.focus + 5) % 6;
          g.sound("uiTick");
        }
        if (inp.nav.right) {
          this.focus = (this.focus + 1) % 6;
          g.sound("uiTick");
        }
        this.next -= dt;
        if (this.next <= 0 && !this.shooter) {
          const s = (g.world.clock.day * 131 + Math.floor(this.t * 37)) % 400;
          this.shooter = { x: 40 + s, y: 20 + s % 60, vx: -180, vy: 90, life: 1.2 };
          this.next = 5 + s % 7;
          g.sound("star");
          g.events.emit("shootingStar", {});
        }
        if (this.shooter) {
          const st = this.shooter;
          st.x += st.vx * dt;
          st.y += st.vy * dt;
          st.life -= dt;
          if (st.life <= 0) this.shooter = null;
        }
        if (inp.confirm || inp.mouse.click) {
          if (this.shooter) {
            this.wish(g);
            return;
          }
          this.markIt(g);
          return;
        }
        if (inp.back || inp.mouse.rclick) {
          g.sound("uiCancel");
          this.shooter = null;
          this.startGlide(this.sky, this.ground, GLIDE_DOWN, () => g.ui.pop(this));
        }
      }
      wish(g) {
        this.shooter = null;
        this.wishes++;
        g.sound("wish");
        g.world.stats.wishes += 1;
        const gifts = ["driftSpoon", "gem", "shellConch", "moonRobe", "starShades", "mossyLamp", "seasideLamp"];
        const gift = gifts[(g.world.stats.wishes + g.world.seed) % gifts.length];
        sendMail(g, { from: "wish", body: "Dear {player},\nWe got your wish. We have looked into it. Here is what we could do.\nA Passing Star", gift: gift === "gem" ? "driftBottle" : gift });
        remember(g, "wish", {});
        g.events.emit("wished", { gift });
        g.ui.toastMsg("You wished. Check the post in the morning.");
      }
      markIt(g) {
        const c2 = CONSTELLATIONS[this.focus];
        const w = g.world;
        if (!w.almanac.stars[c2.id]) {
          w.almanac.stars[c2.id] = true;
          g.sound("star");
          g.ui.toastMsg(`You found ${starName(w, c2)}. Name it in the Almanac.`);
          g.events.emit("constellation", { id: c2.id });
        } else g.sound("uiTick");
      }
      prompts() {
        if (this.glide) return null;
        return this.shooter ? [["confirm", "WISH!"], ["back", "Stand up"]] : [["confirm", "Mark it"], ["back", "Stand up"]];
      }
      draw(g, hud) {
        const off = Math.round((1 - this.rise) * SCREEN_H);
        if (off >= SCREEN_H) return;
        const fill = (x, y, w, h, col2) => {
          const top = Math.max(0, y - off), bottom = y + h - off;
          if (bottom > top) hud.rect(x, top, w, bottom - top, col2);
        };
        fill(0, 0, 480, SCREEN_H, "ink");
        for (const [first, every] of HAZE) for (let y = first; y < first + 9; y += 2) for (let x = (y >> 1) % every; x < 480; x += every) fill(x, y, 1, 1, "night");
        for (const [x, y, k] of STAR_FIELD) fill(x, y, 1, 1, k === 0 ? "white" : k === 1 ? "mist" : "sky");
        CONSTELLATIONS.forEach((c2, i) => {
          const focused = i === this.focus;
          const known = g.world.almanac.stars[c2.id];
          for (let k = 0; k < c2.stars.length; k++) {
            const [x, y] = c2.stars[k];
            fill(x - 1, y - 1, 3, 3, focused ? "sand" : "white");
            if ((focused || known) && k + 1 < c2.stars.length) {
              const [x2, y2] = c2.stars[k + 1];
              const n = Math.max(Math.abs(x2 - x), Math.abs(y2 - y));
              for (let j = 0; j < n; j += 3) fill(Math.round(x + (x2 - x) * j / n), Math.round(y + (y2 - y) * j / n), 1, 1, focused ? "sand" : "slate");
            }
          }
        });
        if (this.shooter) {
          const st = this.shooter;
          for (let i = 0; i < 12; i++) fill(Math.round(st.x - st.vx * 0.012 * i), Math.round(st.y - st.vy * 0.012 * i), 2, 2, i < 3 ? "white" : "sky");
        }
        fill(0, HORIZON_Y, 480, SCREEN_H - HORIZON_Y, "night");
        if (!this.glide) {
          const c2 = CONSTELLATIONS[this.focus];
          drawText(hud, 240, 214, g.world.almanac.stars[c2.id] ? starName(g.world, c2) : "Which one is that, then?", { align: "center", color: "sand", scale: 1 });
          drawText(hud, 240, 228, "Press when a shooting star goes past to make a wish.", { align: "center", color: "mist" });
        }
        if (off > 0) for (let row = 0; row < 6; row++) for (let x = row % 2; x < 480; x += row + 2) hud.rect(x, SCREEN_H - off + row, 1, 1, "night");
      }
    };
  }
});

// src/gameDefaults.js
var DEFAULT_SETTINGS, DEFAULT_MUSIC;
var init_gameDefaults = __esm({
  "src/gameDefaults.js"() {
    DEFAULT_SETTINGS = { voices: 1, voiceStyle: "gibberish", textSpeed: null, xbox: false, rumble: true, shake: true };
    DEFAULT_MUSIC = 0.1;
  }
});

// src/ui/screens/settings.js
function settingsScreen(g) {
  const a = g.ctx.audio;
  const vol = (label, ch) => ({
    label,
    value: (gg) => pct(a.volume[ch]),
    left: () => {
      a.setVolume(ch, Math.max(0, Math.round((a.volume[ch] - 0.1) * 10) / 10));
      g.sound("uiTick");
    },
    right: () => {
      a.setVolume(ch, Math.min(1, Math.round((a.volume[ch] + 0.1) * 10) / 10));
      g.sound("uiTick");
    },
    action: () => {
    }
  });
  const toggle = (label, get, set, on = "On", off = "Off") => ({ label, value: () => get() ? on : off, action: () => {
    set(!get());
    g.saveSettings();
  }, left: () => {
    set(!get());
    g.saveSettings();
  }, right: () => {
    set(!get());
    g.saveSettings();
  } });
  const s = g.settings;
  const items = [
    vol("Music", "music"),
    vol("Effects", "sfx"),
    { label: "Voices", value: () => pct(s.voices), left: () => {
      s.voices = Math.max(0, Math.round((s.voices - 0.1) * 10) / 10);
      g.saveSettings();
      g.voice.syllable("a", "player", "");
    }, right: () => {
      s.voices = Math.min(1, Math.round((s.voices + 0.1) * 10) / 10);
      g.saveSettings();
      g.voice.syllable("a", "player", "");
    }, action: () => {
    } },
    { label: "Voice style", value: () => ({ gibberish: "Gibberish", beeps: "Soft beeps", off: "Off" })[s.voiceStyle], left: () => cycle(-1), right: () => cycle(1), action: () => cycle(1) },
    { label: "Text speed", value: () => speedName(s.textSpeed), left: () => speed(-1), right: () => speed(1), action: () => speed(1) },
    toggle("Controller glyphs", () => s.xbox, (v2) => {
      s.xbox = v2;
    }, "Xbox", "PlayStation"),
    toggle("Rumble", () => s.rumble, (v2) => {
      s.rumble = v2;
    }),
    toggle("Camera shake", () => s.shake, (v2) => {
      s.shake = v2;
    }),
    { label: "Clock", value: () => g.world.clock.mode === "real" ? "Real Clock" : "Village Time", left: () => clock(), right: () => clock(), action: () => clock() },
    { label: "Fullscreen", value: () => typeof document !== "undefined" && document.fullscreenElement ? "On" : "Off", action: () => fullscreen(), left: () => fullscreen(), right: () => fullscreen() },
    { label: "Pixel size", value: () => g.engine.settings.values.pixelSize === "chunky" ? "Chunky" : "Fine", action: () => pixel(), left: () => pixel(), right: () => pixel() },
    { label: "Picture quality", value: () => qualityName(), action: () => quality(1), left: () => quality(-1), right: () => quality(1) },
    { label: "Reset to defaults", action: () => reset() },
    { label: "Back", action: (gg, m2) => gg.ui.pop(m2) }
  ];
  function cycle(d) {
    const i = STYLES.indexOf(s.voiceStyle);
    s.voiceStyle = STYLES[(i + d + STYLES.length) % STYLES.length];
    g.saveSettings();
    g.voice.syllable("a", "player", "");
  }
  function speed(d) {
    const i = SPEEDS.indexOf(s.textSpeed);
    s.textSpeed = SPEEDS[(Math.max(0, i) + d + SPEEDS.length) % SPEEDS.length];
    g.saveSettings();
  }
  function clock() {
    const w = g.world;
    w.clock.mode = w.clock.mode === "real" ? "village" : "real";
    g.weatherKey = null;
    g.refreshSeason();
    g.sound("uiTick");
    g.events.emit("clockMode", { mode: w.clock.mode });
  }
  function fullscreen() {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }
  function pixel() {
    const v2 = g.engine.settings.values.pixelSize === "chunky" ? "fine" : "chunky";
    g.engine.settings.set({ pixelSize: v2 });
  }
  function qualityName() {
    const q = g.engine.settings.values.quality ?? "high";
    return q[0].toUpperCase() + q.slice(1);
  }
  function quality(d) {
    const list = ["low", "medium", "high"];
    const q = g.engine.settings.values.quality ?? "high";
    g.engine.settings.set({ quality: list[(list.indexOf(q) + d + 3) % 3] });
  }
  function reset() {
    Object.assign(s, DEFAULT_SETTINGS);
    g.saveSettings();
    a.resetVolumes();
    a.setVolume("music", DEFAULT_MUSIC);
    g.engine.settings.reset();
    g.events.emit("settingsReset", {});
    g.ui.toastMsg("Back to how it was. Music at 10%.");
  }
  const m = new Menu({ id: "settings", title: "Settings", items, x: 110, y: 46, w: 260, itemH: 19, gap: 2, back: (gg, mm) => gg.ui.pop(mm), prompts: [["confirm", "Change"], ["back", "Back"]] });
  m.perPage = 8;
  return m;
}
var pct, STYLES, SPEEDS, speedName;
var init_settings = __esm({
  "src/ui/screens/settings.js"() {
    init_ui();
    init_tuning();
    init_storage();
    init_gameDefaults();
    pct = (v2) => `${Math.round(v2 * 100)}%`;
    STYLES = ["gibberish", "beeps", "off"];
    SPEEDS = [null, 20, 35, 60, 120];
    speedName = (v2) => v2 == null ? "Normal" : v2 <= 20 ? "Slow" : v2 <= 35 ? "Normal" : v2 <= 60 ? "Quick" : "Very quick";
  }
});

// src/data/about.js
var SOURCE_INFORMATION, FEEDBACK, qa, LABELS, ABOUT_PAGES;
var init_about = __esm({
  "src/data/about.js"() {
    SOURCE_INFORMATION = {
      date: "2026-11-05 17:18:18",
      source: "Animal Crossing: City Folk",
      plan: "PLAN.md",
      genre: "Life sim / social sim",
      perspective: "Isometric 3/4 orthographic diorama with 90-degree camera turns; dollhouse cutaway indoors",
      tech: "Riftlight Pixel Engine 0.46.0 (WebGPU, three.js r186 inside), plain JavaScript modules bundled by esbuild 0.28.2 into one HTML file; AI Hub session client 1.4.0; WebRTC and BroadcastChannel for Visit",
      artDirection: "The engine's native 3D-as-pixel-art with the default look (Sweetie 16, toon bands, pixel outlines); new critter generator, buildings, trees, items and paintings as data; Kenney Furniture and Nature packs (CC0), recoloured",
      animation: "The engine's clip format compiled with compileClips onto a seven-joint rig, played with THREE.AnimationMixer and crossFadeTo; code-driven blink, talk, squash, head turns; 48 clips",
      audio: "All code. Music through the engine's Song sequencer (24 hourly arrangements with rain and snow variants built from 12 motifs, plus venues, festivals and records), default 10% volume. Sound effects as SoundDefs. Animalese-style gibberish voices from formant-shaped harmonics",
      online: "AI Hub Session Protocol v1 (shared-world round, The Bean Bazaar, 1-4 players); on its own, Visit: BroadcastChannel on one computer and serverless WebRTC with invite codes, up to 3 guests",
      testing: "One command, node tests/run.mjs: rule checks in Node, a scripted playthrough of the whole game with replay, an attract loop and input monkey on Engine.headless, Playwright browser checks on file:// with stub pad and touch profiles, the AI Hub harness in all four scenarios, two-page Visit tests, and model sheets",
      research: "None beyond the supplied plan, the engine kit docs and the Hub README",
      environment: "Claude Code CLI (headless); Linux",
      model: "Anthropic, claude-opus-5-5, reasoning effort xhigh",
      usage: "added on import"
    };
    FEEDBACK = {
      testing: [
        [
          "How many issues did testing catch?",
          "About 33 that needed a fix: seven crashes or bad data at build and load time, eleven gameplay bugs found by the scripted playthrough and the input monkey, three input bugs found only in the real browser, and twelve things I only saw in screenshots."
        ],
        [
          "How many would be considered critical issues / game breaking?",
          "Eight. Entering the store, the Aquarium and the Gallery each crashed; a menu-closing press also fired a world action; the Seed Toss froze the player; furniture could trap you at the door; Bartleby slept through his own Day One errand; and Mrs. Gander was missing from the opening scene."
        ],
        [
          "What was the most helpful test you ran?",
          "The scripted playthrough on Engine.headless: real input, about 0.4 ms a frame, every milestone from the night bus to Year Two in under a minute. It found most of the gameplay bugs and let me rerun everything after each change."
        ],
        [
          "What was the least helpful test you ran?",
          "The 279 warnings from the model checker. A few were useful, but most were about coplanar faces and small floating parts that look fine at game scale, so I mostly stopped reading them and judged from screenshots and the cast line-up."
        ]
      ],
      engine: [
        [
          "What did you like most about the engine?",
          "Models and clips as plain data, plus Engine.headless. I could write a whole cast of 38 characters from one generator, and run the entire game in Node with the same code that runs on WebGPU."
        ],
        [
          "Did you get stuck or guess wrong?",
          "Several small guesses. buildModel throws if a palette names a slot the model lacks, which broke shared furniture palettes. Model params are hard range-checked. I guessed the renderSound signature wrong. The dissolve front is white unless a rim colour is set. And a press shorter than a frame shows in wasPressed but not isDown, which lost taps at low frame rates."
        ],
        [
          "What was the most important thing you had to build yourself?",
          "The whole UI layer: a mixed-case bitmap font, a screen stack with focus and hit areas, dialogue with voices, and prompts that follow the last device. Close behind were the generator-based scene runner and the tile world with its own collision."
        ],
        [
          "What was the hardest part about using the engine?",
          "Judging what a screen really looks like. Screenshots on the software GPU are slow, the first frames take seconds while pipelines compile, and Mirror and RenderView cannot be exercised headless, so visual bugs surfaced late compared with logic bugs."
        ],
        [
          "What did you change in the engine, and why?",
          "None. pixel-engine.js ships byte for byte, and a test asserts it."
        ],
        [
          "If you could change one thing about the engine, what would it be?",
          "Mixed-case text in the HUD with a retained widget layer for focus and hit areas. Every game with menus has to rebuild that, and it was the largest single piece of work outside the game itself."
        ]
      ],
      prompt: [
        [
          "What did you like most about this prompt?",
          "The plan is concrete and honest about what was verified. The tested recipes, such as the browser flags and the importmap packaging, worked first time and saved hours. The writing samples also set a clear voice to match."
        ],
        [
          "What was confusing?",
          "Little. I had to decide how to write the source in the file name, since a colon cannot go in one, so I used AnimalCrossingCityFolk. The plan also asks for a stargazing camera glide, but this orthographic camera cannot look up at a sky, so the camera rises and tips up while the star field comes down over the town."
        ],
        [
          "What was the hardest thing to do?",
          "Breadth at a consistent quality. Every system ships together, including eight venues, four festivals, three contests, a Hub round and two Visit transports, and each needs its own small joke. Keeping all of it wired together was harder than any single feature."
        ],
        [
          "What would you change in this prompt?",
          "I would name the exact file-name form for sources with punctuation, and say which plan details are firm and which are only suggestions. Content floors could also be lower for the cosmetic lists, so more effort goes to feel."
        ]
      ]
    };
    qa = (list) => list.flatMap(([q, a]) => [`* ${q}`, a]);
    LABELS = { date: "Date", source: "Source", plan: "Plan", genre: "Genre", perspective: "Perspective", tech: "Tech", artDirection: "Art Direction", animation: "Animation", audio: "Audio", online: "Online", testing: "Testing", research: "Research", environment: "Environment", model: "Model", usage: "Usage" };
    ABOUT_PAGES = [
      { title: "Honk If You Owe", lines: ["A village life sim, one bus ride from the Big City.", "", "You step off the last bus at the end of the line and, within ninety seconds, owe a goose 8,000 beans.", "", "Inspired by Animal Crossing: City Folk. An original game: its own village, neighbours, music and writing.", "", "Move with the stick or WASD. Do the thing with Cross or E. Use a tool with Square or Space. Pockets with Triangle or Tab. Everything else is on the screen when you need it."] },
      { title: "Source Information", lines: Object.entries(LABELS).flatMap(([k, label]) => [`${label}: ${SOURCE_INFORMATION[k]}`]) },
      { title: "Testing Feedback", lines: qa(FEEDBACK.testing) },
      { title: "Engine Feedback", lines: qa(FEEDBACK.engine) },
      { title: "Prompt Feedback", lines: qa(FEEDBACK.prompt) },
      { title: "Cast", lines: ["Mrs. Gander, a goose: the store and the debt", "Dorrit the wombat, Tavi the quokka, Bartleby the moose", "Lady Ottoline the platypus, Rocco the armadillo, Nib the lemur", "Ozzie the possum, Yolanda the yak, Fitch the ferret", "Clementine the capybara, and a bee", "Mayor Trundle the snail, on his way", "Dr. Quill the pangolin, Madame Mothwick the moth, Old Rind the stoat", "Vesper the fruit bat, Hester the llama", "Monsieur Fleece the alpaca, Flavia Rosé the flamingo, Magda the magpie", "Sir Reginald Bellows the hippo, Pemberton the dormouse", "Agent Brisket the badger, Languid Lou the sloth, Madame Nibbles the goat", "Inspector Pimm, a hermit crab who lives in a filing cabinet"] },
      { title: "Thanks", lines: ["Kenney (kenney.nl) for the Furniture and Nature kits, CC0. Credit given anyway, gladly.", "The Pixel Engine kit and its authors. three.js and Rapier, inside the engine.", "The engine's CREDITS.md follows, on the Licences pages."] }
    ];
  }
});

// src/ui/screens/about.js
function kitCredits() {
  if (typeof document === "undefined") return [];
  const el = document.getElementById("kit-credits");
  return el ? el.textContent.split("\n") : [];
}
function paginate(sections, licences) {
  const out = [];
  const W4 = 432, MAX = 15;
  for (const s of sections) {
    const lines = s.lines.flatMap((l) => wrap(l, W4));
    for (let i = 0; i < lines.length; i += MAX) out.push({ title: s.title + (lines.length > MAX ? ` ${Math.floor(i / MAX) + 1}` : ""), lines: lines.slice(i, i + MAX) });
  }
  const lic = licences.filter((l) => l.trim() && !l.startsWith("|-")).flatMap((l) => wrap(l.replace(/[#*|`]/g, " ").replace(/\s+/g, " ").trim(), W4));
  for (let i = 0; i < lic.length; i += MAX) out.push({ title: `Licences ${Math.floor(i / MAX) + 1}`, lines: lic.slice(i, i + MAX) });
  return out;
}
var About, aboutScreen;
var init_about2 = __esm({
  "src/ui/screens/about.js"() {
    init_draw();
    init_about();
    About = class {
      constructor(g) {
        this.id = "about";
        this.pages = paginate(ABOUT_PAGES, kitCredits());
        this.i = 0;
      }
      labels() {
        return this.pages.map((p) => p.title);
      }
      focusIndex() {
        return this.i;
      }
      currentText() {
        return this.pages[this.i].lines.join("\n");
      }
      allText() {
        return this.pages.map((p) => `${p.title}
${p.lines.join("\n")}`).join("\n");
      }
      update(g, inp) {
        const m = inp.mouse;
        if (inp.nav.right || inp.nav.down || m.click && inRect(m, 410, 232, 50, 20)) {
          this.i = Math.min(this.pages.length - 1, this.i + 1);
          g.sound("almanacTurn");
        }
        if (inp.nav.left || inp.nav.up || m.click && inRect(m, 20, 232, 50, 20)) {
          this.i = Math.max(0, this.i - 1);
          g.sound("almanacTurn");
        }
        if (inp.back || m.rclick) {
          g.sound("uiCancel");
          g.ui.pop(this);
        }
      }
      prompts() {
        return [["back", "Close"]];
      }
      draw(g, hud) {
        hud.rect(0, 0, 480, 270, "ink");
        const p = this.pages[this.i];
        panel(hud, 14, 12, 452, 216, { fill: "white", trim: "sand" });
        drawText(hud, 240, 20, p.title, { align: "center", color: "ink", scale: 2 });
        p.lines.forEach((l, k) => drawText(hud, 24, 42 + k * 12, l, { color: l.startsWith("* ") ? "plum" : "ink" }));
        panel(hud, 20, 232, 50, 20, { fill: this.i > 0 ? "sand" : "mist", trim: "orange" });
        drawText(hud, 45, 238, "<", { align: "center", color: "ink" });
        panel(hud, 410, 232, 50, 20, { fill: this.i < this.pages.length - 1 ? "sand" : "mist", trim: "orange" });
        drawText(hud, 435, 238, ">", { align: "center", color: "ink" });
        drawText(hud, 240, 238, `Page ${this.i + 1} of ${this.pages.length}`, { align: "center", color: "mist" });
      }
    };
    aboutScreen = (g) => new About(g);
  }
});

// src/data/year.js
var YEAR_EVENTS;
var init_year = __esm({
  "src/data/year.js"() {
    YEAR_EVENTS = [
      { id: "seedToss", name: "The Seed Toss", day: 4, hour: 10 },
      { id: "lanternFloat", name: "The Lantern Float", day: 8, hour: 18 },
      { id: "greatSoup", name: "The Great Soup", day: 12, hour: 13 },
      { id: "longNight", name: "The Long Night", day: 16, hour: 20 },
      { id: "derby", name: "Fishing Derby", day: 6, hour: 10 },
      { id: "bugOff", name: "Bug-Off", day: 10, hour: 10 },
      { id: "snowman", name: "Snowman Contest", day: 14, hour: 10 }
    ];
  }
});

// src/net/transport.js
var Budget, Transport, HubTransport;
var init_transport = __esm({
  "src/net/transport.js"() {
    Budget = class {
      constructor() {
        this.tokens = 40;
        this.last = 0;
        this.dropped = 0;
      }
      take(now) {
        this.tokens = Math.min(40, this.tokens + (now - this.last) / 1e3 * 20);
        this.last = now;
        if (this.tokens < 1) {
          this.dropped++;
          return false;
        }
        this.tokens -= 1;
        return true;
      }
    };
    Transport = class {
      constructor() {
        this.handlers = /* @__PURE__ */ new Map();
        this.budget = new Budget();
        this.me = 0;
        this.players = [];
        this.isHost = false;
      }
      on(name, fn) {
        if (!this.handlers.has(name)) this.handlers.set(name, []);
        this.handlers.get(name).push(fn);
      }
      emit(name, ...args) {
        for (const fn of this.handlers.get(name) ?? []) fn(...args);
      }
      send() {
        return false;
      }
      close() {
      }
    };
    HubTransport = class extends Transport {
      constructor(hub) {
        super();
        this.hub = hub;
        this.me = hub.me;
        this.players = hub.players;
        this.isHost = hub.isHost;
        hub.on("message", (data, from2) => this.emit("message", data, from2));
        hub.on("leave", (e) => this.emit("leave", e.id));
      }
      send(data, { to, reliable = true } = {}) {
        return this.hub.send(data, { to, reliable });
      }
    };
  }
});

// src/net/protocol.js
function chunkString(s, n = CHUNK2) {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}
var SEND_RATE, REMOTE_DELAY, CHUNK2, round, packAvatar, unpackAvatar, RemoteTrack;
var init_protocol = __esm({
  "src/net/protocol.js"() {
    SEND_RATE = 0.1;
    REMOTE_DELAY = 120;
    CHUNK2 = 12e3;
    round = (v2) => Math.round(v2 * 100) / 100;
    packAvatar = (a) => [a.id, round(a.x), round(a.z), round(a.facing), a.action ?? 0];
    unpackAvatar = (r) => ({ id: r[0], x: r[1], z: r[2], facing: r[3], action: r[4] });
    RemoteTrack = class {
      constructor() {
        this.buf = [];
        this.x = 0;
        this.z = 0;
        this.facing = 0;
        this.action = 0;
        this.seen = false;
      }
      push(t, s) {
        this.buf.push({ t, ...s });
        if (this.buf.length > 12) this.buf.shift();
      }
      at(now) {
        const t = now - REMOTE_DELAY;
        const b = this.buf;
        if (!b.length) return this;
        let a = b[0], c2 = b[b.length - 1];
        for (let i = 0; i < b.length - 1; i++) if (b[i].t <= t && b[i + 1].t >= t) {
          a = b[i];
          c2 = b[i + 1];
          break;
        }
        const k = c2.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (c2.t - a.t))) : 1;
        const nx = a.x + (c2.x - a.x) * k, nz = a.z + (c2.z - a.z) * k;
        if (!this.seen || Math.hypot(nx - this.x, nz - this.z) > 3) {
          this.x = nx;
          this.z = nz;
          this.seen = true;
        } else {
          this.x += (nx - this.x) * 0.5;
          this.z += (nz - this.z) * 0.5;
        }
        this.facing = c2.facing;
        this.action = c2.action;
        return this;
      }
    };
  }
});

// src/net/visit.js
async function packCode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of out) bin += String.fromCharCode(b);
  return btoa(bin);
}
async function unpackCode(code) {
  const bin = atob(code.trim());
  const bytes = Uint8Array.from(bin, (c2) => c2.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return JSON.parse(await new Response(stream).text());
}
var CHANNEL, GUEST_KEY, uid, BroadcastTransport, ICE, waitForIce, RtcTransport, VisitSession, clean;
var init_visit = __esm({
  "src/net/visit.js"() {
    init_transport();
    init_protocol();
    init_rig();
    init_critter();
    init_save();
    init_storage();
    init_items();
    init_town();
    init_economy();
    init_draw();
    CHANNEL = "honk-if-you-owe:gates";
    GUEST_KEY = "honk:guest";
    uid = () => Math.floor(Math.random() * 1e9).toString(36);
    BroadcastTransport = class extends Transport {
      constructor(role, gateId = null, onHosts = null) {
        super();
        this.id = uid();
        this.isHost = role === "host";
        this.gateId = gateId ?? (this.isHost ? this.id : null);
        this.onHosts = onHosts;
        this.lobby = new BroadcastChannel(CHANNEL);
        this.lobby.onmessage = (e) => this.onLobby(e.data);
        if (this.isHost) {
          this.open();
          this.announceT = setInterval(() => this.announce(), 1e3);
          this.announce();
        } else this.lobby.postMessage({ k: "who" });
      }
      open() {
        this.ch = new BroadcastChannel(`${CHANNEL}:${this.gateId}`);
        this.ch.onmessage = (e) => {
          const m = e.data;
          if (m.to && m.to !== this.id) return;
          if (m.from === this.id) return;
          if (m.join && this.isHost) {
            this.emit("join", m.from, m.join);
            return;
          }
          if (m.bye) {
            this.emit("leave", m.from);
            return;
          }
          this.emit("message", m.d, m.from);
        };
      }
      announce() {
        this.lobby.postMessage({ k: "gate", id: this.gateId, name: this.hostName ?? "A village", count: this.guestCount ?? 0 });
      }
      onLobby(m) {
        if (m.k === "who" && this.isHost) this.announce();
        if (m.k === "gate" && !this.isHost) this.onHosts?.(m);
      }
      joinGate(gateId, hello) {
        this.gateId = gateId;
        this.open();
        this.ch.postMessage({ from: this.id, join: hello });
      }
      send(d, { to } = {}) {
        if (!this.budget.take(performance.now())) return false;
        this.ch?.postMessage({ from: this.id, to, d });
        return true;
      }
      close() {
        clearInterval(this.announceT);
        this.ch?.postMessage({ from: this.id, bye: true });
        this.ch?.close();
        this.lobby?.close();
      }
    };
    ICE = typeof location !== "undefined" && /iceServers=none/.test(location.search) ? [] : [{ urls: "stun:stun.l.google.com:19302" }];
    waitForIce = (pc) => new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve();
        return;
      }
      const t = setTimeout(resolve, 4e3);
      pc.addEventListener("icegatheringstatechange", () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(t);
          resolve();
        }
      });
    });
    RtcTransport = class extends Transport {
      constructor(role) {
        super();
        this.id = uid();
        this.isHost = role === "host";
        this.peers = /* @__PURE__ */ new Map();
        this.pending = null;
      }
      wire(peerId, pc, ch) {
        const peer = { id: peerId, pc, rel: ch, unrel: null };
        this.peers.set(peerId, peer);
        ch.onmessage = (e) => this.deliver(peer, e.data);
        ch.onopen = () => this.emit("open", peer.id);
        ch.onclose = () => {
          this.peers.delete(peer.id);
          this.emit("leave", peer.id);
        };
        pc.ondatachannel = (e) => this.acceptChannel(peer, e.channel);
        return peer;
      }
      acceptChannel(peer, ch) {
        if (ch.label === "rel") {
          peer.rel = ch;
          ch.onmessage = (e) => this.deliver(peer, e.data);
          ch.onopen = () => this.emit("open", peer.id);
          if (ch.readyState === "open") this.emit("open", peer.id);
          ch.onclose = () => {
            this.peers.delete(peer.id);
            this.emit("leave", peer.id);
          };
        } else {
          peer.unrel = ch;
          ch.onmessage = (e) => this.deliver(peer, e.data);
        }
      }
      deliver(peer, raw) {
        const m = JSON.parse(raw);
        if (m.join && this.isHost) {
          peer.gid = m.from;
          peer.id = m.from;
          this.peers.set(m.from, peer);
          this.emit("join", m.from, m.join);
          return;
        }
        this.emit("message", m.d, peer.gid ?? peer.id);
      }
      /** Host: make a Gate Pass for one more friend. */
      async makePass() {
        const pc = new RTCPeerConnection({ iceServers: ICE });
        const rel = pc.createDataChannel("rel", { ordered: true });
        const unrel = pc.createDataChannel("unrel", { ordered: false, maxRetransmits: 0 });
        const peerId = `p${uid()}`;
        const peer = this.wire(peerId, pc, rel);
        peer.unrel = unrel;
        unrel.onmessage = (e) => this.deliver(peer, e.data);
        await pc.setLocalDescription(await pc.createOffer());
        await waitForIce(pc);
        this.pending = peer;
        return packCode({ t: pc.localDescription.type, s: pc.localDescription.sdp });
      }
      /** Guest: read a Gate Pass, make a Reply Slip. */
      async answerPass(code) {
        const offer = await unpackCode(code);
        const pc = new RTCPeerConnection({ iceServers: ICE });
        const peer = { id: "host", pc, rel: null, unrel: null };
        this.peers.set("host", peer);
        pc.ondatachannel = (e) => this.acceptChannel(peer, e.channel);
        await pc.setRemoteDescription({ type: offer.t, sdp: offer.s });
        await pc.setLocalDescription(await pc.createAnswer());
        await waitForIce(pc);
        return packCode({ t: pc.localDescription.type, s: pc.localDescription.sdp });
      }
      /** Host: read the Reply Slip. */
      async acceptReply(code) {
        const answer = await unpackCode(code);
        await this.pending.pc.setRemoteDescription({ type: answer.t, sdp: answer.s });
      }
      joinGate(_, hello) {
        const p = this.peers.get("host");
        p?.rel?.send(JSON.stringify({ from: this.id, join: hello }));
      }
      send(d, { to, reliable = true } = {}) {
        if (!this.budget.take(performance.now())) return false;
        const raw = JSON.stringify({ d });
        for (const [id, peer] of this.peers) {
          if (to && id !== to) continue;
          const ch = reliable ? peer.rel : peer.unrel?.readyState === "open" ? peer.unrel : peer.rel;
          if (ch?.readyState === "open") ch.send(raw);
        }
        return true;
      }
      close() {
        for (const p of this.peers.values()) p.pc.close();
        this.peers.clear();
      }
    };
    VisitSession = class {
      constructor(g, transport, role) {
        this.g = g;
        this.t = transport;
        this.role = role;
        this.remotes = /* @__PURE__ */ new Map();
        this.sendT = 0;
        this.incoming = [];
        this.emoteT = /* @__PURE__ */ new Map();
        transport.on("message", (d, from2) => this.onMessage(d, from2));
        transport.on("join", (id, hello) => this.onJoin(id, hello));
        transport.on("leave", (id) => this.onLeave(id));
        g.net = this;
        g.visiting = true;
        g.events.emit("visitStart", { role });
      }
      addRemote(id, name, seat) {
        if (this.remotes.has(id)) return this.remotes.get(id);
        const a = new Actor(avatarDef({ shirt: ["red", "blue", "green", "sand"][seat % 4], hair: seat % 8, hairColor: "orange" }, `visit-${id}`), { name, seed: seat + 3 });
        a.addTo(this.g.town.group);
        const r = { id, name, a, track: new RemoteTrack(), seat };
        this.remotes.set(id, r);
        return r;
      }
      onJoin(id, hello) {
        const g = this.g;
        if (this.remotes.size >= 3) {
          this.t.send({ t: "full" }, { to: id });
          return;
        }
        const seat = this.remotes.size + 1;
        this.addRemote(id, clean(hello.name), seat);
        const w = g.world;
        const snapshot = JSON.stringify({ seed: w.seed, clock: w.clock, town: w.town, npcs: w.npcs, flags: { forceWeather: w.flags.forceWeather ?? null, shackRoof: w.flags.shackRoof }, player: { homeTier: w.player.homeTier, name: w.player.name, town: w.player.town }, home: { wallColor: w.home.wallColor, roofColor: w.home.roofColor }, store: w.store, museum: { open: true }, hostName: w.player.name });
        const chunks = chunkString(snapshot);
        chunks.forEach((c2, i) => this.t.send({ t: "town", i, n: chunks.length, c: c2 }, { to: id, reliable: true }));
        this.t.send({ t: "hello", seat, host: w.player.name }, { to: id, reliable: true });
        g.events.emit("visitJoined", { id, name: hello.name });
        g.ui.toastMsg(`${clean(hello.name)} has come by bus.`);
        g.sound("busHorn");
      }
      onLeave(id) {
        const g = this.g;
        if (this.role === "guest" && (id === "host" || id === this.hostId)) {
          g.ui.toastMsg("The host went home. So do you.");
          this.leave();
          return;
        }
        const r = this.remotes.get(id);
        if (r) {
          r.a.remove();
          this.remotes.delete(id);
          g.ui.toastMsg(`${r.name} caught the bus home.`);
          g.events.emit("visitLeft", { id });
        }
      }
      onMessage(d, from2) {
        const g = this.g;
        switch (d.t) {
          case "me": {
            const r = this.remotes.get(from2);
            if (r) r.track.push(g.ctx.time * 1e3, unpackAvatar(d.a));
            break;
          }
          case "snap": {
            for (const raw of d.a) {
              const u = unpackAvatar(raw);
              if (u.id === this.t.id) continue;
              const r = this.remotes.get(u.id) ?? this.addRemote(u.id, u.id === "host" ? this.hostName ?? "Host" : "Visitor", this.remotes.size + 1);
              r.track.push(g.ctx.time * 1e3, u);
            }
            break;
          }
          case "town": {
            this.incoming[d.i] = d.c;
            if (this.incoming.filter(Boolean).length === d.n) this.buildGuestTown(JSON.parse(this.incoming.join("")));
            break;
          }
          case "hello":
            this.hostName = clean(d.host);
            break;
          case "do":
            this.onDo(d, from2);
            break;
          case "ev":
            this.onEv(d, from2);
            break;
          case "emote": {
            const r = this.remotes.get(from2) ?? [...this.remotes.values()].find((x) => x.id === d.id);
            r?.a.play(d.clip, 0.1, { once: true });
            if (this.role === "host") this.t.send({ t: "emote", id: from2, clip: d.clip });
            break;
          }
          case "full":
            g.ui.toastMsg("That gate is full.");
            this.leave();
            break;
          case "bye":
            this.leave();
            break;
          default:
            break;
        }
      }
      /** Guest: build a temporary town from the host's. Your own save is untouched. */
      buildGuestTown(snap) {
        const g = this.g;
        const w = newWorld(snap.seed, { demo: true });
        Object.assign(w.clock, snap.clock);
        w.town = snap.town;
        w.npcs = snap.npcs;
        w.player.homeTier = snap.player.homeTier;
        w.player.name = g.guestProfile?.name ?? "Visitor";
        w.player.town = snap.player.town;
        w.player.beans = g.guestProfile?.beans ?? 0;
        w.player.pockets = g.guestProfile?.pockets ?? Array(15).fill(null);
        w.player.tools = ["net", "rod"];
        w.player.look = g.guestProfile?.look ?? w.player.look;
        w.flags = { ...w.flags, ...snap.flags, visiting: true };
        w.home.wallColor = snap.home.wallColor;
        w.home.roofColor = snap.home.roofColor;
        w.store = snap.store;
        w.museum.open = true;
        this.hostName = clean(snap.hostName);
        g.visitArrive(w);
        g.events.emit("visitArrived", {});
        g.ui.toastMsg(`Welcome to ${clean(snap.player.town)}. Bus doesn't run while you have company.`);
      }
      /** Host validates: catches and pickups claimed by a guest. */
      onDo(d, from2) {
        const g = this.g;
        const w = g.world;
        if (d.a === "pick") {
          const o = w.town.objects[d.k];
          if (!o || !["drop", "shell", "driftwood", "flowerGift"].includes(o.k)) {
            this.t.send({ t: "ev", k: "denied", key: d.k }, { to: from2 });
            return;
          }
          delete w.town.objects[d.k];
          g.town.dirty.add(d.k);
          this.t.send({ t: "ev", k: "obj", key: d.k, o: null });
          this.t.send({ t: "ev", k: "granted", item: o.item, key: d.k }, { to: from2 });
          g.events.emit("visitPick", { from: from2, item: o.item });
        } else if (d.a === "shake") {
          const o = w.town.objects[d.k];
          if (!o || o.k !== "tree") return;
          g.life.shakeTree(d.k, o);
          for (const k of Object.keys(w.town.objects)) if (w.town.objects[k].k === "drop") this.t.send({ t: "ev", k: "obj", key: k, o: w.town.objects[k] });
          this.t.send({ t: "ev", k: "obj", key: d.k, o });
        } else if (d.a === "gift") {
          const [x, z] = d.at;
          const key2 = `${x},${z}`;
          if (!w.town.objects[key2]) {
            w.town.objects[key2] = { k: "drop", item: d.item };
            g.town.dirty.add(key2);
            this.t.send({ t: "ev", k: "obj", key: key2, o: w.town.objects[key2] });
          }
          g.events.emit("visitGift", { from: from2, item: d.item });
        }
      }
      onEv(d) {
        const g = this.g;
        const w = g.world;
        if (d.k === "obj") {
          if (d.o) w.town.objects[d.key] = d.o;
          else delete w.town.objects[d.key];
          g.town.dirty.add(d.key);
        }
        if (d.k === "granted") {
          addItem(g, d.item);
          g.sound("pickUp");
        }
        if (d.k === "denied") g.ui.toastMsg("Somebody got there first.");
      }
      /** Each frame. Own avatar is predicted; remotes render 120 ms in the past and snap if 3 m off. */
      update(dt) {
        const g = this.g;
        const now = g.ctx.time * 1e3;
        for (const r of this.remotes.values()) {
          const tr = r.track.at(now);
          if (tr.seen) {
            r.a.x = tr.x;
            r.a.z = tr.z;
            r.a.y = g.town.height(tr.x, tr.z);
            r.a.turnTo = tr.facing;
            if (!r.a.current?.once || r.a.finished) r.a.play(tr.action ? "Jog" : "Idle", 0.15);
          }
          r.a.update(dt);
          r.a.visible = g.place === g.town;
        }
        this.sendT -= dt;
        if (this.sendT > 0) return;
        this.sendT = SEND_RATE;
        const p = g.player;
        const self = { id: this.t.id, x: p.x, z: p.z, facing: p.facing, action: p.speed > 0.2 ? 1 : 0 };
        if (this.role === "guest") this.t.send({ t: "me", a: packAvatar(self) }, { reliable: false });
        else {
          const list = [packAvatar({ ...self, id: "host" })];
          for (const r of this.remotes.values()) list.push(packAvatar({ id: r.id, x: r.a.x, z: r.a.z, facing: r.a.facing, action: r.track.action }));
          this.t.send({ t: "snap", a: list }, { reliable: false });
        }
      }
      emote(em) {
        const CLIP2 = { laugh: "Laugh", cry: "Cry", shock: "Shock", anger: "Anger", love: "Love", shrug: "Shrug", bow: "Bow", dance: "Dance" };
        this.t.send({ t: "emote", clip: CLIP2[em] });
      }
      /** Leave: a guest keeps pockets and beans, nothing else. */
      leave() {
        const g = this.g;
        if (this.left) return;
        this.left = true;
        const role = this.role;
        if (role === "guest") {
          store.set(GUEST_KEY, { pockets: g.world.player.pockets, beans: g.world.player.beans });
          const saved = store.get("honk:save");
          if (saved) {
            saved.player.pockets = g.world.player.pockets;
            saved.player.beans = g.world.player.beans;
            store.set("honk:save", saved);
          }
        } else this.t.send({ t: "bye" });
        this.t.close();
        for (const r of this.remotes.values()) r.a.remove();
        this.remotes.clear();
        g.net = null;
        g.visiting = false;
        g.events.emit("visitEnd", { role });
        if (role === "guest") g.goTitleFromVisit();
      }
    };
    clean = (s) => String(s ?? "").replace(/[^A-Za-z0-9 .,!?'&()_-]/g, "").slice(0, 14);
  }
});

// src/net/visitUi.js
function openGate(g, kind) {
  const saved = loadWorld();
  if (!saved) {
    g.ui.toastMsg("You need a village first. Try New Arrival.");
    return;
  }
  continueGame(g);
  if (kind === "local") {
    const t2 = new BroadcastTransport("host");
    t2.hostName = g.world.player.name;
    const s2 = new VisitSession(g, t2, "host");
    g.events.emit("gateOpen", { kind });
    g.ui.toastMsg("Your gate is open. A second window on this computer can visit.");
    return s2;
  }
  const t = new RtcTransport("host");
  const s = new VisitSession(g, t, "host");
  g.scripts.run(hostRtcFlow(g, t), { name: "gatePass" });
  return s;
}
function* hostRtcFlow(g, t) {
  let code = null;
  t.makePass().then((c2) => {
    code = c2;
  });
  g.ui.toastMsg("Writing your Gate Pass…");
  while (code === null) yield;
  let closed = false;
  g.ui.push(new CodeScreen({ title: "Your Gate Pass", text: "Send this to your friend, however friends send things. Then paste the Reply Slip they send back. This is a very long friend code, and we are sorry. A little.", readOnly: true, value: code, allowCopy: true, onDone: () => {
    closed = true;
  }, onCancel: () => {
    closed = true;
  } }));
  while (!closed) yield;
  let reply = null;
  g.ui.push(new CodeScreen({ title: "Their Reply Slip", text: "Paste what they sent. It needs a keyboard. Sorry about that too.", readOnly: false, onDone: (v2) => {
    reply = v2;
  }, onCancel: () => {
    reply = "";
  } }));
  while (reply === null) yield;
  if (reply) t.acceptReply(reply).catch(() => g.ui.toastMsg("That Reply Slip doesn't read right."));
}
function guestProfile() {
  const saved = loadWorld();
  return { name: saved?.player.name ?? "Visitor", beans: saved?.player.beans ?? 500, pockets: saved?.player.pockets ?? Array(15).fill(null), look: saved?.player.look ?? null };
}
function visitFriendLocal(g, onList) {
  g.guestProfile = guestProfile();
  const t = new BroadcastTransport("guest", null, (m) => onList?.(m, t));
  return t;
}
function localGuestMenu(g) {
  const seen = /* @__PURE__ */ new Map();
  const items = [{ label: "Looking for gates…", disabled: true }, { label: "Back", action: (gg, m2) => {
    t.close();
    gg.ui.pop(m2);
  } }];
  let m = null;
  const t = visitFriendLocal(g, (gate) => {
    if (seen.has(gate.id)) return;
    seen.set(gate.id, gate);
    items.unshift({ label: `${gate.name}'s village`, action: (gg, mm) => {
      gg.ui.pop(mm);
      joinLocal(gg, t, gate.id);
    } });
    if (m) {
      m.items = items;
      m.focus = 0;
    }
  });
  m = new Menu({ id: "visitLocal", title: "Gates on this computer", items, x: 110, y: 90, w: 260, back: (gg, mm) => {
    t.close();
    gg.ui.pop(mm);
  } });
  return m;
}
function joinLocal(g, t, gateId) {
  g.guestProfile ??= guestProfile();
  const s = new VisitSession(g, t, "guest");
  s.hostId = gateId;
  t.joinGate(gateId, { name: g.guestProfile.name });
  g.ui.toastMsg("You wait at the stop. The bus comes.");
  return s;
}
function* guestRtcFlow(g) {
  g.guestProfile = guestProfile();
  let pass = null;
  g.ui.push(new CodeScreen({ title: "Their Gate Pass", text: "Paste the Gate Pass your friend sent. It needs a keyboard.", readOnly: false, onDone: (v2) => {
    pass = v2;
  }, onCancel: () => {
    pass = "";
  } }));
  while (pass === null) yield;
  if (!pass) return;
  const t = new RtcTransport("guest");
  const s = new VisitSession(g, t, "guest");
  s.hostId = "host";
  let slip = null;
  t.answerPass(pass).then((c2) => {
    slip = c2;
  }).catch(() => {
    slip = "";
  });
  while (slip === null) yield;
  if (!slip) {
    g.ui.toastMsg("That Gate Pass doesn't read right.");
    s.leave();
    return;
  }
  t.on("open", () => t.joinGate(null, { name: g.guestProfile.name }));
  let closed = false;
  g.ui.push(new CodeScreen({ title: "Your Reply Slip", text: "Send this back to your friend. When they paste it, the bus comes.", readOnly: true, value: slip, allowCopy: true, onDone: () => {
    closed = true;
  }, onCancel: () => {
    closed = true;
  } }));
  while (!closed) yield;
}
function visitMenu(g) {
  const items = [
    { label: "Open my gate, on this computer", action: (gg) => openGate(gg, "local") },
    { label: "Open my gate, by Gate Pass", action: (gg) => openGate(gg, "rtc") },
    { label: "Visit a friend, on this computer", action: (gg) => gg.ui.push(localGuestMenu(gg)) },
    { label: "Visit a friend, by Gate Pass", action: (gg, m) => {
      gg.scripts.run(guestRtcFlow(gg), { name: "gatePassGuest" });
    } },
    { label: "Back", action: (gg, m) => gg.ui.pop(m) }
  ];
  return new Menu({ id: "visit", title: "Visit", items, x: 90, y: 80, w: 300, back: (gg, m) => gg.ui.pop(m) });
}
function visitHandle(g) {
  const v2 = {
    gates: [],
    openGate: (kind) => openGate(g, kind),
    findGates: () => {
      v2.t = visitFriendLocal(g, (gate) => {
        if (!v2.gates.some((x) => x.id === gate.id)) v2.gates.push(gate);
      });
    },
    joinFirst: (profile) => {
      g.guestProfile = profile;
      v2.session = joinLocal(g, v2.t, v2.gates[0].id);
    },
    openRtcHost: async () => {
      const t = new RtcTransport("host");
      v2.t = t;
      v2.session = new VisitSession(g, t, "host");
      return t.makePass();
    },
    answerRtc: async (code, profile) => {
      g.guestProfile = profile;
      const t = new RtcTransport("guest");
      v2.t = t;
      v2.session = new VisitSession(g, t, "guest");
      v2.session.hostId = "host";
      t.on("open", () => t.joinGate(null, { name: profile.name }));
      return t.answerPass(code);
    },
    acceptRtc: (slip) => v2.t.acceptReply(slip)
  };
  return v2;
}
var box3, hideBox, CodeScreen;
var init_visitUi = __esm({
  "src/net/visitUi.js"() {
    init_ui();
    init_draw();
    init_save();
    init_visit();
    init_newgame();
    init_objectsView();
    box3 = () => {
      if (typeof document === "undefined") return null;
      let t = document.getElementById("gate-code");
      if (!t) {
        t = document.createElement("textarea");
        t.id = "gate-code";
        t.style.cssText = "position:fixed;left:18%;top:42%;width:64%;height:22%;background:#f4f4f4;color:#1a1c2c;border:6px solid #ffcd75;font:bold 16px monospace;z-index:30;padding:8px;outline:none;";
        t.spellcheck = false;
        document.body.appendChild(t);
      }
      t.style.display = "block";
      return t;
    };
    hideBox = () => {
      const t = typeof document !== "undefined" && document.getElementById("gate-code");
      if (t) t.style.display = "none";
    };
    CodeScreen = class {
      constructor({ title, text, readOnly, value = "", onDone, onCancel, allowCopy }) {
        this.id = "gateCode";
        this.title = title;
        this.text = text;
        this.readOnly = readOnly;
        this.onDone = onDone;
        this.onCancel = onCancel;
        this.allowCopy = allowCopy;
        this.value = value;
        this.copied = false;
      }
      labels() {
        return ["OK", "Copy"];
      }
      open(g) {
        this.g = g;
        g.ctx.input.preventKeys.delete("Backspace");
        this.el = box3();
        if (this.el) {
          this.el.value = this.value;
          this.el.readOnly = !!this.readOnly;
          this.el.focus();
          if (this.readOnly) this.el.select();
          this.el.oninput = () => {
            this.value = this.el.value;
          };
        }
      }
      close() {
        hideBox();
        this.g?.ctx.input.preventKeys.add("Backspace");
      }
      currentText() {
        return this.el?.value ?? this.value;
      }
      update(g, inp) {
        const input = g.ctx.input;
        if (input.wasPressed("Enter") || input.wasPressed("PadCross")) {
          if (this.el) this.value = this.el.value;
          g.sound("uiConfirm");
          g.ui.pop(this);
          this.onDone?.(this.value);
          return;
        }
        if (input.wasPressed("Escape") || input.wasPressed("PadCircle")) {
          g.sound("uiCancel");
          g.ui.pop(this);
          this.onCancel?.();
          return;
        }
        if (this.allowCopy && (input.wasPressed("KeyC") || input.wasPressed("PadSquare")) && this.readOnly) {
          navigator.clipboard?.writeText(this.value).catch(() => {
          });
          this.el?.select();
          this.copied = true;
          g.sound("stamp");
        }
      }
      prompts() {
        return [["confirm", this.readOnly ? "Done" : "Go"], ["back", "Back"]];
      }
      draw(g, hud) {
        dim(hud);
        panel(hud, 60, 24, 360, 216, { fill: "white", trim: "sand" });
        drawText(hud, 240, 34, this.title, { align: "center", color: "ink", scale: 2 });
        textBlock(hud, 76, 62, 330, this.text, { color: "slate" });
        if (this.allowCopy) drawText(hud, 240, 222, this.copied ? "Copied. Or select it and copy by hand." : "Press C to copy, or select it by hand.", { align: "center", color: "plum" });
      }
    };
  }
});

// src/ui/screens/title.js
function titleScreen(g) {
  const touch = g.opts.touchOnly;
  const items = [];
  if (hasSave()) items.push({ label: "Continue", action: (gg) => continueGame(gg) });
  items.push({ label: "New Arrival", action: (gg) => gg.ui.push(newArrivalMenu(gg)) });
  items.push({ label: "Visit", action: (gg) => gg.ui.push(visitMenu(gg)) });
  items.push({ label: "Settings", action: (gg) => gg.ui.push(settingsScreen(gg)) });
  items.push({ label: "About", action: (gg) => gg.ui.push(aboutScreen(gg)) });
  const m = new Menu({ id: "title", items, x: 160, y: 126, w: 160, itemH: 20, gap: 3, dim: false, dimBack: false, back: () => {
  }, prompts: [["confirm", "Select"]] });
  m.isTitle = true;
  const baseDraw = m.draw.bind(m);
  m.draw = (gg, hud) => {
    drawLogo(gg, hud);
    if (touch && !gg.inp.keyOrPadSeen) {
      panel(hud, 110, 170, 260, 24, { fill: "navy", trim: "sky" });
      drawText(hud, 240, 178, "Controller or keyboard required", { align: "center", color: "white" });
    } else baseDraw(gg, hud);
  };
  const baseUpdate = m.update.bind(m);
  m.update = (gg, inp, dt) => {
    if (touch && !gg.inp.keyOrPadSeen) {
      if (inp.confirm || inp.back || inp.nav.up || inp.nav.down || inp.pause) gg.inp.keyOrPadSeen = true;
      return;
    }
    baseUpdate(gg, inp, dt);
  };
  return m;
}
function drawLogo(g, hud) {
  const t = g.ctx.time;
  const y = 28 + Math.round(Math.sin(t * 1.3) * 1.5);
  drawText(hud, 240, y + 2, "Honk If You Owe", { align: "center", color: "ink", scale: 4 });
  drawText(hud, 240, y, "Honk If You Owe", { align: "center", color: "sand", scale: 4, shadow: "plum" });
  drawText(hud, 240, y + 38, "a village, a goose, and a very long payment plan", { align: "center", color: "white", shadow: "ink" });
}
function newArrivalMenu(g) {
  const items = [
    { label: "Village Time: a day takes twenty minutes", action: (gg, m) => {
      gg.ui.pop(m);
      startNewGame(gg, "village");
    } },
    { label: "Real Clock: your device's time and date", action: (gg, m) => {
      gg.ui.pop(m);
      startNewGame(gg, "real");
    } },
    { label: "Back", action: (gg, m) => gg.ui.pop(m) }
  ];
  return new Menu({ id: "newArrival", title: "New Arrival", items, x: 80, y: 90, w: 320, itemH: 22, back: (gg, m) => gg.ui.pop(m), footer: hasSave() ? "This replaces your saved village when the bus arrives." : null });
}
var init_title = __esm({
  "src/ui/screens/title.js"() {
    init_draw();
    init_ui();
    init_settings();
    init_about2();
    init_save();
    init_newgame();
    init_visitUi();
  }
});

// src/systems/newgame.js
function installWorld(g, world) {
  g.world = world;
  g.scripts.cancelAll();
  g.weatherKey = null;
  g.lastHour = -1;
  g.town.syncNav();
  g.refreshSeason(true);
  rebuildAllObjects(g.town);
  g.rooms.reset();
  g.town.refreshHome();
  g.town.refreshStore();
  g.player.applyLook();
  g.life.resetDay();
  g.festivals.resetDay();
  g.npcs.scatter();
  for (const n of g.npcs.all()) {
    n.talking = false;
    n.overrideClip = null;
  }
  g.sky.placeChanged();
  equip(g, world.player.tool, false);
}
function startNewGame(g, mode) {
  const seed = g.opts.seed ?? hash32(`arrival:${g.ctx.time}:${g.realNow ?? 0}`);
  const w = newWorld(seed, { mode });
  g.ui.popAll();
  g.mode = "play";
  g.demo = false;
  g.camState.zoomOverride = void 0;
  g.fixedCam = false;
  g.ctx.engine.screen.set("fade", 1);
  installWorld(g, w);
  dailyRespawn(g);
  rebuildAllObjects(g.town);
  g.events.emit("newGame", { mode });
  g.scripts.run(arrival(g), { name: "arrival" });
}
function* arrival(g) {
  const w = g.world;
  w.clock.minute = 23 * 60;
  w.flags.forceWeather = "rain";
  g.weatherKey = null;
  g.hideHud = true;
  const bus2 = g.busPlace ??= new BusPlace(g);
  g.ctx.scene.add(bus2.group);
  bus2.setScene(0, 1, { night: true });
  g.swapPlace(bus2, 0, 0, 0);
  const p = g.player;
  p.remove();
  bus2.bodyGroup.add(p.root);
  p.x = 0.6;
  p.z = -0.8;
  p.y = 0.86;
  p.facing = Math.PI * 0.5;
  p.sitting = true;
  p.play("Sit", 0);
  g.camFocus = { x: 1.5, y: 1.2, z: 0 };
  g.camTeleport();
  g.sky.apply();
  bus2.hester.play("Sit", 0);
  g.ctx.engine.screen.reveal("fade", { duration: 1 });
  yield 1.2;
  g.sound("thunder");
  yield* say(g, "hester", ["End of the line? Nobody gets off there on purpose."]);
  yield* say(g, "hester", ["I'm Hester. I drive the bus. Who've I got?"]);
  w.player.name = yield* keyboardFlow(g, { title: "What do they call you?", max: 12, random: NAMES2, hint: "Type, or use the grid. Suggest asks Hester to guess." });
  yield* say(g, "hester", [`${w.player.name}. All right. I've heard worse. I've driven worse.`, "And what's the town called? The one at the end? Nobody's ever told me. I only drive the bus."]);
  w.player.town = yield* keyboardFlow(g, { title: "What's the town called?", max: 16, random: TOWNS, hint: "It's up to you. It's always been up to someone." });
  yield* say(g, "hester", `${w.player.town}. Sounds about right. It's raining there. It's raining everywhere. I've checked.`);
  const a = yield* ask(g, "hester", "So what are you running from?", ["The usual", "Nothing, honest", "A very large bill", "My family"]);
  w.player.look.hair = [0, 3, 5, 4][a < 0 ? 0 : a];
  const b = yield* ask(g, "hester", "Favourite weather?", ["Rain", "Sun", "Snow", "I like a good fog"]);
  w.player.look.hairColor = ["navy", "orange", "white", "plum"][b < 0 ? 0 : b];
  const c2 = yield* ask(g, "hester", "How do you take bad news?", ["Sitting down", "Very well", "Loudly", "I write a letter"]);
  w.player.look.eyes = [2, 1, 3, 0][c2 < 0 ? 0 : c2];
  p.applyLook();
  p.play("Sit", 0);
  yield* narrate(g, "A wet face looks back at you from the bus window. Is that what you look like? You could do something about that. Now would be the time.");
  yield* lookEditor(g, { title: "The bus window" });
  p.play("Sit", 0);
  yield* say(g, "hester", "You look like someone who owes money.");
  yield* say(g, "hester", "Here we are. Mind the step. There isn't a step. Mind it anyway.");
  g.sound("busBrake");
  g.engine.screen.cover("iris", { duration: 0.6 });
  yield 0.7;
  p.sitting = false;
  p.remove();
  w.flags.forceWeather = null;
  w.clock.minute = 8 * 60;
  g.weatherKey = null;
  prepareDayOne(g);
  rebuildAllObjects(g.town);
  dailyFavours(g);
  g.swapPlace(g.town, LANDMARKS.busStop[0] + 1, LANDMARKS.busStop[1] + 0.3, Math.PI / 2);
  g.lastHour = hourNow(w);
  g.npcs.scatter();
  g.life.resetDay();
  g.hideHud = false;
  const gander = new Actor(CRITTER_DEFS.gander, { name: "gander", seed: 4 });
  gander.addTo(g.town.group);
  gander.x = LANDMARKS.busStop[0] + 3;
  gander.z = LANDMARKS.busStop[1] + 0.3;
  gander.facing = -Math.PI / 2;
  g.townGander = gander;
  g.engine.screen.reveal("iris", { duration: 0.6 });
  g.actorOverride = { gander };
  yield 0.8;
  gander.play("Honk", 0.1, { once: true });
  g.sound("honk");
  yield* say(g, "gander", ["You're late. No, you're exactly on time. I've already billed you for being late.", `Mrs. Gander. I own the store, the road you're standing on, and as of ninety seconds ago, a good part of you, ${w.player.name} dear.`, "Your new home is this way. Do keep up. I'm charging by the minute."]);
  g.engine.screen.cover("iris", { duration: 0.5 });
  yield 0.6;
  g.swapPlace(g.town, 69, 41.6, Math.PI);
  gander.x = 66.4;
  gander.z = 41.2;
  gander.facing = Math.PI / 2;
  g.engine.screen.reveal("iris", { duration: 0.5 });
  yield 0.7;
  yield* say(g, "gander", ["Here we are. The roof is included. The rain is complimentary. The 8,000 beans are not.", "I see you've no way to pay. How lovely. Put this apron on. You'll work some of it off with errands. Look at your list, dear. Top right."]);
  w.player.look.outfit = "apron";
  p.applyLook();
  g.sound("uiConfirm");
  yield* say(g, "gander", "Dorrit has a parcel. Tavi has a net. Bartleby has a rod and would prefer not. The Mayor is around, slowly. Clementine at the Hall has the rest. Off you go. HONK. Pardon me. That was my indoor voice.");
  gander.remove();
  g.townGander = null;
  g.actorOverride = null;
  markSessionOpen(g);
  saveNow(g);
  g.events.emit("arrived", {});
}
function continueGame(g) {
  const w = loadWorld();
  if (!w) {
    g.sound("uiError");
    return;
  }
  const unclean = lastSessionUnclean();
  g.ui.popAll();
  g.mode = "play";
  g.demo = false;
  g.fixedCam = false;
  g.camState.zoomOverride = void 0;
  installWorld(g, w);
  if (w.player.place === "bus") {
    w.player.place = "town";
    w.player.x = LANDMARKS.busStop[0];
    w.player.z = LANDMARKS.busStop[1];
  }
  const place = w.player.place === "town" || !w.player.place ? g.town : w.player.place === "city" ? g.city : g.rooms.get(w.player.place);
  g.place.group.visible = false;
  g.swapPlace(place, w.player.x, w.player.z, w.player.facing);
  if (g.realNow) handleAbsence(g, g.realNow);
  deliverMail(g);
  markSessionOpen(g);
  g.events.emit("continued", {});
  if (unclean) g.scripts.run(pimmVisit(g), { name: "pimm" });
}
function* pimmVisit(g) {
  const w = g.world;
  w.pimm.visits += 1;
  const v2 = w.pimm.visits;
  const bank = v2 === 1 ? HOSTS.pimm.first : v2 === 2 ? HOSTS.pimm.second : v2 === 3 ? HOSTS.pimm.third : v2 === 4 ? HOSTS.pimm.last : null;
  if (!bank) return;
  yield 0.6;
  const a = new Actor(CRITTER_DEFS.pimm, { name: "pimm", seed: 11 });
  a.addTo(g.place.group);
  a.x = g.player.x + 6;
  a.z = g.player.z;
  a.y = g.place.height(g.player.x, g.player.z);
  a.facing = -Math.PI / 2;
  a.play("PimmScuttle", 0);
  g.actorOverride = { pimm: a };
  g.pimmActor = a;
  while (a.x > g.player.x + 1.6) {
    a.x -= 1 / 60 * 2.4;
    yield;
  }
  a.play("Idle", 0.2);
  g.player.faceToward(a.x, a.z);
  yield* say(g, "pimm", bank);
  g.events.emit("pimm", { visit: v2 });
  a.play("PimmScuttle", 0.2);
  for (let i = 0; i < 120; i++) {
    a.x += 1 / 60 * 3;
    yield;
  }
  a.remove();
  g.pimmActor = null;
  g.actorOverride = null;
}
function quitToTitle(g) {
  g.ui.popAll();
  g.scripts.cancelAll();
  g.engine.screen.set("fade", 0);
  g.goTitle();
}
var NAMES2, TOWNS;
var init_newgame = __esm({
  "src/systems/newgame.js"() {
    init_save();
    init_rng();
    init_say();
    init_keyboard();
    init_lookEditor();
    init_dayone();
    init_flow();
    init_objectsView();
    init_bus();
    init_town();
    init_hosts();
    init_session();
    init_title();
    init_time();
    init_favours();
    init_rig();
    init_critter();
    init_tools();
    init_mail();
    init_cheese();
    NAMES2 = ["Pip", "Moss", "Juniper", "Wren", "Ash", "Bramble", "Tuck", "Fern", "Quill", "Sorrel", "Basil", "Hob"];
    TOWNS = ["Lower Nowhere", "Much Owing", "Little Regret", "Bean Hollow", "Far Enough", "Dunhonkin", "Upper Lateness", "Pear Bottom"];
  }
});

// src/ui/screens/dev.js
var dev_exports = {};
__export(dev_exports, {
  CITY_DOORS: () => CITY_DOORS,
  CONTESTS: () => CONTESTS,
  FESTIVALS: () => FESTIVALS,
  LANDMARKS: () => LANDMARKS,
  calendar: () => calendar,
  devScreen: () => devScreen,
  rebuildAllObjects: () => rebuildAllObjects,
  sendMail: () => sendMail,
  toggleLineup: () => toggleLineup
});
function toggleLineup(g) {
  if (g.lineup) {
    for (const a of g.lineup) a.remove();
    g.lineup = null;
    g.actorOverride = null;
    return;
  }
  g.lineup = [];
  const over = {};
  Object.keys(CRITTER_DEFS).forEach((id, i) => {
    const a = new Actor(CRITTER_DEFS[id], { name: id, seed: i + 1 });
    a.x = 18 + i % 7 * 2.2;
    a.z = 34.5 + Math.floor(i / 7) * 3.2;
    a.facing = 0.5;
    a.addTo(g.town.group);
    g.lineup.push(a);
    over[`lineup${i}`] = a;
  });
  g.actorOverride = over;
}
function exportText(g, text, name) {
  g.lastExport = text;
  if (typeof document === "undefined") {
    g.ui.toastMsg("Exported.");
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
  g.ui.toastMsg(`Exported ${name}.`);
}
function importText(g, fn) {
  if (typeof document === "undefined") return;
  const i = document.createElement("input");
  i.type = "file";
  i.accept = ".json,application/json";
  i.onchange = () => {
    const f = i.files[0];
    if (f) f.text().then(fn);
  };
  i.click();
}
function devScreen(g) {
  const items = [["Time", timePage], ["World", worldPage], ["Player", playerPage], ["Neighbours", neighboursPage], ["Events", eventsPage], ["Collections", collectionsPage], ["Debug", debugPage], ["Save", savePage], ["Balance", balancePage]].map(([label, fn]) => ({ label, action: (gg) => gg.ui.push(fn(gg)) }));
  items.push({ label: "Back", action: (gg, m2) => gg.ui.pop(m2) });
  const m = new Menu({ id: "dev", title: "Dev Mode", items, x: 130, y: 44, w: 220, itemH: 19, gap: 2, back: (gg, mm) => gg.ui.pop(mm) });
  m.perPage = 10;
  return m;
}
var refreshTime, pageMenu, timePage, worldPage, playerPage, neighboursPage, eventsPage, collectionsPage, debugPage, savePage, balancePage;
var init_dev = __esm({
  "src/ui/screens/dev.js"() {
    init_ui();
    init_year();
    init_lookEditor();
    init_rig();
    init_critter();
    init_tuning();
    init_bed();
    init_calendar();
    init_town();
    init_neighbours();
    init_items();
    init_economy();
    init_tools();
    init_fish();
    init_bugs();
    init_fossils();
    init_art();
    init_emote();
    init_session();
    init_save();
    init_newgame();
    init_favours();
    init_story();
    init_objectsView();
    init_stargaze();
    init_cityMap();
    init_mail();
    refreshTime = (g) => {
      g.weatherKey = null;
      g.lastHour = -1;
      g.refreshSeason(true);
      g.sky.placeChanged();
      g.life.placeSpecials();
      g.festivals.resetDay();
      g.npcs.scatter();
    };
    pageMenu = (g, title, items) => {
      const m = new Menu({ id: `dev:${title}`, title: `Dev: ${title}`, items: [...items, { label: "Back", action: (gg, mm) => gg.ui.pop(mm) }], x: 60, y: 44, w: 360, itemH: 19, gap: 2, back: (gg, mm) => gg.ui.pop(mm), prompts: [["confirm", "Do"], ["back", "Back"]] });
      return m;
    };
    timePage = (g) => {
      const w = g.world;
      return pageMenu(g, "Time", [
        { label: "Hour", value: () => Math.floor(w.clock.minute / 60), left: () => {
          w.clock.minute = (w.clock.minute + 1380) % 1440;
          refreshTime(g);
        }, right: () => {
          w.clock.minute = (w.clock.minute + 60) % 1440;
          refreshTime(g);
        }, action: () => {
        } },
        { label: "Next day", action: () => {
          advanceTo(g, w.clock.day + 1, 8 * 60);
          refreshTime(g);
          g.events.emit("devNextDay", {});
        } },
        { label: "Set calendar day", value: () => villageDay(w.clock.day).calendarDay, left: () => {
          const d = villageDay(w.clock.day).calendarDay;
          advanceTo(g, w.clock.day + (d + 14) % 16 + 0, w.clock.minute);
          refreshTime(g);
        }, right: () => {
          advanceTo(g, w.clock.day + 1, w.clock.minute);
          refreshTime(g);
        }, action: () => {
        } },
        { label: "Next season", action: () => {
          const d = villageDay(w.clock.day);
          advanceTo(g, w.clock.day + (4 - (d.calendarDay - 1) % 4), 8 * 60);
          refreshTime(g);
        } },
        { label: "Freeze time", value: () => g.timeFrozen ? "Yes" : "No", action: () => {
          g.timeFrozen = !g.timeFrozen;
        } },
        { label: "Clock mode", value: () => w.clock.mode, action: () => {
          w.clock.mode = w.clock.mode === "real" ? "village" : "real";
          g.weatherKey = null;
          refreshTime(g);
        } }
      ]);
    };
    worldPage = (g) => {
      const w = g.world;
      const places = [["Plaza", g.town, 24, 41], ["Bus stop", g.town, 8.5, 29], ...BUILDINGS.map((b) => [b.name, g.town, b.door[0], b.door[1] + 0.6]), ...NEIGHBOUR_ORDER.map((id) => [NEIGHBOURS[id].name, null, id]), ["The City", g.city, 2.5, 10]];
      return pageMenu(g, "World", [
        { label: "Weather", value: () => w.flags.forceWeather ?? "natural", action: () => {
          const list = [null, "sun", "rain", "storm", "fog", "wind", "snow", "clear"];
          const i = list.indexOf(w.flags.forceWeather ?? null);
          w.flags.forceWeather = list[(i + 1) % list.length];
          g.weatherKey = null;
        } },
        { label: "Teleport…", action: (gg) => gg.ui.push(pageMenu(gg, "Teleport", places.map(([name, place, x, z]) => ({ label: name, action: (g2) => {
          g2.ui.popAll();
          if (!place) {
            const a = g2.npcs.actor(x);
            g2.swapPlace(g2.town, a.x + 1, a.z + 1);
          } else g2.swapPlace(place, x, z);
        } })))) },
        { label: "No-clip", value: () => g.noclip ? "On" : "Off", action: () => {
          g.noclip = !g.noclip;
        } },
        { label: "Free camera", value: () => g.freeCam ? "On" : "Off", action: () => {
          g.freeCam = !g.freeCam;
          g.engine.setCamera(g.freeCam ? { preset: "free" } : { preset: "iso", yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 }, { syncUrl: false });
          g.fixedCam = g.freeCam;
        } },
        { label: "Zoom-out overview", value: () => g.camState.zoomOverride === 0.6 ? "On" : "Off", action: () => {
          g.camState.zoomOverride = g.camState.zoomOverride === 0.6 ? void 0 : 0.6;
        } }
      ]);
    };
    playerPage = (g) => {
      const w = g.world;
      const categories = ["fish", "bug", "fossil", "art", "furniture", "clothes", "hat", "glasses", "umbrella", "fruit", "seed", "bag", "cheese", "record", "wall", "floor"];
      return pageMenu(g, "Player", [
        { label: "Beans", value: () => w.player.beans.toLocaleString("en-US"), left: () => addBeans(g, -1e4), right: () => addBeans(g, 1e4), action: () => addBeans(g, 1e5) },
        { label: "Clear debt", value: () => w.player.debt.toLocaleString("en-US"), action: () => {
          w.player.debt = 0;
        } },
        { label: "Home tier", value: () => w.player.homeTier, left: () => {
          w.player.homeTier = Math.max(1, w.player.homeTier - 1);
          g.town.refreshHome();
          g.rooms.reset();
        }, right: () => {
          w.player.homeTier = Math.min(4, w.player.homeTier + 1);
          g.town.refreshHome();
          g.rooms.reset();
        }, action: () => {
        } },
        { label: "Give any item…", action: (gg) => gg.ui.push(pageMenu(gg, "Give", categories.map((c2) => ({ label: c2, action: (g2) => {
          const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === c2);
          g2.ui.push(pageMenu(g2, c2, ids.map((id) => ({ label: ITEMS[id].name, action: (g3) => {
            addItem(g3, id);
            g3.sound("pickUp");
          } }))));
        } })))) },
        { label: "All tools", action: () => {
          for (const t of TOOL_ORDER) if (!w.player.tools.includes(t)) w.player.tools.push(t);
          grantTool(g, "net");
        } },
        { label: "All emotes", action: () => {
          w.player.emotes = ALL_EMOTES.slice();
        } },
        { label: "Set look", action: () => {
          g.ui.popAll();
          g.scripts.run(lookEditor(g, { title: "Dev: look", free: true }), { name: "devLook" });
        } },
        { label: "Empty pockets", action: () => {
          w.player.pockets.fill(null);
        } }
      ]);
    };
    neighboursPage = (g) => pageMenu(g, "Neighbours", [
      ...NEIGHBOUR_ORDER.map((id) => ({ label: NEIGHBOURS[id].name, value: () => g.world.npcs[id].friend, left: () => {
        g.world.npcs[id].friend = Math.max(0, g.world.npcs[id].friend - 10);
      }, right: () => {
        g.world.npcs[id].friend = Math.min(100, g.world.npcs[id].friend + 10);
      }, action: () => {
        offerFavour(g, id);
        g.sound("uiConfirm");
      } })),
      { label: "Move Rocco out, Fitch in, now", action: () => roccoLeaves(g) },
      { label: "Show routines", value: () => g.overlay.npc ? "On" : "Off", action: () => {
        g.overlay.npc = !g.overlay.npc;
      } }
    ]);
    eventsPage = (g) => {
      const w = g.world;
      const go = (day, hour) => {
        const d = villageDay(w.clock.day).calendarDay;
        let add2 = (day - d + 16) % 16;
        if (add2 === 0 && hour * 60 < w.clock.minute) add2 = 16;
        advanceTo(g, w.clock.day + add2, hour * 60);
        refreshTime(g);
        g.ui.popAll();
      };
      return pageMenu(g, "Events", [
        ...YEAR_EVENTS.map((ev) => ({ label: ev.name, action: () => go(ev.day, ev.hour) })),
        { label: "Vesper, tonight", action: () => {
          w.flags.vesperForced = true;
          w.clock.minute = 20 * 60;
          refreshTime(g);
          g.ui.popAll();
        } },
        { label: "Inspector Pimm", action: () => {
          g.ui.popAll();
          g.scripts.run(pimmVisit(g), { name: "pimm" });
        } },
        { label: "Cheese day", action: () => {
          w.flags.rindForced = true;
          g.life.placeSpecials();
          g.ui.popAll();
        } },
        { label: "Wasps", action: () => {
          g.ui.popAll();
          g.life.startWasps(g.player.x + 3, g.player.z + 3);
        } },
        { label: "A shooting star", action: () => {
          w.clock.minute = 22 * 60;
          refreshTime(g);
          g.ui.popAll();
          g.swapPlace(g.town, LANDMARKS.lookoutBench[0], LANDMARKS.lookoutBench[1] + 1.2, Math.PI);
        } },
        { label: "A balloon", action: () => {
          g.ui.popAll();
          const b = g.life.launchBalloon({ z: Math.floor(g.player.z), gift: "bagOfBeans" });
          b.x = g.player.x - 6;
        } },
        { label: "The ending", action: () => {
          go(16, 23.8);
          w.flags.lightsDoors = { a: 1, b: 1, c: 1, d: 1 };
        } }
      ]);
    };
    collectionsPage = (g) => {
      const w = g.world;
      const fill = (v2) => {
        for (const [list, wing] of [[FISH, "fish"], [BUGS, "bug"], [FOSSILS, "fossil"], [ART, "art"]]) {
          w.museum[wing] = v2 ? Object.fromEntries(list.map((x) => [x.id, true])) : {};
          w.almanac[wing] = v2 ? Object.fromEntries(list.map((x) => [x.id, 1])) : {};
        }
        if (v2) for (const c2 of CONSTELLATIONS) w.almanac.stars[c2.id] = true;
        else w.almanac.stars = {};
        g.rooms.reset();
      };
      return pageMenu(g, "Collections", [{ label: "Fill museum and Almanac", action: () => fill(true) }, { label: "Empty museum and Almanac", action: () => fill(false) }]);
    };
    debugPage = (g) => pageMenu(g, "Debug", [
      { label: "Collision tiles", value: () => g.overlay.collision ? "On" : "Off", action: () => {
        g.overlay.collision = !g.overlay.collision;
      } },
      { label: "Nav paths", value: () => g.overlay.nav ? "On" : "Off", action: () => {
        g.overlay.nav = !g.overlay.nav;
      } },
      { label: "Target", value: () => g.overlay.target ? "On" : "Off", action: () => {
        g.overlay.target = !g.overlay.target;
      } },
      { label: "Neighbour state", value: () => g.overlay.npc ? "On" : "Off", action: () => {
        g.overlay.npc = !g.overlay.npc;
      } },
      { label: "Cast line-up on the plaza", value: () => g.lineup ? "On" : "Off", action: () => toggleLineup(g) },
      { label: "Engine state line", value: () => g.overlay.engine ? "On" : "Off", action: () => {
        g.overlay.engine = !g.overlay.engine;
      } },
      { label: "Look switcher", value: () => g.devLook ?? "none", action: () => {
        const names = ["none", "pixel_world", "dream", "cel_cartoon", "neon_nights", "storybook"];
        const i = names.indexOf(g.devLook ?? "none");
        g.devLook = names[(i + 1) % names.length];
        g.engine.setLook(g.engine.lookPresets[g.devLook]);
      } }
    ]);
    savePage = (g) => pageMenu(g, "Save", [
      { label: "Save now", action: () => {
        if (g.demo) {
          g.ui.toastMsg("Not on a demo.");
          return;
        }
        saveNow(g);
        g.ui.toastMsg("Saved.");
      } },
      { label: "Load", action: () => {
        const w = loadWorld();
        if (w) {
          installWorld(g, w);
          g.swapPlace(g.town, w.player.x, w.player.z);
          g.ui.popAll();
        } else g.ui.toastMsg("Nothing saved.");
      } },
      { label: "Reset save", action: () => {
        clearSave();
        g.ui.toastMsg("The save is gone. The goose remembers.");
      } },
      { label: "Export save (JSON)", action: () => exportText(g, JSON.stringify(g.world), "honk-save.json") },
      { label: "Import save (JSON)", action: () => importText(g, (t) => {
        try {
          const w = migrate(JSON.parse(t));
          saveWorld(w);
          installWorld(g, w);
          g.swapPlace(g.town, w.player.x, w.player.z);
          g.ui.popAll();
        } catch {
          g.ui.toastMsg("That is not a save.");
        }
      }) },
      { label: "Export recording", action: () => exportText(g, JSON.stringify(g.engine.recording()), "honk-recording.json") },
      { label: "Replay this session", action: () => {
        const rec = g.engine.recording();
        g.ui.popAll();
        g.engine.replay(rec, () => g.engine.loadGame(new g.constructor(g.opts))).catch(() => g.ui.toastMsg("That replay did not take."));
      } }
    ]);
    balancePage = (g) => {
      const items = TUNING.map((t) => ({
        label: t.label,
        value: () => {
          const v2 = tuning[t.id];
          return Number.isInteger(t.step) ? v2 : v2.toFixed(2);
        },
        left: () => {
          setTuning(t.id, tuning[t.id] - t.step);
          g.sound("uiTick");
          g.events.emit("tuningChanged", { id: t.id });
        },
        right: () => {
          setTuning(t.id, tuning[t.id] + t.step);
          g.sound("uiTick");
          g.events.emit("tuningChanged", { id: t.id });
        },
        action: () => {
          resetTuning(t.id);
          g.sound("uiCancel");
        }
      }));
      items.push({ label: "Reset All", action: () => {
        resetTuning();
        g.sound("uiConfirm");
        g.ui.toastMsg("All sliders back to their defaults.");
      } });
      const m = pageMenu(g, "Balance", items);
      m.promptList = [["confirm", "Reset this one"], ["back", "Back"]];
      return m;
    };
  }
});

// src/net/arena.js
var BoxGeometry11, Group15, Mesh13, PlaneGeometry4, Vector39, W3, D3, ROUND_MS, SLOTS2, COLORS, SEAT_SLOT, VALUE, ICON, NAME, ORDERS, AWARDS, LAYOUT, isWater, Q, BazaarGame, clean2;
var init_arena = __esm({
  "src/net/arena.js"() {
    init_engine();
    init_models();
    init_textures();
    init_critter();
    init_rig();
    init_sfx();
    init_composer();
    init_draw();
    init_icons();
    init_glyphs();
    init_input();
    init_transport();
    init_protocol();
    ({ BoxGeometry: BoxGeometry11, Group: Group15, Mesh: Mesh13, PlaneGeometry: PlaneGeometry4, Vector3: Vector39 } = engine_exports.THREE);
    W3 = 32;
    D3 = 24;
    ROUND_MS = 5 * 60 * 1e3;
    SLOTS2 = 5;
    COLORS = ["#e8443a", "#3b82f6", "#22c55e", "#f5b700"];
    SEAT_SLOT = ["red", "blue", "green", "sand"];
    VALUE = { pear: 100, goldenPear: 600, fossil: 400, fish: 300, goldenFish: 1500, butterfly: 200, flower: 150 };
    ICON = { pear: ["pear", { o: "sand", x: "plum" }], goldenPear: ["pear", { o: "orange", x: "red" }], fossil: ["bone", { o: "sand", x: "orange" }], fish: ["fish1", { o: "sky", x: "navy" }], goldenFish: ["fish3", { o: "orange", x: "sand" }], butterfly: ["butterfly", { o: "white", x: "ink" }], flower: ["flowerIcon", { o: "red", x: "sand" }] };
    NAME = { pear: "pear", goldenPear: "golden pear", fossil: "fossil", fish: "fish", goldenFish: "golden fish", butterfly: "butterfly", flower: "flower" };
    ORDERS = [["Dorrit", "pear"], ["Dorrit", "fish"], ["Tavi", "butterfly"], ["Tavi", "flower"], ["Rocco", "fish"], ["Rocco", "fossil"], ["Nib", "butterfly"], ["Yolanda", "flower"], ["Ozzie", "fossil"], ["Bartleby", "pear"]];
    AWARDS = [["Most Fish Apologised To", "fish"], ["Best Bean Counter", "banked"], ["Dirtiest Hands", "digs"], ["Most Trees Upset", "shakes"], ["Friend of the Mayor", "mayor"], ["Fastest Pockets", "sells"]];
    LAYOUT = {
      trees: [[5, 4], [8, 3], [11, 4], [4, 7], [7, 7], [10, 7]],
      cracks: [[15, 4], [20, 3], [18, 7], [24, 5], [13, 19], [17, 21], [5, 20], [27, 20]],
      butterflies: [[22, 15], [24, 17], [26, 14], [28, 17], [23, 19]],
      flowers: [[21, 14], [23, 14], [25, 15], [27, 15], [22, 17], [25, 18], [27, 18], [29, 16]],
      stall: [16, 12],
      pond: { x0: 2, z0: 13, x1: 11, z1: 18 }
    };
    isWater = (x, z) => {
      const p = LAYOUT.pond;
      return x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1;
    };
    Q = (v2) => Math.round(v2 * 100) / 100;
    BazaarGame = class {
      name = "The Bean Bazaar";
      constructor(hub, info, opts = {}) {
        this.hub = hub;
        this.info = info;
        this.opts = opts;
        this.net = new HubTransport(hub);
        this.me = hub.server ? null : hub.me;
        this.isHost = hub.isHost;
        this.ended = false;
        this.spectator = !hub.server && !!opts.touchOnly;
        this.avatars = /* @__PURE__ */ new Map();
        this.remote = /* @__PURE__ */ new Map();
        this.objects = [];
        this.byId = /* @__PURE__ */ new Map();
        this.state = /* @__PURE__ */ new Map();
        this.scores = /* @__PURE__ */ new Map();
        this.orders = [];
        this.cardData = null;
        this.toast = null;
        this.bubbles = [];
        this.sendT = 0;
        this.snapT = 0;
        this.target = new Vector39(16, 1, 12);
        this.pockets = [];
        this.banked = 0;
        this.fishing = null;
        this.spot = null;
        this.playerPos = { x: 16, z: 14, facing: 0 };
        this.lastGold = -1;
        this.inp = new GameInput();
      }
      async setup(ctx) {
        this.ctx = ctx;
        ctx.input.gamepadButtons = PAD_BUTTONS;
        installTextures();
        for (const [n, d] of Object.entries(SFX_DEFS)) ctx.audio.register(n, d);
        if (!localStorage.getItem("pixel-engine:audio")) ctx.audio.setVolume("music", 0.1);
        ctx.camera.teleport(this.target);
        (0, engine_exports.applySky)(ctx.engine, (0, engine_exports.skyAt)(11));
        this.buildArena();
        for (const p of this.hub.players) this.addAvatar(p);
        this.net.on("message", (d, from2) => this.onMessage(d, from2));
        this.net.on("leave", (id) => this.onLeave(id));
        this.hub.on("card", (c2) => {
          this.cardData = c2;
        });
        this.hub.on("start", () => {
          this.cardData = null;
          this.started = true;
          ctx.audio.playMusic(tune("round"), "round");
          ctx.audio.play("bellNote");
        });
        this.hub.on("time-up", () => {
          if (this.isHost) this.finish();
        });
        this.hub.on("end", () => this.onEnd());
        if (this.isHost) this.hostInit();
        this.keydown = (e) => {
          if (e.key === "Enter" && !this.started) this.answer("ready");
          if (e.key === "m" && !this.started) this.answer("more");
        };
        window.addEventListener("keydown", this.keydown);
        ctx.engine.setCamera({ preset: "iso", yaw: 45, pitch: 35, zoom: this.hub.server ? 0.9 : 1.35, minZoom: 0.5, maxZoom: 2 }, { syncUrl: false });
        this.hub.ready();
      }
      dispose() {
        window.removeEventListener("keydown", this.keydown);
      }
      answer(a) {
        if (!this.ended && !this.started) {
          this.hub.answer(a);
          this.ctx.audio.play("uiConfirm");
        }
      }
      // ---- World -----------------------------------------------------------------------------------------
      buildArena() {
        const { scene } = this.ctx;
        const g = new PlaneGeometry4(W3 + 40, D3 + 40).rotateX(-Math.PI / 2);
        const uv = g.attributes.uv.array;
        for (let i = 0; i < uv.length; i += 2) {
          uv[i] *= (W3 + 40) / 4;
          uv[i + 1] *= (D3 + 40) / 4;
        }
        const ground = new Mesh13(g, (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: (0, engine_exports.textureMap)("lawn-summer") }));
        ground.position.set(W3 / 2, 0, D3 / 2);
        ground.receiveShadow = true;
        scene.add(ground);
        const p = LAYOUT.pond;
        const water = new engine_exports.WaterSurface({ size: [p.x1 - p.x0 + 1, p.z1 - p.z0 + 1], at: [(p.x0 + p.x1 + 1) / 2, 0.04, (p.z0 + p.z1 + 1) / 2], waves: engine_exports.WAVES_CALM, deep: engine_exports.PALETTE.blue, shallow: engine_exports.PALETTE.sky, foam: engine_exports.PALETTE.white, foamAt: 0.3 });
        scene.add(water);
        this.water = water;
        const rim = (w, d, x, z) => {
          const m = new Mesh13(new BoxGeometry11(w, 0.1, d), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.sand));
          m.position.set(x, 0.05, z);
          scene.add(m);
        };
        rim(p.x1 - p.x0 + 2, 0.3, (p.x0 + p.x1 + 1) / 2, p.z0 - 0.1);
        rim(p.x1 - p.x0 + 2, 0.3, (p.x0 + p.x1 + 1) / 2, p.z1 + 1.1);
        rim(0.3, p.z1 - p.z0 + 2, p.x0 - 0.1, (p.z0 + p.z1 + 1) / 2);
        rim(0.3, p.z1 - p.z0 + 2, p.x1 + 1.1, (p.z0 + p.z1 + 1) / 2);
        const put = (id, x, z, opts = {}, ry = 0) => {
          const o = (0, engine_exports.buildModel)(id, { catalog: MODELS, ...opts }).object;
          o.position.set(x, 0, z);
          o.rotation.y = ry;
          o.traverse((m) => {
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });
          scene.add(o);
          return o;
        };
        for (let x = -2; x < W3 + 2; x += 2.4) {
          put("tree-pine", x, -1.8, { palette: { leaf: "teal", leaf2: "green" } });
          put("tree-pine", x, D3 + 1.8, { palette: { leaf: "teal", leaf2: "green" } });
        }
        for (let z = 0; z < D3; z += 2.4) {
          put("tree-pine", -1.8, z, { palette: { leaf: "teal", leaf2: "green" } });
          put("tree-pine", W3 + 1.8, z, { palette: { leaf: "teal", leaf2: "green" } });
        }
        const [sx, sz] = LAYOUT.stall;
        put("market-stall", sx, sz - 0.4, { palette: { cloth: "red" } });
        const counter2 = { id: "stall", kind: "stall", x: sx, z: sz + 0.7 };
        this.addObject(counter2);
        this.stallAt = counter2;
        this.orderFolk = [["dorrit", sx - 3, sz + 0.4], ["tavi", sx + 3, sz + 0.4], ["rocco", sx - 3.8, sz + 2], ["yolanda", sx + 3.8, sz + 2]].map(([id, x, z]) => {
          const a = new Actor(CRITTER_DEFS[id], { name: id, seed: x * 3 });
          a.x = x;
          a.z = z;
          a.facing = 0.2;
          a.addTo(scene);
          a.play("Hum", 0);
          return a;
        });
        LAYOUT.trees.forEach(([x, z], i) => {
          const o = put("tree-pear", x, z, { palette: { leaf: "green", leaf2: "lime" } });
          this.addObject({ id: `tree${i}`, kind: "tree", x, z, fruit: 3, mesh: o, fruitMesh: o.getObjectByName("fruit"), golden: false, regrow: 0 });
        });
        LAYOUT.cracks.forEach(([x, z], i) => {
          const o = put("crack-mark", x, z);
          this.addObject({ id: `crack${i}`, kind: "crack", x, z, up: true, mesh: o, regrow: 0 });
        });
        LAYOUT.flowers.forEach(([x, z], i) => {
          const o = put("flower", x, z, { params: { species: i % 4 }, palette: { petal: ["red", "sand", "white", "sky", "plum"][i % 5] } });
          this.addObject({ id: `flower${i}`, kind: "flower", x, z, up: true, mesh: o, regrow: 0 });
        });
        LAYOUT.butterflies.forEach(([x, z], i) => {
          const o = (0, engine_exports.buildModel)("winged", { catalog: MODELS, params: { size: 0.42 }, palette: { wing: ["white", "orange", "sky"][i % 3], spot: "ink", body: "ink" } }).object;
          o.position.set(x, 1, z);
          (0, engine_exports.setLookLayer)(o, "actors");
          scene.add(o);
          this.addObject({ id: `fly${i}`, kind: "butterfly", x, z, cx: x, cz: z, up: true, mesh: o, regrow: 0, t: i * 1.7 });
        });
        this.fishSpots = [];
        for (let x = p.x0 + 1; x <= p.x1; x += 3) {
          this.fishSpots.push([x, p.z0 - 1], [x, p.z1 + 2]);
        }
        this.fishSpots.push([p.x1 + 2, p.z0 + 2], [p.x1 + 2, p.z1 - 1]);
        this.fishSpots.forEach(([x, z], i) => this.addObject({ id: `spot${i}`, kind: "fishspot", x, z }));
        this.mayor = new Actor(CRITTER_DEFS.trundle, { name: "trundle", seed: 3 });
        this.mayor.addTo(scene);
        this.mayor.x = 12;
        this.mayor.z = 10;
        this.mayor.facing = Math.PI / 2;
        this.mayor.play("MayorSlide", 0);
        this.addObject({ id: "mayor", kind: "mayor", x: 12, z: 10, ref: this.mayor });
      }
      addObject(o) {
        this.objects.push(o);
        this.byId.set(o.id, o);
      }
      addAvatar(p) {
        const seat = p.id % 4;
        const a = new Actor(avatarDef({ shirt: SEAT_SLOT[seat], trim: "white", hair: p.id % 8, hairColor: ["plum", "ink", "orange", "navy"][seat], eyes: p.id % 6 }, `round-avatar-${p.id}`), { name: p.name, seed: p.id + 1 });
        const hex = parseInt(COLORS[seat].slice(1), 16);
        a.swapMaterial(engine_exports.PALETTE[SEAT_SLOT[seat]], (0, engine_exports.toonMaterial)(hex));
        a.x = 12 + seat * 2.6;
        a.z = 15;
        a.facing = 0;
        a.addTo(this.ctx.scene);
        this.avatars.set(p.id, { a, info: p, track: new RemoteTrack() });
        if (p.id === this.me) {
          this.playerPos = { x: a.x, z: a.z, facing: 0 };
        }
        if (this.isHost) this.state.set(p.id, { pockets: [], banked: 0, fish: 0, digs: 0, shakes: 0, sells: 0, mayor: 0, mayorTip: false, x: a.x, z: a.z, f: 0, a: 0, fishing: null });
        this.scores.set(p.id, { banked: 0, unbanked: 0 });
      }
      removeAvatar(id) {
        const e = this.avatars.get(id);
        if (e) {
          e.a.remove();
          this.avatars.delete(id);
        }
        this.scores.delete(id);
        this.state.delete(id);
      }
      // ---- Host ------------------------------------------------------------------------------------------
      hostInit() {
        this.orderRng = this.hub.rng("orders");
        this.bellRng = this.hub.rng("golden");
        this.newOrders();
        this.goldenAt = [6e4, 13e4, 2e5, 27e4];
      }
      newOrders() {
        const r = this.orderRng;
        this.orders = [];
        while (this.orders.length < 2) {
          const o = ORDERS[Math.floor(r() * ORDERS.length)];
          if (!this.orders.some((x) => x[1] === o[1])) this.orders.push(o);
        }
        this.ev({ k: "orders", list: this.orders });
        this.nextOrders = (this.hub.time() > 0 ? this.hub.time() : 0) + 45e3;
      }
      ev(data) {
        this.net.send({ t: "ev", ...data }, { reliable: true });
        this.applyEv(data);
      }
      hostStep(dt) {
        const t = this.hub.time();
        if (t < 0) return;
        const limit = this.hub.limitMs ?? ROUND_MS;
        if (t >= Math.min(ROUND_MS, limit - 5e3) && !this.finished) {
          this.finish();
          return;
        }
        if (t >= this.nextOrders) this.newOrders();
        if (this.goldenAt.length && t >= this.goldenAt[0]) {
          this.goldenAt.shift();
          this.goldenMoment();
        }
        for (const o of this.objects) {
          if (o.regrow && t >= o.regrow) {
            o.regrow = 0;
            if (o.kind === "tree") {
              o.fruit = 3;
              o.golden = false;
              this.ev({ k: "obj", id: o.id, fruit: 3, golden: false });
            } else {
              o.up = true;
              this.ev({ k: "obj", id: o.id, up: true });
            }
          }
        }
        for (const [id, s] of this.state) {
          const f = s.fishing;
          if (!f) continue;
          if (f.state === "wait" && t >= f.biteAt) {
            f.state = "bite";
            f.until = t + 900;
            this.ev({ k: "bite", p: id });
          } else if (f.state === "bite" && t >= f.until) {
            s.fishing = null;
            this.ev({ k: "fishMiss", p: id });
          }
        }
        this.mayorX = 10 + t / ROUND_MS * 16;
        this.snapT -= dt;
        if (this.snapT <= 0) {
          this.snapT = SEND_RATE;
          const list = [];
          for (const [id, s] of this.state) list.push(packAvatar({ id, x: s.x, z: s.z, facing: s.f, action: s.a }));
          const score = [];
          for (const [id, s] of this.state) score.push([id, s.banked, this.pocketValue(s.pockets)]);
          this.net.send({ t: "snap", a: list, m: Q(this.mayorX), s: score }, { reliable: false });
          this.applySnap({ a: list, m: this.mayorX, s: score }, true);
        }
      }
      pocketValue(p) {
        return p.reduce((a, it) => a + VALUE[it], 0);
      }
      goldenMoment() {
        const r = this.bellRng;
        if (r() < 0.5) {
          const trees = this.objects.filter((o) => o.kind === "tree");
          const t = trees[Math.floor(r() * trees.length)];
          t.fruit = 3;
          t.golden = true;
          t.regrow = 0;
          this.ev({ k: "obj", id: t.id, fruit: 3, golden: true });
          this.ev({ k: "bell", what: "A rich tree in the orchard! Golden pears!" });
        } else {
          this.goldenFishUntil = this.hub.time() + 3e4;
          this.ev({ k: "bell", what: "A golden fish in the pond! Quick!" });
        }
      }
      handleDo(pid, msg) {
        const s = this.state.get(pid);
        if (!s || this.finished) return;
        const t = this.hub.time();
        if (t < 0) return;
        const o = this.byId.get(msg.o);
        if (!o) return;
        const reach = Math.hypot(o.x - s.x, o.z - s.z);
        const full3 = s.pockets.length >= SLOTS2;
        switch (o.kind) {
          case "tree":
            if (reach > 2.2 || o.fruit <= 0) return;
            if (full3) {
              this.ev({ k: "full", p: pid });
              return;
            }
            {
              const item = o.golden ? "goldenPear" : "pear";
              o.fruit -= 1;
              s.pockets.push(item);
              s.shakes++;
              this.ev({ k: "obj", id: o.id, fruit: o.fruit, golden: o.golden });
              this.ev({ k: "got", p: pid, item, from: o.id });
              if (o.fruit <= 0) {
                o.regrow = t + 2e4;
              }
            }
            break;
          case "crack":
            if (reach > 1.8 || !o.up) return;
            if (full3) {
              this.ev({ k: "full", p: pid });
              return;
            }
            o.up = false;
            o.regrow = t + 35e3;
            s.pockets.push("fossil");
            s.digs++;
            this.ev({ k: "obj", id: o.id, up: false });
            this.ev({ k: "got", p: pid, item: "fossil", from: o.id });
            break;
          case "flower":
            if (reach > 1.6 || !o.up) return;
            if (full3) {
              this.ev({ k: "full", p: pid });
              return;
            }
            o.up = false;
            o.regrow = t + 25e3;
            s.pockets.push("flower");
            this.ev({ k: "obj", id: o.id, up: false });
            this.ev({ k: "got", p: pid, item: "flower", from: o.id });
            break;
          case "butterfly":
            if (reach > 3 || !o.up) return;
            if (full3) {
              this.ev({ k: "full", p: pid });
              return;
            }
            o.up = false;
            o.regrow = t + 2e4;
            s.pockets.push("butterfly");
            this.ev({ k: "obj", id: o.id, up: false });
            this.ev({ k: "got", p: pid, item: "butterfly", from: o.id });
            break;
          case "fishspot":
            if (reach > 2) return;
            if (s.fishing?.state === "bite") {
              const gold = this.goldenFishUntil && t < this.goldenFishUntil;
              if (full3) {
                this.ev({ k: "full", p: pid });
                s.fishing = null;
                return;
              }
              const item = gold ? "goldenFish" : "fish";
              if (gold) this.goldenFishUntil = 0;
              s.pockets.push(item);
              s.fish++;
              s.fishing = null;
              this.ev({ k: "got", p: pid, item, from: o.id });
            } else if (s.fishing) {
              s.fishing = null;
              this.ev({ k: "fishMiss", p: pid });
            } else {
              const r = this.hub.rng(`bite:${pid}:${Math.floor(t / 1e3)}`);
              s.fishing = { state: "wait", biteAt: t + 1500 + r() * 2500, at: o.id };
              this.ev({ k: "cast", p: pid, at: o.id });
            }
            break;
          case "stall": {
            if (reach > 2.6 || !s.pockets.length) return;
            let total = 0;
            for (const it of s.pockets) {
              const doubled = this.orders.some((ord) => ord[1] === it || ord[1] === "pear" && it === "goldenPear" || ord[1] === "fish" && it === "goldenFish");
              total += VALUE[it] * (doubled ? 2 : 1);
            }
            s.banked += total;
            s.pockets = [];
            s.sells++;
            this.ev({ k: "sold", p: pid, total, banked: s.banked });
            break;
          }
          case "mayor":
            if (reach > 2 || s.mayorTip) return;
            s.mayorTip = true;
            s.banked += 150;
            s.mayor++;
            this.ev({ k: "mayor", p: pid, banked: s.banked });
            break;
          default:
            break;
        }
      }
      finish() {
        if (this.finished) return;
        this.finished = true;
        const present = this.hub.players.filter((p) => this.state.has(p.id));
        const score = (id) => {
          const s = this.state.get(id);
          return Math.round(s.banked + this.pocketValue(s.pockets) / 2);
        };
        const sorted = present.map((p) => [p.id, score(p.id)]).sort((a, b) => b[1] - a[1]);
        const standings = [];
        for (const [id, sc] of sorted) {
          const last = standings[standings.length - 1];
          if (last && score(last[0]) === sc) last.push(id);
          else standings.push([id]);
        }
        const scores = {};
        const stats = {};
        const awards = [];
        for (const [id, sc] of sorted) {
          scores[id] = sc;
          const s = this.state.get(id);
          stats[id] = { Banked: s.banked, Fish: s.fish, Digs: s.digs, Shakes: s.shakes };
        }
        const used = /* @__PURE__ */ new Set();
        for (const [title, field] of AWARDS) {
          let best = null, bv = 0;
          for (const [id] of sorted) {
            const v2 = field === "banked" ? this.state.get(id).banked : this.state.get(id)[field];
            if (v2 > bv && !used.has(id)) {
              bv = v2;
              best = id;
            }
          }
          if (best !== null) {
            used.add(best);
            awards.push({ id: best, title, detail: `${bv}` });
          }
        }
        this.ctx.audio.play("bellNote");
        this.hub.finish({ standings, scores, stats, awards });
      }
      // ---- Messages --------------------------------------------------------------------------------------
      onMessage(d, from2) {
        if (this.ended || !d) return;
        switch (d.t) {
          case "me":
            if (this.isHost) {
              const s = this.state.get(from2);
              if (s) {
                s.x = d.x;
                s.z = d.z;
                s.f = d.f;
                s.a = d.a;
              }
            }
            break;
          case "do":
            if (this.isHost) this.handleDo(from2, d);
            break;
          case "snap":
            this.applySnap(d, false);
            break;
          case "ev":
            this.applyEv(d);
            break;
          default:
            break;
        }
      }
      applySnap(d, own) {
        const now = this.ctx.time * 1e3;
        for (const r of d.a) {
          const u = unpackAvatar(r);
          const e = this.avatars.get(u.id);
          if (e && u.id !== this.me) e.track.push(now, u);
        }
        if (typeof d.m === "number") this.mayorX = d.m;
        for (const [id, banked, un] of d.s ?? []) {
          const sc = this.scores.get(id);
          if (sc) {
            sc.banked = banked;
            sc.unbanked = un;
          }
        }
      }
      applyEv(d) {
        const { audio, particles } = this.ctx;
        const mine = d.p === this.me;
        switch (d.k) {
          case "orders":
            this.orders = d.list;
            break;
          case "obj": {
            const o = this.byId.get(d.id);
            if (!o) break;
            if ("fruit" in d) {
              o.fruit = d.fruit;
              o.golden = d.golden;
              if (o.fruitMesh) o.fruitMesh.visible = d.fruit > 0;
            }
            if ("up" in d) {
              o.up = d.up;
              if (o.mesh) o.mesh.visible = d.up;
            }
            break;
          }
          case "got": {
            const o = this.byId.get(d.from);
            if (o) particles.burst("sparkle", [o.x, 1, o.z], { count: 8 });
            if (mine) {
              this.pockets.push(d.item);
              audio.play(d.item.includes("olden") ? "reveal" : "pickUp");
              this.say(`A ${NAME[d.item]}! ${VALUE[d.item]} beans at the stall.`);
            }
            break;
          }
          case "full":
            if (mine) {
              audio.play("uiError");
              this.say("Your pockets are full. Sell at the stall.");
            }
            break;
          case "sold":
            if (mine) {
              this.pockets = [];
              this.banked = d.banked;
              audio.play("beanLots");
              this.say(`Sold for ${d.total} beans.`);
            }
            break;
          case "mayor":
            if (mine) {
              this.banked = d.banked;
              audio.play("bean");
              this.say("The Mayor tips his sash. Plus 150.");
            }
            break;
          case "bell":
            this.bellMsg = d.what;
            this.bellT = 6;
            audio.play("bellNote");
            audio.play("bellNote", { pitch: 4 });
            break;
          case "cast":
            if (mine) {
              audio.play("cast");
              this.fishing = "wait";
              this.say("Wait for the plunge…");
            }
            break;
          case "bite":
            if (mine) {
              audio.play("bite");
              this.fishing = "bite";
              this.say("NOW!");
            }
            break;
          case "fishMiss":
            if (mine) {
              this.fishing = null;
              this.say("It got away.");
            }
            break;
          default:
            break;
        }
      }
      say(text) {
        this.toast = text;
        this.toastT = 2.4;
      }
      onLeave(id) {
        this.removeAvatar(id);
      }
      onEnd() {
        this.ended = true;
        const a = this.ctx.audio;
        a.stopMusic();
        a.stopLoops();
      }
      // ---- Frames ----------------------------------------------------------------------------------------
      fixedUpdate(ctx, dt) {
        if (this.ended) return;
        if (this.isHost) this.hostStep(dt);
        const me = this.avatars.get(this.me);
        if (!me || this.spectator || this.hub.time() < 0) return;
        const axis = ctx.input.moveAxis();
        const mag = Math.min(1, Math.hypot(axis.x, axis.y));
        if (mag > 0.05) {
          const { right, forward } = ctx.camera.groundBasis();
          let dx = right.x * axis.x + forward.x * axis.y, dz = right.z * axis.x + forward.z * axis.y;
          const len = Math.hypot(dx, dz) || 1;
          dx /= len;
          dz /= len;
          const sp = 4.6 * mag;
          const nx = this.playerPos.x + dx * sp * dt, nz = this.playerPos.z + dz * sp * dt;
          if (!this.solid(nx, this.playerPos.z)) this.playerPos.x = nx;
          if (!this.solid(this.playerPos.x, nz)) this.playerPos.z = nz;
          this.playerPos.facing = Math.atan2(dx, dz);
          this.moving = true;
        } else this.moving = false;
        if (this.isHost) {
          const s = this.state.get(this.me);
          if (s) {
            s.x = this.playerPos.x;
            s.z = this.playerPos.z;
            s.f = this.playerPos.facing;
            s.a = this.moving ? 1 : 0;
          }
        } else {
          this.sendT -= dt;
          if (this.sendT <= 0) {
            this.sendT = SEND_RATE;
            this.net.send({ t: "me", x: Q(this.playerPos.x), z: Q(this.playerPos.z), f: Q(this.playerPos.facing), a: this.moving ? 1 : 0 }, { reliable: false });
          }
        }
      }
      solid(x, z) {
        if (x < 0.3 || z < 0.3 || x > W3 - 0.3 || z > D3 - 0.3) return true;
        if (isWater(x, z)) return true;
        const [sx, sz] = LAYOUT.stall;
        if (Math.abs(x - sx) < 1.9 && Math.abs(z - (sz - 0.4)) < 0.7) return true;
        for (const t of LAYOUT.trees) if (Math.hypot(t[0] - x, t[1] - z) < 0.6) return true;
        return false;
      }
      use(o) {
        if (!o) return;
        this.ctx.audio.play("uiTick");
        const a = this.avatars.get(this.me)?.a;
        if (a) {
          const clip2 = { tree: "ShakeTree", crack: "Dig", flower: "PickUp", butterfly: "NetSweep", fishspot: "Cast", stall: "Give", mayor: "Bow" }[o.kind];
          a.play(clip2, 0.06, { once: true });
          this.actionT = 0.45;
        }
        if (this.isHost) this.handleDo(this.me, { o: o.id });
        else this.net.send({ t: "do", o: o.id }, { reliable: true });
      }
      contextTarget() {
        const p = this.playerPos;
        let best = null, bd = 1e9;
        for (const o of this.objects) {
          const reach = { tree: 2, crack: 1.6, flower: 1.4, butterfly: 2.8, fishspot: 1.6, stall: 2.4, mayor: 1.8 }[o.kind];
          const ox = o.kind === "mayor" ? this.mayor.x : o.x, oz = o.z;
          const d = Math.hypot(ox - p.x, oz - p.z);
          if (d > reach) continue;
          if (o.kind === "tree" && o.fruit <= 0) continue;
          if ((o.kind === "crack" || o.kind === "flower" || o.kind === "butterfly") && !o.up) continue;
          if (o.kind === "stall" && !this.pockets.length) continue;
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
        return best;
      }
      update(ctx, dt) {
        this.inp.begin(ctx, dt);
        if (this.ended) {
          this.drawHud(ctx);
          return;
        }
        const t = ctx.time;
        this.water.update(t);
        const inp = ctx.input;
        const hubTime = this.hub.time();
        const createHeld = inp.isDown("PadCreate");
        if (!this.started) {
          if (inp.wasPressed("PadCross")) this.answer("ready");
          if (inp.wasPressed("PadTriangle", "KeyM")) this.answer("more");
          const m = inp.pointer;
          if (inp.wasPressed("MouseLeft")) {
            const mx = (m.x + 1) * 240, my = (1 - m.y) * 135;
            if (inRect({ x: mx, y: my }, 150, 220, 80, 24)) this.answer("ready");
            if (inRect({ x: mx, y: my }, 250, 220, 80, 24)) this.answer("more");
          }
        } else if (hubTime >= 0 && !this.spectator && this.me !== null) {
          this.ctxTarget = this.contextTarget();
          if (inp.wasPressed("PadCross", "KeyE", "Enter", "Space") && this.ctxTarget) this.use(this.ctxTarget);
          if (createHeld) {
          }
        }
        const now = t * 1e3;
        for (const [id, e] of this.avatars) {
          const a = e.a;
          if (id === this.me) {
            a.x = this.playerPos.x;
            a.z = this.playerPos.z;
            a.turnTo = this.playerPos.facing;
            if (this.actionT > 0) this.actionT -= dt;
            else a.play(this.moving ? "Jog" : this.fishing ? "Reel" : "Idle", 0.12);
          } else {
            const tr = e.track.at(now);
            if (tr.seen) {
              a.x = tr.x;
              a.z = tr.z;
              a.turnTo = tr.facing;
              a.play(tr.action ? "Jog" : "Idle", 0.15);
            }
          }
          a.update(dt);
        }
        for (const a of this.orderFolk) a.update(dt);
        if (typeof this.mayorX === "number") {
          this.mayor.x = this.mayorX;
          this.mayor.update(dt);
          const mo = this.byId.get("mayor");
          mo.x = this.mayorX;
        }
        for (const o of this.objects) {
          if (o.kind !== "butterfly" || !o.mesh?.visible) continue;
          o.t += dt;
          o.x = o.cx + Math.sin(o.t * 0.8) * 1.4;
          o.z = o.cz + Math.cos(o.t * 0.6) * 1.2;
          o.mesh.position.set(o.x, 1 + Math.abs(Math.sin(o.t * 2.1)) * 0.5, o.z);
          const wl = o.mesh.getObjectByName("WingL"), wr = o.mesh.getObjectByName("WingR");
          if (wl) wl.rotation.z = Math.sin(o.t * 24) * 0.9;
          if (wr) wr.rotation.z = -Math.sin(o.t * 24) * 0.9;
        }
        if (this.toastT > 0) this.toastT -= dt;
        if (this.bellT > 0) this.bellT -= dt;
        this.drawHud(ctx);
      }
      cameraTarget() {
        if (this.me === null || this.spectator) {
          const t = this.ctx?.time ?? 0;
          return this.target.set(16 + Math.sin(t * 0.1) * 4, 1, 12 + Math.cos(t * 0.08) * 3);
        }
        return this.target.set(this.playerPos.x, 1, this.playerPos.z);
      }
      status() {
        return `round t=${Math.round(this.hub.time())} me=${this.me}`;
      }
      // ---- HUD ------------------------------------------------------------------------------------------
      drawHud(ctx) {
        const hud = ctx.hud;
        hud.clear();
        if (!this.started) {
          this.drawCard(hud);
          return;
        }
        const t = this.hub.time();
        if (t < 0) drawText(hud, 240, 110, String(Math.ceil(-t / 1e3)), { align: "center", color: "sand", scale: 6, shadow: "ink" });
        this.drawScores(hud);
        const left = Math.max(0, Math.min(ROUND_MS, (this.hub.limitMs ?? ROUND_MS) - 5e3) - Math.max(0, t));
        const clock = `${Math.floor(left / 6e4)}:${String(Math.floor(left / 1e3) % 60).padStart(2, "0")}`;
        panel(hud, 216, 8, 48, 18, { fill: "white", trim: "sand" });
        drawText(hud, 240, 14, clock, { align: "center", color: "ink" });
        const orderText = this.orders.map((o) => `${o[0]} wants a ${NAME[o[1]]}: double beans`).join("   ");
        if (orderText) {
          const w = textWidth(orderText) + 14;
          panel(hud, 240 - w / 2, 30, w, 16, { fill: "navy", trim: "sky" });
          drawText(hud, 240, 35, orderText, { align: "center", color: "white" });
        }
        if (this.bellT > 0) {
          const w = textWidth(this.bellMsg) + 14;
          panel(hud, 240 - w / 2, 50, w, 16, { fill: "sand", trim: "orange" });
          drawText(hud, 240, 55, this.bellMsg, { align: "center", color: "ink" });
        }
        for (const [id, e] of this.avatars) {
          const s = this.projectTo(ctx, e.a.x, 2.1, e.a.z);
          if (s) drawText(hud, s.x, s.y - 8, clean2(e.info.name), { align: "center", color: "white", shadow: "ink" });
        }
        if (this.me !== null && !this.spectator) {
          for (let i = 0; i < SLOTS2; i++) {
            const x = 240 - SLOTS2 * 24 / 2 + i * 24, y = 270 - 34;
            panel(hud, x, y, 22, 22, { fill: "white", trim: "mist" });
            const it = this.pockets[i];
            if (it) drawIcon(hud, x + 3, y + 3, ICON[it][0], ICON[it][1]);
          }
          const c2 = this.ctxTarget;
          if (c2 && t >= 0) {
            const verb = { tree: "Shake", crack: "Dig", flower: "Pick", butterfly: "Swing", fishspot: this.fishing === "bite" ? "REEL!" : this.fishing ? "Reel in" : "Cast", stall: "Sell", mayor: "Bump the Mayor" }[c2.kind];
            const w = textWidth(verb) + 30;
            panel(hud, 480 - 12 - w, 270 - 26, w, 17, { fill: "night", trim: "night" });
            const gw = drawPromptGlyph(hud, 480 - 12 - w + 5, 270 - 21, "confirm", this.inp.device, false, false);
            drawText(hud, 480 - 12 - w + 8 + gw, 270 - 21, verb, { color: "white" });
          }
          if (this.toastT > 0) {
            const w = textWidth(this.toast) + 14;
            panel(hud, 240 - w / 2, 270 - 56, w, 16, { fill: "white", trim: "sand" });
            drawText(hud, 240, 270 - 51, this.toast, { align: "center", color: "ink" });
          }
        }
        if (this.spectator) {
          panel(hud, 110, 240, 260, 20, { fill: "navy", trim: "sky" });
          drawText(hud, 240, 246, "Controller or keyboard required", { align: "center", color: "white" });
        }
      }
      drawScores(hud) {
        let i = 0;
        for (const p of this.hub.players) {
          const sc = this.scores.get(p.id);
          if (!sc) continue;
          const x = 8, y = 8 + i * 15;
          const seat = p.id % 4;
          hud.rect(x, y, 90, 13, "ink");
          hud.rect(x + 1, y + 1, 5, 11, parseInt(COLORS[seat].slice(1), 16));
          drawText(hud, x + 9, y + 3, clean2(p.name).slice(0, 7), { color: "white" });
          drawText(hud, x + 88, y + 3, `${Math.round(sc.banked + sc.unbanked / 2)}`, { color: "sand", align: "right" });
          i++;
        }
      }
      drawCard(hud) {
        const c2 = this.cardData;
        hud.rect(0, 0, 480, 270, "ink");
        panel(hud, 40, 16, 400, 238, { fill: "white", trim: "sand" });
        drawText(hud, 240, 24, "The Bean Bazaar", { align: "center", color: "ink", scale: 3 });
        drawText(hud, 240, 52, "Bank the most beans before the last bell.", { align: "center", color: "plum" });
        drawText(hud, 240, 66, "Unbanked pockets count half. Sell at the stall.", { align: "center", color: "slate" });
        this.hub.players.forEach((p, i) => {
          const y = 84 + i * 18;
          hud.rect(120, y, 240, 16, "night");
          hud.rect(122, y + 2, 12, 12, parseInt(COLORS[p.id % 4].slice(1), 16));
          drawText(hud, 140, y + 5, clean2(p.name), { color: "white" });
          if (c2?.ready?.includes(p.id)) drawText(hud, 354, y + 5, "READY", { color: "lime", align: "right" });
        });
        drawText(hud, 240, 164, "Move: stick or WASD. Do the thing: Cross or E.", { align: "center", color: "ink" });
        drawText(hud, 240, 178, "Shake, dig, cast, reel, swing, sell: one button.", { align: "center", color: "slate" });
        const left = c2?.left != null ? `Starts in ${Math.ceil(c2.left / 1e3)}` : c2?.paused ? "Holding: someone asked for more time" : c2?.starting ? "Starting…" : "";
        drawText(hud, 240, 200, left, { align: "center", color: "plum" });
        panel(hud, 150, 220, 80, 24, { fill: "sand", trim: "orange" });
        drawText(hud, 190, 228, "Ready", { align: "center", color: "ink" });
        panel(hud, 250, 220, 80, 24, { fill: c2?.asked ? "sand" : "white", trim: "mist" });
        drawText(hud, 290, 228, "More time", { align: "center", color: "ink" });
        drawText(hud, 240, 247, "Enter or Cross: Ready.  M or Triangle: More time.", { align: "center", color: "slate" });
        if (this.spectator) drawText(hud, 240, 150, "Controller or keyboard required", { align: "center", color: "red" });
      }
      projectTo(ctx, x, y, z) {
        this.tmpP ??= new Vector39();
        this.tmpP.set(x, y, z).project(ctx.camera.camera);
        if (this.tmpP.z > 1) return null;
        return { x: Math.round((this.tmpP.x + 1) * 240), y: Math.round((1 - this.tmpP.y) * 135) };
      }
    };
    clean2 = (s) => String(s ?? "").slice(0, 14);
  }
});

// src/net/hubStart.js
var hubStart_exports = {};
__export(hubStart_exports, {
  startRound: () => startRound
});
async function startRound(hub, { touchOnly: touchOnly2 }) {
  const info = await hub.connect({ mode: "shared-world", seats: [1, 4], card: true });
  if (!info) return false;
  const game = new BazaarGame(hub, info, { touchOnly: touchOnly2 });
  try {
    await engine_exports.Engine.start(game, (0, engine_exports.withUrlOptions)({
      container: document.getElementById("app"),
      aspect: "fixed",
      quality: "medium",
      camera: { preset: "iso", yaw: 45, pitch: 35, zoom: 1.35, minZoom: 0.5, maxZoom: 2 },
      settings: { button: false, key: false },
      touch: false,
      touchBar: false,
      background: engine_exports.PALETTE.ink
    }));
  } catch (err) {
    hub.fail(`WebGPU is required: ${err?.message ?? err}`);
  }
  return true;
}
var init_hubStart = __esm({
  "src/net/hubStart.js"() {
    init_engine();
    init_arena();
  }
});

// src/main.js
init_engine();

// src/game.js
init_engine();
init_storage();

// src/core/events.js
var Events = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
    this.log = [];
  }
  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(fn);
    return () => {
      const l = this.handlers.get(name);
      l.splice(l.indexOf(fn), 1);
    };
  }
  emit(name, data) {
    this.log.push(name);
    if (this.log.length > 200) this.log.shift();
    for (const fn of this.handlers.get(name) ?? []) fn(data);
  }
};

// src/game.js
init_rng();
init_save();
init_calendar();
init_textures();
init_models();
init_ui();
init_input();
init_dayone();
init_draw();

// src/systems/script.js
var Scripts = class {
  constructor(g) {
    this.g = g;
    this.list = [];
  }
  /** Run a scene. hold: true freezes the player and world time until it ends. */
  run(gen, { hold = true, name = "script" } = {}) {
    const s = { it: gen, wait: 0, hold, name, done: false };
    this.list.push(s);
    this.step(s, 0);
    return s;
  }
  get holding() {
    return this.list.some((s) => s.hold && !s.done && !s.free);
  }
  /** A scene that hands the player control for a while (a minigame in the open). */
  setFree(name, free) {
    for (const s of this.list) if (s.name === name) s.free = free;
  }
  has(name) {
    return this.list.some((s) => s.name === name && !s.done);
  }
  step(s, dt) {
    if (s.wait > 0) {
      s.wait -= dt;
      if (s.wait > 0) return;
    }
    const r = s.it.next();
    if (r.done) {
      s.done = true;
      return;
    }
    if (typeof r.value === "number") s.wait = r.value;
  }
  update(dt) {
    for (const s of this.list.slice()) if (!s.done) this.step(s, dt);
    this.list = this.list.filter((s) => !s.done);
  }
  cancelAll() {
    this.list = [];
  }
};

// src/game.js
init_time();
init_town2();
init_objectsView();

// src/world/occluders.js
init_engine();
var dissolveCache = /* @__PURE__ */ new Map();
function dissolved(mat) {
  const hex = mat.color?.getHex?.() ?? 16777215;
  const k = `${hex}`;
  let m = dissolveCache.get(k);
  if (!m) {
    m = (0, engine_exports.toonMaterial)(hex, { dissolve: true, rim: hex });
    m.dissolve = 0.72;
    dissolveCache.set(k, m);
  }
  return m;
}
var dir = new engine_exports.THREE.Vector3();
var from = new engine_exports.THREE.Vector3();
function hitsBox(o, d, min, max) {
  let t0 = 0, t1 = 40;
  for (const a of ["x", "y", "z"]) {
    const id = 1 / (d[a] || 1e-6);
    let tn = (min[a] - o[a]) * id, tf = (max[a] - o[a]) * id;
    if (tn > tf) [tn, tf] = [tf, tn];
    t0 = Math.max(t0, tn);
    t1 = Math.min(t1, tf);
    if (t1 < t0) return false;
  }
  return true;
}
function setFaded(view, on) {
  if (view.faded === on) return;
  view.faded = on;
  view.object.traverse((m) => {
    if (!m.isMesh) return;
    if (on) {
      m.userData.solidMat = m.material;
      m.material = dissolved(m.material);
    } else if (m.userData.solidMat) {
      m.material = m.userData.solidMat;
      m.userData.solidMat = null;
    }
  });
}
var treeBox = { min: new engine_exports.THREE.Vector3(), max: new engine_exports.THREE.Vector3() };
function updateOccluders(g) {
  const place = g.place;
  const p = g.player;
  const cam = g.ctx.camera.camera;
  cam.getWorldDirection(dir).multiplyScalar(-1);
  from.set(p.x, p.y + 0.8, p.z);
  const list = place.occluders ?? [];
  for (const v2 of list) {
    if (Math.abs(v2.min.x - p.x) > 16 || Math.abs(v2.min.z - p.z) > 16) {
      setFaded(v2, false);
      continue;
    }
    const hit = hitsBox(from, dir, v2.min, v2.max);
    if (hit) {
      v2.holdT = 0.3;
      setFaded(v2, true);
    } else if (v2.holdT > 0) {
      v2.holdT -= 0.016;
    } else setFaded(v2, false);
  }
  if (place !== g.town) return;
  const px = Math.floor(p.x), pz = Math.floor(p.z);
  g.fadedTrees ??= /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  for (let dz = 0; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) {
    const k = `${px + dx},${pz + dz}`;
    const o = g.world.town.objects[k];
    if (!o || o.k !== "tree") continue;
    const v2 = g.town.objectViews.get(k);
    if (!v2) continue;
    const x = px + dx, z = pz + dz, h = o.kind === "pine" ? 4 : o.kind === "palm" ? 3.6 : 3.6;
    const y0 = v2.position.y;
    treeBox.min.set(x - 0.8, y0 + 1, z - 0.8);
    treeBox.max.set(x + 1.8, y0 + h, z + 1.8);
    if (hitsBox(from, dir, treeBox.min, treeBox.max)) {
      seen.add(k);
      if (!g.fadedTrees.has(k)) {
        const view = { object: v2, faded: false };
        setFaded(view, true);
        g.fadedTrees.set(k, view);
      }
    }
  }
  for (const [k, view] of g.fadedTrees) if (!seen.has(k)) {
    if (view.object.parent) setFaded(view, false);
    g.fadedTrees.delete(k);
  }
}

// src/actors/player.js
init_engine();
init_rig();
init_critter();
init_place();
init_tuning();
init_items();
init_time();
var avatarSerial = 0;
function lookDef(look) {
  avatarSerial++;
  const outfit = ITEMS[look.outfit];
  const hatItem = look.hatItem ? ITEMS[look.hatItem] : null;
  const glassesItem = look.glassesItem ? ITEMS[look.glassesItem] : null;
  return avatarDef({
    ...look,
    shirt: outfit?.shirt ?? look.shirt ?? "blue",
    trim: outfit?.trim ?? look.trim ?? "white",
    hat: hatItem?.hat ?? null,
    hatColor: hatItem?.hatColor,
    hatTrim: hatItem?.hatTrim,
    glasses: glassesItem?.glasses ?? null,
    glassesColor: glassesItem?.glassesColor
  }, `avatar-${avatarSerial}`);
}
var Player = class extends Actor {
  constructor(g) {
    super(lookDef(g.world?.player.look ?? { hair: 0 }), { name: "player", seed: 3 });
    this.g = g;
    this.vx = 0;
    this.vz = 0;
    this.speed = 0;
    this.gait = "Idle";
    this.walkTarget = null;
    this.walkPath = null;
    this.walkThen = null;
    this.locked = false;
    this.stepT = 0;
    this.poseTimer = 0;
    this.poseClip = null;
    this.moving = false;
    this.lastMoveAt = 0;
    this.lastStopSquash = 0;
    this.trail = 0;
  }
  applyLook() {
    const look = this.g.world.player.look;
    this.setModel(lookDef(look));
    if (look.pattern != null) this.g.applyPatternShirt?.(this, look.pattern);
    this.held = null;
    if (this.heldDef) this.hold(this.heldDef, this.heldBuild);
    this.sitting = false;
  }
  /** Fixed-step movement. Returns whether the player moved. */
  fixedStep(dt) {
    const g = this.g;
    const inp = g.ctx.input;
    const place = g.place;
    if (!place || !g.canAct()) {
      this.speed = 0;
      this.vx = 0;
      this.vz = 0;
      return;
    }
    if (this.locked || this.poseTimer > 0) {
      this.speed = 0;
      return;
    }
    const axis = inp.moveAxis();
    const padTilt = Math.hypot(inp.padAxis.x, inp.padAxis.y);
    let mx = axis.x, mz = axis.y;
    let mag = Math.min(1, Math.hypot(mx, mz));
    const { right, forward } = g.ctx.camera.groundBasis();
    let dx = right.x * mx + forward.x * mz;
    let dz = right.z * mx + forward.z * mz;
    if (mag > 0.05) {
      this.cancelWalk();
    }
    const wt = this.walkTarget;
    if (mag <= 0.05 && wt) {
      if (this.walkPath && this.walkPath.length) {
        const n = this.walkPath[0];
        const d = Math.hypot(n[0] - this.x, n[2] - this.z);
        if (d < 0.3) {
          this.walkPath.shift();
        }
      }
      const tgt = this.walkPath && this.walkPath.length ? [this.walkPath[0][0], this.walkPath[0][2]] : [wt.x, wt.z];
      const ddx = tgt[0] - this.x, ddz = tgt[1] - this.z;
      const dist = Math.hypot(ddx, ddz);
      const reach = wt.stop ?? 0.15;
      const last = !this.walkPath || this.walkPath.length <= 1;
      const remain = Math.hypot(wt.x - this.x, wt.z - this.z);
      if (last && remain <= reach) {
        const then = this.walkThen;
        this.cancelWalk();
        then?.(g);
      } else if (dist > 1e-3) {
        dx = ddx / dist;
        dz = ddz / dist;
        mag = 0.95;
      }
    }
    const running = g.inp.running;
    const sneaking = g.inp.sneaking;
    let speed = 0;
    if (mag > 0.05) {
      if (padTilt > 0.05) speed = padTilt < 0.45 ? 1.2 : padTilt < 0.85 ? tuning.walkSpeed : tuning.jogSpeed;
      else speed = mag > 0.05 ? tuning.jogSpeed : 0;
      if (running) speed = tuning.runSpeed;
      if (sneaking) speed = 1.2;
      if (g.heldNet) speed = Math.min(speed, tuning.walkSpeed * 0.75);
      if (g.world.player.buffUntil > g.absMinute() && speed >= tuning.jogSpeed) speed *= 1.25;
      if (g.pushing) speed = Math.min(speed, tuning.walkSpeed);
    }
    this.speed = speed;
    if (speed > 0) {
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      this.turnTo = Math.atan2(dx, dz);
      const moved = moveWithCollision(place, this, dx * speed * dt, dz * speed * dt, 0.28);
      if (!moved) this.speed = 0;
      this.y = place.height(this.x, this.z);
      this.vx = dx * speed;
      this.vz = dz * speed;
    } else {
      this.vx = 0;
      this.vz = 0;
    }
    const w = g.world.player;
    w.x = this.x;
    w.z = this.z;
    w.facing = this.facing;
  }
  walkTo(x, z, { stop = 0.15, then = null, path = true } = {}) {
    this.walkTarget = { x, z, stop };
    this.walkThen = then;
    const place = this.g.place;
    this.walkPath = null;
    if (path && place.nav) {
      const p = place.nav.path([this.x, 0, this.z], [x, 0, z]);
      if (p) this.walkPath = p.slice(1);
    }
  }
  cancelWalk() {
    this.walkTarget = null;
    this.walkPath = null;
    this.walkThen = null;
  }
  /** Play a tool or verb pose: the player stands still while it runs. */
  pose(name, duration = null, { fade = 0.08, speed = 1 } = {}) {
    this.play(name, fade, { once: true, speed });
    const clip2 = this.byName.get(name);
    this.poseTimer = duration ?? (clip2 ? clip2.duration / speed : 0.5);
    this.poseClip = name;
  }
  presentation(dt) {
    const g = this.g;
    if (this.poseTimer > 0) {
      this.poseTimer -= dt;
      if (this.poseTimer <= 0) {
        this.poseClip = null;
        this.current = this.current;
      }
    }
    if (!this.poseClip && !this.locked && !this.sitting) {
      let clip2 = "Idle";
      let rate = 1;
      if (this.speed > 0.1) {
        if (g.pushing) {
          clip2 = "PushSnow";
          rate = 1;
        } else if (this.speed <= 1.4) {
          clip2 = "Tiptoe";
          rate = this.speed / 1.2;
        } else if (this.speed <= tuning.walkSpeed + 0.2) {
          clip2 = "Walk";
          rate = this.speed / 2.6;
        } else if (this.speed <= tuning.jogSpeed + 0.2) {
          clip2 = "Jog";
          rate = this.speed / 4.2;
        } else {
          clip2 = "Run";
          rate = this.speed / 6;
        }
      } else if (g.heldNet) clip2 = "NetReady";
      else if (g.idleTime > 12) clip2 = "IdleBored";
      if (this.playing !== clip2 || this.current?.once) this.play(clip2, 0.12, { speed: rate });
      else if (this.current) this.current.action.timeScale = rate;
    }
    const wet = g.sky?.kind === "rain" || g.sky?.kind === "storm";
    const umb = g.world.player.look.umbrella ? ITEMS[g.world.player.look.umbrella] : null;
    this.setUmbrella(wet && umb && g.place?.kind !== "room" ? { a: umb.a, b: umb.b } : null, wet && umb && g.world.player.look.pattern != null ? g.patternMaterialFor?.(g.world.player.look.pattern) : null);
    if (this.speed > 0.1) {
      this.moving = true;
      this.stepT += dt * (this.speed > 3 ? this.speed * 0.6 : this.speed * 0.9);
      if (this.stepT > 1) {
        this.stepT = 0;
        g.footstep?.();
        if (this.speed > 3.5) g.dust?.(this.x, this.y, this.z);
      }
    } else if (this.moving) {
      this.moving = false;
      this.squashV = -1.2;
    }
    this.update(dt);
  }
};

// src/game.js
init_sfx();

// src/audio/voice.js
var FORMANTS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [290, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240], y: [400, 1700, 2600] };
function vowel(f0, [f1, f2, f3], dur = 0.09, cons = null) {
  const amp = (h) => {
    const f = f0 * h, g = (c2, w, a) => a * Math.exp(-((f - c2) ** 2) / (2 * w * w));
    return g(f1, 90, 1) + g(f2, 120, 0.6) + g(f3, 180, 0.25);
  };
  const layers = [];
  for (let h = 2; h * f0 < 4e3; h++) {
    const v2 = amp(h) * 0.45;
    if (v2 > 0.01) layers.push({ wave: "sine", freq: f0 * h, attack: 8e-3, sustain: dur * 0.55, decay: dur * 0.45, volume: v2 });
  }
  if (cons) layers.push({ wave: "noise", freq: cons.freq, attack: 1e-3, sustain: 0, decay: cons.dur, volume: cons.vol });
  return { wave: "sine", freq: f0, attack: 8e-3, sustain: dur * 0.55, decay: dur * 0.45, volume: Math.max(0.08, amp(1) * 0.45), vibrato: { depth: 0.2, rate: 18 }, layers };
}
var ARCHETYPES = {
  round: { f0: 130, dur: 0.1 },
  bright: { f0: 280, dur: 0.075 },
  nasal: { f0: 210, dur: 0.08 },
  gruff: { f0: 100, dur: 0.09 },
  warm: { f0: 180, dur: 0.09 },
  reedy: { f0: 340, dur: 0.065 }
};
var SYLLABLES = [["ba", "a", 1500], ["ka", "a", 5e3], ["me", "e", 400], ["ti", "i", 7e3], ["lo", "o", 700], ["nu", "u", 800], ["ra", "a", 2e3], ["se", "e", 8e3], ["do", "o", 2500], ["wi", "i", 600]];
var LETTER_MAP = {};
for (const [i, ch] of "abcdefghijklmnopqrstuvwxyz".split("").entries()) LETTER_MAP[ch] = i % SYLLABLES.length;
var VOWEL_LETTERS = { a: 0, e: 2, i: 3, o: 4, u: 5, y: 9 };
for (const [v2, idx] of Object.entries(VOWEL_LETTERS)) LETTER_MAP[v2] = idx;
function voiceDefs() {
  const out = {};
  for (const [arch, { f0, dur }] of Object.entries(ARCHETYPES)) {
    SYLLABLES.forEach(([name, v2, consFreq], i) => {
      out[`v_${arch}_${i}`] = vowel(f0, FORMANTS[v2], dur, { freq: consFreq, dur: 0.018, vol: 0.14 });
    });
    out[`beep_${arch}`] = { wave: "square", duty: 0.25, freq: f0 * 2, attack: 2e-3, sustain: 0.03, decay: 0.03, volume: 0.2 };
  }
  return out;
}
var VOICES = {
  player: { a: "warm", p: 2, s: 1, lilt: 2 },
  gander: { a: "nasal", p: 0, s: 1, lilt: 1 },
  dorrit: { a: "round", p: 2, s: 0.8, lilt: 2 },
  tavi: { a: "bright", p: 2, s: 1.3, lilt: 5 },
  bartleby: { a: "gruff", p: -4, s: 0.7, lilt: 0.5 },
  ottoline: { a: "nasal", p: 5, s: 0.9, lilt: 4 },
  rocco: { a: "gruff", p: 3, s: 1.2, lilt: 3 },
  nib: { a: "reedy", p: -3, s: 0.8, lilt: 3 },
  ozzie: { a: "nasal", p: -3, s: 1.2, lilt: 1 },
  yolanda: { a: "warm", p: -2, s: 1, lilt: 2 },
  fitch: { a: "reedy", p: -6, s: 1.5, lilt: 1 },
  clementine: { a: "round", p: 5, s: 0.7, lilt: 0.5 },
  trundle: { a: "gruff", p: -2, s: 0.45, lilt: 0.5 },
  quill: { a: "reedy", p: 2, s: 1.2, lilt: 4 },
  mothwick: { a: "bright", p: -2, s: 0.8, lilt: 5 },
  rind: { a: "gruff", p: 7, s: 0.6, lilt: 0.5 },
  vesper: { a: "warm", p: 4, s: 0.85, lilt: 3 },
  hester: { a: "warm", p: 0, s: 1.05, lilt: 3 },
  fleece: { a: "nasal", p: 3, s: 1.1, lilt: 4 },
  flavia: { a: "bright", p: -1, s: 0.9, lilt: 3 },
  magda: { a: "reedy", p: -5, s: 1, lilt: 2 },
  bellows: { a: "round", p: -5, s: 0.8, lilt: 5 },
  pemberton: { a: "reedy", p: 5, s: 2, lilt: 2 },
  brisket: { a: "gruff", p: 0, s: 0.95, lilt: 0.5 },
  lou: { a: "gruff", p: -8, s: 0.4, lilt: 0.3 },
  nibbles: { a: "nasal", p: 2, s: 0.9, lilt: 3 },
  pimm: { a: "reedy", p: -8, s: 1, lilt: 0.5 },
  crowd: { a: "warm", p: 0, s: 1, lilt: 4 }
};
var VoicePlayer = class {
  constructor(g) {
    this.g = g;
    this.counter = 0;
    this.spoken = 0;
    this.lastText = null;
  }
  install(audio) {
    for (const [n, d] of Object.entries(voiceDefs())) audio.register(n, d);
  }
  /** One typed letter. */
  syllable(ch, voiceId, text) {
    const g = this.g;
    const style = g.settings.voiceStyle ?? "gibberish";
    const vol = g.settings.voices ?? 1;
    this.counter++;
    this.spoken++;
    if (style === "off" || vol <= 0) return;
    const v2 = VOICES[voiceId] ?? VOICES.crowd;
    if (this.counter % Math.max(1, Math.round(v2.s * 1.7)) !== 0 && v2.s > 0.6 && !/[aeiou]/i.test(ch)) return;
    const lower = ch.toLowerCase();
    const idx = LETTER_MAP[lower];
    if (idx === void 0) return;
    const question = text && text.trimEnd().endsWith("?");
    const lilt = Math.sin(this.counter * 1.7) * v2.lilt;
    let pitch = v2.p + lilt + (question && this.counter % 8 === 0 ? 3 : 0);
    if (question) pitch += 1;
    const loud = ch !== lower ? 1.2 : 1;
    const name = style === "beeps" ? `beep_${v2.a}` : `v_${v2.a}_${idx}`;
    g.ctx.audio.play(name, { pitch, volume: Math.min(1, vol * loud) });
  }
  /** One sung syllable at a MIDI note (Hester, Vesper, the crowd). */
  sing(ch, voiceId, midi) {
    const g = this.g;
    const style = g.settings.voiceStyle ?? "gibberish";
    const vol = g.settings.voices ?? 1;
    this.spoken++;
    if (style === "off" || vol <= 0) return;
    const v2 = VOICES[voiceId] ?? VOICES.crowd;
    const base = ARCHETYPES[v2.a].f0;
    const baseMidi = 69 + 12 * Math.log2(base / 440);
    const idx = LETTER_MAP[ch.toLowerCase()] ?? 0;
    const name = style === "beeps" ? `beep_${v2.a}` : `v_${v2.a}_${idx}`;
    g.ctx.audio.play(name, { pitch: midi - baseMidi, volume: vol });
  }
};

// src/audio/music.js
init_composer();
init_time();
var MusicDirector = class {
  constructor(g) {
    this.g = g;
    this.current = null;
    this.override = null;
    this.suspend = 0;
  }
  /** Force a tune (a scene, a festival) until cleared with null. */
  setOverride(id) {
    this.override = id;
    this.refresh();
  }
  wanted() {
    const g = this.g;
    if (this.override) return this.override;
    if (g.mode === "title") return "title";
    if (g.mode === "attract") return g.attract.tune ?? "title";
    const fest = g.festivals?.music?.();
    if (fest) return fest;
    const p = g.place;
    if (p?.music) {
      const m = typeof p.music === "function" ? p.music(g) : p.music;
      if (m) return m;
    }
    const w = g.world;
    const h = hourNow(w);
    const k = weatherNow(g);
    const v2 = k === "rain" || k === "storm" ? "rain" : k === "snow" ? "snow" : "";
    return `hour:${h}:${v2}`;
  }
  refresh() {
    if (this.suspend > 0) return;
    const id = this.wanted();
    if (id === this.current) return;
    this.current = id;
    const a = this.g.ctx.audio;
    if (id === "silence") {
      a.playMusic(null);
      return;
    }
    let song;
    if (id.startsWith("hour:")) {
      const [, h, v2] = id.split(":");
      song = hourSong(Number(h), v2 || null);
    } else song = tune(id);
    a.playMusic(song, id);
  }
  update(dt) {
    if (this.suspend > 0) {
      this.suspend -= dt;
      if (this.suspend <= 0) this.refresh();
    } else if (this.g.ctx.time % 2 < dt) this.refresh();
  }
};

// src/audio/ambience.js
init_engine();
init_time();
init_tiles();
var LOOPS2 = ["ambRiver", "ambSurf", "ambRain", "ambWind", "ambCrickets", "ambBirds", "ambCity", "ambNeon", "ambCrowd"];
var Ambience = class {
  constructor(g) {
    this.g = g;
    this.v = {};
    for (const n of LOOPS2) this.v[n] = g.ctx.audio.loop(n, { volume: 0 });
    this.t = 0;
  }
  stopAll() {
    for (const n of LOOPS2) this.v[n].set({ volume: 0 });
  }
  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.25;
    const g = this.g;
    if (g.sessionEnded) {
      this.stopAll();
      return;
    }
    const place = g.place;
    const out = place?.kind !== "room" || !!place?.outdoors;
    const inTown = place === g.town;
    const inCity = place === g.city;
    const k = weatherNow(g);
    const h = hourNow(g.world);
    const night = h >= 20 || h < 5;
    const p = g.player;
    const set = (n, vol, pan = 0) => this.v[n].set({ volume: vol, pan });
    let river = 0;
    if (inTown) {
      let best = 99;
      for (let dz = -8; dz <= 8; dz += 2) for (let dx = -8; dx <= 8; dx += 2) {
        const w = waterKind(p.x + dx, p.z + dz);
        if (w && w !== "sea") best = Math.min(best, Math.hypot(dx, dz));
      }
      river = best < 99 ? Math.max(0, 0.16 - best * 0.015) : 0;
    }
    set("ambRiver", river);
    set("ambSurf", inTown ? Math.max(0, Math.min(0.22, (p.z - 38) * 0.012)) : 0);
    const rain = k === "rain" || k === "storm";
    set("ambRain", rain ? out ? 0.26 : 0.06 : 0);
    set("ambWind", k === "wind" ? out ? 0.24 : 0.05 : k === "snow" && out ? 0.08 : 0);
    const season = g.season;
    set("ambCrickets", inTown && night && season !== 3 && !rain ? 0.08 : 0);
    set("ambBirds", inTown && !night && !rain && season !== 3 ? 0.09 : 0);
    set("ambCity", inCity ? 0.1 : 0);
    set("ambNeon", inCity && (night || h >= 18) ? 0.05 : 0);
    set("ambCrowd", inCity ? 0.1 : 0);
  }
};
var V = engine_exports.THREE.Vector3;

// src/game.js
init_tuning();

// src/systems/sky.js
init_engine();
init_time();
init_tuning();
var { Mesh: Mesh4, TorusGeometry, Group: Group6 } = engine_exports.THREE;
var ROOM_SKY = { sunDir: [0.45, 0.8, 0.55], sunColor: 16773336, sunIntensity: 1.9, ambientColor: 16773344, ambientIntensity: 1.5, sky: engine_exports.PALETTE.ink, night: 0 };
var ROOM_DIM = { sunDir: [0.45, 0.8, 0.55], sunColor: 13156584, sunIntensity: 1.5, ambientColor: 9474248, ambientIntensity: 1.5, sky: engine_exports.PALETTE.ink, night: 1 };
var Sky = class {
  constructor(g) {
    this.g = g;
    this.lastMinute = -1;
    this.rain = new engine_exports.Precipitation({ kind: "rain", count: 1800, area: [34, 16, 34], color: engine_exports.PALETTE.sky });
    this.snow = new engine_exports.Precipitation({ kind: "snow", count: 900, area: [34, 12, 34], color: engine_exports.PALETTE.white });
    this.rain.intensity = 0;
    this.snow.intensity = 0;
    g.ctx.scene.add(this.rain, this.snow);
    this.mist = (0, engine_exports.groundFog)({ color: engine_exports.PALETTE.mist, top: 1.4, amount: 0, near: 200, far: 400 });
    g.ctx.scene.fogNode = this.mist.node;
    this.kind = "sun";
    this.thunderT = 8;
    this.airT = 0;
    this.rainbow = new Group6();
    const colors = [engine_exports.PALETTE.red, engine_exports.PALETTE.orange, engine_exports.PALETTE.sand, engine_exports.PALETTE.lime, engine_exports.PALETTE.sky, engine_exports.PALETTE.plum];
    colors.forEach((c2, i) => {
      const m = new Mesh4(new TorusGeometry(12 - i * 0.5, 0.25, 4, 24, Math.PI), (0, engine_exports.toonMaterial)(c2));
      this.rainbow.add(m);
    });
    this.rainbow.visible = false;
    g.town.group.add(this.rainbow);
    this.rainbowT = 0;
    this.prevWet = false;
  }
  setSeason() {
  }
  placeChanged() {
    this.lastMinute = -1;
    this.apply();
  }
  apply() {
    const g = this.g;
    const place = g.place;
    if (place?.kind === "room" && !place.outdoors) {
      (0, engine_exports.applySky)(g.engine, place.def?.dim ? ROOM_DIM : ROOM_SKY);
      return;
    }
    const w = g.world;
    const h = w.clock.minute / 60;
    const c2 = calendarNow(g);
    let s = (0, engine_exports.skyAt)(h);
    const k = this.kind;
    if (c2.festival === "longNight" && h >= 16) s = (0, engine_exports.skyAt)(Math.max(h, 21));
    if (k === "rain" || k === "storm" || k === "fog" || k === "snow") {
      s = { ...s, sunIntensity: s.sunIntensity * 0.62, ambientIntensity: s.ambientIntensity * 0.95 };
    }
    (0, engine_exports.applySky)(g.engine, s);
    this.night = s.night;
    g.town.applyLit(s.night);
    g.isNightNow = s.night > 0.35;
    if (place === g.city) {
      place.setLook?.(place.isNight());
    }
  }
  update(dt) {
    const g = this.g;
    const w = g.world;
    const minute = Math.floor(w.clock.minute);
    this.kind = weatherNow(g);
    const out = g.place?.kind !== "room" || !!g.place?.outdoors;
    if (minute !== this.lastMinute) {
      this.lastMinute = minute;
      this.apply();
    }
    const p = g.player;
    const k = this.kind;
    const wet = k === "rain" || k === "storm";
    const focus = this.focus ??= new engine_exports.THREE.Vector3();
    focus.set(p.x + (g.place?.ox ?? 0), 8, p.z + (g.place?.oz ?? 0));
    const rainI = out && wet ? k === "storm" ? 1 : 0.65 : 0;
    const snowI = out && k === "snow" ? 0.8 : 0;
    this.rain.intensity = rainI;
    this.snow.intensity = snowI;
    this.rain.visible = rainI > 0;
    this.snow.visible = snowI > 0;
    const wind = k === "wind" ? 5 : k === "storm" ? 4 : k === "snow" ? 1 : 1.2;
    g.windNow = wind;
    this.rain.wind.set(wind * 0.5, 0.5);
    this.snow.wind.set(wind * 0.4, 0.3);
    if (rainI > 0) this.rain.update(dt, focus);
    if (snowI > 0) this.snow.update(dt, focus);
    const fogAmt = out && k === "fog" ? 0.7 : out && g.season === 2 && (w.clock.minute < 9 * 60 || k === "fog") ? 0.35 : 0;
    this.mist.amount.value += (fogAmt - this.mist.amount.value) * Math.min(1, dt * 0.5);
    if (this.prevWet && !wet && g.season === 0) {
      this.rainbowT = 60;
    }
    this.prevWet = wet;
    if (this.rainbowT > 0) {
      this.rainbowT -= dt;
      this.rainbow.position.set(p.x, 0, p.z - 8);
    }
    this.rainbow.visible = this.rainbowT > 0 && g.place === g.town;
    if (k === "storm" && out) {
      this.thunderT -= dt;
      if (this.thunderT <= 0) {
        this.thunderT = 7 + w.clock.minute * 13 % 11;
        g.engine.screen.flash("white", { duration: 0.12 });
        g.sound("thunder");
        g.rumble(0.7, 400);
        g.events.emit("thunder", {});
      }
    }
    if (out) this.seasonalAir(dt);
    if (wet && g.place) {
      g.world.flags.rainedDay = w.clock.day;
    }
  }
  seasonalAir(dt) {
    const g = this.g;
    this.airT -= dt;
    if (this.airT > 0 || g.place !== g.town) return;
    this.airT = 0.35;
    const p = g.player;
    const r = g.cosmetic;
    const at = [p.x + r.range(-8, 8), p.y + r.range(3, 7), p.z + r.range(-9, 3)];
    if (g.season === 0) g.ctx.particles.burst("petal", at, { direction: [1, -0.2, 0.4] });
    else if (g.season === 2) g.ctx.particles.burst("fall", at, { direction: [1, -0.3, 0.3] });
    else if (g.season === 1 && (this.night ?? 0) > 0.5) g.ctx.particles.burst("fly", [p.x + r.range(-8, 8), p.y + r.range(0.4, 2), p.z + r.range(-8, 4)]);
  }
};

// src/systems/interact.js
init_engine();
init_draw();
init_glyphs();
init_tiles();

// src/systems/townVerbs.js
init_town();
init_items();
function objectVerb(g, k, o, x, z) {
  switch (o.k) {
    case "tree":
      return { label: o.wasp ? "Shake the tree (it hums)" : "Shake the tree", act: "shakeTree" };
    case "flower":
      return { label: "Pick the flower", act: "pickObject", give: `flower${o.species}${o.color}` };
    case "weed":
      return { label: "Pull the weed", act: "pullWeed" };
    case "drop":
      return { label: `Pick up ${ITEMS[o.item]?.name ?? "it"}`, act: "pickObject", give: o.item };
    case "shell":
      return { label: `Pick up ${ITEMS[o.item]?.name ?? "the shell"}`, act: "pickObject", give: o.item };
    case "driftwood":
      return { label: `Pick up ${ITEMS[o.item]?.name ?? "the driftwood"}`, act: "pickObject", give: o.item };
    case "hole":
      return { label: "Bury something", act: "bury", hole: k };
    case "beanstalk":
      return (o.stage ?? 0) >= 2 ? { label: "Harvest the beanstalk", act: "harvestStalk" } : { label: "Check the beanstalk", act: "lookStalk" };
    case "snowman":
      return { label: "Talk to the snowman", act: "snowmanTalk" };
    case "crack":
      return g.world.player.tool === "shovel" ? null : { label: "A star-shaped crack", act: "crackHint" };
    case "stump":
      return { label: "Sit on the stump", act: "sitStump" };
    case "pattern":
      return { label: "Scuff the pattern off", act: "clearPattern" };
    case "patternSign":
      return { label: "Take the sign down", act: "clearPattern" };
    default:
      return null;
  }
}
function townInteractables(g) {
  const out = [];
  const w = g.world;
  for (const b of BUILDINGS) out.push({ id: `door:${b.id}`, x: b.door[0], z: b.door[1] - 0.4, r: 1.5, label: b.id === "home" ? "Go home" : `Enter ${b.name}`, act: "enterBuilding", building: b });
  const [mx, mz] = LANDMARKS.mailbox;
  out.push({ id: "mailbox", x: mx, z: mz, r: 1.4, label: w.mail.inbox.some((m) => !m.read) ? "Check the mail (!)" : "Check the mail", act: "mailbox" });
  const [bx, bz] = LANDMARKS.oldBell;
  out.push({ id: "bell", x: bx, z: bz, r: 1.6, label: "Ring the Old Bell", act: "ringBell" });
  const [nx, nz] = LANDMARKS.noticeBoard;
  out.push({ id: "board", x: nx, z: nz, r: 1.5, label: "Read the notice board", act: "noticeBoard" });
  const [px, pz] = LANDMARKS.oldPear;
  out.push({ id: "pear", x: px, z: pz, r: 2.2, label: "Look up at the Old Pear", act: "oldPear" });
  out.push({ id: "bus", x: LANDMARKS.busStop[0], z: LANDMARKS.busStop[1], r: 1.7, label: "Wait for the bus", act: "busStop" });
  for (const [x, z] of BENCHES) {
    const lookout = x > 70;
    out.push({ id: `bench:${x}`, x, z, r: 1.5, label: lookout ? g.isNight?.() ? "Sit and look at the stars" : "Sit on the bench" : "Sit on the bench", act: lookout ? "lookoutBench" : "sitBench", seat: [x, z] });
  }
  const [lx, lz] = LANDMARKS.lighthouse;
  out.push({ id: "lighthouse", x: lx, z: lz + 1.6, r: 1.6, label: "Knock at the lighthouse", act: "lighthouseKnock" });
  return out;
}

// src/systems/actions.js
init_say();
init_talk();
init_economy();
init_items();
init_lines();
init_bell();
init_time();
init_dayone();
init_memory();
init_hosts();

// src/systems/services.js
init_say();
init_lines();
init_hosts();
init_items();
init_economy();
init_dayone();
init_pockets();

// src/ui/screens/letter.js
init_draw();
init_keyboard();
init_numbers();
init_neighbours();
init_items();
init_economy();
init_pockets();
init_mail();
init_dayone();
init_say();
init_memory();
init_lines();
function* letterFlow(g) {
  const w = g.world;
  const others = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === "here");
  const labels = ["Gran", ...others.map((n) => NEIGHBOURS[n].name), "Never mind"];
  const list = ["gran", ...others];
  const c2 = yield* menuChoiceFree(g, "Write to whom?", labels, { id: "letterTo" });
  if (c2 < 0 || c2 >= list.length) return;
  const to = list[c2];
  const text = yield* keyboardFlow(g, { title: `Dear ${labels[c2]},`, max: 120, hint: "Say whatever you like. Clementine will read it, and so will the bee.", random: ["Everything is fine.", "I owe a goose.", "It rained. Then it stopped.", "Send fruit."], canCancel: true });
  if (!text) return;
  let gift = null;
  const a = yield* menuChoiceFree(g, "Attach a gift?", ["Yes", "No"]);
  if (a === 0) {
    let picked = -2;
    g.ui.push(pocketsPicker(g, { title: "Attach what?", filter: (s) => ITEMS[s.id]?.cat !== "tool" && ITEMS[s.id]?.cat !== "quest", onPick: (i) => {
      picked = i;
    }, onCancel: () => {
      picked = -1;
    } }));
    while (picked === -2) yield;
    if (picked >= 0) {
      gift = removeSlot(g, picked).id;
    }
  }
  let closed = false;
  g.ui.push(new PaperScreen(labels[c2], text, gift, () => {
    closed = true;
  }));
  while (!closed) yield;
  g.sound("stamp");
  replyTo(g, to, text, gift);
  w.mail.sentToday += 1;
  w.stats.lettersSent = (w.stats.lettersSent ?? 0) + 1;
  remember(g, "letter", { about: to === "gran" ? null : to });
  g.events.emit("letterSent", { to, text, gift });
  if (w.story.day1Active && to === "gran") completeErrand(g, "letter");
  if (g.place?.id === "hall") yield* say(g, "clementine", hostLine(g, "clementine", "post"));
}
var PaperScreen = class {
  constructor(name, text, gift, onDone) {
    this.id = "paper";
    this.name = name;
    this.text = text;
    this.gift = gift;
    this.onDone = onDone;
  }
  currentText() {
    return this.text;
  }
  update(g, inp) {
    if (inp.confirm || inp.back || inp.mouse.click) {
      g.ui.pop(this);
      this.onDone();
    }
  }
  prompts() {
    return [["confirm", "Post it"]];
  }
  draw(g, hud) {
    dim(hud);
    drawPaper(hud, `Dear ${this.name},`, this.text, g.world.player.name, this.gift ? `Enclosed: ${ITEMS[this.gift]?.name}` : "");
  }
};
function drawPaper(hud, head, body, sign, foot) {
  panel(hud, 70, 22, 340, 214, { fill: "white", trim: "sand" });
  for (let y = 58; y < 200; y += 14) hud.rect(84, y, 312, 1, "mist");
  drawText(hud, 88, 34, head, { color: "ink", scale: 1 });
  const lines = wrap(body, 300);
  lines.slice(0, 11).forEach((l, i) => drawText(hud, 88, 50 + i * 14, l, { color: "ink" }));
  if (sign) drawText(hud, 392, 206, sign, { color: "plum", align: "right" });
  if (foot) drawText(hud, 88, 218, foot, { color: "slate" });
}

// src/ui/screens/catalogue.js
init_draw();
init_icons();
init_items();
init_economy();
init_mail();
var CATS = [["furniture", "Furniture"], ["clothes", "Clothes"], ["hat", "Hats"], ["glasses", "Glasses"], ["umbrella", "Umbrellas"], ["wall", "Wallpaper"], ["floor", "Floors"]];
var Catalogue = class {
  constructor(g, onClose) {
    this.id = "catalogue";
    this.onClose = onClose;
    this.cat = 0;
    this.i = 0;
  }
  list(g) {
    return Object.keys(g.world.player.catalog).filter((id) => ITEMS[id]?.cat === CATS[this.cat][0]);
  }
  labels(g) {
    return CATS.map((c2) => c2[1]);
  }
  focusIndex() {
    return this.cat * 100 + this.i;
  }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.tabPrev) {
      this.cat = (this.cat + CATS.length - 1) % CATS.length;
      this.i = 0;
      g.sound("uiTab");
    }
    if (inp.tabNext) {
      this.cat = (this.cat + 1) % CATS.length;
      this.i = 0;
      g.sound("uiTab");
    }
    const list = this.list(g);
    if (list.length) {
      if (inp.nav.right || inp.nav.down) {
        this.i = (this.i + 1) % list.length;
        g.sound("uiTick");
      }
      if (inp.nav.left || inp.nav.up) {
        this.i = (this.i + list.length - 1) % list.length;
        g.sound("uiTick");
      }
    }
    if (m.click && inRect(m, 100, 70, 24, 24)) {
      this.i = (this.i + list.length - 1) % Math.max(1, list.length);
      g.sound("uiTick");
    }
    if (m.click && inRect(m, 356, 70, 24, 24)) {
      this.i = (this.i + 1) % Math.max(1, list.length);
      g.sound("uiTick");
    }
    if ((inp.confirm || m.click && inRect(m, 180, 190, 120, 22)) && list.length) {
      const id = list[this.i];
      const price = buyPrice(id);
      if (g.world.player.beans < price) {
        g.sound("uiError");
        g.ui.toastMsg("Not enough beans. The book says nothing, but it notices.");
        return;
      }
      spend(g, price);
      sendMail(g, { from: "clementine", body: `Dear {player},
Your order. The bee signed for it.
Clementine`, gift: id });
      g.sound("stamp");
      g.ui.toastMsg("Ordered. It comes by post tomorrow.");
      g.events.emit("ordered", { id, price });
      return;
    }
    if (inp.back || m.rclick) {
      g.sound("uiCancel");
      g.ui.pop(this);
      this.onClose?.();
    }
  }
  prompts() {
    return [["confirm", "Order"], ["tabs", "Category"], ["back", "Close"]];
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 90, 20, 300, 212, { fill: "white", trim: "sand" });
    drawText(hud, 240, 28, CATS[this.cat][1], { align: "center", color: "ink", scale: 2 });
    const list = this.list(g);
    if (!list.length) {
      textBlock(hud, 120, 100, 240, "Nothing here yet. Everything you've ever owned ends up in this book. So far, this hasn't come up.", { color: "slate" });
      return;
    }
    const id = list[this.i];
    const it = ITEMS[id];
    panel(hud, 100, 70, 24, 24, { fill: "white", trim: "mist" });
    drawText(hud, 112, 78, "<", { align: "center", color: "ink" });
    panel(hud, 356, 70, 24, 24, { fill: "white", trim: "mist" });
    drawText(hud, 368, 78, ">", { align: "center", color: "ink" });
    panel(hud, 192, 54, 96, 72, { fill: "white", trim: "mist" });
    drawIcon(hud, 216, 66, it.icon, it.iconColors, 3);
    drawText(hud, 240, 134, it.name, { align: "center", color: "ink" });
    drawText(hud, 240, 148, `${buyPrice(id).toLocaleString("en-US")} beans`, { align: "center", color: "plum" });
    if (it.line) textBlock(hud, 110, 162, 260, it.line, { color: "slate" });
    panel(hud, 180, 204, 120, 22, { fill: "sand", trim: "orange" });
    drawText(hud, 240, 211, "Order it", { align: "center", color: "ink" });
    drawText(hud, 240, 192, `${this.i + 1} of ${list.length}`, { align: "center", color: "slate" });
  }
};
var catalogueScreen = (g, onClose) => new Catalogue(g, onClose);

// src/ui/screens/chime.js
init_draw();
init_bell();
var N2 = 16;
var LEVELS = 11;
var X02 = 58;
var W = 22;
var Y02 = 56;
var CELL3 = 13;
var Chime = class {
  constructor(g, onClose) {
    this.id = "chime";
    this.onClose = onClose;
    this.col = 0;
    this.notes = g.world.chime.slice();
    this.play = null;
  }
  focusIndex() {
    return this.col;
  }
  labels() {
    return this.notes.map(String);
  }
  noteRow(n) {
    return n < 0 ? LEVELS - 1 : LEVELS - 2 - n;
  }
  update(g, inp, dt) {
    const m = inp.mouse;
    if (inp.nav.left) {
      this.col = (this.col + N2 - 1) % N2;
      g.sound("uiTick");
    }
    if (inp.nav.right) {
      this.col = (this.col + 1) % N2;
      g.sound("uiTick");
    }
    const set = (v2) => {
      this.notes[this.col] = v2;
      if (v2 >= 0) g.ctx.audio.play("bellNote", { pitch: noteOf(v2) - 5, volume: 0.7 });
    };
    if (inp.nav.up) set(Math.min(9, this.notes[this.col] + 1));
    if (inp.nav.down) set(Math.max(-1, this.notes[this.col] - 1));
    for (let c2 = 0; c2 < N2; c2++) {
      if (m.x >= X02 + c2 * W && m.x < X02 + c2 * W + W - 2 && m.y >= Y02 && m.y < Y02 + LEVELS * CELL3) {
        if (m.moved) this.col = c2;
        if (m.click) {
          this.col = c2;
          const row = Math.floor((m.y - Y02) / CELL3);
          set(row >= LEVELS - 1 ? -1 : LEVELS - 2 - row);
        }
      }
    }
    if (inp.square) this.startPlay();
    if (inp.confirm || m.click && inRect(m, 360, 212, 70, 20)) {
      g.world.chime = this.notes.slice();
      g.events.emit("chimeComposed", { notes: this.notes });
      g.world.flags.chimeSet = true;
      g.sound("uiConfirm");
      g.ui.pop(this);
      this.onClose?.();
      return;
    }
    if (inp.back || m.rclick) {
      g.sound("uiCancel");
      g.ui.pop(this);
      this.onClose?.();
      return;
    }
    if (this.play !== null) {
      this.playT -= dt;
      if (this.playT <= 0) {
        const n = this.notes[this.play];
        if (n >= 0) g.ctx.audio.play("bellNote", { pitch: noteOf(n) - 5, volume: 0.7 });
        this.play++;
        this.playT = 0.2;
        if (this.play >= N2) this.play = null;
      }
    }
  }
  startPlay() {
    this.play = 0;
    this.playT = 0;
  }
  prompts() {
    return [["confirm", "Keep it"], ["fill", "Hear it"], ["back", "Cancel"]];
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 48, 18, 384, 222, { fill: "white", trim: "sand" });
    drawText(hud, 240, 26, "The Village Chime", { align: "center", color: "ink", scale: 2 });
    for (let c2 = 0; c2 < N2; c2++) {
      const x = X02 + c2 * W;
      const focused = c2 === this.col;
      for (let r = 0; r < LEVELS; r++) hud.rect(x, Y02 + r * CELL3, W - 2, CELL3 - 2, r === LEVELS - 1 ? "mist" : focused ? "sand" : c2 % 4 === 0 ? "white" : "white");
      hud.rect(x, Y02 + LEVELS * CELL3 - 2, W - 2, 1, "slate");
      const n = this.notes[c2];
      const row = this.noteRow(n);
      hud.rect(x, Y02 + row * CELL3, W - 2, CELL3 - 2, this.play === c2 ? "red" : n < 0 ? "slate" : "orange");
      if (n >= 0) hud.rect(x, Y02 + (row + 1) * CELL3, W - 2, Math.max(0, LEVELS - 2 - row) * CELL3, "sand");
    }
    drawText(hud, 240, 44, "Up and down sets the note. The bottom row is a rest.", { align: "center", color: "slate" });
    panel(hud, 360, 212, 70, 20, { fill: "sand", trim: "orange" });
    drawText(hud, 395, 218, "Keep it", { align: "center", color: "ink" });
  }
};
var chimeScreen = (g, onClose) => new Chime(g, onClose);

// src/ui/screens/pattern.js
init_draw();
init_patterns();
init_ui();
init_economy();
var CELL4 = 10;
var X03 = 80;
var Y03 = 34;
var Studio = class {
  constructor(g, onClose) {
    this.id = "pattern";
    this.onClose = onClose;
    this.slot = 0;
    const w = g.world;
    this.data = (w.patterns[this.slot] ?? blankPattern()).slice();
    this.cx = 8;
    this.cy = 8;
    this.color = 2;
    this.mode = "pen";
    this.mirror = false;
    this.undoStack = [];
    this.dirty = false;
  }
  labels() {
    return ["pen", "fill", "mirror", "undo", "save", "wear"];
  }
  focusIndex() {
    return this.cy * 16 + this.cx;
  }
  push() {
    this.undoStack.push(this.data.slice());
    if (this.undoStack.length > 30) this.undoStack.shift();
  }
  paint(g, x, y) {
    if (this.data[y * 16 + x] === this.color && (!this.mirror || this.data[y * 16 + 15 - x] === this.color)) return;
    this.push();
    this.data[y * 16 + x] = this.color;
    if (this.mirror) this.data[y * 16 + 15 - x] = this.color;
    this.dirty = true;
    g.sound("uiTick");
    g.events.emit("patternEdit", {});
  }
  fill(g, x, y) {
    const from2 = this.data[y * 16 + x];
    if (from2 === this.color) return;
    this.push();
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px > 15 || py > 15 || this.data[py * 16 + px] !== from2) continue;
      this.data[py * 16 + px] = this.color;
      if (this.mirror) this.data[py * 16 + 15 - px] = this.color;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    this.dirty = true;
    g.sound("uiConfirm");
  }
  save(g) {
    const w = g.world;
    w.patterns[this.slot] = this.data.slice();
    w.player.pattern = this.slot;
    this.dirty = false;
    g.sound("stamp");
    g.events.emit("patternSaved", { slot: this.slot });
  }
  wear(g) {
    const w = g.world;
    this.save(g);
    w.player.look.pattern = this.slot;
    g.player.applyLook();
    g.events.emit("patternWorn", { slot: this.slot });
    g.ui.toastMsg("You are wearing your own pattern. It is very you.");
  }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.nav.left) {
      this.cx = (this.cx + 15) % 16;
    }
    if (inp.nav.right) {
      this.cx = (this.cx + 1) % 16;
    }
    if (inp.nav.up) {
      this.cy = (this.cy + 15) % 16;
    }
    if (inp.nav.down) {
      this.cy = (this.cy + 1) % 16;
    }
    const input = g.ctx.input;
    if (inp.tabPrev) {
      this.color = (this.color + 15) % 16;
      g.sound("uiTab");
    }
    if (inp.tabNext) {
      this.color = (this.color + 1) % 16;
      g.sound("uiTab");
    }
    if (inp.confirm) {
      if (this.mode === "fill") this.fill(g, this.cx, this.cy);
      else this.paint(g, this.cx, this.cy);
    }
    if (input.isDown("PadCross") && this.mode === "pen") this.paint(g, this.cx, this.cy);
    if (inp.square || input.wasPressed("KeyF")) {
      this.mode = this.mode === "fill" ? "pen" : "fill";
      g.sound("uiTab");
    }
    if (inp.triangle || input.wasPressed("KeyM")) {
      this.mirror = !this.mirror;
      g.sound("uiTab");
    }
    if (input.wasPressed("PadL2", "KeyZ")) this.undo(g);
    if (input.wasPressed("PadR2", "KeyV")) this.save(g);
    if (input.wasPressed("PadOptions", "KeyC")) this.wear(g);
    if (m.x >= X03 && m.x < X03 + 160 && m.y >= Y03 && m.y < Y03 + 160) {
      const x = Math.floor((m.x - X03) / CELL4), y = Math.floor((m.y - Y03) / CELL4);
      if (m.moved) {
        this.cx = x;
        this.cy = y;
      }
      if (m.click && this.mode === "fill") this.fill(g, x, y);
      else if (m.down && this.mode === "pen") this.paint(g, x, y);
      this.cx = x;
      this.cy = y;
    }
    for (let i = 0; i < 16; i++) {
      const [px, py, pw, ph] = this.swatch(i);
      if (m.click && inRect(m, px, py, pw, ph)) {
        this.color = i;
        g.sound("uiTab");
      }
    }
    const b = this.buttons();
    for (const [name, x, y, w, h, fn] of b) if (m.click && inRect(m, x, y, w, h)) fn(g);
    if (input.wasPressed("Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8")) {
      for (let d = 1; d <= 8; d++) if (input.wasPressed(`Digit${d}`)) this.setSlot(g, d - 1);
    }
    if (inp.back || m.rclick) {
      if (this.dirty) this.save(g);
      g.sound("uiCancel");
      g.ui.pop(this);
      this.onClose?.();
    }
  }
  kit(g) {
    this.save(g);
    if (addItem(g, "patternKit", { slot: this.slot }) < 0) {
      g.ui.toastMsg("Your pockets are full.");
      return;
    }
    g.sound("pickUp");
    g.ui.toastMsg("A Pattern Kit, in your pockets. Lay it on the ground, or nail it to a post.");
  }
  setSlot(g, s) {
    this.slot = s;
    this.data = (g.world.patterns[s] ?? blankPattern()).slice();
    this.undoStack = [];
    g.sound("uiTab");
  }
  undo(g) {
    if (this.undoStack.length) {
      this.data = this.undoStack.pop();
      g.sound("uiTick");
    }
  }
  swatch(i) {
    return [X03 + 170 + i % 4 * 22, Y03 + Math.floor(i / 4) * 22, 20, 20];
  }
  buttons() {
    return [
      ["Pen", 340, 130, 60, 18, () => {
        this.mode = "pen";
      }],
      ["Fill", 340, 150, 60, 18, () => {
        this.mode = "fill";
      }],
      ["Mirror", 340, 170, 60, 18, () => {
        this.mirror = !this.mirror;
      }],
      ["Undo", 250, 130, 60, 18, (g) => this.undo(g)],
      ["Save", 250, 150, 60, 18, (g) => this.save(g)],
      ["Wear", 250, 170, 60, 18, (g) => this.wear(g)],
      ["Kit", 250, 190, 60, 18, (g) => this.kit(g)]
    ];
  }
  prompts() {
    return [["confirm", "Paint"], ["fill", this.mode === "fill" ? "To pen" : "To fill"], ["mirror", this.mirror ? "Mirror off" : "Mirror on"], ["back", "Save & leave"]];
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 66, 18, 348, 196, { fill: "white", trim: "sand" });
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) hud.rect(X03 + x * CELL4, Y03 + y * CELL4, CELL4 - 1, CELL4 - 1, PATTERN_COLORS[this.data[y * 16 + x]]);
    const cx = X03 + this.cx * CELL4, cy = Y03 + this.cy * CELL4;
    hud.rect(cx - 1, cy - 1, CELL4 + 1, 1, "white");
    hud.rect(cx - 1, cy + CELL4 - 1, CELL4 + 1, 1, "white");
    hud.rect(cx - 1, cy - 1, 1, CELL4 + 1, "white");
    hud.rect(cx + CELL4 - 1, cy - 1, 1, CELL4 + 1, "white");
    for (let i = 0; i < 16; i++) {
      const [px, py, pw, ph] = this.swatch(i);
      hud.rect(px - 1, py - 1, pw + 2, ph + 2, i === this.color ? "ink" : "mist");
      hud.rect(px, py, pw, ph, PATTERN_COLORS[i]);
    }
    for (const [name, x, y, w, h] of this.buttons()) {
      const on = name === "Pen" && this.mode === "pen" || name === "Fill" && this.mode === "fill" || name === "Mirror" && this.mirror;
      panel(hud, x, y, w, h, { fill: on ? "sand" : "white", trim: on ? "orange" : "mist" });
      drawText(hud, x + w / 2, y + 5, name, { align: "center", color: "ink" });
    }
    drawText(hud, 325, 192, `Slot ${this.slot + 1} of 8`, { align: "center", color: "slate" });
    drawText(hud, 80, 22, `Sixteen by sixteen. Make me cry.`, { color: "slate" });
  }
};
var patternStudio = (g, onClose) => new Studio(g, onClose);

// src/ui/screens/placement.js
init_draw();
init_items();
init_economy();
init_engine();
var { Mesh: Mesh5, BoxGeometry: BoxGeometry3, Group: Group7 } = engine_exports.THREE;
var Placement = class {
  constructor(g, pocketIndex) {
    this.id = "placement";
    this.modal = true;
    this.room = g.place;
    this.cx = Math.floor(this.room.w / 2);
    this.cz = Math.floor(this.room.d / 2);
    this.held = null;
    this.pocketIndex = pocketIndex;
    this.ghost = new Group7();
    this.cursor = new Group7();
    const mat = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.sand);
    for (const [w, d, x, z] of [[1, 0.08, 0.5, 0.04], [1, 0.08, 0.5, 0.96], [0.08, 1, 0.04, 0.5], [0.08, 1, 0.96, 0.5]]) {
      const m = new Mesh5(new BoxGeometry3(w, 0.04, d), mat);
      m.position.set(x, 0.05, z);
      this.cursor.add(m);
    }
    this.room.group.add(this.cursor);
    this.grid = new Group7();
    const gm = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.mist);
    for (let x = 0; x <= this.room.w; x++) {
      const l = new Mesh5(new BoxGeometry3(0.02, 0.01, this.room.d), gm);
      l.position.set(x, 0.02, this.room.d / 2);
      this.grid.add(l);
    }
    for (let z = 0; z <= this.room.d; z++) {
      const l = new Mesh5(new BoxGeometry3(this.room.w, 0.01, 0.02), gm);
      l.position.set(this.room.w / 2, 0.02, z);
      this.grid.add(l);
    }
    this.room.group.add(this.grid);
    if (pocketIndex >= 0) {
      const slot = g.world.player.pockets[pocketIndex];
      if (slot) {
        this.held = { id: slot.id, x: this.cx, z: this.cz, rot: 0, on: true, fresh: pocketIndex };
        this.makeGhost(g);
      }
    }
    this.prevHideHud = g.hideHud;
    g.hideHud = true;
    g.camFocus = { x: this.room.w / 2, y: 0.6, z: this.room.d / 2 };
  }
  focusIndex() {
    return this.cz * 100 + this.cx;
  }
  labels() {
    return [];
  }
  makeGhost(g) {
    this.ghost.clear();
    this.ghost.removeFromParent();
    const it = ITEMS[this.held.id];
    const box5 = new Mesh5(new BoxGeometry3(it.w * 0.9, 0.5, it.d * 0.9), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.sand));
    box5.position.y = 0.3;
    this.ghost.add(box5);
    this.room.group.add(this.ghost);
  }
  fits(g, item) {
    const it = ITEMS[item.id];
    const rotated = item.rot % 2 === 1;
    const w = rotated ? it.d : it.w, d = rotated ? it.w : it.d;
    const room = this.room;
    if (item.x < 0 || item.z < 0 || item.x + w > room.w || item.z + d > room.d) return false;
    const e = room.def.exit;
    if (e && item.z + d >= room.d - 1.5 && Math.abs(item.x + w / 2 - e.x) < 1.2 + w / 2) return false;
    if (it.flat) return true;
    for (const other of room.roomData.items) {
      const ot = ITEMS[other.id];
      if (ot.flat || other === item) continue;
      const orot = other.rot % 2 === 1;
      const ow = orot ? ot.d : ot.w, od = orot ? ot.w : ot.d;
      if (item.x < other.x + ow && item.x + w > other.x && item.z < other.z + od && item.z + d > other.z) return false;
    }
    return true;
  }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.nav.left) {
      this.cx = Math.max(0, this.cx - 1);
      g.sound("uiTick");
    }
    if (inp.nav.right) {
      this.cx = Math.min(this.room.w - 1, this.cx + 1);
      g.sound("uiTick");
    }
    if (inp.nav.up) {
      this.cz = Math.max(0, this.cz - 1);
      g.sound("uiTick");
    }
    if (inp.nav.down) {
      this.cz = Math.min(this.room.d - 1, this.cz + 1);
      g.sound("uiTick");
    }
    if (m.moved && m.over) {
      const h = g.interact.groundPoint();
      if (h) {
        this.cx = Math.max(0, Math.min(this.room.w - 1, Math.floor(h.x)));
        this.cz = Math.max(0, Math.min(this.room.d - 1, Math.floor(h.z)));
      }
    }
    this.cursor.position.set(this.cx, 0, this.cz);
    if (this.held) {
      this.held.x = this.cx;
      this.held.z = this.cz;
      const it = ITEMS[this.held.id];
      const rotated = this.held.rot % 2 === 1;
      const w = rotated ? it.d : it.w, d = rotated ? it.w : it.d;
      this.ghost.position.set(this.cx + w / 2, 0, this.cz + d / 2);
      this.ghost.rotation.y = this.held.rot * Math.PI / 2;
      if (inp.prevTool || inp.tabPrev) {
        this.held.rot = (this.held.rot + 3) % 4;
        g.sound("uiTab");
      }
      if (inp.nextTool || inp.tabNext) {
        this.held.rot = (this.held.rot + 1) % 4;
        g.sound("uiTab");
      }
    }
    const act = inp.confirm || m.click;
    if (act) {
      if (this.held) {
        if (!this.fits(g, this.held)) {
          g.sound("uiError");
          g.ui.toastMsg("It won't go there. Mind the door.");
        } else {
          const placed = { id: this.held.id, x: this.held.x, z: this.held.z, rot: this.held.rot, on: true };
          if (this.held.fresh !== void 0) removeSlot(g, this.held.fresh);
          this.room.roomData.items.push(placed);
          this.held = null;
          this.ghost.removeFromParent();
          this.room.placeItems();
          this.room.syncLamps();
          this.room.attachViews();
          g.sound("drop");
          g.events.emit("placed", { id: placed.id });
          g.world.player.catalog[placed.id] = true;
        }
      } else {
        const list = this.room.roomData.items;
        const i = list.findIndex((o) => {
          const it = ITEMS[o.id];
          const r = o.rot % 2 === 1;
          const w = r ? it.d : it.w, d = r ? it.w : it.d;
          return this.cx >= o.x && this.cx < o.x + w && this.cz >= o.z && this.cz < o.z + d;
        });
        if (i >= 0) {
          const o = list.splice(i, 1)[0];
          this.held = { id: o.id, x: o.x, z: o.z, rot: o.rot };
          this.makeGhost(g);
          this.room.placeItems();
          this.room.syncLamps();
          this.room.attachViews();
          g.sound("pickUp");
          g.events.emit("lifted", { id: o.id });
        } else g.sound("uiTick");
      }
    }
    if (inp.square && this.held && this.held.fresh === void 0) {
      if (hasRoom(g.world)) {
        addItem(g, this.held.id);
        this.held = null;
        this.ghost.removeFromParent();
        g.sound("pickUp");
      }
    }
    if (inp.back || m.rclick) {
      if (this.held && this.held.fresh === void 0) {
        if (hasRoom(g.world)) addItem(g, this.held.id);
        else this.room.roomData.items.push({ id: this.held.id, x: this.held.x, z: this.held.z, rot: this.held.rot, on: true });
      }
      this.leave(g);
    }
  }
  leave(g) {
    g.sound("uiCancel");
    this.ghost.removeFromParent();
    this.cursor.removeFromParent();
    this.grid.removeFromParent();
    g.hideHud = this.prevHideHud;
    g.camFocus = null;
    this.room.placeItems();
    this.room.syncLamps();
    this.room.attachViews();
    g.ui.pop(this);
  }
  prompts() {
    return this.held ? [["confirm", "Drop"], ["tools", "Rotate"], ["fill", "To pockets"], ["back", "Finish"]] : [["confirm", "Lift"], ["back", "Finish"]];
  }
  draw(g, hud) {
    if (this.held) {
      const it = ITEMS[this.held.id];
      const w = 12 + it.name.length * 6;
      panel(hud, 240 - w / 2, 14, w, 17, { fill: "white", trim: "sand" });
      drawText(hud, 240, 19, it.name, { align: "center", color: "ink" });
    }
  }
};
var placementScreen = (g, i = -1) => new Placement(g, i);

// src/systems/services.js
init_numbers();

// src/systems/townRating.js
init_hosts();
function townScore(w) {
  const o = Object.values(w.town.objects);
  const trees = o.filter((x) => x.k === "tree").length;
  const flowers = o.filter((x) => x.k === "flower" && (x.wilt ?? 0) < 2).length;
  const weeds = o.filter((x) => x.k === "weed").length;
  const litter = o.filter((x) => x.k === "drop" || x.k === "hole").length;
  let s = 50;
  s += trees >= 40 && trees <= 70 ? 20 : trees < 40 ? -(40 - trees) : -(trees - 70);
  s += Math.min(25, flowers * 1.2);
  s -= weeds * 2;
  s -= litter;
  return { score: Math.max(0, Math.min(100, Math.round(s))), trees, flowers, weeds, litter };
}
function townRating(g) {
  const r = townScore(g.world);
  const verdict = r.score >= 80 ? "This is a very good village. The bee has stopped writing to the authorities." : r.score >= 60 ? "This is a good village. You could tell people about it. They would ask where it was." : r.score >= 35 ? "This village is fine. Fine is a word the bee uses." : "This village has seen better days. I can show you the form.";
  const hint = r.weeds > 8 ? "Hint: weeds. Pull them. The bee is counting." : r.trees < 40 ? `Hint: more trees. You have ${r.trees}. Forty to seventy is the sweet spot.` : r.trees > 70 ? `Hint: fewer trees. You have ${r.trees}. It's getting hard to find the post.` : r.flowers < 20 ? "Hint: more flowers. Near the houses. The bee is very specific about this." : r.litter > 6 ? "Hint: there's a lot of holes and things lying around." : "Hint: keep doing whatever this is.";
  return { ...r, lines: [verdict, hint], base: HOSTS.clementine.rating };
}

// src/systems/services.js
init_ui();
init_fossils();
init_fish();
init_bugs();
init_art();
init_rng();
init_memory();
init_mail();
init_session();
init_bed();

// src/ui/screens/clockFace.js
init_calendar();
function flavourOfClock(g) {
  const t = formatTime(g.world.clock.minute);
  return `It says ${t}. You've no reason to doubt it. Mrs. Gander had it set.`;
}

// src/systems/services.js
init_lookEditor();
init_time();
init_pocketActions();
init_draw();
function* waitPick(g, opts) {
  let picked = -2;
  g.ui.push(pocketsPicker(g, { ...opts, onPick: (i) => {
    picked = i;
  }, onCancel: () => {
    picked = -1;
  } }));
  while (picked === -2) yield;
  return picked;
}
function* menuChoice(g, title, labels, o = {}) {
  let result = -2;
  const items = labels.map((l, i) => typeof l === "string" ? { label: l, action: (gg, m) => {
    result = i;
    gg.ui.pop(m);
  } } : { ...l, action: (gg, m) => {
    result = i;
    gg.ui.pop(m);
  } });
  g.ui.push(new Menu({ id: o.id ?? "choice", title, items, x: o.x ?? 150, y: o.y ?? 70, w: o.w ?? 180, back: (gg, m) => {
    result = -1;
    gg.ui.pop(m);
  } }));
  while (result === -2) yield;
  return result;
}
var SERVICES = {
  *ganderCounter(g) {
    const w = g.world;
    if (yield* day1Gander(g)) return;
    const a = g.actorOf("gander");
    a.play("Talk", 0.15);
    while (true) {
      const opts = ["Sell", "Pay the debt"];
      if (w.player.debt === 0 && nextTierCost(w) != null) opts.push("Sign for the next house");
      opts.push("Paint the house");
      opts.push("Chat");
      opts.push("Goodbye");
      const line2 = w.flags.gandered === w.clock.day ? hostLine(g, "gander", "idle") : hostLine(g, "gander", "greet");
      w.flags.gandered = w.clock.day;
      const c2 = yield* ask(g, "gander", line2, opts);
      const pick = opts[c2];
      if (pick === "Sell") yield* sellFlow(g);
      else if (pick === "Pay the debt") yield* payFlow(g);
      else if (pick === "Sign for the next house") yield* tierFlow(g);
      else if (pick === "Paint the house") yield* paintFlow(g);
      else if (pick === "Chat") {
        yield* say(g, "gander", hostLine(g, "gander", "idle"));
      } else break;
    }
    a.play("Idle", 0.2);
  },
  *stockLook(g, t) {
    const w = g.world;
    const it = ITEMS[t.stock.id];
    const price = buyPrice(t.stock.id);
    const c2 = yield* ask(g, g.place.hostId, `${it.name}. ${price.toLocaleString("en-US")} beans. ${it.line ?? ""}`, ["Buy it", "Not today"], {});
    if (c2 !== 0) return;
    if (w.player.beans < price) {
      yield* say(g, g.place.hostId, g.place.hostId === "gander" ? HOSTS.gander.noBeans[w.clock.day % 2] : "Oh! You haven't got the beans! I'm so sorry for us both!");
      return;
    }
    if (!hasRoom(w)) {
      yield* say(g, g.place.hostId, g.place.hostId === "gander" ? HOSTS.gander.full[0] : "Your pockets are full! I could weep! Come back with less!");
      return;
    }
    spend(g, price);
    addItem(g, t.stock.id);
    w.player.catalog[t.stock.id] = true;
    w.flags[`bought:${w.clock.day}:${t.stock.id}`] = true;
    g.sound("bean");
    t.mesh?.removeFromParent();
    g.place.refreshDynamic();
    g.events.emit("bought", { id: t.stock.id, price });
    if (g.place.hostId === "gander") yield* say(g, "gander", hostLine(g, "gander", "buy"));
    else yield* say(g, "mothwick", hostLine(g, "mothwick", "buy"));
    if (w.flags.storeUpgraded) {
      w.flags.storeUpgraded = false;
      yield* say(g, "gander", hostLine(g, "gander", "upgrade"));
    }
  },
  *clementineCounter(g) {
    const w = g.world;
    if (yield* day1Clementine(g)) return;
    while (true) {
      const opts = ["Bean Jar", "Write a letter", "Catalogue", "Town rating", "The Village Chime", "Chat", "Goodbye"];
      const c2 = yield* ask(g, "clementine", hostLine(g, "clementine", "greet"), ["Bean Jar", "Post and catalogue", "The village", "Goodbye"]);
      if (c2 === 0) yield* SERVICES.beanJar(g);
      else if (c2 === 1) {
        const c22 = yield* ask(g, "clementine", hostLine(g, "clementine", "post"), ["Write a letter", "Catalogue", "Never mind"]);
        if (c22 === 0) yield* SERVICES.writeLetter(g);
        else if (c22 === 1) yield* SERVICES.catalogue(g);
      } else if (c2 === 2) {
        const c22 = yield* ask(g, "clementine", "What about it?", ["Town rating", "The Village Chime", "Chat", "Never mind"]);
        if (c22 === 0) {
          const r = townRating(g);
          yield* say(g, "clementine", r.lines);
          g.events.emit("townRated", r);
        } else if (c22 === 1) yield* SERVICES.chime(g);
        else if (c22 === 2) yield* say(g, "clementine", hostLine(g, "clementine", w.clock.minute % 2 < 1 ? "idle" : "bee"));
      } else break;
      if (opts.length < 0) break;
    }
  },
  *beanJar(g) {
    const w = g.world;
    const c2 = yield* ask(g, "clementine", `${hostLine(g, "clementine", "jar")}//The jar holds ${w.player.jar.toLocaleString("en-US")} beans.`, ["Deposit", "Withdraw", "Never mind"]);
    if (c2 === 0) {
      const n = yield* numberPicker(g, { title: "Deposit how many?", max: w.player.beans, step: 100 });
      if (n > 0) {
        w.player.beans -= n;
        w.player.jar += n;
        g.sound("beanLots");
        g.events.emit("jar", { n });
      }
    } else if (c2 === 1) {
      const n = yield* numberPicker(g, { title: "Withdraw how many?", max: w.player.jar, step: 100 });
      if (n > 0) {
        w.player.jar -= n;
        w.player.beans += n;
        g.sound("beanLots");
        g.events.emit("jar", { n: -n });
      }
    }
  },
  *lostFound(g) {
    const w = g.world;
    const list = w.town.lostFound;
    const c2 = yield* ask(g, "clementine", list.length ? `The bin has ${list.length} thing${list.length > 1 ? "s" : ""} in it. Nobody knows whose. You could leave something, or find something.` : "The bin is empty. It was hoping for better things.", ["Find something", "Leave something", "Never mind"]);
    if (c2 === 0) {
      if (!list.length) {
        yield* narrate(g, "You feel around. There is a button. It is not a real button. You put it back.");
        return;
      }
      if (!hasRoom(w)) {
        yield* say(g, "clementine", "Your pockets are full. The bin understands.");
        return;
      }
      const id = list.shift();
      addItem(g, id);
      g.sound("pickUp");
      yield* narrate(g, `You find ${ITEMS[id]?.name ?? "something"}. Nobody claims it. Nobody looks up.`);
      g.events.emit("lostFound", { took: id });
    } else if (c2 === 1) {
      const i = yield* waitPick(g, { title: "Leave what?", filter: (s) => ITEMS[s.id]?.cat !== "quest" });
      if (i >= 0) {
        const s = removeSlot(g, i);
        list.push(s.id);
        g.sound("drop");
        g.events.emit("lostFound", { left: s.id });
      }
    }
  },
  *catalogue(g) {
    let closed = false;
    g.ui.push(catalogueScreen(g, () => {
      closed = true;
    }));
    while (!closed) yield;
  },
  *chime(g) {
    let closed = false;
    g.ui.push(chimeScreen(g, () => {
      closed = true;
    }));
    while (!closed) yield;
    g.events.emit("chimeSet", {});
  },
  *writeLetter(g) {
    yield* letterFlow(g);
  },
  *quillDesk(g) {
    const w = g.world;
    const a = g.actorOf("quill");
    a.play("Talk", 0.15);
    while (true) {
      const raw = w.player.pockets.findIndex((s) => s?.id === "unknownFossil");
      const opts = [];
      if (raw >= 0) opts.push("Appraise this fossil");
      opts.push("Donate something");
      opts.push("Chat");
      opts.push("Goodbye");
      const c2 = yield* ask(g, "quill", hostLine(g, "quill", "greet"), opts);
      const pick = opts[c2];
      if (pick === "Appraise this fossil") yield* appraise(g, raw);
      else if (pick === "Donate something") yield* donate(g);
      else if (pick === "Chat") yield* say(g, "quill", hostLine(g, "quill", "idle"));
      else break;
    }
    a.play("Idle", 0.2);
  },
  *museumLook(g, t) {
    yield* narrate(g, `${t.lookName}. ${t.line}`);
    g.events.emit("lookedExhibit", {});
  },
  *mothwickCounter(g) {
    const a = g.actorOf("mothwick");
    a.play("Talk", 0.15);
    const c2 = yield* ask(g, "mothwick", hostLine(g, "mothwick", "greet"), ["The pattern studio", "Chat", "Goodbye"]);
    if (c2 === 0) {
      yield* say(g, "mothwick", hostLine(g, "mothwick", "pattern"));
      yield* SERVICES.patternStudio(g);
    } else if (c2 === 1) yield* say(g, "mothwick", hostLine(g, "mothwick", "idle"));
    a.play("Idle", 0.2);
  },
  *patternStudio(g) {
    let closed = false;
    g.ui.push(patternStudio(g, () => {
      closed = true;
    }));
    while (!closed) yield;
  },
  *hostTalk(g, t) {
    yield* say(g, t.talkTo, hostLine(g, t.talkTo, "greet"));
    if (HOSTS[t.talkTo]?.idle) yield* say(g, t.talkTo, hostLine(g, t.talkTo, "idle"));
  },
  *goodChair(g) {
    yield* narrate(g, "The Good Chair. You could sit in it. You could also walk into the sea. You feel about the same way about both.");
    g.events.emit("goodChair", {});
  },
  *nibScope(g) {
    yield* narrate(g, 'You look through the telescope. It is pointed at the moon. It is daytime. There is a note taped to the eyepiece: "Keep trying."');
  },
  // ---- Home --------------------------------------------------------------------------------------
  *furniture(g, t) {
    const w = g.world;
    const f = t.furn;
    switch (f.it.func) {
      case "lamp":
        f.item.on = f.item.on === false;
        g.place.syncLamps();
        g.sound("uiTick");
        g.events.emit("lamp", { on: f.item.on });
        break;
      case "seat": {
        const p = g.player;
        p.x = f.x;
        p.z = f.z;
        p.y = 0.25;
        p.facing = f.item.rot * Math.PI / 2;
        p.turnTo = null;
        p.sitting = true;
        p.play("Sit", 0.12);
        g.events.emit("sat", {});
        yield 0.4;
        while (!(g.inp.confirm || g.inp.back || g.inp.mouse.click || Math.hypot(g.inp.axisX, g.inp.axisY) > 0.3)) yield;
        p.sitting = false;
        p.y = 0;
        const out = [[f.x, f.z + f.d / 2 + 0.5], [f.x + f.w / 2 + 0.5, f.z], [f.x - f.w / 2 - 0.5, f.z], [f.x, f.z - f.d / 2 - 0.5]].find(([x, z]) => !g.place.blocked(x, z));
        if (out) {
          p.x = out[0];
          p.z = out[1];
        }
        p.play("Idle", 0.15);
        break;
      }
      case "bed":
        yield* bedFlow(g);
        break;
      case "stereo": {
        const records = w.player.pockets.map((s, i) => s && ITEMS[s.id]?.cat === "record" ? { s, i } : null).filter(Boolean);
        const owned = w.records.map((r) => ({ label: ITEMS[`record${r}`].name, song: `vesper${r}` }));
        const labels = [...owned.map((o) => o.label), w.home.stereo ? "Turn it off" : "Leave it off"];
        const c2 = yield* menuChoice(g, "Stereo", labels, { id: "stereo" });
        if (c2 >= 0 && c2 < owned.length) {
          w.home.stereo = owned[c2].song;
          g.events.emit("stereo", { song: owned[c2].song });
          g.music.refresh();
        } else if (c2 === owned.length) {
          w.home.stereo = null;
          g.music.refresh();
        }
        if (records.length < 0) break;
        break;
      }
      case "tv":
        yield* narrate(g, "A live feed of the plaza. Nothing is happening, very slowly. The Mayor is in shot. Someone waves. Nobody is there to wave at.");
        g.events.emit("watchedTV", {});
        break;
      case "mirror": {
        g.events.emit("mirror", {});
        yield* lookEditor(g, { title: "The mirror", free: true });
        break;
      }
      case "tank":
      case "cage": {
        const cat = f.it.func === "tank" ? "fish" : "bug";
        const list = w.home[cat === "fish" ? "tankFish" : "cageBugs"];
        const i = yield* waitPick(g, { title: cat === "fish" ? "Put in the tank" : "Put in the cage", filter: (s) => ITEMS[s.id]?.cat === cat });
        if (i >= 0) {
          const s = removeSlot(g, i);
          list[s.id] = true;
          g.place.rebuild();
          g.attachIfNeeded?.();
          g.events.emit("housed", { id: s.id });
        }
        break;
      }
      case "clock":
        yield* narrate(g, flavourOfClock(g));
        break;
      case "toilet":
        g.sound("flush");
        g.events.emit("flushed", {});
        yield* narrate(g, "You flush. It accomplishes nothing. You feel better.");
        break;
      case "plant":
        g.sound("waterPour");
        yield* narrate(g, "You water the plant. It seems to be thinking about something else.");
        break;
      default:
        break;
    }
  },
  *arrange(g) {
    g.openPlacement(-1);
    while (g.ui.has("placement")) yield;
  }
};
function* bedFlow(g) {
  yield* bedMenu(g);
}
function* sellFlow(g) {
  const w = g.world;
  const extraDraw = null;
  yield* say(g, "gander", hostLine(g, "gander", "sell"));
  while (true) {
    let quote = null;
    const screen = pocketsPicker(g, {
      title: "Sell what?",
      filter: (s) => SELLABLE(s.id),
      onPick: (i) => {
        quote = i;
      },
      onCancel: () => {
        quote = -1;
      },
      extraDraw: (gg, hud) => {
        const s = gg.world.player.pockets[screen.focus];
        if (s && SELLABLE(s.id)) quoteLabel(gg, hud, `She'd give you ${sellPrice(gg, s).toLocaleString("en-US")} beans`);
        else if (s) quoteLabel(gg, hud, "She looks at it and says nothing");
      }
    });
    g.ui.push(screen);
    while (quote === null) yield;
    if (quote < 0) return;
    const slot = w.player.pockets[quote];
    const it = ITEMS[slot.id];
    const handmade = slot.from || it.handmade;
    const price = sellPrice(g, slot);
    const line2 = handmade ? hostLine(g, "gander", "soldGift") : slot.id === "cheese" || slot.id === "cheeseOff" ? hostLine(g, "gander", "cheese") : `${it.name}. I'll give you ${price.toLocaleString("en-US")} beans, dear.`;
    const c2 = yield* ask(g, "gander", line2, ["Sell it", "Keep it"]);
    if (c2 === 0) {
      const got = sellSlot(g, quote);
      g.sound(got >= 1e3 ? "beanLots" : "bean");
      if (got > 0 && w.stats.soldTotal % 4 === 1) yield* say(g, "gander", hostLine(g, "gander", "sold"));
    }
  }
}
function quoteLabel(g, hud, text) {
  drawQuote(hud, text);
}
function drawQuote(hud, text) {
  const w = textWidth(text) + 16;
  panel(hud, 240 - w / 2, 16 - 2, w, 16, { fill: "navy", trim: "sky" });
  drawText(hud, 240, 18, text, { align: "center", color: "white" });
}
function* payFlow(g) {
  const w = g.world;
  if (w.player.debt <= 0) {
    yield* say(g, "gander", ["You don't owe me anything, dear. I've checked. Twice. With a lamp."]);
    return;
  }
  if (w.player.beans <= 0) {
    yield* say(g, "gander", HOSTS.gander.noBeans[0]);
    return;
  }
  yield* say(g, "gander", `You owe ${w.player.debt.toLocaleString("en-US")} beans, dear.`);
  const n = yield* numberPicker(g, { title: "Pay how many?", max: Math.min(w.player.beans, w.player.debt), step: 100 });
  if (n <= 0) return;
  payDebt(g, n);
  g.sound("debtPaid");
  g.rumble(0.3, 120);
  if (w.player.debt === 0) {
    g.actorOf("gander").play("Honk", 0.1, { once: true });
    yield* say(g, "gander", w.player.homeTier >= 4 ? HOSTS.gander.compliment : hostLine(g, "gander", "cleared"));
    if (w.player.homeTier >= 4 && !w.home.deedGold) {
      w.home.deedGold = true;
      g.events.emit("deed", {});
    }
  } else yield* say(g, "gander", hostLine(g, "gander", "pay"));
}
function* tierFlow(g) {
  const w = g.world;
  const cost = nextTierCost(w);
  const names = { 2: "a proper cottage", 3: "a cottage with an annex", 4: "two whole storeys, and a plaque" };
  const c2 = yield* ask(g, "gander", `Your paid-off shack does look a little small, dear. I've got you down for ${names[w.player.homeTier + 1]}. ${cost.toLocaleString("en-US")} beans. Sign here.`, ["Sign", "Not yet"]);
  if (c2 !== 0) return;
  upgradeHome(g);
  g.sound("debtPaid");
  yield* say(g, "gander", "It'll be up by the time you've walked back. Don't ask. I own some very fast people, dear.");
}
function* paintFlow(g) {
  const w = g.world;
  const colors = ["orange", "sand", "white", "sky", "lime", "plum", "teal", "red"];
  const c2 = yield* menuChoice(g, "Paint job: 1,000 beans", ["Walls", "Roof", "Never mind"], { id: "paint" });
  if (c2 < 0 || c2 === 2) return;
  const names = colors.map((x) => x[0].toUpperCase() + x.slice(1));
  const k = yield* menuChoice(g, c2 === 0 ? "Wall colour" : "Roof colour", names, { id: "paintColour" });
  if (k < 0) return;
  if (w.player.beans < 1e3) {
    yield* say(g, "gander", HOSTS.gander.noBeans[0]);
    return;
  }
  spend(g, 1e3);
  if (c2 === 0) w.home.wallColor = colors[k];
  else w.home.roofColor = colors[k];
  g.town.refreshHome();
  g.sound("bean");
  g.events.emit("painted", {});
  yield* say(g, "gander", "Noted, dear. It will look exactly the way you think it will.");
}
function* appraise(g, i) {
  const w = g.world;
  const s = new Stream(`${w.seed}:appraise:${w.flags.appraised ?? 0}`);
  w.flags.appraised = (w.flags.appraised ?? 0) + 1;
  const missing = FOSSILS.filter((f2) => !w.museum.fossil[f2.id] && !w.player.pockets.some((p) => p?.id === f2.id));
  const pool = missing.length ? missing : FOSSILS;
  const f = s.pick(pool);
  yield* say(g, "quill", `${hostLine(g, "quill", "fossil")}a ${f.name}! ${f.line}`);
  w.player.pockets[i] = { id: f.id };
  w.almanac.fossil[f.id] = (w.almanac.fossil[f.id] ?? 0) + 1;
  g.events.emit("appraised", { id: f.id });
  g.sound("revealQuick");
}
function* donate(g) {
  const w = g.world;
  const i = yield* waitPick(g, { title: "Donate what?", filter: (s) => {
    const it2 = ITEMS[s.id];
    return it2?.cat === "fish" && !it2.noMuseum || it2?.cat === "bug" || it2?.cat === "fossil" || it2?.cat === "art";
  } });
  if (i < 0) return;
  const slot = w.player.pockets[i];
  const it = ITEMS[slot.id];
  if (it.forged) {
    yield* say(g, "quill", HOSTS.quill.forged[w.flags.forgeShown ? 1 : 0]);
    w.flags.forgeShown = true;
    remember(g, "forgery", {});
    g.events.emit("forgeryRefused", { id: slot.id });
    return;
  }
  const wing = it.cat === "fossil" ? "fossil" : it.cat;
  const m = w.museum[wing];
  if (m[slot.id]) {
    yield* say(g, "quill", hostLine(g, "quill", "already"));
    return;
  }
  removeSlot(g, i);
  m[slot.id] = true;
  if (it.cat === "art") w.almanac.art[slot.id] = true;
  g.actorOf("quill").play("QuillBall", 0.1, { once: false });
  g.sound("reveal");
  g.events.emit("donated", { id: slot.id, wing });
  yield* say(g, "quill", hostLine(g, "quill", "donate"));
  g.actorOf("quill").play("Idle", 0.2);
  const total = { fish: FISH.length, bug: BUGS.length, fossil: FOSSILS.length, art: ART.length }[wing];
  if (Object.keys(m).length >= total && !w.museum.plaques[wing]) {
    w.museum.plaques[wing] = true;
    yield* say(g, "quill", HOSTS.quill.wing[0]);
    g.events.emit("wingFull", { wing });
    sendMail(g, { from: "museum", body: `Dear ${misspell(w.player.name)},
There's a plaque with your name on it. I've checked the spelling, and I've checked it again, and I've got it down as "${misspell(w.player.name)}".
Dr. Quill` });
  }
}
var misspell = (n) => n.length < 3 ? `${n}${n}` : `${n.slice(0, -1)}${n[n.length - 1] === "e" ? "a" : "e"}${n.length % 2 ? "h" : ""}`;

// src/systems/venues.js
init_say();
init_lines();
init_hosts();
init_items();
init_economy();
init_clothes();
init_rng();
init_lookEditor();
init_pockets();
init_mail();
init_memory();
init_rating();
init_art();
init_furniture();

// src/ui/screens/auction.js
init_draw();
init_icons();
init_items();
init_rng();
init_economy();
init_lines();
init_furniture();
init_clothes();
init_art();
init_memory();
var BIDDERS = ["the newt in the good hat", "the weasel", "a heron with a lot of opinions"];
function auctionLots(w) {
  const s = new Stream(`${w.seed}:lots:${w.clock.day}`);
  const fur = s.shuffle(FURNITURE.filter((f) => !f.notForSale));
  const clo = s.shuffle(CLOTHES.filter((c2) => !c2.couture));
  const lots = [fur[0].id, clo[0].id, fur[1].id];
  if (s.chance(0.3)) lots[2] = s.pick(ART).id;
  return lots.map((id) => {
    const base = Math.round((ITEMS[id].price ?? 1e3) * 0.5);
    const limits = BIDDERS.map(() => Math.round(base * s.range(1.1, 2.4)));
    return { id, start: base, limits };
  });
}
function consignResult(w, id, sell) {
  const s = new Stream(`${w.seed}:consign:${w.clock.day}:${id}`);
  return { price: Math.round(sell * s.range(0.9, 2.6)), buyer: s.pick(BIDDERS) };
}
var Auction = class {
  constructor(g, onDone) {
    this.id = "auction";
    this.onDone = onDone;
    this.lots = auctionLots(g.world);
    this.i = 0;
    this.setupLot(g);
    this.line = hostLine(g, "pemberton", "going");
  }
  setupLot(g) {
    const l = this.lots[this.i];
    this.bid = l.start;
    this.leader = "nobody";
    this.mine = false;
    this.clock = 4.6;
    this.aiT = 1.2;
    this.state = "open";
    this.step = Math.max(50, Math.round(l.start * 0.1 / 50) * 50);
    g.auction = { current: l };
  }
  labels() {
    return this.lots.map((l) => ITEMS[l.id].name);
  }
  focusIndex() {
    return this.i;
  }
  currentText() {
    return `${this.bid}:${this.leader}`;
  }
  raise(g) {
    const w = g.world;
    const next = this.bid + this.step;
    if (w.player.beans < next) {
      g.sound("uiError");
      this.line = "You-don't-have-that-sit-down-please-next!";
      return;
    }
    this.bid = next;
    this.leader = "you";
    this.mine = true;
    this.clock = 3.8;
    this.aiT = 0.9;
    g.sound("paddle");
    g.player.play("Paddle", 0.05, { once: true });
    g.player.poseTimer = 0.4;
    g.events.emit("bidPlaced", { bid: this.bid });
    this.line = "A new bid! From the small round one! Oh you're serious!";
  }
  update(g, inp, dt) {
    const m = inp.mouse;
    if (this.state === "open") {
      if (inp.confirm || m.click && inRect(m, 180, 196, 120, 24)) this.raise(g);
      this.clock -= dt;
      this.aiT -= dt;
      const l = this.lots[this.i];
      if (this.aiT <= 0) {
        this.aiT = 0.9 + this.bid * 13 % 9 / 10;
        const next = this.bid + this.step;
        const able = BIDDERS.map((b, k) => ({ b, limit: l.limits[k] })).filter((x) => x.limit >= next && x.b !== this.leader);
        if (able.length) {
          const who = able[(this.bid + this.i) % able.length];
          this.bid = next;
          this.leader = who.b;
          this.mine = false;
          this.clock = 3.8;
          g.sound("paddle", { volume: 0.5 });
          this.line = `${who.b[0].toUpperCase()}${who.b.slice(1)} bids!`;
        }
      }
      if (this.clock < 2.4 && this.clock > 2.4 - dt) this.line = "Going once!";
      if (this.clock < 1.2 && this.clock > 1.2 - dt) this.line = "Going twice!";
      if (this.clock <= 0) {
        this.state = "hammer";
        this.t = 1.6;
        g.sound("gavel");
        g.rumble(0.5, 120);
        if (this.mine) {
          const lot = this.lots[this.i];
          spend(g, this.bid);
          if (hasRoom(g.world)) addItem(g, lot.id);
          else g.world.mail.pending.push({ from: "auction", body: "Your-pockets-were-full-so-we-posted-it-mind-how-you-go.\nPemberton", gift: lot.id, arriveDay: g.world.clock.day + 1 });
          g.world.player.catalog[lot.id] = true;
          g.world.stats.auctionWins = (g.world.stats.auctionWins ?? 0) + 1;
          remember(g, "auction", { item: ITEMS[lot.id].name });
          g.events.emit("auctionWon", { id: lot.id, bid: this.bid });
          this.line = hostLine(g, "pemberton", "sold");
        } else {
          this.line = this.leader === "nobody" ? "No-takers-no-takers-it-goes-back-in-the-box!" : hostLine(g, "pemberton", "lost");
          g.events.emit("auctionLost", {});
        }
      }
    } else {
      this.t -= dt;
      if (this.t <= 0) {
        this.i++;
        if (this.i >= this.lots.length) {
          g.ui.pop(this);
          g.auction = null;
          this.onDone();
          return;
        }
        this.setupLot(g);
        this.line = "Next-lot-next-lot-next-lot!";
      }
    }
    if (inp.back || m.rclick) {
      g.sound("uiCancel");
      g.auction = null;
      g.ui.pop(this);
      this.onDone();
    }
  }
  prompts() {
    return this.state === "open" ? [["confirm", `Raise paddle to ${(this.bid + this.step).toLocaleString("en-US")}`], ["back", "Leave"]] : null;
  }
  draw(g, hud) {
    const l = this.lots[this.i];
    const it = ITEMS[l.id];
    panel(hud, 30, 18, 160, 96, { fill: "white", trim: "sand" });
    drawText(hud, 110, 26, `Lot ${this.i + 1} of 3`, { align: "center", color: "slate" });
    drawIcon(hud, 86, 38, it.icon, it.iconColors, 3);
    drawText(hud, 110, 92, it.name.length > 22 ? `${it.name.slice(0, 22)}…` : it.name, { align: "center", color: "ink" });
    panel(hud, 290, 18, 160, 96, { fill: "white", trim: "sand" });
    drawText(hud, 370, 26, "Bid", { align: "center", color: "slate" });
    drawText(hud, 370, 38, this.bid.toLocaleString("en-US"), { align: "center", color: "ink", scale: 2 });
    drawText(hud, 370, 62, this.mine ? "That's you!" : this.leader === "nobody" ? "Nobody yet" : this.leader.slice(0, 26), { align: "center", color: this.mine ? "green" : "plum" });
    bar(hud, 306, 80, 128, 8, Math.max(0, this.clock) / 4.6, this.clock < 1.2 ? "red" : "orange");
    drawText(hud, 370, 94, `You have ${g.world.player.beans.toLocaleString("en-US")}`, { align: "center", color: "slate" });
    panel(hud, 60, 150, 360, 34, { fill: "white", trim: "sky" });
    textBlock(hud, 70, 156, 340, this.line, { color: "ink" });
    if (this.state === "open") {
      panel(hud, 180, 196, 120, 24, { fill: "sand", trim: "orange" });
      drawText(hud, 240, 204, "Paddle up!", { align: "center", color: "ink" });
    }
  }
};
var auctionScreen = (g, onDone) => new Auction(g, onDone);

// src/ui/screens/compare.js
init_draw();
init_items();
init_art();

// src/art/paintings.js
init_engine();
var full2 = (c2) => ({ path: "M0 0H32V24H0Z", fill: c2 });
var P2 = (d, fill) => ({ path: d, fill });
var pal = { sky: "sky", blue: "blue", navy: "navy", ink: "ink", white: "white", sand: "sand", orange: "orange", red: "red", plum: "plum", green: "green", lime: "lime", teal: "teal", mist: "mist", slate: "slate", night: "night", cyan: "cyan" };
var LAYERS = {
  monaLlama: [full2("teal"), P2("M0 16H32V24H0Z", "green"), P2("M9 24C9 16 12 14 16 14C20 14 23 16 23 24Z", "plum"), P2("M13 15V8C13 6 19 6 19 8V15Z", "white"), P2("M12 3L14 7H12ZM20 3L18 7H20Z", "white"), P2("M13 9H15V10H13ZM17 9H19V10H17Z", "ink"), P2("M14 12H18V13H14Z", "plum")],
  gooseEarring: [full2("ink"), P2("M12 24C12 17 14 15 16 15C22 15 24 18 24 24Z", "white"), P2("M15 16V9C15 6 22 6 22 9C22 12 19 11 19 16Z", "white"), P2("M22 9L27 10L22 11Z", "orange"), P2("M18 8H19V9H18Z", "ink"), P2("M14 5H24V7H14Z", "blue"), P2("M13 7H16V10H13Z", "sand")],
  greatWave: [full2("sand"), P2("M0 18C6 18 8 6 16 5C22 4 24 9 21 11C19 9 16 10 16 13C18 16 24 15 32 18V24H0Z", "navy"), P2("M13 5C16 3 22 4 24 8L21 8C20 6 16 6 13 8Z", "white"), P2("M14 21C16 20 18 20 20 21L19 23H15Z", "red"), P2("M26 5L30 10H22Z", "white")],
  starryBus: [full2("navy"), P2("M0 18H32V24H0Z", "night"), P2("M6 14H20V20H6Z", "sky"), P2("M8 15H11V17H8ZM13 15H16V17H13Z", "cyan"), P2("M8 20H10V21H8ZM16 20H18V21H16Z", "ink"), P2("M24 12H25V20H24Z", "slate"), P2("M22 10H27V13H22Z", "orange"), P2("M4 4H6V6H4ZM12 2H14V4H12ZM20 5H22V7H20ZM27 2H29V4H27ZM9 8H10V9H9Z", "sand"), P2("M0 7C6 3 11 11 16 7C21 3 26 11 32 7V8C26 12 21 4 16 8C11 12 6 4 0 8Z", "blue")],
  venusFlytrap: [full2("sky"), P2("M0 18H32V24H0Z", "teal"), P2("M8 22C8 16 24 16 24 22Z", "sand"), P2("M10 20H11V22H10ZM13 19H14V22H13ZM16 18H17V22H16ZM19 19H20V22H19ZM22 20H23V22H22Z", "orange"), P2("M14 17V10H18V17Z", "green"), P2("M11 5L16 10L21 5L21 8L16 12L11 8Z", "lime"), P2("M11 5L13 7L14 5L16 8L18 5L19 7L21 5L21 6L11 6Z", "white"), P2("M3 4H8V6H3Z", "white")],
  theHonk: [full2("orange"), P2("M0 5C8 2 14 8 22 5C26 4 30 6 32 4V0H0Z", "red"), P2("M0 10C8 7 14 12 32 8V5C14 9 8 5 0 8Z", "sand"), P2("M0 24L18 12H32V14H22L10 24Z", "plum"), P2("M12 24V16C12 12 18 12 18 16V24Z", "night"), P2("M13 8C13 4 19 4 19 8C19 12 13 12 13 8Z", "white"), P2("M15 9H17V12H15Z", "ink"), P2("M14 7H15V8H14ZM17 7H18V8H17Z", "ink"), P2("M26 11H27V14H26ZM29 11H30V14H29Z", "ink")],
  whistlersMoose: [full2("mist"), P2("M0 18H32V24H0Z", "slate"), P2("M4 4H12V12H4Z", "night"), P2("M5 5H11V11H5Z", "white"), P2("M16 24V13C16 11 26 11 26 15V24Z", "ink"), P2("M13 6H21V14H13Z", "plum"), P2("M9 3H14V5H9ZM20 3H25V5H20Z", "sand"), P2("M12 2H14V6H12ZM20 2H22V6H20Z", "sand"), P2("M14 12H20V14H14Z", "ink"), P2("M8 5H12V8H8Z", "red")],
  cheeseDelights: [full2("sky"), P2("M0 16H32V24H0Z", "lime"), P2("M6 8H26V20H6Z", "sand"), P2("M6 8H26V10H6Z", "orange"), P2("M10 12H13V15H10ZM19 11H23V15H19ZM14 16H17V19H14Z", "orange"), P2("M2 20H5V22H2ZM27 19H30V22H27Z", "plum"), P2("M0 0H6V6H0Z", "white"), P2("M26 2C28 0 30 2 32 2V6H26Z", "red")]
};
var FORGE = {
  monaLlama: (l) => [...l, P2("M12 11H13V13H12ZM19 11H20V13H19Z", "sand")],
  gooseEarring: (l) => l,
  greatWave: (l) => l.filter((x) => x.fill !== "red"),
  starryBus: (l) => l.map((x) => x.fill === "sand" ? P2("M4 4H6V6H4ZM12 2H14V4H12ZM27 2H29V4H27ZM9 8H10V9H9Z", "sand") : x),
  venusFlytrap: (l) => l.map((x) => x.fill === "sand" ? P2("M8 18C8 24 24 24 24 18Z", "sand") : x),
  theHonk: (l) => l.filter((x) => !(x.fill === "ink" && x.path.startsWith("M26"))),
  whistlersMoose: (l) => l.filter((x) => x.fill !== "red"),
  cheeseDelights: (l) => l.filter((x) => !(x.fill === "orange" && x.path.startsWith("M10")))
};
LAYERS.gooseEarring.push(P2("M20 14H21V16H20Z", "white"));
FORGE.gooseEarring = (l) => l.slice(0, -1);
var make = (id, layers) => (0, engine_exports.textureDef)({ id: `art-${id}`, about: `Painting: ${id}`, tags: ["surface", "art"], size: [32, 24], palette: pal, layers });
var PAINTINGS = Object.entries(LAYERS).flatMap(([id, l]) => [make(id, l), make(`${id}F`, FORGE[id](l))]);
var installed = false;
var install = () => {
  if (installed) return;
  installed = true;
  for (const t of PAINTINGS) engine_exports.TEXTURE_LIBRARY.add(t);
};
var cache4 = /* @__PURE__ */ new Map();
function paintingMaterial(itemId) {
  install();
  let m = cache4.get(itemId);
  if (!m) {
    m = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: (0, engine_exports.textureMap)(`art-${itemId}`) });
    cache4.set(itemId, m);
  }
  return m;
}

// src/art/paintingSprites.js
init_engine();
var NAMES = Object.keys(engine_exports.PALETTE);
var cache5 = /* @__PURE__ */ new Map();
var HEX = Object.fromEntries(NAMES.map((n) => [engine_exports.PALETTE[n], n]));
function nearest(r, g, b) {
  let best = "ink", bd = 1e9;
  for (const n of NAMES) {
    const h = engine_exports.PALETTE[n];
    const d = ((h >> 16 & 255) - r) ** 2 + ((h >> 8 & 255) - g) ** 2 + ((h & 255) - b) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}
function paintingSprite(id) {
  if (cache5.has(id)) return cache5.get(id);
  const def = PAINTINGS.find((p) => p.id === `art-${id}`);
  const baked = (0, engine_exports.bakeTexture)(def);
  const w = baked.width, h = baked.height;
  const data = baked.rgba;
  const chars = "abcdefghijklmnop";
  const colors = {};
  NAMES.forEach((n, i) => {
    colors[chars[i]] = n;
  });
  const S2 = 5;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let line2 = "";
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const name = nearest(data[o], data[o + 1], data[o + 2]);
      line2 += chars[NAMES.indexOf(name)].repeat(S2);
    }
    for (let k = 0; k < S2; k++) rows.push(line2);
  }
  const out = { rows, colors };
  cache5.set(id, out);
  return out;
}

// src/ui/screens/compare.js
var Compare = class {
  constructor(g, stock, onClose) {
    this.id = "compare";
    this.stock = stock;
    this.onClose = onClose;
    this.t = 0;
  }
  update(g, inp, dt) {
    this.t += dt;
    if (inp.back || inp.confirm || inp.mouse.click || inp.mouse.rclick) {
      g.sound("uiCancel");
      g.ui.pop(this);
      this.onClose?.();
    }
  }
  currentText() {
    return this.stock.id;
  }
  prompts() {
    return [["back", "Close"]];
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 40, 30, 400, 190, { fill: "white", trim: "sand" });
    const it = ITEMS[this.stock.id];
    const genuine = ART.find((a) => a.id === (it.of ?? it.id));
    drawText(hud, 240, 38, genuine.name, { align: "center", color: "ink" });
    drawText(hud, 140, 54, "Catalogue print", { align: "center", color: "slate" });
    drawText(hud, 340, 54, "On the easel", { align: "center", color: "slate" });
    const left = paintingSprite(genuine.id);
    const right = paintingSprite(this.stock.id);
    hud.sprite(140 - 88, 66, left.rows, left.colors, { shadow: false, scale: 1 });
    hud.sprite(340 - 88, 66, right.rows, right.colors, { shadow: false, scale: 1 });
    drawText(hud, 240, 204, "Look closely. Magda is pretending not to watch.", { align: "center", color: "plum" });
  }
};
var compareScreen = (g, stock, onClose) => new Compare(g, stock, onClose);

// src/ui/screens/theatre.js
init_draw();
init_rng();
var SKETCHES = [
  { setup: ["Knock knock.", "Who's there?", "The tax office.", "The tax office who?"], punch: "NO. WE ask the questions." },
  { setup: ["Doctor, doctor!", "I think I'm a goose.", "How long has this been going on?", "Since I was an egg."], punch: "That will be forty beans." },
  { setup: ["To be, or not to be.", "I said: to be, or not to be.", "Sir, this is a queue.", "Very well. Which one is it for?"], punch: "To be. It's always to be. It's the only window open." },
  { setup: ["My horse! My horse!", "My kingdom for a horse!", "We have a llama, sir.", "Does it know the way to Bosworth?"], punch: "It knows the way. It would prefer not." },
  { setup: ["Alas, poor Morris!", "I knew him, Horatio.", "That is a turnip, sir.".replace("turnip", "potato"), "I knew him well."], punch: "It has his eyes." },
  { setup: ["Is this a dagger I see before me?", "No, my lord. It is a very long spoon.", "Does it have a point?", "That is what I keep asking the playwright."], punch: "He says the soup is the point." }
];
var Theatre = class {
  constructor(g, onDone) {
    this.id = "theatre";
    this.onDone = onDone;
    this.s = new Stream(`${g.world.seed}:sketch:${g.world.clock.day}`).pick(SKETCHES);
    this.line = 0;
    this.t = 0;
    this.state = "setup";
    this.result = null;
    this.window = 0;
  }
  currentText() {
    return this.state === "punch" ? this.s.punch : this.s.setup[this.line] ?? "";
  }
  update(g, inp, dt) {
    this.t += dt;
    const press = inp.confirm || inp.mouse.click;
    const bellows = g.actorOf("bellows");
    if (this.state === "setup") {
      if (this.t > 1.6) {
        this.t = 0;
        this.line++;
        if (bellows) bellows.play(this.line % 2 ? "Talk" : "Bow", 0.1, { once: true });
        if (this.line >= this.s.setup.length) {
          this.state = "punch";
          this.t = 0;
          g.sound("uiTab");
        }
      }
      if (press) {
        this.state = "done";
        this.result = { won: false, early: true };
        this.t = 0;
        g.sound("uiCancel");
        g.events.emit("laughed", { hit: false });
      }
    } else if (this.state === "punch") {
      if (press) {
        this.state = "done";
        this.result = { won: true };
        this.t = 0;
        g.sound("applause");
        g.sound("laugh");
        g.player.play("Laugh", 0.05, { once: true });
        if (bellows) bellows.play("Bow", 0.1, { once: true });
        g.events.emit("laughed", { hit: true });
      }
      if (this.t > 2.4) {
        this.state = "done";
        this.result = { won: false };
        this.t = 0;
        g.events.emit("laughed", { hit: false });
      }
    } else if (this.t > 1.1) {
      g.ui.pop(this);
      this.onDone(this.result);
    }
  }
  prompts() {
    return this.state === "done" ? null : [["confirm", "LAUGH"]];
  }
  draw(g, hud) {
    panel(hud, 60, 196, 360, 40, { fill: "white", trim: "red" });
    const text = this.state === "done" ? this.result.won ? "The house comes down. It is only you, but still." : "A long silence. Somebody coughs in another room." : this.currentText();
    textBlock(hud, 72, 204, 336, text, { color: this.state === "punch" ? "red" : "ink" });
    if (this.state === "punch") bar(hud, 72, 228, 336, 3, 1 - this.t / 2.4, "red");
  }
};
var theatreScreen = (g, onDone) => new Theatre(g, onDone);

// src/systems/venues.js
init_numbers();
init_time();
init_emote();
var FASHION_THEMES = [
  { name: "Something damp", tags: ["damp", "nautical"] },
  { name: "Formal, but sorry about it", tags: ["formal", "drab"] },
  { name: "Loud enough to hear from the bus", tags: ["loud", "dramatic"] },
  { name: "Cosy to the point of concern", tags: ["cosy", "wool", "sleepy"] },
  { name: "Money", tags: ["money", "formal"] },
  { name: "Leafy", tags: ["leafy", "plain"] },
  { name: "A person who sleeps well", tags: ["sleepy", "plain"] },
  { name: "Cheese, obviously", tags: ["cheese", "loud"] },
  { name: "Tragedy", tags: ["dramatic", "drab"] },
  { name: "Ready for anything but this", tags: ["practical", "sporty"] }
];
function fashionScore(look, theme) {
  const tags = /* @__PURE__ */ new Set();
  for (const k of ["outfit", "hatItem", "glassesItem", "umbrella"]) {
    const it = ITEMS[look[k]];
    for (const t of it?.tags ?? []) tags.add(t);
  }
  let hits = 0;
  for (const t of theme.tags) if (tags.has(t)) hits++;
  let score = hits * 2;
  if (ITEMS[look.outfit]?.couture) score += 1;
  if (look.hatItem) score += 1;
  if (tags.has("couture")) score += 1;
  if (look.outfit === "tatteredShirt") score -= 1;
  return { score: Math.max(0, Math.min(5, score)), hits, tags: [...tags] };
}
var hatCommentary = (look) => ITEMS[look.hatItem] ? `The ${ITEMS[look.hatItem].name}. Well. It's on your head, and I suppose that's somewhere.` : "No hat. Bold. Bold in the way a cliff is bold.";
var VENUES = {
  *salonChair(g, t) {
    const w = g.world;
    const a = g.actorOf("fleece");
    a.play("Talk", 0.15);
    const c2 = yield* ask(g, "fleece", hostLine(g, "fleece", "greet"), ["A cut, please. 800 beans.", "Just the gossip", "Never mind"]);
    if (c2 === 1) {
      yield* say(g, "fleece", hostLine(g, "fleece", "gossip"));
      return;
    }
    if (c2 !== 0) return;
    if (w.player.beans < 800) {
      yield* say(g, "fleece", "Ah, non. For this money I can only look at it sadly. I am doing it now.");
      return;
    }
    const before = JSON.stringify(w.player.look);
    const seat = t.prop;
    g.player.x = seat.x;
    g.player.z = seat.z + 0.55;
    g.player.facing = 0;
    g.player.turnTo = null;
    g.sound("scissors");
    const changed = yield* lookEditor(g, { title: "Snip & Gossip", turntable: true, hairOnly: true });
    if (changed && JSON.stringify(w.player.look) !== before) {
      spend(g, 800);
      g.sound("scissors");
      g.events.emit("haircut", {});
      yield* say(g, "fleece", [hostLine(g, "fleece", "done"), hostLine(g, "fleece", "gossip")]);
    }
  },
  *coutureRail(g) {
    const w = g.world;
    if (w.player.plumes < 3) {
      yield* say(g, "flavia", "Darling. That rail is for people with three plumes. You are not one of them, in several senses.");
      return;
    }
    yield* say(g, "flavia", hostLine(g, "flavia", "rope"));
    const stock = [...CLOTHES, ...HAT_ITEMS, ...UMBRELLAS].filter((c3) => c3.couture && !w.flags[`bought:couture:${c3.id}`]);
    if (!stock.length) {
      yield* say(g, "flavia", "You've bought it all. There's nothing left for you to be wrong in.");
      return;
    }
    const labels = stock.slice(0, 5).map((s) => `${s.name}: ${s.price.toLocaleString("en-US")}`);
    labels.push("Never mind");
    const c2 = yield* menuChoiceFree(g, "The couture rail", labels);
    if (c2 < 0 || c2 >= stock.length || c2 >= 5) return;
    const it = stock[c2];
    if (w.player.beans < it.price) {
      yield* say(g, "flavia", "You can't afford to be that person yet.");
      return;
    }
    if (!hasRoom(w)) {
      yield* say(g, "flavia", "Your pockets are full. Of what? No. Do not tell me.");
      return;
    }
    spend(g, it.price);
    addItem(g, it.id);
    w.flags[`bought:couture:${it.id}`] = true;
    g.sound("plume");
    g.events.emit("bought", { id: it.id, price: it.price });
  },
  *hostTalkFlavia(g) {
    yield* VENUES.fashionCheck(g);
  },
  *fashionCheck(g) {
    const w = g.world;
    const s = new Stream(`${w.seed}:theme:${w.clock.day}`);
    const theme = s.pick(FASHION_THEMES);
    const a = g.actorOf("flavia");
    if (w.player.fashionDay === w.clock.day) {
      yield* say(g, "flavia", "I've seen you today. I'm still recovering. Come back tomorrow, in something else.");
      return;
    }
    a.play("Talk", 0.15);
    const c2 = yield* ask(g, "flavia", [hostLine(g, "flavia", "greet")].join("//") + `//Today's theme: "${theme.name}". Shall I look at you?`, ["Judge me", "Not yet"]);
    if (c2 !== 0) return;
    const look = w.player.look;
    yield* say(g, "flavia", [hostLine(g, "flavia", "judge"), ITEMS[look.outfit] ? `The ${ITEMS[look.outfit].name}. ${ITEMS[look.outfit].tags?.includes(theme.tags[0]) ? "Yes. I see what you were reaching for." : "I see what you were running from."}` : "Nothing about that makes sense.", hatCommentary(look)]);
    const r = fashionScore(look, theme);
    w.player.fashionDay = w.clock.day;
    for (let i = 0; i < r.score; i++) {
      g.sound("plume");
      yield 0.35;
    }
    a.play(r.score >= 3 ? "Nod" : "ShakeHead", 0.1, { once: true });
    yield* say(g, "flavia", HOSTS.flavia[`result${r.score}`]);
    const before = w.player.plumes;
    w.player.plumes = Math.max(before, r.score);
    w.player.plumesTotal = (w.player.plumesTotal ?? 0) + r.score;
    remember(g, "fashion", { item: String(r.score) });
    g.events.emit("fashionChecked", { score: r.score, theme: theme.name });
    if (w.player.plumes >= 3 && before < 3) yield* say(g, "flavia", hostLine(g, "flavia", "rope"));
  },
  *magdaCounter(g) {
    const w = g.world;
    const a = g.actorOf("magda");
    const c2 = yield* ask(g, "magda", hostLine(g, "magda", "greet"), ["Rare furniture?", "Chat", "Goodbye"]);
    if (c2 === 0) {
      const rare = FURNITURE.filter((f) => f.rare && !w.flags[`bought:rare:${f.id}`]);
      if (!rare.length) {
        yield* say(g, "magda", "Sold out. Wagon's been very careful lately.");
        return;
      }
      const it = rare[w.clock.day % rare.length];
      const price = it.price;
      const b = yield* ask(g, "magda", `${hostLine(g, "magda", "rare")}//${it.name}. ${price.toLocaleString("en-US")} beans.`, ["Buy it", "No"]);
      if (b === 0) {
        if (w.player.beans < price || !hasRoom(w)) {
          yield* say(g, "magda", "Come back when you can carry it, and pay for it. In that order, ideally.");
          return;
        }
        spend(g, price);
        addItem(g, it.id);
        w.flags[`bought:rare:${it.id}`] = true;
        g.sound("bean");
        g.events.emit("bought", { id: it.id, price });
      }
    } else if (c2 === 1) yield* say(g, "magda", hostLine(g, "magda", "idle"));
    if (a === null) yield;
  },
  *magdaLook(g, t) {
    const w = g.world;
    const s = t.stock;
    const it = ITEMS[s.id];
    if (w.flags[`bought:${w.clock.day}:${s.id}`]) {
      yield* narrate(g, "An empty easel. It looks relieved.");
      return;
    }
    const c2 = yield* ask(g, "magda", `${it.name}. ${s.price.toLocaleString("en-US")} beans. ${hostLine(g, "magda", "sell")}`, ["Buy it", "Compare with the print", "Leave it"]);
    if (c2 === 1) {
      let closed = false;
      g.ui.push(compareScreen(g, s, () => {
        closed = true;
      }));
      while (!closed) yield;
      g.events.emit("compared", { id: s.id, forged: !!it.forged });
      return;
    }
    if (c2 !== 0) return;
    if (w.player.beans < s.price) {
      yield* say(g, "magda", "No. Beans first. Then the painting. Then we've never met.");
      return;
    }
    if (!hasRoom(w)) {
      yield* say(g, "magda", "Pockets full. It does not fold. Well. It does once.");
      return;
    }
    spend(g, s.price);
    addItem(g, s.id);
    w.flags[`bought:${w.clock.day}:${s.id}`] = true;
    g.sound("bean");
    g.place.refreshDynamic();
    g.events.emit("boughtArt", { id: s.id, forged: !!it.forged });
    yield* say(g, "magda", hostLine(g, "magda", "sold"));
  },
  *catalogueCompare(g) {
    const stock = g.life.magdaStock();
    let closed = false;
    g.ui.push(compareScreen(g, stock[0], () => {
      closed = true;
    }));
    while (!closed) yield;
  },
  *theatreSeat(g, t) {
    const w = g.world;
    if (w.flags.theatreDay === w.clock.day) {
      yield* say(g, "bellows", "One show a day! My throat is a delicate instrument, and also it's insured!");
      return;
    }
    g.player.x = t.prop.x;
    g.player.z = t.prop.z - 0.1;
    g.player.facing = Math.PI;
    g.player.turnTo = null;
    g.player.play("Sit", 0.12);
    g.player.locked = true;
    yield* say(g, "bellows", [hostLine(g, "bellows", "greet"), hostLine(g, "bellows", "sketch")]);
    let result = null;
    g.ui.push(theatreScreen(g, (r) => {
      result = r;
    }));
    while (result === null) yield;
    w.flags.theatreDay = w.clock.day;
    g.player.locked = false;
    g.player.z = t.prop.z + 0.8;
    g.player.play("Idle", 0.15);
    if (result.won) {
      const left = ALL_EMOTES.filter((e) => !w.player.emotes.includes(e));
      if (left.length) {
        const em = left[w.clock.day % left.length];
        w.player.emotes.push(em);
        g.sound("reveal");
        yield* say(g, "bellows", hostLine(g, "bellows", "win"));
        g.ui.toastMsg(`You learned an emote: ${em}!`);
        g.events.emit("emoteLearned", { em });
      } else yield* say(g, "bellows", "You know everything I do! Get out! Bravo!");
    } else yield* say(g, "bellows", hostLine(g, "bellows", "miss"));
  },
  *auctionStart(g) {
    const w = g.world;
    const h = hourNow(w);
    if (w.flags.auctionDay === w.clock.day) {
      yield* say(g, "pemberton", "That's-it-that's-all-three-lots-gone-see-you-tomorrow-go-home-I-have-to-lie-down!");
      return;
    }
    yield* say(g, "pemberton", hostLine(g, "pemberton", "greet"));
    let done = false;
    g.ui.push(auctionScreen(g, () => {
      done = true;
    }));
    while (!done) yield;
    w.flags.auctionDay = w.clock.day;
    if (h < 0) yield;
  },
  *consign(g) {
    const w = g.world;
    if (w.flags.consignedDay === w.clock.day) {
      yield* say(g, "pemberton", "One-box-a-day-one-box-a-day-it-is-a-very-small-box!");
      return;
    }
    let picked = -2;
    g.ui.push(pocketsPicker(g, { title: "Consign what?", filter: (s) => {
      const it2 = ITEMS[s.id];
      return !!it2 && it2.cat !== "quest" && it2.cat !== "tool" && it2.cat !== "bag";
    }, onPick: (i) => {
      picked = i;
    }, onCancel: () => {
      picked = -1;
    } }));
    while (picked === -2) yield;
    if (picked < 0) return;
    const slot = removeSlot(g, picked);
    const it = ITEMS[slot.id];
    const r = consignResult(w, slot.id, sellPrice(g, slot));
    sendMail(g, { from: "auction", body: `Dear-Sir-Madam-Or-Other,
Your ${it.name} sold for ${r.price.toLocaleString("en-US")} beans to ${r.buyer}! Congratulations! We've kept a little! Enclosed is the rest!
Pemberton`, gift: { beans: r.price }, arriveDay: w.clock.day + 1 });
    w.flags.consignedDay = w.clock.day;
    g.sound("stamp");
    g.events.emit("consigned", { id: slot.id, price: r.price });
    yield* say(g, "pemberton", "In-the-box-in-the-box-result-by-post-mind-the-step!");
  },
  *brisketDesk(g) {
    const w = g.world;
    yield* say(g, "brisket", hostLine(g, "brisket", "greet"));
    const c2 = yield* ask(g, "brisket", "State your business.", ["Critique my home", "How is it scored?", "Any rewards for me?", "Goodbye"]);
    if (c2 === 0) {
      const r = scoreHome(w);
      const grade = gradeOf(r.score);
      yield* say(g, "brisket", [`I've seen your home. ${r.score} points. That's grade ${grade.g}.`, hostLine(g, "brisket", "critique")]);
      g.events.emit("critiqued", { score: r.score, grade: grade.g });
    } else if (c2 === 1) {
      yield* say(g, "brisket", ["Points for what things are worth. Bonus for four or more from a set. Harmony in your wood. Cosy rules: a lamp by a seat, a rug under a table, something growing.", "Music playing, that's a bonus. Clutter loses you points. We score on Show Day nights, and the result comes by mail. We know where you live. That's the job."]);
    } else if (c2 === 2) {
      const bi = GRADES.findIndex((x) => x.g === w.home.bestGrade);
      if (bi < 0) {
        yield* say(g, "brisket", "No grade on file. Wait for a Show Day night. Tidy something.");
        return;
      }
      const claimed = w.flags.bureauClaim ?? -1;
      if (claimed >= bi) {
        yield* say(g, "brisket", "You've had what you're owed. Improve.");
        return;
      }
      const reward = GRADES[bi].reward;
      if (!hasRoom(w)) {
        yield* say(g, "brisket", "Your pockets are a disgrace. Empty them.");
        return;
      }
      addItem(g, reward);
      w.flags.bureauClaim = bi;
      g.sound("reveal");
      g.events.emit("bureauReward", { reward });
      yield* say(g, "brisket", hostLine(g, "brisket", "reward"));
    }
  },
  *louCounter(g) {
    const w = g.world;
    const a = g.actorOf("lou");
    const c2 = yield* ask(g, "lou", hostLine(g, "lou", "greet"), ["House Blend: 200", "Morning Regret: 350", "The Slow One: 500", "Nothing"]);
    if (c2 < 0 || c2 === 3) return;
    const price = [200, 350, 500][c2];
    if (w.player.beans < price) {
      yield* say(g, "lou", "…no… beans… | …it's… okay.");
      return;
    }
    spend(g, price);
    g.sound("bean");
    a.play("Give", 0.3, { speed: 0.3, once: true });
    yield 1.2;
    g.player.pose("Eat");
    g.sound("chew");
    const untilNoon = w.clock.day * 1440 + 12 * 60;
    const until = w.clock.minute < 12 * 60 ? untilNoon : w.clock.day * 1440 + w.clock.minute + [60, 120, 180][c2];
    w.player.buffUntil = Math.max(w.player.buffUntil, until);
    g.events.emit("coffee", { blend: c2 });
    yield* say(g, "lou", hostLine(g, "lou", "serve"));
    yield* say(g, "lou", hostLine(g, "lou", "hint"));
  },
  *fortuneTable(g) {
    const w = g.world;
    if (w.player.fortuneDay === w.clock.day) {
      yield* say(g, "nibbles", "I already ate your future today. It was very filling. Come back tomorrow.");
      return;
    }
    const c2 = yield* ask(g, "nibbles", hostLine(g, "nibbles", "greet"), ["A reading: 300 beans", "No, thank you"]);
    if (c2 !== 0) return;
    if (w.player.beans < 300) {
      yield* say(g, "nibbles", "I see no beans in your future. Or your pocket. That one's free.");
      return;
    }
    spend(g, 300);
    const s = new Stream(`${w.seed}:fortune:${w.clock.day}`);
    const f = s.pick(HOSTS.nibbles.fortunes);
    g.sound("chew");
    yield 0.35;
    g.sound("chew");
    yield* say(g, "nibbles", f.text);
    w.player.luck = f.luck === "none" ? null : f.luck;
    w.player.fortuneDay = w.clock.day;
    g.events.emit("fortune", { luck: f.luck });
  }
};

// src/ui/screens/mail.js
init_draw();
init_lines();
init_mail();
init_items();
init_economy();
init_ui();
var Reader = class {
  constructor(letter, onDone) {
    this.id = "letterRead";
    this.letter = letter;
    this.onDone = onDone;
  }
  currentText() {
    return this.letter.body;
  }
  open(g) {
    g.sound("paper");
    if (!this.letter.read) {
      this.letter.read = true;
      g.events.emit("letterRead", { from: this.letter.from });
    }
  }
  update(g, inp) {
    if (inp.confirm || inp.back || inp.mouse.click || inp.mouse.rclick) {
      g.ui.pop(this);
      const l = this.letter;
      if (l.gift && !l.taken) {
        const id = typeof l.gift === "string" ? l.gift : l.gift.id;
        if (typeof l.gift === "object" && l.gift.beans) {
          addBeans(g, l.gift.beans, "mail");
          g.sound("beanLots");
          l.taken = true;
          g.ui.toastMsg(`+${l.gift.beans.toLocaleString("en-US")} beans`);
        } else if (hasRoom(g.world)) {
          addItem(g, id, typeof l.gift === "object" && l.gift.from ? { from: l.gift.from } : null);
          l.taken = true;
          g.sound("pickUp");
          g.ui.toastMsg(`You take the ${ITEMS[id]?.name ?? "present"}.`);
          g.events.emit("giftOpened", { id, from: l.from });
        } else g.ui.toastMsg("Your pockets are full. It stays in the letter.");
      }
      this.onDone?.();
    }
  }
  prompts() {
    return [["confirm", "Fold it up"]];
  }
  draw(g, hud) {
    dim(hud);
    const l = this.letter;
    const body = resolveTags(l.body, g);
    const parts = body.split("\n");
    const sign = parts.length > 1 ? parts[parts.length - 1] : "";
    const text = parts.slice(0, parts.length > 1 ? -1 : void 0).join(" ");
    const gift = l.gift && !l.taken ? typeof l.gift === "object" && l.gift.beans ? `Enclosed: ${l.gift.beans.toLocaleString("en-US")} beans` : `Enclosed: ${ITEMS[typeof l.gift === "string" ? l.gift : l.gift.id]?.name ?? "something"}` : "";
    drawPaper(hud, `From ${senderName(l.from)}`, text, sign, gift);
  }
};
function mailScreen(g, onClose) {
  const w = g.world;
  const close = (gg, m) => {
    gg.ui.pop(m);
    onClose?.();
  };
  const rebuild = () => w.mail.inbox.slice(-8).reverse().map((l) => ({
    label: () => `${l.read ? "" : "* "}${senderName(l.from)}`,
    icon: "letter",
    iconColors: { o: "red", x: "mist", w: "white" },
    action: (gg) => {
      gg.ui.push(new Reader(l));
    }
  }));
  const items = rebuild();
  if (!items.length) items.push({ label: "Nothing. Not even a bill. Enjoy it.", action: close });
  return new Menu({ id: "mailbox", title: "The mailbox", items, x: 120, y: 60, w: 240, itemH: 20, back: close, prompts: [["confirm", "Read"], ["back", "Close"]] });
}

// src/systems/actions.js
init_pockets();
init_bus();
init_stargaze();
init_cheese();
init_neighbours();
init_cityMap();

// src/systems/festivals/festivals.js
init_engine();
init_models();
init_town();
init_neighbours();
init_say();
init_items();
init_economy();
init_mail();
init_rng();
init_draw();
init_pockets();
init_keyboard();
init_ui();
init_bell();

// src/ui/screens/credits.js
init_draw();
init_neighbours();
init_items();
var YearPage = class {
  constructor(g, onClose) {
    this.id = "yearAlmanac";
    this.onClose = onClose;
    this.page = 0;
    this.lines = yearFacts(g);
  }
  labels() {
    return this.lines;
  }
  currentText() {
    return this.lines.join(" / ");
  }
  update(g, inp) {
    if (inp.confirm || inp.back || inp.mouse.click) {
      g.ui.pop(this);
      this.onClose?.();
    }
  }
  prompts() {
    return [["confirm", "Turn the page"]];
  }
  draw(g, hud) {
    hud.rect(0, 0, 480, 270, "ink");
    panel(hud, 60, 18, 360, 234, { fill: "white", trim: "sand" });
    drawText(hud, 240, 28, `The Year in ${g.world.player.town}`, { align: "center", color: "ink", scale: 2 });
    this.lines.forEach((l, i) => drawText(hud, 240, 60 + i * 20, l, { align: "center", color: i % 2 ? "plum" : "ink" }));
  }
};
function yearFacts(g) {
  const w = g.world;
  const s = w.stats;
  const most = Object.entries(s.talks).sort((a, b) => b[1] - a[1])[0];
  const soldTop = Object.entries(s.sold).sort((a, b) => b[1] - a[1])[0];
  return [
    `Biggest catch: ${s.biggest ?? "nothing you would admit to"}`,
    `Fish caught: ${s.fish}. Bugs caught: ${s.bugs}.`,
    `Most-sold to the goose: ${soldTop ? ITEMS[soldTop[0]]?.name ?? soldTop[0] : "nothing, somehow"}`,
    w.player.debt > 0 ? `Debt status: ${w.player.debt.toLocaleString("en-US")} beans, and noted` : "Debt status: nil. She is thinking about it.",
    `Talked to most: ${most ? NEIGHBOURS[most[0]]?.name ?? most[0] : "nobody, which is a choice"}`,
    `Weeds pulled: ${s.weeds}. Wishes made: ${s.wishes}.`,
    `Favours done: ${s.favoursDone}. Contests placed: ${s.contestsWon}.`,
    `Days lived: ${s.days}. Nobody is counting. Mrs. Gander is counting.`
  ];
}
var CREDITS = [
  ["Honk If You Owe", 3],
  ["", 1],
  ["A life in a very small village", 1],
  ["one bus ride from a very big city", 1],
  ["", 1],
  ["Mrs. Gander as herself", 1],
  ["Mayor Trundle, arriving shortly", 1],
  ["Dorrit, Tavi, Bartleby, Lady Ottoline", 1],
  ["Rocco, Nib, Ozzie, Yolanda, and Fitch (no refunds)", 1],
  ["Clementine, and the bee", 1],
  ["Dr. Quill, Madame Mothwick, Old Rind, Vesper", 1],
  ["Hester at the wheel", 1],
  ["Monsieur Fleece, Flavia Rosé, Magda", 1],
  ["Sir Reginald Bellows, Pemberton, Agent Brisket", 1],
  ["Languid Lou, Madame Nibbles", 1],
  ["Inspector Pimm, with reluctance", 1],
  ["", 1],
  ["Written and played by a very fast machine", 1],
  ["Built on the Pixel Engine kit", 1],
  ["All the music is new. All the voices are nonsense.", 1],
  ["", 1],
  ["Thank you for staying", 1],
  ["The goose has noted it", 1],
  ["", 1],
  ["Year Two begins in the morning", 2]
];
var Credits = class {
  constructor(g, onClose) {
    this.id = "credits";
    this.onClose = onClose;
    this.y = 280;
    this.t = 0;
  }
  labels() {
    return CREDITS.map((c2) => c2[0]);
  }
  open(g) {
    g.music.setOverride("credits");
    g.events.emit("credits", {});
  }
  update(g, inp, dt) {
    this.t += dt;
    this.y -= dt * (inp.confirm ? 60 : 16);
    const h = CREDITS.reduce((a, c2) => a + 14 * c2[1] + 2, 0);
    if (this.y < -h - 20 || inp.back) {
      g.music.setOverride(null);
      g.ui.pop(this);
      this.onClose?.();
    }
  }
  prompts() {
    return null;
  }
  draw(g, hud) {
    hud.rect(0, 0, 480, 270, "ink");
    let y = Math.round(this.y);
    for (const [t, s] of CREDITS) {
      if (t && y > -30 && y < 280) drawText(hud, 240, y, t, { align: "center", color: s > 1 ? "sand" : "white", scale: s });
      y += 14 * s + 2;
    }
  }
};
var yearAlmanac = (g, onClose) => new YearPage(g, onClose);
var creditsScreen = (g, onClose) => new Credits(g, onClose);

// src/systems/festivals/festivals.js
init_fish();
init_bugs();
init_composer();
init_patterns();
init_tiles();
init_time();
init_talk();
var { Group: Group10, Mesh: Mesh8, BoxGeometry: BoxGeometry6, InstancedMesh, Object3D, Color } = engine_exports.THREE;
var TOSS_TIME = 90;
var DERBY_NAMES = { derby: "the Fishing Derby", bugOff: "the Bug-Off", snowman: "the Snowman Contest" };
var STAGES = [[20, 36], [28, 36], [18, 44], [24, 45], [30, 44], [20, 40], [28, 41], [25, 35]];
var dummy = new Object3D();
function contestScores(seed, kind, day) {
  const s = new Stream(`${seed}:contest:${kind}:${day}`);
  const ids = ["rocco", "dorrit", "tavi", "ottoline", "bartleby", "nib", "ozzie", "yolanda"];
  const out = {};
  for (const id of ids) {
    if (kind === "derby") {
      let best = 0;
      const n = s.int(2, 6);
      for (let i = 0; i < n; i++) {
        const f = s.pick(FISH.filter((x) => x.seasons.includes(1)));
        best = Math.max(best, fishLength(f, s));
      }
      out[id] = best;
    } else if (kind === "bugOff") {
      let sum = 0;
      const n = s.int(2, 7);
      for (let i = 0; i < n; i++) {
        const b = s.pick(BUGS.filter((x) => x.seasons.includes(2)));
        sum += b.beans;
      }
      out[id] = sum;
    } else {
      const ratio = s.range(0.4, 1);
      const big = s.range(0.6, 1.4);
      out[id] = snowmanPoints(ratio, big);
    }
  }
  return out;
}
var fishLength = (f, s) => Math.round((FISH_LEN[f.size ?? "S"] + s.range(-0.05, 0.1)) * 100);
var snowmanPoints = (ratio, big) => Math.max(0, Math.round(100 - Math.abs(ratio - 0.72) * 200 - Math.abs(big - 1.1) * 40));
var Festivals = class {
  constructor(g) {
    this.g = g;
    this.deco = new Group10();
    g.town.group.add(this.deco);
    this.rings = [];
    this.lanterns = null;
    this.active = null;
    this.props = new Group10();
    g.town.group.add(this.props);
    this.seedMeshes = [];
    this.fireworks = [];
    this.potBuilt = null;
  }
  /** Rebuild the plaza for today. */
  resetDay() {
    const g = this.g;
    this.active = null;
    this.deco.clear();
    this.props.clear();
    this.rings = [];
    this.potBuilt = null;
    this.lanterns = null;
    const c2 = g.cal;
    this.today = c2.festival;
    this.contest = c2.contest;
    if (c2.festival || c2.contest) this.buildDeco(c2.festival ?? c2.contest);
    if (c2.festival === "greatSoup") this.buildPot();
    if (c2.festival === "longNight") g.world.flags.lightsDoors ??= {};
  }
  buildDeco(kind) {
    const colors = { seedToss: ["lime", "white", "sand"], lanternFloat: ["sky", "plum", "sand"], greatSoup: ["orange", "red", "sand"], longNight: ["white", "sky", "mist"], derby: ["sky", "white", "navy"], bugOff: ["lime", "plum", "orange"], snowman: ["white", "sky", "red"] }[kind] ?? ["red", "sand", "white"];
    const addRow = (x0, z0, x1, z1) => {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.9);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const m = new Mesh8(new BoxGeometry6(0.4, 0.5, 0.06), (0, engine_exports.toonMaterial)(engine_exports.PALETTE[colors[i % colors.length]]));
        m.position.set(x0 + (x1 - x0) * t, 3.1 - Math.sin(t * Math.PI) * 0.4, z0 + (z1 - z0) * t);
        if (Math.abs(x1 - x0) < 0.1) m.rotation.y = Math.PI / 2;
        this.deco.add(m);
      }
    };
    addRow(16.5, 33.5, 32, 33.5);
    addRow(16.5, 47, 32, 47);
    addRow(16.5, 33.5, 16.5, 47);
    addRow(32, 33.5, 32, 47);
    for (const [x, z] of [[16.5, 33.5], [32, 33.5], [16.5, 47], [32, 47]]) {
      const p = new Mesh8(new BoxGeometry6(0.14, 3.2, 0.14), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.plum));
      p.position.set(x, 1.6, z);
      this.deco.add(p);
    }
  }
  holdsNpc(id) {
    return this.active?.gather?.includes(id) ?? false;
  }
  pose(id) {
    return this.active?.gather?.includes(id) ? this.active.clip ?? "Sway" : null;
  }
  music() {
    const g = this.g;
    if (this.active?.tune) return this.active.tune;
    const c2 = g.cal;
    if (g.place !== g.town) return null;
    const near = g.player.x > 10 && g.player.x < 40 && g.player.z > 28 && g.player.z < 50;
    if (c2.festival && near) return { seedToss: "festivalSpring", lanternFloat: "festivalSummer", greatSoup: "festivalAutumn", longNight: "festivalWinter" }[c2.festival];
    if (c2.contest && near && this.contestState()?.joined && !this.contestState()?.finished) return "contest";
    return null;
  }
  interactables() {
    const g = this.g;
    const out = [];
    if (g.place !== g.town) return out;
    const c2 = g.cal;
    const h = hourNow(g.world);
    const w = g.world;
    const [dx, dz] = LANDMARKS.soupPot;
    if (c2.festival === "seedToss" && !w.festivals[this.key("seedToss")] && h >= 9) out.push({ id: "fest", x: dx, z: dz, r: 2, label: "Join the Seed Toss", act: "festSeedToss" });
    if (c2.festival === "lanternFloat" && !w.festivals[this.key("lanternFloat")]) {
      if (h >= 17) out.push({ id: "fest", x: 37, z: 25, r: 3, label: "Set a lantern on the river", act: "festLantern" });
      else out.push({ id: "fest", x: dx, z: dz, r: 2, label: "Ask about the Lantern Float", act: "festHint", hint: "At dusk, go to the north bridge and set a lantern on the river. Fireworks over the beach at nine. Tavi has been awake since Tuesday." });
    }
    if (c2.festival === "greatSoup" && !w.festivals[this.key("greatSoup")]) out.push({ id: "fest", x: dx, z: dz, r: 2.4, label: "Add to the Great Soup", act: "festSoup" });
    if (c2.festival === "longNight") {
      const st = w.flags.lightsDoors ?? {};
      if (!w.festivals[this.key("longNight")] && h >= 16) {
        for (const b of BUILDINGS) {
          if (b.id === "home" || b.id === "museum" || b.id === "hall" || b.id === "store" || b.id === "mothwick") continue;
          if (!st[b.id]) out.push({ id: `lights:${b.id}`, x: b.door[0], z: b.door[1] + 0.2, r: 1.7, label: "Hang a string of lights", act: "festLights", building: b });
        }
        const [px, pz] = LANDMARKS.oldPear;
        const done = Object.keys(st).length;
        if (w.clock.minute >= 23.5 * 60 || w.clock.minute < 60 || done >= 4) out.push({ id: "pearEnd", x: px + 2, z: pz + 1.2, r: 2.4, label: "Gather at the Old Pear", act: "festFinale" });
        else out.push({ id: "pearEnd", x: px + 2, z: pz + 1.2, r: 2.4, label: "The Old Pear, at midnight", act: "festHint", hint: `Carry the lights to each neighbour's door. You've done ${done}. Then gather here at midnight.` });
      }
    }
    if (c2.contest) out.push({ id: "contest", x: dx, z: dz, r: 2, label: this.contestState()?.finished ? `Results: ${DERBY_NAMES[c2.contest]}` : `Enter ${DERBY_NAMES[c2.contest]}`, act: "contestDesk" });
    return out;
  }
  key(id) {
    return `${id}:${this.g.world.clock.year}:${this.g.world.clock.day}`;
  }
  contestState() {
    const c2 = this.g.cal;
    return c2.contest ? this.g.world.contests[this.key(c2.contest)] : null;
  }
  onHour(hour) {
    const g = this.g;
    const c2 = g.cal;
    if (c2.contest && hour === 13) {
      const st = this.contestState();
      if (st?.joined && !st.finished) g.scripts.run(this.finishContest(), { name: "contestEnd" });
    }
  }
  onCaught(def) {
    const st = this.contestState();
    if (!st?.joined || st.finished) return;
    const g = this.g;
    const c2 = g.cal.contest;
    if (c2 === "derby" && ITEMS[def.id]?.cat === "fish") {
      const len = fishLength(def, new Stream(`${g.world.seed}:len:${g.world.stats.fish}`));
      st.score = Math.max(st.score, len);
      g.ui.toastMsg(`${def.name}: ${len} cm.`);
    } else if (c2 === "bugOff" && ITEMS[def.id]?.cat === "bug") {
      st.score += def.beans;
      g.ui.toastMsg(`${def.name}: ${def.beans} points.`);
    }
  }
  onSnowman(ratio, big) {
    const st = this.contestState();
    if (!st?.joined || st.finished || this.g.cal.contest !== "snowman") return;
    st.score = Math.max(st.score, snowmanPoints(ratio, big));
    st.bartleby = ratio <= 0.55 ? "The head is very small. I'd prefer not." : ratio >= 0.85 ? "The head is nearly the size of the body. I'd prefer not." : "It has adequate proportions. I'd prefer not to say so.";
    this.g.ui.toastMsg(`Your snowman: ${st.score} points.`);
  }
  *finishContest() {
    const g = this.g;
    const w = g.world;
    const kind = g.cal.contest;
    const st = this.contestState();
    if (!st || st.finished) return;
    st.finished = true;
    const scores = contestScores(w.seed, kind, w.clock.day);
    const list = Object.entries(scores).map(([id, s]) => ({ id, s })).sort((a, b) => b.s - a.s);
    const beat = list.filter((x) => x.s > st.score).length;
    const place = beat + 1;
    st.results = list.slice(0, 3);
    st.place = place;
    if (kind === "derby") {
      const t = list[0];
      yield* narrate(g, `The Derby's over! Longest fish by anyone else: ${NEIGHBOURS[t.id].name}, ${t.s} cm. Yours: ${st.score} cm. You came ${ordinal(place)}.`);
    } else if (kind === "bugOff") {
      const t = list[0];
      yield* narrate(g, `The Bug-Off's over! Best score by anyone else: ${NEIGHBOURS[t.id].name}, ${t.s}. Yours: ${st.score}. You came ${ordinal(place)}.`);
    } else {
      yield* say(g, "bartleby", st.bartleby ?? "I've been asked to judge. I'd prefer not. | You didn't make one. That's the best one so far.");
      yield* say(g, "bartleby", `Fine. ${NEIGHBOURS[list[0].id].name} got ${list[0].s}. You got ${st.score}. That's ${ordinal(place)}. I'd prefer not to discuss it.`);
    }
    g.events.emit("contestDone", { kind, place, score: st.score, top: list });
    if (place <= 3) {
      w.stats.contestsWon += 1;
      const trophy = { derby: "trophyGold", bugOff: "trophyBug", snowman: "trophySnow" }[kind];
      sendMail(g, { from: "clementine", body: `Dear {player},
You came ${ordinal(place)} in ${DERBY_NAMES[kind]}. There's a trophy. The bee has been polishing it. She didn't need to.
Clementine`, gift: place === 1 ? trophy : "boxedGift" });
    }
  }
  // ---- Seed Toss -----------------------------------------------------------------------------------
  *seedToss() {
    const g = this.g;
    const w = g.world;
    yield* say(g, "tavi", ["It's the Seed Toss! You throw the seeds at the rings! Everything grows! Isn't it?!", "Use your tool button to fling a seed where you're facing. Ninety seconds. Go go go, isn't it?!"]);
    const st = { kind: "seedToss", t: TOSS_TIME, hits: 0, npcHits: 0, gather: NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === "here"), clip: "Slingshot", tune: "festivalSpring", planted: [] };
    this.active = st;
    this.rings = [];
    const rng = dayStream(w, "rings");
    for (const [x, z] of [[21, 37], [27, 37], [19, 43], [24, 42], [29, 42], [25, 46]]) {
      const r = (0, engine_exports.buildModel)("chalk-ring", { catalog: MODELS }).object;
      r.position.set(x, 0.02, z);
      this.props.add(r);
      this.rings.push({ x, z, r: 1, color: rng.int(0, 4), hits: 0 });
    }
    st.gather.forEach((id, i) => {
      const n = g.npcs.get(id);
      const [x, z] = STAGES[i % STAGES.length];
      n.setPos(x, z);
      n.inside = false;
      g.npcs.syncVisibility(n);
      n.state = "idle";
      n.timer = TOSS_TIME + 5;
      n.path = null;
      n.actor.faceToward(24, 41);
    });
    g.player.x = 24;
    g.player.z = 39.5;
    g.scripts.setFree("festSeedToss", true);
    while (st.t > 0) {
      st.t -= 1 / 60;
      yield;
      if (st.throwCool > 0) st.throwCool -= 1 / 60;
      const inp = g.inp;
      if ((inp.useTool || inp.mouse.rclick || inp.confirm) && !(st.throwCool > 0)) {
        st.throwCool = 0.35;
        const p = g.player;
        p.play("Slingshot", 0.05, { once: true, speed: 2 });
        p.poseTimer = 0.2;
        const hp = g.interact.hoverPoint;
        const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        const tx = hp && inp.mouse.rclick ? hp.x : p.x + fx * 4, tz = hp && inp.mouse.rclick ? hp.z : p.z + fz * 4;
        g.sound("seedThrow");
        this.throwSeed(p.x, p.z, tx, tz, true);
      }
      st.npcT = (st.npcT ?? 1) - 1 / 60;
      if (st.npcT <= 0) {
        st.npcT = 0.7;
        const id = rng.pick(st.gather);
        const a = g.npcs.actor(id);
        const ring2 = rng.pick(this.rings);
        this.throwSeed(a.x, a.z, ring2.x + rng.range(-1.2, 1.2), ring2.z + rng.range(-1.2, 1.2), false);
        a.play("Slingshot", 0.05, { once: true });
        g.npcs.get(id).emoting = true;
      }
    }
    g.scripts.setFree("festSeedToss", false);
    this.props.clear();
    this.active = null;
    g.events.emit("seedTossDone", { hits: st.hits });
    w.festivals[this.key("seedToss")] = { hits: st.hits };
    for (const [x, z, color, sp] of st.planted) {
      const k = `${x},${z}`;
      if (!w.town.objects[k] && tileInfo(tileChar(x, z)).walk && !g.town.solid[z * 80 + x]) w.town.objects[k] = { k: "flower", species: sp, color, wet: 0, wilt: 0, sown: true };
      g.town.dirty.add(k);
    }
    yield* narrate(g, `Time! You hit the rings ${st.hits} times. There are seeds in everything now. There are seeds in Bartleby.`);
    yield* this.mayorArrives();
    addBeans(g, st.hits * 60, "festival");
    g.sound("beanLots");
    g.ui.toastMsg(`The village is grateful. +${st.hits * 60} beans.`);
    for (const id of st.gather) gainFriend(g, id, 3);
  }
  throwSeed(x0, z0, x1, z1, mine) {
    const g = this.g;
    const m = new Mesh8(new BoxGeometry6(0.1, 0.1, 0.1), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.sand));
    m.position.set(x0, 1, z0);
    this.props.add(m);
    this.seedMeshes.push({ m, x0, z0, x1, z1, t: 0, mine });
  }
  updateSeeds(dt) {
    const g = this.g;
    const st = this.active;
    for (const s of this.seedMeshes.slice()) {
      s.t += dt * 2.2;
      const t = Math.min(1, s.t);
      s.m.position.set(s.x0 + (s.x1 - s.x0) * t, 1 + Math.sin(t * Math.PI) * 2 - t, s.z0 + (s.z1 - s.z0) * t);
      if (t >= 1) {
        s.m.removeFromParent();
        this.seedMeshes.splice(this.seedMeshes.indexOf(s), 1);
        const ring2 = this.rings.find((r) => Math.hypot(r.x - s.x1, r.z - s.z1) < 1.05);
        if (ring2) {
          ring2.hits++;
          g.ctx.particles.burst("sparkle", [s.x1, 0.3, s.z1], { count: 8, colors: [FLOWER_COLORS[ring2.color], "white", "lime"] });
          const fm = (0, engine_exports.buildModel)("flower", { catalog: MODELS, params: { species: ring2.color % 4, big: 1 }, palette: { petal: FLOWER_COLORS[ring2.color] } }).object;
          fm.position.set(s.x1, 0, s.z1);
          this.props.add(fm);
          if (s.mine && st) {
            st.hits++;
            g.sound("seedHit");
            st.planted.push([Math.floor(s.x1), Math.floor(s.z1), ring2.color, ring2.color % 4]);
            g.events.emit("seedHit", { hits: st.hits });
          }
        }
      }
    }
  }
  *mayorArrives() {
    const g = this.g;
    const w = g.world;
    if (w.flags.ribbonGone) return;
    const t = g.life.trundle;
    const [rx, rz] = LANDMARKS.ribbon;
    t.x = rx - 1.2;
    t.z = rz;
    g.camFocus = { x: rx - 1, y: 1, z: rz };
    g.life.placeSpecials();
    g.events.emit("mayorArrives", {});
    yield 0.8;
    yield* say(g, "trundle", ["And so… at last… I declare this…", "… | Has anyone… | There was… a ribbon."]);
    w.flags.ribbonGone = true;
    w.flags.mayorArrived = true;
    g.life.ribbon.visible = false;
    yield* narrate(g, "A very small breeze goes through the plaza. The two posts stand there. There has not been a ribbon on them for some time.");
    yield* say(g, "tavi", "Is it over? Did we win? It's going really well, isn't it?!");
    yield* say(g, "trundle", ["Well. | Well, well. | I'll just… start back."]);
    g.camFocus = null;
  }
  // ---- Lantern Float -----------------------------------------------------------------------------
  *lanternFloat() {
    const g = this.g;
    const w = g.world;
    const colors = ["red", "sand", "sky", "lime", "plum"];
    let chosen = -2;
    const items = colors.map((c2, i) => ({ label: `${c2[0].toUpperCase()}${c2.slice(1)} lantern`, action: (gg, m) => {
      chosen = i;
      gg.ui.pop(m);
    } }));
    g.ui.push(new Menu({ id: "lanternPick", title: "Pick a lantern", items, x: 150, y: 70, w: 180, back: (gg, m) => {
      chosen = -1;
      gg.ui.pop(m);
    } }));
    while (chosen === -2) yield;
    if (chosen < 0) return;
    const wish = yield* keyboardFlow(g, { title: "Make a wish, one line", max: 40, hint: "Nobody will read this. Clementine will read this.", random: ["Less debt", "More soup", "A good chair", "Bartleby waves back", "To be asked", "A second go at Tuesday"] });
    const fest = { lanternColor: colors[chosen], wish };
    w.festivals[this.key("lanternFloat")] = fest;
    sendMail(g, { from: "wish", body: `Dear {player},
You wished for "${wish}".
We have received your lantern. It's in the sea now, with the others. We are looking into it. Don't get your hopes up. Do, a bit.
The Sea`, gift: "driftBottle", arriveDay: w.clock.day + 1 });
    g.player.pose("PickUp", 0.6);
    yield 0.4;
    g.sound("plop");
    this.launchLanterns(colors[chosen]);
    const st = { kind: "lantern", gather: NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === "here"), clip: "Sway", tune: "festivalSummer" };
    this.active = st;
    st.gather.forEach((id, i) => {
      const n = g.npcs.get(id);
      n.setPos(34 + i * 0.7, 26.5 + i % 3);
      n.inside = false;
      g.npcs.syncVisibility(n);
      n.state = "idle";
      n.path = null;
      n.actor.faceToward(40, 26);
    });
    g.events.emit("lanternSet", { color: colors[chosen] });
    yield* narrate(g, "You set it on the water. It wobbles. It goes. All along the bank people are doing the same, and nobody says anything for a while. Hundreds of lights go by, down to the sea.");
    if (w.clock.minute < 21 * 60) w.clock.minute = 20.8 * 60;
    this.fireworksFrom = 0;
    g.camFocus = { x: 40, y: 2, z: 53 };
    g.player.x = 34;
    g.player.z = 50;
    g.player.y = 0;
    g.camTeleport();
    yield* say(g, "nib", "They're on their way. Everything's on its way, or so the moon says.");
    yield* this.fireworkShow();
    g.camFocus = null;
    this.active = null;
    g.events.emit("lanternDone", {});
  }
  launchLanterns(mine) {
    const g = this.g;
    const count = 240;
    const geo = new BoxGeometry6(0.34, 0.34, 0.34);
    const mesh = new InstancedMesh(geo, (0, engine_exports.glowMaterial)(engine_exports.PALETTE.white), count);
    const colors = [engine_exports.PALETTE.sand, engine_exports.PALETTE.orange, engine_exports.PALETTE.red, engine_exports.PALETTE.sky, engine_exports.PALETTE.plum, engine_exports.PALETTE.lime];
    const rng = dayStream(g.world, "lanterns");
    this.lanternData = [];
    const c2 = new Color();
    for (let i = 0; i < count; i++) {
      const t = -rng.range(0, 1.4);
      this.lanternData.push({ t, off: rng.range(-1.4, 1.4), speed: rng.range(0.018, 0.03), phase: rng.range(0, 6) });
      c2.setHex(i === 0 ? engine_exports.PALETTE[mine] : rng.pick(colors));
      mesh.setColorAt(i, c2);
    }
    mesh.frustumCulled = false;
    this.props.add(mesh);
    this.lanterns = mesh;
    this.lanternLight = g.ctx.lights.request({ position: [40, 1.5, 30], color: 16764277, intensity: 8, radius: 16 });
  }
  updateLanterns(dt) {
    const m = this.lanterns;
    if (!m) return;
    const path = [[39.5, 20], [39.5, 32], [43.5, 34], [43.5, 48], [43.5, 62]];
    for (let i = 0; i < this.lanternData.length; i++) {
      const d = this.lanternData[i];
      d.t += d.speed * dt;
      const t = Math.max(0, d.t);
      const seg = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
      const f = Math.min(1, t * (path.length - 1) - seg);
      const [ax, az] = path[seg], [bx, bz] = path[seg + 1];
      const x = ax + (bx - ax) * f + d.off * (az === bz ? 0 : 1);
      const z = az + (bz - az) * f;
      dummy.position.set(x, d.t < 0 ? -9 : -0.12 + Math.sin(this.g.ctx.time * 2 + d.phase) * 0.02, z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (this.lanternLight) this.lanternLight.position.set(this.g.player.x, 1.6, this.g.player.z - 2);
  }
  *fireworkShow() {
    const g = this.g;
    const w = g.world;
    const n = 7;
    for (let i = 0; i < n; i++) {
      g.sound("fireworkLaunch");
      yield 0.7;
      const x = 30 + i * 3.6, y = 12 + i % 3 * 2, z = 62;
      if (i === 3 && w.patterns[w.player.pattern ?? 0]) {
        this.patternFirework(x, y, z, w.patterns[w.player.pattern ?? 0]);
        g.events.emit("patternFirework", {});
      } else {
        const cols2 = [["red", "sand", "white"], ["sky", "white", "cyan"], ["lime", "sand", "white"], ["plum", "orange", "sand"]][i % 4];
        g.ctx.particles.burst("firework", [x, y, z], { colors: cols2 });
      }
      g.sound("fireworkBurst");
      g.rumble(0.35, 150);
      g.engine.screen.flash("white", { duration: 0.05 });
      yield 0.8;
    }
  }
  patternFirework(x, y, z, data) {
    const g = this.g;
    for (let j = 0; j < 16; j += 1) for (let i = 0; i < 16; i += 1) {
      const c2 = PATTERN_COLORS[data[j * 16 + i]];
      g.ctx.particles.burst({ count: [1, 1], life: [1.1, 1.6], speed: [0, 0.05], gravity: 0.25, size: [2, 2], colors: [c2], spread: 180 }, [x + (i - 8) * 0.55, y + (8 - j) * 0.55, z]);
    }
  }
  // ---- Great Soup ------------------------------------------------------------------------------
  buildPot() {
    const [x, z] = LANDMARKS.soupPot;
    const pot2 = (0, engine_exports.buildModel)("soup-pot", { catalog: MODELS }).object;
    pot2.position.set(x, 0, z);
    this.props.add(pot2);
    this.potBuilt = pot2;
    this.potSoup = pot2.getObjectByName("soup");
    const dorrit = this.g.npcs.get("dorrit");
    if (dorrit && !dorrit.inside) {
      dorrit.setPos(x - 1.5, z + 1);
    }
  }
  *greatSoup() {
    const g = this.g;
    const w = g.world;
    yield* say(g, "dorrit", ["This is the big pot, mmhm. Everyone adds something. You add three. Fish, fruit, a mushroom, a boot. Anything that's been outdoors, mmhm."]);
    const put = [];
    for (let n = 0; n < 3; n++) {
      let picked = -2;
      g.ui.push(pocketsPicker(g, { title: `Add to the soup (${n + 1} of 3)`, filter: (s) => {
        const it = ITEMS[s.id];
        return ["fish", "fruit", "bug", "cheese", "flower"].includes(it?.cat) || s.id === "soupGift";
      }, onPick: (i) => {
        picked = i;
      }, onCancel: () => {
        picked = -1;
      } }));
      while (picked === -2) yield;
      if (picked < 0) {
        if (!put.length) return;
        break;
      }
      const slot = removeSlot(g, picked);
      put.push(slot.id);
      g.player.pose("Give", 0.5);
      g.sound("plop");
      g.ctx.particles.burst("splash", [LANDMARKS.soupPot[0], 2, LANDMARKS.soupPot[1]], { count: 8, colors: ["orange", "sand"] });
      yield 0.4;
      g.sound("stir");
    }
    const result = rateSoup(put);
    w.festivals[this.key("greatSoup")] = { put, ...result };
    w.stats.soupRating = result.rating;
    const gather = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === "here");
    this.active = { kind: "soup", gather, clip: "Eat", tune: "festivalAutumn" };
    gather.forEach((id, i) => {
      const n = g.npcs.get(id);
      const [x, z] = STAGES[i % STAGES.length];
      n.setPos(x, z);
      n.inside = false;
      g.npcs.syncVisibility(n);
      n.state = "idle";
      n.path = null;
      n.actor.faceToward(25, 41);
    });
    g.events.emit("soupRated", result);
    yield 1;
    const taste = result.good ? [["dorrit", "That's a soup, mmhm. That's the soup. I've waited my whole life. I'll have a little more."], ["bartleby", "It's… | I'd prefer not to say how good this is."], ["ottoline", "It's almost good enough for me, darling dear. I'll have a bucket."], ["tavi", "It's so good! Everything is so good! But this is *actually* good, isn't it?!"]] : [["dorrit", "Mmhm. | Mmhm… | I've had worse. I've made worse. Not on purpose, mmhm."], ["bartleby", "What did you put in this. | No. I'd prefer not."], ["ozzie", "This is what they want. This is what they've been working toward. You didn't hear it from me."], ["tavi", "It's so… chewy! I love it! I'm going to go and lie down, isn't it?!"]];
    for (const [id, line2] of taste) if (w.npcs[id]?.moved === "here") yield* say(g, id, line2);
    if (result.good) {
      addBeans(g, 2e3, "soup");
      g.sound("beanLots");
      for (const id of gather) gainFriend(g, id, 5);
      yield* narrate(g, `A proper feast. Everyone eats too much. The soup is rated ${result.rating} out of 10. You get 2,000 beans, and a look of respect from a wombat.`);
    } else {
      w.flags.queasyDay = w.clock.day + 1;
      sendMail(g, { from: "dorrit", body: "Dear {player},\nEveryone is still in bed, mmhm. I thought you should have this.\nDorrit", gift: "queasyGift" });
      yield* narrate(g, `A hush falls. The soup is rated ${result.rating} out of 10. Everyone's a bit green tomorrow, you suspect. Nobody says it was you. Everybody knows it was you.`);
    }
    this.active = null;
  }
  // ---- Long Night ------------------------------------------------------------------------------
  *hangLights(t) {
    const g = this.g;
    const w = g.world;
    const b = t.building;
    w.flags.lightsDoors[b.id] = true;
    g.player.pose("Wave", 0.6);
    yield 0.3;
    g.sound("star");
    const [x, z] = b.door;
    for (let i = 0; i < 6; i++) {
      const m = new Mesh8(new BoxGeometry6(0.14, 0.14, 0.14), (0, engine_exports.glowMaterial)([engine_exports.PALETTE.sand, engine_exports.PALETTE.red, engine_exports.PALETTE.lime, engine_exports.PALETTE.sky][i % 4]));
      m.position.set(x - 1.4 + i * 0.56, 2.4 + Math.sin(i * 1.2) * 0.1, z - 0.36);
      this.props.add(m);
    }
    const id = Object.keys(NEIGHBOURS).find((n) => NEIGHBOURS[n].building === b.id && w.npcs[n].moved === "here");
    if (id) {
      yield* say(g, id, `${w.npcs[id].friend >= 40 ? "You came!" : "Oh."} It's cold. Here. It's not much. It's the Long Night, you have to give someone something. It's the rules.`);
      if (hasRoom(w)) {
        const s = new Stream(`${w.seed}:longgift:${id}`);
        const gift = s.pick(["seedRose", "pear", "shellConch", "mushroom", "stationery", "bobbleHat", "knitted"]);
        addItem(g, gift, { from: id });
        g.sound("pickUp");
      }
      gainFriend(g, id, 4);
    }
    g.events.emit("lightsHung", { id: b.id });
  }
  *finale() {
    const g = this.g;
    const w = g.world;
    const [px, pz] = LANDMARKS.oldPear;
    const gather = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === "here");
    w.clock.minute = 23.99 * 60;
    if (w.flags.roccoVisit && w.npcs.rocco.moved !== "here") gather.push("rocco");
    this.active = { kind: "longNight", gather, clip: "Sway", tune: "festivalWinter" };
    gather.forEach((id, i) => {
      const n = g.npcs.get(id);
      const a = i / gather.length * Math.PI * 2;
      n.setPos(px + Math.cos(a) * 4, pz + 1 + Math.sin(a) * 4);
      n.inside = false;
      n.actor.visible = true;
      if (n.actor.root.parent !== g.town.group) n.actor.addTo(g.town.group);
      n.state = "idle";
      n.path = null;
      n.actor.faceToward(px, pz);
    });
    g.camFocus = { x: px, y: 2, z: pz + 1 };
    g.player.x = px + 0.5;
    g.player.z = pz + 4.6;
    g.player.y = 0;
    g.player.facing = Math.PI;
    g.camTeleport();
    g.events.emit("longNightGather", {});
    yield 0.8;
    if (w.npcs.rocco.moved !== "here" || w.flags.roccoVisit) {
      const r2 = g.npcs.get("rocco");
      r2.overrideClip = "RoccoRoll";
      const a = r2.actor;
      a.visible = true;
      a.x = px - 14;
      a.z = pz + 5;
      a.y = 0;
      a.facing = Math.PI / 2;
      for (let i = 0; i < 80; i++) {
        a.x += 0.14;
        yield;
      }
      r2.overrideClip = null;
      a.play("Idle", 0.2);
      w.flags.roccoCame = true;
      g.events.emit("roccoReturned", {});
      yield* say(g, "rocco", ["Did I miss it?! I rolled from the City! It's four hundred miles! It's forty! I had a sit-down! Let's roll!", "…Nib! You did your laps! You've got no laps! I'm so proud! Let's… I missed you all. Let's roll."]);
    }
    w.flags.pearLit = true;
    if (g.town.oldPearLights) g.town.oldPearLights.visible = true;
    g.sound("star");
    g.events.emit("pearLit", {});
    const light = g.ctx.lights.request({ position: [px, 4, pz], color: 16764277, intensity: 16, radius: 16, priority: 5 });
    yield 0.8;
    g.ctx.audio.playMusic(null);
    g.music.current = null;
    g.music.suspend = 6;
    yield* chimeScene(g, { harmonise: true, step: 0.28 });
    g.events.emit("chimeHarmonised", {});
    yield 0.5;
    const r = townRating(g);
    yield* say(g, "clementine", ["I'll read the town rating, since it's the end of something. | The bee wrote it.", ...r.lines]);
    if (r.score >= 70) {
      w.town.bellGold = true;
      g.town.bell.traverse((m) => {
        if (m.isMesh && m.material?.color?.getHex?.() === engine_exports.PALETTE.orange) m.material = (0, engine_exports.toonMaterial)(16766826);
      });
      g.sound("debtPaid");
      g.events.emit("bellGold", {});
      yield* narrate(g, "There is a sound like a very old coin being turned over, and the Old Bell goes gold. Nobody can say how. Mrs. Gander writes something down.");
    }
    yield* narrate(g, "Nobody says happy anything. It's not that sort of village. Somebody hands you a bowl.");
    yield* say(g, "gander", g.world.player.debt > 0 ? `You still owe ${g.world.player.debt.toLocaleString("en-US")} beans, dear. | Do have a lovely evening.` : "You owe me nothing, dear. | I shall be thinking about that for some time.");
    w.festivals[this.key("longNight")] = { score: r.score };
    w.flags.yearDone = true;
    light.release();
    this.active = null;
    g.camFocus = null;
    if (w.npcs.rocco.moved !== "here") g.npcs.syncVisibility(g.npcs.get("rocco"));
    g.events.emit("yearEnd", {});
    let closed = false;
    g.ui.push(yearAlmanac(g, () => {
      closed = true;
    }));
    while (!closed) yield;
    closed = false;
    g.ui.push(creditsScreen(g, () => {
      closed = true;
    }));
    while (!closed) yield;
    g.events.emit("creditsDone", {});
    w.clock.minute = 4.9 * 60;
  }
  // ---- Frame -----------------------------------------------------------------------------------
  fixedStep() {
  }
  presentation(dt) {
    this.updateSeeds(dt);
    this.updateLanterns(dt);
    const g = this.g;
    if (this.potBuilt && g.place === g.town && this.potSoup) {
      this.potSoup.position.y = 1.9 + Math.sin(g.ctx.time * 2) * 0.02;
      if (g.ctx.time % 0.5 < dt) g.ctx.particles.burst("smoke", [LANDMARKS.soupPot[0], 2.2, LANDMARKS.soupPot[1]], { count: 1, speed: 0.5 });
      if (g.ctx.time % 0.2 < dt) g.ctx.particles.burst("flame", [LANDMARKS.soupPot[0], 0.5, LANDMARKS.soupPot[1]], { count: 2 });
    }
  }
  drawHud(hud) {
    const a = this.active;
    if (a?.kind === "seedToss") {
      panel(hud, 170, 34, 140, 26, { fill: "white", trim: "lime" });
      drawText(hud, 240, 39, `Hits: ${a.hits}`, { align: "center", color: "ink" });
      bar(hud, 180, 50, 120, 5, a.t / TOSS_TIME, "green");
    }
    const st = this.contestState();
    const g = this.g;
    if (st?.joined && !st.finished && g.mode === "play" && !g.ui.blocking) {
      const left = Math.max(0, 13 * 60 - g.world.clock.minute);
      const text = `${DERBY_NAMES[g.cal.contest]}: ${st.score}  ·  ${Math.floor(left / 60)}h ${Math.floor(left % 60)}m left`;
      const w = textWidth(text) + 14;
      panel(hud, 240 - w / 2, 34, w, 16, { fill: "white", trim: "orange" });
      drawText(hud, 240, 39, text, { align: "center", color: "ink" });
    }
  }
  *singAlong(song, voiceId, seconds) {
    const g = this.g;
    const notes = melodyNotes(song).filter((n) => n !== "." && n !== "-");
    const text = "lalo do mi nana du bi la so wida no rumi tala";
    let i = 0;
    let t = seconds;
    while (t > 0) {
      const f = (0, engine_exports.noteFrequency)(notes[i % notes.length]);
      if (f) g.voice.sing(text[i % text.length], voiceId, 69 + 12 * Math.log2(f / 440));
      i++;
      yield 0.34;
      t -= 0.34;
    }
  }
};
var ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
function rateSoup(ids) {
  let score = 3;
  const cats = ids.map((id) => ITEMS[id]);
  const set = new Set(cats.map((c2) => c2?.cat));
  if (set.has("fish") && set.has("fruit")) score += 1;
  if (ids.includes("mushroom")) score += 3;
  if (cats.some((c2) => c2?.cat === "fish" && !c2.noMuseum)) score += 2;
  if (ids.includes("oldBoot")) score -= 3;
  if (ids.includes("cheeseOff")) score -= 4;
  if (cats.some((c2) => c2?.cat === "bug")) score -= 3;
  if (cats.some((c2) => c2?.cat === "flower")) score -= 1;
  if (ids.includes("soupGift")) score += 3;
  if (new Set(ids).size === ids.length && ids.length === 3) score += 1;
  const rating = Math.max(0, Math.min(10, score));
  return { rating, good: rating >= 6 };
}
function* festivalAction(g, t) {
  const f = g.festivals;
  switch (t.act) {
    case "festSeedToss":
      yield* f.seedToss();
      break;
    case "festLantern":
      yield* f.lanternFloat();
      break;
    case "festSoup":
      yield* f.greatSoup();
      break;
    case "festLights":
      yield* f.hangLights(t);
      break;
    case "festFinale":
      yield* f.finale();
      break;
    case "festHint":
      yield* narrate(g, t.hint);
      break;
    case "contestDesk":
      yield* contestDesk(g);
      break;
    default:
      break;
  }
}
function* contestDesk(g) {
  const f = g.festivals;
  const w = g.world;
  const kind = g.cal.contest;
  const st = f.contestState();
  const h = w.clock.minute;
  if (st?.finished) {
    yield* narrate(g, st.results.map((r, i) => `${ordinal(i + 1)} among the others: ${NEIGHBOURS[r.id].name}, ${r.s}.`).join(" ") + ` You: ${st.score}, ${ordinal(st.place)}.`);
    return;
  }
  if (st?.joined) {
    const c3 = yield* ask(g, "clementine", `You've got ${st.score}. It runs until one o'clock. Finish now?`, ["Keep going", "Finish now"]);
    if (c3 === 1) yield* f.finishContest();
    return;
  }
  const rules = { derby: "It's the Fishing Derby. Longest fish in three hours. Bring something long. The bee is timekeeper.", bugOff: "It's the Bug-Off. Most value in bugs in three hours. Nib is scoring. Nib is looking at the sky.", snowman: "It's the Snowman Contest. Push two snowballs together. Best proportions wins. Bartleby is judging. He'd prefer not." }[kind];
  if (h > 13 * 60) {
    yield* say(g, "clementine", "You've missed it. It ran ten till one. Nothing is urgent, except that.");
    return;
  }
  const c2 = yield* ask(g, "clementine", rules, ["Enter", "Not today"], { name: "Clementine" });
  if (c2 !== 0) return;
  w.contests[f.key(kind)] = { joined: true, score: 0, finished: false };
  if (w.clock.minute < 10 * 60) w.clock.minute = 10 * 60;
  g.sound("uiConfirm");
  g.events.emit("contestJoined", { kind });
  if (kind === "snowman") g.life.spawnSnowballs();
}

// src/systems/actions.js
var ACTIONS = {
  npcTalk: (g, t) => talkTo(g, t.npc),
  *shakeTree(g, t) {
    g.player.faceToward(t.x, t.z);
    g.player.pose("ShakeTree");
    yield 0.25;
    if (g.net?.role === "guest") {
      g.net.t.send({ t: "do", a: "shake", k: t.key });
      g.sound("shakeTree");
      return;
    }
    g.life.shakeTree(t.key, t.obj);
    g.rumble(0.25, 100);
    yield 0.4;
  },
  *pickObject(g, t) {
    const w = g.world;
    if (g.net?.role === "guest") {
      if (t.obj?.k === "flower") {
        g.ui.toastMsg("It's not your flower. Leave it.");
        return;
      }
      g.player.pose("PickUp");
      g.net.t.send({ t: "do", a: "pick", k: t.key });
      return;
    }
    g.player.faceToward(t.x, t.z);
    g.player.pose("PickUp");
    yield 0.25;
    if (!hasRoom(w)) {
      g.ui.toastMsg("Your pockets are full.");
      g.sound("uiError");
      return;
    }
    const it = ITEMS[t.give];
    addItem(g, t.give);
    delete w.town.objects[t.key];
    g.town.dirty.add(t.key);
    g.sound("pickUp");
    g.ctx.particles.burst("sparkle", [t.x, 0.3, t.z], { count: 4 });
    g.events.emit("picked", { id: t.give });
    if (it?.cat === "flower") g.events.emit("pickedFlower", {});
    if (it?.cat === "shell" || it?.cat === "oddity") {
      if (!w.flags[`seen:${t.give}`]) {
        w.flags[`seen:${t.give}`] = true;
        yield* narrate(g, `You found ${/^[aeiouAEIOU]/.test(it.name) ? "an" : "a"} ${it.name}. ${it.line ?? ""}`);
      } else g.ui.toastMsg(it.name);
    } else g.ui.toastMsg(it?.name ?? "Got it.");
  },
  *pullWeed(g, t) {
    const w = g.world;
    if (g.net?.role === "guest") {
      g.ui.toastMsg("It's not your village to weed. Very kind, though.");
      return;
    }
    g.player.faceToward(t.x, t.z);
    g.player.pose("PickUp");
    yield 0.25;
    delete w.town.objects[t.key];
    g.town.dirty.add(t.key);
    g.sound("pullWeed");
    g.ctx.particles.burst("dirt", [t.x, 0.2, t.z], { count: 3 });
    w.stats.weeds += 1;
    if (w.stats.weeds % 5 === 0) remember(g, "weeds", {});
    g.events.emit("weedPulled", {});
    if (hasRoom(w) && (w.story.day1Active || w.player.pockets.filter((s) => s?.id === "weed").length < 2)) addItem(g, "weed");
  },
  *bury(g, t) {
    const w = g.world;
    let picked = -2;
    g.ui.push(pocketsPicker(g, { title: "Bury what?", filter: (s) => ITEMS[s.id]?.cat === "bag", onPick: (i) => {
      picked = i;
    }, onCancel: () => {
      picked = -1;
    } }));
    while (picked === -2) yield;
    if (picked < 0) return;
    const slot = removeSlot(g, picked);
    const it = ITEMS[slot.id];
    w.town.objects[t.hole] = { k: "beanstalk", stage: 0, beans: it.beans * 3, planted: w.clock.day };
    g.town.dirty.add(t.hole);
    g.sound("dirtFall");
    remember(g, "plantedBeans", {});
    g.events.emit("buried", { beans: it.beans });
    yield* say(g, "player", [`"Beans are currency, dear. You can't plant them."`, `"You can absolutely plant them. You didn't hear it from me."`], { name: "You remember" });
  },
  *lookStalk(g, t) {
    yield* narrate(g, "A beanstalk. It looks at you like it has plans. Come back tomorrow.");
  },
  *harvestStalk(g, t) {
    const w = g.world;
    g.player.pose("PickUp");
    yield 0.25;
    const beans = t.obj.beans ?? 3e3;
    delete w.town.objects[t.key];
    g.town.dirty.add(t.key);
    addBeans(g, beans, "beanstalk");
    g.sound("beanLots");
    g.ctx.particles.burst("sparkle", [t.x, 1, t.z], { count: 20, colors: ["sand", "orange", "white"] });
    g.events.emit("harvested", { beans });
    yield* narrate(g, `The beanstalk gives up ${beans.toLocaleString("en-US")} beans. Mrs. Gander is going to have questions.`);
  },
  *snowmanTalk(g, t) {
    const o = t.obj;
    if (o.good) yield* say(g, "player", "Good proportions. I'm told that's rare. I'll write to you. Don't ask how.", { name: "Snowman", voice: "crowd" });
    else yield* say(g, "player", o.ratio <= 0.55 ? "My head is very small. Is that a comment? It feels like a comment." : "My head is nearly the size of my body. I can see over everything. It's awful.", { name: "Snowman", voice: "crowd" });
    if (o.good && !o.mailed) {
      o.mailed = true;
      g.world.mail.pending.push({ from: "snowman", body: "Dear {player},\nI've melted a bit. I wanted you to have this while there's still enough of me to post it.\nA Snowman", gift: "bobbleHat", arriveDay: g.world.clock.day + 1 });
    }
  },
  *crackHint(g) {
    yield* narrate(g, "There's a star-shaped crack in the ground. Something's under it. A shovel would be the polite way to ask.");
  },
  *sitStump(g, t) {
    yield* sit(g, t.x, t.z);
  },
  *sitBench(g, t) {
    yield* sit(g, t.seat[0], t.seat[1]);
  },
  *lookoutBench(g, t) {
    const [x, z] = t.seat;
    if (!g.isNight()) {
      yield* sit(g, x, z);
      return;
    }
    sitDown(g, x, z);
    yield* stargaze(g);
    standUp(g, x, z);
  },
  *clearPattern(g, t) {
    delete g.world.town.objects[t.key];
    g.town.dirty.add(t.key);
  },
  *enterBuilding(g, t) {
    const w = g.world;
    const b = t.building;
    const h = hourNow(w);
    if (b.id === "store" && (h < 8 || h >= 22) && !w.story.day1Active) {
      yield* say(g, "gander", HOSTS.gander.closed);
      return;
    }
    if (b.id === "mothwick" && (h < 8 || h >= 22)) {
      yield* say(g, "mothwick", "We're closed! Oh! I'm so sorry! I'm in the middle of something terrible! Come back at eight!");
      return;
    }
    if (b.id === "museum" && !w.museum.open) {
      yield* say(g, "quill", ["We're not open! I've got a whole wing that's just a hat! Come back tomorrow! Bring a fossil!"]);
      return;
    }
    if (b.id === "home" && w.story.day1Active && !w.flags.shackEntered) {
      w.flags.shackEntered = true;
    }
    const npcId = Object.keys(NEIGHBOURS).find((n) => NEIGHBOURS[n].building === b.id && g.world.npcs[n].moved === "here");
    if (b.id !== "home" && NEIGHBOURS[npcId]) {
      const npc = g.npcs.get(npcId);
      if (!npc.inside) {
        g.sound("knock");
        yield 0.15;
        g.sound("knock");
        yield 0.3;
        yield* narrate(g, `Nobody's home. Somewhere, ${NEIGHBOURS[npcId].short ?? NEIGHBOURS[npcId].name} is being somebody else's problem.`);
        return;
      }
    }
    const next = g.rooms.get(b.room);
    const def = next.def;
    let tx = def.exit?.x ?? 3, tz = (def.exit?.z ?? 5) - 0.6;
    if (b.id === "home") {
      next.rebuild?.();
      tx = next.def.exit.x;
      tz = next.def.exit.z - 0.6;
    }
    yield* g.travel(next, tx, tz, Math.PI);
    if (b.id === "store") g.scripts.run(doorJingle(g), { hold: false, name: "jingle" });
    g.events.emit("entered", { room: b.room });
  },
  *leaveRoom(g, t) {
    const e = t.exit;
    if (e.to === "town") {
      yield* g.travel(g.town, e.tx, e.tz, e.facing ?? 0, { sound: "doorClose" });
      g.events.emit("left", {});
      return;
    }
    if (e.to === "city") {
      const d = CITY_DOORS.find((x) => x.id === e.door);
      yield* g.travel(g.city, d.tx, d.tz + (d.id === "theatre" || d.id === "auction" ? 0 : 0.4), d.id === "theatre" || d.id === "auction" ? Math.PI / 2 : 0, { sound: "doorClose" });
      return;
    }
    yield* g.travel(g.rooms.get(e.to), e.tx, e.tz, e.facing ?? 0, { sound: "doorClose" });
  },
  *roomDoor(g, t) {
    const d = t.door;
    const r = g.rooms.get(d.to);
    yield* g.travel(r, d.tx ?? r.def.exit.x, d.tz ?? r.def.exit.z - 0.6, Math.PI);
    g.events.emit("entered", { room: d.to });
  },
  *venueDoor(g, t) {
    const v2 = t.venue;
    const h = hourNow(g.world);
    if (v2.id === "auction" && (h < 10 || h >= 18)) {
      yield* narrate(g, "Pemberton's Auction Rooms. A sign says TEN-TO-SIX-TEN-TO-SIX. It seems to be still going.");
      return;
    }
    if (v2.id === "theatre" && (h < 17 && h >= 5)) {
      yield* narrate(g, "The Palace Theatre. Evenings only. A very faint voice from inside is telling someone they were robbed.");
      return;
    }
    const r = g.rooms.get(v2.id);
    yield* g.travel(r, r.def.exit.x, r.def.exit.z - 0.6, Math.PI);
    g.world.flags.venuesVisited ??= {};
    g.world.flags.venuesVisited[v2.id] = true;
    g.events.emit("entered", { room: v2.id });
  },
  *mailbox(g) {
    const w = g.world;
    g.sound("mailFlag");
    let closed = false;
    g.ui.push(mailScreen(g, () => {
      closed = true;
    }));
    while (!closed) yield;
  },
  *ringBell(g) {
    g.player.pose("Wave", 0.6);
    playChime(g);
    g.events.emit("bellRung", {});
    yield 0.6;
  },
  *noticeBoard(g) {
    const w = g.world;
    const c2 = g.cal;
    const st = cheeseState(w, g.season, w.cheese.day || w.clock.day);
    const lines = [];
    lines.push(`NOTICE. Today is ${["Market", "Errand", "Show", "Festival"][c2.type]} Day.`);
    if (c2.contest) lines.push(`CONTEST TODAY: ${{ derby: "the Fishing Derby", bugOff: "the Bug-Off", snowman: "the Snowman Contest" }[c2.contest]}, 10 till 1. Ask at the plaza.`);
    if (c2.festival) lines.push(`FESTIVAL TODAY: ${{ seedToss: "the Seed Toss", lanternFloat: "the Lantern Float", greatSoup: "the Great Soup", longNight: "the Long Night" }[c2.festival]}.`);
    if (c2.show) lines.push("SHOW TONIGHT: Vesper, on the plaza lamp post, from 7. Bring nothing. She has it.");
    if (c2.market) lines.push("MARKET: Old Rind sells cheese on the plaza from 6 till noon. You did not read this here.");
    lines.push(`CHEESE: This week's pattern looks like ${st.pattern}. Today's store price: ${cheesePriceNow(g)} beans a wheel. Whoever pinned this has been very careful not to sign it.`);
    lines.push(`YOUR DEBT: ${w.player.debt.toLocaleString("en-US")} beans. It's on here so everyone can see. Mrs. Gander pinned it herself.`);
    yield* narrate(g, lines.join("//"));
    g.events.emit("readBoard", {});
  },
  *oldPear(g) {
    const w = g.world;
    const lines = ["The Old Pear. Older than the Mayor. Older than the Bell. It has seen everything twice, and fruited.", w.flags.pearLit ? "It is hung with your lights. It looks embarrassed, in a good way." : 'Someone has carved "D + a bowl" into the bark.'];
    yield* narrate(g, lines[w.clock.day % 2]);
  },
  *busStop(g) {
    const w = g.world;
    if (w.story.day1Active) {
      yield* narrate(g, "A sign on the stop says: 'Bus suspended pending your errands. Signed, a goose.'");
      return;
    }
    if (g.net) {
      g.ui.toastMsg("Bus doesn't run while you have company.");
      return;
    }
    const c2 = yield* ask(g, "hester", "Big City? It's just the one stop. You'll know it when you're in it.", ["To the City", "Not today"], { name: "Sign at the stop", voice: "hester" });
    if (c2 !== 0) return;
    yield* busRide(g, "city");
  },
  *busHome(g) {
    const c2 = yield* ask(g, "hester", "Back to the end of the line, is it? Everyone does, in the end.", ["Home", "Not yet"]);
    if (c2 !== 0) return;
    yield* busRide(g, "town");
  },
  *mayorTalk(g) {
    const w = g.world;
    const a = g.life.trundle;
    if (yield* day1Mayor(g)) return;
    if (w.flags.ribbonGone) yield* say(g, "trundle", HOSTS.trundle.arrived);
    else yield* say(g, "trundle", hostLine(g, "trundle", w.clock.day % 2 ? "greet" : "moving"));
    if (w.flags.mayorBumped !== w.clock.day) {
      w.flags.mayorBumped = w.clock.day;
      addBeans(g, 50, "mayor");
      g.ui.toastMsg("The Mayor tips his sash. +50 beans, for the election.");
    }
    g.events.emit("talkedMayor", {});
  },
  *rindTalk(g) {
    const w = g.world;
    const st = cheeseState(w, g.season, w.cheese.day || w.clock.day);
    const c2 = g.cal;
    if (!c2.market && !w.flags.rindForced) {
      yield* say(g, "rind", HOSTS.rind.closed);
      return;
    }
    const choice = yield* ask(g, "rind", `${hostLine(g, "rind", "greet")}//${st.base} beans a wheel. No receipts.`, ["Buy one", "Buy five", "What happens to it?", "Not today"]);
    if (choice === 0 || choice === 1) {
      const n = choice === 0 ? 1 : 5;
      if (buyCheese(g, n)) {
        g.sound("bean");
        yield* say(g, "rind", hostLine(g, "rind", "buy"));
      } else yield* say(g, "rind", "Not enough beans. Or not enough pocket. I don't ask which.");
    } else if (choice === 2) yield* say(g, "rind", hostLine(g, "rind", "warn"));
  },
  *vesperTalk(g) {
    const w = g.world;
    yield* say(g, "vesper", hostLine(g, "vesper", "greet"));
    const moods = ["Quiet", "Hopeful", "Blue", "Upside Down", "Hungry", "In Debt"];
    const c2 = yield* ask(g, "vesper", hostLine(g, "vesper", "ask"), [moods[w.clock.day % 6], moods[(w.clock.day + 2) % 6], moods[(w.clock.day + 4) % 6], "Just listening"]);
    if (c2 < 0 || c2 === 3) return;
    const idx = (w.clock.day + c2 * 2) % 6;
    g.music.setOverride(`vesper${idx}`);
    g.events.emit("vesperPlays", { idx });
    g.life.vesper.play("Accordion", 0.2);
    for (const n of g.npcs.all()) if (!n.inside && n.here) {
      n.overrideClip = "Sway";
    }
    const song = `vesper${idx}`;
    g.scripts.run(g.festivals.singAlong(song, "vesper", 20), { hold: false, name: "vesperSing" });
    yield* narrate(g, "She plays. The whole plaza goes a bit quiet, and then a bit quieter. Somebody sniffs. It might be Bartleby.");
    if (!w.records.includes(idx)) {
      w.records.push(idx);
      if (hasRoom(w)) {
        addItem(g, `record${idx}`);
        yield* say(g, "vesper", hostLine(g, "vesper", "give"));
        g.sound("reveal");
        g.events.emit("gotRecord", { idx });
      }
    }
    g.ctx.tweens.call(18, () => {
      g.music.setOverride(null);
      for (const n of g.npcs.all()) n.overrideClip = null;
      g.life.vesper.play("VesperHang", 0.2);
    });
  },
  *lighthouseKnock(g) {
    g.sound("knock");
    yield 0.2;
    g.sound("knock");
    yield 0.5;
    yield* narrate(g, 'Nobody answers. The light goes round. A note on the door says: "Back in a moment." The note is very old.');
    g.events.emit("lighthouse", {});
  },
  ...SERVICES,
  ...VENUES,
  *hostTalk(g, t) {
    if (t.talkTo === "flavia") yield* VENUES.fashionCheck(g);
    else yield* SERVICES.hostTalk(g, t);
  }
};
function* doorJingle(g) {
  for (const n of g.world.chime.slice(0, 4)) {
    if (n >= 0) g.ctx.audio.play("bellNote", { pitch: noteOf(n) + 2, volume: 0.35 });
    yield 0.13;
  }
}
function sitDown(g, x, z) {
  const p = g.player;
  p.x = x;
  p.z = z + 0.05;
  p.y = g.place.height(x, z) + 0.28;
  p.facing = 0;
  p.turnTo = null;
  p.sitting = true;
  p.play("Sit", 0.12);
  g.events.emit("sat", {});
}
function standUp(g, x, z) {
  const p = g.player;
  p.sitting = false;
  p.z = z + 0.8;
  if (g.place.blocked(p.x, p.z)) p.z = z - 0.8;
  p.y = g.place.height(p.x, p.z);
  p.play("Idle", 0.15);
}
function* sit(g, x, z) {
  sitDown(g, x, z);
  yield 0.4;
  g.frozenHoldSit = true;
  while (true) {
    const inp = g.inp;
    if (inp.confirm || inp.back || inp.mouse.click || Math.hypot(inp.axisX, inp.axisY) > 0.3) break;
    yield;
  }
  standUp(g, x, z);
}
function* runAction(g, t) {
  const fn = ACTIONS[t.act] ?? ((gg, tt) => festivalAction(gg, tt));
  const r = fn(g, t);
  if (r && r.next) yield* r;
}

// src/systems/interact.js
init_tools();

// src/ui/screens/pause.js
init_ui();

// src/ui/screens/map.js
init_draw();
init_tiles();
init_town();
init_neighbours();
var SEASON_LAWN = ["lime", "green", "sand", "white"];
var SEASON_HIGH = ["lime", "lime", "orange", "mist"];
var CHAR_MAP = { ".": "a", ":": "b", "=": "c", '"': "c", _: "d", s: "c", "~": "e", w: "f", o: "f", m: "e", t: "f", W: "f", f: "g", B: "h", "^": "c", b: "h", d: "h", C: "i", "#": "j", H: "j" };
var rowsCache = null;
function mapRows() {
  if (rowsCache) return rowsCache;
  const s = 3;
  const grid = [];
  for (let z = 0; z < ROWS; z++) {
    let line2 = "";
    for (let x = 0; x < COLS; x++) line2 += (CHAR_MAP[tileChar(x, z)] ?? "a").repeat(s);
    for (let i = 0; i < s; i++) grid.push(line2);
  }
  const out = grid.map((l) => l.split(""));
  for (const b of BUILDINGS) for (let z = b.z * s; z < (b.z + b.d) * s; z++) for (let x = b.x * s; x < (b.x + b.w) * s; x++) out[z][x] = "k";
  rowsCache = out.map((l) => l.join(""));
  return rowsCache;
}
var MapScreen = class {
  constructor(g) {
    this.id = "map";
    this.focus = 0;
    this.pins = [];
    for (const b of BUILDINGS) this.pins.push({ name: b.id === "home" ? "Your place" : b.name, x: b.x + b.w / 2, z: b.z + b.d / 2, kind: "b" });
    this.pins.push({ name: "Bus stop", x: LANDMARKS.busStop[0], z: LANDMARKS.busStop[1], kind: "b" });
    this.pins.push({ name: "The Old Pear", x: LANDMARKS.oldPear[0], z: LANDMARKS.oldPear[1], kind: "b" });
    this.pins.push({ name: "The Lookout", x: LANDMARKS.lookoutBench[0], z: LANDMARKS.lookoutBench[1], kind: "b" });
    this.pins.push({ name: "The Lighthouse", x: LANDMARKS.lighthouse[0], z: LANDMARKS.lighthouse[1], kind: "b" });
    for (const id of NEIGHBOUR_ORDER) if (g.world.npcs[id].moved === "here") {
      const a = g.npcs.actor(id);
      const inside = g.npcs.get(id).inside;
      this.pins.push({ name: inside ? `${NEIGHBOURS[id].name}, indoors` : NEIGHBOURS[id].name, x: a.x, z: a.z, kind: "n", dim: inside });
    }
    this.focusPin = this.pins.findIndex((p) => p.kind === "n");
    if (this.focusPin < 0) this.focusPin = 0;
  }
  focusIndex() {
    return this.focusPin;
  }
  labels() {
    return this.pins.map((p) => p.name);
  }
  update(g, inp) {
    if (inp.nav.right || inp.nav.down) {
      this.focusPin = (this.focusPin + 1) % this.pins.length;
      g.sound("uiTick");
    }
    if (inp.nav.left || inp.nav.up) {
      this.focusPin = (this.focusPin + this.pins.length - 1) % this.pins.length;
      g.sound("uiTick");
    }
    const m = inp.mouse;
    if (m.moved) this.pins.forEach((p, i) => {
      const [x, y] = this.at(p);
      if (Math.hypot(m.x - x, m.y - y) < 5) this.focusPin = i;
    });
    if (inp.back || inp.map || inp.confirm || m.rclick) {
      g.sound("uiCancel");
      g.ui.pop(this);
    }
  }
  at(p) {
    return [120 + Math.round(p.x * 3), 22 + Math.round(p.z * 3)];
  }
  prompts() {
    return [["back", "Close"]];
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 112, 14, 256, 208, { fill: "navy", trim: "sand" });
    const season = g.season;
    hud.sprite(120, 22, mapRows(), { a: SEASON_LAWN[season], b: SEASON_HIGH[season], c: "sand", d: "mist", e: "blue", f: "sky", g: "white", h: "orange", i: "slate", j: "teal", k: "plum" }, { shadow: false });
    this.pins.forEach((p, i) => {
      const [x, y] = this.at(p);
      if (i === this.focusPin) {
        hud.rect(x - 3, y - 3, 7, 7, "ink");
        hud.rect(x - 2, y - 2, 5, 5, "sand");
      } else if (p.kind === "n") {
        hud.rect(x - 1, y - 1, 3, 3, p.dim ? "slate" : "red");
      }
    });
    if (g.place === g.town) {
      const [x, y] = this.at({ x: g.player.x, z: g.player.z });
      const on = Math.floor(g.ctx.time * 3) % 2 === 0;
      hud.rect(x - 2, y - 2, 5, 5, on ? "white" : "ink");
    }
    const name = this.pins[this.focusPin].name;
    const col2 = Math.max(0, Math.min(4, Math.floor(g.player.x / 16))), row = Math.max(0, Math.min(3, Math.floor(g.player.z / 16)));
    const where = g.place === g.town ? `You are in ${ACRE_NAMES[row][col2]}.` : `You are at ${g.place.def?.name ?? g.place.name}.`;
    panel(hud, 112, 224, 256, 26, { fill: "white", trim: "sand" });
    drawText(hud, 240, 228, name, { align: "center", color: "ink" });
    drawText(hud, 240, 238, where, { align: "center", color: "slate" });
  }
};
var mapScreen = (g) => new MapScreen(g);

// src/ui/screens/almanac.js
init_draw();
init_icons();
init_fish();
init_bugs();
init_fossils();
init_art();
init_stargaze();
init_keyboard();
init_items();
init_calendar();
var TABS = ["Fish", "Bugs", "Fossils", "Art", "Stars", "Calendar"];
var STARS_TAB = TABS.indexOf("Stars");
var SIL = { o: "night", x: "night", w: "night", "#": "ink" };
var when = (d) => {
  const seas = d.seasons?.map((s) => SEASON_NAMES[s]).join(", ") ?? "";
  const h = d.hours ? d.hours[0] > 16 ? ", evenings" : d.hours[1] < 12 ? ", mornings" : ", daytime" : "";
  return `${seas}${h}`;
};
var YEAR_NOTES = { 1: "Arrival", 2: "Museum opens", 3: "Set the Chime; Vesper", 4: "The Seed Toss", 5: "Season turns; Old Rind", 6: "Fishing Derby", 7: "Vesper", 8: "The Lantern Float", 9: "Fitch moves in", 10: "Bug-Off", 11: "Vesper", 12: "The Great Soup", 13: "First snow", 14: "Snowman Contest", 15: "Vesper", 16: "The Long Night" };
var Almanac = class {
  constructor() {
    this.id = "almanac";
    this.tab = 0;
    this.focus = 0;
    this.cols = 6;
  }
  labels() {
    return TABS;
  }
  focusIndex() {
    return this.tab * 100 + this.focus;
  }
  entries(g) {
    const w = g.world;
    switch (this.tab) {
      case 0:
        return FISH.map((f) => ({ id: f.id, name: f.name, known: !!w.almanac.fish[f.id], icon: f.icon, colors: ITEMS[f.id].iconColors, line: f.line, where: `${f.where === "mouth" ? "River mouth" : f.where[0].toUpperCase() + f.where.slice(1)}. ${when(f)}.`, donated: w.museum.fish[f.id], beans: f.beans }));
      case 1:
        return BUGS.map((b) => ({ id: b.id, name: b.name, known: !!w.almanac.bug[b.id], icon: b.icon, colors: ITEMS[b.id].iconColors, line: b.line, where: `On ${b.spot === "near" ? "the banks" : b.spot}. ${when(b)}.`, donated: w.museum.bug[b.id], beans: b.beans }));
      case 2:
        return FOSSILS.map((f) => ({ id: f.id, name: f.name, known: !!w.almanac.fossil[f.id], icon: f.set ? "bone" : "ammonite", colors: { o: "sand", x: "orange" }, line: f.line, where: f.set ? f.set === "moatosaur" ? "Part of the Moatosaur." : "Part of the Long-Necked Regretodon." : "A piece on its own.", donated: w.museum.fossil[f.id], beans: f.beans }));
      case 3:
        return ART.map((a) => ({ id: a.id, name: a.name, known: !!w.almanac.art[a.id], icon: "picture", colors: { o: "sky", x: "orange" }, line: a.line, where: "Sold after dark, in an alley. Compare it with the print.", donated: w.museum.art[a.id], beans: a.beans }));
      case STARS_TAB:
        return CONSTELLATIONS.map((c2) => ({ id: c2.id, name: starName(w, c2), known: !!w.almanac.stars[c2.id], icon: "star", colors: { o: "sand", x: "white" }, line: "Up at the Lookout, on a clear night.", where: w.almanac.starNames[c2.id] ? "Named by you, more or less." : "That's only what people call it. You could do better.", donated: false }));
      default:
        return [];
    }
  }
  update(g, inp) {
    if (inp.tabPrev) {
      this.tab = (this.tab + TABS.length - 1) % TABS.length;
      this.focus = 0;
      g.sound("almanacTurn");
    }
    if (inp.tabNext) {
      this.tab = (this.tab + 1) % TABS.length;
      this.focus = 0;
      g.sound("almanacTurn");
    }
    const n = this.entries(g).length;
    if (n) {
      if (inp.nav.right) {
        this.focus = (this.focus + 1) % n;
        g.sound("uiTick");
      }
      if (inp.nav.left) {
        this.focus = (this.focus + n - 1) % n;
        g.sound("uiTick");
      }
      if (inp.nav.down) {
        this.focus = Math.min(n - 1, this.focus + this.cols);
        g.sound("uiTick");
      }
      if (inp.nav.up) {
        this.focus = Math.max(0, this.focus - this.cols);
        g.sound("uiTick");
      }
    }
    if (this.tab === STARS_TAB && inp.confirm) {
      this.nameFocused(g);
      return;
    }
    const m = inp.mouse;
    TABS.forEach((_, i) => {
      if (m.click && inRect(m, 78 + i * 54, 20, 52, 18)) {
        this.tab = i;
        this.focus = 0;
        g.sound("almanacTurn");
      }
    });
    for (let i = 0; i < n; i++) if (inRect(m, ...this.rect(i))) {
      if (m.moved || m.click) this.focus = i;
      if (m.click && this.tab === STARS_TAB) {
        this.nameFocused(g);
        return;
      }
    }
    if (inp.back || inp.almanac || m.rclick) {
      g.sound("uiCancel");
      g.ui.pop(this);
    }
  }
  nameFocused(g) {
    const c2 = CONSTELLATIONS[this.focus];
    const w = g.world;
    if (!w.almanac.stars[c2.id]) {
      g.sound("uiError");
      return;
    }
    g.sound("uiConfirm");
    openKeyboard(g, {
      title: "What do you call this one?",
      max: 24,
      hint: `Right now it's ${starName(w, c2)}.`,
      random: c2.suggest,
      onCancel: () => {
      },
      onDone: (name) => {
        w.almanac.starNames[c2.id] = name;
        g.sound("star");
        g.ui.toastMsg(`${name}. It's official. Nobody checks.`);
        g.events.emit("constellationNamed", { id: c2.id, name });
      }
    });
  }
  rect(i) {
    return [84 + i % this.cols * 52, 44 + Math.floor(i / this.cols) * 42, 50, 40];
  }
  prompts() {
    const c2 = this.tab === STARS_TAB ? CONSTELLATIONS[this.focus] : null;
    const base = [["tabs", "Turn page"], ["back", "Close"]];
    return c2 && this.g.world.almanac.stars[c2.id] ? [["confirm", "Name it"], ...base] : base;
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 70, 14, 340, 240, { fill: "white", trim: "sand" });
    TABS.forEach((t, i) => {
      const on = this.tab === i;
      panel(hud, 78 + i * 54, 20, 52, 18, { fill: on ? "sand" : "white", trim: on ? "orange" : "mist" });
      drawText(hud, 78 + i * 54 + 26, 26, t, { align: "center", color: "ink" });
    });
    if (this.tab === 5) {
      this.drawCalendar(g, hud);
      return;
    }
    const list = this.entries(g);
    list.forEach((e2, i) => {
      const [x, y, w, h] = this.rect(i);
      const f = i === this.focus;
      panel(hud, x, y, w, h, { fill: f ? "sand" : "white", trim: f ? "orange" : "mist" });
      drawIcon(hud, x + 9, y + 4, e2.icon, e2.known ? e2.colors : SIL, 2);
      if (e2.donated) hud.rect(x + w - 8, y + 4, 4, 4, "green");
    });
    const e = list[this.focus];
    if (e) {
      const known = e.known;
      drawText(hud, 240, 176, known ? e.name : "???", { align: "center", color: "ink" });
      textBlock(hud, 88, 190, 304, known ? `${e.line}` : "Not yet. The page is waiting.", { color: "slate" });
      if (known) drawText(hud, 240, 232, `${e.where}${e.donated ? " In the museum." : ""}`, { align: "center", color: "plum" });
    }
  }
  drawCalendar(g, hud) {
    const today = villageDay(g.world.clock.day).calendarDay;
    for (let d = 1; d <= 16; d++) {
      const col2 = (d - 1) % 4, row = Math.floor((d - 1) / 4);
      const x = 84 + col2 * 78, y = 46 + row * 46;
      const f = d === today;
      panel(hud, x, y, 74, 42, { fill: f ? "sand" : "white", trim: f ? "orange" : "mist" });
      const v2 = villageDay(d);
      drawText(hud, x + 5, y + 5, `${d} ${DAY_TYPES[v2.type].split(" ")[0]}`, { color: "ink" });
      const note = YEAR_NOTES[d];
      const words = note.split(" ");
      let line2 = "", ln = 0;
      for (const wd of words) {
        if ((line2 + wd).length > 11) {
          drawText(hud, x + 5, y + 16 + ln * 11, line2.trim(), { color: "slate" });
          ln++;
          line2 = "";
        }
        line2 += `${wd} `;
      }
      drawText(hud, x + 5, y + 16 + ln * 11, line2.trim(), { color: "slate" });
    }
    SEASON_NAMES.forEach((s, i) => drawText(hud, 82, 46 + i * 46 - 0, "", { color: "ink" }));
  }
};
var almanacScreen = () => new Almanac();

// src/ui/screens/pause.js
init_settings();
init_about2();
init_dev();
init_session();
function pauseMenu(g) {
  const items = [
    { label: "Resume", action: (gg, m) => gg.ui.pop(m) },
    { label: "Map", action: (gg) => gg.ui.push(mapScreen(gg)) },
    { label: "Almanac", action: (gg) => gg.ui.push(almanacScreen(gg)) },
    { label: "Settings", action: (gg) => gg.ui.push(settingsScreen(gg)) },
    { label: g.net?.role === "guest" ? "Catch the bus home" : "Save & Quit to Title", action: (gg) => {
      saveNow(gg);
      markSessionClean(gg);
      gg.quitToTitle();
    } },
    { label: "About", action: (gg) => gg.ui.push(aboutScreen(gg)) },
    { label: "Dev Mode", action: (gg) => gg.ui.push(devScreen(gg)) }
  ];
  return new Menu({ id: "pause", title: "Paused", items, x: 150, y: 52, w: 180, itemH: 20, gap: 3, back: (gg, m) => gg.ui.pop(m), prompts: [["confirm", "Select"], ["back", "Resume"]] });
}

// src/systems/interact.js
init_pockets();
init_emote();
var { Mesh: Mesh9, BoxGeometry: BoxGeometry7, Group: Group11, Vector3: Vector34 } = engine_exports.THREE;
var v = new Vector34();
var origin = new Vector34();
var dir2 = new Vector34();
var Interact = class {
  constructor(g) {
    this.g = g;
    this.target = null;
    this.hover = null;
    this.tile = null;
    this.chevronT = 0;
    this.lastList = [];
    this.hoverPoint = null;
    this.highlight = new Group11();
    const mat = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.sand);
    for (const [w, d, x, z] of [[1, 0.06, 0.5, 0.03], [1, 0.06, 0.5, 0.97], [0.06, 1, 0.03, 0.5], [0.06, 1, 0.97, 0.5]]) {
      const m = new Mesh9(new BoxGeometry7(w, 0.03, d), mat);
      m.position.set(x, 0.03, z);
      this.highlight.add(m);
    }
    this.highlight.visible = false;
  }
  clear() {
    this.target = null;
    this.hover = null;
    this.highlight.visible = false;
    this.tile = null;
  }
  list() {
    const g = this.g;
    const place = g.place;
    const out = [];
    if (place.interactables) out.push(...place.interactables(g));
    if (place === g.town) {
      out.push(...townInteractables(g));
      const p = g.player;
      const px = Math.floor(p.x), pz = Math.floor(p.z);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const k = `${px + dx},${pz + dz}`;
        const o = g.world.town.objects[k];
        if (!o) continue;
        const verb = objectVerb(g, k, o, px + dx, pz + dz);
        if (verb) out.push({ id: `obj:${k}`, x: px + dx + 0.5, z: pz + dz + 0.5, r: o.k === "tree" ? 1.6 : 1.25, key: k, obj: o, ...verb });
      }
    }
    for (const n of g.npcs.all()) {
      const a = n.actor;
      if (!a.visible) continue;
      if (a.root.parent !== place.group) continue;
      out.push({ id: `npc:${n.id}`, x: a.x, z: a.z, r: 1.6, label: `Talk to ${n.data.short ?? n.data.name}`, act: "npcTalk", npc: n.id, moving: true });
    }
    out.push(...g.life.interactables());
    out.push(...g.festivals.interactables());
    return out;
  }
  update() {
    const g = this.g;
    const p = g.player;
    const list = this.list();
    this.lastList = list;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    let best = null, bestScore = 1e9;
    for (const t of list) {
      const dx = t.x - p.x, dz = t.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > t.r) continue;
      const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
      if (dot < 0.5 && d > 0.75) continue;
      const score = d - dot * 0.6;
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }
    const m = g.inp.mouse;
    this.hover = null;
    if (g.inp.device === "kbm" && m.used && m.over) {
      const hit = this.groundPoint();
      if (hit) {
        this.hoverPoint = hit;
        let h = null, hd = 1;
        for (const t of list) {
          const d = Math.hypot(t.x - hit.x, t.z - hit.z);
          if (d < hd) {
            hd = d;
            h = t;
          }
        }
        this.hover = h;
        if (h) best = Math.hypot(h.x - p.x, h.z - p.z) <= h.r ? h : best;
      }
    } else this.hoverPoint = null;
    this.target = best;
    let tx = Math.floor(p.x + fx * 0.9), tz = Math.floor(p.z + fz * 0.9);
    if (this.hoverPoint && g.place === g.town) {
      tx = Math.floor(this.hoverPoint.x);
      tz = Math.floor(this.hoverPoint.z);
    }
    this.tile = [tx, tz];
    const show = g.place === g.town && !!g.world.player.tool && g.world.player.tool !== "net" && g.world.player.tool !== "slingshot";
    if (show && !this.highlight.parent) g.town.group.add(this.highlight);
    this.highlight.visible = show;
    if (show) this.highlight.position.set(tx, g.town.height(tx + 0.5, tz + 0.5) + 0.02, tz);
  }
  /** World point under the mouse, on the ground. */
  groundPoint() {
    const g = this.g;
    const cam = g.ctx.camera;
    const p = g.ctx.input.pointer;
    cam.rayAt(p.x, p.y, origin, dir2);
    const place = g.place;
    let y = g.player.y;
    let hx = 0, hz = 0;
    for (let i = 0; i < 3; i++) {
      const t = (y - origin.y) / dir2.y;
      hx = origin.x + dir2.x * t - place.ox;
      hz = origin.z + dir2.z * t - place.oz;
      y = place.height(hx, hz);
    }
    return { x: hx, z: hz };
  }
  activate(t) {
    const g = this.g;
    g.scripts.run(runAction(g, t), { name: t.act ?? "verb" });
  }
  drawPrompts(hud) {
    const g = this.g;
    if (!this.g.canAct()) return;
    const t = this.target;
    const prompts = [];
    if (t) prompts.push(["confirm", t.label]);
    const tp = toolPrompt(g);
    if (tp) prompts.push(["use", tp]);
    if (prompts.length < 3 && !t && !tp) prompts.push(["pockets", "Pockets"]);
    g.ui.prompts = prompts;
    if (g.ui.hudAlpha > 0.5 || prompts.length) g.ui.drawPrompts(hud, prompts.slice(0, 3), "corner");
    const c2 = this.hover ?? t;
    if (c2) {
      const s = g.project(c2.x, g.place.height(c2.x, c2.z) + (c2.npc ? 2 : 1.3), c2.z);
      this.chevronT += 0.016;
      const bob = Math.round(Math.sin(this.chevronT * 7) * 2);
      if (s) hud.sprite(s.x - 3, s.y - 8 + bob, CHEVRON, CHEV_COL, { shadow: false });
      if (this.hover && s) {
        const w = textWidth(this.hover.label) + 10;
        panel(hud, s.x - w / 2, s.y - 26, w, 15, { fill: "white", trim: "sand" });
        drawText(hud, s.x, s.y - 22, this.hover.label, { align: "center", color: "ink" });
      }
    }
    drawToolRing(g, hud);
  }
};
var CHEVRON = ["#######", "#ooooo#", ".#ooo#.", "..#o#..", "...#..."];
var CHEV_COL = { "#": "ink", o: "sand" };
function worldInput(g, dt) {
  const inp = g.inp;
  const m = inp.mouse;
  g.interact.update();
  if (inp.pause) {
    g.sound("uiConfirm");
    g.ui.push(pauseMenu(g));
    return;
  }
  if (inp.pockets) {
    g.sound("uiConfirm");
    g.ui.push(pocketsScreen(g));
    return;
  }
  if (inp.map) {
    g.sound("uiConfirm");
    g.ui.push(mapScreen(g));
    return;
  }
  if (inp.almanac) {
    g.sound("uiConfirm");
    g.ui.push(almanacScreen(g));
    return;
  }
  if (inp.emote) {
    g.sound("uiConfirm");
    g.ui.push(emoteWheel(g));
    return;
  }
  if (inp.camL) g.turnCamera(-1);
  if (inp.camR) g.turnCamera(1);
  if (inp.zoomIn) g.zoomStep(1);
  if (inp.zoomOut) g.zoomStep(-1);
  if (inp.prevTool) cycleTool(g, -1);
  if (inp.nextTool) cycleTool(g, 1);
  if (inp.digit) setToolByDigit(g, inp.digit);
  if (g.player.poseTimer > 0) return;
  if (g.festivals.active?.kind !== "seedToss") toolInput(g, dt);
  if (inp.confirm) {
    const t = g.interact.target;
    if (t) {
      g.interact.activate(t);
      return;
    }
  }
  if (m.click && m.over) {
    const hit = g.interact.groundPoint();
    const h = g.interact.hover;
    if (h) {
      const d = Math.hypot(h.x - g.player.x, h.z - g.player.z);
      if (d <= h.r) {
        g.interact.activate(h);
        return;
      }
      g.player.walkTo(h.x, h.z, { stop: Math.max(0.8, h.r - 0.3), then: () => {
        g.player.faceToward(h.x, h.z);
        g.interact.activate(h);
      } });
    } else if (hit) {
      g.player.walkTo(hit.x, hit.z, { path: !g.place.blocked(hit.x, hit.z) });
    }
  } else if (m.down && m.over && !g.interact.hover && g.idleMouseHold !== false) {
    const hit = g.interact.groundPoint();
    if (hit && !g.place.blocked(hit.x, hit.z)) {
      const pl = g.player;
      if (Math.hypot(hit.x - pl.x, hit.z - pl.z) > 0.8) {
        pl.walkTarget = { x: hit.x, z: hit.z, stop: 0.2 };
        pl.walkPath = null;
        pl.walkThen = null;
      }
    }
  }
  const place = g.place;
  if (place.kind === "room") {
    const e = place.def.exit;
    if (e && g.player.z > place.d - 0.3) g.scripts.run(runAction(g, { act: "leaveRoom", exit: e }), { name: "leaveRoom" });
  }
  if (place === g.city || place === g.town) g.interact.tileUnderfoot = tileChar(Math.floor(g.player.x), Math.floor(g.player.z));
}

// src/actors/npc.js
init_rig();
init_critter();
init_neighbours();
init_town();
init_tuning();
init_rng();
init_time();
init_unique();
init_time();
var UMBRELLA = { dorrit: "orange", tavi: "sand", bartleby: "night", ottoline: "plum", rocco: "red", nib: "navy", ozzie: "slate", yolanda: "red", fitch: "green" };
var doorOf = (id) => {
  const b = BUILDINGS.find((x) => x.id === NEIGHBOURS[id].building);
  return b.door;
};
var Npc = class {
  constructor(g, id) {
    this.g = g;
    this.id = id;
    this.data = NEIGHBOURS[id];
    this.actor = new Actor(CRITTER_DEFS[id], { name: id, seed: id.length + id.charCodeAt(0) });
    this.state = "idle";
    this.timer = 1;
    this.path = null;
    this.inside = false;
    this.talking = false;
    this.bubble = null;
    this.bubbleT = 0;
    this.chatPartner = null;
    this.poi = null;
    this.poiIdx = 0;
    this.umbrella = null;
    this.tailT = 0;
  }
  get saved() {
    return this.g.world.npcs[this.id];
  }
  get here() {
    return this.saved.moved === "here" || this.saved.moved === "leaving";
  }
  setPos(x, z) {
    const p = this.g.town;
    this.actor.x = x;
    this.actor.z = z;
    this.actor.y = p.height(x, z);
  }
  shouldBeOut() {
    const w = this.g.world;
    if (!this.here) return false;
    if (this.g.festivals?.holdsNpc?.(this.id)) return true;
    const h = hourNow(w) < 5 ? hourNow(w) + 24 : hourNow(w);
    if (h < this.data.wake || h >= this.data.sleep) return false;
    const k = weatherNow(this.g);
    const wet = k === "rain" || k === "storm";
    const s = new Stream(`${w.seed}:rainy:${w.clock.day}:${this.id}`);
    if (wet && s.chance(0.4)) return false;
    if (this.g.cal.festival === "longNight" && h >= 22) return true;
    return true;
  }
  walkTo(x, z) {
    const nav = this.g.town.nav;
    const p = nav.path([this.actor.x, 0, this.actor.z], [x, 0, z]);
    if (p && p.length > 1) {
      this.path = p.slice(1);
      this.state = "walk";
      return true;
    }
    this.path = null;
    return false;
  }
  pickPoi() {
    const w = this.g.world;
    const s = new Stream(`${w.seed}:poi:${w.clock.day}:${this.id}`);
    const list = s.shuffle(POIS);
    this.poiIdx = (this.poiIdx + 1) % list.length;
    return list[this.poiIdx];
  }
  fixedStep(dt) {
    if (this.talking || this.held) return;
    const g = this.g;
    if (!this.here) {
      this.inside = true;
      return;
    }
    const out = this.shouldBeOut();
    if (!out && !this.inside && this.state !== "goingHome") {
      const [dx, dz] = doorOf(this.id);
      if (this.walkTo(dx, dz)) this.state = "goingHome";
      else {
        this.inside = true;
        this.state = "idle";
      }
    }
    if (out && this.inside) {
      const [dx, dz] = doorOf(this.id);
      this.inside = false;
      this.setPos(dx, dz + 0.4);
      this.state = "idle";
      this.timer = 2;
      this.g.npcs.syncVisibility(this);
    }
    if (this.inside) return;
    switch (this.state) {
      case "walk":
      case "goingHome": {
        const a = this.actor;
        const n = this.path?.[0];
        if (!n) {
          this.arrive();
          break;
        }
        const ddx = n[0] - a.x, ddz = n[2] - a.z;
        const d = Math.hypot(ddx, ddz);
        const sp = tuning.npcSpeed * (this.id === "rocco" ? 1.7 : this.id === "nib" ? 0.8 : 1);
        if (d < 0.1) {
          this.path.shift();
          if (!this.path.length) this.arrive();
          break;
        }
        a.x += ddx / d * sp * dt;
        a.z += ddz / d * sp * dt;
        a.y = g.town.height(a.x, a.z);
        a.turnTo = Math.atan2(ddx, ddz);
        break;
      }
      case "idle":
      case "sit":
      case "stare":
      case "fish":
      case "chat": {
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.state === "chat") {
            this.chatPartner = null;
          }
          const next = this.pickPoi();
          this.poi = next;
          if (!this.walkTo(next.x, next.z)) {
            this.state = "idle";
            this.timer = 4;
          }
        }
        break;
      }
      default:
        break;
    }
  }
  arrive() {
    this.path = null;
    if (this.state === "goingHome") {
      this.inside = true;
      this.state = "idle";
      this.g.npcs.syncVisibility(this);
      return;
    }
    const kind = this.poi?.kind ?? "stand";
    this.state = kind === "sit" ? "sit" : kind === "fish" ? "fish" : kind === "stare" ? "stare" : "idle";
    this.timer = 18 + (this.actor.x * 37 + this.actor.z * 13) % 24;
    if (this.poi?.face !== void 0) this.actor.turnTo = this.poi.face;
  }
  presentation(dt, near) {
    const a = this.actor;
    if (this.inside && !this.g.npcs.roomGuest(this)) return;
    if (!near) {
      a.time += dt;
      a.root.position.set(a.x, a.y, a.z);
      if (a.shadow) a.shadow.place(a.x, a.y, a.z, 0);
      return;
    }
    if (!this.talking && !a.finished === false) {
    }
    let clip2 = "Idle";
    if (this.state === "walk" || this.state === "goingHome") clip2 = this.id === "rocco" ? "RoccoRoll" : "Walk";
    else if (this.state === "sit") clip2 = "Sit";
    else if (this.state === "fish") clip2 = "Reel";
    else if (this.state === "stare") clip2 = "Hum";
    else if (this.state === "chat") clip2 = "Talk";
    else if (this.talking) clip2 = "Listen";
    if (this.g.festivals?.pose?.(this.id)) clip2 = this.g.festivals.pose(this.id);
    if (this.overrideClip) clip2 = this.overrideClip;
    const k = this.g.sky?.kind;
    a.setUmbrella(k === "rain" || k === "storm" ? { a: UMBRELLA[this.id] ?? "blue", b: "navy" } : null);
    if (!this.emoting || a.finished) {
      this.emoting = false;
      if (a.playing !== clip2) a.play(clip2, 0.2);
    }
    a.update(dt);
    if (this.bubbleT > 0) this.bubbleT -= dt;
  }
};
var NpcManager = class {
  constructor(g) {
    this.g = g;
    this.list = [];
    this.map = /* @__PURE__ */ new Map();
    this.chatT = 6;
    this.chatSeq = 0;
    this.roomOwner = null;
  }
  buildAll() {
    const g = this.g;
    for (const id of NEIGHBOUR_ORDER) {
      const n = new Npc(g, id);
      n.actor.addTo(g.town.group);
      this.list.push(n);
      this.map.set(id, n);
    }
    this.scatter();
  }
  /** Put everyone where their routine says (a new day, a save, a long sleep). */
  scatter() {
    const g = this.g;
    const w = g.world;
    const s = new Stream(`${w.seed}:scatter:${w.clock.day}:${Math.floor(w.clock.minute / 60)}`);
    for (const n of this.list) {
      n.talking = false;
      n.path = null;
      n.chatPartner = null;
      n.state = "idle";
      n.timer = s.range(2, 15);
      const [dx, dz] = doorOf(n.id);
      if (!n.here || !n.shouldBeOut()) {
        n.inside = true;
        n.setPos(dx, dz + 0.4);
      } else {
        n.inside = false;
        const poi = s.pick(POIS);
        n.poi = poi;
        n.setPos(poi.x, poi.z);
        n.state = poi.kind === "sit" ? "sit" : poi.kind === "fish" ? "fish" : poi.kind === "stare" ? "stare" : "idle";
        n.timer = s.range(6, 30);
        if (poi.face !== void 0) n.actor.facing = poi.face;
      }
      this.syncVisibility(n);
    }
  }
  roomGuest(n) {
    const p = this.g.place;
    return p?.kind === "room" && p.owner === n.id && n.here && n.inside;
  }
  syncVisibility(n) {
    const g = this.g;
    const p = g.place;
    if (this.roomGuest(n)) {
      n.actor.addTo(p.group);
      n.actor.visible = true;
      const spot = p.ownerSpot ?? [0, 0];
      n.actor.x = spot[0];
      n.actor.z = spot[1];
      n.actor.y = 0;
      n.actor.facing = 0;
      return;
    }
    if (n.actor.root.parent !== g.town.group) n.actor.addTo(g.town.group);
    n.actor.visible = !n.inside && n.here;
    if (!n.inside) n.setPos(n.actor.x, n.actor.z);
  }
  placeChanged() {
    for (const n of this.list) this.syncVisibility(n);
  }
  get(id) {
    return this.map.get(id);
  }
  actor(id) {
    return this.map.get(id)?.actor ?? null;
  }
  fixedStep(dt) {
    for (const n of this.list) n.fixedStep(dt);
    this.chatT -= dt * tuning.chatRate;
    if (this.chatT <= 0 && tuning.chatRate > 0) {
      this.chatT = 9;
      this.tryChat();
    }
  }
  tryChat() {
    const idle = this.list.filter((n) => !n.inside && !n.talking && (n.state === "idle" || n.state === "stare") && !n.chatPartner && n.here);
    for (let i = 0; i < idle.length; i++) for (let j = i + 1; j < idle.length; j++) {
      const a = idle[i], b = idle[j];
      if (Math.hypot(a.actor.x - b.actor.x, a.actor.z - b.actor.z) > 6) continue;
      const chat = CHATS.find((c2) => c2[0] === a.id && c2[1] === b.id || c2[0] === b.id && c2[1] === a.id);
      if (!chat) continue;
      const first = chat[0] === a.id ? a : b;
      const second = first === a ? b : a;
      for (const n of [first, second]) {
        n.state = "chat";
        n.timer = 12;
        n.chatPartner = n === first ? second : first;
        n.path = null;
      }
      first.actor.faceToward(second.actor.x, second.actor.z);
      second.actor.faceToward(first.actor.x, first.actor.z);
      first.bubble = chat[2];
      first.bubbleT = 6;
      second.bubble = chat[3];
      second.bubbleT = 0;
      second.pendingBubble = 3;
      this.g.events.emit("chat", { a: first.id, b: second.id });
      return;
    }
  }
  presentation(dt) {
    const g = this.g;
    const p = g.player;
    const camX = p.x, camZ = p.z;
    const inTown = g.place === g.town;
    for (const n of this.list) {
      const a = n.actor;
      if (n.pendingBubble > 0) {
        n.pendingBubble -= dt;
        if (n.pendingBubble <= 0) {
          n.bubbleT = 4;
        }
      }
      if (!a.visible) continue;
      const near = !inTown ? true : Math.abs(a.x - camX) < 16 && Math.abs(a.z - camZ) < 16;
      n.presentation(dt, near);
    }
  }
  /** Who should show a "!"? */
  markerList() {
    return this.list.filter((n) => n.saved.favour && n.saved.favour.state === "offer" && !n.inside && n.actor.visible);
  }
  all() {
    return this.list;
  }
};

// src/world/rooms.js
init_engine();
init_place();

// src/art/build.js
init_engine();
init_models();
function buildAny(id, opts = {}) {
  const def = MODELS.get(id);
  let palette = opts.palette;
  if (palette && def?.palette) palette = Object.fromEntries(Object.entries(palette).filter(([k]) => k in def.palette));
  return (0, engine_exports.buildModel)(id, { catalog: MODELS, ...opts, palette });
}

// src/data/rooms.js
var K2 = (m) => `kenney-furniture/${m}`;
var WOOD = { wood: "orange", woodDark: "red", metal: "mist", metalLight: "white", metalDark: "slate", carpet: "red", carpetDarker: "plum", lamp: "sand", plant: "green", carpetBlue: "sky" };
var DARK = { wood: "night", woodDark: "ink", metal: "slate", metalLight: "mist", metalDark: "ink", carpet: "plum", carpetDarker: "night", lamp: "sand", plant: "teal", carpetBlue: "navy" };
var PALE = { wood: "white", woodDark: "mist", metal: "mist", metalLight: "white", metalDark: "slate", carpet: "sky", carpetDarker: "blue", lamp: "cyan", plant: "green", carpetBlue: "sky" };
var YELLOW = { wood: "sand", woodDark: "orange", metal: "sand", metalLight: "white", metalDark: "orange", carpet: "sand", carpetDarker: "orange", lamp: "white", plant: "lime", carpetBlue: "sand" };
var P3 = (m, x, z, o = {}) => ({ m, x, z, ...o });
var counter = (x, z, w, o = {}) => P3("counter", x, z, { params: { w }, solid: [Math.ceil(w), 1], ...o });
var bookcase = (x, z, pal2 = WOOD, o = {}) => P3(K2("bookcase-open"), x, z, { palette: pal2, solid: [1, 1], ...o });
var pot = (x, z, y = 0) => P3("soup-pot", x, z, { scale: 0.34, y, solid: y ? null : [1, 1] });
var ROOMS = {
  store: {
    name: "Mrs. Gander's",
    w: 11,
    d: 8,
    wall: "wall-cream",
    floor: "floor-oak",
    music: "store",
    exit: { x: 5.5, z: 7.5, to: "town", tx: 56, tz: 40.4, facing: 0 },
    host: { id: "gander", x: 8.6, z: 1.5, face: 0.4 },
    props: [counter(8.4, 2.2, 3, { act: "ganderCounter", label: "Talk to Mrs. Gander", r: 1.6, talkTo: "gander" }), P3("shelf", 2, 0.6, { params: { w: 3 }, solid: [3, 1], collide: true }), P3("shelf", 5.4, 0.6, { params: { w: 2.4 }, solid: [3, 1] }), P3("shelf", 0.6, 3.5, { rot: 90, params: { w: 3 }, solid: [1, 3] }), P3("shelf", 0.6, 6.4, { rot: 90, params: { w: 1.6 }, solid: [1, 2] }), P3("shelf", 3.8, 4.2, { params: { w: 2.4 }, solid: [3, 1] }), P3("jar-of-beans", 8.6, 2.2, { y: 0.98, scale: 0.5, solid: null }), P3(K2("rug-doormat"), 5.5, 7.4, { palette: WOOD, solid: null })],
    stockSlots: [[1.1, 0.6], [2, 0.6], [2.9, 0.6], [4.6, 0.6], [5.4, 0.6], [6.2, 0.6], [0.6, 2.6], [0.6, 3.5], [0.6, 4.4], [0.6, 6], [0.6, 6.9], [3, 4.2], [3.8, 4.2], [4.6, 4.2]]
  },
  hall: {
    name: "Town Hall & Post",
    w: 12,
    d: 8,
    wall: "wall-plaster",
    floor: "floor-marble",
    music: "hall",
    exit: { x: 6, z: 7.5, to: "town", tx: 8.5, tz: 41.4, facing: 0 },
    host: { id: "clementine", x: 4.5, z: 1.6, face: 0.2 },
    props: [counter(4.6, 2.3, 4, { act: "clementineCounter", label: "Talk to Clementine", r: 1.7, talkTo: "clementine" }), P3("jar-of-beans", 8.6, 1, { scale: 1.6, solid: [1, 1], act: "beanJar", label: "Bean Jar", r: 1.5 }), P3(K2("cardboard-box-open"), 10.6, 3.5, { palette: WOOD, scale: 1.5, solid: [1, 1], act: "lostFound", label: "Lost & Found", r: 1.4 }), P3(K2("bookcase-closed-doors"), 10, 0.5, { palette: WOOD, solid: [1, 1], act: "catalogue", label: "Catalogue", r: 1.3 }), P3("old-bell", 1.3, 4.2, { scale: 0.46, solid: [1, 1], act: "chime", label: "Set the Village Chime", r: 1.4 }), P3(K2("side-table-drawers"), 1.2, 1, { palette: WOOD, solid: [1, 1], act: "writeLetter", label: "Write a letter", r: 1.4 }), P3(K2("chair-rounded"), 7.8, 6.5, { palette: WOOD, solid: [1, 1], seat: true }), P3(K2("potted-plant"), 11, 6.8, { palette: WOOD, solid: [1, 1] }), P3(K2("rug-doormat"), 6, 7.4, { palette: WOOD, solid: null })]
  },
  museum: {
    name: "The Museum",
    w: 12,
    d: 10,
    wall: "wall-bureau",
    floor: "floor-marble",
    music: "museum",
    exit: { x: 6, z: 9.5, to: "town", tx: 22.5, tz: 11.4, facing: 0 },
    host: { id: "quill", x: 6, z: 3.8, face: 0 },
    props: [P3("column", 2.2, 2.4, { scale: 0.9, solid: [1, 1] }), P3("column", 9.8, 2.4, { scale: 0.9, solid: [1, 1] }), P3("column", 2.2, 7.4, { scale: 0.9, solid: [1, 1] }), P3("column", 9.8, 7.4, { scale: 0.9, solid: [1, 1] }), counter(6, 2.4, 2.4, { act: "quillDesk", label: "Talk to Dr. Quill", r: 2, talkTo: "quill" }), P3(K2("rug-rectangle"), 6, 7, { palette: { carpet: "plum", carpetDarker: "red" }, solid: null })],
    doors: [{ x: 2.5, z: 0.25, to: "museum_fish", label: "Aquarium", tx: 6, tz: 8.4, wall: "n" }, { x: 9.5, z: 0.25, to: "museum_bug", label: "Insectarium", tx: 6, tz: 8.4, wall: "n" }, { x: 0.25, z: 3, to: "museum_fossil", label: "Fossil Hall", tx: 6, tz: 8.4, wall: "w" }, { x: 0.25, z: 7, to: "museum_art", label: "Gallery", tx: 6, tz: 8.4, wall: "w" }]
  },
  museum_fish: { name: "Aquarium", w: 12, d: 10, wall: "wall-sea", floor: "floor-night", music: "museum", dim: true, exit: { x: 6, z: 9.5, to: "museum", tx: 2.5, tz: 1.2, facing: Math.PI }, wing: "fish", props: [] },
  museum_bug: { name: "Insectarium", w: 12, d: 10, wall: "wall-spores", floor: "floor-moss", music: "museum", exit: { x: 6, z: 9.5, to: "museum", tx: 9.5, tz: 1.2, facing: Math.PI }, wing: "bug", props: [] },
  museum_fossil: { name: "Fossil Hall", w: 12, d: 10, wall: "wall-stone", floor: "floor-sandy", music: "museum", exit: { x: 6, z: 9.5, to: "museum", tx: 1.2, tz: 3, facing: 1.57 }, wing: "fossil", props: [] },
  museum_art: { name: "The Gallery", w: 12, d: 10, wall: "wall-regal", floor: "floor-oak", music: "museum", exit: { x: 6, z: 9.5, to: "museum", tx: 1.2, tz: 7, facing: 1.57 }, wing: "art", props: [] },
  mothwick: {
    name: "Mothwick's",
    w: 10,
    d: 8,
    wall: "wall-plum",
    floor: "floor-carpet-red",
    music: "mothwick",
    exit: { x: 5, z: 7.5, to: "town", tx: 55.5, tz: 48.4, facing: 0 },
    host: { id: "mothwick", x: 7.5, z: 1.8, face: -0.3 },
    props: [counter(7.6, 2.6, 2.6, { act: "mothwickCounter", label: "Talk to Madame Mothwick", r: 1.7, talkTo: "mothwick" }), P3("kenney-furniture/coat-rack-standing", 1.2, 1, { palette: WOOD, solid: [1, 1] }), P3(K2("lamp-square-floor"), 9.4, 0.6, { palette: WOOD, solid: [1, 1], light: true }), P3(K2("desk"), 2.5, 6.4, { palette: DARK, solid: [2, 1], act: "patternStudio", label: "Pattern studio", r: 1.6 }), P3(K2("chair-desk"), 2.6, 5.5, { palette: DARK, solid: [1, 1] }), P3(K2("rug-doormat"), 5, 7.4, { palette: WOOD, solid: null }), P3("shelf", 3.5, 0.6, { params: { w: 3 }, solid: [3, 1] })],
    stockSlots: [[1.2, 3], [2.2, 3], [3.2, 3], [4.2, 3], [2.8, 0.6], [3.5, 0.6], [4.2, 0.6]]
  },
  // ---- Neighbours' houses ----------------------------------------------------------------------
  house_dorrit: { name: "Dorrit's", w: 6, d: 6, wall: "wall-cream", floor: "floor-kitchen", exit: { x: 3, z: 5.5, to: "town", tx: 17.5, tz: 25.4, facing: 0 }, owner: "dorrit", ownerSpot: [3.2, 2.6], props: [P3(K2("kitchen-stove"), 1.2, 0.6, { palette: WOOD, solid: [1, 1] }), P3(K2("kitchen-cabinet"), 2.2, 0.6, { palette: WOOD, solid: [1, 1] }), P3(K2("kitchen-sink"), 3.2, 0.6, { palette: WOOD, solid: [1, 1] }), P3(K2("kitchen-fridge"), 4.4, 0.5, { palette: WOOD, solid: [1, 1] }), pot(1.2, 0.6, 0.92), pot(2.2, 0.6, 0.92), pot(0.6, 2), pot(0.6, 3.1), pot(5.4, 2.2), pot(5.4, 3.4), pot(1.1, 4.7), P3(K2("table-round"), 3.2, 3.4, { palette: WOOD, scale: 0.8, solid: [2, 1] }), pot(3.2, 3.4, 0.6)] },
  house_tavi: { name: "Tavi's", w: 6, d: 6, wall: "wall-cheese", floor: "floor-sandy", exit: { x: 3, z: 5.5, to: "town", tx: 20.5, tz: 32.4, facing: 0 }, owner: "tavi", ownerSpot: [3, 3], props: [P3(K2("bed-single"), 0.8, 1.2, { palette: YELLOW, solid: [1, 2] }), P3(K2("lounge-sofa"), 3.4, 0.7, { palette: YELLOW, solid: [2, 1] }), P3(K2("lamp-round-floor"), 5.3, 0.7, { palette: YELLOW, solid: [1, 1], light: true }), P3(K2("rug-round"), 3, 3.4, { palette: YELLOW, solid: null }), P3(K2("bear"), 5.1, 3.2, { palette: YELLOW, solid: [1, 1] }), P3(K2("potted-plant"), 0.6, 5.2, { palette: YELLOW, solid: [1, 1] }), P3(K2("table-coffee-square"), 3.3, 3.4, { palette: YELLOW, solid: [1, 1], scale: 0.8 })] },
  house_bartleby: { name: "Bartleby's", w: 6, d: 6, wall: "wall-stone", floor: "floor-ash", exit: { x: 3, z: 5.5, to: "town", tx: 51.5, tz: 24.4, facing: 0 }, owner: "bartleby", ownerSpot: [2.2, 2.6], props: [P3(K2("lounge-chair"), 3, 1.1, { palette: { wood: "plum", carpet: "red", carpetDarker: "plum" }, solid: [1, 1], scale: 1.1, seat: true, name: "The Good Chair", label: "Don't sit in the Good Chair", act: "goodChair", r: 1.3 })] },
  house_ottoline: { name: "Lady Ottoline's", w: 6, d: 6, wall: "wall-regal", floor: "floor-carpet-red", exit: { x: 3, z: 5.5, to: "town", tx: 61.5, tz: 28.4, facing: 0 }, owner: "ottoline", ownerSpot: [3.6, 2.4], props: [P3(K2("rug-round"), 2.6, 2.8, { palette: { carpet: "plum", carpetDarker: "night" }, solid: null, name: "The Duke" }), P3(K2("lounge-chair-relax"), 1, 1.1, { palette: { wood: "sand", carpet: "plum", carpetDarker: "red", metal: "sand" }, solid: [1, 2] }), P3(K2("bookcase-closed-doors"), 4.5, 0.5, { palette: DARK, solid: [1, 1] }), P3(K2("lamp-round-floor"), 5.4, 0.6, { palette: { metal: "sand", lamp: "sand" }, solid: [1, 1], light: true }), P3(K2("side-table"), 5.2, 3.4, { rot: 90, palette: DARK, solid: [1, 1] }), P3("tree-pine", 0.6, 5.3, { scale: 0.26, solid: [1, 1], palette: { leaf: "plum", leaf2: "red" } })] },
  house_rocco: { name: "Rocco's", w: 6, d: 6, wall: "wall-brick", floor: "floor-gym", exit: { x: 3, z: 5.5, to: "town", tx: 71.5, tz: 27.4, facing: 0 }, owner: "rocco", ownerSpot: [3, 3], gym: true, props: [P3("tank", 1.1, 0.7, { params: { w: 0.8 }, palette: { water: "sand", frame: "orange", sand: "orange", top: "orange" }, solid: [1, 1] }), P3("tank", 2.2, 0.7, { params: { w: 0.8 }, palette: { water: "sand", frame: "orange", sand: "orange", top: "orange" }, solid: [1, 1] }), P3("tank", 3.3, 0.7, { params: { w: 0.8 }, palette: { water: "red", frame: "orange", sand: "sand", top: "orange" }, solid: [1, 1] }), P3(K2("bench-cushion-low"), 4.6, 2.6, { palette: { wood: "night", carpet: "red", metalLight: "mist" }, scale: 1.6, solid: [1, 1] }), P3(K2("speaker"), 0.6, 4.6, { palette: DARK, solid: [1, 1] }), P3(K2("rug-square"), 3, 3.6, { palette: { carpet: "night", carpetDarker: "ink" }, solid: null })] },
  house_nib: { name: "Nib's", w: 6, d: 6, wall: "wall-night", floor: "floor-ash", exit: { x: 3, z: 5.5, to: "town", tx: 31.5, tz: 26.4, facing: 0 }, owner: "nib", ownerSpot: [2.6, 3], props: [bookcase(0.8, 0.5, DARK), bookcase(1.8, 0.5, DARK), bookcase(2.8, 0.5, DARK), P3("telescope", 4.8, 1, { solid: [1, 1], scale: 1.2, act: "nibScope", label: "Look through the telescope", r: 1.2 }), P3(K2("bed-single"), 5.2, 3.6, { palette: DARK, solid: [1, 2] }), P3(K2("books"), 3.2, 4.2, { palette: { metalLight: "white", metal: "mist", carpetDarker: "navy", plant: "teal" }, solid: null, scale: 1.8 }), P3(K2("books"), 1.2, 3.2, { palette: { metalLight: "white", metal: "mist", carpetDarker: "plum", plant: "navy" }, solid: null, scale: 1.8 })] },
  house_ozzie: { name: "Ozzie's", w: 6, d: 6, wall: "wall-mud", floor: "floor-oak", exit: { x: 3, z: 5.5, to: "town", tx: 65.5, tz: 47.4, facing: 0 }, owner: "ozzie", ownerSpot: [3.4, 2.6], corkboard: true, props: [P3(K2("cardboard-box-closed"), 0.7, 3, { palette: WOOD, solid: [1, 1], scale: 1.5 }), P3(K2("cardboard-box-closed"), 0.7, 4.1, { palette: WOOD, solid: [1, 1], scale: 1.5 }), P3(K2("cardboard-box-open"), 5.3, 3.8, { palette: WOOD, solid: [1, 1], scale: 1.5 }), P3(K2("desk"), 4.4, 0.9, { palette: DARK, solid: [2, 1] }), P3(K2("lamp-square-table"), 4.8, 0.9, { y: 0.76, palette: DARK, solid: null, light: true })] },
  house_yolanda: { name: "Yolanda's", w: 6, d: 6, wall: "wall-knit", floor: "floor-carpet-red", exit: { x: 3, z: 5.5, to: "town", tx: 74.5, tz: 47.4, facing: 0 }, owner: "yolanda", ownerSpot: [2.8, 2.8], props: [P3(K2("television-vintage"), 1, 0.8, { palette: { wood: "orange", metal: "sand", metalDark: "orange" }, solid: [1, 1], scale: 1.1 }), P3(K2("lounge-sofa"), 3.8, 0.7, { palette: { wood: "orange", carpet: "sand", carpetDarker: "orange" }, solid: [2, 1] }), P3(K2("rug-round"), 3, 3.4, { palette: { carpet: "orange", carpetDarker: "red" }, solid: null }), P3(K2("bed-single"), 5.3, 4, { palette: { wood: "orange", carpet: "red", metalLight: "sand", metal: "sand" }, solid: [1, 2] }), P3(K2("lamp-round-table"), 0.8, 2.6, { palette: { metal: "orange", lamp: "sand" }, solid: [1, 1], light: true })] },
  // ---- The City ---------------------------------------------------------------------------------
  salon: {
    name: "Snip & Gossip",
    w: 8,
    d: 7,
    wall: "wall-mint",
    floor: "floor-chess",
    music: "salon",
    exit: { x: 4, z: 6.5, to: "city", door: "salon" },
    host: { id: "fleece", x: 2.8, z: 2.6, face: 0.4 },
    venue: true,
    props: [P3(K2("chair-desk"), 4, 2.6, { palette: { carpet: "red", metalDark: "night" }, solid: [1, 1], act: "salonChair", label: "Sit for a cut", r: 1.4 }), P3(K2("bathroom-mirror"), 4, 0.5, { palette: WOOD, solid: [1, 1], scale: 1.5 }), P3(K2("bathroom-sink"), 6.2, 0.6, { palette: PALE, solid: [1, 1] }), P3(K2("potted-plant"), 7.4, 3, { palette: WOOD, solid: [1, 1] }), P3(K2("bench-cushion"), 7, 5.5, { palette: PALE, solid: [1, 1], rot: -90 }), P3(K2("rug-doormat"), 4, 6.4, { palette: WOOD, solid: null })]
  },
  couture: {
    name: "Maison Plume",
    w: 9,
    d: 7,
    wall: "wall-rose",
    floor: "floor-marble",
    music: "couture",
    exit: { x: 4.5, z: 6.5, to: "city", door: "couture" },
    host: { id: "flavia", x: 4.5, z: 2.2, face: 0 },
    venue: true,
    props: [P3("ribbon-posts", 4.5, 3.2, { rot: 90, scale: 1.6, solid: null }), P3(K2("rug-rectangle"), 4.5, 1.6, { palette: { carpet: "red", carpetDarker: "plum" }, solid: null }), P3("plinth", 1.5, 1.2, { solid: [1, 1], act: "coutureRail", label: "The couture rail", r: 1.6 }), P3("plinth", 7.5, 1.2, { solid: [1, 1], act: "coutureRail", label: "The couture rail", r: 1.6 }), P3(K2("lamp-square-floor"), 0.6, 6, { palette: DARK, solid: [1, 1], light: true })]
  },
  magda: {
    name: "Magda's Genuine Articles",
    w: 8,
    d: 6,
    wall: "wall-night",
    floor: "floor-night",
    music: "magda",
    dim: true,
    exit: { x: 4, z: 5.5, to: "city", door: "magda" },
    host: { id: "magda", x: 6.2, z: 1.6, face: -0.4 },
    venue: true,
    props: [counter(6.2, 2.3, 2.4, { act: "magdaCounter", label: "Talk to Magda", r: 1.7, talkTo: "magda" }), P3(K2("lamp-round-table"), 7.3, 2.3, { y: 0.98, palette: DARK, solid: null, light: true }), P3(K2("cardboard-box-closed"), 0.8, 5, { palette: DARK, solid: [1, 1], scale: 1.4 }), P3(K2("cardboard-box-closed"), 7.2, 5, { palette: DARK, solid: [1, 1], scale: 1.4 }), P3(K2("bookcase-closed"), 4.2, 0.5, { palette: DARK, solid: [1, 1], act: "catalogueCompare", label: "Compare with your catalogue prints", r: 1.3 })],
    easels: [[1.2, 1.2], [2.6, 0.8], [3, 3]]
  },
  theatre: {
    name: "The Palace Theatre",
    w: 10,
    d: 8,
    wall: "wall-plum",
    floor: "floor-carpet-red",
    music: "theatre",
    dim: true,
    exit: { x: 5, z: 7.5, to: "city", door: "theatre" },
    host: { id: "bellows", x: 5, z: 1.6, face: 0 },
    venue: true,
    props: [P3("stage-floor", 5, 1.5, { solid: [10, 3] }), ...[3, 4.2, 5.8, 7].flatMap((x) => [P3(K2("chair-rounded"), x, 5.2, { palette: { wood: "red" }, rot: 180, solid: [1, 1], act: "theatreSeat", label: "Take a seat", r: 1 })]), P3(K2("lamp-square-floor"), 0.6, 3.6, { palette: DARK, solid: [1, 1], light: true }), P3(K2("lamp-square-floor"), 9.4, 3.6, { palette: DARK, solid: [1, 1], light: true })]
  },
  auction: {
    name: "Pemberton's Auction Rooms",
    w: 10,
    d: 8,
    wall: "wall-teal",
    floor: "floor-oak",
    music: "auction",
    exit: { x: 5, z: 7.5, to: "city", door: "auction" },
    host: { id: "pemberton", x: 5, z: 1.4, face: 0 },
    venue: true,
    props: [P3("plinth", 5, 2.6, { solid: [1, 1], act: "auctionStart", label: "Bid on the lot", r: 2.6 }), P3(K2("desk"), 5, 0.8, { palette: DARK, scale: 0.8, solid: [2, 1] }), P3(K2("cardboard-box-open"), 8.8, 1.4, { palette: WOOD, scale: 1.3, solid: [1, 1], act: "consign", label: "Consign an item", r: 1.4 }), ...[2.4, 3.6, 6.4, 7.6].map((x) => P3(K2("chair-rounded"), x, 5.4, { palette: WOOD, rot: 180, solid: [1, 1] }))]
  },
  bureau: {
    name: "Better Burrows Bureau",
    w: 8,
    d: 7,
    wall: "wall-bureau",
    floor: "floor-ash",
    music: "bureau",
    exit: { x: 4, z: 6.5, to: "city", door: "bureau" },
    host: { id: "brisket", x: 4, z: 1.2, face: 0 },
    venue: true,
    props: [P3(K2("desk"), 4, 2.2, { palette: DARK, solid: [2, 1], act: "brisketDesk", label: "Talk to Agent Brisket", r: 1.8, talkTo: "brisket" }), P3(K2("bookcase-closed-doors"), 1, 0.5, { palette: DARK, solid: [1, 1] }), P3(K2("bookcase-closed-doors"), 7, 0.5, { palette: DARK, solid: [1, 1] }), P3(K2("computer-screen"), 3.6, 2.2, { y: 0.77, palette: DARK, solid: null }), P3(K2("chair-desk"), 4, 3.3, { palette: DARK, solid: [1, 1], rot: 180 })]
  },
  cafe: {
    name: "The Daily Grind",
    w: 8,
    d: 7,
    wall: "wall-brick",
    floor: "floor-ash",
    music: "cafe",
    dim: true,
    exit: { x: 4, z: 6.5, to: "city", door: "cafe" },
    host: { id: "lou", x: 5.4, z: 1.2, face: -0.3 },
    venue: true,
    props: [counter(5.4, 2, 3.6, { act: "louCounter", label: "Order from Lou", r: 1.7, talkTo: "lou" }), P3(K2("kitchen-coffee-machine"), 4.4, 2, { y: 0.98, palette: DARK, solid: null }), P3(K2("stool-bar"), 3.6, 3, { palette: DARK, solid: [1, 1] }), P3(K2("stool-bar"), 5, 3, { palette: DARK, solid: [1, 1] }), P3(K2("stool-bar"), 6.4, 3, { palette: DARK, solid: [1, 1] }), P3(K2("table-coffee-square"), 1.6, 3, { palette: DARK, solid: [1, 1] }), P3(K2("chair-rounded"), 1.6, 4.1, { palette: DARK, rot: 180, solid: [1, 1], seat: true }), P3(K2("lamp-round-table"), 1.6, 3, { y: 0.46, palette: DARK, solid: null, light: true })]
  },
  tent: {
    name: "Madame Nibbles' Tent",
    w: 5,
    d: 5,
    wall: "wall-plum",
    floor: "floor-carpet-red",
    music: "magda",
    dim: true,
    exit: { x: 2.5, z: 4.5, to: "city", door: "tent" },
    host: { id: "nibbles", x: 2.5, z: 1.2, face: 0 },
    venue: true,
    props: [P3(K2("table-cloth"), 2.5, 2.2, { palette: { wood: "night", carpet: "plum", carpetDarker: "red" }, scale: 0.7, solid: [2, 1], act: "fortuneTable", label: "Have your fortune told", r: 1.7, talkTo: "nibbles" }), P3(K2("lamp-round-table"), 3.3, 2.2, { y: 0.46, palette: DARK, solid: null, light: true }), P3(K2("pillow"), 2.5, 3.3, { palette: { carpet: "plum" }, solid: null, scale: 1.6 })]
  }
};

// src/world/rooms.js
init_items();
init_critter();
init_rig();
init_neighbours();

// src/systems/shop.js
init_rng();
init_items();
init_furniture();
init_clothes();
init_textures();
var forSale = (l) => l.filter((x) => !x.notForSale && !x.couture && !x.rare);
function dailyStock(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:stock:${w.clock.day}`);
  const fur = s.shuffle(forSale(FURNITURE));
  const clo = s.shuffle(forSale(CLOTHES));
  const list = [];
  const push = (id, kind = "buy") => {
    if (!w.flags[`bought:${w.clock.day}:${id}`]) list.push({ id, kind });
  };
  push(fur[0].id);
  push(fur[1].id);
  push(clo[0].id);
  push(clo[1].id);
  push(s.pick(WALLS).id);
  push(s.pick(FLOORS).id);
  if (w.clock.day >= 2 || w.flags.toolsAll) {
    push("axe");
    push("slingshot");
  }
  for (const t of ["net", "rod", "shovel", "can"]) if (w.player.tools.includes(t) || w.flags.toolsAll) push(t);
  push(`seed${s.pick(["Tulip", "Daisy", "Rose", "Bellflower"])}`);
  push("stationery");
  push("medicine");
  if (w.clock.day % 2 === 0) push("sapling");
  return list.slice(0, 14);
}
function mothwickStock(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:mothwick:${w.clock.day}`);
  const list = [];
  const push = (id) => {
    if (!w.flags[`bought:${w.clock.day}:${id}`]) list.push({ id, kind: "buy" });
  };
  for (const c2 of s.shuffle(forSale(CLOTHES)).slice(0, 4)) push(c2.id);
  for (const h of s.shuffle(forSale(HAT_ITEMS)).slice(0, 1)) push(h.id);
  for (const h of s.shuffle(forSale(GLASSES_ITEMS)).slice(0, 1)) push(h.id);
  for (const u of s.shuffle(forSale(UMBRELLAS)).slice(0, 1)) push(u.id);
  return list;
}

// src/world/rooms.js
init_fish();
init_fish();
init_bugs();
init_fossils();
init_art();
var { BoxGeometry: BoxGeometry8, Group: Group12, Mesh: Mesh10, PlaneGeometry: PlaneGeometry3, Vector3: Vector35 } = engine_exports.THREE;
var ROOM_OX = 1e3;
var WALL_H = 3;
function surfaceMesh(w, d, texId) {
  const g = new PlaneGeometry3(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) {
    uv[i] *= w / 2;
    uv[i + 1] *= d / 2;
  }
  const m = new Mesh10(g, (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: (0, engine_exports.textureMap)(texId) }));
  m.receiveShadow = true;
  return m;
}
function wallMesh(len, texId, axis) {
  const g = new PlaneGeometry3(len, WALL_H);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) {
    uv[i] *= len / 4;
    uv[i + 1] *= WALL_H / 4;
  }
  const m = new Mesh10(g, (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white, { map: (0, engine_exports.textureMap)(texId) }));
  m.receiveShadow = true;
  if (axis === "w") m.rotation.y = Math.PI / 2;
  return m;
}
var build2 = (id, o = {}) => {
  const obj = buildAny(id, o).object;
  obj.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return obj;
};
var box4 = (w, h, d, c2) => {
  const m = new Mesh10(new BoxGeometry8(w, h, d), (0, engine_exports.toonMaterial)(typeof c2 === "string" ? engine_exports.PALETTE[c2] : c2));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
var RoomPlace = class extends Place {
  constructor(g, id, def) {
    super(id, "room", { ox: ROOM_OX, oz: 0, name: def.name });
    this.g = g;
    this.def = def;
    this.w = def.w;
    this.d = def.d;
    this.camZoom = def.w > 10 ? 1.55 : def.w > 7 ? 1.75 : 2;
    this.music = def.music ?? null;
    this.owner = def.owner ?? null;
    this.ownerSpot = def.ownerSpot ?? null;
    this.lightsReq = [];
    this.dyn = new Group12();
    this.group.add(this.dyn);
    this.items = [];
    this.movers = [];
    this.actors = /* @__PURE__ */ new Map();
    this.built = false;
    this.group.visible = false;
  }
  keepVisible() {
    return false;
  }
  surfaceAt() {
    const f = this.def.floor ?? "";
    return f.includes("carpet") || f.includes("moss") || f.includes("shag") ? "stepGrass" : f.includes("marble") || f.includes("chess") || f.includes("kitchen") ? "stepStone" : "stepWood";
  }
  height() {
    return 0;
  }
  ensureSolid() {
    this.solid = new Uint8Array(this.w * this.d);
  }
  markSolid(x, z, sw, sd) {
    const x0 = Math.max(0, Math.floor(x - sw / 2 + 0.01)), z0 = Math.max(0, Math.floor(z - sd / 2 + 0.01));
    for (let j = z0; j < Math.min(this.d, z0 + sd); j++) for (let i = x0; i < Math.min(this.w, x0 + sw); i++) this.solid[j * this.w + i] = 1;
  }
  blocked(x, z) {
    if (this.g.noclip) return x < 0.1 || z < 0.1 || x > this.w - 0.1 || z > this.d;
    if (x < 0.25 || z < 0.25 || x > this.w - 0.25) return true;
    const e = this.def.exit;
    if (z > this.d - 0.25) {
      if (!e || Math.abs(x - e.x) > 1) return true;
      return z > this.d + 0.2;
    }
    return this.solid[Math.floor(z) * this.w + Math.floor(x)] === 1;
  }
  // ---- building ------------------------------------------------------------------------------------
  buildShell(wallTex, floorTex) {
    if (this.shell) this.shell.removeFromParent();
    const s = new Group12();
    const f = surfaceMesh(this.w, this.d, floorTex);
    f.position.set(this.w / 2, 0, this.d / 2);
    s.add(f);
    const under = box4(this.w + 0.4, 0.3, this.d + 0.4, "ink");
    under.position.set(this.w / 2, -0.17, this.d / 2);
    s.add(under);
    const n = wallMesh(this.w, wallTex, "n");
    n.position.set(this.w / 2, WALL_H / 2, 0.01);
    s.add(n);
    const wWall = wallMesh(this.d, wallTex, "w");
    wWall.position.set(0.01, WALL_H / 2, this.d / 2);
    s.add(wWall);
    const skirting = (len, axis) => {
      const m = box4(axis === "n" ? len : 0.1, 0.22, axis === "n" ? 0.1 : len, "plum");
      m.position.set(axis === "n" ? len / 2 : 0.05, 0.11, axis === "n" ? 0.05 : len / 2);
      return m;
    };
    s.add(skirting(this.w, "n"), skirting(this.d, "w"));
    const top = (len, axis) => {
      const m = box4(axis === "n" ? len : 0.3, 0.1, axis === "n" ? 0.3 : len, "night");
      m.position.set(axis === "n" ? len / 2 : -0.15, WALL_H + 0.05, axis === "n" ? -0.15 : len / 2);
      return m;
    };
    s.add(top(this.w + 0.3, "n"), top(this.d + 0.3, "w"));
    const bn = box4(this.w + 0.3, WALL_H, 0.3, "night");
    bn.position.set(this.w / 2, WALL_H / 2, -0.15);
    s.add(bn);
    const bw = box4(0.3, WALL_H, this.d + 0.3, "night");
    bw.position.set(-0.15, WALL_H / 2, this.d / 2);
    s.add(bw);
    const e = this.def.exit;
    if (e) {
      const mat = box4(1.6, 0.03, 0.6, "orange");
      mat.position.set(e.x, 0.02, this.d - 0.3);
      s.add(mat);
    }
    for (const door of this.def.doors ?? []) {
      const frame = box4(door.wall === "n" ? 1.3 : 0.06, 2.2, door.wall === "n" ? 0.06 : 1.3, "plum");
      frame.position.set(door.wall === "n" ? door.x : 0.04, 1.1, door.wall === "n" ? 0.04 : door.z);
      const leaf = box4(door.wall === "n" ? 1.05 : 0.08, 2, door.wall === "n" ? 0.08 : 1.05, "ink");
      leaf.position.set(door.wall === "n" ? door.x : 0.05, 1, door.wall === "n" ? 0.05 : door.z);
      s.add(frame, leaf);
    }
    this.shell = s;
    this.group.add(s);
  }
  placeProp(p, parent = this.group) {
    const o = build2(p.m, { params: p.params, palette: p.palette, seed: p.seed });
    o.position.set(p.x, p.y ?? 0, p.z);
    o.rotation.y = (p.rot ?? 0) * Math.PI / 180;
    if (p.scale) o.scale.setScalar(p.scale);
    parent.add(o);
    return o;
  }
  buildProps() {
    this.ensureSolid();
    if (this.propsGroup) this.propsGroup.removeFromParent();
    this.propsGroup = new Group12();
    this.group.add(this.propsGroup);
    this.interactList = [];
    this.lamps = [];
    for (const p of this.def.props ?? []) {
      this.placeProp(p, this.propsGroup);
      if (p.solid) this.markSolid(p.x, p.z, p.solid[0], p.solid[1]);
      if (p.act) this.interactList.push({ id: `${p.act}:${p.x},${p.z}`, x: p.x, z: p.z, r: p.r ?? 1.3, label: p.label ?? "Look", act: p.act, prop: p, talkTo: p.talkTo });
      if (p.light) this.lamps.push({ x: p.x, z: p.z, y: (p.y ?? 0) + 1.7 });
    }
    if (this.def.corkboard) {
      const cb = box4(2.4, 1.4, 0.05, "orange");
      cb.position.set(2.4, 1.7, 0.05);
      this.propsGroup.add(cb);
      for (const [x, y, c2] of [[1.6, 2.1, "white"], [2.2, 1.5, "sand"], [2.9, 2, "white"], [3.2, 1.4, "mist"], [1.9, 1.3, "sand"]]) {
        const n = box4(0.34, 0.26, 0.04, c2);
        n.position.set(x, y, 0.09);
        this.propsGroup.add(n);
      }
      const string = (x0, y0, x1, y1) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        const m = box4(len, 0.03, 0.03, "red");
        m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.12);
        m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
        this.propsGroup.add(m);
      };
      string(1.6, 2.1, 2.2, 1.5);
      string(2.2, 1.5, 2.9, 2);
      string(2.9, 2, 3.2, 1.4);
      string(1.9, 1.3, 3.2, 1.4);
      string(1.6, 2.1, 2.9, 2);
    }
    if (this.def.host) this.buildHost();
    this.built = true;
  }
  buildHost() {
    const h = this.def.host;
    if (this.host) return;
    const a = new Actor(CRITTER_DEFS[h.id], { name: h.id, seed: h.id.length });
    a.x = h.x;
    a.z = h.z;
    a.facing = h.face ?? 0;
    a.addTo(this.group);
    this.host = a;
    this.hostId = h.id;
    this.actors.set(h.id, a);
    if (!(this.def.props ?? []).some((p) => p.talkTo === h.id)) this.interactList.push({ id: `host:${h.id}`, x: h.x, z: h.z, r: 1.5, label: `Talk to ${hostName(h.id)}`, act: "hostTalk", talkTo: h.id });
  }
  hostActor(id) {
    return this.actors.get(id) ?? null;
  }
  enter(g) {
    if (!this.built) {
      this.buildShell(this.def.wall, this.def.floor);
      this.buildProps();
    }
    this.refreshDynamic();
    this.lightsReq = (this.lamps ?? []).map((l) => g.ctx.lights.request({ position: [l.x + ROOM_OX, l.y, l.z], color: 16767392, intensity: 7, radius: 7 }));
  }
  leave() {
    for (const l of this.lightsReq) l.release();
    this.lightsReq = [];
  }
  /** Mouse players and tests walk rooms by pathfinding, like the village. */
  syncNav() {
    this.nav = new engine_exports.NavGrid(this.w, this.d, { cell: 1, origin: [0, 0, 0] });
    for (let z = 0; z < this.d; z++) for (let x = 0; x < this.w; x++) this.nav.setOpen(x, z, !this.solid[z * this.w + x]);
  }
  refreshDynamic() {
    const g = this.g;
    this.dyn.clear();
    this.dynInteract = [];
    this.movers.length = 0;
    this.ownerNow = null;
    const def = this.def;
    if (this.id === "store") this.buildStock(dailyStock(g), def.stockSlots);
    if (this.id === "mothwick") this.buildStock(mothwickStock(g), def.stockSlots);
    if (def.wing) this.buildWing(def.wing);
    if (this.id === "house_rocco") this.applyRoccoHouse();
    if (def.easels) this.buildEasels();
    if (this.id === "auction") this.buildLot();
    this.syncNav();
  }
  applyRoccoHouse() {
    const g = this.g;
    const gone = g.world.npcs.rocco.moved !== "here";
    this.owner = gone ? "fitch" : "rocco";
    const leaving = g.world.npcs.rocco.moved === "here" && g.world.flags.roccoBoxes;
    if (gone || leaving) {
      const spots = [[1, 3], [2.2, 4.4], [5, 1.2], [4.6, 4.6], [1.1, 1.6], [3.4, 4.8]];
      for (const [x, z] of spots) {
        const b = build2("kenney-furniture/cardboard-box-closed", { palette: { wood: "sand", woodDark: "orange" } });
        b.position.set(x, 0, z);
        b.scale.setScalar(1.5);
        b.rotation.y = x;
        this.dyn.add(b);
      }
    }
  }
  buildStock(stock, slots) {
    const g = this.g;
    stock.forEach((s, i) => {
      if (i >= slots.length) return;
      const [x, z] = slots[i];
      const onShelf = this.nearShelf(x, z);
      const it = ITEMS[s.id];
      const prop = stockProp(s.id);
      prop.position.set(x, onShelf ? 1.15 : 0, z);
      this.dyn.add(prop);
      if (!onShelf) this.markSolid(x, z, 1, 1);
      this.dynInteract.push({ id: `stock:${i}`, x, z, r: 1.35, label: `Look at ${it.name}`, act: "stockLook", stock: s, index: i, mesh: prop });
    });
  }
  nearShelf(x, z) {
    return (this.def.props ?? []).some((p) => p.m === "shelf" && Math.abs(p.z - z) < 1 && Math.abs(p.x - x) < 2.2 && (p.rot ? Math.abs(p.x - x) < 0.5 : Math.abs(p.z - z) < 0.5));
  }
  buildEasels() {
    const g = this.g;
    const stock = g.life.magdaStock();
    this.def.easels.forEach(([x, z], i) => {
      const s = stock[i];
      if (!s) return;
      this.markSolid(x, z, 1, 1);
      const easel = new Group12();
      easel.position.set(x, 0, z);
      const legs = box4(0.08, 1.4, 0.08, "plum");
      legs.position.set(0, 0.7, 0);
      easel.add(legs);
      const canvas2 = new Mesh10(new BoxGeometry8(1.12, 0.86, 0.05), paintingMaterial(s.id));
      canvas2.position.set(0, 1.4, 0.05);
      easel.add(canvas2);
      const frame = box4(1.24, 0.98, 0.04, "sand");
      frame.position.set(0, 1.4, 0.02);
      easel.add(frame);
      easel.rotation.y = 0.5;
      this.dyn.add(easel);
      this.dynInteract.push({ id: `easel:${i}`, x, z, r: 1.5, label: `Look at ${ITEMS[s.id].name}`, act: "magdaLook", stock: s });
    });
  }
  buildLot() {
    const lot = this.g.life.auctionLot?.();
    if (!lot) return;
    const it = ITEMS[lot.id];
    const p = stockProp(lot.id);
    p.position.set(5, 0.6, 2.6);
    this.dyn.add(p);
  }
  // ---- Museum wings: every donation appears in place --------------------------------------------------
  buildWing(wing) {
    const g = this.g;
    const m = g.world.museum[wing];
    const addLook = (x, z, id, name, line2) => this.dynInteract.push({ id: `wing:${id}`, x, z, r: 1.3, label: `Look at ${name}`, act: "museumLook", lookName: name, line: line2 });
    if (wing === "fish") {
      const slots = wingSlots(FISH.length, this.w, this.d);
      FISH.forEach((f, i) => {
        const [x, z] = slots[i];
        const t = build2("tank", { params: { w: 1.2 } });
        t.position.set(x, 0, z);
        this.dyn.add(t);
        this.markSolid(x, z, 1, 1);
        if (m[f.id]) {
          const fm = build2("fish", { params: { len: Math.max(0.2, FISH_LEN[f.size] * 0.6) }, palette: { body: f.color } });
          fm.position.set(x, 1, z);
          this.dyn.add(fm);
          this.movers.push({ o: fm, kind: "swim", cx: x, cz: z, cy: 0.98, t: i * 1.3, r: 0.32 });
          addLook(x, z, f.id, f.name, f.line);
        } else {
          this.dynInteract.push({ id: `wing:${f.id}`, x, z, r: 1.3, label: "Empty tank", act: "museumLook", lookName: "An empty tank", line: "A little brass plate says this one is expected. Dr. Quill has drawn a very hopeful fish on it." });
        }
      });
    } else if (wing === "bug") {
      const slots = wingSlots(BUGS.length, this.w, this.d);
      BUGS.forEach((b, i) => {
        const [x, z] = slots[i];
        const t = build2("tank", { params: { w: 1 }, palette: { water: "green", frame: "plum", sand: "teal", top: "plum" } });
        t.position.set(x, 0, z);
        this.dyn.add(t);
        this.markSolid(x, z, 1, 1);
        if (m[b.id]) {
          const fm = b.kind === "flier" ? build2("winged", { params: { size: 0.34 }, palette: { wing: b.color === "white" ? "white" : b.color, spot: "ink" } }) : build2("bug", { params: { size: 0.24 }, palette: { body: b.color } });
          fm.position.set(x, 1, z);
          this.dyn.add(fm);
          this.movers.push({ o: fm, kind: b.kind === "flier" ? "flutter" : "crawl", cx: x, cz: z, cy: 0.98, t: i, r: 0.24 });
          addLook(x, z, b.id, b.name, b.line);
        } else this.dynInteract.push({ id: `wing:${b.id}`, x, z, r: 1.3, label: "Empty case", act: "museumLook", lookName: "An empty case", line: "Dr. Quill's note reads: 'something small, I think. Possibly with legs.'" });
      });
    } else if (wing === "fossil") {
      const layout = { moatSkull: [3, 2], moatTorso: [4.8, 2], moatTail: [6.6, 2], regretSkull: [3, 5.4], regretNeck: [4.8, 5.4], regretTorso: [6.6, 5.4], trilobite: [9.8, 1.6], ammonite: [9.8, 3.2], amberFly: [9.8, 4.8], mysteryTooth: [9.8, 6.4] };
      FOSSILS.forEach((f) => {
        const [x, z] = layout[f.id];
        const pl = build2("plinth");
        pl.position.set(x, 0, z);
        pl.scale.set(f.set ? 1.6 : 1, 1, 1.4);
        this.dyn.add(pl);
        this.markSolid(x, z, 2, 1);
        if (m[f.id]) {
          const bone = build2(f.model);
          bone.position.set(x, 0.58, z);
          if (f.set) bone.rotation.y = Math.PI / 2;
          this.dyn.add(bone);
          addLook(x, z, f.id, f.name, f.line);
        } else this.dynInteract.push({ id: `wing:${f.id}`, x, z, r: 1.4, label: "Empty plinth", act: "museumLook", lookName: "An empty plinth", line: 'It says "COMING SOON" in very small, very hopeful letters.' });
      });
    } else if (wing === "art") {
      const spots = [[2, 0.1, "n"], [4.5, 0.1, "n"], [7, 0.1, "n"], [9.5, 0.1, "n"], [0.1, 2, "w"], [0.1, 4.2, "w"], [0.1, 6.4, "w"], [0.1, 8.4, "w"]];
      ART.forEach((a, i) => {
        const [x, z, side] = spots[i];
        const frame = box4(side === "n" ? 1.6 : 0.06, 1.3, side === "n" ? 0.06 : 1.6, "sand");
        frame.position.set(x, 1.8, z);
        this.dyn.add(frame);
        if (m[a.id]) {
          const pic = new Mesh10(new BoxGeometry8(side === "n" ? 1.4 : 0.04, 1.08, side === "n" ? 0.04 : 1.4), paintingMaterial(a.id));
          pic.position.set(side === "n" ? x : x + 0.04, 1.8, side === "n" ? z + 0.04 : z);
          this.dyn.add(pic);
          addLook(side === "n" ? x : 1, side === "n" ? 1 : z, a.id, a.name, a.line);
        } else {
          const pic = box4(side === "n" ? 1.4 : 0.04, 1.08, side === "n" ? 0.04 : 1.4, "night");
          pic.position.set(side === "n" ? x : x + 0.04, 1.8, side === "n" ? z + 0.04 : z);
          this.dyn.add(pic);
        }
      });
    }
    if (g.world.museum.plaques[wing]) {
      const plaque = box4(1.2, 0.5, 0.06, "sand");
      plaque.position.set(this.w - 1.2, 2.3, 0.1);
      this.dyn.add(plaque);
    }
  }
  /** Fish swim, bugs flutter, hosts idle. */
  update(dt, t) {
    for (const m of this.movers) {
      m.t += dt;
      if (m.kind === "swim") {
        m.o.position.x = m.cx + Math.sin(m.t * 0.7) * m.r;
        m.o.position.z = m.cz + Math.sin(m.t * 1.3) * 0.1;
        m.o.position.y = m.cy + Math.sin(m.t * 1.1) * 0.06;
        m.o.rotation.y = Math.cos(m.t * 0.7) > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (m.kind === "flutter") {
        m.o.position.x = m.cx + Math.sin(m.t * 1.3) * m.r;
        m.o.position.z = m.cz + Math.cos(m.t * 1.7) * 0.1;
        m.o.position.y = m.cy + Math.abs(Math.sin(m.t * 2.3)) * 0.22;
        const wl = m.o.getObjectByName("WingL"), wr = m.o.getObjectByName("WingR");
        if (wl) wl.rotation.z = Math.sin(m.t * 22) * 0.8;
        if (wr) wr.rotation.z = -Math.sin(m.t * 22) * 0.8;
      } else if (m.kind === "crawl") {
        m.o.position.x = m.cx + Math.sin(m.t * 0.4) * m.r;
      }
    }
    for (const a of this.actors.values()) {
      if (!a.current || a.finished) a.play("Idle", 0.2);
      a.update(dt);
    }
    this.extraUpdate?.(dt, t);
  }
  interactables() {
    const out = [...this.interactList ?? [], ...this.dynInteract ?? []];
    const e = this.def.exit;
    for (const door of this.def.doors ?? []) out.push({ id: `door:${door.to}`, x: door.wall === "n" ? door.x : 0.8, z: door.wall === "n" ? 0.8 : door.z, r: 1.3, label: `To the ${door.label}`, act: "roomDoor", door });
    return out;
  }
};
var hostName = (id) => ({ gander: "Mrs. Gander", clementine: "Clementine", quill: "Dr. Quill", mothwick: "Madame Mothwick", fleece: "Monsieur Fleece", flavia: "Flavia Rosé", magda: "Magda", bellows: "Sir Reginald", pemberton: "Pemberton", brisket: "Agent Brisket", lou: "Languid Lou", nibbles: "Madame Nibbles" })[id] ?? id;
function wingSlots(n, w, d) {
  const out = [];
  for (let x = 1.5; x < w - 0.5 && out.length < n; x += 1.5) out.push([x, 0.9]);
  for (let z = 2.4; z < d - 1.5 && out.length < n; z += 1.5) out.push([0.9, z]);
  for (let z = 2.4; z < d - 1.5 && out.length < n; z += 1.5) out.push([w - 0.9, z]);
  for (let x = 3.2; x < w - 2 && out.length < n; x += 1.5) out.push([x, 4.2]);
  for (let x = 3.2; x < w - 2 && out.length < n; x += 1.5) out.push([x, 6]);
  return out;
}
function stockProp(id) {
  const it = ITEMS[id];
  const g = new Group12();
  const c2 = it?.iconColors?.o ?? "sand";
  const add2 = (m, y = 0) => {
    m.position.y += y;
    g.add(m);
    return m;
  };
  switch (it?.cat) {
    case "furniture": {
      const o = build2(it.model, { palette: it.palette ?? void 0, params: it.params });
      const f = Math.max(it.w, it.d);
      const s = 0.62 / Math.max(1, f * 0.7);
      o.scale.setScalar(s);
      add2(o);
      break;
    }
    case "clothes": {
      const b = box4(0.5, 0.52, 0.2, it.shirt);
      add2(b, 0.45);
      const t = box4(0.22, 0.08, 0.21, it.trim);
      add2(t, 0.7);
      const stand = box4(0.06, 0.2, 0.06, "plum");
      add2(stand, 0.1);
      const arm = box4(0.72, 0.16, 0.2, it.shirt);
      add2(arm, 0.6);
      break;
    }
    case "hat": {
      const b = box4(0.36, 0.24, 0.36, it.hatColor);
      add2(b, 0.32);
      add2(box4(0.56, 0.05, 0.56, it.hatColor), 0.2);
      add2(box4(0.1, 0.2, 0.1, "plum"), 0.1);
      break;
    }
    case "glasses": {
      add2(box4(0.5, 0.14, 0.04, it.glassesColor === "white" ? "mist" : it.glassesColor), 0.3);
      add2(box4(0.08, 0.2, 0.08, "plum"), 0.1);
      break;
    }
    case "umbrella": {
      add2(box4(0.08, 0.7, 0.08, it.b), 0.35);
      add2(box4(0.5, 0.1, 0.5, it.a), 0.7);
      break;
    }
    case "wall": {
      add2(box4(0.5, 0.26, 0.26, "sand"), 0.13);
      add2(box4(0.52, 0.04, 0.28, "orange"), 0.14);
      break;
    }
    case "floor": {
      add2(box4(0.56, 0.14, 0.44, "orange"), 0.07);
      add2(box4(0.56, 0.02, 0.44, "plum"), 0.15);
      break;
    }
    case "tool": {
      const m = { net: "tool-net", rod: "tool-rod", shovel: "tool-shovel", axe: "tool-axe", can: "tool-can", slingshot: "tool-slingshot" }[id];
      const o = build2(m);
      o.rotation.z = 0.5;
      o.position.y = 0.3;
      g.add(o);
      break;
    }
    case "seed": {
      add2(box4(0.26, 0.34, 0.08, c2), 0.17);
      add2(box4(0.26, 0.08, 0.09, "white"), 0.26);
      break;
    }
    case "cheese": {
      const o = build2("cheese-wheel");
      add2(o);
      break;
    }
    case "plant": {
      const o = build2("sapling", { params: { stage: 0 } });
      o.scale.setScalar(0.7);
      add2(o);
      break;
    }
    default: {
      add2(box4(0.3, 0.3, 0.3, c2), 0.15);
      add2(box4(0.32, 0.08, 0.1, it?.iconColors?.x ?? "orange"), 0.2);
      break;
    }
  }
  return g;
}

// src/world/home.js
init_engine();
init_items();
init_town();
init_fish();
var { Group: Group13, Mesh: Mesh11, BoxGeometry: BoxGeometry9, Vector3: Vector36 } = engine_exports.THREE;
var HOME_DOOR = BUILDINGS.find((b) => b.id === "home").door;
var HOME_SIZES = { 1: { main: [6, 6] }, 2: { main: [8, 8] }, 3: { main: [8, 8], annex: [6, 6] }, 4: { main: [8, 8], annex: [6, 6], upstairs: [8, 8] } };
var roomKey = (id) => id === "home" ? "main" : id.replace("home_", "");
var HomeRoom = class extends RoomPlace {
  constructor(g, id) {
    const key2 = roomKey(id);
    const def = { name: "Your Home", wall: "wall-plaster", floor: "floor-oak", w: 8, d: 8, props: [], home: true };
    super(g, id, def);
    this.key = key2;
    this.music = (gg) => gg.world.home.stereo ? gg.world.home.stereo : gg.world.home.dust?.length ? null : null;
  }
  get roomData() {
    return this.g.world.home.rooms[this.key];
  }
  keepVisible(old) {
    return old === this.g.town && this.hasFunc("tv");
  }
  hasFunc(f) {
    return this.roomData.items.some((i) => ITEMS[i.id]?.func === f);
  }
  rebuild() {
    const g = this.g;
    const tier = g.world.player.homeTier;
    const size = HOME_SIZES[tier][this.key] ?? [6, 6];
    this.w = size[0];
    this.d = size[1];
    this.camZoom = this.w > 6 ? 1.75 : 2;
    const e = this.key === "main" ? { x: this.w / 2, z: this.d - 0.5, to: "town", tx: HOME_DOOR[0], tz: HOME_DOOR[1] + 0.6, facing: 0 } : this.key === "annex" ? { x: this.w / 2, z: this.d - 0.5, to: "home", tx: 1.1, tz: 2, facing: 1.57 } : { x: this.w / 2, z: this.d - 0.5, to: "home", tx: 6.8, tz: 2, facing: 0 };
    this.def.exit = e;
    this.def.w = this.w;
    this.def.d = this.d;
    const rd = this.roomData;
    this.def.wall = rd.wall;
    this.def.floor = rd.floor;
    this.buildShell(rd.wall, rd.floor);
    this.ensureSolid();
    this.interactList = [];
    if (this.key === "main" && tier >= 3) this.interactList.push({ id: "toAnnex", x: 0.8, z: 2, r: 1.2, label: "To the annex", act: "roomDoor", door: { to: "home_annex", tx: 3, tz: 5, label: "annex" } });
    if (this.key === "main" && tier >= 4) this.interactList.push({ id: "toUp", x: 6.8, z: 0.8, r: 1.2, label: "Upstairs", act: "roomDoor", door: { to: "home_upstairs", tx: 4, tz: 7, label: "upstairs" } });
    if (this.key === "main" && tier >= 3) {
      const f = new Mesh11(new BoxGeometry9(0.06, 2.2, 1.3), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.plum));
      f.position.set(0.04, 1.1, 2);
      this.shell.add(f);
    }
    if (this.key === "main" && tier >= 4) {
      const st = buildAny("kenney-furniture/stairs", { palette: { wood: "orange", woodDark: "red" } }).object;
      st.scale.setScalar(0.5);
      st.position.set(6.8, 0, 0.5);
      this.shell.add(st);
      this.markSolid(6.8, 0.5, 2, 1);
    }
    this.placeItems();
    this.built = true;
  }
  placeItems() {
    const g = this.g;
    if (this.itemsGroup) this.itemsGroup.removeFromParent();
    this.itemsGroup = new Group13();
    this.group.add(this.itemsGroup);
    this.lamps = [];
    this.ensureSolid();
    this.stopMirrors();
    this.itemViews = /* @__PURE__ */ new Map();
    this.funcItems = [];
    for (const item of this.roomData.items) this.addItemView(item);
    this.syncNav();
    this.unstickPlayer();
  }
  /** Furniture never traps you: step to the nearest open floor. */
  unstickPlayer() {
    const p = this.g.player;
    if (this.g.place !== this || !this.blocked(p.x, p.z)) return;
    let best = null, bd = 1e9;
    for (let z = 0; z < this.d; z++) for (let x = 0; x < this.w; x++) {
      if (this.solid[z * this.w + x]) continue;
      const d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
      if (d < bd) {
        bd = d;
        best = [x + 0.5, z + 0.5];
      }
    }
    if (best) {
      p.x = best[0];
      p.z = best[1];
    }
  }
  addItemView(item) {
    const it = ITEMS[item.id];
    if (!it) return;
    const o = buildAny(it.model, { palette: it.palette ?? void 0, params: it.params }).object;
    o.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const rotated = item.rot % 2 === 1;
    const w = rotated ? it.d : it.w, d = rotated ? it.w : it.d;
    o.position.set(item.x + w / 2, 0, item.z + d / 2);
    o.rotation.y = item.rot * Math.PI / 2;
    const group = new Group13();
    group.add(o);
    this.itemsGroup.add(group);
    this.itemViews.set(item, group);
    if (!it.flat) {
      for (let z = item.z; z < item.z + d; z++) for (let x = item.x; x < item.x + w; x++) if (x >= 0 && z >= 0 && x < this.w && z < this.d) this.solid[z * this.w + x] = 1;
    }
    if (it.func) {
      this.funcItems.push({ item, it, x: item.x + w / 2, z: item.z + d / 2, w, d, o, group });
      if (it.func === "tank" || it.func === "cage") this.addCreatures(item, group, item.x + w / 2, item.z + d / 2);
      if (it.func === "tv") this.attachTV(item, group, item.x + w / 2, item.z + d / 2);
      if (it.func === "mirror") this.attachMirror(item, group, item.x + w / 2, item.z + d / 2);
    }
  }
  addCreatures(item, group, cx, cz) {
    const list = this.g.world.home[item.id === "fishTank" ? "tankFish" : "cageBugs"];
    let i = 0;
    for (const id of Object.keys(list)) {
      const e = ITEMS[id];
      const m = item.id === "fishTank" ? buildAny("fish", { params: { len: Math.max(0.2, FISH_LEN[e.size ?? "S"] * 0.5) }, palette: { body: e.color } }).object : buildAny("bug", { params: { size: 0.2 }, palette: { body: e.color } }).object;
      m.position.set(cx, 0.9, cz);
      group.add(m);
      this.movers.push({ o: m, kind: item.id === "fishTank" ? "swim" : "crawl", cx, cz, cy: 0.9, t: i++ * 1.7, r: 0.45 });
    }
  }
  attachTV(item, group, cx, cz) {
    const g = this.g;
    if (!this.tvView) {
      this.tvView = new engine_exports.RenderView({ size: [64, 40], fov: 42, every: 3 });
      this.tvView.camera.position.set(24, 7, 52);
      this.tvView.camera.lookAt(24, 0.6, 38);
    }
    const screen = new Mesh11(new BoxGeometry9(0.5, 0.34, 0.02), this.tvView.screenMaterial());
    screen.position.set(cx, 0.36, cz + 0.28);
    engine_exports.RenderView.screen(screen);
    group.add(screen);
    this.tvScreen = screen;
  }
  attachMirror(item, group, cx, cz) {
    const m = new engine_exports.Mirror({ size: [0.8, 1.6], tintAmount: 0.12 });
    m.mesh.position.set(cx, 1, cz + 0.2);
    group.add(m.mesh);
    this.mirrors = this.mirrors ?? [];
    this.mirrors.push(m);
  }
  stopMirrors() {
    for (const s of this.mirrorStops ?? []) s();
    this.mirrorStops = [];
    if (this.tvStop) {
      this.tvStop();
      this.tvStop = null;
    }
    for (const m of this.mirrors ?? []) m.dispose();
    this.mirrors = [];
    this.movers = [];
  }
  attachViews() {
    const g = this.g;
    for (const m of this.mirrors ?? []) this.mirrorStops.push(m.attach(g.engine.renderer, g.ctx.scene));
    if (this.tvView && this.hasFunc("tv")) {
      this.tvStop = this.tvView.attach(g.engine.renderer, g.ctx.scene);
      g.town.group.visible = true;
    }
  }
  enter(g) {
    this.rebuild();
    this.syncLamps();
    this.attachViews();
    this.buildDust();
  }
  leave(g) {
    this.stopMirrors();
    for (const l of this.lightsReq) l.release();
    this.lightsReq = [];
    if (this.key === "main" || this.g.place?.kind !== "room") this.g.town.group.visible = false;
  }
  buildDust() {
    const g = this.g;
    if (this.key !== "main") return;
    if (this.dustGroup) this.dustGroup.removeFromParent();
    this.dustGroup = new Group13();
    this.group.add(this.dustGroup);
    this.dust = [];
    for (const d of g.world.home.dust) {
      const m = new Mesh11(new BoxGeometry9(0.3, 0.2, 0.3), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.mist));
      const eye = new Mesh11(new BoxGeometry9(0.05, 0.05, 0.02), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.ink));
      eye.position.set(0.06, 0.04, 0.16);
      m.add(eye);
      m.position.set(d.x, 0.14, d.z);
      this.dustGroup.add(m);
      this.dust.push({ d, m, t: d.x });
    }
  }
  syncLamps() {
    const g = this.g;
    for (const l of this.lightsReq) l.release();
    this.lightsReq = [];
    for (const f of this.funcItems ?? []) {
      if (f.it.func === "lamp" && f.item.on !== false) {
        const col2 = f.it.palette?.lamp === "cyan" ? 7598071 : f.it.palette?.lamp === "lime" ? 11006064 : 16767392;
        this.lightsReq.push(g.ctx.lights.request({ position: [f.x + 1e3, 1.6, f.z], color: col2, intensity: 8, radius: 7 }));
      }
    }
  }
  /** The room as seen by the interact system. */
  interactables() {
    const out = [...this.interactList];
    const g = this.g;
    for (const f of this.funcItems ?? []) {
      const lab = { lamp: f.item.on === false ? "Turn the lamp on" : "Turn the lamp off", seat: `Sit on ${f.it.name}`, bed: "Go to bed", stereo: "Stereo", tv: "Watch the plaza", mirror: "Mirror", tank: "Fish tank", cage: "Bug cage", clock: "Check the clock", toilet: "Flush", plant: "Water the plant", rug: null }[f.it.func];
      if (lab) out.push({ id: `fn:${f.item.id}:${f.x},${f.z}`, x: f.x, z: f.z, r: 0.9 + Math.max(f.w, f.d) / 2, label: lab, act: "furniture", furn: f });
    }
    if (g.world.player.homeTier >= 1 && this.key === "main") {
      out.push({ id: "placement", x: this.w - 1, z: this.d - 1.6, r: 1.2, label: "Arrange furniture", act: "arrange" });
    }
    return out;
  }
  extraUpdate(dt, t) {
    if (!this.dust) return;
    const p = this.g.player;
    for (const b of this.dust) {
      b.t += dt;
      const dx = b.d.x - p.x, dz = b.d.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.42 && !b.gone) {
        b.gone = true;
        b.m.removeFromParent();
        this.g.world.home.dust.splice(this.g.world.home.dust.indexOf(b.d), 1);
        this.g.sound("bonk");
        this.g.ctx.particles.burst("dust", [b.d.x + 1e3, 0.2, b.d.z], { count: 6 });
        this.g.events.emit("dustStomped", {});
        continue;
      }
      if (b.gone) continue;
      if (dist < 2.2 && dist > 0.01) {
        b.d.x = Math.max(0.5, Math.min(this.w - 0.5, b.d.x + dx / dist * dt * 1.6));
        b.d.z = Math.max(0.5, Math.min(this.d - 0.8, b.d.z + dz / dist * dt * 1.6));
      } else {
        b.d.x = Math.max(0.5, Math.min(this.w - 0.5, b.d.x + Math.sin(b.t * 1.1) * dt * 0.3));
      }
      b.m.position.set(b.d.x, 0.14 + Math.abs(Math.sin(b.t * 7)) * 0.06, b.d.z);
    }
  }
};

// src/world/roomPlaces.js
var RoomPlaces = class {
  constructor(g) {
    this.g = g;
    this.map = /* @__PURE__ */ new Map();
  }
  get(id) {
    let r = this.map.get(id);
    if (!r) {
      const def = ROOMS[id];
      if (!def && id.startsWith("home")) r = new HomeRoom(this.g, id);
      else if (!def) throw new Error(`no room ${id}`);
      else r = new RoomPlace(this.g, id, def);
      this.map.set(id, r);
      this.g.ctx.scene.add(r.group);
    }
    return r;
  }
  /** Forget a built room (dev tools; a new save). */
  reset() {
    for (const r of this.map.values()) {
      r.group.removeFromParent();
    }
    this.map.clear();
  }
};

// src/game.js
init_city();
init_flow();

// src/systems/life.js
init_engine();
init_models();
init_rig();
init_critter();
init_tuning();
init_tiles();
init_rng();
init_bugs();
init_fish();
init_town();
init_time();
init_economy();
init_reveal();
init_items();
init_memory();
init_cheese();
init_lines();
init_say();
init_draw();
init_furniture();
init_art();
var { Group: Group14, Mesh: Mesh12, BoxGeometry: BoxGeometry10, Vector3: Vector37 } = engine_exports.THREE;
var build3 = (id, o = {}) => {
  const obj = (0, engine_exports.buildModel)(id, { catalog: MODELS, ...o }).object;
  (0, engine_exports.setLookLayer)(obj, "actors");
  obj.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return obj;
};
var Life = class {
  constructor(g) {
    this.g = g;
    this.group = new Group14();
    g.town.group.add(this.group);
    this.bugs = [];
    this.fish = [];
    this.balloons = [];
    this.wasps = null;
    this.fishing = null;
    this.shots = [];
    this.birds = new engine_exports.Boids(10, { bounds: { min: [0, 6, 0], max: [80, 12, 60] }, seed: 4 });
    this.birdMeshes = [];
    const bm = (0, engine_exports.toonMaterial)(engine_exports.PALETTE.ink);
    for (let i = 0; i < 10; i++) {
      const b = new Mesh12(new BoxGeometry10(0.34, 0.06, 0.16), bm);
      this.group.add(b);
      this.birdMeshes.push(b);
    }
    this.cloudShadows = [0, 1, 2].map(() => {
      const s = new engine_exports.ContactShadow(3.4);
      g.town.group.add(s);
      return s;
    });
    this.cloudT = 0;
    this.trundle = new Actor(CRITTER_DEFS.trundle, { name: "trundle", seed: 7 });
    this.trundle.addTo(g.town.group);
    this.trundle.play("MayorSlide", 0);
    this.rind = new Actor(CRITTER_DEFS.rind, { name: "rind", seed: 9 });
    this.rind.addTo(g.town.group);
    this.rindStall = build3("rind-stall");
    this.rindStall.position.set(LANDMARKS.stallSpot[0], 0, LANDMARKS.stallSpot[1] - 1.1);
    g.town.group.add(this.rindStall);
    this.rind.x = LANDMARKS.stallSpot[0];
    this.rind.z = LANDMARKS.stallSpot[1] - 0.1;
    this.vesper = new Actor(CRITTER_DEFS.vesper, { name: "vesper", seed: 2 });
    this.vesper.addTo(g.town.group);
    this.vesper.x = LANDMARKS.vesperLamp[0];
    this.vesper.z = LANDMARKS.vesperLamp[1] + 0.45;
    this.vesper.y = 2.1;
    this.vesper.play("VesperHang", 0);
    this.vesper.scale = 0.72;
    this.ribbon = build3("ribbon-posts");
    this.ribbon.position.set(LANDMARKS.ribbon[0], 0, LANDMARKS.ribbon[1]);
    g.town.group.add(this.ribbon);
    this.bobber = build3("crack-mark");
    this.bobber.visible = false;
    this.bobberMesh = new Group14();
    const b1 = new Mesh12(new BoxGeometry10(0.16, 0.12, 0.16), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.red));
    const b2 = new Mesh12(new BoxGeometry10(0.16, 0.08, 0.16), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.white));
    b2.position.y = 0.1;
    this.bobberMesh.add(b1, b2);
    this.bobberMesh.visible = false;
    g.town.group.add(this.bobberMesh);
    this.bites = 0;
    this.lastHour = -1;
    this.footT = 0;
    g.ctx.particles.register("dirt", { count: [6, 10], life: [0.3, 0.6], speed: [1.5, 3], gravity: 8, size: [1, 2], colors: ["plum", "orange", "night"], spread: 50 });
    g.ctx.particles.register("leaf", { count: [8, 14], life: [0.8, 1.4], speed: [0.6, 1.8], gravity: 1.2, size: [1, 1], colors: ["green", "lime", "orange"], spread: 120 });
    g.ctx.particles.register("splash", { count: [8, 14], life: [0.25, 0.5], speed: [1.5, 2.8], gravity: 9, size: [1, 1], colors: ["white", "cyan", "sky"], spread: 40 });
    g.ctx.particles.register("hearts", { count: [4, 6], life: [0.8, 1.1], speed: [0.4, 0.9], gravity: -0.7, size: [1, 2], colors: ["red", "orange"], spread: 40 });
    g.ctx.particles.register("note", { count: [1, 2], life: [0.9, 1.3], speed: [0.3, 0.6], gravity: -0.7, size: [1, 1], colors: ["sand", "white"], spread: 30 });
    g.ctx.particles.register("firework", { count: [40, 60], life: [0.7, 1.1], speed: [3, 5.5], gravity: 2, drag: 0.8, size: [1, 2], colors: ["red", "sand", "white"], spread: 180 });
    g.ctx.particles.register("flame", { count: [3, 5], life: [0.3, 0.6], speed: [0.6, 1.2], gravity: -1.5, size: [1, 1], colors: ["sand", "orange", "red"], spread: 20 });
    g.ctx.particles.register("petal", { count: [1, 1], life: [2.2, 3.4], speed: [0.2, 0.5], gravity: 0.25, size: [1, 1], colors: ["orange", "white"], spread: 90 });
    g.ctx.particles.register("fall", { count: [1, 1], life: [2, 3.2], speed: [0.3, 0.6], gravity: 0.35, size: [1, 1], colors: ["orange", "red", "sand"], spread: 90 });
    g.ctx.particles.register("fly", { count: [1, 1], life: [1.2, 2.2], speed: [0.1, 0.3], gravity: -0.1, size: [1, 1], colors: ["lime", "sand", "lime"], spread: 180 });
    this.placeSpecials();
  }
  // ---- Day -----------------------------------------------------------------------------------------
  resetDay() {
    this.spawnFish();
    this.spawnBugs();
    this.planBalloons();
    this.placeSpecials();
    this.magda = null;
    this.lot = null;
    this.endFishing();
  }
  placeChanged() {
    const g = this.g;
    const inTown = g.place === g.town;
    this.group.visible = inTown;
    this.endFishing();
    if (!inTown) {
      for (const b of this.bugs) b.mesh && (b.mesh.visible = false);
    } else this.placeSpecials();
  }
  // ---- Fish ----------------------------------------------------------------------------------------
  spawnFish() {
    const g = this.g;
    for (const f of this.fish) f.mesh.removeFromParent();
    this.fish = [];
    const w = g.world;
    const rng = dayStream(w, "fish");
    const n = tuning.fishPerAcre;
    for (let az = 0; az < 4; az++) for (let ax = 0; ax < 5; ax++) {
      const spots = [];
      for (let z = az * 16; z < (az + 1) * 16 && z < ROWS - 1; z++) for (let x = ax * 16; x < (ax + 1) * 16; x++) {
        const k = waterKind(x + 0.5, z + 0.5);
        if (k && !tileInfo(tileChar(x, z)).high) spots.push([x, z, k]);
      }
      if (spots.length < 6) continue;
      for (let i = 0; i < n; i++) {
        const [x, z, kind] = rng.pick(spots);
        this.addFish(x + 0.5, z + 0.5, kind, rng);
      }
    }
  }
  addFish(x, z, kind, rng) {
    const g = this.g;
    const def = this.rollFish(kind, rng);
    const size = def.size ?? "S";
    const s = new engine_exports.ContactShadow({ S: 0.22, M: 0.34, L: 0.48, XL: 0.66 }[size]);
    g.town.group.add(s);
    this.fish.push({ x, z, kind, def, vx: 0, vz: 0, t: rng.range(0, 9), mesh: s, state: "drift", home: [x, z], y: -0.27 });
  }
  rollFish(kind, rng) {
    const g = this.g;
    const h = hourNow(g.world);
    const list = fishNow(kind, g.season, h);
    if (!list.length) return OLD_BOOT;
    if (rng.chance(0.08)) return OLD_BOOT;
    const luck = g.world.player.luck === "fish" ? 2 : 1;
    return rng.weighted(list, (f) => (f.rare ? 0.09 * luck : 1) / Math.max(1, Math.sqrt(f.beans / 200)));
  }
  updateFish(dt) {
    const g = this.g;
    const p = g.player;
    for (const f of this.fish) {
      f.t += dt;
      if (f.state === "drift") {
        const nx = f.x + Math.cos(f.t * 0.3) * dt * 0.34;
        const nz = f.z + Math.sin(f.t * 0.23 + 1) * dt * 0.34;
        if (waterKind(nx, nz) === f.kind) {
          f.x = nx;
          f.z = nz;
        }
      } else if (f.state === "come") {
        const b = this.fishing;
        if (!b) {
          f.state = "drift";
          continue;
        }
        const dx = b.x - f.x, dz = b.z - f.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.55) {
          f.x += dx / d * dt * 1;
          f.z += dz / d * dt * 1;
        }
      } else if (f.state === "flee") {
        const dx = f.x - f.fx, dz = f.z - f.fz;
        const d = Math.hypot(dx, dz) || 1;
        const nx = f.x + dx / d * dt * 4, nz = f.z + dz / d * dt * 4;
        if (waterKind(nx, nz)) {
          f.x = nx;
          f.z = nz;
        }
        f.fleeT -= dt;
        if (f.fleeT <= 0) f.state = "drift";
      }
      f.mesh.place(f.x, f.y, f.z, 0);
    }
    const fi = this.fishing;
    if (fi) this.updateFishing(fi, dt);
  }
  cast() {
    const g = this.g;
    const p = g.player;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    let tx = null, tz = null;
    const hp = g.interact.hoverPoint;
    if (hp && waterKind(hp.x, hp.z)) {
      tx = hp.x;
      tz = hp.z;
      p.facing = Math.atan2(tx - p.x, tz - p.z);
    } else for (const r of [2.6, 2.2, 3, 1.6, 3.5]) {
      const x = p.x + fx * r, z = p.z + fz * r;
      const c2 = tileChar(Math.floor(x), Math.floor(z));
      const inf = tileInfo(c2);
      if (inf.water && !inf.high) {
        tx = x;
        tz = z;
        break;
      }
    }
    p.pose("Cast");
    g.sound("cast");
    if (tx === null) {
      g.scripts.run((function* () {
        yield 0.5;
        g.ui.toastMsg("You need to cast at water.");
      })(), { name: "castMiss", hold: false });
      return;
    }
    const kind = waterKind(tx, tz);
    this.fishing = { x: tx, z: tz, kind, state: "flying", t: 0.45, nibbles: 0, target: null, wait: 0 };
    this.bobberMesh.visible = true;
    this.bobberMesh.position.set(tx, -0.2, tz);
    g.events.emit("cast", {});
  }
  updateFishing(fi, dt) {
    const g = this.g;
    const p = g.player;
    fi.t -= dt;
    this.bobberMesh.position.y = -0.22 + Math.sin(g.ctx.time * 4) * 0.015 - (fi.dip ?? 0);
    if (fi.dip > 0) fi.dip = Math.max(0, fi.dip - dt * 0.6);
    if (g.world.clock.mode === "village" && Math.hypot(fi.x - p.x, fi.z - p.z) > 6) {
      this.endFishing();
      return;
    }
    switch (fi.state) {
      case "flying":
        if (fi.t <= 0) {
          g.sound("plop");
          g.ctx.particles.burst("splash", [fi.x, -0.2, fi.z], { count: 6 });
          p.play("Reel", 0.1);
          fi.state = "wait";
          let best = null, bd = 7;
          for (const f of this.fish) {
            if (f.kind !== fi.kind && !(fi.kind === "sea" && f.kind === "mouth")) continue;
            const d = Math.hypot(f.x - fi.x, f.z - fi.z);
            if (d < bd) {
              bd = d;
              best = f;
            }
          }
          if (!best) {
            const rng2 = new Stream(`${g.world.seed}:spawnfish:${g.ctx.time}`);
            this.addFish(fi.x + rng2.range(-1.5, 1.5), fi.z + rng2.range(-1.5, 1.5), fi.kind, rng2);
            best = this.fish[this.fish.length - 1];
            if (!waterKind(best.x, best.z)) {
              best.x = fi.x;
              best.z = fi.z;
            }
          }
          fi.target = best;
          best.state = "come";
          fi.t = 1.2 + bd * 0.4;
          const rng = new Stream(`${g.world.seed}:nib:${g.ctx.time}`);
          best.def = this.rollFish(best.kind, rng);
          fi.nibblesPlanned = rng.int(1, Math.max(1, tuning.maxNibbles));
          if (tuning.maxNibbles === 0) fi.nibblesPlanned = 0;
        }
        break;
      case "wait":
        if (fi.t <= 0) {
          if (fi.nibbles < fi.nibblesPlanned) {
            fi.nibbles++;
            fi.dip = 0.07;
            g.sound("nibble");
            g.rumble(0.12, 60);
            g.events.emit("nibble", {});
            fi.t = 0.7 + fi.nibbles * 37 % 13 / 10;
          } else {
            fi.state = "bite";
            fi.t = tuning.biteWindow;
            fi.dip = 0.4;
            this.bobberMesh.position.y = -0.5;
            g.sound("bite");
            g.rumble(0.9, 200);
            g.ctx.particles.burst("splash", [fi.x, -0.15, fi.z], { count: 14 });
            g.bangT = 0.7;
            g.events.emit("bite", {});
          }
        }
        break;
      case "bite":
        if (fi.t <= 0) {
          fi.state = "missed";
          if (fi.target) {
            fi.target.state = "flee";
            fi.target.fx = fi.x;
            fi.target.fz = fi.z;
            fi.target.fleeT = 1.4;
          }
          g.ui.toastMsg("It got away. It will tell the others.");
          this.endFishing();
        }
        break;
      default:
        break;
    }
  }
  reel() {
    const g = this.g;
    const fi = this.fishing;
    if (!fi) return;
    const p = g.player;
    if (fi.state === "bite") {
      const f = fi.target;
      const def = f?.def ?? OLD_BOOT;
      if (f) {
        f.mesh.removeFromParent();
        this.fish.splice(this.fish.indexOf(f), 1);
      }
      g.sound("reelIn");
      g.sound("splash");
      g.ctx.particles.burst("splash", [fi.x, -0.15, fi.z]);
      this.endFishing();
      g.scripts.run((function* (life) {
        yield 0.2;
        if (!hasRoom(g.world)) {
          g.ui.toastMsg("Your pockets are full. It looks relieved.");
          return;
        }
        addItem(g, def.id);
        if (def.id === "oldBoot") remember(g, "boot", {});
        else if ((def.beans ?? 0) >= 1500) remember(g, "bigCatch", { catch: def.name });
        else if (g.world.stats.fish % 3 === 0) remember(g, "catch", { catch: def.name });
        g.festivals.onCaught?.(def);
        yield* revealCatch(g, def.id, def.line, "fish");
      })(this), { name: "fishCatch" });
      return;
    }
    if (fi.target) {
      fi.target.state = "flee";
      fi.target.fx = fi.x;
      fi.target.fz = fi.z;
      fi.target.fleeT = 1.2;
    }
    g.sound("reelIn");
    this.endFishing();
  }
  endFishing() {
    this.fishing = null;
    this.bobberMesh.visible = false;
    const p = this.g.player;
    if (p?.playing === "Reel") {
      p.play("Idle", 0.15);
    }
  }
  // ---- Bugs ----------------------------------------------------------------------------------------
  spawnBugs() {
    const g = this.g;
    for (const b of this.bugs) b.mesh?.removeFromParent();
    this.bugs = [];
    const w = g.world;
    const h = hourNow(w);
    const rng = new Stream(`${w.seed}:bugs:${w.clock.day}:${Math.floor(h / 3)}`);
    const list = bugsNow(g.season, h, isRaining(g));
    if (!list.length) return;
    const total = Math.round(20 * tuning.bugsPerAcre);
    const trunks = Object.keys(w.town.objects).filter((k) => w.town.objects[k].k === "tree");
    const flowers = Object.keys(w.town.objects).filter((k) => w.town.objects[k].k === "flower");
    const rocks = Object.keys(w.town.objects).filter((k) => w.town.objects[k].k === "rock");
    for (let i = 0; i < total; i++) {
      const def = rng.weighted(list, (b) => b.rare ? 0.08 : 1);
      let at = null;
      if (def.spot === "flower" && flowers.length) at = rng.pick(flowers).split(",").map(Number);
      else if (def.spot === "trunk" && trunks.length) at = rng.pick(trunks).split(",").map(Number);
      else if (def.spot === "rock" && rocks.length) at = rng.pick(rocks).split(",").map(Number);
      else if (def.spot === "lamp") {
        const l = rng.pick(LAMPS);
        at = [Math.floor(l[0]), Math.floor(l[1])];
      } else {
        for (let t = 0; t < 40 && !at; t++) {
          const x = rng.int(3, 76), z = rng.int(3, 56);
          const inf = tileInfo(tileChar(x, z));
          if (def.spot === "water" && inf.water && !inf.high && inf.water !== "sea") at = [x, z];
          else if (def.spot === "near" && inf.walk && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileInfo(tileChar(x + a, z + b)).water)) at = [x, z];
          else if ((def.spot === "grass" || def.spot === "snow") && inf.walk && inf.surface === "lawn") at = [x, z];
        }
      }
      if (!at) continue;
      this.addBug(def, at[0] + 0.5, at[1] + 0.5, rng);
    }
  }
  addBug(def, x, z, rng) {
    const m = def.kind === "flier" ? build3("winged", { params: { size: def.id === "firefly" ? 0.2 : 0.42 }, palette: { wing: def.color, spot: "ink", body: "ink" } }) : build3("bug", { params: { size: 0.26 }, palette: { body: def.color } });
    const y0 = groundHeight(x, z);
    const b = { def, x, z, y: y0 + (def.kind === "flier" ? 0.9 : def.spot === "trunk" ? 0.9 : 0.05), y0, mesh: m, t: rng ? rng.range(0, 9) : 0, cx: x, cz: z, spooked: false, gone: false, kind: def.kind };
    if (def.spot === "lamp") b.y = y0 + 1.9;
    if (def.spot === "water") b.y = -0.25;
    m.position.set(x, b.y, z);
    this.group.add(m);
    this.bugs.push(b);
    return b;
  }
  catchBug(b) {
    const g = this.g;
    b.gone = true;
    b.mesh.removeFromParent();
    this.bugs.splice(this.bugs.indexOf(b), 1);
    g.ctx.particles.burst("sparkle", [b.x, b.y, b.z], { count: 8 });
    if (hasRoom(g.world)) addItem(g, b.def.id);
    else g.ui.toastMsg("Your pockets are full. It waves goodbye, in its way.");
    g.festivals.onCaught?.(b.def);
  }
  updateBugs(dt) {
    const g = this.g;
    const p = g.player;
    const spook = p.speed > 5 ? tuning.spookRun : p.speed > 3.2 ? 2 : p.speed > 1.5 ? 1.2 : 0.5;
    const inTown = g.place === g.town;
    for (const b of this.bugs.slice()) {
      b.t += dt;
      const d = inTown ? Math.hypot(b.x - p.x, b.z - p.z) : 99;
      const near = d < 18;
      b.mesh.visible = near && inTown;
      if (!near) continue;
      if (d < spook && p.speed > 0.5 && !b.spooked) {
        b.spooked = true;
        b.spookT = 1.4;
        b.fx = (b.x - p.x) / Math.max(0.1, d);
        b.fz = (b.z - p.z) / Math.max(0.1, d);
        g.events.emit("spook", {});
      }
      if (b.spooked) {
        b.x += b.fx * dt * 5;
        b.z += b.fz * dt * 5;
        b.y += dt * (b.kind === "flier" ? 2 : 0);
        b.spookT -= dt;
        if (b.spookT <= 0) {
          b.mesh.removeFromParent();
          this.bugs.splice(this.bugs.indexOf(b), 1);
          continue;
        }
      } else if (b.kind === "flier") {
        b.x = b.cx + Math.sin(b.t * 0.9) * 1.1;
        b.z = b.cz + Math.cos(b.t * 0.7 + 1) * 1.1;
        b.y = b.y0 + 0.9 + Math.abs(Math.sin(b.t * 2.2)) * 0.4 + (b.def.spot === "lamp" ? 1 : 0);
      } else if (b.kind === "crawler") {
        b.x = b.cx + Math.sin(b.t * 0.5) * 0.4;
      }
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.kind === "flier") {
        const wl = b.mesh.getObjectByName("WingL"), wr = b.mesh.getObjectByName("WingR");
        const flap = Math.sin(b.t * 24) * 0.9;
        if (wl) wl.rotation.z = flap;
        if (wr) wr.rotation.z = -flap;
        b.mesh.rotation.y = Math.cos(b.t * 0.9) * 1.1;
      }
    }
  }
  // ---- Balloons ------------------------------------------------------------------------------------
  planBalloons() {
    const g = this.g;
    for (const b of this.balloons) b.mesh.removeFromParent();
    this.balloons = [];
    const w = g.world;
    const rng = dayStream(w, "balloons");
    this.balloonPlan = [];
    for (let i = 0; i < tuning.balloonsPerDay; i++) this.balloonPlan.push({ at: rng.int(7, 20) * 60 + rng.int(0, 50), z: rng.int(14, 50), gift: rng.pick(["bagOfBeans", "boxedGift", "cottageSide", "plainGreen", "seedRose", "stationery", "mossyPlant", "capBlue"]) });
  }
  launchBalloon(plan) {
    const g = this.g;
    const m = build3("balloon", { palette: { a: ["red", "sky", "lime", "orange"][plan.z % 4] } });
    const b = { x: -2, z: plan.z, y: 5.2, mesh: m, gift: plan.gift, t: 0 };
    m.position.set(b.x, b.y, b.z);
    this.group.add(m);
    this.balloons.push(b);
    g.events.emit("balloon", {});
    return b;
  }
  balloonAhead() {
    const g = this.g;
    const p = g.player;
    const hp = g.interact.hoverPoint;
    let best = null, bs = 1e9;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    for (const b of this.balloons) {
      const dx = b.x - p.x, dz = b.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 14) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      const s = hp ? Math.hypot(b.x - hp.x, b.z - hp.z) : d - dot * 8;
      if (s < bs) {
        bs = s;
        best = b;
      }
    }
    return best;
  }
  fireShot(target) {
    const g = this.g;
    const p = g.player;
    const m = new Mesh12(new BoxGeometry10(0.12, 0.12, 0.12), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.ink));
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    m.position.set(p.x + fx * 0.4, p.y + 1.1, p.z + fz * 0.4);
    this.group.add(m);
    const aim = target ? new Vector37(target.x, target.y + 1.3, target.z) : new Vector37(p.x + fx * 10, p.y + 6, p.z + fz * 10);
    this.shots.push({ m, vx: 0, vy: 0, vz: 0, aim, target, t: 0 });
    g.events.emit("shot", { hit: !!target });
  }
  updateBalloons(dt) {
    const g = this.g;
    const minute = g.world.clock.minute;
    for (const plan of this.balloonPlan ?? []) if (!plan.done && minute >= plan.at) {
      plan.done = true;
      this.launchBalloon(plan);
    }
    for (const b of this.balloons.slice()) {
      b.t += dt;
      b.x += dt * 1;
      b.y = 5.2 + Math.sin(b.t * 0.8) * 0.3;
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.x > 82) {
        b.mesh.removeFromParent();
        this.balloons.splice(this.balloons.indexOf(b), 1);
      }
    }
    for (const s of this.shots.slice()) {
      s.t += dt;
      const to = s.target ? new Vector37(s.target.x, s.target.y + 1.3, s.target.z) : s.aim;
      const d = to.clone().sub(s.m.position);
      const len = d.length();
      const step = dt * 22;
      if (len <= step + 0.2 || s.t > 1.2) {
        s.m.removeFromParent();
        this.shots.splice(this.shots.indexOf(s), 1);
        if (s.target && this.balloons.includes(s.target)) this.popBalloon(s.target);
        continue;
      }
      s.m.position.addScaledVector(d, step / len);
    }
  }
  popBalloon(b) {
    const g = this.g;
    g.sound("pop");
    g.ctx.particles.burst("sparkle", [b.x, b.y + 1.3, b.z], { count: 14, colors: ["white", "red", "sand"] });
    b.mesh.removeFromParent();
    this.balloons.splice(this.balloons.indexOf(b), 1);
    const w = g.world;
    let spot = null;
    for (let r = 0; r < 12 && !spot; r++) for (let dz = -r; dz <= r && !spot; dz++) for (let dx = -r; dx <= r && !spot; dx++) {
      const x = Math.floor(b.x) + dx, z = Math.floor(b.z) + dz;
      const inf = tileInfo(tileChar(x, z));
      if (inf.walk && !w.town.objects[`${x},${z}`] && !g.town.solid[z * COLS + x]) spot = [x, z];
    }
    if (spot) {
      w.town.objects[`${spot[0]},${spot[1]}`] = { k: "drop", item: b.gift };
      g.town.dirty.add(`${spot[0]},${spot[1]}`);
    }
    w.stats.balloons = (w.stats.balloons ?? 0) + 1;
    g.events.emit("balloonPopped", { gift: b.gift });
  }
  // ---- Trees, rocks, wasps -------------------------------------------------------------------------
  hitRock(x, z, o) {
    const g = this.g;
    const w = g.world;
    o.hits = (o.hits ?? 0) + 1;
    g.ctx.particles.burst("sparkle", [x + 0.5, 0.6, z + 0.5], { count: 6, colors: ["mist", "white"] });
    const v2 = g.town.objectViews.get(`${x},${z}`);
    if (v2) g.ctx.tweens.value(0, 1, { duration: 0.22 }, (t) => {
      v2.scale.setScalar(1 + Math.sin(t * 12) * 0.05 * (1 - t));
    });
    if (o.pays && o.hits <= 5) {
      addBeans(g, 300 + o.hits * 100, "rock");
      g.sound("bean");
      g.ui.toastMsg(`The rock coughs up ${300 + o.hits * 100} beans.`);
      g.events.emit("rockPaid", {});
    } else if (o.hits === 1 && !o.pillOut) {
      o.pillOut = true;
      const pill = BUGS.find((b2) => b2.id === "pillBug");
      const b = this.addBug(pill, x + 1.1, z + 0.5, new Stream(`${w.seed}:${x}:${z}`));
      g.events.emit("pillBug", { b });
    }
  }
  shakeTree(k, o) {
    const g = this.g;
    const w = g.world;
    const [x, z] = k.split(",").map(Number);
    const v2 = g.town.objectViews.get(k);
    if (v2) g.ctx.tweens.value(0, 1, { duration: 0.8 }, (t) => {
      v2.rotation.z = Math.sin(t * 26) * 0.05 * (1 - t);
      v2.rotation.x = Math.cos(t * 20) * 0.03 * (1 - t);
    });
    g.sound("shakeTree");
    g.ctx.particles.burst("leaf", [x + 0.5, 2.6, z + 0.5], { count: 10, colors: g.season === 2 ? ["orange", "red"] : g.season === 3 ? ["white"] : g.season === 0 ? ["orange", "white"] : ["green", "lime"] });
    const out = [];
    const dropAround = (item) => {
      for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const tx = x + dx, tz = z + dz;
        const nk = `${tx},${tz}`;
        const inf = tileInfo(tileChar(tx, tz));
        if (inf.walk && !w.town.objects[nk] && !g.town.solid[tz * COLS + tx]) {
          w.town.objects[nk] = { k: "drop", item };
          g.town.dirty.add(nk);
          out.push(item);
          g.sound("fruitDrop");
          return true;
        }
      }
      return false;
    };
    if ((o.fruit ?? 0) > 0 && g.season !== 3) {
      const item = o.fruitItem ?? (o.kind === "palm" ? "coconut" : "pear");
      for (let i = 0; i < o.fruit; i++) dropAround(item);
      o.fruit = 0;
      o.regrow = w.clock.day + tuning.fruitRegrow;
      g.town.dirty.add(k);
    }
    if (o.hasBag) {
      dropAround("bagOfBeans");
      o.hasBag = false;
    }
    if (o.hasFurniture) {
      const pool = FURNITURE.filter((f) => !f.notForSale && !f.rare);
      dropAround(new Stream(`${w.seed}:treefurn:${w.clock.day}:${k}`).pick(pool).id);
      o.hasFurniture = false;
    }
    g.events.emit("shake", { k, out });
    if (o.wasp) {
      o.wasp = false;
      g.town.dirty.add(k);
      this.startWasps(x + 0.5, z + 0.5);
    }
  }
  startWasps(x, z) {
    const g = this.g;
    if (this.wasps) return;
    const g2 = new Group14();
    for (let i = 0; i < 5; i++) {
      const m = new Mesh12(new BoxGeometry10(0.1, 0.08, 0.14), (0, engine_exports.toonMaterial)(engine_exports.PALETTE.sand));
      g2.add(m);
    }
    this.group.add(g2);
    this.wasps = { x, z, y: 1.8, t: 0, mesh: g2, life: 9, sound: 0 };
    g.events.emit("wasps", {});
    g.ui.toastMsg("Wasps! Run. Or be stung. Those are the options.");
  }
  netWasps() {
    const g = this.g;
    if (this.wasps) {
      this.wasps.mesh.removeFromParent();
      this.wasps = null;
      g.ui.toastMsg("You caught the wasps. They are now your problem, in a jar.");
      g.events.emit("waspsCaught", {});
    }
  }
  waspsNear(x, z) {
    const w = this.wasps;
    return !!w && Math.hypot(w.x - x, w.z - z) < 1.8;
  }
  updateWasps(dt) {
    const w = this.wasps;
    if (!w) return;
    const g = this.g;
    const p = g.player;
    w.t += dt;
    w.life -= dt;
    w.sound -= dt;
    if (w.sound <= 0) {
      w.sound = 0.5;
      g.sound("waspBuzz", { volume: 0.7 });
    }
    const dx = p.x - w.x, dz = p.z - w.z;
    const d = Math.hypot(dx, dz);
    const sp = 3.3;
    if (g.place === g.town && d > 0.01) {
      w.x += dx / d * sp * dt;
      w.z += dz / d * sp * dt;
    }
    w.mesh.children.forEach((m, i) => {
      const a = w.t * 8 + i * 1.3;
      m.position.set(w.x + Math.cos(a) * 0.5, w.y - 0.5 + Math.sin(a * 1.3) * 0.3, w.z + Math.sin(a) * 0.5);
    });
    if (g.place === g.town && d < 0.6 && g.canAct()) {
      this.sting();
    } else if (w.life <= 0 || g.place !== g.town) {
      w.mesh.removeFromParent();
      this.wasps = null;
    }
  }
  sting() {
    const g = this.g;
    const w = g.world;
    this.wasps.mesh.removeFromParent();
    this.wasps = null;
    w.player.puffy = true;
    w.flags.stungDay = w.clock.day;
    w.stats.stings = (w.stats.stings ?? 0) + 1;
    remember(g, "sting", {});
    g.sound("sting");
    g.rumble(0.8, 240);
    if (g.settings.shake) g.engine.shake.add(0.3);
    g.player.pose("Sting");
    if (g.player.eyeL) g.player.eyeL.scale.x = 1.8;
    g.applyPuffy?.();
    g.events.emit("sting", {});
    g.ui.toastMsg("Stung! Your face has been reorganised. Medicine, or morning.");
  }
  // ---- The Mayor, Old Rind, Vesper -----------------------------------------------------------------
  placeSpecials() {
    const g = this.g;
    const w = g.world;
    const c2 = g.cal;
    const d = Math.min(1, ((w.clock.day - 1) % 16 + (w.clock.minute - 300) / 1140) / 3.8);
    const [rx, rz] = LANDMARKS.ribbon;
    const start2 = 17;
    const arrived = w.clock.day >= 4;
    this.trundle.x = arrived ? rx - 1.2 - (w.clock.day - 4) * 0.8 % 12 : start2 + (rx - 1.2 - start2) * d;
    this.trundle.z = rz;
    this.trundle.y = 0;
    this.trundle.facing = arrived && w.flags.mayorArrived ? -Math.PI / 2 : Math.PI / 2;
    const rindHere = c2.market && w.clock.minute >= 360 && w.clock.minute < 720 || w.flags.rindForced;
    this.rindHere = rindHere;
    this.rind.visible = rindHere;
    this.rindStall.visible = rindHere;
    const vesperOn = (c2.show || w.flags.vesperForced) && w.clock.minute >= 19 * 60 && w.clock.minute < 23.5 * 60;
    this.vesperOn = vesperOn;
    this.vesper.visible = vesperOn;
    if (this.ribbon) this.ribbon.visible = !w.flags.ribbonGone;
  }
  interactables() {
    const g = this.g;
    const out = [];
    if (g.place !== g.town) return out;
    const t = this.trundle;
    out.push({ id: "mayor", x: t.x, z: t.z, r: 1.4, label: "Talk to Mayor Trundle", act: "mayorTalk" });
    if (this.rindHere) out.push({ id: "rind", x: this.rind.x, z: this.rind.z, r: 1.7, label: "Talk to Old Rind", act: "rindTalk" });
    if (this.vesperOn) out.push({ id: "vesper", x: this.vesper.x, z: this.vesper.z, r: 2, label: "Talk to Vesper", act: "vesperTalk" });
    for (const b of this.bugs) if (b.mesh && false) out.push(b);
    return out;
  }
  // ---- Footprints, worn paths ---------------------------------------------------------------------
  onStep(x, z) {
    const g = this.g;
    if (g.place !== g.town) return;
    const w = g.world;
    const k = `${Math.floor(x)},${Math.floor(z)}`;
    w.stats.walked += 1;
    w.town.wear[k] = (w.town.wear[k] ?? 0) + (g.player.speed > 5 ? 2 : 1);
    if (w.town.wear[k] > 26 && !w.town.worn[k]) {
      const c2 = tileChar(Math.floor(x), Math.floor(z));
      if (tileInfo(c2).surface === "lawn") {
        w.town.worn[k] = 1;
        g.town.terrain.rebuildTile(Math.floor(x), Math.floor(z));
        g.events.emit("worn", { k });
      }
    }
    if (g.season === 3 && tileInfo(tileChar(Math.floor(x), Math.floor(z))).surface === "lawn") {
      g.town.decals.add("footprint", { x, y: g.town.height(x, z) + 0.02, z }, { x: 0, y: 1, z: 0 }, { size: 0.3, rotation: g.player.facing, color: 9744578, life: 30 });
    }
    if (g.player.speed > 5) {
      const o = w.town.objects[k];
      if (o?.k === "flower") {
        o.wilt = 3;
        g.town.dirty.add(k);
        g.events.emit("trampled", {});
      }
    }
    g.pushing = false;
  }
  updateSnow(dt) {
    const g = this.g;
    const w = g.world;
    if (g.season !== 3 || g.place !== g.town) {
      g.pushing = false;
      return;
    }
    const p = g.player;
    let pushed = false;
    for (const s of Object.keys(w.town.objects)) {
      const o = w.town.objects[s];
      if (o.k !== "snowball") continue;
      const dx = o.x - p.x, dz = o.z - p.z;
      const d = Math.hypot(dx, dz);
      const r = 0.3 + o.size * 0.5;
      if (d < r + 0.05 && p.speed > 0.2) {
        const nx = o.x + dx / (d || 1) * dt * p.speed * 0.8;
        const nz = o.z + dz / (d || 1) * dt * p.speed * 0.8;
        if (!g.town.blocked(nx, nz)) {
          o.x = nx;
          o.z = nz;
          o.size = Math.min(1.5, o.size + dt * 0.08);
          pushed = true;
          const v2 = g.town.objectViews.get(s);
          if (v2) {
            v2.position.set(o.x, groundHeight(o.x, o.z), o.z);
            v2.children[0].scale.setScalar(o.size);
            v2.children[0].rotation.x += dt * p.speed;
          }
        }
      }
    }
    if (pushed) {
      this.pushSound = (this.pushSound ?? 0) - dt;
      if (this.pushSound <= 0) {
        this.pushSound = 0.25;
        g.sound("snowPush");
      }
    }
    g.pushing = pushed;
    const balls = Object.entries(w.town.objects).filter(([, o]) => o.k === "snowball");
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      const [ka, a] = balls[i], [kb, b] = balls[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > (a.size + b.size) * 0.5 + 0.1) continue;
      const big = a.size >= b.size ? a : b;
      const small = big === a ? b : a;
      const ratio = small.size / big.size;
      const tx = Math.floor(big.x), tz = Math.floor(big.z);
      delete w.town.objects[ka];
      delete w.town.objects[kb];
      g.town.dirty.add(ka);
      g.town.dirty.add(kb);
      const nk = `${tx},${tz}`;
      const good = ratio > 0.55 && ratio < 0.85 && big.size > 0.7;
      w.town.objects[nk] = { k: "snowman", ratio, good, big: big.size, day: w.clock.day };
      g.town.dirty.add(nk);
      g.sound("snowPlop");
      g.events.emit("snowman", { ratio, good, big: big.size });
      g.festivals.onSnowman?.(ratio, big.size);
      return;
    }
  }
  spawnSnowballs() {
    const g = this.g;
    const w = g.world;
    const rng = dayStream(w, "snowballs");
    for (let i = 0; i < 6; i++) {
      const x = rng.int(3, 76), z = rng.int(17, 46);
      const k = `${x},${z}`;
      if (tileInfo(tileChar(x, z)).surface === "lawn" && !w.town.objects[k] && !g.town.solid[z * COLS + x]) {
        w.town.objects[k] = { k: "snowball", x: x + 0.5, z: z + 0.5, size: 0.4 + i % 3 * 0.2 };
        g.town.dirty.add(k);
      }
    }
  }
  // ---- Cheese and venue helpers ---------------------------------------------------------------------
  cheesePrice() {
    return cheesePriceNow(this.g);
  }
  magdaStock() {
    const g = this.g;
    const w = g.world;
    if (this.magda?.day === w.clock.day) return this.magda.list;
    const s = new Stream(`${w.seed}:magda:${w.clock.day}`);
    const pool = s.shuffle(ART);
    const list = pool.slice(0, 3).map((a, i) => ({ id: s.chance(0.5) ? `${a.id}F` : a.id, base: a.id, price: Math.round(a.beans * 1.6 + i * 200) }));
    this.magda = { day: w.clock.day, list };
    return list;
  }
  auctionLot() {
    return this.g.auction?.current ?? null;
  }
  // ---- Frame ---------------------------------------------------------------------------------------
  fixedStep(dt) {
    this.updateFish(dt);
    if (this.g.place === this.g.town) this.updateWasps(dt);
    this.updateBalloons(dt);
    this.updateSnow(dt);
  }
  presentation(dt) {
    const g = this.g;
    this.updateBugs(dt);
    this.birds.step(dt);
    for (let i = 0; i < 10; i++) {
      const m = this.birdMeshes[i];
      m.position.set(this.birds.pos[i * 3], this.birds.pos[i * 3 + 1], this.birds.pos[i * 3 + 2]);
      m.rotation.y = Math.atan2(this.birds.vel[i * 3], this.birds.vel[i * 3 + 2]);
      m.rotation.z = Math.sin(g.ctx.time * 12 + i) * 0.6;
    }
    this.cloudT += dt * 0.5;
    const p = g.player;
    const sunny = g.sky?.kind === "sun" && g.place === g.town;
    this.cloudShadows.forEach((s, i) => {
      s.visible = sunny;
      if (sunny) s.place(40 + Math.sin(this.cloudT * 0.1 + i * 2) * 40, 0.02, 30 + Math.cos(this.cloudT * 0.07 + i) * 24, 0);
    });
    if (g.place === g.town) {
      this.trundle.update(dt);
      if (this.rind.visible) {
        if (!this.rind.current || this.rind.finished) this.rind.play("Idle", 0.2);
        this.rind.update(dt);
      }
      if (this.vesper.visible) {
        this.vesper.update(dt);
        if (Math.floor(g.ctx.time * 2) % 2 === 0 && g.ctx.time % 0.5 < dt) g.ctx.particles.burst("note", [this.vesper.x, 2.6, this.vesper.z]);
      }
      this.ringT = (this.ringT ?? 0) - dt;
      if (this.ringT <= 0 && this.fish.length) {
        this.ringT = 0.9;
        const f = this.fish[Math.floor(g.ctx.time * 7) % this.fish.length];
        if (Math.abs(f.x - p.x) < 14 && Math.abs(f.z - p.z) < 14) g.town.decals.add("ring", { x: f.x, y: -0.26, z: f.z }, { x: 0, y: 1, z: 0 }, { size: 0.8, color: 16053492, life: 0.7 });
      }
      if (g.town.mailFlag) g.town.mailFlag.rotation.z = g.world.mail.inbox.some((l) => !l.read) ? 0 : -1.5;
      this.smellT = (this.smellT ?? 0) - dt;
      if (this.smellT <= 0) {
        this.smellT = 0.8;
        if (g.world.player.pockets.some((s) => s?.id === "cheeseOff")) {
          g.ctx.particles.burst({ count: [2, 3], life: [0.7, 1.1], speed: [0.2, 0.5], gravity: -0.8, size: [1, 1], colors: ["lime", "green"], spread: 40 }, [p.x, p.y + 1, p.z]);
          if ((this.smellN = (this.smellN ?? 0) + 1) % 4 === 0) g.sound("cheeseSmell", { volume: 0.5 });
        }
        const k = g.sky?.kind;
        if ((k === "rain" || k === "storm") && g.town.decals) {
          const r = g.cosmetic;
          const x = p.x + r.range(-7, 7), z = p.z + r.range(-7, 7);
          if (g.town.height(x, z) >= 0 && !g.town.blocked(x, z)) g.town.decals.add("splat", { x, y: g.town.height(x, z) + 0.02, z }, { x: 0, y: 1, z: 0 }, { size: r.range(0.6, 1.3), color: 4302582, life: 18 });
        }
      }
      this.smokeT = (this.smokeT ?? 0) - dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.5;
        for (const s of g.town.smokeAt) if (Math.abs(s.x - p.x) < 14 && Math.abs(s.z - p.z) < 14) g.ctx.particles.burst("smoke", [s.x, s.y, s.z], { count: 1, speed: 0.5 });
        for (const [k, o] of Object.entries(g.world.town.objects)) {
          if (o.k === "sparkle") {
            const [x, z] = k.split(",").map(Number);
            if (Math.abs(x - p.x) < 12 && Math.abs(z - p.z) < 12) g.ctx.particles.burst("sparkle", [x + 0.5, 0.4, z + 0.5], { count: 2 });
          }
        }
      }
    }
    if (g.bangT > 0) g.bangT -= dt;
  }
  drawHud(hud) {
    const g = this.g;
    drawReveal(g, hud);
    if (g.bangT > 0 && this.fishing) {
      const s = g.project(g.player.x, g.player.y + 2, g.player.z);
      if (s) {
        drawText(hud, s.x, s.y - 10, "!", { color: "red", scale: 3, align: "center", shadow: "white" });
      }
    }
    if (g.mode === "play" && g.place === g.town && !g.ui.blocking) {
      for (const n of g.npcs.markerList()) {
        const s = g.project(n.actor.x, n.actor.y + 2, n.actor.z);
        if (s) drawText(hud, s.x, s.y - 8 + Math.round(Math.sin(g.ctx.time * 5) * 1), "!", { color: "red", scale: 2, align: "center", shadow: "white" });
      }
      for (const n of g.npcs.all()) {
        if (n.bubbleT > 0 && n.bubble && n.actor.visible) {
          const d = Math.hypot(n.actor.x - g.player.x, n.actor.z - g.player.z);
          if (d > 5) continue;
          const s = g.project(n.actor.x, n.actor.y + 2, n.actor.z);
          if (s) bubble(hud, s.x, s.y - 4, n.bubble);
        }
      }
    }
    if (g.place === g.city && g.mode === "play" && !g.ui.blocking) {
      for (const c2 of g.city.crowd) if (c2.bubbleT > 0 && c2.bubble) {
        const s = g.project(c2.a.x, 2, c2.a.z);
        if (s) bubble(hud, s.x, s.y - 4, c2.bubble);
      }
    }
  }
};
function bubble(hud, x, y, text) {
  const w = Math.min(200, textWidth(text) + 10);
  const cx = Math.max(w / 2 + 2, Math.min(478 - w / 2, x));
  panel(hud, cx - w / 2, y - 15, w, 15, { fill: "white", trim: "white" });
  hud.rect(x - 1, y - 1, 3, 2, "ink");
  drawText(hud, cx, y - 11, text, { align: "center", color: "ink" });
}

// src/game.js
init_title();
init_bed();
init_newgame();
init_flow();

// src/dev/attract.js
init_save();
init_draw();
init_newgame();
init_flow();
init_objectsView();
init_calendar();
init_town();
init_city();
init_bus();
init_lines();
init_dialogue();
init_say();
init_clothes();
init_items();
init_title();
init_title();
init_fish();
init_engine();
init_models();
var BEAT_STRETCH = 2.1;
var AttractMode = class {
  constructor(g) {
    this.g = g;
    this.running = false;
    this.tune = null;
    this.t = 0;
    this.script = null;
    this.savedPlace = null;
  }
  start() {
    const g = this.g;
    g.ui.popAll();
    g.mode = "attract";
    this.running = true;
    this.t = 0;
    this.loops = (this.loops ?? 0) + 1;
    const w = newWorld(777 + this.loops, { demo: true });
    w.player.name = "Pip";
    w.player.town = "Far Enough";
    w.player.look.hair = 3;
    w.player.look.hairColor = "orange";
    w.player.look.outfit = "plainRed";
    w.player.look.hatItem = "strawHat";
    w.player.tools = ["net", "rod", "shovel", "axe", "can", "slingshot"];
    w.player.beans = 999999;
    w.story.stage = "free";
    w.flags.shackRoof = true;
    w.player.homeTier = 2;
    w.museum.open = true;
    g.demo = true;
    this.goDay(1, 10);
    g.world = w;
    installWorld(g, w);
    dailyRespawn(g);
    rebuildAllObjects(g.town);
    g.events.emit("attractStart", {});
    this.beat = 0;
    this.scene = this.play();
    this.wait = 0;
    this.scriptDone = false;
    g.camFocus = null;
    g.music.refresh();
  }
  goDay(day, hour) {
    const g = this.g;
    if (!g.world) return;
    g.world.clock.day = day;
    g.world.clock.minute = hour * 60;
    g.weatherKey = null;
    g.lastHour = -1;
  }
  /** Any input exits to the title at once. */
  stop() {
    const g = this.g;
    if (!this.running) return;
    this.running = false;
    g.scripts.cancelAll();
    g.ui.popAll();
    g.engine.screen.set("iris", 0);
    g.inTransition = false;
    g.hideHud = false;
    g.music.setOverride(null);
    this.tune = null;
    for (const m of this.extra ?? []) m.removeFromParent();
    this.extra = [];
    g.player.sitting = false;
    g.player.poseTimer = 0;
    g.player.poseClip = null;
    g.player.locked = false;
    g.events.emit("attractStop", {});
    g.goTitle();
  }
  fixedStep(dt) {
    if (this.running) this.walk(dt);
  }
  walk(dt) {
    const g = this.g;
    const p = g.player;
    if (!this.dest) {
      p.speed = 0;
      return;
    }
    const dx = this.dest.x - p.x, dz = this.dest.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) {
      this.dest = null;
      p.speed = 0;
      return;
    }
    const sp = this.dest.speed ?? 4.2;
    p.x += dx / d * sp * dt;
    p.z += dz / d * sp * dt;
    p.y = g.place.height(p.x, p.z);
    p.speed = sp;
    p.turnTo = Math.atan2(dx, dz);
  }
  update(dt) {
    const g = this.g;
    if (!this.running) return;
    if (g.inp.any) {
      this.stop();
      return;
    }
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const r = this.scene.next();
    if (r.done) {
      this.scene = this.play();
      return;
    }
    if (typeof r.value === "number") this.wait = r.value > 0.5 ? r.value * BEAT_STRETCH : r.value;
  }
  say(who, text, dur = 3) {
    const g = this.g;
    g.ui.popAll();
    const d = new Dialogue({ who, name: nameOf(who), voice: who, beats: [text] });
    d.update = function(gg, inp, dt) {
      this.timer += dt * 40;
      while (this.timer >= 1 && this.shown < this.total) {
        this.timer -= 1;
        const ch = this.seq[this.pos++];
        if (!ch) break;
        if (ch.beat) continue;
        this.shown++;
        if (ch.c !== " ") {
          gg.voice.syllable(ch.c, this.voice, text);
          const a = gg.actorOf(this.who);
          if (a && /[aeiou]/i.test(ch.c)) a.talkAmp = 1;
        }
      }
    };
    g.ui.push(d);
    return dur;
  }
  iris() {
    const g = this.g;
    g.engine.screen.cover("iris", { duration: 0.2 });
    return 0.22;
  }
  reveal() {
    this.g.engine.screen.reveal("iris", { duration: 0.2 });
  }
  moveTo(place, x, z, facing = 0) {
    this.g.swapPlace(place, x, z, facing);
  }
  setDay(day, hour) {
    this.goDay(day, hour);
    this.g.refreshSeason(true);
    this.g.sky.placeChanged();
    this.g.life.resetDay();
    this.g.festivals.resetDay();
    this.g.npcs.scatter();
  }
  *play() {
    const g = this.g;
    const town = g.town;
    const p = g.player;
    const w = g.world;
    this.tune = null;
    this.setDay(1, 10);
    this.moveTo(town, 52, 11, Math.PI);
    const treeKey = Object.keys(w.town.objects).find((k) => w.town.objects[k].k === "tree" && w.town.objects[k].kind === "pear");
    const [tx, tz] = treeKey.split(",").map(Number);
    p.x = tx + 0.5;
    p.z = tz + 1.5;
    p.facing = Math.PI;
    g.camTeleport();
    p.pose("ShakeTree");
    yield 0.3;
    g.life.shakeTree(treeKey, w.town.objects[treeKey]);
    yield 2;
    p.hold("tool-net");
    p.play("NetReady", 0.1);
    this.moveTo(town, 18, 26, 0);
    const butterfly = g.life.addBug(g.life.bugs[0]?.def ?? { id: "cabbageButterfly", name: "Butterfly", kind: "flier", color: "white", spot: "flower", beans: 90, line: "" }, 19.5, 27, null);
    yield 1;
    p.pose("NetSweep");
    g.sound("netSwing");
    yield 0.3;
    g.life.catchBug(butterfly);
    p.pose("HoldUp", 1.4);
    g.sound("reveal");
    yield 2;
    p.hold("tool-rod");
    this.moveTo(town, 37.2, 22, Math.PI / 2);
    p.pose("Cast");
    g.sound("cast");
    yield 0.5;
    g.life.bobberMesh.visible = true;
    g.life.bobberMesh.position.set(40, -0.2, 22);
    g.sound("plop");
    yield 1.4;
    g.sound("nibble");
    g.life.bobberMesh.position.y = -0.3;
    yield 0.9;
    g.life.bobberMesh.position.y = -0.5;
    g.sound("bite");
    g.ctx.particles.burst("splash", [40, -0.15, 22]);
    yield 0.5;
    g.life.bobberMesh.visible = false;
    p.pose("HoldUp", 1.4);
    g.sound("reveal");
    yield this.say("player", "You caught a pike! Someone should tell it about the other end of the hook.", 2.4);
    g.ui.popAll();
    p.hold("tool-shovel");
    this.moveTo(town, 25, 30, 0);
    p.pose("Dig");
    g.sound("dig");
    g.ctx.particles.burst("dirt", [25, 0.2, 31]);
    yield 1.6;
    p.pose("HoldUp", 1.2);
    g.sound("reveal");
    yield 1.6;
    p.hold(null);
    const n = g.npcs.get("bartleby");
    n.inside = false;
    n.setPos(30, 35);
    g.npcs.syncVisibility(n);
    n.held = true;
    const t = g.npcs.get("tavi");
    t.inside = false;
    t.setPos(28, 35);
    g.npcs.syncVisibility(t);
    t.held = true;
    this.moveTo(town, 29, 37, Math.PI);
    t.actor.play("Wave", 0.1, { once: true });
    yield this.say("tavi", "I smiled at a rock today and I think it's going really well, isn't it?!", 3.2);
    yield this.say("bartleby", "You're standing in my good spot. No, there isn't another one. I'd prefer not.", 3.2);
    g.ui.popAll();
    n.held = false;
    t.held = false;
    yield this.iris();
    const store2 = g.rooms.get("store");
    this.moveTo(store2, 6, 4.8, Math.PI);
    this.reveal();
    store2.host?.play("Honk", 0.1, { once: true });
    g.sound("honk");
    yield this.say("gander", "No rush on the payment, dear. I've simply noted the time you didn't pay, and I'll be noting it again tomorrow.", 3.6);
    g.ui.popAll();
    yield this.iris();
    w.home.rooms.main.items.push({ id: "cottageSofa", x: 2, z: 1, rot: 0, on: true }, { id: "cottageLamp", x: 1, z: 1, rot: 0, on: true }, { id: "cottageRug", x: 3, z: 3, rot: 0, on: true }, { id: "cottageTable", x: 3, z: 3, rot: 0, on: true }, { id: "mossyPlant", x: 6, z: 1, rot: 0, on: true }, { id: "stereo", x: 7, z: 1, rot: 0, on: true });
    const home = g.rooms.get("home");
    home.rebuild();
    this.moveTo(home, 4, 5.5, Math.PI);
    this.reveal();
    yield 2.5;
    p.play("Dance", 0.2);
    yield 2;
    yield this.iris();
    w.museum.fish = Object.fromEntries(FISH.slice(0, 12).map((f) => [f.id, true]));
    const aq = g.rooms.get("museum_fish");
    this.moveTo(aq, 6, 5.4, Math.PI);
    this.reveal();
    yield 3;
    yield this.iris();
    this.setDay(8, 20);
    this.moveTo(town, 37, 26, Math.PI / 2);
    g.festivals.launchLanterns("red");
    for (const d of g.festivals.lanternData) d.t += 0.5;
    this.reveal();
    this.tune = "festivalSummer";
    g.music.refresh();
    yield 3.4;
    this.moveTo(town, 36, 52, 0);
    g.camFocus = { x: 40, y: 2, z: 54 };
    g.camTeleport();
    for (let i = 0; i < 4; i++) {
      g.sound("fireworkBurst");
      g.ctx.particles.burst("firework", [34 + i * 4, 11 + i % 2 * 3, 62], { colors: [["red", "sand", "white"], ["sky", "white", "cyan"], ["lime", "sand", "white"], ["plum", "orange", "sand"]][i] });
      yield 0.9;
    }
    g.camFocus = null;
    this.tune = null;
    yield this.iris();
    g.music.setOverride("bus");
    const bus2 = g.busPlace ??= new BusPlace(g);
    g.ctx.scene.add(bus2.group);
    bus2.setScene(g.season, g.calendarDay);
    g.swapPlace(bus2, 0, 0, 0);
    p.remove();
    bus2.bodyGroup.add(p.root);
    p.x = -1.2;
    p.z = -0.8;
    p.y = 0.86;
    p.facing = Math.PI / 2;
    p.sitting = true;
    p.play("Sit", 0);
    g.camFocus = { x: 0, y: 1.2, z: 0 };
    g.camTeleport();
    this.reveal();
    bus2.hester.play("Talk", 0.2);
    yield this.say("hester", "♪ Oh, you fished up an old boot and you sold it for ten, and you'd do it, you'd do it, you'd do it again… ♪", 3.8);
    g.ui.popAll();
    p.sitting = false;
    p.remove();
    bus2.group.add(p.root);
    yield this.iris();
    this.goDay(10, 21);
    g.sky.placeChanged();
    this.moveTo(g.city, 12, 11, 0);
    g.music.setOverride("cityNight");
    this.reveal();
    this.dest = { x: 26, z: 11, speed: 3.4 };
    yield 4;
    yield this.iris();
    const salon = g.rooms.get("salon");
    this.moveTo(salon, 4, 3.4, 0);
    this.reveal();
    g.music.setOverride("salon");
    g.sound("scissors");
    yield this.say("fleece", "Monsieur! Madame! Whichever! Your hair, it speaks to me, and it is begging.", 2.6);
    g.ui.popAll();
    yield this.iris();
    const auc = g.rooms.get("auction");
    this.moveTo(auc, 5, 5.2, Math.PI);
    this.reveal();
    g.music.setOverride("auction");
    p.play("Paddle", 0.05, { once: true });
    g.sound("paddle");
    yield this.say("pemberton", "Going-once-going-twice-do-I-hear-more-oh-you're-serious-SOLD!", 2.2);
    g.sound("gavel");
    g.ui.popAll();
    g.music.setOverride(null);
    yield this.iris();
    this.setDay(12, 13);
    this.moveTo(town, 25, 44, Math.PI);
    this.tune = "festivalAutumn";
    g.music.refresh();
    this.reveal();
    yield this.say("dorrit", "That's a soup, mmhm. That's the soup. I've waited my whole life.", 3);
    g.ui.popAll();
    yield this.iris();
    this.setDay(14, 11);
    this.tune = null;
    g.music.refresh();
    w.town.objects["26,30"] = { k: "snowman", ratio: 0.72, good: true };
    town.dirty.add("26,30");
    this.moveTo(town, 26, 33, Math.PI);
    this.reveal();
    p.play("Wave", 0.1, { once: true });
    yield 3;
    yield this.iris();
    this.setDay(16, 23.9);
    const [px, pz] = LANDMARKS.oldPear;
    w.flags.pearLit = true;
    town.seasonBuilt = -1;
    g.refreshSeason(true);
    this.moveTo(town, px + 0.5, pz + 4.6, Math.PI);
    g.camFocus = { x: px, y: 2.4, z: pz + 1 };
    g.camTeleport();
    this.tune = "festivalWinter";
    g.music.refresh();
    for (const [i, id] of ["dorrit", "tavi", "bartleby", "ottoline", "nib", "yolanda", "ozzie"].entries()) {
      const a = i / 7 * Math.PI * 2;
      const nn = g.npcs.get(id);
      nn.inside = false;
      nn.setPos(px + Math.cos(a) * 4, pz + 1 + Math.sin(a) * 4);
      g.npcs.syncVisibility(nn);
      nn.overrideClip = "Sway";
      nn.actor.faceToward(px, pz);
    }
    this.reveal();
    yield 5;
    for (const nn of g.npcs.all()) nn.overrideClip = null;
    g.camFocus = null;
    this.showLogo = true;
    this.tune = "title";
    g.music.refresh();
    yield 3.5;
    this.showLogo = false;
    g.world = newWorld(777 + ++this.loops, { demo: true });
    const nw = g.world;
    nw.player.name = "Pip";
    nw.player.look = { ...w.player.look };
    nw.player.tools = w.player.tools;
    nw.player.beans = 999999;
    nw.flags.shackRoof = true;
    nw.player.homeTier = 2;
    nw.museum.open = true;
    installWorld(g, nw);
    dailyRespawn(g);
    rebuildAllObjects(g.town);
    this.reveal();
  }
  drawHud(hud) {
    const g = this.g;
    if (g.mode !== "attract") return;
    if (this.showLogo) drawLogo(g, hud);
    const on = Math.floor(g.ctx.time * 1.6) % 2 === 0;
    panel(hud, 12, 12, 40, 16, { fill: "red", trim: "orange" });
    drawText(hud, 32, 17, "DEMO", { align: "center", color: "white" });
    if (on) {
      const text = g.opts.touchOnly ? "Controller or keyboard required" : "Press anything to play";
      const w = text.length * 6 + 14;
      panel(hud, 240 - w / 2, 244, w, 16, { fill: "navy", trim: "sky" });
      drawText(hud, 240, 249, text, { align: "center", color: "white" });
    }
  }
};

// src/dev/fingerprint.js
init_rng();
function fingerprintOf(g) {
  const w = g.world;
  if (!w) return "none";
  const p = g.player;
  const col2 = Object.keys(w.almanac.fish).length * 1e3 + Object.keys(w.almanac.bug).length;
  const s = `${w.clock.day}:${Math.round(w.clock.minute * 10)}:${p ? p.x.toFixed(3) : 0}:${p ? p.z.toFixed(3) : 0}:${w.player.beans}:${w.player.debt}:${col2}:${g.mode}`;
  return hash32(s).toString(36);
}

// src/game.js
init_visitUi();
init_town();

// src/dev/overlay.js
init_draw();
init_tiles();
var DevOverlay = class {
  constructor(g) {
    this.g = g;
    this.collision = false;
    this.nav = false;
    this.target = false;
    this.npc = false;
    this.engine = false;
  }
  draw(hud) {
    const g = this.g;
    if (!g.world) return;
    if (this.collision && g.place === g.town) {
      const p = g.player;
      for (let z = Math.floor(p.z) - 10; z <= Math.floor(p.z) + 10; z++) for (let x = Math.floor(p.x) - 10; x <= Math.floor(p.x) + 10; x++) {
        if (x < 0 || z < 0 || x >= COLS || z >= ROWS) continue;
        if (g.town.blocked(x + 0.5, z + 0.5)) {
          const s = g.project(x + 0.5, g.town.height(x + 0.5, z + 0.5), z + 0.5);
          if (s) hud.rect(s.x - 2, s.y - 2, 4, 4, "red");
        }
      }
    }
    if (this.nav) for (const n of g.npcs.all()) {
      if (!n.path || !n.actor.visible) continue;
      for (const pt of n.path) {
        const s = g.project(pt[0], g.town.height(pt[0], pt[2]) + 0.1, pt[2]);
        if (s) hud.rect(s.x - 1, s.y - 1, 3, 3, "lime");
      }
    }
    if (this.target && g.interact.target) {
      const t = g.interact.target;
      const s = g.project(t.x, 0.1, t.z);
      if (s) {
        hud.rect(s.x - 3, s.y - 3, 7, 7, "cyan");
        drawText(hud, s.x + 6, s.y - 3, t.act ?? "?", { color: "cyan", shadow: "ink" });
      }
    }
    if (this.npc) for (const n of g.npcs.all()) {
      if (!n.actor.visible) continue;
      const s = g.project(n.actor.x, n.actor.y + 2.2, n.actor.z);
      if (s) drawText(hud, s.x, s.y, `${n.id} ${n.state} ${n.timer.toFixed(0)}`, { align: "center", color: "lime", shadow: "ink" });
    }
    if (this.engine) {
      const st = g.engine.state();
      drawText(hud, 6, 256, `fps ${g.engine.fps.toFixed(0)} ${st.backend} ${st.look ?? ""} ${g.status()}`, { color: "lime", shadow: "ink" });
    }
  }
};

// src/game.js
init_patterns();
init_items();
init_gameDefaults();
var { Vector3: Vector38 } = engine_exports.THREE;
var SETTINGS_KEY = "honk:settings";
var HonkGame = class {
  name = "Honk If You Owe";
  constructor(opts = {}) {
    this.opts = opts;
    this.mode = "boot";
    this.target = new Vector38();
    this.camState = { yaw: 45, zoom: tuning.cameraZoom, yawT: 45, zoomT: tuning.cameraZoom, applied: "" };
    this.idleTime = 0;
    this.noInput = 0;
    this.lastMinute = -1;
    this.lastHour = -1;
    this.realNow = opts.realNow ?? null;
    this.season = 1;
    this.calendarDay = 1;
    this.frozenOverride = false;
    this.windNow = 1.2;
    this.camFocus = null;
    this.fixedCam = false;
    this.noclip = false;
    this.events = new Events();
    this.settings = { ...DEFAULT_SETTINGS, ...store.get(SETTINGS_KEY) ?? {} };
    loadTuning();
  }
  get cal() {
    return calendar(this.world, this.realNow);
  }
  absMinute() {
    return absMinute(this.world);
  }
  saveSettings() {
    store.set(SETTINGS_KEY, this.settings);
  }
  sound(name, opts) {
    return this.ctx?.audio.play(name, opts);
  }
  rumble(strong = 0.5, ms = 120) {
    if (!this.settings.rumble) return;
    this.rumbles = (this.rumbles ?? 0) + 1;
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) p?.vibrationActuator?.playEffect?.("dual-rumble", { duration: ms, strongMagnitude: strong, weakMagnitude: strong * 0.6 }).catch?.(() => {
    });
  }
  async setup(ctx) {
    this.ctx = ctx;
    this.engine = ctx.engine;
    const input = ctx.input;
    input.gamepadButtons = PAD_BUTTONS;
    for (const k of ["Tab", "F1", "F2", "F3", "Escape", "Backspace", "Slash"]) input.preventKeys.add(k);
    installTextures();
    await (0, engine_exports.loadPack)("packs/kenney-furniture.json", { into: MODELS });
    await (0, engine_exports.loadPack)("packs/kenney-nature.json", { into: MODELS });
    if (!store.has("pixel-engine:audio")) ctx.audio.setVolume("music", DEFAULT_MUSIC);
    this.wrapResetVolumes();
    for (const [n, d] of Object.entries(SFX_DEFS)) ctx.audio.register(n, d);
    for (const [n, d] of Object.entries(LOOP_DEFS)) ctx.audio.register(n, d);
    this.inp = new GameInput();
    this.voice = new VoicePlayer(this);
    this.voice.install(ctx.audio);
    this.music = new MusicDirector(this);
    this.ambience = new Ambience(this);
    this.ui = new UI(this);
    this.scripts = new Scripts(this);
    this.interact = new Interact(this);
    listenForErrands(this);
    this.overlay = new DevOverlay(this);
    this.cosmetic = ctx.random.fork("cosmetic");
    this.world = newWorld(hash32("title-diorama"), { demo: true });
    this.world.clock.minute = 9.5 * 60;
    this.world.clock.day = 5;
    this.world.player.tools = ["net", "rod", "shovel", "axe", "can", "slingshot"];
    this.demo = true;
    this.demoStack = null;
    this.town = new TownPlace(this);
    this.city = new CityPlace(this);
    this.rooms = new RoomPlaces(this);
    this.place = this.town;
    ctx.scene.add(this.town.group, this.city.group);
    this.city.group.visible = false;
    this.player = new Player(this);
    this.player.addTo(this.town.group);
    this.player.x = 24;
    this.player.z = 30;
    this.camFocus = { x: 24, y: 1, z: 40 };
    this.sky = new Sky(this);
    this.npcs = new NpcManager(this);
    this.life = new Life(this);
    this.festivals = new Festivals(this);
    this.attract = new AttractMode(this);
    this.refreshSeason(true);
    this.npcs.buildAll();
    dailyRespawn(this);
    rebuildAllObjects(this.town);
    this.life.resetDay();
    this.festivals.resetDay();
    this.mode = "title";
    this.ui.push(titleScreen(this));
    this.camTeleport();
  }
  wrapResetVolumes() {
    const audio = this.ctx.audio;
    const orig = audio.resetVolumes.bind(audio);
    audio.resetVolumes = () => {
      orig();
      audio.setVolume("music", DEFAULT_MUSIC);
    };
  }
  ready(ctx) {
    if (typeof window !== "undefined") window.__GAME__ = this.handle();
  }
  handle() {
    const g = this;
    return {
      g,
      get world() {
        return g.world;
      },
      ui: { model: () => g.ui.model() },
      tuning,
      status: () => this.statusObject(),
      fingerprint: () => fingerprintOf(g),
      engine: this.engine,
      visit: visitHandle(g),
      devLineup: () => Promise.resolve().then(() => (init_dev(), dev_exports)).then((m) => m.toggleLineup(g)),
      actions: {
        newGame: (mode = "village") => startNewGame(g, mode),
        continueGame: () => continueGame(g),
        /** Straight into free play on a fresh world: for tools and screenshots. */
        quickStart: (o = {}) => {
          const w = newWorld(o.seed ?? 42, { mode: o.mode ?? "village" });
          g.ui.popAll();
          g.mode = "play";
          g.demo = !!o.demo;
          g.camFocus = null;
          w.player.name = o.name ?? "Pip";
          w.player.town = o.town ?? "Far Enough";
          w.flags.shackRoof = true;
          w.story.stage = "free";
          w.museum.open = true;
          w.clock.day = o.day ?? 2;
          w.clock.daysPlayed = w.clock.day;
          w.clock.minute = (o.hour ?? 10) * 60;
          w.player.tools = o.tools ?? ["net", "rod", "shovel", "axe", "can", "slingshot"];
          w.player.beans = o.beans ?? 5e3;
          g.place.group.visible = false;
          g.place.leave?.(g);
          g.player.remove();
          g.place = g.town;
          g.town.group.visible = true;
          g.player.addTo(g.town.group);
          installWorld(g, w);
          dailyRespawn(g);
          rebuildAllObjects(g.town);
          g.swapPlace(g.town, o.x ?? 24, o.z ?? 31, 0);
        },
        goto: (placeId, x, z, facing = 0) => g.swapPlace(placeId === "town" ? g.town : placeId === "city" ? g.city : g.rooms.get(placeId), x, z, facing),
        // (tools only) Visit: real transports, no typing. The title's menus use the same calls.
        setDay: (day, hour = 10) => {
          const w = g.world;
          while (w.clock.day < day) {
            w.clock.minute = 300;
            g.newDay();
          }
          w.clock.minute = hour * 60;
          g.weatherKey = null;
          g.lastHour = -1;
          g.refreshSeason(true);
          g.sky.placeChanged();
          g.life.placeSpecials();
          g.festivals.resetDay();
          g.npcs.scatter();
        }
      }
    };
  }
  statusObject() {
    const w = this.world;
    return { mode: this.mode, day: w.clock.day, hour: hourNow(w), minute: w.clock.minute, place: this.place?.id, beans: w.player.beans, debt: w.player.debt, x: this.player?.x, z: this.player?.z };
  }
  status() {
    const s = this.statusObject();
    return `${s.mode} day ${s.day} ${Math.floor(s.minute / 60)}:${String(Math.floor(s.minute % 60)).padStart(2, "0")} ${s.place} beans ${s.beans} debt ${s.debt}`;
  }
  fingerprint() {
    return fingerprintOf(this);
  }
  canAct() {
    return this.mode === "play" && !this.ui.blocking && !this.scripts.holding && !this.inTransition;
  }
  get frozen() {
    return this.mode !== "play" && this.mode !== "attract" ? false : (this.ui.blocking || this.scripts.holding) && this.world.clock.mode !== "real";
  }
  fixedUpdate(ctx, dt) {
    if (this.mode === "boot") return;
    if (this.mode === "play") {
      this.player.fixedStep(dt);
      if (!this.frozen && !this.inTransition) {
        if (!this.timeFrozen) advanceClock(this, dt);
        this.life.fixedStep(dt);
        this.npcs.fixedStep(dt);
        this.festivals.fixedStep(dt);
      }
    } else if (this.mode === "attract") {
      this.attract.fixedStep(dt);
      this.npcs.fixedStep(dt);
      this.life.fixedStep(dt);
    } else if (this.mode === "title") {
      this.npcs.fixedStep(dt);
      this.life.fixedStep(dt);
    }
  }
  update(ctx, dt) {
    if (this.mode === "boot") return;
    this.inp.begin(ctx, dt);
    this.readCommands(ctx);
    if (this.inp.any) {
      this.idleTime = 0;
      this.noInput = 0;
    } else {
      this.idleTime += dt;
      this.noInput += dt;
    }
    if (this.mode === "play" && this.player.speed > 0.1) this.idleTime = 0;
    const wasBlocked = this.ui.blocking || this.scripts.holding;
    this.scripts.update(dt);
    this.ui.update(dt);
    if (this.mode === "attract") this.attract.update(dt);
    if (this.mode === "title") this.updateTitle(dt);
    if (this.mode === "play") {
      if (this.canAct() && !wasBlocked) worldInput(this, dt);
      else if (!this.canAct()) this.interact.clear();
    }
    const w = this.world;
    const hour = hourNow(w);
    if (hour !== this.lastHour) {
      const first = this.lastHour === -1;
      this.lastHour = hour;
      if (!first) onHourChange(this, hour);
      this.music.refresh();
    }
    if (this.world.clock.day !== this.seenDay && !this.seenDayHold) {
      this.seenDay = this.world.clock.day;
      if (this.mode === "play") turnThePage(this);
    }
    this.place?.update?.(dt, ctx.time);
    this.sky.update(dt);
    this.player.presentation(dt);
    this.npcs.presentation(dt);
    if (this.actorOverride) for (const a of Object.values(this.actorOverride)) a.update(dt);
    this.life.presentation(dt);
    this.festivals.presentation(dt);
    if (this.town.dirty.size) syncObjects(this.town);
    this.updateCamera(dt);
    if (this.place === this.town || this.place === this.city) updateOccluders(this);
    this.net?.update(dt);
    this.ambience.update(dt);
    this.music.update(dt);
    this.drawHud(ctx, dt);
  }
  updateTitle(dt) {
    this.titleDrift = (this.titleDrift ?? 0) + dt;
    const t = this.titleDrift * 0.03;
    this.camFocus = { x: 24 + Math.sin(t) * 16, y: 1, z: 40 + Math.cos(t * 1.3) * 8 };
    const top = this.ui.top;
    if (top?.isTitle && this.noInput >= 10) this.attract.start();
  }
  readCommands(ctx) {
    for (const c2 of ctx.input.commands) {
      if (!c2) continue;
      if (c2.t === "now") this.realNow = c2.ms;
      if (c2.t === "loadSave") this.pendingLoad = c2.world;
    }
  }
  drawHud(ctx, dt) {
    const hud = ctx.hud;
    hud.clear();
    if (this.mode === "play" && !this.hideHud) {
      const idle = this.idleTime > 6 && !this.ui.blocking;
      this.ui.hudAlpha = idle ? 0 : 1;
      if (!this.ui.has("placement") && !this.ui.has("credits") && !this.ui.has("stargaze")) {
        drawWorldHud(this, hud, dt);
        this.interact.drawPrompts(hud);
      }
    }
    this.life.drawHud(hud);
    this.festivals.drawHud(hud);
    this.ui.draw(hud);
    this.drawReveal?.(hud);
    this.attract.drawHud(hud);
    this.overlay.draw(hud);
    const m = this.inp.mouse;
    if (this.inp.device === "kbm" && m.seen && m.over) hud.sprite(m.x, m.y, CURSOR, CURSOR_COL, { shadow: false });
  }
  // ---- Camera ------------------------------------------------------------------------------------
  cameraTarget() {
    if (this.camFocus) return this.target.set(this.camFocus.x + this.place.ox, this.camFocus.y, this.camFocus.z + this.place.oz);
    const p = this.player;
    return this.target.set(p.x + this.place.ox, p.y + 0.9, p.z + this.place.oz);
  }
  camTeleport() {
    this.ctx.camera.teleport(this.cameraTarget());
  }
  /** A scene that flew the camera gives it back: the usual view, right where it belongs. */
  releaseFixedCam() {
    if (!this.fixedCam) return;
    this.fixedCam = false;
    this.camState.applied = "";
    this.updateCamera(0);
    this.camTeleport();
  }
  updateCamera(dt) {
    const c2 = this.camState;
    if (this.fixedCam) return;
    const rate = 1 - Math.exp(-dt * 9);
    c2.yaw += (c2.yawT - c2.yaw) * rate;
    if (Math.abs(c2.yaw - c2.yawT) < 0.05) c2.yaw = c2.yawT;
    const baseZoom = this.place?.kind === "room" ? this.place.camZoom ?? 1.8 : tuning.cameraZoom;
    const talking = this.ui.has("dialogue");
    let zoomT = (c2.zoomOverride ?? baseZoom) * (talking ? 1.25 : 1);
    if (this.mode === "title") zoomT = c2.zoomOverride ?? 1.15;
    if (this.mode === "attract") zoomT = c2.zoomOverride ?? 1.6;
    c2.zoomT = zoomT;
    c2.zoom += (c2.zoomT - c2.zoom) * (1 - Math.exp(-dt * 5));
    if (Math.abs(c2.zoom - c2.zoomT) < 2e-3) c2.zoom = c2.zoomT;
    const key2 = `${c2.yaw.toFixed(2)}:${c2.zoom.toFixed(3)}`;
    if (key2 !== c2.applied) {
      c2.applied = key2;
      this.engine.setCamera({ preset: "iso", yaw: c2.yaw, pitch: 35, zoom: c2.zoom, minZoom: c2.zoom, maxZoom: c2.zoom }, { syncUrl: false });
    }
  }
  turnCamera(dir3) {
    if (this.place?.kind === "room") {
      this.sound("uiError");
      return;
    }
    this.camState.yawT += dir3 * 90;
    this.sound("camera");
  }
  zoomStep(dir3) {
    const c2 = this.camState;
    const cur = c2.zoomOverride ?? tuning.cameraZoom;
    c2.zoomOverride = Math.max(1.2, Math.min(2.4, cur + dir3 * 0.2));
  }
  // ---- Season --------------------------------------------------------------------------------------
  refreshSeason(force = false) {
    const c2 = this.cal;
    const changed = force || c2.season !== this.season || c2.calendarDay !== this.calendarDay;
    this.season = c2.season;
    this.calendarDay = c2.calendarDay;
    if (changed) this.town.setSeason(c2.season, c2.calendarDay);
    this.sky.setSeason(c2.season);
    syncObjects(this.town);
  }
  // ---- Places --------------------------------------------------------------------------------------
  swapPlace(next, x, z, facing = 0) {
    const old = this.place;
    if (old !== next) {
      old.leave?.(this);
      old.group.visible = next.keepVisible?.(old) ?? false;
      if (old === this.town) this.town.releaseLights();
      this.player.remove();
      this.place = next;
      this.ctx.scene.add(next.group);
      next.group.visible = true;
      this.player.addTo(next.group);
      next.enter?.(this);
    }
    this.player.x = x;
    this.player.z = z;
    this.player.y = next.height(x, z);
    this.player.facing = facing;
    this.player.turnTo = null;
    this.player.cancelWalk();
    next.unstickPlayer?.();
    const w = this.world.player;
    w.place = next.id;
    w.x = this.player.x;
    w.z = this.player.z;
    w.facing = facing;
    this.camFocus = null;
    this.camState.zoomOverride = void 0;
    if (next.kind === "room") {
      this.camState.yawT = 45;
      this.camState.yaw = 45;
    }
    this.camState.applied = "";
    this.updateCamera(1);
    this.camTeleport();
    this.sky.placeChanged();
    this.music.refresh();
    this.npcs.placeChanged();
    this.life.placeChanged();
    this.autosave();
  }
  /** Move between places under an iris. Use from a script: `yield* g.travel(...)`. */
  *travel(next, x, z, facing = 0, { kind = "iris", duration = 0.35, sound = "doorOpen" } = {}) {
    if (sound) this.sound(sound);
    this.inTransition = true;
    const center = new Vector38(this.player.x + this.place.ox, this.player.y + 1, this.player.z + this.place.oz);
    this.engine.screen.cover(kind, { center, duration });
    yield duration + 0.05;
    this.swapPlace(next, x, z, facing);
    this.engine.screen.reveal(kind, { duration, center: new Vector38(x + next.ox, next.height(x, z) + 1, z + next.oz) });
    yield duration * 0.6;
    this.inTransition = false;
  }
  autosave() {
    if (this.mode !== "play" || this.demo || this.world.story.stage === "new") return;
    this.world.meta.lastSeenMs = this.realNow ?? this.world.meta.lastSeenMs;
    saveWorld(this.world);
  }
  baseLook() {
    return engine_exports.LOOK_PRESETS.none;
  }
  /** World point → art pixels, for bubbles and chevrons. */
  project(x, y, z) {
    const cam = this.ctx.camera.camera;
    this.tmpV ??= new Vector38();
    this.tmpV.set(x + this.place.ox, y, z + this.place.oz).project(cam);
    if (this.tmpV.z > 1) return null;
    return { x: Math.round((this.tmpV.x + 1) * 240), y: Math.round((1 - this.tmpV.y) * 135) };
  }
  patternTexture(slot) {
    return makePatternTexture(this.world.patterns[slot]);
  }
  applyPatternShirt(actor, slot) {
    const data = this.world.patterns[slot];
    const mat = data ? patternMaterial(data) : null;
    if (!mat) return;
    const hex = engine_exports.PALETTE[ITEMS[this.world.player.look.outfit]?.shirt ?? "blue"];
    actor.swapMaterial(hex, mat);
  }
  patternMaterialFor(slot) {
    return this.world.patterns[slot] ? patternMaterial(this.world.patterns[slot]) : null;
  }
  isNight() {
    return (this.sky?.night ?? 0) > 0.35;
  }
  day1Lines() {
    return day1Lines(this);
  }
  newDay() {
    newDay(this);
  }
  openPlacement(i) {
    this.ui.push(placementScreen(this, i));
  }
  quitToTitle() {
    if (this.net) this.net.leave();
    quitToTitle(this);
  }
  /** A guest arrives by bus in the host's town: a temporary world, not their own save. */
  visitArrive(world) {
    this.ui.popAll();
    this.mode = "play";
    this.demo = true;
    this.camFocus = null;
    this.place.group.visible = false;
    this.place.leave?.(this);
    this.player.remove();
    this.place = this.town;
    this.town.group.visible = true;
    this.player.addTo(this.town.group);
    installWorld(this, world);
    rebuildAllObjects(this.town);
    this.swapPlace(this.town, LANDMARKS.busStop[0], LANDMARKS.busStop[1] + 0.3, 0);
  }
  goTitleFromVisit() {
    this.ui.popAll();
    this.scripts.cancelAll();
    this.goTitle();
  }
  /** Back to the live diorama on a throwaway world. */
  goTitle() {
    const w = newWorld(hash32("title-diorama"), { demo: true });
    w.clock.minute = 9.5 * 60;
    w.clock.day = 5;
    w.player.tools = ["net", "rod", "shovel", "axe", "can", "slingshot"];
    this.mode = "title";
    this.demo = true;
    this.place.group.visible = false;
    this.place.leave?.(this);
    this.player.remove();
    this.place = this.town;
    this.town.group.visible = true;
    this.player.addTo(this.town.group);
    installWorld(this, w);
    dailyRespawn(this);
    rebuildAllObjects(this.town);
    this.player.x = 24;
    this.player.z = 30;
    this.camState.zoomOverride = void 0;
    this.camState.yawT = 45;
    this.camState.yaw = 45;
    this.camState.applied = "";
    this.titleDrift = 0;
    this.noInput = 0;
    this.camFocus = { x: 24, y: 1, z: 40 };
    this.updateCamera(1);
    this.camTeleport();
    this.music.refresh();
    this.ui.push(titleScreen(this));
  }
  actorOf(id) {
    return id === "player" ? this.player : this.actorOverride?.[id] ?? this.npcs.actor(id) ?? this.place?.hostActor?.(id) ?? (id === "trundle" ? this.life.trundle : id === "rind" ? this.life.rind : id === "vesper" ? this.life.vesper : id === "hester" ? this.busPlace?.hester : null) ?? null;
  }
  actorEmote(id, clip2) {
    const a = this.actorOf(id);
    if (a) a.play(clip2, 0.1, { once: true });
  }
  footstep() {
    const p = this.player;
    const surface = this.place?.surfaceAt?.(p.x, p.z);
    if (surface) this.sound(surface, { volume: p.speed < 2 ? 0.4 : 0.8 });
    this.life.onStep?.(p.x, p.z);
  }
  dust(x, y, z) {
    this.ctx.particles.burst("dust", [x + this.place.ox, y + 0.05, z + this.place.oz], { count: 2 });
  }
};
var CURSOR = ["#.......", "##......", "#o#.....", "#oo#....", "#ooo#...", "#oooo#..", "#ooooo#.", "#oo###..", "#o#.....", "##......"];
var CURSOR_COL = { "#": "ink", o: "white" };
var createGame = (opts) => new HonkGame(opts);

// src/main.js
var touchOnly = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 && !matchMedia("(any-pointer: fine)").matches;
function failure(message) {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1c2c;color:#f4f4f4;font:20px monospace;text-align:center;padding:24px";
  el.textContent = message;
  el.id = "no-webgpu";
  document.body.appendChild(el);
}
async function start() {
  const hub = globalThis.AIHub;
  if (hub?.active) {
    const { startRound: startRound2 } = await Promise.resolve().then(() => (init_hubStart(), hubStart_exports));
    const started = await startRound2(hub, { touchOnly });
    if (started) return;
  }
  const realNow = Date.now();
  const game = createGame({ touchOnly, realNow });
  window.addEventListener("keydown", (e) => {
    if (e.target?.tagName === "TEXTAREA") return;
    if (e.key === "Tab" || e.key === "Escape" || e.key === "Backspace") e.preventDefault();
    window.__PIXEL_ENGINE__?.input.send({ t: "key", key: e.key });
  });
  window.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("pointerdown", () => window.__PIXEL_ENGINE__?.input.send({ t: "tap" }));
  try {
    const engine = await engine_exports.Engine.start(game, (0, engine_exports.withUrlOptions)({
      container: document.getElementById("app"),
      aspect: "fixed",
      quality: "high",
      camera: { preset: "iso", yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 },
      settings: { button: touchOnly ? "top-right" : false, key: "honk-if-you-owe" },
      touch: false,
      touchBar: false,
      background: engine_exports.PALETTE.ink
    }));
    setInterval(() => engine.input.send({ t: "now", ms: Date.now() }), 2e4);
    engine.input.send({ t: "now", ms: Date.now() });
    window.addEventListener("beforeunload", () => {
      game.autosave?.();
    });
  } catch (err) {
    console.warn(err);
    failure(`Honk If You Owe needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows. (${err?.message ?? err})`);
  }
}
if (typeof document !== "undefined") start();
