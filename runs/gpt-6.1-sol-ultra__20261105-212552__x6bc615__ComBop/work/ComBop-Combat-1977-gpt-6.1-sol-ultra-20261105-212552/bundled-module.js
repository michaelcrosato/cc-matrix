import * as THREE from 'three/webgpu';
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm';
/* ComBop — every sound is synthesized here. No samples or audio downloads. */
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

class AudioSystem {
	constructor({ context = null } = {}) {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.musicPlaying = false;
		this.musicStep = 0;
		this.nextNote = 0;
		this.voices = 0;
		this.events = {};
		this.lastSounds = {};
		this.lastVoice = -10;
		this.activeNodes = 0;
		if (context) this._setup(context);
	}

	_setup(context) {
		this.ctx = context;
		this.master = context.createGain();
		this.master.gain.value = this.muted ? 0 : 0.72;
		this.limiter = context.createDynamicsCompressor();
		this.limiter.threshold.value = -14;
		this.limiter.knee.value = 12;
		this.limiter.ratio.value = 5;
		this.limiter.attack.value = 0.003;
		this.limiter.release.value = 0.14;
		this.musicBus = context.createGain();
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus = context.createGain();
		this.sfxBus.gain.value = this.sfxVolume;
		this.voiceBus = context.createGain();
		this.voiceBus.gain.value = this.sfxVolume * 0.7;
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		this.voiceBus.connect(this.master);
		this.master.connect(this.limiter);
		this.analyser = context.createAnalyser();
		this.analyser.fftSize = 256;
		this.limiter.connect(this.analyser);
		this.analyser.connect(context.destination);
		this.noise = context.createBuffer(
			1,
			context.sampleRate * 2,
			context.sampleRate,
		);
		const data = this.noise.getChannelData(0);
		let seed = 1977;
		for (let i = 0; i < data.length; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			data[i] = seed / 2147483648 - 1;
		}
	}

	async unlock() {
		try {
			if (!this.ctx) {
				const Context =
					globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Context) return false;
				this._setup(new Context());
			}
			if (this.ctx.state === "suspended" && !("startRendering" in this.ctx))
				await this.ctx.resume();
			return true;
		} catch {
			return false;
		}
	}

	_gain(parameter, value, seconds = 0.03) {
		if (parameter && this.ctx)
			parameter.setTargetAtTime(value, this.ctx.currentTime, seconds);
	}
	setMusic(value) {
		this.musicVolume = clamp01(value);
		this._gain(this.musicBus?.gain, this.musicVolume);
	}
	setSfx(value) {
		this.sfxVolume = clamp01(value);
		this._gain(this.sfxBus?.gain, this.sfxVolume);
		this._gain(this.voiceBus?.gain, this.sfxVolume * 0.7);
	}
	setMuted(value) {
		this.muted = !!value;
		this._gain(this.master?.gain, this.muted ? 0 : 0.72, 0.01);
	}
	startMusic() {
		if (this.musicPlaying) return;
		this.musicPlaying = true;
		this.musicStep = 0;
		this.nextNote = (this.ctx?.currentTime || 0) + 0.025;
	}
	stopMusic() {
		this.musicPlaying = false;
	}

	_track(source, end, nodes = []) {
		this.activeNodes++;
		source.onended = () => {
			source.disconnect();
			nodes.forEach((node) => {
				node.disconnect();
			});
			this.activeNodes = Math.max(0, this.activeNodes - 1);
		};
		source.stop(end);
	}

	_tone(
		freq,
		time,
		duration,
		volume,
		type = "triangle",
		bus = this.sfxBus,
		endFreq = freq,
		attack = 0.004,
	) {
		const ctx = this.ctx;
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(20, freq), time);
		oscillator.frequency.exponentialRampToValueAtTime(
			Math.max(20, endFreq),
			time + duration,
		);
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + Math.min(attack, duration * 0.25),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		oscillator.connect(gain);
		gain.connect(bus);
		oscillator.start(time);
		this._track(oscillator, time + duration + 0.01, [gain]);
	}

	_noise(
		time,
		duration,
		volume,
		frequency,
		type = "lowpass",
		bus = this.sfxBus,
	) {
		const ctx = this.ctx;
		const source = ctx.createBufferSource();
		source.buffer = this.noise;
		const filter = ctx.createBiquadFilter();
		filter.type = type;
		filter.frequency.value = frequency;
		filter.Q.value = 0.7;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + 0.003,
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		source.start(time);
		this._track(source, time + duration + 0.01, [filter, gain]);
	}

	sfx(name, intensity = 1) {
		if (!this.ctx || this.ctx.state === "closed") return;
		const t = this.ctx.currentTime + 0.002;
		if (
			t - (this.lastSounds[name] ?? -10) <
			(name === "bounce" ? 0.018 : 0.035)
		)
			return;
		this.lastSounds[name] = t;
		this.events[name] = (this.events[name] || 0) + 1;
		const v = Math.max(0.05, Math.min(1.5, intensity));
		switch (name) {
			case "shoot":
				this._tone(210, t, 0.13, 0.3 * v, "square", this.sfxBus, 48);
				this._tone(75, t, 0.18, 0.26 * v, "sine", this.sfxBus, 32);
				this._noise(t, 0.075, 0.21 * v, 2000);
				break;
			case "bounce":
				this._tone(1150, t, 0.085, 0.14 * v, "triangle", this.sfxBus, 720);
				this._tone(1670, t, 0.06, 0.06 * v, "sine", this.sfxBus, 1100);
				break;
			case "hit":
				this._tone(330, t, 0.16, 0.24 * v, "square", this.sfxBus, 85);
				this._tone(710, t, 0.095, 0.14 * v, "triangle", this.sfxBus, 240);
				this._noise(t, 0.14, 0.25 * v, 1500);
				break;
			case "explode":
				this._noise(t, 0.63, 0.65 * v, 1000);
				this._noise(t, 0.14, 0.28 * v, 2800);
				this._tone(115, t, 0.57, 0.6 * v, "sine", this.sfxBus, 24);
				this._tone(62, t + 0.055, 0.37, 0.3 * v, "triangle", this.sfxBus, 27);
				break;
			case "dash":
				this._noise(t, 0.22, 0.22 * v, 1900, "bandpass");
				this._tone(125, t, 0.2, 0.14 * v, "sawtooth", this.sfxBus, 420);
				break;
			case "pickup":
			case "respawn":
				[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
					this._tone(f, t + i * 0.065, 0.22, 0.15 * v, "triangle");
				});
				break;
			case "click":
				this._tone(620, t, 0.035, 0.12 * v, "triangle", this.sfxBus, 900);
				break;
			case "start":
				[261.63, 392, 523.25].forEach((f, i) => {
					this._tone(f, t + i * 0.11, 0.24, 0.2 * v, "square");
				});
				this._noise(t + 0.25, 0.15, 0.13 * v, 5500, "highpass");
				break;
			case "win":
				[523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
					this._tone(
						f,
						t + i * 0.145,
						i === 5 ? 0.6 : 0.23,
						0.18 * v,
						"triangle",
					);
					this._tone(f * 0.5, t + i * 0.145, 0.23, 0.055 * v, "square");
				});
				break;
			case "lose":
				[392, 349.23, 311.13, 261.63].forEach((f, i) => {
					this._tone(
						f,
						t + i * 0.17,
						0.34,
						0.19 * v,
						"triangle",
						this.sfxBus,
						f * 0.98,
					);
				});
				break;
			default:
				this._tone(440, t, 0.06, 0.1 * v, "triangle");
		}
	}

	voice(kind = "ready") {
		if (!this.ctx || this.ctx.currentTime - this.lastVoice < 0.75) return;
		const ctx = this.ctx;
		const start = ctx.currentTime + 0.02;
		this.lastVoice = ctx.currentTime;
		this.voices++;
		const phrase = {
			ready: [0, 5, 2, 7, 12],
			start: [0, 5, 2, 7, 12],
			win: [4, 7, 12, 9, 12, 16],
			lose: [5, 2, 0, -3],
			hit: [7, 0, -3],
			pickup: [0, 7, 12],
		}[kind] || [0, 3, 7, 2, 5];
		phrase.forEach((note, i) => {
			const time = start + i * 0.105;
			const length = i === phrase.length - 1 ? 0.16 : 0.085;
			const oscillator = ctx.createOscillator();
			oscillator.type = "sawtooth";
			const pitch = (kind === "lose" ? 148 : 205) * 2 ** (note / 12);
			oscillator.frequency.setValueAtTime(pitch, time);
			oscillator.frequency.exponentialRampToValueAtTime(
				pitch * (i % 2 ? 0.89 : 1.13),
				time + length,
			);
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0.0001, time);
			gain.gain.exponentialRampToValueAtTime(0.18, time + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
			const vowel = i % 4;
			const formantA = ctx.createBiquadFilter();
			formantA.type = "bandpass";
			formantA.frequency.value = [710, 420, 850, 310][vowel];
			formantA.Q.value = 3;
			const formantB = ctx.createBiquadFilter();
			formantB.type = "bandpass";
			formantB.frequency.value = [1220, 2050, 1650, 980][vowel];
			formantB.Q.value = 4;
			oscillator.connect(formantA);
			oscillator.connect(formantB);
			formantA.connect(gain);
			formantB.connect(gain);
			gain.connect(this.voiceBus);
			oscillator.start(time);
			this._track(oscillator, time + length + 0.01, [formantA, formantB, gain]);
		});
	}

	_musicNote(step, t) {
		// A jaunty little toy-armour march: brushed drums, plucked bass, and brass bleeps.
		const bus = this.musicBus;
		const bar = Math.floor(step / 8) % 4;
		const root = [130.81, 130.81, 155.56, 116.54][bar];
		const eighth = step % 8;
		const bassRatio = [1, 0, 1.5, 0, 1, 0, 2, 1.5][eighth];
		if (bassRatio) {
			this._tone(root * bassRatio * 0.5, t, 0.19, 0.34, "triangle", bus);
			this._tone(root * bassRatio, t, 0.12, 0.075, "square", bus);
		}
		if (step % 4 === 0) this._tone(130, t, 0.14, 0.45, "sine", bus, 37);
		if (step % 4 === 2) {
			this._noise(t, 0.105, 0.22, 1800, "bandpass", bus);
			this._tone(180, t, 0.06, 0.1, "triangle", bus, 90);
		}
		this._noise(t, 0.035, step % 2 ? 0.075 : 0.11, 6500, "highpass", bus);
		const melody = [
			12, 0, 7, 0, 10, 7, 5, 0, 12, 0, 15, 12, 7, 0, 5, 7, 12, 0, 7, 0, 10, 7,
			5, 0, 7, 5, 3, 0, 2, 3, 7, 0,
		];
		const note = melody[step % 32];
		if (note) {
			const freq = root * 2 ** (note / 12);
			this._tone(
				freq,
				t + 0.012,
				0.19,
				0.15,
				"triangle",
				bus,
				freq * 0.996,
				0.012,
			);
			this._tone(
				freq * 2,
				t + 0.012,
				0.15,
				0.028,
				"square",
				bus,
				freq * 2,
				0.012,
			);
		}
	}

	update(_dt, _state) {
		if (!this.ctx || !this.musicPlaying || this.ctx.state === "closed") return;
		const now = this.ctx.currentTime;
		if (this.nextNote < now - 0.3) this.nextNote = now + 0.01;
		while (this.nextNote < now + 0.15) {
			this._musicNote(this.musicStep++, this.nextNote);
			this.nextNote += 60 / 112 / 2;
		}
	}

	inspect() {
		let peak = 0;
		if (this.analyser) {
			const samples = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(samples);
			for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
		}
		return {
			context: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			musicPlaying: this.musicPlaying,
			musicStep: this.musicStep,
			voiceCount: this.voices,
			activeNodes: this.activeNodes,
			events: { ...this.events },
			peak,
		};
	}

	async dispose() {
		this.stopMusic();
		if (
			this.ctx &&
			this.ctx.state !== "closed" &&
			!("startRendering" in this.ctx)
		)
			await this.ctx.close();
	}
}

