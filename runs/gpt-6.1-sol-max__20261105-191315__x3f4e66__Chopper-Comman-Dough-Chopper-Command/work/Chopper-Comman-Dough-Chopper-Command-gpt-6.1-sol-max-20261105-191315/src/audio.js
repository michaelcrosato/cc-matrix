const notes = [0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 0, -2, 0, 5, 7, 3];
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
function tone(
	ctx,
	out,
	freq,
	time,
	duration,
	volume = 0.15,
	type = "triangle",
	slide = 0,
) {
	const osc = ctx.createOscillator(),
		gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, time);
	if (slide)
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, freq + slide),
			time + duration,
		);
	gain.gain.setValueAtTime(0, time);
	gain.gain.linearRampToValueAtTime(volume, time + 0.006);
	gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
	osc.connect(gain).connect(out);
	osc.start(time);
	osc.stop(time + duration + 0.02);
}
function noise(ctx, out, time, duration, volume = 0.15, frequency = 1500) {
	const b = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * duration),
			ctx.sampleRate,
		),
		data = b.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	const source = ctx.createBufferSource(),
		filter = ctx.createBiquadFilter(),
		g = ctx.createGain();
	source.buffer = b;
	filter.type = "bandpass";
	filter.frequency.value = frequency;
	filter.Q.value = 0.7;
	g.gain.setValueAtTime(volume, time);
	g.gain.exponentialRampToValueAtTime(0.001, time + duration);
	source.connect(filter).connect(g).connect(out);
	source.start(time);
	source.stop(time + duration);
}
function gibberish(ctx, out, time, seed = 0) {
	const vowels = [580, 930, 410, 760, 1150, 630];
	for (let i = 0; i < 7; i++) {
		const t = time + i * 0.095,
			freq = 150 + ((i * 37 + seed * 19) % 130),
			osc = ctx.createOscillator(),
			f1 = ctx.createBiquadFilter(),
			f2 = ctx.createBiquadFilter(),
			g = ctx.createGain();
		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(freq, t);
		osc.frequency.linearRampToValueAtTime(freq + (i % 2 ? 35 : -35), t + 0.075);
		f1.type = "bandpass";
		f1.frequency.value = vowels[(i + seed) % 6];
		f1.Q.value = 5;
		f2.type = "bandpass";
		f2.frequency.value = 1700 + (i % 3) * 300;
		f2.Q.value = 2;
		g.gain.setValueAtTime(0.001, t);
		g.gain.linearRampToValueAtTime(0.65, t + 0.014);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.088);
		osc.connect(f1).connect(g);
		osc.connect(f2).connect(g);
		g.connect(out);
		osc.start(t);
		osc.stop(t + 0.09);
	}
	noise(ctx, out, time, 0.06, 0.08, 2400);
	noise(ctx, out, time + 0.7, 0.08, 0.07, 2400);
}
export class AudioEngine {
	constructor() {
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.enabled = true;
		this.playing = false;
		this.step = 0;
		this.nextNote = 0;
		this.lastShot = 0;
		this.voices = 0;
		this.generated = 0;
	}
	async unlock() {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.55;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			const comp = this.ctx.createDynamicsCompressor();
			comp.threshold.value = -16;
			comp.ratio.value = 5;
			this.master
				.connect(comp)
				.connect(this.analyser)
				.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.music.gain.value = this.musicVolume;
			this.music.connect(this.master);
			this.sfx = this.ctx.createGain();
			this.sfx.gain.value = this.sfxVolume;
			this.sfx.connect(this.master);
			this.rotorGain = this.ctx.createGain();
			this.rotorGain.gain.value = 0;
			this.rotorGain.connect(this.sfx);
			const rotor = this.ctx.createOscillator(),
				lfo = this.ctx.createOscillator(),
				depth = this.ctx.createGain(),
				filter = this.ctx.createBiquadFilter();
			rotor.type = "sawtooth";
			rotor.frequency.value = 44;
			filter.type = "lowpass";
			filter.frequency.value = 180;
			lfo.frequency.value = 23;
			depth.gain.value = 0.025;
			lfo.connect(depth).connect(this.rotorGain.gain);
			rotor.connect(filter).connect(this.rotorGain);
			rotor.start();
			lfo.start();
			this.rotor = rotor;
			this.lfoDepth = depth;
			this.nextNote = this.ctx.currentTime + 0.05;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this.enabled = true;
	}
	volumes(music, sfx) {
		this.musicVolume = music;
		this.sfxVolume = sfx;
		if (this.ctx) {
			this.music.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
			this.sfx.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
		}
	}
	setPlaying(yes) {
		this.playing = yes;
	}
	update() {
		if (!this.ctx || !this.enabled) return;
		const now = this.ctx.currentTime;
		this.rotorGain.gain.setTargetAtTime(this.playing ? 0.045 : 0, now, 0.2);
		this.lfoDepth.gain.setTargetAtTime(this.playing ? 0.022 : 0, now, 0.2);
		if (this.nextNote < now - 0.5) this.nextNote = now + 0.05;
		while (this.nextNote < now + 0.15) {
			const k = this.step % 32,
				t = this.nextNote,
				root = [45, 45, 48, 43][Math.floor(this.step / 32) % 4];
			if (k % 4 === 0) {
				tone(this.ctx, this.music, hz(root - 12), t, 0.35, 0.5, "triangle");
				tone(this.ctx, this.music, 110, t, 0.16, 0.45, "sine", -78);
			}
			if (k % 8 === 4) {
				noise(this.ctx, this.music, t, 0.12, 0.28, 1900);
				tone(this.ctx, this.music, 180, t, 0.08, 0.13, "triangle", -80);
			}
			if (k % 2 === 0)
				noise(this.ctx, this.music, t, 0.035, k % 4 === 2 ? 0.11 : 0.07, 7400);
			if (k % 2 === 0) {
				const pitch = root + 24 + notes[(k / 2) % notes.length];
				tone(this.ctx, this.music, hz(pitch), t, 0.16, 0.12, "square");
				tone(
					this.ctx,
					this.music,
					hz(pitch + 12),
					t + 0.005,
					0.12,
					0.035,
					"triangle",
				);
			}
			this.step++;
			this.nextNote += 60 / 112 / 4;
			this.generated++;
		}
	}
	sound(name) {
		if (!this.ctx || !this.enabled) return;
		const t = this.ctx.currentTime,
			o = this.sfx;
		if (name === "shot") {
			if (t - this.lastShot < 0.065) return;
			this.lastShot = t;
			tone(this.ctx, o, 930, t, 0.06, 0.09, "square", -620);
		} else if (name === "hit") {
			noise(this.ctx, o, t, 0.055, 0.15, 1700);
			tone(this.ctx, o, 210, t, 0.06, 0.08, "triangle", -80);
		} else if (name === "explosion") {
			noise(this.ctx, o, t, 0.45, 0.5, 230);
			tone(this.ctx, o, 85, t, 0.4, 0.35, "sine", -60);
			noise(this.ctx, o, t, 0.12, 0.25, 1600);
		} else if (name === "flare") {
			noise(this.ctx, o, t, 0.4, 0.3, 3200);
			tone(this.ctx, o, 220, t, 0.4, 0.2, "triangle", 1200);
		} else if (name === "pickup" || name === "repair") {
			[0, 4, 7, 12].forEach((n, i) => {
				tone(this.ctx, o, hz(72 + n), t + i * 0.06, 0.16, 0.17, "triangle");
			});
		} else if (name === "hurt") {
			tone(this.ctx, o, 160, t, 0.2, 0.2, "sawtooth", -100);
			noise(this.ctx, o, t, 0.12, 0.18, 600);
		} else if (name === "ui") {
			tone(this.ctx, o, 640, t, 0.045, 0.12, "sine");
		} else if (name === "victory") {
			[0, 4, 7, 12, 7, 12, 16].forEach((n, i) => {
				tone(this.ctx, o, hz(60 + n), t + i * 0.13, 0.3, 0.24, "triangle");
			});
		}
		this.generated++;
	}
	voice(seed = 0) {
		if (this.ctx && this.enabled) {
			gibberish(this.ctx, this.sfx, this.ctx.currentTime, seed);
			this.voices++;
		}
	}
	stop() {
		this.enabled = false;
		if (this.ctx) {
			this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
		}
	}
	resume() {
		this.enabled = true;
		if (this.ctx)
			this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.02);
	}
	levels() {
		if (!this.analyser) return 0;
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		return Math.sqrt(a.reduce((s, n) => s + n * n, 0) / a.length);
	}
	async offlineProbe() {
		const ctx = new OfflineAudioContext(1, 48000 * 2, 48000);
		const out = ctx.createGain();
		out.gain.value = 0.5;
		out.connect(ctx.destination);
		tone(ctx, out, 220, 0, 0.3, 0.2);
		noise(ctx, out, 0.3, 0.2, 0.3, 1200);
		gibberish(ctx, out, 0.7, 2);
		const data = (await ctx.startRendering()).getChannelData(0);
		let peak = 0,
			sum = 0;
		for (const n of data) {
			peak = Math.max(peak, Math.abs(n));
			sum += n * n;
		}
		return {
			peak,
			rms: Math.sqrt(sum / data.length),
			length: data.length,
			musicDefault: 0.1,
		};
	}
}
