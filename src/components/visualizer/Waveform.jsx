import React from 'react';
import { selectMipmapLevel } from '../../utils/mipmapCache';
import { displayAmp, computeWaveformGeometry } from '../../utils/displayMath';
import {
    BRICK_RED, HOVER_RED, ORIGINAL_RED,
    BG_PANEL, TEXT_DIM,
} from '../../utils/colors';
import { drawPolygonWithPeakFade } from '../../utils/canvasPolygons';
import { drawDbGrid } from '../../utils/canvasGrid';
import { computeWaveformPoints } from '../../utils/waveformData';
import { drawCrosshair, drawGainTooltip } from '../../utils/canvasOverlay';
import { drawPlacedMarkers, drawMarkerHoverPreview } from '../../utils/canvasMarkers';
import {
    TOOLTIP_OFFSET_X, TOOLTIP_HEIGHT, TOOLTIP_OFFSET_Y,
    LEGEND_HEIGHT, LEGEND_PAD_X, LEGEND_TEXT_BASELINE, LEGEND_BG,
} from '../../utils/canvasConstants';

// --- Main Draw Logic (Exported for App.jsx) ---

export const drawMainWaveform = ({
    canvas, canvasDims, visualResult, originalBuffer,
    zoomX, zoomY, panOffset, panOffsetY,
    playingType, lastPlayedType,
    mousePos,
    mipmaps,
    waveformCacheRef,
    interactionDPR,
    markers,
    hoveredMarkerInfo,
    isMarkerDragging,
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
    const cacheKey = `${physW}x${physH}_${zoomX.toFixed(4)}_${Math.round(panOffset)}_${Math.round(panOffsetY)}_${zoomY.toFixed(3)}_${playingType}_${lastPlayedType}`;

    const cache = waveformCacheRef?.current;
    const cacheHit = cache?.key === cacheKey && cache?.imageData;

    // ── PHASE 1: Waveform background (skip when cache hit) ──
    if (!cacheHit) {
        ctx.setLineDash([]); ctx.fillStyle = BG_PANEL; ctx.fillRect(0, 0, width, height);

        try {
            const srcLength = visualResult.visualInput.length;
            const step = srcLength / (width * zoomX);
            if (!Number.isFinite(step) || step <= 0) return;

            const { centerY, ampScale } = computeWaveformGeometry(height, zoomY, panOffsetY);

            drawDbGrid(ctx, width, height, centerY, ampScale);

            const { inPoints, outPoints } = computeWaveformPoints({
                visualResult, width, zoomX, panOffset, centerY, ampScale,
                lastPlayedType,
                mipmaps, interactionDPR, step,
            });

            // Draw Polygons
            if (lastPlayedType === 'original') { drawPolygonWithPeakFade(ctx, inPoints, ORIGINAL_RED, width, centerY); }
            else {
                drawPolygonWithPeakFade(ctx, inPoints, BRICK_RED, width, centerY, 0.5);
                drawPolygonWithPeakFade(ctx, outPoints, '#ffffff', width, centerY, 1.0, 0.2);
            }

            // Save background to cache
            if (waveformCacheRef) {
                try {
                    waveformCacheRef.current = { key: cacheKey, imageData: ctx.getImageData(0, 0, physW, physH) };
                } catch (_) { /* cross-origin or memory guard — skip caching */ }
            }

        } catch (e) {
            console.error("Waveform draw error:", e);
            return;
        }
    } else {
        ctx.putImageData(cache.imageData, 0, 0);
    }

    // ── PHASE 2: Overlay — mouse inspection ──

    const srcLength = visualResult.visualInput.length;
    const step = srcLength / (width * zoomX);
    if (!Number.isFinite(step) || step <= 0) return;

    const { centerY, ampScale } = computeWaveformGeometry(height, zoomY, panOffsetY);

    const useMipmaps = mipmaps && mipmaps.input && mipmaps.output;
    const mipmapBias = interactionDPR ? 1 : 0;
    const mmInput = useMipmaps ? selectMipmapLevel(mipmaps.input, step, mipmapBias) : null;
    const mmOutput = useMipmaps ? selectMipmapLevel(mipmaps.output, step, mipmapBias) : null;

    // Mouse hover inspection
    if (mousePos.x >= 0 && lastPlayedType === 'processed') {
        let isHoveringOnOutput = false;
        let isHoveringOnBrickRed = false;
        const srcOutput = visualResult.outputData;
        const srcInput = visualResult.visualInput;

        const hvX = mousePos.x - panOffset;
        const hStart = Math.floor(hvX * step);
        const hEnd = Math.min(Math.floor((hvX + 1) * step), srcLength);
        if (hStart >= 0 && hStart < srcLength) {
            let maxOut = 0;
            let maxIn = 0;
            if (useMipmaps && mmOutput) {
                const oLv = mmOutput.level; const oBs = mmOutput.blockSize;
                const oS = Math.floor(hStart / oBs); const oE = Math.ceil(hEnd / oBs);
                for (let i = oS; i < oE && i < oLv.length; i++) { const a = Math.abs(oLv[i]); if (a > maxOut) maxOut = a; }
            } else {
                for (let i = hStart; i < hEnd; i++) {
                    const a = Math.abs(srcOutput[i]);
                    if (a > maxOut) maxOut = a;
                }
            }
            if (useMipmaps && mmInput) {
                const inLv = mmInput.level; const inBs = mmInput.blockSize;
                const inS = Math.floor(hStart / inBs); const inE = Math.ceil(hEnd / inBs);
                for (let i = inS; i < inE && i < inLv.length; i++) { const a = Math.abs(inLv[i]); if (a > maxIn) maxIn = a; }
            } else {
                for (let i = hStart; i < hEnd; i++) {
                    const a = Math.abs(srcInput[i]);
                    if (a > maxIn) maxIn = a;
                }
            }
            const hOut = displayAmp(maxOut) * ampScale;
            const hIn = displayAmp(maxIn) * ampScale;
            if (mousePos.y >= centerY - hOut && mousePos.y <= centerY + hOut) {
                isHoveringOnOutput = true;
            } else if (mousePos.y >= centerY - hIn && mousePos.y <= centerY + hIn) {
                isHoveringOnBrickRed = true;
            }
        }

        // --- Draw hover layers ---
        if (isHoveringOnBrickRed) {
            const inPts = []; const outPts = [];
            const brStartX = Math.max(0, Math.floor(panOffset) - 1);
            const brEndX = Math.min(width, Math.ceil(panOffset + width * zoomX) + 1);
            for (let x = brStartX; x < brEndX; x++) {
                const vx = x - panOffset;
                const s = Math.floor(vx * step); const e = Math.floor((vx + 1) * step);
                if (s < 0 || s >= srcLength) continue;
                const se = Math.min(srcLength, e);
                let mxIn = 0; let mxOut = 0;
                const ls = Math.max(s, 0);
                if (se - ls > 0) {
                    if (useMipmaps) {
                        const iL = mmInput.level; const iB = mmInput.blockSize;
                        const is0 = Math.floor(ls / iB); const ie0 = Math.ceil(se / iB);
                        for (let i = is0; i < ie0 && i < iL.length; i++) { const a = Math.abs(iL[i]); if (a > mxIn) mxIn = a; }
                        const oL = mmOutput.level; const oB = mmOutput.blockSize;
                        const os = Math.floor(ls / oB); const oe = Math.ceil(se / oB);
                        for (let i = os; i < oe && i < oL.length; i++) { const a = Math.abs(oL[i]); if (a > mxOut) mxOut = a; }
                    } else {
                        for (let i = ls; i < se; i++) {
                            const aI = Math.abs(srcInput[i]); if (aI > mxIn) mxIn = aI;
                            const aO = Math.abs(srcOutput[i]); if (aO > mxOut) mxOut = aO;
                        }
                    }
                } else {
                    const idx = Math.min(Math.floor(ls), srcLength - 1);
                    if (idx >= 0) {
                        mxIn = Math.abs(srcInput[idx]);
                        mxOut = Math.abs(srcOutput[idx]);
                    }
                }
                const hI = displayAmp(mxIn) * ampScale;
                const hO = displayAmp(mxOut) * ampScale;
                inPts.push({ x, yTop: centerY - hI, yBot: centerY + hI });
                outPts.push({ x, yTop: centerY - hO, yBot: centerY + hO });
            }
            drawPolygonWithPeakFade(ctx, inPts, HOVER_RED, width, centerY);
            drawPolygonWithPeakFade(ctx, outPts, '#ffffff', width, centerY, 1.0, 0.2);
        }

        // --- Legends ---
        const bgX = mousePos.x + TOOLTIP_OFFSET_X;

        if (isHoveringOnBrickRed) {
            const legendText = '紅色 = 增益前後差異的訊號';
            ctx.font = 'bold 11px sans-serif';
            const lw = ctx.measureText(legendText).width;
            const legendW = lw + LEGEND_PAD_X * 2;
            const goldTooltipBottom = mousePos.y - TOOLTIP_HEIGHT - TOOLTIP_OFFSET_Y;
            let legendX = bgX;
            let legendY = goldTooltipBottom - LEGEND_HEIGHT - 4;
            if (legendX + legendW > width) legendX = width - legendW - 2;
            if (legendY < 2) legendY = mousePos.y + TOOLTIP_OFFSET_Y;

            ctx.fillStyle = LEGEND_BG;
            ctx.fillRect(legendX, legendY, legendW, LEGEND_HEIGHT);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
            ctx.fillText(legendText, legendX + LEGEND_PAD_X, legendY + LEGEND_TEXT_BASELINE);
        }
    }

    // Bypass (original) mode: hover detection + legend
    if (mousePos.x >= 0 && lastPlayedType === 'original') {
        let isHoveringOnOriginalWaveform = false;
        const srcInput = visualResult.visualInput;
        const hvX = mousePos.x - panOffset;
        const hStart = Math.floor(hvX * step);
        const hEnd = Math.min(Math.floor((hvX + 1) * step), srcLength);
        if (hStart >= 0 && hStart < srcLength) {
            let maxIn = 0;
            if (useMipmaps && mmInput) {
                const inLv = mmInput.level; const inBs = mmInput.blockSize;
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
            for (let x = brStartX; x < brEndX; x++) {
                const vx = x - panOffset;
                const s = Math.floor(vx * step); const e = Math.floor((vx + 1) * step);
                if (s < 0 || s >= srcLength) continue;
                const se = Math.min(srcLength, e);
                let mxIn = 0;
                const ls = Math.max(s, 0);
                if (se - ls > 0) {
                    if (useMipmaps && mmInput) {
                        const iL = mmInput.level; const iB = mmInput.blockSize;
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

            const bgX = mousePos.x + TOOLTIP_OFFSET_X;
            const legendText = '紅色 = 原始未處理訊號 (Bypass)';
            ctx.font = 'bold 11px sans-serif';
            const lw = ctx.measureText(legendText).width;
            const legendW = lw + LEGEND_PAD_X * 2;
            const goldTooltipBottom = mousePos.y - TOOLTIP_HEIGHT - TOOLTIP_OFFSET_Y;
            let legendX = bgX;
            let legendY = goldTooltipBottom - LEGEND_HEIGHT - 4;
            if (legendX + legendW > width) legendX = width - legendW - 2;
            if (legendY < 2) legendY = mousePos.y + TOOLTIP_OFFSET_Y;

            ctx.fillStyle = LEGEND_BG;
            ctx.fillRect(legendX, legendY, legendW, LEGEND_HEIGHT);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
            ctx.fillText(legendText, legendX + LEGEND_PAD_X, legendY + LEGEND_TEXT_BASELINE);
        }
    }

    // ── Placed Markers ──
    if (markers && markers.length > 0) {
        drawPlacedMarkers(ctx, markers, width, height, centerY, zoomX, panOffset, hoveredMarkerInfo);
    }

    // ── Marker Hover Preview (only when not over existing marker and not dragging) ──
    if (mousePos.x >= 0 && !hoveredMarkerInfo && !isMarkerDragging) {
        drawMarkerHoverPreview(ctx, mousePos.x, width, height, centerY);
    }

    // ── Crosshair + Gain Tooltip ──
    if (mousePos.x >= 0 && mousePos.y >= 0) {
        drawCrosshair(ctx, mousePos, width, height);
        drawGainTooltip(ctx, mousePos, centerY, ampScale, width);
    }

    ctx.setLineDash([]);
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

export default React.memo(Waveform);
