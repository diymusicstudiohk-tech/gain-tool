import { useEffect, useRef, useCallback } from 'react';
import { drawMainWaveform } from '../components/visualizer/Waveform';
import { drawDualMeter, drawGRBar, drawCrestFactorMeter } from '../components/visualizer/Meters';

const useVisualizerLoop = ({
    audioContext,
    originalBuffer,
    playingType,
    lastPlayedType,
    isDeltaMode,
    dryGain,
    threshold,
    gateThreshold,
    loopStart,
    loopEnd,
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
    visualSourceCache,
    fullAudioDataRef,
    playBufferRef,
    startTimeRef,
    startOffsetRef,
    isPlayingRef,
    rafIdRef,
    waveformCanvasRef,
    grBarCanvasRef,
    outputMeterCanvasRef,
    cfMeterCanvasRef, // [NEW]
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
    signalFlowMode
}) => {

    const animate = useCallback(() => {
        if (!originalBuffer || !audioContext) return;
        if (!isPlayingRef.current) return;
        const elapsed = audioContext.currentTime - startTimeRef.current;
        let currentPosition = elapsed + startOffsetRef.current;

        // Visual Loop Correction
        if (loopStart !== null && loopEnd !== null && isPlayingRef.current) {
            if (currentPosition >= loopEnd) {
                // Calculate relative position within the loop
                const loopDuration = loopEnd - loopStart;
                const timeSinceLoopStart = currentPosition - loopStart;
                // Wrap around
                currentPosition = loopStart + (timeSinceLoopStart % loopDuration);
            }
        }
        const duration = originalBuffer.duration;

        // Update Playhead Position
        if (waveformCanvasRef.current && playheadRef.current) {
            const width = waveformCanvasRef.current.width;
            const totalWidth = width * zoomX;
            const pct = currentPosition / duration;
            const screenPct = (((pct * totalWidth) + panOffset) / width) * 100;
            playheadRef.current.style.left = `${screenPct}%`;
            playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
        }

        if (visualResult) {
            // RMS Calculation
            const step = visualSourceCache.step;
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

            const dryLinear = dryGain <= -60 ? 0 : Math.pow(10, dryGain / 20);

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
                        // Logic: mix = wet + (dry * dryLinear)
                        // Note: If dryLinear is 0, mix == wet.
                        mix = wet + (dry * dryLinear);
                    }
                } else {
                    mix = visualResult.visualInput[i] || 0; // Guard undefined
                }

                // Debug Trigger
                if (i === visualIndex && Math.random() < 0.005) {
                    console.log('[VizDebug]', {
                        isProcessed,
                        isDeltaMode,
                        dryLinear,
                        mix,
                        currentInput: visualResult.visualInput[i],
                        currentOutput: visualResult.outputData ? visualResult.outputData[i] : 'no-out',
                        currentType,
                        lastType,
                        playingType
                    });
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
            // Only calculate if we have signal to avoid infinity
            if (currentOutRms > 0.0001 && maxMix > 0.0001) {
                const peakDb = 20 * Math.log10(maxMix);
                const rmsDb = 20 * Math.log10(currentOutRms);
                currentInstantCF = peakDb - rmsDb;
            } else {
                currentInstantCF = 0; // Fallback to 0 if silent
            }

            // Smoothing for CF (EMA) - User requested 0.9 / 0.1
            // But let's check if meterStateRef.current.crestFactor exists (it should, initialized in App)
            if (meterStateRef.current.crestFactor === undefined) meterStateRef.current.crestFactor = 0;

            meterStateRef.current.crestFactor = meterStateRef.current.crestFactor * 0.9 + currentInstantCF * 0.1;

            // Draw Meters
            drawGRBar(grBarCanvasRef.current, isProcessed ? currentGR : 0, meterStateRef.current, hoverGrRef.current);
            drawCrestFactorMeter(cfMeterCanvasRef.current, meterStateRef.current.crestFactor); // [NEW]

            if (isProcessed) {
                drawDualMeter(outputMeterCanvasRef.current, maxInput, maxMix, meterStateRef.current.dryRmsLevel, meterStateRef.current.outRmsLevel, meterStateRef.current);
            } else {
                drawDualMeter(outputMeterCanvasRef.current, maxInput, maxInput, meterStateRef.current.dryRmsLevel, meterStateRef.current.dryRmsLevel, meterStateRef.current);
            }

            // Draw Main Waveform
            drawMainWaveform({
                canvas: waveformCanvasRef.current,
                canvasDims,
                visualResult,
                originalBuffer,
                zoomX, zoomY, panOffset, panOffsetY,
                playingType, lastPlayedType, isDeltaMode, dryGain,
                threshold, gateThreshold,
                loopStart, loopEnd,
                mousePos, hoverLine,
                isDraggingLine: isDraggingLineRef.current,
                isCompAdjusting, hasThresholdBeenAdjusted,
                isGateAdjusting, hasGateBeenAdjusted,
                hoverGrRef,
                isGateBypass, isCompBypass,
                signalFlowMode
            });
        }

        // Loop & Playback Logic
        if (loopStart !== null && loopEnd !== null) {
            // Only enforce loop if we are theoretically "in" the loop or just passed it.
            // If the user started playback WAY past the loop (e.g. seeking to outro), allowing them to play freely.
            // Logic: If currentPosition > loopEnd, AND startOffset < loopEnd (meaning we played INTO the boundary), then loop.
            // Native looping handles the audio. We just need to ensure the visual playhead wraps correctly.
            // No manual restart needed here.
        } else if (currentPosition >= duration) {
            if (playBufferRef.current) {
                const targetBuffer = playingType === 'original' ? originalBuffer :
                    (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);

                if (targetBuffer) {
                    // Fix: If loop is active, jump to loop start instead of 0
                    if (loopStart !== null && loopEnd !== null) {
                        playBufferRef.current(targetBuffer, playingType, loopStart);
                    } else {
                        playBufferRef.current(targetBuffer, playingType, 0);
                    }
                }
            }
        }

        rafIdRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafIdRef.current);
    }, [
        originalBuffer, audioContext, playingType, visualResult, zoomX, zoomY, panOffset, panOffsetY, dryGain, isDeltaMode,
        visualSourceCache, loopStart, loopEnd, canvasDims, threshold, gateThreshold, mousePos, hoverLine,
        isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted, lastPlayedType,
        isGateBypass, isCompBypass, fullAudioDataRef, playBufferRef, startTimeRef, startOffsetRef, isPlayingRef,
        rafIdRef, waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef, playheadRef, meterStateRef, hoverGrRef, isDraggingLineRef,
        signalFlowMode // [NEW] Dep
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
                loopStart, loopEnd,
                mousePos, hoverLine,
                isDraggingLine: isDraggingLineRef.current,
                isCompAdjusting, hasThresholdBeenAdjusted,
                isGateAdjusting, hasGateBeenAdjusted,
                hoverGrRef,
                isGateBypass, isCompBypass,
                signalFlowMode
            });
        }

        if (grBarCanvasRef.current) {
            drawGRBar(grBarCanvasRef.current, 0, meterStateRef.current, hoverGrRef.current);
        }
        if (outputMeterCanvasRef.current) {
            drawDualMeter(outputMeterCanvasRef.current, 0, 0, 0, 0, meterStateRef.current);
        }
        if (cfMeterCanvasRef.current) {
            drawCrestFactorMeter(cfMeterCanvasRef.current, 0);
        }
    }, [
        playingType, originalBuffer, visualResult, canvasDims, zoomX, zoomY, panOffset, panOffsetY,
        lastPlayedType, isDeltaMode, dryGain, threshold, gateThreshold, loopStart, loopEnd,
        mousePos, hoverLine, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
        mousePos, hoverLine, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
        isGateBypass, isCompBypass, waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef, meterStateRef, hoverGrRef, isDraggingLineRef,
        signalFlowMode // [NEW] Dep
    ]);

    return animate;
};

export default useVisualizerLoop;
