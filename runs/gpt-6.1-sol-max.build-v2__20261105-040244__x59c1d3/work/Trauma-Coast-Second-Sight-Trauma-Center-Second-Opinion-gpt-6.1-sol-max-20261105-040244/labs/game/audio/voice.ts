/** @file Formant gibberish syllables rendered offline per character, then spoken with punctuation and emphasis. */
const profiles: Record<string, [number, number, number]> = {
  wren: [250, 900, 0.058],
  odie: [145, 700, 0.075],
  chief: [94, 560, 0.095],
  sabine: [175, 800, 0.08],
  voss: [270, 1200, 0.07],
  patient: [195, 850, 0.08],
};
export class Voices {
  buffers = new Map<string, AudioBuffer[]>();
  gain: GainNode | null = null;
  context: BaseAudioContext | null = null;
  sources: AudioBufferSourceNode[] = [];
  generation = 0;
  level = 0.55;
  async init(context: BaseAudioContext): Promise<void> {
    if (this.context === context) return;
    this.context = context;
    this.gain = context.createGain();
    this.gain.gain.value = 0.35;
    this.gain.connect(context.destination);
    for (const [who, [pitch, formant]] of Object.entries(profiles)) {
      const list: AudioBuffer[] = [];
      for (let i = 0; i < 16; i++) {
        const offline = new OfflineAudioContext(1, Math.ceil(context.sampleRate * 0.105), context.sampleRate),
          osc = offline.createOscillator(),
          filter = offline.createBiquadFilter(),
          f2 = offline.createBiquadFilter(),
          g = offline.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(pitch * (0.86 + i * 0.023), 0);
        osc.frequency.exponentialRampToValueAtTime(pitch * (0.93 + i * 0.025), 0.095);
        filter.type = 'bandpass';
        filter.frequency.value = formant + (i % 4) * 140;
        filter.Q.value = 2.5;
        f2.type = 'peaking';
        f2.frequency.value = 1800 + (i % 3) * 300;
        f2.Q.value = 1.8;
        f2.gain.value = 8;
        g.gain.setValueAtTime(0, 0);
        g.gain.linearRampToValueAtTime(0.28, 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, 0.1);
        osc.connect(filter).connect(f2).connect(g).connect(offline.destination);
        osc.start();
        osc.stop(0.103);
        list.push(await offline.startRendering());
      }
      this.buffers.set(who, list);
    }
  }
  speak(who: string, text: string, volume: number): void {
    const context = this.context,
      gain = this.gain,
      buffers = this.buffers.get(who) ?? this.buffers.get('wren');
    if (!context || !gain || !buffers) return;
    this.stop();
    this.level = 0.55;
    gain.gain.value = volume * this.level;
    let when = context.currentTime + 0.02;
    const pace = profiles[who]?.[2] ?? 0.07;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/[.,!?—]/.test(char)) {
        when += pace * 2;
        continue;
      }
      if (char === ' ') {
        when += pace * 0.5;
        continue;
      }
      const source = context.createBufferSource();
      source.buffer = buffers[(char.charCodeAt(0) + i * 3) % 16];
      source.playbackRate.value =
        (char === char.toUpperCase() ? 1.1 : 1) * (text.endsWith('?') ? 1 + (i / text.length) * 0.25 : 1);
      source.connect(gain);
      source.start(when);
      this.sources.push(source);
      when += pace;
    }
  }
  sing(notes: number[], volume: number): void {
    const c = this.context,
      g = this.gain,
      b = this.buffers.get('sabine');
    if (!c || !g || !b) return;
    this.level = 0.25;
    g.gain.value = volume * this.level;
    for (const [i, note] of notes.entries()) {
      const s = c.createBufferSource();
      s.buffer = b[(i * 5) % 16];
      s.loop = true;
      s.playbackRate.value = Math.pow(2, (note - 60) / 12);
      s.connect(g);
      s.start(c.currentTime + 0.02);
      s.stop(c.currentTime + 1.5);
      this.sources.push(s);
    }
  }
  stop(): void {
    for (const s of this.sources)
      try {
        s.stop();
      } catch {}
    this.sources = [];
  }
}
