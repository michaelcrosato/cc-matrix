// All waveforms, envelopes, songs and syllables are original code. No audio assets.
// The engine owns scheduling, the synth, persistent levels and the three buses.
export const AUDIO_CUES = {
	shot: [
		{ wave: "pulse12", freq: 1180, to: 240, dur: 0.115, vol: 0.105 },
		{ wave: "sine", freq: 180, to: 75, dur: 0.075, vol: 0.09 },
	],
	shield: [
		{ wave: "noise", freq: 3200, to: 260, dur: 0.26, vol: 0.09 },
		{ wave: "triangle", freq: 660, to: 110, dur: 0.28, vol: 0.11 },
	],
	recharge: [{ wave: "sine", freq: 440, to: 660, dur: 0.07, vol: 0.028 }],
	ready: [
		{ wave: "sine", freq: 660, dur: 0.13, vol: 0.12 },
		{ wave: "triangle", freq: 990, delay: 0.1, dur: 0.21, vol: 0.09 },
		{ wave: "sine", freq: 1320, delay: 0.2, dur: 0.27, vol: 0.065 },
	],
	hurt: [
		{ wave: "noise", freq: 640, to: 90, dur: 0.33, vol: 0.16 },
		{ wave: "saw", freq: 155, to: 54, dur: 0.29, vol: 0.09, vib: [35, 0.09] },
	],
	kill: [
		{ wave: "noise", freq: 1900, to: 110, dur: 0.2, vol: 0.095 },
		{ wave: "sine", freq: 130, to: 38, dur: 0.24, vol: 0.12 },
	],
	fusion: [
		{
			wave: "pulse",
			freq: 150,
			to: 850,
			dur: 0.61,
			vol: 0.065,
			vib: [16, 0.03],
		},
		{ wave: "sine", freq: 202, to: 1010, dur: 0.64, vol: 0.045 },
	],
	hunter: [
		{ wave: "saw", freq: 380, to: 160, dur: 0.2, vol: 0.07 },
		{ wave: "pulse12", freq: 760, delay: 0.04, dur: 0.16, vol: 0.05 },
	],
	warning: [
		{ wave: "square", freq: 220, dur: 0.11, vol: 0.075, hold: true },
		{
			wave: "square",
			freq: 277,
			delay: 0.19,
			dur: 0.11,
			vol: 0.075,
			hold: true,
		},
		{
			wave: "square",
			freq: 220,
			delay: 0.38,
			dur: 0.11,
			vol: 0.075,
			hold: true,
		},
	],
	missile: [
		{ wave: "noise", freq: 2200, to: 700, dur: 0.22, vol: 0.06 },
		{ wave: "saw", freq: 200, to: 880, dur: 0.15, vol: 0.045 },
	],
	chain: [
		{
			wave: "triangle",
			freq: 330,
			dur: 0.18,
			vol: 0.1,
			arp: [0, 7, 12, 19],
			step: 0.042,
		},
		{ wave: "noise", freq: 3200, to: 360, dur: 0.14, vol: 0.045 },
	],
	rescue: [
		{
			wave: "sine",
			freq: 392,
			dur: 0.33,
			vol: 0.12,
			arp: [0, 4, 7, 12],
			step: 0.075,
		},
		{ wave: "triangle", freq: 784, delay: 0.29, dur: 0.42, vol: 0.08 },
	],
	bossPhase: [
		{ wave: "pulse", freq: 82.4, to: 164.8, dur: 0.7, vol: 0.09 },
		{ wave: "noise", freq: 300, to: 2400, dur: 0.52, vol: 0.055 },
		{ wave: "sine", freq: 329.6, delay: 0.4, to: 164.8, dur: 0.4, vol: 0.08 },
	],
	victory: [
		{
			wave: "triangle",
			freq: 392,
			dur: 0.72,
			vol: 0.12,
			arp: [0, 4, 7, 12, 16, 19],
			step: 0.11,
		},
		{ wave: "sine", freq: 784, delay: 0.56, dur: 0.7, vol: 0.08 },
	],
	defeat: [
		{ wave: "saw", freq: 196, to: 49, dur: 0.82, vol: 0.09 },
		{ wave: "noise", freq: 600, to: 60, dur: 0.78, vol: 0.075 },
		{ wave: "sine", freq: 73.4, delay: 0.37, to: 36.7, dur: 0.65, vol: 0.12 },
	],
	sector: [
		{
			wave: "triangle",
			freq: 294,
			to: 588,
			dur: 0.37,
			vol: 0.08,
			arp: [0, 7, 12],
			step: 0.1,
		},
	],
	focus: [{ wave: "sine", freq: 560, to: 700, dur: 0.035, vol: 0.055 }],
	confirm: [
		{ wave: "sine", freq: 700, dur: 0.075, vol: 0.075 },
		{ wave: "triangle", freq: 1050, delay: 0.055, dur: 0.12, vol: 0.055 },
	],
};

