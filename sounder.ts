import { createAnalyzerTimePlot } from "./grapher.js";

class Patch {
  public ctx = new window.AudioContext();

  constructor(container: HTMLDivElement) {
    this.ctx.suspend();

    const divs = container.getElementsByTagName("fieldset");
    const modules = Array.from(divs).map((div) => {
      const moduleType = div.getAttribute("module");
      switch (moduleType) {
        case "oscillator":
          const osc = new Oscillator(this, div);
          const analyzerDiv = document.createElement("div");
          div.appendChild(analyzerDiv);
          const analyzer = new AnalyserNode(this.ctx);
          const updateLine = createAnalyzerTimePlot(analyzerDiv, true);
          const analyzerBuffer = new Float32Array(analyzer.fftSize);
          setInterval(() => {
            analyzer.getFloatTimeDomainData(analyzerBuffer);
            updateLine(analyzerBuffer);
          }, 30);
          osc.node.connect(analyzer);
          return osc;
        case "periodicoscillator":
          return new PeriodicOscillator(this, div);
        case "adsr":
          return new ADSR(this, div);
        case "volume":
          return new Volume(this, div);
      }
    });
    for (let i = 0; i < modules.length - 1; i++) {
      modules[i]!.node.connect(modules[i + 1]!.node);
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
    filter.connect(this.ctx.destination);
    modules[modules.length - 1]!.node.connect(filter);
  }
}

class PeriodicOscillator {
  public node: OscillatorNode;
  public depth = 10;
  private controllers: HTMLInputElement[];

  constructor(private patch: Patch, private el: HTMLFieldSetElement) {
    this.controllers = Array(this.depth)
      .fill(undefined)
      .map((controller, idx) => {
        const input = document.createElement("input");
        const label = document.createElement("label");
        label.innerText = String(idx);
        label.appendChild(input);
        input.type = "range";
        input.min = "0";
        input.max = "0.5";
        input.value = "0";
        input.step = "0.001";
        input.setAttribute("orient", "vertical");
        input.addEventListener("input", this.updateWave);
        this.el.appendChild(label);
        return input;
      });
    this.node = new OscillatorNode(this.patch.ctx);
    const analyzer = new AnalyserNode(this.patch.ctx);

    const select = document.createElement("select");
    [['Tidsdomene', 'time'], ['Frekvensdomene', 'freq']].forEach(([inner, value]) => {
      const option = document.createElement("option");
      option.innerHTML = inner;
      option.value = value;
      select.appendChild(option);
    });
    this.el.appendChild(select);

    const analyzerFreqContainer = document.createElement('div');
    const analyzerFreqDiv = document.createElement("div");
    analyzerFreqContainer.appendChild(analyzerFreqDiv);
    this.el.appendChild(analyzerFreqContainer);
    const updateLine = createAnalyzerTimePlot(analyzerFreqDiv, true);
    const analyzerBuffer = new Float32Array(analyzer.frequencyBinCount);
    setInterval(() => {
      analyzer.getFloatFrequencyData(analyzerBuffer);
      updateLine(analyzerBuffer.map((num) => num / -100));
    }, 30);

    const analyzerTimeContainer = document.createElement('div');
    analyzerTimeContainer.style.display = 'none';
    const analyzerTimeDiv = document.createElement("div");
    analyzerTimeContainer.appendChild(analyzerTimeDiv);
    this.el.appendChild(analyzerTimeContainer);
    const updateTimeLine = createAnalyzerTimePlot(analyzerTimeDiv, true);
    const analyzerTime = new Float32Array(
      analyzer.fftSize)
    );
    setInterval(() => {
      analyzer.getFloatTimeDomainData(analyzerTime);
      updateTimeLine(analyzerTime);
    }, 30);

    select.addEventListener("change", () => {
      switch (select.value) {
        case "time":
          analyzerTimeContainer.style.display = 'block';
          analyzerFreqContainer.style.display = 'none';
          break;
        case "freq":
          analyzerTimeContainer.style.display = 'none';
          analyzerFreqContainer.style.display = 'block';
      }
    });

    this.node.connect(analyzer);
    this.node.start();
    this.updateWave();
  }

