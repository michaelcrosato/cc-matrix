(() => {
	"use strict";
	const T = globalThis.TSS,
		E = My3D2dge;
	const human = (key) =>
		key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
	class UI {
		constructor(app) {
			this.app = app;
			const g = (this.game = app.game);
			this.shell = new E.Shell(g, {
				theme: {
					ink: "#fff1d2",
					paper: "#102a2df5",
					accent: "#f8c574",
					muted: "#bfd1c1",
					danger: "#ef847e",
					line: "#52685c",
					font: "Trebuchet MS, sans-serif",
					titleFont: "Georgia, serif",
					scale: () => Math.max(1.12, Math.min(2.35, innerWidth / 820)),
				},
				screens: {
					pause: {
						kicker: () =>
							app.net
								? "AI HUB · THE WORLD KEEPS MOVING"
								: "ON A LITTLE SHELL BREAK",
						title: "Room to breathe.",
						text: () =>
							app.net
								? "Your turtle rests while your partner carries on."
								: "The guests can wait a moment.",
						actions: () =>
							app.net
								? [
										["World inspector", () => this.dev()],
										["About this hotel", () => this.about()],
									]
								: [
										["Start a fresh run", () => app.start(app.localStyle)],
										["Developer tools", () => this.dev()],
										["About this hotel", () => this.about()],
									],
					},
				},
			});
			// Native DOM screens retain native focus navigation, input suppression and rebinding.
			this.shell.root?.addEventListener("pointerover", (event) => {
				const button = event.target.closest("button,input");
				if (button && event.pointerType === "mouse" && !button.disabled)
					button.focus({ preventScroll: true });
			});
			this.devPage = 0;
			this.aboutPage = 0;
			this.syncing = true;
			for (const [key, limits] of Object.entries(T.BALANCE_LIMITS))
				g.settings.define({
					key: "dev_" + key,
					group: "Developer",
					hidden: true,
					label: human(key),
					type: "slider",
					value: T.DEFAULT_BALANCE[key],
					min: limits[0],
					max: limits[1],
					step: limits[2],
					apply: (_game, value) => {
						if (app.sim && !app.net && !this.syncing) {
							app.sim.setBalance(key, value);
							this.syncDev();
						}
					},
				});
			g.settings.define({
				key: "devFloor",
				group: "Developer",
				hidden: true,
				label: "Practice floor",
				type: "slider",
				value: 1,
				min: 1,
				max: 5,
				step: 1,
			});
			g.settings.define({
				key: "devTime",
				group: "Developer",
				hidden: true,
				label: "Time scale",
				type: "slider",
				value: 1,
				min: 0.25,
				max: 2,
				step: 0.25,
				apply: (_g, v) => {
					if (app.sim && !app.net && !this.syncing) app.sim.dev("timeScale", v);
				},
			});
			this.syncing = false;
		}
		syncDev() {
			this.syncing = true;
			if (this.app.sim)
				for (const [key, v] of Object.entries(this.app.sim.state.balance))
					this.game.settings["dev_" + key] = v;
			this.game.settings.devTime = this.app.sim?.state.dev?.timeScale || 1;
			this.syncing = false;
		}
		title() {
			const app = this.app;
			this.shell.hide();
			this.shell.show("title", {
				kicker: "THE HOTEL NEEDS A HELPING SHELL",
				name: T.IDENTITY.title,
				subtitle: "Small guests. Grand escapes.",
				text: "Find the little ones. Carry them home.\nMind the beetles on your way up!",
				actions: [
					["Check in · Solo", () => app.start("solo")],
					["Check in together", () => this.coop()],
					["How to rescue", () => this.help()],
					["Settings", () => this.shell.show("settings")],
					["About this hotel", () => this.about()],
				],
				footer: () => app.controls.prompt(),
				meta: ["5 FLOORS", "26 TINY GUESTS", "1–2 RESCUERS"],
			});
		}
		coop() {
			this.shell.show("coop", {
				kicker: "TWO SHELLS ARE BETTER THAN ONE",
				title: "Share the service.",
				text: "Both turtles move at once. Share three lives,\none bomb at a time, and all the little victories.",
				sections: [
					[
						"Choose your devices",
						"Local co-op uses a keyboard or controllers.\nTouch-only play is solo.",
					],
					[
						"Across the internet",
						"Launch through AI Hub for remote co-op.\nThis file plays locally without a service.",
					],
				],
				actions: [
					["Shared keyboard", () => this.coopStart("shared")],
					["Keyboard + controller", () => this.coopStart("keyboard-pad")],
					["Two controllers", () => this.coopStart("pads")],
					["Back", () => this.shell.back()],
				],
			});
		}
		coopStart(style) {
			const map =
				style === "shared"
					? "Fern: WASD + Space\nPip: Arrows + Right Shift"
					: style === "keyboard-pad"
						? "Fern: WASD / Arrows + Space\nPip: Controller 1, stick + Cross"
						: "Fern: Controller 1\nPip: Controller 2\nLeft stick / D-pad + Cross";
			this.shell.show("assignment", {
				kicker: "MEET YOUR SHIFT PARTNER",
				title: "Fern & Pip",
				text: map,
				sections: [
					[
						"One team",
						"Pass through your partner. Each can carry one baby.\nMatch your passenger’s symbol to the glowing home.",
					],
				],
				actions: [
					["Begin together", () => this.app.start(style)],
					["Back", () => this.shell.back()],
				],
			});
		}
		help(page = 0) {
			const pages = [
				[
					"A guest on your back.",
					[
						[
							"1 · Investigate",
							"Walk into a ? room with an empty shell.\nA hatchling climbs aboard… or a beetle scuttles out!",
						],
						[
							"2 · Match the welcome",
							"Carry one baby to the edge home with its symbol.\nWalk into the glow to complete the reunion.",
						],
						[
							"3 · Keep going up",
							"Rescue every baby to reach the next floor.\nTwenty-six little guests are waiting for you.",
						],
					],
				],
				[
					"Make a little breathing room.",
					[
						[
							"The beetles learn",
							"Blue wanders. Yellow sees along corridors.\nRed follows around corners. Break sight and keep moving.",
						],
						[
							"Plant a bug bomb",
							"Space / Cross / right-click plants at your feet.\nOne team bomb at a time. It stuns nearby beetles.",
						],
						[
							"Ring the supply bell",
							"The central + gives two bombs, up to five.\nIt recharges in six seconds. Leave and re-enter.",
						],
					],
				],
				[
					"Every shell counts.",
					[
						[
							"Three shared lives",
							"A hit costs one life. Your baby waits in its old room.\nDelivered babies stay safe. The third hit ends the shift.",
						],
						[
							"Choose your way",
							"Stick / D-pad or WASD / Arrows moves.\nClick a corridor to walk there; manual movement cancels.",
						],
						[
							"On glass",
							"Drag anywhere for an invisible four-way stick.\nPOP appears near danger. Auto-defence is assisted.",
						],
					],
				],
			];
			const [title, sections] = pages[page];
			this.shell.show("help", {
				kicker: "HOW TO RESCUE · " + (page + 1) + "/3",
				title,
				sections,
				actions: [
					[
						page < 2 ? "Next" : "Got it",
						() => (page < 2 ? this.help(page + 1) : this.shell.back()),
					],
					...(page ? [["Previous", () => this.help(page - 1)]] : []),
					["Back", () => this.shell.back()],
				],
			});
		}
		about(page = 0) {
			const info = T.INTERVIEW,
				s = info.sourceInformation;
			const source = Object.entries(s).map(([key, value]) => [
				human(key),
				value,
			]);
			const groups = [];
			for (let i = 0; i < source.length; i += 3)
				groups.push(["Source Information", source.slice(i, i + 3)]);
			const feedback = [
				[
					"Testing Feedback",
					[
						"Issues found",
						"Critical issues",
						"Most helpful test",
						"Least helpful test",
					],
					info.testingFeedback,
				],
				[
					"Engine Feedback",
					[
						"What worked best",
						"Where I got stuck",
						"What I built",
						"Hardest engine task",
						"Engine changes",
						"One engine request",
					],
					info.engineFeedback,
				],
				[
					"Prompt Feedback",
					[
						"What worked best",
						"What was confusing",
						"Hardest task",
						"One prompt change",
					],
					info.promptFeedback,
				],
			];
			for (const [name, labels, values] of feedback)
				for (let i = 0; i < labels.length; i += 2)
					groups.push([
						name,
						labels.slice(i, i + 2).map((label, j) => [label, values[i + j]]),
					]);
			groups.push([
				"Made for this little hotel",
				[
					[
						"Original work",
						"Game, creatures, hotel layouts, music and gibberish voices authored in code. Inspired by the 1983 US Odyssey² Turtles. Historical art is research only.",
					],
					[
						"Engine & protocol",
						"my-3D2dge v0.89.1 · Michael Crosato\nAI Hub session client 1.4.0, unchanged.\nPinned source and license provenance included in this HTML.",
					],
				],
			]);
			const [title, sections] = groups[page];
			this.aboutPage = page;
			this.shell.show("about", {
				kicker: "ABOUT THIS HOTEL · " + (page + 1) + "/" + groups.length,
				title,
				sections,
				actions: [
					...(page < groups.length - 1
						? [["Next page", () => this.about(page + 1)]]
						: []),
					...(page ? [["Previous page", () => this.about(page - 1)]] : []),
					["Back", () => this.shell.back()],
				],
			});
		}
		dev(page = 0) {
			const app = this.app,
				sim = app.sim,
				s = sim.state;
			if (app.net) {
				this.shell.show("inspector", {
					kicker: "READ-ONLY · AUTHORITATIVE WORLD",
					title: "The service ledger",
					text:
						"Floor " +
						(s.floor + 1) +
						" · tick " +
						s.tick +
						" · " +
						s.phase +
						"\nScore " +
						s.score +
						" · lives " +
						s.lives +
						" · stock " +
						s.stock,
					sections: [
						[
							"Seats",
							s.players
								.map(
									(p) =>
										"P" +
										p.seat +
										": " +
										(p.active
											? p.carry
												? "carrying " + p.carry
												: "empty shell"
											: "departed"),
								)
								.join("\n"),
						],
						["Network", JSON.stringify(app.net.inspect())],
					],
					actions: [["Back", () => this.shell.back()]],
				});
				return;
			}
			this.devPage = page;
			this.syncDev();
			const use = (action, v) => {
				sim.dev(action, v);
				this.syncDev();
				this.dev(page);
			};
			const pages = [
				{
					title: "The service workshop",
					rows: ["devFloor", "devTime"],
					actions: [
						[
							"Visit selected floor",
							() => use("floor", this.game.settings.devFloor - 1),
						],
						["Restart this floor", () => use("restart")],
						[
							"Invulnerability: " + (s.dev.invulnerable ? "ON" : "OFF"),
							() => use("invulnerable"),
						],
						["Refill team bombs", () => use("refill")],
						[
							"One simulation step",
							() => {
								sim.dev("timeScale", sim.state.dev.timeScale);
								sim.step(1 / 120, {});
								app.events(sim.events);
								this.dev(page);
							},
						],
					],
				},
				{
					title: "Movement & pursuit",
					rows: [
						"dev_playerSpeed",
						"dev_carryingMultiplier",
						"dev_beetleSpeed",
						"dev_yellowAge",
						"dev_redAge",
					],
					actions: [],
				},
				{
					title: "A little bug science",
					rows: ["dev_stunDuration", "dev_bombLifetime", "dev_supplyRecharge"],
					actions: [
						[
							"Reveal room data: " + (s.dev.reveal ? "ON" : "OFF"),
							() => use("reveal"),
						],
						[
							"Graph / sight / collision: " + (s.dev.overlays ? "ON" : "OFF"),
							() => use("overlays"),
						],
						["Add a beetle", () => use("spawn")],
						["Clear beetles", () => use("clear")],
					],
				},
				{
					title: "The service ledger",
					text:
						"Floor " +
						(s.floor + 1) +
						" · tick " +
						s.tick +
						" · " +
						s.phase +
						"\nScore " +
						s.score +
						" · lives " +
						s.lives +
						" · bombs " +
						s.stock,
					sections: [
						[
							"Passengers",
							s.players
								.map(
									(p) =>
										"P" +
										p.seat +
										" at " +
										Math.round(p.x) +
										"," +
										Math.round(p.y) +
										"\nBaby: " +
										(p.carry || "none") +
										" · home: " +
										(p.home || "none"),
								)
								.join("\n"),
						],
						[
							"Encounter",
							s.enemies
								.map(
									(e) => e.id + " " + e.state + " " + Math.floor(e.age) + "s",
								)
								.join(" · "),
						],
					],
					actions: [],
				},
			];
			const data = pages[page];
			this.shell.show("dev", {
				kicker:
					"DEVELOPER TOOLS · " + (page + 1) + "/4 · PRACTICE WHEN CHANGED",
				...data,
				actions: [
					...data.actions,
					["Next page", () => this.dev((page + 1) % pages.length)],
					[
						"Reset balance defaults",
						() => {
							sim.resetBalance();
							this.syncDev();
							this.dev(page);
						},
					],
					["Back", () => this.shell.back()],
				],
			});
		}
		result() {
			const app = this.app,
				s = app.sim.state,
				won = s.phase === "won";
			const key =
				(app.localStyle === "solo" ? "solo" : "coop") +
				(s.practice ? ":practice" : s.assisted ? ":assisted" : "");
			const best = Math.max(s.score, E.store.get("tss:best:" + key, 0));
			if (!s.demo) E.store.set("tss:best:" + key, best);
			this.shell.hide();
			this.shell.show("results", {
				kicker: s.practice
					? "PRACTICE SHIFT · UNRANKED"
					: s.assisted
						? "ASSISTED SHIFT"
						: "SHIFT COMPLETE",
				title: won ? "Every guest, home at last." : "A shell-earned rest.",
				text: won
					? "From the lobby to the sky, you carried them all.\nThe hotel sends its warmest little thank-you."
					: "The little ones you delivered are safe.\nTake a breath, then try a fresh shift.",
				stats: [
					[s.score.toLocaleString(), "TEAM SCORE"],
					[s.totalRescued + " / 26", "GUESTS SAFE"],
					[formatTime(s.time), "SHIFT TIME"],
					[best.toLocaleString(), "LOCAL BEST"],
				],
				actions: [
					["Another shift", () => app.start(app.localStyle)],
					["Return to the hotel", () => app.toTitle()],
					["About this hotel", () => this.about()],
				],
				back: () => app.toTitle(),
			});
		}
	}
	const formatTime = (time) =>
		Math.floor(time / 60) +
		":" +
		String(Math.floor(time % 60)).padStart(2, "0");
	T.UI = UI;
	T.formatTime = formatTime;
})();
