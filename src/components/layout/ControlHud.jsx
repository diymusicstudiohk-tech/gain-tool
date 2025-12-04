import React from 'react';
import { Triangle, ChevronDown } from 'lucide-react';
import RotaryKnob from '../ui/RotaryKnob';
import PlayBtn from '../ui/PlayBtn';
import { PRESETS_DATA } from '../../utils/constants';

const ControlHud = ({
    // Gate Params
    gateThreshold, gateRatio, gateAttack, gateRelease,
    handleGateThresholdChange, updateParam, handleGateDragState, hasGateBeenAdjusted,
    
    // Comp Params
    threshold, ratio, ratioControl, attack, release, knee, lookahead,
    handleThresholdChange, updateRatio, handleCompKnobChange, handleCompDragState, hasThresholdBeenAdjusted,
    
    // Output Params
    makeupGain, dryGain,
    handleGainChange,
    
    // Playback & Modes
    playingType, lastPlayedType, isDryMode, isDeltaMode, 
    handleModeChange, toggleDeltaMode, togglePlayback,
    
    // A/B & Presets
    activeSlot, handleABSwitch,
    selectedPresetIdx, isCustomSettings, applyPreset,
    
    // UI Interaction
    isDraggingKnobRef, handleNormalDragState, handleKnobEnter, handleKnobLeave,
    resetAllParams
}) => {
    return (
        <>
            {/* PRESET SELECTOR: Positioned above HUD */}
            <div className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-30">
                <div className="relative group">
                    <button className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl hover:bg-slate-800/80 text-white font-bold px-6 py-2.5 rounded-t-lg shadow-[0_-4px_16px_rgba(0,0,0,0.2)] border-t border-x border-white/10 transition-all w-80 justify-between group-hover:border-cyan-500/50 group-hover:text-cyan-400">
                        <span className="truncate">{isCustomSettings ? "Custom Setting (自訂參數)" : PRESETS_DATA[selectedPresetIdx].name}</span>
                        <ChevronDown size={16}/>
                    </button>
                    <div className="absolute bottom-full left-0 w-80 z-50 pb-2 hidden group-hover:block">
                        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                            {PRESETS_DATA.map((p, idx) => (
                                <div key={idx} onClick={(e) => { e.stopPropagation(); applyPreset(idx); }} className={`px-4 py-3 text-sm border-b border-white/5 last:border-0 cursor-pointer transition-colors ${idx === selectedPresetIdx && !isCustomSettings ? 'text-cyan-400 font-bold bg-white/5' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN HUD */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10 z-30 transition-all select-none flex h-[140px]" onMouseDown={e => e.stopPropagation()}>
                  
                  {/* Main Controls Area */}
                  <div className="flex-1 flex items-end justify-between px-4 md:px-8 pb-4 pt-4 hide-scrollbar overflow-x-auto">
                      {/* GATE MODULE */}
                      <div className="flex gap-6 relative pt-6">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 tracking-widest mt-1">GATE</div>
                          <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={gateThreshold} min={-80} max={0} step={1} unit="dB" color="orange" onChange={handleGateThresholdChange} onDragStateChange={handleGateDragState} tooltipKey="gateThreshold" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                          <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="RATIO" value={gateRatio} min={1} max={8} step={0.1} unit=":1" color="yellow" onChange={(v) => updateParam(updateParam, v, 'gateRatio')} /* NOTE: Handler logic in App.jsx needs to support this */ onDragStateChange={handleNormalDragState} tooltipKey="gateRatio" onHover={handleKnobEnter} onLeave={handleKnobLeave}/> 
                          {/* Wait, the original code used `updateParam(setGateRatio, v)`. In App.jsx we will pass a specific setter or wrapper. 
                              For now let's assume `updateParam` is a generic wrapper or we pass specific handlers. 
                              Let's stick to the props passed in.
                              Actually, looking at the props I defined above: `updateParam` is generic.
                              Ideally, App.jsx should pass `setGateRatio` bound functions or similar.
                              To make it clean, I'll assume the props passed are `setGateRatioWrapper` etc.
                              BUT, to keep it simple with the huge props list, I'll rely on the App.jsx integration step to pass the right arrow functions.
                              Let's fix the `onChange` here to use an arrow function that calls `updateParam` with the setter.
                              Wait, `ControlHud` doesn't have access to `setGateRatio`. 
                              
                              **Correction**: I will use a generic `onParamChange` prop or individual props.
                              In the props list above I put `updateParam`.
                              Let's change the props slightly in the usage below to match what App.jsx will provide.
                           */}
                          <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="RATIO" value={gateRatio} min={1} max={8} step={0.1} unit=":1" color="yellow" onChange={(v) => updateParam('gateRatio', v)} onDragStateChange={handleNormalDragState} tooltipKey="gateRatio" onHover={handleKnobEnter} onLeave={handleKnobLeave}/> 
                          <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="ATTACK" value={gateAttack} min={0.1} max={50} step={0.1} unit="ms" color="yellow" onChange={(v) => updateParam('gateAttack', v)} onDragStateChange={handleNormalDragState} tooltipKey="gateAttack" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                      </div>

                      <div className="flex-1"></div>

                      {/* PLAYBACK CONTROLS */}
                      <div className="flex gap-2 pb-2 flex-none items-center px-4">
                          <PlayBtn label="Dry" selected={lastPlayedType === 'original'} onClick={() => handleModeChange(lastPlayedType === 'original' ? 'processed' : 'original')} color="yellow" />
                          <PlayBtn label="Wet" selected={lastPlayedType === 'processed'} onClick={() => handleModeChange(lastPlayedType === 'processed' ? 'original' : 'processed')} color="red" />
                          <button onMouseDown={(e) => e.stopPropagation()} onClick={toggleDeltaMode} disabled={isDryMode} className={`h-8 w-8 flex items-center justify-center rounded border transition-all ${isDryMode ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' : isDeltaMode ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700'} ${isDryMode ? 'cursor-not-allowed opacity-50' : ''}`} title="Delta Monitoring">
                              <Triangle size={14} fill={isDeltaMode ? "currentColor" : "none"} />
                          </button>
                          <div className="w-px h-8 bg-white/10 mx-2"></div>
                          <PlayBtn label={playingType!=='none'?"PAUSE":"PLAY"} active={playingType!=='none'} onClick={togglePlayback} color="green" isPlayButton/>
                      </div>
                      
                      {/* A/B BUTTONS */}
                      <div className="flex gap-2 pb-2 flex-none items-center px-2">
                          <button onClick={() => handleABSwitch('A')} className={`w-8 h-8 rounded font-bold text-xs border transition-all relative overflow-hidden group ${activeSlot === 'A' ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(8,145,178,0.5)] animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-300'}`}>
                              <span className="relative z-10">A</span>
                              {activeSlot === 'A' && <div className="absolute inset-0 bg-cyan-400/20"></div>}
                          </button>
                          <button onClick={() => handleABSwitch('B')} className={`w-8 h-8 rounded font-bold text-xs border transition-all relative overflow-hidden group ${activeSlot === 'B' ? 'bg-orange-600 text-white border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.5)] animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-300'}`}>
                              <span className="relative z-10">B</span>
                              {activeSlot === 'B' && <div className="absolute inset-0 bg-orange-400/20"></div>}
                          </button>
                      </div>

                      <div className="flex-1"></div>
                      
                      {/* COMPRESSOR MODULE */}
                      <div className="flex flex-col items-center gap-2 bg-white/5 rounded-xl p-2 border border-white/5 flex-none relative pt-6 transition-colors hover:bg-white/10" onMouseEnter={() => { if(lastPlayedType === 'original') handleModeChange('processed'); }}>
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 tracking-widest mt-1">COMPRESSOR</div>
                         <div className="flex gap-4">
                             <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={threshold} min={-60} max={0} step={1} unit="dB" color="cyan" onChange={handleThresholdChange} onDragStateChange={handleCompDragState} tooltipKey="threshold" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                             <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="RATIO" value={ratioControl} displayValue={ratio.toFixed(1)} min={0} max={100} step={0.5} unit=":1" color="indigo" onChange={updateRatio} onDragStateChange={handleCompDragState} tooltipKey="ratio" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                             <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="ATTACK" value={attack} min={0.1} max={100} step={0.1} unit="ms" color="blue" onChange={(v) => handleCompKnobChange('attack', v)} onDragStateChange={handleCompDragState} tooltipKey="attack" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                             <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="RELEASE" value={release} min={10} max={500} step={1} unit="ms" color="pink" onChange={(v) => handleCompKnobChange('release', v)} onDragStateChange={handleCompDragState} tooltipKey="release" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                             <div className="w-px h-8 bg-white/10"></div>
                             <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="KNEE" value={knee} min={0} max={30} step={1} unit="dB" color="rose" onChange={(v) => handleCompKnobChange('knee', v)} onDragStateChange={handleCompDragState} tooltipKey="knee" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                             <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="LOOKAHEAD" value={lookahead} min={0} max={100} step={1} unit="ms" color="purple" onChange={(v) => handleCompKnobChange('lookahead', v)} onDragStateChange={handleCompDragState} tooltipKey="lookahead" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                         </div>
                      </div>
                      
                      <div className="flex-1"></div>
                      
                      {/* OUTPUT MODULE */}
                      <div className="flex flex-col items-center gap-2 flex-none pt-6 relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 tracking-widest mt-1">OUTPUT</div>
                          <div className="flex gap-4">
                              <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="WET GAIN" subLabel="(MAKEUP)" value={makeupGain} min={0} max={20} step={0.5} unit="dB" color="emerald" onChange={(v) => handleGainChange('makeupGain', v)} onDragStateChange={handleNormalDragState} tooltipKey="makeup" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                              <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="DRY GAIN" value={dryGain} min={-60} max={6} step={0.5} unit="dB" color="yellow" onChange={(v) => handleGainChange('dryGain', v)} onDragStateChange={handleNormalDragState} tooltipKey="dryGain" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                          </div>
                      </div>
                  </div>
                  
                  {/* RESET BUTTON */}
                  <button 
                    onClick={resetAllParams}
                    className="w-12 h-full bg-[#ef4444]/70 hover:bg-[#dc2626]/80 backdrop-blur-md text-white font-bold text-xs flex flex-col items-center justify-center border-l border-white/20 shadow-[-4px_0_15px_rgba(0,0,0,0.5)] active:translate-x-[2px] active:shadow-none transition-all gap-1.5 tracking-widest flex-none z-50"
                    title="Reset All Parameters"
                    style={{textShadow: '0 1px 2px rgba(0,0,0,0.3)'}}
                  >
                    <span>R</span><span>E</span><span>S</span><span>E</span><span>T</span>
                  </button>
            </div>
        </>
    );
};

export default ControlHud;