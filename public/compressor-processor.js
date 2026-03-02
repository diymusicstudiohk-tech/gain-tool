// AudioWorklet Gain Processor
// Simple input gain + output gain with per-sample parameter smoothing

const LN10_OVER_20 = Math.LN10 / 20;

class CompressorProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Smoothed parameter current values
        this.smoothed = { inputGain: 0, outputGain: 0 };
        // Smoothing targets
        this.targets = { inputGain: 0, outputGain: 0 };

        // Cached linear gain values (avoid per-sample Math.exp when stable)
        this._prevInputGain = 0;
        this._cachedInputGainLinear = 1.0;
        this._prevOutputGain = 0;
        this._cachedOutputGainLinear = 1.0;

        // Smoothing coefficient (~5ms time constant)
        this.smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));

        this.params = null;

        this.port.onmessage = (e) => {
            const p = e.data;
            this.params = p;
            this.targets.inputGain = p.inputGain ?? 0;
            this.targets.outputGain = p.outputGain ?? 0;
        };
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || !input[0] || !this.params) {
            return true;
        }

        const inputData = input[0];
        const outputData = output[0];
        const length = inputData.length;

        const smoothCoeff = this.smoothCoeff;
        const tInputGain = this.targets.inputGain;
        const tOutputGain = this.targets.outputGain;

        let sInputGain = this.smoothed.inputGain;
        let sOutputGain = this.smoothed.outputGain;

        let prevInputGain = this._prevInputGain;
        let inputGainLinear = this._cachedInputGainLinear;
        let prevOutputGain = this._prevOutputGain;
        let outputGainLinear = this._cachedOutputGainLinear;

        for (let i = 0; i < length; i++) {
            sInputGain += smoothCoeff * (tInputGain - sInputGain);
            sOutputGain += smoothCoeff * (tOutputGain - sOutputGain);

            if (sInputGain !== prevInputGain) {
                inputGainLinear = Math.exp(sInputGain * LN10_OVER_20);
                prevInputGain = sInputGain;
            }
            if (sOutputGain !== prevOutputGain) {
                outputGainLinear = Math.exp(sOutputGain * LN10_OVER_20);
                prevOutputGain = sOutputGain;
            }

            outputData[i] = inputData[i] * inputGainLinear * outputGainLinear;
        }

        // Write back state
        this.smoothed.inputGain = sInputGain;
        this.smoothed.outputGain = sOutputGain;
        this._prevInputGain = prevInputGain;
        this._cachedInputGainLinear = inputGainLinear;
        this._prevOutputGain = prevOutputGain;
        this._cachedOutputGainLinear = outputGainLinear;

        return true;
    }
}

registerProcessor('compressor-processor', CompressorProcessor);
