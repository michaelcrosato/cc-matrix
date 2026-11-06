// Pressure Buns: every sound is synthesized here. No samples or audio files.
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(v) || 0));
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const REST = null;
const TUNE = [
	76,
	REST,
	79,
	81,
	79,
	76,
	74,
	REST,
	72,
	74,
	76,
	REST,
	79,
	76,
	74,
	72,
	69,
	REST,
	72,
	76,
	74,
	72,
	69,
	REST,
	67,
	69,
	72,
	74,
	76,
	REST,
	74,
	71,
];
const CHORDS = [
	[48, 52, 55, 59],
	[45, 48, 52, 55],
	[41, 45, 48, 52],
	[43, 47, 50, 53],
];

function tone(
	ctx,
	out,
	{
		at,
		frequency,
		endFrequency,
		duration = 0.12,
		volume = 0.1,
		type = "triangle",
		attack = 0.006,
		filter = 6000,
		pan = 0,
		detune = 0,
	},
) {
	const osc = ctx.createOscillator();
	const amp = ctx.createGain();
	const low = ctx.createBiquadFilter();
	const stereo = ctx.createStereoPanner();
	osc.type = type;
	osc.frequency.setValueAtTime(Math.max(20, frequency), at);
	if (endFrequency)
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, endFrequency),
			at + duration,
		);
	osc.detune.value = detune;
	low.type = "lowpass";
	low.frequency.value = filter;
	stereo.pan.value = clamp(pan, -1, 1);
	amp.gain.setValueAtTime(0, at);
	amp.gain.linearRampToValueAtTime(volume, at + Math.min(attack, duration / 3));
	amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	osc.connect(low).connect(amp).connect(stereo).connect(out);
	osc.start(at);
	osc.stop(at + duration + 0.02);
}

function makeNoise(ctx) {
	const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	let seed = 1983;
	for (let i = 0; i < data.length; i++) {
		seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
		data[i] = (seed >>> 0) / 2147483648 - 1;
	}
	return buffer;
}

function noise(
	ctx,
	out,
	buffer,
	at,
	duration,
	volume,
	cutoff = 3200,
	type = "highpass",
) {
	const src = ctx.createBufferSource();
	const filter = ctx.createBiquadFilter();
	const amp = ctx.createGain();
	src.buffer = buffer;
	filter.type = type;
	filter.frequency.value = cutoff;
	amp.gain.setValueAtTime(volume, at);
	amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	src.connect(filter).connect(amp).connect(out);
	src.start(at);
	src.stop(at + duration + 0.01);
}

function musicStep(ctx, out, buffer, step, at, shift, menu = false, combo = 0) {
	const eighth = 60 / (116 + (shift - 1) * 9) / 2;
	const bar = Math.floor(step / 8);
	const beat = step % 8;
	const chord = CHORDS[bar % CHORDS.length];
	// A walking bass, dry brushed kit, and a tiny toy-piano lead.
	if (beat % 2 === 0) {
		const bass = [chord[0] - 12, chord[2] - 12, chord[0], chord[1] - 12][
			beat / 2
		];
		tone(ctx, out, {
			at,
			frequency: hz(bass),
			duration: eighth * 1.7,
			volume: 0.34,
			type: "triangle",
			filter: 650,
		});
		tone(ctx, out, {
			at,
			frequency: 115,
			endFrequency: 44,
			duration: 0.13,
			volume: menu ? 0.1 : 0.19,
			type: "sine",
		});
	}
	if (beat === 2 || beat === 6) {
		noise(ctx, out, buffer, at, 0.12, menu ? 0.025 : 0.07, 1400, "bandpass");
		tone(ctx, out, {
			at,
			frequency: 180,
			endFrequency: 100,
			duration: 0.07,
			volume: 0.055,
			type: "triangle",
		});
	}
	noise(
		ctx,
		out,
		buffer,
		at,
		beat % 2 ? 0.06 : 0.025,
		menu ? 0.014 : 0.033,
		6800,
	);
	if (beat === 1 || beat === 5) {
		chord.slice(1).forEach((note, i) => {
			tone(ctx, out, {
				at: at + i * 0.009,
				frequency: hz(note + 12),
				duration: 0.13,
				volume: 0.058,
				type: "triangle",
				filter: 2100,
				pan: -0.28,
			});
		});
	}
	const note = TUNE[step % TUNE.length];
	if (note !== REST) {
		const noteHz = hz(note + (combo >= 5 && beat === 7 ? 12 : 0));
		tone(ctx, out, {
			at,
			frequency: noteHz,
			duration: eighth * 0.76,
			volume: 0.21,
			type: "triangle",
			filter: 3400,
			pan: 0.15,
		});
		tone(ctx, out, {
			at,
			frequency: noteHz * 2,
			duration: 0.055,
			volume: 0.035,
			type: "sine",
			pan: 0.15,
		});
	}
}

