export class Sound {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.musicStep = 0;
		this.nextNote = 0;
		this.notes = 0;
		this.peak = 0;
		this.muted = false;
	}
	async unlock() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = this.settings.master;
			this.master.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.music.gain.value = this.settings.music;
			this.music.connect(this.master);
			this.fx = this.ctx.createGain();
			this.fx.gain.value = this.settings.effects;
			this.fx.connect(this.master);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.rotor = this.ctx.createOscillator();
			this.rotor.type = "sawtooth";
			this.rotor.frequency.value = 45;
			this.rotorFilter = this.ctx.createBiquadFilter();
			this.rotorFilter.type = "lowpass";
			this.rotorFilter.frequency.value = 180;
			this.rotorGain = this.ctx.createGain();
			this.rotorGain.gain.value = 0;
			this.rotor.connect(this.rotorFilter);
			this.rotorFilter.connect(this.rotorGain);
			this.rotorGain.connect(this.fx);
			this.rotor.start();
			this.nextNote = this.ctx.currentTime + 0.05;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	apply() {
		if (this.ctx) {
			this.master.gain.value = this.muted ? 0 : this.settings.master;
			this.music.gain.value = this.settings.music;
			this.fx.gain.value = this.settings.effects;
		}
	}
	tone(
		freq,
		duration = 0.12,
		type = "square",
		gain = 0.08,
		slide = 0,
		channel = null,
		at = 0,
	) {
		if (!this.ctx || this.muted) return;
		const c = this.ctx,
			t = at || c.currentTime;
		const o = c.createOscillator(),
			g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(15, freq), t);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(15, slide),
				t + duration,
			);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(gain, t + 0.007);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(channel || this.fx);
		o.start(t);
		o.stop(t + duration + 0.02);
		this.notes++;
	}
	noise(duration = 0.4, gain = 0.25, filter = 450) {
		if (!this.ctx || this.muted) return;
		const c = this.ctx,
			n = c.createBuffer(1, c.sampleRate * duration, c.sampleRate),
			a = n.getChannelData(0);
		let last = 0;
		for (let i = 0; i < a.length; i++) {
			last = (last + Math.random() * 0.5 - 0.25) * 0.91;
			a[i] = last;
		}
		const s = c.createBufferSource(),
			f = c.createBiquadFilter(),
			g = c.createGain();
		s.buffer = n;
		f.type = "lowpass";
		f.frequency.value = filter;
		g.gain.setValueAtTime(gain, c.currentTime);
		g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
		s.connect(f);
		f.connect(g);
		g.connect(this.fx);
		s.start();
	}
	play(name) {
		const t = this.ctx?.currentTime || 0;
		if (name === "laser") this.tone(1100, 0.09, "sawtooth", 0.035, 230);
		if (name === "bomb") {
			this.tone(170, 0.13, "square", 0.09, 100);
			this.tone(380, 0.08, "sine", 0.1, 0, null, t + 0.12);
		}
		if (name === "tick") this.tone(900, 0.035, "square", 0.035);
		if (name === "blast") {
			this.noise(0.6, 0.65, 900);
			this.tone(95, 0.5, "sawtooth", 0.14, 22);
		}
		if (name === "hit") {
			this.noise(0.14, 0.3, 1800);
			this.tone(250, 0.22, "square", 0.09, 50);
		}
		if (name === "pickup") {
			this.tone(660, 0.12, "sine", 0.12);
			this.tone(990, 0.18, "sine", 0.1, 0, null, t + 0.1);
		}
		if (name === "rescue") {
			[440, 554, 660, 880].forEach((n, i) =>
				this.tone(n, 0.23, "triangle", 0.12, 0, null, t + i * 0.1),
			);
			this.voice(3);
		}
		if (name === "lamp") {
			this.noise(0.16, 0.25, 2600);
			this.tone(230, 0.12, "triangle", 0.07, 50);
		}
		if (name === "menu") this.tone(560, 0.045, "sine", 0.065, 800);
		if (name === "win") {
			[330, 440, 554, 660, 880, 1108, 1320].forEach((n, i) =>
				this.tone(n, 0.35, "triangle", 0.12, 0, null, t + i * 0.12),
			);
		}
	}
	voice(seed = 0) {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		[0, 1, 2, 3, 4].forEach((v, i) => {
			this.tone(
				160 + ((i * 73 + seed * 37) % 220),
				0.09,
				"sawtooth",
				0.026,
				220 + ((i * 41) % 140),
				null,
				t + i * 0.095,
			);
			this.tone(
				560 + ((i * 131 + seed * 83) % 700),
				0.075,
				"sine",
				0.04,
				0,
				null,
				t + i * 0.095,
			);
		});
	}
	update(flying, active) {
		if (!this.ctx) return;
		const c = this.ctx;
		this.rotorGain.gain.setTargetAtTime(
			flying && active ? 0.035 : 0,
			c.currentTime,
			0.09,
		);
		this.rotor.frequency.setTargetAtTime(flying ? 65 : 38, c.currentTime, 0.1);
		if (active && !this.muted) {
			if (this.nextNote < c.currentTime - 0.5) this.nextNote = c.currentTime;
			let guard = 0;
			while (this.nextNote < c.currentTime + 0.15 && guard++ < 6) {
				const s = this.musicStep++,
					bar = Math.floor(s / 16) % 4;
				const roots = [110, 130.813, 98, 146.832],
					root = roots[bar];
				const melody = [
					12, 19, 24, 19, 15, 19, 22, 19, 12, 19, 24, 26, 22, 19, 15, 10,
				];
				if (s % 2 === 0)
					this.tone(
						root * Math.pow(2, melody[s % 16] / 12),
						0.21,
						"triangle",
						0.15,
						0,
						this.music,
						this.nextNote,
					);
				if (s % 4 === 0)
					this.tone(
						root,
						0.39,
						"sine",
						0.22,
						root * 0.98,
						this.music,
						this.nextNote,
					);
				if (s % 4 === 2)
					this.tone(120, 0.07, "triangle", 0.1, 45, this.music, this.nextNote);
				this.nextNote += 0.205;
			}
		}
		const buf = new Float32Array(256);
		this.analyser.getFloatTimeDomainData(buf);
		this.peak = Math.max(...buf.map(Math.abs));
	}
	silence() {
		this.muted = true;
		this.apply();
	}
}
