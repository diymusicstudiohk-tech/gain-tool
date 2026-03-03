import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GOLD, GOLD_DARK, GOLD_LIGHT, CLIP_RED } from '../../utils/colors';
import {
    METER_HOLD_FRAMES, METER_PEAK_DECAY, METER_HOLD_DECAY,
    METER_BAR_WIDTH, METER_BAR_RADIUS, METER_OVERFLOW_CLAMP,
} from '../../utils/canvasConstants';

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
        ? (isClipping ? 'rgba(224, 94, 66, 0.25)' : 'rgba(194, 164, 117, 0.25)')
        : 'rgba(255, 255, 255, 0.06)';
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

    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.max(7, Math.round(10 * s)) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("Out", centerX, 12 * s);
};


// --- Input Meter Drawing Function (single bar, exported for loop) ---

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
        ? (isInClipping ? 'rgba(224, 94, 66, 0.25)' : 'rgba(194, 164, 117, 0.25)')
        : 'rgba(255, 255, 255, 0.06)';
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
                g.addColorStop(0, '#8B2500'); g.addColorStop(0.5, CLIP_RED); g.addColorStop(1, '#8B2500');
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
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.max(7, Math.round(10 * s)) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("In", centerX, 12 * s);
};

// --- Gain Button: Non-linear dB ↔ position mapping ---
function dbToPosition(db) {
    if (db >= 0) {
        if (db <= 5) return 0.5 - (db / 5) * 0.25;
        return 0.25 - ((db - 5) / 15) * 0.25;
    } else {
        const adb = -db;
        if (adb <= 5) return 0.5 + (adb / 5) * 0.25;
        return 0.75 + ((adb - 5) / 15) * 0.25;
    }
}

function positionToDb(pos) {
    if (pos <= 0.25) {
        return 20 - ((pos / 0.25) * 15);
    } else if (pos <= 0.5) {
        return 5 - ((pos - 0.25) / 0.25) * 5;
    } else if (pos <= 0.75) {
        return -((pos - 0.5) / 0.25) * 5;
    } else {
        return -5 - ((pos - 0.75) / 0.25) * 15;
    }
}

const InputGainButton = ({ inputGain, onInputGainChange, containerHeight }) => {
    const dragging = useRef(false);
    const startY = useRef(0);
    const startPos = useRef(0);

    const pos = dbToPosition(inputGain);
    const topPx = pos * containerHeight;
    const btnHeight = 28;

    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        dragging.current = true;
        startY.current = e.clientY;
        startPos.current = dbToPosition(inputGain);
    }, [inputGain]);

    const handlePointerMove = useCallback((e) => {
        if (!dragging.current || containerHeight <= 0) return;
        const deltaY = e.clientY - startY.current;
        const deltaPos = deltaY / containerHeight;
        const newPos = Math.max(0, Math.min(1, startPos.current + deltaPos));
        const newDb = positionToDb(newPos);
        const rounded = Math.round(newDb * 10) / 10;
        onInputGainChange(Math.max(-20, Math.min(20, rounded)));
    }, [containerHeight, onInputGainChange]);

    const handlePointerUp = useCallback((e) => {
        dragging.current = false;
        try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    }, []);

    const handleDoubleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        onInputGainChange(0);
    }, [onInputGainChange]);

    const isZero = Math.abs(inputGain) < 0.05;
    const label = isZero ? null : (inputGain > 0 ? `+${inputGain.toFixed(1)}` : inputGain.toFixed(1));

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: topPx - btnHeight / 2,
                height: btnHeight,
                display: 'flex',
                flexDirection: isZero ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.75)',
                border: '1.5px solid rgba(255,255,255,0.8)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 9,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'ns-resize',
                touchAction: 'none',
                userSelect: 'none',
                zIndex: 10,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                padding: 0,
                width: 34,
            }}
        >
            {isZero ? <><span>&#9650;</span><span>&#9660;</span></> : label}
        </div>
    );
};

// --- InputMeter Component ---

