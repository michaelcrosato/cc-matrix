/* All score, effects, and invented creature syllables are synthesized here.
 * Native ChipAudio supplies buses, sequencing, noise, fades, and gesture locking. */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const AUDIO_DEFAULTS = Object.freeze({
	music: 0.1,
	effects: 0.65,
	voice: 0.35,
	mute: false,
});

function bell(ctx, bus, time, freq, dur, vol) {
	const nodes = [];
	for (const [ratio, k] of [
		[1, 0.65],
		[2.01, 0.18],
		[3.98, 0.06],
	]) {
		const osc = ctx.createOscillator(),
			gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(freq * ratio, time);
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(vol * k, time + 0.006);
		gain.gain.exponentialRampToValueAtTime(0.00001, time + Math.max(0.04, dur));
		osc.connect(gain);
		gain.connect(bus);
		osc.start(time);
		osc.stop(time + Math.max(0.04, dur) + 0.02);
		nodes.push(osc);
	}
	return nodes;
}
function voiceSyllable(ctx, bus, time, freq, dur, vol, vowel = 0) {
	const o = ctx.createOscillator(),
		filter = ctx.createBiquadFilter(),
		g = ctx.createGain();
	o.type = "sawtooth";
	o.frequency.setValueAtTime(freq, time);
	o.frequency.exponentialRampToValueAtTime(
		freq * (vowel % 2 ? 1.18 : 0.83),
		time + dur,
	);
	filter.type = "bandpass";
	filter.frequency.setValueAtTime([690, 920, 1250, 1680][vowel % 4], time);
	filter.Q.value = 3;
	g.gain.setValueAtTime(0, time);
	g.gain.linearRampToValueAtTime(vol, time + 0.012);
	g.gain.exponentialRampToValueAtTime(0.00001, time + dur);
	o.connect(filter);
	filter.connect(g);
	g.connect(bus);
	o.start(time);
	o.stop(time + dur + 0.025);
	return o;
}
const SOUNDS = {
	dangerStep: {
		wave: "noise",
		freq: 520,
		to: 180,
		dur: 0.075,
		vol: 0.09,
		filter: "lowpass",
	},
	dangerTurn: { wave: "noise", freq: 1000, to: 350, dur: 0.05, vol: 0.035 },
	dangerWar: [
		{ wave: "triangle", freq: 145, to: 68, dur: 0.12, vol: 0.23 },
		{ wave: "noise", freq: 3800, to: 650, dur: 0.09, vol: 0.15 },
	],
	dangerSpirit: [
		{ wave: "sine", freq: 390, to: 880, dur: 0.13, vol: 0.17 },
		{ wave: "dangerGlass", freq: 1174, dur: 0.24, vol: 0.15 },
	],
	dangerBow: [
		{ wave: "noise", freq: 4100, to: 2200, dur: 0.07, vol: 0.13 },
		{ wave: "triangle", freq: 145, to: 320, dur: 0.07, vol: 0.09 },
	],
	dangerGuard: [
		{ wave: "square", freq: 180, dur: 0.04, vol: 0.11 },
		{ wave: "dangerGlass", freq: 520, dur: 0.12, vol: 0.12 },
	],
	dangerHurt: { wave: "triangle", freq: 140, to: 50, dur: 0.17, vol: 0.18 },
	dangerPickup: {
		wave: "dangerGlass",
		freq: 660,
		arp: [0, 7, 12],
		step: 0.045,
		dur: 0.22,
		vol: 0.13,
	},
	dangerEquip: { wave: "noise", freq: 1500, to: 700, dur: 0.09, vol: 0.09 },
	dangerRest: [
		{
			wave: "dangerGlass",
			freq: 330,
			arp: [0, 4, 7, 12],
			step: 0.09,
			dur: 0.5,
			vol: 0.15,
		},
		{
			wave: "noise",
			freq: 180,
			to: 80,
			dur: 0.25,
			vol: 0.045,
			filter: "lowpass",
		},
	],
	dangerPotion: {
		wave: "sine",
		freq: 260,
		arp: [0, 5, 12],
		step: 0.08,
		dur: 0.35,
		vol: 0.14,
	},
	dangerKey: {
		wave: "dangerGlass",
		freq: 880,
		arp: [0, 7, 4, 12],
		step: 0.055,
		dur: 0.32,
		vol: 0.16,
	},
	dangerDoor: [
		{
			wave: "noise",
			freq: 240,
			to: 80,
			dur: 0.6,
			vol: 0.13,
			filter: "lowpass",
		},
		{ wave: "triangle", freq: 70, to: 95, dur: 0.5, vol: 0.07 },
	],
	dangerGate: [
		{
			wave: "saw",
			freq: 65,
			to: 350,
			dur: 0.65,
			vol: 0.1,
			filter: "lowpass",
			vib: [6, 0.08],
		},
		{
			wave: "dangerGlass",
			freq: 587,
			arp: [0, 7, 12, 19],
			step: 0.11,
			dur: 0.75,
			vol: 0.15,
		},
	],
	dangerSecret: {
		wave: "dangerGlass",
		freq: 440,
		arp: [0, 3, 7, 12, 15],
		step: 0.07,
		dur: 0.6,
		vol: 0.16,
	},
	dangerDown: {
		wave: "triangle",
		freq: 330,
		arp: [0, -2, -5, -12],
		step: 0.11,
		dur: 0.6,
		vol: 0.16,
	},
	dangerEnemyFall: [
		{ wave: "noise", freq: 600, to: 100, dur: 0.3, vol: 0.1 },
		{ wave: "sine", freq: 250, to: 70, dur: 0.25, vol: 0.12 },
	],
	dangerPhase: [
		{ wave: "saw", freq: 78, to: 156, dur: 0.65, vol: 0.08, filter: "lowpass" },
		{
			wave: "dangerGlass",
			freq: 293.66,
			arp: [0, 7, 12],
			step: 0.17,
			dur: 0.85,
			vol: 0.18,
		},
	],
	dangerVictory: {
		wave: "dangerGlass",
		freq: 440,
		arp: [0, 4, 7, 12, 16, 19],
		step: 0.09,
		dur: 1.1,
		vol: 0.16,
	},
	dangerMenu: { wave: "sine", freq: 660, dur: 0.045, vol: 0.08 },
};

