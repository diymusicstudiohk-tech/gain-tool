import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import RotaryKnob from '../ui/RotaryKnob';
import PlaybackControls from './PlaybackControls';
import { TOOLTIPS } from '../../utils/constants';
import { dryGainControlToDb, dryGainDbToControl, wetGainControlToDb, wetGainDbToControl, lookaheadControlToMs, lookaheadMsToControl } from '../../hooks/useCompressorParams';

const ControlHud = ({ compressor, playback, output, ui, tooltipsOff }) => {
    // Destructure grouped props
    const {
        threshold, inflate, lookahead, lookaheadControl,
        handleThresholdChange, handleCompKnobChange, handleCompDragState, hasThresholdBeenAdjusted,
    } = compressor;
    const { lastPlayedType, isDryMode, handleModeChange } = playback;
    const { wetGainControl, dryGainControl, handleGainChange } = output;
    const { isDraggingKnobRef, handleNormalDragState, handleKnobEnter, handleKnobLeave, resetAllParams } = ui;

    const [expandedModule, setExpandedModule] = useState('comp');
    const cycleModule = (current) => {
        const order = ['comp', 'output'];
        return order[(order.indexOf(current) + 1) % order.length];
    };

    // Touch legend tooltip state
    const [legendTooltip, setLegendTooltip] = useState(null);
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
            <div className="z-30 transition-all select-none flex h-[200px] min-[740px]:h-[140px] flex-none" onMouseDown={e => e.stopPropagation()}>

                {/* Main Controls Area */}
                <div className="flex-1 flex items-end justify-center gap-2 px-4 md:px-8 pb-4 pt-4">
                    {/* PLAYBACK CONTROLS */}
                    <PlaybackControls playback={playback} onTouchLegend={handlePlaybackTouchLegend} />

                    {/* MODULES WRAPPER */}
                    <div className="flex items-stretch gap-2 flex-none relative self-stretch overflow-x-auto hide-scrollbar">

                        {/* COMPRESSOR MODULE */}
                        <div className="flex items-start min-[740px]:items-center gap-1 min-[740px]:gap-2 rounded-xl px-1 min-[740px]:px-2 border border-gold/30 flex-none transition-colors" onMouseEnter={() => { if (lastPlayedType === 'original') handleModeChange('processed'); }}>
                            <div className="flex flex-col items-center gap-1 min-[740px]:gap-1.5 self-stretch pt-[10px] pb-[10px] min-[740px]:pt-[14px] min-[740px]:pb-[14px] select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'comp' ? cycleModule('comp') : 'comp')}>
                                {expandedModule === 'comp'
                                    ? <ChevronLeft size={12} className="w-[10px] h-[10px] min-[740px]:w-3 min-[740px]:h-3 text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="w-[10px] h-[10px] min-[740px]:w-3 min-[740px]:h-3 text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                                <span className="text-[10px] min-[740px]:text-xs font-bold tracking-widest transition-colors text-slate-400 group-hover/label:text-slate-200" style={{ writingMode: 'vertical-lr' }}>LIMITER</span>
                            </div>
                            <div className={`grid grid-cols-3 min-[740px]:flex pt-[18px] min-[740px]:pt-[25px] overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'comp' ? 'max-w-[800px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="INFLATE" value={inflate} min={0} max={100} step={1} unit="%" color="gold" defaultValue={0} onChange={(v) => handleCompKnobChange('inflate', v)} onDragStateChange={handleCompDragState} tooltipKey="inflate" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} tooltipsOff={tooltipsOff} breakReadingOnMobile />
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="THRESHOLD" shortLabel={"THRE-\nSHOLD"} value={threshold} min={-60} max={0} step={1} unit="dB" color="gold" defaultValue={0} onChange={handleThresholdChange} onDragStateChange={handleCompDragState} tooltipKey="threshold" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} tooltipsOff={tooltipsOff} breakReadingOnMobile />
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="LOOKAHEAD" shortLabel={"LOOK-\nAHEAD"} value={lookaheadControl} min={0} max={100} step={1} displayValue={lookaheadControlToMs(lookaheadControl).toFixed(1)} unit="ms" color="gold" defaultValue={0} onChange={(v) => handleCompKnobChange('lookahead', v)} onDragStateChange={handleCompDragState} tooltipKey="lookahead" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} tooltipsOff={tooltipsOff} breakReadingOnMobile parseEditValue={(v) => lookaheadMsToControl(parseFloat(v))} />
                            </div>
                        </div>

                        {/* OUTPUT MODULE */}
                        <div className="flex items-start min-[740px]:items-center gap-1 min-[740px]:gap-2 rounded-xl px-1 min-[740px]:px-2 border border-gold/30 flex-none transition-colors">
                            <div className="flex flex-col items-center gap-1 min-[740px]:gap-1.5 self-stretch pt-[10px] pb-[10px] min-[740px]:pt-[14px] min-[740px]:pb-[14px] select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'output' ? cycleModule('output') : 'output')}>
                                {expandedModule === 'output'
                                    ? <ChevronLeft size={12} className="w-[10px] h-[10px] min-[740px]:w-3 min-[740px]:h-3 text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="w-[10px] h-[10px] min-[740px]:w-3 min-[740px]:h-3 text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                                <span className={`text-[10px] min-[740px]:text-xs font-bold tracking-widest transition-colors ${isDryMode ? 'text-slate-700' : 'text-slate-400 group-hover/label:text-slate-200'}`} style={{ writingMode: 'vertical-lr' }}>OUTPUT</span>
                            </div>
                            <div className={`grid grid-cols-1 min-[740px]:flex pt-[18px] min-[740px]:pt-[25px] overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'output' ? 'max-w-[400px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="WET" value={wetGainControl} min={0} max={100} step={0.5} defaultValue={50} displayValue={wetGainControl <= 0 ? '-∞' : wetGainControlToDb(wetGainControl).toFixed(1)} unit="dB" color="gold" onChange={(v) => handleGainChange('makeupGain', v)} onDragStateChange={handleNormalDragState} tooltipKey="makeup" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} parseEditValue={(v) => wetGainDbToControl(v)} />
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="DRY" value={dryGainControl} min={0} max={100} step={0.5} defaultValue={0} displayValue={dryGainControl <= 0 ? '-∞' : dryGainControlToDb(dryGainControl).toFixed(1)} unit="dB" color="gold" onChange={(v) => handleGainChange('dryGainControl', v)} onDragStateChange={handleNormalDragState} tooltipKey="dryGain" onHover={handleKnobEnter} onLeave={handleKnobLeave} onTouchLegendShow={handleTouchKnobLegend} onTouchLegendHide={hideLegendTooltip} parseEditValue={(v) => dryGainDbToControl(v)} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ControlHud;
