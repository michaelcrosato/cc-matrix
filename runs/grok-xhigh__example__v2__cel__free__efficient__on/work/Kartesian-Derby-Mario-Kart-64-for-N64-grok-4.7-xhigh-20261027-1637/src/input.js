import { clamp } from "./math.js";

export const TOUCH_MESSAGE = "Controller or keyboard required";
export const ATTRACT_IDLE_SEC = 10;
const DEADZONE = 0.18;

export function neutralAction() {
  return {
    steer: 0,
    accel: false,
    brake: false,
    hop: false,
    useItem: false,
    camera: false,
    pause: false,
    confirm: false,
    back: false,
    menuX: 0,
    menuY: 0,
  };
}

export function applyAxisInvert(x, y, settings) {
  return {
    x: settings && settings.invertX ? -x : x,
    y: settings && settings.invertY ? -y : y,
  };
}

export function touchGateVisible(env) {
  return !!(env && env.coarsePointer && !env.hover && env.maxTouchPoints > 0);
}

function buttonDown(buttons, index, threshold = 0.5) {
  return (buttons && buttons[index] ? buttons[index] : 0) > threshold;
}

export function actionsFromPad(pad, settings) {
  const axes = (pad && pad.axes) || [0, 0, 0, 0];
  const buttons = (pad && pad.buttons) || [];
  const stick = applyAxisInvert(axes[0] || 0, axes[1] || 0, settings || {});
  const steer = Math.abs(stick.x) < DEADZONE ? 0 : clamp(stick.x, -1, 1);
  const sy = Math.abs(stick.y) < DEADZONE ? 0 : stick.y;
  const dpadX = (buttonDown(buttons, 15) ? 1 : 0) - (buttonDown(buttons, 14) ? 1 : 0);
  const dpadY = (buttonDown(buttons, 13) ? 1 : 0) - (buttonDown(buttons, 12) ? 1 : 0);
  return {
    steer,
    accel: buttonDown(buttons, 7, 0.12),
    brake: buttonDown(buttons, 6, 0.12),
    hop: buttonDown(buttons, 5),
    useItem: buttonDown(buttons, 4),
    camera: buttonDown(buttons, 3),
    pause: buttonDown(buttons, 9),
    confirm: buttonDown(buttons, 0),
    back: buttonDown(buttons, 1),
    menuX: dpadX || (Math.abs(steer) > 0.55 ? Math.sign(steer) : 0),
    menuY: dpadY || (Math.abs(sy) > 0.55 ? Math.sign(sy) : 0),
  };
}

const KEYSETS = [
  { accel: "KeyW", brake: "KeyS", left: "KeyA", right: "KeyD", hop: "Space", item: "KeyF", camera: "KeyC", pause: "Escape" },
  { accel: "ArrowUp", brake: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", hop: "ShiftRight", item: "Slash", camera: "Quote", pause: "Enter" },
  { accel: "KeyI", brake: "KeyK", left: "KeyJ", right: "KeyL", hop: "KeyU", item: "KeyO", camera: "KeyP", pause: "" },
  { accel: "Numpad8", brake: "Numpad5", left: "Numpad4", right: "Numpad6", hop: "Numpad7", item: "Numpad9", camera: "NumpadAdd", pause: "" },
];

export function actionsFromKeys(down, playerIndex) {
  const keys = KEYSETS[playerIndex] || KEYSETS[0];
  const on = (code) => !!(code && down && down[code]);
  let steer = 0;
  if (on(keys.left)) steer -= 1;
  if (on(keys.right)) steer += 1;
  const menuX = playerIndex === 0
    ? (on("ArrowRight") || on("KeyD") ? 1 : 0) - (on("ArrowLeft") || on("KeyA") ? 1 : 0)
    : 0;
  const menuY = playerIndex === 0
    ? (on("ArrowDown") || on("KeyS") ? 1 : 0) - (on("ArrowUp") || on("KeyW") ? 1 : 0)
    : 0;
  return {
    steer,
    accel: on(keys.accel),
    brake: on(keys.brake),
    hop: on(keys.hop),
    useItem: on(keys.item),
    camera: on(keys.camera),
    pause: on(keys.pause),
    confirm: playerIndex === 0 && (on("Enter") || on("Space")),
    back: playerIndex === 0 && (on("Escape") || on("Backspace")),
    menuX,
    menuY,
  };
}

export function actionsFromMouse(mouse) {
  const buttons = (mouse && mouse.buttons) || [];
  return {
    steer: clamp((mouse && mouse.dx ? mouse.dx : 0) / 28, -1, 1),
    accel: !!buttons[0],
    brake: !!buttons[2],
    hop: !!buttons[1],
    useItem: !!(mouse && mouse.wheel),
    camera: false,
    pause: false,
    confirm: !!buttons[0],
    back: !!buttons[2],
    menuX: 0,
    menuY: 0,
  };
}

export function menuEdges(action, prev) {
  const current = action || neutralAction();
  const before = prev || neutralAction();
  return {
    menuX: current.menuX && !before.menuX ? current.menuX : 0,
    menuY: current.menuY && !before.menuY ? current.menuY : 0,
    confirm: !!(current.confirm && !before.confirm),
    back: !!(current.back && !before.back),
    pause: !!(current.pause && !before.pause),
  };
}

// The press that opens pause is still down on the next frame. Latch it so
// pause and back do not read as a fresh edge until the key is released.
export function seedHeldMenu(held) {
  return { ...neutralAction(), ...held, pause: true };
}

export function drivingActions({ pad, keys, mouse, settings, playerIndex, useMouse }) {
  const key = actionsFromKeys(keys, playerIndex || 0);
  const padAct = pad ? actionsFromPad(pad, settings) : null;
  const mouseAct = useMouse && mouse ? actionsFromMouse(mouse) : null;
  let steer = key.steer;
  if (padAct && Math.abs(padAct.steer) > Math.abs(steer)) steer = padAct.steer;
  if (mouseAct && Math.abs(mouseAct.steer) > 0.04) steer = mouseAct.steer;
  return {
    steer,
    accel: key.accel || !!(padAct && padAct.accel) || !!(mouseAct && mouseAct.accel),
    brake: key.brake || !!(padAct && padAct.brake) || !!(mouseAct && mouseAct.brake),
    hop: key.hop || !!(padAct && padAct.hop) || !!(mouseAct && mouseAct.hop),
    useItem: key.useItem || !!(padAct && padAct.useItem) || !!(mouseAct && mouseAct.useItem),
    camera: key.camera || !!(padAct && padAct.camera),
    pause: key.pause || !!(padAct && padAct.pause),
    confirm: key.confirm || !!(padAct && padAct.confirm),
    back: key.back || !!(padAct && padAct.back),
    menuX: (padAct && padAct.menuX) || key.menuX,
    menuY: (padAct && padAct.menuY) || key.menuY,
  };
}

export const CONTROL_LINES = [
  ["Right trigger", "Go"],
  ["Left trigger", "Brake. Hold it with a shield item to trail it."],
  ["Left stick", "Steer"],
  ["Right bumper", "Hop. Hold it through the turn. Two sparks, then let go."],
  ["Left bumper", "Use an item. Tap during the spin to take it early."],
  ["Triangle", "Camera"],
  ["Options", "Pause"],
  ["Keyboard", "WASD, Space, F, C, Esc. Extra drivers: arrows, IJKL, numpad."],
];
