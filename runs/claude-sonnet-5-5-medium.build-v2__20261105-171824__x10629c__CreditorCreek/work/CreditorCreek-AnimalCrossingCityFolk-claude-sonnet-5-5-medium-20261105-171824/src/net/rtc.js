// Serverless WebRTC with invite codes: a Gate Pass (offer) and a Reply Slip (answer), deflate + base64. Not created in AI Hub sessions.
const enc = async (obj) => { const s = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('deflate-raw')); const buf = new Uint8Array(await new Response(s).arrayBuffer()); let b = ''; for (const x of buf) b += String.fromCharCode(x); return btoa(b); };
const dec = async (str) => { const bin = atob(str.trim()); const u = Uint8Array.from(bin, c => c.charCodeAt(0)); const s = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return JSON.parse(await new Response(s).text()); };
const gathered = (pc, ms = 4000) => new Promise(res => { if (pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, ms); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); });
const cfg = (ice) => ({ iceServers: ice === false ? [] : [{ urls: 'stun:stun.l.google.com:19302' }] });
export async function makeOffer(ice) { const pc = new RTCPeerConnection(cfg(ice)); const ch = pc.createDataChannel('cc'); await pc.setLocalDescription(await pc.createOffer()); await gathered(pc); return { pc, ch, code: await enc({ sdp: pc.localDescription.sdp, type: 'offer' }) }; }
export async function acceptOffer(code, ice) { const pc = new RTCPeerConnection(cfg(ice)); const chP = new Promise(r => { pc.ondatachannel = (e) => r(e.channel); }); await pc.setRemoteDescription(await dec(code)); await pc.setLocalDescription(await pc.createAnswer()); await gathered(pc); return { pc, chP, code: await enc({ sdp: pc.localDescription.sdp, type: 'answer' }) }; }
export async function finish(pc, code) { await pc.setRemoteDescription(await dec(code)); }
export const open = (ch) => new Promise((res, rej) => { if (ch.readyState === 'open') return res(); ch.onopen = () => res(); setTimeout(() => rej(new Error('no connection')), 15000); });
/** Pixel-styled DOM box for pasting or copying a code (needs a keyboard; says so). */
export function codeBox(title, text, readonly) {
  return new Promise(res => {
    const d = document.createElement('div'); d.id = 'codebox'; d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1c2ccc;z-index:99;font:16px monospace';
    d.innerHTML = `<div style="background:#f4f4f4;border:4px solid #ffcd75;padding:16px;width:min(720px,90vw);color:#1a1c2c"><div style="font-weight:bold;margin-bottom:6px">${title}</div><div style="font-size:12px;margin-bottom:6px">Needs a keyboard. ${readonly ? 'Copy it and send it to your friend (a friend code, but longer).' : 'Paste the code here, then press Done.'}</div><textarea id="codearea" style="width:100%;height:150px;font:12px monospace" ${readonly ? 'readonly' : ''}></textarea><div style="margin-top:8px"><button id="codecopy">Copy</button> <button id="codedone">Done</button></div></div>`;
    document.body.appendChild(d); const ta = d.querySelector('#codearea'); ta.value = text ?? ''; ta.focus(); if (readonly) ta.select();
    d.querySelector('#codecopy').onclick = async () => { ta.select(); try { await navigator.clipboard.writeText(ta.value); } catch { document.execCommand?.('copy'); } };
    d.querySelector('#codedone').onclick = () => { const v = ta.value; d.remove(); res(v); };
    d.addEventListener('keydown', (e) => e.stopPropagation());
  });
}
