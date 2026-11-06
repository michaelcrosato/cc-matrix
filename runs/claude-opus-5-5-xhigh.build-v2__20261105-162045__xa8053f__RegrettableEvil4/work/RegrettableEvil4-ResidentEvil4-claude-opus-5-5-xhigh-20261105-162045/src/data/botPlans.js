// What the bot does per area. Fighting and looting are reflexes; these are the errands between them.
const walkTo = (c, r, o = {}) => ({ goto: [c, r], ...o });
const after = (beat) => (a) => !!a.savedBeats()[beat];
const notBefore = (flag) => (a) => a.run.flag(flag);
const HALL_LOOP = [[12, 16], [19, 16], [29, 16], [38, 16], [38, 24], [30, 24], [18, 24], [8, 24], [8, 11], [24, 11], [38, 11], [24, 19]];
const CLOISTER_LOOP = [[10, 10], [20, 10], [33, 10], [33, 20], [33, 29], [22, 29], [10, 29], [10, 20], [22, 14], [22, 24]];
const siegeOn = (a) => a.run.flag('siegeStarted');
const NORTH_LOOP = [[10, 8], [6, 11], [15, 11], [10, 4], [12, 14], [8, 14]];
const ROAD_LOOP = [[10, 40], [6, 46], [15, 46], [10, 52], [6, 50], [15, 50], [10, 44]];
const SQUARE_LOOP = [[28, 15], [40, 14], [47, 14], [47, 26], [40, 29], [28, 29], [18, 29], [18, 22], [20, 15], [28, 20], [37, 25], [20, 30], [8, 14], [4, 23], [12, 32], [24, 37], [36, 37]];

const clear = (timeout = 45, o = {}) => ({ until: (a) => a.enemies.every((e) => e.dead), timeout, ...o });

