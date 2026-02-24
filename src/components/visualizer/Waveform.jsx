import React from 'react';
import { selectMipmapLevel } from '../../utils/mipmapCache';

// --- Helper Drawing Functions ---

const drawPolygon = (ctx, points, color, width, centerY, opacity = 1.0) => {
    if (points.length === 0) return;
    ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, centerY);
    for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yTop);
    ctx.lineTo(points[points.length - 1].x, centerY);
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].yBot);
    ctx.closePath(); ctx.fill(); ctx.restore();
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
    isGateBypass, isCompBypass,
    mipmaps, mixMipmaps, // mipmap data
    waveformCacheRef,   // { current: { key, imageData } } — optional ImageData cache
}) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDims;
    const dpr = window.devicePixelRatio || 1;
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
    const cacheKey = `${physW}x${physH}_${zoomX.toFixed(4)}_${Math.round(panOffset)}_${Math.round(panOffsetY)}_${zoomY.toFixed(3)}_${playingType}_${lastPlayedType}_${isDeltaMode?1:0}_${dryGain.toFixed(2)}_${adjustBit}`;

    const cache = waveformCacheRef?.current;
    const cacheHit = isDraggingLine && cache?.key === cacheKey && cache?.imageData;

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

            const PADDING = 24; const centerY = (height / 2) + panOffsetY;
            const maxPixelHeight = ((height / 2) - PADDING); const ampScale = maxPixelHeight * zoomY;
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
                const yOff = linAmp * ampScale;
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

            const inPoints = []; const outPoints = []; const corePoints = []; const mixPoints = []; const grPoints = [];
            const dryLinear = Math.pow(10, dryGain / 20);

            // Viewport culling
            const loopStartX = Math.max(0, Math.floor(panOffset) - 1);
            const loopEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);

            // Select mipmap levels
            const useMipmaps = mipmaps && mipmaps.input && mipmaps.output && mipmaps.gr;
            let mmIn, mmOut, mmGR, mmMix;
            if (useMipmaps) {
                mmIn = selectMipmapLevel(mipmaps.input, step);
                mmOut = selectMipmapLevel(mipmaps.output, step);
                mmGR = selectMipmapLevel(mipmaps.gr, step);
                if (mixMipmaps && lastPlayedType === 'processed') {
                    mmMix = selectMipmapLevel(mixMipmaps, step);
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

                        const outLevel = mmOut.level; const outBS = mmOut.blockSize;
                        const outStart = Math.floor(loopStartIdx / outBS); const outEnd = Math.ceil(safeEnd / outBS);
                        for (let i = outStart; i < outEnd && i < outLevel.length; i++) { const a = Math.abs(outLevel[i]); if (a > maxOut) maxOut = a; }

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
                            const absIn = Math.abs(srcInput[i]); const absOut = Math.abs(srcOutput[i]); const grVal = srcGR[i];
                            if (absIn > maxIn) maxIn = absIn; if (absOut > maxOut) maxOut = absOut; if (grVal < minGR) minGR = grVal;
                            if (lastPlayedType === 'processed') { const mixVal = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (mixVal > maxMix) maxMix = mixVal; }
                        }
                    }
                } else {
                    const idx = Math.min(Math.floor(loopStartIdx), srcLength - 1);
                    if (idx >= 0) {
                        maxIn = Math.abs(srcInput[idx]); maxOut = Math.abs(srcOutput[idx]); minGR = srcGR[idx];
                        if (lastPlayedType === 'processed') maxMix = Math.abs(srcOutput[idx] + (srcInput[idx] * dryLinear));
                    }
                }

                const hIn = maxIn * ampScale; const hOut = maxOut * ampScale; const hCore = Math.min(hIn, hOut); const hMix = maxMix * ampScale;
                inPoints.push({ x, yTop: centerY - hIn, yBot: centerY + hIn });
                outPoints.push({ x, yTop: centerY - hOut, yBot: centerY + hOut });
                corePoints.push({ x, yTop: centerY - hCore, yBot: centerY + hCore });
                if (lastPlayedType === 'processed') mixPoints.push({ x, yTop: centerY - hMix, yBot: centerY + hMix });
                if (minGR < 0 && lastPlayedType === 'processed') { const yPos = (1.0 - Math.pow(10, minGR / 20)) * grMaxHeight; grPoints.push({ x, y: yPos }); }
                else if (lastPlayedType === 'processed') { grPoints.push({ x, y: 0 }); }
            }

            // Draw Polygons
            if (lastPlayedType === 'original') { drawPolygon(ctx, inPoints, '#D05A40', width, centerY); }
            else {
                const redOpacity = (isCompAdjusting || isGateAdjusting || isDeltaMode) ? 1.0 : 0.5;
                drawPolygon(ctx, inPoints, '#B54C35', width, centerY, redOpacity);
                drawPolygon(ctx, mixPoints, '#C2A475', width, centerY);
                drawPolygon(ctx, outPoints, '#7D93B7', width, centerY);
                const coreColor = isDeltaMode ? '#888' : '#ffffff';
                drawPolygon(ctx, corePoints, coreColor, width, centerY);
            }
            if (grPoints.length > 0) drawGRLine(ctx, grPoints, '#E05E42');

            // GR Scale Labels
            if (lastPlayedType === 'processed') {
                ctx.fillStyle = '#E05E42'; ctx.textAlign = 'right'; ctx.font = 'bold 10px monospace';
                [-3, -6, -12, -20].forEach(db => {
                    const yVal = (1.0 - Math.pow(10, db / 20)) * grMaxHeight;
                    if (yVal < height / 2) {
                        ctx.fillText(`${db}dB`, width - 5, yVal + 3);
                        ctx.fillStyle = 'rgba(224, 94, 66, 0.5)'; ctx.fillRect(width - 15, yVal, 10, 1); ctx.fillStyle = '#E05E42';
                    }
                });
            }


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
    // Re-derive geometry constants needed for overlay drawing
    const srcLength = visualResult.visualInput.length;
    const step = srcLength / (width * zoomX);
    if (!Number.isFinite(step) || step <= 0) return;

    const PADDING = 24; const centerY = (height / 2) + panOffsetY;
    const maxPixelHeight = ((height / 2) - PADDING); const ampScale = maxPixelHeight * zoomY;
    const grMaxHeight = maxPixelHeight * 0.5;

    const useMipmaps = mipmaps && mipmaps.input && mipmaps.output && mipmaps.gr;
    const mmGR = useMipmaps ? selectMipmapLevel(mipmaps.gr, step) : null;

    // Helper Label
    const drawLabel = (text, x, y, color, align) => {
        ctx.font = 'bold 12px sans-serif';
        const metrics = ctx.measureText(text);
        const bgWidth = metrics.width + 8; const bgHeight = 16;
        const bgX = align === 'right' ? x - bgWidth : x;
        ctx.fillStyle = color + 'F2'; ctx.fillRect(bgX, y - 12, bgWidth, bgHeight);
        ctx.fillStyle = '#fff'; ctx.textAlign = align; ctx.fillText(text, x + (align === 'right' ? -4 : 4), y);
    };

    // Threshold Lines
    const isDry = lastPlayedType === 'original';
    const inactiveColor = '#555';

    if (hasThresholdBeenAdjusted || isCompAdjusting || hoverLine === 'comp' || isCompBypass) {
        const threshY = Math.pow(10, threshold / 20) * ampScale;
        if (centerY - threshY > -20 && centerY - threshY < height + 20) {
            const tTop = centerY - threshY;
            const compColor = isDry || isCompBypass ? inactiveColor : '#C2A475';
            ctx.strokeStyle = compColor; ctx.setLineDash([6, 4]);
            ctx.lineWidth = (hoverLine === 'comp' || isDraggingLine === 'comp') ? 3 : 2;
            ctx.beginPath(); ctx.moveTo(0, tTop); ctx.lineTo(width, tTop); ctx.moveTo(0, centerY + threshY); ctx.lineTo(width, centerY + threshY); ctx.stroke();
            drawLabel(`Comp: ${threshold}dB`, width, tTop - 4, compColor, 'right');
        }
    }

    const gateThreshY = Math.pow(10, gateThreshold / 20) * ampScale;
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

    // Mouse GR Inspection
    if (mousePos.x >= 0 && lastPlayedType === 'processed') {
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

        ctx.strokeStyle = '#C2A475'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, height); ctx.stroke();

        const text = `GR: ${hoverGR.toFixed(1)}dB`;
        ctx.font = 'bold 12px sans-serif';
        const metrics = ctx.measureText(text);
        const bgWidth = metrics.width + 12; const bgHeight = 20;
        const bgX = mousePos.x + 8;
        ctx.fillStyle = '#C2A475';
        ctx.fillRect(bgX, mousePos.y - bgHeight - 4, bgWidth, bgHeight);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
        ctx.fillText(text, bgX + 6, mousePos.y - bgHeight - 4 + 14);
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
