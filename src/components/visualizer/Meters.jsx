import React from 'react';

// --- Drawing Functions (Exported for App.jsx loop) ---

export const drawDualMeter = (canvas, dryPeak, outPeak, dryRms, outRms, meterState) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); const { width, height } = canvas; const centerY = height / 2;

    // Meter State Logic (Decay)
    if (outPeak > meterState.peakLevel) meterState.peakLevel = outPeak; else meterState.peakLevel *= 0.92;
    if (meterState.peakLevel > meterState.holdPeakLevel) { meterState.holdPeakLevel = meterState.peakLevel; meterState.holdTimer = 60; }
    else { if (meterState.holdTimer > 0) meterState.holdTimer--; else meterState.holdPeakLevel *= 0.98; }

    if (dryPeak > meterState.dryPeakLevel) meterState.dryPeakLevel = dryPeak; else meterState.dryPeakLevel *= 0.92;
    if (meterState.dryPeakLevel > meterState.dryHoldPeakLevel) { meterState.dryHoldPeakLevel = meterState.dryPeakLevel; meterState.dryHoldTimer = 60; }
    else { if (meterState.dryHoldTimer > 0) meterState.dryHoldTimer--; else meterState.dryHoldPeakLevel *= 0.98; }

    // Drawing
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);

    const PADDING = 24; const maxPixelHeight = (height / 2) - PADDING;

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    [-3, -10, -18, -24, -40].forEach(db => {
        const dist = Math.pow(10, db / 20) * maxPixelHeight;
        ctx.moveTo(0, centerY - dist); ctx.lineTo(width, centerY - dist);
        ctx.moveTo(0, centerY + dist); ctx.lineTo(width, centerY + dist);
    });
    ctx.stroke();

    const barWidth = (width / 2) - 4;

    // Dry Bar
    const dryBarDist = Math.min(meterState.dryPeakLevel, 1.4) * maxPixelHeight;
    if (dryBarDist > 0) {
        const grad = ctx.createLinearGradient(0, centerY + maxPixelHeight, 0, centerY - maxPixelHeight);
        grad.addColorStop(0, '#ca8a04'); grad.addColorStop(0.5, '#facc15'); grad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = grad; ctx.fillRect(2, centerY - dryBarDist, barWidth, dryBarDist * 2);
    }

    const dryHoldDist = Math.min(meterState.dryHoldPeakLevel, 1.4) * maxPixelHeight;
    if (dryHoldDist > 0) { ctx.fillStyle = '#fef08a'; ctx.fillRect(2, centerY - dryHoldDist, barWidth, 2); ctx.fillRect(2, centerY + dryHoldDist - 2, barWidth, 2); }

    // Output Bar
    const outBarDist = Math.min(meterState.peakLevel, 1.4) * maxPixelHeight;
    if (outBarDist > 0) {
        const grad = ctx.createLinearGradient(0, centerY + maxPixelHeight, 0, centerY - maxPixelHeight);
        grad.addColorStop(0, '#ef4444'); grad.addColorStop(0.5, '#22c55e'); grad.addColorStop(1, '#ef4444');
        ctx.fillStyle = grad; ctx.fillRect(width / 2 + 2, centerY - outBarDist, barWidth, outBarDist * 2);
    }

    const outHoldDist = Math.min(meterState.holdPeakLevel, 1.4) * maxPixelHeight;
    if (outHoldDist > 0) { ctx.fillStyle = '#fbbf24'; ctx.fillRect(width / 2 + 2, centerY - outHoldDist, barWidth, 2); ctx.fillRect(width / 2 + 2, centerY + outHoldDist - 2, barWidth, 2); }

    // Ghost Peaks
    if (dryBarDist > outBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(width / 2 + 2, centerY - dryBarDist, barWidth, 2); ctx.fillRect(width / 2 + 2, centerY + dryBarDist - 2, barWidth, 2); }
    if (outBarDist > dryBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(2, centerY - outBarDist, barWidth, 2); ctx.fillRect(2, centerY + outBarDist - 2, barWidth, 2); }

    // Clip Indicators
    if (meterState.dryPeakLevel > 1.0) { ctx.fillStyle = '#facc15'; ctx.fillRect(2, 0, barWidth, 4); ctx.fillRect(2, height - 4, barWidth, 4); }
    if (meterState.peakLevel > 1.0) { ctx.fillStyle = '#ef4444'; ctx.fillRect(width / 2 + 2, 0, barWidth, 4); ctx.fillRect(width / 2 + 2, height - 4, barWidth, 4); }

    // Text Labels
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    if (meterState.dryHoldPeakLevel > 0.01) { const dbVal = meterState.dryHoldPeakLevel < 0.999 ? 20 * Math.log10(meterState.dryHoldPeakLevel) : 0; ctx.fillStyle = '#fef08a'; ctx.fillText(dbVal.toFixed(1), barWidth / 2 + 2, centerY - dryHoldDist - 6); }
    if (meterState.holdPeakLevel > 0.01) { const dbVal = meterState.holdPeakLevel < 0.999 ? 20 * Math.log10(meterState.holdPeakLevel) : 0; ctx.fillStyle = '#fbbf24'; ctx.fillText(dbVal.toFixed(1), width / 2 + barWidth / 2 + 2, centerY - outHoldDist - 6); }

    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText("Dry", barWidth / 2 + 2, height - 10);
    ctx.fillText("Output", width / 2 + barWidth / 2 + 2, height - 10);

    ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 10px monospace';
    const dryRmsDb = dryRms > 0.0001 ? 20 * Math.log10(dryRms) : -100;
    const outRmsDb = outRms > 0.0001 ? 20 * Math.log10(outRms) : -100;

    ctx.fillText(`${dryRmsDb <= -60 ? '-inf' : dryRmsDb.toFixed(1)}`, barWidth / 2 + 2, 12);
    ctx.fillText(`${outRmsDb <= -60 ? '-inf' : outRmsDb.toFixed(1)}`, width / 2 + barWidth / 2 + 2, 12);

    ctx.fillStyle = '#64748b'; ctx.font = '8px sans-serif';
    ctx.fillText("RMS", barWidth / 2 + 2, 22);
    ctx.fillText("RMS", width / 2 + barWidth / 2 + 2, 22);
};

