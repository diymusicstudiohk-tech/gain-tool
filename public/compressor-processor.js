// AudioWorklet Compressor Processor
// Combines: P1 (worklet DSP), P2 (parameter smoothing), P3 (look-ahead ring buffer)

const LN10_OVER_20 = Math.LN10 / 20;
const TWENTY_LOG10E = 20 * Math.LOG10E;

// Max look-ahead: 100ms @ 48kHz = 4800 samples
const MAX_LOOKAHEAD_SAMPLES = 4800;

class CompressorProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Envelope state
        this.compEnvelope = 0;

        // Look-ahead ring buffer (P3)
        this.delayBuffer = new Float32Array(MAX_LOOKAHEAD_SAMPLES);
        this.writePos = 0;

        // Current params (with smoothing targets)
        this.params = null;

        // Smoothed parameter current values (P2)
        this.smoothed = {
            threshold: -24,
            ratio: 4,
            knee: 6,
            makeupGain: 0,
            dryGain: -96,
        };
        // Smoothing targets
        this.targets = {
            threshold: -24,
            ratio: 4,
            knee: 6,
            makeupGain: 0,
            dryGain: -96,
        };

        // Coefficient cache
        this.compAttCoeff = 0;
        this.compRelCoeff = 0;
        this.lookaheadSamples = 0;
        this.isCompBypass = false;
        this.isDeltaMode = false;

        // Smoothing coefficient (~5ms time constant)
        this.smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));

        this.port.onmessage = (e) => {
            const p = e.data;
            this.params = p;

            // Update smoothing targets (P2)
            this.targets.threshold = p.threshold;
            this.targets.ratio = p.ratio;
            this.targets.knee = p.knee;
            this.targets.makeupGain = p.makeupGain;
            this.targets.dryGain = p.dryGain;

            // Recalculate coefficients (these don't need per-sample smoothing)
            const attTime = (p.attack / 1000) * sampleRate;
            const relTime = (p.release / 1000) * sampleRate;

            this.compAttCoeff = 1 - Math.exp(-1 / attTime);
            this.compRelCoeff = 1 - Math.exp(-1 / relTime);

            // Look-ahead (P3)
            this.lookaheadSamples = Math.min(
                Math.floor((p.lookahead / 1000) * sampleRate),
                MAX_LOOKAHEAD_SAMPLES - 1
            );

            // Boolean/discrete params (no smoothing needed)
            this.isCompBypass = p.isCompBypass;
            this.isDeltaMode = p.isDeltaMode;
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
        const compAttCoeff = this.compAttCoeff;
        const compRelCoeff = this.compRelCoeff;
        const isCompBypass = this.isCompBypass;
        const isDeltaMode = this.isDeltaMode;
        const lookaheadSamples = this.lookaheadSamples;
        const delayBuffer = this.delayBuffer;
        const bufferSize = MAX_LOOKAHEAD_SAMPLES;

        let compEnvelope = this.compEnvelope;
        let writePos = this.writePos;

        // Smoothed values (local copies for hot loop)
        let sThreshold = this.smoothed.threshold;
        let sRatio = this.smoothed.ratio;
        let sKnee = this.smoothed.knee;
        let sMakeupGain = this.smoothed.makeupGain;
        let sDryGain = this.smoothed.dryGain;

        const tThreshold = this.targets.threshold;
        const tRatio = this.targets.ratio;
        const tKnee = this.targets.knee;
        const tMakeupGain = this.targets.makeupGain;
        const tDryGain = this.targets.dryGain;

        for (let i = 0; i < length; i++) {
            // Per-sample parameter smoothing (P2)
            sThreshold += smoothCoeff * (tThreshold - sThreshold);
            sRatio += smoothCoeff * (tRatio - sRatio);
            sKnee += smoothCoeff * (tKnee - sKnee);
            sMakeupGain += smoothCoeff * (tMakeupGain - sMakeupGain);
            sDryGain += smoothCoeff * (tDryGain - sDryGain);

            const makeUpLinear = Math.exp(sMakeupGain * LN10_OVER_20);
            const dryLinear = Math.exp(sDryGain * LN10_OVER_20);

            const inputSample = inputData[i];

            // Write to delay line (P3)
            delayBuffer[writePos] = inputSample;

            // Read delayed sample for output
            const delayedSample = delayBuffer[(writePos - lookaheadSamples + bufferSize) % bufferSize];

            // Detection uses current (non-delayed) sample
            const inputLevel = Math.abs(inputSample);

            // Compressor detection
            if (!isCompBypass) {
                if (inputLevel > compEnvelope) compEnvelope += compAttCoeff * (inputLevel - compEnvelope);
                else compEnvelope += compRelCoeff * (inputLevel - compEnvelope);
            }

            let compEnvdB = Math.log(compEnvelope + 1e-6) * TWENTY_LOG10E;
            let compGainReductiondB = 0;

            if (!isCompBypass) {
                const halfKnee = sKnee / 2;
                if (compEnvdB > sThreshold - halfKnee) {
                    if (sKnee > 0 && compEnvdB < sThreshold + halfKnee) {
                        const slope = 1 - (1 / sRatio);
                        const over = compEnvdB - (sThreshold - halfKnee);
                        compGainReductiondB = -slope * ((over * over) / (2 * sKnee));
                    } else if (compEnvdB >= sThreshold + halfKnee) {
                        compGainReductiondB = (sThreshold - compEnvdB) * (1 - 1 / sRatio);
                    }
                }
            }

            const compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20);

            // Output uses delayed sample (P3)
            const wet = delayedSample * compGainLinear * makeUpLinear;

            if (isDeltaMode) {
                outputData[i] = wet - delayedSample;
            } else {
                outputData[i] = wet + (delayedSample * dryLinear);
            }

            writePos = (writePos + 1) % bufferSize;
        }

        // Write back state
        this.compEnvelope = compEnvelope;
        this.writePos = writePos;
        this.smoothed.threshold = sThreshold;
        this.smoothed.ratio = sRatio;
        this.smoothed.knee = sKnee;
        this.smoothed.makeupGain = sMakeupGain;
        this.smoothed.dryGain = sDryGain;

        return true;
    }
}

registerProcessor('compressor-processor', CompressorProcessor);