const InputMeter = ({ inputCanvasRef, hoveredMeterRef, meterStateRef, inputGain, onInputGainChange }) => {
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false });
    const tooltipTextRef = useRef(null);
    const tooltipDivRef = useRef(null);
    const rafRef = useRef(null);
    const containerDivRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const el = containerDivRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!tooltipPos.visible) return;
        let running = true;
        const loop = () => {
            if (!running) return;
            if (tooltipTextRef.current && meterStateRef?.current) {
                const ms = meterStateRef.current;
                const val = ms.dryHoldPeakLevel > 0.01
                    ? (20 * Math.log10(ms.dryHoldPeakLevel)).toFixed(1) : "-inf";
                tooltipTextRef.current.textContent = `In (Input Signal 原始訊號) : ${val} dB`;
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(rafRef.current); };
    }, [tooltipPos.visible, meterStateRef]);

    useEffect(() => {
        if (!tooltipDivRef.current) return;
        const GAP = 4;
        const flipX = tooltipPos.x < 200;
        const flipY = tooltipPos.y < 50;
        const s = tooltipDivRef.current.style;
        s.left = `${tooltipPos.x + (flipX ? GAP : -GAP)}px`;
        s.top = `${tooltipPos.y + (flipY ? GAP : -GAP)}px`;
        s.transform = `translate(${flipX ? '0%' : '-100%'}, ${flipY ? '0%' : '-100%'})`;
    }, [tooltipPos.x, tooltipPos.y]);

    const frozenRedraw = useCallback(() => {
        if (!inputCanvasRef?.current || !meterStateRef?.current) return;
        const ms = meterStateRef.current;
        drawInputMeter(inputCanvasRef.current, 0, 0, ms, hoveredMeterRef?.current, true);
    }, [inputCanvasRef, meterStateRef, hoveredMeterRef]);

    const handleMouseMove = useCallback((e) => {
        if (!hoveredMeterRef) return;
        if (hoveredMeterRef.current !== 'in') {
            hoveredMeterRef.current = 'in';
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

    return (
        <div ref={containerDivRef} className="flex-none h-full relative w-[4%] max-w-[22px]"
            style={{ overflow: 'visible' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <canvas ref={inputCanvasRef} className="w-full h-full" />
            {onInputGainChange && containerHeight > 0 && (
                <InputGainButton
                    inputGain={inputGain ?? 0}
                    onInputGainChange={onInputGainChange}
                    containerHeight={containerHeight}
                />
            )}
            {tooltipPos.visible && (
                <div ref={tooltipDivRef} style={{
                    position: 'fixed',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    font: 'bold 11px sans-serif',
                    padding: '6px 10px',
                    borderRadius: 4,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    whiteSpace: 'pre',
                }}>
                    <span ref={tooltipTextRef} />
                </div>
            )}
        </div>
    );
};

const InputMeterMemo = React.memo(InputMeter);
export { InputMeterMemo as InputMeter };

// --- Output Gain Button ---
const OUT_BAR_CENTER_PCT = 50; // Now single column, centered

const OutputGainButton = ({ outputGain, onOutputGainChange, containerHeight }) => {
    const dragging = useRef(false);
    const startY = useRef(0);
    const startPos = useRef(0);

    const pos = dbToPosition(outputGain);
    const topPx = pos * containerHeight;
    const btnHeight = 28;

    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        dragging.current = true;
        startY.current = e.clientY;
        startPos.current = dbToPosition(outputGain);
    }, [outputGain]);

    const handlePointerMove = useCallback((e) => {
        if (!dragging.current || containerHeight <= 0) return;
        const deltaY = e.clientY - startY.current;
        const deltaPos = deltaY / containerHeight;
        const newPos = Math.max(0, Math.min(1, startPos.current + deltaPos));
        const newDb = positionToDb(newPos);
        const rounded = Math.round(newDb * 10) / 10;
        onOutputGainChange(Math.max(-20, Math.min(20, rounded)));
    }, [containerHeight, onOutputGainChange]);

    const handlePointerUp = useCallback((e) => {
        dragging.current = false;
        try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    }, []);

    const handleDoubleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        onOutputGainChange(0);
    }, [onOutputGainChange]);

    const isZero = Math.abs(outputGain) < 0.05;
    const label = isZero ? null : (outputGain > 0 ? `+${outputGain.toFixed(1)}` : outputGain.toFixed(1));

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            style={{
                position: 'absolute',
                left: `${OUT_BAR_CENTER_PCT}%`,
                transform: 'translateX(-50%)',
                top: topPx - btnHeight / 2,
                height: btnHeight,
                display: 'flex',
                flexDirection: isZero ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.75)',
                border: '1.5px solid rgba(255,255,255,0.8)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 9,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'ns-resize',
                touchAction: 'none',
                userSelect: 'none',
                zIndex: 10,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                padding: 0,
                width: 34,
            }}
        >
            {isZero ? <><span>&#9650;</span><span>&#9660;</span></> : label}
        </div>
    );
};

