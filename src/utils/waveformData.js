import { selectMipmapLevel } from './mipmapCache';
import { displayAmp } from './displayMath';

/**
 * Compute waveform point arrays from audio data for canvas rendering.
 * Pure data transformation — no drawing involved.
 */
export const computeWaveformPoints = ({
    visualResult, width, zoomX, panOffset, centerY, ampScale, grMaxHeight,
    dryGain, isDeltaMode, lastPlayedType, isGainKnobActive,
    mipmaps, mixMipmaps, interactionDPR, step,
}) => {
    const srcInput = visualResult.visualInput;
    const srcOutput = visualResult.outputData;
    const srcGR = visualResult.grCurve;
    const srcLength = srcInput.length;

    const inPoints = []; const outPoints = []; const mixPoints = [];
    const grPoints = []; const deltaPoints = [];
    const diffOuterPoints = []; const diffInnerPoints = [];
    const dryLinear = Math.pow(10, dryGain / 20);

    const needsOutChannel = isGainKnobActive || isDeltaMode;

    // Viewport culling
    const loopStartX = Math.max(0, Math.floor(panOffset) - 1);
    const loopEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);

    // Select mipmap levels
    const useMipmaps = mipmaps && mipmaps.input && mipmaps.output && mipmaps.gr;
    const mipmapBias = interactionDPR ? 1 : 0;
    let mmIn, mmOut, mmGR, mmMix;
    if (useMipmaps) {
        mmIn = selectMipmapLevel(mipmaps.input, step, mipmapBias);
        if (needsOutChannel) mmOut = selectMipmapLevel(mipmaps.output, step, mipmapBias);
        mmGR = selectMipmapLevel(mipmaps.gr, step, mipmapBias);
        if (mixMipmaps && lastPlayedType === 'processed') {
            mmMix = selectMipmapLevel(mixMipmaps, step, mipmapBias);
        }
    }

    for (let x = loopStartX; x < loopEndX; x++) {
        const vX = x - panOffset;
        const start = Math.floor(vX * step);
        const end = Math.floor((vX + 1) * step);
        if (start < 0 || start >= srcLength) continue;
        const safeEnd = Math.min(srcLength, end);
        let maxIn = 0; let maxOut = 0; let minGR = 0; let maxMix = 0; let maxDelta = 0;
        const loopStartIdx = Math.max(start, 0);
        const count = safeEnd - loopStartIdx;

        if (count > 0) {
            if (useMipmaps) {
                const inLevel = mmIn.level; const inBS = mmIn.blockSize;
                const inStart = Math.floor(loopStartIdx / inBS); const inEnd = Math.ceil(safeEnd / inBS);
                for (let i = inStart; i < inEnd && i < inLevel.length; i++) { const a = Math.abs(inLevel[i]); if (a > maxIn) maxIn = a; }

                if (needsOutChannel) {
                    const outLevel = mmOut.level; const outBS = mmOut.blockSize;
                    const outStart = Math.floor(loopStartIdx / outBS); const outEnd = Math.ceil(safeEnd / outBS);
                    for (let i = outStart; i < outEnd && i < outLevel.length; i++) { const a = Math.abs(outLevel[i]); if (a > maxOut) maxOut = a; }
                }

                const grLevel = mmGR.level; const grBS = mmGR.blockSize;
                const grStart = Math.floor(loopStartIdx / grBS); const grEnd = Math.ceil(safeEnd / grBS);
                for (let i = grStart; i < grEnd && i < grLevel.length; i++) { if (grLevel[i] < minGR) minGR = grLevel[i]; }

                if (mmMix && lastPlayedType === 'processed') {
                    const mixLevel = mmMix.level; const mixBS = mmMix.blockSize;
                    const mixStart = Math.floor(loopStartIdx / mixBS); const mixEnd = Math.ceil(safeEnd / mixBS);
                    for (let i = mixStart; i < mixEnd && i < mixLevel.length; i++) { const a = Math.abs(mixLevel[i]); if (a > maxMix) maxMix = a; }
                }
                if (isDeltaMode) maxDelta = Math.abs(maxIn - maxOut);
            } else {
                for (let i = loopStartIdx; i < safeEnd; i++) {
                    const absIn = Math.abs(srcInput[i]); const grVal = srcGR[i];
                    if (absIn > maxIn) maxIn = absIn; if (grVal < minGR) minGR = grVal;
                    if (needsOutChannel) { const absOut = Math.abs(srcOutput[i]); if (absOut > maxOut) maxOut = absOut; }
                    if (isDeltaMode) { const d = Math.abs(srcInput[i] - srcOutput[i]); if (d > maxDelta) maxDelta = d; }
                    if (lastPlayedType === 'processed') { const mixVal = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (mixVal > maxMix) maxMix = mixVal; }
                }
            }
        } else {
            const idx = Math.min(Math.floor(loopStartIdx), srcLength - 1);
            if (idx >= 0) {
                maxIn = Math.abs(srcInput[idx]); minGR = srcGR[idx];
                if (needsOutChannel) maxOut = Math.abs(srcOutput[idx]);
                if (isDeltaMode) maxDelta = Math.abs(srcInput[idx] - srcOutput[idx]);
                if (lastPlayedType === 'processed') maxMix = Math.abs(srcOutput[idx] + (srcInput[idx] * dryLinear));
            }
        }

        const hIn = displayAmp(maxIn) * ampScale; const hMix = displayAmp(maxMix) * ampScale;
        inPoints.push({ x, yTop: centerY - hIn, yBot: centerY + hIn });
        if (needsOutChannel) { const hOut = displayAmp(maxOut) * ampScale; outPoints.push({ x, yTop: centerY - hOut, yBot: centerY + hOut }); }
        if (isDeltaMode) { const hDelta = displayAmp(maxDelta) * ampScale; deltaPoints.push({ x, yTop: centerY - hDelta, yBot: centerY + hDelta }); }
        if (lastPlayedType === 'processed') mixPoints.push({ x, yTop: centerY - hMix, yBot: centerY + hMix });
        if (isDeltaMode && lastPlayedType === 'processed') {
            const hLarger = Math.max(hIn, hMix);
            const hSmaller = Math.min(hIn, hMix);
            diffOuterPoints.push({ x, yTop: centerY - hLarger, yBot: centerY + hLarger });
            diffInnerPoints.push({ x, yTop: centerY - hSmaller, yBot: centerY + hSmaller });
        }
        if (minGR < 0 && lastPlayedType === 'processed') { const yPos = (1.0 - Math.pow(10, minGR / 20)) * grMaxHeight; grPoints.push({ x, y: yPos }); }
        else if (lastPlayedType === 'processed') { grPoints.push({ x, y: 0 }); }
    }

    return { inPoints, outPoints, mixPoints, grPoints, deltaPoints, diffOuterPoints, diffInnerPoints };
};
