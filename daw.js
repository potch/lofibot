import { lerp, ilerp } from "./util.js";
import { BPM } from "./theory.js";

// viz
const visWindow = 15;

const computedStyle = getComputedStyle(document.body);
const colors = {
  dark: computedStyle.getPropertyValue("--dark"),
  cool: computedStyle.getPropertyValue("--cool"),
  medium: computedStyle.getPropertyValue("--medium"),
  warm: computedStyle.getPropertyValue("--warm"),
  warm_ui: computedStyle.getPropertyValue("--warm-ui"),
  light: computedStyle.getPropertyValue("--light"),
};
console.log(colors);
export function drawWaveform(canvas, buffer) {
  const DPR = window.devicePixelRatio;
  canvas.width = canvas.offsetWidth * DPR;
  canvas.height = canvas.offsetHeight * DPR;
  const waveHeight = canvas.height;
  let ctx = canvas.getContext("2d");
  ctx.strokeStyle = colors.cool;
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

export function drawTracks(canvas, tracks, currentTime, tempo) {
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
  tracks.forEach((track, i) => {
    track.chunks
      .filter(
        c =>
          c.startTime < currentTime + visWindow &&
          c.endTime > currentTime - visWindow
      )
      .forEach(chunk => {
        const trackSize = trackHeight / tracks.length;
        const start = Math.max(
          lerp(
            0,
            canvas.width,
            ilerp(-visWindow, visWindow, chunk.startTime - currentTime)
          ),
          0
        );
        ctx.fillStyle = colors.dark;

        ctx.fillRect(
          start,
          (i + 0.1) * trackSize,
          Math.min(
            lerp(
              0,
              canvas.width,
              ilerp(-visWindow, visWindow, chunk.endTime - currentTime)
            ) - start,
            canvas.width
          ),
          trackSize * 0.8
        );

        ctx.fillStyle = colors.warm;
        ctx.fillRect(
          start + DPR * 2,
          (i + 0.1) * trackSize + DPR * 2,
          Math.min(
            lerp(
              0,
              canvas.width,
              ilerp(-visWindow, visWindow, chunk.endTime - currentTime)
            ) - start,
            canvas.width
          ) -
            DPR * 4,
          trackSize * 0.8 - DPR * 4
        );
        ctx.fillStyle = colors.dark;
        ctx.fillText(
          chunk.track.name,
          Math.max(
            canvas.width / 2 +
              ((chunk.startTime - currentTime) / visWindow) *
                (canvas.width / 2) +
              8 * DPR,
            8 * DPR
          ),
          (i + 0.1) * trackSize + 8 * DPR
        );
        // if (chunk.notes) {
        //   chunk.notes.forEach(([note, start, length]) => {
        //     let y = lerp((i + 0.1) * trackSize, trackSize * .8, 1 - note/96);
        //     ctx.fillRect(start * )
        //   });
        // }
      });
  });

  ctx.restore();
  ctx.fillStyle = colors.dark;
  const numBeats = visWindow * tempo * BPM;
  const songBeat = tempo * BPM * currentTime;

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

export function drawKnobs(knobs) {
  const volumeRotation = -135 + 270 * knobs.globalVolume.gain.value;
  document.querySelector(
    ".knob.volume .knob__thumb"
  ).style.transform = `rotate(${volumeRotation}deg)`;
  const filterRotation = -135 + 270 * (knobs.filter.frequency.value / 2000);
  document.querySelector(
    ".knob.filter .knob__thumb"
  ).style.transform = `rotate(${filterRotation}deg)`;
}
