const midi = (n) => 440 * 2 ** ((n - 69) / 12);
function tone(
	ctx,
	out,
	freq,
	start,
	duration,
	volume = 0.12,
	type = "triangle",
	slide = 0,
) {
	const osc = ctx.createOscillator(),
		gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, start);
	if (slide)
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, freq + slide),
			start + duration,
		);
	gain.gain.setValueAtTime(0, start);
	gain.gain.linearRampToValueAtTime(volume, start + 0.008);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
	osc.connect(gain);
	gain.connect(out);
	osc.start(start);
	osc.stop(start + duration + 0.02);
	return osc;
}
function pluck(ctx, out, n, t, d = 0.3, v = 0.17) {
	tone(ctx, out, midi(n), t, d, v, "triangle");
	tone(ctx, out, midi(n) * 2, t, d * 0.4, v * 0.18, "sine");
}
function hiss(ctx, out, t, d = 0.09, v = 0.03) {
	const length = Math.ceil(ctx.sampleRate * d),
		buffer = ctx.createBuffer(1, length, ctx.sampleRate),
		data = buffer.getChannelData(0);
	let seed = 2345;
	for (let i = 0; i < length; i++) {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		data[i] = (seed / 2147483648 - 1) * (1 - i / length);
	}
	const src = ctx.createBufferSource(),
		filter = ctx.createBiquadFilter(),
		gain = ctx.createGain();
	src.buffer = buffer;
	filter.type = "highpass";
	filter.frequency.value = 1800;
	gain.gain.value = v;
	src.connect(filter);
	filter.connect(gain);
	gain.connect(out);
	src.start(t);
}
export class AudioSystem {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.7;
		this.enabled = true;
		this.mode = "idle";
		this.mood = 0;
		this.beat = 0;
		this.notes = 0;
		this.voices = 0;
		this.stopped = false;
	}
	async unlock() {
		if (this.stopped) return;
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.72;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.fx = this.ctx.createGain();
			this.music.connect(this.master);
			this.fx.connect(this.master);
			this.setVolumes(this.musicVolume, this.effectsVolume);
			this.next = this.ctx.currentTime + 0.06;
			this.timer = setInterval(() => this.schedule(), 80);
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	setVolumes(m, s) {
		this.musicVolume = m;
		this.effectsVolume = s;
		if (this.music) {
			this.music.gain.setTargetAtTime(m, this.ctx.currentTime, 0.06);
			this.fx.gain.setTargetAtTime(s, this.ctx.currentTime, 0.06);
		}
	}
	schedule() {
		if (!this.ctx || this.stopped || this.ctx.state !== "running") return;
		const ctx = this.ctx;
		while (this.next < ctx.currentTime + 0.25) {
			const t = this.next,
				b = this.beat++,
				floating = this.mode === "float",
				swim = this.mode === "swim";
			const melody = floating
				? [76, 79, 83, 79, 76, 74, 72, 76, 79, 76, 74, 71]
				: swim
					? [72, 0, 76, 79, 0, 76, 74, 0, 71, 74, 0, 67]
					: this.mood < 0
						? [69, 0, 67, 64, 0, 65, 62, 0, 64, 0, 60, 0, 62, 0, 64, 0]
						: [
								72, 76, 79, 0, 81, 79, 76, 74, 72, 0, 67, 69, 72, 76, 74, 0, 76,
								79, 84, 83, 81, 0, 79, 76, 74, 72, 69, 67, 72, 0, 0, 0,
							];
			const n = melody[b % melody.length];
			if (n) {
				pluck(ctx, this.music, n, t, floating ? 0.34 : 0.24, 0.24);
				this.notes++;
			}
			const meter = floating ? 3 : 4;
			if (b % meter === 0) {
				tone(
					ctx,
					this.music,
					midi([48, 53, 55, 48][Math.floor(b / (meter * 2)) % 4]),
					t,
					0.45,
					0.19,
					"sine",
				);
				this.notes++;
			}
			if (b % 2 === 1) {
				pluck(ctx, this.music, swim ? 60 : 64, t, 0.1, 0.045);
				hiss(ctx, this.music, t, 0.06, 0.035);
			}
			this.next += floating ? 0.25 : swim ? 0.3 : this.mood < 0 ? 0.34 : 0.235;
			this.mood = Math.min(0, this.mood + 0.04);
		}
	}
	event(name, data = {}) {
		if (!this.ctx || this.stopped) return;
		const c = this.ctx,
			t = c.currentTime,
			out = this.fx;
		if (name === "jump") {
			tone(c, out, data.water ? 270 : 180, t, 0.16, 0.13, "triangle", 240);
		}
		if (name === "collect") {
			if (data.kind === "rat") this.voice(1);
			for (let i = 0; i < 3; i++)
				pluck(c, out, 79 + i * 4, t + i * 0.055, 0.22, 0.19);
			this.mood = 0;
		}
		if (name === "checkpoint") {
			for (let i = 0; i < 3; i++)
				tone(c, out, midi(67 + i * 5), t + i * 0.09, 0.6, 0.07, "sine");
		}
		if (name === "rescue") {
			this.voice(data.kind === "fox" ? 1.4 : 1);
			for (let i = 0; i < 5; i++)
				pluck(c, out, [72, 76, 79, 84, 88][i], t + i * 0.1, 0.5, 0.17);
			this.mood = 0;
		}
		if (name === "hit") {
			tone(c, out, 380, t, 0.5, 0.19, "sawtooth", -300);
			tone(c, out, 110, t + 0.08, 0.4, 0.11, "sine", -60);
			this.mood = -3;
		}
		if (name === "water") {
			hiss(c, out, t, 0.35, 0.18);
			tone(c, out, 230, t, 0.18, 0.12, "sine", -130);
		}
		if (name === "balloon") {
			if (data.kind === "pop") {
				hiss(c, out, t, 0.16, 0.3);
				tone(c, out, 380, t, 0.1, 0.17, "triangle", -200);
			} else {
				tone(c, out, 330, t, 0.3, 0.12, "sine", 250);
				tone(c, out, 550, t + 0.1, 0.4, 0.07, "sine", 200);
			}
		}
		if (name === "finish") {
			for (let i = 0; i < 12; i++)
				pluck(
					c,
					out,
					[72, 76, 79, 84, 79, 84, 88, 91, 88, 84, 79, 84][i],
					t + i * 0.13,
					0.7,
					0.16,
				);
			this.voice(0.8);
		}
		if (name === "menu") tone(c, out, 440, t, 0.055, 0.035, "sine", 100);
		if (name === "step") hiss(c, out, t, 0.045, 0.07);
	}
	voice(pitch = 1) {
		if (!this.ctx) return;
		const c = this.ctx,
			t = c.currentTime;
		for (let i = 0; i < 7; i++) {
			const base = [260, 340, 290, 410, 310, 370, 250][i] * pitch;
			const osc = c.createOscillator(),
				filter = c.createBiquadFilter(),
				g = c.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(base, t + i * 0.085);
			osc.frequency.linearRampToValueAtTime(base * 1.2, t + i * 0.085 + 0.06);
			filter.type = "bandpass";
			filter.frequency.value = 900 + (i % 3) * 550;
			filter.Q.value = 3;
			g.gain.setValueAtTime(0, t + i * 0.085);
			g.gain.linearRampToValueAtTime(0.07, t + i * 0.085 + 0.012);
			g.gain.linearRampToValueAtTime(0, t + i * 0.085 + 0.075);
			osc.connect(filter);
			filter.connect(g);
			g.connect(this.fx);
			osc.start(t + i * 0.085);
			osc.stop(t + i * 0.085 + 0.08);
		}
		this.voices++;
	}
	stop() {
		this.stopped = true;
		if (this.timer) clearInterval(this.timer);
		if (this.ctx) {
			this.master.gain.setValueAtTime(0, this.ctx.currentTime);
			this.ctx.suspend();
		}
	}
	level() {
		if (!this.analyser) return 0;
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		return Math.sqrt(a.reduce((s, n) => s + n * n, 0) / a.length);
	}
	async proof() {
		const c = new OfflineAudioContext(1, 44100, 44100),
			out = c.createGain();
		out.gain.value = 0.1;
		out.connect(c.destination);
		for (let i = 0; i < 8; i++)
			pluck(c, out, [72, 76, 79, 84][i % 4], i * 0.1, 0.25, 0.25);
		hiss(c, out, 0.4, 0.2, 0.1);
		const buffer = await c.startRendering(),
			data = buffer.getChannelData(0);
		let sum = 0,
			peak = 0;
		for (const v of data) {
			sum += v * v;
			peak = Math.max(peak, Math.abs(v));
		}
		return {
			peak,
			rms: Math.sqrt(sum / data.length),
			samples: data.length,
			musicDefault: 0.1,
		};
	}
}
