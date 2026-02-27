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
});
