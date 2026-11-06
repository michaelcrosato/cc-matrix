class NightAudio {
	constructor() {
		this.context = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.nextNote = 0;
		this.step = 0;
		this.active = false;
		this.phase = "walk";
		this.events = 0;
		this.voiceCount = 0;
		this.musicCount = 0;
	}
	async unlock(providedContext = null) {
		if (!this.context) {
			const A = window.AudioContext || window.webkitAudioContext;
			if (!A && !providedContext) return;
			this.context = providedContext || new A();
			this.master = this.context.createGain();
			this.master.gain.value = 0.72;
			this.master.connect(this.context.destination);
			this.music = this.context.createGain();
			this.music.gain.value = this.musicVolume;
			this.music.connect(this.master);
			this.fx = this.context.createGain();
			this.fx.gain.value = this.sfxVolume;
			this.fx.connect(this.master);
			this.analyser = this.context.createAnalyser();
			this.analyser.fftSize = 512;
			this.master.connect(this.analyser);
			this.nextNote = this.context.currentTime + 0.1;
		}
		if (this.context.state === "suspended" && !this.context.startRendering)
			await this.context.resume();
		this.active = true;
	}
	volumes(m, s) {
		this.musicVolume = m;
		this.sfxVolume = s;
		if (this.context) {
			this.music.gain.setTargetAtTime(m, this.context.currentTime, 0.05);
			this.fx.gain.setTargetAtTime(s, this.context.currentTime, 0.05);
		}
	}
	tone(
		freq,
		duration = 0.3,
		type = "sine",
		gain = 0.2,
		delay = 0,
		bus = "fx",
		slide = 0,
	) {
		if (!this.context || !this.active) return;
		const c = this.context,
			t = c.currentTime + delay,
			o = c.createOscillator(),
			g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(20, slide),
				t + duration,
			);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.015);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(this[bus]);
		o.start(t);
		o.stop(t + duration + 0.02);
		this.events++;
	}
	noise(duration = 0.2, gain = 0.2, cutoff = 1100) {
		if (!this.context || !this.active) return;
		const c = this.context,
			b = c.createBuffer(1, c.sampleRate * duration, c.sampleRate),
			d = b.getChannelData(0);
		for (let i = 0; i < d.length; i++)
			d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
		const s = c.createBufferSource(),
			f = c.createBiquadFilter(),
			g = c.createGain();
		s.buffer = b;
		f.type = "lowpass";
		f.frequency.value = cutoff;
		g.gain.value = gain;
		s.connect(f);
		f.connect(g);
		g.connect(this.fx);
		s.start();
		this.events++;
	}
	sfx(kind) {
		if (kind === "pickup") {
			[659, 880, 1174].forEach((f, i) => {
				this.tone(f, 0.28, "sine", 0.2, i * 0.08);
			});
		} else if (kind === "pulse") {
			this.tone(164, 0.8, "sine", 0.35, 0, "fx", 659);
			this.tone(493, 0.6, "triangle", 0.13, 0.08);
			this.noise(0.6, 0.11, 700);
		} else if (kind === "candy") {
			this.tone(1100, 0.1, "triangle", 0.15, 0, "fx", 500);
		} else if (kind === "caught") {
			this.tone(110, 0.7, "sawtooth", 0.12, 0, "fx", 55);
			this.noise(0.25, 0.2, 500);
		} else if (kind === "lift") {
			[220, 330, 440, 554, 659].forEach((f, i) => {
				this.tone(f, 0.65, "triangle", 0.14, i * 0.075);
			});
		} else if (kind === "click") {
			this.tone(680, 0.075, "sine", 0.07);
		} else if (kind === "step") {
			this.noise(0.055, 0.055, 900);
		} else if (kind === "win") {
			[392, 493, 587, 784, 987, 1174].forEach((f, i) => {
				this.tone(f, 1.6, "sine", 0.19, i * 0.18);
			});
		} else if (kind === "wrong") {
			this.tone(180, 0.25, "triangle", 0.16, 0, "fx", 140);
		}
	}
	voice(alien = true, syllables = 5) {
		if (!this.context || !this.active) return;
		this.voiceCount++;
		for (let i = 0; i < syllables; i++) {
			const f = (alien ? 100 : 250) + ((i * 73 + syllables * 31) % 130),
				t = i * 0.115;
			this.tone(f, 0.11, "sawtooth", alien ? 0.065 : 0.032, t, "fx", f * 1.25);
			this.tone(f * 2.8, 0.08, "sine", 0.06, t + 0.01);
		}
	}
	note(n, delay = 0) {
		this.tone([329.63, 440, 659.25][n], 0.65, "sine", 0.28, delay);
		this.tone([659.25, 880, 1318.5][n], 0.4, "triangle", 0.045, delay);
	}
	update(phase) {
		this.phase = phase;
		if (!this.context || !this.active) return;
		const now = this.context.currentTime;
		if (this.nextNote < now - 1) this.nextNote = now + 0.1;
		const flight = phase === "flight" || phase === "ride",
			beat = flight ? 0.31 : 0.53;
		while (this.nextNote < now + 0.18) {
			const melody = [0, 7, 12, 14, 12, 7, 4, 2, 0, 7, 9, 12, 9, 4, 2, -5],
				chords = [
					[0, 4, 7],
					[5, 9, 12],
					[-2, 2, 7],
					[-5, 0, 4],
				],
				root = flight ? 196 : 164.81,
				semi = melody[this.step % 16],
				delay = this.nextNote - now;
			this.tone(
				root * 2 ** (semi / 12),
				beat * 1.6,
				"sine",
				0.34,
				delay,
				"music",
			);
			if (this.step % 4 === 0) {
				const chord = chords[Math.floor(this.step / 4) % 4];
				chord.forEach((s) => {
					this.tone(
						root * 0.5 * 2 ** (s / 12),
						beat * 7,
						"triangle",
						0.09,
						delay,
						"music",
					);
				});
			}
			if (flight && this.step % 2 === 0)
				this.tone(65.4, beat, "triangle", 0.2, delay, "music");
			this.step++;
			this.musicCount++;
			this.nextNote += beat;
		}
	}
	mute(m) {
		if (this.context)
			this.master.gain.setTargetAtTime(
				m ? 0 : 0.72,
				this.context.currentTime,
				0.04,
			);
	}
	levels() {
		if (!this.analyser) return { peak: 0, rms: 0 };
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		return {
			peak: Math.max(...a.map(Math.abs)),
			rms: Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length),
		};
	}
}
window.NightAudio = NightAudio;
