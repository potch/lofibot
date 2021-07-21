export const Hz = Math.PI * 2;
export const BPM = 1 / 60;

// convert MIDI note number to frequency
export const note = (n) => 440 * Math.pow(2, (n - 69) / 12);

// lookup for note name to note number
export const PITCHES = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// pitch like "c#" to frequency
export const pitch = (p, octave = 4) => {
  let base = PITCHES[p[0].toUpperCase()];
  if (p[1]) {
    if (p[1] === "#") {
      base++;
    }
    if (p[1] === "b") {
      base--;
    }
  }
  return octave * 12 + base;
};

// take note number plus intervals, spit out frequencies of chord notes
export const chord = (n, intervals) => intervals.map((i) => note(n + i));

// chord intervals in integer notation
export const CHORDS = {
  MAJOR: [0, 4, 7, 12],
  SUS4: [0, 5, 7, 12],
  MAJOR7: [0, 4, 7, 14],
  MAJOR9: [0, 4, 7, 11, 14, 19],
  MINOR: [0, 3, 7, 12],
  MINOR7: [0, 3, 7, 10],
  MINOR9: [0, 3, 7, 10, 14, 17],
  MINOR11: [0, 3, 7, 10, 17],
  DIM7: [0, 3, 6, 9],
  DOM7: [0, 4, 7, 10],
  DOM9: [0, 4, 7, 10, 14],
};

