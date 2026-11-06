(function (S) {
	"use strict";
	const MELODY =
		"D4 . A4 . D5 - C5 . | A4 . F4 . E4 - - . | F4 . A4 . C5 - A4 . | E4 . G4 . A4 - - .";
	const BASS =
		"D2 . D3 . D2 . A2 . | Bb1 . Bb2 . Bb1 . F2 . | F2 . F3 . F2 . C3 . | C2 . C3 . A1 . A2 .";
	const SONGS = {};
	for (const [key, bpm, lead, vol, drum] of [
		["title", 88, "triangle", 0.15, "k . . . . . h ."],
		["act0", 108, "pulse", 0.11, "k . h . s . h ."],
		["act1", 118, "pulse", 0.12, "k . h h s . h ."],
		["act2", 128, "square", 0.09, "k h h . s . h h"],
		["boss", 142, "saw", 0.09, "k h k h s h h h"],
	]) {
		SONGS[key] = {
			bpm,
			steps: 4,
			tracks: [
				{ name: "command", wave: lead, vol, notes: MELODY },
				{ name: "keel", wave: "triangle", vol: 0.22, notes: BASS },
				{ name: "march", wave: "drums", vol: 0.12, notes: drum },
			],
		};
	}
	SONGS.victory = {
		bpm: 112,
		steps: 4,
		loop: false,
		tracks: [
			{
				wave: "triangle",
				vol: 0.22,
				notes:
					"D4 F4 A4 D5 - - C5 A4 | F4 A4 C5 F5 - - E5 C5 | D5 - - - A4 - D5 -",
			},
			{
				wave: "triangle",
				vol: 0.2,
				notes: "D2 - A2 - D3 - - - | Bb2 - F3 - Bb3 - - - | D3 - - - - - - -",
			},
		],
	};
	SONGS.defeat = {
		bpm: 72,
		steps: 4,
		loop: false,
		tracks: [
			{
				wave: "triangle",
				vol: 0.2,
				notes: "A4 - F4 - D4 - C4 - | D4 - - - . . . .",
			},
			{
				wave: "triangle",
				vol: 0.18,
				notes: "D2 - - - Bb1 - - - | D2 - - - . . . .",
			},
		],
	};
	const FX = {
		laser: { wave: "triangle", freq: 950, to: 330, dur: 0.09, vol: 0.15 },
		hit: { wave: "noise", freq: 2800, to: 600, dur: 0.06, vol: 0.12 },
		hurt: { wave: "saw", freq: 180, to: 55, dur: 0.22, vol: 0.19 },
		pickup: {
			wave: "triangle",
			freq: 660,
			arp: [0, 4, 7, 12],
			step: 0.04,
			dur: 0.2,
			vol: 0.23,
		},
		pulse: { wave: "noise", freq: 3500, to: 160, dur: 0.38, vol: 0.26 },
		gravity: {
			wave: "sine",
			freq: 180,
			to: 48,
			dur: 0.6,
			vol: 0.24,
			vib: [12, 0.09],
		},
		lock: {
			wave: "triangle",
			freq: 320,
			arp: [0, 1, 0, 1, 7],
			step: 0.1,
			dur: 0.5,
			vol: 0.19,
		},
		warning: {
			wave: "square",
			freq: 520,
			arp: [0, 7, 0],
			step: 0.11,
			dur: 0.25,
			vol: 0.15,
		},
		blast: { wave: "noise", freq: 900, to: 65, dur: 0.32, vol: 0.22 },
		boost: { wave: "noise", freq: 170, to: 1600, dur: 0.18, vol: 0.16 },
	};
	function gibberish(ctx, bus, start, seed = 0) {
		const nodes = [];
		for (let i = 0; i < 8; i++) {
			const t = start + i * 0.083,
				f = 155 + ((seed + i * 47) % 110),
				o = ctx.createOscillator(),
				gain = ctx.createGain(),
				filter = ctx.createBiquadFilter();
			o.type = "sawtooth";
			o.frequency.setValueAtTime(f, t);
			o.frequency.linearRampToValueAtTime(f * (i % 2 ? 1.25 : 0.75), t + 0.065);
			filter.type = "bandpass";
			filter.frequency.setValueAtTime([750, 1100, 1650, 900][i % 4], t);
			filter.Q.value = 4;
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.13, t + 0.008);
			gain.gain.linearRampToValueAtTime(0, t + 0.068);
			o.connect(filter).connect(gain).connect(bus);
			o.start(t);
			o.stop(t + 0.075);
			nodes.push(o);
		}
		return nodes;
	}
	class Sound {
		constructor(game) {
			this.game = game;
			this.a = game.audio;
			this.unlocked = false;
			this.ended = false;
			this.lastEvent = 0;
			this.key = null;
			this.nodes = [];
			this.handles = [];
			this.radioAt = -10;
			this.fxAt = {};
			for (const [key, spec] of Object.entries(FX))
				this.a.define("sf-" + key, spec);
		}
		unlock() {
			if (this.ended || document.hidden) return;
			this.unlocked = true;
			const bus = this.a.bus("sfx");
			if (bus) this.a.ctx.resume().catch(() => {});
			this.sync();
		}
		play(name, event) {
			if (!this.unlocked || this.ended || this.silent) return;
			const now = this.a.ctx?.currentTime || 0;
			const gap =
				name === "laser"
					? 0.055
					: name === "hit"
						? 0.06
						: name === "warning"
							? 0.8
							: 0;
			if (now - (this.fxAt[name] ?? -10) < gap) return;
			this.fxAt[name] = now;
			const h = this.a.sfx("sf-" + name, {
				pitch: 1 + (((event?.id || 0) % 5) - 2) * 0.035,
				pan: event ? S.clamp((event.x - 480) / 600, -0.8, 0.8) : 0,
			});
			if (h) this.handles.push(h);
			if (this.handles.length > 64) this.handles.shift();
		}
		voice(seed) {
			if (!this.unlocked || this.ended || this.silent) return;
			const ctx = this.a.ctx,
				bus = this.a.bus("voice");
			if (!ctx || !bus || ctx.currentTime - this.radioAt < 1) return;
			this.stopVoice();
			this.radioAt = ctx.currentTime;
			this.nodes = gibberish(ctx, bus, ctx.currentTime, seed);
		}
		stopVoice() {
			for (const node of this.nodes) {
				try {
					node.stop();
					node.disconnect();
				} catch {}
			}
			this.nodes = [];
		}
		mode(key, silent = false) {
			this.wanted = key;
			this.silent = silent;
			this.sync();
		}
		sync() {
			const key = this.silent || this.ended ? null : this.wanted;
			if (key === this.key) return;
			this.key = key;
			if (this.unlocked) {
				this.a.music(key ? SONGS[key] : null, { sync: true });
				if (!key) {
					this.stopVoice();
					for (const h of this.handles) h.stop?.();
					this.handles = [];
				}
			} else this.key = undefined;
		}
		events(s) {
			for (const e of s.events)
				if (e.id > this.lastEvent) {
					const map = {
						shot: "laser",
						hit: "hit",
						hurt: "hurt",
						death: "blast",
						kill: "blast",
						component: "blast",
						pickup: "pickup",
						pulse: "pulse",
						boost: "boost",
						gravity: "gravity",
						lock: "lock",
						warning: "warning",
						objective: "warning",
						coreWind: "warning",
					};
					if (map[e.type]) this.play(map[e.type], e);
					if (
						["radio", "briefing", "bossPhase", "retreat", "dock"].includes(
							e.type,
						)
					)
						this.voice(e.id * 19);
				}
			this.lastEvent = s.eventSeq;
		}
		reset() {
			this.stopVoice();
			this.lastEvent = 0;
			this.fxAt = {};
			for (const h of this.handles) h.stop?.();
			this.handles = [];
			this.key = undefined;
		}
		stop() {
			this.ended = true;
			this.reset();
			this.a.music(null);
			this.wanted = null;
			this.key = null;
		}
	}
	Object.assign(S, { Sound, SONGS, FX, gibberish });
})(globalThis.Fortnight);
