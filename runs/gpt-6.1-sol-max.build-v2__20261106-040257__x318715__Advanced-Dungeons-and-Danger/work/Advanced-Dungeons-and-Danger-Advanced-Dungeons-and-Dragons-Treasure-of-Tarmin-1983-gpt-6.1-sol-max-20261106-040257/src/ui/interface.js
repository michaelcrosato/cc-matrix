import { CONTENT, DEFAULT_TUNING, validateContent } from "../core/model.js";
import report from "../report.json";

const E = globalThis.My3D2dge;
export const EYE =
	'<svg viewBox="0 0 100 64" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M4 32Q50-9 96 32Q50 73 4 32ZM50 5V0M50 64V59M12 9l9 9M88 9l-9 9M12 55l9-9M88 55l-9-9"/><path d="M50 15l14 17-14 17-14-17Z"/><circle cx="50" cy="32" r="6" fill="currentColor"/></svg>';
export const QUESTIONS = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many would be considered critical issues / game breaking?",
		"What was the most helpful test you ran?",
		"What was the least helpful test you ran?",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"What was the most important thing you had to build yourself?",
		"What was the hardest part about using the engine?",
		"What did you change in the engine, and why? (none if nothing)",
		"If you could change one thing about the engine, what would it be?",
	],
	promptFeedback: [
		"What did you like most about this prompt?",
		"What was confusing?",
		"What was the hardest thing to do?",
		"What would you change in this prompt?",
	],
};
export const el = (tag, cls, text) => {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (text !== undefined) e.textContent = String(text);
	return e;
};
const titleCase = (k) =>
	k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const DX = [0, 1, 0, -1],
	DY = [-1, 0, 1, 0];
