const Hz = Math.PI * 2;
const BPM = 1 / 60;
const status = document.querySelector(".status");
const samples = {};

// note to frequency
const note = n => 440 * Math.pow(2, (n - 69) / 12);
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
const chord = (n, intervals) => intervals.map(i => note(n + i));
const MAJOR = [0, 4, 7, 12];
const SUS4 = [0, 5, 7, 12];
const MAJOR7 = [0, 4, 7, 14];
const MAJOR9 = [0, 4, 7, 18];
const MINOR = [0, 3, 7, 12];
const MINOR7 = [0, 3, 7, 10];
const MINOR9 = [0, 3, 7, 12];
//R m3 5 m7 11
const MINOR11 = [0, 3, 7, 10, 17];
const DIM7 = [0, 3, 6, 9];

// sampling
const loadSound = (ctx, path) =>
  fetch(path)
    .then(r => r.arrayBuffer())
    .then(buffer => ctx.decodeAudioData(buffer));

const sample = (buffer, channel, i) =>
  buffer.getChannelData(channel % channel.numberOfChannels)[i | 0] || 0;

// *...*..**...*..., 16, 4
const beatSequence = (sequence, t, factor) => {
  let tick = t * sequence.length;
  if (sequence[tick | 0] === "*") return (tick % 1) / factor;
  return 0;
};

let canvas = document.createElement("canvas");
document.body.append(canvas);

// viz
function visualize(canvas, buffer) {
  canvas.width = 800;
  canvas.height = 200;
  let ctx = canvas.getContext("2d");
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    let data = buffer.getChannelData(channel);
    ctx.beginPath();
    let waveSize = canvas.height / buffer.numberOfChannels / 2;
    ctx.moveTo(0, channel * waveSize * 2 + waveSize);
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

const bassTrack =
  type =>
  ({ t, key }) =>
    type(note(key[0] - 12), t) * (sine(0.5, t) / 3 + 1);

const drumTrack =
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

const arpeggiatorTrack =
  (wave, speed = 8) =>
  ({ t, chordNotes, fBar, fBeat }) => {
    let b = fBeat % 1;
    let pos = (fBar * speed) % chordNotes.length | 0;
    return wave(chordNotes[pos], t) * b;
  };

let progression, TEMPO, snarePattern, kickPattern, hatPattern, songStartTime;

let tracks = [];

function generate(context) {
  TEMPO = 70 + Math.random() * 30;

  songStartTime = context.currentTime + 1;

  progression = [
    [
      // Dmin11 – Gmin7 – Dmin11 – Ebmin11 – C#dim7
      [pitch("D", 4), MINOR11],
      [pitch("G", 4), MINOR7],
      [pitch("D", 4), MINOR11],
      [pitch("Eb", 4), MINOR11],
      [pitch("C#", 5), DIM7],
    ],
    // Amin11 – D7 – Fmaj7 – Cmaj7
    [
      [pitch("A", 4), MINOR11],
      [pitch("D", 4), MAJOR7],
      [pitch("F", 4), MAJOR7],
      [pitch("C", 4), MAJOR7],
    ],
    // Gmaj7 – F#min7 – Amin7b5
    [
      [pitch("G", 4), MAJOR7],
      [pitch("F#", 4), MINOR7],
      [pitch("E", 4), MINOR9],
      [pitch("A", 4), MINOR7],
    ],
  ][(Math.random() * 3) | 0];

  let transpose = Math.round(Math.random() * 12 - 6);
  progression.forEach(chord => {
    chord[0] += transpose;
    chord[1] = [...chord[1]];
    for (let i = 0; i < chord[1].length; i++) {
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

  tracks = [];
  tracks.push({
    start: 0,
    end: Infinity,
    render: bassTrack(triangle),
    volume: 0.3,
  });

  tracks.push({
    start: 0,
    end: Infinity,
    render: drumTrack(samples.snare, snarePattern),
    volume: 0.3,
  });

  tracks.push({
    start: 0,
    end: Infinity,
    render: drumTrack(samples.kick, kickPattern),
    volume: 0.3,
  });

  tracks.push({
    start: 0,
    end: Infinity,
    render: drumTrack(samples.hat, hatPattern),
    volume: 0.3,
  });

  tracks.push({
    start: progression.length,
    end: Infinity,
    render: arpeggiatorTrack(triangle, 16, "random"),
    volume: 0.2,
  });

  console.log(
    TEMPO,
    snarePattern,
    kickPattern,
    hatPattern,
    progression,
    songStartTime,
    context.currentTime
  );
}

window.onerror = e => {
  status.innerText = e;
};

// generate and play the song
document
  .querySelector(".start")
  .addEventListener("click", e => go(e).catch(e => console.warn(e)));

async function go(e) {
  document.querySelector(".start").setAttribute("disabled", true);

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const { sampleRate } = context;

  samples.kick = await loadSound(context, "kick1.wav");
  samples.hat = await loadSound(context, "hat1.mp3");
  samples.snare = await loadSound(context, "snare2.wav");
  samples.piano = await loadSound(context, "piano1.wav");

  generate(context);

  const processor = context.createScriptProcessor(4096, 1, 2);

  let renderTime = 0;
  processor.onaudioprocess = function (audioProcessingEvent) {
    let start = Date.now();
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
        const fBeat = (songBeat % 4) + 1;
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
          if (fBar < track.start || fBar > track.end) continue;
          out += track.render(state, track) * track.volume;
        }

        // make the music
        hiss = hiss * 0.4 + noise() * 0.6;
        buffer[i] =
          out +
          mix(
            // (square(chordNotes[triplet % chordNotes.length], t) * b) / 10,
            ...chordNotes.map(f => sine(f, t) / 3 + triangle(f * 3, t) / 100),
            hiss / 50
          );
      }
    }
    visualize(canvas, outputBuffer);
    renderTime = renderTime * 0.9 + (Date.now() - start) * 0.1;
    status.innerText = `playing [${renderTime | 0}ms / ${
      ((outputBuffer.length / context.sampleRate) * 1000) | 0
    }ms]`;
  };

  status.innerText = "playing";

  const gain = context.createGain();
  gain.gain.value = 0.25;

  processor.connect(gain);
  gain.connect(context.destination);

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

  document
    .querySelector(".generate")
    .addEventListener("click", e => generate(context));

  console.log(processor);
}
