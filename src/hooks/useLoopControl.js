/**
 * useLoopControl.js
 * Loop 控制自定義 Hook
 * 負責處理 Loop 的建立、清除等功能
 */

import { useState, useCallback } from 'react';

export const useLoopControl = ({
    sourceNodeRef,
    originalBuffer,
    playingType,
    isPlayingRef,
    audioContext,
    startTimeRef,
    startOffsetRef,
    playBuffer,
    setLoopStart,
    setLoopEnd
}) => {
    /**
     * 清除 Loop
     * - 停止當前播放
     * - 重置 Loop 狀態
     * - 如果正在播放，則從當前位置重新開始（不含 Loop）
     */
    const handleLoopClear = useCallback(() => {
        // Stop current playback cleanly to avoid double-play
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
                if (sourceNodeRef.current._scriptNode) sourceNodeRef.current._scriptNode.disconnect();
            } catch (e) { }
            sourceNodeRef.current = null;
        }

        // Reset loop state
        setLoopStart(null);
        setLoopEnd(null);

        // If we were playing, restart playback from current position without loop
        if (isPlayingRef.current && playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            const currentPos = startOffsetRef.current + elapsed;

            // Wait a tick to ensure state updates
            setTimeout(() => {
                playBuffer(originalBuffer, playingType, currentPos);
            }, 10);
        }
    }, [sourceNodeRef, isPlayingRef, playingType, audioContext, startTimeRef, startOffsetRef, originalBuffer, playBuffer, setLoopStart, setLoopEnd]);

    return {
        handleLoopClear
    };
};
