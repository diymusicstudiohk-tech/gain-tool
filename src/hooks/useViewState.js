import { useState, useEffect, useCallback } from 'react';

const useViewState = ({ containerRef }) => {
    const [zoomX, setZoomX] = useState(1);
    const [zoomY, setZoomY] = useState(1);
    const [panOffset, setPanOffset] = useState(0);
    const [panOffsetY, setPanOffsetY] = useState(0);
    const [cuePoint, setCuePoint] = useState(0);
    const [canvasDims, setCanvasDims] = useState({ width: 1000, height: 400 });
    // Info panel
    const [hoveredKnob, setHoveredKnob] = useState(null);

    // ResizeObserver
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

    const resetView = useCallback(() => {
        setPanOffsetY(0); setZoomY(1); setPanOffset(0); setZoomX(1);
    }, []);

    return {
        zoomX, setZoomX,
        zoomY, setZoomY,
        panOffset, setPanOffset,
        panOffsetY, setPanOffsetY,
        cuePoint, setCuePoint,
        canvasDims, setCanvasDims,
        hoveredKnob, setHoveredKnob,
        resetView,
    };
};

export default useViewState;
