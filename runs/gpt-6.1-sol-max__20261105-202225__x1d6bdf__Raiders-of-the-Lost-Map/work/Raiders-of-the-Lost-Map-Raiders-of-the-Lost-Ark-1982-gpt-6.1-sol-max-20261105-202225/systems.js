let enemySerial = 0;
function spawnEnemy(kind, x, z, id = null) {
	const e = {
		id: id === null ? ++enemySerial : id,
		kind,
		pos: { x, y: 0, z },
		home: { x, z },
		hp: kind === "boss" ? 8 : kind === "thief" ? 2 : 1,
		state: "patrol",
		timer: 0.6 + worldRng(),
		phase: worldRng() * TAU,
		hit: 0,
		charmed: 0,
		dead: false,
	};
	if (kind === "snake") {
		e.visual = makeSnake(x, z);
		e.mesh = e.visual.mesh;
	} else {
		e.visual = makeExplorer(kind === "boss" ? "#cfb66e" : "#65827c", true);
		e.mesh = e.visual.mesh;
		level.add(e.mesh);
		e.mesh.position.set(x, 0, z);
		if (kind === "boss") e.mesh.scale.setScalar(1.7);
	}
	e.body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			x,
			kind === "boss" ? 1.5 : 0.8,
			z,
		),
	);
	e.collider = world.createCollider(
		RAPIER.ColliderDesc.ball(kind === "boss" ? 0.85 : 0.5).setSensor(true),
		e.body,
	);
	if (kind === "boss") {
		e.danger = ring(x, z, 4, "red");
		e.danger.visible = false;
		sign("CAPTAIN VOSS", 0, 3.6, 0, 1, "#f4cd8a", e.mesh);
	}
	S.enemies.push(e);
	return e;
}
function particleBurst(x, y, z, color = "gold", count = 9, physical = false) {
	for (let i = 0; i < count; i++) {
		const size = 0.07 + Math.random() * 0.14,
			m = mesh(new THREE.BoxGeometry(size, size, size), color, x, y, z);
		const e = {
			kind: physical ? "debris" : "spark",
			mesh: m,
			life: 0.5 + Math.random() * 0.6,
			max: 1,
			velocity: vec(
				(Math.random() - 0.5) * 7,
				2 + Math.random() * 5,
				(Math.random() - 0.5) * 7,
			),
		};
		if (physical) {
			e.body = world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(x, y, z)
					.setLinvel(e.velocity.x, e.velocity.y, e.velocity.z)
					.setAngvel({ x: 2, y: 3, z: 1 }),
			);
			e.collider = world.createCollider(
				RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setRestitution(
					0.4,
				),
				e.body,
			);
		}
		S.effects.push(e);
	}
}
function hitEnemy(e, damage = 1) {
	if (e.dead || e.hit > 0) return;
	if (e.kind === "boss" && e.state !== "exposed") {
		audio.fx("rotate");
		particleBurst(e.pos.x, 1.5, e.pos.z, "gold", 4);
		toast("HIS GUARD IS UP · Dodge the slam, then strike.");
		return;
	}
	e.hp -= damage;
	e.hit = 0.2;
	particleBurst(
		e.pos.x,
		1,
		e.pos.z,
		e.kind === "snake" ? "green" : "gold",
		9,
		true,
	);
	audio.fx("hurt");
	shake = 0.16;
	if (e.hp <= 0) {
		e.dead = true;
		e.mesh.visible = false;
		if (e.danger) e.danger.visible = false;
		world.removeRigidBody(e.body);
		e.body = null;
		S.kills++;
		if (e.kind === "boss") {
			S.flags.bossDefeated = true;
			audio.fx("chime");
			say("CAPTAIN VOSS", "I shall be filing a strongly worded complaint.");
			toast("VOSS DEFEATED · Recover the reliquary");
			saveCheckpoint();
		} else {
			coin(e.pos.x, e.pos.z, e.kind === "thief" ? 2 : 1);
			if (e.kind === "thief" && Math.random() < 0.2)
				dropHeart(e.pos.x + 0.5, e.pos.z);
		}
		logEvent("enemy-defeated", { kind: e.kind });
	}
}
function dropHeart(x, z) {
	const m = ball(x, 0.9, z, 0.3, "red");
	S.pickups.push({ kind: "heart", x, y: 0.9, z, mesh: m, active: true });
}
function attack(p) {
	if (p.down > 0 || p.attackCd > 0 || p.swing || S.stage === 4) return false;
	p.attackCd = 0.44;
	metrics.attacks++;
	animateActor(p, "whip");
	audio.fx("whip");
	let aim = vec(Math.sin(p.face), 0, Math.cos(p.face));
	if (settings.assist && inputType !== "mouse") {
		const enemy = S.enemies
			.filter((e) => !e.dead && dist(e.pos, p.pos) < tune.reach + 0.5)
			.sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))[0];
		if (enemy) {
			p.face = Math.atan2(enemy.pos.x - p.pos.x, enemy.pos.z - p.pos.z);
			aim = vec(Math.sin(p.face), 0, Math.cos(p.face));
		}
	}
	const pts = [];
	for (let i = 0; i < 10; i++) {
		const t = i / 9;
		pts.push([
			p.pos.x +
				aim.x * t * tune.reach +
				Math.cos(p.face) * Math.sin(t * TAU) * 0.32,
			p.pos.y + 1.3 + Math.sin(t * PI) * 0.5,
			p.pos.z +
				aim.z * t * tune.reach -
				Math.sin(p.face) * Math.sin(t * TAU) * 0.32,
		]);
	}
	const whip = tube(pts, 0.028, "gold");
	S.effects.push({ kind: "lash", mesh: whip, life: 0.2, max: 0.2 });
	for (const e of S.enemies) {
		if (e.dead) continue;
		const d = dist(e.pos, p.pos),
			dot =
				((e.pos.x - p.pos.x) * aim.x + (e.pos.z - p.pos.z) * aim.z) / (d || 1);
		if (d < tune.reach + (e.kind === "boss" ? 0.6 : 0) && dot > -0.1)
			hitEnemy(e);
	}
	for (const pickup of S.pickups) {
		if (
			pickup.kind === "crate" &&
			pickup.active &&
			dist(pickup, p.pos) < tune.reach
		) {
			pickup.active = false;
			pickup.mesh.visible = false;
			particleBurst(pickup.x, 0.8, pickup.z, "brown", 12, true);
			coin(pickup.x, pickup.z, 2);
			logEvent("crate");
		}
	}
	return true;
}
function useTool(p) {
	if (p.down > 0) return false;
	if (S.stage === 4) {
		if (!S.flags.chute) {
			say(
				"EXPLORER",
				"I have forgotten something. Something rather parachute-shaped.",
			);
			return false;
		}
		if (!p.gliding) {
			p.gliding = true;
			p.vy = -1.8;
			p.visual.canopy.visible = true;
			metrics.glides++;
			audio.fx("chute");
			logEvent("chute-open");
			toast("STEER TOWARD THE GOLD CIRCLE");
		}
		return true;
	}
	if (!S.flags.flute) {
		say("FIELD NOTE", "Nadia sells a snake flute. A sound investment.");
		return false;
	}
	if (p.toolCd > 0) {
		toast("The flute needs a breath · " + Math.ceil(p.toolCd) + "s");
		return false;
	}
	p.toolCd = 8;
	p.flute = 6.5;
	animateActor(p, "flute");
	audio.fx("flute");
	logEvent("flute");
	for (const e of S.enemies) if (!e.dead && e.kind === "snake") e.charmed = 7;
	const m = ring(p.pos.x, p.pos.z, 1.2, "gold");
	S.effects.push({ kind: "wave", mesh: m, life: 1, max: 1 });
	say("EXPLORER", "Music appreciation. Finally, a subject we agree on.");
	return true;
}
function dodge(p, input) {
	if (p.down > 0 || p.rollCd > 0 || p.swing) return false;
	if (S.stage === 4) return useTool(p);
	p.roll = 0.42;
	p.rollCd = 0.85;
	p.invuln = Math.max(p.invuln, 0.48);
	metrics.rolls++;
	animateActor(p, "roll");
	audio.fx("roll");
	const move = inputWorld(input);
	if (move.lengthSq() < 0.1) move.set(Math.sin(p.face), 0, Math.cos(p.face));
	p.rollDir = move.normalize();
	logEvent("dodge");
	return true;
}
function inputWorld(input) {
	const x = input.x || 0,
		z = input.z || 0;
	return vec(x * 0.821 + z * 0.571, 0, -x * 0.571 + z * 0.821);
}
function beginSwing(p, to, anchor = null) {
	if (p.swing || p.down > 0) return;
	p.swing = {
		from: { ...p.pos },
		to: { x: to[0], y: to[1], z: to[2] },
		t: 0,
		duration: 1.8,
	};
	p.invuln = 2.2;
	metrics.swings++;
	audio.fx("whip");
	animateActor(p, "glide");
	const a = anchor
		? vec(anchor.x, anchor.y, anchor.z)
		: vec((p.pos.x + to[0]) / 2, 7, (p.pos.z + to[2]) / 2);
	const l = line(
		[[0, 1.5, 0], a.clone().sub(vec(p.pos.x, p.pos.y, p.pos.z))],
		0xf7d49c,
		p.visual.tether,
	);
	p.swing.rope = l;
	p.swing.anchor = a;
	logEvent("swing");
}
function damagePlayer(p, amount = 1, source = "hazard") {
	if (p.down > 0 || p.invuln > 0 || debug.god || S.attract) return false;
	amount *= tune.damage;
	if (amount <= 0) return false;
	p.hp = clamp(p.hp - amount, 0, 6);
	p.invuln = 1.2;
	metrics.damages++;
	audio.fx("hurt");
	shake = 0.35;
	if (p.id === localId) {
		flash = 0.8;
		toast(
			source === "snake"
				? "SNAKE BITE · The flute keeps them calm."
				: source === "dart"
					? "DART TRAP · Dodge through the volley."
					: "A scratch. Probably.",
		);
	}
	particleBurst(p.pos.x, 1, p.pos.z, "red", 7);
	logEvent("damage", { id: p.id, amount, source });
	if (p.hp <= 0) {
		p.down = S.players.length > 1 ? 9 : 2.4;
		p.roll = 0;
		S.deathCount++;
		say(
			"EXPLORER",
			S.players.length > 1
				? "A hand, please. Preferably attached to a colleague."
				: "Still have the hat. That’s the important part.",
		);
	}
	return true;
}
function respawn(p) {
	const st = p.checkpoint || {
		x: stageData[S.stage].start[0],
		y: stageData[S.stage].start[1],
		z: stageData[S.stage].start[2],
	};
	p.pos = { ...st };
	p.body.setTranslation({ x: st.x, y: st.y + 0.92, z: st.z }, true);
	p.hp = 6;
	p.down = 0;
	p.invuln = 3;
	p.vy = 0;
	p.gliding = false;
	if (S.stage === 6) S.escape = 20;
	if (S.stage === 4) {
		p.pos.y = 23;
		p.body.setTranslation({ x: p.pos.x, y: 23.92, z: p.pos.z }, true);
	}
	toast("HAT RECOVERED · Checkpoint restored");
	logEvent("respawn", { id: p.id });
}
function interact(p) {
	if (p.down > 0 || p.swing || interactCooldown > 0) return false;
	const fallen = S.players.find(
		(o) => o.id !== p.id && o.down > 0 && dist(o.pos, p.pos) < 3,
	);
	if (fallen) {
		fallen.down = 0;
		fallen.hp = 3;
		fallen.invuln = 3;
		audio.fx("chime");
		toast("PARTNER BACK ON THEIR FEET");
		return true;
	}
	const items = S.interacts.filter(
		(i) =>
			i.enabled &&
			(!i.can || i.can()) &&
			Math.abs((i.y || 0) - p.pos.y) < 2.5 &&
			dist(i, p.pos) < i.radius,
	);
	items.sort((a, b) => dist(a, p.pos) - dist(b, p.pos));
	const i = items.find((o) => o === hovered) || items[0];
	if (!i) return false;
	interactCooldown = 0.3;
	metrics.interactions++;
	audio.fx("click");
	i.action(p);
	logEvent("interact", {
		label: typeof i.label === "function" ? i.label() : i.label,
	});
	return true;
}
function takeRelic() {
	if (S.flags.relic) return;
	S.flags.relic = true;
	audio.fx("victory");
	particleBurst(0, 2, -7, "gold", 30);
	say("EXPLORER", "It belongs in a museum. We belong outside.");
	advanceStage(6);
}
function fireDart(x, z) {
	const m = mesh(new THREE.ConeGeometry(0.075, 0.7, 5), "gold", x, 0.9, z);
	m.rotation.z = -PI / 2;
	S.projectiles.push({ x, y: 0.9, z, vx: 14, vz: 0, life: 3, mesh: m });
	audio.noise(audio.ctx ? audio.ctx.currentTime : 0, 0.06, 0.07, 2500);
}
function updateEnemy(e, dt) {
	if (e.dead) return;
	e.hit = Math.max(0, e.hit - dt);
	e.charmed = Math.max(0, e.charmed - dt);
	e.phase += dt * 6;
	const targets = S.players.filter((p) => !p.down);
	if (!targets.length) return;
	const p = targets.reduce((a, b) =>
			dist(a.pos, e.pos) < dist(b.pos, e.pos) ? a : b,
		),
		d = dist(e.pos, p.pos);
	if (debug.freeze) return;
	if (e.kind === "boss") {
		e.danger.position.set(e.pos.x, 0.055, e.pos.z);
		e.danger.visible = e.state === "windup";
		if (e.state === "windup") {
			e.timer -= dt;
			e.danger.scale.setScalar(1 + Math.sin(e.timer * 18) * 0.03);
			if (e.timer <= 0) {
				for (const o of targets)
					if (dist(o.pos, e.pos) < 4.3) damagePlayer(o, 2, "slam");
				audio.fx("slam");
				shake = 0.65;
				e.state = "exposed";
				e.timer = 2.4;
				const m = ring(e.pos.x, e.pos.z, 1, "gold");
				S.effects.push({ kind: "wave", mesh: m, life: 0.7, max: 0.7 });
			}
		} else if (e.state === "exposed") {
			e.timer -= dt;
			if (e.timer <= 0) {
				e.state = "chase";
				e.timer = 1.8;
			}
		} else {
			const dx = (p.pos.x - e.pos.x) / (d || 1),
				dz = (p.pos.z - e.pos.z) / (d || 1);
			if (d > 2.8) {
				e.pos.x += dx * 1.8 * dt * tune.enemySpeed;
				e.pos.z += dz * 1.8 * dt * tune.enemySpeed;
			}
			e.timer -= dt;
			if (e.timer <= 0 && d < 6) {
				e.state = "windup";
				e.timer = 1.15;
			}
			e.mesh.rotation.y = Math.atan2(dx, dz);
		}
		e.mesh.position.set(e.pos.x, 0, e.pos.z);
		e.body?.setNextKinematicTranslation({ x: e.pos.x, y: 1.5, z: e.pos.z });
		animateActor({ visual: e.visual }, e.state === "chase" ? "walk" : "idle");
		return;
	}
	let speed = e.kind === "snake" ? 1.65 : 2.05;
	if (
		e.kind === "snake" &&
		(e.charmed > 0 || S.players.some((o) => o.flute > 0))
	) {
		e.state = "charmed";
		e.pos.x += Math.cos(e.phase * 0.22) * dt * 0.28;
		e.mesh.rotation.y += dt * 0.5;
	} else if (e.state === "windup") {
		e.timer -= dt;
		if (e.timer <= 0) {
			if (d < 1.8) {
				const hit = damagePlayer(p, 1, e.kind === "snake" ? "snake" : "thief");
				if (hit && e.kind === "thief" && S.coins > 0) {
					S.coins--;
					e.stolen = true;
					toast("PICKPOCKET · Whip the thief to recover your coins.");
				}
			}
			e.state = "recover";
			e.timer = 1.25;
		}
	} else if (e.state === "recover") {
		e.timer -= dt;
		if (e.timer <= 0) e.state = "chase";
	} else {
		let tx = p.pos.x,
			tz = p.pos.z;
		if (d > 10) {
			tx = e.home.x + Math.sin(S.time * 0.6 + e.phase * 0.05) * 2;
			tz = e.home.z + Math.cos(S.time * 0.4 + e.phase * 0.05) * 2;
			speed *= 0.4;
			e.state = "patrol";
		} else e.state = "chase";
		const dd = Math.hypot(tx - e.pos.x, tz - e.pos.z) || 1,
			dx = (tx - e.pos.x) / dd,
			dz = (tz - e.pos.z) / dd;
		if (d > 1.2) {
			e.pos.x += dx * speed * dt * tune.enemySpeed;
			e.pos.z += dz * speed * dt * tune.enemySpeed;
			e.mesh.rotation.y = Math.atan2(dx, dz);
		}
		if (d < 1.55) {
			e.state = "windup";
			e.timer = e.kind === "snake" ? 0.5 : 0.65;
		}
	}
	e.pos.x = clamp(e.pos.x, -17, 17);
	e.pos.z = clamp(e.pos.z, -11, 11);
	e.mesh.position.set(e.pos.x, 0, e.pos.z);
	e.mesh.visible = e.hit <= 0 || Math.sin(S.time * 60) > 0;
	e.body?.setNextKinematicTranslation({ x: e.pos.x, y: 0.8, z: e.pos.z });
	if (e.kind === "snake") {
		for (let i = 0; i < e.visual.segments.length; i++)
			e.visual.segments[i].position.x = Math.sin(e.phase - i * 0.5) * 0.16;
		e.mesh.scale.y = e.state === "windup" ? 1.6 : 1;
	} else
		animateActor(
			{ visual: e.visual },
			["chase", "patrol"].includes(e.state) ? "walk" : "idle",
		);
}
function stepPlayer(p, input, dt) {
	p.invuln = Math.max(0, (p.invuln || 0) - dt);
	p.attackCd = Math.max(0, (p.attackCd || 0) - dt);
	p.toolCd = Math.max(0, (p.toolCd || 0) - dt);
	p.dig = Math.max(0, (p.dig || 0) - dt);
	p.rollCd = Math.max(0, (p.rollCd || 0) - dt);
	p.flute = Math.max(0, (p.flute || 0) - dt);
	if (p.down > 0) {
		p.down -= dt;
		animateActor(p, "idle");
		if (p.down <= 0) respawn(p);
		return;
	}
	if (input.attack) attack(p);
	if (input.dodge) dodge(p, input);
	if (input.tool) useTool(p);
	if (input.interact) {
		const old = S.stage;
		interact(p);
		if (S.stage !== old) return;
	}
	if (p.swing) {
		const a = p.swing;
		a.t += dt;
		const t = clamp(a.t / a.duration, 0, 1),
			ease = t * t * (3 - 2 * t);
		p.pos.x = lerp(a.from.x, a.to.x, ease);
		p.pos.z = lerp(a.from.z, a.to.z, ease);
		p.pos.y = lerp(a.from.y, a.to.y, ease) + Math.sin(t * PI) * 4;
		p.face = Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z);
		const l = a.rope;
		if (l) {
			const arr = l.geometry.attributes.position.array;
			arr[0] = 0;
			arr[1] = 1.4;
			arr[2] = 0;
			const dx = a.anchor.x - p.pos.x,
				dz = a.anchor.z - p.pos.z;
			arr[3] = dx * Math.cos(p.face) - dz * Math.sin(p.face);
			arr[4] = a.anchor.y - p.pos.y;
			arr[5] = dx * Math.sin(p.face) + dz * Math.cos(p.face);
			l.geometry.attributes.position.needsUpdate = true;
		}
		p.body.setNextKinematicTranslation({
			x: p.pos.x,
			y: p.pos.y + 0.92,
			z: p.pos.z,
		});
		if (t >= 1) {
			p.pos.y = a.to.y;
			p.swing = null;
			p.vy = 0;
			p.checkpoint = { ...a.to };
			p.visual.tether.clear();
			audio.fx("roll");
		}
		return;
	}
	let move = inputWorld(input);
	if (move.length() > 1) move.normalize();
	if (input.aim && Number.isFinite(input.aim.x) && Number.isFinite(input.aim.z))
		p.face = Math.atan2(input.aim.x - p.pos.x, input.aim.z - p.pos.z);
	else if (move.lengthSq() > 0.05) p.face = Math.atan2(move.x, move.z);
	let speed = tune.speed;
	if (p.roll > 0) {
		p.roll -= dt;
		move = p.rollDir.clone();
		speed = 12;
	}
	if (S.stage === 4) {
		if (inputType === "touch" && !p.gliding) useTool(p);
		const wind = p.gliding ? Math.sin(S.time * 0.7) * 0.6 : 0;
		move.x += wind * 0.2;
		p.vy = p.gliding ? -1.9 : Math.max(-16, p.vy - tune.gravity * dt);
		if (p.pos.y < 5 && !p.gliding && settings.assist) {
			useTool(p);
			toast("PARACHUTE ASSIST · Steer to the gold circle");
		}
	} else p.vy = Math.max(-22, p.vy - tune.gravity * dt);
	if (debug.noclip) {
		p.pos.x += move.x * speed * dt;
		p.pos.z += move.z * speed * dt;
		p.pos.y = S.stage === 4 ? p.pos.y + p.vy * dt : 0;
		p.floor = true;
		p.body.setNextKinematicTranslation({
			x: p.pos.x,
			y: p.pos.y + 0.92,
			z: p.pos.z,
		});
	} else {
		p.controller.computeColliderMovement(
			p.collider,
			{ x: move.x * speed * dt, y: p.vy * dt, z: move.z * speed * dt },
			RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
			undefined,
			(c) =>
				!S.players.some((q) => q.collider && q.collider.handle === c.handle),
		);
		const m = p.controller.computedMovement();
		p.pos.x += m.x;
		p.pos.y += m.y;
		p.pos.z += m.z;
		p.floor = p.controller.computedGrounded();
		if (p.floor) p.vy = 0;
		p.body.setNextKinematicTranslation({
			x: p.pos.x,
			y: p.pos.y + 0.92,
			z: p.pos.z,
		});
	}
	if (p.pos.y < -10) {
		if (S.stage === 4) {
			p.hp = Math.max(1, p.hp - 1);
			respawn(p);
		} else {
			damagePlayer(p, 2, "fall");
			p.pos = { ...p.checkpoint };
			p.body.setTranslation(
				{ x: p.pos.x, y: p.pos.y + 0.92, z: p.pos.z },
				true,
			);
			p.vy = 0;
			toast("WHIP RECOVERY · Watch the edge.");
		}
	}
	if (S.stage === 4 && p.floor && p.pos.y < 1) {
		if (dist(p.pos, { x: 7, z: -5 }) < 5.2) {
			if (S.selectedMesa === S.target) {
				audio.fx("chime");
				advanceStage(5);
				return;
			} else {
				S.coins += 3;
				S.secrets++;
				advanceStage(3);
				say(
					"EXPLORER",
					"An empty tomb. Three coins. I shall call it research.",
				);
				return;
			}
		}
	}
	if (p.roll > 0) animateActor(p, "roll");
	else if (p.dig > 0) animateActor(p, "dig");
	else if (S.stage === 4 || p.swing) animateActor(p, "glide");
	else if (p.flute > 5.4) animateActor(p, "flute");
	else if (p.attackCd > 0.14) animateActor(p, "whip");
	else animateActor(p, move.lengthSq() > 0.04 ? "walk" : "idle");
	if (
		inputType === "touch" &&
		p.id === localId &&
		settings.assist &&
		S.stage !== 4
	) {
		const enemy = S.enemies.find(
			(e) => !e.dead && dist(e.pos, p.pos) < tune.reach - 0.3,
		);
		if (enemy) {
			if (enemy.kind === "snake" && S.flags.flute && p.toolCd <= 0) useTool(p);
			else attack(p);
		}
	}
}
function updatePickups(dt) {
	for (const item of S.pickups) {
		if (!item.active) {
			item.mesh.visible = false;
			continue;
		}
		if (item.kind === "crate") continue;
		if (item.kind === "coin" || item.kind === "heart") {
			item.mesh.position.y =
				(item.y || 0.8) + Math.sin(S.time * 3 + (item.phase || 0)) * 0.12;
			item.mesh.rotation.z += dt * 1.7;
		}
		for (const p of S.players) {
			if (p.down) continue;
			const match =
				item.kind === "airring"
					? Math.hypot(p.pos.x - item.x, p.pos.y - item.y, p.pos.z - item.z) <
						2.4
					: dist(p.pos, item) < 1.15 && Math.abs(p.pos.y - (item.y || 0)) < 1.8;
			if (match) {
				item.active = false;
				item.mesh.visible = false;
				if (item.kind === "heart") {
					p.hp = Math.min(6, p.hp + 2);
					audio.fx("chime");
					toast("A LITTLE SECOND WIND");
				} else {
					S.coins += item.value || 1;
					audio.fx("coin");
					if (item.kind === "airring") {
						S.secrets++;
						toast("GOLD RING · +2 coins");
					}
				}
				logEvent("pickup", { kind: item.kind });
				break;
			}
		}
	}
}
function stepWorld(dt) {
	if (!gameRunning() || hubEnded) return;
	const revision = S.revision;
	S.time += dt;
	S.elapsed += dt;
	interactCooldown = Math.max(0, interactCooldown - dt);
	const local = localPlayer();
	for (const p of S.players) {
		let input =
			p.id === localId ? latestInput : remoteInputs.get(p.id) || { x: 0, z: 0 };
		if (S.attract && p.id === localId) input = attractInput(dt);
		if (S.time - (p.lastInput || 0) > 0.5 && p.id !== localId)
			input = { x: 0, z: 0 };
		stepPlayer(p, input, dt);
		if (S.revision !== revision) return;
		if (p.id !== localId && remoteInputs.has(p.id)) {
			const inp = remoteInputs.get(p.id);
			inp.attack = false;
			inp.interact = false;
			inp.dodge = false;
			inp.tool = false;
		}
	}
	for (const e of S.enemies) updateEnemy(e, dt);
	updatePickups(dt);
	for (let i = S.projectiles.length - 1; i >= 0; i--) {
		const a = S.projectiles[i];
		a.x += a.vx * dt;
		a.z += a.vz * dt;
		a.life -= dt;
		a.mesh.position.set(a.x, a.y, a.z);
		for (const p of S.players)
			if (Math.hypot(a.x - p.pos.x, a.z - p.pos.z) < 0.6 && p.pos.y < 1.2) {
				damagePlayer(p, 1, "dart");
				a.life = 0;
			}
		if (a.x > 20 || a.life <= 0) {
			level.remove(a.mesh);
			a.mesh.geometry.dispose();
			S.projectiles.splice(i, 1);
		}
	}
	for (const d of S.dynamic) {
		if (d.kind === "trap" && !debug.freeze) {
			d.timer -= dt;
			if (d.timer <= 0) {
				for (let i = 0; i < 3; i++) fireDart(d.x, d.z + (i - 1) * 0.42);
				d.timer = d.period;
			}
		} else if (d.kind === "boulder") {
			S.escape -= 3.75 * dt;
			d.mesh.position.z = S.escape;
			d.mesh.rotation.x -= dt * 1.6;
			for (const p of S.players)
				if (
					Math.abs(p.pos.z - S.escape) < 3 &&
					Math.abs(p.pos.x) < 5 &&
					p.pos.y < 2
				) {
					damagePlayer(p, 3, "boulder");
					p.pos.z -= 4;
					p.body.setTranslation(
						{ x: p.pos.x, y: p.pos.y + 0.92, z: p.pos.z },
						true,
					);
				}
			const alive = S.players.filter((p) => p.down <= 0);
			if (
				alive.length &&
				S.escape < Math.min(...alive.map((p) => p.pos.z)) - 6
			) {
				S.escape = 20;
				for (const p of S.players) respawn(p);
			}
		} else if (d.kind === "collapse") {
			d.timer -= dt;
			if (d.timer <= 0) {
				const p = local || S.players[0];
				if (p) {
					particleBurst(p.pos.x + 4, 5, p.pos.z - 3, "rock", 6, true);
					if (Math.random() < 0.4) shake = 0.14;
				}
				d.timer = 2.3;
			}
		}
	}
	world.timestep = dt;
	world.step();
	metrics.physicsSteps++;
	latestInput.attack = false;
	latestInput.interact = false;
	latestInput.dodge = false;
	latestInput.tool = false;
}
function visuals(dt) {
	for (const p of S.players) {
		const v = p.visual;
		if (!v) continue;
		if (!hostAuthority() && p.netTarget) {
			p.pos.x = lerp(p.pos.x, p.netTarget.x, Math.min(1, dt * 18));
			p.pos.y = lerp(p.pos.y, p.netTarget.y, Math.min(1, dt * 18));
			p.pos.z = lerp(p.pos.z, p.netTarget.z, Math.min(1, dt * 18));
		}
		v.mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
		v.mesh.rotation.y = p.face;
		v.mesh.visible = p.invuln < 1 || Math.sin(S.time * 24) > -0.5 || p.down > 0;
		v.rig.rotation.z = p.down > 0 ? PI / 2 : 0;
		v.canopy.visible = p.gliding && S.stage === 4;
		v.shadow.visible = p.pos.y < 1;
		v.mixer.update(dt);
		v.actions.walk.timeScale = tune.speed / 5.2;
	}
	for (const e of S.enemies)
		if (!e.dead && e.kind !== "snake") e.visual.mixer.update(dt);
	for (const d of S.dynamic) {
		if (d.kind === "flame") {
			const scale = 0.85 + Math.sin(renderTime * 11 + d.phase) * 0.15;
			d.mesh.scale.set(
				scale,
				1 + Math.sin(renderTime * 9 + d.phase) * 0.18,
				scale,
			);
		} else if (d.kind === "marker") {
			d.mesh.visible = debug.waypoints && S.mode !== "title";
			d.mesh.position.y = d.base + Math.sin(renderTime * 2 + d.phase) * 0.15;
			d.mesh.rotation.y = renderTime;
		} else if (d.kind === "dust")
			d.mesh.position.x = Math.sin(renderTime * 0.05) * 3;
		else if (d.kind === "npc") {
			d.visual.mixer.update(dt);
			d.mesh.rotation.y = Math.sin(renderTime * 0.2) * 0.3 - 1;
		} else if (d.kind === "mapMesa") {
			const active = S.flags.mapped && S.target === d.index;
			d.mesh.material = mat(active ? "gold" : "rock");
			d.mesh.position.y = active ? 1.5 + Math.sin(renderTime * 2) * 0.1 : 1.4;
		} else if (d.kind === "staff")
			d.mesh.visible = S.flags.templeSolved && !S.flags.staff;
		else if (d.kind === "placedStaff") d.mesh.visible = !!S.flags.staffPlaced;
		else if (d.kind === "seal")
			d.mesh.material.opacity =
				S.seals.includes(d.index) || S.flags.templeSolved ? 1 : 0.65;
		else if (d.kind === "relic") {
			d.mesh.visible = !!S.flags.excavated && !S.flags.relic;
			d.mesh.rotation.y = Math.sin(renderTime * 0.3) * 0.05;
		} else if (d.kind === "bird") {
			d.mesh.position.set(
				Math.cos(renderTime * 0.4) * 13,
				9,
				Math.sin(renderTime * 0.4) * 10,
			);
			d.mesh.rotation.y = -renderTime * 0.4;
		} else if (d.kind === "plane") d.mixer.update(dt);
	}
	for (const i of S.interacts)
		if (i.marker)
			i.marker.visible =
				debug.waypoints &&
				S.mode !== "title" &&
				i.enabled &&
				(!i.can || i.can());
	for (let j = 0; j < mirrorVisuals.length; j++)
		mirrorVisuals[j].rotation.y = lerp(
			mirrorVisuals[j].rotation.y,
			(S.mirrors[j] * PI) / 2,
			Math.min(1, dt * 8),
		);
	for (let i = S.effects.length - 1; i >= 0; i--) {
		const e = S.effects[i];
		e.life -= dt;
		if (e.kind === "spark") {
			e.velocity.y -= 12 * dt;
			e.mesh.position.addScaledVector(e.velocity, dt);
			e.mesh.rotation.x += dt * 5;
			e.mesh.scale.setScalar(clamp(e.life * 2, 0, 1));
		}
		if (e.kind === "debris" && e.body) {
			const tr = e.body.translation(),
				rot = e.body.rotation();
			e.mesh.position.set(tr.x, tr.y, tr.z);
			e.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
		}
		if (e.kind === "wave") {
			e.mesh.scale.setScalar(1 + (1 - e.life / e.max) * 4);
			e.mesh.material.opacity = e.life / e.max;
		}
		if (e.life <= 0) {
			if (e.body) world.removeRigidBody(e.body);
			level.remove(e.mesh);
			e.mesh.geometry?.dispose();
			S.effects.splice(i, 1);
		}
	}
	if (debug.colliders && world) {
		const data = world.debugRender();
		if (!colliderDebug) {
			colliderDebug = new THREE.LineSegments(
				new THREE.BufferGeometry(),
				new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
			);
			colliderDebug.renderOrder = 99;
			scene.add(colliderDebug);
		}
		colliderDebug.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(data.vertices, 3),
		);
		colliderDebug.geometry.setAttribute(
			"color",
			new THREE.BufferAttribute(data.colors, 4),
		);
		colliderDebug.visible = true;
	} else if (colliderDebug) colliderDebug.visible = false;
}
function preparePlayer(id, name, color) {
	return {
		id,
		name,
		color: color || COLORS[id % 4],
		hp: 6,
		pos: { x: 0, y: 0, z: 0 },
		face: PI,
		invuln: 2,
		roll: 0,
		rollCd: 0,
		attackCd: 0,
		toolCd: 0,
		flute: 0,
		down: 0,
		lastInput: 0,
	};
}
function newRun(saved = null) {
	if (AIHub.active && hubEnded) return;
	const names = hubInfo
		? hubInfo.players
		: standalone
			? standalone.members
			: [{ id: 0, name: "PROFESSOR FINCH", color: COLORS[0] }];
	if (standalone && isHost) standalone.started = true;
	S.players = names.map((p) => preparePlayer(p.id, p.name, p.color));
	localId = hubInfo ? hubInfo.me : standalone ? standalone.me : 0;
	S.coins = 0;
	S.kills = 0;
	S.secrets = 0;
	S.time = 0;
	S.elapsed = 0;
	S.flags = {};
	S.mirrors = [2, 3, 0];
	S.seals = [];
	S.target = Math.floor(Math.random() * 3);
	S.selectedMesa = 0;
	S.deathCount = 0;
	S.won = false;
	S.mode = "playing";
	if (saved) {
		for (const k of [
			"coins",
			"kills",
			"secrets",
			"elapsed",
			"flags",
			"mirrors",
			"seals",
			"target",
			"selectedMesa",
			"deathCount",
		])
			if (saved[k] !== undefined) S[k] = saved[k];
	}
	menu = null;
	$("modal").classList.add("hidden");
	$("title-screen").classList.add("hidden");
	$("hud").classList.remove("hidden");
	audio.resume();
	buildStage(saved?.stage || 0);
	lastActivity = performance.now();
	logEvent("new-run");
}
function checkpointData() {
	return {
		stage: S.stage,
		coins: S.coins,
		kills: S.kills,
		secrets: S.secrets,
		elapsed: S.elapsed,
		flags: { ...S.flags },
		mirrors: [...S.mirrors],
		seals: [...S.seals],
		target: S.target,
		selectedMesa: S.selectedMesa,
		deathCount: S.deathCount,
	};
}
function saveCheckpoint() {
	if (S.attract || netActive || S.mode !== "playing") return;
	try {
		localStorage.setItem(
			"lost-map-checkpoint",
			JSON.stringify(checkpointData()),
		);
	} catch {}
}
function loadCheckpoint() {
	try {
		return JSON.parse(localStorage.getItem("lost-map-checkpoint") || "null");
	} catch {
		return null;
	}
}
function winGame() {
	if (S.won) return;
	S.won = true;
	S.mode = "victory";
	audio.fx("victory");
	logEvent("victory");
	if (!netActive) {
		try {
			localStorage.removeItem("lost-map-checkpoint");
		} catch {}
	}
	if (AIHub.active && AIHub.isHost) {
		finishHub(true);
	} else showVictory();
}
function makeSnapshot() {
	return {
		kind: "world",
		seq: ++netSequence,
		stage: S.stage,
		sceneSerial: S.sceneSerial,
		time: S.time,
		elapsed: S.elapsed,
		coins: S.coins,
		kills: S.kills,
		secrets: S.secrets,
		flags: S.flags,
		target: S.target,
		selectedMesa: S.selectedMesa,
		mirrors: S.mirrors,
		seals: S.seals,
		won: S.won,
		escape: S.escape,
		players: S.players.map((p) => ({
			id: p.id,
			name: p.name,
			color: p.color,
			x: +p.pos.x.toFixed(3),
			y: +p.pos.y.toFixed(3),
			z: +p.pos.z.toFixed(3),
			face: +p.face.toFixed(3),
			hp: p.hp,
			down: p.down,
			gliding: p.gliding,
			anim: p.visual?.anim || "idle",
			flute: p.flute,
			toolCd: p.toolCd,
		})),
		enemies: S.enemies
			.filter((e) => !e.dead)
			.map((e) => ({
				id: e.id,
				kind: e.kind,
				x: +e.pos.x.toFixed(2),
				z: +e.pos.z.toFixed(2),
				hp: e.hp,
				state: e.state,
			})),
		removed: S.pickups.map((p, i) => (p.active ? -1 : i)).filter((i) => i >= 0),
	};
}
function receiveSnapshot(d) {
	if (d.seq <= lastSnapshot) return;
	lastSnapshot = d.seq;
	metrics.snapshots++;
	const rosterChanged =
		d.players.length !== S.players.length ||
		d.players.some((q) => !S.players.some((p) => p.id === q.id));
	const change =
		rosterChanged ||
		S.remoteSceneSerial !== d.sceneSerial ||
		S.stage !== d.stage ||
		["title", "lobby", "loading"].includes(S.mode);
	for (const k of [
		"time",
		"elapsed",
		"coins",
		"kills",
		"secrets",
		"target",
		"selectedMesa",
		"escape",
	])
		S[k] = d[k];
	S.flags = { ...d.flags };
	S.mirrors = [...d.mirrors];
	S.seals = [...d.seals];
	S.won = d.won;
	const ids = d.players.map((p) => p.id);
	S.players = S.players.filter((p) => ids.includes(p.id));
	for (const q of d.players)
		if (!S.players.some((p) => p.id === q.id))
			S.players.push(preparePlayer(q.id, q.name, q.color));
	if (change) buildStage(d.stage, false);
	S.remoteSceneSerial = d.sceneSerial;
	for (const q of d.players) {
		const p = S.players.find((p) => p.id === q.id);
		p.netTarget = { x: q.x, y: q.y, z: q.z };
		if (change) p.pos = { ...p.netTarget };
		p.face = q.face;
		p.hp = q.hp;
		p.down = q.down;
		p.gliding = q.gliding;
		p.flute = q.flute;
		p.toolCd = q.toolCd;
		animateActor(p, q.anim);
	}
	const alive = d.enemies.map((e) => e.id);
	for (const e of S.enemies)
		if (!alive.includes(e.id)) {
			e.dead = true;
			e.mesh.visible = false;
			if (e.danger) e.danger.visible = false;
		}
	for (const q of d.enemies) {
		let e = S.enemies.find((e) => e.id === q.id && !e.dead);
		if (!e) e = spawnEnemy(q.kind, q.x, q.z, q.id);
		e.pos.x = q.x;
		e.pos.z = q.z;
		e.hp = q.hp;
		e.state = q.state;
		e.mesh.position.set(q.x, 0, q.z);
		e.mesh.visible = true;
	}
	for (const i of d.removed)
		if (S.pickups[i]) {
			S.pickups[i].active = false;
			S.pickups[i].mesh.visible = false;
		}
	updateBeams();
	S.mode = d.won ? "victory" : "playing";
	if (d.won && menu !== "victory" && !AIHub.active) showVictory();
}
function acceptInput(d, from) {
	if (!hostAuthority() || !d || d.kind !== "input") return;
	const p = S.players.find((p) => p.id === from);
	if (!p) return;
	if (d.seq !== undefined && d.seq <= (p.lastSeq || 0)) return;
	p.lastSeq = d.seq || 0;
	const old = remoteInputs.get(from) || {};
	const input = {
		x: clamp(Number(d.x) || 0, -1, 1),
		z: clamp(Number(d.z) || 0, -1, 1),
		aim:
			d.aim && Number.isFinite(d.aim.x) && Number.isFinite(d.aim.z)
				? { x: clamp(d.aim.x, -100, 100), z: clamp(d.aim.z, -100, 100) }
				: null,
	};
	for (const a of ["attack", "interact", "dodge", "tool"])
		input[a] = !!d[a] || !!old[a];
	remoteInputs.set(from, input);
	p.lastInput = S.time;
	metrics.inputs++;
}
function finishHub(won) {
	if (!AIHub.active || !AIHub.isHost || hubEnded) return;
	const ids = S.players.map((p) => p.id);
	const scores = {};
	for (const id of ids)
		scores[id] = Math.round(
			S.stage * 100 + S.coins + S.kills * 3 + (won ? 1000 : 0),
		);
	AIHub.finish({
		standings: [ids],
		scores,
		won,
		stats: Object.fromEntries(
			ids.map((id) => [
				id,
				{
					"Rooms explored": S.stage + 1,
					"Relics recovered": S.flags.relic ? 1 : 0,
					Coins: S.coins,
				},
			]),
		),
	});
}
function networkTick(dt) {
	if (
		!netActive ||
		hubEnded ||
		!["playing", "victory"].includes(S.mode) ||
		(standalone && !standalone.started && isHost)
	)
		return;
	netTimer += dt;
	if (netTimer < 0.1) return;
	netTimer = 0;
	if (hostAuthority()) {
		const d = makeSnapshot();
		if (AIHub.active) AIHub.send(d);
		else standalone?.send(d);
	} else {
		const d = { kind: "input", seq: ++inputSeq, ...latestInput };
		if (AIHub.active) AIHub.send(d, { to: AIHub.host });
		else standalone?.send(d);
		latestInput.attack = false;
		latestInput.interact = false;
		latestInput.dodge = false;
		latestInput.tool = false;
	}
}
function attractInput(dt) {
	S.attractClock += dt;
	const t = S.attractClock,
		p = localPlayer();
	if (!p) return { x: 0, z: 0 };
	// Each postcard uses real interactions and movement; transitions keep the reel broad.
	const routes = [
		[
			[-11, 2],
			[-4, 6],
			[4, 7],
			[9, 2.7],
			[0, -9.6],
		],
		[
			[11, 8],
			[-10, -1],
			[0, -5],
			[10, -1],
			[0, -8],
			[0, -10],
		],
		[
			[0, 2.5],
			[-9, -3],
			[-9, -3],
			[2, -5],
			[2, -5],
			[10, 3],
			[10, 3],
			[-11, 8],
		],
		[
			[-10, 5],
			[-1, -2],
			[8, -6],
			[13, 5.5],
		],
		[
			[-3, 4],
			[2, 0],
			[7, -4],
		],
		[
			[-8 + S.target * 8, -2],
			[0, -6],
		],
		[
			[-3, 4],
			[3, -5],
			[-3, -13],
			[3, -21],
			[0, -28],
		],
	];
	S.flags.flute = true;
	S.flags.shovel = true;
	S.flags.chute = true;
	if (S.stage > 1) S.flags.staff = true;
	if (S.stage === 0 && S.coins < 3) S.coins = 3;
	if (S.stage === 2) {
		S.flags.staffPlaced = true;
	}
	if (S.stage === 3) S.flags.mapped = true;
	if (S.stage === 4) {
		p.gliding = true;
		p.visual.canopy.visible = true;
	}
	if (S.stage === 5) {
		S.flags.excavated = true;
		S.flags.bossAwake = true;
	}
	const route = routes[S.stage],
		goal = route[Math.min(S.attractStep, route.length - 1)];
	const d = dist(p.pos, { x: goal[0], z: goal[1] });
	if (d < 1.1 && !p.swing) {
		if (S.stage === 1) {
			if (S.attractStep === 0) S.flags.chute = true;
			if (S.attractStep === 4) S.flags.staff = true;
		}
		const priorStage = S.stage;
		interactCooldown = 0;
		interact(p);
		if (S.stage !== priorStage) return { x: 0, z: 0 };
		S.attractStep++;
	}
	// Steering is converted to screen axes to take exactly the same path as input.
	let dx = goal[0] - p.pos.x,
		dz = goal[1] - p.pos.z,
		len = Math.hypot(dx, dz) || 1;
	dx /= len;
	dz /= len;
	const out = {
		x: dx * 0.821 - dz * 0.571,
		z: dx * 0.571 + dz * 0.821,
		attack: S.stage === 5 || Math.sin(t * 4) > 0.8,
		tool: !p.toolCd,
	};
	if (
		t > 15 ||
		(S.attractStep >= route.length && t > (S.stage === 5 ? 13 : 5))
	) {
		const next = (S.stage + 1) % 7;
		S.attractStep = 0;
		S.attractClock = 0;
		if (next === 0) {
			S.won = false;
			S.flags = {};
			S.mirrors = [2, 3, 0];
			S.seals = [];
			S.target = 2;
		}
		if (next === 1) S.flags.flute = true;
		if (next === 2) {
			S.flags.staff = true;
			S.flags.chute = true;
			S.flags.templeSolved = true;
		}
		if (next === 3) S.flags.mapped = true;
		if (next === 4) S.selectedMesa = S.target;
		if (next === 6) {
			S.flags.relic = true;
			S.flags.bossDefeated = true;
		}
		buildStage(next, false);
	}
	return out;
}
function startAttract() {
	if (netActive || S.attract) return;
	S.attract = true;
	S.attractClock = 0;
	S.attractStep = 0;
	newRun();
	S.target = 2;
	S.attract = true;
	$("attract-banner").classList.remove("hidden");
	$("context").classList.add("hidden");
	logEvent("attract-start");
}
function stopAttract() {
	if (!S.attract) return;
	S.attract = false;
	$("attract-banner").classList.add("hidden");
	returnTitle();
}
