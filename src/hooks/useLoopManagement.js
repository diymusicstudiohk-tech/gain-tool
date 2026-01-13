import { useState, useCallback } from 'react';

/**
 * Hook for managing loop points and loop operations
 * @returns {Object} Loop state and control functions
 */
export const useLoopManagement = () => {
    const [loopStart, setLoopStart] = useState(null);
    const [loopEnd, setLoopEnd] = useState(null);

    const handleLoopClear = useCallback((sourceNodeRef, audioContext, startTimeRef, startOffsetRef, isPlayingRef, playingType, playBuffer, originalBuffer) => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
                if (sourceNodeRef.current._scriptNode) {
                    sourceNodeRef.current._scriptNode.disconnect();
                }
            } catch (e) {}
            sourceNodeRef.current = null;
        }

        setLoopStart(null);
        setLoopEnd(null);

        if (isPlayingRef.current && playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            const currentPos = startOffsetRef.current + elapsed;
            setTimeout(() => {
                playBuffer(originalBuffer, playingType, currentPos);
            }, 10);
        }
    }, []);

    return {
        loopStart,
        setLoopStart,
        loopEnd,
        setLoopEnd,
        handleLoopClear
    };
};