/* ComBop multiplayer adapter. AI Hub Session Protocol v1 + direct WebRTC. */
function createOnline(callbacks = {}) {
	const cb = {
		onStatus() {},
		onInput() {},
		onSnapshot() {},
		onPeer() {},
		onStart() {},
		onEnd() {},
		onTimeUp() {},
		...callbacks,
	};
	const state = {
		active: false,
		inHub: false,
		isHost: false,
		isServer: false,
		seat: -1,
		players: [],
		connected: false,
		started: false,
		ended: false,
		transport: "none",
		sent: 0,
		received: 0,
	};
	let pc = null;
	let channel = null;
	let generation = 0;
	let startedAt = 0;
	let resultSent = false;
	let lastInput = -Infinity;
	let lastSnapshot = -Infinity;
	let currentStatus = "Offline";
	let hubInfo = null;
	const liveIds = new Set();
	const subscriptions = [];

	const status = (text) => {
		currentStatus = text;
		cb.onStatus(text);
	};
	const info = () => ({
		...state,
		players: state.players.map((p) => ({ ...p })),
		delay: state.inHub ? Math.max(0, -globalThis.AIHub.time()) : 0,
	});
	const cleanInput = (input) => {
		if (!input || typeof input !== "object" || Array.isArray(input))
			return null;
		// The game owns its compact input schema; JSON size and finite numbers
		// are checked here so a malformed remote input cannot poison physics.
		const serialized = JSON.stringify(input);
		if (serialized.length > 1024) return null;
		const valid = (value, depth = 0) => {
			if (depth > 3) return false;
			if (typeof value === "number")
				return Number.isFinite(value) && Math.abs(value) <= 1e6;
			if (
				value === null ||
				typeof value === "boolean" ||
				typeof value === "string"
			)
				return typeof value !== "string" || value.length < 80;
			if (Array.isArray(value))
				return value.length <= 8 && value.every((v) => valid(v, depth + 1));
			return (
				typeof value === "object" &&
				Object.keys(value).length <= 16 &&
				Object.values(value).every((v) => valid(v, depth + 1))
			);
		};
		return valid(input) ? input : null;
	};

	function receive(data, from) {
		if (state.ended || !data || data.game !== "combop-1") return;
		state.received++;
		if (data.type === "input" && state.isHost) {
			const seat = state.inHub
				? state.players.findIndex((p) => p.id === from)
				: 1;
			const input = cleanInput(data.input);
			if (seat >= 0 && input && (!state.inHub || liveIds.has(from)))
				cb.onInput(input, seat);
		} else if (
			data.type === "snapshot" &&
			!state.isHost &&
			(!state.inHub || from === hubInfo.host)
		) {
			if (data.state && typeof data.state === "object")
				cb.onSnapshot(data.state);
		} else if (!state.inHub && data.type === "finish" && !state.isHost) {
			resultSent = true;
			cb.onEnd({ reason: "finished", scores: data.scores, standalone: true });
		}
	}

	function send(data, reliable = false) {
		if (!state.connected || state.ended || !state.started) return false;
		const packet = { game: "combop-1", ...data };
		let sent = false;
		if (state.inHub) {
			sent = globalThis.AIHub.send(packet, {
				...(state.isHost ? {} : { to: hubInfo.host }),
				reliable,
			});
		} else if (
			channel?.readyState === "open" &&
			channel.bufferedAmount < 128 * 1024
		) {
			const text = JSON.stringify(packet);
			if (text.length <= 16000) {
				channel.send(text);
				sent = true;
			}
		}
		if (sent) state.sent++;
		return sent;
	}

	function disconnect(reason = "disconnected") {
		if (state.ended || !state.active) return;
		const wasConnected = state.connected;
		state.connected = false;
		state.ended = true;
		status(reason === "left" ? "Connection closed" : "Opponent disconnected");
		if (wasConnected)
			cb.onPeer({
				joined: false,
				seat: state.isHost ? 1 : 0,
				name: state.isHost ? "Coral" : "Mint",
				reason,
			});
		cb.onEnd({ reason, standalone: !state.inHub });
	}

	async function connectHub() {
		const hub = globalThis.AIHub;
		if (!hub?.active) return null;
		state.active = state.inHub = true;
		state.transport = "ai-hub";
		subscriptions.push(hub.on("message", receive));
		subscriptions.push(
			hub.on("start", (event) => {
				state.started = state.connected = true;
				state.ended = false;
				startedAt = performance.now() + (event?.in || 0);
				status("AI Hub • connected");
				cb.onStart({ ...info(), delay: event?.in || 0 });
			}),
		);
		subscriptions.push(
			hub.on("leave", (event) => {
				liveIds.delete(event.id);
				const seat = state.players.findIndex((p) => p.id === event.id);
				cb.onPeer({
					joined: false,
					seat,
					name: state.players[seat]?.name || "Player",
					reason: event.reason,
				});
				status("AI Hub • player left");
			}),
		);
		subscriptions.push(hub.on("time-up", (event) => cb.onTimeUp(event)));
		subscriptions.push(
			hub.on("end", (event) => {
				state.ended = true;
				state.connected = false;
				status("AI Hub • round ended");
				cb.onEnd(event);
			}),
		);
		hubInfo = await hub.connect({ mode: "shared-world", seats: [2, 2] });
		if (!hubInfo) {
			state.active = state.inHub = false;
			state.transport = "none";
			subscriptions.splice(0).forEach((off) => {
				off();
			});
			return null;
		}
		state.isHost = hubInfo.isHost;
		state.isServer = !!hubInfo.server;
		state.players = hubInfo.players.map((p) => ({ ...p }));
		state.seat = state.players.findIndex((p) => p.id === hubInfo.me);
		state.players.forEach((p) => {
			liveIds.add(p.id);
		});
		status("AI Hub • waiting for the round");
		return { ...hubInfo, seat: state.seat };
	}

	function ready() {
		if (state.inHub && !state.ended) globalThis.AIHub.ready();
	}

	// Direct connections use one reliable ordered data channel. No game server
	// sees match data. A public STUN service discovers public addresses; no TURN
	// relay is available, so restrictive networks may need AI Hub instead.
	function newPeer(host) {
		if (globalThis.AIHub?.active)
			throw new Error("AI Hub owns network connections during sessions.");
		if (!globalThis.RTCPeerConnection)
			throw new Error("This browser does not support direct online play.");
		closePeer();
		generation++;
		const token = generation;
		resultSent = false;
		Object.assign(state, {
			active: true,
			inHub: false,
			isHost: host,
			isServer: false,
			seat: host ? 0 : 1,
			players: [
				{ id: 0, name: "Mint", color: "#84e6bf" },
				{ id: 1, name: "Coral", color: "#ff805b" },
			],
			connected: false,
			started: false,
			ended: false,
			transport: "webrtc",
			sent: 0,
			received: 0,
		});
		lastInput = lastSnapshot = -Infinity;
		pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
			iceCandidatePoolSize: 0,
		});
		pc.onconnectionstatechange = () => {
			if (generation !== token || !pc) return;
			if (["failed", "closed"].includes(pc.connectionState))
				disconnect("disconnected");
			if (pc.connectionState === "disconnected")
				status("Connection interrupted • attempting to reconnect");
			if (pc.connectionState === "connected" && state.connected)
				status("Direct online • connected");
		};
		const bind = (dc) => {
			channel = dc;
			channel.onopen = () => {
				if (generation !== token) return;
				state.connected = state.started = true;
				state.ended = false;
				startedAt = performance.now();
				status("Direct online • connected");
				cb.onPeer({
					joined: true,
					seat: host ? 1 : 0,
					name: host ? "Coral" : "Mint",
				});
				cb.onStart({ ...info(), delay: 0 });
			};
			channel.onmessage = (event) => {
				if (
					generation !== token ||
					typeof event.data !== "string" ||
					event.data.length > 16000
				)
					return;
				try {
					receive(JSON.parse(event.data), host ? 1 : 0);
				} catch {
					/* Ignore malformed packets. */
				}
			};
			channel.onclose = () => {
				if (generation === token) disconnect("disconnected");
			};
			channel.onerror = () => {
				if (generation === token)
					status("Connection error • create a new invitation");
			};
		};
		if (host) bind(pc.createDataChannel("combop", { ordered: true }));
		else pc.ondatachannel = (event) => bind(event.channel);
		return pc;
	}

	async function iceComplete(peer) {
		if (peer.iceGatheringState === "complete") return;
		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				peer.removeEventListener("icegatheringstatechange", done);
				// Local candidates are usable even if a STUN response timed out.
				resolve();
			}, 6000);
			function done() {
				if (peer.signalingState === "closed") {
					clearTimeout(timeout);
					peer.removeEventListener("icegatheringstatechange", done);
					reject(
						new Error("Connection was closed. Create another invitation."),
					);
				} else if (peer.iceGatheringState === "complete") {
					clearTimeout(timeout);
					peer.removeEventListener("icegatheringstatechange", done);
					resolve();
				}
			}
			peer.addEventListener("icegatheringstatechange", done);
		});
	}

	async function encode(description) {
		const raw = new TextEncoder().encode(
			JSON.stringify({ type: description.type, sdp: description.sdp }),
		);
		let data = raw;
		let prefix = "CB1";
		if (globalThis.CompressionStream) {
			data = new Uint8Array(
				await new Response(
					new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
				).arrayBuffer(),
			);
			prefix = "CBZ1";
		}
		return (
			prefix +
			"." +
			btoa(String.fromCharCode(...data))
				.replaceAll("+", "-")
				.replaceAll("/", "_")
				.replace(/=+$/, "")
		);
	}

	async function decode(code, expected) {
		const clean = String(code).trim().replace(/\s/g, "");
		if (clean.length > 20000)
			throw new Error("That code is too long. Paste only the ComBop code.");
		const match = /^(CBZ?1)\.([A-Za-z0-9_-]+)$/.exec(clean);
		if (!match)
			throw new Error("Paste a complete ComBop invitation or return code.");
		try {
			let bytes = Uint8Array.from(
				atob(match[2].replaceAll("-", "+").replaceAll("_", "/")),
				(c) => c.charCodeAt(0),
			);
			if (match[1] === "CBZ1") {
				if (!globalThis.DecompressionStream)
					throw new Error("Compression is unavailable.");
				bytes = new Uint8Array(
					await new Response(
						new Blob([bytes])
							.stream()
							.pipeThrough(new DecompressionStream("gzip")),
					).arrayBuffer(),
				);
			}
			if (bytes.length > 40000) throw new Error("Code too large.");
			const result = JSON.parse(new TextDecoder().decode(bytes));
			if (
				result.type !== expected ||
				typeof result.sdp !== "string" ||
				!result.sdp.startsWith("v=0")
			)
				throw new Error("Unexpected code type.");
			return result;
		} catch {
			throw new Error(
				expected === "offer"
					? "That is not an invitation code. Ask the host for a new one."
					: "That is not a return code. Paste the code your opponent sent back.",
			);
		}
	}

	async function host() {
		const peer = newPeer(true);
		status("Creating invitation…");
		await peer.setLocalDescription(await peer.createOffer());
		await iceComplete(peer);
		const code = await encode(peer.localDescription);
		status("Invitation ready • send it to your opponent");
		return code;
	}

	async function join(invite) {
		const offer = await decode(invite, "offer");
		const peer = newPeer(false);
		status("Creating return code…");
		await peer.setRemoteDescription(offer);
		await peer.setLocalDescription(await peer.createAnswer());
		await iceComplete(peer);
		const code = await encode(peer.localDescription);
		status("Return code ready • send it back to the host");
		return code;
	}

	async function accept(answer) {
		if (!pc || !state.isHost || pc.signalingState !== "have-local-offer")
			throw new Error("Create an invitation first.");
		const description = await decode(answer, "answer");
		status("Connecting to your opponent…");
		await pc.setRemoteDescription(description);
		// The data channel's open event starts the match on both peers.
	}

	function sendInput(input) {
		if (state.isHost) return false;
		const now = performance.now();
		if (now - lastInput < 55) return false;
		const cleaned = cleanInput(input);
		if (!cleaned) return false;
		lastInput = now;
		return send({ type: "input", input: cleaned });
	}

	function sendSnapshot(snapshot) {
		if (!state.isHost) return false;
		const now = performance.now();
		if (now - lastSnapshot < 55) return false;
		lastSnapshot = now;
		return send({ type: "snapshot", state: snapshot });
	}

	function finish(scores, stats) {
		if (!state.isHost || state.ended || resultSent) return false;
		const values = state.players.map((_p, i) =>
			Number.isFinite(Number(scores?.[i])) ? Number(scores[i]) : 0,
		);
		if (state.inHub) {
			const players = state.players.filter((p) => liveIds.has(p.id));
			players.sort(
				(a, b) =>
					values[state.players.indexOf(b)] - values[state.players.indexOf(a)],
			);
			const standings = [];
			for (const player of players) {
				const value = values[state.players.indexOf(player)];
				const previous = standings.at(-1);
				if (
					previous &&
					values[state.players.findIndex((p) => p.id === previous[0])] === value
				)
					previous.push(player.id);
				else standings.push([player.id]);
			}
			const byId = Object.fromEntries(
				state.players
					.filter((p) => liveIds.has(p.id))
					.map((p) => [p.id, values[state.players.indexOf(p)]]),
			);
			globalThis.AIHub.finish({
				standings,
				scores: byId,
				...(stats ? { stats } : {}),
			});
		} else send({ type: "finish", scores: values }, true);
		resultSent = true;
		return true;
	}

	function closePeer() {
		generation++;
		if (channel) {
			channel.onclose = null;
			channel.onerror = null;
			channel.onmessage = null;
			channel.onopen = null;
			channel.close();
		}
		if (pc) {
			pc.onconnectionstatechange = null;
			pc.ondatachannel = null;
			pc.close();
		}
		pc = channel = null;
	}

	function leave() {
		// A hub round controls its own lifetime; an in-game Quit never leaves it.
		if (state.inHub) return false;
		const wasActive = state.active;
		if (wasActive) disconnect("left");
		closePeer();
		Object.assign(state, {
			active: false,
			connected: false,
			started: false,
			transport: "none",
		});
		status("Offline");
		return true;
	}

	const api = {
		connectHub,
		ready,
		host,
		join,
		accept,
		sendInput,
		sendSnapshot,
		finish,
		leave,
		time: () =>
			state.inHub
				? globalThis.AIHub.time()
				: state.started
					? performance.now() - startedAt
					: -Infinity,
		inspect: () => ({
			...info(),
			status: currentStatus,
			resultSent,
			peerState: pc?.connectionState || "none",
			channelState: channel?.readyState || "none",
		}),
	};
	for (const key of [
		"active",
		"inHub",
		"isHost",
		"isServer",
		"seat",
		"players",
		"connected",
		"started",
		"ended",
	])
		Object.defineProperty(api, key, { get: () => state[key] });
	return api;
}

