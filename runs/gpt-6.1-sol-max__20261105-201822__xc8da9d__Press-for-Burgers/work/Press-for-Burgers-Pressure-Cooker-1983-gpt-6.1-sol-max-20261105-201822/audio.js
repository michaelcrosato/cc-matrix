export function tone(
	ctx,
	dest,
	frequency,
	at,
	duration = 0.13,
	volume = 0.2,
	type = "triangle",
	end = frequency,
) {
	const o = ctx.createOscillator(),
		g = ctx.createGain();
	o.type = type;
	o.frequency.setValueAtTime(frequency, at);
	o.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
	g.gain.setValueAtTime(0, at);
	g.gain.linearRampToValueAtTime(volume, at + 0.008);
	g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	o.connect(g);
	g.connect(dest);
	o.start(at);
	o.stop(at + duration + 0.01);
}
export function chatter(ctx, dest, at, seed = 1) {
	const vowels = [740, 1100, 430, 850, 1450];
	for (let i = 0; i < 5; i++) {
		const t = at + i * 0.075;
		const filter = ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.value = vowels[(seed + i * 3) % 5];
		filter.Q.value = 3;
		filter.connect(dest);
		tone(
			ctx,
			filter,
			190 + (seed % 4) * 36 + (i % 2) * 90,
			t,
			0.07,
			0.18,
			"sawtooth",
			260 + i * 30,
		);
	}
}
export class KitchenAudio {
	constructor() {
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.voices = true;
		this.muted = false;
		this.step = 0;
		this.eventsPlayed = 0;
	}
	async unlock() {
		if (!this.ctx) {
			const ctx = new AudioContext();
			this.ctx = ctx;
			this.master = ctx.createGain();
			this.master.gain.value = 0.65;
			this.analyser = ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.master.connect(this.analyser);
			this.analyser.connect(ctx.destination);
			this.music = ctx.createGain();
			this.sfx = ctx.createGain();
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.updateGains();
			this.next = ctx.currentTime + 0.04;
			const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
			const a = b.getChannelData(0);
			for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * 0.18;
			const noise = ctx.createBufferSource();
			noise.buffer = b;
			noise.loop = true;
			const filter = ctx.createBiquadFilter();
			filter.type = "highpass";
			filter.frequency.value = 4800;
			const g = ctx.createGain();
			g.gain.value = 0.025;
			noise.connect(filter);
			filter.connect(g);
			g.connect(this.sfx);
			noise.start();
			this.noise = b;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	updateGains() {
		if (this.ctx) {
			this.music.gain.value = this.musicVolume;
			this.sfx.gain.value = this.sfxVolume;
			this.master.gain.value = this.muted ? 0 : 0.65;
		}
	}
	tick() {
		const c = this.ctx;
		if (c?.state !== "running" || this.muted) return;
		if (this.next < c.currentTime - 0.2) this.next = c.currentTime + 0.02;
		const melody = [
			72, 0, 76, 79, 81, 79, 76, 74, 72, 0, 67, 69, 72, 74, 76, 0, 77, 0, 81,
			84, 86, 84, 81, 79, 76, 74, 72, 69, 67, 69, 71, 72,
		];
		const bass = [48, 48, 53, 55];
		while (this.next < c.currentTime + 0.14) {
			const i = this.step % 32,
				t = this.next,
				n = melody[i];
			if (n)
				tone(
					c,
					this.music,
					440 * 2 ** ((n - 69) / 12),
					t,
					0.16,
					0.18,
					"triangle",
				);
			if (i % 4 === 0)
				tone(
					c,
					this.music,
					440 * 2 ** ((bass[Math.floor(i / 8)] - 69) / 12),
					t,
					0.28,
					0.32,
					"sine",
				);
			if (i % 4 === 2) {
				tone(c, this.music, 180, t, 0.045, 0.1, "triangle", 70);
				tone(c, this.music, 330, t, 0.03, 0.05, "square", 150);
			}
			if (i % 8 === 0) {
				for (const d of [0, 4, 7])
					tone(
						c,
						this.music,
						440 * 2 ** ((60 + (i < 16 ? 0 : 5) + d - 69) / 12),
						t,
						0.23,
						0.03,
						"triangle",
					);
			}
			this.next += this.step % 2 === 0 ? 0.24 : 0.18;
			this.step++;
		}
	}
	play(type) {
		const c = this.ctx;
		if (c?.state !== "running" || this.muted) return;
		const t = c.currentTime;
		const n = (f, d = 0.1, v = 0.22, w = "triangle", end = f) =>
			tone(c, this.sfx, f, t, d, v, w, end);
		this.eventsPlayed++;
		if (type === "catch") {
			n(650, 0.1, 0.22, "sine", 1000);
		} else if (type === "topping" || type === "pickup") {
			n(270, 0.1, 0.28, "triangle", 380);
		} else if (type === "served" || type === "won" || type === "intermission") {
			[523, 659, 784, 1047].forEach((f, i) => {
				tone(c, this.sfx, f, t + i * 0.075, 0.16, 0.19, "triangle");
			});
			if (this.voices) chatter(c, this.sfx, t + 0.1, this.eventsPlayed);
		} else if (type === "mistake" || type === "lost") {
			n(190, 0.24, 0.16, "sawtooth", 70);
		} else if (type === "reject") {
			n(440, 0.12, 0.12, "sine", 220);
		} else if (type === "dash") {
			n(180, 0.09, 0.12, "sine", 700);
		} else if (type === "brake") {
			n(100, 0.3, 0.14, "triangle", 42);
		} else if (type === "rush" || type === "shift") {
			[392, 523, 659].forEach((f, i) => {
				tone(c, this.sfx, f, t + i * 0.06, 0.13, 0.12);
			});
			if (this.voices) chatter(c, this.sfx, t + 0.15, 3);
		} else if (type === "menu") {
			n(660, 0.04, 0.1, "sine", 800);
		} else if (type === "launch") {
			n(160, 0.04, 0.05, "sine", 240);
		} else if (type === "bun") {
			n(1100, 0.09, 0.13, "sine", 700);
		}
	}
	level() {
		if (!this.analyser) return 0;
		const arr = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(arr);
		return Math.sqrt(
			arr.reduce((a, x) => a + (x / 128 - 1) ** 2, 0) / arr.length,
		);
	}
}
