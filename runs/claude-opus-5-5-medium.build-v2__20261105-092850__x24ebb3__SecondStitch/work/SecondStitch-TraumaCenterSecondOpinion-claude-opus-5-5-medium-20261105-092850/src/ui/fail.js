// The failure screen: flatline. Retry from this stage (rank capped at B) or Restart. After 2 failures, offer to lower the difficulty.
import { Menu } from './menu.js';
import { app } from '../core/app.js';
import { DIFFICULTY } from '../core/config.js';

const WHY = { clock: 'OUT OF TIME.', vitals: 'THE PATIENT IS GONE.', codeblue: 'WE LOST THE RHYTHM.', mistakes: 'YOU ARE RELIEVED, DOCTOR. FIVE MISTAKES.', cold: 'THE KIDNEY WARMED. COLD TIME GONE.', massage: 'THE HEART NEVER CAME BACK.', dev: 'DEV MODE FAILED THIS OP.' };
export class MenuFail {
  constructor(stage, ctx) {
    this.stage = stage;
    const id = stage.def.id;
    app.save.fails[id] = (app.save.fails[id] ?? 0) + 1;
    app.persist();
    const items = [{ label: 'RETRY FROM THIS STAGE', id: 'retry' }, { label: 'RESTART THE OP', id: 'restart' }];
    const diffs = Object.keys(DIFFICULTY), here = diffs.indexOf(app.save.difficulty ?? 'resident');
    if (app.save.fails[id] >= 2 && here > 0) items.push({ label: `LOWER DIFFICULTY: ${DIFFICULTY[diffs[here - 1]].label}`, id: 'lower', diff: diffs[here - 1] });
    items.push({ label: 'QUIT TO MENU', id: 'quit' });
    this.menu = new Menu(app, items, { y: 118, rowH: 18, width: 240 });
    this.flat = 0;
    void ctx;
  }
  update(ctx) {
    const r = this.menu.update(ctx);
    if (!r || r === 'back') return;
    if (r.id === 'retry') this.stage.retryStage();
    else if (r.id === 'restart') this.stage.restart();
    else if (r.id === 'lower') { app.save.difficulty = r.diff; app.persist(); this.stage.nextDifficulty = r.diff; this.stage.opts.difficulty = r.diff; this.stage.restart(); } else if (r.id === 'quit') import('../stages/flow.js').then(({ backToMain }) => backToMain());
  }
  draw(ctx) {
    const { hud } = ctx, W = hud.width, H = hud.height;
    hud.clear();
    hud.rect(0, 0, W, H, 0x12060a);
    const y = 42;
    hud.rect(10, y, W - 20, 1, 0xff3a3a);
    const t = 'TIME OF DEATH...', tw = hud.measure(t, 2).width;
    hud.text(Math.round(W / 2 - tw / 2), 58, t, { scale: 2, color: 0xff6b6b });
    const why = WHY[this.stage.sim.loseWhy] ?? 'WE LOST HIM.', ww = hud.measure(why).width;
    hud.text(Math.round(W / 2 - ww / 2), 84, why, { color: 0xffffff });
    const hint = 'RETRYING CAPS YOUR RANK AT B.', hw = hud.measure(hint).width;
    hud.text(Math.round(W / 2 - hw / 2), 96, hint, { color: 0x8a93a6 });
    this.menu.draw(hud);
    app.prompts.strip(hud, 8, H - 13, [['confirm', 'SELECT']]);
  }
}
