import { useEffect, useRef, useCallback } from 'react';
import { selectMipmapLevel } from '../utils/mipmapCache';

const useOutputWaveformDrawer = (canvasRef, outputData, mipmapLevels) => {
    const dimsRef = useRef({ width: 0, height: 0 });

    const drawOutputWaveform = useCallback((canvas, data, levels) => {
        if (!canvas || !data || data.length === 0) return;
        const ctx = canvas.getContext('2d');
        const { width, height } = dimsRef.current;
        if (width === 0 || height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const physW = Math.round(width * dpr);
        const physH = Math.round(height * dpr);
        if (canvas.width !== physW) canvas.width = physW;
        if (canvas.height !== physH) canvas.height = physH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, width, height);

        const centerY = height / 2;
        const ampScale = centerY; // 0dB touches edge
        const len = data.length;
        const step = len / width;

        ctx.fillStyle = '#ffffff';

        // Use mipmaps when available for faster peak lookup
        const useMipmaps = levels && levels.length > 1;
        const mm = useMipmaps ? selectMipmapLevel(levels, step) : null;

        for (let x = 0; x < width; x++) {
            const start = Math.floor(x * step);
            const end = Math.min(Math.floor((x + 1) * step), len);

            let maxVal = 0;
            let minVal = 0;

            if (end - start > 0) {
                if (mm) {
                    // Fast path: use mipmap (absMax stores signed peak)
                    const mmLevel = mm.level;
                    const bs = mm.blockSize;
                    const mStart = Math.floor(start / bs);
                    const mEnd = Math.ceil(end / bs);
                    for (let i = mStart; i < mEnd && i < mmLevel.length; i++) {
                        const v = mmLevel[i];
                        if (v > maxVal) maxVal = v;
                        if (v < minVal) minVal = v;
                    }
                } else {
                    // Fallback: iterate raw samples
                    for (let i = start; i < end; i++) {
                        const v = data[i];
                        if (v > maxVal) maxVal = v;
                        if (v < minVal) minVal = v;
                    }
                }
            } else {
                const idx = Math.min(start, len - 1);
                if (idx >= 0) {
                    const v = data[idx];
                    maxVal = v > 0 ? v : 0;
                    minVal = v < 0 ? v : 0;
                }
            }

            const yTop = centerY - maxVal * ampScale;
            const yBot = centerY - minVal * ampScale;
            const barH = Math.max(1, yBot - yTop);
            ctx.fillRect(x, yTop, 1, barH);
        }
    }, []);

    // ResizeObserver for responsive sizing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                dimsRef.current = { width, height };
                drawOutputWaveform(canvas, outputData, mipmapLevels);
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [canvasRef, outputData, mipmapLevels, drawOutputWaveform]);

    // Redraw when data changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get initial dims if not yet set
        if (dimsRef.current.width === 0) {
            const container = canvas.parentElement;
            if (container) {
                const rect = container.getBoundingClientRect();
                dimsRef.current = { width: rect.width, height: rect.height };
            }
        }

        drawOutputWaveform(canvas, outputData, mipmapLevels);
    }, [canvasRef, outputData, mipmapLevels, drawOutputWaveform]);

    return { dimsRef };
};

export default useOutputWaveformDrawer;
