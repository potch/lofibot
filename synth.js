import { Hz } from "./theory.js";

// sine generator
export const sine = (f, t) => Math.sin(f * Hz * t);
export const square = (f, t) => Math.sign(sine(f, t));
export const triangle = (f, t) => {
  let i = (t * f) % 1;
  if (i <= 0.25) return i * 4;
  if (i < 0.75) return 4 * (0.5 - i);
  return -(1 - i) * 4;
};
export const noise = () => Math.random() * 2 - 1;

// audio mixing
export const mix = (...parts) =>
  parts.reduce((sum, part) => sum + part, 0) / Math.sqrt(parts.length);

// sampling
export const loadSound = (ctx, path) =>
  fetch(path)
    .then(r => r.arrayBuffer())
    .then(buffer => ctx.decodeAudioData(buffer));

export const sample = (buffer, channel, i) =>
  buffer.getChannelData(channel % channel.numberOfChannels)[i | 0] || 0;

export const timeSample = (buffer, channel, t) =>
  buffer.getChannelData(channel % channel.numberOfChannels)[
    ((t / buffer.sampleRate) * buffer.length) | 0
  ] || 0;

// *...*..**...*..., 16, 4
export const beatSequence = (sequence, t, factor) => {
  let tick = t * sequence.length;
  if (sequence[tick | 0] === "*") return (tick % 1) / factor;
  return 0;
};

export const envelope = (attack, sustain, release) => t => {
  if (t < 0) return 0;
  if (t < attack) {
    return t / attack;
  }
  if (t < sustain) {
    return 1;
  }
  if (t < release) {
    return 1 - (t - sustain) / release;
  }
  return 0;
};
