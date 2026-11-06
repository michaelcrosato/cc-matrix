import { clone, GARDENS } from "../content/gardens.js";
import { validateLevel } from "../sim/maze.js";
export class GardenStore {
	constructor(storage) {
		this.memory = {};
		this.available = true;
		try {
			this.storage = storage !== undefined ? storage : globalThis.localStorage;
			if (!this.storage) this.available = false;
		} catch {
			this.storage = null;
			this.available = false;
		}
	}
	read(k, fallback = null) {
		try {
			const raw = this.storage?.getItem(`hullabaloo:${k}`);
			if (!raw) return this.memory[k] ?? fallback;
			return JSON.parse(raw);
		} catch {
			this.available = false;
			return this.memory[k] ?? fallback;
		}
	}
	write(k, v) {
		this.memory[k] = clone(v);
		if (!this.storage) {
			this.available = false;
			return false;
		}
		try {
			this.storage.setItem(`hullabaloo:${k}`, JSON.stringify(v));
			return true;
		} catch {
			this.available = false;
			return false;
		}
	}
	checkpoint(world) {
		if (world.s.modified || world.s.demo || world.custom) return false;
		return this.write("checkpoint", {
			version: 1,
			mode: world.s.mode,
			snapshot: world.entry,
		});
	}
	loadCheckpoint() {
		const s = this.read("checkpoint");
		if (
			s?.version !== 1 ||
			!s.snapshot ||
			s.snapshot.version !== 1 ||
			!s.snapshot.s ||
			!GARDENS[s.snapshot.s.level] ||
			!Array.isArray(s.snapshot.players) ||
			s.snapshot.players.length < 1 ||
			s.snapshot.players.length > 2 ||
			!Array.isArray(s.snapshot.crawlers) ||
			!Array.isArray(s.snapshot.sentries) ||
			s.snapshot.s.modified ||
			s.snapshot.s.demo
		)
			return null;
		return s;
	}
	clearCheckpoint() {
		this.memory.checkpoint = null;
		try {
			this.storage?.removeItem("hullabaloo:checkpoint");
		} catch {
			this.available = false;
		}
	}
	unlock(n) {
		this.write("unlocked", {
			version: 1,
			count: Math.max(this.unlocked(), Math.min(5, n)),
		});
	}
	unlocked() {
		const v = this.read("unlocked");
		return v?.version === 1 && Number.isInteger(v.count)
			? Math.max(1, Math.min(5, v.count))
			: 1;
	}
	creations() {
		const a = this.read("creations", { version: 1, items: [] });
		return a?.version === 1 && Array.isArray(a.items)
			? a.items
					.filter(
						(v) => v && typeof v.name === "string" && validateLevel(v.level).ok,
					)
					.slice(0, 20)
			: [];
	}
	saveMaze(name, level) {
		if (!validateLevel(level).ok) return false;
		const list = this.creations(),
			item = {
				name: name.slice(0, 24) || "Moonmint doodle",
				level: clone(level),
			};
		const i = list.findIndex((x) => x.name === item.name);
		if (i >= 0) list[i] = item;
		else list.push(item);
		return this.write("creations", { version: 1, items: list.slice(-20) });
	}
}
