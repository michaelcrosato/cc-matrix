// Shared wire format. Authority always comes from the transport's sender identity.
export const PROTOCOL = 1;
export const PEER_VERSION = "1.5.5";
export const HUB_REVISION = "35a1047f2067b2af3de3943f0fe452f39105d869";
export const INPUT_TTL = 0.35;
export const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const phaseNames = [
	"countdown",
	"playing",
	"intermission",
	"finale",
	"ending",
	"results",
];
const threatNames = ["missile", "mine", "roller", "hunter"];
const round = (value) =>
	Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
export function validInput(packet, previousSequence = -1) {
	return (
		!!packet &&
		packet.t === "a" &&
		Number.isInteger(packet.g) &&
		packet.g >= 0 &&
		packet.g <= 4294967295 &&
		Number.isSafeInteger(packet.q) &&
		packet.q > previousSequence &&
		packet.q >= 0 &&
		Number.isFinite(packet.m) &&
		packet.m >= -1 &&
		packet.m <= 1 &&
		(packet.x === null ||
			(Number.isFinite(packet.x) && packet.x >= -450 && packet.x <= 450)) &&
		typeof packet.f === "boolean" &&
		Number.isSafeInteger(packet.b) &&
		packet.b >= 0 &&
		packet.b <= 2147483647 &&
		Object.keys(packet).every((key) =>
			["t", "g", "q", "m", "x", "f", "b"].includes(key),
		)
	);
}
export function encodeAction(action, sequence, brakeSequence, generation = 0) {
	return {
		t: "a",
		g: generation,
		q: sequence,
		m: Math.max(-1, Math.min(1, Number(action.move) || 0)),
		x: Number.isFinite(action.targetX)
			? Math.max(-450, Math.min(450, action.targetX))
			: null,
		f: !!action.fire,
		b: brakeSequence,
	};
}
export function decodeAction(packet, brake) {
	return { move: packet.m, targetX: packet.x, fire: packet.f, brake };
}
export function roomCode(value) {
	const text = String(value || "").trim();
	try {
		const url = new URL(text);
		return (url.searchParams.get("room") || "")
			.toUpperCase()
			.replace(/[^A-Z2-9]/g, "")
			.slice(0, 8);
	} catch {
		return text
			.toUpperCase()
			.replace(/^TIMELOUT[ -]*/i, "")
			.replace(/[^A-Z2-9]/g, "")
			.slice(0, 8);
	}
}
export function validRoomCode(value) {
	return (
		value.length === 8 && [...value].every((c) => ROOM_ALPHABET.includes(c))
	);
}
export function makeRoomCode() {
	const values = new Uint8Array(8);
	globalThis.crypto.getRandomValues(values);
	return [...values]
		.map((v) => ROOM_ALPHABET[v % ROOM_ALPHABET.length])
		.join("");
}
export function encodeWorld(w) {
	// Only display state crosses the wire; gameplay remains exclusively on the host.
	return [
		[
			w.tick,
			round(w.time),
			round(w.hostileTime),
			phaseNames.indexOf(w.phase),
			round(w.phaseTime),
			w.wave,
			w.bossPhase,
			w.score,
			round(w.charge),
			round(w.brake),
			round(w.cooldown),
			w.seed,
			w.outcome,
			!!w.modified,
			!!w.demo,
			(w.assists?.autoFire ? 1 : 0) |
				(w.assists?.reducedSpeed ? 2 : 0) |
				(w.assists?.emergencyBrake ? 4 : 0),
			round(w.encounterTime),
			!!w.assisted,
		],
		w.players.map((p) => [
			p.id,
			p.name,
			round(p.x),
			p.hp,
			round(p.invuln),
			round(p.vx),
			round(p.recoil),
			p.connected !== false,
			p.colorIndex,
			round(p.hit),
		]),
		w.enemies.map((e) => [
			e.id,
			e.kind,
			round(e.x),
			round(e.y),
			e.hp,
			round(e.angle),
			round(e.arrival),
			round(e.delay),
			e.maxHp || e.hp,
			round(e.hit),
		]),
		w.threats.map((t) => [
			t.id,
			threatNames.indexOf(t.type),
			round(t.x),
			round(t.y),
			round(t.vx),
			round(t.vy),
			round(t.r),
			round(t.warning),
			round(t.age),
			t.targetId,
			round(t.targetX),
			round(t.targetY),
			!!t.grounded,
			round(t.left),
			round(t.right),
			round(t.safeX),
			round(t.life),
			!!t.committed,
			round(t.angle),
		]),
		w.shots.map((s) => [s.id, s.owner, round(s.x), round(s.y)]),
		w.boss
			? [
					round(w.boss.x),
					round(w.boss.y),
					w.boss.hp,
					w.boss.maxHp,
					!!w.boss.vulnerable,
					round(w.boss.cycle),
					w.boss.phase,
					round(w.boss.hit),
				]
			: null,
		w.stats || {},
		w.subtitle || "",
		(w.events || []).slice(-32),
	];
}
export function decodeWorld(data) {
	if (!Array.isArray(data) || data.length !== 9 || !Array.isArray(data[0]))
		throw new Error("Invalid world packet");
	const [h, players, enemies, threats, shots, b, stats, subtitle, events] =
		data;
	if (
		!Number.isSafeInteger(h[0]) ||
		!phaseNames[h[3]] ||
		![players, enemies, threats, shots].every(Array.isArray) ||
		players.length > 4 ||
		enemies.length > 100 ||
		threats.length > 100 ||
		shots.length > 8
	)
		throw new Error("Invalid world bounds");
	return {
		tick: h[0],
		time: h[1],
		hostileTime: h[2],
		phase: phaseNames[h[3]],
		phaseTime: h[4],
		wave: h[5],
		bossPhase: h[6],
		score: h[7],
		charge: h[8],
		brake: h[9],
		cooldown: h[10],
		seed: h[11],
		outcome: h[12],
		modified: h[13],
		demo: h[14],
		encounterTime: h[16],
		assisted: !!h[17],
		assists: {
			autoFire: !!(h[15] & 1),
			reducedSpeed: !!(h[15] & 2),
			emergencyBrake: !!(h[15] & 4),
		},
		players: players.map((p) => ({
			id: p[0],
			name: p[1],
			x: p[2],
			y: 240,
			hp: p[3],
			invuln: p[4],
			vx: p[5],
			recoil: p[6],
			connected: p[7],
			colorIndex: p[8],
			hit: p[9],
		})),
		enemies: enemies.map((e) => ({
			id: e[0],
			kind: e[1],
			x: e[2],
			y: e[3],
			px: e[2],
			py: e[3],
			hp: e[4],
			angle: e[5],
			arrival: e[6],
			delay: e[7],
			maxHp: e[8],
			hit: e[9],
		})),
		threats: threats.map((t) => ({
			id: t[0],
			type: threatNames[t[1]],
			x: t[2],
			y: t[3],
			px: t[2],
			py: t[3],
			vx: t[4],
			vy: t[5],
			r: t[6],
			warning: t[7],
			age: t[8],
			targetId: t[9],
			targetX: t[10],
			targetY: t[11],
			grounded: t[12],
			left: t[13],
			right: t[14],
			safeX: t[15],
			life: t[16],
			committed: t[17],
			angle: t[18],
		})),
		shots: shots.map((s) => ({
			id: s[0],
			owner: s[1],
			x: s[2],
			y: s[3],
			py: s[3],
		})),
		boss: b
			? {
					x: b[0],
					y: b[1],
					hp: b[2],
					maxHp: b[3],
					vulnerable: b[4],
					cycle: b[5],
					phase: b[6],
					hit: b[7],
				}
			: null,
		stats,
		subtitle,
		events: Array.isArray(events) ? events : [],
	};
}
export function packetBytes(data) {
	return new TextEncoder().encode(JSON.stringify(data)).byteLength;
}
export function splitWorld(world, revision) {
	const value = JSON.stringify(encodeWorld(world));
	const chunks = [];
	// Character chunks need a byte check because Hub names may be non-ASCII.
	let offset = 0;
	while (offset < value.length) {
		let size = Math.min(800, value.length - offset);
		while (
			packetBytes({
				t: "s",
				r: revision,
				i: chunks.length,
				n: 99,
				d: value.slice(offset, offset + size),
			}) > 1150 &&
			size > 20
		)
			size -= 20;
		chunks.push(value.slice(offset, offset + size));
		offset += size;
	}
	return chunks.map((d, i) => ({
		t: "s",
		r: revision,
		i,
		n: chunks.length,
		d,
	}));
}
