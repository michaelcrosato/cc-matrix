// What the campaign remembers.
export const makeStory = () => ({
  stones: 0, pass: null, truce: true, war: false, feverRunning: false, flags: {}, trigsDone: new Set(), casesDone: new Set(), halts: new Set(), unlocked: new Set(['m38', 'cane']), safehouses: new Set(), odileRefuses: false, runsDone: 0, act: 1, trackerOwned: false, stonesEarned: 0, stockInLockers: false, smokeUntil: 0, noPatrols: false, ending: null,
  chose: {}, holdFireFaction: null, sheet: null,
});
export const storyToJson = (s) => ({ ...s, trigsDone: [...s.trigsDone], casesDone: [...s.casesDone], halts: [...s.halts], unlocked: [...s.unlocked], safehouses: [...s.safehouses] });
export const storyFromJson = (j) => ({ ...makeStory(), ...j, trigsDone: new Set(j.trigsDone), casesDone: new Set(j.casesDone), halts: new Set(j.halts), unlocked: new Set(j.unlocked), safehouses: new Set(j.safehouses) });
