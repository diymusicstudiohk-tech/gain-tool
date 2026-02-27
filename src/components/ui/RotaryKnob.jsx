import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TOOLTIPS } from '../../utils/constants';

const RotaryKnob = ({
    label,
    shortLabel,
    subLabel,
    value,
    displayValue,
    min,
    max,
    step,
    unit,
    color,
    onChange,
    onDragStateChange,
    tooltipKey,
    onHover,
    onLeave,
    onTouchLegendShow,
    onTouchLegendHide,
    dragLockRef,
    disabled,
    compact,
    parseEditValue,
    defaultValue,
    tooltipsOff
}) => {
    const isDraggingRef = useRef(false);
    const isTouchDragRef = useRef(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [inputValue, setInputValue] = useState(displayValue || value);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // 使用 Refs 儲存變數，以便在事件監聯器中訪問最新值
    const startY = useRef(0);
    const startVal = useRef(0);
    const paramsRef = useRef({ value, min, max, step });
    const callbacksRef = useRef({ onChange, onDragStateChange, onLeave, onTouchLegendShow, onTouchLegendHide });
    const lastMoveTimeRef = useRef(0);
    const lastClientYRef = useRef(0);
    const handleEndRef = useRef(null); // ref to avoid circular dep with handleGlobalMouseMove
    const lastMouseDownTimeRef = useRef(0);

    // 每次 Render 更新 Params Ref 和 Callbacks Ref
    useEffect(() => {
        paramsRef.current = { value, min, max, step };
        callbacksRef.current = { onChange, onDragStateChange, onLeave, onTouchLegendShow, onTouchLegendHide };
    });

    const colors = {
        cyan: "#22d3ee", indigo: "#818cf8", yellow: "#facc15", slate: "#94a3b8",
        red: "#f87171", orange: "#fb923c", blue: "#3b82f6", pink: "#ec4899",
        emerald: "#10b981", rose: "#f43f5e", purple: "#d8b4fe",
        gold: "#C2A475"
    };
    const strokeColor = disabled ? '#475569' : (colors[color] || colors.slate);
    const labelColorClass = disabled ? 'text-slate-600' : 'text-slate-500 hover:text-slate-300';
    const valueColorStyle = disabled ? { color: '#475569' } : { color: colors[color] || colors.slate };

    const applyMove = useCallback((clientY) => {
        const { min: pMin, max: pMax, step: pStep } = paramsRef.current;
        const { onChange: pOnChange } = callbacksRef.current;

        const delta = startY.current - clientY;
        const range = pMax - pMin;
        let nVal = startVal.current + (delta / 200) * range;
        if (nVal < pMin) nVal = pMin; if (nVal > pMax) nVal = pMax;
        nVal = Math.round(nVal / pStep) * pStep;

        if (Math.abs(nVal - paramsRef.current.value) > 0.0001) {
            if (pOnChange) pOnChange(nVal);
        }
    }, []);

    const handleMove = useCallback((clientY) => {
        if (!isDraggingRef.current) return;
        lastClientYRef.current = clientY;
        const now = performance.now();
        if (now - lastMoveTimeRef.current < 16) return;
        lastMoveTimeRef.current = now;
        applyMove(clientY);
    }, [applyMove]);

    const handleGlobalMouseMove = useCallback((e) => {
        e.preventDefault();
        // If button was released outside the browser window, treat as mouseup
        if (e.buttons === 0) { handleEndRef.current?.(); return; }
        handleMove(e.clientY);
    }, [handleMove]);

    const handleGlobalTouchMove = useCallback((e) => {
        e.preventDefault();
        if (e.touches[0]) handleMove(e.touches[0].clientY);
    }, [handleMove]);

    const handleEnd = useCallback(() => {
        // Flush final position before ending drag
        if (lastClientYRef.current !== 0) {
            applyMove(lastClientYRef.current);
        }
        lastMoveTimeRef.current = 0;
        isDraggingRef.current = false;
        if (isTouchDragRef.current) {
            if (callbacksRef.current.onTouchLegendHide) callbacksRef.current.onTouchLegendHide();
            isTouchDragRef.current = false;
        }
        setIsHovered(false);
        if (callbacksRef.current.onLeave) callbacksRef.current.onLeave();
        if (dragLockRef) dragLockRef.current = false;
        if (callbacksRef.current.onDragStateChange) callbacksRef.current.onDragStateChange(false);
        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleGlobalTouchMove);
        window.removeEventListener('touchend', handleEnd);
    }, [applyMove, dragLockRef, handleGlobalMouseMove, handleGlobalTouchMove]);
    handleEndRef.current = handleEnd;

    const handleStart = (clientY, isTouch = false) => {
        if (disabled) return;

        // Detect double-click via rapid mousedowns (within 300ms)
        if (!isTouch) {
            const now = performance.now();
            if (now - lastMouseDownTimeRef.current < 300) {
                lastMouseDownTimeRef.current = 0;
                handleDoubleClick();
                return;
            }
            lastMouseDownTimeRef.current = now;
        }

        isDraggingRef.current = true;
        setIsHovered(true);

        if (callbacksRef.current.onDragStateChange) callbacksRef.current.onDragStateChange(true);
        if (dragLockRef) dragLockRef.current = true;

        startY.current = clientY;
        startVal.current = value;
        document.body.style.cursor = 'ns-resize';

        if (isTouch) {
            isTouchDragRef.current = true;
            if (callbacksRef.current.onTouchLegendShow && tooltipKey) callbacksRef.current.onTouchLegendShow(tooltipKey);
            window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        } else {
            window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
            window.addEventListener('mouseup', handleEnd);
        }
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleGlobalTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [handleGlobalMouseMove, handleGlobalTouchMove, handleEnd]);

    const handleDoubleClick = () => { if (disabled) return; if (defaultValue !== undefined) { onChange(defaultValue); return; } setIsEditing(true); setInputValue(displayValue || value); };
    const handleInputBlur = () => { let val = parseFloat(inputValue); if (!isNaN(val)) { if (parseEditValue) val = parseEditValue(val); if (val < min) val = min; if (val > max) val = max; onChange(val); } setIsEditing(false); };

    const pct = (value - min) / (max - min); const radius = 14; const circumference = 2 * Math.PI * radius; const arcLength = circumference * 0.75; const dashOffset = arcLength * (1 - pct); const rotation = -135 + (pct * 270);
    const displayStr = displayValue !== undefined ? displayValue : value.toFixed(Number.isInteger(step) ? 0 : 1);

    if (compact) {
        return (
            <div className={`flex flex-col items-center relative select-none ${disabled ? 'opacity-60 pointer-events-none' : ''}`} onMouseEnter={(e) => { setIsHovered(true); onHover && onHover(tooltipKey, e); }} onMouseLeave={() => { if (!isDraggingRef.current) { setIsHovered(false); onLeave && onLeave(); } }}>
                <div className={`relative w-9 h-9 ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'}`} onMouseDown={(e) => { e.stopPropagation(); handleStart(e.clientY); }} onTouchStart={(e) => { e.stopPropagation(); if (e.touches[0]) handleStart(e.touches[0].clientY, true); }} onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(); }}>
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="18" cy="18" r={radius} fill="none" stroke="#334155" strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                        <circle cx="18" cy="18" r={radius} fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                    </svg>
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ transform: `rotate(${rotation}deg)` }}><div className={`w-1 h-1 rounded-full mx-auto mt-1 shadow-sm ${disabled ? 'bg-slate-500' : 'bg-white'}`}></div></div>
                </div>
                {isHovered && (
                    <div className="absolute top-full mt-1 z-50 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none whitespace-nowrap flex flex-col items-center">
                        <div className="text-[11px] font-mono font-bold" style={{ color: colors[color] || colors.slate }}>{displayStr}{unit}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                    </div>
                )}
                {isEditing && <input autoFocus type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={handleInputBlur} onKeyDown={(e) => { if (e.key === 'Enter') handleInputBlur() }} onClick={(e) => e.stopPropagation()} className="absolute top-full mt-1 w-12 text-center text-xs bg-slate-800 text-white border border-slate-600 rounded z-50" />}
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center gap-1 group relative w-12 min-[740px]:w-16 select-none ${disabled ? 'opacity-60 pointer-events-none' : ''}`} onMouseEnter={(e) => { setIsHovered(true); onHover && onHover(tooltipKey, e); }} onMouseLeave={() => { if (!isDraggingRef.current) { setIsHovered(false); onLeave && onLeave(); } }} onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
            <div className={`relative w-9 h-9 ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'}`} onMouseDown={(e) => { e.stopPropagation(); handleStart(e.clientY); }} onTouchStart={(e) => { e.stopPropagation(); if (e.touches[0]) handleStart(e.touches[0].clientY, true); }} onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(); }}>
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r={radius} fill="none" stroke="#334155" strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                    <circle cx="18" cy="18" r={radius} fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ transform: `rotate(${rotation}deg)` }}><div className={`w-1 h-1 rounded-full mx-auto mt-1 shadow-sm ${disabled ? 'bg-slate-500' : 'bg-white'}`}></div></div>
            </div>
            <div className="text-center group/label relative" onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(); }}>
                <div className="flex flex-col items-center justify-end pb-2">
                    <div className="flex items-center gap-0.5 mb-1">
                        {isHovered
                            ? <div className="text-[8px] min-[740px]:text-[10px] font-mono font-bold whitespace-nowrap transition-colors" style={{ color: colors[color] || colors.slate }}>{displayStr}{unit}</div>
                            : shortLabel
                                ? <><div className={`text-[8px] font-bold uppercase tracking-tighter whitespace-pre-line transition-colors min-[740px]:hidden ${labelColorClass}`}>{shortLabel}</div><div className={`text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap transition-colors hidden min-[740px]:block ${labelColorClass}`}>{label}</div></>
                                : <div className={`text-[8px] min-[740px]:text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap transition-colors ${labelColorClass}`}>{label}</div>
                        }
                    </div>
                    {subLabel && <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{subLabel}</div>}
                </div>
                {isEditing && <input autoFocus type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={handleInputBlur} onKeyDown={(e) => { if (e.key === 'Enter') handleInputBlur() }} onClick={(e) => e.stopPropagation()} className="w-12 text-center text-xs bg-slate-800 text-white border border-slate-600 rounded mt-1" />}
            </div>
            {isHovered && !isDraggingRef.current && !tooltipsOff && tooltipKey && TOOLTIPS[tooltipKey] && (
                <div
                    className="pointer-events-none"
                    style={{ position: 'fixed', left: mousePos.x + 16, top: mousePos.y - 12, transform: 'translateY(-100%)', zIndex: 9999 }}
                >
                    <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl text-[11px] font-medium text-slate-300 max-w-[320px] whitespace-pre-line">
                        {TOOLTIPS[tooltipKey].desc}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RotaryKnob;