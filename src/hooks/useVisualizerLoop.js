import { useEffect, useRef, useCallback } from 'react';
import { drawMainWaveform } from '../components/visualizer/Waveform';
import { drawDualMeter, drawInputMeter } from '../components/visualizer/Meters';

const useVisualizerLoop = ({
    audioContext,
    originalBuffer,
    playingType,
    lastPlayedType,
    mousePos,
    mousePosRef,
    visualResult,
    visualStep,
    mipmaps,
    fullAudioDataRef,
    playBufferRef,
    startTimeRef,
    startOffsetRef,
    isPlayingRef,
    rafIdRef,
    waveformCanvasRef,
    outputMeterCanvasRef,
    inputMeterCanvasRef,
    playheadRef,
    meterStateRef,
    canvasDims,
    zoomX,
    zoomY,
    panOffset,
    panOffsetY,
    playingTypeRef,
    lastPlayedTypeRef,
    outputPlayheadRef,
    regionStartRef,
    regionEndRef,
    hoveredMeterRef,
    markersRef,
    hoveredMarkerInfoRef,
    draggingMarkerRef,
}) => {

    const waveformFrameRef = useRef(0);
    const waveformCacheRef = useRef({ key: null, imageData: null });
    const lastDrawParamsRef = useRef(null);
    const visualResultRef = useRef(visualResult);
    useEffect(() => { visualResultRef.current = visualResult; }, [visualResult]);
    const mipmapsRef = useRef(mipmaps);
    useEffect(() => { mipmapsRef.current = mipmaps; }, [mipmaps]);

    const interactionDPR = null;

    // Invalidate draw key + waveform cache when DSP data changes
    useEffect(() => {
        lastDrawParamsRef.current = null;
        if (waveformCacheRef.current) waveformCacheRef.current = { key: null, imageData: null };
    }, [visualResult, mipmaps]);

    const animate = useCallback(() => {
        if (!originalBuffer || !audioContext) return;
        if (!isPlayingRef.current) return;
        const elapsed = audioContext.currentTime - startTimeRef.current;
        let currentPosition = elapsed + startOffsetRef.current;

        const duration = originalBuffer.duration;

        // Compute live viewport from region refs
        const liveRegionStart = regionStartRef?.current ?? 0;
        const liveRegionEnd = regionEndRef?.current ?? 1;
        const liveRegionWidth = liveRegionEnd - liveRegionStart;
        const liveZoomX = liveRegionWidth >= 0.01 ? 1 / liveRegionWidth : zoomX;
        const livePanOffset = liveRegionWidth >= 0.01 ? -liveRegionStart * canvasDims.width / liveRegionWidth : panOffset;

        // Update Playhead Position
        if (waveformCanvasRef.current && playheadRef.current) {
            const width = canvasDims.width;
            const totalWidth = width * liveZoomX;
            const pct = currentPosition / duration;
            const screenPct = (((pct * totalWidth) + livePanOffset) / width) * 100;
            playheadRef.current.style.left = `${screenPct}%`;
            playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
        }

        // Update Output Waveform Playhead
        if (outputPlayheadRef?.current) {
            const pct = (currentPosition / duration) * 100;
            outputPlayheadRef.current.style.left = `${pct}%`;
            outputPlayheadRef.current.style.opacity = (pct < 0 || pct > 100) ? 0 : 1;
        }

        // Read latest visual data from refs
        const liveVisualResult = visualResultRef.current;
        const liveMipmaps = mipmapsRef.current;

        if (liveVisualResult) {
            // RMS Calculation
            const step = visualStep;
            const visualIndex = Math.max(0, Math.floor((currentPosition * audioContext.sampleRate) / step));
            const windowSize = Math.max(1, Math.floor(2048 / step));
            const endIdx = Math.min(visualIndex + windowSize, liveVisualResult.outputData.length);

            let maxMix = 0; let maxInput = 0; let sumSqInput = 0; let sumSqMix = 0; let sampleCount = 0;

            const currentType = playingTypeRef ? playingTypeRef.current : playingType;
            const lastType = lastPlayedTypeRef ? lastPlayedTypeRef.current : lastPlayedType;
            const isProcessed = currentType === 'processed' || (currentType !== 'original' && lastType === 'processed');

            for (let i = visualIndex; i < endIdx; i++) {
                if (i >= liveVisualResult.outputData.length) break;
                const dry = liveVisualResult.visualInput[i] || 0;
                const dryAbs = Math.abs(dry);
                if (dryAbs > maxInput) maxInput = dryAbs;
                sumSqInput += dry * dry;

                let mix = 0;
                if (isProcessed) {
                    mix = liveVisualResult.outputData[i] || 0;
                } else {
                    mix = liveVisualResult.visualInput[i] || 0;
                }

                const abs = Math.abs(mix);
                if (abs > maxMix) maxMix = abs;
                sumSqMix += mix * mix;
                sampleCount++;
            }

            let currentDryRms = sampleCount > 0 ? Math.sqrt(sumSqInput / sampleCount) : 0;
            let currentOutRms = sampleCount > 0 ? Math.sqrt(sumSqMix / sampleCount) : 0;

            if (!Number.isFinite(currentDryRms)) currentDryRms = 0;
            if (!Number.isFinite(currentOutRms)) currentOutRms = 0;

            const smoothingFactor = 0.15;
            meterStateRef.current.dryRmsLevel = meterStateRef.current.dryRmsLevel * (1 - smoothingFactor) + currentDryRms * smoothingFactor;
            meterStateRef.current.outRmsLevel = meterStateRef.current.outRmsLevel * (1 - smoothingFactor) + currentOutRms * smoothingFactor;

            if (!Number.isFinite(meterStateRef.current.dryRmsLevel)) meterStateRef.current.dryRmsLevel = 0;
            if (!Number.isFinite(meterStateRef.current.outRmsLevel)) meterStateRef.current.outRmsLevel = 0;

            // Draw Meters
            drawInputMeter(inputMeterCanvasRef?.current, maxInput, meterStateRef.current.dryRmsLevel, meterStateRef.current, hoveredMeterRef?.current);
            if (isProcessed) {
                drawDualMeter(outputMeterCanvasRef.current, maxMix, meterStateRef.current.outRmsLevel, meterStateRef.current, hoveredMeterRef?.current);
            } else {
                drawDualMeter(outputMeterCanvasRef.current, maxInput, meterStateRef.current.dryRmsLevel, meterStateRef.current, hoveredMeterRef?.current);
            }

            // Draw Main Waveform at 30fps; always draw when hovering
            waveformFrameRef.current = (waveformFrameRef.current + 1) % 2;
            const liveMousePos = mousePosRef.current;
            const isHovering = liveMousePos.x >= 0;

            if (waveformFrameRef.current === 0 || isHovering) {
                let shouldDraw = true;
                const liveMarkerCount = markersRef?.current?.length ?? 0;
                const liveHoveredMarker = hoveredMarkerInfoRef?.current;
                const liveHoveredMId = liveHoveredMarker ? liveHoveredMarker.markerId : '';
                const liveHoveredMZone = liveHoveredMarker ? liveHoveredMarker.zone : '';
                const liveDragging = draggingMarkerRef?.current ? 1 : 0;
                const cur = [canvasDims.width, canvasDims.height, liveZoomX, zoomY, livePanOffset, panOffsetY, playingType, lastPlayedType, liveMousePos.x, liveMousePos.y, liveMarkerCount, liveHoveredMId, liveHoveredMZone, liveDragging];
                const prev = lastDrawParamsRef.current;
                if (prev && prev.length === cur.length) {
                    shouldDraw = false;
                    for (let k = 0; k < cur.length; k++) {
                        if (cur[k] !== prev[k]) { shouldDraw = true; break; }
                    }
                }
                if (shouldDraw) lastDrawParamsRef.current = cur;

                if (shouldDraw) {
                    drawMainWaveform({
                        canvas: waveformCanvasRef.current,
                        canvasDims,
                        visualResult: liveVisualResult,
                        originalBuffer,
                        zoomX: liveZoomX, zoomY, panOffset: livePanOffset, panOffsetY,
                        playingType, lastPlayedType,
                        mousePos: liveMousePos,
                        mipmaps: liveMipmaps,
                        waveformCacheRef,
                        interactionDPR,
                        markers: markersRef?.current,
                        hoveredMarkerInfo: hoveredMarkerInfoRef?.current,
                        isMarkerDragging: !!draggingMarkerRef?.current,
                    });
                }
            }
        }

        // Playback Logic — loop within golden box region
        const regionEndTime = (regionEndRef?.current ?? 1) * duration;
        const regionStartTime = (regionStartRef?.current ?? 0) * duration;
        if (currentPosition >= regionEndTime) {
            if (playBufferRef.current) {
                const targetBuffer = originalBuffer;
                if (targetBuffer) {
                    playBufferRef.current(targetBuffer, playingType, regionStartTime);
                }
            }
        }
    }, [
        originalBuffer, audioContext, playingType, visualResult, zoomX, zoomY, panOffset, panOffsetY,
        visualStep, mipmaps, canvasDims,
        lastPlayedType,
        interactionDPR, fullAudioDataRef, playBufferRef, startTimeRef, startOffsetRef, isPlayingRef,
        rafIdRef, waveformCanvasRef, outputMeterCanvasRef, inputMeterCanvasRef, playheadRef, meterStateRef,
    ]);

    // --- Static Draw for Initial State ---
    useEffect(() => {
        if (playingType !== 'none') return;

        if (waveformCanvasRef.current && originalBuffer && visualResult) {
            drawMainWaveform({
                canvas: waveformCanvasRef.current,
                canvasDims,
                visualResult,
                originalBuffer,
                zoomX, zoomY, panOffset, panOffsetY,
                playingType, lastPlayedType,
                mousePos,
                mipmaps,
                waveformCacheRef,
                interactionDPR,
                markers: markersRef?.current,
                hoveredMarkerInfo: hoveredMarkerInfoRef?.current,
                isMarkerDragging: !!draggingMarkerRef?.current,
            });
        }

        if (inputMeterCanvasRef?.current) {
            drawInputMeter(inputMeterCanvasRef.current, 0, 0, meterStateRef.current, hoveredMeterRef?.current, true);
        }
        if (outputMeterCanvasRef.current) {
            drawDualMeter(outputMeterCanvasRef.current, 0, 0, meterStateRef.current, hoveredMeterRef?.current, true);
        }
    }, [
        playingType, originalBuffer, visualResult, canvasDims, zoomX, zoomY, panOffset, panOffsetY,
        lastPlayedType,
        mousePos,
        interactionDPR, waveformCanvasRef, outputMeterCanvasRef, inputMeterCanvasRef, meterStateRef,
        mipmaps,
    ]);

    return animate;
};

export default useVisualizerLoop;
