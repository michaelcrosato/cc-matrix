import { DEFAULT_TUNING } from "../../content/stages.js";
import { clamp, clone, newWorld } from "../sim/world.js";
export const TYPES = ["left", "right", "bell"],
	PHASES = ["play", "result", "failed", "ending"],
	BOSS = ["move", "open", "pulse"];
export const EVENTS = [
	"arrival",
	"warning",
	"ray",
	"dry",
	"zap",
	"mature",
	"recover",
	"charge",
	"collapse",
	"loss",
	"fallen",
	"encounter",
	"clear",
	"expose",
	"pulse-warning",
	"pulse",
	"victory",
	"defeat",
	"shell-push",
	"unstuck",
	"leave",
];
const n = (v) => Math.round((v || 0) * 10) / 10;
const statsKeys = [
	"kills",
	"rays",
	"zaps",
	"losses",
	"clears",
	"refills",
	"maturations",
	"bossExposures",
	"bossPulses",
	"focusTicks",
	"contactTicks",
	"recoveries",
];
export function pack(s) {
	return {
		t: "s",
		v: 1,
		k: s.tick,
		z: s.seed,
		i: s.stage,
		q: PHASES.indexOf(s.phase),
		tm: n(s.time),
		ts: n(s.stageTime),
		pt: n(s.phaseT),
		sc: s.score,
		ss: s.streak,
		a: s.assisted ? 1 : 0,
		p: s.players.map((p) => [
			p.id,
			n(p.x),
			n(p.y),
			p.bees,
			p.charge,
			p.focus ? 1 : 0,
			n(p.facing),
			n(p.inv),
			n(p.lostAt),
			p.lastRay,
			p.joined ? 1 : 0,
			n(p.vx),
			n(p.vy),
		]),
		b: s.targets.map((a) => [
			a.id,
			TYPES.indexOf(a.type),
			n(a.x),
			n(a.y),
			n(a.hp),
			n(a.maxHp),
			n(a.dir),
			n(a.warning),
			BOSS.indexOf(a.bossPhase),
			n(a.bossT),
			a.circuit,
			a.recovering ? 1 : 0,
		]),
		r: s.rivals.map((a) => [
			a.id,
			n(a.x),
			n(a.y),
			n(a.dir),
			n(a.age),
			a.state,
			n(a.warning),
			n(a.matureAt),
		]),
		h: s.husks.map((a) => [
			a.id,
			n(a.x),
			n(a.y),
			n(a.r),
			TYPES.indexOf(a.type),
			n(a.born),
		]),
		e: s.events
			.slice(-8)
			.map((e) => [
				e.id,
				EVENTS.indexOf(e.type),
				n(e.t),
				e.x === undefined ? null : n(e.x),
				e.y === undefined ? null : n(e.y),
				e.player ?? null,
				e.points || 0,
				e.kind === undefined ? null : TYPES.indexOf(e.kind),
			]),
		eid: s.eid,
		c: s.queue.length,
		result: s.result,
		tu: Object.keys(DEFAULT_TUNING).map((k) => s.tuning[k]),
		st: statsKeys.map((k) => s.stats[k] || 0),
	};
}
export function validSnapshot(m) {
	return (
		m?.t === "s" &&
		m.v === 1 &&
		Number.isSafeInteger(m.k) &&
		m.k >= 0 &&
		Number.isInteger(m.i) &&
		m.i >= 0 &&
		m.i < 6 &&
		Number.isInteger(m.q) &&
		m.q >= 0 &&
		m.q < 4 &&
		Number.isFinite(m.sc) &&
		m.sc >= 0 &&
		Array.isArray(m.p) &&
		m.p.length >= 1 &&
		m.p.length <= 2 &&
		Array.isArray(m.b) &&
		m.b.length <= 5 &&
		Array.isArray(m.r) &&
		m.r.length <= 7 &&
		Array.isArray(m.h) &&
		m.h.length <= 24 &&
		Array.isArray(m.e) &&
		m.e.length <= 8 &&
		[...m.p, ...m.b, ...m.r, ...m.h].every(
			(a) =>
				Array.isArray(a) &&
				a.every((v) => typeof v === "number" && Number.isFinite(v)),
		)
	);
}
export function unpack(m, previous = null) {
	if (!validSnapshot(m)) return null;
	const s = previous || newWorld({ players: m.p.length, seed: m.z });
	Object.assign(s, {
		tick: m.k,
		seed: m.z,
		stage: m.i,
		phase: PHASES[m.q],
		time: m.tm,
		stageTime: m.ts,
		phaseT: m.pt,
		score: m.sc,
		streak: m.ss,
		assisted: !!m.a,
		eid: m.eid,
		result: m.result,
		queue: Array.from(
			{ length: Math.max(0, Math.min(20, m.c || 0)) },
			() => ({}),
		),
	});
	s.players = m.p.map((a) => ({
		id: a[0],
		x: a[1],
		y: a[2],
		bees: a[3],
		charge: a[4],
		focus: !!a[5],
		facing: a[6],
		inv: a[7],
		lostAt: a[8],
		lastRay: a[9],
		joined: !!a[10],
		vx: a[11],
		vy: a[12],
		contact: false,
	}));
	s.targets = m.b.map((a) => ({
		id: a[0],
		type: TYPES[a[1]],
		x: a[2],
		y: a[3],
		hp: a[4],
		maxHp: a[5],
		dir: a[6],
		warning: a[7],
		bossPhase: BOSS[a[8]],
		bossT: a[9],
		circuit: a[10],
		recovering: !!a[11],
		r: a[1] === 2 ? 17 : 7,
	}));
	s.rivals = m.r.map((a) => ({
		id: a[0],
		x: a[1],
		y: a[2],
		dir: a[3],
		age: a[4],
		state: a[5],
		warning: a[6],
		matureAt: a[7],
		r: 8,
	}));
	s.husks = m.h.map((a) => ({
		id: a[0],
		x: a[1],
		y: a[2],
		r: a[3],
		type: TYPES[a[4]],
		born: a[5],
	}));
	s.events = m.e.map((a) => ({
		id: a[0],
		type: EVENTS[a[1]],
		t: a[2],
		...(a[3] === null ? {} : { x: a[3] }),
		...(a[4] === null ? {} : { y: a[4] }),
		player: a[5],
		points: a[6],
		kind: TYPES[a[7]],
	}));
	Object.keys(DEFAULT_TUNING).forEach((k, i) => {
		s.tuning[k] = m.tu?.[i] ?? DEFAULT_TUNING[k];
	});
	statsKeys.forEach((k, i) => {
		s.stats[k] = m.st?.[i] || 0;
	});
	return s;
}
export function validateInput(packet, record, stage) {
	if (
		!packet ||
		packet.t !== "i" ||
		packet.v !== 1 ||
		packet.stage !== stage ||
		!Number.isSafeInteger(packet.seq) ||
		packet.seq < 0 ||
		packet.seq <= record.seq ||
		!Number.isFinite(packet.x) ||
		!Number.isFinite(packet.y) ||
		Math.abs(packet.x) > 1 ||
		Math.abs(packet.y) > 1 ||
		typeof packet.focus !== "boolean" ||
		!Number.isSafeInteger(packet.ray) ||
		packet.ray < record.ray ||
		packet.ray > record.ray + 16
	)
		return null;
	return {
		x: clamp(packet.x, -1, 1),
		y: clamp(packet.y, -1, 1),
		focus: packet.focus,
		ray: packet.ray,
	};
}
export class Authority {
	constructor({ host, local = 0, send, onSnapshot, onEnd }) {
		Object.assign(this, { host, local, send, onSnapshot, onEnd });
		this.records = new Map();
		this.seq = 0;
		this.nextSend = 0;
		this.lastTick = -1;
		this.ended = false;
		this.metrics = {
			sent: 0,
			received: 0,
			rejected: 0,
			maxBytes: 0,
			maxRate: 0,
			unreliableMax: 0,
			reliableSnapshots: 0,
		};
		this.times = [];
	}
	transmit(data, now, reliable = false) {
		if (this.ended) return;
		const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
		if (bytes > 16384) throw Error("Network packet exceeds 16 KiB");
		this.times = this.times.filter((t) => t > now - 1);
		if (this.times.length >= 18) return;
		this.times.push(now);
		this.metrics.sent++;
		this.metrics.maxBytes = Math.max(this.metrics.maxBytes, bytes);
		this.metrics.maxRate = Math.max(this.metrics.maxRate, this.times.length);
		if (!reliable)
			this.metrics.unreliableMax = Math.max(this.metrics.unreliableMax, bytes);
		this.send(data, { reliable });
	}
	receive(m, from, now, world) {
		if (this.ended || !m || typeof m !== "object") return;
		this.metrics.received++;
		if (this.host) {
			if (
				!world ||
				!Number.isInteger(from) ||
				!world.players[from]?.joined ||
				from === this.local
			) {
				this.metrics.rejected++;
				return;
			}
			const rec = this.records.get(from) || {
				seq: -1,
				ray: world.players[from].lastRay,
				time: -100,
				input: {},
			};
			const command = validateInput(m, rec, world.stage);
			if (!command) {
				this.metrics.rejected++;
				return;
			}
			rec.seq = m.seq;
			rec.ray = m.ray;
			rec.time = now;
			rec.input = command;
			this.records.set(from, rec);
		} else if (m.t === "s") {
			if (!validSnapshot(m) || m.k <= this.lastTick) {
				this.metrics.rejected++;
				return;
			}
			this.lastTick = m.k;
			this.onSnapshot(m);
		} else if (m.t === "end") {
			this.onEnd?.(m);
		}
	}
	commands(world, local, now) {
		return world.players.map((p) => {
			if (p.id === this.local) return local;
			const a = this.records.get(p.id);
			return a && now - a.time < 0.45
				? a.input
				: { x: 0, y: 0, focus: false, ray: a?.ray ?? p.lastRay };
		});
	}
	update(world, command, now) {
		if (this.ended || now < this.nextSend) return;
		this.nextSend = now + 1 / (this.host ? 12 : 15);
		if (this.host) {
			const packet = pack(world),
				bytes = JSON.stringify(packet).length,
				reliable = bytes > 1180;
			if (reliable) this.metrics.reliableSnapshots++;
			this.transmit(packet, now, reliable);
		} else
			this.transmit(
				{
					t: "i",
					v: 1,
					seq: ++this.seq,
					stage: world.stage,
					x: Math.round(command.x * 1000) / 1000,
					y: Math.round(command.y * 1000) / 1000,
					focus: !!command.focus,
					ray: command.ray,
				},
				now,
				false,
			);
	}
	neutralize(id) {
		this.records.delete(id);
	}
	stop() {
		this.ended = true;
		this.records.clear();
	}
}
