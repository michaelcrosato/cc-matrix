/* Pure host-authoritative simulation. Renderer, input devices and transports share commands. */
(() => {
  'use strict';
  const W = globalThis.Wired;
  class Simulation {
    constructor(state) {
      this.s = state;
    }
    event(type, text = '', extra = {}) {
      const s = this.s;
      s.events.push({ id: ++s.eventSeq, type, text, t: s.time, ...extra });
      if (s.events.length > 32) s.events.shift();
      return s.eventSeq;
    }
    board(id) {
      return this.s.boards.find((b) => b.id === id);
    }
    current(b) {
      return b.components.find((c) => c.id === b.order[b.job]);
    }
    finish(won, cause) {
      const s = this.s;
      if (s.outcome) return false;
      s.proposal = null;
      for (const b of s.boards)
        if (b.hold) {
          b.hold = null;
          b.revision++;
        }
      const informed = s.evidence.every((e) => W.candidates(e).length === 1);
      const cards = {
        disposal: won ? 2000 : 0,
        fuse: won ? Math.floor(s.remaining * 4) : 0,
        clean: Math.max(0, 500 - s.errors * 80),
        inference: won && informed && s.completed < s.boards.length ? 500 : 0,
        repairs: s.completed * 200,
      };
      s.outcome = {
        won,
        cause,
        time: s.time,
        score: Object.values(cards).reduce((a, b) => a + b, 0),
        cards,
        modified: s.modified,
        assisted: s.assisted,
      };
      this.event(won ? 'win' : 'loss', cause);
      s.revision++;
      return true;
    }
    advance(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      while (seconds > 1e-7 && !this.s.outcome) {
        const dt = Math.min(seconds, 1 / 120);
        this.tick(dt);
        seconds -= dt;
      }
    }
    tick(dt) {
      const s = this.s;
      if (s.outcome) return;
      s.time += dt;
      s.remaining -= dt;
      for (const b of s.boards) {
        if (b.done) continue;
        if (b.fire) s.remaining -= dt * s.tuning.fireIntensity;
        else if (!b.hold || b.hold.tool !== 'solder')
          b.heat = Math.max(0, b.heat - s.tuning.cooling * dt);
        if (b.hold) {
          const h = b.hold,
            d = s.time - h.start;
          if (h.tool === 'solder') {
            b.heat = Math.min(
              150,
              b.heat + dt * s.tuning.heatGain * (d > s.tuning.safeMax ? 3 : 1),
            );
            if (b.heat >= 100 && !b.fire) {
              b.fire = true;
              this.event('fire', `${b.name}: Fire! Use the extinguisher.`, { board: b.id });
            }
          }
          if (h.tool === 'foam' && d >= s.tuning.extinguish) {
            b.fire = false;
            b.heat = 12;
            b.hold = null;
            b.revision++;
            this.event('foam', 'Fire out. Back to the work order.', { board: b.id });
            this.secure(b);
          } else if (d > 2.5) {
            b.hold = null;
            this.event('warning', 'Iron lifted automatically. Let the board cool.', {
              board: b.id,
            });
          }
        }
        if (b.fault && b.fault.deadline !== null && s.time >= b.fault.deadline) {
          b.fault.deadline = null;
          b.fault.penalized = true;
          s.remaining -= s.tuning.penalty;
          b.heat += 25;
          s.errors++;
          b.revision++;
          this.event(
            'penalty',
            `Recovery window missed: −${s.tuning.penalty}s. Restore the marked joint.`,
            { board: b.id },
          );
        }
      }
      if (s.remaining <= 1e-7) {
        s.remaining = 0;
        this.finish(false, 'Fuse expired');
        return;
      }
      if (s.proposal && s.time >= s.proposal.deadline) this.resolveProposal();
    }
    reject(why) {
      return { ok: false, why };
    }
    command(actor, c) {
      const s = this.s;
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || c.id.length > 100)
        return this.reject('Invalid command');
      const key = String(actor) + ':' + c.id;
      if (s.seen[key]) return { ...s.seen[key], duplicate: true };
      if (!s.seats.includes(actor)) return this.reject('Seat is not connected');
      if (s.outcome || s.remaining <= 1e-7) return this.reject('Case is over');
      if (c.caseId !== s.id) return this.reject('Case changed. Refresh the snapshot.');
      const result = this.apply(actor, c);
      if (result.ok) {
        s.seen[key] = result;
        s.revision++;
      }
      return result;
    }
    apply(actor, c) {
      const s = this.s;
      if (c.op === 'assist') {
        s.assisted = true;
        return { ok: true };
      }
      if (c.op === 'propose') {
        if (s.proposal) return this.reject('A transmission is already awaiting the crew');
        if (s.completed < (s.caseId === 'training' ? 1 : 2))
          return this.reject('Repair two boards before transmitting');
        if (
          !Array.isArray(c.digits) ||
          c.digits.length !== s.code.length ||
          c.digits.some((n) => !Number.isInteger(n) || n < 0 || n > 9)
        )
          return this.reject('Invalid code');
        s.proposal = {
          by: actor,
          digits: [...c.digits],
          eligible: [...s.seats],
          yes: [actor],
          deadline: s.time + 5,
        };
        this.event(
          'proposal',
          `Code ${c.digits.join('')} proposed. Accept or veto within five seconds.`,
        );
        if (s.seats.length === 1) this.resolveProposal();
        return { ok: true };
      }
      if (c.op === 'vote') {
        const p = s.proposal;
        if (!p || !p.eligible.includes(actor)) return this.reject('No eligible transmission');
        if (c.yes === false) {
          s.proposal = null;
          this.event('veto', 'Transmission cancelled. Keep repairing.');
        } else {
          if (!p.yes.includes(actor)) p.yes.push(actor);
          if (p.eligible.every((a) => p.yes.includes(a))) this.resolveProposal();
        }
        return { ok: true };
      }
      const b = this.board(c.board);
      if (!b) return this.reject('Unknown board');
      if (c.op === 'claim') {
        if (b.owner !== null && b.owner !== actor)
          return this.reject('A teammate owns this board. You can observe.');
        if (b.done) return this.reject('Board already secured');
        for (const other of s.boards)
          if (other.owner === actor && other !== b) {
            other.owner = null;
            other.hold = null;
            other.revision++;
          }
        b.owner = actor;
        b.revision++;
        return { ok: true, board: b.id };
      }
      if (c.op === 'release') {
        if (b.owner === actor) {
          b.hold = null;
          b.owner = null;
          b.revision++;
        }
        return { ok: true };
      }
      if (b.owner !== actor) return this.reject('Claim this board first');
      if (b.done) return this.reject('Board already secured');
      if (
        c.expected !== undefined &&
        c.expected !== b.revision &&
        c.op !== 'end' &&
        c.op !== 'cancel'
      )
        return this.reject('Board updated. Try again.');
      if (c.op === 'cancel') {
        b.hold = null;
        return { ok: true };
      }
      if (c.op === 'drop') {
        b.held = null;
        b.revision++;
        this.event('drop', 'Part returned safely to the tray.', { board: b.id });
        return { ok: true };
      }
      if (c.op === 'test') {
        const p = this.current(b),
          sp = b.stock.find((a) => a.id === c.spare) || b.stock.find((a) => a.id === b.held);
        if (!p || !sp) return this.reject('Pick a spare with pliers, then inspect to test it');
        s.remaining = Math.max(0, s.remaining - 2);
        const pass = W.matches(p, sp, b.rule);
        b.ruleKnown = true;
        b.tests.push({ part: p.id, spare: sp.id, pass });
        b.revision++;
        this.event(
          'test',
          `${pass ? 'Continuity ✓' : 'No continuity ×'} · ${b.rule.toUpperCase()} rule · −2s`,
          { board: b.id },
        );
        if (s.remaining <= 0) this.finish(false, 'Fuse expired during continuity test');
        return { ok: true, pass };
      }
      const p = b.components.find((a) => a.id === c.target),
        terminal = c.terminal === 1 ? 1 : 0;
      if (c.op === 'begin') {
        if (b.hold) return this.reject('Release the current tool first');
        if (c.tool === 'foam') {
          if (!b.fire) return this.reject('No fire on this board');
        } else if (c.tool === 'solder') {
          if (b.fire) return this.reject('Extinguish the fire first');
          if (!p) return this.reject('Aim at a joint');
          const recovery = b.fault && b.fault.component === p.id && b.fault.terminal === terminal;
          if (!recovery && (p.phase !== 'placed' || p.leads[terminal] === 2))
            return this.reject('Place a correct replacement before soldering');
        } else return this.reject('This tool does not use a hold');
        b.hold = { actor, tool: c.tool, target: p?.id, terminal, start: s.time };
        b.revision++;
        this.event('hold', '', { board: b.id, target: p?.id, tool: c.tool });
        return { ok: true };
      }
      if (c.op === 'end') {
        const h = b.hold;
        if (!h || h.actor !== actor) return this.reject('No tool held');
        b.hold = null;
        if (h.tool === 'foam') return this.reject('Hold until the fire is out');
        const duration = s.time - h.start,
          part = b.components.find((a) => a.id === h.target);
        if (b.fire) {
          b.revision++;
          return this.reject('Fire! Use the extinguisher');
        }
        if (duration < s.tuning.safeMin - 1e-6) {
          b.revision++;
          return this.reject('Joint too cold. Hold into the green band');
        }
        if (duration > s.tuning.safeMax + 1e-6) {
          b.revision++;
          this.event('warning', 'Overheld. Let the board cool, then solder in the green band.', {
            board: b.id,
          });
          return this.reject('Joint overheated');
        }
        if (b.fault && b.fault.component === part.id && b.fault.terminal === h.terminal) {
          part.leads[h.terminal] = 0;
          b.fault = null;
          this.event('recover', 'Joint restored. No further damage.', { board: b.id });
        } else {
          part.leads[h.terminal] = 2;
          this.event('solder', 'Sound joint.', {
            board: b.id,
            target: part.id,
            terminal: h.terminal,
          });
          if (part.leads.every((v) => v === 2)) {
            part.phase = 'stable';
            b.job++;
            this.event(
              'stable',
              `${part.id} tested. ${b.job < b.order.length ? 'Next: ' + b.order[b.job] : 'Board stable.'}`,
              { board: b.id, target: part.id },
            );
          }
        }
        b.revision++;
        this.secure(b);
        return { ok: true };
      }
      if (b.hold) return this.reject('Release the held tool first');
      if (c.op === 'act' && c.tool === 'grip' && c.spare) {
        const sp = b.stock.find((a) => a.id === c.spare);
        if (!sp) return this.reject('Spare unavailable');
        if (
          b.components.filter((p) => p.spare === sp.id && ['placed', 'stable'].includes(p.phase))
            .length >= (sp.qty || 1)
        )
          return this.reject('Spare already installed');
        b.held = sp.id;
        b.revision++;
        this.event('pick', `${sp.id} in pliers. Select the empty socket to place.`, {
          board: b.id,
        });
        return { ok: true };
      }
      if (!p) return this.reject('Select a component or terminal');
      const current = this.current(b);
      if (c.op === 'act' && c.tool === 'cut') {
        if (b.fire) return this.reject('Extinguish the fire first');
        if (p.id !== current?.id || p.phase !== 'attached') {
          if (p.phase === 'stable') return this.reject('Tested part protected');
          if (b.fault) return this.reject('Restore the marked joint first');
          if (p.phase !== 'attached') return this.reject('Nothing attached to cut here');
          p.leads[terminal] = 1;
          b.fault = {
            component: p.id,
            terminal,
            deadline: s.time + s.tuning.recovery,
            penalized: false,
          };
          b.revision++;
          this.event(
            'fault',
            `Wrong lead: solder ${p.id} ${terminal ? 'right' : 'left'} within ${s.tuning.recovery}s.`,
            { board: b.id, target: p.id },
          );
          return { ok: true };
        }
        if (b.fault) return this.reject('Restore the marked joint first');
        if (p.leads[terminal] === 1) return this.reject('Lead already cut');
        p.leads[terminal] = 1;
        b.revision++;
        this.event('cut', `${p.id} ${terminal ? 'right' : 'left'} lead separated.`, {
          board: b.id,
          target: p.id,
          terminal,
        });
        return { ok: true };
      }
      if (c.op === 'act' && c.tool === 'grip') {
        if (b.fire) return this.reject('Extinguish the fire first');
        if (b.fault) return this.reject('Restore the marked joint first');
        if (p.id !== current?.id) return this.reject('Follow the work order');
        if (p.phase === 'attached') {
          if (!p.leads.every((v) => v === 1))
            return this.reject('Cut both terminals before lifting');
          p.phase = 'empty';
          b.held = null;
          this.event('lift', 'Burnt component lifted into salvage.', { board: b.id, target: p.id });
          if (b.lessonFire && !b.fireLessonDone) {
            b.fireLessonDone = true;
            b.fire = true;
            b.heat = 105;
            this.event('fire', 'Hot spot! Select extinguisher and hold over the board.', {
              board: b.id,
            });
          }
        } else if (p.phase === 'empty') {
          const sp = b.stock.find((a) => a.id === b.held);
          if (!sp) return this.reject('Pick a replacement from the tray');
          p.spare = sp.id;
          b.held = null;
          if (W.matches(p, sp, b.rule)) {
            p.phase = 'placed';
            p.leads = [1, 1];
            this.event('place', 'Replacement seated. Solder both terminals.', {
              board: b.id,
              target: p.id,
            });
          } else {
            p.phase = 'wrong';
            s.errors++;
            this.event(
              'wrong',
              'Continuity failed. Lift this spare with pliers; stock is reusable.',
              { board: b.id, target: p.id },
            );
          }
        } else if (p.phase === 'wrong' || p.phase === 'placed') {
          b.held = p.spare;
          p.spare = null;
          p.phase = 'empty';
          p.leads = [1, 1];
          this.event('lift', 'Spare lifted. Return it or choose another.', {
            board: b.id,
            target: p.id,
          });
        } else return this.reject('Tested part protected');
        b.revision++;
        return { ok: true };
      }
      return this.reject('Use the right tool: cut, grip, solder, or extinguish');
    }
    secure(b) {
      if (b.done || b.fire || b.fault || b.job < b.order.length) return;
      b.done = true;
      b.hold = null;
      b.held = null;
      b.owner = null;
      b.revision++;
      const s = this.s;
      for (const [i, v] of b.reward) {
        const old = s.evidence[b.digit][i];
        if (old !== -1 && old !== v) throw Error('Contradictory evidence');
        s.evidence[b.digit][i] = v;
      }
      s.completed++;
      this.event('board', `${b.name} secured. Evidence published to digit ${b.digit + 1}.`, {
        board: b.id,
        digit: b.digit,
      });
    }
    resolveProposal() {
      const s = this.s,
        p = s.proposal;
      if (!p) return;
      const yes = p.yes.filter((a) => p.eligible.includes(a));
      if (yes.length > p.eligible.length / 2) {
        this.finish(
          p.digits.every((d, i) => d === s.code[i]),
          p.digits.every((d, i) => d === s.code[i]) ? 'Device disarmed' : 'Wrong code confirmed',
        );
      } else {
        s.proposal = null;
        this.event('veto', 'No majority. Transmission cancelled.');
      }
    }
    depart(actor) {
      const s = this.s;
      s.seats = s.seats.filter((a) => a !== actor);
      for (const b of s.boards)
        if (b.owner === actor) {
          b.owner = null;
          b.hold = null;
          b.revision++;
        }
      if (s.proposal) {
        if (s.proposal.by === actor) {
          s.proposal = null;
          this.event('veto', 'Proposer left. Transmission cancelled.');
        } else {
          s.proposal.eligible = s.proposal.eligible.filter((a) => a !== actor);
          if (s.proposal.eligible.every((a) => s.proposal.yes.includes(a))) this.resolveProposal();
        }
      }
      s.revision++;
    }
    publicState() {
      const s = W.clone(this.s);
      delete s.code;
      delete s.seen;
      for (const b of s.boards) {
        if (!b.done) delete b.reward;
      }
      return s;
    }
    instruction(b) {
      if (!b) return 'Choose a sector to repair.';
      if (b.done) return 'Board secured. Return to evidence.';
      if (b.fire) return 'FIRE · Extinguisher · Hold over the board';
      if (b.fault) {
        const f = b.fault;
        return `RESTORE ${f.component} ${f.terminal ? 'RIGHT' : 'LEFT'} · Solder the marked joint${f.deadline === null ? ' · penalty applied' : ''}`;
      }
      const p = this.current(b);
      if (!p) return 'Board stable.';
      if (p.phase === 'attached') {
        if (p.leads.every((v) => v === 1))
          return `${p.id} · Lift the freed ${p.shape.toUpperCase()} with pliers`;
        return `${p.id} · ${p.shape.toUpperCase()} / ${W.PALETTE.find((c) => c.id === p.color)?.short} · Cut ${p.leads[0] ? 'RIGHT' : p.leads[1] ? 'LEFT' : 'both'} lead${p.leads.some((v) => v === 1) ? '' : 's'}`;
      }
      if (p.phase === 'empty')
        return `${p.id} · ${b.held ? 'Place held spare in the socket' : 'Pliers: pick ' + (p.mode === 'jumper' ? 'a JUMPER' : 'a replacement from the tray')}`;
      if (p.phase === 'wrong') return `${p.id} · Wrong spare. Lift with pliers and replace.`;
      return `${p.id} · Solder ${p.leads[0] === 2 ? 'RIGHT' : p.leads[1] === 2 ? 'LEFT' : 'both'} joint${p.leads.some((v) => v === 2) ? '' : 's'} · release in green`;
    }
  }
  W.Simulation = Simulation;
})();
