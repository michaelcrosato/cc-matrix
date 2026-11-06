export class Sound {
	constructor() {
		this.ctx = null;
		this.music = 0.1;
		this.sfx = 0.65;
		this.master = 0.75;
		this.on = true;
		this.next = 0;
		this.step = 0;
		this.history = [];
	}
	async wake() {
		if (!this.ctx) {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			this.ctx = new AC();
			this.out = this.ctx.createGain();
			this.out.gain.value = this.master;
			this.out.connect(this.ctx.destination);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.out.connect(this.analyser);
			this.musicBus = this.ctx.createGain();
			this.musicBus.gain.value = this.music;
			this.musicBus.connect(this.out);
			this.fxBus = this.ctx.createGain();
			this.fxBus.gain.value = this.sfx;
			this.fxBus.connect(this.out);
			const n = this.ctx.createBuffer(
					1,
					this.ctx.sampleRate,
					this.ctx.sampleRate,
				),
				a = n.getChannelData(0);
			let seed = 7483;
			for (let i = 0; i < a.length; i++) {
				seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
				a[i] = (seed / 2147483648) * 0.7;
			}
			this.noise = n;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	volumes(settings) {
		this.music = settings.music;
		this.sfx = settings.sfx;
		this.master = settings.master;
		if (this.ctx) {
			this.musicBus.gain.value = this.music;
			this.fxBus.gain.value = this.sfx;
			this.out.gain.value = this.on ? this.master : 0;
		}
	}
	mute(v) {
		this.on = !v;
		if (this.out)
			this.out.gain.setTargetAtTime(
				v ? 0 : this.master,
				this.ctx.currentTime,
				0.025,
			);
	}
	tone(
		freq,
		dur = 0.1,
		type = "square",
		vol = 0.1,
		bus = null,
		when = 0,
		end = null,
	) {
		if (!this.ctx) return;
		const t = when || this.ctx.currentTime,
			o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (end)
			o.frequency.exponentialRampToValueAtTime(Math.max(end, 10), t + dur);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g);
		g.connect(bus || this.fxBus);
		o.start(t);
		o.stop(t + dur + 0.02);
		this.history.push({
			freq,
			dur,
			type,
			vol,
			bus: bus === this.musicBus ? "music" : "sfx",
		});
		if (this.history.length > 100) this.history.shift();
	}
	hiss(dur, vol = 0.2, cutoff = 1400) {
		if (!this.ctx) return;
		const t = this.ctx.currentTime,
			n = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		n.buffer = this.noise;
		f.type = "lowpass";
		f.frequency.value = cutoff;
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		n.connect(f);
		f.connect(g);
		g.connect(this.fxBus);
		n.start(t);
		n.stop(t + dur);
	}
	play(name) {
		if (!this.ctx || !this.on) return;
		if (name === "shot") {
			this.tone(140, 0.12, "triangle", 0.25, null, 0, 48);
			this.hiss(0.065, 0.18, 1700);
		}
		if (name === "bounce") {
			this.tone(760, 0.09, "square", 0.085, null, 0, 1250);
			this.tone(1580, 0.12, "sine", 0.08);
		}
		if (name === "hit") {
			this.tone(90, 0.16, "sawtooth", 0.18, null, 0, 32);
			this.hiss(0.18, 0.3, 1000);
		}
		if (name === "boom") {
			this.tone(82, 0.45, "triangle", 0.45, null, 0, 20);
			this.hiss(0.55, 0.5, 650);
			this.tone(240, 0.13, "square", 0.08, null, 0, 40);
		}
		if (name === "boost") {
			this.tone(100, 0.25, "sawtooth", 0.12, null, 0, 500);
			this.hiss(0.3, 0.18, 2400);
		}
		if (name === "pickup") {
			[440, 660, 880].forEach((n, i) => {
				this.tone(
					n,
					0.14,
					"square",
					0.1,
					null,
					this.ctx.currentTime + i * 0.07,
				);
			});
		}
		if (name === "click") this.tone(480, 0.055, "triangle", 0.12, null, 0, 680);
		if (name === "tick") this.tone(620, 0.12, "square", 0.08);
		if (name === "go") {
			this.tone(880, 0.25, "square", 0.14);
			this.voice("go");
		}
		if (name === "win") {
			[440, 554, 659, 880].forEach((n, i) => {
				this.tone(
					n,
					0.3,
					"triangle",
					0.2,
					null,
					this.ctx.currentTime + i * 0.13,
				);
			});
			this.voice("win");
		}
		if (name === "lose") {
			this.tone(220, 0.5, "triangle", 0.17, null, 0, 98);
			this.voice("oops");
		}
	}
	voice(line = "go") {
		if (!this.ctx) return;
		const seq =
			line === "win"
				? [640, 880, 720, 1050, 840]
				: line === "oops"
					? [440, 330, 280]
					: [350, 590, 450, 790];
		seq.forEach((f, i) => {
			this.tone(
				f,
				0.065 + i * 0.004,
				"sawtooth",
				0.028,
				null,
				this.ctx.currentTime + i * 0.095,
				f * 1.35,
			);
			this.tone(
				f * 2.2,
				0.05,
				"sine",
				0.035,
				null,
				this.ctx.currentTime + i * 0.095,
			);
		});
	}
	update(playing) {
		if (!this.ctx || !this.on || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		if (this.next < now - 0.2) this.next = now + 0.03;
		const bpm = playing ? 118 : 96,
			beat = 60 / bpm / 2;
		const bass = [110, 110, 146.83, 130.81, 110, 164.81, 146.83, 98];
		const lead = [
			440, 0, 523.25, 587.33, 0, 659.25, 587.33, 523.25, 440, 0, 329.63, 392,
			440, 0, 392, 329.63,
		];
		let catchup = 0;
		while (this.next < now + 0.12 && catchup++ < 4) {
			const s = this.step++;
			if (s % 2 === 0)
				this.tone(
					bass[((s / 2) % 8) | 0],
					beat * 1.4,
					"triangle",
					0.19,
					this.musicBus,
					this.next,
				);
			const n = lead[s % 16];
			if (n)
				this.tone(n, beat * 0.55, "square", 0.035, this.musicBus, this.next);
			this.tone(
				s % 4 === 0 ? 65 : 180,
				beat * 0.2,
				"triangle",
				s % 4 === 0 ? 0.24 : 0.06,
				this.musicBus,
				this.next,
				s % 4 === 0 ? 30 : 120,
			);
			this.next += beat;
		}
	}
	levels() {
		if (!this.analyser) return { rms: 0, peak: 0 };
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		let sum = 0,
			peak = 0;
		for (const v of a) {
			sum += v * v;
			peak = Math.max(peak, Math.abs(v));
		}
		return { rms: Math.sqrt(sum / a.length), peak };
	}
}
