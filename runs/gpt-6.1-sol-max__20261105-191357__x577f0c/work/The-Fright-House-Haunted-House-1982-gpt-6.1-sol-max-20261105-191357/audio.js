const midi = (n) => 440 * 2 ** ((n - 69) / 12);
function tone(
	ctx,
	dest,
	{
		freq = 220,
		time = ctx.currentTime,
		duration = 0.2,
		volume = 0.1,
		type = "sine",
		end = freq,
		pan = 0,
	} = {},
) {
	const o = ctx.createOscillator(),
		g = ctx.createGain(),
		p = ctx.createStereoPanner();
	o.type = type;
	o.frequency.setValueAtTime(freq, time);
	o.frequency.exponentialRampToValueAtTime(Math.max(1, end), time + duration);
	g.gain.setValueAtTime(0, time);
	g.gain.linearRampToValueAtTime(volume, time + 0.012);
	g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	p.pan.value = pan;
	o.connect(g).connect(p).connect(dest);
	o.start(time);
	o.stop(time + duration + 0.03);
}
function noise(
	ctx,
	dest,
	duration = 0.3,
	volume = 0.08,
	cutoff = 2000,
	at = ctx.currentTime,
) {
	const b = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * duration),
			ctx.sampleRate,
		),
		d = b.getChannelData(0);
	let s = 7861;
	for (let i = 0; i < d.length; i++) {
		s = (s * 16807) % 2147483647;
		d[i] = ((s / 2147483647) * 2 - 1) * (1 - i / d.length) ** 2;
	}
	const src = ctx.createBufferSource(),
		f = ctx.createBiquadFilter(),
		g = ctx.createGain();
	src.buffer = b;
	f.type = "lowpass";
	f.frequency.value = cutoff;
	g.gain.value = volume;
	src.connect(f).connect(g).connect(dest);
	src.start(at);
}
export class HouseAudio {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.musicStep = 0;
		this.nextBeat = 0;
		this.playing = true;
		this.events = 0;
		this.voiceEvents = 0;
	}
	async unlock() {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.music = this.ctx.createGain();
			this.fx = this.ctx.createGain();
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.music.connect(this.master);
			this.fx.connect(this.master);
			this.master.connect(this.analyser).connect(this.ctx.destination);
			this.nextBeat = this.ctx.currentTime + 0.2;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this.volumes();
	}
	volumes() {
		if (!this.ctx) return;
		this.master.gain.value = this.playing ? this.settings.master : 0;
		this.music.gain.value = this.settings.music;
		this.fx.gain.value = this.settings.effects;
	}
	setPlaying(v) {
		this.playing = v;
		this.volumes();
	}
	tick(threat = 0) {
		if (this.ctx?.state !== "running" || !this.playing) return;
		const c = this.ctx;
		let safety = 0;
		while (this.nextBeat < c.currentTime + 0.15 && safety++ < 3) {
			if (this.nextBeat < c.currentTime - 0.4) this.nextBeat = c.currentTime;
			const k = this.musicStep++;
			const seq = [
				62, 69, 74, 65, 69, 72, 60, 67, 72, 64, 67, 70, 58, 65, 70, 62, 65, 69,
				57, 64, 69, 61, 64, 67,
			];
			const note = seq[k % seq.length];
			tone(c, this.music, {
				freq: midi(note),
				time: this.nextBeat,
				duration: 1.1,
				volume: 0.24,
				type: "sine",
				pan: Math.sin(k) * 0.45,
			});
			tone(c, this.music, {
				freq: midi(note + 12),
				time: this.nextBeat,
				duration: 0.65,
				volume: 0.045,
				type: "triangle",
			});
			if (k % 3 === 0)
				tone(c, this.music, {
					freq: midi(note - 24),
					time: this.nextBeat,
					duration: 1.7,
					volume: 0.18,
					type: "triangle",
				});
			if (threat > 0.5 && k % 2 === 0)
				tone(c, this.music, {
					freq: midi(38),
					time: this.nextBeat,
					duration: 0.25,
					volume: 0.07,
					type: "sine",
				});
			this.nextBeat += 0.43;
		}
	}
	sfx(name, pan = 0) {
		if (!this.ctx || !this.playing) return;
		this.events++;
		const c = this.ctx,
			d = this.fx,
			t = c.currentTime;
		const play = (f, dur = 0.2, v = 0.1, type = "sine", end = f, delay = 0) =>
			tone(c, d, {
				freq: f,
				duration: dur,
				volume: v,
				type,
				end,
				time: t + delay,
				pan,
			});
		if (name === "match") {
			noise(c, d, 0.24, 0.23, 6500);
			play(130, 0.15, 0.05, "sawtooth", 50);
		} else if (name === "step") {
			noise(c, d, 0.07, 0.12, 350);
			play(74, 0.065, 0.07, "sine", 40);
		} else if (name === "wind") {
			noise(c, d, 1.15, 0.21, 1200);
			play(180, 0.7, 0.035, "sine", 90);
		} else if (name === "door") {
			noise(c, d, 0.25, 0.15, 500);
			play(105, 0.4, 0.09, "sawtooth", 72);
		} else if (name === "unlock") {
			[74, 78, 81].forEach((n, i) => {
				play(midi(n), 0.42, 0.13, "triangle", midi(n), i * 0.09);
			});
			noise(c, d, 0.12, 0.12, 3000);
		} else if (name === "pickup") {
			[69, 74, 81].forEach((n, i) => {
				play(midi(n), 0.45, 0.13, "sine", midi(n), i * 0.07);
			});
		} else if (name === "join") {
			[62, 65, 69, 74, 81].forEach((n, i) => {
				play(midi(n), 0.7, 0.16, "triangle", midi(n), i * 0.1);
			});
		} else if (name === "scare") {
			noise(c, d, 0.6, 0.35, 1700);
			play(180, 0.6, 0.18, "sawtooth", 37);
			play(185, 0.8, 0.08, "sine", 42, 0.05);
		} else if (name === "bat") {
			play(560, 0.17, 0.08, "triangle", 130);
			noise(c, d, 0.2, 0.1, 5000);
		} else if (name === "ghost") {
			play(270, 0.85, 0.11, "sine", 130);
			play(274, 0.85, 0.06, "sine", 131);
		} else if (name === "spider") {
			noise(c, d, 0.18, 0.13, 1800);
			play(95, 0.14, 0.06, "square", 45);
		} else if (name === "up" || name === "down") {
			const ns = name === "up" ? [50, 57, 62, 69] : [69, 62, 57, 50];
			ns.forEach((n, i) => {
				play(midi(n), 0.65, 0.12, "triangle", midi(n), i * 0.12);
			});
		} else if (name === "win") {
			[62, 65, 69, 74, 77, 81, 86].forEach((n, i) => {
				play(midi(n), 1.2, 0.16, "triangle", midi(n), i * 0.14);
			});
		} else if (name === "lose") {
			[62, 61, 58, 50, 38].forEach((n, i) => {
				play(midi(n), 0.8, 0.15, "triangle", midi(n), i * 0.2);
			});
		} else if (name === "ui") {
			play(490, 0.055, 0.07, "sine", 650);
		}
	}
	voice(mood = "hmm") {
		if (!this.ctx || !this.playing) return;
		this.voiceEvents++;
		const c = this.ctx;
		const ns =
			mood === "boo"
				? [170, 235, 150, 120]
				: mood === "happy"
					? [340, 440, 390, 520]
					: [310, 250, 360];
		ns.forEach((f, i) => {
			tone(c, this.fx, {
				freq: f,
				time: c.currentTime + i * 0.095,
				duration: 0.085,
				volume: 0.055,
				type: "triangle",
				end: f * 1.23,
				pan: 0,
			});
			tone(c, this.fx, {
				freq: f * 2.8,
				time: c.currentTime + i * 0.095,
				duration: 0.07,
				volume: 0.017,
				type: "sine",
				end: f * 2.2,
			});
		});
	}
	levels() {
		if (!this.analyser) return 0;
		const d = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(d);
		return Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length);
	}
	async probe() {
		const c = new OfflineAudioContext(2, 24000, 24000),
			g = c.createGain();
		g.connect(c.destination);
		tone(c, g, {
			freq: 220,
			time: 0.01,
			duration: 0.4,
			volume: 0.2,
			type: "triangle",
			end: 330,
		});
		noise(c, g, 0.25, 0.12, 1200, 0.45);
		const b = await c.startRendering();
		let sum = 0,
			peak = 0;
		for (const x of b.getChannelData(0)) {
			sum += x * x;
			peak = Math.max(peak, Math.abs(x));
		}
		return {
			rms: Math.sqrt(sum / b.length),
			peak,
			samples: b.length,
			musicDefault: 0.1,
		};
	}
}
