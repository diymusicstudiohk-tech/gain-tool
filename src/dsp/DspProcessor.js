/**
 * Unified DSP Processor for audio compression
 * Handles both batch processing and real-time processing
 */
export class DspProcessor {
    /**
     * @param {number} sampleRate - Audio sample rate
     * @param {boolean} isRealTime - Whether this is for real-time processing
     */
    constructor(sampleRate, isRealTime = false) {
        this.sampleRate = sampleRate;
        this.isRealTime = isRealTime;
        this.compEnvelope = 0;
        this.gateEnvelope = 0;
    }

    /**
     * Calculate envelope coefficients
     * @private
     */
    calculateCoefficients(attack, release, gateAttack, gateRelease, effectiveSampleRate) {
        const attTime = (attack / 1000) * effectiveSampleRate;
        const relTime = (release / 1000) * effectiveSampleRate;
        const gAttTime = (gateAttack / 1000) * effectiveSampleRate;
        const gRelTime = (gateRelease / 1000) * effectiveSampleRate;

        return {
            compAttCoeff: 1 - Math.exp(-1 / attTime),
            compRelCoeff: 1 - Math.exp(-1 / relTime),
            gateAttCoeff: 1 - Math.exp(-1 / gAttTime),
            gateRelCoeff: 1 - Math.exp(-1 / gRelTime)
        };
    }

    /**
     * Process gate stage
     * @private
     */
    processGate(inputLevel, gateEnvelope, gateAttCoeff, gateRelCoeff, gateThreshold, gateRatio, isGateBypass) {
        if (!isGateBypass) {
            if (inputLevel > gateEnvelope) {
                gateEnvelope += gateAttCoeff * (inputLevel - gateEnvelope);
            } else {
                gateEnvelope += gateRelCoeff * (inputLevel - gateEnvelope);
            }
        }

        let gateGaindB = 0;
        if (!isGateBypass) {
            let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
            if (gateEnvdB < gateThreshold) {
                gateGaindB = -(gateThreshold - gateEnvdB) * (gateRatio - 1);
            }
        }

        return {
            gateEnvelope,
            gateGainLinear: Math.pow(10, gateGaindB / 20),
            gateGaindB
        };
    }

    /**
     * Process compressor stage
     * @private
     */
    processCompressor(gatedLevel, compEnvelope, compAttCoeff, compRelCoeff, threshold, ratio, knee, isCompBypass) {
        if (!isCompBypass) {
            if (gatedLevel > compEnvelope) {
                compEnvelope += compAttCoeff * (gatedLevel - compEnvelope);
            } else {
                compEnvelope += compRelCoeff * (gatedLevel - compEnvelope);
            }
        }

        let compEnvdB = 20 * Math.log10(compEnvelope + 1e-6);
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

        return {
            compEnvelope,
            compGainLinear: Math.pow(10, compGainReductiondB / 20),
            compGainReductiondB
        };
    }

    /**
     * Process batch data (for visualization)
     * @param {Float32Array} inputData - Input audio data
     * @param {Object} params - Processing parameters
     * @param {number} step - Downsampling step
     * @returns {Object} Processed audio data
     */
    processBatch(inputData, params, step = 1) {
        const {
            threshold, ratio, attack, release, knee, lookahead,
            makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
            isGateBypass, isCompBypass
        } = params;

        const length = inputData.length;
        const outputData = new Float32Array(length);
        const grCurve = new Float32Array(length);
        const makeUpLinear = Math.pow(10, makeupGain / 20);
        const effectiveSampleRate = this.sampleRate / step;

        const coeffs = this.calculateCoefficients(attack, release, gateAttack, gateRelease, effectiveSampleRate);
        const lookaheadSamples = Math.floor(((lookahead / 1000) * effectiveSampleRate));

        let compEnv = 0;
        let gateEnv = 0;

        for (let i = 0; i < length; i++) {
            let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
            const inputLevel = Math.abs(inputData[detectorIndex]);
            const currentInput = inputData[i];

            const gateResult = this.processGate(
                inputLevel, gateEnv, coeffs.gateAttCoeff, coeffs.gateRelCoeff,
                gateThreshold, gateRatio, isGateBypass
            );
            gateEnv = gateResult.gateEnvelope;

            const gatedDetectorLevel = inputLevel * gateResult.gateGainLinear;
            const compResult = this.processCompressor(
                gatedDetectorLevel, compEnv, coeffs.compAttCoeff, coeffs.compRelCoeff,
                threshold, ratio, knee, isCompBypass
            );
            compEnv = compResult.compEnvelope;

            outputData[i] = currentInput * gateResult.gateGainLinear * compResult.compGainLinear * makeUpLinear;
            grCurve[i] = Math.min(0, gateResult.gateGaindB + compResult.compGainReductiondB);
        }

        return { outputData, grCurve, visualInput: inputData };
    }

    /**
     * Process real-time audio block
     * @param {AudioBuffer|Float32Array} inputBuffer - Input audio buffer
     * @param {AudioBuffer|Float32Array} outputBuffer - Output audio buffer
     * @param {Object} params - Processing parameters
     */
    processBlock(inputBuffer, outputBuffer, params) {
        const inputData = inputBuffer.getChannelData ? inputBuffer.getChannelData(0) : inputBuffer;
        const outputData = outputBuffer.getChannelData ? outputBuffer.getChannelData(0) : outputBuffer;
        const length = inputBuffer.length !== undefined ? inputBuffer.length : inputData.length;

        const {
            threshold, ratio, attack, release, knee,
            makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
            isGateBypass, isCompBypass,
            isDeltaMode, dryGain
        } = params;

        const makeUpLinear = Math.pow(10, makeupGain / 20);
        const dryLinear = Math.pow(10, dryGain / 20);

        const coeffs = this.calculateCoefficients(attack, release, gateAttack, gateRelease, this.sampleRate);

        for (let i = 0; i < length; i++) {
            const inputSample = inputData[i];
            const inputLevel = Math.abs(inputSample);

            const gateResult = this.processGate(
                inputLevel, this.gateEnvelope, coeffs.gateAttCoeff, coeffs.gateRelCoeff,
                gateThreshold, gateRatio, isGateBypass
            );
            this.gateEnvelope = gateResult.gateEnvelope;

            const gatedDetectorLevel = inputLevel * gateResult.gateGainLinear;
            const compResult = this.processCompressor(
                gatedDetectorLevel, this.compEnvelope, coeffs.compAttCoeff, coeffs.compRelCoeff,
                threshold, ratio, knee, isCompBypass
            );
            this.compEnvelope = compResult.compEnvelope;

            const wet = inputSample * gateResult.gateGainLinear * compResult.compGainLinear * makeUpLinear;

            if (isDeltaMode) {
                outputData[i] = wet - inputSample;
            } else {
                outputData[i] = wet + (inputSample * dryLinear);
            }
        }
    }

    /**
     * Reset internal state
     */
    reset() {
        this.compEnvelope = 0;
        this.gateEnvelope = 0;
    }
}

/**
 * Legacy wrapper for batch processing
 */
export const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const processor = new DspProcessor(sampleRate);
    return processor.processBatch(inputData, params, step);
};

/**
 * Legacy wrapper for real-time processing
 */
export const createRealTimeCompressor = (sampleRate) => {
    const processor = new DspProcessor(sampleRate, true);
    return {
        processBlock: (inputBuffer, outputBuffer, params) => {
            processor.processBlock(inputBuffer, outputBuffer, params);
        },
        reset: () => processor.reset()
    };
};
