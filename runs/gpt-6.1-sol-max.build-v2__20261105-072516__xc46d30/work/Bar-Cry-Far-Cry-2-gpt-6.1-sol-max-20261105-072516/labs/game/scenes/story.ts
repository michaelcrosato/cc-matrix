/** @file Data-driven contracts, alternate plans, final choices and the co-op contract run. */
import { placeActor, setDaytime, handOff, type Intents } from '../../../engine/sim-api';
import { campaign, players, mark, say, value, type GW, type Person } from './state';
import { CONTRACTS, STOCK, ALTS } from './content';
import { cellPoint, ignite } from './fire';
import { gun, weaponId, registerGuns } from '../weapons/guns';
import { helpBuddy } from './health';

export function ending(w: GW, choice: string, p: Person): void {
  const c = campaign(w),
    s = p.seat!.data;
  if (c.contract !== 6 || c.step !== 3 || c.ending) return;
  if (choice === 'buy' && s.stones < 60) {
    say(w, 'Auctioneer', 'The reserve is sixty stones. Sentiment has no resale value.');
    return;
  }
  if (choice === 'buy') {
    s.stones -= 60;
    s.fever = 0;
    s.pills = 8;
    c.flags.cured = 1;
  }
  if (choice === 'burn') {
    ignite(w, 300, 315, 3);
    c.wind = Math.atan2(p.actor.x - 300, p.actor.z - 315);
  }
  const alive = c.buddies.filter((b) => b.alive),
    help = alive.find((b) => b.debt < 1);
  c.ending = choice === 'serve' ? 'WARRANT SERVED' : choice === 'buy' ? 'RESERVE MET' : 'CATALOGUE CLOSED';
  const last =
    choice === 'serve'
      ? 'The bidding reopens Tuesday.'
      : choice === 'buy'
        ? 'The fever stops. The accounts are yours now.'
        : help
          ? `${help.key} comes back through the smoke. One debt, paid.`
          : 'Nobody comes through the smoke. The accounts burn with you.';
  c.flags.endChoice = choice === 'serve' ? 1 : choice === 'buy' ? 2 : 3;
  mark(w, `ending ${choice}`);
  c.finished.push(6);
  c.save++;
  say(w, 'Lot One', last);
  w.emit('ending', { choice, title: c.ending, last });
}
export function purchase(w: GW, p: Person, index: number): void {
  const c = campaign(w),
    s = p.seat!.data,
    item = STOCK[index];
  if (!item) return;
  const cost = Math.ceil(item.price * value(w, 'economy.prices'));
  if (s.stones < cost) {
    say(w, 'Ferreira', 'Bring stones. I have enough promises.');
    return;
  }
  if (item.kind === 'gun') {
    const g = gun(item.key);
    registerGuns([g.key]);
    p.gunState.data.guns[g.slot] = { key: g.key, condition: 1, jam: false, clear: 0, reserve: g.mag * 6 };
    p.weapons.slots[g.slot] = weaponId(g.key, 1);
    p.weapons.mags[g.slot] = g.mag;
    p.weapons.slot = g.slot;
    p.weapons.last = g.slot;
    if (!c.owned.includes(g.key)) c.owned.push(g.key);
  } else if (item.kind === 'reliability') {
    if (s.reliability >= Number(item.key)) return;
    s.reliability = Number(item.key);
    mark(w, 'reliability upgrade');
  } else if (item.kind === 'capacity') s.capacity = 7;
  else if (item.kind === 'kit') s.kit++;
  else if (item.kind === 'smock') s.smock = true;
  s.stones -= cost;
  mark(w, 'purchase');
  say(w, 'Ferreira', 'Everything I sell works. For a while.');
  c.save++;
}
export function command(w: GW, raw: unknown): void {
  const cmd = raw as { kind: string; key?: string; index?: number; seat?: number; hour?: number },
    p = players(w).find((x) => x.seat!.data.n === (cmd.seat ?? 0));
  if (!p) return;
  const c = campaign(w),
    s = p.seat!.data;
  if (cmd.kind === 'buy' && Math.hypot(p.actor.x - 1200, p.actor.z - 620) < 70) purchase(w, p, cmd.index ?? 0);
  if (cmd.kind === 'ending') ending(w, cmd.key ?? 'serve', p);
  if (cmd.kind === 'mercy') helpBuddy(w, p, cmd.key ?? '', true);
  if (cmd.kind === 'saveBuddy') helpBuddy(w, p, cmd.key ?? '');
  if (cmd.kind === 'alt') {
    const b = c.buddies.find((x) => x.key === cmd.key && x.alive);
    if (!b) return;
    if (c.flags[`alt-${c.contract}`]) return;
    c.flags[`alt-${c.contract}`] = 1;
    b.helped = true;
    mark(w, 'alternate plan');
    say(w, b.key, CONTRACTS[c.contract]?.alt || 'We can still make this worth the trouble.');
  }
  if (cmd.kind === 'sleep') {
    c.hour = cmd.hour ?? 6;
    setDaytime(w, { hour: c.hour, rate: 24 / (value(w, 'day.minutes') * 60) });
    s.syr = Math.min(s.capacity, s.syr + 2);
    p.health.hp = 100;
    c.save++;
    mark(w, 'sleep');
    say(w, 'Field note', 'A locked door. A clean shirt. It will do.');
  }
  if (cmd.kind === 'reissue') {
    for (let i = 0; i < p.gunState.data.guns.length; i++) {
      const current = p.gunState.data.guns[i],
        key = c.owned.includes(current.key) ? current.key : c.owned.find((key) => gun(key).slot === i);
      if (!key) continue;
      const spec = gun(key);
      p.gunState.data.guns[i] = { key, condition: 1, jam: false, broken: false, clear: 0, reserve: spec.mag * 6 };
      p.weapons.mags[i] = spec.mag;
    }
    s.syr = Math.min(s.capacity, s.syr + 2);
    mark(w, 'armoury reissue');
    c.save++;
  }
  if (cmd.kind === 'dismiss') {
    c.flags.dialogue = 0;
    c.flags.shop = 0;
    c.flags.sleep = 0;
  }
  if (cmd.kind === 'clearPanel' && cmd.key) c.flags[cmd.key] = 0;
}
export function commandStep(w: GW, I: Intents): void {
  if (I['game:command']) command(w, I['game:command']);
}

