export function noteTone(
	ctx,
	output,
	frequency,
	start,
	duration,
	volume = 0.15,
	wave = "triangle",
	slide = null,
) {
	const osc = ctx.createOscillator(),
		amp = ctx.createGain();
	osc.type = wave;
	osc.frequency.setValueAtTime(Math.max(20, frequency), start);
	if (slide)
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, slide),
			start + duration,
		);
	amp.gain.setValueAtTime(0.0001, start);
	amp.gain.exponentialRampToValueAtTime(
		Math.max(0.0002, volume),
		start + 0.008,
	);
	amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
	osc.connect(amp).connect(output);
	osc.start(start);
	osc.stop(start + duration + 0.01);
	return osc;
}
const melody = [
	74, 0, 69, 72, 74, 77, 76, 72, 69, 0, 67, 65, 67, 69, 72, 0, 74, 0, 77, 79,
	77, 76, 74, 72, 69, 72, 67, 0, 65, 67, 69, 0, 72, 0, 76, 77, 79, 77, 76, 72,
	74, 0, 72, 69, 67, 65, 64, 0, 65, 69, 72, 74, 77, 76, 74, 72, 69, 67, 65, 64,
	62, 0, 0, 0,
];
const bass = [38, 45, 41, 48, 43, 50, 38, 45];
export const mtof = (n) => 440 * 2 ** ((n - 69) / 12);
export function musicStep(ctx, output, index, time, fast = false) {
	const n = melody[index % melody.length];
	if (n) {
		noteTone(ctx, output, mtof(n), time, 0.15, 0.19, "square");
		noteTone(ctx, output, mtof(n + 12), time + 0.01, 0.1, 0.025, "sine");
	}
	if (index % 4 === 0)
		noteTone(
			ctx,
			output,
			mtof(bass[Math.floor(index / 4) % bass.length]),
			time,
			0.22,
			0.31,
			"triangle",
		);
	if (index % 4 === 2)
		for (const n of [57, 60, 64])
			noteTone(
				ctx,
				output,
				mtof(n + (Math.floor(index / 16) % 2 ? 2 : 0)),
				time,
				0.09,
				0.055,
				"triangle",
			);
	if (index % 2 === 1)
		noteTone(ctx, output, 1600, time, 0.028, 0.035, "sawtooth", 700);
}
export class AudioRack {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.step = 0;
		this.next = 0;
		this.playing = false;
		this.paused = false;
		this.notes = 0;
		this.sfxCount = 0;
		this.voiceCount = 0;
		this.ended = false;
	}
	async unlock() {
		if (this.ended) return;
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.music = this.ctx.createGain();
			this.effects = this.ctx.createGain();
			this.voices = this.ctx.createGain();
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.music.connect(this.master);
			this.effects.connect(this.master);
			this.voices.connect(this.master);
			this.master.connect(this.analyser).connect(this.ctx.destination);
			this.master.gain.value = 0.65;
			this.next = this.ctx.currentTime + 0.05;
			this.apply();
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this.playing = true;
	}
	apply() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		this.music.gain.setTargetAtTime(
			this.settings.music * (this.paused ? 0.3 : 1),
			t,
			0.04,
		);
		this.effects.gain.setTargetAtTime(this.settings.sfx, t, 0.04);
		this.voices.gain.setTargetAtTime(this.settings.voices, t, 0.04);
		this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 0.65, t, 0.04);
	}
	update(state, menu = false) {
		if (
			!this.ctx ||
			!this.playing ||
			this.ctx.state !== "running" ||
			this.ended
		)
			return;
		const tempo =
			state?.phaseDef?.bonus || [2, 5].includes(state?.phase) ? 0.12 : 0.155;
		if (this.next < this.ctx.currentTime - 0.5)
			this.next = this.ctx.currentTime + 0.02;
		while (this.next < this.ctx.currentTime + 0.15) {
			musicStep(this.ctx, this.music, this.step, this.next);
			this.notes++;
			this.next += tempo * (this.step % 2 === 0 ? 1.12 : 0.88);
			this.step++;
		}
	}
	fx(type) {
		if (!this.ctx || this.ctx.state !== "running" || this.ended) return;
		this.sfxCount++;
		const t = this.ctx.currentTime,
			out = this.effects,
			c = this.ctx;
		if (type === "jump" || type === "hop")
			noteTone(
				c,
				out,
				type === "jump" ? 190 : 350,
				t,
				0.15,
				0.19,
				"square",
				580,
			);
		if (type === "bump") {
			noteTone(c, out, 130, t, 0.1, 0.4, "triangle", 45);
			noteTone(c, out, 720, t, 0.055, 0.07, "square", 240);
		}
		if (type === "flip") {
			noteTone(c, out, 280, t, 0.12, 0.25, "square", 820);
			noteTone(c, out, 520, t + 0.06, 0.13, 0.18, "triangle", 1000);
		}
		if (type === "armor") {
			noteTone(c, out, 160, t, 0.13, 0.25, "sawtooth", 80);
			noteTone(c, out, 620, t + 0.08, 0.1, 0.15, "square", 450);
		}
		if (type === "kick") {
			noteTone(c, out, 80, t, 0.18, 0.35, "triangle", 32);
			noteTone(c, out, 420, t + 0.02, 0.15, 0.18, "square", 1400);
		}
		if (type === "coin") {
			noteTone(c, out, 1046, t, 0.07, 0.18, "sine");
			noteTone(c, out, 1568, t + 0.06, 0.2, 0.18, "triangle");
		}
		if (type === "bop") {
			for (let i = 0; i < 4; i++)
				noteTone(
					c,
					out,
					120 + i * 60,
					t + i * 0.025,
					0.4,
					0.16,
					"sawtooth",
					30,
				);
		}
		if (type === "hurt") {
			[700, 520, 370, 190].forEach((f, i) =>
				noteTone(c, out, f, t + i * 0.08, 0.13, 0.22, "square", f / 1.3),
			);
			this.babble("oops");
		}
		if (type === "freeze" || type === "shatter")
			for (let i = 0; i < 6; i++)
				noteTone(
					c,
					out,
					1600 + i * 240,
					t + i * 0.025,
					0.14,
					0.07,
					"sine",
					600,
				);
		if (type === "clear" || type === "phase" || type === "extra") {
			const notes = type === "phase" ? [62, 69, 74] : [65, 69, 72, 77];
			notes.forEach((n, i) =>
				noteTone(c, out, mtof(n), t + i * 0.1, 0.25, 0.21, "square"),
			);
		}
		if (type === "victory") {
			[62, 66, 69, 74, 73, 74, 78, 81, 86].forEach((n, i) =>
				noteTone(c, out, mtof(n), t + i * 0.15, 0.3, 0.17, "square"),
			);
			this.babble("hooray");
		}
		if (type === "gameover")
			[69, 67, 65, 61, 57].forEach((n, i) =>
				noteTone(c, out, mtof(n), t + i * 0.18, 0.3, 0.19, "triangle"),
			);
		if (type === "wrap" || type === "pipe" || type === "respawn")
			noteTone(c, out, 520, t, 0.2, 0.13, "sine", 100);
		if (type === "ui") noteTone(c, out, 620, t, 0.045, 0.12, "triangle", 900);
	}
	babble(kind = "hello") {
		if (!this.ctx || this.ended || this.ctx.state !== "running") return;
		this.voiceCount++;
		const patterns = {
			hello: [1, 1.25, 0.9, 1.5],
			oops: [1.2, 0.8, 0.65],
			hooray: [1, 1.3, 1.6, 1.3, 1.8],
			cold: [0.7, 0.85, 0.7, 1.1],
		};
		const notes = patterns[kind] || patterns.hello,
			time = this.ctx.currentTime;
		notes.forEach((n, i) => {
			const vowel = this.ctx.createBiquadFilter();
			vowel.type = "bandpass";
			vowel.frequency.value = [800, 1450, 500, 1800, 950][i % 5];
			vowel.Q.value = 3;
			vowel.connect(this.voices);
			noteTone(
				this.ctx,
				vowel,
				240 * n,
				time + i * 0.095,
				0.09,
				0.45,
				"sawtooth",
				280 * n,
			);
			noteTone(
				this.ctx,
				vowel,
				480 * n,
				time + i * 0.095,
				0.085,
				0.14,
				"triangle",
			);
		});
	}
	pause(on) {
		this.paused = on;
		this.apply();
	}
	async stop() {
		this.ended = true;
		this.playing = false;
		if (this.ctx) {
			this.master.gain.value = 0;
			await this.ctx.suspend();
		}
	}
	level() {
		if (!this.analyser) return 0;
		const b = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(b);
		return Math.sqrt(
			b.reduce((s, x) => s + ((x - 128) / 128) ** 2, 0) / b.length,
		);
	}
	async offlineCheck() {
		const c = new OfflineAudioContext(1, 44100 * 2, 44100);
		const gain = c.createGain();
		gain.gain.value = 0.1;
		gain.connect(c.destination);
		for (let i = 0; i < 12; i++) musicStep(c, gain, i, i * 0.155);
		const buffer = await c.startRendering();
		const data = buffer.getChannelData(0);
		return {
			rms: Math.sqrt(data.reduce((s, x) => s + x * x, 0) / data.length),
			peak: data.reduce((s, x) => Math.max(s, Math.abs(x)), 0),
			duration: buffer.duration,
		};
	}
}
