import React, { useRef, useCallback, useEffect } from 'react';
import useOutputWaveformDrawer from '../../hooks/useOutputWaveformDrawer';

const HANDLE_PX = 14;    // hit-zone half-width in px (comfortable for both mouse & touch)
const MIN_SECONDS = 3;   // gold box can never be narrower than 3 seconds

// 3 white grip dots rendered inside a handle bar
const HandleDots = () => (
    <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '5px', pointerEvents: 'none',
    }}>
        {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
        ))}
    </div>
);

const OutputWaveform = ({
    outputData,
    outputMipmaps,
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
    isLoading,
    loadingMessage,
}) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const dragRef = useRef(null);

    // Minimum region width as a fraction — at least 3 seconds, capped at full duration
    const minRegion = originalBuffer ? Math.min(1, MIN_SECONDS / originalBuffer.duration) : 0.02;
    const minRegionRef = useRef(minRegion);
    useEffect(() => { minRegionRef.current = minRegion; });

    // Track hover zone for overlay styling — only re-render when zone category changes
    const hoverZoneRef = useRef('outside');

    useOutputWaveformDrawer(canvasRef, outputData, outputMipmaps, regionStart, regionEnd);

    // ── Stable refs so touch effect (registered once) always gets fresh values ──
    const regionRef = useRef({ start: regionStart, end: regionEnd });
    useEffect(() => { regionRef.current = { start: regionStart, end: regionEnd }; });

    const onRegionChangeRef = useRef(onRegionChange);
    useEffect(() => { onRegionChangeRef.current = onRegionChange; });

    // ── Seek ──────────────────────────────────────────────────────────────────
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

    const handleSeekRef = useRef(handleSeek);
    useEffect(() => { handleSeekRef.current = handleSeek; });

    // ── Hit zone ──────────────────────────────────────────────────────────────
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

    const getHitZoneRef = useRef(getHitZone);
    useEffect(() => { getHitZoneRef.current = getHitZone; });

    // ── Shared drag update (used by both mouse and touch move) ────────────────
    const applyDrag = (clientX) => {
        if (!dragRef.current || !onRegionChangeRef.current) return;
        const { mode, startX, startRegionStart, startRegionEnd, totalWidth } = dragRef.current;
        const dx = (clientX - startX) / totalWidth;

        const mr = minRegionRef.current;
        if (mode === 'left') {
            const newStart = Math.max(0, Math.min(startRegionStart + dx, startRegionEnd - mr));
            onRegionChangeRef.current(newStart, startRegionEnd);
        } else if (mode === 'right') {
            const newEnd = Math.min(1, Math.max(startRegionEnd + dx, startRegionStart + mr));
            onRegionChangeRef.current(startRegionStart, newEnd);
        } else {
            const w = startRegionEnd - startRegionStart;
            const newStart = Math.max(0, Math.min(startRegionStart + dx, 1 - w));
            onRegionChangeRef.current(newStart, newStart + w);
        }
    };

    // ── Mouse handlers ────────────────────────────────────────────────────────
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

    useEffect(() => {
        const onMove = (e) => {
            if (!dragRef.current) return;
            applyDrag(e.clientX);
            const { mode } = dragRef.current;
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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Cursor + hover zone feedback
    const handleLocalMouseMove = useCallback((e) => {
        if (!containerRef.current) return;
        const zone = getHitZone(e.clientX);
        hoverZoneRef.current = zone;

        if (dragRef.current) return;
        containerRef.current.style.cursor =
            zone === 'left' || zone === 'right' ? 'ew-resize' :
            zone === 'move' ? 'grab' :
            'crosshair';
    }, [getHitZone]);

    const handleMouseLeave = useCallback(() => {
        hoverZoneRef.current = 'outside';
        if (!dragRef.current && containerRef.current) {
            containerRef.current.style.cursor = 'crosshair';
        }
    }, []);

    // ── Touch handlers (registered once, use refs for fresh values) ──────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onTouchStart = (e) => {
            if (e.touches.length > 1) return;
            e.preventDefault();
            const touch = e.touches[0];
            const zone = getHitZoneRef.current(touch.clientX);

            if (zone === 'outside') {
                handleSeekRef.current(touch.clientX);
                return;
            }

            const rect = el.getBoundingClientRect();
            dragRef.current = {
                mode: zone,
                startX: touch.clientX,
                startRegionStart: regionRef.current.start,
                startRegionEnd: regionRef.current.end,
                totalWidth: rect.width,
            };
        };

        const onTouchMove = (e) => {
            if (!dragRef.current) return;
            if (e.touches.length !== 1) return;
            e.preventDefault();
            applyDrag(e.touches[0].clientX);
        };

        const onTouchEnd = () => {
            dragRef.current = null;
        };

        el.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="h-[80px] flex-shrink-0 relative overflow-hidden cursor-crosshair select-none touch-none mt-4"
            onMouseDown={handleMouseDown}
            onMouseMove={handleLocalMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-sm transition-opacity duration-300">
                    <span className="text-white font-mono text-sm animate-pulse tracking-wider">
                        {loadingMessage || "載入音檔中..."}
                    </span>
                </div>
            )}

            {/* Gold region overlay — pointer-events:none, all interaction via container */}
            {regionStart != null && regionEnd != null && (
                <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10"
                    style={{
                        left: `${regionStart * 100}%`,
                        right: `${(1 - regionEnd) * 100}%`,
                    }}
                >
                    {/* Top border */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#D4A017' }} />
                    {/* Bottom border */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#D4A017' }} />

                    {/* Left handle bar — always thick with grip dots */}
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0,
                        width: 7,
                        background: '#D4A017',
                    }}>
                        <HandleDots />
                    </div>

                    {/* Right handle bar */}
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0, right: 0,
                        width: 7,
                        background: '#D4A017',
                    }}>
                        <HandleDots />
                    </div>
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
