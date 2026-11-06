/** @file Persistent accessibility, audio, button-family and mouse settings. */
export type Options = {
  music: number;
  effects: number;
  voices: number;
  xbox: boolean;
  sensitivity: number;
  invert: boolean;
  rumble: boolean;
  assist: boolean;
  reduced: boolean;
  cpu: boolean;
};
export const defaultOptions = (): Options => ({
  music: 0.1,
  effects: 0.8,
  voices: 0.7,
  xbox: false,
  sensitivity: 0.003,
  invert: false,
  rumble: true,
  assist: false,
  reduced: false,
  cpu: true,
});
