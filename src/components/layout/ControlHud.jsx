import React, { useRef, useCallback } from 'react';
import RotaryKnob from '../ui/RotaryKnob';
import PlaybackControls from './PlaybackControls';
import { TOOLTIPS } from '../../utils/constants';
import { lookaheadControlToMs, lookaheadMsToControl } from '../../hooks/useCompressorParams';

const ControlHud = ({ compressor, playback, ui, tooltipsOff }) => {
    // Destructure grouped props
    const {
        threshold, inflate, lookahead, lookaheadControl,
        handleThresholdChange, handleCompKnobChange, handleCompDragState, hasThresholdBeenAdjusted,
    } = compressor;
    const { lastPlayedType, isDryMode, handleModeChange } = playback;
    const { isDraggingKnobRef, handleKnobEnter, handleKnobLeave, resetAllParams } = ui;

    // Touch legend tooltip state
    const [legendTooltip, setLegendTooltip] = React.useState(null);
    const legendTimerRef = useRef(null);

    const showLegendTooltip = useCallback((text, autoHide = false) => {
        if (legendTimerRef.current) clearTimeout(legendTimerRef.current);
        setLegendTooltip(text);
        if (autoHide) {
            legendTimerRef.current = setTimeout(() => { setLegendTooltip(null); legendTimerRef.current = null; }, 2000);
        }
    }, []);

    const hideLegendTooltip = useCallback(() => {
        if (legendTimerRef.current) { clearTimeout(legendTimerRef.current); legendTimerRef.current = null; }
        setLegendTooltip(null);
    }, []);

    const handleTouchKnobLegend = useCallback((key) => {
        if (!tooltipsOff && TOOLTIPS[key]) showLegendTooltip(TOOLTIPS[key].desc);
    }, [showLegendTooltip, tooltipsOff]);

    const handlePlaybackTouchLegend = useCallback((text) => {
        if (!tooltipsOff) showLegendTooltip(text, true);
    }, [showLegendTooltip, tooltipsOff]);

    return (
        <div className="relative flex-none">
            {/* TOUCH LEGEND TOOLTIP */}
            {legendTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none max-w-[90vw]">
                    <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 shadow-xl whitespace-pre-line">
                        <span className="text-[11px] font-medium text-slate-300">{legendTooltip}</span>
                    </div>
                </div>
            )}
            {/* MAIN HUD */}
            <div className="z-30 transition-all select-none flex h-[140px] flex-none" onMouseDown={e => e.stopPropagation()}>

                {/* Main Controls Area */}
                <div className="flex-1 flex items-end justify-center gap-2 px-4 md:px-8 pb-4 pt-4">
                    {/* PLAYBACK CONTROLS */}
                    <PlaybackControls playback={playback} onTouchLegend={handlePlaybackTouchLegend} />

                    {/* MODULES WRAPPER */}
                    <div className="flex items-stretch gap-2 flex-none relative self-stretch overflow-x-auto hide-scrollbar">

                        {/* COMPRESSOR MODULE */}
                        <div className="flex items-center gap-2 rounded-xl px-2 border border-gold/30 flex-none transition-colors" onMouseEnter={() => { if (lastPlayedType === 'original') handleModeChange('processed'); }}>
                            <div className="flex flex-col items-center justify-center gap-1.5 self-stretch pt-[14px] pb-[14px] select-none group/label">
                                <span className="text-xs font-bold tracking-widest transition-colors text-slate-400 group-hover/label:text-slate-200" style={{ writingMode: 'vertical-lr' }}>LIMITER</span>
                            </div>
                            <div className="flex pt-[25px]">
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="INFLATE" value={inflate} min={0} max={100} step={1} unit="%" color="gold" defaultValue={0} onChange={(v) => handleCompKnobChange('inflate', v)} onDragStateChange={handleCompDragState} tooltipKey="inflate" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} tooltipsOff={tooltipsOff} breakReadingOnMobile />
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="THRESHOLD" shortLabel={"THRE-\nSHOLD"} value={threshold} min={-60} max={0} step={1} unit="dB" color="gold" defaultValue={0} onChange={handleThresholdChange} onDragStateChange={handleCompDragState} tooltipKey="threshold" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} tooltipsOff={tooltipsOff} breakReadingOnMobile />
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="LOOKAHEAD" shortLabel={"LOOK-\nAHEAD"} value={lookaheadControl} min={0} max={100} step={1} displayValue={lookaheadControlToMs(lookaheadControl).toFixed(1)} unit="ms" color="gold" defaultValue={0} onChange={(v) => handleCompKnobChange('lookahead', v)} onDragStateChange={handleCompDragState} tooltipKey="lookahead" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} tooltipsOff={tooltipsOff} breakReadingOnMobile parseEditValue={(v) => lookaheadMsToControl(parseFloat(v))} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ControlHud;