// A patient, slightly pompous orbital waltz; the boss rearranges the same motif.
// These are engine-native note strings, one token per sixteenth note.
export const AUDIO_SONGS = {
	title: {
		bpm: 102,
		steps: 4,
		tracks: [
			{
				name: "beacon",
				wave: "sine",
				vol: 0.1,
				gate: 0.7,
				notes:
					"D5 - . . A5 . F5 . | E5 - . . A4 . C5 . | D5 - . . F5 . A5 . | G5 - E5 - C5 - . . | D5 - . . A5 . F5 . | E5 - . . G5 . E5 . | F5 . E5 . D5 - A4 - | C5 - . . A4 - . .",
			},
			{
				name: "orbit",
				wave: "triangle",
				vol: 0.085,
				gate: 0.9,
				notes:
					"D3 - . A3 . . D4 . | C3 - . G3 . . C4 . | Bb2 - . F3 . . Bb3 . | A2 - . E3 . . A3 . | D3 - . A3 . . D4 . | C3 - . G3 . . C4 . | Bb2 - . F3 . . Bb3 . | A2 - . E3 . . A3 .",
			},
			{
				name: "dust",
				wave: "drums",
				vol: 0.025,
				notes:
					"k . . . . . h . | . . . . c . . . | k . . . . . h . | . . . . c . . .",
			},
		],
	},
	mission: {
		bpm: 112,
		steps: 4,
		tracks: [
			{
				name: "beacon",
				wave: "triangle",
				vol: 0.09,
				gate: 0.58,
				notes:
					"D5 . . A4 . . F5 . | E5 . . C5 . . A4 . | D5 . . F5 . . A5 . | G5 . E5 . C5 . A4 . | D5 . A5 . F5 . D5 . | E5 . G5 . E5 . C5 . | F5 . E5 . D5 . C5 . | A4 - . . . . . .",
			},
			{
				name: "orbit",
				wave: "sine",
				vol: 0.115,
				gate: 0.82,
				notes:
					"D3 . D4 . . A3 . . | C3 . C4 . . G3 . . | Bb2 . Bb3 . . F3 . . | A2 . A3 . . E3 . . | D3 . D4 . . A3 . . | C3 . C4 . . G3 . . | Bb2 . Bb3 . . F3 . . | A2 . A3 . E3 . C3 .",
			},
			{
				name: "dust",
				wave: "drums",
				vol: 0.04,
				notes:
					"k . h . . . h . | c . h . . h h . | k . h . . . h . | c . h . . h . h",
			},
		],
	},
	boss: {
		bpm: 130,
		steps: 4,
		tracks: [
			{
				name: "command",
				wave: "pulse12",
				vol: 0.055,
				gate: 0.52,
				notes:
					"D4 . A4 . D5 . F5 . | E5 . C5 . A4 . E4 . | Bb3 . F4 . Bb4 . D5 . | C5 . A4 . E4 . A3 . | D4 . A4 . D5 . A4 . | C4 . G4 . C5 . G4 . | Bb3 . F4 . Bb4 . F4 . | A3 . E4 . A4 . C#5 .",
			},
			{
				name: "orbit",
				wave: "triangle",
				vol: 0.12,
				gate: 0.83,
				notes:
					"D2 . D3 D2 . . A2 . | C2 . C3 C2 . . G2 . | Bb1 . Bb2 Bb1 . . F2 . | A1 . A2 A1 . E2 A2 . | D2 . D3 D2 . . A2 . | C2 . C3 C2 . . G2 . | Bb1 . Bb2 Bb1 . . F2 . | A1 . A2 . E2 . A2 .",
			},
			{
				name: "alarm",
				wave: "sine",
				vol: 0.035,
				gate: 0.94,
				notes:
					"D5 - - - . . . . | E5 - - - . . . . | F5 - - - . . . . | E5 - - - . . . .",
			},
			{
				name: "dust",
				wave: "drums",
				vol: 0.048,
				notes:
					"k . h . c . h h | k . h . c . h . | k . h . c . h h | k . h k c . h h",
			},
		],
	},
	victory: {
		bpm: 108,
		steps: 4,
		tracks: [
			{
				wave: "sine",
				vol: 0.11,
				gate: 0.92,
				notes:
					"D5 - F5 - A5 - D6 - | C6 - A5 - F5 - E5 - | F5 - A5 - C6 - A5 - | G5 - E5 - C5 - A4 - | D5 - - - F5 - - - | A5 - - - D6 - - - | C6 - A5 - F5 - E5 - | D5 - - - . . . .",
			},
			{
				wave: "triangle",
				vol: 0.08,
				notes:
					"D3 - A3 - D4 - A3 - | C3 - G3 - C4 - G3 - | Bb2 - F3 - Bb3 - F3 - | A2 - E3 - A3 - E3 -",
			},
			{
				wave: "drums",
				vol: 0.026,
				notes:
					"k . . . h . . . | c . . . h . . . | k . . . h . . . | c . . . . . . .",
			},
		],
	},
	defeat: {
		bpm: 78,
		steps: 4,
		tracks: [
			{
				wave: "triangle",
				vol: 0.08,
				gate: 0.8,
				notes:
					"D5 - . . C5 - . . | A4 - . . F4 - . . | E4 - - - C4 - - - | D4 - - - . . . .",
			},
			{
				wave: "sine",
				vol: 0.09,
				notes:
					"D2 - - - . . . . | C2 - - - . . . . | Bb1 - - - . . . . | A1 - - - . . . .",
			},
		],
	},
};

