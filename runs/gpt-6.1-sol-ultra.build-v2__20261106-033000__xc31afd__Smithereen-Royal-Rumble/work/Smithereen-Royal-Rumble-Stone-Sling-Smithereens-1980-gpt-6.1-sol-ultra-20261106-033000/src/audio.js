/* All sound is synthesized. No recorded samples or remote media are used. */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MELODY = [
	62, 69, 69, 67, 65, 64, 62, 0, 65, 69, 72, 69, 67, 65, 64, 0, 62, 69, 74, 72,
	69, 67, 65, 0, 64, 67, 69, 65, 64, 62, 62, 0,
];
const BASS = [
	38, 0, 45, 0, 38, 0, 45, 0, 41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0,
	50, 0, 45, 0, 40, 0, 45, 0, 38, 0,
];
const NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B",
];
const note = (n) => (n ? NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1) : ".");

function tone(ctx, bus, at, freq, dur, vol, wave = "triangle", to = 0) {
	const osc = ctx.createOscillator(),
		env = ctx.createGain();
	osc.type = wave;
	osc.frequency.setValueAtTime(Math.max(15, freq), at);
	if (to > 0)
		osc.frequency.exponentialRampToValueAtTime(Math.max(15, to), at + dur);
	env.gain.setValueAtTime(0, at);
	env.gain.linearRampToValueAtTime(vol, at + 0.006);
	env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
	osc.connect(env);
	env.connect(bus);
	osc.start(at);
	osc.stop(at + dur + 0.02);
	return osc;
}
function noise(ctx, bus, at, dur, vol, filterFreq = 1400, seed = 37) {
	const buffer = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * dur),
			ctx.sampleRate,
		),
		data = buffer.getChannelData(0);
	let v = seed | 0;
	for (let i = 0; i < data.length; i++) {
		v ^= v << 13;
		v ^= v >>> 17;
		v ^= v << 5;
		data[i] = ((v >>> 0) / 4294967296) * 2 - 1;
	}
	const src = ctx.createBufferSource(),
		filter = ctx.createBiquadFilter(),
		env = ctx.createGain();
	src.buffer = buffer;
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(filterFreq, at);
	filter.frequency.exponentialRampToValueAtTime(
		Math.max(80, filterFreq * 0.2),
		at + dur,
	);
	env.gain.setValueAtTime(0, at);
	env.gain.linearRampToValueAtTime(vol, at + 0.003);
	env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
	src.connect(filter);
	filter.connect(env);
	env.connect(bus);
	src.start(at);
	src.stop(at + dur + 0.02);
	return src;
}
function babble(ctx, bus, at, pattern = 0, vol = 0.09) {
	const vowels = [
			[650, 1300],
			[400, 1900],
			[850, 1250],
			[330, 900],
			[500, 1500],
		],
		sources = [];
	for (let i = 0; i < 4; i++) {
		const t = at + i * 0.09,
			dur = 0.07 + (i % 2) * 0.025,
			osc = ctx.createOscillator(),
			env = ctx.createGain(),
			out = ctx.createGain();
		osc.type = "sawtooth";
		const f = 130 + ((i * 37 + pattern * 29) % 120);
		osc.frequency.setValueAtTime(f, t);
		osc.frequency.exponentialRampToValueAtTime(
			f * (i % 2 ? 1.28 : 0.82),
			t + dur,
		);
		env.gain.setValueAtTime(0, t);
		env.gain.linearRampToValueAtTime(vol, t + 0.008);
		env.gain.linearRampToValueAtTime(0, t + dur);
		out.gain.value = 0.65;
		for (const [j, formant] of vowels[
			(i + pattern) % vowels.length
		].entries()) {
			const filter = ctx.createBiquadFilter(),
				gain = ctx.createGain();
			filter.type = "bandpass";
			filter.frequency.value = formant;
			filter.Q.value = 4;
			gain.gain.value = j ? 0.42 : 1;
			osc.connect(filter);
			filter.connect(gain);
			gain.connect(env);
		}
		env.connect(out);
		out.connect(bus);
		osc.start(t);
		osc.stop(t + dur + 0.02);
		sources.push(osc);
	}
	return sources;
}
function song(court = 0, menu = false) {
	const transpose = court === 3 ? -5 : court === 4 ? 2 : 0,
		bpm = menu ? 106 : court === 4 ? 126 : court === 3 ? 100 : 114;
	const melody = MELODY.map((n) => note(n ? n + transpose : 0)).join(" "),
		bass = BASS.map((n) => note(n ? n + transpose : 0)).join(" ");
	return {
		bpm,
		steps: 2,
		tracks: [
			{ name: "courtly melody", wave: "rumble-lute", vol: 0.2, notes: melody },
			{
				name: "wooden flute",
				wave: "triangle",
				vol: 0.07,
				notes: MELODY.map((n, i) =>
					i % 4 === 0 && n ? note(n + 12 + transpose) : ".",
				).join(" "),
			},
			{ name: "pizzicato bass", wave: "rumble-lute", vol: 0.16, notes: bass },
			{
				name: "tabor",
				wave: "drums",
				vol: 0.1,
				notes:
					"k . h . t . h . | k . h . t . h . | k . h . t . h . | k . h . t . h .",
			},
		],
	};
}
export function createAudio(E, game) {
	const A = game.audio;
	let unlocked = false,
		theme = "",
		lastEvent = 0,
		lastWorld = null,
		voiceNext = 0,
		chargeTicks = [-1, -1],
		reloadTicks = [-1, -1],
		lastMenuFocus = -1,
		lastScreen = "",
		lastCaption = "",
		stopped = false;
	const sources = new Set(),
		effects = [],
		counts = { events: 0, voices: 0, launches: 0, impacts: 0, musicStarts: 0 };
	let volumes = { music: 0.1, effects: 0.7, voice: 0.45, mute: false };
	A.musicVolume = 0.1;
	A.sfxVolume = 0.7;
	A.voiceVolume = 0.45;
	A.volume = 0.7;
	A.applyVolume();
	A.instrument("rumble-lute", (ctx, bus, time, freq, dur, vol) => {
		const osc = ctx.createOscillator(),
			sub = ctx.createOscillator(),
			filter = ctx.createBiquadFilter(),
			gain = ctx.createGain();
		osc.type = "triangle";
		sub.type = "sine";
		osc.frequency.value = freq;
		sub.frequency.value = freq * 2.002;
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(Math.min(9500, freq * 8), time);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(80, freq * 1.3),
			time + Math.max(0.04, dur),
		);
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.linearRampToValueAtTime(vol * 0.6, time + 0.004);
		gain.gain.exponentialRampToValueAtTime(
			0.0001,
			time + Math.max(0.045, dur * 0.85),
		);
		osc.connect(filter);
		sub.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		osc.start(time);
		sub.start(time);
		osc.stop(time + dur + 0.04);
		sub.stop(time + dur + 0.04);
		for (const node of [osc, sub]) {
			sources.add(node);
			node.onended = () => sources.delete(node);
		}
		return [osc, sub];
	});
	A.define("rumble-release", [
		{ wave: "noise", freq: 1500, to: 450, dur: 0.16, vol: 0.12 },
		{ wave: "triangle", freq: 160, to: 55, dur: 0.18, vol: 0.17 },
		{ wave: "sine", freq: 1600, to: 650, dur: 0.6, delay: 0.12, vol: 0.015 },
	]);
	A.define("rumble-stone", [
		{ wave: "noise", freq: 2200, to: 160, dur: 0.19, vol: 0.21 },
		{ wave: "triangle", freq: 118, to: 45, dur: 0.2, vol: 0.2 },
	]);
	A.define("rumble-heavy", [
		{ wave: "noise", freq: 1600, to: 90, dur: 0.38, vol: 0.28 },
		{ wave: "sine", freq: 90, to: 32, dur: 0.34, vol: 0.28 },
		{ wave: "triangle", freq: 180, to: 60, dur: 0.16, vol: 0.08 },
	]);
	A.define("rumble-wood", [
		{ wave: "noise", freq: 1800, to: 500, dur: 0.12, vol: 0.16 },
		{ wave: "triangle", freq: 220, to: 110, dur: 0.12, vol: 0.12 },
	]);
	A.define("rumble-armor", [
		{ wave: "sine", freq: 920, to: 660, dur: 0.2, vol: 0.12 },
		{ wave: "triangle", freq: 1350, to: 890, dur: 0.13, vol: 0.06 },
	]);
	A.define("rumble-crew", {
		wave: "sine",
		freq: 430,
		to: 135,
		dur: 0.22,
		vol: 0.14,
		vib: [18, 0.08],
	});
	A.define("rumble-splash", [
		{ wave: "noise", freq: 3200, to: 350, dur: 0.32, vol: 0.19 },
		{ wave: "sine", freq: 370, to: 80, dur: 0.17, vol: 0.09 },
	]);
	A.define("rumble-winchtick", [
		{ wave: "noise", freq: 2000, dur: 0.018, vol: 0.055 },
		{ wave: "triangle", freq: 150, to: 90, dur: 0.04, vol: 0.055 },
	]);
	A.define("rumble-repair", [
		{ wave: "triangle", freq: 520, to: 340, dur: 0.05, vol: 0.055 },
		{ wave: "noise", freq: 2600, dur: 0.025, vol: 0.035 },
	]);
	A.define("rumble-recover", {
		wave: "triangle",
		freq: 440,
		arp: [0, 4, 7, 12],
		step: 0.055,
		dur: 0.24,
		vol: 0.11,
	});
	A.define("rumble-split", {
		wave: "triangle",
		freq: 880,
		arp: [0, 7, 12],
		step: 0.035,
		dur: 0.14,
		vol: 0.1,
	});
	A.define("rumble-cancel", {
		wave: "triangle",
		freq: 220,
		to: 100,
		dur: 0.09,
		vol: 0.08,
	});
	function unlock() {
		if (game.headless) return;
		unlocked = true;
		stopped = false;
		try {
			A.bus("sfx");
			if (A.ctx?.state === "suspended") A.ctx.resume().catch(() => {});
		} catch {}
		setVolumes(volumes);
	}
	function setVolumes(s) {
		volumes = {
			music: clamp(Number.isFinite(+s.music) ? +s.music : 0.1, 0, 1),
			effects: clamp(Number.isFinite(+s.effects) ? +s.effects : 0.7, 0, 1),
			voice: clamp(Number.isFinite(+s.voice) ? +s.voice : 0.45, 0, 1),
			mute: !!s.mute,
		};
		A.musicVolume = volumes.music;
		A.sfxVolume = volumes.effects;
		A.voiceVolume = volumes.voice;
		A.muted = volumes.mute;
		A.applyVolume();
	}
	function sfx(id, pan = 0, vol = 1) {
		if (!unlocked || stopped || A.muted) return;
		const handle = A.sfx(id, { pan, vol, vary: 0.025 });
		effects.push(handle);
		if (effects.length > 64) effects.shift();
		return handle;
	}
	function voice(pattern = 0, pan = 0) {
		if (
			!unlocked ||
			stopped ||
			!A.ready ||
			A.ctx.currentTime < voiceNext ||
			A.muted
		)
			return;
		const c = A.ctx,
			bus = A.bus("voice");
		if (!bus) return;
		voiceNext = c.currentTime + 2.6;
		const out = c.createStereoPanner?.();
		if (out) {
			out.pan.value = pan;
			out.connect(bus);
		}
		const nodes = babble(c, out || bus, c.currentTime + 0.015, pattern, 0.09);
		for (const node of nodes) {
			sources.add(node);
			node.onended = () => sources.delete(node);
		}
		counts.voices++;
	}
	function fanfare(win = true) {
		if (!unlocked || stopped || !A.ready) return;
		const c = A.ctx,
			bus = A.bus("sfx"),
			t = c.currentTime + 0.02,
			notes = win ? [62, 66, 69, 74, 69, 74] : [65, 64, 62, 57];
		notes.forEach((n, i) => {
			const osc = tone(
				c,
				bus,
				t + i * 0.14,
				midi(n),
				i === notes.length - 1 ? 0.5 : 0.18,
				0.085,
				"triangle",
			);
			sources.add(osc);
			osc.onended = () => sources.delete(osc);
		});
		voice(win ? 1 : 3);
	}
	function event(e, app) {
		if (stopped || app.online?.ended) return;
		counts.events++;
		const seat = e.seat ?? 0,
			pan = seat ? 0.55 : -0.55;
		switch (e.type) {
			case "launch":
				counts.launches++;
				sfx("rumble-release", pan, e.stone === 1 ? 1.1 : 1);
				break;
			case "impact":
			case "hit": {
				counts.impacts++;
				const material =
					e.material ||
					app.world?.blocks.find((b) => b.id === e.blockId)?.material;
				sfx(
					e.target === "water"
						? "rumble-splash"
						: e.target === "launcher"
							? "rumble-armor"
							: e.target === "crew"
								? "rumble-crew"
								: material === "wood"
									? "rumble-wood"
									: e.stone === 1 || e.projectileType === 1
										? "rumble-heavy"
										: "rumble-stone",
					clamp(((e.x ?? 320) - 320) / 400, -0.7, 0.7),
				);
				break;
			}
			case "collapse":
				sfx("rumble-heavy", pan, 0.75);
				voice(4, pan);
				break;
			case "crew":
			case "launcher":
			case "interrupt":
				voice(e.type === "crew" ? 2 : 3, pan);
				break;
			case "recover":
				sfx("rumble-recover", pan);
				break;
			case "split":
				sfx("rumble-split", pan, 0.7);
				break;
			case "cancel":
				sfx("rumble-cancel", pan);
				break;
			case "outcome":
				fanfare(app.world?.outcome?.winner !== 1);
				break;
		}
	}
	function stop() {
		stopped = true;
		theme = "";
		A.music(null);
		for (const handle of effects) handle.stop?.(0);
		effects.length = 0;
		for (const src of sources)
			try {
				src.stop();
			} catch {}
		sources.clear();
		A.muted = true;
		A.applyVolume();
	}
	function update(dt, app) {
		if (app.online?.ended) {
			if (!stopped) stop();
			return;
		}
		if (stopped) {
			if (!unlocked) return;
			stopped = false;
			setVolumes(app.settings);
		}
		if (app.settings) setVolumes(app.settings);
		const w = app.world;
		if (
			lastWorld !== w &&
			(!lastWorld ||
				w?.seed !== lastWorld.seed ||
				w?.court !== lastWorld.court ||
				w?.tick < lastWorld.tick)
		) {
			lastEvent = 0;
			chargeTicks = [-1, -1];
			reloadTicks = [-1, -1];
		}
		lastWorld = w;
		for (const e of w?.events || [])
			if (e.id > lastEvent) {
				event(e, app);
				lastEvent = Math.max(lastEvent, e.id);
			}
		if (!unlocked) return;
		if (app.caption && app.caption !== lastCaption && app.screen === "play") {
			lastCaption = app.caption;
			voice((w?.court || 0) + 1, 0);
		}
		const menu = !["play", "pause", "developer", "author", "result"].includes(
				app.screen,
			),
			key = `${w?.court || 0}:${menu}`;
		if (theme !== key) {
			theme = key;
			A.music(song(w?.court || 0, menu), { sync: false });
			counts.musicStarts++;
		}
		for (let i = 0; i < (w?.players?.length || 0); i++) {
			const p = w.players[i],
				q = p.charge?.power;
			if (q !== undefined) {
				const tick = Math.floor(q * 18);
				if (tick !== chargeTicks[i]) {
					chargeTicks[i] = tick;
					sfx("rumble-winchtick", i ? 0.5 : -0.5, 0.8 + q * 0.4);
					if (tick === 18) sfx("rumble-recover", i ? 0.5 : -0.5, 0.55);
				}
			} else chargeTicks[i] = -1;
			if (p.launcherUntil > w.time) {
				const tick = Math.floor(w.time * 5);
				if (tick !== reloadTicks[i]) {
					reloadTicks[i] = tick;
					sfx("rumble-repair", i ? 0.5 : -0.5);
				}
			} else reloadTicks[i] = -1;
		}
		if (lastScreen !== app.screen) {
			if (lastScreen) sfx("confirm", 0, 0.35);
			lastScreen = app.screen;
			lastMenuFocus = app.focus ?? 0;
		} else if (lastMenuFocus !== (app.focus ?? 0)) {
			lastMenuFocus = app.focus ?? 0;
			sfx("select", 0, 0.35);
		}
		A.duck(
			[
				"pause",
				"settings",
				"about",
				"controls",
				"developer",
				"author",
			].includes(app.screen),
		);
	}
	async function renderProbe(options = {}) {
		const OC =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!OC)
			return { supported: false, reason: "OfflineAudioContext unavailable" };
		const ctx = new OC(2, 48000 * 2, 48000),
			master = ctx.createGain();
		master.gain.value = 0.7;
		master.connect(ctx.destination);
		const buses = {};
		for (const key of ["music", "effects", "voice"]) {
			buses[key] = ctx.createGain();
			buses[key].gain.value = options[key] ?? volumes[key];
			buses[key].connect(master);
		}
		// Schedule the production native instrument and production effect patches on an offline synth copy.
		const offline = Object.create(A);
		offline.ctx = ctx;
		offline._rnd = E.rng(37);
		offline._waves = {};
		offline._noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const noiseData = offline._noise.getChannelData(0);
		for (let i = 0; i < noiseData.length; i++)
			noiseData[i] = offline._rnd() * 2 - 1;
		MELODY.slice(0, 8).forEach((n, i) => {
			if (n)
				A._ins["rumble-lute"](
					ctx,
					buses.music,
					0.02 + i * 0.18,
					midi(n),
					0.16,
					0.2,
				);
		});
		for (const [id, t] of [
			["rumble-release", 0.1],
			["rumble-heavy", 0.55],
		])
			for (const patch of A.presets[id])
				offline._voice(patch, buses.effects, t, 1, false);
		babble(ctx, buses.voice, 1.12, 2, 0.09);
		const buffer = await ctx.startRendering();
		let peak = 0,
			sum = 0,
			finite = true,
			count = 0;
		for (let ch = 0; ch < buffer.numberOfChannels; ch++)
			for (const v of buffer.getChannelData(ch)) {
				if (!Number.isFinite(v)) finite = false;
				peak = Math.max(peak, Math.abs(v));
				sum += v * v;
				count++;
			}
		return {
			supported: true,
			finite,
			peak,
			rms: Math.sqrt(sum / count),
			nonzero: peak > 0.00001,
			clipped: peak >= 1,
			frames: buffer.length,
			gains: Object.fromEntries(
				Object.entries(buses).map(([k, b]) => [k, b.gain.value]),
			),
		};
	}
	return {
		unlock,
		update,
		event,
		stop,
		setVolumes,
		renderProbe,
		diagnostics: () => ({
			unlocked,
			stopped,
			context: A.ctx?.state || "unavailable",
			musicGain: A.musicVolume,
			effectsGain: A.sfxVolume,
			voiceGain: A.voiceVolume,
			masterGain: A.volume,
			muted: A.muted,
			activeVoices: sources.size,
			counts: { ...counts },
			files: 0,
		}),
	};
}
