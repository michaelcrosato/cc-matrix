"""Deterministic network lifecycle checks plus two-context WebRTC integration."""

import argparse
import json
import re
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
NODE_CHECKS = r"""
import {Network} from './online.js';
import assert from 'node:assert/strict';
let count=0; const failures=[];
const test=async(name,fn)=>{try{await fn();count++;}catch(error){failures.push(name+': '+error.message);}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const states=[];let hostStarts=0,guestStarts=0,finish;
const host=new Network({onStart:()=>hostStarts++});
const guest=new Network({onStart:()=>guestStarts++,onState:s=>states.push(s),onFinish:r=>finish=r});
await test('room creation',async()=>{const code=await host.host();assert.match(code,/^[A-Z2-9]{6}$/);await guest.join(code);assert.equal(host.connected,true);assert.equal(guest.connected,true);assert.equal(hostStarts,1);assert.equal(guestStarts,1);});
await test('host authority state',async()=>{host.publish({phase:3,players:[{x:2,y:4}]},true);await pause(15);assert.equal(states.at(-1).phase,3);assert.equal(states.at(-1).players[0].x,2);});
await test('guest input clamp',async()=>{guest.sendInput({x:99,jump:true});await pause(15);assert.deepEqual(host.getInput(1),{x:1,jump:true,kick:false,drop:false,pulse:false});});
await test('brief pressure pulse survives throttling',async()=>{await pause(80);guest.sendInput({x:0});guest.sendInput({x:0,pulse:true});guest.sendInput({x:0,pulse:false});await pause(80);guest.sendInput({x:0});await pause(15);assert.equal(host.getInput(1).pulse,true);});
await test('input expiry',async()=>{await pause(510);assert.equal(host.getInput(1).x,0);assert.equal(host.getInput(1).pulse,false);});
await test('finish delivery',async()=>{host.finish({won:true,score:3210});await pause(15);assert.deepEqual(finish,{won:true,score:3210});});
let stateSequence, inputSequence, originalChannel;
await test('only host can request standalone rematch',async()=>{assert.equal(guest.restart(),false);assert.equal(hostStarts,1);assert.equal(guestStarts,1);});
await test('rematch keeps crew and resets both starts',async()=>{stateSequence=host._stateSequence;inputSequence=guest._inputSequence;originalChannel=host.broadcast;guest._inputLatch.pulse=true;assert.equal(host.restart(),true);await pause(15);assert.equal(hostStarts,2);assert.equal(guestStarts,2);assert.equal(host.connected,true);assert.equal(guest.connected,true);assert.equal(host.broadcast,originalChannel);assert.equal(host._finished,false);assert.equal(guest._finished,false);assert.equal(guest._inputLatch.pulse,false);assert.equal(host.canStart,false);assert.equal(guest.canStart,false);assert.equal(host.restart(),false);});
await test('prior round packets cannot leak into rematch',async()=>{const previous=states.length;guest._receive({bb:1,type:'state',round:1,seq:10000,state:{phase:99}},0,'broadcast');host._receive({bb:1,type:'input',round:1,seq:10000,input:{x:1,pulse:true}},1,'broadcast');assert.equal(states.length,previous);assert.equal(host.getInput(1).pulse,false);await pause(770);assert.equal(host.canStart,true);assert.equal(guest.canStart,true);guest.sendInput({x:-1,pulse:true});host.publish({phase:1},true);await pause(15);assert.equal(host.getInput(1).x,-1);assert.equal(host.getInput(1).pulse,true);assert.equal(states.at(-1).phase,1);assert.ok(host._stateSequence>stateSequence);assert.ok(guest._inputSequence>inputSequence);});
await test('second round can report a second finish',async()=>{host.finish({won:false,score:4321});await pause(15);assert.deepEqual(finish,{won:false,score:4321});assert.equal(guest._finished,true);});
await test('disconnect delivery',async()=>{guest.close();await pause(15);assert.equal(host.connected,false);assert.deepEqual(host.playerIds,[0]);assert.equal(host.restart(),false);});
host.close();guest.close();
let handlers={},ready=0,packets=[],finished;
globalThis.AIHub={active:true,players:[{id:0,name:'Red'},{id:1,name:'Blue'}],host:2,connect:async()=>({isHost:true,server:true,me:2,host:2,players:globalThis.AIHub.players}),on:(e,fn)=>{handlers[e]=fn;return()=>{};},send:(p,o)=>{packets.push([p,o]);return true;},ready:()=>ready++,finish:r=>finished=r};
const hub=new Network();await test('server host round',async()=>{const info=await hub.initHub();assert.equal(info.server,true);assert.equal(hub.localSeat,-1);assert.deepEqual(hub.playerIds,[0,1]);hub.ready();assert.equal(ready,1);handlers.start({in:0});assert.equal(hub.canStart,true);assert.equal(hub.restart(),false);});
await test('Hub input and state',async()=>{handlers.message({bb:1,type:'input',seq:1,input:{x:-1,kick:true,pulse:true}},0);assert.equal(hub.getInput(0).kick,true);assert.equal(hub.getInput(0).pulse,true);hub.publish({phase:2},true);assert.equal(packets.at(-1)[0].type,'state');});
await test('time-up valid finish',async()=>{handlers['time-up']({graceMs:1000});assert.deepEqual(finished.standings,[[0,1]]);assert.equal(finished.won,false);});
await test('end stops sending',async()=>{handlers.end({reason:'finished'});const n=packets.length;hub.publish({phase:3},true);assert.equal(packets.length,n);assert.equal(hub.canStart,false);});
console.log(JSON.stringify({count,failures}));
"""


