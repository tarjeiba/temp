import { createAnalyzerTimePlot } from "./grapher.js";
async function noisePatch() {
    const ctx = new AudioContext();
    await ctx.audioWorklet.addModule("./white-noise-processor.js");
    await ctx.audioWorklet.addModule("./brown-noise-processor.js");
    const whiteNoiseNode = new AudioWorkletNode(ctx, "white-noise-processor");
    const brownNoiseNode = new AudioWorkletNode(ctx, "brown-noise-processor");
    const brownFilter = new BiquadFilterNode(ctx, {
        type: "lowpass",
        frequency: 400,
    });
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
    whiteNoiseNode
        .connect(brownFilter)
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
    whiteVolume.addEventListener("input", (ev) => {
        const val = ev.target.value;
        whiteGainNode.gain.setValueAtTime(Number(val), ctx.currentTime);
    });
    brownVolume.addEventListener("input", (ev) => {
        const val = ev.target.value;
        brownGainNode.gain.setValueAtTime(Number(val), ctx.currentTime);
    });
    let whiteAnalyzerTimer;
    let analyzerData = new Float32Array(whiteAnalyzer.fftSize);
    const updateLine = createAnalyzerTimePlot(whiteButton);
    function toggleWhite() {
        if (ctx.state === "running") {
            clearInterval(whiteAnalyzerTimer);
            whiteNoiseVolume.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
            setTimeout(() => {
                ctx.suspend().then(() => {
                    whiteButton.textContent = "Start";
                });
            }, 500);
        }
        else if (ctx.state === "suspended") {
            whiteAnalyzerTimer = setInterval(() => {
                whiteAnalyzer.getFloatTimeDomainData(analyzerData);
                updateLine(analyzerData);
            }, 30);
            ctx.resume().then(() => {
                whiteNoiseVolume.gain.setTargetAtTime(0.9, ctx.currentTime, 0.1);
                whiteButton.textContent = "Stopp";
            });
        }
    }
    whiteButton.onclick = toggleWhite;
    let brownAnalyzerTimer;
    let brownAnalyzerData = new Float32Array(brownAnalyzer.fftSize);
    const updateBrownLine = createAnalyzerTimePlot(brownButton);
    function toggleBrown() {
        if (ctx.state === "running") {
            clearInterval(brownAnalyzerTimer);
            brownNoiseVolume.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
            setTimeout(() => {
                ctx.suspend().then(() => {
                    brownButton.textContent = "Start";
                });
            }, 500);
        }
        else if (ctx.state === "suspended") {
            brownAnalyzerTimer = setInterval(() => {
                brownAnalyzer.getFloatTimeDomainData(brownAnalyzerData);
                updateBrownLine(brownAnalyzerData);
            }, 30);
            ctx.resume().then(() => {
                brownNoiseVolume.gain.setTargetAtTime(0.9, ctx.currentTime, 0.1);
                brownButton.textContent = "Stopp";
            });
        }
    }
    brownButton.onclick = toggleBrown;
}
noisePatch().then(() => {
    console.log("Noise patch initialized!");
});
