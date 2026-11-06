export class JungleAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.muted = false;
		this.notes = 0;
		this.voices = 0;
		this.stage = 0;
		this.next = 0;
		this.beat = 0;
	}
	init() {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.7;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.fx = this.ctx.createGain();
			this.music.connect(this.master);
			this.fx.connect(this.master);
			this.apply();
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
	}
	apply() {
		if (!this.ctx) return;
		this.music.gain.value = this.muted ? 0 : this.musicVolume;
		this.fx.gain.value = this.muted ? 0 : this.sfxVolume;
	}
	tone(
		freq,
		duration = 0.15,
		type = "triangle",
		volume = 0.3,
		when = 0,
		bus = "fx",
		endFreq = 0,
	) {
		if (!this.ctx) return;
		const t = this.ctx.currentTime + when;
		const o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (endFreq)
			o.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
		g.gain.setValueAtTime(0.001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.002, volume), t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.001, t + duration);
		o.connect(g);
		g.connect(this[bus]);
		o.start(t);
		o.stop(t + duration + 0.02);
		this.notes++;
	}
	noise(duration = 0.15, volume = 0.15, high = 800) {
		if (!this.ctx) return;
		const c = this.ctx,
			n = Math.ceil(c.sampleRate * duration),
			b = c.createBuffer(1, n, c.sampleRate),
			a = b.getChannelData(0);
		let seed = 17;
		for (let i = 0; i < n; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			a[i] = ((seed / 4294967296) * 2 - 1) * (1 - i / n);
		}
		const s = c.createBufferSource(),
			f = c.createBiquadFilter(),
			g = c.createGain();
		f.type = "highpass";
		f.frequency.value = high;
		g.gain.value = volume;
		s.buffer = b;
		s.connect(f);
		f.connect(g);
		g.connect(this.fx);
		s.start();
		this.notes++;
	}
	sfx(name) {
		if (!this.ctx) return;
		if (name === "jump") {
			this.tone(220, 0.15, "square", 0.12, 0, "fx", 660);
			this.noise(0.09, 0.035, 1500);
		}
		if (name === "grab") {
			this.tone(440, 0.08, "triangle", 0.4);
			this.tone(660, 0.12, "triangle", 0.3, 0.07);
		}
		if (name === "coin") {
			this.tone(880, 0.08, "sine", 0.35);
			this.tone(1320, 0.17, "sine", 0.28, 0.065);
		}
		if (name === "swat") {
			this.noise(0.12, 0.22);
			this.tone(180, 0.13, "triangle", 0.3, 0, "fx", 60);
		}
		if (name === "hit") {
			this.noise(0.3, 0.24, 200);
			this.tone(200, 0.3, "sawtooth", 0.17, 0, "fx", 55);
		}
		if (name === "bubble") {
			this.tone(260, 0.12, "sine", 0.12, 0, "fx", 720);
		}
		if (name === "stamp") {
			[0, 4, 7, 12].forEach((n, i) => {
				this.tone(330 * 2 ** (n / 12), 0.3, "triangle", 0.3, i * 0.1);
			});
			this.voice(1);
		}
		if (name === "win") {
			[0, 4, 7, 12, 7, 12, 16].forEach((n, i) => {
				this.tone(330 * 2 ** (n / 12), 0.4, "triangle", 0.35, i * 0.14);
			});
			this.voice(2);
		}
		if (name === "menu") this.tone(540, 0.06, "triangle", 0.2);
	}
	voice(mood = 0) {
		if (!this.ctx) return;
		this.voices++;
		const syllables =
			mood === 2
				? [460, 630, 520, 780, 610, 920]
				: mood === 1
					? [410, 560, 720, 580]
					: [260, 340, 210];
		syllables.forEach((f, i) => {
			this.tone(f, 0.075, "sawtooth", 0.035, i * 0.085, "fx", f * 0.75);
			this.tone(f * 2.1, 0.06, "sine", 0.05, i * 0.085);
		});
	}
	tick(active, stage) {
		if (!this.ctx || this.muted || !active) {
			if (this.ctx) this.next = this.ctx.currentTime + 0.06;
			return;
		}
		this.stage = stage;
		if (this.ctx.currentTime + 0.12 < this.next) return;
		const b = this.beat++,
			scale = [0, 4, 7, 9, 7, 4, 2, 7, 0, 4, 9, 12, 11, 7, 4, 2];
		const root = [196, 164.81, 220, 146.83][stage];
		const offset = Math.max(0, this.next - this.ctx.currentTime);
		if (b % 2 === 0)
			this.tone(
				(root / 2) * (b % 8 === 6 ? 1.5 : 1),
				0.17,
				"triangle",
				0.32,
				offset,
				"music",
			);
		if (stage === 3 || b % 2 === 0)
			this.tone(b % 4 === 0 ? 90 : 140, 0.1, "sine", 0.4, offset, "music", 40);
		this.tone(
			root * 2 ** (scale[b % 16] / 12),
			0.16,
			stage === 1 ? "sine" : "triangle",
			0.21,
			offset,
			"music",
		);
		this.next = this.ctx.currentTime + 0.19;
	}
	stop() {
		if (this.ctx) {
			this.master.gain.value = 0;
		}
	}
	wake() {
		if (this.ctx) {
			this.master.gain.value = 0.7;
			this.ctx.resume();
		}
	}
	level() {
		if (!this.analyser) return 0;
		const v = new Float32Array(512);
		this.analyser.getFloatTimeDomainData(v);
		return Math.sqrt(v.reduce((a, x) => a + x * x, 0) / v.length);
	}
}
