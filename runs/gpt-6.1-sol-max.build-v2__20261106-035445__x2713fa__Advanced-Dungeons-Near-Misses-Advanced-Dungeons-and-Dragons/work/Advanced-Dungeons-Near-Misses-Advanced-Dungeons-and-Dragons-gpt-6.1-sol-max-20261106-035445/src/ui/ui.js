(() => {
	const N = globalThis.NM,
		E = globalThis.My3D2dge;
	const CUE = {
		rat: "scratching",
		snake: "a rising hiss",
		bat: "wingbeats and falling dust",
		spider: "silken clicks",
		ooze: "a wet scrape",
		drake: "a deep snore",
		guardian1: "three hollow brass notes",
		guardian2: "a falling glass chord",
	};
	class UI {
		constructor(app) {
			this.app = app;
			this.game = app.game;
			this.lastMode = null;
			this.noticeId = "";
			this.pairText = "";
			this.pairReply = "";
			this.devReady = false;
			const g = this.game;
			this.shell = new E.Shell(g, {
				tv: true,
				theme: {
					ink: "#f0e6cf",
					paper: "rgba(13,28,31,.94)",
					accent: "#e1c08b",
					muted: "#b4bdb0",
					line: "#7c87624d",
					font: "Trebuchet MS, sans-serif",
					titleFont: "Georgia, serif",
				},
				screens: {
					pause: {
						kicker: "FIELD JOURNAL",
						title: "A moment by the lantern",
						text: () =>
							app.net.connected
								? "Live expedition · your companion is still moving."
								: "The expedition is paused.",
						actions: () => this.pauseActions(),
					},
					help: {
						kicker: "RANGER’S FIELD NOTES",
						title: "Listen. Place the shot. Find the way.",
						sections: [
							[
								"The expedition",
								"Find the axe, boat and key to reach the summit. Two guardians keep the Crown of Clear Skies. Claim both halves and bring daylight home.",
							],
							[
								"The bow",
								"One press looses one arrow. Misses glow where they land: walk over them to recover. Pale bank stones turn a shaft around a corner. After a bank, your own arrow can wound you.",
							],
							[
								"The dark",
								"Hold focus to move quietly and hear farther. Directional captions follow passages, never point straight through a wall. Arrows light a little ground briefly. Only your own path stays remembered.",
							],
							[
								"The creatures",
								"The ooze sheds arrows: lure it with a loud shot and take the other passage. Read a lunge or breath lane, step clear, then shoot during recovery.",
							],
							[
								"A companion",
								"Two rangers share arrows, tools and reserves. Hold interact beside a fallen companion to revive them. Stay within sight of one another.",
							],
							[
								"Touch",
								"Drag the left half to move. Tap the right half to fire; drag there to aim, hold to listen. Double-tap the left half to quickstep. Pickups are automatic; the ladder action appears nearby.",
							],
						],
					},
				},
			});
			if (this.shell.root)
				this.shell.root.addEventListener("pointerover", (event) => {
					if (event.pointerType === "mouse") {
						const button = event.target.closest("button");
						if (button && !button.disabled)
							button.focus({ preventScroll: true });
					}
				});
			g.o.menu.quit = false;
			for (const [_group, key, label, min, max, step] of N.TUNABLES) {
				g.settings.define({
					key: `tune_${key}`,
					group: "Controls",
					label,
					type: "slider",
					min,
					max,
					step,
					value: N.DEFAULTS[key],
				});
			}
			g.settings.define({
				key: "dev_seed",
				group: "Controls",
				label: "Expedition seed",
				type: "slider",
				min: 1,
				max: 10000,
				step: 1,
				value: 182,
			});
			const prior = g.settings.onChange;
			g.settings.onChange = (key, value) => {
				if (prior) prior(key, value);
				if (key.startsWith("tune_") && this.devReady && !app.net.isHub)
					app.sim.tune(key.slice(5), g.settings[key]);
			};
		}
		show(name, spec = {}) {
			this.shell.show(name, spec);
			if (this.shell.root) this.shell.root.dataset.screen = name;
			return this.shell;
		}
		title() {
			const app = this.app;
			app.playing = false;
			this.lastMode = null;
			this.shell.hide();
			app.controls?.clear();
			this.show("title", {
				kicker: "AN EXPEDITION IN FIVE CHAPTERS",
				name: N.TITLE,
				subtitle: "A little nerve. Three good arrows.",
				text: "Two dragons keep the daylight.\nThe mountain leaves room for a near miss.",
				actions: [
					{
						label: "New expedition",
						fn: () => this.newExpedition(),
						primary: true,
					},
					{
						label: "Continue expedition",
						disabled: !app.save.read(),
						fn: () => app.start({ resume: true }),
					},
					["Two rangers", () => this.coop()],
					["Settings", () => this.show("settings")],
					["How to play", () => this.show("help")],
					["About & credits", () => this.about()],
				],
				meta: ["1–2 RANGERS", "BOW & ECHO", "1982 → 2026"],
				footer: "THE CROWN OF CLEAR SKIES · HUSHVALE",
			});
		}
		newExpedition(local = false) {
			if (this.app.save.read())
				this.show("replace", {
					kicker: "A NEW TRAIL",
					title: "Begin a new expedition?",
					text: "This replaces the saved expedition. Settings remain yours.",
					actions: [
						["Keep the saved trail", () => this.shell.back()],
						["Begin anew", () => this.app.start({ local })],
					],
				});
			else this.app.start({ local });
		}
		coop() {
			this.show("coop", {
				kicker: "SHARED QUIVER · SHARED FORTUNE",
				title: "Two rangers. One trail.",
				text: "Choose a companion on this screen or pair two copies of the game.",
				actions: [
					["Couch · keyboard + controller", () => this.newExpedition(true)],
					[
						"Couch · two controllers",
						() => this.app.start({ local: true, twoPads: true }),
					],
					["Online · host expedition", () => this.pair("host")],
					["Online · join expedition", () => this.pair("join")],
					["Back", () => this.shell.back()],
				],
				footer:
					"Direct WebRTC pairing · exchange an invitation and a reply. Some networks require a relay; this build uses public STUN.",
			});
		}
		pauseActions() {
			const app = this.app,
				hub = app.net.isHub;
			return [
				...(!hub
					? [
							[
								"Restart cave / section",
								() => {
									if (app.net.connected && !app.net.authority) {
										this.shell.toast(
											"Host action",
											"Only the host can restore the shared section.",
										);
										return;
									}
									app.sim.restart();
									app.controls.clear();
									this.shell.hide();
								},
							],
						]
					: []),
				...(!app.net.connected && !hub
					? [
							app.sim.state.players.length > 1
								? [
										"Companion leaves the trail",
										() => {
											app.sim.removePlayer(2);
											this.game.removePlayer(2);
											app.mode = "solo";
											this.shell.toast(
												"One ranger continues",
												"The party keeps its tools and shared arrows.",
											);
											this.shell.hide();
										},
									]
								: [
										"Add local companion",
										() => {
											this.game.addPlayer({
												pad: this.game.input.lastDevice === "gamepad" ? 1 : 0,
											});
											app.sim.addPlayer(2);
											app.mode = "local";
											this.shell.toast(
												"Companion joins",
												"A free controller owns ranger2. The quiver is shared.",
											);
											this.shell.hide();
										},
									],
						]
					: []),
				...(!app.net.connected && !hub && app.sim.state.players.length === 1
					? [["Invite online companion", () => this.pair("host")]]
					: []),
				["Field map", () => this.fieldMap()],
				["Developer tools", () => this.developer()],
				["About & credits", () => this.about()],
				...(!hub
					? [["Return to trailhead menu", () => this.returnTitle()]]
					: []),
			];
		}
		returnTitle() {
			this.show("leave", {
				kicker: "LEAVE THE EXPEDITION",
				title: "Return to the menu?",
				text: "Your last checkpoint is safe. The current section resumes from its latest saved state.",
				actions: [
					["Stay on the trail", () => this.shell.back()],
					[
						"Return to menu",
						() => {
							this.app.saveNow();
							this.app.net.close();
							this.app.sound?.stop();
							this.app.playing = false;
							this.game.resume();
							this.title();
						},
					],
				],
			});
		}
		trail() {
			const app = this.app,
				s = app.sim.state,
				node =
					N.Content.landmarks.find((n) => n.id === s.mapNode) ||
					N.Content.landmarks[0];
			const routes = N.Content.routes.filter(
					(r) => r.from === node.id || r.to === node.id,
				),
				neighbors = routes.map((r) => ({
					route: r,
					node: N.Content.landmarks.find(
						(n) => n.id === (r.from === node.id ? r.to : r.from),
					),
				}));
			const actions = neighbors.map(({ route, node: n }) => {
				const require = n.requires || route.requires,
					blocked =
						require &&
						!s.party.tools.includes(require) &&
						!s.party.halves.includes(require),
					cleared =
						n.cave !== undefined &&
						s.party.cleared.includes(N.Content.caves[n.cave].id);
				return {
					label: `${blocked ? "⊘ " : ""}${n.name}${blocked ? ` · needs ${require}` : cleared ? " · clear" : ""}`,
					disabled: !!blocked,
					fn: () => app.travel(n.id),
				};
			});
			this.shell.hide();
			this.show("trail", {
				kicker: `THE HIGH COUNTRY · ${s.party.cleared.length}/5 CHAPTERS`,
				title: node.name,
				text:
					node.toolAction && s.party.tools.includes(node.requires)
						? node.toolAction
						: node.clue,
				actions: [
					...actions,
					["Field notes", () => this.show("help")],
					[
						"Pause / options",
						() => {
							this.shell.hide();
							this.game.pause();
						},
					],
				],
				footer: `QUIVER ${s.party.ammo}/${s.party.capacity} · RESERVES ${s.party.reserves} · ${s.party.tools.map((t) => t.toUpperCase()).join(" / ") || "THREE ARROWS AND A PROMISE"}`,
			});
			this.app.renderer.mapFocus = neighbors.find(
				(v) => !(v.node.requires && !s.party.tools.includes(v.node.requires)),
			)?.node.id;
			if (this.shell.root) {
				const buttons = this.shell.root.querySelectorAll(".esh-btns button");
				buttons.forEach((b, i) => {
					const n = neighbors[i]?.node;
					if (n)
						b.addEventListener(
							"mouseenter",
							() => (this.app.renderer.mapFocus = n.id),
						);
				});
			}
		}
		fieldMap() {
			const app = this.app;
			if (app.sim.state.mode === "map") {
				this.trail();
				return;
			}
			app.renderer.ensure(app.sim);
			const s = app.sim.state,
				level = app.sim.level;
			this.show("map", {
				kicker: "EXPEDITION JOURNAL",
				title: level.data.name,
				text: "Only walked passages remain on the chart. An arrow’s passing light leaves no ink.",
				map: app.renderer.map,
				fog: app.renderer.fog,
				at: s.players[0],
				markers: [
					{
						x: level.data.exit[0] * N.TILE,
						y: level.data.exit[1] * N.TILE,
						kind: "ring",
						color: "#e1c08b",
					},
				].filter((a) =>
					s.explored.includes(
						Math.floor(a.y / N.TILE) * level.w + Math.floor(a.x / N.TILE),
					),
				),
				actions: [
					[
						"Return to the cave",
						() => {
							this.shell.hide();
							this.game.resume();
						},
					],
				],
			});
			if (!app.net.connected) this.game.paused = true;
		}
		results() {
			const app = this.app,
				s = app.sim.state,
				win = s.mode === "victory";
			this.shell.hide();
			this.show("results", {
				kicker: win ? "THE DAYLIGHT RETURNS" : "THE MOUNTAIN KEEPS ITS SECRET",
				title: win ? "The sky remembers." : "The last lantern fades.",
				emblem: win ? "☀" : "◇",
				text: win
					? "Dawn and dusk meet in the Crown of Clear Skies. Below the summit, Hushvale wakes to a morning it had almost forgotten."
					: `Three reserves have walked the dark. There is no shame in learning its ways.${s.stats.assisted ? " This was an assisted expedition." : ""}`,
				stats: [
					[
						`${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, "0")}`,
						"EXPEDITION",
					],
					[s.stats.shots, "ARROWS LOOSED"],
					[s.stats.recovered, "SHAFTS RECLAIMED"],
					[s.party.treasure, "TRAIL TREASURES"],
				],
				medals: [
					["Both lights reunited", s.party.halves.length === 2],
					["No reserve spent", s.stats.deaths === 0],
					["Unassisted expedition", !s.stats.assisted],
				],
				actions: app.net.isHub
					? [["Expedition notes", () => this.about()]]
					: [
							...(!win
								? [
										[
											"Continue checkpoint · assisted",
											() => {
												s.party.reserves = 3;
												app.sim.restart({ assisted: true });
												this.shell.hide();
												app.playing = true;
											},
										],
									]
								: []),
							["New expedition", () => this.newExpedition()],
							["Return to menu", () => this.title()],
							["Expedition notes", () => this.about()],
						],
				footer: s.stats.assisted
					? "ASSISTED · developer changes or learning continuation recorded"
					: "STANDARD EXPEDITION",
			});
		}
		developer() {
			const app = this.app,
				sim = app.sim,
				hub = app.net.isHub,
				guest = app.net.connected && !app.net.authority,
				readOnly = hub || guest;
			this.devReady = false;
			for (const a of N.TUNABLES)
				this.game.settings.set(`tune_${a[1]}`, sim.config[a[1]]);
			this.devReady = true;
			this.show("dev", {
				kicker: readOnly
					? "READ-ONLY SESSION DIAGNOSTICS"
					: "DEVELOPER TOOLS · MARKS THIS RUN ASSISTED",
				title: "The ranger’s workbench",
				text: readOnly
					? "Managed rounds and guests cannot change the shared expedition. Diagnostics remain available."
					: "Changes apply to the current actors. Experiments stay out of saved campaigns.",
				actions: [
					...(!readOnly
						? [
								[
									"Restore health & reserves",
									() => {
										sim.assist();
										sim.state.party.reserves = 3;
										sim.state.players.forEach((p) => {
											p.hp = 3;
											p.downed = false;
										});
										this.developer();
									},
								],
								...[
									["infiniteHealth", "Infinite health"],
									["infiniteAmmo", "Infinite arrows"],
									["noclip", "Walk through stone"],
									["reveal", "Reveal fog"],
									["collision", "Collision overlay"],
									["navigation", "Navigation overlay"],
									["hearing", "Hearing overlay"],
									["los", "Sight overlay"],
								].map(([key, label]) => [
									`${sim.dev[key] ? "✓ " : "○ "}${label}`,
									() => {
										sim.assist();
										sim.dev[key] = !sim.dev[key];
										this.developer();
									},
								]),
								["Warp to chapter / guardian", () => this.warps()],
								["Spawn creature", () => this.spawns()],
								["Balance sliders", () => this.tuning()],
								["Clock / seed / single step", () => this.clockTools()],
							]
						: []),
					["Inspect authority & actors", () => this.inspect()],
					["Back to pause", () => this.shell.back()],
				],
			});
		}
		warps() {
			this.show("warps", {
				kicker: "IRREVERSIBLE EXPERIMENT",
				title: "Choose a chapter",
				actions: [
					...N.Content.caves.map((c, i) => [
						c.name,
						() => {
							this.app.sim.assist();
							this.app.sim.loadCave(i);
							this.shell.hide();
							this.game.resume();
						},
					]),
					[
						"Restart current encounter",
						() => {
							this.app.sim.restart();
							this.shell.hide();
						},
					],
					["Back", () => this.shell.back()],
				],
			});
		}
		spawns() {
			this.show("spawn", {
				title: "A creature at a safe anchor",
				actions: [
					...Object.keys(N.EnemyDefaults)
						.filter((t) => t !== "target")
						.map((t) => [
							t,
							() => {
								this.app.sim.spawn(t);
								this.shell.toast("Creature placed", t);
								this.shell.back();
							},
						]),
					["Back", () => this.shell.back()],
				],
			});
		}
		tuning(group) {
			const groups = [...new Set(N.TUNABLES.map((t) => t[0]))];
			if (!group) {
				this.show("tuning", {
					title: "Live expedition balance",
					actions: [
						...groups.map((g) => [g, () => this.tuning(g)]),
						[
							"Reset all to defaults",
							() => {
								this.app.sim.resetTuning();
								this.devReady = false;
								for (const t of N.TUNABLES)
									this.game.settings.set(`tune_${t[1]}`, N.DEFAULTS[t[1]]);
								this.devReady = true;
								this.shell.toast("Defaults restored");
							},
						],
						["Back", () => this.shell.back()],
					],
				});
				return;
			}
			this.show("sliders", {
				kicker: "LIVE BALANCE",
				title: group,
				rows: N.TUNABLES.filter((t) => t[0] === group).map(
					(t) => `tune_${t[1]}`,
				),
				actions: [["Back", () => this.shell.back()]],
			});
		}
		clockTools() {
			this.show("clock", {
				title: "Simulation clock & seed",
				text: `Seed ${this.app.sim.state.seed} · tick ${this.app.sim.state.tick}`,
				rows: ["tune_timeScale", "dev_seed"],
				actions: [
					[
						"Advance one fixed step",
						() => {
							this.app.sim.assist();
							this.app.sim.step(1 / 120);
							this.clockTools();
						},
					],
					[
						"Next seed + restart section",
						() => {
							const s = this.app.sim.state;
							this.app.sim.assist();
							s.seed = (s.seed + 1) >>> 0;
							s.rng = s.seed;
							this.app.sim.loadCave(s.caveIndex);
							this.clockTools();
						},
					],
					[
						"Apply chosen seed + restart section",
						() => {
							const sim = this.app.sim;
							sim.assist();
							sim.state.seed = this.game.settings.dev_seed >>> 0;
							sim.state.rng = sim.state.seed;
							sim.loadCave(sim.state.caveIndex);
							this.clockTools();
						},
					],
					["Back", () => this.shell.back()],
				],
			});
		}
		inspect() {
			const app = this.app,
				s = app.sim.state,
				d = app.net.diagnostics;
			this.show("inspect", {
				kicker: "LIVE DIAGNOSTICS",
				title: "The expedition, inside",
				sections: [
					[
						"Authority",
						`${app.net.role || "in-process"} · seat ${app.net.localSeat ?? "none"} · tick ${s.tick} · epoch ${s.epoch} · input sequence ${Math.max(0, ...Object.values(app.sim.inputs).map((input) => input.seq || 0))}\n${app.net.statusText || "Offline authority"}\nPackets ${d?.sent || 0} sent / ${d?.received || 0} received · max ${d?.maxPerSecond || 0}/s · ${d?.maxBytes || 0} bytes`,
					],
					[
						"Checkpoint",
						`${s.checkpointId}\nQuiver ${s.party.ammo} · reserves ${s.party.reserves}`,
					],
					[
						"Actors",
						s.players
							.concat(s.enemies)
							.map((a) => `${a.id} · ${a.state} · ${a.hp} health`)
							.join("\n"),
					],
					[
						"Arrow identities",
						s.arrows.map((a) => `${a.id} · ${a.bounces} banks`).join("\n") ||
							"No arrows in flight",
					],
					[
						"Recent noises",
						s.noise
							.slice(-6)
							.map(
								(n) =>
									`${n.kind} · ${n.loudness.toFixed(1)} · ${n.time.toFixed(1)}s`,
							)
							.join("\n") || "Quiet",
					],
				],
				actions: [
					["Refresh", () => this.inspect()],
					["Back", () => this.shell.back()],
				],
			});
		}
		about(page = "sourceInformation") {
			const data = N.Interview || {},
				titles = {
					sourceInformation: "Source Information",
					testingFeedback: "Testing Feedback",
					engineFeedback: "Engine Feedback",
					promptFeedback: "Prompt Feedback",
				};
			const questions = {
				testingFeedback: [
					"Issues caught",
					"Critical / game breaking",
					"Most helpful test",
					"Least helpful test",
				],
				engineFeedback: [
					"What worked best",
					"Stuck or guessed wrong",
					"Most important custom system",
					"Hardest engine integration",
					"Engine changes",
					"One engine improvement",
				],
				promptFeedback: [
					"What helped",
					"What was confusing",
					"Hardest request",
					"Suggested prompt change",
				],
			};
			const value = data[page],
				sections =
					page === "sourceInformation"
						? Object.entries(
								value || {
									Source: "Advanced Dungeons & Dragons (1982)",
									Plan: "PLAN.md",
									Engine: "my-3D2dge 0.89.1",
									Usage: "added on import",
								},
							).map(([k, v]) => [k, v])
						: (value || ["unknown"]).map((v, i) => [questions[page][i], v]);
			this.show("about", {
				kicker: "ADVANCED DUNGEONS & NEAR MISSES",
				title: titles[page],
				sections,
				actions: [
					...Object.keys(titles)
						.filter((k) => k !== page)
						.map((k) => [titles[k], () => this.about(k)]),
					[
						"Credits",
						() =>
							this.show("credits", {
								title: "The makers & the mountain",
								sections: [
									[
										"Original inspiration",
										"Advanced Dungeons & Dragons · Intellivision · 1982\nOriginal programming: Tom Loughry / APh. Source research: Blue Sky Rangers historical archive.",
									],
									[
										"This expedition",
										"Original world, creatures, prose, native art, animation, score, bow systems and campaign: OpenAI gpt-6.1-sol, reasoning effort max.",
									],
									[
										"Engine & session client",
										"my-3D2dge v0.89.1 · Michael Crosato\nAI Hub Session Protocol v1, client1.4.0 · Michael Crosato\nVendored notices preserved in source.",
									],
									[
										"Source links",
										"history.blueskyrangers.com/instructions/addinst.html\ngithub.com/michaelcrosato/my-3d2dge\ngithub.com/michaelcrosato/ai-hub",
									],
									["Usage", "added on import"],
								],
								actions: [["Back", () => this.shell.back()]],
							}),
					],
					["Back", () => this.shell.back()],
				],
			});
		}
		async pair(role) {
			const app = this.app;
			this.pairFromGame = app.playing;
			this.pairText = "";
			this.pairReply = "";
			this.pairRole = role;
			app.pairing = true;
			this.show("pair", {
				kicker: "DIRECT WEBRTC · TWO COPIES OF THE GAME",
				title:
					role === "host" ? "Invite a second ranger" : "Answer an invitation",
				text:
					role === "host"
						? "Create an invitation, send it to your companion, then paste their reply. No account or signaling server."
						: "Paste your companion’s complete invitation. Create a reply and send it back.",
				actions:
					role === "host"
						? [
								["Create invitation", () => this.makeOffer()],
								["Cancel", () => this.cancelPair()],
							]
						: [
								["Paste invitation", () => this.paste("invitation")],
								["Open text fallback", () => this.textFallback("invitation")],
								["Cancel", () => this.cancelPair()],
							],
				footer:
					"Pairing text expires in 30 minutes. Some networks need TURN; no private relay credentials are included.",
			});
		}
		async makeOffer() {
			this.show("pair", {
				title: "Finding a path between rangers…",
				text: "Gathering ICE candidates. This can take a few moments; the invitation includes the complete result.",
				actions: [["Cancel", () => this.cancelPair()]],
			});
			try {
				this.pairText = await this.app.net.host();
				if (this.app.pairing) this.pairHostReady();
			} catch (error) {
				this.shell.toast("Connection could not begin", error.message);
				this.pair("host");
			}
		}
		pairHostReady() {
			this.show("pair", {
				title: "Send invitation. Receive reply.",
				text:
					this.app.net.statusText ||
					"Copy this invitation to your companion. After they send a reply, paste it here.",
				actions: [
					["Copy invitation", () => this.copy(this.pairText)],
					["Paste reply & connect", () => this.paste("reply")],
					["Open text fallback", () => this.textFallback("reply")],
					["Cancel", () => this.cancelPair()],
				],
			});
		}
		async paste(kind) {
			try {
				if (!navigator.clipboard?.readText)
					throw Error("Clipboard unavailable");
				const value = await navigator.clipboard.readText();
				await this.acceptPairText(kind, value);
			} catch (error) {
				this.shell.toast("Paste the pairing text below", error.message);
				this.textFallback(kind);
			}
		}
		async acceptPairText(kind, value) {
			try {
				if (kind === "reply") {
					await this.app.net.accept(value);
					this.show("pair", {
						title: "Joining the trail…",
						text: this.app.net.statusText,
						actions: [["Cancel", () => this.cancelPair()]],
					});
				} else {
					this.pairReply = await this.app.net.join(value);
					this.show("pair", {
						title: "Send the reply to your host",
						text: "Your host pastes this reply. The shared trail opens after both versions agree.",
						actions: [
							["Copy reply", () => this.copy(this.pairReply)],
							["Open text fallback", () => this.textFallback("outgoing")],
							["Cancel", () => this.cancelPair()],
						],
					});
				}
			} catch (error) {
				this.shell.toast("Pairing text was rejected", error.message);
				this.textFallback(kind);
			}
		}
		async copy(value) {
			try {
				await navigator.clipboard.writeText(value);
				this.shell.toast("Copied", "Send the complete text to your companion.");
			} catch {
				this.textFallback("outgoing");
			}
		}
		textFallback(kind) {
			this.show("pairtext", {
				kicker: "MANUAL PAIRING FALLBACK",
				title: kind === "outgoing" ? "Copy the complete text" : `Paste ${kind}`,
				text: "Use your usual communication channel to exchange the complete invitation and reply.",
				actions: [
					...(kind === "outgoing"
						? []
						: [
								[
									"Use pasted text",
									() => {
										const value =
											this.shell.root.querySelector("textarea")?.value || "";
										this.acceptPairText(kind, value);
									},
								],
							]),
					["Back", () => this.shell.back()],
					["Cancel", () => this.cancelPair()],
				],
			});
			if (this.shell.root) {
				const area = document.createElement("textarea");
				area.className = "nm-pairtext";
				area.setAttribute("aria-label", "Pairing text");
				area.spellcheck = false;
				area.value = kind === "outgoing" ? this.pairReply || this.pairText : "";
				this.shell.root
					.querySelector(".esh-mod")
					?.insertBefore(
						area,
						this.shell.root.querySelector(".esh-mod .esh-btns"),
					);
				if (kind === "outgoing") {
					area.readOnly = true;
					area.select();
				}
			}
		}
		cancelPair() {
			this.app.net.close(true);
			this.app.pairing = false;
			this.shell.hide();
			if (this.pairFromGame) {
				this.game.resume();
				this.app.playing = true;
				this.app.sound.resume();
				this.app.ui.lastMode = null;
			} else this.title();
		}

		update() {
			const app = this.app,
				s = app.sim.state,
				g = this.game;
			if (this.shell.root)
				this.shell.root.dataset.screen = this.shell.screen || "play";
			if (!app.playing || app.attract) return;
			if (this.lastMode !== `${s.mode}-${s.mapNode}-${s.caveIndex}`) {
				this.lastMode = `${s.mode}-${s.mapNode}-${s.caveIndex}`;
				if (s.mode === "map") this.trail();
				else if (s.mode === "victory" || s.mode === "defeat") this.results();
				else {
					this.shell.hide();
					g.resume();
				}
			}
			if (this.shell.screen) return;
			const p =
				s.players.find((p) => p.seat === (app.net.localSeat || 1)) ||
				s.players[0];
			if (!p) return;
			const context = app.sim.interaction(p),
				clues = app.sim.soundClues(p);
			const touch =
				g.input.lastDevice === "touch" ||
				(typeof matchMedia !== "undefined" &&
					matchMedia("(pointer:coarse)").matches);
			const arrows = s.party.ammo,
				tools = s.party.tools.map((t) => t.toUpperCase()).join(" · "),
				halves = s.party.halves.length;
			const clue = clues
				.map(
					(c) =>
						`${c.dy < 0 ? "↑" : c.dy > 0 ? "↓" : c.dx < 0 ? "←" : "→"} ${CUE[c.kind.replace(/^(creature|alert)-/, "")] || "a creature"}${c.near ? " · near" : ""}`,
				)
				.join("\n");
			this.shell.hud({
				objective: {
					step: touch
						? null
						: `${String(Math.min(s.caveIndex + 1, 4)).padStart(2, "0")} / 04`,
					title: app.sim.level.data.name,
					text: touch ? null : s.objective,
				},
				place: p.focus ? "LISTENING · quiet steps" : "",
				bars: s.players.map((p) => ({
					label: touch ? "" : `RANGER ${p.seat}${p.downed ? " · FALLEN" : ""}`,
					value: p.hp,
					max: 3,
					kind: "pips",
					color: p.seat === 1 ? "#e2bc83" : "#9fcad0",
				})),
				counts: touch
					? [
							["↗", arrows],
							["◇", s.party.reserves],
						]
					: [
							["ARROWS", `${arrows} / ${s.party.capacity}`],
							["RESERVES", s.party.reserves],
							[tools || "TOOLS", ""],
							["CROWN", `${halves} / 2`],
						],
				prompt: context
					? {
							act: "interact",
							label: context.label,
							progress: context.progress,
						}
					: null,
				tip: clue ? { title: "THE DARK HAS A VOICE", text: clue } : null,
				keys: [
					[g.input.label("fire"), "Loose arrow"],
					[g.input.label("focus"), "Listen"],
					[g.input.label("dodge"), "Quickstep"],
					[g.input.label("fieldMap"), "Chart"],
				],
			});
			g.input.touchSet(
				"interact",
				context?.kind === "revive" ? "REVIVE" : "CLIMB",
				!!context && !context.disabled,
			);
			if (s.notice && s.noticeUntil > s.time) {
				if (this.noticeId !== s.notice) {
					this.noticeId = s.notice;
					this.shell.tutorial(
						"Trail wisdom",
						s.notice,
						Math.max(1, s.noticeUntil - s.time),
					);
				}
			} else if (this.noticeId) {
				this.noticeId = "";
				this.shell.tutorial(null);
			}
		}
	}
	N.UI = UI;
})();
