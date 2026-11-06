// The bed: it saves, and offers sleep, naps, and hibernation (with a scolding).
import { say } from '../../systems/say.js';
import { menuChoiceFree } from './numbers.js';
import { HOSTS } from '../../data/dialogue/hosts.js';
import { villageDay, SEASON_NAMES } from '../../core/calendar.js';
import { saveNow, markSessionClean } from '../../systems/session.js';
import { hostLine } from '../../systems/lines.js';
import { panel, drawText } from '../draw.js';
import { tuning } from '../../dev/tuning.js';
import { newDay } from '../../systems/flow.js';
import { deliverMail } from '../../systems/mail.js';

/** Move the clock forward to a target day and minute, running each night. */
export function advanceTo(g, targetDay, minute) {
  const w = g.world;
  while (w.clock.day < targetDay) { w.clock.minute = 5 * 60; newDay(g); }
  w.clock.minute = minute;
  if (minute >= 9 * 60) deliverMail(g);
}
class AlmanacPage {
  constructor(title, sub, onDone, seasonSting) { this.id = 'seasonPage'; this.title = title; this.sub = sub; this.onDone = onDone; this.t = 0; this.seasonSting = seasonSting; }
  currentText() { return this.title; }
  open(g) { g.sound('almanacTurn'); if (this.seasonSting) g.sound(this.seasonSting); }
  update(g, inp, dt) {
    this.t += dt;
    if (this.t > 0.6 && !this.done) { this.done = true; this.onDone?.(); }
    if (this.t > 1.2 && (inp.confirm || inp.back || inp.mouse.click) || this.t > 3.4) g.ui.pop(this);
  }
  prompts() { return null; }
  draw(g, hud) {
    const w = Math.min(480, Math.round(this.t * 1400));
    hud.rect(0, 0, w, 270, 'white');
    hud.rect(w, 0, 3, 270, 'mist');
    if (this.t > 0.32) {
      drawText(hud, 240, 104, this.title, { align: 'center', color: 'ink', scale: 3 });
      drawText(hud, 240, 138, this.sub, { align: 'center', color: 'slate' });
    }
  }
}
const TURN_LINES = { 0: 'Everything is starting again. It would like you to know.', 1: 'The cicadas have been told.', 2: 'It all goes a nice colour, and then it all goes.', 3: 'Everything is under something.' };
/** A new day arrived while you stood there. A new season gets the page. */
export function turnThePage(g) {
  const c = villageDay(g.world.clock.day);
  const season = g.cal.season;
  if (season === g.season) { g.refreshSeason(); return; }
  g.ui.push(new AlmanacPage(SEASON_NAMES[season], TURN_LINES[season], () => g.refreshSeason(true), `sting_${['spring', 'summer', 'autumn', 'winter'][season]}`));
  return c;
}
export function* sleepTo(g, kind) {
  const w = g.world;
  const c0 = villageDay(w.clock.day);
  saveNow(g);
  markSessionClean(g);
  g.player.play('Sleep', 0.2);
  g.music.setOverride('lullaby');
  g.engine.screen.cover('fade', { duration: 0.8 });
  g.events.emit('sleep', { kind });
  yield 0.9;
  w.stats.sleeps += 1;
  g.seenDayHold = true;
  if (kind === 'morning') {
    const nextDay = w.clock.minute >= 5 * 60 ? w.clock.day + 1 : w.clock.day;
    advanceTo(g, nextDay, 8 * 60);
  } else if (kind === 'noon') {
    if (w.clock.minute >= 12 * 60) advanceTo(g, w.clock.day + 1, 12 * 60);
    else { w.clock.minute = 12 * 60; deliverMail(g); }
  } else if (kind === 'dusk') {
    if (w.clock.minute >= 18 * 60) advanceTo(g, w.clock.day + 1, 18 * 60);
    else { w.clock.minute = 18 * 60; deliverMail(g); }
  } else if (kind === 'hibernate') {
    const now = villageDay(w.clock.day);
    advanceTo(g, w.clock.day + (now.type === 3 ? 4 : 3 - now.type), 8 * 60);
    g.events.emit('hibernated', {});
  }
  g.lastHour = -1;
  g.seenDay = w.clock.day;
  g.seenDayHold = false;
  g.sky.placeChanged();
  const c1 = villageDay(w.clock.day);
  const seasonChanged = c1.season !== c0.season;
  g.music.setOverride(null);
  g.engine.screen.reveal('fade', { duration: 0.4 });
  if (seasonChanged) {
    let closed = false;
    const page = new AlmanacPage(SEASON_NAMES[c1.season], TURN_LINES[c1.season], () => g.refreshSeason(true), `sting_${['spring', 'summer', 'autumn', 'winter'][c1.season]}`);
    const origClose = page.close;
    page.close = () => { closed = true; origClose?.(); };
    g.ui.push(page);
    while (!closed) yield;
  } else g.refreshSeason(true);
  g.player.play('Idle', 0.2);
  saveNow(g);
  g.events.emit('woke', { day: w.clock.day });
}
export function* bedMenu(g) {
  const w = g.world;
  const c = yield* menuChoiceFree(g, 'The bed', ['Sleep till morning', 'Nap till noon', 'Nap till dusk', 'Hibernate until the next festival', 'Not yet'], { id: 'bed', w: 240, x: 120 });
  if (c < 0 || c === 4) return;
  if (c === 3) yield* say(g, 'gander', hostLine(g, 'gander', 'hibernate'));
  yield* sleepTo(g, ['morning', 'noon', 'dusk', 'hibernate'][c]);
}
export { HOSTS, panel, tuning };
