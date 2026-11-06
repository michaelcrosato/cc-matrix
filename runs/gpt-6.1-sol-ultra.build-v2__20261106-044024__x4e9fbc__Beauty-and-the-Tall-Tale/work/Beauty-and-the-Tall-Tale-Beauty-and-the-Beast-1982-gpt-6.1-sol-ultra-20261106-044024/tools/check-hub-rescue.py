"""Packaged two-client rescue through real AI Hub bridge/session traffic.

One paused parent clock drives the bridge and all native games in lockstep.
Native game loops are stopped and driven through the native 120 Hz accumulator
without drawing on every step. Every gameplay change still comes from ordinary intentions through
the production Network adapter and Simulation. No rule/config/objective mutation
or invulnerability is used.
"""

from __future__ import annotations

import functools
import http.server
import json
import pathlib
import threading
import urllib.parse

from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
IDENTITY = json.loads((DEV / "build-identity.json").read_text())


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


INSTALL_DRIVER = """options => {
  const copies = [...document.querySelectorAll('iframe')].map(f => f.contentWindow).filter(w => w.TallTaleApp);
  const authority = copies.find(w => w.TallTaleApp.state.network?.info?.isHost);
  if (!authority || copies.length !== (options.server ? 3 : 2) || copies.some(w => !w.TallTaleApp.state.network?.info || w.TallTaleApp.game._booting) || [...document.querySelectorAll('.cell__state')].some(e=>!e.textContent.startsWith('ready'))) return false;
  // Playwright runs each frame's timer queue independently. Share a single
  // test clock and update both native games in one parent's fixed-tick callback;
  // otherwise the lightweight bridge can get a second ahead of a game frame.
  window.__rescueTrace = { incidents:[], controls:[], edgePackets:[], deliveries:[], sections:[], maxClockSkew:0, lastEvent:0, ticks:0, startedAt:null, finishedAt:null };
  const sentPackets=new Map();
  for (const w of copies) {
    const app = w.TallTaleApp, net = app.state.network;
    app.game.stop();
    Object.defineProperty(w.performance, 'now', { configurable:true, value:()=>window.performance.now() });
    let heldUntil = 0, lastControl = '';
    net.options.getIntent = () => {
      w.__rescueInputReads = (w.__rescueInputReads || 0) + 1;
      const sim = authority.TallTaleApp.state.sim;
      const delayed = !net.info.isHost || net.server;
      const command = sim.botIntent(net.info.me, { latency: delayed ? (options.latency + options.jitter) / 1000 + 1 / 12 : 1 / 12 });
      if (command.jumpPressed) heldUntil = Math.max(heldUntil, window.performance.now() + 200);
      if (window.performance.now() < heldUntil) command.jump = true;
      const control = JSON.stringify(command);
      if (control !== lastControl) {
        window.__rescueTrace.controls.push({ at:performance.now(), tick:sim.tick, id:net.info.me, intent:{...command} });
        lastControl=control;
      }
      return command;
    };
    const originalSend=net.send.bind(net);
    net.send=(packet,policy)=>{
      if(packet.t==='i'&&packet.e?.length) window.__rescueTrace.edgePackets.push({at:performance.now(),id:net.info.me,n:packet.n,k:packet.k,edges:packet.e.map(e=>e.slice()),held:packet.b});
      const accepted=originalSend(packet,policy);
      if(accepted!==false&&packet.t==='i') sentPackets.set(net.info.me+':'+packet.n,{at:performance.now(),reliable:policy.reliable});
      return accepted;
    };
  }
  const hostNet=authority.TallTaleApp.state.network;
  const originalReceive=hostNet.receiveIntent.bind(hostNet);
  hostNet.receiveIntent=(packet,from)=>{
    const sent=sentPackets.get(from+':'+packet.n);
    if(sent) window.__rescueTrace.deliveries.push({id:from,n:packet.n,delay:performance.now()-sent.at,reliable:sent.reliable,tickLag:hostNet.sim.tick-packet.k});
    return originalReceive(packet,from);
  };
  window.__resetNetRng?.();
  window.__rescueDriver = window.setInterval(() => {
    const trace=window.__rescueTrace;
    if(trace.startedAt===null&&hostNet.canPlay) trace.startedAt=performance.now();
    for(const w of copies) {
      if(!w.frameElement?.isConnected) continue;
      trace.maxClockSkew=Math.max(trace.maxClockSkew,Math.abs(w.performance.now()-performance.now()));
      w.TallTaleApp.game.advance(.016, {draw:false});
    }
    trace.ticks++;
    if(hostNet.finished&&trace.finishedAt===null) trace.finishedAt=performance.now();
    const sim=authority.TallTaleApp.state.sim;
    for(const event of sim.events) {
      if(event.id<=trace.lastEvent) continue;
      if(event.type==='hit') trace.incidents.push({at:performance.now(),section:sim.section,...event,actors:sim.actors.map(a=>({id:a.id,x:a.x,z:a.z,hurt:a.hurt,power:a.power,window:a.traversal?.windowId})),windows:sim.windows.map(w=>({id:w.id,phase:w.phase,remaining:w.remaining}))});
      if(['section','checkpoint','rescue','results'].includes(event.type)) trace.sections.push({at:performance.now(),...event});
      trace.lastEvent=event.id;
    }
  }, 16);
  return true;
}"""

