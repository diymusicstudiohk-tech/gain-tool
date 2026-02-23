import { useState, useRef, useCallback, useEffect } from 'react';

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
    zoomX, zoomY, panOffset, panOffsetY, signalFlowMode,
    playingTypeRef, lastPlayedTypeRef, playBufferRef, playheadRef,
    startOffsetRef, isPlayingRef,
    setLoopStart, setLoopEnd, setZoomX, setPanOffset,
    setIsCustomSettings, setIsProcessing,
    setHasThresholdBeenAdjusted, setHasGateBeenAdjusted,
    isCompBypass, setIsCompBypass, isGateBypass, setIsGateBypass,
    lastPlayedType, handleModeChange,
    isDraggingKnobRef,
}) => {
    const [hoverLine, setHoverLine] = useState(null);
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const [isKnobDragging, setIsKnobDragging] = useState(false);
    const [isCompAdjusting, setIsCompAdjusting] = useState(false);
    const [isGateAdjusting, setIsGateAdjusting] = useState(false);

    const isDraggingLineRef = useRef(null);
    const isCreatingLoopRef = useRef(false);
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
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
            const PADDING = 24;
            const maxH = (height / 2) - PADDING;
            const ampScale = maxH * zoomY;
            const centerY = (height / 2) + panOffsetY;
            const distFromCenter = Math.abs(relY - centerY);
            const linearAmp = distFromCenter / ampScale;
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
        if (isCreatingLoopRef.current && waveformCanvasRef.current && originalBuffer) {
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            if (Math.abs(clientX - dragStartXRef.current) > 5) {
                document.body.style.cursor = 'col-resize';
                const totalWidth = rect.width * zoomX;
                const pixelToTime = (px) => {
                    const relX = px - panOffset;
                    let pct = relX / totalWidth;
                    if (pct < 0) pct = 0; if (pct > 1) pct = 1;
                    return pct * originalBuffer.duration;
                };
                const t1 = pixelToTime(dragStartXRef.current - rect.left);
                const t2 = pixelToTime(clientX - rect.left);
                setLoopStart(Math.min(t1, t2));
                setLoopEnd(Math.max(t1, t2));
            }
        }
    }, [zoomY, panOffsetY, lastPlayedType, originalBuffer, panOffset, zoomX,
        setThreshold, setGateThreshold, setHasThresholdBeenAdjusted, setHasGateBeenAdjusted,
        setIsCustomSettings, setIsProcessing, setLoopStart, setLoopEnd, handleModeChange,
        waveformCanvasRef]);

    const onWaveformGlobalUp = useCallback((e) => {
        window.removeEventListener('mousemove', onWaveformGlobalMove);
        window.removeEventListener('mouseup', onWaveformGlobalUp);
        window.removeEventListener('touchmove', onWaveformGlobalMove);
        window.removeEventListener('touchend', onWaveformGlobalUp);

        const { clientX } = getEventCoords(e);

        if (isDraggingLineRef.current) {
            isDraggingLineRef.current = null;
            setIsCompAdjusting(false);
            setIsGateAdjusting(false);
            setHoverLine(null);
            document.body.style.cursor = 'default';
            return;
        }
        if (isCreatingLoopRef.current) {
            isCreatingLoopRef.current = false;
            document.body.style.cursor = 'default';
            const dragDist = Math.abs(clientX - dragStartXRef.current);
            if (dragDist < 5 && waveformCanvasRef.current && originalBuffer) {
                // Tap / click — seek
                const rect = waveformCanvasRef.current.getBoundingClientRect();
                const clickX = clientX - rect.left;
                const totalWidth = rect.width * zoomX;
                const relX = clickX - panOffset;
                let pct = relX / totalWidth;
                if (pct < 0) pct = 0; if (pct > 1) pct = 1;
                const seekTime = pct * originalBuffer.duration;
                startOffsetRef.current = seekTime;

                const currentPlayingType = playingTypeRef.current;
                if (currentPlayingType !== 'none') {
                    playBufferRef.current?.(originalBuffer, currentPlayingType, seekTime);
                } else {
                    if (playheadRef.current && waveformCanvasRef.current) {
                        const width = waveformCanvasRef.current.clientWidth;
                        const tw = width * zoomX;
                        const p = seekTime / originalBuffer.duration;
                        const screenPct = (((p * tw) + panOffset) / width) * 100;
                        playheadRef.current.style.left = `${screenPct}%`;
                        playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
                    }
                }
            } else if (waveformCanvasRef.current && originalBuffer) {
                // Drag finished — Auto Zoom
                const rect = waveformCanvasRef.current.getBoundingClientRect();
                const totalWidth = rect.width * zoomX;
                const pixelToTime = (px) => {
                    const relX = px - panOffset;
                    let pct = relX / totalWidth;
                    if (pct < 0) pct = 0; if (pct > 1) pct = 1;
                    return pct * originalBuffer.duration;
                };
                const t1 = pixelToTime(dragStartXRef.current - rect.left);
                const t2 = pixelToTime(clientX - rect.left);
                const loopDur = Math.abs(t2 - t1);

                if (loopDur > 0.01) {
                    const totalDur = originalBuffer.duration;
                    let newZoom = (totalDur * 0.8) / loopDur;
                    if (newZoom < 1) newZoom = 1;
                    if (newZoom > 50) newZoom = 50;

                    const width = rect.width;
                    const newTotalWidth = width * newZoom;
                    const loopMidTime = (t1 + t2) / 2;
                    const loopMidPx = (loopMidTime / totalDur) * newTotalWidth;

                    let newPan = (width / 2) - loopMidPx;
                    const minPan = width - newTotalWidth;
                    if (newPan > 0) newPan = 0;
                    if (newPan < minPan) newPan = minPan;

                    setZoomX(newZoom);
                    setPanOffset(newPan);

                    const loopStartTime = Math.min(t1, t2);
                    startOffsetRef.current = loopStartTime;
                    const typeToPlay = lastPlayedTypeRef.current;

                    if (originalBuffer) {
                        playBufferRef.current?.(originalBuffer, typeToPlay, loopStartTime);
                    } else if (playheadRef.current && waveformCanvasRef.current) {
                        const pct = loopStartTime / originalBuffer.duration;
                        const screenPct = (((pct * newTotalWidth) + newPan) / width) * 100;
                        playheadRef.current.style.left = `${screenPct}%`;
                        playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
                    }
                }
            }
        }
    }, [originalBuffer, onWaveformGlobalMove, panOffset, zoomX,
        startOffsetRef, playingTypeRef, lastPlayedTypeRef, playBufferRef, playheadRef,
        setZoomX, setPanOffset, waveformCanvasRef]);

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
        } else {
            isCreatingLoopRef.current = true;
            dragStartXRef.current = e.clientX;
        }

        window.addEventListener('mousemove', onWaveformGlobalMove);
        window.addEventListener('mouseup', onWaveformGlobalUp);
    }, [originalBuffer, hoverLine, isCompBypass, isGateBypass, lastPlayedType,
        setIsCompBypass, setIsGateBypass, setIsCustomSettings, handleModeChange,
        onWaveformGlobalMove, onWaveformGlobalUp, isDraggingKnobRef]);

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
        if (waveformCanvasRef.current && signalFlowMode !== 'clip') {
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const relY = clientY - rect.top;
            const height = rect.height;
            const PADDING = 24;
            const maxH = (height / 2) - PADDING;
            const ampScale = maxH * zoomY;
            const centerY = (height / 2) + panOffsetY;
            const HIT_TOLERANCE = 20;

            const compThreshPx = Math.pow(10, threshold / 20) * ampScale;
            const gateThreshPx = Math.pow(10, gateThreshold / 20) * ampScale;

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
        } else {
            isCreatingLoopRef.current = true;
            dragStartXRef.current = clientX;
        }

        window.addEventListener('touchmove', onWaveformGlobalMove, { passive: false });
        window.addEventListener('touchend', onWaveformGlobalUp);
    }, [originalBuffer, isDraggingKnobRef, waveformCanvasRef, zoomY, panOffsetY,
        threshold, gateThreshold, signalFlowMode,
        isCompBypass, isGateBypass, lastPlayedType,
        setIsCompBypass, setIsGateBypass, setIsCustomSettings, handleModeChange,
        onWaveformGlobalMove, onWaveformGlobalUp]);

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
        if (isDraggingRef.current || isDraggingLineRef.current || isCreatingLoopRef.current) return;
        if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;

        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const height = rect.height;
        const PADDING = 24;
        const maxH = (height / 2) - PADDING;
        const ampScale = maxH * zoomY;
        const centerY = (height / 2) + panOffsetY;

        setMousePos({ x: relX, y: relY });

        const HIT_TOLERANCE = 8;
        const compThreshPx = Math.pow(10, threshold / 20) * ampScale;
        const gateThreshPx = Math.pow(10, gateThreshold / 20) * ampScale;

        const distToCompTop = Math.abs(relY - (centerY - compThreshPx));
        const distToCompBot = Math.abs(relY - (centerY + compThreshPx));
        const distToGateTop = Math.abs(relY - (centerY - gateThreshPx));
        const distToGateBot = Math.abs(relY - (centerY + gateThreshPx));

        let newHoverLine = null;
        let cursor = 'crosshair';
        if (signalFlowMode !== 'clip') {
            if (distToGateTop < HIT_TOLERANCE || distToGateBot < HIT_TOLERANCE) { newHoverLine = 'gate'; cursor = 'row-resize'; }
            if (distToCompTop < HIT_TOLERANCE || distToCompBot < HIT_TOLERANCE) { newHoverLine = 'comp'; cursor = 'row-resize'; }
        }

        setHoverLine(newHoverLine);
        if (containerRef.current) containerRef.current.style.cursor = cursor;
    }, [threshold, gateThreshold, zoomY, panOffsetY, signalFlowMode,
        isDraggingKnobRef, waveformCanvasRef, containerRef]);

    return {
        hoverLine, mousePos,
        isKnobDragging, setIsKnobDragging,
        isCompAdjusting, setIsCompAdjusting,
        isGateAdjusting, setIsGateAdjusting,
        isDraggingLineRef, isDraggingRef, hoverGrRef,
        handleWaveformMouseDown, handleLocalMouseMove,
    };
};

export default useWaveformInteraction;
