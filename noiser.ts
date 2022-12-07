function createAnalyzerTimePlot(
  position: HTMLElement
): (data: Float32Array) => void {
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
  position.after(svg);

  return updateLine;
}

async function noisePatch() {
  const ctx = new AudioContext();
  await ctx.audioWorklet.addModule("./white-noise-processor.js");
  await ctx.audioWorklet.addModule("./brown-noise-processor.js");
  const whiteNoiseNode = new AudioWorkletNode(ctx, "white-noise-processor");

  const brownNoiseNode = new AudioWorkletNode(ctx, "brown-noise-processor");

  const brownGainNode = new GainNode(ctx);
  const brownNoiseVolume = new GainNode(ctx);
  const brownAnalyzer = new AnalyserNode(ctx);

  const whiteGainNode = new GainNode(ctx);
  const whiteNoiseVolume = new GainNode(ctx);
  const whiteAnalyzer = new AnalyserNode(ctx);

  brownGainNode.gain.setValueAtTime(0.00001, ctx.currentTime);
  brownNoiseVolume.gain.setValueAtTime(0.3, ctx.currentTime);

  whiteGainNode.gain.setValueAtTime(0.00001, ctx.currentTime);
  whiteNoiseVolume.gain.setValueAtTime(0.3, ctx.currentTime);

  brownNoiseNode
    .connect(brownNoiseVolume)
    .connect(brownGainNode)
    .connect(brownAnalyzer)
    .connect(ctx.destination);

  whiteNoiseNode
    .connect(whiteNoiseVolume)
    .connect(whiteGainNode)
    .connect(whiteAnalyzer)
    .connect(ctx.destination);

  const brownButton = document.getElementById("brown-noise");
  const brownVolume = document.getElementById("brown-noise-volume");

  const whiteButton = document.getElementById("white-noise");
  const whiteVolume = document.getElementById("white-noise-volume");

  whiteVolume!.addEventListener("input", (ev) => {
    const val = (ev.target as HTMLInputElement).value;
    whiteGainNode.gain.setValueAtTime(Number(val), ctx.currentTime);
  });

  brownVolume!.addEventListener("input", (ev) => {
    const val = (ev.target as HTMLInputElement).value;
    brownGainNode.gain.setValueAtTime(Number(val), ctx.currentTime);
  });

  let whiteAnalyzerTimer: number;
  let analyzerData = new Float32Array(whiteAnalyzer.fftSize);

  const updateLine = createAnalyzerTimePlot(whiteButton!);

  function toggleWhite() {
    if (ctx.state === "running") {
      clearInterval(whiteAnalyzerTimer);
      whiteNoiseVolume.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
      setTimeout(() => {
        ctx.suspend().then(() => {
          whiteButton!.textContent = "Start";
        });
      }, 500);
    } else if (ctx.state === "suspended") {
      whiteAnalyzerTimer = setInterval(() => {
        whiteAnalyzer.getFloatTimeDomainData(analyzerData);
        updateLine(analyzerData);
      }, 30);
      ctx.resume().then(() => {
        whiteNoiseVolume.gain.setTargetAtTime(0.9, ctx.currentTime, 0.1);
        whiteButton!.textContent = "Stopp";
      });
    }
  }

  whiteButton!.onclick = toggleWhite;

  let brownAnalyzerTimer: number;
  let brownAnalyzerData = new Float32Array(brownAnalyzer.fftSize);
  const updateBrownLine = createAnalyzerTimePlot(brownButton!);

  function toggleBrown() {
    if (ctx.state === "running") {
      clearInterval(brownAnalyzerTimer);
      brownNoiseVolume.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
      setTimeout(() => {
        ctx.suspend().then(() => {
          brownButton!.textContent = "Start";
        });
      }, 500);
    } else if (ctx.state === "suspended") {
      brownAnalyzerTimer = setInterval(() => {
        brownAnalyzer.getFloatTimeDomainData(brownAnalyzerData);
        updateBrownLine(brownAnalyzerData);
      }, 30);
      ctx.resume().then(() => {
        brownNoiseVolume.gain.setTargetAtTime(0.9, ctx.currentTime, 0.1);
        brownButton!.textContent = "Stopp";
      });
    }
  }

  brownButton!.onclick = toggleBrown;
}

noisePatch().then(() => {
  console.log("Noise patch initialized!");
});
