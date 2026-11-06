"""Native OfflineAudioContext validation; no audio files and no network access."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

passed = 0
failed = 0

def check(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
    else:
        failed += 1
        print(f"FAIL audio: {name}: {details}", file=sys.stderr)

try:
    source = Path(__file__).with_name("audio.js").read_text().replace("export function createAudio", "function createAudio")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            result = page.evaluate("""async source => {
                eval(source + ';globalThis.createAudio=createAudio');
                const renderStats=buffer=>{
                    let sum=0,peak=0,invalid=0;
                    const data=buffer.getChannelData(0);
                    for(const value of data){sum+=value*value;peak=Math.max(peak,Math.abs(value));if(!Number.isFinite(value))invalid++;}
                    return {rms:Math.sqrt(sum/data.length),peak,invalid};
                };
                const effectContext=new OfflineAudioContext(2,22050*5,22050);
                const effects=createAudio({context:effectContext});
                const defaults=effects.debug();
                await effects.unlock();
                const names=['pickup','bond','pulse','jump','alert','hide','signal','launch','win','click','step','bump','checkpoint'];
                names.forEach(name=>effects.sfx(name));
                effects.voice('little visitor');
                const effectDebug=effects.debug();
                const effectStats=renderStats(await effectContext.startRendering());
                const musicContext=new OfflineAudioContext(2,22050*2,22050);
                const music=createAudio({context:musicContext});
                await music.unlock();
                const musicStats=renderStats(await musicContext.startRendering());
                music.setMusic(-5); music.setSfx(10);
                const clamped=music.debug();
                for(const mood of ['explore','sneak','flight','win']) music.setMood(mood);
                music.setMood('invalid');
                return {defaults,effectDebug,effectStats,musicStats,clamped,mood:music.debug().mood};
            }""", source)
            check("music starts at ten percent", result["defaults"]["musicVolume"] == 0.1)
            check("all thirteen sound effects synthesize", result["effectDebug"]["sfxCount"] == 13)
            check("gibberish voice synthesizes", result["effectDebug"]["voiceCount"] == 1)
            check("effect output is audible", result["effectStats"]["rms"] > 0.005, result["effectStats"])
            check("effect samples are finite and unclipped", result["effectStats"]["invalid"] == 0 and 0 < result["effectStats"]["peak"] < 1, result["effectStats"])
            check("music alone is audible at default volume", result["musicStats"]["rms"] > 0.0001 and result["musicStats"]["invalid"] == 0, result["musicStats"])
            check("volume sliders clamp safely", result["clamped"]["musicVolume"] == 0 and result["clamped"]["effectsVolume"] == 1)
            check("score accepts supported moods and rejects invalid ones", result["mood"] == "win")
        finally:
            browser.close()
except Exception as error:
    failed += 1
    print(f"FAIL audio setup: {error}", file=sys.stderr)

print(f"Audio: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
