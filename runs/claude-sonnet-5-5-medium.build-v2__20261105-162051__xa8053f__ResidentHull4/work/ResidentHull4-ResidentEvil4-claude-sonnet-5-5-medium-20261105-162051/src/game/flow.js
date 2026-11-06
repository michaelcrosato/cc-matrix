// Scene flow glue: pause, case, shop, saving, checkpoints, chapter end, title. Installs methods on Area and app.
import { app } from '../core/app.js';
import { Run, CHAPTERS } from '../core/run.js';
import { Area } from './area.js';
import { TitleScene } from '../screens/title.js';
import { CaseScreen } from '../screens/caseScreen.js';
import { ShopScreen, shopStock } from '../screens/shopScreen.js';
import { PauseScreen, TelegraphScreen, ClaimForm, DeniedScreen, claimGrade } from '../screens/menus.js';
import { saveGame, loadGame } from '../core/save.js';
import { byId, LEVELS } from '../data/levels/index.js';
import { TUNING } from '../data/tuning.js';
import { loadKey } from '../core/store.js';
import { Launch } from './launch.js';
export const makeGame = (def, o) => (def.launch ? new Launch(o) : new Area(def, o));

const P = Area.prototype;
P.openPause = function () { if (app.attract || this.opts.noPause) return; if (app.hub) { app.push(new app.SettingsOverlay()); return; } app.push(new PauseScreen()); };
P.openCase = function (tab, pending) { if (app.hub && !this.opts.shift) return; app.push(new CaseScreen({ tab, pending })); };
P.openShop = function () { app.push(new ShopScreen(shopStock(this.def.chapter ?? 0))); app.mix?.play('shop'); this.audio('bubbles'); };
P.onShopClosed = function () { app.mix?.play(this.def.music); };
P.openTelegraph = function (spot) { app.push(new TelegraphScreen(spot)); app.mix?.play('safe'); this.audio('telegraph'); };
P.openDenied = function () { app.push(new DeniedScreen()); };
P.isSafe = function () { return !this.enemies.some((e) => !e.dead && e.awake) && (this.level.markers.t || []).some((m) => Math.hypot(m.x - this.player.x, m.z - this.player.z) < 14) || this.def.safeAll === true; };
P.dropFromCase = function (e) {
  const p = this.player; const x = p.x + Math.sin(p.yaw) * 1.2, z = p.z + Math.cos(p.yaw) * 1.2;
  this.dropPickup(e.kind === 'weapon' ? { kind: 'weapon', id: e.id } : { kind: 'item', id: e.id, count: e.count ?? 1 }, x, z);
  if (e.kind === 'weapon' && this.run.equipped === e.id) { this.run.equipped = 'pistol'; this.player.equip('pistol'); }
};
P.finishPendingPickup = function (pk) { if (pk.mesh) pk.mesh.removeFromParent(); const i = this.pickups.indexOf(pk); if (i >= 0) this.pickups.splice(i, 1); };
P.autosave = function (spot) {
  if (app.attract || app.hub || this.opts.shift || this.opts.noSave) return;
  const entry = spot || { x: this.player.x, z: this.player.z };
  app.checkpoint = { run: this.run.serialize(), areaId: this.def.id, flags: [...this.flags], entry };
};
P.saveCheckpoint = function (spot) {
  if (app.hub || this.opts.shift) return false;
  this.autosave(spot ? { x: spot.x, z: spot.z + 1.2 } : undefined);
  return saveGame({ ...app.checkpoint });
};
P.restartFromCheckpoint = async function () {
  if (app.attract) return;
  const c = app.checkpoint || loadGame();
  if (!c) { return app.go(makeGame(this.def, { run: new Run(this.run.difficulty) })); }
  const run = Run.from(JSON.parse(JSON.stringify(c.run)));
  run.hp = run.maxHp; run.areaFlags = { ...(run.areaFlags || {}), [c.areaId]: c.flags };
  const def = byId(c.areaId) || this.def;
  app.run = run; await app.go(makeGame(def, { run, entry: c.entry, restart: true }));
};
P.quitToTitle = async function () { app.run = null; await app.go(new TitleScene()); };
/** End of a chapter or area: Claim Form (if asked), autosave, load the next area. */
P.finishArea = function* (o) {
  const run = this.run, s = run.stats, b = run.areaStart;
  if (o.claim !== false) {
    const shots = s.shots - b.shots, hits = s.hits - b.hits;
    const form = { title: o.title || CHAPTERS[this.def.chapter ?? 0], time: s.time - b.time, accuracy: shots ? hits / shots : 0, heads: s.heads - b.heads, kicks: s.kicks - b.kicks, deductions: s.deductions - b.deductions, deaths: s.deaths };
    form.grade = claimGrade(form); form.bonus = form.grade === 'APPROVED' ? 1000 : form.grade === 'PENDING' ? 500 : 200; run.doubloons += form.bonus;
    let done = false; form.onDone = () => { done = true; };
    app.push(new ClaimForm(form)); yield () => done;
  }
  this.ended = true;
  if (o.next) { const def = byId(o.next); run.areaId = o.next; run.chapter = def?.chapter ?? run.chapter; if (!this.opts.noAdvance) yield* this.loadNext(def, o.entry); }
};
P.loadNext = function* (def, entry) {
  let ok = false; const run = this.run;
  const a = makeGame(def, { run, entry }); app.botFactory?.(a); app.go(a).then(() => { ok = true; }).catch((err) => { this.scriptError(err); ok = true; });
  yield () => ok;
};
