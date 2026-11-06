// Input becomes intent. Keyboard and mouse, a pad, the network or a bot: the sim can't tell which.
export const BTN = { S0: 1, S1: 2, S2: 4, S3: 8, S4: 16, S5: 32, DODGE: 64, POTION: 128, INTERACT: 256, BELL: 512 };
export const SLOT_BITS = [BTN.S0, BTN.S1, BTN.S2, BTN.S3, BTN.S4, BTN.S5];
export const emptyIntent = () => ({ mx: 0, mz: 0, ax: 0, az: 0, aimed: 0, tgt: 0, held: 0, pressed: 0, goal: null });
export const EMPTY_INTENT = Object.freeze(emptyIntent());
