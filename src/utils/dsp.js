export const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const {
        threshold, ratio, attack, release, knee, lookahead,
        makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
        isGateBypass, isCompBypass
    } = params;

    const length = inputData.length;
    const outputData = new Float32Array(length);
    const grCurve = new Float32Array(length);
    const makeUpLinear = Math.pow(10, makeupGain / 20);
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
            let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
            if (gateEnvdB < gateThreshold) gateGaindB = -(gateThreshold - gateEnvdB) * (gateRatio - 1);
        }
        const gateGainLinear = Math.pow(10, gateGaindB / 20);

        // Comp
        const gatedDetectorLevel = inputLevel * gateGainLinear;
        if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
        else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);

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

        const compGainLinear = Math.pow(10, compGainReductiondB / 20);
        outputData[i] = currentInput * gateGainLinear * compGainLinear * makeUpLinear;
        grCurve[i] = Math.min(0, gateGaindB + compGainReductiondB);
    }

    return { outputData, grCurve, visualInput: inputData };
};

export const createRealTimeCompressor = (sampleRate) => {
    let compEnvelope = 0;
    let gateEnvelope = 0;

    return {
        processBlock: (inputBuffer, outputBuffer, params) => {
            const inputData = inputBuffer.getChannelData ? inputBuffer.getChannelData(0) : inputBuffer;
            const outputData = outputBuffer.getChannelData ? outputBuffer.getChannelData(0) : outputBuffer;
            const length = inputBuffer.length !== undefined ? inputBuffer.length : inputData.length;

            const {
                threshold, ratio, attack, release, knee, lookahead,
                makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
                isGateBypass, isCompBypass,
                isDeltaMode, dryGain
            } = params;

            const makeUpLinear = Math.pow(10, makeupGain / 20);
            const attTime = (attack / 1000) * sampleRate;
            const relTime = (release / 1000) * sampleRate;
            const gAttTime = (gateAttack / 1000) * sampleRate;
            const gRelTime = (gateRelease / 1000) * sampleRate;

            const compAttCoeff = 1 - Math.exp(-1 / attTime);
            const compRelCoeff = 1 - Math.exp(-1 / relTime);
            const gateAttCoeff = 1 - Math.exp(-1 / gAttTime);
            const gateRelCoeff = 1 - Math.exp(-1 / gRelTime);

            // Lookahead is skipped for real-time/script processor as per original code comment

            const dryLinear = Math.pow(10, dryGain / 20);

            for (let i = 0; i < length; i++) {
                const inputSample = inputData[i];
                const inputLevel = Math.abs(inputSample);

                // Gate
                if (!isGateBypass) {
                    if (inputLevel > gateEnvelope) gateEnvelope += gateAttCoeff * (inputLevel - gateEnvelope);
                    else gateEnvelope += gateRelCoeff * (inputLevel - gateEnvelope);
                }

                let gateGaindB = 0;
                if (!isGateBypass) {
                    let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
                    if (gateEnvdB < gateThreshold) gateGaindB = -(gateThreshold - gateEnvdB) * (gateRatio - 1);
                }
                const gateGainLinear = Math.pow(10, gateGaindB / 20);
                const gatedDetectorLevel = inputLevel * gateGainLinear;

                // Compressor
                if (!isCompBypass) {
                    if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
                    else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);
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

                const compGainLinear = Math.pow(10, compGainReductiondB / 20);

                // Final Output
                const wet = inputSample * gateGainLinear * compGainLinear * makeUpLinear;

                if (isDeltaMode) {
                    outputData[i] = wet - inputSample;
                } else {
                    outputData[i] = wet + (inputSample * dryLinear);
                }
            }
        },
        reset: () => {
            compEnvelope = 0;
            gateEnvelope = 0;
        }
    };
};