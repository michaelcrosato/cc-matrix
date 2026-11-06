export class Sound {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.65;
		this.muted = false;
		this.step = 0;
		this.nextNote = 0;
		this.eventsPlayed = 0;
		this.voiceCount = 0;
		this.notesPlayed = 0;
	}
	makeGraph(ctx) {
		this.master = ctx.createGain();
		this.master.gain.value = 0.75;
		this.music = ctx.createGain();
		this.music.gain.value = this.musicVolume;
		this.effects = ctx.createGain();
		this.effects.gain.value = this.effectsVolume;
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 256;
		this.music.connect(this.master);
		this.effects.connect(this.master);
		this.master.connect(this.analyser);
		this.analyser.connect(ctx.destination);
	}
	async unlock() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.makeGraph(this.ctx);
			this.nextNote = this.ctx.currentTime + 0.08;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	setVolume(music, effects, muted = this.muted) {
		this.musicVolume = music;
		this.effectsVolume = effects;
		this.muted = muted;
		if (this.ctx) {
			this.music.gain.setTargetAtTime(music, this.ctx.currentTime, 0.025);
			this.effects.gain.setTargetAtTime(effects, this.ctx.currentTime, 0.025);
			this.master.gain.setTargetAtTime(
				muted ? 0 : 0.75,
				this.ctx.currentTime,
				0.025,
			);
		}
	}
	tone(
		freq,
		duration,
		when,
		gain = 0.15,
		type = "triangle",
		bus = this.effects,
		slide,
	) {
		if (!this.ctx || !bus) return;
		const o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(20, freq), when);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(20, slide),
				when + duration,
			);
		g.gain.setValueAtTime(0.0001, when);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		o.connect(g);
		g.connect(bus);
		o.start(when);
		o.stop(when + duration + 0.01);
	}
	noise(duration, when, gain, cutoff = 1800) {
		if (!this.ctx) return;
		const b = this.ctx.createBuffer(
				1,
				Math.floor(this.ctx.sampleRate * duration),
				this.ctx.sampleRate,
			),
			d = b.getChannelData(0);
		let s = 71;
		for (let i = 0; i < d.length; i++) {
			s = (s * 16807) % 2147483647;
			d[i] = ((s / 2147483647) * 2 - 1) * (1 - i / d.length);
		}
		const src = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		src.buffer = b;
		f.type = "lowpass";
		f.frequency.value = cutoff;
		g.gain.value = gain;
		src.connect(f);
		f.connect(g);
		g.connect(this.effects);
		src.start(when);
	}
	speak(mood = "chipper") {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		this.voiceCount++;
		const syllables =
			mood === "crook" ? [230, 180, 310, 210, 160] : [420, 560, 370, 610, 470];
		for (let i = 0; i < syllables.length; i++) {
			const o = this.ctx.createOscillator(),
				filter = this.ctx.createBiquadFilter(),
				g = this.ctx.createGain();
			o.type = "sawtooth";
			o.frequency.setValueAtTime(syllables[i], t + i * 0.085);
			o.frequency.linearRampToValueAtTime(
				syllables[i] * 1.2,
				t + i * 0.085 + 0.055,
			);
			filter.type = "bandpass";
			filter.frequency.value = [850, 1500, 2300, 1100, 1800][i];
			filter.Q.value = 5;
			g.gain.setValueAtTime(0, t + i * 0.085);
			g.gain.linearRampToValueAtTime(0.11, t + i * 0.085 + 0.008);
			g.gain.linearRampToValueAtTime(0, t + i * 0.085 + 0.07);
			o.connect(filter);
			filter.connect(g);
			g.connect(this.effects);
			o.start(t + i * 0.085);
			o.stop(t + i * 0.085 + 0.08);
		}
	}
	effect(name) {
		if (!this.ctx || this.muted) return;
		this.eventsPlayed++;
		const t = this.ctx.currentTime;
		if (name === "jump")
			this.tone(260, 0.18, t, 0.12, "triangle", this.effects, 650);
		else if (name === "pickup")
			[740, 990, 1480].forEach((f, i) => {
				this.tone(f, 0.12, t + i * 0.045, 0.1);
			});
		else if (name === "whistle") {
			this.tone(1350, 0.24, t, 0.14, "sine", this.effects, 1900);
			this.tone(1650, 0.22, t + 0.13, 0.1, "sine", this.effects, 1450);
		} else if (name === "hit" || name === "badge") {
			this.noise(0.16, t, 0.2, 850);
			this.tone(170, 0.32, t, 0.2, "square", this.effects, 45);
		} else if (name === "ding" || name === "lift") {
			this.tone(830, 0.35, t, 0.08, "sine");
			this.tone(1108, 0.45, t + 0.12, 0.07, "sine");
		} else if (name === "plane") {
			this.tone(100, 0.6, t, 0.055, "sawtooth", this.effects, 170);
			this.tone(105, 0.6, t, 0.035, "triangle", this.effects, 160);
		} else if (name === "caught" || name === "victory") {
			[523, 659, 784, 1047, 1319].forEach((f, i) => {
				this.tone(f, 0.35, t + i * 0.1, 0.14, "triangle");
			});
			this.speak("chipper");
		} else if (name === "gameover")
			[392, 330, 262, 196].forEach((f, i) => {
				this.tone(f, 0.35, t + i * 0.16, 0.13);
			});
		else if (name === "case") this.speak("chipper");
		else if (name === "rummage") this.speak("crook");
		else if (name === "menu") this.tone(740, 0.07, t, 0.035, "sine");
	}
	update(mode) {
		if (this.ctx?.state !== "running" || this.muted || mode === "ended") return;
		const now = this.ctx.currentTime;
		if (this.nextNote < now - 0.3) this.nextNote = now + 0.025;
		const melody = [
			76, 0, 79, 81, 79, 76, 74, 72, 0, 72, 74, 76, 74, 72, 69, 67, 72, 0, 76,
			79, 81, 79, 76, 74, 72, 69, 67, 69, 72, 0, 0, 0, 77, 0, 81, 84, 81, 77,
			76, 74, 0, 74, 76, 77, 76, 74, 71, 67, 76, 0, 79, 83, 81, 79, 77, 74, 72,
			76, 79, 76, 72, 0, 67, 0,
		];
		const freq = (n) => 440 * 2 ** ((n - 69) / 12);
		const beat = 60 / 156 / 2;
		while (this.nextNote < now + 0.16) {
			const s = this.step++ % melody.length,
				at = this.nextNote,
				n = melody[s];
			if (n) {
				this.tone(freq(n), beat * 0.8, at, 0.2, "triangle", this.music);
				this.tone(freq(n) * 2, beat * 0.46, at, 0.028, "sine", this.music);
				this.notesPlayed++;
			}
			if (s % 2 === 0) {
				const root = s < 32 ? 48 : 53;
				this.tone(
					freq(root - (s % 4 ? -7 : 0)),
					0.16,
					at,
					0.24,
					"triangle",
					this.music,
				);
			} else {
				const root = s < 32 ? 60 : 65;
				[0, 4, 7].forEach((k) => {
					this.tone(freq(root + k), 0.075, at, 0.075, "triangle", this.music);
				});
			}
			this.nextNote += beat * (s % 2 ? 0.84 : 1.16);
		}
	}
	silence() {
		if (this.ctx) this.master.gain.setValueAtTime(0, this.ctx.currentTime);
		this.muted = true;
	}
	rms() {
		if (!this.analyser) return 0;
		const data = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(data);
		return Math.sqrt(data.reduce((a, b) => a + b * b, 0) / data.length);
	}
	static async audit() {
		const ctx = new OfflineAudioContext(2, 44100, 44100),
			s = new Sound();
		s.ctx = ctx;
		s.makeGraph(ctx);
		s.tone(523.25, 0.8, 0, 0.2, "triangle", s.music);
		s.effect("pickup");
		s.speak();
		const b = await ctx.startRendering(),
			d = b.getChannelData(0);
		let peak = 0,
			sum = 0;
		for (const v of d) {
			peak = Math.max(peak, Math.abs(v));
			sum += v * v;
		}
		return {
			rms: Math.sqrt(sum / d.length),
			peak,
			musicDefault: s.musicVolume,
			voices: s.voiceCount,
			channels: b.numberOfChannels,
		};
	}
}
