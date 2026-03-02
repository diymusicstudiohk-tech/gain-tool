import { describe, it, expect } from 'vitest';
import { DISPLAY_EXP, displayAmp, linearFromDisplay, computeWaveformGeometry } from '../displayMath';

describe('displayAmp / linearFromDisplay', () => {
    it('displayAmp(0) = 0', () => {
        expect(displayAmp(0)).toBe(0);
    });

    it('displayAmp(1) = 1', () => {
        expect(displayAmp(1)).toBe(1);
    });

    it('displayAmp compresses values (output > input for small values)', () => {
        // With exponent 0.43 < 1, pow(x, 0.43) > x for x in (0,1)
        expect(displayAmp(0.1)).toBeGreaterThan(0.1);
        expect(displayAmp(0.5)).toBeGreaterThan(0.5);
    });

    it('linearFromDisplay(0) = 0', () => {
        expect(linearFromDisplay(0)).toBe(0);
    });

    it('linearFromDisplay(1) = 1', () => {
        expect(linearFromDisplay(1)).toBeCloseTo(1, 10);
    });

    it('roundtrip: linearFromDisplay(displayAmp(x)) ≈ x', () => {
        for (const val of [0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 1.0]) {
            expect(linearFromDisplay(displayAmp(val))).toBeCloseTo(val, 10);
        }
    });

    it('negative input returns 0', () => {
        expect(displayAmp(-0.5)).toBe(0);
        expect(linearFromDisplay(-0.5)).toBe(0);
    });

    it('DISPLAY_EXP is 0.43', () => {
        expect(DISPLAY_EXP).toBe(0.43);
    });
});

describe('computeWaveformGeometry', () => {
    it('computes centerY from height and panOffsetY', () => {
        const { centerY } = computeWaveformGeometry(600, 1, 0);
        expect(centerY).toBe(300);

        const { centerY: shifted } = computeWaveformGeometry(600, 1, 50);
        expect(shifted).toBe(350);
    });

    it('computes VERT_PAD as 5% of height', () => {
        const { VERT_PAD } = computeWaveformGeometry(1000, 1, 0);
        expect(VERT_PAD).toBe(50);
    });

    it('computes maxPixelHeight correctly', () => {
        const { maxPixelHeight } = computeWaveformGeometry(1000, 1, 0);
        // (1000/2) - 50 = 450
        expect(maxPixelHeight).toBe(450);
    });

    it('ampScale scales with zoomY', () => {
        const { ampScale: zoom1 } = computeWaveformGeometry(1000, 1, 0);
        const { ampScale: zoom2 } = computeWaveformGeometry(1000, 2, 0);
        expect(zoom2).toBe(zoom1 * 2);
    });

    it('does not include grMaxHeight', () => {
        const result = computeWaveformGeometry(800, 1, 0);
        expect(result.grMaxHeight).toBeUndefined();
    });
});
