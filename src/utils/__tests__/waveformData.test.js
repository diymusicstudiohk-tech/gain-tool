import { describe, it, expect } from 'vitest';
import { computeWaveformPoints } from '../waveformData';

/** Create a synthetic visualResult with known data. */
const makeVisualResult = (length, inputAmplitude = 0.5, outputAmplitude = 0.3) => {
    const visualInput = new Float32Array(length);
    const outputData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        const t = i / length;
        visualInput[i] = inputAmplitude * Math.sin(2 * Math.PI * 4 * t);
        outputData[i] = outputAmplitude * Math.sin(2 * Math.PI * 4 * t);
    }
    return { visualInput, outputData };
};

const baseParams = {
    width: 100,
    zoomX: 1,
    panOffset: 0,
    centerY: 200,
    ampScale: 180,
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

    it('does not produce outPoints when lastPlayedType=original', () => {
        const visualResult = makeVisualResult(1000);
        const { outPoints } = computeWaveformPoints({ ...baseParams, visualResult, lastPlayedType: 'original' });
        expect(outPoints.length).toBe(0);
    });

    it('produces outPoints when lastPlayedType=processed', () => {
        const visualResult = makeVisualResult(1000);
        const { outPoints } = computeWaveformPoints({ ...baseParams, visualResult, lastPlayedType: 'processed' });
        expect(outPoints.length).toBeGreaterThan(0);
    });

    it('handles empty input gracefully', () => {
        const visualResult = { visualInput: new Float32Array(0), outputData: new Float32Array(0) };
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
