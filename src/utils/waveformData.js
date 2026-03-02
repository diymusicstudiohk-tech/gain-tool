import { selectMipmapLevel } from './mipmapCache';
import { displayAmp } from './displayMath';

/**
 * Compute waveform point arrays from audio data for canvas rendering.
 * Pure data transformation — no drawing involved.
 */
export const computeWaveformPoints = ({
    visualResult, width, zoomX, panOffset, centerY, ampScale,
    lastPlayedType,
    mipmaps, interactionDPR, step,
}) => {
    const srcInput = visualResult.visualInput;
    const srcOutput = visualResult.outputData;
    const srcLength = srcInput.length;

    const inPoints = []; const outPoints = [];

    const needsOutChannel = lastPlayedType === 'processed';

    // Viewport culling
    const loopStartX = Math.max(0, Math.floor(panOffset) - 1);
    const loopEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);

    // Select mipmap levels
    const useMipmaps = mipmaps && mipmaps.input && mipmaps.output;
    const mipmapBias = interactionDPR ? 1 : 0;
    let mmIn, mmOut;
    if (useMipmaps) {
        mmIn = selectMipmapLevel(mipmaps.input, step, mipmapBias);
        if (needsOutChannel) mmOut = selectMipmapLevel(mipmaps.output, step, mipmapBias);
    }

    for (let x = loopStartX; x < loopEndX; x++) {
        const vX = x - panOffset;
        const start = Math.floor(vX * step);
        const end = Math.floor((vX + 1) * step);
        if (start < 0 || start >= srcLength) continue;
        const safeEnd = Math.min(srcLength, end);
        let maxIn = 0; let maxOut = 0;
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
            } else {
                for (let i = loopStartIdx; i < safeEnd; i++) {
                    const absIn = Math.abs(srcInput[i]);
                    if (absIn > maxIn) maxIn = absIn;
                    if (needsOutChannel) { const absOut = Math.abs(srcOutput[i]); if (absOut > maxOut) maxOut = absOut; }
                }
            }
        } else {
            const idx = Math.min(Math.floor(loopStartIdx), srcLength - 1);
            if (idx >= 0) {
                maxIn = Math.abs(srcInput[idx]);
                if (needsOutChannel) maxOut = Math.abs(srcOutput[idx]);
            }
        }

        const hIn = displayAmp(maxIn) * ampScale;
        inPoints.push({ x, yTop: centerY - hIn, yBot: centerY + hIn });
        if (needsOutChannel) { const hOut = displayAmp(maxOut) * ampScale; outPoints.push({ x, yTop: centerY - hOut, yBot: centerY + hOut }); }
    }

    return { inPoints, outPoints };
};
