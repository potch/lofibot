const Hz = Math.PI * 2;
const BPM = 1 / 60;

// note to frequency
const note = n => 440 * Math.pow(2, (n - 69) / 12);

// sine generator
const sine = (f, t) => Math.sin(f * Hz * t);
const square = (f, t) => Math.sign(sine(f, t));
const noise = () => Math.random() * 2 - 1;

// audio mixing
const mix = (...parts) =>
  parts.reduce((sum, part) => sum + part, 0) / Math.sqrt(parts.length);

// chords
const chord = (n, intervals) => intervals.map(i => note(n + i));
const MAJOR = [0, 4, 7, 12];
const MAJOR7 = [0, 4, 7, 14];
const MAJOR9 = [0, 4, 7, 18];
const MINOR = [0, 3, 7, 12];
const SUS4 = [0, 5, 7, 12];

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

// viz
function visualize(buffer) {
  let canvas = document.createElement("canvas");
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

// generate and play the song
document.querySelector(".start").addEventListener("click", async e => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const { sampleRate } = context;

  const TEMPO = 86;

  const kick = await loadSound(context, "kick1.wav");
  const hat = await loadSound(context, "hat1.mp3");
  const snare = await loadSound(context, "snare2.wav");

  /*
  seconds = beats / beats/minute * 60
  */
  const track = context.createBufferSource();
  console.log((((8 * 9) / 60) * sampleRate) | 0);
  const data = context.createBuffer(
    track.channelCount,
    (1 * 60 * sampleRate) | 0,
    sampleRate
  );

  const progression = [
    [60, MAJOR7],
    [60, SUS4],
  ];

  // fill our buffer;
  for (let channel = 0; channel < track.channelCount; channel++) {
    let buffer = data.getChannelData(channel);
    let hiss = noise();
    let lastBreath = Date.now();
    for (var i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
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
        (square(note([60, 55, 57, 53][bar % 4] - 17), t) *
          (sine(0.5, t) / 3 + 1)) /
          8,
        sample(
          hat,
          channel,
          beatSequence(
            "*.*.*.*.*.*.*.*.***.*.*.*.*.*.**",
            (songBeat / 8) % 1,
            4
          ) * sampleRate
        ),
        sample(
          snare,
          channel,
          beatSequence("....*.......*...", (songBeat / 4) % 1, 4) * sampleRate
        ) * 1.5,
        sample(
          kick,
          channel,
          beatSequence("*......**.......", (songBeat / 4) % 1, 4) * sampleRate
        ) * 2,
        hiss / 15
      );
      if (Date.now() - lastBreath > 250) {
        console.log(`channel ${channel}, ${((i / buffer.length) * 100) | 0}`);
        await breathe();
        lastBreath = Date.now();
      }
    }
  }

  track.buffer = data;

  const osc = context.createOscillator();
  const gain = context.createGain();
  gain.gain.value = 0.25;

  track.connect(gain);
  gain.connect(context.destination);

  track.start(0);
  document.body.append(visualize(data));
});