function burning(w: GW, at: number[], radius: number): number {
  const c = campaign(w);
  let n = 0;
  for (let i = 0; i < c.fire.length; i++)
    if (c.fire[i] >= 2) {
      const [x, z] = cellPoint(i);
      if (Math.hypot(x - at[0], z - at[1]) < radius) n++;
    }
  return n;
}
function nextStep(w: GW): void {
  const c = campaign(w),
    contract = CONTRACTS[c.contract];
  if (c.step === 0 && contract.steps[0].kind === 'talk') say(w, contract.giver, contract.brief);
  c.step++;
  c.save++;
  if (c.step >= contract.steps.length) {
    c.finished.push(c.contract);
    mark(w, 'contract complete');
    for (const p of players(w)) p.seat!.data.stones += Math.round(contract.pay * value(w, 'economy.pay'));
    if (contract.faction === 'front') {
      c.front++;
      c.authority--;
      mark(w, 'standing change');
    }
    if (contract.faction === 'authority') {
      c.authority++;
      c.front--;
      mark(w, 'standing change');
    }
    if (c.flags[`alt-${c.contract}`] && c.flags[`altDone-${c.contract}`]) {
      const b = c.buddies.find((x) => x.helped && x.alive);
      if (b) {
        b.debt = Math.max(-3, b.debt - 1);
        b.helped = false;
      }
      for (const p of players(w)) p.seat!.data.stones += 8;
    }
    if (c.contract === 2) for (const p of players(w)) p.seat!.data.pills = Math.min(8, p.seat!.data.pills + 5);
    say(w, contract.giver, `Account settled. ${contract.pay} stones. Keep the receipt.`);
    c.contract++;
    c.step = 0;
  }
  c.goal = CONTRACTS[c.contract]?.steps[c.step]?.goal ?? 'The world remains open. There are still debts to collect.';
  w.emit('goal', { goal: c.goal });
}
export function storyStep(w: GW): void {
  const c = campaign(w);
  if (c.mode === 'title' || c.mode === 'attract') return;
  if (c.mode === 'contract') {
    c.run++;
    const count = burning(w, [1010, 360], 60);
    if (c.step === 0 && players(w).some((p) => Math.hypot(p.actor.x - 1010, p.actor.z - 360) < 75)) {
      c.step = 1;
      say(w, 'Contract Run', 'Three tanks. One wind. Make it count.');
    }
    if (c.step === 1 && count >= 12) {
      c.step = 2;
      c.survival = w.tick + 3600;
      say(w, 'Contract Run', 'The depot is burning. Hold for one minute.');
    }
    if (c.step === 2 && w.tick >= c.survival) {
      c.step = 3;
      say(w, 'Contract Run', 'Get to the extraction pickup south of the depot.');
    }
    if (c.step === 3)
      for (const p of players(w))
        if (Math.hypot(p.actor.x - 1010, p.actor.z - 465) < 35 && !c.extracted.includes(p.seat!.data.n)) {
          c.extracted.push(p.seat!.data.n);
          mark(w, 'extracted');
        }
    if (c.extracted.length === players(w).length) {
      c.flags.runWon = 1;
      c.ending = 'CONTRACT FULFILLED';
    }
    if (c.run >= 18000 || players(w).every((p) => p.seat!.data.down !== 0)) {
      c.flags.runLost = 1;
      c.ending = 'RESERVE NOT MET';
    }
    c.goal =
      [
        'Reach the fuel depot',
        'Burn the depot · F draws a flare',
        'Hold the perimeter · survive the counter-attack',
        'Extract at the pickup south of the depot',
      ][c.step] ?? 'Contract complete';
    return;
  }
  if (c.ending) return;
  const contract = CONTRACTS[c.contract],
    step = contract?.steps[c.step];
  if (!step) return;
  c.goal = step.goal;
  const alt = ALTS[c.contract];
  if (alt && c.flags[`alt-${c.contract}`] && !c.flags[`altDone-${c.contract}`]) {
    if (
      alt.kind === 'burn' &&
      ((c.flags[`burned:${alt.key}`] ?? 0) >= (alt.count ?? 3) || burning(w, alt.at, 40) >= (alt.count ?? 3))
    )
      c.flags[`altDone-${c.contract}`] = 1;
    if (alt.kind === 'delivery' && (c.flags.deliveries ?? 0) >= (alt.count ?? 4)) c.flags[`altDone-${c.contract}`] = 1;
    if (alt.kind === 'use' && c.flags[`use:${alt.key}`]) c.flags[`altDone-${c.contract}`] = 1;
  }

  if (c.contract === 0 && c.step === 1 && !c.flags.firstWound) {
    for (const p of players(w)) p.health.hp = 45;
    c.flags.firstWound = 1;
    say(w, 'Field note', 'Sand in the chamber. Hold reload. The wound can wait a moment.');
  }
  if (c.contract === 0 && c.step === 3 && !c.flags.firstFever) {
    c.flags.firstFever = w.tick;
    for (const p of players(w)) {
      p.seat!.data.fever = w.tick;
      p.seat!.data.feverNext = w.tick;
    }
    mark(w, 'fever attack');
    say(w, 'Field note', 'The river goes cold. The air has not changed.');
  }
  if (c.contract === 0 && c.step === 3 && w.tick - c.flags.firstFever > 300 && !c.flags.prologueRescue)
    for (const p of players(w)) if (!p.seat!.data.down) p.health.hp = 0;
  if (c.contract === 0 && c.step === 5)
    for (const p of players(w)) if (!p.seat!.data.fever && !c.coverage.pill) p.seat!.data.fever = w.tick || 1;
  if (c.contract === 2 && c.step === 1 && !c.flags.bitterFire) {
    c.flags.bitterFire = 1;
    w.emit('mission-fire', { x: 540, z: 1080 });
  }
  if (c.contract === 4 && c.step === 2 && !c.flags.estateWind) {
    c.windTo = c.wind + Math.PI;
    c.windNext = w.tick + 120;
    c.flags.estateWind = 1;
  }
  if (c.contract === 5 && c.step === 3 && !c.flags.buddyFallen) {
    const b = c.buddies.find((x) => x.alive);
    if (!b) {
      c.flags.invoiceResolved = 1;
      c.flags.buddyFallen = 1;
      say(w, 'Field telephone', 'No answer. There is nobody left to send the bill to.');
    }
    if (b) {
      b.fallen = w.tick + 3600;
      const body = w.get(b.entity);
      if (body?.health) body.health.hp = 15;
      placeActor(w, b.entity, [1240, 3, 277]);
      handOff(w, b.entity, { dead: true });
      c.flags.buddyFallen = 1;
      mark(w, 'mercy prompt');
      say(w, b.key, 'Do not make me ask twice.');
    }
  }
  if (c.contract === 5 && c.step === 3) {
    const b = c.buddies.find((x) => x.fallen > 0);
    if (!b && c.flags.buddyFallen) c.flags.invoiceResolved = 1;
  }
  const at = step.at,
    near = at && players(w).some((p) => Math.hypot(p.actor.x - at[0], p.actor.z - at[1]) < (step.radius ?? 30));
  let done =
    step.kind === 'at'
      ? near
      : step.kind === 'talk'
        ? c.flags[`talk:${step.key}`] > 0
        : step.kind === 'use'
          ? c.flags[`use:${step.key}`] > 0
          : step.kind === 'coverage'
            ? (c.coverage[step.key!] ?? 0) > 0
            : step.kind === 'flag'
              ? (c.flags[step.key!] ?? 0) > 0
              : step.kind === 'burn'
                ? burning(w, at!, step.radius!) >= (step.count ?? 8)
                : step.kind === 'delivery'
                  ? (c.flags.deliveries ?? 0) >= (step.count ?? 3)
                  : step.kind === 'clear'
                    ? c.cleared[step.key!] !== undefined
                    : step.kind === 'vehicle'
                      ? players(w).some(
                          (p) => p.seat!.data.vehicle >= 0 && w.get(p.seat!.data.vehicle)?.ride?.data.kind === step.key,
                        )
                      : false;
  if (
    done &&
    c.flags[`alt-${c.contract}`] &&
    c.step === contract.steps.length - 1 &&
    !c.flags[`altDone-${c.contract}`] &&
    !c.flags[`altFailed-${c.contract}`]
  ) {
    done = false;
    c.goal = alt?.goal ?? step.goal;
  }
  if (done) {
    if (step.kind === 'talk') c.flags[`talk:${step.key}`] = 0;
    if (step.kind === 'use') c.flags[`use:${step.key}`] = 0;
    nextStep(w);
  }
}
