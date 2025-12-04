export const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const { 
        threshold, ratio, attack, release, knee, lookahead, 
        makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease 
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
        let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
        if (gateEnvdB < gateThreshold) gateGaindB = -(gateThreshold - gateEnvdB) * (gateRatio - 1);
        const gateGainLinear = Math.pow(10, gateGaindB / 20);
        
        // Comp
        const gatedDetectorLevel = inputLevel * gateGainLinear;
        if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
        else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);

        let compEnvdB = 20 * Math.log10(compEnvelope + 1e-6);
        let compGainReductiondB = 0;

        if (compEnvdB > threshold - knee/2) {
             if (knee > 0 && compEnvdB < threshold + knee/2) {
                let slope = 1 - (1/ratio);
                let over = compEnvdB - (threshold - knee/2);
                compGainReductiondB = -slope * ((over * over) / (2 * knee)); 
            } else if (compEnvdB >= threshold + knee/2) {
                compGainReductiondB = (threshold - compEnvdB) * (1 - 1 / ratio);
            }
        }

        const compGainLinear = Math.pow(10, compGainReductiondB / 20);
        outputData[i] = currentInput * gateGainLinear * compGainLinear * makeUpLinear;
        grCurve[i] = Math.min(0, gateGaindB + compGainReductiondB);
    }

    return { outputData, grCurve, visualInput: inputData };
};