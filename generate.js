import { BPM, pitch, CHORDS } from "./theory.js";

import { triangle, envelope, square } from "./synth.js";
import { clamp } from "./util.js";

import {
  arpeggiatorTrack,
  chordTrack,
  bassTrack,
  drumTrack,
  pianoRollTrack,
} from "./tracks.js";

const progressions = [
  [
    [pitch("D", 4), CHORDS.MINOR11],
    [pitch("Eb", 4), CHORDS.MINOR11],
    [pitch("D", 4), CHORDS.MINOR11],
    [pitch("Eb", 4), CHORDS.MINOR11],
  ],
  [
    [pitch("F", 4), CHORDS.MINOR9],
    [pitch("Eb", 4), CHORDS.MAJOR9],
    [pitch("F", 4), CHORDS.MINOR9],
    [pitch("Eb", 4), CHORDS.MAJOR9],
  ],
  [
    // Dmin11 – Gmin7 – Dmin11 – Ebmin11 – C#dim7
    [pitch("D", 4), CHORDS.MINOR11],
    [pitch("G", 4), CHORDS.MINOR7],
    [pitch("D", 4), CHORDS.MINOR11],
    [pitch("Eb", 4), CHORDS.MINOR11],
    [pitch("C#", 5), CHORDS.DIM7],
  ],
  // Amin11 – D7 – Fmaj7 – Cmaj7
  [
    [pitch("A", 4), CHORDS.MINOR11],
    [pitch("D", 4), CHORDS.DOM7],
    [pitch("F", 4), CHORDS.MAJOR7],
    [pitch("C", 4), CHORDS.MAJOR7],
  ],
  // Gmaj7 – F#min7 – Amin7b5
  [
    [pitch("G", 4), CHORDS.MAJOR7],
    [pitch("F#", 4), CHORDS.MINOR7],
    [pitch("E", 4), CHORDS.MINOR9],
    [pitch("A", 4), CHORDS.MINOR7],
  ],
  // C Am Dm G7
  [
    [pitch("C", 4), CHORDS.SUS4],
    [pitch("A", 4), CHORDS.MINOR7],
    [pitch("D", 4), CHORDS.MINOR7],
    [pitch("G", 4), CHORDS.MAJOR7],
  ],
];

/* generation process goals:
 * - pick a key
 * - generate chord progression
 * - generate sections (intro, A section, B section, Bridge, Outro)
 * - each section gets a different feel (progression variation/ arp/ melody line)
 * - join sections into tracks
 * - compute automations
 */

