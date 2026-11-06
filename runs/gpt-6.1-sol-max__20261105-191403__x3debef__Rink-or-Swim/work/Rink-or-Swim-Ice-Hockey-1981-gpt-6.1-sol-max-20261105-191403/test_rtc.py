"""Optional public-relay probe; unavailability is recorded as unknown."""

import contextlib
import json
import secrets

from playwright.sync_api import Error as PlaywrightError


def probe_rtc(browser, page, base, root):
    record = {"status": "unknown", "detail": "unknown"}
    context = browser.new_context(ignore_https_errors=True)
    guest = context.new_page()
    host_id = "rink-probe-" + secrets.token_hex(8)
    try:
        for target in [page, guest]:
            target.goto(base + "/rtc-fixture.html")
            target.add_script_tag(
                path=str(root / "node_modules/peerjs/dist/peerjs.min.js")
            )
        init = """id => {window.p=new Peer(id||undefined,{debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]}});window.rtc={open:false,error:'',received:''};p.on('open',()=>rtc.open=true);p.on('error',e=>rtc.error=e.type+': '+e.message);p.on('connection',c=>{c.on('data',d=>{rtc.received=d;c.send('cold ice');});});}"""
        page.evaluate(init, host_id)
        guest.evaluate(init, None)
        page.wait_for_function("rtc.open || rtc.error", timeout=16000)
        guest.wait_for_function("rtc.open || rtc.error", timeout=16000)
        if not page.evaluate("rtc.open") or not guest.evaluate("rtc.open"):
            record["detail"] = (
                "Public PeerJS relay unavailable: "
                + page.evaluate("rtc.error")
                + " / "
                + guest.evaluate("rtc.error")
            )
        else:
            guest.evaluate(
                "id=>{window.c=p.connect(id,{reliable:true,serialization:'json'});c.on('open',()=>c.send('hot sticks'));c.on('data',d=>rtc.received=d);c.on('error',e=>rtc.error=String(e));}",
                host_id,
            )
            guest.wait_for_function(
                'rtc.received === "cold ice" || rtc.error', timeout=16000
            )
            if (
                guest.evaluate("rtc.received") == "cold ice"
                and page.evaluate("rtc.received") == "hot sticks"
            ):
                record = {
                    "status": "verified",
                    "detail": "Two isolated browser contexts exchanged data through a real WebRTC data channel using the public PeerJS relay.",
                }
            else:
                record["detail"] = "WebRTC connectivity unknown: " + guest.evaluate(
                    "rtc.error"
                )
    except PlaywrightError as exc:
        record["detail"] = (
            "Public-relay / NAT connectivity unknown: " + str(exc).split("\n")[0]
        )
    finally:
        for target in [page, guest]:
            with contextlib.suppress(PlaywrightError):
                target.evaluate("window.p?.destroy()")
        context.close()
        (root / "rtc-probe.json").write_text(json.dumps(record, indent=2))
    return record
