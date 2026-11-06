// What each activity asks of the hands, for cards and How to Play.
const FAMILY = {
  pose: [['lean', 'Lean']],
  poseBreath: [['lean', 'Lean'], ['breath', 'Breathe in']],
  reps: [['lean', 'Move']],
  hoop: [['lean', 'Circle']],
  step: [['stepL', 'Left'], ['stepR', 'Right']],
  header: [['lean', 'Lean']],
  slackline: [['lean', 'Lean, push up to walk']],
  tray: [['lean', 'Tilt']],
  pier: [['lean', 'Tuck, hold'], ['confirm', 'Jump']],
  jog: [['stepL', 'Left'], ['stepR', 'Right'], ['lean', 'Steer']],
  stand: [['lean', 'Lean']],
};

export function controlsFor(def) {
  if (def.family === 'pose') return ['warrior', 'chair', 'fold', 'plank'].includes(def.pose) ? FAMILY.poseBreath : FAMILY.pose;
  if (def.scene === 'slackline') return FAMILY.slackline;
  if (def.scene === 'tray') return FAMILY.tray;
  if (def.scene === 'pier') return FAMILY.pier;
  if (def.scene === 'jog') return FAMILY.jog;
  if (def.family === 'finale') return FAMILY.stand;
  return FAMILY[def.family] ?? FAMILY.pose;
}

export const HOW_TO = [
  { title: 'The Dot', lines: ['This dot is you. Keep it in the circle.', 'Lean with the left stick, WASD or the mouse.', 'It has weight. It sways. It overshoots. So will you.'] },
  { title: 'Breath', lines: ['When a bar appears, breathe with it.', 'Hold R2, Space or the left button on In.', 'Let go on Out. It calms the Dot. It calms nobody else.'] },
  { title: 'Stars and Drips', lines: ['Everything gives up to three stars.', 'Stars and minutes make Drips. Drips fill the Sweat Jar.', 'The jar unlocks things. None of them help.'] },
  { title: 'Falling', lines: ['You cannot lose here. You can only be noted.', 'Falls cost points and dignity.', 'Ounce will write it down. Ounce is very gentle about it.'] },
];
