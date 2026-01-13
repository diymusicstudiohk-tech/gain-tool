import { useCallback, useRef } from 'react';

/**
 * Hook for managing canvas mouse interactions
 * Handles waveform clicking, dragging, loop creation, and threshold adjustment
 * @param {Object} options - Configuration options
 * @returns {Object} Event handlers and state
 */
export const useCanvasInteraction = ({
    waveformCanvasRef,
    originalBuffer,
    isDraggingKnobRef,
    isDraggingLineRef,
    isCreatingLoopRef,
    hoverLine,
    zoomX,
    zoomY,
    panOffset,
    panOffsetY,
    threshold,
    gateThreshold,
    isCompBypass,
    isGateBypass,
    lastPlayedType,
    signalFlowMode,
    setThreshold,
    setGateThreshold,
    setIsCompBypass,
    setIsGateBypass,
    setIsCompAdjusting,
    setIsGateAdjusting,
    setHasThresholdBeenAdjusted,
    setHasGateBeenAdjusted,
    setIsCustomSettings,
    setIsProcessing,
    setLoopStart,
    setLoopEnd,
    setZoomX,
    setPanOffset,
    startOffsetRef,
    playingTypeRef,
    lastPlayedTypeRef,
    playBufferRef,
    playheadRef,
    handleModeChange
}) => {
    const dragStartXRef = useRef(0);

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
    }, [
        isDraggingKnobRef, originalBuffer, hoverLine, isCompBypass, isGateBypass,
        lastPlayedType, setIsCompBypass, setIsGateBypass, setIsCustomSettings,
        handleModeChange, isDraggingLineRef, isCreatingLoopRef
    ]);

    const onWaveformGlobalMove = useCallback((e) => {
        if (isDraggingLineRef.current) {
            if (!waveformCanvasRef.current) return;
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const relY = e.clientY - rect.top;
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
            setIsCustomSettings(true);
            setIsProcessing(true);
            if (lastPlayedType === 'original') handleModeChange('processed');
            return;
        }

        if (isCreatingLoopRef.current && waveformCanvasRef.current && originalBuffer) {
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            if (Math.abs(e.clientX - dragStartXRef.current) > 5) {
                document.body.style.cursor = 'col-resize';
                const totalWidth = rect.width * zoomX;
                const pixelToTime = (px) => {
                    const relX = px - panOffset;
                    let pct = relX / totalWidth;
                    if (pct < 0) pct = 0;
                    if (pct > 1) pct = 1;
                    return pct * originalBuffer.duration;
                };
                const t1 = pixelToTime(dragStartXRef.current - rect.left);
                const t2 = pixelToTime(e.clientX - rect.left);
                setLoopStart(Math.min(t1, t2));
                setLoopEnd(Math.max(t1, t2));
            }
        }
    }, [
        isDraggingLineRef, waveformCanvasRef, zoomY, panOffsetY, isCreatingLoopRef,
        originalBuffer, zoomX, panOffset, setThreshold, setGateThreshold,
        setHasThresholdBeenAdjusted, setHasGateBeenAdjusted, setIsCompAdjusting,
        setIsGateAdjusting, setIsCustomSettings, setIsProcessing, lastPlayedType,
        handleModeChange, setLoopStart, setLoopEnd
    ]);

    const onWaveformGlobalUp = useCallback((e) => {
        window.removeEventListener('mousemove', onWaveformGlobalMove);
        window.removeEventListener('mouseup', onWaveformGlobalUp);

        if (isDraggingLineRef.current) {
            isDraggingLineRef.current = null;
            setIsCompAdjusting(false);
            setIsGateAdjusting(false);
            document.body.style.cursor = 'default';
            return;
        }

        if (isCreatingLoopRef.current) {
            isCreatingLoopRef.current = false;
            document.body.style.cursor = 'default';
            const dragDist = Math.abs(e.clientX - dragStartXRef.current);

            if (dragDist < 5 && waveformCanvasRef.current && originalBuffer) {
                const rect = waveformCanvasRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const totalWidth = rect.width * zoomX;
                const relX = clickX - panOffset;
                let pct = relX / totalWidth;
                if (pct < 0) pct = 0;
                if (pct > 1) pct = 1;
                const seekTime = pct * originalBuffer.duration;
                startOffsetRef.current = seekTime;

                const currentPlayingType = playingTypeRef.current;
                const currentLastPlayedType = lastPlayedTypeRef.current;

                if (currentPlayingType !== 'none') {
                    const targetBuffer = originalBuffer;
                    if (targetBuffer) playBufferRef.current(targetBuffer, currentPlayingType, seekTime);
                } else {
                    if (playheadRef.current && waveformCanvasRef.current) {
                        const width = waveformCanvasRef.current.width;
                        const totalWidth = width * zoomX;
                        const pct = seekTime / originalBuffer.duration;
                        const screenPct = (((pct * totalWidth) + panOffset) / width) * 100;
                        playheadRef.current.style.left = `${screenPct}%`;
                        playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
                    }
                }
            } else if (waveformCanvasRef.current && originalBuffer) {
                const rect = waveformCanvasRef.current.getBoundingClientRect();
                const totalWidth = rect.width * zoomX;
                const pixelToTime = (px) => {
                    const relX = px - panOffset;
                    let pct = relX / totalWidth;
                    if (pct < 0) pct = 0;
                    if (pct > 1) pct = 1;
                    return pct * originalBuffer.duration;
                };
                const t1 = pixelToTime(dragStartXRef.current - rect.left);
                const t2 = pixelToTime(e.clientX - rect.left);
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
                    const targetBuffer = originalBuffer;
                    const typeToPlay = lastPlayedTypeRef.current;

                    if (targetBuffer) {
                        playBufferRef.current(targetBuffer, typeToPlay, loopStartTime);
                    } else {
                        if (playheadRef.current && waveformCanvasRef.current) {
                            const pct = loopStartTime / originalBuffer.duration;
                            const screenPct = (((pct * newTotalWidth) + newPan) / width) * 100;
                            playheadRef.current.style.left = `${screenPct}%`;
                            playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
                        }
                    }
                }
            }
        }
    }, [
        onWaveformGlobalMove, isDraggingLineRef, setIsCompAdjusting, setIsGateAdjusting,
        isCreatingLoopRef, waveformCanvasRef, originalBuffer, zoomX, panOffset,
        startOffsetRef, playingTypeRef, lastPlayedTypeRef, playBufferRef, playheadRef,
        setZoomX, setPanOffset
    ]);

    const handleLocalMouseMove = useCallback((e) => {
        if (isDraggingLineRef.current || isCreatingLoopRef.current) return;
        if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;

        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const height = rect.height;
        const PADDING = 24;
        const maxH = (height / 2) - PADDING;
        const ampScale = maxH * zoomY;
        const centerY = (height / 2) + panOffsetY;

        const HIT_TOLERANCE = 8;
        const compThreshPx = Math.pow(10, threshold / 20) * ampScale;
        const gateThreshPx = Math.pow(10, gateThreshold / 20) * ampScale;

        const distToCompTop = Math.abs(relY - (centerY - compThreshPx));
        const distToCompBot = Math.abs(relY - (centerY + compThreshPx));
        const distToGateTop = Math.abs(relY - (centerY - gateThreshPx));
        const distToGateBot = Math.abs(relY - (centerY + gateThreshPx));

        let newHoverLine = null;
        if (signalFlowMode !== 'clip') {
            if (distToGateTop < HIT_TOLERANCE || distToGateBot < HIT_TOLERANCE) {
                newHoverLine = 'gate';
            }
            if (distToCompTop < HIT_TOLERANCE || distToCompBot < HIT_TOLERANCE) {
                newHoverLine = 'comp';
            }
        }

        return newHoverLine;
    }, [
        isDraggingLineRef, isCreatingLoopRef, isDraggingKnobRef, waveformCanvasRef,
        zoomY, panOffsetY, threshold, gateThreshold, signalFlowMode
    ]);

    return {
        handleWaveformMouseDown,
        handleLocalMouseMove,
        onWaveformGlobalMove,
        onWaveformGlobalUp
    };
};
