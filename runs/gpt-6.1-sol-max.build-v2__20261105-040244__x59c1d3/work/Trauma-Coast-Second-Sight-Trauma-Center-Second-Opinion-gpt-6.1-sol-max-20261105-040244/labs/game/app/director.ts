/** @file DOM-free story flow, case unlocks, score records, postcards and replayable Free Surgery. */
import { CASES } from '../data/cases';
import { storyFor } from '../data/story';
import type { Operation } from '../data/types';
import { rank } from '../scenes/op/state';
export type Screen =
  | 'title'
  | 'board'
  | 'postcards'
  | 'story'
  | 'briefing'
  | 'op'
  | 'debrief'
  | 'postcard'
  | 'failed'
  | 'credits'
  | 'pause'
  | 'settings'
  | 'handbook'
  | 'scrub'
  | 'about'
  | 'dev';
export interface Progress {
  unlocked: number;
  ended: boolean;
  ranks: Record<string, string>;
  postcards: Record<string, string>;
  checkpoint: { caseIndex: number; phase: number } | null;
}
export const freshProgress = (): Progress => ({
  unlocked: 1,
  ended: false,
  ranks: {},
  postcards: {},
  checkpoint: null,
});
export class Director {
  screen: Screen = 'title';
  previous: Screen = 'title';
  caseIndex = 0;
  part: 'before' | 'after' = 'before';
  beat = 0;
  free = false;
  last: Operation | null = null;
  revision = 0;
  progress: Progress;
  onChange: (run?: string, phase?: number) => void;
  constructor(progress = freshProgress(), onChange: (run?: string, phase?: number) => void = () => {}) {
    this.progress = progress;
    this.onChange = onChange;
  }
  go(screen: Screen, run?: string, phase = 0): void {
    this.screen = screen;
    this.revision++;
    this.onChange(run, phase);
  }
  story(part: 'before' | 'after'): void {
    this.part = part;
    this.beat = 0;
    this.go('story', `story:${this.caseIndex}:${part}`);
  }
  newShift(): void {
    this.caseIndex = 0;
    this.free = false;
    this.story('before');
  }
  advanceStory(): void {
    const story = storyFor(this.caseIndex, this.part);
    if (++this.beat < story.beats.length) {
      this.revision++;
      return;
    }
    if (this.part === 'before') this.go('briefing');
    else if (this.caseIndex === 7) {
      this.progress.ended = true;
      this.progress.unlocked = 8;
      this.go('credits', 'title');
    } else {
      this.caseIndex++;
      this.story('before');
    }
  }
  skipStory(): void {
    this.beat = storyFor(this.caseIndex, this.part).beats.length;
    this.advanceStory();
  }
  start(phase = 0): void {
    this.go('op', `op:${CASES[this.caseIndex]?.id ?? 'gala-shift'}`, phase);
  }
  finish(s: Operation, allowSave = true): void {
    this.last = s;
    if (s.status !== 'won') {
      this.go('failed');
      return;
    }
    if (allowSave && !s.dev) {
      const r = rank(s),
        id = s.caseId,
        order = ['C', 'B', 'A', 'S', '★'];
      if (order.indexOf(r) > order.indexOf(this.progress.ranks[id] ?? '')) this.progress.ranks[id] = r;
      const c = CASES.find((c) => c.id === id);
      if (c) this.progress.postcards[id] = c.postcard[Math.max(0, order.indexOf(r))] ?? c.postcard[3];
      this.progress.unlocked = Math.min(8, Math.max(this.progress.unlocked, this.caseIndex + 2));
      this.progress.checkpoint = null;
    }
    this.go('debrief');
  }
  continueResult(): void {
    if (this.screen === 'debrief') this.go('postcard');
    else if (this.free || this.caseIndex === 8) this.go('board', 'title');
    else this.story('after');
  }
}