const VOICE_EVENTS = new Set([
	"sector",
	"rescue",
	"bossPhase",
	"victory",
	"defeat",
]);
const MIN_GAP = {
	shot: 0.035,
	kill: 0.055,
	chain: 0.1,
	warning: 0.35,
	missile: 0.06,
	recharge: 0.24,
};

function seedNumber(seed) {
	let n = 2166136261;
	for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
	return n >>> 0;
}

// Four formant-like oscillator bands make brief nonlinguistic radio syllables.
// Returns the actual source nodes so pause/end can stop every scheduled syllable.
export function scheduleGibberish(ctx, bus, at, seed = 1) {
	const nodes = [];
	const hash = seedNumber(seed);
	const vowels = [
		[650, 1200],
		[350, 1900],
		[500, 900],
		[300, 2300],
		[700, 1400],
	];
	const count = 5 + (hash % 3);
	for (let i = 0; i < count; i++) {
		const pair = vowels[((hash >>> ((i * 3) % 23)) + i) % vowels.length];
		const start = at + i * 0.087 + (i > 2 ? 0.035 : 0);
		const pitch = 190 + ((hash >>> ((i * 4) % 25)) % 110) + (i % 2 ? 30 : 0);
		const duration = i === count - 1 ? 0.11 : 0.065;
		const bands = [
			[pitch, 0.065, "triangle"],
			[pair[0], 0.032, "sine"],
			[pair[1], 0.012, "sine"],
		];
		for (const [frequency, level, type] of bands) {
			const osc = ctx.createOscillator();
			const env = ctx.createGain();
			osc.type = type;
			osc.frequency.setValueAtTime(frequency, start);
			osc.frequency.exponentialRampToValueAtTime(
				frequency * (i % 2 ? 1.1 : 0.88),
				start + duration,
			);
			env.gain.setValueAtTime(0, start);
			env.gain.linearRampToValueAtTime(level, start + 0.009);
			env.gain.exponentialRampToValueAtTime(0.00001, start + duration);
			osc.connect(env);
			env.connect(bus);
			osc.start(start);
			osc.stop(start + duration + 0.015);
			nodes.push(osc);
		}
	}
	return nodes;
}

