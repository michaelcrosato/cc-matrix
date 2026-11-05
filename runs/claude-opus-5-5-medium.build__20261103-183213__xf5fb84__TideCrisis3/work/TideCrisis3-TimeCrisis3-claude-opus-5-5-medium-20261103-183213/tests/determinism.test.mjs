import { readFileSync, readdirSync } from 'node:fs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const play = seed => { const sim = new TC.Sim({ mode: 'stage', stages: [1], stage: 1, scene: '1-1', skipCuts: true, seed }); const bot = new TC.Autopilot('fair'); for (let k = 0; k < 120 * 40; k++) sim.step(1 / 120, [bot.command(sim, 0, 1 / 120)]); return sim.hash(); };
  t.check('the same seed and commands give the same game', play(7) === play(7));
  t.check('a different seed gives a different game', play(7) !== play(8));
  const src = n => readFileSync(t.root + 'src/' + n, 'utf8');
  for (const f of readdirSync(t.root + 'src').filter(f => /^(2\d|3\d|60)-/.test(f))) t.check('no Math.random in ' + f, !/Math\.random/.test(src(f)));
  const hud = src('50-hud.js') + src('51-screens.js') + src('90-main.js');
  t.check('prompts never hardcode key names', !/'(PRESS|HOLD) (SPACE|ENTER|R2|L2|Z|X)\b/.test(hud) && !/\[(Space|R2|L2|Mouse)\]/.test(hud));
};
