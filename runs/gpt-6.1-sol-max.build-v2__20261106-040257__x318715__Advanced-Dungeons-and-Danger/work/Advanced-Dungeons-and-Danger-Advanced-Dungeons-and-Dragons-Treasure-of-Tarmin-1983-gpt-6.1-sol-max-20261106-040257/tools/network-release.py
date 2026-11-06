"""Exact-artifact shared expedition proof. Full WebRTC route uses no gameplay mutations."""

import functools
import hashlib
import http.server
import json
import subprocess
import sys
import threading
import time
import urllib.parse
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
CONFIG = json.loads((ROOT / "build-config.json").read_text())
ARTIFACT = WORK / CONFIG["html"]
ARTIFACT_HASH = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()
FIXTURE_PATH = ROOT / "evidence" / "network-route-fixture.json"
FLAGS = [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
]
checks = []
evidence = {"artifact": CONFIG["html"], "artifactSha256": ARTIFACT_HASH}


def check(name, passed, detail=""):
    checks.append({"name": name, "pass": bool(passed), "detail": str(detail)[:2200]})


def generate_fixture():
    source = r"""
import fs from 'node:fs';
import { Model } from './src/core/model.js';
import { scriptedCoopRoute } from './tools/route.mjs';
const m = new Model({players:[{id:'0',name:'Adventurer I'},{id:'1',name:'Adventurer II'}],seed:43021,runId:'coop-release-fixture'});
const actions=[], fixtures={}, phases=[];
const project = s => {const out=structuredClone(s);delete out.clock;delete out.events;delete out.log;if(out.combat)delete out.combat.deadline;return out;};
const route=scriptedCoopRoute(m,{onAction:(player,action,result,state)=>{
 actions.push({player,action:structuredClone(action),result:structuredClone(result),expected:project(state)});
 const boss=state.entities['guardian.warden'];
 if(state.phase==='combat'&&state.combat?.enemies.includes('guardian.warden')&&boss.phase===2&&!fixtures.bossActive2)fixtures.bossActive2=structuredClone(state);
 if(state.combat?.enemies.includes('guardian.warden')&&!boss.dead&&!fixtures['boss'+boss.phase]){fixtures['boss'+boss.phase]=structuredClone(state);phases.push(boss.phase);}
 if(state.shared.bossDefeated&&!state.shared.treasureClaimed)fixtures.bossDefeated=structuredClone(state);
}});
// A separate normal-rules state with a downed adventurer and a living, distant companion.
const down=new Model({players:[{id:'0',name:'Adventurer I'},{id:'1',name:'Adventurer II'}],seed:43021,runId:'coop-release-fixture'});
for(const [dx,dy] of [[0,-1],[0,-1],[1,0],[1,0]])for(const id of ['0','1']){const r=down.command(id,{type:'move',dx,dy});if(!r.ok)throw Error(r.message);}
down.command('0',{type:'move',dx:0,dy:-1});down.command('1',{type:'move',dx:0,dy:-1});down.command('0',{type:'guard',channel:'spirit'});
let safety=0;
while(!Object.values(down.state.players).some(p=>p.down)&&down.state.phase==='combat'&&safety++<200){for(const id of ['0','1'])if(!down.state.players[id].down&&down.state.phase==='combat'){const r=down.command(id,{type:'guard',channel:id==='0'?'spirit':'war'});if(!r.ok)throw Error(r.message);}}
if(!Object.values(down.state.players).some(p=>p.down)||!Object.values(down.state.players).some(p=>!p.down))throw Error('Downed timeout fixture did not preserve a living companion.');
fixtures.downed=down.snapshot();
fs.writeFileSync('evidence/network-route-fixture.json',JSON.stringify({run:'coop-release-fixture',actions,fixtures,phases,summary:route.summary,final:route.final}));
"""
    subprocess.run(
        ["node", "--input-type=module", "-e", source],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(FIXTURE_PATH.read_text())


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def start_server():
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(WORK))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


def ready(page, url):
    page.goto(url, wait_until="load", timeout=60000)
    page.wait_for_function(
        "window.__gameReady || window.__bootError", timeout=60000, polling=25
    )
    error = page.evaluate("window.__bootError || null")
    if error:
        raise RuntimeError(error)


