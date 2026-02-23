import React from 'react';

// --- Gradient Cache (WeakMap keyed on canvas, invalidated on resize) ---
const _gradientCache = new WeakMap();

const getCachedGradient = (canvas, ctx, key, width, height, PADDING, createFn) => {
    let entry = _gradientCache.get(canvas);
    if (!entry) { entry = {}; _gradientCache.set(canvas, entry); }
    const cached = entry[key];
    if (cached && cached.w === width && cached.h === height) return cached.grad;
    const grad = createFn(ctx, width, height, PADDING);
    entry[key] = { grad, w: width, h: height };
    return grad;
};

// --- Drawing Functions (Exported for App.jsx loop) ---

export const drawDualMeter = (canvas, dryPeak, outPeak, dryRms, outRms, meterState) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const physW = Math.round(width * dpr);
    const physH = Math.round(height * dpr);
    if (canvas.width !== physW) canvas.width = physW;
    if (canvas.height !== physH) canvas.height = physH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const centerY = height / 2;

    // Meter State Logic (Decay)
    if (outPeak > meterState.peakLevel) meterState.peakLevel = outPeak; else meterState.peakLevel *= 0.92;
    if (meterState.peakLevel > meterState.holdPeakLevel) { meterState.holdPeakLevel = meterState.peakLevel; meterState.holdTimer = 60; }
    else { if (meterState.holdTimer > 0) meterState.holdTimer--; else meterState.holdPeakLevel *= 0.98; }

    if (dryPeak > meterState.dryPeakLevel) meterState.dryPeakLevel = dryPeak; else meterState.dryPeakLevel *= 0.92;
    if (meterState.dryPeakLevel > meterState.dryHoldPeakLevel) { meterState.dryHoldPeakLevel = meterState.dryPeakLevel; meterState.dryHoldTimer = 60; }
    else { if (meterState.dryHoldTimer > 0) meterState.dryHoldTimer--; else meterState.dryHoldPeakLevel *= 0.98; }

    // Drawing
    ctx.clearRect(0, 0, width, height);

    const PADDING = 24; const maxPixelHeight = (height / 2) - PADDING;

    const barWidth = ((width / 2) - 4) * 0.5;
    const dryX = (width / 4) - (barWidth / 2);
    const outX = (3 * width / 4) - (barWidth / 2);
    const dryCenterX = width / 4;
    const outCenterX = 3 * width / 4;

    // Dry Bar
    const dryBarDist = Math.min(meterState.dryPeakLevel, 1.4) * maxPixelHeight;
    if (dryBarDist > 0) {
        const grad = getCachedGradient(canvas, ctx, 'dry', width, height, PADDING, (c, w, h, p) => {
            const mph = (h / 2) - p;
            const g = c.createLinearGradient(0, h / 2 + mph, 0, h / 2 - mph);
            g.addColorStop(0, '#9A8259'); g.addColorStop(0.5, '#C2A475'); g.addColorStop(1, '#9A8259');
            return g;
        });
        ctx.fillStyle = grad; ctx.fillRect(dryX, centerY - dryBarDist, barWidth, dryBarDist * 2);
    }

    const dryHoldDist = Math.min(meterState.dryHoldPeakLevel, 1.4) * maxPixelHeight;
    if (dryHoldDist > 0) { ctx.fillStyle = '#D4B88A'; ctx.fillRect(dryX, centerY - dryHoldDist, barWidth, 2); ctx.fillRect(dryX, centerY + dryHoldDist - 2, barWidth, 2); }

    // Output Bar
    const outBarDist = Math.min(meterState.peakLevel, 1.4) * maxPixelHeight;
    if (outBarDist > 0) {
        const grad = getCachedGradient(canvas, ctx, 'out', width, height, PADDING, (c, w, h, p) => {
            const mph = (h / 2) - p;
            const g = c.createLinearGradient(0, h / 2 + mph, 0, h / 2 - mph);
            g.addColorStop(0, '#E05E42'); g.addColorStop(0.5, '#96CFAD'); g.addColorStop(1, '#E05E42');
            return g;
        });
        ctx.fillStyle = grad; ctx.fillRect(outX, centerY - outBarDist, barWidth, outBarDist * 2);
    }

    const outHoldDist = Math.min(meterState.holdPeakLevel, 1.4) * maxPixelHeight;
    if (outHoldDist > 0) { ctx.fillStyle = '#D4B88A'; ctx.fillRect(outX, centerY - outHoldDist, barWidth, 2); ctx.fillRect(outX, centerY + outHoldDist - 2, barWidth, 2); }

    // Ghost Peaks
    if (dryBarDist > outBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(outX, centerY - dryBarDist, barWidth, 2); ctx.fillRect(outX, centerY + dryBarDist - 2, barWidth, 2); }
    if (outBarDist > dryBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(dryX, centerY - outBarDist, barWidth, 2); ctx.fillRect(dryX, centerY + outBarDist - 2, barWidth, 2); }

    // Clip Indicators
    if (meterState.dryPeakLevel > 1.0) { ctx.fillStyle = '#C2A475'; ctx.fillRect(dryX, 0, barWidth, 4); ctx.fillRect(dryX, height - 4, barWidth, 4); }
    if (meterState.peakLevel > 1.0) { ctx.fillStyle = '#E05E42'; ctx.fillRect(outX, 0, barWidth, 4); ctx.fillRect(outX, height - 4, barWidth, 4); }

    // Text Labels
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    if (meterState.dryHoldPeakLevel > 0.01) { const dbVal = meterState.dryHoldPeakLevel < 0.999 ? 20 * Math.log10(meterState.dryHoldPeakLevel) : 0; ctx.fillStyle = '#D4B88A'; ctx.fillText(dbVal.toFixed(1), dryCenterX, centerY - dryHoldDist - 6); }
    if (meterState.holdPeakLevel > 0.01) { const dbVal = meterState.holdPeakLevel < 0.999 ? 20 * Math.log10(meterState.holdPeakLevel) : 0; ctx.fillStyle = '#D4B88A'; ctx.fillText(dbVal.toFixed(1), outCenterX, centerY - outHoldDist - 6); }

    ctx.fillStyle = '#888'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText("In", dryCenterX, 12);
    ctx.fillText("Out", outCenterX, 12);

    ctx.fillStyle = '#e5e7eb'; ctx.font = 'bold 10px monospace';
    const dryRmsDb = dryRms > 0.0001 ? 20 * Math.log10(dryRms) : -100;
    const outRmsDb = outRms > 0.0001 ? 20 * Math.log10(outRms) : -100;

    ctx.fillText(`${dryRmsDb <= -60 ? '-inf' : dryRmsDb.toFixed(1)}`, dryCenterX, 24);
    ctx.fillText(`${outRmsDb <= -60 ? '-inf' : outRmsDb.toFixed(1)}`, outCenterX, 24);

    ctx.fillStyle = '#666'; ctx.font = '8px sans-serif';
    ctx.fillText("RMS", dryCenterX, 34);
    ctx.fillText("RMS", outCenterX, 34);
};

