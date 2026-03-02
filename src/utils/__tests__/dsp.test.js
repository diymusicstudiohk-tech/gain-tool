import { describe, it, expect } from 'vitest';
import { processCompressor, createRealTimeCompressor } from '../dsp';

const makeSine = (length, freq, sampleRate, amplitude = 1.0) => {
    const buf = new Float32Array(length);
    for (let i = 0; i < length; i++) buf[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
    return buf;
};

const defaultParams = { inputGain: 0, outputGain: 0 };

describe('processCompressor', () => {
    it('returns arrays of same length as input', () => {
        const input = makeSine(1024, 440, 44100, 0.5);
        const { outputData, visualInput } = processCompressor(input, 44100, defaultParams);
        expect(outputData.length).toBe(1024);
        expect(visualInput).toBe(input);
    });

    it('passes through silence unchanged', () => {
        const input = new Float32Array(512);
        const { outputData } = processCompressor(input, 44100, defaultParams);
        for (let i = 0; i < 512; i++) expect(outputData[i]).toBe(0);
    });

    it('passes through signal unchanged with 0 dB gains', () => {
        const input = makeSine(2048, 440, 44100, 0.5);
        const { outputData } = processCompressor(input, 44100, defaultParams);
        for (let i = 0; i < input.length; i++) expect(outputData[i]).toBeCloseTo(input[i], 5);
    });

    it('applies input gain', () => {
        const input = makeSine(2048, 440, 44100, 0.5);
        const { outputData } = processCompressor(input, 44100, { inputGain: 6, outputGain: 0 });
        const rmsIn = Math.sqrt(input.reduce((s, v) => s + v * v, 0) / input.length);
        const rmsOut = Math.sqrt(outputData.reduce((s, v) => s + v * v, 0) / outputData.length);
        expect(rmsOut / rmsIn).toBeCloseTo(Math.pow(10, 6 / 20), 1);
    });

    it('applies output gain', () => {
        const input = makeSine(2048, 440, 44100, 0.5);
        const { outputData } = processCompressor(input, 44100, { inputGain: 0, outputGain: -6 });
        const rmsIn = Math.sqrt(input.reduce((s, v) => s + v * v, 0) / input.length);
        const rmsOut = Math.sqrt(outputData.reduce((s, v) => s + v * v, 0) / outputData.length);
        expect(rmsOut / rmsIn).toBeCloseTo(Math.pow(10, -6 / 20), 1);
    });

    it('applies both input and output gain', () => {
        const input = makeSine(2048, 440, 44100, 0.5);
        const { outputData } = processCompressor(input, 44100, { inputGain: 6, outputGain: -3 });
        const rmsIn = Math.sqrt(input.reduce((s, v) => s + v * v, 0) / input.length);
        const rmsOut = Math.sqrt(outputData.reduce((s, v) => s + v * v, 0) / outputData.length);
        expect(rmsOut / rmsIn).toBeCloseTo(Math.pow(10, 3 / 20), 1);
    });

    it('returns separate visualInput when inputGain is non-zero', () => {
        const input = makeSine(1024, 440, 44100, 0.5);
        const { visualInput } = processCompressor(input, 44100, { inputGain: 6, outputGain: 0 });
        expect(visualInput).not.toBe(input);
        expect(visualInput.length).toBe(input.length);
    });

    it('reuses preallocated buffers', () => {
        const input = makeSine(1024, 440, 44100, 0.5);
        const preallocated = { output: new Float32Array(1024), visualInput: new Float32Array(1024) };
        const { outputData, visualInput } = processCompressor(input, 44100, { inputGain: 3, outputGain: 0 }, 1, preallocated);
        expect(outputData).toBe(preallocated.output);
        expect(visualInput).toBe(preallocated.visualInput);
    });
});

describe('createRealTimeCompressor', () => {
    it('processes a block without error', () => {
        const comp = createRealTimeCompressor(44100);
        const input = makeSine(128, 440, 44100, 0.5);
        const output = new Float32Array(128);
        comp.processBlock(input, output, defaultParams);
        const hasSignal = output.some(v => Math.abs(v) > 1e-10);
        expect(hasSignal).toBe(true);
    });

    it('reset clears internal state', () => {
        const comp = createRealTimeCompressor(44100);
        const input = makeSine(128, 440, 44100, 0.9);
        const output = new Float32Array(128);
        comp.processBlock(input, output, { inputGain: 6, outputGain: 0 });
        comp.reset();
        // After reset, processing silence should yield silence
        const silence = new Float32Array(128);
        const out2 = new Float32Array(128);
        comp.processBlock(silence, out2, defaultParams);
        for (let i = 0; i < 128; i++) expect(Math.abs(out2[i])).toBeLessThan(1e-6);
    });

    it('applies gain over time with smoothing', () => {
        const comp = createRealTimeCompressor(44100);
        const blockSize = 128;
        const params = { inputGain: 6, outputGain: 0 };

        // Process multiple blocks to let smoothing settle
        let output = new Float32Array(blockSize);
        for (let b = 0; b < 20; b++) {
            const input = makeSine(blockSize, 440, 44100, 0.5);
            output = new Float32Array(blockSize);
            comp.processBlock(input, output, params);
        }

        // After settling, output should be louder than input (+6dB)
        const inputRms = Math.sqrt(makeSine(blockSize, 440, 44100, 0.5).reduce((s, v) => s + v * v, 0) / blockSize);
        const outputRms = Math.sqrt(output.reduce((s, v) => s + v * v, 0) / blockSize);
        expect(outputRms / inputRms).toBeCloseTo(Math.pow(10, 6 / 20), 1);
    });
});
