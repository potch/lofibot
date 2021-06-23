const Hz = Math.PI * 2;
const BPM = 1 / 60;
const status = document.querySelector(".status");

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

// test triangle;
let t = [];
for (let i = 0; i <= 16; i++) {
  t.push(triangle(2, i / 16));
}
console.log("triangle", t);

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
  buffer.getChannelData(channel)[i | 0] || 0;

// *...*..**...*..., 16, .5
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

const breathe = () => new Promise(resolve => requestAnimationFrame(resolve));

let progression, TEMPO, snarePattern, kickPattern, hatPattern, songStartTime;
function generate(context) {
  TEMPO = 80 + Math.random() * 15;

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
  progression.forEach(chord => (chord[0] += transpose));

  snarePattern = "....*.......*...".split("");
  hatPattern = "................................".split("");
  kickPattern = "*.......*.......".split("");

  for (let i = 0; i < Math.random() * 4; i++) {
    kickPattern[(Math.random() * kickPattern.length) | 0] = "*";
  }
  const hatResolution = Math.pow(2, (Math.random() * 2 + 1) | 0);
  console.log("hr", hatResolution);
  for (let i = 0; i < hatPattern.length; i += hatResolution) {
    hatPattern[i] = "*";
  }
  let modCount = Math.random() * 5;
  for (let i = 0; i < modCount + 1; i++) {
    hatPattern[(Math.random() * hatPattern.length) | 0] = "*";
  }

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
document.querySelector(".start").addEventListener("click", async e => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const { sampleRate } = context;

  generate(context);

  const kick = await loadSound(context, "kick1.wav");
  const hat = await loadSound(context, "hat1.mp3");
  const snare = await loadSound(context, "snare2.wav");

  const processor = context.createScriptProcessor(16384, 0, 2);

  processor.onaudioprocess = function (audioProcessingEvent) {
    // The output buffer contains the samples that will be modified and played
    var outputBuffer = audioProcessingEvent.outputBuffer;

    const timeStart = audioProcessingEvent.playbackTime - songStartTime;

    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      let buffer = outputBuffer.getChannelData(channel);
      let hiss = noise();
      let lastBreath = Date.now();
      for (var i = 0; i < buffer.length; i++) {
        const t = timeStart + i / sampleRate;
        if (t < 0) continue;
        const songBeat = TEMPO * BPM * t;
        const bar = (songBeat / 4) | 0;
        const beat = ((songBeat % 4) + 1) | 0;
        const subbeat = (((songBeat * 4) % 16) + 1) | 0;
        // time within beat
        const b = songBeat % 1;
        // make the music
        hiss = hiss * 0.4 + noise() * 0.6;
        buffer[i] = mix(
          ...chord(...progression[bar % progression.length]).map(
            f => sine(f, t) / 3
          ),
          triangle(note(progression[bar % progression.length][0] - 12), t) *
            (sine(0.5, t) / 3 + 1),
          sample(
            hat,
            channel,
            beatSequence(
              hatPattern,
              (songBeat / ((hatPattern.length / 16) * 4)) % 1,
              4
            ) * sampleRate
          ),
          sample(
            snare,
            channel,
            beatSequence(
              snarePattern,
              (songBeat / ((snarePattern.length / 16) * 4)) % 1,
              4
            ) * sampleRate
          ) * 1.5,
          sample(
            kick,
            channel,
            beatSequence(
              kickPattern,
              (songBeat / ((kickPattern.length / 16) * 4)) % 1,
              4
            ) * sampleRate
          ) * 2,
          hiss / 15
        );
      }
    }
    visualize(canvas, outputBuffer);
  };

  status.innerText = "playing";

  const gain = context.createGain();
  gain.gain.value = 0.25;

  processor.connect(gain);
  gain.connect(context.destination);

  document
    .querySelector(".generate")
    .addEventListener("click", e => generate(context));
});
