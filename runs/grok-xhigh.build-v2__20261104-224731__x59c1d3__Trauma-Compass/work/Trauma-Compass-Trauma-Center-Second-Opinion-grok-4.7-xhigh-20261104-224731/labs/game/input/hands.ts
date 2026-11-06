/**
 * @file Cursors for up to four surgeons. Pads come from `navigator.getGamepads`. The keyboard and the mouse come
 * from the engine's input. Gift, drop, swap and hint are held here for one frame; the scene keeps them to one step.
 */
import { onFloor, screenRay, type CameraPose, type Input } from '../../../engine';
import { packHands } from '../op/codec';
import type { Hand } from '../op/types';
import { FIELD_AT } from '../scenes/room';

/** One surgeon's cursor, remembered between frames. */
interface Cursor {
  x: number;
  z: number;
  tool: number;
  site: number;
  radial: boolean;
  radialTool: number;
}

/** What a frame of devices asked the menus to do. */
export interface MenuEdges {
  accept: boolean;
  cancel: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pause: boolean;
  any: boolean;
  /** Pad index whose south button rose, or -1. */
  claim: number;
}

/** Feel numbers the page reads. The sim does not see the view ones. */
export interface Feel {
  speed: number;
  curve: number;
  magnet: number;
  precision: boolean;
}

const cursors: Cursor[] = [0, 1, 2, 3].map(() => ({ x: 0, z: 0, tool: 1, site: 0, radial: false, radialTool: 1 }));
const padWas: boolean[][] = [[], [], [], []];
const roseNow: boolean[][] = [[], [], [], []];
let pointerX = 0;
let pointerY = 0;
let pointerLive = false;
let sampled = false;

/** Remember the pointer. Called once from the page. */
export function watchPointer(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerLive = true;
  });
}

/** Connected pads in seat order. */
function pads(): Gamepad[] {
  const list = navigator.getGamepads?.() ?? [];
  const out: Gamepad[] = [];
  for (const pad of list) if (pad && pad.connected) out.push(pad);
  return out;
}

/** A pad button is down. */
function down(pad: Gamepad | undefined, index: number): boolean {
  return !!pad && !!pad.buttons[index]?.pressed;
}

/** The button rose in the sample for this frame. */
function tapped(seat: number, index: number): boolean {
  return roseNow[seat]?.[index] === true;
}

/** Stick deflection past a dead zone, then the curve. */
function lean(value: number, curve: number): number {
  const dead = 0.18;
  const sign = value < 0 ? -1 : 1;
  const mag = Math.abs(value);
  if (mag < dead) return 0;
  const scaled = (mag - dead) / (1 - dead);
  return sign * Math.pow(scaled, curve);
}

