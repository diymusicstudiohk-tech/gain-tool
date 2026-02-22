import { useState, useEffect, useRef, useCallback } from 'react';
import { PRESETS_DATA, AUDIO_SOURCES } from '../utils/constants';
import { processCompressor } from '../utils/dsp';
import { writeWavFile, toMono, stopCurrentSource } from '../utils/audioHelper';
import { fetchAudioBuffer } from '../utils/audioLoader';
import {
    loadAppStateFromStorage, saveAudioFileToDB, loadAudioFileFromDB,
    loadCustomAudioBlobFromDB,
} from '../utils/storage';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

const ALLOWED_MIME_TYPES = [
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac',
    'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/x-wav',
    'audio/webm', 'audio/mp3',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
];

/**
 * Receives shared refs from App.jsx and playback setters to coordinate loading.
 */
const useAudioEngine = ({
    audioContext, originalBuffer, setOriginalBuffer,
    applyStateSnapshot, getCurrentStateSnapshot, applyPreset,
    // Shared refs
    sourceNodeRef, drySourceNodeRef, isPlayingRef, startOffsetRef,
    // Playback setters (from usePlayback, wired via App)
    setPlayingType, setLastPlayedType, setLoopStart, setLoopEnd,
    // View setters (from useViewState, wired via App)
    setZoomX, setZoomY, setPanOffset, setPanOffsetY,
    currentParams, dryGain, logAction,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [currentSourceId, setCurrentSourceId] = useState(null);
    const [lastPracticeSourceId, setLastPracticeSourceId] = useState('Bass-01');
    const [fileName, setFileName] = useState('');
    const [resolutionPct, setResolutionPct] = useState(100);

    const userBufferRef = useRef(null);
    const userFileNameRef = useRef("");
    const practiceSessionRef = useRef(null);
    const uploadSessionRef = useRef(null);
    const hasInitialLoadRun = useRef(false);
    const fileInputRef = useRef(null);

    const handleDecodedBuffer = useCallback((decodedBuffer) => {
        if (!audioContext) return;
        const length = decodedBuffer.length;
        const sampleRate = decodedBuffer.sampleRate;
        const monoData = toMono(decodedBuffer);

        let maxPeak = 0;
        for (let i = 0; i < length; i++) {
            const abs = Math.abs(monoData[i]);
            if (abs > maxPeak) maxPeak = abs;
        }
        const targetPeak = Math.pow(10, -0.1 / 20);
        if (maxPeak > 0.0001) {
            const norm = targetPeak / maxPeak;
            for (let i = 0; i < length; i++) monoData[i] *= norm;
        }
        const monoBuffer = audioContext.createBuffer(1, length, sampleRate);
        monoBuffer.copyToChannel(monoData, 0);
        setOriginalBuffer(monoBuffer);

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
    }, [audioContext, setOriginalBuffer]);

    const loadAudio = useCallback(async (preset, { autoMatchPreset = true } = {}) => {
        if (!audioContext) return;
        try {
            setIsLoading(true); setErrorMsg('');
            stopCurrentSource(sourceNodeRef, drySourceNodeRef);
            setPlayingType('none'); isPlayingRef.current = false;
            setOriginalBuffer(null); setLoopStart(null); setLoopEnd(null);
            startOffsetRef.current = 0;
            setCurrentSourceId(preset.id); setLastPracticeSourceId(preset.id);
            setFileName(preset.name);

            const arrayBuffer = await fetchAudioBuffer(preset.trackName);
            const decoded = await audioContext.decodeAudioData(arrayBuffer);
            handleDecodedBuffer(decoded);
            setIsLoading(false);

            if (autoMatchPreset && preset.category) {
                const trackCategory = preset.category;
                const matchingPresetIdx = PRESETS_DATA.findIndex(p => {
                    if (!p.category) return false;
                    const tc = trackCategory.trim().toLowerCase();
                    const pc = p.category.trim().toLowerCase();
                    return tc.includes(pc) || pc.includes(tc);
                });
                if (matchingPresetIdx !== -1) applyPreset(matchingPresetIdx);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(`載入失敗: ${err.message}`);
            setIsLoading(false);
        }
    }, [audioContext, handleDecodedBuffer, applyPreset, sourceNodeRef, drySourceNodeRef,
        isPlayingRef, startOffsetRef, setPlayingType, setLoopStart, setLoopEnd, setOriginalBuffer]);

    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file || !audioContext) return;

        // File size validation
        if (file.size > MAX_FILE_SIZE) {
            setErrorMsg(`檔案超過 1GB 上限：${file.name}`);
            if (e.target) e.target.value = '';
            return;
        }

        // MIME type validation (allow empty type as some browsers omit it)
        if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
            setErrorMsg(`不支援的格式：${file.type || '未知格式'}。支援：MP3, WAV, M4A, AAC, OGG, FLAC`);
            if (e.target) e.target.value = '';
            return;
        }

        try {
            setIsLoading(true); setErrorMsg('');
            stopCurrentSource(sourceNodeRef, drySourceNodeRef);
            setPlayingType('none'); isPlayingRef.current = false;
            setLoopStart(null); setLoopEnd(null);
            startOffsetRef.current = 0;
            setCurrentSourceId('upload'); setFileName(file.name);
            setOriginalBuffer(null);

            await saveAudioFileToDB(file, file.name);
            const ab = await file.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(ab);
            userBufferRef.current = decoded;
            userFileNameRef.current = file.name;
            handleDecodedBuffer(decoded);
            setIsLoading(false);
        } catch (err) {
            setErrorMsg('無法解析音檔，請確認格式 (MP3/WAV/M4A/AAC/FLAC)。');
            setIsLoading(false);
        }
    }, [audioContext, handleDecodedBuffer, sourceNodeRef, drySourceNodeRef, isPlayingRef,
        startOffsetRef, setPlayingType, setLoopStart, setLoopEnd, setOriginalBuffer]);

    const saveSessionState = useCallback((mode) => {
        const snapshot = getCurrentStateSnapshot();
        if (mode === 'practice') practiceSessionRef.current = { ...snapshot, sourceId: currentSourceId, fileName };
        else if (mode === 'upload') uploadSessionRef.current = { ...snapshot, fileName: userFileNameRef.current };
    }, [getCurrentStateSnapshot, currentSourceId, fileName]);

    const restoreUserUpload = useCallback(() => {
        if (!userBufferRef.current || !audioContext) return;
        stopCurrentSource(sourceNodeRef, drySourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;
        setLoopStart(null); setLoopEnd(null);
        startOffsetRef.current = 0;
        setCurrentSourceId('upload');
        setFileName(userFileNameRef.current);
        handleDecodedBuffer(userBufferRef.current);
    }, [audioContext, handleDecodedBuffer, sourceNodeRef, drySourceNodeRef, isPlayingRef,
        startOffsetRef, setPlayingType, setLoopStart, setLoopEnd]);

    const switchToPractice = useCallback(() => {
        stopCurrentSource(sourceNodeRef, drySourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;

        if (currentSourceId === 'upload') saveSessionState('upload');

        if (practiceSessionRef.current) {
            const snap = practiceSessionRef.current;
            applyStateSnapshot(snap);
            setCurrentSourceId(snap.sourceId);
            setFileName(snap.fileName);
            const source = AUDIO_SOURCES.find(s => s.id === snap.sourceId);
            if (source) loadAudio(source, { autoMatchPreset: false });
        } else {
            const defaultSource = AUDIO_SOURCES[0];
            loadAudio(defaultSource);
        }
    }, [sourceNodeRef, drySourceNodeRef, isPlayingRef, currentSourceId, saveSessionState,
        applyStateSnapshot, loadAudio, setPlayingType]);

    const switchToUpload = useCallback(() => {
        stopCurrentSource(sourceNodeRef, drySourceNodeRef);
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
    }, [sourceNodeRef, drySourceNodeRef, isPlayingRef, currentSourceId, saveSessionState,
        applyStateSnapshot, handleDecodedBuffer, restoreUserUpload, setPlayingType]);

    const clearUserUpload = useCallback(() => {
        userBufferRef.current = null;
        userFileNameRef.current = "";
        uploadSessionRef.current = null;
        if (currentSourceId === 'upload') switchToPractice();
    }, [currentSourceId, switchToPractice]);

    const handleDownload = useCallback(() => {
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
                a.style.display = 'none'; a.href = url; a.download = dlName;
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            } catch (e) { console.error(e); setErrorMsg("匯出失敗"); } finally { setIsLoading(false); }
        }, 50);
    }, [currentSourceId, originalBuffer, audioContext, currentParams, dryGain, fileName]);

    // Load initial state from storage
    useEffect(() => {
        const savedState = loadAppStateFromStorage();
        if (savedState) {
            if (savedState.resolutionPct) setResolutionPct(savedState.resolutionPct);
            if (savedState.currentSourceId) {
                setCurrentSourceId(savedState.currentSourceId);
                if (savedState.currentSourceId !== 'upload') {
                    const source = AUDIO_SOURCES.find(s => s.id === savedState.currentSourceId);
                    if (source) setFileName(source.name);
                }
            }
            if (savedState.lastPlayedType) setLastPlayedType(savedState.lastPlayedType);
            if (savedState.loopStart !== undefined) setLoopStart(savedState.loopStart);
            if (savedState.loopEnd !== undefined) setLoopEnd(savedState.loopEnd);
        }
    }, [setLastPlayedType, setLoopStart, setLoopEnd]);

    // Audio Restoration on Mount
    useEffect(() => {
        if (!audioContext || hasInitialLoadRun.current) return;

        const loadInitialAudio = async () => {
            const savedState = loadAppStateFromStorage();
            if (currentSourceId === 'upload') {
                try {
                    const record = await loadAudioFileFromDB();
                    if (record && record.file) {
                        const ab = await record.file.arrayBuffer();
                        const decoded = await audioContext.decodeAudioData(ab);
                        userBufferRef.current = decoded;
                        userFileNameRef.current = record.name;
                        setFileName(record.name);
                        handleDecodedBuffer(decoded);
                        if (savedState) {
                            if (savedState.loopStart !== undefined) setLoopStart(savedState.loopStart);
                            if (savedState.loopEnd !== undefined) setLoopEnd(savedState.loopEnd);
                        }
                    } else {
                        setCurrentSourceId(null);
                    }
                } catch (e) {
                    console.error("Failed to restore upload", e);
                }
            } else if (currentSourceId) {
                const source = AUDIO_SOURCES.find(s => s.id === currentSourceId);
                if (source) {
                    await loadAudio(source, { autoMatchPreset: false });
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

        if (currentSourceId) {
            loadInitialAudio();
        } else {
            hasInitialLoadRun.current = true;
        }
    }, [audioContext, currentSourceId]);

    // Random initial load if no source
    useEffect(() => {
        if (audioContext && !originalBuffer && !currentSourceId && !isLoading) {
            const randomSource = AUDIO_SOURCES[Math.floor(Math.random() * AUDIO_SOURCES.length)];
            loadAudio(randomSource);
        }
    }, [audioContext, originalBuffer, currentSourceId, isLoading, loadAudio]);

    const loadCustomAudio = useCallback(async (id, name) => {
        if (!audioContext) return;
        try {
            setIsLoading(true);
            setErrorMsg('');
            stopCurrentSource(sourceNodeRef, drySourceNodeRef);
            setPlayingType('none');
            isPlayingRef.current = false;
            setLoopStart(null);
            setLoopEnd(null);
            startOffsetRef.current = 0;
            setCurrentSourceId(`custom_${id}`);
            setFileName(name);
            setOriginalBuffer(null);

            const blob = await loadCustomAudioBlobFromDB(id);
            if (!blob) throw new Error('找不到音檔');
            const ab = await blob.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(ab);
            handleDecodedBuffer(decoded);
            setIsLoading(false);
        } catch (_) {
            setErrorMsg('無法載入自訂音檔，請重新上載。');
            setIsLoading(false);
        }
    }, [audioContext, handleDecodedBuffer, sourceNodeRef, drySourceNodeRef,
        isPlayingRef, startOffsetRef, setPlayingType, setLoopStart, setLoopEnd, setOriginalBuffer]);

    return {
        isLoading, errorMsg,
        currentSourceId, lastPracticeSourceId,
        fileName, resolutionPct, setResolutionPct,
        userBufferRef, userFileNameRef, fileInputRef,
        loadAudio, loadCustomAudio, handleFileUpload, handleDecodedBuffer,
        switchToPractice, switchToUpload,
        restoreUserUpload, clearUserUpload, handleDownload,
    };
};

export default useAudioEngine;
