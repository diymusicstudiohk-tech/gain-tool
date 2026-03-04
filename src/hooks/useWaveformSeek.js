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

    return handleSeekOnWaveform;
};

export default useWaveformSeek;
