import React from 'react';
import { selectMipmapLevel } from '../../utils/mipmapCache';

// Display compression: exponent < 1 pushes waveform towards edges.
// 0.43 halves the gap between -5dB and the border vs linear display.
const DISPLAY_EXP = 0.43;
const displayAmp = (lin) => lin > 0 ? Math.pow(lin, DISPLAY_EXP) : 0;
const linearFromDisplay = (disp) => disp > 0 ? Math.pow(disp, 1 / DISPLAY_EXP) : 0;

// --- Helper Drawing Functions ---

const drawPolygon = (ctx, points, color, width, centerY, opacity = 1.0) => {
    if (points.length === 0) return;
    ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, centerY);
    for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yTop);
    ctx.lineTo(points[points.length - 1].x, centerY);
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].yBot);
    ctx.closePath(); ctx.fill(); ctx.restore();
};

const drawPolygonWithStroke = (ctx, points, fillColor, strokeColor, width, centerY, strokeWidth = 1.5, opacity = 1.0) => {
    if (points.length === 0) return;
    ctx.save(); ctx.globalAlpha = opacity;
    ctx.beginPath(); ctx.moveTo(0, centerY);
    for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yTop);
    ctx.lineTo(points[points.length - 1].x, centerY);
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].yBot);
    ctx.closePath();
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.stroke();
    ctx.restore();
};

