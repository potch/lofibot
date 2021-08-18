import { BPM, pitch, CHORDS, chord } from "./theory.js";

import { triangle, envelope, square } from "./synth.js";
import { clamp } from "./util.js";

import {
  arpeggiatorTrack,
  chordTrack,
  bassTrack,
  drumTrack,
  pianoRollTrack,
} from "./tracks.js";

const flip = (n, threshold) => Math.random() * n < threshold;
const randInt = (min, max) => Math.floor((max + 1 - min) * Math.random()) + min;

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

function kickPattern(length = 1) {
  let kickPattern = "*.......*.......".repeat(length).split("");
  for (let i = 0; i < Math.random() * 4; i++) {
    kickPattern[(Math.random() * kickPattern.length) | 0] = "*";
  }
  return kickPattern;
}
function snarePattern(length = 1) {
  let snarePattern = "....*.......*...".repeat(length).split("");
  return snarePattern;
}

function hatPattern(length = 1) {
  let hatPattern = "................".repeat(length).split("");
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
  return hatPattern;
}

function generateIntroSection({ song, samples }) {
  const length = song.progression.length * randInt(1, 2);
  const section = {
    length,
    automations: [
      { name: "volume", values: [[0, 0]] },
      {
        name: "filter",
        values: [
          [0, 1],
          [length - 1, 1],
        ],
      },
    ],
    tracks: [],
  };
  // maybe include drums
  if (flip(3, 2)) {
    section.tracks.push({
      name: "snare",
      chunk: {
        render: drumTrack(samples.snare, snarePattern()),
        start: 0,
      },
    });
    // if there's drums, maybe add hat
    if (flip(3, 2)) {
      section.tracks.push({
        name: "hat",
        chunk: {
          render: drumTrack(samples.hat, hatPattern(2)),
        },
      });
      // if there's hat, maybe add kick
      if (flip(3, 2)) {
        section.tracks.push({
          name: "kick",
          chunk: {
            render: drumTrack(samples.kick, kickPattern(2)),
          },
        });
      }
    }
  }
  section.tracks.push({
    name: "chord",
    chunk: {
      render: chordTrack(
        Math.floor(Math.random() * 8) / 8,
        envelope(0.1, 0.4, 4)
      ),
    },
  });
  section.tracks.push({
    name: "bass",
    chunk: {
      render: bassTrack(triangle, envelope(0.25, 1, 3.9)),
    },
  });
  return section;
}

