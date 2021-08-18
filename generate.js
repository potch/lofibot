import { BPM, pitch, CHORDS, chord } from "./theory.js";
import { PRNG } from "./procgen.js";
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

function kickPattern(random, length = 1) {
  let kickPattern = "*.......*.......".repeat(length).split("");
  for (let i = 0; i < random.int(4); i++) {
    kickPattern[random.int(kickPattern.length)] = "*";
  }
  return kickPattern;
}
function snarePattern(random, length = 1) {
  let snarePattern = "....*.......*...".repeat(length).split("");
  return snarePattern;
}

function hatPattern(random, length = 1) {
  let hatPattern = "................".repeat(length).split("");
  const hatResolution = random.int(9, 7);
  for (let i = 0; i < hatPattern.length; i += hatResolution) {
    hatPattern[i] = "*";
  }
  let modCount = random.int(8);
  for (let i = 0; i < modCount + 1; i++) {
    let pos = random.int(hatPattern.length);
    if (hatPattern[pos] === "*") {
      hatPattern[pos] = ".";
    } else {
      hatPattern[pos] = "*";
    }
  }
  return hatPattern;
}

function generateIntroSection({ song, samples, random }) {
  const length = song.progression.length * random.int(4, 2);
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
  if (random.int(3) < 2) {
    section.tracks.push({
      name: "snare",
      chunk: {
        render: drumTrack(samples.snare, snarePattern(random)),
        start: 0,
      },
    });
    // if there's drums, maybe add hat
    if (random.int(3) < 2) {
      section.tracks.push({
        name: "hat",
        chunk: {
          render: drumTrack(samples.hat, hatPattern(random, 2)),
        },
      });
      // if there's hat, maybe add kick
      if (random.int(3) < 2) {
        section.tracks.push({
          name: "kick",
          chunk: {
            render: drumTrack(samples.kick, kickPattern(random, 2)),
          },
        });
      }
    }
  }
  section.tracks.push({
    name: "chord",
    chunk: {
      render: chordTrack(random.int(8) / 8, envelope(0.1, 0.4, 4)),
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

function generateMainSection({ song, samples, random }) {
  const length = song.progression.length * random.int(4, 2);
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
          render: drumTrack(samples.snare, snarePattern(random)),
        },
      },
      {
        name: "hat",
        chunk: {
          render: drumTrack(samples.hat, hatPattern(random, 2)),
        },
      },
      {
        name: "kick",
        chunk: {
          render: drumTrack(samples.kick, kickPattern(random, 2)),
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
          render: chordTrack(random.int(8) / 8, envelope(0.1, 0.4, 4)),
        },
      },
    ],
  };

  return section;
}

function generateBSection({ song, samples, random }) {
  const length = song.progression.length * random.int(4, 2);
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
          render: drumTrack(samples.snare, snarePattern(random)),
        },
      },
      {
        name: "hat",
        chunk: {
          render: drumTrack(samples.hat, hatPattern(random, 2)),
        },
      },
      {
        name: "kick",
        chunk: {
          render: drumTrack(samples.kick, kickPattern(random, 2)),
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
          render: chordTrack(random.int(8) / 8, envelope(0.1, 0.4, 4)),
        },
      },
      {
        name: "arp",
        chunk: {
          render: arpeggiatorTrack(
            triangle,
            envelope(0.1, 0.2, 0.99),
            random.choose([8, 12, 16])
          ),
        },
      },
    ],
  };

  return section;
}

function generateBridgeSection({ song, samples, random }) {
  const length = song.progression.length * random.int(4, 2);
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
          render: drumTrack(samples.snare, snarePattern(random)),
        },
      },
      {
        name: "hat",
        chunk: {
          render: drumTrack(samples.hat, hatPattern(random, 2)),
        },
      },
      {
        name: "kick",
        chunk: {
          render: drumTrack(samples.kick, kickPattern(random, 2)),
        },
      },
      {
        name: "bass",
        chunk: {
          render: bassTrack(triangle, envelope(0.25, 1, 3.9)),
        },
      },
    ],
  };

  return section;
}

function generateOutroSection({ song, section, random }) {
  console.log(section);
  const output = {
    length: section.length,
    automations: [...section.automations],
    tracks: [...section.tracks],
  };
  const volumeAutomation = output.automations.findIndex(
    a => a.name === "volume"
  );
  output.automations.splice(volumeAutomation, 1, {
    name: "volume",
    values: [
      [0, 1],
      [section.length - song.progression.length, 1],
      [section.length, 0],
    ],
  });
  return output;
}

/* generation process goals:
 * - pick a key
 * - generate chord progression
 * - generate sections (intro, A section, B section, Bridge, Outro)
 * - each section gets a different feel (progression variation/ arp/ melody line)
 * - join sections into tracks
 * - compute automations
 */

export function generate(context, knobs, samples, seed = 0) {
  const random = new PRNG(seed);

  const song = {
    seed,
    tempo: random.int(100, 70),
    startTime: context.currentTime + 1,
    tracks: [],
    sections: {},
    automations: {
      volume: [],
      filter: [],
    },
  };

  // pick a key
  let transpose = random.int(12);

  // select a progression
  song.progression = random.choose(progressions);

  song.progression.forEach(chord => {
    chord[0] += transpose;
    chord[1] = [...chord[1]];
    for (let i = 1; i < chord[1].length; i++) {
      chord[1][i] -= random.float() * 0.1;
    }
  });

  song.structure = ["intro", "a", "b", "c", "b", "outro"];

  song.sections.intro = generateIntroSection({ song, samples, random });
  song.sections.a = generateMainSection({ song, samples, random });
  song.sections.b = generateBSection({ song, samples, random });
  song.sections.c = generateBridgeSection({ song, samples, random });
  song.sections.outro = generateOutroSection({
    song,
    section: song.sections.b,
  });

  console.log(song.sections);

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
