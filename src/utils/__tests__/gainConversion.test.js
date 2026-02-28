import { describe, it, expect } from 'vitest';
import {
    lookaheadControlToMs, lookaheadMsToControl,
} from '../gainConversion';

describe('lookaheadControlToMs / lookaheadMsToControl', () => {
    it('ctrl=0 → 0 ms', () => {
        expect(lookaheadControlToMs(0)).toBe(0);
    });

    it('ctrl=50 → 5 ms', () => {
        expect(lookaheadControlToMs(50)).toBeCloseTo(5, 5);
    });

    it('ctrl=100 → 100 ms', () => {
        expect(lookaheadControlToMs(100)).toBeCloseTo(100, 5);
    });

    it('roundtrip across all segments', () => {
        for (const ctrl of [0, 1, 10, 25, 50, 75, 100]) {
            const ms = lookaheadControlToMs(ctrl);
            expect(lookaheadMsToControl(ms)).toBeCloseTo(ctrl, 4);
        }
    });
});
