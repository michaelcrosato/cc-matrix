((M) => {
	const safe = M.intent;
	M.validPacket = (p) =>
		p &&
		typeof p === "object" &&
		p.v === M.PROTOCOL &&
		Number.isInteger(p.round) &&
		p.round >= 0 &&
		typeof p.t === "string";
	class PeerTransport {
		constructor({ role, config, onStatus, onMessage, onOpen, stun = "" }) {
			if (globalThis.AIHub?.active)
				throw new Error("Direct connections are disabled inside AI Hub.");
			if (globalThis.isSecureContext === false)
				throw new Error(
					"Direct play needs a secure page. Open the HTML as a file, use HTTPS, or use localhost.",
				);
			if (typeof RTCPeerConnection === "undefined")
				throw new Error(
					"This browser has no direct data channels. Use couch play or AI Hub.",
				);
			this.role = role;
			this.config = config;
			this.onStatus = onStatus || (() => {});
			this.onMessage = onMessage || (() => {});
			this.onOpen = onOpen || (() => {});
			this.channels = {};
			this.cancelled = false;
			this.opened = false;
			this.round = 1;
			this.drop = 0;
			this.delay = 0;
			this.serial = 0;
			const iceServers = stun ? [{ urls: stun }] : [];
			this.pc = new RTCPeerConnection({ iceServers });
			this.pc.ondatachannel = (e) => this.attach(e.channel);
			this.pc.onconnectionstatechange = () => {
				const s = this.pc.connectionState;
				this.onStatus(s);
				clearTimeout(this.lostTimer);
				if (["failed", "closed"].includes(s) && !this.cancelled)
					this.onMessage({ t: "closed", reason: s });
				if (s === "disconnected")
					this.lostTimer = setTimeout(() => {
						if (!this.cancelled)
							this.onMessage({
								t: "closed",
								reason: "Connection did not recover within 8 seconds.",
							});
					}, 8000);
			};
			if (role === "host") {
				this.attach(this.pc.createDataChannel("rules", { ordered: true }));
				try {
					this.attach(
						this.pc.createDataChannel("state", {
							ordered: false,
							maxRetransmits: 0,
						}),
					);
				} catch {
					/* reliable channel remains a bounded fallback */
				}
			}
		}
		attach(channel) {
			this.channels[channel.label] = channel;
			channel.onopen = () => {
				if (channel.label === "rules" && !this.opened) {
					this.opened = true;
					this.onStatus("connected");
					this.onOpen();
				}
			};
			channel.onclose = () => {
				if (channel.label === "rules" && !this.cancelled)
					this.onMessage({ t: "closed", reason: "The other driver left." });
			};
			channel.onerror = () =>
				this.onStatus("Channel error; reconnect if it persists.");
			channel.onmessage = (e) => {
				if (typeof e.data !== "string" || e.data.length > 16384) return;
				let p;
				try {
					p = JSON.parse(e.data);
				} catch {
					return;
				}
				const serial = ++this.serial;
				if (
					channel.label === "state" &&
					this.drop &&
					serial % Math.round(1 / this.drop) === 0
				)
					return;
				const fn = () => {
					if (!this.cancelled) this.onMessage(p);
				};
				if (this.delay) setTimeout(fn, this.delay);
				else fn();
			};
		}
		send(packet, reliable = false) {
			const c =
				(reliable ? this.channels.rules : this.channels.state) ||
				this.channels.rules;
			if (!c || c.readyState !== "open" || c.bufferedAmount > 16000)
				return false;
			const s = JSON.stringify(packet);
			if (s.length > 16384) return false;
			try {
				c.send(s);
				return true;
			} catch {
				return false;
			}
		}
		async gathered() {
			if (this.pc.iceGatheringState === "complete") return;
			await new Promise((resolve, reject) => {
				const pc = this.pc,
					done = () => {
						clearTimeout(timer);
						pc.removeEventListener("icegatheringstatechange", changed);
						this.cancelGather = null;
					};
				const changed = () => {
					if (pc.iceGatheringState === "complete") {
						done();
						resolve();
					}
				};
				const timer = setTimeout(() => {
					done();
					reject(
						new Error(
							"ICE gathering timed out. Try again, or choose couch / AI Hub play.",
						),
					);
				}, 12000);
				this.cancelGather = () => {
					done();
					reject(new Error("Connection cancelled."));
				};
				pc.addEventListener("icegatheringstatechange", changed);
				changed();
			});
			if (this.cancelled) throw new Error("Connection cancelled.");
		}
		description() {
			return JSON.stringify({
				version: M.PROTOCOL,
				build: M.VERSION,
				type: this.pc.localDescription.type,
				sdp: this.pc.localDescription.sdp,
				config: this.config,
			});
		}
		static parse(text, expected) {
			let p;
			try {
				p = JSON.parse(text);
			} catch {
				throw new Error(
					"That invitation is incomplete. Paste the entire description.",
				);
			}
			if (
				text.length > 100000 ||
				p.version !== M.PROTOCOL ||
				p.build !== M.VERSION
			)
				throw new Error(
					"Different game build. Both drivers must open the same HTML.",
				);
			if (
				p.type !== expected ||
				typeof p.sdp !== "string" ||
				!p.sdp.startsWith("v=0") ||
				p.sdp.length < 50
			)
				throw new Error("Expected a complete " + expected + " description.");
			if (
				!p.config ||
				!Number.isInteger(p.config.course) ||
				p.config.course < 0 ||
				p.config.course >= M.COURSE_DATA.length ||
				p.config.target !== 10 ||
				JSON.stringify(p.config.cars) !== "[3,4]"
			)
				throw new Error(
					"The invitation has an incompatible competitive preset.",
				);
			return p;
		}
		async offer() {
			await this.pc.setLocalDescription(await this.pc.createOffer());
			await this.gathered();
			return this.description();
		}
		async answer(text) {
			const p = PeerTransport.parse(text, "offer");
			this.config = p.config;
			await this.pc.setRemoteDescription({ type: p.type, sdp: p.sdp });
			await this.pc.setLocalDescription(await this.pc.createAnswer());
			await this.gathered();
			return this.description();
		}
		async accept(text) {
			if (this.pc.signalingState !== "have-local-offer")
				throw new Error(
					"Reply already accepted. Cancel to create a new invitation.",
				);
			const p = PeerTransport.parse(text, "answer");
			if (JSON.stringify(p.config) !== JSON.stringify(this.config))
				throw new Error("Reply belongs to a different invitation.");
			await this.pc.setRemoteDescription({ type: p.type, sdp: p.sdp });
			this.onStatus("Connecting…");
			this.connectTimer = setTimeout(() => {
				if (!this.opened && !this.cancelled)
					this.onMessage({
						t: "closed",
						reason:
							"Connection timed out. Try a STUN service, or use couch play / AI Hub.",
					});
			}, 16000);
		}
		close() {
			this.cancelled = true;
			this.cancelGather?.();
			clearTimeout(this.connectTimer);
			clearTimeout(this.lostTimer);
			for (const c of Object.values(this.channels)) c.close();
			this.pc.close();
		}
	}
	class NetSession {
		constructor(app, { hub = null, peer = null, round = 1 }) {
			this.app = app;
			this.hub = hub;
			this.peer = peer;
			this.round = hub ? hub.round : round;
			this.isHost = hub ? hub.isHost : peer.role === "host";
			this.me = hub
				? hub.players.findIndex((p) => p.id === hub.me)
				: this.isHost
					? 0
					: 1;
			this.ended = false;
			this.finished = false;
			this.seq = 0;
			this.lastSnap = -1;
			this.inputSeq = [-1, -1];
			this.remoteInputs = [null, null];
			this.lastSend = 0;
			this.lastProgress = 0;
			this.lastEvent = 0;
			this.acc = 0;
			this.lastWall = performance.now();
			this.lastHeard = this.lastWall;
			this.roster = hub
				? hub.players.map((p) => ({ ...p }))
				: [
						{ id: 0, name: "Host", color: M.CARS[3].color },
						{ id: 1, name: "Guest", color: M.CARS[4].color },
					];
			if (hub) {
				AIHub.on("message", (p, from) => this.receive(p, from));
				AIHub.on("leave", ({ id }) => {
					this.roster = this.roster.filter((p) => p.id !== id);
					if (this.isHost && !this.ended)
						this.finish("A driver left the round.");
				});
				AIHub.on("time-up", () => {
					if (this.isHost) this.finish("Time!");
				});
				AIHub.on("end", ({ reason }) => this.end(reason));
			} else
				peer.onMessage = (p) => {
					if (p?.t === "closed") this.app.connectionLost(p.reason);
					else if (p?.t === "ready") this.app.peerReady(p);
					else if (p?.t === "start") this.app.peerStart(p);
					else this.receive(p, this.isHost ? 1 : 0);
				};
			const source = "setInterval(()=>postMessage(0),16);";
			try {
				const url = URL.createObjectURL(
					new Blob([source], { type: "application/javascript" }),
				);
				this.worker = new Worker(url);
				URL.revokeObjectURL(url);
				this.worker.onmessage = () => this.pump();
			} catch {
				this.timer = setInterval(() => this.pump(), 16);
			}
		}
		send(p, reliable = false, to) {
			if (this.ended) return false;
			p = { ...p, v: M.PROTOCOL, round: this.round };
			return this.hub
				? AIHub.send(p, { to, reliable })
				: this.peer.send(p, reliable);
		}
		receive(p, from) {
			if (this.ended || !M.validPacket(p) || p.round !== this.round) return;
			if (this.isHost && p.t === "input") {
				const i = this.hub
					? this.hub.players.findIndex((q) => q.id === from)
					: 1;
				if (
					i < 0 ||
					i === this.me ||
					!this.roster.some((q) => q.id === from) ||
					!Number.isInteger(p.seq) ||
					p.seq <= this.inputSeq[i] ||
					!p.input ||
					!["steer", "gas", "brake"].every(
						(k) =>
							typeof p.input[k] === "number" && Number.isFinite(p.input[k]),
					)
				)
					return;
				this.inputSeq[i] = p.seq;
				this.remoteInputs[i] = { intent: safe(p.input), at: performance.now() };
				this.lastHeard = performance.now();
			}
			if (
				!this.isHost &&
				p.t === "snap" &&
				from === (this.hub ? this.hub.host : 0) &&
				p.tick >= this.lastSnap
			) {
				this.lastHeard = performance.now();
				if (this.app.sim.apply(p)) {
					this.lastSnap = p.tick;
					if (this.app.sim.phase === "finished") this.app.showResults();
				}
			}
		}
		pump() {
			if (this.ended) return;
			const now = performance.now(),
				delta = Math.min((now - this.lastWall) / 1000, 0.5);
			this.lastWall = now;
			const sim = this.app.sim;
			if (!sim || this.app.playMode !== "network") return;
			if (!this.hub && now - this.lastHeard > 8000) {
				this.app.connectionLost(
					"No response from the other driver for 8 seconds. Return to multiplayer to reconnect.",
				);
				return;
			}
			const timeline = this.hub
				? AIHub.time() / 1000
				: (now - this.app.networkEpoch) / 1000;
			if (!Number.isFinite(timeline) || timeline < 0) {
				if (this.hub) sim.lock = Number.isFinite(timeline) ? -timeline : 3;
				return;
			}
			if (this.isHost && !this.finished) {
				if (this.hub && sim.phase === "countdown") {
					sim.lock = 0;
					sim.phase = "running";
					sim.emit("go");
				}
				this.acc += delta;
				while (this.acc >= M.DT && sim.phase !== "finished") {
					const inputs = sim.drivers.map((D, i) => {
						if (i === this.me) return this.app.readIntent(i);
						if (this.hub && this.hub.players.length === 1 && i === 1)
							return sim.ai(D);
						const data = this.remoteInputs[i];
						return data && now - data.at < 650
							? data.intent
							: { steer: 0, gas: 0, brake: 1 };
					});
					sim.step(inputs, M.DT, timeline);
					this.acc -= M.DT;
				}
				if (this.hub && timeline >= this.hub.limitMs / 1000)
					this.finish("Time!");
				if (sim.phase === "finished") this.finish(sim.resultReason);
			}
			if (now - this.lastSend >= 115) {
				this.lastSend = now;
				if (this.isHost) {
					if (!this.finished || !this.hub) this.send(sim.snapshot(), false);
				} else if (this.me >= 0)
					this.send(
						{
							t: "input",
							seq: ++this.seq,
							input: this.app.readIntent(this.me),
						},
						false,
						this.hub?.host,
					);
			}
			if (this.hub && this.me >= 0 && now - this.lastProgress > 1050) {
				this.lastProgress = now;
				AIHub.progress({
					score: sim.score[this.me] || 0,
					label: (sim.score[this.me] || 0) + " points",
				});
			}
		}
		finish(reason) {
			if (this.finished || this.ended || !this.isHost) return;
			this.finished = true;
			const sim = this.app.sim;
			if (sim.phase !== "finished")
				sim.finish(
					reason,
					sim.score[0] === sim.score[1]
						? null
						: sim.score[0] > sim.score[1]
							? 0
							: 1,
				);
			this.send(sim.snapshot(), true);
			if (this.hub) {
				const scores = {},
					groups = [];
				const ordered = this.roster
					.map((p) => ({
						...p,
						score:
							sim.score[this.hub.players.findIndex((q) => q.id === p.id)] || 0,
					}))
					.sort((a, b) => b.score - a.score);
				for (const p of ordered) {
					scores[p.id] = p.score;
					const last = groups.at(-1);
					if (last && last.score === p.score) last.ids.push(p.id);
					else groups.push({ score: p.score, ids: [p.id] });
				}
				AIHub.finish({ standings: groups.map((g) => g.ids), scores });
			} else this.app.showResults();
		}
		end(reason) {
			if (this.ended) return;
			this.ended = true;
			this.worker?.terminate();
			clearInterval(this.timer);
			this.app.sessionEnded(reason);
		}
		dispose() {
			this.ended = true;
			this.worker?.terminate();
			clearInterval(this.timer);
		}
	}
	M.PeerTransport = PeerTransport;
	M.NetSession = NetSession;
})(MM);
