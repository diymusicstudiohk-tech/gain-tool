import React, { useRef, useCallback, useEffect } from 'react';
import useOutputWaveformDrawer from '../../hooks/useOutputWaveformDrawer';

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
}) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const touchStartHandlerRef = useRef(null);

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
            // Update playhead position manually when stopped
            if (outputPlayheadRef?.current) {
                outputPlayheadRef.current.style.left = `${ratio * 100}%`;
                outputPlayheadRef.current.style.opacity = 1;
            }
        }
    }, [originalBuffer, startOffsetRef, playingTypeRef, playBufferRef, outputPlayheadRef]);

    const handleMouseDown = useCallback((e) => {
        if (!originalBuffer) return;
        handleSeek(e.clientX);
    }, [originalBuffer, handleSeek]);

    // Touch support with passive: false
    const handleTouchStart = useCallback((e) => {
        if (!originalBuffer) return;
        if (e.touches.length > 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        handleSeek(touch.clientX);
    }, [originalBuffer, handleSeek]);

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
        >
            <canvas ref={canvasRef} className="w-full h-full block" />

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
