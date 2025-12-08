import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Gauge, Info, ToggleLeft, ToggleRight } from 'lucide-react';

// --- Imports from Refactored Structure ---
import { PRESETS_DATA, AUDIO_SOURCES, TOOLTIPS, APP_VERSION } from './utils/constants';
import { processCompressor } from './utils/dsp';
import { writeWavFile } from './utils/audioHelper';
import {
    saveParamsToStorage, loadParamsFromStorage,
    saveAppStateToStorage, loadAppStateFromStorage,
    saveAudioFileToDB, loadAudioFileFromDB,
    factoryReset, softReset
} from './utils/storage';

import Header from './components/layout/Header';
import ControlHud from './components/layout/ControlHud';
import Waveform from './components/visualizer/Waveform';
import Meters from './components/visualizer/Meters';
import { DraggableViewControls, DraggableInfoPanel, DraggableLegend } from './components/ui/Draggables';
import SignalFlow from './components/ui/SignalFlow';
import useVisualizerLoop from './hooks/useVisualizerLoop';

const App = () => {
    // --- 1. 狀態管理 (State Management) ---
    const [isLoading, setIsLoading] = useState(false);
    const [audioContext, setAudioContext] = useState(null);
    const [originalBuffer, setOriginalBuffer] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [copyStatus, setCopyStatus] = useState('idle'); // idle, copying, success, error
    const [currentSourceId, setCurrentSourceId] = useState(null);
    const [lastPracticeSourceId, setLastPracticeSourceId] = useState('Lead-Vocal-03');
    const [fileName, setFileName] = useState('');
    const [resolutionPct, setResolutionPct] = useState(100);

    // Persistent User Upload
    const userBufferRef = useRef(null);
    const userFileNameRef = useRef("");

    // Dual Mode Session State
    const practiceSessionRef = useRef(null);
    const uploadSessionRef = useRef(null);

    // Params
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

    // Bypass State
    const [isGateBypass, setIsGateBypass] = useState(true);
    const [isCompBypass, setIsCompBypass] = useState(false);

    // Playback & View
    const [playingType, setPlayingType] = useState('none');
    const [lastPlayedType, setLastPlayedType] = useState('original');

    // Refs for Event Listeners (Prevent Stale Closures)
    const playingTypeRef = useRef(playingType);
    const lastPlayedTypeRef = useRef(lastPlayedType);
    useEffect(() => { playingTypeRef.current = playingType; }, [playingType]);
    useEffect(() => { lastPlayedTypeRef.current = lastPlayedType; }, [lastPlayedType]);

    const isDryMode = lastPlayedType === 'original';
    const [isDeltaMode, setIsDeltaMode] = useState(false);
    const [zoomX, setZoomX] = useState(1);
    const [zoomY, setZoomY] = useState(0.8);
    const [panOffset, setPanOffset] = useState(0);
    const [panOffsetY, setPanOffsetY] = useState(0);
    const [cuePoint, setCuePoint] = useState(0);

    // Resolution Control


    // UI
    const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
    const [isCustomSettings, setIsCustomSettings] = useState(false);
    const [hoveredKnob, setHoveredKnob] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(true);
    const [isInfoPanelEnabled, setIsInfoPanelEnabled] = useState(true); // Default ON
    const [hoveredKnobPos, setHoveredKnobPos] = useState({ x: 0, y: 0 });

    // Interaction State
    const [isKnobDragging, setIsKnobDragging] = useState(false);
    const [isCompAdjusting, setIsCompAdjusting] = useState(false);
    const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(true);
    const [isGateAdjusting, setIsGateAdjusting] = useState(false);
    const [hasGateBeenAdjusted, setHasGateBeenAdjusted] = useState(false);

    // Refs for drag/hover (Performance optimization)
    const isDraggingKnobRef = useRef(false);
    const gainAdjustedRef = useRef(false);
    const hoverGrRef = useRef(0);
    const [hoverLine, setHoverLine] = useState(null); // 'comp' | 'gate' | null
    const isDraggingLineRef = useRef(null);
    const isCreatingLoopRef = useRef(false);

    // Loop State
    const [loopStart, setLoopStart] = useState(null);
    const [loopEnd, setLoopEnd] = useState(null);

    // Refs & Canvas
    const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
    const [canvasDims, setCanvasDims] = useState({ width: 1000, height: 400 });
    const containerRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const drySourceNodeRef = useRef(null);
    const dryGainNodeRef = useRef(null);
    const startTimeRef = useRef(0);
    const startOffsetRef = useRef(0);

    const waveformCanvasRef = useRef(null);
    const grBarCanvasRef = useRef(null);
    const outputMeterCanvasRef = useRef(null);
    const playheadRef = useRef(null);
    const rafIdRef = useRef(null);
    const fileInputRef = useRef(null);
    const playBufferRef = useRef(null);

    // Meter State (Mutable for performance)
    const meterStateRef = useRef({
        peakLevel: 0, holdPeakLevel: 0, holdTimer: 0,
        dryPeakLevel: 0, dryHoldPeakLevel: 0, dryHoldTimer: 0,
        grPeakLevel: 0, grHoldPeakLevel: 0, grHoldTimer: 0,
        dryRmsLevel: 0, outRmsLevel: 0
    });

    // Viewport Dragging Refs
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);

    const [visualSourceCache, setVisualSourceCache] = useState({ data: null, step: 1 });
    const [fullAudioData, setFullAudioData] = useState(null);
    const fullAudioDataRef = useRef(null);
    const processingTaskRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const isPlayingRef = useRef(false);
    const [signalFlowMode, setSignalFlowMode] = useState('comp1');

    // --- Action Trace Log ---
    const actionLogRef = useRef([]);
    const logAction = useCallback((action) => {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        actionLogRef.current.push(`[${timestamp}] ${action}`);
        if (actionLogRef.current.length > 15) actionLogRef.current.shift();
    }, []);

    // --- 2. 初始化與 Effect (Init & Effects) ---

    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        setRatioControl(calculateControlFromRatio(4));

        // --- Persistence: Load Settings ---
        const savedParams = loadParamsFromStorage();
        if (savedParams) {
            setThreshold(savedParams.threshold); setRatio(savedParams.ratio); setRatioControl(calculateControlFromRatio(savedParams.ratio));
            setAttack(savedParams.attack); setRelease(savedParams.release); setKnee(savedParams.knee); setLookahead(savedParams.lookahead);
            setMakeupGain(savedParams.makeupGain); setDryGain(savedParams.dryGain);
            setGateThreshold(savedParams.gateThreshold); setGateRatio(savedParams.gateRatio);
            setGateAttack(savedParams.gateAttack); setGateRelease(savedParams.gateRelease);
            setIsGateBypass(savedParams.isGateBypass); setIsCompBypass(savedParams.isCompBypass);
        }

        // --- Persistence: Load App State (Source, Resolution, View, Mode) ---
        const savedState = loadAppStateFromStorage();
        if (savedState) {
            setResolutionPct(savedState.resolutionPct);
            if (savedState.zoomX) setZoomX(savedState.zoomX);
            if (savedState.zoomY) setZoomY(savedState.zoomY);
            if (savedState.panOffset) setPanOffset(savedState.panOffset);
            if (savedState.panOffsetY) setPanOffsetY(savedState.panOffsetY);
            if (savedState.loopStart !== undefined) setLoopStart(savedState.loopStart);
            if (savedState.loopEnd !== undefined) setLoopEnd(savedState.loopEnd);
            if (savedState.lastPlayedType) setLastPlayedType(savedState.lastPlayedType);

            if (savedState.currentSourceId) {
                // If it was 'upload', we need to check IndexedDB
                if (savedState.currentSourceId === 'upload') {
                    // We will handle the async DB load in a separate effect or here below
                    // For simplicity, let's trigger it here
                    setCurrentSourceId('upload');
                } else {
                    const source = AUDIO_SOURCES.find(s => s.id === savedState.currentSourceId);
                    if (source) {
                        setCurrentSourceId(source.id);
                        setFileName(source.name);
                        // We need to fetch this source... but loadPreset resets everything.
                        // We need a way to load audio WITHOUT resetting params.
                        // Implementation detail: we will use a dedicated effect to load audio when audioContext is ready & sourceID changes initially.
                    }
                }
            }
        }

        return () => { ctx.close(); cancelAnimationFrame(rafIdRef.current); if (processingTaskRef.current) clearTimeout(processingTaskRef.current); }
    }, []);

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

    // Sync Delta Mode
    useEffect(() => {
        if (playingType === 'none' || lastPlayedType === 'original' || !fullAudioDataRef.current) return;
        const targetBuffer = isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer;
        if (targetBuffer && audioContext) {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            const currentPos = startOffsetRef.current + elapsed;
            playBufferRef.current(targetBuffer, 'processed', currentPos);
        }
    }, [isDeltaMode, playingType, lastPlayedType, fullAudioDataRef, audioContext]);

    // Sync Dry Gain
    useEffect(() => {
        if (dryGainNodeRef.current && audioContext) {
            dryGainNodeRef.current.gain.setTargetAtTime(Math.pow(10, dryGain / 20), audioContext.currentTime, 0.01);
        }
    }, [dryGain, audioContext]);

    // Sync Cue Marker
    // Removed cue marker logic

    // --- 3. 輔助邏輯 (Helpers) ---

    const calculateRatioFromControl = (ctrl) => ctrl <= 50 ? 1 + (ctrl / 50) * 4 : (ctrl <= 75 ? 5 + ((ctrl - 50) / 25) * 5 : 10 + ((ctrl - 75) / 25) * 90);
    const calculateControlFromRatio = (r) => r <= 5 ? (r - 1) / 4 * 50 : (r <= 10 ? 50 + (r - 5) / 5 * 25 : 75 + (r - 10) / 90 * 25);

    const currentParams = useMemo(() => ({
        threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease,
        isGateBypass, isCompBypass, dryGain, isDeltaMode
    }), [threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold,
        gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass, dryGain, isDeltaMode]);

    // Ref to hold latest params for real-time processor
    const paramsRef = useRef(currentParams);
    useEffect(() => { paramsRef.current = currentParams; }, [currentParams]);

    // --- Persistence: Auto-Save Params ---
    useEffect(() => {
        const timer = setTimeout(() => {
            saveParamsToStorage({
                threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
                gateThreshold, gateRatio, gateAttack, gateRelease,
                isGateBypass, isCompBypass
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass]);

    // --- Persistence: Auto-Save App State ---
    useEffect(() => {
        const timer = setTimeout(() => {
            saveAppStateToStorage({
                resolutionPct,
                currentSourceId,
                zoomX, zoomY, panOffset, panOffsetY,
                loopStart, loopEnd,
                lastPlayedType
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [resolutionPct, currentSourceId, zoomX, zoomY, panOffset, panOffsetY, loopStart, loopEnd, lastPlayedType]);

    // --- Persistence: Audio Restoration on Mount ---
    // We need a ref to track if we have already attempted initial load to prevent loop
    const hasInitialLoadRun = useRef(false);

    useEffect(() => {
        if (!audioContext || hasInitialLoadRun.current) return;

        const loadInitialAudio = async () => {
            const savedState = loadAppStateFromStorage();
            // If currentSourceId was set by hydration above
            if (currentSourceId === 'upload') {
                // Try load from DB
                try {
                    const record = await loadAudioFileFromDB();
                    if (record && record.file) {
                        const ab = await record.file.arrayBuffer();
                        const decoded = await audioContext.decodeAudioData(ab);
                        userBufferRef.current = decoded;
                        userFileNameRef.current = record.name;
                        setFileName(record.name);
                        handleDecodedBuffer(decoded);
                        // Re-apply loop for upload just in case
                        if (savedState) {
                            if (savedState.loopStart !== undefined) setLoopStart(savedState.loopStart);
                            if (savedState.loopEnd !== undefined) setLoopEnd(savedState.loopEnd);
                        }
                    } else {
                        // Fallback if DB empty
                        setCurrentSourceId(null);
                    }
                } catch (e) {
                    console.error("Failed to restore upload", e);
                }
            } else if (currentSourceId) {
                // Load from network
                const source = AUDIO_SOURCES.find(s => s.id === currentSourceId);
                if (source) {
                    await loadAudioOnly(source);
                    // Re-apply settings that loadAudioOnly resets
                    if (savedState) {
                        if (savedState.loopStart !== undefined) setLoopStart(savedState.loopStart);
                        if (savedState.loopEnd !== undefined) setLoopEnd(savedState.loopEnd);
                        if (savedState.zoomX) setZoomX(savedState.zoomX);
                        if (savedState.zoomY) setZoomY(savedState.zoomY);
                        if (savedState.panOffset) setPanOffset(savedState.panOffset);
                        if (savedState.panOffsetY) setPanOffsetY(savedState.panOffsetY);
                    }
                }
            }
            hasInitialLoadRun.current = true;
        };

        // If we have a sourceId from storage, run load
        if (currentSourceId) {
            loadInitialAudio();
        } else {
            // No stored source, leave empty or load default? User didn't ask for default load unless previously set.
            // Actually, the original app requires user to click or load. 
            // But if we want to restore "exact state", we should.
            hasInitialLoadRun.current = true;
        }

    }, [audioContext, currentSourceId]);

    // --- 4. 數據處理 (Data Processing) ---

    // Downsampling for Visuals
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

    // Visual Result Memo
    const visualResult = useMemo(() => {
        if (!visualSourceCache.data || !audioContext) return null;
        return processCompressor(visualSourceCache.data, audioContext.sampleRate, currentParams, visualSourceCache.step);
    }, [visualSourceCache, audioContext, currentParams]);

    // Full Audio Processing (Async Chunking)
    useEffect(() => {
        if (!originalBuffer || !audioContext) return;
        fullAudioDataRef.current = null;
        if (processingTaskRef.current) clearTimeout(processingTaskRef.current);

        const inputData = originalBuffer.getChannelData(0);
        const sampleRate = originalBuffer.sampleRate;
        const length = inputData.length;

        // Create local copies of params to avoid closure issues during async
        const params = currentParams;
        const CHUNK_SIZE = 50000;
        let currentIndex = 0;
        const outData = new Float32Array(length);

        // Prepare coefficients (Duplicate logic from DSP to avoid re-calculation every sample, keeping it optimized here)
        const makeUpLinear = Math.pow(10, params.makeupGain / 20);
        const effectiveSampleRate = sampleRate; // Step is 1
        const attTime = (params.attack / 1000) * effectiveSampleRate;
        const relTime = (params.release / 1000) * effectiveSampleRate;
        const gAttTime = (params.gateAttack / 1000) * effectiveSampleRate;
        const gRelTime = (params.gateRelease / 1000) * effectiveSampleRate;
        const compAttCoeff = 1 - Math.exp(-1 / attTime);
        const compRelCoeff = 1 - Math.exp(-1 / relTime);
        const gateAttCoeff = 1 - Math.exp(-1 / gAttTime);
        const gateRelCoeff = 1 - Math.exp(-1 / gRelTime);
        const lookaheadSamples = Math.floor(((params.lookahead / 1000) * effectiveSampleRate));

        let compEnvelope = 0;
        let gateEnvelope = 0;

        const processChunk = () => {
            const endIndex = Math.min(currentIndex + CHUNK_SIZE, length);
            for (let i = currentIndex; i < endIndex; i++) {
                let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
                const inputLevel = Math.abs(inputData[detectorIndex]);
                const currentInput = inputData[i];

                // Inline DSP logic for maximum performance in this loop
                if (!params.isGateBypass) {
                    if (inputLevel > gateEnvelope) gateEnvelope += gateAttCoeff * (inputLevel - gateEnvelope);
                    else gateEnvelope += gateRelCoeff * (inputLevel - gateEnvelope);
                }

                let gateGaindB = 0;
                if (!params.isGateBypass) {
                    let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
                    if (gateEnvdB < params.gateThreshold) gateGaindB = -(params.gateThreshold - gateEnvdB) * (params.gateRatio - 1);
                }
                const gateGainLinear = Math.pow(10, gateGaindB / 20);
                const gatedDetectorLevel = inputLevel * gateGainLinear;

                if (!params.isCompBypass) {
                    if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
                    else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);
                }

                let compEnvdB = 20 * Math.log10(compEnvelope + 1e-6);
                let compGainReductiondB = 0;
                if (!params.isCompBypass) {
                    if (compEnvdB > params.threshold - params.knee / 2) {
                        if (params.knee > 0 && compEnvdB < params.threshold + params.knee / 2) {
                            let slope = 1 - (1 / params.ratio);
                            let over = compEnvdB - (params.threshold - params.knee / 2);
                            compGainReductiondB = -slope * ((over * over) / (2 * params.knee));
                        } else if (compEnvdB >= params.threshold + params.knee / 2) {
                            compGainReductiondB = (params.threshold - compEnvdB) * (1 - 1 / params.ratio);
                        }
                    }
                }
                const compGainLinear = Math.pow(10, compGainReductiondB / 20);
                outData[i] = currentInput * gateGainLinear * compGainLinear * makeUpLinear;
            }
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
                // Fix: Do NOT restart playback if we are already in 'processed' mode.
                // The ScriptProcessorNode uses paramsRef.current to update in real-time.
                // Restarting causes playhead jumps and loop desync.
                // Only if we switch modes or load new audio should we restart.
                // if (playingType === 'processed' && sourceNodeRef.current && playBufferRef.current) {
                //      const elapsed = audioContext.currentTime - startTimeRef.current;
                //      const currentPos = startOffsetRef.current + elapsed;
                //      playBufferRef.current(isDeltaMode ? deltaBuf : outBuf, 'processed', currentPos);
                // }
            }
        };
        processingTaskRef.current = setTimeout(processChunk, 150);
    }, [originalBuffer, audioContext, currentParams, playingType, isDeltaMode]);

    // --- 5. 動畫迴圈 (Animation Loop) ---

    // Use Custom Hook for Visualization Loop
    const animate = useVisualizerLoop({
        audioContext, originalBuffer, playingType, lastPlayedType, isDeltaMode, dryGain,
        threshold, gateThreshold, loopStart, loopEnd, mousePos, hoverLine,
        isDraggingLineRef, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted,
        isGateBypass, isCompBypass, visualResult, visualSourceCache, fullAudioDataRef,
        playBufferRef, startTimeRef, startOffsetRef, isPlayingRef, rafIdRef,
        waveformCanvasRef, grBarCanvasRef, outputMeterCanvasRef, playheadRef,
        meterStateRef, hoverGrRef, canvasDims, zoomX, zoomY, panOffset, panOffsetY,
        playingTypeRef, lastPlayedTypeRef
    });

    useEffect(() => {
        if (playingType !== 'none') {
            rafIdRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(rafIdRef.current);
    }, [playingType, animate]);

    // --- 6. 播放與操作邏輯 (Handlers) ---

    const playBuffer = useCallback((buffer, type, offset) => {
        if (!audioContext || !buffer) return;
        if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch (e) { } }
        if (drySourceNodeRef.current) { try { drySourceNodeRef.current.stop(); drySourceNodeRef.current.disconnect(); } catch (e) { } }
        // Clean up previous script node if any (though we usually attach it to sourceNodeRef for tracking, we might need a separate ref or just rely on sourceNodeRef being the source)
        // Actually, for real-time, sourceNodeRef will be the BufferSource, and we need to track the ScriptProcessor too to disconnect it.
        // Let's attach the script node to a ref or property of sourceNodeRef if possible, or just use a new ref.
        // For simplicity, let's assume sourceNodeRef tracks the source. We also need to disconnect the script node.
        // Ideally we should have a scriptNodeRef.

        const runPlayback = async () => {
            try {
                if (audioContext.state !== 'running') {
                    await audioContext.resume();
                    console.log("AudioContext resumed.");
                }
                startSource();
            } catch (err) {
                console.error("Playback failed:", err);
                setErrorMsg("Playback Error: " + err.message);
                isPlayingRef.current = false;
                setPlayingType('none');
            }
        };

        runPlayback();

        function startSource() {
            try {
                isPlayingRef.current = true;
                let safeOffset = offset; if (safeOffset >= buffer.duration) safeOffset = 0;
                startTimeRef.current = audioContext.currentTime; startOffsetRef.current = safeOffset;
                console.log(`Starting playback of type '${type}' at offset ${safeOffset.toFixed(2)}s`);

                // Create Source
                const source = audioContext.createBufferSource();

                // Determine which buffer to use
                let targetBuffer = buffer;
                if (type === 'processed') {
                    // Real-time Processing: Always use original buffer to avoid double-compression
                    targetBuffer = originalBuffer;
                }
                source.buffer = targetBuffer;

                if (type === 'processed') {



                    const bufferSize = 512;
                    const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

                    // DSP State for this playback session
                    let compEnvelope = 0;
                    let gateEnvelope = 0;
                    const sampleRate = audioContext.sampleRate;

                    scriptNode.onaudioprocess = (audioProcessingEvent) => {
                        const inputBuffer = audioProcessingEvent.inputBuffer;
                        const outputBuffer = audioProcessingEvent.outputBuffer;
                        const inputData = inputBuffer.getChannelData(0);
                        const outputData = outputBuffer.getChannelData(0);

                        const params = paramsRef.current; // Get latest params

                        // Coefficients
                        const makeUpLinear = Math.pow(10, params.makeupGain / 20);
                        const attTime = (params.attack / 1000) * sampleRate;
                        const relTime = (params.release / 1000) * sampleRate;
                        const gAttTime = (params.gateAttack / 1000) * sampleRate;
                        const gRelTime = (params.gateRelease / 1000) * sampleRate;
                        const compAttCoeff = 1 - Math.exp(-1 / attTime);
                        const compRelCoeff = 1 - Math.exp(-1 / relTime);
                        const gateAttCoeff = 1 - Math.exp(-1 / gAttTime);
                        const gateRelCoeff = 1 - Math.exp(-1 / gRelTime);
                        const lookaheadSamples = Math.floor(((params.lookahead / 1000) * sampleRate));

                        // Note: Lookahead in real-time requires buffering/delay.
                        // For simple ScriptProcessor without significant latency compensation, lookahead is hard.
                        // We will ignore lookahead for real-time preview or implement a simple delay line if needed.
                        // For now, let's skip lookahead in real-time preview to keep it simple and instant.

                        for (let i = 0; i < inputBuffer.length; i++) {
                            const inputSample = inputData[i];
                            const inputLevel = Math.abs(inputSample);

                            // Gate
                            if (!params.isGateBypass) {
                                if (inputLevel > gateEnvelope) gateEnvelope += gateAttCoeff * (inputLevel - gateEnvelope);
                                else gateEnvelope += gateRelCoeff * (inputLevel - gateEnvelope);
                            }

                            let gateGaindB = 0;
                            if (!params.isGateBypass) {
                                let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
                                if (gateEnvdB < params.gateThreshold) gateGaindB = -(params.gateThreshold - gateEnvdB) * (params.gateRatio - 1);
                            }
                            const gateGainLinear = Math.pow(10, gateGaindB / 20);
                            const gatedDetectorLevel = inputLevel * gateGainLinear;

                            // Compressor
                            if (!params.isCompBypass) {
                                if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
                                else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);
                            }

                            let compEnvdB = 20 * Math.log10(compEnvelope + 1e-6);
                            let compGainReductiondB = 0;
                            if (!params.isCompBypass) {
                                if (compEnvdB > params.threshold - params.knee / 2) {
                                    if (params.knee > 0 && compEnvdB < params.threshold + params.knee / 2) {
                                        let slope = 1 - (1 / params.ratio);
                                        let over = compEnvdB - (params.threshold - params.knee / 2);
                                        compGainReductiondB = -slope * ((over * over) / (2 * params.knee));
                                    } else if (compEnvdB >= params.threshold + params.knee / 2) {
                                        compGainReductiondB = (params.threshold - compEnvdB) * (1 - 1 / params.ratio);
                                    }
                                }
                            }
                            const compGainLinear = Math.pow(10, compGainReductiondB / 20);


                            const wet = inputSample * gateGainLinear * compGainLinear * makeUpLinear;

                            // Output Mixing (Syncs Dry/Wet perfectly)
                            if (params.isDeltaMode) {
                                outputData[i] = wet - inputSample;
                            } else {
                                const dryLinear = Math.pow(10, params.dryGain / 20);
                                outputData[i] = wet + (inputSample * dryLinear);
                            }
                        }
                    };

                    source.connect(scriptNode);
                    scriptNode.connect(audioContext.destination);

                    // We need to keep track of scriptNode to disconnect it later
                    // Hack: attach it to source node object for cleanup
                    source._scriptNode = scriptNode;

                } else {
                    // Original Mode
                    source.connect(audioContext.destination);
                }

                if (loopStart !== null && loopEnd !== null) {
                    source.loop = true;
                    source.loopStart = loopStart;
                    source.loopEnd = loopEnd;
                }

                sourceNodeRef.current = source;
                source.start(0, safeOffset);

                // Dry Signal (for Parallel Comp or just reference? The original code had dry signal logic)
                // If we are in 'processed' mode, we might want dry signal mixed in?
                // Wait, the previous logic had a separate drySourceNode.
                // If we are doing real-time processing, we can mix dry signal in the script processor OR run a parallel source.
                // Running a parallel source is easier for timing if we don't have heavy latency.
                // Let's keep the parallel dry source logic.
                // Dry Signal Handling:
                // Now handled inside ScriptProcessor for perfect sync.
                // Parallel Dry Source removed to prevent "flamming" and async issues.

                setPlayingType(type); setLastPlayedType(type);
                cancelAnimationFrame(rafIdRef.current); rafIdRef.current = requestAnimationFrame(animate);

            } catch (e) {
                console.error("BS/Script creation error", e);
                setPlayingType('none');
                isPlayingRef.current = false;
                setErrorMsg("Audio processing setup failed: " + e.message);
            }
        }

    }, [audioContext, animate, originalBuffer, dryGain, isDeltaMode, setErrorMsg, loopStart, loopEnd]);

    useEffect(() => { playBufferRef.current = playBuffer; }, [playBuffer]);

    const togglePlayback = useCallback(() => {
        logAction(`TOGGLE_PLAY: ${playingType !== 'none' ? 'STOP' : 'START'}`);
        if (!originalBuffer) return;
        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current; startOffsetRef.current += elapsed;
            if (sourceNodeRef.current) {
                try {
                    sourceNodeRef.current.stop();
                    sourceNodeRef.current.disconnect();
                    if (sourceNodeRef.current._scriptNode) {
                        sourceNodeRef.current._scriptNode.disconnect();
                    }
                } catch (e) { }
                sourceNodeRef.current = null;
            }
            if (drySourceNodeRef.current) { try { drySourceNodeRef.current.stop(); drySourceNodeRef.current.disconnect(); } catch (e) { } drySourceNodeRef.current = null; }
            setPlayingType('none'); cancelAnimationFrame(rafIdRef.current);
            isPlayingRef.current = false;
        } else {
            // Always use originalBuffer. 'processed' mode creates its own DSP chain on the fly.
            const targetBuffer = originalBuffer;


            // Auto-jump to loop start if loop exists
            // But if user manually seeked differently?
            // User request: "When green loop exists, Play/Space should jump to loop start"
            if (loopStart !== null && loopEnd !== null) {
                startOffsetRef.current = loopStart;
            }

            if (targetBuffer) {
                isPlayingRef.current = true;
                playBuffer(targetBuffer, lastPlayedType, startOffsetRef.current);
            }
        }
    }, [playingType, lastPlayedType, originalBuffer, playBuffer, audioContext, isDeltaMode, loopStart, loopEnd]);

    const handleModeChange = (type) => {
        logAction(`SET_MODE: ${type}`);
        setLastPlayedType(type);
        if (!gainAdjustedRef.current) { if (type === 'original') setDryGain(0); else setDryGain(-60); }

        if (playingType !== 'none') {
            const elapsed = audioContext.currentTime - startTimeRef.current;
            let currentPos = startOffsetRef.current + elapsed;

            // Fix: Calculate correct position if looping
            if (loopStart !== null && loopEnd !== null && loopEnd > loopStart) {
                if (currentPos >= loopEnd) {
                    const loopDur = loopEnd - loopStart;
                    const offsetInLoop = (currentPos - loopStart) % loopDur;
                    currentPos = loopStart + offsetInLoop;
                } else if (currentPos < loopStart && currentPos >= loopEnd) {
                    // Start position sanity check (unlikely but safe)
                    currentPos = loopStart;
                }
            }

            // Hard Stop before switching
            if (sourceNodeRef.current) {
                try {
                    sourceNodeRef.current.stop();
                    sourceNodeRef.current.disconnect();
                    if (sourceNodeRef.current._scriptNode) sourceNodeRef.current._scriptNode.disconnect();
                } catch (e) { }
            }
            setPlayingType('none');
            isPlayingRef.current = false;

            // Restart after short delay to clear buffers
            setTimeout(() => {
                playBuffer(originalBuffer, type, currentPos);
            }, 50);
        }
    };

    const toggleDeltaMode = (e) => { e.stopPropagation(); if (lastPlayedType === 'original') return; setIsDeltaMode(prev => !prev); };

    // --- Parameter Change Helpers ---
    const updateParamGeneric = (setter, value, name = 'PARAM') => {
        // logAction(`TWEAK_KNOB: ${name} -> ${value}`); // Too spammy for drag? Maybe debounce or just log end?
        // User requested tracking "Action Trace". Let's log it.
        // To avoid spam during drag, we might rely on the "HasAdjusted" flags or just allow spam for now (limited to 15).
        // Actually, replacing the log on same param might be better, but simple push is requested.
        // Let's compromise: Log only if valid change.
        setter(value);
        setIsCustomSettings(true);
        setIsProcessing(true);
        if (lastPlayedType !== 'processed') handleModeChange('processed');
    };

    const handleCompKnobChange = (key, value) => {
        switch (key) {
            case 'attack': updateParamGeneric(setAttack, value, 'Attack'); break;
            case 'release': updateParamGeneric(setRelease, value, 'Release'); break;
            case 'knee': updateParamGeneric(setKnee, value, 'Knee'); break;
            case 'lookahead': updateParamGeneric(setLookahead, value, 'Lookahead'); break;
        }
    };

    const updateGateParam = (key, value) => {
        switch (key) {
            case 'gateRatio': updateParamGeneric(setGateRatio, value, 'GateRatio'); break;
            case 'gateAttack': updateParamGeneric(setGateAttack, value, 'GateAttack'); break;
            case 'gateRelease': updateParamGeneric(setGateRelease, value, 'GateRelease'); break;
        }
    };

    const handleGainChange = (key, value) => {
        if (key === 'makeupGain') { setMakeupGain(value); logAction(`SET_GAIN: Makeup -> ${value}`); }
        if (key === 'dryGain') { setDryGain(value); logAction(`SET_GAIN: Dry -> ${value}`); }
        gainAdjustedRef.current = true; setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed');
    };

    // --- A/B Memory & State Snapshots ---
    const getCurrentStateSnapshot = () => ({
        threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease,
        zoomX, zoomY, panOffset, panOffsetY, cuePoint, loopStart, loopEnd,
        selectedPresetIdx, isCustomSettings,
        isGateBypass, isCompBypass
    });

    const applyStateSnapshot = (snap) => {
        if (!snap) return;
        setThreshold(snap.threshold); setRatio(snap.ratio); setRatioControl(snap.ratioControl);
        setAttack(snap.attack); setRelease(snap.release); setKnee(snap.knee); setLookahead(snap.lookahead);
        setMakeupGain(snap.makeupGain); setDryGain(snap.dryGain);
        setGateThreshold(snap.gateThreshold); setGateRatio(snap.gateRatio); setGateAttack(snap.gateAttack); setGateRelease(snap.gateRelease);
        setZoomX(snap.zoomX); setZoomY(snap.zoomY); setPanOffset(snap.panOffset); setPanOffsetY(snap.panOffsetY); setCuePoint(snap.cuePoint);
        setLoopStart(snap.loopStart || null); setLoopEnd(snap.loopEnd || null);
        setSelectedPresetIdx(snap.selectedPresetIdx); setIsCustomSettings(snap.isCustomSettings);
        setIsGateBypass(snap.isGateBypass || false); setIsCompBypass(snap.isCompBypass || false);

        if (playingType === 'none') startOffsetRef.current = snap.cuePoint;
        if (lastPlayedType !== 'processed') handleModeChange('processed');
        setIsProcessing(true);
    };

    const getDefaultSnapshot = () => {
        const def = PRESETS_DATA[0].params;
        return {
            ...def,
            ratioControl: calculateControlFromRatio(def.ratio),
            gateRatio: 4, gateAttack: 2, gateRelease: 100,
            zoomX: 1, zoomY: 0.8, panOffset: 0, panOffsetY: 0, cuePoint: 0, loopStart: null, loopEnd: null,
            selectedPresetIdx: 0, isCustomSettings: false,
            isGateBypass: true, isCompBypass: false
        };
    };

    const prepareSourceChange = (newId) => {
        // Removed A/B logic
    };

    const handleABSwitch = (clickedSlot) => {
        // Removed A/B logic
    };

    // --- Loading Logic ---
    const applyPreset = (idx) => {
        const p = PRESETS_DATA[idx]; if (!p) return;
        logAction(`LOAD_PRESET: ${p.name}`);
        setSelectedPresetIdx(idx); setIsCustomSettings(false); setShowInfoPanel(true); setIsProcessing(true);
        setThreshold(p.params.threshold); setRatio(p.params.ratio); setRatioControl(calculateControlFromRatio(p.params.ratio));
        setAttack(p.params.attack); setRelease(p.params.release); setKnee(p.params.knee); setLookahead(p.params.lookahead);
        setMakeupGain(p.params.makeupGain); setDryGain(p.params.dryGain); setGateThreshold(p.params.gateThreshold);
        setIsGateBypass(false); setIsCompBypass(false);
        if (idx === 0) setGateRatio(4);
        if (lastPlayedType !== 'processed') handleModeChange('processed');
    };

    const resetAllParams = useCallback(() => {
        applyPreset(0); setPanOffsetY(0); setZoomY(0.8); setPanOffset(0); setZoomX(1);
        setLoopStart(null); setLoopEnd(null);
        gainAdjustedRef.current = false; setHasThresholdBeenAdjusted(true); setHasGateBeenAdjusted(false); setIsDeltaMode(false);
        setIsGateBypass(true); setIsCompBypass(false);
    }, []);
    const resetView = useCallback(() => { setPanOffsetY(0); setZoomY(0.8); setPanOffset(0); setZoomX(1); }, []);

    const handleDecodedBuffer = (decodedBuffer) => {
        const length = decodedBuffer.length; const sampleRate = decodedBuffer.sampleRate; const monoData = new Float32Array(length);
        if (decodedBuffer.numberOfChannels > 1) { const left = decodedBuffer.getChannelData(0); const right = decodedBuffer.getChannelData(1); for (let i = 0; i < length; i++) monoData[i] = (left[i] + right[i]) / 2; }
        else { monoData.set(decodedBuffer.getChannelData(0)); }
        let maxPeak = 0; for (let i = 0; i < length; i++) { const abs = Math.abs(monoData[i]); if (abs > maxPeak) maxPeak = abs; }
        const targetPeak = Math.pow(10, -0.1 / 20); if (maxPeak > 0.0001) { const norm = targetPeak / maxPeak; for (let i = 0; i < length; i++) monoData[i] *= norm; }
        const monoBuffer = audioContext.createBuffer(1, length, sampleRate); monoBuffer.copyToChannel(monoData, 0);
        setOriginalBuffer(monoBuffer); setFullAudioData(null); fullAudioDataRef.current = null;

        // Auto Resolution
        const MAX_SMOOTH_POINTS = 250000; let autoPct = 100;
        if (length > MAX_SMOOTH_POINTS) {
            const idealStep = Math.ceil(length / MAX_SMOOTH_POINTS);
            const minPoints = 3000; const maxStep = Math.floor(length / minPoints);
            let factor = (idealStep - 1) / (maxStep - 1);
            if (factor < 0) factor = 0; if (factor > 1) factor = 1;
            autoPct = Math.round(100 - (factor * 99));
            if (autoPct === 100 && idealStep > 1) autoPct = 99;
        }
        setResolutionPct(autoPct);
    };

    const loadPreset = async (preset) => {
        if (!audioContext) return;
        try {
            setIsLoading(true); setErrorMsg(''); if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setIsLoading(true); setErrorMsg(''); if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setPlayingType('none'); isPlayingRef.current = false; setOriginalBuffer(null); setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0;
            setCurrentSourceId(preset.id); setLastPracticeSourceId(preset.id); setFileName(preset.name);

            let arrayBuffer; try { const res = await fetch(preset.url); if (!res.ok) throw new Error('Direct fetch failed'); arrayBuffer = await res.arrayBuffer(); } catch (e) { const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(preset.url)}`; const res = await fetch(pUrl); if (!res.ok) throw new Error('Failed'); arrayBuffer = await res.arrayBuffer(); }
            const decoded = await audioContext.decodeAudioData(arrayBuffer); handleDecodedBuffer(decoded); setIsLoading(false);
        } catch (err) { console.error(err); setErrorMsg(`載入失敗: ${err.message}`); setIsLoading(false); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]; if (!file || !audioContext) return;
        try {
            setIsLoading(true); setErrorMsg(''); if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setIsLoading(true); setErrorMsg(''); if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setPlayingType('none'); isPlayingRef.current = false; setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0; setCurrentSourceId('upload'); setFileName(file.name); setOriginalBuffer(null);

            // Persistence: Save to IndexedDB
            await saveAudioFileToDB(file, file.name);

            const ab = await file.arrayBuffer(); const decoded = await audioContext.decodeAudioData(ab);
            userBufferRef.current = decoded; userFileNameRef.current = file.name;
            handleDecodedBuffer(decoded); setIsLoading(false);
        } catch (err) { setErrorMsg(`Failed: ${err.message}`); setIsLoading(false); }
    };

    const saveSessionState = (mode) => {
        const snapshot = getCurrentStateSnapshot();
        if (mode === 'practice') practiceSessionRef.current = { ...snapshot, sourceId: currentSourceId, fileName };
        else if (mode === 'upload') uploadSessionRef.current = { ...snapshot, fileName: userFileNameRef.current };
    };

    const switchToPractice = () => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
        setPlayingType('none'); isPlayingRef.current = false;

        if (currentSourceId === 'upload') saveSessionState('upload');

        if (practiceSessionRef.current) {
            const snap = practiceSessionRef.current;
            applyStateSnapshot(snap);
            setCurrentSourceId(snap.sourceId);
            setFileName(snap.fileName);
            // Re-load the buffer for the practice file if needed (or just let loadPreset handle it if we want to be safe, but loadPreset resets params)
            // Actually, we need to load the audio without resetting params if we are restoring session.
            // But wait, the requirement says "switching modes preserves them".
            // So we need a way to load audio without resetting.
            // Let's check if the buffer is already loaded? No, we switch buffers.
            // We need to fetch the audio again.
            const source = AUDIO_SOURCES.find(s => s.id === snap.sourceId);
            if (source) loadAudioOnly(source);
        } else {
            // No previous practice session, load default
            const defaultSource = AUDIO_SOURCES.find(s => s.id === 'Lead-Vocal-03') || AUDIO_SOURCES[0];
            loadPreset(defaultSource);
        }
    };

    const switchToUpload = () => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
        setPlayingType('none'); isPlayingRef.current = false;

        if (currentSourceId !== 'upload') saveSessionState('practice');

        if (uploadSessionRef.current) {
            const snap = uploadSessionRef.current;
            applyStateSnapshot(snap);
            setCurrentSourceId('upload');
            setFileName(snap.fileName);
            if (userBufferRef.current) handleDecodedBuffer(userBufferRef.current);
        } else {
            restoreUserUpload();
        }
    };

    const loadAudioOnly = async (preset) => {
        if (!audioContext) return;
        try {
            setIsLoading(true); setErrorMsg(''); if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setPlayingType('none'); isPlayingRef.current = false; setOriginalBuffer(null); setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0;
            setCurrentSourceId(preset.id); setLastPracticeSourceId(preset.id); setFileName(preset.name);

            let arrayBuffer; try { const res = await fetch(preset.url); if (!res.ok) throw new Error('Direct fetch failed'); arrayBuffer = await res.arrayBuffer(); } catch (e) { const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(preset.url)}`; const res = await fetch(pUrl); if (!res.ok) throw new Error('Failed'); arrayBuffer = await res.arrayBuffer(); }
            const decoded = await audioContext.decodeAudioData(arrayBuffer); handleDecodedBuffer(decoded); setIsLoading(false);
        } catch (err) { console.error(err); setErrorMsg(`載入失敗: ${err.message}`); setIsLoading(false); }
    };

    const stopAudio = () => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
        if (audioContext && audioContext.state === 'running') audioContext.suspend();
        setPlayingType('none'); isPlayingRef.current = false;
        // Resume context in case we need it later? suspend is drastic but effective for "pause".
        // Actually, just stopping node is enough usually. User said "pause".
        // But factory reset will reload page anyway.
        // Let's just stop the node.
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    };

    const restoreUserUpload = () => {
        if (!userBufferRef.current || !audioContext) return;
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch (e) { }
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch (e) { }
        setPlayingType('none'); isPlayingRef.current = false; setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0; setCurrentSourceId('upload'); setFileName(userFileNameRef.current);
        handleDecodedBuffer(userBufferRef.current);
    };

    const clearUserUpload = () => {
        userBufferRef.current = null;
        userFileNameRef.current = "";
        uploadSessionRef.current = null;
        if (currentSourceId === 'upload') {
            switchToPractice();
        }
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
                const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = dlName; document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            } catch (e) { console.error(e); setErrorMsg("匯出失敗"); } finally { setIsLoading(false); }
        }, 50);
    };

    useEffect(() => {
        if (audioContext && !originalBuffer && !currentSourceId && !isLoading) {
            const randomSource = AUDIO_SOURCES[Math.floor(Math.random() * AUDIO_SOURCES.length)];
            loadPreset(randomSource);
        }
    }, [audioContext, originalBuffer, currentSourceId, isLoading]);

    // --- 7. 滑鼠互動 (Mouse Interactions for Waveform) ---

    const handleWaveformMouseDown = (e) => {
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
    };

    const onWaveformGlobalMove = useCallback((e) => {
        if (isDraggingLineRef.current) {
            if (!waveformCanvasRef.current) return;
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const height = rect.height;
            const PADDING = 24; const maxH = (height / 2) - PADDING; const ampScale = maxH * zoomY; const centerY = (height / 2) + panOffsetY;
            const distFromCenter = Math.abs(relY - centerY);
            const linearAmp = distFromCenter / ampScale;
            let newDb = linearAmp > 0.000001 ? 20 * Math.log10(linearAmp) : -100;
            if (newDb > 0) newDb = 0;

            if (isDraggingLineRef.current === 'comp') {
                // Allow dragging even if bypassed (we auto-enabled on mousedown)

                if (newDb < -60) newDb = -60;
                setThreshold(Math.round(newDb)); setHasThresholdBeenAdjusted(true); setIsCompAdjusting(true);
            } else if (isDraggingLineRef.current === 'gate') {
                // Allow dragging gate even if bypassed

                if (newDb < -80) newDb = -80;
                setGateThreshold(Math.round(newDb)); setHasGateBeenAdjusted(true); setIsGateAdjusting(true);
            }
            setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType === 'original') handleModeChange('processed');
            return;
        }
        if (isCreatingLoopRef.current && waveformCanvasRef.current && originalBuffer) {
            const rect = waveformCanvasRef.current.getBoundingClientRect();
            if (Math.abs(e.clientX - dragStartXRef.current) > 5) {
                document.body.style.cursor = 'col-resize';
                const totalWidth = rect.width * zoomX;
                const pixelToTime = (px) => {
                    const relX = px - panOffset; let pct = relX / totalWidth; if (pct < 0) pct = 0; if (pct > 1) pct = 1; return pct * originalBuffer.duration;
                };
                const t1 = pixelToTime(dragStartXRef.current - rect.left);
                const t2 = pixelToTime(e.clientX - rect.left);
                setLoopStart(Math.min(t1, t2)); setLoopEnd(Math.max(t1, t2));
            }
        }
    }, [zoomY, panOffsetY, lastPlayedType, originalBuffer, panOffset, zoomX]);

    const onWaveformGlobalUp = useCallback((e) => {
        window.removeEventListener('mousemove', onWaveformGlobalMove);
        window.removeEventListener('mouseup', onWaveformGlobalUp);

        if (isDraggingLineRef.current) {
            isDraggingLineRef.current = null; setIsCompAdjusting(false); setIsGateAdjusting(false); document.body.style.cursor = 'default';
            return;
        }
        if (isCreatingLoopRef.current) {
            isCreatingLoopRef.current = false; document.body.style.cursor = 'default';
            const dragDist = Math.abs(e.clientX - dragStartXRef.current);
            if (dragDist < 5 && waveformCanvasRef.current && originalBuffer) {
                const rect = waveformCanvasRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const totalWidth = rect.width * zoomX;
                const relX = clickX - panOffset;
                let pct = relX / totalWidth; if (pct < 0) pct = 0; if (pct > 1) pct = 1;
                const seekTime = pct * originalBuffer.duration;
                // Removed loop clearing to allow seeking within/outside loop
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
                    const relX = px - panOffset; let pct = relX / totalWidth; if (pct < 0) pct = 0; if (pct > 1) pct = 1; return pct * originalBuffer.duration;
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
                        // Auto-restart if we were playing, or just set offset?
                        // If user was dragging, likely paused? No, drags usually happen while playing.
                        // If we want to restart playback from loop start:
                        // Check if we assume 'processed' if created from drag?
                        // Generally, preserve previous mode.
                        console.log(`[MouseUp] Loop Auto-Play: ${loopStartTime.toFixed(3)}s, Type: ${typeToPlay}`);
                        playBufferRef.current(targetBuffer, typeToPlay, loopStartTime);
                    } else {
                        // Just update visual if stopped
                        if (playheadRef.current && waveformCanvasRef.current) {
                            const pct = loopStartTime / originalBuffer.duration;
                            // Use newZoom and newPan (panOffset) which were just set, but React state might not update immediately for this render cycle?
                            // Actually state updates are bad here. We used 'newPan' variable.
                            // Re-calculate screen position based on the calculated zoom/pan
                            const screenPct = (((pct * newTotalWidth) + newPan) / width) * 100;
                            playheadRef.current.style.left = `${screenPct}%`;
                            playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
                        }
                    }
                }
            }
        }
    }, [originalBuffer, onWaveformGlobalMove, playingType, panOffset, zoomX, isDeltaMode]);

    const handleLocalMouseMove = (e) => {
        if (isDraggingRef.current || isDraggingLineRef.current || isCreatingLoopRef.current) return;
        if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;

        const rect = waveformCanvasRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left; const relY = e.clientY - rect.top; const height = rect.height;
        const PADDING = 24; const maxH = (height / 2) - PADDING; const ampScale = maxH * zoomY; const centerY = (height / 2) + panOffsetY;

        setMousePos({ x: relX, y: relY });

        const HIT_TOLERANCE = 8;
        const compThreshPx = Math.pow(10, threshold / 20) * ampScale;
        const gateThreshPx = Math.pow(10, gateThreshold / 20) * ampScale;

        const distToCompTop = Math.abs(relY - (centerY - compThreshPx));
        const distToCompBot = Math.abs(relY - (centerY + compThreshPx));
        const distToGateTop = Math.abs(relY - (centerY - gateThreshPx));
        const distToGateBot = Math.abs(relY - (centerY + gateThreshPx));

        let newHoverLine = null; let cursor = 'crosshair';
        if (distToGateTop < HIT_TOLERANCE || distToGateBot < HIT_TOLERANCE) { newHoverLine = 'gate'; cursor = 'row-resize'; }
        if (distToCompTop < HIT_TOLERANCE || distToCompBot < HIT_TOLERANCE) { newHoverLine = 'comp'; cursor = 'row-resize'; }

        setHoverLine(newHoverLine);
        if (containerRef.current) containerRef.current.style.cursor = cursor;
    };

    const getInfoPanelContent = () => {
        if (hoveredKnob && TOOLTIPS[hoveredKnob]) return { title: TOOLTIPS[hoveredKnob].title, content: (<><div className="mb-3 text-slate-300 font-medium">{TOOLTIPS[hoveredKnob].desc}</div><div className="text-yellow-400 font-bold mb-1.5 text-xs uppercase tracking-wide">💡 調整效果</div><div className="text-slate-400 text-sm leading-relaxed mb-3">{TOOLTIPS[hoveredKnob].setting}</div><div className="text-cyan-400 font-bold mb-1.5 text-xs uppercase tracking-wide">⚙️ 常用參數參考</div><div className="text-slate-300 text-sm font-mono bg-black/30 p-2 rounded border border-white/10">{TOOLTIPS[hoveredKnob].common}</div></>) };
        if (!isCustomSettings && selectedPresetIdx !== 0 && PRESETS_DATA[selectedPresetIdx]) return { title: `設定思路: ${PRESETS_DATA[selectedPresetIdx].name.split('(')[0]}`, content: PRESETS_DATA[selectedPresetIdx].explanation };
        return null;
    };
    const activeInfo = getInfoPanelContent();

    useEffect(() => { const h = (e) => { if (e.code === 'Space') { e.preventDefault(); togglePlayback(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [togglePlayback]);

    // --- Debug Helper: Enhanced Dumpstate ---
    const handleCopyDebug = async () => {
        setCopyStatus('copying');
        try {
            const snapshot = getCurrentStateSnapshot();
            const actionTrace = actionLogRef.current || [];
            const now = new Date();

            // 1. Audio Health Check
            let audioHealth = { status: 'Unknown', latency: 0, time: 0, bufferCheck: 'N/A' };
            if (audioContext) {
                audioHealth.status = audioContext.state;
                audioHealth.latency = audioContext.baseLatency;
                audioHealth.time = audioContext.currentTime;

                if (originalBuffer) {
                    const data = originalBuffer.getChannelData(0);
                    let sumSq = 0;
                    const checkLen = Math.min(1000, data.length);
                    for (let i = 0; i < checkLen; i++) sumSq += data[i] * data[i];
                    const rms = Math.sqrt(sumSq / checkLen);
                    audioHealth.bufferCheck = rms === 0 ? 'WARNING: Silent Buffer (RMS=0)' : `OK (RMS=${rms.toFixed(4)})`;
                } else {
                    audioHealth.bufferCheck = 'No Buffer Loaded';
                }
            }

            // 2. DSP Sanity Check
            let dspStatus = '✅ Passed';
            try {
                const testInput = new Float32Array(100).fill(0.5);
                const res = processCompressor(testInput, 44100, currentParams, 1);
                let hasNaN = false, hasInf = false;
                for (let i = 0; i < res.outputData.length; i++) {
                    if (Number.isNaN(res.outputData[i])) hasNaN = true;
                    if (!Number.isFinite(res.outputData[i])) hasInf = true;
                }
                if (hasNaN) dspStatus = 'CRITICAL: NaN Detected';
                else if (hasInf) dspStatus = 'CRITICAL: Infinity Detected';
            } catch (e) {
                dspStatus = `CRITICAL: Crash (${e.message})`;
            }

            // 3. Visual Snapshot
            let visualSnapshot = 'N/A';
            if (waveformCanvasRef.current) {
                try {
                    visualSnapshot = waveformCanvasRef.current.toDataURL('image/png', 0.5);
                } catch (e) {
                    visualSnapshot = `Error: ${e.message}`;
                }
            }

            // 4. Construct Report
            const report = `
# 🐛 Bug Report Context
* **App Version:** ${APP_VERSION}
* **Timestamp:** ${now.toISOString()}

## 🔍 1. Diagnosis
* **AudioContext:** ${audioHealth.status} (Time: ${audioHealth.time.toFixed(2)}s)
* **DSP Check:** ${dspStatus}
* **Buffer:** ${originalBuffer ? `${originalBuffer.sampleRate}Hz / ${originalBuffer.numberOfChannels}ch / ${originalBuffer.duration.toFixed(2)}s` : 'None'}
* **Buffer Health:** ${audioHealth.bufferCheck}

## 🛠 2. Last User Actions
${actionTrace.length > 0 ? actionTrace.map((a, i) => `${i + 1}. ${a}`).join('\n') : '(No actions recorded)'}

## 📸 3. Visual Snapshot (Base64)
*(Paste this into an LLM to "see" the waveform state)*
\`\`\`
${visualSnapshot}
\`\`\`

## 📊 4. Full State Dump
\`\`\`json
${JSON.stringify({
                snapshot,
                audioState: {
                    fileName,
                    currentSourceId,
                    playingType,
                    isPlaying: isPlayingRef.current
                },
                viewState: {
                    resolutionPct,
                    canvasDims
                }
            }, null, 2)}
\`\`\`
            `.trim();

            const copyToClipboard = async (text) => {
                if (navigator.clipboard && window.isSecureContext) {
                    try { await navigator.clipboard.writeText(text); return true; }
                    catch (err) { console.error('Navigator clipboard failed', err); }
                }
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed"; textArea.style.left = "-9999px"; textArea.style.top = "0";
                    document.body.appendChild(textArea);
                    textArea.focus(); textArea.select();
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (err) {
                    console.error('Fallback copy failed', err);
                    return false;
                }
            };

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


    // --- 8. Render ---
    return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden p-4 relative">
            <Header
                fileName={fileName}
                resolutionPct={resolutionPct} setResolutionPct={setResolutionPct}
                currentSourceId={currentSourceId} lastPracticeSourceId={lastPracticeSourceId}
                handleFileUpload={handleFileUpload} restoreUserUpload={restoreUserUpload}
                clearUserUpload={() => {
                    // Clear from memory and DB
                    userBufferRef.current = null;
                    userFileNameRef.current = "";
                    setOriginalBuffer(null);
                    setCurrentSourceId(null);
                    // Clear DB
                    saveAudioFileToDB(null, ""); // Or a dedicated clear function if we had one exposed, but we can just use the reset logic or make a specific clearer.
                    // Actually, let's use a clear function or just not save it?
                    // We should add a specific clear function to storage if needed, or just overwrite.
                    // For now, let's skip DB clear on just "X" unless user reset.
                    // Wait, user specific request: "Clear Settings" does EVERYTHING.
                    // The small X just clears current upload from view?
                    // Let's keep it simple.
                }}
                switchToPractice={switchToPractice}
                handleFactoryReset={softReset} // [MODIFIED] Use softReset to preserve audio
                stopAudio={stopAudio}
                userBufferRef={userBufferRef} userFileNameRef={userFileNameRef}
                handleDownload={handleDownload} isLoading={isLoading}
                loadPreset={loadPreset}
                isInfoPanelEnabled={isInfoPanelEnabled} setIsInfoPanelEnabled={setIsInfoPanelEnabled}
                fileInputRef={fileInputRef}
                resetAllParams={resetAllParams}

                // Preset Props
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

                    {/* Logic: Hover shows InfoPanel (Knob Info) ABOVE HUD. */}
                    {/* Logic: Hover shows InfoPanel (Knob Info) ABOVE HUD. */}
                    {hoveredKnob && activeInfo && isInfoPanelEnabled ? (
                        <div
                            className="absolute bottom-44 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col w-64 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none"
                            style={{
                                left: Math.max(10, Math.min(canvasDims.width - 270, hoveredKnobPos.x - containerRef.current?.getBoundingClientRect().left - 128))
                            }}
                        >
                            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2 text-lg"><Info size={20} /> {activeInfo.title}</div>
                            <div className="text-sm text-slate-200 leading-relaxed font-medium">{activeInfo.content}</div>
                        </div>
                    ) : (isInfoPanelEnabled && PRESETS_DATA[selectedPresetIdx]) ? (
                        // FIXED PRESET INFO (Top Right)
                        <div
                            className="absolute top-4 right-4 z-30 bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col w-72 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none"
                        >
                            <div className="flex items-center gap-2 text-green-400 font-bold mb-2 text-base border-b border-white/10 pb-2">
                                <Info size={18} />
                                {PRESETS_DATA[selectedPresetIdx].name.split(' (')[0]}
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                {PRESETS_DATA[selectedPresetIdx].explanation}
                            </div>
                        </div>
                    ) : null}

                    {/* COLOR LEGEND (Always Visible) */}
                    <DraggableLegend />

                    {/* NEW INFO BUTTON (Raised to avoid HUD) */}
                    <div className="absolute bottom-44 right-4 z-40 flex flex-col gap-2 items-end">
                        <button
                            onMouseDown={(e) => e.stopPropagation()} // Fix: Stop playhead jump
                            onClick={(e) => { e.stopPropagation(); setIsInfoPanelEnabled(!isInfoPanelEnabled); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all shadow-lg border backdrop-blur-md ${isInfoPanelEnabled ? 'bg-green-500 text-white border-green-400 shadow-green-500/30 hover:bg-green-400' : 'bg-slate-800/80 text-slate-400 border-white/10 hover:bg-slate-700 hover:text-white'}`}
                        >
                            {isInfoPanelEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} 彈出說明視窗
                        </button>
                    </div>
                    <DraggableViewControls
                        zoomX={zoomX} setZoomX={(z) => {
                            setZoomX(z);
                            if (waveformCanvasRef.current && originalBuffer) {
                                const w = canvasDims.width; const cr = cuePoint / originalBuffer.duration;
                                let nP = (w / 3) - (cr * w * z); const mP = w - (w * z);
                                if (nP > 0) nP = 0; if (nP < mP) nP = mP; setPanOffset(nP);
                            }
                        }}
                        zoomY={zoomY} setZoomY={setZoomY}
                        onReset={resetView}
                        containerHeight={canvasDims.height}
                        loopStart={loopStart} loopEnd={loopEnd}
                        panOffset={panOffset} setPanOffset={setPanOffset}
                        originalBuffer={originalBuffer}
                        canvasDims={canvasDims}
                    />

                    {/* Loop Delete Button */}
                    {loopStart !== null && loopEnd !== null && originalBuffer && (
                        <div
                            className="absolute top-0 flex items-center justify-center bg-green-500/90 text-white hover:bg-green-400 cursor-pointer shadow-lg z-30 transition-colors"
                            style={{
                                left: `calc(${((loopEnd / originalBuffer.duration) * zoomX * 100) + ((panOffset / canvasDims.width) * 100)}% - 24px)`,
                                width: '24px',
                                height: '24px',
                                borderRadius: '0 0 0 6px',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent seeking
                                setLoopStart(null);
                                setLoopEnd(null);
                            }}
                            title="Clear Loop"
                        >
                            ×
                        </div>
                    )}
                    {/* Loop Delete Button */}
                </Waveform>

                <Meters grCanvasRef={grBarCanvasRef} outputCanvasRef={outputMeterCanvasRef} height={canvasDims.height} />
            </div>

            <ControlHud
                // Gate
                gateThreshold={gateThreshold} gateRatio={gateRatio} gateAttack={gateAttack} gateRelease={gateRelease}
                handleGateThresholdChange={(v) => { updateParamGeneric(setGateThreshold, v, 'GateThreshold'); if (!hasGateBeenAdjusted) setHasGateBeenAdjusted(true); }}
                updateParam={updateGateParam}
                handleGateDragState={(isActive) => { setIsKnobDragging(isActive); setIsGateAdjusting(isActive); }}
                hasGateBeenAdjusted={hasGateBeenAdjusted}
                isGateBypass={isGateBypass} setIsGateBypass={(v) => { setIsGateBypass(v); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }}
                // Comp
                threshold={threshold} ratio={ratio} ratioControl={ratioControl} attack={attack} release={release} knee={knee} lookahead={lookahead}
                handleThresholdChange={(v) => { updateParamGeneric(setThreshold, v, 'CompThreshold'); setHasThresholdBeenAdjusted(true); }}
                updateRatio={(v) => { setRatioControl(v); setRatio(calculateRatioFromControl(v)); logAction(`SET_RATIO: ${calculateRatioFromControl(v).toFixed(1)}`); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }}
                handleCompKnobChange={handleCompKnobChange}
                handleCompDragState={(isActive) => { setIsKnobDragging(isActive); setIsCompAdjusting(isActive); }}
                hasThresholdBeenAdjusted={hasThresholdBeenAdjusted}
                isCompBypass={isCompBypass} setIsCompBypass={(v) => { setIsCompBypass(v); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }}
                // Output
                makeupGain={makeupGain} dryGain={dryGain}
                handleGainChange={handleGainChange}
                // Controls
                playingType={playingType} lastPlayedType={lastPlayedType} isDryMode={isDryMode} isDeltaMode={isDeltaMode}
                handleModeChange={handleModeChange} toggleDeltaMode={toggleDeltaMode} togglePlayback={togglePlayback}
                // A/B & Presets
                selectedPresetIdx={selectedPresetIdx} isCustomSettings={isCustomSettings} applyPreset={applyPreset}
                // Interactions
                isDraggingKnobRef={isDraggingKnobRef} handleNormalDragState={setIsKnobDragging}
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
            {/* DEBUG FOOTER */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-900 border-t border-white/10 flex items-center justify-center z-50">
                <button
                    onClick={handleCopyDebug}
                    className="text-[10px] text-slate-500 hover:text-cyan-400 font-mono tracking-widest uppercase transition-colors px-4 py-1 hover:bg-white/5 rounded"
                >
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