  updateWave = () => {
    if (this.patch.ctx.state === "suspended") {
      this.patch.ctx.resume();
    }
    const values = this.controllers.map((input) => Number(input.value));
    console.log(values);
    const imag = new Float32Array(values);
    const real = new Float32Array(Array(this.depth).fill(0));
    const periodicWave = new PeriodicWave(this.patch.ctx, {
      imag,
      real,
      disableNormalization: true,
    });
    this.node.setPeriodicWave(periodicWave);
  };
}

class Oscillator {
  public node: OscillatorNode;

  constructor(private patch: Patch, private el: HTMLFieldSetElement) {
    this.node = new OscillatorNode(this.patch.ctx);
    this.node.start();
    this.node.frequency.value = 440;
    this.node.type = "sine";

    const select = document.createElement("select");
    for (let waveform of ["square", "sine", "triangle"]) {
      const option = document.createElement("option");
      option.value = waveform;
      option.text = waveform;
      select.appendChild(option);
    }
    select.onchange = () => {
      this.node.type = select.value as OscillatorType;
    };
    this.el.appendChild(select);

    const freq = document.createElement("input");
    freq.type = "range";
    freq.min = "20";
    freq.max = "2000";
    freq.step = "1";
    freq.value = "660";

    freq.addEventListener("input", () => {
      this.node.frequency.setValueAtTime(
        freq.valueAsNumber,
        this.patch.ctx.currentTime
      );
    });
    this.el.appendChild(freq);
  }
}

class Volume {
  public node = this.patch.ctx.createGain();
  private volController: HTMLInputElement;

  constructor(private patch: Patch, private el: HTMLFieldSetElement) {
    this.volController = document.createElement("input");
    this.volController.type = "range";
    this.volController.min = "0";
    this.volController.max = "10";
    this.volController.value = "5";
    this.volController.step = "0.001";
    this.el.appendChild(this.volController);

    this.volController.addEventListener("input", (ev) => {
      const val = (ev.target as HTMLInputElement).value;
      this.node.gain.setValueAtTime(
        Number(val) / 10,
        this.patch.ctx.currentTime
      );
    });
  }
}

class ADSR {
  public node: GainNode;

  private aController: HTMLInputElement = document.createElement("input");
  private dController: HTMLInputElement = document.createElement("input");
  private sController: HTMLInputElement = document.createElement("input");
  private rController: HTMLInputElement = document.createElement("input");
  private trigger: HTMLButtonElement = document.createElement("button");

  private interval?: number;

  constructor(private patch: Patch, private el: HTMLFieldSetElement) {
    this.node = new GainNode(this.patch.ctx);

    for (let controller of [
      this.aController,
      this.dController,
      this.sController,
      this.rController,
    ]) {
      controller.type = "range";
      controller.min = "1";
      controller.max = "10";
      controller.value = "5";
      controller.step = "0.001";
      this.el.appendChild(controller);
    }
    this.trigger.innerText = "Trigger!";
    this.trigger.addEventListener("touchstart", this.press);
    this.trigger.addEventListener("mousedown", this.press);
    this.el.appendChild(this.trigger);
  }

  press = () => {
    if (this.patch.ctx.state === "suspended") {
      this.patch.ctx.resume();
    }

    const now = this.patch.ctx.currentTime;
    const a = this.aController.valueAsNumber / 10;
    const d = this.dController.valueAsNumber / 10;
    const s = this.sController.valueAsNumber / 10;

    this.node.gain.cancelAndHoldAtTime?.(now);
    this.node.gain.exponentialRampToValueAtTime(1.0, now + a);
    this.node.gain.exponentialRampToValueAtTime(s, now + a + d);

    document.addEventListener("touchend", this.release);
    document.addEventListener("mouseup", this.release);
  };

  release = () => {
    const now = this.patch.ctx.currentTime;
    const then = now + this.rController.valueAsNumber / 10;

    this.node.gain.cancelAndHoldAtTime?.(now) ??
      this.node.gain.cancelScheduledValues(now);
    this.node.gain.linearRampToValueAtTime(this.node.gain.value, now);
    this.node.gain.linearRampToValueAtTime(0.0001, then);

    document.removeEventListener("touchend", this.release);
    document.removeEventListener("mouseup", this.release);
  };
}

(
  Array.from(document.getElementsByClassName("patch")) as HTMLDivElement[]
).forEach((div) => {
  new Patch(div);
});
