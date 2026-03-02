import { LN10_OVER_20 } from './dspConstants';

export const processCompressor = (inputData, sampleRate, params, step = 1, preallocated = null) => {
    const { inputGain, outputGain } = params;

    const length = inputData.length;
    const outputData = (preallocated?.output?.length === length) ? preallocated.output : new Float32Array(length);
    const inputGainLinear = Math.exp((inputGain || 0) * LN10_OVER_20);
    const outputGainLinear = Math.exp((outputGain || 0) * LN10_OVER_20);

    for (let i = 0; i < length; i++) {
        outputData[i] = inputData[i] * inputGainLinear * outputGainLinear;
    }

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

    return {
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

                outputData[i] = inputData[i] * _inputGainLinear * _outputGainLinear;
            }
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
        }
    };
};