/** Clamp a cursor to the sheet. */
function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** Put seat 0 on the point under the pointer, when the pointer has moved. */
function aimMouse(camera: CameraPose, canvas: HTMLCanvasElement): void {
  if (!pointerLive) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const ndcX = ((pointerX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -(((pointerY - rect.top) / rect.height) * 2 - 1);
  const hit = onFloor(screenRay(camera, [ndcX, ndcY], rect.width / rect.height), FIELD_AT.y);
  if (!hit) return;
  cursors[0].x = clamp(hit[0] - FIELD_AT.x, 8);
  cursors[0].z = clamp(hit[2] - FIELD_AT.z, 5);
  pointerLive = false;
}

/** Move a seat from its pad, and open the radial on the right stick. */
function aimPad(seat: number, pad: Gamepad, dt: number, feel: Feel): void {
  const cursor = cursors[seat];
  const scale = feel.precision || down(pad, 6) ? 0.4 : 1;
  cursor.x = clamp(cursor.x + lean(pad.axes[0] ?? 0, feel.curve) * feel.speed * scale * dt, 8);
  cursor.z = clamp(cursor.z + lean(pad.axes[1] ?? 0, feel.curve) * feel.speed * scale * dt, 5);
  const rx = pad.axes[2] ?? 0;
  const ry = pad.axes[3] ?? 0;
  const mag = Math.hypot(rx, ry);
  if (mag > 0.55) {
    cursor.radial = true;
    const turns = (Math.atan2(rx, -ry) / (Math.PI * 2) + 1) % 1;
    cursor.radialTool = Math.min(7, Math.floor(turns * 8));
  } else if (cursor.radial) {
    cursor.tool = cursor.radialTool;
    cursor.radial = false;
  }
  if (tapped(seat, 4)) cursor.tool = (cursor.tool + 7) % 8;
  if (tapped(seat, 5)) cursor.tool = (cursor.tool + 1) % 8;
}

/** Keyboard aim for seat 0 when no pad owns it, plus the number keys. */
function aimKeys(input: Input, dt: number, feel: Feel, sites: number): void {
  const cursor = cursors[0];
  const scale = feel.precision || input.held('precision') ? 0.4 : 1;
  let x = 0;
  let z = 0;
  if (input.held('east')) x += 1;
  if (input.held('west')) x -= 1;
  if (input.held('south')) z += 1;
  if (input.held('north')) z -= 1;
  const mag = Math.hypot(x, z) || 1;
  cursor.x = clamp(cursor.x + (x / mag) * feel.speed * scale * dt, 8);
  cursor.z = clamp(cursor.z + (z / mag) * feel.speed * scale * dt, 5);
  if (input.pressed('toolNext')) cursor.tool = (cursor.tool + 1) % 8;
  if (input.pressed('toolPrev')) cursor.tool = (cursor.tool + 7) % 8;
  for (let tool = 0; tool < 8; tool++) if (input.pressed(`tool${tool + 1}`)) cursor.tool = tool;
  if (input.pressed('siteNext')) cursor.site = (cursor.site + 1) % sites;
  if (input.pressed('sitePrev')) cursor.site = (cursor.site + sites - 1) % sites;
  if (input.held('radial')) cursor.radial = true;
  else if (cursor.radial) {
    cursor.radial = false;
  }
}

/** Hands for the seats in this operation. */
export function readHands(
  input: Input,
  canvas: HTMLCanvasElement,
  camera: CameraPose,
  dt: number,
  seats: number,
  sites: number,
  feel: Feel,
): Hand[] {
  if (!sampled) samplePads();
  const list = pads();
  aimMouse(camera, canvas);
  if (!list.length) aimKeys(input, dt, feel, sites);
  const hands: Hand[] = [];
  for (let seat = 0; seat < seats; seat++) {
    const pad = list[seat];
    const cursor = cursors[seat];
    if (pad) aimPad(seat, pad, dt, feel);
    const use = (seat === 0 && input.held('use')) || down(pad, 7) || down(pad, 0);
    const gift = (seat === 0 && input.held('gift')) || down(pad, 3);
    const drop = (seat === 0 && input.held('drop')) || down(pad, 1);
    const swap = (seat === 0 && input.held('swap')) || down(pad, 11);
    const hint = (seat === 0 && input.held('hint')) || down(pad, 12);
    const paddle = down(pad, 6) && down(pad, 7);
    const syringe = (seat === 0 && input.pressed('syringe')) || tapped(seat, 2);
    if (syringe) cursor.tool = 5;
    if (pad && tapped(seat, 14)) cursor.site = (cursor.site + sites - 1) % sites;
    if (pad && tapped(seat, 15)) cursor.site = (cursor.site + 1) % sites;
    hands.push({
      x: cursor.x,
      z: cursor.z,
      tool: cursor.radial ? cursor.radialTool : cursor.tool,
      use,
      drop,
      gift,
      paddle: paddle || (seat === 0 && input.held('use') && input.held('radial')),
      site: cursor.site,
      swap,
      hint,
      radial: cursor.radial,
    });
  }
  return hands;
}

/** The packed list the scene reads. */
export function packedHands(
  input: Input,
  canvas: HTMLCanvasElement,
  camera: CameraPose,
  dt: number,
  seats: number,
  sites: number,
  feel: Feel,
): number[] {
  return packHands(readHands(input, canvas, camera, dt, seats, sites, feel));
}

/** Local gloves, ahead of the sim. */
export function gloveSpots(seats: number): { x: number; z: number }[] {
  return cursors.slice(0, seats).map((cursor) => ({ x: cursor.x, z: cursor.z }));
}

/** Read every pad once this frame. Menu edges and tool taps share it. */
export function samplePads(): MenuEdges {
  const edges: MenuEdges = {
    accept: false,
    cancel: false,
    up: false,
    down: false,
    left: false,
    right: false,
    pause: false,
    any: false,
    claim: -1,
  };
  const list = pads();
  for (let seat = 0; seat < 4; seat++) {
    const pad = list[seat];
    for (let index = 0; index < 16; index++) {
      const now = down(pad, index);
      roseNow[seat][index] = now && padWas[seat][index] !== true;
      padWas[seat][index] = now;
    }
    if (!pad) continue;
    const create = down(pad, 8);
    if (tapped(seat, 0)) {
      edges.accept = true;
      edges.claim = seat;
    }
    if (tapped(seat, 1)) edges.cancel = true;
    if (tapped(seat, 12)) edges.up = true;
    if (tapped(seat, 13)) edges.down = true;
    if (tapped(seat, 14)) edges.left = true;
    if (tapped(seat, 15)) edges.right = true;
    if (!create && tapped(seat, 9)) edges.pause = true;
    const stick = Math.hypot(pad.axes[0] ?? 0, pad.axes[1] ?? 0) > 0.5;
    if (stick || pad.buttons.some((button) => button.pressed)) edges.any = true;
  }
  sampled = true;
  return edges;
}

/** Clear the sample so the next frame reads the pads again. */
export function endSample(): void {
  sampled = false;
}

/** True when the device has no fine pointer and no pad yet. */
export function touchOnly(): boolean {
  const fine = window.matchMedia?.('(any-pointer: fine)').matches ?? true;
  return !fine && pads().length === 0;
}