const music = (bpm, tracks) => ({ bpm, steps: 4, tracks });
export const SCORES = {
	title: music(68, [
		{
			name: "stone",
			wave: "triangle",
			vol: 0.15,
			notes:
				"D2 - - - - - - - | D2 - - - - - - - | Bb1 - - - - - - - | C2 - - - A1 - - -",
		},
		{
			name: "lantern",
			wave: "dangerGlass",
			vol: 0.15,
			notes:
				"D4 . . . A4 . . . | F4 . . . E4 . . . | D4 . . . F4 . . . | E4 . . . C#4 . . .",
		},
		{
			name: "dust",
			wave: "sine",
			vol: 0.045,
			notes:
				". . . . . . D5 . | . . . . . . . . | . . . . . . C5 . | . . . . . . . .",
		},
	]),
	upper: music(72, [
		{
			name: "stone",
			wave: "triangle",
			vol: 0.15,
			notes:
				"D2 . . . . . D2 . | Bb1 . . . . . . . | G1 . . . . . . . | A1 . . . . . . .",
		},
		{
			name: "lantern",
			wave: "dangerGlass",
			vol: 0.13,
			notes:
				"D4 . A4 . . . F4 . | E4 . . . D4 . . . | Bb3 . D4 . . . F4 . | E4 . . . C#4 . . .",
		},
		{
			name: "pulse",
			wave: "sine",
			vol: 0.04,
			notes: "D3 . . . . . . . | . . . . . . . .",
		},
	]),
	spirit: music(66, [
		{
			name: "water",
			wave: "sine",
			vol: 0.19,
			notes:
				"G1 - - - - - - - | Eb2 - - - - - - - | C2 - - - - - - - | D2 - - - - - - -",
		},
		{
			name: "script",
			wave: "dangerGlass",
			vol: 0.14,
			notes:
				"G4 . D5 . . . Bb4 . | Ab4 . . . G4 . . . | Eb4 . G4 . . . Bb4 . | A4 . . . F#4 . . .",
		},
		{
			name: "drops",
			wave: "sine",
			vol: 0.035,
			notes:
				". . G5 . . . . . | . . . . . . D5 . | . . . . Eb5 . . . | . . . . . . . .",
		},
	]),
	guardian: music(76, [
		{
			name: "engine",
			wave: "triangle",
			vol: 0.16,
			notes:
				"D2 . D2 . . . D2 . | C2 . C2 . . . C2 . | Bb1 . Bb1 . . . Bb1 . | A1 . A1 . . . A1 .",
		},
		{
			name: "horns",
			wave: "dangerGlass",
			vol: 0.12,
			notes:
				"D3 . . . A3 . . . | F3 . . . G3 . . . | Bb3 . . . F3 . . . | E3 . . . C#3 . . .",
		},
		{
			name: "clock",
			wave: "drums",
			vol: 0.026,
			notes: ". . h . . . h . | . . h . . . h .",
		},
	]),
	combat: music(104, [
		{
			name: "tread",
			wave: "triangle",
			vol: 0.16,
			notes:
				"D2 . D2 . A1 . D2 . | C2 . C2 . G1 . C2 . | Bb1 . Bb1 . F1 . Bb1 . | A1 . A1 . E2 . A1 .",
		},
		{
			name: "edge",
			wave: "dangerGlass",
			vol: 0.13,
			notes:
				"D4 . A4 . F4 . E4 . | D4 . G4 . E4 . C4 . | Bb3 . F4 . D4 . C4 . | C#4 . E4 . A4 . . .",
		},
		{
			name: "round",
			wave: "drums",
			vol: 0.045,
			notes: "k . h . . . h . | k . h . s . h .",
		},
	]),
	boss1: music(112, [
		{
			name: "iron",
			wave: "triangle",
			vol: 0.17,
			notes:
				"D2 . D2 . D2 . A1 . | D2 . D2 . F2 . E2 . | Bb1 . Bb1 . Bb1 . F1 . | A1 . A1 . E2 . C#2 .",
		},
		{
			name: "weight",
			wave: "saw",
			vol: 0.035,
			notes:
				"D3 - . . . . A3 . | F3 - . . E3 - . . | Bb2 - . . . . F3 . | A3 - . . C#4 - . .",
		},
		{
			name: "ward",
			wave: "dangerGlass",
			vol: 0.11,
			notes:
				". . . . D5 . . . | . . . . . . E5 . | . . . . F5 . . . | E5 . . . C#5 . . .",
		},
		{
			name: "hammer",
			wave: "drums",
			vol: 0.055,
			notes: "k . h . s . h . | k k h . s . h .",
		},
	]),
	boss2: music(100, [
		{
			name: "tide",
			wave: "sine",
			vol: 0.18,
			notes:
				"G1 . D2 . G1 . D2 . | Eb2 . Bb1 . Eb2 . Bb1 . | C2 . G2 . C2 . G2 . | D2 . A1 . D2 . A1 .",
		},
		{
			name: "oath",
			wave: "dangerGlass",
			vol: 0.14,
			notes:
				"G4 . Bb4 . D5 . G5 . | Eb5 . D5 . Bb4 . G4 . | C5 . Eb5 . G5 . Eb5 . | D5 . C5 . A4 . F#4 .",
		},
		{
			name: "pulse",
			wave: "drums",
			vol: 0.04,
			notes: "k . h . . . h . | k . h . s . h .",
		},
	]),
	boss3: music(120, [
		{
			name: "mastery",
			wave: "triangle",
			vol: 0.16,
			notes:
				"D2 . D2 A1 D2 . F2 . | C2 . C2 G1 C2 . E2 . | Bb1 . Bb1 F1 Bb1 . D2 . | A1 . A1 E2 A1 . C#2 .",
		},
		{
			name: "steel",
			wave: "dangerGlass",
			vol: 0.14,
			notes:
				"D4 A4 F4 A4 D5 . C5 . | C4 G4 E4 G4 C5 . Bb4 . | Bb3 F4 D4 F4 Bb4 . A4 . | A3 E4 C#4 E4 A4 . C#5 .",
		},
		{
			name: "answer",
			wave: "sine",
			vol: 0.04,
			notes: "D5 . . . . . E5 . | F5 . . . E5 . . .",
		},
		{
			name: "oath",
			wave: "drums",
			vol: 0.055,
			notes: "k . h k s . h . | k k h . s . h h",
		},
	]),
	victory: music(86, [
		{
			name: "dawn",
			wave: "triangle",
			vol: 0.14,
			notes:
				"D2 - - - A2 - - - | G2 - - - D2 - - - | Bb1 - - - F2 - - - | A1 - - - D2 - - -",
		},
		{
			name: "emberheart",
			wave: "dangerGlass",
			vol: 0.17,
			notes:
				"D4 . F#4 . A4 . D5 . | B4 . A4 . F#4 . E4 . | D4 . F4 . Bb4 . D5 . | A4 . F#4 . E4 . D4 .",
		},
	]),
};

