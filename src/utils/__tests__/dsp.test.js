import { describe, it, expect } from 'vitest';
import { processCompressor, createRealTimeCompressor } from '../dsp';

const makeSine = (length, freq, sampleRate, amplitude = 1.0) => {
    const buf = new Float32Array(length);
    for (let i = 0; i < length; i++) buf[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
    return buf;
};

const defaultParams = {
    threshold: -24,
    lookahead: 0, makeupGain: 0,
    isCompBypass: false,
};

describe('processCompressor', () => {
    it('returns arrays of same length as input', () => {
        const input = makeSine(1024, 440, 44100, 0.5);
        const { outputData, grCurve, visualInput } = processCompressor(input, 44100, defaultParams);
        expect(outputData.length).toBe(1024);
        expect(grCurve.length).toBe(1024);
        expect(visualInput).toBe(input);
    });

    it('passes through silence unchanged', () => {
        const input = new Float32Array(512);
        const { outputData } = processCompressor(input, 44100, defaultParams);
        for (let i = 0; i < 512; i++) expect(outputData[i]).toBe(0);
    });

    it('reduces loud signals (gain reduction < 0)', () => {
        const input = makeSine(4096, 440, 44100, 0.9);
        const { grCurve } = processCompressor(input, 44100, { ...defaultParams, threshold: -12 });
        // After envelope settles, there should be gain reduction
        const lastGR = grCurve[grCurve.length - 1];
        expect(lastGR).toBeLessThan(0);
    });

    it('does not compress below threshold', () => {
        const input = makeSine(4096, 440, 44100, 0.01); // very quiet ~-40dB
        const { grCurve } = processCompressor(input, 44100, { ...defaultParams, threshold: -6 });
        // Should have minimal/no gain reduction
        for (let i = 0; i < grCurve.length; i++) expect(grCurve[i]).toBeCloseTo(0, 1);
    });

    it('bypasses compressor when isCompBypass is true', () => {
        const input = makeSine(2048, 440, 44100, 0.8);
        const { outputData } = processCompressor(input, 44100, { ...defaultParams, isCompBypass: true });
        // With comp bypassed, output ≈ input * makeupGain(0dB=1.0)
        for (let i = 0; i < input.length; i++) expect(outputData[i]).toBeCloseTo(input[i], 4);
    });

    it('applies makeup gain', () => {
        const input = makeSine(2048, 440, 44100, 0.5);
        const { outputData: outNoMakeup } = processCompressor(input, 44100, { ...defaultParams, isCompBypass: true });
        const { outputData: outWithMakeup } = processCompressor(input, 44100, { ...defaultParams, isCompBypass: true, makeupGain: 6 });
        // +6dB makeup → output ~2x louder
        const rmsNo = Math.sqrt(outNoMakeup.slice(-512).reduce((s, v) => s + v * v, 0) / 512);
        const rmsWith = Math.sqrt(outWithMakeup.slice(-512).reduce((s, v) => s + v * v, 0) / 512);
        expect(rmsWith / rmsNo).toBeCloseTo(Math.pow(10, 6 / 20), 1);
    });

    it('works with non-zero lookahead', () => {
        const input = makeSine(4096, 440, 44100, 0.9);
        const { outputData, grCurve } = processCompressor(input, 44100, {
            ...defaultParams, threshold: -12, lookahead: 5,
        });
        expect(outputData.length).toBe(4096);
        // Should still produce gain reduction
        const lastGR = grCurve[grCurve.length - 1];
        expect(lastGR).toBeLessThan(0);
    });

    it('starts gain reduction earlier with lookahead (pre-reduction)', () => {
        // Create a signal: silence then loud burst
        const length = 8192;
        const input = new Float32Array(length);
        const burstStart = 4000;
        for (let i = burstStart; i < length; i++) {
            input[i] = 0.9 * Math.sin(2 * Math.PI * 440 * (i - burstStart) / 44100);
        }

        const { grCurve: grNoLA } = processCompressor(input, 44100, {
            ...defaultParams, threshold: -12, lookahead: 0,
        });
        const { grCurve: grWithLA } = processCompressor(input, 44100, {
            ...defaultParams, threshold: -12, lookahead: 5,
        });

        // With lookahead, gain reduction should start before the burst
        // Check a few samples before burstStart
        const checkIdx = burstStart - 10;
        // Without lookahead, no GR before the burst
        expect(grNoLA[checkIdx]).toBe(0);
        // With lookahead, there should be some GR before the burst
        // (the detector sees ahead into the burst)
        let hasPreReduction = false;
        for (let i = burstStart - 200; i < burstStart; i++) {
            if (grWithLA[i] < -0.1) { hasPreReduction = true; break; }
        }
        expect(hasPreReduction).toBe(true);
    });

    it('backward compatible: lookahead 0 produces gain reduction', () => {
        const input = makeSine(4096, 440, 44100, 0.9);
        const { grCurve } = processCompressor(input, 44100, {
            ...defaultParams, threshold: -12, lookahead: 0,
        });
        const lastGR = grCurve[grCurve.length - 1];
        expect(lastGR).toBeLessThan(0);
    });

    it('true peak detection catches inter-sample peaks', () => {
        // Create a signal that has inter-sample peaks:
        // two adjacent samples that are both high but with opposite slopes,
        // creating an interpolated peak higher than either sample
        const length = 4096;
        const sampleRate = 44100;
        // A signal near Nyquist will have significant ISPs
        const freq = sampleRate * 0.45; // near Nyquist
        const input = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            input[i] = 0.7 * Math.sin(2 * Math.PI * freq * i / sampleRate);
        }

        // With true peak detection active, the limiter should catch ISPs
        // and apply more gain reduction than raw sample peaks would suggest
        const { grCurve } = processCompressor(input, sampleRate, {
            ...defaultParams, threshold: -6, lookahead: 3,
        });

        // Should have some gain reduction due to ISPs pushing above threshold
        let hasGR = false;
        for (let i = 100; i < length; i++) {
            if (grCurve[i] < -0.5) { hasGR = true; break; }
        }
        expect(hasGR).toBe(true);
    });
});

