import { LN10_OVER_20, TWENTY_LOG10E, LOG_FLOOR } from './dspConstants';

// --- Pre-computed Lagrange interpolation coefficients ---
// v25 (t=0.25): coefficients for h0..h3
const L25_0 =  0.0390625;   //  5/128
const L25_1 =  0.8203125;   // 105/128
const L25_2 = -0.1640625;   // -21/128
const L25_3 = -35 / 384;    // -0.09114583...
// v75 (t=0.75): coefficients for h0..h3
const L75_0 = -0.1171875;   // -15/128
const L75_1 = -0.2109375;   // -27/128
const L75_2 =  0.1171875;   //  15/128
const L75_3 = -0.3515625;   // -45/128

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

export const processCompressor = (inputData, sampleRate, params, step = 1, preallocated = null) => {
    const {
        threshold, inflate, inputGain, lookahead,
        makeupGain, isCompBypass
    } = params;

    const length = inputData.length;
    const outputData = (preallocated?.output?.length === length) ? preallocated.output : new Float32Array(length);
    const grCurve = (preallocated?.gr?.length === length) ? preallocated.gr : new Float32Array(length);
    const makeUpLinear = Math.exp(makeupGain * LN10_OVER_20);
    const inputGainLinear = Math.exp((inputGain || 0) * LN10_OVER_20);

    // Inflate (Oxford Inflator waveshaper) pre-compute
    const inflateAmt = (inflate ?? 0) * 0.01;
    const inflateWet = inflateAmt * 0.99999955296;
    const inflateDry = 1 - inflateAmt;
    const effectiveSampleRate = sampleRate / step;

    // Dynamic attack: derive from lookahead for smooth pre-reduction
    const effectiveAttackMs = Math.max(ATTACK_MS, (lookahead || 0) * 0.7);
    const compAttCoeff = 1 - Math.exp(-1 / ((effectiveAttackMs / 1000) * effectiveSampleRate));
    const fastRelCoeff = 1 - Math.exp(-1 / ((FAST_RELEASE_MS / 1000) * effectiveSampleRate));
    const slowRelCoeff = 1 - Math.exp(-1 / ((SLOW_RELEASE_MS / 1000) * effectiveSampleRate));
    const cfPeakCoeff = 1 - Math.exp(-1 / ((CF_PEAK_COEFF_MS / 1000) * effectiveSampleRate));
    const cfSmoothCoeff = 1 - Math.exp(-1 / ((CF_SMOOTH_MS / 1000) * effectiveSampleRate));
    const lookaheadSamples = Math.floor(((lookahead / 1000) * effectiveSampleRate));

    // Sliding window maximum (monotonic deque) — pre-allocated
    const maxDequeSize = Math.max(lookaheadSamples + 1, 2);
    const dequeValues = new Float32Array(maxDequeSize);
    const dequeIndices = new Int32Array(maxDequeSize);
    let dequeHead = 0;
    let dequeTail = 0;
    const windowSize = lookaheadSamples > 0 ? lookaheadSamples : 1;

    // True peak detection — 4-sample history buffer
    const tpHistory = new Float32Array(4);
    let tpPos = 0;

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
        // Look ahead into the future for detection
        const detectorIndex = Math.min(i + lookaheadSamples, length - 1);
        const detectorSample = Math.abs(inputData[detectorIndex] * inputGainLinear);
        const currentInput = inputData[i] * inputGainLinear;

        // --- True peak detection (4-point Lagrange interpolation) ---
        tpHistory[tpPos] = detectorSample;
        let truePeak = detectorSample;

        const h0 = tpHistory[(tpPos - 3 + 4) % 4];
        const h1 = tpHistory[(tpPos - 2 + 4) % 4];
        const h2 = tpHistory[(tpPos - 1 + 4) % 4];
        const h3 = detectorSample;

        // Lagrange interpolation between h1 and h2 at t=0.25, 0.5, 0.75
        const v25 = h0 * L25_0 + h1 * L25_1 + h2 * L25_2 + h3 * L25_3;
        const v50 = (-h0 + 9 * h1 + 9 * h2 - h3) / 16;
        const v75 = h0 * L75_0 + h1 * L75_1 + h2 * L75_2 + h3 * L75_3;

        const abs25 = v25 < 0 ? -v25 : v25;
        const abs50 = v50 < 0 ? -v50 : v50;
        const abs75 = v75 < 0 ? -v75 : v75;
        if (abs25 > truePeak) truePeak = abs25;
        if (abs50 > truePeak) truePeak = abs50;
        if (abs75 > truePeak) truePeak = abs75;

        tpPos = (tpPos + 1) % 4;

        // --- Sliding window maximum (monotonic deque) ---
        while (dequeTail !== dequeHead && dequeValues[(dequeTail - 1 + maxDequeSize) % maxDequeSize] <= truePeak) {
            dequeTail = (dequeTail - 1 + maxDequeSize) % maxDequeSize;
        }
        dequeValues[dequeTail] = truePeak;
        dequeIndices[dequeTail] = i;
        dequeTail = (dequeTail + 1) % maxDequeSize;

        // Remove expired elements from front
        while (dequeHead !== dequeTail && dequeIndices[dequeHead] <= i - windowSize) {
            dequeHead = (dequeHead + 1) % maxDequeSize;
        }

        const inputLevel = dequeValues[dequeHead]; // Window maximum

        // --- Crest factor measurement ---
        const sampleSq = detectorSample * detectorSample;
        rmsSum -= rmsBuffer[rmsWritePos];
        rmsBuffer[rmsWritePos] = sampleSq;
        rmsSum += sampleSq;
        rmsWritePos = (rmsWritePos + 1) % rmsWindowSize;

        const rmsLevel = Math.sqrt(Math.max(0, rmsSum / rmsWindowSize));

        // Peak follower for CF
        if (detectorSample > cfPeak) cfPeak = detectorSample;
        else cfPeak += cfPeakCoeff * (detectorSample - cfPeak);

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
            // Attack phase
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
        let limited = currentInput * compGainLinear;

        // Inflate waveshaper (after gain reduction, before makeup)
        if (inflateAmt > 0.001) {
            const clamped = limited < -1 ? -1 : limited > 1 ? 1 : limited;
            const y = clamped < 0 ? -clamped : clamped;
            const y2 = y * y;
            const shaped = 1.5 * y - 0.0625 * y2 - 0.375 * y2 * y - 0.0625 * y2 * y2;
            const sign = clamped < 0 ? -1 : 1;
            limited = (shaped * inflateWet + y * inflateDry) * sign;
        }

        let wet = limited * makeUpLinear;
        outputData[i] = wet;
        grCurve[i] = Math.min(0, compGainReductiondB);
    }

    let visualInput = inputData;
    if (Math.abs(inputGain || 0) > 0.001) {
        visualInput = preallocated?.visualInput?.length === length
            ? preallocated.visualInput : new Float32Array(length);
        for (let i = 0; i < length; i++) visualInput[i] = inputData[i] * inputGainLinear;
    }

    return { outputData, grCurve, visualInput };
};