export const drawGRBar = (canvas, grDb, meterState, hoverGrDbVal = null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); const w = canvas.width; const h = canvas.height;
    const reductionLinear = 1.0 - Math.pow(10, grDb / 20);

    meterState.grPeakLevel = reductionLinear;
    if (reductionLinear > meterState.grHoldPeakLevel) { meterState.grHoldPeakLevel = reductionLinear; meterState.grHoldTimer = 60; }
    else { if (meterState.grHoldTimer > 0) meterState.grHoldTimer--; else meterState.grHoldPeakLevel *= 0.95; }

    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 0, w - 8, h);
    const PADDING = 24; const maxPixelHeight = ((h / 2) - PADDING) * 0.5;

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.beginPath();
    [-3, -6, -12, -24, -48].forEach(db => { const y = (1 - Math.pow(10, db / 20)) * maxPixelHeight; if (y < h) { ctx.moveTo(4, y); ctx.lineTo(w - 4, y); } });
    ctx.stroke();

    if (meterState.grPeakLevel > 0.001) { const barHeight = meterState.grPeakLevel * maxPixelHeight; ctx.fillStyle = '#ef4444'; ctx.fillRect(6, 0, w - 12, barHeight); ctx.fillStyle = '#fff'; ctx.fillRect(6, barHeight - 2, w - 12, 2); }
    if (meterState.grHoldPeakLevel > 0.001) {
        const holdHeight = meterState.grHoldPeakLevel * maxPixelHeight;
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(4, holdHeight, w - 8, 2);
        let dbVal = meterState.grHoldPeakLevel < 0.999 ? 20 * Math.log10(1 - meterState.grHoldPeakLevel) : -100;
        if (meterState.grHoldPeakLevel > 0.01) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(dbVal < -60 ? "-inf" : dbVal.toFixed(1), w / 2, holdHeight + 14); }
    }

    if (hoverGrDbVal !== null && hoverGrDbVal < -0.1) {
        const hoverY = (1.0 - Math.pow(10, hoverGrDbVal / 20)) * maxPixelHeight;
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(4, hoverY); ctx.lineTo(w - 4, hoverY); ctx.stroke();
    }

    ctx.fillStyle = '#64748b'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("GR", w / 2, h - 8);
};

