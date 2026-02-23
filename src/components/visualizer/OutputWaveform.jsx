import React, { useRef, useCallback, useEffect } from 'react';
import useOutputWaveformDrawer from '../../hooks/useOutputWaveformDrawer';

const HANDLE_PX = 8;   // hit-zone half-width in px for each handle
const MIN_REGION = 0.02; // minimum region width as fraction of total

const OutputWaveform = ({
    outputData,
    originalBuffer,
    audioContext,
    startTimeRef,
    startOffsetRef,
    isPlayingRef,
    playBufferRef,
    playingTypeRef,
    outputPlayheadRef,
    regionStart,
    regionEnd,
    onRegionChange,
}) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const touchStartHandlerRef = useRef(null);
    const dragRef = useRef(null); // { mode, startX, startRegionStart, startRegionEnd, totalWidth }

    useOutputWaveformDrawer(canvasRef, outputData);

    const handleSeek = useCallback((clientX) => {
        if (!containerRef.current || !originalBuffer) return;
        const rect = containerRef.current.getBoundingClientRect();
        let ratio = (clientX - rect.left) / rect.width;
        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;
        const seekTime = ratio * originalBuffer.duration;
        startOffsetRef.current = seekTime;

        const currentPlayingType = playingTypeRef.current;
        if (currentPlayingType !== 'none') {
            playBufferRef.current?.(originalBuffer, currentPlayingType, seekTime);
        } else {
            if (outputPlayheadRef?.current) {
                outputPlayheadRef.current.style.left = `${ratio * 100}%`;
                outputPlayheadRef.current.style.opacity = 1;
            }
        }
    }, [originalBuffer, startOffsetRef, playingTypeRef, playBufferRef, outputPlayheadRef]);

    // Returns 'left' | 'right' | 'move' | 'outside'
    const getHitZone = useCallback((clientX) => {
        if (!containerRef.current || regionStart == null || regionEnd == null) return 'outside';
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const w = rect.width;
        const leftPx = regionStart * w;
        const rightPx = regionEnd * w;

        if (Math.abs(x - leftPx) <= HANDLE_PX) return 'left';
        if (Math.abs(x - rightPx) <= HANDLE_PX) return 'right';
        if (x > leftPx && x < rightPx) return 'move';
        return 'outside';
    }, [regionStart, regionEnd]);

    const handleMouseDown = useCallback((e) => {
        if (!originalBuffer) return;
        const zone = getHitZone(e.clientX);

        if (zone === 'outside') {
            handleSeek(e.clientX);
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        dragRef.current = {
            mode: zone,
            startX: e.clientX,
            startRegionStart: regionStart,
            startRegionEnd: regionEnd,
            totalWidth: rect.width,
        };
        e.preventDefault();
    }, [originalBuffer, getHitZone, handleSeek, regionStart, regionEnd]);

    // Global mouse handlers — active only while dragging
    useEffect(() => {
        const onMove = (e) => {
            if (!dragRef.current || !onRegionChange) return;
            const { mode, startX, startRegionStart, startRegionEnd, totalWidth } = dragRef.current;
            const dx = (e.clientX - startX) / totalWidth;

            if (mode === 'left') {
                const newStart = Math.max(0, Math.min(startRegionStart + dx, startRegionEnd - MIN_REGION));
                onRegionChange(newStart, startRegionEnd);
            } else if (mode === 'right') {
                const newEnd = Math.min(1, Math.max(startRegionEnd + dx, startRegionStart + MIN_REGION));
                onRegionChange(startRegionStart, newEnd);
            } else {
                // move — preserve width
                const w = startRegionEnd - startRegionStart;
                const newStart = Math.max(0, Math.min(startRegionStart + dx, 1 - w));
                onRegionChange(newStart, newStart + w);
            }

            document.documentElement.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
        };

        const onUp = () => {
            if (!dragRef.current) return;
            document.documentElement.style.cursor = '';
            dragRef.current = null;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [onRegionChange]);

    // Cursor feedback on hover
    const handleLocalMouseMove = useCallback((e) => {
        if (dragRef.current || !containerRef.current) return;
        const zone = getHitZone(e.clientX);
        containerRef.current.style.cursor =
            zone === 'left' || zone === 'right' ? 'ew-resize' :
            zone === 'move' ? 'grab' :
            'crosshair';
    }, [getHitZone]);

    const handleMouseLeave = useCallback(() => {
        if (!dragRef.current && containerRef.current) {
            containerRef.current.style.cursor = 'crosshair';
        }
    }, []);

    // Touch support with passive: false
    const handleTouchStart = useCallback((e) => {
        if (!originalBuffer) return;
        if (e.touches.length > 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        const zone = getHitZone(touch.clientX);
        if (zone === 'outside') handleSeek(touch.clientX);
    }, [originalBuffer, handleSeek, getHitZone]);

    touchStartHandlerRef.current = handleTouchStart;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e) => touchStartHandlerRef.current?.(e);
        el.addEventListener('touchstart', handler, { passive: false });
        return () => el.removeEventListener('touchstart', handler);
    }, []);

    return (
        <div
            ref={containerRef}
            className="h-[80px] flex-shrink-0 relative overflow-hidden cursor-crosshair select-none touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleLocalMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Gold region overlay — pointer-events:none so mouse hits the container */}
            {regionStart != null && regionEnd != null && (
                <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10"
                    style={{
                        left: `${regionStart * 100}%`,
                        right: `${(1 - regionEnd) * 100}%`,
                        border: '2px solid #D4A017',
                        boxShadow: '0 0 10px rgba(212,160,23,0.5), inset 0 0 16px rgba(212,160,23,0.04)',
                        backgroundColor: 'rgba(212,160,23,0.04)',
                    }}
                >
                    {/* Left handle bar */}
                    <div
                        className="absolute top-0 bottom-0 left-0 w-[5px]"
                        style={{ background: 'linear-gradient(to right, rgba(212,160,23,0.85), rgba(212,160,23,0.1))' }}
                    />
                    {/* Right handle bar */}
                    <div
                        className="absolute top-0 bottom-0 right-0 w-[5px]"
                        style={{ background: 'linear-gradient(to left, rgba(212,160,23,0.85), rgba(212,160,23,0.1))' }}
                    />
                </div>
            )}

            {/* Playhead */}
            <div
                ref={outputPlayheadRef}
                className="absolute top-0 bottom-0 w-[1px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-20"
                style={{ left: '0%', opacity: 0 }}
            />
        </div>
    );
};

export default OutputWaveform;