PROJECT = """s=>{const out=structuredClone(s);delete out.clock;delete out.events;delete out.log;if(out.combat)delete out.combat.deadline;const sort=v=>Array.isArray(v)?v.map(sort):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v);return sort(out);}"""
INSTALL_OBSERVER = (
    """()=>{window.__releaseAcks=[];const prior=__app.net.callbacks.onCommandResult;__app.net.callbacks.onCommandResult=(result,action)=>{__releaseAcks.push({result:structuredClone(result),action:structuredClone(action),at:performance.now()});prior?.(result,action);};window.__releaseProject="""
    + PROJECT
    + ";}"
)
MATCH = "expected=>JSON.stringify(__releaseProject(__app.net.state))===JSON.stringify(__releaseProject(expected))"


def equal_state(frame, expected, timeout=15000, polling=25):
    expected_text = json.dumps(expected, sort_keys=True, separators=(",", ":"))
    until = time.monotonic() + timeout / 1000
    while time.monotonic() < until:
        actual = frame.evaluate("__releaseProject(__app.net.state)")
        if json.dumps(actual, sort_keys=True, separators=(",", ":")) == expected_text:
            return
        frame.wait_for_timeout(polling)
    raise RuntimeError(
        "Authoritative gameplay projection did not agree within the synchronization deadline."
    )


