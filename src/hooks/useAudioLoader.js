/**
 * useAudioLoader.js
 * 音訊加載自定義 Hook
 * 負責處理音訊檔案的加載、解碼、練習模式與上傳模式切換
 */

import { useCallback } from 'react';
import { AUDIO_SOURCES, PRESETS_DATA } from '../utils/constants';
import { saveAudioFileToDB } from '../utils/storage';
import { fetchAudioBuffer } from '../utils/audioLoader';
import { calculateControlFromRatio } from '../utils/paramHelpers';

export const useAudioLoader = ({
    audioContext,
    sourceNodeRef,
    isPlayingRef,
    userBufferRef,
    userFileNameRef,
    practiceSessionRef,
    uploadSessionRef,
    startOffsetRef,
    setIsLoading,
    setErrorMsg,
    setOriginalBuffer,
    setFullAudioData,
    fullAudioDataRef,
    setCurrentSourceId,
    setLastPracticeSourceId,
    setFileName,
    setPlayingType,
    setLoopStart,
    setLoopEnd,
    setResolutionPct,
    applyStateSnapshot,
    handleModeChange,
    applyPreset
}) => {
    /**
     * 處理解碼後的音訊 Buffer
     * - 轉換為單聲道
     * - 正規化音量
     * - 自動調整解析度
     */
    const handleDecodedBuffer = useCallback((decodedBuffer) => {
        const length = decodedBuffer.length;
        const sampleRate = decodedBuffer.sampleRate;
        const monoData = new Float32Array(length);

        // Convert to mono
        if (decodedBuffer.numberOfChannels > 1) {
            const left = decodedBuffer.getChannelData(0);
            const right = decodedBuffer.getChannelData(1);
            for (let i = 0; i < length; i++) monoData[i] = (left[i] + right[i]) / 2;
        } else {
            monoData.set(decodedBuffer.getChannelData(0));
        }

        // Normalize
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
        setFullAudioData(null);
        fullAudioDataRef.current = null;

        // Auto Resolution
        const MAX_SMOOTH_POINTS = 250000;
        let autoPct = 100;
        if (length > MAX_SMOOTH_POINTS) {
            const idealStep = Math.ceil(length / MAX_SMOOTH_POINTS);
            const minPoints = 3000;
            const maxStep = Math.floor(length / minPoints);
            let factor = (idealStep - 1) / (maxStep - 1);
            if (factor < 0) factor = 0;
            if (factor > 1) factor = 1;
            autoPct = Math.round(100 - (factor * 99));
            if (autoPct === 100 && idealStep > 1) autoPct = 99;
        }
        setResolutionPct(autoPct);
    }, [audioContext, setOriginalBuffer, setFullAudioData, fullAudioDataRef, setResolutionPct]);

    /**
     * 加載預設練習音訊並套用預設參數
     */
    const loadPreset = useCallback(async (preset) => {
        if (!audioContext) return;
        try {
            setIsLoading(true);
            setErrorMsg('');
            if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setPlayingType('none');
            isPlayingRef.current = false;
            setOriginalBuffer(null);
            setLoopStart(null);
            setLoopEnd(null);
            startOffsetRef.current = 0;
            setCurrentSourceId(preset.id);
            setLastPracticeSourceId(preset.id);
            setFileName(preset.name);

            let arrayBuffer;
            try {
                arrayBuffer = await fetchAudioBuffer(preset.url);
            } catch (e) {
                console.error("Audio Load Error:", e);
                throw new Error("Failed to load audio");
            }

            const decoded = await audioContext.decodeAudioData(arrayBuffer);
            handleDecodedBuffer(decoded);
            setIsLoading(false);

            // Auto-load matching preset
            if (preset.category) {
                const trackCategory = preset.category;
                console.log(`[AutoLoad] Track Category: "${trackCategory}"`);

                // Find first preset where track category matches loosely (case-insensitive, partial)
                const matchingPresetIdx = PRESETS_DATA.findIndex(p => {
                    if (!p.category) return false;
                    const tc = trackCategory.trim().toLowerCase();
                    const pc = p.category.trim().toLowerCase();
                    return tc.includes(pc) || pc.includes(tc);
                });

                if (matchingPresetIdx !== -1) {
                    console.log(`[AutoLoad] Found matching preset: "${PRESETS_DATA[matchingPresetIdx].name}" (Idx: ${matchingPresetIdx})`);
                    applyPreset(matchingPresetIdx);
                } else {
                    console.log(`[AutoLoad] No matching preset found for category: "${trackCategory}"`);
                }
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(`載入失敗: ${err.message}`);
            setIsLoading(false);
        }
    }, [audioContext, setIsLoading, setErrorMsg, sourceNodeRef, setPlayingType, isPlayingRef, setOriginalBuffer, setLoopStart, setLoopEnd, startOffsetRef, setCurrentSourceId, setLastPracticeSourceId, setFileName, handleDecodedBuffer, applyPreset]);

    /**
     * 處理使用者上傳音訊檔案
     */
    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file || !audioContext) return;
        try {
            setIsLoading(true);
            setErrorMsg('');
            if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setPlayingType('none');
            isPlayingRef.current = false;
            setLoopStart(null);
            setLoopEnd(null);
            startOffsetRef.current = 0;
            setCurrentSourceId('upload');
            setFileName(file.name);
            setOriginalBuffer(null);

            // Persistence: Save to IndexedDB
            await saveAudioFileToDB(file, file.name);

            const ab = await file.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(ab);
            userBufferRef.current = decoded;
            userFileNameRef.current = file.name;
            handleDecodedBuffer(decoded);
            setIsLoading(false);
        } catch (err) {
            setErrorMsg(`Failed: ${err.message}`);
            setIsLoading(false);
        }
    }, [audioContext, setIsLoading, setErrorMsg, sourceNodeRef, setPlayingType, isPlayingRef, setLoopStart, setLoopEnd, startOffsetRef, setCurrentSourceId, setFileName, setOriginalBuffer, userBufferRef, userFileNameRef, handleDecodedBuffer]);

    /**
     * 只加載音訊，不重置參數（用於模式切換）
     */
    const loadAudioOnly = useCallback(async (preset) => {
        if (!audioContext) return;
        try {
            setIsLoading(true);
            setErrorMsg('');
            if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
            setPlayingType('none');
            isPlayingRef.current = false;
            setOriginalBuffer(null);
            setLoopStart(null);
            setLoopEnd(null);
            startOffsetRef.current = 0;
            setCurrentSourceId(preset.id);
            setLastPracticeSourceId(preset.id);
            setFileName(preset.name);

            let arrayBuffer;
            try {
                const res = await fetch(preset.url);
                if (!res.ok) throw new Error('Direct fetch failed');
                arrayBuffer = await res.arrayBuffer();
            } catch (e) {
                const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(preset.url)}`;
                const res = await fetch(pUrl);
                if (!res.ok) throw new Error('Failed');
                arrayBuffer = await res.arrayBuffer();
            }
            const decoded = await audioContext.decodeAudioData(arrayBuffer);
            handleDecodedBuffer(decoded);
            setIsLoading(false);
        } catch (err) {
            console.error(err);
            setErrorMsg(`載入失敗: ${err.message}`);
            setIsLoading(false);
        }
    }, [audioContext, setIsLoading, setErrorMsg, sourceNodeRef, setPlayingType, isPlayingRef, setOriginalBuffer, setLoopStart, setLoopEnd, startOffsetRef, setCurrentSourceId, setLastPracticeSourceId, setFileName, handleDecodedBuffer]);

    /**
     * 切換到練習模式
     */
    const switchToPractice = useCallback((currentSourceId, saveSessionState) => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
        setPlayingType('none');
        isPlayingRef.current = false;

        if (currentSourceId === 'upload') saveSessionState('upload');

        if (practiceSessionRef.current) {
            const snap = practiceSessionRef.current;
            applyStateSnapshot(snap);
            setCurrentSourceId(snap.sourceId);
            setFileName(snap.fileName);
            const source = AUDIO_SOURCES.find(s => s.id === snap.sourceId);
            if (source) loadAudioOnly(source);
        } else {
            // No previous practice session, load default
            const defaultSource = AUDIO_SOURCES.find(s => s.id === 'Lead-Vocal-03') || AUDIO_SOURCES[0];
            loadPreset(defaultSource);
        }
    }, [sourceNodeRef, setPlayingType, isPlayingRef, practiceSessionRef, applyStateSnapshot, setCurrentSourceId, setFileName, loadAudioOnly, loadPreset]);

    /**
     * 切換到上傳模式
     */
    const switchToUpload = useCallback((currentSourceId, saveSessionState, restoreUserUpload) => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch (e) { }
        setPlayingType('none');
        isPlayingRef.current = false;

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
    }, [sourceNodeRef, setPlayingType, isPlayingRef, uploadSessionRef, applyStateSnapshot, setCurrentSourceId, setFileName, userBufferRef, handleDecodedBuffer]);

    /**
     * 恢復使用者上傳的音訊
     */
    const restoreUserUpload = useCallback(() => {
        if (!userBufferRef.current || !audioContext) return;
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
            } catch (e) { }
        }
        setPlayingType('none');
        isPlayingRef.current = false;
        setLoopStart(null);
        setLoopEnd(null);
        startOffsetRef.current = 0;
        setCurrentSourceId('upload');
        setFileName(userFileNameRef.current);
        handleDecodedBuffer(userBufferRef.current);
    }, [userBufferRef, audioContext, sourceNodeRef, setPlayingType, isPlayingRef, setLoopStart, setLoopEnd, startOffsetRef, setCurrentSourceId, setFileName, userFileNameRef, handleDecodedBuffer]);

    /**
     * 清除使用者上傳
     */
    const clearUserUpload = useCallback((switchToPractice) => {
        userBufferRef.current = null;
        userFileNameRef.current = "";
        uploadSessionRef.current = null;
        // Note: This function needs currentSourceId passed in or accessed from parent
        // For now, we'll just clear refs
        switchToPractice();
    }, [userBufferRef, userFileNameRef, uploadSessionRef]);

    return {
        handleDecodedBuffer,
        loadPreset,
        handleFileUpload,
        loadAudioOnly,
        switchToPractice,
        switchToUpload,
        restoreUserUpload,
        clearUserUpload
    };
};
