import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gauge, Info, ToggleLeft, ToggleRight } from 'lucide-react';

import { PRESETS_DATA, TOOLTIPS } from './utils/constants';
import { saveAppStateToStorage, softReset } from './utils/storage';

import Header from './components/layout/Header';
import ControlHud from './components/layout/ControlHud';
import Waveform from './components/visualizer/Waveform';
import Meters from './components/visualizer/Meters';
import OutputWaveform from './components/visualizer/OutputWaveform';

import useDebug from './hooks/useDebug';
import useViewState from './hooks/useViewState';
import useCompressorParams from './hooks/useCompressorParams';
import useDSPProcessing from './hooks/useDSPProcessing';
import useVisualizerLoop from './hooks/useVisualizerLoop';
import usePlayback from './hooks/usePlayback';
import useAudioEngine from './hooks/useAudioEngine';
import useWaveformInteraction from './hooks/useWaveformInteraction';

const App = () => {
    // --- Core State (shared between hooks) ---
    const [audioContext, setAudioContext] = useState(null);
    const [originalBuffer, setOriginalBuffer] = useState(null);

    // --- Shared Refs ---
    const containerRef = useRef(null);
    const waveformCanvasRef = useRef(null);
    const grBarCanvasRef = useRef(null);
    const outputMeterCanvasRef = useRef(null);
    const cfMeterCanvasRef = useRef(null);
    const playheadRef = useRef(null);
    const outputPlayheadRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const drySourceNodeRef = useRef(null);
    const dryGainNodeRef = useRef(null);
    const startTimeRef = useRef(0);
    const startOffsetRef = useRef(0);
    const isPlayingRef = useRef(false);
    const rafIdRef = useRef(null);
    const playBufferRef = useRef(null);
    const isDraggingKnobRef = useRef(false);
    const animateRef = useRef(null);
    const fullAudioDataRef = useRef(null);
    const meterStateRef = useRef({
        peakLevel: 0, holdPeakLevel: 0, holdTimer: 0,
        dryPeakLevel: 0, dryHoldPeakLevel: 0, dryHoldTimer: 0,
        grPeakLevel: 0, grHoldPeakLevel: 0, grHoldTimer: 0,
        dryRmsLevel: 0, outRmsLevel: 0, crestFactor: 0,
        outClipping: false,
        cfHeatArray: new Float32Array(50),
    });

    // Ref-based callbacks (break circular deps)
    const handleModeChangeRef = useRef(null);
    const lastPlayedTypeRef = useRef('original');

    // --- Initialize AudioContext ---
    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
        setAudioContext(ctx);
        return () => { ctx.close(); };
    }, []);

    // --- 1. Debug ---
    const { logAction } = useDebug();

    // --- 2. View State ---
    const view = useViewState({ containerRef });

    // --- Region: controls what portion of audio is shown in the main visualizer ---
    // regionStart / regionEnd are normalized fractions [0, 1]
    const [regionStart, setRegionStart] = useState(0);
    const [regionEnd, setRegionEnd] = useState(1);

    const regionStartRef = useRef(0);
    const regionEndRef = useRef(1);

    const handleRegionChange = useCallback((s, e) => {
        setRegionStart(s);
        setRegionEnd(e);
    }, []);

    // Keep refs in sync with state
    useEffect(() => { regionStartRef.current = regionStart; }, [regionStart]);
    useEffect(() => { regionEndRef.current = regionEnd; }, [regionEnd]);

    // When a new audio file loads, default region to 3-second window centred at midpoint
    useEffect(() => {
        if (!originalBuffer) return;
        const D = originalBuffer.duration;
        if (D <= 3) {
            setRegionStart(0);
            setRegionEnd(1);
        } else {
            const half = 1.5 / D; // 1.5 seconds expressed as fraction
            setRegionStart(0.5 - half);
            setRegionEnd(0.5 + half);
        }
    }, [originalBuffer]);

    // Sync region fractions → zoomX + panOffset (in pixels)
    useEffect(() => {
        const width = view.canvasDims.width;
        if (width === 0) return;
        const regionWidth = regionEnd - regionStart;
        if (regionWidth < 0.01) return;
        view.setZoomX(1 / regionWidth);
        view.setPanOffset(-regionStart * width / regionWidth);
    }, [regionStart, regionEnd, view.canvasDims.width]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- 3. Compressor Params (uses refs for mode switch) ---
    const comp = useCompressorParams({
        onModeSwitchRef: handleModeChangeRef,
        lastPlayedTypeRef,
        logAction,
        meterStateRef,
    });

    // --- 4. Playback (uses animateRef to break cycle) ---
    const playback = usePlayback({
        audioContext, originalBuffer,
        paramsRef: comp.paramsRef,
        dryGain: comp.dryGain,
        dryGainNodeRef,
        animateRef,
        fullAudioDataRef,
        logAction,
        handleModeDryGainSync: comp.handleModeDryGainSync,
        sourceNodeRef, drySourceNodeRef, startTimeRef, startOffsetRef,
        isPlayingRef, rafIdRef, playBufferRef,
        meterStateRef,
        regionStartRef, regionEndRef,
    });

    // Wire ref-based callbacks
    handleModeChangeRef.current = playback.handleModeChange;
    lastPlayedTypeRef.current = playback.lastPlayedType;

    // --- 5. Audio Engine ---
    const engine = useAudioEngine({
        audioContext, originalBuffer, setOriginalBuffer,
        applyStateSnapshot: comp.applyStateSnapshot,
        getCurrentStateSnapshot: comp.getCurrentStateSnapshot,
        resetAllParams: comp.resetAllParams,
        sourceNodeRef, drySourceNodeRef, isPlayingRef, startOffsetRef,
        setPlayingType: playback.setPlayingType,
        setLastPlayedType: playback.setLastPlayedType,
        currentParams: comp.currentParams,
        dryGain: comp.dryGain,
        logAction,
    });

    // --- 6. Waveform Interaction ---
    const waveform = useWaveformInteraction({
        waveformCanvasRef, containerRef, originalBuffer,
        threshold: comp.threshold, gateThreshold: comp.gateThreshold,
        setThreshold: comp.setThreshold, setGateThreshold: comp.setGateThreshold,
        zoomY: view.zoomY,
        panOffsetY: view.panOffsetY,
        setIsCustomSettings: comp.setIsCustomSettings,
        setIsProcessing: comp.setIsProcessing,
        setHasThresholdBeenAdjusted: comp.setHasThresholdBeenAdjusted,
        setHasGateBeenAdjusted: comp.setHasGateBeenAdjusted,
        isCompBypass: comp.isCompBypass, setIsCompBypass: comp.setIsCompBypass,
        isGateBypass: comp.isGateBypass, setIsGateBypass: comp.setIsGateBypass,
        lastPlayedType: playback.lastPlayedType,
        handleModeChange: playback.handleModeChange,
        isDraggingKnobRef,
        // Seek-related refs
        startOffsetRef, playingTypeRef: playback.playingTypeRef, playBufferRef,
        playheadRef, outputPlayheadRef,
        zoomX: view.zoomX, panOffset: view.panOffset,
    });

    // --- 7. DSP Processing ---
    const isAnyKnobDragging = waveform.isKnobDragging || waveform.isGainKnobDragging || waveform.isCompAdjusting || waveform.isGateAdjusting;
    const dsp = useDSPProcessing({
        audioContext, originalBuffer,
        currentParams: comp.currentParams,
        dryGain: comp.dryGain,
        playingType: playback.playingType,
        isDeltaMode: playback.isDeltaMode,
        setIsProcessing: comp.setIsProcessing,
        fullAudioDataRef,
        isDraggingKnobRef,
        isAnyKnobDragging,
    });

    // --- 8. Visualizer Loop ---
    const animate = useVisualizerLoop({
        audioContext, originalBuffer,
        playingType: playback.playingType,
        lastPlayedType: playback.lastPlayedType,
        isDeltaMode: playback.isDeltaMode,
        dryGain: comp.dryGain,
        threshold: comp.threshold,
        gateThreshold: comp.gateThreshold,
        mousePos: waveform.mousePos,
        hoverLine: waveform.hoverLine,
        isDraggingLineRef: waveform.isDraggingLineRef,
        isCompAdjusting: waveform.isCompAdjusting,
        hasThresholdBeenAdjusted: comp.hasThresholdBeenAdjusted,
        isGateAdjusting: waveform.isGateAdjusting,
        hasGateBeenAdjusted: comp.hasGateBeenAdjusted,
        isGateBypass: comp.isGateBypass,
        isCompBypass: comp.isCompBypass,
        hoveredKnob: view.hoveredKnob,
        isGainKnobDragging: waveform.isGainKnobDragging,
        visualResult: dsp.visualResult,
        visualStep: dsp.visualStep,
        mipmaps: dsp.mipmaps,
        mixMipmaps: dsp.mixMipmaps,
        fullAudioDataRef,
        playBufferRef, startTimeRef, startOffsetRef, isPlayingRef, rafIdRef,
        waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef,
        playheadRef, meterStateRef,
        hoverGrRef: waveform.hoverGrRef,
        canvasDims: view.canvasDims,
        zoomX: view.zoomX, zoomY: view.zoomY,
        panOffset: view.panOffset, panOffsetY: view.panOffsetY,
        playingTypeRef: playback.playingTypeRef,
        lastPlayedTypeRef: playback.lastPlayedTypeRef,
        outputPlayheadRef,
        regionStartRef, regionEndRef,
    });

    // Wire animate ref (for usePlayback to use latest animate)
    animateRef.current = animate;

    // --- RAF restart effect (needs both playingType and animate) ---
    useEffect(() => {
        if (playback.playingType !== 'none') {
            rafIdRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(rafIdRef.current);
    }, [playback.playingType, animate]);

    // --- Keyboard listener ---
    useEffect(() => {
        const h = (e) => { if (e.code === 'Space') { e.preventDefault(); playback.togglePlayback(); } };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [playback.togglePlayback]);

    // --- Auto-Save App State ---
    useEffect(() => {
        const timer = setTimeout(() => {
            saveAppStateToStorage({
                currentSourceId: engine.currentSourceId,
                lastPlayedType: playback.lastPlayedType,
                isInfoPanelEnabled: view.isInfoPanelEnabled,
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [engine.currentSourceId,
        playback.lastPlayedType,
        view.isInfoPanelEnabled]);

    // --- Info Panel Content ---
    const getActiveInfo = () => {
        if (view.hoveredKnob && TOOLTIPS[view.hoveredKnob]) {
            const t = TOOLTIPS[view.hoveredKnob];
            return {
                title: t.title,
                content: (
                    <>
                        <div className="mb-3 text-slate-300 font-medium">{t.desc}</div>
                        <div className="text-yellow-400 font-bold mb-1.5 text-xs uppercase tracking-wide">💡 調整效果</div>
                        <div className="text-slate-400 text-sm leading-relaxed mb-3">{t.setting}</div>
                        <div className="text-cyan-400 font-bold mb-1.5 text-xs uppercase tracking-wide">⚙️ 常用參數參考</div>
                        <div className="text-slate-300 text-sm font-mono bg-black/30 p-2 rounded border border-white/10">{t.common}</div>
                    </>
                ),
                isKnob: true
            };
        }
        if (!comp.isCustomSettings && comp.selectedPresetIdx !== 0 && PRESETS_DATA[comp.selectedPresetIdx]) {
            return {
                title: `設定思路: ${PRESETS_DATA[comp.selectedPresetIdx].name.split('(')[0]}`,
                content: PRESETS_DATA[comp.selectedPresetIdx].explanation,
                isPreset: true
            };
        }
        return null;
    };
    const activeInfo = getActiveInfo();

    // --- Render ---
    return (
        <div className="h-dvh flex flex-col bg-[#202020] text-slate-200 overflow-hidden pl-4 pt-4 pb-4 pr-4 relative">
            <Header
                fileName={engine.fileName}
                currentSourceId={engine.currentSourceId} lastPracticeSourceId={engine.lastPracticeSourceId}
                handleFileUpload={engine.handleFileUpload} restoreUserUpload={engine.restoreUserUpload}
                clearUserUpload={engine.clearUserUpload}
                switchToPractice={engine.switchToPractice}
                handleFactoryReset={softReset}
                stopAudio={playback.stopAudio}
                userBufferRef={engine.userBufferRef} userFileNameRef={engine.userFileNameRef}
                handleDownload={engine.handleDownload} isLoading={engine.isLoading}
                loadPreset={engine.loadAudio}
                loadCustomAudio={engine.loadCustomAudio}
                isInfoPanelEnabled={view.isInfoPanelEnabled} setIsInfoPanelEnabled={view.setIsInfoPanelEnabled}
                fileInputRef={engine.fileInputRef}
                resetAllParams={() => {
                    comp.resetAllParams();
                    view.resetView();
                    playback.setIsDeltaMode(false);
                    setRegionStart(0);
                    setRegionEnd(1);
                }}
                wetGainControl={comp.wetGainControl} dryGainControl={comp.dryGainControl}
                handleGainChange={comp.handleGainChange}
                isDryMode={playback.isDryMode}
                isDraggingKnobRef={isDraggingKnobRef}
                handleNormalDragState={(isActive) => {
                    waveform.setIsKnobDragging(isActive);
                    waveform.setIsGainKnobDragging(isActive);
                }}
                handleKnobEnter={(k, e) => {
                    view.setHoveredKnob(k);
                    if (e) view.setHoveredKnobPos({ x: e.clientX, y: e.clientY });
                    view.setShowInfoPanel(true);
                }}
                handleKnobLeave={() => view.setHoveredKnob(null)}
            />

            <div className="flex-1 flex min-h-0 relative z-0">
                <Waveform
                    canvasRef={waveformCanvasRef}
                    containerRef={containerRef}
                    playheadRef={playheadRef}
                    onMouseDown={waveform.handleWaveformMouseDown}
                    onMouseMove={waveform.handleLocalMouseMove}
                    onMouseLeave={waveform.handleLocalMouseMove}
                >
                    {view.hoveredKnob && activeInfo && activeInfo.isKnob && view.isInfoPanelEnabled ? (
                        <div
                            className="absolute bottom-4 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col w-64 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none"
                            style={{
                                left: Math.max(10, Math.min(view.canvasDims.width - 270, view.hoveredKnobPos.x - (containerRef.current?.getBoundingClientRect().left || 0) - 128))
                            }}
                        >
                            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2 text-lg"><Info size={20} /> {activeInfo.title}</div>
                            <div className="text-sm text-slate-200 leading-relaxed font-medium">{activeInfo.content}</div>
                        </div>
                    ) : (view.isInfoPanelEnabled && PRESETS_DATA[comp.selectedPresetIdx]) ? (
                        <div className="absolute top-4 right-4 z-30 bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col w-72 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
                            <div className="flex items-center gap-2 text-green-400 font-bold mb-2 text-base border-b border-white/10 pb-2">
                                <Info size={18} />
                                {PRESETS_DATA[comp.selectedPresetIdx].name.split(' (')[0]}
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                {PRESETS_DATA[comp.selectedPresetIdx].explanation}
                            </div>
                        </div>
                    ) : null}

                    <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2 items-end">
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); view.setIsInfoPanelEnabled(!view.isInfoPanelEnabled); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all shadow-lg border backdrop-blur-md ${view.isInfoPanelEnabled ? 'bg-green-500 text-white border-green-400 shadow-green-500/30 hover:bg-green-400' : 'bg-slate-800/80 text-slate-400 border-white/10 hover:bg-slate-700 hover:text-white'}`}
                        >
                            {view.isInfoPanelEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} 彈出說明視窗
                        </button>
                    </div>

                </Waveform>

                <Meters
                    grCanvasRef={grBarCanvasRef}
                    outputCanvasRef={outputMeterCanvasRef}
                    cfMeterCanvasRef={cfMeterCanvasRef}
                    height={view.canvasDims.height}
                />
            </div>

            <OutputWaveform
                outputData={dsp.visualResult?.outputData}
                outputMipmaps={dsp.mipmaps?.output}
                originalBuffer={originalBuffer}
                audioContext={audioContext}
                startTimeRef={startTimeRef}
                startOffsetRef={startOffsetRef}
                isPlayingRef={isPlayingRef}
                playBufferRef={playBufferRef}
                playingTypeRef={playback.playingTypeRef}
                outputPlayheadRef={outputPlayheadRef}
                regionStart={regionStart}
                regionEnd={regionEnd}
                onRegionChange={handleRegionChange}
            />

            <ControlHud
                gateThreshold={comp.gateThreshold} gateRatio={comp.gateRatio}
                gateAttack={comp.gateAttack} gateRelease={comp.gateRelease}
                handleGateThresholdChange={comp.handleGateThresholdChange}
                updateParam={comp.updateGateParam}
                handleGateDragState={(isActive) => { waveform.setIsKnobDragging(isActive); waveform.setIsGateAdjusting(isActive); }}
                hasGateBeenAdjusted={comp.hasGateBeenAdjusted}
                isGateBypass={comp.isGateBypass}
                setIsGateBypass={(v) => { comp.setIsGateBypass(v); comp.setIsCustomSettings(true); comp.setIsProcessing(true); if (playback.lastPlayedType !== 'processed') playback.handleModeChange('processed'); }}
                threshold={comp.threshold} ratio={comp.ratio} ratioControl={comp.ratioControl}
                attack={comp.attack} release={comp.release} knee={comp.knee} lookahead={comp.lookahead}
                handleThresholdChange={comp.handleThresholdChange}
                updateRatio={comp.updateRatio}
                handleCompKnobChange={comp.handleCompKnobChange}
                handleCompDragState={(isActive) => { waveform.setIsKnobDragging(isActive); waveform.setIsCompAdjusting(isActive); }}
                hasThresholdBeenAdjusted={comp.hasThresholdBeenAdjusted}
                isCompBypass={comp.isCompBypass}
                setIsCompBypass={(v) => { comp.setIsCompBypass(v); comp.setIsCustomSettings(true); comp.setIsProcessing(true); if (playback.lastPlayedType !== 'processed') playback.handleModeChange('processed'); }}
                playingType={playback.playingType} lastPlayedType={playback.lastPlayedType}
                isDryMode={playback.isDryMode} isDeltaMode={playback.isDeltaMode}
                handleModeChange={playback.handleModeChange}
                toggleDeltaMode={playback.toggleDeltaMode}
                togglePlayback={playback.togglePlayback}
                selectedPresetIdx={comp.selectedPresetIdx}
                isCustomSettings={comp.isCustomSettings}
                applyPreset={comp.applyPreset}
                currentSourceId={engine.currentSourceId}
                isDraggingKnobRef={isDraggingKnobRef}
                handleNormalDragState={waveform.setIsKnobDragging}
                handleKnobEnter={(k, e) => {
                    view.setHoveredKnob(k);
                    if (e) view.setHoveredKnobPos({ x: e.clientX, y: e.clientY });
                    view.setShowInfoPanel(true);
                }}
                handleKnobLeave={() => view.setHoveredKnob(null)}
                resetAllParams={() => {
                    comp.resetAllParams();
                    view.resetView();
                    playback.setIsDeltaMode(false);
                    setRegionStart(0);
                    setRegionEnd(1);
                }}
            />

            {engine.isLoading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 p-4 rounded text-white flex items-center gap-2">
                        <Gauge className="animate-spin" /> Loading...
                    </div>
                </div>
            )}
            {engine.errorMsg && (
                <div className="fixed top-4 right-4 bg-red-900/90 text-white p-4 rounded shadow-xl border border-red-500 max-w-sm z-50">
                    {engine.errorMsg}
                </div>
            )}

        </div>
    );
};

export default App;
