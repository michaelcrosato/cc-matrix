"""Real co-op game flow from the singular file, driven through emulated pads.
No hero, enemy, inventory, progression or checkpoint state is rewritten.
"""

import json
import math
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((DEV / "identity.json").read_text())
PAD = """
window.__testPad={id:'DualSense standard emulation',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};
Object.defineProperty(navigator,'getGamepads',{value:()=>{__testPad.timestamp=performance.now();return [__testPad];},configurable:true});
"""


def run():
    checks = 0
    notes = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        host_context = browser.new_context(viewport={"width": 1280, "height": 800})
        guest_context = browser.new_context(viewport={"width": 1280, "height": 800})
        try:
            for context in [host_context, guest_context]:
                context.add_init_script(PAD)
            host = host_context.new_page()
            guest = guest_context.new_page()
            errors = []
            for page in [host, guest]:
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto((DEV.parent / IDENTITY["html"]).as_uri())
                page.wait_for_function("globalThis.__NM?.ready")
                assert (
                    page.evaluate("document.body.dataset.game")
                    == "near-misses-20261106-035445"
                )
            checks += 1
            invitation = host.evaluate("__NM.net.host({lan:true})")
            reply = guest.evaluate("code=>__NM.net.join(code)", invitation)
            host.evaluate("code=>__NM.net.accept(code)", reply)
            for page in [host, guest]:
                page.wait_for_function(
                    "__NM.net.running && __NM.sim.state.players.length===2"
                )
            assert host.evaluate("__NM.net.authority && __NM.net.localSeat===1")
            assert guest.evaluate("!__NM.net.authority && __NM.net.localSeat===2")
            checks += 1
            host.evaluate("__NM.travel('chalk')")
            for page in [host, guest]:
                page.wait_for_function(
                    "__NM.sim.state.mode==='cave' && __NM.sim.level.data.id==='chalk'"
                )
            checks += 1

            def neutral():
                for page in [host, guest]:
                    page.evaluate(
                        "__testPad.axes=[0,0,0,0]; for(const b of __testPad.buttons){b.pressed=false;b.value=0;}"
                    )

            def drive_to(tx, ty, timeout=35, combat=False):
                nonlocal checks
                deadline = time.monotonic() + timeout
                last_shot = 0
                while time.monotonic() < deadline:
                    data = host.evaluate(
                        """([tx,ty])=>{
                      const a=__NM,s=a.sim.state,G=NM.Geometry;
                      return {mode:s.mode,party:s.party,stats:s.stats,players:s.players.map(p=>{
                        let path=G.path(a.sim.level,p.x,p.y,tx,ty);
                        while(path.length&&Math.hypot(path[0][0]-p.x,path[0][1]-p.y)<6)path.shift();
                        const point=path[0]||[tx,ty];
                        const dx=point[0]-p.x,dy=point[1]-p.y;
                        const screen=a.game.view.p(dx,dy,0),length=Math.hypot(...screen)||1;
                        const enemy=s.enemies.find(e=>e.hp>0&&e.type!=='ooze'&&a.sim.visible(e)&&G.los(a.sim.level,p.x,p.y,e.x,e.y)&&Math.hypot(e.x-p.x,e.y-p.y)<115);
                        let aim=[1,0];if(enemy){const v=a.game.view.p(enemy.x-p.x,enemy.y-p.y,0),l=Math.hypot(...v)||1;aim=v.map(x=>x/l*.9);}
                        return {seat:p.seat,x:p.x,y:p.y,hp:p.hp,downed:p.downed,mx:screen[0]/length*.95,my:screen[1]/length*.95,ax:aim[0],ay:aim[1],enemy:enemy?.id,draw:p.draw,recovery:p.recovery};
                      })};
                    }""",
                        [tx, ty],
                    )
                    assert data["mode"] != "defeat", data
                    assert all(not p["downed"] for p in data["players"]), data
                    done = all(
                        math.hypot(p["x"] - tx, p["y"] - ty) < 9
                        for p in data["players"]
                    )
                    if done:
                        neutral()
                        return
                    # Stop both rangers before drawing. Shooting while both continue
                    # sprinting created a moving origin plus guest snapshot delay;
                    # with the authored narrow rat silhouette that was a poor shot.
                    # The first exact-once assertion above already exercises guest fire.
                    lead = next(p for p in data["players"] if p["seat"] == 1)
                    engaged = combat and lead["enemy"]
                    for player in data["players"]:
                        page = host if player["seat"] == 1 else guest
                        move = [0, 0] if engaged else [player["mx"], player["my"]]
                        if math.hypot(player["x"] - tx, player["y"] - ty) < 8:
                            move = [0, 0]
                        shoot = (
                            combat
                            and player["seat"] == 1
                            and player["enemy"]
                            and player["draw"] <= 0
                            and player["recovery"] <= 0
                            and time.monotonic() - last_shot > 0.75
                        )
                        page.evaluate(
                            """v=>{__testPad.axes=[v[0],v[1],v[2],v[3]];__testPad.buttons[7]={pressed:v[4],value:v[4]?1:0,touched:v[4]};}""",
                            [*move, player["ax"], player["ay"], bool(shoot)],
                        )
                        if shoot:
                            last_shot = time.monotonic()
                    host.wait_for_timeout(70)
                raise AssertionError(
                    f"Co-op pad navigation timed out at {tx / 16},{ty / 16}: {data}"
                )

            drive_to(25.5 * 16, 6.5 * 16)
            guest.wait_for_function("__NM.sim.state.party.ammo===9")
            assert host.evaluate(
                "!__NM.sim.state.pickups.some(p=>p.id==='chalk-practice-quiver')"
            )
            checks += 1
            drive_to(38.5 * 16, 8.5 * 16)
            host.wait_for_function(
                "__NM.sim.state.enemies.find(e=>e.id==='chalk-rat-scratch').hp>0"
            )
            before = host.evaluate(
                "({ammo:__NM.sim.state.party.ammo,shots:__NM.sim.state.stats.shots,wounds:__NM.sim.state.stats.wounds})"
            )
            aim = host.evaluate(
                """()=>{const p=__NM.sim.state.players.find(p=>p.seat===2),e=__NM.sim.state.enemies.find(e=>e.id==='chalk-rat-scratch'),v=__NM.game.view.p(e.x-p.x,e.y-p.y,0),l=Math.hypot(...v);return v.map(x=>x/l*.95);} """
            )
            guest.evaluate(
                "v=>{__testPad.axes=[0,0,...v];__testPad.buttons[7]={pressed:true,touched:true,value:1};}",
                aim,
            )
            guest.wait_for_timeout(40)
            guest.evaluate("__testPad.buttons[7]={pressed:false,touched:false,value:0}")
            host.wait_for_function(
                "__NM.sim.state.enemies.find(e=>e.id==='chalk-rat-scratch').hp===0",
                timeout=5000,
            )
            guest.wait_for_function(
                "__NM.sim.state.enemies.find(e=>e.id==='chalk-rat-scratch').hp===0",
                timeout=5000,
            )
            after = host.evaluate(
                "({ammo:__NM.sim.state.party.ammo,shots:__NM.sim.state.stats.shots,wounds:__NM.sim.state.stats.wounds})"
            )
            assert after["shots"] == before["shots"] + 1, (before, after)
            assert after["wounds"] == before["wounds"] + 1, (before, after)
            assert after["ammo"] == before["ammo"] - 1, (before, after)
            guest.wait_for_function(
                "n=>__NM.sim.state.party.ammo===n", arg=after["ammo"]
            )
            checks += 1
            neutral()
            # Walk the authored route; stop and deliberately shoot visible threats.
            # Host-local fire uses the same authority command path, while the exact
            # one-shot assertion above verifies the remote guest transport.
            drive_to(43.5 * 16, 8.5 * 16)
            drive_to(43.5 * 16, 23.5 * 16, combat=True)
            drive_to(42.5 * 16, 23.5 * 16, combat=True)
            drive_to(26.5 * 16, 27.5 * 16, combat=True)
            drive_to(11.5 * 16, 28.5 * 16, combat=True)
            drive_to(6.5 * 16, 27.5 * 16, combat=True)
            for page in [host, guest]:
                page.wait_for_function("__NM.sim.state.party.tools.includes('axe')")
            checks += 1
            host_party = host.evaluate("__NM.sim.state.party")
            guest.wait_for_function(
                "p=>JSON.stringify(__NM.sim.state.party)===JSON.stringify(p)",
                arg=host_party,
            )
            checks += 1
            assert not errors, errors
            for page in [host, guest]:
                assert page.evaluate("__NM.game.errors.length") == 0
                diagnostics = page.evaluate("__NM.net.diagnostics")
                assert diagnostics["maxBytes"] <= 15000
                assert diagnostics["maxPerSecond"] <= 18
            checks += 1
            tick = host.evaluate("__NM.sim.state.tick")
            guest.evaluate("__NM.net.close()")
            host.wait_for_function(
                "__NM.mode==='solo' && __NM.sim.state.players.length===1"
            )
            host.wait_for_function("tick=>__NM.sim.state.tick>tick+10", arg=tick)
            assert host.evaluate("__NM.sim.state.party.tools.includes('axe')")
            checks += 1
            # A fresh handshake is a late join to the existing host expedition.
            # It must retain the axe, guards, ammunition and clock, and create
            # only the newly accepted seat at a protected safe party anchor.
            retained = host.evaluate(
                "({tick:__NM.sim.state.tick,party:NM.clone(__NM.sim.state.party),enemies:__NM.sim.state.enemies.map(e=>({id:e.id,hp:e.hp}))})"
            )
            invitation2 = host.evaluate("__NM.net.host({lan:true})")
            reply2 = guest.evaluate("code=>__NM.net.join(code)", invitation2)
            host.evaluate("code=>__NM.net.accept(code)", reply2)
            for page in [host, guest]:
                page.wait_for_function(
                    "__NM.net.running && __NM.sim.state.players.length===2 && __NM.sim.state.party.tools.includes('axe')"
                )
            restored = host.evaluate(
                """()=>{const s=__NM.sim.state,p=s.players[0],q=s.players[1];return {tick:s.tick,party:s.party,enemies:s.enemies.map(e=>({id:e.id,hp:e.hp})),distance:Math.hypot(p.x-q.x,p.y-q.y),valid:NM.Geometry.validCircle(__NM.sim.level,q.x,q.y,q.r),invuln:q.invuln};}"""
            )
            assert restored["tick"] >= retained["tick"], (retained, restored)
            assert restored["party"] == retained["party"], (retained, restored)
            assert restored["enemies"] == retained["enemies"], (retained, restored)
            assert (
                restored["distance"] <= 32
                and restored["valid"]
                and restored["invuln"] > 0
            ), restored
            checks += 1
            guest.wait_for_function(
                "p=>JSON.stringify(__NM.sim.state.party)===JSON.stringify(p)",
                arg=retained["party"],
            )
            guest.evaluate("__NM.net.close()")
            host.wait_for_function(
                "__NM.mode==='solo' && __NM.sim.state.players.length===1"
            )
            assert host.evaluate("__NM.sim.state.party.tools.includes('axe')")
            checks += 1
            notes.append(
                {
                    "combat": {"before": before, "after": after},
                    "party": host_party,
                    "hostContinuesSolo": True,
                    "lateJoinPreservesExpedition": True,
                    "safeProtectedSpawn": True,
                }
            )
        finally:
            host_context.close()
            guest_context.close()
            browser.close()
            (DEV / "docs" / "network-game-report.json").write_text(
                json.dumps({"checks": checks, "evidence": notes}, indent=2)
            )
    return checks


if __name__ == "__main__":
    try:
        print(json.dumps({"networkGameBrowserChecks": run()}))
    except Exception as error:
        print(json.dumps({"failure": str(error)}))
        raise
