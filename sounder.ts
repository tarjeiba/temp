class Patch {
  public ctx = new window.AudioContext();

  constructor(id: string) {
    const container = document.getElementById(id);
    if (!container) return;
    const divs = container.getElementsByTagName("div");
    const modules = Array.from(divs).map((div) => {
      const moduleType = div.getAttribute("module");
      switch (moduleType) {
        case "oscillator":
          return new Oscillator(this, div);
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

class Oscillator {
  public node: OscillatorNode;

  constructor(private patch: Patch, private el: HTMLDivElement) {
    this.node = this.patch.ctx.createOscillator();
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

    freq.onchange = () => {
      this.node.frequency.setValueAtTime(
        Number(freq.value),
        this.patch.ctx.currentTime
      );
    };
    this.el.appendChild(freq);
  }
}

class Volume {
  public node = this.patch.ctx.createGain();
  private volController: HTMLInputElement;

  constructor(private patch: Patch, private el: HTMLDivElement) {
    this.volController = document.createElement("input");
    this.volController.type = "range";
    this.volController.min = "0";
    this.volController.max = "2";
    this.volController.value = "1";
    this.volController.step = "0.01";
    this.el.appendChild(this.volController);
  }
}

class ADSR {
  public node: GainNode;

  private aController: HTMLInputElement;
  private dController: HTMLInputElement;
  private sController: HTMLInputElement;
  private rController: HTMLInputElement;
  private trigger: HTMLButtonElement;

  constructor(private patch: Patch, private el: HTMLDivElement) {
    this.node = this.patch.ctx.createGain();

    for (let name of [
      "aController",
      "dController",
      "sController",
      "rController",
    ]) {
      this[name] = document.createElement("input");
      this[name].type = "range";
      this[name].min = "0";
      this[name].max = "10";
      this[name].value = "1";
      this[name].step = "0.01";
      this.el.appendChild(this[name]);
    }

    this.trigger = document.createElement("button");
    this.trigger.innerText = "Trigger";
    this.trigger.addEventListener("touchstart", this.press);
    this.trigger.addEventListener("mousedown", this.press);
    this.el.appendChild(this.trigger);
  }

  press = () => {
    this.patch.ctx.resume();
    this.node.gain.exponentialRampToValueAtTime(
      1.0,
      this.patch.ctx.currentTime + Number(this.aController.value)
    );
    this.node.gain.exponentialRampToValueAtTime(
      1.0 * Number(this.sController.value),
      this.patch.ctx.currentTime +
        Number(this.aController.value) +
        Number(this.dController.value)
    );
    document.addEventListener("touchend", this.release);
    document.addEventListener("mouseup", this.release);
  };

  release = () => {
    this.node.gain.cancelScheduledValues(this.patch.ctx.currentTime);
    this.node.gain.exponentialRampToValueAtTime(
      0.0000001,
      this.patch.ctx.currentTime + Number(this.rController.value)
    );
    document.removeEventListener("touchend", this.release);
    document.removeEventListener("mouseup", this.release);
  };
}
