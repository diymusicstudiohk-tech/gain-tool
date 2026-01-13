import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { processCompressor, createRealTimeCompressor } from '../utils/dsp';

/**
 * Hook for managing audio processing and buffer management
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {AudioBuffer} originalBuffer - Original audio buffer
 * @param {Object} currentParams - Current DSP parameters
 * @param {number} resolutionPct - Resolution percentage for visual processing
 * @returns {Object} Processing state and results
 */
export const useAudioProcessing = (audioContext, originalBuffer, currentParams, resolutionPct) => {
    const [visualSourceCache, setVisualSourceCache] = useState({ data: null, step: 1 });
    const [isProcessing, setIsProcessing] = useState(false);
    const fullAudioDataRef = useRef(null);
    const processingTaskRef = useRef(null);

    useEffect(() => {
        if (!originalBuffer) return;
        const length = originalBuffer.length;
        const monoData = new Float32Array(length);
        const ch0 = originalBuffer.getChannelData(0);

        if (originalBuffer.numberOfChannels > 1) {
            const ch1 = originalBuffer.getChannelData(1);
            for (let i = 0; i < length; i++) monoData[i] = (ch0[i] + ch1[i]) / 2;
        } else {
            monoData.set(ch0);
        }

        let targetStep = 1;
        if (resolutionPct < 100) {
            const minPoints = 3000;
            const maxStep = Math.floor(length / minPoints);
            const factor = (100 - resolutionPct) / 99;
            targetStep = 1 + Math.floor(factor * (maxStep - 1));
        }

        const cacheLength = Math.floor(length / targetStep);
        const cacheData = new Float32Array(cacheLength);

        for (let i = 0; i < cacheLength; i++) {
            const start = i * targetStep;
            const end = Math.min(start + targetStep, length);
            let chunkVal = 0;
            let maxAbs = 0;
            for (let j = start; j < end; j++) {
                const val = monoData[j];
                const abs = Math.abs(val);
                if (abs > maxAbs) { maxAbs = abs; chunkVal = val; }
            }
            cacheData[i] = chunkVal;
        }
        setVisualSourceCache({ data: cacheData, step: targetStep });
    }, [originalBuffer, resolutionPct]);

    const visualResult = useMemo(() => {
        if (!visualSourceCache.data || !audioContext) return null;
        return processCompressor(visualSourceCache.data, audioContext.sampleRate, currentParams, visualSourceCache.step);
    }, [visualSourceCache, audioContext, currentParams]);

    useEffect(() => {
        if (!originalBuffer || !audioContext) return;
        fullAudioDataRef.current = null;
        if (processingTaskRef.current) clearTimeout(processingTaskRef.current);

        const inputData = originalBuffer.getChannelData(0);
        const sampleRate = originalBuffer.sampleRate;
        const length = inputData.length;
        const params = currentParams;
        const CHUNK_SIZE = 50000;
        let currentIndex = 0;
        const outData = new Float32Array(length);
        const compressor = createRealTimeCompressor(sampleRate);

        const processChunk = () => {
            const endIndex = Math.min(currentIndex + CHUNK_SIZE, length);
            const inputChunk = inputData.subarray(currentIndex, endIndex);
            const outputChunk = outData.subarray(currentIndex, endIndex);
            compressor.processBlock(inputChunk, outputChunk, params);
            currentIndex = endIndex;

            if (currentIndex < length) {
                processingTaskRef.current = setTimeout(processChunk, 0);
            } else {
                const outBuf = audioContext.createBuffer(1, length, sampleRate);
                outBuf.copyToChannel(outData, 0);
                const deltaData = new Float32Array(length);
                for (let i = 0; i < length; i++) deltaData[i] = outData[i] - inputData[i];
                const deltaBuf = audioContext.createBuffer(1, length, sampleRate);
                deltaBuf.copyToChannel(deltaData, 0);
                fullAudioDataRef.current = { outputBuffer: outBuf, deltaBuffer: deltaBuf };
                setIsProcessing(false);
            }
        };
        processingTaskRef.current = setTimeout(processChunk, 150);
    }, [originalBuffer, audioContext, currentParams]);

    return {
        visualSourceCache,
        visualResult,
        fullAudioDataRef,
        isProcessing,
        setIsProcessing
    };
};
