import { useState, useEffect, useRef, useCallback } from 'react';
import { createRealTimeCompressor } from '../utils/dsp';
import { stopCurrentSource } from '../utils/audioHelper';

/**
 * Receives animateRef (not animate value) to break circular dep with useVisualizerLoop.
 * The RAF restart effect is managed by App.jsx.
 */
const usePlayback = ({
    audioContext, originalBuffer, paramsRef, dryGain, dryGainNodeRef,
    animateRef, fullAudioDataRef, logAction, handleModeDryGainSync,
    // Shared refs from App
    sourceNodeRef, drySourceNodeRef, startTimeRef, startOffsetRef,
    isPlayingRef, rafIdRef, playBufferRef, meterStateRef,
    // Region bounds (normalized 0-1)
    regionStartRef, regionEndRef,
}) => {
    const [playingType, setPlayingType] = useState('none');
    const [lastPlayedType, setLastPlayedType] = useState('processed');
    const [isDeltaMode, setIsDeltaMode] = useState(false);

    const playingTypeRef = useRef(playingType);
    const lastPlayedTypeRef = useRef(lastPlayedType);

    useEffect(() => { playingTypeRef.current = playingType; }, [playingType]);
    useEffect(() => { lastPlayedTypeRef.current = lastPlayedType; }, [lastPlayedType]);

    const isDryMode = lastPlayedType === 'original';

    // Sync isDeltaMode into paramsRef so ScriptProcessor reads the correct value
    useEffect(() => {
        if (paramsRef.current) {
            paramsRef.current = { ...paramsRef.current, isDeltaMode };
        }
    }, [isDeltaMode, paramsRef]);

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

    // Sync Dry Gain
    useEffect(() => {
        if (dryGainNodeRef.current && audioContext) {
            dryGainNodeRef.current.gain.setTargetAtTime(Math.pow(10, dryGain / 20), audioContext.currentTime, 0.01);
        }
    }, [dryGain, audioContext, dryGainNodeRef]);

    const playBuffer = useCallback((buffer, type, offset) => {
        if (!audioContext || !buffer) return;
        stopCurrentSource(sourceNodeRef, drySourceNodeRef);

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
                    const scriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                    const compressor = createRealTimeCompressor(audioContext.sampleRate);
                    scriptNode.onaudioprocess = (e) => {
                        compressor.processBlock(e.inputBuffer, e.outputBuffer, paramsRef.current);
                    };
                    source.connect(scriptNode);
                    scriptNode.connect(audioContext.destination);
                    source._scriptNode = scriptNode;
                } else {
                    source.connect(audioContext.destination);
                }

                sourceNodeRef.current = source;
                source.start(0, safeOffset);
                setPlayingType(type);
                setLastPlayedType(type);
                // Kick off animation using ref (latest animate from useVisualizerLoop)
                cancelAnimationFrame(rafIdRef.current);
                if (animateRef.current) {
                    rafIdRef.current = requestAnimationFrame(animateRef.current);
                }
            } catch (e) {
                console.error("BS/Script creation error", e);
                setPlayingType('none');
                isPlayingRef.current = false;
            }
        }
    }, [audioContext, originalBuffer, dryGain, isDeltaMode, paramsRef,
        sourceNodeRef, drySourceNodeRef, startTimeRef, startOffsetRef, isPlayingRef,
        rafIdRef, animateRef]);

    useEffect(() => { playBufferRef.current = playBuffer; }, [playBuffer, playBufferRef]);

    const togglePlayback = useCallback(() => {
        logAction(`TOGGLE_PLAY: ${playingType !== 'none' ? 'STOP' : 'START'}`);
        if (!originalBuffer) return;
        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            startOffsetRef.current += elapsed;
            stopCurrentSource(sourceNodeRef, drySourceNodeRef);
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

                // If playhead is outside the golden box region, snap to region start
                if (offset < rStart || offset >= rEnd) {
                    offset = rStart;
                    startOffsetRef.current = offset;
                }

                isPlayingRef.current = true;
                playBuffer(originalBuffer, lastPlayedType, offset);
            }
        }
    }, [playingType, lastPlayedType, originalBuffer, playBuffer, audioContext,
        logAction, sourceNodeRef, drySourceNodeRef, startTimeRef, startOffsetRef, isPlayingRef, rafIdRef,
        regionStartRef, regionEndRef]);

    const handleModeChange = useCallback((type) => {
        logAction(`SET_MODE: ${type}`);
        setLastPlayedType(type);
        handleModeDryGainSync(type);

        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            let currentPos = startOffsetRef.current + elapsed;

            stopCurrentSource(sourceNodeRef, drySourceNodeRef);
            setPlayingType('none');
            isPlayingRef.current = false;

            setTimeout(() => {
                playBuffer(originalBuffer, type, currentPos);
            }, 50);
        }
    }, [playingType, audioContext, originalBuffer, playBuffer,
        logAction, handleModeDryGainSync, sourceNodeRef, drySourceNodeRef, startTimeRef,
        startOffsetRef, isPlayingRef]);

    const toggleDeltaMode = useCallback((e) => {
        e.stopPropagation();
        if (lastPlayedType === 'original') return;
        setIsDeltaMode(prev => !prev);
    }, [lastPlayedType]);

    const stopAudio = useCallback(() => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
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
