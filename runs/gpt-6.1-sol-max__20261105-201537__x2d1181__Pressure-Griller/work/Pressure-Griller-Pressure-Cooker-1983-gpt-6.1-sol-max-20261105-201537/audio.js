export class KitchenAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.beat = 0;
		this.next = 0;
		this.enabled = true;
		this.notes = 0;
	}
	unlock() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.65;
			this.master.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.music.gain.value = this.musicVolume;
			this.music.connect(this.master);
			this.sfx = this.ctx.createGain();
			this.sfx.gain.value = this.sfxVolume;
			this.sfx.connect(this.master);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.noise = this.ctx.createBuffer(
				1,
				this.ctx.sampleRate * 0.22,
				this.ctx.sampleRate,
			);
			const a = this.noise.getChannelData(0);
			let seed = 17;
			for (let i = 0; i < a.length; i++) {
				seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
				a[i] = (seed / 2147483648) * (1 - i / a.length);
			}
			this.next = this.ctx.currentTime + 0.05;
		}
		this.ctx.resume().catch(() => {});
	}
	volumes(music, sfx) {
		this.musicVolume = music;
		this.sfxVolume = sfx;
		if (this.ctx) {
			this.music.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
			this.sfx.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
		}
	}
	tone(freq, duration, type = "sine", volume = 0.2, at, bus, slide = 1) {
		if (!this.ctx || !this.enabled) return;
		const c = this.ctx,
			t = at ?? c.currentTime;
		const o = c.createOscillator(),
			g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		o.frequency.exponentialRampToValueAtTime(
			Math.max(20, freq * slide),
			t + duration,
		);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(volume, t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(bus || this.sfx);
		o.start(t);
		o.stop(t + duration + 0.02);
		this.notes++;
	}
	hiss(at, volume = 0.15, filter = 4500, bus) {
		if (!this.ctx || !this.enabled) return;
		const s = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		s.buffer = this.noise;
		f.type = "highpass";
		f.frequency.value = filter;
		g.gain.value = volume;
		s.connect(f);
		f.connect(g);
		g.connect(bus || this.sfx);
		s.start(at ?? this.ctx.currentTime);
	}
	gibberish(mood = 0) {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		const pitches = mood < 0 ? [280, 235, 180] : [370, 510, 420, 620];
		pitches.forEach((f, i) => {
			this.tone(f, 0.09, "sawtooth", 0.055, t + i * 0.085, this.sfx, 0.72);
			this.tone(f * 2.7, 0.065, "sine", 0.03, t + i * 0.085);
		});
	}
	event(name) {
		if (!this.ctx || !this.enabled) return;
		const t = this.ctx.currentTime;
		if (name === "catch") {
			this.tone(580, 0.12, "triangle", 0.25, t, null, 1.6);
			this.tone(980, 0.08, "sine", 0.12, t + 0.04);
		} else if (name === "serve" || name === "win") {
			[523, 659, 784, 1046].forEach((f, i) =>
				this.tone(f, 0.32, "triangle", 0.19, t + i * 0.07),
			);
			this.gibberish(1);
		} else if (name === "bell") {
			[880, 1320, 1760].forEach((f) => this.tone(f, 1.2, "sine", 0.15));
		} else if (["wrongServe", "wrongCatch", "expired", "lose"].includes(name)) {
			this.tone(180, 0.25, "sawtooth", 0.12, t, null, 0.5);
			this.gibberish(-1);
		} else if (name === "dash") {
			this.hiss(t, 0.16, 1600);
			this.tone(140, 0.12, "sine", 0.15, t, null, 3);
		} else if (name === "heat") {
			this.hiss(t, 0.32, 600);
			this.gibberish(-1);
		} else if (name === "click" || name === "target")
			this.tone(440, 0.05, "triangle", 0.12);
		else if (name === "interlude")
			[392, 494, 587].forEach((f, i) =>
				this.tone(f, 0.45, "sine", 0.2, t + i * 0.12),
			);
	}
	update(paused = false) {
		if (!this.ctx || this.ctx.state !== "running" || !this.enabled) return;
		this.music.gain.setTargetAtTime(
			this.musicVolume * (paused ? 0.4 : 1),
			this.ctx.currentTime,
			0.1,
		);
		if (this.next < this.ctx.currentTime - 0.2)
			this.next = this.ctx.currentTime + 0.02;
		while (this.next < this.ctx.currentTime + 0.15) {
			const b = this.beat++,
				eighth = b % 8,
				chord = Math.floor(b / 16) % 4;
			const roots = [130.81, 110, 174.61, 196];
			const root = roots[chord];
			if (eighth % 2 === 0)
				this.tone(
					root * (eighth === 4 ? 1.5 : 1),
					0.22,
					"triangle",
					0.4,
					this.next,
					this.music,
				);
			if (eighth === 2 || eighth === 6) {
				[2, 2.5, 3].forEach((r) =>
					this.tone(root * r, 0.14, "sine", 0.12, this.next, this.music),
				);
				this.hiss(this.next, 0.17, 1800, this.music);
			}
			const melody = [
				4, 5, 6, 7.5, 6, 5, 4.5, 5, 6, 5, 4, 3, 3.75, 4.5, 5, 3.75,
			];
			if (b % 3 !== 1)
				this.tone(
					root * melody[b % 16],
					0.18,
					"sine",
					0.22,
					this.next,
					this.music,
				);
			this.hiss(this.next, 0.065, 6500, this.music);
			this.next += (60 / 126 / 2) * (eighth % 2 === 0 ? 1.18 : 0.82);
		}
	}
	stop() {
		this.enabled = false;
		if (this.ctx)
			this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
	}
	levels() {
		if (!this.analyser) return { rms: 0, notes: 0 };
		const d = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(d);
		return {
			rms: Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length),
			notes: this.notes,
			music: this.musicVolume,
			state: this.ctx.state,
		};
	}
}