READ_COPIES = """() => [...document.querySelectorAll('iframe')].map(f => {
  const w = f.contentWindow, a = w.TallTaleApp, n = a?.state.network;
  if (!a || !n) return null;
  return {title:w.document.title,host:n.info?.isHost,server:n.server,diag:n.diagnostics(),tick:a.state.sim.tick,inputReads:w.__rescueInputReads || 0,
    outcome:a.state.sim.outcome(),simTime:a.state.sim.time,ledger:Object.keys(a.state.sim.ledger).sort(),
    coverage:a.state.sim.coverage,events:a.state.sim.eventSerial,invulnerable:a.state.sim.invulnerable,
    unranked:a.state.sim.unranked,audio:a.sound.stats(),errors:a.game.errors};
}).filter(Boolean)"""


def run_one_rescue(browser, base, name, options):
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    copies = []
    left = False
    try:
        # Repeatable simulated network jitter/loss; world randomness still comes
        # exclusively from the retained AIHub.rng stream in production code.
        page.add_init_script("""if (window === window.parent) {
          let seed=19;
          window.__resetNetRng=()=>{seed=19;};
          Math.random=()=>{ seed=(seed+0x6d2b79f5)>>>0; let t=Math.imul(seed^(seed>>>15),1|seed); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
        }""")
        page.clock.install(time=1_799_000_000)
        page.clock.pause_at(1_799_000_001)
        query = urllib.parse.urlencode(
            {
                "game": "/" + IDENTITY["basename"] + ".html?test=1",
                "players": "2",
                "latency": str(options["latency"]),
                "jitter": str(options["jitter"]),
                "loss": str(options["loss"]),
                "seed": "1982",
                "limit": "720",
                **({"scenario": "server"} if options.get("server") else {}),
            }
        )
        page.goto(base + f"/{DEV.name}/vendor/ai-hub/harness.html?{query}")
        installed = False
        for _ in range(100):
            page.clock.run_for(100)
            if page.evaluate(INSTALL_DRIVER, options):
                installed = True
                break
        if not installed:
            raise AssertionError("packaged copies did not initialize")
        page.locator("#release").evaluate("button => button.click()")
        for _ in range(720):
            page.clock.run_for(1000)
            copies = page.evaluate(READ_COPIES)
            host = next(c for c in copies if c["host"])
            if (
                options.get("helperLeave")
                and not left
                and host["outcome"]["section"] >= 1
            ):
                page.evaluate(
                    "document.getElementById('who').value='p1'; document.getElementById('remove').click()"
                )
                left = True
            if host["diag"]["finished"] or host["diag"]["ended"]:
                page.clock.run_for(2000)
                copies = page.evaluate(READ_COPIES)
                break
        before_end = copies
        page.clock.run_for(2000)
        copies = page.evaluate(READ_COPIES)
        for old, fresh in zip(before_end, copies, strict=True):
            if old["diag"]["sent"] != fresh["diag"]["sent"]:
                errors.append("traffic continued after Hub end")
            if old["tick"] != fresh["tick"]:
                errors.append("simulation continued after Hub end")
            if old["inputReads"] != fresh["inputReads"]:
                errors.append("gameplay input continued after Hub end")
            if not fresh["audio"]["stopped"]:
                errors.append("audio was not stopped at Hub end")
        if len(copies) != 2:
            errors.append(f"expected two remaining copies, got {len(copies)}")
        if options.get("helperLeave") and not left:
            errors.append("helper departure was not exercised")
        host = next(c for c in copies if c["host"])
        expected_ids = [0] if left else [0, 1]
        round_text = page.locator("#round").inner_text()
        log_text = page.locator("#log").inner_text()
        if "Ended played (finished)" not in round_text:
            errors.append("Hub did not commit a played team result")
        if (
            "finish " + json.dumps([expected_ids], separators=(",", ":"))
            not in log_text
        ):
            errors.append("Hub finish did not tie all present team members")
        if host["diag"]["members"] != expected_ids:
            errors.append(f"incorrect team membership: {host['diag']['members']}")
        trace = page.evaluate("window.__rescueTrace")
        clock_skew = trace["maxClockSkew"]
        if clock_skew > 0.01:
            errors.append(f"test clocks drifted by {clock_skew} ms")
        elapsed = (trace["finishedAt"] - trace["startedAt"]) / 1000
        if abs(elapsed - host["simTime"]) > 0.026:
            errors.append(
                f"test clock/simulation mismatch: {elapsed} versus {host['simTime']} seconds"
            )
        delays = [d["delay"] for d in trace["deliveries"]]
        if not delays:
            errors.append("no client intentions reached authority")
        elif max(delays) > options["latency"] + options["jitter"] + 40:
            errors.append(
                f"test driver added undeclared transport delay: {max(delays)} ms"
            )
        for c in copies:
            if c["title"] != IDENTITY["title"]:
                errors.append("incorrect packaged game identity")
            if not c["outcome"]["rescued"]:
                errors.append(f"rescue incomplete: {c['outcome']}")
            if c["host"] and c["outcome"]["phase"] != "results":
                errors.append("host finished before the plane departure")
            if c["invulnerable"] or c["unranked"]:
                errors.append("route used a cheat or nondefault balance")
            for key in ["score", "chances", "section", "rescued"]:
                if c["outcome"][key] != host["outcome"][key]:
                    errors.append(f"authoritative {key} differs across copies")
            if c["ledger"] != host["ledger"]:
                errors.append("award ledger differs across copies")
            if c["errors"]:
                errors.append(str(c["errors"]))
            if not c["diag"]["ended"]:
                errors.append("copy missed Hub end cleanup")
            if c["diag"]["maxRoutineBytes"] > 1200:
                errors.append("unreliable snapshot exceeded 1200 bytes")
            if c["server"] and (
                c["inputReads"] or not c["audio"]["silent"] or c["audio"]["activated"]
            ):
                errors.append(
                    "non-playing server consumed local input or created audio"
                )
        return {
            "name": name,
            "pass": not errors,
            "errors": errors,
            "options": options,
            "copies": copies,
            "trace": trace,
            "helperLeft": left,
            "round": page.locator("#round").inner_text(),
            "log": page.locator("#log").inner_text(),
        }
    except Exception as error:  # noqa: BLE001 - record each failed route and close its page
        return {
            "name": name,
            "pass": False,
            "errors": [str(error)],
            "copies": page.evaluate(READ_COPIES),
            "trace": page.evaluate("window.__rescueTrace || null"),
            "options": options,
        }
    finally:
        page.close()


