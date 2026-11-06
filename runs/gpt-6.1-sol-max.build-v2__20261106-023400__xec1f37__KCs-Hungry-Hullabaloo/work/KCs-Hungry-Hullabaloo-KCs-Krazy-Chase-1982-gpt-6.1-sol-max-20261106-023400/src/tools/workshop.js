import { clone, GARDENS } from "../content/gardens.js";
import { MazeGraph, same, validateLevel } from "../sim/maze.js";
export const BRUSHES = [
	"Floor",
	"Wall",
	"Tree",
	"Nursery",
	"Crawler route",
	"Sentry 1",
	"Sentry 2",
	"Wrap pair",
];
export class Workshop {
	constructor(level = GARDENS[0]) {
		this.original = clone(level);
		this.level = clone(level);
		this.level.id = "custom";
		this.name = "Moonmint doodle";
		this.cursor = [1, 1];
		this.brush = 0;
		this.undoStack = [];
		this.redoStack = [];
		this.pendingWrap = null;
		this.routeIndex = 0;
		this.route = [];
		this.message = "Paint a passage. Plot a predicament.";
		this.validation = validateLevel(this.level);
	}
	remember() {
		this.undoStack.push(clone(this.level));
		if (this.undoStack.length > 60) this.undoStack.shift();
		this.redoStack = [];
	}
	edit(c = this.cursor, record = true) {
		const l = this.level,
			[x, y] = c;
		if (x < 0 || y < 0 || x >= l.w || y >= l.h) return;
		const mode = BRUSHES[this.brush];
		if (record) this.remember();
		const tile = (v) => {
			const r = l.rows[y].split("");
			r[x] = v;
			l.rows[y] = r.join("");
		};
		if (mode === "Floor") tile(".");
		if (mode === "Wall") tile("#");
		if (mode === "Tree") {
			tile(".");
			const i = l.trees.findIndex((n) => same(n, c));
			if (i >= 0) l.trees.splice(i, 1);
			else l.trees.push(c.slice());
		}
		if (mode === "Nursery") {
			tile(".");
			l.nursery = [c.slice(), [x + 1, y]];
			if (x + 1 < l.w - 1) {
				const r = l.rows[y].split("");
				r[x + 1] = ".";
				l.rows[y] = r.join("");
			}
		}
		if (mode.startsWith("Sentry")) {
			tile(".");
			l.sentries[mode === "Sentry 1" ? 0 : 1] = c.slice();
		}
		if (mode === "Crawler route") {
			tile(".");
			const g = new MazeGraph(l);
			if (!this.route.length || same(this.route.at(-1), c)) {
				this.route = [c.slice()];
				this.message = "Mark a continuous route, oldest tail to head.";
			} else {
				const path = g.path(this.route.at(-1), c);
				if (path.length > 1) {
					this.route.push(...path.slice(1));
					this.route = this.route.filter(
						(n, i, a) => a.findIndex((m) => same(m, n)) === i,
					);
				}
			}
			if (this.route.length >= 7) {
				l.crawlers[this.routeIndex] = {
					route: clone(this.route),
					segments: Math.min(7, this.route.length - 2),
				};
				this.message = "Route set. Keep drawing, or change brush.";
			}
		}
		if (mode === "Wrap pair") {
			const d =
				x === 0
					? [-1, 0]
					: x === l.w - 1
						? [1, 0]
						: y === 0
							? [0, -1]
							: y === l.h - 1
								? [0, 1]
								: null;
			if (!d) {
				this.message = "Wrap mouths belong at the outer edge.";
				this.undoStack.pop();
				return;
			}
			tile(".");
			if (!this.pendingWrap) {
				this.pendingWrap = { a: c.slice(), ad: d };
				this.message = "Now mark the other edge mouth.";
			} else {
				l.wraps = l.wraps.filter(
					(w) =>
						![w.a, w.b].some((n) => same(n, c) || same(n, this.pendingWrap.a)),
				);
				l.wraps.push({
					...this.pendingWrap,
					b: c.slice(),
					bd: d,
					label: String.fromCharCode(65 + l.wraps.length),
				});
				this.pendingWrap = null;
				this.message = "A paired passage. A portal of possibility!";
			}
		}
		this.validation = validateLevel(l);
	}
	undo() {
		if (!this.undoStack.length) return;
		this.redoStack.push(clone(this.level));
		this.level = this.undoStack.pop();
		this.pendingWrap = null;
		this.route = [];
		this.validate();
	}
	redo() {
		if (!this.redoStack.length) return;
		this.undoStack.push(clone(this.level));
		this.level = this.redoStack.pop();
		this.pendingWrap = null;
		this.route = [];
		this.validate();
	}
	reset() {
		this.remember();
		this.level = clone(this.original);
		this.level.id = "custom";
		this.route = [];
		this.pendingWrap = null;
		this.validate();
	}
	validate() {
		this.validation = validateLevel(this.level);
		this.message = this.validation.ok
			? this.validation.warnings[0] || "Garden approved. Bon appétit!"
			: this.validation.errors[0].text;
		if (!this.validation.ok)
			this.cursor = this.validation.errors[0].cell || [1, 1];
		return this.validation;
	}
	export() {
		return JSON.stringify(
			{
				format: "hullabaloo-garden",
				version: 1,
				name: this.name,
				level: this.level,
			},
			null,
			2,
		);
	}
	import(text) {
		let data;
		try {
			data = JSON.parse(text);
		} catch {
			this.message = "That JSON has a crooked comma.";
			return false;
		}
		if (data?.format !== "hullabaloo-garden" || data.version !== 1) {
			this.message = "Choose a version 1 Hullabaloo garden.";
			return false;
		}
		const v = validateLevel(data.level);
		if (!v.ok) {
			this.message = v.errors[0].text;
			return false;
		}
		this.remember();
		this.level = clone(data.level);
		this.name = String(data.name || "Imported garden").slice(0, 24);
		this.original = clone(this.level);
		this.validate();
		return true;
	}
	setTheme(n) {
		this.remember();
		this.level.theme = (n + 5) % 5;
	}
	setCrawlerCount(n) {
		this.remember();
		if (n === 1) this.level.crawlers = this.level.crawlers.slice(0, 1);
		else if (this.level.crawlers.length === 1) {
			const first = clone(this.level.crawlers[0]);
			first.route = first.route.slice().reverse();
			this.level.crawlers.push(first);
		}
		this.routeIndex = Math.min(this.routeIndex, n - 1);
		this.route = [];
		this.validate();
	}
}