// --- New Crest Factor Meter ---
export const drawCrestFactorMeter = (canvas, crestFactor) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 0, width - 8, height); // Slightly narrower to match GR

    // Scale range: 3dB (bottom) to 20dB (top)
    const minDb = 3;
    const maxDb = 20;
    const range = maxDb - minDb;

    // Background scale ticks
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const dbTicks = [6, 12, 18];
    dbTicks.forEach(db => {
        const pct = (db - minDb) / range;
        const y = height - (pct * height);
        ctx.moveTo(4, y);
        ctx.lineTo(width - 4, y);
    });
    ctx.stroke();

    // Value Indicator
    // Clamp value
    const val = Math.max(minDb, Math.min(maxDb, crestFactor));
    const pct = (val - minDb) / range;
    const yPos = height - (pct * height);

    // Indicator Line (Green)
    ctx.strokeStyle = '#4ade80'; // bright green
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, yPos);
    ctx.lineTo(width - 4, yPos);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 10px "Microsoft JhengHei", "Heiti TC", sans-serif'; // Chinese font preferred
    ctx.textAlign = 'center';

    // Top Label
    ctx.fillStyle = '#06b6d4'; // Cyan-500 to match other labels
    ctx.fillText("大動態", width / 2, 12);

    // Bottom Label
    ctx.fillText("小動態", width / 2, height - 6);

    // Dynamic Value
    if (crestFactor > 0.1) {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${crestFactor.toFixed(1)} dB`, width / 2, height / 2 + 4);
    }
};


// --- Component ---

const Meters = ({ grCanvasRef, outputCanvasRef, cfMeterCanvasRef, height }) => {
    // Layout Update:
    // Left Col (1/3): GR Meter + CF Meter + Spacer
    // Right Col (2/3): Output Meter (Full Height)

    const hudSpacer = 250; // Increased spacer to clear HUD significantly (User request: ~2x previous)
    const cfHeight = Math.floor((height - hudSpacer) * 0.3); // 30% of remaining space
    const grHeight = height - cfHeight - hudSpacer;

    // Ensure non-negative heights
    const safeGrHeight = Math.max(0, grHeight);
    const safeCfHeight = Math.max(0, cfHeight);

    return (
        <div className="w-44 flex flex-row bg-slate-950 border-l border-slate-800 flex-none h-full">
            {/* Left Column: GR + CF + Spacer */}
            <div className="w-1/3 flex flex-col border-r border-slate-800 h-full">
                {/* GR Meter */}
                <div className="relative w-full" style={{ height: safeGrHeight }}>
                    <canvas ref={grCanvasRef} width={64} height={safeGrHeight} className="w-full h-full" />
                    <div className="absolute top-1 left-0 w-full text-center text-[9px] text-cyan-500 font-bold">GR</div>
                </div>

                {/* Crest Factor Meter */}
                <div className="relative w-full border-t border-slate-800" style={{ height: safeCfHeight }}>
                    <canvas ref={cfMeterCanvasRef} width={64} height={safeCfHeight} className="w-full h-full" />
                </div>

                {/* Spacer for HUD */}
                <div className="w-full bg-slate-950" style={{ height: hudSpacer }}></div>
            </div>

            {/* Right Column: Output */}
            <div className="w-2/3 relative h-full">
                <canvas ref={outputCanvasRef} width={128} height={height} className="w-full h-full" />
            </div>
        </div>
    );
};

export default Meters;