export class DangerShell extends E.Shell {
	constructor(game, opts, decorate) {
		super(game, opts);
		this.decorate = decorate;
		this.root?.classList.add("danger-shell");
		this.root?.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input");
			if (b && !b.disabled && document.activeElement?.tagName !== "TEXTAREA")
				b.focus({ preventScroll: true });
		});
	}
	show(name, spec = {}) {
		if (name === "help" && this.onHelp && !spec.sections) {
			this.onHelp();
			return this;
		}
		return super.show(name, spec);
	}
	_render() {
		super._render();
		if (this.root) {
			this.root.classList.add("danger-shell");
			const sh = this._els.scr.querySelector(".esh-sh");
			if (sh && this.screen) sh.classList.add("screen-" + this.screen);
			this.decorate?.(this.screen, sh);
			if (["credits", "help"].includes(this.screen)) {
				const panel = sh?.querySelector(".esh-mod");
				if (panel) {
					panel.tabIndex = 0;
					panel.focus({ preventScroll: true });
					panel.scrollTop = 0;
				}
			} else if (this.screen === "dev") {
				const panel = sh?.querySelector(".esh-mod");
				const first = panel?.querySelector("input[type='range']");
				if (first) {
					panel.scrollTop = 0;
					first.focus({ preventScroll: true });
				} else document.activeElement?.scrollIntoView?.({ block: "nearest" });
			} else if (
				sh?.querySelector(".esh-mod")?.contains(document.activeElement)
			) {
				document.activeElement.scrollIntoView({ block: "nearest" });
			}
		}
	}
	_focusables() {
		return this.root
			? [
					...this._els.scr.querySelectorAll(
						".esh-sh .esh-mod[tabindex='0'],.esh-sh button:not(:disabled),.esh-sh input:not(:disabled),.esh-sh textarea:not(:disabled),.esh-sh select:not(:disabled),.esh-sh a[href]",
					),
				]
			: [];
	}
	_nav(dir) {
		const panel = this._els.scr.querySelector(".esh-mod[tabindex='0']");
		if (panel && document.activeElement === panel) {
			const max = panel.scrollHeight - panel.clientHeight;
			if (dir === "down" && panel.scrollTop < max - 2) {
				panel.scrollTop = Math.min(
					max,
					panel.scrollTop + panel.clientHeight * 0.22,
				);
				return;
			}
			if (dir === "up" && panel.scrollTop > 0) {
				panel.scrollTop = Math.max(
					0,
					panel.scrollTop - panel.clientHeight * 0.22,
				);
				return;
			}
		}
		super._nav(dir);
	}
	_step() {
		const f = document.activeElement;
		if (f && ["TEXTAREA", "SELECT"].includes(f.tagName)) {
			if (this._game.input.pressed("cancel")) {
				f.blur();
				this.back();
			}
			return;
		}
		super._step();
	}
}
export class Interface {
	constructor(app) {
		this.app = app;
		this.game = app.game;
		this.selected = "right";
		this.targetId = null;
		this.invite = { role: "", status: "", output: "", input: "" };
		this._packItem = null;
		this.editor = structuredClone(CONTENT);
		this.editorFloor = 0;
		this.editorTile = { x: 1, y: 1 };
		this.editorMessage =
			"Choose a tile to inspect or change it. Export valid content to rebuild the HTML.";
		this.shell = new DangerShell(
			this.game,
			{
				standard: true,
				theme: {
					scale: 1,
					font: "Arial, sans-serif",
					titleFont: "Georgia, serif",
				},
				screens: {
					pause: {},
					help: { title: "Into the vault" },
					settings: {
						text: "Your expedition preferences. Choices apply immediately.",
					},
				},
			},
			(name, sh) => this.decorate(name, sh),
		);
		this.shell.onHelp = () => this.help();
		this.makeHUD();
		this.lastHUD = "";
	}
	get state() {
		return this.app.state;
	}
	get player() {
		return this.app.player;
	}
	get online() {
		return this.app.online;
	}
	get content() {
		return this.state?.content || CONTENT;
	}
	get isOpen() {
		return !!this.shell.screen;
	}
	label(action) {
		if (this.app.lastInput === "touch") return "";
		return this.game.input.label(action);
	}
	nameItem(id) {
		const s = this.state;
		const it = s?.items?.[id];
		return it ? this.content.items[it.kind]?.name || it.kind : "Empty hand";
	}
	itemDef(id) {
		return this.content.items[this.state?.items?.[id]?.kind] || null;
	}
	show(name, spec = {}) {
		this.app.unlockPointer();
		this.shell._els.toast.classList.remove("on");
		this.shell._toastEnd = 0;
		this.shell.show(name, spec);
		this.app.syncPause();
		return this;
	}
	hide() {
		this.shell.hide();
		this.app.syncPause();
	}
	title() {
		this.shell.hide();
		this.show("title", {
			name: report.aiHub.name,
			subtitle: "Two strengths. Six slots.\nNo way back.",
			actions: [
				["Begin expedition", () => this.app.newSolo()],
				{
					label: "Continue expedition",
					disabled: !this.app.saved(),
					fn: () => this.app.continueSolo(),
				},
				["Two adventurers", () => this.coop()],
				["Settings & controls", () => this.settings()],
				["About this expedition", () => this.credits()],
			],
			meta: ["3 authored floors", "1–2 adventurers", "Steel & spirit"],
			footer: "Inspired by Treasure of Tarmin · 1983",
			back: () => {},
		});
	}
	pause() {
		if (!this.state || this.app.attract) return;
		this.game.pause("menu");
		this.show("pause", {
			kicker: this.online
				? "Online · world remains live"
				: "The lantern is still",
			title: this.online ? "Expedition menu" : "Take a breath",
			text: this.online
				? "Your companion can still act. Local settings do not pause the shared world."
				: "Study your pack. The creatures will wait.",
			actions: [
				["The six-slot pack", () => this.pack()],
				["Explored map", () => this.map()],
				["Expedition tools", () => this.dev()],
				["About / Credits", () => this.credits()],
				...(!this.online
					? [
							["Export / import save", () => this.saves()],
							[
								"Return to title",
								() =>
									this.confirm(
										"Leave the vault?",
										"Your latest safe checkpoint is kept. Return here through Continue expedition.",
										() => this.app.returnTitle(),
									),
							],
						]
					: this.app.net.mode === "hub"
						? []
						: [
								[
									"Leave co-op",
									() =>
										this.confirm(
											"Leave your companion?",
											"The host continues alone if the guest leaves. Losing the host ends this connection.",
											() => this.app.returnTitle(),
										),
								],
							]),
			],
			back: () => this.hide(),
		});
	}
	settings() {
		this.show("settings", {
			kicker: this.online ? "Live shared world" : "Your preferences",
			text: "Music starts at 10%. Reduced motion keeps every enemy intention visible.",
		});
	}
	help() {
		this.show("help", {
			kicker: "Before you descend",
			title: "Read. Prepare. Commit.",
			sections: [
				[
					"Keep both strengths above zero",
					"▰ War is your body. ◇ Spirit is your resolve. Armor and a left-hand shield protect War; a worn ring protects Spirit. Either empty pool brings you down.",
				],
				[
					"Read the next blow",
					"Combat waits for your decision. Choose an attack or Guard, then commit. Attacks show their channel, cost and range. A defeated foe cannot strike back. Looking and inspecting are free.",
				],
				[
					"Carry with purpose",
					"Six pack slots, two hands. The right hand attacks. The left can hold a shield or another implement; quick-swap makes it active. Food and arrows have their own counters; keys cannot be dropped.",
				],
				[
					"Rest and commit",
					"In safety, a ration restores up to 8 War and 5 Spirit. Ladders and gates ask before carrying you onward. Inspect a ticking coffer before opening it. Look for blue seams.",
				],
				[
					"Claim the prize",
					"Break all three of the warden’s seals, then walk to the Emberheart and take it. Victory is yours only when the treasure is in your hands.",
				],
				[
					"Together",
					"Each adventurer carries a personal pack. The first committed action opens an 8-second planning window; both ready actions resolve early. A nearby ally can spend a ration to revive. Both living players must agree to descend.",
				],
				[
					"Touch gestures",
					"Drag the left half to step; drag the right half to look. Tap the contextual action to interact or commit. Double-tap the right half for your pack; two-finger tap for the map. The menu stays in the top corner.",
				],
			],
			actions: [
				["Rebind controls", () => this.show("controls")],
				["Back", () => this.shell.back()],
			],
		});
	}
	credits() {
		const sections = [];
		sections.push([
			"Source Information",
			Object.entries(report.sourceInformation)
				.map(([k, v]) => titleCase(k) + ": " + v)
				.join("\n\n"),
		]);
		for (const [key, title] of [
			["testingFeedback", "Testing Feedback"],
			["engineFeedback", "Engine Feedback"],
			["promptFeedback", "Prompt Feedback"],
		])
			sections.push([
				title,
				report[key]
					.map((a, i) => i + 1 + ". " + QUESTIONS[key][i] + "\n" + a)
					.join("\n\n"),
			]);
		sections.push([
			"Credits & licenses",
			"Original game, writing, geometry, rules, music and code: OpenAI gpt-6.1-sol. Source inspiration: Mattel Electronics / APh, Tom Loughry, 1983; original package illustration by Jerrol Richardson. my-3D2dge and World3D: Michael Crosato, MIT. three.js: three.js contributors, MIT. Rapier: Dimforge, Apache-2.0. AI Hub session client: Michael Crosato; pinned unmodified. Engine, three.js and Rapier license texts are embedded in the HTML source. No source game art, recorded music or audio files are used.",
		]);
		this.show("credits", {
			kicker: "Advanced Dungeons and Danger",
			title: "About this expedition",
			sections,
			actions: [["Back", () => this.shell.back()]],
		});
	}
	confirm(title, text, fn, yes = "Commit") {
		this.show("confirm", {
			kicker: this.online
				? "Shared expedition · live"
				: "Consider your next step",
			title,
			text,
			actions: [
				{
					label: yes,
					fn: () => {
						this.shell.back();
						fn();
						this.app.syncPause();
					},
				},
				[
					"Cancel",
					() => {
						this.shell.back();
						this.app.syncPause();
					},
				],
			],
		});
	}
	notice(title, text) {
		this.shell.toast(title, text, 4);
	}
	command(action) {
		return this.app.send(action);
	}
	interact() {
		const e = this.contextEntity();
		if (!e) {
			this.notice(
				"Nothing within reach",
				"Face a door, mural or object, or step closer.",
			);
			return;
		}
		this.entity(e);
	}
	contextEntity() {
		const s = this.state,
			p = this.player;
		if (!s || !p) return null;
		const at = [...Object.values(s.entities)].filter(
			(e) =>
				e.floor === s.floor &&
				!e.dead &&
				!e.claimed &&
				!e.taken &&
				!(e.type === "gate" && e.usedBy?.includes(p.id)) &&
				e.type !== "enemy" &&
				!(e.type === "chest" && e.open) &&
				dist(p, e) <= 1,
		);
		const forward = at.filter(
			(e) => e.x === p.x + DX[p.dir] && e.y === p.y + DY[p.dir],
		);
		const under = at.filter((e) => e.x === p.x && e.y === p.y);
		const list = [...under, ...forward, ...at];
		return (
			list.find(
				(e) =>
					!(e.type === "door" && e.open) &&
					!(e.type === "secret" && e.open) &&
					!(e.type === "loot" && e.claimed),
			) || null
		);
	}
	entity(e) {
		const s = this.state,
			p = this.player;
		if (!e || !p) return;
		if (e.type === "loot") {
			this.command({ type: "pickup", target: e.id });
			return;
		}
		if (e.type === "mural") {
			this.show("inspect", {
				kicker: "A warning in stone",
				title: e.name || "The watching eye",
				text: e.text,
				actions: [["Remember it", () => this.hide()]],
			});
			return;
		}
		if (e.type === "camp") {
			this.rest();
			return;
		}
		if (e.type === "ladder") {
			this.confirm(
				"Descend to " +
					(this.content.floors[e.toFloor]?.name || "the next vault") +
					"?",
				"The ladder is one way. Carry what you need; the party must agree. A viable floor-entry checkpoint will be kept.",
				() => {
					this.hide();
					this.command({ type: "descend", target: e.id, confirm: true });
				},
				this.online ? "Ready to descend" : "Descend",
			);
			return;
		}
		if (e.type === "gate") {
			this.show("gate", {
				kicker: "One-way transfer · read the cost",
				title: e.name,
				text: "This gate carries you to the far passage. Each adventurer chooses separately. Each pool remains at least 1. Choose which strength it favors.",
				actions: Object.entries(
					e.options || {
						war: { war: 6, spirit: -4 },
						spirit: { war: -4, spirit: 6 },
						balanced: { war: 0, spirit: 0 },
					},
				)
					.map(([k, v]) => [
						titleCase(k) +
							"  ·  ▰ War " +
							p.war +
							" → " +
							Math.max(1, Math.min(p.maxWar, p.war + v.war)) +
							"  /  ◇ Spirit " +
							p.spirit +
							" → " +
							Math.max(1, Math.min(p.maxSpirit, p.spirit + v.spirit)),
						() =>
							this.confirm(
								"Commit to the " + k + " gate?",
								"You cannot travel back through it. Your companion can follow and choose their own balance.",
								() => {
									this.hide();
									this.command({
										type: "interact",
										target: e.id,
										choice: k,
										confirm: true,
									});
								},
								"Pass through",
							),
					])
					.concat([["Leave the gate", () => this.hide()]]),
			});
			return;
		}
		if (e.type === "chest") {
			this.show("chest", {
				kicker:
					e.trapped && !e.disarmed
						? "Listen: a dry ticking"
						: "A sealed coffer",
				title: e.name,
				text: e.open
					? "The coffer stands open. Its contents lie nearby."
					: e.hint || "Dust lies thick on an untrapped latch.",
				actions: [
					...(e.trapped && !e.disarmed
						? [
								[
									"Disarm the silver wire · safe",
									() => {
										this.command({
											type: "interact",
											target: e.id,
											choice: "disarm",
										});
										this.hide();
									},
								],
							]
						: []),
					{
						label: e.open
							? "Already opened"
							: e.trapped && !e.disarmed
								? "Force open · 6 War before defense"
								: "Open the coffer",
						disabled: !!e.open,
						fn: () => {
							this.command({ type: "interact", target: e.id, choice: "open" });
							this.hide();
						},
					},
					["Leave it", () => this.hide()],
				],
			});
			return;
		}
		if (e.type === "treasure") {
			if (!s.shared.bossDefeated) {
				this.notice(
					"The guardian’s seals hold",
					"Defeat the warden before claiming the Emberheart.",
				);
				return;
			}
			this.confirm(
				"Claim the Emberheart?",
				"The warden is fallen. The treasure must be taken. This is the end of your expedition.",
				() => {
					this.hide();
					this.command({ type: "interact", target: e.id, choice: "confirm" });
				},
				"Take the treasure",
			);
			return;
		}
		this.command({ type: "interact", target: e.id });
	}
	pack() {
		const p = this.player;
		if (!p) return;
		this.show("pack", {
			kicker:
				this.state.phase === "combat"
					? "Round " +
						this.state.combat.round +
						" · gear changes use your action"
					: "Carry only what earns its place",
			title: "Six slots. Two hands.",
			text: "Select an object to equip, use, drop, or hand it to a nearby companion.",
			actions: p.pack
				.map((id, i) => ({
					label:
						i +
						1 +
						"  " +
						(id ? this.nameItem(id) : "Empty slot") +
						"\n" +
						(id ? this.itemTag(id) : "Space for an object"),
					disabled: !id,
					fn: () => this.item(i, id),
				}))
				.concat([
					[
						"Quick-swap hands",
						() => {
							this.hide();
							this.command({ type: "swap" });
						},
					],
					[
						"Use right-hand object",
						() => {
							this.hide();
							this.useHand();
						},
					],
					["Revive nearby companion", () => this.revive()],
					["Rest · one ration", () => this.rest()],
					["Back to the vault", () => this.hide()],
				]),
		});
	}
	itemTag(id) {
		const d = this.itemDef(id);
		if (!d) return "";
		return d.ammo
			? "1 arrow / shot"
			: d.channel && d.power
				? (d.channel === "war" ? "▰ WAR " : "◇ SPIRIT ") +
					d.power +
					" · " +
					(d.reusable ? "reusable" : "single use")
				: d.reusable
					? "Reusable"
					: "Single use";
	}
	item(slot, id) {
		const d = this.itemDef(id);
		if (!d) return;
		const p = this.player;
		const near = Object.values(this.state.players).find(
			(q) =>
				q.id !== p.id && q.connected !== false && !q.down && dist(p, q) <= 1,
		);
		this.show("item", {
			kicker: this.itemTag(id),
			title: d.name,
			text: d.description,
			actions: [
				...(d.family === "weapon" || d.family === "shield"
					? [
							[
								"Equip in right hand",
								() => {
									this.hide();
									this.command({ type: "equip", slot, hand: 1 });
								},
							],
							[
								"Equip in left hand",
								() => {
									this.hide();
									this.command({ type: "equip", slot, hand: 0 });
								},
							],
						]
					: []),
				...(d.use
					? [
							[
								"Use " + d.name,
								() => {
									this.hide();
									this.command({ type: "use", item: id });
								},
							],
						]
					: []),
				...(near
					? [
							[
								"Give to " + near.name,
								() => {
									this.hide();
									this.command({ type: "handoff", item: id, target: near.id });
								},
							],
						]
					: []),
				[
					"Drop at your feet",
					() => {
						this.hide();
						this.command({ type: "drop", slot });
					},
				],
				["Back to pack", () => this.shell.back()],
			],
		});
	}
	useHand() {
		const id = this.player?.hands?.[1],
			d = this.itemDef(id);
		if (d?.use) this.command({ type: "use", item: id });
		else
			this.notice(
				"Hold a useful object",
				"Use the pack to drink a potion, put on armor or a ring, or read a book.",
			);
	}
	fullPack(target) {
		const e = this.state.entities[target];
		if (!e) return;
		const incoming = this.state.items[e.itemId],
			d = this.content.items[incoming?.kind || e.kind];
		this.show("packfull", {
			kicker: "Six slots are occupied",
			title: d?.name || e.name || "An object at your feet",
			text:
				(d?.description || "") +
				" Choose one pack object to leave here. Cancel keeps this object safely in the world.",
			actions: this.player.pack
				.map((id, i) => [
					"Leave " + this.nameItem(id) + " / take this",
					() => {
						this.hide();
						this.command({ type: "pickup", target, swap: i });
					},
				])
				.concat([["Leave it where it lies", () => this.hide()]]),
		});
	}
	rest() {
		const p = this.player,
			t = this.state?.tuning || DEFAULT_TUNING;
		if (!p) return;
		const w = Math.min(t.rationWar, p.maxWar - p.war),
			sp = Math.min(t.rationSpirit, p.maxSpirit - p.spirit);
		this.confirm(
			"Rest by the lantern?",
			"Cost: 1 ration (" +
				p.food +
				" carried). Restore exactly ▰ " +
				w +
				" War and ◇ " +
				sp +
				" Spirit. Rest requires safety; full strengths waste no ration.",
			() => {
				this.hide();
				this.command({ type: "rest", confirm: true });
			},
			"Rest · restore " + w + " / " + sp,
		);
	}
	retreat() {
		const c = this.state?.combat,
			p = this.player;
		if (!c || !p) return;
		const strikes = c.enemies.map((id) => c.intents[id]).filter(Boolean);
		const damage = strikes
			.map((a) => (a.channel === "war" ? "▰ War" : "◇ Spirit") + " " + a.power)
			.join(", ");
		this.confirm(
			"Fall back?",
			"The living threats may deliver a parting strike (" +
				damage +
				" before defense). The party returns to its last safe positions.",
			() => {
				this.hide();
				this.command({ type: "retreat", confirm: true });
			},
			"Retreat together",
		);
	}
	map() {
		const s = this.state,
			p = this.player;
		if (!s || !p) return;
		const f = this.content.floors[s.floor],
			rows = f.rows.map((r) => r.split(""));
		for (const q of Object.values(s.entities))
			if (q.floor === s.floor && q.type === "secret" && q.open)
				rows[q.y][q.x] = ".";
		const map = new E.TileMap({
			rows: rows.map((r) => r.join("")),
			legend: { "#": 1, ".": 0 },
			types: { 1: { h: 16, top: "#4b6669", side: "#344b53" } },
			tile: 16,
		});
		const seen = new Set(p.seen || []);
		const markers = [];
		for (const e of Object.values(s.entities)) {
			if (
				e.floor !== s.floor ||
				e.claimed ||
				e.dead ||
				e.taken ||
				!seen.has(e.x + "," + e.y)
			)
				continue;
			markers.push({
				x: (e.x + 0.5) * 16,
				y: (e.y + 0.5) * 16,
				kind:
					e.type === "enemy"
						? "cross"
						: e.type === "ladder"
							? "diamond"
							: "ring",
				color:
					e.type === "enemy"
						? "#d69c80"
						: e.type === "secret"
							? "#89d2e8"
							: "#ddbb7e",
				label: ["ladder", "camp", "treasure"].includes(e.type) ? e.type : "",
			});
		}
		for (const q of Object.values(s.players))
			if (q.id !== p.id)
				markers.push({
					x: (q.x + 0.5) * 16,
					y: (q.y + 0.5) * 16,
					kind: "diamond",
					color: "#91c8a3",
					label: q.name,
				});
		const revealed = !!this.app.devReveal;
		this.show("map", {
			kicker: f.subtitle,
			title: f.name,
			map,
			at: {
				x: (p.x + 0.5) * 16,
				y: (p.y + 0.5) * 16,
				facing: -Math.PI / 2 + (p.dir * Math.PI) / 2,
			},
			fog: revealed
				? null
				: {
						visible: ([x, y]) => Math.abs(x - p.x) + Math.abs(y - p.y) <= 2,
						seen: ([x, y]) => seen.has(x + "," + y),
					},
			markers,
			text: "◇ ladder / companion   × threat   ○ object / landmark. Hollow blue seams reward attention. Only explored geometry is shown.",
			actions: [["Return to your eyes", () => this.hide()]],
		});
	}
	inspectEnemy() {
		const e = this.target(),
			d = e && this.content.enemies[e.kind];
		if (!e) return;
		this.show("inspect", {
			kicker: d.role,
			title: d.name,
			text:
				d.hint +
				"\n\n▰ War " +
				e.war +
				"/" +
				e.maxWar +
				"; armor reduces " +
				e.armor +
				".\n◇ Spirit " +
				e.spirit +
				"/" +
				e.maxSpirit +
				"; ward reduces " +
				e.ring +
				".\nEmpty either strength to defeat it. Inspecting costs no turn.",
			actions: [["Return to the round", () => this.hide()]],
		});
	}
	target() {
		const s = this.state;
		if (!s?.combat) return null;
		const alive = s.combat.enemies
			.map((id) => s.entities[id])
			.filter((e) => e && !e.dead);
		return alive.find((e) => e.id === this.targetId) || alive[0] || null;
	}
	choose(source) {
		this.selected = source;
		this.lastHUD = "";
	}
	attack() {
		const e = this.target();
		if (e)
			this.command({ type: "attack", target: e.id, source: this.selected });
	}
	assistChannel() {
		const e = this.target(),
			p = this.player;
		if (!e || !p) return;
		const d = this.itemDef(p.hands[1]),
			distance = Math.abs(p.x - e.x) + Math.abs(p.y - e.y);
		const candidates = [
			{ source: "war", channel: "war", power: 3, range: 1 },
			...(p.basicSpirit
				? [{ source: "spirit", channel: "spirit", power: 3, range: 3 }]
				: []),
			...(d?.family === "weapon" && (!d.ammo || p.arrows > 0)
				? [{ ...d, source: "right" }]
				: []),
		];
		let best = null;
		for (const c of candidates) {
			if (distance > c.range) continue;
			const reduction = c.channel === "war" ? e.armor : e.ring,
				loss = Math.max(0, c.power - reduction),
				remaining = c.channel === "war" ? e.war : e.spirit,
				score = loss / Math.max(1, remaining);
			if (!best || score > best.score) best = { source: c.source, score };
		}
		if (best) this.selected = best.source;
		else this.selected = "guard";
	}
	cycleAction(delta) {
		const choices = [
			"right",
			"war",
			...(this.player?.basicSpirit ? ["spirit"] : []),
			"guard",
		];
		const index = Math.max(0, choices.indexOf(this.selected));
		this.choose(choices[(index + delta + choices.length) % choices.length]);
	}
	cycleTarget() {
		const s = this.state;
		if (!s?.combat) return;
		const ids = s.combat.enemies.filter((id) => !s.entities[id]?.dead);
		this.targetId = ids[(ids.indexOf(this.target()?.id) + 1) % ids.length];
		this.lastHUD = "";
	}
	revive() {
		const p = this.player;
		const q =
			p &&
			Object.values(this.state.players).find(
				(q) => q.down && q.connected !== false && dist(p, q) <= 1,
			);
		if (q)
			this.confirm(
				"Revive " + q.name + "?",
				"Spend 1 ration. Restore at least " +
					Math.ceil(q.maxWar * 0.3) +
					" War and " +
					Math.ceil(q.maxSpirit * 0.3) +
					" Spirit; preserve any higher remaining value.",
				() => {
					this.hide();
					this.command({ type: "revive", target: q.id });
				},
				"Share one ration",
			);
		else
			this.notice(
				"No fallen ally in reach",
				"Move within one tile of your companion.",
			);
	}
	coop() {
		this.show("coop", {
			kicker: "One vault · two first-person views",
			title: "Bring a second lantern",
			text: "Connect two browsers with invitation codes. Each adventurer keeps a personal pack; the dungeon and its decisions are shared. A direct connection requires reachable network peers. No relay is supplied.",
			rows: ["coopPlanning"],
			actions: [
				["Host an expedition", () => this.host()],
				["Join an expedition", () => this.join()],
				["How co-op works", () => this.help()],
				["Back", () => this.shell.back()],
			],
		});
	}
	async host() {
		this.invite = {
			role: "host",
			status: "Gathering a direct invitation…",
			output: "",
			input: "",
		};
		this.inviteScreen();
		try {
			const code = await this.app.net.host({
				planningSeconds: this.game.settings.coopPlanning,
			});
			if (this.invite.role !== "host") return;
			this.invite.output = code;
			this.invite.status =
				"Planning window: " +
				this.app.net.planningSeconds +
				" seconds. Give the offer to your companion. Paste their answer below, then connect.";
			this.inviteScreen();
		} catch (e) {
			this.invite.status = e.message;
			this.inviteScreen();
		}
	}
	join() {
		this.invite = {
			role: "guest",
			status: "Paste the host’s offer. Then create an answer and send it back.",
			output: "",
			input: "",
		};
		this.inviteScreen();
	}
	async joinAnswer() {
		this.captureInvite();
		try {
			this.invite.status = "Gathering your answer…";
			this.statusInvite();
			const code = await this.app.net.join(this.invite.input);
			this.invite.output = code;
			this.invite.status =
				"Host planning window: " +
				this.app.net.planningSeconds +
				" seconds" +
				(this.app.net.planningSeconds === 8
					? " (stock). "
					: " (modified expedition). ") +
				"Return this answer only if this window suits both adventurers. Waiting for the reliable data channel…";
			this.inviteScreen();
		} catch (e) {
			this.invite.status = e.message;
			this.statusInvite();
		}
	}
	async acceptAnswer() {
		this.captureInvite();
		try {
			await this.app.net.accept(this.invite.input);
			this.invite.status = "Connecting and checking expedition version…";
			this.statusInvite();
		} catch (e) {
			this.invite.status = e.message;
			this.statusInvite();
		}
	}
	captureInvite() {
		const t = this.shell.root.querySelector("#invite-input");
		if (t) this.invite.input = t.value;
	}
	statusInvite() {
		const e = this.shell.root.querySelector(".connection-status");
		if (e) e.textContent = this.invite.status;
	}
	inviteScreen() {
		const host = this.invite.role === "host";
		this.show("invite", {
			kicker: "Direct WebRTC · no camera or microphone",
			title: host ? "Carry the first lantern" : "Carry the second lantern",
			text: host
				? "1. Copy your offer to your companion.  2. They return an answer.  3. Paste it below and connect."
				: "1. Paste the host’s offer.  2. Create your answer.  3. Send the answer to the host. The expedition starts when both browsers connect.",
			actions: [
				...(host
					? [
							{
								label: "Connect using answer",
								disabled: !this.invite.output,
								fn: () => this.acceptAnswer(),
							},
						]
					: [["Create answer from offer", () => this.joinAnswer()]]),
				...(this.invite.output
					? [["Copy " + (host ? "offer" : "answer"), () => this.copyInvite()]]
					: []),
				["Cancel connection", () => this.cancelInvite()],
			],
			back: () => this.cancelInvite(),
		});
	}
	async copyInvite() {
		const output = this.shell.root.querySelector("#invite-output");
		try {
			await navigator.clipboard.writeText(this.invite.output);
			this.invite.status =
				"Copied. You can also select and copy the code below.";
		} catch {
			output?.focus();
			output?.select();
			this.invite.status =
				"Select the code and use your device’s Copy command.";
		}
		this.statusInvite();
	}
	cancelInvite() {
		this.invite.role = "";
		this.app.net.cancel();
		this.app.returnTitle();
	}
	saves() {
		this.show("saves", {
			kicker: this.app.persistence
				? "Local checkpoint verified"
				: "Storage unavailable · export works",
			title: "Carry your expedition home",
			text: "Export a versioned save to a text file, or import one here. Network expeditions do not become solo saves.",
			actions: [
				["Export current safe save", () => this.app.exportSave()],
				["Import save file", () => this.app.importSave()],
				["Back", () => this.shell.back()],
			],
		});
	}
	victory() {
		const s = this.state;
		this.shell.hide();
		this.show("victory", {
			kicker: "The Emberheart is yours",
			emblem: "◇",
			title: "You kept both fires burning.",
			text: "Three depths below the world, the warden’s debt is paid. The treasure answers your hand. Carry its light upward.",
			stats: [
				[s.stats?.rounds ?? 0, "rounds"],
				[(s.floor ?? 2) + 1, "depths"],
				[s.stats?.enemies ?? 0, "threats overcome"],
			],
			actions:
				this.app.net.mode === "hub"
					? [["View expedition record", () => this.credits()]]
					: [
							...(!this.online
								? [
										[
											"Continue in the vault",
											() => this.app.continueAfterVictory(),
										],
									]
								: []),
							["New expedition", () => this.app.newSolo()],
							["About / Credits", () => this.credits()],
							["Return to title", () => this.app.returnTitle()],
						],
		});
	}
	defeat() {
		this.shell.hide();
		this.show("defeat", {
			kicker: "One of your fires went out",
			emblem: "⊘",
			title: "The vault keeps its silence.",
			text: "Both War and Spirit must endure. Your floor-entry checkpoint holds viable supplies and the equipment you carried below.",
			actions:
				this.app.net.mode === "hub"
					? [["View expedition record", () => this.credits()]]
					: this.online
						? [["End this expedition", () => this.app.returnTitle()]]
						: [
								["Retry from floor entrance", () => this.app.retry()],
								["Begin a fresh expedition", () => this.app.newSolo()],
								["Return to title", () => this.app.returnTitle()],
							],
		});
	}
	dev() {
		const s = this.state;
		if (!s) return;
		const scored = this.online;
		this.show("dev", {
			kicker: scored
				? "Shared expedition · read-only diagnostics"
				: "Developer mode · modified runs are marked",
			title: "The lantern behind the walls",
			text: scored
				? "The session owns the clock and balance. No developer mutation is allowed."
				: "Tools operate on the same state and command handlers as normal play. Changes mark this expedition as modified.",
			rows: scored
				? []
				: [
						"#Damage multipliers",
						"devPlayerDamage",
						"devEnemyDamage",
						"#Strength maxima",
						"devMaxWar",
						"devMaxSpirit",
						"#Rations and cooperation",
						"devRationWar",
						"devRationSpirit",
						"devPlanning",
						"#Presentation",
						"devTempo",
					],
			actions: scored
				? [["Back", () => this.shell.back()]]
				: [
						["Reset tuning to defaults", () => this.app.resetTuning()],
						["Floor / encounter jump", () => this.devJump()],
						[
							"Invulnerability · " + (s.invulnerable ? "ON" : "OFF"),
							() =>
								this.app.dev({
									type: "invulnerability",
									enabled: !s.invulnerable,
								}),
						],
						[
							"Refill rations, arrows and strength",
							() => this.app.dev({ type: "supplies" }),
						],
						["Spawn an item", () => this.devItems()],
						[
							"Reveal map / secret geometry",
							() => {
								this.app.devReveal = !this.app.devReveal;
								this.app.dev({ type: "reveal" });
								this.map();
							},
						],
						["Reload floor-entry checkpoint", () => this.app.retry()],
						[
							"Step one second / inspect intent",
							() => {
								this.app.devStep();
								this.dev();
							},
						],
						["Content workshop", () => this.workshop()],
						["Export state / replay", () => this.app.exportSave(true)],
						["Back", () => this.shell.back()],
					],
		});
	}
	devJump() {
		this.show("devjump", {
			kicker: "Marks this run as modified",
			title: "Choose a depth or threat",
			actions: this.content.floors
				.map((f, i) => [
					"Floor " + (i + 1) + " · " + f.name,
					() => {
						this.app.dev({ type: "floor", floor: i });
						this.hide();
					},
				])
				.concat(
					Object.values(this.state.entities)
						.filter((e) => e.type === "enemy")
						.map((e) => [
							this.content.enemies[e.kind].name + " · " + (e.floor + 1),
							() => {
								this.app.dev({ type: "encounter", target: e.id });
								this.hide();
							},
						]),
					[["Back", () => this.shell.back()]],
				),
		});
	}
	devItems() {
		this.show("devitems", {
			kicker: "Spawn a stable object at your feet",
			title: "The quartermaster",
			actions: Object.entries(this.content.items)
				.map(([kind, d]) => [
					d.name,
					() => {
						this.app.dev({ type: "item", kind });
						this.hide();
					},
				])
				.concat([["Back", () => this.shell.back()]]),
		});
	}
	workshop() {
		this.show("workshop", {
			kicker: "Data-driven dungeon authoring",
			title: "Move the stones",
			text: "Choose a tile. Toggle geometry or move an entity. Validate before applying. Exported JSON can be rebuilt with npm run build -- --content <file>.",
			actions: [
				[
					"Next floor",
					() => {
						this.editorFloor =
							(this.editorFloor + 1) % this.editor.floors.length;
						this.workshop();
					},
				],
				["Toggle selected wall / floor", () => this.editTile()],
				["Move selected entity to tile", () => this.moveEditorEntity()],
				["Validate content", () => this.validateEditor()],
				[
					"Apply validated content to a new modified run",
					() => this.applyEditor(),
				],
				[
					"Export content JSON",
					() =>
						this.app.download(
							"danger-content.json",
							JSON.stringify(this.editor, null, 2),
						),
				],
				["Import content JSON", () => this.importContent()],
				[
					"Reset editor to shipped content",
					() => {
						this.editor = structuredClone(CONTENT);
						this.editorMessage = "Shipped campaign restored in the editor.";
						this.workshop();
					},
				],
				["Back", () => this.shell.back()],
			],
		});
	}
	editTile() {
		const f = this.editor.floors[this.editorFloor],
			{ x, y } = this.editorTile;
		if (
			x === 0 ||
			y === 0 ||
			x === f.rows[0].length - 1 ||
			y === f.rows.length - 1
		) {
			this.editorMessage = "The outer boundary stays closed.";
		} else {
			const r = f.rows[y].split("");
			r[x] = r[x] === "#" ? "." : "#";
			f.rows[y] = r.join("");
			this.editorMessage =
				"Tile " + x + "," + y + " changed. Validate before applying.";
		}
		this.workshop();
	}
	moveEditorEntity() {
		const f = this.editor.floors[this.editorFloor],
			id = this.shell.root.querySelector("#editor-entity")?.value;
		const e = f.entities.find((e) => e.id === id);
		if (e) {
			e.x = this.editorTile.x;
			e.y = this.editorTile.y;
			this.editorMessage = e.id + " moved to " + e.x + "," + e.y + ".";
		}
		this.workshop();
	}
	validation() {
		try {
			const r = validateContent(this.editor);
			if (Array.isArray(r)) return r;
			if (r?.errors) return r.errors;
			if (r?.ok === false) return [r.message || "Validation failed"];
			return [];
		} catch (e) {
			return [e.message];
		}
	}
	validateEditor() {
		const errors = this.validation();
		this.editorMessage = errors.length
			? errors.join("\n")
			: "Valid: references, geometry, routes, locks, destinations and tutorial supplies passed.";
		this.workshop();
		return errors.length === 0;
	}
	applyEditor() {
		if (this.validation().length) {
			this.validateEditor();
			return;
		}
		this.app.startContent(this.editor);
	}
	async importContent() {
		const data = await this.app.pickJSON();
		if (!data) return;
		try {
			if (!Array.isArray(data.floors) || !data.items || !data.enemies)
				throw Error("Expected campaign object with floors, items and enemies.");
			this.editor = data;
			this.editorFloor = 0;
			this.editorMessage = "Imported. Validate before applying.";
		} catch (e) {
			this.editorMessage = e.message;
		}
		this.workshop();
	}
	decorate(name, sh) {
		if (!sh) return;
		const box = sh.firstElementChild,
			buttons = box?.querySelector(".esh-btns");
		if (!box) return;
		if (name === "title") {
			const h = box.querySelector("h1");
			if (h)
				h.innerHTML =
					'<span class="title-small">Advanced</span><span class="title-main">Dungeons</span><span class="title-end">&amp; Danger</span>';
			const crest = el("div", "title-crest");
			crest.innerHTML = EYE;
			box.prepend(crest);
			const top = el("div", "title-topline");
			top.append(
				el("span", "", "A lantern-lit tactical expedition"),
				el("span", "", "The Emberheart awaits"),
			);
			const bottom = el("div", "title-bottomline");
			bottom.append(
				el("span", "", "Read the room. Prepare your hand."),
				el("span", "", "Steel / Spirit"),
			);
			sh.append(top, bottom);
		}
		if (this.online && !["title", "invite", "coop"].includes(name)) {
			const n = el(
				"div",
				"live-notice",
				"Shared world · continues while this menu is open",
			);
			box.prepend(n);
		}
		if (name === "pack" && this.player) {
			const p = this.player,
				sum = el("div", "pack-summary");
			const left = el("div");
			left.append(
				el("span", "", "LEFT HAND"),
				el("br"),
				el("strong", "", this.nameItem(p.hands[0])),
			);
			const right = el("div");
			right.append(
				el("span", "", "RIGHT HAND"),
				el("br"),
				el("strong", "", this.nameItem(p.hands[1])),
			);
			sum.append(
				left,
				right,
				el(
					"div",
					"",
					"▰ armor " +
						p.armor +
						"  /  ◇ ring " +
						p.ring +
						"\n" +
						p.food +
						" rations · " +
						p.arrows +
						" arrows",
				),
			);
			buttons?.before(sum);
		}
		if (name === "invite") {
			const wrap = el("div");
			if (this.invite.output) {
				const lab = el(
					"label",
					"invite-label",
					(this.invite.role === "host" ? "YOUR OFFER" : "YOUR ANSWER") +
						" · select or copy",
				);
				lab.htmlFor = "invite-output";
				const out = el("textarea", "invite-area");
				out.id = "invite-output";
				out.readOnly = true;
				out.value = this.invite.output;
				wrap.append(lab, out);
			}
			const lab = el(
				"label",
				"invite-label",
				this.invite.role === "host"
					? "PASTE YOUR COMPANION’S ANSWER"
					: "PASTE THE HOST’S OFFER",
			);
			lab.htmlFor = "invite-input";
			const input = el("textarea", "invite-area");
			input.id = "invite-input";
			input.value = this.invite.input;
			input.autocomplete = "off";
			input.spellcheck = false;
			input.placeholder = this.invite.role === "host" ? "DD1.A.…" : "DD1.O.…";
			input.addEventListener("input", () => (this.invite.input = input.value));
			wrap.append(
				lab,
				input,
				el("div", "connection-status", this.invite.status),
			);
			buttons?.before(wrap);
		}
		if (name === "dev" && this.state) {
			const n = this.app.net.diagnostics?.() || {};
			const pre = el(
				"pre",
				"dev-state",
				JSON.stringify(
					{
						seed: this.state.seed,
						run: this.state.runId,
						tick: this.state.tick,
						clockMilliseconds: Math.round(this.state.clock),
						phase: this.state.phase,
						round: this.state.combat?.round,
						intents: this.state.combat?.intents,
						network: n,
					},
					null,
					2,
				),
			);
			buttons?.before(pre);
		}
		if (name === "workshop") {
			const f = this.editor.floors[this.editorFloor],
				wrap = el("div", "content-editor"),
				grid = el("div", "editor-grid");
			grid.style.gridTemplateColumns = "repeat(" + f.rows[0].length + ",1fr)";
			for (let y = 0; y < f.rows.length; y++)
				for (let x = 0; x < f.rows[y].length; x++) {
					const entities = f.entities.filter((q) => q.x === x && q.y === y);
					const b = el(
						"button",
						(f.rows[y][x] === "#" ? "wall " : "") +
							(entities.length ? "has-entity " : "") +
							(this.editorTile.x === x && this.editorTile.y === y
								? "selected"
								: ""),
						entities[0]?.type[0]?.toUpperCase() || "",
					);
					b.title = x + "," + y + " " + entities.map((e) => e.id).join("; ");
					b.setAttribute("aria-label", b.title);
					b.onclick = () => {
						this.editorTile = { x, y };
						this.editorMessage = b.title;
						this.workshop();
					};
					grid.append(b);
				}
			const controls = el("div", "editor-controls");
			controls.append(
				el(
					"b",
					"",
					f.name + " · tile " + this.editorTile.x + "," + this.editorTile.y,
				),
				el(
					"p",
					"",
					"Gold outlines mark authored entities. L=loot, E=enemy, G=gate, S=secret, M=mural, C=camp/coffer.",
				),
			);
			const label = el("label", "invite-label", "Entity to move");
			const select = el("select");
			select.id = "editor-entity";
			select.style.cssText =
				"width:100%;background:#12272b;color:#e6d6b4;padding:10px;font-size:.75em";
			for (const e of f.entities) {
				const o = el("option", "", e.id);
				o.value = e.id;
				select.append(o);
			}
			controls.append(
				label,
				select,
				el("pre", "editor-log", this.editorMessage),
			);
			wrap.append(grid, controls);
			buttons?.before(wrap);
		}
	}
	makeHUD() {
		const root = el("div");
		this.hud = root;
		root.id = "game-hud";
		root.hidden = true;
		root.innerHTML =
			'<div class="hud-top"><div class="place"><div class="eye-mark">' +
			EYE +
			'</div><div><div class="eyebrow" id="depth-label"></div><div class="floor-name" id="floor-name"></div></div></div><div class="compass"><div><span class="wind">W · ·</span><strong id="heading">N</strong><span class="wind">· · E</span></div><div class="goal">Descend. Defeat the warden. Claim the Emberheart.</div><div class="session-clock" id="session-clock"></div></div><button class="hud-button menu-button" id="menu-button" aria-label="Menu"><kbd id="menu-key">Esc</kbd> <span>Menu</span> ☰</button></div><div id="crosshair"></div><div id="recent" aria-live="polite"></div><section id="target" hidden><div class="eyebrow" id="round-label"></div><div class="enemy-name" id="enemy-name"></div><div class="enemy-pools"><span class="war" id="enemy-war"></span><span class="spirit" id="enemy-spirit"></span></div><div class="intent" id="enemy-intent"></div><div class="readiness" id="readiness"></div><button class="inspect" id="inspect-enemy">Inspect intention</button></section><div class="hud-bottom"><div class="vitals"><div class="meter war"><div class="meter-head"><span>▰ WAR</span><span class="amount" id="war-amount"></span></div><div class="meter-track"><div class="meter-fill" id="war-fill"></div></div></div><div class="meter spirit"><div class="meter-head"><span>◇ SPIRIT</span><span class="amount" id="spirit-amount"></span></div><div class="meter-track"><div class="meter-fill" id="spirit-fill"></div></div></div><div class="defenses" id="defenses"></div><div class="counters"><span>▱ <b id="food-count"></b> rations</span><span>↗ <b id="arrow-count"></b> arrows</span></div></div><div class="hands"><div class="hand"><span class="hand-label">LEFT HAND / DEFENSE</span><strong id="left-hand"></strong></div><div class="hand active"><span class="hand-label">RIGHT HAND / ACTIVE</span><strong id="right-hand"></strong></div><div class="tool-links"><button id="pack-button"></button><button id="swap-button"></button><button id="map-button"></button></div></div></div><div id="context"><button id="context-action"></button><div class="hint" id="context-hint"></div></div><div id="combat-actions" hidden><button data-source="right">Held</button><button data-source="war">▰ Strike</button><button data-source="spirit">◇ Spark</button><button data-source="guard">Guard</button><button data-source="revive" hidden>Revive</button><button data-source="retreat">Retreat</button></div><div class="touch-hint" id="touch-hint" hidden>Left thumb: step · Right thumb: look · Double tap: pack</div><div class="modified-badge" id="modified-badge"></div>';
		document.body.append(root);
		const by = (id) => root.querySelector("#" + id);
		by("menu-button").onclick = () => this.pause();
		by("pack-button").onclick = () => this.pack();
		by("swap-button").onclick = () => this.command({ type: "swap" });
		by("map-button").onclick = () => this.map();
		by("inspect-enemy").onclick = () => this.inspectEnemy();
		by("context-action").onclick = () => this.contextAction();
		root.querySelectorAll("[data-source]").forEach((b) => {
			b.onclick = () =>
				b.dataset.source === "retreat"
					? this.retreat()
					: b.dataset.source === "revive"
						? this.revive()
						: this.choose(b.dataset.source);
		});
	}
	contextAction() {
		const s = this.state;
		if (!s) return;
		if (s.phase === "explore" && this._contextIsPack) {
			this.pack();
			return;
		}
		if (this.player?.down) {
			this.notice(
				"Your companion can bring you back",
				"A nearby ally needs one ration. You travel with the party.",
			);
			return;
		}
		if (s.phase === "preparation") {
			this.command({ type: "resume" });
			return;
		}
		if (s.phase === "combat") {
			if (
				this.app.lastInput === "touch" &&
				this.game.settings.touchAssist &&
				this.selected !== "guard"
			)
				this.assistChannel();
			if (this.selected === "guard") {
				this.command({ type: "guard", channel: "both" });
				if (this.app.lastInput === "touch") this.choose("right");
			} else this.attack();
			return;
		}
		const down = Object.values(s.players).find(
			(q) => q.down && dist(q, this.player) <= 1 && q.connected !== false,
		);
		if (down) {
			this.revive();
			return;
		}
		this.interact();
	}
	update() {
		const s = this.state,
			p = this.player,
			show =
				!!s &&
				!!p &&
				!this.shell.screen &&
				!this.app.attract &&
				this.app.stage === "play";
		this.hud.hidden = !show;
		document.body.classList.toggle("menu-open", !!this.shell.screen);
		document.body.classList.toggle(
			"touch-mode",
			this.app.lastInput === "touch",
		);
		document.body.classList.toggle(
			"reduced-motion",
			!!this.game.settings.reducedMotion,
		);
		if (!show) return;
		const e = this.target(),
			c = s.combat;
		const key = JSON.stringify([
			s.tick,
			s.floor,
			s.phase,
			p,
			c?.round,
			c?.deadline,
			c?.plans,
			e?.id,
			this.selected,
			this.app.lastInput,
			this.app.net.mode,
			Math.floor((s.clock || 0) / 500),
			this.game.settings.glyphs,
		]);
		if (key === this.lastHUD) return;
		this.lastHUD = key;
		const by = (id) => this.hud.querySelector("#" + id),
			text = (id, t) => {
				by(id).textContent = t;
			};
		text(
			"depth-label",
			"Depth " + String(s.floor + 1).padStart(2, "0") + " / 03",
		);
		text("floor-name", this.content.floors[s.floor]?.name || "The vault");
		text("heading", ["N", "E", "S", "W"][p.dir]);
		text("menu-key", this.label("pause"));
		text("war-amount", p.war + " / " + p.maxWar);
		text("spirit-amount", p.spirit + " / " + p.maxSpirit);
		by("war-fill").style.width = Math.max(0, (p.war / p.maxWar) * 100) + "%";
		by("spirit-fill").style.width =
			Math.max(0, (p.spirit / p.maxSpirit) * 100) + "%";
		text(
			"defenses",
			"▰ Armor " +
				p.armor +
				"  ·  ◇ Ring " +
				p.ring +
				(this.itemDef(p.hands[0])?.defense
					? "  ·  Shield +" + this.itemDef(p.hands[0]).defense
					: ""),
		);
		text("food-count", p.food);
		text("arrow-count", p.arrows);
		text("left-hand", this.nameItem(p.hands[0]));
		text("right-hand", this.nameItem(p.hands[1]));
		text(
			"pack-button",
			this.label("pack") + " Pack " + p.pack.filter(Boolean).length + "/6",
		);
		text("swap-button", this.label("swap") + " Swap");
		text("map-button", this.label("map") + " Map");
		text(
			"recent",
			(s.log || [])
				.slice(-3)
				.map((x) => (typeof x === "string" ? x : x.text || ""))
				.join("\n"),
		);
		by("target").hidden = !e;
		by("combat-actions").hidden = s.phase !== "combat";
		this.hud.querySelector("[data-source=revive]").hidden = !Object.values(
			s.players,
		).some(
			(q) =>
				q.down && q.connected !== false && q.id !== p.id && dist(q, p) <= 1,
		);
		by("touch-hint").hidden = this.app.lastInput !== "touch";
		text("modified-badge", s.modified ? "MODIFIED EXPEDITION" : "");
		let clock = "";
		if (
			this.app.net.mode === "hub" &&
			Number.isFinite(globalThis.AIHub?.time?.())
		) {
			const left = Math.max(0, (AIHub.limitMs || 900000) - AIHub.time());
			clock = Math.ceil(left / 60000) + " min remain · live co-op";
		}
		text("session-clock", clock);
		if (e && c) {
			const d = this.content.enemies[e.kind],
				intent = c.intents[e.id];
			text(
				"round-label",
				"Round " +
					c.round +
					(e.kind === "minotaur" ? " · Seal " + (e.phase || 1) + " / 3" : ""),
			);
			text("enemy-name", d.name);
			text("enemy-war", "▰ " + e.war + " / " + e.maxWar);
			text("enemy-spirit", "◇ " + e.spirit + " / " + e.maxSpirit);
			by("enemy-intent").replaceChildren();
			if (intent) {
				const who = s.players[intent.target]?.name || "the party";
				const channel = intent.channel === "war" ? "▰ WAR" : "◇ SPIRIT";
				const em = el(
					"em",
					"",
					intent.kind === "windup"
						? "Drawing back…"
						: channel + " · " + intent.power + " before defense",
				);
				by("enemy-intent").append(
					em,
					el(
						"div",
						"",
						"Intends " +
							(intent.kind === "windup"
								? "a heavy blow"
								: intent.kind || "a strike") +
							" → " +
							who,
					),
					el("small", "", "Defeat it first, guard the blow, or reposition."),
				);
			}
			const living = Object.values(s.players).filter(
				(q) => q.connected !== false && !q.down,
			);
			const ready = living.filter((q) => c.plans?.[q.id]).map((q) => q.name);
			text(
				"readiness",
				(e.kind === "minotaur"
					? "Seals broken " +
						((e.phase || 1) - 1) +
						"/3 · total damage " +
						(e.damageTaken || 0) +
						"/" +
						e.maxWar +
						" · "
					: "") +
					(ready.length
						? "Ready: " + ready.join(", ")
						: "Choose an action, then commit.") +
					(c.deadline
						? " · " +
							Math.max(0, Math.ceil((c.deadline - s.clock) / 1000)) +
							"s"
						: " · no timer until commitment"),
			);
		}
		const entity = this.contextEntity();
		let action = "",
			hint = "",
			disabled = false;
		if (p.down) {
			action = "You are down · await a ration";
			hint = "A nearby ally can revive both strengths.";
		} else if (s.phase === "preparation") {
			action = "Continue to the next seal";
			hint =
				"A preparation beat. Drink, equip or mend your strengths before continuing.";
		} else if (s.phase === "combat") {
			const d = this.selected === "right" ? this.itemDef(p.hands[1]) : null;
			const name =
				this.selected === "guard"
					? "Guard both strengths"
					: this.selected === "war"
						? "Basic War strike · 3"
						: this.selected === "spirit"
							? "Spirit spark · 3"
							: d?.name || "Basic War strike";
			action = this.label("attack") + "  Commit: " + name;
			hint =
				this.selected === "guard"
					? "Guard reduces the next hit."
					: d
						? this.itemTag(p.hands[1]) + " · range " + (d.range || 1) + " tiles"
						: this.selected === "spirit"
							? "Reusable · no Spirit cost"
							: "Reusable · no cost";
			if (c?.plans?.[p.id]) {
				action = "Committed · waiting for your companion";
				disabled = true;
			}
		} else {
			const down = Object.values(s.players).find(
				(q) =>
					q.down && q.connected !== false && q.id !== p.id && dist(q, p) <= 1,
			);
			if (down) {
				action = this.label("interact") + "  Revive " + down.name;
				hint = "Cost: 1 ration. Both strengths return to at least 30%.";
			} else if (entity) {
				const item = entity.itemId && this.state.items[entity.itemId],
					d = item && this.content.items[item.kind];
				action =
					this.label("interact") +
					"  " +
					(entity.type === "loot" ? "Take " : "") +
					(d?.name || entity.name || titleCase(entity.type));
				hint =
					entity.type === "loot"
						? d
							? this.itemTag(entity.itemId)
							: entity.food
								? "Supplies stay outside the six-slot pack"
								: "Shared keyring"
						: entity.type === "secret"
							? "A hollow seam. Try the stone."
							: entity.type === "ladder"
								? "One-way descent · asks before committing"
								: "Inspect / interact";
			} else {
				action = this.label("pack") + "  Prepare your pack";
				hint = "WASD step · Q/E quarter-turn · " + this.label("rest") + " rest";
			}
		}
		by("context-action").disabled = disabled;
		text("context-action", action);
		text("context-hint", hint);
		this._contextIsPack =
			s.phase === "explore" &&
			!entity &&
			!Object.values(s.players).some(
				(q) =>
					q.down && q.connected !== false && q.id !== p.id && dist(q, p) <= 1,
			);
		this.hud.querySelectorAll("[data-source]").forEach((b) => {
			b.classList.toggle("selected", b.dataset.source === this.selected);
		});
	}
}
export { report };
