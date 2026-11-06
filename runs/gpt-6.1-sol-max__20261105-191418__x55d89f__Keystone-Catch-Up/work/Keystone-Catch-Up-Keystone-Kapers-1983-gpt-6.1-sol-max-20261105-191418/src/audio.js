export class RadioAudio {
	constructor() {
		this.ctx = null;
		this.masterVolume = 0.7;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.voiceVolume = 0.45;
		this.enabled = true;
		this.nextBeat = 0;
		this.beat = 0;
		this.notes = 0;
		this.paused = false;
	}
	init() {
		if (!this.ctx) {
			const A = window.AudioContext || window.webkitAudioContext;
			if (!A) return;
			this.ctx = new A();
			this.master = this.ctx.createGain();
			this.master.gain.value = this.masterVolume;
			this.compressor = this.ctx.createDynamicsCompressor();
			this.compressor.threshold.value = -10;
			this.compressor.knee.value = 12;
			this.compressor.ratio.value = 8;
			this.master.connect(this.compressor);
			this.compressor.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.music.gain.value = this.musicVolume;
			this.music.connect(this.master);
			this.fx = this.ctx.createGain();
			this.fx.gain.value = this.sfxVolume;
			this.fx.connect(this.master);
			this.voice = this.ctx.createGain();
			this.voice.gain.value = this.voiceVolume;
			this.voice.connect(this.master);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.nextBeat = this.ctx.currentTime + 0.08;
		}
		if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
	}
	tone(
		freq,
		dur = 0.1,
		type = "square",
		vol = 0.1,
		delay = 0,
		bus = this.fx,
		slide = 0,
	) {
		if (!this.ctx || !this.enabled || this.paused) return;
		const t = this.ctx.currentTime + delay,
			o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(Math.max(25, slide), t + dur);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g);
		g.connect(bus);
		o.start(t);
		o.stop(t + dur + 0.02);
		this.notes++;
	}
	noise(dur = 0.12, vol = 0.08, delay = 0) {
		if (!this.ctx || this.paused || !this.enabled) return;
		const n = Math.ceil(this.ctx.sampleRate * dur),
			b = this.ctx.createBuffer(1, n, this.ctx.sampleRate),
			a = b.getChannelData(0);
		for (let i = 0; i < n; i++)
			a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
		const s = this.ctx.createBufferSource(),
			g = this.ctx.createGain(),
			filter = this.ctx.createBiquadFilter();
		s.buffer = b;
		filter.type = "highpass";
		filter.frequency.value = 1500;
		g.gain.value = vol;
		s.connect(filter);
		filter.connect(g);
		g.connect(this.fx);
		s.start(this.ctx.currentTime + delay);
	}
	sfx(name) {
		if (!this.ctx) return;
		switch (name) {
			case "jump":
				this.tone(230, 0.13, "triangle", 0.17, 0, this.fx, 650);
				break;
			case "land":
				this.noise(0.07, 0.1);
				this.tone(100, 0.05, "sine", 0.12);
				break;
			case "dash":
				this.noise(0.17, 0.14);
				this.tone(360, 0.14, "sawtooth", 0.04, 0, this.fx, 130);
				break;
			case "pickup":
				this.tone(740, 0.09, "square", 0.07);
				this.tone(1110, 0.15, "triangle", 0.15, 0.065);
				break;
			case "coffee":
				for (let i = 0; i < 4; i++)
					this.tone(330 * Math.pow(1.26, i), 0.1, "triangle", 0.13, i * 0.055);
				break;
			case "hit":
				this.noise(0.2, 0.25);
				this.tone(160, 0.25, "sawtooth", 0.09, 0, this.fx, 45);
				break;
			case "cuff":
				this.noise(0.1, 0.22);
				for (let i = 0; i < 5; i++)
					this.tone(
						[392, 494, 587, 784, 988][i],
						0.2,
						"triangle",
						0.18,
						i * 0.075,
					);
				this.speak(1);
				break;
			case "bell":
				this.tone(880, 0.4, "sine", 0.22);
				this.tone(1320, 0.5, "sine", 0.1, 0.12);
				break;
			case "ui":
				this.tone(620, 0.05, "triangle", 0.09);
				break;
			case "fail":
				for (let i = 0; i < 4; i++)
					this.tone(220 / Math.pow(1.19, i), 0.3, "triangle", 0.17, i * 0.15);
				break;
			case "win":
				for (let i = 0; i < 8; i++)
					this.tone(
						[392, 494, 587, 784, 587, 784, 988, 1174][i],
						0.23,
						"triangle",
						0.19,
						i * 0.11,
					);
				break;
		}
	}
	speak(mood = 0) {
		if (!this.ctx) return;
		const f = mood ? 210 : 155;
		for (let i = 0; i < 6; i++) {
			const v = f * [1, 1.5, 0.9, 1.25, 1.8, 1.1][i];
			this.tone(v, 0.09, "sawtooth", 0.025, i * 0.1, this.voice, v * 1.2);
			this.tone(v * 2.1, 0.07, "sine", 0.06, i * 0.1, this.voice);
		}
	}
	update() {
		if (
			!this.ctx ||
			this.ctx.state !== "running" ||
			this.paused ||
			!this.enabled
		)
			return;
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.04;
		while (this.nextBeat < now + 0.12) {
			const delay = this.nextBeat - now,
				b = this.beat % 32;
			const chords = [
					[48, 52, 55, 59],
					[45, 48, 52, 55],
					[50, 53, 57, 60],
					[43, 47, 50, 53],
				],
				ch = chords[Math.floor(b / 8)],
				mel = [
					12, 7, 9, 12, 14, 12, 7, 4, 12, 9, 7, 4, 7, 9, 10, 9, 12, 14, 16, 14,
					12, 9, 7, 5, 7, 4, 2, 4, 7, 9, 7, 4,
				];
			const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
			if (b % 2 === 0)
				this.tone(
					hz(ch[b % 4] - 12),
					0.17,
					"triangle",
					0.35,
					Math.max(0, delay),
					this.music,
				);
			if (b % 2 === 1)
				for (let i = 1; i < 4; i++)
					this.tone(
						hz(ch[i]),
						0.08,
						"square",
						0.045,
						Math.max(0, delay),
						this.music,
					);
			this.tone(
				hz(ch[0] + mel[b] + 12),
				b % 4 === 3 ? 0.19 : 0.1,
				"triangle",
				0.16,
				Math.max(0, delay),
				this.music,
			);
			this.nextBeat += 0.19;
			this.beat++;
		}
	}
	setVolume(bus, v) {
		this[bus + "Volume"] = v;
		const node = this[bus === "sfx" ? "fx" : bus];
		if (node) node.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
	}
	silence(on) {
		this.paused = on;
		if (this.master)
			this.master.gain.setTargetAtTime(
				on ? 0 : this.masterVolume,
				this.ctx.currentTime,
				0.03,
			);
	}
	async offlineProbe() {
		const ctx = new OfflineAudioContext(1, 22050, 22050),
			probe = new RadioAudio();
		probe.ctx = ctx;
		probe.master = ctx.createGain();
		probe.master.gain.value = 0.7;
		probe.master.connect(ctx.destination);
		for (const [name, gain] of [
			["music", 0.1],
			["fx", 0.65],
			["voice", 0.45],
		]) {
			probe[name] = ctx.createGain();
			probe[name].gain.value = gain;
			probe[name].connect(probe.master);
		}
		probe.tone(440, 0.5, "triangle", 0.2, 0, probe.music);
		probe.sfx("jump");
		probe.sfx("cuff");
		const rendered = await ctx.startRendering(),
			samples = rendered.getChannelData(0);
		let square = 0,
			peak = 0;
		for (const x of samples) {
			square += x * x;
			peak = Math.max(peak, Math.abs(x));
		}
		return {
			rms: Math.sqrt(square / samples.length),
			peak,
			frames: samples.length,
			finite: Array.from(samples).every(Number.isFinite),
		};
	}

	level() {
		if (!this.analyser) return 0;
		const a = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(a);
		return Math.sqrt(
			a.reduce((s, x) => s + ((x - 128) / 128) ** 2, 0) / a.length,
		);
	}
}
