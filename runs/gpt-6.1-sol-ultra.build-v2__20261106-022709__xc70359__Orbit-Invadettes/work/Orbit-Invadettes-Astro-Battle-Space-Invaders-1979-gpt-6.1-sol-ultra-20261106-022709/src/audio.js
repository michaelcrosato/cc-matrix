/** Every sound is synthesized. Nothing is decoded, fetched or sampled. */
export function createAudio(game) {
	const audio = game.audio;
	const active = new Set();
	const handles = new Set();
	let unlocked = false,
		current = "",
		wanted = null,
		voiceUntil = -Infinity,
		march = 0;
	const counts = {
		events: 0,
		effects: 0,
		barks: 0,
		throttled: 0,
		maximumActive: 0,
	};
	const last = new Map();
	const now = () => Number(game.real || game.time || 0);

	function track(src, gain, end, context) {
		const node = { src, gain, context };
		active.add(node);
		counts.maximumActive = Math.max(counts.maximumActive, active.size);
		src.onended = () => {
			active.delete(node);
			try {
				src.disconnect();
				gain.disconnect();
			} catch (_) {
				/* already disconnected */
			}
		};
		src.stop(end + 0.015);
		return node;
	}
	function synth(kind, ctx, bus, time, freq, duration, volume) {
		const t = Math.max(ctx.currentTime, Number(time) || 0),
			dur = Math.min(2, Math.max(0.025, Number(duration) || 0.1));
		const f = Math.max(35, Math.min(6000, Number(freq) || 440)),
			vol = Math.min(0.4, Math.max(0, Number(volume) || 0));
		const osc = ctx.createOscillator(),
			g = ctx.createGain();
		osc.type =
			kind === "bass" ? "triangle" : kind === "reed" ? "square" : "sine";
		osc.frequency.setValueAtTime(f, t);
		if (kind === "bass")
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(30, f * 0.65),
				t + dur,
			);
		if (kind === "pluck")
			osc.frequency.exponentialRampToValueAtTime(f * 0.985, t + dur);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.00001, t + dur);
		osc.connect(g);
		g.connect(bus);
		osc.start(t);
		track(osc, g, t + dur, ctx);
		if (kind === "glass") {
			const overtone = ctx.createOscillator(),
				og = ctx.createGain();
			overtone.type = "sine";
			overtone.frequency.value = f * 2.01;
			og.gain.setValueAtTime(vol * 0.23, t);
			og.gain.exponentialRampToValueAtTime(0.00001, t + dur * 0.55);
			overtone.connect(og);
			og.connect(bus);
			overtone.start(t);
			track(overtone, og, t + dur * 0.55, ctx);
		}
	}
	for (const [name, kind] of [
		["orbitPluck", "pluck"],
		["orbitGlass", "glass"],
		["orbitBass", "bass"],
		["orbitReed", "reed"],
	]) {
		audio.instrument(name, (ctx, bus, time, freq, dur, vol) =>
			synth(kind, ctx, bus, time, freq, dur, vol),
		);
	}
	const songs = [
		{
			bpm: 102,
			steps: 4,
			tracks: [
				{
					name: "spark",
					wave: "orbitPluck",
					vol: 0.15,
					notes:
						"A4 . . . E5 . . . | G5 . . E5 . . C5 . | D5 . . . C5 . . . | A4 . . . . . . .",
				},
				{
					name: "stars",
					wave: "orbitGlass",
					vol: 0.075,
					notes:
						". . . . . . . . | . . . . C6 . . . | . . . . E5 . . . | . . . . . . . .",
				},
			],
		},
		{
			bpm: 110,
			steps: 4,
			tracks: [
				{
					name: "spark",
					wave: "orbitPluck",
					vol: 0.14,
					notes:
						"D5 . . . A4 . . . | F5 . . . E5 . D5 . | A5 . . . F5 . . . | E5 . D5 . . . . .",
				},
				{
					name: "stars",
					wave: "orbitGlass",
					vol: 0.065,
					notes:
						". . A5 . . . . . | . . . . . . . . | . . . . C6 . . . | . . . . . . . .",
				},
			],
		},
		{
			bpm: 118,
			steps: 4,
			tracks: [
				{
					name: "spark",
					wave: "orbitPluck",
					vol: 0.14,
					notes:
						"E5 . . B5 . . G5 . | F#5 . . . E5 . . . | G5 . . . A5 . B5 . | F#5 . . . E5 . . .",
				},
				{
					name: "stars",
					wave: "orbitGlass",
					vol: 0.065,
					notes:
						". . . . B5 . . . | . . . . . . . . | . . . . . . . . | . . D6 . . . B5 .",
				},
			],
		},
		{
			bpm: 136,
			steps: 4,
			tracks: [
				{
					name: "pulse",
					wave: "orbitBass",
					vol: 0.18,
					notes:
						"E2 . . E2 . . G2 . | E2 . . B2 . . D3 . | E2 . . E2 . . C3 . | B2 . . B2 . . . .",
				},
				{
					name: "alarm",
					wave: "orbitReed",
					vol: 0.045,
					notes:
						". . E5 . . . . . | . . . . . . F5 . | . . E5 . . . . . | B4 . . . . . . .",
				},
				{
					name: "stars",
					wave: "orbitGlass",
					vol: 0.065,
					notes:
						"E6 . . . . . . . | . . . . . . . . | D6 . . . . . . . | . . B5 . . . . .",
				},
			],
		},
	];
	const victory = {
		bpm: 132,
		steps: 4,
		tracks: [
			{
				wave: "orbitGlass",
				vol: 0.22,
				notes: "C5 . E5 . G5 . C6 - | B5 . G5 . C6 - - - | . . . . . . . .",
			},
			{
				wave: "orbitBass",
				vol: 0.14,
				notes: "C3 - . . G3 - . . | C4 - - - . . . . | . . . . . . . .",
			},
		],
	};
	const defeat = {
		bpm: 80,
		steps: 4,
		tracks: [
			{
				wave: "orbitPluck",
				vol: 0.18,
				notes: "E5 - . . C5 - . . | A4 - - - E4 - - - | . . . . . . . .",
			},
		],
	};
	const sounds = {
		shot: [
			{ wave: "pulse12", freq: 1060, to: 400, dur: 0.065, vol: 0.075 },
			{ wave: "sine", freq: 1900, to: 1100, dur: 0.035, vol: 0.04 },
		],
		enemyShot: { wave: "triangle", freq: 290, to: 145, dur: 0.16, vol: 0.12 },
		heavy: [
			{ wave: "noise", freq: 250, to: 70, dur: 0.25, vol: 0.13 },
			{ wave: "triangle", freq: 155, to: 70, dur: 0.3, vol: 0.14 },
		],
		kill: [
			{ wave: "pulse", freq: 620, to: 180, dur: 0.12, vol: 0.11 },
			{ wave: "noise", freq: 1700, to: 700, dur: 0.08, vol: 0.07 },
		],
		armour: {
			wave: "square",
			freq: 1420,
			to: 350,
			dur: 0.08,
			vol: 0.09,
			arp: [0, 7, -5],
			step: 0.025,
		},
		erosion: { wave: "noise", freq: 1500, to: 600, dur: 0.04, vol: 0.025 },
		repair: [
			{ wave: "orbitGlass", freq: 440, dur: 0.3, vol: 0.18 },
			{ wave: "orbitGlass", freq: 660, dur: 0.3, delay: 0.08, vol: 0.12 },
			{ wave: "orbitGlass", freq: 880, dur: 0.3, delay: 0.16, vol: 0.1 },
		],
		pickup: {
			wave: "sine",
			freq: 700,
			to: 1050,
			dur: 0.11,
			vol: 0.12,
			arp: [0, 4, 7],
			step: 0.035,
		},
		loss: [
			{ wave: "noise", freq: 800, to: 90, dur: 0.36, vol: 0.18 },
			{ wave: "saw", freq: 190, to: 35, dur: 0.42, vol: 0.13 },
		],
		respawn: {
			wave: "triangle",
			freq: 220,
			to: 880,
			dur: 0.28,
			vol: 0.1,
			arp: [0, 7, 12],
			step: 0.08,
		},
		saucer: {
			wave: "sine",
			freq: 660,
			to: 720,
			dur: 0.26,
			vol: 0.07,
			vib: [13, 0.14],
		},
		extra: {
			wave: "orbitGlass",
			freq: 440,
			dur: 0.45,
			vol: 0.2,
			arp: [0, 4, 7, 12],
			step: 0.07,
		},
		denied: { wave: "triangle", freq: 170, to: 125, dur: 0.07, vol: 0.075 },
		telegraph: { wave: "sine", freq: 340, to: 480, dur: 0.18, vol: 0.075 },
		select: { wave: "triangle", freq: 580, to: 760, dur: 0.05, vol: 0.06 },
		confirm: { wave: "orbitPluck", freq: 660, dur: 0.14, vol: 0.1 },
		core: [
			{ wave: "orbitGlass", freq: 330, dur: 0.2, vol: 0.2 },
			{ wave: "noise", freq: 1700, to: 100, dur: 0.16, vol: 0.07 },
		],
	};
	for (const [name, voice] of Object.entries(sounds))
		audio.define("orbit:" + name, voice);

	function effect(name, x = 240, throttle = 0.035) {
		if (!unlocked || !audio.ready || !sounds[name]) return;
		const t = now(),
			prev = last.has(name) ? last.get(name) : -Infinity;
		if (t - prev < throttle) {
			counts.throttled++;
			return;
		}
		last.set(name, t);
		counts.effects++;
		const h = audio.sfx("orbit:" + name, {
			pan: Math.max(-0.75, Math.min(0.75, (Number(x) - 240) / 320)),
			vary: name === "repair" ? 0 : 0.035,
		});
		if (h && h.playing) handles.add({ h, end: t + 1 });
		for (const v of handles) if (v.end < t) handles.delete(v);
	}
	function bark(kind = "command") {
		if (!unlocked || !audio.ready || now() < voiceUntil) return;
		const ctx = audio.ctx,
			bus = audio.bus("voice");
		if (!bus) return;
		const base = kind === "alien" ? 390 : 220,
			notes = kind === "alien" ? [1.3, 0.9, 1.5, 1.1] : [1, 1.2, 0.86];
		const start = ctx.currentTime + 0.01;
		notes.forEach((q, i) => {
			const osc = ctx.createOscillator(),
				gain = ctx.createGain(),
				formant = ctx.createBiquadFilter();
			const t = start + i * 0.082,
				end = t + 0.067;
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(base * q, t);
			osc.frequency.exponentialRampToValueAtTime(base * q * 0.8, end);
			formant.type = "bandpass";
			formant.frequency.value = i % 2 ? 1200 : 1900;
			formant.Q.value = 2.8;
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.095, t + 0.006);
			gain.gain.exponentialRampToValueAtTime(0.00001, end);
			osc.connect(formant);
			formant.connect(gain);
			gain.connect(bus);
			osc.start(t);
			track(osc, gain, end, ctx);
			osc.addEventListener(
				"ended",
				() => {
					try {
						formant.disconnect();
					} catch (_) {
						/* closed */
					}
				},
				{ once: true },
			);
		});
		voiceUntil = now() + 3.5;
		counts.barks++;
	}
	function location(world) {
		wanted = world;
		if (!world || !unlocked) return;
		const state = world.status;
		let key;
		if (state === "victory" || state === "defeat") key = state;
		else
			key =
				world.encounter === 6 || world.boss
					? "boss"
					: "location" + Math.min(2, Math.max(0, Number(world.location) || 0));
		if (key === current) return;
		current = key;
		if (key === "victory" || key === "defeat") {
			audio.music(key === "victory" ? victory : defeat, {
				sync: true,
				loop: false,
				restart: true,
			});
			bark("command");
		} else {
			audio.music(key === "boss" ? songs[3] : songs[Number(key.slice(-1))], {
				sync: true,
				fade: 0.3,
			});
		}
	}
	const aliases = {
		fire: "shot",
		playerShot: "shot",
		playerFire: "shot",
		enemyFire: "enemyShot",
		bomb: "enemyShot",
		volley: "enemyShot",
		heavyBomb: "heavy",
		death: "kill",
		enemyDeath: "kill",
		enemyKill: "kill",
		hit: "armour",
		armourHit: "armour",
		armor: "armour",
		armourBreak: "armour",
		erode: "erosion",
		crater: "erosion",
		cell: "erosion",
		cover: "erosion",
		bunkerHit: "erosion",
		debris: "erosion",
		cells: "erosion",
		repaired: "repair",
		collect: "pickup",
		salvage: "pickup",
		playerDeath: "loss",
		playerLoss: "loss",
		shipDeath: "loss",
		saucerSpawn: "saucer",
		saucerEnter: "saucer",
		extraLife: "extra",
		oneup: "extra",
		noRepair: "denied",
		repairDenied: "denied",
		boss: "heavy",
		bossHit: "core",
		"boss-hit": "core",
		"boss-phase": "heavy",
		"emitter-break": "heavy",
		"saucer-hit": "extra",
		shield: "denied",
		blocked: "armour",
		emitterHit: "armour",
		emitterBreak: "heavy",
		phase: "heavy",
		phaseChange: "heavy",
		bossPhase: "heavy",
	};
	function events(list, world) {
		if (world) location(world);
		if (!Array.isArray(list) || !unlocked) return;
		for (const event of list) {
			counts.events++;
			const type = event.type || event.kind || event.name;
			const name =
				type === "volley" && event.kind === "heavy"
					? "heavy"
					: aliases[type] || type;
			if (type === "march") {
				if (!audio.ready) continue;
				const notes = [82.41, 73.42, 65.41, 73.42];
				audio.sfx(
					{
						wave: "orbitBass",
						freq: notes[march++ % 4],
						dur: 0.115,
						vol: 0.12,
					},
					{ vary: 0 },
				);
			} else if (type === "stage" || type === "wave" || type === "encounter") {
				bark(world && world.encounter >= 4 ? "alien" : "command");
			} else {
				effect(
					name,
					event.x ?? 240,
					name === "erosion"
						? 0.09
						: name === "enemyShot"
							? 0.09
							: name === "saucer"
								? 1.5
								: 0.035,
				);
			}
		}
	}
	function stop() {
		audio.music(null, { fade: 0 });
		current = "";
		wanted = null;
		for (const v of handles)
			try {
				v.h.stop(0);
			} catch (_) {
				/* expired */
			}
		handles.clear();
		for (const n of active) {
			try {
				n.src.stop();
				n.src.disconnect();
				n.gain.disconnect();
			} catch (_) {
				/* expired */
			}
		}
		active.clear();
		last.clear();
		march = 0;
	}
	function unlock() {
		// The application calls this only from a real key, pointer, touch or controller gesture.
		if (game.headless) return false;
		if (unlocked) {
			if (audio.ctx && audio.ctx.state === "suspended")
				audio.ctx.resume().catch(() => {});
			return true;
		}
		const bus = audio.bus("voice");
		unlocked = !!bus;
		if (audio.ctx && audio.ctx.state === "suspended")
			audio.ctx.resume().catch(() => {});
		if (wanted) {
			const w = wanted;
			current = "";
			location(w);
		}
		return unlocked;
	}
	async function renderProbe(Context, { muted = false, bus = "music" } = {}) {
		// Uses the exact authored instrument generator; a signal check cannot establish taste.
		const ctx = new Context(1, 22050, 22050),
			gain = ctx.createGain();
		gain.gain.value = muted
			? 0
			: bus === "music"
				? 0.1
				: bus === "voice"
					? 0.7
					: 1;
		gain.connect(ctx.destination);
		synth("glass", ctx, gain, 0, 440, 0.3, 0.2);
		const buffer = await ctx.startRendering(),
			data = buffer.getChannelData(0);
		let sum = 0,
			peak = 0,
			finite = true;
		for (const value of data) {
			finite = finite && Number.isFinite(value);
			sum += value * value;
			peak = Math.max(peak, Math.abs(value));
		}
		return {
			finite,
			peak,
			rms: Math.sqrt(sum / data.length),
			samples: data.length,
			bus,
			muted,
		};
	}
	return {
		events,
		location,
		stop,
		unlock,
		effect,
		bark,
		songs,
		sounds,
		renderProbe,
		diagnostics: () => ({
			...counts,
			unlocked,
			ready: audio.ready,
			active: active.size,
			soundtrack: current,
			musicVolume: audio.musicVolume,
			sfxVolume: audio.sfxVolume,
			voiceVolume: audio.voiceVolume,
			muted: audio.muted,
		}),
	};
}
