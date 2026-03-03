import React, { useState, useEffect, useRef, useCallback } from 'react';

import { saveAppStateToStorage, saveParamsForSource, softReset, saveTooltipsOff, loadTooltipsOff } from './utils/storage';

import Header from './components/layout/Header';
import ControlHud from './components/layout/ControlHud';
import Waveform from './components/visualizer/Waveform';
import Meters, { InputMeter } from './components/visualizer/Meters';
import OutputWaveform from './components/visualizer/OutputWaveform';

import useDebug from './hooks/useDebug';
import useViewState from './hooks/useViewState';
import useCompressorParams from './hooks/useCompressorParams';
import useDSPProcessing from './hooks/useDSPProcessing';
import useVisualizerLoop from './hooks/useVisualizerLoop';
import usePlayback from './hooks/usePlayback';
import useAudioEngine from './hooks/useAudioEngine';
import useWaveformInteraction from './hooks/useWaveformInteraction';
import useMarkers from './hooks/useMarkers';

const App = () => {
    // --- Core State (shared between hooks) ---
    const [audioContext, setAudioContext] = useState(null);
    const [originalBuffer, setOriginalBuffer] = useState(null);

    // --- Shared Refs ---
    const containerRef = useRef(null);
    const waveformCanvasRef = useRef(null);
    const outputMeterCanvasRef = useRef(null);
    const inputMeterCanvasRef = useRef(null);
    const playheadRef = useRef(null);
    const outputPlayheadRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const startTimeRef = useRef(0);
    const startOffsetRef = useRef(0);
    const isPlayingRef = useRef(false);
    const rafIdRef = useRef(null);
    const playBufferRef = useRef(null);
    const isDraggingKnobRef = useRef(false);
    const animateRef = useRef(null);
    const hoveredMeterRef = useRef(null);
    const fullAudioDataRef = useRef(null);
    const meterStateRef = useRef({
        peakLevel: 0, holdPeakLevel: 0, holdTimer: 0,
        dryPeakLevel: 0, dryHoldPeakLevel: 0, dryHoldTimer: 0,
        dryRmsLevel: 0, outRmsLevel: 0,
        outClipping: false,
        inClipping: false,
    });

    // Ref-based callbacks (break circular deps)
    const handleModeChangeRef = useRef(null);
    const lastPlayedTypeRef = useRef('original');

    // --- Tooltips toggle ---
    const [tooltipsOff, setTooltipsOff] = useState(() => loadTooltipsOff());
    const handleSetTooltipsOff = useCallback((off) => {
        setTooltipsOff(off);
        saveTooltipsOff(off);
    }, []);

    // --- AudioWorklet readiness ---
    const [workletReady, setWorkletReady] = useState(false);

    // --- Initialize AudioContext + register AudioWorklet ---
    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
        setAudioContext(ctx);

        if (ctx.audioWorklet) {
            ctx.audioWorklet.addModule('/compressor-processor.js')
                .then(() => setWorkletReady(true))
                .catch((err) => {
                    console.warn('AudioWorklet registration failed, falling back to ScriptProcessor:', err);
                    setWorkletReady(false);
                });
        }

        return () => { ctx.close(); };
    }, []);

    // --- 1. Debug ---
    const { logAction } = useDebug();

    // --- 2. View State ---
    const view = useViewState({ containerRef });

    // --- Region: controls what portion of audio is shown in the main visualizer ---
    const [regionStart, setRegionStart] = useState(0);
    const [regionEnd, setRegionEnd] = useState(1);

    const regionStartRef = useRef(0);
    const regionEndRef = useRef(1);

    const handleRegionChange = useCallback((s, e) => {
        setRegionStart(s);
        setRegionEnd(e);
        regionStartRef.current = s;
        regionEndRef.current = e;
    }, []);

    useEffect(() => { regionStartRef.current = regionStart; }, [regionStart]);
    useEffect(() => { regionEndRef.current = regionEnd; }, [regionEnd]);

    // When a new audio file loads, default region to 5-second window centred at midpoint + clear markers
    useEffect(() => {
        if (!originalBuffer) return;
        markerHook.clearAll();
        const D = originalBuffer.duration;
        if (D <= 5) {
            setRegionStart(0);
            setRegionEnd(1);
        } else {
            const half = 2.5 / D;
            setRegionStart(0.5 - half);
            setRegionEnd(0.5 + half);
        }
    }, [originalBuffer]); // eslint-disable-line react-hooks/exhaustive-deps

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
        currentParams: comp.currentParams,
        paramsRef: comp.paramsRef,
        animateRef,
        fullAudioDataRef,
        logAction,
        sourceNodeRef, startTimeRef, startOffsetRef,
        isPlayingRef, rafIdRef, playBufferRef,
        meterStateRef,
        regionStartRef, regionEndRef,
        workletReady,
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
        getDefaultSnapshot: comp.getDefaultSnapshot,
        sourceNodeRef, isPlayingRef, startOffsetRef,
        setPlayingType: playback.setPlayingType,
        setLastPlayedType: playback.setLastPlayedType,
        currentParams: comp.currentParams,
        logAction,
    });

    // --- 6a. Markers ---
    const markerHook = useMarkers();

    // --- 6b. Waveform Interaction ---
    const waveform = useWaveformInteraction({
        waveformCanvasRef, containerRef, originalBuffer,
        isDraggingKnobRef,
        startOffsetRef, playingTypeRef: playback.playingTypeRef, playBufferRef,
        playheadRef, outputPlayheadRef,
        zoomX: view.zoomX, panOffset: view.panOffset,
        isPlayingRef,
        markersRef: markerHook.markersRef,
        addMarker: markerHook.addMarker,
        removeMarker: markerHook.removeMarker,
        updateMarkerEdge: markerHook.updateMarkerEdge,
    });

    // --- 7. DSP Processing ---
    const isAnyKnobDragging = waveform.isKnobDragging;
    const dsp = useDSPProcessing({
        audioContext, originalBuffer,
        currentParams: comp.currentParams,
        playingType: playback.playingType,
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
        mousePos: waveform.mousePos,
        mousePosRef: waveform.mousePosRef,
        visualResult: dsp.visualResult,
        visualStep: dsp.visualStep,
        mipmaps: dsp.mipmaps,
        fullAudioDataRef,
        playBufferRef, startTimeRef, startOffsetRef, isPlayingRef, rafIdRef,
        waveformCanvasRef, outputMeterCanvasRef, inputMeterCanvasRef,
        playheadRef, meterStateRef,
        canvasDims: view.canvasDims,
        zoomX: view.zoomX, zoomY: view.zoomY,
        panOffset: view.panOffset, panOffsetY: view.panOffsetY,
        playingTypeRef: playback.playingTypeRef,
        lastPlayedTypeRef: playback.lastPlayedTypeRef,
        outputPlayheadRef,
        regionStartRef, regionEndRef,
        hoveredMeterRef,
        markersRef: markerHook.markersRef,
        hoveredMarkerInfoRef: waveform.hoveredMarkerInfoRef,
        draggingMarkerRef: waveform.draggingMarkerRef,
    });

    // Wire animate ref (for usePlayback to use latest animate)
    animateRef.current = animate;

    // --- RAF loop effect ---
    useEffect(() => {
        if (playback.playingType === 'none') return;
        let active = true;
        const loop = () => {
            if (!active) return;
            animateRef.current?.();
            rafIdRef.current = requestAnimationFrame(loop);
        };
        rafIdRef.current = requestAnimationFrame(loop);
        return () => {
            active = false;
            cancelAnimationFrame(rafIdRef.current);
        };
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
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [engine.currentSourceId,
        playback.lastPlayedType]);

    // --- Per-Source Auto-Save Params (debounced 1s) ---
    useEffect(() => {
        if (!engine.currentSourceId || engine.isLoading) return;
        const timer = setTimeout(() => {
            saveParamsForSource(engine.currentSourceId, comp.getCurrentStateSnapshot());
        }, 1000);
        return () => clearTimeout(timer);
    }, [engine.currentSourceId, comp.getCurrentStateSnapshot, engine.isLoading]);

    // --- Prop Groups for ControlHud ---
    const compProps = {};
    const playbackProps = {
        playingType: playback.playingType, lastPlayedType: playback.lastPlayedType,
        isDryMode: playback.isDryMode,
        handleModeChange: playback.handleModeChange,
        togglePlayback: playback.togglePlayback,
    };
    const uiProps = {
        isDraggingKnobRef,
        handleKnobEnter: (k) => view.setHoveredKnob(k),
        handleKnobLeave: () => view.setHoveredKnob(null),
        resetAllParams: () => {
            comp.resetAllParams();
            view.resetView();
            setRegionStart(0);
            setRegionEnd(1);
        },
    };

    // --- Render ---
    return (
        <div className={`h-dvh flex flex-col bg-panel text-slate-200 overflow-hidden pl-2 min-[740px]:pl-4 pt-4 pb-4 pr-2 min-[740px]:pr-4 relative${tooltipsOff ? ' tooltips-off' : ''}`}>
            <Header
                engine={{
                    fileName: engine.fileName,
                    currentSourceId: engine.currentSourceId,
                    lastPracticeSourceId: engine.lastPracticeSourceId,
                    handleFileUpload: engine.handleFileUpload,
                    clearUserUpload: engine.clearUserUpload,
                    restoreUserUpload: engine.restoreUserUpload,
                    switchToPractice: engine.switchToPractice,
                    userBufferRef: engine.userBufferRef,
                    userFileNameRef: engine.userFileNameRef,
                    handleDownload: engine.handleDownload,
                    isLoading: engine.isLoading,
                    loadPreset: engine.loadAudio,
                    fileInputRef: engine.fileInputRef,
                    loadCustomAudio: engine.loadCustomAudio,
                }}
                handleFactoryReset={softReset}
                stopAudio={playback.stopAudio}
                tooltipsOff={tooltipsOff}
                setTooltipsOff={handleSetTooltipsOff}
            />

            <div className="flex-1 flex min-h-0 relative z-0 gap-2 px-3">
                <InputMeter
                    inputCanvasRef={inputMeterCanvasRef}
                    hoveredMeterRef={hoveredMeterRef}
                    meterStateRef={meterStateRef}
                    inputGain={comp.inputGain}
                    onInputGainChange={(v) => comp.handleCompKnobChange('inputGain', v)}
                />
                <Waveform
                    canvasRef={waveformCanvasRef}
                    containerRef={containerRef}
                    playheadRef={playheadRef}
                    onMouseDown={waveform.handleWaveformMouseDown}
                    onMouseMove={waveform.handleLocalMouseMove}
                    onMouseLeave={waveform.handleMouseLeave}
                    isLoading={engine.isLoading}
                    loadingMessage={engine.loadingMessage}
                >
                </Waveform>

                <Meters
                    outputCanvasRef={outputMeterCanvasRef}
                    height={view.canvasDims.height}
                    hoveredMeterRef={hoveredMeterRef}
                    meterStateRef={meterStateRef}
                    outputGain={comp.outputGain}
                    onOutputGainChange={(v) => comp.handleCompKnobChange('outputGain', v)}
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
                isLoading={engine.isLoading}
                loadingMessage={engine.loadingMessage}
            />

            <ControlHud
                compressor={compProps}
                playback={playbackProps}
                ui={uiProps}
                tooltipsOff={tooltipsOff}
            />

            {engine.errorMsg && (
                <div className="fixed top-4 right-4 bg-red-900/90 text-white p-4 rounded shadow-xl border border-red-500 max-w-sm z-50">
                    {engine.errorMsg}
                </div>
            )}

        </div>
    );
};

export default App;
