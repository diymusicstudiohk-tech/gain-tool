import React from 'react';

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
    loopStart, loopEnd,
    mousePos, hoverLine, isDraggingLine, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
    hoverGrRef, // ref object
    isGateBypass, isCompBypass,
    signalFlowMode // [NEW]
}) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDims;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.setLineDash([]); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);

    if (!visualResult) {
        ctx.fillStyle = '#475569'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('請載入音訊...', width / 2, height / 2); return;
    }

    try {
        const srcInput = visualResult.visualInput;
        const srcOutput = visualResult.outputData;
        const srcGR = visualResult.grCurve;
        const srcLength = srcInput.length;
        const step = srcLength / (width * zoomX);

        if (!Number.isFinite(step) || step <= 0) return;

        // Draw Loop Region
        if (loopStart !== null && loopEnd !== null && originalBuffer) {
            const totalWidth = width * zoomX;
            const startX = (loopStart / originalBuffer.duration) * totalWidth + panOffset;
            const endX = (loopEnd / originalBuffer.duration) * totalWidth + panOffset;
            const loopW = endX - startX;

            if (loopW > 0) {
                ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
                ctx.fillRect(startX, 0, loopW, height);
                ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
                ctx.fillRect(startX, 0, 1, height);
                ctx.fillRect(endX, 0, 1, height);
            }
        }

        const PADDING = 24; const centerY = (height / 2) + panOffsetY;
        const maxPixelHeight = ((height / 2) - PADDING); const ampScale = maxPixelHeight * zoomY;
        const grMaxHeight = maxPixelHeight * 0.5;

        // Grid
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
        const gridX = width / 4; for (let x = panOffset % gridX; x < width; x += gridX) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        ctx.stroke();

        const inPoints = []; const outPoints = []; const corePoints = []; const mixPoints = []; const grPoints = [];
        const dryLinear = Math.pow(10, dryGain / 20);

        // Waveform Calculation Loop
        for (let x = 0; x < width; x++) {
            const vX = x - panOffset;
            const start = Math.floor(vX * step);
            const end = Math.floor((vX + 1) * step);
            if (start < 0 || start >= srcLength) continue;
            const safeEnd = Math.min(srcLength, end);
            let maxIn = 0; let maxOut = 0; let minGR = 0; let maxMix = 0;
            const loopStartIdx = Math.max(start, 0);
            const count = safeEnd - loopStartIdx;

            if (count > 0) {
                for (let i = loopStartIdx; i < safeEnd; i++) {
                    const absIn = Math.abs(srcInput[i]); const absOut = Math.abs(srcOutput[i]); const grVal = srcGR[i];
                    if (absIn > maxIn) maxIn = absIn; if (absOut > maxOut) maxOut = absOut; if (grVal < minGR) minGR = grVal;
                    if (lastPlayedType === 'processed') { const mixVal = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (mixVal > maxMix) maxMix = mixVal; }
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
        if (lastPlayedType === 'original') { drawPolygon(ctx, inPoints, '#facc15', width, centerY); }
        else {
            const redOpacity = (isCompAdjusting || isGateAdjusting || isDeltaMode) ? 1.0 : 0.5;
            drawPolygon(ctx, inPoints, '#ef4444', width, centerY, redOpacity);
            drawPolygon(ctx, mixPoints, '#facc15', width, centerY);
            drawPolygon(ctx, outPoints, '#38bdf8', width, centerY);
            const coreColor = isDeltaMode ? '#94a3b8' : '#ffffff';
            drawPolygon(ctx, corePoints, coreColor, width, centerY);
        }
        if (grPoints.length > 0) drawGRLine(ctx, grPoints, '#ef4444');

        // Helper Label
        const drawLabel = (text, x, y, color, align) => {
            ctx.font = 'bold 12px sans-serif';
            const metrics = ctx.measureText(text);
            const bgWidth = metrics.width + 8;
            const bgHeight = 16;
            const bgX = align === 'right' ? x - bgWidth : x;
            const bgY = y - 12;
            ctx.fillStyle = color + 'F2'; ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            ctx.fillStyle = '#fff'; ctx.textAlign = align; ctx.fillText(text, x + (align === 'right' ? -4 : 4), y);
        };

        // Threshold Lines
        const isDry = lastPlayedType === 'original';
        const inactiveColor = '#475569';

        if ((hasThresholdBeenAdjusted || isCompAdjusting || hoverLine === 'comp' || isCompBypass) && signalFlowMode !== 'clip') {
            const threshY = Math.pow(10, threshold / 20) * ampScale;
            if (centerY - threshY > -20 && centerY - threshY < height + 20) {
                const tTop = centerY - threshY;
                const compColor = isDry || isCompBypass ? inactiveColor : '#22d3ee';
                ctx.strokeStyle = compColor; ctx.setLineDash([6, 4]);
                ctx.lineWidth = (hoverLine === 'comp' || isDraggingLine === 'comp') ? 3 : 2;
                ctx.beginPath(); ctx.moveTo(0, tTop); ctx.lineTo(width, tTop); ctx.moveTo(0, centerY + threshY); ctx.lineTo(width, centerY + threshY); ctx.stroke();
                drawLabel(`Comp: ${threshold}dB`, width, tTop - 4, compColor, 'right');
            }
        }
        // Gate Threshold Line (Always Visible)
        const gateThreshY = Math.pow(10, gateThreshold / 20) * ampScale;
        if ((centerY - gateThreshY > -20 && centerY - gateThreshY < height + 20) && signalFlowMode !== 'clip') {
            const gTop = centerY - gateThreshY; const gBot = centerY + gateThreshY;
            const gateColor = isDry || isGateBypass ? inactiveColor : '#f97316';
            ctx.strokeStyle = gateColor; ctx.setLineDash([3, 3]);
            ctx.lineWidth = (hoverLine === 'gate' || isDraggingLine === 'gate') ? 3 : 2;
            ctx.beginPath(); ctx.moveTo(0, gTop); ctx.lineTo(width, gTop); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, gBot); ctx.lineTo(width, gBot); ctx.stroke();
            drawLabel(`Gate: ${gateThreshold}dB`, 0, gTop + 16, gateColor, 'left');
        }

        // GR Scale Labels
        if (lastPlayedType === 'processed') {
            ctx.fillStyle = '#ef4444'; ctx.textAlign = 'right'; ctx.font = 'bold 10px monospace';
            [-3, -6, -12, -20].forEach(db => {
                const yVal = (1.0 - Math.pow(10, db / 20)) * grMaxHeight;
                if (yVal < height / 2) {
                    ctx.fillText(`${db}dB`, width - 5, yVal + 3);
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; ctx.fillRect(width - 15, yVal, 10, 1); ctx.fillStyle = '#ef4444';
                }
            });
        }

        // Minimap
        const totalWidth = width * zoomX;
        if (zoomX > 1) {
            const sw = (width / totalWidth) * width; const sx = (-panOffset / totalWidth) * width;
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, height - 4, width, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(sx, height - 4, sw, 4);
        }

        // Mouse GR Inspection
        if (mousePos.x >= 0 && lastPlayedType === 'processed' && signalFlowMode !== 'clip') {
            const vX = mousePos.x - panOffset;
            const start = Math.floor(vX * step);
            const end = Math.floor((vX + 1) * step);

            let hoverGR = 0;
            if (start >= 0 && start < srcLength) {
                hoverGR = srcGR[start];
                const safeEnd = Math.min(end, srcLength);
                for (let i = start + 1; i < safeEnd; i++) { if (srcGR[i] < hoverGR) hoverGR = srcGR[i]; }
            }

            if (hoverGrRef) hoverGrRef.current = hoverGR;

            // Always show tooltip if in processed mode
            const grY = (1.0 - Math.pow(10, hoverGR / 20)) * grMaxHeight;
            ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 1.5; ctx.setLineDash([]);

            // Vertical Line
            ctx.beginPath();
            ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, height);
            ctx.stroke();

            // Tooltip
            const text = `GR: ${hoverGR.toFixed(1)}dB`;
            ctx.font = 'bold 12px sans-serif';
            const metrics = ctx.measureText(text);
            const bgWidth = metrics.width + 12;
            const bgHeight = 20;
            const bgX = mousePos.x + 8;

            ctx.fillStyle = '#ec4899';
            ctx.fillRect(bgX, mousePos.y - bgHeight - 4, bgWidth, bgHeight);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(text, bgX + 6, mousePos.y - bgHeight - 4 + 14);
        }
    } catch (e) {
        console.error("Draw error:", e);
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
            className="flex-1 relative bg-[#202020] border-2 border-slate-800 rounded-xl shadow-inner overflow-hidden flex cursor-crosshair select-none touch-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Playheads */}
            <div ref={playheadRef} className="absolute top-0 bottom-0 w-[1px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none z-20" style={{ left: '0%', opacity: 0 }}></div>

            {/* Draggable Overlays & HUDs passed as children */}
            {children}
        </div>
    );
};

export default Waveform;