def full_rtc_route(pw, fixture):
    server, thread = start_server()
    browser = pw.chromium.launch(headless=True, args=FLAGS)
    records = []
    errors = []
    try:
        contexts = [
            browser.new_context(viewport={"width": 900, "height": 600})
            for _ in range(2)
        ]
        pages = [context.new_page() for context in contexts]
        url = (
            f"http://127.0.0.1:{server.server_port}/"
            + urllib.parse.quote(CONFIG["html"])
            + "?backend=webgl"
        )
        for i, page in enumerate(pages):
            page.on("pageerror", lambda error, i=i: errors.append(f"peer {i}: {error}"))
            ready(page, url)
            page.evaluate("__app.game.stop();if(__app.attract)__app.stopAttract()")
            if page.title() != CONFIG["title"]:
                raise RuntimeError(
                    "Loopback server did not serve the intended final game."
                )
            page.get_by_role("button", name="Two adventurers", exact=True).click()
        host, guest = pages
        # The invitation codes are created and imported through the shipped setup UI.
        host.get_by_role("button", name="Host an expedition", exact=True).click()
        host.wait_for_function(
            'document.querySelector("#invite-output")?.value?.startsWith("DD1.O.")',
            timeout=20000,
            polling=25,
        )
        offer = host.locator("#invite-output").input_value()
        guest.get_by_role("button", name="Join an expedition", exact=True).click()
        guest.locator("#invite-input").fill(offer)
        guest.get_by_role("button", name="Create answer from offer", exact=True).click()
        guest.wait_for_function(
            'document.querySelector("#invite-output")?.value?.startsWith("DD1.A.")',
            timeout=20000,
            polling=25,
        )
        answer = guest.locator("#invite-output").input_value()
        host.locator("#invite-input").fill(answer)
        host.get_by_role("button", name="Connect using answer", exact=True).click()
        for page in pages:
            page.wait_for_function(
                '__app.stage==="play" && __app.net.running && __app.state',
                timeout=20000,
                polling=25,
            )
            page.evaluate(INSTALL_OBSERVER)
        check(
            "release co-op uses actual UI-exchanged WebRTC DataChannels",
            all(
                page.evaluate(
                    '__app.net.channel.readyState==="open" && __app.net.pc.connectionState==="connected"'
                )
                for page in pages
            ),
        )
        check(
            "release co-op starts two stock personal inventories",
            host.evaluate(
                "Object.keys(__app.state.players).length===2 && !__app.state.modified && !__app.state.invulnerable"
            ),
        )
        run = host.evaluate("__app.state.runId")
        actions = json.loads(
            json.dumps(fixture["actions"]).replace(fixture["run"], run)
        )
        start = time.monotonic()
        accepted = 0
        expected_denials = 0
        phase_witnesses = set()
        door_witnesses = set()
        boss_boundary = False
        for i, entry in enumerate(actions):
            actor = pages[int(entry["player"])]
            before_acks = actor.evaluate("__releaseAcks.length")
            result = actor.evaluate("action=>__app.send(action)", entry["action"])
            if int(entry["player"]) == 0 and bool(result.get("ok")) != bool(
                entry["result"].get("ok")
            ):
                raise RuntimeError(
                    f"Host action {i} differs: {entry['action']}: {result}"
                )
            try:
                actor.wait_for_function(
                    "n=>__releaseAcks.length>n",
                    arg=before_acks,
                    timeout=15000,
                    polling=25,
                )
            except Exception as exc:
                raise RuntimeError(
                    f"Action {i} player {entry['player']} ACK timeout: {entry['action']}: {exc}"
                ) from exc
            ack = actor.evaluate("__releaseAcks.at(-1)")
            if bool(ack["result"].get("ok")) != bool(entry["result"].get("ok")):
                raise RuntimeError(
                    f"Authority ACK {i} differs: player {entry['player']} {entry['action']}: {ack['result']}; expected {entry['result']}"
                )
            if ack["result"].get("ok"):
                accepted += 1
            else:
                if not entry["result"].get("full"):
                    raise RuntimeError(
                        f"Unexpected normal-route denial {i}: {ack['result']}"
                    )
                expected_denials += 1
            # Waiting for both signatures also ensures the next guest command has the current
            # host round/floor/encounter stamp. No gameplay state is edited in this route.
            try:
                equal_state(host, entry["expected"])
                equal_state(guest, entry["expected"])
            except Exception as exc:
                actual = host.evaluate("__releaseProject(__app.net.state)")
                remote = guest.evaluate("__releaseProject(__app.net.state)")
                evidence["mismatch"] = {
                    "index": i,
                    "entry": entry,
                    "host": actual,
                    "guest": remote,
                }
                differences = [
                    (k, entry["expected"].get(k), actual.get(k), remote.get(k))
                    for k in entry["expected"]
                    if entry["expected"].get(k) != actual.get(k)
                    or entry["expected"].get(k) != remote.get(k)
                ]
                raise RuntimeError(
                    f"Action {i} player {entry['player']} state mismatch: {entry['action']}; differing top-level fields {[d[0] for d in differences]}; {exc}"
                ) from exc
            boss = entry["expected"]["entities"]["guardian.warden"]
            if (
                entry["expected"].get("combat")
                and "guardian.warden" in entry["expected"]["combat"]["enemies"]
            ):
                phase_witnesses.add(boss["phase"])
                for page in pages:
                    if page.evaluate(
                        'JSON.stringify([__app.state.entities["guardian.warden"].war,__app.state.entities["guardian.warden"].spirit,__app.state.entities["guardian.warden"].phase])'
                    ) != json.dumps(
                        [boss["war"], boss["spirit"], boss["phase"]],
                        separators=(",", ":"),
                    ):
                        raise RuntimeError(
                            "Boss pools/phases disagreed across real peers."
                        )
            if (
                entry["expected"]["shared"]["bossDefeated"]
                and not entry["expected"]["shared"]["treasureClaimed"]
            ):
                boss_boundary = True
            for entity in entry["expected"]["entities"].values():
                if entity["type"] == "door" and entity.get("open"):
                    door_witnesses.add(entity["id"])
            records.append(
                {
                    "index": i,
                    "player": entry["player"],
                    "action": entry["action"],
                    "ack": ack["result"],
                    "floor": entry["expected"]["floor"],
                    "phase": entry["expected"]["phase"],
                    "rounds": entry["expected"]["stats"]["rounds"],
                }
            )
        elapsed = time.monotonic() - start
        final = host.evaluate("__app.net.model.snapshot()")
        check(
            "all cooperative route actions match authoritative ACKs",
            accepted + expected_denials == len(actions),
            f"{accepted} accepted; {expected_denials} expected full-pack comparisons; {len(actions)} actions",
        )
        check(
            "both remote first-person copies agree after every route action",
            len(records) == len(actions),
        )
        check(
            "real co-op normal route crosses all three floors and claims treasure",
            final["floor"] == 2
            and final["phase"] == "victory"
            and final["shared"]["treasureClaimed"],
        )
        check(
            "real co-op preserves distinct boss-defeated and treasure-claimed states",
            boss_boundary,
        )
        check(
            "boss War/Spirit pools and all three phases agree on both peers",
            phase_witnesses == {1, 2, 3},
            sorted(phase_witnesses),
        )
        check(
            "shared key-door openings agree through normal route",
            "upper.vaultDoor" in door_witnesses,
        )
        check(
            "full co-op route exercises both attack channels",
            final["stats"]["damageWar"] > 0 and final["stats"]["damageSpirit"] > 0,
        )
        check(
            "full co-op route exercises rest, secret and one-way gate",
            final["stats"]["rests"] > 0
            and final["stats"]["secrets"] == 1
            and final["stats"]["gates"] == 2,
            final["stats"],
        )
        check(
            "full co-op route defeats all five ordinary roles and Minotaur",
            final["stats"]["enemies"] == 8 and final["stats"]["bossPhases"] == 2,
        )
        check(
            "full co-op route never enables developer changes or invulnerability",
            not final["modified"] and not final["invulnerable"],
        )
        check(
            "full co-op route fits real fifteen-minute session cap",
            elapsed < 900 and final["clock"] < 900000,
            f"{elapsed:.2f} seconds; authority clock {final['clock']:.0f} ms",
        )
        for page in pages:
            page.evaluate("__app.game.start()")
            page.wait_for_timeout(80)
            page.evaluate("__app.game.stop()")
        check(
            "both adventurers survive full normal-rules cooperative expedition",
            all(
                p["war"] > 0 and p["spirit"] > 0 and not p["down"]
                for p in final["players"].values()
            ),
        )
        # Production sends after victory are denied, and cannot collect the quest object twice.
        before = host.evaluate("JSON.stringify(__releaseProject(__app.state))")
        denied = host.evaluate(
            '__app.send({type:"interact",target:"guardian.treasure"})'
        )
        check(
            "treasure claim is idempotent after shared victory",
            denied.get("ok") is False
            and host.evaluate("JSON.stringify(__releaseProject(__app.state))")
            == before,
        )
        diagnostics = [page.evaluate("__app.net.diagnostics()") for page in pages]
        check(
            "full-route actual traffic respects packet and message limits",
            all(
                d["traffic"]["maxBytes"] <= 16384 and d["traffic"]["maxPerSecond"] <= 20
                for d in diagnostics
            ),
            diagnostics,
        )
        check(
            "network expedition never writes solo continuation",
            all(
                page.evaluate(
                    '!__app.net.allowSoloSave && localStorage.getItem("danger-expedition-v1")===null'
                )
                for page in pages
            ),
        )
        check(
            "full cooperative route has no browser or native engine exceptions",
            not errors
            and all(page.evaluate("__app.game.errors.length===0") for page in pages),
            errors,
        )
        evidence["rtc"] = {
            "elapsedSeconds": elapsed,
            "actions": len(actions),
            "accepted": accepted,
            "expectedComparisons": expected_denials,
            "stats": final["stats"],
            "bossPhases": sorted(phase_witnesses),
            "doors": sorted(door_witnesses),
            "diagnostics": diagnostics,
            "records": records,
            "errors": errors,
        }
        for context in contexts:
            context.close()
    finally:
        browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def hub_scenarios(pw, fixture):
    server, thread = start_server()
    browser = pw.chromium.launch(headless=True, args=FLAGS)
    reports = []
    try:
        base = f"http://127.0.0.1:{server.server_port}"
        harness = "/" + ROOT.name + "/vendor/hub/harness.html"
        game = "/" + CONFIG["html"] + "?backend=webgl"
        for name in ["boss-timeout", "downed-timeout", "nonhost-leave"]:
            context = browser.new_context(viewport={"width": 1100, "height": 760})
            context.add_init_script(
                "if(parent===window){window.__releaseHubFinish=[];addEventListener('message',e=>{if(e.data?.aihub===1&&e.data.type==='finish')__releaseHubFinish.push({data:structuredClone(e.data),source:[...document.querySelectorAll('iframe')].findIndex(f=>f.contentWindow===e.source)});});}addEventListener('load',()=>{const task=setInterval(()=>{if(window.__gameReady){window.__app?.game?.stop();clearInterval(task);}},10);});"
            )
            page = context.new_page()
            page.goto(
                base
                + harness
                + "?game="
                + urllib.parse.quote(game, safe="")
                + "&players=2&limit=600",
                wait_until="load",
            )
            page.locator("#restart").click()
            page.wait_for_function(
                '(()=>{const f=[...document.querySelectorAll("iframe")];return f.length===2&&f.every(x=>x.contentWindow?.__gameReady===true)})()',
                timeout=90000,
                polling=25,
            )
            page.locator("#release").click()
            frames = page.frames[1:]
            for frame in frames:
                frame.wait_for_function(
                    "__app.net.running===true", timeout=20000, polling=25
                )
            host = next(frame for frame in frames if frame.evaluate("__app.net.isHost"))
            guest = next(
                frame for frame in frames if not frame.evaluate("__app.net.isHost")
            )
            if name in ["boss-timeout", "downed-timeout"]:
                run = host.evaluate("__app.state.runId")
                key = "bossActive2" if name == "boss-timeout" else "downed"
                snapshot = json.loads(
                    json.dumps(fixture["fixtures"][key]).replace(fixture["run"], run)
                )
                # Explicit scenario setup, separate from the mutation-free full route above:
                # load a snapshot produced solely by normal Model commands, then force Hub time-up.
                result = host.evaluate(
                    "snapshot=>{const r=__app.net.model.load(snapshot);__app.net._emit();__app.net._publish(true);return r;}",
                    snapshot,
                )
                if not result.get("ok"):
                    raise RuntimeError(
                        name + ": normal fixture rejected: " + str(result)
                    )
                if name == "boss-timeout":
                    guest.wait_for_function(
                        '__app.state?.entities["guardian.warden"].phase===2 && __app.state.combat?.enemies.includes("guardian.warden")',
                        timeout=15000,
                        polling=25,
                    )
                    check(
                        "Hub timeout scenario begins with agreeing boss phase/pools",
                        host.evaluate(
                            '[__app.state.entities["guardian.warden"].war,__app.state.entities["guardian.warden"].spirit,__app.state.entities["guardian.warden"].phase]'
                        )
                        == guest.evaluate(
                            '[__app.state.entities["guardian.warden"].war,__app.state.entities["guardian.warden"].spirit,__app.state.entities["guardian.warden"].phase]'
                        ),
                    )
                else:
                    guest.wait_for_function(
                        "Object.values(__app.state?.players||{}).some(p=>p.down) && Object.values(__app.state?.players||{}).some(p=>!p.down)",
                        timeout=15000,
                        polling=25,
                    )
                    check(
                        "Hub timeout scenario begins with one downed and one living adventurer",
                        host.evaluate(
                            "Object.values(__app.state.players).filter(p=>p.down).length===1"
                        ),
                    )
                page.locator("#timeup").click()
                for frame in frames:
                    frame.wait_for_function(
                        "__app.net.ended===true", timeout=15000, polling=25
                    )
                record = page.evaluate(
                    '({roundText:document.getElementById("round").textContent,finishes:__releaseHubFinish})'
                )
                finish = record["finishes"][-1]["data"] if record["finishes"] else {}
                check(
                    "Hub " + name + " reports honest incomplete team result",
                    "Ended played (finished)" in record["roundText"]
                    and finish.get("won") is False,
                    record,
                )
                check(
                    "Hub " + name + " calls authority finish once",
                    host.evaluate("__app.net._finished===true")
                    and len(record["finishes"]) == 1
                    and record["finishes"][0]["source"] == 0,
                )
                check(
                    "Hub " + name + " stops simulation and outgoing on every copy",
                    all(
                        frame.evaluate(
                            "__app.net.ended && !__app.net.running && __app.net._interval===null && __app.net._outbox.length===0"
                        )
                        for frame in frames
                    ),
                )
                snapshots = [
                    frame.evaluate("JSON.stringify(__app.state)") for frame in frames
                ]
                for frame in frames:
                    frame.evaluate('__app.send({type:"guard"})')
                page.wait_for_timeout(150)
                check(
                    "Hub " + name + " rejects all state changes after end",
                    all(
                        frame.evaluate("JSON.stringify(__app.state)") == saved
                        for frame, saved in zip(frames, snapshots)
                    ),
                )
                reports.append(
                    {
                        "scenario": name,
                        "record": record,
                        "diagnostics": [
                            frame.evaluate("__app.net.diagnostics()")
                            for frame in frames
                        ],
                    }
                )
            else:
                # The explicit nonhost removal probe is required at two seats; the official
                # automatic harness otherwise tests nonhost removal only at three seats.
                page.locator("#who").select_option("p1")
                page.locator("#remove").click()
                host.wait_for_function(
                    '__app.state.players["1"].connected===false',
                    timeout=15000,
                    polling=25,
                )
                check(
                    "Hub explicit nonhost departure preserves the authority expedition",
                    host.evaluate(
                        '__app.net.running && !__app.net.ended && __app.state.players["0"].connected'
                    ),
                )
                check(
                    "Hub departing guest gear and supplies remain recoverable",
                    host.evaluate(
                        'Object.values(__app.state.entities).some(e=>e.id.startsWith("departed:")) && Object.values(__app.state.entities).some(e=>e.type==="loot"&&e.itemId==="1.starting.bow")'
                    ),
                )
                page.locator("#timeup").click()
                host.wait_for_function(
                    "__app.net.ended===true", timeout=15000, polling=25
                )
                record = page.evaluate(
                    '({roundText:document.getElementById("round").textContent,finishes:__releaseHubFinish})'
                )
                finish = record["finishes"][-1]["data"] if record["finishes"] else {}
                check(
                    "Hub departure result contains current participants exactly once",
                    "Ended played (finished)" in record["roundText"]
                    and finish.get("won") is False
                    and finish.get("standings") == [[0]]
                    and len(record["finishes"]) == 1,
                    record,
                )
                reports.append(
                    {
                        "scenario": name,
                        "record": record,
                        "diagnostics": [host.evaluate("__app.net.diagnostics()")],
                    }
                )
            context.close()
        evidence["hubScenarios"] = reports
    finally:
        browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def run_group(name, fn):
    try:
        fn()
    except (
        PlaywrightError,
        RuntimeError,
        ValueError,
        KeyError,
        TypeError,
        OSError,
        subprocess.SubprocessError,
    ) as exc:
        check(name + " completed", False, exc)


