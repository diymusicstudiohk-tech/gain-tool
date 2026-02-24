import { useState, useRef, useCallback, useEffect } from 'react';

// Display compression (must match Waveform.jsx)
const DISPLAY_EXP = 0.43;
const displayAmp = (lin) => lin > 0 ? Math.pow(lin, DISPLAY_EXP) : 0;
const linearFromDisplay = (disp) => disp > 0 ? Math.pow(disp, 1 / DISPLAY_EXP) : 0;

// Extract clientX/clientY from mouse or touch events
const getEventCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
        return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
};

const useWaveformInteraction = ({
    waveformCanvasRef, containerRef, originalBuffer,
    threshold, gateThreshold, setThreshold, setGateThreshold,
    zoomY, panOffsetY,
    setIsCustomSettings, setIsProcessing,
    setHasThresholdBeenAdjusted, setHasGateBeenAdjusted,
    isCompBypass, setIsCompBypass, isGateBypass, setIsGateBypass,
    lastPlayedType, handleModeChange,
    isDraggingKnobRef,
    // Seek-related refs
    startOffsetRef, playingTypeRef, playBufferRef,
    playheadRef, outputPlayheadRef,
    zoomX, panOffset,
}) => {
    const [hoverLine, setHoverLine] = useState(null);
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const [isKnobDragging, setIsKnobDragging] = useState(false);
    const [isGainKnobDragging, setIsGainKnobDragging] = useState(false);
    const [isCompAdjusting, setIsCompAdjusting] = useState(false);
    const [isGateAdjusting, setIsGateAdjusting] = useState(false);

    const isDraggingLineRef = useRef(null);
    const isDraggingRef = useRef(false);
    const hoverGrRef = useRef(0);
    // Holds the latest touchstart handler so the passive:false DOM listener
    // always calls the current closure without re-registering.
    const touchStartHandlerRef = useRef(null);

    const onWaveformGlobalMove = useCallback((e) => {
        // Prevent scroll/zoom when dragging on touch devices
        if (e.type === 'touchmove') e.preventDefault();

        const { clientX, clientY } = getEventCoords(e);

        if (isDraggingLineRef.current) {
            if (!waveformCanvasRef.current) return;
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const relY = clientY - rect.top;
            const height = rect.height;
            const PADDING = 0;
            const maxH = (height / 2) - PADDING;
            const ampScale = maxH * zoomY;
            const centerY = (height / 2) + panOffsetY;
            const distFromCenter = Math.abs(relY - centerY);
            const displayVal = distFromCenter / ampScale;
            const linearAmp = linearFromDisplay(Math.min(displayVal, 1));
            let newDb = linearAmp > 0.000001 ? 20 * Math.log10(linearAmp) : -100;
            if (newDb > 0) newDb = 0;

            if (isDraggingLineRef.current === 'comp') {
                if (newDb < -60) newDb = -60;
                setThreshold(Math.round(newDb));
                setHasThresholdBeenAdjusted(true);
                setIsCompAdjusting(true);
            } else if (isDraggingLineRef.current === 'gate') {
                if (newDb < -80) newDb = -80;
                setGateThreshold(Math.round(newDb));
                setHasGateBeenAdjusted(true);
                setIsGateAdjusting(true);
            }
            setIsCustomSettings(true); setIsProcessing(true);
            if (lastPlayedType === 'original') handleModeChange('processed');
            return;
        }
    }, [zoomY, panOffsetY, lastPlayedType,
        setThreshold, setGateThreshold, setHasThresholdBeenAdjusted, setHasGateBeenAdjusted,
        setIsCustomSettings, setIsProcessing, handleModeChange,
        waveformCanvasRef]);

    const onWaveformGlobalUp = useCallback((e) => {
        window.removeEventListener('mousemove', onWaveformGlobalMove);
        window.removeEventListener('mouseup', onWaveformGlobalUp);
        window.removeEventListener('touchmove', onWaveformGlobalMove);
        window.removeEventListener('touchend', onWaveformGlobalUp);

        if (isDraggingLineRef.current) {
            isDraggingLineRef.current = null;
            setIsCompAdjusting(false);
            setIsGateAdjusting(false);
            setHoverLine(null);
            document.body.style.cursor = 'default';
            return;
        }
    }, [onWaveformGlobalMove]);

    const handleSeekOnWaveform = useCallback((clientX) => {
        if (!waveformCanvasRef.current || !originalBuffer) return;
        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relX = clientX - rect.left;
        const width = rect.width;
        // Convert screen X to audio ratio accounting for zoom & pan
        const vX = relX - panOffset;
        let ratio = vX / (width * zoomX);
        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;
        const seekTime = ratio * originalBuffer.duration;
        startOffsetRef.current = seekTime;

        const currentPlayingType = playingTypeRef.current;
        if (currentPlayingType !== 'none') {
            playBufferRef.current?.(originalBuffer, currentPlayingType, seekTime);
        } else {
            // Update both playheads visually
            if (playheadRef?.current) {
                const totalWidth = width * zoomX;
                const screenPct = (((ratio * totalWidth) + panOffset) / width) * 100;
                playheadRef.current.style.left = `${screenPct}%`;
                playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
            }
            if (outputPlayheadRef?.current) {
                outputPlayheadRef.current.style.left = `${ratio * 100}%`;
                outputPlayheadRef.current.style.opacity = 1;
            }
        }
    }, [originalBuffer, waveformCanvasRef, zoomX, panOffset,
        startOffsetRef, playingTypeRef, playBufferRef, playheadRef, outputPlayheadRef]);

    const handleWaveformMouseDown = useCallback((e) => {
        if (isDraggingKnobRef.current || !originalBuffer) return;

        if (hoverLine) {
            if (hoverLine === 'comp' && isCompBypass) {
                setIsCompBypass(false);
                setIsCustomSettings(true);
                if (lastPlayedType !== 'processed') handleModeChange('processed');
            }
            if (hoverLine === 'gate' && isGateBypass) {
                setIsGateBypass(false);
                setIsCustomSettings(true);
                if (lastPlayedType !== 'processed') handleModeChange('processed');
            }

            isDraggingLineRef.current = hoverLine;
            document.body.style.cursor = 'row-resize';

            window.addEventListener('mousemove', onWaveformGlobalMove);
            window.addEventListener('mouseup', onWaveformGlobalUp);
        } else {
            // Seek — click on empty space to move playhead
            handleSeekOnWaveform(e.clientX);
        }
    }, [originalBuffer, hoverLine, isCompBypass, isGateBypass, lastPlayedType,
        setIsCompBypass, setIsGateBypass, setIsCustomSettings, handleModeChange,
        onWaveformGlobalMove, onWaveformGlobalUp, isDraggingKnobRef, handleSeekOnWaveform]);

    // Touch equivalent of handleWaveformMouseDown.
    // Registered via useEffect with passive:false so e.preventDefault() works
    // (React synthetic onTouchStart is passive and cannot prevent scroll/zoom).
    const handleWaveformTouchStart = useCallback((e) => {
        if (isDraggingKnobRef.current || !originalBuffer) return;
        // Ignore multi-touch gestures (pinch etc.) — only handle single finger
        if (e.touches.length > 1) return;
        e.preventDefault(); // prevent scroll / pinch-zoom during waveform interaction

        const { clientX, clientY } = getEventCoords(e);

        // Detect threshold lines — use a larger hit tolerance than mouse (20px vs 8px)
        let touchHoverLine = null;
        if (waveformCanvasRef.current) {
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const relY = clientY - rect.top;
            const height = rect.height;
            const PADDING = 0;
            const maxH = (height / 2) - PADDING;
            const ampScale = maxH * zoomY;
            const centerY = (height / 2) + panOffsetY;
            const HIT_TOLERANCE = 20;

            const compThreshPx = displayAmp(Math.pow(10, threshold / 20)) * ampScale;
            const gateThreshPx = displayAmp(Math.pow(10, gateThreshold / 20)) * ampScale;

            const distToCompTop = Math.abs(relY - (centerY - compThreshPx));
            const distToCompBot = Math.abs(relY - (centerY + compThreshPx));
            const distToGateTop = Math.abs(relY - (centerY - gateThreshPx));
            const distToGateBot = Math.abs(relY - (centerY + gateThreshPx));

            if (distToGateTop < HIT_TOLERANCE || distToGateBot < HIT_TOLERANCE) touchHoverLine = 'gate';
            if (distToCompTop < HIT_TOLERANCE || distToCompBot < HIT_TOLERANCE) touchHoverLine = 'comp';
        }

        if (touchHoverLine) {
            if (touchHoverLine === 'comp' && isCompBypass) {
                setIsCompBypass(false);
                setIsCustomSettings(true);
                if (lastPlayedType !== 'processed') handleModeChange('processed');
            }
            if (touchHoverLine === 'gate' && isGateBypass) {
                setIsGateBypass(false);
                setIsCustomSettings(true);
                if (lastPlayedType !== 'processed') handleModeChange('processed');
            }
            isDraggingLineRef.current = touchHoverLine;
            setHoverLine(touchHoverLine);

            window.addEventListener('touchmove', onWaveformGlobalMove, { passive: false });
            window.addEventListener('touchend', onWaveformGlobalUp);
        } else {
            // Seek — tap on empty space to move playhead
            handleSeekOnWaveform(clientX);
        }
    }, [originalBuffer, isDraggingKnobRef, waveformCanvasRef, zoomY, panOffsetY,
        threshold, gateThreshold,
        isCompBypass, isGateBypass, lastPlayedType,
        setIsCompBypass, setIsGateBypass, setIsCustomSettings, handleModeChange,
        onWaveformGlobalMove, onWaveformGlobalUp, handleSeekOnWaveform]);

    // Keep ref pointing to the latest handler so the DOM listener (registered once)
    // always invokes the current closure.
    touchStartHandlerRef.current = handleWaveformTouchStart;

    // Register touchstart directly on the container with passive:false.
    // React's synthetic onTouchStart cannot call preventDefault() on iOS/iPadOS.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e) => touchStartHandlerRef.current?.(e);
        el.addEventListener('touchstart', handler, { passive: false });
        return () => el.removeEventListener('touchstart', handler);
    }, [containerRef]); // only re-register if the container element changes

    const handleLocalMouseMove = useCallback((e) => {
        if (isDraggingRef.current || isDraggingLineRef.current) return;
        if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;

        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const height = rect.height;
        const PADDING = 0;
        const maxH = (height / 2) - PADDING;
        const ampScale = maxH * zoomY;
        const centerY = (height / 2) + panOffsetY;

        setMousePos({ x: relX, y: relY });

        const HIT_TOLERANCE = 8;
        const compThreshPx = displayAmp(Math.pow(10, threshold / 20)) * ampScale;
        const gateThreshPx = displayAmp(Math.pow(10, gateThreshold / 20)) * ampScale;

        const distToCompTop = Math.abs(relY - (centerY - compThreshPx));
        const distToCompBot = Math.abs(relY - (centerY + compThreshPx));
        const distToGateTop = Math.abs(relY - (centerY - gateThreshPx));
        const distToGateBot = Math.abs(relY - (centerY + gateThreshPx));

        let newHoverLine = null;
        let cursor = 'crosshair';
        if (distToGateTop < HIT_TOLERANCE || distToGateBot < HIT_TOLERANCE) { newHoverLine = 'gate'; cursor = 'row-resize'; }
        if (distToCompTop < HIT_TOLERANCE || distToCompBot < HIT_TOLERANCE) { newHoverLine = 'comp'; cursor = 'row-resize'; }

        setHoverLine(newHoverLine);
        if (containerRef.current) containerRef.current.style.cursor = cursor;
    }, [threshold, gateThreshold, zoomY, panOffsetY,
        isDraggingKnobRef, waveformCanvasRef, containerRef]);

    return {
        hoverLine, mousePos,
        isKnobDragging, setIsKnobDragging,
        isGainKnobDragging, setIsGainKnobDragging,
        isCompAdjusting, setIsCompAdjusting,
        isGateAdjusting, setIsGateAdjusting,
        isDraggingLineRef, isDraggingRef, hoverGrRef,
        handleWaveformMouseDown, handleLocalMouseMove,
    };
};

export default useWaveformInteraction;