export function createAudio(game) {
	const native = game.audio;
	let unlocked = false;
	let paused = false;
	let stopped = false;
	let terminal = false;
	let scene = "title";
	let playingScene = null;
	let clock = 0;
	let pendingSceneEvent = null;
	let voiceAt = -10;
	let lastError = null;
	let cuesPlayed = 0;
	let voicesPlayed = 0;
	const handles = [];
	const sources = [];
	const seen = new Set();
	const last = new Map();

	for (const [name, voices] of Object.entries(AUDIO_CUES))
		native.define(`cg-${name}`, voices);

	function silenceEffects() {
		for (const record of handles.splice(0)) record.handle.stop(0.015);
		for (const record of sources.splice(0)) {
			try {
				record.node.stop();
			} catch {
				/* A completed one-shot is already stopped. */
			}
		}
	}

	function music() {
		if (
			!unlocked ||
			paused ||
			stopped ||
			game.headless ||
			playingScene === scene
		)
			return;
		native.music(AUDIO_SONGS[scene] || AUDIO_SONGS.mission, {
			sync: true,
			fade: 0.16,
		});
		playingScene = scene;
	}

	function unlock() {
		if (game.headless || terminal) return false;
		if (stopped) native.mute(game.settings.sound === false);
		stopped = false;
		try {
			// This is deliberately the first native bus access. Call only from input.
			const bus = native.bus("sfx");
			unlocked = !!bus;
			if (native.ctx?.state === "suspended")
				native.ctx.resume().catch(() => {});
			music();
		} catch (error) {
			lastError = error.message || String(error);
		}
		return unlocked;
	}

	function setScene(name) {
		if (!AUDIO_SONGS[name] || terminal) return false;
		// World IDs restart from one on replay and attract. A mission scene
		// selected by UI means a new run; sector/phase selections come directly
		// after their event and retain the current run's deduplication epoch.
		const lifecycleSelection = pendingSceneEvent === name;
		pendingSceneEvent = null;
		if (name === "title" || (name === "mission" && !lifecycleSelection)) {
			seen.clear();
			last.clear();
			voiceAt = -10;
			silenceEffects();
		}
		scene = name;
		// A new explicitly selected scene re-arms after stop, while unsolicited
		// simulation events after Hub end remain unable to restart any sound.
		if (stopped) native.mute(game.settings.sound === false);
		stopped = false;
		music();
		return true;
	}

	function event(record) {
		if (!record || !AUDIO_CUES[record.type]) return false;
		pendingSceneEvent =
			record.type === "sector"
				? record.sector === 3
					? "boss"
					: "mission"
				: record.type === "bossPhase"
					? "boss"
					: null;
		// A received snapshot can repeat a batch of older events after newer
		// ones were presented by the transport callback. Timestamp rollback is
		// therefore not a run boundary. Only an explicit scene selection is.
		if (record.id !== undefined) {
			const key = `${record.id}:${record.type}`;
			if (seen.has(key)) return false;
			seen.add(key);
			if (seen.size > 512) seen.delete(seen.values().next().value);
		}
		if (
			!unlocked ||
			paused ||
			stopped ||
			game.headless ||
			!native.ready ||
			native.muted
		)
			return false;
		const type = record.type;
		if (clock - (last.get(type) ?? -10) < (MIN_GAP[type] || 0)) return false;
		last.set(type, clock);
		try {
			const pan = Number.isFinite(record.x)
				? Math.max(-0.7, Math.min(0.7, (record.x / 960 - 0.5) * 1.4))
				: 0;
			const pitch =
				type === "chain"
					? 2 ** (Math.min(7, Math.max(0, (record.depth || 1) - 1)) / 12)
					: type === "kill" && record.kind === "gunship"
						? 0.6
						: 1;
			const handle = native.sfx(`cg-${type}`, { pan, pitch, vary: 0 });
			handles.push({ handle, until: clock + 1.6 });
			cuesPlayed++;
			if (VOICE_EVENTS.has(type) && clock - voiceAt > 1.2) {
				const ctx = native.ctx;
				const nodes = scheduleGibberish(
					ctx,
					native.bus("voice"),
					ctx.currentTime + 0.12,
					`${type}:${record.id || 0}:${record.sector || 0}`,
				);
				for (const node of nodes) sources.push({ node, until: clock + 1.3 });
				voiceAt = clock;
				voicesPlayed++;
			}
			return true;
		} catch (error) {
			lastError = error.message || String(error);
			return false;
		}
	}

	function update(dt) {
		clock += Math.max(0, Number.isFinite(dt) ? dt : 0);
		for (let i = handles.length - 1; i >= 0; i--)
			if (handles[i].until <= clock) handles.splice(i, 1);
		for (let i = sources.length - 1; i >= 0; i--)
			if (sources[i].until <= clock) sources.splice(i, 1);
		// Browser policy may accept the context asynchronously after the gesture.
		if (unlocked && !paused && !stopped && native.ready) music();
	}

	function setPaused(value) {
		const next = !!value;
		if (paused === next) return;
		paused = next;
		if (paused) {
			silenceEffects();
			native.music(null);
			playingScene = null;
		} else music();
	}

	function stop(options = {}) {
		// A live shared world only calls stop at round end. Latch it so a late
		// pad edge, scene event, or browser resume cannot restart session sound.
		terminal =
			terminal ||
			!!options.terminal ||
			!!(game.live && globalThis.AIHub?.active);
		stopped = true;
		silenceEffects();
		native.music(null);
		// The music scheduler may already have 150 ms of notes queued, including
		// a previous crossfade. Native master mute silences them immediately and
		// does not write a setting. Explicit re-arm restores the saved choice.
		native.mute(true);
		playingScene = null;
		// Native music fades only, with no new notes after stopMusic. Its scheduler
		// exits itself once the now-empty song list is observed.
	}

	function debug() {
		return {
			unlocked,
			paused,
			stopped,
			terminal,
			scene,
			playingScene,
			context: native.ctx?.state || "locked",
			musicGain: native._musBus?.gain.value ?? native.musicVolume,
			sfxGain: native._sfxBus?.gain.value ?? native.sfxVolume,
			voiceGain: native._voiceBus?.gain.value ?? native.voiceVolume,
			masterGain:
				native._master?.gain.value ?? (native.muted ? 0 : native.volume),
			activeEffects: handles.length,
			activeVoiceNodes: sources.length,
			cuesPlayed,
			voicesPlayed,
			error: lastError,
		};
	}

	return { unlock, setScene, event, update, stop, setPaused, debug };
}

