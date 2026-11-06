/**
 * @file The friendly page for a browser with no WebGPU: never a blank page.
 *
 * Game code, a page's.
 *
 * @example
 * // if (!(await hasWebGpu())) showNoWebGpu();
 */

/** Whether this browser can give an adapter. */
export async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

/** Shows the page. */
export function showNoWebGpu(): void {
  const msg = document.getElementById('msg');
  if (!msg) return;
  msg.hidden = false;
  msg.innerHTML =
    '<b>Teeter Fit</b><span>This game needs a browser with WebGPU, such as current Chrome or Edge.</span>';
  const canvas = document.querySelector('canvas');
  if (canvas) canvas.style.display = 'none';
}
