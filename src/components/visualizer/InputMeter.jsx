import React, { useCallback, useEffect, useRef, useState } from 'react';
import { drawInputMeter } from '../../utils/meterDrawing';
import GainButton from './GainButton';
import { OVERLAY_BG } from '../../utils/colors';

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
                <GainButton
                    gainDb={inputGain ?? 0}
                    onGainChange={onInputGainChange}
                    containerHeight={containerHeight}
                />
            )}
            {tooltipPos.visible && (
                <div ref={tooltipDivRef} style={{
                    position: 'fixed',
                    background: OVERLAY_BG,
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

export default React.memo(InputMeter);
