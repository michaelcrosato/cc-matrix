/** @file A looping real-bot kiosk shift after ten idle seconds, with input-consuming wakeup and no progress saves. */
import type { Director } from './director';
const clips = [
  ['op:first-cut', 0, 18],
  ['op:crosstalk', 0, 22],
  ['story:1:after', 0, 10],
  ['op:struck-off', 1, 25],
  ['op:reverie', 2, 22],
  ['op:gala-night', 0, 22],
  ['op:mercy', 1, 22],
  ['op:mercy', 9, 14],
] as const;
export class Attractor {
  active = false;
  idle = 0;
  clock = 0;
  index = -1;
  d: Director;
  set: (key: string, value: unknown) => void;
  changed: (active: boolean) => void;
  constructor(d: Director, set: (key: string, value: unknown) => void, changed: (active: boolean) => void) {
    this.d = d;
    this.set = set;
    this.changed = changed;
  }
  activity(): boolean {
    const woke = this.active;
    this.idle = 0;
    if (woke) this.exit();
    return woke;
  }
  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.changed(false);
    this.clock = 0;
    this.index = -1;
    document.querySelectorAll('.demo-banner,.demo-prompt').forEach((e) => e.remove());
    this.set('game.autoplay', false);
    this.set('game.attract', false);
    this.d.go('title', 'title');
  }
  frame(dt: number, rebinding = false, front = true): void {
    if (
      !this.active &&
      (!front || !['title', 'board', 'about', 'scrub', 'postcards', 'settings', 'handbook'].includes(this.d.screen))
    ) {
      this.idle = 0;
      return;
    }
    this.idle += dt;
    if (!this.active) {
      if (
        this.idle < 10 ||
        rebinding ||
        !['title', 'board', 'about', 'scrub', 'postcards', 'settings', 'handbook'].includes(this.d.screen)
      )
        return;
      this.active = true;
      this.changed(true);
      this.clock = 0;
      this.set('game.autoplay', true);
      this.set('game.attract', true);
    }
    this.clock += dt;
    const total = clips.reduce((n, c) => n + c[2], 6),
      clock = this.clock % total;
    let elapsed = 6,
      index = -1;
    for (let i = 0; i < clips.length; i++) {
      if (clock >= elapsed && clock < elapsed + clips[i][2]) index = i;
      elapsed += clips[i][2];
    }
    if (index !== this.index) {
      this.index = index;
      if (index < 0) this.d.go('title', 'title');
      else {
        const [run, phase] = clips[index];
        if (run.startsWith('story')) {
          this.d.caseIndex = 1;
          this.d.part = 'after';
          this.d.beat = 0;
          this.d.go('story', run);
        } else {
          this.d.caseIndex =
            run === 'op:first-cut'
              ? 0
              : run === 'op:crosstalk'
                ? 2
                : run === 'op:struck-off'
                  ? 4
                  : run === 'op:reverie'
                    ? 5
                    : run === 'op:gala-night'
                      ? 6
                      : 7;
          this.d.go('op', run, phase);
        }
      }
    }
    if (!document.querySelector('.demo-banner')) {
      const banner = document.createElement('div');
      banner.className = 'demo-banner';
      banner.textContent = 'DEMO / THE NIGHT SHIFT';
      const prompt = document.createElement('div');
      prompt.className = 'demo-prompt';
      prompt.textContent = 'Any button to take the shift';
      document.getElementById('app')!.append(banner, prompt);
    }
  }
}
