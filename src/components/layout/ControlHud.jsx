import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import RotaryKnob from '../ui/RotaryKnob';
import PowerButton from '../ui/PowerButton';
import PlaybackControls from './PlaybackControls';
import { dryGainControlToDb, dryGainDbToControl, wetGainControlToDb, wetGainDbToControl } from '../../hooks/useCompressorParams';

const ControlHud = ({ gate, compressor, playback, preset, output, ui, tooltipsOff }) => {
    // Destructure grouped props
    const {
        gateThreshold, gateAttack, gateRelease,
        handleGateThresholdChange, updateParam, handleGateDragState, hasGateBeenAdjusted,
        isGateBypass, setIsGateBypass,
    } = gate;
    const {
        threshold, ratio, ratioControl, attack, release, knee, lookahead,
        handleThresholdChange, updateRatio, handleCompKnobChange, handleCompDragState, hasThresholdBeenAdjusted,
        isCompBypass, setIsCompBypass,
    } = compressor;
    const { lastPlayedType, isDryMode, handleModeChange } = playback;
    const { wetGainControl, dryGainControl, handleGainChange } = output;
    const { isDraggingKnobRef, handleNormalDragState, handleKnobEnter, handleKnobLeave, resetAllParams } = ui;

    const [expandedModule, setExpandedModule] = useState('comp');
    const cycleModule = (current) => {
        const order = ['gate', 'comp', 'output'];
        return order[(order.indexOf(current) + 1) % order.length];
    };

    return (
        <>
            {/* MAIN HUD */}
            <div className="z-30 transition-all select-none flex h-[140px] flex-none" onMouseDown={e => e.stopPropagation()}>

                {/* Main Controls Area */}
                <div className="flex-1 flex items-end justify-center gap-2 px-4 md:px-8 pb-4 pt-4">
                    {/* PLAYBACK CONTROLS */}
                    <PlaybackControls playback={playback} preset={preset} />

                    {/* MODULES WRAPPER */}
                    <div className="flex items-stretch gap-2 flex-none relative self-stretch overflow-x-auto hide-scrollbar">

                        {/* GATE MODULE */}
                        <div className="flex items-center gap-2 rounded-xl px-2 border border-gold/30 flex-none transition-colors">
                            <div className="flex flex-col items-center gap-1.5 self-stretch pt-[14px] pb-[14px] select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'gate' ? cycleModule('gate') : 'gate')}>
                                {expandedModule === 'gate'
                                    ? <ChevronLeft size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                                <span className={`text-xs font-bold tracking-widest transition-colors ${isGateBypass ? 'text-slate-700' : 'text-slate-400 group-hover/label:text-slate-200'}`} style={{ writingMode: 'vertical-lr' }}>GATE</span>
                                <PowerButton isOn={!isGateBypass} onClick={(e) => { e.stopPropagation(); setIsGateBypass(!isGateBypass); }} className="mt-auto" />
                            </div>
                            <div className={`grid grid-cols-2 min-[740px]:flex min-[740px]:pt-[20px] overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'gate' ? 'max-w-[600px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode || isGateBypass} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={gateThreshold} min={-80} max={0} step={1} unit="dB" color="gold" defaultValue={-80} onChange={handleGateThresholdChange} onDragStateChange={handleGateDragState} tooltipKey="gateThreshold" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                                <RotaryKnob disabled={isDryMode || isGateBypass} dragLockRef={isDraggingKnobRef} label="ATTACK" value={gateAttack} min={0.1} max={50} step={0.1} unit="ms" color="gold" defaultValue={2} onChange={(v) => updateParam('gateAttack', v)} onDragStateChange={handleGateDragState} tooltipKey="gateAttack" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                                <RotaryKnob disabled={isDryMode || isGateBypass} dragLockRef={isDraggingKnobRef} label="RELEASE" value={gateRelease} min={10} max={500} step={1} unit="ms" color="gold" defaultValue={100} onChange={(v) => updateParam('gateRelease', v)} onDragStateChange={handleGateDragState} tooltipKey="gateRelease" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                            </div>
                        </div>

                        {/* COMPRESSOR MODULE */}
                        <div className="flex items-center gap-2 rounded-xl px-2 border border-gold/30 flex-none transition-colors" onMouseEnter={() => { if (lastPlayedType === 'original') handleModeChange('processed'); }}>
                            <div className="flex flex-col items-center gap-1.5 self-stretch pt-[14px] pb-[14px] select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'comp' ? cycleModule('comp') : 'comp')}>
                                {expandedModule === 'comp'
                                    ? <ChevronLeft size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                                <span className={`text-xs font-bold tracking-widest transition-colors ${isCompBypass ? 'text-slate-700' : 'text-slate-400 group-hover/label:text-slate-200'}`} style={{ writingMode: 'vertical-lr' }}>COMP</span>
                                <PowerButton isOn={!isCompBypass} onClick={(e) => { e.stopPropagation(); setIsCompBypass(!isCompBypass); }} className="mt-auto" />
                            </div>
                            <div className={`grid grid-cols-3 min-[740px]:flex min-[740px]:pt-[20px] overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'comp' ? 'max-w-[800px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={threshold} min={-60} max={0} step={1} unit="dB" color="gold" defaultValue={0} onChange={handleThresholdChange} onDragStateChange={handleCompDragState} tooltipKey="threshold" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="RATIO" value={ratioControl} displayValue={ratio.toFixed(1)} min={0} max={100} step={0.5} unit=":1" color="gold" defaultValue={37.5} onChange={updateRatio} onDragStateChange={handleCompDragState} tooltipKey="ratio" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="ATTACK" value={attack} min={0.1} max={100} step={0.1} unit="ms" color="gold" defaultValue={15} onChange={(v) => handleCompKnobChange('attack', v)} onDragStateChange={handleCompDragState} tooltipKey="attack" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="RELEASE" value={release} min={10} max={500} step={1} unit="ms" color="gold" defaultValue={150} onChange={(v) => handleCompKnobChange('release', v)} onDragStateChange={handleCompDragState} tooltipKey="release" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />

                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="KNEE" value={knee} min={0} max={30} step={1} unit="dB" color="gold" defaultValue={5} onChange={(v) => handleCompKnobChange('knee', v)} onDragStateChange={handleCompDragState} tooltipKey="knee" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="LOOKAHEAD" value={lookahead} min={0} max={100} step={1} unit="ms" color="gold" defaultValue={0} onChange={(v) => handleCompKnobChange('lookahead', v)} onDragStateChange={handleCompDragState} tooltipKey="lookahead" onHover={handleKnobEnter} onLeave={handleKnobLeave} tooltipsOff={tooltipsOff} />
                            </div>
                        </div>

                        {/* OUTPUT MODULE */}
                        <div className="flex items-center gap-2 rounded-xl px-2 border border-gold/30 flex-none transition-colors">
                            <div className="flex flex-col items-center gap-1.5 pt-[14px] pb-[14px] select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'output' ? cycleModule('output') : 'output')}>
                                {expandedModule === 'output'
                                    ? <ChevronLeft size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                                <span className={`text-xs font-bold tracking-widest transition-colors ${isDryMode ? 'text-slate-700' : 'text-slate-400 group-hover/label:text-slate-200'}`} style={{ writingMode: 'vertical-lr' }}>OUTPUT</span>
                            </div>
                            <div className={`grid grid-cols-1 min-[740px]:flex min-[740px]:pt-[20px] overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'output' ? 'max-w-[400px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="WET" value={wetGainControl} min={0} max={100} step={0.5} defaultValue={50} displayValue={wetGainControl <= 0 ? '-∞' : wetGainControlToDb(wetGainControl).toFixed(1)} unit="dB" color="gold" onChange={(v) => handleGainChange('makeupGain', v)} onDragStateChange={handleNormalDragState} tooltipKey="makeup" onHover={handleKnobEnter} onLeave={handleKnobLeave} parseEditValue={(v) => wetGainDbToControl(v)} />
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="DRY" value={dryGainControl} min={0} max={100} step={0.5} defaultValue={0} displayValue={dryGainControl <= 0 ? '-∞' : dryGainControlToDb(dryGainControl).toFixed(1)} unit="dB" color="gold" onChange={(v) => handleGainChange('dryGainControl', v)} onDragStateChange={handleNormalDragState} tooltipKey="dryGain" onHover={handleKnobEnter} onLeave={handleKnobLeave} parseEditValue={(v) => dryGainDbToControl(v)} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default ControlHud;
