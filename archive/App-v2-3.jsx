import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Play, Square, Volume2, Volume1, MicVocal, Gauge, Upload, Music, 
    Settings2, Disc, Zap, Activity, AudioWaveform, AlertCircle, 
    RotateCcw, MoveHorizontal, MoveVertical, Pause, HelpCircle, Keyboard, Info, Palette, MousePointer2, Maximize2, Undo2, GripHorizontal, Triangle, ChevronDown, X,
    ToggleLeft, ToggleRight, Download, Ban, ZapOff, Sliders, Settings, Eye, User, Layers
} from 'lucide-react';

/**
 * 壓縮器波形顯示器 Compressor Visualizer v2.2.2 (Loop Logic Updated)
 * * --- 修改紀錄 (Changelog) ---
 * 1. Loop 互動邏輯更新:
 *    - 點擊波形 (Click): 跳轉 Playhead，但不清除當前 Loop 範圍。
 *    - 拖曳波形 (Drag): 自動建立新 Loop (舊 Loop 會被新範圍取代)。
 */

// --- 資料常數 ---

const PRESETS_DATA = [
    { 
        name: "Default (初始設定)", 
        explanation: "這是壓縮器的初始狀態。Threshold 為 0dB，Ratio 為 4:1，不會對聲音產生任何壓縮。適合用來聆聽原始訊號，或作為從零開始調整的起點。",
        params: { threshold: 0, ratio: 4, attack: 15, release: 150, knee: 0, lookahead: 0, makeupGain: 0, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Subtle Vocal Control (輕微人聲控制)", 
        explanation: "溫和的壓縮設定。低 Ratio (2.5:1) 配合較慢的 Attack，旨在輕輕撫平人聲的動態，保留自然的呼吸感，不會讓聽眾察覺到明顯的壓縮痕跡。",
        params: { threshold: -20, ratio: 2.5, attack: 10, release: 200, knee: 5, lookahead: 2, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Aggressive Rap Vocal (激進饒舌人聲)", 
        explanation: "為了讓饒舌人聲在擁擠的混音中突圍，使用了高 Ratio (8:1) 和極快的 Attack。這會壓平所有動態，讓每一個字都像子彈一樣清晰有力。",
        params: { threshold: -28, ratio: 8, attack: 2, release: 80, knee: 2, lookahead: 5, makeupGain: 8, dryGain: -60, gateThreshold: -45, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Vocal Bus Glue (人聲總線黏合)", 
        explanation: "當多軌人聲混合時，使用中等 Attack (30ms) 讓瞬態通過，然後用 Release 將尾韻拉起。這能讓合聲與主唱聽起來像是在同一個空間演唱，產生「黏合」感。",
        params: { threshold: -24, ratio: 3, attack: 30, release: 100, knee: 10, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Acoustic Guitar Leveler (木吉他平整化)", 
        explanation: "木吉他掃弦時動態差異很大。這裡使用軟膝 (Soft Knee) 和較慢的 Release，讓壓縮動作非常平滑，避免吉他聲音出現「抽吸感」(Pumping)，保持穩定的延音。",
        params: { threshold: -25, ratio: 4, attack: 20, release: 250, knee: 15, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -55, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Snare Snap (小鼓衝擊感)", 
        explanation: "慢 Attack (35ms) 是關鍵！它允許小鼓敲擊瞬間的「啪」聲通過，然後壓縮器才介入壓低後續聲音。這會人為地放大敲擊感 (Transient)，讓小鼓更兇猛。",
        params: { threshold: -18, ratio: 5, attack: 35, release: 80, knee: 0, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -40, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Kick Drum Tight (大鼓緊實化)", 
        explanation: "針對大鼓，我們需要控制其低頻尾音。較短的 Release (60ms) 讓壓縮器隨著節奏快速復位，防止大鼓的低頻糊成一團，讓節奏聽起來更緊湊。",
        params: { threshold: -20, ratio: 6, attack: 40, release: 60, knee: 2, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Drum Bus Smash (鼓組極限壓縮)", 
        explanation: "極端設定 (20:1 Ratio)。這通常用於 Parallel Compression。它將鼓組壓得粉碎，產生巨大的能量感與空間殘響，然後你可以稍微混合一點進去增加厚度。",
        params: { threshold: -30, ratio: 20, attack: 5, release: 120, knee: 5, lookahead: 0, makeupGain: 12, dryGain: -10, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Parallel Compression (平行壓縮)", 
        explanation: "注意看 Dry Gain！這個 Preset 混合了未壓縮的乾訊號 (0dB) 與被重度壓縮的濕訊號。這能在保留原始動態衝擊力的同時，大幅提升細節音量。",
        params: { threshold: -35, ratio: 12, attack: 0.5, release: 200, knee: 10, lookahead: 0, makeupGain: 0, dryGain: 0, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Mastering Glue (母帶黏合)", 
        explanation: "母帶處理的經典設定。低 Ratio (2:1) 和長 Attack/Release。目的不是改變音色，而是讓整首歌的所有樂器在動態上微幅「擁抱」在一起，增加整體感。",
        params: { threshold: -10, ratio: 2, attack: 50, release: 300, knee: 12, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Brickwall Limiter (磚牆限制器)", 
        explanation: "無限大的 Ratio (100:1) 加上 Lookahead。這是一道牆，保證聲音絕對不會超過 Threshold。通常放在訊號鏈的最後，用來最大化音量並防止破音。",
        params: { threshold: -12, ratio: 100, attack: 0.1, release: 50, knee: 0, lookahead: 5, makeupGain: 12, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
    { 
        name: "Bass Sustain (貝斯延音增強)", 
        explanation: "貝斯需要穩定的低頻地基。長 Release (400ms) 確保壓縮器在貝斯撥奏後持續壓制，當壓縮釋放時，會自然地帶起尾音，讓貝斯線條連綿不斷。",
        params: { threshold: -25, ratio: 4, attack: 15, release: 400, knee: 6, lookahead: 0, makeupGain: 6, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 } 
    },
];

const AUDIO_SOURCES = [
    { id: 'vocal', name: 'Vocal (人聲)', Icon: MicVocal, url: 'https://onetrackstudiohk.b-cdn.net/gemini%20compress%20demo%20stems/vocal.mp3' },
    { id: 'snare', name: 'Snare (小鼓)', Icon: Zap, url: 'https://onetrackstudiohk.b-cdn.net/gemini%20compress%20demo%20stems/snare.mp3' },
    { id: 'kick',  name: 'Kick (大鼓)',  Icon: Disc, url: 'https://onetrackstudiohk.b-cdn.net/gemini%20compress%20demo%20stems/kick.mp3' },
    { id: 'bass',  name: 'Bass (貝斯)',  Icon: AudioWaveform, url: 'https://onetrackstudiohk.b-cdn.net/gemini%20compress%20demo%20stems/bass.mp3' },
];

const TOOLTIPS = {
    threshold: { title: "Threshold (門檻值)", desc: "決定壓縮器何時開始工作。", setting: "數值越低，壓縮越多。", visual: "GR 曲線凹陷點。", common: "Vocal: -20dB" },
    ratio: { title: "Ratio (壓縮比)", desc: "決定壓縮強度。", setting: "往右越強。", visual: "GR 深度。", common: "Vocal: 2:1-4:1" },
    attack: { title: "Attack (啟動)", desc: "反應速度。", setting: "往左快，往右慢(保留Punch)。", visual: "下陷斜率。", common: "Fast: Peak control" },
    release: { title: "Release (釋放)", desc: "回復速度。", setting: "往左快(響)，往右慢(穩)。", visual: "回升斜率。", common: "Vocal: 100ms+" },
    knee: { title: "Knee (轉折)", desc: "觸發平滑度。", setting: "往右越軟。", visual: "轉折圓滑度。", common: "Soft: 自然" },
    lookahead: { title: "Lookahead (預讀)", desc: "提前反應。", setting: "防止瞬態過大。", visual: "GR 提前發生。", common: "Limiter: 2ms+" },
    makeup: { title: "Makeup Gain", desc: "音量補償。", setting: "補回被壓小的音量。", visual: "藍色波形變大。", common: "+2~6dB" },
    dryGain: { title: "Dry Gain", desc: "原始訊號混合。", setting: "平行壓縮用。", visual: "黃色波形。", common: "Parallel: -10dB" },
    gateThreshold: { title: "Gate Thresh", desc: "噪音門檻。", setting: "低於此音量靜音。", visual: "紅色底部。", common: "-60dB" },
    gateRatio: { title: "Gate Ratio", desc: "衰減強度。", setting: "越大越乾淨。", visual: "切除深度。", common: "4:1" },
    gateAttack: { title: "Gate Attack", desc: "開啟速度。", setting: "通常極快。", visual: "開頭完整度。", common: "<1ms" },
};

// --- Helper to write WAV file ---
const writeWavFile = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample, offset = 0, pos = 0;

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate); setUint32(audioBuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

    for(i = 0; i < audioBuffer.numberOfChannels; i++) channels.push(audioBuffer.getChannelData(i));
    while(pos < audioBuffer.length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][pos]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
            view.setInt16(44 + offset, sample, true);
            offset += 2;
        }
        pos++;
    }
    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
    return new Blob([buffer], { type: "audio/wav" });
};

// --- 核心 DSP 運算函式 ---
const processCompressor = (inputData, sampleRate, params, step = 1) => {
    const { 
        threshold, ratio, attack, release, knee, lookahead, 
        makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease 
    } = params;
    
    const length = inputData.length;
    const outputData = new Float32Array(length);
    const grCurve = new Float32Array(length);
    const makeUpLinear = Math.pow(10, makeupGain / 20);
    const effectiveSampleRate = sampleRate / step;

    const attTime = (attack / 1000) * effectiveSampleRate;
    const relTime = (release / 1000) * effectiveSampleRate;
    const gAttTime = (gateAttack / 1000) * effectiveSampleRate;
    const gRelTime = (gateRelease / 1000) * effectiveSampleRate;

    const compAttCoeff = 1 - Math.exp(-1 / attTime);
    const compRelCoeff = 1 - Math.exp(-1 / relTime);
    const gateAttCoeff = 1 - Math.exp(-1 / gAttTime);
    const gateRelCoeff = 1 - Math.exp(-1 / gRelTime);
    const lookaheadSamples = Math.floor(((lookahead / 1000) * effectiveSampleRate)); 

    let compEnvelope = 0;
    let gateEnvelope = 0;

    for (let i = 0; i < length; i++) {
        let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
        const inputLevel = Math.abs(inputData[detectorIndex]);
        const currentInput = inputData[i];

        // Gate
        if (inputLevel > gateEnvelope) gateEnvelope += gateAttCoeff * (inputLevel - gateEnvelope);
        else gateEnvelope += gateRelCoeff * (inputLevel - gateEnvelope);

        let gateGaindB = 0;
        let gateEnvdB = 20 * Math.log10(gateEnvelope + 1e-6);
        if (gateEnvdB < gateThreshold) gateGaindB = -(gateThreshold - gateEnvdB) * (gateRatio - 1);
        const gateGainLinear = Math.pow(10, gateGaindB / 20);
        const gatedDetectorLevel = inputLevel * gateGainLinear;
        
        // Comp
        if (gatedDetectorLevel > compEnvelope) compEnvelope += compAttCoeff * (gatedDetectorLevel - compEnvelope);
        else compEnvelope += compRelCoeff * (gatedDetectorLevel - compEnvelope);

        let compEnvdB = 20 * Math.log10(compEnvelope + 1e-6);
        let compGainReductiondB = 0;

        if (compEnvdB > threshold - knee/2) {
             if (knee > 0 && compEnvdB < threshold + knee/2) {
                let slope = 1 - (1/ratio);
                let over = compEnvdB - (threshold - knee/2);
                compGainReductiondB = -slope * ((over * over) / (2 * knee)); 
            } else if (compEnvdB >= threshold + knee/2) {
                compGainReductiondB = (threshold - compEnvdB) * (1 - 1 / ratio);
            }
        }

        const compGainLinear = Math.pow(10, compGainReductiondB / 20);
        outputData[i] = currentInput * gateGainLinear * compGainLinear * makeUpLinear;
        grCurve[i] = Math.min(0, gateGaindB + compGainReductiondB);
    }

    return { outputData, grCurve, visualInput: inputData };
};

const App = () => {
  // --- 狀態管理 ---
  const [isLoading, setIsLoading] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [originalBuffer, setOriginalBuffer] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [currentSourceId, setCurrentSourceId] = useState(null);
  
  // Persistent User Upload
  const userBufferRef = useRef(null);
  const userFileNameRef = useRef("");

  // --- A/B MEMORY SYSTEM ---
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
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsRef = useRef(null);
  
  // UI
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [isCustomSettings, setIsCustomSettings] = useState(false); 
  const [hoveredKnob, setHoveredKnob] = useState(null); 
  const [showInfoPanel, setShowInfoPanel] = useState(true); 
  const [isInfoPanelEnabled, setIsInfoPanelEnabled] = useState(true);

  // Interaction (Knobs)
  const [isKnobDragging, setIsKnobDragging] = useState(false); 
  const [isCompAdjusting, setIsCompAdjusting] = useState(false); 
  const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(false); 
  const [isGateAdjusting, setIsGateAdjusting] = useState(false);
  const [hasGateBeenAdjusted, setHasGateBeenAdjusted] = useState(false);
  const isDraggingKnobRef = useRef(false); 
  const gainAdjustedRef = useRef(false); 
  const hoverGrRef = useRef(0);

  // Interaction (Lines & Loop)
  const [hoverLine, setHoverLine] = useState(null); // 'comp' | 'gate' | null
  const isDraggingLineRef = useRef(null); // 'comp' | 'gate' | null
  const isCreatingLoopRef = useRef(false); // True if dragging to create loop

  // Loop State
  const [loopStart, setLoopStart] = useState(null);
  const [loopEnd, setLoopEnd] = useState(null);

  // Refs & Canvas
  const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
  const [hoverDb, setHoverDb] = useState(null); 
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
  
  // EXPANDED METER STATE
  const meterStateRef = useRef({ 
      peakLevel: 0, holdPeakLevel: 0, holdTimer: 0, 
      dryPeakLevel: 0, dryHoldPeakLevel: 0, dryHoldTimer: 0,
      grPeakLevel: 0, grHoldPeakLevel: 0, grHoldTimer: 0,
      dryRmsLevel: 0, outRmsLevel: 0
  });
  
  // Viewport Dragging (Refs moved up to fix scoping issue)
  const viewStateRef = useRef({ panOffset, zoomX, panOffsetY, dims: canvasDims });
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0); 
  const dragStartPanRef = useRef(0);
  const dragStartPanYRef = useRef(0); 
  const didDragRef = useRef(false);

  const [visualSourceCache, setVisualSourceCache] = useState({ data: null, step: 1 });
  const [fullAudioData, setFullAudioData] = useState(null);
  const fullAudioDataRef = useRef(null);
  const processingTaskRef = useRef(null); 
  
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Init ---
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

  // --- Click Outside to Close Options ---
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (isOptionsOpen && optionsRef.current && !optionsRef.current.contains(event.target)) {
            setIsOptionsOpen(false);
        }
    };
    if (isOptionsOpen) window.addEventListener('mousedown', handleClickOutside, true);
    return () => window.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOptionsOpen]);

  // --- FIX: Immediate Delta Switch Logic ---
  useEffect(() => {
      if (playingType === 'none' || lastPlayedType === 'original' || !fullAudioDataRef.current) return;
      const targetBuffer = isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer;
      if (targetBuffer && audioContext) {
           const elapsed = audioContext.currentTime - startTimeRef.current;
           const currentPos = startOffsetRef.current + elapsed;
           playBufferRef.current(targetBuffer, 'processed', currentPos);
      }
  }, [isDeltaMode]);

  // Update viewStateRef when props change
  useEffect(() => { viewStateRef.current = { panOffset, zoomX, panOffsetY, dims: canvasDims }; }, [panOffset, zoomX, panOffsetY, canvasDims]);

  // --- A/B STATE HELPERS ---
  const calculateRatioFromControl = (ctrl) => ctrl <= 50 ? 1 + (ctrl / 50) * 4 : (ctrl <= 75 ? 5 + ((ctrl - 50) / 25) * 5 : 10 + ((ctrl - 75) / 25) * 90);
  const calculateControlFromRatio = (r) => r <= 5 ? (r - 1) / 4 * 50 : (r <= 10 ? 50 + (r - 5) / 5 * 25 : 75 + (r - 10) / 90 * 25);

  const getCurrentStateSnapshot = () => ({
      threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, dryGain,
      gateThreshold, gateRatio, gateAttack, gateRelease,
      zoomX, zoomY, panOffset, panOffsetY, cuePoint,
      loopStart, loopEnd,
      selectedPresetIdx, isCustomSettings
  });

  const applyStateSnapshot = (snap) => {
      if(!snap) return;
      setThreshold(snap.threshold); setRatio(snap.ratio); setRatioControl(snap.ratioControl);
      setAttack(snap.attack); setRelease(snap.release); setKnee(snap.knee); setLookahead(snap.lookahead);
      setMakeupGain(snap.makeupGain); setDryGain(snap.dryGain);
      setGateThreshold(snap.gateThreshold); setGateRatio(snap.gateRatio); setGateAttack(snap.gateAttack); setGateRelease(snap.gateRelease);
      setZoomX(snap.zoomX); setZoomY(snap.zoomY); setPanOffset(snap.panOffset); setPanOffsetY(snap.panOffsetY); setCuePoint(snap.cuePoint);
      
      setLoopStart(snap.loopStart || null);
      setLoopEnd(snap.loopEnd || null);

      setSelectedPresetIdx(snap.selectedPresetIdx); setIsCustomSettings(snap.isCustomSettings);
      
      // Sync audio loop logic
      if (playingType === 'none') {
          startOffsetRef.current = snap.cuePoint;
      }
      
      if (lastPlayedType !== 'processed') handleModeChange('processed'); 
      setIsProcessing(true);
  };

  const getDefaultSnapshot = () => {
      const def = PRESETS_DATA[0].params; 
      return {
          ...def,
          ratioControl: calculateControlFromRatio(def.ratio),
          gateRatio: 4, gateAttack: 2, gateRelease: 100, 
          zoomX: 1, zoomY: 1, panOffset: 0, panOffsetY: 0, cuePoint: 0,
          loopStart: null, loopEnd: null,
          selectedPresetIdx: 0, isCustomSettings: false
      };
  };

  const handleABSwitch = (clickedSlot) => {
      if (!currentSourceId) return;
      
      const mem = abMemoryRef.current[currentSourceId];
      if (!mem) return;

      mem[activeSlot] = getCurrentStateSnapshot();

      const currentViewState = { zoomX, zoomY, panOffset, panOffsetY, cuePoint };

      let targetSlot = clickedSlot;
      if (clickedSlot === activeSlot) {
          targetSlot = activeSlot === 'A' ? 'B' : 'A';
      }

      if (!mem[targetSlot]) {
          mem[targetSlot] = getDefaultSnapshot();
      }

      const mixedSnapshot = { ...mem[targetSlot], ...currentViewState };

      applyStateSnapshot(mixedSnapshot);
      mem.activeSlot = targetSlot;
      setActiveSlot(targetSlot);
  };

  // --- SOURCE CHANGE LOGIC ---
  const prepareSourceChange = (newId) => {
      if (currentSourceId && abMemoryRef.current[currentSourceId]) {
          abMemoryRef.current[currentSourceId][activeSlot] = getCurrentStateSnapshot();
      }
      if (!abMemoryRef.current[newId]) {
          const defaultSnap = getDefaultSnapshot();
          abMemoryRef.current[newId] = {
              A: defaultSnap,
              B: null,
              activeSlot: 'A'
          };
      }
      const newMem = abMemoryRef.current[newId];
      return { slot: newMem.activeSlot, snapshot: newMem[newMem.activeSlot] };
  };

  const updateRatio = (val) => {
      setRatioControl(val); setRatio(calculateRatioFromControl(val)); setIsCustomSettings(true);
      setIsProcessing(true); 
      if (lastPlayedType !== 'processed') handleModeChange('processed');
  };

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

  useEffect(() => {
      if (dryGainNodeRef.current && audioContext) {
          dryGainNodeRef.current.gain.setTargetAtTime(Math.pow(10, dryGain / 20), audioContext.currentTime, 0.01);
      }
  }, [dryGain, audioContext]);

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

  // --- REPLACED: Dual Output Meter Drawing Logic ---
  const drawDualMeter = useCallback((canvas, dryPeak, outPeak, dryRms, outRms) => {
      if(!canvas) return;
      const ctx = canvas.getContext('2d'); const { width, height } = canvas; const centerY = height / 2;
      const state = meterStateRef.current;
      
      if (outPeak > state.peakLevel) state.peakLevel = outPeak; else state.peakLevel *= 0.92; 
      if (state.peakLevel > state.holdPeakLevel) { state.holdPeakLevel = state.peakLevel; state.holdTimer = 60; } 
      else { if (state.holdTimer > 0) state.holdTimer--; else state.holdPeakLevel *= 0.98; }

      if (dryPeak > state.dryPeakLevel) state.dryPeakLevel = dryPeak; else state.dryPeakLevel *= 0.92;
      if (state.dryPeakLevel > state.dryHoldPeakLevel) { state.dryHoldPeakLevel = state.dryPeakLevel; state.dryHoldTimer = 60; }
      else { if (state.dryHoldTimer > 0) state.dryHoldTimer--; else state.dryHoldPeakLevel *= 0.98; }

      ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height); 
      
      const PADDING = 24; const maxPixelHeight = (height / 2) - PADDING;
      
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
      [-3, -10, -18, -24, -40].forEach(db => { 
          const dist = Math.pow(10, db/20) * maxPixelHeight; 
          ctx.moveTo(0, centerY-dist); ctx.lineTo(width, centerY-dist); 
          ctx.moveTo(0, centerY+dist); ctx.lineTo(width, centerY+dist); 
      }); 
      ctx.stroke();

      const barWidth = (width / 2) - 4; 

      // Dry Bar
      const dryBarDist = Math.min(state.dryPeakLevel, 1.4) * maxPixelHeight;
      if(dryBarDist > 0) {
          const grad = ctx.createLinearGradient(0, centerY+maxPixelHeight, 0, centerY-maxPixelHeight);
          grad.addColorStop(0, '#ca8a04'); grad.addColorStop(0.5, '#facc15'); grad.addColorStop(1, '#ca8a04'); 
          ctx.fillStyle = grad; ctx.fillRect(2, centerY-dryBarDist, barWidth, dryBarDist*2);
      }
      
      const dryHoldDist = Math.min(state.dryHoldPeakLevel, 1.4) * maxPixelHeight;
      if (dryHoldDist > 0) { ctx.fillStyle = '#fef08a'; ctx.fillRect(2, centerY-dryHoldDist, barWidth, 2); ctx.fillRect(2, centerY+dryHoldDist-2, barWidth, 2); }
      
      // Output Bar
      const outBarDist = Math.min(state.peakLevel, 1.4) * maxPixelHeight;
      if(outBarDist > 0) { 
          const grad = ctx.createLinearGradient(0, centerY+maxPixelHeight, 0, centerY-maxPixelHeight); 
          grad.addColorStop(0, '#ef4444'); grad.addColorStop(0.5, '#22c55e'); grad.addColorStop(1, '#ef4444'); 
          ctx.fillStyle = grad; ctx.fillRect(width/2 + 2, centerY-outBarDist, barWidth, outBarDist*2); 
      }

      const outHoldDist = Math.min(state.holdPeakLevel, 1.4) * maxPixelHeight;
      if (outHoldDist > 0) { ctx.fillStyle = '#fbbf24'; ctx.fillRect(width/2 + 2, centerY-outHoldDist, barWidth, 2); ctx.fillRect(width/2 + 2, centerY+outHoldDist-2, barWidth, 2); }

      // Ghost Peaks
      if (dryBarDist > outBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(width/2 + 2, centerY-dryBarDist, barWidth, 2); ctx.fillRect(width/2 + 2, centerY+dryBarDist-2, barWidth, 2); }
      if (outBarDist > dryBarDist) { ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(2, centerY-outBarDist, barWidth, 2); ctx.fillRect(2, centerY+outBarDist-2, barWidth, 2); }

      if (state.dryPeakLevel > 1.0) { ctx.fillStyle = '#facc15'; ctx.fillRect(2, 0, barWidth, 4); ctx.fillRect(2, height-4, barWidth, 4); }
      if (state.peakLevel > 1.0) { ctx.fillStyle = '#ef4444'; ctx.fillRect(width/2 + 2, 0, barWidth, 4); ctx.fillRect(width/2 + 2, height-4, barWidth, 4); }
      
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; 
      if (state.dryHoldPeakLevel > 0.01) { const dbVal = state.dryHoldPeakLevel < 0.999 ? 20 * Math.log10(state.dryHoldPeakLevel) : 0; ctx.fillStyle = '#fef08a'; ctx.fillText(dbVal.toFixed(1), barWidth/2 + 2, centerY - dryHoldDist - 6); }
      if (state.holdPeakLevel > 0.01) { const dbVal = state.holdPeakLevel < 0.999 ? 20 * Math.log10(state.holdPeakLevel) : 0; ctx.fillStyle = '#fbbf24'; ctx.fillText(dbVal.toFixed(1), width/2 + barWidth/2 + 2, centerY - outHoldDist - 6); }
      
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px sans-serif';
      ctx.fillText("Dry", barWidth/2 + 2, height - 10);
      ctx.fillText("Output", width/2 + barWidth/2 + 2, height - 10);

      ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 10px monospace';
      const dryRmsDb = dryRms > 0.0001 ? 20 * Math.log10(dryRms) : -100;
      const outRmsDb = outRms > 0.0001 ? 20 * Math.log10(outRms) : -100;
      
      ctx.fillText(`${dryRmsDb <= -60 ? '-inf' : dryRmsDb.toFixed(1)}`, barWidth/2 + 2, 12);
      ctx.fillText(`${outRmsDb <= -60 ? '-inf' : outRmsDb.toFixed(1)}`, width/2 + barWidth/2 + 2, 12);
      
      ctx.fillStyle = '#64748b'; ctx.font = '8px sans-serif';
      ctx.fillText("RMS", barWidth/2 + 2, 22);
      ctx.fillText("RMS", width/2 + barWidth/2 + 2, 22);

  }, []);

  const drawGRBar = useCallback((grDb, hoverGrDbVal = null) => {
      const canvas = grBarCanvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); const w = canvas.width; const h = canvas.height; const state = meterStateRef.current;
      const reductionLinear = 1.0 - Math.pow(10, grDb / 20); 
      state.grPeakLevel = reductionLinear;
      if (reductionLinear > state.grHoldPeakLevel) { state.grHoldPeakLevel = reductionLinear; state.grHoldTimer = 60; } else { if (state.grHoldTimer > 0) state.grHoldTimer--; else state.grHoldPeakLevel *= 0.95; }
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 0, w-8, h);
      const PADDING = 24; const maxPixelHeight = ((h / 2) - PADDING) * 0.5; 
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.beginPath(); [-3, -6, -12, -24, -48].forEach(db => { const y = (1-Math.pow(10, db/20)) * maxPixelHeight; if (y < h) { ctx.moveTo(4, y); ctx.lineTo(w-4, y); } }); ctx.stroke();
      if (state.grPeakLevel > 0.001) { const barHeight = state.grPeakLevel * maxPixelHeight; ctx.fillStyle = '#ef4444'; ctx.fillRect(6, 0, w-12, barHeight); ctx.fillStyle = '#fff'; ctx.fillRect(6, barHeight - 2, w-12, 2); }
      if (state.grHoldPeakLevel > 0.001) { const holdHeight = state.grHoldPeakLevel * maxPixelHeight; ctx.fillStyle = '#fbbf24'; ctx.fillRect(4, holdHeight, w-8, 2); let dbVal = state.grHoldPeakLevel < 0.999 ? 20 * Math.log10(1 - state.grHoldPeakLevel) : -100; if (state.grHoldPeakLevel > 0.01) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(dbVal < -60 ? "-inf" : dbVal.toFixed(1), w/2, holdHeight + 14); } }
      
      if (hoverGrDbVal !== null && hoverGrDbVal < -0.1) {
          const hoverY = (1.0 - Math.pow(10, hoverGrDbVal / 20)) * maxPixelHeight;
          ctx.strokeStyle = '#ec4899'; 
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(4, hoverY);
          ctx.lineTo(w-4, hoverY);
          ctx.stroke();
      }

      ctx.fillStyle = '#64748b'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("GR", w/2, h - 8);
  }, []);

  const currentParams = useMemo(() => ({
    threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease
  }), [threshold, ratio, attack, release, knee, lookahead, makeupGain, gateThreshold, gateRatio, gateAttack, gateRelease]);

  // --- Resolution-Based Downsampling ---
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
              if(abs > maxAbs) {
                  maxAbs = abs;
                  chunkVal = val;
              }
          }
          cacheData[i] = chunkVal;
      }
      setVisualSourceCache({ data: cacheData, step: targetStep });
  }, [originalBuffer, resolutionPct]);

  const visualResult = useMemo(() => {
    if (!visualSourceCache.data || !audioContext) return null;
    return processCompressor(visualSourceCache.data, audioContext.sampleRate, currentParams, visualSourceCache.step);
  }, [visualSourceCache, audioContext, currentParams]);

  // 2. Full Audio Result (High Res Chunked)
  useEffect(() => {
    if (!originalBuffer || !audioContext) return;
    fullAudioDataRef.current = null;
    if (processingTaskRef.current) clearTimeout(processingTaskRef.current);

    const inputData = originalBuffer.getChannelData(0);
    const sampleRate = originalBuffer.sampleRate;
    const length = inputData.length;
    const params = currentParams; 
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
    
    let compEnvelope = 0;
    let gateEnvelope = 0;
    const CHUNK_SIZE = 50000; 
    let currentIndex = 0;
    const outData = new Float32Array(length); 
    
    const processChunk = () => {
        const endIndex = Math.min(currentIndex + CHUNK_SIZE, length);
        for (let i = currentIndex; i < endIndex; i++) {
            let detectorIndex = Math.min(i + lookaheadSamples, length - 1);
            const inputLevel = Math.abs(inputData[detectorIndex]);
            const currentInput = inputData[i];
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
            const res = { outputBuffer: outBuf, deltaBuffer: deltaBuf };
            fullAudioDataRef.current = res;
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

  // --- 動畫迴圈 ---
  const animate = useCallback(() => {
    if (!originalBuffer || !audioContext) return;
    const elapsed = audioContext.currentTime - startTimeRef.current;
    const currentPosition = elapsed + startOffsetRef.current;
    const duration = originalBuffer.duration;

    if (waveformCanvasRef.current && playheadRef.current) {
        const width = waveformCanvasRef.current.width;
        const totalWidth = width * zoomX;
        const pct = currentPosition / duration;
        const screenPct = (((pct * totalWidth) + panOffset) / width) * 100;
        playheadRef.current.style.left = `${screenPct}%`;
        playheadRef.current.style.opacity = (screenPct < 0 || screenPct > 100) ? 0 : 1;
    } else if (playheadRef.current) {
        playheadRef.current.style.opacity = 0;
    }

    if (visualResult) {
        const step = visualSourceCache.step;
        const visualIndex = Math.floor((currentPosition * audioContext.sampleRate) / step);
        const windowSize = Math.max(1, Math.floor(2048 / step)); 
        const endIdx = Math.min(visualIndex + windowSize, visualResult.outputData.length);
        
        let currentGR = 0;
        if (visualIndex < visualResult.grCurve.length && visualIndex >= 0) currentGR = visualResult.grCurve[visualIndex];

        let maxMix = 0;
        let maxInput = 0; 
        let sumSqInput = 0; 
        let sumSqMix = 0;    
        let sampleCount = 0;

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
        
        let currentDryRms = sampleCount > 0 ? Math.sqrt(sumSqInput / sampleCount) : 0;
        let currentOutRms = sampleCount > 0 ? Math.sqrt(sumSqMix / sampleCount) : 0;
        
        const smoothingFactor = 0.15; 
        meterStateRef.current.dryRmsLevel = meterStateRef.current.dryRmsLevel * (1 - smoothingFactor) + currentDryRms * smoothingFactor;
        meterStateRef.current.outRmsLevel = meterStateRef.current.outRmsLevel * (1 - smoothingFactor) + currentOutRms * smoothingFactor;

        drawGRBar(isProcessed ? currentGR : 0, hoverGrRef.current);
        if (isProcessed) {
            drawDualMeter(outputMeterCanvasRef.current, maxInput, maxMix, meterStateRef.current.dryRmsLevel, meterStateRef.current.outRmsLevel);
        } else {
            drawDualMeter(outputMeterCanvasRef.current, maxInput, maxInput, meterStateRef.current.dryRmsLevel, meterStateRef.current.dryRmsLevel);
        }
    }

    // --- LOOP & PLAYBACK LOGIC ---
    if (loopStart !== null && loopEnd !== null) {
        // If looping, check if we passed end
        if (currentPosition >= loopEnd) {
             // Seek to loopStart
             if (playBufferRef.current) {
                 const targetBuffer = playingType === 'original' ? originalBuffer : 
                                      (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
                 if (targetBuffer) {
                     playBufferRef.current(targetBuffer, playingType, loopStart);
                     return;
                 }
             }
        }
    } else {
        // No loop, check end of file
        if (currentPosition >= duration) {
            if (playBufferRef.current) {
                const targetBuffer = playingType === 'original' ? originalBuffer : 
                                    (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
                if (targetBuffer) {
                    playBufferRef.current(targetBuffer, playingType, 0); // Restart at beginning
                    return; 
                }
            }
        }
    }

    rafIdRef.current = requestAnimationFrame(animate);
  }, [originalBuffer, audioContext, playingType, visualResult, zoomX, panOffset, drawGRBar, drawDualMeter, dryGain, isDeltaMode, visualSourceCache, loopStart, loopEnd]); 

  // --- 播放控制 ---
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

  // --- Handlers ---
  const updateParam = (setter, value) => { setter(value); setIsCustomSettings(true); setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); };
  const handleCompKnobChange = (setter, value) => { updateParam(setter, value); };
  const handleCompDragState = (isActive) => { setIsKnobDragging(isActive); setIsCompAdjusting(isActive); };
  const handleThresholdChange = (v) => { handleCompKnobChange(setThreshold, v); if (!hasThresholdBeenAdjusted) setHasThresholdBeenAdjusted(true); }
  const handleGateDragState = (isActive) => { setIsKnobDragging(isActive); setIsGateAdjusting(isActive); };
  const handleGateThresholdChange = (v) => { updateParam(setGateThreshold, v); if (!hasGateBeenAdjusted) setHasGateBeenAdjusted(true); };
  const handleNormalDragState = (isActive) => { setIsKnobDragging(isActive); };
  const handleGainChange = (setter, value) => { setter(value); gainAdjustedRef.current = true; setIsProcessing(true); if (lastPlayedType !== 'processed') handleModeChange('processed'); }
  const toggleDeltaMode = (e) => { e.stopPropagation(); if (lastPlayedType === 'original') return; setIsDeltaMode(prev => !prev); };

  const handleKnobEnter = (key) => { setHoveredKnob(key); setShowInfoPanel(true); };
  const handleKnobLeave = () => { setHoveredKnob(null); };

  const getInfoPanelContent = () => {
      if (hoveredKnob && TOOLTIPS[hoveredKnob]) return { title: TOOLTIPS[hoveredKnob].title, content: (<><div className="mb-3 text-slate-300 font-medium">{TOOLTIPS[hoveredKnob].desc}</div><div className="text-yellow-400 font-bold mb-1.5 text-xs uppercase tracking-wide">💡 調整效果</div><div className="text-slate-400 text-sm leading-relaxed mb-3">{TOOLTIPS[hoveredKnob].setting}</div><div className="text-cyan-400 font-bold mb-1.5 text-xs uppercase tracking-wide">⚙️ 常用參數參考</div><div className="text-slate-300 text-sm font-mono bg-black/30 p-2 rounded border border-white/10">{TOOLTIPS[hoveredKnob].common}</div></>) };
      if (!isCustomSettings && selectedPresetIdx !== 0 && PRESETS_DATA[selectedPresetIdx]) return { title: `設定思路: ${PRESETS_DATA[selectedPresetIdx].name.split('(')[0]}`, content: PRESETS_DATA[selectedPresetIdx].explanation };
      return null;
  };
  const activeInfo = getInfoPanelContent();

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

  const handleDecodedBuffer = (decodedBuffer) => {
    const length = decodedBuffer.length; const sampleRate = decodedBuffer.sampleRate; const monoData = new Float32Array(length);
    if (decodedBuffer.numberOfChannels > 1) { const left = decodedBuffer.getChannelData(0); const right = decodedBuffer.getChannelData(1); for(let i=0; i<length; i++) monoData[i] = (left[i] + right[i]) / 2; } 
    else { monoData.set(decodedBuffer.getChannelData(0)); }
    let maxPeak = 0; for(let i=0; i<length; i++) { const abs = Math.abs(monoData[i]); if (abs > maxPeak) maxPeak = abs; }
    const targetPeak = Math.pow(10, -0.1 / 20); if (maxPeak > 0.0001) { const norm = targetPeak / maxPeak; for(let i=0; i<length; i++) monoData[i] *= norm; }
    const monoBuffer = audioContext.createBuffer(1, length, sampleRate); monoBuffer.copyToChannel(monoData, 0);
    setOriginalBuffer(monoBuffer); setFullAudioData(null); fullAudioDataRef.current = null;
    
    const MAX_SMOOTH_POINTS = 250000; 
    let autoPct = 100;
    if (length > MAX_SMOOTH_POINTS) {
        const idealStep = Math.ceil(length / MAX_SMOOTH_POINTS);
        const minPoints = 3000;
        const maxStep = Math.floor(length / minPoints);
        let factor = (idealStep - 1) / (maxStep - 1);
        if (factor < 0) factor = 0; if (factor > 1) factor = 1;
        autoPct = Math.round(100 - (factor * 99));
        if (autoPct === 100 && idealStep > 1) autoPct = 99; 
    }
    setResolutionPct(autoPct);
  };

  const restoreUserUpload = () => {
    if (!userBufferRef.current || !audioContext) return;
    
    // Save current settings before switching
    const { slot, snapshot } = prepareSourceChange('upload');
    
    if(sourceNodeRef.current) try{ sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch(e){} 
    setPlayingType('none');
    setLoopStart(null); setLoopEnd(null); // Reset loop
    startOffsetRef.current = 0;
    setCurrentSourceId('upload');
    setFileName(userFileNameRef.current);
    
    // Apply uploaded settings
    applyStateSnapshot(snapshot);
    setActiveSlot(slot);
    
    handleDecodedBuffer(userBufferRef.current);
  };

  const loadPreset = async (preset) => {
      if (!audioContext) return;
      
      // Save current settings before switching
      const { slot, snapshot } = prepareSourceChange(preset.id);

      try { setIsLoading(true); setErrorMsg(''); if(sourceNodeRef.current) try{ sourceNodeRef.current.stop(); } catch(e){} 
          setPlayingType('none'); setOriginalBuffer(null); setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0; setCurrentSourceId(preset.id); setFileName(preset.name);
          
          // Apply loaded settings
          applyStateSnapshot(snapshot);
          setActiveSlot(slot);

          let arrayBuffer; try { const res = await fetch(preset.url); if (!res.ok) throw new Error('Direct fetch failed'); arrayBuffer = await res.arrayBuffer(); } catch (e) { const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(preset.url)}`; const res = await fetch(pUrl); if(!res.ok) throw new Error('Failed'); arrayBuffer = await res.arrayBuffer(); }
          const decoded = await audioContext.decodeAudioData(arrayBuffer); handleDecodedBuffer(decoded); setIsLoading(false);
      } catch (err) { console.error(err); setErrorMsg(`載入失敗: ${err.message}`); setIsLoading(false); }
  };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file || !audioContext) return;
    
    // Save current settings before switching
    const { slot, snapshot } = prepareSourceChange('upload');

    try { 
        setIsLoading(true); setErrorMsg(''); if(sourceNodeRef.current) try{ sourceNodeRef.current.stop(); } catch(e){} 
        setPlayingType('none'); setLoopStart(null); setLoopEnd(null); startOffsetRef.current = 0; setCurrentSourceId('upload'); setFileName(file.name); setOriginalBuffer(null);
        
        // Apply uploaded settings (or defaults if new)
        applyStateSnapshot(snapshot);
        setActiveSlot(slot);

        const ab = await file.arrayBuffer(); 
        const decoded = await audioContext.decodeAudioData(ab); 
        
        userBufferRef.current = decoded;
        userFileNameRef.current = file.name;

        handleDecodedBuffer(decoded); setIsLoading(false);
    } catch (err) { setErrorMsg(`Failed: ${err.message}`); setIsLoading(false); }
  };
  useEffect(() => { if (audioContext && !originalBuffer && !currentSourceId && !isLoading) loadPreset(AUDIO_SOURCES[0]); }, [audioContext]); 

  // --- Waveform Drag Logic (UPDATED for Lines & Loop) ---
  const handleWaveformMouseDown = (e) => { 
      if (isDraggingKnobRef.current || !originalBuffer) return; 
      
      // 1. Check if dragging a threshold line (Highest Priority)
      if (hoverLine) {
          isDraggingLineRef.current = hoverLine;
          document.body.style.cursor = 'row-resize';
      } else {
          // 2. Start Loop Creation / Click Seek (Medium Priority)
          isCreatingLoopRef.current = true;
          dragStartXRef.current = e.clientX;
          // Don't change cursor yet, wait to see if it's a drag or click
      }
      
      window.addEventListener('mousemove', onWaveformGlobalMove);
      window.addEventListener('mouseup', onWaveformGlobalUp);
  };
  
  const onWaveformGlobalMove = useCallback((e) => {
      // 1. Line Dragging Logic
      if (isDraggingLineRef.current) {
          if (!waveformCanvasRef.current) return;
          const rect = waveformCanvasRef.current.getBoundingClientRect();
          const relY = e.clientY - rect.top;
          const height = rect.height;
          
          // Recalculate geometry
          const PADDING = 24; 
          const maxH = (height/2) - PADDING; 
          const ampScale = maxH * zoomY; 
          const centerY = (height / 2) + panOffsetY;
          
          // Calculate distance from center axis
          const distFromCenter = Math.abs(relY - centerY);
          
          // Convert pixels back to linear amplitude (0.0 - 1.0+)
          const linearAmp = distFromCenter / ampScale;
          
          // Convert linear to dB
          let newDb = linearAmp > 0.000001 ? 20 * Math.log10(linearAmp) : -100;
          
          // Clamp and update
          if (newDb > 0) newDb = 0;
          
          if (isDraggingLineRef.current === 'comp') {
              if (newDb < -60) newDb = -60;
              setThreshold(Math.round(newDb));
              setHasThresholdBeenAdjusted(true);
              setIsCompAdjusting(true);
          } else if (isDraggingLineRef.current === 'gate') {
              if (newDb < -80) newDb = -80;
              setGateThreshold(Math.round(newDb));
              setHasGateBeenAdjusted(true);
              setIsGateAdjusting(true);
          }
          
          setIsCustomSettings(true);
          setIsProcessing(true);
          if (lastPlayedType === 'original') handleModeChange('processed');
          return;
      }

      // 2. Loop Creation Logic (Visualizing Drag)
      if (isCreatingLoopRef.current && waveformCanvasRef.current && originalBuffer) {
          const rect = waveformCanvasRef.current.getBoundingClientRect();
          const startPixelX = dragStartXRef.current - rect.left;
          const currentPixelX = e.clientX - rect.left;
          
          // Only treat as drag if moved more than threshold
          if (Math.abs(e.clientX - dragStartXRef.current) > 5) {
               document.body.style.cursor = 'col-resize';
               // Calculate time from pixels
               const width = rect.width;
               const totalWidth = width * zoomX;
               
               // Helper to map pixel to time
               const pixelToTime = (px) => {
                   const relX = px - panOffset; // position relative to start of waveform
                   let pct = relX / totalWidth;
                   if (pct < 0) pct = 0; if (pct > 1) pct = 1;
                   return pct * originalBuffer.duration;
               };
               
               const t1 = pixelToTime(startPixelX);
               const t2 = pixelToTime(currentPixelX);
               
               setLoopStart(Math.min(t1, t2));
               setLoopEnd(Math.max(t1, t2));
          }
      }
  }, [zoomY, panOffsetY, lastPlayedType, originalBuffer, panOffset, zoomX]); 

  const onWaveformGlobalUp = useCallback((e) => {
      window.removeEventListener('mousemove', onWaveformGlobalMove);
      window.removeEventListener('mouseup', onWaveformGlobalUp);
      
      // Clear line dragging state
      if (isDraggingLineRef.current) {
          isDraggingLineRef.current = null;
          setIsCompAdjusting(false);
          setIsGateAdjusting(false);
          document.body.style.cursor = 'default';
          return;
      }

      if (isCreatingLoopRef.current) {
          isCreatingLoopRef.current = false;
          document.body.style.cursor = 'default';

          // Check if it was a click or drag
          const dragDist = Math.abs(e.clientX - dragStartXRef.current);
          
          if (dragDist < 5 && waveformCanvasRef.current && originalBuffer) {
              // CLICK DETECTED -> Seek ONLY (Loop persists)
              const rect = waveformCanvasRef.current.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const width = rect.width;
              const totalWidth = width * zoomX;
              const relX = clickX - panOffset;
              let pct = relX / totalWidth;
              if (pct < 0) pct = 0; if (pct > 1) pct = 1;
              
              const seekTime = pct * originalBuffer.duration;
              
              // NOTE: setLoopStart(null) and setLoopEnd(null) were removed here
              // to allow the loop to persist when clicking elsewhere.
              
              // Update Start Offset
              startOffsetRef.current = seekTime;
              
              // If playing, restart playback from new position
              if (playingType !== 'none') {
                  const targetBuffer = playingType === 'original' ? originalBuffer : 
                                       (fullAudioDataRef.current ? (isDeltaMode ? fullAudioDataRef.current.deltaBuffer : fullAudioDataRef.current.outputBuffer) : null);
                   if (targetBuffer) {
                       playBufferRef.current(targetBuffer, playingType, seekTime);
                   }
              }
          }
      }
  }, [originalBuffer, onWaveformGlobalMove, playingType, panOffset, zoomX, isDeltaMode]);

  useEffect(() => {
      return () => {
          window.removeEventListener('mousemove', onWaveformGlobalMove);
          window.removeEventListener('mouseup', onWaveformGlobalUp);
      };
  }, [onWaveformGlobalMove, onWaveformGlobalUp]);
  
  const handleLocalMouseMove = (e) => {
      if (isDraggingRef.current || isDraggingLineRef.current || isCreatingLoopRef.current) return; 
      if (isDraggingKnobRef.current || !waveformCanvasRef.current) return;
      
      const rect = waveformCanvasRef.current.getBoundingClientRect(); 
      const relX = e.clientX - rect.left; 
      const relY = e.clientY - rect.top; 
      const height = rect.height; 
      
      const PADDING = 24; 
      const maxH = (height/2) - PADDING; 
      const ampScale = maxH * zoomY; 
      const centerY = (height / 2) + panOffsetY;

      // 1. Calculate dB under cursor
      const distY = Math.abs(relY - centerY); 
      const linearAmp = distY / ampScale; 
      let db = -Infinity; if (linearAmp > 0.000001) db = 20 * Math.log10(linearAmp); 
      setMousePos({ x: relX, y: relY }); 
      setHoverDb(db);

      // 2. Hit Detection for Threshold Lines
      const HIT_TOLERANCE = 8; // Pixels
      const compThreshPx = Math.pow(10, threshold/20) * ampScale;
      const gateThreshPx = Math.pow(10, gateThreshold/20) * ampScale;

      const distToCompTop = Math.abs(relY - (centerY - compThreshPx));
      const distToCompBot = Math.abs(relY - (centerY + compThreshPx));
      const distToGateTop = Math.abs(relY - (centerY - gateThreshPx));
      const distToGateBot = Math.abs(relY - (centerY + gateThreshPx));

      let newHoverLine = null;
      let cursor = 'crosshair'; // Default to crosshair for selection

      // Check Gate first (usually lower)
      if (distToGateTop < HIT_TOLERANCE || distToGateBot < HIT_TOLERANCE) {
          newHoverLine = 'gate';
          cursor = 'row-resize';
      }
      // Check Comp (override if close, usually higher)
      if (distToCompTop < HIT_TOLERANCE || distToCompBot < HIT_TOLERANCE) {
          newHoverLine = 'comp';
          cursor = 'row-resize';
      }

      setHoverLine(newHoverLine);
      if (containerRef.current) containerRef.current.style.cursor = cursor;
  };

  const handleDragStart = (e) => {
     // This is now redundant or can be removed as handleWaveformMouseDown handles logic
     // But we keep it empty or remove if not used elsewhere
  };

  useEffect(() => { const h = (e) => { if (e.code === 'Space') { e.preventDefault(); togglePlayback(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [togglePlayback]);
  useEffect(() => { if (playingType !== 'none') { cancelAnimationFrame(rafIdRef.current); animate(); } }, [playingType, animate]);

  const drawPolygon = useCallback((ctx, points, color, width, centerY, opacity = 1.0) => {
      if(points.length === 0) return; ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, centerY); 
      for(let i=0; i<points.length; i++) ctx.lineTo(points[i].x, points[i].yTop); ctx.lineTo(points[points.length-1].x, centerY); for(let i=points.length-1; i>=0; i--) ctx.lineTo(points[i].x, points[i].yBot); ctx.closePath(); ctx.fill(); ctx.restore();
  }, []);
  const drawGRLine = useCallback((ctx, points, color) => {
      if(points.length === 0) return; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
  }, []);

  // --- Drawing Logic ---
  useEffect(() => {
    const canvas = waveformCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); const { width, height } = canvasDims;
    if (canvas.width !== width) canvas.width = width; if (canvas.height !== height) canvas.height = height;
    
    ctx.setLineDash([]); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);
    
    if (!visualResult) { ctx.fillStyle = '#475569'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('請載入音訊...', width/2, height/2); return; }

    try {
        const srcInput = visualResult.visualInput;
        const srcOutput = visualResult.outputData;
        const srcGR = visualResult.grCurve;
        const srcLength = srcInput.length;
        const step = srcLength / (width * zoomX); 

        if (!Number.isFinite(step) || step <= 0) return;
        
        // --- DRAW LOOP REGION (BEHIND WAVEFORM) ---
        if (loopStart !== null && loopEnd !== null && originalBuffer) {
            const totalWidth = width * zoomX;
            // Map time to x
            const startX = (loopStart / originalBuffer.duration) * totalWidth + panOffset;
            const endX = (loopEnd / originalBuffer.duration) * totalWidth + panOffset;
            const loopW = endX - startX;
            
            if (loopW > 0) {
                ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'; // Tailwind green-500 transparent
                ctx.fillRect(startX, 0, loopW, height);
                
                // Optional: Draw vertical boundary lines
                ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
                ctx.fillRect(startX, 0, 1, height);
                ctx.fillRect(endX, 0, 1, height);
            }
        }

        const PADDING = 24; const centerY = (height / 2) + panOffsetY; const maxPixelHeight = ((height / 2) - PADDING); const ampScale = maxPixelHeight * zoomY; 
        const grMaxHeight = maxPixelHeight * 0.5;

        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
        const gridX = width/4; for(let x=panOffset%gridX; x<width; x+=gridX) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        
        const inPoints = []; const outPoints = []; const corePoints = []; const mixPoints = []; const grPoints = []; 
        const dryLinear = Math.pow(10, dryGain / 20);

        for (let x = 0; x < width; x++) {
            const vX = x - panOffset; 
            const start = Math.floor(vX * step); 
            const end = Math.floor((vX + 1) * step);
            if (start < 0 || start >= srcLength) continue;
            const safeEnd = Math.min(srcLength, end);
            let maxIn = 0; let maxOut = 0; let minGR = 0; let maxMix = 0; 
            const loopStart = Math.max(start, 0);
            const count = safeEnd - loopStart;
            
            if (count > 0) {
                for (let i = loopStart; i < safeEnd; i++) {
                    const absIn = Math.abs(srcInput[i]); const absOut = Math.abs(srcOutput[i]); const grVal = srcGR[i];
                    if (absIn > maxIn) maxIn = absIn; if (absOut > maxOut) maxOut = absOut; if (grVal < minGR) minGR = grVal;
                    if (lastPlayedType === 'processed') { const mixVal = Math.abs(srcOutput[i] + (srcInput[i] * dryLinear)); if (mixVal > maxMix) maxMix = mixVal; }
                }
            } else {
                const idx = Math.min(Math.floor(loopStart), srcLength-1);
                if (idx >= 0) {
                    const maxInVal = Math.abs(srcInput[idx]); const maxOutVal = Math.abs(srcOutput[idx]); 
                    maxIn = maxInVal; maxOut = maxOutVal; minGR = srcGR[idx];
                    if (lastPlayedType === 'processed') maxMix = Math.abs(srcOutput[idx] + (srcInput[idx] * dryLinear));
                }
            }
            
            const hIn = maxIn * ampScale; const hOut = maxOut * ampScale; const hCore = Math.min(hIn, hOut); const hMix = maxMix * ampScale;
            inPoints.push({ x, yTop: centerY - hIn, yBot: centerY + hIn });
            outPoints.push({ x, yTop: centerY - hOut, yBot: centerY + hOut });
            corePoints.push({ x, yTop: centerY - hCore, yBot: centerY + hCore });
            if (lastPlayedType === 'processed') mixPoints.push({ x, yTop: centerY - hMix, yBot: centerY + hMix });
            if (minGR < 0 && lastPlayedType === 'processed') { const yPos = (1.0 - Math.pow(10, minGR / 20)) * grMaxHeight; grPoints.push({ x, y: yPos }); } 
            else if (lastPlayedType === 'processed') { grPoints.push({ x, y: 0 }); }
        }

        if (lastPlayedType === 'original') { drawPolygon(ctx, inPoints, '#facc15', width, centerY); } 
        else { const redOpacity = (isCompAdjusting || isDeltaMode) ? 1.0 : 0.5; drawPolygon(ctx, inPoints, '#ef4444', width, centerY, redOpacity); drawPolygon(ctx, mixPoints, '#facc15', width, centerY); drawPolygon(ctx, outPoints, '#38bdf8', width, centerY); const coreColor = isDeltaMode ? '#94a3b8' : '#ffffff'; drawPolygon(ctx, corePoints, coreColor, width, centerY); }
        
        if (grPoints.length > 0) drawGRLine(ctx, grPoints, '#ef4444'); 

        const drawLabel = (text, x, y, color, align) => {
            ctx.font = 'bold 12px sans-serif';
            const metrics = ctx.measureText(text);
            const bgWidth = metrics.width + 8;
            const bgHeight = 16;
            const bgX = align === 'right' ? x - bgWidth : x;
            const bgY = y - 12;
            ctx.fillStyle = color + 'F2'; 
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            ctx.fillStyle = '#fff'; 
            ctx.textAlign = align;
            ctx.fillText(text, x + (align === 'right' ? -4 : 4), y);
        };

        if(hasThresholdBeenAdjusted || isCompAdjusting || hoverLine === 'comp') {
            const threshY = Math.pow(10, threshold/20)*ampScale; 
            if (centerY - threshY > -20 && centerY - threshY < height + 20) { 
                const tTop = centerY - threshY; 
                ctx.strokeStyle = '#22d3ee'; 
                ctx.setLineDash([6,4]); 
                // Thicker line if active or hovering
                ctx.lineWidth = (hoverLine === 'comp' || isDraggingLineRef.current === 'comp') ? 3 : 2; 
                ctx.beginPath(); ctx.moveTo(0, tTop); ctx.lineTo(width, tTop); ctx.moveTo(0, centerY+threshY); ctx.lineTo(width, centerY+threshY); ctx.stroke(); 
                drawLabel(`Comp: ${threshold}dB`, width, tTop - 4, '#22d3ee', 'right');
            }
        }
        if(hasGateBeenAdjusted || isGateAdjusting || hoverLine === 'gate') {
            const gateThreshY = Math.pow(10, gateThreshold/20) * ampScale; 
            if (centerY - gateThreshY > -20 && centerY - gateThreshY < height + 20) { 
                const gTop = centerY - gateThreshY; const gBot = centerY + gateThreshY; 
                ctx.strokeStyle = '#f97316'; 
                ctx.setLineDash([3, 3]); 
                // Thicker line if active or hovering
                ctx.lineWidth = (hoverLine === 'gate' || isDraggingLineRef.current === 'gate') ? 3 : 2; 
                ctx.beginPath(); ctx.moveTo(0, gTop); ctx.lineTo(width, gTop); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, gBot); ctx.lineTo(width, gBot); ctx.stroke(); 
                drawLabel(`Gate: ${gateThreshold}dB`, 0, gTop + 16, '#f97316', 'left');
            }
        }
        
        if (lastPlayedType === 'processed') {
            ctx.fillStyle = '#ef4444'; ctx.textAlign = 'right'; ctx.font = 'bold 10px monospace';
            [-3, -6, -12, -20].forEach(db => {
                const yVal = (1.0 - Math.pow(10, db / 20)) * grMaxHeight;
                if (yVal < height/2) { 
                    ctx.fillText(`${db}dB`, width - 5, yVal + 3);
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; ctx.fillRect(width-15, yVal, 10, 1); ctx.fillStyle = '#ef4444';
                }
            });
        }
        
        const totalWidth = width * zoomX;
        if(zoomX>1) { const sw = (width/totalWidth)*width; const sx = (-panOffset/totalWidth)*width; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, height-4, width, 4); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(sx, height-4, sw, 4); }
        
        if (mousePos.x >= 0 && lastPlayedType === 'processed') {
             const vX = mousePos.x - panOffset;
             const start = Math.floor(vX * step);
             const end = Math.floor((vX + 1) * step);
             
             let hoverGR = 0;
             if (start >= 0 && start < srcLength) {
                 hoverGR = srcGR[start];
                 const safeEnd = Math.min(end, srcLength);
                 for(let i = start + 1; i < safeEnd; i++) {
                     if (srcGR[i] < hoverGR) hoverGR = srcGR[i];
                 }
             }
             
             hoverGrRef.current = hoverGR;
             if (playingType === 'none') {
                 drawGRBar(0, hoverGR); 
             }

             if (hoverGR < -0.01) {
                  const grY = (1.0 - Math.pow(10, hoverGR / 20)) * grMaxHeight;
                  ctx.strokeStyle = '#ec4899'; 
                  ctx.lineWidth = 1.5;
                  ctx.setLineDash([]);
                  ctx.beginPath();
                  const crossWidth = 10;
                  ctx.moveTo(mousePos.x - crossWidth, grY);
                  ctx.lineTo(mousePos.x + crossWidth, grY);
                  ctx.stroke();
                  ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)'; 
                  ctx.beginPath();
                  ctx.moveTo(0, grY);
                  ctx.lineTo(width, grY);
                  ctx.stroke();
             } else {
                  hoverGrRef.current = 0;
                  if (playingType === 'none') drawGRBar(0, 0);
             }
        }

    } catch (e) {
        console.error("Draw error:", e);
    }

  }, [visualResult, threshold, gateThreshold, zoomX, zoomY, panOffset, panOffsetY, lastPlayedType, canvasDims, drawPolygon, drawGRLine, dryGain, isCompAdjusting, hasThresholdBeenAdjusted, isDeltaMode, isCustomSettings, isGateAdjusting, hasGateBeenAdjusted, visualSourceCache, mousePos, playingType, drawGRBar, hoverLine, loopStart, loopEnd, originalBuffer]);

  const getCurrentHoverGR = () => {
      if (!visualResult || mousePos.x < 0 || lastPlayedType !== 'processed') return null;
      const vX = mousePos.x - panOffset;
      const width = canvasDims.width;
      const srcLength = visualResult.grCurve.length;
      const step = srcLength / (width * zoomX);
      
      const start = Math.floor(vX * step);
      const end = Math.floor((vX + 1) * step);
      
      let hoverGR = 0;
      if (start >= 0 && start < srcLength) {
          hoverGR = visualResult.grCurve[start];
          const safeEnd = Math.min(end, srcLength);
          for(let i = start + 1; i < safeEnd; i++) {
              if (visualResult.grCurve[i] < hoverGR) hoverGR = visualResult.grCurve[i];
          }
          return hoverGR;
      }
      return null;
  };
  const activeHoverGR = getCurrentHoverGR();

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden p-4 relative">
      {/* Header */}
      <div className="flex-none flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white"><Settings2 className="w-8 h-8 text-cyan-400"/> 壓縮器波形顯示器 Compressor Visualizer v2.2.2</h1>
                <p className="text-xs text-slate-400 mt-1 font-mono">{fileName || 'NO FILE'} 
                    {visualSourceCache.step > 1 && (
                        <span className="text-yellow-500 ml-2 font-bold text-[10px] tracking-wide border border-yellow-500/30 px-1.5 py-0.5 rounded bg-yellow-950/30">
                            (Reduced Resolution Mode: {Math.round(resolutionPct)}%)
                        </span>
                    )}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 relative">
                <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === 'upload' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Upload size={16}/> 上載音檔</button>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload}/>
                
                {/* Restore User Upload Button */}
                {userBufferRef.current && (
                    <button 
                        onClick={restoreUserUpload} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border border-slate-700 ${currentSourceId === 'upload' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}
                    >
                        <User size={16}/> 我的音檔 ({userFileNameRef.current.length > 10 ? userFileNameRef.current.substring(0,8)+'...' : userFileNameRef.current})
                    </button>
                )}

                <button onClick={handleDownload} disabled={currentSourceId !== 'upload'} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === 'upload' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`} title={currentSourceId === 'upload' ? "下載處理後的音檔" : "僅支援下載自行上載的音檔"}>{currentSourceId === 'upload' ? <Download size={16}/> : <Ban size={16}/>} 下載壓縮後音檔</button>
                
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                {AUDIO_SOURCES.map(p => { const Icon = p.Icon; return (<button key={p.id} onClick={() => loadPreset(p)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === p.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Icon size={16}/> {p.id.toUpperCase()}</button>); })}
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <button onClick={() => setIsInfoPanelEnabled(!isInfoPanelEnabled)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all shadow-lg ${isInfoPanelEnabled ? 'bg-green-500 text-white border border-green-400 shadow-green-500/30 hover:bg-green-400 animate-pulse' : 'bg-slate-800 text-slate-500 border border-transparent hover:bg-slate-700'}`} title={isInfoPanelEnabled ? "關閉說明視窗" : "開啟說明視窗"}>{isInfoPanelEnabled ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>} 彈出說明視窗</button>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                
                {/* OPTIONS BUTTON */}
                <div className="relative" ref={optionsRef}>
                    <button 
                        onClick={() => setIsOptionsOpen(!isOptionsOpen)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${isOptionsOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                        title="設定 / 解析度"
                    >
                        <Settings size={16}/>
                    </button>
                    
                    {/* OPTIONS POPUP */}
                    {isOptionsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white flex items-center gap-2"><Sliders size={12}/> 效能與解析度</span>
                                <button onClick={() => setIsOptionsOpen(false)}><X size={14} className="text-slate-500 hover:text-white"/></button>
                            </div>
                            <div className="mb-4">
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>流暢 (Low Res)</span>
                                    <span>精細 (High Res)</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    value={resolutionPct} 
                                    onChange={(e) => setResolutionPct(parseInt(e.target.value))} 
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <div className="text-center text-xs font-mono mt-1 text-cyan-400 font-bold">{resolutionPct}% Resolution</div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">
                                調低解析度可提升操作流暢度，但可能丟失極短暫的峰值細節。預設為 100% 以確保準確性。
                            </p>
                        </div>
                    )}
                </div>
            </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0 gap-4 relative">
            <div ref={containerRef} className="flex-1 relative bg-slate-900 border-2 border-slate-800 rounded-xl shadow-inner overflow-hidden flex cursor-crosshair select-none" onMouseDown={handleWaveformMouseDown} onMouseMove={handleLocalMouseMove} onMouseLeave={handleLocalMouseMove}>
                <canvas ref={waveformCanvasRef} className="w-full h-full block"/>
                
                <DraggableLegend />
                <DraggableViewControls 
                    zoomX={zoomX} 
                    setZoomX={(z) => {
                        setZoomX(z);
                        if(waveformCanvasRef.current&&originalBuffer){ 
                            const w=canvasDims.width; const cr=cuePoint/originalBuffer.duration; 
                            let nP=(w/3)-(cr*w*z); const mP=w-(w*z); 
                            if(nP>0)nP=0; if(nP<mP)nP=mP; setPanOffset(nP); 
                        }
                    }}
                    zoomY={zoomY} 
                    setZoomY={setZoomY} 
                    onReset={resetView} 
                    containerHeight={canvasDims.height}
                />

                {isInfoPanelEnabled && showInfoPanel && activeInfo && (<DraggableInfoPanel title={activeInfo.title} content={activeInfo.content} onClose={() => setIsInfoPanelEnabled(false)} />)}
                
                {/* PRESET SELECTOR: Positioned exactly above the 140px HUD */}
                <div className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-30">
                    <div className="relative group">
                        <button className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl hover:bg-slate-800/80 text-white font-bold px-6 py-2.5 rounded-t-lg shadow-[0_-4px_16px_rgba(0,0,0,0.2)] border-t border-x border-white/10 transition-all w-80 justify-between group-hover:border-cyan-500/50 group-hover:text-cyan-400"><span className="truncate">{isCustomSettings ? "Custom Setting (自訂參數)" : PRESETS_DATA[selectedPresetIdx].name}</span><ChevronDown size={16}/></button>
                        <div className="absolute bottom-full left-0 w-80 z-50 pb-2 hidden group-hover:block"><div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden max-h-80 overflow-y-auto">{PRESETS_DATA.map((p, idx) => (<div key={idx} onClick={(e) => { e.stopPropagation(); applyPreset(idx); }} className={`px-4 py-3 text-sm border-b border-white/5 last:border-0 cursor-pointer transition-colors ${idx === selectedPresetIdx && !isCustomSettings ? 'text-cyan-400 font-bold bg-white/5' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>{p.name}</div>))}</div></div>
                    </div>
                </div>
                
                {/* NEW HUD LAYOUT: Increased Height to 140px + More Padding */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10 z-30 transition-all select-none flex h-[140px]" onMouseDown={e => e.stopPropagation()}>
                     {/* Main Controls Area */}
                     <div className="flex-1 flex items-end justify-between px-4 md:px-8 pb-4 pt-4 hide-scrollbar overflow-x-auto">
                         <div className="flex gap-6 relative pt-6"><div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 tracking-widest mt-1">GATE</div><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={gateThreshold} min={-80} max={0} step={1} unit="dB" color="orange" onChange={(v) => handleGateThresholdChange(v)} onDragStateChange={handleGateDragState} tooltipKey="gateThreshold" onHover={handleKnobEnter} onLeave={handleKnobLeave}/><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="RATIO" value={gateRatio} min={1} max={8} step={0.1} unit=":1" color="yellow" onChange={(v) => updateParam(setGateRatio, v)} onDragStateChange={handleNormalDragState} tooltipKey="gateRatio" onHover={handleKnobEnter} onLeave={handleKnobLeave}/> <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="ATTACK" value={gateAttack} min={0.1} max={50} step={0.1} unit="ms" color="yellow" onChange={(v) => updateParam(setGateAttack, v)} onDragStateChange={handleNormalDragState} tooltipKey="gateAttack" onHover={handleKnobEnter} onLeave={handleKnobLeave}/></div>
                         <div className="flex-1"></div>
                         <div className="flex gap-2 pb-2 flex-none items-center px-4">
                             <PlayBtn label="Dry" selected={lastPlayedType === 'original'} onClick={() => handleModeChange(lastPlayedType === 'original' ? 'processed' : 'original')} color="yellow" /><PlayBtn label="Wet" selected={lastPlayedType === 'processed'} onClick={() => handleModeChange(lastPlayedType === 'processed' ? 'original' : 'processed')} color="red" /><button onMouseDown={(e) => e.stopPropagation()} onClick={toggleDeltaMode} disabled={isDryMode} className={`h-8 w-8 flex items-center justify-center rounded border transition-all ${isDryMode ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' : isDeltaMode ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700'} ${isDryMode ? 'cursor-not-allowed opacity-50' : ''}`} title="Delta Monitoring"><Triangle size={14} fill={isDeltaMode ? "currentColor" : "none"} /></button><div className="w-px h-8 bg-white/10 mx-2"></div><PlayBtn label={playingType!=='none'?"PAUSE":"PLAY"} active={playingType!=='none'} onClick={togglePlayback} color="green" isPlayButton/>
                         </div>
                         
                         {/* MOVED: A/B BUTTONS - Now with Breathing Effect on Wrapper */}
                         <div className="flex gap-2 pb-2 flex-none items-center px-2">
                             <button 
                                 onClick={() => handleABSwitch('A')}
                                 className={`w-8 h-8 rounded font-bold text-xs border transition-all relative overflow-hidden group ${activeSlot === 'A' ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(8,145,178,0.5)] animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-300'}`}
                             >
                                 <span className="relative z-10">A</span>
                                 {activeSlot === 'A' && <div className="absolute inset-0 bg-cyan-400/20"></div>}
                             </button>
                             <button 
                                 onClick={() => handleABSwitch('B')}
                                 className={`w-8 h-8 rounded font-bold text-xs border transition-all relative overflow-hidden group ${activeSlot === 'B' ? 'bg-orange-600 text-white border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.5)] animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-300'}`}
                             >
                                 <span className="relative z-10">B</span>
                                 {activeSlot === 'B' && <div className="absolute inset-0 bg-orange-400/20"></div>}
                             </button>
                         </div>

                         <div className="flex-1"></div>
                         
                         {/* COMPRESSOR MODULE - Added MouseEnter Auto-Switch */}
                         <div 
                            className="flex flex-col items-center gap-2 bg-white/5 rounded-xl p-2 border border-white/5 flex-none relative pt-6 transition-colors hover:bg-white/10"
                            onMouseEnter={() => { if(lastPlayedType === 'original') handleModeChange('processed'); }}
                         >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 tracking-widest mt-1">COMPRESSOR</div>
                            <div className="flex gap-4"><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="THRESHOLD" value={threshold} min={-60} max={0} step={1} unit="dB" color="cyan" onChange={(v) => handleThresholdChange(v)} onDragStateChange={handleCompDragState} tooltipKey="threshold" onHover={handleKnobEnter} onLeave={handleKnobLeave}/><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="RATIO" value={ratioControl} displayValue={ratio.toFixed(1)} min={0} max={100} step={0.5} unit=":1" color="indigo" onChange={(v) => updateRatio(v)} onDragStateChange={handleCompDragState} tooltipKey="ratio" onHover={handleKnobEnter} onLeave={handleKnobLeave}/><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="ATTACK" value={attack} min={0.1} max={100} step={0.1} unit="ms" color="blue" onChange={(v) => handleCompKnobChange(setAttack, v)} onDragStateChange={handleCompDragState} tooltipKey="attack" onHover={handleKnobEnter} onLeave={handleKnobLeave}/><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="RELEASE" value={release} min={10} max={500} step={1} unit="ms" color="pink" onChange={(v) => handleCompKnobChange(setRelease, v)} onDragStateChange={handleCompDragState} tooltipKey="release" onHover={handleKnobEnter} onLeave={handleKnobLeave}/><div className="w-px h-8 bg-white/10"></div><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="KNEE" value={knee} min={0} max={30} step={1} unit="dB" color="rose" onChange={(v) => handleCompKnobChange(setKnee, v)} onDragStateChange={handleCompDragState} tooltipKey="knee" onHover={handleKnobEnter} onLeave={handleKnobLeave}/><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="LOOKAHEAD" value={lookahead} min={0} max={100} step={1} unit="ms" color="purple" onChange={(v) => handleCompKnobChange(setLookahead, v)} onDragStateChange={handleCompDragState} tooltipKey="lookahead" onHover={handleKnobEnter} onLeave={handleKnobLeave}/></div></div>
                         
                         <div className="flex-1"></div>
                         <div className="flex flex-col items-center gap-2 flex-none pt-6 relative">
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 tracking-widest mt-1">OUTPUT</div>
                             <div className="flex gap-4">
                                 <RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="WET GAIN" subLabel="(MAKEUP)" value={makeupGain} min={0} max={20} step={0.5} unit="dB" color="emerald" onChange={(v) => handleGainChange(setMakeupGain, v)} onDragStateChange={handleNormalDragState} tooltipKey="makeup" onHover={handleKnobEnter} onLeave={handleKnobLeave}/><RotaryKnob disabled={isDryMode} dragLockRef={isDraggingKnobRef} label="DRY GAIN" value={dryGain} min={-60} max={6} step={0.5} unit="dB" color="yellow" onChange={(v) => handleGainChange(setDryGain, v)} onDragStateChange={handleNormalDragState} tooltipKey="dryGain" onHover={handleKnobEnter} onLeave={handleKnobLeave}/>
                             </div>
                         </div>
                     </div>
                     
                     {/* 3D Vertical Reset Button with Enhanced Glass Effect */}
                     <button 
                       onClick={resetAllParams}
                       className="w-12 h-full bg-[#ef4444]/70 hover:bg-[#dc2626]/80 backdrop-blur-md text-white font-bold text-xs flex flex-col items-center justify-center border-l border-white/20 shadow-[-4px_0_15px_rgba(0,0,0,0.5)] active:translate-x-[2px] active:shadow-none transition-all gap-1.5 tracking-widest flex-none z-50"
                       title="Reset All Parameters"
                       style={{textShadow: '0 1px 2px rgba(0,0,0,0.3)'}}
                     >
                       <span>R</span><span>E</span><span>S</span><span>E</span><span>T</span>
                     </button>
                </div>
                
                <>
                    <div ref={playheadRef} className="absolute top-0 bottom-0 w-[1px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none z-20" style={{left:'0%',opacity:0}}></div>
                    <div ref={cueMarkerRef} className="absolute top-0 bottom-0 w-[2px] bg-green-500 pointer-events-none z-10" style={{left:'0%',opacity:0}}></div>
                    {mousePos.x >= 0 && (
                        <>
                            {/* CSS Vertical Cursor Line Only (Horizontal removed per request) */}
                            <div className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none" style={{left:mousePos.x}}></div>
                            
                            {/* FIX 2: GR LABEL (PINK, OPAQUE) */}
                            {activeHoverGR !== null && (
                                <div className="absolute text-[10px] font-mono text-pink-500 font-bold bg-slate-900 border border-pink-500/30 px-1.5 py-0.5 rounded pointer-events-none shadow-lg z-50" style={{left:mousePos.x+8, top:mousePos.y-24}}>
                                    GR: {activeHoverGR.toFixed(1)} dB
                                </div>
                            )}
                        </>
                    )}
                </>
            </div>
            {/* UPDATED SIDEBAR LAYOUT: Width 44 (176px) to accommodate GR, Dry, Output */}
            <div className="w-44 flex flex-row gap-0 bg-slate-950 border-l border-slate-800 flex-none">
                <div className="w-1/3 relative border-r border-slate-800">
                    <canvas ref={grBarCanvasRef} width={64} height={canvasDims.height} className="w-full h-full"/>
                    <div className="absolute top-1 left-0 w-full text-center text-[9px] text-cyan-500 font-bold">GR</div>
                </div>
                <div className="w-2/3 relative">
                    <canvas ref={outputMeterCanvasRef} width={128} height={canvasDims.height} className="w-full h-full"/>
                </div>
            </div>
      </div>
      {isLoading && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-slate-800 p-4 rounded text-white flex items-center gap-2"><Gauge className="animate-spin"/> Loading...</div></div>}
      {errorMsg && <div className="fixed top-4 right-4 bg-red-900/90 text-white p-4 rounded shadow-xl border border-red-500 max-w-sm z-50">{errorMsg}</div>}
    </div>
  );
};

// --- NEW COMPONENT: Draggable View Controls ---
const DraggableViewControls = ({ zoomX, setZoomX, zoomY, setZoomY, onReset, containerHeight }) => {
    const [pos, setPos] = useState({ x: 20, y: 0 }); // y will be initialized on mount
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    
    // Set initial Y position (e.g., slightly above bottom)
    useEffect(() => {
        // Initial position: 280px from bottom (adjusted for larger HUD)
        setPos({ x: 20, y: containerHeight - 280 }); 
    }, [containerHeight]);

    const handleMouseDown = (e) => {
        e.stopPropagation();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    };

    const handleGlobalMove = useCallback((e) => {
        let newX = e.clientX - dragStartRef.current.x;
        let newY = e.clientY - dragStartRef.current.y;
        
        // Constraints
        if (newX < 0) newX = 0; // Left edge
        if (newY < 0) newY = 0; // Top edge (unlikely needed but good safety)
        // HUD constraint: Roughly 260px from bottom is the HUD top + margin
        const hudTopLimit = containerHeight - 260; 
        if (newY > hudTopLimit) newY = hudTopLimit;

        setPos({ x: newX, y: newY });
    }, [containerHeight]);

    const handleGlobalUp = useCallback(() => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    }, [handleGlobalMove]);

    return (
        <div 
            className="absolute flex flex-col gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 shadow-xl z-40 cursor-move w-32"
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={handleMouseDown}
        >
            <button onMouseDown={(e)=>e.stopPropagation()} onClick={onReset} className="flex items-center justify-center gap-1 w-full bg-slate-700 hover:bg-slate-600 text-[10px] py-1 rounded text-white mb-2 transition-colors"><Undo2 size={12}/> Reset View</button>
            <div className="flex items-center gap-1" onMouseDown={(e)=>e.stopPropagation()}>
                <MoveHorizontal size={10} className="text-slate-400"/>
                <input type="range" min={1} max={10} step={0.1} value={zoomX} onChange={(e)=>setZoomX(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
            </div>
            <div className="flex items-center gap-1" onMouseDown={(e)=>e.stopPropagation()}>
                <MoveVertical size={10} className="text-slate-400"/>
                <input type="range" min={0.1} max={5} step={0.1} value={zoomY} onChange={(e)=>setZoomY(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
            </div>
        </div>
    );
};

const DraggableInfoPanel = ({ title, content, onClose }) => {
    const [position, setPosition] = useState({ right: 16, bottom: 230 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ right: 0, bottom: 0 });

    const handleMouseDown = (e) => {
        e.stopPropagation(); 
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { ...position };
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    };

    const handleGlobalMove = useCallback((e) => {
        const deltaX = dragStartRef.current.x - e.clientX; 
        const deltaY = dragStartRef.current.y - e.clientY; 
        let newRight = startPosRef.current.right + deltaX;
        let newBottom = startPosRef.current.bottom + deltaY;
        if (newBottom < 0) newBottom = 0; 
        if (newRight < 0) newRight = 0;
        setPosition({ right: newRight, bottom: newBottom }); 
    }, []);

    const handleGlobalUp = useCallback(() => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    }, [handleGlobalMove]);

    useEffect(() => {
        return () => {
             window.removeEventListener('mousemove', handleGlobalMove);
             window.removeEventListener('mouseup', handleGlobalUp);
        }
    }, [handleGlobalMove, handleGlobalUp]);

    return (
        <div className="absolute z-50 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-2xl cursor-move select-none flex flex-col w-80 animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ right: position.right, bottom: position.bottom }} onMouseDown={handleMouseDown}>
             <button onClick={(e) => {e.stopPropagation(); onClose();}} className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"><X size={16}/></button>
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3 text-xl"><Info size={22}/> {title}</div>
            <div className="text-base text-slate-200 leading-relaxed font-medium">{content}</div>
        </div>
    );
};

const DraggableLegend = () => {
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        e.stopPropagation(); 
        setIsDragging(true);
        dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    };

    const handleGlobalMove = useCallback((e) => {
          setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }, []);

    const handleGlobalUp = useCallback(() => {
          setIsDragging(false);
          window.removeEventListener('mousemove', handleGlobalMove);
          window.removeEventListener('mouseup', handleGlobalUp);
    }, [handleGlobalMove]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        }
    }, [handleGlobalMove, handleGlobalUp]);

    return (
        <div className="absolute z-40 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 rounded-lg shadow-xl cursor-move select-none flex flex-col gap-2 w-48" style={{ left: position.x, top: position.y }} onMouseDown={handleMouseDown}>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-700 pb-1 mb-1"><Palette size={14}/> 顏色說明 <GripHorizontal size={14} className="ml-auto opacity-50"/></div>
            <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-white border border-slate-600 block rounded-sm"></span><span className="text-slate-300 font-medium">白色 : 最終輸出音量</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 block rounded-sm"></span><span className="text-red-400 font-medium">紅色 : 壓縮/Gate 削減</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-sky-400 block rounded-sm"></span><span className="text-sky-400 font-medium">藍色 : Makeup Gain 增益</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-400 block rounded-sm"></span><span className="text-yellow-400 font-medium">黃色 : 乾訊號/混合疊加</span></div>
            </div>
        </div>
    );
};

// --- RotaryKnob (CRITICAL FIX FOR DRAGGING ISSUE) ---
const RotaryKnob = ({ label, subLabel, value, displayValue, min, max, step, unit, color, onChange, onDragStateChange, tooltipKey, onHover, onLeave, dragLockRef, disabled }) => {
    // 移除 isDragging state，改用 Ref 追蹤，因為事件是在 callback 中處理
    const isDraggingRef = useRef(false);
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(displayValue || value);
    
    // 使用 Refs 儲存變數，以便在事件監聽器中訪問最新值，而無需重新綁定監聽器
    const startY = useRef(0); 
    const startVal = useRef(0);
    const paramsRef = useRef({ value, min, max, step });

    // CRITICAL FIX: Store callbacks in a ref so `handleGlobalMouseUp` never needs to change
    // when the parent re-renders (which passes new callback references).
    const callbacksRef = useRef({ onChange, onDragStateChange });

    // 每次 Render 更新 Params Ref 和 Callbacks Ref
    useEffect(() => { 
        paramsRef.current = { value, min, max, step };
        callbacksRef.current = { onChange, onDragStateChange };
    }); // No dependency array intended: update on every render

    const colors = { cyan: "#22d3ee", indigo: "#818cf8", yellow: "#facc15", slate: "#94a3b8", red: "#f87171", orange: "#fb923c", blue: "#3b82f6", pink: "#ec4899", emerald: "#10b981", rose: "#f43f5e", purple: "#d8b4fe" };
    const strokeColor = disabled ? '#475569' : (colors[color] || colors.slate);
    const labelColorClass = disabled ? 'text-slate-600' : 'text-slate-500 hover:text-slate-300';
    const valueColorStyle = disabled ? {color: '#475569'} : {color: colors[color] || colors.slate};

    // 核心修復：只定義一次函數，不依賴 State 變化
    const handleGlobalMouseMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        e.preventDefault(); // 防止選取文字
        const { min: pMin, max: pMax, step: pStep } = paramsRef.current;
        const { onChange: pOnChange } = callbacksRef.current;
        
        const delta = startY.current - e.clientY; 
        const range = pMax - pMin;
        let nVal = startVal.current + (delta / 200) * range;
        if (nVal < pMin) nVal = pMin; if (nVal > pMax) nVal = pMax;
        nVal = Math.round(nVal / pStep) * pStep; 
        
        // 只有數值真的變了才呼叫
        // We compare with paramsRef.current.value which is the latest prop value
        if (Math.abs(nVal - paramsRef.current.value) > 0.0001) {
            if(pOnChange) pOnChange(nVal);
        }
    }, []);

    const handleGlobalMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        if (dragLockRef) dragLockRef.current = false;
        
        // Use ref here to avoid dependency on prop
        if (callbacksRef.current.onDragStateChange) callbacksRef.current.onDragStateChange(false);
        
        document.body.style.cursor = 'default';
        
        // 立刻移除監聽器
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [dragLockRef, handleGlobalMouseMove]); // Dependencies are now STABLE

    const handleStart = (clientY) => { 
        if (disabled) return;
        isDraggingRef.current = true;
        
        if (callbacksRef.current.onDragStateChange) callbacksRef.current.onDragStateChange(true); 
        if (dragLockRef) dragLockRef.current = true; 
        
        startY.current = clientY; 
        startVal.current = value; // 這裡用 Props 的 value
        document.body.style.cursor = 'ns-resize';
        
        // 加入監聽器
        window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    // 安全網：組件卸載時確保移除
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);

    const handleDoubleClick = () => { if (disabled) return; setIsEditing(true); setInputValue(displayValue || value); };
    const handleInputBlur = () => { let val = parseFloat(inputValue); if (!isNaN(val)) { if (val < min) val = min; if (val > max) val = max; onChange(val); } setIsEditing(false); };

    const pct = (value - min) / (max - min); const radius = 14; const circumference = 2 * Math.PI * radius; const arcLength = circumference * 0.75; const dashOffset = arcLength * (1 - pct); const rotation = -135 + (pct * 270);
    const displayStr = displayValue !== undefined ? displayValue : value.toFixed(Number.isInteger(step)?0:1);

    return (
        <div className={`flex flex-col items-center gap-1 group relative w-16 select-none ${disabled ? 'opacity-60 pointer-events-none' : ''}`} onMouseEnter={() => onHover && onHover(tooltipKey)} onMouseLeave={() => onLeave && onLeave()}>
            <div className={`relative w-9 h-9 ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'}`} onMouseDown={(e)=>{e.stopPropagation(); handleStart(e.clientY);}}>
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r={radius} fill="none" stroke="#334155" strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                    <circle cx="18" cy="18" r={radius} fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={`${arcLength} ${circumference}`} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-135, 18, 18)" />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{transform: `rotate(${rotation}deg)`}}><div className={`w-1 h-1 rounded-full mx-auto mt-1 shadow-sm ${disabled ? 'bg-slate-500' : 'bg-white'}`}></div></div>
            </div>
            <div className="text-center group/label relative" onDoubleClick={(e)=>{e.stopPropagation(); handleDoubleClick();}}>
                <div className="flex flex-col items-center justify-end cursor-help pb-2">
                   <div className="flex items-center gap-0.5 mb-1"><div className={`text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap transition-colors ${labelColorClass}`}>{label}</div>{!disabled && <div className="w-1 h-1 rounded-full bg-slate-600 group-hover/label:bg-cyan-400 transition-colors"></div>}</div>
                   {subLabel && <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{subLabel}</div>}
                </div>
                {isEditing ? (<input autoFocus type="text" value={inputValue} onChange={(e)=>setInputValue(e.target.value)} onBlur={handleInputBlur} onKeyDown={(e)=>{if(e.key==='Enter')handleInputBlur()}} onClick={(e)=>e.stopPropagation()} className="w-12 text-center text-xs bg-slate-800 text-white border border-slate-600 rounded mt-1"/>) : (<div className={`text-sm font-mono font-bold cursor-text -mt-1`} style={valueColorStyle}>{displayStr}{unit}</div>)}
            </div>
        </div>
    );
};

const PlayBtn = ({ label, active, selected, onClick, color, isPlayButton }) => {
    let bg = "bg-slate-800 border-slate-700 text-slate-400 hover:text-white";
    if (isPlayButton) { if (active) bg = "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]"; } 
    // Add animate-pulse to Dry/Wet buttons when selected
    else { 
        if (color === 'yellow' && selected) bg = "bg-yellow-500 border-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)] animate-pulse"; 
        if (color === 'red' && selected) bg = "bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"; 
    }
    return (<button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick(); }} className={`h-8 px-3 rounded text-xs font-bold border transition-all active:scale-95 ${bg} min-w-[50px] whitespace-nowrap`}>{label}</button>);
};

export default App;