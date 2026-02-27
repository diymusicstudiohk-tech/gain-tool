import { LN10_OVER_20, TWENTY_LOG10E, LOG_FLOOR } from './dspConstants';

export const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const {
        threshold, attack, release, lookahead,
        makeupGain, isCompBypass, clipDrive = 1.0
    } = params;

    const length = inputData.length;
    const outputData = new Float32Array(length);
    const grCurve = new Float32Array(length);
    const makeUpLinear = Math.exp(makeupGain * LN10_OVER_20);
    const effectiveSampleRate = sampleRate / step;

    const attTime = (attack / 1000) * effectiveSampleRate;
    const relTime = (release / 1000) * effectiveSampleRate;

    const compAttCoeff = 1 - Math.exp(-1 / attTime);
    const compRelCoeff = 1 - Math.exp(-1 / relTime);
    const lookaheadSamples = Math.floor(((lookahead / 1000) * effectiveSampleRate));

    let compEnvelope = 0;

    for (let i = 0; i < length; i++) {
        let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
        const inputLevel = Math.abs(inputData[detectorIndex]);
        const currentInput = inputData[i];

        // Comp
        if (inputLevel > compEnvelope) compEnvelope += compAttCoeff * (inputLevel - compEnvelope);
        else compEnvelope += compRelCoeff * (inputLevel - compEnvelope);

        let compEnvdB = Math.log(compEnvelope + LOG_FLOOR) * TWENTY_LOG10E;
        let compGainReductiondB = 0;

        if (!isCompBypass) {
            if (compEnvdB > threshold) {
                compGainReductiondB = threshold - compEnvdB;
            }
        }

        const compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20);
        let wet = currentInput * compGainLinear * makeUpLinear;
        if (clipDrive > 1.0001) {
            wet = Math.tanh(clipDrive * wet) / Math.tanh(clipDrive);
        }
        outputData[i] = wet;
        grCurve[i] = Math.min(0, compGainReductiondB);
    }

    return { outputData, grCurve, visualInput: inputData };
};

// Max look-ahead: 100ms @ 48kHz = 4800 samples
const MAX_LOOKAHEAD_SAMPLES = 4800;

export const createRealTimeCompressor = (sampleRate) => {
    let compEnvelope = 0;

    // Look-ahead ring buffer (P3)
    const delayBuffer = new Float32Array(MAX_LOOKAHEAD_SAMPLES);
    let writePos = 0;

    // Parameter smoothing state (P2) — ~5ms time constant
    const smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));
    const smoothed = { threshold: -24, makeupGain: 0, dryGain: -96, clipDrive: 1.0 };
    const targets = { threshold: -24, makeupGain: 0, dryGain: -96, clipDrive: 1.0 };

    // Coefficient cache — only recalculate when params object identity changes
    let _cachedParams = null;
    let _compAttCoeff, _compRelCoeff;
    let _isCompBypass, _isDeltaMode;
    let _lookaheadSamples = 0;

    return {
        processBlock: (inputBuffer, outputBuffer, params) => {
            const inputData = inputBuffer.getChannelData ? inputBuffer.getChannelData(0) : inputBuffer;
            const outputData = outputBuffer.getChannelData ? outputBuffer.getChannelData(0) : outputBuffer;
            const length = inputBuffer.length !== undefined ? inputBuffer.length : inputData.length;

            if (params !== _cachedParams) {
                _cachedParams = params;

                const {
                    threshold, attack, release,
                    makeupGain, isCompBypass,
                    isDeltaMode, dryGain, lookahead,
                    clipDrive = 1.0
                } = params;

                // Update smoothing targets (P2)
                targets.threshold = threshold;
                targets.makeupGain = makeupGain;
                targets.dryGain = dryGain;
                targets.clipDrive = clipDrive;

                _isCompBypass = isCompBypass;
                _isDeltaMode = isDeltaMode;

                const attTime = (attack / 1000) * sampleRate;
                const relTime = (release / 1000) * sampleRate;

                _compAttCoeff = 1 - Math.exp(-1 / attTime);
                _compRelCoeff = 1 - Math.exp(-1 / relTime);

                // Look-ahead (P3)
                _lookaheadSamples = Math.min(
                    Math.floor((lookahead / 1000) * sampleRate),
                    MAX_LOOKAHEAD_SAMPLES - 1
                );
            }

            for (let i = 0; i < length; i++) {
                // Per-sample parameter smoothing (P2)
                smoothed.threshold += smoothCoeff * (targets.threshold - smoothed.threshold);
                smoothed.makeupGain += smoothCoeff * (targets.makeupGain - smoothed.makeupGain);
                smoothed.dryGain += smoothCoeff * (targets.dryGain - smoothed.dryGain);
                smoothed.clipDrive += smoothCoeff * (targets.clipDrive - smoothed.clipDrive);

                const makeUpLinear = Math.exp(smoothed.makeupGain * LN10_OVER_20);
                const dryLinear = Math.exp(smoothed.dryGain * LN10_OVER_20);

                const inputSample = inputData[i];

                // Write to delay line (P3)
                delayBuffer[writePos] = inputSample;
                const delayedSample = delayBuffer[(writePos - _lookaheadSamples + MAX_LOOKAHEAD_SAMPLES) % MAX_LOOKAHEAD_SAMPLES];

                // Detection uses current (non-delayed) sample
                const inputLevel = Math.abs(inputSample);

                // Compressor
                if (!_isCompBypass) {
                    if (inputLevel > compEnvelope) compEnvelope += _compAttCoeff * (inputLevel - compEnvelope);
                    else compEnvelope += _compRelCoeff * (inputLevel - compEnvelope);
                }

                let compEnvdB = Math.log(compEnvelope + LOG_FLOOR) * TWENTY_LOG10E;
                let compGainReductiondB = 0;

                if (!_isCompBypass) {
                    if (compEnvdB > smoothed.threshold) {
                        compGainReductiondB = smoothed.threshold - compEnvdB;
                    }
                }

                const compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20);

                // Output uses delayed sample (P3)
                let wet = delayedSample * compGainLinear * makeUpLinear;

                // Soft clip (normalized tanh waveshaper)
                const cd = smoothed.clipDrive;
                if (cd > 1.0001) {
                    wet = Math.tanh(cd * wet) / Math.tanh(cd);
                }

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
            delayBuffer.fill(0);
            writePos = 0;
        }
    };
};