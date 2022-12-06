const audioContext = new AudioContext();
await audioContext.audioWorklet.addModule("./white-noise-processor.js");
await audioContext.audioWorklet.addModule("./brown-noise-processor.js");
const whiteNoiseNode = new AudioWorkletNode(
  audioContext,
  "white-noise-processor"
);

const brownNoiseNode = new AudioWorkletNode(
  audioContext,
  "brown-noise-processor"
);

const brownGainNode = new GainNode(audioContext);
const brownNoiseVolume = new GainNode(audioContext);

const whiteGainNode = new GainNode(audioContext);
const whiteNoiseVolume = new GainNode(audioContext);
const whiteAnalyzer = new AnalyserNode(audioContext);

brownGainNode.gain.setValueAtTime(0.00001, audioContext.currentTime);
brownNoiseVolume.gain.setValueAtTime(0.3, audioContext.currentTime);

whiteGainNode.gain.setValueAtTime(0.00001, audioContext.currentTime);
whiteNoiseVolume.gain.setValueAtTime(0.3, audioContext.currentTime);

brownNoiseNode
  .connect(brownNoiseVolume)
  .connect(brownGainNode)
  .connect(audioContext.destination);

whiteNoiseNode
  .connect(whiteNoiseVolume)
  .connect(whiteGainNode)
  .connect(whiteAnalyzer)
  .connect(audioContext.destination);

const brownButton = document.getElementById("brown-noise");
const brownVolume = document.getElementById("brown-noise-volume");

const whiteButton = document.getElementById("white-noise");
const whiteVolume = document.getElementById("white-noise-volume");

whiteVolume!.addEventListener("input", (ev) => {
  const val = (ev.target as HTMLInputElement).value;
  whiteGainNode.gain.setValueAtTime(Number(val), audioContext.currentTime);
});

brownVolume!.addEventListener("input", (ev) => {
  const val = (ev.target as HTMLInputElement).value;
  brownGainNode.gain.setValueAtTime(Number(val), audioContext.currentTime);
});

let whiteAnalyzerTimer: number;
let analyzerData = new Float32Array(whiteAnalyzer.fftSize);

const svgns = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgns, "svg");
svg.setAttribute("viewBox", "0 -50 2048 100");
svg.setAttribute("preserveAspectRatio", "none");

const line = document.createElementNS(svgns, "polyline");
line.setAttribute("fill", "none");
line.setAttribute("stroke", "black");

function updateLine(data: Float32Array): void {
  const arr = new Array(...data);
  line.setAttribute(
    "points",
    arr.map((num, idx) => `${idx}, ${num * 500}`).join(" ")
  );
}
svg.appendChild(line);

whiteButton!.after(svg);

function toggleWhite() {
  if (audioContext.state === "running") {
    clearInterval(whiteAnalyzerTimer);
    whiteNoiseVolume.gain.setTargetAtTime(
      0.0001,
      audioContext.currentTime,
      0.1
    );
    setTimeout(() => {
      audioContext.suspend().then(() => {
        whiteButton!.textContent = "Start";
      });
    }, 500);
  } else if (audioContext.state === "suspended") {
    whiteAnalyzerTimer = setInterval(() => {
      whiteAnalyzer.getFloatTimeDomainData(analyzerData);
      console.log(analyzerData);
      updateLine(analyzerData);
    }, 30);
    audioContext.resume().then(() => {
      whiteNoiseVolume.gain.setTargetAtTime(0.9, audioContext.currentTime, 0.1);
      whiteButton!.textContent = "Stopp";
    });
  }
}

whiteButton!.onclick = toggleWhite;

function toggleBrown() {
  if (audioContext.state === "running") {
    brownNoiseVolume.gain.setTargetAtTime(
      0.0001,
      audioContext.currentTime,
      0.1
    );
    setTimeout(() => {
      audioContext.suspend().then(() => {
        brownButton!.textContent = "Start";
      });
    }, 500);
  } else if (audioContext.state === "suspended") {
    audioContext.resume().then(() => {
      brownNoiseVolume.gain.setTargetAtTime(0.9, audioContext.currentTime, 0.1);
      brownButton!.textContent = "Stopp";
    });
  }
}

brownButton!.onclick = toggleBrown;

export {};
