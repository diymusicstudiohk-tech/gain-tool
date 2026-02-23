// Pre-computed constants to replace Math.log10/Math.pow(10, x/20) in hot loops
const LN10_OVER_20 = Math.LN10 / 20;        // Math.exp(db * LN10_OVER_20) ≡ Math.pow(10, db/20)
const TWENTY_LOG10E = 20 * Math.LOG10E;      // Math.log(x) * TWENTY_LOG10E ≡ 20 * Math.log10(x)

export const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const {
        threshold, ratio, attack, release, knee, lookahead,
        makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
        isGateBypass, isCompBypass
    } = params;

    const length = inputData.length;
    const outputData = new Float32Array(length);
    const grCurve = new Float32Array(length);
    const makeUpLinear = Math.exp(makeupGain * LN10_OVER_20);
    const effectiveSampleRate = sampleRate / step;

    const attTime = (attack / 1000) * effectiveSampleRate;
    const relTime = (release / 1000) * effectiveSampleRate;
    const gAttTime = (gateAttack / 1000) * effectiveSampleRate;
    const gRelTime = (gateRelease / 1000) * effectiveSampleRate;

    const compAttCoeff = 1 - Math.exp(-1 / attTime);
    const compRelCoeff = 1 - Math.exp(-1 / relTime);
    const gateAttCoeff = 1 - Math.exp(-1 / gAttTime);
    const gateRelCoeff = 1 - Math.exp(-1 / gRelTime);
    const lookaheadSamples = Math.floor(((lookahead / 1000) * effectiveSampleRate));

    let compEnvelope = 0;
    let gateEnvelope = 0;

    for (let i = 0; i < length; i++) {
        let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
        const inputLevel = Math.abs(inputData[detectorIndex]);
        const currentInput = inputData[i];

        // Gate
        if (inputLevel > gateEnvelope) gateEnvelope += gateAttCoeff * (inputLevel - gateEnvelope);
        else gateEnvelope += gateRelCoeff * (inputLevel - gateEnvelope);

        let gateGaindB = 0;
        if (!isGateBypass) {
            let gateEnvdB = Math.log(gateEnvelope + 1e-6) * TWENTY_LOG10E;
            if (gateEnvdB < gateThreshold) gateGaindB = -(gateThreshold - gateEnvdB) * (gateRatio - 1);
        }
        const gateGainLinear = Math.exp(gateGaindB * LN10_OVER_20);

        // Comp
        const gatedDetectorLevel = inputLevel * gateGainLinear;
        if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
        else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);

        let compEnvdB = Math.log(compEnvelope + 1e-6) * TWENTY_LOG10E;
        let compGainReductiondB = 0;

        if (!isCompBypass) {
            if (compEnvdB > threshold - knee / 2) {
                if (knee > 0 && compEnvdB < threshold + knee / 2) {
                    let slope = 1 - (1 / ratio);
                    let over = compEnvdB - (threshold - knee / 2);
                    compGainReductiondB = -slope * ((over * over) / (2 * knee));
                } else if (compEnvdB >= threshold + knee / 2) {
                    compGainReductiondB = (threshold - compEnvdB) * (1 - 1 / ratio);
                }
            }
        }

        const compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20);
        outputData[i] = currentInput * gateGainLinear * compGainLinear * makeUpLinear;
        grCurve[i] = Math.min(0, gateGaindB + compGainReductiondB);
    }

    return { outputData, grCurve, visualInput: inputData };
};

