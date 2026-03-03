import {
    GOLD, GOLD_DARK, GOLD_LIGHT, CLIP_RED,
    WHITE, DARK_RED_GRADIENT, GOLD_FILL_25, CLIP_RED_FILL_25,
    METER_BG,
} from './colors';
import {
    METER_HOLD_FRAMES, METER_PEAK_DECAY, METER_HOLD_DECAY,
    METER_BAR_WIDTH, METER_BAR_RADIUS, METER_OVERFLOW_CLAMP,
} from './canvasConstants';

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

// --- Output Meter Drawing Function ---

export const drawDualMeter = (canvas, outPeak, outRms, meterState, hoveredMeter = null, frozen = false) => {
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

    // Meter State Logic (Decay) — skip when frozen so meters hold their last values
    if (!frozen) {
        if (outPeak > meterState.peakLevel) meterState.peakLevel = outPeak; else meterState.peakLevel *= METER_PEAK_DECAY;
        if (meterState.peakLevel > meterState.holdPeakLevel) { meterState.holdPeakLevel = meterState.peakLevel; meterState.holdTimer = METER_HOLD_FRAMES; }
        else { if (meterState.holdTimer > 0) meterState.holdTimer--; else meterState.holdPeakLevel *= METER_HOLD_DECAY; }
    }

    // Drawing
    ctx.clearRect(0, 0, width, height);

    const PADDING = 0; const maxPixelHeight = (height / 2) - PADDING;

    // Single column output bar — centered
    const s = width / 22;
    const hideReadings = s < 1;
    const barWidth = METER_BAR_WIDTH * s;
    const centerX = 11 * s;
    const x = centerX - (barWidth / 2);
    const bgRadius = METER_BAR_RADIUS * s;

    // Clipping detection: latch on when output peak exceeds 0dB
    if (meterState.peakLevel > 1.0) meterState.outClipping = true;
    const isClipping = meterState.outClipping;
    const outColor = isClipping ? CLIP_RED : GOLD;

    // Background bar
    const bgColor = hoveredMeter === 'out'
        ? (isClipping ? CLIP_RED_FILL_25 : GOLD_FILL_25)
        : METER_BG;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, 0, barWidth, height, bgRadius);
    ctx.fill();

    // --- Output Bar (center-outward) ---
    const outBarDist = Math.min(meterState.peakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    if (outBarDist > 0) {
        ctx.fillStyle = outColor; ctx.fillRect(x, centerY - outBarDist, barWidth, outBarDist * 2);
    }

    const outHoldDist = Math.min(meterState.holdPeakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    if (outHoldDist > 0) { ctx.fillStyle = outColor; ctx.fillRect(x, centerY - outHoldDist, barWidth, 2 * s); ctx.fillRect(x, centerY + outHoldDist - 2 * s, barWidth, 2 * s); }

    // Clip Indicator
    if (meterState.peakLevel > 1.0) { ctx.fillStyle = CLIP_RED; ctx.fillRect(x, 0, barWidth, 4 * s); ctx.fillRect(x, height - 4 * s, barWidth, 4 * s); }

    // Text Labels
    if (!hideReadings) {
        ctx.font = 'bold ' + Math.max(7, Math.round(9 * s)) + 'px monospace'; ctx.textAlign = 'center';
        if (meterState.holdPeakLevel > 0.01) { const dbVal = meterState.holdPeakLevel < 0.999 ? 20 * Math.log10(meterState.holdPeakLevel) : 0; const outLabelY = centerY - outHoldDist - 6 * s; ctx.fillStyle = outColor; ctx.fillText(dbVal.toFixed(1), centerX, outLabelY < 10 * s ? centerY - outHoldDist + 14 * s : outLabelY); }
    }

    ctx.fillStyle = WHITE; ctx.font = 'bold ' + Math.max(7, Math.round(10 * s)) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("Out", centerX, 12 * s);
};


// --- Input Meter Drawing Function (single bar) ---

export const drawInputMeter = (canvas, dryPeak, dryRms, meterState, hoveredMeter = null, frozen = false) => {
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

    // Meter State Logic (Decay) — skip when frozen
    if (!frozen) {
        if (dryPeak > meterState.dryPeakLevel) meterState.dryPeakLevel = dryPeak; else meterState.dryPeakLevel *= METER_PEAK_DECAY;
        if (meterState.dryPeakLevel > meterState.dryHoldPeakLevel) { meterState.dryHoldPeakLevel = meterState.dryPeakLevel; meterState.dryHoldTimer = METER_HOLD_FRAMES; }
        else { if (meterState.dryHoldTimer > 0) meterState.dryHoldTimer--; else meterState.dryHoldPeakLevel *= METER_HOLD_DECAY; }
    }

    ctx.clearRect(0, 0, width, height);

    const PADDING = 0; const maxPixelHeight = (height / 2) - PADDING;

    // Scale from 30px reference width
    const s = width / 22;
    const hideReadings = s < 1;
    const barWidth = METER_BAR_WIDTH * s;
    const centerX = 11 * s;
    const x = centerX - (barWidth / 2);
    const bgRadius = METER_BAR_RADIUS * s;

    // Clipping detection: latch on when input peak exceeds 0dB
    if (meterState.dryPeakLevel > 1.0) meterState.inClipping = true;
    const isInClipping = meterState.inClipping;

    // Background bar
    const bgColor = hoveredMeter === 'in'
        ? (isInClipping ? CLIP_RED_FILL_25 : GOLD_FILL_25)
        : METER_BG;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, 0, barWidth, height, bgRadius);
    ctx.fill();

    // --- Dry Bar (center-outward bilateral, gold or red gradient) ---
    const dryBarDist = Math.min(meterState.dryPeakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    if (dryBarDist > 0) {
        const gradKey = isInClipping ? 'inputDryClip' : 'inputDry';
        const grad = getCachedGradient(canvas, ctx, gradKey, width, height, PADDING, (c, w, h, p) => {
            const mph = (h / 2) - p;
            const g = c.createLinearGradient(0, h / 2 + mph, 0, h / 2 - mph);
            if (isInClipping) {
                g.addColorStop(0, DARK_RED_GRADIENT); g.addColorStop(0.5, CLIP_RED); g.addColorStop(1, DARK_RED_GRADIENT);
            } else {
                g.addColorStop(0, GOLD_DARK); g.addColorStop(0.5, GOLD); g.addColorStop(1, GOLD_DARK);
            }
            return g;
        });
        ctx.fillStyle = grad; ctx.fillRect(x, centerY - dryBarDist, barWidth, dryBarDist * 2);
    }

    // Peak hold lines
    const dryHoldDist = Math.min(meterState.dryHoldPeakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    const holdColor = isInClipping ? CLIP_RED : GOLD_LIGHT;
    if (dryHoldDist > 0) { ctx.fillStyle = holdColor; ctx.fillRect(x, centerY - dryHoldDist, barWidth, 2 * s); ctx.fillRect(x, centerY + dryHoldDist - 2 * s, barWidth, 2 * s); }

    // Clip indicators (exceeds 0dB)
    if (meterState.dryPeakLevel > 1.0) { ctx.fillStyle = CLIP_RED; ctx.fillRect(x, 0, barWidth, 4 * s); ctx.fillRect(x, height - 4 * s, barWidth, 4 * s); }

    // dB reading
    if (!hideReadings) {
        ctx.font = 'bold ' + Math.max(7, Math.round(9 * s)) + 'px monospace'; ctx.textAlign = 'center';
        if (meterState.dryHoldPeakLevel > 0.01) { const dbVal = meterState.dryHoldPeakLevel < 0.999 ? 20 * Math.log10(meterState.dryHoldPeakLevel) : 0; const dryLabelY = centerY - dryHoldDist - 6 * s; ctx.fillStyle = isInClipping ? CLIP_RED : GOLD_LIGHT; ctx.fillText(dbVal.toFixed(1), centerX, dryLabelY < 10 * s ? centerY - dryHoldDist + 14 * s : dryLabelY); }
    }

    // "In" label
    ctx.fillStyle = WHITE; ctx.font = 'bold ' + Math.max(7, Math.round(10 * s)) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("In", centerX, 12 * s);
};
