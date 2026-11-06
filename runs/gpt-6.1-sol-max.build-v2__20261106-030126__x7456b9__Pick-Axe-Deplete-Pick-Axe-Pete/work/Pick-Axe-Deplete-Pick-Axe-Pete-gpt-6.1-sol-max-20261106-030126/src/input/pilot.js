/* A cautious prospecting pilot. It reads the same visible world as a human and
   produces only canonical controls; it never writes simulation state. */
(() => {
  const P = globalThis.PD;
  class Pilot {
    constructor(route = 0) {
      this.route = route;
      this.nextJump = 0;
      this.nextInteract = 0;
      this.nextRedirect = 0;
      this.nextManualRedirect = 0;
      this.redirectPlan = null;
      this.redirectSeen = new Set();
      this.target = null;
    }
    steer(m, p, target, input) {
      const b = p.body,
        top = m.room.def.tiers - 1;
      const goal = Math.max(0, Math.min(top, target.tier ?? Math.floor((target.z - 16) / 48)));
      // The feet's tier matters. Rounding while jumping made the pilot think a
      // gap jump had reached the upper floor and reverse back toward a ladder.
      const tier = Math.max(0, Math.min(top, Math.floor((b.z - 13) / 48)));
      if (b.climbing) {
        if (Math.abs(b.z - P.floorZ(goal)) < 2.5 && Math.abs(target.x - b.x) > 8) {
          input.x = Math.sign(target.x - b.x);
          input.jump = input.jumpPressed = true;
          this.nextJump = m.tick + 60;
          return input;
        }
        const ladder = m.room.ladders.find(
          (l) => Math.abs(l.x - b.x) < 9 && b.z >= l.from - 3 && b.z <= l.to + 2,
        );
        input.up = ladder ? P.floorZ(goal) >= ladder.to : target.z > b.z + 12;
        input.down = !input.up;
        return input;
      }
      if (tier < goal) {
        const ls = m.room.ladders.filter(
          (l) =>
            Math.abs(l.from - P.floorZ(tier)) < 2 &&
            ['usable', 'warning'].includes(l.state) &&
            (!l.temporary || l.timer > 4),
        );
        const l = ls.sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
        if (l) {
          input.x = Math.abs(l.x - b.x) < 5 ? 0 : Math.sign(l.x - b.x);
          input.up = Math.abs(l.x - b.x) < 12;
        }
      } else if (tier > goal) {
        const ls = m.room.ladders.filter(
          (l) => Math.abs(l.to - P.floorZ(tier)) < 2 && ['usable', 'warning'].includes(l.state),
        );
        const l = ls.sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
        if (l) {
          input.x = Math.abs(l.x - b.x) < 5 ? 0 : Math.sign(l.x - b.x);
          input.down = Math.abs(l.x - b.x) < 10;
        }
      } else input.x = Math.abs(target.x - b.x) < (target.radius || 5) ? 0 : Math.sign(target.x - b.x);
      const floor = m.room.level.groundBelow(b.x + input.x * 14, b.z + 2);
      if (input.x && b.onGround && floor !== null && floor < b.z - 10 && m.tick > this.nextJump) {
        input.jump = input.jumpPressed = true;
        this.nextJump = m.tick + 65;
      }
      if (b.air && b.vz > 0 && m.tick < this.nextJump - 20) input.jump = true;
      return input;
    }
    forecast(m, r, time) {
      let x = r.x,
        z = r.z,
        vz = r.vz,
        vx = r.vx;
      for (let t = 0; t < time; t += 1 / 60) {
        const dt = Math.min(1 / 60, time - t),
          old = z;
        x += vx * dt;
        vz -= 400 * dt;
        z += vz * dt;
        if (x < 24 + r.r) {
          x = 24 + r.r;
          vx = Math.abs(vx);
        }
        if (x > 392 - r.r) {
          x = 392 - r.r;
          vx = -Math.abs(vx);
        }
        const floor = m.room.level.groundBelow(x, old - r.r + 2);
        if (floor !== null && vz < 0 && z - r.r <= floor && old - r.r >= floor - 3) {
          z = floor + r.r + 0.1;
          vz = r.kind === 'hopper' ? 150 : r.kind === 'heavy' ? 35 : 42;
        }
      }
      return { x, z, vz, vx };
    }
    manualRedirect(m, p, input) {
      const b = p.body;
      if (!(m.networkReadOnly || m.networkSession) || P.ROUTES[this.route]?.family !== 'ore') return;
      const needLow = m.stats.low === 0,
        needHigh = m.stats.high === 0;
      if (!needLow && !needHigh) {
        this.redirectPlan = null;
        return;
      }
      if (this.redirectPlan && this.redirectPlan.epoch !== m.epoch) this.redirectPlan = null;
      const plan = this.redirectPlan;
      if (
        plan &&
        (m.tick > plan.until ||
          (plan.aim < 0 ? m.stats.low : m.stats.high) > plan.before ||
          m.rocks.some(
            (r) =>
              r.redirect === plan.primary && Math.abs(r.x - plan.x) < 200 && Math.abs(r.z - plan.z) < 100,
          ))
      ) {
        this.redirectSeen.add(plan.id);
        this.redirectPlan = null;
      }
      if (!this.redirectPlan && !b.climbing && b.onGround) {
        const cue = m.warnings.find(
          (w) =>
            w.type === 'door' &&
            !this.redirectSeen.has(w.id) &&
            w.t < 1.1 &&
            Math.abs(w.z - b.z - 12) < 22 &&
            Math.abs(w.x - b.x) < 160,
        );
        if (cue) {
          const primary = m.players
            .filter((q) => !q.down && q.tool > 0 && Math.abs(q.body.z - b.z) < 18)
            .sort((a, c) => Math.abs(a.body.x - cue.x) - Math.abs(c.body.x - cue.x))[0];
          if (primary)
            this.redirectPlan = {
              id: cue.id,
              epoch: m.epoch,
              until: m.tick + 276,
              x: cue.x,
              z: cue.z,
              primary: primary.id,
              aim: needLow ? -1 : 1,
              before: needLow ? m.stats.low : m.stats.high,
            };
        }
      }
      const active = this.redirectPlan;
      if (!active) return;
      // Reserve a soft-ore lane for the timed action. Releasing Chop early
      // lets the chosen rock survive until Q reaches the authority.
      const primary = m.players.find((q) => q.id === active.primary);
      if (active.primary !== p.id) {
        if (primary && Math.abs(primary.body.x - b.x) < 44) input.chop = false;
        return false;
      }
      if (p.tool <= 0) return false;
      input.chop = false;
      input.redirect = false;
      input.x = 0;
      input.up = input.down = input.jump = input.jumpPressed = false;
      input.face = Math.sign(active.x - b.x) || b.facing;
      input.aim = active.aim;
      const cue = m.warnings.find((w) => w.id === active.id);
      const lead = m.networkReadOnly ? Math.min(0.5, m.networkInputLead || 0.3) : 0;
      const incoming = m.rocks
        .filter(
          (r) => !r.dead && r.redirect === null && Math.abs(r.z - b.z - 14) < 38 && (r.x - b.x) * r.vx < 0,
        )
        .sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
      const at = incoming ? this.forecast(m, incoming, lead + 0.045) : null;
      const inArc =
        at &&
        Math.abs(at.x - b.x) < 29 + incoming.r &&
        at.z + incoming.r > b.z + 2 &&
        at.z - incoming.r < b.z + 35;
      if ((inArc || (cue && cue.t < lead + 0.1)) && m.tick >= this.nextManualRedirect) {
        input.redirect = true;
        this.nextManualRedirect = m.tick + 48;
      }
      return true;
    }

    intent(m, p = m.players[0]) {
      const input = P.neutral();
      if (!p || p.down || m.status !== 'playing') return input;
      const b = p.body,
        network = !!(m.networkReadOnly || m.networkSession);
      // The first dust-settling interval is a small, safe movement rehearsal.
      // These are ordinary inputs and also exercise the escapable keyless jam.
      if (m.chamber === 0 && m.age < 4.1) {
        this.target = { kind: 'arrival rehearsal', x: 88, z: 16 };
        if (m.age < 0.4) input.x = -1;
        else if (m.age < 0.52) input.interact = input.interactPressed = true;
        else if (m.age < 1) input.x = 1;
        else if (m.age < 1.5) {
          input.jump = true;
          input.jumpPressed = b.onGround && m.age < 1.05;
        } else if (m.age < 1.9) input.down = true;
        else if (m.age < 2.7) {
          input.x = Math.abs(b.x - 88) > 4 ? Math.sign(88 - b.x) : 0;
          input.up = true;
        } else input.down = true;
        return input;
      }
      const home = {
        x: network
          ? 104 +
            Math.max(
              0,
              m.players.findIndex((q) => q.id === p.id),
            ) *
              48
          : 88,
        z: 16,
        tier: 0,
      };
      const pick =
        p.tool < (m.stats.breaks > 0 ? 3 : 1)
          ? m.pickups
              .filter((i) => i.kind === 'pick')
              .sort(
                (a, c) =>
                  Math.abs(a.x - b.x) + Math.abs(a.z - b.z) - Math.abs(c.x - b.x) - Math.abs(c.z - b.z),
              )[0]
          : null;
      const rescue = m.players.find((q) => q.down);
      if (rescue) {
        this.steer(m, p, { x: rescue.body.x, z: rescue.body.z, tier: P.tierAt(rescue.body.z) }, input);
        if (m.nearRescue(p)) input.interact = true;
      } else if (m.keyOwner !== null) {
        const d = m.room.doors[this.route];
        this.target = { kind: 'door', x: d.x, z: d.z };
        this.steer(m, p, { x: d.x, z: d.z, tier: d.tier }, input);
        if (m.nearDoor(p)?.id === d.id) {
          input.interact = true;
          // A deliberately repeated press tolerates a view arriving just before
          // the authoritative miner reaches the door's interaction range.
          if (m.tick >= this.nextInteract) {
            input.interactPressed = true;
            this.nextInteract = m.tick + 48;
          }
        }
      } else if (m.key && m.key.z < 100) {
        this.target = { kind: 'key', x: m.key.x, z: m.key.z };
        this.steer(m, p, m.key, input);
        if (Math.abs(m.key.x - b.x) < 18 && m.key.z > b.z + b.h - 4 && b.onGround && m.tick > this.nextJump) {
          input.jump = input.jumpPressed = true;
          this.nextJump = m.tick + 70;
        }
      } else if (pick) {
        this.target = { kind: 'pick', x: pick.x, z: pick.z };
        this.steer(m, p, pick, input);
      } else {
        // A high key can safely be declined. The visible director guarantees a
        // new bottom-lane opportunity; defending the intake preserves the tool.
        this.target = { kind: m.key ? 'waiting for next key' : 'ore', ...home };
        this.steer(m, p, home, input);
      }
      const ore = m.rocks
        .filter((r) => !r.dead && Math.abs(r.z - b.z - 14) < 40)
        .sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
      if (ore && p.tool > 0 && Math.abs(ore.x - b.x) < 57) {
        const facing = Math.sign(ore.x - b.x) || b.facing;
        if (network) input.face = facing;
        else if (b.facing !== facing) input.x = facing;
        input.chop = true;
        if (
          (ore.kind === 'heavy' && ore.redirect === null) ||
          (m.stats.chops % 7 === 3 && ore.redirect === null && m.stats.redirects < 3 + m.chamber * 2)
        ) {
          if (!network || m.tick >= this.nextRedirect) {
            input.redirect = true;
            this.nextRedirect = m.tick + 48;
          }
          input.aim = m.stats.redirects % 2 === 0 ? -1 : 1;
        }
      }
      // Read the mechanism before the rock exists. Nearby emitters give a
      // generous warning, so guarding the lane is ordinary proactive play.
      // A network view arrives later; begin its guard earlier and hold Chop
      // between visible hazards (misses never consume the pick).
      const warning = m.warnings.find(
        (w) =>
          w.type === 'door' &&
          Math.abs(w.z - b.z - 12) < 40 &&
          Math.abs(w.x - b.x) < 100 &&
          w.t < (m.networkReadOnly ? 0.65 : 0.08),
      );
      if (warning && p.tool > 0 && (network || m.attract)) {
        input.chop = true;
        input.face = Math.sign(warning.x - b.x) || b.facing;
      }
      if (network && p.tool > 0) input.chop = true;
      const parrying = this.manualRedirect(m, p, input);
      // Evade at the projected contact, rather than jumping too early merely
      // because a rock is within a fixed distance. High spring passes are ducked.
      const responseLead = m.networkReadOnly ? Math.min(0.5, m.networkInputLead || 0.3) : 0;
      const threats = m.rocks
        .filter((r) => !r.dead && r.grace <= 0)
        .map((r) => {
          const dx = r.x - b.x,
            speed = r.vx - (input.x ? input.x * m.tuning.moveSpeed : 0);
          const time = speed * dx < 0 ? -dx / speed : Infinity;
          return {
            r,
            time,
            at: time < 0.75 + responseLead ? this.forecast(m, r, time) : null,
          };
        })
        .filter(
          (t) => t.time >= 0 && t.time < 0.6 + responseLead && t.at && t.at.z > b.z - 5 && t.at.z < b.z + 48,
        )
        .sort((a, c) => a.time - c.time);
      const threat = threats[0];
      if (
        threat &&
        !parrying &&
        (p.tool === 0 || (network && p.hp <= (P.ROUTES[this.route]?.family === 'heavy' ? 2 : 1))) &&
        !b.climbing &&
        b.onGround
      ) {
        const height = threat.at.z - b.z;
        if (height > 23) {
          input.down = true;
          input.x = 0;
        } else if (threat.time < 0.34 + responseLead && m.tick > this.nextJump) {
          input.down = false;
          input.jump = input.jumpPressed = true;
          this.nextJump = m.tick + 53;
        }
      }
      if (b.air && b.vz > 0 && m.tick < this.nextJump - 20) input.jump = true;
      return input;
    }
  }
  P.Pilot = Pilot;
})();
