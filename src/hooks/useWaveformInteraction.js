import { useState, useRef, useCallback, useEffect } from 'react';

const useWaveformInteraction = ({
    waveformCanvasRef, containerRef, originalBuffer,
    isDraggingKnobRef,
    startOffsetRef, playingTypeRef, playBufferRef,
    playheadRef, outputPlayheadRef,
    zoomX, panOffset,
    isPlayingRef,
}) => {
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const mousePosRef = useRef({ x: -1, y: -1 });
    const [isKnobDragging, setIsKnobDragging] = useState(false);

    const isDraggingRef = useRef(false);
    const touchStartHandlerRef = useRef(null);

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
        handleSeekOnWaveform(e.clientX);
    }, [originalBuffer, isDraggingKnobRef, handleSeekOnWaveform]);

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

        if (containerRef.current) containerRef.current.style.cursor = 'crosshair';
    }, [isDraggingKnobRef, waveformCanvasRef, containerRef, isPlayingRef]);

    const handleMouseLeave = useCallback(() => {
        mousePosRef.current = { x: -1, y: -1 };
        setMousePos({ x: -1, y: -1 });
        if (containerRef.current) containerRef.current.style.cursor = 'crosshair';
    }, [containerRef]);

    return {
        mousePos, mousePosRef,
        isKnobDragging, setIsKnobDragging,
        isDraggingRef,
        handleWaveformMouseDown, handleLocalMouseMove, handleMouseLeave,
    };
};

export default useWaveformInteraction;
