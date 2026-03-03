import { useState, useRef, useCallback, useEffect } from 'react';
import { getMarkerHitZone } from '../utils/canvasMarkers';

const useWaveformInteraction = ({
    waveformCanvasRef, containerRef, originalBuffer,
    isDraggingKnobRef,
    startOffsetRef, playingTypeRef, playBufferRef,
    playheadRef, outputPlayheadRef,
    zoomX, panOffset,
    isPlayingRef,
    markersRef, addMarker, removeMarker, updateMarkerEdge,
}) => {
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const mousePosRef = useRef({ x: -1, y: -1 });
    const [isKnobDragging, setIsKnobDragging] = useState(false);

    const isDraggingRef = useRef(false);
    const touchStartHandlerRef = useRef(null);

    // Marker interaction refs
    const draggingMarkerRef = useRef(null); // { id, edge: 'left'|'right', startClientX, startFrac }
    const hoveredMarkerInfoRef = useRef(null); // { markerId, zone }

    const handleSeekOnWaveform = useCallback((clientX) => {
        if (!waveformCanvasRef.current || !originalBuffer) return;
        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relX = clientX - rect.left;
        const width = rect.width;
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

        const rect = waveformCanvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const width = rect.width;

        // Check marker hit zones
        const markers = markersRef?.current;
        if (markers && markers.length > 0) {
            const hit = getMarkerHitZone(relX, relY, markers, zoomX, panOffset, width);
            if (hit) {
                if (hit.zone === 'delete') {
                    removeMarker?.(hit.markerId);
                    return;
                }
                if (hit.zone === 'left' || hit.zone === 'right') {
                    // Start edge drag
                    const marker = markers.find(m => m.id === hit.markerId);
                    if (marker) {
                        draggingMarkerRef.current = {
                            id: hit.markerId,
                            edge: hit.zone,
                            startClientX: e.clientX,
                            startFrac: hit.zone === 'left' ? marker.startFrac : marker.endFrac,
                        };
                    }
                    return;
                }
                if (hit.zone === 'body') {
                    // Inside existing marker — do nothing (no seek, no new marker)
                    return;
                }
            }
        }

        // Empty space — try to add marker, then seek
        if (addMarker) {
            const vX = relX - panOffset;
            const clickFrac = vX / (width * zoomX);
            if (clickFrac >= 0 && clickFrac <= 1) {
                addMarker(clickFrac, zoomX, width);
            }
        }
        handleSeekOnWaveform(e.clientX);
    }, [originalBuffer, isDraggingKnobRef, waveformCanvasRef, zoomX, panOffset,
        markersRef, addMarker, removeMarker, handleSeekOnWaveform]);

    const handleWaveformTouchStart = useCallback((e) => {
        if (isDraggingKnobRef.current || !originalBuffer) return;
        if (e.touches.length > 1) return;
        e.preventDefault();

        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;

        if (waveformCanvasRef.current) {
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            setMousePos({ x: clientX - rect.left, y: clientY - rect.top });
        }

        handleSeekOnWaveform(clientX);
    }, [originalBuffer, isDraggingKnobRef, waveformCanvasRef, handleSeekOnWaveform]);

    touchStartHandlerRef.current = handleWaveformTouchStart;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e) => touchStartHandlerRef.current?.(e);
        el.addEventListener('touchstart', handler, { passive: false });
        return () => el.removeEventListener('touchstart', handler);
    }, [containerRef]);

    const handleLocalMouseMove = useCallback((e) => {
        if (isDraggingRef.current) return;
        if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;

        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        mousePosRef.current = { x: relX, y: relY };
        if (!isPlayingRef.current) {
            setMousePos({ x: relX, y: relY });
        }

        // During marker edge drag, just keep mousePos updated (redraw handled by window listener)
        if (draggingMarkerRef.current) return;

        // Marker hit detection for cursor
        const markers = markersRef?.current;
        if (markers && markers.length > 0) {
            const width = rect.width;
            const hit = getMarkerHitZone(relX, relY, markers, zoomX, panOffset, width);
            hoveredMarkerInfoRef.current = hit;
            if (hit) {
                if (containerRef.current) {
                    if (hit.zone === 'left' || hit.zone === 'right') {
                        containerRef.current.style.cursor = 'ew-resize';
                    } else if (hit.zone === 'delete') {
                        containerRef.current.style.cursor = 'pointer';
                    } else {
                        containerRef.current.style.cursor = 'default';
                    }
                }
                return;
            }
        } else {
            hoveredMarkerInfoRef.current = null;
        }

        if (containerRef.current) containerRef.current.style.cursor = 'crosshair';
    }, [isDraggingKnobRef, waveformCanvasRef, containerRef, isPlayingRef, markersRef, zoomX, panOffset]);

    const handleMouseLeave = useCallback(() => {
        mousePosRef.current = { x: -1, y: -1 };
        setMousePos({ x: -1, y: -1 });
        hoveredMarkerInfoRef.current = null;
        if (containerRef.current) containerRef.current.style.cursor = 'crosshair';
    }, [containerRef]);

    // Window-level mousemove/mouseup for edge dragging
    useEffect(() => {
        const handleWindowMouseMove = (e) => {
            const drag = draggingMarkerRef.current;
            if (!drag) return;
            if (!waveformCanvasRef.current) return;

            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const width = rect.width;
            const totalPx = width * zoomX;
            if (totalPx <= 0) return;

            // Keep mouse position updated so visualizer redraws during drag
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            mousePosRef.current = { x: relX, y: relY };
            if (!isPlayingRef.current) {
                setMousePos({ x: relX, y: relY });
            }

            const dx = e.clientX - drag.startClientX;
            const fracDelta = dx / totalPx;
            const newFrac = drag.startFrac + fracDelta;

            updateMarkerEdge?.(drag.id, drag.edge, newFrac, zoomX, width);
        };

        const handleWindowMouseUp = () => {
            draggingMarkerRef.current = null;
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [waveformCanvasRef, zoomX, updateMarkerEdge, isPlayingRef]);

    return {
        mousePos, mousePosRef,
        isKnobDragging, setIsKnobDragging,
        isDraggingRef,
        hoveredMarkerInfoRef,
        draggingMarkerRef,
        handleWaveformMouseDown, handleLocalMouseMove, handleMouseLeave,
    };
};

export default useWaveformInteraction;
