import { ExpeditionNetwork } from "./online.js";
const failures = [];
let total = 0;
const check = (name, pass) => {
	total++;
	if (!pass) failures.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const room = `network-check-${process.pid}-${Date.now()}`;
const starts = [];
const ghosts = [];
const departures = [];
const peers = Array.from(
	{ length: 4 },
	(_, index) =>
		new ExpeditionNetwork({
			onStart: (info) => starts.push({ index, info }),
			onGhost: (data, from) => ghosts.push({ index, data, from }),
			onLeave: (id) => departures.push({ index, id }),
		}),
);
try {
	for (const peer of peers) {
		peer.joinLocal(room);
		await sleep(4);
	}
	await sleep(70);
	check(
		"four explorers discover one another",
		peers.every((peer) => peer.players.length === 4),
	);
	check(
		"every explorer agrees on leader and roster order",
		peers.every(
			(peer) =>
				JSON.stringify(peer.players) === JSON.stringify(peers[0].players) &&
				peer.host === peers[0].me,
		),
	);
	check(
		"network inspection is serializable",
		peers.every(
			(peer) => JSON.parse(JSON.stringify(peer.inspect())).players.length === 4,
		),
	);
	let denied = false;
	try {
		peers[1].startRace();
	} catch {
		denied = true;
	}
	check("only leader can start race", denied && starts.length === 0);
	peers[0].startRace();
	await sleep(40);
	check(
		"leader starts all four copies",
		starts.length === 4 && peers.every((peer) => peer.started),
	);
	check(
		"every copy uses the same countdown deadline",
		starts.every((entry) => entry.info.startAt === starts[0].info.startAt),
	);
	peers[1].tick(
		{
			player: { x: 37, y: 1.2, facing: -1, vx: 5, swinging: true },
			score: 750,
			collected: new Set([0, 1]),
		},
		0.2,
	);
	await sleep(40);
	check(
		"position and score travel to all other copies",
		ghosts.length === 3 &&
			ghosts.every(
				(ghost) =>
					ghost.from === peers[1].me &&
					ghost.data.x === 37 &&
					ghost.data.score === 750 &&
					ghost.data.relics === 2,
			),
	);
	const ghostCount = ghosts.length;
	peers[1].result(2750, { Relics: 3 });
	peers[1].result(9999, { Relics: 6 });
	await sleep(40);
	check(
		"results are reported exactly once",
		ghosts.length === ghostCount + 3 &&
			ghosts
				.slice(ghostCount)
				.every((ghost) => ghost.data.result && ghost.data.score === 2750),
	);
	peers[0].leave();
	await sleep(40);
	check(
		"departing leader is removed everywhere",
		peers.slice(1).every((peer) => peer.players.length === 3) &&
			departures.length >= 3,
	);
	check(
		"nearby camp elects a replacement leader",
		peers.slice(1).every((peer) => peer.host === peers[1].me),
	);
	const sent = peers[1].sent;
	peers[1].end();
	peers[1].tick({ player: { x: 88, y: 0 }, score: 3000 }, 1);
	check("ended copies stop sending gameplay", peers[1].sent === sent);
	peers[1].leave();
	check(
		"leaving clears standalone state",
		!peers[1].active && peers[1].players.length === 0 && peers[1].me === null,
	);
} catch (error) {
	total++;
	failures.push(`network test completed: ${error.stack || error}`);
} finally {
	for (const peer of peers) peer.leave();
}
for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(
	`${total - failures.length}/${total} network checks passed${failures.length ? `; ${failures.length} failed` : ""}`,
);
if (failures.length) process.exitCode = 1;
