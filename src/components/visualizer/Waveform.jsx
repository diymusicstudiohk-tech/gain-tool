import React from 'react';
import { selectMipmapLevel } from '../../utils/mipmapCache';
import { displayAmp, linearFromDisplay, computeWaveformGeometry } from '../../utils/displayMath';
import {
    GOLD, BRICK_RED, CLIP_RED, HOVER_RED, ORIGINAL_RED, GREEN,
    COMP_BLUE, BG_PANEL, INACTIVE, TEXT_DIM,
} from '../../utils/colors';
import { drawPolygon, drawPolygonWithPeakFade, drawHatchedPolygon, drawGRLine } from '../../utils/canvasPolygons';
import { drawDbGrid } from '../../utils/canvasGrid';
import { computeWaveformPoints } from '../../utils/waveformData';
import { drawThresholdLine } from '../../utils/canvasThresholdLines';
import { drawCrosshair, drawGainTooltip, drawThresholdTooltip } from '../../utils/canvasOverlay';

// --- Main Draw Logic (Exported for App.jsx) ---

export const drawMainWaveform = ({
    canvas, canvasDims, visualResult, originalBuffer,
    zoomX, zoomY, panOffset, panOffsetY,
    playingType, lastPlayedType, isDeltaMode, dryGain,
    threshold, gateThreshold,
    mousePos, hoverLine, isDraggingLine, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
    hoverGrRef, // ref object
    isHoveringGRAreaRef, // ref object — true when mouse is in GR curve area
    isGateBypass, isCompBypass,
    isGainKnobActive,
    activeGainKnob, // 'makeup' | 'dryGain' | null
    isGainKnobDragging,
    mipmaps, mixMipmaps, // mipmap data
    waveformCacheRef,   // { current: { key, imageData } } — optional ImageData cache
    interactionDPR,     // number | null — force lower DPR during interaction
}) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDims;
    const dpr = interactionDPR || (window.devicePixelRatio || 1);
    const physW = Math.round(width * dpr);
    const physH = Math.round(height * dpr);
    if (canvas.width !== physW) canvas.width = physW;
    if (canvas.height !== physH) canvas.height = physH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!visualResult) {
        ctx.setLineDash([]); ctx.fillStyle = BG_PANEL; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = TEXT_DIM; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('請載入音訊...', width / 2, height / 2); return;
    }

    // ── Cache key ──
    const adjustBit = (isCompAdjusting || isGateAdjusting) ? 1 : 0;
    const cacheKey = `${physW}x${physH}_${zoomX.toFixed(4)}_${Math.round(panOffset)}_${Math.round(panOffsetY)}_${zoomY.toFixed(3)}_${playingType}_${lastPlayedType}_${isDeltaMode?1:0}_${dryGain.toFixed(2)}_${adjustBit}_${isGainKnobActive?1:0}_${activeGainKnob||''}_${isGateBypass?1:0}_${isCompBypass?1:0}`;

    const cache = waveformCacheRef?.current;
    const isAnyDrag = isDraggingLine || isCompAdjusting || isGateAdjusting || isGainKnobDragging;
    const cacheHit = isAnyDrag ? (cache?.imageData) : (cache?.key === cacheKey && cache?.imageData);

    // ── PHASE 1: Waveform background (skip when cache hit) ──
    if (!cacheHit) {
        ctx.setLineDash([]); ctx.fillStyle = BG_PANEL; ctx.fillRect(0, 0, width, height);

        try {
            const srcLength = visualResult.visualInput.length;
            const step = srcLength / (width * zoomX);
            if (!Number.isFinite(step) || step <= 0) return;

            const { centerY, maxPixelHeight, ampScale, grMaxHeight } = computeWaveformGeometry(height, zoomY, panOffsetY);

            drawDbGrid(ctx, width, height, centerY, ampScale);

            const { inPoints, outPoints, mixPoints, grPoints, deltaPoints, diffOuterPoints, diffInnerPoints } = computeWaveformPoints({
                visualResult, width, zoomX, panOffset, centerY, ampScale, grMaxHeight,
                dryGain, isDeltaMode, lastPlayedType, isGainKnobActive,
                mipmaps, mixMipmaps, interactionDPR, step,
            });

            // Draw Polygons
            if (lastPlayedType === 'original') { drawPolygonWithPeakFade(ctx, inPoints, ORIGINAL_RED, width, centerY); }
            else if (isDeltaMode) {
                drawPolygonWithPeakFade(ctx, diffOuterPoints, GREEN, width, centerY, 0.85, 0.25);
                drawPolygonWithPeakFade(ctx, diffInnerPoints, BG_PANEL, width, centerY, 1.0, 0.0);
            }
            else {
                const redOpacity = (isCompAdjusting || isGateAdjusting) ? 1.0 : 0.5;
                drawPolygonWithPeakFade(ctx, inPoints, BRICK_RED, width, centerY, redOpacity);
                drawPolygonWithPeakFade(ctx, mixPoints, '#ffffff', width, centerY, 1.0, 0.2);

                if (isGainKnobActive) {
                    if (activeGainKnob === 'makeup') {
                        drawPolygon(ctx, outPoints, GOLD, width, centerY);
                    } else if (activeGainKnob === 'dryGain') {
                        drawHatchedPolygon(ctx, mixPoints, GOLD, width, centerY);
                        drawPolygon(ctx, outPoints, '#ffffff', width, centerY);
                    }
                }
            }
            if (grPoints.length > 0) drawGRLine(ctx, grPoints, CLIP_RED);

            // Save background to cache
            if (waveformCacheRef) {
                try {
                    waveformCacheRef.current = { key: cacheKey, imageData: ctx.getImageData(0, 0, physW, physH) };
                } catch (_) { /* cross-origin or memory guard — skip caching */ }
            }

        } catch (e) {
            console.error("Draw error:", e);
            return;
        }
    } else {
        ctx.putImageData(cache.imageData, 0, 0);
    }

    // ── PHASE 2: Overlay — always drawn (threshold lines + mouse inspection) ──
    if (isHoveringGRAreaRef) isHoveringGRAreaRef.current = false;

    const srcLength = visualResult.visualInput.length;
    const step = srcLength / (width * zoomX);
    if (!Number.isFinite(step) || step <= 0) return;

    const { centerY, maxPixelHeight, ampScale, grMaxHeight } = computeWaveformGeometry(height, zoomY, panOffsetY);

    const useMipmaps = mipmaps && mipmaps.input && mipmaps.output && mipmaps.gr;
    const mipmapBias = interactionDPR ? 1 : 0;
    const mmGR = useMipmaps ? selectMipmapLevel(mipmaps.gr, step, mipmapBias) : null;

    // Mouse GR Inspection + Hover Layers
    if (mousePos.x >= 0 && lastPlayedType === 'processed') {
        // --- Detect hover on wet area, dry-contribution area, or brick-red area ---
        let isHoveringOnWetArea = false;
        let isHoveringOnDryArea = false;
        let isHoveringOnWaveform = false;
        let isHoveringOnBrickRed = false;
        const srcOutput = visualResult.outputData;
        const srcInput = visualResult.visualInput;
        const dryLinear = Math.pow(10, dryGain / 20);
        if (!isDeltaMode)
        {
            const hvX = mousePos.x - panOffset;
            const hStart = Math.floor(hvX * step);
            const hEnd = Math.min(Math.floor((hvX + 1) * step), srcLength);
            if (hStart >= 0 && hStart < srcLength) {
                let maxMix = 0;
                let maxOut = 0;
                let maxIn = 0;
                if (useMipmaps && mixMipmaps) {
                    const mm = selectMipmapLevel(mixMipmaps, step, mipmapBias);
                    const lv = mm.level; const bs = mm.blockSize;
                    const s0 = Math.floor(hStart / bs); const e0 = Math.ceil(hEnd / bs);
                    for (let i = s0; i < e0 && i < lv.length; i++) { const a = Math.abs(lv[i]); if (a > maxMix) maxMix = a; }
                } else {
                    for (let i = hStart; i < hEnd; i++) {
                        const v = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear));
                        if (v > maxMix) maxMix = v;
                    }
                }
                if (useMipmaps && mipmaps && mipmaps.output) {
                    const mmO = selectMipmapLevel(mipmaps.output, step, mipmapBias);
                    const oLv = mmO.level; const oBs = mmO.blockSize;
                    const oS = Math.floor(hStart / oBs); const oE = Math.ceil(hEnd / oBs);
                    for (let i = oS; i < oE && i < oLv.length; i++) { const a = Math.abs(oLv[i]); if (a > maxOut) maxOut = a; }
                } else {
                    for (let i = hStart; i < hEnd; i++) {
                        const a = Math.abs(srcOutput[i]);
                        if (a > maxOut) maxOut = a;
                    }
                }
                if (useMipmaps && mipmaps && mipmaps.input) {
                    const mmIn = selectMipmapLevel(mipmaps.input, step, mipmapBias);
                    const inLv = mmIn.level; const inBs = mmIn.blockSize;
                    const inS = Math.floor(hStart / inBs); const inE = Math.ceil(hEnd / inBs);
                    for (let i = inS; i < inE && i < inLv.length; i++) { const a = Math.abs(inLv[i]); if (a > maxIn) maxIn = a; }
                } else {
                    for (let i = hStart; i < hEnd; i++) {
                        const a = Math.abs(srcInput[i]);
                        if (a > maxIn) maxIn = a;
                    }
                }
                const hMix = displayAmp(maxMix) * ampScale;
                const hOut = displayAmp(maxOut) * ampScale;
                const hIn = displayAmp(maxIn) * ampScale;
                if (mousePos.y >= centerY - hOut && mousePos.y <= centerY + hOut) {
                    isHoveringOnWetArea = true;
                    isHoveringOnWaveform = true;
                } else if (mousePos.y >= centerY - hMix && mousePos.y <= centerY + hMix) {
                    isHoveringOnDryArea = true;
                    isHoveringOnWaveform = true;
                } else if (mousePos.y >= centerY - hIn && mousePos.y <= centerY + hIn) {
                    isHoveringOnBrickRed = true;
                }
            }
        }

        // --- Draw hover layers (below crosshair/labels) ---
        if (isHoveringOnWaveform) {
            const outPts = []; const mixPts = [];
            const hlStartX = Math.max(0, Math.floor(panOffset) - 1);
            const hlEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);
            let hmOut, hmMix;
            if (useMipmaps) {
                hmOut = selectMipmapLevel(mipmaps.output, step, mipmapBias);
                if (mixMipmaps) hmMix = selectMipmapLevel(mixMipmaps, step, mipmapBias);
            }
            for (let x = hlStartX; x < hlEndX; x++) {
                const vx = x - panOffset;
                const s = Math.floor(vx * step); const e = Math.floor((vx + 1) * step);
                if (s < 0 || s >= srcLength) continue;
                const se = Math.min(srcLength, e);
                let mxOut = 0; let mxMix = 0;
                const ls = Math.max(s, 0);
                if (se - ls > 0) {
                    if (useMipmaps) {
                        const oL = hmOut.level; const oB = hmOut.blockSize;
                        const os = Math.floor(ls / oB); const oe = Math.ceil(se / oB);
                        for (let i = os; i < oe && i < oL.length; i++) { const a = Math.abs(oL[i]); if (a > mxOut) mxOut = a; }
                        if (hmMix) {
                            const mL = hmMix.level; const mB = hmMix.blockSize;
                            const ms = Math.floor(ls / mB); const me = Math.ceil(se / mB);
                            for (let i = ms; i < me && i < mL.length; i++) { const a = Math.abs(mL[i]); if (a > mxMix) mxMix = a; }
                        } else {
                            for (let i = ls; i < se; i++) { const v = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (v > mxMix) mxMix = v; }
                        }
                    } else {
                        for (let i = ls; i < se; i++) {
                            const aO = Math.abs(srcOutput[i]); if (aO > mxOut) mxOut = aO;
                            const mV = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (mV > mxMix) mxMix = mV;
                        }
                    }
                } else {
                    const idx = Math.min(Math.floor(ls), srcLength - 1);
                    if (idx >= 0) {
                        mxOut = Math.abs(srcOutput[idx]);
                        mxMix = Math.abs(srcOutput[idx] + (srcInput[idx] * dryLinear));
                    }
                }
                const hO = displayAmp(mxOut) * ampScale;
                const hM = displayAmp(mxMix) * ampScale;
                outPts.push({ x, yTop: centerY - hO, yBot: centerY + hO });
                mixPts.push({ x, yTop: centerY - hM, yBot: centerY + hM });
            }
            if (isHoveringOnDryArea) {
                drawHatchedPolygon(ctx, mixPts, GOLD, width, centerY);
                drawPolygon(ctx, outPts, '#ffffff', width, centerY);
            } else {
                drawPolygon(ctx, outPts, GOLD, width, centerY);
            }
        }

        // --- Draw brick-red hover overlay (bright red) ---
        if (isHoveringOnBrickRed) {
            const inPts = []; const mxPts = [];
            const brStartX = Math.max(0, Math.floor(panOffset) - 1);
            const brEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);
            let hmIn, hmMix2;
            if (useMipmaps) {
                hmIn = selectMipmapLevel(mipmaps.input, step, mipmapBias);
                if (mixMipmaps) hmMix2 = selectMipmapLevel(mixMipmaps, step, mipmapBias);
            }
            for (let x = brStartX; x < brEndX; x++) {
                const vx = x - panOffset;
                const s = Math.floor(vx * step); const e = Math.floor((vx + 1) * step);
                if (s < 0 || s >= srcLength) continue;
                const se = Math.min(srcLength, e);
                let mxIn = 0; let mxMix = 0;
                const ls = Math.max(s, 0);
                if (se - ls > 0) {
                    if (useMipmaps) {
                        const iL = hmIn.level; const iB = hmIn.blockSize;
                        const is0 = Math.floor(ls / iB); const ie0 = Math.ceil(se / iB);
                        for (let i = is0; i < ie0 && i < iL.length; i++) { const a = Math.abs(iL[i]); if (a > mxIn) mxIn = a; }
                        if (hmMix2) {
                            const mL = hmMix2.level; const mB = hmMix2.blockSize;
                            const ms = Math.floor(ls / mB); const me = Math.ceil(se / mB);
                            for (let i = ms; i < me && i < mL.length; i++) { const a = Math.abs(mL[i]); if (a > mxMix) mxMix = a; }
                        } else {
                            for (let i = ls; i < se; i++) { const v = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (v > mxMix) mxMix = v; }
                        }
                    } else {
                        for (let i = ls; i < se; i++) {
                            const aI = Math.abs(srcInput[i]); if (aI > mxIn) mxIn = aI;
                            const mV = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (mV > mxMix) mxMix = mV;
                        }
                    }
                } else {
                    const idx = Math.min(Math.floor(ls), srcLength - 1);
                    if (idx >= 0) {
                        mxIn = Math.abs(srcInput[idx]);
                        mxMix = Math.abs(srcOutput[idx] + (srcInput[idx] * dryLinear));
                    }
                }
                const hI = displayAmp(mxIn) * ampScale;
                const hM = displayAmp(mxMix) * ampScale;
                inPts.push({ x, yTop: centerY - hI, yBot: centerY + hI });
                mxPts.push({ x, yTop: centerY - hM, yBot: centerY + hM });
            }
            drawPolygonWithPeakFade(ctx, inPts, HOVER_RED, width, centerY);
            drawPolygonWithPeakFade(ctx, mxPts, '#ffffff', width, centerY, 1.0, 0.2);
        }

        // --- GR value computation ---
        const srcGR = visualResult.grCurve;
        const vX = mousePos.x - panOffset;
        const start = Math.floor(vX * step);
        const end = Math.floor((vX + 1) * step);
        let hoverGR = 0;
        if (start >= 0 && start < srcLength) {
            if (useMipmaps && mmGR) {
                const grLevel = mmGR.level; const grBS = mmGR.blockSize;
                const grStart = Math.floor(start / grBS);
                const grEnd = Math.ceil(Math.min(end, srcLength) / grBS);
                hoverGR = grLevel[grStart] || 0;
                for (let i = grStart + 1; i < grEnd && i < grLevel.length; i++) { if (grLevel[i] < hoverGR) hoverGR = grLevel[i]; }
            } else {
                hoverGR = srcGR[start];
                const safeEnd = Math.min(end, srcLength);
                for (let i = start + 1; i < safeEnd; i++) { if (srcGR[i] < hoverGR) hoverGR = srcGR[i]; }
            }
        }
        if (hoverGrRef) hoverGrRef.current = hoverGR;

        // --- GR Area Hover Detection + Gradient Fill ---
        if (isHoveringGRAreaRef && playingType === 'none' && lastPlayedType === 'processed' && hoverGR < -0.1) {
            const grCurveY = (1.0 - Math.pow(10, hoverGR / 20)) * grMaxHeight;
            if (mousePos.y >= 0 && mousePos.y <= grCurveY) {
                isHoveringGRAreaRef.current = true;

                const grFillStartX = Math.max(0, Math.floor(panOffset) - 1);
                const grFillEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(grFillStartX, 0);
                ctx.lineTo(grFillEndX, 0);

                for (let x = grFillEndX - 1; x >= grFillStartX; x--) {
                    const vx = x - panOffset;
                    const s = Math.floor(vx * step);
                    const e = Math.floor((vx + 1) * step);
                    if (s < 0 || s >= srcLength) { ctx.lineTo(x, 0); continue; }
                    const se = Math.min(srcLength, e);
                    let minGR = 0;
                    const ls = Math.max(s, 0);
                    if (useMipmaps && mmGR) {
                        const grLevel = mmGR.level; const grBS = mmGR.blockSize;
                        const grStart = Math.floor(ls / grBS); const grEnd = Math.ceil(se / grBS);
                        for (let i = grStart; i < grEnd && i < grLevel.length; i++) { if (grLevel[i] < minGR) minGR = grLevel[i]; }
                    } else {
                        const srcGRArr = visualResult.grCurve;
                        for (let i = ls; i < se; i++) { if (srcGRArr[i] < minGR) minGR = srcGRArr[i]; }
                    }
                    const yPos = minGR < 0 ? (1.0 - Math.pow(10, minGR / 20)) * grMaxHeight : 0;
                    ctx.lineTo(x, yPos);
                }
                ctx.closePath();

                const grGrad = ctx.createLinearGradient(0, 0, 0, grMaxHeight);
                grGrad.addColorStop(0, 'rgba(181, 76, 53, 0)');
                grGrad.addColorStop(1, 'rgba(181, 76, 53, 1.0)');
                ctx.fillStyle = grGrad;
                ctx.fill();

                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = CLIP_RED;
                ctx.lineWidth = 1.5;
                ctx.moveTo(mousePos.x, grCurveY);
                ctx.lineTo(width, grCurveY);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // --- Legends ---
        const bgX = mousePos.x + 12;

        if (isHoveringOnWetArea || isHoveringOnDryArea) {
            const legendText = isHoveringOnWetArea
                ? '金色實色 = 壓縮後訊號'
                : '金色斜線 = 額外補回的乾訊號';
            ctx.font = 'bold 11px sans-serif';
            const lw = ctx.measureText(legendText).width;
            const legendPadX = 10;
            const legendW = lw + legendPadX * 2;
            const legendH = 28;
            const goldTooltipBottom = mousePos.y - 24 - 8;
            let legendX = bgX;
            let legendY = goldTooltipBottom - legendH - 4;
            if (legendX + legendW > width) legendX = width - legendW - 2;
            if (legendY < 2) legendY = mousePos.y + 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(legendX, legendY, legendW, legendH);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
            ctx.fillText(legendText, legendX + legendPadX, legendY + 18);
        }

        if (isHoveringOnBrickRed) {
            const legendText = '紅色 = 被壓縮處理減少了的訊號';
            ctx.font = 'bold 11px sans-serif';
            const lw = ctx.measureText(legendText).width;
            const legendPadX = 10;
            const legendW = lw + legendPadX * 2;
            const legendH = 28;
            const goldTooltipBottom = mousePos.y - 24 - 8;
            let legendX = bgX;
            let legendY = goldTooltipBottom - legendH - 4;
            if (legendX + legendW > width) legendX = width - legendW - 2;
            if (legendY < 2) legendY = mousePos.y + 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(legendX, legendY, legendW, legendH);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
            ctx.fillText(legendText, legendX + legendPadX, legendY + 18);
        }

    }

    // Bypass (original) mode: hover detection + legend for brick-red waveform
    if (mousePos.x >= 0 && lastPlayedType === 'original') {
        let isHoveringOnOriginalWaveform = false;
        const srcInput = visualResult.visualInput;
        const hvX = mousePos.x - panOffset;
        const hStart = Math.floor(hvX * step);
        const hEnd = Math.min(Math.floor((hvX + 1) * step), srcLength);
        if (hStart >= 0 && hStart < srcLength) {
            let maxIn = 0;
            if (useMipmaps && mipmaps && mipmaps.input) {
                const mmIn = selectMipmapLevel(mipmaps.input, step, mipmapBias);
                const inLv = mmIn.level; const inBs = mmIn.blockSize;
                const inS = Math.floor(hStart / inBs); const inE = Math.ceil(hEnd / inBs);
                for (let i = inS; i < inE && i < inLv.length; i++) { const a = Math.abs(inLv[i]); if (a > maxIn) maxIn = a; }
            } else {
                for (let i = hStart; i < hEnd; i++) {
                    const a = Math.abs(srcInput[i]);
                    if (a > maxIn) maxIn = a;
                }
            }
            const hIn = displayAmp(maxIn) * ampScale;
            if (mousePos.y >= centerY - hIn && mousePos.y <= centerY + hIn) {
                isHoveringOnOriginalWaveform = true;
            }
        }

        if (isHoveringOnOriginalWaveform) {
            const inPts = [];
            const brStartX = Math.max(0, Math.floor(panOffset) - 1);
            const brEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);
            let hmIn;
            if (useMipmaps && mipmaps && mipmaps.input) {
                hmIn = selectMipmapLevel(mipmaps.input, step, mipmapBias);
            }
            for (let x = brStartX; x < brEndX; x++) {
                const vx = x - panOffset;
                const s = Math.floor(vx * step); const e = Math.floor((vx + 1) * step);
                if (s < 0 || s >= srcLength) continue;
                const se = Math.min(srcLength, e);
                let mxIn = 0;
                const ls = Math.max(s, 0);
                if (se - ls > 0) {
                    if (useMipmaps && hmIn) {
                        const iL = hmIn.level; const iB = hmIn.blockSize;
                        const is0 = Math.floor(ls / iB); const ie0 = Math.ceil(se / iB);
                        for (let i = is0; i < ie0 && i < iL.length; i++) { const a = Math.abs(iL[i]); if (a > mxIn) mxIn = a; }
                    } else {
                        for (let i = ls; i < se; i++) {
                            const aI = Math.abs(srcInput[i]); if (aI > mxIn) mxIn = aI;
                        }
                    }
                } else {
                    const idx = Math.min(Math.floor(ls), srcLength - 1);
                    if (idx >= 0) { mxIn = Math.abs(srcInput[idx]); }
                }
                const hI = displayAmp(mxIn) * ampScale;
                inPts.push({ x, yTop: centerY - hI, yBot: centerY + hI });
            }
            drawPolygonWithPeakFade(ctx, inPts, HOVER_RED, width, centerY);

            const bgX = mousePos.x + 12;
            const legendText = '紅色 = 原始未處理訊號 (Bypass)';
            ctx.font = 'bold 11px sans-serif';
            const lw = ctx.measureText(legendText).width;
            const legendPadX = 10;
            const legendW = lw + legendPadX * 2;
            const legendH = 28;
            const goldTooltipBottom = mousePos.y - 24 - 8;
            let legendX = bgX;
            let legendY = goldTooltipBottom - legendH - 4;
            if (legendX + legendW > width) legendX = width - legendW - 2;
            if (legendY < 2) legendY = mousePos.y + 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(legendX, legendY, legendW, legendH);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
            ctx.fillText(legendText, legendX + legendPadX, legendY + 18);
        }
    }

    // ── Crosshair + Gain Tooltip ──
    if (mousePos.x >= 0 && mousePos.y >= 0) {
        drawCrosshair(ctx, mousePos, width, height);
        drawGainTooltip(ctx, mousePos, centerY, ampScale, width);
    }

    // ── Threshold Lines ──
    const isDry = lastPlayedType === 'original';

    if (!isCompBypass && !isDeltaMode) {
        drawThresholdLine(ctx, {
            thresholdDb: threshold,
            color: isDry || isCompBypass ? INACTIVE : COMP_BLUE,
            isHighlight: hoverLine === 'comp' || isDraggingLine === 'comp',
            centerY, ampScale, width, height,
        });
    }

    if (!isGateBypass && !isDeltaMode) {
        drawThresholdLine(ctx, {
            thresholdDb: gateThreshold,
            color: isDry || isGateBypass ? INACTIVE : GREEN,
            isHighlight: hoverLine === 'gate' || isDraggingLine === 'gate',
            centerY, ampScale, width, height,
        });
    }
    ctx.setLineDash([]);

    // ── Threshold Tooltips ──
    if ((hoverLine === 'comp' || isDraggingLine === 'comp') && mousePos.x >= 0) {
        drawThresholdTooltip(ctx, mousePos, 'comp', threshold, width);
    }
    if ((hoverLine === 'gate' || isDraggingLine === 'gate') && mousePos.x >= 0) {
        drawThresholdTooltip(ctx, mousePos, 'gate', gateThreshold, width);
    }
};

// --- Component ---

const Waveform = ({
    canvasRef,
    containerRef,
    playheadRef,
    onMouseDown,
    onMouseMove,
    onMouseLeave,
    isLoading,
    loadingMessage,
    children
}) => {
    return (
        <div
            ref={containerRef}
            className="flex-1 relative bg-panel rounded-xl border border-white/30 shadow-2xl overflow-hidden flex cursor-crosshair select-none touch-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Playheads */}
            <div ref={playheadRef} className="absolute top-0 bottom-0 w-[1px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-20" style={{ left: '0%', opacity: 0 }}></div>

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-sm transition-opacity duration-300">
                    <span className="text-white font-mono text-sm animate-pulse tracking-wider">
                        {loadingMessage || "載入音檔中..."}
                    </span>
                </div>
            )}

            {/* Draggable Overlays & HUDs passed as children */}
            {children}
        </div>
    );
};

export default Waveform;
