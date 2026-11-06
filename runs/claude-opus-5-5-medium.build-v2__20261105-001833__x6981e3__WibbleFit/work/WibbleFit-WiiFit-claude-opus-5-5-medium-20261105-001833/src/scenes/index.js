// Every scene by id. App.go uses this; it avoids import cycles.
import { App } from '../app.js';
import { Nav } from '../ui/menu.js';
import { PauseScreen } from '../ui/screens/pause.js';
import { HeaderScene } from './activity/header.js';
import { HoopScene } from './activity/hoop.js';
import { JogScene } from './activity/jog.js';
import { LongStandScene } from './activity/longstand.js';
import { PierScene } from './activity/pier.js';
import { PosesScene } from './activity/poses.js';
import { RepsScene } from './activity/reps.js';
import { SlacklineScene } from './activity/slackline.js';
import { StepScene } from './activity/step.js';
import { TrayScene } from './activity/tray.js';
import { EndingScene } from './ending.js';
import { FerryScene } from './ferry.js';
import { HubScene } from './hub.js';
import { JoinScene, MedleyScene } from './medley.js';
import { JarScene, LockerScene, RecordsScene } from './places.js';
import { ReportScene } from './report.js';
import { TitleScene } from './title.js';
import { ViewerScene } from './viewer.js';
import { WeighInScene } from './weighin.js';
import { ACT } from '../data/activities.js';

const KINDS = { poses: PosesScene, reps: RepsScene, hoop: HoopScene, step: StepScene, header: HeaderScene, slackline: SlacklineScene, tray: TrayScene, jog: JogScene, pier: PierScene, longstand: LongStandScene };
export function registerScenes() {
  Object.assign(App.scenes, {
    title: (a) => new TitleScene(a), hub: (a) => new HubScene(a), weighin: (a) => new WeighInScene(a), report: (a) => new ReportScene(a), ferry: (a) => new FerryScene(a), ending: (a) => new EndingScene(a),
    jar: (a) => new JarScene(a), records: (a) => new RecordsScene(a), locker: (a) => new LockerScene(a), join: (a) => new JoinScene(a), medley: (a) => new MedleyScene(a), viewer: (a) => new ViewerScene(a),
    activity: (a) => new KINDS[ACT[a.id].scene](a),
    pauseOverlay: () => new PauseScreen(), Nav,
  });
}
export { TitleScene, MedleyScene };
