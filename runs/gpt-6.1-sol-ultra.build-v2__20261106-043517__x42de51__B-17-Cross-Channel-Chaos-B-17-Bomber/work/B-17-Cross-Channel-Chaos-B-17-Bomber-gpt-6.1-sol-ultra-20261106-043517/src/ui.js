import CREDITS from "../content/credits.json";
import {
	DEFAULT_BALANCE,
	DIFFICULTIES,
	LABELS,
	LOADOUTS,
	MISSION,
	STATIONS,
	TUNING,
	U,
} from "../content/mission.js";

const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const $ = (s, r = document) => r.querySelector(s);
const minutes = (t) =>
	`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
export class BomberUI {
	constructor(app) {
		Object.assign(this, app);
		this.hud = $("#hud");
		this.lastHud = 0;
		this.setup = {
			loadout: "balanced",
			difficulty: "normal",
			route: "direct",
			coop: false,
		};
		this.wheelPlayer = null;
		this.preview = "harbor";
		this.dev = { freeCamera: false, debug: false, paused: false };
		this.shell = new this.E.Shell(this.game, {
			theme: {
				scale: 1,
				font: "Arial, sans-serif",
				titleFont: "Impact, sans-serif",
				ink: "#f2e8cb",
				paper: "#102f38",
				accent: "#ebbd6c",
			},
			screens: {
				pause: {
					kicker: "FLIGHT DESK",
					title: "Crew at ease",
					text: "The aircraft waits here. Resume when the crew is ready.",
					actions: [
						["Mission map", () => this.map()],
						["Flight handbook", () => this.controls()],
						["Emergency actions", () => this.emergency()],
						["Dev mode", () => this.devMenu()],
						["Leave sortie", () => this.leaveMenu()],
					],
				},
			},
			standard: true,
		});
		const nativeBack = this.shell.back.bind(this.shell);
		this.shell.back = () => {
			clearTimeout(this.jettisonTimer);
			const result = nativeBack();
			if (this.shell.screen === "dev") this.devMenu();
			return result;
		};
		const nativeShow = this.shell.show.bind(this.shell);
		this.shell.show = (name, spec = {}) => {
			if (name === "settings") {
				this.settings();
				return this.shell;
			}
			return nativeShow(name, spec);
		};
		for (const [key, label, min, max, step, unit] of TUNING)
			this.game.settings.define({
				key: "dev_" + key,
				label,
				type: "slider",
				value: DEFAULT_BALANCE[key],
				min,
				max,
				step,
				unit,
				group: "Flight tuning",
			});
		this.game.settings.onChange = (key, value) => {
			if (key.startsWith("dev_") && !this.online.active) {
				this.sim.balance[key.slice(4)] = value;
				this.sim.state.cheated = true;
			}
			if (key === "voice") {
				this.game.audio.voiceVolume = value;
				this.game.audio.applyVolume();
			}
			if (key === "captions")
				this.hud.style.setProperty("--caption-scale", value);
		};
		this.shell.root.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input");
			if (b && !b.disabled) b.focus({ preventScroll: true });
		});
		this.shell.root.addEventListener("pointerdown", () => this.activity(), {
			passive: true,
		});
	}
	show(name, spec) {
		this.shell.show(name, spec);
		this.screenStamp++;
		this.hud.hidden = true;
		return this.shell;
	}
	clear() {
		clearTimeout(this.jettisonTimer);
		this.jettisonTimer = null;
		this.shell.hide();
		this.menuOwner = 1;
		if (this.clearActions) this.clearActions();
		this.game.input.clear();
		for (const i of this.game.players) i.clear();
		this.activity();
	}
	title() {
		this.clear();
		this.show("title", {
			kicker: "A CREW. A BOMBER. A WAY HOME.",
			name: "B-17\nCROSS CHANNEL\nCHAOS",
			subtitle: "Cross the water. Answer the warning.\nBring everyone home.",
			actions: [
				["Fly a sortie", () => this.brief(false)],
				["Co-op crew", () => this.coopMenu()],
				["Practice", () => this.practiceMenu()],
				["Settings", () => this.settings()],
				["About / Credits", () => this.about()],
			],
			meta: ["1–2 CREW", "10–12 MIN SORTIE", "OPERATION COPPER TIDE"],
			footer:
				"An original flight game inspired by B-17 Bomber (1982).\nIdle for a crew demonstration.",
		});
		this.activity();
	}
	settings() {
		this.show("preferences", {
			title: "Make it your aircraft",
			text: "Your settings stay with this device.",
			rows: [
				"#Sound",
				"volume",
				"music",
				"effects",
				"voice",
				"#Flight & comfort",
				"invertFlight",
				"aimSensitivity",
				"captions",
				"glyphs",
				"motion",
				"shake",
				"invertY",
				"deadzone",
			],
			actions: [
				["Controls & rebinding", () => this.shell.show("controls")],
				["Back", () => this.shell.back()],
			],
		});
	}
	controls() {
		this.show("help", {
			kicker: "FLIGHT HANDBOOK",
			title: "Every station matters",
			text: "Route hold flies the selected course. Any flight stick input takes the aircraft back. The crew never releases your bombs.",
			keys: [
				["WASD / Left stick", "Bank and pitch"],
				["Mouse / Right stick", "Aim or look"],
				["Click · Space / R2", "Fire gun / release bombs"],
				["Q · E / L1 · R1", "Decrease / increase power"],
				["Tab / △", "Station wheel"],
				["1 · 2 · 3", "Pilot · threatened gun · bombsight"],
				["Arrows / D-pad", "Guns: 12 · 3 · 6 · 9 o’clock"],
				["M / □", "Operational map"],
				["H / L3", "Toggle navigation hold"],
				["B · V / L1 · R1 in sight", "Bomb doors · salvo size"],
				["F / ○", "Extinguish engine fire (one bottle)"],
				["Hold J / R3 for 1.5s", "Jettison remaining payload"],
				["Esc / Options", "Pause / menu"],
			],
			sections: [
				[
					"Bombing",
					"The gold impact ring predicts where your bomb will land, including velocity and wind. Open the sight early, keep the ship inside the ring, and release deliberately. The last bomb never prevents a return.",
				],
				[
					"Crew assistance",
					"Unattended guns suppress fighters. Leave a station to AI by taking another. An occupied station requires a second selection to exchange duties. Fire after the transition.",
				],
				[
					"Touch",
					"Drag the left half to fly and the right half to aim. Context actions appear for threats, bombing and return. The menu opens the map and emergency actions.",
				],
			],
		});
	}
	coopMenu() {
		this.show("coop", {
			kicker: "TWO PEOPLE · ONE AIRCRAFT",
			title: "Assemble your crew",
			text: "One flies. One watches the glass. Both may change stations. Connect two standard pads, or use keyboard/mouse plus one pad. The shared sortie pauses for either crew member.",
			actions: [
				[
					"Keyboard + controller",
					() => {
						this.setup.coop = true;
						this.setup.coopMode = "mixed";
						this.brief(true);
					},
				],
				[
					"Two controllers",
					() => {
						this.setup.coop = true;
						this.setup.coopMode = "pads";
						this.brief(true);
					},
				],
				["Back", () => this.shell.back()],
			],
		});
	}
	brief(coop = false) {
		this.setup.practice = null;
		this.setup.dev = false;
		this.setup.coop = coop;
		this.show("brief", {
			kicker: "OPERATION 01 / COPPER TIDE",
			title: "Greyhaven. Then home.",
			text: "Destroy the armed transport at Greyhaven docks. Everything after that is your decision.",
			actions: [
				["Launch sortie", () => this.start(this.setup)],
				[
					"Route: " +
						(this.setup.route === "direct" ? "Direct" : "Northern dogleg"),
					() => {
						this.setup.route =
							this.setup.route === "direct" ? "dogleg" : "direct";
						this.brief(coop);
					},
				],
				[
					"Payload: " + LOADOUTS[this.setup.loadout].name,
					() => {
						const a = Object.keys(LOADOUTS),
							i = a.indexOf(this.setup.loadout);
						this.setup.loadout = a[(i + 1) % a.length];
						this.brief(coop);
					},
				],
				[
					"Skill: " + DIFFICULTIES[this.setup.difficulty].name,
					() => {
						const a = Object.keys(DIFFICULTIES);
						this.setup.difficulty =
							a[(a.indexOf(this.setup.difficulty) + 1) % a.length];
						this.brief(coop);
					},
				],
				["Back", () => this.shell.back()],
			],
		});
		const grid = document.createElement("div");
		grid.className = "brief-grid";
		grid.innerHTML = `<div class="map-board">${this.mapSvg(false)}<div class="map-key"><span>CHANNEL SECTOR / 06:40</span><span>N ↑ · 5 KM GRID</span></div></div><div class="brief-copy"><h3>THE TRANSPORT IS THE TARGET</h3><p>A naval transport shelters between the cranes. One accurate two-bomb salvo can finish the primary.</p><p>Direct: shorter crossing, defended coast.<br>Dogleg: longer flight, a quieter approach.</p><div class="loadout"><strong>${LOADOUTS[this.setup.loadout].name}</strong><p>${LOADOUTS[this.setup.loadout].desc}<br>${LOADOUTS[this.setup.loadout].reserve}</p></div><p>Guns can jam. A sight can fail. One fire bottle buys a second chance. Home repairs, refuels and rearms.</p></div>`;
		$(".esh-mod", this.shell.root).insertBefore(
			grid,
			$(".esh-btns", this.shell.root),
		);
		this.bindMap(grid, false);
	}
	mapSvg(live = true) {
		const s = this.sim.state,
			a = s.aircraft,
			kx = (x) => 55 + ((x + 10000) / 460000) * 620,
			ky = (y) => 130 + ((y + 10000) / 230000) * 220,
			home = [kx(0), ky(0)],
			harbor = [kx(340000), ky(18000)],
			dog = [kx(140000), ky(-66000)];
		return `<svg viewBox="0 0 720 330" role="img" aria-label="Operational map of the Channel, Rookfield, Greyhaven and Bracken"><defs><pattern id="chart-grid" width="72" height="55" patternUnits="userSpaceOnUse"><path d="M72 0H0V55" fill="none" stroke="#45665f" stroke-width=".6" opacity=".6"/></pattern></defs><rect width="720" height="330" fill="#143745"/><path d="M0 0H95L108 65 92 100 110 150 98 205 120 245 90 330H0Z" fill="#536b50" stroke="#b3b18a" stroke-width="2"/><path d="M470 0L454 56 476 94 451 122 480 154 460 180 476 208 460 250 492 288 480 330H720V0Z" fill="#5c7051" stroke="#b3b18a" stroke-width="2"/><path d="M470 153 Q530 150 564 165 L550 178 478 174" fill="#143745"/><rect width="720" height="330" fill="url(#chart-grid)"/><text x="14" y="26" class="map-minor">ENGLAND</text><text x="548" y="28" class="map-minor">OCCUPIED COAST</text><text x="238" y="276" class="map-label" opacity=".5" transform="rotate(-8,238,276)">THE CHANNEL</text><path d="M${home}L${this.setup.route === "dogleg" ? dog + "L" : ""}${harbor}" fill="none" stroke="#ebbd6c" stroke-width="2" stroke-dasharray="7 6"/><circle cx="${kx(270000)}" cy="${ky(-12000)}" r="26" fill="#d5764c" opacity=".2"/><circle cx="${harbor[0]}" cy="${harbor[1]}" r="35" fill="#d5764c" opacity=".13"/>
 ${Object.entries(MISSION.waypoints)
		.map(([id, t]) => {
			const x = kx(t.x),
				y = ky(t.y);
			return `<g class="map-hit" data-target="${id}" tabindex="0" role="button" aria-label="Preview ${esc(t.label)}"><circle cx="${x}" cy="${y}" r="${id === "harbor" ? 8 : 5}" fill="${id === "home" ? "#9fc8a2" : id === "harbor" ? "#ebbd6c" : "#b5c5ae"}" stroke="#0e2a32" stroke-width="2"/><circle cx="${x}" cy="${y}" r="20" fill="transparent"/><text class="map-label" x="${x + (id === "refinery" ? -130 : 12)}" y="${y + (id === "home" ? -12 : 5)}">${esc(t.label)}</text></g>`;
		})
		.join("")}
 ${live ? `<g transform="translate(${kx(a.x)},${ky(a.y)}) rotate(${(a.yaw * 180) / Math.PI + 90})"><path d="M0 -12L8 8 0 4 -8 8Z" fill="#fff3cf" stroke="#122d33" stroke-width="2"/></g>` : ""}<text x="680" y="30" class="map-label">N ↑</text></svg>`;
	}
	bindMap(root, live) {
		root.querySelectorAll("[data-target]").forEach((e) => {
			const f = () => {
				this.preview = e.dataset.target;
				if (live) this.map();
				else {
					const copy = $(".brief-copy", root);
					const t = MISSION.waypoints[this.preview];
					copy.querySelector("h3").textContent = t.label;
					copy.querySelector("p").textContent = this.targetDescription(
						this.preview,
					);
				}
			};
			e.addEventListener("click", f);
			e.addEventListener("keydown", (ev) => {
				if (ev.key === "Enter" || ev.key === " ") {
					ev.preventDefault();
					f();
				}
			});
		});
	}
	targetDescription(id) {
		return {
			harbor:
				"Primary: armed transport. Two direct hits, or one centered salvo. Harbor tanks and works offer optional score.",
			battery:
				"Optional: cliff battery. Destroy it to suppress this coast’s barrage. It is not required for the primary.",
			refinery:
				"Optional: Bracken refinery. Two hits. Only continue if fuel and ordnance permit.",
			home: "Rookfield: cross the approach circle to trigger assisted recovery. A safe abort saves the crew.",
			dogleg:
				"Northern dogleg. Longer distance; more time to answer fighter warnings before the coast.",
		}[id];
	}
	map(owner) {
		this.menuOwner = owner || this.menuOwner || this.game.pausedBy || 1;
		if (this.game.paused) {
			this.shell.hide();
			this.game.resume();
		}
		const s = this.sim.state;
		this.show("navigation", {
			kicker: "NAVIGATOR / AIRCRAFT CONTINUES",
			title: "Choose your next move",
			text: "Fuel and flight continue while this chart is open. Only the flight commander can commit a course.",
			actions: [
				{
					label: "Fly to " + MISSION.waypoints[this.preview].label,
					disabled: s.commandOwner !== this.menuOwner,
					fn: () => {
						this.send({ type: "route", target: this.preview }, this.menuOwner);
						this.clear();
					},
				},
				[
					"Primary: Greyhaven",
					() => {
						this.preview = "harbor";
						this.map();
					},
				],
				[
					"Return: Rookfield",
					() => {
						this.preview = "home";
						this.map();
					},
				],
				[
					"Optional: Refinery",
					() => {
						this.preview = "refinery";
						this.map();
					},
				],
				[
					"Optional: Battery",
					() => {
						this.preview = "battery";
						this.map();
					},
				],
				["Back to station", () => this.clear()],
			],
		});
		const board = document.createElement("div");
		board.className = "brief-grid";
		board.innerHTML = `<div class="map-board">${this.mapSvg()}<div class="map-key"><span>LIVE POSITION</span><span>NO PAUSE</span></div></div><div class="brief-copy"><h3>${MISSION.waypoints[this.preview].label}</h3><p>${this.targetDescription(this.preview)}</p><div class="loadout"><strong>RETURN FORECAST</strong><p>${Math.round((s.aircraft.fuel / s.aircraft.maxFuel) * 100)}% fuel · ${s.bombsLeft} bombs<br>${Math.max(0, Math.round(s.reserve || 0))} seconds above estimated home fuel.<br>Home approach is always available.</p></div></div>`;
		$(".esh-mod", this.shell.root).insertBefore(
			board,
			$(".esh-btns", this.shell.root),
		);
		this.bindMap(board, true);
		this.game.resume();
	}
	wheel(id) {
		if (this.game.paused) {
			this.shell.hide();
			this.game.resume();
		}
		this.wheelPlayer = id;
		this.show("stations", {
			kicker: "STATION SELECT / AI HOLDS COURSE",
			title: "Your next job",
			text: "Each gun watches its own bearing. Select an occupied station twice to exchange duties.",
			actions: STATIONS.map((station) => [
				LABELS[station] +
					(this.sim.state.owners[station] === "AI"
						? " · CREW"
						: this.sim.state.owners[station] === id
							? " · YOU"
							: " · P" + this.sim.state.owners[station]),
				() => {
					const busy =
						this.sim.state.owners[station] !== "AI" &&
						this.sim.state.owners[station] !== id;
					const key = id + station;
					if (busy && this.requestKey !== key) {
						this.requestKey = key;
						this.send({ type: "station", station }, id);
						this.wheel(id);
						return;
					}
					this.send({ type: "station", station, handover: busy }, id);
					this.requestKey = null;
					this.clear();
				},
			]).concat([["Back", () => this.clear()]]),
		});
		this.game.resume();
	}
	practiceMenu() {
		this.show("practice", {
			kicker: "GROUND SCHOOL / LIVE SYSTEMS",
			title: "Learn the crew’s jobs",
			text: "Short drills use the same weapons, bombs, fuel and damage as the operation. Return home or end the drill from pause.",
			actions: [
				[
					"Directional gunnery",
					() => this.start({ ...this.setup, coop: false, practice: "gunnery" }),
				],
				[
					"Bomb calibration",
					() => this.start({ ...this.setup, coop: false, practice: "bombing" }),
				],
				[
					"Damaged return",
					() => this.start({ ...this.setup, coop: false, practice: "return" }),
				],
				["Back", () => this.shell.back()],
			],
		});
	}
	emergency() {
		this.menuOwner = this.game.pausedBy || this.menuOwner || 1;
		this.show("emergency", {
			kicker: "ENGINEER / COMMAND AUTHORITY",
			title: "One aircraft. One chance.",
			text: "The fire bottle is single-use. Jettison permanently discards remaining bombs and improves return performance.",
			actions: [
				[
					"Extinguish engine fire",
					() => {
						this.send({ type: "extinguish" }, this.menuOwner);
						this.shell.toast(
							"ENGINEER",
							this.sim.state.aircraft.fire
								? "Bottle unavailable."
								: "Fire checked.",
						);
					},
				],
				["Back", () => this.shell.back()],
			],
		});
		const b = document.createElement("button");
		b.textContent = "Hold 1.5 seconds to jettison payload";
		b.dataset.holdJettison = "true";
		const start = (e) => {
			e.preventDefault();
			if (e.pointerId !== undefined) b.setPointerCapture?.(e.pointerId);
			clearTimeout(this.jettisonTimer);
			b.textContent = "HOLD… PAYLOAD WILL BE LOST";
			this.jettisonTimer = setTimeout(() => {
				this.send({ type: "jettison", held: 1.5 }, this.menuOwner);
				b.textContent = "PAYLOAD JETTISONED";
			}, 1500);
		};
		const stop = () => {
			clearTimeout(this.jettisonTimer);
			if (this.sim.state.bombsLeft)
				b.textContent = "Hold 1.5 seconds to jettison payload";
		};
		b.onpointerdown = start;
		b.onpointerup = b.onpointercancel = stop;
		b.onkeydown = (e) => {
			if (!e.repeat && (e.code === "Space" || e.code === "Enter")) start(e);
		};
		b.onkeyup = stop;
		b.onblur = stop;
		$(".esh-btns", this.shell.root).prepend(b);
	}
	leaveMenu() {
		if (this.online.active) {
			this.show("leave", {
				kicker: "LIVE HUB ROUND",
				title: "Your crew is still flying",
				text: "The Hub controls departure and results. Close this overlay to resume your station.",
				actions: [["Return to station", () => this.clear()]],
			});
			return;
		}
		this.show("leave", {
			kicker: "LEAVE SORTIE",
			title: "Close the flight log?",
			text: "A safe abort is available through the map. Ending here records the current outcome.",
			actions: [
				["Continue flying", () => this.shell.back()],
				[
					"End and debrief",
					() => {
						this.sim.result("manual");
						this.clear();
					},
				],
				["Title screen", () => this.toTitle()],
			],
		});
	}
	devMenu() {
		if (this.online.active) {
			this.show("dev", {
				kicker: "LIVE HUB ROUND",
				title: "The authority stays in charge",
				text: "World-changing developer tools are available in standalone flight. Display, controls and audio settings remain local to you.",
				actions: [
					["Settings", () => this.settings()],
					["Back", () => this.shell.back()],
				],
			});
			return;
		}
		this.show("dev", {
			kicker: "DEVELOPER FLIGHT DESK · RUN MARKED",
			title: "Test the whole aircraft",
			text: "Changes are live. Every tool marks this sortie as a test run. Controller: up/down selects, left/right adjusts sliders.",
			rows: TUNING.map((t) => "dev_" + t[0]),
			actions: [
				[
					"Reset tuning",
					() => {
						for (const [k, v] of Object.entries(DEFAULT_BALANCE)) {
							this.game.settings.set("dev_" + k, v);
							this.sim.balance[k] = v;
						}
						this.devMenu();
					},
				],
				[
					"Resume test flight",
					() => {
						this.clear();
						this.game.resume();
					},
				],
			],
		});
		const tools = document.createElement("div");
		tools.className = "dev-tools";
		const buttons = [
			[
				"Invulnerable: " + (this.sim.state.invulnerable ? "ON" : "OFF"),
				() => this.sim.dev("invulnerable", !this.sim.state.invulnerable),
			],
			[
				"Infinite stores: " + (this.sim.state.infinite ? "ON" : "OFF"),
				() => this.sim.dev("infinite", !this.sim.state.infinite),
			],
			[
				"Free camera: " + (this.dev.freeCamera ? "ON" : "OFF"),
				() => (this.dev.freeCamera = !this.dev.freeCamera),
			],
			["Collision / trigger volumes", () => (this.dev.debug = !this.dev.debug)],
			["Jump: intercept", () => this.sim.dev("jump", "intercept")],
			["Jump: coast", () => this.sim.dev("jump", "coast")],
			["Jump: bomb approach", () => this.sim.dev("jump", "bomb")],
			["Teleport home approach", () => this.sim.dev("jump", "home")],
			["Spawn nose fighter", () => this.sim.dev("fighter", "nose")],
			["Spawn port fighter", () => this.sim.dev("fighter", "port")],
			["Spawn starboard fighter", () => this.sim.dev("fighter", "starboard")],
			["Spawn tail fighter", () => this.sim.dev("fighter", "tail")],
			["Spawn flak danger", () => this.sim.dev("flak")],
			["Damage engine", () => this.sim.dev("damage", "engine")],
			["Start engine fire", () => this.sim.dev("damage", "fire")],
			["Jam gun", () => this.sim.dev("damage", "gun")],
			["Damage sight", () => this.sim.dev("damage", "sight")],
			["Repair all systems", () => this.sim.dev("repair")],
			[
				"Pause / step: " + (this.dev.paused ? "FROZEN" : "RUNNING"),
				() => {
					this.dev.paused = !this.dev.paused;
					this.game.resume();
				},
			],
			[
				"Step 1/60 second",
				() => {
					this.sim.step(1 / 120);
					this.sim.step(1 / 120);
				},
			],
			[
				"Export state JSON",
				() =>
					this.download(
						"bomber-state.json",
						JSON.stringify(this.sim.snapshot(), null, 2),
					),
			],
			["Mission authoring", () => this.editor()],
			[
				"Restart same seed",
				() =>
					this.start({ ...this.setup, seed: this.sim.state.seed, dev: true }),
			],
		];
		for (const [label, fn] of buttons) {
			const b = document.createElement("button");
			b.textContent = label;
			b.onclick = () => {
				this.sim.state.cheated = true;
				fn();
				if (this.shell.screen === "dev") this.devMenu();
			};
			tools.append(b);
		}
		const box = $(".esh-mod", this.shell.root);
		box.insertBefore(tools, $(".esh-btns", box));
		this.sim.state.cheated = true;
	}
	editor() {
		this.show("editor", {
			kicker: "MISSION AUTHORING / DATA DRIVEN",
			title: "Place the next objective",
			text: "Choose a waypoint, enter world coordinates in metres and apply. Export the definition for another operation. Trigger volumes are shown in the flight test view.",
			actions: [
				[
					"Export mission JSON",
					() => this.download("copper-tide.json", this.sim.exportMission()),
				],
				["Import mission JSON", () => this.importFile()],
				["Back", () => this.shell.back()],
			],
		});
		const div = document.createElement("div");
		div.className = "mission-editor";
		div.innerHTML =
			'<div id="editor-picks"></div><label>East <input id="edit-x" type="number" step="10"></label><label>South <input id="edit-y" type="number" step="10"></label><div id="editor-message" aria-live="polite"></div>';
		const picks = $("#editor-picks", div);
		let selected = "harbor";
		const load = (id) => {
			selected = id;
			$("#edit-x", div).value = Math.round(
				this.sim.definition.waypoints[id].x / U,
			);
			$("#edit-y", div).value = Math.round(
				this.sim.definition.waypoints[id].y / U,
			);
		};
		for (const [id, p] of Object.entries(this.sim.definition.waypoints)) {
			const b = document.createElement("button");
			b.textContent = p.label;
			b.onclick = () => load(id);
			picks.append(b);
		}
		const apply = document.createElement("button");
		apply.textContent = "Apply waypoint & associated target";
		apply.onclick = () => {
			const x = Number($("#edit-x", div).value) * U,
				y = Number($("#edit-y", div).value) * U;
			if (!Number.isFinite(x) || !Number.isFinite(y)) return;
			Object.assign(this.sim.definition.waypoints[selected], { x, y });
			const id = selected === "harbor" ? "ship" : selected;
			for (const list of [
				this.sim.definition.targets,
				this.sim.state.targets,
			]) {
				const t = list.find((t) => t.id === id);
				if (t) Object.assign(t, { x, y });
			}
			this.sim.state.cheated = true;
			this.dev.debug = true;
			$("#editor-message", div).textContent =
				"Position applied. Export retains these changes.";
		};
		div.append(apply);
		const seedLabel = document.createElement("label");
		seedLabel.textContent = "Deterministic seed ";
		const seedInput = document.createElement("input");
		seedInput.type = "number";
		seedInput.min = "1";
		seedInput.max = "4294967295";
		seedInput.value = this.sim.state.seed;
		seedInput.id = "edit-seed";
		seedLabel.append(seedInput);
		div.append(seedLabel);
		const seedButton = document.createElement("button");
		seedButton.textContent = "Restart with seed";
		seedButton.onclick = () =>
			this.start({
				...this.setup,
				seed: Math.max(1, Math.floor(Number(seedInput.value) || 1942)) >>> 0,
				dev: true,
			});
		div.append(seedButton);
		$(".esh-mod", this.shell.root).insertBefore(
			div,
			$(".esh-btns", this.shell.root),
		);
		load("harbor");
	}
	importFile() {
		const f = document.createElement("input");
		f.type = "file";
		f.accept = ".json";
		f.onchange = async () => {
			try {
				this.sim.importMission(await f.files[0].text());
				this.shell.toast(
					"Mission imported",
					"Definition validated. Restart applies new encounters.",
				);
			} catch (e) {
				this.shell.toast("Import rejected", e.message);
			}
		};
		f.click();
	}
	download(name, text) {
		const url = URL.createObjectURL(
				new Blob([text], { type: "application/json" }),
			),
			a = document.createElement("a");
		a.href = url;
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	about(page = 0) {
		this.show("about", {
			kicker: "BUILT FOR THE CREW",
			title: "Source, craft & credits",
			text: "An original game inspired by B-17 Bomber. No affiliation with the original publishers. Original art, music, effects and gibberish voices are generated in code.",
			actions: [
				["Source Information", () => this.about(0)],
				["Testing Feedback", () => this.about(1)],
				["Engine Feedback", () => this.about(2)],
				["Prompt Feedback", () => this.about(3)],
				["Back", () => this.shell.back()],
			],
		});
		const q = [
			[],
			[
				"Issues caught",
				"Critical / game-breaking",
				"Most helpful test",
				"Least helpful test",
			],
			[
				"Liked most",
				"Stuck or guessed wrong",
				"Built for this game",
				"Hardest engine task",
				"Engine changes",
				"One requested change",
			],
			["Liked most", "Confusing", "Hardest task", "Suggested change"],
		];
		const keys = [
				"sourceInformation",
				"testingFeedback",
				"engineFeedback",
				"promptFeedback",
			],
			title = [
				"Source Information",
				"Testing Feedback",
				"Engine Feedback",
				"Prompt Feedback",
			];
		const div = document.createElement("div");
		div.className = "credit-content";
		if (!page) {
			div.innerHTML =
				"<h3>Source Information</h3><dl>" +
				Object.entries(CREDITS.sourceInformation)
					.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
					.join("") +
				'</dl><h3>Research & notices</h3><p><a href="https://history.blueskyrangers.com/instructions/b17bomber.html" target="_blank" rel="noopener">Original instructions</a> · <a href="https://history.blueskyrangers.com/mattelelectronics/games/b17bomber.html" target="_blank" rel="noopener">Developer history</a> · <a href="https://www.intvfunhouse.com/games/b17b.php" target="_blank" rel="noopener">Preserved screenshots</a></p><p>my-3D2dge and Three.js: MIT. Rapier: Apache 2.0. Full notices are embedded in this file.</p>';
			const details = document.createElement("details");
			details.innerHTML = "<summary>Full dependency notices</summary>";
			const pre = document.createElement("pre");
			pre.style.whiteSpace = "pre-wrap";
			pre.style.fontSize = ".8em";
			pre.textContent = $("#legal-notices").textContent;
			details.append(pre);
			div.append(details);
		} else
			div.innerHTML =
				`<h3>${title[page]}</h3>` +
				CREDITS[keys[page]]
					.map((v, i) => `<p><strong>${q[page][i]}</strong><br>${esc(v)}</p>`)
					.join("");
		$(".esh-mod", this.shell.root).insertBefore(
			div,
			$(".esh-btns", this.shell.root),
		);
	}
	results() {
		const s = this.sim.state,
			r = s.result;
		this.clear();
		this.show("results", {
			kicker:
				(s.practice
					? "PRACTICE / "
					: s.cheated
						? "TEST RUN / "
						: "FLIGHT LOG / ") + MISSION.name,
			title: r.outcome,
			emblem: r.win ? "✦" : "◇",
			text:
				{
					success:
						"Primary destroyed. Crew recovered. Rookfield will repair, refuel and rearm the aircraft.",
					abort:
						"Crew recovered. The primary remains. A safe abort leaves another sortie.",
					deadline: "Operation deadline reached. Current progress is recorded.",
					destroyed:
						"The aircraft was lost. Review the warnings and try another approach.",
					"fuel-exhausted":
						"Fuel exhausted. Route and loadout choices leave a larger reserve.",
					"ground-impact":
						"Ground impact. Keep airspeed and altitude above the danger zone.",
					fire: "Engine fire spread beyond recovery. Use the single bottle early.",
				}[r.reason] ||
				"Your sortie is recorded. Repair, refuel and rearm for another run.",
			stats: [
				[r.score.toLocaleString(), "TOTAL SCORE"],
				[r.stats.kills, "FIGHTERS DOWN"],
				[r.stats.accuracy + "%", "BOMB ACCURACY"],
				[minutes(r.stats.duration), "FLIGHT TIME"],
				[r.stats.fuel + "%", "FUEL REMAINING"],
				[r.stats.returnBonus, "RETURN BONUS"],
			],
			medals: [
				["Primary destroyed", r.stats.primary],
				["Crew recovered", r.stats.returned],
				["Damage −" + r.stats.damagePenalty, r.stats.damagePenalty === 0],
				["Wasted bombs −" + r.stats.wastedPenalty, r.stats.wastedPenalty === 0],
			],
			actions: [
				[
					"Repair, rearm & fly again",
					() => this.start({ ...this.setup, seed: (s.seed + 7919) >>> 0 }),
				],
				[
					"Review briefing",
					() => {
						this.toTitle({ briefing: true, coop: this.setup.coop });
					},
				],
				["Title screen", () => this.toTitle()],
			],
		});
	}
	paint(dt) {
		const s = this.sim.state;
		if (this.game.sceneName !== "play" || s.attract) {
			this.hud.hidden = true;
			return;
		}
		if (this.shell.screen) {
			this.hud.hidden = true;
			return;
		}
		if (this.game.real - this.lastHud < 0.08) return;
		this.lastHud = this.game.real;
		const pp = this.localPlayers(),
			split = pp.length > 1,
			a = s.aircraft,
			primary = s.primary;
		this.hud.hidden = false;
		this.hud.className =
			(split ? "split " : "") + (this.touch.active ? "touch-mode" : "");
		const objective =
			s.phase === "return" || s.phase === "landing"
				? "BRING THE CREW HOME"
				: primary
					? "PRIMARY DESTROYED · CHOOSE HOME"
					: "DESTROY THE ARMED TRANSPORT";
		const fuel = Math.round((a.fuel / a.maxFuel) * 100),
			heading = ((a.yaw * 180) / Math.PI + 90 + 360) % 360,
			d = Math.hypot(s.route.x - a.x, s.route.y - a.y) / U / 1000;
		let html = `<div class="hud-top"><div class="objective"><div class="mini">COPPER TIDE / ${s.phase.toUpperCase()}</div><b>${objective}</b><small>${esc(s.route.label)} · ${d.toFixed(1)} KM · ${minutes(s.t)} / 12:00</small></div><div class="vitals"><div class="vital"><label>FUEL RESERVE</label><strong>${fuel}%</strong><div class="bar"><i style="width:${fuel}%"></i></div></div><div class="vital"><label>AIRFRAME</label><strong>${Math.round(a.hull)}%</strong><div class="bar"><i style="width:${a.hull}%;background:${a.hull < 35 ? "#e78c69" : "#a8c7a4"}"></i></div></div></div><button class="menu-toggle" aria-label="Pause menu">☰</button></div>`;
		if (split) html += '<div class="split-line"></div>';
		pp.forEach((p, i) => {
			const I = this.game.players[i] || this.game.input,
				k = (action) => esc(I.label(action)),
				gun = s.mounts[p.station],
				status = gun
					? `${gun.jammed ? "JAMMED" : gun.ammo + " ROUNDS"} · ${Math.round(((p.aim.yaw || 0) * 180) / Math.PI)}° TRAVERSE`
					: p.station === "bombs"
						? `${s.bombsLeft} BOMBS · SALVO ${s.salvo} · ${a.doors > 0.85 ? "DOORS OPEN" : "DOORS MOVING"}`
						: `${a.hold ? "NAV HOLD" : "MANUAL FLIGHT"} · POWER ${Math.round(a.throttle * 100)}%`;
			const tip = gun
				? `${k("fire")} Fire &nbsp; ${k("zoom")} Fine aim &nbsp; Arrows / D-pad bearing`
				: p.station === "bombs"
					? `${k("fire")} Release &nbsp; ${k("doors")} Doors &nbsp; ${k("salvo")} Salvo`
					: `${k("up")} ${k("left")} ${k("down")} ${k("right")} Fly &nbsp; ${k("hold")} Hold &nbsp; ${k("throttleUp")} / ${k("throttleDown")} Power`;
			html += `<div class="seat-hud ${i ? "p2" : ""}"><div class="mini">${split ? "P" + p.id + " / " : ""}${esc(p.name || "AIRCREW")} · ${s.commandOwner === p.id ? "COMMAND" : "CREW"}</div><b>${LABELS[p.station]}</b><div class="readings"><strong>${status}</strong></div><div class="prompts">${tip}<br>${k("wheel")} Stations &nbsp; ${k("map")} Map &nbsp; ${k("pause")} Menu</div><div class="station-links"><button data-station="pilot" data-player="${p.id}">1 FLIGHT</button><button data-station="${s.enemies.find((e) => e.alive)?.bearing || "nose"}" data-player="${p.id}">2 GUNS</button><button data-station="bombs" data-player="${p.id}">3 SIGHT</button></div></div><div class="instrument ${i ? "p2" : ""}"><label>${p.station === "bombs" ? "TIME TO IMPACT" : "ALTITUDE / AIRSPEED"}</label><strong>${p.station === "bombs" ? s.prediction.time.toFixed(1) + " SEC" : Math.round(a.z / U) + " M"}</strong><small>${Math.round((a.speed / U) * 3.6)} KM/H · HDG ${String(Math.round(heading)).padStart(3, "0")}°</small></div>`;
			if (gun) html += `<div class="reticle ${i ? "p2" : ""}"></div>`;
		});
		if (s.caption) {
			const role = MISSION.crew[s.caption.role] || "AIRCREW";
			html += `<div class="radio ${s.caption.urgent ? "urgent" : ""}" style="font-size:${this.game.settings.captions}em"><canvas id="crew-portrait" width="90" height="90"></canvas><div><div class="role">RADIO / ${esc(role)}</div><p>${esc(s.caption.text)}</p></div></div>`;
		}
		if (s.warning) html += `<div class="warning">${esc(s.warning)}</div>`;
		if (s.cheated)
			html += '<div class="cheat-badge">DEV FLIGHT · SCORES UNSAVED</div>';
		if (pp.some((p) => p.station === "bombs")) {
			const dist =
					Math.hypot(
						s.prediction.x - s.targets[0].x,
						s.prediction.y - s.targets[0].y,
					) / U,
				ready = dist < 110;
			html += `<div class="bomb-inset"><label>${s.sightDamaged ? "COARSE SIGHT · DAMAGED" : "BOMB SOLUTION · WIND INCLUDED"}</label><strong>${primary ? "PRIMARY CONFIRMED" : s.sightDamaged ? "COARSE IMPACT REFERENCE" : ready ? "RELEASE WINDOW" : "IMPACT OFFSET " + Math.round(dist) + " M"}</strong><small>${primary ? "Select HOME on the map." : ready ? "Transport in blast radius. Fire to release." : "Guide the gold ring over the transport."}<br>Wind ${Math.round(s.wind.y * 1.5)} kn right · ${s.bombsLeft} bombs left</small></div>`;
		}
		if (s.lastImpact && s.t - s.lastImpact.at < 7)
			html += `<div class="bomb-inset"><label>IMPACT REPORT</label><strong>${s.lastImpact.hit ? "DIRECT HIT" : "SPLASH / WIDE"}</strong><small>${s.primary ? "Transport destroyed. Set a return course." : s.bombsLeft ? "Another pass remains available." : "Set course for Rookfield."}</small></div>`;
		const p = pp[0],
			threat = s.enemies.find((e) => e.alive),
			context = [];
		if (a.fire) context.push(["EXTINGUISH", "extinguish"]);
		if (p?.station === "bombs")
			context.push([`RELEASE ×${s.salvo}`, "release"]);
		else if (a.x > 240000 && !s.primary && s.bombsLeft)
			context.push(["BOMB SIGHT", "bombs"]);
		else if (threat && s.mounts[p?.station])
			context.push(["FIRE BURST", "fire"]);
		else if (threat)
			context.push([
				`GUN · ${{ nose: 12, starboard: 3, tail: 6, port: 9 }[threat.bearing]}`,
				"gun",
			]);
		if (primary || !s.bombsLeft) context.push(["HOME", "home"]);
		if (!context.length) context.push(["STATIONS", "stations"]);
		html +=
			'<div class="touch-actions">' +
			context
				.map(([l, id]) => `<button data-context="${id}">${l}</button>`)
				.join("") +
			"</div>";
		this.hud.innerHTML = html;
		const activate = (button, fn) => {
			button.onpointerdown = (e) => {
				if (e.button !== undefined && e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				this.consumePointer?.(e);
				fn();
			};
			button.onclick = (e) => {
				if (e.detail === 0) fn();
			};
		};
		activate($(".menu-toggle", this.hud), () => {
			this.menuOwner = this.online.active ? this.online.localId || 1 : 1;
			this.game.pausedBy = this.menuOwner;
			this.game.menu();
		});
		this.hud.querySelectorAll("[data-station]").forEach((b) => {
			activate(b, () => {
				this.send(
					{ type: "station", station: b.dataset.station, handover: false },
					Number(b.dataset.player),
				);
				this.clear();
			});
		});
		this.hud.querySelectorAll("[data-context]").forEach((b) => {
			activate(b, () => {
				const c = b.dataset.context;
				if (c === "release") this.send({ type: "release", salvo: s.salvo });
				else if (c === "home") this.send({ type: "route", target: "home" });
				else if (c === "bombs")
					this.send({ type: "station", station: "bombs" });
				else if (c === "gun")
					this.send({ type: "station", station: threat.bearing });
				else if (c === "stations") this.wheel(p.id);
				else this.send({ type: c });
			});
		});
		this.hud.querySelectorAll("[data-context=fire]").forEach((b) => {
			b.onpointerdown = (e) => {
				e.preventDefault();
				this.touch.fire = true;
				this.touch.firePointer = e.pointerId;
				b.setPointerCapture?.(e.pointerId);
			};
			b.onpointerup = b.onpointercancel = () => (this.touch.fire = false);
		});
		const cv = $("#crew-portrait", this.hud);
		if (cv) {
			const rig = this.portraits[s.caption.role] || this.portraits.pilot;
			rig.update(dt, { expr: s.caption.urgent ? "shout" : "smile" });
			rig.drawPortrait(cv.getContext("2d"), 2, 2, 86, {
				zoom: 2.6,
				turn: 0.3,
				bg: "#29484b",
				frame: false,
			});
		}
	}
}