def start_server():
    process = subprocess.Popen(
        [
            "python3",
            "-u",
            "-m",
            "http.server",
            "0",
            "--bind",
            "127.0.0.1",
            "--directory",
            str(HERE),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    line = process.stdout.readline()
    match = re.search(r"port (\d+)", line)
    if not match:
        process.terminate()
        process.wait(timeout=10)
        raise RuntimeError("Network test server did not report its assigned port")
    return process, "http://127.0.0.1:" + match[1]


def run(include_webrtc=True):
    count = 0
    failures = []
    process = None
    try:
        node = subprocess.run(
            ["node", "--input-type=module"],
            cwd=HERE,
            input=NODE_CHECKS,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        if node.returncode:
            failures.append("Network module runner: " + node.stderr.strip())
        else:
            result = json.loads(node.stdout)
            count += result["count"]
            failures.extend(result["failures"])
        if include_webrtc:
            process, base_url = start_server()
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                try:
                    contexts = [
                        browser.new_context(ignore_https_errors=True) for _ in range(2)
                    ]
                    pages = [context.new_page() for context in contexts]
                    for page in pages:
                        page.goto(
                            base_url + "/online.js", wait_until="domcontentloaded"
                        )
                        assert "class Network" in page.content(), (
                            "Wrong page served for the network test"
                        )
                        page.evaluate(
                            """async()=>{const {Network}=await import('/online.js');window.states=[];window.starts=[];window.net=new Network({onState:s=>states.push(s),onStart:s=>starts.push(s)});} """
                        )
                    code = pages[0].evaluate("async()=>await net.host()")
                    pages[0].wait_for_function("net._hostReady", timeout=25000)
                    pages[1].evaluate("code=>net.join(code)", code)
                    for page in pages:
                        page.wait_for_function("net.connected", timeout=25000)
                    count += 1
                    pages[0].evaluate(
                        "net.publish({stage:4,players:[{x:10,y:5}]},true)"
                    )
                    pages[1].wait_for_function("states.length>0", timeout=8000)
                    assert pages[1].evaluate("states.at(-1).stage") == 4
                    count += 1
                    pages[1].evaluate("net.sendInput({x:-1,jump:true,pulse:true})")
                    pages[0].wait_for_function(
                        "net.getInput(1).x===-1 && net.getInput(1).pulse", timeout=8000
                    )
                    count += 1
                    for page in pages:
                        page.evaluate("net.close()")
                    for context in contexts:
                        context.close()
                finally:
                    browser.close()
    except Exception as error:  # noqa: BLE001 — report runner failures in the single test summary
        failures.append("Network transport: " + str(error))
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)
    return count, failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-webrtc",
        action="store_true",
        help="Run local protocol checks without the public signaling service",
    )
    args = parser.parse_args()
    count, failures = run(not args.skip_webrtc)
    for failure in failures:
        print("FAIL " + failure)
    print(f"{count} passed, {len(failures)} failed (network)")
    raise SystemExit(bool(failures))
