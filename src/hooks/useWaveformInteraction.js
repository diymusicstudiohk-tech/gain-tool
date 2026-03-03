import { useState, useRef, useCallback, useEffect } from 'react';
import { getMarkerHitZone, getSnapBetweenMarkers, DELETE_BTN_SIZE, DELETE_BTN_MARGIN } from '../utils/canvasMarkers';
import { computeWaveformGeometry, linearFromDisplay } from '../utils/displayMath';
import { PEAK_LINE_HIT_ZONE, PEAK_LINE_HOVER_ZONE, PEAK_LINE_PADDING_PCT } from '../utils/canvasConstants';

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

    // Window-level mousemove/mouseup for edge dragging
    useEffect(() => {
        const handleWindowMouseMove = (e) => {
            const drag = draggingMarkerRef.current;
            if (!drag) return;
            if (!waveformCanvasRef.current) return;

            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            // Keep mouse position updated so visualizer redraws during drag
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            mousePosRef.current = { x: relX, y: relY };
            if (!isPlayingRef.current) {
                setMousePos({ x: relX, y: relY });
            }

            if (drag.type === 'peakLine') {
                // Compute amplitude from mouse Y position
                const { centerY, ampScale } = computeWaveformGeometry(height, zoomY, panOffsetY);
                if (ampScale <= 0) return;
                // 5% padding from edge, with minimum to clear buttons
                const padPx = Math.max(height * PEAK_LINE_PADDING_PCT, DELETE_BTN_SIZE + DELETE_BTN_MARGIN * 2);
                const clampedY = Math.max(padPx, Math.min(height - padPx, relY));
                const distFromCenter = Math.abs(clampedY - centerY);
                let amp = distFromCenter / ampScale;
                amp = Math.max(0, Math.min(1, amp));
                updateMarkerPeakAmp?.(drag.id, amp);

                // Compute clip gain dB from auto-snap reference
                const peakLine = peakLinesRef?.current?.[drag.id];
                if (peakLine && peakLine.autoDisplayAmp != null && peakLine.autoDisplayAmp > 0) {
                    const currentLinear = linearFromDisplay(amp);
                    const autoLinear = linearFromDisplay(peakLine.autoDisplayAmp);
                    if (autoLinear > 0) {
                        const dB = 20 * Math.log10(currentLinear / autoLinear);
                        updateMarkerClipGain?.(drag.id, dB);
                    }
                }
                return;
            }

            const totalPx = width * zoomX;
            if (totalPx <= 0) return;

            const dx = e.clientX - drag.startClientX;
            const fracDelta = dx / totalPx;
            const newFrac = drag.startFrac + fracDelta;

            updateMarkerEdge?.(drag.id, drag.edge, newFrac, zoomX, width);
        };

        const handleWindowMouseUp = () => {
            draggingMarkerRef.current = null;
        };

        const handleWindowTouchMove = (e) => {
            const drag = draggingMarkerRef.current;
            if (!drag) return;
            if (!waveformCanvasRef.current) return;
            if (e.touches.length !== 1) return;
            e.preventDefault();

            const clientX = e.touches[0].clientX;
            const clientY = e.touches[0].clientY;
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            const relX = clientX - rect.left;
            const relY = clientY - rect.top;
            mousePosRef.current = { x: relX, y: relY };
            if (!isPlayingRef.current) {
                setMousePos({ x: relX, y: relY });
            }

            if (drag.type === 'peakLine') {
                const { centerY, ampScale } = computeWaveformGeometry(height, zoomY, panOffsetY);
                if (ampScale <= 0) return;
                // 5% padding from edge, with minimum to clear buttons
                const padPx = Math.max(height * PEAK_LINE_PADDING_PCT, DELETE_BTN_SIZE + DELETE_BTN_MARGIN * 2);
                const clampedY = Math.max(padPx, Math.min(height - padPx, relY));
                const distFromCenter = Math.abs(clampedY - centerY);
                let amp = distFromCenter / ampScale;
                amp = Math.max(0, Math.min(1, amp));
                updateMarkerPeakAmp?.(drag.id, amp);

                const peakLine = peakLinesRef?.current?.[drag.id];
                if (peakLine && peakLine.autoDisplayAmp != null && peakLine.autoDisplayAmp > 0) {
                    const currentLinear = linearFromDisplay(amp);
                    const autoLinear = linearFromDisplay(peakLine.autoDisplayAmp);
                    if (autoLinear > 0) {
                        const dB = 20 * Math.log10(currentLinear / autoLinear);
                        updateMarkerClipGain?.(drag.id, dB);
                    }
                }
                return;
            }

            const totalPx = width * zoomX;
            if (totalPx <= 0) return;

            const dx = clientX - drag.startClientX;
            const fracDelta = dx / totalPx;
            const newFrac = drag.startFrac + fracDelta;

            updateMarkerEdge?.(drag.id, drag.edge, newFrac, zoomX, width);
        };

        const handleWindowTouchEnd = () => {
            if (draggingMarkerRef.current) {
                // Clear mousePos so hover preview doesn't linger after drag
                mousePosRef.current = { x: -1, y: -1 };
                setMousePos({ x: -1, y: -1 });
            }
            draggingMarkerRef.current = null;
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
        window.addEventListener('touchend', handleWindowTouchEnd);
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            window.removeEventListener('touchmove', handleWindowTouchMove);
            window.removeEventListener('touchend', handleWindowTouchEnd);
        };
    }, [waveformCanvasRef, zoomX, zoomY, panOffsetY, updateMarkerEdge, updateMarkerPeakAmp, updateMarkerClipGain, isPlayingRef, peakLinesRef]);

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
