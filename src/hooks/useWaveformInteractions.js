/**
 * useWaveformInteractions.js
 * 波形交互自定義 Hook
 * 負責處理波形上的滑鼠交互：拖曳閾值線、創建 Loop、Seek 等
 */

import { useState, useCallback, useRef } from 'react';

export const useWaveformInteractions = ({
    originalBuffer,
    waveformCanvasRef,
    containerRef,
    playheadRef,
    isDraggingKnobRef,
    isDraggingLineRef,
    isCreatingLoopRef,
    dragStartXRef,
    threshold,
    gateThreshold,
    zoomX,
    zoomY,
    panOffset,
    panOffsetY,
    loopStart,
    loopEnd,
    signalFlowMode,
    isCompBypass,
    isGateBypass,
    lastPlayedType,
    playingType,
    playingTypeRef,
    lastPlayedTypeRef,
    startTimeRef,
    startOffsetRef,
    setThreshold,
    setGateThreshold,
    setLoopStart,
    setLoopEnd,
    setHasThresholdBeenAdjusted,
    setHasGateBeenAdjusted,
    setIsCompAdjusting,
    setIsGateAdjusting,
    setIsCompBypass,
    setIsGateBypass,
    setIsCustomSettings,
    setIsProcessing,
    setZoomX,
    setPanOffset,
    handleModeChange,
    playBufferRef,
    canvasDims,
    audioContext
}) => {
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const [hoverLine, setHoverLine] = useState(null); // 'comp' | 'gate' | null

    /**
     * 處理波形上的滑鼠按下事件
     * - 如果點擊閾值線：開始拖曳
     * - 否則：開始創建 Loop
     */
    const handleWaveformMouseDown = useCallback((e) => {
        if (isDraggingKnobRef.current || !originalBuffer) return;

        if (hoverLine) {
            // Auto-enable modules on drag start
            if (hoverLine === 'comp' && isCompBypass) {
                setIsCompBypass(false);
                setIsCustomSettings(true);
                if (lastPlayedType !== 'processed') handleModeChange('processed');
            }
            if (hoverLine === 'gate' && isGateBypass) {
                setIsGateBypass(false);
                setIsCustomSettings(true);
                if (lastPlayedType !== 'processed') handleModeChange('processed');
            }

            isDraggingLineRef.current = hoverLine;
            document.body.style.cursor = 'row-resize';
        } else {
            isCreatingLoopRef.current = true;
            dragStartXRef.current = e.clientX;
        }

        window.addEventListener('mousemove', onWaveformGlobalMove);
        window.addEventListener('mouseup', onWaveformGlobalUp);
    }, [hoverLine, isDraggingKnobRef, originalBuffer, isCompBypass, isGateBypass, lastPlayedType, handleModeChange, setIsCompBypass, setIsGateBypass, setIsCustomSettings, isDraggingLineRef, isCreatingLoopRef, dragStartXRef]);

    /**
     * 處理全域滑鼠移動（拖曳閾值線或創建 Loop）
     */
    const onWaveformGlobalMove = useCallback((e) => {
        if (isDraggingLineRef.current) {
            if (!waveformCanvasRef.current) return;
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const height = rect.height;
            const PADDING = 24;
            const maxH = (height / 2) - PADDING;
            const ampScale = maxH * zoomY;
            const centerY = (height / 2) + panOffsetY;
            const distFromCenter = Math.abs(relY - centerY);
            const linearAmp = distFromCenter / ampScale;
            let newDb = linearAmp > 0.000001 ? 20 * Math.log10(linearAmp) : -100;
            if (newDb > 0) newDb = 0;

            if (isDraggingLineRef.current === 'comp') {
                if (newDb < -60) newDb = -60;
                setThreshold(Math.round(newDb));
                setHasThresholdBeenAdjusted(true);
                setIsCompAdjusting(true);
            } else if (isDraggingLineRef.current === 'gate') {
                if (newDb < -80) newDb = -80;
                setGateThreshold(Math.round(newDb));
                setHasGateBeenAdjusted(true);
                setIsGateAdjusting(true);
            }
            setIsCustomSettings(true);
            setIsProcessing(true);
            if (lastPlayedType === 'original') handleModeChange('processed');
            return;
        }
        if (isCreatingLoopRef.current && waveformCanvasRef.current && originalBuffer) {
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            if (Math.abs(e.clientX - dragStartXRef.current) > 5) {
                document.body.style.cursor = 'col-resize';
                const totalWidth = rect.width * zoomX;
                const pixelToTime = (px) => {
                    const relX = px - panOffset;
                    let pct = relX / totalWidth;
                    if (pct < 0) pct = 0;
                    if (pct > 1) pct = 1;
                    return pct * originalBuffer.duration;
                };
                const t1 = pixelToTime(dragStartXRef.current - rect.left);
                const t2 = pixelToTime(e.clientX - rect.left);
                setLoopStart(Math.min(t1, t2));
                setLoopEnd(Math.max(t1, t2));
            }
        }
    }, [isDraggingLineRef, isCreatingLoopRef, waveformCanvasRef, originalBuffer, zoomY, panOffsetY, zoomX, panOffset, lastPlayedType, dragStartXRef, setThreshold, setGateThreshold, setHasThresholdBeenAdjusted, setHasGateBeenAdjusted, setIsCompAdjusting, setIsGateAdjusting, setIsCustomSettings, setIsProcessing, setLoopStart, setLoopEnd, handleModeChange]);

    /**
     * 處理全域滑鼠放開
     * - 結束拖曳
     * - 或處理 Seek / Loop 創建完成
     */
    const onWaveformGlobalUp = useCallback((e) => {
        window.removeEventListener('mousemove', onWaveformGlobalMove);
        window.removeEventListener('mouseup', onWaveformGlobalUp);

        if (isDraggingLineRef.current) {
            isDraggingLineRef.current = null;
            setIsCompAdjusting(false);
            setIsGateAdjusting(false);
            document.body.style.cursor = 'default';
            return;
        }
        if (isCreatingLoopRef.current) {
            isCreatingLoopRef.current = false;
            document.body.style.cursor = 'default';
            const dragDist = Math.abs(e.clientX - dragStartXRef.current);
            if (dragDist < 5 && waveformCanvasRef.current && originalBuffer) {
                // Click to seek
                const rect = waveformCanvasRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const totalWidth = rect.width * zoomX;
                const relX = clickX - panOffset;
                let pct = relX / totalWidth;
                if (pct < 0) pct = 0;
                if (pct > 1) pct = 1;
                const seekTime = pct * originalBuffer.duration;
                startOffsetRef.current = seekTime;

                // Use Refs to get latest state inside event listener
                const currentPlayingType = playingTypeRef.current;
                const currentLastPlayedType = lastPlayedTypeRef.current;

                console.log(`[MouseUp] Seek: ${seekTime.toFixed(3)}s, Mode: ${currentPlayingType}, Last: ${currentLastPlayedType}`);

                if (currentPlayingType !== 'none') {
                    // Always use originalBuffer for Real-Time Engine
                    const targetBuffer = originalBuffer;
                    if (targetBuffer) playBufferRef.current(targetBuffer, currentPlayingType, seekTime);
                } else {
                    // Manual update for stopped state
                    if (playheadRef.current && waveformCanvasRef.current) {
                        const width = waveformCanvasRef.current.width;
                        const totalWidth = width * zoomX;
                        const pct = seekTime / originalBuffer.duration;
                        const screenPct = (((pct * totalWidth) + panOffset) / width) * 100;
                        playheadRef.current.style.left = `${screenPct}%`;
                        playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
                    }
                }
            } else if (waveformCanvasRef.current && originalBuffer) {
                // Drag finished - Auto Zoom Logic
                const rect = waveformCanvasRef.current.getBoundingClientRect();
                const totalWidth = rect.width * zoomX;
                const pixelToTime = (px) => {
                    const relX = px - panOffset;
                    let pct = relX / totalWidth;
                    if (pct < 0) pct = 0;
                    if (pct > 1) pct = 1;
                    return pct * originalBuffer.duration;
                };
                const t1 = pixelToTime(dragStartXRef.current - rect.left);
                const t2 = pixelToTime(e.clientX - rect.left);
                const loopDur = Math.abs(t2 - t1);

                if (loopDur > 0.01) {
                    const totalDur = originalBuffer.duration;
                    let newZoom = (totalDur * 0.8) / loopDur;
                    if (newZoom < 1) newZoom = 1;
                    if (newZoom > 50) newZoom = 50;

                    const width = rect.width;
                    const newTotalWidth = width * newZoom;
                    const loopMidTime = (t1 + t2) / 2;
                    const loopMidPx = (loopMidTime / totalDur) * newTotalWidth;

                    let newPan = (width / 2) - loopMidPx;
                    const minPan = width - newTotalWidth;
                    if (newPan > 0) newPan = 0;
                    if (newPan < minPan) newPan = minPan;

                    setZoomX(newZoom);
                    setPanOffset(newPan);

                    // Auto-jump to loop start
                    const loopStartTime = Math.min(t1, t2);
                    startOffsetRef.current = loopStartTime;

                    // Always use originalBuffer for Real-Time Engine
                    const targetBuffer = originalBuffer;

                    // Use Ref for latest lastPlayedType to ensure we don't revert to wrong mode
                    const typeToPlay = lastPlayedTypeRef.current;

                    if (targetBuffer) {
                        console.log(`[MouseUp] Loop Auto-Play: ${loopStartTime.toFixed(3)}s, Type: ${typeToPlay}`);
                        playBufferRef.current(targetBuffer, typeToPlay, loopStartTime);
                    } else {
                        // Just update visual if stopped
                        if (playheadRef.current && waveformCanvasRef.current) {
                            const pct = loopStartTime / originalBuffer.duration;
                            const screenPct = (((pct * newTotalWidth) + newPan) / width) * 100;
                            playheadRef.current.style.left = `${screenPct}%`;
                            playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
                        }
                    }
                }
            }
        }
    }, [onWaveformGlobalMove, isDraggingLineRef, isCreatingLoopRef, waveformCanvasRef, originalBuffer, zoomX, panOffset, dragStartXRef, playingTypeRef, lastPlayedTypeRef, playBufferRef, playheadRef, startOffsetRef, setIsCompAdjusting, setIsGateAdjusting, setZoomX, setPanOffset]);

    /**
     * 處理局部滑鼠移動（Hover 檢測）
     */
    const handleLocalMouseMove = useCallback((e) => {
        if (isDraggingLineRef.current || isCreatingLoopRef.current) return;
        if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;

        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const height = rect.height;
        const PADDING = 24;
        const maxH = (height / 2) - PADDING;
        const ampScale = maxH * zoomY;
        const centerY = (height / 2) + panOffsetY;

        setMousePos({ x: relX, y: relY });

        const HIT_TOLERANCE = 8;
        const compThreshPx = Math.pow(10, threshold / 20) * ampScale;
        const gateThreshPx = Math.pow(10, gateThreshold / 20) * ampScale;

        const distToCompTop = Math.abs(relY - (centerY - compThreshPx));
        const distToCompBot = Math.abs(relY - (centerY + compThreshPx));
        const distToGateTop = Math.abs(relY - (centerY - gateThreshPx));
        const distToGateBot = Math.abs(relY - (centerY + gateThreshPx));

        let newHoverLine = null;
        let cursor = 'crosshair';
        if (signalFlowMode !== 'clip') {
            if (distToGateTop < HIT_TOLERANCE || distToGateBot < HIT_TOLERANCE) {
                newHoverLine = 'gate';
                cursor = 'row-resize';
            }
            if (distToCompTop < HIT_TOLERANCE || distToCompBot < HIT_TOLERANCE) {
                newHoverLine = 'comp';
                cursor = 'row-resize';
            }
        }

        setHoverLine(newHoverLine);
        if (containerRef.current) containerRef.current.style.cursor = cursor;
    }, [isDraggingLineRef, isCreatingLoopRef, isDraggingKnobRef, waveformCanvasRef, containerRef, zoomY, panOffsetY, threshold, gateThreshold, signalFlowMode, setMousePos, setHoverLine]);

    return {
        mousePos,
        hoverLine,
        handleWaveformMouseDown,
        handleLocalMouseMove,
        onWaveformGlobalMove,
        onWaveformGlobalUp
    };
};