function generateMainSection({ song, samples }) {
  const length = song.progression.length * randInt(2, 4);
  const section = {
    length,
    automations: [
      {
        name: "volume",
        values: [
          [0, 1],
          [length - 1, 1],
        ],
      },
      {
        name: "filter",
        values: [[0, 0]],
      },
    ],
    tracks: [
      {
        name: "snare",
        chunk: {
          render: drumTrack(samples.snare, snarePattern()),
        },
      },
      {
        name: "hat",
        chunk: {
          render: drumTrack(samples.hat, hatPattern(2)),
        },
      },
      {
        name: "kick",
        chunk: {
          render: drumTrack(samples.kick, kickPattern(2)),
        },
      },
      {
        name: "bass",
        chunk: {
          render: bassTrack(triangle, envelope(0.25, 1, 3.9)),
        },
      },
      {
        name: "chord",
        chunk: {
          render: chordTrack(
            Math.floor(Math.random() * 8) / 8,
            envelope(0.1, 0.4, 4)
          ),
        },
      },
    ],
  };

  return section;
}

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
    tracks: [],
    sections: {},
    automations: {
      volume: [],
      filter: [],
    },
  };

  // pick a key
  let transpose = Math.round(Math.random() * 12);

  // select a progression
  song.progression = progressions[(Math.random() * progressions.length) | 0];

  song.progression.forEach(chord => {
    chord[0] += transpose;
    chord[1] = [...chord[1]];
    for (let i = 1; i < chord[1].length; i++) {
      chord[1][i] -= Math.random() * 0.1;
    }
  });

  song.structure = ["intro", "main"];

  song.sections.intro = generateIntroSection({ song, samples });
  song.sections.main = generateMainSection({ song, samples });
  console.log(song.sections);

  const arpSpeed = [8, 12, 16][(Math.random() * 3) | 0];

  // song.length = song.progression.length * 16
  /*
  song.tracks = [
    {
      name: "bass",
      volume: 0.2,
      chunks: [
        {
          start: 0,
          render: bassTrack(triangle, envelope(0.25, 1, 3.9)),
        },
      ],
    },
    {
      name: "snare",
      volume: 0.3,
      chunks: [
        {
          start: 0,
          render: drumTrack(samples.snare, snarePattern),
        },
      ],
    },
    {
      name: "kick",
      volume: 0.3,
      chunks: [
        {
          start: 0,
          render: drumTrack(samples.kick, kickPattern),
        },
      ],
    },
    {
      name: "hat",
      volume: 0.3,
      chunks: [
        {
          start: 0,
          render: drumTrack(samples.hat, hatPattern),
        },
      ],
    },
    {
      name: "arp",
      volume: 0.2,
      chunks: [
        {
          start: song.progression.length * 2,
          length: song.progression.length * 4,
          render: arpeggiatorTrack(
            triangle,
            envelope(0.1, 0.2, 0.99),
            arpSpeed
          ),
        },
        {
          start: song.progression.length * 10,
          render: arpeggiatorTrack(
            triangle,
            envelope(0.1, 0.2, 0.99),
            arpSpeed
          ),
        },
      ],
    },
    {
      name: "chord",
      volume: 0.2,
      chunks: [
        {
          render: chordTrack(
            Math.floor(Math.random() * 8) / 8,
            envelope(0.1, 0.4, 4)
          ),
          start: 0,
          length: song.progression.length * 6,
        },
        {
          start: song.progression.length * 10,
          render: chordTrack(
            Math.floor(Math.random() * 8) / 8,
            envelope(0.1, 0.4, 4)
          ),
        },
      ],
    },
  ];*/

  // const leadNotes = [];
  // const songKey = song.progression[0];
  // const chordNotes = songKey[1].map(i => songKey[0] + i);
  // for (let i = 0; i < 100; i++) {
  //   leadNotes.push([chordNotes[i % chordNotes.length], i * 3, 1]);
  // }

  // song.tracks.push({
  //   name: "lead",
  //   volume: 0.2,
  //   chunks: [
  //     {
  //       start: 0,
  //       render: pianoRollTrack(square, leadNotes),
  //       notes: leadNotes,
  //     },
  //   ],
  // });

  let barDuration = 4 / (song.tempo * BPM);

  // construct the song from sections
  let position = 0;
  song.structure.forEach(sectionName => {
    console.log("pos", position);
    let section = song.sections[sectionName];
    if (!section) return;

    section.automations.forEach(a => {
      if (song.automations[a.name]) {
        song.automations[a.name].push(
          ...a.values.map(v => [v[0] + position, v[1]])
        );
      }
    });
    section.tracks.forEach(sectionTrack => {
      let track = song.tracks.find(t => t.name === sectionTrack.name);
      if (!track) {
        console.log("couldnt find track named", sectionTrack.name);
        track = {
          name: sectionTrack.name,
          volume: 0.2,
          chunks: [],
        };
        song.tracks.push(track);
      }

      track.chunks.push({
        ...sectionTrack.chunk,
        start: position + (sectionTrack.chunk.start || 0),
        length: sectionTrack.chunk.length || section.length,
      });
    });

    position += section.length || 0;
  });
  song.length = position;

  // song.automations = {
  //   volume: [
  //     [0, 0],
  //     [song.progression.length, 1],
  //     [song.length - song.progression.length, 1],
  //     [song.length, 0],
  //   ],
  //   filter: [
  //     [0, 1],
  //     [song.progression.length * 2 - 0.5, 1],
  //     [song.progression.length * 2, 0],
  //   ],
  // };

  song.tracks.forEach(t => {
    if (!t.chunks) return;
    t.chunks.forEach(c => {
      c.track = t;
      c.startTime = (c.start || 0) * barDuration;
      if (c.end) {
        c.endTime = c.end * barDuration;
      } else if (c.length) {
        c.endTime = c.startTime + c.length * barDuration;
      } else {
        c.endTime = c.startTime + song.length * barDuration;
      }
    });
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

  console.log(song);
  return song;
}
