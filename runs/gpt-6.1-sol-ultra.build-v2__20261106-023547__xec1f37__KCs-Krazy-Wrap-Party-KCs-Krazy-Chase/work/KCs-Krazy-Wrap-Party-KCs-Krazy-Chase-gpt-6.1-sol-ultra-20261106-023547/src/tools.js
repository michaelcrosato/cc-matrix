(function (root) {
	"use strict";
	const copy = (value) => JSON.parse(JSON.stringify(value));
	const PREFIX = "wrap-party:v1:";
	const memory = new Map();
	const storage = {
		available: true,
		get(key, fallback = null) {
			try {
				const raw =
					typeof localStorage !== "undefined"
						? localStorage.getItem(PREFIX + key)
						: memory.get(key);
				return raw ? JSON.parse(raw) : fallback;
			} catch (_) {
				storage.available = false;
				try {
					return memory.has(key) ? JSON.parse(memory.get(key)) : fallback;
				} catch (_) {
					return fallback;
				}
			}
		},
		set(key, value) {
			const raw = JSON.stringify(value);
			memory.set(key, raw);
			try {
				if (typeof localStorage !== "undefined")
					localStorage.setItem(PREFIX + key, raw);
			} catch (_) {
				storage.available = false;
			}
		},
		remove(key) {
			memory.delete(key);
			try {
				if (typeof localStorage !== "undefined")
					localStorage.removeItem(PREFIX + key);
			} catch (_) {
				storage.available = false;
			}
		},
	};
	function checkpoint(S, state) {
		if (state.modified || state.demo || state.custom) return false;
		storage.set("checkpoint", { version: 1, state: S.snapshot(state) });
		return true;
	}
	function loadCheckpoint(S) {
		const data = storage.get("checkpoint");
		if (
			!data ||
			data.version !== 1 ||
			!data.state ||
			!Number.isInteger(data.state.garden) ||
			data.state.garden < 0 ||
			data.state.garden > 4 ||
			data.state.modified ||
			data.state.demo ||
			!Array.isArray(data.state.players) ||
			data.state.players.length !== 1 ||
			!["playing", "clear"].includes(data.state.status)
		)
			return null;
		try {
			if (S.validate(data.state.level).length) return null;
			const s = S.restore(data.state);
			if (!Number.isFinite(s.score) || !Number.isFinite(s.lives) || s.lives < 1)
				return null;
			return s;
		} catch (_) {
			return null;
		}
	}
	class Workshop {
		constructor(S, level) {
			this.S = S;
			this.level = copy(level || S.levels[0]);
			this.level.id = "workshop";
			this.level.name = "My Wrap Party";
			this.level.quip = "Your hedges. Your hilarity.";
			this.cursor = [1, 1];
			this.brush = 0;
			this.pendingWrap = null;
			this.undoStack = [];
			this.redoStack = [];
			this.errors = [];
			this.message =
				"Choose Tools to pick a brush. Paint with confirm or a tap.";
			this.brushes = [
				"Wall",
				"Floor",
				"Tree",
				"Nursery",
				"Crawler 1",
				"Crawler 2",
				"Sentry 1",
				"Sentry 2",
				"Wrap pair",
				"Erase wrap",
			];
		}
		remember() {
			this.undoStack.push(copy(this.level));
			if (this.undoStack.length > 100) this.undoStack.shift();
			this.redoStack.length = 0;
		}
		reset(level) {
			this.remember();
			this.level = copy(level || this.S.levels[0]);
			this.level.id = "workshop";
			this.level.name = "My Wrap Party";
			this.pendingWrap = null;
		}
		move(dx, dy) {
			this.cursor[0] = Math.max(
				0,
				Math.min(this.level.w - 1, this.cursor[0] + dx),
			);
			this.cursor[1] = Math.max(
				0,
				Math.min(this.level.h - 1, this.cursor[1] + dy),
			);
		}
		paint(cell = this.cursor) {
			const [x, y] = cell,
				L = this.level;
			if (x < 0 || y < 0 || x >= L.w || y >= L.h) return false;
			this.cursor = [x, y];
			const tool = this.brushes[this.brush];
			if (
				tool === "Wrap pair" &&
				x !== 0 &&
				y !== 0 &&
				x !== L.w - 1 &&
				y !== L.h - 1
			) {
				this.message = "Wrap mouths belong on the outer edge.";
				return false;
			}
			this.remember();
			const set = (c) => {
				const row = L.rows[y].split("");
				row[x] = c;
				L.rows[y] = row.join("");
			};
			const same = (p) => p[0] === x && p[1] === y;
			if (tool === "Wall") {
				set("#");
				L.trees = (L.trees || []).filter((p) => !same(p));
			} else if (tool === "Floor") set(".");
			else if (tool === "Tree") {
				set(".");
				L.trees ||= [];
				if (L.trees.some(same)) L.trees = L.trees.filter((p) => !same(p));
				else L.trees.push([x, y]);
			} else if (tool === "Nursery") {
				set(".");
				L.nursery = [x, y];
			} else if (tool.startsWith("Crawler")) {
				set(".");
				const i = tool.endsWith("2") ? 1 : 0;
				L.crawlers[i] = {
					spawn: [x, y],
					segments: L.crawlers[i]?.segments || 5,
				};
			} else if (tool.startsWith("Sentry")) {
				set(".");
				L.sentries[tool.endsWith("2") ? 1 : 0] = [x, y];
			} else if (tool === "Wrap pair") {
				set(".");
				if (!this.pendingWrap) {
					this.pendingWrap = [x, y];
					this.message =
						"First mouth placed. Paint its matching mouth on another edge.";
					return true;
				}
				if (same(this.pendingWrap)) {
					this.message = "Choose a different edge cell for the partner.";
					return false;
				}
				L.wraps ||= [];
				L.wraps = L.wraps.filter(
					(p) =>
						!same(p.a) &&
						!same(p.b) &&
						!p.a.every((v, i) => v === this.pendingWrap[i]) &&
						!p.b.every((v, i) => v === this.pendingWrap[i]),
				);
				L.wraps.push({ a: this.pendingWrap, b: [x, y] });
				this.pendingWrap = null;
			} else if (tool === "Erase wrap")
				L.wraps = (L.wraps || []).filter((p) => !same(p.a) && !same(p.b));
			this.message = tool + " painted at " + x + ", " + y + ".";
			this.errors = [];
			return true;
		}
		undo() {
			if (!this.undoStack.length) return false;
			this.redoStack.push(copy(this.level));
			this.level = this.undoStack.pop();
			this.pendingWrap = null;
			this.message = "Undone.";
			return true;
		}
		redo() {
			if (!this.redoStack.length) return false;
			this.undoStack.push(copy(this.level));
			this.level = this.redoStack.pop();
			this.message = "Redone.";
			return true;
		}
		validate() {
			this.errors = this.S.validate(this.level);
			if (this.pendingWrap)
				this.errors.unshift("Finish the pending wrap pair.");
			this.message = this.errors.length
				? this.errors[0]
				: "Garden approved! Every passage is connected.";
			const match = this.message.match(/\b(\d+)[, ]+(\d+)\b/);
			if (match) this.cursor = [+match[1], +match[2]];
			return this.errors;
		}
		save(slot = 0) {
			if (this.validate().length) return false;
			storage.set("garden:" + slot, {
				version: 1,
				name: this.level.name,
				level: this.level,
			});
			this.message = storage.available
				? "Saved as " + this.level.name + "."
				: "Saved for this visit; browser storage is unavailable.";
			return true;
		}
		load(slot = 0) {
			const data = storage.get("garden:" + slot);
			if (!data || data.version !== 1 || this.S.validate(data.level).length) {
				this.message = "No valid garden in this slot.";
				return false;
			}
			this.remember();
			this.level = copy(data.level);
			this.pendingWrap = null;
			this.message = "Loaded " + this.level.name + ".";
			return true;
		}
		export() {
			return JSON.stringify(
				{ version: 1, name: this.level.name, level: this.level },
				null,
				2,
			);
		}
		import(text) {
			try {
				if (text.length > 200000) throw new Error("Garden file is too large.");
				const data = JSON.parse(text);
				if (data.version !== 1 || !data.level)
					throw new Error("Expected a version 1 garden file.");
				const errors = this.S.validate(data.level);
				if (errors.length) throw new Error(errors[0]);
				this.remember();
				this.level = copy(data.level);
				this.level.id = "workshop";
				this.pendingWrap = null;
				this.message = "Imported " + this.level.name + ".";
				return true;
			} catch (err) {
				this.message = "Import: " + err.message;
				return false;
			}
		}
	}
	const api = { storage, checkpoint, loadCheckpoint, Workshop, copy };
	root.GardenTools = api;
	if (typeof module !== "undefined") module.exports = api;
})(globalThis);
