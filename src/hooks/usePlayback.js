import { useState, useEffect, useRef, useCallback } from 'react';
import { createRealTimeCompressor } from '../utils/dsp';
import useStateRef from './useStateRef';

const usePlayback = ({
    audioContext, originalBuffer, currentParams, paramsRef,
    animateRef, fullAudioDataRef, logAction,
    sourceNodeRef, startTimeRef, startOffsetRef,
    isPlayingRef, rafIdRef, playBufferRef, meterStateRef,
    regionStartRef, regionEndRef,
    workletReady,
    markersRef, markers,
}) => {
    const [playingType, setPlayingType, playingTypeRef] = useStateRef('none');
    const [lastPlayedType, setLastPlayedType, lastPlayedTypeRef] = useStateRef('processed');

    const isDryMode = lastPlayedType === 'original';

    const workletNodeRef = useRef(null);
    const lastSentParamsRef = useRef(null);
    const scriptCompressorRef = useRef(null);

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
    }, [currentParams, paramsRef]);

    // Send marker updates to worklet/scriptCompressor when markers change
    useEffect(() => {
        if (!originalBuffer || !markers) return;
        const totalSamples = originalBuffer.length;
        if (workletNodeRef.current) {
            workletNodeRef.current.port.postMessage({ markers, totalSamples });
        }
        if (scriptCompressorRef.current) {
            scriptCompressorRef.current.setMarkers(markers, totalSamples);
        }
    }, [markers, originalBuffer]);

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
                    const currentMarkers = markersRef?.current || [];
                    const totalSamples = targetBuffer.length;
                    const samplePosition = Math.round(safeOffset * targetBuffer.sampleRate);

                    if (workletReady) {
                        const workletNode = new AudioWorkletNode(audioContext, 'compressor-processor');
                        workletNode.port.postMessage({
                            ...paramsRef.current,
                            markers: currentMarkers,
                            totalSamples,
                            samplePosition,
                        });
                        source.connect(workletNode);
                        workletNode.connect(audioContext.destination);
                        source._workletNode = workletNode;
                        workletNodeRef.current = workletNode;
                    } else {
                        const numCh = targetBuffer.numberOfChannels;
                        const scriptNode = audioContext.createScriptProcessor(2048, numCh, numCh);
                        const compressor = createRealTimeCompressor(audioContext.sampleRate);
                        compressor.setMarkers(currentMarkers, totalSamples);
                        compressor.setSamplePosition(samplePosition);
                        scriptNode.onaudioprocess = (e) => {
                            compressor.processBlock(e.inputBuffer, e.outputBuffer, paramsRef.current);
                        };
                        source.connect(scriptNode);
                        scriptNode.connect(audioContext.destination);
                        source._scriptNode = scriptNode;
                        scriptCompressorRef.current = compressor;
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
    }, [audioContext, originalBuffer, paramsRef, workletReady, markersRef,
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
            if (meterStateRef?.current) { meterStateRef.current.outClipping = false; meterStateRef.current.inClipping = false; }
        } else {
            if (originalBuffer) {
                const duration = originalBuffer.duration;
                const rStart = (regionStartRef?.current ?? 0) * duration;
                const offset = rStart;
                startOffsetRef.current = offset;

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

    const stopAudio = useCallback(() => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
        workletNodeRef.current = null;
        if (audioContext && audioContext.state === 'running') audioContext.suspend();
        setPlayingType('none');
        isPlayingRef.current = false;
        if (meterStateRef?.current) { meterStateRef.current.outClipping = false; meterStateRef.current.inClipping = false; }
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    }, [audioContext, sourceNodeRef, isPlayingRef, meterStateRef]);

    return {
        playingType, setPlayingType,
        lastPlayedType, setLastPlayedType,
        isDryMode,
        playingTypeRef, lastPlayedTypeRef,
        playBuffer, togglePlayback, handleModeChange,
        stopAudio,
    };
};

export default usePlayback;
