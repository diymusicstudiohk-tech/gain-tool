// AudioWorklet Compressor Processor
// Combines: P1 (worklet DSP), P2 (parameter smoothing), P3 (look-ahead ring buffer)
// Adaptive program-dependent attack/release (crest factor based)

const LN10_OVER_20 = Math.LN10 / 20;
const TWENTY_LOG10E = 20 * Math.LOG10E;
const LOG_FLOOR = 1e-6;

// Max look-ahead: power-of-2 for bitmask modulo (>= 4800 needed for 100ms @ 48kHz)
const MAX_LOOKAHEAD_SAMPLES = 8192;
const LOOKAHEAD_MASK = MAX_LOOKAHEAD_SAMPLES - 1; // 8191

// --- Pre-computed Lagrange interpolation coefficients ---
const L25_0 =  0.0390625;   //  5/128
const L25_1 =  0.8203125;   // 105/128
const L25_2 = -0.1640625;   // -21/128
const L25_3 = -35 / 384;    // -0.09114583...
const L75_0 = -0.1171875;   // -15/128
const L75_1 = -0.2109375;   // -27/128
const L75_2 =  0.1171875;   //  15/128
const L75_3 = -0.3515625;   // -45/128

// --- Adaptive Envelope Constants ---
const ATTACK_MS = 0.1;
const FAST_RELEASE_MS = 30;
const SLOW_RELEASE_MS = 300;
const CF_RMS_WINDOW_MS = 10;
const CF_PEAK_COEFF_MS = 0.5;
const CF_SMOOTH_MS = 50;
const CF_LOW = 3.0;
const CF_HIGH = 12.0;
const STAGE1_DEPTH_DB = 3.0;

class CompressorProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Envelope state
        this.compEnvelope = 0;
        this.peakHold = 0;

        // Look-ahead ring buffer (P3)
        this.delayBuffer = new Float32Array(MAX_LOOKAHEAD_SAMPLES);
        this.writePos = 0;

        // Sliding window maximum (monotonic deque) — pre-allocated, no GC
        this.dequeValues = new Float64Array(MAX_LOOKAHEAD_SAMPLES);
        this.dequeIndices = new Int32Array(MAX_LOOKAHEAD_SAMPLES);
        this.dequeHead = 0;
        this.dequeTail = 0;
        this.dequeSampleCounter = 0;

        // True peak detection — 4-sample history buffer
        this.tpHistory = new Float32Array(4);
        this.tpPos = 0;

        // Current params (with smoothing targets)
        this.params = null;

        // Smoothed parameter current values (P2)
        this.smoothed = {
            threshold: -24,
            makeupGain: 0,
            dryGain: -96,
            inflate: 0,
        };
        // Smoothing targets
        this.targets = {
            threshold: -24,
            makeupGain: 0,
            dryGain: -96,
            inflate: 0,
        };

        // Pre-compute adaptive coefficients (depend only on sampleRate)
        this.compAttCoeff = 1 - Math.exp(-1 / ((ATTACK_MS / 1000) * sampleRate));
        this.fastRelCoeff = 1 - Math.exp(-1 / ((FAST_RELEASE_MS / 1000) * sampleRate));
        this.slowRelCoeff = 1 - Math.exp(-1 / ((SLOW_RELEASE_MS / 1000) * sampleRate));
        this.cfPeakCoeff = 1 - Math.exp(-1 / ((CF_PEAK_COEFF_MS / 1000) * sampleRate));
        this.cfSmoothCoeff = 1 - Math.exp(-1 / ((CF_SMOOTH_MS / 1000) * sampleRate));

        this.lookaheadSamples = 0;
        this.isCompBypass = false;

        // Cached linear gain values (avoid per-sample Math.exp when stable)
        this._prevMakeupGain = 0;
        this._prevDryGain = -96;
        this._cachedMakeupLinear = Math.exp(0 * LN10_OVER_20);
        this._cachedDryLinear = Math.exp(-96 * LN10_OVER_20);
        this.isDeltaMode = false;

        // Smoothing coefficient (~5ms time constant)
        this.smoothCoeff = 1 - Math.exp(-1 / (0.005 * sampleRate));

        // Crest factor state
        const rmsWindowSize = Math.max(1, Math.round((CF_RMS_WINDOW_MS / 1000) * sampleRate));
        this.rmsWindowSize = rmsWindowSize;
        this.rmsBuffer = new Float32Array(rmsWindowSize);
        this.rmsSum = 0;
        this.rmsWritePos = 0;
        this.cfPeak = 0;
        this.smoothedCF = 6.0;

        this.port.onmessage = (e) => {
            const p = e.data;
            this.params = p;

            // Update smoothing targets (P2)
            this.targets.threshold = p.threshold;
            this.targets.makeupGain = p.makeupGain;
            this.targets.dryGain = p.dryGain;
            this.targets.inflate = p.inflate ?? 0;

            // Look-ahead (P3)
            this.lookaheadSamples = Math.min(
                Math.floor((p.lookahead / 1000) * sampleRate),
                MAX_LOOKAHEAD_SAMPLES - 1
            );

            // Dynamic attack: derive from lookahead for smooth pre-reduction
            const effectiveAttackMs = Math.max(ATTACK_MS, (p.lookahead || 0) * 0.7);
            this.compAttCoeff = 1 - Math.exp(-1 / ((effectiveAttackMs / 1000) * sampleRate));

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
        const fastRelCoeff = this.fastRelCoeff;
        const slowRelCoeff = this.slowRelCoeff;
        const cfPeakCoeff = this.cfPeakCoeff;
        const cfSmoothCoeff = this.cfSmoothCoeff;
        const isCompBypass = this.isCompBypass;
        const isDeltaMode = this.isDeltaMode;
        const lookaheadSamples = this.lookaheadSamples;
        const delayBuffer = this.delayBuffer;
        const bufferMask = LOOKAHEAD_MASK;
        const rmsBuffer = this.rmsBuffer;
        const rmsWindowSize = this.rmsWindowSize;

        let compEnvelope = this.compEnvelope;
        let peakHold = this.peakHold;
        let writePos = this.writePos;
        let rmsSum = this.rmsSum;
        let rmsWritePos = this.rmsWritePos;
        let cfPeak = this.cfPeak;
        let smoothedCF = this.smoothedCF;

        // Sliding window max deque (local copies)
        const dequeValues = this.dequeValues;
        const dequeIndices = this.dequeIndices;
        let dequeHead = this.dequeHead;
        let dequeTail = this.dequeTail;
        let dequeSampleCounter = this.dequeSampleCounter;
        // Window size: at least 1 (current sample) even when lookahead is 0
        const windowSize = lookaheadSamples > 0 ? lookaheadSamples : 1;

        // True peak detection (local copies)
        const tpHistory = this.tpHistory;
        let tpPos = this.tpPos;

        // Smoothed values (local copies for hot loop)
        let sThreshold = this.smoothed.threshold;
        let sMakeupGain = this.smoothed.makeupGain;
        let sDryGain = this.smoothed.dryGain;
        let sInflate = this.smoothed.inflate;

        const tThreshold = this.targets.threshold;
        const tMakeupGain = this.targets.makeupGain;
        const tDryGain = this.targets.dryGain;
        const tInflate = this.targets.inflate;

        // Cached linear gain values — avoid Math.exp when smoothed value unchanged
        let prevMakeup = this._prevMakeupGain;
        let prevDry = this._prevDryGain;
        let makeUpLinear = this._cachedMakeupLinear;
        let dryLinear = this._cachedDryLinear;

        for (let i = 0; i < length; i++) {
            // Per-sample parameter smoothing (P2)
            sThreshold += smoothCoeff * (tThreshold - sThreshold);
            sMakeupGain += smoothCoeff * (tMakeupGain - sMakeupGain);
            sDryGain += smoothCoeff * (tDryGain - sDryGain);
            sInflate += smoothCoeff * (tInflate - sInflate);

            if (sMakeupGain !== prevMakeup) {
                makeUpLinear = Math.exp(sMakeupGain * LN10_OVER_20);
                prevMakeup = sMakeupGain;
            }
            if (sDryGain !== prevDry) {
                dryLinear = Math.exp(sDryGain * LN10_OVER_20);
                prevDry = sDryGain;
            }

            const inputSample = inputData[i];

            // Write to delay line (P3)
            delayBuffer[writePos] = inputSample;

            // Read delayed sample for output
            const delayedSample = delayBuffer[(writePos - lookaheadSamples + MAX_LOOKAHEAD_SAMPLES) & bufferMask];

            // --- True peak detection (4-point Lagrange interpolation) ---
            const absSample = Math.abs(inputSample);
            tpHistory[tpPos] = absSample;
            let truePeak = absSample;

            // Need at least 4 samples of history for interpolation
            const h0 = tpHistory[(tpPos - 3 + 4) % 4];
            const h1 = tpHistory[(tpPos - 2 + 4) % 4];
            const h2 = tpHistory[(tpPos - 1 + 4) % 4];
            const h3 = absSample;

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
            // Push truePeak into deque, maintaining decreasing order
            while (dequeTail !== dequeHead && dequeValues[(dequeTail - 1 + MAX_LOOKAHEAD_SAMPLES) & LOOKAHEAD_MASK] <= truePeak) {
                dequeTail = (dequeTail - 1 + MAX_LOOKAHEAD_SAMPLES) & LOOKAHEAD_MASK;
            }
            dequeValues[dequeTail] = truePeak;
            dequeIndices[dequeTail] = dequeSampleCounter;
            dequeTail = (dequeTail + 1) & LOOKAHEAD_MASK;

            // Remove expired elements from front
            while (dequeHead !== dequeTail && dequeIndices[dequeHead] <= dequeSampleCounter - windowSize) {
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

            // --- Compressor detection with two-stage release ---
            if (!isCompBypass) {
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

            if (!isCompBypass) {
                if (compEnvdB > sThreshold) {
                    compGainReductiondB = sThreshold - compEnvdB;
                }
            }

            const compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20);

            // Output uses delayed sample (P3)
            let limited = delayedSample * compGainLinear;

            // Inflate waveshaper (after gain reduction, before makeup)
            const inflateAmt = sInflate * 0.01;
            if (inflateAmt > 0.001) {
                const clamped = limited < -1 ? -1 : limited > 1 ? 1 : limited;
                const y = clamped < 0 ? -clamped : clamped;
                const y2 = y * y;
                const shaped = 1.5 * y - 0.0625 * y2 - 0.375 * y2 * y - 0.0625 * y2 * y2;
                const sign = clamped < 0 ? -1 : 1;
                const iWet = inflateAmt * 0.99999955296;
                const iDry = 1 - inflateAmt;
                limited = (shaped * iWet + y * iDry) * sign;
            }

            let wet = limited * makeUpLinear;

            if (isDeltaMode) {
                outputData[i] = wet - delayedSample;
            } else {
                outputData[i] = wet + (delayedSample * dryLinear);
            }

            writePos = (writePos + 1) & bufferMask;
        }

        // Write back state
        this.compEnvelope = compEnvelope;
        this.peakHold = peakHold;
        this.writePos = writePos;
        this.rmsSum = rmsSum;
        this.rmsWritePos = rmsWritePos;
        this.cfPeak = cfPeak;
        this.smoothedCF = smoothedCF;
        this.dequeHead = dequeHead;
        this.dequeTail = dequeTail;
        this.dequeSampleCounter = dequeSampleCounter;
        this.tpPos = tpPos;
        this.smoothed.threshold = sThreshold;
        this.smoothed.makeupGain = sMakeupGain;
        this.smoothed.dryGain = sDryGain;
        this.smoothed.inflate = sInflate;
        this._prevMakeupGain = prevMakeup;
        this._prevDryGain = prevDry;
        this._cachedMakeupLinear = makeUpLinear;
        this._cachedDryLinear = dryLinear;

        return true;
    }
}

registerProcessor('compressor-processor', CompressorProcessor);
