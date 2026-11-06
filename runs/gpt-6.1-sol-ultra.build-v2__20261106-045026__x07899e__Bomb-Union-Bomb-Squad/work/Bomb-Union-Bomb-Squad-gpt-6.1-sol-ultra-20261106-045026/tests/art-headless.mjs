import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
export async function runArtTests() {
	const logs = [],
		ctx = vm.createContext({
			console: {
				log() {},
				warn(...a) {
					logs.push(a.join(" "));
				},
				error(...a) {
					logs.push(a.join(" "));
				},
			},
		});
	for (const f of [
		"vendor/my-3d2dge.js",
		"src/sim/content.js",
		"src/sim/model.js",
		"src/view/art.js",
		"src/audio/audio.js",
	])
		vm.runInContext(
			fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8"),
			ctx,
			{ filename: f },
		);
	const E = ctx.My3D2dge,
		B = ctx.BU,
		g = new E.Game({
			headless: true,
			res: [640, 360],
			draw: true,
			view: "topdown",
			menu: false,
		}),
		art = new B.Art(g),
		audio = new B.Audio(g);
	let state = B.Sim.create("waterfront", 42),
		view = { screen: "title", boardId: null, tool: "cut" },
		checks = 0;
	const failures = [];
	const check = (name, ok, detail = "") => {
		checks++;
		if (!ok) failures.push(name + (detail ? `: ${detail}` : ""));
	};
	g.start({
		update(dt) {
			art.update(dt, state, view);
		},
		draw(r) {
			art.draw(r, state, view);
		},
	});
	g.advance(0.1);
	check(
		"Native city draws without engine errors",
		!g.errors.length,
		g.errors.map((e) => e.message).join("|"),
	);
	for (const caseId of ["training", "waterfront", "relay", "central"]) {
		state = B.Sim.create(caseId, 42);
		view = { screen: "brief", tool: "cut" };
		g.advance(0.1);
		check(
			`${caseId} native diorama is valid`,
			!g.errors.length,
			g.errors.map((e) => e.message).join("|"),
		);
		view = { screen: "work", boardId: "B1", tool: "cut", focusTarget: "C1:0" };
		g.advance(0.15);
		const targets = art.targets(state, view);
		check(
			`${caseId} workspace has both terminal targets`,
			targets.some((t) => t.id === "C1:0") &&
				targets.some((t) => t.id === "C1:1"),
		);
		check(
			`${caseId} target projection stays inside work area`,
			targets.every(
				(t) =>
					Number.isFinite(t.x) &&
					Number.isFinite(t.y) &&
					t.x > 0 &&
					t.x < 480 &&
					t.y > 20 &&
					t.y < 320,
			),
			JSON.stringify(targets),
		);
		check(
			`${caseId} native workbench draws without errors`,
			!g.errors.length,
			g.errors.map((e) => e.message).join("|"),
		);
		const before = JSON.stringify(state);
		g.advance(0.05);
		check(
			`${caseId} drawing never mutates repair simulation`,
			JSON.stringify(state) === before,
		);
	}
	state.boards[0].fire = true;
	state.boards[0].heat = 105;
	view.tool = "extinguish";
	view.focusTarget = "fire";
	g.advance(0.1);
	check("Native established-fire presentation draws", !g.errors.length);
	state.boards[0].hold = {
		tool: "extinguish",
		seat: 0,
		component: "C1",
		duration: 0.5,
	};
	g.advance(0.1);
	check("Native foam and hold safe-band draw", !g.errors.length);
	check(
		"All original shapes use native asset registry",
		Object.keys(E.SHAPES).filter((k) => k.startsWith("BU:")).length >= 14,
	);
	check(
		"Actual native music default is 10%",
		audio.snapshot().music === 0.1 && g.settings.default("music") === 0.1,
	);
	audio.set({ music: 0, effects: 0.4, voice: 0.6, muted: true });
	check(
		"Independent procedural audio bus settings apply",
		audio.snapshot().effects === 0.4 &&
			audio.snapshot().voice === 0.6 &&
			audio.snapshot().music === 0 &&
			audio.snapshot().muted,
	);
	const framingGame = { W: 1170, H: 1992, screen: { W: 1170, H: 1992 } };
	const phoneFrame = art.frame.call({ game: framingGame, t: 0 }, state, {
		screen: "work",
		boardId: "B1",
	});
	check(
		"Phone portrait PCB occupies ninety percent of buffer width",
		phoneFrame.tall &&
			(phoneFrame.scale * 298) / phoneFrame.W >= 0.88 &&
			(phoneFrame.scale * 298) / phoneFrame.W <= 0.92,
	);
	check(
		"Phone portrait workspace stays between fuse and order strip",
		phoneFrame.cy - phoneFrame.scale * 97 > phoneFrame.H * 0.12 &&
			phoneFrame.cy + phoneFrame.scale * 82 < phoneFrame.H * 0.69,
	);
	const saved = new E.Game({
		headless: true,
		id: "audio-saved-regression",
		menu: {
			settings: [
				{
					key: "voice",
					value: 0.75,
					min: 0,
					max: 1,
					type: "slider",
					apply: (game, value) => {
						game.audio.voiceVolume = value;
						game.audio.applyVolume();
					},
				},
			],
		},
	});
	check(
		"Native authored voice starts at 0.75",
		saved.settings.voice === 0.75 && saved.audio.voiceVolume === 0.75,
	);
	saved.settings.set("effects", 0.2);
	saved.settings.set("voice", 0);
	const savedAudio = new B.Audio(saved);
	check(
		"Audio construction preserves persisted effects and voice mute",
		savedAudio.snapshot().effects === 0.2 && savedAudio.snapshot().voice === 0,
	);
	savedAudio.dispose();
	saved.dispose();
	// Native headless settings intentionally do not write storage; seed the
	// persisted record so this exercises the real native load path.
	E.store.set("settings:audio-saved-regression", {
		v: 2,
		values: { effects: 0.2, voice: 0 },
	});
	const reloaded = new E.Game({
		headless: true,
		id: "audio-saved-regression",
		menu: {
			settings: [
				{
					key: "voice",
					value: 0.75,
					min: 0,
					max: 1,
					type: "slider",
					apply: (game, value) => {
						game.audio.voiceVolume = value;
					},
				},
			],
		},
	});
	const reloadedAudio = new B.Audio(reloaded);
	check(
		"Reload preserves saved independent voice mute and effects",
		reloadedAudio.snapshot().effects === 0.2 &&
			reloadedAudio.snapshot().voice === 0 &&
			reloaded.settings.voice === 0,
	);
	reloadedAudio.dispose();
	reloaded.dispose();
	const phoneGame = new E.Game({
		headless: true,
		res: [1170, 1992],
		view: "topdown",
		menu: false,
	});
	const phoneArt = new B.Art(phoneGame),
		phoneView = { screen: "work", boardId: "B1", tool: "cut" };
	phoneArt.update(0.1, state, phoneView);
	phoneGame.cam.x = -phoneFrame.cx;
	phoneGame.cam.y = -phoneFrame.cy;
	const phoneTargets = phoneArt.targets(state, phoneView);
	check(
		"Enlarged portrait terminals remain reachable and inside workspace",
		phoneTargets.every(
			(target) =>
				target.x > phoneFrame.W * 0.06 &&
				target.x < phoneFrame.W * 0.94 &&
				target.y > phoneFrame.H * 0.12 &&
				target.y < phoneFrame.H * 0.66,
		) &&
			phoneTargets
				.filter((target) => target.kind === "terminal")
				.every((target) => target.radius >= 28),
	);
	phoneArt.dispose();
	phoneGame.dispose();
	audio.dispose();
	art.dispose();
	g.dispose();
	check("Disposal completes without engine errors", !g.errors.length);
	check(
		"Native asset system reports no warnings",
		!logs.length,
		logs.join("|"),
	);
	return { checks, failures, issues: [] };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const r = await runArtTests();
	for (const f of r.failures) console.error(`FAIL ${f}`);
	console.log(`${r.checks} checks, ${r.failures.length} failures`);
	process.exitCode = r.failures.length ? 1 : 0;
}