export const createRealTimeCompressor = (sampleRate) => {
    let compEnvelope = 0;
    let gateEnvelope = 0;

    // Coefficient cache — only recalculate when params object identity changes
    let _cachedParams = null;
    let _makeUpLinear, _compAttCoeff, _compRelCoeff, _gateAttCoeff, _gateRelCoeff, _dryLinear;
    let _threshold, _ratio, _knee, _isGateBypass, _isCompBypass, _isDeltaMode;

    return {
        processBlock: (inputBuffer, outputBuffer, params) => {
            const inputData = inputBuffer.getChannelData ? inputBuffer.getChannelData(0) : inputBuffer;
            const outputData = outputBuffer.getChannelData ? outputBuffer.getChannelData(0) : outputBuffer;
            const length = inputBuffer.length !== undefined ? inputBuffer.length : inputData.length;

            if (params !== _cachedParams) {
                _cachedParams = params;

                const {
                    threshold, ratio, attack, release, knee,
                    makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
                    isGateBypass, isCompBypass,
                    isDeltaMode, dryGain
                } = params;

                _threshold = threshold;
                _ratio = ratio;
                _knee = knee;
                _isGateBypass = isGateBypass;
                _isCompBypass = isCompBypass;
                _isDeltaMode = isDeltaMode;

                _makeUpLinear = Math.exp(makeupGain * LN10_OVER_20);
                const attTime = (attack / 1000) * sampleRate;
                const relTime = (release / 1000) * sampleRate;
                const gAttTime = (gateAttack / 1000) * sampleRate;
                const gRelTime = (gateRelease / 1000) * sampleRate;

                _compAttCoeff = 1 - Math.exp(-1 / attTime);
                _compRelCoeff = 1 - Math.exp(-1 / relTime);
                _gateAttCoeff = 1 - Math.exp(-1 / gAttTime);
                _gateRelCoeff = 1 - Math.exp(-1 / gRelTime);

                _dryLinear = Math.exp(dryGain * LN10_OVER_20);
            }

            const { gateThreshold, gateRatio } = params;

            for (let i = 0; i < length; i++) {
                const inputSample = inputData[i];
                const inputLevel = Math.abs(inputSample);

                // Gate
                if (!_isGateBypass) {
                    if (inputLevel > gateEnvelope) gateEnvelope += _gateAttCoeff * (inputLevel - gateEnvelope);
                    else gateEnvelope += _gateRelCoeff * (inputLevel - gateEnvelope);
                }

                let gateGaindB = 0;
                if (!_isGateBypass) {
                    let gateEnvdB = Math.log(gateEnvelope + 1e-6) * TWENTY_LOG10E;
                    if (gateEnvdB < gateThreshold) gateGaindB = -(gateThreshold - gateEnvdB) * (gateRatio - 1);
                }
                const gateGainLinear = Math.exp(gateGaindB * LN10_OVER_20);
                const gatedDetectorLevel = inputLevel * gateGainLinear;

                // Compressor
                if (!_isCompBypass) {
                    if (gatedDetectorLevel > compEnvelope) compEnvelope += _compAttCoeff * (gatedDetectorLevel - compEnvelope);
                    else compEnvelope += _compRelCoeff * (gatedDetectorLevel - compEnvelope);
                }

                let compEnvdB = Math.log(compEnvelope + 1e-6) * TWENTY_LOG10E;
                let compGainReductiondB = 0;

                if (!_isCompBypass) {
                    if (compEnvdB > _threshold - _knee / 2) {
                        if (_knee > 0 && compEnvdB < _threshold + _knee / 2) {
                            let slope = 1 - (1 / _ratio);
                            let over = compEnvdB - (_threshold - _knee / 2);
                            compGainReductiondB = -slope * ((over * over) / (2 * _knee));
                        } else if (compEnvdB >= _threshold + _knee / 2) {
                            compGainReductiondB = (_threshold - compEnvdB) * (1 - 1 / _ratio);
                        }
                    }
                }

                const compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20);

                // Final Output
                const wet = inputSample * gateGainLinear * compGainLinear * _makeUpLinear;

                if (_isDeltaMode) {
                    outputData[i] = wet - inputSample;
                } else {
                    outputData[i] = wet + (inputSample * _dryLinear);
                }
            }
        },
        reset: () => {
            compEnvelope = 0;
            gateEnvelope = 0;
        }
    };
};