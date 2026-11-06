import {
	BomberAudio,
	scheduleBomberSound,
	synthNoiseBuffer,
} from "../src/audio.js";

/** Browser suite. The quiet verify runner prints only failures and total count.
 * await runAudioTests() -> {count, failures, details}. Uses actual shared synth.
 */
export async function runAudioTests() {
	let count = 0;
	const failures = [],
		details = [];
	const check = (ok, name) => {
		count++;
		if (!ok) failures.push(name);
	};
	const Offline =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!Offline) {
		check(false, "OfflineAudioContext unavailable");
		return { count, failures, details };
	}
	for (const type of [
		"gun",
		"flak",
		"impact",
		"bomb",
		"hit",
		"landing",
		"radio",
		"warning",
		"extinguish",
		"jettison",
		"doors",
		"voice",
	]) {
		const ctx = new Offline(1, 48000 * 2, 48000);
		const handle = scheduleBomberSound(ctx, ctx.destination, type, {
			at: 0.01,
			role: "bombardier",
		});
		const rendered = await ctx.startRendering(),
			samples = rendered.getChannelData(0);
		let peak = 0,
			sum = 0,
			finite = true;
		for (const sample of samples) {
			finite &&= Number.isFinite(sample);
			peak = Math.max(peak, Math.abs(sample));
			sum += sample * sample;
		}
		const rms = Math.sqrt(sum / samples.length);
		check(
			finite && peak < 0.98 && rms > 0.00005,
			`sound ${type}: finite, audible, no clipping (peak=${peak}, rms=${rms})`,
		);
		check(
			samples
				.slice(Math.floor(48000 * (handle.end + 0.03)))
				.every((x) => x === 0),
			`sound ${type}: finite ending`,
		);
		details.push({ type, peak, rms });
	}
	const noiseContext = new Offline(1, 4800, 48000);
	const a = synthNoiseBuffer(noiseContext, 0.1, 31).getChannelData(0);
	const b = synthNoiseBuffer(noiseContext, 0.1, 31).getChannelData(0);
	check(
		a.every((value, i) => value === b[i]),
		"noise deterministic and independent of gameplay RNG",
	);
	// Lightweight native-compatible buses prove lifecycle routing and silence.
	const ctx = new Offline(1, 48000 * 2, 48000),
		master = ctx.createGain();
	master.gain.value = 0.7;
	master.connect(ctx.destination);
	const buses = Object.fromEntries(
		["sfx", "music", "voice"].map((name) => {
			const bus = ctx.createGain();
			bus.connect(master);
			return [name, bus];
		}),
	);
	const calls = [];
	const audio = {
		ctx,
		musicVolume: 0.5,
		sfxVolume: 1,
		voiceVolume: 1,
		song: null,
		bus(name) {
			return name === "master" ? master : buses[name];
		},
		applyVolume() {
			buses.sfx.gain.value = this.sfxVolume;
			buses.music.gain.value = this.musicVolume;
			buses.voice.gain.value = this.voiceVolume;
		},
		music(song) {
			this.song = { src: song, bus: buses.music };
			calls.push("music");
		},
		stopMusic() {
			this.song = null;
			calls.push("stop");
		},
		duck(on) {
			calls.push(on ? "duck" : "unduck");
		},
	};
	const game = { audio, headless: false },
		sound = new BomberAudio({}, game);
	check(audio.musicVolume === 0.1, "first-run music volume is ten percent");
	audio.musicVolume = 0.27;
	audio.applyVolume();
	sound.unlocked = true;
	// Offline contexts have a suspended state; treat it as running for this lifecycle fixture.
	sound._droneStart();
	check(
		sound.inspect().activeSources === 9,
		"four engines plus slipstream create exactly nine sources",
	);
	sound.running = true;
	sound.pause(true);
	check(
		sound.inspect().activeSources === 0 && !audio.song,
		"pause stops drones, effects, voices and native score",
	);
	sound.pause(false);
	sound._droneStart();
	sound.running = true;
	sound.stop();
	check(
		sound.inspect().activeSources === 0 && !audio.song,
		"terminal cleanup has zero active sources",
	);
	check(
		audio.musicVolume === 0.27,
		"pause/restart preserve player music volume",
	);
	sound.unlocked = true;
	sound._droneStart();
	sound.dispose();
	check(
		sound.inspect().disposed && sound.inspect().activeSources === 0,
		"dispose stops sources",
	);
	const silent = (await ctx.startRendering()).getChannelData(0);
	check(
		silent.every((v) => v === 0),
		"stopped-before-render lifecycle fixture produces silence",
	);
	const networkContext = new Offline(1, 48000, 48000);
	const runningContext = new Proxy(networkContext, {
		get(target, key) {
			if (key === "state") return "running";
			const value = target[key];
			return typeof value === "function" ? value.bind(target) : value;
		},
	});
	const networkBus = networkContext.createGain();
	networkBus.connect(networkContext.destination);
	const networkAudio = {
		ctx: runningContext,
		musicVolume: 0.1,
		sfxVolume: 1,
		voiceVolume: 1,
		song: null,
		bus() {
			return networkBus;
		},
		applyVolume() {},
		music(song) {
			this.song = { src: song };
		},
		stopMusic() {
			this.song = null;
		},
		duck() {},
	};
	const networkSound = new BomberAudio(
		{},
		{ audio: networkAudio, headless: false },
	);
	networkSound.unlocked = true;
	const networkState = {
		t: 1,
		phase: "outbound",
		aircraft: { fuel: 100, speed: 1200, throttle: 0.8, engines: [1, 1, 1, 1] },
		mounts: { nose: { shots: 1 } },
		events: [{ id: 1, type: "gun", station: "nose" }],
	};
	const bursts = () =>
		[...networkSound.handles].filter((handle) => handle.kind === "gun").length;
	networkSound.update(1 / 120, networkState);
	check(bursts() === 1, "native gun event plus counter produces one burst");
	networkSound.update(1 / 120, networkState);
	check(bursts() === 1, "unchanged repeated snapshot never repeats gun sound");
	networkState.events = [];
	networkState.mounts.nose.shots = 2;
	networkState.t += 0.125;
	networkSound.update(1 / 120, networkState);
	check(
		bursts() === 2,
		"guest snapshot gun counter produces audible shot without high-rate event",
	);
	networkSound.stop();
	check(
		networkSound.inspect().activeSources === 0,
		"guest presentation sounds stop at session end",
	);
	networkSound.dispose();
	const networkSilent = (await networkContext.startRendering()).getChannelData(
		0,
	);
	check(
		networkSilent.every((v) => v === 0),
		"network sound cleanup leaves silent output",
	);
	return { count, failures, details };
}
