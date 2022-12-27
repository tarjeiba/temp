"use strict";
class Patch {
    constructor(id) {
        this.ctx = new window.AudioContext();
        const container = document.getElementById(id);
        if (!container)
            return;
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
            modules[i].node.connect(modules[i + 1].node);
        }
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
        filter.connect(this.ctx.destination);
        modules[modules.length - 1].node.connect(filter);
    }
}
class Oscillator {
    constructor(patch, el) {
        this.patch = patch;
        this.el = el;
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
            this.node.type = select.value;
        };
        this.el.appendChild(select);
        const freq = document.createElement("input");
        freq.type = "range";
        freq.min = "20";
        freq.max = "2000";
        freq.step = "1";
        freq.value = "660";
        freq.addEventListener("input", () => {
            this.node.frequency.setValueAtTime(freq.valueAsNumber, this.patch.ctx.currentTime);
        });
        this.el.appendChild(freq);
    }
}
class Volume {
    constructor(patch, el) {
        this.patch = patch;
        this.el = el;
        this.node = this.patch.ctx.createGain();
        this.volController = document.createElement("input");
        this.volController.type = "range";
        this.volController.min = "1";
        this.volController.max = "10";
        this.volController.value = "5";
        this.volController.step = "0.001";
        this.el.appendChild(this.volController);
        this.volController.addEventListener("input", (ev) => {
            const val = ev.target.value;
            this.node.gain.setValueAtTime(Number(val) / 10, this.patch.ctx.currentTime);
        });
    }
}
class ADSR {
    constructor(patch, el) {
        this.patch = patch;
        this.el = el;
        this.aController = document.createElement("input");
        this.dController = document.createElement("input");
        this.sController = document.createElement("input");
        this.rController = document.createElement("input");
        this.trigger = document.createElement("button");
        this.press = () => {
            var _a, _b;
            if (this.patch.ctx.state === "suspended") {
                this.patch.ctx.resume();
            }
            const now = this.patch.ctx.currentTime;
            const a = this.aController.valueAsNumber / 10;
            const d = this.dController.valueAsNumber / 10;
            const s = this.sController.valueAsNumber / 10;
            (_b = (_a = this.node.gain).cancelAndHoldAtTime) === null || _b === void 0 ? void 0 : _b.call(_a, now);
            this.node.gain.exponentialRampToValueAtTime(1.0, now + a);
            this.node.gain.exponentialRampToValueAtTime(s, now + a + d);
            document.addEventListener("touchend", this.release);
            document.addEventListener("mouseup", this.release);
        };
        this.release = () => {
            var _a, _b;
            const now = this.patch.ctx.currentTime;
            const then = now + this.rController.valueAsNumber / 10;
            (_b = (_a = this.node.gain).cancelAndHoldAtTime) === null || _b === void 0 ? void 0 : _b.call(_a, now);
            this.node.gain.linearRampToValueAtTime(this.node.gain.value, now);
            this.node.gain.linearRampToValueAtTime(0.001, then);
            document.removeEventListener("touchend", this.release);
            document.removeEventListener("mouseup", this.release);
        };
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
}
(() => {
    const patch = new Patch("adsr");
})();