try:
    fixture = generate_fixture()
    evidence["fixture"] = {
        "actions": len(fixture["actions"]),
        "summary": fixture["summary"],
        "bossPhases": fixture["phases"],
    }
    selected = sys.argv[1:] or ["rtc", "hub"]
    with sync_playwright() as pw:
        if "rtc" in selected:
            run_group(
                "full normal cooperative release route",
                lambda: full_rtc_route(pw, fixture),
            )
        if "hub" in selected:
            run_group("Hub release edge scenarios", lambda: hub_scenarios(pw, fixture))
except (
    PlaywrightError,
    RuntimeError,
    ValueError,
    KeyError,
    TypeError,
    OSError,
    subprocess.SubprocessError,
) as exc:
    check("release fixture generation", False, getattr(exc, "stderr", "") or exc)

output = {
    "checks": checks,
    "evidence": evidence,
    "passed": sum(c["pass"] for c in checks),
    "failed": sum(not c["pass"] for c in checks),
    "total": len(checks),
}
(
    ROOT
    / "evidence"
    / ("network-release-" + "-".join(sys.argv[1:] or ["rtc", "hub"]) + ".json")
).write_text(json.dumps(output, indent=2, ensure_ascii=False))
for item in checks:
    if not item["pass"]:
        print("FAIL " + item["name"] + ": " + item["detail"])
print(
    f"{output['passed']}/{output['total']} cooperative release checks passed; {output['failed']} failures"
)
raise SystemExit(1 if output["failed"] else 0)
