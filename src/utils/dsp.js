import { LN10_OVER_20, TWENTY_LOG10E, LOG_FLOOR } from './dspConstants';

// --- Adaptive Envelope Constants (hardcoded, no user control) ---
const ATTACK_MS = 0.1;           // Fixed ultra-fast attack for brickwall limiting
const FAST_RELEASE_MS = 30;      // For high-crest (transient/drums) material
const SLOW_RELEASE_MS = 300;     // For low-crest (sustained/vocals) material
const CF_RMS_WINDOW_MS = 10;     // RMS measurement window (~480 samples @ 48kHz)
const CF_PEAK_COEFF_MS = 0.5;    // Peak follower time constant for CF
const CF_SMOOTH_MS = 50;         // Smoothing on crest factor value
const CF_LOW = 3.0;              // Below → slow release (dB)
const CF_HIGH = 12.0;            // Above → fast release (dB)
const STAGE1_DEPTH_DB = 3.0;     // Two-stage: fast release for first 3dB of recovery

export const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const {
        threshold, lookahead,
        makeupGain, isCompBypass, clipDrive = 1.0
    } = params;

    const length = inputData.length;
    const outputData = new Float32Array(length);
    const grCurve = new Float32Array(length);
    const makeUpLinear = Math.exp(makeupGain * LN10_OVER_20);
    const effectiveSampleRate = sampleRate / step;

    // Pre-compute adaptive coefficients
    const compAttCoeff = 1 - Math.exp(-1 / ((ATTACK_MS / 1000) * effectiveSampleRate));
    const fastRelCoeff = 1 - Math.exp(-1 / ((FAST_RELEASE_MS / 1000) * effectiveSampleRate));
    const slowRelCoeff = 1 - Math.exp(-1 / ((SLOW_RELEASE_MS / 1000) * effectiveSampleRate));
    const cfPeakCoeff = 1 - Math.exp(-1 / ((CF_PEAK_COEFF_MS / 1000) * effectiveSampleRate));
    const cfSmoothCoeff = 1 - Math.exp(-1 / ((CF_SMOOTH_MS / 1000) * effectiveSampleRate));
    const lookaheadSamples = Math.floor(((lookahead / 1000) * effectiveSampleRate));

    // Crest factor state
    const rmsWindowSize = Math.max(1, Math.round((CF_RMS_WINDOW_MS / 1000) * effectiveSampleRate));
    const rmsBuffer = new Float32Array(rmsWindowSize);
    let rmsSum = 0;
    let rmsWritePos = 0;
    let cfPeak = 0;
    let smoothedCF = 6.0; // Start at midpoint

    let compEnvelope = 0;
    let peakHold = 0; // Track peak for two-stage release

    for (let i = 0; i < length; i++) {
        let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
        const inputLevel = Math.abs(inputData[detectorIndex]);
        const currentInput = inputData[i];

        // --- Crest factor measurement ---
        const sampleSq = inputLevel * inputLevel;
        rmsSum -= rmsBuffer[rmsWritePos];
        rmsBuffer[rmsWritePos] = sampleSq;
        rmsSum += sampleSq;
        rmsWritePos = (rmsWritePos + 1) % rmsWindowSize;

        const rmsLevel = Math.sqrt(Math.max(0, rmsSum / rmsWindowSize));

        // Peak follower for CF
        if (inputLevel > cfPeak) cfPeak = inputLevel;
        else cfPeak += cfPeakCoeff * (inputLevel - cfPeak);

        // Crest factor in dB
        const cfRaw = (rmsLevel > LOG_FLOOR && cfPeak > LOG_FLOOR)
            ? Math.log(cfPeak / rmsLevel) * TWENTY_LOG10E
            : 0;
        smoothedCF += cfSmoothCoeff * (cfRaw - smoothedCF);

        // --- Map CF → release coefficient (linear interpolation) ---
        const cfClamped = Math.max(CF_LOW, Math.min(CF_HIGH, smoothedCF));
        const cfNorm = (cfClamped - CF_LOW) / (CF_HIGH - CF_LOW); // 0=slow, 1=fast
        const adaptiveRelCoeff = slowRelCoeff + cfNorm * (fastRelCoeff - slowRelCoeff);

        // --- Envelope follower with two-stage release ---
        if (inputLevel > compEnvelope) {
            // Attack phase: always ultra-fast
            compEnvelope += compAttCoeff * (inputLevel - compEnvelope);
            peakHold = compEnvelope;
        } else {
            // Release phase: two-stage
            const peakHolddB = Math.log(peakHold + LOG_FLOOR) * TWENTY_LOG10E;
            const envdB = Math.log(compEnvelope + LOG_FLOOR) * TWENTY_LOG10E;
            const recoveryDb = envdB - peakHolddB;

            if (recoveryDb < STAGE1_DEPTH_DB) {
                // Stage 1: fast release for first 3dB of recovery
                compEnvelope += fastRelCoeff * (inputLevel - compEnvelope);
            } else {
                // Stage 2: adaptive release
                compEnvelope += adaptiveRelCoeff * (inputLevel - compEnvelope);
            }
        }

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
            wet = Math.tanh(clipDrive * wet) / clipDrive;
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
    let peakHold = 0;

    // Look-ahead ring buffer (P3)
    const delayBuffer = new Float32Array(MAX_LOOKAHEAD_SAMPLES);
    let writePos = 0;

    // Parameter smoothing state (P2) — ~5ms time constant
    const smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));
    const smoothed = { threshold: -24, makeupGain: 0, dryGain: -96, clipDrive: 1.0 };
    const targets = { threshold: -24, makeupGain: 0, dryGain: -96, clipDrive: 1.0 };

    // Pre-compute adaptive coefficients (depend only on sampleRate)
    const compAttCoeff = 1 - Math.exp(-1 / ((ATTACK_MS / 1000) * sampleRate));
    const fastRelCoeff = 1 - Math.exp(-1 / ((FAST_RELEASE_MS / 1000) * sampleRate));
    const slowRelCoeff = 1 - Math.exp(-1 / ((SLOW_RELEASE_MS / 1000) * sampleRate));
    const cfPeakCoeff = 1 - Math.exp(-1 / ((CF_PEAK_COEFF_MS / 1000) * sampleRate));
    const cfSmoothCoeff = 1 - Math.exp(-1 / ((CF_SMOOTH_MS / 1000) * sampleRate));

    // Crest factor state
    const rmsWindowSize = Math.max(1, Math.round((CF_RMS_WINDOW_MS / 1000) * sampleRate));
    const rmsBuffer = new Float32Array(rmsWindowSize);
    let rmsSum = 0;
    let rmsWritePos = 0;
    let cfPeak = 0;
    let smoothedCF = 6.0;

    // Coefficient cache — only recalculate when params object identity changes
    let _cachedParams = null;
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
                    threshold,
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

                // --- Crest factor measurement ---
                const sampleSq = inputLevel * inputLevel;
                rmsSum -= rmsBuffer[rmsWritePos];
                rmsBuffer[rmsWritePos] = sampleSq;
                rmsSum += sampleSq;
                rmsWritePos = (rmsWritePos + 1) % rmsWindowSize;

                const rmsLevel = Math.sqrt(Math.max(0, rmsSum / rmsWindowSize));

                if (inputLevel > cfPeak) cfPeak = inputLevel;
                else cfPeak += cfPeakCoeff * (inputLevel - cfPeak);

                const cfRaw = (rmsLevel > LOG_FLOOR && cfPeak > LOG_FLOOR)
                    ? Math.log(cfPeak / rmsLevel) * TWENTY_LOG10E
                    : 0;
                smoothedCF += cfSmoothCoeff * (cfRaw - smoothedCF);

                const cfClamped = Math.max(CF_LOW, Math.min(CF_HIGH, smoothedCF));
                const cfNorm = (cfClamped - CF_LOW) / (CF_HIGH - CF_LOW);
                const adaptiveRelCoeff = slowRelCoeff + cfNorm * (fastRelCoeff - slowRelCoeff);

                // --- Compressor with two-stage release ---
                if (!_isCompBypass) {
                    if (inputLevel > compEnvelope) {
                        compEnvelope += compAttCoeff * (inputLevel - compEnvelope);
                        peakHold = compEnvelope;
                    } else {
                        const peakHolddB = Math.log(peakHold + LOG_FLOOR) * TWENTY_LOG10E;
                        const envdB = Math.log(compEnvelope + LOG_FLOOR) * TWENTY_LOG10E;
                        const recoveryDb = envdB - peakHolddB;

                        if (recoveryDb < STAGE1_DEPTH_DB) {
                            compEnvelope += fastRelCoeff * (inputLevel - compEnvelope);
                        } else {
                            compEnvelope += adaptiveRelCoeff * (inputLevel - compEnvelope);
                        }
                    }
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
                    wet = Math.tanh(cd * wet) / cd;
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
            peakHold = 0;
            delayBuffer.fill(0);
            writePos = 0;
            rmsBuffer.fill(0);
            rmsSum = 0;
            rmsWritePos = 0;
            cfPeak = 0;
            smoothedCF = 6.0;
        }
    };
};
