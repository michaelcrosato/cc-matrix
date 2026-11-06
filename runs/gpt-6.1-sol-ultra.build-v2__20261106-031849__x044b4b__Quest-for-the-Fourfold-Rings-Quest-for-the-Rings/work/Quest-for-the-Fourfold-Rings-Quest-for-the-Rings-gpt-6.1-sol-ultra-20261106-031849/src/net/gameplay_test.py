"""Ordinary-input shared-world gameplay assertions on a server-only Hub authority."""

from __future__ import annotations

import argparse
import functools
import hashlib
import http.server
import json
import os
import threading
import time
from pathlib import Path
from urllib.parse import urlencode

from harness_test import DEV, WORK, QuietHandler
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

STATE = """() => {const w=window.__ring.world; return {mode:w.mode,roomId:w.roomId,
 epoch:w.epoch,time:w.time,roomTime:w.roomTime,assisted:w.assisted,rings:w.rings,
 heroes:w.heroes.map(h=>({id:h.id,x:h.x,y:h.y,hp:h.hp,down:h.down,ai:h.ai,carry:h.carry,hurt:h.hurt})),
 enemies:w.enemies.map(e=>({id:e.id,kind:e.kind,x:e.x,y:e.y,stun:e.stun,state:e.state})),
 ring:w.ring,stats:w.stats,events:w.events,history:w.history,
 exit:window.RingContent.rooms[w.roomId].exit};}"""