function effect(ctx, out, buffer, name, at) {
	const note = (
		frequency,
		duration,
		volume,
		delay = 0,
		type = "triangle",
		endFrequency,
	) =>
		tone(ctx, out, {
			at: at + delay,
			frequency,
			duration,
			volume,
			type,
			endFrequency,
		});
	switch (name) {
		case "catch":
			note(420, 0.07, 0.14, 0, "sine", 970);
			note(1150, 0.08, 0.065, 0.04, "triangle");
			break;
		case "reject":
			note(290, 0.14, 0.14, 0, "triangle", 660);
			noise(ctx, out, buffer, at, 0.055, 0.055, 2200);
			break;
		case "add":
			note(520, 0.065, 0.12, 0, "triangle");
			note(780, 0.09, 0.1, 0.04, "sine");
			noise(ctx, out, buffer, at, 0.04, 0.045, 800, "lowpass");
			break;
		case "ready":
			[72, 76, 79, 84].forEach((n, i) => {
				note(hz(n), 0.18, 0.11, i * 0.062);
			});
			break;
		case "serve":
			[72, 76, 79, 84, 88].forEach((n, i) => {
				note(hz(n), 0.27, 0.1, i * 0.055);
			});
			note(1250, 0.5, 0.06, 0.14, "sine");
			noise(ctx, out, buffer, at + 0.1, 0.2, 0.035, 6500);
			break;
		case "wrong":
			note(195, 0.22, 0.12, 0, "sawtooth", 135);
			note(143, 0.26, 0.055, 0.09, "triangle", 90);
			noise(ctx, out, buffer, at, 0.13, 0.055, 900, "lowpass");
			break;
		case "dash":
			noise(ctx, out, buffer, at, 0.18, 0.1, 2200);
			note(180, 0.13, 0.055, 0, "sine", 540);
			break;
		case "lose":
			[67, 64, 60, 55, 48].forEach((n, i) => {
				note(hz(n), 0.32, 0.12, i * 0.16);
			});
			break;
		case "win":
			[60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) => {
				note(hz(n), i === 8 ? 0.8 : 0.24, 0.12, i * 0.1);
			});
			break;
		case "menu":
			note(660, 0.04, 0.07, 0, "sine");
			note(880, 0.06, 0.045, 0.025, "sine");
			break;
		case "start":
			[60, 67, 72, 76].forEach((n, i) => {
				note(hz(n), 0.22, 0.1, i * 0.075);
			});
			break;
		default:
			note(620, 0.05, 0.06, 0, "sine");
	}
}

function gibberish(ctx, out, mood, at, variant = 0) {
	const bright = mood !== "sad" && mood !== "wrong" && mood !== "lose";
	const syllables = bright ? [0, 4, 7, 3, 9] : [3, 0, -4, -7];
	const vowels = [
		[750, 1250],
		[400, 1800],
		[350, 900],
		[650, 1550],
		[450, 2100],
	];
	syllables.forEach((interval, i) => {
		const start = at + i * 0.078;
		const osc = ctx.createOscillator();
		const envelope = ctx.createGain();
		const bandA = ctx.createBiquadFilter();
		const bandB = ctx.createBiquadFilter();
		const vowel = vowels[(i + variant) % vowels.length];
		osc.type = "sawtooth";
		const pitch = hz((bright ? 69 : 64) + interval + (variant % 3) * 2);
		osc.frequency.setValueAtTime(pitch, start);
		osc.frequency.linearRampToValueAtTime(
			pitch * (bright ? 1.11 : 0.88),
			start + 0.065,
		);
		bandA.type = bandB.type = "bandpass";
		bandA.frequency.value = vowel[0];
		bandB.frequency.value = vowel[1];
		bandA.Q.value = 5;
		bandB.Q.value = 6;
		envelope.gain.setValueAtTime(0, start);
		envelope.gain.linearRampToValueAtTime(0.09, start + 0.009);
		envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
		osc.connect(bandA).connect(envelope);
		osc.connect(bandB).connect(envelope);
		envelope.connect(out);
		osc.start(start);
		osc.stop(start + 0.08);
	});
}

