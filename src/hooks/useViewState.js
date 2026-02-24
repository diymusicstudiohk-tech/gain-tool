import { useState, useEffect, useCallback } from 'react';
import { PRESETS_DATA, TOOLTIPS } from '../utils/constants';
import { loadAppStateFromStorage } from '../utils/storage';

const useViewState = ({ containerRef }) => {
    const [zoomX, setZoomX] = useState(1);
    const [zoomY, setZoomY] = useState(1);
    const [panOffset, setPanOffset] = useState(0);
    const [panOffsetY, setPanOffsetY] = useState(0);
    const [cuePoint, setCuePoint] = useState(0);
    const [canvasDims, setCanvasDims] = useState({ width: 1000, height: 400 });
    // Info panel
    const [hoveredKnob, setHoveredKnob] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [isInfoPanelEnabled, setIsInfoPanelEnabled] = useState(false);
    const [hoveredKnobPos, setHoveredKnobPos] = useState({ x: 0, y: 0 });

    // Load from localStorage on mount
    useEffect(() => {
        const savedState = loadAppStateFromStorage();
        if (savedState) {
            if (savedState.isInfoPanelEnabled !== undefined) setIsInfoPanelEnabled(savedState.isInfoPanelEnabled);
        }
    }, []);

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

    const getInfoPanelContent = useCallback((hoveredKnob, isCustomSettings, selectedPresetIdx) => {
        if (hoveredKnob && TOOLTIPS[hoveredKnob]) return {
            title: TOOLTIPS[hoveredKnob].title,
            content: TOOLTIPS[hoveredKnob]
        };
        if (!isCustomSettings && selectedPresetIdx !== 0 && PRESETS_DATA[selectedPresetIdx]) return {
            title: `設定思路: ${PRESETS_DATA[selectedPresetIdx].name.split('(')[0]}`,
            content: PRESETS_DATA[selectedPresetIdx].explanation,
            isPreset: true
        };
        return null;
    }, []);

    return {
        zoomX, setZoomX,
        zoomY, setZoomY,
        panOffset, setPanOffset,
        panOffsetY, setPanOffsetY,
        cuePoint, setCuePoint,
        canvasDims, setCanvasDims,
        hoveredKnob, setHoveredKnob,
        showInfoPanel, setShowInfoPanel,
        isInfoPanelEnabled, setIsInfoPanelEnabled,
        hoveredKnobPos, setHoveredKnobPos,
        resetView,
        getInfoPanelContent,
    };
};

export default useViewState;
