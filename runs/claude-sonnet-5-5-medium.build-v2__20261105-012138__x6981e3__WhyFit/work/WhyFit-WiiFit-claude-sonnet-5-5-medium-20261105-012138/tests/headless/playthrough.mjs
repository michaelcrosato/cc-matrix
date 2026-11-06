// Test 5: a full scripted playthrough through the real menus and scenes, from a fresh save, with bots inside the activities.
import { boot, go, play, wait, press, pressUntil, settle } from '../../tools/lib-node.mjs';
import { ACTIVITIES, ACT_ORDER } from '../../src/data/activities.js';
import { WEEK, goalDone, dayOf } from '../../src/data/week.js';
import { MILESTONES } from '../../src/data/unlocks.js';
import { STATIONS } from '../../src/data/stations.js';
import { StationMenu } from '../../src/scenes/hub.js';
import { totalStars } from '../../src/core/progress.js';

export default async function (t) {
  const { app, engine } = await boot('title');
  app.save.clear(); engine.step(20);
  const id = () => app.scene?.constructor?.id;
  const S = () => app.slot;
  // ---- menus: title -> main menu -> The Week -> new slot -> name -> avatar -> ferry ----
  await press(engine, 'Enter'); await wait(engine, 0.2);
  t.eq(app.scene.mode, 'menu', 'title press moves to the main menu');
  await press(engine, 'Enter'); await wait(engine, 0.2);          // The Week
  t.eq(app.scene.stack[0]?.id, 'slots', 'The Week opens the guest slots');
  await press(engine, 'Enter'); await wait(engine, 0.5);          // slot 1 (empty)
  t.eq(app.scene.stack[0]?.id, 'name', 'an empty slot opens name entry');
  await press(engine, 'Enter'); await press(engine, 'ArrowLeft'); await press(engine, 'Enter'); // "A" then Done (wraps to last key)
  await wait(engine, 1.5);
  t.eq(app.scene.stack[0]?.id, 'avatar', 'name entry leads to avatar choice');
  await press(engine, 'ArrowRight'); await press(engine, 'Enter');
  await play(engine, () => id() === 'ferry', 20);
  t.eq(id(), 'ferry', 'new week starts with the ferry');
  t.eq(S()?.name, 'A', 'name saved');
  await settle(engine);
  await pressUntil(engine, 'Enter', () => id() === 'weighin', 60); await settle(engine); await wait(engine, 0.5);
  t.eq(id(), 'weighin', 'ferry leads to the first Weigh-In');
  const sc = () => app.scene;
  const ounces = [];
  for (let day = 1; day <= 7; day++) {
    // ---- Weigh-In ----
    await settle(engine);
    t.eq(id(), 'weighin', `day ${day}: morning Weigh-In`);
    t.eq(S().day, day, `day ${day}: calendar`);
    await pressUntil(engine, 'Enter', () => sc().phase === 'test', 30);
    sc().setDriver('good');
    await play(engine, () => sc().phase === 'question', 40);
    t.eq(sc().phase, 'question', `day ${day}: test then a question`);
    await press(engine, 'Enter');
    for (let k = 0; k < 40 && id() === 'weighin'; k++) { if (sc().phase === 'feel') await press(engine, 'Enter'); else await press(engine, 'Enter'); await wait(engine, 0.3); }
    await play(engine, () => id() === 'hub', 30);
    await settle(engine);
    t.eq(id(), 'hub', `day ${day}: Weigh-In leads to the island`);
    t.eq(S().ages.length, day, `day ${day}: one Wobble Age recorded`);
    if (day === 1) t.ok(S().ages[0] >= 25 && S().ages[0] <= 102, 'first shown age in range');
    // ---- unlock schedule via the real station menus ----
    for (const st of STATIONS.filter((x) => x.acts.length)) {
      const m = new StationMenu(app, null, st);
      st.acts.forEach((a, i) => t.eq(!!m.menu.items[i].disabled, day < ACTIVITIES[a].unlock, `day ${day}: ${a} ${day < ACTIVITIES[a].unlock ? 'locked' : 'open'}`));
    }
    // ---- activities for the day's goal ----
    const open = ACT_ORDER.filter((a) => day >= ACTIVITIES[a].unlock);
    const plan = day === 1 ? ['tree', 'squat', 'hoop'] : day === 2 ? ['header', 'lunge'] : day === 3 ? ['step', 'slack'] : day === 4 ? ['tray', 'press', 'fold'] : day === 5 ? ['pier', 'jog', 'plank'] : day === 6 ? ['tree', 'header', 'hoop'] : [];
    const goalBefore = S().goalDone, dripsBefore = S().drips;
    for (const a of plan) {
      const d0 = S().drips;
      await go(engine, 'activity', { id: a, skipIntro: true, skill: day === 6 ? 'expert' : 'good', hard: day >= 6 });
      await play(engine, () => sc().phase === 'results', 200);
      t.eq(sc().phase, 'results', `day ${day}: ${a} finishes`);
      const r = sc().result, rep = sc().report;
      t.ok(S().doneToday.some((e) => e.id === a), `day ${day}: ${a} recorded`);
      t.eq(S().drips - d0, rep.drips + rep.goalBonus, `day ${day}: ${a} drips add up`);
      t.ok(rep.drips >= 2 + 3 * r.stars, `day ${day}: ${a} drips formula floor`);
      await wait(engine, 3);
      // results menu: Back to the island
      await press(engine, 'ArrowDown'); await press(engine, 'ArrowDown'); await press(engine, 'Enter');
      await play(engine, () => id() === 'hub', 20); await settle(engine);
      t.eq(id(), 'hub', `day ${day}: ${a} results lead back to the island`);
    }
    if (day < 7) {
      const gd = dayOf(day).goal;
      t.ok(S().goalDone || day === 5, `day ${day}: goal "${gd.text}" paid ${S().goalDone ? 'yes' : 'no'}`);
    }
    if (day === 5) { // goal "beat Dennis at anything" is reachable
      await go(engine, 'activity', { id: 'jog', skipIntro: true, skill: 'expert' }); await play(engine, () => sc().phase === 'results', 200); t.ok(S().beatDennisToday, 'day 5: Dennis can be beaten'); await go(engine, 'hub');
    }
    // ---- Day 7: the Long Stand and the confession ----
    if (day === 7) {
      const before = [...S().ages];
      await go(engine, 'activity', { id: 'longstand', skill: 'expert', skipIntro: true });
      await play(engine, () => sc().phase === 'results', 200);
      t.eq(sc().phase, 'results', 'the Long Stand finishes');
      await wait(engine, 3); await press(engine, 'Enter');
      await play(engine, () => id() === 'ending', 20); await settle(engine);
      t.eq(id(), 'ending', 'the Long Stand leads to the confession');
      await play(engine, () => sc().showChart, 60);
      await play(engine, () => sc().slide >= 1, 30);
      t.ok(sc().slide >= 1, 'the chart slides');
      await play(engine, () => sc().credits, 60);
      t.ok(sc().credits, 'credits roll');
      await play(engine, () => id() === 'hub', 60); await settle(engine);
      t.eq(id(), 'hub', 'credits lead back to the island (Week 2)');
      t.ok(S().ended && S().week2 && S().confessed, 'the ending is recorded');
      t.eq(S().ages, before.map((a) => a - 7), 'the confession subtracts exactly 7 from every shown age');
      continue;
    }
    // ---- end the day at the hammock, then the Evening Report ----
    t.ok(S().doneToday.length >= 1, `day ${day}: at least one activity before the hammock`);
    sc().hammock(); await wait(engine, 0.3); await press(engine, 'Enter');
    await play(engine, () => id() === 'report', 20); await settle(engine);
    t.eq(id(), 'report', `day ${day}: hammock leads to the Evening Report`);
    await press(engine, 'Enter'); await press(engine, 'Enter'); await press(engine, 'Enter');
    await play(engine, () => id() === 'weighin', 30); await settle(engine);
  }
  // ---- Jar milestones ----
  const d = S().drips; const crossed = MILESTONES.filter((m) => d >= m.at).length;
  t.ok(d > 0, `drips accumulated (${d})`);
  t.eq(S().unlockedItems.length, crossed, 'Jar milestones unlocked match the Drips total');
  t.ok(totalStars(S()) > 0, 'stars were earned');
  // ---- Week 2: the next day carries on ----
  sc().hammock(); await wait(engine, 0.3); await press(engine, 'Enter'); await play(engine, () => id() === 'report', 20); await settle(engine);
  await press(engine, 'Enter'); await press(engine, 'Enter'); await press(engine, 'Enter'); await play(engine, () => id() === 'weighin', 30); await settle(engine);
  t.eq(S().day, 8, 'Week 2 begins as day 8');
  t.eq(engine.errors.length, 0, 'no engine errors in the whole playthrough: ' + engine.errors.slice(0, 2).join(' | '));
}
