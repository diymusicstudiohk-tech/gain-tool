/**
 * useAudioPlayback.js
 * 音訊播放控制自定義 Hook
 * 負責處理音訊播放、暫停、模式切換等功能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createRealTimeCompressor } from '../utils/dsp';

export const useAudioPlayback = ({
    audioContext,
    originalBuffer,
    loopStart,
    loopEnd,
    dryGain,
    isDeltaMode,
    fullAudioDataRef,
    paramsRef,
    gainAdjustedRef,
    isPlayingRef,
    startTimeRef,
    startOffsetRef,
    sourceNodeRef,
    drySourceNodeRef,
    rafIdRef,
    animate,
    setErrorMsg,
    logAction
}) => {
    const [playingType, setPlayingType] = useState('none');
    const [lastPlayedType, setLastPlayedType] = useState('original');

    // Refs for Event Listeners (Prevent Stale Closures)
    const playingTypeRef = useRef(playingType);
    const lastPlayedTypeRef = useRef(lastPlayedType);
    useEffect(() => { playingTypeRef.current = playingType; }, [playingType]);
    useEffect(() => { lastPlayedTypeRef.current = lastPlayedType; }, [lastPlayedType]);

    // Sync Delta Mode
    useEffect(() => {
        if (playingType === 'none' || lastPlayedType === 'original' || !fullAudioDataRef.current) return;
        const targetBuffer = isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer;
        if (targetBuffer && audioContext) {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            const currentPos = startOffsetRef.current + elapsed;
            playBuffer(targetBuffer, 'processed', currentPos);
        }
    }, [isDeltaMode, playingType, lastPlayedType, fullAudioDataRef, audioContext]);

    const playBuffer = useCallback((buffer, type, offset) => {
        if (!audioContext || !buffer) return;
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
            } catch (e) { }
        }
        if (drySourceNodeRef.current) {
            try {
                drySourceNodeRef.current.stop();
                drySourceNodeRef.current.disconnect();
            } catch (e) { }
        }

        const runPlayback = async () => {
            try {
                if (audioContext.state !== 'running') {
                    await audioContext.resume();
                    console.log("AudioContext resumed.");
                }
                startSource();
            } catch (err) {
                console.error("Playback failed:", err);
                setErrorMsg("Playback Error: " + err.message);
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
                console.log(`Starting playback of type '${type}' at offset ${safeOffset.toFixed(2)}s`);

                // Create Source
                const source = audioContext.createBufferSource();

                // Determine which buffer to use
                let targetBuffer = buffer;
                if (type === 'processed') {
                    // Real-time Processing: Always use original buffer to avoid double-compression
                    targetBuffer = originalBuffer;
                }
                source.buffer = targetBuffer;

                if (type === 'processed') {
                    const bufferSize = 512;
                    const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

                    // DSP State for this playback session
                    const compressor = createRealTimeCompressor(audioContext.sampleRate);

                    scriptNode.onaudioprocess = (audioProcessingEvent) => {
                        const inputBuffer = audioProcessingEvent.inputBuffer;
                        const outputBuffer = audioProcessingEvent.outputBuffer;

                        const params = paramsRef.current; // Get latest params

                        // Process using our shared DSP logic
                        compressor.processBlock(inputBuffer, outputBuffer, params);
                    };

                    source.connect(scriptNode);
                    scriptNode.connect(audioContext.destination);

                    // We need to keep track of scriptNode to disconnect it later
                    // Hack: attach it to source node object for cleanup
                    source._scriptNode = scriptNode;

                } else {
                    // Original Mode
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
                setErrorMsg("Audio processing setup failed: " + e.message);
            }
        }

    }, [audioContext, animate, originalBuffer, dryGain, isDeltaMode, setErrorMsg, loopStart, loopEnd, paramsRef, isPlayingRef, startTimeRef, startOffsetRef, sourceNodeRef, drySourceNodeRef, rafIdRef]);

    const togglePlayback = useCallback(() => {
        logAction(`TOGGLE_PLAY: ${playingType !== 'none' ? 'STOP' : 'START'}`);
        if (!originalBuffer) return;
        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            startOffsetRef.current += elapsed;
            if (sourceNodeRef.current) {
                try {
                    sourceNodeRef.current.stop();
                    sourceNodeRef.current.disconnect();
                    if (sourceNodeRef.current._scriptNode) {
                        sourceNodeRef.current._scriptNode.disconnect();
                    }
                } catch (e) { }
                sourceNodeRef.current = null;
            }
            if (drySourceNodeRef.current) {
                try {
                    drySourceNodeRef.current.stop();
                    drySourceNodeRef.current.disconnect();
                } catch (e) { }
                drySourceNodeRef.current = null;
            }
            setPlayingType('none');
            cancelAnimationFrame(rafIdRef.current);
            isPlayingRef.current = false;
        } else {
            // Always use originalBuffer. 'processed' mode creates its own DSP chain on the fly.
            const targetBuffer = originalBuffer;

            // Auto-jump to loop start if loop exists
            if (loopStart !== null && loopEnd !== null) {
                startOffsetRef.current = loopStart;
            }

            if (targetBuffer) {
                isPlayingRef.current = true;
                playBuffer(targetBuffer, lastPlayedType, startOffsetRef.current);
            }
        }
    }, [playingType, lastPlayedType, originalBuffer, playBuffer, audioContext, isDeltaMode, loopStart, loopEnd, logAction, startTimeRef, startOffsetRef, sourceNodeRef, drySourceNodeRef, isPlayingRef, rafIdRef]);

    const handleModeChange = useCallback((type) => {
        logAction(`SET_MODE: ${type}`);
        setLastPlayedType(type);
        if (!gainAdjustedRef.current) {
            if (type === 'original') {
                // setDryGain(0);
            } else {
                // setDryGain(-60);
            }
        }

        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            let currentPos = startOffsetRef.current + elapsed;

            // Fix: Calculate correct position if looping
            if (loopStart !== null && loopEnd !== null && loopEnd > loopStart) {
                if (currentPos >= loopEnd) {
                    const loopDur = loopEnd - loopStart;
                    const offsetInLoop = (currentPos - loopStart) % loopDur;
                    currentPos = loopStart + offsetInLoop;
                } else if (currentPos < loopStart && currentPos >= loopEnd) {
                    // Start position sanity check (unlikely but safe)
                    currentPos = loopStart;
                }
            }

            // Hard Stop before switching
            if (sourceNodeRef.current) {
                try {
                    sourceNodeRef.current.stop();
                    sourceNodeRef.current.disconnect();
                    if (sourceNodeRef.current._scriptNode) sourceNodeRef.current._scriptNode.disconnect();
                } catch (e) { }
            }
            setPlayingType('none');
            isPlayingRef.current = false;

            // Restart after short delay to clear buffers
            setTimeout(() => {
                playBuffer(originalBuffer, type, currentPos);
            }, 50);
        }
    }, [playingType, playBuffer, originalBuffer, audioContext, loopStart, loopEnd, logAction, gainAdjustedRef, startTimeRef, startOffsetRef, sourceNodeRef, isPlayingRef]);

    return {
        playingType,
        setPlayingType,
        lastPlayedType,
        setLastPlayedType,
        playingTypeRef,
        lastPlayedTypeRef,
        playBuffer,
        togglePlayback,
        handleModeChange
    };
};
