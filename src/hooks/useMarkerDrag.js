import { useEffect } from 'react';
import { DELETE_BTN_SIZE, DELETE_BTN_MARGIN } from '../utils/canvasMarkers';
import { computeWaveformGeometry, linearFromDisplay } from '../utils/displayMath';
import { PEAK_LINE_PADDING_PCT } from '../utils/canvasConstants';

const useMarkerDrag = ({
    draggingMarkerRef, mousePosRef, setMousePos,
    waveformCanvasRef, zoomX, zoomY, panOffsetY,
    updateMarkerEdge, updateMarkerPeakAmp, updateMarkerClipGain,
    isPlayingRef, peakLinesRef,
}) => {
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

        // Force-end drag on tab switch or window blur (mobile app switching)
        const forceEndDrag = () => {
            if (draggingMarkerRef.current) {
                mousePosRef.current = { x: -1, y: -1 };
                setMousePos({ x: -1, y: -1 });
                draggingMarkerRef.current = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) forceEndDrag();
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
        window.addEventListener('touchend', handleWindowTouchEnd);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', forceEndDrag);
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            window.removeEventListener('touchmove', handleWindowTouchMove);
            window.removeEventListener('touchend', handleWindowTouchEnd);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', forceEndDrag);
        };
    }, [draggingMarkerRef, mousePosRef, setMousePos,
        waveformCanvasRef, zoomX, zoomY, panOffsetY,
        updateMarkerEdge, updateMarkerPeakAmp, updateMarkerClipGain,
        isPlayingRef, peakLinesRef]);
};

export default useMarkerDrag;
