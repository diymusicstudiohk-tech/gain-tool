import { useEffect, useRef, useCallback } from 'react';
import { LN10_OVER_20, TWENTY_LOG10E } from '../utils/dspConstants';
import { drawMainWaveform } from '../components/visualizer/Waveform';
import { drawDualMeter } from '../components/visualizer/Meters';

const useVisualizerLoop = ({
    audioContext,
    originalBuffer,
    playingType,
    lastPlayedType,
    isDeltaMode,
    dryGain,
    threshold,
    gateThreshold,
    mousePos,
    hoverLine,
    isDraggingLineRef,
    isCompAdjusting,
    hasThresholdBeenAdjusted,
    isGateAdjusting,
    hasGateBeenAdjusted,
    isGateBypass,
    isCompBypass,
    hoveredKnob,
    isGainKnobDragging,
    draggingGainKnob,
    visualResult,
    visualStep,
    mipmaps,
    mixMipmaps,
    fullAudioDataRef,
    playBufferRef,
    startTimeRef,
    startOffsetRef,
    isPlayingRef,
    rafIdRef,
    waveformCanvasRef,
    grBarCanvasRef,
    outputMeterCanvasRef,
    cfMeterCanvasRef,
    playheadRef,
    meterStateRef,
    hoverGrRef,
    isHoveringGRAreaRef,
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
}) => {

    const waveformFrameRef = useRef(0);
    const waveformCacheRef = useRef({ key: null, imageData: null });
    const lastWaveformDrawKeyRef = useRef(null);
    const dryGainRef = useRef(dryGain);
    useEffect(() => { dryGainRef.current = dryGain; }, [dryGain]);
    const thresholdRef = useRef(threshold);
    useEffect(() => { thresholdRef.current = threshold; }, [threshold]);
    const gateThresholdRef = useRef(gateThreshold);
    useEffect(() => { gateThresholdRef.current = gateThreshold; }, [gateThreshold]);

    // Use refs for mousePos/hoverLine so animate() reads the latest values
    // without being recreated on every mouse move (which would restart the RAF loop).
    const mousePosRef = useRef(mousePos);
    useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
    const hoverLineRef = useRef(hoverLine);
    useEffect(() => { hoverLineRef.current = hoverLine; }, [hoverLine]);

    // Use refs for bypass state + visual data so animate() picks up changes
    // immediately without waiting for useCallback recreation + RAF restart.
    const isGateBypassRef = useRef(isGateBypass);
    useEffect(() => { isGateBypassRef.current = isGateBypass; }, [isGateBypass]);
    const isCompBypassRef = useRef(isCompBypass);
    useEffect(() => { isCompBypassRef.current = isCompBypass; }, [isCompBypass]);
    const visualResultRef = useRef(visualResult);
    useEffect(() => { visualResultRef.current = visualResult; }, [visualResult]);
    const mipmapsRef = useRef(mipmaps);
    useEffect(() => { mipmapsRef.current = mipmaps; }, [mipmaps]);
    const mixMipmapsRef = useRef(mixMipmaps);
    useEffect(() => { mixMipmapsRef.current = mixMipmaps; }, [mixMipmaps]);

    const activeGainKnob = draggingGainKnob || ((hoveredKnob === 'makeup' || hoveredKnob === 'dryGain') ? hoveredKnob : null);
    const isGainKnobActive = !!activeGainKnob;
    const interactionDPR = null; // Always full DPR — cache handles performance during drag

    // Invalidate draw key + waveform cache when DSP data or bypass state changes
    // so the animate loop doesn't skip the redraw via stale key comparison.
    useEffect(() => {
        lastWaveformDrawKeyRef.current = null;
        if (waveformCacheRef.current) waveformCacheRef.current = { key: null, imageData: null };
    }, [visualResult, mipmaps, mixMipmaps, isGateBypass, isCompBypass]);

    const animate = useCallback(() => {
        if (!originalBuffer || !audioContext) return;
        if (!isPlayingRef.current) return;
        const elapsed = audioContext.currentTime - startTimeRef.current;
        let currentPosition = elapsed + startOffsetRef.current;

        const duration = originalBuffer.duration;

        // Compute live viewport from region refs (bypasses React state delay for instant gold-box response)
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

        // Read latest visual data + bypass state from refs (avoids stale closure)
        const liveVisualResult = visualResultRef.current;
        const liveMipmaps = mipmapsRef.current;
        const liveMixMipmaps = mixMipmapsRef.current;
        const liveIsGateBypass = isGateBypassRef.current;
        const liveIsCompBypass = isCompBypassRef.current;

        if (liveVisualResult) {
            // RMS Calculation
            const step = visualStep;
            // Prevent negative index access which causes NaNs
            const visualIndex = Math.max(0, Math.floor((currentPosition * audioContext.sampleRate) / step));
            const windowSize = Math.max(1, Math.floor(2048 / step));
            const endIdx = Math.min(visualIndex + windowSize, liveVisualResult.outputData.length);

            let currentGR = 0;
            if (visualIndex < liveVisualResult.grCurve.length && visualIndex >= 0) currentGR = liveVisualResult.grCurve[visualIndex];

            let maxMix = 0; let maxInput = 0; let sumSqInput = 0; let sumSqMix = 0; let sampleCount = 0;

            // Determine if we should show processed signal
            // Use Refs to ensure we get the latest state even if the animation closure is stale
            const currentType = playingTypeRef ? playingTypeRef.current : playingType;
            const lastType = lastPlayedTypeRef ? lastPlayedTypeRef.current : lastPlayedType;

            const isProcessed = currentType === 'processed' || (currentType !== 'original' && lastType === 'processed');

            const currentDryGain = dryGainRef.current;
            const dryLinear = Math.exp(currentDryGain * LN10_OVER_20);

            for (let i = visualIndex; i < endIdx; i++) {
                if (i >= liveVisualResult.outputData.length) break;
                const dry = liveVisualResult.visualInput[i] || 0; // Guard undefined
                const dryAbs = Math.abs(dry);
                if (dryAbs > maxInput) maxInput = dryAbs;
                sumSqInput += dry * dry;

                let mix = 0;
                if (isProcessed) {
                    const wet = liveVisualResult.outputData[i] || 0; // Guard undefined
                    if (isDeltaMode) {
                        mix = wet - dry;
                    } else {
                        mix = wet + (dry * dryLinear);
                    }
                } else {
                    mix = liveVisualResult.visualInput[i] || 0; // Guard undefined
                }

                const abs = Math.abs(mix);
                if (abs > maxMix) maxMix = abs;
                sumSqMix += mix * mix;
                sampleCount++;
            }

            let currentDryRms = sampleCount > 0 ? Math.sqrt(sumSqInput / sampleCount) : 0;
            let currentOutRms = sampleCount > 0 ? Math.sqrt(sumSqMix / sampleCount) : 0;

            // NaN Guard: If sampleCount 0 or data corrupt, prevent pollution of meterState
            if (!Number.isFinite(currentDryRms)) currentDryRms = 0;
            if (!Number.isFinite(currentOutRms)) currentOutRms = 0;

            const smoothingFactor = 0.15;
            meterStateRef.current.dryRmsLevel = meterStateRef.current.dryRmsLevel * (1 - smoothingFactor) + currentDryRms * smoothingFactor;
            meterStateRef.current.outRmsLevel = meterStateRef.current.outRmsLevel * (1 - smoothingFactor) + currentOutRms * smoothingFactor;

            // Final NaN check for state (recovery from bad state)
            if (!Number.isFinite(meterStateRef.current.dryRmsLevel)) meterStateRef.current.dryRmsLevel = 0;
            if (!Number.isFinite(meterStateRef.current.outRmsLevel)) meterStateRef.current.outRmsLevel = 0;

            // --- Crest Factor Calculation ---
            let currentInstantCF = 0;
            if (currentOutRms > 0.0001 && maxMix > 0.0001) {
                const peakDb = Math.log(maxMix) * TWENTY_LOG10E;
                const rmsDb = Math.log(currentOutRms) * TWENTY_LOG10E;
                currentInstantCF = peakDb - rmsDb;
            } else {
                currentInstantCF = 0;
            }

            if (meterStateRef.current.crestFactor === undefined) meterStateRef.current.crestFactor = 0;

            meterStateRef.current.crestFactor = meterStateRef.current.crestFactor * 0.9 + currentInstantCF * 0.1;

            // Draw Meters
            if (isProcessed) {
                drawDualMeter(outputMeterCanvasRef.current, maxInput, maxMix, meterStateRef.current.dryRmsLevel, meterStateRef.current.outRmsLevel, meterStateRef.current, currentGR, hoverGrRef.current, meterStateRef.current.crestFactor, isHoveringGRAreaRef.current, hoveredMeterRef?.current);
            } else {
                drawDualMeter(outputMeterCanvasRef.current, maxInput, maxInput, meterStateRef.current.dryRmsLevel, meterStateRef.current.dryRmsLevel, meterStateRef.current, 0, hoverGrRef.current, meterStateRef.current.crestFactor, isHoveringGRAreaRef.current, hoveredMeterRef?.current);
            }

            // Draw Main Waveform at 30fps (every 2 frames); always draw when interacting or hovering
            waveformFrameRef.current = (waveformFrameRef.current + 1) % 2;
            const liveMousePos = mousePosRef.current;
            const liveHoverLine = hoverLineRef.current;
            const isHovering = liveMousePos.x >= 0;
            const isInteracting = isDraggingLineRef.current || isCompAdjusting || isGateAdjusting;

            if (waveformFrameRef.current === 0 || isInteracting || isHovering) {
                // Skip redundant draws: if no state affecting the waveform has changed, don't redraw
                let shouldDraw = true;
                if (!isInteracting) {
                    const drawKey = `${canvasDims.width}_${canvasDims.height}_${liveZoomX}_${zoomY}_${livePanOffset}_${panOffsetY}_${playingType}_${lastPlayedType}_${isDeltaMode}_${currentDryGain}_${thresholdRef.current}_${gateThresholdRef.current}_${liveMousePos.x}_${liveMousePos.y}_${liveHoverLine}_${hasThresholdBeenAdjusted}_${hasGateBeenAdjusted}_${liveIsGateBypass}_${liveIsCompBypass}_${isGainKnobActive}_${activeGainKnob}`;
                    if (drawKey === lastWaveformDrawKeyRef.current) {
                        shouldDraw = false;
                    } else {
                        lastWaveformDrawKeyRef.current = drawKey;
                    }
                }

                if (shouldDraw) {
                    drawMainWaveform({
                        canvas: waveformCanvasRef.current,
                        canvasDims,
                        visualResult: liveVisualResult,
                        originalBuffer,
                        zoomX: liveZoomX, zoomY, panOffset: livePanOffset, panOffsetY,
                        playingType, lastPlayedType, isDeltaMode, dryGain: currentDryGain,
                        threshold: thresholdRef.current, gateThreshold: gateThresholdRef.current,
                        mousePos: liveMousePos, hoverLine: liveHoverLine,
                        isDraggingLine: isDraggingLineRef.current,
                        isCompAdjusting, hasThresholdBeenAdjusted,
                        isGateAdjusting, hasGateBeenAdjusted,
                        hoverGrRef,
                        isHoveringGRAreaRef,
                        isGateBypass: liveIsGateBypass, isCompBypass: liveIsCompBypass,
                        isGainKnobActive,
                        activeGainKnob,
                        isGainKnobDragging,
                        mipmaps: liveMipmaps, mixMipmaps: liveMixMipmaps,
                        waveformCacheRef,
                        interactionDPR,
                    });
                }
            }
        }

        // Playback Logic — loop within golden box region
        const regionEndTime = (regionEndRef?.current ?? 1) * duration;
        const regionStartTime = (regionStartRef?.current ?? 0) * duration;
        if (currentPosition >= regionEndTime) {
            if (playBufferRef.current) {
                const targetBuffer = playingType === 'original' ? originalBuffer :
                    (isDeltaMode ? (fullAudioDataRef.current ? fullAudioDataRef.current.deltaBuffer : null) : originalBuffer);

                if (targetBuffer) {
                    playBufferRef.current(targetBuffer, playingType, regionStartTime);
                }
            }
        }

        // NOTE: animate does NOT self-schedule. The RAF loop is managed by
        // App.jsx via a stable wrapper that reads animateRef.current,
        // preventing zombie loops when animate is recreated (e.g. isDeltaMode change).
    }, [
        originalBuffer, audioContext, playingType, visualResult, zoomX, zoomY, panOffset, panOffsetY, isDeltaMode,
        visualStep, mipmaps, mixMipmaps, canvasDims,
        isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted, lastPlayedType,
        isGateBypass, isCompBypass, isGainKnobActive, activeGainKnob, isGainKnobDragging, interactionDPR, fullAudioDataRef, playBufferRef, startTimeRef, startOffsetRef, isPlayingRef,
        rafIdRef, waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef, playheadRef, meterStateRef, hoverGrRef, isHoveringGRAreaRef, isDraggingLineRef,
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
                playingType, lastPlayedType, isDeltaMode, dryGain,
                threshold, gateThreshold,
                mousePos, hoverLine,
                isDraggingLine: isDraggingLineRef.current,
                isCompAdjusting, hasThresholdBeenAdjusted,
                isGateAdjusting, hasGateBeenAdjusted,
                hoverGrRef,
                isHoveringGRAreaRef,
                isGateBypass, isCompBypass,
                isGainKnobActive,
                activeGainKnob,
                isGainKnobDragging,
                mipmaps, mixMipmaps,
                waveformCacheRef,
                interactionDPR,
            });
        }

        if (outputMeterCanvasRef.current) {
            drawDualMeter(outputMeterCanvasRef.current, 0, 0, 0, 0, meterStateRef.current, 0, hoverGrRef.current, 0, isHoveringGRAreaRef.current, hoveredMeterRef?.current);
        }
    }, [
        playingType, originalBuffer, visualResult, canvasDims, zoomX, zoomY, panOffset, panOffsetY,
        lastPlayedType, isDeltaMode, dryGain, threshold, gateThreshold,
        mousePos, hoverLine, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
        isGateBypass, isCompBypass, isGainKnobActive, activeGainKnob, isGainKnobDragging, interactionDPR, waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef, meterStateRef, hoverGrRef, isHoveringGRAreaRef, isDraggingLineRef,
        mipmaps, mixMipmaps
    ]);

    return animate;
};

export default useVisualizerLoop;
