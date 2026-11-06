export class AudioEngine {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.next = 0;
		this.beat = 0;
		this.voices = 0;
		this.effects = 0;
		this.enabled = false;
		this.muted = false;
		this.musicNotes = 0;
	}
	async unlock() {
		if (!this.ctx) {
			const C = window.AudioContext || window.webkitAudioContext;
			if (!C) return;
			this.ctx = new C();
			this.build(this.ctx);
			this.loop = setInterval(() => this.update(), 60);
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this.enabled = true;
		this.next = Math.max(this.next, this.ctx.currentTime + 0.03);
	}
	build(ctx) {
		this.master = ctx.createGain();
		this.master.gain.value = 0.7;
		this.music = ctx.createGain();
		this.sfx = ctx.createGain();
		this.voice = ctx.createGain();
		this.music.connect(this.master);
		this.sfx.connect(this.master);
		this.voice.connect(this.master);
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 512;
		this.master.connect(this.analyser);
		this.analyser.connect(ctx.destination);
		const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		let n = 3351;
		for (let i = 0; i < data.length; i++) {
			n = (Math.imul(n, 1664525) + 1013904223) | 0;
			data[i] = (n / 2147483648) * Math.exp((-i / data.length) * 8);
		}
		this.noise = buffer;
		this.apply();
	}
	apply() {
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(
			this.muted ? 0 : 0.7,
			this.ctx.currentTime,
			0.02,
		);
		this.music.gain.setTargetAtTime(
			this.settings.music / 100,
			this.ctx.currentTime,
			0.02,
		);
		this.sfx.gain.setTargetAtTime(
			this.settings.sfx / 100,
			this.ctx.currentTime,
			0.02,
		);
		this.voice.gain.setTargetAtTime(
			this.settings.voice / 100,
			this.ctx.currentTime,
			0.02,
		);
	}
	tone(
		freq,
		duration = 0.1,
		type = "square",
		gain = 0.1,
		to = this.sfx,
		time = this.ctx?.currentTime || 0,
		endFreq = null,
	) {
		if (!this.ctx) return;
		const osc = this.ctx.createOscillator(),
			vol = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, time);
		if (endFreq)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(1, endFreq),
				time + duration,
			);
		vol.gain.setValueAtTime(0, time);
		vol.gain.linearRampToValueAtTime(gain, time + 0.006);
		vol.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		osc.connect(vol);
		vol.connect(to);
		osc.start(time);
		osc.stop(time + duration + 0.015);
		return osc;
	}
	hiss(
		duration = 0.2,
		gain = 0.13,
		freq = 1000,
		time = this.ctx?.currentTime || 0,
	) {
		if (!this.ctx) return;
		const source = this.ctx.createBufferSource(),
			filter = this.ctx.createBiquadFilter(),
			vol = this.ctx.createGain();
		source.buffer = this.noise;
		filter.type = "highpass";
		filter.frequency.value = freq;
		vol.gain.setValueAtTime(gain, time);
		vol.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		source.connect(filter);
		filter.connect(vol);
		vol.connect(this.sfx);
		source.start(time);
		source.stop(time + duration);
	}
	play(type) {
		if (!this.ctx || this.muted) return;
		this.effects++;
		const t = this.ctx.currentTime;
		if (type === "fire") {
			this.tone(900, 0.065, "square", 0.045, this.sfx, t, 190);
		} else if (type === "kill") {
			this.tone(130, 0.14, "sawtooth", 0.12, this.sfx, t, 38);
			this.hiss(0.12, 0.1, 1800);
		} else if (type === "split") {
			this.tone(330, 0.12, "triangle", 0.12, this.sfx, t, 950);
			this.tone(440, 0.14, "square", 0.045, this.sfx, t + 0.04, 250);
		} else if (type === "hurt" || type === "down") {
			this.tone(90, 0.34, "sawtooth", 0.18, this.sfx, t, 28);
			this.hiss(0.24, 0.21, 200);
		} else if (type === "dash") {
			this.hiss(0.2, 0.1, 3000);
			this.tone(190, 0.17, "triangle", 0.13, this.sfx, t, 1000);
		} else if (type === "graze") {
			this.tone(1600, 0.07, "sine", 0.055, this.sfx, t, 2200);
		} else if (type === "encore") {
			for (let i = 0; i < 6; i++)
				this.tone(
					130.81 * 2 ** (i / 4),
					0.7,
					"sawtooth",
					0.11,
					this.sfx,
					t + i * 0.035,
					65,
				);
			this.hiss(0.35, 0.25, 100);
		} else if (type === "pickup") {
			[0, 4, 7, 12].forEach((n, i) => {
				this.tone(
					440 * 2 ** (n / 12),
					0.16,
					"triangle",
					0.16,
					this.sfx,
					t + i * 0.055,
				);
			});
		} else if (type === "clear" || type === "bossDown") {
			[0, 3, 7, 12, 15].forEach((n, i) => {
				this.tone(
					261.6 * 2 ** (n / 12),
					0.3,
					"square",
					0.065,
					this.sfx,
					t + i * 0.09,
				);
			});
		} else if (type === "menu") {
			this.tone(560, 0.055, "triangle", 0.08);
		} else if (type === "confirm") {
			this.tone(660, 0.09, "triangle", 0.11);
			this.tone(880, 0.13, "triangle", 0.09, this.sfx, t + 0.05);
		}
	}
	gibberish(mood = "wave") {
		if (!this.ctx || this.muted) return;
		this.voices++;
		const t = this.ctx.currentTime + 0.08;
		const syllables =
			mood === "victory"
				? [320, 420, 360, 540, 650]
				: mood === "hurt"
					? [180, 130]
					: [230, 350, 280, 460];
		syllables.forEach((f, i) => {
			const at = t + i * 0.095;
			const osc = this.ctx.createOscillator(),
				formant = this.ctx.createBiquadFilter(),
				g = this.ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(f, at);
			osc.frequency.linearRampToValueAtTime(
				f * (i % 2 ? 0.8 : 1.25),
				at + 0.08,
			);
			formant.type = "bandpass";
			formant.frequency.value = 900 + (i % 3) * 650;
			formant.Q.value = 4;
			g.gain.setValueAtTime(0.0001, at);
			g.gain.linearRampToValueAtTime(0.24, at + 0.015);
			g.gain.exponentialRampToValueAtTime(0.0001, at + 0.085);
			osc.connect(formant);
			formant.connect(g);
			g.connect(this.voice);
			osc.start(at);
			osc.stop(at + 0.09);
			this.tone(f / 2, 0.075, "sine", 0.055, this.voice, at);
		});
	}
	update() {
		if (
			!this.ctx ||
			!this.enabled ||
			this.ctx.state !== "running" ||
			this.muted
		)
			return;
		const now = this.ctx.currentTime;
		if (this.next < now - 0.4) this.next = now;
		const bass = [0, 0, 7, 10, 0, 3, 7, 5, 8, 8, 3, 7, 10, 7, 3, 2],
			melody = [12, 19, 15, 22, 19, 15, 10, 7, 12, 15, 20, 19, 15, 10, 7, 10];
		while (this.next < now + 0.15) {
			const i = this.beat % 16,
				root = 65.406;
			this.tone(
				root * 2 ** (bass[i] / 12),
				0.22,
				"triangle",
				0.26,
				this.music,
				this.next,
			);
			if (i % 2 === 0)
				this.tone(
					root * 2 ** (melody[i] / 12) * 2,
					0.12,
					"square",
					0.065,
					this.music,
					this.next + 0.005,
				);
			if (i % 4 === 0)
				this.tone(120, 0.15, "sine", 0.55, this.music, this.next, 30);
			if (i % 4 === 2) {
				this.tone(165, 0.06, "triangle", 0.16, this.music, this.next);
				this.tone(1900, 0.025, "square", 0.045, this.music, this.next + 0.015);
			}
			this.musicNotes++;
			this.beat++;
			this.next += 60 / 112 / 2;
		}
	}
	levels() {
		if (!this.analyser) return { rms: 0, peak: 0 };
		const arr = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(arr);
		return {
			rms: Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length),
			peak: Math.max(...arr.map(Math.abs)),
		};
	}
	stop() {
		this.enabled = false;
		this.muted = true;
		this.apply();
	}
}
