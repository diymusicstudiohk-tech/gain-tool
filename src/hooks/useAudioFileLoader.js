import { useCallback } from 'react';
import { fetchAudioBuffer } from '../utils/audioLoader';
import { stopCurrentSource } from '../utils/audioHelper';
import {
    saveAudioFileToDB, loadCustomAudioBlobFromDB,
    saveParamsForSource, loadParamsForSource,
} from '../utils/storage';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../utils/fileConstants';

const useAudioFileLoader = ({
    audioContext, setOriginalBuffer,
    applyStateSnapshot, resetAllParams,
    sourceNodeRef, isPlayingRef, startOffsetRef, setPlayingType,
    currentSourceIdRef, getSnapshotRef,
    setIsLoading, setErrorMsg, setLoadingMessage,
    setCurrentSourceId, setLastPracticeSourceId, setFileName,
    userBufferRef, userFileNameRef,
}) => {
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

    return { handleDecodedBuffer, loadAudio, handleFileUpload, loadCustomAudio };
};

export default useAudioFileLoader;
