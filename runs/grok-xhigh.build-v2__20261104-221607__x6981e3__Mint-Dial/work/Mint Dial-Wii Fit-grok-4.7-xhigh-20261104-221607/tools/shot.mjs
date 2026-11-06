/** Step, capture the WebGPU frame, composite canvases, return a PNG data URL. */
import { writeFileSync } from 'node:fs';

export function writePng(file, dataUrl) {
  writeFileSync(file, Buffer.from(String(dataUrl).split(',')[1], 'base64'));
}

export async function grab(page) {
  return page.evaluate(async () => {
    const engine = window.__PIXEL_ENGINE__;
    const app = window.__GAME__;
    let frame;
    try {
      if (!engine.started) await window.__PIXEL_READY__;
      engine.step(20);
      frame = await engine.renderer.capture();
    } catch (err) {
      return { error: String(err && err.stack || err) };
    }
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d');
    const pixels = new Uint8ClampedArray(frame.pixels);
    ctx.putImageData(new ImageData(pixels, frame.width, frame.height), 0, 0);
    // The scene canvas is already in the capture. Draw only the pixel HUD, or the scene canvas paints over it.
    const huds = [...document.querySelectorAll('canvas')].filter((c) => c.dataset.hud === 'true' && c.width > 0);
    for (const hud of huds) {
      try { ctx.drawImage(hud, 0, 0, frame.width, frame.height); } catch { /* a canvas may be tainted or empty */ }
    }
    const band = ctx.getImageData(0, 8, frame.width, 1).data;
    let navy = 0;
    for (let i = 0; i < band.length; i += 16) {
      if (band[i + 2] > band[i] + 20 && band[i + 2] > band[i + 1] && band[i] < 80) navy += 1;
    }
    let min = 255;
    let max = 0;
    const step = Math.max(1, Math.floor(pixels.length / 4 / 4000)) * 4;
    for (let i = 0; i < pixels.length; i += step) {
      const luma = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
      if (luma < min) min = luma;
      if (luma > max) max = luma;
    }
    const state = app.state();
    return {
      width: frame.width,
      height: frame.height,
      span: max - min,
      url: canvas.toDataURL('image/png'),
      title: state.title,
      mode: state.mode,
      music: state.music,
      row: state.row,
      hudW: app.ctx.hud.width,
      hudH: app.ctx.hud.height,
      hudCanvases: huds.length,
      navy,
    };
  });
}
