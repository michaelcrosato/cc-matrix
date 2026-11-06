// The way screens connect.
import { app } from '../core/app.js';
import { go } from './stage.js';
import { CAMPAIGN, recordOp } from '../sim/campaign.js';
import { MainMenuStage, TitleStage } from './title.js';
import { StoryStage } from './story.js';
import { BriefingStage } from './briefing.js';
import { ResultsStage } from './results.js';
import { OperationStage } from './operation.js';
import { CreditsStage } from './about.js';
import { AttractStage } from './attract.js';
import { REEL } from './attract.js';
import { LogStage } from './log.js';

export const backToMain = () => go(new MainMenuStage());
export const backToTitle = () => go(new TitleStage());

export function runCampaign(i) {
  const entry = CAMPAIGN[i];
  app.save.next = i;
  app.persist();
  if (!entry) { go(new TitleStage()); return; }
  if (entry.scene) { go(new StoryStage({ scene: entry.scene, onDone: () => runCampaign(i + 1) })); return; }
  if (entry.op) { go(new BriefingStage({ op: entry.op, onGo: () => go(new OperationStage({ op: entry.op, onWin: (res) => { recordOp(app.save, entry.op, res); app.save.next = i + 1; app.persist(); go(new ResultsStage({ op: entry.op, res, onDone: () => runCampaign(i + 1) })); } }), 'iris') })); return; }
  if (entry.credits) { app.save.finished = true; app.persist(); go(new CreditsStage({ onDone: () => go(new TitleStage()) })); }
}
export const resultsThenBack = (op) => (res) => { recordOp(app.save, op, res); app.persist(); go(new ResultsStage({ op, res, onDone: backToMain })); };
export const replayOp = (op) => go(new BriefingStage({ op, onGo: () => go(new OperationStage({ op, onWin: (res) => { recordOp(app.save, op, res); app.persist(); go(new ResultsStage({ op, res, onDone: () => go(new LogStage()) })); } }), 'iris') }));

/* ---- attract ---- */
export function startAttract() { app.demo = true; app.attractIndex = app.attractIndex ?? 0; playReel(); }
function playReel() {
  const seg = REEL[app.attractIndex % REEL.length];
  app.attractIndex++;
  go(new AttractStage(seg));
}
app.nextAttract = playReel;
app.exitAttract = () => { app.demo = false; app.swallow = 0.25; go(new TitleStage()); };
