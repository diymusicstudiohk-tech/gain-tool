// AudioWorklet Gain Processor
// Simple input gain + output gain with per-sample parameter smoothing + clip gain per marker

const LN10_OVER_20 = Math.LN10 / 20;

// Pre-compute marker regions with sample indices and linear gain
function buildMarkerRegions(markers, totalSamples, crossfade) {
    if (!markers || markers.length === 0) return [];
    const regions = [];
    for (let i = 0; i < markers.length; i++) {
        const m = markers[i];
        if (m.clipGainDb === 0 || m.clipGainDb == null) continue;
        regions.push({
            startSample: Math.round(m.startFrac * totalSamples),
            endSample: Math.round(m.endFrac * totalSamples),
            gainLinear: Math.exp(m.clipGainDb * LN10_OVER_20),
            crossfade: crossfade,
        });
    }
    return regions;
}

// Compute effective clip gain for a given sample index with crossfade
function clipGainForSample(i, regions) {
    let gain = 1.0;
    for (let r = 0; r < regions.length; r++) {
        const region = regions[r];
        if (i < region.startSample - region.crossfade || i > region.endSample + region.crossfade) continue;
        let fadeFactor;
        if (i < region.startSample) {
            fadeFactor = (i - (region.startSample - region.crossfade)) / region.crossfade;
        } else if (i > region.endSample) {
            fadeFactor = ((region.endSample + region.crossfade) - i) / region.crossfade;
        } else {
            fadeFactor = 1.0;
        }
        fadeFactor = Math.max(0, Math.min(1, fadeFactor));
        gain *= 1 + fadeFactor * (region.gainLinear - 1);
    }
    return gain;
}

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

        // Clip gain state
        this._samplePos = 0;
        this._markerRegions = [];
        this._hasClipGain = false;

        this.port.onmessage = (e) => {
            const p = e.data;

            // Handle sample position reset (seek)
            if (p.samplePosition !== undefined) {
                this._samplePos = p.samplePosition;
            }

            // Handle marker updates
            if (p.markers !== undefined && p.totalSamples !== undefined) {
                const CROSSFADE = 32;
                this._markerRegions = buildMarkerRegions(p.markers, p.totalSamples, CROSSFADE);
                this._hasClipGain = this._markerRegions.length > 0;
            }

            // Handle gain params
            if (p.inputGain !== undefined || p.outputGain !== undefined) {
                this.params = p;
                this.targets.inputGain = p.inputGain ?? 0;
                this.targets.outputGain = p.outputGain ?? 0;
            }
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

        const hasClipGain = this._hasClipGain;
        const markerRegions = this._markerRegions;
        const samplePos = this._samplePos;

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

            let sample = inputData[i] * inputGainLinear;
            if (hasClipGain) sample *= clipGainForSample(samplePos + i, markerRegions);
            outputData[i] = sample * outputGainLinear;
        }

        this._samplePos += length;

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
