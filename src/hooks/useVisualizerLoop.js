import { useEffect, useRef, useCallback } from 'react';

const LN10_OVER_20 = Math.LN10 / 20;       // Math.exp(db * LN10_OVER_20) ≡ Math.pow(10, db/20)
const TWENTY_LOG10E = 20 * Math.LOG10E;    // Math.log(x) * TWENTY_LOG10E ≡ 20 * Math.log10(x)
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
    canvasDims,
    zoomX,
    zoomY,
    panOffset,
    panOffsetY,
    playingTypeRef,
    lastPlayedTypeRef,
    outputPlayheadRef,
}) => {

    const waveformFrameRef = useRef(0);
    const waveformCacheRef = useRef({ key: null, imageData: null });
    const lastWaveformDrawKeyRef = useRef(null);

    const animate = useCallback(() => {
        if (!originalBuffer || !audioContext) return;
        if (!isPlayingRef.current) return;
        const elapsed = audioContext.currentTime - startTimeRef.current;
        let currentPosition = elapsed + startOffsetRef.current;

        const duration = originalBuffer.duration;

        // Update Playhead Position
        if (waveformCanvasRef.current && playheadRef.current) {
            const width = canvasDims.width;
            const totalWidth = width * zoomX;
            const pct = currentPosition / duration;
            const screenPct = (((pct * totalWidth) + panOffset) / width) * 100;
            playheadRef.current.style.left = `${screenPct}%`;
            playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
        }

        // Update Output Waveform Playhead
        if (outputPlayheadRef?.current) {
            const pct = (currentPosition / duration) * 100;
            outputPlayheadRef.current.style.left = `${pct}%`;
            outputPlayheadRef.current.style.opacity = (pct < 0 || pct > 100) ? 0 : 1;
        }

        if (visualResult) {
            // RMS Calculation
            const step = visualStep;
            // Prevent negative index access which causes NaNs
            const visualIndex = Math.max(0, Math.floor((currentPosition * audioContext.sampleRate) / step));
            const windowSize = Math.max(1, Math.floor(2048 / step));
            const endIdx = Math.min(visualIndex + windowSize, visualResult.outputData.length);

            let currentGR = 0;
            if (visualIndex < visualResult.grCurve.length && visualIndex >= 0) currentGR = visualResult.grCurve[visualIndex];

            let maxMix = 0; let maxInput = 0; let sumSqInput = 0; let sumSqMix = 0; let sampleCount = 0;

            // Determine if we should show processed signal
            // Use Refs to ensure we get the latest state even if the animation closure is stale
            const currentType = playingTypeRef ? playingTypeRef.current : playingType;
            const lastType = lastPlayedTypeRef ? lastPlayedTypeRef.current : lastPlayedType;

            const isProcessed = currentType === 'processed' || (currentType !== 'original' && lastType === 'processed');

            const dryLinear = Math.exp(dryGain * LN10_OVER_20);

            for (let i = visualIndex; i < endIdx; i++) {
                if (i >= visualResult.outputData.length) break;
                const dry = visualResult.visualInput[i] || 0; // Guard undefined
                const dryAbs = Math.abs(dry);
                if (dryAbs > maxInput) maxInput = dryAbs;
                sumSqInput += dry * dry;

                let mix = 0;
                if (isProcessed) {
                    const wet = visualResult.outputData[i] || 0; // Guard undefined
                    if (isDeltaMode) {
                        mix = wet - dry;
                    } else {
                        mix = wet + (dry * dryLinear);
                    }
                } else {
                    mix = visualResult.visualInput[i] || 0; // Guard undefined
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
                drawDualMeter(outputMeterCanvasRef.current, maxInput, maxMix, meterStateRef.current.dryRmsLevel, meterStateRef.current.outRmsLevel, meterStateRef.current, currentGR, hoverGrRef.current, meterStateRef.current.crestFactor);
            } else {
                drawDualMeter(outputMeterCanvasRef.current, maxInput, maxInput, meterStateRef.current.dryRmsLevel, meterStateRef.current.dryRmsLevel, meterStateRef.current, 0, hoverGrRef.current, meterStateRef.current.crestFactor);
            }

            // Draw Main Waveform at 30fps (every 2 frames); always draw when interacting
            waveformFrameRef.current = (waveformFrameRef.current + 1) % 2;
            const isInteracting = isDraggingLineRef.current || isCompAdjusting || isGateAdjusting;
            if (waveformFrameRef.current === 0 || isInteracting) {
                // Skip redundant draws: if no state affecting the waveform has changed, don't redraw
                let shouldDraw = true;
                if (!isInteracting) {
                    const drawKey = `${canvasDims.width}_${canvasDims.height}_${zoomX}_${zoomY}_${panOffset}_${panOffsetY}_${playingType}_${lastPlayedType}_${isDeltaMode}_${dryGain}_${threshold}_${gateThreshold}_${mousePos.x}_${mousePos.y}_${hoverLine}_${hasThresholdBeenAdjusted}_${hasGateBeenAdjusted}_${isGateBypass}_${isCompBypass}`;
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
                        isGateBypass, isCompBypass,
                        mipmaps, mixMipmaps,
                        waveformCacheRef,
                    });
                }
            }
        }

        // Playback Logic — restart from beginning when reaching end
        if (currentPosition >= duration) {
            if (playBufferRef.current) {
                const targetBuffer = playingType === 'original' ? originalBuffer :
                    (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);

                if (targetBuffer) {
                    playBufferRef.current(targetBuffer, playingType, 0);
                }
            }
        }

        rafIdRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafIdRef.current);
    }, [
        originalBuffer, audioContext, playingType, visualResult, zoomX, zoomY, panOffset, panOffsetY, dryGain, isDeltaMode,
        visualStep, mipmaps, mixMipmaps, canvasDims, threshold, gateThreshold, mousePos, hoverLine,
        isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted, lastPlayedType,
        isGateBypass, isCompBypass, fullAudioDataRef, playBufferRef, startTimeRef, startOffsetRef, isPlayingRef,
        rafIdRef, waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef, playheadRef, meterStateRef, hoverGrRef, isDraggingLineRef,
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
                isGateBypass, isCompBypass,
                mipmaps, mixMipmaps,
                waveformCacheRef,
            });
        }

        if (outputMeterCanvasRef.current) {
            drawDualMeter(outputMeterCanvasRef.current, 0, 0, 0, 0, meterStateRef.current, 0, hoverGrRef.current, 0);
        }
    }, [
        playingType, originalBuffer, visualResult, canvasDims, zoomX, zoomY, panOffset, panOffsetY,
        lastPlayedType, isDeltaMode, dryGain, threshold, gateThreshold,
        mousePos, hoverLine, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
        isGateBypass, isCompBypass, waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef, meterStateRef, hoverGrRef, isDraggingLineRef,
        mipmaps, mixMipmaps
    ]);

    return animate;
};

export default useVisualizerLoop;