class Driver:
    def __init__(self, authority, clients):
        self.authority = authority
        self.clients = clients
        self.actions = []
        self.checks = []
        self.started = time.monotonic()
        self.paths = {}

    def state(self):
        return self.authority.evaluate(STATE)

    def command(self, seat, value):
        command = {
            "mx": 0,
            "my": 0,
            "ax": 1,
            "ay": 0,
            "primary": False,
            "power": False,
            "dodge": False,
            "interact": False,
            "ping": False,
            **value,
        }
        accepted = self.clients[seat].evaluate(
            "([s,c]) => window.__ring.testCommand(s,c)", [seat, command]
        )
        if accepted is False:
            raise AssertionError(f"ordinary local input for seat {seat} was rejected")
        self.actions.append(
            {
                "at": round(time.monotonic() - self.started, 3),
                "seat": seat,
                "command": command,
            }
        )

    def neutral(self):
        for seat in range(len(self.clients)):
            self.command(seat, {})

    def until(self, condition, timeout=30, act=None):
        end = time.monotonic() + timeout
        last = None
        while time.monotonic() < end:
            last = self.state()
            if condition(last):
                return last
            if last["mode"] == "failed":
                raise AssertionError(
                    "ordinary network driver wiped before its required interaction"
                )
            if act:
                act(last)
            self.authority.page.wait_for_timeout(80)
        raise AssertionError(
            f"condition timed out; last state: {json.dumps(last, separators=(',', ':'))[:2500]}"
        )

    def assert_sync(self, label, field, timeout=5):
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            authoritative = self.state()
            expected = field(authoritative)
            copies = [client.evaluate(STATE) for client in self.clients]
            if all(field(copy) == expected for copy in copies):
                self.checks.append({"name": label, "pass": True, "value": expected})
                return
            self.authority.page.wait_for_timeout(60)
        raise AssertionError(f"{label}: replicated fields did not converge")

    def direction(self, state, seat, target, stop=7):
        h = state["heroes"][seat]
        distance = ((h["x"] - target["x"]) ** 2 + (h["y"] - target["y"]) ** 2) ** 0.5
        if distance < stop:
            self.paths.pop(seat, None)
            return {"mx": 0, "my": 0}, True
        identity = (state["epoch"], round(target["x"] / 12), round(target["y"] / 12))
        path = self.paths.get(seat)
        if (
            not path
            or path["identity"] != identity
            or time.monotonic() - path["at"] > 3
        ):
            points = self.authority.evaluate(
                "([s,t]) => window.RingSim.path(window.__ring.world,window.__ring.world.heroes[s],t,{ignoreDanger:true})",
                [seat, target],
            )
            path = {"identity": identity, "points": points, "at": time.monotonic()}
            self.paths[seat] = path
        while (
            path["points"]
            and (
                (path["points"][0]["x"] - h["x"]) ** 2
                + (path["points"][0]["y"] - h["y"]) ** 2
            )
            ** 0.5
            < 4.5
        ):
            path["points"].pop(0)
        point = path["points"][0] if path["points"] else target
        dx, dy = point["x"] - h["x"], point["y"] - h["y"]
        length = max(1, (dx * dx + dy * dy) ** 0.5)
        amplitude = min(0.9, length / 15)
        return {
            "mx": dx / length * amplitude,
            "my": dy / length * amplitude,
            "ax": dx / length,
            "ay": dy / length,
        }, False

    def pilot_move(self, targets, timeout=60):
        self.authority.page.evaluate(
            """targets => {
              const copies=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow);
              const server=copies.find(w=>w.AIHub.server);
              const clients=copies.filter(w=>!w.AIHub.server).sort((a,b)=>a.AIHub.me-b.AIHub.me);
              const pilot={targets,paths:{},done:false,error:null,actions:[],started:performance.now()};
              window.__netPilot=pilot;
              function command(seat,cmd){
                clients[seat].__ring.testCommand(seat,cmd);
                pilot.actions.push({at:(performance.now()-pilot.started)/1000,seat,command:cmd});
              }
              function stop(){clearInterval(pilot.timer);for(const t of targets)command(t.seat,{});pilot.done=true;}
              function tick(){
                const w=server.__ring.world;
                if(w.mode==='failed'){pilot.error='room wipe during ordinary navigation';stop();return;}
                let arrived=0;
                for(const t of targets){
                  const h=w.heroes[t.seat],goal=t.target;
                  if(h.down){pilot.error='hero '+t.seat+' down during ordinary navigation';stop();return;}
                  const distance=Math.hypot(h.x-goal.x,h.y-goal.y);
                  let cmd={mx:0,my:0,ax:1,ay:0,primary:false};
                  if(distance<t.stop){arrived++;}
                  else {
                    let p=pilot.paths[t.seat];
                    if(!p||p.epoch!==w.epoch||p.shift!==w.shift||w.time>p.next){
                      p={points:server.RingSim.path(w,h,goal,{ignoreDanger:true}),epoch:w.epoch,shift:w.shift,next:w.time+2};
                      pilot.paths[t.seat]=p;
                    }
                    while(p.points.length&&Math.hypot(h.x-p.points[0].x,h.y-p.points[0].y)<3.2)p.points.shift();
                    const q=p.points[0]||goal,dx=q.x-h.x,dy=q.y-h.y,l=Math.hypot(dx,dy)||1;
                    const a=Math.min(.95,l/24);
                    cmd={mx:dx/l*a,my:dy/l*a,ax:dx/l,ay:dy/l,primary:false};
                  }
                  if(t.primary&&w.enemies.length){
                    const e=w.enemies.filter(e=>e.kind!=='dragon').sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
                    if(e){const dx=e.x-h.x,dy=e.y-h.y,l=Math.hypot(dx,dy)||1;cmd.primary=true;cmd.ax=dx/l;cmd.ay=dy/l;}
                  }
                  command(t.seat,cmd);
                }
                if(arrived===targets.length)stop();
              }
              pilot.timer=setInterval(tick,50);tick();
            }""",
            targets,
        )
        try:
            self.authority.page.wait_for_function(
                "window.__netPilot.done", timeout=timeout * 1000
            )
            status = self.authority.page.evaluate(
                "({error:window.__netPilot.error,actions:window.__netPilot.actions})"
            )
            self.actions.extend(status["actions"])
            if status["error"]:
                raise AssertionError(status["error"])
        finally:
            self.authority.page.evaluate(
                "if(window.__netPilot)clearInterval(window.__netPilot.timer)"
            )

    def move_pair(self, targets, timeout=60):
        self.pilot_move(
            [
                {"seat": seat, "target": target, "stop": 9, "primary": seat == 1}
                for seat, target in enumerate(targets)
            ],
            timeout,
        )

    def move(self, seat, target, stop=7, primary=False, timeout=45):
        self.pilot_move(
            [{"seat": seat, "target": target, "stop": stop, "primary": primary}],
            timeout,
        )


