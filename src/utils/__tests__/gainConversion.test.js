import { describe, it, expect } from 'vitest';
import {
    calculateRatioFromControl, calculateControlFromRatio,
    dryGainControlToDb, dryGainDbToControl,
    wetGainControlToDb, wetGainDbToControl,
} from '../gainConversion';

describe('calculateRatioFromControl / calculateControlFromRatio', () => {
    it('ctrl=0 → ratio 1:1', () => {
        expect(calculateRatioFromControl(0)).toBe(1);
    });

    it('ctrl=50 → ratio 5:1', () => {
        expect(calculateRatioFromControl(50)).toBe(5);
    });

    it('ctrl=75 → ratio 10:1', () => {
        expect(calculateRatioFromControl(75)).toBe(10);
    });

    it('ctrl=100 → ratio 100:1', () => {
        expect(calculateRatioFromControl(100)).toBe(100);
    });

    it('roundtrips through the three segments', () => {
        for (const ctrl of [0, 10, 25, 50, 60, 75, 85, 100]) {
            const ratio = calculateRatioFromControl(ctrl);
            expect(calculateControlFromRatio(ratio)).toBeCloseTo(ctrl, 5);
        }
    });

    it('inverse roundtrip from ratio side', () => {
        for (const ratio of [1, 2, 5, 8, 10, 50, 100]) {
            const ctrl = calculateControlFromRatio(ratio);
            expect(calculateRatioFromControl(ctrl)).toBeCloseTo(ratio, 5);
        }
    });
});

describe('dryGainControlToDb / dryGainDbToControl', () => {
    it('ctrl=0 → -200 dB (silence)', () => {
        expect(dryGainControlToDb(0)).toBe(-200);
    });

    it('ctrl=50 → 0 dB', () => {
        expect(dryGainControlToDb(50)).toBeCloseTo(0, 5);
    });

    it('ctrl=100 → +5 dB', () => {
        expect(dryGainControlToDb(100)).toBeCloseTo(5, 5);
    });

    it('roundtrip across all segments', () => {
        // Skip ctrl=0 since -200dB → 0 clamps at boundary
        for (const ctrl of [1, 8, 16.67, 30, 50, 75, 100]) {
            const db = dryGainControlToDb(ctrl);
            expect(dryGainDbToControl(db)).toBeCloseTo(ctrl, 4);
        }
    });
});

describe('wetGainControlToDb / wetGainDbToControl', () => {
    it('ctrl=0 → -200 dB (silence)', () => {
        expect(wetGainControlToDb(0)).toBe(-200);
    });

    it('ctrl=50 → 0 dB', () => {
        expect(wetGainControlToDb(50)).toBeCloseTo(0, 5);
    });

    it('ctrl=100 → +15 dB', () => {
        expect(wetGainControlToDb(100)).toBeCloseTo(15, 5);
    });

    it('shares segments 1-3 with dry', () => {
        // First 3 segments are identical
        for (const ctrl of [5, 10, 16.67, 25, 40, 50]) {
            expect(wetGainControlToDb(ctrl)).toBeCloseTo(dryGainControlToDb(ctrl), 5);
        }
    });

    it('diverges in segment 4 (ctrl > 50)', () => {
        expect(wetGainControlToDb(75)).toBeCloseTo(7.5, 5);  // 50% of +15
        expect(dryGainControlToDb(75)).toBeCloseTo(2.5, 5);  // 50% of +5
    });

    it('roundtrip across all segments', () => {
        for (const ctrl of [1, 8, 16.67, 30, 50, 75, 100]) {
            const db = wetGainControlToDb(ctrl);
            expect(wetGainDbToControl(db)).toBeCloseTo(ctrl, 4);
        }
    });
});