def run_browser_rescue():
    results = []
    handler = functools.partial(QuietHandler, directory=str(DEV.parent))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                base = f"http://127.0.0.1:{server.server_port}"
                for name, options in [
                    (
                        "packaged two-client normal-intention rescue",
                        {"latency": 0, "jitter": 0, "loss": 0},
                    ),
                    (
                        "packaged two-client degraded rescue",
                        {"latency": 150, "jitter": 50, "loss": 5},
                    ),
                    (
                        "packaged degraded rescue in a fresh page",
                        {"latency": 150, "jitter": 50, "loss": 5},
                    ),
                    (
                        "packaged server-host rescue after helper leave",
                        {
                            "latency": 150,
                            "jitter": 50,
                            "loss": 5,
                            "server": True,
                            "helperLeave": True,
                        },
                    ),
                ]:
                    results.append(run_one_rescue(browser, base, name, options))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    (DEV / "artifacts" / "hub-rescue.json").write_text(json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    checks = run_browser_rescue()
    for check in checks:
        if not check["pass"]:
            print(check["name"] + ": " + "; ".join(check["errors"]))
    print(
        f"{sum(c['pass'] for c in checks)}/{len(checks)} browser rescue routes passed"
    )
    raise SystemExit(any(not c["pass"] for c in checks))
