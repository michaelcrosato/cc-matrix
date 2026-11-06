// Every scene, registered with App so scenes never import each other in circles.
import { App } from '../app.js';
import { ACTIVITIES } from '../data/activities.js';
import { TitleScene } from './title.js';
import { PoseActivity } from './activity/poses.js';
import { RepsActivity } from './activity/reps.js';
import { HoopActivity } from './activity/hoop.js';
import { StepActivity } from './activity/step.js';
import { HeaderActivity } from './activity/header.js';
import { SlacklineActivity } from './activity/slackline.js';
import { TrayActivity } from './activity/tray.js';
import { PierActivity } from './activity/pier.js';
import { JogActivity } from './activity/jog.js';
import { LongStandActivity } from './activity/longstand.js';
import { HubScene } from './hub.js';
import { WeighInScene } from './weighin.js';
import { ReportScene } from './report.js';
import { JarScene } from './jar.js';
import { RecordsScene } from './records.js';
import { LockerScene } from './locker.js';
import { FerryScene } from './ferry.js';
import { EndingScene } from './ending.js';
import { ViewerScene } from './viewer.js';
import { MedleyScene } from './medley.js';
import { JoinScene } from './join.js';
import './attract.js';
import '../ui/screens/pause.js';

export const ACTIVITY_SCENES = {
  poses: PoseActivity, reps: RepsActivity, hoop: HoopActivity, step: StepActivity, header: HeaderActivity,
  slackline: SlacklineActivity, tray: TrayActivity, pier: PierActivity, jog: JogActivity, longstand: LongStandActivity,
};

App.registerScenes({
  title: (a) => new TitleScene(a),
  hub: (a) => new HubScene(a),
  weighin: (a) => new WeighInScene(a),
  report: (a) => new ReportScene(a),
  jar: (a) => new JarScene(a),
  records: (a) => new RecordsScene(a),
  locker: (a) => new LockerScene(a),
  ferry: (a) => new FerryScene(a),
  ending: (a) => new EndingScene(a),
  viewer: (a) => new ViewerScene(a),
  medley: (a) => new MedleyScene(a),
  join: (a) => new JoinScene(a),
  activity: (a) => new ACTIVITY_SCENES[ACTIVITIES[a.id].scene](a),
});

export function makeScene(id, args = {}) { return App.scenes[id](args); }
