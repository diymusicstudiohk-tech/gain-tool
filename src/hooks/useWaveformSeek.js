import { useCallback } from 'react';

const useWaveformSeek = ({
    originalBuffer, waveformCanvasRef,
    zoomX, panOffset,
    startOffsetRef, playingTypeRef, playBufferRef,
    playheadRef, outputPlayheadRef,
}) => {
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
                const px = screenPct * width / 100;
                playheadRef.current.style.transform = `translateX(${px}px)`;
                playheadRef.current.style.visibility = (screenPct < 0 || screenPct > 100) ? 'hidden' : 'visible';
            }
            if (outputPlayheadRef?.current) {
                const parentWidth = outputPlayheadRef.current.parentElement?.clientWidth || 0;
                const px = (ratio * 100) * parentWidth / 100;
                outputPlayheadRef.current.style.transform = `translateX(${px}px)`;
                outputPlayheadRef.current.style.visibility = 'visible';
            }
        }
    }, [originalBuffer, waveformCanvasRef, zoomX, panOffset,
        startOffsetRef, playingTypeRef, playBufferRef, playheadRef, outputPlayheadRef]);

    return handleSeekOnWaveform;
};

export default useWaveformSeek;
