import { sine, sample, beatSequence, triangle } from "./synth.js";
import { note } from "./theory.js";

export const bassTrack =
  (type, envelope) =>
  ({ t, key, fBeat }) =>
    (type(note(key[0] - 12), t) + sine(note(key[0] - 24), t)) *
    (sine(0.5, t) / 8 + (1 - 1 / 8)) *
    envelope(fBeat);

export const drumTrack =
  (sampleBuffer, pattern, ticksPerBeat = 4) =>
  ({ channel, songBeat, sampleRate }) =>
    sample(
      sampleBuffer,
      channel,
      beatSequence(
        pattern,
        (songBeat / (pattern.length / ticksPerBeat)) % 1,
        ticksPerBeat
      ) * sampleRate
    );

export const arpeggiatorTrack =
  (wave, envelope, speed = 8) =>
  ({ t, chordNotes, fBar, fBeat }) => {
    let b = fBeat % 1;
    let pos = (fBar * speed) % chordNotes.length;
    return wave(chordNotes[pos | 0], t) * envelope(pos % 1);
  };

export const chordTrack =
  (spacing = 0, envelope) =>
  ({ t, chordNotes, fBeat }) => {
    let out = 0;
    for (let i = 0; i < chordNotes.length; i++) {
      let note = chordNotes[i];
      if (fBeat > i * spacing)
        out += sine(note, t) * envelope(fBeat - i * spacing);
    }
    return out;
  };

// notes are [note#, startTick, length]
export const pianoRollTrack =
  (instrument, notes, ticksPerBeat = 4) =>
  ({ t, fBeat, fBar, sampleRate }, track) => {
    const trackTime = t - track.startTime;
    const fTick = (fBar - track.start) * 4 * ticksPerBeat;
    const ti = fTick % 1;
    let out = 0;
    for (let i = 0; i < notes.length; i++) {
      let n = notes[i];
      if (fTick < n[1] || fTick > n[1] + n[2]) continue;
      out += triangle(note(n[0]), t);
    }
    return out;
  };
