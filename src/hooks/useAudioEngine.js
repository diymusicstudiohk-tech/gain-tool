import { useState, useEffect, useRef, useCallback } from 'react';
import { AUDIO_SOURCES } from '../utils/constants';
import { processCompressor } from '../utils/dsp';
import { writeWavFile } from '../utils/audioHelper';
import {
    loadAppStateFromStorage, loadAudioFileFromDB,
    loadCustomAudioBlobFromDB, loadParamsForSource,
} from '../utils/storage';
import useStateRef from './useStateRef';
import useLatestRef from './useLatestRef';
import useAudioFileLoader from './useAudioFileLoader';
import useSessionManager from './useSessionManager';

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

    const hasInitialLoadRun = useRef(false);
    const fileInputRef = useRef(null);
    const getSnapshotRef = useLatestRef(getCurrentStateSnapshot);
    const userBufferRef = useRef(null);
    const userFileNameRef = useRef('');

    // --- File Loading ---
    const { handleDecodedBuffer, loadAudio, handleFileUpload, loadCustomAudio } = useAudioFileLoader({
        audioContext, setOriginalBuffer,
        applyStateSnapshot, resetAllParams,
        sourceNodeRef, isPlayingRef, startOffsetRef, setPlayingType,
        currentSourceIdRef, getSnapshotRef,
        setIsLoading, setErrorMsg, setLoadingMessage,
        setCurrentSourceId, setLastPracticeSourceId, setFileName,
        userBufferRef, userFileNameRef,
    });

    // --- Session Management ---
    const session = useSessionManager({
        audioContext,
        handleDecodedBuffer, loadAudio,
        applyStateSnapshot, getCurrentStateSnapshot,
        sourceNodeRef, isPlayingRef, startOffsetRef, setPlayingType,
        currentSourceId, currentSourceIdRef, getSnapshotRef,
        setCurrentSourceId, setFileName,
        userBufferRef, userFileNameRef,
    });

    const { restoreUserUpload, switchToPractice, switchToUpload, clearUserUpload } = session;

    // --- Download ---
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

    // --- Load initial state from storage ---
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

    // --- Audio Restoration on Mount ---
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

    // --- Random initial load if no source ---
    useEffect(() => {
        if (audioContext && !originalBuffer && !currentSourceId && !isLoading) {
            const randomSource = AUDIO_SOURCES[Math.floor(Math.random() * AUDIO_SOURCES.length)];
            loadAudio(randomSource);
        }
    }, [audioContext, originalBuffer, currentSourceId, isLoading, loadAudio]);

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
