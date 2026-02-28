import { useState, useRef, useEffect } from 'react';

/**
 * Hook for managing visualization state and canvas dimensions
 * @param {Ref} containerRef - Reference to container element
 * @returns {Object} Visualization state and canvas refs
 */
export const useVisualization = (containerRef) => {
    const [canvasDims, setCanvasDims] = useState({ width: 1000, height: 400 });
    const [zoomX, setZoomX] = useState(1);
    const [zoomY, setZoomY] = useState(0.8);
    const [panOffset, setPanOffset] = useState(0);
    const [panOffsetY, setPanOffsetY] = useState(0);
    const [cuePoint, setCuePoint] = useState(0);
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const [hoverLine, setHoverLine] = useState(null);
    const [isCompAdjusting, setIsCompAdjusting] = useState(false);
    const [isGateAdjusting, setIsGateAdjusting] = useState(false);
    const [isKnobDragging, setIsKnobDragging] = useState(false);

    const waveformCanvasRef = useRef(null);
    const grBarCanvasRef = useRef(null);
    const outputMeterCanvasRef = useRef(null);
    const cfMeterCanvasRef = useRef(null);
    const playheadRef = useRef(null);

    const isDraggingKnobRef = useRef(false);
    const hoverGrRef = useRef(0);
    const isDraggingLineRef = useRef(null);
    const isCreatingLoopRef = useRef(false);
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);

    const meterStateRef = useRef({
        peakLevel: 0, holdPeakLevel: 0, holdTimer: 0,
        dryPeakLevel: 0, dryHoldPeakLevel: 0, dryHoldTimer: 0,
        grPeakLevel: 0, grHoldPeakLevel: 0, grHoldTimer: 0,
        dryRmsLevel: 0, outRmsLevel: 0,
        dynamicRange: 0
    });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setCanvasDims({ width: Math.floor(width), height: Math.floor(height) });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [containerRef]);

    return {
        canvasDims,
        zoomX, setZoomX,
        zoomY, setZoomY,
        panOffset, setPanOffset,
        panOffsetY, setPanOffsetY,
        cuePoint, setCuePoint,
        mousePos, setMousePos,
        hoverLine, setHoverLine,
        isCompAdjusting, setIsCompAdjusting,
        isGateAdjusting, setIsGateAdjusting,
        isKnobDragging, setIsKnobDragging,
        waveformCanvasRef,
        grBarCanvasRef,
        outputMeterCanvasRef,
        cfMeterCanvasRef,
        playheadRef,
        isDraggingKnobRef,
        hoverGrRef,
        isDraggingLineRef,
        isCreatingLoopRef,
        isDraggingRef,
        dragStartXRef,
        meterStateRef
    };
};
