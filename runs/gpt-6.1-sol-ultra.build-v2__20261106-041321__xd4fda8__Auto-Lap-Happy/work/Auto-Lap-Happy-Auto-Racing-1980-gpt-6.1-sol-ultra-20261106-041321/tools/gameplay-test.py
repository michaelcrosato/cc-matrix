"""Actual-file browser playthroughs; run through node tools/test.mjs gameplay.
Only continuous driving intents and public menu actions are used. No pose, gate,
score, finish, invulnerability or developer-mode mutation is permitted here.
"""

import base64
import json
import os
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
FINAL = BASE.parent / (BASE.name + ".html")
URL = os.environ.get("HAPPY_GAMEPLAY_URL", FINAL.as_uri())
EVIDENCE = BASE / "evidence"

DRIVE = """({seconds,pace=1.24,second='ai'})=>{
 const h=__happy,s=h.sim,before=s.t,points=[];
 for(let i=0;i<Math.ceil(seconds/.10)&&s.state!=='finished';i++){
  const input=s.cars.map((c,k)=>k===1&&second==='brake'?{steer:0,gas:0,brake:1,ai:true}:{...s.aiIntent(c,k?1:pace),ai:true});
  const score=s.score.slice();h.step(.10,input);
  if(s.score.some((v,k)=>v!==score[k]))points.push({t:s.t,score:s.score.slice(),reason:s.message});
 }
 return {state:s.state,t:s.t,elapsed:s.t-before,screen:h.screen,tourStep:s.tourStep,
  cars:s.cars.map(c=>({x:c.x,y:c.y,lap:c.route.lap,gate:c.route.gate,valid:c.route.valid,speed:c.speed})),
  score:s.score.slice(),points,dev:s.dev,aiAll:s.aiAll,invulnerable:s.invulnerable,attract:s.attract,
  result:s.finishedResult,penalty:s.penalty};
}"""


