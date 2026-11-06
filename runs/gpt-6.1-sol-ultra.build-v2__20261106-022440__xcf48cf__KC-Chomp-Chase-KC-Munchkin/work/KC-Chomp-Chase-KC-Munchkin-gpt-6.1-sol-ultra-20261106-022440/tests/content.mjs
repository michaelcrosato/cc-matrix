import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import "../src/content.js";
import "../src/sim.js";

const C = globalThis.ChompContent;
const id = (p) => `${p.x},${p.y}`;

function reachable(sim, start) {
	const visited = new Set([id(start)]);
	const queue = [start];
	for (let i = 0; i < queue.length; i++) {
		for (const next of sim.neighbors(queue[i].x, queue[i].y)) {
			if (!visited.has(id(next))) {
				visited.add(id(next));
				queue.push(next);
			}
		}
	}
	return visited;
}

export function contentTests() {
	let passed = 0;
	const failures = [];
	const check = (name, run) => {
		try {
			run();
			passed++;
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
		}
	};

	for (const board of C.stages) {
		check(`${board.id}: valid authored schema`, () => {
			const validation = C.validate(board);
			assert.equal(validation.ok, true, JSON.stringify(validation.errors));
			assert.equal(new Set(board.foods.map((food) => food.id)).size, 12);
			assert.equal(board.foods.filter((food) => food.power).length, 4);
			assert.equal(board.foods.filter((food) => !food.power).length, 8);
		});
		for (
			let orientation = 0;
			orientation < (board.gate ? 4 : 1);
			orientation++
		) {
			check(`${board.id}: real simulation graph, gate ${orientation}`, () => {
				const sim = new globalThis.ChompSim({ board, seats: [1, 2] });
				sim.gate.orientation = orientation;
				const floors = board.rows
					.join("")
					.split("")
					.filter((char) => char === ".").length;
				for (const start of board.spawn) {
					const visited = reachable(sim, start);
					assert.equal(
						visited.size,
						floors,
						"A hero cannot reach every floor cell",
					);
					for (const food of board.foods) {
						assert(visited.has(id(food)), `Snack ${food.id} is stranded`);
						assert(
							sim.path(start, food).length > 0,
							`No interception path to ${food.id}`,
						);
					}
				}
				for (let y = 0; y < 15; y++) {
					for (let x = 0; x < 19; x++) {
						if (board.rows[y][x] !== ".") continue;
						const expected = C.neighbors(board, x, y, orientation)
							.map(id)
							.sort();
						const actual = sim.neighbors(x, y).map(id).sort();
						assert.deepEqual(
							actual,
							expected,
							`Content/simulation edge disagreement at ${x},${y}`,
						);
					}
				}
			});
		}
		check(`${board.id}: every possible last snack has approach choices`, () => {
			const sim = new globalThis.ChompSim({ board });
			for (const food of board.foods) {
				assert(
					C.neighbors(board, food.x, food.y, 0, true).length >= 2,
					`Snack ${food.id} starts in a one-way pocket`,
				);
				for (const start of board.spawn) {
					const path = sim.path(start, food, { returning: true });
					assert(
						path.length > 1,
						"Last target overlaps or is inaccessible from a start",
					);
				}
			}
		});
	}

	check("A timed central entry can beat the authored outer detour", () => {
		for (const stage of [C.stages[2], C.stages[5]]) {
			const queue = [[{ x: 9, y: 6 }, 0]];
			const visited = new Set();
			let outerDistance = Infinity;
			for (let index = 0; index < queue.length; index++) {
				const [cell, distance] = queue[index];
				if (visited.has(id(cell))) continue;
				visited.add(id(cell));
				if (cell.x === 10 && cell.y === 7) {
					outerDistance = distance;
					break;
				}
				for (const next of C.neighbors(stage, cell.x, cell.y, 0, true))
					queue.push([next, distance + 1]);
			}
			assert(
				outerDistance >= 12,
				"The gate is decorative because its detour is too short",
			);
			assert(
				2 / 6 + 0.5 < outerDistance / 6,
				"A well-timed two-edge gate journey saves no time",
			);
		}
	});

	for (let seed = 0; seed < 300; seed++) {
		check(`Generator seed ${seed}: reproducible safe maze`, () => {
			const options = {
				density: ["open", "normal", "twisty"][seed % 3],
				tunnels: seed % 2 === 0,
				gate: seed % 3 === 0,
				invisible: seed % 4 === 0,
			};
			const first = C.generate(`content-test-${seed}`, options);
			const second = C.generate(`content-test-${seed}`, options);
			assert.deepEqual(
				first,
				second,
				"Same seed changed the board or initial food direction",
			);
			const validation = C.validate(first);
			assert.equal(validation.ok, true, JSON.stringify(validation.errors));
			assert.equal(
				first.fallback,
				false,
				"Unexpected fallback in the bounded sample",
			);
			for (const [name, value] of Object.entries(options)) {
				if (name !== "density")
					assert.equal(first[name], value, `Option ${name} was ignored`);
			}
			const sim = new globalThis.ChompSim({ board: first });
			const route = reachable(sim, first.spawn[0]);
			for (const food of first.foods)
				assert(
					route.has(id(food)),
					`Generated snack ${food.id} is inaccessible`,
				);
		});
	}

	const bad = (label, mutate) =>
		check(`Reject corrupt maze: ${label}`, () => {
			const board = C.clone(C.stages[0]);
			mutate(board);
			const result = C.importBoard(JSON.stringify(board));
			assert.equal(result.ok, false);
			assert(result.errors[0].message.length > 0, "No actionable import error");
			assert.equal(
				result.board,
				undefined,
				"A rejected import supplied a replacement board",
			);
		});
	bad("duplicate food identity", (b) => {
		b.foods[1].id = b.foods[0].id;
	});
	bad("null food object", (b) => {
		b.foods[0] = null;
	});
	bad("out-of-bounds food", (b) => {
		b.foods[0].x = -1;
	});
	bad("incorrect power count", (b) => {
		b.foods[0].power = true;
	});
	bad("overlapping start", (b) => {
		b.spawn[1] = C.clone(b.spawn[0]);
	});
	bad("unsafe predator start", (b) => {
		b.enemySpawns[0] = { x: 2, y: 1 };
	});
	bad("broken central pen", (b) => {
		const r = b.rows[7].split("");
		r[9] = "#";
		b.rows[7] = r.join("");
	});
	bad("open outer frame", (b) => {
		const r = b.rows[0].split("");
		r[4] = ".";
		b.rows[0] = r.join("");
	});
	bad("unpaired tunnel", (b) => {
		b.tunnels = true;
		b.rows[7] = `.${b.rows[7].slice(1)}`;
	});
	bad("disconnected corridor", (b) => {
		b.rows[4] = "#".repeat(19);
	});
	bad("wrong dimensions", (b) => {
		b.rows.pop();
	});
	bad("invalid cell alphabet", (b) => {
		b.rows[1] = b.rows[1].replace(".", "X");
	});
	bad("invalid version", (b) => {
		b.schemaVersion = 999;
	});
	for (const text of ["null", "[]", "{}", '"text"', "{broken", ""]) {
		check(`Reject invalid JSON/import shape ${JSON.stringify(text)}`, () => {
			const result = C.importBoard(text);
			assert.equal(result.ok, false);
			assert(result.errors.length > 0);
		});
	}

	for (let index = 0; index < C.templates.length; index++) {
		check(
			`Workshop template ${index}: edit/save/reload/export/import/play schema`,
			() => {
				const original = C.clone(C.templates[index]);
				let edited;
				const occupied = new Set(
					[
						...original.spawn,
						...original.enemySpawns,
						...original.foods,
						{ x: 9, y: 7 },
						{ x: 8, y: 7 },
						{ x: 10, y: 7 },
						{ x: 9, y: 6 },
						{ x: 9, y: 8 },
					].map(id),
				);
				for (let y = 1; y < 14 && !edited; y++) {
					for (let x = 1; x < 18 && !edited; x++) {
						if (occupied.has(id({ x, y }))) continue;
						const candidate = C.clone(original);
						const row = candidate.rows[y].split("");
						row[x] = row[x] === "#" ? "." : "#";
						candidate.rows[y] = row.join("");
						if (C.validate(candidate).ok) edited = candidate;
					}
				}
				assert(edited, "No valid edit could be applied to the template");
				edited.name = `Test supper ${index}`;
				const saved = JSON.stringify({ version: 1, boards: [edited] });
				const reloaded = JSON.parse(saved).boards[0];
				const imported = C.importBoard(C.exportBoard(reloaded));
				assert.equal(imported.ok, true, JSON.stringify(imported.errors));
				assert.deepEqual(imported.board, edited);
				assert.notDeepEqual(
					imported.board.rows,
					original.rows,
					"The valid edit was lost",
				);
				const sim = new globalThis.ChompSim({ board: imported.board });
				const start = sim.players[0];
				assert(
					sim.neighbors(start.x, start.y).length > 0,
					"Imported board cannot be played",
				);
				assert.equal(sim.remaining, 12);
				assert.equal(
					C.validate(original).ok,
					true,
					"Editing polluted a source template",
				);
			},
		);
	}
	return { passed, failed: failures.length, failures };
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const result = contentTests();
	for (const failure of result.failures) console.error(failure);
	console.log(
		`Content: ${result.passed} passed, ${result.failed} failed, 0 skipped`,
	);
	if (result.failed) process.exitCode = 1;
}
