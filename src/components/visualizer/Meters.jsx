import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GOLD, GOLD_DARK, GOLD_LIGHT, BRICK_RED, CLIP_RED, CREST_GREEN, TEXT_MID } from '../../utils/colors';
import {
    METER_HOLD_FRAMES, METER_PEAK_DECAY, METER_HOLD_DECAY, METER_GR_HOLD_DECAY,
    METER_BAR_WIDTH, METER_BAR_RADIUS, METER_OVERFLOW_CLAMP, METER_GR_NEAR_ZERO,
    GR_MAX_HEIGHT_RATIO, CF_DB_MIN, CF_DB_MAX, CF_TOP_RATIO, CF_BOTTOM_MARGIN,
} from '../../utils/canvasConstants';

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
    const cfMin = CF_DB_MIN, cfMax = CF_DB_MAX;
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

export const drawDualMeter = (canvas, dryPeak, outPeak, dryRms, outRms, meterState, grDb = 0, hoverGrDbVal = null, crestFactor = 0, isHoveringGRArea = false, hoveredMeter = null, frozen = false) => {
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

        if (dryPeak > meterState.dryPeakLevel) meterState.dryPeakLevel = dryPeak; else meterState.dryPeakLevel *= METER_PEAK_DECAY;
        if (meterState.dryPeakLevel > meterState.dryHoldPeakLevel) { meterState.dryHoldPeakLevel = meterState.dryPeakLevel; meterState.dryHoldTimer = METER_HOLD_FRAMES; }
        else { if (meterState.dryHoldTimer > 0) meterState.dryHoldTimer--; else meterState.dryHoldPeakLevel *= METER_HOLD_DECAY; }

        // GR State Logic
        const reductionLinear = 1.0 - Math.pow(10, grDb / 20);
        meterState.grPeakLevel = reductionLinear;
        if (reductionLinear > meterState.grHoldPeakLevel) { meterState.grHoldPeakLevel = reductionLinear; meterState.grHoldTimer = METER_HOLD_FRAMES; }
        else { if (meterState.grHoldTimer > 0) meterState.grHoldTimer--; else meterState.grHoldPeakLevel *= METER_GR_HOLD_DECAY; }
    }

    // Drawing
    ctx.clearRect(0, 0, width, height);

    const PADDING = 0; const maxPixelHeight = (height / 2) - PADDING;

    // --- Background bars (semi-transparent light gray behind each meter) ---
    const bgColor = 'rgba(255, 255, 255, 0.06)';
    const grMaxPixelHeight = maxPixelHeight * GR_MAX_HEIGHT_RATIO;

    // 3 bars: scale all positions proportionally from 104px reference width
    const s = width / 104;
    const hideReadings = s < 1; // below 740px breakpoint, meter is narrower than 104px
    const barWidth = METER_BAR_WIDTH * s;
    const grCenterX = 38 * s;
    const dryCenterX = 65.5 * s;
    const outCenterX = 93 * s;
    const grX = grCenterX - (barWidth / 2);
    const dryX = dryCenterX - (barWidth / 2);
    const outX = outCenterX - (barWidth / 2);

    const bgRadius = METER_BAR_RADIUS * s;
    // Hover highlight colors at 40% alpha (matching each meter's bar color)
    const hoverBgMap = {
        gr: 'rgba(181, 76, 53, 0.25)',   // BRICK_RED
        cf: 'rgba(150, 207, 173, 0.25)', // CREST_GREEN
        in: 'rgba(194, 164, 117, 0.25)', // GOLD
        out: meterState.outClipping ? 'rgba(224, 94, 66, 0.25)' : 'rgba(194, 164, 117, 0.25)', // CLIP_RED or GOLD
    };
    const cfTop = height * CF_TOP_RATIO;
    // GR/CF column: split into two hover zones
    const grCfHover = hoveredMeter === 'gr' || hoveredMeter === 'cf';
    if (grCfHover) {
        // Non-hovered portion: default bg
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(grX, 0, barWidth, height, bgRadius);
        ctx.fill();
        // Hovered portion: colored overlay (clip to region)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(grX, 0, barWidth, height, bgRadius);
        ctx.clip();
        ctx.fillStyle = hoverBgMap[hoveredMeter];
        if (hoveredMeter === 'gr') {
            ctx.fillRect(grX, 0, barWidth, cfTop);
        } else {
            ctx.fillRect(grX, cfTop, barWidth, height - cfTop);
        }
        ctx.restore();
    } else {
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(grX, 0, barWidth, height, bgRadius);
        ctx.fill();
    }
    // In and Out columns
    for (const { x: bx, key } of [{ x: dryX, key: 'in' }, { x: outX, key: 'out' }]) {
        ctx.fillStyle = hoveredMeter === key ? hoverBgMap[key] : bgColor;
        ctx.beginPath();
        ctx.roundRect(bx, 0, barWidth, height, bgRadius);
        ctx.fill();
    }

    // --- GR Bar (top-down) ---
    if (meterState.grPeakLevel > METER_GR_NEAR_ZERO) {
        const barHeight = meterState.grPeakLevel * grMaxPixelHeight;
        ctx.fillStyle = BRICK_RED; ctx.fillRect(grX, 0, barWidth, barHeight);
    }
    if (meterState.grHoldPeakLevel > METER_GR_NEAR_ZERO) {
        const holdHeight = meterState.grHoldPeakLevel * grMaxPixelHeight;
        ctx.fillStyle = BRICK_RED; ctx.fillRect(grX, holdHeight, barWidth, 2 * s);
        let dbVal = meterState.grHoldPeakLevel < 0.999 ? 20 * Math.log10(1 - meterState.grHoldPeakLevel) : -100;
        if (!hideReadings && meterState.grHoldPeakLevel > 0.01) { ctx.fillStyle = BRICK_RED; ctx.font = 'bold ' + Math.max(7, Math.round(9 * s)) + 'px monospace'; ctx.textAlign = 'center'; ctx.fillText(dbVal < -60 ? "-inf" : dbVal.toFixed(1), grCenterX, holdHeight + 12 * s); }
    }
    if (hoverGrDbVal !== null && hoverGrDbVal < -0.1 && isHoveringGRArea) {
        const hoverY = (1.0 - Math.pow(10, hoverGrDbVal / 20)) * grMaxPixelHeight;
        // Brick red filled bar from top to hover Y
        ctx.fillStyle = BRICK_RED;
        ctx.fillRect(grX, 0, barWidth, hoverY);
        // Gold dB text below the bar
        if (!hideReadings) {
            const dbText = hoverGrDbVal.toFixed(1);
            ctx.fillStyle = BRICK_RED; ctx.font = 'bold ' + Math.max(7, Math.round(9 * s)) + 'px monospace'; ctx.textAlign = 'center';
            ctx.fillText(dbText, grCenterX, hoverY + 12 * s);
        }
    }

    // --- Dry Bar (center-outward) ---
    const dryBarDist = Math.min(meterState.dryPeakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    if (dryBarDist > 0) {
        const grad = getCachedGradient(canvas, ctx, 'dry', width, height, PADDING, (c, w, h, p) => {
            const mph = (h / 2) - p;
            const g = c.createLinearGradient(0, h / 2 + mph, 0, h / 2 - mph);
            g.addColorStop(0, GOLD_DARK); g.addColorStop(0.5, GOLD); g.addColorStop(1, GOLD_DARK);
            return g;
        });
        ctx.fillStyle = grad; ctx.fillRect(dryX, centerY - dryBarDist, barWidth, dryBarDist * 2);
    }

    const dryHoldDist = Math.min(meterState.dryHoldPeakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    if (dryHoldDist > 0) { ctx.fillStyle = GOLD_LIGHT; ctx.fillRect(dryX, centerY - dryHoldDist, barWidth, 2 * s); ctx.fillRect(dryX, centerY + dryHoldDist - 2 * s, barWidth, 2 * s); }

    // Clipping detection: latch on when output peak exceeds 0dB
    if (meterState.peakLevel > 1.0) meterState.outClipping = true;
    const isClipping = meterState.outClipping;
    const outColor = isClipping ? CLIP_RED : GOLD;

    // --- Output Bar (center-outward) ---
    const outBarDist = Math.min(meterState.peakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    if (outBarDist > 0) {
        ctx.fillStyle = outColor; ctx.fillRect(outX, centerY - outBarDist, barWidth, outBarDist * 2);
    }

    const outHoldDist = Math.min(meterState.holdPeakLevel, METER_OVERFLOW_CLAMP) * maxPixelHeight;
    if (outHoldDist > 0) { ctx.fillStyle = outColor; ctx.fillRect(outX, centerY - outHoldDist, barWidth, 2 * s); ctx.fillRect(outX, centerY + outHoldDist - 2 * s, barWidth, 2 * s); }

    // Ghost Peaks
    if (dryBarDist > outBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(outX, centerY - dryBarDist, barWidth, 2 * s); ctx.fillRect(outX, centerY + dryBarDist - 2 * s, barWidth, 2 * s); }
    if (outBarDist > dryBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(dryX, centerY - outBarDist, barWidth, 2 * s); ctx.fillRect(dryX, centerY + outBarDist - 2 * s, barWidth, 2 * s); }

    // Clip Indicators
    if (meterState.dryPeakLevel > 1.0) { ctx.fillStyle = GOLD; ctx.fillRect(dryX, 0, barWidth, 4 * s); ctx.fillRect(dryX, height - 4 * s, barWidth, 4 * s); }
    if (meterState.peakLevel > 1.0) { ctx.fillStyle = CLIP_RED; ctx.fillRect(outX, 0, barWidth, 4 * s); ctx.fillRect(outX, height - 4 * s, barWidth, 4 * s); }

    // --- Crest Factor (below GR, same column) ---
    const cfBottom = height - CF_BOTTOM_MARGIN;
    const cfHeight = cfBottom - cfTop;
    const cfMinDb = CF_DB_MIN; const cfMaxDb = CF_DB_MAX; const cfRange = cfMaxDb - cfMinDb;
    const cfVal = Math.max(cfMinDb, Math.min(cfMaxDb, crestFactor));
    const cfPct = (cfVal - cfMinDb) / cfRange;
    const cfY = cfBottom - (cfPct * cfHeight);

    // CF Heat Map — lazy init, update, decay, render (skip mutation when frozen)
    if (!meterState.cfHeatArray) meterState.cfHeatArray = new Float32Array(CF_HEAT_BUCKETS);
    if (!frozen) {
        if (crestFactor > 0.1) updateCfHeatMap(meterState.cfHeatArray, cfVal);
        applyCfHeatDecay(meterState.cfHeatArray);
    }
    renderCfHeatMapVertical(ctx, meterState.cfHeatArray, grX, barWidth, cfTop, cfHeight);

    // CF indicator line (on top of glow)
    ctx.strokeStyle = CREST_GREEN; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(grX, cfY); ctx.lineTo(grX + barWidth, cfY); ctx.stroke();

    ctx.fillStyle = TEXT_MID; ctx.font = 'bold ' + Math.max(7, Math.round(8 * s)) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("CF", grCenterX, cfTop - 2 * s);
    if (!hideReadings && crestFactor > 0.1) { ctx.fillStyle = CREST_GREEN; ctx.font = 'bold ' + Math.max(7, Math.round(9 * s)) + 'px monospace'; ctx.fillText(`${crestFactor.toFixed(1)}`, grCenterX, cfY - 5 * s); }

    // Text Labels
    if (!hideReadings) {
        ctx.font = 'bold ' + Math.max(7, Math.round(9 * s)) + 'px monospace'; ctx.textAlign = 'center';
        if (meterState.dryHoldPeakLevel > 0.01) { const dbVal = meterState.dryHoldPeakLevel < 0.999 ? 20 * Math.log10(meterState.dryHoldPeakLevel) : 0; const dryLabelY = centerY - dryHoldDist - 6 * s; ctx.fillStyle = GOLD_LIGHT; ctx.fillText(dbVal.toFixed(1), dryCenterX, dryLabelY < 10 * s ? centerY - dryHoldDist + 14 * s : dryLabelY); }
        if (meterState.holdPeakLevel > 0.01) { const dbVal = meterState.holdPeakLevel < 0.999 ? 20 * Math.log10(meterState.holdPeakLevel) : 0; const outLabelY = centerY - outHoldDist - 6 * s; ctx.fillStyle = outColor; ctx.fillText(dbVal.toFixed(1), outCenterX, outLabelY < 10 * s ? centerY - outHoldDist + 14 * s : outLabelY); }
    }

    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.max(7, Math.round(10 * s)) + 'px sans-serif';
    ctx.fillText("GR", grCenterX, 12 * s);
    ctx.fillText("In", dryCenterX, 12 * s);
    ctx.fillText("Out", outCenterX, 12 * s);

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
    if (reductionLinear > meterState.grHoldPeakLevel) { meterState.grHoldPeakLevel = reductionLinear; meterState.grHoldTimer = METER_HOLD_FRAMES; }
    else { if (meterState.grHoldTimer > 0) meterState.grHoldTimer--; else meterState.grHoldPeakLevel *= METER_GR_HOLD_DECAY; }

    ctx.clearRect(0, 0, w, h);
    const PADDING = 0; const maxPixelHeight = ((h / 2) - PADDING) * GR_MAX_HEIGHT_RATIO;

    if (meterState.grPeakLevel > METER_GR_NEAR_ZERO) { const barHeight = meterState.grPeakLevel * maxPixelHeight; ctx.fillStyle = BRICK_RED; ctx.fillRect(0, 0, w, barHeight); }
    if (meterState.grHoldPeakLevel > METER_GR_NEAR_ZERO) {
        const holdHeight = meterState.grHoldPeakLevel * maxPixelHeight;
        ctx.fillStyle = BRICK_RED; ctx.fillRect(0, holdHeight, w, 2);
        let dbVal = meterState.grHoldPeakLevel < 0.999 ? 20 * Math.log10(1 - meterState.grHoldPeakLevel) : -100;
        if (meterState.grHoldPeakLevel > 0.01) { ctx.fillStyle = BRICK_RED; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(dbVal < -60 ? "-inf" : dbVal.toFixed(1), w / 2, holdHeight + 14); }
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
    const minDb = CF_DB_MIN;
    const maxDb = CF_DB_MAX;
    const range = maxDb - minDb;

    // Value Indicator
    // Clamp value
    const val = Math.max(minDb, Math.min(maxDb, crestFactor));
    const pct = (val - minDb) / range;
    const yPos = height - (pct * height);

    // Indicator Line (Green)
    ctx.strokeStyle = CREST_GREEN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    ctx.lineTo(width, yPos);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 10px "Microsoft JhengHei", "Heiti TC", sans-serif';
    ctx.textAlign = 'center';

    // Top Label
    ctx.fillStyle = TEXT_MID;
    ctx.fillText("大動態", width / 2, 12);

    // Bottom Label
    ctx.fillText("小動態", width / 2, height - 6);

    // Dynamic Value
    if (crestFactor > 0.1) {
        ctx.fillStyle = CREST_GREEN;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${crestFactor.toFixed(1)} dB`, width / 2, height / 2 + 4);
    }
};


// --- Component ---

// Meter hit-zone boundaries as ratios of 104px reference width
const METER_GR_RIGHT_RATIO = 33 / 104;   // midpoint between GR bar end and In bar start
const METER_IN_RIGHT_RATIO = 63.25 / 104; // midpoint between In bar end and Out bar start

const Meters = ({ grCanvasRef, outputCanvasRef, cfMeterCanvasRef, height, hoveredMeterRef, meterStateRef, hoverGrRef, isHoveringGRAreaRef }) => {
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false });
    const [, setTick] = useState(0);
    const rafRef = useRef(null);

    // RAF loop — force re-render every frame while tooltip is visible so dB values stay live
    useEffect(() => {
        if (!tooltipPos.visible) return;
        let running = true;
        const loop = () => {
            if (!running) return;
            setTick(t => t + 1);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(rafRef.current); };
    }, [tooltipPos.visible]);

    // Frozen redraw — repaint meter canvas with current state (no decay) to update hover border
    const frozenRedraw = useCallback(() => {
        if (!outputCanvasRef?.current || !meterStateRef?.current) return;
        const ms = meterStateRef.current;
        drawDualMeter(outputCanvasRef.current, 0, 0, 0, 0, ms, 0, hoverGrRef?.current ?? null, ms.crestFactor || 0, isHoveringGRAreaRef?.current ?? false, hoveredMeterRef?.current, true);
    }, [outputCanvasRef, meterStateRef, hoverGrRef, isHoveringGRAreaRef, hoveredMeterRef]);

    const handleMouseMove = useCallback((e) => {
        if (!hoveredMeterRef) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;
        const cfTop = h * CF_TOP_RATIO;

        let zone;
        if (x < w * METER_GR_RIGHT_RATIO) {
            zone = y < cfTop ? 'gr' : 'cf';
        } else if (x < w * METER_IN_RIGHT_RATIO) {
            zone = 'in';
        } else {
            zone = 'out';
        }

        if (hoveredMeterRef.current !== zone) {
            hoveredMeterRef.current = zone;
            frozenRedraw();
        }
        setTooltipPos({ x: e.clientX, y: e.clientY, visible: true });
    }, [hoveredMeterRef, frozenRedraw]);

    const handleMouseLeave = useCallback(() => {
        if (hoveredMeterRef && hoveredMeterRef.current !== null) {
            hoveredMeterRef.current = null;
            frozenRedraw();
        }
        setTooltipPos(prev => prev.visible ? { ...prev, visible: false } : prev);
    }, [hoveredMeterRef, frozenRedraw]);

    // --- Tooltip content (zone-specific) ---
    let tooltipNode = null;
    const activeZone = hoveredMeterRef?.current;
    if (tooltipPos.visible && activeZone && meterStateRef?.current) {
        const ms = meterStateRef.current;
        let text;
        if (activeZone === 'gr') {
            const val = ms.grHoldPeakLevel > 0.01
                ? (20 * Math.log10(1 - ms.grHoldPeakLevel)).toFixed(1) : "0.0";
            text = `GR (Gain Reduction 壓縮量) : ${val} dB`;
        } else if (activeZone === 'in') {
            const val = ms.dryHoldPeakLevel > 0.01
                ? (20 * Math.log10(ms.dryHoldPeakLevel)).toFixed(1) : "-inf";
            text = `In (Input Signal 原始訊號) : ${val} dB`;
        } else if (activeZone === 'out') {
            const val = ms.holdPeakLevel > 0.01
                ? (20 * Math.log10(ms.holdPeakLevel)).toFixed(1) : "-inf";
            text = `Out (Output Signal 輸出訊號) : ${val} dB`;
        } else {
            const cf = (ms.crestFactor || 0).toFixed(1);
            const cfDesc = (ms.crestFactor || 0) > 8 ? "大動態" : "小動態";
            text = `CF (Crest Factor 代表動態範圍的峰均比) : ${cf} (${cfDesc})`;
        }

        const GAP = 2;
        // Position at cursor, use transform so browser measures actual width
        const flipX = tooltipPos.x < 200; // near left edge → show right of cursor
        const flipY = tooltipPos.y < 50;  // near top edge → show below cursor

        tooltipNode = (
            <div style={{
                position: 'fixed',
                left: tooltipPos.x + (flipX ? GAP : -GAP),
                top: tooltipPos.y + (flipY ? GAP : -GAP),
                transform: `translate(${flipX ? '0%' : '-100%'}, ${flipY ? '0%' : '-100%'})`,
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                font: 'bold 11px sans-serif',
                padding: '6px 10px',
                borderRadius: 4,
                pointerEvents: 'none',
                zIndex: 9999,
                whiteSpace: 'pre',
            }}>
                {text}
            </div>
        );
    }

    return (
        <div className="flex-none h-full relative w-[14.7%] min-[740px]:w-[104px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <canvas ref={outputCanvasRef} className="w-full h-full" />
            {/* Hidden canvases (kept for ref compatibility) */}
            <canvas ref={grCanvasRef} className="hidden" />
            <canvas ref={cfMeterCanvasRef} className="hidden" />
            {tooltipNode}
        </div>
    );
};

export default Meters;