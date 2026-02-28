import { useState, useEffect, useRef, useCallback } from 'react';
import { createRealTimeCompressor } from '../utils/dsp';

/**
 * Receives animateRef (not animate value) to break circular dep with useVisualizerLoop.
 * The RAF restart effect is managed by App.jsx.
 */
const usePlayback = ({
    audioContext, originalBuffer, paramsRef,
    animateRef, fullAudioDataRef, logAction,
    // Shared refs from App
    sourceNodeRef, startTimeRef, startOffsetRef,
    isPlayingRef, rafIdRef, playBufferRef, meterStateRef,
    // Region bounds (normalized 0-1)
    regionStartRef, regionEndRef,
    // AudioWorklet
    workletReady,
}) => {
    const [playingType, setPlayingType] = useState('none');
    const [lastPlayedType, setLastPlayedType] = useState('processed');
    const [isDeltaMode, setIsDeltaMode] = useState(false);

    const playingTypeRef = useRef(playingType);
    const lastPlayedTypeRef = useRef(lastPlayedType);

    useEffect(() => { playingTypeRef.current = playingType; }, [playingType]);
    useEffect(() => { lastPlayedTypeRef.current = lastPlayedType; }, [lastPlayedType]);

    const isDryMode = lastPlayedType === 'original';

    // Ref to track active AudioWorkletNode for parameter updates
    const workletNodeRef = useRef(null);
    // Track last sent params to avoid redundant postMessage calls
    const lastSentParamsRef = useRef(null);

    // Sync isDeltaMode into paramsRef so processor reads the correct value
    useEffect(() => {
        if (paramsRef.current) {
            paramsRef.current = { ...paramsRef.current, isDeltaMode };
        }
    }, [isDeltaMode, paramsRef]);

    // Send parameter updates to AudioWorklet processor via postMessage
    useEffect(() => {
        if (workletNodeRef.current && paramsRef.current) {
            const current = paramsRef.current;
            const last = lastSentParamsRef.current;
            if (!last || Object.keys(current).some(k => current[k] !== last[k])) {
                lastSentParamsRef.current = { ...current };
                workletNodeRef.current.port.postMessage(current);
            }
        }
    });

    // Sync Delta Mode
    useEffect(() => {
        if (playingType === 'none' || lastPlayedType === 'original' || !fullAudioDataRef.current) return;
        const targetBuffer = isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer;
        if (targetBuffer && audioContext) {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            const currentPos = startOffsetRef.current + elapsed;
            playBufferRef.current?.(targetBuffer, 'processed', currentPos);
        }
    }, [isDeltaMode, playingType, lastPlayedType, fullAudioDataRef, audioContext,
        startTimeRef, startOffsetRef, playBufferRef]);

    const stopCurrentSource = useCallback(() => {
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch (_) {}
            sourceNodeRef.current = null;
        }
    }, [sourceNodeRef]);

    const playBuffer = useCallback((buffer, type, offset) => {
        if (!audioContext || !buffer) return;
        stopCurrentSource();
        workletNodeRef.current = null;

        const runPlayback = async () => {
            try {
                if (audioContext.state !== 'running') await audioContext.resume();
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
                if (type === 'processed') targetBuffer = originalBuffer;
                source.buffer = targetBuffer;

                if (type === 'processed') {
                    if (workletReady) {
                        const workletNode = new AudioWorkletNode(audioContext, 'compressor-processor');
                        workletNode.port.postMessage(paramsRef.current);
                        source.connect(workletNode);
                        workletNode.connect(audioContext.destination);
                        source._workletNode = workletNode;
                        workletNodeRef.current = workletNode;
                    } else {
                        const scriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                        const compressor = createRealTimeCompressor(audioContext.sampleRate);
                        scriptNode.onaudioprocess = (e) => {
                            compressor.processBlock(e.inputBuffer, e.outputBuffer, paramsRef.current);
                        };
                        source.connect(scriptNode);
                        scriptNode.connect(audioContext.destination);
                        source._scriptNode = scriptNode;
                    }
                } else {
                    source.connect(audioContext.destination);
                }

                sourceNodeRef.current = source;
                source.start(0, safeOffset);
                setPlayingType(type);
                setLastPlayedType(type);
            } catch (e) {
                console.error("BS/Script creation error", e);
                setPlayingType('none');
                isPlayingRef.current = false;
            }
        }
    }, [audioContext, originalBuffer, paramsRef, workletReady,
        sourceNodeRef, startTimeRef, startOffsetRef, isPlayingRef, stopCurrentSource]);

    useEffect(() => { playBufferRef.current = playBuffer; }, [playBuffer, playBufferRef]);

    const togglePlayback = useCallback(() => {
        logAction(`TOGGLE_PLAY: ${playingType !== 'none' ? 'STOP' : 'START'}`);
        if (!originalBuffer) return;
        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            startOffsetRef.current += elapsed;
            stopCurrentSource();
            setPlayingType('none');
            cancelAnimationFrame(rafIdRef.current);
            isPlayingRef.current = false;
            if (meterStateRef?.current) meterStateRef.current.outClipping = false;
        } else {
            if (originalBuffer) {
                const duration = originalBuffer.duration;
                const rStart = (regionStartRef?.current ?? 0) * duration;
                const rEnd = (regionEndRef?.current ?? 1) * duration;
                let offset = startOffsetRef.current;

                if (offset < rStart || offset >= rEnd) {
                    offset = rStart;
                    startOffsetRef.current = offset;
                }

                isPlayingRef.current = true;
                playBuffer(originalBuffer, lastPlayedType, offset);
            }
        }
    }, [playingType, lastPlayedType, originalBuffer, playBuffer, audioContext,
        logAction, sourceNodeRef, startTimeRef, startOffsetRef, isPlayingRef, rafIdRef,
        regionStartRef, regionEndRef, stopCurrentSource]);

    const handleModeChange = useCallback((type) => {
        logAction(`SET_MODE: ${type}`);
        setLastPlayedType(type);

        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            let currentPos = startOffsetRef.current + elapsed;

            stopCurrentSource();
            setPlayingType('none');
            isPlayingRef.current = false;

            setTimeout(() => {
                playBuffer(originalBuffer, type, currentPos);
            }, 50);
        }
    }, [playingType, audioContext, originalBuffer, playBuffer,
        logAction, sourceNodeRef, startTimeRef,
        startOffsetRef, isPlayingRef, stopCurrentSource]);

    const toggleDeltaMode = useCallback((e) => {
        e.stopPropagation();
        if (lastPlayedType === 'original') return;
        setIsDeltaMode(prev => !prev);
    }, [lastPlayedType]);

    const stopAudio = useCallback(() => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
        workletNodeRef.current = null;
        if (audioContext && audioContext.state === 'running') audioContext.suspend();
        setPlayingType('none');
        isPlayingRef.current = false;
        if (meterStateRef?.current) meterStateRef.current.outClipping = false;
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    }, [audioContext, sourceNodeRef, isPlayingRef, meterStateRef]);

    return {
        playingType, setPlayingType,
        lastPlayedType, setLastPlayedType,
        isDeltaMode, setIsDeltaMode,
        isDryMode,
        playingTypeRef, lastPlayedTypeRef,
        playBuffer, togglePlayback, handleModeChange,
        toggleDeltaMode, stopAudio,
    };
};

export default usePlayback;