export class GameAudio {
	constructor(game) {
		this.game = game;
		this.audio = game.audio;
		this.unlocked = false;
		this.stopped = false;
		this.songKey = null;
		this.lastRun = null;
		this.seen = new Set();
		this.handles = [];
		this.voiceNodes = [];
		this.settings = { ...AUDIO_DEFAULTS };
		this.paused = false;
		this.analyser = null;
		this.samples = null;
		this.eventsPlayed = 0;
		this.lastCombat = null;
		this.lastEventSeq = 0;
		this.lastClock = 0;
		const a = this.audio;
		a.instrument("dangerGlass", (ctx, bus, time, freq, dur, vol) =>
			bell(ctx, bus, time, freq, Math.max(0.11, dur), vol),
		);
		for (const [id, v] of Object.entries(SOUNDS)) a.define(id, v);
		a.musicVolume = 0.1;
		a.sfxVolume = 0.65;
		a.voiceVolume = 0.35;
	}
	unlock() {
		this.unlocked = true;
		this.stopped = false;
		const master = this.audio.bus("master"),
			c = this.audio.ctx;
		if (c && master && !this.analyser) {
			this.analyser = c.createAnalyser();
			this.analyser.fftSize = 1024;
			master.connect(this.analyser);
			this.samples = new Float32Array(this.analyser.fftSize);
		}
		if (c?.state === "suspended") c.resume().catch(() => {});
		this._volumes();
	}
	_volumes() {
		const a = this.audio,
			settings = this.settings;
		a.musicVolume = clamp(settings.music ?? 0.1);
		a.sfxVolume = clamp(settings.effects ?? 0.65);
		a.voiceVolume = clamp(settings.voice ?? 0.35);
		a.volume = clamp(settings.volume ?? 0.7);
		a.muted =
			settings.sound === false ||
			!!settings.mute ||
			this.paused ||
			this.stopped;
		a.applyVolume();
	}
	update(state, settings = {}, paused = false) {
		this.settings = { ...AUDIO_DEFAULTS, ...settings };
		const shouldPause = !!paused || state?.phase === "ended";
		if (shouldPause !== this.paused) {
			this.paused = shouldPause;
			if (shouldPause) {
				this._silence();
			} else if (this.unlocked) {
				this.stopped = false;
				if (this.audio.ctx?.state === "suspended")
					this.audio.ctx.resume().catch(() => {});
				this.songKey = null;
			}
		}
		this._volumes();
		if (!this.unlocked || this.stopped || this.paused) return;
		if (
			state?.runId !== this.lastRun ||
			(state &&
				(state.eventSeq < this.lastEventSeq || state.clock < this.lastClock))
		) {
			this.lastRun = state?.runId;
			this.seen = new Set((state?.events || []).map((e) => e.id));
			this.lastCombat = null;
		}
		this.lastEventSeq = state?.eventSeq || 0;
		this.lastClock = state?.clock || 0;
		const boss = Object.values(state?.entities || {}).find(
			(e) =>
				e.type === "enemy" &&
				e.kind === "minotaur" &&
				!e.dead &&
				state.combat?.enemies.includes(e.id),
		);
		let key = !state
			? "title"
			: state.phase === "victory"
				? "victory"
				: boss
					? "boss" + clamp(boss.phase || 1, 1, 3)
					: state.phase === "combat"
						? "combat"
						: ["upper", "spirit", "guardian"][state.floor] || "upper";
		if (state?.phase === "defeat") key = null;
		if (key !== this.songKey) {
			this.songKey = key;
			this.audio.music(key ? SCORES[key] : null, { fade: 0.65, sync: true });
		}
		const events = state?.events || [];
		for (const ev of events) {
			if (this.seen.has(ev.id)) continue;
			this.seen.add(ev.id);
			this.event(ev, state);
		}
		if (this.seen.size > 512) this.seen = new Set(events.map((e) => e.id));
		if (state?.combat?.id && state.combat.id !== this.lastCombat) {
			this.lastCombat = state.combat.id;
			const spooky = Object.values(state.entities).some(
				(e) =>
					state.combat.enemies.includes(e.id) &&
					["minotaur", "wraith"].includes(e.kind),
			);
			if (spooky) this._babble(boss ? "warden" : "wraith");
		}
		this.handles = this.handles.filter((h) => !h.ended).slice(-30);
	}
	event(e, state = null) {
		if (
			!this.unlocked ||
			this.stopped ||
			this.paused ||
			this.settings.mute ||
			this.settings.sound === false
		)
			return;
		let id = null;
		if (e.type === "move") id = "dangerStep";
		else if (e.type === "turn") id = "dangerTurn";
		else if (e.type === "attack") {
			const item =
				e.kind ||
				state?.items?.[e.weapon]?.kind ||
				state?.items?.[e.item]?.kind;
			id =
				e.channel === "spirit"
					? "dangerSpirit"
					: item === "bow"
						? "dangerBow"
						: "dangerWar";
		} else if (e.type === "enemyAttack")
			id = e.channel === "spirit" ? "dangerSpirit" : "dangerWar";
		else if (e.type === "guard") id = "dangerGuard";
		else if (e.type === "damage" && state?.players?.[e.target])
			id = "dangerHurt";
		else if (e.type === "pickup")
			id = e.key || /key/i.test(e.text || "") ? "dangerKey" : "dangerPickup";
		else if (["equip", "swap", "drop", "handoff"].includes(e.type))
			id = "dangerEquip";
		else if (e.type === "rest" || e.type === "revive") id = "dangerRest";
		else if (e.type === "use") id = "dangerPotion";
		else if (e.type === "door") id = "dangerDoor";
		else if (e.type === "gate" || e.type === "descend") id = "dangerGate";
		else if (e.type === "secret") id = "dangerSecret";
		else if (e.type === "down" || e.type === "defeat") id = "dangerDown";
		else if (e.type === "defeatEnemy") id = "dangerEnemyFall";
		else if (e.type === "bossPhase") {
			id = "dangerPhase";
			this._babble("warden");
		} else if (e.type === "victory") id = "dangerVictory";
		else if (e.type === "menu") id = "dangerMenu";
		if (id) {
			const handle = this.audio.sfx(id);
			if (handle) this.handles.push(handle);
			this.eventsPlayed++;
		}
	}
	_babble(kind) {
		const ctx = this.audio.ctx,
			bus = this.audio.bus("voice");
		if (!ctx || !bus || !this.unlocked || this.paused || this.stopped) return;
		const freq = kind === "warden" ? 72 : 220,
			syllables = kind === "warden" ? [0, 4, -3, 2] : [0, 7, 3, 12],
			t = ctx.currentTime + 0.02;
		syllables.forEach((n, i) => {
			this.voiceNodes.push(
				voiceSyllable(
					ctx,
					bus,
					t + i * 0.13,
					freq * 2 ** (n / 12),
					0.105,
					0.24,
					i,
				),
			);
		});
		this.voiceNodes = this.voiceNodes.slice(-32);
	}
	_silence() {
		this.audio.music(null);
		this.songKey = null;
		for (const h of this.handles)
			try {
				h.stop();
			} catch {}
		this.handles.length = 0;
		for (const n of this.voiceNodes)
			try {
				n.stop();
			} catch {}
		this.voiceNodes.length = 0;
		if (this.audio.ctx?.state === "running")
			this.audio.ctx.suspend().catch(() => {});
	}
	stop() {
		this.stopped = true;
		this.paused = true;
		this._silence();
		this._volumes();
	}
	metrics() {
		let peak = 0,
			rms = 0,
			finite = true;
		if (this.analyser && this.samples) {
			this.analyser.getFloatTimeDomainData(this.samples);
			for (const n of this.samples) {
				finite &&= Number.isFinite(n);
				peak = Math.max(peak, Math.abs(n));
				rms += n * n;
			}
			rms = Math.sqrt(rms / this.samples.length);
		}
		return {
			unlocked: this.unlocked,
			context: this.audio.ctx?.state || "locked",
			musicGain: this.audio.musicVolume,
			effectsGain: this.audio.sfxVolume,
			voiceGain: this.audio.voiceVolume,
			masterGain: this.audio._master?.gain.value ?? 0,
			muted: !!this.audio.muted,
			stopped: this.stopped,
			events: this.eventsPlayed,
			song: this.songKey,
			peak,
			rms,
			finite,
		};
	}
	async offlineProbe() {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline)
			return { supported: false, reason: "OfflineAudioContext unavailable" };
		const render = async (mute) => {
			const c = new Offline(1, 44100, 44100),
				master = c.createGain();
			master.gain.value = mute ? 0 : 0.7;
			master.connect(c.destination);
			const musicBus = c.createGain(),
				voiceBus = c.createGain(),
				effectsBus = c.createGain();
			musicBus.gain.value = 0.1;
			voiceBus.gain.value = 0.35;
			effectsBus.gain.value = 0.65;
			for (const b of [musicBus, voiceBus, effectsBus]) b.connect(master);
			// The same original instrument and syllable functions that play during the expedition.
			bell(c, musicBus, 0.01, 293.66, 0.7, 0.15);
			bell(c, musicBus, 0.22, 440, 0.6, 0.15);
			bell(c, effectsBus, 0.42, 880, 0.35, 0.16);
			voiceSyllable(c, voiceBus, 0.12, 72, 0.11, 0.24, 0);
			voiceSyllable(c, voiceBus, 0.27, 91, 0.12, 0.24, 1);
			const buffer = await c.startRendering(),
				data = buffer.getChannelData(0);
			let finite = true,
				peak = 0,
				sum = 0,
				nonzero = 0;
			for (const x of data) {
				if (!Number.isFinite(x)) finite = false;
				peak = Math.max(peak, Math.abs(x));
				sum += x * x;
				if (Math.abs(x) > 1e-7) nonzero++;
			}
			return {
				finite,
				peak,
				rms: Math.sqrt(sum / data.length),
				nonzero,
				samples: data.length,
			};
		};
		const normal = await render(false),
			muted = await render(true);
		return {
			supported: true,
			...normal,
			mutedPeak: muted.peak,
			musicDefault: 0.1,
			clipping: normal.peak >= 1,
			pass:
				normal.finite &&
				normal.nonzero > 0 &&
				normal.peak < 1 &&
				muted.peak === 0,
		};
	}
}