const MAPS = [
	{
		name: "Bankshot boogie",
		short: "THE RICOCHET RANGE",
		rule: "Two bounces. Endless possibilities.",
		floor: 0xe3d8b6,
		accent: 0x148b83,
		walls: [
			[-6, -1, 1, 6],
			[6, 1, 1, 6],
			[0, 0, 5, 1],
			[-9, -5, 4, 1],
			[9, 5, 4, 1],
		],
		crates: [
			[-3, 4],
			[3, -4],
			[-10, 1],
			[10, -1],
		],
		barrels: [
			[-6, 5],
			[6, -5],
		],
		pickup: [0, 4.8],
	},
	{
		name: "Ghost shift",
		short: "THE VANISHING GARDEN",
		rule: "Keep an eye on the dust. Firing reveals a tank.",
		floor: 0xcddac0,
		accent: 0x3b7f74,
		walls: [
			[-7, 0, 1, 7],
			[7, 0, 1, 7],
			[0, -4, 7, 1],
			[0, 4, 7, 1],
			[-2, 0, 1.4, 1.4],
			[2, 0, 1.4, 1.4],
		],
		crates: [
			[-10, -4],
			[10, 4],
			[-3, -6],
			[3, 6],
		],
		barrels: [
			[-10, 0],
			[10, 0],
		],
		pickup: [0, 0],
	},
	{
		name: "Double time",
		short: "THE HOT LITTLE FINALE",
		rule: "Grab the lightning. Make a little noise.",
		floor: 0xe4cda9,
		accent: 0xbe7350,
		walls: [
			[-6, -3, 5, 1],
			[6, 3, 5, 1],
			[-4, 4, 1, 4],
			[4, -4, 1, 4],
			[0, 0, 2, 2],
		],
		crates: [
			[-8, 2],
			[8, -2],
			[-1, -5],
			[1, 5],
			[-9, -3],
			[9, 3],
		],
		barrels: [
			[-6, 0],
			[6, 0],
			[0, -6],
			[0, 6],
		],
		pickup: [0, 3],
	},
];
const DEFAULTS = {
	speed: 5.2,
	shellSpeed: 16,
	reload: 0.9,
	ai: 0.78,
	ricochets: 2,
	damage: 1,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
class Simulation {
	static async init() {
		await RAPIER.init();
	}
	constructor(emit) {
		this.emit = emit;
		this.balance = { ...DEFAULTS };
		this.god = false;
		this.metrics = {
			shots: 0,
			bounces: 0,
			hits: 0,
			kills: 0,
			dashes: 0,
			pickups: 0,
			frames: 0,
			bankshots: 0,
		};
		this.round = 0;
		this.mode = "solo";
		this.inputs = [null, null];
		this.reset(0, "solo");
	}
	reset(round = 0, mode = "solo", keepMetrics = false) {
		if (this.world) this.world.free();
		if (this.queue) this.queue.free();
		this.round = round;
		this.mode = mode;
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.queue = new RAPIER.EventQueue(true);
		this.colliderMap = new Map();
		this.bullets = [];
		this.obstacles = [];
		this.pickups = [];
		this.time = 90;
		this.elapsed = 0;
		this.scores = [0, 0];
		this.ended = false;
		this.winner = -1;
		this.sudden = false;
		this.zone = 17;
		this.pickTimer = 7;
		this.repairTimer = 11;
		this.aiClock = [0, 0];
		this.paths = [[], []];
		this.aiGoals = [null, null];
		this.inputs = [null, null];
		this.hazard = [0, 0];
		if (!keepMetrics)
			this.metrics = {
				shots: 0,
				bounces: 0,
				hits: 0,
				kills: 0,
				dashes: 0,
				pickups: 0,
				frames: 0,
				bankshots: 0,
			};
		const box = (x, z, w, d, type = "wall", id = 0) => {
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.62, z),
			);
			const col = this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(w / 2, 0.85, d / 2)
					.setFriction(0)
					.setRestitution(1)
					.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
					.setCollisionGroups(0x00010006)
					.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
				body,
			);
			const o = {
				x,
				z,
				w,
				d,
				type,
				id,
				hp: type === "crate" ? 3 : type === "barrel" ? 1 : 999,
				body,
				col,
			};
			this.colliderMap.set(col.handle, o);
			this.obstacles.push(o);
			return o;
		};
		box(-14.3, 0, 0.6, 19.2, "boundary");
		box(14.3, 0, 0.6, 19.2, "boundary");
		box(0, -9.3, 28, 0.6, "boundary");
		box(0, 9.3, 28, 0.6, "boundary");
		let id = 0;
		for (const [x, z, w, d] of MAPS[round].walls) box(x, z, w, d, "wall", id++);
		for (const [x, z] of MAPS[round].crates) box(x, z, 1.3, 1.3, "crate", id++);
		for (const [x, z] of MAPS[round].barrels)
			box(x, z, 0.7, 0.7, "barrel", id++);
		this.tanks = [0, 1].map((i) => {
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(i ? 10 : -10, 0.55, i ? -5 : 5)
					.enabledTranslations(true, false, true)
					.lockRotations()
					.setLinearDamping(0)
					.setCanSleep(false),
			);
			const col = this.world.createCollider(
				RAPIER.ColliderDesc.cylinder(0.43, 0.61)
					.setDensity(10)
					.setFriction(0)
					.setRestitution(0)
					.setCollisionGroups(0x00020007)
					.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
				body,
			);
			const t = {
				id: i,
				type: "tank",
				body,
				col,
				x: i ? 10 : -10,
				z: i ? -5 : 5,
				hp: 3,
				angle: i ? -Math.PI / 2 : Math.PI / 2,
				aim: i ? -Math.PI / 2 : Math.PI / 2,
				ammo: 3,
				reload: 0,
				cooldown: 0,
				dash: 0,
				dashing: 0,
				dx: 0,
				dz: 0,
				shield: 1.8,
				dead: 0,
				cloak: 0,
				reveal: 2,
				overdrive: 0,
				moving: 0,
			};
			this.colliderMap.set(col.handle, t);
			return t;
		});
	}
	input(i, v) {
		this.inputs[i] = v;
	}
	lineBlocked(ax, az, bx, bz, pad = 0.25) {
		for (const o of this.obstacles) {
			if (o.hp <= 0) continue;
			if (o.type === "boundary") continue;
			const dx = bx - ax,
				dz = bz - az;
			let lo = 0,
				hi = 1;
			for (const [a, d, mn, mx] of [
				[ax, dx, o.x - o.w / 2 - pad, o.x + o.w / 2 + pad],
				[az, dz, o.z - o.d / 2 - pad, o.z + o.d / 2 + pad],
			]) {
				if (Math.abs(d) < 1e-5) {
					if (a < mn || a > mx) {
						lo = 2;
						break;
					}
				} else {
					const u = (mn - a) / d,
						v = (mx - a) / d;
					lo = Math.max(lo, Math.min(u, v));
					hi = Math.min(hi, Math.max(u, v));
				}
			}
			if (lo <= hi && lo < 1 && hi > 0) return true;
		}
		return false;
	}
	pathTo(t, tx, tz) {
		const step = 1.35;
		const nx = 20,
			nz = 12;
		const pos = (x, z) => [
			clamp(Math.round((x + 12.8) / step), 0, nx - 1),
			clamp(Math.round((z + 7.6) / step), 0, nz - 1),
		];
		const [sx, sz] = pos(t.x, t.z),
			[ex, ez] = pos(tx, tz);
		const key = (x, z) => z * nx + x;
		const start = key(sx, sz),
			end = key(ex, ez),
			q = [start],
			prev = new Map([[start, -1]]);
		let dest = start,
			best = 1e9;
		for (let h = 0; h < q.length; h++) {
			const v = q[h],
				x = v % nx,
				z = Math.floor(v / nx),
				d = (x - ex) ** 2 + (z - ez) ** 2;
			if (d < best) {
				best = d;
				dest = v;
			}
			if (v === end) break;
			for (const [dx, dz] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			]) {
				const xx = x + dx,
					zz = z + dz,
					k = key(xx, zz);
				if (xx < 0 || xx >= nx || zz < 0 || zz >= nz || prev.has(k)) continue;
				const wx = xx * step - 12.8,
					wz = zz * step - 7.6;
				if (
					this.obstacles.some(
						(o) =>
							o.hp > 0 &&
							Math.abs(wx - o.x) < o.w / 2 + 0.72 &&
							Math.abs(wz - o.z) < o.d / 2 + 0.72,
					)
				)
					continue;
				prev.set(k, v);
				q.push(k);
			}
		}
		const path = [];
		for (let v = dest; v !== start && v !== -1; v = prev.get(v) ?? -1)
			path.push({
				x: (v % nx) * step - 12.8,
				z: Math.floor(v / nx) * step - 7.6,
			});
		return path.reverse();
	}
	ai(i, dt) {
		const t = this.tanks[i],
			p = this.tanks[1 - i];
		this.aiClock[i] -= dt;
		const dx = p.x - t.x,
			dz = p.z - t.z,
			dist = Math.hypot(dx, dz);
		let mx = 0,
			mz = 0;
		const blocked = this.lineBlocked(t.x, t.z, p.x, p.z, 0.65);
		if (this.aiClock[i] <= 0) {
			this.aiClock[i] = 0.6;
			this.paths[i] = blocked ? this.pathTo(t, p.x, p.z) : [];
		}
		if (blocked && this.paths[i].length) {
			let g = this.paths[i][0];
			if (Math.hypot(g.x - t.x, g.z - t.z) < 0.7) {
				this.paths[i].shift();
				g = this.paths[i][0] || g;
			}
			mx = g.x - t.x;
			mz = g.z - t.z;
		} else {
			const side = Math.sin(this.elapsed * 0.65 + i * 3) > 0 ? 1 : -1;
			mx = dx * (dist > 7 ? 1 : dist < 4 ? -1 : 0.04) + dz * 0.45 * side;
			mz = dz * (dist > 7 ? 1 : dist < 4 ? -1 : 0.04) - dx * 0.45 * side;
		}
		const len = Math.hypot(mx, mz) || 1;
		mx /= len;
		mz /= len;
		const margin = 1.2;
		if (Math.abs(t.x) > 12.4) mx -= Math.sign(t.x) * margin;
		if (Math.abs(t.z) > 7.6) mz -= Math.sign(t.z) * margin;
		let aim = Math.atan2(dx, dz),
			fire = !blocked && dist < 21; // Try a deliberate bank off the outer rim when the direct lane is blocked.
		if (blocked) {
			const candidates = [
				Math.atan2(28 - p.x - t.x, dz),
				Math.atan2(-28 - p.x - t.x, dz),
				Math.atan2(dx, 18 - p.z - t.z),
				Math.atan2(dx, -18 - p.z - t.z),
			];
			for (const a of candidates) {
				const path = this.trace(t.x, t.z, Math.sin(a), Math.cos(a), 2, 48);
				if (
					path.some(
						(s) => pointSegment(p.x, p.z, s.x1, s.z1, s.x2, s.z2) < 0.65,
					)
				) {
					aim = a;
					fire = true;
					break;
				}
			}
		}
		aim += Math.sin(this.elapsed * 1.8 + i) * (0.11 * (1 - this.balance.ai));
		const dangerous = this.bullets.some(
			(b) => b.owner !== i && Math.hypot(b.x - t.x, b.z - t.z) < 3,
		);
		return {
			mx: mx * this.balance.ai,
			mz: mz * this.balance.ai,
			ax: Math.sin(aim),
			az: Math.cos(aim),
			fire: fire && p.dead <= 0 && t.shield < 1,
			dash: dangerous && t.dash <= 0,
		};
	}
	trace(x, z, dx, dz, bounces = this.balance.ricochets, length = 32) {
		const lines = [];
		let px = x,
			pz = z,
			remain = length;
		for (let b = 0; b <= bounces; b++) {
			let near = remain,
				nx = 0,
				nz = 0,
				hit = null;
			for (const o of this.obstacles) {
				if (o.hp <= 0) continue;
				let lo = -Infinity,
					hi = Infinity,
					hx = 0,
					hz = 0;
				for (const [a, d, mn, mx, xx, zz] of [
					[px, dx, o.x - o.w / 2, o.x + o.w / 2, 1, 0],
					[pz, dz, o.z - o.d / 2, o.z + o.d / 2, 0, 1],
				]) {
					if (Math.abs(d) < 1e-7) {
						if (a < mn || a > mx) {
							lo = Infinity;
							break;
						}
					} else {
						const a1 = (mn - a) / d,
							a2 = (mx - a) / d;
						if (Math.min(a1, a2) > lo) {
							lo = Math.min(a1, a2);
							hx = xx;
							hz = zz;
						}
						hi = Math.min(hi, Math.max(a1, a2));
					}
				}
				if (lo <= hi && lo > 0.03 && lo < near) {
					near = lo;
					nx = hx;
					nz = hz;
					hit = o;
				}
			}
			lines.push({
				x1: px,
				z1: pz,
				x2: px + dx * near,
				z2: pz + dz * near,
				hit: !!hit,
				object: hit,
			});
			if (!hit || hit.type === "crate" || hit.type === "barrel") break;
			remain -= near;
			if (nx) dx = -dx;
			if (nz) dz = -dz;
			px += lines.at(-1).x2 - px + dx * 0.03;
			pz += lines.at(-1).z2 - pz + dz * 0.03;
		}
		return lines;
	}
	fire(t) {
		if (t.dead > 0 || t.cooldown > 0 || t.ammo < 1) return false;
		const dx = Math.sin(t.aim),
			dz = Math.cos(t.aim);
		t.ammo--;
		t.cooldown = t.overdrive > 0 ? 0.16 : 0.3;
		t.reveal = 1.7;
		this.metrics.shots++;
		this.emit("shoot", { tank: t.id, x: t.x, z: t.z });
		const muzzle = this.trace(t.x, t.z, dx, dz, 0, 1.35)[0];
		if (muzzle.hit) {
			const o = muzzle.object;
			if (o.type === "barrel") this.explodeBarrel(o);
			else if (o.type === "crate") {
				o.hp--;
				this.emit("chip", { x: o.x, z: o.z });
				if (o.hp <= 0) {
					this.world.removeRigidBody(o.body);
					this.colliderMap.delete(o.col.handle);
					this.emit("cover", { x: o.x, z: o.z });
				}
			} else {
				this.metrics.bounces++;
				this.emit("bounce", { x: muzzle.x2, z: muzzle.z2 });
			}
			return true;
		}
		this.spawnShot(t.id, { x: t.x + dx * 1.2, z: t.z + dz * 1.2, dx, dz });
		return true;
	}
	spawnShot(owner, { x, z, dx, dz }) {
		const mag = Math.hypot(dx, dz) || 1,
			speed = this.balance.shellSpeed;
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, 0.59, z)
				.enabledTranslations(true, false, true)
				.setLinvel((dx / mag) * speed, 0, (dz / mag) * speed)
				.setCcdEnabled(true)
				.setGravityScale(0)
				.setCanSleep(false),
		);
		const col = this.world.createCollider(
			RAPIER.ColliderDesc.ball(0.13)
				.setDensity(0.02)
				.setFriction(0)
				.setRestitution(1)
				.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
				.setCollisionGroups(0x00040003)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
			body,
		);
		const b = {
			type: "bullet",
			body,
			col,
			id: col.handle,
			owner,
			x,
			z,
			dx: dx / mag,
			dz: dz / mag,
			age: 0,
			bounces: 0,
			remove: false,
			lastBounce: -1,
		};
		this.colliderMap.set(col.handle, b);
		this.bullets.push(b);
		return b;
	}
	damage(i, n = 1, source = {}) {
		const t = this.tanks[i];
		if (t.dead > 0 || t.shield > 0 || (this.god && i === 0)) return false;
		t.hp -= n;
		t.reveal = 2;
		this.metrics.hits++;
		this.emit("hit", { tank: i, x: t.x, z: t.z, bank: source.bounces > 0 });
		if (t.hp <= 0) {
			this.award(1 - i, source);
		}
		return true;
	}
	award(i, source = {}) {
		if (this.ended) return;
		const dead = this.tanks[1 - i];
		dead.hp = 0;
		dead.dead = 1.65;
		dead.body.setEnabled(false);
		this.scores[i]++;
		this.metrics.kills++;
		if (source.bounces > 0) this.metrics.bankshots++;
		this.emit("explode", {
			tank: 1 - i,
			x: dead.x,
			z: dead.z,
			bank: source.bounces > 0,
		});
		if (this.scores[i] >= 3 && this.mode !== "attract") {
			this.ended = true;
			this.winner = i;
			this.emit("roundover", { winner: i, scores: [...this.scores] });
		}
	}
	respawn(t) {
		t.dead = 0;
		t.hp = 3;
		t.ammo = 3;
		t.dash = 0;
		t.cloak = 0;
		t.reveal = 1.8;
		t.shield = 1.8;
		t.overdrive = 0;
		t.x = t.id ? 10 : -10;
		t.z = t.id ? -5 : 5;
		t.body.setTranslation({ x: t.x, y: 0.55, z: t.z }, true);
		t.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		t.body.setEnabled(true);
		this.emit("respawn", { tank: t.id, x: t.x, z: t.z });
	}
	spawnPickup(type, x, z) {
		const p = { id: Math.random().toString(36).slice(2), type, x, z, age: 0 };
		this.pickups.push(p);
		return p;
	}
	explodeBarrel(o) {
		o.hp = 0;
		this.world.removeRigidBody(o.body);
		this.colliderMap.delete(o.col.handle);
		this.emit("barrel", { x: o.x, z: o.z });
		for (const t of this.tanks) {
			if (Math.hypot(t.x - o.x, t.z - o.z) < 3) this.damage(t.id, 2);
		}
		for (const c of this.obstacles)
			if (
				c.type === "crate" &&
				c.hp > 0 &&
				Math.hypot(c.x - o.x, c.z - o.z) < 2.8
			) {
				c.hp = 0;
				this.world.removeRigidBody(c.body);
				this.emit("cover", { x: c.x, z: c.z });
			}
	}
	step(dt = 1 / 60) {
		if (this.ended) return;
		dt = 1 / 60;
		this.elapsed += dt;
		this.time = Math.max(0, this.time - dt);
		this.metrics.frames++;
		if (this.time <= 0 && !this.sudden) {
			this.sudden = true;
			for (const t of this.tanks) {
				t.hp = Math.min(t.hp, 1);
				t.shield = 0;
			}
			this.emit("sudden", {});
		}
		if (this.sudden) this.zone = Math.max(2, this.zone - dt * 0.32);
		for (let i = 0; i < 2; i++) {
			const t = this.tanks[i];
			if (t.dead > 0) {
				t.dead -= dt;
				if (t.dead <= 0) this.respawn(t);
				continue;
			}
			t.shield = Math.max(0, t.shield - dt);
			t.reveal = Math.max(0, t.reveal - dt);
			t.overdrive = Math.max(0, t.overdrive - dt);
			t.cloak = this.round === 1 && t.reveal <= 0 ? 1 : 0;
			t.dash = Math.max(0, t.dash - dt);
			t.cooldown = Math.max(0, t.cooldown - dt);
			if (t.ammo < 3) {
				t.reload += dt;
				if (t.reload > this.balance.reload * (t.overdrive > 0 ? 0.45 : 1)) {
					t.ammo++;
					t.reload = 0;
				}
			} else t.reload = 0;
			const v =
				this.inputs[i] ||
				((this.mode === "solo" && i === 1) || this.mode === "attract"
					? this.ai(i, dt)
					: {});
			let mx = v.mx || 0,
				mz = v.mz || 0;
			const len = Math.hypot(mx, mz);
			if (len > 1) {
				mx /= len;
				mz /= len;
			}
			if (Math.hypot(v.ax || 0, v.az || 0) > 0.1)
				t.aim = Math.atan2(v.ax, v.az);
			if (len > 0.08) {
				const dest = Math.atan2(mx, mz);
				const diff = ((dest - t.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
				t.angle += diff * Math.min(1, dt * 12);
			}
			t.moving = len;
			if (v.dash && t.dash <= 0) {
				t.dash = 3;
				t.dashing = 0.18;
				t.dx = len > 0.1 ? mx : Math.sin(t.angle);
				t.dz = len > 0.1 ? mz : Math.cos(t.angle);
				this.metrics.dashes++;
				this.emit("dash", { tank: i, x: t.x, z: t.z });
			}
			let vx = mx * this.balance.speed,
				vz = mz * this.balance.speed;
			if (t.dashing > 0) {
				t.dashing -= dt;
				vx = t.dx * 15;
				vz = t.dz * 15;
			}
			t.body.setLinvel({ x: vx, y: 0, z: vz }, true);
			if (v.fire) this.fire(t);
			if (
				this.sudden &&
				(Math.abs(t.x) > this.zone || Math.abs(t.z) > this.zone * 0.64)
			) {
				this.hazard[i] += dt;
				if (this.hazard[i] > 1) {
					this.hazard[i] = 0;
					this.damage(i, 1);
				}
			} else this.hazard[i] = 0;
		}
		this.world.step(this.queue);
		for (const t of this.tanks) {
			const p = t.body.translation();
			t.x = p.x;
			t.z = p.z;
		}
		const contacts = [];
		this.queue.drainCollisionEvents((a, b, started) => {
			if (started) contacts.push([a, b]);
		});
		for (const [a, b] of contacts) {
			const aa = this.colliderMap.get(a),
				bb = this.colliderMap.get(b);
			if (!aa || !bb) continue;
			const shot = aa.type === "bullet" ? aa : bb.type === "bullet" ? bb : null,
				other = shot === aa ? bb : aa;
			if (!shot || shot.remove) continue;
			if (other.type === "tank") {
				if (other.id === shot.owner && shot.age < 0.15) continue;
				if (other.dead > 0) continue;
				this.damage(other.id, this.balance.damage, shot);
				shot.remove = true;
			} else if (other.hp > 0) {
				if (other.type === "barrel") {
					this.explodeBarrel(other);
					shot.remove = true;
				} else if (other.type === "crate") {
					other.hp--;
					shot.remove = true;
					this.emit("chip", { x: other.x, z: other.z });
					if (other.hp <= 0) {
						this.world.removeRigidBody(other.body);
						this.colliderMap.delete(other.col.handle);
						this.emit("cover", { x: other.x, z: other.z });
					}
				} else if (this.elapsed - shot.lastBounce > 0.045) {
					shot.lastBounce = this.elapsed;
					shot.bounces++;
					this.metrics.bounces++;
					this.emit("bounce", { x: shot.x, z: shot.z });
					if (shot.bounces > this.balance.ricochets) shot.remove = true;
				}
			}
		}
		for (const b of this.bullets) {
			b.age += dt;
			const p = b.body.translation(),
				v = b.body.linvel();
			b.x = p.x;
			b.z = p.z;
			const len = Math.hypot(v.x, v.z);
			if (len > 0 && !b.remove) {
				b.dx = v.x / len;
				b.dz = v.z / len;
				b.body.setLinvel(
					{
						x: b.dx * this.balance.shellSpeed,
						y: 0,
						z: b.dz * this.balance.shellSpeed,
					},
					true,
				);
			}
			if (b.age > 5 || Math.abs(b.x) > 16 || Math.abs(b.z) > 11)
				b.remove = true;
		}
		for (let j = this.bullets.length - 1; j >= 0; j--)
			if (this.bullets[j].remove) {
				const b = this.bullets[j];
				this.colliderMap.delete(b.col.handle);
				this.world.removeRigidBody(b.body);
				this.bullets.splice(j, 1);
			}
		this.pickTimer -= dt;
		this.repairTimer -= dt;
		if (this.pickTimer < 0) {
			this.pickTimer = 12;
			if (!this.pickups.some((p) => p.type === "overdrive"))
				this.spawnPickup("overdrive", ...MAPS[this.round].pickup);
		}
		if (this.repairTimer < 0) {
			this.repairTimer = 16;
			if (!this.pickups.some((p) => p.type === "repair"))
				this.spawnPickup("repair", this.elapsed % 32 < 16 ? -11 : 11, 0);
		}
		for (let j = this.pickups.length - 1; j >= 0; j--) {
			const p = this.pickups[j];
			p.age += dt;
			let taken = false;
			for (const t of this.tanks) {
				if (t.dead > 0) continue;
				if (Math.hypot(t.x - p.x, t.z - p.z) < 1) {
					if (p.type === "repair") {
						t.hp = Math.min(3, t.hp + 1);
					} else {
						t.overdrive = 7;
						t.ammo = 3;
					}
					this.metrics.pickups++;
					this.emit("pickup", { tank: t.id, type: p.type, x: p.x, z: p.z });
					taken = true;
					break;
				}
			}
			if (taken || p.age > 18) this.pickups.splice(j, 1);
		}
	}
	snapshot() {
		return {
			round: this.round,
			mode: this.mode,
			time: this.time,
			elapsed: this.elapsed,
			scores: [...this.scores],
			ended: this.ended,
			winner: this.winner,
			sudden: this.sudden,
			zone: this.zone,
			tanks: this.tanks.map((t) => ({
				id: t.id,
				x: t.x,
				z: t.z,
				hp: t.hp,
				angle: t.angle,
				aim: t.aim,
				ammo: t.ammo,
				reload: t.reload,
				cooldown: t.cooldown,
				dash: t.dash,
				dashing: t.dashing,
				shield: t.shield,
				dead: t.dead,
				cloak: t.cloak,
				reveal: t.reveal,
				overdrive: t.overdrive,
				moving: t.moving,
			})),
			bullets: this.bullets.map((b) => ({
				id: b.id,
				x: b.x,
				z: b.z,
				dx: b.dx,
				dz: b.dz,
				owner: b.owner,
				bounces: b.bounces,
			})),
			obstacles: this.obstacles.map((o) => ({
				id: o.id,
				type: o.type,
				hp: o.hp,
			})),
			pickups: this.pickups.map((p) => ({ ...p })),
			metrics: { ...this.metrics },
		};
	}
	setTank(i, v) {
		const t = this.tanks[i];
		Object.assign(t, v);
		if (v.x !== undefined || v.z !== undefined)
			t.body.setTranslation({ x: t.x, y: 0.55, z: t.z }, true);
		if (v.hp > 0 && t.dead > 0) {
			t.dead = 0;
			t.body.setEnabled(true);
		}
	}
}
function pointSegment(x, z, ax, az, bx, bz) {
	const dx = bx - ax,
		dz = bz - az,
		k = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
	return Math.hypot(x - ax - dx * k, z - az - dz * k);
}


const INK = 0x193b3c,
	CREAM = 0xf4eedc,
	TEAL = 0x148f89,
	CORAL = 0xec6847;
const rand = (a, b) => a + Math.random() * (b - a);
class GameView {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(CREAM);
		this.scene.fog = new THREE.Fog(CREAM, 58, 105);
		this.camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 150);
		this.renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			powerPreference: "high-performance",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.NoToneMapping;
		this.materials = new Map();
		this.gradient = new THREE.DataTexture(
			new Uint8Array([72, 72, 72, 255, 170, 170, 170, 255, 255, 255, 255, 255]),
			3,
			1,
			THREE.RGBAFormat,
		);
		this.gradient.minFilter = this.gradient.magFilter = THREE.NearestFilter;
		this.gradient.needsUpdate = true;
		this.scene.add(new THREE.AmbientLight(0xfff8df, 1.2));
		const sun = new THREE.DirectionalLight(0xfff7dd, 1.6);
		sun.position.set(-10, 24, 10);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		Object.assign(sun.shadow.camera, {
			left: -25,
			right: 25,
			top: 25,
			bottom: -25,
			near: 1,
			far: 65,
		});
		sun.shadow.bias = -0.001;
		sun.shadow.normalBias = 0.03;
		this.scene.add(sun);
		this.scene.add(new THREE.HemisphereLight(0xa3e7df, 0xaea377, 0.45));
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.effects = [];
		this.bulletMeshes = new Map();
		this.pickMeshes = new Map();
		this.elapsed = 0;
		this.shake = 0;
		this.title = true;
		this.raycaster = new THREE.Raycaster();
		this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.55);
		this.aimLines = [];
		this.aimMaterial = new THREE.LineDashedMaterial({
			color: 0x365f58,
			dashSize: 0.22,
			gapSize: 0.16,
			transparent: true,
			opacity: 0.5,
		});
		this.bankMaterial = new THREE.LineDashedMaterial({
			color: 0xd99a37,
			dashSize: 0.22,
			gapSize: 0.16,
			transparent: true,
			opacity: 0.5,
		});
		this.aimRingMaterial = new THREE.MeshBasicMaterial({
			color: 0xd18f31,
			side: THREE.DoubleSide,
		});
		this.makeBackground();
		this.resize();
		window.addEventListener("resize", () => this.resize());
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL2 fallback";
		return this;
	}
	mat(color, transparent = false) {
		const key = `${color}/${transparent}`;
		if (!this.materials.has(key))
			this.materials.set(
				key,
				new THREE.MeshToonMaterial({
					color,
					gradientMap: this.gradient,
					transparent,
					opacity: 1,
				}),
			);
		return this.materials.get(key);
	}
	mesh(geo, color, parent, x = 0, y = 0, z = 0, outline = true) {
		const m = new THREE.Mesh(geo, this.mat(color));
		m.position.set(x, y, z);
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		if (outline) {
			const edge = new THREE.LineSegments(
				new THREE.EdgesGeometry(geo, 28),
				new THREE.LineBasicMaterial({ color: INK }),
			);
			m.add(edge);
		}
		return m;
	}
	box(w, h, d, color, parent, x = 0, y = 0, z = 0, outline = true) {
		return this.mesh(
			new THREE.BoxGeometry(w, h, d),
			color,
			parent,
			x,
			y,
			z,
			outline,
		);
	}
	cylinder(r, h, color, parent, x = 0, y = 0, z = 0, sides = 12) {
		return this.mesh(
			new THREE.CylinderGeometry(r, r, h, sides),
			color,
			parent,
			x,
			y,
			z,
		);
	}
	line(points, color = INK, parent = this.root) {
		const g = new THREE.BufferGeometry().setFromPoints(
			points.map((p) => new THREE.Vector3(...p)),
		);
		const l = new THREE.Line(
			g,
			new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }),
		);
		parent.add(l);
		return l;
	}
	label(text, w, h, color = INK, bg = null, size = 100) {
		const c = document.createElement("canvas");
		c.width = 1024;
		c.height = 256;
		const ctx = c.getContext("2d");
		if (bg) {
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, 1024, 256);
		}
		ctx.fillStyle = "#" + new THREE.Color(color).getHexString();
		ctx.font = `900 ${size}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, 512, 128);
		const texture = new THREE.CanvasTexture(c);
		texture.colorSpace = THREE.SRGBColorSpace;
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				depthWrite: false,
			}),
		);
		m.rotation.x = -Math.PI / 2;
		return m;
	}
	makeBackground() {
		const bg = new THREE.Group();
		this.scene.add(bg);
		for (let i = -6; i <= 6; i++) {
			const pts = [];
			for (let j = 0; j < 100; j++) {
				const a = (j / 99) * Math.PI * 2;
				const r = 25 + i * 2 + Math.sin(a * 3 + i) * 1.2;
				pts.push([Math.cos(a) * r, -1.6, Math.sin(a) * r * 0.7]);
			}
			this.line(pts, 0xb2c2ad, bg);
		}
		for (let i = 0; i < 12; i++) {
			const x = -36 + i * 6;
			this.line(
				[
					[x, -1.7, -35],
					[x, -1.7, 35],
				],
				0xdcdac4,
				bg,
			);
		}
		this.bg = bg;
	}
	build(round = 0) {
		if (this.level) {
			this.root.remove(this.level);
			this.level.traverse((o) => {
				if (o.geometry) o.geometry.dispose();
			});
		}
		for (const b of this.bulletMeshes.values()) this.root.remove(b);
		for (const p of this.pickMeshes.values()) this.root.remove(p);
		this.bulletMeshes.clear();
		this.pickMeshes.clear();
		for (const fx of this.effects) this.root.remove(fx.mesh);
		this.effects = [];
		this.round = round;
		this.level = new THREE.Group();
		this.root.add(this.level);
		const map = MAPS[round];
		this.box(31, 1, 21, INK, this.level, 0, -0.82, 0);
		this.box(31.2, 0.45, 21.2, 0xc0b99b, this.level, 0, -0.4, 0);
		this.box(30.8, 0.23, 20.8, CREAM, this.level, 0, -0.12, 0);
		this.box(28, 0.07, 18, map.floor, this.level, 0, 0.025, 0);
		this.box(28, 0.03, 0.055, 0xbaa981, this.level, 0, 0.08, 0, false);
		for (let x = -12; x < 14; x += 2)
			for (let z = -8; z < 9; z += 2)
				this.cylinder(0.018, 0.02, 0xa9a383, this.level, x, 0.075, z, 5);
		for (const x of [-13.45, 13.45])
			for (const z of [-8.45, 8.45]) {
				this.line(
					[
						[x - Math.sign(x) * 1, 0.09, z],
						[x, 0.09, z],
						[x, 0.09, z - Math.sign(z) * 1],
					],
					0x7e8c73,
					this.level,
				);
			}
		const t = this.label(map.short, 13, 0.8, INK);
		t.position.set(0, 0.04, 10);
		this.level.add(t);
		const t2 = this.label(
			"COMBOP  /  " + String(round + 1).padStart(2, "0") + "  /  INK & ARMOUR",
			10,
			0.65,
			INK,
		);
		t2.position.set(0, 0.045, -10);
		this.level.add(t2);
		this.obstacleMeshes = [];
		const entries = [
			[-14.3, 0, 0.6, 19.2, "boundary"],
			[14.3, 0, 0.6, 19.2, "boundary"],
			[0, -9.3, 28, 0.6, "boundary"],
			[0, 9.3, 28, 0.6, "boundary"],
			...map.walls.map((w) => [...w, "wall"]),
			...map.crates.map(([x, z]) => [x, z, 1.3, 1.3, "crate"]),
			...map.barrels.map(([x, z]) => [x, z, 0.7, 0.7, "barrel"]),
		];
		for (const [x, z, w, d, type] of entries) {
			const g = new THREE.Group();
			g.position.set(x, 0, z);
			this.level.add(g);
			if (type === "wall" || type === "boundary") {
				const h = type === "boundary" ? 0.55 : 1.3;
				this.box(w + 0.1, 0.12, d + 0.1, INK, g, 0, 0.09, 0);
				this.box(
					w,
					h,
					d,
					type === "boundary" ? 0xa7b8a0 : 0xc6c3a5,
					g,
					0,
					h / 2 + 0.12,
					0,
				);
				this.box(w + 0.02, 0.13, d + 0.02, map.accent, g, 0, h + 0.13, 0);
				if (w > d) {
					for (let a = -w / 2 + 0.3; a < w / 2; a += 1.1)
						this.box(0.09, 0.025, d * 0.7, 0xf3d17a, g, a, h + 0.21, 0, false);
					for (let a = -w / 2 + 1; a < w / 2; a += 1.7)
						this.line(
							[
								[a, 0.15, d / 2 + 0.01],
								[a, h * 0.65, d / 2 + 0.01],
							],
							0x7e8a78,
							g,
						);
				} else {
					for (let a = -d / 2 + 0.3; a < d / 2; a += 1.1)
						this.box(w * 0.7, 0.025, 0.09, 0xf3d17a, g, 0, h + 0.21, a, false);
					for (let a = -d / 2 + 1; a < d / 2; a += 1.7)
						this.line(
							[
								[w / 2 + 0.01, 0.15, a],
								[w / 2 + 0.01, h * 0.65, a],
							],
							0x7e8a78,
							g,
						);
				}
			} else if (type === "crate") {
				this.box(1.3, 0.9, 1.3, 0xe9b64f, g, 0, 0.48, 0);
				this.box(1.38, 0.13, 1.38, 0xf6d987, g, 0, 0.85, 0);
				for (const xx of [-0.44, 0.44])
					this.box(0.11, 0.94, 1.33, 0xaf7c35, g, xx, 0.5, 0);
				this.box(1.33, 0.1, 1.33, 0xaf7c35, g, 0, 0.27, 0);
				const tag = this.label("×", 0.7, 0.7, INK);
				tag.position.y = 0.94;
				g.add(tag);
			} else {
				this.cylinder(0.37, 0.95, CORAL, g, 0, 0.5, 0, 10);
				for (const yy of [0.25, 0.74])
					this.cylinder(0.38, 0.1, CREAM, g, 0, yy, 0, 10);
				this.cylinder(0.15, 0.09, INK, g, 0.1, 1, 0, 8);
				const tag = this.label("!", 0.5, 0.5, CREAM);
				tag.position.y = 0.995;
				g.add(tag);
			}
			this.obstacleMeshes.push(g);
		}
		this.tankViews = [this.makeTank(0), this.makeTank(1)];
		this.makeSetDressing(map);
		this.aimGroup = new THREE.Group();
		this.level.add(this.aimGroup);
		this.zoneGroup = new THREE.Group();
		this.level.add(this.zoneGroup);
		this.buildZone(17);
	}
	makeTank(i) {
		const color = i ? CORAL : TEAL,
			g = new THREE.Group();
		this.level.add(g);
		const hull = new THREE.Group();
		hull.name = "hull";
		g.add(hull);
		const wheels = [];
		for (const x of [-0.56, 0.56]) {
			this.box(0.3, 0.4, 1.6, INK, hull, x, 0.35, 0);
			this.box(0.32, 0.12, 1.55, 0x58746a, hull, x, 0.6, 0);
			for (let j = 0; j < 5; j++) {
				const m = this.cylinder(
					0.17,
					0.32,
					0x9da58c,
					hull,
					x,
					0.32,
					-0.59 + j * 0.295,
					10,
				);
				m.rotation.z = Math.PI / 2;
				m.name = `wheel${wheels.length}`;
				wheels.push(m);
				this.box(
					0.335,
					0.045,
					0.09,
					0x9da58c,
					hull,
					x,
					0.66,
					-0.62 + j * 0.3,
					false,
				);
			}
		}
		this.box(1.02, 0.37, 1.42, color, hull, 0, 0.59, 0);
		this.box(0.83, 0.14, 1.18, color, hull, 0, 0.85, 0);
		for (const x of [-0.34, 0.34])
			this.cylinder(0.065, 0.025, CREAM, hull, x, 0.94, -0.39, 6);
		const turret = new THREE.Group();
		turret.position.y = 0.92;
		g.add(turret);
		this.cylinder(0.43, 0.29, color, turret, 0, 0.12, 0, 8);
		this.cylinder(0.23, 0.075, CREAM, turret, 0, 0.32, -0.06, 12);
		this.box(0.15, 0.04, 0.22, INK, turret, 0, 0.375, -0.06);
		const barrel = this.box(0.17, 0.17, 1.12, color, turret, 0, 0.15, 0.7);
		barrel.name = "barrel";
		this.box(0.25, 0.24, 0.22, INK, barrel, 0, 0, 0.48);
		this.box(0.14, 0.13, 0.03, 0x78877a, barrel, 0, 0, 0.6, false);
		const flash = this.mesh(
			new THREE.IcosahedronGeometry(0.22, 0),
			0xffe095,
			turret,
			0,
			0.15,
			1.45,
			false,
		);
		flash.visible = false;
		const antenna = new THREE.Group();
		antenna.name = "antenna";
		antenna.position.set(0.35, 0.9, -0.45);
		hull.add(antenna);
		this.cylinder(0.018, 0.73, INK, antenna, 0, 0.36, 0, 5);
		this.mesh(
			new THREE.SphereGeometry(0.052, 6, 6),
			color,
			antenna,
			0,
			0.73,
			0,
		);
		this.box(0.32, 0.35, 0.2, 0x9d9d76, hull, -0.28, 0.8, -0.73);
		const badge = this.label(i ? "02" : "01", 0.4, 0.3, CREAM);
		badge.position.set(0, 0.795, -0.5);
		hull.add(badge);
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.78, 0.83, 40),
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.6,
				side: THREE.DoubleSide,
				depthWrite: false,
			}),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.07;
		g.add(ring);
		const shield = new THREE.Mesh(
			new THREE.SphereGeometry(0.98, 16, 12),
			new THREE.MeshBasicMaterial({
				color: CREAM,
				transparent: true,
				opacity: 0.15,
				wireframe: true,
				depthWrite: false,
			}),
		);
		shield.position.y = 0.55;
		g.add(shield);
		const mixer = new THREE.AnimationMixer(hull);
		const wheelTracks = wheels.map(
			(w) =>
				new THREE.NumberKeyframeTrack(
					`${w.name}.rotation[x]`,
					[0, 1],
					[0, Math.PI * 2],
				),
		);
		const trackAction = mixer.clipAction(
			new THREE.AnimationClip("Treads", 1, wheelTracks),
		);
		trackAction.play();
		const idle = mixer.clipAction(
			new THREE.AnimationClip("Radio wobble", 2, [
				new THREE.NumberKeyframeTrack(
					"antenna.rotation[z]",
					[0, 0.5, 1, 1.5, 2],
					[0, 0.08, 0, -0.08, 0],
				),
			]),
		);
		idle.play();
		const gunMixer = new THREE.AnimationMixer(turret);
		const recoil = gunMixer.clipAction(
			new THREE.AnimationClip("Cannon recoil", 0.22, [
				new THREE.NumberKeyframeTrack(
					"barrel.position[z]",
					[0, 0.04, 0.22],
					[0.7, 0.48, 0.7],
				),
			]),
		);
		recoil.setLoop(THREE.LoopOnce);
		recoil.clampWhenFinished = true;
		const fadeMats = [];
		g.traverse((o) => {
			if (
				(o.isMesh || o.isLineSegments) &&
				o.material &&
				!o.material.transparent
			) {
				o.material = o.material.clone();
				o.material.transparent = true;
				fadeMats.push(o.material);
			}
		});
		return {
			g,
			hull,
			turret,
			barrel,
			mixer,
			gunMixer,
			trackAction,
			recoil,
			flash,
			flashTime: 0,
			ring,
			shield,
			fadeMats,
			dust: 0,
		};
	}
	makeSetDressing(map) {
		const p = this.level;
		for (const [x, z, s] of [
			[-16, -9, 1.3],
			[-16, 6, 1.1],
			[16, -5, 1.4],
			[16, 9, 1],
			[-12, -12, 0.9],
			[8, -12, 1.2],
			[12, 12, 1],
			[-8, 12, 0.8],
		]) {
			const g = new THREE.Group();
			g.position.set(x, 0, z);
			g.scale.setScalar(s);
			p.add(g);
			this.cylinder(0.12, 1.2, 0x8e7956, g, 0, 0.4, 0, 7);
			this.mesh(
				new THREE.IcosahedronGeometry(0.85, 0),
				map.accent,
				g,
				0,
				1.35,
				0,
			);
			this.mesh(
				new THREE.IcosahedronGeometry(0.65, 0),
				0x86a77e,
				g,
				0.48,
				1.8,
				0.12,
			);
			this.mesh(
				new THREE.IcosahedronGeometry(0.6, 0),
				0x5b8e73,
				g,
				-0.3,
				1.9,
				0.05,
			);
		}
		for (const x of [-14.9, 14.9])
			for (const z of [-9.8, 9.8]) {
				this.cylinder(0.08, 3, INK, p, x, 1.5, z, 6);
				this.box(0.8, 0.35, 0.3, CREAM, p, x, 3, z);
				this.box(0.64, 0.2, 0.05, 0xf3d47d, p, x, 3, z + 0.17);
			}
		for (let i = 0; i < 24; i++) {
			const side = i % 2 ? 1 : -1,
				x = side * rand(15.1, 17.7),
				z = rand(-10, 10);
			const m = this.mesh(
				new THREE.DodecahedronGeometry(rand(0.12, 0.3), 0),
				0xb5b99b,
				p,
				x,
				0.03,
				z,
			);
			m.scale.y = 0.5;
			for (let j = 0; j < 2; j++)
				this.line(
					[
						[x + 0.2, 0.05, z],
						[x + 0.2 + rand(-0.2, 0.2), rand(0.2, 0.4), z + rand(-0.2, 0.2)],
					],
					0x6d9a76,
					p,
				);
		}
		for (const i of [0, 1]) {
			const x = i ? 10 : -10,
				z = i ? -5 : 5;
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(1.22, 1.25, 48),
				new THREE.MeshBasicMaterial({
					color: i ? CORAL : TEAL,
					transparent: true,
					opacity: 0.35,
					side: THREE.DoubleSide,
				}),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(x, 0.08, z);
			p.add(ring);
			const tag = this.label(i ? "02" : "01", 1.25, 0.8, i ? CORAL : TEAL);
			tag.position.set(x, 0.09, z);
			p.add(tag);
		}
		if (this.planeModel) this.root.remove(this.planeModel);
		this.planeModel = new THREE.Group();
		this.box(0.35, 0.2, 1.6, 0xf4cd6b, this.planeModel);
		this.box(2.2, 0.07, 0.42, CREAM, this.planeModel, 0, 0.03, 0);
		this.box(0.85, 0.05, 0.26, CORAL, this.planeModel, 0, 0.04, -0.6);
		this.box(0.05, 0.35, 0.35, CORAL, this.planeModel, 0, 0.13, -0.6);
		this.root.add(this.planeModel);
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h);
		const aspect = w / h;
		let height = Math.max(25, 34 / aspect);
		if (this.title) height = Math.max(27, 35 / aspect);
		this.camera.left = (-height * aspect) / 2;
		this.camera.right = (height * aspect) / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.updateProjectionMatrix();
	}
	setTitle(v) {
		if (this.title !== v) {
			this.title = v;
			this.resize();
		}
	}
	worldPoint(x, y) {
		this.raycaster.setFromCamera(
			new THREE.Vector2((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2),
			this.camera,
		);
		const out = new THREE.Vector3();
		this.raycaster.ray.intersectPlane(this.plane, out);
		return { x: out.x, z: out.z };
	}
	buildZone(zone) {
		if (!this.zoneGroup) return;
		for (const c of [...this.zoneGroup.children]) {
			this.zoneGroup.remove(c);
			c.geometry?.dispose();
		}
		if (zone >= 16) return;
		const mat = new THREE.MeshBasicMaterial({
			color: CORAL,
			transparent: true,
			opacity: 0.17,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		for (const [x, z, w, d] of [
			[-(14 + zone) / 2, 0, Math.max(0.01, 14 - zone), 18],
			[(14 + zone) / 2, 0, Math.max(0.01, 14 - zone), 18],
			[
				0,
				-(9 + zone * 0.64) / 2,
				Math.min(28, zone * 2),
				Math.max(0.01, 9 - zone * 0.64),
			],
			[
				0,
				(9 + zone * 0.64) / 2,
				Math.min(28, zone * 2),
				Math.max(0.01, 9 - zone * 0.64),
			],
		]) {
			const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
			m.rotation.x = -Math.PI / 2;
			m.position.set(x, 0.12, z);
			this.zoneGroup.add(m);
		}
		this.line(
			[
				[-zone, 0.15, -zone * 0.64],
				[zone, 0.15, -zone * 0.64],
				[zone, 0.15, zone * 0.64],
				[-zone, 0.15, zone * 0.64],
				[-zone, 0.15, -zone * 0.64],
			],
			CORAL,
			this.zoneGroup,
		);
	}
	effect(type, data) {
		const x = data.x || 0,
			z = data.z || 0;
		if (type === "shoot") {
			const t = this.tankViews[data.tank];
			t.recoil.reset().play();
			t.flashTime = 0.08;
			this.shake = Math.max(this.shake, 0.025);
			return;
		}
		if (type === "hit") this.shake = 0.16;
		if (type === "explode" || type === "barrel") this.shake = 0.32;
		const n =
			type === "explode"
				? 24
				: type === "barrel"
					? 28
					: type === "hit"
						? 9
						: type === "cover"
							? 15
							: type === "bounce"
								? 5
								: type === "dash"
									? 5
									: type === "chip"
										? 7
										: 8;
		for (let i = 0; i < n; i++) {
			const col =
				type === "pickup"
					? 0x65bb99
					: type === "dash"
						? 0xd4d4b2
						: i % 3
							? 0xf0c35b
							: CORAL;
			const m = this.mesh(
				new THREE.BoxGeometry(0.13, 0.13, 0.13),
				col,
				this.root,
				x,
				0.5,
				z,
				false,
			);
			this.effects.push({
				mesh: m,
				vx: rand(-4, 4),
				vy: rand(1, 6),
				vz: rand(-4, 4),
				life: rand(0.25, 0.65),
				max: 0.65,
				spin: rand(-5, 5),
			});
		}
		if (["explode", "hit", "barrel", "pickup", "respawn"].includes(type)) {
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.7, 0.88, 24),
				new THREE.MeshBasicMaterial({
					color: type === "pickup" ? TEAL : 0xf3be4e,
					transparent: true,
					opacity: 0.8,
					side: THREE.DoubleSide,
					depthWrite: false,
				}),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(x, 0.13, z);
			this.root.add(ring);
			this.effects.push({
				mesh: ring,
				ring: true,
				life: 0.45,
				max: 0.45,
				vx: 0,
				vz: 0,
				vy: 0,
			});
		}
	}
	update(
		state,
		dt,
		{ aim = null, assist = true, seat = 0, shake = true, title = false } = {},
	) {
		this.elapsed += dt;
		if (state.round !== this.round) this.build(state.round);
		this.setTitle(title);
		const portrait = innerWidth < 600;
		const targetX = title && !portrait ? -8 : 0,
			targetZ = title && portrait ? 8 : 0;
		const cx = targetX,
			cz = targetZ;
		this.camera.position.set(cx, 34, cz + 27);
		this.camera.lookAt(cx, 0, cz);
		if (shake && this.shake > 0) {
			this.camera.position.x += rand(-this.shake, this.shake);
			this.camera.position.z += rand(-this.shake, this.shake);
			this.shake = Math.max(0, this.shake - dt * 1.2);
		}
		for (let i = 0; i < 2; i++) {
			const t = state.tanks[i],
				v = this.tankViews[i];
			if (!t || !v) continue;
			v.g.position.set(t.x, 0, t.z);
			v.g.visible = t.dead <= 0;
			v.hull.rotation.y = t.angle;
			v.turret.rotation.y = t.aim;
			v.trackAction.timeScale = (t.moving || 0) * 2.3;
			v.mixer.update(dt);
			v.gunMixer.update(dt);
			v.flashTime -= dt;
			v.flash.visible = v.flashTime > 0;
			v.flash.scale.setScalar(1 + Math.random() * 0.5);
			v.shield.visible = t.shield > 0;
			v.shield.rotation.y += dt;
			v.ring.material.opacity = t.overdrive > 0 ? 0.8 : 0.3;
			v.ring.scale.setScalar(
				t.overdrive > 0 ? 1.1 + Math.sin(this.elapsed * 8) * 0.07 : 1,
			);
			for (const mat of v.fadeMats)
				mat.opacity = t.cloak ? (i === seat ? 0.4 : 0.11) : 1;
			v.ring.visible = !t.cloak || i === seat;
			v.dust -= dt;
			if (t.moving > 0.1 && v.dust < 0 && t.dead <= 0) {
				v.dust = 0.12;
				const m = this.mesh(
					new THREE.IcosahedronGeometry(0.13, 0),
					0xcdc7a9,
					this.root,
					t.x - Math.sin(t.angle) * 0.8,
					0.2,
					t.z - Math.cos(t.angle) * 0.8,
					false,
				);
				this.effects.push({
					mesh: m,
					vx: rand(-0.3, 0.3),
					vy: 0.35,
					vz: rand(-0.3, 0.3),
					life: 0.35,
					max: 0.35,
					dust: true,
				});
			}
		}
		this.obstacleMeshes.forEach((v, i) => {
			const o = state.obstacles[i];
			if (o) {
				v.visible = o.hp > 0;
				if (o.type === "crate") v.scale.y = 0.7 + Math.min(3, o.hp) * 0.1;
			}
		});
		const active = new Set();
		for (const b of state.bullets) {
			active.add(b.id);
			let m = this.bulletMeshes.get(b.id);
			if (!m) {
				m = new THREE.Group();
				this.mesh(
					new THREE.SphereGeometry(0.14, 7, 6),
					b.owner ? CORAL : 0xfff5c1,
					m,
					0,
					0,
					0,
				);
				for (let j = 1; j < 4; j++) {
					const trail = this.box(
						0.14 - j * 0.025,
						0.08,
						0.19,
						0xe8b94e,
						m,
						0,
						0,
						-j * 0.24,
						false,
					);
					trail.material = this.mat(0xe8b94e);
				}
				this.root.add(m);
				this.bulletMeshes.set(b.id, m);
			}
			m.position.set(b.x, 0.58, b.z);
			m.rotation.y = Math.atan2(b.dx, b.dz);
		}
		for (const [id, m] of this.bulletMeshes)
			if (!active.has(id)) {
				this.root.remove(m);
				this.bulletMeshes.delete(id);
			}
		const activeP = new Set();
		for (const p of state.pickups) {
			activeP.add(p.id);
			let m = this.pickMeshes.get(p.id);
			if (!m) {
				m = new THREE.Group();
				this.cylinder(0.52, 0.15, INK, m, 0, 0.1, 0, 20);
				this.cylinder(
					0.42,
					0.16,
					p.type === "repair" ? 0x65ae85 : 0xeabd4c,
					m,
					0,
					0.18,
					0,
					20,
				);
				if (p.type === "repair") {
					this.box(0.18, 0.12, 0.65, CREAM, m, 0, 0.45, 0);
					this.box(0.65, 0.12, 0.18, CREAM, m, 0, 0.45, 0);
				} else {
					const mark = this.label("ϟ", 0.8, 1, INK);
					mark.position.y = 0.4;
					m.add(mark);
				}
				const r = new THREE.Mesh(
					new THREE.RingGeometry(0.7, 0.74, 32),
					new THREE.MeshBasicMaterial({
						color: p.type === "repair" ? TEAL : 0xd08b2d,
						side: THREE.DoubleSide,
						transparent: true,
						opacity: 0.6,
					}),
				);
				r.rotation.x = -Math.PI / 2;
				r.position.y = 0.1;
				m.add(r);
				this.root.add(m);
				this.pickMeshes.set(p.id, m);
			}
			m.position.set(p.x, Math.sin(this.elapsed * 3) * 0.08, p.z);
			m.rotation.y = this.elapsed * 0.8;
		}
		for (const [id, m] of this.pickMeshes)
			if (!activeP.has(id)) {
				this.root.remove(m);
				this.pickMeshes.delete(id);
			}
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const f = this.effects[i];
			f.life -= dt;
			if (f.life <= 0) {
				this.root.remove(f.mesh);
				f.mesh.geometry?.dispose();
				this.effects.splice(i, 1);
				continue;
			}
			f.mesh.position.x += f.vx * dt;
			f.mesh.position.y += f.vy * dt;
			f.mesh.position.z += f.vz * dt;
			if (f.ring) f.mesh.scale.setScalar(1 + (1 - f.life / f.max) * 3);
			else if (f.dust) f.mesh.scale.setScalar(1 + (1 - f.life / f.max) * 2);
			else {
				f.vy -= 14 * dt;
				f.mesh.rotation.x += dt * f.spin;
				f.mesh.rotation.z += dt * f.spin;
			}
		}
		if (Math.abs((this.lastZone || 17) - state.zone) > 0.12) {
			this.buildZone(state.zone);
			this.lastZone = state.zone;
		}
		for (const c of [...this.aimGroup.children]) {
			this.aimGroup.remove(c);
			c.geometry?.dispose();
		}
		if (assist && aim && seat >= 0 && !title && !state.tanks[seat].dead) {
			for (let i = 0; i < aim.length; i++) {
				const s = aim[i],
					geo = new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(s.x1, 0.15, s.z1),
						new THREE.Vector3(s.x2, 0.15, s.z2),
					]);
				const m = new THREE.Line(geo, i ? this.bankMaterial : this.aimMaterial);
				m.computeLineDistances();
				this.aimGroup.add(m);
				if (s.hit) {
					const ring = new THREE.Mesh(
						new THREE.RingGeometry(0.1, 0.17, 12),
						this.aimRingMaterial,
					);
					ring.rotation.x = -Math.PI / 2;
					ring.position.set(s.x2, 0.16, s.z2);
					this.aimGroup.add(ring);
				}
			}
		}
		if (this.planeModel) {
			this.planeModel.position.set(
				Math.sin(this.elapsed * 0.09) * 25,
				7,
				-17 + Math.cos(this.elapsed * 0.09) * 6,
			);
			this.planeModel.rotation.y = Math.PI * 0.5 + this.elapsed * 0.04;
			this.planeModel.visible = title;
		}
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
	inspect() {
		return {
			backend: this.backend,
			mixers: this.tankViews?.length * 2 || 0,
			effects: this.effects.length,
			meshes: this.scene.children.length,
		};
	}
}


const CREDITS = {"sourceInformation": {"date": "2026-11-05 21:25:52", "source": "Combat (Atari, 1977)", "plan": "none", "genre": "Arcade vehicular arena shooter", "perspective": "Elevated orthographic third-person / top-down arena", "tech": "Three.js 0.180.0 WebGPURenderer (WebGL2 fallback), Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub Session Protocol v1 client 1.4.0; one HTML file with CDN engine dependencies", "artDirection": "Procedural cel-shaded 3D tabletop diorama with ink outlines, cream paper, teal and vermilion", "animation": "Three.js AnimationMixer and AnimationClip for treads, antenna and cannon recoil; procedural particles and motion", "audio": "Code-synthesized funk music (10% default), effects, and Animalese-style formant gibberish voices; no audio files", "online": "AI Hub shared-world two-player host-authoritative sessions; standalone direct WebRTC invitation/return codes; local two-player duel", "testing": "Headless Chromium 153 with native WebGPU; file and HTTP loading; scripted nine-wreck circuit through real Rapier physics; keyboard/mouse, emulated standard gamepads and multitouch; 17 offline-audio checks; two-browser WebRTC and four AI Hub harness scenarios; visual review. Physical devices and listening: unknown.", "research": "none; native source knowledge only. Supplied AI Hub integration code and pinned engine distributions downloaded directly.", "environment": "Codex CLI (headless); Linux", "model": "OpenAI, gpt-6.1-sol, reasoning effort ultra", "usage": "added on import"}, "testingFeedback": ["Automated testing caught three game defects: pause-overlay routing, missed fast action taps, and menu accept/back presses blocked by the navigation-repeat timer. It also isolated one software-WebGPU launch-configuration issue. Static review found additional UI and network edge cases, which were corrected.", "One game defect blocked a required flow: the pause and developer menus. The graphics failure belonged to the test configuration, and was reproduced in a minimal Three.js scene.", "The scripted nine-wreck circuit used real Rapier impacts through all three arenas. The four AI Hub harness scenarios were the most useful network lifecycle checks.", "Early screenshots under the failing software-WebGPU flags showed a blank canvas; a minimal engine scene was more useful for isolating the configuration problem."], "engineFeedback": ["Three.js made procedural dioramas, toon shading, orthographic cameras and native AnimationMixer clips work together cleanly. Rapier supplied reliable collision and ricochet behavior.", "The initially supplied software-WebGPU adapter flag destroyed the device even in a minimal Three.js scene. Alternate Vulkan/ANGLE flags resolved it. Fast input taps also needed explicit queuing between physics ticks.", "The fixed-step tank simulation, AI navigation and bank-shot selection, controller-first menus, arena rules and authoritative network state.", "Coordinating browser input, fixed-step physics, native animation, and host/client lifecycle across WebGPU, touch and controller paths.", "none; the engine libraries are unmodified. Materials, clips, physics rules and renderer settings are application code.", "A built-in controller-first menu and focus system, with clear WebGPU device diagnostics, would simplify this kind of small game."], "promptFeedback": ["The source, visual style, controller-first direction and complete vertical-slice requirements gave a clear creative target. The testing stand-ins made headless verification practical.", "The prohibition on internet research coexists with a required remote integration. I treated direct downloads of the supplied integration code and pinned engine distributions as implementation, and did no source research.", "Making the complete solo, couch, touch and online flows behave consistently, including attract mode and network end states.", "Specify whether manual WebRTC code exchange is acceptable for standalone play and whether a relay or matchmaking service is available."], "aiHub": {"name": "ComBop", "tagline": "Small tanks. Big comebacks.", "description": "A playful ink-and-paper tank rumble inspired by Combat. Bank shells around corners, vanish in the ghost garden, and burst through a three-arena solo circuit or duel a friend.", "type": "Game", "genre": "Shooter", "source": "Combat (1977)", "series": "", "players": "1–2", "controls": "WASD / left stick move; mouse / right stick aim; click / R2 fire; Space / Circle / L2 burst; Esc / Options pause; touch drag to drive with assisted fire.", "tags": ["3d", "arcade", "versus", "top-down", "retro", "vehicles"]}};
const $ = (id) => document.getElementById(id);
const app = {
	ready: false,
	screen: "loading",
	mode: "solo",
	round: 0,
	lastInput: performance.now(),
	inputMode: "keyboard",
	previous: "title",
	settings: {
		music: 0.1,
		sfx: 0.7,
		glyph: "ps",
		assist: true,
		shake: true,
		arena: 0,
	},
	completed: [],
	toastUntil: 0,
	announceUntil: 0,
	attractElapsed: 0,
	attractRound: 0,
	remote: null,
	eventId: 0,
	events: [],
	lastRemoteEvent: 0,
	finishPending: false,
	hubEnded: false,
	keys: new Set(),
	pads: [],
	padPrev: [],
	padSuppress: new Set(),
	padRepeat: 0,
	mouse: {
		x: innerWidth * 0.6,
		y: innerHeight * 0.5,
		down: false,
		active: false,
	},
	touches: new Map(),
	touchDash: false,
	debugInputs: [null, null],
	queued: [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	],
};
const audio = new AudioSystem();
let sim, view;
let accumulator = 0;
let lastFrame = 0;
let menuFocus = null;
const online = createOnline({
	onStatus(text) {
		$("online-status").textContent = text;
	},
	onInput(input, seat) {
		if (sim && seat >= 0) {
			sim.input(seat, input);
			app.remoteInputAt = performance.now();
		}
	},
	onSnapshot(state) {
		if (!state?.tanks || state.tanks.length !== 2) return;
		if (
			app.remote &&
			state.round === app.remote.round &&
			state.elapsed < app.remote.elapsed
		)
			return;
		if (sim.round !== state.round) sim.reset(state.round, "online");
		state.obstacles?.forEach((o, i) => {
			if (sim.obstacles[i]) sim.obstacles[i].hp = o.hp;
		});
		app.remote = state;
		if (state.round !== app.round) {
			app.round = state.round;
			view?.build(state.round);
		}
		for (const ev of state.events || []) {
			if (ev.id > app.lastRemoteEvent) {
				app.lastRemoteEvent = ev.id;
				handleEffect(ev.type, ev.data, false);
			}
		}
		if (state.ended && app.screen === "play")
			roundover({ winner: state.winner, scores: state.scores }, false);
	},
	onPeer(info) {
		if (!info.joined && sim && online.isHost && info.seat >= 0)
			sim.input(info.seat, {});
		if (!info.joined && app.mode === "online" && !app.hubEnded)
			toast(info.name + " left the rumble.");
	},
	onStart(info) {
		if (!app.ready) return;
		app.hubEnded = false;
		app.lastRemoteEvent = 0;
		app.remote = null;
		startGame("online", app.settings.arena);
		$("online-status").textContent = "Connected. Let the rumble begin!";
	},
	onTimeUp() {
		if (online.isHost && sim) {
			sim.ended = true;
			sim.winner = sim.scores[0] >= sim.scores[1] ? 0 : 1;
			online.finish(sim.scores);
		}
	},
	onEnd(info) {
		if (!sim) return;
		app.hubEnded = online.inHub;
		app.finishPending = false;
		if (info.scores && Array.isArray(info.scores)) {
			sim.scores = [...info.scores];
			if (app.remote) app.remote.scores = [...info.scores];
		}
		if (online.inHub) {
			audio.stopMusic();
			audio.setMuted(true);
		}
		if (app.mode === "online" && app.screen !== "roundover") {
			const s = app.remote || sim;
			roundover(
				{ winner: s.scores[0] >= s.scores[1] ? 0 : 1, scores: s.scores },
				false,
			);
			if (info.reason !== "finished" && !online.inHub) {
				$("roundover-title").textContent = "The radio went quiet.";
				$("roundover-copy").textContent =
					"Your opponent disconnected. Return to title to create a fresh invitation.";
			}
		}
		applyHubUI();
	},
});
function applyHubUI() {
	if (!online.inHub) return;
	document
		.querySelectorAll(
			'[data-action="title"],[data-action="solo"],[data-action="local"],[data-action="online"],[data-action="next-round"]',
		)
		.forEach((b) => {
			b.classList.add("hidden");
		});
	$("dev-button").disabled = true;
	$("pause-copy").textContent = "Online play keeps moving during a pit stop.";
}
function gesture(mode = "keyboard") {
	app.lastInput = performance.now();
	if (app.inputMode !== mode) {
		app.inputMode = mode;
		document.body.classList.toggle("touch", mode === "touch");
		updatePrompts();
		$("dash-touch").style.display =
			app.screen === "play" && mode === "touch" ? "block" : "none";
	}
	if (!app.hubEnded) {
		audio.unlock().then((ok) => {
			if (ok && !audio.musicPlaying) audio.startMusic();
		});
	}
}
function activity(mode = "keyboard") {
	if (app.screen === "attract") {
		exitAttract();
		gesture(mode);
		return true;
	}
	gesture(mode);
	return false;
}
function toast(text, time = 2.5) {
	$("toast").textContent = text;
	$("toast").classList.add("show");
	app.toastUntil = performance.now() + time * 1000;
}
function announce(text, time = 1.5) {
	$("announce").textContent = text;
	$("announce").classList.add("show");
	app.announceUntil = performance.now() + time * 1000;
}
function focusables() {
	const panel = document.querySelector(".screen.active");
	return panel
		? [
				...panel.querySelectorAll(
					'button,input,select,textarea,[tabindex="0"]',
				),
			].filter(
				(b) => !b.disabled && !b.closest(".hidden") && b.offsetParent !== null,
			)
		: [];
}
function setFocus(b, real = true) {
	document.querySelectorAll(".focused").forEach((x) => {
		x.classList.remove("focused");
	});
	menuFocus = b;
	if (b) {
		b.classList.add("focused");
		if (real) b.focus({ preventScroll: true });
	}
}
function refreshFocus() {
	const f = focusables();
	setFocus(f[0], false);
}
function show(screen, remember = true) {
	if (remember && ["settings", "guide", "about", "dev"].includes(screen))
		app.previous = app.screen;
	app.screen = screen;
	for (const e of document.querySelectorAll(".screen"))
		e.classList.toggle(
			"active",
			e.id === (screen === "paused" ? "pause" : screen) + "-screen",
		);
	const playing =
		screen === "play" ||
		screen === "attract" ||
		(app.mode === "online" &&
			["paused", "settings", "guide", "dev"].includes(screen));
	$("hud").style.display = playing ? "block" : "none";
	$("pause-button").style.display = screen === "attract" ? "none" : "block";
	$("attract-bar").style.display = screen === "attract" ? "block" : "none";
	$("dash-touch").style.display =
		screen === "play" && app.inputMode === "touch" ? "block" : "none";
	$("announce").classList.remove("show");
	app.mouse.down = false;
	app.keys.clear();
	app.touches.clear();
	$("touch-ring").style.display = "none";
	app.touchDash = false;
	app.queued = [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	];
	refreshFocus();
	if (screen === "about") renderCredits("sourceInformation");
	if (screen === "dev") refreshDev();
	applyHubUI();
}
function goBack() {
	if (app.screen === "paused") {
		show("play", false);
		return;
	}
	if (["settings", "guide", "about", "dev"].includes(app.screen)) {
		show(app.previous === "settings" ? "paused" : app.previous, false);
		return;
	}
	if (app.screen === "online") {
		online.leave();
		show("title", false);
		app.lastInput = performance.now();
		return;
	}
	if (app.screen === "play") {
		show("paused", false);
		$("pause-copy").textContent =
			app.mode === "online"
				? "Online play keeps moving during a pit stop."
				: "Your tank can catch its breath.";
		return;
	}
}
function title() {
	if (online.inHub) return;
	app.mode = "solo";
	online.leave();
	app.remote = null;
	app.finishPending = false;
	app.debugInputs = [null, null];
	sim.reset(0, "solo");
	view.build(0);
	app.round = 0;
	app.lastInput = performance.now();
	audio.setMuted(false);
	show("title", false);
}
function startGame(mode = "solo", round = 0) {
	app.mode = mode;
	app.round = round;
	$("dev-button").disabled = mode === "online";
	app.remote = null;
	app.debugInputs = [null, null];
	app.finishPending = false;
	app.hubEnded = false;
	app.events = [];
	if (mode === "solo" && round === 0) app.completed = [];
	sim.reset(round, mode, mode === "solo" && round > 0);
	view.build(round);
	show("play", false);
	audio.setMuted(false);
	audio.sfx("start");
	audio.voice("start");
	announce(mode === "local" ? "A little friendly fire." : MAPS[round].name, 2);
	if (mode === "local")
		toast("TEAL: WASD + mouse  ·  CORAL: arrows + IJKL / Enter / Shift", 6);
	if (mode === "solo") toast(MAPS[round].rule, 4);
	if (mode === "online") applyHubUI();
}
function roundover(data, finish = true) {
	if (app.screen === "attract") return;
	const won = data.winner === 0;
	show("roundover", false);
	$("roundover-kicker").textContent =
		app.mode === "solo"
			? `CIRCUIT / BOUT ${app.round + 1} OF 3`
			: "DUEL COMPLETE";
	$("roundover-title").textContent =
		app.mode === "solo"
			? won
				? "Well bopped."
				: "A minor dent in the plan."
			: data.winner === 0
				? "Teal takes the cake."
				: "Coral makes a comeback.";
	$("roundover-copy").textContent =
		app.mode === "solo"
			? won
				? app.round < 2
					? "One down. Keep the good angles coming."
					: "All three bouts in the bag. That’s some fine tanking."
				: "The rival found your angle. Retry this bout and give them a little bop back."
			: "A good clean rumble. Mostly.";
	$("roundover-score").innerHTML =
		`${Number(data.scores[0])} : <span>${Number(data.scores[1])}</span>`;
	const next = $("next-round");
	next.classList.remove("hidden");
	next.textContent =
		app.mode === "solo"
			? won
				? app.round < 2
					? "Next arena ↗"
					: "Collect your trophy ↗"
				: "Try this bout again ↗"
			: "Rematch ↗";
	if (app.mode === "online") {
		next.classList.add("hidden");
		$("roundover-copy").textContent = online.inHub
			? "Round complete. AI Hub has the result."
			: "Duel complete. Return to title for a fresh connection.";
		if (finish && online.isHost) app.finishPending = true;
	}
	if (app.mode === "solo" && won && !app.completed.includes(app.round))
		app.completed.push(app.round);
	audio.sfx(won ? "win" : "lose");
	audio.voice(won ? "win" : "lose");
	refreshFocus();
}
function nextRound() {
	if (app.mode === "solo") {
		if (sim.winner === 0) {
			if (app.round === 2) {
				show("results", false);
				$("results-stats").textContent =
					`${sim.metrics.shots} shells sent · ${sim.metrics.bounces} good bounces · ${sim.metrics.bankshots} bankshot wrecks`;
				return;
			}
			startGame("solo", app.round + 1);
		} else startGame("solo", app.round);
	} else if (app.mode === "local") startGame("local", app.round);
}
function enterAttract() {
	if (online.inHub || app.screen !== "title") return;
	app.mode = "attract";
	app.attractElapsed = 0;
	app.attractRound = 0;
	app.round = 0;
	sim.reset(0, "attract");
	view.build(0);
	show("attract", false);
}
function exitAttract() {
	app.mode = "solo";
	sim.reset(0, "solo");
	app.round = 0;
	view.build(0);
	app.lastInput = performance.now();
	show("title", false);
}
function handleEffect(type, data, replicate = true) {
	if (!view) return;
	if (replicate && app.mode === "online" && online.isHost) {
		app.events.push({ id: ++app.eventId, type, data });
		if (app.events.length > 18) app.events.shift();
	}
	if (type === "roundover") {
		roundover(data);
		return;
	}
	view.effect(type, data);
	audio.sfx(
		type === "barrel"
			? "explode"
			: type === "cover" || type === "chip"
				? "hit"
				: type,
		0.7,
	);
	if (type === "hit" && data.bank) announce("A good angle!", 0.8);
	if (type === "explode")
		announce(
			data.bank
				? "Bank you very much!"
				: data.tank === 0
					? "A minor setback."
					: "BOP!",
			1.2,
		);
	if (
		type === "pickup" &&
		data.tank === (app.mode === "online" ? online.seat : 0)
	) {
		toast(
			data.type === "repair"
				? "Armour patched. Back to it."
				: "DOUBLE TIME · seven seconds of rapid fire",
			2,
		);
		audio.voice("pickup");
	}
	if (type === "sudden") {
		announce("Hot zone! Keep moving.", 2);
		audio.voice("start");
	}
}
const settingsDefaults = {
	music: 0.1,
	sfx: 0.7,
	glyph: "ps",
	assist: true,
	shake: true,
	arena: 0,
};
function loadSettings() {
	try {
		const v = JSON.parse(localStorage.getItem("combop-settings") || "null");
		if (v) {
			app.settings = { ...settingsDefaults, ...v };
			app.settings.music = Math.max(0, Math.min(1, +app.settings.music || 0));
			app.settings.sfx = Math.max(0, Math.min(1, +app.settings.sfx || 0));
		}
	} catch {}
	syncSettings();
}
function syncSettings() {
	$("music-volume").value = app.settings.music * 100;
	$("music-value").textContent = Math.round(app.settings.music * 100) + "%";
	$("sfx-volume").value = app.settings.sfx * 100;
	$("sfx-value").textContent = Math.round(app.settings.sfx * 100) + "%";
	$("glyph-style").value = app.settings.glyph;
	$("assist").value = app.settings.assist ? "on" : "off";
	$("shake").value = app.settings.shake ? "on" : "off";
	$("arena-select").value = app.settings.arena;
	audio.setMusic(app.settings.music);
	audio.setSfx(app.settings.sfx);
	updatePrompts();
}
function saveSettings() {
	try {
		localStorage.setItem("combop-settings", JSON.stringify(app.settings));
	} catch {}
	syncSettings();
}
function updatePrompts() {
	if ($("guide-pad-copy"))
		$("guide-pad-copy").innerHTML =
			app.settings.glyph === "xbox"
				? "<strong>Controller:</strong> Left stick move · Right stick aim · RT fire · B / LT burst"
				: "<strong>Controller:</strong> Left stick move · Right stick aim · R2 fire · ○ / L2 burst";
	const pad = app.inputMode === "gamepad",
		xbox = app.settings.glyph === "xbox";
	const values = pad
		? { move: "L", aim: "R", fire: xbox ? "RT" : "R2", dash: xbox ? "B" : "○" }
		: { move: "WASD", aim: "Mouse", fire: "LMB", dash: "Space" };
	for (const el of document.querySelectorAll(".prompt")) {
		el.textContent = values[el.dataset.prompt];
		el.className = "prompt glyph" + (pad ? " pad" : "");
	}
	$("title-prompt").textContent =
		app.inputMode === "touch"
			? "Drag to drive · Aim & fire assisted"
			: pad
				? `Left stick to move · ${xbox ? "A" : "×"} to select`
				: "WASD + mouse · Controller ready";
}
const devSpecs = [
	["speed", "Tank speed", 2, 10, 0.1],
	["shellSpeed", "Shell speed", 8, 28, 0.5],
	["reload", "Shell refill time", 0.2, 2, 0.05],
	["ai", "Rival skill", 0.3, 1.4, 0.05],
	["ricochets", "Wall bounces", 0, 5, 1],
	["damage", "Shell damage", 1, 3, 1],
];
function buildDev() {
	for (const [key, label, min, max, step] of devSpecs) {
		const row = document.createElement("div");
		row.className = "setting";
		row.innerHTML = `<label for="dev-${key}">${label}</label><div class="range-wrap"><input id="dev-${key}" data-dev="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${DEFAULTS[key]}"><output id="dev-value-${key}">${DEFAULTS[key]}</output></div>`;
		$("dev-sliders").append(row);
		row.querySelector("input").addEventListener("input", (e) => {
			sim.balance[key] = Number(e.target.value);
			$("dev-value-" + key).textContent = Number(e.target.value)
				.toFixed(key === "reload" || key === "ai" ? 2 : 1)
				.replace(/\.0$/, "");
		});
	}
}
function refreshDev() {
	for (const [key] of devSpecs) {
		$("dev-" + key).value = sim.balance[key];
		$("dev-value-" + key).textContent = sim.balance[key];
	}
	$("dev-god").textContent = "Invulnerable: " + (sim.god ? "on" : "off");
}
const feedbackQuestions = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"Most helpful test",
		"Least helpful test",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important thing built yourself",
		"Hardest part about using the engine",
		"Engine changes",
		"One thing you would change",
	],
	promptFeedback: [
		"What did you like most about this prompt?",
		"What was confusing?",
		"Hardest thing to do",
		"What would you change?",
	],
};
function renderCredits(tab) {
	const root = $("credits-body");
	root.replaceChildren();
	document.querySelectorAll("[data-credit]").forEach((b) => {
		b.classList.toggle("primary", b.dataset.credit === tab);
	});
	if (tab === "sourceInformation") {
		const dl = document.createElement("dl");
		dl.className = "credits-grid";
		for (const [key, value] of Object.entries(CREDITS.sourceInformation)) {
			const dt = document.createElement("dt");
			dt.textContent = key
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (s) => s.toUpperCase());
			const dd = document.createElement("dd");
			dd.textContent = value;
			dl.append(dt, dd);
		}
		root.append(dl);
	} else {
		CREDITS[tab].forEach((value, i) => {
			const section = document.createElement("div");
			section.className = "feedback-item";
			const h = document.createElement("strong");
			h.textContent = feedbackQuestions[tab][i] || "";
			const p = document.createElement("p");
			p.textContent = value;
			section.append(h, p);
			root.append(section);
		});
	}
	root.scrollTop = 0;
}
async function action(name) {
	audio.sfx("click");
	switch (name) {
		case "solo":
			startGame("solo", 0);
			break;
		case "local":
			startGame("local", app.settings.arena);
			break;
		case "online":
			show("online");
			break;
		case "pause":
			if (app.screen === "play") goBack();
			break;
		case "resume":
			show("play", false);
			break;
		case "back":
			goBack();
			break;
		case "title":
			title();
			break;
		case "settings":
		case "guide":
		case "about":
		case "dev":
			show(name);
			break;
		case "next-round":
			nextRound();
			break;
		case "reset-settings":
			app.settings = { ...settingsDefaults };
			saveSettings();
			toast("Factory-fresh settings.");
			break;
		case "dev-reset":
			sim.balance = { ...DEFAULTS };
			sim.god = false;
			refreshDev();
			break;
		case "dev-god":
			sim.god = !sim.god;
			refreshDev();
			break;
		case "dev-next":
			show("play", false);
			sim.scores[0] = 2;
			sim.award(0);
			break;
		case "dev-repair":
			for (const t of sim.tanks) {
				t.hp = 3;
				t.ammo = 3;
				if (t.dead > 0) sim.respawn(t);
			}
			toast("Both tanks repaired.");
			break;
		case "dev-time":
			sim.time = 0;
			toast("Hot zone begins when you resume.");
			break;
		case "host-online":
			try {
				$("host-online").disabled = true;
				$("online-code").value = await online.host();
				$("code-label").textContent =
					"Your invitation — copy and send to your friend";
				$("code-help").textContent =
					"After your friend joins, replace this invitation with their return code and choose Accept return code.";
			} catch (e) {
				toast(e.message, 5);
			} finally {
				$("host-online").disabled = false;
			}
			break;
		case "join-online":
			try {
				const invite = $("online-code").value;
				$("join-online").disabled = true;
				const answer = await online.join(invite);
				$("online-code").value = answer;
				$("code-label").textContent =
					"Your return code — send it back to the host";
				$("code-help").textContent =
					"Keep this screen open. The duel starts when the host accepts your return code.";
			} catch (e) {
				toast(e.message, 5);
			} finally {
				$("join-online").disabled = false;
			}
			break;
		case "accept-code":
			try {
				await online.accept($("online-code").value);
			} catch (e) {
				toast(e.message, 5);
			}
			break;
		case "copy-code":
			try {
				await navigator.clipboard.writeText($("online-code").value);
				toast("Code copied.");
			} catch {
				$("online-code").select();
				toast("Select and copy the code from the box.");
			}
			break;
	}
}
function wireUI() {
	document.querySelectorAll("[data-action]").forEach((b) => {
		b.addEventListener("click", () => action(b.dataset.action));
		b.addEventListener("pointerenter", () => {
			if (app.inputMode !== "touch") setFocus(b, false);
		});
	});
	document.querySelectorAll("[data-credit]").forEach((b) => {
		b.addEventListener("click", () => renderCredits(b.dataset.credit));
		b.addEventListener("pointerenter", () => setFocus(b, false));
	});
	document.querySelectorAll("input,select,textarea").forEach((b) => {
		b.addEventListener("pointerenter", () => setFocus(b, false));
	});
	for (const [id, key, convert] of [
		["music-volume", "music", (v) => Number(v) / 100],
		["sfx-volume", "sfx", (v) => Number(v) / 100],
		["glyph-style", "glyph", (v) => v],
		["assist", "assist", (v) => v === "on"],
		["shake", "shake", (v) => v === "on"],
		["arena-select", "arena", (v) => Number(v)],
	]) {
		$(id).addEventListener("input", (e) => {
			app.settings[key] = convert(e.target.value);
			saveSettings();
		});
	}
}
function scrollMenu(amount) {
	const e =
		app.screen === "about"
			? $("credits-body")
			: document.querySelector(".screen.active .panel");
	if (e) e.scrollTop += amount;
}
function moveMenu(dir) {
	const list = focusables();
	if (!list.length) return;
	let i = list.indexOf(menuFocus);
	i = (i + dir + list.length) % list.length;
	setFocus(list[i]);
	audio.sfx("click", 0.5);
	list[i].scrollIntoView({ block: "nearest" });
}
function adjustMenu(dir) {
	const e = menuFocus;
	if (e?.tagName === "INPUT" && e.type === "range") {
		e.value = Number(e.value) + Number(e.step || 1) * dir;
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (e?.tagName === "SELECT") {
		e.selectedIndex =
			(e.selectedIndex + dir + e.options.length) % e.options.length;
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else moveMenu(dir);
}
function activateMenu() {
	if (menuFocus?.tagName === "BUTTON") menuFocus.click();
	else if (menuFocus?.tagName === "SELECT") adjustMenu(1);
}
function isEditing(e) {
	return ["TEXTAREA", "INPUT", "SELECT"].includes(e?.tagName);
}
window.addEventListener("keydown", (e) => {
	if (isEditing(e.target)) {
		app.lastInput = performance.now();
		if (e.code === "Escape") {
			e.target.blur();
			goBack();
		}
		return;
	}
	if (activity("keyboard")) {
		e.preventDefault();
		return;
	}
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Tab",
			"Enter",
		].includes(e.code)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (e.code === "Escape") {
		goBack();
		return;
	}
	if (app.screen !== "play" && (e.code === "PageDown" || e.code === "PageUp")) {
		e.preventDefault();
		scrollMenu(e.code === "PageDown" ? 220 : -220);
		return;
	}
	if (app.screen === "play") {
		app.keys.add(e.code);
		if (e.code === "Space") app.queued[0].dash = true;
		if (
			app.mode === "local" &&
			(e.code === "ShiftLeft" || e.code === "ShiftRight")
		)
			app.queued[1].dash = true;
		if (
			app.mode === "local" &&
			(e.code === "Enter" || e.code === "NumpadEnter")
		)
			app.queued[1].fire = true;
		return;
	}
	if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
		moveMenu(e.shiftKey ? -1 : 1);
	if (e.code === "ArrowUp" || e.code === "KeyW") moveMenu(-1);
	if (e.code === "ArrowLeft" || e.code === "KeyA") adjustMenu(-1);
	if (e.code === "ArrowRight" || e.code === "KeyD") adjustMenu(1);
	if (e.code === "Enter" || e.code === "Space") activateMenu();
});
window.addEventListener("keyup", (e) => {
	app.keys.delete(e.code);
});
window.addEventListener("blur", () => {
	app.keys.clear();
	app.mouse.down = false;
	app.touches.clear();
	app.touchDash = false;
	app.queued = [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	];
	if (app.mode === "online") {
		if (online.isHost && online.seat >= 0) sim?.input(online.seat, {});
		else {
			online.sendInput({});
			setTimeout(() => online.sendInput({}), 65);
		}
	}
	if (app.ready && app.screen === "play" && app.mode !== "online")
		show("paused", false);
});
window.addEventListener(
	"pointerdown",
	(e) => {
		if (app.screen === "attract") {
			e.preventDefault();
			e.stopImmediatePropagation();
			exitAttract();
			gesture(e.pointerType === "touch" ? "touch" : "keyboard");
			return;
		}
		gesture(e.pointerType === "touch" ? "touch" : "keyboard");
	},
	true,
);
window.addEventListener(
	"pointermove",
	(e) => {
		if (e.pointerType === "mouse") {
			if (app.screen === "attract") {
				exitAttract();
				gesture("keyboard");
				return;
			}
			if (e.movementX || e.movementY) gesture("keyboard");
			app.mouse.x = e.clientX;
			app.mouse.y = e.clientY;
			app.mouse.active = true;
		} else if (app.touches.has(e.pointerId)) {
			const t = app.touches.get(e.pointerId);
			t.x = e.clientX;
			t.y = e.clientY;
			gesture("touch");
		}
	},
	{ passive: true },
);
$("world").style.touchAction = "none";
$("world").addEventListener("contextmenu", (e) => e.preventDefault());
$("world").addEventListener("pointerdown", (e) => {
	if (app.screen !== "play") return;
	if (e.pointerType === "touch") {
		app.touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			sx: e.clientX,
			sy: e.clientY,
			side: e.clientX < innerWidth * 0.5 ? "left" : "right",
		});
		$("world").setPointerCapture(e.pointerId);
		if (e.clientX < innerWidth * 0.5) {
			$("touch-ring").style.cssText =
				`display:block;left:${e.clientX - 55}px;top:${e.clientY - 55}px`;
		}
	} else if (e.button === 0) {
		app.mouse.down = true;
		app.queued[0].fire = true;
	}
});
window.addEventListener("pointerup", (e) => {
	app.mouse.down = false;
	if (app.touches.has(e.pointerId)) {
		const t = app.touches.get(e.pointerId);
		if (t.side === "left") $("touch-ring").style.display = "none";
		app.touches.delete(e.pointerId);
	}
	if (e.target === $("dash-touch")) app.touchDash = false;
});
window.addEventListener("pointercancel", (e) => {
	app.mouse.down = false;
	app.touches.delete(e.pointerId);
	app.touchDash = false;
	$("touch-ring").style.display = "none";
});
$("dash-touch").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	gesture("touch");
	app.touchDash = true;
	app.queued[0].dash = true;
});
function getPads(now) {
	const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
	app.pads = pads;
	let menuUsed = false;
	for (let i = 0; i < pads.length; i++) {
		const p = pads[i],
			prev = app.padPrev[p.index] || { buttons: [], axes: [] };
		const pressed = (n) =>
			!!p.buttons[n]?.pressed || p.buttons[n]?.value > 0.25;
		const edge = (n) => pressed(n) && !prev.buttons[n];
		if (!pressed(1)) app.padSuppress.delete(p.index);
		const meaningful =
			p.axes.some((a) => Math.abs(a) > 0.25) ||
			p.buttons.some((b) => b.pressed || b.value > 0.25);
		if (meaningful) {
			if (app.screen !== "play" && Math.abs(p.axes[3] || 0) > 0.2)
				scrollMenu(p.axes[3] * 22);
			if (activity("gamepad")) {
				app.padPrev[p.index] = {
					buttons: p.buttons.map((b) => b.pressed || b.value > 0.25),
					axes: [...p.axes],
				};
				return;
			}
			if (app.screen === "play") {
				const seat = app.mode === "online" ? 0 : i;
				if (seat < 2) {
					if (edge(7)) app.queued[seat].fire = true;
					if (edge(1) || edge(6)) app.queued[seat].dash = true;
				}
			}
			if (edge(9) && !pressed(8)) {
				if (app.screen === "play" || app.screen === "paused") goBack();
				menuUsed = true;
			}
			if (app.screen !== "play" && app.screen !== "attract") {
				if (edge(0)) {
					activateMenu();
					app.padRepeat = now + 200;
					menuUsed = true;
				} else if (edge(1)) {
					app.padSuppress.add(p.index);
					goBack();
					app.padRepeat = now + 200;
					menuUsed = true;
				} else if (now > app.padRepeat && (pressed(12) || p.axes[1] < -0.5)) {
					moveMenu(-1);
					app.padRepeat = now + 220;
				} else if (now > app.padRepeat && (pressed(13) || p.axes[1] > 0.5)) {
					moveMenu(1);
					app.padRepeat = now + 220;
				} else if (now > app.padRepeat && (pressed(14) || p.axes[0] < -0.5)) {
					adjustMenu(-1);
					app.padRepeat = now + 180;
				} else if (now > app.padRepeat && (pressed(15) || p.axes[0] > 0.5)) {
					adjustMenu(1);
					app.padRepeat = now + 180;
				}
			}
		}
		app.padPrev[p.index] = {
			buttons: p.buttons.map((b) => b.pressed || b.value > 0.25),
			axes: [...p.axes],
		};
	}
	return menuUsed;
}
function localInput(seat) {
	const k = app.keys;
	const v = { mx: 0, mz: 0, ax: 0, az: 0, fire: false, dash: false };
	if (seat === 0) {
		v.mx = +k.has("KeyD") - +k.has("KeyA");
		v.mz = +k.has("KeyS") - +k.has("KeyW");
		if (app.mode !== "local") {
			v.mx += +k.has("ArrowRight") - +k.has("ArrowLeft");
			v.mz += +k.has("ArrowDown") - +k.has("ArrowUp");
		}
		v.fire = app.mouse.down;
		v.dash = k.has("Space");
		if (app.mouse.active) {
			const t = (app.remote || sim).tanks[
					app.mode === "online" ? Math.max(0, online.seat) : 0
				],
				p = view.worldPoint(app.mouse.x, app.mouse.y);
			v.ax = p.x - t.x;
			v.az = p.z - t.z;
		}
	} else {
		v.mx = +k.has("ArrowRight") - +k.has("ArrowLeft");
		v.mz = +k.has("ArrowDown") - +k.has("ArrowUp");
		v.ax = +k.has("KeyL") - +k.has("KeyJ");
		v.az = +k.has("KeyK") - +k.has("KeyI");
		v.fire = k.has("Enter") || k.has("NumpadEnter");
		v.dash = k.has("ShiftRight") || k.has("ShiftLeft");
	}
	const pad = app.pads[seat];
	if (pad) {
		const dead = (a) => (Math.abs(a || 0) < 0.16 ? 0 : a);
		const x = dead(pad.axes[0]),
			z = dead(pad.axes[1]),
			ax = dead(pad.axes[2]),
			az = dead(pad.axes[3]);
		if (Math.hypot(x, z) > 0.1) {
			v.mx = x;
			v.mz = z;
		}
		if (Math.hypot(ax, az) > 0.1) {
			v.ax = ax;
			v.az = az;
		}
		v.fire ||= !!pad.buttons[7]?.pressed || pad.buttons[7]?.value > 0.25;
		v.dash ||=
			(!!pad.buttons[1]?.pressed && !app.padSuppress.has(pad.index)) ||
			!!pad.buttons[6]?.pressed;
	}
	if (seat === 0 && app.touches.size && app.screen === "play") {
		let right = null;
		for (const t of app.touches.values()) {
			const dx = (t.x - t.sx) / 55,
				dy = (t.y - t.sy) / 55;
			if (t.side === "left") {
				v.mx = dx;
				v.mz = dy;
			} else right = { dx, dy };
		}
		const tank = (app.remote || sim).tanks[
				app.mode === "online" ? Math.max(0, online.seat) : 0
			],
			enemy = (app.remote || sim).tanks[
				app.mode === "online" ? 1 - Math.max(0, online.seat) : 1
			];
		if (right && Math.hypot(right.dx, right.dy) > 0.15) {
			v.ax = right.dx;
			v.az = right.dy;
			v.fire = true;
		} else {
			v.ax = enemy.x - tank.x;
			v.az = enemy.z - tank.z;
			v.fire = enemy.dead <= 0;
		}
		v.dash = app.touchDash;
	}
	v.fire ||= app.queued[seat].fire;
	v.dash ||= app.queued[seat].dash;
	if (seat === 0) v.dash ||= app.touchDash;
	if (v.mx || v.mz || v.fire || v.dash || app.touches.size)
		app.lastInput = performance.now();
	return v;
}
function currentState() {
	return app.mode === "online" && !online.isHost && app.remote
		? app.remote
		: sim.snapshot();
}
let hudTick = 0;
function updateHud(state) {
	$("score-0").textContent = state.scores[0];
	$("score-1").textContent = state.scores[1];
	$("name-0").textContent =
		app.mode === "solo"
			? "YOU / TEAL"
			: online.active && online.players[0]
				? online.players[0].name + " / TEAL"
				: "TEAL / 01";
	$("name-1").textContent =
		app.mode === "solo"
			? "RIVAL / CORAL"
			: online.active && online.players[1]
				? online.players[1].name + " / CORAL"
				: "CORAL / 02";
	$("stage-name").textContent = MAPS[state.round].name;
	$("stage-sub").textContent =
		app.mode === "solo"
			? `${String(state.round + 1).padStart(2, "0")} / 03 · FIRST TO 3`
			: app.mode === "attract"
				? "AI DEMO · TWO GOOD LITTLE TANKS"
				: "DUEL · FIRST TO 3";
	const seconds = Math.max(0, Math.ceil(state.time));
	$("timer").textContent = state.sudden
		? "HOT ZONE"
		: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	$("timer").classList.toggle("danger", seconds < 15);
	for (let i = 0; i < 2; i++) {
		const t = state.tanks[i];
		$("armor-" + i).innerHTML =
			Array.from(
				{ length: 3 },
				(_, j) => `<i class="armor${t.hp > j ? "" : " empty"}"></i>`,
			).join("") +
			`<span class="ammo-row">${Array.from({ length: 3 }, (_, j) => `<i class="shell${t.ammo > j ? "" : " empty"}"></i>`).join("")}</span>`;
	}
	const dash =
		state.tanks[Math.max(0, app.mode === "online" ? online.seat : 0)].dash;
	$("dash-meter").style.width = (1 - dash / 3) * 100 + "%";
	$("dash-touch").textContent = dash > 0.05 ? dash.toFixed(1) + "s" : "BURST ↗";
	$("dash-touch").style.opacity = dash > 0.05 ? ".45" : "1";
}
function stepSimulation() {
	if (app.mode === "online" && !online.isHost) return;
	if (app.mode !== "attract") {
		if (app.mode === "online") {
			if (online.seat >= 0)
				sim.input(
					online.seat,
					app.screen === "play"
						? app.debugInputs[online.seat] || localInput(0)
						: {},
				);
		} else {
			sim.input(0, app.debugInputs[0] || localInput(0));
			sim.input(
				1,
				app.debugInputs[1] || (app.mode === "local" ? localInput(1) : null),
			);
		}
	}
	sim.step();
	app.queued = [
		{ fire: false, dash: false },
		{ fire: false, dash: false },
	];
}
function frame(now) {
	if (!app.ready) return;
	const dt = Math.min((now - lastFrame) / 1000 || 0.016, 0.08);
	lastFrame = now;
	getPads(now);
	if (app.screen === "title" && now - app.lastInput >= 10000) enterAttract();
	const active =
		app.screen === "play" ||
		app.screen === "attract" ||
		(app.mode === "online" &&
			!app.hubEnded &&
			["paused", "settings", "guide", "dev"].includes(app.screen));
	if (active) {
		if (app.mode === "attract") {
			app.attractElapsed += dt;
			if (app.attractElapsed > 19) {
				app.attractElapsed = 0;
				app.attractRound = (app.attractRound + 1) % 3;
				app.round = app.attractRound;
				sim.reset(app.round, "attract");
				sim.spawnPickup("overdrive", ...MAPS[app.round].pickup);
				view.build(app.round);
			}
		}
		if (app.mode === "online" && !online.isHost) {
			if (online.sendInput(app.screen === "play" ? localInput(0) : {}))
				app.queued[0] = { fire: false, dash: false };
		} else if (!(app.mode === "online" && online.inHub && online.time() < 0)) {
			accumulator += dt;
			let steps = 0;
			while (accumulator >= 1 / 60 && steps++ < 8) {
				stepSimulation();
				accumulator -= 1 / 60;
				if (sim.ended) break;
			}
		}
		if (app.mode === "online" && online.isHost && !online.ended) {
			const snap = sim.snapshot();
			snap.events = app.events;
			online.sendSnapshot(snap);
		}
	}
	if (app.finishPending && online.isHost) {
		const snap = sim.snapshot();
		snap.events = app.events;
		online.sendSnapshot(snap);
		online.finish(sim.scores);
		app.finishPending = false;
	}
	const state = currentState();
	let aim = null;
	const seat = app.mode === "online" ? online.seat : 0;
	if (
		app.settings.assist &&
		seat >= 0 &&
		!state.tanks[seat].dead &&
		app.screen === "play"
	) {
		const t = state.tanks[seat],
			dx = Math.sin(t.aim),
			dz = Math.cos(t.aim);
		aim = sim.trace(t.x, t.z, dx, dz, sim.balance.ricochets, 35);
	}
	view.update(state, dt, {
		aim,
		assist: app.settings.assist,
		seat,
		shake: app.settings.shake,
		title: app.screen === "title",
	});
	view.render();
	if (++hudTick % 4 === 0) updateHud(state);
	if (now > app.toastUntil) $("toast").classList.remove("show");
	if (now > app.announceUntil) $("announce").classList.remove("show");
	audio.update(dt, { paused: app.screen === "paused" });
}
function inspect() {
	if (!sim) return { ready: false, screen: app.screen };
	const s = currentState();
	return {
		ready: app.ready,
		screen: app.screen,
		mode: app.mode,
		round: s.round,
		scores: [...s.scores],
		tanks: s.tanks.map((t) => ({ ...t, body: undefined, col: undefined })),
		bullets: s.bullets.length,
		pickups: s.pickups.map((p) => ({ ...p })),
		obstacles: s.obstacles.map((o) => ({ hp: o.hp, type: o.type })),
		time: s.time,
		sudden: s.sudden,
		zone: s.zone,
		physics: "rapier 0.19.3",
		renderer: view.backend,
		musicVolume: audio.musicVolume,
		inputMode: app.inputMode,
		settings: { ...app.settings, ...sim.balance },
		balance: { ...sim.balance },
		metrics: { ...s.metrics },
		audio: audio.inspect(),
		animation: view.inspect(),
		online: online.inspect(),
		completed: [...app.completed],
	};
}
const debug = {
	start: (mode = "solo", round = 0) => startGame(mode, round),
	award: (seat) => sim.award(seat),
	damage: (seat, n = 1) => sim.damage(seat, n),
	setTank: (seat, v) => sim.setTank(seat, v),
	spawnShot: (owner, v) => sim.spawnShot(owner, v),
	setTime: (seconds) => {
		sim.time = seconds;
	},
	spawnPickup: (type, x, z) => sim.spawnPickup(type, x, z),
	setInput: (i, v) => {
		app.debugInputs[i] = v;
		sim.input(i, v);
	},
	step: (seconds) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) {
			stepSimulation();
			if (sim.ended) break;
		}
		updateHud(currentState());
	},
	setIdle: (seconds) => {
		app.lastInput = performance.now() - seconds * 1000;
	},
	reset: () => title(),
	online,
};
window.__COMBOP__ = {
	ready: false,
	inspect,
	debug,
	online,
	audio,
	AudioSystem,
};
async function boot() {
	try {
		loadSettings();
		wireUI();
		buildDev();
		$("loading-detail").textContent = "Pouring the concrete…";
		await Simulation.init();
		sim = new Simulation((type, data) => handleEffect(type, data));
		view = new GameView($("world"));
		$("loading-detail").textContent = "Inking the little tanks…";
		await view.init();
		view.build(0);
		view.update(sim.snapshot(), 0, { title: true });
		view.render();
		app.ready = true;
		window.__COMBOP__.ready = true;
		app.lastInput = performance.now();
		$("loading").style.display = "none";
		show("title", false);
		lastFrame = performance.now();
		view.renderer.setAnimationLoop(frame);
		const info = await online.connectHub();
		if (info) {
			app.mode = "online";
			show("online", false);
			$("online-steps")?.classList.add("hidden");
			document.querySelector(".online-steps").classList.add("hidden");
			$("online-screen").querySelector(".back-row").classList.add("hidden");
			$("online-screen").querySelector("h2").textContent =
				"Tanks on the starting line.";
			$("online-screen").querySelector("p").textContent =
				"Connected to AI Hub. The round starts automatically.";
			online.ready();
		}
	} catch (error) {
		console.error(error);
		$("loading-detail").textContent =
			`Could not prepare the range: ${error.message}. This game needs WebGPU or WebGL2 and internet access for Three.js and Rapier.`;
		document.querySelector(".loader-track").style.display = "none";
		window.__COMBOP__.error = String(error);
	}
}
boot();
