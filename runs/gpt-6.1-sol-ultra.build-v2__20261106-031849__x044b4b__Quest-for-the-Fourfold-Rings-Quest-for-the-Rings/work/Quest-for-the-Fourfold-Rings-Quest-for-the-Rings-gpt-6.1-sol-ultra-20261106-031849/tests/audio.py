"""Procedural audio evidence; invoked by tools/test.mjs, no physical listener."""
import json
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]

def run_audio(page):
    page.add_script_tag(path=str(ROOT / 'src/audio/audio.js'))
    result = page.evaluate('''async () => {
      const failures = [];
      const checks = [];
      const assert = (ok, msg) => { checks.push(msg); if (!ok) failures.push(msg); };
      assert(RingAudio.defaults.music === .10, 'first-run music is 10%');
      RingAudio.configure({music:.7}); RingAudio.reset();
      assert(RingAudio.debug().volumes.music === .10, 'reset music is 10%');
      const measurements = [];
      const measure = async (opts, seconds = 6) => {
        const ctx = new OfflineAudioContext(1, 44100 * seconds, 44100);
        const buffer = await RingAudio.renderOffline(ctx, opts);
        const d = buffer.getChannelData(0);
        let peak = 0, sum = 0, nonfinite = 0;
        for (const v of d) { if (!Number.isFinite(v)) nonfinite++; peak = Math.max(peak, Math.abs(v)); sum += v*v; }
        return { peak, rms:Math.sqrt(sum/d.length), nonfinite, length:d.length, duration:buffer.duration, tail:Math.max(...d.slice(-2205).map(Math.abs)) };
      };
      for (const scene of ['title','courtyard','dungeon','crystal','inferno','shifting','final','victory']) {
        const m = await measure({kind:'music',scene}); measurements.push({scene,...m});
        assert(m.peak > .0001 && m.peak < 1 && m.nonfinite === 0 && m.duration === 6, scene + ' music is finite, audible and unclipped');
      }
      for (const effects of [['sword','bolt','revive','pickup','shift','flame'],['hurt','down','stun','ward','phase','cloak'],['lure','reveal','possession','dragon','dodge','seal']]) {
        const m = await measure({kind:'effects',effects},7); measurements.push({effects,...m});
        assert(m.peak > .001 && m.peak < 1 && m.nonfinite === 0 && m.tail < .0001, 'effect group has finite envelope and silent tail: ' + effects.join(','));
      }
      const voice = await measure({kind:'voice'},2); measurements.push({voice:true,...voice});
      assert(voice.peak > .001 && voice.peak < 1 && voice.tail < .0001, 'gibberish voice is finite and ends');
      const mutedMusic = await measure({kind:'music',volumes:{music:0}});
      const mutedSfx = await measure({kind:'effects',volumes:{sfx:0}});
      const mutedVoice = await measure({kind:'voice',volumes:{voice:0}},2);
      const mutedMaster = await measure({kind:'all',volumes:{master:0}});
      assert([mutedMusic,mutedSfx,mutedVoice,mutedMaster].every(m=>m.peak===0), 'independent bus and master mute produce exact silence');
      RingAudio.dispose();
      assert(RingAudio.debug().activeSources === 0, 'dispose clears owned voices');
      return {failures, count:checks.length, measurements, standIn:'Chromium OfflineAudioContext; no human listener'};
    }''')


    mapped = page.evaluate("""async () => {
      const sounds=[];
      const fake={ctx:{state:'running'},ready:true,instrument(){},define(){},applyVolume(){},bus(){return {};},music(){},sfx(name){sounds.push(name);return {playing:false};}};
      RingAudio.attach(fake);await RingAudio.unlock();
      for(const classId of ['wizard','phantom','changeling'])RingAudio.event({type:'attack',hero:1,classId});
      for(const classId of ['phantom','changeling','warrior'])RingAudio.event({type:'power',hero:1,classId});
      RingAudio.event({type:'director',event:'echo'});RingAudio.dispose();
      return sounds;
    }""")
    result['count'] += 1
    if mapped != ['fourfold-bolt','fourfold-reveal','fourfold-lure','fourfold-phase','fourfold-cloak','fourfold-ward','fourfold-possession']:
        result['failures'].append('simulation classId/hero-id events select distinct kit audio: '+str(mapped))
    page.add_script_tag(path=str(ROOT / 'vendor/engine/my-3d2dge.js'))
    page.evaluate("""() => {
      document.body.innerHTML = '<canvas id="audio-canvas"></canvas><button id="unlock-audio">Unlock sound</button>';
      window.audioGame = new My3D2dge.Game({canvas:'audio-canvas', res:'ps1', view:'threequarter', loop:false, menu:false, autoPause:false});
      RingAudio.attach(audioGame.audio);
      document.querySelector('#unlock-audio').onclick = () => RingAudio.unlock();
    }""")
    page.click('#unlock-audio')
    page.wait_for_timeout(100)
    realtime = page.evaluate("""() => {
      const state = RingAudio.debug();
      RingAudio.event({type:'dragon',id:'audio-test-dragon'});
      RingAudio.babble('ringmaster','Beyond the seal, the sleeping fire hears thee.');
      return {ready:audioGame.audio.ready, state, voices:RingAudio.debug().activeSources};
    }""")
    page.wait_for_timeout(100)
    paused = page.evaluate("""() => {
      RingAudio.pause(true);
      const state = RingAudio.debug();
      RingAudio.event({type:'flame',id:'while-paused'});
      return {...state, afterSuppressed:RingAudio.debug().activeSources, song:!!audioGame.audio.song};
    }""")
    resumed = page.evaluate("""() => {
      RingAudio.pause(false); RingAudio.setScene('crystal');
      return RingAudio.debug();
    }""")
    ended = page.evaluate("""() => {
      RingAudio.dispose();
      const state = RingAudio.debug(); audioGame.dispose(); return state;
    }""")
    checks = [
      (realtime['ready'] and realtime['state']['context'] == 'running', 'native ChipAudio unlocks only on user gesture'),
      (realtime['voices'] > 0, 'native effects and formant voice create finite sources'),
      (paused['activeSources'] == 0 and paused['afterSuppressed'] == 0 and not paused['song'], 'pause stops music/sources and suppresses effects'),
      (resumed['playingScene'] == 'crystal', 'resume and scene change restart one native song'),
      (ended['activeSources'] == 0 and ended['disposed'], 'native lifecycle teardown has no owned sources'),
    ]
    result['count'] += len(checks)
    result['failures'] += [name for ok, name in checks if not ok]
    result['nativeLifecycle'] = { 'realtime':realtime, 'paused':paused, 'resumed':resumed, 'ended':ended }
    return result

if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content('<!doctype html><meta charset="utf-8"><title>Fourfold audio verification</title>')
        result = run_audio(page)
        (ROOT / 'evidence/audio.json').write_text(json.dumps(result, indent=2))
        browser.close()
    for failure in result['failures']:
        print('FAIL '+failure)
    failed = len(result['failures'])
    print(f"{result['count'] - failed} passed, {failed} failed")
    raise SystemExit(bool(failed))
