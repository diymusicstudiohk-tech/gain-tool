import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Triangle, Power, Play, Pause, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import RotaryKnob from '../ui/RotaryKnob';
import PowerButton from '../ui/PowerButton';
import { PRESETS_DATA, AUDIO_SOURCES } from '../../utils/constants';
import { dryGainControlToDb, dryGainDbToControl, wetGainControlToDb, wetGainDbToControl } from '../../hooks/useCompressorParams';

const CATEGORY_ZH = {
    General: '通用', Bass: '貝斯', 'Acoustic Guitar': '木吉他', 'Electric Guitar': '電吉他',
    Kick: '大鼓', Snare: '小鼓', 'Other Drums': '其他鼓件', Keys: '鍵盤',
    'Female Vocal': '女聲', 'Male Vocal': '男聲', Other: '其他',
};

const ControlHud = ({
    // Gate Params
    gateThreshold, gateAttack, gateRelease,
    handleGateThresholdChange, updateParam, handleGateDragState, hasGateBeenAdjusted,
    isGateBypass, setIsGateBypass,

    // Comp Params
    threshold, ratio, ratioControl, attack, release, knee, lookahead,
    handleThresholdChange, updateRatio, handleCompKnobChange, handleCompDragState, hasThresholdBeenAdjusted,
    isCompBypass, setIsCompBypass,

    // Playback & Modes
    playingType, lastPlayedType, isDryMode, isDeltaMode,
    handleModeChange, toggleDeltaMode, togglePlayback,

    // Presets
    selectedPresetIdx, isCustomSettings, applyPreset, currentSourceId,

    // Gain Params
    wetGainControl, dryGainControl, handleGainChange,

    // UI Interaction
    isDraggingKnobRef, handleNormalDragState, handleKnobEnter, handleKnobLeave,
    resetAllParams,
}) => {
    const [expandedModule, setExpandedModule] = useState('comp');
    const cycleModule = (current) => {
        const order = ['gate', 'comp', 'output'];
        return order[(order.indexOf(current) + 1) % order.length];
    };

    // Preset dropdown state
    const [isPresetOpen, setIsPresetOpen] = useState(false);
    const presetDropdownRef = useRef(null);
    const presetListRef = useRef(null);
    const [presetCanScrollUp, setPresetCanScrollUp] = useState(false);
    const [presetCanScrollDown, setPresetCanScrollDown] = useState(false);

    const updatePresetScroll = useCallback(() => {
        if (presetListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = presetListRef.current;
            setPresetCanScrollUp(scrollTop > 5);
            setPresetCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
        }
    }, []);

    useEffect(() => {
        if (isPresetOpen) setTimeout(updatePresetScroll, 50);
    }, [isPresetOpen, updatePresetScroll]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isPresetOpen && presetDropdownRef.current && !presetDropdownRef.current.contains(event.target)) {
                setIsPresetOpen(false);
            }
        };
        if (isPresetOpen) window.addEventListener('mousedown', handleClickOutside, true);
        return () => window.removeEventListener('mousedown', handleClickOutside, true);
    }, [isPresetOpen]);

    return (
        <>
            {/* PRESET SELECTOR: Positioned above HUD */}
            {/* PRESET SELECTOR: REMOVED (Moved to Header) */}

            {/* MAIN HUD */}
            <div className="z-30 transition-all select-none flex h-[140px] flex-none" onMouseDown={e => e.stopPropagation()}>

                {/* Main Controls Area */}
                <div className="flex-1 flex items-end justify-center gap-2 px-4 md:px-8 pb-4 pt-4">
                    {/* PLAYBACK CONTROLS */}
                    <div className="flex gap-2 flex-none items-stretch pl-4 relative z-50 self-stretch">
                        {/* Play/Pause Button */}
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
                            className={`w-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 border border-[#C2A475]/30 shadow-inner shadow-xl ${
                                playingType !== 'none'
                                    ? 'breathe-free-mode'
                                    : 'bg-[#C2A475] hover:bg-[#d4b98a] shadow-[#C2A475]/30'
                            }`}
                        >
                            {playingType !== 'none'
                                ? <Pause size={20} fill="white" className="relative z-10 text-white" />
                                : <Play size={20} fill="white" className="relative z-10 text-white" />
                            }
                        </button>
                        {/* Bypass Button */}
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => handleModeChange(isDryMode ? 'processed' : 'original')}
                            title={isDryMode ? "關閉 Bypass" : "開啟 Bypass"}
                            className={`w-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 border shadow-inner shadow-xl ${
                                isDryMode
                                    ? 'breathe-brick-red border-[#B54C35]'
                                    : 'bg-[#202020] hover:bg-[#C1A475] border-[#C2A475]/30'
                            }`}
                        >
                            <Power size={18} className="relative z-10 text-white" strokeWidth={2.5} />
                        </button>
                        {/* Delta Button */}
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={toggleDeltaMode}
                            disabled={isDryMode}
                            title="Delta Monitoring"
                            className={`w-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 border shadow-inner shadow-xl ${
                                isDryMode
                                    ? 'bg-[#313131] border-gray-600 cursor-not-allowed opacity-50'
                                    : isDeltaMode
                                        ? 'breathe-blue border-[#2563eb]'
                                        : 'bg-[#202020] hover:bg-[#C1A475] border-[#C2A475]/30'
                            }`}
                        >
                            <Triangle size={14} fill={isDeltaMode ? "white" : "none"} className="relative z-10 text-white" />
                        </button>
                        {/* Comp Preset Button */}
                        <div className="relative" ref={presetDropdownRef}>
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => setIsPresetOpen(o => !o)}
                                title={PRESETS_DATA[selectedPresetIdx]?.name || '選擇預設'}
                                className={`w-8 h-full rounded-lg flex items-center justify-center transition-transform active:scale-95 border shadow-inner shadow-xl ${
                                    isPresetOpen
                                        ? 'bg-[#C2A475] border-[#C2A475]'
                                        : 'bg-[#202020] hover:bg-[#C1A475] border-[#C2A475]/30'
                                }`}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-10 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                            </button>
                            {isPresetOpen && (
                                <div
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-black/90 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-[9999] overflow-hidden glass-scrollbar"
                                    style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                                >
                                    <div ref={presetListRef} className="max-h-[400px] overflow-y-auto glass-scrollbar" onScroll={updatePresetScroll}>
                                        {Object.entries(PRESETS_DATA.reduce((acc, p, idx) => {
                                            if (!acc[p.category]) acc[p.category] = [];
                                            acc[p.category].push({ ...p, originalIdx: idx });
                                            return acc;
                                        }, {})).map(([category, presets]) => {
                                            const visiblePresets = presets.filter(p => {
                                                if (p.originalIdx === selectedPresetIdx) return true;
                                                if (p.category === 'General') return true;
                                                if (currentSourceId && currentSourceId !== 'upload') {
                                                    const activeSource = AUDIO_SOURCES.find(s => s.id === currentSourceId);
                                                    if (activeSource) {
                                                        if (!activeSource.category.startsWith(p.category)) {
                                                            if (p.category === 'Other' && activeSource.category.includes('Other Drums')) return false;
                                                            if (!activeSource.category.includes(p.category)) return false;
                                                        }
                                                    }
                                                }
                                                return true;
                                            });
                                            if (visiblePresets.length === 0) return null;
                                            return (
                                                <div key={category}>
                                                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#C2A475]">
                                                        {CATEGORY_ZH[category] || category}
                                                    </div>
                                                    {visiblePresets.map(p => {
                                                        const isActive = p.originalIdx === selectedPresetIdx;
                                                        return (
                                                            <button
                                                                key={p.originalIdx}
                                                                onClick={() => { applyPreset(p.originalIdx); setIsPresetOpen(false); }}
                                                                className={`w-full px-3 py-2 text-sm text-left rounded-md transition-colors duration-150 ${isActive ? 'bg-[#C2A475] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                                            >
                                                                {p.name}{isActive && isCustomSettings ? ' *' : ''}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {presetCanScrollUp && (
                                        <div className="absolute top-0 right-2 pointer-events-none">
                                            <div className="bg-gray-700/90 rounded-full p-0.5 mt-1"><ChevronUp size={12} className="text-[#C2A475]" /></div>
                                        </div>
                                    )}
                                    {presetCanScrollDown && (
                                        <div className="absolute bottom-0 right-2 pointer-events-none">
                                            <div className="bg-gray-700/90 rounded-full p-0.5 mb-1"><ChevronDown size={12} className="text-[#C2A475]" /></div>
                                        </div>
                                    )}
                                    <div className="px-3 py-2 border-t border-white/10 text-center text-xs font-semibold text-white tracking-wider">壓縮器預設集</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-px self-stretch my-2 bg-white/10 flex-none"></div>

                    {/* MODULES WRAPPER - Dimmed in Clip Mode */}
                    <div className="flex items-stretch gap-2 flex-none relative self-stretch overflow-x-auto hide-scrollbar">

                        {/* GATE MODULE */}
                        <div className="flex items-center gap-2 rounded-xl px-2 border border-[#C2A475]/30 flex-none transition-colors">
                            <div className="flex flex-col items-center gap-1.5 select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'gate' ? cycleModule('gate') : 'gate')}>
                                <PowerButton isOn={!isGateBypass} onClick={(e) => { e.stopPropagation(); setIsGateBypass(!isGateBypass); }} />
                                <span className={`text-xs font-bold tracking-widest transition-colors mt-1 ${isGateBypass ? 'text-slate-700' : 'text-slate-400 group-hover/label:text-slate-200'}`} style={{ writingMode: 'vertical-lr' }}>GATE</span>
                                {expandedModule === 'gate'
                                    ? <ChevronLeft size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                            </div>
                            <div className={`flex gap-6 overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'gate' ? 'max-w-[600px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode || isGateBypass} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={gateThreshold} min={-80} max={0} step={1} unit="dB" color="gold" onChange={handleGateThresholdChange} onDragStateChange={handleGateDragState} tooltipKey="gateThreshold" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                                <RotaryKnob disabled={isDryMode || isGateBypass} dragLockRef={isDraggingKnobRef} label="ATTACK" value={gateAttack} min={0.1} max={50} step={0.1} unit="ms" color="gold" onChange={(v) => updateParam('gateAttack', v)} onDragStateChange={handleGateDragState} tooltipKey="gateAttack" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                                <RotaryKnob disabled={isDryMode || isGateBypass} dragLockRef={isDraggingKnobRef} label="RELEASE" value={gateRelease} min={10} max={500} step={1} unit="ms" color="gold" onChange={(v) => updateParam('gateRelease', v)} onDragStateChange={handleGateDragState} tooltipKey="gateRelease" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                            </div>
                        </div>

                        {/* COMPRESSOR MODULE */}
                        <div className="flex items-center gap-2 rounded-xl px-2 border border-[#C2A475]/30 flex-none transition-colors" onMouseEnter={() => { if (lastPlayedType === 'original') handleModeChange('processed'); }}>
                            <div className="flex flex-col items-center gap-1.5 select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'comp' ? cycleModule('comp') : 'comp')}>
                                <PowerButton isOn={!isCompBypass} onClick={(e) => { e.stopPropagation(); setIsCompBypass(!isCompBypass); }} />
                                <span className={`text-xs font-bold tracking-widest transition-colors mt-1 ${isCompBypass ? 'text-slate-700' : 'text-slate-400 group-hover/label:text-slate-200'}`} style={{ writingMode: 'vertical-lr' }}>COMP</span>
                                {expandedModule === 'comp'
                                    ? <ChevronLeft size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                            </div>
                            <div className={`flex gap-4 overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'comp' ? 'max-w-[800px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={threshold} min={-60} max={0} step={1} unit="dB" color="gold" onChange={handleThresholdChange} onDragStateChange={handleCompDragState} tooltipKey="threshold" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="RATIO" value={ratioControl} displayValue={ratio.toFixed(1)} min={0} max={100} step={0.5} unit=":1" color="gold" onChange={updateRatio} onDragStateChange={handleCompDragState} tooltipKey="ratio" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="ATTACK" value={attack} min={0.1} max={100} step={0.1} unit="ms" color="gold" onChange={(v) => handleCompKnobChange('attack', v)} onDragStateChange={handleCompDragState} tooltipKey="attack" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="RELEASE" value={release} min={10} max={500} step={1} unit="ms" color="gold" onChange={(v) => handleCompKnobChange('release', v)} onDragStateChange={handleCompDragState} tooltipKey="release" onHover={handleKnobEnter} onLeave={handleKnobLeave} />

                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="KNEE" value={knee} min={0} max={30} step={1} unit="dB" color="gold" onChange={(v) => handleCompKnobChange('knee', v)} onDragStateChange={handleCompDragState} tooltipKey="knee" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                                <RotaryKnob disabled={isDryMode || isCompBypass} dragLockRef={isDraggingKnobRef} label="LOOKAHEAD" value={lookahead} min={0} max={100} step={1} unit="ms" color="gold" onChange={(v) => handleCompKnobChange('lookahead', v)} onDragStateChange={handleCompDragState} tooltipKey="lookahead" onHover={handleKnobEnter} onLeave={handleKnobLeave} />
                            </div>
                        </div>

                        {/* OUTPUT MODULE */}
                        <div className="flex items-center gap-2 rounded-xl px-2 border border-[#C2A475]/30 flex-none transition-colors">
                            <div className="flex flex-col items-center gap-1.5 select-none cursor-pointer group/label" onClick={() => setExpandedModule(expandedModule === 'output' ? cycleModule('output') : 'output')}>
                                <span className={`text-xs font-bold tracking-widest transition-colors mt-1 ${isDryMode ? 'text-slate-700' : 'text-slate-400 group-hover/label:text-slate-200'}`} style={{ writingMode: 'vertical-lr' }}>OUT</span>
                                {expandedModule === 'output'
                                    ? <ChevronLeft size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                    : <ChevronRight size={12} className="text-slate-500 group-hover/label:text-slate-200 transition-colors" />
                                }
                            </div>
                            <div className={`flex gap-4 overflow-hidden transition-all duration-300 ease-in-out ${expandedModule === 'output' ? 'max-w-[400px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="WET OUTPUT" value={wetGainControl} min={0} max={100} step={0.5} defaultValue={50} displayValue={wetGainControl <= 0 ? '-∞' : wetGainControlToDb(wetGainControl).toFixed(1)} unit="dB" color="gold" onChange={(v) => handleGainChange('makeupGain', v)} onDragStateChange={handleNormalDragState} tooltipKey="makeup" onHover={handleKnobEnter} onLeave={handleKnobLeave} parseEditValue={(v) => wetGainDbToControl(v)} />
                                <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="DRY OUTPUT" value={dryGainControl} min={0} max={100} step={0.5} defaultValue={0} displayValue={dryGainControl <= 0 ? '-∞' : dryGainControlToDb(dryGainControl).toFixed(1)} unit="dB" color="gold" onChange={(v) => handleGainChange('dryGainControl', v)} onDragStateChange={handleNormalDragState} tooltipKey="dryGain" onHover={handleKnobEnter} onLeave={handleKnobLeave} parseEditValue={(v) => dryGainDbToControl(v)} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default ControlHud;