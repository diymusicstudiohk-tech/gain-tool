import { LN10_OVER_20 } from './dspConstants';

// Pre-compute marker regions with sample indices and linear gain
const buildMarkerRegions = (markers, totalSamples, crossfade) => {
    if (!markers || markers.length === 0) return [];
    return markers
        .filter(m => m.clipGainDb !== 0 && m.clipGainDb != null)
        .map(m => ({
            startSample: Math.round(m.startFrac * totalSamples),
            endSample: Math.round(m.endFrac * totalSamples),
            gainLinear: Math.exp(m.clipGainDb * LN10_OVER_20),
            crossfade,
        }));
};

// Compute effective clip gain for a given sample index with crossfade
const clipGainForSample = (i, regions) => {
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
};

export const processCompressor = (inputData, sampleRate, params, step = 1, preallocated = null, markers = []) => {
    const { inputGain, outputGain } = params;

    const length = inputData.length;
    const outputData = (preallocated?.output?.length === length) ? preallocated.output : new Float32Array(length);
    const inputGainLinear = Math.exp((inputGain || 0) * LN10_OVER_20);
    const outputGainLinear = Math.exp((outputGain || 0) * LN10_OVER_20);

    // Pre-compute marker regions (crossfade scaled for downsampled data)
    const CROSSFADE = Math.max(1, Math.ceil(32 / step));
    const totalSamples = length;
    const regions = buildMarkerRegions(markers, totalSamples, CROSSFADE);
    const hasClipGain = regions.length > 0;

    for (let i = 0; i < length; i++) {
        let sample = inputData[i] * inputGainLinear;
        if (hasClipGain) sample *= clipGainForSample(i, regions);
        outputData[i] = sample * outputGainLinear;
    }

    // visualInput: only inputGain, no clip gain (correct for auto-snap)
    let visualInput = inputData;
    if (Math.abs(inputGain || 0) > 0.001) {
        visualInput = preallocated?.visualInput?.length === length
            ? preallocated.visualInput : new Float32Array(length);
        for (let i = 0; i < length; i++) visualInput[i] = inputData[i] * inputGainLinear;
    }

    return { outputData, visualInput };
};

export const createRealTimeCompressor = (sampleRate) => {
    // Parameter smoothing state (~5ms time constant)
    const smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));
    const smoothed = { inputGain: 0, outputGain: 0 };
    const targets = { inputGain: 0, outputGain: 0 };

    // Cached linear gain values — avoid Math.exp when smoothed value unchanged
    let _prevInputGain = 0;
    let _inputGainLinear = 1.0;
    let _prevOutputGain = 0;
    let _outputGainLinear = 1.0;

    let _cachedParams = null;

    // Clip gain state
    let _samplePos = 0;
    let _markerRegions = [];
    let _hasClipGain = false;

    return {
        setMarkers: (markers, totalSamples) => {
            const CROSSFADE = Math.max(1, Math.ceil(32 * 1)); // full-res, step=1
            _markerRegions = buildMarkerRegions(markers, totalSamples, CROSSFADE);
            _hasClipGain = _markerRegions.length > 0;
        },
        setSamplePosition: (pos) => {
            _samplePos = pos;
        },
        processBlock: (inputBuffer, outputBuffer, params) => {
            const inputData = inputBuffer.getChannelData ? inputBuffer.getChannelData(0) : inputBuffer;
            const outputData = outputBuffer.getChannelData ? outputBuffer.getChannelData(0) : outputBuffer;
            const length = inputBuffer.length !== undefined ? inputBuffer.length : inputData.length;

            if (params !== _cachedParams) {
                _cachedParams = params;
                targets.inputGain = params.inputGain ?? 0;
                targets.outputGain = params.outputGain ?? 0;
            }

            for (let i = 0; i < length; i++) {
                smoothed.inputGain += smoothCoeff * (targets.inputGain - smoothed.inputGain);
                smoothed.outputGain += smoothCoeff * (targets.outputGain - smoothed.outputGain);

                if (smoothed.inputGain !== _prevInputGain) {
                    _inputGainLinear = Math.exp(smoothed.inputGain * LN10_OVER_20);
                    _prevInputGain = smoothed.inputGain;
                }
                if (smoothed.outputGain !== _prevOutputGain) {
                    _outputGainLinear = Math.exp(smoothed.outputGain * LN10_OVER_20);
                    _prevOutputGain = smoothed.outputGain;
                }

                let sample = inputData[i] * _inputGainLinear;
                if (_hasClipGain) sample *= clipGainForSample(_samplePos + i, _markerRegions);
                outputData[i] = sample * _outputGainLinear;
            }

            _samplePos += length;
        },
        reset: () => {
            smoothed.inputGain = 0;
            smoothed.outputGain = 0;
            targets.inputGain = 0;
            targets.outputGain = 0;
            _prevInputGain = 0;
            _inputGainLinear = 1.0;
            _prevOutputGain = 0;
            _outputGainLinear = 1.0;
            _cachedParams = null;
            _samplePos = 0;
            _markerRegions = [];
            _hasClipGain = false;
        }
    };
};
