import { useState, useCallback, useRef, useEffect } from 'react';
import { createRealTimeCompressor } from '../utils/dsp';
import useStateRef from './useStateRef';

/**
 * Hook for managing audio playback control
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {AudioBuffer} originalBuffer - Original audio buffer
 * @param {Object} params - Current parameters
 * @param {Function} animate - Animation loop function
 * @returns {Object} Playback state and control functions
 */
export const usePlaybackControl = (audioContext, originalBuffer, params, animate) => {
    const [playingType, setPlayingType, playingTypeRef] = useStateRef('none');
    const [lastPlayedType, setLastPlayedType, lastPlayedTypeRef] = useStateRef('original');
    const [isDeltaMode, setIsDeltaMode] = useState(false);

    const sourceNodeRef = useRef(null);
    const drySourceNodeRef = useRef(null);
    const dryGainNodeRef = useRef(null);
    const startTimeRef = useRef(0);
    const startOffsetRef = useRef(0);
    const isPlayingRef = useRef(false);
    const playBufferRef = useRef(null);
    const rafIdRef = useRef(null);

    const playBuffer = useCallback((buffer, type, offset, loopStart, loopEnd, paramsRef, fullAudioDataRef, isDeltaMode) => {
        if (!audioContext || !buffer) return;
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
            } catch (e) {}
        }
        if (drySourceNodeRef.current) {
            try {
                drySourceNodeRef.current.stop();
                drySourceNodeRef.current.disconnect();
            } catch (e) {}
        }

        const runPlayback = async () => {
            try {
                if (audioContext.state !== 'running') {
                    await audioContext.resume();
                }
                startSource();
            } catch (err) {
                console.error("Playback failed:", err);
                isPlayingRef.current = false;
                setPlayingType('none');
            }
        };

        runPlayback();

        function startSource() {
            try {
                isPlayingRef.current = true;
                let safeOffset = offset;
                if (safeOffset >= buffer.duration) safeOffset = 0;
                startTimeRef.current = audioContext.currentTime;
                startOffsetRef.current = safeOffset;

                const source = audioContext.createBufferSource();
                let targetBuffer = buffer;

                if (type === 'processed') {
                    targetBuffer = originalBuffer;
                }
                source.buffer = targetBuffer;

                if (type === 'processed') {
                    const bufferSize = 512;
                    const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
                    const compressor = createRealTimeCompressor(audioContext.sampleRate);

                    scriptNode.onaudioprocess = (audioProcessingEvent) => {
                        const inputBuffer = audioProcessingEvent.inputBuffer;
                        const outputBuffer = audioProcessingEvent.outputBuffer;
                        const params = paramsRef.current;
                        compressor.processBlock(inputBuffer, outputBuffer, params);
                    };

                    source.connect(scriptNode);
                    scriptNode.connect(audioContext.destination);
                    source._scriptNode = scriptNode;
                } else {
                    source.connect(audioContext.destination);
                }

                if (loopStart !== null && loopEnd !== null) {
                    source.loop = true;
                    source.loopStart = loopStart;
                    source.loopEnd = loopEnd;
                }

                sourceNodeRef.current = source;
                source.start(0, safeOffset);
                setPlayingType(type);
                setLastPlayedType(type);
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = requestAnimationFrame(animate);
            } catch (e) {
                console.error("BS/Script creation error", e);
                setPlayingType('none');
                isPlayingRef.current = false;
            }
        }
    }, [audioContext, animate, originalBuffer]);

    useEffect(() => {
        playBufferRef.current = playBuffer;
    }, [playBuffer]);

    return {
        playingType, setPlayingType,
        lastPlayedType, setLastPlayedType,
        isDeltaMode, setIsDeltaMode,
        sourceNodeRef,
        drySourceNodeRef,
        dryGainNodeRef,
        startTimeRef,
        startOffsetRef,
        isPlayingRef,
        playingTypeRef,
        lastPlayedTypeRef,
        playBufferRef,
        rafIdRef,
        playBuffer
    };
};