def run(game, evidence):
    result = {
        "game": game.name,
        "sha256": hashlib.sha256(game.read_bytes()).hexdigest(),
        "mode": "shared-world, two remote humans plus a server-only authority",
        "input": "persistent ordinary world-space commands and validated menu intentions; no debug mutations or world advance",
        "passed": 0,
        "failed": 0,
        "failures": [],
        "checks": [],
    }
    handler = functools.partial(QuietHandler, directory=str(WORK))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    driver = None
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                page = browser.new_page(viewport={"width": 1280, "height": 800})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                harness = DEV / "vendor/hub/harness.html"
                query = urlencode(
                    {
                        "game": os.path.relpath(game, harness.parent),
                        "players": "2",
                        "scenario": "server",
                        "latency": "40",
                        "jitter": "10",
                        "loss": "0",
                        "seed": "4169",
                        "limit": "600",
                    }
                )
                page.goto(
                    f"http://127.0.0.1:{httpd.server_address[1]}/{harness.relative_to(WORK).as_posix()}?{query}",
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    """() => [...document.querySelectorAll('iframe')].length === 3 &&
                  [...document.querySelectorAll('iframe')].every(f => f.contentWindow.__ring?.net)""",
                    timeout=45000,
                )
                page.locator("#release").click()
                page.wait_for_function(
                    """() => [...document.querySelectorAll('iframe')].every(f => f.contentWindow.__ring.net.playing)""",
                    timeout=20000,
                )
                frames = [frame for frame in page.frames if frame != page.main_frame]
                authority = next(
                    frame
                    for frame in frames
                    if frame.evaluate("window.AIHub.server === true")
                )
                clients = sorted(
                    [
                        frame
                        for frame in frames
                        if not frame.evaluate("window.AIHub.server === true")
                    ],
                    key=lambda frame: frame.evaluate("window.AIHub.me"),
                )
                driver = Driver(authority, clients)
                assert authority.evaluate("window.__ring.net.localSeat") == -1
                assert (
                    authority.evaluate("window.__ring.testCommand(0,{mx:1})") is False
                )
                driver.checks.append(
                    {"name": "server owns no human input seat", "pass": True}
                )
                assert (
                    clients[0].evaluate(
                        "window.__ring.inputIntent({type:'route',value:'dungeon'})"
                    )
                    is not False
                )
                driver.until(
                    lambda s: s["roomId"] == "dungeon1" and s["mode"] == "room", 10
                )
                driver.assert_sync(
                    "ordinary route creates the same room",
                    lambda s: [s["roomId"], s["epoch"]],
                )
                ring = driver.state()["ring"]
                # Move both remote humans through the authored stone layout, using the public path query only as observation.
                driver.move_pair([ring, ring])
                driver.command(0, {"interact": True})
                driver.until(lambda s: s["ring"]["carrier"] == 1, 5)
                driver.command(0, {})
                driver.assert_sync(
                    "ring pickup is authoritative", lambda s: s["ring"]["carrier"]
                )
                driver.command(0, {"interact": True})
                driver.command(1, {"interact": True})
                driver.until(lambda s: s["ring"]["carrier"] == 2, 5)
                driver.neutral()
                driver.assert_sync(
                    "willing nearby teammate receives ring",
                    lambda s: [s["ring"]["carrier"], s["stats"]["passes"]],
                )

                # Invite a real enemy strike; no health setter, spawn tool, or assisted flag is used.
                def invite_strike(state):
                    hero = state["heroes"][1]
                    threats = [e for e in state["enemies"] if e["kind"] != "dragon"]
                    if not threats:
                        raise AssertionError(
                            "no natural enemy remained for the shared damage assertion"
                        )
                    enemy = min(
                        threats,
                        key=lambda e: (
                            (e["x"] - hero["x"]) ** 2 + (e["y"] - hero["y"]) ** 2
                        ),
                    )
                    command, close = driver.direction(state, 1, enemy, stop=18)
                    driver.command(1, {} if close else command)

                initial_hp = driver.state()["heroes"][1]["hp"]
                driver.until(
                    lambda s: s["heroes"][1]["hp"] < initial_hp, 75, invite_strike
                )
                driver.command(1, {})
                driver.assert_sync(
                    "actual enemy damage reaches every view",
                    lambda s: s["heroes"][1]["hp"],
                )
                driver.until(lambda s: s["heroes"][1]["down"], 75, invite_strike)
                driver.command(1, {})
                driver.assert_sync(
                    "downed ring carrier drops treasure",
                    lambda s: [s["heroes"][1]["down"], s["ring"]["carrier"]],
                )
                fallen = driver.state()["heroes"][1]
                driver.move(0, fallen, stop=18, primary=True, timeout=60)

                def rescue(state):
                    h = state["heroes"][0]
                    threats = sorted(
                        state["enemies"],
                        key=lambda e: (e["x"] - h["x"]) ** 2 + (e["y"] - h["y"]) ** 2,
                    )
                    target = threats[0] if threats else {"x": h["x"] + 1, "y": h["y"]}
                    dx, dy = target["x"] - h["x"], target["y"] - h["y"]
                    length = max(1, (dx * dx + dy * dy) ** 0.5)
                    driver.command(
                        0,
                        {
                            "interact": True,
                            "primary": True,
                            "ax": dx / length,
                            "ay": dy / length,
                        },
                    )

                driver.until(lambda s: not s["heroes"][1]["down"], 30, rescue)
                driver.neutral()
                driver.assert_sync(
                    "ordinary held revive restores partner",
                    lambda s: [s["heroes"][1]["down"], s["stats"]["revives"]],
                )
                state = driver.state()
                if not state["ring"]["carrier"]:
                    driver.move(0, state["ring"], stop=14, primary=True)
                    driver.command(0, {"interact": True})
                    driver.until(lambda s: bool(s["ring"]["carrier"]), 5)
                    driver.neutral()
                holder = driver.state()["ring"]["carrier"] - 1
                driver.move(
                    holder, driver.state()["exit"], stop=15, primary=holder == 0
                )
                driver.command(holder, {"interact": True})
                driver.until(lambda s: s["roomId"] == "dungeon2", 10)
                driver.neutral()
                driver.assert_sync(
                    "ring extraction advances all copies once",
                    lambda s: [s["roomId"], s["epoch"], s["stats"]["rooms"]],
                )
                driver.checks.append(
                    {
                        "name": "gameplay evidence used no debug mutation",
                        "pass": not driver.state()["assisted"],
                    }
                )
                if errors:
                    raise AssertionError("page errors: " + "; ".join(errors[:3]))
                result["state"] = driver.state()
                result["checks"] = driver.checks
                page.locator("#timeup").click()
                page.wait_for_function(
                    "document.querySelector('#round').textContent.includes('Ended played')",
                    timeout=10000,
                )
                result["checks"].append(
                    {
                        "name": "server submits a valid cooperative partial result",
                        "pass": True,
                    }
                )
            finally:
                browser.close()
    except (
        PlaywrightError,
        OSError,
        AssertionError,
        ValueError,
        StopIteration,
    ) as error:
        result["failures"].append(str(error))
        result["checks"] = driver.checks if driver else []
        if driver:
            try:
                result["state"] = driver.state()
            except PlaywrightError as state_error:
                result["stateError"] = str(state_error)
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2)
    result["actions"] = driver.actions if driver else []
    result["passed"] = sum(bool(check["pass"]) for check in result["checks"])
    result["failed"] = len(result["failures"]) + sum(
        not check["pass"] for check in result["checks"]
    )
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", type=Path, default=WORK / (DEV.name + ".html"))
    parser.add_argument(
        "--evidence", type=Path, default=DEV / "evidence/hub-gameplay.json"
    )
    args = parser.parse_args()
    output = run(args.game.resolve(), args.evidence.resolve())
    for failure in output["failures"]:
        print("FAIL " + failure)
    print(f"{output['passed']} passed, {output['failed']} failed")
    raise SystemExit(1 if output["failed"] else 0)