export function generate(context, knobs, samples) {
  const song = {
    tempo: 70 + Math.random() * 30,
    startTime: context.currentTime + 1,
  };

  song.progression = progressions[(Math.random() * progressions.length) | 0];

  let transpose = Math.round(Math.random() * 12);

  song.progression.forEach(chord => {
    chord[0] += transpose;
    chord[1] = [...chord[1]];
    for (let i = 1; i < chord[1].length; i++) {
      chord[1][i] -= Math.random() * 0.1;
    }
  });

  let snarePattern = "....*.......*...".split("");
  let hatPattern = "................................".split("");
  let kickPattern = "*.......*.......".split("");

  for (let i = 0; i < Math.random() * 4; i++) {
    kickPattern[(Math.random() * kickPattern.length) | 0] = "*";
  }
  const hatResolution = Math.floor(Math.random() * 7) + 2;
  for (let i = 0; i < hatPattern.length; i += hatResolution) {
    hatPattern[i] = "*";
  }
  let modCount = Math.random() * 8;
  for (let i = 0; i < modCount + 1; i++) {
    let pos = (Math.random() * hatPattern.length) | 0;
    if (hatPattern[pos] === "*") {
      hatPattern[pos] = ".";
    } else {
      hatPattern[pos] = "*";
    }
  }

  const arpSpeed = [8, 12, 16][(Math.random() * 3) | 0];

  const leadNotes = [];
  for (let i = 0; i < 100; i++) {
    leadNotes.push([(i % 24) + 57, i, (Math.random() * 3 + 1) | 0]);
  }

  song.length = song.progression.length * 16;
  song.automations = {
    volume: [
      [0, 0],
      [song.progression.length, 1],
      [song.length - song.progression.length, 1],
      [song.length, 0],
    ],
    filter: [
      [0, 1],
      [song.progression.length * 2 - 0.5, 1],
      [song.progression.length * 2, 0],
    ],
  };
  song.tracks = [
    {
      name: "bass",
      start: 0,
      render: bassTrack(triangle, envelope(0.25, 1, 3.9)),
      volume: 0.2,
    },
    {
      name: "snare",
      start: 0,
      render: drumTrack(samples.snare, snarePattern),
      volume: 0.3,
    },
    {
      name: "kick",
      start: 0,
      render: drumTrack(samples.kick, kickPattern),
      volume: 0.3,
    },
    {
      name: "hat",
      start: 0,
      render: drumTrack(samples.hat, hatPattern),
      volume: 0.3,
    },
    {
      name: "arp",
      start: song.progression.length * 2,
      length: song.progression.length * 4,
      render: arpeggiatorTrack(triangle, envelope(0.1, 0.2, 0.99), arpSpeed),
      volume: 0.2,
    },
    {
      name: "arp",
      start: song.progression.length * 10,
      render: arpeggiatorTrack(triangle, envelope(0.1, 0.2, 0.99), arpSpeed),
      volume: 0.2,
    },
    {
      name: "chord",
      render: chordTrack(
        Math.floor(Math.random() * 8) / 8,
        envelope(0.1, 0.4, 4)
      ),
      start: 0,
      length: song.progression.length * 6,
      volume: 0.2,
    },
    {
      name: "chord",
      start: song.progression.length * 10,
      render: chordTrack(
        Math.floor(Math.random() * 8) / 8,
        envelope(0.1, 0.4, 4)
      ),
      volume: 0.2,
    },
  ];

  // song.tracks = [
  //   {
  //     name: "lead",
  //     start: 0,
  //     length: song.progression.length * 4,
  //     render: pianoRollTrack(square, leadNotes),
  //     volume: 0.2,
  //   },
  // ];

  // 4 / (60/60)
  let barDuration = 4 / (song.tempo * BPM);
  song.tracks.forEach(t => {
    t.startTime = (t.start || 0) * barDuration;
    if (t.end) {
      t.endTime = t.end * barDuration;
    } else if (t.length) {
      t.endTime = t.startTime + t.length * barDuration;
    } else {
      t.endTime = t.startTime + song.length * barDuration;
    }
  });

  if (song.automations.volume) {
    knobs.globalVolume.gain.cancelScheduledValues(song.startTime - 1);
    knobs.globalVolume.gain.setValueAtTime(1, song.startTime);
    song.automations.volume.forEach(([bar, value]) => {
      const time = bar * barDuration;
      knobs.globalVolume.gain.linearRampToValueAtTime(
        value,
        song.startTime + time
      );
    });
  }
  if (song.automations.filter) {
    knobs.filter.gain.cancelScheduledValues(context.currentTime);
    knobs.filter.frequency.cancelScheduledValues(context.currentTime);
    knobs.filter.Q.cancelScheduledValues(context.currentTime);
    knobs.filterFeed.gain.cancelScheduledValues(context.currentTime);
    knobs.filterBypass.gain.cancelScheduledValues(context.currentTime);

    song.automations.filter.forEach(([bar, value]) => {
      value = clamp(0, 1, value);
      const time = bar * barDuration;
      const globaltime = song.startTime + time;
      knobs.filter.gain.linearRampToValueAtTime(value * 200, globaltime);
      knobs.filter.frequency.linearRampToValueAtTime(
        10 + value * 2000,
        globaltime
      );
      knobs.filter.Q.linearRampToValueAtTime(1 + value * 9, globaltime);
      knobs.filterFeed.gain.linearRampToValueAtTime(value, globaltime);
      knobs.filterBypass.gain.linearRampToValueAtTime(1 - value, globaltime);
    });
  }

  return song;
}
