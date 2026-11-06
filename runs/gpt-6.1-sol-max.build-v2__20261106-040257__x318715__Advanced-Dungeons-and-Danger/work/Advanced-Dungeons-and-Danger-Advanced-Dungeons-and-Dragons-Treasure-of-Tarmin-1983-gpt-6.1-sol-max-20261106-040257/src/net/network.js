import { Model } from "../core/model.js";

// The transport has no rules of its own. Every accepted command enters Model.
// All packets are reliable and ordered. Identity always comes from the transport.
const VERSION = 1;
const GAME = "ddanger";
const MAX_PACKET = 15_200;
const MAX_SNAPSHOT = 320_000;
const CHUNK = 10_000;
const MAX_INVITE = 120_000;
const RTC_TIMEOUT = 120_000;
const AUTH_HZ = 8;
const STOCK_PLANNING_SECONDS = 8;
const SEND_INTERVAL = 65; // <=16 packets/second, with no burst on a stalled tab.
const ALLOWED_ACTIONS = new Set([
	"inspect",
	"move",
	"turn",
	"interact",
	"pickup",
	"attack",
	"guard",
	"retreat",
	"equip",
	"swap",
	"use",
	"drop",
	"rest",
	"descend",
	"resume",
	"handoff",
	"revive",
]);
const TACTICAL_ACTIONS = new Set([
	"move",
	"interact",
	"pickup",
	"attack",
	"guard",
	"retreat",
	"equip",
	"swap",
	"use",
	"drop",
	"rest",
	"descend",
	"resume",
	"handoff",
	"revive",
]);
const BAD_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => globalThis.performance?.now?.() ?? Date.now();
const freshRun = (prefix) =>
	`${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`}`;
const byteSize = (value) =>
	encoder.encode(typeof value === "string" ? value : JSON.stringify(value))
		.length;
const plain = (value) =>
	!!value && typeof value === "object" && !Array.isArray(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);

function inviteRules(value) {
	if (value === undefined) return { planningSeconds: STOCK_PLANNING_SECONDS };
	if (
		!plain(value) ||
		Object.keys(value).some((key) => key !== "planningSeconds") ||
		!Number.isInteger(value.planningSeconds) ||
		value.planningSeconds < 2 ||
		value.planningSeconds > 30
	) {
		throw new Error("Planning window must be an integer from 2 to 30 seconds.");
	}
	return { planningSeconds: value.planningSeconds };
}

export function encodeInvite(description, run, rules = undefined) {
	if (
		!description ||
		!["offer", "answer"].includes(description.type) ||
		typeof description.sdp !== "string"
	)
		throw new Error("This is not an offer or answer.");
	const data = JSON.stringify({
		v: VERSION,
		game: GAME,
		run,
		type: description.type,
		sdp: description.sdp,
		rules: inviteRules(rules),
	});
	const encoded = toBase64(encoder.encode(data))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
	const result = `DD1.${description.type === "offer" ? "O" : "A"}.${encoded}`;
	if (result.length > MAX_INVITE)
		throw new Error(
			"The connection code is too large. Retry with a direct connection.",
		);
	return result;
}

export function decodeInvite(value, expectedType) {
	if (typeof value !== "string")
		throw new Error("Paste a connection code first.");
	const code = value.replace(/\s/g, "");
	if (code.length < 40 || code.length > MAX_INVITE)
		throw new Error(
			"The connection code is incomplete or too long. Copy the entire code.",
		);
	const match = /^DD1\.([OA])\.([A-Za-z0-9_-]+)$/.exec(code);
	if (!match)
		throw new Error(
			"This is not an Advanced Dungeons and Danger version 1 connection code.",
		);
	const type = match[1] === "O" ? "offer" : "answer";
	if (type !== expectedType)
		throw new Error(
			`This step needs the ${expectedType} code, not the ${type}.`,
		);
	let data;
	try {
		data = JSON.parse(
			decoder.decode(
				fromBase64(match[2].replaceAll("-", "+").replaceAll("_", "/")),
			),
		);
	} catch {
		throw new Error(
			"The connection code is damaged or truncated. Copy it again.",
		);
	}
	if (
		!plain(data) ||
		data.v !== VERSION ||
		data.game !== GAME ||
		data.type !== type ||
		typeof data.run !== "string" ||
		!/^[\w-]{1,100}$/.test(data.run) ||
		typeof data.sdp !== "string" ||
		!data.sdp.startsWith("v=0") ||
		!data.sdp.includes("m=application") ||
		!data.sdp.includes("a=ice-ufrag:") ||
		data.sdp.length > 90_000
	)
		throw new Error(
			"The connection code has invalid or incompatible contents.",
		);
	data.rules = inviteRules(data.rules);
	return data;
}

function toBase64(bytes) {
	let str = "";
	for (let n = 0; n < bytes.length; n += 8192)
		str += String.fromCharCode(...bytes.subarray(n, n + 8192));
	return btoa(str);
}
function fromBase64(value) {
	const str = atob(value);
	return Uint8Array.from(str, (char) => char.charCodeAt(0));
}

/** A small, explicit structural delta; arrays replace atomically. */
export function diffState(before, after, path = [], changes = []) {
	if (before === after) return changes;
	if (plain(before) && plain(after)) {
		for (const key of Object.keys(before))
			if (!(key in after)) changes.push([path.concat(key), null, true]);
		for (const key of Object.keys(after))
			if (!BAD_KEYS.has(key))
				diffState(before[key], after[key], path.concat(key), changes);
	} else if (JSON.stringify(before) !== JSON.stringify(after))
		changes.push([path, after]);
	return changes;
}

export function applyDelta(before, changes) {
	if (!Array.isArray(changes) || changes.length > 4000)
		throw new Error("Invalid snapshot delta.");
	const result = clone(before);
	for (const entry of changes) {
		if (
			!Array.isArray(entry) ||
			!Array.isArray(entry[0]) ||
			entry[0].length < 1 ||
			entry[0].length > 10 ||
			!entry[0].every(
				(key) =>
					(typeof key === "string" || Number.isInteger(key)) &&
					!BAD_KEYS.has(String(key)),
			)
		)
			throw new Error("Invalid snapshot path.");
		const [path, value, remove] = entry;
		let node = result;
		for (const key of path.slice(0, -1)) {
			if (
				!node ||
				typeof node !== "object" ||
				!Object.prototype.hasOwnProperty.call(node, key)
			)
				throw new Error("Snapshot delta base is missing.");
			node = node[key];
		}
		if (!node || typeof node !== "object")
			throw new Error("Invalid snapshot delta base.");
		const key = path.at(-1);
		if (remove === true) delete node[key];
		else node[key] = value;
	}
	return result;
}

export function validSnapshot(state, run) {
	if (
		!plain(state) ||
		state.schema !== 1 ||
		state.contentVersion !== 1 ||
		state.runId !== run ||
		!Number.isInteger(state.floor) ||
		state.floor < 0 ||
		state.floor > 2 ||
		!plain(state.players) ||
		!plain(state.entities) ||
		!plain(state.items) ||
		!plain(state.shared)
	)
		return false;
	if (
		![
			"explore",
			"combat",
			"preparation",
			"defeat",
			"victory",
			"ended",
		].includes(state.phase)
	)
		return false;
	const players = Object.values(state.players);
	if (players.length < 1 || players.length > 2) return false;
	return players.every(
		(player) =>
			plain(player) &&
			typeof player.id === "string" &&
			Number.isInteger(player.x) &&
			Number.isInteger(player.y) &&
			Number.isInteger(player.dir) &&
			player.dir >= 0 &&
			player.dir <= 3 &&
			["war", "maxWar", "spirit", "maxSpirit", "food", "arrows"].every(
				(key) => finite(player[key]) && player[key] >= 0,
			) &&
			Array.isArray(player.hands) &&
			player.hands.length === 2 &&
			Array.isArray(player.pack) &&
			player.pack.length === 6,
	);
}

export class Network {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.model = null;
		this.state = null;
		this.localId = "0";
		this.mode = "solo";
		this.isHost = true;
		this.server = false;
		this.running = false;
		this.ended = false;
		this.paused = false;
		this.allowSoloSave = false;
		this.rules = Object.freeze(inviteRules());
		this.pc = null;
		this.channel = null;
		this.status = "Solo expedition";
		this._generation = 0;
		this._interval = null;
		this._unsub = [];
		this._rtcTimer = null;
		this._cancelGather = null;
		this._disconnectedTimer = null;
		this._run = "";
		this._seq = 0;
		this._seen = new Map();
		this._outbox = [];
		this._commands = [];
		this._parts = new Map();
		this._published = null;
		this._revision = 0;
		this._receivedRevision = -1;
		this._handshaken = false;
		this._finished = false;
		this._hubStarted = false;
		this._ready = false;
		this._lastTick = now();
		this._lastPublish = -Infinity;
		this._lastFull = -Infinity;
		this._lastSend = -Infinity;
		this._lastHeartbeat = -Infinity;
		this._lastClientSend = -Infinity;
		this._resyncAt = -Infinity;
		this._traffic = {
			sent: 0,
			received: 0,
			rejected: 0,
			maxBytes: 0,
			rates: [],
			lastSecond: Math.floor(now() / 1000),
			secondCount: 0,
			maxPerSecond: 0,
			snapshots: 0,
		};
	}

	get planningSeconds() {
		return this.rules.planningSeconds;
	}

	_call(name, ...args) {
		this.callbacks[name]?.(...args);
	}
	_status(message) {
		this.status = message;
		this._call("onStatus", message);
	}
	_mode(mode, localId, host, server = false) {
		this.mode = mode;
		this.localId = String(localId);
		this.isHost = host;
		this.server = server;
		this._call("onMode", mode, this.localId);
	}
	_emit() {
		this.state = this.model ? this.model.state : this.state;
		this._call("onState", this.state);
	}
	_startTimer() {
		if (this._interval) clearInterval(this._interval);
		this._lastTick = now();
		this._interval = setInterval(() => this.tick(), 25);
	}

	startSolo(snapshot = null) {
		if (this.mode === "hub" && !this.ended)
			return { ok: false, message: "The Hub owns this expedition." };
		this.close();
		this.ended = false;
		this.running = true;
		this.paused = false;
		this._finished = false;
		this._mode("solo", "0", true);
		this.allowSoloSave = true;
		this._run = snapshot?.runId || freshRun("solo");
		this.model = new Model({
			players: [{ id: "0", name: "Adventurer" }],
			seed: snapshot?.seed ?? 43021,
			runId: this._run,
		});
		if (snapshot) {
			const loaded = this.model.load(snapshot);
			if (loaded?.ok === false) {
				this.model = null;
				this.state = null;
				this.running = false;
				throw new Error(loaded.message || "The saved expedition is invalid.");
			}
			this._run = this.model.state.runId;
		}
		this.state = this.model.state;
		this._status("Solo expedition · no time limit");
		this._emit();
		this._startTimer();
		this._call("onStart");
		return { ok: true };
	}

	async initHub() {
		const hub = globalThis.AIHub;
		if (!hub) return false;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return false;
		this.close();
		this.ended = false;
		this.running = false;
		this.paused = false;
		this._finished = false;
		this._hub = hub;
		this._hubStarted = false;
		this._ready = false;
		this._run = `hub-${info.round}-${info.seed}`;
		this._hubHost = String(info.host);
		this._participants = info.players.map((player) => ({
			id: String(player.id),
			name: String(player.name),
		}));
		this._mode("hub", info.me, !!info.isHost, !!info.server);
		this.allowSoloSave = false;
		if (this.isHost) {
			this.model = new Model({
				players: this._participants,
				seed: info.seed,
				runId: this._run,
			});
			this.state = this.model.state;
			this._emit();
		}
		this._unsub = [
			hub.on("message", (data, from) => this._receive(data, String(from))),
			hub.on("start", () => {
				if (this.ended) return;
				this._hubStarted = true;
				this._status("The expedition begins on the Hub clock.");
			}),
			hub.on("leave", ({ id }) => {
				if (this.ended) return;
				const pid = String(id);
				this._participants = this._participants.filter(
					(player) => player.id !== pid,
				);
				if (this.isHost && this.model) {
					this.model.leave(pid);
					this._emit();
					this._publish(true);
					this._status(
						"An adventurer departed. Their gear waits in a recovery bag.",
					);
				}
			}),
			hub.on("time-up", () => {
				if (!this.ended && this.isHost) {
					this.running = false;
					this.finish(!!this.state?.shared?.treasureClaimed);
				}
			}),
			hub.on("end", ({ reason }) =>
				this._end(`Hub round ended: ${reason}`, false),
			),
		];
		this._status(
			this.server
				? "Hub authority · no local adventurer"
				: "Hub connected · waiting for synchronized start",
		);
		this._startTimer();
		this._call("onReady");
		if (this.server) this.ready();
		return true;
	}

	ready() {
		if (this.mode !== "hub" || this.ended || this._ready) return;
		this._ready = true;
		this._hub.ready();
		if (this.isHost) this._publish(true);
		else this._queue("resync", {}, this._hubHost, true);
	}

	_rtcAvailable() {
		if (globalThis.AIHub?.active || this.mode === "hub")
			throw new Error(
				"Standalone invitations are unavailable inside a Hub session.",
			);
		if (!globalThis.RTCPeerConnection)
			throw new Error(
				"This browser does not support WebRTC data connections. Solo remains available.",
			);
	}

	async host(options = {}) {
		if (!plain(options))
			throw new Error("Host options must describe a planning window.");
		const rules = inviteRules(
			options.planningSeconds === undefined
				? undefined
				: { planningSeconds: options.planningSeconds },
		);
		this._rtcAvailable();
		this.close();
		const generation = this._generation;
		this.ended = false;
		this.running = false;
		this._finished = false;
		this._run = freshRun("rtc");
		this.rules = Object.freeze(rules);
		this._mode("rtc-host", "0", true);
		this.allowSoloSave = false;
		this._status("Gathering the host offer…");
		this._makePeer(options);
		this._attachChannel(
			this.pc.createDataChannel("ddanger-v1", { ordered: true }),
		);
		const offer = await this.pc.createOffer();
		this._assertGeneration(generation);
		await this.pc.setLocalDescription(offer);
		await this._gatherIce(generation);
		this._assertGeneration(generation);
		const code = encodeInvite(this.pc.localDescription, this._run, this.rules);
		this._status(
			`Offer ready · ${this.planningSeconds}-second planning window${this.planningSeconds === STOCK_PLANNING_SECONDS ? " · stock rules" : " · modified expedition"}. Send it to your partner, then paste their answer.`,
		);
		this._armRtcTimeout(generation);
		return code;
	}

	async join(offerCode, options = {}) {
		this._rtcAvailable();
		const invite = decodeInvite(offerCode, "offer"); // validate before closing an existing session.
		this.close();
		const generation = this._generation;
		this.ended = false;
		this.running = false;
		this._finished = false;
		this._run = invite.run;
		this.rules = Object.freeze(invite.rules);
		this._mode("rtc-guest", "1", false);
		this.allowSoloSave = false;
		this._status(
			`Host chose a ${this.planningSeconds}-second planning window${this.planningSeconds === STOCK_PLANNING_SECONDS ? " · stock rules" : " · modified expedition"}. Gathering your answer…`,
		);
		this._makePeer(options);
		this.pc.ondatachannel = (event) => {
			if (
				generation !== this._generation ||
				event.channel.label !== "ddanger-v1" ||
				this.channel
			) {
				event.channel.close();
				return;
			}
			this._attachChannel(event.channel);
		};
		await this.pc.setRemoteDescription({ type: "offer", sdp: invite.sdp });
		this._assertGeneration(generation);
		const answer = await this.pc.createAnswer();
		await this.pc.setLocalDescription(answer);
		await this._gatherIce(generation);
		this._assertGeneration(generation);
		const code = encodeInvite(this.pc.localDescription, this._run, this.rules);
		this._status(
			`Answer ready · ${this.planningSeconds}-second planning window accepted. Send it to the host and leave this page open.`,
		);
		this._armRtcTimeout(generation);
		return code;
	}

	async accept(answerCode) {
		if (this.mode !== "rtc-host" || !this.pc || this.ended)
			throw new Error("Create a host offer before importing an answer.");
		const invite = decodeInvite(answerCode, "answer");
		if (invite.run !== this._run)
			throw new Error(
				"This answer belongs to another invitation. Ask your partner to use your current offer.",
			);
		if (invite.rules.planningSeconds !== this.planningSeconds)
			throw new Error(
				`The answer accepts a different planning window. This offer requires ${this.planningSeconds} seconds. Ask your partner to use your current offer.`,
			);
		if (this.pc.signalingState !== "have-local-offer")
			throw new Error(
				"An answer has already been imported. Cancel and create a fresh invitation to retry.",
			);
		await this.pc.setRemoteDescription({ type: "answer", sdp: invite.sdp });
		this._status("Answer accepted. Connecting the reliable data channel…");
		return { ok: true };
	}

	_makePeer(options = {}) {
		const generation = this._generation;
		// No broker or relay is assumed. A caller may explicitly supply a STUN URL.
		const iceServers =
			typeof options.stun === "string" &&
			/^stuns?:[A-Za-z0-9.:[\]-]+$/.test(options.stun)
				? [{ urls: options.stun }]
				: [];
		this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
		this.pc.onconnectionstatechange = () => {
			if (generation !== this._generation || this.ended) return;
			const state = this.pc?.connectionState;
			if (state === "failed")
				this._connectionLost(
					"The direct connection failed. Some networks require a TURN relay; none is supplied. Cancel and retry, or play solo.",
				);
			else if (state === "disconnected") {
				this._status("Connection interrupted. Waiting briefly for recovery…");
				clearTimeout(this._disconnectedTimer);
				this._disconnectedTimer = setTimeout(() => {
					if (
						generation === this._generation &&
						this.pc?.connectionState === "disconnected"
					)
						this._connectionLost("The connection was lost.");
				}, 8000);
			} else if (state === "connected") {
				clearTimeout(this._disconnectedTimer);
				if (this._handshaken)
					this._status("Partner connected · shared expedition");
			}
		};
		this._startTimer();
	}

	_attachChannel(channel) {
		const generation = this._generation;
		this.channel = channel;
		channel.binaryType = "arraybuffer";
		channel.onopen = () => {
			if (generation !== this._generation) return;
			this._status("Data channel open. Checking expedition version…");
			this._queue(
				"hello",
				{
					protocol: VERSION,
					schema: 1,
					role: this.isHost ? "host" : "guest",
					rules: this.rules,
				},
				null,
				true,
			);
		};
		channel.onmessage = (event) => {
			if (
				generation !== this._generation ||
				this.ended ||
				typeof event.data !== "string" ||
				event.data.length > MAX_PACKET
			)
				return;
			let data;
			try {
				data = JSON.parse(event.data);
			} catch {
				this._reject();
				return;
			}
			this._receive(data, this.isHost ? "1" : "0");
		};
		channel.onclose = () => {
			if (generation === this._generation && !this.ended)
				this._connectionLost("The partner closed their connection.");
		};
		channel.onerror = () => {
			if (generation === this._generation && !this.ended)
				this._status("Data channel error. You may cancel and retry.");
		};
	}

	async _gatherIce(generation) {
		const pc = this.pc;
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve, reject) => {
			let timer;
			const complete = () => {
				if (generation !== this._generation) {
					cleanup();
					reject(new Error("Invitation canceled."));
				} else if (pc.iceGatheringState === "complete") {
					cleanup();
					resolve();
				}
			};
			const cleanup = () => {
				clearTimeout(timer);
				pc.removeEventListener("icegatheringstatechange", complete);
				this._cancelGather = null;
			};
			this._cancelGather = () => {
				cleanup();
				reject(new Error("Invitation canceled."));
			};
			pc.addEventListener("icegatheringstatechange", complete);
			timer = setTimeout(() => {
				cleanup();
				reject(
					new Error(
						"ICE gathering timed out. Cancel and retry the invitation.",
					),
				);
			}, 15_000);
			complete();
		});
	}
	_assertGeneration(generation) {
		if (generation !== this._generation || !this.pc)
			throw new Error("Invitation canceled.");
	}
	_armRtcTimeout(generation) {
		clearTimeout(this._rtcTimer);
		this._rtcTimer = setTimeout(() => {
			if (generation === this._generation && !this._handshaken)
				this._connectionLost(
					"The invitation timed out. Cancel and create a new offer. No relay is supplied for restrictive networks.",
				);
		}, RTC_TIMEOUT);
	}

	_beginRtc() {
		if (this.running || !this.isHost || !this._handshaken) return;
		clearTimeout(this._rtcTimer);
		this.model = new Model({
			players: [
				{ id: "0", name: "Adventurer I" },
				{ id: "1", name: "Adventurer II" },
			],
			seed: 43021,
			runId: this._run,
		});
		if (this.planningSeconds !== STOCK_PLANNING_SECONDS) {
			this.model.setTuning({ planningSeconds: this.planningSeconds });
			this.model.checkpoint = this.model.snapshot();
		}
		this.state = this.model.state;
		this.running = true;
		this._status(
			`Partner connected · ${this.planningSeconds}-second planning window${this.state.modified ? " · modified expedition" : " · stock rules"}`,
		);
		this._emit();
		this._publish(true);
		this._call("onStart");
	}

	send(action) {
		if (
			this.ended ||
			!this.running ||
			!this.state ||
			!plain(action) ||
			!ALLOWED_ACTIONS.has(action.type)
		)
			return {
				ok: false,
				message: this.ended
					? "This session has ended."
					: "The expedition is not accepting actions yet.",
			};
		if (!this.state.players[this.localId] || this.server)
			return { ok: false, message: "This copy has no local adventurer." };
		if (byteSize(action) > 1600)
			return { ok: false, message: "The action is too large." };
		if (this.isHost) {
			this._synchronizeCommandClock();
			const result = this.model.command(this.localId, clone(action));
			this._emit();
			this._call("onCommandResult", result, action);
			return result;
		}
		if (this._commands.length >= 16)
			return { ok: false, message: "Waiting for the host. Try again shortly." };
		// Capture the phase at input time: a packet from exploration cannot become a combat move.
		this._commands.push({
			action: clone(action),
			floor: this.state.floor,
			round: this.state.combat?.round ?? 0,
			encounter: this.state.combat?.id ?? null,
			tick: this.state.tick,
		});
		return { ok: true, pending: true };
	}

	_synchronizeCommandClock() {
		// A throttled background timer must not admit an intention past its deadline.
		if (
			this.mode === "solo" ||
			!this.running ||
			!this.isHost ||
			!this.model ||
			this._finished
		)
			return;
		const t = now();
		this.model.advance(Math.max(0, t - this._lastTick));
		this._lastTick = t;
		this.state = this.model.state;
	}

	_reject() {
		this._traffic.rejected++;
	}
	_receive(packet, from) {
		if (
			this.ended ||
			!plain(packet) ||
			packet.v !== VERSION ||
			packet.game !== GAME ||
			packet.run !== this._run ||
			!Number.isSafeInteger(packet.s) ||
			packet.s < 1 ||
			typeof packet.kind !== "string" ||
			byteSize(packet) > MAX_PACKET
		) {
			this._reject();
			return;
		}
		const allowedSender =
			this.mode === "hub"
				? this.isHost
					? this._participants.some((player) => player.id === from)
					: from === this._hubHost
				: from === (this.isHost ? "1" : "0");
		if (!allowedSender) {
			this._reject();
			return;
		}
		if (packet.s <= (this._seen.get(from) ?? 0)) {
			this._reject();
			return;
		}
		this._seen.set(from, packet.s);
		this._traffic.received++;
		const data = packet.d;
		switch (packet.kind) {
			case "hello":
				if (this.mode === "hub") break;
				if (
					!plain(data) ||
					data.protocol !== VERSION ||
					data.schema !== 1 ||
					data.role !== (this.isHost ? "guest" : "host")
				) {
					this._connectionLost(
						"Your partner has an incompatible game version. Open the same game file.",
					);
					break;
				}
				try {
					if (inviteRules(data.rules).planningSeconds !== this.planningSeconds)
						throw new Error("Planning-window mismatch");
				} catch {
					this._connectionLost(
						"Your partner accepted a different planning window. Cancel and exchange fresh offer and answer codes.",
					);
					break;
				}
				this._handshaken = true;
				clearTimeout(this._rtcTimer);
				if (this.isHost) this._beginRtc();
				else this._status("Version matched. Receiving the host’s expedition…");
				break;
			case "cmd":
				if (
					!this.isHost ||
					!this.running ||
					!this.model ||
					!plain(data) ||
					!ALLOWED_ACTIONS.has(data.type) ||
					byteSize(data) > 1600 ||
					(this.mode !== "hub" && !this._handshaken)
				) {
					this._reject();
					break;
				}
				{
					this._synchronizeCommandClock();
					const state = this.model.state;
					let result;
					if (
						packet.floor !== state.floor ||
						(TACTICAL_ACTIONS.has(data.type) &&
							(packet.encounter !== (state.combat?.id ?? null) ||
								packet.round !== (state.combat?.round ?? 0)))
					)
						result = {
							ok: false,
							message:
								"The encounter changed before that action arrived. Choose again.",
						};
					else result = this.model.command(from, data);
					this._queue("ack", { seq: packet.s, result, action: data }, from);
					this._emit();
				}
				break;
			case "ack":
				if (!this.isHost && plain(data) && plain(data.result))
					this._call(
						"onCommandResult",
						data.result,
						plain(data.action) ? data.action : { type: data.action },
					);
				break;
			case "state":
				if (!this.isHost) this._receiveState(data);
				break;
			case "delta":
				if (!this.isHost) this._receiveDelta(data);
				break;
			case "resync":
				if (
					this.isHost &&
					now() - (this._lastResyncRequest ?? -Infinity) > 500
				) {
					this._lastResyncRequest = now();
					this._publish(true);
				}
				break;
			case "ping":
				// Upstream traffic also lets a rendering-free host detect active seats.
				break;
			case "bye":
				if (this.isHost && this.mode === "rtc-host")
					this._connectionLost("Your partner left. You can continue alone.");
				else if (this.mode === "rtc-guest")
					this._end(
						"The host ended the shared expedition. Host migration is unavailable.",
						true,
					);
				break;
			default:
				this._reject();
		}
	}

	_receiveState(data) {
		if (
			!plain(data) ||
			!Number.isSafeInteger(data.rev) ||
			data.rev < this._receivedRevision ||
			!Number.isInteger(data.part) ||
			!Number.isInteger(data.total) ||
			data.part < 0 ||
			data.total < 1 ||
			data.total > 40 ||
			data.part >= data.total ||
			typeof data.text !== "string" ||
			data.text.length > CHUNK
		) {
			this._reject();
			return;
		}
		let part = this._parts.get(data.rev);
		if (!part) {
			if (this._parts.size >= 3)
				this._parts.delete(this._parts.keys().next().value);
			part = { total: data.total, chunks: new Array(data.total), at: now() };
			this._parts.set(data.rev, part);
		}
		if (part.total !== data.total) {
			this._reject();
			return;
		}
		part.chunks[data.part] = data.text;
		if (
			part.chunks.filter((value) => typeof value === "string").length !==
			part.total
		)
			return;
		this._parts.delete(data.rev);
		try {
			const bytes = fromBase64(part.chunks.join(""));
			if (bytes.length > MAX_SNAPSHOT) throw new Error("Snapshot too large.");
			const state = JSON.parse(decoder.decode(bytes));
			if (!validSnapshot(state, this._run))
				throw new Error("Invalid snapshot schema.");
			this.state = state;
			this._receivedRevision = data.rev;
			this._traffic.snapshots++;
			if (
				!this.running &&
				!this.ended &&
				(this.mode !== "hub" || (this._hubStarted && this._hub.time() >= 0))
			) {
				this.running = true;
				clearTimeout(this._rtcTimer);
				this._status(
					this.mode === "hub"
						? "Hub expedition live"
						: "Partner connected · shared expedition",
				);
				this._call("onStart");
			}
			this._emit();
		} catch {
			this._reject();
			this._requestResync();
		}
	}

	_receiveDelta(data) {
		if (
			!plain(data) ||
			!Number.isSafeInteger(data.rev) ||
			!Number.isSafeInteger(data.base) ||
			data.rev <= this._receivedRevision
		)
			return;
		if (!this.state || data.base !== this._receivedRevision) {
			this._requestResync();
			return;
		}
		try {
			const state = applyDelta(this.state, data.changes);
			if (!validSnapshot(state, this._run))
				throw new Error("Invalid delta state.");
			this.state = state;
			this._receivedRevision = data.rev;
			this._emit();
		} catch {
			this._reject();
			this._requestResync();
		}
	}
	_requestResync() {
		if (now() - this._resyncAt < 500) return;
		this._resyncAt = now();
		this._queue("resync", {}, this.mode === "hub" ? this._hubHost : null);
	}

	_packet(kind, data) {
		const combat = this.state?.combat;
		return {
			v: VERSION,
			game: GAME,
			run: this._run,
			s: ++this._seq,
			t: this.state?.tick ?? 0,
			floor: this.state?.floor ?? 0,
			round: combat?.round ?? 0,
			encounter: combat?.id ?? null,
			kind,
			d: data,
		};
	}
	_queue(kind, data, to = null, priority = false, stamp = null) {
		if (this.ended || this.mode === "solo") return;
		// Client actions are stamped when chosen, not when their queue reaches the wire.
		const entry = { kind, data, to, stamp };
		if (priority) this._outbox.unshift(entry);
		else this._outbox.push(entry);
		if (this._outbox.length > 160)
			this._outbox.splice(0, this._outbox.length - 160);
	}

	_flush() {
		if (
			this.ended ||
			!this._outbox.length ||
			now() - this._lastSend < SEND_INTERVAL
		)
			return;
		if (this.mode.startsWith("rtc") && this.channel?.readyState !== "open")
			return;
		if (this.mode === "hub" && !this._hub) return;
		const entry = this._outbox.shift();
		const packet = this._packet(entry.kind, entry.data);
		if (entry.stamp) {
			packet.floor = entry.stamp.floor;
			packet.round = entry.stamp.round;
			packet.encounter = entry.stamp.encounter;
			packet.t = entry.stamp.tick;
		}
		const bytes = byteSize(packet);
		if (bytes > MAX_PACKET) {
			this._reject();
			return;
		}
		let sent = false;
		if (this.mode === "hub") {
			const opts = { reliable: true };
			if (entry.to !== null && entry.to !== undefined)
				opts.to = Number(entry.to);
			sent = this._hub.send(packet, opts) !== false;
		} else {
			try {
				if (this.channel.bufferedAmount > 256_000) {
					this._outbox.unshift(entry);
					return;
				}
				this.channel.send(JSON.stringify(packet));
				sent = true;
			} catch {
				this._connectionLost("The data channel could not send.");
			}
		}
		this._lastSend = now();
		if (sent) {
			this._traffic.sent++;
			this._traffic.maxBytes = Math.max(this._traffic.maxBytes, bytes);
			const second = Math.floor(now() / 1000);
			if (second !== this._traffic.lastSecond) {
				this._traffic.maxPerSecond = Math.max(
					this._traffic.maxPerSecond,
					this._traffic.secondCount,
				);
				this._traffic.secondCount = 0;
				this._traffic.lastSecond = second;
			}
			this._traffic.secondCount++;
		}
	}

	_publish(full = false) {
		if (!this.isHost || !this.model || this.ended || this.mode === "solo")
			return;
		// Never queue a new baseline before the old baseline has left; reliable order is enough.
		if (
			this._outbox.some(
				(entry) => entry.kind === "state" || entry.kind === "delta",
			)
		)
			return;
		const state = this.model.snapshot();
		const revision = this._revision + 1;
		const changes = this._published ? diffState(this._published, state) : null;
		if (full || !this._published || byteSize({ changes }) > 11_500) {
			const bytes = encoder.encode(JSON.stringify(state));
			if (bytes.length > MAX_SNAPSHOT) {
				this._status("The expedition state exceeds the synchronization limit.");
				return;
			}
			const text = toBase64(bytes);
			const count = Math.ceil(text.length / CHUNK);
			for (let part = 0; part < count; part++)
				this._queue("state", {
					rev: revision,
					part,
					total: count,
					text: text.slice(part * CHUNK, (part + 1) * CHUNK),
				});
			this._lastFull = now();
		} else if (changes.length)
			this._queue("delta", { base: this._revision, rev: revision, changes });
		else return;
		this._revision = revision;
		this._published = state;
		this._lastPublish = now();
	}

	tick() {
		if (this.ended) return;
		const t = now();
		const elapsed = Math.max(0, t - this._lastTick);
		this._lastTick = t;
		if (
			this.mode === "hub" &&
			this._hubStarted &&
			!this.running &&
			this._hub.time() >= 0 &&
			(this.isHost || this.state)
		) {
			this.running = true;
			this._status("Hub expedition live");
			this._call("onStart");
		}
		if (
			this.running &&
			this.isHost &&
			this.model &&
			!(this.mode === "solo" && this.paused) &&
			!this._finished
		) {
			this.model.advance(elapsed);
			this.state = this.model.state;
			// All authority, including deadlines, is independent of requestAnimationFrame.
			if (t - this._lastPublish >= 1000 / AUTH_HZ) {
				this._emit();
				if (this.mode !== "solo") this._publish(t - this._lastFull >= 3000);
				else this._lastPublish = t;
			}
			if (
				["victory", "defeat"].includes(this.state.phase) &&
				this.mode === "hub"
			)
				this.finish(
					this.state.phase === "victory" && this.state.shared.treasureClaimed,
				);
		}
		if (this.mode === "solo") return;
		if (
			!this.isHost &&
			this.running &&
			this._commands.length &&
			t - this._lastClientSend >= 125
		) {
			const chosen = this._commands.shift();
			this._queue(
				"cmd",
				chosen.action,
				this.mode === "hub" ? this._hubHost : null,
				false,
				chosen,
			);
			this._lastClientSend = t;
		}
		if (
			!this.isHost &&
			t - this._lastHeartbeat >= 1000 &&
			(this.running || this.mode === "hub")
		) {
			this._queue(
				"ping",
				{ live: this.running },
				this.mode === "hub" ? this._hubHost : null,
			);
			this._lastHeartbeat = t;
		}
		this._flush();
	}

	finish(won = false) {
		if (this.mode !== "hub" || !this.isHost || this._finished || this.ended)
			return false;
		this._finished = true;
		this.running = false;
		const success =
			won === true &&
			this.state?.phase === "victory" &&
			this.state?.shared?.treasureClaimed === true &&
			this.state?.modified !== true;
		const ids = this._participants.map((player) => Number(player.id));
		const depth = (this.state?.floor ?? 0) + 1;
		const stats = Object.fromEntries(
			ids.map((id) => [
				id,
				{
					Depth: depth,
					Treasure: success ? 1 : 0,
					"Boss defeated": this.state?.shared?.bossDefeated ? 1 : 0,
					Rounds: this.state?.stats?.rounds ?? this.state?.tick ?? 0,
				},
			]),
		);
		const score = success
			? 1000
			: depth * 100 + (this.state?.shared?.bossDefeated ? 50 : 0);
		this._hub.finish({
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, score])),
			won: success,
			stats,
		});
		return true;
	}

	_connectionLost(message) {
		if (this.ended) return;
		clearTimeout(this._rtcTimer);
		clearTimeout(this._disconnectedTimer);
		if (this.mode === "rtc-host" && this.model && this._handshaken) {
			this.model.leave("1");
			this._outbox = [];
			this._commands = [];
			this._generation++;
			const pc = this.pc;
			this.pc = null;
			if (this.channel) {
				this.channel.onclose = null;
				this.channel.onmessage = null;
				this.channel.onopen = null;
				try {
					this.channel.close();
				} catch {}
			}
			this.channel = null;
			if (pc) {
				pc.onconnectionstatechange = null;
				pc.close();
			}
			this._mode("solo", "0", true);
			this.running = true;
			this._status(
				`${message} The host continues alone; departed gear is recoverable.`,
			);
			this._emit();
			return;
		}
		this._end(
			this.mode === "rtc-guest" && this._handshaken
				? `${message} The host is gone. This expedition has ended; host migration is unavailable.`
				: message,
			true,
		);
	}

	_end(reason, closePeer = true) {
		if (this.ended) return;
		this.ended = true;
		this.running = false;
		if (this._interval) clearInterval(this._interval);
		this._interval = null;
		clearTimeout(this._rtcTimer);
		clearTimeout(this._disconnectedTimer);
		this._outbox = [];
		this._commands = [];
		this._parts.clear();
		if (closePeer) {
			this._generation++;
			const pc = this.pc;
			this.pc = null;
			if (this.channel) {
				this.channel.onclose = null;
				this.channel.onmessage = null;
				try {
					this.channel.close();
				} catch {}
			}
			this.channel = null;
			if (pc) {
				pc.onconnectionstatechange = null;
				pc.close();
			}
		}
		this._status(reason);
		this._call("onEnd", reason);
	}

	cancel() {
		if (this.mode === "hub" && !this.ended)
			return { ok: false, message: "The Hub owns this round." };
		this.close();
		this._mode("solo", "0", true);
		this._status(
			"Invitation canceled. Solo or a fresh invitation is available.",
		);
		return { ok: true };
	}

	close() {
		this._generation++;
		this._cancelGather?.();
		this._cancelGather = null;
		if (this._interval) clearInterval(this._interval);
		this._interval = null;
		clearTimeout(this._rtcTimer);
		clearTimeout(this._disconnectedTimer);
		for (const unsubscribe of this._unsub) unsubscribe();
		this._unsub = [];
		const pc = this.pc;
		this.pc = null;
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.onmessage = null;
			this.channel.onopen = null;
			try {
				this.channel.close();
			} catch {}
		}
		this.channel = null;
		if (pc) {
			pc.onconnectionstatechange = null;
			pc.ondatachannel = null;
			pc.close();
		}
		this.model = null;
		this.state = null;
		this.running = false;
		this.ended = true;
		this._handshaken = false;
		this.rules = Object.freeze(inviteRules());
		this._outbox = [];
		this._commands = [];
		this._parts.clear();
		this._seen.clear();
		this._published = null;
		this._revision = 0;
		this._receivedRevision = -1;
		this._seq = 0;
		this._lastPublish = -Infinity;
		this._lastFull = -Infinity;
		this._lastSend = -Infinity;
		this._lastHeartbeat = -Infinity;
		this._lastClientSend = -Infinity;
	}

	diagnostics() {
		return {
			mode: this.mode,
			authority: this.isHost,
			server: this.server,
			run: this._run,
			running: this.running,
			ended: this.ended,
			paused: this.paused,
			allowSoloSave: this.allowSoloSave,
			rules: this.rules,
			connection: this.pc?.connectionState ?? null,
			channel: this.channel?.readyState ?? null,
			revision: this.isHost ? this._revision : this._receivedRevision,
			queue: this._outbox.length,
			pendingInputs: this._commands.length,
			traffic: {
				...this._traffic,
				maxPerSecond: Math.max(
					this._traffic.maxPerSecond,
					this._traffic.secondCount,
				),
			},
		};
	}
}
