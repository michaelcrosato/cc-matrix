(() => {
	const E = My3D2dge;
	const sensibleInvite = (app) =>
		!app.net || (app.net.authority && app.sim.state.players.length === 1);
	class ExpeditionUI {
		constructor(app) {
			this.app = app;
			this.game = app.game;
			this.pairOut = "";
			this.pairIn = "";
			this.pairStatus = "";
			this.lastRoute = "";
			this.lastPhase = "";
			this.lastNotice = "";
			this.lastScreen = null;
			this.shell = new E.Shell(this.game, {
				theme: {
					ink: "#f0e6ce",
					paper: "rgba(11,23,25,.95)",
					accent: "#e9bc75",
					muted: "#aebfba",
					danger: "#eb8d77",
					line: "#bca26b45",
					font: "system-ui, sans-serif",
					titleFont: "Georgia, serif",
					scale: () => (innerWidth > 900 ? Math.min(2, innerWidth / 960) : 1),
				},
				screens: {
					pause: {
						kicker: "The field journal",
						title: "Rest a moment",
						text: () =>
							app.online
								? "Your menu is open. The shared expedition continues."
								: app.mode === "couch"
									? "Both rangers wait. This is a shared couch pause."
									: "The lantern waits. Your expedition is paused.",
						actions: () => this.pauseActions(),
					},
					help: {
						kicker: "The ranger’s handbook",
						title: "Listen. Place the shot. Find the way.",
						sections: [
							[
								"The road",
								"Find an axe, a folded ferry, and the Index Key. Each tool opens the next wilderness route. Reunite the two crown halves at Crownweather.",
							],
							[
								"The bow",
								"One press draws and releases one arrow. Misses can be recovered. Three wall reflections at most; a banked shaft can hit its shooter.",
							],
							[
								"Light and sound",
								"Every arrow briefly lights a passage and draws listeners toward its landing. Hold focus to move quietly. Tracks and descriptive cues carry the same clues when muted.",
							],
							[
								"Survival",
								"Three hearts. Three shared expedition reserves. Restart Section restores its creatures and supplies together, without costing a reserve. In co-op, hold interact beside a fallen ranger.",
							],
							[
								"Touch",
								"Drag the left half to move. Double-tap there to quickstep. Tap the right half to shoot; drag it to aim, hold it to listen. Nearby actions appear only when useful. Aim assistance is on; dodge assistance is optional.",
							],
						],
						actions: [
							["Controls & rebinding", () => this.open("controls")],
							["Back", () => this.shell.back()],
						],
					},
				},
				settings: {
					items: [
						{
							key: "aimAssist",
							label: "Aim assistance",
							value: true,
							help: "A modest aim toward visible creatures when no deliberate aim is held.",
						},
						{
							key: "dodgeAssist",
							label: "Dodge assistance",
							value: false,
							help: "Touch: quickstep away from a nearby committed attack.",
						},
						{
							key: "captions",
							label: "Creature cue captions",
							value: true,
							help: "Coarse direction and descriptive sound cues, including while muted.",
						},
					],
					onChange: (settings, key) => {
						if (key.startsWith("dev_"))
							this.applyDevSetting(key.slice(4), settings[key]);
					},
				},
			});
			if (this.shell.root) this.shell.root.classList.add("dt-shell");
			for (const sp of DTConfig.sliders)
				this.game.settings.define({
					key: "dev_" + sp.key,
					label: sp.label,
					type: "slider",
					group: "Developer",
					value: DTConfig.defaults[sp.key],
					min: sp.min,
					max: sp.max,
					step: sp.step,
					apply: () => {},
				});
			for (const [key, label] of [
				["infiniteHealth", "Infinite health"],
				["infiniteAmmo", "Infinite arrows"],
				["noclip", "Pass through walls"],
				["reveal", "Reveal fog"],
				["collision", "Collision overlay"],
				["navigation", "Navigation overlay"],
				["hearing", "Hearing overlay"],
				["los", "Line of sight overlay"],
			])
				this.game.settings.define({
					key: "dev_" + key,
					label,
					type: "toggle",
					group: "Developer",
					value: false,
				});
			this.shell.root?.addEventListener("pointerover", (e) => {
				if (e.target.tagName === "BUTTON" && !e.target.disabled)
					e.target.focus({ preventScroll: true });
			});
			this.shell.root?.addEventListener("click", (e) => {
				if (
					this.shell.screen !== "route" ||
					!e.target.classList.contains("esh-sh")
				)
					return;
				const at = this.game.input.screenPoint(e.clientX, e.clientY);
				if (!at) return;
				const s = app.sim.state;
				const node = DTContent.nodes.find((n) => {
					const p = app.renderer.nodeScreen(n.id);
					return p && Math.hypot(p[0] - at[0], p[1] - at[1]) < 20;
				});
				if (node) {
					const edge = DTContent.edges.find(
						(e) =>
							(e.from === s.node && e.to === node.id) ||
							(e.to === s.node && e.from === node.id),
					);
					if (edge && (!edge.requires || s.tools[edge.requires]))
						app.travel(node.id);
				}
			});
		}
		open(name, spec = {}) {
			this.app.inputs?.clear();
			if (!this.shell.screen) this.game.menu(name, { pause: !this.app.online });
			this.shell.show(name, spec);
			this.syncScreen();
		}
		syncScreen() {
			if (this.shell.root)
				this.shell.root.dataset.screen = this.shell.screen || "play";
		}
		title() {
			this.shell.hide();
			this.game.resume();
			this.lastPhase = "";
			this.lastRoute = "";
			const hasSave = !!this.app.store.read();
			this.shell.show("title", {
				kicker: "A lantern-lit expedition · 01",
				name: "Dungeons\nand Deeper\nTrouble",
				subtitle: "The mountain keeps what you have seen.",
				actions: [
					{
						label: "Begin expedition",
						primary: true,
						fn: () => this.newExpedition("solo"),
					},
					hasSave && ["Continue the trail", () => this.app.start("solo", true)],
					["Two rangers", () => this.coop()],
					["Field guide", () => this.open("help")],
					["Settings", () => this.open("settings")],
					["About & credits", () => this.about(0)],
				],
				meta: ["1–2 RANGERS", "BOW · LIGHT · ECHO"],
				footer: "Inspired by the 1982 Intellivision adventure",
			});
			this.shell.root
				?.querySelector(".esh-ttl button.pri")
				?.setAttribute("aria-label", "Begin expedition");
			this.syncScreen();
		}
		newExpedition(mode) {
			if (this.app.store.read())
				this.open("new", {
					kicker: "A fresh trail",
					title: "Begin another expedition?",
					text: "Your current local expedition will be replaced when the new one is saved.",
					actions: [
						["Keep my trail", () => this.shell.back()],
						{
							label: "Begin anew",
							primary: true,
							fn: () => {
								this.app.store.clear();
								this.app.start(mode);
							},
						},
					],
				});
			else this.app.start(mode);
		}
		coop() {
			this.open("coop", {
				kicker: "Share the lantern",
				title: "Two rangers. One expedition.",
				text: "Share arrows, tools and the road home. Every passage can also be crossed alone.",
				actions: [
					{
						label: "Couch co-op",
						primary: true,
						fn: () => this.newExpedition("couch"),
					},
					["Direct online · host", () => this.pair("host")],
					["Direct online · join", () => this.pair("guest")],
					["Back", () => this.shell.back()],
				],
				sections: [
					[
						"On the couch",
						"Use two controllers, or keyboard and mouse plus one controller. A free controller joins with Options. Each device belongs to one ranger.",
					],
					[
						"Across the internet",
						"Exchange a one-time invitation and reply using your own messaging service. Direct WebRTC; some networks require a relay and cannot connect.",
					],
				],
			});
		}
		pauseActions() {
			const app = this.app;
			return [
				!app.hub && [
					"Restart cave / section",
					() =>
						this.open("restart", {
							kicker: "Start this section again",
							title: "Return to the entry lantern?",
							text: "Creatures, arrows and supplies return together. No reserve is spent. Progress within this section rolls back.",
							actions: [
								["Keep exploring", () => this.shell.back()],
								[
									"Restart section",
									() => {
										app.sim.restart();
										app.save(true);
										this.shell.hide();
										app.inputs.clear();
									},
								],
							],
						}),
				],
				!app.hub &&
					app.mode !== "couch" &&
					sensibleInvite(app) && [
						"Invite an online ranger",
						() => this.pair("host"),
					],
				["Field map", () => this.fieldMap()],
				["Developer tools", () => this.dev()],
				["About & credits", () => this.about(0)],
				app.mode === "couch" &&
					app.sim.state.players.length > 1 && [
						"Partner leaves",
						() => {
							app.sim.leave(2);
							if (this.game.players.length > 1) this.game.removePlayer(2);
							this.shell.toast(
								"One ranger carries on",
								"The shared quiver stays with the expedition.",
							);
							this.shell.hide();
						},
					],
			].filter(Boolean);
		}
		route() {
			const app = this.app,
				s = app.sim.state,
				n = DTContent.nodes.find((n) => n.id === s.node);
			const neighbors = DTContent.edges
				.filter((e) => e.from === s.node || e.to === s.node)
				.map((e) => {
					const id = e.from === s.node ? e.to : e.from;
					return {
						node: DTContent.nodes.find((n) => n.id === id),
						requires: e.requires,
					};
				});
			const actions = neighbors.map(({ node, requires }) => ({
				label:
					requires && !s.tools[requires]
						? "◇ " + node.name + " · needs " + requires
						: "→ " + node.name,
				disabled: !!requires && !s.tools[requires],
				primary: !requires || s.tools[requires],
				fn: () => app.travel(node.id),
			}));
			this.shell.hide();
			this.game.resume();
			this.shell.show("route", {
				kicker: "The wilderness · choose a trail",
				title: n?.name || "The old road",
				text: n?.clue || s.objective,
				actions: [
					...actions,
					[
						"Open journal",
						() => {
							this.game.pause("player");
							this.shell.hide();
							this.game.pause("player");
							this.shell.show("pause");
						},
					],
				],
				footer: "Axe → forest  ·  Ferry → river  ·  Key → summit",
			});
			this.lastRoute = s.node;
			this.syncScreen();
		}
		fieldMap() {
			const app = this.app,
				s = app.sim.state,
				map = app.renderer.getMap?.() || app.renderer.map;
			if (s.phase !== "cave" || !map) {
				this.open("journal", {
					kicker: "The expedition journal",
					title: "A way to the morning",
					text: s.objective,
					sections: DTContent.nodes.map((n) => [n.name, n.clue]),
					actions: [["Back", () => this.shell.back()]],
				});
				return;
			}
			const width = map.w;
			this.open("map", {
				title: app.sim.getCave()?.name || "Field map",
				text: "Only your explored passages are remembered. Arrow light is temporary.",
				map,
				at: s.players[0],
				fog: {
					visible: ([x, y]) => s.visible.includes(y * width + x),
					seen: ([x, y]) => s.explored.includes(y * width + x),
				},
				markers: [
					...(s.pickups || [])
						.filter(
							(p) =>
								!p.taken &&
								s.explored.includes(
									Math.floor(p.y / 16) * width + Math.floor(p.x / 16),
								),
						)
						.map((p) => ({
							x: p.x,
							y: p.y,
							kind: "diamond",
							color: "#e9bc75",
						})),
				],
				actions: [["Back to the trail", () => this.shell.back()]],
			});
		}
		result() {
			const app = this.app,
				s = app.sim.state,
				won = s.phase === "victory",
				st = s.stats;
			this.shell.hide();
			this.game.resume();
			this.shell.show("results", {
				kicker: won
					? "The mountain has kept its promise"
					: "The trail falls quiet",
				title: won ? "Bring the morning home." : "A lantern goes out.",
				emblem: won ? "♛" : "◇",
				text: won
					? "The Wayfarer’s Crown is whole. Its light belongs to every traveler who finds a way home."
					: "Courage carried you this far. There are still roads worth learning.",
				stats: [
					[
						Math.floor(s.time / 60) +
							":" +
							String(Math.floor(s.time % 60)).padStart(2, "0"),
						"EXPEDITION",
					],
					[s.relics.length + "/2", "CROWN HALVES"],
					[st.shots ?? 0, "ARROWS LOOSED"],
					[st.restarts ?? 0, "RESTARTS"],
				],
				medals: [
					["Crown reunited", won],
					["Unassisted trail", !s.assisted && !st.assisted],
					["Three reserves kept", s.reserves === 3],
				],
				actions: app.hub
					? [["Expedition journal", () => this.about(0)]]
					: [
							...(!won
								? [
										[
											"Continue with assistance",
											() => {
												app.sim.dev("continue");
												this.shell.hide();
												app.inputs.clear();
												this.lastPhase = "";
											},
										],
									]
								: []),
							{
								label: "A new expedition",
								primary: true,
								fn: () =>
									this.newExpedition(app.mode === "couch" ? "couch" : "solo"),
							},
							["Return to title", () => app.toTitle()],
						],
			});
			this.syncScreen();
		}
		about(page = 0) {
			const meta = globalThis.DTMeta,
				source = meta.sourceInformation;
			const fields = (keys) =>
				keys.map((key) => [key.replace(/([A-Z])/g, " $1"), source[key]]);
			const pages = [
				{
					title: "The expedition & its makers",
					sections: [
						[
							"An original adventure",
							"Dungeons and Deeper Trouble. Listen. Place the shot. Find the way through.",
						],
						...fields(["date", "source", "plan", "genre", "perspective"]),
					],
				},
				{
					title: "Made of light and code",
					sections: fields([
						"tech",
						"artDirection",
						"animation",
						"audio",
						"online",
					]),
				},
				{
					title: "Research & credits",
					sections: [
						...fields(["testing", "research", "environment", "model", "usage"]),
						[
							"Credits",
							"Original game, art, writing and score built by OpenAI gpt-6.1-sol, ultra. my-3D2dge and AI Hub by Michael Crosato. Engine MIT license preserved in this file. Source reference by Mattel/APh (1982), programmed by Tom Loughry. This is an original homage.",
						],
					],
				},
				{
					title: "Testing feedback",
					sections: meta.testingFeedback.map((v, i) => [
						[
							"Issues found",
							"Critical issues",
							"Most helpful test",
							"Least helpful test",
						][i],
						v,
					]),
				},
				{
					title: "Engine feedback",
					sections: meta.engineFeedback.map((v, i) => [
						[
							"Best part",
							"Where I got stuck",
							"Built for this game",
							"Hardest integration",
							"Engine changes",
							"One improvement",
						][i],
						v,
					]),
				},
				{
					title: "Prompt feedback",
					sections: meta.promptFeedback.map((v, i) => [
						[
							"Best part",
							"What was confusing",
							"Hardest part",
							"Suggested change",
						][i],
						v,
					]),
				},
			];
			const current = pages[page];
			this.open("about", {
				kicker: "Field notes · " + (page + 1) + " / " + pages.length,
				title: current.title,
				sections: current.sections,
				actions: [
					...(page < pages.length - 1
						? [[pages[page + 1].title, () => this.about(page + 1)]]
						: []),
					...(page < 2 ? [["Testing feedback", () => this.about(3)]] : []),
					...(page > 0 ? [["Previous page", () => this.about(page - 1)]] : []),
					["Back", () => this.shell.back()],
				],
			});
		}

		dev() {
			const app = this.app;
			this.open("developer", {
				kicker:
					"Developer tools · " +
					(app.hub
						? "read-only session diagnostics"
						: "experiments are assisted"),
				title: "Look beneath the mountain.",
				text: app.hub
					? "AI Hub owns this round. World-changing tools are disabled; diagnostics remain available."
					: "Changes affect this visit and mark the expedition assisted. Your ordinary save is kept separately.",
				actions: [
					["Inspect simulation & network", () => this.inspect()],
					...(!app.hub && (!app.net || app.net.authority)
						? [
								[
									"Restore health & reserves",
									() => {
										this.mutate("health");
										this.shell.toast(
											"Rangers restored",
											"This expedition is marked assisted.",
										);
									},
								],
								["Cheats & overlays", () => this.devToggles()],
								["Warp to a lantern", () => this.devWarp()],
								["Spawn a creature", () => this.devSpawn()],
								["Choose a seed", () => this.devSeed()],
								...[...new Set(DTConfig.sliders.map((s) => s.group))].map(
									(group) => [
										"Tune " + group.toLowerCase(),
										() => this.devSliders(group),
									],
								),
								[
									"Single fixed step",
									() => {
										const scale = app.sim.tunables.timeScale;
										app.sim.tunables.timeScale = 1;
										app.sim.step(1 / 120);
										app.sim.tunables.timeScale = scale;
										app.renderer.update(0, app.sim.state, {});
										this.inspect();
									},
								],
								[
									"Restart this encounter",
									() => {
										app.sim.restart();
										this.shell.hide();
									},
								],
								[
									"Reset every tunable",
									() => {
										app.sim.resetTunables();
										this.game.timeScale = 1;
										for (const s of DTConfig.sliders)
											this.game.settings.set(
												"dev_" + s.key,
												DTConfig.defaults[s.key],
											);
										this.shell.toast("Defaults restored");
									},
								],
							]
						: []),
					["Back", () => this.shell.back()],
				],
			});
		}
		mutate(action, value) {
			if (this.app.hub || (this.app.net && !this.app.net.authority)) return;
			this.app.sim.dev(action, value);
			this.app.sim.state.assisted = true;
		}
		devToggles() {
			for (const key of ["infiniteHealth", "infiniteAmmo", "noclip", "reveal"])
				this.game.settings["dev_" + key] = this.app.sim.cheats[key];
			for (const key of ["collision", "navigation", "hearing", "los"])
				this.game.settings["dev_" + key] = this.app.overlays[key];
			this.open("dev-cheats", {
				kicker: "Assisted expedition",
				title: "Cheats & diagnostic overlays",
				rows: [
					"dev_infiniteHealth",
					"dev_infiniteAmmo",
					"dev_noclip",
					"dev_reveal",
					"dev_collision",
					"dev_navigation",
					"dev_hearing",
					"dev_los",
				],
				actions: [["Back", () => this.shell.back()]],
			});
		}
		applyDevSetting(key, value) {
			if (!this.app.sim || this.app.hub) return;
			if (DTConfig.defaults[key] !== undefined) {
				this.app.sim.setTunable(key, value);
			} else if (["collision", "navigation", "hearing", "los"].includes(key))
				this.app.overlays[key] = value;
			else this.mutate(key, value);
			this.app.sim.state.assisted = true;
		}
		devSliders(group) {
			for (const spec of DTConfig.sliders.filter((s) => s.group === group))
				this.game.settings["dev_" + spec.key] = this.app.sim.tunables[spec.key];
			this.open("dev-tune", {
				kicker: "Live balance · " + group,
				title: group + " tuning",
				text: "Existing actors use the new values immediately.",
				rows: DTConfig.sliders
					.filter((s) => s.group === group)
					.map((s) => "dev_" + s.key),
				actions: [
					[
						"Reset this page",
						() => {
							for (const s of DTConfig.sliders.filter((s) => s.group === group))
								this.game.settings.set(
									"dev_" + s.key,
									DTConfig.defaults[s.key],
								);
							this.devSliders(group);
						},
					],
					["Back", () => this.shell.back()],
				],
			});
		}
		devWarp() {
			this.open("dev-warp", {
				kicker: "Assisted expedition",
				title: "Choose a lantern",
				actions: Object.values(DTContent.caves)
					.map((c) => [
						c.name,
						() => {
							this.mutate("warp", c.id);
							this.shell.hide();
							this.lastPhase = "";
						},
					])
					.concat([["Back", () => this.shell.back()]]),
			});
		}
		devSpawn() {
			this.open("dev-spawn", {
				kicker: "Assisted expedition",
				title: "Choose a visitor",
				actions: Object.keys(DTContent.creatures)
					.filter((k) => k !== "target")
					.map((kind) => [
						kind,
						() => {
							this.mutate("spawn", kind);
							this.shell.toast(
								"A " + kind + " appears",
								"At the nearest safe floor.",
							);
						},
					])
					.concat([["Back", () => this.shell.back()]]),
			});
		}
		devSeed() {
			this.open("dev-seed", {
				title: "Choose the expedition seed",
				text: "Starts an isolated assisted expedition. Campaign geometry stays authored; small variations use this seed.",
				actions: [7, 42, 1729, 65537]
					.map((seed) => [
						String(seed),
						() => {
							this.app.start("dev", false, seed);
							this.app.sim.state.assisted = true;
						},
					])
					.concat([["Back", () => this.shell.back()]]),
			});
		}
		inspect() {
			const app = this.app,
				s = app.sim.state;
			this.open("diagnostics", {
				kicker: "Authority diagnostics",
				title: "The living expedition",
				sections: [
					[
						"State",
						"Tick " +
							s.tick +
							" · seed " +
							s.seed +
							" · phase " +
							s.phase +
							"\nCheckpoint " +
							(app.sim.checkpoint?.state?.cave ||
								app.sim.checkpoint?.cave ||
								"map") +
							" · reserves " +
							s.reserves +
							" · quiver " +
							s.quiver,
					],
					[
						"Actors",
						s.players
							.map(
								(p) =>
									"Ranger " +
									p.id +
									": " +
									p.hp +
									" hearts at " +
									Math.round(p.x) +
									"," +
									Math.round(p.y),
							)
							.concat(
								s.enemies
									.filter((e) => e.hp > 0)
									.map((e) => e.id + ": " + e.state + " / " + e.hp),
							)
							.join("\n"),
					],
					[
						"Arrows & recent noises",
						"Projectile IDs: " +
							s.arrows.map((a) => a.id).join(", ") +
							"\n" +
							s.noise
								.slice(-6)
								.map(
									(n) =>
										n.kind + " at " + Math.round(n.x) + "," + Math.round(n.y),
								)
								.join("\n"),
					],
					[
						"Transport",
						JSON.stringify(
							app.net?.inspect() || {
								role: "in-process authority",
								players: s.players.map((p) => p.id),
							},
							null,
							2,
						),
					],
				],
				actions: [
					["Refresh", () => this.inspect()],
					["Back", () => this.shell.back()],
				],
			});
		}
		async pair(role) {
			if (this.app.hub) return;
			this.app.pairing = true;
			this.pairStatus = "";
			this.pairOut = "";
			this.pairIn = "";
			this.app.peer?.cancel();
			this.app.peer = DTNet.createPeer(this.app.networkHooks());
			this.pairRole = role;
			this.renderPair();
			if (role === "host") {
				try {
					this.pairOut = await this.app.peer.offer();
					this.renderPair();
				} catch (e) {
					this.pairStatus = e.message;
					this.renderPair();
				}
			}
		}
		renderPair() {
			if (!this.app.pairing) return;
			const host = this.pairRole === "host";
			this.open("pair", {
				kicker: "Direct co-op · " + (host ? "host" : "guest"),
				title: host ? "Invite another ranger." : "Answer the invitation.",
				text: this.pairStatus || this.app.peer?.status,
				sections: [
					[
						"One-time pairing",
						host
							? "1. Copy your invitation to your partner.\n2. Paste their reply.\n3. Connect."
							: "1. Paste the host’s invitation.\n2. Make a reply and copy it to the host.\n3. Wait for the host to connect.",
					],
				],
				actions: [
					{
						label: host ? "Copy invitation" : "Copy reply",
						disabled: !this.pairOut,
						primary: true,
						fn: () => this.copyPair(),
					},
					[host ? "Paste reply" : "Paste invitation", () => this.pastePair()],
					{
						label: host ? "Connect" : "Make reply",
						disabled: !this.pairIn,
						fn: () => this.connectPair(),
					},
					["Text exchange", () => this.pairFallback()],
					[
						"Cancel",
						() => {
							this.app.peer?.cancel();
							this.app.peer = null;
							this.app.pairing = false;
							this.app.toTitle();
						},
					],
				],
				footer:
					"Invitations expire after 10 minutes. Same game file required. No account or room server.",
			});
		}
		async copyPair() {
			try {
				await navigator.clipboard.writeText(this.pairOut);
				this.pairStatus = "Copied. Send the entire text to your partner.";
			} catch {
				this.pairStatus =
					"Clipboard is unavailable here. Use Text exchange to copy manually.";
				this.pairFallback();
				return;
			}
			this.renderPair();
		}
		async pastePair() {
			try {
				this.pairIn = await navigator.clipboard.readText();
				this.pairStatus = "Pairing text received.";
			} catch {
				this.pairStatus =
					"Clipboard access was refused. Paste into Text exchange.";
				this.pairFallback();
				return;
			}
			this.renderPair();
		}
		pairFallback() {
			this.open("pair-text", {
				kicker: "Direct co-op · text exchange",
				title: "Exchange the whole message.",
				text: "Copy your outgoing message, or paste the incoming message below. Keyboard shortcuts work inside these fields.",
				actions: [
					[
						"Use incoming text",
						() => {
							this.pairIn =
								this.shell.root.querySelector("#pair-input")?.value ||
								this.pairIn;
							this.shell.back();
							this.renderPair();
						},
					],
					[
						"Back",
						() => {
							this.shell.back();
							this.renderPair();
						},
					],
				],
			});
			const box = this.shell.root?.querySelector(".esh-mod");
			if (!box) return;
			for (const [id, label, value, readOnly] of [
				["pair-output", "Your outgoing message", this.pairOut, true],
				["pair-input", "Their incoming message", this.pairIn, false],
			]) {
				const wrap = document.createElement("label");
				wrap.className = "dt-pair-text";
				wrap.textContent = label;
				const field = document.createElement("textarea");
				field.id = id;
				field.value = value;
				field.readOnly = readOnly;
				field.spellcheck = false;
				field.rows = 3;
				field.setAttribute("aria-label", label);
				field.onkeydown = (e) => e.stopPropagation();
				wrap.append(field);
				box.insertBefore(wrap, box.querySelector(".esh-btns"));
			}
		}
		async connectPair() {
			try {
				if (this.pairRole === "host") await this.app.peer.accept(this.pairIn);
				else this.pairOut = await this.app.peer.answer(this.pairIn);
				this.pairStatus = this.app.peer.status;
			} catch (e) {
				this.pairStatus = e.message;
			}
			this.renderPair();
		}
		update() {
			const app = this.app,
				s = app.sim.state,
				screen = this.shell.screen;
			this.syncScreen();
			if (screen !== this.lastScreen) {
				app.inputs?.clear();
				this.lastScreen = screen;
			}
			if (app.frontend || app.attract) return;
			if (s.phase === "victory" || s.phase === "defeat") {
				if (this.lastPhase !== s.phase) this.result();
				this.lastPhase = s.phase;
				return;
			}
			if (
				s.phase === "map" &&
				!s.transition &&
				(this.lastRoute !== s.node || (!screen && !this.game.paused))
			)
				this.route();
			if (s.phase === "cave" && this.lastPhase !== "cave") {
				this.shell.hide();
				this.game.resume();
				this.shell.toast(
					app.sim.getCave()?.name || "Below the mountain",
					app.sim.getCave()?.entrance || "",
				);
			}
			this.lastPhase = s.phase;
			const p = s.players.find((p) => p.id === app.localId) || s.players[0],
				context = p ? app.sim.context(p.id) : null;
			const notice = typeof s.notice === "string" ? s.notice : s.notice?.text;
			if (notice && notice !== this.lastNotice) {
				this.shell.toast("Trail notes", notice, 6);
				this.lastNotice = notice;
			}
			const touch = this.game.input.lastDevice === "touch";
			const captions = this.game.settings.captions
				? (s.cues || []).slice(-1)[0]
				: null;
			this.shell.hud({
				objective: {
					step:
						s.phase === "cave"
							? app.sim.getCave()?.subtitle || "Below the mountain"
							: "The wilderness",
					title: s.objective || "Find the road to Crownweather",
					text: [
						s.tools.axe ? "AXE" : "",
						s.tools.boat ? "FERRY" : "",
						s.tools.key ? "KEY" : "",
						s.relics.length ? "CROWN " + s.relics.length + "/2" : "",
					]
						.filter(Boolean)
						.join(" · "),
				},
				status: {
					text: app.online
						? s.players.length > 1
							? "TWO RANGERS · SHARED QUIVER"
							: "ONE RANGER · SHARED QUIVER"
						: app.mode === "couch"
							? "COUCH EXPEDITION"
							: "THE WAYFARER",
					color: "#e9bc75",
				},
				bars: s.players.map((p, index) => ({
					label: "Ranger " + (index + 1) + (p.down ? " · FALLEN" : ""),
					value: p.hp,
					max: 3,
					kind: "pips",
					color: index === 0 ? "#eeaa79" : "#a8d4d0",
				})),
				counts: [
					["ARROWS", s.quiver + "/" + (app.sim.tunables?.quiverCapacity || 12)],
					["RESERVES", s.reserves],
				],
				place: app.sim.getCave()?.name || "The old road",
				prompt: context?.label
					? {
							act: "interact",
							label: context.label,
							hint: context.hint || "",
							progress:
								context?.type === "revive"
									? (s.players.find((q) => q.id === context.target)?.revive ||
											0) / 1.5
									: undefined,
						}
					: null,
				tip: captions
					? {
							title: captions.direction || "An echo",
							text: captions.text || String(captions),
						}
					: null,
				keys: touch
					? []
					: [
							[this.game.input.label("fire"), "Fire"],
							[this.game.input.label("focus"), "Listen"],
							[this.game.input.label("dash"), "Quickstep"],
							[this.game.input.label("map"), "Map"],
						],
				buttons:
					touch && context?.label
						? [[context.label, () => this.game.input.tap("interact")]]
						: [],
			});
			if (touch && context?.type === "revive") {
				const button = this.shell.root?.querySelector(".esh-hb button");
				if (button) {
					button.onclick = () => {};
					button.onpointerdown = (e) => {
						e.preventDefault();
						button.setPointerCapture(e.pointerId);
						this.game.input.hold("interact");
					};
					button.onpointerup = button.onpointercancel = () =>
						this.game.input.hold("interact", false);
				}
			}
		}
	}
	globalThis.DTUI = ExpeditionUI;
})();
