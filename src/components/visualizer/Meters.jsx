import React from 'react';

// --- CF Heat Map Constants ---
const CF_HEAT_BUCKETS = 50;
const CF_HEAT_INCREMENT = 1 / (60 * 3); // 3 seconds to saturate at 60fps
const CF_HEAT_DECAY = 0.985;
const CF_GAUSSIAN_SPREAD = 4;
const CF_GAUSSIAN_SIGMA = 2;
const CF_BASE_RGB = [150, 207, 173]; // #96CFAD

// --- CF Heat Map Helper Functions ---
function cfGaussianWeight(distance, sigma) {
    return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

function cfHeatToColor(heat) {
    if (heat <= 0.01) return null;
    const [r, g, b] = CF_BASE_RGB;
    if (heat <= 0.3) {
        // Low: faint base color
        const alpha = (heat / 0.3) * 0.4;
        return `rgba(${r},${g},${b},${alpha})`;
    } else if (heat <= 0.7) {
        // Mid: solid vibrant base
        const t = (heat - 0.3) / 0.4;
        const alpha = 0.4 + t * 0.5;
        return `rgba(${r},${g},${b},${alpha})`;
    } else {
        // High: blend toward white glow
        const t = (heat - 0.7) / 0.3;
        const wr = Math.round(r + (255 - r) * t * 0.6);
        const wg = Math.round(g + (255 - g) * t * 0.6);
        const wb = Math.round(b + (255 - b) * t * 0.6);
        const alpha = 0.9 + t * 0.1;
        return `rgba(${wr},${wg},${wb},${alpha})`;
    }
}

function applyCfHeatDecay(heatArray) {
    for (let i = 0; i < CF_HEAT_BUCKETS; i++) {
        heatArray[i] *= CF_HEAT_DECAY;
        if (heatArray[i] < 0.001) heatArray[i] = 0;
    }
}

function updateCfHeatMap(heatArray, cfDb) {
    // Map CF dB (3-20) to bucket index (0-49)
    const cfMin = 3, cfMax = 20;
    const normalized = (cfDb - cfMin) / (cfMax - cfMin);
    const centerBucket = normalized * (CF_HEAT_BUCKETS - 1);
    for (let i = -CF_GAUSSIAN_SPREAD; i <= CF_GAUSSIAN_SPREAD; i++) {
        const idx = Math.round(centerBucket) + i;
        if (idx >= 0 && idx < CF_HEAT_BUCKETS) {
            const weight = cfGaussianWeight(Math.abs(i), CF_GAUSSIAN_SIGMA);
            heatArray[idx] = Math.min(1, heatArray[idx] + CF_HEAT_INCREMENT * weight);
        }
    }
}

function renderCfHeatMapVertical(ctx, heatArray, x, columnWidth, top, areaHeight) {
    const prevComposite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    const radius = Math.max(6, columnWidth / 2);
    const centerX = x + columnWidth / 2;

    for (let i = 0; i < CF_HEAT_BUCKETS; i++) {
        const heat = heatArray[i];
        const color = cfHeatToColor(heat);
        if (!color) continue;

        // bucket 0 = bottom (3 dB), bucket 49 = top (20 dB)
        const pct = i / (CF_HEAT_BUCKETS - 1);
        const y = top + areaHeight - (pct * areaHeight);

        const gradient = ctx.createRadialGradient(centerX, y, 0, centerX, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.5})`));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y - radius, columnWidth, radius * 2);
    }

    ctx.globalCompositeOperation = prevComposite;
}

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

export const drawDualMeter = (canvas, dryPeak, outPeak, dryRms, outRms, meterState, grDb = 0, hoverGrDbVal = null, crestFactor = 0, isHoveringGRArea = false) => {
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

    // GR State Logic
    const reductionLinear = 1.0 - Math.pow(10, grDb / 20);
    meterState.grPeakLevel = reductionLinear;
    if (reductionLinear > meterState.grHoldPeakLevel) { meterState.grHoldPeakLevel = reductionLinear; meterState.grHoldTimer = 60; }
    else { if (meterState.grHoldTimer > 0) meterState.grHoldTimer--; else meterState.grHoldPeakLevel *= 0.95; }

    // Drawing
    ctx.clearRect(0, 0, width, height);

    const PADDING = 0; const maxPixelHeight = (height / 2) - PADDING;

    // --- Background bars (semi-transparent light gray behind each meter) ---
    const bgColor = 'rgba(255, 255, 255, 0.06)';
    const grMaxPixelHeight = maxPixelHeight * 0.5;

    // 3 bars: 11 left, 22 bar, 11 gap, 22 bar, 11 gap, 22 bar, 16 right
    const barWidth = 22;
    const grCenterX = 11 + 11;           // 22
    const dryCenterX = 11 + 22 + 11 + 11; // 55
    const outCenterX = 11 + 22 + 11 + 22 + 11 + 11; // 88
    const grX = grCenterX - (barWidth / 2);
    const dryX = dryCenterX - (barWidth / 2);
    const outX = outCenterX - (barWidth / 2);

    ctx.fillStyle = bgColor;
    const bgRadius = 4;
    for (const bx of [grX, dryX, outX]) {
        ctx.beginPath();
        ctx.roundRect(bx, 0, barWidth, height, bgRadius);
        ctx.fill();
    }

    // --- GR Bar (top-down) ---
    if (meterState.grPeakLevel > 0.001) {
        const barHeight = meterState.grPeakLevel * grMaxPixelHeight;
        ctx.fillStyle = '#B54C35'; ctx.fillRect(grX, 0, barWidth, barHeight);
    }
    if (meterState.grHoldPeakLevel > 0.001) {
        const holdHeight = meterState.grHoldPeakLevel * grMaxPixelHeight;
        ctx.fillStyle = '#D4B88A'; ctx.fillRect(grX, holdHeight, barWidth, 2);
        let dbVal = meterState.grHoldPeakLevel < 0.999 ? 20 * Math.log10(1 - meterState.grHoldPeakLevel) : -100;
        if (meterState.grHoldPeakLevel > 0.01) { ctx.fillStyle = '#D4B88A'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText(dbVal < -60 ? "-inf" : dbVal.toFixed(1), grCenterX, holdHeight + 12); }
    }
    if (hoverGrDbVal !== null && hoverGrDbVal < -0.1 && isHoveringGRArea) {
        const hoverY = (1.0 - Math.pow(10, hoverGrDbVal / 20)) * grMaxPixelHeight;
        // Brick red filled bar from top to hover Y
        ctx.fillStyle = '#B54C35';
        ctx.fillRect(grX, 0, barWidth, hoverY);
        // Gold dB text below the bar
        const dbText = hoverGrDbVal.toFixed(1);
        ctx.fillStyle = '#C2A475'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(dbText, grCenterX, hoverY + 12);
    }

    // --- Dry Bar (center-outward) ---
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

    // Clipping detection: latch on when output peak exceeds 0dB
    if (meterState.peakLevel > 1.0) meterState.outClipping = true;
    const isClipping = meterState.outClipping;
    const outColor = isClipping ? '#E05E42' : '#C2A475';

    // --- Output Bar (center-outward) ---
    const outBarDist = Math.min(meterState.peakLevel, 1.4) * maxPixelHeight;
    if (outBarDist > 0) {
        ctx.fillStyle = outColor; ctx.fillRect(outX, centerY - outBarDist, barWidth, outBarDist * 2);
    }

    const outHoldDist = Math.min(meterState.holdPeakLevel, 1.4) * maxPixelHeight;
    if (outHoldDist > 0) { ctx.fillStyle = outColor; ctx.fillRect(outX, centerY - outHoldDist, barWidth, 2); ctx.fillRect(outX, centerY + outHoldDist - 2, barWidth, 2); }

    // Ghost Peaks
    if (dryBarDist > outBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(outX, centerY - dryBarDist, barWidth, 2); ctx.fillRect(outX, centerY + dryBarDist - 2, barWidth, 2); }
    if (outBarDist > dryBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(dryX, centerY - outBarDist, barWidth, 2); ctx.fillRect(dryX, centerY + outBarDist - 2, barWidth, 2); }

    // Clip Indicators
    if (meterState.dryPeakLevel > 1.0) { ctx.fillStyle = '#C2A475'; ctx.fillRect(dryX, 0, barWidth, 4); ctx.fillRect(dryX, height - 4, barWidth, 4); }
    if (meterState.peakLevel > 1.0) { ctx.fillStyle = '#E05E42'; ctx.fillRect(outX, 0, barWidth, 4); ctx.fillRect(outX, height - 4, barWidth, 4); }

    // --- Crest Factor (below GR, same column) ---
    const cfTop = height * 0.65;
    const cfBottom = height - 8;
    const cfHeight = cfBottom - cfTop;
    const cfMinDb = 3; const cfMaxDb = 20; const cfRange = cfMaxDb - cfMinDb;
    const cfVal = Math.max(cfMinDb, Math.min(cfMaxDb, crestFactor));
    const cfPct = (cfVal - cfMinDb) / cfRange;
    const cfY = cfBottom - (cfPct * cfHeight);

    // CF Heat Map — lazy init, update, decay, render
    if (!meterState.cfHeatArray) meterState.cfHeatArray = new Float32Array(CF_HEAT_BUCKETS);
    if (crestFactor > 0.1) updateCfHeatMap(meterState.cfHeatArray, cfVal);
    applyCfHeatDecay(meterState.cfHeatArray);
    renderCfHeatMapVertical(ctx, meterState.cfHeatArray, grX, barWidth, cfTop, cfHeight);

    // CF indicator line (on top of glow)
    ctx.strokeStyle = '#96CFAD'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(grX, cfY); ctx.lineTo(grX + barWidth, cfY); ctx.stroke();

    ctx.fillStyle = '#888'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("CF", grCenterX, cfTop - 2);
    if (crestFactor > 0.1) { ctx.fillStyle = '#96CFAD'; ctx.font = 'bold 9px monospace'; ctx.fillText(`${crestFactor.toFixed(1)}`, grCenterX, cfY - 5); }

    // Text Labels
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    if (meterState.dryHoldPeakLevel > 0.01) { const dbVal = meterState.dryHoldPeakLevel < 0.999 ? 20 * Math.log10(meterState.dryHoldPeakLevel) : 0; const dryLabelY = centerY - dryHoldDist - 6; ctx.fillStyle = '#D4B88A'; ctx.fillText(dbVal.toFixed(1), dryCenterX, dryLabelY < 10 ? centerY - dryHoldDist + 14 : dryLabelY); }
    if (meterState.holdPeakLevel > 0.01) { const dbVal = meterState.holdPeakLevel < 0.999 ? 20 * Math.log10(meterState.holdPeakLevel) : 0; const outLabelY = centerY - outHoldDist - 6; ctx.fillStyle = outColor; ctx.fillText(dbVal.toFixed(1), outCenterX, outLabelY < 10 ? centerY - outHoldDist + 14 : outLabelY); }

    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText("GR", grCenterX, 12);
    ctx.fillText("In", dryCenterX, 12);
    ctx.fillText("Out", outCenterX, 12);

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
    const PADDING = 0; const maxPixelHeight = ((h / 2) - PADDING) * 0.5;

    if (meterState.grPeakLevel > 0.001) { const barHeight = meterState.grPeakLevel * maxPixelHeight; ctx.fillStyle = '#B54C35'; ctx.fillRect(0, 0, w, barHeight); }
    if (meterState.grHoldPeakLevel > 0.001) {
        const holdHeight = meterState.grHoldPeakLevel * maxPixelHeight;
        ctx.fillStyle = '#D4B88A'; ctx.fillRect(0, holdHeight, w, 2);
        let dbVal = meterState.grHoldPeakLevel < 0.999 ? 20 * Math.log10(1 - meterState.grHoldPeakLevel) : -100;
        if (meterState.grHoldPeakLevel > 0.01) { ctx.fillStyle = '#D4B88A'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(dbVal < -60 ? "-inf" : dbVal.toFixed(1), w / 2, holdHeight + 14); }
    }


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

    // Scale range: 3dB (bottom) to 20dB (top)
    const minDb = 3;
    const maxDb = 20;
    const range = maxDb - minDb;

    // Value Indicator
    // Clamp value
    const val = Math.max(minDb, Math.min(maxDb, crestFactor));
    const pct = (val - minDb) / range;
    const yPos = height - (pct * height);

    // Indicator Line (Green)
    ctx.strokeStyle = '#96CFAD'; // bright green
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    ctx.lineTo(width, yPos);
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
    return (
        <div className="flex-none h-full relative" style={{ width: 115 }}>
            <canvas ref={outputCanvasRef} className="w-full h-full" />
            {/* Hidden canvases (kept for ref compatibility) */}
            <canvas ref={grCanvasRef} className="hidden" />
            <canvas ref={cfMeterCanvasRef} className="hidden" />
        </div>
    );
};

export default Meters;