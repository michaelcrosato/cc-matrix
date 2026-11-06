// The persistent state of one playthrough: everything that survives a level load. Plain data.
import { CaseGrid, CASE_SIZES, makeItem } from '../game/caseModel.js';
import { ITEMS, TREASURE, KEY_ITEMS, RELIQUARY_SOCKETS } from '../data/items.js';
import { statsOf, WEAPON_ORDER, TUNE_STAT_IDS } from '../data/weapons.js';
import { DIFFICULTY, TUNING } from '../data/tuning.js';

const freshStats = () => ({ time: 0, shots: 0, hits: 0, heads: 0, kicks: 0, deductions: 0, deaths: 0, kills: 0 });

export class Run {
  difficulty = 'standard';
  chapter = 1;
  area = 'quay';
  entry = null;
  health = 100;
  maxHealth = 100;
  dameHealth = 100;
  dameWith = false;
  deductions = 0;
  money = 0;
  equipped = 'pistol';
  grenade = null;
  weapons = { pistol: { mag: 12, tune: {} } };
  case = new CaseGrid(10, 6);
  caseLevel = 0;
  valuables = {};
  keys = [];
  notes = [];
  tannoys = [];
  tannoyPrizes = [];
  flags = {};
  areaFlags = {}; // per area: killed set-pieces, doors, picked items
  stats = freshStats();
  totals = freshStats();
  rank = 2;
  deathsThisChapter = 0;
  noDamageStreak = 0;
  checkpoint = null;

  constructor() {
    this.case.add(makeItem('pistol'));
    this.case.addStack('ammoPistol', 15);
    this.case.add(makeItem('samphire'));
  }

  get diff() { return DIFFICULTY[this.difficulty]; }
  flag(k) { return !!this.flags[k]; }
  setFlag(k, v = true) { this.flags[k] = v; }

  weaponStats(id = this.equipped) { return statsOf(id, this.weapons[id]); }
  ownsWeapon(id) { return !!this.weapons[id]; }
  ownedWeapons() { return WEAPON_ORDER.filter((w) => this.weapons[w]); }

  giveTreasure(id, n = 1) { this.valuables[id] = (this.valuables[id] ?? 0) + n; }
  giveKey(id) { if (!this.keys.includes(id)) this.keys.push(id); }
  hasKey(id) { return this.keys.includes(id); }

  /** Pick up a Case item; false means no room. */
  giveItem(id, qty = 1) {
    const d = ITEMS[id];
    if (d.max) return this.case.addStack(id, qty) === 0;
    for (let i = 0; i < qty; i++) if (!this.case.add(makeItem(id))) return false;
    return true;
  }

  /** Reliquary sockets: fill from a valuable. */
  socket(gem) {
    if (!RELIQUARY_SOCKETS.includes(gem)) return false;
    if (!this.valuables.reliquary || !this.valuables[gem]) return false;
    this.reliquaryFilled ??= [];
    if (this.reliquaryFilled.includes(gem)) return false;
    this.valuables[gem]--;
    if (!this.valuables[gem]) delete this.valuables[gem];
    this.reliquaryFilled.push(gem);
    if (this.reliquaryFilled.length === 3) {
      this.valuables.reliquary--;
      if (!this.valuables.reliquary) delete this.valuables.reliquary;
      this.giveTreasure('reliquaryFull');
      this.reliquaryFilled = [];
    }
    return true;
  }

  upgradeCase() {
    if (this.caseLevel >= CASE_SIZES.length - 1) return false;
    this.caseLevel++;
    const [w, h] = CASE_SIZES[this.caseLevel];
    this.case.resize(w, h);
    return true;
  }

  /** New weapon bought or found. Footprint check is the caller's. */
  addWeapon(id) {
    if (this.weapons[id]) return;
    this.weapons[id] = { mag: statsOf(id, { tune: {} }).mag, tune: {} };
  }
  removeWeapon(id) {
    delete this.weapons[id];
    if (this.equipped === id) this.equipped = this.ownedWeapons()[0] ?? 'pistol';
  }
  tuneLevel(id, stat) { return this.weapons[id]?.tune[stat] ?? 0; }

  /** Adaptive rank, hidden 1-5. */
  rankUp() { this.rank = Math.min(5, this.rank + 1); }
  rankDown() { this.rank = Math.max(1, this.rank - 1); }
  get tokens() { return Math.max(1, Math.round(TUNING.attackTokens) + this.diff.tokens + (this.rank >= 4 ? 1 : this.rank <= 1 ? -1 : 0)); }
  get windupBonus() { return (this.rank >= 4 ? -0.1 : this.rank <= 1 ? 0.1 : 0); }
  /** Rank moves the gaps between waves too: more room after a death, less on a long clean streak. */
  get waveInterval() { return this.rank >= 4 ? 0.8 : this.rank <= 1 ? 1.4 : 1; }

  areaData(id) {
    const d = this.areaFlags[id] ?? (this.areaFlags[id] = { beats: {}, doors: [], chests: [], crates: [], picked: [], gates: [] });
    return d;
  }

  /** A stable order for the 15 Tannoy lines. */
  tannoyIndex(key) {
    this.tannoyOrder ??= [];
    let i = this.tannoyOrder.indexOf(key);
    if (i < 0) { i = this.tannoyOrder.length; this.tannoyOrder.push(key); }
    return i % 15;
  }

  resetChapterStats() { this.stats = freshStats(); this.deathsThisChapter = 0; }

  /** A deep copy as plain data: a checkpoint must never see what happens after it. */
  toJSON() {
    const { case: grid, checkpoint, ...rest } = this;
    return JSON.parse(JSON.stringify({ ...rest, case: grid.toJSON() }));
  }
  static from(data) {
    const r = new Run();
    const { case: grid, ...rest } = JSON.parse(JSON.stringify(data));
    Object.assign(r, rest);
    r.case = CaseGrid.from(grid);
    return r;
  }
}