// Max look-ahead: power-of-2 for bitmask modulo (>= 4800 needed for 100ms @ 48kHz)
const MAX_LOOKAHEAD_SAMPLES = 8192;
const LOOKAHEAD_MASK = MAX_LOOKAHEAD_SAMPLES - 1; // 8191

export const createRealTimeCompressor = (sampleRate) => {
    let compEnvelope = 0;
    let peakHold = 0;

    // Look-ahead ring buffer (P3)
    const delayBuffer = new Float32Array(MAX_LOOKAHEAD_SAMPLES);
    let writePos = 0;

    // Sliding window maximum (monotonic deque) — pre-allocated, no GC
    const dequeValues = new Float32Array(MAX_LOOKAHEAD_SAMPLES);
    const dequeIndices = new Int32Array(MAX_LOOKAHEAD_SAMPLES);
    let dequeHead = 0;
    let dequeTail = 0;
    let dequeSampleCounter = 0;

    // True peak detection — 4-sample history buffer
    const tpHistory = new Float32Array(4);
    let tpPos = 0;

    // Parameter smoothing state (P2) — ~5ms time constant
    const smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));
    const smoothed = { threshold: -24, makeupGain: 0, inflate: 0, inputGain: 0 };
    const targets = { threshold: -24, makeupGain: 0, inflate: 0, inputGain: 0 };

    // Pre-compute adaptive coefficients (depend only on sampleRate)
    let compAttCoeff = 1 - Math.exp(-1 / ((ATTACK_MS / 1000) * sampleRate));
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
    let _windowSize = 1;

    return {
        processBlock: (inputBuffer, outputBuffer, params) => {
            const inputData = inputBuffer.getChannelData ? inputBuffer.getChannelData(0) : inputBuffer;
            const outputData = outputBuffer.getChannelData ? outputBuffer.getChannelData(0) : outputBuffer;
            const length = inputBuffer.length !== undefined ? inputBuffer.length : inputData.length;

            if (params !== _cachedParams) {
                _cachedParams = params;

                const {
                    threshold, inflate, inputGain: ig,
                    makeupGain, isCompBypass,
                    isDeltaMode, lookahead,
                } = params;

                // Update smoothing targets (P2)
                targets.threshold = threshold;
                targets.makeupGain = makeupGain;
                targets.inflate = inflate ?? 0;
                targets.inputGain = ig ?? 0;

                _isCompBypass = isCompBypass;
                _isDeltaMode = isDeltaMode;

                // Look-ahead (P3)
                _lookaheadSamples = Math.min(
                    Math.floor((lookahead / 1000) * sampleRate),
                    MAX_LOOKAHEAD_SAMPLES - 1
                );

                _windowSize = _lookaheadSamples > 0 ? _lookaheadSamples : 1;

                // Dynamic attack: derive from lookahead for smooth pre-reduction
                const effectiveAttackMs = Math.max(ATTACK_MS, (lookahead || 0) * 0.7);
                compAttCoeff = 1 - Math.exp(-1 / ((effectiveAttackMs / 1000) * sampleRate));
            }

            for (let i = 0; i < length; i++) {
                // Per-sample parameter smoothing (P2)
                smoothed.threshold += smoothCoeff * (targets.threshold - smoothed.threshold);
                smoothed.makeupGain += smoothCoeff * (targets.makeupGain - smoothed.makeupGain);
                smoothed.inflate += smoothCoeff * (targets.inflate - smoothed.inflate);
                smoothed.inputGain += smoothCoeff * (targets.inputGain - smoothed.inputGain);

                const makeUpLinear = Math.exp(smoothed.makeupGain * LN10_OVER_20);
                const inputGainLinear = Math.exp(smoothed.inputGain * LN10_OVER_20);

                const inputSample = inputData[i] * inputGainLinear;

                // Write to delay line (P3)
                delayBuffer[writePos] = inputSample;
                const delayedSample = delayBuffer[(writePos - _lookaheadSamples + MAX_LOOKAHEAD_SAMPLES) & LOOKAHEAD_MASK];

                // --- True peak detection (4-point Lagrange interpolation) ---
                const absSample = Math.abs(inputSample);
                tpHistory[tpPos] = absSample;
                let truePeak = absSample;

                const h0 = tpHistory[(tpPos - 3 + 4) % 4];
                const h1 = tpHistory[(tpPos - 2 + 4) % 4];
                const h2 = tpHistory[(tpPos - 1 + 4) % 4];
                const h3 = absSample;

                const v25 = h0 * L25_0 + h1 * L25_1 + h2 * L25_2 + h3 * L25_3;
                const v50 = (-h0 + 9 * h1 + 9 * h2 - h3) / 16;
                const v75 = h0 * L75_0 + h1 * L75_1 + h2 * L75_2 + h3 * L75_3;

                const abs25 = v25 < 0 ? -v25 : v25;
                const abs50 = v50 < 0 ? -v50 : v50;
                const abs75 = v75 < 0 ? -v75 : v75;
                if (abs25 > truePeak) truePeak = abs25;
                if (abs50 > truePeak) truePeak = abs50;
                if (abs75 > truePeak) truePeak = abs75;

                tpPos = (tpPos + 1) % 4;

                // --- Sliding window maximum (monotonic deque) ---
                while (dequeTail !== dequeHead && dequeValues[(dequeTail - 1 + MAX_LOOKAHEAD_SAMPLES) & LOOKAHEAD_MASK] <= truePeak) {
                    dequeTail = (dequeTail - 1 + MAX_LOOKAHEAD_SAMPLES) & LOOKAHEAD_MASK;
                }
                dequeValues[dequeTail] = truePeak;
                dequeIndices[dequeTail] = dequeSampleCounter;
                dequeTail = (dequeTail + 1) & LOOKAHEAD_MASK;

                while (dequeHead !== dequeTail && dequeIndices[dequeHead] <= dequeSampleCounter - _windowSize) {
                    dequeHead = (dequeHead + 1) & LOOKAHEAD_MASK;
                }

                dequeSampleCounter++;
                const inputLevel = dequeValues[dequeHead]; // Window maximum

                // --- Crest factor measurement ---
                const sampleSq = absSample * absSample;
                rmsSum -= rmsBuffer[rmsWritePos];
                rmsBuffer[rmsWritePos] = sampleSq;
                rmsSum += sampleSq;
                rmsWritePos = (rmsWritePos + 1) % rmsWindowSize;

                const rmsLevel = Math.sqrt(Math.max(0, rmsSum / rmsWindowSize));

                if (absSample > cfPeak) cfPeak = absSample;
                else cfPeak += cfPeakCoeff * (absSample - cfPeak);

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
                let limited = delayedSample * compGainLinear;

                // Inflate waveshaper (after gain reduction, before makeup)
                const sInflate = smoothed.inflate * 0.01;
                if (sInflate > 0.001) {
                    const clamped = limited < -1 ? -1 : limited > 1 ? 1 : limited;
                    const y = clamped < 0 ? -clamped : clamped;
                    const y2 = y * y;
                    const shaped = 1.5 * y - 0.0625 * y2 - 0.375 * y2 * y - 0.0625 * y2 * y2;
                    const sign = clamped < 0 ? -1 : 1;
                    const iWet = sInflate * 0.99999955296;
                    const iDry = 1 - sInflate;
                    limited = (shaped * iWet + y * iDry) * sign;
                }

                let wet = limited * makeUpLinear;

                if (_isDeltaMode) {
                    outputData[i] = wet - delayedSample;
                } else {
                    outputData[i] = wet;
                }

                writePos = (writePos + 1) & LOOKAHEAD_MASK;
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
            dequeHead = 0;
            dequeTail = 0;
            dequeSampleCounter = 0;
            tpHistory.fill(0);
            tpPos = 0;
        }
    };
};