const drawPolygonWithPeakFade = (ctx, points, color, width, centerY, opacity = 1.0, fadeAmount = 0.3) => {
    if (points.length === 0) return;
    ctx.save();

    // Find vertical extent of the waveform
    let minY = centerY, maxY = centerY;
    for (let i = 0; i < points.length; i++) {
        if (points[i].yTop < minY) minY = points[i].yTop;
        if (points[i].yBot > maxY) maxY = points[i].yBot;
    }

    // Parse hex color
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const peakAlpha = opacity * (1 - fadeAmount);
    const centerAlpha = opacity;
    const range = maxY - minY;

    if (range > 0) {
        const grad = ctx.createLinearGradient(0, minY, 0, maxY);
        const cs = (centerY - minY) / range; // center position (≈0.5)
        // e.g. fadeAmount=0.3 → 100%→85%→70%, fadeAmount=0.2 → 100%→90%→80%
        const midAlpha = opacity * (1 - fadeAmount / 2);
        const peakA = opacity * (1 - fadeAmount);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${peakA})`);
        grad.addColorStop(Math.max(0.01, cs * 0.5), `rgba(${r}, ${g}, ${b}, ${midAlpha})`);
        grad.addColorStop(Math.max(0.02, Math.min(0.98, cs)), `rgba(${r}, ${g}, ${b}, ${centerAlpha})`);
        grad.addColorStop(Math.min(0.99, cs + (1 - cs) * 0.5), `rgba(${r}, ${g}, ${b}, ${midAlpha})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${peakA})`);
        ctx.fillStyle = grad;
    } else {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
    }

    ctx.beginPath(); ctx.moveTo(0, centerY);
    for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yTop);
    ctx.lineTo(points[points.length - 1].x, centerY);
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].yBot);
    ctx.closePath(); ctx.fill(); ctx.restore();
};

const drawHatchedPolygon = (ctx, points, color, width, centerY, spacing = 6, lineWidth = 1.5, opacity = 1.0) => {
    if (points.length === 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;

    // Build clip path from polygon
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yTop);
    ctx.lineTo(points[points.length - 1].x, centerY);
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].yBot);
    ctx.closePath();
    ctx.clip();

    // Find bounding box
    let minY = centerY, maxY = centerY;
    for (let i = 0; i < points.length; i++) {
        if (points[i].yTop < minY) minY = points[i].yTop;
        if (points[i].yBot > maxY) maxY = points[i].yBot;
    }
    const minX = points[0].x;
    const maxX = points[points.length - 1].x;

    // Draw diagonal lines (top-right to bottom-left)
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    const totalSpan = (maxX - minX) + (maxY - minY);
    for (let d = 0; d < totalSpan; d += spacing) {
        const x1 = minX + d;
        const y1 = minY;
        const x2 = minX + d - (maxY - minY);
        const y2 = maxY;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.restore();
};

const drawGRLine = (ctx, points, color) => {
    if (points.length === 0) return;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
};

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
        ctx.setLineDash([]); ctx.fillStyle = '#202020'; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#666'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('請載入音訊...', width / 2, height / 2); return;
    }

    // ── Cache key covers everything that affects the waveform background ──────
    // Excludes: threshold, gateThreshold, mousePos, hoverLine, isDraggingLine
    // (those only affect the overlay drawn in Phase 2)
    const adjustBit = (isCompAdjusting || isGateAdjusting) ? 1 : 0;
    const cacheKey = `${physW}x${physH}_${zoomX.toFixed(4)}_${Math.round(panOffset)}_${Math.round(panOffsetY)}_${zoomY.toFixed(3)}_${playingType}_${lastPlayedType}_${isDeltaMode?1:0}_${dryGain.toFixed(2)}_${adjustBit}_${isGainKnobActive?1:0}_${activeGainKnob||''}`;

    const cache = waveformCacheRef?.current;
    const isAnyDrag = isDraggingLine || isCompAdjusting || isGateAdjusting || isGainKnobDragging;
    const cacheHit = isAnyDrag ? (cache?.imageData) : (cache?.key === cacheKey && cache?.imageData);

    // ── PHASE 1: Waveform background (skip when cache hit) ────────────────────
    if (!cacheHit) {
        ctx.setLineDash([]); ctx.fillStyle = '#202020'; ctx.fillRect(0, 0, width, height);

        try {
            const srcInput = visualResult.visualInput;
            const srcOutput = visualResult.outputData;
            const srcGR = visualResult.grCurve;
            const srcLength = srcInput.length;
            const step = srcLength / (width * zoomX);

            if (!Number.isFinite(step) || step <= 0) return;

            const centerY = (height / 2) + panOffsetY;
            const VERT_PAD = height * 0.05;
            const maxPixelHeight = (height / 2) - VERT_PAD; const ampScale = maxPixelHeight * zoomY;
            const grMaxHeight = maxPixelHeight * 0.5;

            // Grid — horizontal dB lines with gradient fade
            const FADE_DISTANCE = 160;
            const fadeL = Math.min(FADE_DISTANCE / width, 0.4);
            const fadeR = 1 - fadeL;

            const zeroGrad = ctx.createLinearGradient(0, 0, width, 0);
            zeroGrad.addColorStop(0, 'rgba(255,255,255,0)');
            zeroGrad.addColorStop(fadeL, 'rgba(255,255,255,0.05)');
            zeroGrad.addColorStop(fadeR, 'rgba(255,255,255,0.05)');
            zeroGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = zeroGrad; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(width, centerY); ctx.stroke();

            const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
            lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
            lineGrad.addColorStop(fadeL, 'rgba(255,255,255,0.25)');
            lineGrad.addColorStop(fadeR, 'rgba(255,255,255,0.25)');
            lineGrad.addColorStop(1, 'rgba(255,255,255,0)');

            for (let db = -5; db >= -60; db -= 5) {
                const linAmp = Math.pow(10, db / 20);
                const yOff = displayAmp(linAmp) * ampScale;
                const yTop = centerY - yOff;
                const yBot = centerY + yOff;
                const topFade = Math.min(1, yTop / FADE_DISTANCE);
                const botFade = Math.min(1, (height - yBot) / FADE_DISTANCE);
                if (topFade <= 0 && botFade <= 0) continue;
                ctx.lineWidth = 0.5;
                if (topFade > 0) { ctx.globalAlpha = Math.max(0, topFade); ctx.strokeStyle = lineGrad; ctx.beginPath(); ctx.moveTo(0, yTop); ctx.lineTo(width, yTop); ctx.stroke(); }
                if (botFade > 0) { ctx.globalAlpha = Math.max(0, botFade); ctx.strokeStyle = lineGrad; ctx.beginPath(); ctx.moveTo(0, yBot); ctx.lineTo(width, yBot); ctx.stroke(); }
            }
            ctx.globalAlpha = 1;

            const inPoints = []; const outPoints = []; const mixPoints = []; const grPoints = [];
            const dryLinear = Math.pow(10, dryGain / 20);

            // Determine which channels are needed before the loop
            const showAllLayers = isGainKnobActive || isDeltaMode;
            const needsOutChannel = showAllLayers;

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

            // Waveform Calculation Loop
            for (let x = loopStartX; x < loopEndX; x++) {
                const vX = x - panOffset;
                const start = Math.floor(vX * step);
                const end = Math.floor((vX + 1) * step);
                if (start < 0 || start >= srcLength) continue;
                const safeEnd = Math.min(srcLength, end);
                let maxIn = 0; let maxOut = 0; let minGR = 0; let maxMix = 0;
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
                    } else {
                        for (let i = loopStartIdx; i < safeEnd; i++) {
                            const absIn = Math.abs(srcInput[i]); const grVal = srcGR[i];
                            if (absIn > maxIn) maxIn = absIn; if (grVal < minGR) minGR = grVal;
                            if (needsOutChannel) { const absOut = Math.abs(srcOutput[i]); if (absOut > maxOut) maxOut = absOut; }
                            if (lastPlayedType === 'processed') { const mixVal = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (mixVal > maxMix) maxMix = mixVal; }
                        }
                    }
                } else {
                    const idx = Math.min(Math.floor(loopStartIdx), srcLength - 1);
                    if (idx >= 0) {
                        maxIn = Math.abs(srcInput[idx]); minGR = srcGR[idx];
                        if (needsOutChannel) maxOut = Math.abs(srcOutput[idx]);
                        if (lastPlayedType === 'processed') maxMix = Math.abs(srcOutput[idx] + (srcInput[idx] * dryLinear));
                    }
                }

                const hIn = displayAmp(maxIn) * ampScale; const hMix = displayAmp(maxMix) * ampScale;
                inPoints.push({ x, yTop: centerY - hIn, yBot: centerY + hIn });
                if (needsOutChannel) { const hOut = displayAmp(maxOut) * ampScale; outPoints.push({ x, yTop: centerY - hOut, yBot: centerY + hOut }); }
                if (lastPlayedType === 'processed') mixPoints.push({ x, yTop: centerY - hMix, yBot: centerY + hMix });
                if (minGR < 0 && lastPlayedType === 'processed') { const yPos = (1.0 - Math.pow(10, minGR / 20)) * grMaxHeight; grPoints.push({ x, y: yPos }); }
                else if (lastPlayedType === 'processed') { grPoints.push({ x, y: 0 }); }
            }

            // Draw Polygons
            if (lastPlayedType === 'original') { drawPolygonWithPeakFade(ctx, inPoints, '#D05A40', width, centerY); }
            else {
                const redOpacity = (isCompAdjusting || isGateAdjusting || isDeltaMode) ? 1.0 : 0.5;

                // Bottom: Brick Red (dry input)
                drawPolygonWithPeakFade(ctx, inPoints, '#B54C35', width, centerY, redOpacity);

                // Output mix — always visible (dark when delta mode hides it behind background)
                if (isDeltaMode) {
                    drawPolygon(ctx, mixPoints, '#202020', width, centerY);
                } else {
                    drawPolygonWithPeakFade(ctx, mixPoints, '#ffffff', width, centerY, 1.0, 0.2);
                }

                if (showAllLayers) {
                    if (activeGainKnob === 'makeup') {
                        // Wet knob: solid gold for wet only, no hatching
                        drawPolygon(ctx, outPoints, '#C2A475', width, centerY);
                    } else if (activeGainKnob === 'dryGain') {
                        // Dry knob: gold hatched for dry, white for wet on top
                        drawHatchedPolygon(ctx, mixPoints, '#C2A475', width, centerY);
                        drawPolygon(ctx, outPoints, '#ffffff', width, centerY);
                    } else {
                        // Delta mode or other: original behavior
                        drawHatchedPolygon(ctx, mixPoints, '#C2A475', width, centerY);
                        drawPolygonWithStroke(ctx, outPoints, '#ffffff', '#7D93B7', width, centerY);
                    }
                }
            }
            if (grPoints.length > 0) drawGRLine(ctx, grPoints, '#E05E42');



            // ── Save background to cache (before threshold lines / mouse overlay) ──
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
        // ── Fast path: restore cached background ──────────────────────────────
        ctx.putImageData(cache.imageData, 0, 0);
    }

    // ── PHASE 2: Overlay — always drawn (threshold lines + mouse inspection) ──
    // Reset GR area hover state each frame
    if (isHoveringGRAreaRef) isHoveringGRAreaRef.current = false;

    // Re-derive geometry constants needed for overlay drawing
    const srcLength = visualResult.visualInput.length;
    const step = srcLength / (width * zoomX);
    if (!Number.isFinite(step) || step <= 0) return;

    const centerY = (height / 2) + panOffsetY;
    const VERT_PAD = height * 0.05;
    const maxPixelHeight = (height / 2) - VERT_PAD; const ampScale = maxPixelHeight * zoomY;
    const grMaxHeight = maxPixelHeight * 0.5;

    const useMipmaps = mipmaps && mipmaps.input && mipmaps.output && mipmaps.gr;
    const mipmapBias = interactionDPR ? 1 : 0;
    const mmGR = useMipmaps ? selectMipmapLevel(mipmaps.gr, step, mipmapBias) : null;

    // Helper Label
    const drawLabel = (text, x, y, color, align) => {
        ctx.font = 'bold 12px sans-serif';
        const metrics = ctx.measureText(text);
        const bgWidth = metrics.width + 8; const bgHeight = 16;
        const bgX = align === 'right' ? x - bgWidth : x;
        ctx.fillStyle = color + 'F2'; ctx.fillRect(bgX, y - 12, bgWidth, bgHeight);
        ctx.fillStyle = '#fff'; ctx.textAlign = align; ctx.fillText(text, x + (align === 'right' ? -4 : 4), y);
    };

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
            // Wet hover: only solid gold; Dry hover: hatched dry, wet turns white
            if (isHoveringOnDryArea) {
                drawHatchedPolygon(ctx, mixPts, '#C2A475', width, centerY);
                drawPolygon(ctx, outPts, '#ffffff', width, centerY);
            } else {
                drawPolygon(ctx, outPts, '#C2A475', width, centerY);
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
            // Bright red input, then white mix on top to mask center
            drawPolygonWithPeakFade(ctx, inPts, '#E15D42', width, centerY);
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

                // Draw gradient fill from top to GR curve
                const grFillStartX = Math.max(0, Math.floor(panOffset) - 1);
                const grFillEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);

                ctx.save();
                ctx.beginPath();
                // Top edge left to right
                ctx.moveTo(grFillStartX, 0);
                ctx.lineTo(grFillEndX, 0);

                // Trace GR curve right to left
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

                // Vertical gradient: 0% at top → 100% at GR curve
                const grGrad = ctx.createLinearGradient(0, 0, 0, grMaxHeight);
                grGrad.addColorStop(0, 'rgba(181, 76, 53, 0)');
                grGrad.addColorStop(1, 'rgba(181, 76, 53, 1.0)');
                ctx.fillStyle = grGrad;
                ctx.fill();

                // Horizontal dotted line from GR curve at mouse X to right border
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#E05E42';
                ctx.lineWidth = 1.5;
                ctx.moveTo(mousePos.x, grCurveY);
                ctx.lineTo(width, grCurveY);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // --- Positioning for legend + threshold tooltip ---
        const bgHeight = 20;
        const bgX = mousePos.x + 12;


        // Legend box above GR label (only when hovering on waveform)
        if (isHoveringOnWetArea || isHoveringOnDryArea) {
            const legendText = isHoveringOnWetArea
                ? '金色實色 = 壓縮後訊號'
                : '金色斜線 = 額外補回的乾訊號';
            ctx.font = 'bold 11px sans-serif';
            const lw = ctx.measureText(legendText).width;
            const legendPadX = 10;
            const legendW = lw + legendPadX * 2;
            const legendH = 28;
            const grBoxTop = mousePos.y - bgHeight - 4;
            let legendX = bgX;
            let legendY = grBoxTop - legendH - 4;
            if (legendX + legendW > width) legendX = width - legendW - 2;
            if (legendY < 2) legendY = mousePos.y + 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(legendX, legendY, legendW, legendH);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
            ctx.fillText(legendText, legendX + legendPadX, legendY + 18);
        }

        // Legend for brick-red hover
        if (isHoveringOnBrickRed) {
            const legendText = '紅色 = 被壓縮處理減少了的訊號';
            ctx.font = 'bold 11px sans-serif';
            const lw = ctx.measureText(legendText).width;
            const legendPadX = 10;
            const legendW = lw + legendPadX * 2;
            const legendH = 28;
            const grBoxTop = mousePos.y - bgHeight - 4;
            let legendX = bgX;
            let legendY = grBoxTop - legendH - 4;
            if (legendX + legendW > width) legendX = width - legendW - 2;
            if (legendY < 2) legendY = mousePos.y + 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(legendX, legendY, legendW, legendH);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
            ctx.fillText(legendText, legendX + legendPadX, legendY + 18);
        }

    }

    // ── Crosshair + Gain Tooltip — always visible when mouse is on canvas ──
    if (mousePos.x >= 0 && mousePos.y >= 0) {
        // Vertical crosshair line
        ctx.save();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, height);
        ctx.stroke();
        ctx.restore();

        // Horizontal crosshair line with edge-fade gradient
        ctx.save();
        const hGrad = ctx.createLinearGradient(0, 0, width, 0);
        hGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
        hGrad.addColorStop(0.15, 'rgba(255,255,255,1)');
        hGrad.addColorStop(0.85, 'rgba(255,255,255,1)');
        hGrad.addColorStop(1, 'rgba(255,255,255,0.6)');
        ctx.strokeStyle = hGrad; ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, mousePos.y); ctx.lineTo(width, mousePos.y);
        ctx.stroke();
        ctx.restore();

        // Gain value at cursor Y position
        const distFromCenter = Math.abs(mousePos.y - centerY);
        const displayVal = distFromCenter / ampScale;
        const linearAmp = linearFromDisplay(displayVal);
        const gainDb = linearAmp > 0.000001 ? 20 * Math.log10(linearAmp) : -Infinity;
        const gainText = Number.isFinite(gainDb) ? `${gainDb.toFixed(1)} dB` : '-∞ dB';

        // Gold tooltip at top-right of cursor
        // Matches Comp Threshold tooltip position/size so blue fully overlaps gold
        ctx.font = 'bold 12px sans-serif';
        const gm = ctx.measureText(gainText);
        const gPadX = 8;
        const gW = gm.width + gPadX * 2;
        const gH = 24;
        let gX = mousePos.x + 12;
        let gY = mousePos.y - gH - 8;
        if (gX + gW > width) gX = mousePos.x - gW - 12;
        if (gY < 2) gY = mousePos.y + 12;

        ctx.fillStyle = 'rgb(194, 164, 117)';
        ctx.fillRect(gX, gY, gW, gH);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
        ctx.fillText(gainText, gX + gPadX, gY + 16);
    }

    // ── Threshold Lines — drawn above ALL waveform layers (including hover overlays) ──
    const isDry = lastPlayedType === 'original';
    const inactiveColor = '#555';

    if (hasThresholdBeenAdjusted || isCompAdjusting || hoverLine === 'comp' || isCompBypass) {
        const threshY = displayAmp(Math.pow(10, threshold / 20)) * ampScale;
        if (centerY - threshY > -20 && centerY - threshY < height + 20) {
            const tTop = centerY - threshY;
            const tBot = centerY + threshY;
            const compColor = isDry || isCompBypass ? inactiveColor : '#9AB2DD';
            const isCompHighlight = hoverLine === 'comp' || isDraggingLine === 'comp';

            // Parse color to RGB for gradient
            const cResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(compColor);
            const cR = cResult ? parseInt(cResult[1], 16) : 85;
            const cG = cResult ? parseInt(cResult[2], 16) : 85;
            const cB = cResult ? parseInt(cResult[3], 16) : 85;

            // Gradient fill between the two threshold lines (fades toward center)
            const fillAlpha = isCompHighlight ? 0.22 : 0.12;
            const fillGrad = ctx.createLinearGradient(0, tTop, 0, tBot);
            fillGrad.addColorStop(0, `rgba(${cR}, ${cG}, ${cB}, ${fillAlpha})`);
            fillGrad.addColorStop(0.5, `rgba(${cR}, ${cG}, ${cB}, 0)`);
            fillGrad.addColorStop(1, `rgba(${cR}, ${cG}, ${cB}, ${fillAlpha})`);
            ctx.fillStyle = fillGrad;
            ctx.fillRect(0, tTop, width, tBot - tTop);

            // Horizontal gradient for line stroke (fades at left/right edges, opaque at center)
            const baseAlpha = isCompHighlight ? 1.0 : 0.9;
            const edgeAlpha = isCompHighlight ? 0.9 : 0.6;
            const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
            strokeGrad.addColorStop(0, `rgba(${cR}, ${cG}, ${cB}, ${edgeAlpha})`);
            strokeGrad.addColorStop(0.5, `rgba(${cR}, ${cG}, ${cB}, ${baseAlpha})`);
            strokeGrad.addColorStop(1, `rgba(${cR}, ${cG}, ${cB}, ${edgeAlpha})`);

            // Draw solid lines with glow on hover
            ctx.setLineDash([]);
            if (isCompHighlight) {
                ctx.save();
                ctx.shadowColor = `rgba(${cR}, ${cG}, ${cB}, 0.8)`;
                ctx.shadowBlur = 12;
            }
            ctx.strokeStyle = strokeGrad;
            ctx.lineWidth = isCompHighlight ? 3 : 2;
            ctx.beginPath();
            ctx.moveTo(0, tTop); ctx.lineTo(width, tTop);
            ctx.moveTo(0, tBot); ctx.lineTo(width, tBot);
            ctx.stroke();
            if (isCompHighlight) ctx.restore();
        }
    }

    const gateThreshY = displayAmp(Math.pow(10, gateThreshold / 20)) * ampScale;
    if (centerY - gateThreshY > -20 && centerY - gateThreshY < height + 20) {
        const gTop = centerY - gateThreshY; const gBot = centerY + gateThreshY;
        const gateColor = isDry || isGateBypass ? inactiveColor : '#B54C35';
        ctx.strokeStyle = gateColor; ctx.setLineDash([3, 3]);
        ctx.lineWidth = (hoverLine === 'gate' || isDraggingLine === 'gate') ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(0, gTop); ctx.lineTo(width, gTop); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, gBot); ctx.lineTo(width, gBot); ctx.stroke();
        drawLabel(`Gate: ${gateThreshold}dB`, 0, gTop + 16, gateColor, 'left');
    }
    ctx.setLineDash([]);

    // ── Comp Threshold Tooltip — drawn last so it's on top of everything ──
    if ((hoverLine === 'comp' || isDraggingLine === 'comp') && mousePos.x >= 0) {
        ctx.font = 'bold 12px sans-serif';
        const threshText = `Comp Threshold: ${threshold} dB`;
        const threshMetrics = ctx.measureText(threshText);
        const tPadX = 8; const tBgW = threshMetrics.width + tPadX * 2; const tBgH = 24;
        let tBgX = mousePos.x + 12;
        let tBgY = mousePos.y - tBgH - 8;
        if (tBgX + tBgW > width) tBgX = mousePos.x - tBgW - 12;
        if (tBgY < 2) tBgY = mousePos.y + 12;
        ctx.fillStyle = '#4D5B72';
        ctx.fillRect(tBgX, tBgY, tBgW, tBgH);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
        ctx.fillText(threshText, tBgX + tPadX, tBgY + 16);
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
    children
}) => {
    return (
        <div
            ref={containerRef}
            className="flex-1 relative bg-[#202020] rounded-xl border border-white/30 shadow-2xl overflow-hidden flex cursor-crosshair select-none touch-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Playheads */}
            <div ref={playheadRef} className="absolute top-0 bottom-0 w-[1px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-20" style={{ left: '0%', opacity: 0 }}></div>

            {/* Draggable Overlays & HUDs passed as children */}
            {children}
        </div>
    );
};

export default Waveform;
