import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Info, Palette, GripHorizontal } from 'lucide-react';

// --- Info Panel ---
export const DraggableInfoPanel = ({ title, content, onClose }) => {
    const [position, setPosition] = useState({ right: 16, bottom: 230 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ right: 0, bottom: 0 });

    const handleMouseDown = (e) => {
        e.stopPropagation();
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { ...position };
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    };

    const handleGlobalMove = useCallback((e) => {
        const deltaX = dragStartRef.current.x - e.clientX;
        const deltaY = dragStartRef.current.y - e.clientY;
        let newRight = startPosRef.current.right + deltaX;
        let newBottom = startPosRef.current.bottom + deltaY;
        if (newBottom < 0) newBottom = 0;
        if (newRight < 0) newRight = 0;
        setPosition({ right: newRight, bottom: newBottom });
    }, []);

    const handleGlobalUp = useCallback(() => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    }, [handleGlobalMove]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        }
    }, [handleGlobalMove, handleGlobalUp]);

    return (
        <div className="absolute z-50 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-2xl cursor-move select-none flex flex-col w-80 animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ right: position.right, bottom: position.bottom }} onMouseDown={handleMouseDown}>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3 text-xl"><Info size={22} /> {title}</div>
            <div className="text-base text-slate-200 leading-relaxed font-medium">{content}</div>
        </div>
    );
};

// --- Legend ---
export const DraggableLegend = () => {
    const [position, setPosition] = useState({ left: 20, top: 20 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ left: 0, top: 0 });

    const handleMouseDown = (e) => {
        e.stopPropagation();
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { ...position };
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    };

    const handleGlobalMove = useCallback((e) => {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        let newLeft = startPosRef.current.left + deltaX;
        let newTop = startPosRef.current.top + deltaY;
        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;
        setPosition({ left: newLeft, top: newTop });
    }, []);

    const handleGlobalUp = useCallback(() => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    }, [handleGlobalMove]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        }
    }, [handleGlobalMove, handleGlobalUp]);

    return (
        <div className="absolute z-40 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 rounded-lg shadow-xl cursor-move select-none flex flex-col gap-2 w-48" style={{ left: position.left, top: position.top }} onMouseDown={handleMouseDown}>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-700 pb-1 mb-1"><Palette size={14} /> 顏色說明 <GripHorizontal size={14} className="ml-auto opacity-50" /></div>
            <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-white border border-slate-600 block rounded-sm"></span><span className="text-slate-300 font-medium">白色 : 最終輸出音量</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 block rounded-sm"></span><span className="text-red-400 font-medium">紅色 : 壓縮削減</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-sky-400 block rounded-sm"></span><span className="text-sky-400 font-medium">藍色 : Makeup Gain 增益</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-400 block rounded-sm"></span><span className="text-yellow-400 font-medium">黃色 : 乾訊號/混合疊加</span></div>
            </div>
        </div>
    );
};