describe('createRealTimeCompressor', () => {
    it('processes a block without error', () => {
        const comp = createRealTimeCompressor(44100);
        const input = makeSine(128, 440, 44100, 0.5);
        const output = new Float32Array(128);
        comp.processBlock(input, output, {
            ...defaultParams, isDeltaMode: false, dryGain: -96,
        });
        // Output should have some non-zero values
        const hasSignal = output.some(v => Math.abs(v) > 1e-10);
        expect(hasSignal).toBe(true);
    });

    it('reset clears internal state', () => {
        const comp = createRealTimeCompressor(44100);
        const input = makeSine(128, 440, 44100, 0.9);
        const output = new Float32Array(128);
        comp.processBlock(input, output, { ...defaultParams, isDeltaMode: false, dryGain: -96 });
        comp.reset();
        // After reset, processing silence should yield silence
        const silence = new Float32Array(128);
        const out2 = new Float32Array(128);
        comp.processBlock(silence, out2, { ...defaultParams, isDeltaMode: false, dryGain: -96 });
        for (let i = 0; i < 128; i++) expect(Math.abs(out2[i])).toBeLessThan(1e-6);
    });

    it('works with non-zero lookahead', () => {
        const comp = createRealTimeCompressor(44100);
        const input = makeSine(512, 440, 44100, 0.9);
        const output = new Float32Array(512);
        comp.processBlock(input, output, {
            ...defaultParams, threshold: -12, lookahead: 3, isDeltaMode: false, dryGain: -96,
        });
        const hasSignal = output.some(v => Math.abs(v) > 1e-10);
        expect(hasSignal).toBe(true);
    });

    it('backward compatible: lookahead 0 still compresses', () => {
        const comp = createRealTimeCompressor(44100);
        // Process multiple blocks to let envelope settle
        const blockSize = 128;
        const params = { ...defaultParams, threshold: -12, lookahead: 0, isDeltaMode: false, dryGain: -96 };
        let output = new Float32Array(blockSize);

        for (let b = 0; b < 20; b++) {
            const input = makeSine(blockSize, 440, 44100, 0.9);
            output = new Float32Array(blockSize);
            comp.processBlock(input, output, params);
        }

        // After settling, output should be quieter than input (gain reduction applied)
        const inputRms = Math.sqrt(makeSine(blockSize, 440, 44100, 0.9).reduce((s, v) => s + v * v, 0) / blockSize);
        const outputRms = Math.sqrt(output.reduce((s, v) => s + v * v, 0) / blockSize);
        expect(outputRms).toBeLessThan(inputRms);
    });
});
