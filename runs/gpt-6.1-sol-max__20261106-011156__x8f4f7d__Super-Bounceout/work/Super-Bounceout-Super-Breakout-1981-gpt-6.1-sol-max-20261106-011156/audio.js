function synthTone(
	ctx,
	dest,
	frequency,
	when,
	duration,
	gain = 0.1,
	type = "sine",
	endFrequency,
) {
	const osc = ctx.createOscillator(),
		env = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(frequency, when);
	if (endFrequency)
		osc.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
	env.gain.setValueAtTime(0, when);
	env.gain.linearRampToValueAtTime(gain, when + 0.006);
	env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
	osc.connect(env).connect(dest);
	osc.start(when);
	osc.stop(when + duration + 0.01);
}
class SoundRack {
	constructor(settings) {
		this.settings = settings;
		this.step = 0;
		this.next = 0;
		this.started = false;
		this.silent = false;
		this.notes = 0;
	}
	unlock() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.72;
			this.music = this.ctx.createGain();
			this.fx = this.ctx.createGain();
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			this.music.connect(this.master);
			this.fx.connect(this.master);
			this.master.connect(this.analyser).connect(this.ctx.destination);
			this.next = this.ctx.currentTime + 0.06;
			this.noise = this.ctx.createBuffer(
				1,
				this.ctx.sampleRate * 0.15,
				this.ctx.sampleRate,
			);
			const d = this.noise.getChannelData(0);
			for (let i = 0; i < d.length; i++)
				d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
		}
		this.ctx.resume().catch(() => {});
		this.started = true;
		this.updateVolumes();
	}
	updateVolumes() {
		if (!this.ctx) return;
		this.music.gain.setTargetAtTime(
			this.silent || this.settings.mute ? 0 : this.settings.music,
			this.ctx.currentTime,
			0.04,
		);
		this.fx.gain.setTargetAtTime(
			this.silent || this.settings.mute ? 0 : this.settings.sfx,
			this.ctx.currentTime,
			0.02,
		);
	}
	setSilent(v) {
		this.silent = v;
		this.updateVolumes();
	}
	tone(freq, dur, gain = 0.12, type = "sine", end) {
		if (this.ctx && !this.silent && !this.settings.mute) {
			synthTone(
				this.ctx,
				this.fx,
				freq,
				this.ctx.currentTime,
				dur,
				gain,
				type,
				end,
			);
			this.notes++;
		}
	}
	effect(type, value = 0) {
		if (type === "brick")
			this.tone(
				280 + (value % 7) * 72,
				0.12,
				0.12,
				"triangle",
				560 + value * 3,
			);
		if (type === "wall") this.tone(155, 0.045, 0.045, "sine", 120);
		if (type === "paddle") this.tone(220, 0.12, 0.17, "triangle", 360);
		if (type === "pop") {
			this.tone(130, 0.24, 0.24, "sawtooth", 850);
			this.tone(880, 0.3, 0.12, "triangle", 440);
		}
		if (type === "serve") this.tone(190, 0.19, 0.13, "square", 500);
		if (type === "miss") this.tone(210, 0.55, 0.16, "triangle", 55);
		if (type === "advance") this.tone(72, 0.25, 0.13, "sawtooth", 50);
		if (type === "menu") this.tone(520, 0.07, 0.08, "sine", 720);
		if (type === "free" || type === "win") {
			if (!this.ctx || this.silent || this.settings.mute) return;
			[0, 4, 7, 12].forEach((n, i) => {
				synthTone(
					this.ctx,
					this.fx,
					440 * 2 ** (n / 12),
					this.ctx.currentTime + i * 0.1,
					0.3,
					0.14,
					"triangle",
				);
			});
			this.voice(type === "win" ? 5 : 3);
		}
	}
	voice(syllables = 3) {
		if (!this.ctx || this.silent || this.settings.mute) return;
		for (let i = 0; i < syllables; i++) {
			const at = this.ctx.currentTime + 0.1 + i * 0.095;
			const filter = this.ctx.createBiquadFilter();
			filter.type = "bandpass";
			filter.frequency.value = [800, 1300, 950, 1700, 650][i % 5];
			filter.Q.value = 2.4;
			filter.connect(this.fx);
			synthTone(
				this.ctx,
				filter,
				[210, 290, 245, 330, 260][i % 5],
				at,
				0.075,
				0.28,
				"sawtooth",
				180 + i * 35,
			);
		}
	}
	tick() {
		if (!this.ctx || this.silent || this.settings.mute) return;
		if (this.next < this.ctx.currentTime - 0.5)
			this.next = this.ctx.currentTime + 0.02;
		while (this.next < this.ctx.currentTime + 0.12) {
			const at = this.next,
				s = this.step % 32;
			const chord = [
				[0, 3, 7, 10],
				[5, 8, 12, 15],
				[8, 12, 15, 19],
				[7, 10, 14, 17],
			][Math.floor(s / 8)];
			if (s % 4 === 0) {
				synthTone(
					this.ctx,
					this.music,
					55 * 2 ** (chord[0] / 12),
					at,
					0.35,
					0.22,
					"triangle",
				);
				synthTone(this.ctx, this.music, 90, at, 0.12, 0.28, "sine", 35);
			}
			if (s % 4 === 2)
				synthTone(
					this.ctx,
					this.music,
					164.81 * 2 ** (chord[(s / 2) % 4] / 12),
					at,
					0.3,
					0.1,
					"triangle",
				);
			if (s % 8 === 0)
				for (const n of chord)
					synthTone(
						this.ctx,
						this.music,
						220 * 2 ** (n / 12),
						at,
						0.8,
						0.045,
						"sine",
					);
			const noise = this.ctx.createBufferSource(),
				env = this.ctx.createGain(),
				hp = this.ctx.createBiquadFilter();
			noise.buffer = this.noise;
			hp.type = "highpass";
			hp.frequency.value = s % 4 === 2 ? 1300 : 7000;
			env.gain.setValueAtTime(s % 4 === 2 ? 0.07 : 0.025, at);
			env.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
			noise.connect(hp).connect(env).connect(this.music);
			noise.start(at);
			noise.stop(at + 0.07);
			this.step++;
			this.next += 60 / 108 / 2;
		}
	}
	level() {
		if (!this.analyser) return 0;
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
	}
}
