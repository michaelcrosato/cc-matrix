class SynthAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.75;
		this.masterVolume = 0.65;
		this.events = 0;
		this.voiceEvents = 0;
		this.notes = 0;
		this.clock = 0;
		this.beat = 0;
		this.enabled = true;
	}
	async unlock() {
		if (!this.enabled) return;
		try {
			if (!this.ctx) {
				this.ctx = new (window.AudioContext || window.webkitAudioContext)();
				this.master = this.ctx.createGain();
				this.master.gain.value = this.masterVolume;
				this.analyser = this.ctx.createAnalyser();
				this.analyser.fftSize = 512;
				this.master.connect(this.analyser);
				this.analyser.connect(this.ctx.destination);
				this.music = this.ctx.createGain();
				this.music.gain.value = this.musicVolume;
				this.music.connect(this.master);
				this.sfx = this.ctx.createGain();
				this.sfx.gain.value = this.sfxVolume;
				this.sfx.connect(this.master);
				this.noiseBuffer = this.ctx.createBuffer(
					1,
					this.ctx.sampleRate * 1.5,
					this.ctx.sampleRate,
				);
				let a = this.noiseBuffer.getChannelData(0),
					r = 731;
				for (let i = 0; i < a.length; i++) {
					r = (r * 16807) % 2147483647;
					a[i] = ((r / 2147483647) * 2 - 1) * 0.8;
				}
			}
			await this.ctx.resume();
		} catch (e) {
			this.enabled = false;
		}
	}
	engine(power = 0, boost = false) {
		if (!this.ctx || this.ctx.state !== "running") return;
		if (!this.engineOsc) {
			this.engineOsc = this.ctx.createOscillator();
			this.engineGain = this.ctx.createGain();
			this.engineOsc.type = "triangle";
			this.engineGain.gain.value = 0;
			this.engineOsc.connect(this.engineGain);
			this.engineGain.connect(this.sfx);
			this.engineOsc.start();
		}
		this.engineOsc.frequency.setTargetAtTime(
			44 + power * 65 + (boost ? 35 : 0),
			this.ctx.currentTime,
			0.15,
		);
		this.engineGain.gain.setTargetAtTime(
			power > 0 ? 0.013 + power * 0.025 : 0,
			this.ctx.currentTime,
			0.12,
		);
	}
	levels() {
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(
			this.masterVolume,
			this.ctx.currentTime,
			0.05,
		);
		this.music.gain.setTargetAtTime(
			this.musicVolume,
			this.ctx.currentTime,
			0.05,
		);
		this.sfx.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
	}
	tone(freq, end, dur, type = "sine", vol = 0.2, delay = 0, dest = null) {
		if (!this.ctx || this.ctx.state !== "running") return;
		const t = this.ctx.currentTime + delay,
			o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(freq, 15), t);
		o.frequency.exponentialRampToValueAtTime(Math.max(end, 15), t + dur);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g);
		g.connect(dest || this.sfx);
		o.start(t);
		o.stop(t + dur + 0.015);
		this.events++;
	}
	noise(dur = 0.3, vol = 0.2, cutoff = 1500, delay = 0) {
		if (!this.ctx || this.ctx.state !== "running") return;
		const t = this.ctx.currentTime + delay,
			s = this.ctx.createBufferSource(),
			g = this.ctx.createGain(),
			f = this.ctx.createBiquadFilter();
		s.buffer = this.noiseBuffer;
		f.type = "lowpass";
		f.frequency.setValueAtTime(cutoff, t);
		f.frequency.exponentialRampToValueAtTime(80, t + dur);
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		s.connect(f);
		f.connect(g);
		g.connect(this.sfx);
		s.start(t);
		s.stop(t + dur);
		this.events++;
	}
	shot() {
		this.tone(940, 150, 0.16, "sawtooth", 0.075);
		this.tone(580, 110, 0.19, "triangle", 0.11, 0.025);
	}
	impact() {
		this.tone(180, 70, 0.16, "square", 0.075);
		this.noise(0.13, 0.12, 1900);
	}
	explode(big = false) {
		this.noise(big ? 0.9 : 0.48, big ? 0.42 : 0.27, 2800);
		this.tone(big ? 85 : 145, 24, big ? 0.8 : 0.4, "triangle", 0.3);
	}
	pulse() {
		this.tone(80, 900, 0.45, "sawtooth", 0.13);
		this.tone(440, 55, 0.7, "sine", 0.22, 0.15);
		this.noise(0.6, 0.17, 4000);
	}
	warp() {
		this.tone(48, 980, 2.5, "sawtooth", 0.11);
		this.tone(62, 1500, 2.7, "triangle", 0.12);
		this.noise(2.7, 0.1, 8000);
	}
	arrive() {
		[220, 330, 440, 660].forEach((n, i) =>
			this.tone(n, n, 0.45, "triangle", 0.15, i * 0.09),
		);
	}
	alert() {
		this.tone(680, 440, 0.22, "square", 0.07);
		this.tone(680, 440, 0.22, "square", 0.06, 0.3);
	}
	select() {
		this.tone(520, 780, 0.06, "triangle", 0.065);
	}
	voice(text = "cadet") {
		if (!this.ctx) return;
		this.voiceEvents++;
		let n = 0;
		for (let i = 0; i < Math.min(text.length, 22); i++) {
			const c = text.charCodeAt(i);
			if (c === 32) continue;
			const f = 155 + (c % 11) * 24;
			this.tone(
				f,
				f * (0.85 + (c % 4) * 0.14),
				0.065 + (c % 3) * 0.018,
				"triangle",
				0.085,
				n * 0.08,
			);
			this.tone(f * 2.8, f * 2.3, 0.045, "sine", 0.04, n * 0.08);
			n++;
		}
	}
	update(dt, intensity = 0) {
		if (!this.ctx || this.ctx.state !== "running") return;
		this.clock -= dt;
		if (this.clock > 0) return;
		this.clock += 0.235;
		const seq = [0, 7, 12, 19, 14, 7, 10, 17, 0, 7, 12, 19, 22, 17, 10, 7],
			root = 73.416;
		const n = seq[this.beat % 16],
			f = root * Math.pow(2, n / 12);
		this.tone(f, f, 0.55, "triangle", 0.16, 0, this.music);
		if (this.beat % 4 === 0)
			this.tone(root / 2, root / 2, 0.8, "sine", 0.28, 0, this.music);
		if (intensity > 0.3 && this.beat % 2 === 0)
			this.tone(140, 32, 0.13, "sine", 0.25, 0, this.music);
		this.beat++;
		this.notes++;
	}
	suspend() {
		this.ctx?.suspend();
	}
	static async probe() {
		const c = new OfflineAudioContext(1, 12000, 24000),
			g = c.createGain(),
			o = c.createOscillator();
		g.gain.value = 0.1;
		o.type = "triangle";
		o.frequency.setValueAtTime(330, 0);
		o.frequency.exponentialRampToValueAtTime(110, 0.3);
		o.connect(g);
		g.connect(c.destination);
		o.start();
		o.stop(0.4);
		const b = await c.startRendering(),
			a = b.getChannelData(0);
		let sum = 0,
			peak = 0;
		for (const x of a) {
			sum += x * x;
			peak = Math.max(peak, Math.abs(x));
		}
		return { rms: Math.sqrt(sum / a.length), peak, samples: a.length };
	}
}
