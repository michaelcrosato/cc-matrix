// Story state: everything that persists between missions. Plain data, JSON-safe.
export function freshStory() {
  return {
    stones: 0, earned: 0, flags: {}, done: [], contract: null, current: null,
    trust: { ines: 0, dov: 0, mags: 0 }, met: { ines: false, dov: false, mags: false }, dead: [], wounded: {}, spentUntil: {},
    ledger: { moved: 0, paid: 0, killed: 0, friendsLost: 0 },
    trig: [], halts: ['mile-forty'], upgrades: { cleaning: false, pouch: false, belt: false, kit: false }, unlocked: ['cane', 'm38'],
    safehouse: 'pump-shed', safeSites: ['pump-shed'], mercyRuns: 0, tracker: false, monocular: true, flare: false,
    cases: [], choices: {}, ending: null, act: 1,
  };
}
export const hasDone = (st, id) => st.done.includes(id);
