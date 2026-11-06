"""Released AI Hub harness, actual packaged game, one browser and an owned ephemeral server.
Run with the installed Playwright Python interpreter. Prints failures and one count line.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import json
import threading
import time
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", type=Path)
    parser.add_argument(
        "--scenarios", default="normal,degraded,guest-leave,host-leave,server"
    )
    args = parser.parse_args()
    identity = json.loads((DEV / "identity.json").read_text())
    game = (args.game or ROOT / (identity["slug"] + ".html")).resolve()
    relative = game.relative_to(ROOT).as_posix()
    evidence = []
    failures = []
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
            )
            context = browser.new_context(viewport={"width": 1600, "height": 1000})
            for scenario in args.scenarios.split(","):
                page = context.new_page()
                warnings = []
                page.on(
                    "console",
                    lambda msg, warnings=warnings: (
                        warnings.append(msg.text)
                        if "[AIHub]" in msg.text and msg.type in ("warning", "error")
                        else None
                    ),
                )
                params = {
                    "game": "/" + relative + "?backend=webgl",
                    "players": "2",
                    "auto": "1",
                    "seed": "4217",
                    "play": "60000" if scenario == "normal" else "8000",
                    "limit": "90",
                }
                if scenario == "degraded":
                    params.update(latency="150", jitter="50", loss="5")
                if scenario in ("host-leave", "server"):
                    params["scenario"] = scenario
                start = time.monotonic()
                report = None
                observations = {}
                scenario_ok = False
                try:
                    # Confirm the ephemeral server is serving this game's identity first.
                    response = context.request.get(origin + "/" + relative)
                    assert response.ok and identity["title"] in response.text(), (
                        "server identity mismatch"
                    )
                    url = (
                        origin
                        + "/"
                        + DEV.name
                        + "/tools/hub-harness.html?"
                        + urlencode(params)
                    )
                    page.goto(url, wait_until="domcontentloaded")
                    if scenario == "normal":
                        page.wait_for_function(
                            "[...document.querySelectorAll('iframe')].length===2 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__bomber?.online?.playing&&f.contentWindow.__bomber?.online?.started)",
                            timeout=90000,
                        )
                        # Semantic public commands exercise the exact local/remote transport used by UI.
                        # The separate browser-input suite verifies physical-key/menu paths.
                        page.evaluate("""() => {
                          const frames=[...document.querySelectorAll('iframe')];
                          // A genuine local settings/help overlay isolates station assertions from the
                          // admission harness's concurrent random flight keys; authority must keep stepping.
                          for(const f of frames)f.contentWindow.__bomber.ui.shell.show('help',{title:'CREW STATIONS',text:'The shared aircraft continues while this local overlay is open.'});
                          frames[0].contentWindow.__bomber.online.command({type:'station',station:'port'});
                          frames[1].contentWindow.__bomber.online.command({type:'station',station:'tail'});
                          frames[1].contentWindow.__bomber.online.command({type:'aim',yaw:.25,pitch:.1});
                        }""")
                        page.wait_for_function(
                            "document.querySelectorAll('iframe')[0].contentWindow.__bomber.sim.state.owners.port===1 && document.querySelectorAll('iframe')[0].contentWindow.__bomber.sim.state.owners.tail===2",
                            timeout=10000,
                        )
                        page.evaluate("""() => {
                          const frames=[...document.querySelectorAll('iframe')];
                          frames[0].contentWindow.__bomber.online.command({type:'station',station:'pilot'});
                          frames[1].contentWindow.__bomber.online.command({type:'station',station:'bombs'});
                        }""")
                        page.wait_for_function(
                            "document.querySelectorAll('iframe')[0].contentWindow.__bomber.sim.state.aircraft.airborne && document.querySelectorAll('iframe')[0].contentWindow.__bomber.sim.state.aircraft.doors>.9",
                            timeout=45000,
                        )
                        inventory = page.evaluate(
                            "document.querySelectorAll('iframe')[0].contentWindow.__bomber.sim.state.bombsLeft"
                        )
                        page.evaluate(
                            "document.querySelectorAll('iframe')[1].contentWindow.__bomber.online.command({type:'release',salvo:2})"
                        )
                        page.wait_for_function(
                            f"[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__bomber.sim.state.bombsLeft==={inventory - 2})",
                            timeout=10000,
                        )
                        page.wait_for_timeout(650)
                        actual = page.evaluate(
                            "document.querySelectorAll('iframe')[0].contentWindow.__bomber.sim.state.bombsLeft"
                        )
                        assert actual == inventory - 2, (
                            "guest release debited more than once"
                        )
                        convergence = page.evaluate(
                            """() => { const s=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow.__bomber.sim.state); return {host:s[0].tick,guest:s[1].tick,owner:s[1].owners.bombs,bombs:s[1].bombsLeft}; }"""
                        )
                        assert (
                            abs(convergence["host"] - convergence["guest"]) < 180
                            and convergence["owner"] == 2
                        ), "authoritative state failed to converge"
                        observations["gameplay"] = {
                            "bothPlayersChangedStations": True,
                            "guestReleasedOnce": True,
                            "convergence": convergence,
                        }
                    if scenario == "guest-leave":
                        page.wait_for_function(
                            "[...document.querySelectorAll('iframe')].length===2 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.AIHub?.time()>=0)",
                            timeout=90000,
                        )
                        page.wait_for_timeout(2200)
                        page.select_option("#who", "p1")
                        page.click("#remove")
                        page.wait_for_function(
                            "document.querySelector('iframe').contentWindow.__bomber.sim.state.players.find(p=>p.id===2)?.connected===false && !Object.values(document.querySelector('iframe').contentWindow.__bomber.sim.state.owners).includes(2)",
                            timeout=10000,
                        )
                        observations["departureReturnedDutiesToAI"] = True
                    page.wait_for_function(
                        "document.body.dataset.complete==='true'", timeout=120000
                    )
                    report = page.evaluate("window.__hubCheck")
                    assert report and report.get("pass") is True, "; ".join(
                        c["name"] + ": " + c.get("detail", "")
                        for c in (report or {}).get("checks", [])
                        if not c["pass"]
                    )
                    assert not warnings, "; ".join(warnings)
                    terminal_js = """() => [...document.querySelectorAll('iframe')].map(f=>{
                      const b=f.contentWindow.__bomber;
                      return {title:f.title, ended:!!b?.online?.ended, host:!!b?.online?.isHost,
                        gameRunning:b?.game?._running, nativeMuted:b?.game?.audio?.muted,
                        adapter:b?.online?.stats??null, audio:b?.sound?.inspect?.()??b?.audio?.inspect?.()??null};
                    })"""
                    observations["terminal"] = page.evaluate(terminal_js)
                    for terminal in observations["terminal"]:
                        assert terminal["ended"], "game adapter did not receive end"
                        assert terminal["gameRunning"] is False, (
                            "native game loop survived session end"
                        )
                        assert terminal["nativeMuted"] is True, (
                            "native audio was not muted after session end"
                        )
                        if terminal["host"]:
                            assert terminal["adapter"]["finishes"] == 1, (
                                "host finish was not atomic"
                            )
                        if terminal["audio"] is not None:
                            assert terminal["audio"]["activeSources"] == 0, (
                                "sound survived session end"
                            )
                    before = [
                        terminal["adapter"]["sent"]
                        for terminal in observations["terminal"]
                    ]
                    page.evaluate("""() => {
                      for(const f of document.querySelectorAll('iframe')){
                        const w=f.contentWindow;
                        if(w.__bomber.online.server)continue;
                        for(const type of ['keydown','keyup'])w.document.dispatchEvent(new w.KeyboardEvent(type,{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
                      }
                    }""")
                    page.wait_for_timeout(350)
                    after_terminal = page.evaluate(terminal_js)
                    after = [terminal["adapter"]["sent"] for terminal in after_terminal]
                    assert before == after, "game sent traffic after session end"
                    for terminal in after_terminal:
                        assert terminal["gameRunning"] is False, (
                            "post-end pause input restarted native loop"
                        )
                        assert terminal["nativeMuted"] is True, (
                            "post-end pause input unmuted native audio"
                        )
                        if terminal["audio"] is not None:
                            assert terminal["audio"]["activeSources"] == 0, (
                                "post-end pause input resumed sound sources"
                            )
                    observations["afterTerminalPauseInput"] = after_terminal
                    scenario_ok = True
                except (AssertionError, PlaywrightError) as error:
                    failures.append(f"Hub {scenario}: {error}")
                    try:
                        report = report or page.evaluate("window.__hubCheck??null")
                        observations["failureCopies"] = (
                            page.evaluate("""() => [...document.querySelectorAll('iframe')].map(f=>{
                          const b=f.contentWindow.__bomber, s=b?.sim?.state;
                          return {title:f.title,url:f.src,ready:b?.ready,error:b?.error,online:b?.online?{active:b.online.active,playing:b.online.playing,started:b.online.started,ended:b.online.ended,server:b.online.server,stats:b.online.stats}:null,
                            state:s?{phase:s.phase,t:s.t,airborne:s.aircraft.airborne,hull:s.aircraft.hull,doors:s.aircraft.doors,bombsLeft:s.bombsLeft,owners:s.owners,result:s.result}:null};
                        })""")
                        )
                    except PlaywrightError:
                        observations["diagnostics"] = "frame inspection unavailable"
                evidence.append(
                    {
                        "scenario": scenario,
                        "seconds": round(time.monotonic() - start, 2),
                        "pass": scenario_ok,
                        "warnings": warnings,
                        "report": report,
                        "observations": observations,
                    }
                )
                (DEV / "docs" / "hub-results.json").write_text(
                    json.dumps(evidence, indent=2)
                )
                page.close()
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    (DEV / "docs" / "hub-results.json").write_text(json.dumps(evidence, indent=2))
    for failure in failures:
        print("FAIL " + failure)
    print(
        f"{len(evidence) - len(failures)} Hub harness scenarios passed; {len(failures)} failures"
    )
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(run())
