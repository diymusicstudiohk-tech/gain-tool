import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Gauge, Info, ToggleLeft, ToggleRight } from 'lucide-react';

// --- Imports from Refactored Structure ---
import { PRESETS_DATA, AUDIO_SOURCES, TOOLTIPS, APP_VERSION } from './utils/constants';
import { processCompressor, createRealTimeCompressor } from './utils/dsp';
import { writeWavFile } from './utils/audioHelper';
import { calculateRatioFromControl, calculateControlFromRatio } from './utils/paramHelpers';
import {
    saveParamsToStorage, loadParamsFromStorage,
    saveAppStateToStorage, loadAppStateFromStorage,
    saveAudioFileToDB, loadAudioFileFromDB, softReset
} from './utils/storage';

import Header from './components/layout/Header';
import ControlHud from './components/layout/ControlHud';
import Waveform from './components/visualizer/Waveform';
import Meters from './components/visualizer/Meters';
import { DraggableViewControls, DraggableLegend } from './components/ui/Draggables';
import SignalFlow from './components/ui/SignalFlow';
import ClipGainOverlay from './components/visualizer/ClipGainOverlay';
import useVisualizerLoop from './hooks/useVisualizerLoop';
import { generateDebugReport, copyToClipboard } from './utils/debugHelper';

// --- Import Custom Hooks ---
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useAudioLoader } from './hooks/useAudioLoader';
import { useParamHandlers } from './hooks/useParamHandlers';
import { useWaveformInteractions } from './hooks/useWaveformInteractions';
import { useLoopControl } from './hooks/useLoopControl';
import { useStateManagement } from './hooks/useStateManagement';

