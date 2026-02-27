import { describe, it, expect, vi } from 'vitest';
import { drawPolygon, drawPolygonWithStroke, drawHatchedPolygon, drawGRLine } from '../canvasPolygons';

/** Minimal mock canvas context that records calls. */
const createMockCtx = () => {
    const calls = [];
    const record = (name) => (...args) => calls.push({ name, args });
    return {
        calls,
        beginPath: record('beginPath'),
        moveTo: record('moveTo'),
        lineTo: record('lineTo'),
        closePath: record('closePath'),
        fill: record('fill'),
        stroke: record('stroke'),
        clip: record('clip'),
        save: record('save'),
        restore: record('restore'),
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        createLinearGradient: () => ({ addColorStop: () => {} }),
        set globalAlpha(v) { this._alpha = v; },
        get globalAlpha() { return this._alpha ?? 1; },
    };
};

const samplePoints = [
    { x: 0, yTop: 40, yBot: 60 },
    { x: 1, yTop: 30, yBot: 70 },
    { x: 2, yTop: 35, yBot: 65 },
];

describe('drawPolygon', () => {
    it('does nothing for empty points', () => {
        const ctx = createMockCtx();
        drawPolygon(ctx, [], '#fff', 100, 50);
        expect(ctx.calls.length).toBe(0);
    });

    it('builds a closed polygon path', () => {
        const ctx = createMockCtx();
        drawPolygon(ctx, samplePoints, '#ff0000', 100, 50);
        const names = ctx.calls.map(c => c.name);
        expect(names).toContain('beginPath');
        expect(names).toContain('closePath');
        expect(names).toContain('fill');
        // Should have moveTo + 3 lineTo (top) + lineTo(to center) + 3 lineTo (bot) = 1 moveTo + 7 lineTo
        const lineToCount = ctx.calls.filter(c => c.name === 'lineTo').length;
        expect(lineToCount).toBe(7); // 3 top + 1 center + 3 bot
    });
});

describe('drawPolygonWithStroke', () => {
    it('calls both fill and stroke', () => {
        const ctx = createMockCtx();
        drawPolygonWithStroke(ctx, samplePoints, '#ff0000', '#00ff00', 100, 50);
        const names = ctx.calls.map(c => c.name);
        expect(names).toContain('fill');
        expect(names).toContain('stroke');
    });
});

describe('drawHatchedPolygon', () => {
    it('clips to polygon and draws lines', () => {
        const ctx = createMockCtx();
        drawHatchedPolygon(ctx, samplePoints, '#aaa', 100, 50);
        const names = ctx.calls.map(c => c.name);
        expect(names).toContain('clip');
        expect(names).toContain('stroke');
    });
});

describe('drawGRLine', () => {
    it('does nothing for empty points', () => {
        const ctx = createMockCtx();
        drawGRLine(ctx, [], '#fff');
        expect(ctx.calls.length).toBe(0);
    });

    it('draws a polyline through all points', () => {
        const ctx = createMockCtx();
        const pts = [{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 5 }];
        drawGRLine(ctx, pts, '#618C71');
        const names = ctx.calls.map(c => c.name);
        expect(names).toContain('beginPath');
        expect(names).toContain('stroke');
        const lineToCalls = ctx.calls.filter(c => c.name === 'lineTo');
        expect(lineToCalls.length).toBe(2); // 2 lineTo after initial moveTo
    });
});
