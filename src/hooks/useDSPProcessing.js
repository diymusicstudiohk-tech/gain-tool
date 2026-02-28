import { useState, useEffect, useRef, useMemo } from 'react';
import { processCompressor, createRealTimeCompressor } from '../utils/dsp';
import { toMono } from '../utils/audioHelper';
import { buildMipmaps } from '../utils/mipmapCache';

const MAX_SMOOTH_POINTS = 250000;
const MAX_INTERACTION_POINTS = 50000;

const useDSPProcessing = ({ audioContext, originalBuffer, currentParams, playingType, isDeltaMode, setIsProcessing, fullAudioDataRef, isDraggingKnobRef, isAnyKnobDragging }) => {
    const [visualSourceCache, setVisualSourceCache] = useState({ data: null, step: 1 });
    const processingTaskRef = useRef(null);
    const [debouncedParams, setDebouncedParams] = useState(currentParams);
    const fullResCacheRef = useRef(null);
    const interactionCacheRef = useRef(null);
    // Pre-allocated buffers to avoid GC pressure on recompute
    const preallocBufRef = useRef({ output: null, gr: null });

    // Defer param updates entirely during drag — only apply on mouse release
    useEffect(() => {
        if (!isAnyKnobDragging) {
            setDebouncedParams(currentParams);
        }
    }, [currentParams, isAnyKnobDragging]);

    // Downsampling for Visuals — build both full-res and interaction caches
    useEffect(() => {
        if (!originalBuffer) return;
        const length = originalBuffer.length;
        const monoData = toMono(originalBuffer);

        const buildCache = (maxPoints) => {
            let targetStep = 1;
            if (length > maxPoints) {
                targetStep = Math.ceil(length / maxPoints);
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
            return { data: cacheData, step: targetStep };
        };

        const fullRes = buildCache(MAX_SMOOTH_POINTS);
        const interaction = buildCache(MAX_INTERACTION_POINTS);
        fullResCacheRef.current = fullRes;
        interactionCacheRef.current = interaction;
        setVisualSourceCache(fullRes);
    }, [originalBuffer]);

    // Switch visual source cache — always use full-res (DSP is deferred during drag)
    useEffect(() => {
        if (!isAnyKnobDragging && fullResCacheRef.current) {
            setVisualSourceCache(fullResCacheRef.current);
        }
    }, [isAnyKnobDragging]);

    // Visual Result Memo — uses debouncedParams to avoid recomputing during fast knob drags
    const visualResult = useMemo(() => {
        if (!visualSourceCache.data || !audioContext) return null;
        const len = visualSourceCache.data.length;
        const pa = preallocBufRef.current;
        if (!pa.output || pa.output.length !== len) {
            pa.output = new Float32Array(len);
            pa.gr = new Float32Array(len);
        }
        return processCompressor(visualSourceCache.data, audioContext.sampleRate, debouncedParams, visualSourceCache.step, pa);
    }, [visualSourceCache, audioContext, debouncedParams]);

    // Build mipmaps for input, output, and GR curves
    const mipmaps = useMemo(() => {
        if (!visualResult) return null;
        return {
            input: buildMipmaps(visualResult.visualInput, 'absMax'),
            output: buildMipmaps(visualResult.outputData, 'absMax'),
            gr: buildMipmaps(visualResult.grCurve, 'min'),
        };
    }, [visualResult]);

    // visualStep = original samples per visual cache sample
    const visualStep = visualSourceCache.step;

    // Full Audio Processing (Async Chunking)
    useEffect(() => {
        if (!originalBuffer || !audioContext) return;
        fullAudioDataRef.current = null;
        if (processingTaskRef.current) clearTimeout(processingTaskRef.current);

        const inputData = originalBuffer.getChannelData(0);
        const sampleRate = originalBuffer.sampleRate;
        const length = inputData.length;
        const params = { ...debouncedParams, dryGain: -200, isDeltaMode: false };
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
                processingTaskRef.current = setTimeout(processChunk, 4);
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
    }, [originalBuffer, audioContext, debouncedParams, setIsProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        visualResult,
        mipmaps,
        visualStep,
        fullAudioDataRef,
        processingTaskRef,
    };
};

export default useDSPProcessing;
