import { useState, useEffect, useRef, useMemo } from 'react';
import { processCompressor, createRealTimeCompressor } from '../utils/dsp';
import { toMono } from '../utils/audioHelper';
import { buildMipmaps } from '../utils/mipmapCache';

const MAX_SMOOTH_POINTS = 250000;
const MAX_INTERACTION_POINTS = 50000;

const useDSPProcessing = ({ audioContext, originalBuffer, currentParams, dryGain, playingType, isDeltaMode, setIsProcessing, fullAudioDataRef, isDraggingKnobRef, isAnyKnobDragging }) => {
    const [visualSourceCache, setVisualSourceCache] = useState({ data: null, step: 1 });
    const processingTaskRef = useRef(null);
    const [debouncedParams, setDebouncedParams] = useState(currentParams);
    const fullResCacheRef = useRef(null);
    const interactionCacheRef = useRef(null);

    // Defer param updates entirely during drag — only apply on mouse release
    const [debouncedDryGain, setDebouncedDryGain] = useState(dryGain);
    useEffect(() => {
        if (!isAnyKnobDragging) {
            setDebouncedParams(currentParams);
        }
    }, [currentParams, isAnyKnobDragging]);

    useEffect(() => {
        if (!isAnyKnobDragging) {
            setDebouncedDryGain(dryGain);
        }
    }, [dryGain, isAnyKnobDragging]);

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
        return processCompressor(visualSourceCache.data, audioContext.sampleRate, debouncedParams, visualSourceCache.step);
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

    // Build mix mipmaps (uses debouncedDryGain to avoid recompute during drag)
    const mixMipmaps = useMemo(() => {
        if (!visualResult) return null;
        const src = visualResult;
        const dryLinear = Math.pow(10, debouncedDryGain / 20);
        const len = src.outputData.length;
        const mixData = new Float32Array(len);
        for (let i = 0; i < len; i++) {
            mixData[i] = Math.abs(src.outputData[i] + (src.visualInput[i] * dryLinear));
        }
        return buildMipmaps(mixData, 'absMax');
    }, [visualResult, debouncedDryGain]);

    // visualStep = original samples per visual cache sample
    const visualStep = visualSourceCache.step;

    // Full Audio Processing (Async Chunking)
    useEffect(() => {
        if (!originalBuffer || !audioContext) return;
        console.warn(`[DELTA-DBG] Full audio reprocess STARTED — isDeltaMode=${isDeltaMode}, clearing fullAudioDataRef`);
        fullAudioDataRef.current = null;
        if (processingTaskRef.current) clearTimeout(processingTaskRef.current);

        const inputData = originalBuffer.getChannelData(0);
        const sampleRate = originalBuffer.sampleRate;
        const length = inputData.length;
        const params = { ...debouncedParams, dryGain: debouncedDryGain, isDeltaMode };
        const CHUNK_SIZE = 50000;
        let currentIndex = 0;
        const outData = new Float32Array(length);
        const compressor = createRealTimeCompressor(sampleRate);
        const startTime = performance.now();

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

                // Validate delta buffer data
                let deltaMax = 0, deltaNaN = 0, deltaInf = 0;
                for (let i = 0; i < Math.min(length, 10000); i++) {
                    const v = deltaData[i];
                    if (isNaN(v)) deltaNaN++;
                    else if (!isFinite(v)) deltaInf++;
                    else if (Math.abs(v) > deltaMax) deltaMax = Math.abs(v);
                }
                console.warn(`[DELTA-DBG] Full audio reprocess DONE in ${(performance.now() - startTime).toFixed(0)}ms — length=${length}, deltaMax=${deltaMax.toFixed(6)}, deltaNaN=${deltaNaN}, deltaInf=${deltaInf}, isDeltaMode=${isDeltaMode}`);

                fullAudioDataRef.current = { outputBuffer: outBuf, deltaBuffer: deltaBuf };
                setIsProcessing(false);
            }
        };
        processingTaskRef.current = setTimeout(processChunk, 150);

        return () => { if (processingTaskRef.current) clearTimeout(processingTaskRef.current); };
    }, [originalBuffer, audioContext, debouncedParams, debouncedDryGain, isDeltaMode, setIsProcessing]);

    return {
        visualResult,
        mipmaps,
        mixMipmaps,
        visualStep,
        fullAudioDataRef,
        processingTaskRef,
    };
};

export default useDSPProcessing;
