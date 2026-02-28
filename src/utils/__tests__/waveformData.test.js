import { describe, it, expect } from 'vitest';
import { computeWaveformPoints } from '../waveformData';

/** Create a synthetic visualResult with known data. */
const makeVisualResult = (length, inputAmplitude = 0.5, outputAmplitude = 0.3, grDb = -6) => {
    const visualInput = new Float32Array(length);
    const outputData = new Float32Array(length);
    const grCurve = new Float32Array(length);
    const grLinear = Math.pow(10, grDb / 20);
    for (let i = 0; i < length; i++) {
        const t = i / length;
        visualInput[i] = inputAmplitude * Math.sin(2 * Math.PI * 4 * t);
        outputData[i] = outputAmplitude * Math.sin(2 * Math.PI * 4 * t);
        grCurve[i] = grDb;
    }
    return { visualInput, outputData, grCurve };
};

const baseParams = {
    width: 100,
    zoomX: 1,
    panOffset: 0,
    centerY: 200,
    ampScale: 180,
    grMaxHeight: 90,
    isDeltaMode: false,
    lastPlayedType: 'processed',
    mipmaps: null,
    interactionDPR: 0,
    step: 10,
};

describe('computeWaveformPoints', () => {
    it('returns inPoints with correct length', () => {
        const visualResult = makeVisualResult(1000);
        const result = computeWaveformPoints({ ...baseParams, visualResult });
        expect(result.inPoints.length).toBeGreaterThan(0);
        expect(result.inPoints.length).toBeLessThanOrEqual(100);
    });

    it('inPoints are symmetric around centerY', () => {
        const visualResult = makeVisualResult(1000);
        const { inPoints } = computeWaveformPoints({ ...baseParams, visualResult });
        for (const pt of inPoints) {
            const topDist = baseParams.centerY - pt.yTop;
            const botDist = pt.yBot - baseParams.centerY;
            expect(topDist).toBeCloseTo(botDist, 5);
        }
    });

    it('does not produce outPoints when lastPlayedType=original and isDeltaMode=false', () => {
        const visualResult = makeVisualResult(1000);
        const { outPoints } = computeWaveformPoints({ ...baseParams, visualResult, lastPlayedType: 'original' });
        expect(outPoints.length).toBe(0);
    });

    it('produces outPoints when lastPlayedType=processed', () => {
        const visualResult = makeVisualResult(1000);
        const { outPoints } = computeWaveformPoints({ ...baseParams, visualResult, lastPlayedType: 'processed' });
        expect(outPoints.length).toBeGreaterThan(0);
    });

    it('produces deltaPoints in delta mode', () => {
        const visualResult = makeVisualResult(1000);
        const { deltaPoints } = computeWaveformPoints({ ...baseParams, visualResult, isDeltaMode: true });
        expect(deltaPoints.length).toBeGreaterThan(0);
    });

    it('produces outPoints for processed type', () => {
        const visualResult = makeVisualResult(1000);
        const { outPoints } = computeWaveformPoints({ ...baseParams, visualResult, lastPlayedType: 'processed' });
        expect(outPoints.length).toBeGreaterThan(0);
    });

    it('does not produce outPoints for non-processed non-delta type', () => {
        const visualResult = makeVisualResult(1000);
        const { outPoints } = computeWaveformPoints({ ...baseParams, visualResult, lastPlayedType: 'original', isDeltaMode: false });
        expect(outPoints.length).toBe(0);
    });

    it('produces grPoints with negative GR', () => {
        const visualResult = makeVisualResult(1000, 0.5, 0.3, -6);
        const { grPoints } = computeWaveformPoints({ ...baseParams, visualResult });
        expect(grPoints.length).toBeGreaterThan(0);
        // grPoints y > 0 when there is gain reduction
        const hasReduction = grPoints.some(pt => pt.y > 0);
        expect(hasReduction).toBe(true);
    });

    it('produces grPoints at y=0 when no gain reduction', () => {
        const visualResult = makeVisualResult(1000, 0.5, 0.3, 0);
        const { grPoints } = computeWaveformPoints({ ...baseParams, visualResult });
        for (const pt of grPoints) expect(pt.y).toBe(0);
    });

    it('produces diffOuterPoints and diffInnerPoints in delta+processed mode', () => {
        const visualResult = makeVisualResult(1000);
        const { diffOuterPoints, diffInnerPoints } = computeWaveformPoints({
            ...baseParams, visualResult, isDeltaMode: true, lastPlayedType: 'processed',
        });
        expect(diffOuterPoints.length).toBeGreaterThan(0);
        expect(diffInnerPoints.length).toBeGreaterThan(0);
    });

    it('handles empty input gracefully', () => {
        const visualResult = { visualInput: new Float32Array(0), outputData: new Float32Array(0), grCurve: new Float32Array(0) };
        const result = computeWaveformPoints({ ...baseParams, visualResult });
        expect(result.inPoints.length).toBe(0);
    });

    it('respects viewport culling via panOffset', () => {
        const visualResult = makeVisualResult(2000);
        const { inPoints: all } = computeWaveformPoints({ ...baseParams, visualResult, panOffset: 0 });
        const { inPoints: panned } = computeWaveformPoints({ ...baseParams, visualResult, panOffset: 50 });
        // Panned view should produce fewer points (starts at x=50)
        expect(panned.length).toBeLessThanOrEqual(all.length);
    });
});