const App = () => {
    console.log('🎨 App component rendering...');

    // --- 1. Core State ---
    const [isLoading, setIsLoading] = useState(false);
    const [audioContext, setAudioContext] = useState(null);
    const [originalBuffer, setOriginalBuffer] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [copyStatus, setCopyStatus] = useState('idle');
    const [currentSourceId, setCurrentSourceId] = useState(null);
    const [lastPracticeSourceId, setLastPracticeSourceId] = useState('Bass-01');
    const [fileName, setFileName] = useState('');
    const [resolutionPct, setResolutionPct] = useState(100);

    // --- 2. Refs ---
    const userBufferRef = useRef(null);
    const userFileNameRef = useRef("");
    const practiceSessionRef = useRef(null);
    const uploadSessionRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const drySourceNodeRef = useRef(null);
    const dryGainNodeRef = useRef(null);
    const startTimeRef = useRef(0);
    const startOffsetRef = useRef(0);
    const waveformCanvasRef = useRef(null);
    const grBarCanvasRef = useRef(null);
    const outputMeterCanvasRef = useRef(null);
    const cfMeterCanvasRef = useRef(null);
    const playheadRef = useRef(null);
    const rafIdRef = useRef(null);
    const fileInputRef = useRef(null);
    const playBufferRef = useRef(null);
    const meterStateRef = useRef({
        peakLevel: 0, holdPeakLevel: 0, holdTimer: 0,
        dryPeakLevel: 0, dryHoldPeakLevel: 0, dryHoldTimer: 0,
        grPeakLevel: 0, grHoldPeakLevel: 0, grHoldTimer: 0,
        dryRmsLevel: 0, outRmsLevel: 0, crestFactor: 0
    });
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const isDraggingKnobRef = useRef(false);
    const gainAdjustedRef = useRef(false);
    const hoverGrRef = useRef(0);
    const isDraggingLineRef = useRef(null);
    const isCreatingLoopRef = useRef(false);
    const containerRef = useRef(null);
    const fullAudioDataRef = useRef(null);
    const processingTaskRef = useRef(null);
    const isPlayingRef = useRef(false);
    const actionLogRef = useRef([]);
    const hasInitialLoadRun = useRef(false);

    // --- 3. Parameters ---
    const [threshold, setThreshold] = useState(0);
    const [ratioControl, setRatioControl] = useState(0);
    const [ratio, setRatio] = useState(4);
    const [attack, setAttack] = useState(15);
    const [release, setRelease] = useState(150);
    const [knee, setKnee] = useState(5);
    const [lookahead, setLookahead] = useState(0);
    const [makeupGain, setMakeupGain] = useState(0);
    const [dryGain, setDryGain] = useState(0);
    const [gateThreshold, setGateThreshold] = useState(-80);
    const [gateRatio, setGateRatio] = useState(4);
    const [gateAttack, setGateAttack] = useState(2);
    const [gateRelease, setGateRelease] = useState(100);
    const [clipGain, setClipGain] = useState(0);
    const [isGateBypass, setIsGateBypass] = useState(true);
    const [isCompBypass, setIsCompBypass] = useState(false);

    // --- 4. View & UI State ---
    const [isDeltaMode, setIsDeltaMode] = useState(false);
    const [zoomX, setZoomX] = useState(1);
    const [zoomY, setZoomY] = useState(0.8);
    const [panOffset, setPanOffset] = useState(0);
    const [panOffsetY, setPanOffsetY] = useState(0);
    const [cuePoint, setCuePoint] = useState(0);
    const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
    const [isCustomSettings, setIsCustomSettings] = useState(false);
    const [hoveredKnob, setHoveredKnob] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [isInfoPanelEnabled, setIsInfoPanelEnabled] = useState(false);
    const [hoveredKnobPos, setHoveredKnobPos] = useState({ x: 0, y: 0 });
    const [isKnobDragging, setIsKnobDragging] = useState(false);
    const [isCompAdjusting, setIsCompAdjusting] = useState(false);
    const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(true);
    const [isGateAdjusting, setIsGateAdjusting] = useState(false);
    const [hasGateBeenAdjusted, setHasGateBeenAdjusted] = useState(false);
    const [canvasDims, setCanvasDims] = useState({ width: 1000, height: 400 });
    const [visualSourceCache, setVisualSourceCache] = useState({ data: null, step: 1 });
    const [fullAudioData, setFullAudioData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [signalFlowMode, setSignalFlowMode] = useState('comp1');

    // --- 5. Action Log ---
    const logAction = useCallback((action) => {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        actionLogRef.current.push(`[${timestamp}] ${action}`);
        if (actionLogRef.current.length > 15) actionLogRef.current.shift();
    }, []);

    // --- 6. Loop State ---
    const [loopStart, setLoopStart] = useState(null);
    const [loopEnd, setLoopEnd] = useState(null);

    // --- 7. Memoized Values ---
    const currentParams = useMemo(() => ({
        threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
        isGateBypass, isCompBypass, dryGain, isDeltaMode
    }), [threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold,
        gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass, dryGain, isDeltaMode]);

    const paramsRef = useRef(currentParams);
    useEffect(() => { paramsRef.current = currentParams; }, [currentParams]);

    // Create a dummy animate function that will be replaced by the real one
    const animateRef = useRef(() => {});

    // --- 8. Custom Hooks ---
    const {
        playingType, setPlayingType,
        lastPlayedType, setLastPlayedType,
        playingTypeRef, lastPlayedTypeRef,
        playBuffer, togglePlayback, handleModeChange
    } = useAudioPlayback({
        audioContext, originalBuffer, loopStart, loopEnd,
        dryGain, isDeltaMode, fullAudioDataRef,
        paramsRef, gainAdjustedRef, isPlayingRef,
        startTimeRef, startOffsetRef, sourceNodeRef, drySourceNodeRef,
        rafIdRef, animate: animateRef.current, setErrorMsg, logAction
    });

    // Derived state (must be after hooks that provide the dependencies)
    const isDryMode = lastPlayedType === 'original';

    const { handleLoopClear } = useLoopControl({
        sourceNodeRef, originalBuffer, playingType, isPlayingRef,
        audioContext, startTimeRef, startOffsetRef, playBuffer,
        setLoopStart, setLoopEnd
    });

    const {
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot, saveSessionState
    } = useStateManagement({
        threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease,
        zoomX, zoomY, panOffset, panOffsetY, cuePoint, loopStart, loopEnd,
        selectedPresetIdx, isCustomSettings, isGateBypass, isCompBypass,
        currentSourceId, fileName, userFileNameRef, practiceSessionRef, uploadSessionRef,
        setThreshold, setRatio, setRatioControl, setAttack, setRelease, setKnee, setLookahead,
        setMakeupGain, setDryGain, setGateThreshold, setGateRatio, setGateAttack, setGateRelease,
        setZoomX, setZoomY, setPanOffset, setPanOffsetY, setCuePoint, setLoopStart, setLoopEnd,
        setSelectedPresetIdx, setIsCustomSettings, setIsGateBypass, setIsCompBypass,
        setIsProcessing, playingType, startOffsetRef, handleModeChange
    });

    const applyPreset = useCallback((idx) => {
        const p = PRESETS_DATA[idx];
        if (!p) return;
        logAction(`LOAD_PRESET: ${p.name}`);
        setSelectedPresetIdx(idx);
        setIsCustomSettings(false);
        setShowInfoPanel(true);
        setIsProcessing(true);
        setThreshold(p.params.threshold);
        setRatio(p.params.ratio);
        setRatioControl(calculateControlFromRatio(p.params.ratio));
        setAttack(p.params.attack);
        setRelease(p.params.release);
        setKnee(p.params.knee);
        setLookahead(p.params.lookahead);
        setMakeupGain(p.params.makeupGain);
        setDryGain(p.params.dryGain);
        setGateThreshold(p.params.gateThreshold);
        setIsGateBypass(false);
        setIsCompBypass(false);
        if (idx === 0) setGateRatio(4);
        if (lastPlayedType !== 'processed') handleModeChange('processed');
    }, [logAction, lastPlayedType, handleModeChange]);

    const {
        handleDecodedBuffer, loadPreset, handleFileUpload,
        loadAudioOnly, switchToPractice, switchToUpload,
        restoreUserUpload, clearUserUpload
    } = useAudioLoader({
        audioContext, sourceNodeRef, isPlayingRef, userBufferRef, userFileNameRef,
        practiceSessionRef, uploadSessionRef, startOffsetRef,
        setIsLoading, setErrorMsg, setOriginalBuffer, setFullAudioData, fullAudioDataRef,
        setCurrentSourceId, setLastPracticeSourceId, setFileName,
        setPlayingType, setLoopStart, setLoopEnd, setResolutionPct,
        applyStateSnapshot, handleModeChange, applyPreset
    });

    const {
        updateParamGeneric, handleCompKnobChange, updateGateParam, handleGainChange
    } = useParamHandlers({
        setAttack, setRelease, setKnee, setLookahead,
        setGateRatio, setGateAttack, setGateRelease,
        setMakeupGain, setDryGain, setIsCustomSettings, setIsProcessing,
        lastPlayedType, handleModeChange, gainAdjustedRef, logAction
    });

    const {
        mousePos, hoverLine, handleWaveformMouseDown, handleLocalMouseMove
    } = useWaveformInteractions({
        originalBuffer, waveformCanvasRef, containerRef, playheadRef,
        isDraggingKnobRef, isDraggingLineRef, isCreatingLoopRef, dragStartXRef,
        threshold, gateThreshold, zoomX, zoomY, panOffset, panOffsetY,
        loopStart, loopEnd, signalFlowMode, isCompBypass, isGateBypass,
        lastPlayedType, playingType, playingTypeRef, lastPlayedTypeRef,
        startTimeRef, startOffsetRef, setThreshold, setGateThreshold,
        setLoopStart, setLoopEnd, setHasThresholdBeenAdjusted, setHasGateBeenAdjusted,
        setIsCompAdjusting, setIsGateAdjusting, setIsCompBypass, setIsGateBypass,
        setIsCustomSettings, setIsProcessing, setZoomX, setPanOffset,
        handleModeChange, playBufferRef, canvasDims, audioContext
    });

    // --- 9. Initialization Effect ---
    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        setRatioControl(calculateControlFromRatio(4));

        const loadInitialData = async () => {
            const savedParams = await loadParamsFromStorage();
            if (savedParams) {
                setThreshold(savedParams.threshold);
                setRatio(savedParams.ratio);
                setRatioControl(calculateControlFromRatio(savedParams.ratio));
                setAttack(savedParams.attack);
                setRelease(savedParams.release);
                setKnee(savedParams.knee);
                setLookahead(savedParams.lookahead);
                setMakeupGain(savedParams.makeupGain);
                setDryGain(savedParams.dryGain);
                setGateThreshold(savedParams.gateThreshold);
                setGateRatio(savedParams.gateRatio);
                setGateAttack(savedParams.gateAttack);
                setGateRelease(savedParams.gateRelease);
                setIsGateBypass(savedParams.isGateBypass);
                setIsCompBypass(savedParams.isCompBypass);
            }

            const savedState = await loadAppStateFromStorage();
            if (savedState) {
                setResolutionPct(savedState.resolutionPct);
                if (savedState.zoomX) setZoomX(savedState.zoomX);
                if (savedState.zoomY) setZoomY(savedState.zoomY);
                if (savedState.panOffset) setPanOffset(savedState.panOffset);
                if (savedState.panOffsetY) setPanOffsetY(savedState.panOffsetY);
                if (savedState.loopStart !== undefined) setLoopStart(savedState.loopStart);
                if (savedState.loopEnd !== undefined) setLoopEnd(savedState.loopEnd);
                if (savedState.lastPlayedType) setLastPlayedType(savedState.lastPlayedType);
                if (savedState.isInfoPanelEnabled !== undefined) setIsInfoPanelEnabled(savedState.isInfoPanelEnabled);
                if (savedState.signalFlowMode) setSignalFlowMode(savedState.signalFlowMode);
                if (savedState.currentSourceId) setCurrentSourceId(savedState.currentSourceId);
            }
        };

        loadInitialData();
        return () => {
            ctx.close();
            cancelAnimationFrame(rafIdRef.current);
            if (processingTaskRef.current) clearTimeout(processingTaskRef.current);
        };
    }, []);

    // --- 10. Canvas Resize Observer ---
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setCanvasDims({ width: Math.floor(width), height: Math.floor(height) });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // --- 11. Auto-Save Effects ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            await saveParamsToStorage({
                threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
                gateThreshold, gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            await saveAppStateToStorage({
                resolutionPct, currentSourceId, zoomX, zoomY, panOffset, panOffsetY,
                loopStart, loopEnd, lastPlayedType, isInfoPanelEnabled, signalFlowMode
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [resolutionPct, currentSourceId, zoomX, zoomY, panOffset, panOffsetY, loopStart, loopEnd, lastPlayedType, isInfoPanelEnabled, signalFlowMode]);

    // --- 12. Visual Processing ---
    useEffect(() => {
        if (!originalBuffer) return;
        const length = originalBuffer.length;
        const monoData = new Float32Array(length);
        const ch0 = originalBuffer.getChannelData(0);
        if (originalBuffer.numberOfChannels > 1) {
            const ch1 = originalBuffer.getChannelData(1);
            for (let i = 0; i < length; i++) monoData[i] = (ch0[i] + ch1[i]) / 2;
        } else {
            monoData.set(ch0);
        }

        let targetStep = 1;
        if (resolutionPct < 100) {
            const minPoints = 3000;
            const maxStep = Math.floor(length / minPoints);
            const factor = (100 - resolutionPct) / 99;
            targetStep = 1 + Math.floor(factor * (maxStep - 1));
        }

        const cacheLength = Math.floor(length / targetStep);
        const cacheData = new Float32Array(cacheLength);

        for (let i = 0; i < cacheLength; i++) {
            const start = i * targetStep;
            const end = Math.min(start + targetStep, length);
            let chunkVal = 0;
            let maxAbs = 0;
            for (let j = start; j < end; j++) {
                const val = monoData[j];
                const abs = Math.abs(val);
                if (abs > maxAbs) { maxAbs = abs; chunkVal = val; }
            }
            cacheData[i] = chunkVal;
        }
        setVisualSourceCache({ data: cacheData, step: targetStep });
    }, [originalBuffer, resolutionPct]);

    const visualResult = useMemo(() => {
        if (!visualSourceCache.data || !audioContext) return null;
        return processCompressor(visualSourceCache.data, audioContext.sampleRate, currentParams, visualSourceCache.step);
    }, [visualSourceCache, audioContext, currentParams]);

    // --- 13. Full Audio Processing ---
    useEffect(() => {
        if (!originalBuffer || !audioContext) return;
        fullAudioDataRef.current = null;
        if (processingTaskRef.current) clearTimeout(processingTaskRef.current);

        const inputData = originalBuffer.getChannelData(0);
        const sampleRate = originalBuffer.sampleRate;
        const length = inputData.length;
        const params = currentParams;
        const CHUNK_SIZE = 50000;
        let currentIndex = 0;
        const outData = new Float32Array(length);
        const compressor = createRealTimeCompressor(sampleRate);

        const processChunk = () => {
            const endIndex = Math.min(currentIndex + CHUNK_SIZE, length);
            const inputChunk = inputData.subarray(currentIndex, endIndex);
            const outputChunk = outData.subarray(currentIndex, endIndex);
            compressor.processBlock(inputChunk, outputChunk, params);
            currentIndex = endIndex;
            if (currentIndex < length) {
                processingTaskRef.current = setTimeout(processChunk, 0);
            } else {
                const outBuf = audioContext.createBuffer(1, length, sampleRate);
                outBuf.copyToChannel(outData, 0);
                const deltaData = new Float32Array(length);
                for (let i = 0; i < length; i++) deltaData[i] = outData[i] - inputData[i];
                const deltaBuf = audioContext.createBuffer(1, length, sampleRate);
                deltaBuf.copyToChannel(deltaData, 0);
                fullAudioDataRef.current = { outputBuffer: outBuf, deltaBuffer: deltaBuf };
                setIsProcessing(false);
            }
        };
        processingTaskRef.current = setTimeout(processChunk, 150);
    }, [originalBuffer, audioContext, currentParams]);

    // --- 14. Visualizer Loop ---
    const animate = useVisualizerLoop({
        audioContext, originalBuffer, playingType, lastPlayedType, isDeltaMode, dryGain,
        threshold, gateThreshold, loopStart, loopEnd, mousePos, hoverLine,
        isDraggingLineRef, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
        isGateBypass, isCompBypass, visualResult, visualSourceCache, fullAudioDataRef,
        playBufferRef, startTimeRef, startOffsetRef, isPlayingRef, rafIdRef,
        waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, cfMeterCanvasRef,
        playheadRef, meterStateRef, hoverGrRef, canvasDims, zoomX, zoomY, panOffset, panOffsetY,
        playingTypeRef, lastPlayedTypeRef, signalFlowMode
    });

    // Update animateRef with the actual animate function
    useEffect(() => { animateRef.current = animate; }, [animate]);

    useEffect(() => {
        if (playingType !== 'none') {
            rafIdRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(rafIdRef.current);
    }, [playingType, animate]);

    useEffect(() => { playBufferRef.current = playBuffer; }, [playBuffer]);

    // --- 15. Utility Functions ---
    const resetAllParams = useCallback(() => {
        applyPreset(0);
        setPanOffsetY(0);
        setZoomY(0.8);
        setPanOffset(0);
        setZoomX(1);
        setLoopStart(null);
        setLoopEnd(null);
        gainAdjustedRef.current = false;
        setHasThresholdBeenAdjusted(true);
        setHasGateBeenAdjusted(false);
        setIsDeltaMode(false);
        setIsGateBypass(true);
        setIsCompBypass(false);
    }, [applyPreset]);

    const resetView = useCallback(() => {
        setPanOffsetY(0);
        setZoomY(0.8);
        setPanOffset(0);
        setZoomX(1);
    }, []);

    const toggleDeltaMode = (e) => {
        e.stopPropagation();
        if (lastPlayedType === 'original') return;
        setIsDeltaMode(prev => !prev);
    };

    const handleDownload = () => {
        if (currentSourceId !== 'upload' || !originalBuffer || !audioContext) return;
        setIsLoading(true);
        setTimeout(() => {
            try {
                const inputData = originalBuffer.getChannelData(0);
                const res = processCompressor(inputData, audioContext.sampleRate, currentParams, 1);
                const dryLinear = Math.pow(10, dryGain / 20);
                const mixedData = new Float32Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) mixedData[i] = res.outputData[i] + (inputData[i] * dryLinear);
                const exportBuffer = audioContext.createBuffer(1, inputData.length, originalBuffer.sampleRate);
                exportBuffer.copyToChannel(mixedData, 0);
                const url = URL.createObjectURL(writeWavFile(exportBuffer));
                const dlName = `${fileName.substring(0, fileName.lastIndexOf('.')) || fileName} 壓縮後結果.wav`;
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = dlName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            } catch (e) {
                console.error(e);
                setErrorMsg("匯出失敗");
            } finally {
                setIsLoading(false);
            }
        }, 50);
    };

    const handleCopyDebug = async () => {
        setCopyStatus('copying');
        try {
            const currentParams = getCurrentStateSnapshot();
            const actionTrace = actionLogRef.current || [];
            const appState = {
                fileName, currentSourceId, playingType,
                isPlaying: isPlayingRef.current, resolutionPct, canvasDims
            };
            const report = await generateDebugReport({
                audioContext, originalBuffer, currentParams, actionLog: actionTrace,
                waveformCanvas: waveformCanvasRef.current, appVersion: APP_VERSION, appState
            });
            const success = await copyToClipboard(report);
            if (success) {
                setCopyStatus('success');
                setTimeout(() => setCopyStatus('idle'), 2000);
            } else {
                throw new Error("Copy failed");
            }
        } catch (e) {
            console.error('Dump State Failed:', e);
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 3000);
        }
    };

    const getInfoPanelContent = () => {
        if (hoveredKnob && TOOLTIPS[hoveredKnob]) return {
            title: TOOLTIPS[hoveredKnob].title,
            content: (<><div className="mb-3 text-slate-300 font-medium">{TOOLTIPS[hoveredKnob].desc}</div><div className="text-yellow-400 font-bold mb-1.5 text-xs uppercase tracking-wide">💡 調整效果</div><div className="text-slate-400 text-sm leading-relaxed mb-3">{TOOLTIPS[hoveredKnob].setting}</div><div className="text-cyan-400 font-bold mb-1.5 text-xs uppercase tracking-wide">⚙️ 常用參數參考</div><div className="text-slate-300 text-sm font-mono bg-black/30 p-2 rounded border border-white/10">{TOOLTIPS[hoveredKnob].common}</div></>)
        };
        if (!isCustomSettings && selectedPresetIdx !== 0 && PRESETS_DATA[selectedPresetIdx]) return {
            title: `設定思路: ${PRESETS_DATA[selectedPresetIdx].name.split('(')[0]}`,
            content: PRESETS_DATA[selectedPresetIdx].explanation
        };
        return null;
    };
    const activeInfo = getInfoPanelContent();

    useEffect(() => {
        const h = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlayback();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [togglePlayback]);

    // --- 16. Render ---
    if (!audioContext) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">⏳ Initializing Audio Context...</h1>
                    <p className="text-xl">Please wait...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden p-4 relative">
            <Header
                fileName={fileName}
                resolutionPct={resolutionPct}
                setResolutionPct={setResolutionPct}
                currentSourceId={currentSourceId}
                lastPracticeSourceId={lastPracticeSourceId}
                handleFileUpload={handleFileUpload}
                restoreUserUpload={restoreUserUpload}
                clearUserUpload={() => switchToPractice()}
                switchToPractice={() => switchToPractice(currentSourceId, saveSessionState)}
                handleFactoryReset={softReset}
                stopAudio={() => {
                    if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
                    setPlayingType('none');
                    isPlayingRef.current = false;
                }}
                userBufferRef={userBufferRef}
                userFileNameRef={userFileNameRef}
                handleDownload={handleDownload}
                isLoading={isLoading}
                loadPreset={loadPreset}
                isInfoPanelEnabled={isInfoPanelEnabled}
                setIsInfoPanelEnabled={setIsInfoPanelEnabled}
                fileInputRef={fileInputRef}
                resetAllParams={resetAllParams}
                selectedPresetIdx={selectedPresetIdx}
                isCustomSettings={isCustomSettings}
                applyPreset={applyPreset}
            />

            <div className="flex-1 flex min-h-0 gap-4 relative">
                <Waveform
                    canvasRef={waveformCanvasRef}
                    containerRef={containerRef}
                    playheadRef={playheadRef}
                    onMouseDown={handleWaveformMouseDown}
                    onMouseMove={handleLocalMouseMove}
                    onMouseLeave={handleLocalMouseMove}
                >
                    <SignalFlow mode={signalFlowMode} setMode={setSignalFlowMode} />

                    {hoveredKnob && activeInfo && isInfoPanelEnabled ? (
                        <div className="absolute bottom-44 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col w-64 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none"
                            style={{
                                left: Math.max(10, Math.min(canvasDims.width - 270, hoveredKnobPos.x - containerRef.current?.getBoundingClientRect().left - 128))
                            }}>
                            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2 text-lg"><Info size={20} /> {activeInfo.title}</div>
                            <div className="text-sm text-slate-200 leading-relaxed font-medium">{activeInfo.content}</div>
                        </div>
                    ) : (isInfoPanelEnabled && PRESETS_DATA[selectedPresetIdx]) ? (
                        <div className="absolute top-4 right-4 z-30 bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col w-72 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
                            <div className="flex items-center gap-2 text-green-400 font-bold mb-2 text-base border-b border-white/10 pb-2">
                                <Info size={18} />{PRESETS_DATA[selectedPresetIdx].name.split(' (')[0]}
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                {PRESETS_DATA[selectedPresetIdx].explanation}
                            </div>
                        </div>
                    ) : null}

                    {signalFlowMode !== 'clip' && <DraggableLegend />}

                    {signalFlowMode === 'clip' && (
                        <ClipGainOverlay
                            gainDB={clipGain}
                            setGainDB={setClipGain}
                            containerHeight={canvasDims.height}
                            panOffsetY={panOffsetY}
                            zoomY={zoomY}
                        />
                    )}

                    <div className="absolute bottom-44 right-4 z-40 flex flex-col gap-2 items-end">
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setIsInfoPanelEnabled(!isInfoPanelEnabled); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all shadow-lg border backdrop-blur-md ${isInfoPanelEnabled ? 'bg-green-500 text-white border-green-400 shadow-green-500/30 hover:bg-green-400' : 'bg-slate-800/80 text-slate-400 border-white/10 hover:bg-slate-700 hover:text-white'}`}
                        >
                            {isInfoPanelEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} 彈出說明視窗
                        </button>
                    </div>
                    <DraggableViewControls
                        zoomX={zoomX}
                        setZoomX={(z) => {
                            setZoomX(z);
                            if (waveformCanvasRef.current && originalBuffer) {
                                const w = canvasDims.width;
                                const cr = cuePoint / originalBuffer.duration;
                                let nP = (w / 3) - (cr * w * z);
                                const mP = w - (w * z);
                                if (nP > 0) nP = 0;
                                if (nP < mP) nP = mP;
                                setPanOffset(nP);
                            }
                        }}
                        zoomY={zoomY}
                        setZoomY={setZoomY}
                        onReset={resetView}
                        containerHeight={canvasDims.height}
                        loopStart={loopStart}
                        loopEnd={loopEnd}
                        panOffset={panOffset}
                        setPanOffset={setPanOffset}
                        originalBuffer={originalBuffer}
                        canvasDims={canvasDims}
                    />

                    {loopStart !== null && loopEnd !== null && originalBuffer && (
                        <div
                            className="absolute top-0 flex items-center justify-center bg-green-500/90 text-white hover:bg-green-400 cursor-pointer shadow-lg z-30 transition-colors"
                            style={{
                                left: `calc(${((loopEnd / originalBuffer.duration) * zoomX * 100) + ((panOffset / canvasDims.width) * 100)}% - 24px)`,
                                width: '24px', height: '24px', borderRadius: '0 0 0 6px', fontSize: '14px', fontWeight: 'bold'
                            }}
                            onClick={(e) => { e.stopPropagation(); handleLoopClear(); }}
                            title="Clear Loop"
                        >×</div>
                    )}
                </Waveform>

                <Meters
                    grCanvasRef={grBarCanvasRef}
                    outputCanvasRef={outputMeterCanvasRef}
                    cfMeterCanvasRef={cfMeterCanvasRef}
                    height={canvasDims.height}
                />
            </div>

            <ControlHud
                signalFlowMode={signalFlowMode}
                gateThreshold={gateThreshold}
                gateRatio={gateRatio}
                gateAttack={gateAttack}
                gateRelease={gateRelease}
                handleGateThresholdChange={(v) => { updateParamGeneric(setGateThreshold, v, 'GateThreshold'); if (!hasGateBeenAdjusted) setHasGateBeenAdjusted(true); }}
                updateParam={updateGateParam}
                handleGateDragState={(isActive) => { setIsKnobDragging(isActive); setIsGateAdjusting(isActive); }}
                hasGateBeenAdjusted={hasGateBeenAdjusted}
                isGateBypass={isGateBypass}
                setIsGateBypass={(v) => { setIsGateBypass(v); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }}
                threshold={threshold}
                ratio={ratio}
                ratioControl={ratioControl}
                attack={attack}
                release={release}
                knee={knee}
                lookahead={lookahead}
                handleThresholdChange={(v) => { updateParamGeneric(setThreshold, v, 'CompThreshold'); setHasThresholdBeenAdjusted(true); }}
                updateRatio={(v) => { setRatioControl(v); setRatio(calculateRatioFromControl(v)); logAction(`SET_RATIO: ${calculateRatioFromControl(v).toFixed(1)}`); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }}
                handleCompKnobChange={handleCompKnobChange}
                handleCompDragState={(isActive) => { setIsKnobDragging(isActive); setIsCompAdjusting(isActive); }}
                hasThresholdBeenAdjusted={hasThresholdBeenAdjusted}
                isCompBypass={isCompBypass}
                setIsCompBypass={(v) => { setIsCompBypass(v); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }}
                makeupGain={makeupGain}
                dryGain={dryGain}
                handleGainChange={handleGainChange}
                playingType={playingType}
                lastPlayedType={lastPlayedType}
                isDryMode={isDryMode}
                isDeltaMode={isDeltaMode}
                handleModeChange={handleModeChange}
                toggleDeltaMode={toggleDeltaMode}
                togglePlayback={togglePlayback}
                selectedPresetIdx={selectedPresetIdx}
                isCustomSettings={isCustomSettings}
                applyPreset={applyPreset}
                isDraggingKnobRef={isDraggingKnobRef}
                handleNormalDragState={setIsKnobDragging}
                handleKnobEnter={(k, e) => {
                    setHoveredKnob(k);
                    if (e) setHoveredKnobPos({ x: e.clientX, y: e.clientY });
                    setShowInfoPanel(true);
                }}
                handleKnobLeave={() => setHoveredKnob(null)}
                resetAllParams={resetAllParams}
            />

            {isLoading && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-slate-800 p-4 rounded text-white flex items-center gap-2"><Gauge className="animate-spin" /> Loading...</div></div>}
            {errorMsg && <div className="fixed top-4 right-4 bg-red-900/90 text-white p-4 rounded shadow-xl border border-red-500 max-w-sm z-50">{errorMsg}</div>}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-900 border-t border-white/10 flex items-center justify-center z-50">
                <button onClick={handleCopyDebug} className="text-[10px] text-slate-500 hover:text-cyan-400 font-mono tracking-widest uppercase transition-colors px-4 py-1 hover:bg-white/5 rounded">
                    {copyStatus === 'idle' && '[ copy all program setting ]'}
                    {copyStatus === 'copying' && '[ generating... ]'}
                    {copyStatus === 'success' && '[ ✅ copied to clipboard ]'}
                    {copyStatus === 'error' && '[ ❌ copy failed ]'}
                </button>
            </div>
        </div>
    );
};

export default App;