export const drawGRBar = (canvas, grDb, meterState, hoverGrDbVal = null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const physW = Math.round(w * dpr);
    const physH = Math.round(h * dpr);
    if (canvas.width !== physW) canvas.width = physW;
    if (canvas.height !== physH) canvas.height = physH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reductionLinear = 1.0 - Math.pow(10, grDb / 20);

    meterState.grPeakLevel = reductionLinear;
    if (reductionLinear > meterState.grHoldPeakLevel) { meterState.grHoldPeakLevel = reductionLinear; meterState.grHoldTimer = 60; }
    else { if (meterState.grHoldTimer > 0) meterState.grHoldTimer--; else meterState.grHoldPeakLevel *= 0.95; }

    ctx.clearRect(0, 0, w, h);
    const PADDING = 24; const maxPixelHeight = ((h / 2) - PADDING) * 0.5;

    if (meterState.grPeakLevel > 0.001) { const barHeight = meterState.grPeakLevel * maxPixelHeight; ctx.fillStyle = '#E05E42'; ctx.fillRect(6, 0, w - 12, barHeight); ctx.fillStyle = '#fff'; ctx.fillRect(6, barHeight - 2, w - 12, 2); }
    if (meterState.grHoldPeakLevel > 0.001) {
        const holdHeight = meterState.grHoldPeakLevel * maxPixelHeight;
        ctx.fillStyle = '#D4B88A'; ctx.fillRect(4, holdHeight, w - 8, 2);
        let dbVal = meterState.grHoldPeakLevel < 0.999 ? 20 * Math.log10(1 - meterState.grHoldPeakLevel) : -100;
        if (meterState.grHoldPeakLevel > 0.01) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(dbVal < -60 ? "-inf" : dbVal.toFixed(1), w / 2, holdHeight + 14); }
    }

    if (hoverGrDbVal !== null && hoverGrDbVal < -0.1) {
        const hoverY = (1.0 - Math.pow(10, hoverGrDbVal / 20)) * maxPixelHeight;
        ctx.strokeStyle = '#C2A475';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(4, hoverY); ctx.lineTo(w - 4, hoverY); ctx.stroke();
    }

    ctx.fillStyle = '#666'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("GR", w / 2, h - 8);
};

