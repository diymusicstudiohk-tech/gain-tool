import { useState, useEffect, useRef, useMemo } from 'react';
import { processCompressor, createRealTimeCompressor } from '../utils/dsp';
import { toMono } from '../utils/audioHelper';

const useDSPProcessing = ({ audioContext, originalBuffer, currentParams, resolutionPct, playingType, isDeltaMode, setIsProcessing, fullAudioDataRef }) => {
    const [visualSourceCache, setVisualSourceCache] = useState({ data: null, step: 1 });
    const processingTaskRef = useRef(null);

    // Downsampling for Visuals
    useEffect(() => {
        if (!originalBuffer) return;
        const length = originalBuffer.length;
        const monoData = toMono(originalBuffer);

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

    // Visual Result Memo
    const visualResult = useMemo(() => {
        if (!visualSourceCache.data || !audioContext) return null;
        return processCompressor(visualSourceCache.data, audioContext.sampleRate, currentParams, visualSourceCache.step);
    }, [visualSourceCache, audioContext, currentParams]);

    // Full Audio Processing (Async Chunking)
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

        return () => { if (processingTaskRef.current) clearTimeout(processingTaskRef.current); };
    }, [originalBuffer, audioContext, currentParams, playingType, isDeltaMode, setIsProcessing]);

    return {
        visualSourceCache,
        visualResult,
        fullAudioDataRef,
        processingTaskRef,
    };
};

export default useDSPProcessing;
