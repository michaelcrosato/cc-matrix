import hashlib
import json
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote

from playwright.sync_api import sync_playwright

D = Path(__file__).resolve().parent.parent
(D / "artifacts/runtime").mkdir(exist_ok=True)
import os

os.environ["TMPDIR"] = str(D / "artifacts/runtime")
P = json.loads((D / "project.json").read_text())
FINGERPRINT = hashlib.sha256(
    b"".join(
        (D / "src" / f"{name}.js").read_bytes()
        for name in ["config", "sim", "input", "bot", "net", "main"]
    )
    + (D / "vendor/engine/dist/handoff/my-3d2dge.js").read_bytes()
    + (D / "vendor/ai-hub/lib/hub/session.js").read_bytes()
    + Path(__file__).read_bytes()
).hexdigest()
count = 0
failures = []
evidence = {}


def check(name, ok, detail=""):
    global count
    count += 1
    if not ok:
        failures.append(name + ": " + str(detail)[:1800])


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), partial(Handler, directory=str(D.parent))
)
Thread(target=server.serve_forever, daemon=True).start()
base = "http://127.0.0.1:" + str(server.server_port)
url = (
    base
    + "/"
    + quote(D.name)
    + "/vendor/ai-hub/lib/hub/harness.html?game="
    + quote("../../../../../" + P["html"])
    + "&players=2&seed=61421&latency=35&jitter=10&loss=0&limit=850"
)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1500, "height": 950})
            errors = []
            warnings = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on(
                "console",
                lambda m: warnings.append(m.text) if m.type == "warning" else None,
            )
            page.goto(url)
            page.wait_for_function(
                'document.querySelectorAll("iframe").length===2 && [...document.querySelectorAll("iframe")].every(f=>f.contentWindow.__moon?.net)',
                timeout=30000,
            )
            identities = page.evaluate(
                '[...document.querySelectorAll("iframe")].map(f=>f.contentWindow.Moonriders.BUILD)'
            )
            check(
                "two actual Hub game copies identify correctly",
                identities == ["moonriders-20261106"] * 2,
                identities,
            )
            page.locator("#release").click()
            page.wait_for_function(
                '[...document.querySelectorAll("iframe")].every(f=>f.contentWindow.__moon.net.started && f.contentWindow.AIHub.time()>=0)',
                timeout=20000,
            )
            overlay = page.evaluate("""async()=>{
    const frames=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow),host=frames.find(w=>w.__moon.net.authority),client=frames.find(w=>!w.__moon.net.authority),a=client.__moon;
    const before=host.__moon.sim.s.tick; a.game.debug.inject({mx:1,my:0,ax:1,ay:0,fire:true,warp:true}); a.game.menu(); await new Promise(r=>setTimeout(r,650));
    const after=host.__moon.sim.s.tick,queued=host.__moon.net.intents[client.AIHub.me]?.a;
    a.dev(); const mutating=[...a.ui.root.querySelectorAll('button')].filter(b=>['Flight balance','Combat balance','Sector / checkpoint selector','Advance one fixed step'].includes(b.textContent));
    const readonly=mutating.length===4&&mutating.every(b=>b.disabled)&&!a.command('sector',3)&&a.ui.root.textContent.includes('read-only');
    a.injected={};a.ui.hide();a.game.resume();a.clearInput();return{advanced:after>before+30,neutral:queued&&!queued.fire&&!queued.warp&&queued.mx===0,readonly};
   }""")
            evidence["overlay"] = overlay
            check(
                "local Hub console suppresses only that seat while authority continues",
                overlay["advanced"] and overlay["neutral"],
                overlay,
            )
            check(
                "actual Hub developer controls are visibly read-only",
                overlay["readonly"],
                overlay,
            )
            page.evaluate("""()=>{
    const frames=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow),host=frames.find(w=>w.__moon.net.authority);
    window.__coProof={done:false,phases:[],kinds:[],rescues:[],losses:[],checkpoints:[],score:0,lastEvent:0,startedAt:performance.now()};
    const proof=window.__coProof;
    window.__coTimer=setInterval(()=>{
      const app=host.__moon,s=app.sim.s;
      const a=host.Moonriders.pilot(app.sim);
      // Each authenticated seat produces intentions; only the host advances the world.
      for(const w of frames)if(!w.__moon.ended)w.__moon.game.debug.inject(a);
      for(const e of s.events){if(e.n<=proof.lastEvent)continue;proof.lastEvent=e.n;if(e.type==='bossPhase'&&!proof.phases.includes(e.phase))proof.phases.push(e.phase);if(e.kind&&!proof.kinds.includes(e.kind))proof.kinds.push(e.kind);}
      proof.rescues=[...s.rescued];proof.losses=[...s.lost];proof.score=s.score;proof.sector=s.sector;proof.phase=s.phase;proof.elapsed=s.elapsed;proof.hull=s.ship.hull;
      if(s.outcome){proof.outcome=s.outcome;proof.done=true;proof.wallSeconds=(performance.now()-proof.startedAt)/1000;clearInterval(window.__coTimer);}
    },40);
   }""")
            # Write small progress evidence while waiting, without changing simulation state.
            deadline = time.monotonic() + 700
            while time.monotonic() < deadline:
                page.wait_for_timeout(1000)
                progress = page.evaluate("window.__coProof")
                (D / "artifacts/cooperative-progress.json").write_text(
                    json.dumps(progress, indent=2)
                )
                if progress["done"]:
                    break
            proof = page.evaluate("window.__coProof")
            evidence["pilot"] = proof
            check(
                "ordinary two-seat operation reaches terminal victory",
                proof.get("outcome") == "victory",
                proof,
            )
            page.wait_for_timeout(700)
            copies = page.evaluate(
                """[...document.querySelectorAll('iframe')].map(f=>{const a=f.contentWindow.__moon,s=a.snapshot();return{identity:f.contentWindow.Moonriders.BUILD,run:s.runId,score:s.score,rescued:s.rescued,lost:s.lost,outcome:s.outcome,debug:s.debug,invulnerable:a.sim.invulnerable,tick:s.tick,net:s.net,running:a.game._running,muted:a.game.audio.muted,engineErrors:a.game.errors.map(e=>e.message)}})"""
            )
            evidence["copies"] = copies
            evidence["warnings"] = warnings
            evidence["errors"] = errors
            check(
                "both copies share identical authoritative rescue and loss ledgers",
                copies[0]["rescued"] == copies[1]["rescued"]
                and copies[0]["lost"] == copies[1]["lost"],
                copies,
            )
            check(
                "both copies share final score and latched outcome",
                copies[0]["score"] == copies[1]["score"]
                and copies[0]["outcome"] == copies[1]["outcome"] == "victory",
                copies,
            )
            check(
                "full co-op covered every carrier phase and all hostile roles",
                proof["phases"] == ["fields", "prisoners", "core", "destroyed"]
                and all(
                    k in proof["kinds"]
                    for k in ["layer", "guard", "interceptor", "mine", "organ", "core"]
                ),
                proof,
            )
            check(
                "full co-op used no mutations or collision immunity",
                all(not c["debug"] and not c["invulnerable"] for c in copies),
                copies,
            )
            check(
                "actual network rate and message size respect protocol",
                all(
                    c["net"]["maxRate"] <= 20 and c["net"]["maxBytes"] <= 16384
                    for c in copies
                ),
                copies,
            )
            check(
                "both clients ended cleanly with no protocol or engine errors",
                all(
                    c["net"]["ended"]
                    and not c["running"]
                    and c["muted"]
                    and not c["engineErrors"]
                    for c in copies
                )
                and not errors
                and not [
                    w for w in warnings if w != "Unrecognized feature: 'pointer-lock'."
                ],
                {"copies": copies, "errors": errors, "warnings": warnings},
            )
            page.screenshot(path=str(D / "artifacts/cooperative-ending.png"))
        finally:
            browser.close()
except Exception as e:  # noqa: BLE001 - one structured integration failure record
    failures.append("two-copy cooperative run: " + str(e)[:2000])
finally:
    server.shutdown()
    server.server_close()
result = {
    "count": count,
    "failures": failures,
    "fingerprint": FINGERPRINT,
    "evidence": evidence,
}
(D / "artifacts/cooperative-results.json").write_text(json.dumps(result, indent=2))
print(json.dumps({"count": count, "failures": failures}))