export const ALL_PLANS = {
  causeway: [
    { until: (a) => a.tide?.running, timeout: 6 },
    walkTo(7.5, 80, { run: true }),
    walkTo(7.5, 66, { run: true }),
    walkTo(3, 65, { within: 1.4 }),
    { use: 'talk', at: [2.4, 65], look: [1, 65], timeout: 3 },
    { until: (a) => !a.talk.speaking, timeout: 12 },
    walkTo(7.5, 60, { run: true }),
    walkTo(7.5, 48, { run: true }),
    walkTo(7.5, 34, { run: true }),
    walkTo(7.5, 20, { run: true }),
    walkTo(7.5, 8, { run: true }),
    walkTo(7.5, 4, { run: true }),
    { until: (a) => a.wheelT !== undefined && a.wheelT <= 0, timeout: 40 },
    { until: () => false, gotoIdle: [7.5, 0.5] },
  ],
  abbey: [
    walkTo(22, 31, { skipIf: after('cloister') }),
    { until: (a) => a.savedBeats().cloister, timeout: 240, gotoIdle: [22, 29], loop: CLOISTER_LOOP, skipIf: after('cloister') },
    { do: (a, b, it, dt) => {
      if (a.run.flag('lensSolved')) return true;
      const st = a.statues.find((s) => s.dir !== s.want);
      if (!st || st.busy) return false;
      const P = a.player;
      const cur = a.interact.current;
      if (cur?.kind === 'statue' && Math.hypot(cur.x - a.level.info.x(st.c), cur.z - a.level.info.z(st.r)) < 0.1) { it.action = true; return false; }
      b.steerTo(it, a.level.info.x(st.c) + 1.2, a.level.info.z(st.r) + 1.2, false, dt);
      return false;
    }, skipIf: (a) => a.run.flag('lensSolved') },
    { until: (a) => a.run.flag('lensSolved'), timeout: 10 },
    walkTo(11, 20, { skipIf: (a) => a.run.flag('cryptDone') || a.crypt }),
    { until: (a) => a.crypt || a.run.flag('cryptDone'), timeout: 20, ignoreEnemies: true },
    // Playing the Dame: creep from niche to niche to the lever.
    { do: (a, b, it, dt) => {
      const C = a.crypt;
      if (!C) return a.run.flag('cryptDone');
      const P = a.player;
      const { info } = a.level;
      const route = C.leverDone ? [[8, 30.5]] : [[3, 33]];
      const [c, r] = route[0];
      const x = info.x(c); const z = info.z(r);
      if (a.interact.current?.kind === 'lever') { it.action = true; return false; }
      if (C.hidden) { if (!C.knights.some((e) => Math.hypot(e.x - P.x, e.z - P.z) < 3)) it.action = true; return false; }
      // Keep walking: they're slower. A cane to anything that blunders into the way.
      const close = C.knights.find((e) => Math.hypot(e.x - P.x, e.z - P.z) < 2 && e.stunT <= 0);
      if (close && (P.whackCool ?? 0) <= 0) { it.knife = true; return false; }
      b.steerTo(it, x, z, false, dt);
      it.run = false;
      return false;
    }, ignoreEnemies: true, skipIf: (a) => a.run.flag('cryptDone') },
    { until: (a) => a.run.flag('cryptDone'), timeout: 2 },
    clear(40),
    { until: (a) => a.dame?.withYou, timeout: 5 },
    { wait: 0.5 },
    walkTo(35, 20),
    { use: 'door', at: [35.2, 19.5], look: [36, 19.5], timeout: 3 },
    walkTo(39, 18.4, { within: 1.4 }),
    { use: 'talk', at: [39, 18], look: [40, 18], timeout: 3 },
    { until: (a) => !a.talk.speaking, timeout: 12 },
    walkTo(34, 20),
    walkTo(21.5, 9),
    walkTo(21.5, 2),
    { use: 'door', at: [21.5, 1.2], look: [21.5, 0], timeout: 3 },
    { until: () => false },
  ],
  nave: [
    { until: (a) => a.bossLive, timeout: 40, gotoIdle: [13.5, 36], noGrab: true },
    { until: (a) => a.motherDead, timeout: 500, range: 30 },
    { until: (a) => !a.cut, timeout: 20 },
    walkTo(25, 5, { ignoreEnemies: true, run: true }),
    { until: () => false, gotoIdle: [26.5, 4.5] },
  ],
  launch: [
    { until: () => false },
  ],
  road: [
    walkTo(10.5, 56, { skipIf: after('roadblock') }),
    clear(70, { skipIf: after('bridge') }),
    { until: (a) => a.drops.length === 0, timeout: 12, skipIf: after('bridge') },
    walkTo(10.5, 36, { skipIf: after('bridge') }),
    // Nobody fights on a 2 m bridge if they can help it: back across the open ground, out of the bottles' reach, and
    // let the crowd come. Only then cross.
    { until: (a) => a.enemies.every((e) => e.dead || e.state === 'LEDGE'), timeout: 60, gotoIdle: [10.5, 41], loop: ROAD_LOOP, range: 14 },
    // Across at a run, and on past the Bottlers on the ledges: nobody fights directly under them.
    walkTo(10.5, 25),
    { until: (a) => a.enemies.every((e) => e.dead || e.state === 'LEDGE'), timeout: 60, gotoIdle: [10.5, 8], loop: NORTH_LOOP, range: 14 },
    walkTo(8, 16),
    walkTo(6, 16, { within: 1.3 }),
    { use: 'talk', at: [6, 16], look: [5, 16], timeout: 3 },
    { until: (a) => !a.talk.speaking, timeout: 15 },
    { wait: 0.5 },
    walkTo(10.5, 2),
    { use: 'door', at: [10.5, 1.2], look: [10.5, 0], timeout: 5 },
    { until: () => false },
  ],
  cannery: [
    walkTo(21, 32, { within: 1.3, skipIf: (a) => a.player.z < -8 }),
    { use: 'talk', at: [21, 33], look: [20, 33], timeout: 3, skipIf: (a) => a.player.z < -8 },
    { until: (a) => !a.talk.speaking, timeout: 15 },
    walkTo(24, 24, { skipIf: after('hall') }),
    clear(90, { skipIf: after('hall'), loop: HALL_LOOP }),
    { until: (a) => a.flenser?.dead, timeout: 240, gotoIdle: [24, 18], skipIf: (a) => a.run.hasKey('coldKey'), range: 22, loop: HALL_LOOP },
    { wait: 1 },
    walkTo(37.5, 10, { skipIf: after('cold') }),
    { use: 'door', at: [37.5, 10.2], look: [37.5, 9], timeout: 5, skipIf: after('cold') },
    walkTo(38, 7, { skipIf: after('cold') }),
    { until: (a) => !a.cut && a.dame, timeout: 40 },
    // Before the door that starts the worst fight of the chapter: nobody leaves supplies lying about the hall.
    { do: (a, b, it, dt) => { const busy = b.grabThings(it, dt, a.player); return !busy || b.waitT > 40; }, dropRange: 60, skipIf: (a) => a.run.flag('winchDoorOpen') },
    walkTo(12, 11, { skipIf: (a) => a.run.flag('winchDoorOpen') }),
    { command: true, skipIf: (a) => a.run.flag('winchDoorOpen') },
    { until: (a) => a.run.flag('winchDoorOpen'), timeout: 6 },
    clear(30, { skipIf: (a) => a.run.flag('winchStarted') }),
    walkTo(9.5, 10.4, { skipIf: (a) => a.run.flag('winchStarted') }),
    walkTo(9, 7, { skipIf: (a) => a.run.flag('winchStarted') }),
    { command: true, skipIf: (a) => a.run.flag('winchStarted') },
    { until: (a) => a.run.flag('winchStarted'), timeout: 3 },
    { until: (a) => a.run.flag('winchDone'), timeout: 300, gotoIdle: [9.5, 11], range: 25, loop: [[9.5, 11], [20, 11], [9.5, 6], [13, 4], [30, 16], [16, 16]] },
    clear(30),
    walkTo(16, 13),
    { until: (a) => a.beltDone, timeout: 60, ignoreEnemies: true },
    walkTo(24, 9),
    { until: () => false, gotoIdle: [24, 1] },
  ],
  yard: [
    walkTo(29.5, 32, { within: 1.4, skipIf: (a) => a.run.flag('bosunDead'), noGrab: true }),
    { use: 'talk', at: [30, 31.5], look: [31, 31], timeout: 3, skipIf: (a) => a.run.flag('bosunDead') },
    { until: (a) => !a.talk.speaking, timeout: 12, skipIf: (a) => a.run.flag('bosunDead') },
    walkTo(17.5, 29, { skipIf: (a) => a.bossLive || a.run.flag('bosunDead'), noGrab: true }),
    { until: (a) => a.run.flag('bosunDead') && !a.cut, timeout: 400 },
    walkTo(30.5, 30, { within: 1.3 }),
    { use: 'talk', at: [30, 31], look: [31, 31], timeout: 3 },
    { until: (a) => !a.talk.speaking, timeout: 15 },
    walkTo(17.5, 3),
    { until: () => false, gotoIdle: [17.5, 0.8] },
  ],
  quay: [
    { until: (a) => !a.cut, timeout: 2 },
    // Once the Siege is on, the errands are off: a retry goes straight back to fighting it, not to the far end of the pier.
    walkTo(41.5, 28.5, { skipIf: (a) => after('cottage')(a) || siegeOn(a) }),
    { use: 'door', at: [41.5, 29], look: [41.5, 31], timeout: 8, skipIf: (a) => notBefore('cottageOpen')(a) || siegeOn(a) },
    { until: (a) => a.run.flag('cottageOpen'), timeout: 3, skipIf: (a) => after('cottage')(a) || siegeOn(a) },
    walkTo(42, 32, { ignoreEnemies: true, skipIf: (a) => after('cottage')(a) || siegeOn(a) }),
    { until: (a) => !a.mender || a.mender.dead, timeout: 60, skipIf: (a) => after('cottage')(a) || siegeOn(a) },
    { until: (a) => a.enemies.every((e) => e.dead), timeout: 30, skipIf: (a) => after('cottage')(a) || siegeOn(a) },
    walkTo(45, 34, { skipIf: (a) => after('cottage')(a) || siegeOn(a) }),
    { use: 'window', at: [45, 34], look: [46, 34], timeout: 3, skipIf: (a) => after('cottage')(a) || siegeOn(a) },
    { wait: 1, skipIf: siegeOn },
    walkTo(49, 30, { skipIf: siegeOn }),
    walkTo(49, 16, { skipIf: siegeOn }),
    { until: (a) => a.enemies.every((e) => e.dead), timeout: 40, skipIf: siegeOn },
    walkTo(48, 8, { skipIf: (a) => a.run.flag('fathomMet') || siegeOn(a) }),
    walkTo(45.5, 7, { within: 1.2, skipIf: (a) => a.run.flag('fathomMet') || siegeOn(a) }),
    { use: 'talk', at: [45.5, 7], look: [44, 7], timeout: 4, skipIf: (a) => a.run.flag('fathomMet') || siegeOn(a) },
    { until: (a) => a.run.flag('fathomMet') && !a.talk.speaking, timeout: 25, skipIf: siegeOn },
    { wait: 0.5, skipIf: siegeOn },
    walkTo(40, 13.5, { skipIf: siegeOn }),
    walkTo(36, 18, { skipIf: siegeOn }),
    { until: (a) => a.siege.finished, timeout: 300, loop: SQUARE_LOOP, gotoIdle: [28, 20] },
    { until: (a) => !a.cut, timeout: 30 },
    { wait: 0.5 },
    // The Siege is over and the square is quiet: anything given up on in the middle of it is worth another look.
    { do: (a) => { for (const c of a.level.chests) c.botSkip = false; return true; } },
    { do: (a, b, it, dt) => { const busy = b.grabThings(it, dt, a.player); return !busy || b.waitT > 80; }, chestRange: 120 },
    walkTo(45.5, 13, { noGrab: true }),
    walkTo(48.5, 8, { noGrab: true }),
    walkTo(45.5, 7, { within: 1.2, noGrab: true }),
    { use: 'talk', at: [45.5, 7], look: [44, 7], timeout: 4 },
    { until: (a) => !a.talk.speaking, timeout: 12 },
    { do: (a, b, it, dt) => { const busy = b.grabThings(it, dt, a.player); return !busy || b.waitT > 16; } },
    walkTo(4, 8.5),
    { until: () => false, gotoIdle: [1.2, 8.5] },
  ],
};
