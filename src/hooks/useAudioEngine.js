import { useState, useEffect, useRef, useCallback } from 'react';
import { AUDIO_SOURCES } from '../utils/constants';
import { processCompressor } from '../utils/dsp';
import { writeWavFile, stopCurrentSource } from '../utils/audioHelper';
import { fetchAudioBuffer } from '../utils/audioLoader';
import {
    loadAppStateFromStorage, saveAudioFileToDB, loadAudioFileFromDB,
    loadCustomAudioBlobFromDB,
    saveParamsForSource, loadParamsForSource,
} from '../utils/storage';
import useStateRef from './useStateRef';
import useLatestRef from './useLatestRef';

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
    applyStateSnapshot, getCurrentStateSnapshot, resetAllParams, getDefaultSnapshot,
    // Shared refs
    sourceNodeRef, isPlayingRef, startOffsetRef,
    // Playback setters (from usePlayback, wired via App)
    setPlayingType, setLastPlayedType,
    currentParams, logAction,
    markersRef,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [currentSourceId, setCurrentSourceId, currentSourceIdRef] = useStateRef(null);
    const [lastPracticeSourceId, setLastPracticeSourceId] = useState('Bass-01');
    const [fileName, setFileName] = useState('');

    // Consolidated session state: user upload, practice session, upload session
    const sessionRef = useRef({
        user: { buffer: null, fileName: '' },
        practice: null,
        upload: null,
    });
    // Stable ref-like proxies for backward-compatible public API
    const [userBufferRef] = useState(() => ({
        get current() { return sessionRef.current.user.buffer; },
        set current(v) { sessionRef.current.user.buffer = v; },
    }));
    const [userFileNameRef] = useState(() => ({
        get current() { return sessionRef.current.user.fileName; },
        set current(v) { sessionRef.current.user.fileName = v; },
    }));
    const hasInitialLoadRun = useRef(false);
    const fileInputRef = useRef(null);
    const getSnapshotRef = useLatestRef(getCurrentStateSnapshot);

    const handleDecodedBuffer = useCallback((decodedBuffer) => {
        if (!audioContext) return;
        setOriginalBuffer(decodedBuffer);
    }, [audioContext, setOriginalBuffer]);

    const loadAudio = useCallback(async (preset, options) => {
        if (!audioContext) return;
        const { paramsSnapshot, skipSavePrev } = options || {};
        try {
            // Save current source params before switching
            if (!skipSavePrev && currentSourceIdRef.current && currentSourceIdRef.current !== preset.id) {
                saveParamsForSource(currentSourceIdRef.current, getSnapshotRef.current());
            }

            setIsLoading(true); setErrorMsg(''); setLoadingMessage('載入音檔中...');
            stopCurrentSource(sourceNodeRef);
            setPlayingType('none'); isPlayingRef.current = false;
            setOriginalBuffer(null);
            startOffsetRef.current = 0;
            setCurrentSourceId(preset.id); setLastPracticeSourceId(preset.id);
            setFileName(preset.name);

            const arrayBuffer = await fetchAudioBuffer(preset.trackName, setLoadingMessage);
            const decoded = await audioContext.decodeAudioData(arrayBuffer);
            handleDecodedBuffer(decoded);

            // Restore params: priority is paramsSnapshot > per-source localStorage > defaults
            if (paramsSnapshot) {
                applyStateSnapshot(paramsSnapshot);
            } else {
                const saved = loadParamsForSource(preset.id);
                if (saved) {
                    applyStateSnapshot(saved);
                } else {
                    resetAllParams();
                }
            }
            setIsLoading(false); setLoadingMessage('');
        } catch (err) {
            console.error(err);
            setErrorMsg(`載入失敗: ${err.message}`);
            setIsLoading(false); setLoadingMessage('');
        }
    }, [audioContext, handleDecodedBuffer, resetAllParams, applyStateSnapshot, sourceNodeRef,
        isPlayingRef, startOffsetRef, setPlayingType, setOriginalBuffer]);

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
            // Save current source params before switching
            if (currentSourceIdRef.current) {
                saveParamsForSource(currentSourceIdRef.current, getSnapshotRef.current());
            }

            setIsLoading(true); setErrorMsg(''); setLoadingMessage('載入音檔中...');
            stopCurrentSource(sourceNodeRef);
            setPlayingType('none'); isPlayingRef.current = false;

            startOffsetRef.current = 0;
            setCurrentSourceId('upload'); setFileName(file.name);
            setOriginalBuffer(null);

            await saveAudioFileToDB(file, file.name);
            const ab = await file.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(ab);
            userBufferRef.current = decoded;
            userFileNameRef.current = file.name;
            handleDecodedBuffer(decoded);
            // Always reset for new uploads (fresh start)
            resetAllParams();
            setIsLoading(false); setLoadingMessage('');
        } catch (err) {
            setErrorMsg('無法解析音檔，請確認格式 (MP3/WAV/M4A/AAC/FLAC)。');
            setIsLoading(false); setLoadingMessage('');
        }
    }, [audioContext, handleDecodedBuffer, resetAllParams, sourceNodeRef,
        isPlayingRef, startOffsetRef, setPlayingType, setOriginalBuffer]);

    const saveSessionState = useCallback((mode) => {
        const snapshot = getCurrentStateSnapshot();
        if (mode === 'practice') sessionRef.current.practice = { ...snapshot, sourceId: currentSourceId, fileName };
        else if (mode === 'upload') sessionRef.current.upload = { ...snapshot, fileName: userFileNameRef.current };
    }, [getCurrentStateSnapshot, currentSourceId, fileName]);

    const restoreUserUpload = useCallback(() => {
        if (!userBufferRef.current || !audioContext) return;
        stopCurrentSource(sourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;
        startOffsetRef.current = 0;
        setCurrentSourceId('upload');
        setFileName(userFileNameRef.current);
        handleDecodedBuffer(userBufferRef.current);
    }, [audioContext, handleDecodedBuffer, sourceNodeRef, isPlayingRef,
        startOffsetRef, setPlayingType]);

    const switchToPractice = useCallback(() => {
        stopCurrentSource(sourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;

        // Save current source params to localStorage
        if (currentSourceIdRef.current) {
            saveParamsForSource(currentSourceIdRef.current, getSnapshotRef.current());
        }

        if (currentSourceId === 'upload') saveSessionState('upload');

        if (sessionRef.current.practice) {
            const snap = sessionRef.current.practice;
            setCurrentSourceId(snap.sourceId);
            setFileName(snap.fileName);
            const source = AUDIO_SOURCES.find(s => s.id === snap.sourceId);
            if (source) loadAudio(source, { paramsSnapshot: snap, skipSavePrev: true });
        } else {
            const defaultSource = AUDIO_SOURCES[0];
            loadAudio(defaultSource, { skipSavePrev: true });
        }
    }, [sourceNodeRef, isPlayingRef, currentSourceId, saveSessionState,
        loadAudio, setPlayingType]);

    const switchToUpload = useCallback(() => {
        stopCurrentSource(sourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;

        // Save current source params to localStorage
        if (currentSourceIdRef.current) {
            saveParamsForSource(currentSourceIdRef.current, getSnapshotRef.current());
        }

        if (currentSourceId !== 'upload') saveSessionState('practice');

        if (sessionRef.current.upload) {
            const snap = sessionRef.current.upload;
            applyStateSnapshot(snap);
            setCurrentSourceId('upload');
            setFileName(snap.fileName);
            if (userBufferRef.current) handleDecodedBuffer(userBufferRef.current);
        } else {
            // No session ref — try per-source localStorage for 'upload'
            const savedUploadParams = loadParamsForSource('upload');
            if (savedUploadParams) {
                applyStateSnapshot(savedUploadParams);
            }
            restoreUserUpload();
        }
    }, [sourceNodeRef, isPlayingRef, currentSourceId, saveSessionState,
        applyStateSnapshot, handleDecodedBuffer, restoreUserUpload, setPlayingType]);

    const clearUserUpload = useCallback(() => {
        userBufferRef.current = null;
        userFileNameRef.current = "";
        sessionRef.current.upload = null;
        if (currentSourceId === 'upload') switchToPractice();
    }, [currentSourceId, switchToPractice]);

    const handleDownload = useCallback(() => {
        if (!originalBuffer || !audioContext) return;
        setIsLoading(true);
        setTimeout(() => {
            try {
                const numCh = originalBuffer.numberOfChannels;
                const length = originalBuffer.length;
                const currentMarkers = markersRef?.current || [];
                const exportBuffer = audioContext.createBuffer(numCh, length, originalBuffer.sampleRate);
                for (let ch = 0; ch < numCh; ch++) {
                    const inputData = originalBuffer.getChannelData(ch);
                    const res = processCompressor(inputData, audioContext.sampleRate, currentParams, 1, null, currentMarkers);
                    exportBuffer.copyToChannel(res.outputData, ch);
                }
                const url = URL.createObjectURL(writeWavFile(exportBuffer));
                const dotIdx = fileName.lastIndexOf('.');
                const baseName = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
                const dlName = `After Gain - ${baseName}.wav`;
                const a = document.createElement('a');
                a.style.display = 'none'; a.href = url; a.download = dlName;
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            } catch (e) { console.error(e); setErrorMsg("匯出失敗"); } finally { setIsLoading(false); }
        }, 50);
    }, [originalBuffer, audioContext, currentParams, fileName, markersRef]);

    // Load initial state from storage
    useEffect(() => {
        const savedState = loadAppStateFromStorage();
        if (savedState) {
            if (savedState.currentSourceId) {
                setCurrentSourceId(savedState.currentSourceId);
                if (savedState.currentSourceId !== 'upload') {
                    const source = AUDIO_SOURCES.find(s => s.id === savedState.currentSourceId);
                    if (source) setFileName(source.name);
                }
            }
            if (savedState.lastPlayedType) setLastPlayedType(savedState.lastPlayedType);
        }
    }, [setLastPlayedType]);

    // Audio Restoration on Mount
    useEffect(() => {
        if (!audioContext || hasInitialLoadRun.current) return;

        const loadInitialAudio = async () => {
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
                        // Restore per-source params for upload
                        const saved = loadParamsForSource('upload');
                        if (saved) applyStateSnapshot(saved);
                    } else {
                        setCurrentSourceId(null);
                    }
                } catch (e) {
                    console.error("Failed to restore upload", e);
                }
            } else if (currentSourceId) {
                // For custom sources, check if it starts with 'custom_'
                if (currentSourceId.startsWith('custom_')) {
                    const id = currentSourceId.replace('custom_', '');
                    try {
                        setIsLoading(true); setLoadingMessage('載入音檔中...');
                        const blob = await loadCustomAudioBlobFromDB(id);
                        if (blob) {
                            const ab = await blob.arrayBuffer();
                            const decoded = await audioContext.decodeAudioData(ab);
                            handleDecodedBuffer(decoded);
                            const saved = loadParamsForSource(currentSourceId);
                            if (saved) applyStateSnapshot(saved);
                            else resetAllParams();
                            setIsLoading(false); setLoadingMessage('');
                        } else {
                            setCurrentSourceId(null);
                            setIsLoading(false); setLoadingMessage('');
                        }
                    } catch (e) {
                        console.error("Failed to restore custom audio", e);
                        setCurrentSourceId(null);
                        setIsLoading(false); setLoadingMessage('');
                    }
                } else {
                    const source = AUDIO_SOURCES.find(s => s.id === currentSourceId);
                    if (source) {
                        await loadAudio(source, { skipSavePrev: true });
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
        const newSourceId = `custom_${id}`;
        try {
            // Save current source params before switching
            if (currentSourceIdRef.current && currentSourceIdRef.current !== newSourceId) {
                saveParamsForSource(currentSourceIdRef.current, getSnapshotRef.current());
            }

            setIsLoading(true);
            setErrorMsg(''); setLoadingMessage('載入音檔中...');
            stopCurrentSource(sourceNodeRef);
            setPlayingType('none');
            isPlayingRef.current = false;
            startOffsetRef.current = 0;
            setCurrentSourceId(newSourceId);
            setFileName(name);
            setOriginalBuffer(null);

            const blob = await loadCustomAudioBlobFromDB(id);
            if (!blob) throw new Error('找不到音檔');
            const ab = await blob.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(ab);
            handleDecodedBuffer(decoded);

            // Load per-source params or defaults
            const saved = loadParamsForSource(newSourceId);
            if (saved) {
                applyStateSnapshot(saved);
            } else {
                resetAllParams();
            }
            setIsLoading(false); setLoadingMessage('');
        } catch (_) {
            setErrorMsg('無法載入自訂音檔，請重新上載。');
            setIsLoading(false); setLoadingMessage('');
        }
    }, [audioContext, handleDecodedBuffer, resetAllParams, applyStateSnapshot, sourceNodeRef,
        isPlayingRef, startOffsetRef, setPlayingType, setOriginalBuffer]);

    return {
        isLoading, loadingMessage, errorMsg,
        currentSourceId, lastPracticeSourceId,
        fileName,
        userBufferRef, userFileNameRef, fileInputRef,
        loadAudio, loadCustomAudio, handleFileUpload, handleDecodedBuffer,
        switchToPractice, switchToUpload,
        restoreUserUpload, clearUserUpload, handleDownload,
    };
};

export default useAudioEngine;
