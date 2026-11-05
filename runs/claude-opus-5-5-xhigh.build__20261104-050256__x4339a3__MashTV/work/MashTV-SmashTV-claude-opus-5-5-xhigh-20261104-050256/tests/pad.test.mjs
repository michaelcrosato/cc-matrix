// pad: TASK.md's controller-first UI with a (stubbed) standard-mapping DualSense in Chromium: menus, play, pause, glyphs, attract
import { run } from '../tools/pad-e2e.mjs';
export const suites = { async pad(t) { await run((name, ok, info) => t.check(name, ok, info)); } };
