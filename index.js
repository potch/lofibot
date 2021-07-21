const Hz = Math.PI * 2;
const BPM = 1 / 60;
const status = document.querySelector(".status");
const samples = {};

// note to frequency
const note = (n) => 440 * Math.pow(2, (n - 69) / 12);
const PITCHES = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
// pitch like "c#" to frequency
const pitch = (p, octave = 4) => {
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

const lerp = (a, b, i) => a + (b - a) * i;
const ilerp = (a, b, n) => (n - a) / (b - a);
const clamp = (a, b, n) => Math.max(a, Math.min(n, b));

// sine generator
const sine = (f, t) => Math.sin(f * Hz * t);
const square = (f, t) => Math.sign(sine(f, t));
const triangle = (f, t) => {
  let i = (t * f) % 1;
  if (i <= 0.25) return i * 4;
  if (i < 0.75) return 4 * (0.5 - i);
  return -(1 - i) * 4;
};
const noise = () => Math.random() * 2 - 1;

// audio mixing
const mix = (...parts) =>
  parts.reduce((sum, part) => sum + part, 0) / Math.sqrt(parts.length);

// chords
const chord = (n, intervals) => intervals.map((i) => note(n + i));
const chords = {
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

// sampling
const loadSound = (ctx, path) =>
  fetch(path)
    .then((r) => r.arrayBuffer())
    .then((buffer) => ctx.decodeAudioData(buffer));

const sample = (buffer, channel, i) =>
  buffer.getChannelData(channel % channel.numberOfChannels)[i | 0] || 0;

const timeSample = (buffer, channel, t) =>
  buffer.getChannelData(channel % channel.numberOfChannels)[
    ((t / buffer.sampleRate) * buffer.length) | 0
  ] || 0;

// *...*..**...*..., 16, 4
const beatSequence = (sequence, t, factor) => {
  let tick = t * sequence.length;
  if (sequence[tick | 0] === "*") return (tick % 1) / factor;
  return 0;
};

const envelope = (attack, sustain, release) => (t) => {
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

let canvas = document.querySelector(".waveform canvas");
let tracksCanvas = document.querySelector(".tracks canvas");

// viz
const visWindow = 15;
function drawWaveform(canvas, buffer) {
  const DPR = window.devicePixelRatio;
  canvas.width = canvas.offsetWidth * DPR;
  canvas.height = canvas.offsetHeight * DPR;
  const waveHeight = canvas.height;
  let ctx = canvas.getContext("2d");
  ctx.strokeStyle = "pink";
  ctx.lineWidth = DPR * 2;
  ctx.setLineDash([DPR * 2, DPR * 2]);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    let data = buffer.getChannelData(channel);
    ctx.beginPath();
    let waveSize = waveHeight / buffer.numberOfChannels / 2;
    ctx.moveTo(0, data[0] * waveSize + channel * 2 * waveSize + waveSize);
    for (let i = 0; i < data.length; i++) {
      ctx.lineTo(
        (i / data.length) * canvas.width,
        data[i] * waveSize + channel * 2 * waveSize + waveSize
      );
    }
    ctx.stroke();
  }

  return canvas;
}

function drawTracks(canvas, tracks, currentTime, tempo) {
  const DPR = window.devicePixelRatio;
  canvas.width = canvas.offsetWidth * DPR;
  canvas.height = canvas.offsetHeight * DPR;
  const tickHeight = DPR * 8;
  const trackHeight = canvas.height - tickHeight - DPR * 16;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.fillStyle = "pink";
  ctx.font = `bold ${16 * DPR}px monospace`;
  ctx.save();
  ctx.translate(0, tickHeight);
  // draw track blocks
  tracks
    .filter(
      (t) =>
        t.startTime < currentTime + visWindow &&
        t.endTime > currentTime - visWindow
    )
    .forEach((track, i, tracks) => {
      const trackSize = trackHeight / tracks.length;
      const start = Math.max(
        lerp(
          0,
          canvas.width,
          ilerp(-visWindow, visWindow, track.startTime - currentTime)
        ),
        0
      );
      ctx.fillStyle = "pink";
      ctx.fillRect(
        start,
        (i + 0.1) * trackSize,
        Math.min(
          lerp(
            0,
            canvas.width,
            ilerp(-visWindow, visWindow, track.endTime - currentTime)
          ) - start,
          canvas.width
        ),
        trackSize * 0.8
      );
      ctx.fillStyle = "indigo";
      ctx.fillText(
        track.name,
        Math.max(
          canvas.width / 2 +
            ((track.startTime - currentTime) / visWindow) * (canvas.width / 2) +
            8,
          4
        ),
        (i + 0.1) * trackSize + 8
      );
    });
  ctx.restore();
  ctx.fillStyle = "lavender";
  const numBeats = visWindow * tempo * BPM;
  const songBeat = TEMPO * BPM * currentTime;
  // cheating to avoid negative modulo
  const beatOffset = (songBeat + 100) % 1;
  for (let i = -Math.floor(numBeats); i < numBeats; i++) {
    if ((i + Math.floor(songBeat)) % 4 === 0) {
      ctx.fillRect(
        canvas.width / 2 +
          (canvas.width / 2) * ((i - beatOffset) / numBeats) -
          1,
        0,
        DPR * 2,
        DPR * 8
      );
    } else {
      ctx.fillRect(
        canvas.width / 2 +
          (canvas.width / 2) * ((i - beatOffset) / numBeats) -
          1,
        0,
        DPR * 2,
        DPR * 4
      );
    }
  }
  ctx.fillStyle = "deeppink";

  ctx.fillRect(canvas.width / 2, 0, DPR, canvas.height);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 8 * DPR, 0);
  ctx.lineTo(canvas.width / 2 + 8 * DPR, 0);
  ctx.lineTo(canvas.width / 2, 8 * DPR);
  ctx.fill();
}

function drawKnobs(knobs) {
  const volumeRotation = -135 + 270 * knobs.globalVolume.gain.value;
  document.querySelector(
    ".knob.volume .knob__thumb"
  ).style.transform = `rotate(${volumeRotation}deg)`;
}

const bassTrack = (type, envelope) => ({ t, key, fBeat }) =>
  type(note(key[0] - 12), t) *
  (sine(0.5, t) / 8 + (1 - 1 / 8)) *
  envelope(fBeat);

const drumTrack = (sampleBuffer, pattern, ticksPerBeat = 4) => ({
  channel,
  songBeat,
  sampleRate,
}) =>
  sample(
    sampleBuffer,
    channel,
    beatSequence(
      pattern,
      (songBeat / (pattern.length / ticksPerBeat)) % 1,
      ticksPerBeat
    ) * sampleRate
  );

const arpeggiatorTrack = (wave, envelope, speed = 8) => ({
  t,
  chordNotes,
  fBar,
  fBeat,
}) => {
  let b = fBeat % 1;
  let pos = (fBar * speed) % chordNotes.length;
  return wave(chordNotes[pos | 0], t) * envelope(pos % 1);
};

const chordTrack = (spacing = 0, envelope) => ({ t, chordNotes, fBeat }) => {
  let out = 0;
  for (let i = 0; i < chordNotes.length; i++) {
    let note = chordNotes[i];
    if (fBeat > i * spacing)
      out += sine(note, t) * envelope(fBeat - i * spacing);
  }
  return out;
};

let progression, TEMPO, snarePattern, kickPattern, hatPattern, songStartTime;

let tracks = [];
let automations;
let songLength;
let barDuration;

function generate(context, knobs) {
  TEMPO = 70 + Math.random() * 30;

  songStartTime = context.currentTime + 1;

  const progressions = [
    [
      [pitch("D", 4), chords.MINOR11],
      [pitch("Eb", 4), chords.MINOR11],
      [pitch("D", 4), chords.MINOR11],
      [pitch("Eb", 4), chords.MINOR11],
    ],
    [
      [pitch("F", 4), chords.MINOR9],
      [pitch("Eb", 4), chords.MAJOR9],
      [pitch("F", 4), chords.MINOR9],
      [pitch("Eb", 4), chords.MAJOR9],
    ],
    [
      // Dmin11 – Gmin7 – Dmin11 – Ebmin11 – C#dim7
      [pitch("D", 4), chords.MINOR11],
      [pitch("G", 4), chords.MINOR7],
      [pitch("D", 4), chords.MINOR11],
      [pitch("Eb", 4), chords.MINOR11],
      [pitch("C#", 5), chords.DIM7],
    ],
    // Amin11 – D7 – Fmaj7 – Cmaj7
    [
      [pitch("A", 4), chords.MINOR11],
      [pitch("D", 4), chords.DOM7],
      [pitch("F", 4), chords.MAJOR7],
      [pitch("C", 4), chords.MAJOR7],
    ],
    // Gmaj7 – F#min7 – Amin7b5
    [
      [pitch("G", 4), chords.MAJOR7],
      [pitch("F#", 4), chords.MINOR7],
      [pitch("E", 4), chords.MINOR9],
      [pitch("A", 4), chords.MINOR7],
    ],
    // C Am Dm G7
    [
      [pitch("C", 4), chords.SUS4],
      [pitch("A", 4), chords.MINOR7],
      [pitch("D", 4), chords.MINOR7],
      [pitch("G", 4), chords.MAJOR7],
    ],
  ];

  progression = progressions[(Math.random() * progressions.length) | 0];

  let transpose = Math.round(Math.random() * 12);
  console.log(progression);
  progression.forEach((chord) => {
    chord[0] += transpose;
    chord[1] = [...chord[1]];
    for (let i = 1; i < chord[1].length; i++) {
      chord[1][i] -= Math.random() * 0.1;
    }
  });

  snarePattern = "....*.......*...".split("");
  hatPattern = "................................".split("");
  kickPattern = "*.......*.......".split("");

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

  songLength = progression.length * 16;
  automations = {
    volume: [
      [0, 0],
      [progression.length, 1],
      [songLength - progression.length, 1],
      [songLength, 0],
    ],
  };
  tracks = [
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
      start: progression.length * 2,
      length: progression.length * 4,
      render: arpeggiatorTrack(triangle, envelope(0.1, 0.2, 0.99), arpSpeed),
      volume: 0.2,
    },
    {
      name: "arp",
      start: progression.length * 10,
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
      length: progression.length * 6,
      volume: 0.2,
    },
    {
      name: "chord",
      start: progression.length * 10,
      render: chordTrack(
        Math.floor(Math.random() * 8) / 8,
        envelope(0.1, 0.4, 4)
      ),
      volume: 0.2,
    },
  ];

  console.log(
    TEMPO,
    snarePattern,
    kickPattern,
    hatPattern,
    progression,
    songStartTime,
    context.currentTime
  );

  // 4 / (60/60)
  barDuration = 4 / (TEMPO * BPM);
  tracks.forEach((t) => {
    t.startTime = (t.start || 0) * barDuration;
    if (t.end) {
      t.endTime = t.end * barDuration;
    } else if (t.length) {
      t.endTime = t.startTime + t.length * barDuration;
    } else {
      t.endTime = t.startTime + songLength * barDuration;
    }
  });

  if (automations.volume) {
    knobs.globalVolume.gain.cancelScheduledValues(songStartTime - 1);
    knobs.globalVolume.gain.setValueAtTime(1, songStartTime);
    automations.volume.forEach(([bar, value]) => {
      const time = bar * barDuration;
      console.log(bar, value),
        knobs.globalVolume.gain.linearRampToValueAtTime(
          value,
          songStartTime + time
        );
    });
  }

  console.log(...tracks);
}

