class Menus {
	constructor(app) {
		this.app = app;
		this.current = null;
		this.origin = "title";
		this.partyCount = 2;
		this.aboutTab = "Source Information";
		$("screen").addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (b && !b.disabled) {
				app.audio.unlock();
				app.audio.sfx("menu");
				this.action(b.dataset.action, b);
			}
		});
		$("screen").addEventListener("input", (e) => this.input(e.target));
		$("screen").addEventListener("change", (e) => this.input(e.target));
	}
	button(label, action, primary = false, extra = "") {
		return (
			'<button class="menu-button ' +
			(primary ? "primary" : "") +
			'" data-action="' +
			action +
			'" ' +
			extra +
			"><span>" +
			label +
			'</span><span class="arrow" aria-hidden="true">↗</span></button>'
		);
	}
	show(name, html, title = false) {
		this.current = name;
		const el = $("screen");
		el.hidden = false;
		el.className = title ? "title-screen" : "";
		el.innerHTML = html;
		requestAnimationFrame(() => {
			const first = el.querySelector(
				"button:not(:disabled),input,select,textarea",
			);
			first?.focus({ preventScroll: true });
		});
		this.prompts();
	}
	wrap(eyebrow, title, body, wide = false) {
		return (
			'<section class="panel ' +
			(wide ? "wide" : "") +
			'"><span class="eyebrow">' +
			eyebrow +
			"</span><h2>" +
			title +
			"</h2>" +
			body +
			'<p class="menu-hint" data-menu-hint></p></section>'
		);
	}
	close() {
		this.current = null;
		$("screen").hidden = true;
		$("contextPrompt").hidden = true;
		document.activeElement?.blur?.();
	}
	title() {
		const a = this.app;
		let buttons = this.button(
			"Begin expedition <small>1 scout</small>",
			"start",
			true,
		);
		if (a.saved)
			buttons += this.button(
				"Continue the trail <small>" +
					a.saved.found.filter(Boolean).length +
					" / 6 treasures</small>",
				"continue",
			);
		buttons +=
			this.button("Bring a friend <small>1–4 scouts</small>", "party") +
			this.button("Field guide", "guide");
		buttons +=
			'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem">' +
			this.button("Settings", "settings") +
			this.button("About", "about") +
			"</div>";
		this.show(
			"title",
			'<main class="title-layout"><div class="brand-overline">AN EXPEDITION IN QUESTIONABLE JUDGMENT</div><h1 class="game-title">PIT <em>&</em> RUN</h1><p class="title-tagline">Six treasures. One sunset.<br><span>Absolutely no sensible footwear.</span></p><div class="title-buttons">' +
				buttons +
				'</div><aside class="title-note"><span class="stamp">FIELD NOTE № 01</span><strong>Fortune favours<br>the slightly muddy.</strong><p>Mind the logs.<br>Trust the vines.<br>Never trust the smiles.</p></aside><div class="title-bottom"><span>THE JUNGLE IS CALLING. PROBABLY A BIRD.</span><span class="right">' +
				(a.best
					? "BEST HAUL " + a.best.toLocaleString()
					: "A JUNGLE JAUNT · EST. 1982(ISH)") +
				"</span></div></main>",
			true,
		);
	}
	pause() {
		if (!["playing", "paused"].includes(this.app.state)) return;
		if (!this.app.net.active) {
			this.app.state = "paused";
			this.app.save();
		}
		this.origin = "pause";
		const active = this.app.net.active;
		let body =
			'<p class="lead">' +
			(active
				? "A quick look at the journal. The expedition keeps moving."
				: "Take a breath. Check the hat. The jungle can wait.") +
			'</p><div class="menu-stack">' +
			this.button("Back to the trail", "resume", true) +
			this.button("Field guide", "guide") +
			this.button("Settings", "settings") +
			this.button("About this expedition", "about");
		if (this.app.net.mode !== "hub" && this.app.net.isHost)
			body += this.button("Developer camp", "dev");
		if (this.app.net.mode !== "hub")
			body += this.button("Return to camp", "quit");
		body += "</div>";
		this.show(
			"pause",
			this.wrap("FIELD JOURNAL", "A moment in the shade.", body),
		);
	}
	guide() {
		const g = this.app.controls.glyph.bind(this.app.controls);
		const cards = [
			[
				"01 / KEEP MOVING",
				'<span class="key" data-glyph="move">' +
					g("move") +
					'</span> to run. <span class="key" data-glyph="jump">' +
					g("jump") +
					"</span> to jump. Release early for a shorter hop. Leap over logs, snakes and scorpions.",
			],
			[
				"02 / TRUST THE VINE",
				'Jump toward a vine to catch it. Move to pump the swing. Press <span class="key" data-glyph="jump">' +
					g("jump") +
					'</span> again to leap off. You can also grab with <span class="key" data-glyph="action">' +
					g("action") +
					"</span>.",
			],
			[
				"03 / TAKE THE LOW ROAD",
				'At a ladder, move down or press <span class="key" data-glyph="action">' +
					g("action") +
					"</span> to descend. Move up to climb out. Two treasures are underground. The road is shorter. The scorpions are not friendlier.",
			],
			[
				"04 / MIND THE SMILES",
				"Crocodile backs are stepping stones while mouths are shut. Watch the rhythm. Tar opens and closes. Fire takes a breather, too. A vine is often the wiser choice.",
			],
			[
				"05 / SIX TREASURES, ONE SUNSET",
				"Collect all six glowing treasures, then head east to the stone gate. Small gold caches add to your haul. Reach the gate before daylight runs out.",
			],
			[
				"06 / KEEP YOUR HAT",
				"Flags are checkpoints and refill three hearts. A fall costs a heart and five seconds. In co-op, scouts return at camp after a short rest; treasure and checkpoints belong to everyone.",
			],
		];
		let body =
			'<p class="lead">A map would be useful. This will have to do.</p><div class="control-grid">' +
			cards
				.map(
					(c) =>
						'<article class="control-card"><b>' +
						c[0] +
						"</b><p>" +
						c[1] +
						"</p></article>",
				)
				.join("") +
			'</div><p class="tiny">TOUCH: drag anywhere on the left to move; tap on the right to jump. Edge jumps are assisted. A climb button appears at ladders.<br>COUCH: Scout 1 uses WASD / Space / E. Scout 2 uses arrows / right Shift / right Ctrl. Each gamepad controls the matching scout.</p>' +
			this.button("Got it. Hat on.", "back", true, 'style="margin-top:1rem"');
		this.show(
			"guide",
			this.wrap("A SMALL GUIDE TO BIG TROUBLE", "Read the jungle.", body, true),
		);
	}
	range(label, key, value, min, max, step, unit = "", group = "setting") {
		return (
			'<div class="setting"><label for="' +
			group +
			"-" +
			key +
			'">' +
			label +
			'</label><input id="' +
			group +
			"-" +
			key +
			'" type="range" min="' +
			min +
			'" max="' +
			max +
			'" step="' +
			step +
			'" value="' +
			value +
			'" data-group="' +
			group +
			'" data-key="' +
			key +
			'" data-unit="' +
			unit +
			'"><output for="' +
			group +
			"-" +
			key +
			'">' +
			value +
			unit +
			"</output></div>"
		);
	}
	check(label, key, value, group = "setting") {
		return (
			'<div class="setting"><label for="' +
			group +
			"-" +
			key +
			'">' +
			label +
			'</label><input type="checkbox" id="' +
			group +
			"-" +
			key +
			'" data-group="' +
			group +
			'" data-key="' +
			key +
			'" ' +
			(value ? "checked" : "") +
			"></div>"
		);
	}
	settings() {
		const s = this.app.settings;
		let body =
			'<p class="lead">Make yourself at home. It is a jungle, after all.</p>';
		body +=
			this.range("Music", "music", Math.round(s.music * 100), 0, 100, 1, "%") +
			this.range(
				"Sound & gibberish",
				"effects",
				Math.round(s.effects * 100),
				0,
				100,
				1,
				"%",
			);
		body +=
			'<div class="setting"><label for="glyphs">Controller prompts</label><select id="glyphs" data-group="setting" data-key="glyphs"><option value="playstation" ' +
			(s.glyphs === "playstation" ? "selected" : "") +
			'>PlayStation · ✕ ○ □ △</option><option value="xbox" ' +
			(s.glyphs === "xbox" ? "selected" : "") +
			">Xbox · A B X Y</option></select></div>";
		body +=
			this.check("Controller vibration", "vibration", s.vibration) +
			this.check("Camera shake", "shake", s.shake);
		body +=
			'<div class="menu-stack back">' +
			this.button("Fullscreen", "fullscreen") +
			this.button("Back to the journal", "back", true) +
			"</div>";
		this.show(
			"settings",
			this.wrap("EXPEDITION PREFERENCES", "Settle in.", body),
		);
	}
	party() {
		let body =
			'<p class="lead">A shared haul. A shared sunset. More questionable decisions.</p><div class="party-counter"><button aria-label="Fewer scouts" data-action="fewer">−</button><b id="partyCount">' +
			this.partyCount +
			'</b><button aria-label="More scouts" data-action="more">+</button></div><p class="tiny" style="text-align:center">SCOUTS ON THIS SCREEN</p><div class="menu-stack">' +
			this.button("Start couch expedition", "couch", true) +
			this.button("Link two devices", "link") +
			this.button("Back", "back") +
			'</div><p class="tiny">One keyboard supports two scouts. Extra scouts use gamepads. Each controller takes its matching seat. In AI Hub, invite up to four scouts to the same expedition.</p>';
		this.show(
			"party",
			this.wrap("BETTER WITH COMPANY", "Bring a friend.", body),
		);
	}
	link() {
		const body =
			'<p class="lead">One scout hosts. The other joins. Exchange an invite and reply using your usual messenger, then follow the same trail.</p><div class="menu-stack">' +
			this.button("Host · make an invite", "host", true) +
			this.button("Join · enter an invite", "join") +
			this.button("Same-browser expedition", "relay") +
			this.button("Back", "party") +
			'</div><p class="tiny">Direct links use WebRTC. Networks that block direct connections may need an AI Hub session instead. Keep both pages open while exchanging codes.</p>';
		this.show(
			"link",
			this.wrap("TWO SCOUTS, TWO DEVICES", "Link the expedition.", body),
		);
	}
	linkPage(host) {
		const body =
			'<p class="lead">' +
			(host
				? "1. Make an invite and send it to your friend.<br>2. Paste their reply below to connect."
				: "1. Paste your friend’s invite below.<br>2. Make a reply and send it back.") +
			'</p><div class="net-status" id="netStatus"></div>' +
			(host ? this.button("Make invite", "makeInvite", true) : "") +
			'<label class="section-label" for="netInput">' +
			(host ? "FRIEND’S REPLY" : "FRIEND’S INVITE") +
			'</label><textarea id="netInput" class="network-code" spellcheck="false" aria-label="' +
			(host ? "Friend reply" : "Friend invite") +
			'"></textarea>' +
			this.button(
				host ? "Connect reply" : "Make reply",
				host ? "acceptReply" : "makeReply",
				!host,
			) +
			'<label class="section-label" for="netOutput">' +
			(host ? "YOUR INVITE" : "YOUR REPLY") +
			'</label><textarea id="netOutput" class="network-code" readonly aria-label="Your connection code"></textarea>' +
			'<div class="menu-stack back">' +
			this.button("Copy code", "copyCode") +
			this.button("Back", "cancelLink") +
			"</div>";
		this.show(
			host ? "host" : "join",
			this.wrap(
				"DIRECT EXPEDITION",
				host ? "Open the trail." : "Follow a friend.",
				body,
			),
		);
	}
	relay() {
		const body =
			'<p class="lead">Open this game in two tabs of the same browser, served from the same address. Enter the same camp name on both.</p><label class="section-label" for="relayRoom">CAMP NAME</label><input id="relayRoom" class="network-code" style="min-height:2.5rem" maxlength="24" value="jungle"><div class="menu-stack back">' +
			this.button("Host this camp", "relayHost", true) +
			this.button("Join this camp", "relayJoin") +
			this.button("Back", "link") +
			"</div>";
		this.show(
			"relay",
			this.wrap("NEARBY TRAILS", "Same-browser expedition.", body),
		);
	}
	netStatus(message) {
		if ($("netStatus")) $("netStatus").textContent = message;
	}
	dev() {
		const t = this.app.tuning,
			d = this.app.dev;
		let body =
			'<p class="lead">Live tuning. Changes take effect on the trail.</p>';
		body +=
			this.range("Run speed", "speed", t.speed, 3, 12, 0.1, "", "tuning") +
			this.range("Jump impulse", "jump", t.jump, 7, 17, 0.1, "", "tuning") +
			this.range("Gravity", "gravity", t.gravity, 10, 40, 0.5, "", "tuning") +
			this.range(
				"Hazard rhythm",
				"hazardSpeed",
				t.hazardSpeed,
				0.25,
				2.5,
				0.05,
				"×",
				"tuning",
			) +
			this.range(
				"Daylight budget",
				"timeLimit",
				t.timeLimit,
				60,
				900,
				10,
				"s",
				"tuning",
			) +
			this.range(
				"Simulation speed",
				"timeScale",
				t.timeScale,
				0.25,
				3,
				0.25,
				"×",
				"tuning",
			);
		body +=
			this.check("Invulnerable", "god", d.god, "dev") +
			this.check("Free flight · up/down, jump rises", "fly", d.fly, "dev") +
			this.check("Collision geometry", "collisions", d.collisions, "dev") +
			this.check("Telemetry", "telemetry", d.telemetry, "dev");
		body +=
			'<div class="setting"><label for="warpSelect">Travel</label><select id="warpSelect">' +
			REGIONS.map(
				(r, i) =>
					'<option value="' + i + '">' + (i + 1) + " · " + r.name + "</option>",
			).join("") +
			'<option value="6">Moss Emerald · underground</option><option value="7">Moon Idol · underground</option></select></div>';
		body +=
			'<div class="dev-actions back">' +
			this.button("Travel here", "warp") +
			this.button("Refill hearts", "heal") +
			this.button("Grant six treasures", "grant") +
			this.button("Refill daylight", "refill") +
			this.button("Reset tuning", "resetTuning") +
			this.button("Watch attract reel", "reel") +
			'</div><div class="menu-stack back">' +
			this.button("Return to pause", "pause") +
			this.button("Back to the trail", "resume", true) +
			"</div>";
		this.show(
			"dev",
			this.wrap("DEVELOPER CAMP", "A little jungle science.", body),
		);
	}
	about(tab = this.aboutTab) {
		this.aboutTab = tab;
		const data = JSON.parse($("sourceInfo").textContent);
		const tabs = [
			"Source Information",
			"Testing Feedback",
			"Engine Feedback",
			"Prompt Feedback",
		];
		let body =
			'<p class="lead">An original adventure tipping its hat to Pitfall! (1982). Game, art, animation and sound are made with code.</p><div class="tab-row">' +
			tabs
				.map(
					(t, i) =>
						'<button data-action="aboutTab" data-tab="' +
						t +
						'" class="' +
						(t === tab ? "active" : "") +
						'">' +
						t +
						"</button>",
				)
				.join("") +
			"</div>";
		if (tab === "Source Information") {
			body +=
				'<dl class="credits-list">' +
				Object.entries(data.sourceInformation)
					.map(
						([k, v]) =>
							"<dt>" +
							k[0].toUpperCase() +
							k.slice(1).replace(/([A-Z])/g, " $1") +
							"</dt><dd>" +
							this.escape(v) +
							"</dd>",
					)
					.join("") +
				"</dl>";
			body +=
				'<p class="tiny">Libraries: Three.js (MIT), Rapier (Apache-2.0). AI Hub Session Protocol v1 client included unmodified. No external art or audio assets.</p>';
		} else {
			const key = {
				"Testing Feedback": "testingFeedback",
				"Engine Feedback": "engineFeedback",
				"Prompt Feedback": "promptFeedback",
			}[tab];
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
					"Built by hand",
					"Hardest engine task",
					"Engine changes",
					"One desired improvement",
				],
				promptFeedback: [
					"What worked best",
					"What was confusing",
					"Hardest requirement",
					"Suggested change",
				],
			};
			body +=
				'<div class="feedback">' +
				data[key]
					.map(
						(answer, i) =>
							"<b>" +
							questions[key][i] +
							"</b><p>" +
							this.escape(answer) +
							"</p>",
					)
					.join("") +
				"</div>";
		}
		body += this.button("Back", "back", true, 'style="margin-top:1rem"');
		this.show(
			"about",
			this.wrap("PIT & RUN", "The expedition ledger.", body, true),
		);
	}
	escape(s) {
		const e = document.createElement("span");
		e.textContent = s;
		return e.innerHTML;
	}
	results(won) {
		const a = this.app,
			elapsed = Math.max(0, a.tuning.timeLimit - a.timeLeft);
		const body =
			'<p class="eyebrow">' +
			(won
				? "THE JUNGLE RELUCTANTLY CONGRATULATES YOU"
				: "A TEMPORARY EXPEDITIONAL INCONVENIENCE") +
			'</p><h2 class="results-title">' +
			(won ? "HAT TRICK!" : "OH, PIT.") +
			'</h2><p class="lead">' +
			(won
				? "Six treasures. One sunset. Still got the hat."
				: a.lossReason || "A little rest at camp. A slightly better plan.") +
			'</p><div class="result-stats"><div><b>' +
			a.score.toLocaleString() +
			"</b><span>THE HAUL</span></div><div><b>" +
			countFound(a) +
			" / 6</b><span>TREASURES</span></div><div><b>" +
			Math.floor(elapsed / 60) +
			":" +
			Math.floor(elapsed % 60)
				.toString()
				.padStart(2, "0") +
			'</b><span>TRAIL TIME</span></div></div><p class="tiny">' +
			a.stats.swings +
			" vine catches · " +
			a.stats.jumps +
			" leaps · " +
			a.stats.caches +
			' bonus caches</p><div class="menu-stack">' +
			(!won && !a.net.active
				? this.button("Try the last camp", "retry", true)
				: "") +
			(a.net.isHost
				? this.button(
						won ? "One more expedition" : "Start a fresh expedition",
						"restart",
						won,
					)
				: "") +
			this.button("Back to camp", "quit") +
			"</div>";
		this.show("results", this.wrap("EXPEDITION REPORT", "", body));
	}
	prompts() {
		document
			.querySelectorAll("[data-glyph]")
			.forEach(
				(el) => (el.textContent = this.app.controls.glyph(el.dataset.glyph)),
			);
		document
			.querySelectorAll("[data-menu-hint]")
			.forEach(
				(el) =>
					(el.textContent =
						this.app.controls.device === "gamepad"
							? this.app.settings.glyphs === "xbox"
								? "D-pad · Navigate     A · Choose     B · Back"
								: "D-pad · Navigate     ✕ · Choose     ○ · Back"
							: this.app.controls.device === "touch"
								? "Tap to choose"
								: "↑ ↓ Navigate     Enter Choose     Esc Back"),
			);
	}
	moveFocus(dir) {
		const all = this.focusables();
		if (!all.length) return;
		let i = all.indexOf(document.activeElement);
		i = (i + dir + all.length) % all.length;
		all[i].focus();
		all[i].scrollIntoView({ block: "nearest" });
		this.app.audio.sfx("menu");
	}
	focusables() {
		return [
			...$("screen").querySelectorAll(
				"button:not(:disabled),input,select,textarea",
			),
		].filter((el) => el.offsetParent !== null);
	}
	adjust(dir) {
		const el = document.activeElement;
		if (!el) return;
		if (el.matches("input[type=range]")) {
			el.value = String(
				clamp(
					Number(el.value) + dir * Number(el.step || 1),
					Number(el.min),
					Number(el.max),
				),
			);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}
		if (el.matches("select")) {
			el.selectedIndex = clamp(
				el.selectedIndex + dir,
				0,
				el.options.length - 1,
			);
			el.dispatchEvent(new Event("change", { bubbles: true }));
		}
		if (el.matches("input[type=checkbox]")) {
			el.checked = !el.checked;
			el.dispatchEvent(new Event("change", { bubbles: true }));
		}
	}
	back() {
		if (this.current === "title") return;
		if (this.current === "pause") {
			this.action("resume");
			return;
		}
		if (this.current === "dev") {
			this.pause();
			return;
		}
		if (["host", "join", "relay"].includes(this.current)) {
			this.app.net.disconnect();
			this.link();
			return;
		}
		if (this.current === "link") {
			this.party();
			return;
		}
		if (this.current === "party") {
			this.app.title();
			return;
		}
		if (this.current === "results") {
			if (this.app.net.mode !== "hub") this.action("quit");
			return;
		}
		if (this.origin === "pause" && this.app.players.length) this.pause();
		else this.app.title();
	}
	input(el) {
		const key = el.dataset.key,
			group = el.dataset.group;
		if (!key) return;
		let value =
			el.type === "checkbox"
				? el.checked
				: el.tagName === "SELECT"
					? el.value
					: Number(el.value);
		if (group === "setting") {
			this.app.settings[key] = ["music", "effects"].includes(key)
				? value / 100
				: value;
			this.app.audio.music = this.app.settings.music;
			this.app.audio.effects = this.app.settings.effects;
			this.app.audio.levels();
			this.app.saveSettings();
			this.prompts();
		}
		if (group === "tuning") this.app.tune(key, value);
		if (group === "dev") {
			this.app.dev[key] = value;
			if (key === "collisions") this.app.collisionView(value);
			if (key === "fly" && !value)
				for (const p of this.app.players) {
					p.collider.setSensor(false);
					p.body.setGravityScale(1, true);
				}
		}
		const out = el.parentElement.querySelector("output");
		if (out) out.textContent = value + (el.dataset.unit || "");
	}
	async action(action, el) {
		const a = this.app;
		if (action === "start") {
			this.origin = "title";
			a.start(1);
		} else if (action === "continue") a.start(1, true);
		else if (action === "resume") {
			this.close();
			if (a.state === "paused") a.state = "playing";
			a.ignoreInputUntil = performance.now() + 150;
		} else if (action === "pause") this.pause();
		else if (action === "back") this.back();
		else if (action === "settings") {
			if (this.current === "title") this.origin = "title";
			this.settings();
		} else if (action === "guide") {
			if (this.current === "title") this.origin = "title";
			this.guide();
		} else if (action === "about") {
			if (this.current === "title") this.origin = "title";
			this.about();
		} else if (action === "aboutTab") this.about(el.dataset.tab);
		else if (action === "party") {
			this.origin = "title";
			this.party();
		} else if (action === "fewer" || action === "more") {
			this.partyCount = clamp(
				this.partyCount + (action === "more" ? 1 : -1),
				1,
				4,
			);
			$("partyCount").textContent = this.partyCount;
		} else if (action === "couch") {
			a.net.disconnect();
			a.start(this.partyCount);
		} else if (action === "link") this.link();
		else if (action === "host") this.linkPage(true);
		else if (action === "join") this.linkPage(false);
		else if (action === "relay") this.relay();
		else if (action === "relayHost" || action === "relayJoin")
			a.net.localRelay(
				$("relayRoom").value.trim() || "jungle",
				action === "relayHost",
			);
		else if (action === "makeInvite" || action === "makeReply") {
			const input = $("netInput")?.value || "";
			this.netStatus("Marking the trail…");
			el.disabled = true;
			try {
				const code = await a.net.createPeer(action === "makeInvite", input);
				if ($("netOutput")) $("netOutput").value = code;
				this.netStatus(
					action === "makeInvite"
						? "Invite ready. Send it, then paste your friend’s reply."
						: "Reply ready. Send it to the host. Keep this page open.",
				);
			} catch (error) {
				this.netStatus(error.message);
			} finally {
				el.disabled = false;
			}
		} else if (action === "acceptReply") {
			try {
				await a.net.answer($("netInput").value);
				this.netStatus("Connecting to your friend…");
			} catch (error) {
				this.netStatus(error.message);
			}
		} else if (action === "copyCode") {
			const out = $("netOutput");
			try {
				await navigator.clipboard.writeText(out.value);
				this.netStatus("Code copied.");
			} catch {
				out.focus();
				out.select();
				this.netStatus("Code selected. Press Ctrl+C to copy.");
			}
		} else if (action === "cancelLink") {
			a.net.disconnect();
			this.link();
		} else if (action === "quit") {
			if (a.net.mode === "hub") return;
			a.net.disconnect();
			a.title();
		} else if (action === "restart") {
			if (a.net.mode === "hub") return;
			const roster = a.players.map((p) => ({ id: p.id, name: p.name }));
			a.start(roster);
		} else if (action === "retry") a.retry();
		else if (action === "fullscreen") {
			try {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			} catch {
				a.notify("STAY A WHILE", "Fullscreen is unavailable in this view.");
			}
		} else if (action === "dev") this.dev();
		else if (action === "warp") {
			const i = Number($("warpSelect").value),
				point =
					i === 6 ? [63, -7] : i === 7 ? [147, -7] : [REGIONS[i].x + 2, 0.05];
			for (const p of a.players) a.teleport(p, point[0] + p.id * 0.5, point[1]);
			a.cameraX = point[0] + 4;
			a.cameraY = point[1] + 3;
			a.notify("DEVELOPER TRAVEL", "Trail position updated.");
		} else if (action === "heal") {
			a.players.forEach((p) => {
				p.health = 3;
				p.invuln = 2;
			});
			a.notify("FRESH LEGS", "Hearts restored.");
		} else if (action === "grant") {
			a.found.fill(true);
			a.score = Math.max(a.score, 6000);
			a.notify("SIX OF THE BEST", "The sunset gate is open.");
		} else if (action === "refill") {
			a.timeLeft = a.tuning.timeLimit;
			a.notify("A LONGER AFTERNOON", "Daylight restored.");
		} else if (action === "resetTuning") {
			for (const [k, v] of Object.entries(DEFAULT_TUNING)) a.tune(k, v);
			this.dev();
		} else if (action === "reel") {
			a.net.disconnect();
			a.attract();
		}
	}
}
