const audio = {
	ctx: null,
	master: null,
	music: null,
	sfx: null,
	analyser: null,
	next: 0,
	beat: 0,
	events: 0,
	voices: 0,
};
function tone(
	ctx,
	dest,
	freq,
	start,
	duration = 0.2,
	type = "sine",
	gain = 0.16,
	endFreq = freq,
) {
	const osc = ctx.createOscillator(),
		env = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, start);
	osc.frequency.exponentialRampToValueAtTime(
		Math.max(20, endFreq),
		start + duration,
	);
	env.gain.setValueAtTime(0, start);
	env.gain.linearRampToValueAtTime(gain, start + 0.006);
	env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
	osc.connect(env).connect(dest);
	osc.start(start);
	osc.stop(start + duration + 0.01);
	return osc;
}
function noise(ctx, dest, start, duration = 0.09, gain = 0.1, cutoff = 1500) {
	const buffer = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * duration),
			ctx.sampleRate,
		),
		data = buffer.getChannelData(0);
	let ns = 47;
	for (let i = 0; i < data.length; i++) {
		ns = (Math.imul(ns, 1664525) + 1013904223) >>> 0;
		data[i] = (ns / 2147483648 - 1) * (1 - i / data.length);
	}
	const src = ctx.createBufferSource(),
		filter = ctx.createBiquadFilter(),
		env = ctx.createGain();
	src.buffer = buffer;
	filter.type = "lowpass";
	filter.frequency.value = cutoff;
	env.gain.value = gain;
	src.connect(filter).connect(env).connect(dest);
	src.start(start);
}
function unlockAudio() {
	if (hubEnded) return;
	if (!audio.ctx) {
		const ctx = new AudioContext();
		audio.ctx = ctx;
		audio.master = ctx.createGain();
		audio.music = ctx.createGain();
		audio.sfx = ctx.createGain();
		audio.analyser = ctx.createAnalyser();
		audio.analyser.fftSize = 1024;
		const limiter = ctx.createDynamicsCompressor();
		limiter.threshold.value = -12;
		limiter.ratio.value = 8;
		audio.music.connect(audio.master);
		audio.sfx.connect(audio.master);
		audio.master
			.connect(limiter)
			.connect(audio.analyser)
			.connect(ctx.destination);
		audio.master.gain.value = 0.65;
		audio.next = ctx.currentTime + 0.05;
	}
	audio.ctx.resume().catch(() => {});
	setAudioVolumes();
}
function setAudioVolumes() {
	if (!audio.ctx) return;
	audio.music.gain.setTargetAtTime(
		settings.music / 100,
		audio.ctx.currentTime,
		0.04,
	);
	audio.sfx.gain.setTargetAtTime(
		settings.sfx / 100,
		audio.ctx.currentTime,
		0.04,
	);
}
function sound(kind) {
	if (
		!audio.ctx ||
		audio.ctx.state !== "running" ||
		game.mode === "attract" ||
		game.mode === "hubEnded"
	)
		return;
	const ctx = audio.ctx,
		t = ctx.currentTime,
		dest = audio.sfx;
	audio.events++;
	if (kind === "jump") tone(ctx, dest, 220, t, 0.13, "triangle", 0.18, 480);
	if (kind === "step") noise(ctx, dest, t, 0.035, 0.06, 650);
	if (kind === "coin") {
		tone(ctx, dest, 880, t, 0.13, "sine", 0.12);
		tone(ctx, dest, 1320, t + 0.045, 0.13, "sine", 0.08);
	}
	if (kind === "treasure") {
		[0, 4, 7, 12].forEach((n, i) =>
			tone(
				ctx,
				dest,
				440 * 2 ** (n / 12),
				t + i * 0.09,
				0.35,
				"triangle",
				0.18,
			),
		);
		gibberish(1.2);
	}
	if (kind === "hurt") {
		noise(ctx, dest, t, 0.2, 0.24, 900);
		tone(ctx, dest, 160, t, 0.35, "sawtooth", 0.1, 55);
		gibberish(0.72);
	}
	if (kind === "swing") {
		gibberish(1.5);
		tone(ctx, dest, 180, t, 0.42, "sine", 0.1, 540);
	}
	if (kind === "camp") {
		[0, 7, 12].forEach((n, i) =>
			tone(ctx, dest, 330 * 2 ** (n / 12), t + i * 0.12, 0.4, "sine", 0.12),
		);
	}
	if (kind === "win") {
		[0, 4, 7, 12, 7, 12, 16].forEach((n, i) =>
			tone(ctx, dest, 330 * 2 ** (n / 12), t + i * 0.15, 0.5, "triangle", 0.19),
		);
		gibberish(1.4);
	}
	if (kind === "ui") tone(ctx, dest, 470, t, 0.045, "sine", 0.07, 620);
}
function gibberish(pitch = 1) {
	if (!audio.ctx) return;
	const ctx = audio.ctx,
		t = ctx.currentTime;
	audio.voices++;
	for (let i = 0; i < 4; i++) {
		const f = ctx.createBiquadFilter();
		f.type = "bandpass";
		f.frequency.value = [700, 1200, 900, 1500][i] * pitch;
		f.Q.value = 3;
		f.connect(audio.sfx);
		tone(
			ctx,
			f,
			[210, 285, 245, 340][i] * pitch,
			t + i * 0.075,
			0.1,
			"sawtooth",
			0.12,
			[270, 235, 320, 230][i] * pitch,
		);
	}
}
function musicTick() {
	if (!audio.ctx || audio.ctx.state !== "running" || game.mode === "hubEnded")
		return;
	const ctx = audio.ctx;
	const notes = [0, 7, 12, 14, 16, 12, 7, 4, 0, 7, 12, 19, 16, 14, 12, 7];
	if (audio.next < ctx.currentTime - 0.2) audio.next = ctx.currentTime + 0.03;
	while (audio.next < ctx.currentTime + 0.12) {
		const n = notes[audio.beat % notes.length];
		const freq = 196 * 2 ** (n / 12);
		tone(ctx, audio.music, freq, audio.next, 0.46, "sine", 0.23);
		tone(ctx, audio.music, freq * 2, audio.next, 0.13, "triangle", 0.055);
		if (audio.beat % 4 === 0)
			tone(
				ctx,
				audio.music,
				98 * (audio.beat % 16 < 8 ? 1 : 0.75),
				audio.next,
				0.7,
				"sine",
				0.22,
			);
		if (audio.beat % 2 === 0)
			noise(ctx, audio.music, audio.next, 0.06, 0.06, 2600);
		audio.next += 0.265;
		audio.beat++;
	}
}
async function audioProof() {
	const ctx = new OfflineAudioContext(1, 22050, 22050);
	const g = ctx.createGain();
	g.gain.value = 0.5;
	g.connect(ctx.destination);
	tone(ctx, g, 440, 0, 0.3, "triangle", 0.3, 660);
	noise(ctx, g, 0.35, 0.1, 0.12);
	const f = ctx.createBiquadFilter();
	f.type = "bandpass";
	f.frequency.value = 1100;
	f.connect(g);
	tone(ctx, f, 240, 0.5, 0.18, "sawtooth", 0.3, 340);
	const rendered = await ctx.startRendering();
	const d = rendered.getChannelData(0);
	let sum = 0,
		peak = 0;
	for (const x of d) {
		sum += x * x;
		peak = Math.max(peak, Math.abs(x));
	}
	return { rms: Math.sqrt(sum / d.length), peak, samples: d.length };
}
