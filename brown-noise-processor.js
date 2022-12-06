class BrownNoiseProcessor extends AudioWorkletProcessor {
  prior = [Math.random(), Math.random()];
  scale = 0.02;

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    output.forEach((channel) => {
      const thisPrior = this.prior[output.indexOf(channel)];
      channel[0] = (thisPrior + this.scale * Math.random()) / (1 + this.scale);
      for (let i = 1; i < channel.length; i++) {
        channel[i] =
          (channel[i - 1] + this.scale * Math.random()) / (1 + this.scale);
      }
      this.prior[output.indexOf(channel)] = channel[channel.length - 1];
    });
    return true;
  }
}

registerProcessor("brown-noise-processor", BrownNoiseProcessor);
