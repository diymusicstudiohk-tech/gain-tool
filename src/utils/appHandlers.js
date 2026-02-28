/**
 * Application-level handler functions
 * Extracted from App.jsx to reduce complexity
 */

import { PRESETS_DATA } from './constants';
import { fetchAudioBuffer } from './audioLoader';
import { writeWavFile } from './audioHelper';
import { processCompressor } from './dsp';
import { saveAudioFileToDB, loadAudioFileFromDB } from './storage';
import { AUDIO_CONFIG } from '../config/audio';

/**
 * Handle decoded audio buffer
 * Normalizes audio and creates mono buffer
 */
export const handleDecodedBuffer = (decodedBuffer, audioContext, setOriginalBuffer, setResolutionPct, fullAudioDataRef) => {
    const length = decodedBuffer.length;
    const sampleRate = decodedBuffer.sampleRate;
    const monoData = new Float32Array(length);

    if (decodedBuffer.numberOfChannels > 1) {
        const left = decodedBuffer.getChannelData(0);
        const right = decodedBuffer.getChannelData(1);
        for (let i = 0; i < length; i++) monoData[i] = (left[i] + right[i]) / 2;
    } else {
        monoData.set(decodedBuffer.getChannelData(0));
    }

    let maxPeak = 0;
    for (let i = 0; i < length; i++) {
        const abs = Math.abs(monoData[i]);
        if (abs > maxPeak) maxPeak = abs;
    }

    const targetPeak = Math.pow(10, AUDIO_CONFIG.NORMALIZATION.TARGET_PEAK_DB / 20);
    if (maxPeak > AUDIO_CONFIG.NORMALIZATION.MIN_LEVEL) {
        const norm = targetPeak / maxPeak;
        for (let i = 0; i < length; i++) monoData[i] *= norm;
    }

    const monoBuffer = audioContext.createBuffer(1, length, sampleRate);
    monoBuffer.copyToChannel(monoData, 0);
    setOriginalBuffer(monoBuffer);
    fullAudioDataRef.current = null;

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
};

/**
 * Load preset audio file
 */
export const handleLoadPreset = async (preset, audioContext, setIsLoading, setErrorMsg, sourceNodeRef, setPlayingType, isPlayingRef, setOriginalBuffer, setLoopStart, setLoopEnd, startOffsetRef, setCurrentSourceId, setLastPracticeSourceId, setFileName, handleDecodedBufferFn, applyPresetFn) => {
    if (!audioContext) return;
    try {
        setIsLoading(true);
        setErrorMsg('');
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {}
        }
        setPlayingType('none');
        isPlayingRef.current = false;
        setOriginalBuffer(null);
        setLoopStart(null);
        setLoopEnd(null);
        startOffsetRef.current = 0;
        setCurrentSourceId(preset.id);
        setLastPracticeSourceId(preset.id);
        setFileName(preset.name);

        const arrayBuffer = await fetchAudioBuffer(preset.url);
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        handleDecodedBufferFn(decoded);
        setIsLoading(false);

        if (preset.category) {
            const matchingPresetIdx = PRESETS_DATA.findIndex(p => {
                if (!p.category) return false;
                const tc = preset.category.trim().toLowerCase();
                const pc = p.category.trim().toLowerCase();
                return tc.includes(pc) || pc.includes(tc);
            });
            if (matchingPresetIdx !== -1) {
                applyPresetFn(matchingPresetIdx);
            }
        }
    } catch (err) {
        console.error(err);
        setErrorMsg(`載入失敗: ${err.message}`);
        setIsLoading(false);
    }
};

/**
 * Handle file upload
 */
export const handleFileUploadLogic = async (file, audioContext, setIsLoading, setErrorMsg, sourceNodeRef, setPlayingType, isPlayingRef, setLoopStart, setLoopEnd, startOffsetRef, setCurrentSourceId, setFileName, setOriginalBuffer, userBufferRef, userFileNameRef, handleDecodedBufferFn) => {
    if (!file || !audioContext) return;
    try {
        setIsLoading(true);
        setErrorMsg('');
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {}
        }
        setPlayingType('none');
        isPlayingRef.current = false;
        setLoopStart(null);
        setLoopEnd(null);
        startOffsetRef.current = 0;
        setCurrentSourceId('upload');
        setFileName(file.name);
        setOriginalBuffer(null);

        await saveAudioFileToDB(file, file.name);
        const ab = await file.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(ab);
        userBufferRef.current = decoded;
        userFileNameRef.current = file.name;
        handleDecodedBufferFn(decoded);
        setIsLoading(false);
    } catch (err) {
        setErrorMsg(`Failed: ${err.message}`);
        setIsLoading(false);
    }
};

/**
 * Handle download
 */
export const handleDownloadLogic = (currentSourceId, originalBuffer, audioContext, currentParams, dryGain, fileName, setIsLoading, setErrorMsg) => {
    if (currentSourceId !== 'upload' || !originalBuffer || !audioContext) return;
    setIsLoading(true);
    setTimeout(() => {
        try {
            const inputData = originalBuffer.getChannelData(0);
            const res = processCompressor(inputData, audioContext.sampleRate, currentParams, 1);
            const dryLinear = Math.pow(10, dryGain / 20);
            const mixedData = new Float32Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                mixedData[i] = res.outputData[i] + (inputData[i] * dryLinear);
            }
            const exportBuffer = audioContext.createBuffer(1, inputData.length, originalBuffer.sampleRate);
            exportBuffer.copyToChannel(mixedData, 0);
            const url = URL.createObjectURL(writeWavFile(exportBuffer));
            const dotIdx = fileName.lastIndexOf('.');
            const baseName = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
            const ext = dotIdx > 0 ? fileName.substring(dotIdx) : '.wav';
            const dlName = `After Limited - ${baseName}${ext}`;
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
