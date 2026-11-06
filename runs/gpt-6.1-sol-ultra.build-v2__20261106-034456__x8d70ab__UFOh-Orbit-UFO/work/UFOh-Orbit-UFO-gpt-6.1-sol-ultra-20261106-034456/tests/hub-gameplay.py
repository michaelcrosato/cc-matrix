"""Two framed copies of the packaged game; fixture setup, then real legal input."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlencode


def gameplay(page, origin: str, base: Path):
    result = {"passed": 0, "failed": 0, "failures": []}
    evidence = []

    def check(name, passed, detail=""):
        result["passed" if passed else "failed"] += 1
        evidence.append({"name": name, "pass": bool(passed), "detail": detail})
        if not passed:
            result["failures"].append(f"Hub gameplay: {name}: {detail}")

    text = (base / "vendor/hub/harness.html").read_text()
    text = text.replace("from './bridge.js'", "from '/vendor/hub/bridge.js'")
    text = text.replace("from './round.js'", "from '/vendor/hub/round.js'")
    text = text.replace(
        "if (auto) conformance();",
        """window.__scenario={status:()=>current?.status,record:()=>current?.record,release:()=>releaseRound(current),timeUp:()=>current.coordinator.timeUp(),remove:i=>removeCell(current.cells[i])};
if (auto) conformance();""",
    )
    (base / "artifacts/hub-gameplay-harness.html").write_text(text)
    query = {
        "game": "/build/game.html",
        "players": 2,
        "latency": 150,
        "jitter": 50,
        "loss": 5,
        "seed": 7,
        "limit": 180,
    }
    page.goto(
        origin + "/artifacts/hub-gameplay-harness.html?" + urlencode(query),
        wait_until="load",
    )
    page.wait_for_function(
        "window.__scenario?.status()?.players?.length === 2 && window.__scenario.status().players.every(p=>p.ready)",
        timeout=20000,
    )
    frames = [f for f in page.frames if "/build/game.html" in f.url]
    assert len(frames) == 2
    host = next(f for f in frames if f.evaluate("window.__orbit.hub.isHost"))
    guest = next(f for f in frames if not f.evaluate("window.__orbit.hub.isHost"))
    page.evaluate("window.__scenario.release()")
    page.wait_for_timeout(400)
    check(
        "no mission advancement during countdown",
        host.evaluate("__game.debug.world().time === 0"),
    )
    host.wait_for_function("window.__orbit.hub.state==='running'", timeout=6000)
    guest.wait_for_function("window.__orbit.hub.state==='running'", timeout=6000)
    for frame in frames:
        frame.locator("#screen").click(position={"x": 200, "y": 200})
    check(
        "Hub audio unlocks after a real input gesture",
        all(f.evaluate("__orbit.audio.debug().unlocked") for f in frames),
    )
    page.evaluate("""() => {
      const f=[...document.querySelectorAll('iframe')];
      f[0].style.width='720px';f[0].style.height='450px';
      f[1].style.width='380px';f[1].style.height='700px';
    }""")
    host.evaluate("""async()=>{
      window.__fixture=await import('/src/simulation.js');
      const w=__game.debug.rawWorld();w.transition=10000;w.enemies=[];w.bullets=[];w.gates=[];w.blasts=[];w.chains=[];w.boss=null;w.extraction=null;
      w.players.forEach((p,i)=>Object.assign(p,{x:140+i*560,y:400,vx:0,vy:0,hull:3,shield:0,down:false,active:true,invuln:0}));
    }""")
    page.wait_for_timeout(500)
    sizes = [
        f.evaluate("({w:__game.W,h:__game.H,arena:__game.debug.world().arena})")
        for f in frames
    ]
    check(
        "different device sizes share authoritative bounds",
        sizes[0]["arena"] == sizes[1]["arena"] == {"x": 0, "y": 0, "w": 960, "h": 540}
        and (sizes[0]["w"], sizes[0]["h"]) != (sizes[1]["w"], sizes[1]["h"]),
        sizes,
    )
    before = host.evaluate("__game.debug.world().players.map(p=>p.x)")
    guest.evaluate("__game.debug.input(1,{mx:-1})")
    page.wait_for_timeout(750)
    guest.evaluate("__game.debug.input(1,{mx:0})")
    after = host.evaluate("__game.debug.world().players.map(p=>p.x)")
    check(
        "remote input moves only remote pilot",
        abs(after[0] - before[0]) < 2 and after[1] < before[1] - 45,
        {"before": before, "after": after},
    )
    page.evaluate(
        """() => {const f=[...document.querySelectorAll('iframe')][1];f.style.width='1000px';f.style.height='500px';}"""
    )
    page.wait_for_timeout(500)
    check(
        "resize preserves simulation arena",
        guest.evaluate(
            "__game.debug.world().arena.w===960&&__game.debug.world().arena.h===540"
        ),
    )
    guest.evaluate("""() => {
      __game.debug.input(1,null);
      const c=__game.screen.canvas,r=c.getBoundingClientRect(),L=__orbit.present.layout;
      const x=r.left+(L.x+860*L.k)*r.width/__game.W,y=r.top+(L.y+420*L.k)*r.height/__game.H;
      c.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',pointerId:1,clientX:x,clientY:y,movementX:10,movementY:10,bubbles:true}));
    }""")
    page.wait_for_timeout(650)
    aim = host.evaluate(
        """()=>{const p=__game.debug.world().players[1];return {actual:p.targetAngle,expected:Math.atan2(420-p.y,860-p.x)};}"""
    )
    import math

    error = abs(
        math.atan2(
            math.sin(aim["actual"] - aim["expected"]),
            math.cos(aim["actual"] - aim["expected"]),
        )
    )
    check("remote mouse aim inverts local arena transform", error < 0.055, aim)
    guest.evaluate("__game.debug.input(1,{mx:0})")
    paused_before = host.evaluate("__game.debug.world().time")
    host.evaluate("__game.pause()")
    page.wait_for_timeout(650)
    paused_after = host.evaluate("__game.debug.world().time")
    check(
        "local pause overlay keeps shared simulation running",
        paused_after - paused_before > 0.35,
        {"before": paused_before, "after": paused_after},
    )
    host.evaluate("__game.resume()")
    host.evaluate("""()=>{
      const w=__game.debug.rawWorld();w.enemies=[];w.bullets=[];w.gates=[];w.blasts=[];w.chains=[];
      w.players.forEach((p,i)=>Object.assign(p,{x:i?800:100,y:i?460:270,vx:0,vy:0,hull:3,shield:0,down:false,invuln:0,angle:0,targetAngle:0}));
      __fixture.commandWorld(w,'spawn',{type:'drifter',x:480,y:270,count:24,spacing:49,formation:'cluster',merge:false});
      for(const e of w.enemies)e.speed=0;
      __game.debug.input(0,{ax:1,ay:0,aim:true,fire:true});
    }""")
    dense_before = host.evaluate("__game.debug.world().time")
    page.wait_for_timeout(450)
    host.evaluate("__game.debug.input(0,{fire:false})")
    page.wait_for_timeout(1600)
    cascade = host.evaluate(
        "({time:__game.debug.world().time,score:__game.debug.world().score,best:__game.debug.world().bestChain,kills:__game.debug.world().stats.kills,enemies:__game.debug.world().enemies.length})"
    )
    guest_score = guest.evaluate("__game.debug.world().score")
    check(
        "real shared cascade awards one consistent team score",
        cascade["kills"] >= 20
        and cascade["best"] >= 10
        and cascade["score"] == guest_score,
        {"host": cascade, "guestScore": guest_score},
    )
    check(
        "dense blast feedback cannot freeze shared clock",
        cascade["time"] - dense_before > 1.2,
        cascade["time"] - dense_before,
    )
    host.evaluate("""()=>{
      const w=__game.debug.rawWorld();w.enemies=[];w.bullets=[];w.gates=[];w.blasts=[];w.chains=[];
      Object.assign(w.players[0],{x:200,y:270,vx:0,vy:0,hull:3,shield:0,down:false,invuln:0});
      Object.assign(w.players[1],{x:255,y:270,vx:0,vy:0,hull:0,down:true,active:true});
      __game.debug.input(0,{mx:1});
    }""")
    page.wait_for_timeout(650)
    host.evaluate("__game.debug.input(0,{mx:0})")
    rescue = host.evaluate(
        "({rescues:__game.debug.world().stats.rescues,players:__game.debug.world().players})"
    )
    check(
        "ready-shield contact performs shared rescue",
        rescue["rescues"] > 0
        and rescue["players"][1]["hull"] == 1
        and not rescue["players"][1]["down"]
        and rescue["players"][0]["shield"] > 0,
        rescue,
    )
    page.wait_for_timeout(600)
    check(
        "rescued hull reaches second page",
        guest.evaluate(
            "__game.debug.world().players[1].hull===1&&!__game.debug.world().players[1].down"
        ),
    )
    host.evaluate("""()=>{
      const w=__game.debug.rawWorld();w.enemies=[];w.bullets=[];w.gates=[];w.blasts=[];w.chains=[];
      w.players.forEach((p,i)=>Object.assign(p,{x:300+i*360,y:460,vx:0,vy:0,shield:0,hull:3,down:false,invuln:0}));
      __fixture.commandWorld(w,'spawn',{type:'drifter',x:480,y:100,count:2,spacing:28,formation:'line'});
      for(const e of w.enemies)e.speed=0;
    }""")
    page.wait_for_timeout(3300)
    check(
        "fusion produces one replicated pursuer",
        host.evaluate("__game.debug.world().stats.fusions>0")
        and guest.evaluate('__game.debug.world().enemies.some(e=>e.type==="hunter")'),
    )
    host.evaluate("""()=>{
      const w=__game.debug.rawWorld();w.enemies=[];w.bullets=[];w.gates=[];w.blasts=[];w.chains=[];w.boss=null;
      w.balance.bossHealth=18;w.balance.shieldRecharge=.5;
      w.players.forEach((p,i)=>Object.assign(p,{x:350+i*260,y:430,vx:0,vy:0,shield:0,hull:3,down:false,invuln:1.5,angle:-Math.PI/2,targetAngle:-Math.PI/2}));
      __fixture.commandWorld(w,'phase',{value:1});
    }""")
    for frame in frames:
        frame.evaluate(
            """()=>{window.__playBot=setInterval(()=>{const index=__orbit.hub.localIndex;if(__orbit.hub.state==='running')__game.debug.input(index,__game.debug.autopilot(index));},16);}"""
        )
    host.wait_for_function(
        '__game.debug.world().boss?.phase>=2 || __game.debug.world().status!=="running"',
        timeout=35000,
    )
    check(
        "legal two-pilot cannon input clears boss phase one",
        host.evaluate("__game.debug.world().stats.bossPhases>=2"),
    )
    host.wait_for_function(
        '__game.debug.world().boss?.phase>=3 || __game.debug.world().status!=="running"',
        timeout=35000,
    )
    check(
        "legal two-pilot input reaches boss phase three",
        host.evaluate("__game.debug.world().stats.bossPhases>=3"),
    )
    host.wait_for_function('__game.debug.world().status!=="running"', timeout=45000)
    page.wait_for_timeout(1200)
    final = [f.evaluate("__game.debug.snapshot()") for f in frames]
    check(
        "boss defeat and extraction yield shared victory",
        all(s["world"]["status"] == "victory" for s in final),
        [{"status": s["world"]["status"], "stats": s["world"]["stats"]} for s in final],
    )
    check(
        "shared terminal score is identical on both pages",
        final[0]["world"]["score"] == final[1]["world"]["score"],
    )
    check(
        "all copies receive Hub end and audio is stopped",
        all(s["hub"]["state"] == "ended" and s["audio"]["stopped"] for s in final),
        [{"hub": s["hub"], "audio": s["audio"]} for s in final],
    )
    counts = [s["hub"]["stats"]["sent"] for s in final]
    page.wait_for_timeout(450)
    check(
        "no packets leave after end",
        counts
        == [f.evaluate("__game.debug.snapshot().hub.stats.sent") for f in frames],
    )
    check(
        "snapshot bytes and message rates stay bounded",
        all(
            s["hub"]["stats"]["maxBytes"] <= 16384
            and s["hub"]["stats"]["maxRate"] <= 16
            for s in final
        ),
        [s["hub"]["stats"] for s in final],
    )
    for frame in frames:
        frame.evaluate("clearInterval(window.__playBot)")
    (base / "artifacts/hub-gameplay-report.json").write_text(
        json.dumps({"result": result, "checks": evidence, "final": final}, indent=2)
    )
    return result