// --- Component ---

const getMetersTooltipText = (activeZone, ms) => {
    if (activeZone === 'out') {
        const val = ms.holdPeakLevel > 0.01
            ? (20 * Math.log10(ms.holdPeakLevel)).toFixed(1) : "-inf";
        return `Out (Output Signal 輸出訊號) : ${val} dB`;
    }
    return '';
};

const Meters = ({ outputCanvasRef, height, hoveredMeterRef, meterStateRef, outputGain, onOutputGainChange }) => {
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false });
    const tooltipTextRef = useRef(null);
    const tooltipDivRef = useRef(null);
    const rafRef = useRef(null);
    const containerDivRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const el = containerDivRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!tooltipPos.visible) return;
        let running = true;
        const loop = () => {
            if (!running) return;
            if (tooltipTextRef.current && hoveredMeterRef?.current && meterStateRef?.current) {
                tooltipTextRef.current.textContent = getMetersTooltipText(hoveredMeterRef.current, meterStateRef.current);
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(rafRef.current); };
    }, [tooltipPos.visible, hoveredMeterRef, meterStateRef]);

    useEffect(() => {
        if (!tooltipDivRef.current) return;
        const GAP = 4;
        const flipX = tooltipPos.x < 200;
        const flipY = tooltipPos.y < 50;
        const s = tooltipDivRef.current.style;
        s.left = `${tooltipPos.x + (flipX ? GAP : -GAP)}px`;
        s.top = `${tooltipPos.y + (flipY ? GAP : -GAP)}px`;
        s.transform = `translate(${flipX ? '0%' : '-100%'}, ${flipY ? '0%' : '-100%'})`;
    }, [tooltipPos.x, tooltipPos.y]);

    const frozenRedraw = useCallback(() => {
        if (!outputCanvasRef?.current || !meterStateRef?.current) return;
        const ms = meterStateRef.current;
        drawDualMeter(outputCanvasRef.current, 0, 0, ms, hoveredMeterRef?.current, true);
    }, [outputCanvasRef, meterStateRef, hoveredMeterRef]);

    const handleMouseMove = useCallback((e) => {
        if (!hoveredMeterRef) return;
        if (hoveredMeterRef.current !== 'out') {
            hoveredMeterRef.current = 'out';
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

    return (
        <div ref={containerDivRef} className="flex-none h-full relative w-[4%] max-w-[22px]"
            style={{ overflow: 'visible' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <canvas ref={outputCanvasRef} className="w-full h-full" />
            {onOutputGainChange && containerHeight > 0 && (
                <OutputGainButton
                    outputGain={outputGain ?? 0}
                    onOutputGainChange={onOutputGainChange}
                    containerHeight={containerHeight}
                />
            )}
            {tooltipPos.visible && (
                <div ref={tooltipDivRef} style={{
                    position: 'fixed',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    font: 'bold 11px sans-serif',
                    padding: '6px 10px',
                    borderRadius: 4,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    whiteSpace: 'pre',
                }}>
                    <span ref={tooltipTextRef} />
                </div>
            )}
        </div>
    );
};

export default React.memo(Meters);
