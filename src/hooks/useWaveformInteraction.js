import { useState, useRef, useCallback, useEffect } from 'react';
import { getMarkerHitZone, getSnapBetweenMarkers } from '../utils/canvasMarkers';
import { PEAK_LINE_HIT_ZONE, PEAK_LINE_HOVER_ZONE } from '../utils/canvasConstants';
import useWaveformSeek from './useWaveformSeek';
import useMarkerDrag from './useMarkerDrag';

const useWaveformInteraction = ({
    waveformCanvasRef, containerRef, originalBuffer,
    isDraggingKnobRef,
    startOffsetRef, playingTypeRef, playBufferRef,
    playheadRef, outputPlayheadRef,
    zoomX, panOffset,
    zoomY, panOffsetY, canvasDims,
    isPlayingRef,
    markersRef, addMarker, addMarkerWithBounds, removeMarker, updateMarkerEdge,
    updateMarkerPeakAmp, updateMarkerClipGain, resetMarkerGain, peakLinesRef,
}) => {
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const mousePosRef = useRef({ x: -1, y: -1 });
    const [isKnobDragging, setIsKnobDragging] = useState(false);

    const isDraggingRef = useRef(false);
    const touchStartHandlerRef = useRef(null);

    // Marker interaction refs
    const draggingMarkerRef = useRef(null); // { id, edge: 'left'|'right', startClientX, startFrac }
    const hoveredMarkerInfoRef = useRef(null); // { markerId, zone }

    const handleSeekOnWaveform = useWaveformSeek({
        originalBuffer, waveformCanvasRef,
        zoomX, panOffset,
        startOffsetRef, playingTypeRef, playBufferRef,
        playheadRef, outputPlayheadRef,
    });

    useMarkerDrag({
        draggingMarkerRef, mousePosRef, setMousePos,
        waveformCanvasRef, zoomX, zoomY, panOffsetY,
        updateMarkerEdge, updateMarkerPeakAmp, updateMarkerClipGain,
        isPlayingRef, peakLinesRef,
    });

    const handleWaveformMouseDown = useCallback((e) => {
        if (isDraggingKnobRef.current || !originalBuffer) return;

        const rect = waveformCanvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const width = rect.width;

        // Check peak line hit first (direct geometry check, not via hoveredMarkerInfoRef,
        // so peak lines always win over overlapping buttons)
        const hovered = hoveredMarkerInfoRef.current;
        if (hovered && hovered.zone === 'peakLine') {
            draggingMarkerRef.current = { id: hovered.markerId, type: 'peakLine' };
            return;
        }
        const peakLines = peakLinesRef?.current;
        if (peakLines) {
            for (const markerId of Object.keys(peakLines)) {
                const pl = peakLines[markerId];
                if (relX >= pl.px1 && relX <= pl.px2) {
                    if (Math.abs(relY - pl.yTop) <= PEAK_LINE_HIT_ZONE || Math.abs(relY - pl.yBot) <= PEAK_LINE_HIT_ZONE) {
                        draggingMarkerRef.current = { id: markerId, type: 'peakLine' };
                        return;
                    }
                }
            }
        }

        // Check marker hit zones
        const markers = markersRef?.current;
        if (markers && markers.length > 0) {
            const height = rect.height;
            const hit = getMarkerHitZone(relX, relY, markers, zoomX, panOffset, width, height);
            if (hit) {
                if (hit.zone === 'delete') {
                    removeMarker?.(hit.markerId);
                    return;
                }
                if (hit.zone === 'undo') {
                    resetMarkerGain?.(hit.markerId);
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

        // Empty space — try to add marker (snap to gap if between two markers), then seek
        if (addMarker) {
            const vX = relX - panOffset;
            const clickFrac = vX / (width * zoomX);
            if (clickFrac >= 0 && clickFrac <= 1) {
                const markers = markersRef?.current;
                const snap = markers && markers.length >= 1
                    ? getSnapBetweenMarkers(relX, markers, zoomX, panOffset, width)
                    : null;
                if (snap && addMarkerWithBounds) {
                    addMarkerWithBounds(snap.leftFrac, snap.rightFrac);
                } else {
                    addMarker(clickFrac, zoomX, width);
                }
            }
        }
        handleSeekOnWaveform(e.clientX);
    }, [originalBuffer, isDraggingKnobRef, waveformCanvasRef, zoomX, panOffset,
        markersRef, addMarker, addMarkerWithBounds, removeMarker, resetMarkerGain, handleSeekOnWaveform, peakLinesRef]);

    const handleWaveformTouchStart = useCallback((e) => {
        if (isDraggingKnobRef.current || !originalBuffer) return;
        if (e.touches.length > 1) return;
        e.preventDefault();

        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;

        const rect = waveformCanvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        const width = rect.width;

        // Check peak line hit first (before updating mousePos to avoid flash of hover preview)
        const peakLines = peakLinesRef?.current;
        if (peakLines) {
            for (const markerId of Object.keys(peakLines)) {
                const pl = peakLines[markerId];
                if (relX >= pl.px1 && relX <= pl.px2) {
                    if (Math.abs(relY - pl.yTop) <= PEAK_LINE_HIT_ZONE || Math.abs(relY - pl.yBot) <= PEAK_LINE_HIT_ZONE) {
                        draggingMarkerRef.current = { id: markerId, type: 'peakLine' };
                        return;
                    }
                }
            }
        }

        // Check marker hit zones
        const markers = markersRef?.current;
        if (markers && markers.length > 0) {
            const height = rect.height;
            const hit = getMarkerHitZone(relX, relY, markers, zoomX, panOffset, width, height);
            if (hit) {
                if (hit.zone === 'delete') {
                    removeMarker?.(hit.markerId);
                    return;
                }
                if (hit.zone === 'undo') {
                    resetMarkerGain?.(hit.markerId);
                    return;
                }
                if (hit.zone === 'left' || hit.zone === 'right') {
                    const marker = markers.find(m => m.id === hit.markerId);
                    if (marker) {
                        draggingMarkerRef.current = {
                            id: hit.markerId,
                            edge: hit.zone,
                            startClientX: clientX,
                            startFrac: hit.zone === 'left' ? marker.startFrac : marker.endFrac,
                        };
                    }
                    return;
                }
                if (hit.zone === 'body') return;
            }
        }

        // Only update mousePos for empty space touches (no marker hit)
        mousePosRef.current = { x: relX, y: relY };
        setMousePos({ x: relX, y: relY });

        // Empty space — add marker (snap to gap if between two markers), then seek
        if (addMarker) {
            const vX = relX - panOffset;
            const clickFrac = vX / (width * zoomX);
            if (clickFrac >= 0 && clickFrac <= 1) {
                const markers = markersRef?.current;
                const snap = markers && markers.length >= 1
                    ? getSnapBetweenMarkers(relX, markers, zoomX, panOffset, width)
                    : null;
                if (snap && addMarkerWithBounds) {
                    addMarkerWithBounds(snap.leftFrac, snap.rightFrac);
                } else {
                    addMarker(clickFrac, zoomX, width);
                }
            }
        }
        handleSeekOnWaveform(clientX);
    }, [originalBuffer, isDraggingKnobRef, waveformCanvasRef, zoomX, panOffset,
        markersRef, addMarker, addMarkerWithBounds, removeMarker, resetMarkerGain, handleSeekOnWaveform, peakLinesRef]);

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

        // During marker edge or peak line drag, just keep mousePos updated
        if (draggingMarkerRef.current) return;

        // Peak line hit detection (before marker edge detection)
        const peakLines = peakLinesRef?.current;
        if (peakLines) {
            for (const markerId of Object.keys(peakLines)) {
                const pl = peakLines[markerId];
                if (relX >= pl.px1 && relX <= pl.px2) {
                    if (Math.abs(relY - pl.yTop) <= PEAK_LINE_HOVER_ZONE || Math.abs(relY - pl.yBot) <= PEAK_LINE_HOVER_ZONE) {
                        hoveredMarkerInfoRef.current = { markerId, zone: 'peakLine' };
                        if (containerRef.current) containerRef.current.style.cursor = 'ns-resize';
                        return;
                    }
                }
            }
        }

        // Marker hit detection for cursor
        const markers = markersRef?.current;
        if (markers && markers.length > 0) {
            const width = rect.width;
            const height = rect.height;
            const hit = getMarkerHitZone(relX, relY, markers, zoomX, panOffset, width, height);
            hoveredMarkerInfoRef.current = hit;
            if (hit) {
                if (containerRef.current) {
                    if (hit.zone === 'left' || hit.zone === 'right') {
                        containerRef.current.style.cursor = 'ew-resize';
                    } else if (hit.zone === 'delete' || hit.zone === 'undo') {
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
    }, [isDraggingKnobRef, waveformCanvasRef, containerRef, isPlayingRef, markersRef, zoomX, panOffset, peakLinesRef]);

    const handleMouseLeave = useCallback(() => {
        mousePosRef.current = { x: -1, y: -1 };
        setMousePos({ x: -1, y: -1 });
        hoveredMarkerInfoRef.current = null;
        if (containerRef.current) containerRef.current.style.cursor = 'crosshair';
    }, [containerRef]);

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
