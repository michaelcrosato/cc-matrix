/** @file Story presentation: voiced captions, native portrait framing, Drama Cuts, auto mode and hold-to-skip. */
import type { EngineFrame } from '../../../engine';
import type { UIContext } from '../ui/context';
import { storyFor } from '../data/story';
import { storyCue } from '../view/camera';
export class StoryView {
  c: UIContext;
  clock = 0;
  key = '';
  skipHold = 0;
  constructor(c: UIContext) {
    this.c = c;
  }
  reset(): void {
    this.clock = 0;
    this.key = '';
    this.skipHold = 0;
  }
  frame(f: EngineFrame, attract: boolean): void {
    const { d, prefs, hands, sound } = this.c,
      engine = this.c.engine();
    if (d.screen !== 'story' || !engine?.inspector) return;
    const story = storyFor(d.caseIndex, d.part),
      beat = story.beats[d.beat] ?? story.beats[0],
      key = `${story.id}/${d.beat}`;
    (engine.inspector.input as { axis: (key: string, value: unknown) => void }).axis('game:beat', d.beat);
    if (key !== this.key) {
      this.key = key;
      this.clock = 0;
      sound.say(beat.who, beat.text, prefs);
      sound.theme(beat.who === 'voss' ? 'jingle' : 'story');
      const cast = [...new Set(story.beats.map((b) => b.who))],
        x = -3.5 + cast.indexOf(beat.who) * 1.45;
      Object.assign(storyCue, {
        x: x + 0.8,
        y: 1.9,
        z: 0.1,
        yaw: -12,
        pitch: -4,
        roll: beat.drama && prefs.flashes ? -0.1 : 0,
      });
      if (beat.drama && prefs.flashes) {
        const el = document.getElementById('drama')!;
        el.querySelector('b')!.textContent = beat.drama;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 800);
      }
    }
    this.clock += f.dt;
    if (attract && this.clock > 2) {
      d.beat = (d.beat + 1) % story.beats.length;
      d.revision++;
      this.clock = 0;
    } else if (prefs.auto && this.clock > Math.max(2, beat.text.length * 0.045) / prefs.textSpeed) d.advanceStory();
    const held = Array.from(navigator.getGamepads?.() ?? []).some((p) => p?.buttons[1]?.pressed);
    this.skipHold = hands.keys.has('Escape') || held ? this.skipHold + f.dt : 0;
    if (this.skipHold > 0.75) {
      this.skipHold = 0;
      d.skipStory();
    }
  }
}
