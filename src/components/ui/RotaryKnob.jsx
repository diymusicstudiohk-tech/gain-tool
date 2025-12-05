import React, { useState, useRef, useEffect, useCallback } from 'react';

const RotaryKnob = ({
    label,
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
    dragLockRef,
    disabled
}) => {
    const isDraggingRef = useRef(false);
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(displayValue || value);

    // 使用 Refs 儲存變數，以便在事件監聽器中訪問最新值
    const startY = useRef(0);
    const startVal = useRef(0);
    const paramsRef = useRef({ value, min, max, step });
    const callbacksRef = useRef({ onChange, onDragStateChange });

    // 每次 Render 更新 Params Ref 和 Callbacks Ref
    useEffect(() => {
        paramsRef.current = { value, min, max, step };
        callbacksRef.current = { onChange, onDragStateChange };
    });

    const colors = {
        cyan: "#22d3ee", indigo: "#818cf8", yellow: "#facc15", slate: "#94a3b8",
        red: "#f87171", orange: "#fb923c", blue: "#3b82f6", pink: "#ec4899",
        emerald: "#10b981", rose: "#f43f5e", purple: "#d8b4fe"
    };
    const strokeColor = disabled ? '#475569' : (colors[color] || colors.slate);
    const labelColorClass = disabled ? 'text-slate-600' : 'text-slate-500 hover:text-slate-300';
    const valueColorStyle = disabled ? { color: '#475569' } : { color: colors[color] || colors.slate };

    const handleGlobalMouseMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        const { min: pMin, max: pMax, step: pStep } = paramsRef.current;
        const { onChange: pOnChange } = callbacksRef.current;

        const delta = startY.current - e.clientY;
        const range = pMax - pMin;
        let nVal = startVal.current + (delta / 200) * range;
        if (nVal < pMin) nVal = pMin; if (nVal > pMax) nVal = pMax;
        nVal = Math.round(nVal / pStep) * pStep;

        if (Math.abs(nVal - paramsRef.current.value) > 0.0001) {
            if (pOnChange) pOnChange(nVal);
        }
    }, []);

    const handleGlobalMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        if (dragLockRef) dragLockRef.current = false;

        if (callbacksRef.current.onDragStateChange) callbacksRef.current.onDragStateChange(false);

        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [dragLockRef, handleGlobalMouseMove]);

    const handleStart = (clientY) => {
        if (disabled) return;
        isDraggingRef.current = true;

        if (callbacksRef.current.onDragStateChange) callbacksRef.current.onDragStateChange(true);
        if (dragLockRef) dragLockRef.current = true;

        startY.current = clientY;
        startVal.current = value;
        document.body.style.cursor = 'ns-resize';

        window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);

    const handleDoubleClick = () => { if (disabled) return; setIsEditing(true); setInputValue(displayValue || value); };
    const handleInputBlur = () => { let val = parseFloat(inputValue); if (!isNaN(val)) { if (val < min) val = min; if (val > max) val = max; onChange(val); } setIsEditing(false); };

    const pct = (value - min) / (max - min); const radius = 14; const circumference = 2 * Math.PI * radius; const arcLength = circumference * 0.75; const dashOffset = arcLength * (1 - pct); const rotation = -135 + (pct * 270);
    const displayStr = displayValue !== undefined ? displayValue : value.toFixed(Number.isInteger(step) ? 0 : 1);

    return (
        <div className={`flex flex-col items-center gap-1 group relative w-16 select-none ${disabled ? 'opacity-60 pointer-events-none' : ''}`} onMouseEnter={(e) => onHover && onHover(tooltipKey, e)} onMouseLeave={() => onLeave && onLeave()}>
            <div className={`relative w-9 h-9 ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'}`} onMouseDown={(e) => { e.stopPropagation(); handleStart(e.clientY); }}>
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r={radius} fill="none" stroke="#334155" strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                    <circle cx="18" cy="18" r={radius} fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ transform: `rotate(${rotation}deg)` }}><div className={`w-1 h-1 rounded-full mx-auto mt-1 shadow-sm ${disabled ? 'bg-slate-500' : 'bg-white'}`}></div></div>
            </div>
            <div className="text-center group/label relative" onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(); }}>
                <div className="flex flex-col items-center justify-end cursor-help pb-2">
                    <div className="flex items-center gap-0.5 mb-1"><div className={`text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap transition-colors ${labelColorClass}`}>{label}</div>{!disabled && <div className="w-1 h-1 rounded-full bg-slate-600 group-hover/label:bg-cyan-400 transition-colors"></div>}</div>
                    {subLabel && <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{subLabel}</div>}
                </div>
                {isEditing ? (<input autoFocus type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={handleInputBlur} onKeyDown={(e) => { if (e.key === 'Enter') handleInputBlur() }} onClick={(e) => e.stopPropagation()} className="w-12 text-center text-xs bg-slate-800 text-white border border-slate-600 rounded mt-1" />) : (<div className={`text-sm font-mono font-bold cursor-text -mt-1`} style={valueColorStyle}>{displayStr}{unit}</div>)}
            </div>
        </div>
    );
};

export default RotaryKnob;