window.onerror = (e) => {
  status.innerText = e;
};

// generate and play the song
document
  .querySelector(".start")
  .addEventListener("click", (e) => go(e).catch((e) => console.warn(e)));

async function go(e) {
  document.querySelector(".start").setAttribute("disabled", true);
  document.querySelector(".generate").removeAttribute("disabled");

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const { sampleRate } = context;
  const knobs = {
    globalVolume: context.createGain(),
    filter: context.createBiquadFilter(),
  };

  knobs.filter.type = "highpass";
  knobs.filter.frequency.setValueAtTime(0, context.currentTime);

  samples.kick = await loadSound(context, "kick1.wav");
  samples.hat = await loadSound(context, "hat1.mp3");
  samples.snare = await loadSound(context, "snare2.wav");
  samples.piano = await loadSound(context, "piano1.wav");

  generate(context, knobs);

  const processor = context.createScriptProcessor(2048, 1, 2);
  processor.connect(knobs.globalVolume);

  let renderTime = 0;
  let trackDrawFrame;
  processor.onaudioprocess = function (audioProcessingEvent) {
    let start = Date.now();
    let max = 0;
    // The output buffer contains the samples that will be modified and played
    const outputBuffer = audioProcessingEvent.outputBuffer;

    const timeStart = audioProcessingEvent.playbackTime - songStartTime;

    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      let buffer = outputBuffer.getChannelData(channel);
      let hiss = noise();
      for (var i = 0; i < buffer.length; i++) {
        const t = timeStart + i / sampleRate;
        if (t < 0) continue;

        const songBeat = TEMPO * BPM * t;
        const fBar = songBeat / 4;
        const bar = fBar | 0;
        const fBeat = songBeat % 4;
        const beat = fBeat | 0;
        const subBeat = (((songBeat * 4) % 16) + 1) | 0;
        const triplet = ((songBeat / 4) * 12) | 0;

        // time within beat
        const b = songBeat % 1;
        const ib = 1 - b;
        const trp = (songBeat * 4 * 12) % 1;

        // current chord
        const key = progression[bar % progression.length];
        const chordNotes = chord(...key);

        const state = {
          t,
          fBar,
          fBeat,
          key,
          chordNotes,
          channel,
          sampleRate,
          songBeat,
        };

        let out = 0;
        for (let j = 0; j < tracks.length; j++) {
          let track = tracks[j];
          if (t < track.startTime || t > track.endTime) continue;
          out += track.render(state, track) * track.volume;
        }

        // make the music
        hiss = hiss * 0.4 + noise() * 0.6;
        buffer[i] = out;
        max = Math.max(max, out);
      }
    }
    renderTime = renderTime * 0.9 + (Date.now() - start) * 0.1;
    const prettyTime =
      (Math.sign(timeStart) > 0 ? "+" : "−") +
      Math.floor(Math.abs(timeStart) / 60)
        .toString()
        .padStart(2, 0) +
      ":" +
      Math.floor(Math.abs(timeStart) % 60)
        .toString()
        .padStart(2, 0) +
      "." +
      Math.floor((Math.abs(timeStart) * 100) % 100)
        .toString()
        .padStart(2, 0);
    status.innerText = `playing [${renderTime | 0}ms/${
      ((outputBuffer.length / context.sampleRate) * 1000) | 0
    }ms] (${prettyTime})`;

    cancelAnimationFrame(trackDrawFrame);
    trackDrawFrame = requestAnimationFrame(() => {
      drawWaveform(canvas, outputBuffer, tracks, timeStart, TEMPO);
      drawTracks(tracksCanvas, tracks, timeStart, TEMPO);
      drawKnobs(knobs);
    });

    if (timeStart > songLength * barDuration + 1) {
      generate(context, knobs);
    }
  };

  status.innerText = "playing";

  const userVolume = context.createGain();
  userVolume.gain.value = 0.25;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-50, 0);
  compressor.knee.setValueAtTime(40, 0);
  compressor.ratio.setValueAtTime(12, 0);
  compressor.attack.setValueAtTime(0, 0);
  compressor.release.setValueAtTime(0.25, 0);

  knobs.globalVolume.connect(compressor);
  compressor.connect(userVolume);
  userVolume.connect(context.destination);

  // thanks safari
  let source = context.createBufferSource();
  let buffer = context.createBuffer(1, 1024, context.sampleRate);
  let data = buffer.getChannelData(0);
  // for (let i = 0; i < data.length; i++) {
  //   data[i] = Math.random() * 0.01 - 0.005;
  // }
  source.buffer = buffer;
  source.loop = true;
  source.connect(processor);
  source.start();

  console.log(context.currentTime);

  document
    .querySelector(".generate")
    .addEventListener("click", (e) => generate(context, knobs));

  document.querySelector(".volume").addEventListener("input", (e) => {
    userVolume.gain.setValueAtTime(
      parseFloat(e.target.value),
      context.currentTime
    );
  });
  document.querySelector(".volume").addEventListener("change", (e) => {
    userVolume.gain.setValueAtTime(
      parseFloat(e.target.value),
      context.currentTime
    );
  });
  userVolume.gain.setValueAtTime(
    parseFloat(document.querySelector(".volume").value),
    0
  );

  console.log(processor);
}
