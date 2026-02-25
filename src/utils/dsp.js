import { LN10_OVER_20, TWENTY_LOG10E, LOG_FLOOR } from './dspConstants';

export const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const {
        threshold, ratio, attack, release, knee, lookahead,
        makeupGain, gateThreshold, gateAttack, gateRelease,
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
    let gateGainEnvelope = 0;

    for (let i = 0; i < length; i++) {
        let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
        const inputLevel = Math.abs(inputData[detectorIndex]);
        const currentInput = inputData[i];

        // Gate — separated detection + gain transition
        let gateGainLinear = 1;
        let gateGaindB = 0;
        if (!isGateBypass) {
            const gateDetectorLeveldB = Math.log(inputLevel + LOG_FLOOR) * TWENTY_LOG10E;
            const gateIsOpen = gateDetectorLeveldB >= gateThreshold;
            const gateGainTarget = gateIsOpen ? 1.0 : 0.0;
            if (gateGainTarget > gateGainEnvelope)
                gateGainEnvelope += gateAttCoeff * (gateGainTarget - gateGainEnvelope);
            else
                gateGainEnvelope += gateRelCoeff * (gateGainTarget - gateGainEnvelope);
            gateGainLinear = gateGainEnvelope;
            gateGaindB = Math.log(gateGainEnvelope + LOG_FLOOR) * TWENTY_LOG10E;
        }

        // Comp
        const gatedDetectorLevel = inputLevel * gateGainLinear;
        if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
        else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);

        let compEnvdB = Math.log(compEnvelope + LOG_FLOOR) * TWENTY_LOG10E;
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

// Max look-ahead: 100ms @ 48kHz = 4800 samples
const MAX_LOOKAHEAD_SAMPLES = 4800;

export const createRealTimeCompressor = (sampleRate) => {
    let compEnvelope = 0;
    let gateGainEnvelope = 0;

    // Look-ahead ring buffer (P3)
    const delayBuffer = new Float32Array(MAX_LOOKAHEAD_SAMPLES);
    let writePos = 0;

    // Parameter smoothing state (P2) — ~5ms time constant
    const smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));
    const smoothed = { threshold: -24, ratio: 4, knee: 6, makeupGain: 0, dryGain: -96 };
    const targets = { threshold: -24, ratio: 4, knee: 6, makeupGain: 0, dryGain: -96 };

    // Coefficient cache — only recalculate when params object identity changes
    let _cachedParams = null;
    let _compAttCoeff, _compRelCoeff, _gateAttCoeff, _gateRelCoeff;
    let _isGateBypass, _isCompBypass, _isDeltaMode;
    let _lookaheadSamples = 0;

    return {
        processBlock: (inputBuffer, outputBuffer, params) => {
            const inputData = inputBuffer.getChannelData ? inputBuffer.getChannelData(0) : inputBuffer;
            const outputData = outputBuffer.getChannelData ? outputBuffer.getChannelData(0) : outputBuffer;
            const length = inputBuffer.length !== undefined ? inputBuffer.length : inputData.length;

            if (params !== _cachedParams) {
                _cachedParams = params;

                const {
                    threshold, ratio, attack, release, knee,
                    makeupGain, gateAttack, gateRelease,
                    isGateBypass, isCompBypass,
                    isDeltaMode, dryGain, lookahead
                } = params;

                // Update smoothing targets (P2)
                targets.threshold = threshold;
                targets.ratio = ratio;
                targets.knee = knee;
                targets.makeupGain = makeupGain;
                targets.dryGain = dryGain;

                _isGateBypass = isGateBypass;
                _isCompBypass = isCompBypass;
                _isDeltaMode = isDeltaMode;

                const attTime = (attack / 1000) * sampleRate;
                const relTime = (release / 1000) * sampleRate;
                const gAttTime = (gateAttack / 1000) * sampleRate;
                const gRelTime = (gateRelease / 1000) * sampleRate;

                _compAttCoeff = 1 - Math.exp(-1 / attTime);
                _compRelCoeff = 1 - Math.exp(-1 / relTime);
                _gateAttCoeff = 1 - Math.exp(-1 / gAttTime);
                _gateRelCoeff = 1 - Math.exp(-1 / gRelTime);

                // Look-ahead (P3)
                _lookaheadSamples = Math.min(
                    Math.floor((lookahead / 1000) * sampleRate),
                    MAX_LOOKAHEAD_SAMPLES - 1
                );
            }

            const { gateThreshold } = params;

            for (let i = 0; i < length; i++) {
                // Per-sample parameter smoothing (P2)
                smoothed.threshold += smoothCoeff * (targets.threshold - smoothed.threshold);
                smoothed.ratio += smoothCoeff * (targets.ratio - smoothed.ratio);
                smoothed.knee += smoothCoeff * (targets.knee - smoothed.knee);
                smoothed.makeupGain += smoothCoeff * (targets.makeupGain - smoothed.makeupGain);
                smoothed.dryGain += smoothCoeff * (targets.dryGain - smoothed.dryGain);

                const makeUpLinear = Math.exp(smoothed.makeupGain * LN10_OVER_20);
                const dryLinear = Math.exp(smoothed.dryGain * LN10_OVER_20);

                const inputSample = inputData[i];

                // Write to delay line (P3)
                delayBuffer[writePos] = inputSample;
                const delayedSample = delayBuffer[(writePos - _lookaheadSamples + MAX_LOOKAHEAD_SAMPLES) % MAX_LOOKAHEAD_SAMPLES];

                // Detection uses current (non-delayed) sample
                const inputLevel = Math.abs(inputSample);

                // Gate — separated detection + gain transition
                let gateGainLinear = 1;
                if (!_isGateBypass) {
                    const gateDetectorLeveldB = Math.log(inputLevel + LOG_FLOOR) * TWENTY_LOG10E;
                    const gateIsOpen = gateDetectorLeveldB >= gateThreshold;
                    const gateGainTarget = gateIsOpen ? 1.0 : 0.0;
                    if (gateGainTarget > gateGainEnvelope)
                        gateGainEnvelope += _gateAttCoeff * (gateGainTarget - gateGainEnvelope);
                    else
                        gateGainEnvelope += _gateRelCoeff * (gateGainTarget - gateGainEnvelope);
                    gateGainLinear = gateGainEnvelope;
                }
                const gatedDetectorLevel = inputLevel * gateGainLinear;

                // Compressor
                if (!_isCompBypass) {
                    if (gatedDetectorLevel > compEnvelope) compEnvelope += _compAttCoeff * (gatedDetectorLevel - compEnvelope);
                    else compEnvelope += _compRelCoeff * (gatedDetectorLevel - compEnvelope);
                }

                let compEnvdB = Math.log(compEnvelope + LOG_FLOOR) * TWENTY_LOG10E;
                let compGainReductiondB = 0;

                if (!_isCompBypass) {
                    const halfKnee = smoothed.knee / 2;
                    if (compEnvdB > smoothed.threshold - halfKnee) {
                        if (smoothed.knee > 0 && compEnvdB < smoothed.threshold + halfKnee) {
                            const slope = 1 - (1 / smoothed.ratio);
                            const over = compEnvdB - (smoothed.threshold - halfKnee);
                            compGainReductiondB = -slope * ((over * over) / (2 * smoothed.knee));
                        } else if (compEnvdB >= smoothed.threshold + halfKnee) {
                            compGainReductiondB = (smoothed.threshold - compEnvdB) * (1 - 1 / smoothed.ratio);
                        }
                    }
                }

                const compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20);

                // Output uses delayed sample (P3)
                const wet = delayedSample * gateGainLinear * compGainLinear * makeUpLinear;

                if (_isDeltaMode) {
                    outputData[i] = wet - delayedSample;
                } else {
                    outputData[i] = wet + (delayedSample * dryLinear);
                }

                writePos = (writePos + 1) % MAX_LOOKAHEAD_SAMPLES;
            }
        },
        reset: () => {
            compEnvelope = 0;
            gateGainEnvelope = 0;
            delayBuffer.fill(0);
            writePos = 0;
        }
    };
};