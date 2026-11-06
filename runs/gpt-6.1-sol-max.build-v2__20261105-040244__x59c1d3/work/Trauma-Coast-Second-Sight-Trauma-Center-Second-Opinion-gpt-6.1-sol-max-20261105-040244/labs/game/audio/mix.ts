/** @file A quiet adaptive soundtrack, synthesized voices, heartbeat and audible confirmation of every tool. */
import { createAudio, type EngineFrame } from '../../../engine';
import type { Operation } from '../data/types';
import type { Preferences } from '../app/settings';
import { heartRate } from '../scenes/op/gift';
import { Voices } from './voice';
import './data';
export class Soundtrack {
  audio = createAudio();
  voices = new Voices();
  last = 0;
  world: object | null = null;
  beat = -1;
  song = '';
  analyser: AnalyserNode | null = null;
  voiceReady = false;
  seen = new Set<string>();
  ambience = false;
  choir = -1;
  gala = -1;
  constructor() {
    this.audio.volume('master', 0.7);
    this.audio.volume('music', 0.1);
  }
  theme(name: string): void {
    if (this.song === name) return;
    this.song = name;
    this.audio.music(`song:hl-${name}`);
  }
  say(who: string, text: string, prefs: Preferences): void {
    this.audio.duck(1);
    this.voices.speak(who, text, prefs.voice * prefs.master);
  }
  frame(f: EngineFrame, p: Preferences, s?: Operation): void {
    this.audio.volume('master', p.master);
    const still = s?.seats.some((q) => q.giftKind === 'still' && q.giftUntil > s.tick);
    this.audio.volume('music', p.music * (still ? 0.45 : 1));
    this.audio.volume('effects', p.effects);
    this.audio.update(f.camera);
    if (this.voices.gain) this.voices.gain.gain.value = p.voice * p.master * this.voices.level;
    const context = this.audio.context;
    if (context && !this.voiceReady) {
      this.voiceReady = true;
      void this.voices.init(context).then(() => {
        this.analyser = context.createAnalyser();
        this.voices.gain?.connect(this.analyser);
      });
    }
    if (this.audio.context && !this.ambience)
      this.ambience = !!this.audio.play('sfx:hl-rain', { vol: 0.12, loop: true });
    if (!s) return;
    if (this.world !== f.world) {
      this.world = f.world;
      this.last = 0;
      this.seen.clear();
      this.choir = -1;
      this.gala = -1;
      this.beat = -1;
    }
    this.audio.intensity(
      Math.min(...s.patients) < 25
        ? 1
        : s.targets.some((t) => !t.done && ['lull', 'solace', 'mercy', 'reverie'].includes(t.kind))
          ? 0.75
          : 0.2,
    );
    if (s.status === 'playing') {
      const strain = s.targets.find(
        (t) => !t.done && ['lull', 'matron', 'solace', 'reverie', 'balm', 'mercy'].includes(t.kind),
      );
      this.theme(s.caseId === 'mercy' ? 'mercy' : strain ? 'strain' : 'calm');
      for (const t of s.targets)
        if (
          !t.done &&
          ['lull', 'matron', 'solace', 'reverie', 'balm', 'mercy'].includes(t.kind) &&
          !this.seen.has(t.kind)
        ) {
          this.seen.add(t.kind);
          this.audio.play('sfx:hl-signature-' + t.kind);
        }
      if (s.caseId === 'mercy') {
        const bar = Math.floor(s.fieldTicks / 24000);
        if (bar !== this.choir) {
          this.choir = bar;
          this.voices.sing([57, 60, 64], p.voice * p.master);
        }
      }
      if (s.caseId === 'gala-night') {
        const bar = Math.floor(s.fieldTicks / 90000);
        if (bar !== this.gala) {
          this.gala = bar;
          this.say('voss', 'A gentler world is waiting.', p);
          this.audio.stinger('song:hl-jingle', { vol: 0.5 });
        }
      }
    }
    const beat = Math.floor(
      (((s.seats.some((q) => q.pulseAt) ? s.tick * 100 : s.fieldTicks) / 6000) * heartRate(s)) / 60,
    );
    if (beat !== this.beat) {
      this.beat = beat;
      this.audio.play(s.code ? 'sfx:hl-flat' : 'sfx:hl-beep', {
        vol: s.targets.some((t) => !t.done && t.kind === 'lull') ? 0.13 : 0.45,
      });
    }
    const mapping: Record<string, string> = {
      switch: 'clack',
      rating: 'good',
      stitch: 'stitch',
      refusal: 'no',
      shock: 'shock',
      binder: 'syringe',
      inject: 'syringe',
      scan: 'scanner',
      hit: 'alarm',
      gift: 'good',
      drama: 'shock',
      lost: 'flat',
    };
    for (const e of s.events) {
      if (e.n <= this.last) continue;
      this.last = e.n;
      if (mapping[e.type]) this.audio.play(`sfx:hl-${mapping[e.type]}`);
    }
    const seat = s.seats[0];
    if (seat.held && s.tick % 15 === 0)
      this.audio.play(
        `sfx:hl-${['cut', 'forceps', 'stitch', 'drain', 'laser', 'syringe', 'gel', 'scanner'][seat.tool]}`,
        { vol: 0.2 },
      );
  }
  silence(): void {
    this.audio.mute(true);
    this.voices.stop();
  }
}