def run():
    results = []
    evidence = {"url": URL, "tour": [], "trial": {}, "local": {}, "errors": []}
    EVIDENCE.mkdir(exist_ok=True)

    def save():
        (EVIDENCE / "gameplay.json").write_text(
            json.dumps({"results": results, **evidence}, indent=2)
        )

    def check(name, ok, detail=""):
        results.append(
            {"name": name, "pass": bool(ok), "detail": "" if ok else str(detail)}
        )
        save()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080}, device_scale_factor=1
        )
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on("pageerror", lambda e: evidence["errors"].append(str(e)))
        try:
            page.goto(URL)
            page.wait_for_function("window.__happy")
            page.wait_for_timeout(40)
            page.evaluate("__happy.game.stop()")

            def click(a):
                page.locator('[data-action="' + a + '"]').first.click()
                page.wait_for_timeout(15)

            def step(seconds, inputs=None):
                page.evaluate(
                    "({seconds,inputs})=>__happy.step(seconds,inputs)",
                    {"seconds": seconds, "inputs": inputs},
                )

            def drive(seconds=300, second="ai"):
                return page.evaluate(DRIVE, {"seconds": seconds, "second": second})

            def assert_uncheated(label):
                flags = page.evaluate(
                    "({dev:__happy.sim.dev,aiAll:__happy.sim.aiAll,invulnerable:__happy.sim.invulnerable,attract:__happy.sim.attract,ranked:__happy.sim.finishedResult?.ranked})"
                )
                check(
                    label + " uses ordinary ranked rules",
                    not any(
                        flags.get(k)
                        for k in ["dev", "aiAll", "invulnerable", "attract"]
                    )
                    and flags.get("ranked", True) is not False,
                    flags,
                )

            check(
                "Final HTML opens at the title for full playthrough",
                page.evaluate("__happy.screen") == "title",
            )
            # Actual click starts the advertised guided experience.
            click("tour")
            check(
                "Title choice starts the recommended road tour",
                page.evaluate("__happy.sim.tourStep") == 0
                and page.evaluate("__happy.screen") == "driving",
            )
            step(3.2)
            # Physical keyboard steering/braking/recovery demonstrates the taught
            # shoulder and recovery rules before the legal lap is driven.
            page.keyboard.down("Space")
            step(0.35)
            page.keyboard.up("Space")
            page.keyboard.down("KeyA")
            step(1.85)
            page.keyboard.up("KeyA")
            page.keyboard.down("KeyR")
            step(0.70)
            page.keyboard.up("KeyR")
            step(0.95)
            first_demonstration = page.evaluate(
                "({...__happy.sim.tourDemonstrated,penalty:__happy.sim.penalty})"
            )
            check(
                "Tour learns braking, shoulders and manual recovery through actual keys",
                first_demonstration["brake"]
                and first_demonstration["recover"]
                and first_demonstration["penalty"] == 3,
                first_demonstration,
            )
            # Filmstrip follows genuine driving, using renderer frames only for
            # things state assertions cannot judge (wheel/lean/skid composition).
            drive(8)
            frames = []
            for frame in range(6):
                drive(0.16)
                page.evaluate("__happy.game.advance(1/120,{draw:true})")
                path = EVIDENCE / f"motion-drive-{frame}.png"
                page.screenshot(path=str(path))
                frames.append(str(path))
            strip = page.evaluate(
                """async images=>{const canvas=document.createElement('canvas');canvas.width=1464;canvas.height=556;const g=canvas.getContext('2d');g.fillStyle='#17363a';g.fillRect(0,0,canvas.width,canvas.height);g.imageSmoothingEnabled=false;for(let i=0;i<images.length;i++){const image=new Image();image.src='data:image/png;base64,'+images[i];await image.decode();g.drawImage(image,4+(i%3)*488,4+Math.floor(i/3)*278,480,270);}return canvas.toDataURL('image/png').split(',')[1];}""",
                [base64.b64encode(Path(f).read_bytes()).decode() for f in frames],
            )
            (EVIDENCE / "motion-driving-filmstrip.png").write_bytes(
                base64.b64decode(strip)
            )
            check(
                "Six real driving frames form an inspectable native motion filmstrip",
                (EVIDENCE / "motion-driving-filmstrip.png").stat().st_size > 1000,
            )
            for stage in range(6):
                if stage == 3:
                    # Deliberately steer into the visible lake from the lakeside
                    # grid. The normal water crash and checkpoint return run.
                    step(3.2)
                    water = page.evaluate(
                        """()=>{const h=__happy,s=h.sim;let crashed=false;for(let i=0;i<180&&!crashed;i++){const c=s.cars[0],target={x:4400,y:4200},a=Math.atan2(target.y-c.y,target.x-c.x),d=Math.atan2(Math.sin(a-c.angle),Math.cos(a-c.angle));h.step(.05,[{steer:Math.max(-1,Math.min(1,d*2.7)),gas:1,brake:0,ai:true}]);crashed=s.events.some(e=>e.type==='water');}if(crashed)h.step(1,[{brake:1}]);return {crashed,penalty:s.penalty,flags:s.tourDemonstrated};}"""
                    )
                    check(
                        "Tour water lesson produces a real crash, penalty and safe return",
                        water["crashed"] and water["penalty"] >= 3,
                        water,
                    )
                state = drive(300)
                evidence["tour"].append(state)
                check(
                    f"Tour stage {stage + 1} reaches its visible results by legal driving",
                    state["state"] == "finished"
                    and state["screen"] == "results"
                    and state["tourStep"] == stage,
                    state,
                )
                if stage != 2:
                    check(
                        f"Tour stage {stage + 1} crosses its required gates or scores a duel",
                        state["cars"][0]["lap"] > 0
                        if stage < 5
                        else max(state["score"]) > 0,
                        state,
                    )
                assert_uncheated(f"Tour stage {stage + 1}")
                if state["state"] != "finished":
                    raise RuntimeError(f"Tour stage {stage + 1} did not complete")
                if stage in [2, 5]:
                    page.screenshot(
                        path=str(
                            EVIDENCE / f"gameplay-tour-stage-{stage + 1}-results.png"
                        )
                    )
                click("tour-next")
            check(
                "Full tour has a proper ending and visible replay choices",
                page.evaluate("__happy.sim.tourComplete")
                and "Every road. A happy ending." in page.locator("h2").inner_text()
                and page.locator("[data-action=retry]").is_visible(),
            )
            ending = page.evaluate(
                "({complete:__happy.sim.tourComplete,steps:__happy.sim.tourTimes.length,demonstrated:__happy.sim.tourDemonstrated,passport:__happy.passport})"
            )
            evidence["tourEnding"] = ending
            page.screenshot(path=str(EVIDENCE / "gameplay-tour-ending-tv.png"))
            click("retry")
            step(0.02)
            check(
                "Tour ending replay starts a fresh first lesson",
                page.evaluate("__happy.sim.tourStep") == 0
                and page.evaluate("__happy.sim.state") == "countdown"
                and not page.evaluate("__happy.sim.tourComplete"),
            )
            # Five-lap classic event, chosen through the normal screens.
            page.keyboard.press("Escape")
            click("quit")
            click("quick")
            click("choose-trial")
            click("course-0")
            click("car-2")
            click("laps")
            check(
                "Classic five-lap preset is selectable without unlocking",
                page.locator("[data-action=laps]").inner_text().startswith("5 LAPS"),
            )
            click("start")
            trial = drive(350)
            evidence["trial"] = trial
            check(
                "Five-lap trial reaches results with five legal splits",
                trial["state"] == "finished"
                and trial["screen"] == "results"
                and trial["cars"][0]["lap"] == 5
                and len(trial["result"]["splits"]) == 5,
                trial,
            )
            assert_uncheated("Classic time trial")
            record = page.evaluate(
                """()=>{const x=JSON.parse(localStorage.getItem('happy:v1:records')||'null');return x?{version:x.version,keys:Object.keys(x.data),entries:Object.values(x.data).map(r=>({time:r.time,ghost:r.ghost.length,version:r.version}))}:null;}"""
            )
            check(
                "Valid five-lap result stores a versioned personal best and full ghost",
                record
                and record["version"] == 1
                and len(record["entries"]) == 1
                and record["entries"][0]["ghost"] > 1000
                and record["entries"][0]["version"] == 1,
                record,
            )
            page.screenshot(path=str(EVIDENCE / "gameplay-five-lap-results-tv.png"))
            click("retry")
            check(
                "Retry loads the saved authoritative ghost and clears lap state",
                page.evaluate("__happy.sim.bestGhost.length") > 1000
                and page.evaluate("__happy.sim.cars[0].route.lap") == 0
                and page.evaluate("__happy.sim.state") == "countdown",
            )
            # Two humans share one authority, view and score. The second intent is
            # intentionally braking, a legal human action rather than an AI rival.
            page.keyboard.press("Escape")
            click("quit")
            click("multi")
            click("couch")
            click("course-0")
            click("car-3")
            click("start")
            check(
                "Couch setup assigns exactly two human seats",
                page.evaluate("__happy.sim.humans") == 2
                and page.evaluate("__happy.sim.cars.length") == 2
                and page.evaluate("__happy.network.kind") == "none",
            )
            step(3.2)
            page.keyboard.down("ArrowDown")
            step(1.0)
            page.keyboard.up("ArrowDown")
            seats = page.evaluate(
                "__happy.sim.cars.map(c=>({speed:c.speed,x:c.x,y:c.y}))"
            )
            check(
                "Shared keyboard separates second-seat brake from first-seat acceleration",
                seats[0]["speed"] > 30 and abs(seats[1]["speed"]) < 0.1,
                seats,
            )
            duel = drive(300, second="brake")
            evidence["local"] = duel
            check(
                "Two-human couch duel scores ten points through actual driving and checkpoint exchanges",
                duel["state"] == "finished"
                and duel["screen"] == "results"
                and duel["score"][0] >= 10
                and len(duel["points"]) >= 9
                and page.evaluate("__happy.sim.exchange") >= 9,
                duel,
            )
            assert_uncheated("Couch duel")
            page.screenshot(path=str(EVIDENCE / "gameplay-local-duel-results-tv.png"))
            click("retry")
            check(
                "Local rematch retains both seats while clearing scores",
                page.evaluate("__happy.sim.humans") == 2
                and page.evaluate("__happy.sim.score") == [0, 0]
                and page.evaluate("__happy.sim.state") == "countdown",
            )
            page.keyboard.press("Escape")
            click("quit")
            check(
                "Every completed experience returns cleanly to the club",
                page.evaluate("__happy.screen") == "title"
                and not page.evaluate("__happy.attracting"),
            )
            check(
                "Complete actual-file gameplay emits no engine or browser errors",
                not evidence["errors"] and not page.evaluate("__happy.errors"),
                evidence["errors"] or page.evaluate("__happy.errors"),
            )
        except (
            PlaywrightError,
            OSError,
            ValueError,
            RuntimeError,
            TypeError,
            KeyError,
        ) as exc:
            check("Full browser gameplay script completes", False, str(exc))
            try:
                evidence["failureState"] = page.evaluate("__happy.snapshot()")
                page.screenshot(path=str(EVIDENCE / "gameplay-failure.png"))
            except (PlaywrightError, OSError, ValueError) as diagnostic_error:
                evidence["diagnosticError"] = str(diagnostic_error)
        finally:
            save()
            context.close()
            browser.close()
    return results


if __name__ == "__main__":
    print(json.dumps(run()))