export function createAudio() {
	let ctx, musicGain, sfxGain, master, analyser, noiseBuffer;
	let musicVolume = 0.1,
		sfxVolume = 0.72,
		muted = false;
	let nextBeat = 0,
		step = 0,
		voiceVariant = 0,
		voiceUntil = 0;
	let currentMode = "title";
	let scheduledNotes = 0;
	const events = {};
	const samples = new Float32Array(512);

	function initialize() {
		if (ctx) return;
		const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!AC) return;
		ctx = new AC();
		musicGain = ctx.createGain();
		sfxGain = ctx.createGain();
		master = ctx.createGain();
		const compressor = ctx.createDynamicsCompressor();
		analyser = ctx.createAnalyser();
		analyser.fftSize = 1024;
		musicGain.gain.value = musicVolume;
		sfxGain.gain.value = sfxVolume;
		master.gain.value = muted ? 0 : 0.8;
		compressor.threshold.value = -12;
		compressor.knee.value = 16;
		compressor.ratio.value = 4;
		compressor.attack.value = 0.004;
		compressor.release.value = 0.12;
		musicGain.connect(master);
		sfxGain.connect(master);
		master.connect(compressor).connect(analyser).connect(ctx.destination);
		noiseBuffer = makeNoise(ctx);
		nextBeat = ctx.currentTime + 0.07;
	}

	async function unlock() {
		initialize();
		if (!ctx) return false;
		if (ctx.state === "suspended") await ctx.resume();
		nextBeat = Math.max(nextBeat, ctx.currentTime + 0.025);
		return ctx.state === "running";
	}

	function update(dt, state = {}) {
		currentMode = state.mode || currentMode;
		if (!ctx || ctx.state !== "running") return;
		const silent = ["paused", "pause", "dev", "settings", "about"].includes(
			currentMode,
		);
		if (silent) {
			nextBeat = ctx.currentTime + 0.06;
			return;
		}
		if (nextBeat < ctx.currentTime - 0.2) nextBeat = ctx.currentTime + 0.025;
		const shift = clamp(state.shift || 1, 1, 3);
		const eighth = 60 / (116 + (shift - 1) * 9) / 2;
		let guard = 0;
		while (nextBeat < ctx.currentTime + 0.13 && guard++ < 8) {
			musicStep(
				ctx,
				musicGain,
				noiseBuffer,
				step,
				nextBeat,
				shift,
				["title", "menu", "online"].includes(currentMode),
				state.combo || 0,
			);
			scheduledNotes++;
			nextBeat += eighth * (step % 2 === 0 ? 1.12 : 0.88);
			step++;
		}
	}

	function play(name) {
		if (!ctx || ctx.state !== "running") return;
		events[name] = (events[name] || 0) + 1;
		effect(ctx, sfxGain, noiseBuffer, name, ctx.currentTime + 0.006);
	}

	function voice(mood = "happy") {
		if (!ctx || ctx.state !== "running" || ctx.currentTime < voiceUntil) return;
		events.voice = (events.voice || 0) + 1;
		gibberish(ctx, sfxGain, mood, ctx.currentTime + 0.006, voiceVariant++);
		voiceUntil = ctx.currentTime + 0.48;
	}

	function setMusic(value) {
		musicVolume = clamp(value);
		if (musicGain)
			musicGain.gain.setTargetAtTime(musicVolume, ctx.currentTime, 0.03);
	}
	function setSfx(value) {
		sfxVolume = clamp(value);
		if (sfxGain) sfxGain.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.03);
	}
	function setMuted(value) {
		muted = !!value;
		if (master)
			master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.025);
	}

	function getStats() {
		let sum = 0,
			peak = 0;
		if (analyser) {
			analyser.getFloatTimeDomainData(samples);
			for (const sample of samples) {
				sum += sample * sample;
				peak = Math.max(peak, Math.abs(sample));
			}
		}
		return {
			contextState: ctx?.state || "locked",
			musicVolume,
			sfxVolume,
			muted,
			rms: Math.sqrt(sum / samples.length),
			peak,
			scheduledNotes,
			events: { ...events },
			synthesizer:
				"Web Audio oscillators, filtered seeded noise, formant voices",
		};
	}

	async function testOffline() {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline) return { rms: 0, peak: 0, finite: false, supported: false };
		const offline = new Offline(2, 48000 * 5, 48000);
		const music = offline.createGain();
		music.gain.value = 0.1;
		const sfx = offline.createGain();
		sfx.gain.value = 0.72;
		music.connect(offline.destination);
		sfx.connect(offline.destination);
		const buffer = makeNoise(offline);
		let at = 0.05;
		for (let n = 0; n < 18; n++) {
			musicStep(offline, music, buffer, n, at, 2, false, 6);
			at += (60 / 125 / 2) * (n % 2 === 0 ? 1.12 : 0.88);
		}
		[
			"catch",
			"reject",
			"add",
			"ready",
			"serve",
			"wrong",
			"dash",
			"lose",
			"win",
			"menu",
			"start",
		].forEach((name, i) => {
			effect(offline, sfx, buffer, name, 0.08 + i * 0.32);
		});
		gibberish(offline, sfx, "happy", 0.3, 0);
		gibberish(offline, sfx, "sad", 2.1, 1);
		const rendered = await offline.startRendering();
		let sum = 0,
			peak = 0,
			finite = true,
			count = 0;
		for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
			const channelData = rendered.getChannelData(channel);
			for (const sample of channelData) {
				finite &&= Number.isFinite(sample);
				sum += sample * sample;
				peak = Math.max(peak, Math.abs(sample));
				count++;
			}
		}
		return {
			rms: Math.sqrt(sum / count),
			peak,
			finite,
			supported: true,
			duration: rendered.duration,
			channels: rendered.numberOfChannels,
			effects: 11,
			voices: 2,
		};
	}

	return {
		unlock,
		update,
		play,
		voice,
		setMusic,
		setSfx,
		setMuted,
		getStats,
		testOffline,
	};
}
