import { BPM, chord } from "./theory.js";
import { loadSound } from "./synth.js";
import { Random } from "./procgen.js";
import { drawKnobs, drawTracks, drawWaveform } from "./daw.js";

import { generate } from "./generate.js";

const status = document.querySelector(".status");
const samples = {};
const random = new Random();

let canvas = document.querySelector(".waveform canvas");
let tracksCanvas = document.querySelector(".tracks canvas");

let currentSong;

window.onerror = e => {
  status.innerText = e;
};

// generate and play the song
document
  .querySelector(".start")
  .addEventListener("click", e => go(e).catch(e => console.warn(e)));

async function go(e) {
  document.querySelector(".start").setAttribute("disabled", true);
  document.querySelector(".stop").removeAttribute("disabled");
  document.querySelector(".generate").removeAttribute("disabled");

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const { sampleRate } = context;
  const knobs = {
    globalVolume: context.createGain(),
    filter: context.createBiquadFilter(),
    filterFeed: context.createGain(),
    filterBypass: context.createGain(),
  };

  knobs.filter.type = "highpass";
  knobs.filter.frequency.setValueAtTime(10, context.currentTime);
  knobs.filterFeed.gain.setValueAtTime(0, context.currentTime);
  knobs.filterBypass.gain.setValueAtTime(1, context.currentTime);

  samples.kick = await loadSound(context, "kick1.wav");
  samples.hat = await loadSound(context, "hat1.mp3");
  samples.snare = await loadSound(context, "snare2.wav");
  samples.piano = await loadSound(context, "piano1.wav");

  let initialSeed = random.int();
  if (window.location.search && window.location.search.length > 1) {
    initialSeed = parseInt(window.location.search.substr(1), 16);
    initialSeed = initialSeed || 0;
  }
  currentSong = generate(context, knobs, samples, initialSeed);

  const processor = context.createScriptProcessor(2048, 1, 2);
  processor.connect(knobs.filterFeed);
  processor.connect(knobs.filterBypass);
  knobs.filterFeed.connect(knobs.filter);
  knobs.filter.connect(knobs.globalVolume);
  knobs.filterBypass.connect(knobs.globalVolume);

  let renderTime = 0;
  let trackDrawFrame;

  // generator code
  processor.onaudioprocess = function (audioProcessingEvent) {
    if (!currentSong) return;
    let start = Date.now();
    let max = 0;
    const { tempo, tracks, progression, startTime } = currentSong;

    // The output buffer contains the samples that will be modified and played
    const outputBuffer = audioProcessingEvent.outputBuffer;

    const timeStart = audioProcessingEvent.playbackTime - startTime;

    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      let buffer = outputBuffer.getChannelData(channel);
      for (var i = 0; i < buffer.length; i++) {
        const t = timeStart + i / sampleRate;
        if (t < 0) continue;

        const songBeat = tempo * BPM * t;
        const fBar = songBeat / 4;
        const bar = fBar | 0;
        const fBeat = songBeat % 4;

        // time within beat
        const b = songBeat % 1;

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

        // make the music
        let out = 0;
        for (let j = 0; j < tracks.length; j++) {
          let track = tracks[j];
          if (!track.chunks) continue;
          for (let k = 0; k < track.chunks.length; k++) {
            let chunk = track.chunks[k];
            if (t < chunk.startTime || t > chunk.endTime) continue;
            out += chunk.render(state, chunk) * track.volume || 0;
          }
        }

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
    status.innerText = `now playing: ${currentSong.seed.toString(16)} [${
      renderTime | 0
    }ms/${
      ((outputBuffer.length / context.sampleRate) * 1000) | 0
    }ms] (${prettyTime})`;

    cancelAnimationFrame(trackDrawFrame);
    trackDrawFrame = requestAnimationFrame(() => {
      drawWaveform(canvas, outputBuffer, tracks, timeStart, tempo);
      drawTracks(tracksCanvas, tracks, timeStart, tempo);
      drawKnobs(knobs);
    });

    let barDuration = 4 / (tempo * BPM);
    if (timeStart > currentSong.length * barDuration + 1) {
      currentSong = generate(context, knobs, samples, random.int());
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
  source.buffer = buffer;
  source.loop = true;
  source.connect(processor);
  source.start();

  console.log(context.currentTime);

  window.generate = seed => {
    currentSong = generate(context, knobs, samples, parseInt(seed, 16));
  };

  document.querySelector(".generate").addEventListener("click", e => {
    currentSong = generate(context, knobs, samples, random.int());
  });

  document.querySelector(".stop").addEventListener("click", e => {
    document.querySelector(".start").removeAttribute("disabled");
    document.querySelector(".stop").setAttribute("disabled", true);
    document.querySelector(".generate").setAttribute("disabled", true);
    cancelAnimationFrame(trackDrawFrame);
    context.close();
  });

  document.querySelector(".volume").addEventListener("input", e => {
    userVolume.gain.setValueAtTime(
      parseFloat(e.target.value),
      context.currentTime
    );
  });
  document.querySelector(".volume").addEventListener("change", e => {
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
