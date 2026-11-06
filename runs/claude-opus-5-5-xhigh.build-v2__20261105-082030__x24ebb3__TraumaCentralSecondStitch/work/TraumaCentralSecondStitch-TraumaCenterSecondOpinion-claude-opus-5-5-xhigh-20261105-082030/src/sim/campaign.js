// The shift, as data and pure functions: which scene and which op follow which. Uses no engine.
export const EPISODES = [
  { scene: 'ep1', op: 'op1' }, { scene: 'ep2', op: 'op2' }, { scene: 'ep3', op: 'op3' }, { scene: 'ep4', op: 'op4' }, { scene: 'ep5', op: 'op5' },
  { scene: 'ep6', op: 'op6' }, { scene: 'ep7', op: 'op7' }, { scene: 'ep8', op: 'op8' }, { scene: 'ep9', op: 'op9' }, { scene: 'ep10', op: 'op10' },
];
export const END_SCENE = 'end';

/** After finishing the scene or op of `progress`, what comes next. */
export function advance(progress) {
  if (progress.stage === 'scene') return { ...progress, stage: 'op' };
  if (progress.stage === 'op') {
    const n = progress.episode + 1;
    if (n >= EPISODES.length) return { ...progress, stage: 'end', episode: n };
    return { ...progress, stage: 'scene', episode: n };
  }
  return { ...progress, finished: true, stage: 'done' };
}
export const currentStep = (progress) => {
  if (progress.stage === 'end') return { kind: 'scene', id: END_SCENE };
  if (progress.stage === 'done') return { kind: 'done' };
  const ep = EPISODES[progress.episode];
  return progress.stage === 'scene' ? { kind: 'scene', id: ep.scene, ep: progress.episode } : { kind: 'op', id: ep.op, ep: progress.episode };
};
