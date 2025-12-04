import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Gauge } from 'lucide-react';

// --- Imports from Refactored Structure ---
import { PRESETS_DATA, AUDIO_SOURCES, TOOLTIPS } from './utils/constants';
import { processCompressor } from './utils/dsp';
import { writeWavFile } from './utils/audioHelper';

import Header from './components/layout/Header';
import ControlHud from './components/layout/ControlHud';
import Waveform, { drawMainWaveform } from './components/visualizer/Waveform';
import Meters, { drawDualMeter, drawGRBar } from './components/visualizer/Meters';
import { DraggableViewControls, DraggableInfoPanel, DraggableLegend } from './components/ui/Draggables';

const App = () => {
  // --- 1. 狀態管理 (State Management) ---
  const [isLoading, setIsLoading] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [originalBuffer, setOriginalBuffer] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [currentSourceId, setCurrentSourceId] = useState(null);
  
  // Persistent User Upload
  const userBufferRef = useRef(null);
  const userFileNameRef = useRef("");

  // A/B MEMORY SYSTEM
  const abMemoryRef = useRef({});
  const [activeSlot, setActiveSlot] = useState('A');

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
  const [gateThreshold, setGateThreshold] = useState(-60); 
  const [gateRatio, setGateRatio] = useState(4); 
  const [gateAttack, setGateAttack] = useState(2);
  const [gateRelease, setGateRelease] = useState(100);

  // Playback & View
  const [playingType, setPlayingType] = useState('none'); 
  const [lastPlayedType, setLastPlayedType] = useState('original'); 
  const isDryMode = lastPlayedType === 'original';
  const [isDeltaMode, setIsDeltaMode] = useState(false); 
  const [zoomX, setZoomX] = useState(1); 
  const [zoomY, setZoomY] = useState(1); 
  const [panOffset, setPanOffset] = useState(0); 
  const [panOffsetY, setPanOffsetY] = useState(0); 
  const [cuePoint, setCuePoint] = useState(0);
  
  // Resolution Control
  const [resolutionPct, setResolutionPct] = useState(100);
  
  // UI
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [isCustomSettings, setIsCustomSettings] = useState(false); 
  const [hoveredKnob, setHoveredKnob] = useState(null); 
  const [showInfoPanel, setShowInfoPanel] = useState(true); 
  const [isInfoPanelEnabled, setIsInfoPanelEnabled] = useState(true);

  // Interaction State
  const [isKnobDragging, setIsKnobDragging] = useState(false); 
  const [isCompAdjusting, setIsCompAdjusting] = useState(false); 
  const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(false); 
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
  const cueMarkerRef = useRef(null); 
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

  // --- 2. 初始化與 Effect (Init & Effects) ---
  
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);
    setRatioControl(calculateControlFromRatio(4));
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
  }, [isDeltaMode]);

  // Sync Dry Gain
  useEffect(() => {
      if (dryGainNodeRef.current && audioContext) {
          dryGainNodeRef.current.gain.setTargetAtTime(Math.pow(10, dryGain / 20), audioContext.currentTime, 0.01);
      }
  }, [dryGain, audioContext]);

  // Sync Cue Marker
  useEffect(() => {
      if (waveformCanvasRef.current && cueMarkerRef.current && originalBuffer) {
          const width = waveformCanvasRef.current.width;
          const cuePct = cuePoint / originalBuffer.duration;
          const cueScreenPct = (((cuePct * width * zoomX) + panOffset) / width) * 100;
          cueMarkerRef.current.style.left = `${cueScreenPct}%`;
          cueMarkerRef.current.style.opacity = (cueScreenPct < 0 || cueScreenPct > 100) ? 0 : 1;
      } else if (cueMarkerRef.current) {
          cueMarkerRef.current.style.opacity = 0;
      }
  }, [cuePoint, zoomX, panOffset, canvasDims, originalBuffer]);

  // --- 3. 輔助邏輯 (Helpers) ---

  const calculateRatioFromControl = (ctrl) => ctrl <= 50 ? 1 + (ctrl / 50) * 4 : (ctrl <= 75 ? 5 + ((ctrl - 50) / 25) * 5 : 10 + ((ctrl - 75) / 25) * 90);
  const calculateControlFromRatio = (r) => r <= 5 ? (r - 1) / 4 * 50 : (r <= 10 ? 50 + (r - 5) / 5 * 25 : 75 + (r - 10) / 90 * 25);

  const currentParams = useMemo(() => ({
    threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease
  }), [threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease]);

  // --- 4. 數據處理 (Data Processing) ---

  // Downsampling for Visuals
  useEffect(() => {
      if (!originalBuffer) return;
      const length = originalBuffer.length;
      const monoData = new Float32Array(length);
      const ch0 = originalBuffer.getChannelData(0);
      if (originalBuffer.numberOfChannels > 1) {
          const ch1 = originalBuffer.getChannelData(1);
          for(let i=0; i<length; i++) monoData[i] = (ch0[i] + ch1[i]) / 2;
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
      
      for(let i=0; i<cacheLength; i++) {
          const start = i * targetStep;
          const end = Math.min(start + targetStep, length);
          let chunkVal = 0;
          let maxAbs = 0;
          for(let j=start; j<end; j++) {
              const val = monoData[j];
              const abs = Math.abs(val);
              if(abs > maxAbs) { maxAbs = abs; chunkVal = val; }
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
            if (inputLevel > gateEnvelope) gateEnvelope += gateAttCoeff * (inputLevel - gateEnvelope);
            else gateEnvelope += gateRelCoeff * (inputLevel - gateEnvelope);
            
            let gateGaindB = 0;
            let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
            if (gateEnvdB < params.gateThreshold) gateGaindB = -(params.gateThreshold - gateEnvdB) * (params.gateRatio - 1);
            const gateGainLinear = Math.pow(10, gateGaindB / 20);
            const gatedDetectorLevel = inputLevel * gateGainLinear;
            
            if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
            else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);
            
            let compEnvdB = 20 * Math.log10(compEnvelope + 1e-6);
            let compGainReductiondB = 0;
            if (compEnvdB > params.threshold - params.knee/2) {
                 if (params.knee > 0 && compEnvdB < params.threshold + params.knee/2) {
                    let slope = 1 - (1/params.ratio);
                    let over = compEnvdB - (params.threshold - params.knee/2);
                    compGainReductiondB = -slope * ((over * over) / (2 * params.knee)); 
                } else if (compEnvdB >= params.threshold + params.knee/2) {
                    compGainReductiondB = (params.threshold - compEnvdB) * (1 - 1 / params.ratio);
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
            for(let i=0; i<length; i++) deltaData[i] = outData[i] - inputData[i];
            const deltaBuf = audioContext.createBuffer(1, length, sampleRate);
            deltaBuf.copyToChannel(deltaData, 0);
            fullAudioDataRef.current = { outputBuffer: outBuf, deltaBuffer: deltaBuf };
            setIsProcessing(false); 
            if (playingType === 'processed' && sourceNodeRef.current && playBufferRef.current) {
                const elapsed = audioContext.currentTime - startTimeRef.current;
                const currentPos = startOffsetRef.current + elapsed;
                playBufferRef.current(isDeltaMode ? deltaBuf : outBuf, 'processed', currentPos);
            }
        }
    };
    processingTaskRef.current = setTimeout(processChunk, 150);
  }, [originalBuffer, audioContext, currentParams]);

  // --- 5. 動畫迴圈 (Animation Loop) ---
  
  const animate = useCallback(() => {
    if (!originalBuffer || !audioContext) return;
    const elapsed = audioContext.currentTime - startTimeRef.current;
    const currentPosition = elapsed + startOffsetRef.current;
    const duration = originalBuffer.duration;

    // Update Playhead Position
    if (waveformCanvasRef.current && playheadRef.current) {
        const width = waveformCanvasRef.current.width;
        const totalWidth = width * zoomX;
        const pct = currentPosition / duration;
        const screenPct = (((pct * totalWidth) + panOffset) / width) * 100;
        playheadRef.current.style.left = `${screenPct}%`;
        playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
    }

    if (visualResult) {
        // RMS Calculation
        const step = visualSourceCache.step;
        const visualIndex = Math.floor((currentPosition * audioContext.sampleRate) / step);
        const windowSize = Math.max(1, Math.floor(2048 / step)); 
        const endIdx = Math.min(visualIndex + windowSize, visualResult.outputData.length);
        
        let currentGR = 0;
        if (visualIndex < visualResult.grCurve.length && visualIndex >= 0) currentGR = visualResult.grCurve[visualIndex];

        let maxMix = 0; let maxInput = 0; let sumSqInput = 0; let sumSqMix = 0; let sampleCount = 0;
        const isProcessed = playingType === 'processed';
        const dryLinear = Math.pow(10, dryGain / 20);
        
        for(let i = visualIndex; i < endIdx; i++) {
             if (i >= visualResult.outputData.length) break;
             const dry = visualResult.visualInput[i];
             const dryAbs = Math.abs(dry);
             if (dryAbs > maxInput) maxInput = dryAbs;
             sumSqInput += dry * dry;

             let mix = 0;
             if (isProcessed) {
                const wet = visualResult.outputData[i];
                if (isDeltaMode) mix = wet - dry; else mix = wet + (dry * dryLinear);
             } else {
                mix = visualResult.visualInput[i];
             }
             const abs = Math.abs(mix);
             if (abs > maxMix) maxMix = abs;
             sumSqMix += mix * mix;
             sampleCount++;
        }
        
        const currentDryRms = sampleCount > 0 ? Math.sqrt(sumSqInput / sampleCount) : 0;
        const currentOutRms = sampleCount > 0 ? Math.sqrt(sumSqMix / sampleCount) : 0;
        
        const smoothingFactor = 0.15; 
        meterStateRef.current.dryRmsLevel = meterStateRef.current.dryRmsLevel * (1 - smoothingFactor) + currentDryRms * smoothingFactor;
        meterStateRef.current.outRmsLevel = meterStateRef.current.outRmsLevel * (1 - smoothingFactor) + currentOutRms * smoothingFactor;

        // Draw Meters
        drawGRBar(grBarCanvasRef.current, isProcessed ? currentGR : 0, meterStateRef.current, hoverGrRef.current);
        if (isProcessed) {
            drawDualMeter(outputMeterCanvasRef.current, maxInput, maxMix, meterStateRef.current.dryRmsLevel, meterStateRef.current.outRmsLevel, meterStateRef.current);
        } else {
            drawDualMeter(outputMeterCanvasRef.current, maxInput, maxInput, meterStateRef.current.dryRmsLevel, meterStateRef.current.dryRmsLevel, meterStateRef.current);
        }

        // Draw Main Waveform
        drawMainWaveform({
            canvas: waveformCanvasRef.current,
            canvasDims,
            visualResult,
            originalBuffer,
            zoomX, zoomY, panOffset, panOffsetY,
            playingType, lastPlayedType, isDeltaMode, dryGain,
            threshold, gateThreshold,
            loopStart, loopEnd,
            mousePos, hoverLine, 
            isDraggingLine: isDraggingLineRef.current, 
            isCompAdjusting, hasThresholdBeenAdjusted, 
            isGateAdjusting, hasGateBeenAdjusted,
            hoverGrRef
        });
    }

    // Loop & Playback Logic
    if (loopStart !== null && loopEnd !== null) {
        if (currentPosition >= loopEnd) {
             if (playBufferRef.current) {
                 const targetBuffer = playingType === 'original' ? originalBuffer : 
                                      (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
                 if (targetBuffer) playBufferRef.current(targetBuffer, playingType, loopStart);
             }
        }
    } else if (currentPosition >= duration) {
            if (playBufferRef.current) {
                const targetBuffer = playingType === 'original' ? originalBuffer : 
                                    (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
                if (targetBuffer) playBufferRef.current(targetBuffer, playingType, 0); 
            }
    }

    rafIdRef.current = requestAnimationFrame(animate);
  }, [originalBuffer, audioContext, playingType, visualResult, zoomX, zoomY, panOffset, panOffsetY, dryGain, isDeltaMode, visualSourceCache, loopStart, loopEnd, canvasDims, threshold, gateThreshold, mousePos, hoverLine, isCompAdjusting, hasThresholdBeenAdjusted, isGateAdjusting, hasGateBeenAdjusted]); 

  // --- 6. 播放與操作邏輯 (Handlers) ---

  const playBuffer = useCallback((buffer, type, offset) => {
    if (!audioContext || !buffer) return;
    if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch(e){} }
    if (drySourceNodeRef.current) { try { drySourceNodeRef.current.stop(); drySourceNodeRef.current.disconnect(); } catch(e){} }
    if (audioContext.state === 'suspended') audioContext.resume();
    let safeOffset = offset; if (safeOffset >= buffer.duration) safeOffset = 0;
    startTimeRef.current = audioContext.currentTime; startOffsetRef.current = safeOffset;
    const source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(audioContext.destination);
    sourceNodeRef.current = source; source.start(0, safeOffset);
    if (type === 'processed' && originalBuffer && !isDeltaMode) {
        const drySrc = audioContext.createBufferSource(); drySrc.buffer = originalBuffer;
        const dryGn = audioContext.createGain(); dryGn.gain.value = Math.pow(10, dryGain / 20);
        drySrc.connect(dryGn); dryGn.connect(audioContext.destination);
        drySourceNodeRef.current = drySrc; dryGainNodeRef.current = dryGn; drySrc.start(0, safeOffset);
    }
    setPlayingType(type); setLastPlayedType(type);
    cancelAnimationFrame(rafIdRef.current); rafIdRef.current = requestAnimationFrame(animate);
  }, [audioContext, animate, originalBuffer, dryGain, isDeltaMode]);
  
  useEffect(() => { playBufferRef.current = playBuffer; }, [playBuffer]);

  const togglePlayback = useCallback(() => {
      if (!originalBuffer) return;
      if (playingType !== 'none') {
          const elapsed = audioContext.currentTime - startTimeRef.current; startOffsetRef.current += elapsed;
          if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch(e){} sourceNodeRef.current = null; }
          if (drySourceNodeRef.current) { try { drySourceNodeRef.current.stop(); drySourceNodeRef.current.disconnect(); } catch(e){} drySourceNodeRef.current = null; }
          setPlayingType('none'); cancelAnimationFrame(rafIdRef.current);
      } else {
          const targetBuffer = lastPlayedType === 'original' ? originalBuffer : (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
          if (targetBuffer) playBuffer(targetBuffer, lastPlayedType, startOffsetRef.current);
      }
  }, [playingType, lastPlayedType, originalBuffer, playBuffer, audioContext, isDeltaMode]);

  const handleModeChange = (type) => {
      setLastPlayedType(type);
      if (!gainAdjustedRef.current) { if (type === 'original') setDryGain(0); else setDryGain(-60); }
      if (playingType !== 'none') {
          const targetBuffer = type === 'original' ? originalBuffer : (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
          const elapsed = audioContext.currentTime - startTimeRef.current; const currentPos = startOffsetRef.current + elapsed;
          if (targetBuffer) playBuffer(targetBuffer, type, currentPos);
      }
  };

  const toggleDeltaMode = (e) => { e.stopPropagation(); if (lastPlayedType === 'original') return; setIsDeltaMode(prev => !prev); };

  // --- Parameter Change Helpers ---
  const updateParamGeneric = (setter, value) => { 
      setter(value); 
      setIsCustomSettings(true); 
      setIsProcessing(true); 
      if (lastPlayedType !== 'processed') handleModeChange('processed'); 
  };
  
  const handleCompKnobChange = (key, value) => {
      switch(key) {
          case 'attack': updateParamGeneric(setAttack, value); break;
          case 'release': updateParamGeneric(setRelease, value); break;
          case 'knee': updateParamGeneric(setKnee, value); break;
          case 'lookahead': updateParamGeneric(setLookahead, value); break;
      }
  };

  const updateGateParam = (key, value) => {
      switch(key) {
          case 'gateRatio': updateParamGeneric(setGateRatio, value); break;
          case 'gateAttack': updateParamGeneric(setGateAttack, value); break;
      }
  };

  const handleGainChange = (key, value) => {
      if(key === 'makeupGain') setMakeupGain(value);
      if(key === 'dryGain') setDryGain(value);
      gainAdjustedRef.current = true; setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed');
  };

  // --- A/B Memory & State Snapshots ---
  const getCurrentStateSnapshot = () => ({
      threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, dryGain,
      gateThreshold, gateRatio, gateAttack, gateRelease,
      zoomX, zoomY, panOffset, panOffsetY, cuePoint, loopStart, loopEnd,
      selectedPresetIdx, isCustomSettings
  });

  const applyStateSnapshot = (snap) => {
      if(!snap) return;
      setThreshold(snap.threshold); setRatio(snap.ratio); setRatioControl(snap.ratioControl);
      setAttack(snap.attack); setRelease(snap.release); setKnee(snap.knee); setLookahead(snap.lookahead);
      setMakeupGain(snap.makeupGain); setDryGain(snap.dryGain);
      setGateThreshold(snap.gateThreshold); setGateRatio(snap.gateRatio); setGateAttack(snap.gateAttack); setGateRelease(snap.gateRelease);
      setZoomX(snap.zoomX); setZoomY(snap.zoomY); setPanOffset(snap.panOffset); setPanOffsetY(snap.panOffsetY); setCuePoint(snap.cuePoint);
      setLoopStart(snap.loopStart || null); setLoopEnd(snap.loopEnd || null);
      setSelectedPresetIdx(snap.selectedPresetIdx); setIsCustomSettings(snap.isCustomSettings);
      
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
          zoomX: 1, zoomY: 1, panOffset: 0, panOffsetY: 0, cuePoint: 0, loopStart: null, loopEnd: null,
          selectedPresetIdx: 0, isCustomSettings: false
      };
  };

  const prepareSourceChange = (newId) => {
      if (currentSourceId && abMemoryRef.current[currentSourceId]) {
          abMemoryRef.current[currentSourceId][activeSlot] = getCurrentStateSnapshot();
      }
      if (!abMemoryRef.current[newId]) {
          abMemoryRef.current[newId] = { A: getDefaultSnapshot(), B: null, activeSlot: 'A' };
      }
      const newMem = abMemoryRef.current[newId];
      return { slot: newMem.activeSlot, snapshot: newMem[newMem.activeSlot] };
  };

  const handleABSwitch = (clickedSlot) => {
      if (!currentSourceId) return;
      const mem = abMemoryRef.current[currentSourceId];
      if (!mem) return;
      mem[activeSlot] = getCurrentStateSnapshot();
      
      let targetSlot = clickedSlot;
      if (clickedSlot === activeSlot) targetSlot = activeSlot === 'A' ? 'B' : 'A';
      if (!mem[targetSlot]) mem[targetSlot] = getDefaultSnapshot();
      
      const mixedSnapshot = { ...mem[targetSlot], zoomX, zoomY, panOffset, panOffsetY, cuePoint }; // Keep view
      applyStateSnapshot(mixedSnapshot);
      mem.activeSlot = targetSlot; setActiveSlot(targetSlot);
  };

  // --- Loading Logic ---
  const applyPreset = (idx) => {
      const p = PRESETS_DATA[idx]; if (!p) return;
      setSelectedPresetIdx(idx); setIsCustomSettings(false); setShowInfoPanel(true); setIsProcessing(true);
      setThreshold(p.params.threshold); setRatio(p.params.ratio); setRatioControl(calculateControlFromRatio(p.params.ratio));
      setAttack(p.params.attack); setRelease(p.params.release); setKnee(p.params.knee); setLookahead(p.params.lookahead);
      setMakeupGain(p.params.makeupGain); setDryGain(p.params.dryGain); setGateThreshold(p.params.gateThreshold);
      if (idx === 0) setGateRatio(4);
      if (lastPlayedType !== 'processed') handleModeChange('processed');
  };

  const resetAllParams = useCallback(() => {
      applyPreset(0); setPanOffsetY(0); setZoomY(1); setPanOffset(0); setZoomX(1); 
      setLoopStart(null); setLoopEnd(null);
      gainAdjustedRef.current = false; setHasThresholdBeenAdjusted(false); setHasGateBeenAdjusted(false); setIsDeltaMode(false);
  }, []);
  const resetView = useCallback(() => { setPanOffsetY(0); setZoomY(1); setPanOffset(0); setZoomX(1); }, []);

  const handleDecodedBuffer = (decodedBuffer) => {
    const length = decodedBuffer.length; const sampleRate = decodedBuffer.sampleRate; const monoData = new Float32Array(length);
    if (decodedBuffer.numberOfChannels > 1) { const left = decodedBuffer.getChannelData(0); const right = decodedBuffer.getChannelData(1); for(let i=0; i<length; i++) monoData[i] = (left[i] + right[i]) / 2; } 
    else { monoData.set(decodedBuffer.getChannelData(0)); }
    let maxPeak = 0; for(let i=0; i<length; i++) { const abs = Math.abs(monoData[i]); if (abs > maxPeak) maxPeak = abs; }
    const targetPeak = Math.pow(10, -0.1 / 20); if (maxPeak > 0.0001) { const norm = targetPeak / maxPeak; for(let i=0; i<length; i++) monoData[i] *= norm; }
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
      const { slot, snapshot } = prepareSourceChange(preset.id);
      try { setIsLoading(true); setErrorMsg(''); if(sourceNodeRef.current) try{ sourceNodeRef.current.stop(); } catch(e){} 
          setPlayingType('none'); setOriginalBuffer(null); setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0; setCurrentSourceId(preset.id); setFileName(preset.name);
          applyStateSnapshot(snapshot); setActiveSlot(slot);
          let arrayBuffer; try { const res = await fetch(preset.url); if (!res.ok) throw new Error('Direct fetch failed'); arrayBuffer = await res.arrayBuffer(); } catch (e) { const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(preset.url)}`; const res = await fetch(pUrl); if(!res.ok) throw new Error('Failed'); arrayBuffer = await res.arrayBuffer(); }
          const decoded = await audioContext.decodeAudioData(arrayBuffer); handleDecodedBuffer(decoded); setIsLoading(false);
      } catch (err) { console.error(err); setErrorMsg(`載入失敗: ${err.message}`); setIsLoading(false); }
  };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file || !audioContext) return;
    const { slot, snapshot } = prepareSourceChange('upload');
    try { 
        setIsLoading(true); setErrorMsg(''); if(sourceNodeRef.current) try{ sourceNodeRef.current.stop(); } catch(e){} 
        setPlayingType('none'); setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0; setCurrentSourceId('upload'); setFileName(file.name); setOriginalBuffer(null);
        applyStateSnapshot(snapshot); setActiveSlot(slot);
        const ab = await file.arrayBuffer(); const decoded = await audioContext.decodeAudioData(ab); 
        userBufferRef.current = decoded; userFileNameRef.current = file.name;
        handleDecodedBuffer(decoded); setIsLoading(false);
    } catch (err) { setErrorMsg(`Failed: ${err.message}`); setIsLoading(false); }
  };

  const restoreUserUpload = () => {
    if (!userBufferRef.current || !audioContext) return;
    const { slot, snapshot } = prepareSourceChange('upload');
    if(sourceNodeRef.current) try{ sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch(e){} 
    setPlayingType('none'); setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0; setCurrentSourceId('upload'); setFileName(userFileNameRef.current);
    applyStateSnapshot(snapshot); setActiveSlot(slot);
    handleDecodedBuffer(userBufferRef.current);
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
              for(let i=0; i<inputData.length; i++) mixedData[i] = res.outputData[i] + (inputData[i] * dryLinear);
              const exportBuffer = audioContext.createBuffer(1, inputData.length, originalBuffer.sampleRate);
              exportBuffer.copyToChannel(mixedData, 0);
              const url = URL.createObjectURL(writeWavFile(exportBuffer));
              const dlName = `${fileName.substring(0, fileName.lastIndexOf('.')) || fileName} 壓縮後結果.wav`;
              const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = dlName; document.body.appendChild(a); a.click();
              setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
          } catch(e) { console.error(e); setErrorMsg("匯出失敗"); } finally { setIsLoading(false); }
      }, 50);
  };
  
  useEffect(() => { if (audioContext && !originalBuffer && !currentSourceId && !isLoading) loadPreset(AUDIO_SOURCES[0]); }, [audioContext]); 

  // --- 7. 滑鼠互動 (Mouse Interactions for Waveform) ---
  
  const handleWaveformMouseDown = (e) => { 
      if (isDraggingKnobRef.current || !originalBuffer) return; 
      
      if (hoverLine) {
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
          const PADDING = 24; const maxH = (height/2) - PADDING; const ampScale = maxH * zoomY; const centerY = (height / 2) + panOffsetY;
          const distFromCenter = Math.abs(relY - centerY);
          const linearAmp = distFromCenter / ampScale;
          let newDb = linearAmp > 0.000001 ? 20 * Math.log10(linearAmp) : -100;
          if (newDb > 0) newDb = 0;
          
          if (isDraggingLineRef.current === 'comp') {
              if (newDb < -60) newDb = -60;
              setThreshold(Math.round(newDb)); setHasThresholdBeenAdjusted(true); setIsCompAdjusting(true);
          } else if (isDraggingLineRef.current === 'gate') {
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
              setLoopStart(null); setLoopEnd(null);
              startOffsetRef.current = seekTime;
              if (playingType !== 'none') {
                  const targetBuffer = playingType === 'original' ? originalBuffer : (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
                   if (targetBuffer) playBufferRef.current(targetBuffer, playingType, seekTime);
              }
          }
      }
  }, [originalBuffer, onWaveformGlobalMove, playingType, panOffset, zoomX, isDeltaMode]);

  const handleLocalMouseMove = (e) => {
      if (isDraggingRef.current || isDraggingLineRef.current || isCreatingLoopRef.current) return; 
      if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;
      
      const rect = waveformCanvasRef.current.getBoundingClientRect(); 
      const relX = e.clientX - rect.left; const relY = e.clientY - rect.top; const height = rect.height; 
      const PADDING = 24; const maxH = (height/2) - PADDING; const ampScale = maxH * zoomY; const centerY = (height / 2) + panOffsetY;

      setMousePos({ x: relX, y: relY }); 
      
      const HIT_TOLERANCE = 8; 
      const compThreshPx = Math.pow(10, threshold/20) * ampScale;
      const gateThreshPx = Math.pow(10, gateThreshold/20) * ampScale;

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
  useEffect(() => { if (playingType !== 'none') { cancelAnimationFrame(rafIdRef.current); animate(); } }, [playingType, animate]);

  // --- 8. Render ---
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden p-4 relative">
      <Header 
          fileName={fileName} 
          resolutionPct={resolutionPct} setResolutionPct={setResolutionPct}
          currentSourceId={currentSourceId} 
          handleFileUpload={handleFileUpload} restoreUserUpload={restoreUserUpload}
          userBufferRef={userBufferRef} userFileNameRef={userFileNameRef}
          handleDownload={handleDownload} isLoading={isLoading}
          loadPreset={loadPreset}
          isInfoPanelEnabled={isInfoPanelEnabled} setIsInfoPanelEnabled={setIsInfoPanelEnabled}
          fileInputRef={fileInputRef}
      />

      <div className="flex-1 flex min-h-0 gap-4 relative">
            <Waveform 
                canvasRef={waveformCanvasRef}
                containerRef={containerRef}
                playheadRef={playheadRef}
                cueMarkerRef={cueMarkerRef}
                onMouseDown={handleWaveformMouseDown}
                onMouseMove={handleLocalMouseMove}
                onMouseLeave={handleLocalMouseMove}
            >
                <DraggableLegend />
                <DraggableViewControls 
                    zoomX={zoomX} setZoomX={(z) => {
                        setZoomX(z);
                        if(waveformCanvasRef.current&&originalBuffer){ 
                            const w=canvasDims.width; const cr=cuePoint/originalBuffer.duration; 
                            let nP=(w/3)-(cr*w*z); const mP=w-(w*z); 
                            if(nP>0)nP=0; if(nP<mP)nP=mP; setPanOffset(nP); 
                        }
                    }} 
                    zoomY={zoomY} setZoomY={setZoomY} 
                    onReset={resetView} 
                    containerHeight={canvasDims.height}
                />
                {isInfoPanelEnabled && showInfoPanel && activeInfo && (
                    <DraggableInfoPanel title={activeInfo.title} content={activeInfo.content} onClose={() => setIsInfoPanelEnabled(false)} />
                )}
            </Waveform>
            
            <Meters grCanvasRef={grBarCanvasRef} outputCanvasRef={outputMeterCanvasRef} height={canvasDims.height} />
      </div>

      <ControlHud
          // Gate
          gateThreshold={gateThreshold} gateRatio={gateRatio} gateAttack={gateAttack} gateRelease={gateRelease}
          handleGateThresholdChange={(v) => { updateParamGeneric(setGateThreshold, v); if (!hasGateBeenAdjusted) setHasGateBeenAdjusted(true); }}
          updateParam={updateGateParam}
          handleGateDragState={(isActive) => { setIsKnobDragging(isActive); setIsGateAdjusting(isActive); }}
          hasGateBeenAdjusted={hasGateBeenAdjusted}
          // Comp
          threshold={threshold} ratio={ratio} ratioControl={ratioControl} attack={attack} release={release} knee={knee} lookahead={lookahead}
          handleThresholdChange={(v) => { updateParamGeneric(setThreshold, v); setHasThresholdBeenAdjusted(true); }}
          updateRatio={(v) => { setRatioControl(v); setRatio(calculateRatioFromControl(v)); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }}
          handleCompKnobChange={handleCompKnobChange}
          handleCompDragState={(isActive) => { setIsKnobDragging(isActive); setIsCompAdjusting(isActive); }}
          hasThresholdBeenAdjusted={hasThresholdBeenAdjusted}
          // Output
          makeupGain={makeupGain} dryGain={dryGain}
          handleGainChange={handleGainChange}
          // Controls
          playingType={playingType} lastPlayedType={lastPlayedType} isDryMode={isDryMode} isDeltaMode={isDeltaMode}
          handleModeChange={handleModeChange} toggleDeltaMode={toggleDeltaMode} togglePlayback={togglePlayback}
          // A/B & Presets
          activeSlot={activeSlot} handleABSwitch={handleABSwitch}
          selectedPresetIdx={selectedPresetIdx} isCustomSettings={isCustomSettings} applyPreset={applyPreset}
          // Interactions
          isDraggingKnobRef={isDraggingKnobRef} handleNormalDragState={setIsKnobDragging} handleKnobEnter={(k) => { setHoveredKnob(k); setShowInfoPanel(true); }} handleKnobLeave={() => setHoveredKnob(null)}
          resetAllParams={resetAllParams}
      />

      {isLoading && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-slate-800 p-4 rounded text-white flex items-center gap-2"><Gauge className="animate-spin"/> Loading...</div></div>}
      {errorMsg && <div className="fixed top-4 right-4 bg-red-900/90 text-white p-4 rounded shadow-xl border border-red-500 max-w-sm z-50">{errorMsg}</div>}
    </div>
  );
};

export default App;