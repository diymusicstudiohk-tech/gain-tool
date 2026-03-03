import { useState, useEffect, useCallback } from 'react';
import {
    loadCustomAudioIndexFromDB, saveCustomAudioIndexToDB,
    saveCustomAudioBlobToDB, deleteCustomAudioBlobFromDB,
} from '../utils/storage';
import { AUDIO_SOURCES } from '../utils/constants';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../utils/fileConstants';

const useCustomAudioFiles = ({ currentSourceId, loadPreset, loadCustomAudio }) => {
    const [customAudioFiles, setCustomAudioFiles] = useState([]);

    // Load custom audio index from DB on mount
    useEffect(() => {
        loadCustomAudioIndexFromDB().then(setCustomAudioFiles);
    }, []);

    const handleCustomAudioFilesSelected = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const newEntries = [];
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) continue;
            if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) continue;
            const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await saveCustomAudioBlobToDB(id, file);
            newEntries.push({ id, name: file.name });
        }
        if (!newEntries.length) return;
        const updated = [...newEntries, ...customAudioFiles];
        await saveCustomAudioIndexToDB(updated);
        setCustomAudioFiles(updated);
        if (e.target) e.target.value = '';
        // Immediately load the first uploaded file as current audio
        loadCustomAudio(newEntries[0].id, newEntries[0].name);
    }, [customAudioFiles, loadCustomAudio]);

    const handleRemoveCustomFile = useCallback(async (id) => {
        await deleteCustomAudioBlobFromDB(id);
        const updated = customAudioFiles.filter(f => f.id !== id);
        await saveCustomAudioIndexToDB(updated);
        setCustomAudioFiles(updated);
        // If the removed file is currently active, fall back to default practice track
        if (currentSourceId === `custom_${id}`) {
            loadPreset(AUDIO_SOURCES[0]);
        }
    }, [customAudioFiles, currentSourceId, loadPreset]);

    return {
        customAudioFiles,
        handleCustomAudioFilesSelected,
        handleRemoveCustomFile,
    };
};

export default useCustomAudioFiles;
