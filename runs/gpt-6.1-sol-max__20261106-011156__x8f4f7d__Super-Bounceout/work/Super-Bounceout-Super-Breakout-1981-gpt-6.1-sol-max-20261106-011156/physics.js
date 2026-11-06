class BreakoutGame {
	constructor(options = {}) {
		this.config = { ...DEFAULTS, ...options.config };
		this.events = [];
		this.metrics = {
			hits: 0,
			pops: 0,
			freed: 0,
			advances: 0,
			ceiling: 0,
			stages: [],
		};
		this.invincible = false;
		this.autopilot = false;
		this.relaxed = !!options.relaxed;
		this.coop = !!options.coop;
		this.score = 0;
		this.lives = 5;
		this.stage = 0;
		this.time = 0;
		this.popCooldown = 0;
		this.popArmed = 0;
		this.uid = 0;
		this.loadStage(options.stage || 0);
	}
	emit(type, data = {}) {
		this.events.push({ type, ...data });
	}
	dispose() {
		if (this.world) this.world.free();
		if (this.queue) this.queue.free();
	}
	loadStage(index) {
		this.dispose();
		this.stage = index;
		this.world = new RAPIER.World({ x: 0, y: 0 });
		this.world.timestep = 1 / 120;
		this.queue = new RAPIER.EventQueue(true);
		this.lookup = new Map();
		this.bricks = [];
		this.balls = [];
		this.captives = [];
		this.paddles = [];
		this.destroyed = 0;
		this.small = false;
		this.advanceClock = 0;
		this.rowSerial = 12;
		this.stageTime = 0;
		this.popCooldown = 0;
		this.status = "serve";
		this.phaseWait = 0;
		for (const [x, y, w, h, name] of [
			[-10, 0, 0.3, 14, "wall"],
			[10, 0, 0.3, 14, "wall"],
			[0, 12.7, 10, 0.3, "ceiling"],
		]) {
			const c = this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(w, h)
					.setTranslation(x, y)
					.setRestitution(1)
					.setFriction(0),
			);
			this.lookup.set(c.handle, { type: name });
		}
		const dual = index === 1 || index === 2 || this.coop;
		this.addPaddle(-10.25, 0);
		if (dual) this.addPaddle(-8.95, this.coop ? 1 : 0);
		const rows =
			index === 3 ? [0, 1, 2, 3, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5, 6, 7];
		for (const r of rows)
			for (let c = 0; c < 8; c++) {
				if (
					index === 1 &&
					(r === 2 || r === 3) &&
					(c === 1 || c === 2 || c === 5 || c === 6)
				)
					continue;
				this.addBrick(c, r);
			}
		if (index === 1) {
			for (const x of [-4.4, 4.4]) {
				const captive = {
					id: ++this.uid,
					x,
					y: 8.58,
					freed: false,
					hits: 0,
					sealIds: [],
				};
				const seals = this.bricks.filter(
					(b) => Math.abs(b.x - x) < 2.2 && b.row === 4,
				);
				for (const b of seals) {
					b.seal = captive.id;
					captive.sealIds.push(b.id);
				}
				this.captives.push(captive);
			}
		}
		this.target = STAGES[index].target;
		this.emit("stage", { stage: index });
	}
	addPaddle(y, player) {
		const x = this.coop ? (player === 0 ? -3 : 3) : 0;
		const col = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(this.width / 2, 0.2)
				.setTranslation(x, y)
				.setSensor(true),
		);
		const p = { id: ++this.uid, x, y, player, col };
		this.paddles.push(p);
		this.lookup.set(col.handle, { type: "paddle", obj: p });
	}
	get width() {
		return (
			this.config.paddleWidth *
			(this.relaxed ? 1.3 : 1) *
			(this.small ? 0.5 : 1)
		);
	}
	addBrick(col, row, y = 10.6 - row * 0.72) {
		const x = (col - 3.5) * 2.2;
		const c = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(1.01, 0.28)
				.setTranslation(x, y)
				.setRestitution(1)
				.setFriction(0),
		);
		const b = {
			id: ++this.uid,
			x,
			y,
			row,
			col: c,
			color: ROW_COLORS[row % 8],
			points: [7, 7, 5, 5, 3, 3, 1, 1][row % 8],
			alive: true,
			seal: 0,
		};
		this.bricks.push(b);
		this.lookup.set(c.handle, { type: "brick", obj: b });
		return b;
	}
	addBall(x = this.paddles[0].x, y = -9.6, vx = 2.5, vy = 8.8) {
		const speed = this.config.ballSpeed * (this.relaxed ? 0.78 : 1);
		const n = Math.hypot(vx, vy) || 1;
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, y)
				.setLinvel((vx / n) * speed, (vy / n) * speed)
				.lockRotations()
				.setCcdEnabled(true)
				.setLinearDamping(0),
		);
		const col = this.world.createCollider(
			RAPIER.ColliderDesc.ball(0.19)
				.setRestitution(1)
				.setFriction(0)
				.setCollisionGroups(0x00010002)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
			body,
		);
		const b = {
			id: ++this.uid,
			body,
			col,
			speed,
			power: 0,
			lastPaddle: -100,
			alive: true,
		};
		this.balls.push(b);
		this.lookup.set(col.handle, { type: "ball", obj: b });
		return b;
	}
	serve() {
		if (this.status !== "serve") return;
		this.status = "playing";
		this.small = false;
		this.addBall(this.paddles[0].x, -9.65, 2.6 + Math.sin(this.time) * 0.9, 9);
		if (this.stage === 2) this.addBall(this.paddles[0].x + 0.5, -7.9, -3.5, 9);
		this.emit("serve");
	}
	armPop() {
		if (this.popCooldown <= 0 && this.status === "playing")
			this.popArmed = this.config.popWindow;
	}
	destroyBrick(b, ball, bonus = false) {
		if (!b?.alive) return;
		b.alive = false;
		this.lookup.delete(b.col.handle);
		this.world.removeCollider(b.col, true);
		this.destroyed++;
		const mult = Math.max(1, this.balls.filter((b) => b.alive).length);
		const value = b.points * 10 * mult * (ball?.power > 0 ? 2 : 1);
		this.score += value;
		this.metrics.hits++;
		this.emit("brick", {
			x: b.x,
			y: b.y,
			color: b.color,
			value,
			id: b.id,
			bonus,
		});
		if (b.seal) {
			const captive = this.captives.find((c) => c.id === b.seal);
			if (captive && !captive.freed) {
				captive.hits++;
				if (captive.hits >= 2) this.freeCaptive(captive);
			}
		}
		if (ball && !bonus) {
			ball.speed = Math.min(
				this.config.ballSpeed * 1.65,
				ball.speed + (b.row < 4 ? 0.15 : 0.07),
			);
			if (ball.power > 0) {
				const other = this.bricks
					.filter(
						(n) =>
							n.alive && Math.abs(n.x - b.x) < 2.3 && Math.abs(n.y - b.y) < 0.8,
					)
					.sort(
						(a, z) =>
							Math.hypot(a.x - b.x, a.y - b.y) -
							Math.hypot(z.x - b.x, z.y - b.y),
					)[0];
				if (other) this.destroyBrick(other, ball, true);
			}
		}
		if (
			this.destroyed >= this.target &&
			(this.status === "playing" || this.status === "serve")
		)
			this.completeStage();
	}
	freeCaptive(c) {
		if (c.freed) return;
		c.freed = true;
		this.addBall(c.x, c.y, c.x > 0 ? -2.6 : 2.6, -8);
		this.metrics.freed++;
		this.emit("free", { x: c.x, y: c.y });
	}
	completeStage() {
		if (this.status === "stage-clear" || this.status === "won") return;
		this.metrics.stages.push(this.stage);
		this.score += this.lives * 100;
		this.status = this.stage === 3 ? "won" : "stage-clear";
		this.emit(this.status, { stage: this.stage });
	}
	nextStage() {
		if (this.stage < 3) {
			this.lives = Math.min(7, this.lives + 1);
			this.loadStage(this.stage + 1);
		}
	}
	removeBall(b) {
		if (!b.alive) return;
		b.alive = false;
		this.lookup.delete(b.col.handle);
		this.world.removeRigidBody(b.body);
	}
	loseServe() {
		if (this.invincible || this.autopilot) {
			this.status = "serve";
			this.small = false;
			return;
		}
		this.lives--;
		this.small = false;
		this.popArmed = 0;
		this.status = this.lives <= 0 ? "lost" : "serve";
		this.emit(this.status === "lost" ? "lost" : "miss");
	}
	advance() {
		this.metrics.advances++;
		let danger = false;
		for (const b of this.bricks)
			if (b.alive) {
				b.y -= 0.72;
				if (b.y < -7.8) {
					b.alive = false;
					this.lookup.delete(b.col.handle);
					this.world.removeCollider(b.col, true);
					danger = true;
				} else b.col.setTranslation({ x: b.x, y: b.y });
			}
		const r = this.rowSerial++;
		if (r % 8 < 4) for (let c = 0; c < 8; c++) this.addBrick(c, r, 10.6);
		if (danger && !this.invincible && !this.autopilot) {
			for (const b of this.balls) this.removeBall(b);
			this.loseServe();
		}
		this.emit("advance", { danger });
	}
	autopilotInput() {
		const live = this.balls.filter((b) => b.alive);
		const soon =
			live
				.filter((b) => b.body.linvel().y < 0)
				.sort(
					(a, b) =>
						(a.body.translation().y + 9.7) / -a.body.linvel().y -
						(b.body.translation().y + 9.7) / -b.body.linvel().y,
				)[0] || live[0];
		if (!soon)
			return {
				targets: [Math.sin(this.time) * 4, Math.sin(this.time) * 4],
				pop: false,
			};
		const pos = soon.body.translation(),
			vel = soon.body.linvel();
		let x = pos.x;
		if (vel.y < 0) {
			x += vel.x * Math.max(0, (pos.y + 9.8) / -vel.y);
			const bound = 9.49;
			while (x > bound || x < -bound) {
				if (x > bound) x = 2 * bound - x;
				if (x < -bound) x = -2 * bound - x;
			}
		}
		const aim = Math.sin(this.time * 1.73) * this.width * 0.25;
		return { targets: [x + aim, x + aim], pop: pos.y < -7.7 && vel.y < 0 };
	}
	tick(dt, input = {}) {
		if (!["playing", "serve"].includes(this.status)) return;
		dt = Math.min(dt, 1 / 30);
		this.time += dt;
		if (this.status === "playing") this.stageTime += dt;
		this.popCooldown = Math.max(0, this.popCooldown - dt);
		this.popArmed = Math.max(0, this.popArmed - dt);
		if (this.autopilot) {
			input = this.autopilotInput();
			if (this.status === "serve") this.serve();
		}
		if (input.pop) this.armPop();
		const width = this.width;
		for (const p of this.paddles) {
			const axis = input.axes?.[p.player] || 0;
			const target = input.targets?.[p.player];
			const desired =
				typeof target === "number"
					? target
					: p.x + axis * this.config.paddleSpeed * dt;
			p.x = clamp(desired, -9.6 + width / 2, 9.6 - width / 2);
			p.col.setHalfExtents({ x: width / 2, y: 0.2 });
			p.col.setTranslation({ x: p.x, y: p.y });
		}
		if (this.status !== "playing") return;
		if (this.stage === 3) {
			this.advanceClock += dt;
			const interval =
				this.config.advanceSeconds * Math.max(0.55, 1 - this.destroyed / 160);
			if (this.advanceClock >= interval) {
				this.advanceClock = 0;
				this.advance();
			}
		}
		// Rapier's fixed 120 Hz steps own all contacts, including CCD on the balls.
		const steps = Math.max(1, Math.round(dt * 120));
		this.world.timestep = dt / steps;
		for (let s = 0; s < steps; s++) {
			this.world.step(this.queue);
			const collisions = [];
			this.queue.drainCollisionEvents((a, b, started) => {
				if (started) collisions.push([this.lookup.get(a), this.lookup.get(b)]);
			});
			for (const [a, b] of collisions) {
				const ball =
					a?.type === "ball" ? a.obj : b?.type === "ball" ? b.obj : null;
				const other = a?.type === "ball" ? b : a;
				if (!ball?.alive || !other) continue;
				if (other.type === "brick") this.destroyBrick(other.obj, ball);
				if (other.type === "wall")
					this.emit("wall", {
						x: ball.body.translation().x,
						y: ball.body.translation().y,
					});
				if (
					other.type === "ceiling" &&
					!this.small &&
					!this.relaxed &&
					this.stage !== 3
				) {
					this.small = true;
					this.metrics.ceiling++;
					this.emit("shrink");
				}
				if (other.type === "paddle" && this.time - ball.lastPaddle > 0.09) {
					const p = other.obj,
						pos = ball.body.translation();
					if (pos.y < p.y || ball.body.linvel().y >= 0) continue;
					let offset = clamp((pos.x - p.x) / (width / 2), -0.95, 0.95);
					const pop = this.popArmed > 0 && this.popCooldown <= 0;
					if (pop) {
						this.popArmed = 0;
						this.popCooldown = 3;
						ball.power = 2.4;
						this.metrics.pops++;
						const remaining = this.bricks.filter((b) => b.alive);
						if (remaining.length <= 8) {
							const target = remaining.sort(
								(a, b) =>
									Math.hypot(a.x - pos.x, a.y - pos.y) -
									Math.hypot(b.x - pos.x, b.y - pos.y),
							)[0];
							if (target)
								offset = clamp(
									Math.atan2(target.x - pos.x, target.y - pos.y) / 1.12,
									-0.95,
									0.95,
								);
						}
					}
					const angle = offset * 1.12;
					ball.speed = Math.min(
						this.config.ballSpeed * 1.65,
						ball.speed + 0.08,
					);
					ball.body.setLinvel(
						{
							x: Math.sin(angle) * ball.speed,
							y: Math.cos(angle) * ball.speed,
						},
						true,
					);
					ball.body.setTranslation({ x: pos.x, y: p.y + 0.405 }, true);
					ball.lastPaddle = this.time;
					this.emit("paddle", { x: pos.x, y: p.y, pop, player: p.player });
				}
			}
		}
		for (const b of this.balls)
			if (b.alive) {
				b.power = Math.max(0, b.power - dt);
				const p = b.body.translation();
				if (p.y < -13.4) {
					this.removeBall(b);
					continue;
				}
				const v = b.body.linvel();
				let vx = v.x,
					vy = v.y;
				if (Math.abs(vy) < b.speed * 0.27)
					vy = (vy >= 0 ? 1 : -1) * b.speed * 0.27;
				const speed = b.speed * (b.power > 0 ? 1.12 : 1);
				const n = Math.hypot(vx, vy) || 1;
				b.body.setLinvel({ x: (vx / n) * speed, y: (vy / n) * speed }, true);
			}
		if (!this.balls.some((b) => b.alive) && this.status === "playing")
			this.loseServe();
		if (this.stageTime > 1 && !Number.isFinite(this.score))
			throw new Error("Invalid score");
	}
	snapshot() {
		return {
			stage: this.stage,
			status: this.status,
			score: this.score,
			lives: this.lives,
			destroyed: this.destroyed,
			target: this.target,
			small: this.small,
			time: this.time,
			popCooldown: this.popCooldown,
			popArmed: this.popArmed,
			paddles: this.paddles.map((p) => ({ x: p.x, y: p.y, player: p.player })),
			balls: this.balls
				.filter((b) => b.alive)
				.map((b) => ({
					id: b.id,
					...b.body.translation(),
					vx: b.body.linvel().x,
					vy: b.body.linvel().y,
					power: b.power,
				})),
			captives: this.captives.map((c) => ({ ...c })),
			metrics: { ...this.metrics },
			config: { ...this.config },
		};
	}
}