// --- New Crest Factor Meter ---
export const drawCrestFactorMeter = (canvas, crestFactor) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const physW = Math.round(width * dpr);
    const physH = Math.round(height * dpr);
    if (canvas.width !== physW) canvas.width = physW;
    if (canvas.height !== physH) canvas.height = physH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#202020';
    ctx.fillRect(4, 0, width - 8, height); // Slightly narrower to match GR

    // Scale range: 3dB (bottom) to 20dB (top)
    const minDb = 3;
    const maxDb = 20;
    const range = maxDb - minDb;

    // Background scale ticks
    ctx.strokeStyle = '#2B2B2B';
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
    ctx.strokeStyle = '#96CFAD'; // bright green
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, yPos);
    ctx.lineTo(width - 4, yPos);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 10px "Microsoft JhengHei", "Heiti TC", sans-serif'; // Chinese font preferred
    ctx.textAlign = 'center';

    // Top Label
    ctx.fillStyle = '#888'; // Cyan-500 to match other labels
    ctx.fillText("大動態", width / 2, 12);

    // Bottom Label
    ctx.fillText("小動態", width / 2, height - 6);

    // Dynamic Value
    if (crestFactor > 0.1) {
        ctx.fillStyle = '#96CFAD';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${crestFactor.toFixed(1)} dB`, width / 2, height / 2 + 4);
    }
};


// --- Component ---

const Meters = ({ grCanvasRef, outputCanvasRef, cfMeterCanvasRef, height }) => {
    // Layout Update:
    // Left Col (1/3): GR Meter + CF Meter + Spacer
    // Right Col (2/3): Output Meter (Full Height)

    const cfHeight = Math.floor(height * 0.3); // 30% of total height
    const grHeight = height - cfHeight;

    // Ensure non-negative heights
    const safeGrHeight = Math.max(0, grHeight);
    const safeCfHeight = Math.max(0, cfHeight);

    return (
        <div className="w-44 flex flex-row bg-[#111111] border-l border-[#2B2B2B] flex-none h-full">
            {/* Left Column: GR + CF */}
            <div className="w-1/3 flex flex-col border-r border-[#2B2B2B] h-full">
                {/* GR Meter */}
                <div className="relative w-full flex-1" style={{ height: safeGrHeight }}>
                    <canvas ref={grCanvasRef} className="w-full h-full" />
                    <div className="absolute top-1 left-0 w-full text-center text-[9px] text-[#888] font-bold">GR</div>
                </div>

                {/* Crest Factor Meter */}
                <div className="relative w-full border-t border-[#2B2B2B]" style={{ height: safeCfHeight }}>
                    <canvas ref={cfMeterCanvasRef} className="w-full h-full" />
                </div>
            </div>

            {/* Right Column: Output */}
            <div className="w-2/3 relative h-full">
                <canvas ref={outputCanvasRef} className="w-full h-full" />
            </div>
        </div>
    );
};

export default Meters;