function signalStats(buffer, from = 0) {
	const data = buffer.getChannelData(0);
	let peak = 0,
		energy = 0,
		finite = true;
	const begin = Math.floor(from * buffer.sampleRate);
	for (let i = begin; i < data.length; i++) {
		finite = finite && Number.isFinite(data[i]);
		peak = Math.max(peak, Math.abs(data[i]));
		energy += data[i] * data[i];
	}
	return {
		peak,
		rms: Math.sqrt(energy / Math.max(1, data.length - begin)),
		finite,
	};
}

// Runs inside an installed browser. It injects an OfflineAudioContext into a
// native headless game's synth and calls that very synth's _voice/_note methods;
// application code never depends on those internal scheduling methods.
export async function verifyAudio() {
	const AC =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!AC || !globalThis.My3D2dge)
		return [
			{
				name: "offline audio available",
				pass: false,
				detail: "OfflineAudioContext or engine unavailable",
			},
		];
	const results = [];
	const check = (name, pass, detail = "") =>
		results.push({ name, pass: !!pass, detail });
	const E = globalThis.My3D2dge;
	const sampleRate = 22050;

	function fixture(seconds = 1.8, musicLevel = 0.1) {
		const game = new E.Game({
			id: "cg-audio-offline-fixture",
			headless: true,
			menu: { settings: [{ key: "music", value: 0.1 }] },
		});
		const a = game.audio;
		const ctx = new AC(1, Math.ceil(seconds * sampleRate), sampleRate);
		a.ctx = ctx;
		a._master = ctx.createGain();
		a._master.connect(ctx.destination);
		a._sfxBus = ctx.createGain();
		a._sfxBus.connect(a._master);
		a._musBus = ctx.createGain();
		a._musBus.connect(a._master);
		a._voiceBus = ctx.createGain();
		a._voiceBus.connect(a._master);
		a.musicVolume = musicLevel;
		a.applyVolume();
		a._noise = ctx.createBuffer(1, sampleRate, sampleRate);
		const noise = a._noise.getChannelData(0);
		let n = 0x12345678;
		for (let i = 0; i < noise.length; i++) {
			n = (Math.imul(n, 1664525) + 1013904223) | 0;
			noise[i] = ((n >>> 0) / 4294967296) * 2 - 1;
		}
		return { game, a, ctx };
	}

	const fingerprints = {};
	for (const [name, voices] of Object.entries(AUDIO_CUES)) {
		const { a, ctx } = fixture();
		for (const voice of voices) a._voice(voice, a._sfxBus, 0.02, 1, false);
		const buffer = await ctx.startRendering();
		const stats = signalStats(buffer);
		fingerprints[name] = stats;
		check(
			`audio cue ${name}: finite, audible, bounded`,
			stats.finite &&
				stats.rms > 0.0001 &&
				stats.peak > 0.003 &&
				stats.peak < 0.8,
			JSON.stringify(stats),
		);
	}
	check(
		"ready and threat warning are distinct",
		Math.abs(fingerprints.ready.rms - fingerprints.warning.rms) > 0.0001 &&
			Math.abs(fingerprints.ready.peak - fingerprints.warning.peak) > 0.001,
		"Independent pitches, envelopes and repeated warning rhythm",
	);

	{
		const { a, ctx } = fixture();
		scheduleGibberish(ctx, a._voiceBus, 0.02, "radio-test");
		const stats = signalStats(await ctx.startRendering());
		check(
			"gibberish voice: finite, audible, bounded",
			stats.finite && stats.rms > 0.0001 && stats.peak < 0.8,
			JSON.stringify(stats),
		);
	}
	{
		const { a, ctx } = fixture();
		a.mute(true);
		for (const voice of AUDIO_CUES.hurt) a._voice(voice, a._sfxBus, 0.02);
		scheduleGibberish(ctx, a._voiceBus, 0.02, "muted");
		const stats = signalStats(await ctx.startRendering());
		check(
			"master mute silences generated effects and voice",
			stats.peak === 0,
			JSON.stringify(stats),
		);
	}
	{
		const { a, ctx } = fixture();
		const nodes = AUDIO_CUES.fusion.flatMap((voice) =>
			a._voice(voice, a._sfxBus, 0.02),
		);
		nodes.push(...scheduleGibberish(ctx, a._voiceBus, 0.02, "stop-test"));
		for (const node of nodes) {
			try {
				node.stop(0.18);
			} catch {
				/* A source may finish before the stop. */
			}
		}
		const stats = signalStats(await ctx.startRendering(), 0.2);
		check(
			"stopping sources leaves silent tail",
			stats.peak === 0,
			JSON.stringify(stats),
		);
	}
	for (const [name, song] of Object.entries(AUDIO_SONGS)) {
		const { a, ctx } = fixture(2.8);
		const spb = 60 / song.bpm / song.steps;
		for (const track of song.tracks) {
			const tr = {
				...track,
				tokens: track.notes.replaceAll("|", " ").trim().split(/\s+/),
			};
			for (let i = 0; i < Math.min(16, tr.tokens.length); i++)
				a._note(tr, i, 0.02 + i * spb, spb, a._musBus);
		}
		const stats = signalStats(await ctx.startRendering());
		check(
			`music ${name}: finite, audible at 10%, bounded`,
			stats.finite && stats.rms > 0.00001 && stats.peak < 0.2,
			JSON.stringify(stats),
		);
	}
	{
		const quiet = fixture(0.7, 0.1);
		const loud = fixture(0.7, 1);
		for (const f of [quiet, loud])
			f.a._voice(
				{ wave: "sine", freq: 440, dur: 0.3, vol: 0.2 },
				f.a._musBus,
				0.02,
			);
		const q = signalStats(await quiet.ctx.startRendering());
		const l = signalStats(await loud.ctx.startRendering());
		check(
			"native music bus applies actual 0.10 gain",
			Math.abs(q.rms / l.rms - 0.1) < 0.00001,
			`ratio=${q.rms / l.rms}`,
		);
	}
	{
		const g = new E.Game({
			id: "cg-audio-offline-gate",
			headless: true,
			menu: { settings: [{ key: "music", value: 0.1 }] },
		});
		const driver = createAudio(g);
		driver.setScene("boss");
		driver.event({ id: 1, t: 0, type: "warning" });
		driver.update(0.5);
		check(
			"locked audio creates no context or native music clock",
			g.audio.ctx === null && g.audio.song === null && !driver.debug().unlocked,
		);
		driver.stop();
		check(
			"stop releases driver effect and voice handles",
			driver.debug().activeEffects === 0 &&
				driver.debug().activeVoiceNodes === 0 &&
				driver.debug().stopped,
		);
		check(
			"new game music setting defaults to 0.10",
			g.settings.music === 0.1 && g.audio.musicVolume === 0.1,
		);
		g.dispose();
	}
	{
		// Logic-only fake beside the real offline signal checks: duplicate
		// delivery and replay must not require an audible realtime context.
		let played = 0;
		const native = {
			ctx: { state: "running", currentTime: 0 },
			ready: true,
			volume: 0.7,
			musicVolume: 0.1,
			sfxVolume: 1,
			voiceVolume: 1,
			muted: false,
			define() {},
			bus() {
				return {};
			},
			music() {},
			mute(value) {
				this.muted = value;
			},
			sfx() {
				played++;
				return { stop() {} };
			},
		};
		const g = {
			headless: false,
			live: false,
			settings: { sound: true },
			audio: native,
		};
		const driver = createAudio(g);
		driver.setScene("mission");
		driver.unlock();
		driver.event({ id: 1, t: 0, type: "shot" });
		driver.update(0.1);
		driver.event({ id: 2, t: 0.1, type: "shot" });
		driver.update(0.1);
		driver.event({ id: 1, t: 0, type: "shot" });
		check("older repeated snapshot events do not replay cues", played === 2);
		driver.setScene("mission");
		driver.event({ id: 1, t: 0, type: "shot" });
		check("same-scene replay gets a fresh event epoch", played === 3);
		native.muted = true;
		driver.event({ id: 3, t: 1, type: "sector", sector: 1 });
		driver.setScene("mission");
		native.muted = false;
		driver.update(0.1);
		driver.event({ id: 1, t: 0, type: "shot" });
		check("sector scene selection keeps current event epoch", played === 3);
		driver.stop({ terminal: true });
		const unlocked = driver.unlock(),
			selected = driver.setScene("title");
		driver.event({ id: 4, t: 2, type: "shot" });
		driver.update(1);
		check(
			"terminal session stop resists pad unlock and scene changes",
			!unlocked &&
				!selected &&
				native.muted &&
				played === 3 &&
				driver.debug().terminal,
		);
	}
	return results;
}
